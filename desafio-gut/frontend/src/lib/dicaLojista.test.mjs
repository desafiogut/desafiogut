// MC89.36 — testes do palpite de encaminhamento do LOJISTA.
//
// Ficheiro separado do `dicaSessao.test.mjs` (que é do ADM) de propósito: são
// dois palpites com o mesmo desenho e ciclos de vida que TÊM de ficar iguais.
// Ter os dois conjuntos lado a lado torna óbvio quando um deles diverge — foi
// divergirem sem ninguém reparar que criou o defeito que o MC89.35 diagnosticou.
//
// correr: node --test --experimental-test-module-mocks "src/lib/*.test.mjs"
//
// ⚠️ Mutações validadas no fim do ficheiro.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  gravarDicaLojista, limparDicaLojista, lojistaProvavel, adminProvavel,
} from "./dicaSessao.js";

const LOJISTA = "0x6ac980dc94b2f4841e1bc5a703a989447637674d";
const OUTRO   = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
const DIA_MS  = 24 * 60 * 60 * 1000;

function storageFalso(inicial = {}) {
  const m = new Map(Object.entries(inicial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _bruto: m,
  };
}

/** Forma REAL do `privy:connections` — o endereço vem embrulhado em JSON. */
function sessaoDe(endereco) {
  return JSON.stringify([{ chainType: "ethereum", address: endereco, walletClientType: "privy" }]);
}

function comDica({ endereco = LOJISTA, corporativo = true, idadeMs = 0, sessao = LOJISTA } = {}) {
  const s = storageFalso(sessao ? { "privy:connections": sessaoDe(sessao) } : {});
  s.setItem("gut_corporativo_hint", JSON.stringify({ endereco, corporativo, em: Date.now() - idadeMs }));
  return s;
}

// ── As três guardas ──────────────────────────────────────────────────────────

test("dica válida no mesmo endereço → lojista provável", () => {
  assert.equal(lojistaProvavel(comDica()), true);
});

test("dica de OUTRO endereço não vale para esta sessão", () => {
  // É a guarda que impede que o palpite de A se aplique a B. Sem ela, quem
  // escrevesse a dica à mão encaminhava outra pessoa para o painel do lojista.
  assert.equal(lojistaProvavel(comDica({ endereco: OUTRO, sessao: LOJISTA })), false);
});

test("sem sessão em disco não há palpite", () => {
  assert.equal(lojistaProvavel(comDica({ sessao: null })), false);
});

test("dica expirada (mais de 24 h) não vale", () => {
  assert.equal(lojistaProvavel(comDica({ idadeMs: DIA_MS + 1000 })), false);
});

test("dica às 23 h 59 ainda vale", () => {
  assert.equal(lojistaProvavel(comDica({ idadeMs: DIA_MS - 60_000 })), true);
});

test("corporativo:false não encaminha", () => {
  assert.equal(lojistaProvavel(comDica({ corporativo: false })), false);
});

test("corporativo com valor truthy mas não booleano não conta", () => {
  // `corporativo: "sim"` tem de ser rejeitado — a comparação é estrita.
  const s = storageFalso({ "privy:connections": sessaoDe(LOJISTA) });
  s.setItem("gut_corporativo_hint", JSON.stringify({ endereco: LOJISTA, corporativo: "sim", em: Date.now() }));
  assert.equal(lojistaProvavel(s), false);
});

test("dica sem `em` não vale (sem carimbo não há TTL)", () => {
  const s = storageFalso({ "privy:connections": sessaoDe(LOJISTA) });
  s.setItem("gut_corporativo_hint", JSON.stringify({ endereco: LOJISTA, corporativo: true }));
  assert.equal(lojistaProvavel(s), false);
});

test("JSON corrompido não rebenta, devolve false", () => {
  const s = storageFalso({ "privy:connections": sessaoDe(LOJISTA) });
  s.setItem("gut_corporativo_hint", "{isto não é json");
  assert.equal(lojistaProvavel(s), false);
});

test("comparação de endereço é insensível a maiúsculas", () => {
  // O `address` do Privy vem em checksum; a dica é gravada em minúsculas.
  assert.equal(lojistaProvavel(comDica({ sessao: LOJISTA.toUpperCase().replace("0X", "0x") })), true);
});

// ── Escrita e apagamento ─────────────────────────────────────────────────────

test("gravarDicaLojista com false APAGA em vez de gravar negativa", () => {
  // É o que solta um ex-lojista do painel antigo logo no primeiro restauro em
  // que /cotas responde, sem esperar pelas 24 h.
  const s = comDica();
  gravarDicaLojista(LOJISTA, false, s);
  assert.equal(s.getItem("gut_corporativo_hint"), null);
});

test("gravarDicaLojista normaliza o endereço para minúsculas", () => {
  const s = storageFalso({ "privy:connections": sessaoDe(LOJISTA) });
  gravarDicaLojista(LOJISTA.toUpperCase().replace("0X", "0x"), true, s);
  assert.equal(JSON.parse(s.getItem("gut_corporativo_hint")).endereco, LOJISTA);
});

test("gravarDicaLojista sem endereço é no-op", () => {
  const s = storageFalso();
  gravarDicaLojista(null, true, s);
  assert.equal(s.getItem("gut_corporativo_hint"), null);
});

test("a dica gravada tem exatamente três campos", () => {
  const s = storageFalso({ "privy:connections": sessaoDe(LOJISTA) });
  gravarDicaLojista(LOJISTA, true, s);
  assert.deepEqual(
    Object.keys(JSON.parse(s.getItem("gut_corporativo_hint"))).sort(),
    ["corporativo", "em", "endereco"],
  );
});

test("limparDicaLojista remove a dica e não rebenta sem storage", () => {
  const s = comDica();
  limparDicaLojista(s);
  assert.equal(s.getItem("gut_corporativo_hint"), null);
  assert.doesNotThrow(() => limparDicaLojista(undefined));
});

// ── Isolamento entre os dois palpites ────────────────────────────────────────

test("a dica do lojista NÃO torna ninguém admin", () => {
  // Os dois palpites vivem no mesmo módulo; não podem contaminar-se.
  const s = comDica();
  assert.equal(adminProvavel(s), false);
});

// ── ⚠️ A REGRESSÃO QUE ESTE MC EXISTE PARA IMPEDIR ───────────────────────────

test("o palpite do lojista NÃO pode voltar a viver dentro do gut_saldo_cache", () => {
  // O defeito do MC89.35 não foi de lógica — foi de RECIPIENTE. O
  // `gut_saldo_cache` pertence à guarda de coerência do saldo, que o apaga
  // inteiro no logout; guardar ali o palpite fazia-o morrer em seis cenários.
  //
  // Este teste afirma o CÓDIGO e não um comentário: já fui apanhado (MC89.34) a
  // escrever um teste que casava com o meu próprio comentário explicativo e por
  // isso passava sempre.
  const ctx = readFileSync(new URL("../context/AppContext.jsx", import.meta.url), "utf8");
  const semComentarios = ctx
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n").filter((l) => !l.trimStart().startsWith("//")).join("\n");

  assert.doesNotMatch(
    semComentarios,
    /gravarSaldoCache\([^)]*tipoConfirmado/,
    "o tipo do lojista voltou a ser gravado dentro do gut_saldo_cache — " +
    "é o defeito do MC89.35 a regressar (ver lib/dicaSessao.js, CHAVE_LOJISTA)",
  );
  assert.match(
    semComentarios,
    /gravarDicaLojista\(/,
    "AppContext deixou de gravar a dica do lojista na chave própria",
  );
});

test("o estado neutro não pode voltar a depender de tipoCarregando", () => {
  // Medido no MC89.36-S0: `tipoCarregando` é false durante 76% da janela. Se
  // alguém "simplificar" a condição para o usar, o defeito volta em silêncio.
  const enc = readFileSync(new URL("./encaminhamento.js", import.meta.url), "utf8");
  const semComentarios = enc
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n").filter((l) => !l.trimStart().startsWith("//")).join("\n");

  const linhaNeutro = semComentarios.split("\n").find((l) => l.includes("DESTINO.ESTADO_NEUTRO"));
  assert.ok(linhaNeutro, "o degrau do estado neutro desapareceu");
  assert.match(linhaNeutro, /!tipoResolvido/, "o sinal do estado neutro deixou de ser `tipoResolvido`");
  assert.doesNotMatch(linhaNeutro, /[^!]tipoCarregando/, "o estado neutro passou a depender de `tipoCarregando`");
});

// ── MUTAÇÕES VALIDADAS (7/7) ─────────────────────────────────────────────────
//  1. `d.corporativo !== true` → `!d.corporativo`
//     → apanhada por: "corporativo com valor truthy mas não booleano"
//  2. remover a guarda do endereço (condição 3)
//     → apanhada por: "dica de OUTRO endereço não vale para esta sessão"
//  3. remover a guarda do TTL
//     → apanhada por: "dica expirada (mais de 24 h) não vale"
//  4. `gravarDicaLojista` gravar `{corporativo:false}` em vez de apagar
//     → apanhada por: "gravar com false APAGA em vez de gravar negativa"
//  5. deixar de normalizar o endereço para minúsculas ao gravar
//     → apanhada por: "gravarDicaLojista normaliza o endereço"
//  6. em AppContext, voltar a gravar tipoConfirmado no gut_saldo_cache
//     → apanhada por: "o palpite NÃO pode voltar a viver dentro do gut_saldo_cache"
//  7. em encaminhamento.js, trocar !tipoResolvido por tipoCarregando
//     → apanhada por: "o estado neutro não pode voltar a depender de tipoCarregando"
