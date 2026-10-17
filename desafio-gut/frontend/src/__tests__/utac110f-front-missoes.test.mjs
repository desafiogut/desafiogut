// utac110f-front-missoes.test.mjs — UTAC110f-front · «Missões de hoje» na Carteira.
//
// O que se prova aqui (instrumentos do repo, como no utac110e-front: `_servidor-teste` + `_ponte-ssr` (A12),
// `_hook-runner` com o `apiGet` REAL e fetch duplo, duplo do AppContext):
//   H — `usePontos` (hook REAL) lê `missoesHoje` do `ler-pontos` SEM coerção; campo ausente/ilegível → `null` (neutro);
//   E — a Carteira mostra o bloco nos 4 estados (✓✓ · ✓⏳ · ⏳✓ · ⏳⏳), BIDIRECCIONAL: cada missão aparece feita
//       num estado e pendente noutro; rodapé «Você ganhou X pontos hoje.» e «Volte amanhã!» SÓ com as duas feitas;
//   N — neutro: a carregar «…», erro/ilegível «—» — nunca «feito» nem «pendente» inventados;
//   S — o bloco vive DENTRO do 1.º vidro, depois dos botões e dos 3 saldos (UTAC110j.3); não tem controlo (só visualização);
//       os 3 saldos continuam com o mesmo texto;
//   C — cor: ✓ e +N feitos em amarelo #f5a623 (R18-110f-front-A, nada de verde); contraste AA dos pares do bloco.
// ⚠️ LIMITE DECLARADO: sem DOM real — render estático (SSR); o layout/toque mede-se nas capturas do browser.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
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

let vite, React, renderToStaticMarkup, montar, duploDeFetch, definirContexto, MinhaCarteira, usePontos, missoesDaResposta;

before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(SRC, "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: ALIASES }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ montar, duploDeFetch } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/AppContext.jsx"));
  ({ usePontos, missoesDaResposta } = await vite.ssrLoadModule("/src/hooks/usePontos.js"));
  MinhaCarteira = (await vite.ssrLoadModule("/src/pages/MinhaCarteira.jsx")).default;
});
after(async () => { if (vite) await vite.close(); });

const AUTH = "AUTH-110F-FRONT-USER-SESSION";
const CONTEXTO = {
  isConnected: true, abrirModal: () => {}, address: "0xAbC1230000000000000000000000000000004567",
  user: { email: { address: "a@b.c" } }, refetchSaldo: () => {}, saldoRsCentavos: 1234, saldoRsStatus: "ok",
  refetchSaldoRs: () => {}, setModalidade: () => {}, privyWallet: null, saldoSenhas: 0, saldoSenhasStatus: "ok",
  userLabel: "Teste", desconectar: () => {}, authToken: AUTH,
};
const LER_PONTOS = /\/\.netlify\/functions\/ler-pontos$/;
const LER_ECO = /\/\.netlify\/functions\/ler-eco-quildo$/;
const semTags = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const missoes = (loginFeito, lanceFeito) =>
  ({ dia: "2026-10-13", loginFeito, lanceFeito, pontosHoje: (loginFeito ? 5 : 0) + (lanceFeito ? 10 : 0) });
const pontosCom = (missoesHoje) => ({
  status: 200,
  json: { ok: true, pontos: 37, pontosCartao: 30, pontosParaCartao: 50, lance: { creditos: 3 }, ...(missoesHoje === undefined ? {} : { missoesHoje }) },
});
const eco = { status: 200, json: { ok: true, saldo: 5, historico: [], centavosPorEcoQuildo: 100 } };

