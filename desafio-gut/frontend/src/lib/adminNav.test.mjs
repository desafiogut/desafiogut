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
import {
  TELAS_ADMIN, TELAS_DO_PLANO, telaIndice, telaAtiva,
  GRUPOS_ADMIN, telasDoGrupo, grupoDaTela, grupoAtivo,
} from "./adminNav.js";

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
  // `nota` regista ORIGEM, não estado por decidir: desde o MC89.44 as duas têm
  // lugar (grupo "Quem"). O que continua a ser verdade é que não fazem parte
  // do plano histórico de sete telas do MC89.5.
  assert.equal(TELAS_DO_PLANO.length, 7);
  assert.equal(TELAS_ADMIN.length, 9);
});

// ── MC89.44 · agrupamento por pergunta ──────────────────────────────────────
//
// O teste que interessa é o primeiro. Todos os outros descrevem a forma dos
// grupos; aquele é o que impede o defeito de voltar.

test("⚠️ TODA a tela é alcançável: índice, ou exatamente um grupo", () => {
  // ESTE É O TESTE DO MC89.44. Entre o MC89.24 e o MC89.43, «Aprovações» e
  // «Cotas» tiveram rota, componente e backend a funcionar sem UMA ÚNICA
  // entrada no menu — a barra filtrava `!t.nota`. Num APK, sem barra de
  // endereços, isso é o mesmo que não existirem. Nada no modelo o detetava,
  // porque o modelo estava certo: era a APRESENTAÇÃO que perdia telas.
  for (const t of TELAS_ADMIN) {
    const grupos = GRUPOS_ADMIN.filter((g) => g.telas.includes(t.id));
    if (t.index) {
      assert.equal(grupos.length, 0,
        `o índice ("${t.id}") não pertence a grupo nenhum — é a porta, não uma divisão`);
    } else {
      assert.equal(grupos.length, 1,
        `"${t.id}" está em ${grupos.length} grupos; tem de estar em exatamente 1 ` +
        `(0 = inalcançável pelo menu, que foi o defeito do MC89.44)`);
    }
  }
});

test("nenhum grupo aponta para uma tela que não existe", () => {
  const ids = new Set(TELAS_ADMIN.map((t) => t.id));
  for (const g of GRUPOS_ADMIN) {
    for (const id of g.telas) {
      assert.ok(ids.has(id), `o grupo "${g.id}" refere a tela "${id}", que não está em TELAS_ADMIN`);
    }
  }
});

test("a ordem dos grupos é Quem → Dinheiro → Sistema", () => {
  // É a ordem de importância dada pelo operador. Reordenar por conveniência de
  // layout muda o que o admin vê primeiro, e isso é uma decisão dele.
  assert.deepEqual(GRUPOS_ADMIN.map((g) => g.id), ["quem", "dinheiro", "sistema"]);
});

test("os cabeçalhos de grupo cabem num telemóvel e não têm emoji", () => {
  const emoji = /\p{Extended_Pictographic}/u;
  for (const g of GRUPOS_ADMIN) {
    assert.ok(g.label.length <= 10, `cabeçalho demasiado longo: "${g.label}"`);
    assert.equal(emoji.test(g.label), false, `"${g.label}" tem emoji`);
    assert.equal(emoji.test(g.pergunta), false, `a pergunta de "${g.id}" tem emoji`);
    assert.ok(g.pergunta.trim().length > 0, `falta a pergunta em "${g.id}"`);
  }
});

test("telasDoGrupo devolve entradas reais, pela ordem declarada", () => {
  assert.deepEqual(telasDoGrupo("quem").map((t) => t.id), ["usuarios", "aprovacoes", "cotas"]);
  assert.deepEqual(telasDoGrupo("dinheiro").map((t) => t.id), ["financeiro"]);
  assert.deepEqual(telasDoGrupo("sistema").map((t) => t.id),
    ["operacoes", "logs", "notificacoes", "configuracoes"]);
  assert.deepEqual(telasDoGrupo("inexistente"), [], "um grupo desconhecido não pode rebentar a barra");
  // Devolve as ENTRADAS, não os ids — a barra precisa de href e label.
  assert.equal(telasDoGrupo("dinheiro")[0].href, "/admin/financeiro");
});

