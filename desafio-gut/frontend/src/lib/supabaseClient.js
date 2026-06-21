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

let _client = null;

/** True se as env vars públicas mínimas estão presentes. */
export function supabaseConfigurado() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

/**
 * Devolve o cliente Supabase do browser (singleton lazy) ou null se não houver
 * config. Carrega o supabase-js sob demanda (chunk async).
 */
export async function getSupabaseBrowser() {
  if (_client) return _client;
  if (!supabaseConfigurado()) return null;
  const { createClient } = await import("@supabase/supabase-js");
  _client = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return _client;
}
