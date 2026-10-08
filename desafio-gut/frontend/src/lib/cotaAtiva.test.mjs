// MC89.40 (F2) — guardas do gate de cota no frontend.
//
// node --test --experimental-test-module-mocks "src/lib/*.test.mjs"
//
// UTAC108g (R18-D) — o `cotaAtiva`, o `CATEGORIAS_COTA` e o `atualizarTipoCorporativo` saíram do
// AppContext: o gate do painel do lojista (o único consumidor) e os dois chamadores foram apagados
// no UTAC108f. Os testes que fixavam a REGRA da cota paga, a paridade da lista de categorias com o
// backend e a estabilidade do `useCallback` deram lugar a guardas de REMOÇÃO. A regra continua
// viva onde decide de facto: no servidor (`_lib/cota-ativacao.mjs`, `_lib/cota-utils.mjs`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const semComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n").filter((l) => !l.trimStart().startsWith("//")).join("\n");


// ── UTAC108f — o gate de cota (CorporativoRoute + CotaInativa) e o F3 da CorporativoCarteira SAÍRAM
// com o lojista (decisão do operador: o lojista sai do app). Os 6 testes que fixavam esse código
// (gate substitui conteúdo · `=== false` · rotas de compra isentas · ecrã de bloqueio · F3 sem poller ·
// F3 só com dados) deram lugar a este guarda de remoção.
test("UTAC108f · o gate de cota do lojista saiu do App.jsx e o CotaInativa foi apagado", async () => {
  const { existsSync } = await import("node:fs");
  const app = semComentarios(ler("../App.jsx"));
  assert.doesNotMatch(app, /cotaAtiva === false|ROTAS_SEM_GATE_DE_COTA|CotaInativa|CorporativoRoute/);
  assert.equal(existsSync(new URL("../components/CotaInativa.jsx", import.meta.url)), false);
  assert.equal(existsSync(new URL("../pages/CorporativoCarteira.jsx", import.meta.url)), false);
});

test("UTAC108g · cotaAtiva, CATEGORIAS_COTA e atualizarTipoCorporativo saíram do AppContext", () => {
  const ctx = semComentarios(ler("../context/AppContext.jsx"));
  for (const nome of ["cotaAtiva", "CATEGORIAS_COTA", "atualizarTipoCorporativo"]) {
    assert.doesNotMatch(ctx, new RegExp(`\\b${nome}\\b`), `${nome} voltou ao AppContext`);
  }
  // Controlo positivo: o estado `cotaCorporativa` FICA — alimenta `tipoUsuario`/`tipoProvavel`, que o
  // aviso «Sem saldo» (R18-B do UTAC108c) usa para não se mostrar a ex-lojistas.
  assert.match(ctx, /const \[cotaCorporativa, setCotaCorporativa\] = useState\(null\)/);
  assert.match(ctx, /const tipoProvavel = /);
});
