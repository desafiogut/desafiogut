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

// ── FORMA DAS DECISÕES EM App.jsx ───────────────────────────────────────────

test("⚠️ o gate de cota SUBSTITUI conteúdo — não pode redirecionar", () => {
  // Se aqui aparecesse um <Navigate>, voltaria o ciclo /corporativo ↔ / que o
  // MC88.42 mediu (sete voltas, 1974→5064 ms), porque o MC89.36 encaminha para
  // cá pelo palpite antes de a cota responder.
  const app = semComentarios(ler("../App.jsx"));
  const linhas = app.split("\n");
  const i = linhas.findIndex((l) => l.includes("cotaAtiva === false"));
  assert.ok(i >= 0, "o gate de cota desapareceu do CorporativoRoute");
  // O `return` vive na linha seguinte ao `if` — olha-se para o BLOCO, não para
  // uma linha. (A primeira versão deste teste olhava só para a linha do `if` e
  // dava vermelho sem que nada estivesse errado no produto.)
  const bloco = linhas.slice(i, i + 3).join("\n");
  assert.match(bloco, /CotaInativa/, "o gate deixou de substituir o conteúdo");
  assert.doesNotMatch(bloco, /Navigate/,
    "o gate passou a redirecionar — volta o ciclo do MC88.42");
});

test("⚠️ o gate compara com `=== false`, não com `!cotaAtiva`", () => {
  // `!null` é true. Com `!cotaAtiva`, um lojista PAGO veria "cota inativa"
  // durante todo o arranque, até /cotas responder.
  const app = semComentarios(ler("../App.jsx"));
  assert.match(app, /if \(cotaAtiva === false/,
    "o gate passou a tratar 'ainda não sei' como 'inativa'");
});

test("⚠️ as rotas de COMPRA ficam fora do gate", () => {
  // Sem isto, o botão "Comprar cota" levaria ao próprio ecrã de bloqueio: uma
  // porta para uma parede (lição do MC89.34).
  const app = semComentarios(ler("../App.jsx"));
  assert.match(app, /ROTAS_SEM_GATE_DE_COTA/, "a lista de isenções desapareceu");
  assert.match(app, /"\/corporativo\/carteira"/, "a rota de COMPRA entrou no gate");
  assert.match(app, /"\/corporativo\/cotas"/, "a rota de ESTADO da cota entrou no gate");
  const linha = app.split("\n").find((l) => l.includes("cotaAtiva === false"));
  assert.match(linha, /ROTAS_SEM_GATE_DE_COTA\.has/,
    "o gate deixou de consultar as isenções");
});

test("o ecrã de bloqueio tem saída e distingue 'incompleta' de 'não pagou'", () => {
  const c = ler("../components/CotaInativa.jsx");
  assert.match(c, /Comprar cota/, "o caminho para comprar desapareceu");
  assert.match(c, /incompleta/,
    "deixou de distinguir a cota incompleta — mandaria comprar quem já pagou");
  assert.doesNotMatch(semComentarios(c), /animation:\s*["'`]gut-fade/,
    "ganhou pulsação: isto é um estado de BLOQUEIO, não de espera — sugeriria 'aguarde' a quem tem de agir");
});
