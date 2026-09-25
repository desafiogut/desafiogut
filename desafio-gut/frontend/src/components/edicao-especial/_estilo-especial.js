// _estilo-especial.js — MC94.2. Paleta e lógica PURA da edição especial.
//
// A paleta não é nova: re-exporta a de `meus-ativos/_estilo.js` (MC94), que por
// sua vez reproduz a do Dashboard. O card especial vive na mesma tela e tem de
// parecer parte dela.
//
// ⚠️ EXCEPÇÃO DECLARADA À FONTE ÚNICA DO MC88.43 (`utils/edicao.js`).
// Com a trava `EM_BREVE_MODE = true`, `getEstadoEdicao` devolve "em breve" para
// TODAS as edições — e o operador pediu para esta, e só para esta, um cronómetro
// vivo e um formulário de lance às 20:00. Perguntar à fonte única apagaria o
// pedido. Por isso a especial tem os SEUS quatro estados, aqui, numa função pura,
// e o card da R-1 ao lado continua a dizer "EM BREVE". Não se importa
// `EM_BREVE_MODE` (a guarda estrutural do MC88.43 continua a valer).

export { COR, T_PADRAO, caixa, encurtar, reais, inteiroSeguro } from "../meus-ativos/_estilo.js";

/** Os quatro estados visuais (HARD GATE 4 do MC94.2). */
export const ESTADO_ESPECIAL = Object.freeze({
  AGENDADA:  "agendada",
  A_ABRIR:   "a_abrir",
  ACTIVA:    "activa",
  ENCERRADA: "encerrada",
});

/** Quanto antes da abertura o card passa a "abrindo". */
export const JANELA_A_ABRIR_MS = 60_000;

/** Endereço nulo: `resultados()` devolve-o quando não houve lance único. */
export const ENDERECO_ZERO = "0x0000000000000000000000000000000000000000";

const ESPECIAL_RE = /^ESPECIAL-[A-Z0-9]+$/;

/**
 * É uma edição especial? Prefixo exacto, não "contém" — o mesmo regex do backend
 * (`_lib/edicao-janela.mjs`).
 * @param {unknown} id
 * @returns {boolean}
 */
export function ehEspecial(id) {
  return typeof id === "string" && ESPECIAL_RE.test(id);
}

