// POST /.netlify/functions/apurar-palpite — UTAC106f. Apuração do palpite (ADMIN).
//
// ⚠️ ADMIN-ONLY. Não é público: exige sessão de admin (`_lib/admin-auth.mjs`) — a apuração
//    decide quem recebe os +2 pontos, logo não pode ser disparada pelo titular.
//
// Header: Authorization: Bearer *** (token de ADMIN)   ·   Body: { edicaoId, valorReal }
//
// 200 { ok, total, vencedor, pontosCreditados }   apurado (idempotente: re-apurar não paga 2×)
// 400 edicaoId_invalido|valor_invalido · 401 token_ausente|token_invalido · 403 sem_permissao
// 405 metodo_invalido · 503 store_indisponivel
//
// O vencedor é marcado `mais_proximo` e recebe `PONTOS_POR_PALPITE_CERTO` pontos com a ref
// `palpite-certo:<edicaoId>` (idempotente). Sem palpites por apurar → `vencedor:null`, ninguém pago.
import { jsonResponse, jsonError, parseJsonBody, ValidationError } from "./_lib/validate.mjs";
import { autenticarAdmin } from "./_lib/admin-auth.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { apurarPalpite } from "./_lib/passe-pontos.mjs";

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });

  const auth = await autenticarAdmin(req);
  if (!auth.ok) return jsonError(auth.code === "admin_removido" ? 403 : 401, auth.code, auth.message);

  let body;
  try { body = await parseJsonBody(req); }
  catch (err) { if (err instanceof ValidationError) return jsonError(400, err.code, err.message); throw err; }

  const edicaoId = typeof body?.edicaoId === "string" ? body.edicaoId : "";
  const valorReal = body?.valorReal;
  if (!Number.isInteger(valorReal) || valorReal < 0 || valorReal > 1000000) {
    return jsonError(400, "valor_invalido", "envie { valorReal } inteiro entre 0 e 1000000");
  }

  let r;
  try { r = await apurarPalpite(edicaoId, valorReal); }
  catch { return jsonError(503, "store_indisponivel", "não foi possível apurar"); }

  if (!r.ok) {
    if (r.code === "EDICAO_INVALIDA") return jsonError(400, "edicaoId_invalido", "edicaoId inválido");
    if (r.code === "VALOR_INVALIDO") return jsonError(400, "valor_invalido", "valorReal inválido");
    if (r.code === "PONTOS_INSUFICIENTES") return jsonError(502, "credito_falhou", "crédito do bónus recusado");
    return jsonError(503, "apuracao_falhou", "não foi possível apurar", { motivo: r.code });
  }

  return jsonResponse({
    ok: true, total: r.total, vencedor: r.vencedor, pontosCreditados: r.pontosCreditados,
  });
};
