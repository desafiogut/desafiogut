/**
 * Rate Limiter — Token Bucket por endereço de carteira.
 *
 * Regras (alinhadas ao regulamento DESAFIOGUT):
 *  - Máximo 5 lances por janela de 60 segundos por carteira
 *  - Cooldown de 3 segundos entre lances consecutivos
 *
 * Isso é uma defesa client-side complementar ao require() do contrato.
 */

const JANELA_MS = 60_000;   // 1 minuto
const MAX_LANCES = 5;        // máximo por janela
const COOLDOWN_MS = 3_000;   // cooldown entre lances

const buckets = new Map(); // address -> { count, windowStart, lastLance }

function getBucket(address) {
  const now = Date.now();
  let bucket = buckets.get(address);

  if (!bucket || now - bucket.windowStart > JANELA_MS) {
    bucket = { count: 0, windowStart: now, lastLance: 0 };
    buckets.set(address, bucket);
  }
  return bucket;
}

/**
 * Verifica se o endereço pode dar um lance agora.
 * @returns {{ permitido: boolean, motivo?: string }}
 */
export function verificarRateLimit(address) {
  if (!address) return { permitido: false, motivo: "Carteira não conectada." };

  const now = Date.now();
  const bucket = getBucket(address);

  if (now - bucket.lastLance < COOLDOWN_MS) {
    const restante = Math.ceil((COOLDOWN_MS - (now - bucket.lastLance)) / 1000);
    return {
      permitido: false,
      motivo: `Aguarde ${restante}s antes do próximo lance.`,
    };
  }

  if (bucket.count >= MAX_LANCES) {
    const restante = Math.ceil((JANELA_MS - (now - bucket.windowStart)) / 1000);
    return {
      permitido: false,
      motivo: `Limite de ${MAX_LANCES} lances por minuto atingido. Aguarde ${restante}s.`,
    };
  }

  return { permitido: true };
}

/**
 * Registra um lance consumido para o endereço.
 */
export function registrarLance(address) {
  const bucket = getBucket(address);
  bucket.count += 1;
  bucket.lastLance = Date.now();
}
