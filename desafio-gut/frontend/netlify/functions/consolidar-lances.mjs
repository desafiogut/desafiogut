// POST /.netlify/functions/consolidar-lances   — APENAS coordenação/admin.
// Body: { edicaoId }   Header: Authorization: Bearer <admin-jwt>
//
// MC28.1 SEGMENTO 4. Consolida o leilão no fecho:
//   1) lê TODOS os lances (Key-Per-Bid) com paginação + paralelismo (SEGMENTO 5);
//   2) apura o menor lance único OFF-CHAIN (Artigo VIII) — custo on-chain O(1);
//   3) assina EIP-712 (recibo de auditoria; anti-replay reforçado pelo edicaoNonce);
//   4) envia consolidarResultado via Flashbots Protect (anti-MEV);
//   5) trata transação descartada (NUNCA reenvia automaticamente — ITEM 4.2).
//
// Só corre em NETWORK_STAGE === 'mainnet' (R9).
//
// MC94.3 — os passos 3–10 vivem em `_lib/consolidacao.mjs` (autorização do
// operador): a scheduled `scheduled-encerrar-especial.mjs` precisa do MESMO código,
// e duas cópias do que move dinheiro on-chain divergiriam. Este handler ficou com
// o que é HTTP: preflight, método, rede, autorização e corpo. Respostas iguais.

import { jsonResponse, jsonError, parseJsonBody } from "./_lib/validate.mjs";
import { guardAdmin } from "./_lib/admin-auth.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { consolidarEdicao } from "./_lib/consolidacao.mjs";

// Compat: `apurarMenorUnico` era exportado daqui (mc28-seguranca, mc33-load).
export { apurarMenorUnico } from "./_lib/consolidacao.mjs";

export default async (req) => {
  // MC88.12 — preflight CORS do APK. Tem de ser a primeira coisa: o OPTIONS não
  // leva corpo nem Authorization, logo qualquer validação a montante responderia
  // 4xx e o browser abortaria a chamada real.
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") return jsonError(405, "metodo_invalido", "use POST");
  if (process.env.NETWORK_STAGE !== "mainnet")
    return jsonError(409, "fora_de_mainnet", "consolidação só corre em mainnet");

  // 1. AUTORIZAÇÃO — admin (Bearer admin-jwt)
  const denied = await guardAdmin(req);
  if (denied) return denied;

  // 2. EDIÇÃO
  const body     = await parseJsonBody(req).catch(() => null);
  const edicaoId = String(body?.edicaoId || "").trim();
  if (!edicaoId) return jsonError(400, "edicao_obrigatoria", "edicaoId obrigatório");

  // 3–10. Núcleo partilhado (idempotência, env, apuração, EIP-712, envio,
  // recibo, pontuação, marcação).
  const r = await consolidarEdicao(edicaoId);
  if (r.erro) return jsonError(r.status, r.erro.code, r.erro.message);
  return jsonResponse(r.corpo, r.status);
};
