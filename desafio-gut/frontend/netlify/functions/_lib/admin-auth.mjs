// Admin authentication — JWT curta duração + refresh token rotacionado.
//
// Modelo:
//   - Access token: JWT HS256 `{ endereco, tipo:"admin-access" }`, TTL 15 min.
//     Carregado em `Authorization: Bearer <token>` nos endpoints admin.
//   - Refresh token: 32-byte hex aleatório (NÃO é JWT). Hash SHA-256 do
//     valor é armazenado em Blob `admin-refresh:{endereco}` como array de
//     entradas `{ hash, expiresAt, createdAt, jti }`. TTL 7 dias.
//   - Rotação: refresh consumido → remove hash antigo, emite novo par,
//     persiste novo hash.
//   - Revogação: zera o array de refresh de um endereco (efeito imediato
//     pois access tokens duram apenas 15 min).
//
// MC89.46 — caminho legado REMOVIDO (2026-08-06):
//   `autenticarAdmin(req)` aceita APENAS `Authorization: Bearer <admin-JWT>`.
//   O header `x-admin-token` (ADMIN_TOKEN em texto puro) não é mais aceito
//   em nenhum endpoint que passe por este guard. Quem ainda dependia do
//   header legado deve usar o fluxo de login (auth-admin.mjs) e enviar o
//   Bearer JWT nas chamadas seguintes.

import { getStore } from "@netlify/blobs";
import { createHash, randomBytes } from "node:crypto";
import { assinarAdminAccess, verificarAdminAccess } from "./jwt.mjs";
import { getAdminAddresses } from "./admin-helpers.mjs";
import { getAdminNivel } from "./admin-niveis.mjs";
import { jsonError } from "./validate.mjs";

const BLOB_REFRESH    = "admin-refresh";
export const TTL_ACCESS_SEC  = 15 * 60;          // 15 min
export const TTL_REFRESH_SEC = 7 * 24 * 60 * 60; // 7 dias
const MAX_REFRESH_POR_ADMIN  = 5;                 // limita sessões paralelas

function abrirStore() {
  try { return getStore({ name: BLOB_REFRESH, consistency: "strong" }); }
  catch (err) {
    console.warn("[admin-auth] Blobs admin-refresh indisponível:", err?.message);
    return null;
  }
}

function hashRefresh(raw) {
  return createHash("sha256").update(raw).digest("hex");
}

function novoRefreshRaw() {
  return randomBytes(32).toString("hex");
}

function novoJti() {
  return randomBytes(8).toString("hex");
}

async function lerRefreshList(endereco) {
  const store = abrirStore();
  if (!store) return [];
  try {
    const data = await store.get(endereco, { type: "json" });
    return Array.isArray(data?.tokens) ? data.tokens : [];
  } catch { return []; }
}

async function salvarRefreshList(endereco, tokens) {
  const store = abrirStore();
  if (!store) throw new Error("admin-refresh blob indisponível");
  await store.setJSON(endereco, {
    tokens,
    atualizadoEm: new Date().toISOString(),
  });
}

/**
 * Emite par access+refresh para um endereco admin já autenticado externamente
 * (EIP-191 + ADMIN_TOKEN legado validados pelo caller).
 */
export async function emitirParAdmin(endereco) {
  const enderecoLower = endereco.toLowerCase();
  // MC89.11 — resolve o nível UMA vez no login/refresh. O nível fica
  // congelado no JWT durante os 15 min de validade do access token.
  const nivel = await getAdminNivel(enderecoLower) || "admin";
  const accessToken   = await assinarAdminAccess(enderecoLower, TTL_ACCESS_SEC, { nivel });
  const refreshRaw    = novoRefreshRaw();
  const refreshHash   = hashRefresh(refreshRaw);
  const jti           = novoJti();
  const agora         = Date.now();

  // Limpa expirados + limita quantidade.
  const lista = (await lerRefreshList(enderecoLower))
    .filter((t) => typeof t.expiresAt === "number" && t.expiresAt > agora);
  lista.push({
    hash: refreshHash,
    jti,
    createdAt: agora,
    expiresAt: agora + TTL_REFRESH_SEC * 1000,
  });
  if (lista.length > MAX_REFRESH_POR_ADMIN) lista.splice(0, lista.length - MAX_REFRESH_POR_ADMIN);
  await salvarRefreshList(enderecoLower, lista);

  return {
    accessToken,
    refreshToken: refreshRaw,
    accessExpiresIn:  TTL_ACCESS_SEC,
    refreshExpiresIn: TTL_REFRESH_SEC,
    jti,
  };
}

/**
 * Rotaciona um refresh: valida + remove o hash antigo + emite novo par.
 * Throws com .code se inválido/expirado.
 */
