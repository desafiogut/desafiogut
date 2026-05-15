// Fonte unificada da lista de endereços admin.
//
// Lê a Blob "admin-list:admins" (mesma usada por admin-list.mjs) e agrega
// COORDENACAO. Cache em memória da função (TTL 60s) para evitar hit a cada
// requisição protegida (wallet, saldo-rs, etc.).

import { getStore } from "@netlify/blobs";

const BLOB_ADMINS = "admin-list";
// Endereço da coordenação — admin permanente (mesmo valor de admin-list.mjs).
export const COORDENACAO = "0xDa3a83A24b25aa71e1a9b5A74503fFA93487e84E".toLowerCase();

const CACHE_TTL_MS = 60 * 1000;
let cache = { em: 0, admins: [] };

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
  const todos = Array.from(new Set([COORDENACAO, ...admins]));
  cache = { em: agora, admins: todos };
  return todos;
}

export function invalidarCacheAdmins() {
  cache = { em: 0, admins: [] };
}
