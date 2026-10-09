// utac109g-op-alinhamento.test.mjs — UTAC109g · aba «Ofertas Programadas» alinhada com o «Menor Lance Único».
//
// O que fica aqui: (A) a edição é o 2.º vidro (logo abaixo do 1.º), o 1.º vidro é o MESMO `GlassHeader` do
// MLC e o envelope é o MESMO (por isso a edição fica à mesma altura — medido no browser: 299/299 px a 375 e
// 311/311 px a 1280, `scripts/utac109g-medir-alinhamento.mjs`); (B) «📋 Palpites» com o padrão da
// «📋 Lances — Edição R-1»; P1/P2 bidireccionais na aba; o nome do produto com ≥ 200 px a 375.
// Instrumentos do repo (os mesmos do utac106f): `_servidor-teste` + `_hook-runner` + duplos.
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
    isConnected: true, address: A, user: null, authToken: "AUTH-109g", userLabel: "T", edicoes, ready: true,
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

// ═══ A — ESTRUTURA ════════════════════════════════════════════════════════════════════════════════
for (const [nome, opts] of [["com edição", {}], ["sem edição (vazio)", { edicoes: {} }], ["pontos a carregar", { pendente: true }]]) {
  test(`A1 · ${nome}: a edição é o 2.º vidro — logo abaixo do 1.º, sem vidro pelo meio`, async () => {
    const c = await render(opts);
    try {
      const fimHeader = c.h.indexOf("</header>");
      const iCartao = c.h.indexOf('data-testid="cartao-edicao"');
      assert.ok(fimHeader > 0 && iCartao > fimHeader, "a edição não está depois do 1.º vidro");
      assert.equal((c.h.slice(0, fimHeader).match(/<header/g) || []).length, 1, "há mais de um cabeçalho antes da edição");
      // entre o fim do 1.º vidro e o cartão (que abre o seu próprio vidro) não há NENHUM vidro
      const meio = c.h.slice(fimHeader, iCartao);
      assert.doesNotMatch(meio.slice(0, meio.lastIndexOf("<article")), /gut-glass-standard/, "há um vidro entre o cabeçalho e a edição");
      for (const marca of ['aria-label="Progresso de pontos"', 'aria-label="Carregando"', 'data-testid="op-tabela-fim"']) {
        const i = c.h.indexOf(marca);
        if (i >= 0) assert.ok(i > iCartao, `${marca} vem antes da edição`);
      }
    } finally { c.fim(); }
  });
}

test("A1 · o aviso do bónus («é bônus, não muda o cartão») fica logo ABAIXO da edição, texto intacto (R18-B)", async () => {
  const c = await render();
  try {
    const iCartao = c.h.indexOf('data-testid="cartao-edicao"');
    const iAviso = c.h.indexOf("🎫 Edições programadas");
    const iPontos = c.h.indexOf('aria-label="Progresso de pontos"');
    assert.ok(iCartao < iAviso && iAviso < iPontos, "o aviso do bónus não está entre a edição e os pontos");
    assert.match(c.t, /Palpite quantos lances a edição vai ter\. O palpite mais próximo ganha \+2 pontos — é bônus, não muda o cartão\./);
  } finally { c.fim(); }
});

