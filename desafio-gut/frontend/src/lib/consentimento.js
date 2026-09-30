// MC104 — envio do aceite do gate legal ao servidor (LGPD art. 8º §2º).
//
// O gate (TermosConsentimento.jsx) corre ANTES do login e guarda o aceite em localStorage
// (`gut_consentimento`). Não há endereço nesse momento. Depois do login, o AppContext chama
// `enviarConsentimentoPendente` com o endereço e o token: o aceite é enviado UMA vez por endereço
// (marca `enviadoPara`). O servidor é idempotente pelo mesmo aceite, logo um reenvio é inofensivo.
//
// Lógica pura (storage e apiPost injectados) — testável com node:test.

export const CHAVE_CONSENTIMENTO = "gut_consentimento";

/** Devolve o corpo a enviar, ou null se não houver nada pendente para este endereço. */
export function consentimentoPendente(raw, endereco, versaoAtual) {
  if (!raw || !endereco) return null;
  let c;
  try { c = JSON.parse(raw); } catch { return null; }
  if (!c || c.aceito !== true || c.versao !== versaoAtual) return null;
  if (!c.aceitos || typeof c.aceitos !== "object") return null; // aceite anterior ao MC104: sem declarações
  const ender = String(endereco).toLowerCase();
  // O aceite é do APARELHO e vale só para a 1.ª conta que entra depois do clique (R18 MC104 #4):
  // outra conta no mesmo aparelho NÃO herda uma prova de consentimento que não deu.
  if (typeof c.titularLocal === "string" && c.titularLocal !== ender) return null;
  if (Array.isArray(c.enviadoPara) && c.enviadoPara.includes(ender)) return null;
  return {
    endereco: ender,
    versao: c.versao,
    aceitos: c.aceitos,
    aceiteDeclaradoEm: c.timestamp,
  };
}

/**
 * Envia o aceite pendente. Só marca como enviado se o servidor confirmar (200/201).
 * @returns {Promise<"enviado"|"nada"|"falhou">}
 */
export async function enviarConsentimentoPendente({ endereco, token, versaoAtual, storage, apiPost }) {
  if (!token) return "nada";
  let raw;
  try { raw = storage.getItem(CHAVE_CONSENTIMENTO); } catch { return "nada"; }
  const corpo = consentimentoPendente(raw, endereco, versaoAtual);
  if (!corpo) return "nada";
  // Fixa a conta ANTES do envio: se este falhar, outra conta não o herda na tentativa seguinte.
  try {
    const c = JSON.parse(raw);
    if (c.titularLocal !== corpo.endereco) storage.setItem(CHAVE_CONSENTIMENTO, JSON.stringify({ ...c, titularLocal: corpo.endereco }));
  } catch { return "nada"; } // sem storage não se consegue fixar a conta → não enviar
  let resp;
  try { resp = await apiPost("consentimento", corpo, { token }); } catch { return "falhou"; }
  if (!resp?.ok) return "falhou";
  try {
    const c = JSON.parse(storage.getItem(CHAVE_CONSENTIMENTO));
    const lista = Array.isArray(c.enviadoPara) ? c.enviadoPara : [];
    storage.setItem(CHAVE_CONSENTIMENTO, JSON.stringify({ ...c, enviadoPara: [...lista, corpo.endereco] }));
  } catch { /* sem storage: o servidor é idempotente, o próximo login reenvia sem duplicar */ }
  return "enviado";
}
