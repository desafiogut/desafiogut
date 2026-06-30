// _lib/financeiro-fallback.mjs — MC36.1 (TRANSITÓRIO — remover após confirmar)
//
// Fallback de LEITURA dos Blobs legados financeiros, para eliminar o gap durante o
// cutover (R11 proíbe dual-WRITE, não dual-read de histórico). Os handlers lêem
// primeiro o Supabase (stores) e, se ausente, caem para o Blob legado aqui. A
// ESCRITA vai SEMPRE só para Supabase. Quando a migração estiver confirmada e sem
// writes legados, este módulo é apagado (à imagem do cotas-fallback removido no MC38).
//
// MC39.22.3 (EX-4 Fase A) — INSTRUMENTAÇÃO de uso. Cada lerXLegado só é chamado quando
// o Supabase devolveu null (padrão `getX() ?? lerXLegado()` nos consumidores). Logo:
//   • retorno NÃO-NULO = HIT → o Blob legado serviu um dado que o Supabase não tinha.
//     É o sinal que BLOQUEIA a remoção (gate Fase D: HIT=0 por ≥30d + backfill).
//   • retorno null = miss → nem Supabase nem Blob tinham (registro inexistente).
// Logamos HIT em `console.warn("[EX-4] ...")` (greppável nos logs Netlify) + breadcrumb
// Sentry best-effort (contexto). NÃO logamos endereço/chave (evita PII bruta — R9/R10).
// A instrumentação é ADITIVA e fail-soft: NUNCA lança nem altera o valor lido (R1).

import { getStore } from "@netlify/blobs";
import { Sentry } from "./sentry-server.mjs";

function abrir(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) { console.warn(`[financeiro-fallback] Blobs ${name} indisponível:`, err?.message); return null; }
}

/**
 * Registra o uso do fallback (EX-4 Fase A). Best-effort: qualquer falha aqui é
 * engolida para JAMAIS afetar a leitura financeira (R1). Sem PII (só fn/store/hit).
 * @param {string} fn     nome do leitor (ex.: "lerCreditoLegado") — identifica o domínio/consumidor
 * @param {string} store  nome do Blob legado (ex.: "saldo-rs-creditos")
 * @param {boolean} hit   true se o Blob serviu um dado não-nulo (sinal de bloqueio)
 */
function registrarFallback(fn, store, hit) {
  try {
    if (hit) {
      // Canal primário de medição da Fase A: greppar `[EX-4]` nos logs da Netlify.
      console.warn("[EX-4] fallback-hit", JSON.stringify({ fn, store, hit: true, ts: new Date().toISOString() }));
    }
    // Breadcrumb Sentry (in-memory, sem flush) — contexto se um erro for capturado depois.
    Sentry?.addBreadcrumb?.({
      category: "financeiro-fallback",
      level: hit ? "warning" : "info",
      message: `[EX-4] ${hit ? "HIT" : "miss"} ${fn}`,
      data: { fn, store, hit },
    });
  } catch { /* instrumentação é best-effort; nunca quebra a leitura (R1) */ }
}

async function ler(store, key, fn) {
  const s = abrir(store);
  if (!s) return null;
  try {
    const valor = (await s.get(String(key), { type: "json" })) ?? null;
    registrarFallback(fn, store, valor !== null);
    return valor;
  } catch { return null; }
}

export const lerSaldoLegado          = (clienteId)  => ler("saldo-rs", clienteId, "lerSaldoLegado");
export const lerCreditoLegado        = (pedidoId)   => ler("saldo-rs-creditos", pedidoId, "lerCreditoLegado");
export const lerDebitoLegado         = (operacaoId) => ler("saldo-rs-debitos", operacaoId, "lerDebitoLegado");
export const lerTrocoLegado          = (clienteId)  => ler("troco-senhas", clienteId, "lerTrocoLegado");
export const lerWalletLegado         = (clienteId)  => ler("wallet", clienteId, "lerWalletLegado");
export const lerWalletIdemLegado     = (idemKey)    => ler("wallet-idem", idemKey, "lerWalletIdemLegado");
