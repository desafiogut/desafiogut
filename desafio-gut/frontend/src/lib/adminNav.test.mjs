// MC89.6 — testes do modelo de navegação do painel ADM.
// node --test src/lib/adminNav.test.mjs
//
// Não há runner de React neste projeto (docs/MC89.6-DECISOES.txt, T-1), por isso
// não se testa a árvore renderizada. Testa-se o MODELO — que é o que pode
// divergir: um link para uma rota inexistente, duas telas com o mesmo caminho,
// ou o índice a desaparecer.
//
// O último teste é o que dá valor real: lê `App.jsx` e afirma que as rotas
// declaradas lá são exatamente as deste modelo. Sem ele, a lista podia estar
// perfeita e a aplicação servir outra coisa.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { TELAS_ADMIN, TELAS_DO_PLANO, telaIndice, telaAtiva } from "./adminNav.js";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC  = join(AQUI, "..");

// ── Forma do modelo ─────────────────────────────────────────────────────────

test("as 7 telas do plano do MC89.5 estão todas declaradas", () => {
  assert.deepEqual(
    TELAS_DO_PLANO.map((t) => t.id),
    ["visao", "usuarios", "financeiro", "operacoes", "logs", "notificacoes", "configuracoes"],
  );
});

test("Aprovações e Cotas continuam presentes e marcadas como herdadas (T-2)", () => {
  const herdadas = TELAS_ADMIN.filter((t) => t.nota).map((t) => t.id);
  assert.deepEqual(herdadas, ["aprovacoes", "cotas"],
    "são funcionalidades vivas; perdê-las seria uma regressão silenciosa");
  // E não contam como parte da estrutura aprovada de sete.
  assert.equal(TELAS_DO_PLANO.length, 7);
  assert.equal(TELAS_ADMIN.length, 9);
});

test("há exatamente UM índice, e é a Visão Geral (D-NAV)", () => {
  const indices = TELAS_ADMIN.filter((t) => t.index);
  assert.equal(indices.length, 1);
  assert.equal(telaIndice().id, "visao");
  assert.equal(telaIndice().rota, "", "a rota de índice é vazia; /admin serve-a diretamente");
});

test("ids, rotas e hrefs são únicos", () => {
  for (const campo of ["id", "rota", "href"]) {
    const valores = TELAS_ADMIN.map((t) => t[campo]);
    assert.equal(new Set(valores).size, valores.length, `há ${campo} repetido`);
  }
});

test("cada href é /admin + rota — a navegação não pode inventar caminhos", () => {
  for (const t of TELAS_ADMIN) {
    assert.equal(t.href, t.rota ? `/admin/${t.rota}` : "/admin", `href errado em "${t.id}"`);
  }
});

test("os rótulos são curtos o suficiente para um telemóvel", () => {
  // A lição do MC89.4: um rótulo truncado por omissão lê-se como descuido.
  for (const t of TELAS_ADMIN) {
    assert.ok(t.label.length <= 12, `rótulo demasiado longo: "${t.label}" (${t.label.length})`);
    assert.ok(t.label.trim().length > 0, `rótulo vazio em "${t.id}"`);
  }
});

test("sem emojis nos rótulos (regra do MC89.4)", () => {
  const emoji = /\p{Extended_Pictographic}/u;
  for (const t of TELAS_ADMIN) {
    assert.equal(emoji.test(t.label), false, `"${t.label}" tem emoji`);
  }
});

// ── telaAtiva ───────────────────────────────────────────────────────────────

test("telaAtiva resolve o índice, as filhas e a barra final", () => {
  assert.equal(telaAtiva("/admin").id, "visao");
  assert.equal(telaAtiva("/admin/").id, "visao");
  assert.equal(telaAtiva("/admin/usuarios").id, "usuarios");
  assert.equal(telaAtiva("/admin/cotas").id, "cotas");
});

test("telaAtiva casa o SEGMENTO, não um prefixo", () => {
  // Com `startsWith`, "/admin" casaria com tudo e o índice ficaria sempre ativo.
  assert.equal(telaAtiva("/admin/usuarios/0xabc").id, "usuarios",
    "uma subrota de perfil ainda marca «Usuários» (Fase 4)");
  assert.equal(telaAtiva("/administracao"), null, "não é uma rota do painel");
  assert.equal(telaAtiva("/admin/inexistente"), null);
  assert.equal(telaAtiva("/"), null);
  assert.equal(telaAtiva(""), null);
  assert.equal(telaAtiva(undefined), null);
});

// ── O modelo corresponde ao que a aplicação serve ───────────────────────────

test("cada tela tem o seu ficheiro em pages/admin/", () => {
  for (const t of TELAS_ADMIN) {
    const caminho = join(SRC, "pages", "admin", t.ficheiro);
    assert.ok(existsSync(caminho), `falta ${t.ficheiro} (tela "${t.id}")`);
  }
});

test("App.jsx declara exatamente as rotas deste modelo", () => {
  const app = readFileSync(join(SRC, "App.jsx"), "utf8");

  // O bloco de rotas de /admin, do <Route path="/admin" até ao seu fecho.
  const inicio = app.indexOf('<Route path="/admin"');
  assert.notEqual(inicio, -1, "não encontrei o bloco de rotas de /admin");
  const bloco = app.slice(inicio, app.indexOf("</Route>", inicio));

  assert.ok(/<Route index\b/.test(bloco), "/admin tem de ter uma rota de índice (D-NAV)");

  const declaradas = [...bloco.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((p) => p !== "/admin");

  const esperadas = TELAS_ADMIN.filter((t) => !t.index).map((t) => t.rota);
  assert.deepEqual([...declaradas].sort(), [...esperadas].sort(),
    "o modelo de navegação e as rotas de App.jsx divergiram");
});

test("o painel está envolvido pelo AdminAuthProvider e por mais nada", () => {
  const app = readFileSync(join(SRC, "App.jsx"), "utf8");
  assert.ok(
    /<Route path="\/admin" element=\{<AdminAuthProvider>/.test(app),
    "as rotas de /admin têm de estar dentro do AdminAuthProvider — sem ele nenhuma tela tem sessão",
  );
  // A sessão admin não tem que existir no resto da aplicação: uma única
  // ocorrência prova que o provider não subiu para a raiz sem querer.
  assert.equal((app.match(/<AdminAuthProvider>/g) || []).length, 1);
});

test("REGRESSÃO DE BUNDLE: o contexto admin não importa ethers no topo", () => {
  // `utils/web3.js` arrasta ethers e hash-wasm. Um import estático aqui punha-os
  // no chunk de quem apenas ABRE o painel — e o AdminAuthContext é importado
  // estaticamente por App.jsx, logo o custo cairia no arranque da app inteira.
  // Verificado no dist do MC89.6: o chunk de entrada tem 0 ocorrências de
  // `BrowserProvider` e o contexto chega ao web3 por `import()` dinâmico.
  const ctx = readFileSync(join(SRC, "context", "AdminAuthContext.jsx"), "utf8");
  const importsDeTopo = [...ctx.matchAll(/^import\s[^;]+from\s+["']([^"']+)["']/gm)].map((m) => m[1]);
  assert.equal(importsDeTopo.includes("../utils/web3.js"), false,
    "web3.js só pode entrar por import dinâmico, dentro do callback de assinatura");
  assert.ok(/await import\(["']\.\.\/utils\/web3\.js["']\)/.test(ctx),
    "a assinatura tem de carregar o web3.js sob demanda");
});
