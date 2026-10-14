// UTAC110g (FRENTE C) — notificação in-app (C1) + e-mail de confirmação com a Nota Técnica (C1-email/C2).
//
// O que se MEDE (execução real do handler, não proxy de texto):
//   · a notificação in-app passa a dizer o PRAZO de 30 dias (R18-110g-3) e quem paga o envio (R18-110g-2);
//   · o `email?` OPCIONAL do corpo manda a confirmação por SendGrid (`_lib/email.mjs`), com o prazo e a
//     Nota Técnica em texto, e NÃO é persistido em lado nenhum;
//   · sem `email` nada muda (retro-compatível); `email` inválido → 400 e **nada é debitado**;
//   · a repetição idempotente NÃO reenvia e-mail;
//   · falha do e-mail não altera a resposta (fail-soft).
//
// Duplo só nas fronteiras: Supabase inline (pontos+resgates) + `adicionarNotificacao` + `enviarEmail`
// capturados. O `resgatar-cartao.mjs`, `_lib/passe-pontos.mjs`, `_lib/resgates.mjs`, `_lib/pedidos.mjs`
// e `_lib/validate.mjs` são os REAIS (a validação do e-mail/morada não é duplicada no teste).
//
// node --test --experimental-test-module-mocks _tests/utac110g-c1c2-email.test.mjs
import { test, mock } from "node:test";
import assert from "node:assert/strict";

const A = "0xaaa0000000000000000000000000000000000001";
process.env.JWT_SECRET = "segredo-de-teste-110g-c-com-comprimento-suficiente";

let DB;
function criarDuplo(seed = {}) {
  const db = {
    pontos: (seed.pontos ?? []).map((p) => ({ historico: [], historico_lance: [], ...p })),
    palpites: (seed.palpites ?? []).map((p) => ({ ...p })),
    resgates: (seed.resgates ?? []).map((r) => ({ ...r })),
  };
  let seq = 0;
  const erro = (code, message) => ({ data: null, error: { code, message } });
  function from(tabela) {
    if (!(tabela in db)) throw new Error(`duplo: tabela ${tabela} não modelada`);
    const st = { op: null, dados: null, filtros: [], terminal: null };
    const api = {
      select() { if (st.op === null) st.op = "select"; return api; },
      insert(d) { st.op = "insert"; st.dados = d; return api; },
      update(d) { st.op = "update"; st.dados = d; return api; },
      eq(c, v) { st.filtros.push([c, v]); return api; },
      order() { return api; },
      maybeSingle() { st.terminal = "maybe"; return api; },
      single() { st.terminal = "single"; return api; },
      then(res, rej) { return Promise.resolve().then(exec).then(res, rej); },
    };
    for (const m of ["neq", "gt", "lt", "gte", "lte", "in", "is", "or", "not", "filter", "limit", "range", "delete", "upsert", "ilike"]) {
      api[m] = () => { throw new Error(`duplo: .${m}() não modelado`); };
    }
    const casa = (l) => st.filtros.every(([c, v]) => l[c] === v);
    function exec() {
      const t = db[tabela];
      if (st.op === "insert") {
        const l = { ...st.dados };
        if (tabela === "resgates") {
          if (t.some((r) => r.idempotency_key === l.idempotency_key)) return erro("23505", "duplicate key");
          l.id = ++seq;
        }
        if (tabela === "pontos" && t.some((p) => p.endereco === l.endereco)) return erro("23505", "dup");
        t.push(l);
        return { data: l, error: null };
      }
      if (st.op === "update") { const a = t.filter(casa); for (const l of a) Object.assign(l, st.dados); return { data: a.map((l) => ({ endereco: l.endereco })), error: null }; }
      const linhas = t.filter(casa).slice();
      if (st.terminal === "maybe") return { data: linhas[0] ?? null, error: null };
      if (st.terminal === "single") return linhas.length === 1 ? { data: linhas[0], error: null } : erro("PGRST116", "não single");
      return { data: linhas, error: null };
    }
    return api;
  }
  return { db, from };
}

// ── Capturas das fronteiras ─────────────────────────────────────────────────────────────────────
const notificacoes = [];
let emails = [];
let EMAIL_REJEITA = false;

