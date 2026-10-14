// utac106g-resgate.test.mjs — UTAC106g · RESGATE do cartão colecionável.
//
// ⚠️ UTAC110g.1 (R18-110g.1-2 / decisão D-110g-4) — **MUDOU DE ECRÃ**. Este ficheiro montava o
// `OfertasProgramadas`; o botão passou a viver na **CARTEIRA** (`MinhaCarteira.jsx`). O que ele
// MEDE é exactamente o mesmo fluxo do UTAC106g — só mudou a montagem e o endereço. As asserções
// NÃO foram enfraquecidas: continuam a exigir botão ACTIVO a ≥50 pontos de CARTÃO, o clique a abrir
// o balão, o `POST /resgatar-cartao` com o `Bearer` da sessão, o fecho em sucesso e o 402 a manter o
// balão aberto. O lado complementar (o botão JÁ NÃO existe nas Ofertas) está no
// `utac106f-ofertas.test.mjs`, e os 4 estados do botão no `utac110g1-carteira-resgate.test.mjs`.
//
// Instrumentos do repo (nenhum ficheiro de produção alterado): `_servidor-teste.mjs` + `_hook-runner`
// (`montar` + `duploDeFetch`, que substitui SÓ o `fetch` e deixa correr o `apiGet`/`apiPost` REAIS) +
// duplo de AppContext + duplos dos modais laterais da Carteira (os mesmos do utac110f-front-missoes).
//
// ⚠️ LIMITES DECLARADOS (sem DOM real): (a) o «clique» é o `onClick` do elemento React — sem CSS nem
// hit-testing; (b) o conteúdo do `ResgatarCartaoModal` vive dentro do `Modal` do design system e NÃO é
// alcançável pela árvore de elementos ⇒ o balão é accionado pelos seus PROPS (como faz o teste do
// 106e), e os campos são verificados no markup SSR; (c) a validação LOCAL do formulário (o clique em
// «Confirmar resgate» dentro do balão) é coberta pela REGRA (`erroDoEndereco`) no último teste.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "../../__tests__/_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(AQUI, "..", "..");
const STUBS_106C = resolve(AQUI, "..", "..", "__tests__", "_stubs-106c");
const STUBS_106E = resolve(AQUI, "_stubs-106e");
const STUB_CONTEXTO = resolve(AQUI, "_stubs", "AppContext.jsx");

const ALIASES = [
  { find: /^\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
  { find: /^\.\.\/\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
  { find: /^\.\/useTrocarPorSenhas\.js$/, replacement: `${STUBS_106E}/useTrocarPorSenhas.js` },
  { find: /^\.\.\/hooks\/useTrocarPorSenhas\.js$/, replacement: `${STUBS_106E}/useTrocarPorSenhas.js` },
  // Modais/painéis laterais da Carteira: duplos do repo (a Carteira não é o alvo destes testes).
  { find: /^\.\.\/components\/ComprarFichasModal\.jsx$/, replacement: `${STUBS_106C}/child.jsx` },
  { find: /^\.\.\/components\/PainelIndicacao\.jsx$/, replacement: `${STUBS_106C}/child.jsx` },
  { find: /^\.\.\/components\/BotaoLoginPrincipal\.jsx$/, replacement: `${STUBS_106C}/child.jsx` },
  { find: /^react-router-dom$/, replacement: `${STUBS_106C}/rr.jsx` },
];

let vite, React, renderToStaticMarkup, montar, duploDeFetch, definirContexto, MinhaCarteira, erroDoEndereco, ENDERECO_VAZIO;

before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(AQUI, "..", "..", "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: ALIASES }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ montar, duploDeFetch } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/AppContext.jsx"));
  ({ erroDoEndereco, ENDERECO_VAZIO } = await vite.ssrLoadModule("/src/lib/pedidos.js"));
  MinhaCarteira = (await vite.ssrLoadModule("/src/pages/MinhaCarteira.jsx")).default;
});
after(async () => { if (vite) await vite.close(); });

const A = "0xAbC1230000000000000000000000000000004567";
const AUTH = "AUTHCTX-106g";
const ctx = (extra = {}) => ({
  isConnected: true, abrirModal: () => {}, address: A, edicoes: {},
  user: { email: { address: "a@b.c" } },
  refetchSaldo: () => {}, saldoRsCentavos: 1234, saldoRsStatus: "ok", refetchSaldoRs: () => {},
  setModalidade: () => {}, privyWallet: null, authToken: AUTH, userLabel: "Teste",
  saldoSenhas: 0, saldoSenhasStatus: "ok", desconectar: () => {},
  ...extra,
});

