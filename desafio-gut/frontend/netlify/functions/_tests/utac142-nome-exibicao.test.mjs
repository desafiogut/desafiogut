// UTAC142 (Frente D, R18-142-D) — «PrimeiroNome I.» na tabela; só de nome de pessoa; nunca e-mail; migração.
// REAIS: `_lib/nome-exibicao.mjs`, `src/lib/nomeExibicao.js` (espelho), `_lib/ranking-especial.mjs`.
// node --test _tests/utac142-nome-exibicao.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const N = await import("../_lib/nome-exibicao.mjs");
const F = await import("../../../src/lib/nomeExibicao.js");
const R = await import("../_lib/ranking-especial.mjs");

const CASOS = [
  ["Ana Paula Souza", "Ana P."],
  ["  João   Silva ", "João S."],
  ["Maria da Silva", "Maria S."],          // partícula «da» saltada
  ["Ruan", "Ruan"],                        // um só nome
  ["Ana S.", "Ana S."],                    // IDEMPOTENTE: a forma guardada no servidor volta igual (achado no UTAC142)
  ["S. Ana", null],                        // a inicial nunca é o primeiro nome
  ["élio ávila", "élio Á."],
  ["Anne-Marie O’Neil", "Anne-Marie O."],
  ["ana.souza@gmail.com", null],           // e-mail (o fallback do userLabel) → nunca
  ["Ana @souza", null],
  ["0x5baf…32b8", null],
  ["<script>", null],
  ["", null], [null, null], [42, null],
];

test("D1 · formatarNome: «PrimeiroNome I.», partículas saltadas, e-mail e lixo recusados", () => {
  for (const [entrada, esperado] of CASOS) assert.equal(N.formatarNome(entrada), esperado, JSON.stringify(entrada));
});

test("D2 · o espelho do frontend é IGUAL ao do backend (mesmos casos, mesma saída)", () => {
  for (const [entrada] of CASOS) assert.equal(F.formatarNome(entrada), N.formatarNome(entrada), JSON.stringify(entrada));
  assert.equal(F.formatarNomeExibicao("0x5baf…32b8", "ana@x.com"), "0x5baf…32b8");
});

test("D3 · formatarNomeExibicao: sem nome de pessoa cai no endereço; sem nada, «—»", () => {
  assert.equal(N.formatarNomeExibicao("0x5baf…32b8", "Ana Souza"), "Ana S.");
  assert.equal(N.formatarNomeExibicao("0x5baf…32b8", "ana@gmail.com"), "0x5baf…32b8");
  assert.equal(N.formatarNomeExibicao(null, null), "—");
});

function duplo() {
  const chamadas = [];
  return { chamadas, rpc: async (nome, args) => { chamadas.push({ nome, args }); return { data: 1, error: null }; } };
}
const END = "0x" + "0".repeat(39) + "1";

test("D4 · registar manda SÓ o nome reduzido (nunca o completo nem o e-mail); sem nome, a chamada é a do UTAC140", async () => {
  const sb = duplo();
  await R.registarNoRankingEspecial({ lanceId: "L1", edicaoId: "ESPECIAL-RELAMPAGO1", endereco: END, nomeExibicao: "Ana Paula Souza" }, { supabase: sb });
  await R.registarNoRankingEspecial({ lanceId: "L2", edicaoId: "ESPECIAL-RELAMPAGO1", endereco: END, nomeExibicao: "ana@gmail.com" }, { supabase: sb });
  assert.equal(sb.chamadas[0].args.p_nome, "Ana P.");
  assert.equal(JSON.stringify(sb.chamadas).includes("Paula Souza"), false);
  assert.equal("p_nome" in sb.chamadas[1].args, false);
  assert.equal(JSON.stringify(sb.chamadas).includes("gmail"), false);
});

test("D5 · migração: coluna com CHECK sem «@», grant de coluna ao anon, RPC devolve o nome e NÃO mexe no valor_oculto", () => {
  const sql = readFileSync(new URL("../../../supabase/migrations/20261120_utac142_ranking_nome.sql", import.meta.url), "utf8")
    .replace(/^--.*$/gm, "");
  assert.match(sql, /add column if not exists nome_exibicao text/);
  assert.match(sql, /position\('@' in nome_exibicao\) = 0/);
  assert.match(sql, /grant select \(nome_exibicao\) on public\.ranking_especial to anon, authenticated;/);
  assert.match(sql, /returns table \(posicao integer, endereco text, valor_oculto integer, criado_em timestamptz, nome_exibicao text\)/);
  assert.match(sql, /case when coalesce\(auth\.role\(\), ''\) = 'service_role' then r\.valor_oculto else null end/);
  assert.doesNotMatch(sql, /grant select \([^)]*valor_oculto/);
  assert.match(sql, /grant execute on function public\.registar_lance_especial\(text, text, text, text\) to service_role;/);
  assert.doesNotMatch(sql, /registar_lance_especial[^;]*to anon/);
});