async function carteiraCom(respPontos) {
  definirContexto(CONTEXTO);
  const dup = duploDeFetch((url) => (LER_PONTOS.test(url) ? respPontos : LER_ECO.test(url) ? eco : { status: 404, json: {} }));
  try {
    const c = montar(MinhaCarteira, []);
    await c.assentar();
    return renderToStaticMarkup(React.createElement(React.Fragment, null, c.resultado()));
  } finally { dup.restaurar(); }
}
/** O HTML do bloco «Missões de hoje» (a `<section>` inteira). */
const blocoMissoes = (h) => {
  const i = h.indexOf("data-missoes-hoje");
  assert.ok(i > 0, "o bloco «Missões de hoje» não aparece");
  const ini = h.lastIndexOf("<section", i);
  return h.slice(ini, h.indexOf("</section>", i) + 10);
};
const linha = (b, id) => {
  const i = b.indexOf(`data-missao="${id}"`);
  assert.ok(i > 0, `faltou a missão ${id}`);
  return b.slice(b.lastIndexOf("<li", i), b.indexOf("</li>", i) + 5);
};
const feita = (b, id) => {
  const l = linha(b, id);
  const v = l.match(/data-feito="(true|false)"/)?.[1];
  // O que a pessoa VÊ tem de concordar com o atributo: ✓ ou ⏳.
  if (v === "true") assert.match(semTags(l), /^✓ /, `${id}: marcada feita mas sem ✓ visível`);
  if (v === "false") assert.match(semTags(l), /^⏳ /, `${id}: marcada pendente mas sem ⏳ visível`);
  return v === "true";
};

// ═══ H — o hook ════════════════════════════════════════════════════════════════════
test("H · usePontos expõe missoesHoje {loginFeito, lanceFeito, pontosHoje} lido do ler-pontos", async () => {
  definirContexto(CONTEXTO);
  const dup = duploDeFetch((url) => (LER_PONTOS.test(url) ? pontosCom(missoes(true, false)) : { status: 404, json: {} }));
  try {
    const c = montar(usePontos, []);
    await c.assentar();
    assert.deepEqual(c.resultado().missoesHoje, { loginFeito: true, lanceFeito: false, pontosHoje: 5 });
    assert.equal(dup.chamadas.filter((x) => LER_PONTOS.test(x.url)).length, 1, "1 só pedido (aproveita o ler-pontos)");
  } finally { dup.restaurar(); }
});

test("H · BIDIRECCIONAL: depois do login → loginFeito=true; depois do lance → lanceFeito=true", () => {
  assert.deepEqual(missoesDaResposta({ missoesHoje: missoes(false, false) }), { loginFeito: false, lanceFeito: false, pontosHoje: 0 });
  assert.deepEqual(missoesDaResposta({ missoesHoje: missoes(true, false) }), { loginFeito: true, lanceFeito: false, pontosHoje: 5 });
  assert.deepEqual(missoesDaResposta({ missoesHoje: missoes(true, true) }), { loginFeito: true, lanceFeito: true, pontosHoje: 15 });
});

test("H · campo em falta ou ilegível → null (neutro), NUNCA erro nem coerção", () => {
  const ilegiveis = [
    undefined, null, "x", 3, [],
    { loginFeito: "true", lanceFeito: false, pontosHoje: 5 },
    { loginFeito: 1, lanceFeito: false, pontosHoje: 5 },
    { loginFeito: true, lanceFeito: false },
    { loginFeito: true, lanceFeito: false, pontosHoje: "5" },
    { loginFeito: true, lanceFeito: false, pontosHoje: -5 },
    { loginFeito: true, lanceFeito: false, pontosHoje: 2.5 },
    { loginFeito: true, lanceFeito: false, pontosHoje: NaN },
  ];
  for (const m of ilegiveis) assert.equal(missoesDaResposta({ missoesHoje: m }), null, `aceitou ${JSON.stringify(m)}`);
  assert.equal(missoesDaResposta({}), null);
  assert.equal(missoesDaResposta(null), null);
});

