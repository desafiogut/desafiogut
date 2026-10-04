// POST /.netlify/functions/registar-palpite — UTAC106f. Palpite do Passe Desafio Via B (BÓNUS).
//
// ⚠️ O palpite é BÓNUS (+2 pontos se for o mais próximo) — **NÃO decide o cartão**. O cartão é
//    SÓ por pontos de COMPRA (50) — requisito crítico da Google Play (jogo de habilidade).
//
// Header: Authorization: Bearer ***   ·   Body: { edicaoId, valor }   (idempotencyKey opcional:
// a chave natural é (endereco, edicaoId) — 1 palpite por edição).
//
// 201 { ok, idempotent:false, palpite }   palpite registado
// 200 { ok, idempotent:true,  palpite }   já tinha palpitado nesta edição (nada mudou)
// 400 edicaoId_invalido|valor_invalido · 401 token_ausente|token_invalido
// 404 edicao_inexistente · 405 metodo_invalido · 409 sem_passe (nunca comprou um Passe)
// 503 sistema_pausado|store_indisponivel
//
// Padrão herdado POR LEITURA de `comprar-passe-pontos.mjs` (Bearer → endereco; códigos de erro
// em snake_case; sem dados pessoais em logs).
import { jsonResponse, jsonError, parseJsonBody, ValidationError } from "./_lib/validate.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { sistemaPausado, lerEstadoSistema } from "./_lib/system-state.mjs";
import { buscarEdicao } from "./_lib/edicoes-core.mjs";
import { registarPalpite } from "./_lib/passe-pontos.mjs";

async function titular(req) {
  const h = req.headers.get("authorization") || "";
  const bearer = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!bearer) return { erro: "token_ausente" };
  try {
    const p = await verificarUserSession(bearer);
    const e = String(p?.endereco || "").toLowerCase();
    return /^0x[0-9a-f]{40}$/.test(e) ? { endereco: e } : { erro: "token_invalido" };
  } catch { return { erro: "token_invalido" }; }
}

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });

  const rl = await aplicarRateLimit(req, "registar-palpite", 10);
  if (rl) return rl;
  if (sistemaPausado(await lerEstadoSistema())) {
    return jsonError(503, "sistema_pausado", "Sistema em manutenção. Tente novamente em breve.");
  }

  const t = await titular(req);
  if (t.erro) return jsonError(401, t.erro, "Authorization: Bearer *** válido obrigatório");

  let body;
  try { body = await parseJsonBody(req); }
  catch (err) { if (err instanceof ValidationError) return jsonError(400, err.code, err.message); throw err; }

  const edicaoId = typeof body?.edicaoId === "string" ? body.edicaoId : "";
  const valor = body?.valor;
  // Inteiro ≥ 0 (nº de lances previstos). `Number.isInteger` rejeita "12", 12.5, null, Infinity.
  if (!Number.isInteger(valor) || valor < 0 || valor > 1000000) {
    return jsonError(400, "valor_invalido", "envie { valor } inteiro entre 0 e 1000000");
  }

  // A edição tem de existir (e ser Programada — é a modalidade do palpite).
  let edicao;
  try { edicao = await buscarEdicao(edicaoId); }
  catch { return jsonError(503, "store_indisponivel", "não foi possível ler a edição"); }
  if (!edicao) return jsonError(404, "edicao_inexistente", "edição não encontrada");

  let r;
  try { r = await registarPalpite(t.endereco, edicaoId, valor); }
  catch { return jsonError(503, "store_indisponivel", "não foi possível registar o palpite"); }

  if (!r.ok) {
    if (r.code === "SEM_PASSE") {
      return jsonError(409, "sem_passe", "é preciso ter comprado pelo menos 1 Passe para palpitar");
    }
    if (r.code === "EDICAO_INVALIDA") return jsonError(400, "edicaoId_invalido", "edicaoId inválido");
    if (r.code === "VALOR_INVALIDO") return jsonError(400, "valor_invalido", "valor inválido");
    return jsonError(502, "palpite_falhou", "não foi possível registar o palpite", { motivo: r.code });
  }

  const palpite = { edicaoId: r.palpite.edicao_id, valor: r.palpite.valor, criadoEm: r.palpite.criado_em };
  return r.criado
    ? jsonResponse({ ok: true, idempotent: false, palpite }, 201)
    : jsonResponse({ ok: true, idempotent: true, palpite }, 200);
};
