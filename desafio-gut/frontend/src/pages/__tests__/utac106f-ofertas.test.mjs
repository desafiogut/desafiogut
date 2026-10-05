// utac106f-ofertas.test.mjs — UTAC106f · ecrã «Ofertas Programadas» (render + clique).
//
// O que fica aqui: o ecrã REAL substituiu o placeholder (pontos/progresso/cartão/histórico/palpite/
// resgate) e o PALPITE é BÓNUS — o cartão nunca depende dele.
//
// Instrumentos do repo (nenhum ficheiro de produção alterado): `_servidor-teste.mjs` + `_hook-runner`
// (`montar` + `duploDeFetch`, que substitui SÓ o `fetch` e deixa correr o `apiGet`/`apiPost` REAIS) +
// duplo de AppContext + duplo de `useTrocarPorSenhas` (`_stubs-106e`, o mesmo do 106e) + duplo do router.
//
// ⚠️ LIMITE DECLARADO: o «clique» é o `onClick` do elemento React (sem DOM, CSS ou hit-testing).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "../../__tests__/_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const STUBS_106C = resolve(AQUI, "..", "..", "__tests__", "_stubs-106c");
const STUBS_106E = resolve(AQUI, "..", "__tests__", "_stubs-106e");
const STUB_CONTEXTO = resolve(AQUI, "_stubs", "AppContext.jsx");

const ALIASES = [
  // O ecrã e os hooks usam FORMAS DIFERENTES da mesma specifier (a relativa depende de quem importa):
  // `src/pages/*` → `../context/…` e `../hooks/…`; `src/hooks/usePontos.js` → `../context/…` e `./useTrocarPorSenhas.js`.
  { find: /^\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
  { find: /^\.\.\/\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
  { find: /^\.\/useTrocarPorSenhas\.js$/, replacement: `${STUBS_106E}/useTrocarPorSenhas.js` },
  { find: /^\.\.\/hooks\/useTrocarPorSenhas\.js$/, replacement: `${STUBS_106E}/useTrocarPorSenhas.js` },
  { find: /^react-router-dom$/, replacement: `${STUBS_106C}/rr.jsx` },
];

let vite, React, renderToStaticMarkup, montar, duploDeFetch, definirContexto, OfertasProgramadas;

before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(AQUI, "..", "..", "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: ALIASES }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ montar, duploDeFetch } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/AppContext.jsx"));
  OfertasProgramadas = (await vite.ssrLoadModule("/src/pages/OfertasProgramadas.jsx")).default;
});
after(async () => { if (vite) await vite.close(); });

const A = "0xAbC1230000000000000000000000000000004567";
const EDICAO_PROG = { "PROG-7": { id: "PROG-7", tipo: "programado", status: "aberto", termino_em: "2026-12-31T00:00:00.000Z" } };
const ctx = (extra = {}) => ({
  isConnected: true, address: A, edicoes: EDICAO_PROG, user: { email: { address: "a@b.c" } },
  refetchSaldo: () => {}, saldoRsCentavos: 1234, saldoRsStatus: "ok", refetchSaldoRs: () => {},
  setModalidade: () => {}, privyWallet: null, authToken: "AUTHCTX-106f", userLabel: "Teste",
  ...extra,
});

const LEITURA = (extra = {}) => ({
  ok: true, pontos: 7, pontosCartao: 7, bonusPalpite: 0, pontosParaCartao: 50, podeResgatarCartao: false,
  historico: [{ data: "2026-10-04T10:00:00.000Z", tipo: "compra", pontos: 1, ref: "k1" }],
  palpites: [], ...extra,
});

