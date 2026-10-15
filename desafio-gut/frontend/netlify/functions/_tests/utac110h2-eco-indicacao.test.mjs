// UTAC110h.2 (Frente A) — a indicação confirmada credita ECOQUILDO (Art. 51º do Regulamento v5.0):
// +2 ao indicante e +1 ao indicado, EM PARALELO com os +50 pontos de lance (R18-110h.2-1 e -2).
//
// REAIS: `referral.mjs` (endpoint), `_lib/referral.mjs` (vínculo, auto-indicação, já-indicado, throttle de
// IP), `_lib/fontes-lance.mjs` (pontos + ECOQUILDO — o alvo do UTAC), `_lib/eco-quildo.mjs` (crédito,
// lastro e CAS) e `_lib/jwt.mjs` (tokens ASSINADOS — lição do UTAC106j: nunca mockar o verificador).
// Duplos só nas fronteiras: Blobs (`_blobs-cas-duplo.mjs`), Supabase (dispatcher que junta a `pontos` do
// 110f com o `eco_quildo`/`eco_quildo_lastro` do 110e), contrato on-chain (`creditarSenhas` espiado — NÃO
// é tocado por este UTAC), Sybil, Sentry, rate-limit e a lista de admins.
//
// A ASSERÇÃO DECISIVA (`eco` e `lastro`): sem elas, um ECOQUILDO que falhasse em silêncio passaria por
// verde — foi exactamente o defeito que o validador do SEG-1 mediu na letra do enunciado (§7-A2).
//
// node --test --experimental-test-module-mocks _tests/utac110h2-eco-indicacao.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarBlobs } from "./_blobs-cas-duplo.mjs";
import { criarTabelaPontos } from "./_pontos-duplo-110f.mjs";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

process.env.JWT_SECRET = "segredo-de-teste-utac110h2-eco-indicacao-comprimento-suficiente";
delete process.env.REFERRAL_ATIVO;

let BL, P, E;

mock.module("@netlify/blobs", { namedExports: { getStore: (o) => BL.getStore(typeof o === "string" ? { name: o } : o) } });
mock.module("../_lib/supabase-client.mjs", { namedExports: {
  // `pontos` vem do duplo do 110f (o ledger de pontos de lance); tudo o resto (eco_quildo, lastro, passes…)
  // do duplo do 110e/MC105a, que modela as CHECKs reais da migração 20261014.
  getSupabase: () => ({ from: (t) => (t === "pontos" ? P.from() : E.cliente.from(t)) }),
  getSupabaseReadOnly: () => ({ from: (t) => (t === "pontos" ? P.from() : E.cliente.from(t)) }),
  supabaseConfigurado: () => true } });
mock.module("../_lib/contract.mjs", { namedExports: {
  creditarSenhas: async () => ({ txHash: "0xtest" }), lerSaldoSenhas: async () => 0, CONTRATO_ADDRESS: "0xC0" } });
mock.module("../_lib/sybil-check.mjs", { namedExports: {
  checkSybil: async () => ({ suspeito: false, addresses: [] }), registerVisitor: async () => {} } });
