// UTAC154 (DEBT-121) — o <img> do img-proxy tem de ser ABSOLUTO no app nativo e RELATIVO na web.
//
// No Capacitor um caminho relativo resolve-se no próprio telemóvel (fallback de SPA → index.html → imagem
// em branco). `imagemProdutoSrc` passa a usar `apiUrl()` (a base das chamadas à API): absolutiza SÓ
// `/.netlify/functions/*` e SÓ no nativo. Assets locais ficam intactos em todas as plataformas.
//
// A base é calculada quando o módulo carrega (`API_ORIGIN`), por isso o modo nativo corre num processo
// filho com `window.Capacitor` preparado ANTES do import.
// node --test src/__tests__/utac154-imagem-nativo.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { imagemProdutoSrc } from "../lib/imagem.js";

const AQUI = dirname(fileURLToPath(import.meta.url));
const IMAGEM = pathToFileURL(resolve(AQUI, "..", "lib", "imagem.js")).href;
const PROD = "https://silly-stardust-ca71bc.netlify.app";
const EXTERNA = "https://cdn.exemplo.com/produtos/air-fryer.png";
const PROXY_REL = `/.netlify/functions/img-proxy?url=${encodeURIComponent(EXTERNA)}`;

const CASOS = {
  externa: { imagem_url: EXTERNA },
  assetLocal: { imagem_url: "/assets/produto-placeholder.png" },
  iconeLocal: { imagem_url: "/icons/icon-192.png" },
  relativoFunction: { imagem_url: "/.netlify/functions/banners?id=7" },
  dataUri: { imagem_url: "data:image/png;base64,AAAA" },
  blob: { imagem_url: "blob:https://x/1" },
  base64: { imagemBase64: "AAAA", mime: "image/webp" },
  vazio: {},
  invalida: { imagem_url: "https://" },
};

/** Corre `imagemProdutoSrc` num processo com o window de um WebView nativo. */
function noNativo(origem) {
  const prog = `
    globalThis.window = { Capacitor: { isNativePlatform: () => true }, location: { origin: ${JSON.stringify(origem)} } };
    const { imagemProdutoSrc } = await import(${JSON.stringify(IMAGEM)});
    const casos = ${JSON.stringify(CASOS)};
    const out = {};
    for (const [k, p] of Object.entries(casos)) out[k] = imagemProdutoSrc(p);
    out.mesmaOrigemProd = imagemProdutoSrc({ imagem_url: ${JSON.stringify(PROD + "/img/x.png")} });
    console.log(JSON.stringify(out));`;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", prog], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout.trim().split("\n").pop());
}

test("UTAC154 · WEB: o proxy continua RELATIVO (same-origin, CSP img-src 'self') e o resto não muda", () => {
  assert.equal(imagemProdutoSrc(CASOS.externa), PROXY_REL);
  assert.equal(imagemProdutoSrc(CASOS.assetLocal), "/assets/produto-placeholder.png");
  assert.equal(imagemProdutoSrc(CASOS.iconeLocal), "/icons/icon-192.png");
  assert.equal(imagemProdutoSrc(CASOS.relativoFunction), "/.netlify/functions/banners?id=7");
  assert.equal(imagemProdutoSrc(CASOS.dataUri), "data:image/png;base64,AAAA");
  assert.equal(imagemProdutoSrc(CASOS.blob), "blob:https://x/1");
  assert.equal(imagemProdutoSrc(CASOS.base64), "data:image/webp;base64,AAAA");
  assert.equal(imagemProdutoSrc(CASOS.vazio), null);
  assert.equal(imagemProdutoSrc(null), null);
  assert.equal(imagemProdutoSrc(CASOS.invalida), null);
});

for (const [rotulo, origem] of [["ANDROID", "https://localhost"], ["iOS", "capacitor://localhost"]]) {
  test(`UTAC154 · ${rotulo} (${origem}): o proxy fica ABSOLUTO na produção; assets locais intactos`, () => {
    const o = noNativo(origem);
    assert.equal(o.externa, PROD + PROXY_REL, "o <img> do proxy tem de ir à produção, não ao telemóvel");
    assert.equal(o.relativoFunction, PROD + "/.netlify/functions/banners?id=7");
    // assets empacotados no build: servidos pelo próprio WebView — NÃO podem ganhar a origem da produção
    assert.equal(o.assetLocal, "/assets/produto-placeholder.png");
    assert.equal(o.iconeLocal, "/icons/icon-192.png");
    assert.equal(o.dataUri, "data:image/png;base64,AAAA");
    assert.equal(o.blob, "blob:https://x/1");
    assert.equal(o.base64, "data:image/webp;base64,AAAA");
    assert.equal(o.vazio, null);
    assert.equal(o.invalida, null);
    // uma imagem já alojada na produção não é «da mesma origem» do WebView ⇒ vai pelo proxy absoluto (funciona)
    assert.equal(o.mesmaOrigemProd, PROD + `/.netlify/functions/img-proxy?url=${encodeURIComponent(PROD + "/img/x.png")}`);
  });
}