// `ler-pontos`: por omissão, 50 pontos de CARTÃO ⇒ o servidor diz que se pode resgatar.
const LEITURA = (extra = {}) => ({
  ok: true, pontos: 50, pontosCartao: 50, bonusPalpite: 0, pontosParaCartao: 50, podeResgatarCartao: true,
  historico: [{ data: "2026-10-04T10:00:00.000Z", tipo: "compra", pontos: 1, ref: "k1" }],
  palpites: [], ...extra,
});
const ECO = { status: 200, json: { ok: true, saldo: 5, historico: [], centavosPorEcoQuildo: 100 } };

const MORADA = {
  nome: "Maria Quildo", cpf: "11144477735", cep: "69027010", logradouro: "Rua das Flores",
  numero: "42", complemento: "", bairro: "Centro", cidade: "Manaus", uf: "AM", telefone: "",
};

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

const ALVO_PONTOS = /\/\.netlify\/functions\/ler-pontos$/;
const ALVO_ECO = /\/\.netlify\/functions\/ler-eco-quildo$/;

async function montarEcra(responder, contexto = ctx()) {
  definirContexto(contexto);
  const dup = duploDeFetch(responder ?? ((url) => (ALVO_PONTOS.test(url) ? { status: 200, json: LEITURA() } : ALVO_ECO.test(url) ? ECO : { status: 404, json: {} })));
  const ctrl = montar(MinhaCarteira, []);
  await ctrl.assentar();
  const nos = () => arvore(ctrl.resultado());
  return {
    ctrl, dup,
    html: () => renderToStaticMarkup(React.createElement(React.Fragment, null, ctrl.resultado())),
    texto: () => semTags(renderToStaticMarkup(React.createElement(React.Fragment, null, ctrl.resultado()))),
    nos,
    botao: (t) => nos().filter((n) => n.type === "button").find((b) => texto(b).includes(t)),
    balao: () => nos().find((n) => n.type?.name === "ResgatarCartaoModal"),
    clicar: async (t) => {
      const b = nos().filter((n) => n.type === "button").find((x) => texto(x).includes(t));
      assert.ok(b, `não encontrei «${t}»; botões: ${JSON.stringify(nos().filter((n) => n.type === "button").map(texto))}`);
      await b.props.onClick();
      await ctrl.assentar();
      return b;
    },
  };
}

const respond = (pontos, resgate) => (url) => {
  if (ALVO_PONTOS.test(url)) return { status: 200, json: LEITURA(typeof pontos === "function" ? pontos() : pontos) };
  if (ALVO_ECO.test(url)) return ECO;
  if (url.includes("resgatar-cartao")) return resgate;
  return { status: 404, json: {} };
};

// ═══ BOTÃO (agora na CARTEIRA) ═══════════════════════════════════════════════════════════════════
test("RENDER · na Carteira, com 50 pontos de CARTÃO o botão «Resgatar cartão» está ACTIVO", async () => {
  const c = await montarEcra(respond(null, { status: 201, json: {} }));
  try {
    const b = c.botao("Resgatar cartão");
    assert.ok(b, "faltou o botão de resgate na Carteira");
    assert.notEqual(b.props.disabled, true, "com 50 pontos o botão tem de estar ACTIVO (UTAC106g)");
    assert.equal(typeof b.props.onClick, "function", "o botão tem de abrir o balão");
    // o botão é o do resgate (âncora estável) e diz o que é, por extenso
    assert.equal(b.props["data-acao"], "resgatar-cartao");
    assert.match(c.texto(), /Resgatar cartão colecionável/);
  } finally { c.dup.restaurar(); }
});

test("RENDER · na Carteira, com 49 pontos o botão NÃO existe (nem desactivado)", async () => {
  const c = await montarEcra(respond({ pontos: 49, pontosCartao: 49, podeResgatarCartao: false }, { status: 201, json: {} }));
  try {
    const t = c.texto();
    assert.doesNotMatch(t, /Resgatar cartão/, "não pode haver resgate antes dos 50 pontos de cartão");
    assert.doesNotMatch(c.html(), /data-acao="resgatar-cartao"/);
    // e a barra continua a dizer em que ponto está (a informação não se perdeu com o botão)
    assert.match(t, /49 \/ 50/);
    assert.match(c.html(), /aria-valuenow="49"/);
  } finally { c.dup.restaurar(); }
});

