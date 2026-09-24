// MC93-C — handler de fila `creditar-senhas-bonus` (offline, tudo mockado).
//
// PORQUÊ ESTE TESTE EXISTE: este handler é o único sítio do sistema que pode
// creditar senhas por mérito de torneio. Cada execução a mais são R$ 40,00
// emitidos sem contrapartida. E ele corre sozinho, de 5 em 5 minutos, sem
// ninguém a olhar.
//
// Dois invariantes:
//   1. COM A FLAG DESLIGADA — o estado de produção hoje — **nada acontece**:
//      não credita, não marca liquidado, não altera o livro-razão;
//   2. COM A FLAG LIGADA, **reclama antes de creditar**. É a disciplina do
//      `_lib/worker-credito.mjs`: grava-se o marcador ANTES de mover dinheiro,
//      de modo que um processo que morra a meio nunca pague duas vezes. Entre
//      pagar a dobrar e pagar a menos, escolhe-se pagar a menos — o excesso é
//      irreversível on-chain, a falta reconcilia-se.
//
// node --test --experimental-test-module-mocks _tests/mc93c-validacao-b.test.mjs

import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

const estado = {
  divida: null,
  creditou: [],
  creditarFalha: null,
  updates: [],
  alertas: [],
  ordem: [],          // regista a ORDEM real das operações
  claimVazio: false,  // simula: outra execução reclamou entre o read e o update
};

mock.module("../_lib/supabase-client.mjs", {
  namedExports: {
    supabaseConfigurado: () => true,
    getSupabase: () => ({
      from: () => {
        const st = { filtros: {}, update: null };
        const api = {
          select() { return api; },
          // ⚠️ O duplo RECUSA o que o PostgREST recusa. `.eq(col, null)` vira
          // `col=eq.null` e o PostgREST responde 400 numa coluna TIMESTAMPTZ.
          // O duplo anterior aceitava-o e por isso deu verde a um
          // compare-and-set que NAO EXISTIA. Um duplo permissivo esconde
          // exactamente o defeito que devia apanhar.
          eq(c, v) {
            if (v === null) {
              throw new Error(`[duplo] .eq("${c}", null) gera eq.null e o PostgREST devolve 400 — use .is()`);
            }
            st.filtros[c] = v; return api;
          },
          is(c, v) { st.filtros[c] = v; st.usouIs = st.usouIs || []; st.usouIs.push(c); return api; },
          update(campos) { st.update = campos; return api; },
          maybeSingle: async () => ({ data: estado.divida, error: null }),
          then(res) {
            if (st.update) {
              estado.updates.push({ campos: st.update, filtros: { ...st.filtros }, usouIs: st.usouIs || [] });
              estado.ordem.push("reclamar");
              // Só "afecta" linha se o filtro de idempotência bater certo.
              const podia = !estado.claimVazio && estado.divida
                && (st.filtros.liquidado_em === undefined
                  || estado.divida.liquidado_em === st.filtros.liquidado_em);
              const linhas = podia ? [{ ...estado.divida, ...st.update }] : [];
              if (podia) estado.divida = { ...estado.divida, ...st.update };
              return Promise.resolve(res({ data: linhas, error: null }));
            }
            return Promise.resolve(res({ data: estado.divida ? [estado.divida] : [], error: null }));
          },
        };
        return api;
      },
    }),
  },
});

mock.module("../_lib/contract.mjs", {
  namedExports: {
    creditarSenhas: async (endereco, qtd) => {
      estado.ordem.push("creditar");
      if (estado.creditarFalha) throw new Error(estado.creditarFalha);
      estado.creditou.push({ endereco, qtd });
      return { ok: true, txHash: "0xbonus" };
    },
  },
});

mock.module("../_lib/sentry-server.mjs", {
  namedExports: {
    captureSecurityAlert: async (nome, dados, nivel) => { estado.alertas.push({ nome, dados, nivel }); },
  },
});

const { creditarSenhasBonus } = await import("../_lib/worker-bonus.mjs");
const { REGRAS } = await import("../_lib/pontuacao-utils.mjs");
const { FLAG_EMISSAO } = await import("../_lib/bonus-emissao.mjs");

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const payload = () => ({ cicloId: "R-1", endereco: A, quantidade: REGRAS.SENHAS_BONUS });
const dividaAberta = () => ({
  ciclo_id: "R-1", endereco: A, bonus_emitido: true,
  senhas_a_creditar: REGRAS.SENHAS_BONUS, liquidado_em: null,
});

/** Corre o handler com um ambiente controlado, restaurando-o sempre. */
async function comFlag(valor, fn) {
  const antes = process.env[FLAG_EMISSAO];
  if (valor === undefined) delete process.env[FLAG_EMISSAO];
  else process.env[FLAG_EMISSAO] = valor;
  try { return await fn(); }
  finally {
    if (antes === undefined) delete process.env[FLAG_EMISSAO];
    else process.env[FLAG_EMISSAO] = antes;
  }
}

beforeEach(() => {
  estado.divida = dividaAberta();
  estado.creditou.length = 0; estado.updates.length = 0;
  estado.alertas.length = 0; estado.ordem.length = 0;
  estado.creditarFalha = null;
  estado.claimVazio = false;
});

// ── DRY-RUN: o estado de produção hoje ───────────────────────────────────────

test("sem a flag, o handler NÃO credita e NÃO toca no livro-razão", async () => {
  await comFlag(undefined, () => creditarSenhasBonus(payload()));
  assert.equal(estado.creditou.length, 0, "nada emitido on-chain");
  assert.equal(estado.updates.length, 0, "nada marcado como liquidado");
  assert.equal(estado.divida.liquidado_em, null, "a dívida continua em aberto");
});

