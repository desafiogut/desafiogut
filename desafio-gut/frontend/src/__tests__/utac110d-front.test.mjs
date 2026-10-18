// utac110d-front.test.mjs — UTAC110d-front · DOIS PASSES: UI de compra + créditos visíveis.
//
// O que se prova aqui (o balão e o hook de compra vivem em `pages/__tests__/utac106e-compra-passe`):
//   A — `lib/passes.js` (puro): os dois Passes, leitura SEM coerção, estado do botão do lance
//       (BIDIRECCIONAL: com créditos → activo; sem/ilegível/a carregar/erro → desligado);
//   B — `usePontos` lê `lance.creditos` do `ler-pontos` (hook real + fetch duplo);
//   C — a Carteira mostra os DOIS saldos separados (pontos de CARTÃO «X / 50» + barra; créditos);
//   D — o CardLance REAL (Relâmpago): botão activo só com créditos, mensagem clara sem eles, e
//       depois de um lance os créditos relêem-se (X → X−1 no ecrã);
//   E — a OP usa o MESMO número de cartão (`pontosCartao`) e o botão continua «Dar palpite».
//
// Instrumentos do repo: `_servidor-teste.mjs` + `_ponte-ssr.mjs` (A12), `_hook-runner.mjs`
// (`montar` + `duploDeFetch` — o `apiGet`/`apiPost` REAIS correm), duplo do AppContext.
// Duplos NOVOS (só teste): `_stubs-110d/privy.js` (1 carteira que assina) e `_stubs-110d/web3.js`.
// ⚠️ LIMITE DECLARADO: sem DOM — o clique/escrita chamam o handler do elemento React.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "./_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(AQUI, "..");
const STUBS_106C = resolve(AQUI, "_stubs-106c");
const STUBS_110D = resolve(AQUI, "_stubs-110d");
const STUBS_PAG = resolve(SRC, "pages", "__tests__", "_stubs");
const STUBS_106E = resolve(SRC, "pages", "__tests__", "_stubs-106e");

const ALIASES = [
  { find: /^\.\.\/context\/AppContext\.jsx$/, replacement: `${STUBS_PAG}/AppContext.jsx` },
  { find: /^\.\.\/\.\.\/context\/AppContext\.jsx$/, replacement: `${STUBS_PAG}/AppContext.jsx` },
  { find: /^\.\/useTrocarPorSenhas\.js$/, replacement: `${STUBS_110D}/useTrocarPorSenhas.js` },
  { find: /^\.\.\/hooks\/useTrocarPorSenhas\.js$/, replacement: `${STUBS_110D}/useTrocarPorSenhas.js` },
  { find: /^\.\.\/hooks\/useRecursosApp\.js$/, replacement: `${STUBS_PAG}/useRecursosApp.js` },
  { find: /^@privy-io\/react-auth$/, replacement: `${STUBS_110D}/privy.js` },
  { find: /^\.\.\/utils\/web3\.js$/, replacement: `${STUBS_110D}/web3.js` },
  { find: /^\.\.\/components\/ComprarFichasModal\.jsx$/, replacement: `${STUBS_106C}/child.jsx` },
  { find: /^\.\.\/components\/PainelIndicacao\.jsx$/, replacement: `${STUBS_106C}/child.jsx` },
  { find: /^\.\.\/components\/BotaoLoginPrincipal\.jsx$/, replacement: `${STUBS_106C}/child.jsx` },
  { find: /^\.\.\/\.\.\/hooks\/useAdmin\.js$/, replacement: `${STUBS_106C}/useAdmin.js` },
  { find: /^react-router-dom$/, replacement: `${STUBS_106C}/rr.jsx` },
];

let vite, React, renderToStaticMarkup, montar, duploDeFetch, definirContexto;
let passes, usePontos, MinhaCarteira, CardLance;

