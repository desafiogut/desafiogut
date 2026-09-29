// MC102.0 — escrita condicional (CAS) no pedido: duas escritas concorrentes não se perdem.
// Blobs em memória fiel ao @netlify/blobs 10.0.0 REAL (dist/main.js), nas duas direcções:
//  - `set` aplica `onlyIfMatch`: etag diferente OU chave ausente → { modified:false };
//  - `setJSON` IGNORA o `onlyIfMatch` (espalha as condições; o If-Match não sai) — medido pelo validador;
//  - um `onlyIfMatch` vazio é ignorado (`Store.getConditions`);
//  - com condição, um erro do servidor (≠ 412) devolve { etag:"", modified:true } sem gravar.
//
// node --test --experimental-test-module-mocks _tests/mc1020-cas.test.mjs

import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const etagDe = (v) => `"${createHash("sha1").update(v).digest("hex")}"`;
const ceder = () => new Promise((r) => setImmediate(r));
const blobs = new Map();
const g = { ceder: false, semEtag: false, erroServidor: false, antesDeGravar: null, leituras: 0, escritas: 0 };

mock.module("@netlify/blobs", {
  namedExports: {
    getStore: ({ name }) => {
      if (!blobs.has(name)) blobs.set(name, new Map());
      const m = blobs.get(name);
      return {
        async get(k, { type } = {}) { const v = m.get(k); return v === undefined ? null : (type === "json" ? JSON.parse(v) : v); },
        async getWithMetadata(k, { type } = {}) {
          if (name === "pedidos") g.leituras++;
          const v = m.get(k);
          if (g.ceder) await ceder(); // os dois escritores lêem ANTES de qualquer um gravar
          if (v === undefined) return null;
          return { data: type === "json" ? JSON.parse(v) : v, etag: g.semEtag ? undefined : etagDe(v), metadata: {} };
        },
        async setJSON(k, o) { // ignora opções, como o real 10.0.0
          if (name === "pedidos") g.escritas++;
          const v = JSON.stringify(o); m.set(k, v); return { modified: true, etag: etagDe(v) };
        },
        async set(k, v, opt = {}) {
          if (name === "pedidos" && g.antesDeGravar) g.antesDeGravar(m, k);
          if (opt.onlyIfMatch && g.erroServidor) return { etag: "", modified: true };
          if (opt.onlyIfMatch && (!m.has(k) || etagDe(m.get(k)) !== opt.onlyIfMatch)) return { modified: false };
          if (name === "pedidos") g.escritas++;
          m.set(k, v); return { modified: true, etag: etagDe(v) };
        },
        async list({ prefix = "" } = {}) { return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
        async delete(k) { m.delete(k); },
      };
    },
  },
});
mock.module("../_lib/cache.mjs", { namedExports: { cacheAside: async (_k, f) => f(), cacheDel: async () => {} } });

const L = await import("../_lib/pedidos.mjs");

const PID = "11111111-2222-3333-4444-555555555555";
const COMPRADOR = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const K = `pedido:${PID}`;
const MORADA = { nome: "Maria Silva", cpf: "529.982.247-25", cep: "69027-010", logradouro: "Rua 5 de Setembro",
  numero: "86", bairro: "São Raimundo", cidade: "Manaus", uf: "am" };
const NFE = { numero: "123", serie: "1" };
const ler = () => JSON.parse(blobs.get("pedidos").get(K));
function semear({ comMorada = true, comRastreio = true } = {}) {
  blobs.set("pedidos", new Map([[K, JSON.stringify({
    produtoId: PID, edicaoId: "RELAMP-9", comprador: COMPRADOR, produtoNome: "Air Fryer",
    morada: comMorada ? L.validarMorada(MORADA) : null,
    rastreio: comRastreio ? { codigo: "AA123456789BR", transportadora: "Correios" } : null,
    nfe: null, historico: [],
  })]]));
}

beforeEach(() => {
  blobs.clear();
  Object.assign(g, { ceder: false, semEtag: false, erroServidor: false, antesDeGravar: null, leituras: 0, escritas: 0 });
});

test("CONTROLO: setJSON com onlyIfMatch NÃO protege (o real ignora a condição) — só o set protege", async () => {
  semear();
  const s = (await import("@netlify/blobs")).getStore({ name: "pedidos" });
  const { etag } = await s.getWithMetadata(K, { type: "json" });
  await s.setJSON(K, { mexido: 1 });
  assert.equal((await s.setJSON(K, { v: "velho" }, { onlyIfMatch: etag })).modified, true, "setJSON escreveu com etag velho");
  const { etag: e2 } = await s.getWithMetadata(K, { type: "json" });
  await s.setJSON(K, { mexido: 2 });
  assert.equal((await s.set(K, JSON.stringify({ v: "velho" }), { onlyIfMatch: e2 })).modified, false, "set recusou o etag velho");
});

// ── Controlo positivo: a sonda VÊ a corrida ─────────────────────────────────
test("CONTROLO: um ler→mudar→gravar SEM condição, em paralelo, sobre este duplo PERDE uma escrita", async () => {
  semear();
  g.ceder = true;
  const s = (await import("@netlify/blobs")).getStore({ name: "pedidos" });
  const ingenuo = async (mudar) => { const { data } = await s.getWithMetadata(K, { type: "json" }); mudar(data); await s.setJSON(K, data); };
  await Promise.all([ingenuo((p) => { p.recebido_em = "T"; }), ingenuo((p) => { p.nfe = { numero: "1" }; })]);
  const p = ler();
  assert.ok(!p.recebido_em || !p.nfe, "sem esta perda a sonda não mede corrida nenhuma");
});

// ── Frente C: o cenário real (MC102 → MC102.0) ──────────────────────────────
test("C: «Recebi» + NF-e em paralelo → os DOIS campos sobrevivem, cada evento UMA vez no histórico", async () => {
  semear();
  g.ceder = true;
  const [a, b] = await Promise.all([L.marcarRecebido(PID, COMPRADOR), L.definirNfe(PID, NFE)]);
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  const p = ler();
  assert.match(p.recebido_em, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(p.nfe?.numero, "123");
  assert.deepEqual(p.historico.map((h) => h.evento).sort(), ["nfe_registada", "recebido"]);
  assert.equal(g.escritas, 2, "duas escritas efectivas, nenhuma repetida");
  assert.equal(g.leituras, 3, "o perdedor releu uma vez");
});

test("C: NF-e + «Recebi» (ordem inversa) → os dois sobrevivem", async () => {
  semear();
  g.ceder = true;
  await Promise.all([L.definirNfe(PID, NFE), L.marcarRecebido(PID, COMPRADOR)]);
  const p = ler();
  assert.ok(p.recebido_em && p.nfe, JSON.stringify({ recebido_em: p.recebido_em, nfe: p.nfe }));
});

test("C: as guardas voltam a ser avaliadas — rastreio ganha a corrida → morada recusada (pedido_ja_enviado)", async () => {
  semear({ comMorada: true, comRastreio: false });
  g.ceder = true;
  const [r, m] = await Promise.all([
    L.definirRastreio(PID, { codigo: "AA123456789BR" }),
    L.definirMorada(PID, COMPRADOR, { ...MORADA, numero: "999" }),
  ]);
  assert.equal(r.ok, true);
  assert.deepEqual(m, { ok: false, code: "pedido_ja_enviado" });
  const p = ler();
  assert.equal(p.rastreio.codigo, "AA123456789BR");
  assert.equal(p.morada.numero, "86", "a morada NÃO mudou depois do envio");
});

// ── Frente B: limites ───────────────────────────────────────────────────────
test("B: conflito persistente → conflito_escrita ao fim de 3 tentativas, sem gravar nada meu", async () => {
  semear();
  let n = 0;
  g.antesDeGravar = (m, k) => { const o = JSON.parse(m.get(k)); o.outro = ++n; m.set(k, JSON.stringify(o)); };
  const r = await L.marcarRecebido(PID, COMPRADOR);
  assert.deepEqual(r, { ok: false, code: "conflito_escrita" });
  assert.equal(L.MAX_TENTATIVAS_CAS, 3);
  assert.equal(g.leituras, 3, "exactamente 3 tentativas, não mais");
  assert.equal(ler().recebido_em, undefined);
});

test("B: conflito que passa à 2.ª → grava, e o histórico tem o evento UMA vez", async () => {
  semear();
  let vezes = 0;
  g.antesDeGravar = (m, k) => { if (vezes++ === 0) { const o = JSON.parse(m.get(k)); o.nfe = { numero: "7" }; m.set(k, JSON.stringify(o)); } };
  const r = await L.marcarRecebido(PID, COMPRADOR);
  assert.equal(r.ok, true);
  const p = ler();
  assert.ok(p.recebido_em);
  assert.equal(p.nfe.numero, "7", "a escrita do outro não se perdeu");
  assert.deepEqual(p.historico.map((h) => h.evento), ["recebido"]);
});

test("B: sem etag na leitura → etag_indisponivel e NÃO grava (fail-closed)", async () => {
  semear();
  g.semEtag = true;
  const r = await L.marcarRecebido(PID, COMPRADOR);
  assert.deepEqual(r, { ok: false, code: "etag_indisponivel" });
  assert.equal(ler().recebido_em, undefined);
  assert.equal(g.escritas, 0);
});

test("B: erro do servidor na escrita condicional ({etag:'', modified:true}) → etag_indisponivel, NÃO é sucesso nem notifica", async () => {
  semear();
  g.erroServidor = true;
  const r = await L.definirNfe(PID, NFE);
  assert.deepEqual(r, { ok: false, code: "etag_indisponivel" });
  assert.equal(ler().nfe, null);
  assert.equal(blobs.get("notificacoes")?.size ?? 0, 0, "nenhuma notificação de uma NF-e que não ficou gravada");
});

test("B: pedido inexistente → pedido_nao_encontrado, nenhuma escrita", async () => {
  blobs.set("pedidos", new Map());
  assert.deepEqual(await L.definirNfe(PID, NFE), { ok: false, code: "pedido_nao_encontrado" });
  assert.equal(g.escritas, 0);
});

// ── Frente A: o que o build instala tem de ter CAS ──────────────────────────
// A suíte usa duplos, logo voltar à 8.2.0 NÃO a faria ficar vermelha por si: esta guarda lê o que o
// Netlify instala (`npm install --prefix netlify/functions` segue o lockfile desta pasta).
test("A: package.json e package-lock.json das functions pedem @netlify/blobs ≥ 10 (a 1.ª com onlyIfMatch)", async () => {
  const { readFileSync } = await import("node:fs");
  const aqui = new URL("../", import.meta.url);
  const pkg = JSON.parse(readFileSync(new URL("package.json", aqui), "utf8"));
  const lock = JSON.parse(readFileSync(new URL("package-lock.json", aqui), "utf8"));
  const major = (v) => Number(String(v).replace(/^[^\d]*/, "").split(".")[0]);
  assert.ok(major(pkg.dependencies["@netlify/blobs"]) >= 10, pkg.dependencies["@netlify/blobs"]);
  assert.ok(major(lock.packages["node_modules/@netlify/blobs"].version) >= 10, lock.packages["node_modules/@netlify/blobs"].version);
  assert.ok(major(lock.packages[""].dependencies["@netlify/blobs"]) >= 10);
});

test("B: idempotente continua idempotente — 2.º «Recebi» não escreve", async () => {
  semear();
  await L.marcarRecebido(PID, COMPRADOR);
  const antes = ler().recebido_em;
  const r = await L.marcarRecebido(PID, COMPRADOR);
  assert.equal(r.idempotent, true);
  assert.equal(g.escritas, 1);
  assert.equal(ler().recebido_em, antes);
});
