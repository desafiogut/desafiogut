// UTAC000.17a — Frente C: GET /minhas-participacoes (handler REAL sobre Blobs em memória).
//
// O que este ficheiro prova (tentando partir o endpoint, não o elogiar):
//   1. SEM token → 401 e NENHUM dado.
//   2. Token inválido → 401.
//   3. Devolve SÓ as edições do titular — com um terceiro (OUTRO) e um endereço
//      PARECIDO (difere no último carácter) semeados: nenhum pode aparecer.
//   4. NUNCA devolve valores de lance (GATE 22) — asserção sobre o JSON serializado.
//   5. `?edicaoId=` filtra; edição em que não participou → lista vazia (200, não erro).
//   6. O marcador `bid:{edicao}:consolidado` não conta como lance nem inventa edição.
//   7. Titular sem lances → 200 + lista vazia.
//   8. Método errado → 405.  9. Store em baixo → 503 (fail-safe).
//  10. Endereço do token com EIP-55 (checksum) casa com a chave em minúsculas.
//  11. Paginação por cursor (> tamanho de página) não perde edições.
//
// node --test --experimental-test-module-mocks _tests/utac0017a-minhas-participacoes.test.mjs

import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

const TITULAR  = "0xaaa0000000000000000000000000000000000aaa";
const OUTRO    = "0xbbb0000000000000000000000000000000000bbb";
// EIP-55: mesmo endereço do TITULAR, com checksum (maiúsculas) — TEM de casar.
const TITULAR_EIP55 = "0xAAA0000000000000000000000000000000000aAa";
// difere do TITULAR só no último carácter — apanha comparações por prefixo/substring.
const PARECIDO = "0xaaa0000000000000000000000000000000000aab";

// ── Blobs em memória, com prefixo e paginação FIEIS ───────────────────────────
const store = new Map();
let pagina = 2;        // tamanho de página pequeno de propósito → exercita o cursor
let falhar = false;    // simula store em baixo
const listagens = [];  // prefixos pedidos ao store (prova o estreitamento quando há ?edicaoId)
mock.module("@netlify/blobs", {
  namedExports: {
    getStore: () => ({
      async list({ prefix = "", cursor } = {}) {
        if (falhar) throw new Error("blobs indisponível");
        listagens.push(prefix);
        const todas = [...store.keys()].filter((k) => k.startsWith(prefix)).sort();
        const inicio = cursor ? Number(cursor) : 0;
        const fatia = todas.slice(inicio, inicio + pagina);
        const fim = inicio + fatia.length;
        return { blobs: fatia.map((key) => ({ key })), cursor: fim < todas.length ? String(fim) : undefined };
      },
      async get(k, { type } = {}) {
        if (falhar) throw new Error("blobs indisponível");
        const v = store.get(k);
        return v === undefined ? null : (type === "json" ? JSON.parse(v) : v);
      },
      async setJSON(k, v) { store.set(k, JSON.stringify(v)); },
    }),
  },
});

// ── Auth e rate limit em duplo ────────────────────────────────────────────────
const sessoes = { "tok-titular": TITULAR, "tok-outro": OUTRO, "tok-eip55": TITULAR_EIP55, "tok-sem-endereco": null };
mock.module("../_lib/jwt.mjs", {
  namedExports: {
    verificarUserSession: async (t) => {
      if (!(t in sessoes)) { const e = new Error("inválido"); e.code = "ERR_JWT_INVALID"; throw e; }
      return { endereco: sessoes[t], tipo: "user-session" };
    },
  },
});
mock.module("../_lib/jwt-fail-counter.mjs", { namedExports: { registrarFalhaJwt: async () => {} } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });

const { default: handler } = await import("../minhas-participacoes.mjs");

