// UTAC106d-v2 — testes do modelo Via B (`_lib/passe-pontos.mjs` + `comprar-passe-pontos.mjs`).
//
// Duplos (só nas fronteiras de I/O, como os testes do Via A):
//   - `@netlify/blobs`  → `_blobs-cas-duplo.mjs` (rate-limit + kill-switch + fallback de saldo legado);
//   - Supabase          → `_supabase-duplo-mc105a.mjs` (saldo R$ real, CAS) **+** uma tabela `pontos`
//                          modelada AQUI (inline), para NÃO tocar no duplo partilhado do Via A;
//   - `sentry-server`   → espiado.
// O `_lib/saldoRs.mjs` é o REAL (débito CAS + reembolso). O `_lib/passe-pontos.mjs` é o REAL.
//
// node --test --experimental-test-module-mocks _tests/passe-pontos.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarBlobs } from "./_blobs-cas-duplo.mjs";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

process.env.JWT_SECRET = "segredo-de-teste-passe-pontos-com-comprimento-suficiente";

// ── Tabela `pontos` (inline) sobre o duplo do Via A (saldo R$) ───────────────────────────────────
function criarPontos(tabelas, g) {
  const COLS = ["endereco", "pontos", "historico", "atualizado_em"];
  const erro = (code, message) => ({ data: null, error: { code, message, details: null, hint: null } });
  return (tab) => {
    if (tab !== "pontos") throw new Error(`duplo: tabela ${tab} não modelada (pontos-test)`);
    const st = { op: "select", filtros: [], retorno: false, dados: null, terminal: null };
    const api = {
      select() { if (st.op !== "select") st.retorno = true; return api; },
      insert(d) { st.op = "insert"; st.dados = d; return api; },
      update(d) { st.op = "update"; st.dados = d; return api; },
      upsert(d) { st.op = "upsert"; st.dados = d; return api; },
      eq(c, v) { st.filtros.push([c, v]); return api; },
      maybeSingle() { st.terminal = "maybe"; return api; },
      single() { st.terminal = "single"; return api; },
      then(res, rej) { return Promise.resolve().then(exec).then(res, rej); },
    };
    // Espelha o rigor do duplo do Via A: método não modelado → LANÇA (um duplo permissivo esconde defeitos).
    for (const m of ["neq", "gt", "lt", "in", "is", "or", "filter", "limit", "range", "order", "delete"]) {
      api[m] = () => { throw new Error(`duplo: .${m}() não modelado — acrescentar com a semântica real`); };
    }
    function validar(linha) {
      for (const c of Object.keys(linha)) if (!COLS.includes(c)) return erro("42703", `column "${c}" does not exist`);
      if (linha.endereco == null || linha.pontos == null) return erro("23502", "null value in column");
      if (!Number.isInteger(linha.pontos) || linha.pontos < 0) return erro("23514", "pontos_nao_negativos_check");
      if (!Array.isArray(linha.historico)) return erro("23514", "pontos_historico_array_check");
      return null;
    }
    function exec() {
      g.chamadas.push(`pontos:${st.op}`);
      const f = g.falhar.pontos;
      if (f && (!f.op || f.op === st.op)) return erro(f.code ?? "XX000", "falha simulada");
      const casa = (l) => st.filtros.every(([c, v]) => l[c] === v || l[c] === String(v) || Number(l[c]) === Number(v));
      let linhas;
      if (st.op === "insert" || st.op === "upsert") {
        if (g.antesDeInserirPontos) { const h = g.antesDeInserirPontos; g.antesDeInserirPontos = null; h(tabelas, st.dados); }
        const nova = { historico: [], atualizado_em: new Date().toISOString(), ...st.dados };
        const e = validar(nova); if (e) return e;
        if (tabelas.pontos.some((o) => o.endereco === nova.endereco)) return erro("23505", "duplicate key value violates unique constraint");
        tabelas.pontos.push(nova); linhas = [nova];
      } else if (st.op === "update") {
        for (const c of Object.keys(st.dados)) if (!COLS.includes(c)) return erro("42703", `column "${c}" does not exist`);
        // Hook de concorrência: simula outro escritor a mudar a linha ENTRE a leitura e o UPDATE (antes do filtro).
        if (g.antesDeActualizarPontos) { const hh = g.antesDeActualizarPontos; g.antesDeActualizarPontos = null; hh(tabelas.pontos); }
        linhas = tabelas.pontos.filter(casa);
        const cands = linhas.map((l) => ({ ...l, ...st.dados }));
        for (const c of cands) { const e = validar(c); if (e) return e; }
        linhas.forEach((l) => Object.assign(l, st.dados));
      } else {
        linhas = tabelas.pontos.filter(casa);
      }
      const copia = linhas.map((l) => structuredClone(l));
      if (st.op !== "select" && !st.retorno) return { data: null, error: null };
      if (st.terminal === "maybe") return { data: copia[0] ?? null, error: null };
      if (st.terminal === "single") return copia.length === 1 ? { data: copia[0], error: null } : erro("PGRST116", "no/too many rows");
      return { data: copia, error: null };
    }
    return api;
  };
}

