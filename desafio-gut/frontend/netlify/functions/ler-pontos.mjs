// GET /.netlify/functions/ler-pontos — UTAC106f. Leitura dos pontos/palpites do TITULAR.
//
// PORQUE EXISTE: `public.pontos` e `public.palpites` têm RLS SÓ para `service_role` — o cliente
// anónimo (VITE_SUPABASE_ANON_KEY) NÃO as pode ler. A leitura do ecrã «Ofertas Programadas» tem
// de passar por aqui, com o Bearer do titular (o `endereco` sai do token, nunca do query).
//
// Header: Authorization: Bearer ***
//
// 200 { ok, pontos, pontosCartao, bonusPalpite, pontosParaCartao, podeResgatarCartao, historico, palpites }
//   ⚠️ R1 (UTAC106f): `pontos` é o TOTAL; `pontosCartao` é o que CONTA para o cartão (só compra/resgate).
//   UTAC110d (aditivo): + `fidelidade: {total, historico}` e `lance: {creditos, pontos, historico}` —
//   os dois ledgers SEPARADOS. Os campos acima ficam iguais (a UI actual consome-os).
//   UTAC110f-front (aditivo): + `missoesHoje: {dia, loginFeito, lanceFeito, pontosHoje}` — ou `null` se a leitura falhar.
// 401 token_ausente|token_invalido · 405 metodo_invalido · 503 sistema_pausado|store_indisponivel
//
// Padrão herdado POR LEITURA de `comprar-passe-pontos.mjs` (Bearer → endereco; erros snake_case).
// ⚠️ Este ficheiro NÃO escreve nada — é leitura pura do titular.
import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { sistemaPausado, lerEstadoSistema } from "./_lib/system-state.mjs";
import { lerPontos, lerPalpites, pontosDeCompra, PONTOS_POR_CARTAO } from "./_lib/passe-pontos.mjs";
import { missoesDoRegisto, indicacoesDoMes, PONTOS_LOGIN_DIARIO, PONTOS_MISSAO_LANCE } from "./_lib/fontes-lance.mjs";

// UTAC110f-front — as «Missões de hoje» da Carteira. FAIL-SOFT: se a leitura falhar, `missoesHoje: null` e o resto
// da resposta segue igual (as missões nunca derrubam os pontos). `pontosHoje` = só as missões do dia (R18-110f-front-B):
// 5 do login diário + 10 do 1.º lance — NÃO inclui a indicação nem outros créditos.
//
// ⚠️ UTAC110g (P-1/F4 do validador): deriva do registo **JÁ LIDO** (`lerPontos` faz `select("*")`, que
// traz `historico_lance`). Antes chamava `estadoMissoesHoje(endereco)`, que voltava a ler a MESMA linha
// de `pontos` (`lerLedgerLance`) — duas idas ao Supabase por pedido, em série, para a mesma linha.
function missoesDeHoje(registo) {
  try {
    const { dia, loginFeito, lanceFeito } = missoesDoRegisto(registo);
    const pontosHoje = (loginFeito ? PONTOS_LOGIN_DIARIO : 0) + (lanceFeito ? PONTOS_MISSAO_LANCE : 0);
    return { dia, loginFeito, lanceFeito, pontosHoje };
  } catch {
    return null;
  }
}

// UTAC110h.3 (P1/DEBT-028) — contador de indicações do mês para o painel «Indique e Ganhe».
// FAIL-SOFT (`null`): um erro aqui nunca derruba a leitura dos pontos.
function indicacoesDeMes(registo) {
  try {
    return indicacoesDoMes(registo);
  } catch {
    return null;
  }
}

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
  const historico = Array.isArray(registo?.historico) ? registo.historico : [];
  // ⚠️ R1 (UTAC106f, decisão do operador = opção A): o CARTÃO conta SÓ pontos de COMPRA.
  // `pontos` é o TOTAL (compra + bónus de palpite) e serve para mostrar o bónus; a BARRA e o LIMIAR
  // do cartão usam `pontosCartao`. Sem isto, 48 de compra + 2 de bónus = 50 desbloqueava o cartão.
  const pontosCartao = pontosDeCompra(registo);
  const missoesHoje = missoesDeHoje(registo);
  const indicacoesMes = indicacoesDeMes(registo);
  return jsonResponse({
    ok: true,
    pontos,
    pontosCartao,
    bonusPalpite: pontos - pontosCartao,
    pontosParaCartao: PONTOS_POR_CARTAO,
    podeResgatarCartao: pontosCartao >= PONTOS_POR_CARTAO,
    historico,
    // UTAC110d — os dois ledgers, lidos da MESMA linha (`lerPontos` faz `select("*")`).
    fidelidade: { total: pontos, historico },
    lance: {
      creditos: Number(registo?.creditos_lance ?? 0),
      pontos: Number(registo?.pontos_lance ?? 0),
      historico: Array.isArray(registo?.historico_lance) ? registo.historico_lance : [],
    },
    missoesHoje,
    // UTAC110h.3 (P1/DEBT-028) — contador do mês para o painel «Indique e Ganhe». ADITIVO: os campos
    // acima ficam iguais. FAIL-SOFT: `null` se a derivação falhar (nunca derruba os pontos).
    indicacoesMes,
    palpites: palpites.map((p) => ({
      edicaoId: p.edicao_id, valor: p.valor, criadoEm: p.criado_em,
      apurado: p.apurado === true, resultado: p.resultado ?? null,
    })),
  });
};
