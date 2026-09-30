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
    channel() { throw new Error("duplo: realtime não é exercitado pelo arnês"); },
  });
}
