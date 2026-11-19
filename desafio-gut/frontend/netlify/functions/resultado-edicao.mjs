// GET /.netlify/functions/resultado-edicao?edicaoId=ESPECIAL-X — UTAC138 (Frente G/D).
//
// Resultado público de uma edição especial: vencedor + Top 10 dos menores lances únicos + métricas.
// Sem auth (dados públicos depois do fim; endereços sempre ENCURTADOS — R4).
// Se a edição já fechou e ninguém apurou ainda, apura AGORA («1.º acesso depois do fim»).
//
// 200 { pronto:true, edicaoId, vencedor, top10, totalLances, participantes, lancesUnicos, apuradoEm, termino_em }
// 200 { pronto:false, motivo:"agendada"|"em_curso"|"a_apurar", termino_em }
// 400 edicao_id_invalido · 404 edicao_inexistente · 405 metodo_invalido · 503 store_indisponivel|...
//
// UTAC140 (Frente D, R18-140-D: sobre a apuração que JÁ existe, não numa RPC SQL nova):
//   · ramo PÚBLICO: Top 10 COM valores, como no UTAC138 — R18-140-G (operador: «o top 10 precisa ser visível
//     para usuários da v12»). A v12 pede SEM token e só desenha linhas com valor; o servidor não pode saber
//     quem tem Passe, logo a restrição só existe na tabela de Meus Ativos (abaixo), não é um segredo.
//   · `?acao=completo` + Bearer user-session: Top 10 COM valores + vencedor, só a quem tem Passe
//     (Relâmpago ou Programado no inventário) e só até `termino_em` + 24 h.
//       401 token_ausente|token_invalido · 403 acesso_restrito_passe · 410 janela_expirada
//       503 inventario_indisponivel

import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { apurarEspecial, JANELA_RESULTADO_MS } from "./_lib/apuracao-especial.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs"; // UTAC140
import { lerInventario } from "./_lib/passes-inventario.mjs"; // UTAC140
import { buscarEdicao } from "./_lib/edicoes-core.mjs"; // UTAC140b
import { configDaEspecial } from "./_lib/especial-config.mjs"; // UTAC140b — regras do Top 10 na própria edição

const RL_GET_RPM = 30;
const STATUS = { edicao_id_invalido: 400, edicao_inexistente: 404, edicao_sem_termino: 409 };

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "GET") return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });

  const rl = await aplicarRateLimit(req, "resultado-edicao-get", RL_GET_RPM);
  if (rl) return rl;

  const url = new URL(req.url);
  const edicaoId = url.searchParams.get("edicaoId") || "";
  const completo = url.searchParams.get("acao") === "completo"; // UTAC140 (Frente D)

  // UTAC140 — o pedido completo exige sessão ANTES de qualquer leitura (o endereço sai SÓ do token).
  let titular = null;
  if (completo) {
    const h = req.headers.get("authorization") || "";
    const bearer = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!bearer) return jsonError(401, "token_ausente", "Authorization: Bearer obrigatório");
    try {
      const p = await verificarUserSession(bearer);
      titular = typeof p?.endereco === "string" && /^0x[0-9a-fA-F]{40}$/.test(p.endereco) ? p.endereco.toLowerCase() : null;
    } catch { titular = null; }
    if (!titular) return jsonError(401, "token_invalido", "sessão inválida");
  }

  const r = await apurarEspecial(edicaoId);
  if (!r.ok) return jsonError(STATUS[r.code] ?? 503, r.code, "resultado indisponível");
  if (!r.pronto) return jsonResponse({ pronto: false, edicaoId, motivo: r.motivo, termino_em: r.termino_em });

  const { resultado } = r;
  const comum = {
    pronto: true,
    edicaoId: resultado.edicaoId,
    produto: resultado.produto,
    termino_em: resultado.termino_em,
    vencedor: resultado.vencedor,
    totalLances: resultado.totalLances,
    participantes: resultado.participantes,
    lancesUnicos: resultado.lancesUnicos,
    apuradoEm: resultado.apuradoEm,
  };

  // UTAC140b — as regras vêm da PRÓPRIA edição (Blob `edicoes-metadata`: `top10.publico`, `top10.janelaHoras`,
  // `top10.exigePasse`); ausentes/ilegíveis ⇒ as do UTAC140 (público com valores · 24 h · exige Passe).
  let meta = null;
  try { meta = await buscarEdicao(edicaoId); } catch { meta = null; }
  const regras = configDaEspecial(meta).top10;

  if (!completo) {
    // UTAC140 / R18-140-G — público com os valores (a v12 não desenha linhas sem valor). Forma do UTAC138.
    // Com `top10.publico: false` na edição, sai sem valores (só posição + endereço encurtado + nome).
    if (regras.publico) return jsonResponse({ ...comum, top10: resultado.top10 });
    const top10 = (resultado.top10 || []).map(({ posicao, endereco, nome }) => ({ posicao, endereco, nome }));
    return jsonResponse({ ...comum, top10, valoresRestritos: true });
  }

  // UTAC140 — janela depois do fim (omissão 24 h = JANELA_RESULTADO_MS; configurável por edição).
  const fim = Date.parse(resultado.termino_em);
  const janelaMs = regras.janelaHoras * 3_600_000 || JANELA_RESULTADO_MS;
  if (!Number.isFinite(fim) || Date.now() > fim + janelaMs) {
    return jsonError(410, "janela_expirada", `a tabela completa só fica disponível ${regras.janelaHoras} h depois da apuração`);
  }
  if (regras.exigePasse) {
    const inv = await lerInventario(titular);
    if (!inv?.ok) return jsonError(503, "inventario_indisponivel", "não foi possível ler os seus Passes");
    if (!(Number(inv.passesRelampago) > 0 || Number(inv.passesProgramado) > 0)) {
      return jsonError(403, "acesso_restrito_passe", "Acesso restrito a portadores de Passe");
    }
  }
  return jsonResponse({ ...comum, top10: resultado.top10, valoresRestritos: false });
};