test("A2/A3 · 1.º vidro = o MESMO GlassHeader do MLC e o MESMO envelope ⇒ mesma altura da edição", async () => {
  const op = codigo("pages/OfertasProgramadas.jsx");
  const mlc = codigo("pages/MercadoLances.jsx");
  for (const [n, s] of [["OP", op], ["MLC", mlc]]) {
    assert.match(s, /import GlassHeader from "\.\.\/components\/glass\/GlassHeader\.jsx"/, `${n} sem GlassHeader`);
    assert.match(s, /<main style=\{\{[\s\S]{0,200}gap: isMobile \? "1rem" : "1\.5rem"[\s\S]{0,120}padding: isMobile \? "1rem" : "1\.5rem 2rem"/, `${n}: envelope diferente`);
  }
  assert.doesNotMatch(op, /maxWidth: "640px"/, "a coluna da OP voltou a 640 px (a 1280 deixa de ter a largura do MLC)");
  const c = await render();
  try {
    // as 3 secções do vidro do MLC: identidade, título/frase/selo, rodapé legal
    assert.match(c.t, /DesafioGUT[\s\S]*Ofertas Programadas Junte 50 pontos e troque pelo cartão 🎫 Programadas[\s\S]*CNPJ 23\.040\.066\/0001-00/);
    assert.match(c.h, /<h2 data-testid="titulo-aba"[^>]*Orbitron[^>]*>Ofertas Programadas<\/h2>/);
  } finally { c.fim(); }
});

// ═══ Achados do validador (SEG3) ═════════════════════════════════════════════════════════════════
test("SEG3 · o login do 1.º vidro da OP está ligado: o botão chama o `abrirModal` do contexto; ligado mostra o endereço", async () => {
  let aberto = 0;
  definirMobile(false);
  definirContexto({ isConnected: false, address: null, user: null, authToken: null, userLabel: null, edicoes: PROG, ready: true,
    refetchSaldo: () => {}, saldoRsCentavos: null, saldoRsStatus: "idle", refetchSaldoRs: () => {}, setModalidade: () => {},
    privyWallet: null, abrirModal: () => { aberto++; } });
  const dup = duploDeFetch(() => ({ status: 200, json: LEITURA }));
  const ctrl = montar(OP, []);
  try {
    await ctrl.assentar();
    const nos = [];
    (function walk(n) { if (n == null || typeof n !== "object") return; if (Array.isArray(n)) { n.forEach(walk); return; } nos.push(n); if (n.props) walk(n.props.children); })(ctrl.resultado());
    // o GlassHeader é um componente: encontra-se pelo elemento e verifica-se a cablagem das props
    const gh = nos.find((n) => n.props?.titulo === "Ofertas Programadas");
    assert.ok(gh, "a OP não usa o GlassHeader");
    assert.equal(gh.props.isConnected, false, "isConnected não vem do contexto");
    assert.equal(gh.props.encerrado, false);
    gh.props.onLogin();
    assert.equal(aberto, 1, "o login da OP não abre o modal do contexto");
  } finally { ctrl.desmontar(); dup.restaurar(); }
  const c = await render();
  try { assert.match(c.t, /✅ 0xAbC1\.\.\.4567/, "ligado, o rodapé do 1.º vidro não mostra o endereço"); } finally { c.fim(); }
});

test("SEG3 · MC88.43 na tabela nova: com EM BREVE não há «Prazo: <data>»; com a edição ATIVA há", async () => {
  const c = await render();
  try { assert.doesNotMatch(semTags(tabelaDe(c.h)), /Prazo:/, "EM BREVE ao lado de um prazo real"); } finally { c.fim(); }
  definirEmBreve(false);
  try {
    const a = await render();
    try { assert.match(semTags(tabelaDe(a.h)), /Prazo: \d/); } finally { a.fim(); }
  } finally { definirEmBreve(true); }
});

test("SEG3 · selo de estado da tabela com texto navy (AA ≥ 4,5:1 nas 4 cores de estado); grelha com alignContent start", async () => {
  const c = await render();
  try { assert.match(tabelaDe(c.h), /data-testid="op-tabela-estado" style="[^"]*color:#0a0f1a/); } finally { c.fim(); }
  assert.match(codigo("pages/OfertasProgramadas.jsx"), /<main style=\{\{[\s\S]{0,600}alignContent: "start"/);
});

// ═══ B1 — «📋 Palpites» com o padrão de «📋 Lances — Edição R-1» ══════════════════════════════════
const DOIS = { ok: true, revelado: false, palpites: [{ endereco: A, data: "x" }, { endereco: B, data: "y" }] };
test("B1 · desktop: título 📋 Orbitron + id a dourado + selo + «🔒 valores ocultos até o fim» + #/Participante/Palpite 🔒", async () => {
  const c = await render({ palpites: DOIS });
  try {
    const tab = tabelaDe(c.h);
    assert.match(tab, /^[^>]*class="gut-glass-standard"/);
    assert.match(tab, /<h3 data-testid="op-tabela-titulo"[^>]*Orbitron[^>]*>📋 Palpites — Edição <span style="color:#f5a623">PROG-7<\/span><\/h3>/);
    assert.match(tab, /data-testid="op-tabela-estado"/);
    assert.match(semTags(tab), /🔒 valores ocultos até o fim/);
    assert.deepEqual([...tab.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]), ["#", "Participante", "Palpite 🔒"]);
    assert.equal((tab.match(/<tr[^>]*data-palpite-linha/g) || []).length, 2);
  } finally { c.fim(); }
});

test("B1 · telemóvel: lista de cartões (como a MobileList do MLC), sem tabela", async () => {
  const c = await render({ palpites: DOIS, mobile: true });
  try {
    const tab = tabelaDe(c.h);
    assert.match(tab, /data-testid="op-tabela-lista"/);
    assert.doesNotMatch(tab, /<table/);
    assert.equal((tab.match(/<div[^>]*data-palpite-linha/g) || []).length, 2);
    assert.match(semTags(tab), /1 0xAbC1…4567 🔒 2 0xBbB0…9999 🔒/);
  } finally { c.fim(); }
});

test("B1 · revelado: «Palpite» sem cadeado e sem o aviso; vazio: 📭 sem tabela (como o molde)", async () => {
  const r = await render({ palpites: { ok: true, revelado: true, palpites: [{ endereco: A, valor: 25 }] } });
  try {
    const tab = tabelaDe(r.h);
    assert.deepEqual([...tab.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]), ["#", "Participante", "Palpite"]);
    assert.match(semTags(tab), /25 lances/);
    assert.doesNotMatch(semTags(tab), /valores ocultos/);
  } finally { r.fim(); }
  const v = await render();
  try {
    const tab = tabelaDe(v.h);
    assert.match(tab, /data-testid="op-tabela-vazia"/);
    assert.doesNotMatch(tab, /<table/);
    assert.match(semTags(tab), /📭 Ainda não há palpites\./);
  } finally { v.fim(); }
});

// ═══ B2/B3 — P1 e P2 na aba OP (fonte única) ═════════════════════════════════════════════════════
test("B2 · P1 bidireccional: Programada ATIVA → «palpite já!» na aba; Relâmpago ATIVA → «lance já!»", async () => {
  definirEmBreve(false);
  try {
    const c = await render();
    try {
      assert.match(c.t, /Em andamento — palpite já!/);
      assert.doesNotMatch(c.t, /lance já!/);
    } finally { c.fim(); }
    const fut = { termino_em: "2030-01-01T00:00:00.000Z" };
    assert.equal(getEstadoEdicao({ ...fut, tipo: "programado" }).rotuloLongo, "Em andamento — palpite já!");
    assert.equal(getEstadoEdicao({ ...fut, tipo: "relampago" }).rotuloLongo, "Em andamento — lance já!");
  } finally { definirEmBreve(true); }
});

test("B3 · P2 bidireccional: sem edição → «Sem edições programadas no momento.»; com edição → ausente", async () => {
  const v = await render({ edicoes: {} });
  try { assert.match(v.t, /Sem edições programadas no momento\./); } finally { v.fim(); }
  const c = await render();
  try { assert.doesNotMatch(c.t, /Sem edições programadas no momento/); } finally { c.fim(); }
});

// ═══ B4 — 375 px ═════════════════════════════════════════════════════════════════════════════════
test("B4 · o nome do produto tem um mínimo de 12,5rem (200 px) e o tempo desce de linha (R18-C)", async () => {
  const c = await render({ mobile: true });
  try {
    assert.match(c.h, /data-testid="cartao-nome"[^>]*style="[^"]*flex:1 1 12\.5rem/);
    assert.match(c.h, /data-testid="cartao-faixa"[^>]*style="[^"]*flex-wrap:wrap/);
  } finally { c.fim(); }
});
