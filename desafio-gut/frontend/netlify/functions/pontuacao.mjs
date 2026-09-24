// POST /.netlify/functions/pontuacao   — APENAS coordenação/admin.
// Body: { cicloId, lances? }   Header: Authorization: Bearer <admin-jwt>
//
// MC93-B. Pontua uma rodada e persiste o resultado. O ciclo é a edição
// (decisão do operador, 2026-09-23), logo `cicloId` é o id da edição ("R-1").
//
// Se `lances` não vier no body, são lidos pela fachada `data-store` — a mesma
// fonte que `consolidar-lances.mjs` usa, para que a pontuação nunca discorde do
// resultado consolidado.
//
// Resposta 200: { ok, cicloId, participantes, bonusRegistados }
// Resposta 400: ciclo_obrigatorio
// Resposta 403: devolvida por guardAdmin
// Resposta 405: metodo_nao_permitido
// Resposta 500: falha_ao_pontuar
//
// ⚠️ ADMIN-ONLY por uma razão concreta: este endpoint escreve a tabela que
// decide prémio e regista dívida de senhas. Sem o guarda, qualquer pessoa
// pontua o torneio.

import { jsonResponse, jsonError, parseJsonBody } from "./_lib/validate.mjs";
import { guardAdmin } from "./_lib/admin-auth.mjs";
import { registrarPontuacaoRodada } from "./_lib/pontuacao-store.mjs";
import { getLances } from "./_lib/data-store.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonError(405, "metodo_nao_permitido", "use POST");
  }

  const denied = await guardAdmin(req);
  if (denied) return denied;

  const body = await parseJsonBody(req).catch(() => null);
  const cicloId = String(body?.cicloId || "").trim();
  if (!cicloId) return jsonError(400, "ciclo_obrigatorio", "cicloId obrigatório");

  try {
    const lances = Array.isArray(body?.lances) ? body.lances : await getLances(cicloId);
    // Sem histórico vindo do chamador: o store lê-o da sua própria tabela.
    // Exigi-lo ao chamador foi o defeito que tornou o bónus de sequência
    // inalcançável na integração — ver `_lib/pontuacao-store.mjs`.
    const r = await registrarPontuacaoRodada(cicloId, lances);
    return jsonResponse({ ok: true, ...r });
  } catch (err) {
    console.error("[pontuacao] falha ao pontuar", cicloId, err?.message);
    return jsonError(500, "falha_ao_pontuar", "não foi possível pontuar a rodada");
  }
};