export async function rotacionarRefresh(endereco, refreshRaw) {
  const enderecoLower = endereco.toLowerCase();
  const agora = Date.now();
  const lista = await lerRefreshList(enderecoLower);
  const hash  = hashRefresh(refreshRaw);
  const idx   = lista.findIndex((t) => t.hash === hash);
  if (idx < 0) {
    const err = new Error("refresh inexistente ou já consumido");
    err.code = "refresh_invalido";
    throw err;
  }
  const reg = lista[idx];
  if (typeof reg.expiresAt === "number" && reg.expiresAt <= agora) {
    lista.splice(idx, 1);
    await salvarRefreshList(enderecoLower, lista);
    const err = new Error("refresh expirado");
    err.code = "refresh_expirado";
    throw err;
  }
  // Remove + emite par novo (rotação).
  lista.splice(idx, 1);
  await salvarRefreshList(enderecoLower, lista);
  // emitirParAdmin já anexa o novo hash + faz cleanup.
  return await emitirParAdmin(enderecoLower);
}

/**
 * Revoga TODOS os refresh tokens de um admin (logout-all).
 */
export async function revogarAdmin(endereco) {
  const enderecoLower = endereco.toLowerCase();
  await salvarRefreshList(enderecoLower, []);
}

/**
 * Guard único: aceita SOMENTE `Authorization: Bearer <admin-JWT>`.
 * Retorna:
 *   { ok: true, papel: "admin-jwt", endereco, fonte: "jwt", payload }
 *   { ok: false, papel: null, code, message }
 *
 * Valida também que o endereco do JWT continua na
 * lista de admins (revogações imediatas — o admin removido da lista perde
 * acesso mesmo com JWT ainda dentro do TTL).
 *
 * MC89.46 — o caminho legado `x-admin-token` foi REMOVIDO deste guard (a
 * validação em texto puro contra ADMIN_TOKEN não existe mais). Só o Bearer
 * admin-JWT emitido por auth-admin.mjs é aceito.
 *
 * MC7: `payload` exposto no sucesso para que middlewares posteriores
 * (ex: require-mfa) possam ler claims como `mfa_verified` sem reverificar.
 */
export async function autenticarAdmin(req) {
  // Único caminho aceito: Bearer admin-JWT (MC89.46 — x-admin-token removido).
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!bearer) {
    return { ok: false, papel: null, code: "admin_token_ausente", message: "Authorization: Bearer <admin-JWT> obrigatório" };
  }

  let payload;
  try { payload = await verificarAdminAccess(bearer); }
  catch (err) {
    const code = err?.code === "ERR_JWT_EXPIRED" ? "admin_token_expirado" : "admin_token_invalido";
    return { ok: false, papel: null, code, message: "Bearer admin JWT inválido ou expirado" };
  }
  const endereco = String(payload?.endereco || "").toLowerCase();
  const admins = await getAdminAddresses();
  if (!admins.includes(endereco)) {
    return { ok: false, papel: null, code: "admin_removido", message: "endereço não é mais admin" };
  }
  return { ok: true, papel: "admin-jwt", endereco, fonte: "jwt", payload };
}

/**
 * Wrapper de conveniência: retorna `null` se autenticado (continue),
 * ou um Response pronto com o status code certo se negado.
 *
 * MC89.47-S3 — códigos possíveis (o 503 admin_token_nao_configurado foi
 * removido: autenticarAdmin só aceita Bearer JWT e nunca mais o emite).
 */
export async function guardAdmin(req) {
  const r = await autenticarAdmin(req);
  if (r.ok) return null;
  let status = 401;
  if (r.code === "admin_removido") status = 403;
  return jsonError(status, r.code, r.message);
}

/**
 * MC89.11 — guardAdmin COM verificação de nível.
 *
 * Diferente de `guardAdmin(req)` que é binário (admin/não-admin), este wrapper
 * também valida que o admin tem pelo menos `nivelMinimo`. Usa a claim `nivel`
 * do JWT (se ausente → "admin" por retrocompatibilidade).
 *
 * @param {Request} req
 * @param {"super-admin"|"admin"|"operador"} [nivelMinimo="operador"]
 * @returns {Promise<null|Response>} null = autenticado E com nível suficiente
 */
export async function guardAdminNivel(req, nivelMinimo = "operador") {
  const r = await autenticarAdmin(req);
  if (!r.ok) {
    let status = 401;
    if (r.code === "admin_removido") status = 403;
    return jsonError(status, r.code, r.message);
  }

  // JWT sem claim `nivel` (retrocompat) → trata como "admin"
  const nivel = r.payload?.nivel || "admin";
  const ORDEM = { "super-admin": 3, admin: 2, operador: 1 };
  if ((ORDEM[nivel] || 0) < (ORDEM[nivelMinimo] || 0)) {
    return jsonError(403, "nivel_insuficiente",
      `Este endpoint exige nível "${nivelMinimo}" ou superior. O teu nível é "${nivel}".`);
  }

  return null;
}
