// UTAC107e.2 — Frente B (etiqueta do próprio lance, só pós-fecho) + Frente C (tabela de palpites da OP).
//
// Componente e hooks REAIS, renderizados pelo Vite SSR (`_ponte-ssr` + `_hook-runner`, o arnês do 106f);
// duplos só no `fetch` (o `apiGet` real corre) e no AppContext. Mais: contraste WCAG medido e cablagem
// nos 3 sítios lida com os comentários retirados (um comentário a nomear o componente não conta).
//
// node --test src/__tests__/utac107e2-etiqueta.test.mjs
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
  { find: /^react-router-dom$/, replacement: `${STUBS_106C}/rr.jsx` },
];

let vite, React, renderToStaticMarkup, montar, duploDeFetch, definirContexto, E, OfertasProgramadas;

before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(SRC, "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: ALIASES }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ montar, duploDeFetch } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/AppContext.jsx"));
  E = await vite.ssrLoadModule("/src/components/EtiquetaEstadoLance.jsx");
  OfertasProgramadas = (await vite.ssrLoadModule("/src/pages/OfertasProgramadas.jsx")).default;
});
after(async () => { if (vite) await vite.close(); });

const html = (el) => renderToStaticMarkup(React.createElement(React.Fragment, null, el));
const semTags = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// ═══ 1. O componente: 3 estados, estrutura «SEU LANCE» + «(estado)» ══════════════════════════════
test("B1 — estadoDaEtiqueta: líder final → menor; foi líder → deixou_de_ser; nunca → nao_menor", () => {
  assert.equal(E.estadoDaEtiqueta({ eLiderFinal: true, foiLiderAlgumaVez: true }), "menor");
  assert.equal(E.estadoDaEtiqueta({ eLiderFinal: false, foiLiderAlgumaVez: true }), "deixou_de_ser");
  assert.equal(E.estadoDaEtiqueta({ eLiderFinal: false, foiLiderAlgumaVez: false }), "nao_menor");
  assert.equal(E.estadoDaEtiqueta({}), "nao_menor", "sem flags não se inventa liderança");
  assert.equal(E.estadoDaEtiqueta({ eLiderFinal: "sim", foiLiderAlgumaVez: 1 }), "nao_menor", "sem coerção");
});

test("B2 — os 3 estados desenham «SEU LANCE» fixo + o texto do estado, na cor do estado", () => {
  const casos = {
    menor: ["(É O MENOR E ÚNICO)", "#3ddc84"],
    nao_menor: ["(NÃO É O MENOR E ÚNICO)", "#ff8a8d"],
    deixou_de_ser: ["(DEIXOU DE SER O MENOR E ÚNICO)", "#f5a623"],
  };
  for (const [estado, [texto, cor]] of Object.entries(casos)) {
    const h = html(React.createElement(E.default, { estado }));
    assert.equal(semTags(h), `SEU LANCE ${texto}`, estado);
    assert.match(h, new RegExp(`data-etiqueta-lance="${estado}"`));
    assert.match(h, new RegExp(`<span style="color:${E.COR_FIXA}">SEU LANCE</span>`), "a parte fixa é neutra");
    assert.ok(h.includes(`<span style="color:${cor}">${texto}</span>`), `${estado}: só o estado leva a cor`);
    assert.match(h, /role="status"/);
  }
});

test("B3 — estado null, desconhecido ou herdado do protótipo ⇒ não desenha nada", () => {
  for (const estado of [null, undefined, "", "vencedor", "toString", "__proto__", 1]) {
    assert.equal(html(React.createElement(E.default, { estado })), "", String(estado));
  }
});

// ═══ 2. Contraste WCAG ≥ 4,5:1 sobre o vidro padrão (rgba(13,18,53,.88) sobre #04080f) ══════════
const lum = ([r, g, b]) => {
  const c = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
};
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const sobre = (cor, alfa, fundo) => cor.map((v, i) => v * alfa + fundo[i] * (1 - alfa));
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test("B4 — contraste ≥ 4,5:1 de cada texto sobre o fundo REAL da etiqueta (pílula tingida sobre o vidro)", () => {
  const vidro = sobre([13, 18, 53], 0.88, [4, 8, 15]);
  for (const [estado, { cor }] of Object.entries(E.ESTADOS_ETIQUETA)) {
    const fundo = sobre(hex(cor), 0x1f / 255, vidro);
    const rEstado = contraste(hex(cor), fundo);
    const rFixa = contraste(hex(E.COR_FIXA), fundo);
    assert.ok(rEstado >= 4.5, `${estado}: ${rEstado.toFixed(2)}:1`);
    assert.ok(rFixa >= 4.5, `SEU LANCE em ${estado}: ${rFixa.toFixed(2)}:1`);
  }
});

// ═══ 3. EtiquetaMeuLance: só depois do fecho, só do titular ═════════════════════════════════════
async function montarMeuLance(props, responder) {
  const dup = duploDeFetch(responder ?? (() => ({ status: 200, json: {} })));
  const ctrl = montar(E.EtiquetaMeuLance, [props]);
  await ctrl.assentar();
  return { ctrl, dup, h: () => html(ctrl.resultado()) };
}

