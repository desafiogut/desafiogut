// _stubs-151val/privy.js — UTAC151-val. Duplo de `@privy-io/react-auth` só com o `getIdentityToken` que o `usePalpite`
// importa dinamicamente (o SDK real não corre no runner SSR). `definirIdentidade(fn)` decide o que devolve/lança.
let fonte = async () => null;
export function definirIdentidade(fn) { fonte = fn; }
export async function getIdentityToken() { return fonte(); }
