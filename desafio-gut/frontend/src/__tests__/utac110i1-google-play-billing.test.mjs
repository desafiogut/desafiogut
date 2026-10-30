// google-play-billing.test.mjs — UTAC110i.1 · FRENTE B (SEG0) — abstracção do Google Play Billing.
//
// O que se prova (GATE 8 — bidireccional em cada alegação):
//   (a) POSITIVO — Android nativo + plugin disponível ⇒ `iniciarCompra` regista o SKU CERTO,
//       inicializa a loja, encomenda, e devolve o `purchaseToken` que o servidor vai validar;
//   (b) NEGATIVO — PWA/web/iOS ou plugin indisponível ⇒ `billing_indisponivel` e ZERO idas à loja
//       (é isto que garante o «PWA continua 100% funcional com PIX»);
//   (c) ENTRADA INVÁLIDA — tipo desconhecido ⇒ `tipo_invalido`, sem tocar na loja;
//   + fail-closed (a ponte nativa lança ⇒ indisponível, nunca Billing por engano);
//   + os desfechos da loja (erro, cancelamento, SKU divergente, sem token, produto que não carrega);
//   + `confirmarCompra` (finish/consumo) e `consultarCompras` (retoma de entrega).
//
// Instrumentos: servidor Vite do repo (`_servidor-teste.mjs`) com aliases para os DOIS pacotes
// externos — o duplo do plugin e o duplo do `@capacitor/core` (`src/lib/__tests__/_duplo-*`).
// O módulo sob teste corre o CÓDIGO REAL; o que é substituído são só as fronteiras nativas.
//
// ⚠️ MEDIDO e por isso testado: o pacote real toca `window.console` no TOPO do módulo e rebenta
// em Node (`ReferenceError: window is not defined`). O arnês corre sem `window` — logo, se este
// ficheiro passa, está provado que a abstracção é SSR-segura (import dinâmico + guardas primeiro).

import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "./_servidor-teste.mjs";
import {
  CONTROLO, REGISTO, reiniciarBillingDuplo, skusRegistados, espoletarProduto, store,
} from "../lib/__tests__/_duplo-cdv-purchase.mjs";
import { CONTROLO_CAPACITOR, reiniciarDuploCapacitor, ARRANCAR_ANDROID } from "../lib/__tests__/_duplo-capacitor.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const DUPLO_PLUGIN = resolve(AQUI, "..", "lib", "__tests__", "_duplo-cdv-purchase.mjs");
const DUPLO_CAPACITOR = resolve(AQUI, "..", "lib", "__tests__", "_duplo-capacitor.mjs");

let vite, modulo;

before(async () => {
  const { createServer } = await import(
    pathToFileURL(resolve(AQUI, "..", "..", "node_modules", "vite", "dist", "node", "index.js")).href
  );
  vite = await createServer({
    ...opcoesServidorTeste({
      alias: [
        { find: /^@capacitor\/core$/, replacement: DUPLO_CAPACITOR },
        { find: /^capacitor-plugin-cdv-purchase$/, replacement: DUPLO_PLUGIN },
      ],
    }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error",
    optimizeDeps: { noDiscovery: true },
  });
  modulo = await vite.ssrLoadModule("/src/lib/google-play-billing.js");
});
after(async () => { if (vite) await vite.close(); });

// ⚠️ O duplo do plugin e o do Capacitor são avaliados DUAS vezes (o `import` do Node deste ficheiro
// e o grafo do `ssrLoadModule` do alvo). Todo o estado deles vive no `globalThis`, logo as duas
// instâncias partilham controlo e registos — sem isso, o teste leria um `REGISTO` que o alvo nunca
// toca e o verde (ou o vermelho) seria falso. O par positivo/negativo de cada teste é ele próprio o
// controlo desta ligação: com o estado separado, o teste (a) falharia (o alvo veria o braço «web»).
beforeEach(() => {
  reiniciarBillingDuplo();
  reiniciarDuploCapacitor();
  modulo._reiniciarParaTeste();
});

const COMPRA_OK = { sku: "passe_relampago_r2", purchaseToken: "TOKEN-PLAY-AAA", orderId: "GPA.3399-1" };

// ─── (a) POSITIVO ─────────────────────────────────────────────────────────────────────────────
test("(a) Android nativo + plugin ⇒ compra aprovada devolve o purchaseToken do SKU certo", async () => {
  ARRANCAR_ANDROID();
  reiniciarBillingDuplo({ transacaoAprovada: { ...COMPRA_OK } });
  assert.equal(modulo.billingDisponivel(), true, "controlo: o guarda devia abrir no Android");

  const r = await modulo.iniciarCompra("relampago");
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.tipo, "relampago");
  assert.equal(r.sku, "passe_relampago_r2");
  assert.equal(r.purchaseToken, "TOKEN-PLAY-AAA");
  assert.equal(r.orderId, "GPA.3399-1");
  assert.equal(r.acknowledged, false);
  assert.deepEqual(skusRegistados(), ["passe_relampago_r2", "passe_programado_r2"], "UTAC119: os DOIS SKUs registam-se juntos, antes do initialize");
  assert.equal(REGISTO.register[0][0].type, "consumable", "R18-110i-7: os dois SKUs são CONSUMÍVEIS");
  assert.equal(REGISTO.register[0][0].platform, "android-playstore");
  assert.equal(REGISTO.initialize, 1, "a loja inicializa uma vez");
  assert.equal(REGISTO.order.length, 1, "devia ter encomendado 1 vez");
  assert.equal(REGISTO.order[0].productId, "passe_relampago_r2");
});