const alertas = [];
let B = criarBlobs(), S = criarSupabase();
function novoCliente() {
  B = criarBlobs(); S = criarSupabase();
  S.tabelas.pontos = [];
  S.g.falhar = S.g.falhar ?? {};
  const fromPontos = criarPontos(S.tabelas, S.g);
  const baseFrom = S.cliente.from;
  return { from: (t) => (t === "pontos" ? fromPontos(t) : baseFrom(t)) };
}
let cliente = novoCliente();

mock.module("@netlify/blobs", { namedExports: { getStore: (o) => B.getStore(o) } });
mock.module("../_lib/supabase-client.mjs", { namedExports: {
  getSupabase: () => cliente, getSupabaseReadOnly: () => cliente, supabaseConfigurado: () => true } });
mock.module("../_lib/sentry-server.mjs", { namedExports: {
  captureSecurityAlert: async (k, p) => { alertas.push([k, p]); }, Sentry: {} } });

const P = await import("../_lib/passe-pontos.mjs");
const { default: handler } = await import("../comprar-passe-pontos.mjs");
const { assinarUserSession } = await import("../_lib/jwt.mjs");

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OUTRO = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const h = (hh) => new Date(Date.now() + hh * 3600_000).toISOString();
const K = (n) => `idem-key-0000${n}`;

beforeEach(() => {
  cliente = novoCliente();
  alertas.length = 0;
  S.tabelas.saldo_rs.push({ cliente_id: A, payload: { centavos: 500 }, atualizado_em: "x" });
});
const saldo = () => S.tabelas.saldo_rs.find((l) => l.cliente_id === A)?.payload?.centavos;

let ip = 0;
async function comprar({ token, key = K(1), ipFixo, metodo = "POST", semToken = false } = {}) {
  const tk = token ?? (semToken ? null : await assinarUserSession(A));
  const req = new Request("https://x/.netlify/functions/comprar-passe-pontos", {
    method: metodo,
    body: metodo === "POST" ? JSON.stringify({ idempotencyKey: key }) : undefined,
    headers: { "content-type": "application/json", "x-nf-client-connection-ip": ipFixo ?? `10.2.0.${++ip % 250}`, ...(tk ? { authorization: `Bearer ${tk}` } : {}) },
  });
  const r = await handler(req);
  return { status: r.status, corpo: await r.json().catch(() => null) };
}

// ── Constantes da regra (não podem ser números mágicos) ──────────────────────────────────────────
test("K1 a REGRA está em constantes fixas: 1 Passe = 1 ponto, 50 pontos = 1 cartão, R$ 2,00 = 200 centavos", () => {
  assert.equal(P.PONTOS_POR_PASSE, 1);
  assert.equal(P.PONTOS_POR_CARTAO, 50);
  assert.equal(P.VALOR_PASSE_RS, 2.00);
  assert.equal(P.VALOR_PASSE_CENTAVOS, 200);
});

