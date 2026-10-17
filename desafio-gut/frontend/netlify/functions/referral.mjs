// Endpoint /referral — Mega Comando 10 / Item 2.
//
// GET  ?acao=meu-codigo&endereco=0x...   → { codigo, total_indicados, total_convertidos, senhas_ganhas }
//   Anti-IDOR: exige JWT user-session do owner OU admin (mesmo padrão de /saldo-rs).
//
// POST ?acao=usar-codigo                 → registra indicação
//   Body: { codigo_indicacao, endereco }
//   Header: X-Visitor-ID (opcional — usado pelo anti-fraude FingerprintJS)
//   Auth: JWT user-session do `endereco`.
//
// Rate-limit: 5 reqs/min/IP (padrão MC1 para endpoints sensíveis).
// Feature flag: REFERRAL_ATIVO=on (default) | off → 503.

import {
  jsonResponse, jsonError, validarEndereco,
  parseJsonBody, ValidationError, validarOwnerOuAdmin,
  mascararEndereco, // MC87 (P3-1) — o log de conversão desenhava o grafo social
} from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { getAdminAddresses } from "./_lib/admin-helpers.mjs";
import {
  gerarCodigoIndicacao, validarCodigoIndicacao, registrarIndicacao,
  registrarConversao, estatisticasIndicador, referralAtivo,
  registrarTentativaConversaoIp, appendReferralLog,
} from "./_lib/referral.mjs";
import { creditarIndicacao } from "./_lib/fontes-lance.mjs"; // UTAC110f — +50 pontos de lance
import { respostaPreflight } from "./_lib/cors.mjs";

const RATE_LIMIT_RPM = 5;
const VISITOR_RE     = /^[a-zA-Z0-9_-]{4,128}$/;

