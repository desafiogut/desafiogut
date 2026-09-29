// Rastreio do pedido (MC102.1a): o mapa de eventos genéricos → PT-BR e a timeline de 5 passos + alertas.
// Lógica pura, sem React, testável com node:test.
//
// Os códigos são GENÉRICOS: o adaptador da transportadora (`netlify/functions/_lib/rastreio.mjs`, real no
// MC102.1b) traduz os códigos dela para estes. Rótulos: decisão do operador DEC-102.1-H (2026-09-29).

/** Os 5 passos, por ordem. Um passo mais adiantado implica os anteriores feitos. */
export const PASSOS = Object.freeze(["0", "1", "2", "3", "4"]);
/** Os alertas: aparecem como banners, não avançam passos. A4/A5: DEC-102.1b-9 (vêm da Frenet). */
export const ALERTAS = Object.freeze(["A1", "A2", "A3", "A4", "A5"]);

export const MAPA_EVENTOS = Object.freeze({
  "0": "Postado",
  "1": "A caminho",
  "2": "Na cidade de destino",
  "3": "Saiu para entrega",
  "4": "Entregue",
  A1: "Tentativa de entrega sem sucesso",
  A2: "Aguardando retirada na agência",
  A3: "Devolvido ao remetente",
  A4: "Entrega atrasada",
  A5: "Objeto extraviado",
});

/** Texto PT-BR de um código genérico; código desconhecido → a descrição original (ou ""). */
export function traduzirEvento(codigo, descricao) {
  const c = String(codigo ?? "");
  // Object.hasOwn: "constructor"/"toString" não são códigos (o acesso directo devolvia uma função).
  if (Object.hasOwn(MAPA_EVENTOS, c)) return MAPA_EVENTOS[c];
  return descricao == null ? "" : String(descricao);
}

// Por instante, não por texto: "…T10:00-03:00" é depois de "…T12:30Z". Sem data legível → +∞ (vai para o fim).
const instante = (d) => { const t = Date.parse(d); return Number.isNaN(t) ? Infinity : t; };

/**
 * Eventos `[{ data, codigo, local, descricao }]` → `{ passos, alertas }`.
 * `passos` tem SEMPRE 5 entradas `{ codigo, rotulo, feito, data }`; `data` é a mais antiga do próprio código
 * (null se o passo só está feito por implicação).
 * `alertas` são `{ codigo, rotulo, data, quantidade }` (MC102.1b, decisões do operador):
 *   - DEC-102.1b-1: com «Entregue» feito, NÃO há alertas (o estado final sobrepõe-se);
 *   - DEC-102.1b-2/-7: um banner por código; A1 repetido diz «N tentativas de entrega», os outros ficam sem contagem;
 *     `data` é a da ocorrência mais RECENTE;
 *   - DEC-102.1b-3/-7: ordem cronológica pela PRIMEIRA ocorrência de cada código.
 * Códigos desconhecidos não avançam passos nem geram alertas. `local` e `descricao` não saem daqui (P8).
 */
export function construirTimeline(eventos) {
  const lista = Array.isArray(eventos) ? eventos : [];
  let alcancado = -1;
  const datas = {};
  const grupos = new Map();
  for (const e of lista) {
    const c = String(e?.codigo ?? "");
    const data = e?.data ?? null;
    const i = PASSOS.indexOf(c);
    if (i >= 0) {
      if (i > alcancado) alcancado = i;
      if (data && (!datas[c] || instante(data) < instante(datas[c]))) datas[c] = data;
    } else if (ALERTAS.includes(c)) {
      const g = grupos.get(c) ?? { codigo: c, quantidade: 0, primeira: null, ultima: null };
      g.quantidade += 1;
      if (data && (!g.primeira || instante(data) < instante(g.primeira))) g.primeira = data;
      if (data && (!g.ultima || instante(data) > instante(g.ultima))) g.ultima = data;
      grupos.set(c, g);
    }
  }
  const passos = PASSOS.map((c, i) => ({ codigo: c, rotulo: MAPA_EVENTOS[c], feito: i <= alcancado, data: datas[c] ?? null }));
  if (alcancado === PASSOS.length - 1) return { passos, alertas: [] };
  const alertas = [...grupos.values()]
    .sort((a, b) => instante(a.primeira) - instante(b.primeira))
    .map((g) => ({
      codigo: g.codigo,
      rotulo: g.codigo === "A1" && g.quantidade > 1 ? `${g.quantidade} tentativas de entrega` : MAPA_EVENTOS[g.codigo],
      data: g.ultima,
      quantidade: g.quantidade,
    }));
  return { passos, alertas };
}

/**
 * O que o cartão do pedido mostra: a timeline se o rastreio trouxer eventos (`rastreio.eventos`, a gravar pelo
 * webhook do MC102.1b), senão null — e o cartão fica com a linha do código em bruto que já tem (P9).
 */
export function timelineDoRastreio(rastreio) {
  const eventos = rastreio?.eventos;
  if (!Array.isArray(eventos) || eventos.length === 0) return null;
  return construirTimeline(eventos);
}
