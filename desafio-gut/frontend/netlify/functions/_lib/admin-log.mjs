// _lib/admin-log.mjs — MC89.11 (Fase 2 do plano do MC89.5)
//
// Registo de auditoria em Postgres (tabela `admin_logs`).
//
// ⚠️ FAIL-CLOSED, AO CONTRÁRIO DE TODO O RESTO DO SISTEMA.
//
// Todo o resto deste projeto é fail-soft — um log não pode quebrar um
// pagamento, e com razão. AQUI A REGRA INVERTE-SE: para comandos de admin,
// "aconteceu e não há registo" é pior do que "não aconteceu". Por isso:
//
//   1. `registrarAcao()` é chamada ANTES de executar a ação.
//   2. Se o INSERT falhar, a função LANÇA — e o caller devolve 503.
//   3. Depois da ação, `confirmarAcao()` atualiza `sucesso` e `erro`.
//   4. Uma linha com `sucesso = NULL` que nunca é atualizada = ação que
//      rebentou a meio. O índice `idx_admin_logs_sucesso_null` serve para
//      as encontrar.
//
// NÃO "CORRIGIR" ISTO. A diferença é deliberada e está escrita aqui para que o
// próximo MC não a apague (D5b do MC89.5).

import { getSupabase, getSupabaseReadOnly } from "./supabase-client.mjs";

const TABELA = "admin_logs";
const PAGINACAO_PADRAO = 30;

/**
 * Resolve o cliente Supabase de ESCRITA. Em produção: primário (service_role).
 * Em teste: o duplo injetado.
 *
 * ⚠️ MC89.43 — TEM DE SER O PRIMÁRIO, NÃO A RÉPLICA.
 * Até aqui `registrarAcao`/`confirmarAcao` escreviam via `getSupabaseReadOnly()`.
 * Hoje isso não parte nada, porque `SUPABASE_READ_REPLICA_URL` não está definida
 * e o cliente RO cai para o primário. Mas é um verde por acidente: no dia em que
 * uma réplica for configurada, o INSERT de auditoria bate numa base só-de-leitura,
 * `registrarAcao` lança e — por ser FAIL-CLOSED — TODAS as ações de admin passam
 * a devolver 503. O próprio `supabase-client.mjs` já o diz: "ESCRITA NUNCA passa
 * por aqui (R11 anti-split-brain)".
 */
function resolverSbEscrita(sb) { return sb || getSupabase(); }

/**
 * Resolve o cliente Supabase de LEITURA. A réplica serve aqui: `lerLogs` é um
 * ecrã de consulta e tolera o atraso de replicação.
 */
function resolverSbLeitura(sb) { return sb || getSupabaseReadOnly(); }

/**
 * Regista uma ação ANTES de ela ser executada.
 *
 * ⚠️ FAIL-CLOSED: se o INSERT falhar, LANÇA. O caller TEM de o envolver num
 * try/catch e devolver 503 — a ação NÃO pode acontecer sem registo.
 *
 * @param {object} args
 * @param {object} [args._sb]  cliente Supabase injetável (testes)
 * @returns {Promise<{ id: string }>}
 */
export async function registrarAcao({
  _sb = null,
  admin_endereco, admin_email = null, admin_nivel = null,
  tipo_acao, alvo = null, justificativa = null,
  ip = null, user_agent = null, payload = {},
}) {
  if (!admin_endereco) throw new Error("admin_endereco obrigatório");
  if (!tipo_acao) throw new Error("tipo_acao obrigatório");

  const sb = resolverSbEscrita(_sb);
  const { data, error } = await sb.from(TABELA)
    .insert({
      admin_endereco: String(admin_endereco).toLowerCase(),
      admin_email: admin_email || null,
      admin_nivel: admin_nivel || null,
      tipo_acao,
      alvo: alvo || null,
      justificativa: justificativa || null,
      sucesso: null,   // ⚠️ NULL = registado, ainda por executar
      ip: ip || null,
      user_agent: user_agent || null,
      payload: payload || {},
      origem: "admin_logs",
    })
    .select("id")
    .single();

  if (error) {
    // FAIL-CLOSED: não há registo → não há ação.
    throw new Error(`admin_logs: falha ao registar "${tipo_acao}": ${error.message}`);
  }
  if (!data?.id) {
    throw new Error(`admin_logs: INSERT não devolveu id para "${tipo_acao}"`);
  }

  return { id: data.id };
}

/**
 * Confirma o desfecho de uma ação já registada.
 *
 * Chamada DEPOIS de a ação ser executada. É fail-soft (erro aqui NÃO reverte a
 * ação — a ação já aconteceu, só o registo é que fica incompleto).
 *
 * Uma linha que fique com sucesso=NULL para sempre é o rasto de uma ação que
 * rebentou a meio.
 */
export async function confirmarAcao(id, { sucesso, erro = null, _sb = null } = {}) {
  const sb = resolverSbEscrita(_sb);
  const { error: err } = await sb.from(TABELA)
    .update({ sucesso: !!sucesso, erro: erro || null })
    .eq("id", id);

  if (err) {
    console.warn(`[admin-log] confirmarAcao ${id} falhou (não-fatal):`, err.message);
    // NÃO lança. A ação já foi executada. O registo fica com sucesso=NULL.
  }
}

/**
 * Lê logs de auditoria com paginação por cursor e filtros.
 *
 * @param {object} opts
 * @param {string} [opts.admin]      filtrar por admin_endereco
 * @param {string} [opts.tipo_acao]  filtrar por tipo de ação
 * @param {string} [opts.desde]      ISO timestamp
 * @param {string} [opts.ate]        ISO timestamp
 * @param {string} [opts.q]          busca textual (alvo + justificativa)
 * @param {string} [opts.antes]      cursor de paginação (criado_em ISO)
 * @param {number} [opts.limite]
 */
export async function lerLogs(opts = {}) {
  const sb = resolverSbLeitura(opts._sb);
  const limite = Math.min(opts.limite || PAGINACAO_PADRAO, 100);

  let q = sb.from(TABELA)
    .select("*", { count: "exact" })
    .order("criado_em", { ascending: false })
    .limit(limite);

  if (opts.admin)       q = q.eq("admin_endereco", String(opts.admin).toLowerCase());
  if (opts.tipo_acao)   q = q.eq("tipo_acao", opts.tipo_acao);
  if (opts.desde)       q = q.gte("criado_em", opts.desde);
  if (opts.ate)         q = q.lte("criado_em", opts.ate);
  if (opts.antes)       q = q.lt("criado_em", opts.antes);

  if (opts.q) {
    // Busca textual sobre alvo + justificativa
    const termo = String(opts.q).trim();
    q = q.or(`alvo.ilike.%${termo}%,justificativa.ilike.%${termo}%`);
  }

  const { data, error, count } = await q;

  if (error) {
    console.warn("[admin-log] lerLogs falhou:", error.message);
    return { linhas: [], total: 0, erro: error.message };
  }

  const linhas = data || [];
  const proximoCursor = linhas.length === limite
    ? linhas[linhas.length - 1]?.criado_em
    : null;

  return { linhas, total: count ?? linhas.length, proximoCursor };
}