test("(a) o Programado regista o SEU SKU (nunca o do Relâmpago) e não traz créditos de lance", async () => {
  ARRANCAR_ANDROID();
  reiniciarBillingDuplo({ transacaoAprovada: { sku: "passe_programado_r2", purchaseToken: "TOKEN-PLAY-BBB", orderId: "GPA.3399-2" } });
  const r = await modulo.iniciarCompra("programado");
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.tipo, "programado");
  assert.deepEqual(skusRegistados(), ["passe_relampago_r2", "passe_programado_r2"], "UTAC119: idem na compra do Programado");
  assert.match(REGISTO.order[0].productId, /programado/);
});

test("(a) duas compras seguidas: UM só listener `approved` (registar o mesmo callback 2× lançaria)", async () => {
  ARRANCAR_ANDROID();
  reiniciarBillingDuplo({ transacaoAprovada: { ...COMPRA_OK } });
  assert.equal((await modulo.iniciarCompra("relampago")).ok, true);
  assert.equal((await modulo.iniciarCompra("relampago")).ok, true);
  assert.equal(REGISTO.listeners.approved, 1, `listeners approved instalados: ${REGISTO.listeners.approved}`);
  assert.equal(REGISTO.initialize, 1, "inicializou mais de uma vez");
});


// ─── UTAC119 — ORDEM DO REGISTO (bug ITEM_UNAVAILABLE do Passe Programado) ─────────────────────
test("UTAC119: comprar o PROGRAMADO sem nunca ter comprado o Relâmpago ⇒ registo completo ANTES do initialize", async () => {
  ARRANCAR_ANDROID();
  reiniciarBillingDuplo({ transacaoAprovada: { sku: "passe_programado_r2", purchaseToken: "TOKEN-PLAY-BBB", orderId: "GPA.3399-2" } });

  const r = await modulo.iniciarCompra("programado");

  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(skusRegistados(), ["passe_relampago_r2", "passe_programado_r2"]);
  assert.equal(REGISTO.initialize, 1);
  // A prova da ORDEM: o `register` tem de vir antes do `initialize` no log do duplo.
  const iReg = REGISTO.ordem.findIndex((e) => e.op === "register");
  const iInit = REGISTO.ordem.findIndex((e) => e.op === "initialize");
  assert.ok(iReg >= 0 && iInit >= 0, `ordem registada: ${JSON.stringify(REGISTO.ordem)}`);
  assert.ok(iReg < iInit, `UTAC119: register ANTES do initialize (obtido: ${JSON.stringify(REGISTO.ordem)})`);
  assert.equal(REGISTO.order[0].productId, "passe_programado_r2");
});

test("UTAC119: SKU não carregado ⇒ chama store.update() e conclui (não falha em silêncio)", async () => {
  ARRANCAR_ANDROID();
  reiniciarBillingDuplo({ produtosImediatos: false, transacaoAprovada: { sku: "passe_programado_r2", purchaseToken: "TOKEN-UPD", orderId: "GPA.UPD" } });

  const r = await modulo.iniciarCompra("programado");

  assert.equal(r.ok, true, JSON.stringify(r));
  assert.ok(REGISTO.ordem.some((e) => e.op === "update"), "não pediu reload à loja");
  assert.equal(REGISTO.order[0].productId, "passe_programado_r2");
});

