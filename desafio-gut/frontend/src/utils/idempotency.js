// src/utils/idempotency.js — UTAC106e. Chave de idempotência POR CLIQUE (UUID v4).
//
// PORQUE EXISTE: o endpoint `comprar-passe-pontos` é idempotente por `idempotencyKey`
// (UTAC106d-v2). O cliente gera uma chave NOVA por CHAMADA — o RETRY do MESMO pedido reusa-a
// (e o servidor cobra uma vez); dois pedidos DIFERENTES levam chaves diferentes, e contra esses
// a trava é a guarda de corrida do `useComprarPasse` (achado R1), NÃO a chave.
//
// O repo não tinha gerador de UUID (medido: `grep -rn "randomUUID|uuid" src/` → 0 fora de
// node_modules). Usa `crypto.randomUUID()` quando existe (browsers modernos / WebView
// Capacitor) e um fallback CSPRNG-equivalente (`getRandomValues`) quando não.
//
// Formato: casa a regex do servidor `^[A-Za-z0-9._:-]{8,200}$` (32 hex + hífenes = 36 chars).

export function gerarIdempotencyKey() {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === "function") return c.randomUUID();

  const b = new Uint8Array(16);
  if (typeof c?.getRandomValues === "function") c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256); // último recurso

  // Marca de versão 4 + variante RFC 4122.
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export default gerarIdempotencyKey;
