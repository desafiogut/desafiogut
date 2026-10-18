// utac110e-front.test.mjs — UTAC110e (Frente D) · ECOQUILDO na Carteira (só leitura).
//
// O que se prova aqui:
//   H — `useEcoQuildo` (hook REAL + fetch duplo): endpoint `ler-eco-quildo`, Bearer = `authToken`
//       do AppContext (user-session), 401 → «Sessão expirada», rede em baixo / saldo ilegível →
//       `saldo: null` + erro (NUNCA 0 inventado), sem sessão → nenhum pedido;
//   C — a Carteira mostra o 3.º saldo, BIDIRECCIONAL (0 e 5), sem o confundir com pontos de cartão
//       nem com créditos de lance; ilegível → «—»;
//   R — comprar um Passe com sucesso RELÊ o ECOQUILDO (D3);
//   N — anti-regressão: NÃO há botão/CTA/endpoint que compre ECOQUILDO na Carteira (Art. 49º).
//
// Instrumentos do repo: `_servidor-teste.mjs` + `_ponte-ssr.mjs` (A12), `_hook-runner.mjs`
// (`montar` + `duploDeFetch` — o `apiGet`/`apiPost` REAIS correm), duplo do AppContext.
// ⚠️ LIMITE DECLARADO: sem DOM — o clique chama o handler do elemento React.
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

let vite, React, renderToStaticMarkup, montar, duploDeFetch, definirContexto, MinhaCarteira, useEcoQuildo;

before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(SRC, "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: ALIASES }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ montar, duploDeFetch } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/AppContext.jsx"));
  ({ useEcoQuildo } = await vite.ssrLoadModule("/src/hooks/useEcoQuildo.js"));
  MinhaCarteira = (await vite.ssrLoadModule("/src/pages/MinhaCarteira.jsx")).default;
});
after(async () => { if (vite) await vite.close(); });

// O `authToken` do contexto é DISTINTO do token do duplo do lance — uma asserção sobre o Bearer
// que passasse com qualquer dos dois seria vácua (lição do UTAC106j-fix).
const AUTH = "AUTH-110E-USER-SESSION";
const CONTEXTO = {
  isConnected: true, abrirModal: () => {}, address: "0xAbC1230000000000000000000000000000004567",
  user: { email: { address: "a@b.c" } }, refetchSaldo: () => {}, saldoRsCentavos: 1234, saldoRsStatus: "ok",
  refetchSaldoRs: () => {}, setModalidade: () => {}, privyWallet: null, saldoSenhas: 0, saldoSenhasStatus: "ok",
  userLabel: "Teste", desconectar: () => {}, authToken: AUTH,
};
const LER_ECO = /\/\.netlify\/functions\/ler-eco-quildo$/;
const LER_PONTOS = /\/\.netlify\/functions\/ler-pontos$/;
const semTags = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const eco = (saldo, historico = []) => ({ status: 200, json: { ok: true, saldo, historico, centavosPorEcoQuildo: 100 } });
const pontos = { status: 200, json: { ok: true, pontos: 37, pontosCartao: 30, pontosParaCartao: 50, lance: { creditos: 3, pontos: 3, historico: [] } } };

async function hookCom(responder, ctx = CONTEXTO) {
  definirContexto(ctx);
  const dup = duploDeFetch(responder);
  try {
    const c = montar(useEcoQuildo, []);
    await c.assentar();
    return { r: c.resultado(), dup };
  } finally { dup.restaurar(); }
}

