// GET /.netlify/functions/lastro-eco-quildo — UTAC110e. [ADMIN] Lastro em R$ do ECOQUILDO.
//
// Devolve o registo contabilístico (linha única) da moeda social:
//   total_emitido        — ECOQUILDO emitido (inteiro);
//   total_usado          — ECOQUILDO usado no site oficial (inteiro);
//   reserva_rs_centavos  — reserva em CENTAVOS de R$ que garante o lastro em circulação (Art. 47º/50º).
//
// Gate: `guardAdmin`. Leitura pura — não escreve nada.
//
// Header: Authorization: Bearer *** (admin)
// 200 { ok, total_emitido, total_usado, reserva_rs_centavos, em_circulacao, centavos_por_eco_quildo, coerente }
// 401/403 (guardAdmin) · 405 metodo_invalido · 503 store_indisponivel
//
// `coerente` = a reserva lida bate com `(total_emitido − total_usado) × 100` — o invariante do Art. 50º.
// Se der `false`, houve escrita fora da lib (`_lib/eco-quildo.mjs` é o único sítio que a mantém).
import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { guardAdmin } from "./_lib/admin-auth.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { lerLastro, reservaDe, CENTAVOS_POR_ECOQUILDO } from "./_lib/eco-quildo.mjs";

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "GET") return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });

  const negado = await guardAdmin(req);
  if (negado) return negado;

  let lastro;
  try { lastro = await lerLastro(); }
  catch { return jsonError(503, "store_indisponivel", "não foi possível ler o lastro"); }

  return jsonResponse({
    ok: true,
    total_emitido: lastro.total_emitido,
    total_usado: lastro.total_usado,
    reserva_rs_centavos: lastro.reserva_rs_centavos,
    em_circulacao: lastro.total_emitido - lastro.total_usado,
    centavos_por_eco_quildo: CENTAVOS_POR_ECOQUILDO,
    coerente: lastro.reserva_rs_centavos === reservaDe(lastro.total_emitido, lastro.total_usado),
  });
};
