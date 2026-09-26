// historicoChat.js — MC96.1.
//
// Mapeia as mensagens do widget para o `historico` que o backend aceita ({role, content}).
// Vive num .js (e não dentro do ChatbotWidget.jsx) porque o node:test não interpreta JSX:
// um helper lá dentro não é testável, e um helper não testado foi exactamente o que falhou
// no MC95.2.
//
// ⚠️ Chamado ANTES do setMensagens da pergunta actual: o React não actualiza o estado de
// forma síncrona, por isso o que chega aqui são os turnos ANTERIORES — que é o correcto,
// porque a pergunta actual vai no campo `pergunta`. Sem isto, apareceria duplicada.

/** Máximo de mensagens enviadas (igual a HISTORICO_MAX no backend). */
export const HISTORICO_MAX_UI = 8;

/** @param {Array<{role?:string,texto?:string}>} ms */
export function historicoParaEnviar(ms, max = HISTORICO_MAX_UI) {
  return (Array.isArray(ms) ? ms : [])
    .filter((m) => m && typeof m.texto === "string" && m.texto.trim())
    .slice(-max)
    .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.texto.trim() }));
}
