// UTAC110h.3 · FRENTE A (P1), C (P3) e D (P4) — testes de UI/copy.
//
// P1: o contador «Este mês: X / 10 indicações» do painel «Indique e Ganhe» é medido em 0, 5 e 10 — com os
//     hooks REAIS do componente a correr (condutor `_hook-runner.mjs`: em SSR o `useEffect` não corria, era
//     o limite que impedia este teste antes). O `api.js` é um duplo (alias) que também permite forçar a
//     FALHA do `ler-pontos` — prova do fail-soft declarado (o contador nunca derruba o código de indicação).
// P3: as 14 ficheiros de produção tocados não podem ter «torneio» como VOCABULÁRIO; as chaves
//     (`isTorneioVisivel`, `ativos.torneio.*`, `painel-torneio`) e os nomes de componente (`PainelTorneio`)
//     continuam permitidos (HI9 / R18-110h.3-3), e as anotações históricas do `guto-perfis.mjs` ficam
//     (registam o termo ANTIGO de propósito) — tudo declarado no SEG-1.
// P4: a data da Política de Privacidade passou a 15 de outubro de 2026.
//
// node --test --test-concurrency=1 src/__tests__/utac110h3-pendencias-front.test.mjs
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "./_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(AQUI, "..");
const STUB_CONTEXTO = resolve(AQUI, "..", "pages", "__tests__", "_stubs", "AppContext.jsx");
const STUB_API = resolve(AQUI, "_stubs-110h3", "api.js");
const ler = (p) => readFileSync(resolve(SRC, p), "utf8").replace(/\r\n/g, "\n");
/** Raiz do frontend (o P3 varre `src/` e `netlify/` a partir daqui). */
const FE = resolve(SRC, "..");
const codigo = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\/[^\n]*/g, "");

// ── P1: o contador do mês, com os hooks reais ─────────────────────────────────────────────────────
let vite = null, React = null, renderToStaticMarkup = null, montar = null, definirContexto = null, api = null, Painel = null;

