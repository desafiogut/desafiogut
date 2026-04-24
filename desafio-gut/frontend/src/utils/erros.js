/**
 * Traduz erros de ethers.js / blockchain para PT-BR legível.
 * Centraliza a lógica de mensagens — nenhum componente lida com códigos raw.
 */
const MAP = {
  ACTION_REJECTED:          "Assinatura cancelada pelo usuário.",
  INSUFFICIENT_FUNDS:       "Saldo ETH insuficiente para cobrir o gás da transação.",
  NETWORK_ERROR:            "Erro de rede. Verifique sua conexão com a Sepolia.",
  CALL_EXCEPTION:           "Chamada ao contrato falhou. Verifique os dados da edição.",
  TIMEOUT:                  "Tempo limite excedido. A rede Sepolia pode estar congestionada.",
  UNPREDICTABLE_GAS_LIMIT:  "Não foi possível estimar o gás. A transação pode falhar.",
  NONCE_EXPIRED:            "Transação expirada. Tente novamente.",
  UNSUPPORTED_OPERATION:    "Operação não suportada pela carteira conectada.",
  MISSING_PROVIDER:         "Provider não encontrado. Faça login novamente.",
};

export function traduzirErro(err) {
  if (!err) return "Erro desconhecido.";
  const code = err?.code ?? "";
  if (MAP[code]) return MAP[code];
  if (err?.revert?.args?.[0]) return `Contrato: ${err.revert.args[0]}`;
  if (err?.reason)            return err.reason;
  const msg = err?.message ?? "";
  if (msg.includes("user rejected") || msg.includes("User rejected")) return MAP.ACTION_REJECTED;
  if (msg.includes("insufficient funds"))  return MAP.INSUFFICIENT_FUNDS;
  if (msg.includes("network"))             return MAP.NETWORK_ERROR;
  if (msg.includes("timeout"))             return MAP.TIMEOUT;
  if (msg.includes("nonce"))               return MAP.NONCE_EXPIRED;
  return msg || "Erro desconhecido.";
}
