// MC89.36 — testes da decisão de encaminhamento na rota "/".
//
// node --test --experimental-test-module-mocks src/lib/encaminhamento.test.mjs
//
// ⚠️ CADA TESTE AQUI FOI VALIDADO POR MUTAÇÃO. Um teste que nunca viu vermelho
// não prova nada — neste projeto já apanhei 2 de 3 guardas em falso verde
// (MC88.16) e mais duas (MC89.34). A lista das mutações e do que cada uma
// apanha está no fim do ficheiro.

import { test } from "node:test";
import assert from "node:assert/strict";
import { decidirDestino, DESTINO, PRAZO_ESTADO_NEUTRO_MS } from "./encaminhamento.js";

// Estado de um VISITANTE anónimo no primeiro render. Cada teste parte daqui e
// muda só o que interessa — assim o que está sob teste fica explícito.
const BASE = {
  address: null,
  isAdmin: false,
  adminLoading: true,
  adminProvavel: false,
  tipoProvavel: "comum",
  tipoUsuario: "comum",
  tipoCarregando: false,
  tipoResolvido: false,
  pareceAutenticado: false,
  restaurandoSessao: false,
  loginEmCurso: false,
  prazoEsgotado: false,
};
const com = (patch) => decidirDestino({ ...BASE, ...patch });

// ── R-B: o visitante é sagrado ───────────────────────────────────────────────
// O Dashboard é a página pública de entrada. Se este teste passar a vermelho, a
// correção regrediu o arranque de quem ainda não tem conta.

test("visitante anónimo vê o Dashboard, não o estado neutro", () => {
  assert.equal(com({}), DESTINO.DASHBOARD);
});

test("visitante continua no Dashboard mesmo com o tipo por resolver", () => {
  // É o caso mais perigoso: `tipoResolvido` é false para toda a gente no
  // arranque. Só `pareceAutenticado` separa o visitante do utilizador.
  assert.equal(com({ tipoResolvido: false, pareceAutenticado: false }), DESTINO.DASHBOARD);
});

// ── OS SEIS CENÁRIOS DO MC89.35 ──────────────────────────────────────────────
// Em todos eles não há palpite (foi apagado, expirou ou nunca existiu) e o
// utilizador parece autenticado. Antes do MC89.36 os seis davam DASHBOARD.

for (const cenario of [
  "A — logout seguido de login",
  "B — troca de conta",
  "C — reabertura passadas mais de 24 h",
  "E — primeiro login de sempre",
  "F — reinstalação / dados limpos",
  "G — sessão em disco sem endereço legível",
]) {
  test(`${cenario}: estado neutro, nunca o Dashboard comum`, () => {
    assert.equal(
      com({ pareceAutenticado: true, tipoResolvido: false }),
      DESTINO.ESTADO_NEUTRO,
    );
  });
}

// ── MC89.36.1: O LOGIN FRESCO ────────────────────────────────────────────────
// MEDIDO no aparelho, no primeiro login do lojista após logout: 1 889 ms de
// DASHBOARD COMUM entre o retorno do OAuth (180 644 ms) e o estado neutro
// (182 533 ms). `pareceAutenticado` era false porque o `gut_saldo_cache` tinha
// sido apagado no logout e ainda não fora reescrito.

test("login fresco: OAuth no URL basta para esperar, sem cache nenhum", () => {
  // Nem gut_saldo_cache, nem privy:connections — o SDK está a trocar o código
  // pelo token neste instante. O único sinal que existe é o URL.
  assert.equal(
    com({ pareceAutenticado: false, restaurandoSessao: false, loginEmCurso: true }),
    DESTINO.ESTADO_NEUTRO,
  );
});

test("reabertura com sessão em disco mas SEM cache de saldo", () => {
  // O caso que o MC89.31 mediu no ADM (737 ms a dizer "faça login" a quem tinha
  // sessão válida). `pareceAutenticado` é false, `restaurandoSessao` é true.
  assert.equal(
    com({ pareceAutenticado: false, restaurandoSessao: true }),
    DESTINO.ESTADO_NEUTRO,
  );
});

