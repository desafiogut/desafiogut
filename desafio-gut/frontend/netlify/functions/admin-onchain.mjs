// GET /.netlify/functions/admin-onchain                        [ADMIN]
//
// Saldo em ETH da EOA coordenadora + bloco atual. Separado do `admin-stats` de
// propósito: o plano do MC89 isolou-o porque ler a cadeia custava ~2 s de cold
// start com `ethers` (MC88.31) e isso arrastaria o painel inteiro.
//
// ⚠️ E ACABOU POR NÃO PRECISAR DE `ethers`. `eth_getBalance` e `eth_blockNumber`
// são dois POST de JSON-RPC — `fetch` nativo chega, como já faz o
// _lib/rpc-fallback.mjs. O isolamento mantém-se (a rede pode estar lenta ou em
// baixo, e isso não pode bloquear as métricas), mas sem os 2 s de arranque.
//
// PORQUE ISTO IMPORTA PARA O ADM: é a EOA que credita as senhas on-chain. Se
// ficar sem gás, a compra de senhas deixa de ser creditada — e o sintoma
// aparece longe da causa. Ter o saldo à vista no painel é o aviso antecipado.

import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { guardAdmin } from "./_lib/admin-auth.mjs";
import { cacheGet, cacheSet } from "./_lib/cache.mjs";
import { resolverCoordenacao } from "./_lib/admin-helpers.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

const CHAVE_CACHE = "admin:onchain:v1";
const TTL_SEG     = 60;
const TIMEOUT_MS  = 6000;

/** Uma chamada JSON-RPC crua, com timeout. Sem dependências. */
async function rpc(url, method, params = []) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: ctrl.signal,
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    if (json?.error) throw new Error(json.error?.message || "erro rpc");
    return json?.result ?? null;
  } finally {
    clearTimeout(t);
  }
}

/** Wei (hex) → string decimal em ETH, sem perder precisão (BigInt, não Number). */
function weiParaEth(hex) {
  const wei = BigInt(hex);
  const inteiro = wei / 10n ** 18n;
  const resto   = wei % 10n ** 18n;
  return `${inteiro}.${resto.toString().padStart(18, "0").slice(0, 6)}`;
}

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });
  }

  const rl = await aplicarRateLimit(req, "admin-onchain", 20);
  if (rl) return rl;

  const negado = await guardAdmin(req);
  if (negado) return negado;

  const hit = await cacheGet(CHAVE_CACHE);
  if (hit) return jsonResponse({ ...hit, cache: "hit" });

  const url = process.env.RPC_URL;
  if (!url) {
    // Indisponível é indisponível — nunca zero. Um saldo "0.000000" num painel
    // de ADM significa "a EOA secou", e isso mandaria alguém correr a abastecer
    // uma carteira que está cheia.
    return jsonError(503, "rpc_nao_configurado", "RPC_URL ausente no ambiente");
  }

  const eoa = resolverCoordenacao();
  const parciais = [];
  let saldoEth = null;
  let bloco = null;

  try {
    const saldoHex = await rpc(url, "eth_getBalance", [eoa, "latest"]);
    saldoEth = saldoHex ? weiParaEth(saldoHex) : null;
  } catch (err) {
    console.warn("[admin-onchain] eth_getBalance falhou:", err?.message);
    parciais.push("saldo");
  }

  try {
    const blocoHex = await rpc(url, "eth_blockNumber");
    bloco = blocoHex ? Number(BigInt(blocoHex)) : null;
  } catch (err) {
    console.warn("[admin-onchain] eth_blockNumber falhou:", err?.message);
    parciais.push("bloco");
  }

  const payload = { eoa, saldoEth, bloco, geradoEm: new Date().toISOString(), parciais };
  // Só se guarda o que foi lido por inteiro: cachear uma leitura parcial durante
  // 60 s prolongaria uma falha transitória de rede por muito mais tempo do que ela durou.
  if (parciais.length === 0) await cacheSet(CHAVE_CACHE, payload, TTL_SEG);
  return jsonResponse({ ...payload, cache: "miss" });
};
