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
  // UTAC109f (⚠️1 do validador) — o EM_BREVE_MODE real é `true`; o duplo do 108d deixa provar a P1 (edição ATIVA).
  { find: /^\.\.\/lib\/leilaoLock\.js$/, replacement: resolve(AQUI, "_stubs", "leilaoLock.js") },
];

let vite, React, renderToStaticMarkup, montar, duploDeFetch, definirContexto, OfertasProgramadas, definirEmBreve;

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
  ({ definirEmBreve } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/leilaoLock.js"));
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
    // UTAC107e.1 — subtítulo do mockup (pt-BR), agora dentro de vidro.
    assert.match(t, /Junte 50 pontos e troque pelo cartão da Família Quildo/);
    // UTAC107e.1 — os CARTÕES das edições mostram o estado da fonte única (`getEstadoEdicao`, que com
    // `EM_BREVE_MODE` diz «EM BREVE», como no Início). A invariante é o ECRÃ: fora dos cartões, nada
    // de placeholder «EM BREVE».
    const semCartoes = c.html().replace(/<div data-testid="op-edicao-item"[\s\S]*?<\/article><\/div>/g, "");
    assert.doesNotMatch(semCartoes.replace(/<[^>]+>/g, " "), /EM BREVE/, "o ecrã não pode ser o placeholder «EM BREVE»");
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
    assert.match(t, /Chegue a 50 pontos para resgatar/);
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
    assert.match(t, /Você ainda não tem pontos\. Compre o seu primeiro Passe na Carteira\./);
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
    assert.ok(c.botao("Dar palpite"), "faltou o botão «Dar palpite»");
    // UTAC107e.1 — o palpite vive DENTRO do cartão da edição (a secção «Palpite» separada saiu).
    assert.match(c.texto(), /Seu palpite \(nº de lances\)/);
    assert.match(c.texto(), /SEM PALPITE/);
  } finally { c.dup.restaurar(); }
});

test("RENDER · sem edição Programada → cartão VAZIO com o palpite desligado (108e.1; UTAC109e: formulário do cartão)", async () => {
  const c = await montarEcra(undefined, ctx({ edicoes: { "R-1": { id: "R-1", tipo: "relampago", status: "aberto", termino_em: "2026-12-31T00:00:00.000Z" } } }));
  try {
    // UTAC109e — o formulário desligado passou a viver DENTRO do `CartaoEdicao` (`acao="palpite"`), o mesmo do
    // MLC; já não é filho da página ⇒ mede-se no HTML renderizado. O que tem de continuar impossível é palpitar.
    const h = c.html();
    assert.match(h, /data-testid="cartao-edicao"[^>]*data-vazio="true"[^>]*data-acao="palpite"/, "o cartão vazio não declara a acção «palpite»");
    assert.match(h, /data-testid="palpite-desativado"/, "o cartão vazio perdeu o formulário (desligado) do palpite");
    assert.match(h, /<input[^>]*id="palpite-sem-edicao"[^>]*type="number"[^>]*disabled=""/, "sem edição o campo do palpite tem de estar DESLIGADO (e numérico)");
    assert.match(h, /<button[^>]*disabled=""[^>]*>Dar palpite<\/button>/, "sem edição o botão «Dar palpite» tem de estar DESLIGADO");
    assert.match(h, /<label[^>]*for="palpite-sem-edicao"[^>]*>Seu palpite \(nº de lances\)<\/label>/, "rótulo do palpite perdido");
    assert.doesNotMatch(h, /em centavos/, "o palpite é um nº de lances, não R$");
    // nenhum botão de palpite ACTIVO (com acção) quando não há edição
    assert.equal(c.nos().filter((n) => n.type === "button" && texto(n).includes("Dar palpite")).length, 0, "sem edição apareceu um botão de palpite com acção");
    // UTAC109f (P2) — a OP recuperou a sua frase do vazio (saíra no 109e), agora vinda do `CartaoEdicao` por acção.
    assert.match(c.texto(), /Sem edições programadas no momento\./, "o cartão vazio não diz que não há edições programadas");
  } finally { c.dup.restaurar(); }
});

