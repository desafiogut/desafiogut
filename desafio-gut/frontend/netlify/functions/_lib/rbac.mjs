// RBAC — Role-Based Access Control granular (3 níveis).
//
// Papéis:
//   - "admin"   → endereco ∈ Blob admin-list:admins  OU  endereco === COORDENACAO
//   - "cliente" → tem cota atribuída (Blob cotas:{endereco})  OU
//                 adesão ativa (Blob renovacao-adesao:{endereco}.status === "ativa")
//   - "user"    → qualquer outro endereco autenticado
//
// Cache em memória da função (TTL 5 min) para reduzir hit no Blobs.

import { getStore } from "@netlify/blobs";
import { getAdminAddresses } from "./admin-helpers.mjs";

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map(); // key = endereco lowercase → { role, fonte, em }

const HIERARQUIA = { user: 0, cliente: 1, admin: 2 };

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[rbac] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

/**
 * @param {string} endereco
 * @returns {Promise<{ role: "admin"|"cliente"|"user", fonte: string }>}
 */
export async function getRole(endereco) {
  if (!endereco) return { role: "user", fonte: "sem-endereco" };
  const enderecoLower = String(endereco).toLowerCase();

  const hit = cache.get(enderecoLower);
  if (hit && Date.now() - hit.em < CACHE_TTL_MS) {
    return { role: hit.role, fonte: hit.fonte };
  }

  let out = { role: "user", fonte: "default" };

  // 1) Admin?
  const admins = await getAdminAddresses();
  if (admins.includes(enderecoLower)) {
    out = { role: "admin", fonte: "admin-list" };
  } else {
    // 2) Cota atribuída?
    const cotasStore = abrirStore("cotas");
    let temCota = false;
    if (cotasStore) {
      try {
        const cota = await cotasStore.get(enderecoLower, { type: "json" });
        if (cota) temCota = true;
      } catch {}
    }
    if (temCota) {
      out = { role: "cliente", fonte: "cotas" };
    } else {
      // 3) Adesão ativa?
      const renovacaoStore = abrirStore("renovacao-adesao");
      if (renovacaoStore) {
        try {
          const reg = await renovacaoStore.get(enderecoLower, { type: "json" });
          if (reg?.status === "ativa") {
            const valMs = reg.validade ? new Date(reg.validade).getTime() : 0;
            if (!valMs || valMs > Date.now()) {
              out = { role: "cliente", fonte: "renovacao-ativa" };
            }
          }
        } catch {}
      }
    }
  }

  cache.set(enderecoLower, { ...out, em: Date.now() });
  return out;
}

/**
 * Verifica se um papel atende ao requisito mínimo.
 * Hierarquia: admin > cliente > user. requireRole("user","cliente") = false.
 */
export function requireRole(papel, minimo) {
  return (HIERARQUIA[papel] ?? -1) >= (HIERARQUIA[minimo] ?? 0);
}

export function invalidarCacheRbac(endereco) {
  if (!endereco) cache.clear();
  else cache.delete(String(endereco).toLowerCase());
}
