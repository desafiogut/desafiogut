// Rate limiter server-side por IP + endpoint, fixed-window de 60s.
// Contagem persistida em Netlify Blobs (store "rate-limit").
//
// Uso:
//   import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
//   const limited = await aplicarRateLimit(req, "comprar-senhas", 5);
//   if (limited) return limited;   // Response 429 já formatada
//
// Falha-aberto (fail-open): se Blobs indisponível, request passa com warning.
// Justificativa: rate-limit é defesa em camada, não autenticação. Quebra parcial
// do Blobs não deve derrubar tráfego legítimo.

import { getStore } from "@netlify/blobs";

const STORE_NAME = "rate-limit";

function extrairIp(req) {
  const nfHeader = req.headers.get("x-nf-client-connection-ip");
  if (nfHeader) return nfHeader.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

function abrirStore() {
  try { return getStore({ name: STORE_NAME, consistency: "strong" }); }
  catch (err) {
    console.warn("[rate-limiter] Blobs indisponível:", err?.message);
    return null;
  }
}

/**
 * @param {Request} req
 * @param {string}  endpoint  — slug estável (ex.: "comprar-senhas", "wallet-get")
 * @param {number}  limite    — máximo de requisições por minuto desse IP nesse endpoint
 * @returns {Promise<Response|null>} 429 se excedido; null se passou (fail-open em erro).
 */
export async function aplicarRateLimit(req, endpoint, limite) {
  if (!Number.isInteger(limite) || limite <= 0) {
    console.warn("[rate-limiter] limite inválido — ignorando:", { endpoint, limite });
    return null;
  }
  const ip      = extrairIp(req);
  const agora   = Date.now();
  const minuto  = Math.floor(agora / 60000);
  const chave   = `${ip}:${endpoint}:${minuto}`;
  const store   = abrirStore();
  if (!store) return null;

  let atual = 0;
  try {
    const raw = await store.get(chave);
    atual = Number(raw) || 0;
  } catch (err) {
    console.warn("[rate-limiter] leitura falhou (fail-open):", { chave, message: err?.message });
    return null;
  }

  const proximaJanela  = (minuto + 1) * 60;             // epoch seg
  const epochAgoraSeg  = Math.floor(agora / 1000);
  const retryAfterSeg  = Math.max(1, proximaJanela - epochAgoraSeg);

  if (atual >= limite) {
    return new Response(
      JSON.stringify({
        error: {
          code: "rate_limit_excedido",
          message: `máximo de ${limite} requisições por minuto excedido — tente novamente em ${retryAfterSeg}s`,
          retry_after: retryAfterSeg,
        },
      }),
      {
        status: 429,
        headers: {
          "content-type":         "application/json; charset=utf-8",
          "cache-control":        "no-store",
          "retry-after":          String(retryAfterSeg),
          "x-ratelimit-limit":    String(limite),
          "x-ratelimit-remaining":"0",
          "x-ratelimit-reset":    String(proximaJanela),
        },
      },
    );
  }

  try {
    await store.set(chave, String(atual + 1));
  } catch (err) {
    console.warn("[rate-limiter] persistir contador falhou (fail-open):", { chave, message: err?.message });
  }

  return null;
}
