// MC104.3 — as 4 pendências do MC104.2 no conta-delete, testadas pelo USO (excluirConta/excluirBlobs):
//  A. índice `comprador:<endereço>` → `anon:<sha256>` = { ids: [] } (a chave antiga sai) — DEC-104.3-1
//  B. notificações (chave = endereço) e lances nos Blobs `bids` / `lances-relampago` → `anon:<sha256>` — DEC-104.3-4
//  D. o pedido escreve-se por `atualizarPedido` (CAS): uma escrita concorrente não se perde — DEC-104.3-5
// Terceiros intactos; NF-e, txHash e código de rastreio preservados (DEC-104.3-3). Blobs = duplo com ETag real.
// node --test --experimental-test-module-mocks _tests/mc1043-conta-delete.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarBlobs } from "./_blobs-cas-duplo.mjs";

let B = criarBlobs();
mock.module("@netlify/blobs", { namedExports: { getStore: (o) => B.getStore(o) } });
mock.module("../_lib/cache.mjs", { namedExports: { cacheAside: async (_k, f) => f(), cacheDel: async () => {} } });
const { excluirConta, excluirBlobs, chaveAnonima } = await import("../_lib/conta-delete.mjs");

const ALVO = "0xabc0000000000000000000000000000000000abc";
const OUTRO = "0xdef0000000000000000000000000000000000def";
// Literal calculado FORA do código (`printf '%s' <ALVO> | sha256sum`) — não pela função testada.
const ANON = "anon:124fcc172f6745af1553232800463e15f3f9d103cad0d707403b38c46bfa1144";
const NFE = { numero: "123", serie: "1", chave: "3".repeat(44), registada_em: "2026-09-01T00:00:00.000Z" };

const pedido = (id, c) => ({ produtoId: id, edicaoId: "R-1", comprador: c, valorPagoCentavos: 1234, txHash: "0xtx",
  morada: { nome: "Nome Teste", cpf: "52998224725", cep: "69027010" }, nfe: { ...NFE },
  rastreio: { codigo: "AA123456789BR", transportadora: "Correios", eventos: [] }, historico: [] });
const notif = (m) => ({ notificacoes: [{ id: "n1", timestamp: "2026-09-01T00:00:00.000Z", lida: false, tipo: "nfe_emitida",
  edicaoId: "R-1", valor: null, mensagem: m, ref: "1-123" }], atualizadoEm: "2026-09-01T00:00:00.000Z" });
const lance = (e, id) => ({ lanceId: id, edicaoId: "R-1", endereco: e, valorCentavos: 5, nomeExibicao: "Fulano",
  modo: "relampago", processadoEm: "2026-09-01T00:00:00.000Z", commitmentHash: "0xcommit" + id });

beforeEach(() => {
  B = criarBlobs();
  B.gravar("pedidos", "pedido:P1", pedido("P1", ALVO));
  B.gravar("pedidos", "pedido:P2", pedido("P2", OUTRO));
  B.gravar("pedidos", `comprador:${ALVO}`, { ids: ["P1"] });
  B.gravar("pedidos", `comprador:${OUTRO}`, { ids: ["P2"] });
  B.gravar("notificacoes", ALVO, notif("NF-e nº 123 emitida"));
  B.gravar("notificacoes", OUTRO, notif("NF-e do terceiro"));
  B.gravar("bids", `bid:R-1:${ALVO}:aaaa1111`, { ...lance(ALVO, "a"), key: `bid:R-1:${ALVO}:aaaa1111` });
  B.gravar("bids", `bid:R-1:${OUTRO}:bbbb2222`, { ...lance(OUTRO, "b"), key: `bid:R-1:${OUTRO}:bbbb2222` });
  B.gravar("bids", "bid:R-1:consolidado", { consolidadoEm: "2026-09-02T00:00:00.000Z" });
  B.gravar("lances-relampago", "R-1", { lances: [lance(ALVO, "c"), lance(OUTRO, "d")], atualizadoEm: "x" });
});
const chaves = (s) => [...(B.blobs.get(s)?.keys() ?? [])];
const semSupabase = () => { const a = { select: () => a, delete: () => a, update: () => a, eq: () => a, or: () => a,
  then: (r) => r({ data: [], error: null, count: 0 }) }; return { from: () => a }; };