before(async () => {
  const { createServer } = await import(
    pathToFileURL(resolve(AQUI, "..", "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: [
      { find: /^\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
      { find: /^\.\.\/lib\/api\.js$/, replacement: STUB_API },
    ] }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ montar } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/AppContext.jsx"));
  api = await vite.ssrLoadModule("/src/__tests__/_stubs-110h3/api.js");
  Painel = (await vite.ssrLoadModule("/src/components/PainelIndicacao.jsx")).default;
});
after(async () => { if (vite) await vite.close(); });

async function painel(itens, isMobile = false) {
  api.definirIndicacoesMes(itens);
  definirContexto({ address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", authToken: "tk", isConnected: true });
  const ctrl = montar(Painel, [{ isMobile }]);
  await ctrl.assentar();
  return renderToStaticMarkup(React.createElement(React.Fragment, null, ctrl.resultado()));
}

test("P1 controlo positivo: o painel monta e mostra o código e a recompensa", async () => {
  const html = await painel(0);
  assert.match(html, /IND-ABC123/, "o painel não mostrou o código");
  assert.match(html, /\+50 pontos de lance e \+2 ECOQUILDO/, "a recompensa desapareceu");
});

for (const n of [0, 5, 10]) {
  test(`P1: contador do mês a ${n}/10 no painel renderizado`, async () => {
    const html = await painel(n);
    assert.match(html, new RegExp(`Este mês: ${n} / 10 indicações`), `sem «Este mês: ${n} / 10 indicações»:\n${html}`);
  });
}

test("P1 fail-soft: se o `ler-pontos` falhar, o painel segue igual e o contador desaparece", async () => {
  const html = await painel(null); // o duplo passa a devolver ok:false
  assert.doesNotMatch(html, /Este mês:/, "com o endpoint em baixo não pode aparecer um número inventado");
  assert.match(html, /IND-ABC123/, "o painel tem de continuar a funcionar sem o contador");
  assert.match(html, /\+50 pontos de lance e \+2 ECOQUILDO/);
});

// ── P3: «torneio» fora do vocabulário ────────────────────────────────────────────────────────────
// ⚠️ SEG8-110h.3 (mutantes M3a/M3b do validador, ambos SOBREVIVIAM): a 1.ª versão desta guarda só
// varria os 14 ficheiros do P3 e só reconhecia `[Tt]orneio` — logo «torneio» VISÍVEL introduzido fora
// da lista, e «TORNEIO» em maiúsculas, passavam verdes. Agora varre TODO o `src/` + `netlify/` de
// produção (fora de testes), SEM distinção de caixa, e exige que cada ocorrência caia no allowlist
// abaixo — com CONTAGEM EXACTA nas anotações históricas, para uma ocorrência NOVA fazer falhar.
const ALLOW = [
  /^isTorneioVisivel$/,              // chave de configuração/API (HI9)
  /^PainelTorneio(\.jsx)?$/,         // componente/ficheiro (renomear partiria consumidores)
  /^ativos\.torneio\.[A-Za-z]+$/,    // chaves de i18n (os VALORES já dizem «Competição»)
  /^painel-torneio$/,                // chave de DOM (`data-secao`)
  /^TORNEIO-HABILIDADE\.md$/,        // CAMINHO de um documento do repo (não é vocabulário nosso)
];
// Anotações HISTÓRICAS que registam o termo ANTIGO de propósito (doutrina «manter à vista»).
// O número é EXACTO: +1 ocorrência em qualquer destes ficheiros reprova.
const HISTORICAS = { "netlify/functions/_lib/guto-perfis.mjs": 3, "src/i18n/pt.js": 1 };
const IGNORAR = ["node_modules", "__tests__", "_tests", "test-stubs", "_stubs", "dist", ".git"];
const TOKEN = /[A-Za-zÀ-ÿ_.:-]*[Tt][Oo][Rr][Nn][Ee][Ii][Oo][A-Za-zÀ-ÿ_.:-]*/g;
/** O char class inclui `:` e `.` (por causa das chaves `ativos.torneio.titulo` e de `T:`), logo o token
 *  pode trazer separadores colados do código (`isTorneioVisivel:`). Normaliza-se ANTES do allowlist. */
const normalizar = (t) => t.replace(/[:]+$/, "");

function* ficheirosDeProducao(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORAR.includes(e.name) || e.name.endsWith(".test.mjs") || e.name.endsWith(".test.js")) continue;
    const p = resolve(dir, e.name);
    if (e.isDirectory()) yield* ficheirosDeProducao(p);
    else if (/\.(jsx?|mjs)$/.test(e.name)) yield p;
  }
}

function scanearTorneio() {
  const achados = [];
  for (const raiz of ["src", "netlify"]) {
    for (const abs of ficheirosDeProducao(resolve(FE, raiz))) {
      const rel = abs.slice(FE.length + 1).replace(/\\/g, "/");
      const txt = readFileSync(abs, "utf8");
      for (const t of txt.match(TOKEN) ?? []) {
        const limpo = normalizar(t);
        if (ALLOW.some((re) => re.test(limpo))) continue;
        achados.push({ rel, token: limpo });
      }
    }
  }
  return achados;
}

test("P3: em TODA a produção, «torneio» só existe como chave/identificador/caminho ou anotação histórica", () => {
  const achados = scanearTorneio();
  const porFicheiro = achados.reduce((a, x) => ({ ...a, [x.rel]: (a[x.rel] ?? 0) + 1 }), {});
  // Nenhum ficheiro fora do allowlist pode ter ocorrências…
  for (const [rel, n] of Object.entries(porFicheiro)) {
    if (rel in HISTORICAS) continue;
    assert.fail(`${rel}: ${n}× «torneio» como VOCABULÁRIO (fora do allowlist): ${achados.filter((a) => a.rel === rel).map((a) => a.token).join(", ")}`);
  }
  // …e nas anotações históricas a contagem tem de ser EXACTAMENTE a conhecida.
  assert.deepEqual(porFicheiro, HISTORICAS, "as anotações históricas mudaram de contagem (ocorrência nova?)");
  // Controlo de vitalidade: o instrumento TEM de estar a ver as ocorrências legítimas.
  assert.ok(Object.keys(porFicheiro).length >= 2, "o varrimento não encontrou nada — não está a medir");
});

test("P3 controlo positivo: o varrimento vê as chaves reais (não é um passe automático)", () => {
  // Se o `ALLOW` engolisse tudo, o teste acima seria vácuo. Aqui exige-se que os tokens legítimos
  // EXISTAM no código: `isTorneioVisivel` (chave) e `ativos.torneio.` (i18n).
  const T = readFileSync(resolve(FE, "netlify/functions/_lib/recursos-app-config.mjs"), "utf8");
  assert.match(T, /\bisTorneioVisivel\b/, "a chave `isTorneioVisivel` desapareceu do config");
  const I = readFileSync(resolve(FE, "src/i18n/pt.js"), "utf8");
  assert.match(I, /"ativos\.torneio\.titulo"/, "as chaves de i18n desapareceram");
  // E o filtro REPROVA vocabulário, em qualquer caixa (o que M3a/M3b exploravam).
  for (const visto of ["// o torneio de habilidade", "TORNEIO DE HABILIDADE", "Ranking do Torneio"]) {
    const tok = (visto.match(TOKEN) ?? []).find((t) => !ALLOW.some((re) => re.test(t)));
    assert.ok(tok, `o filtro deixou passar «${visto}»`);
  }
});

// ── P4: data da Privacidade ──────────────────────────────────────────────────────────────────────
test("P4: a Política de Privacidade diz 17 de outubro de 2026 (e não as datas antigas)", () => {
  const txt = ler("pages/Privacidade.jsx");
  assert.match(txt, /Última atualização: 17 de outubro de 2026/, "a data não foi actualizada");
  assert.doesNotMatch(txt, /15 de outubro de 2026/, "a data anterior ainda está lá");
  assert.doesNotMatch(txt, /15 de agosto de 2026/, "a data antiga ainda está lá");
});
