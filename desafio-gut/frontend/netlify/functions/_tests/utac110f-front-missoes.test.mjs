// UTAC110f-front — o `ler-pontos` passa a devolver `missoesHoje` (as «Missões de hoje» da Carteira).
//
// O que se prova (handler REAL + `_lib/fontes-lance.mjs` REAL + `_lib/jwt.mjs` REAL; duplo só no Supabase):
//   M1 — os 4 estados (nada · só login · só lance · os dois), BIDIRECCIONAIS: cada campo é true num caso e false noutro;
//   M2 — `pontosHoje` = 5·login + 10·lance (R18-110f-front-B): 0 · 5 · 10 · 15 — a indicação NÃO entra;
//   M3 — só conta o DIA DE HOJE (Manaus): refs de ontem não marcam a missão;
//   M4 — FAIL-SOFT (reescrito no UTAC110g/P-1): um `historico_lance` ilegível ⇒ missões NEUTRAS e o resto 200 e igual;
//   M5 — (UTAC110g/P-1) o endpoint faz UMA só leitura da linha `pontos` — o 2.º SELECT não pode voltar.
//
// O dia vem do `diaManaus()` REAL com o relógio real (datas RELATIVAS — lição do UTAC110f/B5: um teste com data fixa caduca).
//
// node --test --experimental-test-module-mocks _tests/utac110f-front-missoes.test.mjs
import { test, mock } from "node:test";
import assert from "node:assert/strict";

const A = "0xaaa0000000000000000000000000000000000f0f";
process.env.JWT_SECRET = "segredo-de-teste-110f-front-com-comprimento-suficiente";

let DB;
let FALHAR_LEDGER = false;
// UTAC110g (P-1) — CONTADOR de leituras da tabela `pontos`: é o instrumento que prova que o endpoint
// deixou de fazer o 2.º SELECT (o do ledger). Zerado a cada `ler()`.
const DB_CONTADOR = { leituras: 0 };
function criarDuplo(linhaPontos) {
  const db = { pontos: linhaPontos ? [linhaPontos] : [], palpites: [] };
  return {
    from(tabela) {
      if (!(tabela in db)) throw new Error(`duplo: tabela ${tabela} não modelada`);
      const st = { colunas: "*", filtros: [], terminal: null };
      const api = {
        select(c) { st.colunas = c ?? "*"; return api; },
        eq(c, v) { st.filtros.push([c, v]); return api; },
        order() { return api; },
        maybeSingle() { st.terminal = "maybe"; return api; },
        then(res, rej) { return Promise.resolve().then(exec).then(res, rej); },
      };
      for (const m of ["insert", "update", "upsert", "delete", "neq", "in", "is", "limit", "range", "single"]) {
        api[m] = () => { throw new Error(`duplo: .${m}() não modelado — o ler-pontos é só leitura`); };
      }
      function exec() {
        if (tabela === "pontos") DB_CONTADOR.leituras += 1;
        // A leitura do ledger de lance (`lerLedgerLance`) pede as colunas explícitas; o `lerPontos` pede "*".
        if (FALHAR_LEDGER && tabela === "pontos" && String(st.colunas).includes("historico_lance")) {
          return { data: null, error: { code: "XX000", message: "falha simulada do ledger" } };
        }
        const linhas = db[tabela].filter((l) => st.filtros.every(([c, v]) => l[c] === v));
        return st.terminal === "maybe" ? { data: linhas[0] ?? null, error: null } : { data: linhas, error: null };
      }
      return api;
    },
  };
}

mock.module("../_lib/supabase-client.mjs", {
  namedExports: {
    getSupabase: () => ({ from: (t) => DB.from(t) }),
    getSupabaseReadOnly: () => ({ from: (t) => DB.from(t) }),
    supabaseConfigurado: () => true,
  },
});
mock.module("../_lib/system-state.mjs", {
  namedExports: {
    sistemaPausado: () => false,
    lerEstadoSistema: async () => ({ status: "ativo" }),
    STORE_SYSTEM_STATE: "system-state", KEY_SYSTEM_STATE: "state",
    escreverEstadoSistema: async () => {},
  },
});

const { assinarUserSession } = await import("../_lib/jwt.mjs");
const { diaManaus, refLoginDiario, refMissaoLance } = await import("../_lib/fontes-lance.mjs");
const handler = (await import("../ler-pontos.mjs")).default;
const TOKEN = await assinarUserSession(A);

const HOJE = diaManaus(new Date());
const ONTEM = diaManaus(new Date(Date.now() - 24 * 60 * 60 * 1000));
// Uma só marca de tempo: com `new Date()` por chamada, dois históricos «iguais» diferiam no `data` (erro do 1.º instrumento).
const AGORA_ISO = new Date().toISOString();
const mov = (ref, delta, motivo) => ({ ref, delta, motivo, data: AGORA_ISO });

