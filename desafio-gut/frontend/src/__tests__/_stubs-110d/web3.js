// _stubs-110d/web3.js — UTAC110d-front. Duplo de `src/utils/web3.js` para o CardLance REAL.
//
// No ramo Relâmpago o CardLance só precisa de `getSignerFromProvider` (assina
// `DESAFIOGUT-AUTH:…` para o `auth-lance`). As restantes exportações existem para o import nomeado
// não ficar `undefined`; se o teste as chamar (ramo on-chain), LANÇAM — o teste não deve lá ir.
const naoUsar = (nome) => async () => { throw new Error(`duplo web3: «${nome}» não devia ser chamado neste teste`); };
export const getSignerFromProvider = async () => ({ signer: { signMessage: async () => "0xassinatura-duplo" } });
export const assinarLance = naoUsar("assinarLance");
export const enviarLance = naoUsar("enviarLance");
export const hashLance = naoUsar("hashLance");
export const CONTRATO_SEPOLIA = "0x0000000000000000000000000000000000000000";
