// UTAC106j-fix — FRONTEIRA DE AUTH DOS 4 ENDPOINTS Via B (token REAL, sem mock do verificador).
//
// PORQUE EXISTE: o diagnóstico UTAC106j mediu que os 4 hooks da Via B pediam o Bearer ao
// `POST /auth-lance` (JWT `tipo:"lance-auth"`) enquanto os 4 endpoints validam com
// `verificarUserSession` (`_lib/jwt.mjs:81`, rejeita tudo o que não seja `user-session`/`admin-access`)
// ⇒ `401 token_invalido` em produção. Os testes existentes NÃO apanhavam isso: o frontend aliasa o
// `useTrocarPorSenhas` a um duplo com token FIXO, e o `_tests/ler-pontos.test.mjs` mockava o PRÓPRIO
// `verificarUserSession`. Este teste fecha a cegueira do lado do BACKEND: assina tokens a sério
// (`assinarUserSession`/`assinarLanceAuth` sobre o `_lib/jwt.mjs` REAL) e mede a resposta HTTP dos
// 4 handlers REAIS.
//
// O que prova (o que importa para o fix):
//   · NEGATIVO — `lance-auth` (o que os hooks enviavam) → 401 `token_invalido` nos 4 endpoints;
//   · POSITIVO — `user-session` (o que o fix passa a enviar) → NÃO é 401 (passa a autenticação);
//   · controlos — sem Bearer → 401 `token_ausente`; Bearer não assinado → 401 `token_invalido`.
//
// Duplos SÓ nas fronteiras de I/O (o `_lib/jwt.mjs` é o REAL): `@netlify/blobs`, `supabase-client`
// (PostgREST mínimo p/ o `ler-pontos`) e `sentry-server`. Nenhum endpoint de produção é alterado.
//
// node --test --experimental-test-module-mocks _tests/auth-via-b-401.test.mjs
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { criarBlobs } from "./_blobs-cas-duplo.mjs";

process.env.JWT_SECRET = "segredo-de-teste-auth-via-b-com-comprimento-suficiente";

const A = "0xaaa0000000000000000000000000000000000001";

// ── Duplo PostgREST mínimo (pontos + palpites), o mesmo rigor do `ler-pontos.test.mjs` ───────────
let DB;
function criarDuplo(pontosRegistos = [], palpites = []) {
  const db = { pontos: pontosRegistos, palpites };
  const erro = (code, message) => ({ data: null, error: { code, message } });
  return {
    from(tabela) {
      if (!(tabela in db)) throw new Error(`duplo: tabela ${tabela} não modelada`);
      const st = { op: null, dados: null, filtros: [], ordem: [], terminal: null };
      const api = {
        select() { if (st.op === null) st.op = "select"; return api; },
        insert(d) { st.op = "insert"; st.dados = d; return api; },
        update(d) { st.op = "update"; st.dados = d; return api; },
        eq(c, v) { st.filtros.push([c, v, "eq"]); return api; },
        in(c, vs) { st.filtros.push([c, vs, "in"]); return api; },
        order(c, o) { st.ordem.push([c, o?.ascending !== false]); return api; },
        maybeSingle() { st.terminal = "maybe"; return api; },
        single() { st.terminal = "single"; return api; },
        then(res, rej) { return Promise.resolve().then(exec).then(res, rej); },
      };
      for (const m of ["neq", "gt", "lt", "gte", "lte", "is", "or", "not", "filter", "limit", "range", "delete", "upsert", "ilike"]) {
        api[m] = () => { throw new Error(`duplo: .${m}() não modelado`); };
      }
      const casa = (l) => st.filtros.every(([c, v, op]) => (op === "eq" ? l[c] === v : v.includes(l[c])));
      function exec() {
        const t = db[tabela];
        if (st.op === "insert") { const l = { ...st.dados }; if (t.some((x) => x.endereco === l.endereco)) return erro("23505", "dup"); t.push(l); return { data: l, error: null }; }
        if (st.op === "update") { const a = t.filter(casa); for (const l of a) Object.assign(l, st.dados); return { data: a, error: null }; }
        let linhas = t.filter(casa).slice();
        for (const [c, asc] of [...st.ordem].reverse()) linhas.sort((a, b) => (a[c] === b[c] ? 0 : a[c] > b[c] ? 1 : -1) * (asc ? 1 : -1));
        if (st.terminal === "maybe") return { data: linhas[0] ?? null, error: null };
        if (st.terminal === "single") return linhas.length === 1 ? { data: linhas[0], error: null } : erro("PGRST116", "não single");
        return { data: linhas, error: null };
      }
      return api;
    },
  };
}

const B = criarBlobs();
mock.module("@netlify/blobs", { namedExports: { getStore: (o) => B.getStore(o) } });
mock.module("../_lib/supabase-client.mjs", {
  namedExports: {
    getSupabase: () => ({ from: (t) => DB.from(t) }),
    getSupabaseReadOnly: () => ({ from: (t) => DB.from(t) }),
    supabaseConfigurado: () => true,
  },
});
mock.module("../_lib/sentry-server.mjs", {
  namedExports: { captureSecurityAlert: async () => {}, Sentry: {} },
});

