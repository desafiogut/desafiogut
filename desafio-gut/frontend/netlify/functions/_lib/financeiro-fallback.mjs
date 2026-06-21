// _lib/financeiro-fallback.mjs — MC36.1 (TRANSITÓRIO — remover após confirmar)
//
// Fallback de LEITURA dos Blobs legados financeiros, para eliminar o gap durante o
// cutover (R11 proíbe dual-WRITE, não dual-read de histórico). Os handlers lêem
// primeiro o Supabase (stores) e, se ausente, caem para o Blob legado aqui. A
// ESCRITA vai SEMPRE só para Supabase. Quando a migração estiver confirmada e sem
// writes legados, este módulo é apagado (à imagem do cotas-fallback removido no MC38).

import { getStore } from "@netlify/blobs";

function abrir(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) { console.warn(`[financeiro-fallback] Blobs ${name} indisponível:`, err?.message); return null; }
}

async function ler(store, key) {
  const s = abrir(store);
  if (!s) return null;
  try { return (await s.get(String(key), { type: "json" })) ?? null; }
  catch { return null; }
}

export const lerSaldoLegado          = (clienteId)  => ler("saldo-rs", clienteId);
export const lerCreditoLegado        = (pedidoId)   => ler("saldo-rs-creditos", pedidoId);
export const lerDebitoLegado         = (operacaoId) => ler("saldo-rs-debitos", operacaoId);
export const lerTrocoLegado          = (clienteId)  => ler("troco-senhas", clienteId);
export const lerWalletLegado         = (clienteId)  => ler("wallet", clienteId);
export const lerWalletIdemLegado     = (idemKey)    => ler("wallet-idem", idemKey);
