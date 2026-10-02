// _stubs-provider/web3.js — UTAC000.15 (DEBT-010). Duplo de `src/utils/web3.js` para o Provider.
//
// O real abre um provider JSON-RPC (rede real) em `subscribeLanceDado`/`getEdicaoPrazo`. Aqui: sem
// rede. A subscrição devolve a função de cancelamento (o Provider chama-a no desmonte) e as leituras
// on-chain resolvem `null` (= «sem dado on-chain», que o Provider já trata como fail-soft).
export const subscribeLanceDado = () => () => {};
export const subscribeSaldoSenhas = () => () => {};
export const getSaldoSenhasOnChain = async () => null;
export const getEdicaoPrazo = async () => null;
export const getSignerFromProvider = async () => null;
