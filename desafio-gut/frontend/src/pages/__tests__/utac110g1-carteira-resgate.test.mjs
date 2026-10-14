// utac110g1-carteira-resgate.test.mjs — UTAC110g.1 (FRENTE B) · o botão «Resgatar cartão» na CARTEIRA.
//
// PORQUE ESTE FICHEIRO EXISTE: o UTAC110g.1 (R18-110g.1-2 / decisão D-110g-4) tirou o botão de resgate
// das Ofertas Programadas e moveu-o para a Carteira. O `utac106g-resgate.test.mjs` cobre o FLUXO
// (clique → balão → POST/402) no ecrã novo; aqui cobrem-se os ESTADOS e o SÍTIO:
//   · E1 — ≥50 pontos de CARTÃO (`podeResgatarCartao` do servidor) ⇒ o botão APARECE;
//   · E2 — <50 ⇒ NÃO aparece (nem desactivado);
//   · E3 — a carregar ⇒ NÃO aparece (não se afirma o que não se sabe);
//   · E4 — erro de leitura ⇒ NÃO aparece (não se inventa estado);
//   · R1 — `pontos` (TOTAL, com o bónus do palpite) NÃO decide: 50 totais com 48 de compra ⇒ sem botão;
//   · INVARIANTE — 50 de compra + palpite PERDEDOR ⇒ o botão continua a existir (Google Play: o
//     cartão é jogo de habilidade por pontos de COMPRA, não pelo palpite);
//   · S — vive DENTRO do 1.º vidro, DEPOIS dos 3 saldos e das «Missões de hoje», ANTES dos botões de
//     compra;
//   · C — cor: padrão AMARELO TINGIDO (R18-109h.2/109h.3) — nunca CTA cheio de `#f5a623`;
//   · BIDIRECIONAL — as guardas MORDEM (controlo negativo explícito em cada par).
//
// Instrumentos do repo (nenhum ficheiro de produção alterado): `_servidor-teste.mjs` + `_hook-runner`
// (`montar` + `duploDeFetch` com o `apiGet` REAL) + duplo de AppContext + duplos dos modais laterais
// da Carteira (os mesmos do utac110f-front-missoes).
//
// ⚠️ LIMITE DECLARADO: sem DOM real — o markup é SSR (`renderToStaticMarkup`); layout, toque e
// overflow medem-se nas capturas do browser (`_logs/utac110g.1-browser/`), não aqui.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "../../__tests__/_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const STUBS_106C = resolve(AQUI, "..", "..", "__tests__", "_stubs-106c");
const STUBS_106E = resolve(AQUI, "_stubs-106e");
const STUB_CONTEXTO = resolve(AQUI, "_stubs", "AppContext.jsx");

const ALIASES = [
  { find: /^\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
  { find: /^\.\.\/\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
  { find: /^\.\/useTrocarPorSenhas\.js$/, replacement: `${STUBS_106E}/useTrocarPorSenhas.js` },
  { find: /^\.\.\/hooks\/useTrocarPorSenhas\.js$/, replacement: `${STUBS_106E}/useTrocarPorSenhas.js` },
  { find: /^\.\.\/components\/ComprarFichasModal\.jsx$/, replacement: `${STUBS_106C}/child.jsx` },
  { find: /^\.\.\/components\/PainelIndicacao\.jsx$/, replacement: `${STUBS_106C}/child.jsx` },
  { find: /^\.\.\/components\/BotaoLoginPrincipal\.jsx$/, replacement: `${STUBS_106C}/child.jsx` },
  { find: /^react-router-dom$/, replacement: `${STUBS_106C}/rr.jsx` },
];

let vite, React, renderToStaticMarkup, montar, duploDeFetch, definirContexto, MinhaCarteira;

before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(AQUI, "..", "..", "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: ALIASES }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ montar, duploDeFetch } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/AppContext.jsx"));
  MinhaCarteira = (await vite.ssrLoadModule("/src/pages/MinhaCarteira.jsx")).default;
});
after(async () => { if (vite) await vite.close(); });

const CONTEXTO = {
  isConnected: true, abrirModal: () => {}, address: "0xAbC1230000000000000000000000000000004567",
  user: { email: { address: "a@b.c" } }, refetchSaldo: () => {}, saldoRsCentavos: 1234, saldoRsStatus: "ok",
  refetchSaldoRs: () => {}, setModalidade: () => {}, privyWallet: null, saldoSenhas: 0, saldoSenhasStatus: "ok",
  userLabel: "Teste", desconectar: () => {}, authToken: "AUTH-110G1",
};
const LER_PONTOS = /\/\.netlify\/functions\/ler-pontos$/;
const LER_ECO = /\/\.netlify\/functions\/ler-eco-quildo$/;
const ECO = { status: 200, json: { ok: true, saldo: 5, historico: [], centavosPorEcoQuildo: 100 } };
const semTags = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const LEITURA = (extra = {}) => ({
  ok: true, pontos: 50, pontosCartao: 50, bonusPalpite: 0, pontosParaCartao: 50, podeResgatarCartao: true,
  historico: [], palpites: [], ...extra,
});

