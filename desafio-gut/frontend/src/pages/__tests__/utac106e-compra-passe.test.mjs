// utac106e-compra-passe.test.mjs — UTAC106e · UI da compra do Passe Desafio.
//
// O que fica aqui:
//   HOOK  — `useComprarPasse`: chama `POST /comprar-passe-pontos` com Bearer, gera uma
//            `idempotencyKey` NOVA por clique e mapeia 200/201→ok, 401/402/400/5xx→erro;
//   RENDER — a Carteira: o botão abre o balão, o balão mostra o texto decidido, «Cancelar» fecha,
//            «Confirmar» COMPRA (toast verde em sucesso; toast vermelho + atalho PIX no 402) e o
//            balão mostra o SPINNER durante o loading.
//
// Instrumentos do PRÓPRIO repo (nenhum ficheiro de produção alterado):
//   · `_servidor-teste.mjs` + `_ponte-ssr.mjs` (instância única de React — regra A12);
//   · `_hook-runner.mjs` — condutor de hooks sem DOM + `duploDeFetch`, que substitui SÓ o `fetch`
//     global, deixando correr o `apiPost` REAL (`src/lib/api.js`) — é ele que monta o `Bearer` e o
//     `BASE`, por isso um erro no contrato do helper aparece aqui;
//   · duplo de AppContext (`pages/__tests__/_stubs/AppContext.jsx`) e `_stubs-106e/` (getAuthToken).
//
// ⚠️ LIMITE DECLARADO: o «clique» é exercido chamando o `onClick` do elemento React (árvore de
// elementos) — sem DOM, sem hit-testing, sem CSS. Prova-se «handler → estado → novo render».
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
  { find: /^\.\.\/components\/CreditoStatus\.jsx$/, replacement: `${STUBS_106C}/child.jsx` },
  { find: /^\.\.\/components\/PainelIndicacao\.jsx$/, replacement: `${STUBS_106C}/child.jsx` },
  { find: /^\.\.\/components\/BotaoLoginPrincipal\.jsx$/, replacement: `${STUBS_106C}/child.jsx` },
  { find: /^\.\.\/\.\.\/hooks\/useAdmin\.js$/, replacement: `${STUBS_106C}/useAdmin.js` },
  { find: /^react-router-dom$/, replacement: `${STUBS_106C}/rr.jsx` },
];

let vite, React, renderToStaticMarkup, montar, duploDeFetch, definirContexto, MinhaCarteira, ComprarPasseModal, useComprarPasse;

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
  ComprarPasseModal = (await vite.ssrLoadModule("/src/components/ComprarPasseModal.jsx")).default;
  ({ useComprarPasse } = await vite.ssrLoadModule("/src/hooks/useComprarPasse.js"));
});
after(async () => { if (vite) await vite.close(); });

const A = "0xAbC1230000000000000000000000000000004567";
const CONECTADO = {
  isConnected: true, abrirModal: () => {}, address: A, user: { email: { address: "a@b.c" } },
  refetchSaldo: () => {}, saldoRsCentavos: 1234, saldoRsStatus: "ok", refetchSaldoRs: () => {},
  setModalidade: () => {}, privyWallet: null, saldoSenhas: 7, saldoSenhasStatus: "ok",
  userLabel: "Teste", desconectar: () => {}, authToken: "AUTHCTX-106e",
};

/** Instala o duplo de fetch, corre o corpo e restaura. Devolve também os corpos enviados. */
async function comFetch(responder, corpo) {
  const corpos = [];
  const dup = duploDeFetch((url, opts) => { corpos.push(opts?.body ? JSON.parse(opts.body) : null); return responder(url, opts); });
  try { return { r: await corpo(dup), corpos, dup }; } finally { dup.restaurar(); }
}

// ═══ HOOK ═══════════════════════════════════════════════════════════════════════════
test("HOOK · chama POST /comprar-passe-pontos com Bearer e mapeia 201 → ok:true", async () => {
  definirContexto(CONECTADO);
  const { r, corpos, dup } = await comFetch(() => ({ status: 201, json: { ok: true, pontos: 1 } }), async () => {
    const c = montar(useComprarPasse, []);
    await c.assentar();
    return await c.resultado().comprar();
  });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.pontos, 1);
  assert.equal(dup.chamadas.length, 1);
  assert.match(dup.chamadas[0].url, /\/\.netlify\/functions\/comprar-passe-pontos$/);
  assert.equal(dup.chamadas[0].headers.Authorization, "Bearer AUTHCTX-106e");
  assert.match(corpos[0].idempotencyKey, /^[A-Za-z0-9._:-]{8,200}$/, "a chave não casa a regex do servidor");
});

