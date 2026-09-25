// retornoOAuth.js — MC94.3.2. A decisão da rota de retorno do OAuth.
//
// ⛔ O DEFEITO (reproduzido pelo operador em 2026-09-25):
//   O Privi devolve o browser a `https://…/redirect?privy_oauth_code=…`
//   (`customOAuthRedirectUrl`). Esse caminho NÃO TINHA ROTA em App.jsx — existia
//   apenas para o deep link NATIVO (Capacitor), e em web o efeito de deep link é
//   um no-op (`if (!window.Capacitor) return`). Resultado medido na consola do
//   operador: o Privy CONCLUÍA o login ("login completo", temAddress: true,
//   temAuthToken: true) e o utilizador ficava PRESO numa página vazia em
//   /redirect, sem nunca entrar na conta.
//
// ⚠️ Os 404 de `/.netlify/functions/cotas` que aparecem no mesmo cenário NÃO são a
//   causa: são a resposta CORRECTA da function para um utilizador sem cota
//   atribuída (`email_nao_encontrado` / `cota_nao_encontrada` — cotas.mjs:291/316).
//   Medido: GET /cotas sem params devolve 200; com email sem token, 401.
//
// A decisão vive aqui, pura e testável, em vez de aninhada no componente: o App.jsx
// não é testável por unidade (precisa do Privy), e a REGRA é o que interessa.

/** A rota que o OAuth usa como retorno. Tem de existir como <Route> em App.jsx. */
export const ROTA_RETORNO_OAUTH = "/redirect";

/** Para onde se segue depois de a sessão existir. */
export const DESTINO_APOS_LOGIN = "/";

/** Sem sessão ao fim disto, oferece-se saída manual em vez de página em branco. */
export const MS_ATE_OFERECER_SAIDA_MANUAL = 6_000;

/**
 * Que fazer quando aterra o retorno do OAuth?
 *
 * `ready` = o Privy já inicializou; `isConnected` = já há endereço E sessão.
 * Só se navega quando AMBOS: navegar antes de `ready` mandaria o utilizador para a
 * raiz com a sessão por restaurar, e ele cairia no ecrã de login outra vez.
 *
 * @param {{ready?:boolean, isConnected?:boolean}} p
 * @returns {{tipo:"navegar", para:string}|{tipo:"aguardar"}}
 */
export function decidirSaidaDoRetorno({ ready, isConnected } = {}) {
  if (ready && isConnected) return { tipo: "navegar", para: DESTINO_APOS_LOGIN };
  return { tipo: "aguardar" };
}

/**
 * Já vale a pena oferecer a saída manual? (rede de segurança para o utilizador não
 * ficar sem nada para clicar se o Privy demorar ou falhar a restaurar a sessão.)
 * @param {number} decorridoMs
 * @returns {boolean}
 */
export function deveOferecerSaidaManual(decorridoMs) {
  return Number.isFinite(decorridoMs) && decorridoMs >= MS_ATE_OFERECER_SAIDA_MANUAL;
}
