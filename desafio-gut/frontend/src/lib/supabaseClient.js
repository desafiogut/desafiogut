// src/lib/supabaseClient.js — MC32.1 (cliente Supabase do FRONTEND)
//
// Cliente público (ANON_KEY, sujeito a RLS) para leitura de config_remota e,
// futuramente, realtime. Princípios:
//   - R9: credenciais SÓ de env (VITE_SUPABASE_*) — nunca hardcoded.
//   - R10: instância GLOBALIZADA (singleton lazy) — uma só por sessão.
//   - Bundle-lean: o supabase-js só é carregado (dynamic import) QUANDO há config,
//     ficando num chunk async separado (não pesa o bundle principal / CLS).
//
// Sem VITE_SUPABASE_URL/ANON_KEY → supabaseConfigurado() = false e
// getSupabaseBrowser() devolve null: o chamador mantém o caminho atual
// (função recursos-app) → ZERO regressão enquanto a env não estiver definida.

// MC99.2 — o singleton memoriza a PROMESSA, não o valor resolvido.
// ⚠️ Antes era `let _client = null` + `if (_client) return _client` dentro de uma função
// ASYNC: entre o `if` e a atribuição há um `await import(...)`. Dois chamadores no mesmo
// tick (o `ligar()` do realtime e o `carregarRecursos()`, ambos em effectos de montagem)
// passavam AMBOS o `if` e criavam DOIS clientes — é daqui que vinha o aviso
// "Multiple GoTrueClient instances detected in the same browser context".
// Com a promessa memorizada, a 2.ª chamada recebe a MESMA promessa em voo: a janela fecha.
let _promessa = null;

/** True se as env vars públicas mínimas estão presentes. */
export function supabaseConfigurado() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

/**
 * Devolve o cliente Supabase do browser (singleton lazy) ou null se não houver
 * config. Carrega o supabase-js sob demanda (chunk async).
 */
export function getSupabaseBrowser() {
  if (!supabaseConfigurado()) return Promise.resolve(null);
  if (!_promessa) {
    _promessa = import("@supabase/supabase-js")
      .then(({ createClient }) =>
        createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { auth: { persistSession: false, autoRefreshToken: false } }
        )
      )
      // Falha do import/create NÃO pode envenenar o singleton para sempre: solta a
      // promessa para que a próxima chamada possa tentar de novo.
      .catch((err) => { _promessa = null; throw err; });
  }
  return _promessa;
}
