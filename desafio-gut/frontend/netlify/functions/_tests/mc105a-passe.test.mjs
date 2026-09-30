// MC105a Frente A — repositório do Passe (`_lib/passe.mjs`) sobre o duplo fiel do Supabase
// (`_supabase-duplo-mc105a.mjs`: UNIQUE 23505, CHECKs e DEFAULTs da migração, 22P02 em uuid, eq(null) recusado).
// node --test --experimental-test-module-mocks _tests/mc105a-passe.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

let S = criarSupabase();
mock.module("../_lib/supabase-client.mjs", { namedExports: { getSupabase: () => S.cliente, getSupabaseReadOnly: () => S.cliente, supabaseConfigurado: () => true } });
const P = await import("../_lib/passe.mjs");

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const ED = "PROG-7", PROD = "11111111-2222-3333-4444-555555555555", PROD2 = "99999999-2222-3333-4444-555555555555";
beforeEach(() => { S = criarSupabase(); });

test("A1 criarPasse grava UMA linha com os DEFAULTs da tabela e o endereço normalizado", async () => {
  const r = await P.criarPasse({ endereco: A.toUpperCase().replace("0X", "0x"), edicaoId: ED, produtoId: PROD });
  assert.equal(r.ok, true); assert.equal(r.criado, true);
  assert.equal(S.tabelas.passes.length, 1);
  const l = S.tabelas.passes[0];
  assert.equal(l.endereco, A);
  assert.deepEqual([l.edicao_id, l.produto_id, l.palpite_usado, l.status], [ED, PROD, false, "activo"]);
  assert.deepEqual(l.cupons_ids, []);
  assert.match(l.id, /^[0-9a-f-]{36}$/);
  assert.deepEqual(r.passe, l);
});

test("A2 criar 2× o mesmo → 1 só linha; a 2.ª devolve o existente (criado:false, mesmo id)", async () => {
  const r1 = await P.criarPasse({ endereco: A, edicaoId: ED, produtoId: PROD });
  const r2 = await P.criarPasse({ endereco: A, edicaoId: ED, produtoId: PROD });
  assert.equal(S.tabelas.passes.length, 1);
  assert.equal(r2.ok, true); assert.equal(r2.criado, false);
  assert.equal(r2.passe.id, r1.passe.id);
});

test("A3 corrida: um INSERT concorrente ganha → o perdedor devolve o do vencedor, sem duplicar", async () => {
  S.g.antesDeInserir = (tab, linha, t) => { t.passes.push({ id: "00000000-0000-4000-8000-000000000001", ...linha, comprado_em: "x", palpite_usado: false, cupons_ids: [], status: "activo" }); };
  const r = await P.criarPasse({ endereco: A, edicaoId: ED, produtoId: PROD });
  assert.equal(r.ok, true); assert.equal(r.criado, false);
  assert.equal(r.passe.id, "00000000-0000-4000-8000-000000000001");
  assert.equal(S.tabelas.passes.length, 1);
});

test("A4 chaves diferentes (outro produto, outro comprador) são passes diferentes", async () => {
  await P.criarPasse({ endereco: A, edicaoId: ED, produtoId: PROD });
  await P.criarPasse({ endereco: A, edicaoId: ED, produtoId: PROD2 });
  await P.criarPasse({ endereco: B, edicaoId: ED, produtoId: PROD });
  assert.equal(S.tabelas.passes.length, 3);
});

test("A5 lerPasse: existente → devolve; inexistente → null; chave inválida → null sem consultar", async () => {
  const { passe } = await P.criarPasse({ endereco: A, edicaoId: ED, produtoId: PROD });
  assert.deepEqual(await P.lerPasse({ endereco: A, edicaoId: ED, produtoId: PROD }), passe);
  assert.equal(await P.lerPasse({ endereco: B, edicaoId: ED, produtoId: PROD }), null);
  // mesmo comprador, mesma edição, OUTRO produto: a chave inteira decide (não só endereço+edição)
  const { passe: p2 } = await P.criarPasse({ endereco: A, edicaoId: ED, produtoId: PROD2 });
  assert.equal((await P.lerPasse({ endereco: A, edicaoId: ED, produtoId: PROD2 })).id, p2.id);
  assert.equal((await P.lerPasse({ endereco: A, edicaoId: ED, produtoId: PROD })).id, passe.id);
  const antes = S.g.chamadas.length;
  assert.equal(await P.lerPasse({ endereco: "0x123", edicaoId: ED, produtoId: PROD }), null);
  assert.equal(S.g.chamadas.length, antes);
});

