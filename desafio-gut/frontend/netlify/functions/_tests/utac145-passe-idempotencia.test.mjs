// UTAC145 (Frente A) — ℹ️3 do SEG4 do UTAC142: «um lance pode ser contado duas vezes e adiantar o consumo do Passe».
// Cenário real: a escrita da contagem CHEGA ao armazenamento, mas a resposta perde-se (503) e quem chama repete.
//   - No Blob (UTAC142.1): o retry interno do @netlify/blobs leva 412 e o CAS volta a somar ⇒ 1 lance conta 2.
//   - No Postgres (UTAC145): a RPC grava e responde erro; o código repete com o MESMO lance_id ⇒ a chave única devolve
//     o resultado já gravado, e nem conta nem consome outra vez.
// A asserção é a da REGRA (R18-142.1-A, intocada): com 3 lances, o Passe sai no 3.º, uma única vez.
// Os dois duplos (Blob e RPC) têm a falha injectada no 1.º lance; o teste passa por qualquer implementação correcta.
//
// REAIS: `lance-relampago.mjs`, `_lib/passe-a-cada-lances.mjs`, `_lib/especial-config.mjs`.
// node --test --experimental-test-module-mocks _tests/utac145-passe-idempotencia.test.mjs
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const ADDR = "0x5baf46609dd9188e081cc78f70e61a6ea07f32b8";
const ESP = "ESPECIAL-RELAMPAGO1";
let mockPontos = 0, refsLedger = new Set();
let inv = { passes_relampago: 0 };      // inventário partilhado pelos dois caminhos (JS e RPC)
let consumosInventario = 0;
let falharBlobUmaVez = false, falharRpcUmaVez = false;
let falharRpcNoLance = 0;   // falha (gravou, resposta perdida) só na chamada N
let argsRpc = [];           // o que a RPC recebeu (para provar que o lance_id é o do lance)

// ── Blob com ETag; a falha: grava e responde «não gravado» (o 503 que o retry interno transforma em 412) ──
const stores = new Map();
const etag = (v) => `"${createHash("sha1").update(v).digest("hex")}"`;
function store(name) {
  if (!stores.has(name)) {
    const m = new Map();
    stores.set(name, {
      m,
      async get(k, { type } = {}) { const v = m.get(k); return v === undefined ? null : (type === "json" ? JSON.parse(v) : v); },
      async getWithMetadata(k, { type } = {}) { const v = m.get(k); return v === undefined ? null : { data: type === "json" ? JSON.parse(v) : v, etag: etag(v) }; },
      async set(k, v, o = {}) {
        if (o.onlyIfNew && m.has(k)) return { modified: false };
        if (o.onlyIfMatch && (!m.has(k) || etag(m.get(k)) !== o.onlyIfMatch)) return { modified: false };
        m.set(k, String(v));
        if (name === "especial-lances-passe" && falharBlobUmaVez) { falharBlobUmaVez = false; return { modified: false }; }
        return { modified: true, etag: etag(String(v)) };
      },
      async setJSON(k, o) { m.set(k, JSON.stringify(o)); return { modified: true }; },
      async list() { return { blobs: [...m.keys()].map((key) => ({ key })) }; },
      async delete(k) { m.delete(k); },
    });
  }
  return stores.get(name);
}

