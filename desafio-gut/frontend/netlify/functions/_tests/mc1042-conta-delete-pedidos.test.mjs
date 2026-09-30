// MC104.2 — O conta-delete anonimiza os PEDIDOS do titular (dono em `comprador`), preserva a
// NF-e (nº/série/chave — LGPD art. 16, I) e não toca em pedidos de terceiros nem sem dono.
// Os pedidos têm a forma real de `_lib/pedidos.mjs` (garantirPedido + validarMorada + definirNfe).
// MC104.3: o pedido passa a ser escrito por `atualizarPedido` (CAS, `@netlify/blobs` real) → o store é o
// duplo com ETag (`_blobs-cas-duplo.mjs`), injectado no conta-delete E no módulo; a gravação acrescenta
// o evento «anonimizado» ao histórico e renova `atualizado_em` (é o `gravar` do MC102.0).
// node --test --experimental-test-module-mocks _tests/mc1042-conta-delete-pedidos.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarBlobs } from "./_blobs-cas-duplo.mjs";

let B = criarBlobs();
mock.module("@netlify/blobs", { namedExports: { getStore: (o) => B.getStore(o) } });
mock.module("../_lib/cache.mjs", { namedExports: { cacheAside: async (_k, f) => f(), cacheDel: async () => {} } });
const { excluirConta, excluirBlobs, ENDERECO_ANONIMO } = await import("../_lib/conta-delete.mjs");

const ALVO = "0xabc0000000000000000000000000000000000abc";
const OUTRO = "0xdef0000000000000000000000000000000000def";
const CPF = "52998224725";
const NOME = "Fulana Destinataria";

const pedido = (id, comprador) => ({
  produtoId: id, edicaoId: "R-1", ...(comprador !== undefined ? { comprador } : {}),
  lojista: "0x1110000000000000000000000000000000000111", produtoNome: "Air Fryer",
  valorPagoCentavos: 1234, prazo_entrega_dias: 10, txHash: "0xtx",
  morada: { nome: NOME, cpf: CPF, cep: "69027010", logradouro: "Rua Cinco", numero: "86", complemento: "",
    bairro: "Centro", cidade: "Manaus", uf: "AM", telefone: "92999999999" },
  rastreio: { codigo: "AA123456789BR", transportadora: "Correios" },
  nfe: { numero: "123", serie: "1", chave: "3".repeat(44), registada_em: "2026-09-01T00:00:00.000Z" },
  criado_em: "2026-09-01T00:00:00.000Z", atualizado_em: "2026-09-01T00:00:00.000Z",
  historico: [{ evento: "venda_registada", em: "2026-09-01T00:00:00.000Z" }],
});

beforeEach(() => {
  B = criarBlobs();
  B.gravar("pedidos", "pedido:P1", pedido("P1", ALVO));
  B.gravar("pedidos", "pedido:P2", pedido("P2", OUTRO));
  B.gravar("pedidos", "pedido:P3", pedido("P3"));
  B.gravar("pedidos", "pedido:P4", { ...pedido("P4", ALVO), morada: null, nfe: null });
  B.gravar("pedidos", `comprador:${ALVO}`, { ids: ["P1", "P4"] });
});
const ler = (k) => B.ler("pedidos", k);
const todos = () => Object.fromEntries([...B.blobs.get("pedidos").keys()].filter((k) => k.startsWith("pedido:")).map((k) => [k, ler(k)]));

// Supabase vazio: o excluirConta corre por inteiro (USO), sem dados nas tabelas.
function supabaseVazio() {
  const api = {
    select: () => api, delete: () => api, update: () => api, eq: () => api, or: () => api,
    then: (r) => r({ data: [], error: null, count: 0 }),
  };
  return { from: () => api };
}

test("(a) pedido com comprador = titular é ANONIMIZADO e RETIDO (uso: excluirConta)", async () => {
  const m = await excluirConta({ supabase: supabaseVazio(), getStore: B.getStore, endereco: ALVO });
  assert.equal(m.ok, true, JSON.stringify(m.erros));
  assert.equal(m.blobs.anonimizado.pedidos, 2, "P1 e P4 são do titular");
  const p1 = ler("pedido:P1");
  assert.ok(p1, "o registo NÃO é apagado (anonimizar ≠ apagar)");
  assert.equal(p1.comprador, ENDERECO_ANONIMO);
  assert.ok(p1.anonimizadoEm);
  assert.equal(p1.valorPagoCentavos, 1234);
  assert.equal(p1.produtoId, "P1");
  assert.equal(p1.lojista, "0x1110000000000000000000000000000000000111");
});

test("(b) morada + CPF + nome substituídos por *** (nenhum valor pessoal sobra)", async () => {
  await excluirBlobs(B.getStore, ALVO, { dryRun: false });
  const p1 = ler("pedido:P1");
  assert.deepEqual(Object.keys(p1.morada).sort(),
    ["bairro", "cep", "cidade", "complemento", "cpf", "logradouro", "nome", "numero", "telefone", "uf"]);
  for (const [k, v] of Object.entries(p1.morada)) assert.equal(v, "***", `morada.${k}`);
  const texto = JSON.stringify(p1);
  for (const pessoal of [CPF, NOME, "Rua Cinco", "69027010", "92999999999", ALVO]) {
    assert.equal(texto.includes(pessoal), false, `sobrou ${pessoal}`);
  }
});

