// src/lib/nomeExibicao.js — UTAC142 (Frente D, R18-142-D). «PrimeiroNome I.» para as tabelas de lances.
// Só de um nome de PESSOA (o nome do Google): o `nomeExibicao` que o app manda cai para o e-mail quando a conta não
// tem nome (`AppContext.jsx` userLabelReal), logo qualquer coisa com «@» é recusada e fica o endereço encurtado.
// Guarda-se/mostra-se SÓ a forma reduzida (minimização, LGPD). Espelho de `netlify/functions/_lib/nome-exibicao.mjs`
// (há teste que exige as duas iguais). PURO.

const PALAVRA = /^\p{L}[\p{L}'’-]{0,39}$/u;
const INICIAL = /^\p{L}\.$/u; // idempotência: «Ana S.» (a forma já reduzida, guardada no servidor) volta igual
const PARTICULAS = new Set(["da", "de", "do", "das", "dos", "e", "di", "du", "van", "von"]);

/** "Ana Paula Souza" → "Ana P." · "Ana" → "Ana" · e-mail/lixo → null. */
export function formatarNome(nome) {
  if (typeof nome !== "string" || nome.includes("@")) return null;
  const partes = nome.normalize("NFC").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0 || !PALAVRA.test(partes[0]) || !partes.every((p) => PALAVRA.test(p) || INICIAL.test(p))) return null;
  const primeiro = partes[0];
  const segundo = partes.slice(1).find((p) => !PARTICULAS.has(p.toLowerCase()));
  return segundo ? `${primeiro} ${segundo[0].toLocaleUpperCase("pt-BR")}.` : primeiro;
}

/** O que a tabela mostra: o nome reduzido, ou o endereço que vier (já encurtado), ou «—». */
export function formatarNomeExibicao(endereco, nomeCompleto) {
  return formatarNome(nomeCompleto) ?? (typeof endereco === "string" && endereco ? endereco : "—");
}
