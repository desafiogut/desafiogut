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
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "./_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(AQUI, "..");
const STUB_CONTEXTO = resolve(AQUI, "..", "pages", "__tests__", "_stubs", "AppContext.jsx");
const STUB_API = resolve(AQUI, "_stubs-110h3", "api.js");
const ler = (p) => readFileSync(resolve(SRC, p), "utf8").replace(/\r\n/g, "\n");
/** Leitura a partir da RAIZ do frontend (os ficheiros do P3 vivem em `netlify/` e em `src/`). */
const FE = resolve(SRC, "..");
const lerFE = (p) => readFileSync(resolve(FE, p), "utf8").replace(/\r\n/g, "\n");
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

// ── P3: «torneio» fora do vocabulário (só chaves/identificadores) ────────────────────────────────
const FICHEIROS_P3 = [
  "netlify/functions/exportar-dados.mjs",
  "netlify/functions/fila-processor-scheduled.mjs",
  "netlify/functions/pontuacao.mjs",
  "netlify/functions/_lib/bonus-emissao.mjs",
  "netlify/functions/_lib/consolidacao.mjs",
  "netlify/functions/_lib/pontuacao-store.mjs",
  "netlify/functions/_lib/pontuacao-utils.mjs",
  "netlify/functions/_lib/worker-bonus.mjs",
  "src/pages/MeusAtivos.jsx",
  "src/pages/MercadoLances.jsx",
  "src/hooks/useFeedback.js",
  "src/components/meus-ativos/_estilo.js",
  "src/components/meus-ativos/FeedbackLance.jsx",
  "src/components/meus-ativos/PainelTorneio.jsx",
];
const PERMITIDO = /^(isTorneioVisivel|PainelTorneio|ativos\.torneio\.[A-Za-z]+|painel-torneio)/;

test("P3: nos ficheiros tocados, «torneio» só sobrevive como CHAVE ou IDENTIFICADOR", () => {
  let vistos = 0;
  for (const f of FICHEIROS_P3) {
    const txt = lerFE(f);
    const tokens = [...txt.matchAll(/[A-Za-zÀ-ÿ_.:-]*[Tt]orneio[A-Za-zÀ-ÿ_.:-]*/g)].map((m) => m[0]);
    for (const t of tokens) {
      vistos++;
      assert.ok(PERMITIDO.test(t), `${f}: «${t}» é vocabulário, não chave/identificador`);
    }
  }
  assert.ok(vistos > 0, "o instrumento não viu nenhum «torneio» — não está a medir nada");
});

test("P3 controlo negativo: o filtro APANHA vocabulário (não é um passe automático)", () => {
  const falsos = ["// pontua o torneio", "bónus do torneio de habilidade", "Ranking do Torneio"];
  for (const t of falsos) {
    const tok = (t.match(/[A-Za-zÀ-ÿ_.:-]*[Tt]orneio[A-Za-zÀ-ÿ_.:-]*/g) ?? [])[0];
    assert.ok(tok && !PERMITIDO.test(tok), `o filtro deixou passar «${t}»`);
  }
});

// ── P4: data da Privacidade ──────────────────────────────────────────────────────────────────────
test("P4: a Política de Privacidade diz 15 de outubro de 2026 (e não a data antiga)", () => {
  const txt = ler("pages/Privacidade.jsx");
  assert.match(txt, /Última atualização: 15 de outubro de 2026/, "a data não foi actualizada");
  assert.doesNotMatch(txt, /15 de agosto de 2026/, "a data antiga ainda está lá");
});
