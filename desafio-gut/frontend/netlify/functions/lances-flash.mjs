// GET /.netlify/functions/lances-flash?edicaoId=R-1
// Retorna array de lances flash do blob lances-relampago:{edicaoId}.
// Campo repetido é computado server-side com base na contagem de valores.
// Sem auth — dados visíveis a todos os participantes.
//
// UTAC107e.2 — revelação após o fecho + estado do próprio lance:
//   • mainnet, edição CONSOLIDADA (marcador `bid:{id}:consolidado`, R18-A): os valores reais
//     saem do Key-Per-Bid (`getLances`) com `valor` e `repetido` — `encerrado: true`.
//     Por consolidar: o ramo blindado de sempre (`valor:null`) — `encerrado: false`.
//   • `?acao=meu-estado` (Bearer user-session, R18-C): o estado do lance do TITULAR — só depois
//     do fecho; antes devolve `estado: null` sem ler nenhum valor. O endereço sai SÓ do token.
//   • `?acao=verificar` (anti-bot MC28.1) NÃO mudou: continua 403 em mainnet.

import { getStore } from "@netlify/blobs";
import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { estaConsolidado } from "./_lib/bids-store.mjs";
import { getLances } from "./_lib/data-store.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { buscarEdicao } from "./_lib/edicoes-core.mjs";
import { verificarJanelaLance } from "./_lib/edicao-janela.mjs";

const BLOB_LANCES   = "lances-relampago";
const EDICAO_PADRAO = "R-1";

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[lances-flash] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

const minusculas = (e) => String(e ?? "").toLowerCase();

/**
 * UTAC107e.2 (achado A1 do validador) — «consolidado» NÃO garante «encerrado»: nada impede consolidar
 * uma edição que ainda aceita lances, e o R-1 sintetizado não tem janela. Por isso só se revela com o
 * marcador E com a edição FECHADA pelo MESMO critério que faz o `lance-relampago` recusar lances
 * (`verificarJanelaLance` → `edicao_encerrada`). Sem metadata (ex.: R-1 sintetizado) ⇒ nunca revela.
 */
async function edicaoFechada(edicaoId) {
  let meta = null;
  try { meta = await buscarEdicao(edicaoId); } catch { meta = null; }
  return Boolean(meta) && verificarJanelaLance(meta)?.code === "edicao_encerrada";
}

// UTAC107e.2 (achado A2) — a lista revelada é imutável (marcador + edição fechada ⇒ já não entram
// lances): guarda-se por instância para não reler o Key-Per-Bid inteiro a cada poll anónimo.
// ⚠️ 2.ª ronda (R1): com PRAZO — a exclusão de conta (MC104.3) anonimiza os lances das edições
// consolidadas; uma cache sem fim continuaria a servir o endereço real numa instância quente.
export const TTL_REVELADOS_MS = 60_000;
const REVELADOS = new Map();
export function _limparCacheRevelados() { REVELADOS.clear(); }
const valorValido = (v) => Number.isSafeInteger(v) && v >= 1;

/**
 * UTAC107e.2 (R18-B) — quem foi menor lance único EM ALGUM MOMENTO da edição.
 * Reproduz os lances por ordem de chegada (`processadoEm`; empate pela chave) e, depois de cada
 * um, regista o dono do menor valor que aparece exactamente uma vez. Corre só no fecho: durante
 * a edição nada é guardado nem exposto. Lances sem valor válido não entram (não podem liderar).
 * @returns {Set<string>} endereços em minúsculas
 */
export function reconstruirLideranca(lances) {
  const instante = (l) => {
    const t = Date.parse(l?.processadoEm);
    return Number.isFinite(t) ? t : Infinity;
  };
  const ordenados = (Array.isArray(lances) ? lances : [])
    .filter((l) => valorValido(l?.valorCentavos) && typeof l?.endereco === "string")
    .sort((a, b) => (instante(a) - instante(b))
      || String(a.key ?? a.lanceId ?? "").localeCompare(String(b.key ?? b.lanceId ?? "")));

  const contagem = new Map();
  const dono = new Map();
  const lideres = new Set();
  for (const l of ordenados) {
    const v = l.valorCentavos;
    contagem.set(v, (contagem.get(v) || 0) + 1);
    if (contagem.get(v) === 1) dono.set(v, minusculas(l.endereco));
    let menor = Infinity;
    for (const [valor, n] of contagem) if (n === 1 && valor < menor) menor = valor;
    if (menor !== Infinity) lideres.add(dono.get(menor));
  }
  return lideres;
}