before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(SRC, "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: ALIASES }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ montar, duploDeFetch } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/AppContext.jsx"));
  passes = await vite.ssrLoadModule("/src/lib/passes.js");
  ({ usePontos } = await vite.ssrLoadModule("/src/hooks/usePontos.js"));
  MinhaCarteira = (await vite.ssrLoadModule("/src/pages/MinhaCarteira.jsx")).default;
  CardLance = (await vite.ssrLoadModule("/src/components/CardLance.jsx")).default;
});
after(async () => { if (vite) await vite.close(); });

let nEndereco = 0;
/** Endereço NOVO por teste: o rate limiter do lance é por endereço e em memória (cooldown 3 s). */
const novoEndereco = () => `0x${String(++nEndereco).padStart(40, "a")}`;
const contexto = (address) => ({
  isConnected: true, abrirModal: () => {}, address, user: { email: { address: "a@b.c" } },
  refetchSaldo: () => {}, saldoRsCentavos: 1234, saldoRsStatus: "ok", refetchSaldoRs: () => {},
  saldoSenhas: 0, saldoSenhasStatus: "ok", userLabel: "Teste", authToken: "AUTH-110D",
});
const LER_PONTOS = /\/\.netlify\/functions\/ler-pontos$/;
const semTags = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

// ═══ A — lib/passes.js ═══════════════════════════════════════════════════════════════
test("A · os dois Passes: endpoint, nome e benefício certos; tipo só por chave PRÓPRIA (sem coerção)", () => {
  const { passeDoTipo, TIPOS_PASSE, PRECO_PASSE, PONTOS_FIDELIDADE_POR_PASSE } = passes;
  assert.equal(PRECO_PASSE, "R$ 2,00");
  assert.equal(PONTOS_FIDELIDADE_POR_PASSE, 10);
  assert.equal(passeDoTipo("relampago").endpoint, "comprar-passe-relampago");
  assert.equal(passeDoTipo("programado").endpoint, "comprar-passe-programado");
  // ⚠️ UTAC110j.5 — ALTERADO (declarado): o lance gasta PONTOS de lance pelo seu valor (backend UTAC110n).
  // Antes: assert.match(passeDoTipo("relampago").beneficio, /10 pontos \+ 1 lance/);
  assert.match(passeDoTipo("relampago").beneficio, /10 pontos de fidelidade \+ 200 pontos de lance/);
  assert.doesNotMatch(passeDoTipo("relampago").beneficio, /1 lance/);
  assert.match(passeDoTipo("programado").beneficio, /10 pontos \+ 1 palpite/);
  for (const t of ["", "pontos", "constructor", "__proto__", "toString", 1, null, undefined, "Relampago"]) {
    assert.equal(passeDoTipo(t), null, `tipo ${String(t)} escolheu um Passe`);
  }
  assert.ok(Object.isFrozen(TIPOS_PASSE) && Object.isFrozen(TIPOS_PASSE.relampago));
});

test("A · créditos lidos SEM coerção: só inteiro seguro ≥ 0; o resto → 0", () => {
  const { creditosDaResposta } = passes;
  assert.equal(creditosDaResposta({ lance: { creditos: 3 } }), 3);
  assert.equal(creditosDaResposta({ lance: { creditos: 0 } }), 0);
  for (const v of ["3", 2.5, -1, NaN, Infinity, null, true, {}]) {
    assert.equal(creditosDaResposta({ lance: { creditos: v } }), 0, `creditos=${String(v)} não deu 0`);
  }
  for (const d of [null, undefined, {}, { lance: null }, { pontos: 7 }]) assert.equal(creditosDaResposta(d), 0);
});

