// GET /.netlify/functions/admin-logs                             [ADMIN]
//
// MC89.11 (Fase 2). Auditoria: quem fez o quê, quando e porquê.
//
// Gate: nível ≥ admin. Super-admin vê tudo; admin vê as suas próprias ações
// e as de operadores; operador NÃO vê logs de ninguém (403).
//
// ⚠️ SEM CACHE. Logs são atualizados em tempo real e um cache esconderia a
// ação que o admin acabou de executar.

import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { autenticarAdmin } from "./_lib/admin-auth.mjs";
import { getAdminNivel, adminPode } from "./_lib/admin-niveis.mjs";
import { lerLogs } from "./_lib/admin-log.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

const ORDEM_NIVEIS = { "super-admin": 3, "admin": 2, "operador": 1 };
const NIVEL_MINIMO = "admin";

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });
  }

  const rl = await aplicarRateLimit(req, "admin-logs", 20);
  if (rl) return rl;

  // Autenticação com nível
  const auth = await autenticarAdmin(req);
  if (!auth.ok) {
    let status = 401;
    if (auth.code === "admin_removido") status = 403;
    return jsonError(status, auth.code, auth.message);
  }

  const endereco = auth.endereco;
  const nivel = auth.payload?.nivel || await getAdminNivel(endereco) || "admin";

  if (!adminPode(nivel, NIVEL_MINIMO)) {
    return jsonError(403, "nivel_insuficiente",
      `Este endpoint exige nível "${NIVEL_MINIMO}" ou superior. O teu nível é "${nivel}".`);
  }

  const url = new URL(req.url);
  const opts = {
    admin:     url.searchParams.get("admin")     || undefined,
    tipo_acao: url.searchParams.get("tipo_acao") || undefined,
    desde:     url.searchParams.get("desde")     || undefined,
    ate:       url.searchParams.get("ate")       || undefined,
    q:         url.searchParams.get("q")         || undefined,
    antes:     url.searchParams.get("antes")     || undefined,
    limite:    parseInt(url.searchParams.get("limite"), 10) || 30,
  };

  // Filtro por nível: super-admin vê tudo; admin vê os seus e os de
  // operadores; operador já foi recusado acima.
  const nivelNum = ORDEM_NIVEIS[nivel] || 0;
  if (nivelNum < 3 && !opts.admin) {
    // Um admin que não filtrar por endereço específico só vê ações de
    // utilizadores com nível ≤ ao seu. Na prática: admin vê os seus e os de
    // operador. Isto é um filtro APLICACIONAL (não de SQL — a consulta
    // traria tudo), porque a tabela não é lida pelo browser e o RLS é
    // service_role. O filtro é aplicado DEPOIS da consulta como defesa em
    // profundidade.
    opts._nivelFiltro = nivel;
  }

  // Consulta sem o filtro de nível do Postgres — o filtro é aplicacional.
  const resultado = await lerLogs(opts);

  // Aplica filtro de nível pós-consulta (defesa em profundidade)
  let linhas = resultado.linhas;
  if (opts._nivelFiltro) {
    linhas = linhas.filter((l) => {
      if (l.admin_endereco === endereco) return true; // as suas próprias
      const n = ORDEM_NIVEIS[l.admin_nivel] || 0;
      return n <= (ORDEM_NIVEIS[opts._nivelFiltro] || 0);
    });
  }

  return jsonResponse({
    linhas,
    total: resultado.total,
    proximoCursor: resultado.proximoCursor,
    filtrado: !!opts._nivelFiltro,
  });
};
