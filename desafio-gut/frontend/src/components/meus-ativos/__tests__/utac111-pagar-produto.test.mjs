// UTAC111 — o cartão do VENCEDOR em «Meus pedidos»: paga o produto por PIX no valor do seu lance.
// node --test src/components/meus-ativos/__tests__/utac111-pagar-produto.test.mjs   (a partir de desafio-gut/frontend)
//
// (1) regra pura (`precisaPagarProduto`, `rotuloDoPedido`); (2) o cartão RENDERIZADO, bidireccional (aparece ao
// dono por pagar; NÃO a outro endereço, nem pago, nem já enviado); (3) o hook REAL `usePagarProduto` com um
// duplo de `fetch` (o `apiPost` real corre): pede o PIX com o Bearer e SEM valor no corpo, e sonda a confirmação.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { carregar, render, texto, fechar } from "./_render.mjs";
import { opcoesServidorTeste } from "../../../__tests__/_servidor-teste.mjs";
import { precisaPagarProduto, rotuloDoPedido } from "../../../lib/pedidos.js";

const DONO = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OUTRO = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const POR_PAGAR = {
  produtoId: "11111111-2222-3333-4444-555555555555", edicaoId: "R-7", comprador: DONO,
  produtoNome: "Air Fryer", valorPagoCentavos: 14, morada: null, rastreio: null,
};
const MORADA = { nome: "Maria", logradouro: "Rua A", numero: "1", bairro: "B", cidade: "Manaus", uf: "AM", cep: "69027010" };
const RASTREIO = { codigo: "AA123456789BR", transportadora: "Correios", enviado_em: "2026-09-20T12:00:00.000Z" };

let Cartao, vite, montar, usePagarProduto;
before(async () => {
  Cartao = await carregar("/src/components/meus-ativos/__tests__/_cartao-pedido.jsx");
  vite = await createServer(opcoesServidorTeste());
  ({ montar } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ usePagarProduto } = await vite.ssrLoadModule("/src/hooks/usePagarProduto.js"));
});
after(async () => { await fechar(); if (vite) await vite.close(); });

const props = (pedido, endereco) => ({ pedido, endereco, authToken: "tok", isMobile: false, aoGravar() {} });
const temCartao = (html) => /data-pagar-produto/.test(html);

// ── (1) regra pura ────────────────────────────────────────────────────────────────────────────────
test("R1: precisa pagar só o DONO, sem pago_em, antes do envio, com valor válido", () => {
  assert.equal(precisaPagarProduto(POR_PAGAR, DONO), true);
  assert.equal(precisaPagarProduto(POR_PAGAR, DONO.toUpperCase().replace("0X", "0x")), true);
  assert.equal(precisaPagarProduto(POR_PAGAR, OUTRO), false);
  assert.equal(precisaPagarProduto(POR_PAGAR, null), false);
  assert.equal(precisaPagarProduto({ ...POR_PAGAR, pago_em: "2026-10-24T00:00:00Z" }, DONO), false);
  assert.equal(precisaPagarProduto({ ...POR_PAGAR, rastreio: RASTREIO }, DONO), false);
  for (const v of [0, -1, 1.5, null, "14", undefined]) {
    assert.equal(precisaPagarProduto({ ...POR_PAGAR, valorPagoCentavos: v }, DONO), false, `valor ${v}`);
  }
});

test("R2: rótulo — «Aguardando pagamento» → «Pago — aguardando envio»; o envio não muda", () => {
  assert.equal(rotuloDoPedido(POR_PAGAR, DONO), "Aguardando pagamento");
  const pago = { ...POR_PAGAR, pago_em: "2026-10-24T00:00:00Z" };
  assert.equal(rotuloDoPedido({ ...pago, morada: MORADA }, DONO), "Pago — aguardando envio");
  assert.equal(rotuloDoPedido(pago, DONO), "Falta o endereço de entrega");
  assert.equal(rotuloDoPedido({ ...pago, morada: MORADA, rastreio: RASTREIO }, DONO), "Enviado");
});

// ── (2) o cartão renderizado ─────────────────────────────────────────────────────────────────────
test("C1: o DONO por pagar vê o cartão, o valor do lance (R$ 0,14) e o botão «Pagar Produto via PIX»", () => {
  const html = render(Cartao, props(POR_PAGAR, DONO));
  const t = texto(html);
  assert.ok(temCartao(html));
  assert.match(t, /Parabéns! Você venceu o Menor Lance Único\. Adquira o seu produto pagando o valor do seu lance\./);
  assert.match(t, /Valor a pagar: R\$ 0,14/);
  assert.match(t, /Pagar Produto via PIX/);
  assert.match(t, /Aguardando pagamento/);
  assert.match(t, /valor do lance R\$ 0,14/);
  assert.doesNotMatch(t, /valor pago/);
  assert.match(html, /data-acao="pagar-produto"/);
});