test("(c) NF-e preservada: nº, série e chave iguais (LGPD art. 16, I)", async () => {
  await excluirBlobs(B.getStore, ALVO, { dryRun: false });
  const { nfe } = ler("pedido:P1");
  assert.equal(nfe.numero, "123");
  assert.equal(nfe.serie, "1");
  assert.equal(nfe.chave, "3".repeat(44));
  assert.equal(nfe.registada_em, "2026-09-01T00:00:00.000Z");
});

test("(d) pedido de TERCEIRO e pedido SEM comprador ficam intactos", async () => {
  const antes = todos();
  await excluirBlobs(B.getStore, ALVO, { dryRun: false });
  const depois = todos();
  assert.deepEqual(depois["pedido:P2"], antes["pedido:P2"], "terceiro");
  assert.deepEqual(depois["pedido:P3"], antes["pedido:P3"], "sem comprador");
  assert.equal(Object.keys(depois).length, Object.keys(antes).length, "nenhum pedido apagado");
});

test("(e) pedido sem morada/NF-e ainda: comprador anonimizado, nulls mantidos", async () => {
  await excluirBlobs(B.getStore, ALVO, { dryRun: false });
  const p4 = ler("pedido:P4");
  assert.equal(p4.comprador, ENDERECO_ANONIMO);
  assert.equal(p4.morada, null);
  assert.equal(p4.nfe, null);
});

test("(f) dry-run conta os pedidos do titular SEM mutar", async () => {
  const antes = JSON.stringify([...B.blobs.get("pedidos")]);
  const m = await excluirConta({ supabase: supabaseVazio(), getStore: B.getStore, endereco: ALVO, dryRun: true });
  assert.equal(m.blobs.anonimizado.pedidos, 2);
  assert.equal(JSON.stringify([...B.blobs.get("pedidos")]), antes);
});

// Validador (R1): nada além de comprador/morada muda — datas, rastreio, histórico, NF-e, txHash ficam.
// (MC104.3: o CAS acrescenta 1 evento «anonimizado» ao histórico e renova `atualizado_em` — mais nada.)
test("(h) só comprador e morada mudam (+ carimbo do CAS): o resto do pedido é igual (nada apagado)", async () => {
  const completo = { ...pedido("P1", ALVO), recebido_em: "2026-09-10T00:00:00.000Z",
    rastreio: { codigo: "AA123456789BR", transportadora: "Correios", eventos: [{ data: "2026-09-05T00:00:00.000Z", codigo: "1" }] } };
  B.gravar("pedidos", "pedido:P1", completo);
  await excluirBlobs(B.getStore, ALVO, { dryRun: false });
  const { comprador, morada, anonimizadoEm, anonimizadoPor, historico, atualizado_em, ...resto } = ler("pedido:P1");
  const { comprador: _c, morada: _m, historico: hOrig, atualizado_em: _a, ...restoOriginal } = completo;
  assert.deepEqual(resto, restoOriginal);
  assert.deepEqual(historico.slice(0, -1), hOrig);
  assert.equal(historico.at(-1).evento, "anonimizado");
  assert.ok(comprador && morada && anonimizadoEm && anonimizadoPor && atualizado_em);
});

// Validador (V5): um terceiro quase-colidente (mesmo prefixo) não pode casar.
test("(i) terceiro com endereço quase igual ao titular fica intacto", async () => {
  const QUASE = ALVO.slice(0, -1) + "d";
  B.gravar("pedidos", "pedido:P5", pedido("P5", QUASE));
  // MC104.3: no pedido, a guarda do CAS volta a filtrar; a procura partilhada decide sozinha nos outros stores
  // (pedidos-pagos anonimiza; lance-idem APAGA) — é aí que um casamento frouxo faria estragos.
  B.gravar("pedidos-pagos", "pixQ", { endereco: QUASE, valorCentavos: 1 });
  B.gravar("lance-idem", "idemQ", { endereco: QUASE });
  const antes = ler("pedido:P5");
  await excluirBlobs(B.getStore, ALVO, { dryRun: false });
  assert.deepEqual(ler("pedido:P5"), antes);
  assert.deepEqual(B.ler("pedidos-pagos", "pixQ"), { endereco: QUASE, valorCentavos: 1 });
  assert.deepEqual(B.ler("lance-idem", "idemQ"), { endereco: QUASE }, "terceiro NÃO apagado");
});

test("(g) o titular em maiúsculas casa o comprador (normalizado)", async () => {
  const r = await excluirBlobs(B.getStore, ALVO.toUpperCase(), { dryRun: false });
  assert.equal(r.anonimizado.pedidos, 2);
  assert.equal(ler("pedido:P1").comprador, ENDERECO_ANONIMO);
});
