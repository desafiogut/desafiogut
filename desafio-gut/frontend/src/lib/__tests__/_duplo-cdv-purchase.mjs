// _duplo-cdv-purchase.mjs — UTAC110i.1 (SEG0). Duplo do pacote `capacitor-plugin-cdv-purchase`.
//
// ⚠️ FIDELIDADE (T3 — o duplo tem de ser fiel ao que a biblioteca faz de facto; um duplo permissivo
// esconde defeitos). Tudo o que este duplo copia foi MEDIDO contra o pacote real instalado
// (13.19.1) por sondagem em Node — ver `_logs/UTAC110i.1_SEG0_FRENTE-B.md`:
//   · `ProductType.CONSUMABLE === "consumable"`, `Platform.GOOGLE_PLAY === "android-playstore"`;
//   · `when().approved(cb)` / `when().productUpdated(cb)` devolvem o PRÓPRIO `when()` (encadeável)
//     e registar o MESMO callback 2× lança «REGISTERING THE SAME CALLBACK TWICE?»;
//   · `store.register([...])` não lança e, SEM adaptador, `store.products` fica VAZIO e
//     `store.get(id)` devolve `undefined` (medido em Node);
//   · `store.order(oferta)` resolve `undefined` em sucesso e, sem adaptador, resolve
//     `{ isError:true, code:6777008, message:'Adapter not found or not ready (undefined)' }`;
//   · `store.finish(transacao)` resolve `undefined` em sucesso e um objecto de erro em falha;
//   · `store.localReceipts` é um array; cada recibo tem `transactions` e (Google Play)
//     `purchaseToken`/`orderId`; a transacção tem `nativePurchase`, `transactionId`, `purchaseId`,
//     `products` = `[{id}]`, `isAcknowledged`.
//
// ⚠️ ESTADO NO `globalThis` — NÃO no módulo (mesma razão do `_duplo-capacitor.mjs`): este ficheiro
// é avaliado DUAS vezes (uma pelo `import` do Node, outra pelo grafo do `ssrLoadModule`). Com
// estado de módulo, o teste leria um `REGISTO` que o alvo nunca toca — verde falso.

const G = globalThis;

const ESTADO_INICIAL = () => ({
  controle: {
    adaptadorPronto: true, produtosImediatos: true, resultadoOrder: "sucesso",
    resultadoFinish: "sucesso", transacaoAprovada: null, skuForcado: null, recibosLocais: [],
  },
  registo: { register: [], initialize: 0, order: [], finish: [], listeners: { productUpdated: 0, approved: 0 } },
  produtos: new Map(),
  pendentes: [],
  when: null,
});

if (G.__billingDuploPlugin === undefined) G.__billingDuploPlugin = ESTADO_INICIAL();
const E = G.__billingDuploPlugin;

/** Controle partilhado (ver nota do globalThis). */
export const CONTROLO = E.controle;
/** Registos para asserção — preenchidos pelo alvo, lidos pelo teste. */
export const REGISTO = E.registo;

export function reiniciarBillingDuplo(over = {}) {
  const novo = ESTADO_INICIAL();
  Object.assign(CONTROLO, novo.controle, over);
  REGISTO.register.length = 0;
  REGISTO.order.length = 0;
  REGISTO.finish.length = 0;
  REGISTO.initialize = 0;
  REGISTO.listeners = { productUpdated: 0, approved: 0 };
  E.produtos.clear();
  E.pendentes.length = 0;
  E.when = null;
}

export const ProductType = { CONSUMABLE: "consumable", NON_CONSUMABLE: "non consumable" };
export const Platform = { APPLE_APPSTORE: "ios-appstore", GOOGLE_PLAY: "android-playstore" };

const oferta = (produtoId) => ({
  id: "default", productId: produtoId, platform: Platform.GOOGLE_PLAY, canPurchase: true,
});

function produtoDe(id) {
  if (!CONTROLO.adaptadorPronto) return undefined;
  if (!E.produtos.has(id)) return undefined;
  return {
    id, platform: Platform.GOOGLE_PLAY, type: ProductType.CONSUMABLE,
    offers: [oferta(id)], getOffer: () => oferta(id),
  };
}

