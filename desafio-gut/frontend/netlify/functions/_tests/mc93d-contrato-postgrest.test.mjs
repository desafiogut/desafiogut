// MC93-D — TESTE DE CONTRATO: os duplos contra o PostgREST REAL.
//
// PORQUÊ ESTE FICHEIRO EXISTE: os três P0 do MC93-C nasceram todos da mesma
// causa — o duplo de Supabase foi escrito por quem escreveu o código, e herdou
// as suas suposições. Um duplo assim mede coerência interna, não contrato.
// Este ficheiro mede o CONTRATO.
//
// DOIS NÍVEIS, e cada um resolve uma metade:
//   NÍVEL 1 — CLIENTE: executa a biblioteca REAL (`@supabase/postgrest-js`) e
//     observa o URL que ela gera. Não precisa de servidor. Corre sempre.
//   NÍVEL 2 — SERVIDOR: fala com um PostgREST REAL, com a migração do MC93-B
//     aplicada. Só corre quando há um Supabase local de pé; caso contrário os
//     testes são SALTADOS com aviso, nunca silenciosamente verdes.
//
// Levantar o servidor (fora do repo, porque o `.env` do projeto tem BOM e
// rebenta o parser do CLI):
//   supabase init && supabase start -x storage-api,imgproxy,studio,inbucket,\
//     realtime,logflare,vector,edge-runtime,supavisor,pgbouncer
//   psql < supabase/migrations/20260923_mc93b_pontuacoes.sql
//   SUPABASE_CONTRATO_URL=http://127.0.0.1:54321/rest/v1 SUPABASE_CONTRATO_KEY=<service_role>
//
// PostgREST puro (e o que o CI faz -- ver .github/workflows/ci.yml, job
// `test-functions`, e scripts/ci-postgrest-local.sh para o correr a mao):
//   SUPABASE_CONTRATO_URL=http://localhost:3000 SUPABASE_CONTRATO_KEY=<jwt service_role>
//
// ATENCAO (MC93-E, ao abrigo da R15): `SUPABASE_CONTRATO_URL` passou a ser a
// BASE DO POSTGREST, nao a raiz do gateway do Supabase. Este ficheiro
// acrescentava `/rest/v1`, o que servia o Supabase local mas tornava
// IMPOSSIVEL apontar a um PostgREST puro -- e era por isso que estes testes
// nao podiam correr em CI. Quem usava o valor antigo acrescenta `/rest/v1`.
//
// node --test --experimental-test-module-mocks _tests/mc93d-contrato-postgrest.test.mjs

import { test, skip } from "node:test";
import assert from "node:assert/strict";
import { PostgrestClient } from "@supabase/postgrest-js";

const URL_REAL = process.env.SUPABASE_CONTRATO_URL;
const KEY_REAL = process.env.SUPABASE_CONTRATO_KEY;
const TEM_SERVIDOR = Boolean(URL_REAL && KEY_REAL);

/** Cliente sem rede — só para observar o URL que a biblioteca real constrói. */
const offline = () => new PostgrestClient("https://contrato.test");

/** Cliente contra o PostgREST real (nível 2). */
const online = () => new PostgrestClient(URL_REAL.replace(/\/+$/, ""), {
  headers: { apikey: KEY_REAL, Authorization: `Bearer ${KEY_REAL}` },
});

const query = (b) => decodeURIComponent(b.url.search);

// ── NÍVEL 1 — o que a biblioteca REAL gera ──────────────────────────────────

test("CONTRATO: .eq(col, null) gera `eq.null` — o literal que mata", () => {
  // Esta é a causa exacta do P0 do MC93-C. O duplo aceitava-o; o servidor não.
  assert.match(query(offline().from("t").update({ x: 1 }).eq("liquidado_em", null)),
    /liquidado_em=eq\.null/);
});

test("CONTRATO: .is(col, null) gera `is.null` — o único que funciona", () => {
  assert.match(query(offline().from("t").update({ x: 1 }).is("liquidado_em", null)),
    /liquidado_em=is\.null/);
});

