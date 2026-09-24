// GET /.netlify/functions/ranking?cicloId=R-1
//     → { cicloId, total, ranking:[{posicao, endereco, pontosTotais, acertosTotais, bonusEmitido}] }
//
// GET /.netlify/functions/ranking?recurso=feedback&cicloId=R-1&endereco=0x…
//     → { cicloId, endereco, pontosTotais, acertosTotais, posicao,
//         sequenciaAtual, faltamParaBonus, bonusEmitido, senhasACreditar }
//
// MC93-B. Read-only. O ciclo é a edição (decisão do operador, 2026-09-23).
//
// ⚠️ ANTI-IDOR no `feedback`: exige JWT user-session — mesmo padrão de
// `saldo-rs.mjs` e `saldo-senhas.mjs`. Sem ele, a posição e a atividade de
// qualquer carteira ficariam públicas a quem soubesse o endereço. O `ranking`
// é público de propósito (é um placar), mas devolve só o que um placar mostra.
//
// ⚠️ `senhasACreditar` é um DIREITO por liquidar, NÃO um saldo. Não entra em
// `saldoEfetivo` e não habilita lances — ver `_lib/pontuacao-store.mjs`.
//
// Resposta 400: ciclo_obrigatorio | endereco_invalido
// Resposta 401: sessao_invalida
// Resposta 405: metodo_nao_permitido

import {
  jsonResponse, jsonError, validarEndereco, ValidationError, validarOwnerOuAdmin,
} from "./_lib/validate.mjs";
import { lerRankingCiclo, lerFeedback } from "./_lib/pontuacao-store.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { getAdminAddresses } from "./_lib/admin-helpers.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "GET") {
    return jsonError(405, "metodo_nao_permitido", "use GET");
  }

  const rl = await aplicarRateLimit(req, "ranking", 30);
  if (rl) return rl;

  const url = new URL(req.url);
  const cicloId = String(url.searchParams.get("cicloId") || "").trim();
  if (!cicloId) return jsonError(400, "ciclo_obrigatorio", "cicloId obrigatório");

  if (url.searchParams.get("recurso") === "feedback") {
    let endereco;
    try {
      endereco = validarEndereco(url.searchParams.get("endereco") || "");
    } catch (err) {
      if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
      throw err;
    }

    // ⚠️ `verificarUserSession` recebe a STRING do token, não o Request — é
    // assim nos outros 18 chamadores (`saldo-rs.mjs`, `cotas.mjs`, …). A
    // primeira versão passava `req` e a função lançava `JWSInvalid` para
    // TODOS os chamadores, sem try/catch: 500 do runtime, fora do
    // `jsonResponse`, logo sem cabeçalhos CORS → "Failed to fetch" no APK.
    // O endpoint estava avariado a 100%. Achado da validação independente.
    const bearer = String(req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!bearer) return jsonError(401, "sessao_invalida", "sessão obrigatória");

    let sessao;
    try {
      sessao = await verificarUserSession(bearer);
    } catch {
      return jsonError(401, "sessao_invalida", "sessão inválida ou expirada");
    }
    if (!sessao) return jsonError(401, "sessao_invalida", "sessão obrigatória");

    // Ter sessão NÃO chega: tem de ser a sessão do dono (ou de um admin).
    // Sem esta comparação, qualquer utilizador autenticado lia a posição e a
    // atividade de qualquer carteira cujo endereço conhecesse — que é público
    // na blockchain. Mesmo guarda de `saldo-rs.mjs:51` e `saldo-senhas.mjs`.
    const admins = await getAdminAddresses();
    const guard = validarOwnerOuAdmin(sessao, endereco, admins);
    if (!guard.ok) {
      return jsonError(403, "acesso_negado",
        "token não pertence ao endereço solicitado e não é admin");
    }

    return jsonResponse(await lerFeedback(cicloId, endereco));
  }

  const ranking = await lerRankingCiclo(cicloId);
  return jsonResponse({ cicloId, total: ranking.length, ranking });
};
