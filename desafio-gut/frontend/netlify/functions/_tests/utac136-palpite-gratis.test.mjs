// UTAC136 — Regulamento v6.0: o palpite é GRATUITO (bónus de engajamento). Teste do USO real do endpoint
// `registar-palpite.mjs` com o inventário a ZERO (RPCs reais do duplo do MC105a, sem o stock de 99 dos
// duplos antigos): antes do UTAC136 isto era 400 `sem_passes_disponiveis`.
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

process.env.JWT_SECRET = "segredo-de-teste-utac136-palpite-comprimento-suficiente";
const A = "0xaaa0000000000000000000000000000000000136";

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

test("(a) inventário a ZERO ⇒ 201: o palpite é gratuito e não toca no inventário", async () => {
  const r = await post({ edicaoId: "PROG-7", valor: 120 });
  const b = await r.json();
  assert.equal(r.status, 201, JSON.stringify(b));
  assert.equal(b.palpite.valor, 120);
  assert.equal(palpites.length, 1);
  assert.deepEqual(rpcs, [], "nenhuma RPC do inventário (consumir/devolver)");
  assert.equal(S.tabelas.passes_inventario.length, 0, "nem sequer cria a linha do inventário");
});

test("(b) o mesmo palpite repetido ⇒ 200 idempotente, continua sem tocar no inventário", async () => {
  await post({ edicaoId: "PROG-7", valor: 120 });
  const r = await post({ edicaoId: "PROG-7", valor: 999 });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).palpite.valor, 120, "não substitui o primeiro palpite");
  assert.equal(palpites.length, 1);
  assert.deepEqual(rpcs, []);
});

test("(c) entradas inválidas continuam recusadas: valor não inteiro 400 · edição Relâmpago 409 · edição fechada 409", async () => {
  assert.equal((await post({ edicaoId: "PROG-7", valor: "12" })).status, 400);
  EDICAO = { id: "RELAMP-1", tipo: "relampago", status: "aberto" };
  assert.equal((await post({ edicaoId: "RELAMP-1", valor: 3 })).status, 409);
  EDICAO = { id: "PROG-7", tipo: "programado", status: "encerrado" };
  assert.equal((await post({ edicaoId: "PROG-7", valor: 3 })).status, 409);
  assert.equal(palpites.length, 0);
  assert.deepEqual(rpcs, []);
});
