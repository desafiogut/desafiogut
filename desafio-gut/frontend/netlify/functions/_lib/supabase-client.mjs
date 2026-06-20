// _lib/supabase-client.mjs — MC32.1
//
// Cliente Supabase para o BACKEND (Netlify Functions). Princípios:
//   - R9: credenciais SÓ de variáveis de ambiente — NUNCA hardcoded.
//   - R10: instância GLOBALIZADA (escopo de módulo, singleton lazy) — criada uma
//     vez e reutilizada entre invocações quentes da mesma instância Lambda,
//     mitigando cold-starts e exaustão de conexões.
//   - Comunicação via Data API (PostgREST/HTTP) do supabase-js — stateless, sem
//     pool de conexões TCP persistente (imune a conexões órfãs do ciclo serverless).
//   - Usa SERVICE_ROLE_KEY (ignora RLS) — exclusivo do backend, nunca exposto ao
//     cliente. O frontend usa a ANON_KEY (sujeita a RLS) separadamente.
//
// Sem auth persistente e sem realtime no backend: o cliente não abre sockets;
// só faz pedidos HTTP PostgREST. (O canal realtime vive no frontend — ANON_KEY.)

import { createClient } from "@supabase/supabase-js";

let _client = null;

/** True se as variáveis mínimas estão presentes (diagnóstico/guards). */
export function supabaseConfigurado() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Devolve o cliente Supabase singleton (lazy). Lança erro claro se as env vars
 * obrigatórias estiverem ausentes — fail-fast no chamador, nunca credencial
 * default nem hardcoded.
 */
export function getSupabase() {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "[supabase-client] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios (env vars, nunca hardcoded)."
    );
  }

  _client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Sem realtime no backend: não conectamos canais aqui (só HTTP PostgREST).
    global: { headers: { "x-application-name": "desafiogut-functions" } },
  });
  return _client;
}