function extrairToken(req) {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

async function autenticarUser(req) {
  const token = extrairToken(req);
  if (!token) return { ok: false, code: "token_ausente", message: "Authorization: Bearer <user-session> obrigatório — POST /auth-user" };
  try {
    const payload = await verificarUserSession(token);
    return { ok: true, payload };
  } catch (err) {
    const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
    return { ok: false, code, message: "token inválido ou expirado" };
  }
}

async function handleMeuCodigo(req, url) {
  let endereco;
  try { endereco = validarEndereco(url.searchParams.get("endereco")); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  // Anti-IDOR: só o próprio (ou admin) pode ler seu painel.
  const auth = await autenticarUser(req);
  if (!auth.ok) return jsonError(401, auth.code, auth.message);
  const admins = await getAdminAddresses();
  const guard  = validarOwnerOuAdmin(auth.payload, endereco, admins);
  if (!guard.ok) return jsonError(403, "acesso_negado", "token não pertence ao endereço solicitado e não é admin");

  // Gera (ou recupera) o código pessoal. Idempotente.
  let codigoInfo;
  try { codigoInfo = await gerarCodigoIndicacao(endereco); }
  catch (err) {
    console.error("[referral] gerarCodigoIndicacao falhou:", err?.message);
    return jsonError(503, err?.message || "store_indisponivel", "não foi possível gerar/recuperar código de indicação");
  }
  const stats = await estatisticasIndicador(endereco);
  return jsonResponse({
    endereco,
    codigo:             codigoInfo.codigo,
    novo:               codigoInfo.novo,
    total_indicados:    stats.total_indicados,
    total_convertidos:  stats.total_convertidos,
    senhas_ganhas:      stats.senhas_ganhas,
  });
}

async function handleUsarCodigo(req) {
  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com codigo_indicacao e endereco");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  const codigo = typeof body.codigo_indicacao === "string" ? body.codigo_indicacao.trim().toUpperCase() : null;
  if (!codigo || !/^IND-[A-Z0-9]{6}$/.test(codigo)) {
    console.error("[MC17.4.2] payload inválido: codigo_indicacao", { recebido: body?.codigo_indicacao ?? null });
    return jsonError(400, "codigo_invalido", "codigo_indicacao deve casar com IND-XXXXXX (6 alfanuméricos maiúsculos)");
  }

  let endereco;
  try { endereco = validarEndereco(body.endereco); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  // JWT user-session do próprio indicado (anti-IDOR — alguém não pode
  // registrar indicação no nome de outro endereço).
  const auth = await autenticarUser(req);
  if (!auth.ok) return jsonError(401, auth.code, auth.message);
  if (auth.payload?.endereco !== endereco) {
    console.error("[MC17.4.2] endereco_nao_corresponde", { tokenEndereco: mascararEndereco(auth.payload?.endereco), bodyEndereco: mascararEndereco(endereco) });
    return jsonError(403, "endereco_nao_corresponde", "token não pertence ao endereço informado");
  }

  // visitorId opcional via header X-Visitor-ID (padrão dos outros endpoints).
  const vidRaw = req.headers.get("x-visitor-id");
  const visitorId = (typeof vidRaw === "string" && VISITOR_RE.test(vidRaw)) ? vidRaw : null;

  const r = await registrarIndicacao(codigo, endereco, visitorId);
  if (!r.ok) {
    // Mapeia motivo → status HTTP. Auto-indicação e código inexistente são 400.
    const status =
      r.code === "feature_desligada"     ? 503 :
      r.code === "auto_indicacao"        ? 400 :
      r.code === "ja_indicado"           ? 409 :
      r.code === "codigo_inexistente"    ? 404 :
      r.code === "mesmo_dispositivo"     ? 403 :
      r.code === "sybil_suspeito"        ? 403 :
      r.code === "endereco_invalido"     ? 400 :
      r.code === "persistencia_falhou"   ? 502 : 400;
    return jsonError(status, r.code, r.message);
  }

  // MC17.4.1 — recompensa IMEDIATA no registo (antes: só no 1.º lance).
  // Anti-Sybil complementar (além do checkSybil por visitorId em registrarIndicacao):
  //   • throttle por IP/hora (x-nf-client-connection-ip) → excedido ⇒ vincula mas
  //     NÃO credita (suspeita auditável no referral-log);
  //   • X-Device-Tracked é sinal fraco → não bloqueia, apenas regista.
  // A conversão reusa registrarConversao: +1 senha ao indicador (limite mensal 10)
  // e +1 ao indicado, idempotente via marcador único referral-convertido. Fail-soft.
  const ip = req.headers.get("x-nf-client-connection-ip") || null;
  const deviceTracked = req.headers.get("x-device-tracked") === "true";
  const ipGate = await registrarTentativaConversaoIp(ip);

  let conversao = null;
  let pontosLance = null; // UTAC110f — só no ramo que passa o throttle de IP (R18-110f-2)
  if (!ipGate.ok) {
    // Excedeu o limite por IP/hora → vincula mas NÃO credita (auditável).
    try {
      await appendReferralLog({
        tipo: "suspeita", motivo: "ip_excedido", codigo,
        indicado: endereco, indicador: r.indicador,
        count: ipGate.count, deviceTracked,
      });
    } catch { /* não-fatal */ }
    conversao = { ok: false, code: "suspeita_sybil_ip" };
  } else {
    // MC17.5.1 [LOG TEMPORÁRIO] T5 — conversão imediata acionada no registo.
    console.log("[MC17.5.1] T5 registrarConversao acionado", { codigo, indicador: mascararEndereco(r.indicador), indicado: mascararEndereco(endereco) });
    try {
      // ⚠️ UTAC110h.3 (P5/DEBT-025) — os ARGUMENTOS levam os endereços REAIS. O `mascararEndereco` do
      // commit 0ec7d13 («fix(security): P3 logs mascarados») devia ter ficado SÓ no log (o console.log
      // logo acima mascara, e é isso que se quer); aplicado aos DADOS, matava o bónus on-chain:
      // `concederBonus` valida /^0x[a-f0-9]{40}$/ e recebia «0x1234…abcd» ⇒ `endereco_invalido` ⇒ não
      // creditava a senha on-chain, NÃO gravava o marcador `referral-convertido:…` nem a indução do GUTO.
      conversao = await registrarConversao(
        { codigo, indicador: r.indicador, indicado: endereco },
        { contexto: "registo" },
      );
    } catch (err) {
      console.warn("[referral] registrarConversao no registo falhou (não-fatal):", err?.message);
    }
    // UTAC110f — +50 pontos de lance ao indicante e +50 ao indicado (Art. 16º IV). Endereços REAIS
    // (nunca os mascarados do log). Idempotente pelas refs do ledger; o indicante respeita o limite de
    // 10/mês. FAIL-SOFT: uma falha aqui nunca desfaz o vínculo já registado.
    try {
      const pl = await creditarIndicacao(r.indicador, endereco);
      pontosLance = {
        indicante: !!pl.indicante?.creditado, indicado: !!pl.indicado?.creditado,
        ...(pl.indicante?.code ? { codeIndicante: pl.indicante.code } : {}),
        ...(pl.indicado?.code ? { codeIndicado: pl.indicado.code } : {}),
      };
    } catch (err) {
      console.warn("[referral] pontos de lance da indicação falharam (não-fatal):", err?.message);
      pontosLance = { indicante: false, indicado: false, codeIndicante: "excecao", codeIndicado: "excecao" };
    }
    if (deviceTracked) {
      try {
        await appendReferralLog({
          tipo: "suspeita", motivo: "device_tracked", codigo,
          indicado: endereco, indicador: r.indicador,
        });
      } catch { /* não-fatal */ }
    }
  }

  // [MC17.4.2] Rastreio do crédito: revela QUAL ramo anti-fraude (ip/limite/
  // idempotência/on-chain) eventualmente saltou o crédito num teste manual.
  console.log("[MC17.4.2] usar-codigo resultado", {
    codigo,
    // UTAC110h.4 (DEBT-031) — o par indicador↔indicado é grafo social (LGPD): mascarado já aqui,
    // como o log da linha acima já fazia. Os DADOS (endereços reais) seguem intactos para as chamadas.
    indicado:             mascararEndereco(endereco),
    indicador:            mascararEndereco(r.indicador),
    vinculoIdempotent:    !!r.idempotent,
    ipGateOk:             ipGate.ok,
    ipCount:              ipGate.count,
    deviceTracked,
    conversaoOk:          conversao?.ok || false,
    conversaoCode:        conversao?.code || null,
    conversaoIdempotent:  conversao?.idempotent || false,
    bonusIndicador:       conversao?.bonusIndicador ?? null,
    bonusIndicadorCode:   conversao?.bonusIndicadorCode ?? null,
  });

  return jsonResponse({
    sucesso:    true,
    idempotent: !!r.idempotent,
    codigo,
    // UTAC110j (R18-110j-5c · DEBT-034) — o campo `indicador` (endereço de carteira COMPLETO de quem
    // deu o código = dado pessoal de TERCEIRO, aresta do grafo social) saiu da resposta. Medido: zero
    // consumidores (o `ReferralRegistrar` só lê `idempotent` e `conversao`; 0 nos testes). Excepção ao
    // HI9 autorizada pelo operador.
    indicado:   endereco,
    conversao: conversao
      ? { ok: !!conversao.ok, idempotent: !!conversao.idempotent, code: conversao.code || null }
      : { ok: false, code: "conversao_falhou" },
    pontosLance, // UTAC110f — null quando o throttle de IP impediu o crédito
  });
}

export default async (req) => {
  // MC88.12 — preflight CORS do APK. Tem de ser a primeira coisa: o OPTIONS não
  // leva corpo nem Authorization, logo qualquer validação a montante responderia
  // 4xx e o browser abortaria a chamada real.
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  // Feature flag — desligado → 503 imediato (não tenta nada).
  if (!referralAtivo()) {
    return jsonError(503, "feature_desligada", "sistema de indicação temporariamente desligado (REFERRAL_ATIVO=off)");
  }

  // Rate limit por IP (5/min) para AMBOS GET e POST.
  const rl = await aplicarRateLimit(req, "referral", RATE_LIMIT_RPM);
  if (rl) return rl;

  const url   = new URL(req.url);
  const acao  = url.searchParams.get("acao");

  if (req.method === "GET" && acao === "meu-codigo") return handleMeuCodigo(req, url);
  if (req.method === "POST" && acao === "usar-codigo") return handleUsarCodigo(req);

  return jsonError(400, "acao_invalida",
    "use GET ?acao=meu-codigo ou POST ?acao=usar-codigo",
    { allowed: { GET: ["meu-codigo"], POST: ["usar-codigo"] } });
};
