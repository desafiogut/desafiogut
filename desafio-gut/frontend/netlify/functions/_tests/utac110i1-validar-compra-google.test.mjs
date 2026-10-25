// utac110i1-validar-compra-google.test.mjs — UTAC110i.1 (FRENTE C). Endpoint `validar-compra-google`.
//
// REAIS: `validar-compra-google.mjs`, `_lib/google-play-billing.mjs` (a cadeia OAuth2/JWT é
// executada a sério — a chave RS256 é gerada no arranque do teste), `_lib/comprar-passe-tipado.mjs`
// (a MESMA cadeia de crédito do PIX), `_lib/passe-pontos.mjs`, `_lib/ledger-lance.mjs`,
// `_lib/eco-quildo.mjs`, `_lib/jwt.mjs` (tokens ASSINADOS — nunca se mocka o verificador).
// Duplos SÓ nas fronteiras: Blobs, Supabase (tabela `google_play_compras` + `pontos` modeladas aqui
// com as colunas das migrações, mais o duplo partilhado do 105a para saldo_rs/eco_quildo), Sentry
// (espiado), rate-limiter (fixo) e o `fetch` da Google (OAuth2 + androidpublisher).
//
// O que se prova (GATE 8 — bidireccional):
//   (a) recibo válido ⇒ 201 e os benefícios do Passe creditados, SEM tocar no saldo R$;
//   (b) recibo inválido/cancelado/pendente/indisponível ⇒ 409/503 e NADA creditado;
//   (c) pedido inválido (tipo, sku, token, sessão) ⇒ 400/401 antes de ir à Google;
//   + idempotência pelo recibo (o mesmo token nunca credita 2×) · retry de uma compra a MEIO ·
//   recibo de OUTRA conta · o registo guarda o que foi entregue · A/B contra o PIX (que DEBITA).
//
// node --test --experimental-test-module-mocks _tests/utac110i1-validar-compra-google.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { criarBlobs } from "./_blobs-cas-duplo.mjs";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

process.env.JWT_SECRET = "segredo-de-teste-utac110i1-validar-compra-google-comprido-suficiente";

// ── credencial de teste: uma service account REAL (chave RS256 gerada agora, nada de fixtures) ────
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});
process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = JSON.stringify({
  type: "service_account", client_email: "billing@desafiogut.iam.gserviceaccount.com", private_key: privateKey,
});

// ── `pontos` (colunas da migração 20261013) e `google_play_compras` (migração 20261016) ───────────
function criarTabelaPontos(tabelas, g) {
  const COLS = ["endereco", "pontos", "historico", "atualizado_em", "creditos_lance", "pontos_lance", "historico_lance"];
  const erro = (code, message) => ({ data: null, error: { code, message, details: null, hint: null } });
  return () => {
    const st = { op: "select", filtros: [], retorno: false, dados: null, terminal: null };
    const api = {
      select() { if (st.op !== "select") st.retorno = true; return api; },
      insert(d) { st.op = "insert"; st.dados = d; return api; },
      update(d) { st.op = "update"; st.dados = d; return api; },
      eq(c, v) { st.filtros.push([c, v]); return api; },
      maybeSingle() { st.terminal = "maybe"; return api; },
      then(res, rej) { return Promise.resolve().then(exec).then(res, rej); },
    };
    for (const m of ["neq", "gt", "lt", "in", "is", "or", "filter", "limit", "range", "order", "delete", "upsert", "single"]) {
      api[m] = () => { throw new Error(`duplo: .${m}() não modelado`); };
    }
    function validar(l) {
      for (const c of Object.keys(l)) if (!COLS.includes(c)) return erro("42703", `column "${c}" does not exist`);
      for (const c of ["pontos", "creditos_lance", "pontos_lance"]) {
        if (!Number.isInteger(l[c]) || l[c] < 0) return erro("23514", `${c}_check`);
      }
      if (!Array.isArray(l.historico) || !Array.isArray(l.historico_lance)) return erro("23514", "array_check");
      return null;
    }
    function exec() {
      const f = g.falhar.pontos;
      if (f && (!f.op || f.op === st.op) && (!f.se || f.se(st))) return erro(f.code ?? "XX000", "falha simulada");
      const casa = (l) => st.filtros.every(([c, v]) => l[c] === v);
      let linhas;
      if (st.op === "insert") {
        const nova = { pontos: 0, historico: [], atualizado_em: "x", creditos_lance: 0, pontos_lance: 0, historico_lance: [], ...st.dados };
        const e = validar(nova); if (e) return e;
        if (tabelas.pontos.some((o) => o.endereco === nova.endereco)) return erro("23505", "duplicate key");
        tabelas.pontos.push(nova); linhas = [nova];
      } else if (st.op === "update") {
        for (const c of Object.keys(st.dados)) if (!COLS.includes(c)) return erro("42703", `column "${c}" does not exist`);
        linhas = tabelas.pontos.filter(casa);
        for (const l of linhas) { const e = validar({ ...l, ...st.dados }); if (e) return e; }
        linhas.forEach((l) => Object.assign(l, st.dados));
      } else {
        linhas = tabelas.pontos.filter(casa);
      }
      const copia = linhas.map((l) => structuredClone(l));
      if (st.op !== "select" && !st.retorno) return { data: null, error: null };
      if (st.terminal === "maybe") return { data: copia[0] ?? null, error: null };
      return { data: copia, error: null };
    }
    return api;
  };
}