/**
 * UTAC107e.2 — estado da etiqueta do TITULAR numa edição já consolidada.
 * `eLiderFinal` vem do vencedor OFICIAL (marcador de consolidação), não de uma reapuração.
 * @returns {{temLance:boolean, eLiderFinal:boolean, foiLiderAlgumaVez:boolean,
 *            estado:"menor"|"deixou_de_ser"|"nao_menor"|null}}
 */
export function estadoDoTitular({ lances, endereco, vencedorOficial }) {
  const e = minusculas(endereco);
  const lista = Array.isArray(lances) ? lances : [];
  if (!e || !lista.some((l) => minusculas(l?.endereco) === e)) {
    return { temLance: false, eLiderFinal: false, foiLiderAlgumaVez: false, estado: null };
  }
  const eLiderFinal = minusculas(vencedorOficial) === e;
  const foiLiderAlgumaVez = eLiderFinal || reconstruirLideranca(lista).has(e);
  const estado = eLiderFinal ? "menor" : foiLiderAlgumaVez ? "deixou_de_ser" : "nao_menor";
  return { temLance: true, eLiderFinal, foiLiderAlgumaVez, estado };
}

async function titular(req) {
  const h = req.headers.get("authorization") || "";
  const bearer = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!bearer) return { erro: "token_ausente" };
  try {
    const p = await verificarUserSession(bearer);
    const e = minusculas(p?.endereco);
    return /^0x[0-9a-f]{40}$/.test(e) ? { endereco: e } : { erro: "token_invalido" };
  } catch { return { erro: "token_invalido" }; }
}

