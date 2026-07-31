// _lib/email.mjs — MC89.18 (Fase 6). Envio de e-mail via SendGrid.
// Carregamento lazy: o import de @sendgrid/mail só acontece na primeira
// chamada. Se a dependência não estiver instalada, o erro é claro.

let _sg = null;

async function getSendGrid() {
  if (_sg) return _sg;
  // Import dinâmico: se @sendgrid/mail não existir, o erro é apanhado pelo caller
  const sg = await import("@sendgrid/mail");
  const key = process.env.SENDGRID_API_KEY;
  if (!key) throw new Error("SENDGRID_API_KEY não configurada no ambiente");
  sg.default.setApiKey(key);
  _sg = sg.default;
  return _sg;
}

/**
 * Envia um e-mail transacional.
 * @param {{ para: string, assunto: string, mensagem: string, link?: string }} opts
 * @returns {Promise<{ ok: boolean, id?: string }>}
 */
export async function enviarEmail({ para, assunto, mensagem, link }) {
  const sg = await getSendGrid();

  const html = link
    ? `<p>${mensagem.replace(/\n/g, "<br>")}</p><p><a href="${link}">${link}</a></p>`
    : `<p>${mensagem.replace(/\n/g, "<br>")}</p>`;

  const [result] = await sg.send({
    to: para,
    from: { email: process.env.SENDGRID_FROM || "desafiogut@gmail.com", name: "DESAFIOGUT" },
    subject: assunto,
    html,
  });

  return { ok: result?.statusCode >= 200 && result?.statusCode < 300, id: result?.headers?.["x-message-id"] || null };
}