export const store = {
  get products() {
    return CONTROLO.adaptadorPronto ? [...E.produtos.keys()].map((id) => produtoDe(id)) : [];
  },
  get localReceipts() {
    return CONTROLO.recibosLocais;
  },
  get verifiedReceipts() {
    return [];
  },
  register(lista) {
    REGISTO.register.push(lista);
    // ⚠️ Fiel ao real: SEM adaptador pronto o pacote não carrega produto nenhum (`store.products`
    // fica vazio em Node). Com adaptador, os produtos carregam por REDE — logo podem chegar depois
    // do `initialize()`; é isso que `espoletarProduto()` modela.
    if (!CONTROLO.adaptadorPronto) return this;
    if (CONTROLO.produtosImediatos) for (const p of lista) E.produtos.set(p.id, p);
    else E.pendentes.push(...lista);
    return this;
  },
  async initialize() {
    REGISTO.initialize += 1;
    return [];
  },
  get(id) {
    return produtoDe(id);
  },
  ready() {
    return CONTROLO.adaptadorPronto && E.produtos.size > 0;
  },
  owned(id) {
    return CONTROLO.recibosLocais.some((r) => r.transactions?.some((t) => t.products?.[0]?.id === id));
  },
  when() {
    if (E.when === null) E.when = construirWhen();
    return E.when;
  },
  async order(o) {
    REGISTO.order.push(o);
    const r = CONTROLO.resultadoOrder;
    if (r === "sem_adaptador") {
      return { isError: true, code: 6777008, message: "Adapter not found or not ready (undefined)", platform: undefined, productId: null };
    }
    if (r === "cancelada") {
      return { isError: true, code: 6777005, message: "The user cancelled the order.", platform: Platform.GOOGLE_PLAY, productId: o.productId };
    }
    if (r === "erro") {
      return { isError: true, code: 6777016, message: "Purchase failed", platform: Platform.GOOGLE_PLAY, productId: o.productId };
    }
    // Sucesso: a transacção chega pelo listener `approved` (medido: `order()` resolve `undefined`).
    if (CONTROLO.transacaoAprovada) {
      const tx = transacaoDoControle();
      queueMicrotask(() => store.when().__dispararAprovado(tx));
    }
    return undefined;
  },
  async finish(t) {
    REGISTO.finish.push(t);
    if (CONTROLO.resultadoFinish === "erro") {
      return { isError: true, code: 6777013, message: "Failed to finish transaction", productId: t?.products?.[0]?.id };
    }
    if (t && typeof t === "object") t.state = "finished";
    return undefined;
  },
};

function transacaoDoControle() {
  const c = CONTROLO.transacaoAprovada;
  const sku = CONTROLO.skuForcado ?? c.sku;
  const cru = { purchaseToken: c.purchaseToken ?? null, orderId: c.orderId ?? null, productIds: [sku] };
  return {
    nativePurchase: cru,
    transactionId: cru.orderId || cru.purchaseToken,
    purchaseId: cru.purchaseToken,
    products: [{ id: sku }],
    isAcknowledged: false,
    isConsumed: false,
    state: "approved",
  };
}

function construirWhen() {
  const ouvintes = { productUpdated: [], approved: [] };
  const w = {
    productUpdated(cb) {
      if (cb && ouvintes.productUpdated.includes(cb)) {
        throw new Error("REGISTERING THE SAME CALLBACK TWICE? This is indicative of a bug in your integration.");
      }
      if (cb) { ouvintes.productUpdated.push(cb); REGISTO.listeners.productUpdated += 1; }
      return w;
    },
    approved(cb) {
      if (cb && ouvintes.approved.includes(cb)) {
        throw new Error("REGISTERING THE SAME CALLBACK TWICE? This is indicative of a bug in your integration.");
      }
      if (cb) { ouvintes.approved.push(cb); REGISTO.listeners.approved += 1; }
      return w;
    },
    __dispararProduto() {
      for (const cb of ouvintes.productUpdated) cb(store.products);
      return ouvintes.productUpdated.length;
    },
    __dispararAprovado(tx) {
      for (const cb of ouvintes.approved) cb(tx);
      return ouvintes.approved.length;
    },
    __ouvintes: ouvintes,
  };
  return w;
}

/** Simula a loja a carregar os produtos DEPOIS do `initialize` (o caminho real, por rede). */
export function espoletarProduto() {
  for (const p of E.pendentes) E.produtos.set(p.id, p);
  E.pendentes.length = 0;
  return store.when().__dispararProduto();
}

/** Devolve os SKUs que o código registou (asserção do `register`). */
export const skusRegistados = () => REGISTO.register.flat().map((p) => p.id);