test("CONTRATO: .eq com booleano gera `eq.false` e é VÁLIDO", () => {
  // Importa distinguir: o compare-and-set do `pontuacao-store` usa
  // `.eq("bonus_emitido", false)` e está CERTO — `eq.false` é aceite num
  // booleano. O problema é só com NULL.
  assert.match(query(offline().from("t").update({ x: 1 }).eq("bonus_emitido", false)),
    /bonus_emitido=eq\.false/);
});

test("CONTRATO: o código de produção usa .is() para o NULL, nunca .eq()", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { dirname, resolve } = await import("node:path");
  const aqui = dirname(fileURLToPath(import.meta.url));
  // HARD GATE 4 (MC93-D): ler SEM comentários. Duas vezes neste projeto uma
  // regex de guarda (ou uma mutação) acertou no comentário em vez do código.
  const semComentarios = (src) =>
    src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  // Varre a ÁRVORE TODA de produção, não só os ficheiros deste MC: o defeito é
  // de contrato com a biblioteca, logo aplica-se a qualquer chamador futuro.
  const { readdirSync, statSync } = await import("node:fs");
  const RAIZ = resolve(aqui, "..");
  const ficheiros = [];
  (function anda(dir) {
    for (const nome of readdirSync(dir)) {
      if (nome === "node_modules" || nome === "_tests") continue;
      const p = resolve(dir, nome);
      if (statSync(p).isDirectory()) anda(p);
      else if (nome.endsWith(".mjs")) ficheiros.push(p);
    }
  })(RAIZ);

  assert.ok(ficheiros.length > 50,
    `varreu ${ficheiros.length} ficheiros — esperava a árvore toda`);
  for (const p of ficheiros) {
    const codigo = semComentarios(readFileSync(p, "utf8"));
    assert.doesNotMatch(codigo, /\.eq\(\s*["'][^"']*["']\s*,\s*null\s*\)/,
      `${p.split("functions").pop()}: .eq(col, null) gera eq.null e o PostgREST `
      + "devolve 400 numa coluna nullable — use .is(). Medido contra o servidor "
      + "real no MC93-D.");
  }
});

// ── NÍVEL 2 — contra o PostgREST REAL ───────────────────────────────────────

const pular = (nome) => test(nome, (t) => {
  t.skip("sem SUPABASE_CONTRATO_URL/KEY — servidor real não disponível");
});

