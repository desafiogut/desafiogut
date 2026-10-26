// UTAC111 (Frente A, R18-111-A) — no APK a Carteira NÃO oferece depósito PIX de saldo (o Passe vai pelo
// Google Play Billing); no PWA mantém-se (no browser o Passe só se compra com saldo R$).
// node --test src/__tests__/utac111-carteira-sem-pix-apk.test.mjs   (a partir de desafio-gut/frontend)
//
// A presença no PWA está provada por RENDER em `utac106c-carteira-render.test.mjs` (o Capacitor do SSR responde
// «web»). Aqui fica a cablagem do APK, lida da fonte SEM comentários: as TRÊS portas para o depósito (botão,
// atalho «Carregar agora (PIX)» do aviso 402 e o próprio modal) passam pela mesma condição, e a condição é a
// PONTE nativa (`androidNativo()`), nunca `plataforma`/`?plataforma=` (sobreponível — lição do UTAC110i.2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const semComentarios = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const fonte = semComentarios(readFileSync(new URL("../pages/MinhaCarteira.jsx", import.meta.url), "utf8"));

test("a condição é a ponte nativa (UTAC116: pixPermitido) e NUNCA ?plataforma=", () => {
  // UTAC116 — o AAB v3 mostrou o botão porque a decisão vinha de um único sinal, avaliado uma vez.
  // O contrato passou a `pixPermitido(plataformaNativa)`, com a plataforma reavaliada no mount.
  assert.match(fonte, /import\s*\{[^}]*pixPermitido[^}]*\}\s*from\s*"\.\.\/lib\/google-play-billing\.js"/);
  assert.match(fonte, /const depositoPix = pixPermitido\(plataformaNativa\);/);
  // O que continua PROIBIDO: decidir pelo parâmetro sobreponível `?plataforma=`.
  assert.doesNotMatch(fonte, /\?plataforma=/);
  assert.doesNotMatch(fonte, /depositoPix\s*=\s*[^;]*(===?\s*["']android["']|plataforma\s*===)/);
});

test("o botão «Depositar PIX» só existe com depositoPix", () => {
  const i = fonte.indexOf("💰 Depositar PIX");
  assert.ok(i > 0);
  const abre = fonte.lastIndexOf("{depositoPix && <button", i);
  const anterior = fonte.lastIndexOf("<button", i);
  assert.ok(abre >= 0 && abre + "{depositoPix && ".length === anterior, "o <button> do depósito tem de abrir com {depositoPix && …}");
});

test("o atalho «Carregar agora (PIX)» do aviso 402 só existe com depositoPix", () => {
  const i = fonte.indexOf("Carregar agora (PIX)");
  assert.ok(i > 0);
  assert.equal(fonte.lastIndexOf("{depositoPix && <button", i) + "{depositoPix && ".length, fonte.lastIndexOf("<button", i));
});

test("o modal de depósito nunca abre sem depositoPix", () => {
  assert.match(fonte, /<ComprarFichasModal\s+aberto=\{depositoPix && comprarAberto\}/);
});

test("achado 3 do validador: no APK nenhum TEXTO convida a depositar por PIX", () => {
  const i = fonte.indexOf("Depósito por PIX via Mercado Pago");
  assert.ok(i > 0);
  assert.equal(fonte.lastIndexOf("{depositoPix && <p", i) + "{depositoPix && ".length, fonte.lastIndexOf("<p", i));
  // UTAC112: o aviso passou a dizer para QUANTOS passes falta saldo; a invariante fica — o convite a
  // depositar por PIX só existe com depositoPix (antes: um literal fixo com a mesma condição).
  assert.match(fonte, /setErroPasse\(depositoPix \? `\$\{falta\} Deposite via PIX e tente de novo\.` : falta\)/);
  assert.doesNotMatch(fonte.replace(/depositoPix \? `\$\{falta\} Deposite via PIX e tente de novo\.`/, ""), /Deposite via PIX/);
});