// ═══ H — o hook ═════════════════════════════════════════════════════════════════════
test("H · sucesso: GET /ler-eco-quildo com Bearer do `authToken` (user-session) → saldo + histórico", async () => {
  const hist = [{ data: "2026-10-13T00:00:00Z", motivo: "passe", delta: 1, ref: "x", saldo: 5 }];
  const { r, dup } = await hookCom(() => eco(5, hist));
  assert.equal(r.saldo, 5);
  assert.deepEqual(r.historico, hist);
  assert.equal(r.loading, false);
  assert.equal(r.erro, "");
  const pedidos = dup.chamadas.filter((c) => LER_ECO.test(c.url));
  assert.equal(pedidos.length, 1, `esperava 1 pedido a ler-eco-quildo: ${JSON.stringify(dup.chamadas.map((c) => c.url))}`);
  assert.equal(pedidos[0].headers.Authorization, `Bearer ${AUTH}`, "o Bearer não é o authToken do AppContext");
  assert.doesNotMatch(pedidos[0].headers.Authorization, /TOKEN-DE-TESTE|LANCE/, "usou o token do lance");
});

test("H · 401 → «Sessão expirada» e saldo ILEGÍVEL (null), não 0", async () => {
  const { r } = await hookCom(() => ({ status: 401, json: { error: { code: "token_invalido" } } }));
  assert.equal(r.erro, "Sessão expirada");
  assert.equal(r.saldo, null);
  assert.equal(r.loading, false);
});

test("H · falha de rede (fetch rejeita) e 503 → erro PT-BR e saldo null", async () => {
  definirContexto(CONTEXTO);
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  try {
    const c = montar(useEcoQuildo, []);
    await c.assentar();
    assert.equal(c.resultado().saldo, null);
    assert.match(c.resultado().erro, /Não foi possível carregar o ECOQUILDO/);
  } finally { globalThis.fetch = original; }
  const { r } = await hookCom(() => ({ status: 503, json: { error: { code: "sistema_pausado" } } }));
  assert.equal(r.saldo, null);
  assert.match(r.erro, /Não foi possível carregar o ECOQUILDO/);
});

test("H · saldo ilegível na resposta (texto, negativo, fracção, ausente) → null + erro (SEM coerção)", async () => {
  for (const v of ["5", -1, 2.5, null, undefined, NaN, true]) {
    const { r } = await hookCom(() => ({ status: 200, json: { ok: true, saldo: v } }));
    assert.equal(r.saldo, null, `saldo=${String(v)} foi aceite como ${r.saldo}`);
    assert.ok(r.erro, `saldo=${String(v)} sem erro`);
  }
});

test("H · sem sessão (sem authToken ou sem address) → nenhum pedido, saldo 0, sem erro", async () => {
  for (const ctx of [{ ...CONTEXTO, authToken: null }, { ...CONTEXTO, address: null }]) {
    const { r, dup } = await hookCom(() => eco(9), ctx);
    assert.equal(dup.chamadas.length, 0, "pediu sem sessão");
    assert.equal(r.saldo, 0); assert.equal(r.erro, ""); assert.equal(r.loading, false);
  }
});

// ═══ C — a Carteira ═════════════════════════════════════════════════════════════════
async function carteiraCom(respEco, respPontos = pontos) {
  definirContexto(CONTEXTO);
  const dup = duploDeFetch((url) =>
    LER_ECO.test(url) ? respEco : LER_PONTOS.test(url) ? respPontos : { status: 404, json: {} });
  try {
    const c = montar(MinhaCarteira, []);
    await c.assentar();
    return renderToStaticMarkup(React.createElement(React.Fragment, null, c.resultado()));
  } finally { dup.restaurar(); }
}
const bloco = (h, nome) => {
  const i = h.indexOf(`data-saldo="${nome}"`);
  assert.ok(i > 0, `faltou o bloco ${nome}`);
  return h.slice(i, h.indexOf("</div></div>", i) + 12);
};
/** Só o TEXTO do bloco (sem os atributos da tag de abertura). */
const textoBloco = (h, nome) => semTags(bloco(h, nome).slice(bloco(h, nome).indexOf(">") + 1));

