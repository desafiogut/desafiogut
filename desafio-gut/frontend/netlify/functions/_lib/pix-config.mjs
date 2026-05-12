// Fonte única dos canais PIX da plataforma (Especificação Refatorada §5).
//
// PIX_ADESAO: pagamento da Taxa de Adesão (Consultoria) — modo MANUAL.
//   Cliente envia PIX direto para a chave e o Admin aprova o perfil.
//   NÃO há automação webhook nesta frente — é por design (consultoria
//   exige verificação humana).
//
// PIX_FICHAS: pagamento das fichas de lance via Mercado Pago — modo AUTO.
//   A integração é por MP_ACCESS_TOKEN; o e-mail abaixo é apenas a
//   identidade da conta MP exibida ao cliente.

export const PIX_ADESAO = Object.freeze({
  email:    "familiaquildo@gmail.com",
  banco:    "Banco do Brasil",
  modo:     "manual",
  proposito: "Taxa de Adesão (Consultoria)",
  observacao: "Após o envio, o Admin precisa aprovar manualmente para ativar o perfil.",
});

export const PIX_FICHAS = Object.freeze({
  email:    "desafiogut@gmail.com",
  modo:     "mercadopago",
  proposito: "Compra de fichas de lance (Operação Interna)",
  observacao: "Liberação imediata via webhook do Mercado Pago após status=approved.",
});
