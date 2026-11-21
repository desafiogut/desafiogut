// ⛔ UTAC147 (R18-147-C) — o login diário JÁ NÃO CREDITA pontos (modelo de Passes diretos). O endpoint fica
//    para não partir clientes instalados (o app chama-o uma vez por sessão): responde 200 com `creditado:false`
//    e `desativado:true`, sem tocar no ledger.
// POST /.netlify/functions/login-diario — UTAC110f (Frente A). Login diário: +5 pontos de lance, 1× por
// dia de Manaus (R18-110f-1/-4). O frontend chama-o uma vez por sessão; repetir é inofensivo — o crédito é
// idempotente pela `ref` diária no ledger (`_lib/fontes-lance.mjs`).
//
// Header: Authorization: Bearer <user-session>   (o endereço sai SEMPRE do token; corpo ignorado)
//
// 200 { ok, creditado, jaCreditado, pontosLance, dia }
// 401 token_ausente|token_invalido · 405 metodo_invalido · 502 credito_falhou · 503 sistema_pausado
//
// Padrão herdado POR LEITURA de `ler-pontos.mjs` (titular pelo Bearer; preflight primeiro; pausa → 503).
import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { sistemaPausado, lerEstadoSistema } from "./_lib/system-state.mjs";
import { diaManaus } from "./_lib/fontes-lance.mjs"; // UTAC147 — `creditarLoginDiario` saiu

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

  if (sistemaPausado(await lerEstadoSistema())) {
    return jsonError(503, "sistema_pausado", "Sistema em manutenção. Tente novamente em breve.");
  }

  const t = await titular(req);
  if (t.erro) return jsonError(401, t.erro, "Authorization: Bearer *** válido obrigatório");

  // UTAC147 — sem crédito. Era: `creditarLoginDiario(t.endereco, agora)` (+5 pontos de lance por dia de Manaus).
  return jsonResponse({
    ok: true,
    creditado: false,
    jaCreditado: false,
    desativado: true,
    pontosLance: null,
    dia: diaManaus(new Date()),
  });
};