// ── Funções puras (repositório) ──────────────────────────────────────────────────────────────────
test("F1 lerPontos: endereço inexistente → null; endereço inválido → null SEM consultar", async () => {
  assert.equal(await P.lerPontos(A), null);
  const antes = S.g.chamadas.length;
  assert.equal(await P.lerPontos("0x123"), null);
  assert.equal(S.g.chamadas.length, antes, "chave inválida não chega ao Supabase");
});

test("F2 creditarPontos: os pontos sobem e o histórico cresce (entrada {data,tipo,pontos,ref})", async () => {
  const r = await P.creditarPontos(A, 1, "compra", K(1));
  assert.equal(r.ok, true); assert.equal(r.criado, true); assert.equal(r.pontos, 1);
  assert.equal(S.tabelas.pontos.length, 1);
  const l = S.tabelas.pontos[0];
  assert.equal(l.endereco, A); assert.equal(l.pontos, 1);
  assert.equal(l.historico.length, 1);
  assert.deepEqual(Object.keys(l.historico[0]).sort(), ["data", "pontos", "ref", "tipo"]);
  assert.equal(l.historico[0].tipo, "compra"); assert.equal(l.historico[0].pontos, 1); assert.equal(l.historico[0].ref, K(1));
  assert.match(l.historico[0].data, /^\d{4}-\d{2}-\d{2}T/);
});

test("F3 creditarPontos é idempotente por `ref`: a mesma chave credita UMA vez", async () => {
  await P.creditarPontos(A, 1, "compra", K(1));
  const r2 = await P.creditarPontos(A, 1, "compra", K(1));
  assert.equal(r2.ok, true); assert.equal(r2.criado, false); assert.equal(r2.pontos, 1);
  assert.equal(S.tabelas.pontos[0].historico.length, 1);
});

test("F4 getPontos: inexistente → 0; assinala erro do Supabase (não engole)", async () => {
  assert.equal(await P.getPontos(A), 0);
  S.g.falhar.pontos = { op: "select", code: "XX000" };
  await assert.rejects(P.getPontos(A));
});

test("F5 debitarPontos com saldo suficiente → OK e pontos descem", async () => {
  await P.creditarPontos(A, 3, "compra", K(1));
  const r = await P.debitarPontos(A, 2, "resgate", K(2));
  assert.equal(r.ok, true); assert.equal(r.pontos, 1);
  assert.equal(S.tabelas.pontos[0].pontos, 1);
});

test("F6 debitarPontos com saldo insuficiente → PONTOS_INSUFICIENTES; nada muda (nunca negativo)", async () => {
  await P.creditarPontos(A, 1, "compra", K(1));
  const r = await P.debitarPontos(A, 50, "resgate", K(2));
  assert.equal(r.ok, false); assert.equal(r.code, "PONTOS_INSUFICIENTES");
  assert.equal(S.tabelas.pontos[0].pontos, 1);
  assert.equal(S.tabelas.pontos[0].historico.length, 1);
});

// ⚠️ UTAC106f — ATENÇÃO AO LER ISTO (a asserção abaixo continua VÁLIDA para a função que testa, mas
// essa função DEIXOU de decidir o cartão): o achado ⚠️ R1 do validador adversarial mostrou que
// `podeResgatarCartao` compara o TOTAL (compra + bónus de palpite) ⇒ 48 de compra + 2 de bónus
// desbloqueava o cartão, contra o requisito «o palpite NÃO decide o cartão» (Google Play). A decisão
// do operador (opção A) passou a regra para `podeResgatarCartaoComCompra()` (só `compra`/`resgate`),
// que é o que `ler-pontos` usa. **Quem for mexer no resgate (106g) usa a função NOVA**; esta fica
// como está (nada apagado) e NÃO tem consumidores de produção.
test("F7 podeResgatarCartao: 49 → false; 50 → true", async () => {
  await P.creditarPontos(A, 49, "compra", K(1));
  assert.equal(await P.podeResgatarCartao(A), false);
  await P.creditarPontos(A, 1, "compra", K(2));
  assert.equal(await P.podeResgatarCartao(A), true);
});