function criarTabelaCompras(tabelas, g) {
  const COLS = ["purchase_token", "order_id", "produto_id", "tipo_passe", "endereco", "estado",
    "pontos", "creditos_lance", "eco_quildo", "motivo", "payload", "criado_em", "atualizado_em"];
  const erro = (code, message) => ({ data: null, error: { code, message, details: null, hint: null } });
  return () => {
    const st = { op: "select", filtros: [], retorno: false, dados: null, terminal: null };
    const api = {
      select() { if (st.op !== "select") st.retorno = true; return api; },
      insert(d) { st.op = "insert"; st.dados = d; return api; },
      update(d) { st.op = "update"; st.dados = d; return api; },
      eq(c, v) { st.filtros.push([c, v]); return api; },
      maybeSingle() { st.terminal = "maybe"; return api; },
      then(res, rej) { return Promise.resolve().then(exec).then(res, rej); },
    };
    for (const m of ["neq", "gt", "lt", "in", "is", "or", "filter", "limit", "range", "order", "delete", "upsert", "single"]) {
      api[m] = () => { throw new Error(`duplo: .${m}() não modelado`); };
    }
    function exec() {
      const f = g.falhar.compras;
      if (f && (!f.op || f.op === st.op) && (!f.se || f.se(st))) return erro(f.code ?? "XX000", "falha simulada");
      const casa = (l) => st.filtros.every(([c, v]) => l[c] === v);
      let linhas;
      if (st.op === "insert") {
        const nova = {
          order_id: null, estado: "recebida", pontos: null, creditos_lance: null, eco_quildo: null,
          motivo: null, payload: null, criado_em: "x", atualizado_em: "x", ...st.dados,
        };
        for (const c of Object.keys(nova)) if (!COLS.includes(c)) return erro("42703", `column "${c}" does not exist`);
        if (!["relampago", "programado"].includes(nova.tipo_passe)) return erro("23514", "tipo_passe_check");
        if (!["recebida", "creditada", "falhada"].includes(nova.estado)) return erro("23514", "estado_check");
        // PK = purchase_token (é a trava de idempotência; tem de doer quando repetida).
        if (tabelas.google_play_compras.some((o) => o.purchase_token === nova.purchase_token)) {
          return erro("23505", "duplicate key value violates unique constraint \"google_play_compras_pkey\"");
        }
        tabelas.google_play_compras.push(nova); linhas = [nova];
      } else if (st.op === "update") {
        for (const c of Object.keys(st.dados)) if (!COLS.includes(c)) return erro("42703", `column "${c}" does not exist`);
        linhas = tabelas.google_play_compras.filter(casa);
        for (const l of linhas) {
          const novo = { ...l, ...st.dados };
          if (!["recebida", "creditada", "falhada"].includes(novo.estado)) return erro("23514", "estado_check");
          for (const c of ["pontos", "creditos_lance", "eco_quildo"]) {
            if (novo[c] !== null && (!Number.isInteger(novo[c]) || novo[c] < 0)) return erro("23514", `${c}_check`);
          }
        }
        linhas.forEach((l) => Object.assign(l, st.dados));
      } else {
        linhas = tabelas.google_play_compras.filter(casa);
      }
      const copia = linhas.map((l) => structuredClone(l));
      if (st.op !== "select" && !st.retorno) return { data: null, error: null };
      if (st.terminal === "maybe") return { data: copia[0] ?? null, error: null };
      return { data: copia, error: null };
    }
    return api;
  };
}

// ── fronteiras dupladas ──────────────────────────────────────────────────────────────────────────
const alertas = [];
let B = criarBlobs(), S = criarSupabase();

function novoCliente() {
  B = criarBlobs(); S = criarSupabase();
  S.tabelas.pontos = [];
  S.tabelas.eco_quildo = [];
  S.tabelas.eco_quildo_lastro = [];
  S.tabelas.google_play_compras = [];
  S.g.falhar = S.g.falhar ?? {};
  const fromPontos = criarTabelaPontos(S.tabelas, S.g);
  const fromCompras = criarTabelaCompras(S.tabelas, S.g);
  const baseFrom = S.cliente.from;
  const fromPalpites = () => {
    const api = { select: () => api, eq: () => api, order: () => api,
      then: (res, rej) => Promise.resolve({ data: [], error: null }).then(res, rej) };
    return api;
  };
  return {
    from: (t) => (t === "pontos" ? fromPontos(t)
      : t === "google_play_compras" ? fromCompras(t)
      : t === "palpites" ? fromPalpites() : baseFrom(t)),
  };
}
let cliente = novoCliente();

