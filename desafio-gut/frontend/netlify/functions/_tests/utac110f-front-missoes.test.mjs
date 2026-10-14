// UTAC110f-front — o `ler-pontos` passa a devolver `missoesHoje` (as «Missões de hoje» da Carteira).
//
// O que se prova (handler REAL + `_lib/fontes-lance.mjs` REAL + `_lib/jwt.mjs` REAL; duplo só no Supabase):
//   M1 — os 4 estados (nada · só login · só lance · os dois), BIDIRECCIONAIS: cada campo é true num caso e false noutro;
//   M2 — `pontosHoje` = 5·login + 10·lance (R18-110f-front-B): 0 · 5 · 10 · 15 — a indicação NÃO entra;
//   M3 — só conta o DIA DE HOJE (Manaus): refs de ontem não marcam a missão;
//   M4 — FAIL-SOFT: a leitura das missões falha ⇒ `missoesHoje: null` e o resto da resposta continua 200 e igual.
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

test("M4 — FAIL-SOFT: a leitura das missões falha ⇒ missoesHoje=null e o resto continua 200 e igual", async () => {
  const ok = await ler([login()]);
  const falha = await ler([login()], { falharLedger: true });
  assert.equal(falha.status, 200, "uma falha das missões NÃO pode derrubar o ler-pontos");
  assert.equal(falha.body.missoesHoje, null);
  // Controlo: tudo o resto é byte-igual ao caso sem falha.
  const { missoesHoje: _a, ...restoOk } = ok.body;
  const { missoesHoje: _b, ...restoFalha } = falha.body;
  assert.deepEqual(restoFalha, restoOk);
  assert.notEqual(ok.body.missoesHoje, null, "controlo positivo: sem falha há missões");
});
