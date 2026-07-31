// GET /.netlify/functions/admin-financeiro-resumo                 [ADMIN]
// MC89.16 (Fase 5). Agregação financeira: créditos, débitos, saldo em circulação.
// Gate: operador+. Cache: 45s. Sem ethers.

import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { guardAdminNivel } from "./_lib/admin-auth.mjs";
import { cacheGet, cacheSet } from "./_lib/cache.mjs";
import { getSupabaseReadOnly } from "./_lib/supabase-client.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

const CHAVE = "admin:fin:resumo:v1";
const TTL = 45;

export default async (req) => {
  const pf = respostaPreflight(req); if (pf) return pf;
  if (req.method !== "GET") return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });
  const rl = await aplicarRateLimit(req, "admin-fin-resumo", 20); if (rl) return rl;
  const ng = await guardAdminNivel(req, "operador"); if (ng) return ng;

  const hit = await cacheGet(CHAVE); if (hit) return jsonResponse({ ...hit, cache: "hit" });

  const sb = getSupabaseReadOnly();
  const url = new URL(req.url);
  const dias = parseInt(url.searchParams.get("periodo")) || 30;
  const desde = new Date(Date.now() - dias * 86400000).toISOString();

  const [rC, rD, rS, rCot] = await Promise.allSettled([
    sb.from("saldo_rs_creditos").select("payload,criado_em").gte("criado_em", desde).order("criado_em"),
    sb.from("saldo_rs_debitos").select("payload,criado_em").gte("criado_em", desde).order("criado_em"),
    sb.from("saldo_rs").select("payload"),
    sb.from("cotas").select("categoria,vendida"),
  ]);

  const d = (r) => (r.status === "fulfilled" && !r.value?.error) ? (r.value.data || []) : [];

  const creditos = d(rC); const debitos = d(rD); const saldos = d(rS); const cotas = d(rCot);

  const soma = (arr, fn) => arr.reduce((a, x) => a + (Number(fn(x)) || 0), 0);

  const payload = {
    totalRecebidoCentavos: soma(creditos, (c) => c.payload?.valorCentavos),
    totalCreditos: creditos.length,
    totalDebitadoCentavos: soma(debitos, (d) => d.payload?.valorCentavos),
    totalDebitos: debitos.length,
    totalEmCirculacaoCentavos: soma(saldos, (s) => s.payload?.centavos),
    cotasTotal: cotas.length,
    cotasVendidas: cotas.filter((c) => c.vendida === true).length,
    periodoDias: dias,
    geradoEm: new Date().toISOString(),
  };

  await cacheSet(CHAVE, payload, TTL);
  return jsonResponse({ ...payload, cache: "miss" });
};