mock.module("@netlify/blobs", { namedExports: { getStore: (o) => B.getStore(o) } });
mock.module("../_lib/supabase-client.mjs", { namedExports: {
  getSupabase: () => cliente, getSupabaseReadOnly: () => cliente, supabaseConfigurado: () => true } });
mock.module("../_lib/sentry-server.mjs", { namedExports: {
  captureSecurityAlert: async (k, p) => { alertas.push([k, p]); }, Sentry: {} } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });

const { default: hValidar, refGoogle } = await import("../validar-compra-google.mjs");
const { _limparCacheToken } = await import("../_lib/google-play-billing.mjs");
const { default: hPixRelampago } = await import("../comprar-passe-relampago.mjs");
const { assinarUserSession } = await import("../_lib/jwt.mjs");

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OUTRO = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const TOKEN = "play-token-abcdefghijklmnopqrstuvwxyz-0123456789";
const PROD = { relampago: "passe_relampago_r2", programado: "passe_programado_r2" };

// ── duplo do `fetch` da Google: OAuth2 + androidpublisher ────────────────────────────────────────
const HTTP = {
  estado: 0, consumo: 0, reconhecida: 0, orderId: "GPA.3399-0000-0000-00001",
  httpStatus: 200, redeEmBaixo: false, tokenHttpStatus: 200,
};
let chamadasGoogle = [];
function instalarDuploGoogle() {
  chamadasGoogle = [];
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    chamadasGoogle.push({ url: u, metodo: opts.method ?? "GET" });
    if (HTTP.redeEmBaixo) throw new Error("rede em baixo");
    if (u.includes("oauth2.googleapis.com/token")) {
      if (HTTP.tokenHttpStatus !== 200) return new Response("{}", { status: HTTP.tokenHttpStatus });
      return new Response(JSON.stringify({ access_token: "TOKEN-ACESSO-GOOGLE", expires_in: 3600, token_type: "Bearer" }),
        { status: 200, headers: { "content-type": "application/json" } });
    }
    if (u.includes("androidpublisher.googleapis.com")) {
      if (HTTP.httpStatus !== 200) return new Response("{}", { status: HTTP.httpStatus });
      return new Response(JSON.stringify({
        purchaseState: HTTP.estado, consumptionState: HTTP.consumo, acknowledgementState: HTTP.reconhecida,
        orderId: HTTP.orderId, purchaseTimeMillis: "1700000000000", quantity: HTTP.quantidade, // UTAC112: parametrizável (default 1)
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error(`fetch inesperado: ${u}`);
  };
}
const soGoogle = (u) => chamadasGoogle.filter((c) => c.url.includes("androidpublisher"));

beforeEach(() => {
  cliente = novoCliente();
  alertas.length = 0;
  Object.assign(HTTP, {
    estado: 0, consumo: 0, reconhecida: 0, orderId: "GPA.3399-0000-0000-00001",
    httpStatus: 200, redeEmBaixo: false, tokenHttpStatus: 200, quantidade: 1,
  });
  instalarDuploGoogle();
  // ⚠️ O access token da Google é CACHEADO no módulo. Sem o limpar, o caso «OAuth2 recusa» nunca
  // chegaria a bater no endpoint do token (usaria o token do teste anterior) — foi MEDIDO: dava 201.
  _limparCacheToken();
  S.tabelas.saldo_rs.push({ cliente_id: A, payload: { centavos: 500 }, atualizado_em: "x" });
  S.tabelas.eco_quildo_lastro.push({ id: 1, total_emitido: 0, total_usado: 0, reserva_rs_centavos: 0, atualizado_em: "x" });
});

let ip = 0;
const ipFresco = () => `10.12.0.${++ip % 250}`;
async function pedir(handler, { corpo, token, tokenAuth = "sessao" } = {}) {
  const h = { "content-type": "application/json", "x-nf-client-connection-ip": ipFresco() };
  if (tokenAuth === "sessao") h.authorization = `Bearer ${token ?? await assinarUserSession(A)}`;
  else if (tokenAuth === "lance") h.authorization = `Bearer ${await (await import("../_lib/jwt.mjs")).assinarLanceAuth(A)}`;
  const req = new Request("https://x/.netlify/functions/validar-compra-google", {
    method: "POST", headers: h, body: corpo === undefined ? "{}" : JSON.stringify(corpo),
  });
  const res = await handler(req);
  let json = null;
  try { json = await res.clone().json(); } catch { /* corpo vazio */ }
  return { status: res.status, json };
}
/** Por omissão acrescenta ao corpo base; `substituir:true` envia SÓ o corpo dado (para os casos em
 *  que a chave tem de estar AUSENTE — o spread sozinho não remove chaves). */
const pedirGoogle = (extra = {}) => pedir(hValidar, {
  corpo: extra.substituir ? extra.corpo : { tipo: "relampago", sku: PROD.relampago, purchaseToken: TOKEN, ...extra.corpo },
  token: extra.token, tokenAuth: extra.tokenAuth,
});

const pontos = (e = A) => S.tabelas.pontos.find((l) => l.endereco === e);
const eco = (e = A) => S.tabelas.eco_quildo.find((l) => l.endereco === e);
// UTAC110n — o Passe credita PONTOS DE LANCE (o crédito deixou de existir).
const lance = (e = A) => S.tabelas.pontos.find((l) => l.endereco === e)?.pontos_lance;
const saldoRs = (e = A) => S.tabelas.saldo_rs.find((l) => l.cliente_id === e)?.payload?.centavos;
const registo = (t = TOKEN) => S.tabelas.google_play_compras.find((l) => l.purchase_token === t);
const historicoPasse = (e = A) => (pontos(e)?.historico ?? []).filter((h) => h?.tipo === "compra");

// ═══ (a) POSITIVO ════════════════════════════════════════════════════════════════════════════════
test("(a) Relâmpago: 201 · +10 pontos · +200 PONTOS de lance · +1 ECOQUILDO · saldo R$ INTACTO", async () => {
  const r = await pedirGoogle();
  assert.equal(r.status, 201, JSON.stringify(r.json));
  assert.equal(r.json.ok, true);
  assert.equal(r.json.idempotent, false);
  assert.equal(r.json.tipo, "relampago");
  assert.equal(r.json.pontosFidelidade, 10);
  // ⚠️ UTAC110n: era `creditosLance: 1`. O Passe passou a dar +200 pontos de lance (Art. 16º VI).
  assert.equal(r.json.creditosLance, 0);
  assert.equal(r.json.ecoQuildo, 1);
  assert.equal(pontos().pontos, 10);
  assert.equal(lance(), 200);
  assert.equal(eco().saldo, 1);
  // ⚠️ O PONTO CENTRAL DESTE UTAC (R18-110i.1-1): o pagamento foi da GOOGLE — não se debita saldo R$.
  assert.equal(saldoRs(), 500, "o Billing debitou saldo R$ (só o PIX pode debitar)");
  assert.equal(registo().estado, "creditada");
  assert.equal(registo().pontos, 10);
  assert.equal(registo().creditos_lance, 0, "o registo do recibo já não guarda crédito");
  assert.equal(registo().eco_quildo, 1);
  assert.equal(registo().produto_id, PROD.relampago);
  assert.equal(soGoogle().length, 1, "a Google devia ser consultada exactamente uma vez");
  const lastro = S.tabelas.eco_quildo_lastro.find((l) => l.id === 1);
  assert.equal(lastro.total_emitido, 1, "o ECOQUILDO saiu sem lastro em R$ (Art. 50º)");
});

test("(a) Programado: 201 · +10 pontos · +1 ECOQUILDO · SEM créditos de lance", async () => {
  const r = await pedirGoogle({ corpo: { sku: PROD.programado, tipo: "programado", purchaseToken: TOKEN } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  assert.equal(r.json.tipo, "programado");
  assert.equal(r.json.pontosFidelidade, 10);
  assert.equal(r.json.creditosLance, undefined, "o Programado não credita lance");
  assert.equal(r.json.pontosLance, undefined, "o Programado não dá pontos de lance");
  assert.equal(r.json.ecoQuildo, 1);
  assert.equal(pontos().pontos, 10);
  assert.equal(lance() ?? 0, 0);
  assert.equal(saldoRs(), 500);
});

// ═══ IDEMPOTÊNCIA (ST5) ══════════════════════════════════════════════════════════════════════════
test("o MESMO recibo 2× ⇒ 200 idempotente, mesmos números, SEM repetir créditos nem consultar a Google", async () => {
  const r1 = await pedirGoogle();
  assert.equal(r1.status, 201);
  const r2 = await pedirGoogle();
  assert.equal(r2.status, 200, JSON.stringify(r2.json));
  assert.equal(r2.json.idempotent, true);
  assert.equal(r2.json.pontosFidelidade, 10);
  assert.equal(lance(), 200, "os pontos de lance foram creditados 2×");
  assert.deepEqual(JSON.parse(JSON.stringify(r2.json)), JSON.parse(JSON.stringify({ ...r1.json, idempotent: true })));
  assert.equal(pontos().pontos, 10, "os pontos foram creditados 2×");
  assert.equal(eco().saldo, 1, "o ECOQUILDO foi creditado 2×");
  assert.equal(historicoPasse().length, 1, "o histórico tem 2 entradas da mesma compra");
  assert.equal(soGoogle().length, 1, "a 2.ª entrega voltou a consultar a Google (devia sair do registo)");
});

test("dois RECIBOS diferentes ⇒ dois créditos (a chave é o token, não colide)", async () => {
  const r1 = await pedirGoogle();
  const r2 = await pedirGoogle({ corpo: { purchaseToken: `${TOKEN}-2` } });
  assert.equal(r1.status, 201);
  assert.equal(r2.status, 201);
  assert.equal(pontos().pontos, 20);
  assert.equal(eco().saldo, 2);
  assert.equal(S.tabelas.google_play_compras.length, 2);
});

test("compra a MEIO (pontos + lance escritos, ECOQUILDO não) ⇒ o retry COMPLETA sem repetir pontos", async () => {
  // Estado «a meio» semeado: a 1.ª tentativa creditou pontos + lance e caiu antes do ECOQUILDO
  // (é o que a cadeia faz: o ECOQUILDO é o ÚLTIMO passo de propósito).
  const ref = refGoogle("relampago", TOKEN);
  S.tabelas.pontos.push({
    endereco: A, pontos: 10, atualizado_em: "x", creditos_lance: 0, pontos_lance: 200,
    historico: [{ data: "x", tipo: "compra", pontos: 10, ref }],
    historico_lance: [{ data: "x", campo: "pontos_lance", motivo: "passe-relampago", delta: 200, ref }],
  });
  S.tabelas.google_play_compras.push({
    purchase_token: TOKEN, order_id: null, produto_id: PROD.relampago, tipo_passe: "relampago",
    endereco: A, estado: "falhada", pontos: null, creditos_lance: null, eco_quildo: null,
    motivo: "eco:lastro:ERRO_DB", payload: null, criado_em: "x", atualizado_em: "x",
  });

  const r = await pedirGoogle();
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.idempotent, true);
  assert.equal(r.json.pontosFidelidade, 10);
  assert.equal(r.json.ecoQuildo, 1);
  assert.equal(pontos().pontos, 10, "o retry creditou os pontos outra vez");
  assert.equal(historicoPasse().length, 1, "o histórico tem 2 entradas da mesma compra");
  assert.equal(lance(), 200, "o retry voltou a creditar os pontos de lance");
  assert.equal(eco().saldo, 1, "o retry não completou o ECOQUILDO");
  assert.equal(registo().estado, "creditada");
});

// ═══ (b) NEGATIVO — recibo que não vale ══════════════════════════════════════════════════════════
for (const [nome, cfg, status, code] of [
  ["cancelada (purchaseState 1)", { estado: 1 }, 409, "compra_cancelada"],
  ["pendente (purchaseState 2)", { estado: 2 }, 409, "compra_pendente"],
  ["estado desconhecido (3)", { estado: 3 }, 409, "compra_nao_encontrada"],
  ["token inexistente (HTTP 404)", { httpStatus: 404 }, 409, "compra_nao_encontrada"],
  ["token inválido (HTTP 410)", { httpStatus: 410 }, 409, "token_invalido"],
  ["credencial sem acesso (HTTP 403)", { httpStatus: 403 }, 503, "google_play_indisponivel"],
  ["Google em baixo (HTTP 500)", { httpStatus: 500 }, 503, "google_play_indisponivel"],
  ["rede em baixo", { redeEmBaixo: true }, 503, "google_play_indisponivel"],
  ["OAuth2 recusa (HTTP 400)", { tokenHttpStatus: 400 }, 503, "google_play_indisponivel"],
]) {
  test(`(b) recibo ${nome} ⇒ ${status} ${code} e NADA creditado`, async () => {
    Object.assign(HTTP, cfg);
    const r = await pedirGoogle();
    assert.equal(r.status, status, JSON.stringify(r.json));
    assert.equal(r.json.error.code, code);
    assert.equal(pontos(), undefined, "creditou pontos com um recibo inválido");
    assert.equal(eco(), undefined, "creditou ECOQUILDO com um recibo inválido");
    assert.equal(saldoRs(), 500, "mexeu no saldo R$");
    assert.equal(registo()?.estado, "falhada", "o registo devia ficar 'falhada'");
    assert.equal(registo()?.pontos, null);
  });
}

test("(b) SEM a env var da service account ⇒ 503 google_play_nao_configurado e ZERO idas à Google", async () => {
  const guardado = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  try {
    delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
    const r = await pedirGoogle();
    assert.equal(r.status, 503, JSON.stringify(r.json));
    assert.equal(r.json.error.code, "google_play_nao_configurado");
    assert.equal(chamadasGoogle.length, 0, "foi à Google sem credencial");
    assert.equal(pontos(), undefined);
    assert.equal(S.tabelas.google_play_compras.length, 0, "registou uma compra sem a poder validar");
  } finally { process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = guardado; }
});

test("(b) a credencial existe mas está ILEGÍVEL ⇒ 503, sem ir à Google", async () => {
  const guardado = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  try {
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = "{nao-e-json}";
    const r = await pedirGoogle();
    assert.equal(r.status, 503, JSON.stringify(r.json));
    assert.equal(r.json.error.code, "google_play_credencial_invalida");
    assert.equal(chamadasGoogle.length, 0);
  } finally { process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = guardado; }
});

test("(b) recibo de OUTRA conta ⇒ 409 e nada creditado (não se credita no endereço errado)", async () => {
  S.tabelas.google_play_compras.push({
    purchase_token: TOKEN, order_id: null, produto_id: PROD.relampago, tipo_passe: "relampago",
    endereco: OUTRO, estado: "recebida", pontos: null, creditos_lance: null, eco_quildo: null,
    motivo: null, payload: null, criado_em: "x", atualizado_em: "x",
  });
  const r = await pedirGoogle();
  assert.equal(r.status, 409, JSON.stringify(r.json));
  assert.equal(r.json.error.code, "compra_nao_encontrada");
  assert.equal(pontos(A), undefined);
  assert.equal(chamadasGoogle.length, 0, "validou um recibo que já sabe ser de outra conta");
  assert.ok(alertas.some(([k]) => k === "validar-compra-google_recibo_de_outra_conta"), "não alertou o alerta de segurança");
});

// ═══ (c) ENTRADA INVÁLIDA — nada disto chega à Google ════════════════════════════════════════════
for (const [nome, corpo, substituir] of [
  ["tipo desconhecido", { tipo: "pontos", sku: PROD.relampago }, false],
  ["tipo ausente", { sku: PROD.relampago, purchaseToken: TOKEN }, true],
  ["sku do OUTRO Passe (defesa em profundidade)", { tipo: "relampago", sku: PROD.programado }, false],
  ["sku inventado", { tipo: "relampago", sku: "passe_desafio_r2" }, false],
  ["sku ausente", { tipo: "relampago", purchaseToken: TOKEN }, true],
  ["purchaseToken curto", { purchaseToken: "abc" }, false],
  ["purchaseToken ausente", { tipo: "relampago", sku: PROD.relampago }, true],
  ["purchaseToken não-string", { purchaseToken: 12345 }, false],
]) {
  test(`(c) ${nome} ⇒ 400 e ZERO idas à Google`, async () => {
    const r = await pedirGoogle({ corpo, substituir });
    assert.equal(r.status, 400, JSON.stringify(r.json));
    assert.match(r.json.error.code, /tipo_invalido|sku_divergente|token_invalido/);
    assert.equal(chamadasGoogle.length, 0, "foi à Google com um pedido inválido");
    assert.equal(S.tabelas.google_play_compras.length, 0);
  });
}

test("(c) sem Bearer ⇒ 401 e ZERO idas à Google", async () => {
  const req = new Request("https://x/.netlify/functions/validar-compra-google", {
    method: "POST", headers: { "content-type": "application/json", "x-nf-client-connection-ip": ipFresco() },
    body: JSON.stringify({ tipo: "relampago", sku: PROD.relampago, purchaseToken: TOKEN }),
  });
  const res = await hValidar(req);
  assert.equal(res.status, 401);
  assert.equal(chamadasGoogle.length, 0);
  assert.equal(pontos(), undefined);
});

test("(c) token de LANCE (Via A) não serve: o endpoint exige sessão de utilizador", async () => {
  const r = await pedirGoogle({ tokenAuth: "lance" });
  assert.equal(r.status, 401, JSON.stringify(r.json));
  assert.equal(chamadasGoogle.length, 0);
});

test("(c) método GET ⇒ 405", async () => {
  const req = new Request("https://x/.netlify/functions/validar-compra-google", {
    method: "GET", headers: { "x-nf-client-connection-ip": ipFresco() },
  });
  assert.equal((await hValidar(req)).status, 405);
});

// ═══ A/B contra o PIX: os dois caminhos NÃO se confundem ═════════════════════════════════════════
test("A/B: o PIX DEBITA R$ 2,00; o Google Play NÃO debita — mesmos benefícios, pagamentos diferentes", async () => {
  const rPix = await pedir(hPixRelampago, { corpo: { idempotencyKey: "idem-key-110i1-ab-0001" } });
  assert.equal(rPix.status, 201, JSON.stringify(rPix.json));
  assert.equal(saldoRs(), 300, "o PIX devia ter debitado R$ 2,00 de R$ 5,00");
  assert.equal(pontos().pontos, 10);

  // Segunda metade do par: o MESMO fluxo pelo Google, com uma conta limpa.
  cliente = novoCliente();
  S.tabelas.saldo_rs.push({ cliente_id: A, payload: { centavos: 500 }, atualizado_em: "x" });
  S.tabelas.eco_quildo_lastro.push({ id: 1, total_emitido: 0, total_usado: 0, reserva_rs_centavos: 0, atualizado_em: "x" });
  const rGoogle = await pedirGoogle();
  assert.equal(rGoogle.status, 201, JSON.stringify(rGoogle.json));
  assert.equal(saldoRs(), 500, "o Google Play debitou saldo R$");
  assert.equal(pontos().pontos, 10, "os benefícios deviam ser os MESMOS do PIX");
  assert.equal(lance(), 200);
  assert.equal(eco().saldo, 1);
});

// ═══ o `ref` do Google ═══════════════════════════════════════════════════════════════════════════
test("refGoogle: determinístico, ≤ 200 chars, distinto por token e por tipo", () => {
  const a = refGoogle("relampago", TOKEN);
  assert.equal(a, refGoogle("relampago", TOKEN), "o ref não é determinístico (a idempotência cairia)");
  assert.match(a, /^passe-relampago:gpl-[0-9a-f]{32}$/);
  assert.ok(a.length <= 200);
  assert.notEqual(a, refGoogle("programado", TOKEN));
  assert.notEqual(a, refGoogle("relampago", `${TOKEN}-2`));
  assert.ok(refGoogle("relampago", "x".repeat(512)).length <= 200, "um token longo estoura o limite da ref");
});

test("o registo guarda o que foi entregue e o motivo recebe o orderId da Google", async () => {
  HTTP.orderId = "GPA.3399-7777-8888-99999";
  const r = await pedirGoogle();
  assert.equal(r.status, 201);
  assert.equal(registo().order_id, null, "o orderId só existe no motivo/validação — o insert não o tem à mão");
  assert.equal(registo().motivo, "GPA.3399-7777-8888-99999");
  assert.equal(registo().estado, "creditada");
  assert.equal(registo().tipo_passe, "relampago");
  assert.equal(registo().endereco, A);
});

test("falha do registo no fecho NÃO esconde a entrega: responde ok, alerta e o retry é idempotente", async () => {
  const original = cliente.from;
  cliente = {
    from: (t) => {
      const api = original(t);
      if (t !== "google_play_compras") return api;
      // O `update` (fecho) falha; o `select`/`insert` continuam bons.
      return new Proxy(api, {
        get: (alvo, prop) => (prop === "update" ? () => ({ eq: () => ({ then: (res) => Promise.resolve({ data: null, error: { code: "08006", message: "conexão caiu" } }).then(res) }) }) : alvo[prop]),
      });
    },
  };
  const r = await pedirGoogle();
  assert.equal(r.status, 201, JSON.stringify(r.json));
  assert.equal(pontos().pontos, 10, "os benefícios deviam estar entregues");
  assert.ok(alertas.some(([k]) => k === "validar-compra-google_fecho_registo_falhou"), "não alertou o fecho falhado");
  assert.equal(registo().estado, "recebida", "o registo ficou 'recebida' (o retry vai reprocessar)");
  // Retry: o registo diz 'recebida' ⇒ volta a validar e a cadeia é idempotente pela ref do token.
  cliente = novoCliente();
  S.tabelas.saldo_rs.push({ cliente_id: A, payload: { centavos: 500 }, atualizado_em: "x" });
  S.tabelas.eco_quildo_lastro.push({ id: 1, total_emitido: 0, total_usado: 0, reserva_rs_centavos: 0, atualizado_em: "x" });
  S.tabelas.pontos.push({ endereco: A, pontos: 10, historico: [{ data: "x", tipo: "compra", pontos: 10, ref: refGoogle("relampago", TOKEN) }], atualizado_em: "x", creditos_lance: 0, pontos_lance: 200, historico_lance: [{ data: "x", campo: "pontos_lance", motivo: "passe-relampago", ref: refGoogle("relampago", TOKEN), delta: 200 }] });
  S.tabelas.eco_quildo.push({ endereco: A, saldo: 1, historico: [{ data: "x", ref: refGoogle("relampago", TOKEN), delta: 1 }], atualizado_em: "x" });
  S.tabelas.eco_quildo_lastro[0].total_emitido = 1;
  const r2 = await pedirGoogle();
  assert.equal(r2.status, 200, JSON.stringify(r2.json));
  assert.equal(r2.json.idempotent, true);
  assert.equal(pontos().pontos, 10, "o retry creditou os pontos outra vez");
  assert.equal(eco().saldo, 1, "o retry creditou o ECOQUILDO outra vez");
  assert.equal(registo().estado, "creditada");
});

// ═══ achados da prova de mutação (mutantes sobreviventes B4 e B14) ═══════════════════════════════
test("CORRIDA: o mesmo recibo chega 2× ao mesmo tempo (o INSERT colide na PK) ⇒ 200 idempotente", async () => {
  // O pedido A lê o registo (não existe) e, ANTES do seu INSERT, o pedido B insere a MESMA linha já
  // 'creditada'. É a interleaving que o `23505` existe para apanhar: B4 (mutante) tratava-a como
  // «criei eu» e voltava a validar na Google e a responder 201.
  const ref = refGoogle("relampago", TOKEN);
  const original = cliente.from;
  cliente = {
    from: (t) => {
      const api = original(t);
      if (t !== "google_play_compras") return api;
      const proxy = new Proxy(api, {
        get: (alvo, prop) => {
          if (prop !== "insert") return alvo[prop];
          return (dados) => {
            // O concorrente B ganha a corrida: a linha entra já creditada e com os seus números.
            S.tabelas.google_play_compras.push({
              ...dados, estado: "creditada", pontos: 10, creditos_lance: 0, eco_quildo: 1,
              criado_em: "x", atualizado_em: "x",
            });
            return alvo.insert(dados); // …e o INSERT de A colide (23505)
          };
        },
      });
      return proxy;
    },
  };
  const r = await pedirGoogle();
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.idempotent, true);
  assert.equal(r.json.pontosFidelidade, 10);
  assert.equal(pontos(), undefined, "creditou benefícios depois de perder a corrida");
  assert.equal(chamadasGoogle.length, 0, "foi à Google depois de perder a corrida");
  assert.equal(S.tabelas.google_play_compras.length, 1, "duas linhas para o mesmo recibo");
  assert.ok(ref.length <= 200);
});

test("o ECOQUILDO é o ÚLTIMO passo: se o crédito dos PONTOS DE LANCE falhar, o ECOQUILDO NÃO é emitido", async () => {
  // Invariante da ordem da cadeia (110e): uma falha no crédito de lance não pode deixar um ECOQUILDO
  // emitido sem lastro de contrapartida — e o PIX seria reembolsado. B14 (mutante) creditava o
  // ECOQUILDO primeiro e deixava-o preso depois da falha.
  S.g.falhar.pontos = { se: (st) => Boolean(st.dados && "pontos_lance" in st.dados) };
  const r = await pedirGoogle();
  assert.equal(r.status, 502, JSON.stringify(r.json));
  assert.equal(r.json.error.code, "creditar_pontos_lance_falhou");
  assert.equal(eco(), undefined, "o ECOQUILDO foi emitido apesar da falha no lance");
  assert.equal(S.tabelas.eco_quildo_lastro[0].total_emitido, 0, "o lastro registou uma emissão que não devia existir");
  assert.equal(pontos()?.pontos ?? 0, 0, "os pontos ficaram creditados depois da falha");
  assert.equal(lance() ?? 0, 0);
  assert.equal(registo().estado, "falhada");
  assert.equal(saldoRs(), 500, "mexeu no saldo R$");
});

// ── UTAC112 — compra múltipla pela Google Play («Multi-quantity»: a quantidade vem do RECIBO) ────
const lastro = () => S.tabelas.eco_quildo_lastro.find((l) => l.id === 1);

test("UTAC112 G1: recibo com quantity 5 (Relâmpago) ⇒ +50 fidelidade · +1000 pontos de lance · +5 ECOQUILDO · lastro 5", async () => {
  HTTP.quantidade = 5;
  const r = await pedirGoogle();
  assert.equal(r.status, 201, JSON.stringify(r.json));
  assert.equal(r.json.quantidade, 5);
  assert.equal(pontos().pontos, 50);
  assert.equal(lance(), 1000);
  assert.equal(eco().saldo, 5);
  assert.equal(lastro().total_emitido, 5);
  assert.equal(historicoPasse().length, 1, "um só movimento de 5× na mesma ref");
  assert.equal(registo().payload?.quantidade, 5, "a quantidade fica registada no payload (R18-112-C)");
  assert.equal(saldoRs(), 500, "a Google não toca no saldo R$");
});

test("UTAC112 G2: o MESMO recibo de 3 entregue 2× ⇒ 200 com quantidade 3 e nada creditado 2×", async () => {
  HTTP.quantidade = 3;
  const r1 = await pedirGoogle({ corpo: { tipo: "programado", sku: PROD.programado } });
  const r2 = await pedirGoogle({ corpo: { tipo: "programado", sku: PROD.programado } });
  assert.equal(r1.status, 201);
  assert.equal(r2.status, 200);
  assert.equal(r2.json.quantidade, 3);
  assert.equal(pontos().pontos, 30);
  assert.equal(eco().saldo, 3);
  assert.equal(lance() ?? 0, 0, "o Programado não dá pontos de lance");
});

test("UTAC112 G3: quantity ausente, null, 0, fracção ou texto no recibo ⇒ conta como 1 (nunca 0)", async () => {
  for (const [i, q] of [undefined, null, 0, 2.5, "7"].entries()) {
    HTTP.quantidade = q;
    const r = await pedirGoogle({ corpo: { purchaseToken: `${TOKEN}-q${i}` } });
    assert.equal(r.status, 201, `quantity ${q}`);
    assert.equal(r.json.quantidade, 1, `quantity ${q}`);
  }
  assert.equal(pontos().pontos, 50);
});

test("UTAC112 G4: a quantidade NUNCA vem do corpo do cliente — só do recibo", async () => {
  HTTP.quantidade = 1;
  const r = await pedirGoogle({ corpo: { quantidade: 10, quantity: 10 } });
  assert.equal(r.status, 201);
  assert.equal(r.json.quantidade, 1);
  assert.equal(pontos().pontos, 10);
});
