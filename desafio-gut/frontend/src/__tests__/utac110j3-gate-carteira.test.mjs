// utac110j3-gate-carteira.test.mjs — UTAC110j.3 · GUTO animado no gate legal + Carteira com os 4 botões primeiro.
//
// O que prova:
//   G — o gate legal (componente REAL) desenha o CarrosselGUTO com o MESMO slide das edições Relâmpago e Programada
//       (`GUTO_ANIMADO_7` do CartaoEdicao), a 96 px, dentro de um invólucro com nome acessível; o PNG estático saiu;
//       o texto, as 4 caixas e o botão do gate continuam lá.
//   V — depois da 1.ª pintura o carrossel com esse slide monta UM <video> com loop + muted + playsInline + poster do
//       próprio vídeo + onError (o fallback); antes da 1.ª pintura mostra só o poster.
//   O — a Carteira lê-se «Saldo R$ → Depositar PIX → Comprar Passe → Menor Lance Único → Ofertas Programadas →
//       Pontos → Créditos → ECOQUILDO → Missões» (R18-110j.3-B), tudo dentro do 1.º vidro; o aviso 402 fica colado
//       aos botões, antes dos saldos.
// ⚠️ LIMITE DECLARADO: sem DOM real (SSR + `_hook-runner`); o layout a 375/1280 px mede-se nas capturas.
//
// node --test src/__tests__/utac110j3-gate-carteira.test.mjs   (a partir de desafio-gut/frontend)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "./_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(AQUI, "..");
const STUBS_106C = resolve(AQUI, "_stubs-106c");
const STUBS_106E = resolve(SRC, "pages", "__tests__", "_stubs-106e");
const STUB_CONTEXTO = resolve(SRC, "pages", "__tests__", "_stubs", "AppContext.jsx");

const ALIASES = [
  { find: /^\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
  { find: /^\.\.\/\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
  { find: /^\.\/useTrocarPorSenhas\.js$/, replacement: `${STUBS_106E}/useTrocarPorSenhas.js` },
  { find: /^\.\.\/hooks\/useTrocarPorSenhas\.js$/, replacement: `${STUBS_106E}/useTrocarPorSenhas.js` },
  { find: /^\.\.\/components\/ComprarFichasModal\.jsx$/, replacement: `${STUBS_106C}/child.jsx` },
  { find: /^\.\.\/components\/CreditoStatus\.jsx$/, replacement: `${STUBS_106C}/child.jsx` },
  { find: /^\.\.\/components\/PainelIndicacao\.jsx$/, replacement: `${STUBS_106C}/child.jsx` },
  { find: /^\.\.\/components\/BotaoLoginPrincipal\.jsx$/, replacement: `${STUBS_106C}/child.jsx` },
  { find: /^\.\.\/\.\.\/hooks\/useAdmin\.js$/, replacement: `${STUBS_106C}/useAdmin.js` },
  { find: /^react-router-dom$/, replacement: `${STUBS_106C}/rr.jsx` },
];

let vite, React, renderToStaticMarkup, montar, duploDeFetch, definirContexto;
let Gate, modGate, CarrosselMemo, GUTO_ANIMADO_7, MinhaCarteira;

before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(SRC, "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: ALIASES }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ montar, duploDeFetch } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/AppContext.jsx"));
  modGate = await vite.ssrLoadModule("/src/components/TermosConsentimento.jsx");
  Gate = modGate.default;
  CarrosselMemo = (await vite.ssrLoadModule("/src/components/CarrosselGUTO.jsx")).default;
  ({ GUTO_ANIMADO_7 } = await vite.ssrLoadModule("/src/components/CartaoEdicao.jsx"));
  MinhaCarteira = (await vite.ssrLoadModule("/src/pages/MinhaCarteira.jsx")).default;
});
after(async () => { delete globalThis.window; if (vite) await vite.close(); });

function nos(raiz) {
  const fora = [];
  (function walk(n) {
    if (n == null || typeof n === "boolean") return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (typeof n !== "object") return;
    fora.push(n);
    if (n.props) walk(n.props.children);
  })(raiz);
  return fora;
}
const semTags = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

async function gate() {
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const c = montar(Gate, [{ onAceitar: () => {} }]);
  await c.assentar();
  return c.resultado();
}