test("C · BIDIRECCIONAL — a Carteira mostra 0 ECOQUILDO e mostra 5 ECOQUILDO (e não os confunde com pontos/créditos)", async () => {
  const h0 = await carteiraCom(eco(0));
  assert.equal(textoBloco(h0, "eco-quildo"), "🪙 ECOQUILDO 0 Usável no site oficial");
  const h5 = await carteiraCom(eco(5));
  assert.equal(textoBloco(h5, "eco-quildo"), "🪙 ECOQUILDO 5 Usável no site oficial");
  // Valores distintos nos três saldos: 30 (cartão), 3 (créditos), 5 (ECOQUILDO).
  assert.match(semTags(bloco(h5, "fidelidade")), /30 \/ 50/);
  // ⚠️ UTAC110j.5 — ALTERADO (declarado): o card «créditos» passou a «pontos-lance» (o lance gasta PONTOS, UTAC110n).
  // Antes: assert.match(semTags(bloco(h5, "creditos")), /Créditos de lance 3 disponíveis/);
  assert.match(semTags(bloco(h5, "pontos-lance")), /Pontos de lance 3 Cada lance gasta o seu valor/);
  assert.doesNotMatch(textoBloco(h5, "eco-quildo"), /\b(30|37|3)\b/, "o ECOQUILDO mostrou pontos ou créditos");
  // Regra 1: o 3.º saldo vive DENTRO do vidro do saldo, na mesma grelha.
  const grelha = h5.indexOf("data-saldos-passe");
  assert.ok(grelha > h5.indexOf("gut-glass-standard") && h5.indexOf('data-saldo="eco-quildo"') > grelha);
});