// ═══ E — os 4 estados na Carteira ══════════════════════════════════════════════════
const CASOS = [
  { nome: "✓✓", login: true, lance: true, rodape: "Você ganhou 15 pontos hoje. Volte amanhã!" },
  { nome: "✓⏳", login: true, lance: false, rodape: "Você ganhou 5 pontos hoje." },
  { nome: "⏳✓", login: false, lance: true, rodape: "Você ganhou 10 pontos hoje." },
  { nome: "⏳⏳", login: false, lance: false, rodape: "Você ganhou 0 pontos hoje." },
];
for (const k of CASOS) {
  test(`E · estado ${k.nome}: login ${k.login ? "feito" : "pendente"}, lance ${k.lance ? "feito" : "pendente"}`, async () => {
    const b = blocoMissoes(await carteiraCom(pontosCom(missoes(k.login, k.lance))));
    assert.match(b, /data-estado="ok"/);
    assert.match(semTags(b), /🎯 Missões de hoje/);
    assert.equal(feita(b, "login"), k.login);
    assert.equal(feita(b, "lance"), k.lance);
    assert.match(semTags(linha(b, "login")), /Login diário .*\+5$/);
    assert.match(semTags(linha(b, "lance")), /Completar 1 lance .*\+10$/);
    const rod = b.slice(b.indexOf("data-missoes-rodape"));
    assert.equal(semTags(rod.slice(rod.indexOf(">") + 1, rod.indexOf("</p>"))), k.rodape);
    // «Volte amanhã!» SÓ quando tudo está feito.
    assert.equal(/Volte amanhã!/.test(b), k.login && k.lance);
  });
}

test("E · BIDIRECCIONAL: cada missão aparece FEITA num estado e PENDENTE noutro (o ecrã não é constante)", async () => {
  const vistos = { login: new Set(), lance: new Set() };
  for (const k of CASOS) {
    const b = blocoMissoes(await carteiraCom(pontosCom(missoes(k.login, k.lance))));
    vistos.login.add(feita(b, "login"));
    vistos.lance.add(feita(b, "lance"));
  }
  assert.deepEqual([...vistos.login].sort(), [false, true]);
  assert.deepEqual([...vistos.lance].sort(), [false, true]);
});

// ═══ N — neutro ════════════════════════════════════════════════════════════════════
test("N · sem o campo / ilegível / erro do ler-pontos → «—», sem ✓, sem ⏳, sem rodapé (não se inventa)", async () => {
  for (const resp of [pontosCom(undefined), pontosCom(null), pontosCom({ loginFeito: "sim" }), { status: 500, json: {} }]) {
    const b = blocoMissoes(await carteiraCom(resp));
    assert.match(b, /data-estado="neutro"/);
    assert.equal(semTags(b), "🎯 Missões de hoje —");
    assert.doesNotMatch(b, /data-missao=|✓|⏳|Você ganhou/);
  }
});

test("N · sem sessão (authToken null) → nenhum pedido e bloco neutro", async () => {
  definirContexto({ ...CONTEXTO, authToken: null });
  const dup = duploDeFetch(() => pontosCom(missoes(true, true)));
  try {
    const c = montar(MinhaCarteira, []);
    await c.assentar();
    const h = renderToStaticMarkup(React.createElement(React.Fragment, null, c.resultado()));
    assert.equal(dup.chamadas.filter((x) => LER_PONTOS.test(x.url)).length, 0);
    assert.match(blocoMissoes(h), /data-estado="neutro"/);
  } finally { dup.restaurar(); }
});

// ═══ S — sítio e estrutura ═════════════════════════════════════════════════════════
// UTAC110j.3 (R18-110j.3-B): os 4 botões passaram para CIMA dos saldos ⇒ a ordem é botões → saldos → missões.
test("S · dentro do 1.º vidro, DEPOIS dos botões e dos 3 saldos; só visualização (sem controlos)", async () => {
  const h = await carteiraCom(pontosCom(missoes(true, false)));
  const vidro = h.indexOf("gut-glass-standard");
  const saldos = h.indexOf('data-saldo="eco-quildo"');
  const bloco = h.indexOf("data-missoes-hoje");
  const botaoPix = h.indexOf("Depositar PIX");
  assert.ok(vidro > 0 && vidro < botaoPix && botaoPix < saldos && saldos < bloco,
    `ordem errada: vidro ${vidro} · saldos ${saldos} · bloco ${bloco} · PIX ${botaoPix}`);
  // O bloco fecha antes do 2.º vidro (Regra 1: dentro do 1.º).
  const segundoVidro = h.indexOf("gut-glass-standard", vidro + 1);
  assert.ok(segundoVidro < 0 || bloco < segundoVidro);
  assert.doesNotMatch(blocoMissoes(h), /<(button|a|input)\b|role="button"|onclick/i, "o bloco ganhou um controlo");
});