mock.module("../_lib/supabase-client.mjs", {
  namedExports: {
    getSupabase: () => ({ from: (t) => DB.from(t) }),
    getSupabaseReadOnly: () => ({ from: (t) => DB.from(t) }),
    supabaseConfigurado: () => true,
  },
});
mock.module("../_lib/jwt.mjs", { namedExports: { verificarUserSession: async () => ({ endereco: A, tipo: "user-session" }) } });
mock.module("../_lib/system-state.mjs", {
  namedExports: { sistemaPausado: () => false, lerEstadoSistema: async () => ({ status: "ativo" }), escreverEstadoSistema: async () => {} },
});
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/notificacoes-usuario.mjs", {
  namedExports: {
    adicionarNotificacao: async (endereco, n) => { notificacoes.push({ endereco, ...n }); return true; },
    // `_lib/edicoes-core.mjs` importa este símbolo — o duplo tem de o oferecer (senão o import rebenta).
    gerarResumosPosEdicao: async () => [],
    lerNotificacoes: async () => [],
    marcarLidas: async () => true,
    MAX_NOTIF: 50,
  },
});
mock.module("../_lib/email.mjs", {
  namedExports: {
    enviarEmail: async (opts) => {
      if (EMAIL_REJEITA) throw new Error("SENDGRID_API_KEY não configurada no ambiente");
      emails.push(opts);
      return { ok: true, id: "sg-teste" };
    },
  },
});

const mod = await import("../resgatar-cartao.mjs");
const resgatarCartao = mod.default;

const MORADA_OK = {
  nome: "Maria Quildo", cpf: "11144477735", cep: "69027010", logradouro: "Rua das Flores",
  numero: "42", complemento: "", bairro: "Centro", cidade: "Manaus", uf: "AM", telefone: "92999999999",
};
const compra = (n) => ({ tipo: "compra", pontos: n, ref: `c${n}`, data: "2026-10-01T00:00:00.000Z" });
const corpo = (extra = {}) => ({ cartaoId: "cartao-familia-quildo", morada: MORADA_OK, idempotencyKey: "k-110g-0001", ...extra });

function semear(historico, total) {
  DB = criarDuplo({ pontos: [{ endereco: A, pontos: total, historico, atualizado_em: "2026-10-13T00:00:00.000Z" }] });
  notificacoes.length = 0; emails = []; EMAIL_REJEITA = false;
}
const post = (corpoJson) => resgatarCartao(new Request("https://ex.test/x", {
  method: "POST", headers: { authorization: "Bearer x" }, body: JSON.stringify(corpoJson),
}));
const entrarResgate = () => (DB.db.pontos[0].historico ?? []).filter((h) => h.tipo === "resgate");

// ═══ C1 — notificação in-app com o PRAZO (R18-110g-3) e o pagador (R18-110g-2) ═══════════════════
test("C1 a notificação in-app diz 30 dias e quem paga o envio (não o texto antigo vago)", async () => {
  semear([compra(50)], 50);
  const res = await post(corpo());
  assert.equal(res.status, 201);
  assert.equal(notificacoes.length, 1, "uma notificação ao titular");
  assert.equal(notificacoes[0].endereco, A);
  assert.equal(notificacoes[0].tipo, "resgate");
  assert.equal(notificacoes[0].mensagem, mod.MSG_NOTIFICACAO_RESGATE);
  assert.match(notificacoes[0].mensagem, /30 dias/, "o prazo decidido pelo operador");
  assert.match(notificacoes[0].mensagem, /Fam[íi]lia Quildo/, "quem paga o envio (R18-110g-2)");
  assert.doesNotMatch(notificacoes[0].mensagem, /vai preparar o envio\.$/, "o texto antigo (sem prazo) saiu");
});