test("HOOK · gera uma idempotencyKey DIFERENTE por chamada (o RETRY do mesmo pedido é que a reusa)", async () => {
  definirContexto(CONECTADO);
  const { corpos } = await comFetch(() => ({ status: 201, json: { ok: true, pontos: 1 } }), async () => {
    const c = montar(useComprarPasse, []);
    await c.assentar();
    await c.resultado().comprar();
    await c.assentar();
    await c.resultado().comprar();
  });
  assert.equal(corpos.length, 2);
  assert.notEqual(corpos[0].idempotencyKey, corpos[1].idempotencyKey,
    "duas CHAMADAS com a mesma chave seriam o MESMO pedido para o servidor (perder-se-ia a 2.ª compra)");
});

test("HOOK · corrida no MESMO tick: 2 comprar() sem await entre eles → SÓ 1 ida à rede (guarda `emCurso`)", async () => {
  definirContexto(CONECTADO);
  const { corpos, dup } = await comFetch(() => ({ status: 201, json: { ok: true, pontos: 1 } }), async () => {
    const c = montar(useComprarPasse, []);
    await c.assentar();
    // Achado ⚠️ R1 do validador: sem `await` entre as duas, o ESTADO `loading` ainda é o ANTIGO no
    // closure. Sem o `ref`, as duas passariam e dariam DOIS débitos. Com o `ref`, a 2.ª sai sem rede.
    const [r1, r2] = await Promise.all([c.resultado().comprar(), c.resultado().comprar()]);
    assert.equal(r1.ok, true);
    assert.equal(r2.ok, false);
    assert.equal(r2.code, "em_curso");
  });
  assert.equal(dup.chamadas.length, 1, `o 2.º comprar() do mesmo tick foi à rede: ${dup.chamadas.length} pedidos`);
  assert.equal(corpos.length, 1);
});

test("HOOK · 200 idempotente → ok:true", async () => {
  definirContexto(CONECTADO);
  const { r } = await comFetch(() => ({ status: 200, json: { ok: true, idempotent: true, pontos: 1 } }), async () => {
    const c = montar(useComprarPasse, []); await c.assentar();
    return await c.resultado().comprar();
  });
  assert.equal(r.ok, true); assert.equal(r.idempotent, true);
});

test("HOOK · 401 → «Sessão expirada»", async () => {
  definirContexto(CONECTADO);
  const { r } = await comFetch(() => ({ status: 401, json: { error: { code: "token_ausente" } } }), async () => {
    const c = montar(useComprarPasse, []); await c.assentar();
    return await c.resultado().comprar();
  });
  assert.equal(r.ok, false); assert.equal(r.status, 401); assert.equal(r.message, "Sessão expirada");
});

test("HOOK · 402 → «Saldo insuficiente»", async () => {
  definirContexto(CONECTADO);
  const { r } = await comFetch(() => ({ status: 402, json: { error: { code: "saldo_insuficiente" } } }), async () => {
    const c = montar(useComprarPasse, []); await c.assentar();
    return await c.resultado().comprar();
  });
  assert.equal(r.ok, false); assert.equal(r.status, 402); assert.equal(r.message, "Saldo insuficiente");
});

test("HOOK · 500 → «Erro do servidor»; 400 → «Pedido inválido»", async () => {
  definirContexto(CONECTADO);
  for (const [status, esperado] of [[500, "Erro do servidor"], [400, "Pedido inválido"]]) {
    const { r } = await comFetch(() => ({ status, json: { error: { code: "x" } } }), async () => {
      const c = montar(useComprarPasse, []); await c.assentar();
      return await c.resultado().comprar();
    });
    assert.equal(r.message, esperado, `status ${status}`);
  }
});