test("C2: NÃO aparece a outro endereço, sem sessão, depois de pago, nem já enviado", () => {
  assert.ok(!temCartao(render(Cartao, props(POR_PAGAR, OUTRO))));
  assert.ok(!temCartao(render(Cartao, props(POR_PAGAR, null))));
  const pago = render(Cartao, props({ ...POR_PAGAR, pago_em: "2026-10-24T00:00:00Z", morada: MORADA }, DONO));
  assert.ok(!temCartao(pago));
  assert.match(texto(pago), /Pago — aguardando envio/);
  assert.match(texto(pago), /valor pago R\$ 0,14/);
  assert.ok(!temCartao(render(Cartao, props({ ...POR_PAGAR, rastreio: RASTREIO, morada: MORADA }, DONO))));
});

// ── (3) o hook real ──────────────────────────────────────────────────────────────────────────────
function fetchDuplo(confirmacoes) {
  const pedidos = [];
  let i = 0;
  const resp = (status, corpo) => new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
  const fn = async (url, init = {}) => {
    pedidos.push({ url: String(url), headers: init.headers || {}, body: init.body ? JSON.parse(init.body) : null });
    if (String(url).endsWith("iniciar-pagamento")) {
      return resp(200, { tipo: "produto", valorCentavos: 14, valorBRL: 0.14, qrCodeText: "PIX-COPIA-COLA", qrCodeImage: null, token: "tok-pedido" });
    }
    const [status, corpo] = confirmacoes[Math.min(i++, confirmacoes.length - 1)];
    return resp(status, corpo);
  };
  return { fn, pedidos };
}

test("H1: pagar() pede o PIX com Bearer e SEM valor no corpo; 402 continua a sondar; 200 → pago + aoPagar", async (t) => {
  const d = fetchDuplo([[402, { error: { code: "pagamento_nao_confirmado" } }], [200, { ok: true, tipo: "produto" }]]);
  const original = globalThis.fetch;
  globalThis.fetch = d.fn;
  t.after(() => { globalThis.fetch = original; });
  let pagos = 0;
  const c = montar(usePagarProduto, [{ produtoId: POR_PAGAR.produtoId, authToken: "sessao", aoPagar: () => { pagos += 1; }, intervaloMs: 5 }]);
  t.after(() => c.desmontar());
  await c.resultado().pagar();
  await c.assentar();
  assert.equal(c.resultado().pix?.qrCodeText, "PIX-COPIA-COLA");
  const ini = d.pedidos[0];
  assert.match(ini.url, /iniciar-pagamento$/);
  assert.equal(ini.headers.Authorization, "Bearer sessao");
  assert.deepEqual(ini.body, { tipo: "produto", produtoId: POR_PAGAR.produtoId });
  for (let n = 0; n < 50 && c.resultado().estado !== "pago"; n++) { await new Promise((r) => setTimeout(r, 10)); await c.assentar(); }
  assert.equal(c.resultado().estado, "pago");
  assert.equal(pagos, 1);
  const conf = d.pedidos.filter((p) => /confirmar-pagamento$/.test(p.url));
  assert.ok(conf.length >= 2, "sondou depois do 402");
  assert.deepEqual(conf[0].body, { token: "tok-pedido" });
});

test("H2: sem sessão não chama a rede; token expirado (401) → erro visível", async (t) => {
  const d = fetchDuplo([[401, { error: { code: "token_expirado" } }]]);
  const original = globalThis.fetch;
  globalThis.fetch = d.fn;
  t.after(() => { globalThis.fetch = original; });
  const sem = montar(usePagarProduto, [{ produtoId: "x", authToken: null, intervaloMs: 5 }]);
  t.after(() => sem.desmontar());
  await sem.resultado().pagar();
  await sem.assentar();
  assert.equal(sem.resultado().estado, "erro");
  assert.equal(d.pedidos.length, 0);
  const c = montar(usePagarProduto, [{ produtoId: "x", authToken: "s", intervaloMs: 5 }]);
  t.after(() => c.desmontar());
  await c.resultado().pagar();
  for (let n = 0; n < 50 && c.resultado().estado !== "erro"; n++) { await new Promise((r) => setTimeout(r, 10)); await c.assentar(); }
  assert.equal(c.resultado().estado, "erro");
  assert.match(c.resultado().erro, /expirou/);
});

test("H3: a sondagem segue a expiração REAL do PIX — expirado ⇒ erro, sem mais consultas", async (t) => {
  const pedidos = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    pedidos.push(String(url));
    const corpo = String(url).endsWith("iniciar-pagamento")
      ? { qrCodeText: "PIX", token: "tok", validUntil: new Date(Date.now() - 1000).toISOString() }
      : { error: { code: "pagamento_nao_confirmado" } };
    return new Response(JSON.stringify(corpo), { status: String(url).endsWith("iniciar-pagamento") ? 200 : 402, headers: { "content-type": "application/json" } });
  };
  t.after(() => { globalThis.fetch = original; });
  const c = montar(usePagarProduto, [{ produtoId: "x", authToken: "s", intervaloMs: 5 }]);
  t.after(() => c.desmontar());
  await c.resultado().pagar();
  for (let n = 0; n < 50 && c.resultado().estado !== "erro"; n++) { await new Promise((r) => setTimeout(r, 10)); await c.assentar(); }
  assert.equal(c.resultado().estado, "erro");
  assert.match(c.resultado().erro, /expirou/);
  assert.equal(pedidos.filter((u) => u.endsWith("confirmar-pagamento")).length, 0);
});
