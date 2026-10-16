// src/lib/google-play-billing.js — UTAC110i.1 (FRENTE B/D).
//
// ABSTRACÇÃO do Google Play Billing para o Passe Desafio. É a ÚNICA porta do frontend para o
// plugin nativo: o resto do código (o hook `useComprarPasse`) nunca importa o pacote directamente.
//
// ── Plugin e SKUs ────────────────────────────────────────────────────────────────────────────────
//   Pacote: `capacitor-plugin-cdv-purchase` 13.19.1 (peerDeps `@capacitor/core` ^6||^7||^8 — compatível
//   com o Capacitor 8.4.2 do repo). É a edição Capacitor do `cordova-plugin-purchase` (j3k0), com a
//   MESMA API. R18-110i-6: o pacote nomeado no enunciado do 110i não existe no npm (404) — este é o
//   substituto medido e aprovado pelo operador.
//
//   SKUs (R18-110i-7 — DOIS produtos, ambos CONSUMÍVEIS, R$ 2,00):
//     relampago  → `passe_relampago_r2`   (1 lance no MLC · Art. 13º)
//     programado → `passe_programado_r2`  (1 palpite na OP · Art. 25º)
//   Os IDs têm de ser EXACTAMENTE os criados no Play Console (A1). O `packageName` é o `appId` de
//   `capacitor.config.ts` (`com.desafiogut.app`).
//
// ── FATOS MEDIDOS contra o pacote INSTALADO (não documentação lembrada) ──────────────────────────
//   · O pacote toca `window.console` no TOPO do módulo (`dist/index.js:324`): importá-lo num
//     ambiente sem `window` (Node/SSR — o arnês de testes do repo) rebenta com
//     `ReferenceError: window is not defined`. ⇒ o import tem de ser DINÂMICO e só depois dos
//     guardas (é a razão de `carregarPlugin()` existir).
//   · `store.when().approved(cb)` devolve o próprio `when()` (encadeável) e registar o MESMO
//     callback duas vezes lança «REGISTERING THE SAME CALLBACK TWICE?». ⇒ um único listener de
//     módulo, instalado uma vez (`garantirListenerAprovado`).
//   · `await store.order(oferta)` resolve com **`undefined`** em sucesso (`callResolve(undefined)`
//     no adaptador GooglePlay, casos `purchased`/`deferred`) e com `{ isError:true, code, message,
//     platform, productId }` em falha. A transacção NÃO vem por aí: vem pelo listener `approved`.
//   · Sem adaptador (Node/browser, ou fora do Android), `order()` devolve
//     `{ isError:true, code:6777008, message:'Adapter not found or not ready (undefined)' }` —
//     medido. É por isso que existe o guarda `billingDisponivel()`.
//   · `store.finish(transacao)` resolve `undefined` em sucesso e, para o Google Play, consome a
//     compra consumível (o `nativePurchase.consumed`/`acknowledged` vêm do bridge).
//   · A transacção Android (`CdvPurchase.GooglePlay.Transaction`) expõe: `nativePurchase` (o objecto
//     cru do bridge, com `purchaseToken`, `orderId`, `productIds`), `transactionId` (= orderId ||
//     purchaseToken), `purchaseId` (= purchaseToken), `products` = `[{ id }]`, `isAcknowledged`,
//     `isConsumed`, `state`. O `purchaseToken` é o que o backend valida — NÃO há token no objecto
//     `purchaseId` do iOS: este ficheiro só trata `Platform.GOOGLE_PLAY`.
//
// ── O que este ficheiro NÃO faz (GATE 3) ─────────────────────────────────────────────────────────
//   · NÃO valida a compra (isso é `validar-compra-google.mjs`, no servidor — o cliente não é
//     fonte de verdade sobre dinheiro);
//   · NÃO credita pontos/ECOQUILDO;
//   · NÃO define validadores externos (`store.validator`/Iaptic): a validação é NOSSA, servidor.
//   · NÃO trata iOS: `Platform.GOOGLE_PLAY` fixo. `billingDisponivel()` é false fora do Android.

