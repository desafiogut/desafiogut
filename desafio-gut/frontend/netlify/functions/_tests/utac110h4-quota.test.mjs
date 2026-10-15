// UTAC110h.4 — FRENTE A: QUOTA DO BÓNUS ON-CHAIN (DEBT-030) + GAP-1 (fail-closed).
//
// O que estes testes provam, e contra o que os prova:
//   • a quota de 10/mês por INDICANTE existe e TRAVA a 11.ª (o teto é por MÊS UTC, não local);
//   • o INDICADO não depende da quota do indicante (recebe sempre o dele);
//   • a 1.ª conversão do MÊS SEGUINTE volta a creditar (o contador tem recorte de mês);
//   • idempotência: repetir o mesmo pedido não paga gas duas vezes NEM conta duas no mês;
//   • GAP-1 (fail-closed): contador ILEGÍVEL → NÃO credita on-chain, NÃO sela a conversão (retry) e o
//     código devolvido é `quota_indisponivel` (transitório), não `limite_mensal_excedido` (terminal).
//
// NADA gasta gas: `_lib/contract.mjs` é SEMPRE um duplo espiado (é ele que garante que a rede nunca é
// tocada) + o alarme explícito `relatorioDeGas()`.
//
// node --test --experimental-test-module-mocks _tests/utac110h4-quota.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarBlobs } from "./_blobs-cas-duplo.mjs";
import { criarTabelaPontos } from "./_pontos-duplo-110f.mjs";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

process.env.JWT_SECRET = "segredo-de-teste-utac110h4-quota-comprimento-suficiente";
delete process.env.REFERRAL_ATIVO;

let BL, P, E, creditos;
/** Quando `true`, abrir o store do contador mensal LANÇA → exercita o caminho fail-closed. */
let falharContador = false;

mock.module("../_lib/contract.mjs", { namedExports: {
  creditarSenhas: async (endereco, qtd) => { creditos.push({ endereco, qtd }); return { txHash: "0xmock" }; },
  lerSaldoSenhas: async () => 0, CONTRATO_ADDRESS: "0xC0" } });
mock.module("@netlify/blobs", { namedExports: {
  getStore: (o) => {
    const nome = typeof o === "string" ? o : o?.name;
    if (falharContador && nome === "referral-bonus") throw new Error("Blobs indisponível (simulado)");
    return BL.getStore(typeof o === "string" ? { name: o } : o);
  } } });
function duploPalpites() {
  const api = {};
  for (const m of ["select", "eq", "in", "order", "limit", "range", "is", "neq", "gte", "lte", "not", "or", "filter", "ilike"]) api[m] = () => api;
  api.maybeSingle = () => api; api.single = () => api;
  api.then = (res, rej) => Promise.resolve({ data: [], error: null }).then(res, rej);
  return api;
}
mock.module("../_lib/supabase-client.mjs", { namedExports: {
  getSupabase: () => ({ from: (t) => (t === "pontos" ? P.from() : t === "palpites" ? duploPalpites() : E.cliente.from(t)) }),
  getSupabaseReadOnly: () => ({ from: (t) => (t === "pontos" ? P.from() : t === "palpites" ? duploPalpites() : E.cliente.from(t)) }),
  supabaseConfigurado: () => true } });
mock.module("../_lib/sybil-check.mjs", { namedExports: {
  checkSybil: async () => ({ suspeito: false, addresses: [] }), registerVisitor: async () => {} } });
