// utac110j4b-usepontos-lance.test.mjs — UTAC110j.4b (Frente B, só-UI). O `usePontos` REAL expõe o bloco `lance`
// do `ler-pontos` (lido sem coerção) — é a fonte do painel «Seus pontos de lance» de Meus Ativos. Os testes da
// página usam o DUPLO do hook; sem este teste, o hook podia deixar de passar o `lance` e a suíte ficava verde.
//
// Corre com:  node --test src/__tests__/utac110j4b-usepontos-lance.test.mjs   (a partir de desafio-gut/frontend)
// Arnês: `_hook-runner` com o `apiGet` REAL e fetch duplo, duplo do AppContext (padrão do utac110f-front-missoes).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "./_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(AQUI, "..");
const STUB_CONTEXTO = resolve(SRC, "pages", "__tests__", "_stubs", "AppContext.jsx");
const ALIASES = [{ find: /^\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO }];

let vite, montar, duploDeFetch, definirContexto, usePontos;

before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(SRC, "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: ALIASES }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true },
  });
  await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs");
  ({ montar, duploDeFetch } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/AppContext.jsx"));
  ({ usePontos } = await vite.ssrLoadModule("/src/hooks/usePontos.js"));
});
after(async () => { if (vite) await vite.close(); });

const LER_PONTOS = /\/\.netlify\/functions\/ler-pontos$/;
const CONTEXTO = { isConnected: true, address: "0xAbC1230000000000000000000000000000004567", authToken: "AUTH-110J4B" };

async function lerHook(json, status = 200) {
  definirContexto(CONTEXTO);
  const dup = duploDeFetch((url) => (LER_PONTOS.test(url) ? { status, json } : { status: 404, json: {} }));
  try {
    const c = montar(usePontos, []);
    await c.assentar();
    return c.resultado();
  } finally { dup.restaurar(); }
}

test("L1 o hook real expõe `lance` {pontos, movimentos} lido do `ler-pontos`", async () => {
  const r = await lerHook({ ok: true, pontos: 10, pontosCartao: 10, lance: { creditos: 1, pontos: 55, historico: [
    { data: "2026-10-11T15:00:00Z", campo: "pontos_lance", motivo: "indicacao", delta: 50, ref: "indicacao:x" },
    { data: "2026-10-12T15:00:00Z", campo: "pontos_lance", motivo: "login", delta: 5, ref: "login:2026-10-12" },
    { data: "2026-10-12T16:00:00Z", campo: "creditos_lance", motivo: "passe-relampago", delta: 1, ref: "p" },
  ] } });
  assert.equal(r.lance?.pontos, 55, "o hook não passa o saldo de pontos de lance");
  assert.deepEqual(r.lance.movimentos.map((m) => m.motivo), ["indicacao", "login"], "os créditos não são pontos");
  assert.equal(r.pontos, 10, "o campo `lance` não pode mexer nos pontos de fidelidade");
});

test("L2 sem o bloco `lance` (ou ilegível) → `lance: null` (o painel mostra erro, não zeros)", async () => {
  assert.equal((await lerHook({ ok: true, pontos: 0 })).lance, null);
  assert.equal((await lerHook({ ok: true, pontos: 0, lance: { pontos: "55", historico: [] } })).lance, null);
});
