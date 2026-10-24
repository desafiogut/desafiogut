// UTAC111 — PIX do PRODUTO físico: o vencedor paga o valor do seu lance (14 pontos = R$ 0,14).
//
// Handlers REAIS (`iniciar-pagamento`, `webhook-mercadopago`, `confirmar-pagamento`) + `_lib/pedidos.mjs`
// e `_lib/jwt.mjs` REAIS. Duplos SÓ nas fronteiras de I/O: `@netlify/blobs` (duplo com ETag/CAS),
// a API do Mercado Pago (`mp-client`), o crédito de saldo R$ (espião — o produto NUNCA o pode chamar),
// rate-limit e Sentry.
//
// node --test --experimental-test-module-mocks _tests/utac111-pix-produto.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarBlobs } from "./_blobs-cas-duplo.mjs";

process.env.JWT_SECRET = "segredo-de-teste-utac111-com-comprimento-suficiente";
process.env.PIX_PROVIDER = "mercadopago";
process.env.MP_WEBHOOK_ALLOW_UNSIGNED = "true"; // a assinatura tem testes próprios (mc3917/mc592)

const EU = "0xaaa0000000000000000000000000000000000001";
const OUTRO = "0xbbb0000000000000000000000000000000000002";
const PRODUTO = "prod-airfryer";

let B;
const MP = { criados: [], pagamentos: new Map(), proximoId: 9000 };
const creditosSaldo = [];

mock.module("@netlify/blobs", { namedExports: { getStore: (o) => B.getStore(o) } });
mock.module("../_lib/cache.mjs", { namedExports: { cacheAside: async (_k, f) => f(), cacheDel: async () => {} } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
const alertas = [];
mock.module("../_lib/sentry-server.mjs", { namedExports: { captureSecurityAlert: async (k, p) => { alertas.push({ k, p }); }, mascararEnderecosProfundo: (v) => v } });
class MercadoPagoApiError extends Error { constructor(m, s) { super(m); this.status = s; } }
mock.module("../_lib/mp-client.mjs", {
  namedExports: {
    MercadoPagoApiError,
    fetchMP: async (path, { body, idempotencyKey }) => {
      const id = String(MP.proximoId++);
      MP.criados.push({ path, body, idempotencyKey, id });
      MP.pagamentos.set(id, { id, status: "pending", external_reference: body.external_reference, transaction_amount: body.transaction_amount });
      return { id, point_of_interaction: { transaction_data: { qr_code: "PIX-COPIA-COLA", qr_code_base64: null } } };
    },
    consultarPagamento: async (id) => {
      const p = MP.pagamentos.get(String(id));
      if (!p) throw new MercadoPagoApiError("not found", 404);
      return p;
    },
  },
});
mock.module("../_lib/saldoRs.mjs", {
  namedExports: {
    creditarSaldoRsIdempotente: async (a) => {
      creditosSaldo.push(a);
      return { ok: true, idempotent: false, resultado: { saldoAntesCentavos: 0, saldoDepoisCentavos: a.valorCentavos, processadoEm: "x" } };
    },
  },
});
mock.module("../_lib/cota-ativacao.mjs", { namedExports: { ativarCotaPaga: async () => ({ ok: true }) } });

const { assinarUserSession } = await import("../_lib/jwt.mjs");
const iniciar = (await import("../iniciar-pagamento.mjs")).default;
const webhook = (await import("../webhook-mercadopago.mjs")).default;
const confirmar = (await import("../confirmar-pagamento.mjs")).default;
const { marcarPedidoPago } = await import("../_lib/pedidos.mjs");

function semearPedido({ comprador = EU, valorPagoCentavos = 14, extra = {} } = {}) {
  B.gravar("pedidos", `pedido:${PRODUTO}`, {
    produtoId: PRODUTO, edicaoId: "R-7", comprador, produtoNome: "Air Fryer",
    valorPagoCentavos, txHash: "0xabc", morada: null, rastreio: null, nfe: null,
    criado_em: "2026-10-20T00:00:00.000Z", atualizado_em: "2026-10-20T00:00:00.000Z", historico: [], ...extra,
  });
}
const pedido = () => B.ler("pedidos", `pedido:${PRODUTO}`);

async function pedirPix(endereco = EU, corpo = {}) {
  const headers = { "content-type": "application/json" };
  if (endereco) headers.authorization = `Bearer ${await assinarUserSession(endereco)}`;
  const r = await iniciar(new Request("https://x/.netlify/functions/iniciar-pagamento", {
    method: "POST", headers, body: JSON.stringify({ tipo: "produto", produtoId: PRODUTO, ...corpo }),
  }));
  return { status: r.status, body: await r.json() };
}
const aprovar = (id, valor) => {
  const p = MP.pagamentos.get(String(id));
  p.status = "approved";
  if (valor !== undefined) p.transaction_amount = valor;
};
async function notificar(paymentId) {
  const r = await webhook(new Request(`https://x/.netlify/functions/webhook-mercadopago?data.id=${paymentId}&type=payment`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "payment", data: { id: String(paymentId) } }),
  }));
  return { status: r.status, body: await r.json() };
}
async function consultar(token) {
  const r = await confirmar(new Request("https://x/.netlify/functions/confirmar-pagamento", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }),
  }));
  return { status: r.status, body: await r.json() };
}