import { Capacitor } from "@capacitor/core";

/** SKU do Play Console por tipo de Passe (R18-110i-7). A ordem segue o Regulamento (Art. 13º, 25º). */
export const SKU_PASSE = {
  relampago: "passe_relampago_r2",
  programado: "passe_programado_r2",
};

/** Inverso de `SKU_PASSE` — o SKU é o identificador forte; o tipo é derivado dele. */
export const TIPO_POR_SKU = {
  passe_relampago_r2: "relampago",
  passe_programado_r2: "programado",
};

/** `appId` de `capacitor.config.ts` — o `packageName` que a Google Play API valida. */
export const PACKAGE_ANDROID = "com.desafiogut.app";

/** Tempo máximo à espera dos produtos da loja (rede + Play Console). */
const TIMEOUT_PRODUTO_MS = 15000;
/** Tempo máximo à espera de o utilizador concluir (ou cancelar) o pagamento. */
const TIMEOUT_COMPRA_MS = 300000;

/**
 * O pagamento pela loja está DISPONÍVEL agora?
 *
 * Medido: no Node/browser o `Capacitor` do pacote responde `getPlatform()==="web"`,
 * `isNativePlatform()===false`, `isPluginAvailable("PurchasePlugin")===false`; num clone Android
 * real (o APK) responde `"android"`, `true`, `true`. É ESTE o «Billing disponível» do enunciado
 * («Android + Billing disponível = true»; «PWA / iOS / Billing indisponível = false»).
 *
 * Fail-closed: qualquer excepção → `false` (nunca liga o Billing por engano).
 */
export function billingDisponivel() {
  try {
    return (
      Capacitor?.isNativePlatform?.() === true &&
      Capacitor?.getPlatform?.() === "android" &&
      Capacitor?.isPluginAvailable?.("PurchasePlugin") === true
    );
  } catch {
    return false;
  }
}

/** @returns {null|string} o SKU do tipo, ou null se o tipo não for conhecido. */
export function skuDoTipo(tipo) {
  return typeof tipo === "string" && Object.hasOwn(SKU_PASSE, tipo) ? SKU_PASSE[tipo] : null;
}

// ─── estado de módulo (uma loja por app; nada disto é por componente) ────────────────────────────
let _plugin = null;             // módulo do plugin já importado
let _inicializada = false;      // `store.initialize()` correu
let _listenerAprovado = false;  // o listener `approved` está instalado
const _registados = new Set();  // SKUs já registados na loja
let _pendente = null;           // resolver da compra em curso (uma de cada vez)

/** Importa o plugin (dinâmico — ver «FATOS MEDIDOS»: não se pode importar no topo). */
async function carregarPlugin() {
  if (_plugin === null) _plugin = await import("capacitor-plugin-cdv-purchase");
  return _plugin;
}

/**
 * Instala UM listener `approved` para toda a vida do módulo e encaminha a primeira transacção
 * aprovada para a compra em curso. Registar de novo o MESMO callback lança (medido) — daí a flag.
 */
function garantirListenerAprovado(store) {
  if (_listenerAprovado) return;
  _listenerAprovado = true;
  store.when().approved((transacao) => {
    if (_pendente) {
      const entregar = _pendente;
      _pendente = null;
      entregar(transacao);
    }
  });
}

/** Regista o SKU e inicializa a loja — uma vez por SKU e uma vez no total. */
async function prepararLoja(store, ProductType, Platform, sku) {
  if (!_registados.has(sku)) {
    store.register([{ id: sku, type: ProductType.CONSUMABLE, platform: Platform.GOOGLE_PLAY }]);
    _registados.add(sku);
  }
  if (!_inicializada) {
    await store.initialize();
    _inicializada = true;
  }
  garantirListenerAprovado(store);
}

