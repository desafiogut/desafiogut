// _lib/rpc-fallback.mjs — MC39.2 (resiliência de RPC/Bundler para mainnet)
//
// Seleção de endpoint com fallback OPT-IN. Princípio de ZERO regressão (R1):
//   - se NÃO houver fallback configurado → devolve o primário SEM probe
//     (comportamento byte-idêntico ao atual; sem latência extra, sem nova falha);
//   - só quando um fallback existe é que se faz health-probe e se troca para o
//     primeiro endpoint que responde.
// Nunca loga as URLs (contêm chaves de API — R9): só índice/estado.

const PROBE_TIMEOUT_MS = 4000;

function comTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${label}`)), ms)),
  ]);
}

async function jsonRpcOk(url, method) {
  const resp = await comTimeout(fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }),
  }), PROBE_TIMEOUT_MS, method);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const j = await resp.json().catch(() => ({}));
  if (j && j.error) throw new Error(j.error.message || "rpc error");
  return true;
}

/** Probe de RPC JSON-RPC (eth_blockNumber). */
export const probeRpc = (url) => jsonRpcOk(url, "eth_blockNumber");
/** Probe de Bundler ERC-4337 (eth_chainId — suportado por bundlers). */
export const probeBundler = (url) => jsonRpcOk(url, "eth_chainId");

/**
 * Escolhe o primeiro endpoint saudável entre [primary, fallback].
 *   - `fallback` vazio → devolve `primary` SEM probe (zero mudança de comportamento).
 *   - ambos falham o probe → devolve `primary` (o fluxo normal reporta o erro real).
 * @param {string} primary
 * @param {string|undefined|null} fallback
 * @param {(url:string)=>Promise<boolean>} probe
 * @param {string} tag rótulo de log (NÃO inclui a URL)
 * @returns {Promise<string>}
 */
export async function escolherEndpoint(primary, fallback, probe, tag) {
  if (!fallback) return primary;
  const candidatos = [primary, fallback].filter(Boolean);
  for (let i = 0; i < candidatos.length; i++) {
    try {
      await probe(candidatos[i]);
      console.info(`[rpc-fallback:${tag}] endpoint #${i + 1}/${candidatos.length} saudável`);
      return candidatos[i];
    } catch (e) {
      console.warn(`[rpc-fallback:${tag}] endpoint #${i + 1} indisponível (${e?.message}); a tentar próximo`);
    }
  }
  console.warn(`[rpc-fallback:${tag}] nenhum endpoint respondeu ao probe — a usar o primário`);
  return primary;
}

export const escolherRpc     = (primary, fallback) => escolherEndpoint(primary, fallback, probeRpc, "rpc");
export const escolherBundler = (primary, fallback) => escolherEndpoint(primary, fallback, probeBundler, "bundler");