/** Monta a Carteira. `aguardar:false` deixa o `ler-pontos` PENDENTE ⇒ estado «a carregar». */
async function carteira(resposta, { aguardar = true } = {}) {
  definirContexto(CONTEXTO);
  const dup = duploDeFetch((url) => (LER_PONTOS.test(url) ? resposta : LER_ECO.test(url) ? ECO : { status: 404, json: {} }));
  const c = montar(MinhaCarteira, []);
  if (aguardar) await c.assentar();
  return {
    dup,
    html: () => renderToStaticMarkup(React.createElement(React.Fragment, null, c.resultado())),
    temBotao: () => /data-acao="resgatar-cartao"/.test(renderToStaticMarkup(React.createElement(React.Fragment, null, c.resultado()))),
  };
}

// A guarda, isolada, para poder provar que MORDE (controlo negativo).
const EXIGE_BOTAO = (html, esperado) => {
  const tem = /data-acao="resgatar-cartao"/.test(html);
  assert.equal(tem, esperado, `o botão de resgate ${tem ? "apareceu" : "faltou"} onde devia ${esperado ? "aparecer" : "faltar"}`);
  return tem;
};

// ═══ E — OS 4 ESTADOS ═════════════════════════════════════════════════════════════════════════════
test("E1 · com 50 pontos de CARTÃO o botão APARECE, com o texto e a âncora do resgate", async () => {
  const c = await carteira({ status: 200, json: LEITURA() });
  try {
    const h = c.html();
    assert.equal(EXIGE_BOTAO(h, true), true);
    assert.match(semTags(h), /🎁 Resgatar cartão colecionável/, "o texto visível do botão");
    assert.match(h, /aria-label="Resgatar cartão"/, "o nome acessível");
    assert.match(h, /<button[^>]*type="button"[^>]*data-acao="resgatar-cartao"/, "tem de ser um button de verdade");
  } finally { c.dup.restaurar(); }
});

test("E2 · com menos de 50 pontos NÃO aparece botão (nem desactivado)", async () => {
  const c = await carteira({ status: 200, json: LEITURA({ pontos: 30, pontosCartao: 30, podeResgatarCartao: false }) });
  try {
    const h = c.html();
    assert.equal(EXIGE_BOTAO(h, false), false);
    assert.doesNotMatch(h, /Resgatar cartão/, "nem o texto pode aparecer");
  } finally { c.dup.restaurar(); }
});

test("E3 · a CARREGAR (ler-pontos pendente) não se afirma nada: sem botão", async () => {
  const c = await carteira({ status: 200, json: LEITURA() }, { aguardar: false });
  try {
    assert.equal(EXIGE_BOTAO(c.html(), false), false, "a carregar não pode haver botão (não se inventa estado)");
  } finally { c.dup.restaurar(); }
});

test("E4 · ERRO de leitura não inventa estado: sem botão", async () => {
  const c = await carteira({ status: 500, json: {} });
  try {
    assert.equal(EXIGE_BOTAO(c.html(), false), false, "com erro não pode haver botão");
    assert.match(semTags(c.html()), /Não foi possível ler seus pontos/, "o erro continua a ser dito ao utilizador");
  } finally { c.dup.restaurar(); }
});

// ═══ R1 — o limiar é dos pontos de COMPRA ════════════════════════════════════════════════════════
test("R1 · `pontos` (total, com bónus) NÃO decide: 50 totais com 48 de compra ⇒ SEM botão", async () => {
  const c = await carteira({ status: 200, json: LEITURA({ pontos: 50, pontosCartao: 48, bonusPalpite: 2, podeResgatarCartao: false }) });
  try {
    assert.equal(EXIGE_BOTAO(c.html(), false), false, "o bónus do palpite não pode desbloquear o cartão");
  } finally { c.dup.restaurar(); }
});

test("INVARIANTE · 50 de compra + palpite PERDEDOR ⇒ o botão continua a existir (jogo de habilidade)", async () => {
  // A metade «o resgate aparece» desta invariante vivia no utac106f-ofertas e mudou-se para aqui com
  // o botão. Se o cartão passasse a depender do palpite, este teste cairia.
  const c = await carteira({
    status: 200,
    json: LEITURA({ podeResgatarCartao: true, palpites: [{ edicaoId: "PROG-7", valor: 5, apurado: true, resultado: "perdeu" }] }),
  });
  try {
    assert.equal(EXIGE_BOTAO(c.html(), true), true, "o cartão é só por pontos de compra — o palpite é bónus");
  } finally { c.dup.restaurar(); }
});

