// _lib/apuracao-especial.mjs — UTAC138 (Frente G). APURAÇÃO INSTANTÂNEA de uma edição ESPECIAL-*.
//
// Quando a especial termina (`agora > termino_em`, a MESMA fronteira da guarda de lances em
// `edicao-janela.mjs`), calcula-se OFF-CHAIN, a partir dos lances Key-Per-Bid (`getLances`):
//   - o vencedor = menor lance único (Artigo VIII) — o mesmo critério de `apurarMenorUnico`;
//   - o Top 10 = os 10 MENORES lances ÚNICOS, por ordem crescente de valor;
//   - métricas públicas (total de lances, participantes).
// O resultado grava-se UMA vez no Blob `edicoes-resultados` (chave = id da edição) e passa a ser servido
// tal qual: o frontend lê-o logo a seguir ao fim, sem esperar pela consolidação on-chain.
//
// Dois caminhos chegam aqui (R18-138, enunciado Frente G «às 20:00:00 ou no 1.º acesso depois»):
//   · o cron `scheduled-encerrar-especial.mjs` (a cada minuto) — ANTES de consolidar on-chain;
//   · o endpoint público `resultado-edicao.mjs` — se ninguém apurou ainda, apura no 1.º pedido.
//
// ⚠️ O vencedor AUTORITATIVO continua a ser o que a coordenação publica on-chain (`resultados(id)`,
//    escrito pelo `consolidarEdicao`). Os dois saem da MESMA função sobre os MESMOS lances; se a
//    leitura on-chain já tiver resultado, o frontend usa-a para o vencedor (ver useResultadoEspecial).
// ⚠️ Privacidade (R4/L): o resultado guarda e serve o endereço ENCURTADO (0x1234…abcd), nunca inteiro.
//    UTAC138-SEG4: o «nome de exibição» NÃO é escrito pelo participante — o CardLance envia o `userLabel`
//    do AppContext (google.name || google.email || email.address || …), logo para quem entra por e-mail é
//    o E-MAIL. Um nome com «@» não é publicado (cai para o endereço encurtado) — ver `nomePublico`.
// ⚠️ Margem de fecho: um lance aceite no último milissegundo pode ainda estar a ser escrito. O cron só
//    grava depois de MARGEM_FECHO_MS passados do fim; o endpoint também (antes disso responde «a apurar»).
//    UTAC138-SEG4: em mainnet o `lance-relampago` passa a guarda da janela e SÓ DEPOIS faz
//    `comprometerLanceOnchain` (`tx.wait(1)`, ~12 s, até ao limite da função) antes do `addLance`.
//    Os 3 s originais deixavam de fora um lance pago e aceite — e o resultado gravado é definitivo.

import { getStore } from "@netlify/blobs";
import { getLances } from "./data-store.mjs";
import { buscarEdicao } from "./edicoes-core.mjs";
import { EDICAO_ESPECIAL_RE, msDe } from "./edicao-janela.mjs";

export const STORE_RESULTADOS = "edicoes-resultados";
export const TOP_N = 10;
/** Folga depois do fim antes de gravar o resultado (um lance do último ms pode estar a meio).
 *  UTAC138-SEG4: era 3 s. Tem de ser ≥ à duração MÁXIMA de um pedido ao `lance-relampago` (a guarda da
 *  janela corre no início; a escrita do Key-Per-Bid vem depois do `tx.wait(1)` on-chain): o limite de
 *  execução de uma função síncrona da Netlify (≤ 60 s) + 5 s de folga para desvio de relógio. */
export const MARGEM_FECHO_MS = 65_000;
/** Quanto tempo o painel de resultados se mostra depois do fim (o frontend usa a mesma regra). */
export const JANELA_RESULTADO_MS = 24 * 60 * 60 * 1000;

const ENDERECO_RE = /^0x[0-9a-fA-F]{40}$/;

/** 0x1234…abcd — nunca o endereço inteiro (R4). Inválido → null. */
export function encurtarEndereco(e) {
  return typeof e === "string" && ENDERECO_RE.test(e) ? `${e.slice(0, 6)}…${e.slice(-4)}`.toLowerCase() : null;
}

const valorValido = (v) => Number.isSafeInteger(v) && v >= 1;

/** UTAC138-SEG4 — nome publicável no Top 10 público: texto aparado (≤ 80) e SEM «@» (um e-mail é dado
 *  pessoal — LGPD — e é o que o frontend envia como nomeExibicao a quem entra por e-mail). */
const nomePublico = (n) => {
  if (typeof n !== "string") return null;
  const t = n.trim().slice(0, 80);
  return t && !t.includes("@") ? t : null;
};

