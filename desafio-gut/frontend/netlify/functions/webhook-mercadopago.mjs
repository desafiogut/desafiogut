// POST /.netlify/functions/webhook-mercadopago
// Recebe notificações do Mercado Pago (Webhooks/IPN) e registra pagamentos
// aprovados em Netlify Blobs (`mp-aprovados:${pedidoId}`).
//
// Suporta os dois formatos que o MP envia:
//   1) Webhooks v2 (JSON body):  { type:"payment", data:{ id:"<paymentId>" }, action:"payment.updated", ... }
//   2) IPN legado (query string): ?topic=payment&id=<paymentId>
//
// O handler responde 200 imediatamente após persistir (ou ignorar) — o MP
// expira o webhook se demorar muito e marca como "Falhou" no painel. A
// chamada GET /v1/payments/:id é síncrona aqui mas com timeout de 12s.
//
// Segurança (MC39.17.2 / B-P1-1): valida HMAC `x-signature` quando
// MP_WEBHOOK_SECRET está configurado (ver _lib/mp-signature.mjs). Enquanto o
// segredo não estiver set, mantém o comportamento anterior (fail-open) — o
// valor/status são re-buscados na API do MP e há idempotência por pedidoId.
//
// Configurar no painel do Mercado Pago:
//   Settings → Webhooks → URL = https://silly-stardust-ca71bc.netlify.app/.netlify/functions/webhook-mercadopago
//   Eventos: "Pagamentos" (payment).

import { getStore } from "@netlify/blobs";
import { consultarPagamento, MercadoPagoApiError } from "./_lib/mp-client.mjs";
import { jsonResponse, jsonError, parseJsonBody } from "./_lib/validate.mjs";
import { lerMetaPedido } from "./_lib/credito.mjs";
import { creditarSaldoRsIdempotente } from "./_lib/saldoRs.mjs";
// MC17.1 — pedidos de cota ativam a cota automaticamente (sem aprovação manual).
import { ativarCotaPaga } from "./_lib/cota-ativacao.mjs";
// MC39.17.2 (B-P1-1) — validação HMAC da assinatura do webhook.
import { validarAssinaturaMp } from "./_lib/mp-signature.mjs";

const BLOB_STORE_MP = "mp-aprovados";

function abrirStoreMp() {
  try {
    return getStore({ name: BLOB_STORE_MP, consistency: "strong" });
  } catch (err) {
    console.warn("[webhook-mp] Blobs indisponível:", err?.message);
    return null;
  }
}

// Extrai paymentId tanto do body (Webhooks v2) quanto da query (IPN legado).
async function extrairPaymentId(req) {
  const url = new URL(req.url);
  const qpId    = url.searchParams.get("id") || url.searchParams.get("data.id");
  const qpTopic = url.searchParams.get("topic") || url.searchParams.get("type");

  let body = null;
  try { body = await parseJsonBody(req); } catch {}

  const bodyId    = body?.data?.id || body?.resource || body?.id;
  const bodyTopic = body?.type || body?.topic;

  // resource pode vir como URL completa: https://api.mercadopago.com/v1/payments/123
  let paymentId = bodyId || qpId;
  if (typeof paymentId === "string" && paymentId.startsWith("http")) {
    const parts = paymentId.split("/").filter(Boolean);
    paymentId = parts[parts.length - 1];
  }

  const topic = bodyTopic || qpTopic;
  return { paymentId: paymentId ? String(paymentId) : null, topic };
}

