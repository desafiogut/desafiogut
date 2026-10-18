// utac110j5-pontos-lance.test.mjs — UTAC110j.5 · a UI fala em PONTOS de lance (o modelo que o backend
// UTAC110n já implementa) e publica as PROPORÇÕES FIXAS no app (Google Play — Programas de Fidelidade
// Gamificados: «documentar as proporções fixas de maneira visível no app e nos termos oficiais»).
//
//   P — as proporções do frontend (`lib/pontosLance.js` PROPORCOES) são AMARRADAS às constantes do backend,
//       lidas do CÓDIGO-FONTE (não importadas: o `_lib` puxa Supabase/Blobs). Se um lado mudar, isto cai.
//   A — `estadoPontosLance` (CardLance): BIDIRECCIONAL — saldo ≥ valor abre; 0, valor > saldo, a carregar,
//       erro ou saldo ilegível fecham; o custo é o valor do campo (1 ponto = 1 centavo, Art. 18º).
//   B — Carteira: card «⭐ Pontos de lance» com o saldo; a nota da conversão SÓ aparece a quem foi convertido.
//   C — Regras Oficiais: «Como ganhar», «Como usar» e «O que o Passe Relâmpago dá» renderizados com os números.
//   D — Meus Ativos: o painel rotula Passe Relâmpago / conversão / lance; o bónus de 5 acertos diz +50 pontos.
//
// ⚠️ LIMITE DECLARADO: sem DOM real — «renderiza» é o markup SSR, não o pixel.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "./_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(AQUI, "..");
const FUNCOES = resolve(SRC, "..", "netlify", "functions", "_lib");
const STUBS_106C = resolve(AQUI, "_stubs-106c");
const STUBS_110D = resolve(AQUI, "_stubs-110d");
const STUBS_PAG = resolve(SRC, "pages", "__tests__", "_stubs");

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
let pl, MinhaCarteira, RegrasOficiais, PainelPontosLance, BonusSequenciaPontos;

before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(SRC, "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: ALIASES }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ montar, duploDeFetch } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/AppContext.jsx"));
  pl = await vite.ssrLoadModule("/src/lib/pontosLance.js");
  MinhaCarteira = (await vite.ssrLoadModule("/src/pages/MinhaCarteira.jsx")).default;
  RegrasOficiais = (await vite.ssrLoadModule("/src/pages/RegrasOficiais.jsx")).default;
  PainelPontosLance = (await vite.ssrLoadModule("/src/components/meus-ativos/PainelPontosLance.jsx")).default;
  ({ BonusSequenciaPontos } = await vite.ssrLoadModule("/src/pages/MeusAtivos.jsx"));
});
after(async () => { if (vite) await vite.close(); });

const semTags = (h) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");
const html = (el) => renderToStaticMarkup(el);

// ═══ P — proporções amarradas ao backend ═════════════════════════════════════════════
const fonte = (f) => readFileSync(resolve(FUNCOES, f), "utf8");
const constante = (f, nome) => {
  const m = fonte(f).match(new RegExp(`export const ${nome}\\s*=\\s*(\\d+)\\s*;`));
  assert.ok(m, `não encontrei ${nome} = <número> em ${f}`);
  return Number(m[1]);
};