// ═══ BALÃO ═══════════════════════════════════════════════════════════════════════════════════════
test("CLIQUE · «Resgatar cartão» abre o balão com o formulário de morada", async () => {
  const c = await montarEcra(respond(null, { status: 201, json: {} }));
  try {
    assert.equal(c.balao().props.aberto, false, "o balão não pode estar aberto à partida");
    await c.clicar("Resgatar cartão");
    const b = c.balao();
    assert.equal(b.props.aberto, true, "o botão tem de abrir o balão");
    const t = c.texto();
    assert.match(t, /Resgatar cartão colecionável/);
    // ⚠️ achado do validador adversarial do SEG3 (2026-10-14): aqui havia uma TRI-ALTERNAÇÃO em que
    // a 1.ª hipótese (`Com a Família Quildo`) não casava nada — uma guarda que passava por acidente.
    // O texto REAL do balão (medido em `ResgatarCartaoModal.jsx:57-59`) é asserido por inteiro.
    assert.match(t, /Você vai trocar 50 pontos pelo cartão da Família Quildo\./);
    assert.match(t, /Confirme os dados de entrega\./);
    const h = c.html();
    for (const id of ["rg-nome", "rg-cpf", "rg-cep", "rg-cidade", "rg-uf", "rg-logradouro", "rg-numero", "rg-bairro"]) {
      assert.match(h, new RegExp(`id="${id}"`), `faltou o campo ${id} no formulário`);
    }
  } finally { c.dup.restaurar(); }
});

test("CLIQUE · a confirmação do balão faz POST /resgatar-cartao com Bearer e fecha o balão", async () => {
  const c = await montarEcra(respond(null, { status: 201, json: { ok: true, idempotent: false, resgateId: 7, status: "pendente", pontos: 0 } }));
  try {
    await c.clicar("Resgatar cartão");
    await c.balao().props.onConfirmar(MORADA);
    await c.ctrl.assentar();

    const post = c.dup.chamadas.find((h) => h.url.includes("resgatar-cartao"));
    assert.ok(post, "não houve POST para resgatar-cartao");
    // ⚠️ UTAC106j-fix: o token vem do `authToken` (user-session) do AppContext — valor DISTINTO do
    // duplo de `getAuthToken` (`_stubs-106e`), para este teste MORDER se o hook voltar à Via A.
    assert.equal(post.headers.Authorization, `Bearer ${AUTH}`);
    assert.match(post.url, /\/\.netlify\/functions\/resgatar-cartao$/);
    assert.equal(c.balao().props.aberto, false, "em sucesso o balão fecha");
    assert.match(c.texto(), /Pedido de resgate criado/);
  } finally { c.dup.restaurar(); }
});

test("CLIQUE · 402 do servidor mostra a mensagem e mantém o balão aberto", async () => {
  const c = await montarEcra(respond(null, { status: 402, json: { ok: false, error: { code: "pontos_insuficientes", message: "x" } } }));
  try {
    await c.clicar("Resgatar cartão");
    await c.balao().props.onConfirmar(MORADA);
    await c.ctrl.assentar();
    assert.match(c.texto(), /Você precisa de 50 pontos de fidelidade para resgatar o cartão/);
    assert.equal(c.balao().props.aberto, true, "no erro o balão NÃO fecha");
  } finally { c.dup.restaurar(); }
});

// ═══ REGRA DE MORADA (a que o balão aplica antes de chamar o servidor) ══════════════════════════
test("FORMULÁRIO · a regra recusa a morada incompleta e aceita a completa", () => {
  assert.equal(erroDoEndereco(ENDERECO_VAZIO), "Informe o nome de quem vai receber.");
  assert.equal(erroDoEndereco({ ...MORADA, cep: "123" }), "O CEP tem 8 dígitos.");
  assert.equal(erroDoEndereco({ ...MORADA, uf: "ZZ" }), "Escolha o estado (UF).");
  assert.equal(erroDoEndereco(MORADA), null, "a morada completa tem de passar");
});
