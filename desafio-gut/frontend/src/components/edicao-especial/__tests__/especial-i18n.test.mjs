// especial-i18n.test.mjs — MC94.2. Dicionário e fallbacks não podem divergir.
//
// Corre com:  node --test src/components/edicao-especial/__tests__/especial-i18n.test.mjs
// Mesma regra do MC94 (`src/i18n/__tests__/ativos-i18n.test.mjs`): os testes de
// componente renderizam com o FALLBACK; se o `pt` divergir dele, a suíte mede um
// texto e o utilizador lê outro.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const COMPONENTES = ["CardEdicaoEspecial", "ContagemDecrescente", "PainelVencedorEspecial"]
  .map((n) => `src/components/edicao-especial/${n}.jsx`);
const ler = (p) => readFileSync(resolve(RAIZ, p), "utf8");

function fallbacks() {
  const m = new Map();
  for (const f of COMPONENTES) {
    const s = ler(f);
    for (const [, k, v] of s.matchAll(/t\(\s*"(edicao\.especial\.[^"]+)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\)/g)) m.set(k, v);
    for (const [, k, v] of s.matchAll(/chave:\s*"(edicao\.especial\.[^"]+)",\s*texto:\s*"([^"]+)"/g)) m.set(k, v);
  }
  return m;
}
function dicionario(lang) {
  const m = new Map();
  for (const [, k, v] of ler(`src/i18n/${lang}.js`).matchAll(/^\s*"(edicao\.especial\.[^"]+)":\s*"((?:[^"\\]|\\.)*)",?\s*$/gm)) {
    assert.ok(!m.has(k), `${k} duplicada em ${lang}.js`);
    m.set(k, v);
  }
  return m;
}

// MC98 — o DesafioGUT é PT-BR only (`en.js`/`es.js` removidos). O teste que exigia
// «en e es têm todas as chaves, traduzidas» foi REMOVIDO: media idiomas que já não
// existem. O que fica é a regra que sempre valeu — o dicionário PT não pode divergir
// dos fallbacks que os componentes renderizam, nem guardar chaves sem call-site.

test("há chaves (controlo positivo: o extractor não está cego)", () => {
  assert.ok(fallbacks().size >= 20, `só ${fallbacks().size} chaves encontradas`);
});

test("pt é IGUAL aos fallbacks, chave a chave", () => {
  const fb = fallbacks();
  const pt = dicionario("pt");
  for (const [k, v] of fb) assert.equal(pt.get(k), v, `${k}: pt ≠ fallback`);
});

test("nenhuma chave órfã nos dicionários", () => {
  const fb = fallbacks();
  for (const lang of ["pt"]) {   // MC98 — PT-BR only: en.js/es.js removidos
    for (const k of dicionario(lang).keys()) assert.ok(fb.has(k), `${k} em ${lang}.js sem call-site`);
  }
});
