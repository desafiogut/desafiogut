// _lib/cache.mjs — MC39.19 (Onda 3, itens 33/20): cache distribuído via Upstash REST.
//
// Cliente HTTP (fetch nativo — sem dependência nova, R6) compatível com serverless:
// o Upstash REST é stateless (HTTP), NÃO abre conexão TCP → imune à exaustão de
// conexões do ciclo Lambda (ao contrário de um cliente Redis TCP).
//
// ENV-GATED (zero regressão, R1): se REDIS_URL/REDIS_TOKEN não estiverem setados,
// TODAS as operações são no-op (get→null=miss, set/del→nada). O chamador cai no
// caminho atual (lê do Supabase). Ativa cache só quando o operador provisiona o
// Upstash (Onda 0, item 40). Falha-aberto: erro de rede no Redis → miss, nunca 5xx.

const URL_BASE = process.env.REDIS_URL;
const TOKEN    = process.env.REDIS_TOKEN;

export function cacheConfigurado() {
  return Boolean(URL_BASE && TOKEN);
}

// Executa um comando Redis via Upstash REST (POST com corpo JSON: ["GET","k"]).
async function upstash(command) {
  const resp = await fetch(URL_BASE, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!resp.ok) throw new Error(`upstash HTTP ${resp.status}`);
  const json = await resp.json();
  return json?.result ?? null;
}

/** Lê e desserializa um valor (ou null em miss / sem cache / erro). */
export async function cacheGet(chave) {
  if (!cacheConfigurado()) return null;
  try {
    const raw = await upstash(["GET", String(chave)]);
    return raw == null ? null : JSON.parse(raw);
  } catch (err) {
    console.warn("[cache] GET falhou (fail-open → miss):", err?.message);
    return null;
  }
}

/** Serializa e grava com TTL (segundos). No-op se cache não configurado. */
export async function cacheSet(chave, valor, ttlSeg = 300) {
  if (!cacheConfigurado()) return;
  try {
    await upstash(["SET", String(chave), JSON.stringify(valor), "EX", String(Math.max(1, Math.floor(ttlSeg)))]);
  } catch (err) {
    console.warn("[cache] SET falhou (fail-open):", err?.message);
  }
}

/** Invalida uma chave (na escrita — coerência write-through, R11). No-op sem cache. */
export async function cacheDel(chave) {
  if (!cacheConfigurado()) return;
  try { await upstash(["DEL", String(chave)]); }
  catch (err) { console.warn("[cache] DEL falhou:", err?.message); }
}

/**
 * INCR atômico com EXPIRE (fixed-window de rate-limit em Redis — item 19).
 * Devolve a contagem nova, ou null se cache não configurado (caller cai no Blobs).
 * Falha-aberto: erro de rede → null (o rate-limiter trata null como "passa").
 */
export async function cacheIncr(chave, ttlSeg) {
  if (!cacheConfigurado()) return null;
  try {
    const n = Number(await upstash(["INCR", String(chave)]));
    if (n === 1) {
      // Primeira ocorrência da janela → define expiração.
      try { await upstash(["EXPIRE", String(chave), String(Math.max(1, Math.floor(ttlSeg)))]); }
      catch { /* noop — a chave ainda expira no próximo INCR=1 */ }
    }
    return Number.isFinite(n) ? n : null;
  } catch (err) {
    console.warn("[cache] INCR falhou (fail-open):", err?.message);
    return null;
  }
}

/**
 * Cache-aside: devolve o valor do cache; em miss, chama fetchFn(), grava e devolve.
 * Sem cache configurado → executa fetchFn() direto (comportamento atual, zero regressão).
 * NOTA stampede (redis-patterns): para chaves MUITO quentes considerar lock distribuído
 * (SET NX PX) ou early-expiry probabilístico; aqui o TTL curto + fail-open já mitigam o risco
 * para config_remota/listagens (baixa cardinalidade).
 *
 * @param {string} chave
 * @param {number} ttlSeg
 * @param {() => Promise<any>} fetchFn  — busca a fonte de verdade (Supabase) em miss.
 */
export async function cacheAside(chave, ttlSeg, fetchFn) {
  const hit = await cacheGet(chave);
  if (hit !== null) return hit;
  const valor = await fetchFn();
  if (valor !== null && valor !== undefined) await cacheSet(chave, valor, ttlSeg);
  return valor;
}