test("B5 — edição NÃO encerrada ⇒ nenhum pedido e nada desenhado (anti-bot: nem se pergunta)", async () => {
  const c = await montarMeuLance({ edicaoId: "R-1", encerrado: false, authToken: "TK" });
  try {
    assert.equal(c.dup.chamadas.length, 0);
    assert.equal(c.h(), "");
  } finally { c.ctrl.desmontar(); c.dup.restaurar(); }
});

test("B6 — sem authToken ⇒ nenhum pedido (o estado é do titular autenticado)", async () => {
  const c = await montarMeuLance({ edicaoId: "R-1", encerrado: true, authToken: null });
  try { assert.equal(c.dup.chamadas.length, 0); assert.equal(c.h(), ""); }
  finally { c.ctrl.desmontar(); c.dup.restaurar(); }
});

test("B7 — encerrada e consolidada ⇒ pergunta o meu-estado com o Bearer e desenha o estado dos flags", async () => {
  const c = await montarMeuLance({ edicaoId: "R-1", encerrado: true, authToken: "TK-USER" }, () => ({
    status: 200, json: { edicaoId: "R-1", encerrado: true, temLance: true, eLiderFinal: false, foiLiderAlgumaVez: true, estado: "nao_menor" },
  }));
  try {
    assert.equal(c.dup.chamadas.length, 1);
    assert.match(c.dup.chamadas[0].url, /\/lances-flash\?acao=meu-estado&edicaoId=R-1$/);
    assert.equal(c.dup.chamadas[0].headers.Authorization, "Bearer TK-USER");
    assert.match(c.h(), /data-etiqueta-lance="deixou_de_ser"/, "o ecrã calcula o estado pelos 2 flags");
  } finally { c.ctrl.desmontar(); c.dup.restaurar(); }
});

test("B8 — encerrada no ecrã mas POR CONSOLIDAR no servidor ⇒ nada (e volta a perguntar depois)", async () => {
  const c = await montarMeuLance({ edicaoId: "R-1", encerrado: true, authToken: "TK" }, () => ({
    status: 200, json: { edicaoId: "R-1", encerrado: false, estado: null },
  }));
  try { assert.equal(c.h(), ""); } finally { c.ctrl.desmontar(); c.dup.restaurar(); }
});

test("B8b — por consolidar ⇒ VOLTA A PERGUNTAR e desenha quando o servidor consolida (achado A3)", async () => {
  let n = 0;
  const c = await montarMeuLance({ edicaoId: "R-1", encerrado: true, authToken: "TK", intervaloMs: 15 }, () => {
    n += 1;
    return n === 1
      ? { status: 200, json: { encerrado: false, estado: null } }
      : { status: 200, json: { encerrado: true, temLance: true, eLiderFinal: true, foiLiderAlgumaVez: true } };
  });
  try {
    // (o `assentar` já dá tempo à 2.ª pergunta; a 1.ª resposta foi «por consolidar»)
    await new Promise((r) => setTimeout(r, 80));
    await c.ctrl.assentar();
    assert.ok(c.dup.chamadas.length >= 2, "tem de voltar a perguntar depois do «por consolidar»");
    assert.match(c.h(), /data-etiqueta-lance="menor"/);
    const feitas = c.dup.chamadas.length;
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(c.dup.chamadas.length, feitas, "consolidado ⇒ pára de perguntar");
  } finally { c.ctrl.desmontar(); c.dup.restaurar(); }
});

test("B9 — titular sem lance nessa edição, ou erro do servidor ⇒ nada", async () => {
  for (const r of [{ status: 200, json: { encerrado: true, temLance: false } }, { status: 503, json: {} }]) {
    const c = await montarMeuLance({ edicaoId: "R-1", encerrado: true, authToken: "TK" }, () => r);
    try { assert.equal(c.h(), "", JSON.stringify(r)); } finally { c.ctrl.desmontar(); c.dup.restaurar(); }
  }
});

// ═══ 4. Cablagem nos sítios (comentários fora; R18-D: a OP NÃO tem a etiqueta) ══════════════════
const semComentarios = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "")
  .split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join("\n");
const fonte = (rel) => semComentarios(readFileSync(resolve(SRC, rel), "utf8"));

test("B10 — MLC: a etiqueta está no cartão do lance, com a edição activa, o `encerrado` e o authToken", () => {
  const s = fonte("pages/MercadoLances.jsx");
  assert.match(s, /<EtiquetaMeuLance edicaoId=\{EDICAO_ATIVA\} encerrado=\{encerrado\} authToken=\{authToken\} \/>/);
});

