// utac106e-compra-passe.test.mjs — UTAC106e · UI da compra do Passe Desafio.
//
// ⚠️ UTAC110d-front — CONTRATO ACTUALIZADO (declarado): o hook passou a `comprar(tipo)` e chama
// `comprar-passe-relampago` / `comprar-passe-programado` (o `comprar-passe-pontos` deprecated deixou
// de ser chamado pela UI — continua vivo no servidor); o balão passou a ESCOLHER entre os dois Passes
// (sem «Confirmar»). As invariantes do 106e mantêm-se: Bearer user-session, chave NOVA por clique,
// guarda de corrida do mesmo tick, erro visível (nunca silêncio), spinner + botões desactivados
// durante a compra, balão fecha em sucesso e fica aberto em erro.
//
// O que fica aqui:
//   HOOK  — `useComprarPasse`: chama o endpoint DO TIPO com Bearer, gera uma `idempotencyKey` NOVA
//            por clique e mapeia 200/201→ok, 401/402/400/502/503/5xx→erro com mensagem clara;
//   RENDER — a Carteira: o botão abre o balão com os dois Passes, «Cancelar» fecha, cada «Comprar
//            <Passe>» chama o SEU endpoint (toast + releitura dos saldos em sucesso; erro dentro do
//            balão + toast + atalho PIX no 402).
//
// Instrumentos do PRÓPRIO repo (nenhum ficheiro de produção alterado):
//   · `_servidor-teste.mjs` + `_ponte-ssr.mjs` (instância única de React — regra A12);
//   · `_hook-runner.mjs` — condutor de hooks sem DOM + `duploDeFetch`, que substitui SÓ o `fetch`
//     global, deixando correr o `apiPost`/`apiGet` REAIS (`src/lib/api.js`);
//   · duplo de AppContext (`pages/__tests__/_stubs/AppContext.jsx`) e `_stubs-106e/` (getAuthToken).
//
// ⚠️ LIMITE DECLARADO: o «clique» é exercido chamando o `onClick` do elemento React (árvore de
// elementos) — sem DOM, sem hit-testing, sem CSS. Prova-se «handler → estado → novo render».
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
const URL_RELAMPAGO = /\/\.netlify\/functions\/comprar-passe-relampago$/;
const URL_PROGRAMADO = /\/\.netlify\/functions\/comprar-passe-programado$/;
const ehCompra = (c) => /comprar-passe/.test(c.url);

test("HOOK · comprar('relampago') → POST /comprar-passe-relampago com Bearer; 201 → ok + pontos + crédito", async () => {
  definirContexto(CONECTADO);
  const { r, corpos, dup } = await comFetch(() => ({ status: 201, json: { ok: true, tipo: "relampago", pontosFidelidade: 10, creditosLance: 1 } }), async () => {
    const c = montar(useComprarPasse, []);
    await c.assentar();
    return await c.resultado().comprar("relampago");
  });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.tipo, "relampago");
  assert.equal(r.pontos, 10);
  assert.equal(r.creditosLance, 1);
  assert.equal(dup.chamadas.length, 1);
  assert.match(dup.chamadas[0].url, URL_RELAMPAGO);
  assert.equal(dup.chamadas[0].headers.Authorization, "Bearer AUTHCTX-106e");
  assert.match(corpos[0].idempotencyKey, /^[A-Za-z0-9._:-]{8,180}$/, "a chave não casa a regex do servidor (8–180)");
  assert.deepEqual(Object.keys(corpos[0]), ["idempotencyKey"], "o tipo NÃO vai no corpo (vem do endpoint)");
});

test("HOOK · comprar('programado') → POST /comprar-passe-programado (e NUNCA o endpoint do outro Passe)", async () => {
  definirContexto(CONECTADO);
  const { r, dup } = await comFetch(() => ({ status: 201, json: { ok: true, tipo: "programado", pontosFidelidade: 20 } }), async () => {
    const c = montar(useComprarPasse, []);
    await c.assentar();
    return await c.resultado().comprar("programado");
  });
  assert.equal(r.ok, true); assert.equal(r.tipo, "programado"); assert.equal(r.pontos, 20);
  assert.equal(r.creditosLance, null, "o Programado não traz créditos de lance");
  assert.equal(dup.chamadas.length, 1);
  assert.match(dup.chamadas[0].url, URL_PROGRAMADO);
  assert.doesNotMatch(dup.chamadas[0].url, /relampago|comprar-passe-pontos/);
});

