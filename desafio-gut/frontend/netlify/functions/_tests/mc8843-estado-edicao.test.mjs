// MC88.43 — o estado da edição tem de ser UM SÓ, em todo o lado.
//
// PORQUÊ ESTE TESTE EXISTE: o MC88.41 (B3/B4) apanhou o mesmo cartão a dizer
// "Encerrada" + "EM BREVE" + "Aguardando abertura" sob o título "em Andamento",
// e a edição R-1 a ser "🟢 Ativo" no /mercado e "Aguardando abertura" no
// Dashboard no MESMO instante. A causa (S0) era não haver função nenhuma: cada
// ecrã derivava o estado da fonte que tinha à mão, e a trava EM_BREVE_MODE só
// estava aplicada em metade deles.
//
// Duas famílias de asserção:
//   1. COMPORTAMENTO — getEstadoEdicao é importada e exercida a sério, com a
//      trava ligada (estado real do produto) e desligada (via mock.module, para
//      exercer a ordem de autoridade das três fontes).
//   2. ESTRUTURA — nenhum ecrã pode voltar a escolher texto de estado por conta
//      própria. Lê os ficheiros-fonte e afirma a ausência dos padrões exatos que
//      produziram B3 e B4. Mesma técnica dos testes mc8816/mc8822, que também
//      atravessam a fronteira frontend/backend (não há runner no frontend).
//
// node --test --experimental-test-module-mocks _tests/mc8843-estado-edicao.test.mjs

import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { getEstadoEdicao, ESTADO_EDICAO } from "../../../src/utils/edicao.js";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../../../src");
const ler = (rel) => readFileSync(resolve(SRC, rel), "utf8");

/** Linhas de código, sem comentários — evita casar com texto explicativo. */
const semComentarios = (src) =>
  src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");

// Amostras reais, lidas do endpoint de produção em 2026-07-29 13:23 UTC.
const RELAMP_1 = { id: "RELAMP-1", tipo: "relampago", status: "encerrado", termino_em: "2026-05-30T23:02:11.284Z" };
const R_1      = { id: "R-1",      tipo: "relampago", status: "aberto",    termino_em: "2026-07-30T13:23:39.924Z" };
const AGORA    = Date.parse("2026-07-29T13:23:41.000Z");

// ─────────────────────────────────────────────────────────────────────────────
// 1. COMPORTAMENTO — com a trava LIGADA (o estado real do produto hoje)
// ─────────────────────────────────────────────────────────────────────────────

test("com a trava ligada, TODAS as edições estão em breve — incluindo as encerradas", () => {
  for (const edicao of [RELAMP_1, R_1, null, {}, { termino_em: "lixo" }]) {
    const e = getEstadoEdicao(edicao, { agora: AGORA });
    assert.equal(e.estado, ESTADO_EDICAO.EM_BREVE,
      `${JSON.stringify(edicao)} devia estar "em breve" com EM_BREVE_MODE=true`);
    assert.equal(e.timer, "EM BREVE");
    assert.equal(e.rotuloLongo, "Aguardando abertura");
  }
});

test("a trava vence o veredito do prazo — é isto que mata o B3", () => {
  // O cartão RELAMP-1 dizia "Encerrada" (do termino_em) ao lado de "EM BREVE"
  // (da trava). Com uma fonte só, os dois textos vêm do mesmo sítio.
  const e = getEstadoEdicao(RELAMP_1, { encerrado: true, agora: AGORA });
  assert.equal(e.estado, ESTADO_EDICAO.EM_BREVE);
  assert.equal(e.encerrada, false, "encerrada=true reabriria a contradição do B3");
  assert.equal(e.rotulo, "Em breve");
});

test("Dashboard e /mercado recebem EXATAMENTE o mesmo objeto para a R-1 — o B4", () => {
  const noDashboard = getEstadoEdicao(R_1, { encerrado: false, agora: AGORA });
  const noMercado   = getEstadoEdicao(R_1, { encerrado: false, agora: AGORA });
  assert.deepEqual(noDashboard, noMercado);
  assert.equal(noDashboard.badge, "🕒 Em breve",
    'o /mercado não pode voltar a anunciar "🟢 Ativo" enquanto o Dashboard diz "EM BREVE"');
});

