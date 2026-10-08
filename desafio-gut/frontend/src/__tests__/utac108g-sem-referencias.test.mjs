// UTAC108g — limpeza das referências residuais ao lojista (depois do UTAC108f).
//
// node --test "src/__tests__/utac108g-sem-referencias.test.mjs"
//
// Decisões do operador (R18, SEG0):
//   R18-A  o degrau 2 do encaminhamento fica, mas devolve DASHBOARD (comportamento igual);
//   R18-B  meta = 0 `/corporativo` no código de PRODUÇÃO (comentários incluídos); os testes
//          precisam do literal para provar a ausência e ficam de fora;
//   R18-D  saem `cotaAtiva`, `CATEGORIAS_COTA` e `atualizarTipoCorporativo` (ver cotaAtiva.test.mjs).
// O que FICA (não é do painel do lojista): `tipoProvavel === "corporativo"` no aviso «Sem saldo»
// (R18-B do UTAC108c) e o estado `cotaCorporativa`/`tipoUsuario` que o alimenta.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const ler = (rel) => readFileSync(join(SRC, rel), "utf8");

// Ficheiros de PRODUÇÃO de `src/`: fora ficam testes, duplos de teste e cópias `.bak-*`.
function ficheirosDeProducao(dir = SRC, acc = []) {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) {
      if (nome === "__tests__" || nome.startsWith("_stubs")) continue;
      ficheirosDeProducao(p, acc);
    } else if (/\.(jsx?|mjs|css|html)$/.test(nome) && !/\.test\.m?js$/.test(nome) && !nome.includes(".bak-")) {
      acc.push(p);
    }
  }
  return acc;
}

function ocorrencias(literal) {
  return ficheirosDeProducao()
    .flatMap((p) => readFileSync(p, "utf8").split("\n")
      .map((l, i) => (l.includes(literal) ? `${relative(SRC, p).split(sep).join("/")}:${i + 1}` : null))
      .filter(Boolean));
}

test("controlo positivo: a varredura vê ficheiros de produção e lê o que lá está", () => {
  const fs = ficheirosDeProducao().map((p) => relative(SRC, p).split(sep).join("/"));
  assert.ok(fs.length > 100, `só ${fs.length} ficheiros — a varredura ficou cega`);
  for (const f of ["App.jsx", "context/AppContext.jsx", "lib/encaminhamento.js", "components/ChatbotWidget.jsx"]) {
    assert.ok(fs.includes(f), `${f} ficou fora da varredura`);
  }
  assert.ok(!fs.some((f) => f.includes("__tests__") || /\.test\.m?js$/.test(f)), "a varredura entrou nos testes");
  // Um literal que SABEMOS existir em produção tem de aparecer (senão o «0» abaixo não prova nada).
  assert.ok(ocorrencias('"/admin"').length > 0);
});

test("R18-B · 0 `/corporativo` no código de produção (comentários incluídos)", () => {
  assert.deepEqual(ocorrencias("/corporativo"), []);
});

test("SEG2 · o selo do lojista (U+25C8 + «Lojista») saiu do chat (e nenhum U+25C8 em produção)", () => {
  assert.deepEqual(ocorrencias(String.fromCodePoint(0x25c8)), []); // sem o glifo literal: o teste não conta no grep
  assert.doesNotMatch(ler("components/ChatbotWidget.jsx"), /Lojista"/);
  // O badge do admin e o «●» do comprador continuam.
  assert.match(ler("components/ChatbotWidget.jsx"), /txt: "⚡ Admin"/);
  assert.match(ler("components/ChatbotWidget.jsx"), /txt: "●"/);
});

test("SEG3 · a carteira corporativa saiu do contexto", () => {
  assert.deepEqual(ocorrencias("corporativoWallet"), []);
  assert.deepEqual(ocorrencias("addressCorporativo"), []);
});

test("R18-A · o ex-lojista vai para o Dashboard e o destino CORPORATIVO deixou de existir", async () => {
  const { decidirDestino, DESTINO } = await import("../lib/encaminhamento.js");
  assert.equal(Object.hasOwn(DESTINO, "CORPORATIVO"), false);
  const base = {
    address: null, isAdmin: false, adminLoading: false, adminProvavel: false,
    tipoProvavel: "corporativo", tipoUsuario: "comum", tipoCarregando: false, tipoResolvido: false,
    pareceAutenticado: true, restaurandoSessao: false, loginEmCurso: false, prazoEsgotado: false,
  };
  // Discriminante: sem o degrau, este caso seria ESTADO_NEUTRO (comportamento novo, não pedido).
  assert.equal(decidirDestino(base), DESTINO.DASHBOARD);
  // Controlo: o comprador no mesmo instante continua no estado neutro.
  assert.equal(decidirDestino({ ...base, tipoProvavel: "comum" }), DESTINO.ESTADO_NEUTRO);
});

test("SEG1 · as rotas do lojista deixaram de ser «de trabalho» (o /admin continua)", async () => {
  const { ehRotaDeTrabalho } = await import("../lib/rotasTrabalho.js");
  assert.equal(ehRotaDeTrabalho("/admin"), true);
  assert.equal(ehRotaDeTrabalho("/admin/cotas"), true);
  assert.equal(ehRotaDeTrabalho("/corporativo"), false);
  assert.equal(ehRotaDeTrabalho("/corporativo/cotas"), false);
});

test("preserva o R18-B do UTAC108c: o aviso «Sem saldo» continua escondido a ex-lojistas", async () => {
  assert.match(ler("components/SemSaldoBanner.jsx"), /tipoProvavel === "corporativo"\) return false/);
  assert.match(ler("context/AppContext.jsx"), /const tipoProvavel = tipoUsuario === "corporativo"/);
});
