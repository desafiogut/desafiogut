// MercadoPagoPixProvider — gera cobrança PIX real via API do Mercado Pago.
//
// Ativação: setar `PIX_PROVIDER=mercadopago` + `MP_ACCESS_TOKEN` no Netlify.
// Em sandbox usar token `TEST-...`; em produção, token de produção.
//
// ⚠️  GAP DE SEGURANÇA AINDA NÃO FECHADO (B.6 / futuro):
//     `confirmar-pagamento.mjs` credita on-chain confiando apenas no JWT
//     emitido por `iniciar-pagamento`. Ele NÃO consulta o status do
//     `paymentId` no Mercado Pago antes de creditar. Antes de habilitar
//     este provider em produção real (com dinheiro), implementar:
//       (a) webhook MP em /.netlify/functions/webhook-mp que persiste
//           pagamentos aprovados em Blobs por external_reference (pedidoId), e
//       (b) confirmar-pagamento checar status="approved" via Blobs ou via
//           GET /v1/payments/{id} antes de chamar creditarSenhas.
//
// Endpoint usado: POST https://api.mercadopago.com/v1/payments
// Docs: https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post

const MP_API_BASE = "https://api.mercadopago.com";
const TIMEOUT_MS  = 12_000;

class MercadoPagoConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "MercadoPagoConfigError";
    this.code = "mp_config_invalida";
  }
}
class MercadoPagoApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "MercadoPagoApiError";
    this.code = "mp_api_falhou";
    this.status = status;
    this.body = body;
  }
}

function lerTokenObrigatorio() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token || typeof token !== "string" || token.length < 10) {
    throw new MercadoPagoConfigError(
      "MP_ACCESS_TOKEN ausente ou inválido — configure no Netlify (Functions, secret)"
    );
  }
  return token;
}

async function fetchComTimeout(url, options) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function gerarPedidoPix({ pedidoId, valorBRL }) {
  const token = lerTokenObrigatorio();

  const body = {
    transaction_amount: Number(valorBRL),
    description: `DesafioGUT — pedido ${pedidoId}`,
    payment_method_id: "pix",
    external_reference: pedidoId,
    payer: {
      // MP exige email do payer mesmo para PIX. Usamos placeholder e o
      // próprio MP coleta o real do pagador via app bancário.
      email: "pagador@desafiogut.com.br",
    },
  };

  let resp;
  try {
    resp = await fetchComTimeout(`${MP_API_BASE}/v1/payments`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        // Idempotency-Key: protege contra duplo POST com mesmo pedidoId.
        "X-Idempotency-Key": pedidoId,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new MercadoPagoApiError(
      err?.name === "AbortError" ? "timeout ao chamar Mercado Pago" : `falha de rede: ${err?.message}`,
      { status: 0 }
    );
  }

  let data = null;
  try { data = await resp.json(); } catch {}

  if (!resp.ok) {
    throw new MercadoPagoApiError(
      data?.message || `MP retornou HTTP ${resp.status}`,
      { status: resp.status, body: data }
    );
  }

  const tx = data?.point_of_interaction?.transaction_data;
  if (!tx?.qr_code) {
    throw new MercadoPagoApiError(
      "resposta MP sem qr_code (point_of_interaction.transaction_data)",
      { status: resp.status, body: data }
    );
  }

  return {
    qrCodeText: tx.qr_code,
    qrCodeImage: tx.qr_code_base64 ? `data:image/png;base64,${tx.qr_code_base64}` : null,
    simulated: false,
    providerName: "mercadopago",
    paymentId: data.id ? String(data.id) : null,
  };
}
