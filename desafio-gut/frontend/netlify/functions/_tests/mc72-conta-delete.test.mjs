// MC72 — Testes da lógica de exclusão de conta (_lib/conta-delete.mjs).
// A lib é injetável (recebe supabase + getStore), logo usamos mocks em memória
// diretos — sem mock.module. Cobre: hard-delete pessoal, anonimização fiscal,
// isolamento entre endereços, dry-run não-mutante e coleta fail-soft de erros.
// node --test _tests/mc72-conta-delete.test.mjs
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  excluirConta, excluirSupabase, excluirBlobs, ENDERECO_ANONIMO,
} from "../_lib/conta-delete.mjs";

const ALVO = "0xabc0000000000000000000000000000000000abc";
const OUTRO = "0xdef0000000000000000000000000000000000def";

// ── Mock Supabase (query builder thenable sobre tabelas em memória) ───────────
function fazerSupabaseMock(tabelas, { falharEm = null } = {}) {
  function match(rows, filtros) {
    return rows.filter((row) =>
      filtros.every((f) => {
        if (f.tipo === "or") return f.conds.some((c) => valorColuna(row, c.col) === c.val);
        return valorColuna(row, f.col) === f.val;
      }));
  }
  function valorColuna(row, col) {
    if (col === "payload->>endereco") return row.payload?.endereco ?? null;
    return row[col] ?? null;
  }
  function builder(tabela) {
    if (falharEm === tabela) {
      // builder que resolve com erro em qualquer terminal (simula erro Postgres).
      const errRes = { error: { message: "erro simulado" }, data: null, count: null };
      const errApi = {};
      for (const m of ["select", "delete", "update", "eq", "or"]) errApi[m] = () => errApi;
      errApi.then = (resolve) => resolve(errRes);
      return errApi;
    }
    const st = { tabela, op: null, filtros: [], updateData: null, head: false };
    const api = {
      select(_cols, opts) { if (!st.op) st.op = "select"; if (opts?.head) st.head = true; return api; },
      delete() { st.op = "delete"; return api; },
      update(data) { st.op = "update"; st.updateData = data; return api; },
      eq(col, val) { st.filtros.push({ tipo: "eq", col, val }); return api; },
      or(filtro) {
        const conds = filtro.split(",").map((p) => {
          const [col, , val] = p.split(".");
          return { col, val };
        });
        st.filtros.push({ tipo: "or", conds });
        return api;
      },
      then(resolve) {
        const rows = tabelas[st.tabela] ?? (tabelas[st.tabela] = []);
        const sel = match(rows, st.filtros);
        if (st.op === "delete") {
          for (const r of sel) rows.splice(rows.indexOf(r), 1);
          return resolve({ data: sel, error: null, count: sel.length });
        }
        if (st.op === "update") {
          for (const r of sel) Object.assign(r, st.updateData);
          return resolve({ data: sel, error: null, count: sel.length });
        }
        if (st.head) return resolve({ data: null, error: null, count: sel.length });
        return resolve({ data: sel, error: null, count: sel.length });
      },
    };
    return api;
  }
  return { from: (t) => builder(t) };
}

// ── Mock Netlify Blobs (Map por store) ───────────────────────────────────────
function fazerGetStoreMock(stores) {
  return ({ name }) => {
    const mapa = stores[name] ?? (stores[name] = new Map());
    return {
      async get(key) { return mapa.has(key) ? mapa.get(key) : null; },
      async setJSON(key, val) { mapa.set(key, val); },
      async set(key, val) { mapa.set(key, val); },
      async delete(key) { mapa.delete(key); },
      async list() { return { blobs: [...mapa.keys()].map((key) => ({ key })) }; },
    };
  };
}

let tabelas, stores;
beforeEach(() => {
  tabelas = {
    saldo_rs: [{ cliente_id: ALVO, payload: { centavos: 500 } }, { cliente_id: OUTRO, payload: { centavos: 9 } }],
    troco_senhas: [{ cliente_id: ALVO, payload: {} }],
    wallet: [{ cliente_id: ALVO, payload: {} }],
    lances: [{ endereco: ALVO, valor_centavos: 100 }, { endereco: ALVO, valor_centavos: 200 }, { endereco: OUTRO }],
    lojistas: [{ endereco: ALVO, cota: "ouro" }],
    cotas: [{ cliente_id: ALVO, endereco: ALVO }, { cliente_id: "cnpj:123", endereco: ALVO }, { cliente_id: OUTRO, endereco: OUTRO }],
    saldo_rs_creditos: [
      { pedido_id: "pix1", payload: { pedidoId: "pix1", endereco: ALVO, valorCentavos: 5000 } },
      { pedido_id: "pix2", payload: { pedidoId: "pix2", endereco: OUTRO, valorCentavos: 100 } },
    ],
    saldo_rs_debitos: [{ operacao_id: "op1", payload: { operacao_id: "op1", endereco: ALVO, valorCentavos: 300 } }],
  };
  stores = {
    "saldo-rs": new Map([[ALVO, { centavos: 500 }], [OUTRO, { centavos: 9 }]]),
    "voucher": new Map([[ALVO, { v: 1 }]]),
    "consent-log": new Map([[`1700000000:${ALVO}`, { ok: true }], [`1700000001:${OUTRO}`, { ok: true }]]),
    "lance-idem": new Map([["idemA", { endereco: ALVO }], ["idemB", { endereco: OUTRO }]]),
    "pedidos": new Map([["pedX", { endereco: ALVO, valorBRL: 10 }], ["pedY", { endereco: OUTRO }]]),
    "pedidos-pagos": new Map([["pix1", { endereco: ALVO, txHash: "0xhash" }]]),
  };
});

