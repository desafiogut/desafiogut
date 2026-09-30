// _supabase-duplo.mjs — MC104.1. Duplo de `src/lib/supabaseClient.js`, injectado por alias do Vite no arnês.
// Fiel à forma usada pelo hook: from("config_remota").select("valor").eq("chave", k).maybeSingle().
// Recusa o que o real recusaria para esta query (tabela/colunas/filtro diferentes → erro).
globalThis.__duploSupabase ??= { configurado: false, erro: false, valor: undefined, pedidos: [] };
const estado = globalThis.__duploSupabase;

export function supabaseConfigurado() { return estado.configurado; }

export function getSupabaseBrowser() {
  if (!estado.configurado) return Promise.resolve(null);
  return Promise.resolve({
    from(tabela) {
      if (tabela !== "config_remota") throw new Error(`duplo: tabela inesperada ${tabela}`);
      return {
        select(cols) {
          if (cols !== "valor") throw new Error(`duplo: select inesperado ${cols}`);
          return {
            eq(col, v) {
              if (col !== "chave") throw new Error(`duplo: filtro inesperado ${col}`);
              estado.pedidos.push(v);
              return {
                async maybeSingle() {
                  if (estado.erro) return { data: null, error: { message: "falha simulada" } };
                  return { data: estado.valor === undefined ? null : { valor: estado.valor }, error: null };
                },
              };
            },
          };
        },
      };
    },
    // Tempo real (forma usada por useRealtimeConfig): channel(topic).on("postgres_changes", filtro, cb).subscribe(cbStatus).
    // Os callbacks ficam em estado.realtime[topic]; o teste entrega um evento com `emitirRealtime`.
    channel(topic) {
      const canal = {
        topic,
        on(tipo, filtro, cb) {
          if (tipo !== "postgres_changes" || filtro?.table !== "config_remota") throw new Error("duplo: subscrição inesperada");
          (estado.realtime[topic] ??= []).push(cb);
          return canal;
        },
        subscribe(cbStatus) { cbStatus?.("SUBSCRIBED"); return canal; },
      };
      return canal;
    },
    async removeChannel(canal) { delete estado.realtime[canal?.topic]; },
  });
}

estado.realtime ??= {};
/** Entrega um evento de tempo real a todos os assinantes do topic (como o Supabase faria num UPDATE). */
export function emitirRealtime(topic, valor) {
  for (const cb of estado.realtime[topic] ?? []) cb({ eventType: "UPDATE", new: { chave: topic.split(":")[1], valor } });
  return (estado.realtime[topic] ?? []).length;
}
