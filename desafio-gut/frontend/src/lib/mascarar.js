// src/lib/mascarar.js — UTAC110h.4 (DEBT-031).
//
// Porque existe: o console do browser é uma superfície de log como as outras. Os `console.*` de
// diagnóstico do fluxo de indicação (`ReferralRegistrar`) e do arranque da carteira (`PrivyRoot`)
// escreviam o endereço COMPLETO. É o endereço do PRÓPRIO utilizador (não há aresta do grafo social
// aqui — essa vive só no backend), mas a regra de higiene é a mesma e é testável:
//   «nenhum `console.*` da app escreve um endereço completo».
//
// Espelha `netlify/functions/_lib/validate.mjs::mascararEndereco` (mesma forma de saída, `0x1234…abcd`)
// para os dois lados do sistema não divergirem no que é um log mascarado.
//
// @param {unknown} v endereço (ou qualquer valor)
// @returns {string|null} `0x1234…abcd` · o próprio valor se não for hex-40 · `null` se vazio
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function mascararEnderecoLog(v) {
  const s = String(v ?? "");
  if (!ADDRESS_RE.test(s)) return s ? "0x…" : null;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}