// ── Frente A ─────────────────────────────────────────────────────────────────
test("A1 índice do titular: `comprador:<endereço>` sai, `anon:<sha256>` = { ids: [] } fica (uso)", async () => {
  const m = await excluirConta({ supabase: semSupabase(), getStore: B.getStore, endereco: ALVO });
  assert.equal(m.ok, true, JSON.stringify(m.erros));
  assert.equal(m.blobs.anonimizado["pedidos-indice"], 1);
  assert.equal(B.ler("pedidos", `comprador:${ALVO}`), undefined, "a chave com o endereço desaparece");
  assert.deepEqual(B.ler("pedidos", ANON), { ids: [] }, "a entrada fica, esvaziada");
  assert.equal(chaves("pedidos").some((k) => k.includes(ALVO)), false, "nenhuma chave com o endereço");
});

test("A2 hash DETERMINÍSTICO: literal externo, maiúsculas = minúsculas, endereços diferentes → hashes diferentes", () => {
  assert.equal(chaveAnonima(ALVO), ANON);
  assert.equal(chaveAnonima(ALVO.toUpperCase()), ANON);
  assert.equal(chaveAnonima(ALVO), chaveAnonima(ALVO));
  assert.notEqual(chaveAnonima(OUTRO), ANON);
});

test("A3 índice de TERCEIRO intacto; dry-run não muta nada", async () => {
  // (abrir um store no duplo cria-lhe um Map vazio — isso não é escrita; comparam-se os stores com conteúdo)
  const foto = () => JSON.stringify([...B.blobs].filter(([, m]) => m.size).map(([n, m]) => [n, [...m]]));
  const antes = foto();
  const m = await excluirBlobs(B.getStore, ALVO, { dryRun: true });
  assert.equal(m.anonimizado["pedidos-indice"], 1);
  assert.equal(m.anonimizado.notificacoes, 1);
  assert.equal(m.anonimizado.lances, 2);
  assert.equal(foto(), antes, "dry-run não escreve");
  await excluirBlobs(B.getStore, ALVO, { dryRun: false });
  assert.deepEqual(B.ler("pedidos", `comprador:${OUTRO}`), { ids: ["P2"] });
});

// ── Frente B ─────────────────────────────────────────────────────────────────
test("B1 notificações do titular passam para `anon:<sha256>` com o conteúdo IGUAL; as de terceiro ficam", async () => {
  const doc = B.ler("notificacoes", ALVO);
  await excluirBlobs(B.getStore, ALVO, { dryRun: false });
  assert.equal(B.ler("notificacoes", ALVO), undefined);
  assert.deepEqual(B.ler("notificacoes", ANON), doc, "tipo, data e referência (NF-e) preservados");
  assert.deepEqual(B.ler("notificacoes", OUTRO), notif("NF-e do terceiro"));
});

test("B2 lance do titular em `bids`: chave e registo com `anon:`; valor/edição/data/commitmentHash ficam; terceiro e marcador intactos", async () => {
  await excluirBlobs(B.getStore, ALVO, { dryRun: false });
  const ks = chaves("bids");
  assert.equal(ks.some((k) => k.includes(ALVO)), false);
  const nova = `bid:R-1:${ANON}:aaaa1111`;
  assert.ok(ks.includes(nova), "continua sob o prefixo da edição");
  const l = B.ler("bids", nova);
  assert.deepEqual(l, { ...lance(ALVO, "a"), endereco: ANON, nomeExibicao: "***", key: nova });
  assert.deepEqual(B.ler("bids", `bid:R-1:${OUTRO}:bbbb2222`), { ...lance(OUTRO, "b"), key: `bid:R-1:${OUTRO}:bbbb2222` });
  assert.ok(B.ler("bids", "bid:R-1:consolidado"));
  assert.equal(ks.length, 3, "nenhum lance apagado");
});