// ═══ BIDIRECIONAL — as guardas MORDEM ════════════════════════════════════════════════════════════
test("BIDIRECIONAL · o estado NÃO é constante: o mesmo ecrã dá botão com ≥50 e não dá com <50", async () => {
  const visto = new Set();
  for (const resposta of [
    { status: 200, json: LEITURA({ pontos: 50, pontosCartao: 50, podeResgatarCartao: true }) },
    { status: 200, json: LEITURA({ pontos: 49, pontosCartao: 49, podeResgatarCartao: false }) },
  ]) {
    const c = await carteira(resposta);
    try { visto.add(EXIGE_BOTAO(c.html(), resposta.json.podeResgatarCartao)); } finally { c.dup.restaurar(); }
  }
  assert.deepEqual([...visto].sort(), [false, true], "o botão apareceu sempre (ou nunca) — guarda sem dentes");
});

test("BIDIRECIONAL · controlo NEGATIVO: a guarda APANHA o estado errado (o teste não é vacuoso)", async () => {
  const c = await carteira({ status: 200, json: LEITURA({ pontos: 30, pontosCartao: 30, podeResgatarCartao: false }) });
  try {
    // com <50 pontos, EXIGIR o botão tem de explodir — é isso que prova que `EXIGE_BOTAO` mede algo.
    assert.throws(() => EXIGE_BOTAO(c.html(), true), /o botão de resgate faltou/, "a guarda não morde");
  } finally { c.dup.restaurar(); }
});

// ═══ S — SÍTIO E ESTRUTURA ═══════════════════════════════════════════════════════════════════════
test("S · DENTRO do 1.º vidro, depois dos 3 saldos e das missões, ANTES dos botões de compra", async () => {
  const c = await carteira({
    status: 200,
    json: LEITURA({ missoesHoje: { dia: "2026-10-14", loginFeito: true, lanceFeito: false, pontosHoje: 5 } }),
  });
  try {
    const h = c.html();
    const vidro = h.indexOf("gut-glass-standard");
    const saldos = h.indexOf('data-saldo="eco-quildo"');
    const missoes = h.indexOf("data-missoes-hoje");
    const resgate = h.indexOf('data-acao="resgatar-cartao"');
    const pix = h.indexOf("Depositar PIX");
    assert.ok(vidro > 0 && saldos > 0 && missoes > 0 && resgate > 0 && pix > 0,
      `faltou uma âncora: vidro ${vidro} · saldos ${saldos} · missões ${missoes} · resgate ${resgate} · PIX ${pix}`);
    assert.ok(vidro < saldos && saldos < missoes && missoes < resgate && resgate < pix,
      `ordem errada: vidro ${vidro} · saldos ${saldos} · missões ${missoes} · resgate ${resgate} · PIX ${pix}`);
    // e continua dentro do 1.º vidro (fecha antes do 2.º)
    const segundoVidro = h.indexOf("gut-glass-standard", vidro + 1);
    assert.ok(segundoVidro < 0 || resgate < segundoVidro, "o botão saiu do 1.º vidro");
    // os 3 saldos continuam a existir (o botão é ACRESCENTADO, não substitui nada)
    for (const s of ["fidelidade", "creditos", "eco-quildo"]) assert.ok(h.includes(`data-saldo="${s}"`), `faltou o saldo ${s}`);
  } finally { c.dup.restaurar(); }
});

// ═══ C — COR (R18-109h.2 / R18-110g.1-2: «amarelo único») ════════════════════════════════════════
test("C · o botão usa o padrão amarelo TINGIDO da Carteira — nunca o amarelo SÓLIDO", async () => {
  const c = await carteira({ status: 200, json: LEITURA() });
  try {
    const h = c.html();
    const i = h.indexOf('data-acao="resgatar-cartao"');
    // o bloco do botão: do `<button` que o contém até ao fim do `style="…"`
    const ini = h.lastIndexOf("<button", i);
    const bloco = h.slice(ini, h.indexOf(">", h.indexOf("style=", ini)));
    assert.match(bloco, /background:rgba\(245,166,35,0\.14\)/, "não está no padrão tingido");
    assert.match(bloco, /border:1px solid rgba\(245,166,35,0\.4\)/, "o contorno do padrão tingido");
    assert.match(bloco, /color:#f5a623/, "o texto tem de ser o amarelo único");
    assert.doesNotMatch(bloco, /background:#f5a623/, "CTA de amarelo SÓLIDO: proibido na Carteira (R18-109h.2)");
    assert.doesNotMatch(bloco, /background:rgb\(245, 166, 35\)/, "CTA cheio (forma rgb)");
    // altura de toque do padrão da casa
    assert.match(bloco, /min-height:48px/, "alvo de toque de 48 px");
  } finally { c.dup.restaurar(); }
});