// ─── (b) NEGATIVO — o PWA continua por PIX ────────────────────────────────────────────────────
test("(b) PWA (web) ⇒ billing_indisponivel e ZERO idas à loja", async () => {
  reiniciarDuploCapacitor({ plataforma: "web", nativo: false, pluginDisponivel: false });
  assert.equal(modulo.billingDisponivel(), false);
  const r = await modulo.iniciarCompra("relampago");
  assert.equal(r.ok, false);
  assert.equal(r.code, "billing_indisponivel");
  assert.equal(REGISTO.order.length, 0, "o PWA foi à loja — o fluxo PIX teria sido substituído");
  assert.equal(REGISTO.register.length, 0);
  assert.equal(REGISTO.initialize, 0);
});

test("(b) iOS nativo ⇒ billing_indisponivel (este UTAC só trata Google Play)", async () => {
  reiniciarDuploCapacitor({ plataforma: "ios", nativo: true, pluginDisponivel: true });
  assert.equal(modulo.billingDisponivel(), false);
  assert.equal((await modulo.iniciarCompra("relampago")).code, "billing_indisponivel");
});

test("(b) Android SEM o plugin nativo ⇒ billing_indisponivel", async () => {
  reiniciarDuploCapacitor({ plataforma: "android", nativo: true, pluginDisponivel: false });
  assert.equal(modulo.billingDisponivel(), false);
  assert.equal((await modulo.iniciarCompra("relampago")).code, "billing_indisponivel");
});

test("(b) FAIL-CLOSED: a ponte nativa lança ⇒ indisponível, sem rebentar", async () => {
  reiniciarDuploCapacitor({ plataforma: "android", nativo: true, pluginDisponivel: true, lancar: true });
  assert.equal(modulo.billingDisponivel(), false, "uma excepção na ponte ligou o Billing");
  const r = await modulo.iniciarCompra("relampago");
  assert.equal(r.ok, false);
  assert.equal(r.code, "billing_indisponivel");
});

// ─── (c) ENTRADA INVÁLIDA ─────────────────────────────────────────────────────────────────────
test("(c) tipo inválido (vazio, desconhecido, «constructor», número) ⇒ erro LOCAL, sem ida à loja", async () => {
  ARRANCAR_ANDROID();
  for (const t of [undefined, "", "pontos", "constructor", "__proto__", 1, "RELAMPAGO", null]) {
    const r = await modulo.iniciarCompra(t);
    assert.equal(r.ok, false, `tipo=${String(t)}`);
    assert.equal(r.code, "tipo_invalido", `tipo=${String(t)}`);
    assert.ok(r.message);
  }
  assert.equal(REGISTO.order.length, 0, "um tipo inválido foi à loja");
  assert.equal(REGISTO.register.length, 0);
});

// ─── desfechos da loja ────────────────────────────────────────────────────────────────────────
test("loja devolve erro ⇒ compra_falhou (com a mensagem da loja)", async () => {
  ARRANCAR_ANDROID();
  reiniciarBillingDuplo({ resultadoOrder: "erro" });
  const r = await modulo.iniciarCompra("relampago");
  assert.equal(r.ok, false);
  assert.equal(r.code, "compra_falhou");
  assert.equal(r.message, "Purchase failed");
});

test("utilizador cancela (código 6777005) ⇒ `cancelada`, distinto de falha", async () => {
  ARRANCAR_ANDROID();
  reiniciarBillingDuplo({ resultadoOrder: "cancelada" });
  assert.equal((await modulo.iniciarCompra("relampago")).code, "cancelada");
});

test("sem adaptador (6777008) ⇒ compra_falhou, nunca ok", async () => {
  ARRANCAR_ANDROID();
  // ⚠️ `adaptadorPronto` fica true de propósito: com o adaptador caído o produto nunca carrega e o
  // desfecho seria `produto_indisponivel` (coberto no teste seguinte). O 6777008 mede-se com o
  // produto JÁ carregado e a encomenda a falhar — é o caminho que o `store.order` real descreve.
  reiniciarBillingDuplo({ resultadoOrder: "sem_adaptador" });
  const r = await modulo.iniciarCompra("relampago");
  assert.equal(r.ok, false);
  assert.equal(r.code, "compra_falhou");
  assert.match(r.message, /Adapter not found/);
});

