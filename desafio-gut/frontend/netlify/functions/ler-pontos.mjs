// GET /.netlify/functions/ler-pontos — UTAC106f. Leitura dos pontos/palpites do TITULAR.
//
// PORQUE EXISTE: `public.pontos` e `public.palpites` têm RLS SÓ para `service_role` — o cliente
// anónimo (VITE_SUPABASE_ANON_KEY) NÃO as pode ler. A leitura do ecrã «Ofertas Programadas» tem
// de passar por aqui, com o Bearer do titular (o `endereco` sai do token, nunca do query).
//
// Header: Authorization: Bearer ***
//
// 200 { ok, pontos, pontosParaCartao, podeResgatarCartao, historico, palpites }
// 401 token_ausente|token_invalido · 405 metodo_invalido · 503 sistema_pausado|store_indisponivel
//
// Padrão herdado POR LEITURA de `comprar-passe-pontos.mjs` (Bearer → endereco; erros snake_case).
// ⚠️ Este ficheiro NÃO escreve nada — é leitura pura do titular.
import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { sistemaPausado, lerEstadoSistema } from "./_lib/system-state.mjs";
import { lerPontos, lerPalpites, PONTOS_POR_CARTAO } from "./_lib/passe-pontos.mjs";

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

  let registo, palpites;
  try {
    registo = await lerPontos(t.endereco);
    palpites = await lerPalpites(t.endereco);
  } catch {
    return jsonError(503, "store_indisponivel", "não foi possível ler os pontos");
  }

  const pontos = Number(registo?.pontos ?? 0);
  return jsonResponse({
    ok: true,
    pontos,
    pontosParaCartao: PONTOS_POR_CARTAO,
    podeResgatarCartao: pontos >= PONTOS_POR_CARTAO,
    historico: Array.isArray(registo?.historico) ? registo.historico : [],
    palpites: palpites.map((p) => ({
      edicaoId: p.edicao_id, valor: p.valor, criadoEm: p.criado_em,
      apurado: p.apurado === true, resultado: p.resultado ?? null,
    })),
  });
};
