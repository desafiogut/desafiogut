// useRealtimeConfig — MC34 (subscrição) + MC99.2 (canal PARTILHADO por topic)
//
// Subscreve em tempo real a tabela `config_remota` (Supabase Realtime) e chama
// `onValor(novoValor)` em cada INSERT/UPDATE da chave indicada.
//
// Decisão MC34: realtime SÓ de config_remota (anon-readable, sem risco MC28).
// NUNCA subscreve `lances` (a RLS oculta-os do anon de propósito — anti-sniping).
//
// Robustez:
//   - Inerte se Supabase não estiver configurado (sem VITE_SUPABASE_*) → o chamador mantém
//     o seu fallback (fetch/one-shot). ZERO regressão.
//   - Reconnect automático com backoff exponencial (1,2,4,8,16,30s).
//   - Cliente globalizado/lazy (getSupabaseBrowser).
//
// ⚠️ MC99.2 — A CAUSA-RAIZ REAL do erro de produção
// «cannot add `postgres_changes` callbacks ... after `subscribe()`».
//
// O MC99.2 começou por atribuir o erro a uma corrida no `removeChannel` (que não era
// aguardado). O validador independente REFUTOU essa hipótese ao ler a biblioteca real
// (`@supabase/realtime-js` 2.108.2): `removeChannel` fecha o canal e retira-o do array do
// cliente **sincronamente** (via `onClose` → `_remove`), e `channel()` só reutiliza canais
// NÃO fechados. Logo, sem `await`, o reconnect já recebia um canal NOVO — não era ali.
//
// A causa real, REPRODUZIDA pelo validador com este hook verbatim + a biblioteca real:
// a rota `/mercado` monta `MercadoLances` E `CardLance`; ambos usam `useRecursosApp`, que
// chama `useRealtimeConfig(CHAVE_RECURSOS)`. Dois hooks, MESMO topic, MESMO cliente global:
// o `supabase-js` deduplica canais por topic, o 2.º `sb.channel(topic)` devolveu o canal JÁ
// SUBSCRIITO do 1.º, e o `.on()` a seguir rebentou.
//
// A correcção é a que a natureza do erro pede — **um canal por topic, partilhado**, com
// registo de assinantes — e não uma correcção cosmética da ordem das chamadas (que já estava
// correcta: `.channel().on().subscribe()`).

import { useEffect, useRef } from "react";
import { supabaseConfigurado, getSupabaseBrowser } from "../lib/supabaseClient";
// MC39.19 (Onda 4, item 32) — observabilidade de canais Realtime ativos.
import { canalAberto, canalFechado } from "../lib/realtimeMetrics";

const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000];

/**
 * Registo de canais PARTILHADOS, um por topic.
 *
 * `Map<topic, { canal, assinantes: Set<fn>, cancelado, tentativa, timer }>`
 *
 * É a estrutura que impede o erro de produção: a 2.ª chamada para o mesmo topic NÃO cria
 * segundo canal — junta-se como assinante do que já existe.
 */
const REGISTO = new Map();

/** Remove o canal da entrada e fecha-a (aguardando a remoção, por higiene). */
async function largar(entrada) {
  const c = entrada.canal;
  entrada.canal = null; // marca JÁ: uma 2.ª passagem não o remove duas vezes
  if (!c) return;
  try {
    const sb = await getSupabaseBrowser();
    await sb?.removeChannel(c);
  } catch { /* noop */ }
  canalFechado(); // item 32 — métrica: canal removido
}

function ligar(topic, entrada) {
  const reagendar = () => {
    if (entrada.cancelado || entrada.timer) return;
    const espera = BACKOFF_MS[Math.min(entrada.tentativa, BACKOFF_MS.length - 1)];
    entrada.tentativa += 1;
    entrada.timer = setTimeout(async () => {
      entrada.timer = null;
      if (entrada.cancelado) return;
      await largar(entrada);
      // o registo pode ter sido limpo enquanto o backoff corria (último assinante saiu)
      if (REGISTO.get(topic) !== entrada) return;
      ligar(topic, entrada);
    }, espera);
  };

  (async () => {
    const sb = await getSupabaseBrowser();
    if (!sb || entrada.cancelado || REGISTO.get(topic) !== entrada) return;
    const canal = sb
      .channel(topic)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "config_remota", filter: `chave=eq.${topic.slice("config_remota:".length)}` },
        (payload) => {
          const valor = payload?.new?.valor;
          if (valor === undefined) return;
          // fan-out: TODOS os consumidores deste topic recebem o mesmo evento
          for (const entrega of [...entrada.assinantes]) {
            try { entrega(valor); } catch { /* um assinante não pode derrubar os outros */ }
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") entrada.tentativa = 0; // reset do backoff após ligação estável
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") reagendar();
      });
    if (entrada.cancelado) { try { canal.remove?.(); } catch { /* noop */ } return; }
    entrada.canal = canal;
    canalAberto(); // item 32 — métrica: 1 canal criado (balanceado em largar)
  })();
}

export function useRealtimeConfig(chave, onValor) {
  const cbRef = useRef(onValor);
  cbRef.current = onValor;

  useEffect(() => {
    if (!chave || !supabaseConfigurado()) return; // fallback: sem realtime, no-op
    const topic = `config_remota:${chave}`;
    const entrega = (valor) => { cbRef.current?.(valor); };

    let entrada = REGISTO.get(topic);
    if (entrada) {
      // ⚠️ JÁ HÁ CANAL PARA ESTE TOPIC. Junta-se como assinante e NÃO se cria outro:
      // era exactamente aqui que rebentava «cannot add `postgres_changes` callbacks
      // ... after `subscribe()`» — com dois consumidores na mesma rota (/mercado monta
      // MercadoLances e CardLance, ambos via useRecursosApp).
      entrada.assinantes.add(entrega);
    } else {
      entrada = { canal: null, assinantes: new Set([entrega]), cancelado: false, tentativa: 0, timer: null };
      REGISTO.set(topic, entrada);
      ligar(topic, entrada);
    }

    return () => {
      const e = REGISTO.get(topic);
      if (!e) return;
      e.assinantes.delete(entrega);
      if (e.assinantes.size > 0) return; // ainda há consumidores: o canal fica vivo
      // último a sair: fecha a porta
      REGISTO.delete(topic);
      e.cancelado = true;
      if (e.timer) clearTimeout(e.timer);
      largar(e);
    };
  }, [chave]);
}
