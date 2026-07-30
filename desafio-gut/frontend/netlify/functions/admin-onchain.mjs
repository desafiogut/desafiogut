// GET /.netlify/functions/admin-onchain                        [ADMIN]
//
// Saldo em ETH da EOA coordenadora + bloco atual. Separado do `admin-stats` de
// propósito: a rede pode estar lenta ou em baixo, e isso não pode segurar as
// métricas do painel.
//
// MC89.2 — a leitura em si mudou para `_lib/admin-metricas.obterSaldoEoa()`,
// porque passou a ter DOIS consumidores: este endpoint e o intent `metricas_eoa`
// do GUTO. Uma fonte por número (a regra do MC89) só vale se for cumprida
// quando aparece o segundo consumidor — senão eram duas contas do mesmo saldo.
//
// ⚠️ Continua sem `ethers`: `eth_getBalance` e `eth_blockNumber` são dois POST
// de JSON-RPC. O plano do MC89 isolou este endpoint para conter os ~2 s de cold
// start do ethers (MC88.31) e acabou por não precisar dele.
//
// PORQUE IMPORTA PARA O ADM: é esta EOA que credita as senhas on-chain. Se ficar
// sem gás, a compra deixa de ser creditada e o sintoma aparece longe da causa.

import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { guardAdmin } from "./_lib/admin-auth.mjs";
import { cacheGet, cacheSet } from "./_lib/cache.mjs";
import { obterSaldoEoa } from "./_lib/admin-metricas.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

const CHAVE_CACHE = "admin:onchain:v1";
const TTL_SEG     = 60;

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

  let leitura;
  try {
    leitura = await obterSaldoEoa();
  } catch (err) {
    if (err?.code === "rpc_nao_configurado") {
      // Indisponível é indisponível — nunca zero. Ver o comentário em
      // obterSaldoEoa: um "0.000000" aqui manda alguém abastecer uma carteira cheia.
      return jsonError(503, "rpc_nao_configurado", "RPC_URL ausente no ambiente");
    }
    console.error("[admin-onchain] leitura falhou:", err?.message);
    return jsonError(503, "onchain_indisponivel", "não foi possível ler a cadeia agora");
  }

  const payload = { ...leitura, geradoEm: new Date().toISOString() };
  // Só se guarda o que foi lido por inteiro: cachear uma leitura parcial durante
  // 60 s prolongaria uma falha transitória de rede muito além do que ela durou.
  if (leitura.parciais.length === 0) await cacheSet(CHAVE_CACHE, payload, TTL_SEG);
  return jsonResponse({ ...payload, cache: "miss" });
};