test("F8 argumentos inválidos são recusados sem tocar na BD", async () => {
  assert.equal((await P.creditarPontos("0x123", 1, "compra", K(1))).code, "ENDERECO_INVALIDO");
  assert.equal((await P.creditarPontos(A, 0, "compra", K(1))).code, "QUANTIDADE_INVALIDA");
  assert.equal((await P.creditarPontos(A, 1, "inventado", K(1))).code, "TIPO_INVALIDO");
  assert.equal((await P.creditarPontos(A, 1, "compra", "")).code, "REF_INVALIDA");
  assert.equal(S.tabelas.pontos.length, 0);
});

test("F9 CAS: se `pontos` muda entre a leitura e a gravação (escritor concorrente), o módulo RELÊ e aplica — sem lost update", async () => {
  S.tabelas.pontos.push({ endereco: A, pontos: 0, historico: [], atualizado_em: h(0) });
  // Outro escritor credita +5 no intervalo entre a leitura e o UPDATE: o CAS (.eq("pontos", base)) perde e relê.
  S.g.antesDeActualizarPontos = (linhas) => { linhas[0].pontos = 5; };
  const r = await P.creditarPontos(A, 1, "compra", K(1));
  assert.equal(r.ok, true); assert.equal(r.criado, true);
  assert.equal(r.pontos, 6, "5 (concorrente) + 1 (meu) — sem o CAS o +5 seria perdido (lost update)");
  assert.equal(S.tabelas.pontos[0].pontos, 6);
  assert.equal(S.tabelas.pontos[0].historico.length, 1);
});

// ── Endpoint ─────────────────────────────────────────────────────────────────────────────────────
test("E1 compra válida → 201, R$ 2,00 debitado (500→300) e 1 ponto creditado", async () => {
  const r = await comprar({ key: K(1) });
  assert.equal(r.status, 201, JSON.stringify(r.corpo));
  assert.equal(r.corpo.idempotent, false); assert.equal(r.corpo.pontos, 1);
  assert.deepEqual([r.corpo.saldoRsAntesCentavos, r.corpo.saldoRsDepoisCentavos], [500, 300]);
  assert.equal(saldo(), 300);
  assert.equal(S.tabelas.pontos[0].pontos, 1);
});

test("E2 duplo clique (mesma idempotencyKey) → 200 idempotente, 1 ponto, 1 só débito", async () => {
  const r1 = await comprar({ key: K(1) });
  const antes = S.g.chamadas.length;
  const r2 = await comprar({ key: K(1) });
  assert.equal(r2.status, 200); assert.equal(r2.corpo.idempotent, true); assert.equal(r2.corpo.pontos, 1);
  assert.equal(S.g.chamadas.slice(antes).some((c) => c.startsWith("saldo_rs")), false, "a 2.ª não toca no saldo");
  assert.equal(saldo(), 300);
  assert.equal(S.tabelas.pontos[0].historico.length, 1);
});

test("E3 sem token → 401; token forjado → 401; nada debitado", async () => {
  assert.equal((await comprar({ semToken: true })).status, 401);
  assert.equal((await comprar({ token: "x.y.z" })).status, 401);
  assert.equal(saldo(), 500); assert.equal(S.tabelas.pontos.length, 0);
});

test("E4 idempotencyKey ausente/curta → 400; nada debitado", async () => {
  assert.equal((await comprar({ key: "" })).status, 400);
  assert.equal((await comprar({ key: "curta" })).status, 400);
  assert.equal((await comprar({ key: "com espaço inválido" })).status, 400);
  assert.equal(saldo(), 500);
});

