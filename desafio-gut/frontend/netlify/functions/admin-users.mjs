// GET /.netlify/functions/admin-users                            [ADMIN]
//
// MC89.14 (Fase 4). Lista de utilizadores com atividade, paginada por cursor.
// Fonte: vw_utilizadores.
// Gate: operador+. Cache 30s.
//
// MC89.43 (P0-A) — a vista passou a ter uma QUARTA fonte: `atividade_utilizadores`.
// Até aqui a lista era um UNION de cotas + saldo_rs + creditos, ou seja, era
// reconstruída a partir de pegadas FINANCEIRAS: quem entrava na app e não
// transacionava não existia para o admin. Agora quem faz login aparece, com
// `ultimo_acesso` preenchido.
//
// ⚠️ `ultimo_acesso` é NULL para os utilizadores antigos — a tabela só começou a
// contar a partir do deploy do MC89.43. NULL aqui significa "não sabemos", NÃO
// significa "nunca entrou". O ecrã tem de dizer isso, senão o admin lê ausência
// de dados como ausência de atividade.

import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { guardAdminNivel } from "./_lib/admin-auth.mjs";
import { cacheGet, cacheSet } from "./_lib/cache.mjs";
import { getSupabaseReadOnly } from "./_lib/supabase-client.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

const CHAVE_CACHE = "admin:users:v1";
const TTL_SEG = 30;

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });
  }

  const rl = await aplicarRateLimit(req, "admin-users", 20);
  if (rl) return rl;

  const negado = await guardAdminNivel(req, "operador");
  if (negado) return negado;

  const url = new URL(req.url);
  const q      = url.searchParams.get("q")      || "";
  const desde  = url.searchParams.get("desde")  || undefined;
  const antes  = url.searchParams.get("antes")  || undefined;
  const limite = Math.min(parseInt(url.searchParams.get("limite"), 10) || 20, 50);
  // ?ativos=7 → só quem acedeu nos últimos 7 dias. Sem o parâmetro, lista todos.
  const ativosDias = parseInt(url.searchParams.get("ativos"), 10) || 0;

  // Cache: a chave inclui os filtros. Com a base atual (~7 linhas), o cache
  // é mais relevante para proteger contra refreshes acidentais do que por
  // volume de dados.
  const cacheKey = `${CHAVE_CACHE}:${q}:${desde || ""}:${limite}:${ativosDias}`;
  const hit = await cacheGet(cacheKey);
  if (hit) return jsonResponse({ ...hit, cache: "hit" });

  const sb = getSupabaseReadOnly();
  let query = sb.from("vw_utilizadores")
    .select("*", { count: "exact" })
    .order("ultima_atividade", { ascending: false })
    .limit(limite + 1); // +1 para saber se há próxima página

  if (q) {
    const termo = `%${q.replace(/[%_]/g, "\\$&")}%`;
    query = query.or(`cliente_id.ilike.${termo},email.ilike.${termo},nome.ilike.${termo}`);
  }
  if (desde) query = query.gte("ultima_atividade", desde);
  if (antes) query = query.lt("ultima_atividade", antes);
  if (ativosDias > 0) {
    const corte = new Date(Date.now() - ativosDias * 86400_000).toISOString();
    // Filtra por `ultimo_acesso`, não por `ultima_atividade`: "ativo" aqui quer
    // dizer ENTROU na app, não "mexeu-se-lhe no saldo". Quem nunca acedeu desde
    // que isto existe tem NULL e fica de fora — que é o esperado neste filtro.
    query = query.gte("ultimo_acesso", corte);
  }

  const { data, error, count } = await query;
  if (error) {
    return jsonError(500, "consulta_falhou", error.message);
  }

  const usuarios = (data || []).slice(0, limite);
  const proximoCursor = data && data.length > limite
    ? data[limite - 1]?.ultima_atividade
    : null;

  const payload = {
    usuarios,
    total: count ?? usuarios.length,
    proximoCursor,
    geradoEm: new Date().toISOString(),
  };

  await cacheSet(cacheKey, payload, TTL_SEG);
  return jsonResponse({ ...payload, cache: "miss" });
};
