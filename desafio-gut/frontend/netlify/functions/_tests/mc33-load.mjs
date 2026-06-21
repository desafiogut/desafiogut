// mc33-load.mjs — MC33.1 FASE A: testes de carga do adaptador Supabase (MANUAL).
// NÃO é *.test.mjs de propósito: escreve na BD real (staging) e exige credenciais,
// logo NUNCA deve correr na suite automática / CI.
//
// Uso:
//   set -a; . ~/.mc33-staging.env; set +a
//   node netlify/functions/_tests/mc33-load.mjs            # cenários por defeito
//   node netlify/functions/_tests/mc33-load.mjs 50 100     # cenários à medida
//
// Para cada N: dispara N addLance concorrentes contra Supabase, lê com getLances
// (paginado, K1) e compara apurarMenorUnico(lido) com o esperado. Namespace de
// edição isolado (MC33-LOAD-<uuid>) + limpeza (DELETE) no fim de cada cenário.

import { randomUUID } from "node:crypto";
import { addLance, getLances } from "../_lib/data-store-supabase.mjs";
import { getSupabase } from "../_lib/supabase-client.mjs";
import { apurarMenorUnico } from "../consolidar-lances.mjs";

const CENARIOS = process.argv.slice(2).map(Number).filter(Boolean);
const N_DEFAULT = [50, 100, 200, 1500, 2500];
const CONC_MAX = 200; // teto de concorrência cliente (evita exaustão de sockets)

/** Dataset determinístico: valor 1 duplicado (i=0,1) → não-único; 2..N-1 únicos.
 *  => menor lance único esperado = 2, vencedor = endereço do lance i=2. */
function gerarDataset(N) {
  const lances = [];
  for (let i = 0; i < N; i++) {
    lances.push({
      lanceId: `mc33-${i}`,
      endereco: "0x" + String(i + 1).padStart(40, "0"),
      valorCentavos: i <= 1 ? 1 : i,
      nomeExibicao: `bot-${i}`,
      commitmentHash: null,
      processadoEm: new Date().toISOString(),
    });
  }
  return lances;
}

/** Executa fn sobre items com concorrência limitada; conta erros. */
async function runPool(items, limit, fn) {
  let idx = 0, erros = 0;
  const results = new Array(items.length);
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      try { results[i] = await fn(items[i], i); }
      catch (e) { erros++; results[i] = { __erro: e?.message || String(e) }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return { results, erros };
}

async function cenario(N) {
  const conc = Math.min(N, CONC_MAX);
  const edicaoId = `MC33-LOAD-${randomUUID()}`;
  const dataset = gerarDataset(N);
  const esperado = apurarMenorUnico(dataset);

  const t0 = Date.now();
  const { results, erros } = await runPool(dataset, conc, (l) => addLance(edicaoId, l));
  const tWriteMs = Date.now() - t0;

  const keys = results.filter((r) => typeof r === "string");
  const keysUnicas = new Set(keys).size;

  const tR0 = Date.now();
  const lidos = await getLances(edicaoId);
  const tReadMs = Date.now() - tR0;
  const apurado = apurarMenorUnico(lidos);

  const persistidos = lidos.length;
  const integridade = erros === 0 && persistidos === N && keysUnicas === keys.length;
  const apuracaoOk = !!(apurado && esperado &&
    apurado.menorUnico === esperado.menorUnico && apurado.vencedor === esperado.vencedor);

  // Limpeza: apagar lances de teste e confirmar 0 restantes.
  const sb = getSupabase();
  await sb.from("lances").delete().eq("edicao_id", edicaoId);
  const { count: restante } = await sb.from("lances")
    .select("id", { count: "exact", head: true }).eq("edicao_id", edicaoId);

  return {
    N, conc, tWriteMs, tReadMs,
    throughput: Math.round(N / (tWriteMs / 1000)),
    erros, persistidos,
    keysUnicas: `${keysUnicas}/${keys.length}`,
    integridade, apuracaoOk,
    menorUnico: apurado?.menorUnico ?? null,
    esperadoMenorUnico: esperado?.menorUnico ?? null,
    limpezaRestante: restante,
  };
}

const lista = CENARIOS.length ? CENARIOS : N_DEFAULT;
console.log("[FASE A] cenários:", lista.join(", "), "| concorrência máx:", CONC_MAX);
const tabela = [];
let falhou = false;
for (const N of lista) {
  process.stdout.write(`  → cenário ${N}... `);
  const r = await cenario(N);
  console.log(r.integridade && r.apuracaoOk && r.limpezaRestante === 0 ? "OK" : "FALHA");
  tabela.push(r);
  if (!(r.integridade && r.apuracaoOk && r.limpezaRestante === 0)) falhou = true;
}
console.log("\n[FASE A] RESULTADOS:");
console.table(tabela);
console.log(falhou ? "\n[FASE A] ❌ ALGUM CENÁRIO FALHOU" : "\n[FASE A] ✅ TODOS OS CENÁRIOS OK");
process.exit(falhou ? 1 : 0);
