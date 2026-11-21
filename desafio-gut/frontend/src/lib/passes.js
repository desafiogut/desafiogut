// src/lib/passes.js — UTAC110d-front. Fonte única (frontend) dos DOIS Passes Desafio e dos
// créditos de lance. Puro: sem React, sem rede — testável com `node --test`.
//
// Backend (UTAC110d, não tocado aqui):
//   POST /comprar-passe-relampago → R$ 2,00 → 10 pontos de fidelidade + 200 PONTOS de lance (UTAC110n;
//     até ao UTAC110n dava 1 CRÉDITO de lance) + 1 ECOQUILDO;
//   POST /comprar-passe-programado → R$ 2,00 → 10 pontos de fidelidade (+ o direito ao palpite);
//   GET  /ler-pontos → { …, fidelidade:{total,historico}, lance:{creditos,pontos,historico} };
//   POST /lance-relampago (Relâmpago) GASTA o valor do lance em pontos → 400 `saldo_pontos_insuficiente`
//     (UTAC110n; o `sem_creditos_lance` do 110d deixou de existir). ⚠️ UTAC110j.5: `estadoCreditosLance`,
//     `rotuloCreditos` e `creditosDaResposta` abaixo ficam como LEGADO — o CardLance usa
//     `estadoPontosLance` (`lib/pontosLance.js`).
// O tipo do Passe vem do ENDPOINT, nunca do corpo (`_lib/comprar-passe-tipado.mjs`).

export const PRECO_PASSE = "R$ 2,00";
// UTAC112 — compra múltipla: os pacotes que o PWA oferece (o servidor aceita só estes no saldo R$).
// UTAC147 (decisão do operador) — pacotes de 1, 3 ou 5 Passes (o 10 saiu; o servidor recusa-o).
export const QUANTIDADES_PASSE = Object.freeze([1, 3, 5]);
export const VALOR_PASSE_CENTAVOS = 200;
/** «R$ 10,00» para N Passes (N fora dos pacotes → null; sem coerção). */
export function precoTotal(quantidade) {
  if (!QUANTIDADES_PASSE.includes(quantidade)) return null;
  return `R$ ${((VALOR_PASSE_CENTAVOS * quantidade) / 100).toFixed(2).replace(".", ",")}`;
}
/** Texto do botão: 1 → «Comprar <nome>» (como sempre); N → «Comprar N passes por R$ X,XX». */
export function rotuloCompra(nome, quantidade) {
  return quantidade === 1 ? `Comprar ${nome}` : `Comprar ${quantidade} passes por ${precoTotal(quantidade)}`;
}
export const PONTOS_FIDELIDADE_POR_PASSE = 10;

// Congelado + lido com `Object.hasOwn`: um tipo vindo de fora («constructor», «__proto__», «pontos»)
// nunca escolhe um endpoint.
export const TIPOS_PASSE = Object.freeze({
  relampago: Object.freeze({
    tipo: "relampago",
    endpoint: "comprar-passe-relampago",
    nome: "Passe Relâmpago",
    icone: "⚡",
    // UTAC110j.5 — o backend (UTAC110n) deixou de dar 1 CRÉDITO e passou a dar +200 PONTOS de lance
    // (`ledger-lance.mjs` PONTOS_LANCE_POR_PASSE_RELAMPAGO) + 1 ECOQUILDO. Texto antigo, por histórico:
    //   beneficio: "10 pontos + 1 lance no Menor Lance Único" · sucesso: "Passe Relâmpago comprado: +10 pontos e 1 lance"
    // UTAC137 (Regulamento v6.0, Arts. 6º/7º): o Passe dá 1 ponto de fidelidade e NÃO dá pontos de lance.
    //   antes: beneficio "10 pontos de fidelidade + 200 pontos de lance + 1 ECOQUILDO" · sucesso "…+10 pontos de fidelidade e +200 pontos de lance"
    // UTAC138 (Regulamento v6.1, Art. 7º; R18-138-D): o Relâmpago volta a dar pontos de lance — +100 por Passe.
    //   antes (UTAC137): beneficio "1 ponto de fidelidade + 1 ECOQUILDO + GUTO e dados analíticos" · sucesso "…+1 ponto de fidelidade e +1 ECOQUILDO"
    // UTAC147 (modelo de Passes diretos): 1 Passe Relâmpago = 1 lance; o bónus de +100 saiu do PIX.
    //   antes (UTAC138): beneficio "Bônus de 100 pontos de lance + 1 ponto de fidelidade + …" · sucesso "…+100 pontos de lance (bônus)…"
    beneficio: "1 lance no Menor Lance Único + 1 ponto de fidelidade + 1 ECOQUILDO + GUTO e dados analíticos",
    sucesso: "Passe Relâmpago comprado: já está em Meus Passes (1 Passe = 1 lance), +1 ponto de fidelidade e +1 ECOQUILDO",
  }),
  programado: Object.freeze({
    tipo: "programado",
    endpoint: "comprar-passe-programado",
    nome: "Passe Programado",
    icone: "🎫",
    // UTAC137 — o palpite deixou de exigir Passe. Antes: "10 pontos + 1 palpite nas Ofertas Programadas" · "+10 pontos e 1 palpite"
    // UTAC147 — 1 Passe Programado = 1 palpite. Antes (UTAC137): "1 ponto de fidelidade + 1 ECOQUILDO + GUTO e dados analíticos"
    beneficio: "1 palpite nas Ofertas Programadas + 1 ponto de fidelidade + 1 ECOQUILDO + GUTO e dados analíticos",
    sucesso: "Passe Programado comprado: já está em Meus Passes (1 Passe = 1 palpite), +1 ponto de fidelidade e +1 ECOQUILDO",
  }),
});