async function ler(historicoLance, { falharLedger = false } = {}) {
  FALHAR_LEDGER = falharLedger;
  DB_CONTADOR.leituras = 0;
  DB = criarDuplo({
    endereco: A, pontos: 20, historico: [{ tipo: "compra", pontos: 20, ref: "c20", data: "2026-10-01T00:00:00.000Z" }],
    creditos_lance: 2, pontos_lance: 0, historico_lance: historicoLance, atualizado_em: "2026-10-13T00:00:00.000Z",
  });
  const res = await handler(new Request("https://ex.test/ler-pontos", { method: "GET", headers: { authorization: `Bearer ${TOKEN}` } }));
  FALHAR_LEDGER = false;
  return { status: res.status, body: await res.json() };
}

const login = (dia = HOJE) => mov(refLoginDiario(dia), 5, "login");
const missao = (dia = HOJE) => mov(refMissaoLance(dia), 10, "missao");

test("M1+M2 — nada feito hoje: loginFeito=false, lanceFeito=false, pontosHoje=0", async () => {
  const r = await ler([]);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.missoesHoje, { dia: HOJE, loginFeito: false, lanceFeito: false, pontosHoje: 0 });
});

test("M1+M2 — só o login: loginFeito=true, lanceFeito=false, pontosHoje=5", async () => {
  const r = await ler([login()]);
  assert.deepEqual(r.body.missoesHoje, { dia: HOJE, loginFeito: true, lanceFeito: false, pontosHoje: 5 });
});

test("M1+M2 — só o lance: loginFeito=false, lanceFeito=true, pontosHoje=10", async () => {
  const r = await ler([missao()]);
  assert.deepEqual(r.body.missoesHoje, { dia: HOJE, loginFeito: false, lanceFeito: true, pontosHoje: 10 });
});

test("M1+M2 — os dois: loginFeito=true, lanceFeito=true, pontosHoje=15", async () => {
  const r = await ler([login(), missao()]);
  assert.deepEqual(r.body.missoesHoje, { dia: HOJE, loginFeito: true, lanceFeito: true, pontosHoje: 15 });
});

test("M2 — a indicação (+50) NÃO entra em pontosHoje (só as missões — R18-110f-front-B)", async () => {
  const r = await ler([login(), mov(`indicacao:0xbbb0000000000000000000000000000000000001`, 50, "indicacao")]);
  assert.equal(r.body.missoesHoje.pontosHoje, 5);
});

test("M3 — refs de ONTEM não contam hoje (o dia é o de Manaus, calendário)", async () => {
  assert.notEqual(ONTEM, HOJE, "instrumento: ONTEM tem de ser outro dia");
  const r = await ler([login(ONTEM), missao(ONTEM)]);
  assert.deepEqual(r.body.missoesHoje, { dia: HOJE, loginFeito: false, lanceFeito: false, pontosHoje: 0 });
});

test("M4 — FAIL-SOFT (ACTUALIZADO no UTAC110g/P-1): linha com `historico_lance` ILEGÍVEL ⇒ missões neutras e o resto 200 e igual", async () => {
  // ⚠️ UTAC110g (P-1 / F4) — ESTE TESTE FOI REESCRITO, e o motivo fica declarado (P2: a versão anterior
  // fica à vista no histórico do git, marcada como superada):
  // a versão original do 110f-front forçava a falha do SEGUNDO SELECT (o do ledger) e exigia
  // `missoesHoje: null`. Esse segundo SELECT **deixou de existir**: as missões passaram a ser derivadas
  // do registo JÁ lido (`missoesDoRegisto`, pura) — logo o modo de falha que ele exercitava desapareceu.
  // A INVARIANTE que se preserva é a mesma de sempre: **o bloco das missões nunca derruba os pontos**.
  // Agora ela prova-se pelo que ainda pode acontecer — um `historico_lance` ausente/ilegível dá missões
  // NEUTRAS (não `null`, porque a leitura principal correu bem) e o resto da resposta fica igual.
  // `FALHAR_LEDGER` fica no duplo de propósito (documenta o caminho removido) mas já não tem efeito.
  const ok = await ler([login()]);
  assert.equal(ok.status, 200);
  assert.notEqual(ok.body.missoesHoje, null, "controlo positivo: com o ledger legível há missões");

  // O CONTROL0 é o `historico_lance` LEGÍVEL e VAZIO: um array ilegível tem de dar EXACTAMENTE a mesma
  // resposta que um array vazio (não se inventa, não rebenta) — e nada mais na resposta pode mudar.
  const vazio = await ler([]);
  const ilegivel = await ler("não é array");
  assert.equal(ilegivel.status, 200, "um `historico_lance` ilegível NÃO pode derrubar o ler-pontos");
  assert.deepEqual(ilegivel.body.missoesHoje, { dia: HOJE, loginFeito: false, lanceFeito: false, pontosHoje: 0 });
  assert.deepEqual(ilegivel.body, vazio.body, "ilegível == vazio: a resposta inteira é a mesma");
  assert.equal(ilegivel.body.pontosCartao, 20, "os pontos de fidelidade não são afectados");
});

test("M5 — o `ler-pontos` NÃO faz o segundo SELECT (o defeito P-1/F4 não pode voltar)", async () => {
  await ler([login(), missao()]);
  assert.equal(DB_CONTADOR.leituras, 1, "uma só leitura da linha `pontos` por pedido");
});