// ═══ G — o gate legal ═══════════════════════════════════════════════════════════════════════════
test("G1 · o gate desenha o CarrosselGUTO com o MESMO slide das edições (GUTO animado 7), a 96 px", async () => {
  const arv = nos(await gate());
  const carrosseis = arv.filter((n) => n.type === CarrosselMemo);
  assert.equal(carrosseis.length, 1, "o gate devia ter exactamente 1 carrossel do GUTO");
  const { slides, size } = carrosseis[0].props;
  assert.equal(size, 96, "o GUTO do gate mudou de tamanho (era 96×96)");
  assert.equal(slides, modGate.GUTO_GATE, "o carrossel não recebe o array de módulo (referência estável para o memo)");
  assert.equal(slides.length, 1);
  // A mesma animação das edições: os mesmos ficheiros (vídeo + poster) do GUTO_ANIMADO_7 do CartaoEdicao.
  assert.deepEqual(slides[0], GUTO_ANIMADO_7[0], "o gate não usa o GUTO animado das edições");
  assert.match(slides[0].webm, /guto-7\.webm\?v=/);
  assert.match(slides[0].poster, /guto-7\.png\?v=/);
});

test("G2 · o PNG estático saiu e o GUTO tem nome acessível (o carrossel é aria-hidden)", async () => {
  const raiz = await gate();
  const html = renderToStaticMarkup(React.createElement(React.Fragment, null, raiz));
  assert.doesNotMatch(html, /guto-bemvindo\.png/, "o gate ainda mostra o PNG estático");
  const invol = nos(raiz).find((n) => n.props && n.props["data-testid"] === "guto-gate");
  assert.ok(invol, "faltou o invólucro do GUTO");
  assert.equal(invol.props.role, "img");
  assert.equal(invol.props["aria-label"], "GUTO mascote");
  assert.ok(nos(invol.props.children).some((n) => n.type === CarrosselMemo), "o carrossel saiu do invólucro");
});

test("G3 · o resto do gate não mudou: título, 4 caixas e o botão de aceitar", async () => {
  const arv = nos(await gate());
  const html = renderToStaticMarkup(React.createElement(React.Fragment, null, arv[0]));
  assert.match(semTags(html), /DesafioGUT/);
  assert.match(semTags(html), /Ler o resumo do regulamento/);
  assert.equal(arv.filter((n) => n.type === "input" && n.props.type === "checkbox").length, 4, "as 4 caixas mudaram");
  assert.ok(arv.some((n) => n.type === "button"), "o botão de aceitar sumiu");
});

// ═══ V — o vídeo (autoplay/loop/muted/fallback) ════════════════════════════════════════════════════
test("V1 · antes da 1.ª pintura: só o poster do próprio vídeo (sem <video>)", async () => {
  delete globalThis.window; // sem window, useAposPrimeiraPintura nunca dá «pronto» (MC88.36)
  const c = montar(CarrosselMemo.type, [{ size: 96, slides: modGate.GUTO_GATE }]);
  await c.assentar();
  const arv = nos(c.resultado());
  assert.equal(arv.filter((n) => n.type === "video").length, 0);
  const img = arv.find((n) => n.type === "img");
  assert.ok(img && /guto-7\.png\?v=/.test(img.props.src), "faltou o poster do vídeo 7");
});

test("V2 · depois da 1.ª pintura: 1 <video> com loop + muted + playsInline + poster + onError (fallback)", async () => {
  globalThis.window = { requestIdleCallback: (cb) => { cb(); return 1; }, cancelIdleCallback: () => {} };
  try {
    const c = montar(CarrosselMemo.type, [{ size: 96, slides: modGate.GUTO_GATE }]);
    await c.assentar();
    const videos = nos(c.resultado()).filter((n) => n.type === "video");
    assert.equal(videos.length, 1, "com 1 slide tem de haver 1 <video>");
    const p = videos[0].props;
    assert.match(p.src, /guto-7\.webm\?v=/);
    assert.match(p.poster, /guto-7\.png\?v=/, "sem poster não há fallback estático");
    assert.equal(p.loop, true, "o GUTO do gate tem de repetir");
    assert.equal(p.muted, true, "sem muted o browser bloqueia o autoplay");
    assert.equal(p.playsInline, true, "sem playsInline o iOS abre em ecrã inteiro");
    assert.equal(typeof p.onError, "function", "sem onError o vídeo que falha não cai no poster");
  } finally { delete globalThis.window; }
});

// ═══ O — a ordem da Carteira ═══════════════════════════════════════════════════════════════════
const CONTEXTO = {
  isConnected: true, abrirModal: () => {}, address: "0xAbC1230000000000000000000000000000004567",
  user: { email: { address: "a@b.c" } }, refetchSaldo: () => {}, saldoRsCentavos: 1234, saldoRsStatus: "ok",
  refetchSaldoRs: () => {}, setModalidade: () => {}, privyWallet: null, saldoSenhas: 0, saldoSenhasStatus: "ok",
  userLabel: "Teste", desconectar: () => {}, authToken: "AUTH-110J3",
};
const LER_PONTOS = /\/\.netlify\/functions\/ler-pontos$/;
const LER_ECO = /\/\.netlify\/functions\/ler-eco-quildo$/;

