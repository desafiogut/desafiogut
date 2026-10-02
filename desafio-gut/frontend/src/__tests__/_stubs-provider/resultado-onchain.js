// _stubs-provider/resultado-onchain.js — UTAC000.15 (resposta à ⚠️1 do validador). Duplo SÓ da leitura
// on-chain (`lerResultadoOnchain`, que o `useResultadoOficial.js` REAL importa). O hook real corre:
// começa em `null` no 1.º render e o oficial só chega depois, pelo efeito assíncrono — como em produção.
// (O duplo anterior devolvia o oficial logo no 1.º render e deixava passar o mutante «congelar o 1.º
// render», que é o defeito da DEBT-009.) Devolve a forma CRUA do contrato (`resultados(id)`), que passa
// pelo `normalizarResultadoOficial` real (exige 0x+40 hex e endereço ≠ zero).
const ZERO = "0x0000000000000000000000000000000000000000";
let atual = null;
let pedidos = [];
const emCurso = new Set();
export function definirOnchain(r) { atual = r; pedidos = []; }
export function pedidosOnchain() { return pedidos.slice(); }
/** Resolve quando todas as leituras on-chain em curso terminaram (o arnês espera por elas). */
export async function aguardarLeituras() { while (emCurso.size) await Promise.allSettled([...emCurso]); }
export function lerResultadoOnchain(edicaoId) {
  pedidos.push(edicaoId);
  const p = (async () => {
    await new Promise((r) => setTimeout(r, 5)); // assíncrono de verdade (uma volta do relógio)
    if (!atual) return { consolidado: false, vencedor: ZERO, menorUnicoCentavos: 0 };
    return { consolidado: true, vencedor: atual.vencedor, menorUnicoCentavos: atual.menorUnicoCentavos };
  })();
  emCurso.add(p);
  p.finally(() => emCurso.delete(p));
  return p;
}