test("B11 — Início: a etiqueta só monta DENTRO de `estAtiva.encerrada &&`", () => {
  const s = fonte("pages/Dashboard.jsx");
  assert.match(s, /\{estAtiva\.encerrada && \(\s*<div[^>]*>\s*<EtiquetaMeuLance edicaoId=\{EDICAO_ATIVA\} encerrado authToken=\{authToken\} \/>/);
  assert.equal((s.match(/<EtiquetaMeuLance\b/g) || []).length, 1, "um só sítio no Início");
});

test("B12 — OP (R18-D): sem etiqueta do lance — o cartão é de palpite", () => {
  assert.doesNotMatch(fonte("pages/OfertasProgramadas.jsx"), /EtiquetaMeuLance|EtiquetaEstadoLance/);
});

// ═══ 5. OP: a tabela de palpites vem do `ler-palpites` ══════════════════════════════════════════
const A = "0xAbC1230000000000000000000000000000004567";
const B = "0xbbb0000000000000000000000000000000000002";
const LEITURA = { ok: true, pontos: 7, pontosCartao: 7, bonusPalpite: 0, pontosParaCartao: 50, podeResgatarCartao: false, historico: [], palpites: [] };

async function montarOP(respostaPalpites) {
  definirContexto({
    isConnected: true, address: A, user: null, authToken: "AUTHCTX-107e2", userLabel: "T",
    edicoes: { "PROG-7": { id: "PROG-7", tipo: "programado", status: "aberto", termino_em: "2026-12-31T00:00:00.000Z" } },
    refetchSaldo: () => {}, saldoRsCentavos: 0, saldoRsStatus: "ok", refetchSaldoRs: () => {}, setModalidade: () => {}, privyWallet: null,
  });
  const dup = duploDeFetch((url) => (url.includes("/ler-palpites?") ? { status: 200, json: respostaPalpites } : { status: 200, json: LEITURA }));
  const ctrl = montar(OfertasProgramadas, []);
  await ctrl.assentar();
  const h = html(ctrl.resultado());
  const tabela = h.slice(h.indexOf('data-testid="op-tabela-fim"'));
  return { ctrl, dup, tabela };
}

test("C1 — a tabela pede `ler-palpites` da edição com o Bearer user-session", async () => {
  const c = await montarOP({ ok: true, revelado: false, palpites: [] });
  try {
    const p = c.dup.chamadas.find((x) => x.url.includes("/ler-palpites?"));
    assert.ok(p, "a tabela tem de ler o endpoint de palpites");
    assert.match(p.url, /ler-palpites\?edicaoId=PROG-7$/);
    assert.equal(p.headers.Authorization, "Bearer AUTHCTX-107e2");
    assert.match(semTags(c.tabela), /Ainda não há palpites\./, "lista vazia ⇒ estado vazio");
  } finally { c.ctrl.desmontar(); c.dup.restaurar(); }
});

test("C2 — durante a edição: linhas com quem participou e o valor 🔒", async () => {
  const c = await montarOP({ ok: true, revelado: false, palpites: [
    { endereco: A, data: "2026-10-06T10:00:01.000Z" }, { endereco: B, data: "2026-10-06T10:00:02.000Z" }] });
  try {
    assert.equal((c.tabela.match(/data-palpite-linha/g) || []).length, 2);
    const t = semTags(c.tabela);
    assert.match(t, /0xAbC1…4567/);
    // UTAC109g (B1) — 🔒 por linha (o cabeçalho ganhou «🔒 valores ocultos até o fim», como o MLC).
    const linhas = [...c.tabela.matchAll(/<(?:tr|div)[^>]*data-palpite-linha[^>]*>([\s\S]*?)<\/(?:tr)>|data-palpite-linha[^>]*>([\s\S]*?)(?=<div[^>]*data-palpite-linha|<\/section>)/g)];
    assert.equal(linhas.length, 2);
    for (const l of linhas) assert.equal(((l[1] ?? l[2]).match(/🔒/g) || []).length, 1);
    assert.match(t, /🔒 valores ocultos até o fim/);
    assert.doesNotMatch(t, /\d+ lances/);
    assert.doesNotMatch(t, /Ainda não há palpites/);
  } finally { c.ctrl.desmontar(); c.dup.restaurar(); }
});

test("C3 — depois do fecho: o palpite aparece; um valor que não seja inteiro continua 🔒", async () => {
  const c = await montarOP({ ok: true, revelado: true, palpites: [
    { endereco: A, valor: 25, data: "x" }, { endereco: B, valor: "40", data: "y" }] });
  try {
    const t = semTags(c.tabela);
    assert.match(t, /25 lances/);
    assert.doesNotMatch(t, /40 lances/, "sem coerção de texto");
    assert.equal((t.match(/🔒/g) || []).length, 1);
  } finally { c.ctrl.desmontar(); c.dup.restaurar(); }
});

test("C4 — `revelado:false` com valor no corpo (servidor errado) ⇒ o ecrã continua a esconder", async () => {
  const c = await montarOP({ ok: true, revelado: false, palpites: [{ endereco: A, valor: 25, data: "x" }] });
  try {
    assert.doesNotMatch(semTags(c.tabela), /25 lances/);
  } finally { c.ctrl.desmontar(); c.dup.restaurar(); }
});
