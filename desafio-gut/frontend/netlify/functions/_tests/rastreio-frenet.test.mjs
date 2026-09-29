// MC102.1b — Frente A: adaptador real da Frenet, com fetch em duplo (sem rede, sem o token real).
// node --test _tests/rastreio-frenet.test.mjs   (a partir de netlify/functions)
//
// As respostas do duplo são as MEDIDAS no PoC do SEG-1 (200 com ErrorMessage; 200 sem eventos) e a forma de
// evento da documentação oficial (webhook/trackorder). Duplo copiado do real, não inventado (lição MC102.0).

import { test } from "node:test";
import assert from "node:assert/strict";
import { consultarRastreio } from "../_lib/rastreio.mjs";
import {
  criarAdaptadorFrenet, mapearEventosFrenet, dataFrenetParaIso, MAPA_FRENET, URL_FRENET, SERVICO_CORREIOS,
} from "../_lib/rastreio-frenet.mjs";

const TOKEN = "tok-de-teste-0000-0000-0000-000000000000";
const CODIGO = "AA123456789BR";
const RESP_ERRO = { ErrorMessage: "cliente não escolheu um plano de pagamento, por favor acesse o painel", ExpectedDate: "0001-01-01T00:00:00" };
const RESP_VAZIA = { ExpectedDate: "0001-01-01T00:00:00" };
const evento = (EventType, EventDateTime = "10/02/2017 16:48") =>
  ({ EventDateTime, EventDescription: "Objeto entregue ao destinatário Maria Silva", EventLocation: "Rua A, 1 — Boa Nova-BA", EventType });
const RESP_EVENTOS = { TrackingNumber: CODIGO, TrackingUrl: "https://rastreio.frenet.com.br/x", ServiceDescrition: "SEDEX",
  TrackingEvents: [evento("0", "20/09/2026 09:00"), evento("1", "21/09/2026 10:30"), evento("9", "24/09/2026 16:48")] };

function duplo(resposta, { status = 200 } = {}) {
  const chamadas = [];
  const fetchImpl = async (url, init) => {
    chamadas.push({ url, init, corpo: JSON.parse(init.body) });
    if (resposta instanceof Error) throw resposta;
    return { ok: status >= 200 && status < 300, status, async json() { return resposta; } };
  };
  return { chamadas, adaptador: criarAdaptadorFrenet({ token: () => TOKEN, fetchImpl }) };
}

test("pedido HTTP: POST na URL da doc, header `token`, SEDEX 03220 + TrackingNumber — e nada de dados pessoais no corpo", async () => {
  const { chamadas, adaptador } = duplo(RESP_VAZIA);
  await adaptador.consultar(CODIGO, "Correios");
  assert.equal(chamadas.length, 1);
  const [c] = chamadas;
  assert.equal(c.url, "https://api.frenet.com.br/tracking/trackinginfo");
  assert.equal(URL_FRENET, c.url);
  assert.equal(c.init.method, "POST");
  assert.equal(c.init.headers.token, TOKEN);
  assert.ok(c.init.signal instanceof AbortSignal, "tem de haver timeout");
  assert.deepEqual(c.corpo, { ShippingServiceCode: "03220", TrackingNumber: CODIGO });
  assert.equal(SERVICO_CORREIOS, "03220");
});

test("mapeamento DEC-102.1b-9 (literal): 0→0 · 1→1 · 5→3 · 9→4 · 18→A2 · 3→A3 · 2→A4 · 4→A5; o resto ignora-se", () => {
  assert.deepEqual({ ...MAPA_FRENET }, { "0": "0", "1": "1", "5": "3", "9": "4", "18": "A2", "3": "A3", "2": "A4", "4": "A5" });
  const tipos = ["0", "1", "2", "3", "4", "5", "9", "18", "7", "", "constructor", " 9 "];
  assert.deepEqual(mapearEventosFrenet(tipos.map((t) => evento(t))).map((e) => e.codigo),
    ["0", "1", "A4", "A3", "A5", "3", "4", "A2", "4"]);
  assert.deepEqual(mapearEventosFrenet(null), []);
  assert.deepEqual(mapearEventosFrenet({}), []);
});

test("data: «dd/mm/aaaa hh:mm» da Frenet → ISO em Brasília; ISO passa; lixo → null", () => {
  assert.equal(dataFrenetParaIso("10/02/2017 16:48"), "2017-02-10T16:48:00-03:00");
  assert.equal(dataFrenetParaIso("24/09/2026 23:30:15"), "2026-09-24T23:30:15-03:00");
  assert.equal(Date.parse(dataFrenetParaIso("24/09/2026 23:30")), Date.parse("2026-09-25T02:30:00Z"), "23:30 BRT = 02:30Z do dia seguinte");
  assert.equal(dataFrenetParaIso("2026-09-24T16:48:00Z"), "2026-09-24T16:48:00Z");
  for (const lixo of ["", null, "31/02/2026 10:00", "ontem", "2026-13-40T00:00:00Z", 12]) assert.equal(dataFrenetParaIso(lixo), null, String(lixo));
});