test("P · cada proporção do frontend é IGUAL à constante do backend (lida da fonte)", () => {
  const P = pl.PROPORCOES;
  assert.equal(P.login, constante("fontes-lance.mjs", "PONTOS_LOGIN_DIARIO"));
  assert.equal(P.missao, constante("fontes-lance.mjs", "PONTOS_MISSAO_LANCE"));
  assert.equal(P.indicacao, constante("fontes-lance.mjs", "PONTOS_INDICACAO"));
  assert.equal(P.indicacoesPorMes, constante("fontes-lance.mjs", "LIMITE_INDICACOES_MES"));
  assert.equal(P.cicloPontos, constante("fontes-lance.mjs", "PONTOS_CICLO_MISSOES"));
  assert.equal(P.sequencia, constante("pontuacao-store.mjs", "PONTOS_LANCE_BONUS_SEQUENCIA"));
  assert.equal(P.passeRelampago, constante("ledger-lance.mjs", "PONTOS_LANCE_POR_PASSE_RELAMPAGO"));
  assert.equal(P.fidelidadePorPasse, constante("passe-pontos.mjs", "PONTOS_FIDELIDADE_POR_PASSE"));
  const regras = fonte("pontuacao-utils.mjs").match(/ACERTOS_PARA_BONUS:\s*(\d+)/);
  assert.ok(regras); assert.equal(P.acertosSequencia, Number(regras[1]));
  // DIAS_CICLO_MISSOES é DERIVADO no backend (ceil(225 / (5 + 10))): reproduz-se a mesma conta.
  assert.match(fonte("fontes-lance.mjs"), /DIAS_CICLO_MISSOES = Math\.ceil\(PONTOS_CICLO_MISSOES \/ PONTOS_DIA_MISSOES\)/);
  assert.equal(P.cicloDias, Math.ceil(P.cicloPontos / (P.login + P.missao)));
  assert.equal(pl.CICLO_POR_DIA, 15);
  // 15 dias × (1 lance mínimo por missão) ⇒ 210 líquidos (decisão 110n.1).
  assert.equal(pl.CICLO_LIQUIDO, 210);
  assert.ok(Object.isFrozen(P));
});

test("P · os valores da decisão do operador, em LITERAL (uma regra de negócio não se testa contra si própria)", () => {
  const P = pl.PROPORCOES;
  assert.deepEqual([P.login, P.missao, P.indicacao, P.sequencia, P.passeRelampago, P.cicloPontos, P.cicloDias],
    [5, 10, 50, 50, 200, 225, 15]);
});

// ═══ A — estado do lance em pontos (CardLance) ══════════════════════════════════════
test("A · BIDIRECCIONAL — só abre com saldo CONHECIDO ≥ valor; o custo é o valor do campo", () => {
  const e = (o) => pl.estadoPontosLance({ isConnected: true, loading: false, erro: "", ...o });
  const ok = e({ pontos: 37, valor: "37" });
  assert.deepEqual([ok.estado, ok.podeLancar, ok.custo, ok.saldo], ["ok", true, 37, 37]);
  assert.equal(e({ pontos: 37, valor: "" }).podeLancar, true, "campo vazio: o saldo chega (o botão fecha por `!valor`)");
  const acima = e({ pontos: 37, valor: "38" });
  assert.deepEqual([acima.estado, acima.podeLancar], ["insuficiente", false]);
  assert.match(acima.mensagem, /custa 38 pontos de lance e você tem 37.*login diário \(\+5\).*missão do dia \(\+10\)/);
  assert.equal(e({ pontos: 0, valor: "1" }).estado, "sem_pontos");
  for (const p of [null, undefined, "40", 4.5, -1, NaN, Infinity]) {
    assert.equal(e({ pontos: p, valor: "1" }).podeLancar, false, `saldo ${String(p)} abriu o lance`);
  }
  assert.equal(e({ pontos: 40, valor: "1", loading: true }).estado, "carregando");
  assert.equal(e({ pontos: 40, valor: "1", erro: "x" }).estado, "erro");
  assert.equal(pl.estadoPontosLance({ isConnected: false, pontos: 40, valor: "1" }).podeLancar, false);
  // Custo sem coerção: só dígitos contam.
  for (const v of ["1e2", "-5", "3.5", "abc"]) assert.equal(e({ pontos: 40, valor: v }).custo, null, `custo de «${v}»`);
});

