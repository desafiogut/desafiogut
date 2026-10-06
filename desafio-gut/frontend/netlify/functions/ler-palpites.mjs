// GET /.netlify/functions/ler-palpites?edicaoId=<id> — UTAC107e.2 (Frente C). Palpites de UMA edição.
//
// PORQUE EXISTE: a tabela «Palpites — Edição <id>» das Ofertas Programadas não tinha fonte
// (`ler-pontos` só devolve os palpites do titular). `public.palpites` tem RLS só para `service_role`,
// logo a leitura passa por aqui, com o Bearer de um utilizador (user-session).
//
// Header: Authorization: Bearer ***   ·   Query: edicaoId
//
// 200 { ok, edicaoId, revelado, palpites:[{ endereco, data }] }            — edição a decorrer
// 200 { ok, edicaoId, revelado:true, palpites:[{ endereco, valor, data }] } — depois do fecho
// 400 edicaoId_invalido · 401 token_ausente|token_invalido · 404 edicao_inexistente
// 405 metodo_invalido · 503 sistema_pausado|store_indisponivel
//
// ⚠️ PRIVACIDADE — o valor só sai quando o `registar-palpite` JÁ RECUSA palpites novos: edição com
// `status` diferente de "aberto"/"agendado" (encerrado/apurado) ou já apurada (`edicaoApurada`).
// Medido: o `registar-palpite` aceita com `status === "aberto"` e NÃO olha o `termino_em` — por isso
// o relógio não decide aqui (revelar pelo prazo deixaria ver os valores enquanto ainda se palpita).
import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { sistemaPausado, lerEstadoSistema } from "./_lib/system-state.mjs";
import { buscarEdicao, EDICAO_ID_RE } from "./_lib/edicoes-core.mjs";
import { listarPalpitesDaEdicao, edicaoApurada } from "./_lib/passe-pontos.mjs";

const STATUS_EM_CURSO = new Set(["aberto", "agendado"]);

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
  if (req.method !== "GET") return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });

  if (sistemaPausado(await lerEstadoSistema())) {
    return jsonError(503, "sistema_pausado", "Sistema em manutenção. Tente novamente em breve.");
  }

  const t = await titular(req);
  if (t.erro) return jsonError(401, t.erro, "Authorization: Bearer *** válido obrigatório");

  const edicaoId = new URL(req.url).searchParams.get("edicaoId") || "";
  if (!EDICAO_ID_RE.test(edicaoId)) return jsonError(400, "edicaoId_invalido", "edicaoId inválido");

  let edicao, apurada, linhas;
  try {
    edicao = await buscarEdicao(edicaoId);
    if (!edicao) return jsonError(404, "edicao_inexistente", "edição não encontrada");
    apurada = await edicaoApurada(edicaoId);
    linhas = await listarPalpitesDaEdicao(edicaoId);
  } catch {
    return jsonError(503, "store_indisponivel", "não foi possível ler os palpites");
  }

  const revelado = apurada || !STATUS_EM_CURSO.has(edicao.status);
  const palpites = linhas.map((p) => (revelado
    ? { endereco: p.endereco, valor: p.valor, data: p.criado_em }
    : { endereco: p.endereco, data: p.criado_em }));
  return jsonResponse({ ok: true, edicaoId, revelado, palpites });
};