test("dry-run conta o que seria afetado SEM mutar", async () => {
  const supabase = fazerSupabaseMock(tabelas);
  const getStore = fazerGetStoreMock(stores);
  const m = await excluirConta({ supabase, getStore, endereco: ALVO, dryRun: true });

  assert.equal(m.dryRun, true);
  assert.equal(m.ok, true);
  assert.equal(m.supabase.deletado.lances, 2);
  assert.equal(m.supabase.deletado.cotas, 2);
  assert.equal(m.supabase.anonimizado.saldo_rs_creditos, 1);
  assert.equal(m.blobs.deletado["saldo-rs"], 1);
  assert.equal(m.blobs.deletado["consent-log"], 1);
  assert.equal(m.blobs.anonimizado["pedidos"], 1);

  // Nada foi mutado:
  assert.equal(tabelas.lances.length, 3);
  assert.equal(stores["saldo-rs"].size, 2);
  assert.equal(tabelas.saldo_rs_creditos[0].payload.endereco, ALVO);
  assert.equal(stores["pedidos"].get("pedX").endereco, ALVO);
});

test("execução real hard-deleta pessoais e preserva outro endereço", async () => {
  const supabase = fazerSupabaseMock(tabelas);
  const getStore = fazerGetStoreMock(stores);
  const m = await excluirConta({ supabase, getStore, endereco: ALVO, dryRun: false });

  assert.equal(m.ok, true);
  // Supabase hard-delete
  assert.equal(tabelas.saldo_rs.length, 1);
  assert.equal(tabelas.saldo_rs[0].cliente_id, OUTRO, "linha de OUTRO intacta");
  assert.equal(tabelas.troco_senhas.length, 0);
  assert.equal(tabelas.wallet.length, 0);
  assert.equal(tabelas.lances.length, 1);
  assert.equal(tabelas.lances[0].endereco, OUTRO);
  assert.equal(tabelas.lojistas.length, 0);
  assert.equal(tabelas.cotas.length, 1, "só a cota de OUTRO sobra");
  assert.equal(tabelas.cotas[0].endereco, OUTRO);
  // Blobs hard-delete
  assert.equal(stores["saldo-rs"].has(ALVO), false);
  assert.equal(stores["saldo-rs"].has(OUTRO), true);
  assert.equal(stores["voucher"].has(ALVO), false);
  assert.equal(stores["consent-log"].has(`1700000000:${ALVO}`), false);
  assert.equal(stores["consent-log"].has(`1700000001:${OUTRO}`), true);
  assert.equal(stores["lance-idem"].has("idemA"), false);
  assert.equal(stores["lance-idem"].has("idemB"), true);
});

test("execução real ANONIMIZA e RETÉM registros fiscais (não apaga)", async () => {
  const supabase = fazerSupabaseMock(tabelas);
  const getStore = fazerGetStoreMock(stores);
  await excluirConta({ supabase, getStore, endereco: ALVO, dryRun: false });

  // Supabase: crédito retido, mas desvinculado + valor preservado.
  assert.equal(tabelas.saldo_rs_creditos.length, 2, "nenhum crédito apagado");
  const cred = tabelas.saldo_rs_creditos.find((r) => r.pedido_id === "pix1");
  assert.equal(cred.payload.endereco, ENDERECO_ANONIMO);
  assert.equal(cred.payload.valorCentavos, 5000, "valor contábil preservado");
  assert.ok(cred.payload.anonimizadoEm, "carimbo de anonimização presente");
  // Crédito de OUTRO não foi tocado.
  const credOutro = tabelas.saldo_rs_creditos.find((r) => r.pedido_id === "pix2");
  assert.equal(credOutro.payload.endereco, OUTRO);
  // Débito também anonimizado.
  assert.equal(tabelas.saldo_rs_debitos[0].payload.endereco, ENDERECO_ANONIMO);

  // Blobs financeiros: retidos e anonimizados.
  assert.equal(stores["pedidos"].get("pedX").endereco, ENDERECO_ANONIMO);
  assert.equal(stores["pedidos"].get("pedY").endereco, OUTRO);
  assert.equal(stores["pedidos-pagos"].get("pix1").endereco, ENDERECO_ANONIMO);
  assert.equal(stores["pedidos-pagos"].get("pix1").txHash, "0xhash", "prova on-chain retida");
});

test("erro numa tabela é fail-soft: entra em erros, demais prosseguem", async () => {
  const supabase = fazerSupabaseMock(tabelas, { falharEm: "wallet" });
  const getStore = fazerGetStoreMock(stores);
  const r = await excluirSupabase(supabase, ALVO, { dryRun: false });

  assert.equal(r.ok === undefined, true); // excluirSupabase não retorna ok
  assert.ok(r.erros.some((e) => e.includes("wallet")), "erro de wallet coletado");
  // Apesar do erro em wallet, saldo_rs foi apagado.
  assert.equal(tabelas.saldo_rs.length, 1);
  assert.equal(tabelas.lances.length, 1);
});

test("manifesto expõe DADOS_RETIDOS (disclosure Play Store)", async () => {
  const supabase = fazerSupabaseMock(tabelas);
  const getStore = fazerGetStoreMock(stores);
  const m = await excluirConta({ supabase, getStore, endereco: ALVO, dryRun: true });
  const categorias = m.retido.map((r) => r.categoria);
  assert.deepEqual(categorias.sort(), ["fiscal", "on-chain"]);
});

test("endereço é normalizado para minúsculas", async () => {
  const supabase = fazerSupabaseMock(tabelas);
  const getStore = fazerGetStoreMock(stores);
  const m = await excluirBlobs(getStore, ALVO.toUpperCase(), { dryRun: true });
  assert.equal(m.deletado["saldo-rs"], 1, "case-insensitive por normalização");
});
