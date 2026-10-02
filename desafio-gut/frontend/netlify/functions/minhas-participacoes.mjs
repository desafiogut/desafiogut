// UTAC000.17a — "Minhas participações por edição" (pré-requisito do overlay agregado, 17c).
//
// GET /.netlify/functions/minhas-participacoes
//   ?edicaoId=R-1   (opcional) → filtra uma edição (útil para o overlay de uma edição)
//   sem params                  → todas as edições em que o titular deu lance
//
// Auth: Authorization: Bearer <user-session|admin-access>  — OBRIGATÓRIA (GATE 21).
//   O endereço vem SEMPRE do token; NÃO existe parâmetro de utilizador, logo é
//   impossível pedir participações de terceiros (não há nada a comparar nem a forjar).
//
// Resposta: { participacoes: [{ edicaoId, lances }], total, filtro }
//   ⚠️ `total` = número de EDIÇÕES (não de lances) — a contagem de lances vai em `lances` de cada item.
//   — só EDIÇÕES e a contagem de lances do titular. ZERO valores de lance (GATE 22):
//     o 17c não precisa deles e o exportar-dados LGPD já cobre a titularidade.
//
// Fala com _lib/data-store.mjs (abstracção), NUNCA com @netlify/blobs directamente:
// funciona igual no backend "blobs" (hoje) e no "supabase" (após o flip).

import { jsonResponse, jsonError, validarEndereco, ValidationError } from "./_lib/validate.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { registrarFalhaJwt } from "./_lib/jwt-fail-counter.mjs";
import { listarEdicoesPorEndereco } from "./_lib/data-store.mjs";

const NOME = "minhas-participacoes";

export default async (req) => {
  // MC88.12 — preflight CORS do APK, sempre primeiro: o OPTIONS não leva
  // Authorization, e qualquer validação a montante responderia 4xx e o browser
  // abortaria a chamada real.
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });
  }

  // Leitura leve (par dos wallet-get/voucher-get/troco-get, limite 30).
  const rl = await aplicarRateLimit(req, NOME, 30);
  if (rl) return rl;

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    await registrarFalhaJwt(req, NOME);
    return jsonError(401, "token_ausente", "Authorization: Bearer *** obrigatório");
  }

  let jwtPayload;
  try {
    jwtPayload = await verificarUserSession(token);
  } catch (err) {
    await registrarFalhaJwt(req, NOME);
    const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
    return jsonError(401, code, "token de sessão inválido ou expirado");
  }

  // A identidade do titular vem do TOKEN (nunca do pedido). `validarEndereco`
  // normaliza para minúsculas — igual à forma como as chaves/supabase o guardam.
  let endereco;
  try {
    endereco = validarEndereco(jwtPayload?.endereco);
  } catch (err) {
    if (err instanceof ValidationError) {
      return jsonError(401, "token_sem_endereco", "sessão sem endereço válido");
    }
    throw err;
  }

  // Filtro opcional por edição (sem validação de forma: é só comparação de string;
  // um valor estranho devolve lista vazia, nunca dados de outro titular).
  let filtro = null;
  try {
    filtro = new URL(req.url).searchParams.get("edicaoId");
  } catch {
    filtro = null;
  }

  let edicoes;
  try {
    edicoes = await listarEdicoesPorEndereco(endereco, { edicaoId: filtro });
  } catch (err) {
    console.error(`[${NOME}] falha a listar participações:`, err?.message);
    return jsonError(503, "store_indisponivel", "não foi possível ler as participações");
  }

  const participacoes = filtro
    ? edicoes.filter((p) => String(p.edicaoId) === String(filtro))
    : edicoes;

  return jsonResponse({
    participacoes,
    total: participacoes.length,
    filtro: filtro ? { edicaoId: filtro } : null,
  });
};