/**
 * PURO. Vencedor + Top N dos menores lances ÚNICOS + métricas, a partir da lista de lances.
 * Lances com valor inválido (null, 0, negativo, fracção, texto) ou sem endereço válido NÃO entram em
 * nada — nem contam para a unicidade (lição do MC93-A: `null` não pode ganhar).
 * @param {Array<{endereco?:string, valorCentavos?:unknown, nomeExibicao?:unknown}>} lances
 * @returns {{vencedor:object|null, top10:object[], totalLances:number, participantes:number, lancesUnicos:number}}
 */
export function calcularResultado(lances, topN = TOP_N) {
  const validos = (Array.isArray(lances) ? lances : [])
    .filter((l) => l && valorValido(l.valorCentavos) && typeof l.endereco === "string" && ENDERECO_RE.test(l.endereco));
  const contagem = new Map();
  for (const l of validos) contagem.set(l.valorCentavos, (contagem.get(l.valorCentavos) || 0) + 1);
  const unicos = validos
    .filter((l) => contagem.get(l.valorCentavos) === 1)
    .sort((a, b) => a.valorCentavos - b.valorCentavos);
  const top10 = unicos.slice(0, topN).map((l, i) => ({
    posicao: i + 1,
    endereco: encurtarEndereco(l.endereco),
    nome: nomePublico(l.nomeExibicao),
    valorCentavos: l.valorCentavos,
  }));
  return {
    vencedor: top10[0] ?? null,
    top10,
    totalLances: validos.length,
    participantes: new Set(validos.map((l) => l.endereco.toLowerCase())).size,
    lancesUnicos: unicos.length,
  };
}

function abrirStore() {
  try { return getStore({ name: STORE_RESULTADOS, consistency: "strong" }); }
  catch (err) {
    console.warn("[apuracao-especial] Blobs indisponível:", err?.message);
    return null;
  }
}

/**
 * Lê o resultado gravado; se ainda não existe e a edição já fechou (com a margem), apura e grava.
 * Nunca lança: erros viram `{ ok:false, code }`.
 *
 * @param {string} edicaoId
 * @param {{agoraMs?:number, store?:object|null, lerEdicao?:Function, lerLances?:Function}} [deps]
 * @returns {Promise<{ok:true, pronto:true, resultado:object, criado:boolean}
 *                 | {ok:true, pronto:false, motivo:"agendada"|"em_curso"|"a_apurar", termino_em:string}
 *                 | {ok:false, code:string}>}
 */
export async function apurarEspecial(edicaoId, {
  agoraMs = Date.now(), store, lerEdicao = buscarEdicao, lerLances = getLances,
} = {}) {
  if (typeof edicaoId !== "string" || !EDICAO_ESPECIAL_RE.test(edicaoId)) return { ok: false, code: "edicao_id_invalido" };
  const s = store === undefined ? abrirStore() : store;
  if (!s) return { ok: false, code: "store_indisponivel" };

  let meta;
  try { meta = await lerEdicao(edicaoId); } catch { return { ok: false, code: "store_indisponivel" }; }
  if (!meta) return { ok: false, code: "edicao_inexistente" };
  const inicio = msDe(meta.inicio_em);
  const fim = msDe(meta.termino_em);
  if (fim == null) return { ok: false, code: "edicao_sem_termino" };

  // 1) Já apurado? Serve-se tal qual (idempotente: o resultado não muda depois de gravado).
  try {
    const gravado = await s.get(edicaoId, { type: "json" });
    if (gravado && gravado.edicaoId === edicaoId) return { ok: true, pronto: true, resultado: gravado, criado: false };
  } catch { return { ok: false, code: "store_indisponivel" }; }

  // 2) Ainda não fechou (ou está dentro da margem de fecho).
  if (inicio != null && agoraMs < inicio) return { ok: true, pronto: false, motivo: "agendada", termino_em: meta.termino_em };
  if (agoraMs <= fim) return { ok: true, pronto: false, motivo: "em_curso", termino_em: meta.termino_em };
  if (agoraMs <= fim + MARGEM_FECHO_MS) return { ok: true, pronto: false, motivo: "a_apurar", termino_em: meta.termino_em };

  // 3) Apura e grava.
  let lances;
  try { lances = await lerLances(edicaoId); } catch { return { ok: false, code: "lances_indisponiveis" }; }
  if (!Array.isArray(lances)) return { ok: false, code: "lances_indisponiveis" };
  const resultado = {
    edicaoId,
    produto: typeof meta.produto === "string" ? meta.produto : null,
    inicio_em: meta.inicio_em ?? null,
    termino_em: meta.termino_em,
    ...calcularResultado(lances),
    apuradoEm: new Date(agoraMs).toISOString(),
    fonte: "off-chain (Key-Per-Bid)",
  };
  try { await s.setJSON(edicaoId, resultado); } catch { return { ok: false, code: "gravacao_falhou" }; }
  return { ok: true, pronto: true, resultado, criado: true };
}
