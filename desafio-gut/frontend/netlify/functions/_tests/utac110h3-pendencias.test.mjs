// UTAC110h.3 — testes das pendências P1, P2 e P5 (backend). Substitui as DEBT-028/029 e a DEBT-025.
//
// REAIS: `referral.mjs` (endpoint), `_lib/referral.mjs`, `_lib/fontes-lance.mjs`, `_lib/eco-quildo.mjs`,
// `_lib/jwt.mjs` (tokens ASSINADOS). Duplos só nas fronteiras — incluindo `_lib/contract.mjs` ESPIADO:
// é ele que garante que **nenhum teste gasta gas real** (a rede nunca é tocada).
//
// P1 — `indicacoesDoMes` (fonte única do contador: servidor + UI) e o campo `indicacoesMes` do `ler-pontos`.
// P2 — o relatório admin deixou de dizer «Senhas creditadas» (passou a «Recompensas on-chain creditadas»),
//      mantendo o CAMPO `senhasCreditadas` (chave da resposta, com consumidor e teste próprios).
// P5 — DEBT-025: o endpoint deixou de passar endereços MASCARADOS ao `registrarConversao`; o bónus
//      on-chain volta a disparar (provado com o contrato espiado, 2 créditos, endereços REAIS).
//
// node --test --experimental-test-module-mocks _tests/utac110h3-pendencias.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarBlobs } from "./_blobs-cas-duplo.mjs";
import { criarTabelaPontos } from "./_pontos-duplo-110f.mjs";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

process.env.JWT_SECRET = "segredo-de-teste-utac110h3-pendencias-comprimento-suficiente";
delete process.env.REFERRAL_ATIVO;

let BL, P, E, creditos;
/** Espião do contrato: captura cada `creditarSenhas(endereco, qtd)`. NUNCA vai à rede. */
mock.module("../_lib/contract.mjs", { namedExports: {
  creditarSenhas: async (endereco, qtd) => { creditos.push({ endereco, qtd }); return { txHash: "0xmock" }; },
  lerSaldoSenhas: async () => 0, CONTRATO_ADDRESS: "0xC0" } });
mock.module("@netlify/blobs", { namedExports: { getStore: (o) => BL.getStore(typeof o === "string" ? { name: o } : o) } });
/** Duplo mínimo da tabela `palpites` (só LEITURA → zero linhas): o `ler-pontos` lê-a junto com `pontos`. */
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
const { default: lerPontosHandler } = await import("../ler-pontos.mjs");
const R = await import("../_lib/referral.mjs");
const L = await import("../_lib/fontes-lance.mjs");
const { assinarUserSession } = await import("../_lib/jwt.mjs");

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // indicante
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"; // indicado

beforeEach(() => {
  BL = criarBlobs(); P = criarTabelaPontos(); E = criarSupabase(); creditos = [];
  E.tabelas.eco_quildo_lastro.push({ id: 1, total_emitido: 0, total_usado: 0, reserva_rs_centavos: 0, atualizado_em: "t0" });
});

const pontos = (e) => P.linha(e)?.pontos_lance ?? 0;
const eco = (e) => E.tabelas.eco_quildo.find((l) => l.endereco === e)?.saldo ?? 0;

let n = 0;
async function usar(codigo, quem) {
  const tk = await assinarUserSession(quem);
  const req = new Request("https://x/.netlify/functions/referral?acao=usar-codigo", {
    method: "POST", body: JSON.stringify({ codigo_indicacao: codigo, endereco: quem }),
    headers: { "content-type": "application/json", "x-nf-client-connection-ip": `10.8.0.${++n % 250}`,
      authorization: `Bearer ${tk}` },
  });
  const r = await handler(req);
  return { status: r.status, corpo: await r.json().catch(() => null) };
}
async function lerPontosDe(quem) {
  const tk = await assinarUserSession(quem);
  const req = new Request("https://x/.netlify/functions/ler-pontos", { method: "GET", headers: { authorization: `Bearer ${tk}` } });
  const r = await lerPontosHandler(req);
  return { status: r.status, corpo: await r.json().catch(() => null) };
}

