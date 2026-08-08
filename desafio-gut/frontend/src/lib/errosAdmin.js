// errosAdmin — mensagens de erro humanizadas para o painel ADM.
// MC89.26 (Fase 2). Traduz erros técnicos para português claro,
// com sugestão de ação quando aplicável.

const MAPA = [
  [/connection refused|failed to fetch|networkerror/i,
    "Falha de ligação ao servidor. Verifique a sua internet."],
  [/401|unauthorized|token.*expirado|token.*inválido/i,
    "Sessão expirada. Faça Login Admin novamente."],
  [/403|forbidden|nível.*insuficiente|sem permissão/i,
    "Sem permissão para esta ação. Contacte um super-admin."],
  [/404|não encontrado|not found/i,
    "Recurso não encontrado. Verifique o endereço e tente novamente."],
  [/429|too many requests|limite/i,
    "Demasiadas tentativas. Aguarde um momento e tente novamente."],
  [/500|internal server|erro interno/i,
    "Erro interno do servidor. Tente novamente ou verifique os logs."],
  [/503|indispon.vel|unavailable/i,
    "Serviço temporariamente indisponível. Tente novamente em instantes."],
];

/**
 * Devolve uma mensagem de erro em português.
 * @param {Error|string} err
 * @returns {string}
 */
export function mensagemHumana(err) {
  const msg = typeof err === "string" ? err : (err?.message || "");
  if (!msg) return "Ocorreu um erro inesperado. Tente novamente.";

  for (const [padrao, traducao] of MAPA) {
    if (padrao.test(msg)) return traducao;
  }

  // Fallback: devolve a mensagem original, truncada
  return msg.length > 120 ? msg.slice(0, 120) + "…" : msg;
}
