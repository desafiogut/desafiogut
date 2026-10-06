// utac106g-resgate.test.mjs — UTAC106g · RESGATE do cartão no ecrã «Ofertas Programadas».
//
// Cobre: o botão «Resgatar cartão» fica ACTIVO a ≥50 pontos de CARTÃO; clicar abre o balão (com os
// campos de morada); a confirmação do BALÃO faz `POST /resgatar-cartao` com `Bearer`, fecha o balão e
// avisa; o 402 mostra a mensagem e mantém o balão aberto; a regra de morada recusada localmente.
//
// Instrumentos do repo (nenhum ficheiro de produção alterado): `_servidor-teste.mjs` + `_hook-runner`
// (`montar` + `duploDeFetch`, que substitui SÓ o `fetch` e deixa correr o `apiGet`/`apiPost` REAIS) +
// duplo de AppContext + duplo de `useTrocarPorSenhas` (o mesmo dos 106e/106f) + duplo do router.
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
const STUBS_106C = resolve(AQUI, "..", "..", "__tests__", "_stubs-106c");
const STUBS_106E = resolve(AQUI, "..", "__tests__", "_stubs-106e");
const STUB_CONTEXTO = resolve(AQUI, "_stubs", "AppContext.jsx");

const ALIASES = [
  { find: /^\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
  { find: /^\.\.\/\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
  { find: /^\.\/useTrocarPorSenhas\.js$/, replacement: `${STUBS_106E}/useTrocarPorSenhas.js` },
  { find: /^\.\.\/hooks\/useTrocarPorSenhas\.js$/, replacement: `${STUBS_106E}/useTrocarPorSenhas.js` },
  { find: /^react-router-dom$/, replacement: `${STUBS_106C}/rr.jsx` },
];

let vite, React, renderToStaticMarkup, montar, duploDeFetch, definirContexto, OfertasProgramadas, erroDoEndereco, ENDERECO_VAZIO;

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
  OfertasProgramadas = (await vite.ssrLoadModule("/src/pages/OfertasProgramadas.jsx")).default;
});
after(async () => { if (vite) await vite.close(); });

const A = "0xAbC1230000000000000000000000000000004567";
const EDICAO_PROG = { "PROG-7": { id: "PROG-7", tipo: "programado", status: "aberto", termino_em: "2026-12-31T00:00:00.000Z" } };
const ctx = (extra = {}) => ({
  isConnected: true, address: A, edicoes: EDICAO_PROG, user: { email: { address: "a@b.c" } },
  refetchSaldo: () => {}, saldoRsCentavos: 1234, saldoRsStatus: "ok", refetchSaldoRs: () => {},
  setModalidade: () => {}, privyWallet: null, authToken: "AUTHCTX-106g", userLabel: "Teste",
  ...extra,
});

const LEITURA = (extra = {}) => ({
  ok: true, pontos: 50, pontosCartao: 50, bonusPalpite: 0, pontosParaCartao: 50, podeResgatarCartao: true,
  historico: [{ data: "2026-10-04T10:00:00.000Z", tipo: "compra", pontos: 1, ref: "k1" }],
  palpites: [], ...extra,
});

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

const responderResgate = (resposta) => (url) => url.includes("resgatar-cartao")
  ? resposta
  : { status: 200, json: LEITURA() };

// ═══ BOTÃO ═══════════════════════════════════════════════════════════════════════════════════════
test("RENDER · com 50 pontos de CARTÃO o botão «Resgatar cartão» está ACTIVO", async () => {
  const c = await montarEcra();
  try {
    const b = c.botao("Resgatar cartão");
    assert.ok(b, "faltou o botão de resgate");
    assert.notEqual(b.props.disabled, true, "com 50 pontos o botão tem de estar ACTIVO (UTAC106g)");
    assert.equal(typeof b.props.onClick, "function", "o botão tem de abrir o balão");
  } finally { c.dup.restaurar(); }
});

test("RENDER · com 49 pontos NÃO há botão activo (mostra a meta)", async () => {
  const c = await montarEcra(() => ({ status: 200, json: LEITURA({ pontos: 49, pontosCartao: 49, podeResgatarCartao: false }) }));
  try {
    const t = c.texto();
    assert.doesNotMatch(t, /Resgatar cartão/, "não pode haver resgate antes dos 50 pontos de cartão");
    assert.match(t, /Chegue a 50 pontos para resgatar/);
  } finally { c.dup.restaurar(); }
});

// ═══ BALÃO ═══════════════════════════════════════════════════════════════════════════════════════
test("CLIQUE · «Resgatar cartão» abre o balão com o formulário de morada", async () => {
  const c = await montarEcra();
  try {
    assert.equal(c.balao().props.aberto, false, "o balão não pode estar aberto à partida");
    await c.clicar("Resgatar cartão");
    const b = c.balao();
    assert.equal(b.props.aberto, true, "o botão tem de abrir o balão");
    const t = c.texto();
    assert.match(t, /Resgatar cartão colecionável/);
    assert.match(t, /Você vai trocar 50 pontos pelo cartão da Família Quildo/);
    const h = c.html();
    for (const id of ["rg-nome", "rg-cpf", "rg-cep", "rg-cidade", "rg-uf", "rg-logradouro", "rg-numero", "rg-bairro"]) {
      assert.match(h, new RegExp(`id="${id}"`), `faltou o campo ${id} no formulário`);
    }
  } finally { c.dup.restaurar(); }
});

test("CLIQUE · a confirmação do balão faz POST /resgatar-cartao com Bearer e fecha o balão", async () => {
  const c = await montarEcra(responderResgate({ status: 201, json: { ok: true, idempotent: false, resgateId: 7, status: "pendente", pontos: 0 } }));
  try {
    await c.clicar("Resgatar cartão");
    await c.balao().props.onConfirmar(MORADA);
    await c.ctrl.assentar();

    const post = c.dup.chamadas.find((h) => h.url.includes("resgatar-cartao"));
    assert.ok(post, "não houve POST para resgatar-cartao");
    // ⚠️ UTAC106j-fix: o token vem do `authToken` (user-session) do AppContext — valor DISTINTO do
    // duplo de `getAuthToken` (`_stubs-106e`), para este teste MORDER se o hook voltar à Via A.
    assert.equal(post.headers.Authorization, "Bearer AUTHCTX-106g");
    assert.match(post.url, /\/\.netlify\/functions\/resgatar-cartao$/);
    assert.equal(c.balao().props.aberto, false, "em sucesso o balão fecha");
    assert.match(c.texto(), /Pedido de resgate criado/);
  } finally { c.dup.restaurar(); }
});

test("CLIQUE · 402 do servidor mostra a mensagem e mantém o balão aberto", async () => {
  const c = await montarEcra(responderResgate({ status: 402, json: { ok: false, error: { code: "pontos_insuficientes", message: "x" } } }));
  try {
    await c.clicar("Resgatar cartão");
    await c.balao().props.onConfirmar(MORADA);
    await c.ctrl.assentar();
    assert.match(c.texto(), /Você precisa de 50 pontos de compra para resgatar o cartão/);
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
