// POST /.netlify/functions/lance-relampago
// Header: Authorization: Bearer <token>  — JWT { endereco, tipo:"lance-auth" } emitido por /auth-lance
// Body: { endereco, valorCentavos, edicaoId?, idempotencyKey?, nomeExibicao? }
//
// Resposta 200: { ..., idempotent: true }    — lance já processado (idempotência)
// Resposta 201: { ok, lanceId, ... }          — lance novo criado
// Resposta 400: saldo_insuficiente | params_invalidos | sem_creditos_lance (UTAC110d)
// Resposta 401: token_ausente | token_expirado | token_invalido
// Resposta 403: endereco_nao_corresponde
// Resposta 409: edicao_nao_iniciada | edicao_encerrada   (MC94.1 — janela da edição)
// Resposta 503: edicao_indisponivel                      (MC94.1 — ESPECIAL-* sem metadata)

import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import {
  jsonResponse, jsonError, validarEndereco,
  parseJsonBody, ValidationError,
} from "./_lib/validate.mjs";
import { debitarSaldoRs } from "./_lib/saldoRs.mjs";
import { verificarLanceAuth } from "./_lib/jwt.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { getRole } from "./_lib/rbac.mjs";
import { requireMfa } from "./_lib/require-mfa.mjs";
import { lerEstadoSistema, sistemaPausado } from "./_lib/system-state.mjs";
import { registrarEventosDeLance } from "./_lib/notificacoes-usuario.mjs";
// ── MC28.1: blindagem (ativa só em NETWORK_STAGE === 'mainnet') ──────────────
import { addLance } from "./_lib/data-store.mjs";
import { comprometerLanceOnchain, lerSaldoSenhas } from "./_lib/contract.mjs";
import { buscarEdicao } from "./_lib/edicoes-core.mjs"; // MC91.11 — tipo da edição
import { verificarJanelaLance, EDICAO_ESPECIAL_RE } from "./_lib/edicao-janela.mjs"; // MC94.1 — janela
import { registrarConsumoSenha, BLOB_SENHAS_CONSUMO } from "./_lib/senhas-programado.mjs"; // MC91.11 — ledger
import { keccak256, AbiCoder } from "ethers";
import { consumirCreditoLance, reverterMovimentoLance } from "./_lib/ledger-lance.mjs"; // UTAC110d
import { creditarMissaoLance } from "./_lib/fontes-lance.mjs"; // UTAC110f — missão «1 lance do dia»
import { respostaPreflight } from "./_lib/cors.mjs";

const LANCE_MIN_CENTAVOS = 1;
const LANCE_MAX_CENTAVOS = 999999;
const EDICAO_PADRAO      = "R-1";
const BLOB_LANCES        = "lances-relampago";
const BLOB_IDEM          = "lance-idem";

// UTAC110d — decisão do operador R18-110d-3: o lance relâmpago deixa de debitar o saldo R$ e passa a
// consumir 1 CRÉDITO de lance (dado pelo Passe Relâmpago). O débito R$ NÃO foi removido (está na
// mainnet): fica atrás desta flag, DESLIGADA. `true` repõe o comportamento anterior byte a byte.
const DEBITO_SALDO_LANCE_ATIVO = false;

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[lance-relampago] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

function validarValorCentavos(input) {
  const n = typeof input === "number" ? input : Number(input);
  if (!Number.isInteger(n)) throw new ValidationError("valor_invalido", "valorCentavos deve ser inteiro");
  if (n < LANCE_MIN_CENTAVOS || n > LANCE_MAX_CENTAVOS) {
    throw new ValidationError("valor_fora_do_limite", `valorCentavos deve estar entre ${LANCE_MIN_CENTAVOS} e ${LANCE_MAX_CENTAVOS}`);
  }
  return n;
}