test("B3 lance do titular no legado `lances-relampago`: só o dele muda, pela mesma ordem", async () => {
  await excluirBlobs(B.getStore, ALVO, { dryRun: false });
  const { lances } = B.ler("lances-relampago", "R-1");
  assert.deepEqual(lances, [{ ...lance(ALVO, "c"), endereco: ANON, nomeExibicao: "***" }, lance(OUTRO, "d")]);
});

// ── Frente D ─────────────────────────────────────────────────────────────────
test("D1 CAS: um evento de rastreio gravado ENTRE a leitura e a escrita não se perde; sem escrita directa ao pedido", async () => {
  B.g.antesDeGravar = (name, m, k) => {
    if (name !== "pedidos" || k !== "pedido:P1") return false;
    const p = JSON.parse(m.get(k)); p.rastreio.eventos.push({ data: "2026-09-02T00:00:00.000Z", codigo: "1" });
    m.set(k, JSON.stringify(p)); return true;
  };
  const r = await excluirBlobs(B.getStore, ALVO, { dryRun: false });
  assert.deepEqual(r.erros, []);
  const p1 = B.ler("pedidos", "pedido:P1");
  assert.deepEqual(p1.rastreio.eventos, [{ data: "2026-09-02T00:00:00.000Z", codigo: "1" }], "a escrita concorrente sobreviveu");
  assert.equal(p1.morada.cpf, "***", "e a anonimização também");
  assert.equal(B.g.escritasSemCondicao.includes("pedidos:pedido:P1"), false, "o pedido só se escreve com If-Match");
});

test("D2 conflito PERSISTENTE: a falha não fica silenciosa (erros → ok:false) e nada é apagado", async () => {
  B.g.antesDeGravar = (name, m, k) => {
    if (name === "pedidos" && k === "pedido:P1") { const p = JSON.parse(m.get(k)); p.toque = (p.toque ?? 0) + 1; m.set(k, JSON.stringify(p)); }
    return false; // nunca desliga: todas as tentativas perdem a corrida
  };
  const m = await excluirConta({ supabase: semSupabase(), getStore: B.getStore, endereco: ALVO });
  assert.equal(m.ok, false);
  assert.ok(m.erros.some((e) => e.startsWith("blobs:pedidos (anon)") && e.includes("conflito_escrita")), JSON.stringify(m.erros));
  assert.ok(B.ler("pedidos", "pedido:P1"), "o pedido continua a existir");
});

test("D3 fiscal: NF-e, txHash e código de rastreio preservados; terceiro intacto", async () => {
  const p2 = B.ler("pedidos", "pedido:P2");
  await excluirBlobs(B.getStore, ALVO, { dryRun: false });
  const p1 = B.ler("pedidos", "pedido:P1");
  assert.deepEqual(p1.nfe, NFE);
  assert.equal(p1.txHash, "0xtx");
  assert.equal(p1.rastreio.codigo, "AA123456789BR");
  assert.equal(p1.historico.at(-1).evento, "anonimizado");
  assert.deepEqual(B.ler("pedidos", "pedido:P2"), p2);
});

test("D4 a guarda do dono é REAVALIADA no retry: pedido que deixa de ser do titular entre a leitura e a escrita fica intacto", async () => {
  B.g.antesDeGravar = (name, m, k) => {
    if (name !== "pedidos" || k !== "pedido:P1") return false;
    const p = JSON.parse(m.get(k)); p.comprador = OUTRO; m.set(k, JSON.stringify(p)); return true;
  };
  const r = await excluirBlobs(B.getStore, ALVO, { dryRun: false });
  assert.deepEqual(r.erros, [], "não é falha: o pedido simplesmente já não é do titular");
  const p1 = B.ler("pedidos", "pedido:P1");
  assert.equal(p1.comprador, OUTRO);
  assert.equal(p1.morada.cpf, "52998224725", "dados de terceiro NÃO anonimizados");
});
