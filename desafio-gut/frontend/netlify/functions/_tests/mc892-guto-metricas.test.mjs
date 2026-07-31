// MC89.2 — intents de leitura de métricas do GUTO ADM.
//
// PORQUÊ ESTE TESTE EXISTE: o GUTO e o painel "Visão Geral" mostram os MESMOS
// números, a partir da MESMA função. Se divergissem, era o B4 do MC88.41 outra
// vez — a mesma coisa a dizer valores diferentes em ecrãs diferentes.
// E há um risco novo, próprio deste MC: cinco padrões acrescentados a um
// roteador que já tinha 12 podem ROUBAR frases que já funcionavam.
//
// node --test --experimental-test-module-mocks _tests/mc892-guto-metricas.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { detectarIntent, MAPA_METRICAS } from "../chatbot.mjs";
import { obterResposta } from "../_lib/guto-perfis.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const ler = (rel) => readFileSync(resolve(AQUI, "..", rel), "utf8");

const INTENTS = ["metricas_usuarios", "metricas_financeiro", "metricas_fila", "metricas_eoa", "metricas_geral"];

// ─────────────────────────────────────────────────────────────────────────────
// 1. Encaminhamento
// ─────────────────────────────────────────────────────────────────────────────

test("as perguntas de métricas caem nos intents novos", () => {
  const casos = [
    ["quantos utilizadores com atividade?", "metricas_usuarios"],
    ["quantos usuarios ativos",             "metricas_usuarios"],
    ["quantas pessoas cadastradas",         "metricas_usuarios"],
    ["qual o saldo em circulacao?",         "metricas_financeiro"],
    ["quanto ja foi creditado",             "metricas_financeiro"],
    ["total de creditos",                   "metricas_financeiro"],
    ["tamanho da fila",                     "metricas_fila"],
    ["como esta a fila",                    "metricas_fila"],
    ["quantos pedidos na fila",             "metricas_fila"],
    ["saldo da coordenadora",               "metricas_eoa"],
    ["tem gas na carteira coordenadora?",   "metricas_eoa"],
    ["resumo do sistema",                   "metricas_geral"],
    ["status do sistema",                   "metricas_geral"],
    ["visao geral da plataforma",           "metricas_geral"],
    ["painel de controle",                  "metricas_geral"],
  ];
  for (const [frase, esperado] of casos) {
    assert.equal(detectarIntent(frase), esperado, `"${frase}"`);
  }
});

