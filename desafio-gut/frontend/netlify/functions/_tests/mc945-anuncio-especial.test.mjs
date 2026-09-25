// mc945-anuncio-especial.test.mjs — MC94.5.
//
// O GUTO avisa os testadores 24 h antes da rodada especial, UMA única vez, em PT-BR.
//
// Estes testes medem o NÚCLEO (`executarTick`) com o relógio simulado por injecção —
// não por mock de `Date` — para que a asserção seja sobre a lógica, e não sobre o
// ambiente. `ALVO` é derivado de `ALVO_ISO` (a constante do módulo): se alguém mudar a
// data no código, o teste acompanha-a e o que ele trava é o COMPORTAMENTO (antes/não,
// depois/sim, uma vez, só o público), não um literal repetido.
//
// node --test --experimental-test-module-mocks _tests/mc945-anuncio-especial.test.mjs

import { test, mock } from "node:test";
import assert from "node:assert/strict";

// ── Mocks de carregamento (o módulo importa estes no topo) ───────────────────
// As dependências são INJECTADAS em cada teste; estes mocks existem para o módulo
// carregar de forma hermética (e para provar que o caminho normal não os usa às
// cegas: se algum teste esquecer a injecção, rebenta em vez de tocar em produção).
mock.module("@netlify/blobs", {
  namedExports: { getStore: () => { throw new Error("store NAO injectado no teste"); } },
});
mock.module("@netlify/functions", {
  namedExports: { schedule: (_cron, fn) => fn }, // handler chamável tal-e-qual no teste
});
mock.module("../_lib/supabase-client.mjs", {
  namedExports: { getSupabaseReadOnly: () => { throw new Error("sb NAO injectado no teste"); } },
});
mock.module("../_lib/notificacoes-usuario.mjs", {
  namedExports: { adicionarNotificacao: async () => { throw new Error("notificar NAO injectado no teste"); } },
});

const mod = await import("../scheduled-anuncio-especial.mjs");
const {
  EDICAO, ALVO_ISO, CORTE_TESTADORES_ISO, TIPO, MENSAGEM, CHAVE_MARCADOR,
  decidirDisparo, listarPublico, executarTick,
} = mod;

const ALVO = Date.parse(ALVO_ISO);
const ANTES = ALVO - 60_000;
const DEPOIS = ALVO + 60_000;

// ── Auxiliares ──────────────────────────────────────────────────────────────

/** Store em memória no formato da API do @netlify/blobs usada aqui. */
function storeMem(inicial = {}) {
  const mem = new Map(Object.entries(inicial));
  return {
    mem,
    async get(k, { type } = {}) { const v = mem.get(k); if (v === undefined) return null; return type === "json" ? JSON.parse(v) : v; },
    async setJSON(k, o) { mem.set(k, JSON.stringify(o)); },
  };
}

/** Cliente Supabase falso: registra a query e devolve as linhas dadas. */
function sbFake(linhas, { erro = null, registo = {} } = {}) {
  return {
    from(tabela) {
      registo.tabela = tabela;
      const q = {
        select(cols) { registo.select = cols; return q; },
        lte(col, val) { registo.lte = [col, val]; return Promise.resolve({ data: linhas, error: erro }); },
      };
      return q;
    },
    registo,
  };
}

/** Espião do envio: registra cada notificação e permite forçar falhas. */
function notificarSpy({ devolver = true, lancarEm = null } = {}) {
  const chamadas = [];
  const fn = async (endereco, notif) => {
    chamadas.push({ endereco, notif });
    if (lancarEm && endereco === lancarEm) throw new Error("store em baixo");
    return devolver;
  };
  fn.chamadas = chamadas;
  return fn;
}

const DONO = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DOIS = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

// ── A regra pura: quando dispara ────────────────────────────────────────────

test("NÃO dispara antes do alvo; dispara NO alvo", () => {
  assert.deepEqual(decidirDisparo({ agoraMs: ANTES, alvoMs: ALVO }), { disparar: false, motivo: "antes_do_alvo" });
  assert.deepEqual(decidirDisparo({ agoraMs: ALVO - 1, alvoMs: ALVO }), { disparar: false, motivo: "antes_do_alvo" });
  assert.deepEqual(decidirDisparo({ agoraMs: ALVO, alvoMs: ALVO }), { disparar: true, motivo: "no_alvo" });
  assert.deepEqual(decidirDisparo({ agoraMs: DEPOIS, alvoMs: ALVO }), { disparar: true, motivo: "no_alvo" });
});

