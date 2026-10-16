// _duplo-capacitor.mjs — UTAC110i.1 (SEG0). Duplo de `@capacitor/core` (só o `Capacitor`).
//
// ⚠️ FIDELIDADE (T3). Medido contra o pacote real instalado, em Node:
//   `Capacitor.getPlatform() === "web"`, `Capacitor.isNativePlatform() === false`,
//   `Capacitor.isPluginAvailable("PurchasePlugin") === false`.
// Num clone Android real (o APK) os três respondem `"android"`, `true`, `true`.
// O duplo reproduz ESSES valores por omissão (ambiente de teste = Node) e deixa forçar o outro
// braço, que é o que permite exercitar as duas direcções do guarda.
//
// ⚠️ ESTADO NO `globalThis` — NÃO no módulo. Este ficheiro é carregado DUAS vezes quando usado como
// alias do Vite: uma pelo `import` do Node (o teste) e outra pelo grafo do `ssrLoadModule` (o código
// sob teste). Estado de módulo daria DUAS instâncias, e o teste leia/punha uma enquanto o alvo
// usava a outra — um falso verde (e um falso vermelho) invisíveis. O `_supabase-duplo.mjs` do repo
// resolve o mesmo problema da mesma maneira.

const G = globalThis;
if (G.__billingDuploCapacitor === undefined) {
  G.__billingDuploCapacitor = { plataforma: "web", nativo: false, pluginDisponivel: false, lancar: false };
}

/** Controlo partilhado (vive no globalThis — ver nota acima). */
export const CONTROLO_CAPACITOR = G.__billingDuploCapacitor;

export function reiniciarDuploCapacitor(over = {}) {
  Object.assign(CONTROLO_CAPACITOR, { plataforma: "web", nativo: false, pluginDisponivel: false, lancar: false }, over);
}

/** Atalho: o ambiente de um APK Android com o plugin nativo ligado. */
export const ARRANCAR_ANDROID = () =>
  reiniciarDuploCapacitor({ plataforma: "android", nativo: true, pluginDisponivel: true });

const talvezLancar = () => { if (CONTROLO_CAPACITOR.lancar) throw new Error("ponte nativa indisponível"); };

export const Capacitor = {
  getPlatform() { talvezLancar(); return CONTROLO_CAPACITOR.plataforma; },
  isNativePlatform() { talvezLancar(); return CONTROLO_CAPACITOR.nativo; },
  isPluginAvailable() { talvezLancar(); return CONTROLO_CAPACITOR.pluginDisponivel; },
};

export default { Capacitor };