function msDe(iso) {
  if (typeof iso !== "string" || !iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Estado visual da especial num instante do relógio do SERVIDOR.
 *
 * Ordem: encerrada pelo admin → depois do fim → dentro da janela → último minuto
 * → agendada. As duas pontas da janela contam como "activa", tal como o backend
 * aceita lances nelas (`verificarJanelaLance`: `<` no início, `>` no fim).
 *
 * @param {{inicio_em?:string, termino_em?:string, status?:string}|null} edicao
 * @param {number} agoraMs
 * @returns {"agendada"|"a_abrir"|"activa"|"encerrada"|null} null se não houver
 *   datas legíveis — não se inventa um estado.
 */
export function estadoEspecial(edicao, agoraMs) {
  if (!edicao || !Number.isFinite(agoraMs)) return null;
  const inicio = msDe(edicao.inicio_em);
  const termino = msDe(edicao.termino_em);
  if (inicio == null || termino == null) return null;
  if (edicao.status === "encerrado" || edicao.status === "apurado") return ESTADO_ESPECIAL.ENCERRADA;
  if (agoraMs > termino) return ESTADO_ESPECIAL.ENCERRADA;
  if (agoraMs >= inicio) return ESTADO_ESPECIAL.ACTIVA;
  if (agoraMs >= inicio - JANELA_A_ABRIR_MS) return ESTADO_ESPECIAL.A_ABRIR;
  return ESTADO_ESPECIAL.AGENDADA;
}

/**
 * Até onde conta o cronómetro: a abertura antes das 20:00, o fim depois.
 * @returns {number|null} ms, ou null quando não há contagem (encerrada)
 */
export function alvoDaContagem(edicao, estado) {
  if (estado === ESTADO_ESPECIAL.AGENDADA || estado === ESTADO_ESPECIAL.A_ABRIR) return msDe(edicao?.inicio_em);
  if (estado === ESTADO_ESPECIAL.ACTIVA) return msDe(edicao?.termino_em);
  return null;
}

/**
 * ms → { dias, horas, minutos, segundos }.
 * Arredonda os segundos para CIMA: com 400 ms por correr mostra 00:00:01, não
 * 00:00:00 — um zero antes da hora faria o utilizador carregar num botão que
 * ainda não existe.
 * @param {unknown} ms
 * @returns {{dias:number,horas:number,minutos:number,segundos:number}|null}
 */
export function decompor(ms) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return null;
  const total = Math.max(0, Math.ceil(ms / 1000));
  return {
    dias:     Math.floor(total / 86400),
    horas:    Math.floor((total % 86400) / 3600),
    minutos:  Math.floor((total % 3600) / 60),
    segundos: total % 60,
  };
}

const dois = (n) => String(n).padStart(2, "0");

/**
 * Texto compacto da contagem ("9d 10:49:33" / "01:02:05"); "…" sem valor.
 * @param {unknown} ms
 * @returns {string}
 */
export function formatarContagem(ms) {
  const p = decompor(ms);
  if (!p) return "…";
  const hms = `${dois(p.horas)}:${dois(p.minutos)}:${dois(p.segundos)}`;
  return p.dias > 0 ? `${p.dias}d ${hms}` : hms;
}

/**
 * Escolhe a especial a mostrar. Antes das 20:00 ela vem em `agendadas`; depois,
 * em `edicoes` (o backend muda-a de mapa sozinho). Com várias, a primeira que
 * ainda não acabou; se todas acabaram, a mais recente.
 *
 * @param {Record<string, object>|undefined} edicoes
 * @param {Record<string, object>|undefined} agendadas
 * @param {number} agoraMs
 * @returns {object|null}
 */
export function escolherEspecial(edicoes, agendadas, agoraMs) {
  const porId = new Map();
  for (const mapa of [edicoes, agendadas]) {
    for (const e of Object.values(mapa || {})) {
      if (e && ehEspecial(e.id) && estadoEspecial(e, agoraMs) !== null) porId.set(e.id, e);
    }
  }
  const lista = [...porId.values()].sort((a, b) => msDe(a.inicio_em) - msDe(b.inicio_em));
  if (lista.length === 0) return null;
  return lista.find((e) => estadoEspecial(e, agoraMs) !== ESTADO_ESPECIAL.ENCERRADA) ?? lista.at(-1);
}

/**
 * Métricas públicas da rodada a partir da lista de `lances-flash` (em mainnet os
 * valores vêm blindados, mas as entradas contam-se).
 * @param {unknown} lista
 * @returns {{totalLances:number, participantes:number}|null}
 */
export function metricasDeLances(lista) {
  if (!Array.isArray(lista)) return null;
  const enderecos = new Set();
  for (const l of lista) {
    if (typeof l?.endereco === "string") enderecos.add(l.endereco.toLowerCase());
  }
  return { totalLances: lista.length, participantes: enderecos.size };
}

/**
 * Nome de exibição que o vencedor deu no lance dele, ou null.
 * @param {unknown} lista
 * @param {string} vencedor
 * @returns {string|null}
 */
export function nomeDoVencedor(lista, vencedor) {
  if (!Array.isArray(lista) || typeof vencedor !== "string") return null;
  const alvo = vencedor.toLowerCase();
  const l = lista.find((x) => typeof x?.endereco === "string" && x.endereco.toLowerCase() === alvo
    && typeof x.nomeExibicao === "string" && x.nomeExibicao.trim());
  return l ? l.nomeExibicao.trim() : null;
}

/**
 * Janela da edição em hora de Brasília, independente do fuso do aparelho.
 * O Brasil não tem horário de verão desde 2019: UTC−3 fixo.
 * @returns {{dia:string, inicio:string, fim:string}|null} ex.: {dia:"04/10", inicio:"20:00", fim:"20:30"}
 */
export function janelaEmBrasilia(edicao) {
  const i = msDe(edicao?.inicio_em);
  const f = msDe(edicao?.termino_em);
  if (i == null || f == null) return null;
  const opts = { timeZone: "America/Sao_Paulo", hour12: false };
  const dia = new Intl.DateTimeFormat("pt-BR", { ...opts, day: "2-digit", month: "2-digit" }).format(i);
  const hora = (ms) => new Intl.DateTimeFormat("pt-BR", { ...opts, hour: "2-digit", minute: "2-digit" }).format(ms);
  return { dia, inicio: hora(i), fim: hora(f) };
}