/** O Passe de um tipo, ou `null` se o tipo não for um dos dois (sem coerção). */
export function passeDoTipo(tipo) {
  return typeof tipo === "string" && Object.hasOwn(TIPOS_PASSE, tipo) ? TIPOS_PASSE[tipo] : null;
}

/** Inteiro seguro ≥ 0, ou `null`. Sem coerção: "3", 3.5, -1, NaN, Infinity → null. */
export function inteiroNaoNegativo(v) {
  return Number.isSafeInteger(v) && v >= 0 ? v : null;
}

/**
 * Créditos de lance a partir da resposta do `GET /ler-pontos`. Bloco `lance` ausente ou ilegível
 * → 0 (sem créditos conhecidos ⇒ não se promete um lance que o servidor recusaria).
 */
export function creditosDaResposta(data) {
  return inteiroNaoNegativo(data?.lance?.creditos) ?? 0;
}

/**
 * Estado do botão «Dar lance» no Relâmpago (o servidor consome 1 crédito por lance).
 * Fail-closed: sem número de créditos CONHECIDO e ≥ 1, o botão fica desligado e diz porquê.
 * @returns {{ estado: string, podeLancar: boolean, mensagem: string }}
 */
export function estadoCreditosLance({ isConnected, creditos, loading, erro }) {
  if (!isConnected) return { estado: "sem_sessao", podeLancar: false, mensagem: "" };
  if (loading) return { estado: "carregando", podeLancar: false, mensagem: "⏳ Carregando seus créditos de lance…" };
  if (erro) {
    return { estado: "erro", podeLancar: false,
      mensagem: "⚠️ Não foi possível ler seus créditos de lance. Tente de novo em instantes." };
  }
  const n = inteiroNaoNegativo(creditos);
  if (n === null || n < 1) {
    return { estado: "sem_creditos", podeLancar: false,
      mensagem: "Sem créditos de lance. Adquira um Passe Relâmpago na Carteira para dar um lance." };
  }
  return { estado: "com_creditos", podeLancar: true, mensagem: "" };
}

/**
 * UTAC147 (decisão do operador, 2026-11-21 — modelo de Passes diretos): **1 Passe Relâmpago = 1 lance**.
 * Estado do botão de lance pelo INVENTÁRIO de Passes (`useInventarioPasses`), fail-closed: sem sessão, a carregar,
 * erro de leitura ou 0 Passes ⇒ não pode licitar, com a mensagem À VISTA. Mesma forma do antigo `estadoPontosLance`
 * (`custo` = 1 Passe, `saldo` = Passes Relâmpago). PURA.
 * @returns {{estado:string, podeLancar:boolean, saldo:number|null, custo:number|null, mensagem:string}}
 */
export function estadoPassesLance({ isConnected, passes, loading, erro }) {
  const base = { saldo: null, custo: isConnected ? 1 : null };
  if (!isConnected) return { ...base, estado: "sem_sessao", podeLancar: false, mensagem: "" };
  if (loading) return { ...base, estado: "carregando", podeLancar: false, mensagem: "⏳ Carregando seus Passes…" };
  const saldo = inteiroNaoNegativo(passes);
  if (erro || saldo === null) {
    return { ...base, estado: "erro", podeLancar: false,
      mensagem: "⚠️ Não foi possível ler seus Passes. Tente de novo em instantes." };
  }
  if (saldo < 1) {
    return { ...base, saldo, estado: "sem_passes", podeLancar: false,
      mensagem: "Você não tem Passes Relâmpago. Compre Passes para participar: cada lance usa 1 Passe Relâmpago." };
  }
  return { ...base, saldo, estado: "ok", podeLancar: true, mensagem: "" };
}

/** UTAC147 — «1 Passe Relâmpago» / «N Passes Relâmpago». */
export function rotuloPassesRelampago(n) {
  return `${n} ${n === 1 ? "Passe Relâmpago" : "Passes Relâmpago"}`;
}

/** Rótulo curto dos créditos: «1 crédito» / «N créditos». */
export function rotuloCreditos(n) {
  return `${n} ${n === 1 ? "crédito" : "créditos"}`;
}