test("⚠️ R-B continua de pé: nenhuma das três chaves é verdadeira num visitante", () => {
  // Este é o teste que impede que alargar a porta atropele a página pública.
  assert.equal(
    com({ pareceAutenticado: false, restaurandoSessao: false, loginEmCurso: false, tipoResolvido: false }),
    DESTINO.DASHBOARD,
  );
});

test("o prazo trava as três chaves por igual", () => {
  for (const chave of ["pareceAutenticado", "restaurandoSessao", "loginEmCurso"]) {
    assert.equal(
      com({ [chave]: true, prazoEsgotado: true }), DESTINO.DASHBOARD,
      `${chave} escapou ao prazo — R-C tem de valer para todas`,
    );
  }
});

// ── O sinal é `tipoResolvido`, NÃO `tipoCarregando` ──────────────────────────
// Este é o teste que fixa o achado do MC89.36-S0. Se alguém trocar o sinal de
// volta, é aqui que rebenta.

test("janela real do arranque: tipoCarregando false e tipo por resolver → estado neutro", () => {
  // Medido no aparelho: entre os 568 ms (FCP) e os 4422 ms (/cotas dispara),
  // `tipoCarregando` é FALSE. São 76% da janela. Uma condição ancorada nele
  // deixava o Dashboard comum pintado durante todo este intervalo.
  assert.equal(
    com({ pareceAutenticado: true, tipoCarregando: false, tipoResolvido: false }),
    DESTINO.ESTADO_NEUTRO,
  );
});

test("com /cotas em voo também é estado neutro", () => {
  assert.equal(
    com({ pareceAutenticado: true, tipoCarregando: true, tipoResolvido: false }),
    DESTINO.ESTADO_NEUTRO,
  );
});

test("respondido e comum → Dashboard, que é a resposta certa", () => {
  assert.equal(
    com({ pareceAutenticado: true, tipoResolvido: true, tipoUsuario: "comum" }),
    DESTINO.DASHBOARD,
  );
});

// ── R-C: falhar para o lado aberto ───────────────────────────────────────────

test("prazo esgotado sem resposta → Dashboard (nunca preso no esqueleto)", () => {
  assert.equal(
    com({ pareceAutenticado: true, tipoResolvido: false, prazoEsgotado: true }),
    DESTINO.DASHBOARD,
  );
});

test("prazo esgotado NÃO rouba o lojista que já tem palpite", () => {
  // A válvula não pode passar à frente de uma decisão já tomada.
  assert.equal(
    com({ pareceAutenticado: true, tipoProvavel: "corporativo", prazoEsgotado: true }),
    DESTINO.CORPORATIVO,
  );
});

test("o prazo é generoso face à janela quente medida", () => {
  // 5707 ms foi a cadeia /cotas completa num arranque quente (MC89.35).
  // Se alguém baixar a constante para menos do que isso, o prazo dispara SEMPRE
  // e a correção deixa de servir para nada.
  assert.ok(
    PRAZO_ESTADO_NEUTRO_MS > 5707,
    `prazo ${PRAZO_ESTADO_NEUTRO_MS} ms dispararia antes da cadeia /cotas quente (5707 ms)`,
  );
});

// ── LOJISTA ──────────────────────────────────────────────────────────────────

test("palpite de lojista encaminha logo, sem esperar pelas cotas", () => {
  assert.equal(
    com({ pareceAutenticado: true, tipoProvavel: "corporativo", tipoUsuario: "comum" }),
    DESTINO.CORPORATIVO,
  );
});

test("lojista confirmado espera que o carregamento termine", () => {
  assert.equal(
    com({ pareceAutenticado: true, tipoProvavel: "corporativo", tipoUsuario: "corporativo", tipoCarregando: true }),
    DESTINO.ESTADO_NEUTRO,
  );
  assert.equal(
    com({ pareceAutenticado: true, tipoProvavel: "corporativo", tipoUsuario: "corporativo", tipoCarregando: false }),
    DESTINO.CORPORATIVO,
  );
});