// ═══ C1-email + C2 — confirmação por e-mail com a Nota Técnica ═══════════════════════════════════
test("C1-email `email` válido no corpo → UMA confirmação, com prazo e Nota Técnica", async () => {
  semear([compra(50)], 50);
  const res = await post(corpo({ email: "  Maria.Quildo@Example.COM " }));
  assert.equal(res.status, 201);
  assert.equal(emails.length, 1, "exactamente um e-mail");
  assert.equal(emails[0].para, "maria.quildo@example.com", "normalizado (minúsculas + trim)");
  assert.match(emails[0].assunto, /30 dias/);
  assert.match(emails[0].mensagem, /até 30 dias corridos/);
  assert.match(emails[0].mensagem, /Nota Técnica/, "C2 — a Nota Técnica vai em texto no e-mail");
  assert.match(emails[0].mensagem, /Maria/);
});

test("C1-email CONTROLO — sem `email` no corpo NADA muda: 201, sem e-mail, notificação igual", async () => {
  semear([compra(50)], 50);
  const res = await post(corpo());
  assert.equal(res.status, 201);
  assert.equal(emails.length, 0, "sem destino não se envia");
  assert.equal(notificacoes.length, 1, "a notificação in-app continua");
  assert.equal((await res.json()).ok, true);
});

test("C1-email `email` INVÁLIDO → 400 email_invalido e NADA é debitado nem criado", async () => {
  semear([compra(50)], 50);
  const res = await post(corpo({ email: "sem-arroba" }));
  const b = await res.json();
  assert.equal(res.status, 400);
  assert.equal(b.error.code, "email_invalido");
  assert.equal(emails.length, 0);
  assert.equal(DB.db.resgates.length, 0, "nenhum pedido criado");
  assert.equal(entrarResgate().length, 0, "nenhum débito");
  assert.equal(DB.db.pontos[0].pontos, 50, "os 50 pontos continuam lá");
});

test("C1-email a repetição IDEMPOTENTE (mesma chave) NÃO reenvia e-mail", async () => {
  semear([compra(60)], 60);
  const c = corpo({ email: "maria@example.com" });
  const r1 = await post(c);
  const r2 = await post(c);
  assert.equal(r1.status, 201);
  assert.equal(r2.status, 200, "2.ª tentativa = idempotente");
  assert.equal((await r2.json()).idempotent, true);
  assert.equal(emails.length, 1, "um e-mail, não dois");
  assert.equal(notificacoes.length, 1, "uma notificação, não duas");
});

test("C1-email FAIL-SOFT — o fornecedor de e-mail falha → o resgate continua 201", async () => {
  semear([compra(50)], 50);
  EMAIL_REJEITA = true;
  const res = await post(corpo({ email: "maria@example.com" }));
  const b = await res.json();
  assert.equal(res.status, 201, "a falha do e-mail não pode partir o resgate");
  assert.equal(b.ok, true);
  assert.ok(b.resgateId, "o pedido existe e tem id");
  assert.equal(DB.db.resgates.length, 1, "o pedido foi criado");
  assert.equal(entrarResgate().length, 1, "os 50 pontos foram debitados");
});

// ═══ O e-mail NÃO é persistido (minimização) e o texto é puro ════════════════════════════════════
test("LGPD o e-mail NÃO é guardado em `public.resgates` (só serve para enviar)", async () => {
  semear([compra(50)], 50);
  await post(corpo({ email: "maria@example.com" }));
  const linha = DB.db.resgates[0];
  assert.equal(JSON.stringify(linha).includes("maria@example.com"), false, "nenhum vestígio do e-mail na linha");
  assert.deepEqual(Object.keys(linha).sort(), ["cartao_id", "criado_em", "atualizado_em", "endereco", "id", "idempotency_key", "morada", "status"].sort());
});

test("montarEmailResgate é PURA e não rebenta sem dados (nome/id ausentes)", () => {
  const vazio = mod.montarEmailResgate();
  assert.equal(vazio.assunto, "Cartão colecionável resgatado — chega em 30 dias");
  assert.match(vazio.mensagem, /^Olá!/);
  assert.match(vazio.mensagem, /pedido nº —/);
  const comNome = mod.montarEmailResgate({ nome: "  Ana Paula Souza ", resgateId: 7 });
  assert.match(comNome.mensagem, /^Olá, Ana!/, "só o primeiro nome");
  assert.match(comNome.mensagem, /pedido nº 7/);
  assert.match(comNome.mensagem, /50 pontos/);
});