test("A · BIDIRECCIONAL — estado do botão do lance: ≥ 1 crédito → activo; tudo o resto → desligado + motivo", () => {
  const { estadoCreditosLance } = passes;
  for (const n of [1, 2, 99]) {
    const e = estadoCreditosLance({ isConnected: true, creditos: n, loading: false, erro: "" });
    assert.equal(e.podeLancar, true, `com ${n} créditos o botão devia estar activo`);
  }
  const sem = estadoCreditosLance({ isConnected: true, creditos: 0, loading: false, erro: "" });
  assert.equal(sem.podeLancar, false);
  assert.match(sem.mensagem, /Adquira um Passe Relâmpago/);
  for (const v of ["3", 1.5, -1, null, undefined]) {
    assert.equal(estadoCreditosLance({ isConnected: true, creditos: v }).podeLancar, false, `creditos=${String(v)} abriu o lance`);
  }
  const carregando = estadoCreditosLance({ isConnected: true, creditos: 5, loading: true });
  assert.equal(carregando.podeLancar, false); assert.match(carregando.mensagem, /Carregando/);
  const erro = estadoCreditosLance({ isConnected: true, creditos: 5, loading: false, erro: "x" });
  assert.equal(erro.podeLancar, false); assert.match(erro.mensagem, /Não foi possível ler/);
  assert.equal(estadoCreditosLance({ isConnected: false, creditos: 5 }).podeLancar, false);
});

// ═══ B — usePontos lê `lance.creditos` ═══════════════════════════════════════════════
test("B · usePontos expõe `creditosLance` do `ler-pontos` (e 0 quando o bloco `lance` falta)", async () => {
  for (const [corpo, esperado] of [
    [{ ok: true, pontos: 12, pontosCartao: 10, lance: { creditos: 4, pontos: 0 } }, 4],
    [{ ok: true, pontos: 12, pontosCartao: 10 }, 0],
    [{ ok: true, pontos: 12, pontosCartao: 10, lance: { creditos: "4" } }, 0],
  ]) {
    definirContexto(contexto(novoEndereco()));
    const dup = duploDeFetch(() => ({ status: 200, json: corpo }));
    try {
      const c = montar(usePontos, []);
      await c.assentar();
      assert.equal(c.resultado().creditosLance, esperado, JSON.stringify(corpo));
      assert.equal(c.resultado().pontosCartao, 10);
      assert.ok(dup.chamadas.some((x) => LER_PONTOS.test(x.url)));
    } finally { dup.restaurar(); }
  }
});

