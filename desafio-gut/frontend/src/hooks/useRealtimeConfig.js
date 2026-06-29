// useRealtimeConfig — MC34
//
// Subscreve em tempo real a tabela `config_remota` (Supabase Realtime) e chama
// `onValor(novoValor)` em cada INSERT/UPDATE da chave indicada. Substitui o
// polling por push instantâneo das flags/estado da edição.
//
// Decisão MC34: realtime SÓ de config_remota (anon-readable, sem risco MC28).
// NUNCA subscreve `lances` (a RLS oculta-os do anon de propósito — anti-sniping).
//
// Robustez:
//   - Inerte se Supabase não estiver configurado (sem VITE_SUPABASE_*) → o
//     chamador mantém o seu fallback (fetch/one-shot). ZERO regressão.
//   - Reconnect automático com backoff exponencial (1,2,4,8,16,30s).
//   - Cliente globalizado/lazy (getSupabaseBrowser) → supabase-js só carrega se
//     houver config; o canal é removido na desmontagem.

import { useEffect, useRef } from "react";
import { supabaseConfigurado, getSupabaseBrowser } from "../lib/supabaseClient";
// MC39.19 (Onda 4, item 32) — observabilidade de canais Realtime ativos.
import { canalAberto, canalFechado } from "../lib/realtimeMetrics";

const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000];

export function useRealtimeConfig(chave, onValor) {
  const cbRef = useRef(onValor);
  cbRef.current = onValor;

  useEffect(() => {
    if (!chave || !supabaseConfigurado()) return; // fallback: sem realtime, no-op

    let cancelado = false;
    let canal = null;
    let tentativa = 0;
    let timer = null;

    const limparCanal = async () => {
      if (!canal) return;
      try { const sb = await getSupabaseBrowser(); sb?.removeChannel(canal); } catch { /* noop */ }
      canal = null;
      canalFechado(); // item 32 — métrica: canal removido
    };

    const reagendar = () => {
      if (cancelado || timer) return;
      const espera = BACKOFF_MS[Math.min(tentativa, BACKOFF_MS.length - 1)];
      tentativa += 1;
      timer = setTimeout(async () => {
        timer = null;
        if (cancelado) return;
        await limparCanal();
        ligar();
      }, espera);
    };

    const ligar = async () => {
      const sb = await getSupabaseBrowser();
      if (!sb || cancelado) return;
      canal = sb
        .channel(`config_remota:${chave}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "config_remota", filter: `chave=eq.${chave}` },
          (payload) => {
            const valor = payload?.new?.valor;
            if (valor !== undefined && !cancelado) cbRef.current?.(valor);
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            tentativa = 0; // reset do backoff após ligação estável
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            reagendar();
          }
        });
      canalAberto(); // item 32 — métrica: 1 canal criado (balanceado em limparCanal)
    };

    ligar();

    return () => {
      cancelado = true;
      if (timer) clearTimeout(timer);
      limparCanal();
    };
  }, [chave]);
}
