// MC89.40 (F2) — guardas do gate de cota no frontend.
//
// node --test --experimental-test-module-mocks "src/lib/*.test.mjs"
//
// O frontend não tem runner de React, portanto o que se protege aqui é (a) a
// REGRA, replicada a partir do fonte e verificada contra ele, e (b) a FORMA das
// decisões no código. Ambas as abordagens já apanharam defeitos reais neste
// projeto; nenhuma delas sozinha chega.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const semComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n").filter((l) => !l.trimStart().startsWith("//")).join("\n");

// ── ⚠️ A GUARDA MAIS IMPORTANTE DESTE FICHEIRO ──────────────────────────────
// A lista de categorias existe DUAS vezes: no backend (`_lib/cota-ativacao.mjs`,
// que é quem ESCREVE a categoria) e no frontend (`AppContext.jsx`, que não pode
// importar das funções Netlify). Duas cópias da mesma regra divergem — e foi
// exatamente uma divergência dessas que produziu o defeito do MC89.35.

test("⚠️ as listas de categorias do frontend e do backend não podem divergir", () => {
  const extrair = (src, marcador) => {
    const linha = src.split("\n").find((l) => l.includes(marcador));
    assert.ok(linha, `não encontrei a lista em ${marcador}`);
    return [...linha.matchAll(/"([a-z]+)"/g)].map((m) => m[1]).sort();
  };
  const frontend = extrair(ler("../context/AppContext.jsx"), "CATEGORIAS_COTA = new Set");
  const backend  = extrair(ler("../../netlify/functions/_lib/cota-ativacao.mjs"), "CATEGORIAS = new Set");

  assert.deepEqual(frontend, backend,
    "as duas listas de categorias divergiram — uma cota válida num lado seria inválida no outro");
  assert.deepEqual(frontend, ["bronze", "diamante", "ouro", "prata"]);
});

// ── A REGRA (replicada do fonte e verificada contra ele) ─────────────────────

const CATEGORIAS = new Set(["bronze", "prata", "ouro", "diamante"]);
const cotaAtiva = (cota) => cota == null
  ? null
  : (cota.vendida === true
     && typeof cota.categoria === "string"
     && CATEGORIAS.has(cota.categoria.toLowerCase()));

test("a regra replicada é literalmente a que está no AppContext", () => {
  // Sem isto, os testes abaixo validariam a minha cópia e não o produto — que é
  // a armadilha de "verificação que partilha o defeito".
  const ctx = semComentarios(ler("../context/AppContext.jsx"));
  assert.match(ctx, /cotaCorporativa\.vendida === true/,
    "a comparação de `vendida` deixou de ser estrita");
  assert.match(ctx, /CATEGORIAS_COTA\.has\(cotaCorporativa\.categoria\.toLowerCase\(\)\)/,
    "a validação de categoria mudou de forma");
  assert.match(ctx, /const cotaAtiva = cotaCorporativa == null\r?\n\s*\? null/,
    "o estado 'ainda não sei' (null) desapareceu — sem ele, mostra-se INATIVA a quem só ainda não foi verificado");
});

test("cota ainda não carregada → null (ainda não sei), nunca false", () => {
  assert.equal(cotaAtiva(null), null);
  assert.equal(cotaAtiva(undefined), null);
});

test("o cadastro sem pagamento não é ativo", () => {
  assert.equal(cotaAtiva({ vendida: false, categoria: null }), false);
});

test("⚠️ vendida=true sem categoria → inativa (a cota que o ADM consegue criar)", () => {
  assert.equal(cotaAtiva({ vendida: true, categoria: null }), false);
});

test("`vendida` truthy mas não booleano não conta", () => {
  assert.equal(cotaAtiva({ vendida: "false", categoria: "ouro" }), false);
  assert.equal(cotaAtiva({ vendida: 1, categoria: "ouro" }), false);
});

test("controlo positivo: paga e com categoria válida → ativa", () => {
  for (const c of ["bronze", "prata", "ouro", "diamante", "OURO"]) {
    assert.equal(cotaAtiva({ vendida: true, categoria: c }), true, `falhou em ${c}`);
  }
});

test("categoria inventada → inativa", () => {
  assert.equal(cotaAtiva({ vendida: true, categoria: "platina" }), false);
});

// ── UTAC108f — o gate de cota (CorporativoRoute + CotaInativa) e o F3 da CorporativoCarteira SAÍRAM
// com o lojista (decisão do operador: o lojista sai do app). Os 6 testes que fixavam esse código
// (gate substitui conteúdo · `=== false` · rotas de compra isentas · ecrã de bloqueio · F3 sem poller ·
// F3 só com dados) deram lugar a este guarda de remoção. A regra `cotaAtivaDe` (acima) continua testada:
// o AppContext ainda a calcula.
test("UTAC108f · o gate de cota do lojista saiu do App.jsx e o CotaInativa foi apagado", async () => {
  const { existsSync } = await import("node:fs");
  const app = semComentarios(ler("../App.jsx"));
  assert.doesNotMatch(app, /cotaAtiva === false|ROTAS_SEM_GATE_DE_COTA|CotaInativa|CorporativoRoute/);
  assert.equal(existsSync(new URL("../components/CotaInativa.jsx", import.meta.url)), false);
  assert.equal(existsSync(new URL("../pages/CorporativoCarteira.jsx", import.meta.url)), false);
});

test("⚠️ atualizarTipoCorporativo TEM de ser estável (senão é um ciclo de fetch)", () => {
  // Ela entra nas dependências do `carregar`, que alimenta um
  // useEffect(() => carregar(), [carregar]). Sem useCallback, identidade nova a
  // cada render → efeito volta a correr → fetch → render → em ciclo fechado.
  const ctx = semComentarios(ler("../context/AppContext.jsx"));
  assert.match(ctx, /const atualizarTipoCorporativo = useCallback\(/,
    "atualizarTipoCorporativo deixou de ser estável — volta a tempestade de pedidos ao /cotas");
});
