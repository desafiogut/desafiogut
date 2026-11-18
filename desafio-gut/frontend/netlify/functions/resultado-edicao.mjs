// GET /.netlify/functions/resultado-edicao?edicaoId=ESPECIAL-X — UTAC138 (Frente G/D).
//
// Resultado público de uma edição especial: vencedor + Top 10 dos menores lances únicos + métricas.
// Sem auth (dados públicos depois do fim; endereços sempre ENCURTADOS — R4).
// Se a edição já fechou e ninguém apurou ainda, apura AGORA («1.º acesso depois do fim»).
//
// 200 { pronto:true, edicaoId, vencedor, top10, totalLances, participantes, lancesUnicos, apuradoEm, termino_em }
// 200 { pronto:false, motivo:"agendada"|"em_curso"|"a_apurar", termino_em }
// 400 edicao_id_invalido · 404 edicao_inexistente · 405 metodo_invalido · 503 store_indisponivel|...

import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { apurarEspecial } from "./_lib/apuracao-especial.mjs";

const RL_GET_RPM = 30;
const STATUS = { edicao_id_invalido: 400, edicao_inexistente: 404, edicao_sem_termino: 409 };

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "GET") return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });

  const rl = await aplicarRateLimit(req, "resultado-edicao-get", RL_GET_RPM);
  if (rl) return rl;

  const edicaoId = new URL(req.url).searchParams.get("edicaoId") || "";
  const r = await apurarEspecial(edicaoId);
  if (!r.ok) return jsonError(STATUS[r.code] ?? 503, r.code, "resultado indisponível");
  if (!r.pronto) return jsonResponse({ pronto: false, edicaoId, motivo: r.motivo, termino_em: r.termino_em });

  const { resultado } = r;
  return jsonResponse({
    pronto: true,
    edicaoId: resultado.edicaoId,
    produto: resultado.produto,
    termino_em: resultado.termino_em,
    vencedor: resultado.vencedor,
    top10: resultado.top10,
    totalLances: resultado.totalLances,
    participantes: resultado.participantes,
    lancesUnicos: resultado.lancesUnicos,
    apuradoEm: resultado.apuradoEm,
  });
};