/** Normaliza uma transacção/recibo do Google Play para o contrato do backend (sem inventar campos). */
function normalizar(transacao, recibo) {
  const cru = transacao?.nativePurchase ?? {};
  const purchaseToken = cru.purchaseToken ?? recibo?.purchaseToken ?? transacao?.purchaseId ?? null;
  const orderId = cru.orderId ?? recibo?.orderId ?? null;
  const sku = transacao?.products?.[0]?.id ?? cru.productIds?.[0] ?? null;
  return {
    sku,
    tipo: typeof sku === "string" && Object.hasOwn(TIPO_POR_SKU, sku) ? TIPO_POR_SKU[sku] : null,
    purchaseToken: typeof purchaseToken === "string" && purchaseToken !== "" ? purchaseToken : null,
    orderId: typeof orderId === "string" && orderId !== "" ? orderId : null,
    transactionId: transacao?.transactionId ?? null,
    acknowledged: transacao?.isAcknowledged === true,
    _transacao: transacao, // objecto vivo: o `confirmarCompra` precisa dele para o `finish()`
  };
}

/** Espera que o SKU esteja carregado com pelo menos uma oferta (a loja carrega por rede). */
function aguardarOferta(store, sku) {
  const ofertaDe = () => store.get(sku)?.getOffer?.() ?? store.get(sku)?.offers?.[0] ?? null;
  const imediata = ofertaDe();
  if (imediata) return Promise.resolve(imediata);
  return new Promise((resolve, reject) => {
    let feito = false;
    const terminar = (fn, arg) => { if (!feito) { feito = true; clearTimeout(t); fn(arg); } };
    const t = setTimeout(() => terminar(reject, new Error("timeout_produto")), TIMEOUT_PRODUTO_MS);
    store.when().productUpdated(() => {
      const o = ofertaDe();
      if (o) terminar(resolve, o);
    });
  });
}

/**
 * Inicia a compra de um Passe (abre o balão de pagamento da Google Play).
 *
 * @param {"relampago"|"programado"} tipo
 * @returns {Promise<{ok:true, tipo:string, sku:string, purchaseToken:string, orderId:string|null,
 *                    transactionId:string|null, acknowledged:boolean, transacao:object}
 *                  | {ok:false, code:string, message:string}>}
 *   `ok:true` significa «a Google aprovou a compra e há um purchaseToken para validar no servidor» —
 *   NÃO significa «a compra foi entregue»: isso é o `validar-compra-google.mjs` + `confirmarCompra`.
 */
export async function iniciarCompra(tipo) {
  const sku = skuDoTipo(tipo);
  if (!sku) return { ok: false, code: "tipo_invalido", message: "Escolha um Passe Desafio válido." };
  if (!billingDisponivel()) {
    return { ok: false, code: "billing_indisponivel", message: "Pagamento pela loja indisponível neste dispositivo." };
  }
  if (_pendente) return { ok: false, code: "em_curso", message: "Compra em curso" };

  let store, ProductType, Platform;
  try {
    ({ store, ProductType, Platform } = await carregarPlugin());
  } catch {
    return { ok: false, code: "billing_indisponivel", message: "Pagamento pela loja indisponível neste dispositivo." };
  }

  // Declarado fora do `try`: o `catch` também tem de o limpar (é o único sítio onde o timer de
  // `TIMEOUT_COMPRA_MS` pode ficar pendente — ver a nota dentro do `Promise`).
  let cancelar = () => {};

  try {
    await prepararLoja(store, ProductType, Platform, sku);
    const oferta = await aguardarOferta(store, sku);

    const aprovada = new Promise((resolve, reject) => {
      let feito = false;
      const terminar = (fn, arg) => { if (!feito) { feito = true; clearTimeout(t); _pendente = null; fn(arg); } };
      const t = setTimeout(() => terminar(reject, new Error("timeout_compra")), TIMEOUT_COMPRA_MS);
      // ⚠️ MEDIDO (a suíte pendurava): quando a loja devolve um erro, o timer de `TIMEOUT_COMPRA_MS`
      // ficava PENDENTE — o processo do `node --test` não saía e o harness da suíte (que corre os
      // ficheiros num processo só, sem timeout) ficava preso 5 minutos por cada compra falhada.
      // O `cancelar` existe para o caminho de erro o limpar.
      cancelar = () => terminar(() => {}, undefined);
      _pendente = (transacao) => terminar(resolve, transacao);
    });

    const resultado = await store.order(oferta);
    if (resultado && resultado.isError) {
      cancelar();
      return {
        ok: false,
        code: resultado.code === 6777005 ? "cancelada" : "compra_falhou",
        message: resultado.message || "Não foi possível concluir a compra na loja.",
      };
    }

    const transacao = await aprovada;
    const n = normalizar(transacao, null);
    if (!n.purchaseToken) {
      return { ok: false, code: "sem_token", message: "A loja não devolveu o recibo da compra." };
    }
    if (n.sku !== sku) {
      // Defesa em profundidade (R18-110i-7): o SKU aprovado tem de ser o que se pediu.
      return { ok: false, code: "sku_divergente", message: "A loja aprovou um produto diferente do pedido." };
    }
    return { ok: true, ...n };
  } catch (err) {
    cancelar();
    _pendente = null;
    const motivo = err?.message === "timeout_produto" ? "produto_indisponivel"
      : err?.message === "timeout_compra" ? "timeout_compra" : "compra_falhou";
    return { ok: false, code: motivo, message: "Não foi possível concluir a compra na loja." };
  }
}