test("RENDER · PALPITAR envia POST com Bearer e passa a «Já palpitou»", async () => {
  let corpoPost = "";
  const c = await montarEcra((url, opts) => {
    if (url.includes("registar-palpite")) {
      corpoPost = String(opts?.body ?? "");
      return { status: 201, json: { ok: true, idempotent: false, palpite: { edicaoId: "PROG-7", valor: 120 } } };
    }
    return { status: 200, json: LEITURA() };
  });
  try {
    c.input().props.onChange({ target: { value: "120" } });
    await c.ctrl.assentar();
    await c.clicar("Dar palpite");

    const post = c.dup.chamadas.find((h) => h.url.includes("registar-palpite"));
    assert.ok(post, "não houve POST para registar-palpite");
    assert.equal(post.headers.Authorization, "Bearer AUTHCTX-106f");
    assert.match(corpoPost, /"edicaoId":"PROG-7"/, "o palpite tem de ir para a edição do CARTÃO");
    assert.match(c.texto(), /Seu palpite: 120 lances/);
    assert.match(c.texto(), /Resultado no fim da edição\./);
    assert.equal(c.input(), undefined, "depois de palpitar o campo desaparece (não se muda o palpite)");
  } finally { c.dup.restaurar(); }
});

test("RENDER · palpite JÁ apurado como mais próximo → «Acertou! +2 pontos»", async () => {
  const c = await montarEcra(() => ({ status: 200, json: LEITURA({
    palpites: [{ edicaoId: "PROG-7", valor: 118, apurado: true, resultado: "mais_proximo" }],
  }) }));
  try {
    const t = c.texto();
    // UTAC107e.1 — copy do mockup: o backend premeia o MAIS PRÓXIMO, não o exacto («Acertou» seria falso).
    assert.match(t, /\+2 pontos! Seu palpite de 118 lances foi o mais próximo\./);
    assert.match(t, /MAIS PRÓXIMO/);
  } finally { c.dup.restaurar(); }
});

