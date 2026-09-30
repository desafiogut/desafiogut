// MC104 — envio do aceite do gate depois do login. Lógica pura + CABLAGEM (quem a liga).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { consentimentoPendente, enviarConsentimentoPendente, CHAVE_CONSENTIMENTO } from "./consentimento.js";

const ENDER = "0xAAA0000000000000000000000000000000000AAA";
const ACEITOS = { lido: true, maiores: true, termos: true, privacidade: true };
const aceite = (extra = {}) => JSON.stringify({ aceito: true, timestamp: "2026-09-30T10:00:00.000Z", versao: "2.0", aceitos: ACEITOS, ...extra });

function memoria(inicial) {
  const m = new Map(inicial === undefined ? [] : [[CHAVE_CONSENTIMENTO, inicial]]);
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), m };
}
function api(resposta = { ok: true, status: 201 }) {
  const chamadas = [];
  return { chamadas, apiPost: async (path, body, opts) => { chamadas.push({ path, body, opts }); return resposta; } };
}

test("pendente: aceite completo → corpo com endereço minúsculo, versão, declarações e hora declarada", () => {
  assert.deepEqual(consentimentoPendente(aceite(), ENDER, "2.0"), {
    endereco: ENDER.toLowerCase(), versao: "2.0", aceitos: ACEITOS, aceiteDeclaradoEm: "2026-09-30T10:00:00.000Z",
  });
});

test("pendente: nada a enviar sem aceite, versão diferente, aceite antigo sem declarações, já enviado, JSON partido", () => {
  assert.equal(consentimentoPendente(null, ENDER, "2.0"), null);
  assert.equal(consentimentoPendente(aceite({ aceito: false }), ENDER, "2.0"), null);
  assert.equal(consentimentoPendente(aceite({ versao: "1.0" }), ENDER, "2.0"), null);
  assert.equal(consentimentoPendente(aceite({ aceitos: undefined }), ENDER, "2.0"), null);
  assert.equal(consentimentoPendente(aceite({ enviadoPara: [ENDER.toLowerCase()] }), ENDER, "2.0"), null);
  assert.equal(consentimentoPendente("{partido", ENDER, "2.0"), null);
  assert.equal(consentimentoPendente(aceite(), null, "2.0"), null);
});

test("envio: POST /consentimento com o token; marca enviadoPara SÓ com resposta ok", async () => {
  const s = memoria(aceite());
  const a = api();
  assert.equal(await enviarConsentimentoPendente({ endereco: ENDER, token: "t", versaoAtual: "2.0", storage: s, apiPost: a.apiPost }), "enviado");
  assert.equal(a.chamadas.length, 1);
  assert.equal(a.chamadas[0].path, "consentimento");
  assert.equal(a.chamadas[0].opts.token, "t");
  assert.deepEqual(JSON.parse(s.getItem(CHAVE_CONSENTIMENTO)).enviadoPara, [ENDER.toLowerCase()]);
  // 2.º login com o mesmo endereço → não reenvia
  assert.equal(await enviarConsentimentoPendente({ endereco: ENDER, token: "t", versaoAtual: "2.0", storage: s, apiPost: a.apiPost }), "nada");
  assert.equal(a.chamadas.length, 1);
  // a marca não estraga o que o Boot lê
  const c = JSON.parse(s.getItem(CHAVE_CONSENTIMENTO));
  assert.equal(c.aceito, true); assert.equal(c.versao, "2.0");
});

test("envio: servidor recusa ou rede cai → 'falhou' e NÃO marca (volta a tentar no próximo login)", async () => {
  const s = memoria(aceite());
  assert.equal(await enviarConsentimentoPendente({ endereco: ENDER, token: "t", versaoAtual: "2.0", storage: s, apiPost: api({ ok: false, status: 503 }).apiPost }), "falhou");
  assert.equal(JSON.parse(s.getItem(CHAVE_CONSENTIMENTO)).enviadoPara, undefined);
  assert.equal(await enviarConsentimentoPendente({ endereco: ENDER, token: "t", versaoAtual: "2.0", storage: s, apiPost: async () => { throw new Error("rede"); } }), "falhou");
  assert.equal(JSON.parse(s.getItem(CHAVE_CONSENTIMENTO)).enviadoPara, undefined);
});

test("envio: sem token não chama o servidor", async () => {
  const a = api();
  assert.equal(await enviarConsentimentoPendente({ endereco: ENDER, token: null, versaoAtual: "2.0", storage: memoria(aceite()), apiPost: a.apiPost }), "nada");
  assert.equal(a.chamadas.length, 0);
});

// ── CABLAGEM: quem liga a peça (lê a fonte SEM comentários — lição MC96.1) ──────────────────────
const semComentarios = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), "utf8"));

test("CABLAGEM: o AppContext chama enviarConsentimentoPendente com endereço, token e a versão do gate", () => {
  const ctx = ler("../context/AppContext.jsx");
  assert.match(ctx, /import\s*\{\s*enviarConsentimentoPendente\s*\}\s*from\s*"\.\.\/lib\/consentimento\.js"/);
  assert.match(ctx, /enviarConsentimentoPendente\(\{[\s\S]{0,200}endereco:\s*address[\s\S]{0,80}token:\s*authToken[\s\S]{0,80}versaoAtual:\s*VERSAO_CONSENTIMENTO/);
  assert.match(ctx, /\},\s*\[address,\s*authToken\]\);/);
});

test("CABLAGEM: o gate guarda as 4 declarações no aceite local", () => {
  const g = ler("../components/TermosConsentimento.jsx");
  assert.match(g, /aceitos:\s*\{\s*lido,\s*maiores,\s*termos,\s*privacidade\s*\}/);
});
