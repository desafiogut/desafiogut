// _lib/cotas-fallback.mjs — MC37 (TRANSITÓRIO — remover após confirmar migração)
//
// Fallback de LEITURA dos Blobs legados de cota, para eliminar o gap durante o
// cutover (R11 proíbe dual-WRITE, não dual-read de histórico). Os handlers lêem
// primeiro o Supabase (cotas-store) e, se ausente, caem para o Blob legado aqui.
// A ESCRITA vai SEMPRE só para Supabase. Quando a migração estiver confirmada e
// não houver writes legados, este módulo é apagado.

import { getStore } from "@netlify/blobs";

function abrir(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) { console.warn(`[cotas-fallback] Blobs ${name} indisponível:`, err?.message); return null; }
}

/** Lê o registo de cota legado (cotas:{clienteId}) ou null. */
export async function lerCotaLegado(clienteId) {
  const s = abrir("cotas");
  if (!s) return null;
  try { return (await s.get(String(clienteId), { type: "json" })) ?? null; }
  catch { return null; }
}

/** Lê o índice CNPJ legado (cotas-cnpj:{cnpj}) ou null. */
export async function lerCnpjLegado(cnpj) {
  const s = abrir("cotas-cnpj");
  if (!s) return null;
  try { return (await s.get(String(cnpj), { type: "json" })) ?? null; }
  catch { return null; }
}

/** Lê o fingerprint anti-Sybil legado (cotas-fingerprint:{visitorId}) ou null. */
export async function lerFingerprintLegado(visitorId) {
  const s = abrir("cotas-fingerprint");
  if (!s) return null;
  try { return (await s.get(String(visitorId), { type: "json" })) ?? null; }
  catch { return null; }
}