// ── RPC do Postgres (modelo da migração 20261120_utac145): lance_id chave única, conta e consome na MESMA transacção ──
let linhas = new Map(); // lance_id → { edicao, endereco, posicao, passe_consumido }
function rpcRegistarLancePasse({ p_lance_id, p_edicao_id, p_endereco, p_a_cada }) {
  const ja = linhas.get(p_lance_id);
  if (ja) return [{ posicao_lance: ja.posicao, passe_gasto: ja.passe_consumido, novo: false, passes_restantes: inv.passes_relampago }];
  const posicao = [...linhas.values()].filter((l) => l.edicao === p_edicao_id && l.endereco === p_endereco).length + 1;
  let passe_consumido = false;
  if (p_a_cada > 0 && posicao % p_a_cada === 0 && inv.passes_relampago >= 1) { inv.passes_relampago -= 1; consumosInventario++; passe_consumido = true; }
  linhas.set(p_lance_id, { edicao: p_edicao_id, endereco: p_endereco, posicao, passe_consumido });
  return [{ posicao_lance: posicao, passe_gasto: passe_consumido, novo: true, passes_restantes: inv.passes_relampago }];
}
const supabaseDuplo = {
  async rpc(nome, args) {
    if (nome !== "registar_lance_passe") return { data: null, error: { message: `rpc inesperada ${nome}` } };
    argsRpc.push(args);
    const data = rpcRegistarLancePasse(args);
    if (falharRpcUmaVez) { falharRpcUmaVez = false; return { data: null, error: { message: "503 upstream" } }; } // gravou, resposta perdida
    if (falharRpcNoLance && linhas.size === falharRpcNoLance && argsRpc.filter((a) => a.p_lance_id === args.p_lance_id).length === 1) {
      return { data: null, error: { message: "503 upstream" } };
    }
    return { data, error: null };
  },
  from() { throw new Error("from() não esperado neste teste"); },
};

mock.module("@netlify/blobs", { namedExports: { getStore: (o) => store(typeof o === "string" ? o : o.name) } });
mock.module("../_lib/supabase-client.mjs", { namedExports: {
  getSupabase: () => supabaseDuplo, getSupabaseReadOnly: () => supabaseDuplo, supabaseConfigurado: () => true } });