// ═══ C — Carteira com os dois saldos ════════════════════════════════════════════════
async function carteiraCom(corpo) {
  definirContexto(contexto(novoEndereco()));
  const dup = duploDeFetch((url) => (LER_PONTOS.test(url) ? { status: 200, json: corpo } : { status: 404, json: {} }));
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

test("C · a Carteira mostra os DOIS saldos: pontos de CARTÃO «X / 50» (não o total) e créditos de lance", async () => {
  // `pontos` (total, com bónus) ≠ `pontosCartao` (só compras): um ecrã ligado ao campo errado mostra 37.
  const h = await carteiraCom({ ok: true, pontos: 37, pontosCartao: 30, pontosParaCartao: 50, lance: { creditos: 3, pontos: 120, historico: [] } });
  const fid = semTags(bloco(h, "fidelidade"));
  assert.match(fid, /Pontos de fidelidade 30 \/ 50/, `pontos de cartão errados: «${fid}»`);
  assert.doesNotMatch(fid, /37/, "a Carteira mostrou o TOTAL (com bónus) — o cartão conta só as compras");
  assert.match(bloco(h, "fidelidade"), /data-barra-cartao="" style="width:60%/, "a barra não está a 60 % (30/50)");
  assert.match(bloco(h, "fidelidade"), /role="progressbar"[^>]*aria-valuenow="30"/, "a barra não anuncia o valor");
  // ⚠️ UTAC110j.5 — ALTERADO (declarado): o lance gasta PONTOS de lance pelo seu valor (backend UTAC110n).
  // Antes: bloco "creditos" → /Créditos de lance 3 disponíveis/ (com `lance: { creditos: 3 }`).
  const cr = semTags(bloco(h, "pontos-lance"));
  assert.match(cr, /Pontos de lance 120 /, `pontos de lance errados: «${cr}»`);
  assert.doesNotMatch(h, /Créditos de lance/, "a Carteira voltou a falar em créditos de lance");
  // Regra 1: os dois saldos vivem DENTRO do vidro do saldo (o 1.º GlassCard).
  const vidro = h.indexOf("gut-glass-standard");
  assert.ok(vidro >= 0 && vidro < h.indexOf("data-saldos-passe"), "os saldos estão fora do vidro");
});

test("C · BIDIRECCIONAL da barra: 0 pontos → 0 %; ≥ 50 → 100 % (nunca passa do fim); pontos de lance 0 e ilegível", async () => {
  // ⚠️ UTAC110j.5 — ALTERADO (declarado): o lance gasta PONTOS de lance pelo seu valor (backend UTAC110n).
  // Antes: «1 crédito → singular» (Créditos de lance 1 disponível / 0 disponíveis).
  const h0 = await carteiraCom({ ok: true, pontos: 0, pontosCartao: 0, lance: { creditos: 1, pontos: 0, historico: [] } });
  assert.match(bloco(h0, "fidelidade"), /width:0%/);
  assert.match(semTags(bloco(h0, "pontos-lance")), /Pontos de lance 0 /);
  const h60 = await carteiraCom({ ok: true, pontos: 60, pontosCartao: 60, lance: { creditos: 0 } });
  assert.match(semTags(bloco(h60, "fidelidade")), /60 \/ 50/);
  assert.match(bloco(h60, "fidelidade"), /width:100%/, "a barra passou de 100 %");
  // Bloco `lance` ilegível (sem `pontos`/`historico`) → «—», nunca um 0 inventado.
  assert.match(semTags(bloco(h60, "pontos-lance")), /Pontos de lance — /);
});

test("C · erro de leitura → «—» e aviso vermelho (não se inventa 0)", async () => {
  definirContexto(contexto(novoEndereco()));
  const dup = duploDeFetch(() => ({ status: 500, json: {} }));
  let h;
  try {
    const c = montar(MinhaCarteira, []); await c.assentar();
    h = renderToStaticMarkup(React.createElement(React.Fragment, null, c.resultado()));
  } finally { dup.restaurar(); }
  assert.match(semTags(bloco(h, "fidelidade")), /— \/ 50/);
  // ⚠️ UTAC110j.5 — ALTERADO (declarado): o lance gasta PONTOS de lance pelo seu valor (backend UTAC110n).
  // Antes: /Créditos de lance —/ e «⚠️ Não foi possível ler seus pontos e créditos agora.»
  assert.match(semTags(bloco(h, "pontos-lance")), /Pontos de lance —/);
  assert.match(h, /color:#ef4444[^>]*>⚠️ Não foi possível ler seus pontos agora\./);
});

// ═══ D — CardLance REAL (Relâmpago) ════════════════════════════════════════════════
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
const textoDe = (n) => n == null || typeof n === "boolean" ? ""
  : (typeof n === "string" || typeof n === "number") ? String(n)
  : Array.isArray(n) ? n.map(textoDe).join("") : n.props ? textoDe(n.props.children) : "";

/** Monta o CardLance real com um servidor duplo. `estado.pontos` é o ledger de PONTOS de lance do servidor.
 *  ⚠️ UTAC110j.5 — ALTERADO (declarado): o lance gasta PONTOS de lance pelo seu valor (backend UTAC110n).
 *  Antes: `estado.creditos`, 1 crédito por lance, 400 `sem_creditos_lance`. Agora espelha `lance-relampago.mjs`:
 *  debita o VALOR, 400 `saldo_pontos_insuficiente` com `pontosLance`/`pontosNecessarios`, 201 com
 *  `pontosLanceConsumidos`/`pontosLanceRestantes`. */
async function cardLance({ pontos, modalidade = "flash", lerFalha = false, ctx = {} }) {
  const address = novoEndereco();
  definirContexto({ ...contexto(address), ...ctx });
  const estado = { pontos, lances: 0 };
  const dup = duploDeFetch((url, opts) => {
    if (LER_PONTOS.test(url)) {
      return lerFalha ? { status: 500, json: {} }
        : { status: 200, json: { ok: true, pontos: 0, pontosCartao: 0, lance: { creditos: 0, pontos: estado.pontos, historico: [] } } };
    }
    if (/auth-lance$/.test(url)) return { status: 200, json: { token: "LANCE-AUTH", ttl: 600 } };
    if (/lance-relampago$/.test(url)) {
      const corpo = JSON.parse(opts.body);
      const v = corpo.valorCentavos;
      if (estado.pontos < v) {
        return { status: 400, json: { error: { code: "saldo_pontos_insuficiente", message: "x", pontosLance: estado.pontos, pontosNecessarios: v } } };
      }
      estado.pontos -= v; estado.lances += 1;
      return { status: 201, json: { ok: true, lanceId: `L-${estado.lances}`, edicaoId: corpo.edicaoId,
        creditoLanceConsumido: false, creditosLanceRestantes: null,
        pontosLanceConsumidos: v, pontosLanceRestantes: estado.pontos } };
    }
    return { status: 404, json: {} };
  });
  // O duplo do repo responde como o `fetch` real mas SÓ com `text()` (o `api.js` só usa isso); o
  // CardLance faz `resp.json()`. Acrescenta-se `json()` à MESMA resposta — o servidor duplo é o mesmo.
  const fetchDuplo = globalThis.fetch;
  globalThis.fetch = async (...a) => {
    const r = await fetchDuplo(...a);
    if (typeof r.json !== "function") r.json = async () => JSON.parse(await r.text());
    return r;
  };
  const restaurar = () => { globalThis.fetch = fetchDuplo; dup.restaurar(); };
  const props = { idEdicao: "R-1", address, isConnected: true, encerrado: false, modalidade, onConnect: () => {}, onDisconnect: () => {} };
  const c = montar(CardLance, [props]);
  await c.assentar();
  const nos = () => arvore(c.resultado());
  const botaoLance = () => nos().find((n) => n.props?.onClick && /Dar lance|Confirmar Lance|Converter/.test(textoDe(n)));
  const html = () => renderToStaticMarkup(React.createElement(React.Fragment, null, c.resultado()));
  const escrever = async (v) => {
    const input = nos().find((n) => n.type === "input");
    input.props.onChange({ target: { value: v } });
    await c.assentar();
  };
  return { c, dup, estado, botaoLance, html, escrever, fim: restaurar };
}

// ⚠️ UTAC110j.5 — ALTERADO (declarado): o lance gasta PONTOS de lance pelo seu valor (backend UTAC110n).
// Os 5 testes D antigos (créditos: «⚡ N créditos», `data-creditos-lance`, «Adquira um Passe Relâmpago»,
// 400 `sem_creditos_lance`, X → X−1) foram reescritos para PONTOS, com a mesma estrutura e as mesmas invariantes:
// bidireccional activo/desligado, fail-closed na leitura, releitura depois do lance, 400 com mensagem clara e
// o ramo Programado independente.
test("D · BIDIRECCIONAL — com pontos ≥ valor o «Dar lance» fica ACTIVO; com 0, ou valor acima do saldo, DESLIGADO + atalho", async () => {
  const com = await cardLance({ pontos: 40 });
  try {
    await com.escrever("37");
    assert.equal(com.botaoLance().props.disabled, false, "com 40 pontos um lance de 37 devia estar activo");
    const t = semTags(com.html());
    assert.match(t, /⭐ 40 pontos de lance/, "o saldo de pontos não aparece no cartão");
    assert.match(t, /Este lance custa 37 pontos de lance · seu saldo: 40 pontos de lance/, "o custo do lance não aparece");
    assert.doesNotMatch(com.html(), /data-pontos-lance=/, "com saldo que chega não há aviso");
    assert.doesNotMatch(t, /crédito/, "o formulário ainda fala em créditos");
  } finally { com.fim(); }

  const acima = await cardLance({ pontos: 40 });
  try {
    await acima.escrever("41");
    const b = acima.botaoLance();
    assert.equal(b.props.disabled, true, "um lance acima do saldo devia ficar desligado");
    assert.match(b.props.title, /este lance custa 41 pontos de lance e você tem 40/);
    const h = acima.html();
    assert.match(h, /data-pontos-lance="insuficiente"[^>]*>Saldo insuficiente: este lance custa 41 pontos de lance e você tem 40/);
    assert.match(h, /data-atalho-pontos="" [^>]*>Ver missões de hoje →/, "falta o atalho para ganhar pontos");
    assert.match(h, /href="\/carteira"[^>]*data-atalho-pontos/);
  } finally { acima.fim(); }

  const sem = await cardLance({ pontos: 0 });
  try {
    await sem.escrever("5");
    assert.equal(sem.botaoLance().props.disabled, true, "com 0 pontos o botão devia estar desligado");
    const h = sem.html();
    assert.match(h, /data-pontos-lance="sem_pontos"[^>]*>Você não tem pontos de lance\. Ganhe pontos grátis: login diário \(\+5\) e missão do dia \(\+10\)/);
    assert.match(h, /data-atalho-pontos=""/);
    assert.match(semTags(h), /⭐ 0 pontos de lance/);
  } finally { sem.fim(); }
});

test("D · leitura dos pontos a falhar → botão DESLIGADO + erro visível (fail-closed)", async () => {
  const x = await cardLance({ pontos: 900, lerFalha: true });
  try {
    await x.escrever("5");
    assert.equal(x.botaoLance().props.disabled, true);
    assert.match(x.html(), /data-pontos-lance="erro"[^>]*>⚠️ Não foi possível ler seus pontos de lance/);
    assert.doesNotMatch(x.html(), /data-atalho-pontos/, "num erro de leitura não se manda ganhar pontos");
  } finally { x.fim(); }
});

test("D · depois de dar um lance os pontos RELÊEM-SE: X → X − valor, e o ecrã mostra o que o SERVIDOR gastou", async () => {
  const x = await cardLance({ pontos: 50 });
  try {
    await x.escrever("37");
    assert.match(semTags(x.html()), /⭐ 50 pontos de lance/);
    await x.botaoLance().props.onClick();
    await x.c.assentar();
    assert.equal(x.estado.lances, 1, "o lance não chegou ao servidor");
    const t = semTags(x.html());
    assert.match(t, /✅ Lance registrado!/, "o lance não deu sucesso");
    assert.match(t, /−37 pontos de lance · restam 13 pontos de lance/, `o gasto do servidor não aparece: «${t}»`);
    assert.match(t, /⭐ 13 pontos de lance/, `os pontos não desceram para 13: «${t}»`);

    await x.escrever("14");
    assert.equal(x.botaoLance().props.disabled, true, "14 > 13: o botão devia desligar");
    await x.escrever("13");
    await new Promise((r) => setTimeout(r, 3100)); // cooldown do rate limiter (3 s)
    await x.botaoLance().props.onClick();
    await x.c.assentar();
    assert.equal(x.estado.lances, 2);
    assert.match(semTags(x.html()), /⭐ 0 pontos de lance/);
    await x.escrever("1");
    assert.equal(x.botaoLance().props.disabled, true, "sem pontos depois do último lance, o botão devia desligar");
  } finally { x.fim(); }
});

test("D · o servidor recusa por saldo (400 `saldo_pontos_insuficiente`) → mensagem CLARA com os números, e relê", async () => {
  // Corrida: o ecrã ainda mostra 40 pontos mas o servidor já só tem 3 (gastos noutro aparelho).
  const x = await cardLance({ pontos: 40 });
  try {
    await x.escrever("20");
    x.estado.pontos = 3;
    await x.botaoLance().props.onClick();
    await x.c.assentar();
    assert.match(x.html(), /⚠️ Saldo de pontos de lance insuficiente: este lance custa 20 pontos e você tem 3\./);
    assert.doesNotMatch(x.html(), /Sem créditos de lance/);
    assert.match(semTags(x.html()), /⭐ 3 pontos de lance/, "depois do 400 os pontos não foram relidos");
  } finally { x.fim(); }
});

test("D · o modo Programado NÃO depende dos pontos de lance (senhas): 0 pontos não o bloqueia", async () => {
  const x = await cardLance({ pontos: 0, modalidade: "programado", ctx: { saldoSenhas: 2, saldoSenhasStatus: "ok" } });
  try {
    await x.escrever("5");
    assert.equal(x.botaoLance().props.disabled, false, "o Programado ficou bloqueado pelos pontos de lance");
    assert.doesNotMatch(x.html(), /data-pontos-lance=/);
    assert.doesNotMatch(x.html(), /data-custo-lance/, "o custo em pontos não é do ramo Programado");
  } finally { x.fim(); }
});

// ═══ E — OP: o mesmo número de cartão + «Dar palpite» ═══════════════════════════════
test("E · a OP e a Carteira usam o MESMO número de cartão (`pontosCartao`); o botão da OP é «Dar palpite»", () => {
  const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  const op = semComentarios(readFileSync(resolve(SRC, "pages", "OfertasProgramadas.jsx"), "utf8"));
  const cart = semComentarios(readFileSync(resolve(SRC, "pages", "MinhaCarteira.jsx"), "utf8"));
  assert.match(op, /usePontos\(\)/); assert.match(cart, /usePontos\(\)/);
  assert.match(op, /pontosCartao/); assert.match(cart, /textoSaldo\(pontosCartao\)/);
  assert.match(op, /acao="palpite"/, "a OP deixou de usar a acção «palpite» do cartão de edição");
  const cartao = readFileSync(resolve(SRC, "components", "CartaoEdicao.jsx"), "utf8");
  assert.match(cartao, /palpite: Object\.freeze\(\{ botao: "Dar palpite"/, "o botão da OP deixou de ser «Dar palpite»");
});

// ═══ Fecho das ressalvas do validador (SEG5) ════════════════════════════════════════
test("SEG5/V2 · a Carteira passa ao balão os pontos de CARTÃO (não o total) — «Seus pontos de cartão: 30 / 50»", async () => {
  definirContexto(contexto(novoEndereco()));
  const dup = duploDeFetch((url) => (LER_PONTOS.test(url)
    ? { status: 200, json: { ok: true, pontos: 37, pontosCartao: 30, lance: { creditos: 2 } } }
    : { status: 404, json: {} }));
  try {
    const c = montar(MinhaCarteira, []);
    await c.assentar();
    const abrir = arvore(c.resultado()).find((n) => n.type === "button" && textoDe(n).includes("Comprar Passe Desafio"));
    await abrir.props.onClick();
    await c.assentar();
    const modal = arvore(c.resultado()).find((n) => typeof n.type === "function" && n.type.name === "ComprarPasseModal");
    assert.equal(modal.props.pontosCartao, 30, "o balão recebeu outro número que não os pontos de cartão");
    const t = semTags(renderToStaticMarkup(React.createElement(React.Fragment, null, c.resultado())));
    assert.match(t, /Seus pontos de cartão: 30 \/ 50/);
    assert.doesNotMatch(t, /Seus pontos de cartão: 37/);
  } finally { dup.restaurar(); }
});

test("SEG5/ℹ️ · sem `authToken` ainda (sessão por cunhar) o CardLance diz «Carregando», não «sem pontos»", async () => {
  // ⚠️ UTAC110j.5 — ALTERADO (declarado): o lance gasta PONTOS de lance pelo seu valor (backend UTAC110n).
  // Antes: data-creditos-lance="carregando" / "sem_creditos".
  const x = await cardLance({ pontos: 5, ctx: { authToken: null } });
  try {
    await x.escrever("5");
    assert.equal(x.botaoLance().props.disabled, true, "sem token o lance não pode abrir");
    assert.match(x.html(), /data-pontos-lance="carregando"/);
    assert.doesNotMatch(x.html(), /data-pontos-lance="sem_pontos"/, "mostrou «sem pontos» enquanto a sessão nasce");
  } finally { x.fim(); }
});
