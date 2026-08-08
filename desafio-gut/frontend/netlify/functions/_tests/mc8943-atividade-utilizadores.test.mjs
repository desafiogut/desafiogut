// MC89.43 (S2 / P0-A) — registo de presença.
//
// O que estes testes prendem, por ordem de importância:
//
//   1. ⚠️ NUNCA BLOQUEAR O LOGIN. `registarAtividade` é fail-soft: base em
//      baixo, Supabase por configurar, erro da RPC — devolve false, não lança.
//      Isto é o oposto de `admin-log.mjs` (fail-CLOSED) e a confusão entre os
//      dois é o erro fácil de cometer aqui. Uma estatística de presença não
//      vale recusar a entrada a um utilizador.
//   2. Não se escreve lixo: só endereços com forma válida, sempre em
//      minúsculas (a PK e o CHECK da tabela contam com isso).
//   3. A exclusão de conta apaga mesmo — é a contrapartida LGPD de passar a
//      guardar isto.
//
// node --test --experimental-test-module-mocks _tests/mc8943-atividade-utilizadores.test.mjs

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { registarAtividade, apagarAtividade } from "../_lib/atividade-utilizadores.mjs";

const ADDR = "0xaaaa00000000000000000000000000000000bbbb";

let rpcChamadas = [];
let deleteFiltros = [];

function criarSb({ rpcError = null, deleteError = null, apagadas = [{ endereco: ADDR }] } = {}) {
  return {
    rpc: async (nome, args) => {
      rpcChamadas.push({ nome, args });
      return { error: rpcError ? { message: rpcError } : null };
    },
    from: () => ({
      delete: () => ({
        eq: (col, val) => ({
          select: async () => {
            deleteFiltros.push({ col, val });
            return deleteError
              ? { data: null, error: { message: deleteError } }
              : { data: apagadas, error: null };
          },
        }),
      }),
      select: () => ({
        eq: async (col, val) => {
          deleteFiltros.push({ col, val, contagem: true });
          return { count: 1, error: null };
        },
      }),
    }),
  };
}

beforeEach(() => { rpcChamadas = []; deleteFiltros = []; });

// ── 1. Fail-soft: o login manda ────────────────────────────────────────────

test("⚠️ erro da base NÃO lança — o login tem de seguir na mesma", async () => {
  const ok = await registarAtividade(ADDR, { _sb: criarSb({ rpcError: "connection refused" }) });
  assert.equal(ok, false, "devia sinalizar falha devolvendo false, não lançando");
});

test("⚠️ cliente que rebenta ao ser usado NÃO lança", async () => {
  const sbExplosivo = { rpc: () => { throw new Error("SUPABASE_URL ausente"); } };
  const ok = await registarAtividade(ADDR, { _sb: sbExplosivo });
  assert.equal(ok, false);
});

// ── 2. Não escrever lixo ───────────────────────────────────────────────────

test("registo bem-sucedido chama a RPC atómica com o endereço", async () => {
  const ok = await registarAtividade(ADDR, { _sb: criarSb() });
  assert.equal(ok, true);
  assert.equal(rpcChamadas.length, 1);
  assert.equal(rpcChamadas[0].nome, "registar_atividade");
  assert.deepEqual(rpcChamadas[0].args, { p_endereco: ADDR });
});

test("endereço em MAIÚSCULAS é normalizado (a PK e o CHECK exigem minúsculas)", async () => {
  await registarAtividade(ADDR.toUpperCase().replace("0X", "0x"), { _sb: criarSb() });
  assert.equal(rpcChamadas[0].args.p_endereco, ADDR);
});

test("endereço inválido é ignorado sem tocar na base", async () => {
  for (const mau of ["", null, undefined, "0x123", "nao-e-endereco", "0xzz" + "0".repeat(38)]) {
    const ok = await registarAtividade(mau, { _sb: criarSb() });
    assert.equal(ok, false, `devia recusar: ${JSON.stringify(mau)}`);
  }
  assert.equal(rpcChamadas.length, 0, "nenhuma escrita devia ter sido tentada");
});

// ── 3. Exclusão de conta (LGPD) ────────────────────────────────────────────

test("apagarAtividade apaga a linha do endereço", async () => {
  const n = await apagarAtividade(ADDR, { _sb: criarSb() });
  assert.equal(n, 1);
  assert.deepEqual(deleteFiltros[0], { col: "endereco", val: ADDR });
});

test("⚠️ apagarAtividade LANÇA em erro — ao contrário do registo", async () => {
  // Aqui o silêncio seria pior: quem chama é a exclusão de conta e precisa de
  // saber que ficou dado para trás.
  await assert.rejects(
    () => apagarAtividade(ADDR, { _sb: criarSb({ deleteError: "permission denied" }) }),
    /atividade_utilizadores/,
  );
});

test("apagarAtividade com endereço inválido não tenta apagar nada", async () => {
  const n = await apagarAtividade("lixo", { _sb: criarSb() });
  assert.equal(n, 0);
  assert.equal(deleteFiltros.length, 0);
});
