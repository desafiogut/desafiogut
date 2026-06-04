// POST /.netlify/functions/lance-relampago
// Header: Authorization: Bearer <token>  — JWT { endereco, tipo:"lance-auth" } emitido por /auth-lance
// Body: { endereco, valorCentavos, edicaoId?, idempotencyKey?, nomeExibicao? }
//
// Resposta 200: { ..., idempotent: true }    — lance já processado (idempotência)
// Resposta 201: { ok, lanceId, ... }          — lance novo criado
// Resposta 400: saldo_insuficiente | params_invalidos
// Resposta 401: token_ausente | token_expirado | token_invalido
// Resposta 403: endereco_nao_corresponde

import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import {
  jsonResponse, jsonError, validarEndereco,
  parseJsonBody, ValidationError,
} from "./_lib/validate.mjs";
import { debitarSaldoRs } from "./_lib/saldoRs.mjs";
import { verificarLanceAuth } from "./_lib/jwt.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { getRole, requireRole } from "./_lib/rbac.mjs";
import { requireMfa } from "./_lib/require-mfa.mjs";
import { lerEstadoSistema, sistemaPausado } from "./_lib/system-state.mjs";
import { registrarEventosDeLance } from "./_lib/notificacoes-usuario.mjs";

const LANCE_MIN_CENTAVOS = 1;
const LANCE_MAX_CENTAVOS = 999999;
const EDICAO_PADRAO      = "R-1";
const BLOB_LANCES        = "lances-relampago";
const BLOB_IDEM          = "lance-idem";

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

  // ── 4.5. RBAC: lance requer cliente+ (cota ativa, adesão ativa OU admin) ──
  const { role } = await getRole(endereco);
  if (!requireRole(role, "cliente")) {
    return jsonError(403, "papel_insuficiente",
      "lance requer cota ativa ou adesão ativa — papel atual: " + role,
      { role });
  }

  const edicaoId       = String(body.edicaoId || EDICAO_PADRAO);
  const idempotencyKey = typeof body.idempotencyKey === "string" && body.idempotencyKey.length > 0
    ? body.idempotencyKey.slice(0, 66)
    : null;
  const nomeExibicao   = typeof body.nomeExibicao === "string"
    ? body.nomeExibicao.slice(0, 80).trim() || null
    : null;

  console.info("[lance-relampago] início", { endereco, valorCentavos, edicaoId, idem: !!idempotencyKey });

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

  // ── 6. Debitar saldo R$ ────────────────────────────────────────────────────
  const debito = await debitarSaldoRs({ endereco, valorCentavos, motivo: `lance-${edicaoId}` });
  if (!debito.ok) {
    const status = debito.code === "saldo_insuficiente" ? 400 : 502;
    return jsonError(status, debito.code || "debito_falhou", debito.message || "não foi possível debitar saldo R$");
  }

  const lanceId = randomUUID();
  const registro = {
    lanceId, edicaoId, endereco, valorCentavos, nomeExibicao,
    saldoAntesCentavos:  debito.resultado.saldoAntesCentavos,
    saldoDepoisCentavos: debito.resultado.saldoDepoisCentavos,
    processadoEm: new Date().toISOString(),
  };

  // ── 7. Persistir lance em blob ─────────────────────────────────────────────
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
    saldoRsAntesCentavos:  debito.resultado.saldoAntesCentavos,
    saldoRsDepoisCentavos: debito.resultado.saldoDepoisCentavos,
    processadoEm: registro.processadoEm,
  }, 201);
};
