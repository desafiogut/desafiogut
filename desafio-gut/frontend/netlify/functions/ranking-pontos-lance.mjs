// GET /.netlify/functions/ranking-pontos-lance?limite=50
//     → { total, limite, ranking: [{ posicao, endereco, pontos }] }
//
// UTAC110n (R18-110j.4b-7) — placar dos PONTOS DE LANCE (Art. 16º), ordenado pelo SALDO ACTUAL de
// `public.pontos.pontos_lance` (o mesmo contador que o lance DEBITA). Read-only e público, como o
// `/ranking` do ciclo: é um placar, não um extracto.
//
// ⚠️ ENDEREÇOS MASCARADOS (`0x1234…abcd`, o mesmo formato de `mascararEndereco`). O `/ranking` actual
// DEVOLVE O ENDEREÇO INTEIRO — a decisão do operador («mascarados, como o /ranking actual») assenta
// numa premissa que a medição NÃO confirmou; aqui aplica-se o mascaramento, que é o que a decisão pede.
//
// ⚠️ O ranking é por SALDO, não por «ganhos totais»: quem gasta pontos num lance desce no placar. É a
// decisão do operador (R18-110j.4b-7: «saldo actual»), e é coerente com o painel pessoal de Meus
// Ativos, que mostra o saldo — não o acumulado.
//
// Resposta 200: { total, limite, ranking }
// Resposta 400: limite_invalido
// Resposta 405: metodo_nao_permitido
// Resposta 502: leitura_falhou   (Supabase indisponível/erro — nunca um placar inventado)
//
// Sem dependência de sessão: não devolve nada que identifique uma carteira.

import { jsonResponse, jsonError, mascararEndereco } from "./_lib/validate.mjs";
import { getSupabase } from "./_lib/supabase-client.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

const LIMITE_PADRAO = 50;
const LIMITE_MAX    = 200;
const TABELA        = "pontos";

/**
 * Ordena e posiciona (1-2-2-4) por saldo de pontos de lance. PURA — testável sem rede.
 * Desempate: endereço (determinismo; o placar não pode mudar de ordem por causa da ordem de chegada).
 * @param {Array<{endereco:string, pontos_lance:number}>} linhas
 * @returns {Array<{posicao:number, endereco:string, pontos:number}>}
 */
export function ordenarPorPontosLance(linhas) {
  const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const lista = (Array.isArray(linhas) ? [...linhas] : []).sort((a, b) =>
    (num(b?.pontos_lance) - num(a?.pontos_lance))
    || String(a?.endereco ?? "").localeCompare(String(b?.endereco ?? "")));

  let posicao = 0;
  let ordem = 0;
  let anterior = null;
  return lista.map((l) => {
    ordem += 1;
    const pontos = num(l?.pontos_lance);
    if (pontos !== anterior) { posicao = ordem; anterior = pontos; }
    return { posicao, endereco: mascararEndereco(l?.endereco), pontos };
  });
}

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "GET") return jsonError(405, "metodo_nao_permitido", "use GET", { allowed: ["GET"] });

  const rl = await aplicarRateLimit(req, "ranking-pontos-lance", 30);
  if (rl) return rl;

  const bruto = new URL(req.url).searchParams.get("limite");
  let limite = LIMITE_PADRAO;
  if (bruto !== null && bruto !== "") {
    const n = Number(bruto);
    if (!Number.isInteger(n) || n < 1 || n > LIMITE_MAX) {
      return jsonError(400, "limite_invalido", `limite deve ser inteiro entre 1 e ${LIMITE_MAX}`);
    }
    limite = n;
  }

  let data, error;
  try {
    ({ data, error } = await getSupabase().from(TABELA)
      .select("endereco,pontos_lance")
      .gt("pontos_lance", 0)                       // quem tem 0 não é «lugar», é ausência
      .order("pontos_lance", { ascending: false })
      .order("endereco", { ascending: true })
      .limit(limite));
  } catch {
    return jsonError(502, "leitura_falhou", "não foi possível ler o placar");
  }
  if (error) return jsonError(502, "leitura_falhou", "não foi possível ler o placar");

  const ranking = ordenarPorPontosLance(Array.isArray(data) ? data : []);
  return jsonResponse({ total: ranking.length, limite, ranking });
};
