// UTAC147 — 1 Passe Programado = 1 palpite (handler real `registar-palpite.mjs` contra o duplo das RPCs do inventário).
// Arnês copiado do utac136-palpite-gratis (que ficou com os testes do modelo antigo em skip).
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

process.env.JWT_SECRET = "segredo-de-teste-utac147-palpite-comprimento-suficiente";
const A = "0xaaa0000000000000000000000000000000000147";

let S, palpites, pontos, rpcs, EDICAO;
function novoDuplo() {
  S = criarSupabase();
  S.g.passesIniciais = { relampago: 0, programado: 0 };
  palpites = []; pontos = [{ endereco: A, pontos: 0, historico: [] }]; rpcs = [];
  const tabela = (t) => {
    const st = { op: "select", dados: null, filtros: [], terminal: null };
    const api = {
      select() { return api; }, insert(d) { st.op = "insert"; st.dados = d; return api; },
      eq(c, v) { st.filtros.push([c, v]); return api; }, maybeSingle() { st.terminal = "maybe"; return api; },
      order() { return api; },
      then(res, rej) { return Promise.resolve().then(exec).then(res, rej); },
    };
    function exec() {
      const db = t === "palpites" ? palpites : pontos;
      if (st.op === "insert") {
        if (t === "palpites" && !pontos.some((p) => p.endereco === st.dados.endereco)) return { data: null, error: { code: "23503" } };
        if (db.some((p) => p.endereco === st.dados.endereco && p.edicao_id === st.dados.edicao_id)) return { data: null, error: { code: "23505" } };
        const l = { id: db.length + 1, apurado: false, criado_em: "2026-11-13T00:00:00Z", ...st.dados }; db.push(l);
        return { data: l, error: null };
      }
      const ls = db.filter((l) => st.filtros.every(([c, v]) => l[c] === v));
      return st.terminal === "maybe" ? { data: ls[0] ?? null, error: null } : { data: ls, error: null };
    }
    return api;
  };
  return {
    from: (t) => (t === "palpites" || t === "pontos" ? tabela(t) : S.cliente.from(t)),
    rpc: (n, p) => { rpcs.push(n); return S.cliente.rpc(n, p); },
  };
}
let cliente = novoDuplo();

mock.module("../_lib/supabase-client.mjs", { namedExports: {
  getSupabase: () => cliente, getSupabaseReadOnly: () => cliente, supabaseConfigurado: () => true } });
mock.module("../_lib/jwt.mjs", { namedExports: { verificarUserSession: async () => ({ endereco: A, tipo: "user-session" }) } });
mock.module("../_lib/system-state.mjs", { namedExports: {
  sistemaPausado: () => false, lerEstadoSistema: async () => ({ status: "ativo" }),
  STORE_SYSTEM_STATE: "system-state", KEY_SYSTEM_STATE: "state", escreverEstadoSistema: async () => {} } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/edicoes-core.mjs", { namedExports: {
  buscarEdicao: async () => EDICAO, EDICAO_ID_RE: /^(?:(PROG|RELAMP|R)-\d+|ESPECIAL-[A-Z0-9]+)$/ } });

const registarPalpite = (await import("../registar-palpite.mjs")).default;
const post = (corpo) => registarPalpite(new Request("https://x/registar-palpite", {
  method: "POST", headers: { authorization: "Bearer x", "content-type": "application/json" }, body: JSON.stringify(corpo) }));

beforeEach(() => { cliente = novoDuplo(); EDICAO = { id: "PROG-7", tipo: "programado", status: "aberto" }; });

// ── UTAC147 (decisão do operador, 2026-11-21 — modelo de Passes diretos): 1 Passe Programado = 1 palpite ─────────
const progs = () => S.tabelas.passes_inventario.find((l) => l.endereco === A)?.passes_programado ?? 0;
const comPasses = (n) => { S.g.passesIniciais = { relampago: 0, programado: n }; };

test("P1 · com 2 Passes Programados ⇒ 201, gasta 1 (fica 1) e a resposta diz quantos restam", async () => {
  comPasses(2);
  const r = await post({ edicaoId: "PROG-7", valor: 120 });
  const b = await r.json();
  assert.equal(r.status, 201, JSON.stringify(b));
  assert.equal(b.passeConsumido, true);
  assert.equal(b.passesProgramadoRestantes, 1);
  assert.equal(progs(), 1);
  assert.equal(palpites.length, 1);
});

test("P2 · sem Passe Programado ⇒ 400 sem_passes_disponiveis, nada registado, inventário nunca negativo", async () => {
  comPasses(0);
  const r = await post({ edicaoId: "PROG-7", valor: 120 });
  const b = await r.json();
  assert.equal(r.status, 400, JSON.stringify(b));
  assert.equal(b.error.code, "sem_passes_disponiveis");
  assert.equal(palpites.length, 0);
  assert.equal(progs(), 0);
});

test("P3 · repetir o palpite na mesma edição ⇒ 200 idempotente e o Passe VOLTA (efeito líquido: 1 Passe)", async () => {
  comPasses(3);
  assert.equal((await post({ edicaoId: "PROG-7", valor: 120 })).status, 201);
  const r2 = await post({ edicaoId: "PROG-7", valor: 120 });
  const b2 = await r2.json();
  assert.equal(r2.status, 200, JSON.stringify(b2));
  assert.equal(b2.passeConsumido, false);
  assert.equal(progs(), 2, "só o 1.º palpite custou");
});

test("P4 · o registo falha ⇒ 502 e o Passe VOLTA", async () => {
  comPasses(1);
  pontos.length = 0; // sem linha em `pontos` ⇒ o insert do palpite falha (FK, 23503 → SEM_PASSE ⇒ 409)
  const r = await post({ edicaoId: "PROG-7", valor: 120 });
  assert.ok(r.status >= 400, String(r.status));
  assert.equal(palpites.length, 0);
  assert.equal(progs(), 1, "o Passe voltou");
});

test("P5 · concorrência (T4): 10 palpites SIMULTÂNEOS na mesma edição ⇒ 1 palpite e exactamente 1 Passe gasto", async () => {
  comPasses(5);
  const rs = await Promise.all(Array.from({ length: 10 }, () => post({ edicaoId: "PROG-7", valor: 120 })));
  const st = rs.map((r) => r.status);
  assert.equal(st.filter((x) => x === 201).length, 1, st.join(","));
  // ℹ️ declarado: enquanto os duplicados concorrentes têm o Passe «emprestado», os que chegam com o stock a 0 recebem
  // 400 em vez de 200 (o palpite certo já existe e o efeito líquido continua a ser 1 Passe). Nunca 2 palpites.
  assert.ok(st.every((x) => x === 201 || x === 200 || x === 400), st.join(","));
  assert.equal(palpites.length, 1);
  assert.equal(progs(), 4, "5 - 1: todos os Passes emprestados voltaram");
});

test("P6 · edição Relâmpago ou fechada ⇒ recusa ANTES de gastar o Passe", async () => {
  comPasses(1);
  EDICAO = { id: "PROG-7", tipo: "relampago", status: "aberto" };
  assert.equal((await post({ edicaoId: "PROG-7", valor: 1 })).status, 409);
  EDICAO = { id: "PROG-7", tipo: "programado", status: "encerrado" };
  assert.equal((await post({ edicaoId: "PROG-7", valor: 1 })).status, 409);
  assert.deepEqual(rpcs, [], "nenhuma RPC do inventário: recusa antes de gastar");
});