function arvore(raiz) {
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
const texto = (n) => n == null || typeof n === "boolean" ? ""
  : (typeof n === "string" || typeof n === "number") ? String(n)
  : Array.isArray(n) ? n.map(texto).join("")
  : n.props ? texto(n.props.children) : "";
const semTags = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const tags = (h) => h;

/** Monta o ecrã com o fetch duplo JÁ instalado (o efeito de montagem corre dentro de `montar`). */
async function montarEcra(responder, contexto = ctx()) {
  definirContexto(contexto);
  const dup = duploDeFetch(responder ?? (() => ({ status: 200, json: LEITURA() })));
  const ctrl = montar(OfertasProgramadas, []);
  await ctrl.assentar();
  const nos = () => arvore(ctrl.resultado());
  return {
    ctrl, dup,
    html: () => renderToStaticMarkup(React.createElement(React.Fragment, null, ctrl.resultado())),
    texto: () => semTags(renderToStaticMarkup(React.createElement(React.Fragment, null, ctrl.resultado()))),
    nos,
    input: () => nos().find((n) => n.type === "input"),
    botao: (t) => nos().filter((n) => n.type === "button").find((b) => texto(b).includes(t)),
    clicar: async (t) => {
      const b = nos().filter((n) => n.type === "button").find((x) => texto(x).includes(t));
      assert.ok(b, `não encontrei «${t}»; botões: ${JSON.stringify(nos().filter((n) => n.type === "button").map(texto))}`);
      await b.props.onClick();
      await ctrl.assentar();
    },
  };
}

// ═══ CABEÇALHO / PROGRESSO ═══════════════════════════════════════════════════════════════════════
test("RENDER · o ecrã real substituiu o placeholder (título + subtítulo, sem «EM BREVE»)", async () => {
  const c = await montarEcra();
  try {
    const t = c.texto();
    assert.match(t, /Ofertas Programadas/);
    assert.match(t, /Programa de fidelidade — acumula pontos e troca pelo cartão da Família Quildo/);
    assert.doesNotMatch(t, /EM BREVE/, "o ecrã não pode mostrar «EM BREVE» — é o ecrã real");
  } finally { c.dup.restaurar(); }
});

test("RENDER · mostra os pontos ACTUAIS do titular («7 / 50 pontos» + barra de progresso)", async () => {
  const c = await montarEcra();
  try {
    assert.match(c.texto(), /7 \/ 50 pontos/);
    assert.match(tags(c.html()), /role="progressbar"[^>]*aria-valuenow="7"[^>]*aria-valuemax="50"/,
      "a barra de progresso não reflecte os pontos reais");
    assert.match(c.dup.chamadas[0].url, /\/\.netlify\/functions\/ler-pontos$/);
    assert.equal(c.dup.chamadas[0].headers.Authorization, "Bearer AUTHCTX-106f",
      "o `ler-pontos` tem de levar o authToken (user-session) do AppContext, não o lance-auth");
  } finally { c.dup.restaurar(); }
});

test("RENDER · o cartão da Família Quildo aparece (nome + descrição)", async () => {
  const c = await montarEcra();
  try {
    const t = c.texto();
    assert.match(t, /Cartão da Família Quildo/);
    assert.match(t, /Cartão colecionável físico/);
  } finally { c.dup.restaurar(); }
});

test("RENDER · o histórico mostra os movimentos do titular", async () => {
  const c = await montarEcra(() => ({ status: 200, json: LEITURA({ historico: [
    { data: "2026-10-04T10:00:00.000Z", tipo: "compra", pontos: 1, ref: "k1" },
    { data: "2026-10-05T10:00:00.000Z", tipo: "palpite", pontos: 2, ref: "palpite-certo:PROG-7" },
  ] }) }));
  try {
    const t = c.texto();
    assert.match(t, /Compra de Passe/);
    assert.match(t, /Bónus de palpite/);
    assert.match(t, /\+2/);
  } finally { c.dup.restaurar(); }
});

// ═══ RESGATE (visível a ≥50; lógica é do 106g) ══════════════════════════════════════════════════
test("RENDER · com 49 pontos NÃO há botão «Resgatar» (mostra a meta)", async () => {
  const c = await montarEcra(() => ({ status: 200, json: LEITURA({ pontos: 49, pontosCartao: 49 }) }));
  try {
    const t = c.texto();
    assert.doesNotMatch(t, /Resgatar cartão/, "o resgate não pode aparecer antes dos 50 pontos");
    assert.match(t, /Chega a 50 pontos para resgatar/);
  } finally { c.dup.restaurar(); }
});

test("RENDER · com 50 pontos o botão «Resgatar cartão» aparece ACTIVO (o 106g chegou)", async () => {
  // UTAC106g: a guarda original do 106f exigia `disabled` («o resgate só abre no UTAC106g»). O 106g
  // chegou ⇒ a INVARIANTE mudou: visível a ≥50 e OPERÁVEL (abre o balão de morada). Actualizada
  // mantendo o espírito da guarda (o resgate só aparece a quem tem os 50 pontos de CARTÃO).
  const c = await montarEcra(() => ({ status: 200, json: LEITURA({ pontos: 50, pontosCartao: 50, podeResgatarCartao: true }) }));
  try {
    assert.match(c.texto(), /Resgatar cartão/);
    const b = c.botao("Resgatar cartão");
    assert.notEqual(b.props.disabled, true, "com 50 pontos o resgate tem de estar activo (UTAC106g)");
    assert.equal(typeof b.props.onClick, "function", "o botão tem de abrir o balão de resgate");
  } finally { c.dup.restaurar(); }
});

test("R1 REGRESSÃO · 48 de COMPRA + 2 de bónus (total 50) NÃO mostra «Resgatar»", async () => {
  // Achado ⚠️ R1 do validador adversarial: o bónus do palpite entrava na soma que desbloqueia o
  // cartão (48+2=50). Decisão do operador (opção A): o cartão conta SÓ pontos de COMPRA.
  const c = await montarEcra(() => ({ status: 200, json: LEITURA({
    pontos: 50, pontosCartao: 48, bonusPalpite: 2, podeResgatarCartao: false,
  }) }));
  try {
    const t = c.texto();
    assert.match(t, /48 \/ 50 pontos/, "a barra tem de mostrar os pontos de CARTÃO (48), não o total (50)");
    assert.doesNotMatch(t, /50 \/ 50 pontos/, "o total não pode aparecer como progresso do cartão");
    assert.doesNotMatch(t, /Resgatar cartão/, "48 de compra NÃO desbloqueia o cartão");
    assert.match(t, /Bónus de palpite: \+2/, "o bónus tem de aparecer à parte, marcado como fora do cartão");
    assert.match(t, /não conta para o cartão/);
    assert.match(c.html(), /aria-valuenow="48"/, "o progressbar tem de reflectir os pontos de cartão");
  } finally { c.dup.restaurar(); }
});

test("R1 REGRESSÃO · a LARGURA da barra usa pontosCartao (não o TOTAL)", async () => {
  // Achado R-F do validador do R1v: o TEXTO «48 / 50» e o `aria-valuenow` estavam guardados, mas a
  // LARGURA (`style={{ width: `${progresso}%` }}`) podia reverter para o total e ficar verde — a barra
  // enchia a 100 % enquanto o texto dizia 48/50. Com 48 de cartão sobre 50, a largura TEM de ser 96 %.
  const c = await montarEcra(() => ({ status: 200, json: LEITURA({
    pontos: 50, pontosCartao: 48, bonusPalpite: 2, podeResgatarCartao: false,
  }) }));
  try {
    assert.match(c.html(), /role="progressbar"[\s\S]{0,400}?width:96%/,
      "a LARGURA da barra tem de reflectir os pontos de CARTÃO (96 %), não o total (100 %)");
  } finally { c.dup.restaurar(); }
});

// ═══ ESTADO VAZIO ═══════════════════════════════════════════════════════════════════════════════
test("RENDER · 0 pontos → estado vazio com caminho para a Carteira", async () => {
  const c = await montarEcra(() => ({ status: 200, json: LEITURA({ pontos: 0, pontosCartao: 0, historico: [] }) }));
  try {
    const t = c.texto();
    assert.match(t, /Ainda não tens pontos\. Compra o teu primeiro Passe na Carteira\./);
    assert.match(t, /Ir para a Carteira/);
    globalThis.__NAVEGADAS.length = 0;
    await c.clicar("Ir para a Carteira");
    assert.deepEqual(globalThis.__NAVEGADAS, ["/carteira"]);
  } finally { c.dup.restaurar(); }
});

// ═══ PALPITE (BÓNUS) ════════════════════════════════════════════════════════════════════════════
test("RENDER · com edição Programada a decorrer há campo + botão de palpite", async () => {
  const c = await montarEcra();
  try {
    assert.ok(c.input(), "faltou o campo do palpite");
    assert.equal(c.input().props.type, "number");
    assert.ok(c.botao("Palpitar"), "faltou o botão «Palpitar»");
    assert.match(c.texto(), /Palpite — bónus de \+2 pontos/);
  } finally { c.dup.restaurar(); }
});

test("RENDER · sem edição Programada → «Sem edição a decorrer» (sem campo)", async () => {
  const c = await montarEcra(undefined, ctx({ edicoes: { "R-1": { id: "R-1", tipo: "relampago", status: "aberto", termino_em: "2026-12-31T00:00:00.000Z" } } }));
  try {
    assert.match(c.texto(), /Sem edição a decorrer\. Volta quando houver\./);
    assert.equal(c.input(), undefined, "não pode haver campo de palpite sem edição");
  } finally { c.dup.restaurar(); }
});

test("RENDER · PALPITAR envia POST com Bearer e passa a «Já palpitou»", async () => {
  const c = await montarEcra((url) => url.includes("registar-palpite")
    ? { status: 201, json: { ok: true, idempotent: false, palpite: { edicaoId: "PROG-7", valor: 120 } } }
    : { status: 200, json: LEITURA() });
  try {
    c.input().props.onChange({ target: { value: "120" } });
    await c.ctrl.assentar();
    await c.clicar("Palpitar");

    const post = c.dup.chamadas.find((h) => h.url.includes("registar-palpite"));
    assert.ok(post, "não houve POST para registar-palpite");
    assert.equal(post.headers.Authorization, "Bearer AUTHCTX-106f");
    assert.match(c.texto(), /Já palpitou: 120 lances/);
    assert.match(c.texto(), /À espera do fecho da edição\./);
    assert.equal(c.input(), undefined, "depois de palpitar o campo desaparece (não se muda o palpite)");
  } finally { c.dup.restaurar(); }
});

test("RENDER · palpite JÁ apurado como mais próximo → «Acertou! +2 pontos»", async () => {
  const c = await montarEcra(() => ({ status: 200, json: LEITURA({
    palpites: [{ edicaoId: "PROG-7", valor: 118, apurado: true, resultado: "mais_proximo" }],
  }) }));
  try {
    const t = c.texto();
    assert.match(t, /Já palpitou: 118 lances/);
    assert.match(t, /Acertou! \+2 pontos/);
  } finally { c.dup.restaurar(); }
});

test("RENDER · palpite apurado como PERDEDOR → «Não acertou» (ninguém ganha sem acertar)", async () => {
  const c = await montarEcra(() => ({ status: 200, json: LEITURA({
    palpites: [{ edicaoId: "PROG-7", valor: 5, apurado: true, resultado: "perdeu" }],
  }) }));
  try {
    assert.match(c.texto(), /Não acertou/);
    assert.doesNotMatch(c.texto(), /Acertou/);
  } finally { c.dup.restaurar(); }
});

// ═══ INVARIANTE CRÍTICA ═════════════════════════════════════════════════════════════════════════
test("INVARIANTE · o cartão NUNCA depende do palpite (Google Play: jogo de habilidade)", async () => {
  // 50 pontos de COMPRA, com um palpite apurado como PERDEDOR: o resgate tem de continuar a
  // aparecer. Se o cartão dependesse do palpite, este teste cairia.
  const c = await montarEcra(() => ({ status: 200, json: LEITURA({
    pontos: 50, pontosCartao: 50, podeResgatarCartao: true,
    palpites: [{ edicaoId: "PROG-7", valor: 5, apurado: true, resultado: "perdeu" }],
  }) }));
  try {
    assert.match(c.texto(), /Resgatar cartão/, "o cartão é só por pontos de compra — o palpite é bónus");
  } finally { c.dup.restaurar(); }
});