export default async (req) => {
  // MC88.12 — preflight CORS do APK. Tem de ser a primeira coisa: o OPTIONS não
  // leva corpo nem Authorization, logo qualquer validação a montante responderia
  // 4xx e o browser abortaria a chamada real.
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET");
  }

  const url      = new URL(req.url);
  const edicaoId = url.searchParams.get("edicaoId") || EDICAO_PADRAO;
  const acao     = url.searchParams.get("acao");

  // ── Verificação de unicidade por valor ──────────────────────────────────
  if (acao === "verificar") {
    // MC28.1 R9: em mainnet a unicidade fica oculta durante o leilão (anti-bot).
    if (process.env.NETWORK_STAGE === "mainnet") {
      return jsonError(403, "verificacao_indisponivel",
        "verificação de unicidade fica blindada durante o leilão na mainnet");
    }
    const valorRaw = url.searchParams.get("valor");
    if (valorRaw == null || valorRaw === "") {
      return jsonError(400, "valor_ausente", "query param 'valor' obrigatório para verificar");
    }
    const valor = parseFloat(valorRaw);
    if (!Number.isFinite(valor)) {
      return jsonError(400, "valor_invalido", "query param 'valor' deve ser número");
    }

    const store = abrirStore(BLOB_LANCES);
    if (!store) return jsonResponse({ edicaoId, valor, count: 0, unico: false });

    let rawLances = [];
    try {
      const blob = await store.get(edicaoId, { type: "json" });
      rawLances = blob?.lances ?? [];
    } catch (err) {
      console.warn("[lances-flash] verificar blob falhou:", err?.message);
      return jsonResponse({ edicaoId, valor, count: 0, unico: false });
    }

    const count = rawLances.filter((l) => l.valorCentavos === valor).length;
    return jsonResponse({ edicaoId, valor, count, unico: count === 1 });
  }

  // ── UTAC107e.2 (R18-C) — estado do lance do TITULAR, só depois do fecho ──
  if (acao === "meu-estado") {
    const t = await titular(req);
    if (t.erro) return jsonError(401, t.erro, "Authorization: Bearer *** válido obrigatório");

    let marcador;
    try { marcador = await estaConsolidado(edicaoId); }
    catch { return jsonError(503, "store_indisponivel", "não foi possível ler o estado da edição"); }
    // Por consolidar, ou consolidada mas ainda aberta ⇒ nada se calcula nem se revela (anti-bot MC28.1).
    if (!marcador || !(await edicaoFechada(edicaoId))) {
      return jsonResponse({ edicaoId, encerrado: false, estado: null });
    }

    let lances;
    try { lances = await getLances(edicaoId); }
    catch { return jsonError(503, "store_indisponivel", "não foi possível ler os lances"); }
    return jsonResponse({
      edicaoId, encerrado: true,
      ...estadoDoTitular({ lances, endereco: t.endereco, vencedorOficial: marcador.vencedor }),
    });
  }

  const MAINNET = process.env.NETWORK_STAGE === "mainnet";

  // ── UTAC107e.2 (R18-A) — mainnet, edição consolidada ⇒ revela os valores ──
  // Os lances reais vivem no Key-Per-Bid (o blob legado está vazio em mainnet).
  // Falha a ler o marcador ⇒ trata-se como por consolidar (nunca revela por engano).
  if (MAINNET) {
    let marcador = null;
    try { marcador = await estaConsolidado(edicaoId); }
    catch (err) { console.warn("[lances-flash] marcador de consolidação ilegível:", err?.message); }
    const guardada = REVELADOS.get(edicaoId);
    if (guardada && Date.now() - guardada.em < TTL_REVELADOS_MS) {
      return jsonResponse({ edicaoId, encerrado: true, ocultoAteConsolidar: false, lances: guardada.lances });
    }
    if (marcador && await edicaoFechada(edicaoId)) {
      let reais;
      try { reais = await getLances(edicaoId); }
      catch { return jsonError(503, "store_indisponivel", "não foi possível ler os lances"); }
      const contagem = {};
      for (const l of reais) contagem[l.valorCentavos] = (contagem[l.valorCentavos] || 0) + 1;
      const lances = reais.map((l) => ({
        lanceId:      l.lanceId,
        endereco:     l.endereco,
        valor:        l.valorCentavos,
        nomeExibicao: l.nomeExibicao ?? null,
        txHash:       l.lanceId,
        repetido:     (contagem[l.valorCentavos] || 0) > 1,
      }));
      REVELADOS.set(edicaoId, { lances, em: Date.now() });
      return jsonResponse({ edicaoId, encerrado: true, ocultoAteConsolidar: false, lances });
    }
  }

  const store = abrirStore(BLOB_LANCES);
  if (!store) {
    return jsonResponse({ edicaoId, lances: [] });
  }

  let rawLances = [];
  try {
    const blob = await store.get(edicaoId, { type: "json" });
    rawLances  = blob?.lances ?? [];
  } catch (err) {
    console.warn("[lances-flash] leitura blob falhou:", err?.message);
    return jsonResponse({ edicaoId, lances: [] });
  }

  // ── MC28.1 R9: em mainnet, o valor NUNCA sai em claro no corpo HTTP (G-2).
  // Devolvem-se só participações blindadas (oculto:true) — sem valor nem
  // unicidade — até à consolidação. Em Sepolia/localhost: comportamento legado.
  if (MAINNET) {
    const lances = rawLances.map((l) => ({
      lanceId:        l.lanceId,
      endereco:       l.endereco,
      valor:          null,            // blindado — não revelar durante o leilão
      oculto:         true,
      commitmentHash: l.commitmentHash ?? null,
      nomeExibicao:   l.nomeExibicao ?? null,
      txHash:         l.lanceId,
      repetido:       null,            // não vazar unicidade ao bot
    }));
    return jsonResponse({ edicaoId, encerrado: false, ocultoAteConsolidar: true, lances });
  }

  // Computa repetido: valores com count > 1 são repetidos
  const valorCounts = {};
  for (const l of rawLances) {
    valorCounts[l.valorCentavos] = (valorCounts[l.valorCentavos] || 0) + 1;
  }

  const lances = rawLances.map((l) => ({
    lanceId:      l.lanceId,
    endereco:     l.endereco,
    valor:        l.valorCentavos,
    nomeExibicao: l.nomeExibicao ?? null,
    txHash:       l.lanceId,
    repetido:     (valorCounts[l.valorCentavos] || 0) > 1,
  }));

  return jsonResponse({ edicaoId, lances });
};