const chamar = async ({ token = "tok-titular", edicaoId = null, metodo = "GET" } = {}) => {
  const url = new URL("https://x.test/.netlify/functions/minhas-participacoes");
  if (edicaoId !== null) url.searchParams.set("edicaoId", edicaoId);
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  const res = await handler(new Request(url, { method: metodo, headers }));
  return { status: res.status, corpo: await res.json(), bruto: null };
};

let seq = 0;   // sufixo ÚNICO por lance — fiel ao randomUUID().slice(0,8) do Key-Per-Bid
const bid = (edicaoId, endereco) => store.set(`bid:${edicaoId}:${String(endereco).toLowerCase()}:s${++seq}`, JSON.stringify({ valorCentavos: 999 }));
const marcador = (edicaoId) => store.set(`bid:${edicaoId}:consolidado`, JSON.stringify({ vencedor: "x" }));

beforeEach(() => { store.clear(); pagina = 2; falhar = false; listagens.length = 0; });

test("sem token → 401 e nenhum dado", async () => {
  bid("R-1", TITULAR);
  const { status, corpo } = await chamar({ token: null });
  assert.equal(status, 401);
  assert.equal(corpo.error.code, "token_ausente");
  assert.equal(corpo.participacoes, undefined, "não pode devolver participações sem autenticação");
});

test("token inválido → 401", async () => {
  const { status, corpo } = await chamar({ token: "tok-forjado" });
  assert.equal(status, 401);
  assert.equal(corpo.error.code, "token_invalido");
});

test("sessão sem endereço → 401", async () => {
  const { status, corpo } = await chamar({ token: "tok-sem-endereco" });
  assert.equal(status, 401);
  assert.equal(corpo.error.code, "token_sem_endereco");
});

test("devolve SÓ as edições do titular — terceiro e endereço PARECIDO ficam de fora", async () => {
  bid("R-1", TITULAR); bid("R-1", TITULAR); bid("R-2", TITULAR);
  bid("R-3", OUTRO);
  bid("R-4", PARECIDO);
  const { status, corpo } = await chamar();
  assert.equal(status, 200);
  assert.deepEqual(corpo.participacoes, [
    { edicaoId: "R-1", lances: 2 },
    { edicaoId: "R-2", lances: 1 },
  ]);
  assert.equal(corpo.total, 2);
  const bruto = JSON.stringify(corpo);
  assert.ok(!bruto.includes(OUTRO) && !bruto.includes(PARECIDO), "endereço de terceiro no corpo");
  // Sem filtro, a listagem é a store inteira (`bid:`) — custo documentado; com ?edicaoId= é estreita.
  assert.deepEqual([...new Set(listagens)], ["bid:"], "sem filtro: listagem larga e nada mais");
});

test("NUNCA devolve valores de lance (GATE 22)", async () => {
  bid("R-1", TITULAR);
  const { corpo } = await chamar();
  const bruto = JSON.stringify(corpo).toLowerCase();
  for (const termo of ["valor", "centavos", "hash", "commitment", "payload", "lances_"]) {
    assert.ok(!bruto.includes(termo), `o corpo não pode conter "${termo}"`);
  }
  assert.deepEqual(Object.keys(corpo.participacoes[0]).sort(), ["edicaoId", "lances"]);
});

test("o marcador :consolidado não conta como lance nem inventa edição", async () => {
  marcador("R-9");
  const { corpo } = await chamar();
  assert.deepEqual(corpo.participacoes, []);
  bid("R-9", TITULAR);
  const { corpo: corpo2 } = await chamar();
  assert.deepEqual(corpo2.participacoes, [{ edicaoId: "R-9", lances: 1 }], "o marcador não pode somar");
});

