// _lib/system-state.mjs — MC15.6 (Kill Switch / Modo Pânico)
//
// Estado global do sistema persistido em Blob "system-state" (chave "state").
//   valor = { status: "active" | "paused", timestamp (ISO|null), motivo (string|null) }
//
// LEITURA é fail-soft: qualquer erro/ausência → { status: "active" } (pânico é
// opt-in EXPLÍCITO — nunca bloquear lances por falha de leitura do Blob). A
// ESCRITA (escreverEstadoSistema) é usada pelas intents /panic e /unpanic (ITEM 7).
//
// Consumidores: notificacoes.mjs (ITEM 1), chatbot.mjs panic/unpanic (ITEM 7),
// lance-relampago.mjs / lance-programado.mjs (gate — ITEM 8).

import { getStore } from "@netlify/blobs";

export const STORE_SYSTEM_STATE = "system-state";
export const KEY_SYSTEM_STATE = "state";

const DEFAULT_STATE = { status: "active", timestamp: null, motivo: null };

function abrirStore() {
  try { return getStore({ name: STORE_SYSTEM_STATE, consistency: "strong" }); }
  catch (err) {
    console.warn("[system-state] Blobs indisponível:", err?.message);
    return null;
  }
}

/**
 * Lê o estado do sistema. Fail-soft: ausência/erro/valor inválido → "active".
 * @returns {Promise<{ status: "active"|"paused", timestamp: string|null, motivo: string|null }>}
 */
export async function lerEstadoSistema() {
  const store = abrirStore();
  if (!store) return { ...DEFAULT_STATE };
  try {
    const s = await store.get(KEY_SYSTEM_STATE, { type: "json" });
    if (s && (s.status === "paused" || s.status === "active")) {
      return {
        status: s.status,
        timestamp: typeof s.timestamp === "string" ? s.timestamp : null,
        motivo: typeof s.motivo === "string" ? s.motivo : null,
      };
    }
    return { ...DEFAULT_STATE };
  } catch (err) {
    console.warn("[system-state] leitura falhou (fail-soft → active):", err?.message);
    return { ...DEFAULT_STATE };
  }
}

/** True se o sistema está em modo pânico (pausado). */
export function sistemaPausado(estado) {
  return estado?.status === "paused";
}

/**
 * Escreve o estado do sistema (ITEM 7 — /panic e /unpanic). Admin-only é
 * garantido no chamador (chatbot.mjs). Lança em falha de persistência para que
 * o handler possa reportar erro ao admin (a escrita NÃO é fail-soft).
 * @param {"active"|"paused"} status
 * @param {string|null} [motivo]
 * @returns {Promise<{ status, timestamp, motivo }>}
 */
export async function escreverEstadoSistema(status, motivo = null) {
  if (status !== "active" && status !== "paused") {
    throw new Error(`status inválido: ${status}`);
  }
  const store = abrirStore();
  if (!store) throw new Error("system-state Blob indisponível");
  const estado = {
    status,
    timestamp: new Date().toISOString(),
    motivo: typeof motivo === "string" && motivo.trim() ? motivo.trim().slice(0, 200) : null,
  };
  await store.setJSON(KEY_SYSTEM_STATE, estado);
  return estado;
}
