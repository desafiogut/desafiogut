// utac116-pix-apk.test.mjs — UTAC116. O PIX genérico NÃO pode aparecer no APK.
//
// Contexto: o AAB v3 mostrou o botão «Depositar PIX» na Carteira do telemóvel do Ruan. A decisão
// era tomada UMA vez no 1.º render e só pelo Capacitor empacotado; se o bridge ainda não estivesse
// visível nesse instante, `androidNativo()` respondia `false` e o PIX aparecia — e nunca voltava a
// ser reavaliado. Este teste fixa o contrato NOVO (três sinais independentes + reavaliação).
//
// node --test src/__tests__/utac116-pix-apk.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { detectarPlataformaNativa, pixPermitido, androidNativo } from "../lib/google-play-billing.js";

/** window falso: sem bridge, sem Capacitor. */
const janelaWeb = (extra = {}) => ({
  navigator: { userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/140 Safari/537.36" },
  location: { protocol: "https:", hostname: "desafiogut.com", port: "" },
  addEventListener() {}, removeEventListener() {},
  ...extra,
});

test("PWA no domínio real ⇒ 'web' e o PIX é permitido", () => {
  assert.equal(detectarPlataformaNativa(janelaWeb()), "web");
  assert.equal(pixPermitido("web"), true);
});

test("APK: origin https://localhost sem porta ⇒ 'android' MESMO SEM bridge visível", () => {
  // Era exactamente este o cenário do AAB v3: o Capacitor não respondia no 1.º render.
  const apkSemBridge = janelaWeb({ location: { protocol: "https:", hostname: "localhost", port: "" } });
  assert.equal(detectarPlataformaNativa(apkSemBridge), "android");
  assert.equal(pixPermitido("android"), false, "o PIX tem de desaparecer no APK");
});

test("APK: o bridge androidBridge sozinho já chega (sem o sinal de localhost)", () => {
  // Isolado de propósito: domínio real + bridge presente. Só o sinal do bridge pode responder
  // aqui, senão este teste ficaria a medir o sinal do localhost (mutante M2 sobrevivia).
  const apk = janelaWeb({ androidBridge: {} });
  assert.equal(detectarPlataformaNativa(apk), "android");
});

test("APK: Capacitor no window responde android ⇒ 'android'", () => {
  const apk = janelaWeb({
    Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" },
  });
  assert.equal(detectarPlataformaNativa(apk), "android");
});

test("PWA dentro do navegador in-app do WhatsApp (UA «; wv)») NÃO é tratado como APK", () => {
  // Trade-off explícito: esconder o PIX por User-Agent partiria utilizadores legítimos do PWA
  // que abrem o link dentro de outra app. Por isso o UA NÃO é usado como sinal.
  const inApp = janelaWeb({
    navigator: { userAgent: "Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36" },
  });
  assert.equal(detectarPlataformaNativa(inApp), "web");
  assert.equal(pixPermitido("web"), true);
});

test("vite dev (http://localhost:5173) NÃO é tratado como APK", () => {
  const dev = janelaWeb({ location: { protocol: "http:", hostname: "localhost", port: "5173" } });
  assert.equal(detectarPlataformaNativa(dev), "web");
});

test("iOS nativo mantém o PIX (não há Billing iOS implementado)", () => {
  const ios = janelaWeb({ Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" } });
  assert.equal(detectarPlataformaNativa(ios), "ios");
  assert.equal(pixPermitido("ios"), true);
});

test("ambiente sem window não rebenta e cai em 'web'", () => {
  assert.equal(detectarPlataformaNativa(null), "web");
});

test("androidNativo() continua a responder pelo contrato antigo", () => {
  assert.equal(androidNativo(), false, "sem window nesta corrida ⇒ não é Android");
});

test("MinhaCarteira: a Carteira usa a função testada e REAVALIA a plataforma no mount", () => {
  const src = readFileSync(new URL("../pages/MinhaCarteira.jsx", import.meta.url), "utf8");
  assert.match(src, /pixPermitido\(plataformaNativa\)/, "a condição do botão tem de passar por pixPermitido()");
  assert.match(src, /detectarPlataformaNativa\(\)/, "a plataforma tem de ser detectada, não presumida");
  assert.match(src, /useEffect\(/, "tem de haver reavaliação depois do mount");
  assert.match(src, /addEventListener\("focus"/, "reavaliar quando a app volta ao primeiro plano");
  assert.doesNotMatch(src, /const depositoPix = !androidNativo\(\);/, "a condição antiga (um só render) não pode voltar");
});