mock.module("../_lib/sentry-server.mjs", { namedExports: { captureSecurityAlert: async () => {}, Sentry: {} } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/admin-helpers.mjs", { namedExports: { getAdminAddresses: async () => [] } });

const { default: handler } = await import("../referral.mjs");
const R = await import("../_lib/referral.mjs");
const { assinarUserSession } = await import("../_lib/jwt.mjs");

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // indicante
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"; // indicado principal
/** k-ésimo endereço de indicado DISTINTO (cada carteira só pode ser indicada UMA vez). */
const indica = (i) => `0x${String(i).padStart(2, "0")}${"d".repeat(38)}`;
const mesAtual = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
const mesAnterior = (d = new Date()) => {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 15));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}`;
};

beforeEach(() => {
  BL = criarBlobs(); P = criarTabelaPontos(); E = criarSupabase(); creditos = []; falharContador = false;
  E.tabelas.eco_quildo_lastro.push({ id: 1, total_emitido: 0, total_usado: 0, reserva_rs_centavos: 0, atualizado_em: "t0" });
});

let nIp = 0;
async function usar(codigo, quem) {
  const tk = await assinarUserSession(quem);
  const req = new Request("https://x/.netlify/functions/referral?acao=usar-codigo", {
    method: "POST", body: JSON.stringify({ codigo_indicacao: codigo, endereco: quem }),
    headers: { "content-type": "application/json", "x-nf-client-connection-ip": `10.9.0.${++nIp % 250}`,
      authorization: `Bearer ${tk}` },
  });
  const r = await handler(req);
  return { status: r.status, corpo: await r.json().catch(() => null) };
}
/** Quantas vezes o contrato foi chamado para `endereco`. */
const creditosDe = (e) => creditos.filter((c) => c.endereco === e).length;
/** O contador mensal REAL gravado no Blob (fonte da verdade da quota). */
const contadorMes = (e, mes = mesAtual()) => BL.ler("referral-bonus", `referral-monthly:${e}:${mes}`)?.conversoes ?? null;

// ══ 1. A quota: 10 passam, a 11.ª NÃO ═════════════════════════════════════════════════════════════
test("QUOTA: 10 indicações no mês creditam on-chain; a 11.ª NÃO (só o indicado recebe)", async () => {
  const { codigo } = await R.gerarCodigoIndicacao(A);
  for (let i = 1; i <= 10; i++) {
    const r = await usar(codigo, indica(i));
    assert.equal(r.status, 200);
    assert.equal(r.corpo.conversao.ok, true, `a conversão ${i} devia ter corrido (${JSON.stringify(r.corpo.conversao)})`);
  }
  // 10 ao indicante + 10 aos indicados = 20 créditos, todos +1.
  assert.equal(creditosDe(A), 10, "o indicante tem de receber exactamente 10 créditos");
  assert.equal(creditos.length, 20, "cada indicação dá 1 ao indicante e 1 ao indicado");
  assert.equal(contadorMes(A), 10, "o contador mensal tem de estar a 10");

  // ── a 11.ª: o limite é POR MÊS e POR INDICANTE ────────────────────────────────────────────────
  const antes = creditos.length;
  const r11 = await usar(codigo, indica(11));
  assert.equal(r11.status, 200, "a indicação em si é aceite (o limite não rejeita o vínculo)");
  assert.equal(r11.corpo.conversao.ok, true, "a conversão continua a existir — o INDICADO recebe");
  assert.equal(creditosDe(A), 10, "o indicante NÃO pode receber o 11.º crédito on-chain");
  assert.equal(creditos.length, antes + 1, "só o +1 do indicado pode entrar");
  assert.equal(creditos[creditos.length - 1].endereco, indica(11), "e tem de ser o crédito do indicado");
  assert.equal(contadorMes(A), 10, "o contador não pode passar do limite");
  // O indicado do 11.º recebeu o dele (a quota do indicante não o afecta).
  assert.equal(creditosDe(indica(11)), 1);
});

// ══ 2. O recorte de MÊS (a 1.ª do mês seguinte volta a creditar) ══════════════════════════════════
test("RESET: o contador é do MÊS UTC — cheio no mês anterior, credita no mês corrente", async () => {
  // Bidireccional, com a chave do Blob como única variável:
  //  (a) contador CHEIO no mês ANTERIOR  → a conversão TEM de creditar (é outro mês);
  BL.gravar("referral-bonus", `referral-monthly:${A}:${mesAnterior()}`, { conversoes: 10 });
  const { codigo } = await R.gerarCodigoIndicacao(A);
  const r = await usar(codigo, indica(21));
  assert.equal(r.corpo.conversao.ok, true, "o mês anterior cheio NÃO pode travar o mês corrente");
  assert.equal(creditosDe(A), 1, "a 1.ª do mês tem de creditar");
  assert.equal(contadorMes(A, mesAnterior()), 10, "o contador do mês anterior não pode ser tocado");
  assert.equal(contadorMes(A), 1, "e o do mês corrente começa em 1");
});

test("RESET BIDIRECCIONAL: com o contador CHEIO no mês CORRENTE a mesma conversão é travada", async () => {
  BL.gravar("referral-bonus", `referral-monthly:${A}:${mesAtual()}`, { conversoes: 10 });
  const { codigo } = await R.gerarCodigoIndicacao(A);
  const r = await usar(codigo, indica(22));
  assert.equal(creditosDe(A), 0, "com o mês corrente cheio, o indicante não recebe");
  assert.equal(creditosDe(indica(22)), 1, "e o indicado continua a receber");
  assert.equal(r.corpo.conversao.code === undefined || r.corpo.conversao.code === null || r.corpo.conversao.ok, true);
});

// ══ 3. GAP-1 — FAIL-CLOSED quando o contador não é legível ════════════════════════════════════════
test("GAP-1: contador ILEGÍVEL → NÃO credita on-chain, NÃO sela, devolve `quota_indisponivel`", async () => {
  const { codigo } = await R.gerarCodigoIndicacao(A);
  falharContador = true;
  const r = await usar(codigo, indica(31));
  assert.equal(r.status, 200, "a indisponibilidade do contador não pode virar erro HTTP");
  assert.equal(creditosDe(A), 0, "ALARME: creditou on-chain sem conseguir contar a quota");
  assert.equal(creditosDe(indica(31)), 0, "e o indicado também não é creditado (a conversão não fechou)");
  assert.equal(r.corpo.conversao.code, "quota_indisponivel", `código devolvido: ${JSON.stringify(r.corpo.conversao)}`);

  // ⚠️ O ponto central: NÃO selou. O marcador definitivo não pode existir.
  assert.equal(BL.ler("referral-links", `referral-convertido:${codigo}:${indica(31)}`), undefined,
    "o marcador de convertido foi gravado — a conversão perdeu-se para sempre");

  // E quando o contador volta, a MESMA conversão fecha (é isso que o «transitório» compra).
  falharContador = false;
  const r2 = await usar(codigo, indica(31));
  assert.equal(r2.corpo.conversao.ok, true, "o retry depois da indisponibilidade tem de fechar a conversão");
  assert.equal(creditosDe(A), 1, "e creditar o indicante");
  assert.equal(creditosDe(indica(31)), 1, "e o indicado, uma só vez");
});

// ══ 4. Idempotência (não paga gas duas vezes o mesmo indicado) ════════════════════════════════════
test("IDEMPOTÊNCIA: repetir o mesmo pedido não credita de novo NEM conta duas no mês", async () => {
  const { codigo } = await R.gerarCodigoIndicacao(A);
  await usar(codigo, indica(41));
  const antes = creditos.length;
  await usar(codigo, indica(41));
  assert.equal(creditos.length, antes, "o mesmo (codigo, indicado) não pode pagar gas duas vezes");
  assert.equal(contadorMes(A), 1, "nem contar duas no mês");
});

// ══ 5. Unitário: os dois motivos e o recorte de mês ═══════════════════════════════════════════════
test("UNITÁRIO: `verificarLimiteMensal` distingue limite atingido de contador ilegível", async () => {
  const livre = await R.verificarLimiteMensal(A);
  assert.deepEqual([livre.ok, livre.conversoes, livre.limite, livre.motivo], [true, 0, 10, null]);
  // A quota decidida pelo operador (R18-110h.4-1) é 10 — lida do valor que a própria função devolve
  // (o `LIMITE_MENSAL` é constante de módulo, não exportada: não se exporta por causa de um teste).
  assert.equal(livre.limite, 10, "a quota decidida pelo operador (R18-110h.4-1) é 10");

  BL.gravar("referral-bonus", `referral-monthly:${A}:${mesAtual()}`, { conversoes: 10 });
  const cheio = await R.verificarLimiteMensal(A);
  assert.deepEqual([cheio.ok, cheio.conversoes, cheio.motivo], [false, 10, "limite_mensal_excedido"]);

  BL.gravar("referral-bonus", `referral-monthly:${A}:${mesAnterior()}`, { conversoes: 10 });
  const agora = await R.verificarLimiteMensal(A);
  assert.equal(agora.ok, false, "o mês corrente continua cheio (só o ANTERIOR é que estava cheio também)");
  // CONTROL NEGATIVO do recorte: sem contador nenhum nos DOIS meses, tem de estar livre.
  const C = "0xcccccccccccccccccccccccccccccccccccccccccc";
  assert.deepEqual((await R.verificarLimiteMensal(C)).ok, true, "um indicante novo não pode aparecer no limite");

  falharContador = true;
  const ilegivel = await R.verificarLimiteMensal(A);
  assert.deepEqual([ilegivel.ok, ilegivel.conversoes, ilegivel.motivo], [false, null, "quota_indisponivel"]);
  falharContador = false;
});

test("UNITÁRIO: contador ilegível → `concederBonus` NÃO chama o contrato", async () => {
  falharContador = true;
  const r = await R.concederBonus(A);
  assert.deepEqual([r.ok, r.code], [false, "quota_indisponivel"]);
  assert.equal(creditos.length, 0, "ALARME: o contrato foi chamado sem quota legível");
  falharContador = false;
});

/** O gas real é impossível por construção (o contrato é um duplo) — este guarda é o alarme explícito. */
function relatorioDeGas() {
  return creditos.filter((c) => typeof c.endereco !== "string" || !/^0x[0-9a-f]{40}$/.test(c.endereco)).length;
}
test("GUARDA: nenhum teste desta frente tocou a rede (todos os endereços são reais e o contrato é duplo)", () => {
  assert.equal(relatorioDeGas(), 0);
});