test("DEC-102.1b-5 (LGPD): do adaptador só saem data e código — nem local nem descrição, nem via consultarRastreio", async () => {
  const { adaptador } = duplo(RESP_EVENTOS);
  const bruto = await adaptador.consultar(CODIGO, "Correios");
  for (const e of bruto.eventos) assert.deepEqual(Object.keys(e).sort(), ["codigo", "data"]);
  const r = await consultarRastreio(CODIGO, "Correios", { adaptador });
  assert.equal(r.ok, true);
  assert.deepEqual(r.eventos, [
    { data: "2026-09-20T09:00:00-03:00", codigo: "0", local: null, descricao: null },
    { data: "2026-09-21T10:30:00-03:00", codigo: "1", local: null, descricao: null },
    { data: "2026-09-24T16:48:00-03:00", codigo: "4", local: null, descricao: null },
  ]);
  assert.doesNotMatch(JSON.stringify(r), /Maria|Rua A|Boa Nova|frenet\.com|https?:/);
});

test("200 com ErrorMessage (medido no PoC) → fallback; a mensagem da Frenet não se propaga", async () => {
  const r = await consultarRastreio(CODIGO, "Correios", { adaptador: duplo(RESP_ERRO).adaptador });
  assert.deepEqual(r, { ok: false, code: "falha_adaptador", fallback: { codigo: CODIGO } });
});

test("200 sem TrackingEvents (medido no PoC: código sem eventos) → ok:true com lista vazia (o cartão fica no código)", async () => {
  const r = await consultarRastreio(CODIGO, "Correios", { adaptador: duplo(RESP_VAZIA).adaptador });
  assert.deepEqual(r, { ok: true, eventos: [] });
});

test("Frenet em baixo: HTTP 500/401 e excepção de rede/timeout → fallback", async () => {
  for (const status of [500, 502, 401, 429]) {
    const r = await consultarRastreio(CODIGO, "Correios", { adaptador: duplo(RESP_EVENTOS, { status }).adaptador });
    assert.equal(r.code, "falha_adaptador", `HTTP ${status}`);
  }
  for (const erro of [new TypeError("fetch failed"), Object.assign(new Error("t"), { name: "TimeoutError" })]) {
    const r = await consultarRastreio(CODIGO, "Correios", { adaptador: duplo(erro).adaptador });
    assert.deepEqual(r.fallback, { codigo: CODIGO });
  }
});

test("timeout REAL: uma Frenet que nunca responde é abortada pelo sinal", async () => {
  const pendurado = criarAdaptadorFrenet({ token: () => TOKEN, timeoutMs: 30,
    fetchImpl: (_u, { signal }) => new Promise((_, rej) => signal.addEventListener("abort", () => rej(signal.reason))) });
  const t0 = Date.now();
  const r = await consultarRastreio(CODIGO, "Correios", { adaptador: pendurado });
  assert.equal(r.code, "falha_adaptador");
  assert.ok(Date.now() - t0 < 2000, "não pode ficar pendurado");
});

test("sem FRENET_TOKEN ou transportadora que não é Correios → fallback SEM chamar a Frenet", async () => {
  let chamou = 0;
  const fetchImpl = async () => { chamou++; return { ok: true, status: 200, async json() { return RESP_EVENTOS; } }; };
  for (const token of [() => undefined, () => ""]) {
    const r = await consultarRastreio(CODIGO, "Correios", { adaptador: criarAdaptadorFrenet({ token, fetchImpl }) });
    assert.equal(r.code, "falha_adaptador");
  }
  for (const transp of ["Jadlog", "Loggi", "", null]) {
    const r = await consultarRastreio("JD123456789", transp, { adaptador: criarAdaptadorFrenet({ token: () => TOKEN, fetchImpl }) });
    assert.equal(r.code, "falha_adaptador", String(transp));
  }
  assert.equal(chamou, 0);
  const ok = await consultarRastreio(CODIGO, "CORREIOS", { adaptador: criarAdaptadorFrenet({ token: () => TOKEN, fetchImpl }) });
  assert.equal(ok.ok, true, "controlo positivo: Correios (qualquer caixa) chama");
  assert.equal(chamou, 1);
});

test("o token nunca aparece no resultado, nem em sucesso nem em falha", async () => {
  for (const resp of [RESP_EVENTOS, RESP_ERRO, new Error(`rede ${TOKEN}`)]) {
    const r = await consultarRastreio(CODIGO, "Correios", { adaptador: duplo(resp).adaptador });
    assert.ok(!JSON.stringify(r).includes(TOKEN));
  }
});
