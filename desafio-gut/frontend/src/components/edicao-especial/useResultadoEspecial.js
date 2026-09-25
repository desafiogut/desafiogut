import { useEffect, useState } from "react";
import { Contract } from "ethers";
import { apiGet } from "../../lib/api.js";
import { getProvider, CONTRATO_SEPOLIA } from "../../utils/web3.js";
import { metricasDeLances, nomeDoVencedor } from "./_estilo-especial.js";

// `resultados` é um mapping PUBLIC do LeilaoGUT (Leilao.sol:42), escrito por
// `consolidarResultado`. Fragmento local para não alterar o ABI partilhado.
const ABI_RESULTADOS = [
  "function resultados(string) view returns (uint256 menorUnico, address vencedor, bool consolidado)",
];

/**
 * Lê o resultado on-chain de uma edição. Fonte AUTORITATIVA do vencedor: é o
 * que a coordenação publicou, não uma apuração feita no browser.
 * @param {string} edicaoId
 * @returns {Promise<{consolidado:boolean, vencedor:string, menorUnicoCentavos:number|null}>}
 */
export async function lerResultadoOnchain(edicaoId) {
  const contrato = new Contract(CONTRATO_SEPOLIA, ABI_RESULTADOS, getProvider());
  const [menorUnico, vencedor, consolidado] = await contrato.resultados(edicaoId);
  const menor = Number(menorUnico);
  return {
    consolidado: consolidado === true,
    vencedor: String(vencedor),
    menorUnicoCentavos: Number.isSafeInteger(menor) ? menor : null,
  };
}

/**
 * Resultado + métricas públicas da especial, lidos só quando `ativo` (o card
 * liga-o no estado "encerrada"). Nada disto precisa de sessão.
 *
 * ⚠️ Métricas vêm de `GET lances-flash?edicaoId=`; o corpo é validado como JSON
 * de objecto — o `index.html` com 200 do SPA fallback não pode virar "0 lances"
 * (regra do MC93-F, repetida no MC94).
 *
 * @param {string} edicaoId
 * @param {boolean} ativo
 * @param {{lerResultado?:typeof lerResultadoOnchain}} [deps] injectável nos testes
 * @returns {{carregando:boolean, erro:string|null, resultado:object|null, metricas:object|null, nomeVencedor:string|null}}
 */
export function useResultadoEspecial(edicaoId, ativo, { lerResultado = lerResultadoOnchain } = {}) {
  const [estado, setEstado] = useState({ carregando: ativo, erro: null, resultado: null, metricas: null, nomeVencedor: null });

  useEffect(() => {
    if (!ativo || !edicaoId) return undefined;
    let cancelado = false;
    let intervalo = null;
    setEstado((e) => ({ ...e, carregando: true, erro: null }));

    // Até haver consolidação, relê de minuto a minuto: quem ficou a olhar para
    // "apuração em curso" vê o vencedor aparecer sem recarregar a página.
    const ler = async () => {
      try {
        const [resultado, resp] = await Promise.all([
          lerResultado(edicaoId),
          apiGet(`lances-flash?edicaoId=${encodeURIComponent(edicaoId)}`),
        ]);
        const corpoOk = resp?.ok && resp.data !== null && typeof resp.data === "object" && Array.isArray(resp.data.lances);
        const lista = corpoOk ? resp.data.lances : null;
        if (cancelado) return;
        setEstado({
          carregando: false,
          // Sem métricas legíveis não se inventa um "0 lances": o painel mostra só
          // o resultado on-chain, que é o que decide o vencedor.
          erro: null,
          resultado,
          metricas: metricasDeLances(lista),
          nomeVencedor: resultado?.consolidado ? nomeDoVencedor(lista, resultado.vencedor) : null,
        });
        if (resultado?.consolidado && intervalo) { clearInterval(intervalo); intervalo = null; }
      } catch (err) {
        if (!cancelado) setEstado({ carregando: false, erro: err?.message || "falha", resultado: null, metricas: null, nomeVencedor: null });
      }
    };
    ler();
    intervalo = setInterval(ler, 60_000);

    return () => { cancelado = true; if (intervalo) clearInterval(intervalo); };
  }, [edicaoId, ativo, lerResultado]);

  return estado;
}
