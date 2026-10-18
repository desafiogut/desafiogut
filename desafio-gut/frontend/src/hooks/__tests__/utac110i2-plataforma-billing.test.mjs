// utac110i2-plataforma-billing.test.mjs — UTAC110i.2 · FRENTE A (detetor) + FRENTE B (flag).
//
// O DEFEITO que este ficheiro fixa (medido no SEG-1): `detectarPlataforma()` reconhecia nativo SÓ
// por `window.GUT_NATIVE.platform`, e NADA no repositório escreve `GUT_NATIVE` (1 ocorrência: a
// própria leitura). No APK os três marcadores falhavam ⇒ devolvia "pwa" ⇒ lia a chave `pwa` da
// config ⇒ `isPagamentoNativoAtivo` false ⇒ o Passe era comprado por PIX/saldo R$ dentro da app da
// Play. A correcção: o próprio Capacitor é a fonte de verdade (`isNativePlatform()` + `getPlatform()`).
//
// O que se prova (GATE 8 — bidireccional, com controlo negativo em cada alegação):
//   (a) APK Android (nativo)              ⇒ "android"            | controlo: browser ⇒ "pwa"
//   (b) APK iOS (nativo)                  ⇒ "ios"
//   (c) `getPlatform()` FORJADO a android com `isNativePlatform()` false ⇒ "pwa" (NÃO se liga)
//   (d) a ponte nativa lança             ⇒ "pwa" (fail-soft, nunca "android" por acidente)
//   (e) precedência intacta: ?plataforma= > __GUT_PLATAFORMA__ > GUT_NATIVE > Capacitor
//   (f) CADEIA (USO): detector android ⇒ o cliente PEDE `?plataforma=android` e recebe a flag true
//   (g) caminho Supabase (o outro ramo de `carregarRecursos`) ⇒ a mesma flag true
//   (h) com a config REAL de produção (`android:false`) a flag continua false — o detetor sozinho
//       NÃO liga o Billing: a Frente B (o valor na config) é uma condição separada
//   (i) PWA intocado: mesmo com `android:true` na config, no browser a flag é false
//   (j) o BACKEND resolve o mesmo (paridade cliente/servidor, input a input)
//   (m) limite honesto: sem config (fallback local) a flag fica false — fail-safe declarado
import { test, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { carregarModulo, correr, fecharArnes, ULTIMO_PEDIDO } from "./_recursos-arnes.mjs";
import {
  reiniciarDuploCapacitor, ARRANCAR_ANDROID,
} from "../../lib/__tests__/_duplo-capacitor.mjs";
import * as backend from "../../../netlify/functions/_lib/recursos-app-config.mjs";

const hook = await carregarModulo("/src/hooks/useRecursosApp.js");
const { detectarPlataforma, resolverParaPlataforma } = hook;

after(async () => { reiniciarDuploCapacitor(); await fecharArnes(); });
beforeEach(() => reiniciarDuploCapacitor());

/** Config TAL COMO ESTÁ EM PRODUÇÃO (medida no SEG-1 por REST em `config_remota`). */
const PROD = {
  isLeilaoAtivo: { ios: false, pwa: true, android: false },
  isPagamentoNativoAtivo: { ios: false, pwa: false, android: false },
};
/** A MESMA config com a única chave que este UTAC propõe mudar. */
const LIGADO = { ...PROD, isPagamentoNativoAtivo: { ios: false, pwa: false, android: true } };

/** Corre `fn` com um `window` controlado e repõe o original (o detetor lê `window`). */
async function comWindow(extra, fn) {
  const orig = globalThis.window;
  globalThis.window = { location: { search: "" }, ...extra };
  try { return await fn(); } finally { globalThis.window = orig; }
}

// ── (a)(b)(c)(d) O detetor: o braço NOVO, com o controlo negativo ao lado ────────────────────────
test("(a) APK Android nativo ⇒ 'android'; controlo: browser ⇒ 'pwa'", async () => {
  ARRANCAR_ANDROID();
  assert.equal(await comWindow({}, detectarPlataforma), "android");
  reiniciarDuploCapacitor(); // valores do pacote real em Node (web/false/false), medidos
  assert.equal(await comWindow({}, detectarPlataforma), "pwa", "browser puro NUNCA é nativo");
});

test("(b) APK iOS nativo ⇒ 'ios'", async () => {
  reiniciarDuploCapacitor({ plataforma: "ios", nativo: true });
  assert.equal(await comWindow({}, detectarPlataforma), "ios");
});

test("(c) string forjada: getPlatform()='android' com isNativePlatform()=false ⇒ 'pwa'", async () => {
  // Uma página web pode forjar a STRING da plataforma; não pode forjar a ponte nativa.
  reiniciarDuploCapacitor({ plataforma: "android", nativo: false });
  assert.equal(await comWindow({}, detectarPlataforma), "pwa");
});

test("(d) ponte nativa lança ⇒ 'pwa' (fail-soft, nunca 'android' por acidente)", async () => {
  reiniciarDuploCapacitor({ plataforma: "android", nativo: true, lancar: true });
  assert.equal(await comWindow({}, detectarPlataforma), "pwa");
});

// ── (e) Precedência: os marcadores que já existiam continuam a mandar (zero regressão) ─────────
test("(e) precedência: ?plataforma= > __GUT_PLATAFORMA__ > GUT_NATIVE > Capacitor", async () => {
  ARRANCAR_ANDROID();
  assert.equal(await comWindow({ location: { search: "?plataforma=pwa" } }, detectarPlataforma), "pwa",
    "1.º: override de validação/MCP sobrepõe-se ao nativo");
  assert.equal(await comWindow({ location: { search: "?plataforma=ios" } }, detectarPlataforma), "ios");
  assert.equal(await comWindow({ __GUT_PLATAFORMA__: "ios" }, detectarPlataforma), "ios",
    "2.º: __GUT_PLATAFORMA__ (usado pelos testes e pelo MCP)");
  assert.equal(await comWindow({ GUT_NATIVE: { platform: "ios" } }, detectarPlataforma), "ios",
    "3.º: o marcador de wrapper antigo, se algum build o voltar a definir");
  assert.equal(await comWindow({ GUT_NATIVE: { platform: "browser" } }, detectarPlataforma), "android",
    "um valor inválido em GUT_NATIVE NÃO desliga o Capacitor (antes caía em pwa)");
});

// ── (f)(g) A CADEIA: o que o APK pede e o que recebe ───────────────────────────────────────────
test("(f) CADEIA função: APK Android pede ?plataforma=android e recebe a flag LIGADA", async () => {
  ARRANCAR_ANDROID();
  const corpo = { plataforma: "android", isLeilaoAtivo: false, isPagamentoNativoAtivo: true };
  const r = await correr(hook, { via: "funcao", corpo }, null); // null ⇒ sem marcador: decide o detetor
  assert.equal(r.plataforma, "android");
  assert.equal(r.isPagamentoNativoAtivo, true);
  assert.match(ULTIMO_PEDIDO.url, /plataforma=android/, `pedido medido: ${ULTIMO_PEDIDO.url}`);
  assert.doesNotMatch(ULTIMO_PEDIDO.url, /plataforma=pwa/, "era este o pedido errado do APK antigo");
});

test("(f.2) o pedido do APK ANTIGO (detetor em falta) era ?plataforma=pwa — controlo negativo", async () => {
  reiniciarDuploCapacitor(); // browser: é o que o APK fazia antes da correcção
  const corpo = { plataforma: "pwa", isLeilaoAtivo: true, isPagamentoNativoAtivo: false };
  const r = await correr(hook, { via: "funcao", corpo }, null);
  assert.equal(r.plataforma, "pwa");
  assert.equal(r.isPagamentoNativoAtivo, false);
  assert.match(ULTIMO_PEDIDO.url, /plataforma=pwa/);
});

test("(g) CADEIA Supabase (o outro ramo): a mesma chave android chega ligada", async () => {
  ARRANCAR_ANDROID();
  const r = await correr(hook, { via: "supabase", valor: LIGADO }, null);
  assert.equal(r.plataforma, "android");
  assert.equal(r.isLeilaoAtivo, false);
  assert.equal(r.isPagamentoNativoAtivo, true);
});

// ── (h)(i) Prova bidireccional: o detetor NÃO chega — a config tem de dizer true ───────────────
test("(h) com a config REAL de produção (android:false) a flag continua FALSE no APK", async () => {
  ARRANCAR_ANDROID();
  const r = await correr(hook, { via: "supabase", valor: PROD }, null);
  assert.equal(r.plataforma, "android", "o detetor já está certo…");
  assert.equal(r.isPagamentoNativoAtivo, false, "…e a flag continua desligada: são DUAS condições");
});

test("(i) PWA intocado: `android:true` na config NÃO liga nada no browser", async () => {
  reiniciarDuploCapacitor();
  const r = await correr(hook, { via: "supabase", valor: LIGADO }, null);
  assert.equal(r.plataforma, "pwa");
  assert.equal(r.isPagamentoNativoAtivo, false);
  assert.equal(r.isLeilaoAtivo, true, "o leilão do PWA não muda");
});

// ── (j) Paridade cliente/servidor no caso NOVO ────────────────────────────────────────────────
test("(j) backend resolve o mesmo: android:true ⇒ true em 'android' e false em 'pwa'/'ios'", () => {
  for (const p of ["ios", "android", "pwa"]) {
    const cli = resolverParaPlataforma(LIGADO, p);
    const srv = backend.resolverRecursos(LIGADO, p);
    assert.equal(cli.isPagamentoNativoAtivo, srv.isPagamentoNativoAtivo, `flag ${p}`);
    assert.equal(cli.isLeilaoAtivo, srv.isLeilaoAtivo, `leilão ${p}`);
  }
  assert.equal(backend.resolverRecursos(LIGADO, "android").isPagamentoNativoAtivo, true);
  assert.equal(backend.resolverRecursos(LIGADO, "pwa").isPagamentoNativoAtivo, false);
  assert.equal(backend.resolverRecursos(LIGADO, "ios").isPagamentoNativoAtivo, false);
  assert.equal(backend.resolverRecursos(PROD, "android").isPagamentoNativoAtivo, false);
});

// ── (m) Limite honesto do fail-soft ───────────────────────────────────────────────────────────
test("(m) sem config (fallback local) a flag fica false — fail-safe declarado", async () => {
  ARRANCAR_ANDROID();
  const r = await correr(hook, { via: "local" }, null);
  assert.equal(r.plataforma, "android");
  assert.equal(r.isPagamentoNativoAtivo, false, "config ilegível ⇒ Billing desligado, PIX mantém-se");
});