beforeEach(() => {
  B = criarBlobs();
  MP.criados.length = 0; MP.pagamentos.clear(); creditosSaldo.length = 0; alertas.length = 0;
});

test("A1: o PIX sai com o valor EXACTO do lance (14 → R$ 0,14) e a referência do pedido", async () => {
  semearPedido({ valorPagoCentavos: 14 });
  const r = await pedirPix();
  assert.equal(r.status, 200);
  assert.equal(r.body.valorCentavos, 14);
  assert.equal(r.body.valorBRL, 0.14);
  assert.equal(r.body.tipo, "produto");
  assert.equal(MP.criados.length, 1);
  assert.equal(MP.criados[0].body.transaction_amount, 0.14);
  assert.equal(MP.criados[0].body.external_reference, r.body.pedidoId);
  const meta = B.ler("pedidos-meta", r.body.pedidoId);
  assert.equal(meta.tipo, "produto");
  assert.equal(meta.produtoId, PRODUTO);
  assert.equal(meta.endereco, EU);
});

test("A2: o valor NUNCA vem do corpo (valorBRL/valorCentavos enviados são ignorados)", async () => {
  semearPedido({ valorPagoCentavos: 37 });
  const r = await pedirPix(EU, { valorBRL: 0.01, valorCentavos: 1, qtd: 50 });
  assert.equal(r.status, 200);
  assert.equal(MP.criados[0].body.transaction_amount, 0.37);
});

test("A3: só o VENCEDOR — sem token 401, outro endereço 404, já pago 409; nada é cobrado", async () => {
  semearPedido();
  assert.equal((await pedirPix(null)).status, 401);
  const o = await pedirPix(OUTRO);
  assert.equal(o.status, 404);
  assert.equal(o.body.error?.code ?? o.body.code, "pedido_nao_encontrado");
  B = criarBlobs();
  semearPedido({ extra: { pago_em: "2026-10-21T00:00:00.000Z" } });
  assert.equal((await pedirPix()).status, 409);
  assert.equal(MP.criados.length, 0);
});

test("A4: o depósito de saldo (sem `tipo`) continua igual — qtd 1 → R$ 2,00, meta sem produto", async () => {
  const r = await iniciar(new Request("https://x/.netlify/functions/iniciar-pagamento", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endereco: EU, qtd: 1 }),
  }));
  assert.equal(r.status, 200);
  const b = await r.json();
  assert.equal(MP.criados[0].body.transaction_amount, 2);
  assert.equal(B.ler("pedidos-meta", b.pedidoId).tipo, null);
});

test("B1: webhook APROVADO → pedido pago; NENHUM crédito de saldo R$", async () => {
  semearPedido();
  const r = await pedirPix();
  const paymentId = MP.criados[0].id;
  aprovar(paymentId);
  const w = await notificar(paymentId);
  assert.equal(w.status, 200);
  assert.equal(w.body.pago, true);
  const p = pedido();
  assert.ok(p.pago_em);
  assert.deepEqual(p.pagamento, { paymentId, valorCentavos: 14, fonte: "webhook" });
  assert.equal(p.historico.at(-1).evento, "pagamento_aprovado");
  assert.equal(creditosSaldo.length, 0);
  assert.ok(r.body.pedidoId);
});

test("B2: webhook com valor aprovado DIFERENTE do lance → não marca pago", async () => {
  semearPedido({ valorPagoCentavos: 14 });
  await pedirPix();
  const paymentId = MP.criados[0].id;
  aprovar(paymentId, 0.10);
  const w = await notificar(paymentId);
  assert.equal(w.body.pago, false);
  assert.equal(w.body.reason, "valor_divergente");
  assert.equal(pedido().pago_em, undefined);
  assert.equal(creditosSaldo.length, 0);
});

test("B3: webhook com pagamento ainda pendente → nada muda", async () => {
  semearPedido();
  await pedirPix();
  const w = await notificar(MP.criados[0].id);
  assert.equal(w.status, 200);
  assert.equal(pedido().pago_em, undefined);
});