export default async (req) => {
  const t0 = Date.now();
  console.info("[webhook-mp] recebido", { method: req.method, url: req.url });

  if (req.method !== "POST") {
    // MP só envia POST; aceita GET para teste manual mas sem efeito.
    return jsonResponse({ ok: true, hint: "use POST (MP envia notifications via POST)" });
  }

  // B-P1-1 — valida HMAC x-signature. O manifest usa `data.id` da query.
  // Fail-open enquanto MP_WEBHOOK_SECRET não estiver configurado.
  const dataIdQuery = new URL(req.url).searchParams.get("data.id")
    || new URL(req.url).searchParams.get("id");
  const sig = validarAssinaturaMp(req, dataIdQuery);
  if (!sig.ok) {
    console.warn("[webhook-mp] assinatura rejeitada", { motivo: sig.motivo });
    return jsonError(401, "assinatura_invalida", "x-signature ausente ou inválida");
  }
  if (!sig.enforced) {
    console.info("[webhook-mp] HMAC não aplicado (MP_WEBHOOK_SECRET ausente)");
  }

  let paymentId, topic;
  try {
    ({ paymentId, topic } = await extrairPaymentId(req));
    console.info("[webhook-mp] payload parsed", { paymentId, topic });
  } catch (err) {
    console.warn("[webhook-mp] parse falhou:", err?.message);
    return jsonResponse({ ok: true, ignored: "parse_falhou" });
  }

  // MP envia outros tipos de notification (merchant_order, chargebacks, etc.).
  // Nós só nos importamos com payment.
  if (topic && topic !== "payment" && !String(topic).startsWith("payment")) {
    console.info("[webhook-mp] topic ignorado:", topic);
    return jsonResponse({ ok: true, ignored: `topic_${topic}` });
  }
  if (!paymentId) {
    console.warn("[webhook-mp] payload sem paymentId");
    return jsonResponse({ ok: true, ignored: "sem_paymentId" });
  }

  // Consulta MP para descobrir status real e external_reference (= pedidoId).
  let pagamento;
  try {
    pagamento = await consultarPagamento(paymentId);
    console.info("[webhook-mp] consulta MP ok", {
      paymentId,
      status: pagamento?.status,
      external_reference: pagamento?.external_reference,
      transaction_amount: pagamento?.transaction_amount,
    });
  } catch (err) {
    console.error("[webhook-mp] consulta MP falhou:", {
      paymentId, name: err?.name, code: err?.code, status: err?.status, message: err?.message,
    });
    // Mesmo com falha, retorna 200 para o MP não retentar agressivamente.
    // Próxima chamada de confirmar-pagamento vai consultar live novamente.
    return jsonResponse({ ok: true, error: "mp_lookup_falhou", paymentId });
  }

  const pedidoId = pagamento?.external_reference;
  const status   = pagamento?.status;
  if (!pedidoId) {
    console.warn("[webhook-mp] pagamento sem external_reference (não veio do nosso fluxo)", {
      paymentId, status,
    });
    return jsonResponse({ ok: true, ignored: "sem_external_reference", paymentId });
  }

  if (status !== "approved") {
    console.info("[webhook-mp] status ainda não aprovado", { paymentId, pedidoId, status });
    return jsonResponse({ ok: true, ignored: `status_${status}`, pedidoId, paymentId });
  }

  // Persiste aprovação. Idempotente: re-gravação com mesmo conteúdo é no-op.
  // Importante: gravar ANTES de creditar para que confirmar-pagamento (caminho
  // rápido) consiga ler o status do MP sem nova chamada à API.
  const storeMp = abrirStoreMp();
  if (storeMp) {
    try {
      await storeMp.setJSON(pedidoId, {
        status: "approved",
        paymentId: String(paymentId),
        capturadoEm: new Date().toISOString(),
        fonte: "webhook",
      });
    } catch (err) {
      console.warn("[webhook-mp] gravar mp-aprovados falhou (não-fatal):", err?.message);
    }
  }

  // ── Crédito R$ reativo ──────────────────────────────────────────────────
  // Modelo dual (Frente B.9): aprovação MP credita R$ no blob saldo-rs.
  // Senhas on-chain só vêm de /comprar-senhas (R$ → senhas). Lê metadados
  // do pedido (gravados em iniciar-pagamento) para descobrir endereco/valor.
  const meta = await lerMetaPedido(pedidoId);

  // MC17.1 — pedido de COTA: ativa a cota e credita o troco automaticamente
  // (sem aprovação manual do admin). Idempotente por pedidoId em cota-ativacao.
  if (meta?.tipo === "cota") {
    const ativacao = await ativarCotaPaga({
      pedidoId, endereco: meta.endereco, categoria: meta.categoria,
      produtoValor: meta.produtoValor, produtoNome: meta.produtoNome, fonte: "webhook",
    });
    console.info("[webhook-mp] cota ativada", {
      pedidoId, categoria: meta.categoria, ok: ativacao.ok, idempotent: !!ativacao.idempotent,
    });
    return jsonResponse({
      ok: true, recorded: true, cota_ativada: ativacao.ok, idempotent: !!ativacao.idempotent,
      pedidoId, paymentId, categoria: meta.categoria, troco: ativacao.resultado?.troco || null,
    });
  }

  if (!meta?.endereco || !meta?.valorBRL) {
    console.warn("[webhook-mp] meta do pedido ausente, crédito ficará para confirmar-pagamento", {
      pedidoId, paymentId, hasMeta: !!meta,
    });
    return jsonResponse({ ok: true, recorded: true, credited: false, reason: "meta_ausente", pedidoId, paymentId });
  }
  const valorCentavos = Math.round(Number(meta.valorBRL) * 100);

  const credito = await creditarSaldoRsIdempotente({
    pedidoId,
    endereco: meta.endereco,
    valorCentavos,
    fonte: "webhook",
  });

  if (!credito.ok) {
    // Não retornamos 5xx para o MP não retentar agressivamente — o cliente
    // ainda pode usar polling/confirmar-pagamento como fallback.
    console.error("[webhook-mp] credito R$ falhou (fallback p/ confirmar-pagamento):", {
      pedidoId, code: credito.code, message: credito.message,
    });
    return jsonResponse({ ok: true, recorded: true, credited: false, reason: credito.code, pedidoId, paymentId });
  }

  console.info("[webhook-mp] aprovado e creditado em R$", {
    pedidoId, paymentId,
    valorCentavos,
    saldoAntes:  credito.resultado.saldoAntesCentavos,
    saldoDepois: credito.resultado.saldoDepoisCentavos,
    idempotent: credito.idempotent,
    duracaoMs: Date.now() - t0,
  });
  return jsonResponse({
    ok: true,
    recorded: true,
    credited: true,
    idempotent: credito.idempotent,
    pedidoId,
    paymentId,
    valorCentavos,
    saldoRsDepoisCentavos: credito.resultado.saldoDepoisCentavos,
  });
};