test("RENDER · palpite apurado como PERDEDOR → «Não acertou» (ninguém ganha sem acertar)", async () => {
  const c = await montarEcra(() => ({ status: 200, json: LEITURA({
    palpites: [{ edicaoId: "PROG-7", valor: 5, apurado: true, resultado: "perdeu" }],
  }) }));
  try {
    assert.match(c.texto(), /Outro palpite ficou mais perto\./);
    assert.match(c.texto(), /NÃO FOI DESSA VEZ/);
    assert.doesNotMatch(c.texto(), /mais próximo\./, "o perdedor não pode ver a mensagem do vencedor");
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

// ═══ UTAC107e.1 — OP: carrossel de edições com o palpite DENTRO do cartão + tabela no fim ═══════
const DUAS = {
  "PROG-7": { id: "PROG-7", tipo: "programado", status: "aberto", produto: "Air Fryer", termino_em: "2026-12-31T00:00:00.000Z" },
  "PROG-8": { id: "PROG-8", tipo: "programado", status: "aberto", produto: "Fones", termino_em: "2026-12-31T00:00:00.000Z" },
};

test("UTAC107e.1 · carrossel lateral: 1 cartão por edição Programada, snap ao início", async () => {
  const c = await montarEcra(undefined, ctx({ edicoes: DUAS }));
  try {
    const h = c.html();
    const m = h.match(/data-testid="op-edicoes-scroll"[^>]*style="([^"]*)"/);
    assert.ok(m, "o contentor do carrossel não existe");
    for (const re of [/display:flex/, /overflow-x:auto/, /scroll-snap-type:x mandatory/]) assert.match(m[1], re);
    assert.equal((h.match(/data-testid="op-edicao-item"/g) || []).length, 2, "esperava 2 cartões");
    assert.match(h, /data-testid="op-edicao-item" style="[^"]*flex:0 0 100%[^"]*scroll-snap-align:start/);
  } finally { c.dup.restaurar(); }
});

test("UTAC107e.1 · o palpite está DENTRO do cartão e a secção «Palpite» separada saiu", async () => {
  const c = await montarEcra();
  try {
    const h = c.html();
    const i = h.indexOf('data-testid="op-edicao-item"');
    const fim = h.indexOf("</article>", i);
    assert.ok(i > 0 && fim > i, "cartão não encontrado");
    assert.match(h.slice(i, fim), /id="palpite-PROG-7"/, "o campo do palpite não está dentro do cartão");
    assert.match(h.slice(i, fim), /<label for="palpite-PROG-7"/, "o campo não tem rótulo ligado");
    assert.doesNotMatch(c.texto(), /Palpite — bónus de \+2 pontos/, "a secção «Palpite» separada voltou");
    assert.doesNotMatch(h, /aria-label="Palpite"/, "a secção «Palpite» separada voltou");
  } finally { c.dup.restaurar(); }
});

test("UTAC107e.1 · palpitar no 2.º cartão regista na edição DESSE cartão", async () => {
  let corpo = "";
  const c = await montarEcra((url, opts) => {
    if (url.includes("registar-palpite")) { corpo = String(opts?.body ?? ""); return { status: 201, json: { ok: true, palpite: { edicaoId: "PROG-8", valor: 7 } } }; }
    return { status: 200, json: LEITURA() };
  }, ctx({ edicoes: DUAS }));
  try {
    const inputs = c.nos().filter((n) => n.type === "input");
    assert.equal(inputs.length, 2);
    const segundo = inputs.find((n) => n.props.id === "palpite-PROG-8");
    segundo.props.onChange({ target: { value: "7" } });
    await c.ctrl.assentar();
    const botoes = c.nos().filter((n) => n.type === "button" && texto(n).includes("Dar palpite"));
    await botoes[1].props.onClick();
    await c.ctrl.assentar();
    assert.match(corpo, /"edicaoId":"PROG-8"/);
    assert.match(corpo, /"valor":7/);
    const h = c.html();
    assert.match(h, /data-estado-palpite="com_palpite"[\s\S]*?Seu palpite: 7 lances/, "o 2.º cartão não passou a «com palpite»");
    assert.equal(c.nos().filter((n) => n.type === "input").length, 1, "o 1.º cartão devia continuar com o campo");
  } finally { c.dup.restaurar(); }
});

test("UTAC107e.1 · os 5 estados do palpite (função pura)", async () => {
  // UTAC108h.3 — `estadoPalpite` mudou de casa (o Início passou a usar a MESMA regra):
    // vive em `src/lib/palpite.js`, e é de lá que se carrega.
    const { estadoPalpite } = await vite.ssrLoadModule("/src/lib/palpite.js");
  const ab = { status: "aberto" }, enc = { status: "encerrado" };
  assert.equal(estadoPalpite(ab, null), "sem_palpite");
  assert.equal(estadoPalpite(ab, { valor: 1 }), "com_palpite");
  assert.equal(estadoPalpite(enc, { valor: 1, apurado: true, resultado: "mais_proximo" }), "mais_proximo");
  assert.equal(estadoPalpite(enc, { valor: 1, apurado: true, resultado: "perdeu" }), "perdeu");
  assert.equal(estadoPalpite(enc, null), "encerrada");
  assert.equal(estadoPalpite({ status: "apurado" }, null), "encerrada", "só `aberto` aceita palpite (é o que o backend exige)");
});

test("UTAC107e.1 · edição encerrada sem palpite: «Edição encerrada», sem campo", async () => {
  const c = await montarEcra(undefined, ctx({ edicoes: { "PROG-9": { id: "PROG-9", tipo: "programado", status: "encerrado" } } }));
  try {
    assert.match(c.texto(), /Edição encerrada · sem palpite nesta edição\./);
    assert.match(c.texto(), /ENCERRADA/);
    assert.equal(c.input(), undefined);
  } finally { c.dup.restaurar(); }
});

test("UTAC107e.1 · tabela «Palpites — Edição <id>» é o ÚLTIMO bloco, vidro padrão, 3 colunas, vazia", async () => {
  const c = await montarEcra();
  try {
    const h = c.html();
    const i = h.indexOf('data-testid="op-tabela-fim"');
    assert.ok(i > 0, "a tabela não existe");
    const resto = h.slice(i);
    assert.doesNotMatch(resto.slice(resto.indexOf("</section>")), /<section|<header|<article/, "há blocos depois da tabela");
    assert.match(h.slice(h.lastIndexOf("<section", i), i + 300), /class="gut-glass-standard"/, "a tabela não usa o vidro padrão");
    assert.match(c.texto(), /Palpites — Edição PROG-7/);
    const ths = [...resto.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]);
    assert.deepEqual(ths, ["#", "Participante", "Palpite"]);
    assert.match(c.texto(), /Ainda não há palpites\./);
  } finally { c.dup.restaurar(); }
});

test("UTAC107e.1 · Regra 1: cabeçalho e link das Regras DENTRO de vidro; link com 48 px", async () => {
  const c = await montarEcra();
  try {
    const h = c.html();
    assert.match(h, /<header class="gut-glass-standard[^"]*"[^>]*>[\s\S]*?Ofertas Programadas/, "o título não está em vidro");
    const iLink = h.indexOf('href="/regras-oficiais"');
    const antes = h.slice(0, iLink);
    assert.ok(antes.lastIndexOf("gut-glass-standard") > antes.lastIndexOf("</div>"), "o link das Regras está fora de vidro");
    // O duplo do `Link` (`_stubs-106c/rr.jsx`) descarta o `style` — a altura prova-se pela FONTE.
    const { readFileSync } = await import("node:fs");
    const fonte = readFileSync(resolve(AQUI, "..", "OfertasProgramadas.jsx"), "utf8");
    assert.match(fonte, /<Link to="\/regras-oficiais" style=\{\{[^}]*minHeight: "48px"/, "o link das Regras não tem 48 px");
  } finally { c.dup.restaurar(); }
});

test("UTAC107e.1 (validador) · edição AGENDADA: «ABRE EM BREVE», sem campo e sem dizer «encerrada»", async () => {
  // UTAC108h.3 — `estadoPalpite` mudou de casa (o Início passou a usar a MESMA regra):
    // vive em `src/lib/palpite.js`, e é de lá que se carrega.
    const { estadoPalpite } = await vite.ssrLoadModule("/src/lib/palpite.js");
  assert.equal(estadoPalpite({ status: "agendado" }, null), "abre_em_breve");
  const c = await montarEcra(undefined, ctx({ edicoes: { "PROG-5": { id: "PROG-5", tipo: "programado", status: "agendado" } } }));
  try {
    assert.match(c.texto(), /ABRE EM BREVE/);
    assert.match(c.texto(), /Os palpites abrem quando a edição abrir\./);
    assert.doesNotMatch(c.texto(), /Edição encerrada|ENCERRADA/);
    assert.equal(c.input(), undefined);
  } finally { c.dup.restaurar(); }
});

test("UTAC107e.1 (validador) · o erro do palpite aparece SÓ no cartão que falhou", async () => {
  const c = await montarEcra((url) => url.includes("registar-palpite")
    ? { status: 409, json: { code: "sem_passe" } }
    : { status: 200, json: LEITURA() }, ctx({ edicoes: DUAS }));
  try {
    const segundo = c.nos().find((n) => n.type === "input" && n.props.id === "palpite-PROG-8");
    segundo.props.onChange({ target: { value: "3" } });
    await c.ctrl.assentar();
    await c.nos().filter((n) => n.type === "button" && texto(n).includes("Dar palpite"))[1].props.onClick();
    await c.ctrl.assentar();
    const alertas = c.nos().filter((n) => n.props?.role === "alert");
    assert.equal(alertas.length, 1, `esperava 1 alerta, vi ${alertas.length}`);
    const h = c.html();
    const i8 = h.indexOf('aria-label="Edição PROG-8"');
    assert.ok(h.indexOf('role="alert"') > i8, "o alerta não está no cartão PROG-8");
  } finally { c.dup.restaurar(); }
});

// ═══ UTAC108e.1 — OP variante A: o MESMO cartão de edição do MLC; tabela sempre presente ═══════
test("UTAC108e.1 · cada edição usa o CartaoEdicao partilhado (arte real + GUTO + tempo) com o palpite dentro", async () => {
  const c = await montarEcra(undefined, ctx({ edicoes: { "PROG-7": { ...EDICAO_PROG["PROG-7"], produto: "Air Fryer", imagem_url: "/artes/edicao-especial-airfryer.jpg" } } }));
  try {
    const h = c.html();
    const i = h.indexOf('data-testid="op-edicao-item"');
    assert.ok(i > 0, "o item do carrossel desapareceu");
    const item = h.slice(i, h.indexOf("</article>", i));
    // UTAC109e — o formato Relâmpago é o padrão: a arte na largura toda, sem o GUTO ao lado do tempo (o GUTO
    // só existe no cartão VAZIO); a única diferença para o MLC é a acção.
    assert.match(item, /data-testid="cartao-edicao"[^>]*data-vazio="false"[^>]*data-acao="palpite"/, "não é o cartão partilhado com a acção «palpite»");
    assert.match(item, /<img[^>]*data-testid="cartao-arte"[^>]*src="\/artes\/edicao-especial-airfryer\.jpg"[^>]*style="[^"]*width:100%/, "falta a arte real na largura toda");
    assert.doesNotMatch(item, /guto-bemvindo\.png|guto-animado-7/, "com edição o GUTO não pode estar no cartão (a arte toma o lugar)");
    assert.match(item, /data-estado-palpite="sem_palpite"/, "o estado do palpite deixou de chegar ao cartão");
    assert.match(item, /id="palpite-PROG-7"/, "o palpite não está dentro do cartão partilhado");
  } finally { c.dup.restaurar(); }
});

test("UTAC108e.1 · Regra 2: sem edição a tabela «Palpites» continua no fim (vazia), como a do MLC", async () => {
  const c = await montarEcra(undefined, ctx({ edicoes: {} }));
  try {
    const h = c.html();
    const i = h.indexOf('data-testid="op-tabela-fim"');
    assert.ok(i > 0, "sem edição a tabela desapareceu");
    assert.match(h.slice(i), /class="gut-glass-standard"/);
    assert.match(semTags(h.slice(i)), /Palpites/);
    assert.ok(i > h.indexOf('data-testid="cartao-edicao"'), "a tabela tem de vir depois do cartão (último vidro)");
  } finally { c.dup.restaurar(); }
});

// T2/T3 do validador do UTAC108e.1 — visibilidade do cartão vazio e Regra 1 (vidro) na OP.
function pilhaVidro(html, i) {
  const pilha = [];
  for (const m of html.slice(0, i).matchAll(/<(\/?)([a-zA-Z0-9]+)([^>]*?)(\/?)>/g)) {
    const [, fecha, tag, attrs, auto] = m;
    if (auto || /^(img|input|br|hr|meta|link|source|path|circle|rect)$/i.test(tag)) continue;
    if (fecha) { const k = pilha.map((p) => p.tag).lastIndexOf(tag); if (k >= 0) pilha.length = k; }
    else pilha.push({ tag, attrs });
  }
  return pilha;
}

test("UTAC108e.1 · T2: o cartão vazio da OP está VISÍVEL (nem ele nem os pais escondidos)", async () => {
  const c = await montarEcra(undefined, ctx({ edicoes: {} }));
  try {
    const h = c.html();
    const i = h.indexOf("Sem edições programadas no momento.<"); // UTAC109f (P2)
    assert.ok(i > 0, "o cartão vazio não diz que não há edição");
    for (const { tag, attrs } of pilhaVidro(h, i)) {
      assert.doesNotMatch(attrs, /\shidden(=|\s|$)|display:\s*none|visibility:\s*hidden|opacity:\s*0(?![.\d])/, `<${tag}> escondido`);
    }
  } finally { c.dup.restaurar(); }
});

test("UTAC108e.1 · T3: Regra 1 na OP — nenhum texto fora de vidro (excepto botões)", async () => {
  for (const edicoes of [{}, EDICAO_PROG]) {
    const c = await montarEcra(undefined, ctx({ edicoes }));
    try {
      const h = c.html().replace(/<style>[\s\S]*?<\/style>/g, "");
      const fora = [];
      for (const m of h.matchAll(/>([^<>]*[A-Za-zÀ-ú0-9🔒][^<>]*)</g)) {
        const t = m[1].trim(); if (!t) continue;
        const i = m.index + 1;
        const antes = h.slice(0, i);
        const emBotao = antes.lastIndexOf("<button") > antes.lastIndexOf("</button>");
        if (!emBotao && !pilhaVidro(h, i).some((p) => /gut-glass-standard/.test(p.attrs))) fora.push(t);
      }
      assert.deepEqual(fora, [], `textos fora de vidro: ${JSON.stringify(fora)}`);
    } finally { c.dup.restaurar(); }
  }
});

// UTAC109f (P1, ⚠️1 do validador) — na ABA OP a faixa de uma Programada ATIVA diz «palpite já!», nunca
// «lance já!»; com EM BREVE continua «EM BREVE» (bidireccional). A aba não foi tocada: a correcção é da fonte.
test("UTAC109f · P1 na aba OP: Programada ativa → «palpite já!»; EM BREVE → «EM BREVE»", async () => {
  definirEmBreve(false);
  try {
    const c = await montarEcra();
    try {
      assert.match(c.texto(), /Em andamento — palpite já!/, "a faixa da OP não diz «palpite já!»");
      assert.doesNotMatch(c.texto(), /lance já!/, "a OP voltou a dizer «lance já!»");
    } finally { c.dup.restaurar(); }
  } finally { definirEmBreve(true); }
  const c2 = await montarEcra();
  try {
    assert.doesNotMatch(c2.texto(), /palpite já!/, "com EM BREVE não há «palpite já!»");
    assert.match(c2.texto(), /EM BREVE/);
  } finally { c2.dup.restaurar(); }
});