test("C1: confirmação por consulta (fallback do webhook) marca pago; repetir e webhook depois são idempotentes", async () => {
  semearPedido();
  const r = await pedirPix();
  const paymentId = MP.criados[0].id;
  const antes = await consultar(r.body.token);
  assert.equal(antes.status, 402); // ainda pendente no MP
  assert.equal(pedido().pago_em, undefined);
  aprovar(paymentId);
  const c1 = await consultar(r.body.token);
  assert.equal(c1.status, 200);
  assert.equal(c1.body.tipo, "produto");
  assert.equal(c1.body.idempotent, false);
  const pagoEm = pedido().pago_em;
  assert.ok(pagoEm);
  assert.equal(pedido().pagamento.fonte, "confirmar-pagamento");
  const c2 = await consultar(r.body.token);
  assert.equal(c2.body.idempotent, true);
  const w = await notificar(paymentId);
  assert.equal(w.body.idempotent, true);
  assert.equal(pedido().pago_em, pagoEm);
  assert.equal(pedido().historico.filter((h) => h.evento === "pagamento_aprovado").length, 1);
  assert.equal(creditosSaldo.length, 0);
});

test("C2: o depósito de saldo continua a creditar R$ pela consulta (A/B: o ramo do produto não o desvia)", async () => {
  const r = await iniciar(new Request("https://x/.netlify/functions/iniciar-pagamento", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endereco: EU, qtd: 1 }),
  }));
  const b = await r.json();
  aprovar(MP.criados[0].id);
  const c = await consultar(b.token);
  assert.equal(c.status, 200);
  assert.equal(creditosSaldo.length, 1);
  assert.equal(creditosSaldo[0].valorCentavos, 200);
});

test("C3: token de produto sem paymentId (caminho do mock) NUNCA marca pago", async () => {
  semearPedido();
  const { assinarPedido } = await import("../_lib/jwt.mjs");
  const token = await assinarPedido({ pedidoId: "p-1", endereco: EU, valorBRL: 0.14, tipo: "produto", produtoId: PRODUTO });
  const c = await consultar(token);
  assert.equal(c.status, 400);
  assert.equal(pedido().pago_em, undefined);
  assert.equal(creditosSaldo.length, 0);
});

// ── Achados do validador adversarial (SEG3) ──────────────────────────────────────────────────────
test("V6: pedido JÁ ENVIADO nunca gera PIX (409), como no cliente", async () => {
  semearPedido({ extra: { rastreio: { codigo: "AA123456789BR", transportadora: "Correios" } } });
  const r = await pedirPix();
  assert.equal(r.status, 409);
  assert.equal(MP.criados.length, 0);
});

test("V5 (X5): pedido sem valor de lance válido (0) nunca gera PIX", async () => {
  semearPedido({ valorPagoCentavos: 0 });
  assert.equal((await pedirPix()).status, 409);
  assert.equal(MP.criados.length, 0);
});

test("V4 (X1): marcarPedidoPago recusa outro endereço e não grava", async () => {
  semearPedido();
  const r = await marcarPedidoPago(PRODUTO, { endereco: OUTRO, valorCentavos: 14, paymentId: "1", fonte: "t" });
  assert.equal(r.code, "pedido_nao_encontrado");
  assert.equal(pedido().pago_em, undefined);
});

test("V3 (X3): token de produto sem produtoId → 400, nada marcado", async () => {
  semearPedido();
  const { assinarPedido } = await import("../_lib/jwt.mjs");
  const token = await assinarPedido({ pedidoId: "p-2", endereco: EU, valorBRL: 0.14, tipo: "produto", paymentId: "123" });
  assert.equal((await consultar(token)).status, 400);
  assert.equal(pedido().pago_em, undefined);
});

test("V1: dois PIX pagos para o mesmo pedido → 1 só pagamento gravado + ALERTA do 2.º (webhook e consulta)", async () => {
  semearPedido();
  const a = await pedirPix();
  // O 2.º clique reaproveita o mesmo PIX (E1). Para haver um 2.º código pago, o 1.º tem de ter expirado
  // no nosso registo enquanto o comprador ainda o pagava (o caso que o alerta cobre).
  const reg = pedido(); reg.pixPendente.expiraEm = "2000-01-01T00:00:00.000Z"; B.gravar("pedidos", `pedido:${PRODUTO}`, reg);
  const b = await pedirPix();
  const [p1, p2] = MP.criados.map((c) => c.id);
  assert.notEqual(p1, p2);
  aprovar(p1); aprovar(p2);
  assert.equal((await consultar(a.body.token)).status, 200);
  const c2 = await consultar(b.body.token);
  assert.equal(c2.body.idempotent, true);
  const w2 = await notificar(p2);
  assert.equal(w2.body.idempotent, true);
  assert.equal(pedido().pagamento.paymentId, p1);
  const dup = alertas.filter((x) => x.k === "pix_produto_pago_em_duplicado");
  assert.equal(dup.length, 2);
  assert.ok(dup.every((x) => x.p.paymentId === p2));
  assert.equal(alertas.filter((x) => x.k === "pix_produto_pago_em_duplicado" && x.p.paymentId === p1).length, 0);
  assert.equal(creditosSaldo.length, 0);
});

