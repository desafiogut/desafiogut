// GET /.netlify/functions/notificacoes — MC15.6 ITEM 1 (Notificações Proativas)
//
// Devolve eventos pendentes para o ADMIN consumir via polling adaptativo
// (frontend ITEM 2). Admin-only (R2/R4): não-admin recebe lista vazia (nunca
// vaza estado operacional). Read-only e 100% fail-soft — nunca derruba o front.
//
// Eventos derivados (sem store próprio de eventos — calculados on-read):
//   - tempo_limite_5min : edição ABERTA cujo termino_em está a <= 5 min.
//   - edicao_encerrada  : edição encerrada há <= 15 min (recência).
//   - sistema_pausado   : system-state.status === "paused".
//   - lance_invalido    : reservado (sem fonte de dados própria — emitido vazio).
//
// Estrutura do evento: { tipo, mensagem, timestamp (ISO), dados }.
// Resposta: { notificacoes: [...] }  (ordenada por timestamp desc).
//
// Rate-limit: 60/min/IP ("notificacoes") — leitura, janela generosa (R5).

import { getStore } from "@netlify/blobs";
import { jsonResponse, jsonError, parseJsonBody } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { autenticarAdmin } from "./_lib/admin-auth.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { getAdminAddresses } from "./_lib/admin-helpers.mjs";
import { lerEstadoSistema } from "./_lib/system-state.mjs";
import { lerNotificacoes, marcarLidas } from "./_lib/notificacoes-usuario.mjs";

const RL_NOTIFICACOES_RPM = 60;
const JANELA_FIM_SEG = 300;                  // 5 min — tempo_limite_5min
const RECENCIA_ENCERRADA_MS = 15 * 60 * 1000; // 15 min — edicao_encerrada
const STORE_EDICOES = "edicoes-metadata";
const COUNTERS_KEY = "counters";

/**
 * Confirma admin com o MESMO gate do GUTO (MC15.4.2): admin-access JWT /
 * x-admin-token (autenticarAdmin) OU user-session cujo endereço ∈ admin-list.
 * @returns {Promise<{ ok: boolean, endereco?: string|null }>}
 */
async function confirmarAdmin(req) {
  const adm = await autenticarAdmin(req);
  if (adm.ok) return { ok: true, endereco: adm.endereco || null };

  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!bearer) return { ok: false };
  try {
    const payload = await verificarUserSession(bearer);
    const endereco = String(payload?.endereco || "").toLowerCase();
    if (!endereco) return { ok: false };
    const admins = await getAdminAddresses();
    if (admins.includes(endereco)) return { ok: true, endereco };
  } catch {
    // token inválido/expirado → não-admin (recusa silenciosa)
  }
  return { ok: false };
}

/**
 * MC15.7 — extrai o endereço do PARTICIPANTE a partir do user-session JWT
 * (qualquer utilizador autenticado, admin ou não). null se sem/inválido token.
 * @returns {Promise<string|null>}
 */
async function getParticipante(req) {
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!bearer) return null;
  try {
    const payload = await verificarUserSession(bearer);
    const endereco = String(payload?.endereco || "").toLowerCase();
    return endereco || null;
  } catch {
    return null;
  }
}

/** Lê os metadados crus das edições (com encerradoEm), fail-soft → []. */
async function lerEdicoesRaw() {
  try {
    const store = getStore({ name: STORE_EDICOES, consistency: "strong" });
    const { blobs } = await store.list();
    const metas = [];
    for (const b of blobs) {
      if (b.key === COUNTERS_KEY) continue;
      try {
        const m = await store.get(b.key, { type: "json" });
        if (m && m.id) metas.push(m);
      } catch { /* ignora entrada corrompida */ }
    }
    return metas;
  } catch (err) {
    console.warn("[notificacoes] leitura edicoes falhou:", err?.message);
    return [];
  }
}

/** Monta os eventos de SISTEMA para o admin (MC15.6, comportamento intacto). */
async function montarEventosAdmin() {
  const agora = Date.now();
  const nowIso = new Date(agora).toISOString();
  const notificacoes = [];

  // sistema_pausado
  try {
    const estado = await lerEstadoSistema();
    if (estado.status === "paused") {
      notificacoes.push({
        tipo: "sistema_pausado",
        mensagem: "Sistema em modo pânico — lances bloqueados.",
        timestamp: estado.timestamp || nowIso,
        dados: { motivo: estado.motivo || null },
      });
    }
  } catch (err) {
    console.warn("[notificacoes] system-state falhou:", err?.message);
  }

  // tempo_limite_5min + edicao_encerrada
  try {
    const metas = await lerEdicoesRaw();
    for (const e of metas) {
      const termino = e.termino_em ? Date.parse(e.termino_em) : NaN;
      if (e.status === "aberto" && Number.isFinite(termino)) {
        const restanteSeg = Math.floor((termino - agora) / 1000);
        if (restanteSeg > 0 && restanteSeg <= JANELA_FIM_SEG) {
          notificacoes.push({
            tipo: "tempo_limite_5min",
            mensagem: `Edição ${e.id} termina em ${Math.max(1, Math.ceil(restanteSeg / 60))} min.`,
            timestamp: nowIso,
            dados: { edicaoId: e.id, restanteSeg, termino_em: e.termino_em },
          });
        }
      }
      if (e.status === "encerrado") {
        const encerradoMs = e.encerradoEm ? Date.parse(e.encerradoEm) : NaN;
        const recente = Number.isFinite(encerradoMs)
          ? (agora - encerradoMs) <= RECENCIA_ENCERRADA_MS
          : false;
        if (recente) {
          notificacoes.push({
            tipo: "edicao_encerrada",
            mensagem: `Edição ${e.id} encerrada.`,
            timestamp: e.encerradoEm || nowIso,
            dados: { edicaoId: e.id },
          });
        }
      }
    }
  } catch (err) {
    console.warn("[notificacoes] edicoes falhou:", err?.message);
  }

  notificacoes.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  return notificacoes;
}

export default async (req) => {
  const rl = await aplicarRateLimit(req, "notificacoes", RL_NOTIFICACOES_RPM);
  if (rl) return rl;

  // ── POST — marcar notificações do participante como lidas (MC15.7 R10/D5) ──
  if (req.method === "POST") {
    const endereco = await getParticipante(req);
    if (!endereco) return jsonError(401, "nao_autenticado", "sessão de utilizador obrigatória");
    let body = null;
    try { body = await parseJsonBody(req); } catch { body = null; }
    if (body?.acao !== "marcar_lidas") {
      return jsonError(400, "acao_invalida", 'use { acao: "marcar_lidas" }');
    }
    const ok = await marcarLidas(endereco);
    return jsonResponse({ ok });
  }

  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET ou POST", { allowed: ["GET", "POST"] });
  }

  // ── ADMIN → eventos de sistema (MC15.6, intacto) ──────────────────────────
  let admin = { ok: false };
  try {
    admin = await confirmarAdmin(req);
  } catch (err) {
    console.warn("[notificacoes] auth admin falhou:", err?.message);
  }
  if (admin.ok) {
    const notificacoes = await montarEventosAdmin();
    return jsonResponse({ notificacoes });
  }

  // ── PARTICIPANTE → notificações pessoais do Blob (MC15.7) ──────────────────
  const endereco = await getParticipante(req);
  if (!endereco) return jsonError(401, "nao_autenticado", "token obrigatório");
  const notificacoes = await lerNotificacoes(endereco);
  notificacoes.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  return jsonResponse({ notificacoes });
};