test("A · o CardLance usa o estado em PONTOS (não o de créditos) e trata `saldo_pontos_insuficiente` (fonte)", () => {
  const c = readFileSync(resolve(SRC, "components", "CardLance.jsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  assert.match(c, /estadoPontosLance\(\{/);
  assert.doesNotMatch(c, /estadoCreditosLance|rotuloCreditos|sem_creditos_lance|consumo_credito_falhou/);
  assert.match(c, /saldo_pontos_insuficiente: mensagemSaldoInsuficiente\(/);
  assert.match(c, /data\?\.pontosLanceConsumidos/);
  assert.match(c, /data\?\.pontosLanceRestantes/);
  assert.match(c, /href="\/carteira" data-atalho-pontos/);
});

// ═══ B — Carteira ═══════════════════════════════════════════════════════════════════
const mov = (motivo, delta) => ({ data: "2026-10-18T12:00:00Z", campo: "pontos_lance", motivo, delta, ref: `${motivo}:x` });
let nEnd = 0;
async function carteiraCom(lance) {
  definirContexto({
    isConnected: true, abrirModal: () => {}, address: `0x${String(++nEnd).padStart(40, "b")}`, user: { email: { address: "a@b.c" } },
    refetchSaldo: () => {}, saldoRsCentavos: 1234, saldoRsStatus: "ok", refetchSaldoRs: () => {},
    saldoSenhas: 0, saldoSenhasStatus: "ok", userLabel: "Teste", authToken: "AUTH-110J5",
  });
  const dup = duploDeFetch((url) => (/ler-pontos$/.test(url)
    ? { status: 200, json: { ok: true, pontos: 12, pontosCartao: 10, pontosParaCartao: 50, lance } }
    : { status: 404, json: {} }));
  try {
    const c = montar(MinhaCarteira, []);
    await c.assentar();
    return renderToStaticMarkup(React.createElement(React.Fragment, null, c.resultado()));
  } finally { dup.restaurar(); }
}
const card = (h) => {
  const i = h.indexOf('data-saldo="pontos-lance"');
  assert.ok(i > 0, "falta o card de pontos de lance");
  return h.slice(i, h.indexOf('data-saldo="eco-quildo"', i));
};

test("B · SEG5/VM2 — `conversoesFeitas` só conta conversões com delta > 0 (uma reversão não é conversão)", () => {
  const l = (h) => pl.pontosLanceDaResposta({ lance: { pontos: 0, historico: h } });
  assert.deepEqual(pl.conversoesFeitas(l([mov("conversao-senhas", -200)])), { creditos: false, senhas: false });
  assert.deepEqual(pl.conversoesFeitas(l([mov("conversao-creditos", -200)])), { creditos: false, senhas: false });
  assert.deepEqual(pl.conversoesFeitas(l([mov("conversao-senhas", 200)])), { creditos: false, senhas: true });
  assert.deepEqual(pl.conversoesFeitas(null), { creditos: false, senhas: false });
});

test("B · a Carteira mostra «⭐ Pontos de lance» com o saldo; sem conversão NÃO há nota", async () => {
  const h = await carteiraCom({ creditos: 0, pontos: 245, historico: [mov("passe-relampago", 200), mov("login", 5)] });
  assert.match(semTags(card(h)), /⭐ Pontos de lance 245 Cada lance gasta o seu valor/);
  assert.doesNotMatch(h, /data-nota-conversao/, "nota de conversão a quem não foi convertido");
  assert.doesNotMatch(semTags(h), /Créditos de lance/);
});

test("B · BIDIRECCIONAL da nota: créditos convertidos → nota dos créditos; senhas → nota das senhas", async () => {
  const hc = await carteiraCom({ creditos: 0, pontos: 400, historico: [mov("conversao-creditos", 400)] });
  assert.match(semTags(card(hc)), /Seus créditos de lance antigos foram convertidos em pontos de lance\./);
  assert.doesNotMatch(semTags(card(hc)), /senhas antigas/);
  const hs = await carteiraCom({ creditos: 0, pontos: 200, historico: [mov("conversao-senhas", 200)] });
  assert.match(semTags(card(hs)), /Suas senhas antigas foram convertidas em pontos de lance\./);
  assert.doesNotMatch(semTags(card(hs)), /créditos de lance antigos/);
});

// ═══ C — Regras Oficiais ════════════════════════════════════════════════════════════
test("C · as Regras Oficiais publicam as proporções fixas NO APP, antes do 1.º capítulo", () => {
  const h = html(React.createElement(RegrasOficiais));
  const i = h.indexOf("data-proporcoes");
  assert.ok(i > 0 && i < h.indexOf("<section"), "o bloco das proporções não está antes do Regulamento");
  const t = semTags(h.slice(i, h.indexOf("<section")));
  for (const f of [
    "Como ganhar pontos de lance (gratuitos)",
    "Login diário: +5 pontos de lance.",
    "Missão do dia (dar 1 lance): +10 pontos de lance.",
    "Indicação convertida: +50 pontos de lance (até 10 indicações por mês).",
    "Sequência de 5 acertos seguidos: +50 pontos de lance.",
    // SEG5/V1 — a 1.ª redacção dizia «ficam garantidos pelo menos 210 pontos líquidos»: só é verdade com lances de 1
    // ponto (fontes-lance.mjs:42-48). Corrigida e fixada aqui; a antiga não pode voltar (asserção abaixo).
    "Ciclo completo de missões: 225 pontos de lance em 15 dias (15 × 15 pontos por dia, já contando o login e a missão diária). Como a missão exige um lance e cada lance gasta o seu valor, com lances de 1 ponto ficam 210 pontos líquidos (com lances maiores, ficam menos).",
    "Como usar os pontos de lance",
    "Cada lance gasta o valor do lance em pontos de lance: um lance de 37 gasta 37 pontos.",
    "1 ponto = R$ 0,01 (Art. 18º)",
    "O que o Passe Relâmpago dá",
    "+200 pontos de lance (bônus: não é condição para dar lances).",
    "10 pontos de fidelidade",
    "1 ECOQUILDO.",
    "Acesso às métricas da edição e ao GUTO.",
    "O Passe Desafio é um produto; os pontos de lance são um benefício suplementar, não uma taxa para participar.",
  ]) assert.ok(t.includes(f), `as Regras não divulgam «${f}»`);
  assert.ok(!t.includes("garantidos pelo menos"), "SEG5/V1: a promessa falsa de «pelo menos 210» voltou");
  // O texto que vincula continua lá e o resumo diz que é o Regulamento que vale.
  assert.ok(t.includes("O texto que vale é o Regulamento abaixo."));
});

// ═══ D — Meus Ativos ════════════════════════════════════════════════════════════════
test("D · o painel rotula Passe Relâmpago, conversão e o GASTO do lance (nada cai em «Outros»)", () => {
  const lance = pl.pontosLanceDaResposta({ lance: { pontos: 168, historico: [
    { ...mov("passe-relampago", 200), data: "2026-10-16T10:00:00Z" },
    { ...mov("conversao-creditos", 5), data: "2026-10-16T11:00:00Z" },
    { ...mov("lance", -37), data: "2026-10-17T10:00:00Z" },
  ] } });
  const h = semTags(html(React.createElement(PainelPontosLance, { temSessao: true, lance })));
  assert.match(h, /Passe Relâmpago \+200/);
  assert.match(h, /Conversão do modelo antigo \+5/);
  // SEG5/V3·VM5·VM6 — o caminho `conversao-senhas` também: entra na MESMA linha (nunca em «Outros») e tem rótulo.
  const ls = pl.pontosLanceDaResposta({ lance: { pontos: 200, historico: [mov("conversao-senhas", 200)] } });
  const hs = semTags(html(React.createElement(PainelPontosLance, { temSessao: true, lance: ls })));
  assert.match(hs, /Conversão do modelo antigo \+200/);
  assert.match(hs, /Senhas antigas convertidas \+200/, "o movimento recente das senhas convertidas perdeu o rótulo");
  assert.doesNotMatch(hs, /Outros|Outro /);
  assert.match(h, /Lance -37/, "o gasto do lance não aparece rotulado");
  assert.doesNotMatch(h, /Outros|Outro /, "um movimento conhecido caiu em «Outros»");
  assert.match(h, /Cada lance gasta o seu valor em pontos\./);
  assert.doesNotMatch(h, /de graça pelo seu engajamento/, "o texto antigo (só engajamento) voltou");
});

test("D · BIDIRECCIONAL do bónus de 5 acertos: com bónus → «+50 pontos de lance»; sem → como ganhar; anónimo → nada", () => {
  const r = (p) => html(React.createElement(BonusSequenciaPontos, p));
  const com = semTags(r({ temSessao: true, bonusEmitido: true }));
  assert.match(com, /🎁 Bônus de sequência \+50 pontos de lance/);
  assert.doesNotMatch(com, /senha/i);
  const sem = r({ temSessao: true, bonusEmitido: false });
  assert.match(sem, /data-estado="sem-bonus"/);
  assert.match(semTags(sem), /Complete 5 acertos seguidos para ganhar \+50 pontos de lance\./);
  assert.match(r({ temSessao: false, bonusEmitido: true }), /data-estado="sem-sessao"/);
  assert.doesNotMatch(semTags(r({ temSessao: false, bonusEmitido: true })), /\+50/, "afirmou o bónus de quem não identificou");
  // SEG5/VM4 — só o `true` explícito afirma o bónus (sem coerção): "true", 1, {} não contam.
  for (const v of ["true", 1, {}, "sim"]) {
    assert.match(r({ temSessao: true, bonusEmitido: v }), /data-estado="sem-bonus"/, `bonusEmitido=${JSON.stringify(v)} afirmou o bónus`);
  }
  assert.match(r({ temSessao: true, erro: "rede" }), /data-estado="erro"/);
  assert.match(r({ temSessao: true, carregando: true }), /data-estado="carregando"/);
});

// ═══ SEG5 — os dois mutantes que sobreviveram (VM1 e VM3) ═════════════════════════════════════════
//
// ⚠️ LIMITE DECLARADO: estes dois são TESTES DE FONTE, não de comportamento — e digo porquê em cada um.
// Não é preguiça: é o instrumento que existe. O harness não tem DOM (SSR) nem gatilho de releitura
// isolado, e o estado que os mutantes produzem NÃO É ALCANÇÁVEL sem isso. Um teste que fingisse
// alcançá-lo seria vacuamente verde — exactamente o que o R16 proíbe.

test("B · SEG5/VM1 — a nota da conversão está atrás da GUARDA DE LEITURA (saldo ilegível não afirma conversão)", () => {
  const src = readFileSync(resolve(SRC, "pages", "MinhaCarteira.jsx"), "utf8");
  // Porque é de FONTE: no harness o `usePontos` só fica em erro por uma RELEITURA que falha depois de
  // um sucesso, e não há gatilho de releitura isolado (o `refetch` real dispara dentro dos balões de
  // resgate/compra). Sem DOM, o estado «dados antigos + erro novo» não é montável daqui.
  // O que se fixa: a guarda `!saldosIlegiveis` está NA MESMA condição da nota, e `saldosIlegiveis`
  // inclui o ERRO (não só o carregamento). Tirar qualquer das duas coisas põe o mutante a viver.
  assert.match(src, /\{!saldosIlegiveis && \(conversao\.creditos \|\| conversao\.senhas\) && \(/,
    "a nota da conversão tem de estar atrás de !saldosIlegiveis");
  assert.match(src, /const saldosIlegiveis = pontosCarregando \|\| Boolean\(pontosErro\);/,
    "«ilegível» tem de incluir o erro de leitura, não só o carregamento");
});

test("A · SEG5/VM3 — o custo do lance só aparece COM sessão (e o estado devolve custo mesmo sem ela)", () => {
  const src = readFileSync(resolve(SRC, "components", "CardLance.jsx"), "utf8");
  // Porque é de FONTE: a linha do custo é markup do componente e o harness não tem DOM para escrever
  // no campo (`valor` é estado interno, não prop). A guarda e a razão dela fixam-se aqui.
  assert.match(src, /\{!isProgramado && isConnected && pontosL\.custo !== null && \(/,
    "a linha do custo tem de exigir isConnected");
  // A RAZÃO da guarda: `estadoPontosLance` devolve `custo` mesmo sem sessão — sem o `isConnected` no
  // markup, um utilizador desligado veria «Este lance custa 37 pontos» a partir de um valor em memória.
  assert.equal(pl.estadoPontosLance({ isConnected: false, pontos: 40, valor: "37" }).custo, 37);
  assert.equal(pl.estadoPontosLance({ isConnected: false, pontos: 40, valor: "37" }).podeLancar, false);
});
