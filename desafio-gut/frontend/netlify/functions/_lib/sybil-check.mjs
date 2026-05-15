// Anti-Sybil — Mega Comando 3 / Item 3 (server-side).
//
// Associa visitorId (FingerprintJS open-source v4) ↔ endereco Privy em
// janela de 24h. Se ≥ LIMIAR_ADDRESSES distintos compartilham o mesmo
// visitorId, marca como suspeito e dispara Sentry security_alert.
//
// Não bloqueia — é monitoramento passivo. A retenção é de 24h conforme
// docs/lgpd-politica-retencao.md.

import { getStore } from "@netlify/blobs";
import { captureSecurityAlert } from "./sentry-server.mjs";

const STORE_NAME       = "fingerprint";
const LIMIAR_ADDRESSES = 3;
const JANELA_MS        = 24 * 60 * 60 * 1000;

function abrirStore() {
  try { return getStore({ name: STORE_NAME, consistency: "strong" }); }
  catch (err) {
    console.warn("[sybil-check] Blobs indisponível:", err?.message);
    return null;
  }
}

function isFingerprintFormat(visitorId) {
  return typeof visitorId === "string" && /^[a-f0-9]{16,64}$/i.test(visitorId);
}

/**
 * Registra a associação visitorId → endereco. Retorna o registro atualizado
 * (com array de addresses únicos vistos nas últimas 24h).
 */
export async function registerVisitor(visitorId, endereco) {
  if (!isFingerprintFormat(visitorId)) return null;
  if (typeof endereco !== "string" || !endereco.startsWith("0x")) return null;
  const store = abrirStore();
  if (!store) return null;
  const enderecoLower = endereco.toLowerCase();
  const agora = Date.now();

  let reg;
  try { reg = await store.get(visitorId, { type: "json" }); }
  catch (err) {
    console.warn("[sybil-check] leitura falhou:", err?.message);
    return null;
  }

  const addresses = Array.isArray(reg?.addresses) ? reg.addresses : [];
  // Filtra entradas fora da janela de 24h.
  const filtrados = addresses.filter((a) => typeof a.at === "number" && agora - a.at < JANELA_MS);
  // Append-or-update do address atual.
  const idx = filtrados.findIndex((a) => a.endereco === enderecoLower);
  if (idx >= 0) {
    filtrados[idx] = { endereco: enderecoLower, at: agora };
  } else {
    filtrados.push({ endereco: enderecoLower, at: agora });
  }

  const novo = {
    visitorId,
    addresses:    filtrados,
    atualizadoEm: new Date(agora).toISOString(),
  };
  try { await store.setJSON(visitorId, novo); }
  catch (err) {
    console.warn("[sybil-check] persistir falhou:", err?.message);
  }
  return novo;
}

/**
 * Avalia se um visitorId está em padrão de Sybil. NÃO grava — uso read-only
 * (para o caller decidir entre alertar ou aplicar política mais restritiva).
 */
export async function checkSybil(visitorId) {
  if (!isFingerprintFormat(visitorId)) return { suspeito: false, addresses: [] };
  const store = abrirStore();
  if (!store) return { suspeito: false, addresses: [] };
  const agora = Date.now();
  let reg;
  try { reg = await store.get(visitorId, { type: "json" }); }
  catch { return { suspeito: false, addresses: [] }; }
  const ativos = (reg?.addresses || [])
    .filter((a) => typeof a.at === "number" && agora - a.at < JANELA_MS)
    .map((a) => a.endereco);
  const distintos = [...new Set(ativos)];
  return {
    suspeito:  distintos.length >= LIMIAR_ADDRESSES,
    addresses: distintos,
    limiar:    LIMIAR_ADDRESSES,
  };
}

/**
 * One-shot: registra + verifica + alerta. Retorna o resultado do check para o caller.
 */
export async function registerAndCheck(visitorId, endereco, endpoint = "auth-user") {
  await registerVisitor(visitorId, endereco);
  const r = await checkSybil(visitorId);
  if (r.suspeito) {
    captureSecurityAlert("sybil_suspect", {
      visitorId, endpoint,
      addresses: r.addresses,
      limiar:    r.limiar,
    }).catch(() => {});
  }
  return r;
}
