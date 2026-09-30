// MC104.2 — O conta-delete anonimiza os PEDIDOS do titular (dono em `comprador`), preserva a
// NF-e (nº/série/chave — LGPD art. 16, I) e não toca em pedidos de terceiros nem sem dono.
// Os pedidos têm a forma real de `_lib/pedidos.mjs` (garantirPedido + validarMorada + definirNfe).
// node --test _tests/mc1042-conta-delete-pedidos.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { excluirConta, excluirBlobs, ENDERECO_ANONIMO } from "../_lib/conta-delete.mjs";

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

function cenario() {
  return {
    pedidos: new Map([
      ["pedido:P1", pedido("P1", ALVO)],
      ["pedido:P2", pedido("P2", OUTRO)],
      ["pedido:P3", pedido("P3")],
      ["pedido:P4", { ...pedido("P4", ALVO), morada: null, nfe: null }],
      [`comprador:${ALVO}`, { ids: ["P1", "P4"] }],
    ]),
  };
}

// Cópias estruturais na leitura e na escrita, como o Blobs real (JSON por valor).
function getStoreDe(stores) {
  return ({ name }) => {
    const m = stores[name] ?? (stores[name] = new Map());
    return {
      async get(k) { return m.has(k) ? structuredClone(m.get(k)) : null; },
      async setJSON(k, v) { m.set(k, structuredClone(v)); },
      async set(k, v) { m.set(k, structuredClone(v)); },
      async delete(k) { m.delete(k); },
      async list() { return { blobs: [...m.keys()].map((key) => ({ key })) }; },
    };
  };
}

// Supabase vazio: o excluirConta corre por inteiro (USO), sem dados nas tabelas.
function supabaseVazio() {
  const api = {
    select: () => api, delete: () => api, update: () => api, eq: () => api, or: () => api,
    then: (r) => r({ data: [], error: null, count: 0 }),
  };
  return { from: () => api };
}

test("(a) pedido com comprador = titular é ANONIMIZADO e RETIDO (uso: excluirConta)", async () => {
  const stores = cenario();
  const m = await excluirConta({ supabase: supabaseVazio(), getStore: getStoreDe(stores), endereco: ALVO });
  assert.equal(m.ok, true);
  assert.equal(m.blobs.anonimizado.pedidos, 2, "P1 e P4 são do titular");
  const p1 = stores.pedidos.get("pedido:P1");
  assert.ok(p1, "o registo NÃO é apagado (anonimizar ≠ apagar)");
  assert.equal(p1.comprador, ENDERECO_ANONIMO);
  assert.ok(p1.anonimizadoEm);
  // O que não é pessoal fica (contabilidade do pedido).
  assert.equal(p1.valorPagoCentavos, 1234);
  assert.equal(p1.produtoId, "P1");
  assert.equal(p1.lojista, "0x1110000000000000000000000000000000000111");
});

test("(b) morada + CPF + nome substituídos por *** (nenhum valor pessoal sobra)", async () => {
  const stores = cenario();
  await excluirBlobs(getStoreDe(stores), ALVO, { dryRun: false });
  const p1 = stores.pedidos.get("pedido:P1");
  assert.deepEqual(Object.keys(p1.morada).sort(),
    ["bairro", "cep", "cidade", "complemento", "cpf", "logradouro", "nome", "numero", "telefone", "uf"]);
  for (const [k, v] of Object.entries(p1.morada)) assert.equal(v, "***", `morada.${k}`);
  const texto = JSON.stringify(p1);
  for (const pessoal of [CPF, NOME, "Rua Cinco", "69027010", "92999999999", ALVO]) {
    assert.equal(texto.includes(pessoal), false, `sobrou ${pessoal}`);
  }
});

test("(c) NF-e preservada: nº, série e chave iguais (LGPD art. 16, I)", async () => {
  const stores = cenario();
  await excluirBlobs(getStoreDe(stores), ALVO, { dryRun: false });
  const { nfe } = stores.pedidos.get("pedido:P1");
  assert.equal(nfe.numero, "123");
  assert.equal(nfe.serie, "1");
  assert.equal(nfe.chave, "3".repeat(44));
  assert.equal(nfe.registada_em, "2026-09-01T00:00:00.000Z");
});

test("(d) pedido de TERCEIRO e pedido SEM comprador ficam intactos", async () => {
  const stores = cenario();
  const antes = structuredClone(stores.pedidos);
  await excluirBlobs(getStoreDe(stores), ALVO, { dryRun: false });
  assert.deepEqual(stores.pedidos.get("pedido:P2"), antes.get("pedido:P2"), "terceiro");
  assert.deepEqual(stores.pedidos.get("pedido:P3"), antes.get("pedido:P3"), "sem comprador");
  assert.equal(stores.pedidos.size, antes.size, "nenhuma chave apagada");
});

test("(e) pedido sem morada/NF-e ainda: comprador anonimizado, nulls mantidos", async () => {
  const stores = cenario();
  await excluirBlobs(getStoreDe(stores), ALVO, { dryRun: false });
  const p4 = stores.pedidos.get("pedido:P4");
  assert.equal(p4.comprador, ENDERECO_ANONIMO);
  assert.equal(p4.morada, null);
  assert.equal(p4.nfe, null);
});

test("(f) dry-run conta os pedidos do titular SEM mutar", async () => {
  const stores = cenario();
  const antes = structuredClone(stores.pedidos);
  const m = await excluirConta({ supabase: supabaseVazio(), getStore: getStoreDe(stores), endereco: ALVO, dryRun: true });
  assert.equal(m.blobs.anonimizado.pedidos, 2);
  assert.deepEqual(stores.pedidos, antes);
});

// Validador (R1): nada além de comprador/morada muda — datas, rastreio, histórico, NF-e, txHash ficam.
test("(h) só comprador e morada mudam: o resto do pedido é byte-igual (nada apagado)", async () => {
  const stores = cenario();
  const completo = { ...pedido("P1", ALVO), recebido_em: "2026-09-10T00:00:00.000Z",
    rastreio: { codigo: "AA123456789BR", transportadora: "Correios", eventos: [{ data: "2026-09-05T00:00:00.000Z", codigo: "1" }] } };
  stores.pedidos.set("pedido:P1", completo);
  await excluirBlobs(getStoreDe(stores), ALVO, { dryRun: false });
  const { comprador, morada, anonimizadoEm, anonimizadoPor, ...resto } = stores.pedidos.get("pedido:P1");
  const { comprador: _c, morada: _m, ...restoOriginal } = completo;
  assert.deepEqual(resto, restoOriginal);
  assert.ok(comprador && morada && anonimizadoEm && anonimizadoPor);
});

// Validador (V5): um terceiro quase-colidente (mesmo prefixo) não pode casar.
test("(i) terceiro com endereço quase igual ao titular fica intacto", async () => {
  const stores = cenario();
  const QUASE = ALVO.slice(0, -1) + "d";
  stores.pedidos.set("pedido:P5", pedido("P5", QUASE));
  const antes = structuredClone(stores.pedidos.get("pedido:P5"));
  await excluirBlobs(getStoreDe(stores), ALVO, { dryRun: false });
  assert.deepEqual(stores.pedidos.get("pedido:P5"), antes);
});

test("(g) o titular em maiúsculas casa o comprador (normalizado)", async () => {
  const stores = cenario();
  const r = await excluirBlobs(getStoreDe(stores), ALVO.toUpperCase(), { dryRun: false });
  assert.equal(r.anonimizado.pedidos, 2);
  assert.equal(stores.pedidos.get("pedido:P1").comprador, ENDERECO_ANONIMO);
});
