// UTAC140 (Frente E) — lógica PURA da tabela ao vivo da especial (sem React: testável com node --test).
import { inteiroSeguro } from "../meus-ativos/_estilo.js";

/** PURO — linhas desenháveis a partir da resposta da RPC. Ignora lixo; NUNCA devolve o valor. */
export function linhasDoRanking(data) {
  return (Array.isArray(data) ? data : [])
    .filter((l) => l && inteiroSeguro(l.posicao) !== null && typeof l.endereco === "string" && l.endereco)
    .map((l) => ({ posicao: l.posicao, endereco: l.endereco }))
    .sort((a, b) => a.posicao - b.posicao);
}