test("NÃO dispara se já foi enviado (mesmo depois do alvo)", () => {
  assert.deepEqual(decidirDisparo({ agoraMs: DEPOIS, alvoMs: ALVO, jaEnviado: true }),
    { disparar: false, motivo: "ja_enviado" });
});

test("O alvo é 03/10/2026 20:00 em Brasília (UTC-3) — não 20:00 UTC", () => {
  // 20:00 BRT = 23:00 UTC. Se alguém trocar por "T20:00Z", este teste morre.
  assert.equal(ALVO_ISO, "2026-10-03T23:00:00.000Z");
  assert.equal(new Date(ALVO_ISO).toISOString(), "2026-10-03T23:00:00.000Z");
  // O corte de testadores: 02/10 23:59 BRT = 03/10 02:59 UTC.
  assert.equal(CORTE_TESTADORES_ISO, "2026-10-03T02:59:00.000Z");
});

// ── O público ───────────────────────────────────────────────────────────────

test("o público é lido de atividade_utilizadores, com o CORTE decidido pelo operador", async () => {
  const sb = sbFake([{ endereco: DONO }, { endereco: DOIS }]);
  const lista = await listarPublico({ sb });
  assert.deepEqual(lista.sort(), [DONO, DOIS].sort());
  assert.equal(sb.registo.tabela, "atividade_utilizadores");
  assert.equal(sb.registo.select, "endereco");
  // 02/10/2026 23:59 Brasília — é ESTE o corte escolhido (R18), não outro qualquer.
  assert.deepEqual(sb.registo.lte, ["primeiro_acesso", "2026-10-03T02:59:00.000Z"]);
});

test("o público descarta linhas sem endereço válido e normaliza para minúsculas", async () => {
  const sb = sbFake([
    { endereco: DONO.toUpperCase().replace("0X", "0x") },
    { endereco: "0x123" },            // curto
    { endereco: null },               // ausente
    { endereco: "nao-e-endereco" },
    { endereco: DONO },               // duplicado simples
  ]);
  const lista = await listarPublico({ sb });
  assert.deepEqual(lista, [DONO], "só o endereço válido, uma vez, em minúsculas");
});

test("se a leitura do público falhar, listarPublico LANÇA (o chamador decide)", async () => {
  await assert.rejects(() => listarPublico({ sb: sbFake([], { erro: { message: "rpc caiu" } }) }));
});

// ── O tick ──────────────────────────────────────────────────────────────────

test("ANTES do alvo: não envia nada e não grava marcador", async () => {
  const store = storeMem();
  const notificar = notificarSpy();
  const r = await executarTick({ agoraMs: ANTES, store, sb: sbFake([{ endereco: DONO }]), notificar });
  assert.deepEqual(r, { acao: "sem_disparo", motivo: "antes_do_alvo" });
  assert.equal(notificar.chamadas.length, 0, "não pode ter enviado nada");
  assert.equal(store.mem.has(CHAVE_MARCADOR), false, "não pode ter marcado como enviado");
});

test("NO alvo: envia a TODO o público, com o tipo/edição/mensagem certos, e marca", async () => {
  const store = storeMem();
  const notificar = notificarSpy();
  const sb = sbFake([{ endereco: DONO }, { endereco: DOIS }]);
  const r = await executarTick({ agoraMs: ALVO, store, sb, notificar });

  assert.equal(r.acao, "anunciado");
  assert.equal(r.total, 2);
  assert.equal(r.escritas, 2);
  assert.deepEqual(notificar.chamadas.map((c) => c.endereco).sort(), [DONO, DOIS].sort());
  for (const c of notificar.chamadas) {
    assert.equal(c.notif.tipo, TIPO);
    assert.equal(c.notif.edicaoId, EDICAO);
    assert.equal(c.notif.mensagem, MENSAGEM);
  }
  assert.ok(store.mem.has(CHAVE_MARCADOR), "tem de marcar para não repetir");
  const marca = JSON.parse(store.mem.get(CHAVE_MARCADOR));
  assert.equal(marca.total, 2);
  assert.equal(marca.escritas, 2);
});

