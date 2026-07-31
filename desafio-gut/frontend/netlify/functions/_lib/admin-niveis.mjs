// _lib/admin-niveis.mjs — MC89.11 (Fase 2 do plano do MC89.5)
//
// Níveis de permissão do admin: super-admin > admin > operador.
//
// ⚠️ SEPARADO DE `admin-helpers.mjs` DE PROPÓSITO. `getAdminAddresses()` é
// usada em 14 sítios e devolve array de strings. Mudar-lhe o tipo de retorno
// partiria metade do sistema. Em vez disso, esta função LÊ o Blob uma segunda
// vez (com cache próprio de 60 s) e resolve APENAS o nível — chamada só no
// login, no refresh e no admin-logs.
//
// LEITURA RETROCOMPATÍVEL (risco R-1 do MC89.10):
//   · Formato antigo: ["0x..."] → todos são "admin"
//   · Formato novo:   [{ endereco, nivel }] → usa o nível declarado
//   · Blob vazio ou ilegível → "admin" (ninguém fica sem acesso)
//   · EOA coordenadora → sempre "super-admin"
//
// Em produção o Blob está vazio e a coordenação é a única admin. Um erro aqui
// tranca o operador fora do painel sem recuperação a não ser deploy.

import { getStore } from "@netlify/blobs";
import { resolverCoordenacao } from "./admin-helpers.mjs";

const BLOB_ADMINS = "admin-list";
const CACHE_TTL_MS = 60_000;
const ORDEM = { "super-admin": 3, admin: 2, operador: 1 };

let cache = { em: 0, niveis: new Map() };

/** Invalida o cache (testes). */
export function invalidarCacheNiveis() { cache = { em: 0, niveis: new Map() }; }

function abrirStore() {
  try { return getStore({ name: BLOB_ADMINS, consistency: "strong" }); }
  catch { return null; }
}

/**
 * Lê o Blob admin-list e devolve um Map<endereco, nivel>.
 *
 * ⚠️ ACEITA OS DOIS FORMATOS:
 *   ["0xabc"]        → "admin" (default seguro)
 *   [{ endereco, nivel }] → usa o campo `nivel`
 *
 * Qualquer entrada que não seja reconhecível como objeto com .nivel é tratada
 * como "admin". O objetivo é NUNCA trancar alguém para fora.
 */
async function carregarNiveis() {
  const agora = Date.now();
  if (agora - cache.em < CACHE_TTL_MS) return cache.niveis;

  const mapa = new Map();
  const store = abrirStore();
  if (!store) { cache = { em: agora, niveis: mapa }; return mapa; }

  try {
    const data = await store.get("admins", { type: "json" });
    const admins = Array.isArray(data?.admins) ? data.admins : [];

    for (const entrada of admins) {
      if (typeof entrada === "string") {
        // Formato antigo: string solta → "admin"
        mapa.set(entrada.toLowerCase(), "admin");
      } else if (entrada && typeof entrada === "object" && entrada.endereco) {
        // Formato novo: { endereco, nivel }
        const nivel = ORDEM[entrada.nivel] ? entrada.nivel : "admin";
        mapa.set(String(entrada.endereco).toLowerCase(), nivel);
      }
      // Qualquer outra coisa é ignorada (não quebra a leitura)
    }
  } catch (err) {
    console.warn("[admin-niveis] leitura do Blob falhou:", err?.message);
    // Blob ilegível → mapa vazio → todos os admins conhecidos são "admin"
    // (a coordenação é tratada separadamente)
  }

  cache = { em: agora, niveis: mapa };
  return mapa;
}

/**
 * Nível de um endereço admin.
 *
 * @param {string} endereco
 * @returns {Promise<"super-admin"|"admin"|"operador"|null>}
 *   null = não é admin
 */
export async function getAdminNivel(endereco) {
  if (!endereco) return null;

  const addr = String(endereco).toLowerCase();
  const coordenacao = resolverCoordenacao();

  // A coordenação é super-admin permanente (não depende do Blob)
  if (addr === coordenacao) return "super-admin";

  const niveis = await carregarNiveis();
  return niveis.get(addr) || null;
}

/**
 * O endereço tem pelo menos o nível mínimo?
 *
 * @param {string} nivel     nível do admin (ou endereço — resolvemos)
 * @param {string} minimo    nível mínimo exigido
 */
export function adminPode(nivel, minimo) {
  const n = ORDEM[nivel] || 0;
  const m = ORDEM[minimo] || 0;
  return n >= m;
}