test("SKU aprovado diferente do pedido ⇒ `sku_divergente` (defesa em profundidade R18-110i-7)", async () => {
  ARRANCAR_ANDROID();
  reiniciarBillingDuplo({ transacaoAprovada: { ...COMPRA_OK }, skuForcado: "passe_programado_r2" });
  const r = await modulo.iniciarCompra("relampago");
  assert.equal(r.ok, false);
  assert.equal(r.code, "sku_divergente");
});

test("transacção aprovada SEM purchaseToken ⇒ `sem_token` (não se manda lixo para o servidor)", async () => {
  ARRANCAR_ANDROID();
  reiniciarBillingDuplo({ transacaoAprovada: { sku: "passe_relampago_r2", purchaseToken: null, orderId: "GPA.1" } });
  const r = await modulo.iniciarCompra("relampago");
  assert.equal(r.ok, false);
  assert.equal(r.code, "sem_token");
});

test("a loja nunca entrega a transacção (produtos não carregam) ⇒ `produto_indisponivel`, não `ok`", async () => {
  ARRANCAR_ANDROID();
  reiniciarBillingDuplo({ produtosImediatos: false, updateTrazProdutos: false, transacaoAprovada: null });
  // UTAC119: o módulo passou a chamar `store.update()` como fallback; «nunca carrega» tem de
  // significar também que o reload não traz o produto.
  const r = await modulo.iniciarCompra("relampago");
  assert.equal(r.ok, false);
  assert.equal(r.code, "produto_indisponivel");
  assert.equal(REGISTO.order.length, 0, "encomendou sem produto carregado");
});

test("produto carrega DEPOIS do initialize (caminho real por rede) ⇒ compra conclui", async () => {
  ARRANCAR_ANDROID();
  reiniciarBillingDuplo({ produtosImediatos: false, transacaoAprovada: { ...COMPRA_OK } });
  const promessa = modulo.iniciarCompra("relampago");
  await new Promise((r) => setTimeout(r, 0));
  const n = espoletarProduto();
  assert.equal(n, 1, "controlo: havia um ouvinte `productUpdated` à espera");
  const r = await promessa;
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.purchaseToken, "TOKEN-PLAY-AAA");
});

// ─── confirmarCompra (finish/consumo) ────────────────────────────────────────────────────────
test("confirmarCompra ⇒ conclui na loja (finish) e devolve ok; a transacção é a mesma", async () => {
  ARRANCAR_ANDROID();
  reiniciarBillingDuplo({ transacaoAprovada: { ...COMPRA_OK } });
  const compra = await modulo.iniciarCompra("relampago");
  const r = await modulo.confirmarCompra(compra);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(REGISTO.finish.length, 1);
  assert.equal(REGISTO.finish[0].nativePurchase.purchaseToken, "TOKEN-PLAY-AAA");
  assert.equal(REGISTO.finish[0].state, "finished");
});

test("confirmarCompra com falha da loja ⇒ finish_falhou", async () => {
  ARRANCAR_ANDROID();
  reiniciarBillingDuplo({ transacaoAprovada: { ...COMPRA_OK }, resultadoFinish: "erro" });
  const compra = await modulo.iniciarCompra("relampago");
  const r = await modulo.confirmarCompra(compra);
  assert.equal(r.ok, false);
  assert.equal(r.code, "finish_falhou");
  assert.ok(r.message);
});

test("confirmarCompra com entrada inválida ⇒ compra_invalida, sem tocar na loja", async () => {
  ARRANCAR_ANDROID();
  for (const v of [null, undefined, 42, "x", {}]) {
    const r = await modulo.confirmarCompra(v);
    assert.equal(r.ok, false, `entrada=${String(v)}`);
    assert.equal(r.code, "compra_invalida");
  }
  assert.equal(REGISTO.finish.length, 0);
});

