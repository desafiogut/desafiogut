// _lib/lider-especial.mjs — UTAC142 (Frente E, R18-142-E). O GUTO avisa quem LIDERA o menor lance único da edição
// especial: quando passa a liderar, quando deixa de liderar e quando volta a liderar.
//
// ANTI-ORÁCULO (decisão do operador). Os avisos POR LANCE do MC15.7 (`registrarEventosDeLance`) nunca correram na
// mainnet e continuam assim: «o teu lance de N é único» a cada lance deixava varrer valores (com lances de 1 ponto)
// e descobrir os valores alheios, o que anula os valores ocultos e o sal do UTAC140. Aqui:
//   1. o estado é avaliado por JANELA (cron de 5 min), nunca no instante do lance ⇒ o aviso não diz QUAL lance foi;
//   2. a mensagem NÃO leva valor nenhum (nem o do próprio), só «lideras / deixaste de liderar»;
//   3. só o líder (e o ex-líder) recebem algo; ninguém sabe nada sobre os outros;
//   4. só portadores de Passe (com `passePorLance` cada lance da especial já gastou 1 Passe, logo todo o licitante
//      o é; sem essa regra, pergunta-se ao inventário).
//
// PURO: sem Blobs, sem env. Quem chama traz os lances, o estado anterior e o predicado de portador.

import { apurarMenorUnico } from "./consolidacao.mjs";

export const TIPO_LIDER = "lider_menor_unico";
export const TIPO_PERDEU = "lider_perdeu";
export const TIPO_VOLTOU = "lider_voltou";
export const JANELA_AVISO_MS = 5 * 60_000;

const norm = (e) => (typeof e === "string" ? e.toLowerCase() : null);

/**
 * Primeiro nome para o GUTO tratar o utilizador. Só de um nome «de pessoa»: nunca de um e-mail (o `nomeExibicao`
 * do cliente cai para o e-mail quando a conta não tem nome do Google — `AppContext.jsx` userLabelReal).
 */
export function primeiroNome(nome) {
  if (typeof nome !== "string" || nome.includes("@")) return null;
  const p = nome.trim().split(/\s+/)[0];
  return p && /^\p{L}[\p{L}'’-]{0,39}$/u.test(p) ? p : null;
}

export function mensagemAviso(tipo, { nome, edicaoId }) {
  const ola = nome ? `${nome}, ` : "";
  if (tipo === TIPO_LIDER) return `🎯 ${ola}neste momento você tem o menor lance único da ${edicaoId}! Se ninguém igualar até o fim, o produto é seu. Os valores continuam ocultos até a apuração.`;
  if (tipo === TIPO_VOLTOU) return `🔁 ${ola}você voltou a ter o menor lance único da ${edicaoId}! Fique atento: a apuração é no fim da edição.`;
  if (tipo === TIPO_PERDEU) return `⚠️ ${ola}seu lance deixou de ser o menor único da ${edicaoId}. Ainda dá tempo: um novo lance pode colocar você na frente.`;
  throw new Error(`tipo de aviso desconhecido: ${tipo}`);
}

/**
 * Compara o líder actual com o da janela anterior e diz que avisos enviar.
 * @param {{edicaoId:string, lances:Array<{endereco:string,valorCentavos:number,nomeExibicao?:string}>,
 *          estadoAnterior?:{lider:string|null, jaLideraram:string[]}|null, ehPortador:(e:string)=>Promise<boolean>|boolean}} p
 * @returns {Promise<{estado:{lider:string|null, jaLideraram:string[]}, avisos:Array<{endereco:string,tipo:string,mensagem:string}>}>}
 */
export async function avaliarLider({ edicaoId, lances, estadoAnterior, ehPortador }) {
  const validos = (Array.isArray(lances) ? lances : [])
    .filter((l) => l && Number.isInteger(l.valorCentavos) && l.valorCentavos > 0 && norm(l.endereco));
  const anterior = {
    lider: norm(estadoAnterior?.lider) ?? null,
    jaLideraram: Array.isArray(estadoAnterior?.jaLideraram) ? estadoAnterior.jaLideraram.map(norm).filter(Boolean) : [],
  };
  const apurado = apurarMenorUnico(validos.map((l) => ({ valorCentavos: l.valorCentavos, endereco: norm(l.endereco) })));
  let lider = apurado?.vencedor ?? null;
  // Não portador: não é avisado e não «tira» o lugar a ninguém no estado (o ex-líder recebe «deixaste de liderar»).
  const portadorLider = lider ? await ehPortador(lider) : false;
  if (lider && !portadorLider) lider = null;

  const nomes = new Map();
  for (const l of validos) { const n = primeiroNome(l.nomeExibicao); if (n) nomes.set(norm(l.endereco), n); }

  const avisos = [];
  const jaLideraram = [...anterior.jaLideraram];
  if (lider !== anterior.lider) {
    if (anterior.lider) {
      avisos.push({ endereco: anterior.lider, tipo: TIPO_PERDEU, mensagem: mensagemAviso(TIPO_PERDEU, { nome: nomes.get(anterior.lider), edicaoId }) });
    }
    if (lider) {
      const tipo = jaLideraram.includes(lider) ? TIPO_VOLTOU : TIPO_LIDER;
      avisos.push({ endereco: lider, tipo, mensagem: mensagemAviso(tipo, { nome: nomes.get(lider), edicaoId }) });
      if (!jaLideraram.includes(lider)) jaLideraram.push(lider);
    }
  }
  return { estado: { lider, jaLideraram }, avisos };
}
