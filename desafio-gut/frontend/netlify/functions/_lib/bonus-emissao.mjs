// _lib/bonus-emissao.mjs — MC93-C. Decide se o bónus do torneio é emitido.
//
// PORQUÊ ESTE MÓDULO EXISTE, E PORQUE É PURO:
// Emitir o bónus é creditar 20 senhas on-chain — R$ 40,00 (20 × R$ 2,00) por
// participante por ciclo, numa transação irreversível na Ethereum mainnet.
// Esta é a última barreira antes disso, e está isolada de I/O para poder ser
// exercida sem ambiente, sem base de dados e sem rede.
//
// ⚠️ TRÊS CONDIÇÕES, NÃO UMA. O MC autorizava "wire-up desligado por default"
// através de uma flag de ambiente. Uma flag sozinha é fail-OPEN por omissão de
// disciplina: basta alguém pôr `BONUS_EMISSAO_ATIVA=true` no painel do Netlify
// para o sistema começar a emitir, sem mais barreira nenhuma e sem limite.
// Por isso exige-se, em simultâneo:
//   1. a flag ligada (o interruptor do operador);
//   2. a dívida existir e estar POR LIQUIDAR em `rankings_ciclo` — a
//      idempotência ancora no LIVRO-RAZÃO, não na fila. Uma tarefa pode ser
//      reprocessada (a fila re-enfileira com backoff e o `done` pode falhar
//      depois do handler); o registo é que é a verdade;
//   3. o payload coincidir com o livro-razão em alvo e quantidade — um payload
//      divergente é RECUSADO, nunca "ajustado".
//
// É o mesmo princípio do MC93-A: quando a dúvida vale dinheiro, a dúvida não
// paga. Em qualquer recusa devolve-se o motivo, para o handler o registar.

import { REGRAS } from "./pontuacao-utils.mjs";

/** Motivos de recusa. Vão para o log do worker — não são texto de UI. */
export const MOTIVOS = Object.freeze({
  ENTRADA_INVALIDA:      "entrada_invalida",
  FLAG_DESLIGADA:        "flag_desligada",
  SEM_DIVIDA:            "sem_divida_por_liquidar",
  JA_LIQUIDADA:          "divida_ja_liquidada",
  ALVO_DIVERGENTE:       "alvo_divergente",
  QUANTIDADE_DIVERGENTE: "quantidade_divergente",
});

/** Nome da variável de ambiente que arma a emissão. */
export const FLAG_EMISSAO = "BONUS_EMISSAO_ATIVA";

const norm = (e) => (typeof e === "string" && e ? e.toLowerCase() : null);
const recusa = (motivo) => ({ emitir: false, motivo, quantidade: 0 });

/**
 * Lê a flag de ambiente que arma a emissão.
 *
 * ⚠️ Compara com a STRING "true", exactamente. Qualquer outro valor — ausente,
 * "1", "sim", "TRUE" — deixa a emissão desligada. O default é não emitir.
 *
 * @param {Record<string,string|undefined>} [env] ambiente a ler (para testes).
 * @returns {boolean}
 */
export function emissaoArmada(env = process.env) {
  return env?.[FLAG_EMISSAO] === "true";
}

/**
 * Decide se uma tarefa de bónus deve resultar em emissão on-chain.
 *
 * Função PURA: não lê ambiente, não toca banco, não credita nada. Recebe o
 * estado e devolve a decisão com o motivo.
 *
 * @param {{
 *   flagAtiva: boolean,
 *   divida: {ciclo_id:string, endereco:string, bonus_emitido:boolean,
 *            senhas_a_creditar:number, liquidado_em:string|null}|null,
 *   payload: {cicloId:string, endereco:string, quantidade:number}
 * }} entrada
 * @returns {{emitir:boolean, motivo?:string, quantidade:number}}
 *   `quantidade` vem do LIVRO-RAZÃO, nunca do payload.
 */
export function podeEmitir(entrada) {
  if (!entrada || typeof entrada !== "object") return recusa(MOTIVOS.ENTRADA_INVALIDA);
  const { flagAtiva, divida, payload } = entrada;

  // 1. A flag. Só o booleano `true` — nada de coerção.
  if (flagAtiva !== true) return recusa(MOTIVOS.FLAG_DESLIGADA);

  // 2. A dívida, no livro-razão.
  if (!divida || typeof divida !== "object") return recusa(MOTIVOS.SEM_DIVIDA);
  if (divida.bonus_emitido !== true) return recusa(MOTIVOS.SEM_DIVIDA);
  if (!Number.isInteger(divida.senhas_a_creditar) || divida.senhas_a_creditar <= 0) {
    return recusa(MOTIVOS.SEM_DIVIDA);
  }
  if (divida.liquidado_em !== null && divida.liquidado_em !== undefined) {
    return recusa(MOTIVOS.JA_LIQUIDADA);
  }

  // 3. O payload tem de apontar à MESMA dívida.
  if (!payload || typeof payload !== "object") return recusa(MOTIVOS.ALVO_DIVERGENTE);
  if (norm(payload.endereco) === null || norm(payload.endereco) !== norm(divida.endereco)) {
    return recusa(MOTIVOS.ALVO_DIVERGENTE);
  }
  if (String(payload.cicloId || "") !== String(divida.ciclo_id || "")) {
    return recusa(MOTIVOS.ALVO_DIVERGENTE);
  }
  // Quantidade: tem de ser a do livro-razão E a regra em vigor. Não se ajusta
  // um payload divergente — recusa-se, porque divergir já é sinal de problema.
  if (payload.quantidade !== divida.senhas_a_creditar
      || payload.quantidade !== REGRAS.SENHAS_BONUS) {
    return recusa(MOTIVOS.QUANTIDADE_DIVERGENTE);
  }

  return { emitir: true, quantidade: divida.senhas_a_creditar };
}