test("IDEMPOTÊNCIA: uma segunda passagem no mesmo dia NÃO volta a enviar", async () => {
  const store = storeMem();
  const primeira = notificarSpy();
  await executarTick({ agoraMs: ALVO, store, sb: sbFake([{ endereco: DONO }]), notificar: primeira });
  assert.equal(primeira.chamadas.length, 1);

  const segunda = notificarSpy();
  const r2 = await executarTick({ agoraMs: DEPOIS, store, sb: sbFake([{ endereco: DONO }]), notificar: segunda });
  assert.deepEqual(r2, { acao: "sem_disparo", motivo: "ja_enviado" });
  assert.equal(segunda.chamadas.length, 0, "a segunda passagem não pode enviar nada");
});

test("o público é respeitado: envia SÓ a quem está na lista do corte (nunca a 'todos')", async () => {
  const store = storeMem();
  const notificar = notificarSpy();
  // A lista que o banco devolve JÁ é o público do corte. O que se prova aqui é que
  // o tick não acrescenta ninguém por sua conta: envia exactamente a esses.
  await executarTick({ agoraMs: ALVO, store, sb: sbFake([{ endereco: DOIS }]), notificar });
  assert.deepEqual(notificar.chamadas.map((c) => c.endereco), [DOIS]);
  assert.notEqual(notificar.chamadas[0].endereco, DONO);
});

test("marcador ilegível: NÃO envia (perder um tick recupera-se, repetir não)", async () => {
  const storeQueFalha = { async get() { throw new Error("blob em baixo"); }, async setJSON() {} };
  const notificar = notificarSpy();
  const r = await executarTick({ agoraMs: ALVO, store: storeQueFalha, sb: sbFake([{ endereco: DONO }]), notificar });
  assert.deepEqual(r, { acao: "abortado", motivo: "marcador_ilegivel" });
  assert.equal(notificar.chamadas.length, 0);
});

test("público indisponível: aborta SEM marcar (o tick seguinte tenta outra vez)", async () => {
  const store = storeMem();
  const notificar = notificarSpy();
  const r = await executarTick({ agoraMs: ALVO, store, sb: sbFake([], { erro: { message: "rpc caiu" } }), notificar });
  assert.deepEqual(r, { acao: "abortado", motivo: "publico_indisponivel" });
  assert.equal(notificar.chamadas.length, 0);
  assert.equal(store.mem.has(CHAVE_MARCADOR), false, "não pode marcar como enviado o que não enviou");
});

test("ENSAIO (dry-run): calcula o público e não escreve NADA — nem notificação, nem marcador", async () => {
  const store = storeMem();
  const notificar = notificarSpy();
  const r = await executarTick({ agoraMs: ALVO, store, sb: sbFake([{ endereco: DONO }, { endereco: DOIS }]), notificar, dryRun: true });
  assert.deepEqual(r, { acao: "ensaio", total: 2 });
  assert.equal(notificar.chamadas.length, 0);
  assert.equal(store.mem.has(CHAVE_MARCADOR), false);
});

test("uma falha de envio não impede os outros — conta-se e segue (fail-soft)", async () => {
  const store = storeMem();
  const notificar = notificarSpy({ lancarEm: DONO });
  const r = await executarTick({ agoraMs: ALVO, store, sb: sbFake([{ endereco: DONO }, { endereco: DOIS }]), notificar });
  assert.equal(r.acao, "anunciado");
  assert.equal(r.total, 2);
  assert.equal(r.escritas, 1, "ao DOIS chegou");
  assert.equal(r.naoEscritas, 1, "o que falhou foi contado");
});

test("a mensagem é PT-BR e traz os elementos que o operador exigiu", () => {
  assert.match(MENSAGEM, /24h/i, "tem de dizer que faltam 24h");
  assert.match(MENSAGEM, /Air Fryer/i, "o prémio");
  assert.match(MENSAGEM, /20h|20:00/, "a hora de início");
  assert.match(MENSAGEM, /R\$ 0,01/, "o valor mínimo do lance");
  assert.match(MENSAGEM, /saldo/i, "que debita do saldo (a correcção do MC94.4.1)");
  assert.match(MENSAGEM, /30 minutos/i, "a duração");
  // PT-BR, não PT-PT: "saldo"/"relâmpago" servem; "só" com acento é pt-BR.
  assert.match(MENSAGEM, /Só 30 minutos/, "acentuação PT-BR");
  // E NÃO pode voltar a falar de senhas nesta rodada (regressão do MC94.4.1).
  assert.doesNotMatch(MENSAGEM, /senha/i, "a rodada especial debita saldo, não senha");
});