mock.module("../_lib/jwt.mjs", { namedExports: { verificarLanceAuth: async () => ({ endereco: ADDR }) } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/rbac.mjs", { namedExports: { getRole: async () => ({ role: "user" }) } });
mock.module("../_lib/require-mfa.mjs", { namedExports: { requireMfa: () => null } });
mock.module("../_lib/system-state.mjs", { namedExports: { lerEstadoSistema: async () => ({}), sistemaPausado: () => false } });
mock.module("../_lib/notificacoes-usuario.mjs", { namedExports: { registrarEventosDeLance: async () => {} } });
mock.module("../_lib/data-store.mjs", { namedExports: { addLance: async (e, r) => `key-${e}-${r.lanceId}` } });
mock.module("../_lib/ranking-especial.mjs", { namedExports: { registarNoRankingEspecial: async () => ({ ok: true, posicao: 1 }) } });
mock.module("../_lib/contract.mjs", { namedExports: { comprometerLanceOnchain: async () => ({}), lerSaldoSenhas: async () => 5 } });
mock.module("../_lib/edicoes-core.mjs", { namedExports: { buscarEdicao: async () => ({
  id: ESP, tipo: "relampago", status: "ativo",
  inicio_em: new Date(Date.now() - 3600e3).toISOString(), termino_em: new Date(Date.now() + 3600e3).toISOString(),
}) } });
mock.module("../_lib/saldoRs.mjs", { namedExports: { debitarSaldoRs: async () => ({ ok: true, resultado: {} }) } });
mock.module("../_lib/fontes-lance.mjs", { namedExports: { creditarMissaoLance: async () => ({ ok: true, creditado: false }), PONTOS_MISSAO_LANCE: 10 } });
mock.module("../_lib/passes-inventario.mjs", { namedExports: {
  consumirPasse: async () => { if (inv.passes_relampago < 1) return { ok: false, code: "sem_passes" }; inv.passes_relampago -= 1; consumosInventario++; return { ok: true, restantes: inv.passes_relampago }; },
  devolverPasse: async () => { inv.passes_relampago += 1; return { ok: true }; },
  creditarPasse: async () => ({ ok: true }), lerInventario: async () => ({ ok: true, passesRelampago: inv.passes_relampago, passesProgramado: 0 }),
} });
mock.module("../_lib/ledger-lance.mjs", { namedExports: {
  consumirPontosLance: async (e, valor, ref) => {
    if (refsLedger.has(ref)) return { ok: true, criado: false, pontos: mockPontos };
    refsLedger.add(ref); mockPontos -= valor; return { ok: true, criado: true, pontos: mockPontos };
  },
  reverterMovimentoLance: async () => ({ ok: true, revertido: true }),
  creditarPontosLance: async () => ({ ok: true, criado: true, pontos: mockPontos }),
  lerLedgerLance: async () => ({ creditos: 0, pontos: mockPontos, historico: [] }),
  PONTOS_LANCE_BONUS_PASSE_RELAMPAGO: 100,
} });
mock.module("../_lib/cors.mjs", { namedExports: { respostaPreflight: () => null, CABECALHOS_CORS: { "access-control-allow-origin": "*" }, cabecalhosCors: () => ({ "access-control-allow-origin": "*" }) /* UTAC153 */ } });

let handler;
before(async () => { process.env.NETWORK_STAGE = "mainnet"; handler = (await import("../lance-relampago.mjs")).default; });
beforeEach(() => {
  stores.clear(); linhas = new Map(); refsLedger = new Set(); mockPontos = 100;
  inv = { passes_relampago: 5 }; consumosInventario = 0; falharBlobUmaVez = false; falharRpcUmaVez = false;
  falharRpcNoLance = 0; argsRpc = [];
});
async function lance(valor) {
  const r = await handler({
    method: "POST",
    headers: { get: (h) => (h === "authorization" ? "Bearer t" : null) },
    text: async () => JSON.stringify({ endereco: ADDR, valorCentavos: valor, edicaoId: ESP }),
    url: "http://localhost/.netlify/functions/lance-relampago",
  });
  return { status: r.status, corpo: await r.json() };
}

test.skip("I1 · falha de resposta (503) na contagem do 1.º lance: o Passe sai no 3.º lance, UMA vez (não no 2.º) [UTAC147: «1 Passe a cada N lances» saiu — todo o lance gasta 1 Passe Relâmpago]", async () => {
  falharBlobUmaVez = true; falharRpcUmaVez = true; // a falha cai no armazenamento que a implementação usar
  const quando = [];
  for (let i = 1; i <= 3; i++) {
    const r = await lance(i);
    assert.equal(r.status, 201, JSON.stringify(r.corpo));
    if (r.corpo.passeConsumido) quando.push(i);
  }
  assert.deepEqual(quando, [3], `o Passe saiu no(s) lance(s) ${JSON.stringify(quando)} — o 1.º lance foi contado duas vezes`);
  assert.equal(consumosInventario, 1);
  assert.equal(inv.passes_relampago, 4);
});

test.skip("I2 · sem falhas: 6 lances gastam 2 Passes, no 3.º e no 6.º (a regra continua igual) [UTAC147: «1 Passe a cada N lances» saiu — todo o lance gasta 1 Passe Relâmpago]", async () => {
  const quando = [];
  for (let i = 1; i <= 6; i++) { const r = await lance(i); if (r.corpo.passeConsumido) quando.push(i); }
  assert.deepEqual(quando, [3, 6]);
  assert.equal(consumosInventario, 2);
});

test.skip("I3 · sem Passe no 3.º lance: o lance passa só com pontos e nada é consumido [UTAC147: «1 Passe a cada N lances» saiu — todo o lance gasta 1 Passe Relâmpago]", async () => {
  inv.passes_relampago = 0;
  for (let i = 1; i <= 3; i++) { const r = await lance(i); assert.equal(r.status, 201); assert.equal(r.corpo.passeConsumido, false); }
  assert.equal(consumosInventario, 0);
});

// ── a migração (fonte vigiada; o comportamento real do SQL é ensaiado em Postgres com ROLLBACK, _logs/UTAC145_*) ──
import { readFileSync } from "node:fs";
const SQL = readFileSync(new URL("../../../supabase/migrations/20261120_utac145_lances_passe.sql", import.meta.url), "utf8").replace(/^\s*--.*$/gm, "");
test("I4 · migração: lance_id é a chave; posição única por (edição, endereço); lock por carteira; só service_role", () => {
  assert.match(SQL, /lance_id\s+text primary key/);
  assert.match(SQL, /unique \(edicao_id, endereco, posicao\)/);
  assert.match(SQL, /pg_advisory_xact_lock\(hashtext\('lances_passe:' \|\| p_edicao_id \|\| ':' \|\| p_endereco\)\)/);
  assert.match(SQL, /revoke all on public\.especial_lances_passe from public, anon, authenticated;/);
  assert.match(SQL, /grant execute on function public\.registar_lance_passe\(text, text, text, integer\) to service_role;/);
  assert.doesNotMatch(SQL, /registar_lance_passe[^;]*to anon/);
});
test("I5 · migração: repetir o MESMO lance devolve o gravado ANTES de contar ou consumir", () => {
  const corpo = SQL.slice(SQL.indexOf("create or replace function public.registar_lance_passe"));
  const repete = corpo.indexOf("where e.lance_id = p_lance_id");
  const conta = corpo.indexOf("coalesce(max(e.posicao), 0) + 1");
  const consome = corpo.indexOf("public.passes_consumir(p_endereco, 'relampago', 1)");
  assert.ok(repete > 0 && conta > repete && consome > conta, "a ordem repetição → contagem → consumo foi quebrada");
  assert.match(corpo.slice(repete, conta), /if found then[\s\S]*return;/);
  // achado do ensaio em Postgres: sem linha, o SELECT … INTO deixa v_cons a NULL — tem de ser reposto antes de contar
  assert.match(corpo.slice(repete, conta), /v_cons := false;/, "falta repor v_cons (NULL viola o NOT NULL de passe_consumido)");
});

test.skip("I6 · a resposta perde-se no 3.º lance (o que GASTA o Passe): a repetição recupera «Passe gasto» e não gasta outro [UTAC147: «1 Passe a cada N lances» saiu — todo o lance gasta 1 Passe Relâmpago]", async () => {
  falharRpcNoLance = 3;
  const rs = [];
  for (let i = 1; i <= 3; i++) rs.push(await lance(i));
  assert.equal(rs[2].corpo.passeConsumido, true, "o 3.º lance gastou o Passe mas a resposta disse que não");
  assert.equal(consumosInventario, 1);
});

test.skip("I7 · a RPC recebe o id do PRÓPRIO lance (o mesmo da resposta e do ranking ao vivo) [UTAC147: «1 Passe a cada N lances» saiu — todo o lance gasta 1 Passe Relâmpago]", async () => {
  const r = await lance(7);
  assert.equal(r.status, 201);
  assert.ok(argsRpc.length >= 1);
  assert.ok(argsRpc.every((a) => a.p_lance_id === r.corpo.lanceId), JSON.stringify({ args: argsRpc.map((a) => a.p_lance_id), lanceId: r.corpo.lanceId }));
});

test("I8 · passesConsumidosNaEdicao: conta os gastos e LANÇA em falha de leitura (nunca 0 — o portador fica indeterminado)", async () => {
  const { passesConsumidosNaEdicao } = await import("../_lib/passe-a-cada-lances.mjs");
  const consulta = (resp) => ({ from: () => ({ select: () => ({ eq() { return this; }, then: (ok, ko) => Promise.resolve(resp).then(ok, ko) }) }) });
  assert.equal(await passesConsumidosNaEdicao(ESP, ADDR, { supabase: consulta({ count: 2, error: null }) }), 2);
  await assert.rejects(passesConsumidosNaEdicao(ESP, ADDR, { supabase: consulta({ count: null, error: { message: "x" } }) }));
});
