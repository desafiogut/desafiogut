// _stubs-provider/web3.js — UTAC000.15 (DEBT-010). Duplo de `src/utils/web3.js` para o Provider.
//
// O real abre um provider JSON-RPC (rede real) em `subscribeLanceDado`/`getEdicaoPrazo`. Aqui: sem
// rede. As leituras on-chain resolvem `null` (= «sem dado on-chain», que o Provider já trata como
// fail-soft). A subscrição do evento `LanceDado` GUARDA o callback (resposta à ⚠️2 do validador:
// a modalidade `programado` vê os lances on-chain por aqui) e devolve o cancelamento real.
const subs = new Set();
export const subscribeLanceDado = (edicaoId, cb) => {
  const s = { edicaoId, cb };
  subs.add(s);
  return () => subs.delete(s);
};
/** Emite um `LanceDado` para os subscritores da edição (como o listener on-chain faria). */
export function emitirLanceDado(edicaoId, lance) {
  let n = 0;
  for (const s of subs) if (s.edicaoId === edicaoId) { s.cb(lance); n += 1; }
  return n;
}
export const subscricoesLanceDado = () => [...subs].map((s) => s.edicaoId);
export const subscribeSaldoSenhas = () => () => {};
export const getSaldoSenhasOnChain = async () => null;
export const getEdicaoPrazo = async () => null;
export const getSignerFromProvider = async () => null;