test("⚠️ os 12 intents que já existiam NÃO foram roubados", () => {
  // Esta é a asserção que importa mais neste ficheiro. Cinco padrões novos num
  // roteador sequencial são cinco oportunidades de partir o que funcionava.
  // Casos escolhidos por SEREM os que quase colidiram:
  //   "metricas" e "pulso"      → pulso_edicao já casava \bmetric[ao]s\b
  //   "estatisticas"            → auditoria já casava estatisticas?
  //   "meu saldo"               → colide com "saldo em circulacao" sem o "meu"
  //   "quanto custam as cotas"  → colide com "quanto ja foi creditado"
  const casos = [
    ["metricas",                   "pulso_edicao"],
    ["pulso",                      "pulso_edicao"],
    ["como esta a edicao",         "pulso_edicao"],
    ["desempenho da edicao",       "pulso_edicao"],
    ["estatisticas",               "auditoria"],
    ["auditoria",                  "auditoria"],
    ["estatisticas de indicacoes", "relatorio_indicacoes"],
    ["meu saldo",                  "meu_saldo"],
    ["minhas senhas",              "meu_saldo"],
    ["quanto custam as cotas",     "pacotes_cotas"],
    ["volume de lances",           "dados_mercado"],
    ["quem ganha agora",           "simular_vencedor"],
    ["lista as edicoes",           "listar_edicoes"],
    ["encerra RELAMP-2",           "encerrar_edicao"],
    ["panic",                      "panic"],
    ["como falo com voces",        "suporte"],
  ];
  for (const [frase, esperado] of casos) {
    assert.equal(detectarIntent(frase), esperado,
      `"${frase}" era ${esperado} e passou a ser outra coisa`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Nenhum número escapa para quem não é admin
// ─────────────────────────────────────────────────────────────────────────────

test("perfis não-admin não recebem número nenhum", () => {
  const dadosReais = {
    utilizadores: 5, financeiro: { saldoTotalCentavos: 975, creditadoCentavos: 4400, creditos: 18, creditosJanela: 8 },
    cotas: { total: 7, comCarteira: 5, vendidas: 0 }, fila: { pendentes: 0, falhadas: 0, total: 5, porEstado: { done: 5 } },
    saldoEth: "0.123456", eoa: "0x" + "f".repeat(40), bloco: 23456789, janelaDias: 30,
  };
  for (const intent of INTENTS) {
    for (const perfil of ["visitante", "comum", "corporativo"]) {
      // Mesmo que o call-site passasse dados por engano, a resposta do perfil
      // não os usa: a tabela declarativa é a fronteira.
      const r = obterResposta(intent, perfil, dadosReais);
      assert.doesNotMatch(r, /\d{3,}/, `${intent}/${perfil} vazou um número: ${r}`);
      assert.doesNotMatch(r, /0x[0-9a-f]{6}/i, `${intent}/${perfil} vazou um endereço`);
    }
  }
});

test("o admin recebe os números, e o tom é de relatório (sem emojis)", () => {
  const emoji = /\p{Extended_Pictographic}/u;
  const r = obterResposta("metricas_geral", "admin", {
    utilizadores: 5,
    financeiro: { saldoTotalCentavos: 975, creditadoCentavos: 4400, creditos: 18, creditosJanela: 8 },
    cotas: { total: 7, comCarteira: 5, vendidas: 0 },
    fila: { pendentes: 0, falhadas: 0 },
    parciais: null,
  });
  assert.match(r, /5/);
  assert.match(r, /R\$ 9\.75/, "975 centavos têm de sair como R$ 9.75");
  assert.match(r, /R\$ 44\.00/);
  assert.ok(!emoji.test(r), "o perfil admin é relatório: sem emojis (MC15.5 §D3)");
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Honestidade — a razão de ser do painel
// ─────────────────────────────────────────────────────────────────────────────

test('fonte em baixo diz "indisponível", NUNCA zero', () => {
  // O agregador devolve null + `parciais`; a resposta tem de o dizer. Um
  // "R$ 0,00" ou um "0 utilizadores" inventado faria alguém agir sobre um
  // número que ninguém mediu.
  const semDados = { utilizadores: null, financeiro: null, cotas: null, fila: null, parciais: "cotas, saldo_rs" };
  for (const intent of ["metricas_usuarios", "metricas_financeiro", "metricas_fila"]) {
    const r = obterResposta(intent, "admin", semDados);
    assert.match(r, /indispon/i, `${intent} não avisou que a fonte está em baixo: ${r}`);
    assert.doesNotMatch(r, /\bR\$ 0\.00\b/, `${intent} inventou um zero`);
  }
  const g = obterResposta("metricas_geral", "admin", semDados);
  assert.match(g, /Fontes em baixo: cotas, saldo_rs/, "o resumo tem de nomear as fontes em falha");
});

test("saldo da EOA não lido aparece como não-lido, não como 0 ETH", () => {
  const r = obterResposta("metricas_eoa", "admin", { eoa: "0x" + "a".repeat(40), saldoEth: null, bloco: null, parciais: ["saldo"] });
  assert.match(r, /indisponivel/i);
  assert.doesNotMatch(r, /\b0(\.0+)? ETH\b/, "um 0 ETH manda alguém abastecer uma carteira cheia");
  assert.match(r, /credita as senhas/, "a resposta tem de dizer porque é que este saldo importa");
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Uma fonte por número
// ─────────────────────────────────────────────────────────────────────────────

test("o GUTO e o painel leem da MESMA função", () => {
  const chatbot = ler("chatbot.mjs");
  const stats   = ler("admin-stats.mjs");
  assert.match(chatbot, /_lib\/admin-metricas\.mjs/,
    "o GUTO tem de usar a mesma agregação do painel, não uma consulta própria");
  assert.match(stats, /_lib\/admin-metricas\.mjs/);
  // E o saldo da EOA também: dois cálculos do mesmo saldo é o defeito que o
  // MC88.43 passou um MC a eliminar noutro domínio.
  assert.match(ler("admin-onchain.mjs"), /obterSaldoEoa/,
    "o endpoint on-chain tem de usar a leitura partilhada, não a sua própria cópia");
});

test("as métricas continuam sem arrastar ethers", () => {
  const semComentarios = (s) => s.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  for (const rel of ["_lib/admin-metricas.mjs", "admin-stats.mjs", "admin-onchain.mjs"]) {
    assert.doesNotMatch(semComentarios(ler(rel)), /from\s+["']ethers["']/, `${rel} importa ethers`);
  }
});

test("obterMetricas NÃO vai à rede — o painel não pode pagar o RPC", () => {
  // `obterSaldoEoa` vive no mesmo módulo por partilha, mas `obterMetricas` não a
  // chama: importar o módulo não custa uma chamada de rede. Se um dia alguém a
  // meter lá dentro, o painel passa a pagar o RPC em cada leitura.
  const src = ler("_lib/admin-metricas.mjs");
  const corpo = src.slice(src.indexOf("export async function obterMetricas"));
  assert.doesNotMatch(corpo, /obterSaldoEoa|eth_getBalance/,
    "obterMetricas passou a ler a cadeia — isso põe o RPC no caminho do painel");
});

test("o que o handler EXTRAI é o que a tabela de respostas LÊ", () => {
  // O defeito que isto apanha e que nenhum outro teste apanharia: o handler
  // extrair `m.utilizadores` (objeto) onde a tabela espera um número, e a
  // resposta sair com "[object Object]" ou "—" para um valor que EXISTE.
  // Por isso corre os extratores REAIS do chatbot.mjs, não uma cópia.
  const metricas = {
    utilizadores: { comAtividade: 5, fontes: { cotas: 7, saldo: 5, creditos: 18, lances: 0 } },
    financeiro: { saldoTotalCentavos: 975, creditadoCentavos: 4400, creditos: 18, creditosJanela: 8 },
    cotas: { total: 7, vendidas: 0, comCarteira: 5 },
    operacao: { fila: { total: 5, porEstado: { done: 5 }, pendentes: 0, falhadas: 0, atualizadaEm: "2026-07-27T00:21:52Z" } },
    janelaDias: 30, geradoEm: new Date().toISOString(), parciais: [],
  };

  const esperado = {
    metricas_usuarios:   [/\b5\b/, /cotas 7/],
    metricas_financeiro: [/R\$ 9\.75/, /R\$ 44\.00/, /18 credito/, /8 nos ultimos 30/],
    metricas_fila:       [/0 pendente/, /5 no total/, /done=5/],
    metricas_geral:      [/\b5\b/, /R\$ 9\.75/, /7 \(5 com carteira/],
  };

  for (const [intent, padroes] of Object.entries(esperado)) {
    const extrair = MAPA_METRICAS[intent];
    assert.ok(extrair, `${intent} desapareceu do MAPA_METRICAS`);
    const r = obterResposta(intent, "admin", extrair(metricas));
    assert.doesNotMatch(r, /\[object Object\]/, `${intent}: extração e tabela desalinhadas`);
    assert.doesNotMatch(r, /undefined|NaN/,      `${intent}: valor mal extraído`);
    for (const p of padroes) {
      assert.match(r, p, `${intent} não trouxe ${p} — resposta: ${r}`);
    }
  }
});

test("com fontes em baixo, o extrator real produz avisos e não zeros", () => {
  // Mesmo caminho, com o agregador degradado. `parciais` tem de chegar à
  // resposta pelo nome — é o que distingue "—" de "medi e deu zero".
  const degradado = {
    utilizadores: null, financeiro: null, cotas: null, operacao: null,
    janelaDias: 30, geradoEm: new Date().toISOString(), parciais: ["cotas", "saldo_rs"],
  };
  for (const intent of Object.keys(MAPA_METRICAS)) {
    const r = obterResposta(intent, "admin", MAPA_METRICAS[intent](degradado));
    assert.match(r, /indispon|em baixo/i, `${intent} não avisou: ${r}`);
    assert.doesNotMatch(r, /\[object Object\]|undefined|NaN/, `${intent}: ${r}`);
  }
});