export default async (req) => {
  // MC88.12 — preflight CORS do APK. Tem de ser a primeira coisa: o OPTIONS não
  // leva corpo nem Authorization, logo qualquer validação a montante responderia
  // 4xx e o browser abortaria a chamada real.
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  }

  // ── 0. Rate limit por IP (5/min) ───────────────────────────────────────────
  const rl = await aplicarRateLimit(req, "lance-relampago", 5);
  if (rl) return rl;

  // ── 0.5. Kill switch (MC15.6 ITEM 8) ──────────────────────────────────────
  // Se o sistema está em modo pânico (/panic), rejeita novos lances com 503.
  // Fail-soft: leitura do Blob falha → NÃO bloqueia (pânico é opt-in explícito).
  if (sistemaPausado(await lerEstadoSistema())) {
    return jsonError(503, "sistema_pausado", "Sistema em manutenção. Tente novamente em breve.");
  }

  // ── 1. Auth: verificar JWT lance-auth ─────────────────────────────────────
  const authHeader = req.headers.get("authorization") || "";
  const authToken  = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!authToken) {
    return jsonError(401, "token_ausente", "Authorization: Bearer <token> obrigatório — obtenha via POST /auth-lance");
  }
  let jwtPayload;
  try {
    jwtPayload = await verificarLanceAuth(authToken);
  } catch (err) {
    const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
    return jsonError(401, code, "token inválido ou expirado — obtenha novo via POST /auth-lance");
  }

  // ── 1.5. MFA gate (MC7) — controlado por env MFA_ENFORCEMENT ──────────────
  const mfaBlock = requireMfa(req, jwtPayload, "lance-relampago");
  if (mfaBlock) return mfaBlock;

  // ── 2. Body parse ──────────────────────────────────────────────────────────
  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com endereco e valorCentavos");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  // ── 3. Validar campos ──────────────────────────────────────────────────────
  let endereco, valorCentavos;
  try {
    endereco      = validarEndereco(body.endereco);
    valorCentavos = validarValorCentavos(body.valorCentavos);
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  // ── 4. JWT endereco deve corresponder ao body ──────────────────────────────
  if (jwtPayload.endereco !== endereco) {
    return jsonError(403, "endereco_nao_corresponde", "token não pertence ao endereço informado");
  }

  // ── 4.5. MC49.3.1 — Lance relâmpago liberado para QUALQUER carteira autenticada
  //   com saldo R$ suficiente (≥ 1 centavo), independentemente de cota/adesão.
  //   Simetria com MC49.3 (comprar-senhas): o utilizador só gasta o PRÓPRIO saldo
  //   R$ (que depositou via PIX). A posse da carteira já é provada pelo JWT
  //   lance-auth (passo 1); o MFA gate (passo 1.5), o anti-IDOR (passo 4) e a
  //   checagem atómica de saldo/CAS (passo 6) permanecem intactos.
  //   Removido o gate `requireRole(role, "cliente")` que retornava 403
  //   "papel_insuficiente" para o papel 'user'. O papel continua a ser resolvido e
  //   registado apenas para AUDITORIA (SUPERPERS), não bloqueia mais o fluxo.
  const { role } = await getRole(endereco);

  const edicaoId       = String(body.edicaoId || EDICAO_PADRAO);
  const idempotencyKey = typeof body.idempotencyKey === "string" && body.idempotencyKey.length > 0
    ? body.idempotencyKey.slice(0, 66)
    : null;
  const nomeExibicao   = typeof body.nomeExibicao === "string"
    ? body.nomeExibicao.slice(0, 80).trim() || null
    : null;

  console.info("[lance-relampago] início", {
    endereco, valorCentavos, edicaoId, idem: !!idempotencyKey,
    role, // MC49.3.1 — auditoria: papel do autor do lance (não bloqueia; ver passo 4.5)
  });

  // ── 5. Idempotência server-side ────────────────────────────────────────────
  if (idempotencyKey) {
    const idemStore = abrirStore(BLOB_IDEM);
    if (idemStore) {
      try {
        const existente = await idemStore.get(idempotencyKey, { type: "json" });
        if (existente?.lanceId) {
          console.info("[lance-relampago] idempotent hit", { endereco, idempotencyKey });
          return jsonResponse({ ...existente, idempotent: true });
        }
      } catch (err) {
        console.warn("[lance-relampago] leitura lance-idem falhou (não-fatal):", err?.message);
      }
    }
  }

  // ── 5.5. MC91.11 — tipo da edição (metadata): programado consome SENHA
  // (gate on-chain + ledger off-chain, teto = saldo on-chain); relampago
  // consome saldo R$ (comportamento anterior INTOCADO). Edições sem metadata
  // (ex.: R-1 sintética) são tratadas como relampago.
  let meta = null;
  try {
    meta = await buscarEdicao(edicaoId);
  } catch (err) {
    console.warn("[lance-relampago] buscarEdicao falhou — tratando como relampago:", err?.message);
  }
  const tipoEdicao = meta?.tipo ?? null;

  // ── 5.6. MC94.1 — janela da edição, pelo relógio do servidor ───────────────
  // Uma edição especial só existe com metadata: sem ele não se sabe o preço
  // (senha ou R$) nem a janela, logo recusa — cair em "relampago" cobraria R$
  // num sorteio pago em senhas. As outras mantêm o fallback de sempre.
  if (!meta && EDICAO_ESPECIAL_RE.test(edicaoId)) {
    return jsonError(503, "edicao_indisponivel", `não foi possível ler a edição ${edicaoId}`);
  }
  const foraDaJanela = verificarJanelaLance(meta);
  if (foraDaJanela) {
    return jsonError(409, foraDaJanela.code, foraDaJanela.message);
  }

  const ehProgramado = tipoEdicao === "programado";
  const lanceId = randomUUID();
  let refCreditoLance = null; // UTAC110d — preenchido só quando se consome um crédito de lance

  // ── 6. Consumo do pagamento (programado = senha; flash = saldo R$) ────────
  let debito;
  if (ehProgramado) {
    // 6a. Gate on-chain: precisa ter saldo de senhas (Art. 20: R$ 2,00/senha).
    let saldoOnChain;
    try {
      saldoOnChain = await lerSaldoSenhas(endereco);
    } catch (err) {
      console.error("[lance-relampago:programado] lerSaldoSenhas falhou:", err?.message);
      return jsonError(502, "leitura_onchain_falhou", "não foi possível ler o saldo de senhas on-chain");
    }
    if (saldoOnChain < 1) {
      return jsonError(400, "senhas_insuficientes",
        "Saldo de senhas insuficiente (Art. 20: R$ 2,00/senha) — converta saldo R$ em senhas antes de lançar.",
        { saldoOnChain });
    }
    // 6b. Ledger de consumo (CAS best-effort; consistency strong) — MC91.11.
    const storeConsumo = abrirStore(BLOB_SENHAS_CONSUMO);
    const consumo = await registrarConsumoSenha({ store: storeConsumo, endereco, saldoOnChain, edicaoId });
    if (!consumo.ok) {
      const status = consumo.code === "senhas_insuficientes" ? 400 : 502;
      return jsonError(status, consumo.code, consumo.message, {
        saldoOnChain,
        consumidas: consumo.consumidas ?? null,
      });
    }
    debito = {
      ok: true,
      resultado: {
        saldoAntesCentavos: null,
        saldoDepoisCentavos: null,
        senhaConsumida: true,
        saldoOnChain,
        consumidasAgora: consumo.consumidas,
      },
    };
  } else if (!DEBITO_SALDO_LANCE_ATIVO) {
    // 6c'. UTAC110d — Flash (e desconhecido): consome 1 CRÉDITO de lance. Não toca no saldo R$
    // nem nos pontos de fidelidade nem nos pontos de lance (R18-110d-2).
    // SEG4 W5/V1: com `idempotencyKey`, a ref deriva DELA — dois pedidos concorrentes com a mesma
    // chave tentam o MESMO consumo e o 2.º recebe `criado:false` (409, sem 2.º crédito nem 2.º lance).
    refCreditoLance = idempotencyKey ? `lance:${idempotencyKey}` : `lance:${lanceId}`;
    let consumo;
    try { consumo = await consumirCreditoLance(endereco, refCreditoLance); }
    catch { consumo = { ok: false, code: "ERRO_DB" }; }
    if (!consumo.ok) {
      if (consumo.code === "CREDITOS_INSUFICIENTES") {
        return jsonError(400, "sem_creditos_lance",
          "Sem créditos de lance suficientes — compre um Passe Relâmpago para dar um lance.",
          { creditosLance: consumo.creditos ?? 0 });
      }
      return jsonError(502, "consumo_credito_falhou", "não foi possível consumir o crédito de lance", { motivo: consumo.code });
    }
    if (consumo.criado === false) {
      refCreditoLance = null; // o consumo é do outro pedido — nunca o devolver daqui
      return jsonError(409, "lance_em_processamento", "este lance já está a ser processado (mesma idempotencyKey)");
    }
    debito = {
      ok: true,
      resultado: { saldoAntesCentavos: null, saldoDepoisCentavos: null, creditosLanceRestantes: consumo.creditos },
    };
  } else {
    // 6c. Flash (e desconhecido): debita saldo R$ — comportamento INTOCADO.
    debito = await debitarSaldoRs({ endereco, valorCentavos, motivo: `lance-${edicaoId}` });
    if (!debito.ok) {
      const status = debito.code === "saldo_insuficiente" ? 400 : 502;
      return jsonError(status, debito.code || "debito_falhou", debito.message || "não foi possível debitar saldo R$");
    }
  }

  const registro = {
    lanceId, edicaoId, endereco, valorCentavos, nomeExibicao,
    saldoAntesCentavos:  debito.resultado.saldoAntesCentavos ?? null,
    saldoDepoisCentavos: debito.resultado.saldoDepoisCentavos ?? null,
    modo: ehProgramado ? "programado" : "relampago",
    ...(ehProgramado ? { senhaConsumida: true, saldoOnChain: debito.resultado.saldoOnChain } : {}),
    processadoEm: new Date().toISOString(),
  };

  // ── 7. Persistir lance ─────────────────────────────────────────────────────
  // R9 — Isolamento por ambiente: a blindagem só corre em mainnet. Em
  // Sepolia/localhost mantém-se o comportamento legado (blob único, texto limpo).
  if (process.env.NETWORK_STAGE === "mainnet") {
    // ── MAINNET: Compromisso Cego (A2) + Key-Per-Bid ─────────────────────────
    // O valor real NUNCA toca a cadeia: on-chain vai só o hash; o valor fica num
    // Blob por-lance, isolado e imutável (sem race; G-3 resolvido).
    try {
      // Hash ESPELHANDO o empacotamento da EVM (ITEM 2.1): keccak256(abi.encode(...)).
      const hashLance = keccak256(
        AbiCoder.defaultAbiCoder().encode(["uint256", "address"], [valorCentavos, endereco]));
      // 7a. Commitment on-chain (coordenação assina; aponta para o endereço real).
      await comprometerLanceOnchain(edicaoId, endereco, hashLance);
      registro.commitmentHash = hashLance;
      // 7b. Valor real → data-store (Key-Per-Bid). Via a fachada (MC32.1): com
      //     DATA_STORE_BACKEND=blobs o comportamento é byte-idêntico ao gravarBid;
      //     o flip para Supabase não exige tocar aqui (R3.4, anti-split-brain R11).
      registro.key = await addLance(edicaoId, registro);
    } catch (err) {
      // Em mainnet a falha é FATAL: não gravar lance sem o commitment correspondente.
      console.error("[lance-relampago] blindagem (commit/KPB) falhou:", err?.message);
      // UTAC110d — o lance não foi registado ⇒ o crédito consumido volta (reversão integral).
      if (refCreditoLance) {
        const rev = await reverterMovimentoLance(endereco, refCreditoLance).catch(() => ({ ok: false }));
        if (!rev.ok) console.error("[lance-relampago] devolver o crédito de lance falhou");
      }
      return jsonError(502, "blindagem_falhou", "não foi possível registar o lance blindado");
    }
  } else {
    // ── LEGADO (Sepolia/localhost): blob único em texto limpo — INTOCADO ──────
    const store = abrirStore(BLOB_LANCES);
    if (store) {
      try {
        const existente = (await store.get(edicaoId, { type: "json" })) || { lances: [] };
        existente.lances.push(registro);
        existente.atualizadoEm = new Date().toISOString();
        await store.setJSON(edicaoId, existente);
        // ── MC15.7 ITEM 1 — notificações de unicidade (fail-soft; nunca quebra o lance)
        try {
          await registrarEventosDeLance({
            lances: existente.lances, valorCentavos, edicaoId, autorEndereco: endereco,
          });
        } catch (err) {
          console.warn("[lance-relampago] notificação de unicidade falhou (não-fatal):", err?.message);
        }
        // MC17.4.1 — DEPRECATED: a conversão de indicação (+1 senha indicador / +1
        // indicado) foi MIGRADA para o momento do REGISTO. O endpoint referral.mjs
        // (?acao=usar-codigo) dispara registrarConversao assim que o vínculo é criado,
        // tornando a recompensa imediata (sem exigir 1.º lance). O gancho do 1.º lance
        // foi removido para o gatilho ser único; a idempotência (referral-convertido)
        // continua a impedir duplo-crédito.
      } catch (err) {
        console.warn("[lance-relampago] persistir lance falhou (não-fatal):", err?.message);
      }
    }
  }

  // ── 7b. UTAC110f — missão «Completar 1 lance» (+10 pontos de lance, 1× por dia de Manaus) ─────
  // Creditada AQUI, pelo servidor, depois de o lance existir — não há endpoint público que a reclame
  // (decisão do operador no SEG-1). Só o MLC (relâmpago): o programado não conta. FAIL-SOFT: uma falha
  // na missão nunca desfaz nem bloqueia o lance; a `ref` diária garante um só crédito por dia.
  let missaoLance = null;
  if (!ehProgramado) {
    try {
      const m = await creditarMissaoLance(endereco);
      missaoLance = m.ok ? { creditado: m.creditado } : { creditado: false, erro: m.code };
      if (!m.ok) console.warn("[lance-relampago] missão do lance falhou (não-fatal):", m.code);
    } catch (err) {
      missaoLance = { creditado: false, erro: "excecao" };
      console.warn("[lance-relampago] missão do lance falhou (não-fatal):", err?.message);
    }
  }

  // ── 8. Persistir chave de idempotência ────────────────────────────────────
  if (idempotencyKey) {
    const idemStore = abrirStore(BLOB_IDEM);
    if (idemStore) {
      try {
        await idemStore.setJSON(idempotencyKey, {
          lanceId, edicaoId, endereco, valorCentavos, nomeExibicao,
          saldoRsAntesCentavos:  debito.resultado.saldoAntesCentavos,
          saldoRsDepoisCentavos: debito.resultado.saldoDepoisCentavos,
          processadoEm: registro.processadoEm,
          commitmentHash: registro.commitmentHash ?? null,
          ok: true,
        });
      } catch (err) {
        console.warn("[lance-relampago] persistir lance-idem falhou (não-fatal):", err?.message);
      }
    }
  }

  console.info("[lance-relampago] concluído", {
    endereco, valorCentavos, edicaoId, lanceId,
    saldoAntes:  debito.resultado.saldoAntesCentavos,
    saldoDepois: debito.resultado.saldoDepoisCentavos,
  });

  return jsonResponse({
    ok: true,
    lanceId, edicaoId, endereco, valorCentavos, nomeExibicao,
    modo: registro.modo,
    senhaConsumida: !!registro.senhaConsumida,
    saldoRsAntesCentavos:  debito.resultado.saldoAntesCentavos ?? null,
    saldoRsDepoisCentavos: debito.resultado.saldoDepoisCentavos ?? null,
    saldoOnChain: debito.resultado.saldoOnChain ?? null,
    creditoLanceConsumido: refCreditoLance !== null,
    creditosLanceRestantes: debito.resultado.creditosLanceRestantes ?? null,
    missaoLance, // UTAC110f — null no programado; {creditado} no relâmpago
    processadoEm: registro.processadoEm,
    commitmentHash: registro.commitmentHash ?? null,
  }, 201);
};