mock.module("../_lib/sentry-server.mjs", { namedExports: { captureSecurityAlert: async () => {}, Sentry: {} } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/admin-helpers.mjs", { namedExports: { getAdminAddresses: async () => [] } });

const { default: handler } = await import("../referral.mjs");
const R = await import("../_lib/referral.mjs");
const L = await import("../_lib/fontes-lance.mjs");
const { assinarUserSession } = await import("../_lib/jwt.mjs");

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // indicante
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"; // indicado
const C = "0xcccccccccccccccccccccccccccccccccccccccc"; // outro indicante
/** 11 endereços distintos para o teste do limite mensal (0x0101…, 0x0202…, …). */
const ALVO = (i) => `0x${String(i).padStart(2, "0").repeat(20)}`;

beforeEach(() => {
  BL = criarBlobs();
  P = criarTabelaPontos();
  E = criarSupabase();
  // A migração 20261014 insere em produção a linha ÚNICA do lastro (`id = 1`). Sem ela, `aplicarLastro`
  // devolve LASTRO_AUSENTE e o crédito é revertido — o duplo tem de a ter, senão o teste mente.
  E.tabelas.eco_quildo_lastro.push({ id: 1, total_emitido: 0, total_usado: 0, reserva_rs_centavos: 0, atualizado_em: "t0" });
});

const pontos = (e) => P.linha(e)?.pontos_lance ?? 0;
const eco = (e) => E.tabelas.eco_quildo.find((l) => l.endereco === e)?.saldo ?? 0;
const histEco = (e) => E.tabelas.eco_quildo.find((l) => l.endereco === e)?.historico ?? [];
const lastro = () => E.tabelas.eco_quildo_lastro[0];

let n = 0;
async function usar(codigo, quem, { ip } = {}) {
  const tk = await assinarUserSession(quem);
  const req = new Request("https://x/.netlify/functions/referral?acao=usar-codigo", {
    method: "POST", body: JSON.stringify({ codigo_indicacao: codigo, endereco: quem }),
    headers: { "content-type": "application/json", "x-nf-client-connection-ip": ip ?? `10.7.0.${++n % 250}`,
      authorization: `Bearer ${tk}` },
  });
  const r = await handler(req);
  return { status: r.status, corpo: await r.json().catch(() => null) };
}

// ── R1 — o caso feliz: pontos E ECOQUILDO, com os papéis certos e o lastro a acompanhar ────────────
test("R1 indicação válida → 200, +50/+50 pontos E +2 ECOQUILDO (indicante) / +1 (indicado)", async () => {
  const { codigo } = await R.gerarCodigoIndicacao(A);
  const r = await usar(codigo, B);
  assert.equal(r.status, 200);
  assert.deepEqual(r.corpo.pontosLance, { indicante: true, indicado: true });
  assert.deepEqual([pontos(A), pontos(B)], [50, 50], "pontos de lance (110f intacto)");
  assert.deepEqual([eco(A), eco(B)], [2, 1], "ECOQUILDO do Art. 51º");
  // Papéis NÃO se trocam, e o ref do indicante aponta para o indicado.
  assert.deepEqual(histEco(A).map((h) => [h.ref, h.delta, h.motivo, h.saldo]), [[`eco-indicacao:${B}`, 2, "indicacao", 2]]);
  assert.deepEqual(histEco(B).map((h) => [h.ref, h.delta, h.motivo, h.saldo]), [["eco-indicacao-recebida", 1, "indicacao", 1]]);
  // Lastro (Art. 50º): +3 emitidos e a reserva DERIVADA a 300 centavos (1 ECOQUILDO = R$ 1,00).
  assert.deepEqual([lastro().total_emitido, lastro().total_usado, lastro().reserva_rs_centavos], [3, 0, 300]);
});

// ── R2 — o negativo: a auto-indicação é recusada e NÃO credita nada (nem pontos, nem ECOQUILDO) ─────
test("R2 auto-indicação → 400 auto_indicacao e ZERO crédito (pontos e ECOQUILDO)", async () => {
  const { codigo } = await R.gerarCodigoIndicacao(A);
  const r = await usar(codigo, A);
  assert.deepEqual([r.status, r.corpo?.error?.code], [400, "auto_indicacao"]);
  assert.deepEqual([pontos(A), eco(A)], [0, 0]);
  assert.deepEqual([lastro().total_emitido, lastro().reserva_rs_centavos], [0, 0]);
});

// ── R3 — uma carteira só pode ser indicada UMA vez: 409 e nada extra ───────────────────────────────
test("R3 o mesmo indicado por OUTRO código → 409 ja_indicado e nenhum ECOQUILDO extra", async () => {
  const { codigo: cA } = await R.gerarCodigoIndicacao(A);
  const { codigo: cC } = await R.gerarCodigoIndicacao(C);
  await usar(cA, B);
  const r = await usar(cC, B);
  assert.deepEqual([r.status, r.corpo?.error?.code], [409, "ja_indicado"]);
  assert.deepEqual([pontos(A), pontos(B), pontos(C)], [50, 50, 0]);
  assert.deepEqual([eco(A), eco(B), eco(C)], [2, 1, 0]);
  assert.deepEqual([lastro().total_emitido, lastro().reserva_rs_centavos], [3, 300]);
});

// ── R4 — idempotência: repetir o MESMO pedido não duplica nem pontos nem ECOQUILDO ─────────────────
test("R4 re-execução do mesmo pedido → sem crédito duplo (ECOQUILDO idempotente pelo ref)", async () => {
  const { codigo } = await R.gerarCodigoIndicacao(A);
  await usar(codigo, B);
  const r2 = await usar(codigo, B);
  assert.equal(r2.status, 200);
  assert.deepEqual([pontos(A), pontos(B)], [50, 50]);
  assert.deepEqual([eco(A), eco(B)], [2, 1]);
  assert.equal(histEco(A).length, 1, "uma só entrada no histórico do indicante");
  assert.equal(histEco(B).length, 1, "uma só entrada no histórico do indicado");
  assert.deepEqual([lastro().total_emitido, lastro().reserva_rs_centavos], [3, 300]);
});

// ── R5 — o indicante respeita o limite de 10/mês (os +50 param; o ECOQUILDO dele também) ───────────
test("R5 ao 11.º indicado do mês: indicante sem +50 nem ECOQUILDO, indicado recebe os seus", async () => {
  const { codigo } = await R.gerarCodigoIndicacao(A);
  for (let i = 1; i <= 10; i++) {
    const r = await usar(codigo, ALVO(i));
    assert.equal(r.status, 200, `indicado ${i}`);
    assert.deepEqual(r.corpo.pontosLance, { indicante: true, indicado: true }, `indicado ${i}`);
  }
  const r11 = await usar(codigo, ALVO(11));
  assert.deepEqual(r11.corpo.pontosLance, { indicante: false, indicado: true, codeIndicante: "LIMITE_MENSAL" });
  // O indicante ficou no teto: 10 indicações de +50 e 10 de +2 ECOQUILDO (nunca a 11.ª).
  assert.deepEqual([pontos(A), eco(A)], [500, 20]);
  // O 11.º indicado recebe os pontos E o ECOQUILDO dele (são independentes do limite do indicante).
  assert.deepEqual([pontos(ALVO(11)), eco(ALVO(11))], [50, 1]);
  // Lastro: 10 indicações completas (2+1) + a 11.ª, que só emitiu o ECOQUILDO do indicado (1).
  assert.deepEqual([lastro().total_emitido, lastro().reserva_rs_centavos], [31, 3100]);
});

// ── R6 — FAIL-SOFT: o ECOQUILDO falha, os pontos de lance mantêm-se (nada quebra a indicação) ──────
test("R6 falha do ECOQUILDO → pontos de lance intactos e ECOQUILDO zero (fail-soft)", async () => {
  const { codigo } = await R.gerarCodigoIndicacao(A);
  E.g.falhar.eco_quildo = { op: "insert", code: "XX000" }; // força o erro em TODA a emissão
  const r = await usar(codigo, B);
  assert.equal(r.status, 200);
  assert.deepEqual(r.corpo.pontosLance, { indicante: true, indicado: true });
  assert.deepEqual([pontos(A), pontos(B)], [50, 50], "os +50 mantêm-se");
  assert.deepEqual([eco(A), eco(B)], [0, 0]);
  assert.deepEqual([lastro().total_emitido, lastro().reserva_rs_centavos], [0, 0], "sem lastro mexido");
});

// ── R7 — Art. 50º: ECOQUILDO sem lastro em R$ não existe → a emissão é DESFEITA ────────────────────
test("R7 falha do lastro → emissões revertidas (nunca fica ECOQUILDO sem reserva)", async () => {
  const { codigo } = await R.gerarCodigoIndicacao(A);
  E.g.falhar.eco_quildo_lastro = { op: "update", code: "XX000" };
  const r = await usar(codigo, B);
  assert.equal(r.status, 200);
  assert.deepEqual(r.corpo.pontosLance, { indicante: true, indicado: true });
  assert.deepEqual([pontos(A), pontos(B)], [50, 50], "os +50 mantêm-se");
  assert.deepEqual([eco(A), eco(B)], [0, 0], "emissões revertidas");
  assert.deepEqual([histEco(A).length, histEco(B).length], [0, 0], "histórico limpo (reversão integral)");
  assert.deepEqual([lastro().total_emitido, lastro().reserva_rs_centavos], [0, 0]);
});

// ── R9 — o ramo anti-fraude por IP não credita NADA (pina o mutante V7 do SEG5) ────────────────────
test("R9 throttle por IP: ao 3.º pedido do mesmo IP/hora vincula mas NÃO credita pontos NEM ECOQUILDO", async () => {
  // Herdado do UTAC110f (LIMITE_CONVERSOES_IP_HORA = 2) e não estava pinado por teste — o validador do
  // SEG5 provou-o com um mutante que SOBREVIVEU (V7: pôr `creditarIndicacao` no ramo do gate não fazia
  // falhar nada). O comportamento é o pretendido (onde não há pontos, não há ECO); aqui fica testado.
  const { codigo } = await R.gerarCodigoIndicacao(A);
  const IP = "10.9.9.9";
  const r1 = await usar(codigo, ALVO(1), { ip: IP });
  const r2 = await usar(codigo, ALVO(2), { ip: IP });
  assert.deepEqual([r1.corpo.pontosLance, r2.corpo.pontosLance],
    [{ indicante: true, indicado: true }, { indicante: true, indicado: true }], "os 2 primeiros do IP passam");
  const eco3 = eco(ALVO(3));
  const r3 = await usar(codigo, ALVO(3), { ip: IP });
  assert.equal(r3.status, 200);
  assert.equal(r3.corpo.pontosLance, null, "o ramo do gate de IP não pode creditar pontos");
  assert.deepEqual([pontos(ALVO(3)), eco(ALVO(3))], [0, eco3], "nem pontos nem ECOQUILDO no ramo do gate");
  assert.deepEqual([eco(A), lastro().total_emitido], [4, 6], "2 indicações completas: 2×2 ao indicante, 2×1 aos indicados");
});

// ── R8 — unidade: o motivo fechado é respeitado e a assinatura real é a do módulo do 110e ──────────
test("R8 unitário: `creditarIndicacao` devolve `ecoQuildo` e usa as constantes do Art. 51º", async () => {
  assert.equal(L.ECOQUILDO_INDICACAO_INDICANTE, 2);
  assert.equal(L.ECOQUILDO_INDICACAO_INDICADO, 1);
  assert.equal(L.MOTIVO_ECO_INDICACAO, "indicacao");
  assert.equal(L.refEcoIndicacao(B), `eco-indicacao:${B}`);
  assert.equal(L.REF_ECO_INDICACAO_RECEBIDA, "eco-indicacao-recebida");
  const r = await L.creditarIndicacao(A, B);
  assert.deepEqual([pontos(A), pontos(B)], [50, 50]);
  assert.deepEqual([eco(A), eco(B)], [2, 1]);
  assert.deepEqual(r.ecoQuildo.emitidos, 3);
  // Endereço inválido → nenhum ECOQUILDO, e os pontos do indicado também não entram (regra do ledger).
  const rBad = await L.creditarIndicacao(A, "nao-e-endereco");
  assert.deepEqual([eco("nao-e-endereco")], [0]);
  assert.equal(rBad.ecoQuildo.indicado.ok, false);
  assert.equal(rBad.ecoQuildo.indicado.code, "ENDERECO_INVALIDO");
});
