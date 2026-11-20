// UTAC140 (Frente E) — lógica PURA da tabela ao vivo da especial (sem React: testável com node --test).
import { inteiroSeguro } from "../meus-ativos/_estilo.js";

/** PURO — linhas desenháveis a partir da resposta da RPC. Ignora lixo; NUNCA devolve o valor. */
export function linhasDoRanking(data) {
  return (Array.isArray(data) ? data : [])
    .filter((l) => l && inteiroSeguro(l.posicao) !== null && typeof l.endereco === "string" && l.endereco)
    .map((l) => ({ posicao: l.posicao, endereco: l.endereco }))
    .sort((a, b) => a.posicao - b.posicao);
}

/**
 * UTAC140 (operador: «o layout é o layout da edição») — as linhas do ranking no formato da `TabelaLances`
 * padrão: lances BLINDADOS (`oculto`, `valor: null`, `repetido: null`), pela ordem de chegada, com o endereço
 * já encurtado pelo servidor (`enderecoCurto`; o inteiro nunca chega ao browser — R18-140-C).
 */
export function lancesOcultosDoRanking(data) {
  return linhasDoRanking(data).map((l) => ({
    lanceId: `ranking-${l.posicao}`,
    enderecoCurto: l.endereco,
    valor: null,
    oculto: true,
    repetido: null,
  }));
}
