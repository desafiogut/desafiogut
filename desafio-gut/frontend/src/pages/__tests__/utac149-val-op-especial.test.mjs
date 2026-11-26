// utac149-val-op-especial.test.mjs — UTAC149-val (SEG4 ℹ️). A aba Ofertas Programadas com a ESPECIAL Programada.
// A mudança do UTAC149 na OP (cartão e selo da tabela via `estadoEdicaoProgramada`) não tinha teste: voltar ao
// `getEstadoEdicao` nos dois sítios deixava a suíte verde. Arnês copiado do utac109g (mesmos duplos).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "../../__tests__/_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(AQUI, "..", "..");
const STUBS_106C = resolve(SRC, "__tests__", "_stubs-106c");
const STUBS_106E = resolve(AQUI, "..", "__tests__", "_stubs-106e");
const STUB_CONTEXTO = resolve(AQUI, "_stubs", "AppContext.jsx");
const ALIASES = [
  { find: /^\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
  { find: /^\.\.\/\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
  { find: /^\.\/useTrocarPorSenhas\.js$/, replacement: `${STUBS_106E}/useTrocarPorSenhas.js` },
  { find: /^\.\.\/hooks\/useTrocarPorSenhas\.js$/, replacement: `${STUBS_106E}/useTrocarPorSenhas.js` },
  { find: /^react-router-dom$/, replacement: `${STUBS_106C}/rr.jsx` },
  { find: /^\.\.\/lib\/leilaoLock\.js$/, replacement: resolve(AQUI, "_stubs", "leilaoLock.js") },
  { find: /^\.\.\/hooks\/useIsMobile\.js$/, replacement: resolve(AQUI, "_stubs-109g", "useIsMobile.js") },
];

let vite, React, renderToStaticMarkup, montar, duploDeFetch, definirContexto, OP, definirEmBreve, definirMobile, getEstadoEdicao;
before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(SRC, "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({ ...opcoesServidorTeste({ alias: ALIASES }), server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true } });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ montar, duploDeFetch } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/AppContext.jsx"));
  OP = (await vite.ssrLoadModule("/src/pages/OfertasProgramadas.jsx")).default;
  ({ definirEmBreve } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/leilaoLock.js"));
  ({ definirMobile } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs-109g/useIsMobile.js"));
  ({ getEstadoEdicao } = await vite.ssrLoadModule("/src/utils/edicao.js"));
});
after(async () => { definirEmBreve?.(true); definirMobile?.(false); if (vite) await vite.close(); });

const A = "0xAbC1230000000000000000000000000000004567";
const B = "0xBbB0000000000000000000000000000000009999";
const PROG = { "PROG-7": { id: "PROG-7", tipo: "programado", status: "aberto", produto: "Air Fryer", termino_em: "2030-12-31T00:00:00.000Z" } };
const LEITURA = { ok: true, pontos: 7, pontosCartao: 7, bonusPalpite: 0, pontosParaCartao: 50, podeResgatarCartao: false, historico: [], palpites: [] };
const semTags = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const codigo = (p) => readFileSync(resolve(SRC, p), "utf8").replace(/\r\n/g, "\n");

async function render({ edicoes = PROG, palpites = { ok: true, revelado: false, palpites: [] }, mobile = false, pendente = false } = {}) {
  definirMobile(mobile);
  definirContexto({
    isConnected: true, address: A, user: null, authToken: "AUTH-149val", userLabel: "T", edicoes, ready: true,
    refetchSaldo: () => {}, saldoRsCentavos: 0, saldoRsStatus: "ok", refetchSaldoRs: () => {}, setModalidade: () => {},
    privyWallet: null, abrirModal: () => {},
  });
  const dup = duploDeFetch((url) => (url.includes("/ler-palpites?") ? { status: 200, json: palpites }
    : pendente ? { demora: 60000, status: 200, json: LEITURA } : { status: 200, json: LEITURA }));
  const ctrl = montar(OP, []);
  if (!pendente) await ctrl.assentar();
  const h = renderToStaticMarkup(React.createElement(React.Fragment, null, ctrl.resultado()));
  return { h, t: semTags(h), fim: () => { ctrl.desmontar(); dup.restaurar(); definirMobile(false); } };
}
const tabelaDe = (h) => h.slice(h.indexOf('data-testid="op-tabela-fim"'));


const iso = (ms) => new Date(ms).toISOString();
const DIA = 86_400_000;
const especial = (extra = {}) => ({ "ESPECIAL-PALPITE1": {
  id: "ESPECIAL-PALPITE1", tipo: "programado", status: "aberto", produto: "Air Fryer Palpite",
  inicio_em: iso(Date.now() - DIA), termino_em: iso(Date.now() + 13 * DIA), imagem_url: "x.jpg", ...extra } });

test("OP-E1 · com EM BREVE ligado, a especial Programada lê o estado DA EDIÇÃO: cartão e tabela dizem «Aberta»", async () => {
  definirEmBreve(true);
  const v = await render({ edicoes: especial() });
  try {
    assert.match(v.t, /Palpites até \d{2}\/\d{2} às \d{2}:\d{2}/, "a faixa do cartão não mostra o fecho da especial");
    assert.match(tabelaDe(v.h), /data-testid="op-tabela-estado"[^>]*>🟢 Aberta</, "o selo da tabela não é o da edição");
    assert.doesNotMatch(tabelaDe(v.h), /data-testid="op-tabela-estado"[^>]*>🕒 Em breve</);
  } finally { v.fim(); }
});

test("OP-E2 · controlo: uma PROG-N com EM BREVE continua «Em breve» (zero diff)", async () => {
  definirEmBreve(true);
  const v = await render();
  try {
    assert.match(tabelaDe(v.h), /data-testid="op-tabela-estado"[^>]*>🕒 Em breve</);
  } finally { v.fim(); }
});

test("OP-E3 · depois do fim com status ainda «aberto»: selo 🔴 Encerrada e SEM formulário de palpite", async () => {
  definirEmBreve(true);
  const v = await render({ edicoes: especial({ inicio_em: iso(Date.now() - 14 * DIA), termino_em: iso(Date.now() - 60_000) }) });
  try {
    assert.match(tabelaDe(v.h), /data-testid="op-tabela-estado"[^>]*>🔴 Encerrada</);
    assert.doesNotMatch(v.h, /id="palpite-ESPECIAL-PALPITE1"/, "o formulário continua activo depois do fim");
  } finally { v.fim(); }
});