// ── Decisões do operador no fecho: reaproveitar o PIX pendente + expiração real (24 h) ─────────
const decodificar = (t) => JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString());

test("E1: o 2.º clique devolve o MESMO PIX pendente — nenhuma cobrança nova no MP", async () => {
  semearPedido();
  const a = await pedirPix();
  const b = await pedirPix();
  assert.equal(b.status, 200);
  assert.equal(MP.criados.length, 1);
  assert.equal(b.body.reutilizado, true);
  assert.equal(a.body.reutilizado, false);
  assert.equal(b.body.qrCodeText, a.body.qrCodeText);
  assert.equal(b.body.pedidoId, a.body.pedidoId);
  assert.equal(decodificar(b.body.token).paymentId, MP.criados[0].id);
});

test("E2: PIX pendente expirado, cancelado ou rejeitado → gera um novo", async () => {
  semearPedido();
  await pedirPix();
  const reg = pedido(); reg.pixPendente.expiraEm = new Date(Date.now() + 60_000).toISOString(); B.gravar("pedidos", `pedido:${PRODUTO}`, reg);
  await pedirPix(); // falta menos de 2 min → novo
  assert.equal(MP.criados.length, 2);
  for (const st of ["cancelled", "rejected", "expired"]) {
    MP.pagamentos.get(MP.criados.at(-1).id).status = st;
    await pedirPix();
  }
  assert.equal(MP.criados.length, 5);
  assert.equal(pedido().pixPendente.paymentId, MP.criados.at(-1).id);
});

test("E3: o PIX pendente já foi APROVADO → marca pago e responde 409 (não cobra outra vez)", async () => {
  semearPedido();
  await pedirPix();
  aprovar(MP.criados[0].id);
  const r = await pedirPix();
  assert.equal(r.status, 409);
  assert.equal(MP.criados.length, 1);
  assert.ok(pedido().pago_em);
  assert.equal(pedido().pixPendente, undefined);
  assert.equal(creditosSaldo.length, 0);
});

test("E4: expiração REAL — o MP recebe date_of_expiration a +24 h e o JWT dura até lá (não 15 min)", async () => {
  semearPedido();
  const t0 = Date.now();
  const r = await pedirPix();
  const exp = MP.criados[0].body.date_of_expiration;
  assert.match(exp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}-04:00$/);
  const alvo = Date.parse(exp);
  assert.ok(Math.abs(alvo - (t0 + 24 * 3600e3)) < 60_000, `expiração ${exp}`);
  assert.equal(Date.parse(r.body.validUntil), alvo);
  const jwt = decodificar(r.body.token);
  assert.ok(jwt.exp - jwt.iat > 23 * 3600, `TTL do JWT ${jwt.exp - jwt.iat}s`);
});

test("E5: A/B — o depósito de saldo NÃO leva date_of_expiration e o JWT continua de 15 min", async () => {
  const r = await iniciar(new Request("https://x/.netlify/functions/iniciar-pagamento", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endereco: EU, qtd: 1 }),
  }));
  const b = await r.json();
  assert.equal("date_of_expiration" in MP.criados[0].body, false);
  const jwt = decodificar(b.token);
  assert.equal(jwt.exp - jwt.iat, 15 * 60);
});

test("E6: corrida — outro pedido guardou um PIX válido entre a leitura e a escrita → devolve ESSE", async () => {
  semearPedido();
  const outro = { pedidoId: "p-outro", paymentId: "777", qrCodeText: "PIX-DO-OUTRO", qrCodeImage: null,
    expiraEm: new Date(Date.now() + 3600e3).toISOString(), valorCentavos: 14, simulated: false };
  B.g.antesDeGravar = (nome, m, k) => {
    if (nome !== "pedidos" || k !== `pedido:${PRODUTO}`) return false;
    const reg = JSON.parse(m.get(k)); reg.pixPendente = outro; m.set(k, JSON.stringify(reg)); return true;
  };
  const r = await pedirPix();
  assert.equal(r.status, 200);
  assert.equal(r.body.qrCodeText, "PIX-DO-OUTRO");
  assert.equal(r.body.reutilizado, true);
  assert.equal(pedido().pixPendente.paymentId, "777");
});