/**
 * Confirma (conclui) a compra na loja DEPOIS de o servidor ter validado e entregue os benefícios.
 * `store.finish(transacao)` consome a compra consumível no Google Play (sem isto, a Google
 * reembolsa automaticamente em 3 dias e o utilizador fica sem o Passe).
 *
 * @param {object} transacao o objecto devolvido por `iniciarCompra`/`consultarCompras`
 * @returns {Promise<{ok:boolean, code?:string, message?:string}>}
 */
export async function confirmarCompra(transacao) {
  const alvo = transacao?._transacao ?? transacao;
  // ⚠️ O guarda exige `products[0].id` porque é EXACTAMENTE o que o adaptador do Google Play
  // dereferencia a seguir (`virtualTransactionId(transaction.products[0].id)`, medido no dist).
  // Sem isto, uma transacção vazia só rebentava com `TypeError` dentro da biblioteca.
  if (!alvo || typeof alvo !== "object" || typeof alvo.products?.[0]?.id !== "string") {
    return { ok: false, code: "compra_invalida", message: "Compra inválida." };
  }
  try {
    const { store } = await carregarPlugin();
    const r = await store.finish(alvo);
    if (r && r.isError) {
      return { ok: false, code: "finish_falhou", message: r.message || "Não foi possível concluir a compra na loja." };
    }
    return { ok: true };
  } catch {
    return { ok: false, code: "finish_falhou", message: "Não foi possível concluir a compra na loja." };
  }
}

/**
 * Compras aprovadas e ainda NÃO concluídas (retoma a entrega depois de a app morrer entre o
 * pagamento e o `finish`, ou de o servidor ter estado indisponível). Lê os recibos locais.
 *
 * @returns {Promise<{ok:boolean, compras:Array<object>, code?:string}>}
 */
export async function consultarCompras() {
  if (!billingDisponivel()) return { ok: false, code: "billing_indisponivel", compras: [] };
  try {
    const { store, ProductType, Platform } = await carregarPlugin();
    await prepararLoja(store, ProductType, Platform, SKU_PASSE.relampago);
    const compras = [];
    for (const recibo of store.localReceipts ?? []) {
      for (const transacao of recibo?.transactions ?? []) {
        const n = normalizar(transacao, recibo);
        if (n.purchaseToken && n.tipo) compras.push(n);
      }
    }
    return { ok: true, compras };
  } catch {
    return { ok: false, code: "billing_indisponivel", compras: [] };
  }
}

/** Só para testes: repõe o estado de módulo (uma loja por processo). */
export function _reiniciarParaTeste() {
  _plugin = null;
  _inicializada = false;
  _listenerAprovado = false;
  _registados.clear();
  _pendente = null;
}
