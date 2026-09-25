// retryAuth.js — MC94.3.2. Política de tentativas da sessão (user-session JWT).
//
// PORQUÊ EXISTE ESTE FICHEIRO: no AppContext, `obterAuthToken` era tentado UMA só
// vez. O efeito que o chama depende de [address, authToken, obterAuthToken]; numa
// falha o `authToken` continua `null` e a função não muda de identidade, logo o
// efeito NÃO voltava a correr. Consequência medida por leitura: uma falha
// transitória do `/auth-user` (rede, 429, 500, CORS, cold start da function)
// deixava o utilizador **autenticado no Privy e sem sessão** — sem qualquer
// tentativa de recuperação. É a forma mais provável de "o login não completa e
// não entra na conta" que o operador reportou.
//
// A política vive aqui, PURA e testável, em vez de aninhada no efeito: o
// AppContext não é testável por unidade (os testes do Dashboard substituem-no por
// um duplo, e ele importa os hooks do Privy). Assim o que se testa é a REGRA, não
// a integração — e diz-se isso claramente, sem o disfarçar de prova de ponta a ponta.

/** Total de tentativas do `/auth-user` por sessão de endereço (1 + 3 recuos). */
export const MAX_TENTATIVAS_AUTH = 4;

/**
 * Atraso antes da tentativa `n` (0 = primeira). Recuo exponencial limitado:
 * 0,8 s → 1,6 s → 3,2 s → 6,4 s, com tecto de 30 s. Nunca zero, para não
 * martelar a function num cold start.
 * @param {number} n índice da tentativa (0-based)
 * @returns {number} ms
 */
export function atrasoDaTentativaAuth(n) {
  const i = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  // O expoente é limitado só para evitar 2**infinito; o TECTO real é o min().
  // (Uma versão anterior limitava o expoente a 5 = 25 600 ms, e o tecto de 30 s
  //  nunca era alcançado — código morto que o teste apanhou.)
  return Math.min(800 * 2 ** Math.min(i, 20), 30_000);
}

/**
 * Deve tentar-se obter a sessão agora?
 *
 * Não se tenta sem endereço (não há o que assinar) nem quando já há token.
 * Desiste-se ao fim de MAX_TENTATIVAS_AUTH — um laço infinito contra o backend
 * seria pior que o defeito.
 *
 * @param {{address?:string|null, authToken?:string|null, tentativa?:number}} p
 * @returns {boolean}
 */
export function deveTentarAuth({ address, authToken, tentativa = 0 } = {}) {
  if (!address) return false;
  if (authToken) return false;
  const n = Number.isFinite(tentativa) ? Math.max(0, tentativa) : 0;
  return n < MAX_TENTATIVAS_AUTH;
}