// ⚠️ O `_lib/jwt.mjs` é o REAL — é a peça em teste (o TIPO do token).
const { assinarUserSession, assinarLanceAuth } = await import("../_lib/jwt.mjs");
const handlers = {
  "comprar-passe-pontos": (await import("../comprar-passe-pontos.mjs")).default,
  "ler-pontos": (await import("../ler-pontos.mjs")).default,
  "registar-palpite": (await import("../registar-palpite.mjs")).default,
  "resgatar-cartao": (await import("../resgatar-cartao.mjs")).default,
};
const NOMES = Object.keys(handlers);
const METODO = (nome) => (nome === "ler-pontos" ? "GET" : "POST");

let ip = 0;
async function chamar(nome, token, body = {}) {
  const headers = { "content-type": "application/json", "x-nf-client-connection-ip": `10.9.9.${(++ip % 250) + 1}` };
  if (token) headers.authorization = `Bearer ${token}`;
  const metodo = METODO(nome);
  const init = { method: metodo, headers };
  if (metodo === "POST") init.body = JSON.stringify(body);
  const res = await handlers[nome](new Request(`https://x/.netlify/functions/${nome}`, init));
  let corpo = null; try { corpo = await res.json(); } catch { /* sem corpo */ }
  return { status: res.status, corpo };
}

test("NEGATIVO — `lance-auth` (o que os 4 hooks enviavam) → 401 token_invalido em TODOS", async () => {
  const tk = await assinarLanceAuth(A);
  for (const nome of NOMES) {
    DB = criarDuplo();
    const r = await chamar(nome, tk);
    assert.equal(r.status, 401, `${nome}: devia RECUSAR o lance-auth (era este o 401 de produção)`);
    assert.equal(r.corpo?.error?.code, "token_invalido", `${nome}: código do erro`);
  }
});

// Status esperado com `user-session` + corpo mínimo (`{}`) — fixa o resultado por endpoint para um
// 500 (ou um 400 onde se espera 200) NÃO passar. ℹ️1 do validador: `!= 401` sozinho deixava passar
// qualquer erro de negócio. Medido: 200/400/400/400 (o `ler-pontos` chega à leitura; os 3 POST ficam
// na validação do corpo, DEPOIS da autenticação).
const ESPERADO_USER = {
  "ler-pontos": 200,
  "comprar-passe-pontos": 400, // sem { idempotencyKey } válida
  "registar-palpite": 400,     // sem { valor } válido
  "resgatar-cartao": 400,      // sem { idempotencyKey } válida
};

test("POSITIVO — `user-session` (o que o fix passa a enviar) → passa a AUTENTICAÇÃO (status esperado) em TODOS", async () => {
  const tk = await assinarUserSession(A);
  for (const nome of NOMES) {
    DB = criarDuplo([{ endereco: A, pontos: 0, historico: [], atualizado_em: "2026-10-04T00:00:00.000Z" }]);
    const r = await chamar(nome, tk);
    assert.notEqual(r.status, 401, `${nome}: com user-session NÃO pode dar 401 (recebi ${r.status})`);
    assert.notEqual(r.corpo?.error?.code, "token_invalido", `${nome}: não pode ser token_invalido`);
    assert.notEqual(r.status, 500, `${nome}: um 500 não é «passou a autenticação»`);
    assert.equal(r.status, ESPERADO_USER[nome], `${nome}: status esperado (medido)`);
  }
});

test("CONTROLO — sem Bearer → 401 token_ausente em TODOS", async () => {
  for (const nome of NOMES) {
    DB = criarDuplo();
    const r = await chamar(nome, null);
    assert.equal(r.status, 401, nome);
    assert.equal(r.corpo?.error?.code, "token_ausente", nome);
  }
});

test("CONTROLO — Bearer não assinado → 401 token_invalido em TODOS", async () => {
  for (const nome of NOMES) {
    DB = criarDuplo();
    const r = await chamar(nome, "x.y.z");
    assert.equal(r.status, 401, nome);
    assert.equal(r.corpo?.error?.code, "token_invalido", nome);
  }
});

test("INVERSÃO Via A — o `comprar-senhas` (que funcionava) ACEITA `lance-auth` e REJEITA `user-session`", async () => {
  const comprarSenhas = (await import("../comprar-senhas.mjs")).default;
  const comLance = await comprarSenhas(new Request("https://x/.netlify/functions/comprar-senhas", {
    method: "POST", body: JSON.stringify({ endereco: A, qtd: 1 }),
    headers: { "content-type": "application/json", authorization: `Bearer ${await assinarLanceAuth(A)}`,
      "x-nf-client-connection-ip": "10.9.9.201" } }));
  assert.notEqual(comLance.status, 401, "a Via A ACEITA lance-auth (não é 401)");
  const comUser = await comprarSenhas(new Request("https://x/.netlify/functions/comprar-senhas", {
    method: "POST", body: JSON.stringify({ endereco: A, qtd: 1 }),
    headers: { "content-type": "application/json", authorization: `Bearer ${await assinarUserSession(A)}`,
      "x-nf-client-connection-ip": "10.9.9.202" } }));
  assert.equal(comUser.status, 401, "a Via A REJEITA user-session (inversão perfeita)");
});