test("é pura: mesmos argumentos, mesmo resultado", () => {
  assert.deepEqual(
    getEstadoEdicao(R_1, { agora: AGORA }),
    getEstadoEdicao({ ...R_1 }, { agora: AGORA }),
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. COMPORTAMENTO — com a trava DESLIGADA (a lógica por baixo, para o dia em
//    que o leilão abrir). Sem isto, o corpo de derivação nunca seria exercido.
// ─────────────────────────────────────────────────────────────────────────────

async function semTrava() {
  mock.module("../../../src/lib/leilaoLock.js", {
    namedExports: { EM_BREVE_MODE: false, EM_BREVE_LABEL: "EM BREVE" },
  });
  // cache-buster: força reavaliação do módulo com o mock aplicado.
  const mod = await import(`../../../src/utils/edicao.js?destravado=${Math.random()}`);
  return mod.getEstadoEdicao;
}

test("sem trava: prazo no futuro → ativa; no passado → encerrada", async () => {
  const get = await semTrava();
  assert.equal(get(R_1,      { agora: AGORA }).estado, ESTADO_EDICAO.ATIVA);
  assert.equal(get(RELAMP_1, { agora: AGORA }).estado, ESTADO_EDICAO.ENCERRADA);
  mock.reset();
});

test("sem trava: o veredito do prazo on-chain (FONTE A) vence o backend", async () => {
  const get = await semTrava();
  // status "aberto" e prazo no futuro, mas o AppContext diz encerrado → encerrada.
  assert.equal(get(R_1, { encerrado: true, agora: AGORA }).estado, ESTADO_EDICAO.ENCERRADA);
  // encerrado:false NÃO reabre o que o backend fechou.
  assert.equal(get(RELAMP_1, { encerrado: false, agora: AGORA }).estado, ESTADO_EDICAO.ENCERRADA);
  mock.reset();
});

test('sem trava: o backend (FONTE C) é lido — deixou de ser campo morto', async () => {
  const get = await semTrava();
  // Prazo no FUTURO mas status "encerrado" → encerrada. Antes do MC88.43 o
  // campo `status` era copiado pelo useEdicoes e não era lido por ninguém.
  const contraditoria = { id: "X", status: "encerrado", termino_em: "2027-01-01T00:00:00.000Z" };
  assert.equal(get(contraditoria, { agora: AGORA }).estado, ESTADO_EDICAO.ENCERRADA);
  mock.reset();
});

test('sem trava: sem prazo utilizável → "indisponível", NUNCA "encerrada"', async () => {
  const get = await semTrava();
  // O buraco da FONTE B: timeLeftEdicaoSegundos devolvia 0 para uma edição sem
  // termino_em, e 0 era lido como "encerrada" — "não sei" disfarçado de "acabou".
  for (const edicao of [null, {}, { id: "X" }, { id: "X", termino_em: "" }, { id: "X", termino_em: "não-é-data" }]) {
    assert.equal(get(edicao, { agora: AGORA }).estado, ESTADO_EDICAO.INDISPONIVEL,
      `${JSON.stringify(edicao)} não tem prazo utilizável — não pode ser "encerrada"`);
  }
  // Mas se o backend disse "aberto", acreditamos nele mesmo sem prazo.
  assert.equal(get({ id: "X", status: "aberto" }, { agora: AGORA }).estado, ESTADO_EDICAO.ATIVA);
  mock.reset();
});

test("sem trava: a R-1 não cai em indisponível — o prazo dela não vive no termino_em", async () => {
  const get = await semTrava();
  // A R-1 é servida ao Dashboard/TabelaLances como { id } + o veredito do
  // AppContext; o prazo dela vive no prazoTimestamp (on-chain), não no objeto.
  // Sem esta regra, os dois ecrãs mostrariam "Indisponível" e "—" no lugar do
  // cronómetro vivo assim que a trava fosse desligada.
  const r1 = { id: "R-1" };
  assert.equal(get(r1, { encerrado: false, agora: AGORA }).estado, ESTADO_EDICAO.ATIVA);
  assert.equal(get(r1, { encerrado: false, agora: AGORA }).timer, null,
    "timer null é o sinal de 'desenha a contagem viva' — não pode virar um rótulo");
  assert.equal(get(r1, { encerrado: true,  agora: AGORA }).estado, ESTADO_EDICAO.ENCERRADA);
  mock.reset();
});

test("timerTravado(): rótulo com a trava ligada, null sem ela", async () => {
  const { timerTravado } = await import("../../../src/utils/edicao.js");
  assert.equal(timerTravado(), "EM BREVE");

  mock.module("../../../src/lib/leilaoLock.js", {
    namedExports: { EM_BREVE_MODE: false, EM_BREVE_LABEL: "EM BREVE" },
  });
  const mod = await import(`../../../src/utils/edicao.js?destravado=${Math.random()}`);
  assert.equal(mod.timerTravado(), null,
    "sem trava tem de devolver null, senão a Vitrine trocava a contagem viva por um traço");
  mock.reset();
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. ESTRUTURA — nenhum ecrã escolhe texto de estado por conta própria
// ─────────────────────────────────────────────────────────────────────────────

const CONSUMIDORES = [
  "pages/Dashboard.jsx",
  "pages/EdicaoDetalhe.jsx",
  "components/EdicaoCard.jsx",
  "components/TabelaLances.jsx",
  "components/CardLance.jsx",
  "components/glass/AuctionStatusBar.jsx",
];

test("todo o ecrã que fala de estado importa a fonte única", () => {
  for (const rel of CONSUMIDORES) {
    assert.match(ler(rel), /from\s+["'][^"']*utils\/edicao\.js["']/,
      `${rel} fala do estado da edição sem importar utils/edicao.js`);
  }
});

test("nenhum ecrã volta a importar EM_BREVE_MODE diretamente", () => {
  // A trava passa a ser consumida SÓ pela fonte única. Um ecrã que a importe
  // outra vez é um ecrã a decidir texto sozinho — foi assim que nasceu o B4.
  for (const rel of CONSUMIDORES) {
    assert.doesNotMatch(semComentarios(ler(rel)), /import\s*\{[^}]*EM_BREVE_MODE/,
      `${rel} voltou a importar EM_BREVE_MODE — a decisão tem de vir de getEstadoEdicao`);
  }
});

test("os textos contraditórios do B3/B4 saíram do código", () => {
  const proibidos = [
    ["components/EdicaoCard.jsx",           /\?\s*["']Encerrada["']\s*:\s*["']Em andamento["']/, 'ternário "Encerrada" : "Em andamento"'],
    ["components/TabelaLances.jsx",         /["']🟢 Ativo["']/,                                  '"🟢 Ativo" cru (B4)'],
    ["pages/Dashboard.jsx",                 /Outras Edições em Andamento/,                       'título "em Andamento" fixo (B3)'],
    // O dicionário i18n tinha a MESMA frase numa chave adormecida
    // (dash.outrasEdicoes, sem call-site). Ligá-la ressuscitaria o B3.
    ["i18n/pt.js",                          /Outras Edições em Andamento/,                       'a chave i18n com "em Andamento"'],
    ["i18n/es.js",                          /Ediciones en Curso/,                                'a chave i18n espanhola "en Curso"'],
    ["i18n/en.js",                          /Other Editions Running/,                            'a chave i18n inglesa "Running"'],
    ["components/glass/AuctionStatusBar.jsx", /🔴 Leilão encerrado/,                             '"Leilão encerrado" cru'],
    ["components/CardLance.jsx",            /🔴 Edição encerrada/,                               '"Edição encerrada" cru'],
  ];
  for (const [rel, padrao, o_que] of proibidos) {
    assert.doesNotMatch(semComentarios(ler(rel)), padrao, `${rel}: voltou ${o_que}`);
  }
});

test("a Vitrine não anuncia leilão ao vivo enquanto o cronómetro diz EM BREVE", () => {
  // Achado do S0, fora do MC88.41: statusDoSlot devolvia "● Ao vivo agora" ao
  // lado de um cronómetro travado em "EM BREVE", no mesmo cartão.
  const codigo = semComentarios(ler("pages/Vitrine.jsx"));
  assert.match(codigo, /from\s+["'][^"']*utils\/edicao\.js["']/,
    "Vitrine.jsx deixou de consultar a fonte única");

  // O literal "● Ao vivo agora" CONTINUA no código — é o caminho legítimo para
  // quando a trava estiver desligada. O que a guarda exige é que a fonte única
  // seja consultada ANTES dele, dentro da mesma função.
  const corpo = codigo.match(/function statusDoSlot[\s\S]*?\n}/)?.[0];
  assert.ok(corpo, "statusDoSlot desapareceu — a guarda precisa de ser reescrita");
  const posConsulta = corpo.indexOf("getEstadoEdicao");
  const posAoVivo   = corpo.indexOf("● Ao vivo agora");
  assert.notEqual(posConsulta, -1,
    "statusDoSlot voltou a decidir o badge sozinho, sem perguntar à fonte única");
  assert.ok(posConsulta < posAoVivo,
    'a consulta à fonte única tem de vir ANTES de "● Ao vivo agora", senão o ' +
    "badge escapa à trava como escapava antes do MC88.43");

  // O cronómetro da vitrine também não pode voltar a ler a trava diretamente.
  assert.doesNotMatch(codigo, /import\s*\{[^}]*EM_BREVE_MODE/,
    "Vitrine.jsx voltou a importar EM_BREVE_MODE");
});
