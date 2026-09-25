// mc945-dry-run.script.mjs — MC94.5 / HARD GATE 8: o ENSAIO antes do dia real.
//
// ⚠️ NÃO é um teste (não termina em *.test.mjs): é um ENSAIO executável, para correr
// à mão e ler a saída. Fica em `_tests/` (fora do bundle de functions) e usa o
// `executarTick` do próprio módulo — ou seja, exercita a lógica REAL, não uma cópia.
//
// Nada aqui escreve em produção: o store, o cliente de dados e o envio são FAKES
// em memória, e o marcador vive num Map deste processo.
//
// Correr:
//   cd desafio-gut/frontend/netlify/functions
//   node _tests/mc945-dry-run.script.mjs

import {
  EDICAO, ALVO_ISO, CORTE_TESTADORES_ISO, TIPO, MENSAGEM,
  CHAVE_MARCADOR, STORE_MARCADOR, executarTick,
} from "../scheduled-anuncio-especial.mjs";

// ── Fakes (em memória; nenhum toca em produção) ──────────────────────────────
function storeMem(inicial = {}) {
  const mem = new Map(Object.entries(inicial));
  return {
    mem,
    async get(k, { type } = {}) { const v = mem.get(k); if (v === undefined) return null; return type === "json" ? JSON.parse(v) : v; },
    async setJSON(k, o) { mem.set(k, JSON.stringify(o)); },
  };
}

/** O público de ensaio: endereços fictícios, gerados (sem contar hex à mão).
 *  ⚠️ Em LINHAS-OBJECTO (`{ endereco }`), como o Supabase devolve — a 1.ª versão
 *  passava strings soltas e o público saía VAZIO, o que fazia o ensaio parecer
 *  aprovado sem provar nada. Um fake com a forma errada mede o vazio. */
const PUBLICO_ENSAIO = [1, 2, 3].map((n) => ({
  endereco: "0x" + String(n).repeat(40),
}));
function sbFake(linhas) {
  return { from: () => ({ select: () => ({ lte: async () => ({ data: linhas, error: null }) }) }) };
}
const envios = [];
const notificarFake = async (endereco, notif) => { envios.push({ endereco, notif }); return true; };

const emBrasilia = (iso) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) + " (Brasília)";

const linha = "─".repeat(74);
console.log(linha);
console.log("MC94.5 — ENSAIO DO ANÚNCIO DO GUTO (HARD GATE 8)");
console.log(linha);
console.log(`Edição          : ${EDICAO}`);
console.log(`Alvo do envio   : ${ALVO_ISO}  =  ${emBrasilia(ALVO_ISO)}`);
console.log(`Corte do público: ${CORTE_TESTADORES_ISO}  =  ${emBrasilia(CORTE_TESTADORES_ISO)}`);
console.log(`Tipo da notif.  : ${TIPO}`);
console.log(`Mensagem        : ${MENSAGEM}`);
console.log(linha);

// ── 1. Relógio REAL: não pode disparar ───────────────────────────────────────
const agoraReal = Date.now();
const store1 = storeMem();
const r1 = await executarTick({ agoraMs: agoraReal, store: store1, sb: sbFake(PUBLICO_ENSAIO), notificar: notificarFake });
console.log("1) RELÓGIO REAL (hoje)");
console.log(`   agora = ${new Date(agoraReal).toISOString()}  =  ${emBrasilia(new Date(agoraReal).toISOString())}`);
console.log(`   veredicto = ${JSON.stringify(r1)}`);
console.log(`   envios = ${envios.length}  |  marcador gravado = ${store1.mem.has(CHAVE_MARCADOR)}`);
console.log(`   ${r1.acao === "sem_disparo" ? "✅ não dispara hoje — correcto" : "❌ DISPAROU FORA DA DATA"}`);
console.log(linha);

// ── 2. Relógio SIMULADO no alvo + ensaio: calcula e não escreve ──────────────
const store2 = storeMem();
const enviosAntes = envios.length;
const r2 = await executarTick({ agoraMs: Date.parse(ALVO_ISO), store: store2, sb: sbFake(PUBLICO_ENSAIO), notificar: notificarFake, dryRun: true });
console.log("2) RELÓGIO SIMULADO NO ALVO, em MODO ENSAIO");
console.log(`   veredicto = ${JSON.stringify(r2)}`);
console.log(`   envios novos = ${envios.length - enviosAntes}  |  marcador gravado = ${store2.mem.has(CHAVE_MARCADOR)}`);
const ensaioOk = r2.acao === "ensaio" && envios.length === enviosAntes && !store2.mem.has(CHAVE_MARCADOR);
// Um público VAZIO faria isto passar sem provar nada: exige-se que o cenário de ensaio
// tenha gente. É a diferença entre um verde e um verde com significado.
const temGente = r2.total === PUBLICO_ENSAIO.length && r2.total > 0;
console.log(`   ${ensaioOk && temGente ? "✅ diria a " + r2.total + " endereço(s) e não escreveu nada" : "❌ ensaio inválido (escreveu, ou público vazio: " + r2.total + ")"}`);
console.log(linha);

// ── 3. Relógio SIMULADO no alvo, a sério: só mostra QUEM receberia ───────────
const store3 = storeMem();
const enviosAntes3 = envios.length;
const r3 = await executarTick({ agoraMs: Date.parse(ALVO_ISO), store: store3, sb: sbFake(PUBLICO_ENSAIO), notificar: notificarFake });
console.log("3) RELÓGIO SIMULADO NO ALVO, sem ensaio — sobre FAKES em memória");
console.log(`   veredicto = ${JSON.stringify(r3)}`);
console.log("   destinatários:");
for (const e of envios.slice(enviosAntes3)) {
  console.log(`     - ${e.endereco}   tipo=${e.notif.tipo}  edicao=${e.notif.edicaoId}`);
}
console.log(`   marcador = ${store3.mem.get(CHAVE_MARCADOR) || "(nenhum)"}`);
console.log(linha);

// ── 4. Segunda passagem: idempotência ───────────────────────────────────────
const r4 = await executarTick({ agoraMs: Date.parse(ALVO_ISO) + 300_000, store: store3, sb: sbFake(PUBLICO_ENSAIO), notificar: notificarFake });
const enviosAgora = envios.length - enviosAntes3;
console.log("4) SEGUNDA PASSAGEM no mesmo dia (o cron corre de 5 em 5 min)");
console.log(`   veredicto = ${JSON.stringify(r4)}`);
console.log(`   envios acumulados = ${enviosAgora} (esperado: ${PUBLICO_ENSAIO.length})`);
console.log(`   ${r4.motivo === "ja_enviado" && enviosAgora === PUBLICO_ENSAIO.length ? "✅ não repetiu — uma única vez" : "❌ repetiu!"}`);
console.log(linha);
console.log("NOTA: este ensaio usa fakes em memória. NÃO escreveu no Blob real, NÃO leu o");
console.log("      Supabase e NÃO notificou ninguém. O que ele prova é a LÓGICA do tick.");