if (!TEM_SERVIDOR) {
  console.warn("[mc93d] ⚠️  NÍVEL 2 SALTADO: sem Supabase local. "
    + "Os testes de servidor NÃO correram — isto não é um verde.");
  pular("SERVIDOR: .eq(col,null) numa TIMESTAMPTZ devolve erro");
  pular("SERVIDOR: .is(col,null) numa TIMESTAMPTZ funciona");
  pular("SERVIDOR: o compare-and-set real só afecta uma linha");
  pular("SERVIDOR: upsert parcial PRESERVA as colunas não listadas");
  pular("SERVIDOR: os CHECKs da migração recusam o que devem recusar");
} else {
  const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const linha = (ciclo, over = {}) => ({
    ciclo_id: ciclo, endereco: A, pontos_totais: 4, acertos_totais: 1,
    posicao: 1, bonus_emitido: true, senhas_a_creditar: 20, ...over,
  });

  test("SERVIDOR: .eq(col,null) numa TIMESTAMPTZ devolve ERRO", async () => {
    // A prova definitiva do P0 do MC93-C, contra o servidor a sério.
    const { error } = await online().from("rankings_ciclo")
      .select("*").eq("liquidado_em", null);
    assert.ok(error, "o PostgREST TEM de recusar eq.null numa timestamptz");
    assert.match(JSON.stringify(error), /22007|invalid input syntax/i);
  });

  test("SERVIDOR: .is(col,null) numa TIMESTAMPTZ funciona", async () => {
    const { error } = await online().from("rankings_ciclo")
      .select("*").is("liquidado_em", null);
    assert.equal(error, null, "is.null é a forma correcta");
  });

  test("SERVIDOR: o compare-and-set real só afecta UMA linha", async () => {
    const c = `CAS-${Date.now()}`;
    await online().from("rankings_ciclo").insert(linha(c));
    const claim = () => online().from("rankings_ciclo")
      .update({ liquidado_em: new Date().toISOString() })
      .eq("ciclo_id", c).eq("endereco", A).is("liquidado_em", null).select();

    const primeiro = await claim();
    const segundo = await claim();
    assert.equal(primeiro.data?.length, 1, "a primeira reclamação ganha");
    assert.equal(segundo.data?.length, 0, "a segunda NÃO afecta linha nenhuma");
    await online().from("rankings_ciclo").delete().eq("ciclo_id", c);
  });

  test("SERVIDOR: upsert parcial PRESERVA as colunas não listadas", async () => {
    // O MC93-C assumiu isto ao tirar as colunas do cadeado do upsert. Aqui
    // mede-se, em vez de se assumir.
    const c = `UPS-${Date.now()}`;
    await online().from("rankings_ciclo").insert(linha(c));
    await online().from("rankings_ciclo")
      .upsert({ ciclo_id: c, endereco: A, acertos_totais: 9 },
        { onConflict: "ciclo_id,endereco" });
    const { data } = await online().from("rankings_ciclo")
      .select("*").eq("ciclo_id", c).single();
    assert.equal(data.acertos_totais, 9, "a coluna listada muda");
    assert.equal(data.bonus_emitido, true, "a NÃO listada é preservada");
    assert.equal(data.senhas_a_creditar, 20, "idem");
    await online().from("rankings_ciclo").delete().eq("ciclo_id", c);
  });

  test("SERVIDOR: os CHECKs da migração recusam o que devem recusar", async () => {
    // A migração nunca tinha sido exercida contra um PostgreSQL. Cobertura
    // zero até ao MC93-D.
    //
    // ⚠️ MC93-E, ao abrigo da R15 — ACHADO DA VALIDAÇÃO INDEPENDENTE (A-2).
    // Este teste dizia só `assert.ok(error)`. QUALQUER erro servia: 404, URL
    // errado, servidor morto — e foi MEDIDO a passar com a tabela APAGADA
    // (`DROP TABLE rankings_ciclo CASCADE`) e com o URL apontado a uma rota
    // inexistente. Sendo o ÚNICO teste dos CHECKs desta migração, estava a
    // contar como prova o que não era prova nenhuma.
    // Agora exige `23514` — o SQLSTATE de `check_violation`. Um 404 já não passa.
    const VIOLACAO_DE_CHECK = "23514";
    const recusadoPeloCheck = (res, oQue, restricao) => {
      assert.ok(res.error, `${oQue}: não houve erro nenhum`);
      assert.equal(res.error.code, VIOLACAO_DE_CHECK,
        `${oQue}: esperava 23514 (check_violation) e veio ${res.error.code} — ` +
        `${JSON.stringify(res.error.message ?? res.error)}`);
      assert.match(String(res.error.message ?? ""), new RegExp(restricao),
        `${oQue}: o erro não nomeia a restrição \`${restricao}\``);
    };

    const c = `CHK-${Date.now()}`;
    recusadoPeloCheck(
      await online().from("rankings_ciclo").insert(linha(c, { endereco: A.toUpperCase() })),
      "endereço em maiúsculas", "rankings_ciclo_endereco_check");

    recusadoPeloCheck(
      await online().from("rankings_ciclo").insert(linha(`${c}-N`, { pontos_totais: -1 })),
      "pontos negativos", "rankings_ciclo_pontos_check");

    recusadoPeloCheck(
      await online().from("rankings_ciclo").insert(
        linha(`${c}-L`, { bonus_emitido: false, liquidado_em: new Date().toISOString() })),
      "liquidar sem bónus", "rankings_ciclo_liquidacao_check");
  });
}