test("HOOK · o endpoint deprecated `comprar-passe-pontos` já NÃO é chamado pela UI", () => {
  const fonte = readFileSync(resolve(AQUI, "..", "..", "hooks", "useComprarPasse.js"), "utf8")
    .replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(fonte, /comprar-passe-pontos/, "o hook ainda nomeia o endpoint de 1 ponto");
});

test("HOOK · tipo inválido (vazio, desconhecido, «constructor», número) → erro LOCAL, sem ida à rede", async () => {
  definirContexto(CONECTADO);
  const { dup, r } = await comFetch(() => ({ status: 201, json: { ok: true } }), async () => {
    const c = montar(useComprarPasse, []); await c.assentar();
    const out = [];
    for (const t of [undefined, "", "pontos", "constructor", "__proto__", 1, "RELAMPAGO"]) {
      out.push(await c.resultado().comprar(t));
    }
    return out;
  });
  for (const x of r) { assert.equal(x.ok, false); assert.equal(x.code, "tipo_invalido"); assert.ok(x.message); }
  assert.equal(dup.chamadas.length, 0, "um tipo inválido foi à rede");
});

test("HOOK · gera uma idempotencyKey DIFERENTE por chamada (o RETRY do mesmo pedido é que a reusa)", async () => {
  definirContexto(CONECTADO);
  const { corpos } = await comFetch(() => ({ status: 201, json: { ok: true, pontosFidelidade: 10 } }), async () => {
    const c = montar(useComprarPasse, []);
    await c.assentar();
    await c.resultado().comprar("relampago");
    await c.assentar();
    await c.resultado().comprar("relampago");
  });
  assert.equal(corpos.length, 2);
  assert.notEqual(corpos[0].idempotencyKey, corpos[1].idempotencyKey,
    "duas CHAMADAS com a mesma chave seriam o MESMO pedido para o servidor (perder-se-ia a 2.ª compra)");
});

test("HOOK · corrida no MESMO tick: 2 comprar() sem await entre eles → SÓ 1 ida à rede (guarda `emCurso`)", async () => {
  definirContexto(CONECTADO);
  const { corpos, dup } = await comFetch(() => ({ status: 201, json: { ok: true, pontosFidelidade: 10 } }), async () => {
    const c = montar(useComprarPasse, []);
    await c.assentar();
    const [r1, r2] = await Promise.all([c.resultado().comprar("relampago"), c.resultado().comprar("programado")]);
    assert.equal(r1.ok, true);
    assert.equal(r2.ok, false);
    assert.equal(r2.code, "em_curso");
  });
  assert.equal(dup.chamadas.length, 1, `o 2.º comprar() do mesmo tick foi à rede: ${dup.chamadas.length} pedidos`);
  assert.equal(corpos.length, 1);
});

test("HOOK · 200 idempotente → ok:true", async () => {
  definirContexto(CONECTADO);
  const { r } = await comFetch(() => ({ status: 200, json: { ok: true, idempotent: true, pontosFidelidade: 10 } }), async () => {
    const c = montar(useComprarPasse, []); await c.assentar();
    return await c.resultado().comprar("relampago");
  });
  assert.equal(r.ok, true); assert.equal(r.idempotent, true);
});

test("HOOK · cada erro tem mensagem CLARA (401/402/400/502/503/outro) — nunca em silêncio", async () => {
  definirContexto(CONECTADO);
  const casos = [
    [401, "Sessão expirada"], [402, "Saldo insuficiente"], [400, "Pedido inválido"],
    [502, "Não foi possível concluir a compra. Tente de novo."],
    [503, "Sistema em manutenção. Tente de novo em instantes."], [500, "Erro do servidor"],
  ];
  for (const [status, esperado] of casos) {
    const { r } = await comFetch(() => ({ status, json: { error: { code: "x" } } }), async () => {
      const c = montar(useComprarPasse, []); await c.assentar();
      return await c.resultado().comprar("relampago");
    });
    assert.equal(r.ok, false, `status ${status}`);
    assert.equal(r.status, status);
    assert.equal(r.message, esperado, `status ${status}`);
  }
});

