// Rastreio do pedido (MC102.1a) — o CONTRATO do adaptador, sem transportadora nenhuma ligada.
//
//   consultarRastreio(codigo, transportadora) →
//     sucesso: { ok: true,  eventos: [{ data, codigo, local, descricao }] }
//     falha:   { ok: false, code, fallback: { codigo } }
//
// `eventos[].codigo` é o código GENÉRICO do mapa do frontend (`src/lib/rastreio.js`: "0"–"4" passos,
// "A1"–"A3" alertas). Traduzir os códigos da transportadora para estes é tarefa do adaptador.
//
// ⛔ HARD GATE 13 — o mock NUNCA vai a produção. Por isso a escolha do adaptador é do CHAMADOR e este
// módulo não importa o mock: um import, mesmo condicionado a uma variável de ambiente, levava o mock para
// dentro do bundle da função (o esbuild segue imports estáticos). Os testes injectam o mock; em produção
// vale `ADAPTADOR_REAL`, que só existe no MC102.1b (Frenet). Enquanto for `null`, a resposta é o fallback.
//
// Fallback (P9): só o código em bruto. Nunca uma URL de rastreio inventada.

/** Adaptador da transportadora real — MC102.1b. Enquanto não existir, tudo cai no fallback. */
export const ADAPTADOR_REAL = null;

/**
 * @param {string} codigo código de rastreio gravado no pedido (`pedido.rastreio.codigo`)
 * @param {string} transportadora `pedido.rastreio.transportadora`
 * @param {{ adaptador?: { consultar(codigo: string, transportadora: string): Promise<{ eventos: object[] }> } | null }} [opcoes]
 */
export async function consultarRastreio(codigo, transportadora, { adaptador = ADAPTADOR_REAL } = {}) {
  const fallback = { codigo: String(codigo ?? "") };
  if (!adaptador) return { ok: false, code: "adaptador_indisponivel", fallback };
  let r;
  try {
    r = await adaptador.consultar(codigo, transportadora);
  } catch {
    return { ok: false, code: "falha_adaptador", fallback };
  }
  if (!Array.isArray(r?.eventos)) return { ok: false, code: "resposta_invalida", fallback };
  // Só os 4 campos do contrato: o que a transportadora devolver a mais (destinatário, documento…) não
  // passa daqui (P8).
  return {
    ok: true,
    eventos: r.eventos.map((e) => ({
      data: e?.data ?? null, codigo: String(e?.codigo ?? ""), local: e?.local ?? null, descricao: e?.descricao ?? null,
    })),
  };
}