test("filtro ?edicaoId= devolve só essa edição; edição sem participação → vazio, 200", async () => {
  bid("R-1", TITULAR); bid("R-2", TITULAR);
  const a = await chamar({ edicaoId: "R-2" });
  assert.equal(a.status, 200);
  assert.deepEqual(a.corpo.participacoes, [{ edicaoId: "R-2", lances: 1 }]);
  assert.deepEqual(a.corpo.filtro, { edicaoId: "R-2" });
  // ESTREITAMENTO (ressalva do validador adversarial): com edição concreta a listagem tem de usar o
  // prefixo estreito — é o caso normal do 17c (o overlay pergunta por UMA edição) e evita varrer a store.
  assert.ok(listagens.includes("bid:R-2:"), `esperava a listagem estreita bid:R-2:, vi ${JSON.stringify(listagens)}`);
  assert.ok(!listagens.includes("bid:"), "com ?edicaoId= não pode varrer a store inteira");
  const b = await chamar({ edicaoId: "R-77" });
  assert.equal(b.status, 200);
  assert.deepEqual(b.corpo.participacoes, []);
  assert.equal(b.corpo.total, 0);
});

test("titular sem lances → 200 e lista vazia (não é erro)", async () => {
  bid("R-1", OUTRO);
  const { status, corpo } = await chamar();
  assert.equal(status, 200);
  assert.deepEqual(corpo.participacoes, []);
  assert.equal(corpo.total, 0);
});

test("método errado → 405", async () => {
  const { status, corpo } = await chamar({ metodo: "POST" });
  assert.equal(status, 405);
  assert.equal(corpo.error.code, "metodo_invalido");
});

test("store indisponível → 503 (fail-safe, sem vazar detalhe)", async () => {
  bid("R-1", TITULAR);
  falhar = true;
  const { status, corpo } = await chamar();
  assert.equal(status, 503);
  assert.equal(corpo.error.code, "store_indisponivel");
  assert.equal(corpo.participacoes, undefined);
});

test("endereço do token em EIP-55 (checksum) casa com a chave em minúsculas", async () => {
  bid("R-1", TITULAR);                     // chave gravada em minúsculas pelo key-per-bid
  const { status, corpo } = await chamar({ token: "tok-eip55" });
  assert.equal(status, 200);
  assert.deepEqual(corpo.participacoes, [{ edicaoId: "R-1", lances: 1 }]);
});

test("defensivo: não perde edições mesmo se o store paginar (a lib v10 devolve tudo de uma vez)", async () => {
  // ⚠️ MEDIDO pelo validador adversarial (@netlify/blobs v10.0.0, dist/main.js): `list()` SEM
  // `paginate: true` devolve TUDO e NÃO devolve `cursor` (um cursor passado é ignorado) ⇒ em produção
  // este laço corre UMA vez. O duplo abaixo pagina de propósito: este teste pina o caminho DEFENSIVO
  // do código, não o comportamento da lib — fica com o rótulo honesto (padrão igual ao do
  // listarChavesBids pré-existente, inofensivo).
  for (const e of ["R-1", "R-2", "R-3", "R-4", "R-5"]) bid(e, TITULAR);
  pagina = 2;                              // 5 chaves em páginas de 2 → 3 páginas
  const { corpo } = await chamar();
  assert.deepEqual(corpo.participacoes.map((p) => p.edicaoId), ["R-1", "R-2", "R-3", "R-4", "R-5"]);
  assert.equal(corpo.total, 5);
});

test("camada blobs: chamada DIRECTA com endereço EIP-55 casa (mata o sobrevivente SURV-1 do validador)", async () => {
  bid("R-1", TITULAR);
  // Chamada directa à camada de dados (sem passar pelo handler): aqui o `.toLowerCase()` do alvo é a
  // ÚNICA defesa — o handler normaliza antes via `validarEndereco`, por isso nenhum teste do endpoint
  // o exercia (sobrevivente medido pelo validador adversarial).
  const { listarEdicoesPorEndereco } = await import("../_lib/bids-store.mjs");
  assert.deepEqual(await listarEdicoesPorEndereco(TITULAR_EIP55), [{ edicaoId: "R-1", lances: 1 }]);
});
