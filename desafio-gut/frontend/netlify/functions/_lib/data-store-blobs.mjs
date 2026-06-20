// _lib/data-store-blobs.mjs — MC29.1 (implementação Netlify Blobs do data-store)
//
// Implementa a interface de _lib/data-store.mjs usando Netlify Blobs como
// backend real (o backend de HOJE). Comportamento 100% idêntico ao atual:
//   - getConfig/setConfig → Blob "config-experiencia" (chave por config).
//   - getLances/addLance  → reutilizam bids-store.mjs (Key-Per-Bid, MC28).
//     ZERO alteração à blindagem de lances: apenas delegamos.
//
// Leitura fail-soft (config): ausência/erro → null. O chamador decide o default
// (ver recursos-app-config.mjs). Padrão herdado de system-state.mjs.

import { getStore } from "@netlify/blobs";
import { gravarBid, listarBids } from "./bids-store.mjs";

const STORE_CONFIG = "config-experiencia";

function abrirConfig() {
  try {
    return getStore({ name: STORE_CONFIG, consistency: "strong" });
  } catch (err) {
    console.warn("[data-store-blobs] Blobs indisponível:", err?.message);
    return null;
  }
}

/** Lê uma configuração (JSON) do Blob config-experiencia. Fail-soft → null. */
export async function getConfig(chave) {
  const store = abrirConfig();
  if (!store) return null;
  try {
    return (await store.get(String(chave), { type: "json" })) ?? null;
  } catch (err) {
    console.warn(`[data-store-blobs] getConfig("${chave}") falhou:`, err?.message);
    return null;
  }
}

/** Escreve uma configuração (JSON) no Blob config-experiencia. */
export async function setConfig(chave, valor) {
  const store = abrirConfig();
  if (!store) throw new Error("config-experiencia Blob indisponível");
  await store.setJSON(String(chave), valor);
}

/** Lê todos os lances de uma edição (delega na paginação/paralelismo do MC28). */
export async function getLances(edicaoId) {
  return listarBids(edicaoId);
}

/**
 * Acrescenta um lance a uma edição (delega no Key-Per-Bid do MC28).
 * `lance` deve conter pelo menos `endereco` (ou `lancador`); o restante vira
 * registro imutável. Devolve a chave criada.
 */
export async function addLance(edicaoId, lance) {
  const endereco = lance?.endereco ?? lance?.lancador;
  if (!endereco) throw new Error("[data-store-blobs] addLance: lance sem endereco/lancador");
  return gravarBid({ edicaoId, endereco, registro: lance });
}