test("com a flag a qualquer valor que não seja 'true', NÃO credita", async () => {
  for (const v of ["false", "TRUE", "1", "sim", ""]) {
    estado.creditou.length = 0;
    await comFlag(v, () => creditarSenhasBonus(payload()));
    assert.equal(estado.creditou.length, 0, `${FLAG_EMISSAO}="${v}" não pode emitir`);
  }
});

test("o dry-run NÃO lança — a tarefa fica done, não vai para a DLQ", async () => {
  // Se lançasse, a fila re-enfileirava com backoff e, ao fim de 5 tentativas,
  // enchia a DLQ de tarefas que só estão à espera de uma decisão do operador.
  await comFlag(undefined, async () => {
    await assert.doesNotReject(() => creditarSenhasBonus(payload()));
  });
});

// ── LIVE: com a flag ligada ─────────────────────────────────────────────────

test("com a flag ligada e dívida em aberto, credita a quantidade do livro-razão", async () => {
  await comFlag("true", () => creditarSenhasBonus(payload()));
  assert.equal(estado.creditou.length, 1);
  assert.equal(estado.creditou[0].endereco, A);
  assert.equal(estado.creditou[0].qtd, REGRAS.SENHAS_BONUS);
});

test("RECLAMA ANTES DE CREDITAR — a ordem é a garantia contra pagar duas vezes", async () => {
  await comFlag("true", () => creditarSenhasBonus(payload()));
  assert.deepEqual(estado.ordem, ["reclamar", "creditar"],
    "marcar liquidado_em DEPOIS de creditar deixaria uma janela em que um "
    + "processo morto pagava outra vez");
});

test("a reclamação usa .is() para o NULL — nunca .eq()", async () => {
  // O duplo rebenta se o código usar .eq(col, null); este teste exige ainda
  // que tenha sido .is(), para que a correcção não possa regredir em silêncio.
  await comFlag("true", () => creditarSenhasBonus(payload()));
  const claim = estado.updates[0];
  assert.ok(claim.usouIs.includes("liquidado_em"),
    ".eq(col, null) gera eq.null e o PostgREST devolve 400 — tem de ser .is()");
  assert.ok(claim.campos.liquidado_em, "grava a data de liquidação");
});

test("a reclamação está ancorada ao ciclo E ao endereço", async () => {
  // Sem qualquer um destes filtros, o UPDATE liquidaria dívidas de outros
  // participantes ou de outros ciclos — as duas mutações mais destrutivas
  // possíveis, e nenhuma estava coberta (achado do Validador B).
  await comFlag("true", () => creditarSenhasBonus(payload()));
  const claim = estado.updates[0];
  assert.equal(claim.filtros.ciclo_id, "R-1", "sem o ciclo, liquidaria outros ciclos");
  assert.equal(claim.filtros.endereco, A, "sem o endereço, liquidaria o ciclo todo");
  assert.deepEqual(Object.keys(claim.filtros).sort(),
    ["ciclo_id", "endereco", "liquidado_em"],
    "o conjunto de filtros do claim é exactamente este — nem mais, nem menos");
});

test("dívida JÁ liquidada: não credita nem re-reclama", async () => {
  estado.divida.liquidado_em = "2026-09-24T10:00:00Z";
  await comFlag("true", () => creditarSenhasBonus(payload()));
  assert.equal(estado.creditou.length, 0);
  assert.equal(estado.updates.length, 0);
});

test("tarefa reprocessada não paga segunda vez", async () => {
  await comFlag("true", () => creditarSenhasBonus(payload()));
  await comFlag("true", () => creditarSenhasBonus(payload()));
  assert.equal(estado.creditou.length, 1, "a segunda passagem encontra a dívida liquidada");
});

test("sem dívida no livro-razão, não credita (a fila não é a verdade)", async () => {
  estado.divida = null;
  await comFlag("true", () => creditarSenhasBonus(payload()));
  assert.equal(estado.creditou.length, 0);
});

test("payload com quantidade adulterada não credita — nem a do livro-razão", async () => {
  await comFlag("true", () => creditarSenhasBonus({ ...payload(), quantidade: 200 }));
  assert.equal(estado.creditou.length, 0, "divergir já é sinal de problema");
  assert.equal(estado.updates.length, 0, "e não se reclama o que não se vai pagar");
});

// ── falha on-chain depois da reclamação ─────────────────────────────────────

test("se o crédito on-chain falhar, alerta para reconciliação e NÃO desfaz a reclamação", async () => {
  // Desfazer a reclamação reabriria a janela de pagamento duplo: a tx pode ter
  // sido submetida e ter falhado só a confirmação. Prefere-se pagar a menos e
  // reconciliar à mão — é a mesma escolha do worker-credito.
  estado.creditarFalha = "rpc em baixo";
  await comFlag("true", async () => {
    await assert.rejects(() => creditarSenhasBonus(payload()), /rpc em baixo/);
  });
  assert.equal(estado.divida.liquidado_em !== null, true,
    "a reclamação NÃO é revertida");
  assert.equal(estado.alertas.length, 1, "e fica registado um alerta");
  assert.equal(estado.alertas[0].nivel, "error");
});

test("CORRIDA: se a reclamação não afectar linha, NÃO credita", async () => {
  // O caso que só acontece em concorrência: quando lemos, a dívida estava em
  // aberto; entre a leitura e o UPDATE, outra execução reclamou-a. O
  // `podeEmitir` já disse que sim — é o resultado do compare-and-set que tem
  // de mandar. Sem esta guarda, as duas execuções creditavam.
  estado.claimVazio = true;
  await comFlag("true", () => creditarSenhasBonus(payload()));
  assert.equal(estado.creditou.length, 0,
    "perdeu a corrida → não credita, mesmo tendo passado em podeEmitir");
});
