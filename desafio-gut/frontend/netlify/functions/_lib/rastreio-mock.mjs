// Adaptador de rastreio FALSO (MC102.1a) — SÓ PARA TESTES.
//
// ⛔ Nenhum ficheiro de produção importa isto (HARD GATE 13). `_tests/rastreio.test.mjs` verifica-o
// varrendo `netlify/functions/` inteira. Quem precisar dele injecta-o:
//   consultarRastreio(codigo, transportadora, { adaptador: adaptadorMock })

/** Um envio que chegou ao fim, com uma tentativa falhada pelo caminho. Códigos genéricos. */
export const EVENTOS_MOCK = Object.freeze([
  Object.freeze({ data: "2026-09-20T12:00:00.000Z", codigo: "0", local: "Manaus/AM", descricao: "Objeto postado" }),
  Object.freeze({ data: "2026-09-21T08:30:00.000Z", codigo: "1", local: "Manaus/AM", descricao: "Objeto em trânsito" }),
  Object.freeze({ data: "2026-09-23T07:10:00.000Z", codigo: "2", local: "Manaus/AM", descricao: "Objeto na unidade de distribuição" }),
  Object.freeze({ data: "2026-09-23T09:00:00.000Z", codigo: "3", local: "Manaus/AM", descricao: "Objeto saiu para entrega" }),
  Object.freeze({ data: "2026-09-23T15:40:00.000Z", codigo: "A1", local: "Manaus/AM", descricao: "Destinatário ausente" }),
  Object.freeze({ data: "2026-09-24T14:20:00.000Z", codigo: "4", local: "Manaus/AM", descricao: "Objeto entregue ao destinatário" }),
]);

export const adaptadorMock = {
  async consultar() {
    return { eventos: EVENTOS_MOCK.map((e) => ({ ...e })) };
  },
};
