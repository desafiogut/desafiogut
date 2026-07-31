// Fonte unificada da lista de endereços admin.
//
// Lê a Blob "admin-list:admins" (mesma usada por admin-list.mjs) e agrega
// COORDENACAO. Cache em memória da função (TTL 60s) para evitar hit a cada
// requisição protegida (wallet, saldo-rs, etc.).

import { getStore } from "@netlify/blobs";
import { captureSecurityAlert } from "./sentry-server.mjs";

const BLOB_ADMINS = "admin-list";

// ── MC87 (P1-4) — a coordenação deixou de ser uma constante de código ────────
//
// ACHADO (MC86 / A-06): o endereço abaixo é a EOA cuja chave privada foi exposta
// (registo MC59.11) e continuava a ser admin PERMANENTE em produção. Pior: já nem
// é a coordenação real — o contrato ativo da mainnet
// (0x0052477A8CA81BCAF4a60e21e635F9e00a5d16cd) devolve, em coordenacao(),
// 0xFea436F74059f885Ea50d48ABBE21ef6665D1E67 (verificado on-chain em 2026-07-22).
//
// NÃO trocamos o valor por omissão. Em produção o Blob `admin-list:admins` está
// vazio, logo esta constante é a ÚNICA admin: mudá-la às cegas trancaria o
// operador fora do painel, sem via de recuperação a não ser um novo deploy.
//
// AÇÃO DO OPERADOR (uma variável de ambiente, sem deploy):
//   COORDENACAO_ADDRESS=0xFea436F74059f885Ea50d48ABBE21ef6665D1E67
// Enquanto não for definida, a chave queimada continua admin e cada resolução da
// lista emite um alerta de segurança — ruidoso de propósito.
const COORDENACAO_LEGADA = "0xDa3a83A24b25aa71e1a9b5A74503fFA93487e84E".toLowerCase();
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/** Coordenação efetiva: env `COORDENACAO_ADDRESS` se válida, senão a legada. */
export function resolverCoordenacao() {
  const bruto = String(process.env.COORDENACAO_ADDRESS || "").trim().toLowerCase();
  if (ADDRESS_RE.test(bruto)) return bruto;
  if (bruto) console.warn("[admin-helpers] COORDENACAO_ADDRESS inválida — a usar a legada");
  return COORDENACAO_LEGADA;
}

// Compatibilidade: importadores antigos continuam a ver `COORDENACAO`.
export const COORDENACAO = resolverCoordenacao();

const CACHE_TTL_MS = 60 * 1000;
let cache = { em: 0, admins: [] };
let alertouChaveQueimada = false;

export async function getAdminAddresses() {
  const agora = Date.now();
  if (agora - cache.em < CACHE_TTL_MS) return cache.admins;
  let admins = [];
  try {
    const store = getStore({ name: BLOB_ADMINS, consistency: "strong" });
    const data  = await store.get("admins", { type: "json" });
    admins = Array.isArray(data?.admins)
      ? data.admins.map((a) => String(a).toLowerCase())
      : [];
  } catch (err) {
    console.warn("[admin-helpers] leitura admins falhou (fail-soft):", err?.message);
  }
  const coordenacao = resolverCoordenacao();

  // MC87 (P1-4) — alerta enquanto a EOA comprometida continuar com poder de admin.
  // Uma vez por container (os Lambdas são efémeros, logo isto reaparece com
  // regularidade sem inundar o Sentry a cada requisição).
  if (coordenacao === COORDENACAO_LEGADA && !alertouChaveQueimada) {
    alertouChaveQueimada = true;
    console.warn("[admin-helpers] ALERTA: coordenação = EOA comprometida (MC59.11). "
      + "Defina COORDENACAO_ADDRESS para rotacionar.");
    captureSecurityAlert("admin_coordenacao_comprometida", {
      motivo: "COORDENACAO_ADDRESS não definida; a usar a EOA legada exposta",
    }).catch(() => {});
  }

  const todos = Array.from(new Set([coordenacao, ...admins]));
  cache = { em: agora, admins: todos };
  return todos;
}

export function invalidarCacheAdmins() {
  cache = { em: 0, admins: [] };
  alertouChaveQueimada = false;
}
