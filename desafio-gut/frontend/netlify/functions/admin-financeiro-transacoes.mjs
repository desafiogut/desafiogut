// GET /.netlify/functions/admin-financeiro-transacoes              [ADMIN]
// MC89.16 (Fase 5). UNION créditos + débitos, paginação por cursor.
// Gate: operador+. Sem cache. Sem ethers.

import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { guardAdminNivel } from "./_lib/admin-auth.mjs";
import { getSupabaseReadOnly } from "./_lib/supabase-client.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

export default async (req) => {
  const pf = respostaPreflight(req); if (pf) return pf;
  if (req.method !== "GET") return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });
  const rl = await aplicarRateLimit(req, "admin-fin-trans", 20); if (rl) return rl;
  const ng = await guardAdminNivel(req, "operador"); if (ng) return ng;

  const url = new URL(req.url);
  const tipo   = url.searchParams.get("tipo")   || "todos"; // credito | debito | todos
  const desde  = url.searchParams.get("desde")  || undefined;
  const ate    = url.searchParams.get("ate")    || undefined;
  const antes  = url.searchParams.get("antes")  || undefined;
  const limite = Math.min(parseInt(url.searchParams.get("limite"), 10) || 20, 50);

  const sb = getSupabaseReadOnly();

  // Duas consultas em paralelo, cada uma com os seus filtros
  const promessas = [];
  if (tipo === "credito" || tipo === "todos") {
    let q = sb.from("saldo_rs_creditos").select("pedido_id,payload,criado_em").order("criado_em", { ascending: false }).limit(limite + 1);
    if (desde) q = q.gte("criado_em", desde);
    if (ate)   q = q.lte("criado_em", ate);
    if (antes) q = q.lt("criado_em", antes);
    promessas.push(q);
  } else { promessas.push(Promise.resolve({ data: [], error: null })); }

  if (tipo === "debito" || tipo === "todos") {
    let q = sb.from("saldo_rs_debitos").select("operacao_id,payload,criado_em").order("criado_em", { ascending: false }).limit(limite + 1);
    if (desde) q = q.gte("criado_em", desde);
    if (ate)   q = q.lte("criado_em", ate);
    if (antes) q = q.lt("criado_em", antes);
    promessas.push(q);
  } else { promessas.push(Promise.resolve({ data: [], error: null })); }

  const [rC, rD] = await Promise.all(promessas);
  if (rC.error) return jsonError(500, "consulta_creditos", rC.error.message);
  if (rD.error) return jsonError(500, "consulta_debitos", rD.error.message);

  // Normalizar e unificar
  const creditos = (rC.data || []).map((c) => ({
    id: c.pedido_id, tipo: "credito",
    quando: c.criado_em,
    endereco: c.payload?.endereco || null,
    valorCentavos: Number(c.payload?.valorCentavos) || 0,
    fonte: c.payload?.fonte || "desconhecido",
    saldoDepoisCentavos: Number(c.payload?.saldoDepoisCentavos) || null,
  }));
  const debitos = (rD.data || []).map((d) => ({
    id: d.operacao_id, tipo: "debito",
    quando: d.criado_em,
    endereco: d.payload?.endereco || null,
    valorCentavos: Number(d.payload?.valorCentavos) || 0,
    fonte: d.payload?.fonte || d.payload?.origem || "desconhecido",
    saldoDepoisCentavos: Number(d.payload?.saldoDepoisCentavos) || null,
  }));

  // Merge ordenado (já vêm ordenados das consultas)
  const todas = [...creditos, ...debitos].sort((a, b) => (b.quando || "").localeCompare(a.quando || ""));
  const pagina = todas.slice(0, limite);
  const proximoCursor = todas.length > limite ? pagina[pagina.length - 1]?.quando : null;

  return jsonResponse({
    transacoes: pagina,
    total: todas.length,
    proximoCursor,
    resumo: {
      entradas: creditos.length,
      saidas: debitos.length,
      liquidoCentavos: creditos.reduce((a, c) => a + c.valorCentavos, 0) - debitos.reduce((a, d) => a + d.valorCentavos, 0),
    },
  });
};