test("S · os 3 saldos existentes continuam com o mesmo texto (não foram tocados)", async () => {
  const h = await carteiraCom(pontosCom(missoes(true, true)));
  const txt = (nome) => {
    const i = h.indexOf(`data-saldo="${nome}"`);
    return semTags(h.slice(h.indexOf(">", i) + 1, h.indexOf("</div></div>", i) + 12));
  };
  assert.match(txt("fidelidade"), /^🎟️ Pontos de fidelidade 30 \/ 50/);
  assert.equal(txt("creditos"), "⚡ Créditos de lance 3 disponíveis");
  assert.equal(txt("eco-quildo"), "🪙 ECOQUILDO 5 Usável no site oficial");
});

// ═══ C — cor e contraste ═══════════════════════════════════════════════════════════
const lum = (hex) => {
  const c = [0, 2, 4].map((i) => parseInt(hex.replace("#", "").slice(i, i + 2), 16) / 255);
  const l = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const comOpacidade = (hex, a, fundo) => {
  const f = (h) => h.replace("#", "").match(/../g).map((x) => parseInt(x, 16));
  return "#" + f(hex).map((v, i) => Math.round(a * v + (1 - a) * f(fundo)[i]).toString(16).padStart(2, "0")).join("");
};
const VIDRO = "#0c1131"; // rgba(13,18,53,.88) sobre o fundo da página (medido no UTAC109h.2)

test("C · feito = amarelo #f5a623 (R18-110f-front-A), pendente = muted; nada de verde no bloco", async () => {
  const b = blocoMissoes(await carteiraCom(pontosCom(missoes(true, false))));
  const login = linha(b, "login");
  const lance = linha(b, "lance");
  assert.match(login, /color:#f5a623[^>]*>✓</, "o ✓ feito não está a amarelo");
  assert.match(login, /color:#f5a623[^>]*>\+5</, "o +5 feito não está a amarelo");
  assert.match(lance, /color:#6b7db8[^>]*>⏳</, "o ⏳ pendente não está muted");
  assert.match(lance, /color:#6b7db8[^>]*>\+10</);
  assert.doesNotMatch(b, /#10b981|#00d4aa|#0aa37e|#22c55e|✅/i, "voltou o verde ao bloco");
});

test("C · contraste WCAG AA dos pares do bloco sobre o vidro (com controlo negativo)", () => {
  assert.ok(ratio("#f5a623", VIDRO) >= 4.5, `amarelo/vidro ${ratio("#f5a623", VIDRO).toFixed(2)}`);
  assert.ok(ratio("#6b7db8", VIDRO) >= 4.5, `muted/vidro ${ratio("#6b7db8", VIDRO).toFixed(2)}`);
  const texto85 = comOpacidade("#e8f0fe", 0.85, VIDRO);
  assert.ok(ratio(texto85, VIDRO) >= 4.5, `texto 85%/vidro ${ratio(texto85, VIDRO).toFixed(2)}`);
  assert.ok(ratio("#1e2a5a", VIDRO) < 4.5, "controlo negativo: um azul escuro sobre o vidro devia reprovar");
});

// ═══ SEG4 — achados do validador adversarial (F1 + sobreviventes V4/V8/V10) ══════════
test("SEG4/V4 · o texto para leitores de ecrã diz o estado CERTO por linha (feito vs pendente)", async () => {
  const b = blocoMissoes(await carteiraCom(pontosCom(missoes(true, false))));
  assert.match(semTags(linha(b, "login")), /Login diário — feito/);
  assert.match(semTags(linha(b, "lance")), /Completar 1 lance — pendente/);
  assert.doesNotMatch(semTags(linha(b, "login")), /pendente/);
  assert.doesNotMatch(semTags(linha(b, "lance")), /— feito/);
});

test("SEG4/V8 · os glifos (✓/⏳) e o 🎯 são decorativos: aria-hidden", async () => {
  const b = blocoMissoes(await carteiraCom(pontosCom(missoes(true, false))));
  assert.match(linha(b, "login"), /<span aria-hidden="true"[^>]*>✓<\/span>/);
  assert.match(linha(b, "lance"), /<span aria-hidden="true"[^>]*>⏳<\/span>/);
  assert.match(b, /<span aria-hidden="true">🎯 <\/span>Missões de hoje/);
});

test("SEG4/V10 · o rodapé usa o pontosHoje do SERVIDOR (não recalcula no cliente)", async () => {
  const b = blocoMissoes(await carteiraCom(pontosCom({ dia: "2026-10-13", loginFeito: true, lanceFeito: false, pontosHoje: 7 })));
  assert.match(semTags(b), /Você ganhou 7 pontos hoje\./);
});

test("SEG4/F1 · uma releitura FALHADA (após compra) põe as missões em neutro — nada de ✓/⏳ desactualizados", async () => {
  definirContexto(CONTEXTO);
  const estado = { falhar: false };
  const dup = duploDeFetch((url) => {
    if (LER_PONTOS.test(url)) return estado.falhar ? { status: 500, json: {} } : pontosCom(missoes(true, true));
    if (LER_ECO.test(url)) return eco;
    if (/comprar-passe/.test(url)) { estado.falhar = true; return { status: 201, json: { ok: true } }; }
    return { status: 404, json: {} };
  });
  try {
    const c = montar(MinhaCarteira, []);
    await c.assentar();
    const html = () => renderToStaticMarkup(React.createElement(React.Fragment, null, c.resultado()));
    assert.match(blocoMissoes(html()), /data-estado="ok"/, "controlo: antes da compra as missões estão legíveis");
    const nos = [];
    (function walk(n) {
      if (n == null || typeof n === "boolean") return;
      if (Array.isArray(n)) { n.forEach(walk); return; }
      if (typeof n !== "object") return;
      nos.push(n);
      if (typeof n.type === "function" && n.type.name === "ComprarPasseModal") { const s = n.type(n.props); if (s?.props) walk(s.props.children); }
      if (n.props) walk(n.props.children);
    })(c.resultado());
    const txt = (n) => n == null || typeof n === "boolean" ? "" : (typeof n === "string" || typeof n === "number") ? String(n)
      : Array.isArray(n) ? n.map(txt).join("") : n.props ? txt(n.props.children) : "";
    const clicar = async (rot, lista) => {
      const b = lista.filter((n) => n.type === "button").find((x) => txt(x).includes(rot));
      assert.ok(b, `não encontrei «${rot}»`); await b.props.onClick(); await c.assentar();
    };
    await clicar("Comprar Passe Desafio R$ 2,00", nos);
    const nos2 = []; (function walk(n) {
      if (n == null || typeof n === "boolean") return;
      if (Array.isArray(n)) { n.forEach(walk); return; }
      if (typeof n !== "object") return;
      nos2.push(n);
      if (typeof n.type === "function" && n.type.name === "ComprarPasseModal") { const s = n.type(n.props); if (s?.props) walk(s.props.children); }
      if (n.props) walk(n.props.children);
    })(c.resultado());
    await clicar("Comprar Passe Relâmpago", nos2);
    const b = blocoMissoes(html());
    assert.ok(estado.falhar, "instrumento: a releitura após a compra não foi feita");
    assert.match(b, /data-estado="neutro"/, "com a releitura falhada as missões ficaram «ok» (desactualizadas)");
    assert.doesNotMatch(b, /✓|⏳|Você ganhou/);
  } finally { dup.restaurar(); }
});