// ── ADM: não regredir o MC89.31/89.34 ────────────────────────────────────────

test("ADM com palpite vai direto ao painel, antes de haver address", () => {
  assert.equal(com({ adminProvavel: true, pareceAutenticado: true }), DESTINO.ADMIN);
});

test("com address, manda a resposta confirmada e não o palpite", () => {
  // O palpite não pode sobreviver à verdade: se o backend disse que não é admin,
  // o encaminhamento para /admin tem de cair.
  assert.equal(
    com({ address: "0xabc", adminProvavel: true, isAdmin: false, adminLoading: false, pareceAutenticado: true }),
    DESTINO.ESTADO_NEUTRO,
  );
  assert.equal(
    com({ address: "0xabc", adminProvavel: false, isAdmin: true, adminLoading: false, pareceAutenticado: true }),
    DESTINO.ADMIN,
  );
});

test("resposta de admin ainda a caminho não encaminha para /admin", () => {
  assert.equal(
    com({ address: "0xabc", isAdmin: true, adminLoading: true, pareceAutenticado: true }),
    DESTINO.ESTADO_NEUTRO,
  );
});

test("o ADM ganha ao lojista quando é os dois (ordem do MC89.12)", () => {
  // Não é um acidente: está documentado em App.jsx. Se alguém inverter a ordem
  // dos degraus, é aqui que se dá por isso.
  assert.equal(
    com({ adminProvavel: true, tipoProvavel: "corporativo", pareceAutenticado: true }),
    DESTINO.ADMIN,
  );
});

test("o encaminhamento do ADM é incondicional (decisão do MC89.34)", () => {
  // Chegou a existir uma "pausa" para o ADM ver o Dashboard comum; foi revertida
  // por decisão do operador. Nada em `decidirDestino` pode dar ao ADM outro
  // destino que não /admin.
  for (const patch of [
    { tipoResolvido: true }, { prazoEsgotado: true }, { tipoUsuario: "comum" },
    { pareceAutenticado: false }, { tipoCarregando: true },
  ]) {
    assert.equal(com({ adminProvavel: true, ...patch }), DESTINO.ADMIN,
      `ADM escapou ao painel com ${JSON.stringify(patch)}`);
  }
});

// ── MUTAÇÕES VALIDADAS (9/9) ─────────────────────────────────────────────────
// Cada linha: a mutação introduzida em encaminhamento.js e o teste que a apanhou.
// Todas foram corridas e todas deram VERMELHO antes de eu reverter.
//
//  1. remover o degrau do estado neutro (voltar a `return DESTINO.DASHBOARD`)
//     → apanhada por: os 6 cenários + "janela real do arranque"
//  2. trocar `!tipoResolvido` por `tipoCarregando`
//     → apanhada por: "janela real do arranque" (o caso que 76% da janela vive)
//  3. remover `pareceAutenticado` da condição do estado neutro
//     → apanhada por: "visitante continua no Dashboard mesmo com o tipo por resolver"
//  4. remover `!prazoEsgotado` da condição
//     → apanhada por: "prazo esgotado sem resposta → Dashboard"
//  5. pôr o degrau do prazo ANTES do degrau do lojista
//     → apanhada por: "prazo esgotado NÃO rouba o lojista que já tem palpite"
//  6. trocar a ordem ADM ↔ lojista
//     → apanhada por: "o ADM ganha ao lojista quando é os dois"
//  7. ignorar `adminLoading` (usar só `isAdmin`)
//     → apanhada por: "resposta de admin ainda a caminho não encaminha"
//  8. usar o palpite de admin mesmo com `address` presente
//     → apanhada por: "com address, manda a resposta confirmada"
//  9. baixar PRAZO_ESTADO_NEUTRO_MS para 3000 (o valor que eu propus no MC89.35)
//     → apanhada por: "o prazo é generoso face à janela quente medida"