test("HOOK · sem `authToken` (sessão por cunhar) → `sem_sessao`, sem ida à rede", async () => {
  definirContexto({ ...CONECTADO, authToken: null });
  const { r, dup } = await comFetch(() => ({ status: 201, json: { ok: true } }), async () => {
    const c = montar(useComprarPasse, []); await c.assentar();
    return await c.resultado().comprar("relampago");
  });
  assert.equal(r.code, "sem_sessao"); assert.equal(dup.chamadas.length, 0);
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
  return { ctrl, html, botoes, botaoCom, clicar };
}

// Responde ao `ler-pontos` (os dois saldos) e à compra, cada um pela sua URL.
const servidor = ({ compra, pontos = { pontos: 12, pontosCartao: 10, lance: { creditos: 1 } } }) => (url) =>
  /ler-pontos/.test(url) ? { status: 200, json: { ok: true, ...pontos } } : compra;

test("RENDER · o botão «Comprar Passe Desafio R$ 2,00» existe na Carteira", async () => {
  const { botoes } = await montarCarteira();
  assert.ok(botoes().map(texto).some((t) => t.includes("Comprar Passe Desafio R$ 2,00")),
    `faltou o botão do Passe: ${JSON.stringify(botoes().map(texto))}`);
});

test("RENDER · CLICAR abre o balão: «Escolha o seu Passe Desafio» + os DOIS Passes com preço e benefício", async () => {
  const { html, clicar } = await montarCarteira();
  assert.ok(!html().includes("Escolha o seu Passe Desafio"), "pré-condição: o balão devia estar fechado");
  await clicar("Comprar Passe Desafio R$ 2,00");
  const h = semTags(html());
  assert.match(h, /Escolha o seu Passe Desafio/, "o balão não abriu");
  assert.match(h, /⚡ Passe Relâmpago R\$ 2,00 10 pontos \+ 1 lance no Menor Lance Único Comprar Passe Relâmpago/,
    `cartão Relâmpago errado: «${h}»`);
  assert.match(h, /🎫 Passe Programado R\$ 2,00 10 pontos \+ 1 palpite nas Ofertas Programadas Comprar Passe Programado/,
    `cartão Programado errado: «${h}»`);
  assert.match(html(), /aria-modal="true"/, "o balão não é um diálogo modal acessível");
});

test("RENDER · «Cancelar» FECHA o balão", async () => {
  const { html, clicar } = await montarCarteira();
  await clicar("Comprar Passe Desafio R$ 2,00");
  assert.ok(html().includes("Escolha o seu Passe Desafio"), "pré-condição: o balão devia estar aberto");
  await clicar("Cancelar");
  assert.ok(!html().includes("Escolha o seu Passe Desafio"), "«Cancelar» não fechou o balão");
});

for (const [rotulo, url, toast] of [
  ["Comprar Passe Relâmpago", URL_RELAMPAGO, "Passe Relâmpago comprado: +10 pontos e 1 lance"],
  ["Comprar Passe Programado", URL_PROGRAMADO, "Passe Programado comprado: +10 pontos e 1 palpite"],
]) {
  test(`RENDER · «${rotulo}» chama o SEU endpoint, fecha o balão, mostra o toast e RELÊ os saldos`, async () => {
    const { html, clicar } = await montarCarteira();
    await clicar("Comprar Passe Desafio R$ 2,00");
    const { dup } = await comFetch(servidor({ compra: { status: 201, json: { ok: true, pontosFidelidade: 22 } } }), async () => {
      await clicar(rotulo);
    });
    const compras = dup.chamadas.filter(ehCompra);
    assert.equal(compras.length, 1, `«${rotulo}» devia fazer 1 compra; fez ${compras.length}`);
    assert.match(compras[0].url, url, `«${rotulo}» chamou o endpoint errado: ${compras[0].url}`);
    assert.ok(dup.chamadas.some((c) => /ler-pontos/.test(c.url)), "depois da compra os saldos NÃO foram relidos");
    const h = semTags(html());
    assert.ok(h.includes(toast), `faltou o toast de sucesso: «${h}»`);
    assert.ok(!h.includes("Escolha o seu Passe Desafio"), "o balão não fechou depois do sucesso");
  });
}

test("RENDER · 402 → erro DENTRO do balão + toast + atalho «Carregar agora (PIX)»; o balão FICA aberto", async () => {
  const { html, botoes, clicar } = await montarCarteira();
  await clicar("Comprar Passe Desafio R$ 2,00");
  await comFetch(servidor({ compra: { status: 402, json: { error: { code: "saldo_insuficiente" } } } }), async () => {
    await clicar("Comprar Passe Relâmpago");
  });
  const h = semTags(html());
  assert.ok(h.includes("Saldo insuficiente. Carregar agora?"), `faltou o toast de saldo: «${h}»`);
  assert.match(html(), /role="alert"[^>]*>⚠️ Saldo insuficiente\. Deposite via PIX/, "o erro não aparece DENTRO do balão");
  assert.ok(botoes().some((b) => texto(b).includes("Carregar agora (PIX)")), "faltou o atalho de depósito PIX no 402");
  assert.ok(h.includes("Escolha o seu Passe Desafio"), "o balão fechou num erro — devia manter-se aberto");
});

test("RENDER · 502 → mensagem CLARA no balão (não em silêncio) e o balão fica aberto", async () => {
  const { html, clicar } = await montarCarteira();
  await clicar("Comprar Passe Desafio R$ 2,00");
  await comFetch(servidor({ compra: { status: 502, json: { error: { code: "creditar_credito_lance_falhou" } } } }), async () => {
    await clicar("Comprar Passe Relâmpago");
  });
  assert.match(html(), /role="alert"[^>]*>⚠️ Não foi possível concluir a compra\. Tente de novo\./,
    "o 502 não mostrou mensagem clara dentro do balão");
  assert.ok(semTags(html()).includes("Escolha o seu Passe Desafio"), "o balão fechou num erro");
});

test("RENDER · durante a compra: SPINNER no Passe escolhido e TODOS os botões desactivados", () => {
  const h = renderToStaticMarkup(React.createElement(ComprarPasseModal, {
    aberto: true, emCurso: "programado", onComprar: () => {}, onCancelar: () => {},
  }));
  assert.match(h, /data-spinner="true"/, "faltou o spinner");
  assert.match(h, /Processando…/, "faltou o rótulo de loading");
  assert.equal((h.match(/aria-busy="true"/g) || []).length, 1, "só o Passe escolhido anuncia o estado ocupado");
  assert.match(h, /data-passe="programado"[\s\S]*aria-busy="true"/, "o spinner está no Passe errado");
  const desactivados = (h.match(/disabled=""/g) || []).length;
  assert.equal(desactivados, 3, `os 2 «Comprar» + «Cancelar» deviam estar desactivados; medidos ${desactivados}`);
});

test("RENDER · o balão mostra os pontos de CARTÃO «X / 50» (o mesmo número da barra das Ofertas)", () => {
  const t = semTags(renderToStaticMarkup(React.createElement(ComprarPasseModal, {
    aberto: true, pontosCartao: 48, onComprar: () => {}, onCancelar: () => {},
  })));
  assert.match(t, /Seus pontos de cartão: 48 \/ 50/, `faltou «48 / 50»: «${t}»`);
  // ilegível → não se mostra número nenhum (não se inventa 0)
  for (const v of [null, -1, 2.5, "48", NaN]) {
    const t2 = semTags(renderToStaticMarkup(React.createElement(ComprarPasseModal, {
      aberto: true, pontosCartao: v, onComprar: () => {}, onCancelar: () => {},
    })));
    assert.doesNotMatch(t2, /Seus pontos de cartão/, `com pontosCartao=${String(v)} mostrou um número`);
  }
});

test("RENDER · alvos de toque: os botões do balão têm ≥ 48 px", () => {
  const h = renderToStaticMarkup(React.createElement(ComprarPasseModal, {
    aberto: true, onComprar: () => {}, onCancelar: () => {},
  }));
  const botoesHtml = h.match(/<button[^>]*>/g) || [];
  assert.equal(botoesHtml.length, 3);
  for (const b of botoesHtml) assert.match(b, /min-height:48px/, `botão sem 48 px: ${b}`);
});