test("A6 listarPassesDoComprador: só os dele, pela ordem de compra", async () => {
  await P.criarPasse({ endereco: A, edicaoId: ED, produtoId: PROD });
  await P.criarPasse({ endereco: B, edicaoId: ED, produtoId: PROD });
  await new Promise((r) => setTimeout(r, 5));
  await P.criarPasse({ endereco: A, edicaoId: "PROG-8", produtoId: PROD2 });
  const l = await P.listarPassesDoComprador(A);
  assert.deepEqual(l.map((p) => [p.endereco, p.edicao_id]), [[A, ED], [A, "PROG-8"]]);
  assert.deepEqual(await P.listarPassesDoComprador("lixo"), []);
});

test("A7 marcarPalpiteUsado: marca 1×; a 2.ª é palpite_ja_usado; id inexistente/inválido → passe_nao_encontrado", async () => {
  const { passe } = await P.criarPasse({ endereco: A, edicaoId: ED, produtoId: PROD });
  const r = await P.marcarPalpiteUsado(passe.id);
  assert.equal(r.ok, true); assert.equal(r.passe.palpite_usado, true);
  assert.equal(S.tabelas.passes[0].palpite_usado, true);
  assert.equal(S.tabelas.passes[0].status, "activo", "não mexe no status");
  assert.deepEqual(await P.marcarPalpiteUsado(passe.id), { ok: false, code: "palpite_ja_usado" });
  assert.deepEqual(await P.marcarPalpiteUsado("00000000-0000-4000-8000-00000000abcd"), { ok: false, code: "passe_nao_encontrado" });
  assert.deepEqual(await P.marcarPalpiteUsado("nao-e-uuid"), { ok: false, code: "passe_nao_encontrado" });
});

test("A8 entrada inválida não grava; erro do Supabase não passa por sucesso", async () => {
  assert.deepEqual(await P.criarPasse({ endereco: "0x123", edicaoId: ED, produtoId: PROD }), { ok: false, code: "params_invalidos" });
  assert.deepEqual(await P.criarPasse({ endereco: A, edicaoId: "", produtoId: PROD }), { ok: false, code: "params_invalidos" });
  assert.equal(S.tabelas.passes.length, 0);
  S.g.falhar.passes = { code: "XX000" };
  assert.deepEqual(await P.criarPasse({ endereco: A, edicaoId: ED, produtoId: PROD }), { ok: false, code: "gravar_passe_falhou" });
  await assert.rejects(P.lerPasse({ endereco: A, edicaoId: ED, produtoId: PROD }));
  await assert.rejects(P.listarPassesDoComprador(A));
  assert.deepEqual(await P.marcarPalpiteUsado("00000000-0000-4000-8000-000000000001"), { ok: false, code: "gravar_passe_falhou" });
});

test("A9 corrida 23505 cuja releitura NÃO encontra o vencedor → ok:false (não passa por sucesso com passe null)", async () => {
  S.g.antesDeInserir = (tab, linha, t) => { t.passes.push({ id: "00000000-0000-4000-8000-00000000000b", ...linha, comprado_em: "x", palpite_usado: false, cupons_ids: [], status: "activo" }); };
  let n = 0; const orig = S.cliente.from;
  S.cliente.from = (t) => { if (t === "passes" && ++n === 2) S.tabelas.passes.length = 0; return orig(t); };
  assert.deepEqual(await P.criarPasse({ endereco: A, edicaoId: ED, produtoId: PROD }), { ok: false, code: "gravar_passe_falhou" });
});

test("A10 corrida 23505 cuja releitura LANÇA (rede) → ok:false, nunca excepção (quem chamou já debitou)", async () => {
  S.g.antesDeInserir = (tab, linha, t) => {
    t.passes.push({ id: "00000000-0000-4000-8000-00000000000c", ...linha, comprado_em: "x", palpite_usado: false, cupons_ids: [], status: "activo" });
    S.g.falhar.passes = { op: "select", code: "" };
  };
  assert.deepEqual(await P.criarPasse({ endereco: A, edicaoId: ED, produtoId: PROD }), { ok: false, code: "gravar_passe_falhou" });
});
