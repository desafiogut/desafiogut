// Rastreio do pedido (MC102.1a): o mapa de eventos genéricos → PT-BR e a timeline de 5 passos + alertas.
// Lógica pura, sem React, testável com node:test.
//
// Os códigos são GENÉRICOS: o adaptador da transportadora (`netlify/functions/_lib/rastreio.mjs`, real no
// MC102.1b) traduz os códigos dela para estes. Rótulos: decisão do operador DEC-102.1-H (2026-09-29).

/** Os 5 passos, por ordem. Um passo mais adiantado implica os anteriores feitos. */
export const PASSOS = Object.freeze(["0", "1", "2", "3", "4"]);
/** Os 3 alertas: aparecem como banners, não avançam passos. */
export const ALERTAS = Object.freeze(["A1", "A2", "A3"]);

export const MAPA_EVENTOS = Object.freeze({
  "0": "Postado",
  "1": "A caminho",
  "2": "Na cidade de destino",
  "3": "Saiu para entrega",
  "4": "Entregue",
  A1: "Tentativa de entrega sem sucesso",
  A2: "Aguardando retirada na agência",
  A3: "Devolvido ao remetente",
});

/** Texto PT-BR de um código genérico; código desconhecido → a descrição original (ou ""). */
export function traduzirEvento(codigo, descricao) {
  const c = String(codigo ?? "");
  // Object.hasOwn: "constructor"/"toString" não são códigos (o acesso directo devolvia uma função).
  if (Object.hasOwn(MAPA_EVENTOS, c)) return MAPA_EVENTOS[c];
  return descricao == null ? "" : String(descricao);
}

/**
 * Eventos `[{ data, codigo, local, descricao }]` → `{ passos, alertas }`.
 * `passos` tem SEMPRE 5 entradas `{ codigo, rotulo, feito, data }`; `data` é a mais antiga do próprio código
 * (null se o passo só está feito por implicação). `alertas` são `{ codigo, rotulo, data }`, pela ordem recebida.
 * Códigos desconhecidos não avançam passos nem geram alertas. `local` e `descricao` não saem daqui (P8).
 */
export function construirTimeline(eventos) {
  const lista = Array.isArray(eventos) ? eventos : [];
  let alcancado = -1;
  const datas = {};
  const alertas = [];
  for (const e of lista) {
    const c = String(e?.codigo ?? "");
    const data = e?.data ?? null;
    const i = PASSOS.indexOf(c);
    if (i >= 0) {
      if (i > alcancado) alcancado = i;
      if (data && (!datas[c] || data < datas[c])) datas[c] = data;
    } else if (ALERTAS.includes(c)) {
      alertas.push({ codigo: c, rotulo: MAPA_EVENTOS[c], data });
    }
  }
  const passos = PASSOS.map((c, i) => ({ codigo: c, rotulo: MAPA_EVENTOS[c], feito: i <= alcancado, data: datas[c] ?? null }));
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