test("C · ilegível (erro de leitura) → «—» no ECOQUILDO + aviso vermelho; NUNCA «0»", async () => {
  for (const resp of [{ status: 500, json: {} }, { status: 200, json: { ok: true, saldo: "7" } }]) {
    const h = await carteiraCom(resp);
    assert.equal(textoBloco(h, "eco-quildo"), "🪙 ECOQUILDO — Usável no site oficial");
    assert.match(h, /data-erro-eco-quildo=""[^>]*color:#ef4444[^>]*>⚠️ Não foi possível ler seu ECOQUILDO agora\./);
  }
  // E o erro do ECOQUILDO não contamina os outros saldos (continuam legíveis).
  const h = await carteiraCom({ status: 500, json: {} });
  assert.match(semTags(bloco(h, "fidelidade")), /30 \/ 50/);
});

test("C · grelha: 3 colunas no desktop; empilhada (1 coluna) no telemóvel", () => {
  const fonte = readFileSync(resolve(SRC, "pages", "MinhaCarteira.jsx"), "utf8");
  assert.match(fonte, /gridTemplateColumns: isMobile \? "1fr" : "repeat\(3, 1fr\)"/);
});

// ═══ R — a compra relê o ECOQUILDO ══════════════════════════════════════════════════
function arvore(raiz) {
  const fora = [];
  (function walk(n) {
    if (n == null || typeof n === "boolean") return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (typeof n !== "object") return;
    fora.push(n);
    if (typeof n.type === "function" && n.type.name === "ComprarPasseModal") {
      const saida = n.type(n.props);
      if (saida?.props) walk(saida.props.children);
    }
    if (n.props) walk(n.props.children);
  })(raiz);
  return fora;
}
const texto = (n) => n == null || typeof n === "boolean" ? ""
  : (typeof n === "string" || typeof n === "number") ? String(n)
  : Array.isArray(n) ? n.map(texto).join("") : n.props ? texto(n.props.children) : "";

async function carteiraParaComprar(respostaCompra) {
  definirContexto(CONTEXTO);
  const estado = { eco: 4 };
  const dup = duploDeFetch((url) => {
    if (LER_ECO.test(url)) return eco(estado.eco);
    if (LER_PONTOS.test(url)) return pontos;
    if (/comprar-passe/.test(url)) {
      if (respostaCompra.status < 300) estado.eco += 1;
      return respostaCompra;
    }
    return { status: 404, json: {} };
  });
  const c = montar(MinhaCarteira, []);
  await c.assentar();
  const clicar = async (rotulo) => {
    const b = arvore(c.resultado()).filter((n) => n.type === "button").find((x) => texto(x).includes(rotulo));
    assert.ok(b, `não encontrei «${rotulo}»`);
    await b.props.onClick();
    await c.assentar();
  };
  const html = () => renderToStaticMarkup(React.createElement(React.Fragment, null, c.resultado()));
  return { dup, clicar, html, fim: () => dup.restaurar() };
}

test("R · compra de Passe com SUCESSO dispara a releitura do ECOQUILDO (4 → 5 no ecrã)", async () => {
  const t = await carteiraParaComprar({ status: 201, json: { ok: true, pontosFidelidade: 10 } });
  try {
    assert.match(textoBloco(t.html(), "eco-quildo"), /ECOQUILDO 4 /);
    const antes = t.dup.chamadas.filter((x) => LER_ECO.test(x.url)).length;
    await t.clicar("Comprar Passe Desafio R$ 2,00");
    await t.clicar("Comprar Passe Relâmpago");
    const depois = t.dup.chamadas.filter((x) => LER_ECO.test(x.url)).length;
    assert.ok(depois > antes, `a compra não releu o ECOQUILDO (${antes} → ${depois})`);
    assert.match(textoBloco(t.html(), "eco-quildo"), /ECOQUILDO 5 /, "o ecrã não mostra o ECOQUILDO relido");
  } finally { t.fim(); }
});

test("R · compra FALHADA (402) não relê o ECOQUILDO", async () => {
  const t = await carteiraParaComprar({ status: 402, json: { error: { code: "saldo_insuficiente" } } });
  try {
    await t.clicar("Comprar Passe Desafio R$ 2,00");
    const antes = t.dup.chamadas.filter((x) => LER_ECO.test(x.url)).length;
    await t.clicar("Comprar Passe Relâmpago");
    assert.equal(t.dup.chamadas.filter((x) => LER_ECO.test(x.url)).length, antes);
  } finally { t.fim(); }
});

// ═══ N — nenhum caminho de compra de ECOQUILDO ══════════════════════════════════════
test("N · anti-regressão: o bloco ECOQUILDO não tem botão/link/onClick e a Carteira não compra ECOQUILDO", async () => {
  const h = await carteiraCom(eco(5));
  const b = bloco(h, "eco-quildo");
  assert.doesNotMatch(b, /<(button|a)\b|role="button"|onclick/i, "o bloco ECOQUILDO ganhou um controlo");
  // Nenhum botão de toda a Carteira fala de ECOQUILDO.
  definirContexto(CONTEXTO);
  const dup = duploDeFetch((url) => (LER_ECO.test(url) ? eco(5) : LER_PONTOS.test(url) ? pontos : { status: 404, json: {} }));
  try {
    const c = montar(MinhaCarteira, []); await c.assentar();
    const botoes = arvore(c.resultado()).filter((n) => n.type === "button" || n.type === "a").map(texto);
    assert.ok(botoes.length > 0, "controlo: a Carteira devia ter botões");
    for (const t of botoes) assert.doesNotMatch(t, /eco\s*-?\s*quildo/i, `botão ECOQUILDO: «${t}»`);
  } finally { dup.restaurar(); }
  // E nenhum endpoint de escrita do ECOQUILDO é chamado pelo frontend (só `ler-eco-quildo`).
  for (const f of [["pages", "MinhaCarteira.jsx"], ["hooks", "useEcoQuildo.js"]]) {
    const fonte = readFileSync(resolve(SRC, ...f), "utf8");
    assert.doesNotMatch(fonte, /(usar|creditar|comprar|converter|transferir)-eco-quildo/, `${f.join("/")} chama escrita de ECOQUILDO`);
    assert.doesNotMatch(fonte, /apiPost\(\s*["'`][^"'`]*eco/i, `${f.join("/")} faz POST de ECOQUILDO`);
  }
});