// ══ P1 — o contador do mês (fonte única no `fontes-lance`, exposto pelo `ler-pontos`) ══════════════
test("P1 unitário: `indicacoesDoMes` conta só as indicações CREDITADAS no mês UTC corrente", () => {
  const agora = new Date("2026-10-15T12:00:00Z");
  const reg = { historico_lance: [
    { motivo: "indicacao", ref: `indicacao:${B}`, data: "2026-10-02T00:00:00Z" },
    { motivo: "indicacao", ref: "indicacao:0xcccc", data: "2026-10-31T23:59:00Z" },
    { motivo: "indicacao", ref: "indicacao:0xdddd", data: "2026-09-30T23:59:00Z" }, // mês anterior
    { motivo: "login", ref: "login:2026-10-15", data: "2026-10-15T10:00:00Z" },     // não é indicação
    { motivo: "indicacao", ref: "indicacao-recebida", data: "2026-10-15T10:00:00Z" },// é o crédito do INDICADO
  ] };
  const r = L.indicacoesDoMes(reg, agora);
  assert.deepEqual(r, { mes: "2026-10", creditadas: 2, limite: 10 }, "o contador do painel tem de contar o mesmo que o servidor");
  // CONTROL NEGATIVO: um registo vazio não inventa indicações.
  assert.deepEqual(L.indicacoesDoMes({}, agora).creditadas, 0);
  assert.deepEqual(L.indicacoesDoMes({ historico_lance: [] }, agora).creditadas, 0);
});

test("P1 endpoint: o `ler-pontos` devolve `indicacoesMes` (aditivo) e acompanha as indicações reais", async () => {
  const semNada = await lerPontosDe(A);
  assert.equal(semNada.status, 200);
  assert.deepEqual(semNada.corpo.indicacoesMes, { mes: new Date().toISOString().slice(0, 7), creditadas: 0, limite: 10 });
  // os campos antigos continuam lá (ADITIVO — GATE 4)
  for (const k of ["ok", "pontos", "pontosCartao", "fidelidade", "lance", "missoesHoje", "palpites"]) {
    assert.ok(k in semNada.corpo, `o campo «${k}» desapareceu do ler-pontos`);
  }
  const { codigo } = await R.gerarCodigoIndicacao(A);
  await usar(codigo, B);
  const depois = await lerPontosDe(A);
  assert.equal(depois.corpo.indicacoesMes.creditadas, 1, "1 indicação creditada → contador a 1");
  assert.equal(depois.corpo.indicacoesMes.limite, 10);
  // e o INDICADO não conta nenhuma (ele recebe, não indica)
  const doIndicado = await lerPontosDe(B);
  assert.equal(doIndicado.corpo.indicacoesMes.creditadas, 0, "o crédito de «indicado» não é uma indicação FEITA");
});

/** Semeia a linha do ledger `pontos` directamente (colunas reais do duplo). */
function semearPontos(endereco, historicoLance) {
  P.tabela.push({ endereco, pontos: 500, historico: [], atualizado_em: new Date().toISOString(),
    creditos_lance: 0, pontos_lance: 500, historico_lance: historicoLance });
}

// ⚠️ SEG8-110h.3 (⚠️-2 do validador: o mutante de DIVERGÊNCIA sobrevivia à suíte) — estes dois testes
// amarram o número que a UI mostra ao recorte de mês e ao LIMITE que o servidor usa. Sem eles, uma
// derivação própria no `ler-pontos` (sem recorte de mês, ou com outro limite) passava verde.
test("P1 amarra: com indicações só do MÊS ANTERIOR o contador diz 0 (recorte de mês no ENDPOINT)", async () => {
  const antes = new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(); // ~40 dias atrás: outro mês
  semearPontos(A, [
    { motivo: "indicacao", ref: "indicacao:0x1111", data: antes, pontos: 50 },
    { motivo: "indicacao", ref: "indicacao:0x2222", data: antes, pontos: 50 },
    { motivo: "indicacao", ref: "indicacao:0x3333", data: antes, pontos: 50 },
  ]);
  const r = await lerPontosDe(A);
  assert.equal(r.status, 200);
  assert.equal(r.corpo.indicacoesMes.creditadas, 0, "o contador contou meses anteriores no ENDPOINT");
});