async function carteira() {
  definirContexto(CONTEXTO);
  const dup = duploDeFetch((url) => (
    LER_PONTOS.test(url)
      ? { status: 200, json: { ok: true, pontos: 37, pontosCartao: 30, pontosParaCartao: 50, lance: { creditos: 3, pontos: 3, historico: [] },
          missoesHoje: { dia: "2026-10-17", loginFeito: true, lanceFeito: false, pontosHoje: 5 } } }
      : LER_ECO.test(url) ? { status: 200, json: { ok: true, saldo: 5, historico: [], centavosPorEcoQuildo: 100 } }
      : { status: 404, json: {} }));
  try {
    const c = montar(MinhaCarteira, []);
    await c.assentar();
    return renderToStaticMarkup(React.createElement(React.Fragment, null, c.resultado()));
  } finally { dup.restaurar(); }
}

// ⚠️ UTAC110j.5 — ALTERADO (declarado): o card «⚡ Créditos de lance» passou a «⭐ Pontos de lance» (backend UTAC110n).
// A ordem é a mesma: «Créditos» → «Pontos de lance» ocupa o mesmo lugar (antes: 'data-saldo="creditos"').
test("O1 · Saldo R$ → os 4 botões (na ordem de sempre) → Pontos → Pontos de lance → ECOQUILDO → Missões", async () => {
  const h = await carteira();
  const ancoras = [
    ["saldo R$", "Saldo Disponível"],
    ["PIX", "Depositar PIX"],
    ["Passe", "Comprar Passe Desafio"],
    ["MLU", "Menor Lance Único"],
    ["OP", "🎫 Ofertas Programadas"],
    ["pontos", 'data-saldo="fidelidade"'],
    ["pontos de lance", 'data-saldo="pontos-lance"'],
    ["ECOQUILDO", 'data-saldo="eco-quildo"'],
    ["missões", "data-missoes-hoje"],
  ].map(([nome, s]) => [nome, h.indexOf(s)]);
  for (const [nome, i] of ancoras) assert.ok(i >= 0, `faltou ${nome}`);
  for (let k = 1; k < ancoras.length; k++) {
    assert.ok(ancoras[k - 1][1] < ancoras[k][1], `ordem errada: ${JSON.stringify(ancoras)}`);
  }
});

test("O2 · tudo continua DENTRO do 1.º vidro (Regra 1) e os cards mantêm o conteúdo", async () => {
  const h = await carteira();
  const vidro = h.indexOf("gut-glass-standard");
  const segundo = h.indexOf("gut-glass-standard", vidro + 1);
  const fim = segundo < 0 ? h.length : segundo;
  for (const s of ["Depositar PIX", 'data-saldo="fidelidade"', 'data-saldo="eco-quildo"', "data-missoes-hoje"]) {
    const i = h.indexOf(s);
    assert.ok(i > vidro && i < fim, `${s} saiu do 1.º vidro`);
  }
  const t = semTags(h);
  assert.match(t, /Pontos de fidelidade 30 \/ 50/);
  // Antes: assert.match(t, /Créditos de lance 3 disponíveis/);
  assert.match(t, /Pontos de lance 3 Cada lance gasta o seu valor/);
  assert.match(t, /ECOQUILDO 5 Usável no site oficial/);
  assert.match(t, /Missões de hoje/);
});

test("O3 · o aviso 402 («Saldo insuficiente») vive colado aos botões, antes dos saldos (fonte)", () => {
  const s = readFileSync(resolve(SRC, "pages", "MinhaCarteira.jsx"), "utf8");
  const op = s.indexOf("🎫 Ofertas Programadas");
  const aviso = s.indexOf("{passeSemSaldo && (");
  const saldos = s.indexOf("<div data-saldos-passe=");
  const missoes = s.indexOf("<section data-missoes-hoje=");
  const resgate = s.indexOf('data-acao="resgatar-cartao"');
  assert.ok(op > 0 && aviso > 0 && saldos > 0 && missoes > 0 && resgate > 0);
  assert.equal(s.indexOf("{passeSemSaldo && (", aviso + 1), -1, "há mais de um aviso 402");
  assert.ok(op < aviso && aviso < saldos, "o aviso 402 saiu de junto dos botões");
  assert.ok(missoes < resgate, "o resgate saiu de depois das missões (R18-110j.3-C)");
});
