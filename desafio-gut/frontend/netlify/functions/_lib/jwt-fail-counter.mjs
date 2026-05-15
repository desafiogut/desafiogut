// Contador persistente de falhas de assinatura/JWT por IP em janela 1 min.
// Implementado em Netlify Blobs porque Lambdas são ephemeral — contador
// in-memory zera a cada cold start e não detecta burst real.
//
// Disparo: ≥ LIMIAR falhas no mesmo IP dentro do mesmo minuto epoch.

import { getStore } from "@netlify/blobs";
import { captureSecurityAlert } from "./sentry-server.mjs";

const STORE_NAME = "jwt-fail-counter";
const LIMIAR     = 5; // falhas/min/IP

function abrirStore() {
  try { return getStore({ name: STORE_NAME, consistency: "strong" }); }
  catch (err) {
    console.warn("[jwt-fail-counter] Blobs indisponível:", err?.message);
    return null;
  }
}

function extrairIp(req) {
  const nfHeader = req.headers.get("x-nf-client-connection-ip");
  if (nfHeader) return nfHeader.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

/**
 * Registra UMA falha JWT (signature/recover inválido OU token rejeitado).
 * Dispara Sentry security_alert se atingir LIMIAR no mesmo minuto.
 *
 * @param {Request} req
 * @param {string}  endpoint  ex.: "auth-user", "auth-admin"
 */
export async function registrarFalhaJwt(req, endpoint) {
  const store = abrirStore();
  if (!store) return;
  const ip      = extrairIp(req);
  const minuto  = Math.floor(Date.now() / 60000);
  const chave   = `${ip}:${minuto}`;

  let atual = 0;
  try {
    const raw = await store.get(chave);
    atual = Number(raw) || 0;
  } catch (err) {
    console.warn("[jwt-fail-counter] leitura falhou:", err?.message);
    return;
  }

  const novo = atual + 1;
  try { await store.set(chave, String(novo)); }
  catch (err) { console.warn("[jwt-fail-counter] persistir falhou:", err?.message); }

  if (novo === LIMIAR) {
    // Dispara UMA vez quando cruza o limiar — não a cada falha subsequente.
    captureSecurityAlert("jwt_failures", { ip, endpoint, count: novo, limiar: LIMIAR }).catch(() => {});
  }
}