test("grupoDaTela responde por tela, e o índice não tem grupo", () => {
  assert.equal(grupoDaTela("usuarios").id, "quem");
  assert.equal(grupoDaTela("cotas").id, "quem");
  assert.equal(grupoDaTela("financeiro").id, "dinheiro");
  assert.equal(grupoDaTela("logs").id, "sistema");
  assert.equal(grupoDaTela("visao"), null, "o índice não pertence a nenhum grupo");
  assert.equal(grupoDaTela("nao-existe"), null);
});

test("grupoAtivo abre o grupo certo — e no índice abre o primeiro", () => {
  assert.equal(grupoAtivo("/admin/cotas").id, "quem");
  assert.equal(grupoAtivo("/admin/usuarios/0xabc").id, "quem",
    "uma subrota de perfil mantém «Quem» aberto");
  assert.equal(grupoAtivo("/admin/logs").id, "sistema");
  // No índice abre o PRIMEIRO grupo: é a única tela onde o admin sempre
  // aterra, e deixá-la sem grupo aberto punha tudo a dois toques.
  assert.equal(grupoAtivo("/admin").id, GRUPOS_ADMIN[0].id);
  assert.equal(grupoAtivo("/admin/").id, GRUPOS_ADMIN[0].id);
  // Fora do painel não há grupo nenhum para abrir.
  assert.equal(grupoAtivo("/"), null);
  assert.equal(grupoAtivo("/admin/inexistente"), null);
  assert.equal(grupoAtivo(undefined), null);
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
    .filter((p) => p !== "/admin" && !p.includes(":")); // filhas com :param não estão no modelo

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

// ── O que a BARRA faz com o modelo (MC89.44) ────────────────────────────────
//
// ⚠️ LIMITE DESTES TRÊS TESTES, DITO À FRENTE: afirmam sobre o TEXTO do
// componente, não sobre a árvore renderizada — não há runner de React (T-1 do
// MC89.6). São mais fracos do que um teste de render e mais fortes do que
// nada, e existem porque os defeitos D-1/D-3/D-5 do MC89.44 viviam TODOS na
// apresentação, onde o modelo estava perfeito e nenhum teste olhava. Um teste
// que só verifica a camada certa não é verificação.

// ⚠️ Sem os comentários. A primeira versão destes testes falhou contra a
// PRÓPRIA PROSA do componente: o cabeçalho explica que a barra deixou de fazer
// `label.slice(0, 4)` e de filtrar por `nota`, e a busca encontrava as duas
// frases. Um teste de texto que não distingue código de comentário proíbe
// documentar o defeito que ele guarda — que é precisamente o que é preciso
// escrever para o defeito não voltar.
//   (Remoção deliberadamente simples: chega para JSX sem "//" dentro de
//    literais. Se algum dia houver um URL em string neste ficheiro, é aqui que
//    se parte, e parte a favor — falso ALARME, não falso verde.)
function semComentarios(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const BARRA = () => semComentarios(
  readFileSync(join(SRC, "components", "admin", "NavAdminPersistente.jsx"), "utf8"),
);

test("⚠️ a barra NÃO filtra telas por `nota` (foi assim que se perderam duas)", () => {
  const src = BARRA();
  assert.equal(/\.nota\b/.test(src), false,
    "filtrar por `nota` foi o que deixou «Aprovações» e «Cotas» fora do menu " +
    "desde o MC89.24. A barra constrói-se de GRUPOS_ADMIN.");
  assert.ok(/GRUPOS_ADMIN/.test(src), "a barra tem de ler os grupos");
});

test("⚠️ a barra NÃO trunca rótulos", () => {
  const src = BARRA();
  assert.equal(/\.slice\s*\(/.test(src), false,
    "`label.slice(0, 4)` renderizava «Financeiro» como «Fina» no telemóvel — " +
    "a mesma falha que o MC89.4 rejeitou por escrito");
  assert.equal(/substring|truncat/i.test(src), false, "nem por outro nome");
});

test("a barra declara alvos de toque de 44 px e não tem ícones decorativos", () => {
  const src = BARRA();
  assert.ok(/ALVO_MIN_PX\s*=\s*44\b/.test(src),
    "o alvo de toque no telemóvel tem de ser 44 px (era ~28)");
  assert.equal(/ICONES/.test(src), false,
    "os glifos ◉◒◓◔◑◐ só existiam no desktop — cromo onde sobra largura e " +
    "corte onde falta. Saíram no MC89.44.");
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
