// MockPixProvider — gera "PIX copia-e-cola" determinístico para Beta.
// Não tem efeito financeiro: o /confirmar-pagamento aceita qualquer JWT
// válido sem checar o provedor PIX. Para produção, trocar por
// MercadoPagoPixProvider via env PIX_PROVIDER.
//
// O formato do qrCodeText segue uma aproximação do EMV BR Code (PIX) só para
// que a UI mostre algo realista; um leitor PIX real recusaria (CRC inválido +
// chave fictícia), o que é proposital.

const PIX_KEY_FICTICIA = "desafiogut-mock@grupouniaoetrabalho.com.br";

export function gerarPedidoPix({ pedidoId, valorBRL }) {
  // EMV BR Code minimalista (não validado por banco). Inclui o pedidoId no
  // campo 62.05 (Reference Label) — útil para cross-referência visual.
  const valorFormatado = valorBRL.toFixed(2);
  const qrCodeText =
    "00020126" +
    `0014BR.GOV.BCB.PIX01${PIX_KEY_FICTICIA.length.toString().padStart(2,"0")}${PIX_KEY_FICTICIA}` +
    "5204000053039865406" + valorFormatado +
    "5802BR" +
    "5910DESAFIOGUT" +
    "6009SAO PAULO" +
    `62${(pedidoId.length + 4).toString().padStart(2,"0")}05${pedidoId.length.toString().padStart(2,"0")}${pedidoId}` +
    "6304MOCK"; // CRC fake — proposital, não é PIX real

  return {
    qrCodeText,
    qrCodeImage: null,    // Beta: UI renderiza o texto sem imagem
    simulated: true,
    providerName: "mock",
  };
}