// ═══ RENDER ═════════════════════════════════════════════════════════════════════════
function arvore(raiz) {
  const fora = [];
  (function walk(n) {
    if (n == null || typeof n === "boolean") return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (typeof n !== "object") return;
    fora.push(n);
    // Desce para dentro do balão (componente PURO): os filhos nascem no corpo dele, não em props.children.
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
  : Array.isArray(n) ? n.map(texto).join("")
  : n.props ? texto(n.props.children) : "";
const semTags = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

async function montarCarteira(ctx = CONECTADO) {
  definirContexto(ctx);
  const ctrl = montar(MinhaCarteira, []);
  await ctrl.assentar();
  const html = () => renderToStaticMarkup(React.createElement(React.Fragment, null, ctrl.resultado()));
  const botoes = () => arvore(ctrl.resultado()).filter((n) => n.type === "button");
  const botaoCom = (t) => botoes().find((b) => texto(b).includes(t));
  const clicar = async (rotulo) => {
    const b = botaoCom(rotulo);
    assert.ok(b, `não encontrei «${rotulo}»; existem: ${JSON.stringify(botoes().map(texto))}`);
    await b.props.onClick();
    await ctrl.assentar();
  };
  return { ctrl, html, botoes, clicar };
}

test("RENDER · o botão «Comprar Passe Desafio R$ 2,00» existe na Carteira", async () => {
  const { botoes } = await montarCarteira();
  assert.ok(botoes().map(texto).some((t) => t.includes("Comprar Passe Desafio R$ 2,00")),
    `faltou o botão do Passe: ${JSON.stringify(botoes().map(texto))}`);
});

test("RENDER · CLICAR abre o balão com o TEXTO decidido (R$ 2,00 · 1 ponto · Continuar?)", async () => {
  const { html, clicar } = await montarCarteira();
  assert.ok(!html().includes("Continuar?"), "pré-condição: o balão devia estar fechado");
  await clicar("Comprar Passe Desafio R$ 2,00");
  const h = semTags(html());
  assert.match(h, /Comprar Passe Desafio/, "o balão não abriu");
  // ⚠️ O `semTags` troca cada tag por um ESPAÇO (as tags `<strong>` interiores deixam um espaço
  // antes do ponto final) — a regex é tolerante a isso de propósito.
  assert.match(h, /Vais comprar 1 Passe por R\$ 2,00\s*\.\s*Ganhas 1 ponto\s*\.\s*Continuar\?/, `texto do balão errado: «${h}»`);
  assert.match(html(), /aria-modal="true"/, "o balão não é um diálogo modal acessível");
});

test("RENDER · «Cancelar» FECHA o balão", async () => {
  const { html, clicar } = await montarCarteira();
  await clicar("Comprar Passe Desafio R$ 2,00");
  assert.ok(html().includes("Continuar?"), "pré-condição: o balão devia estar aberto");
  await clicar("Cancelar");
  assert.ok(!html().includes("Continuar?"), "«Cancelar» não fechou o balão");
});

test("RENDER · «Confirmar» COMPRA: fecha o balão e mostra o toast «1 ponto creditado»", async () => {
  const { html, clicar } = await montarCarteira();
  await clicar("Comprar Passe Desafio R$ 2,00");
  const { dup } = await comFetch(() => ({ status: 201, json: { ok: true, pontos: 1 } }), async () => {
    await clicar("Confirmar");
  });
  assert.equal(dup.chamadas.length, 1, "«Confirmar» não chamou o endpoint");
  const h = semTags(html());
  assert.ok(h.includes("1 ponto creditado"), `o toast de sucesso não apareceu: «${h}»`);
  assert.ok(!h.includes("Continuar?"), "o balão não fechou depois do sucesso");
});

test("RENDER · 402 → toast vermelho «Saldo insuficiente» + atalho «Carregar agora (PIX)»", async () => {
  const { html, botoes, clicar } = await montarCarteira();
  await clicar("Comprar Passe Desafio R$ 2,00");
  await comFetch(() => ({ status: 402, json: { error: { code: "saldo_insuficiente" } } }), async () => {
    await clicar("Confirmar");
  });
  const h = semTags(html());
  assert.ok(h.includes("Saldo insuficiente. Carregar agora?"), `faltou o toast de saldo: «${h}»`);
  assert.ok(botoes().some((b) => texto(b).includes("Carregar agora (PIX)")),
    "faltou o atalho de depósito PIX no 402");
  // ⚠️ INVARIANTE: no 402 o balão NÃO fecha (a compra falhou) — fica para nova tentativa.
  assert.ok(h.includes("Continuar?"), "o balão fechou num erro — devia manter-se aberto");
});

test("RENDER · durante o loading, «Confirmar» mostra o SPINNER e ambos os botões ficam desactivados", () => {
  const h = renderToStaticMarkup(React.createElement(ComprarPasseModal, {
    aberto: true, loading: true, pontos: 3, onConfirmar: () => {}, onCancelar: () => {},
  }));
  assert.match(h, /data-spinner="true"/, "faltou o spinner no botão «Confirmar»");
  assert.match(h, /A processar…/, "faltou o rótulo de loading");
  assert.match(h, /aria-busy="true"/, "o botão não anuncia o estado ocupado");
  const desactivados = (h.match(/disabled=""/g) || []).length;
  assert.equal(desactivados, 2, `os DOIS botões deviam estar desactivados; medidos ${desactivados}`);
});

test("RENDER · o balão mostra a progressão dos pontos, DECLARANDO que é o TOTAL (não o cartão)", () => {
  // UTAC106f-R1t: o número aqui é o TOTAL (vem de `comprar-passe-pontos`, coluna `pontos`). O ℹ️ do
  // validador do R1v apanhou a incoerência com a barra «48 / 50» do ecrã Ofertas; o rótulo passa a
  // dizer «(total)» e a lembrar que o cartão só conta as compras. O valor de CARTÃO não é acessível
  // aqui dentro do escopo (ver o cabeçalho do componente).
  const h = renderToStaticMarkup(React.createElement(ComprarPasseModal, {
    aberto: true, loading: false, pontos: 49, onConfirmar: () => {}, onCancelar: () => {},
  }));
  const t = semTags(h);
  assert.match(t, /Teus pontos \(total\): 49 → 50/, `a progressão (total) não apareceu: «${t}»`);
  assert.match(t, /o cartão conta só os pontos das compras/,
    "o rótulo tem de declarar que este número é o total — o cartão conta só as compras");
});