test("P1 amarra: aos 10 creditados o contador diz 10 E o 11.º é travado pelo limite mensal", async () => {
  // 10 indicações já creditadas no mês corrente, semeadas DIRECTAMENTE no ledger.
  const agora = new Date().toISOString();
  const creditadas = [];
  for (let i = 0; i < 10; i++) {
    const e = `0x${String(i + 1).padStart(40, "c")}`;
    creditadas.push({ motivo: "indicacao", ref: `indicacao:${e}`, data: agora, pontos: 50 });
  }
  semearPontos(A, creditadas);

  const r = await lerPontosDe(A);
  assert.equal(r.corpo.indicacoesMes.creditadas, 10, "o contador tem de chegar ao limite");
  assert.equal(r.corpo.indicacoesMes.limite, 10);

  // E o SERVIDOR usa o MESMO número para travar: o 11.º indicado entra, mas o indicador não recebe.
  const { codigo } = await R.gerarCodigoIndicacao(A);
  const resp = await usar(codigo, B);
  assert.equal(resp.status, 200);
  assert.equal(resp.corpo.pontosLance.indicante, false, "o indicador no limite não pode receber pontos");
  assert.equal(resp.corpo.pontosLance.codeIndicante, "LIMITE_MENSAL");
  assert.equal(resp.corpo.pontosLance.indicado, true, "o indicado NÃO depende do limite do indicador");
  assert.equal(pontos(A), 500, "os pontos do indicador no limite não mudaram");
  assert.equal(eco(A), 0, "e o ECOQUILDO do indicador também não");
  assert.equal(eco(B), 1, "o indicado recebe sempre a parte dele");
  // O contador NÃO subiu (os créditos do indicador foram travados).
  const depois = await lerPontosDe(A);
  assert.equal(depois.corpo.indicacoesMes.creditadas, 10, "o contador não pode passar do limite");
});

// ══ P2 — vocabulário do relatório admin ═══════════════════════════════════════════════════════════
test("P2: o relatório de indicações diz «Recompensas on-chain creditadas» e o CAMPO mantém-se", async () => {
  const { codigo } = await R.gerarCodigoIndicacao(A);
  await usar(codigo, B);
  const rel = await R.gerarRelatorioIndicacoes();
  assert.match(rel.texto, /Recompensas on-chain creditadas: \d+\./, `texto: «${rel.texto}»`);
  assert.doesNotMatch(rel.texto, /Senhas creditadas/, "o vocabulário antigo voltou ao relatório");
  assert.equal(typeof rel.senhasCreditadas, "number", "o campo `senhasCreditadas` é chave da resposta — não se remove");
});

// ══ P5 — DEBT-025: o bónus on-chain volta a disparar (com o contrato ESPIADO) ══════════════════════
test("P5: indicação válida → o bónus on-chain dispara para o INDICADOR e o INDICADO, com endereços REAIS", async () => {
  const { codigo } = await R.gerarCodigoIndicacao(A);
  const r = await usar(codigo, B);
  assert.equal(r.status, 200);
  assert.equal(r.corpo.conversao.ok, true, `a conversão falhou: ${JSON.stringify(r.corpo.conversao)}`);
  assert.equal(r.corpo.conversao.code, null);
  // 2 créditos, +1 cada, com os endereços VERDADEIROS (era aqui que o mascaramento matava tudo).
  assert.deepEqual(creditos, [{ endereco: A, qtd: 1 }, { endereco: B, qtd: 1 }]);
  assert.equal(relatorioDeGas(), 0, "ALARME: nenhum teste pode gastar gas real");
});

test("P5 BIDIRECCIONAL: com os endereços MASCARADOS (o bug) a conversão falha e NÃO credita nada", async () => {
  // Reproduz o defeito do commit 0ec7d13 no `_lib/referral.mjs`: o chamador mascara → `concederBonus`
  // recebe «0xaaaa…aaaa» → `endereco_invalido` → nenhum crédito on-chain.
  const { codigo } = await R.gerarCodigoIndicacao(A);
  const vinc = { codigo, indicador: "0xaaaa…aaaa", indicado: "0xbbbb…bbbb" };
  const conv = await R.registrarConversao(vinc, { contexto: "bidirecional" });
  assert.deepEqual([conv.ok, conv.code], [false, "endereco_invalido"]);
  assert.deepEqual(creditos, [], "o caminho mascarado não pode creditar no contrato");
});

test("P5: o bónus on-chain é idempotente por conversão (não paga duas vezes o mesmo indicado)", async () => {
  const { codigo } = await R.gerarCodigoIndicacao(A);
  await usar(codigo, B);
  const antes = creditos.length;
  await usar(codigo, B); // mesmo pedido outra vez
  assert.equal(creditos.length, antes, "uma 2.ª chamada do mesmo pedido não pode voltar a pagar gas");
  assert.deepEqual([pontos(A), pontos(B)], [50, 50], "e os pontos também não duplicam");
  assert.deepEqual([eco(A), eco(B)], [2, 1], "nem o ECOQUILDO");
});

/** O gas real é impossível por construção (o contrato é um duplo) — este guarda é o alarme explícito. */
function relatorioDeGas() {
  const tocados = creditos.filter((c) => typeof c.endereco !== "string" || !/^0x[0-9a-f]{40}$/.test(c.endereco));
  return tocados.length;
}