// ─── consultarCompras (retoma de entrega) ────────────────────────────────────────────────────
test("consultarCompras ⇒ lista as compras locais ainda não concluídas, com SKU e tipo derivado", async () => {
  ARRANCAR_ANDROID();
  reiniciarBillingDuplo({
    recibosLocais: [
      { purchaseToken: "TOK-1", orderId: "GPA.1", transactions: [{ nativePurchase: { purchaseToken: "TOK-1", orderId: "GPA.1", productIds: ["passe_relampago_r2"] }, transactionId: "GPA.1", isAcknowledged: false, products: [{ id: "passe_relampago_r2" }] }] },
      { purchaseToken: "TOK-2", orderId: "GPA.2", transactions: [{ nativePurchase: { purchaseToken: "TOK-2", orderId: "GPA.2", productIds: ["passe_programado_r2"] }, transactionId: "GPA.2", isAcknowledged: false, products: [{ id: "passe_programado_r2" }] }] },
      { purchaseToken: "TOK-3", orderId: "GPA.3", transactions: [{ nativePurchase: { purchaseToken: "TOK-3", productIds: ["sku_estranho"] }, transactionId: "GPA.3", products: [{ id: "sku_estranho" }] }] },
    ],
  });
  const r = await modulo.consultarCompras();
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(r.compras.map((c) => [c.sku, c.tipo, c.purchaseToken]),
    [["passe_relampago_r2", "relampago", "TOK-1"], ["passe_programado_r2", "programado", "TOK-2"]],
    "uma compra de SKU desconhecido entrou na lista (não é deste UTAC)");
});

test("consultarCompras fora do Android ⇒ ok:false, lista vazia (não inventa compras)", async () => {
  reiniciarDuploCapacitor({ plataforma: "web", nativo: false, pluginDisponivel: false });
  const r = await modulo.consultarCompras();
  assert.equal(r.ok, false);
  assert.equal(r.code, "billing_indisponivel");
  assert.deepEqual(r.compras, []);
});

// ─── USO de ponta a ponta (E7): comprar → validar no servidor → confirmar ─────────────────────
test("USO: comprar, validar no servidor (fetch duplo) e SÓ ENTÃO confirmar na loja", async () => {
  ARRANCAR_ANDROID();
  reiniciarBillingDuplo({ transacaoAprovada: { ...COMPRA_OK } });

  const envios = [];
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    envios.push({ url: String(url), body: JSON.parse(opts.body) });
    return new Response(JSON.stringify({ ok: true, pontosFidelidade: 10, creditosLance: 1 }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  };
  try {
    // 1) a loja aprova
    const compra = await modulo.iniciarCompra("relampago");
    assert.equal(compra.ok, true);
    assert.equal(REGISTO.finish.length, 0, "confirmou na loja ANTES de validar no servidor");

    // 2) o servidor valida (é ele a fonte de verdade sobre dinheiro)
    const resposta = await (await globalThis.fetch("/.netlify/functions/validar-compra-google", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ tipo: compra.tipo, sku: compra.sku, purchaseToken: compra.purchaseToken }),
    })).json();
    assert.equal(resposta.ok, true);
    assert.deepEqual(envios[0].body, { tipo: "relampago", sku: "passe_relampago_r2", purchaseToken: "TOKEN-PLAY-AAA" });

    // 3) só depois de o servidor entregar é que a compra é concluída na loja
    const fim = await modulo.confirmarCompra(compra);
    assert.equal(fim.ok, true);
    assert.equal(REGISTO.finish.length, 1, "a loja não foi avisada da entrega");
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

// ─── o duplo tem de SER fiel: se ele aceitar o que o real recusa, o verde é falso ─────────────
test("FIDELIDADE DO DUPLO: registar o MESMO callback 2× lança (como o pacote real medido)", () => {
  const w = store.when();
  const cb = () => {};
  w.approved(cb);
  assert.throws(() => w.approved(cb), /REGISTERING THE SAME CALLBACK TWICE/);
});

test("FIDELIDADE DO DUPLO: sem adaptador, `order()` devolve o código 6777008 do pacote real", async () => {
  reiniciarBillingDuplo({ resultadoOrder: "sem_adaptador", adaptadorPronto: false });
  const r = await store.order({ productId: "passe_relampago_r2", platform: "android-playstore" });
  assert.equal(r.isError, true);
  assert.equal(r.code, 6777008);
  assert.equal(CONTROLO.adaptadorPronto, false);
  assert.equal(CONTROLO_CAPACITOR.plataforma, "web", "controlo: o duplo do Capacitor está no braço web");
});