test("E5 saldo insuficiente → 402, sem crédito de pontos", async () => {
  S.tabelas.saldo_rs[0].payload = { centavos: 100 };
  const r = await comprar({ key: K(1) });
  assert.equal(r.status, 402); assert.equal(r.corpo.error.code, "saldo_insuficiente");
  assert.equal(S.tabelas.pontos.length, 0); assert.equal(saldo(), 100);
});

test("E6 falha no CRÉDITO depois do débito → 502 e auto-reembolso (saldo volta a 500)", async () => {
  S.g.falhar.pontos = { op: "insert", code: "XX000" };
  const r = await comprar({ key: K(1) });
  assert.equal(r.status, 502, JSON.stringify(r.corpo));
  assert.equal(r.corpo.error.code, "creditar_pontos_falhou");
  assert.equal(r.corpo.error.reembolsado, true);
  assert.equal(saldo(), 500, "o R$ 2,00 foi devolvido");
  assert.equal(S.tabelas.pontos.length, 0);
});

test("E7 CORRIDA na mesma chave: a ref aparece entre a leitura e o INSERT → reembolso, 200 idempotente", async () => {
  S.g.antesDeInserirPontos = (tabelas, dados) => {
    tabelas.pontos.push({ endereco: dados.endereco, pontos: 1, historico: [{ data: h(0), tipo: "compra", pontos: 1, ref: K(1) }], atualizado_em: h(0) });
  };
  const r = await comprar({ key: K(1) });
  assert.equal(r.status, 200, JSON.stringify(r.corpo));
  assert.equal(r.corpo.idempotent, true); assert.equal(r.corpo.reembolsado, true); assert.equal(r.corpo.pontos, 1);
  assert.equal(saldo(), 500, "500 − 200 (débito) + 200 (reembolso)");
  assert.equal(S.tabelas.pontos.length, 1);
});

test("E8 só POST: GET → 405; preflight OPTIONS passa; kill-switch → 503", async () => {
  assert.equal((await comprar({ metodo: "GET", ipFixo: "10.7.7.1" })).status, 405);
  const opt = await handler(new Request("https://x/.netlify/functions/comprar-passe-pontos", { method: "OPTIONS" }));
  assert.ok(opt.status < 300, `OPTIONS → ${opt.status}`);
  B.gravar("system-state", "state", { status: "paused" });
  const pausa = await comprar({ key: K(9), ipFixo: "10.7.7.2" });
  assert.equal(pausa.status, 503); assert.equal(pausa.corpo.error.code, "sistema_pausado");
  assert.equal(saldo(), 500);
});

test("E9 o comprador é o TITULAR do token (o body não escolhe outro endereço)", async () => {
  const tk = await assinarUserSession(A);
  const req = new Request("https://x/.netlify/functions/comprar-passe-pontos", {
    method: "POST", body: JSON.stringify({ idempotencyKey: K(1), endereco: OUTRO }),
    headers: { "content-type": "application/json", authorization: `Bearer ${tk}`, "x-nf-client-connection-ip": "10.8.8.1" },
  });
  const r = await handler(req);
  assert.equal(r.status, 201);
  assert.equal(S.tabelas.pontos[0].endereco, A);
});

test("E10 P10: nenhum log leva o endereço completo", async () => {
  const linhas = [];
  const o = { info: console.info, warn: console.warn, error: console.error, log: console.log };
  for (const k of Object.keys(o)) console[k] = (...a) => linhas.push(a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "));
  try { await comprar({ key: K(1) }); S.g.falhar.pontos = { op: "insert", code: "XX000" }; await comprar({ key: K(2) }); }
  finally { Object.assign(console, o); }
  assert.ok(linhas.length > 0, "controlo: houve logs");
  assert.equal(linhas.some((l) => l.toLowerCase().includes(A.slice(2))), false, linhas.join("\n"));
});
