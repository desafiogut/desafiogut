// POST /.netlify/functions/admin-commands                        [ADMIN]
//
// MC89.12 (Fase 3). Execução de comandos operacionais com registo de
// auditoria fail-CLOSED. Todas as dependências são importadas sob demanda
// para não pesar o cold start de quem não usa comandos.
//
// Gate: admin ou superior. Rate-limit: 5/min.
//
// ⚠️ CADA COMANDO ESCREVE EM admin_logs ANTES DE EXECUTAR. Se o registo
// falhar, o comando NÃO é executado (503). Ver D5b do MC89.5.

import { jsonResponse, jsonError, parseJsonBody, ValidationError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { autenticarAdmin } from "./_lib/admin-auth.mjs";
import { adminPode } from "./_lib/admin-niveis.mjs";
import { registrarAcao } from "./_lib/admin-log.mjs";
import { executarComando } from "./_lib/admin-comandos.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  }

  const rl = await aplicarRateLimit(req, "admin-commands", 5);
  if (rl) return rl;

  // Autenticação com nível (admin ou superior)
  const auth = await autenticarAdmin(req);
  if (!auth.ok) {
    let status = 401;
    if (auth.code === "admin_token_nao_configurado") status = 503;
    else if (auth.code === "admin_removido") status = 403;
    return jsonError(status, auth.code, auth.message);
  }

  const endereco = auth.endereco;
  const nivel = auth.payload?.nivel || "admin";
  if (!adminPode(nivel, "admin")) {
    return jsonError(403, "nivel_insuficiente",
      `Este endpoint exige nível "admin" ou superior. O teu nível é "${nivel}".`);
  }

  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com acao");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  const { acao, justificativa } = body;
  if (!acao || typeof acao !== "string") {
    return jsonError(400, "acao_obrigatoria", "campo 'acao' obrigatório");
  }

  // panic/unpause exigem super-admin
  if ((acao === "panic" || acao === "unpause") && !adminPode(nivel, "super-admin")) {
    return jsonError(403, "nivel_insuficiente",
      `A ação "${acao}" exige nível super-admin. O teu nível é "${nivel}".`);
  }

  // ⚠️ O registo de auditoria é feito DENTRO de executarComando (fail-CLOSED).
  // Passamos uma fábrica de log para que o _lib não precise de importar o
  // módulo de log estaticamente.
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-nf-client-connection-ip") || null;

  try {
    const resultado = await executarComando(acao, {
      registrarLog: (args) => registrarAcao({
        ...args,
        admin_nivel: nivel,
        ip,
        user_agent: req.headers.get("user-agent") || null,
      }),
      sb: null,        // o _lib faz import dinâmico quando precisa
      env: process.env,
      fetch: globalThis.fetch.bind(globalThis),
      endereco,
    });

    return jsonResponse({
      ok: resultado.ok,
      mensagem: resultado.mensagem,
      acao,
    });
  } catch (err) {
    // Isto só acontece se registrarAcao LANÇAR (fail-CLOSED). A ação NÃO foi
    // executada porque o registo não pôde ser escrito.
    console.error("[admin-commands] registo fail-closed:", err?.message);
    return jsonError(503, "log_indisponivel",
      "Não foi possível registar o comando no log de auditoria. O comando NÃO foi executado. Tente novamente.");
  }
};
