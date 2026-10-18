// scripts/utac110j5-prova-mutacao.mjs — UTAC110j.5. Prova de mutação dos testes novos e alterados.
// Cada mutante: confirma que ENTROU (âncora única, md5 muda), corre os testes alvo, exige ≥1 falha, e
// restaura do BACKUP em memória (não do HEAD — o trabalho não está commitado), verificando o md5.
// Uso: node scripts/utac110j5-prova-mutacao.mjs   (a partir da raiz do repo)
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FE = resolve(RAIZ, "desafio-gut", "frontend");
const md5 = (b) => createHash("md5").update(b).digest("hex");
const T = {
  novo: "src/__tests__/utac110j5-pontos-lance.test.mjs",
  d110: "src/__tests__/utac110d-front.test.mjs",
  ativos: "src/pages/__tests__/MeusAtivos.test.mjs",
  e106: "src/pages/__tests__/utac106e-compra-passe.test.mjs",
  voc: "src/__tests__/utac110j-vocabulario-v5.test.mjs",
  gate: "src/__tests__/utac110j3-gate-carteira.test.mjs",
  e110: "src/__tests__/utac110e-front.test.mjs",
  g1: "src/pages/__tests__/utac110g1-carteira-resgate.test.mjs",
  art: "src/components/__tests__/artigosUI.test.mjs",
  miss: "src/__tests__/utac110f-front-missoes.test.mjs",
};

const MUTANTES = [
  ["M1 CardLance ignora o custo (só olha o saldo)", "src/components/CardLance.jsx",
    "isConnected, pontos: pontosLanceLidos?.pontos, valor,", "isConnected, pontos: pontosLanceLidos?.pontos, valor: \"\",", [T.d110]],
  ["M2 CardLance perde a mensagem de saldo_pontos_insuficiente", "src/components/CardLance.jsx",
    "saldo_pontos_insuficiente: mensagemSaldoInsuficiente(data?.error, valorCentavos),", "", [T.d110, T.novo]],
  ["M3 CardLance não mostra o gasto do servidor", "src/components/CardLance.jsx",
    "{!isProgramado && ultimoGasto && (", "{false && ultimoGasto && (", [T.d110]],
  ["M4 CardLance sem o atalho para ganhar pontos", "src/components/CardLance.jsx",
    "(pontosL.estado === \"sem_pontos\" || pontosL.estado === \"insuficiente\") && (", "false && (", [T.d110]],
  ["M5 Carteira mostra a nota da conversão a todos", "src/pages/MinhaCarteira.jsx",
    "{!saldosIlegiveis && (conversao.creditos || conversao.senhas) && (", "{!saldosIlegiveis && (", [T.novo]],
  ["M6 Carteira volta a ler os créditos", "src/pages/MinhaCarteira.jsx",
    "const saldoPontosLance = pontosLance ? pontosLance.pontos : null;", "const saldoPontosLance = pontosLance ? pontosLance.creditos : null;", [T.novo, T.d110, T.gate]],
  ["M7 proporção do Passe 200 → 100", "src/lib/pontosLance.js",
    "passeRelampago: 200,", "passeRelampago: 100,", [T.novo]],
  ["M8 Regras sem o bloco das proporções", "src/pages/RegrasOficiais.jsx",
    "{PROPORCOES_TEXTO.map((bloco) => (", "{[].map((bloco) => (", [T.novo]],
  ["M9 painel sem a linha da conversão", "src/components/meus-ativos/PainelPontosLance.jsx",
    "{ id: \"conversao\", rotulo: \"Conversão do modelo antigo\", n: ganhos.conversao }, // UTAC110j.5", "", [T.novo]],
  ["M10 o gasto do lance volta a ser «Outro»", "src/lib/pontosLance.js",
    "return motivo === MOTIVO_GASTO_LANCE ? \"Lance\" : \"Outro\";", "return \"Outro\";", [T.novo]],
  ["M11 bónus ignora bonusEmitido (nunca há bónus)", "src/pages/MeusAtivos.jsx",
    "else if (bonusEmitido === true) {", "else if (false) {", [T.novo, T.ativos]],
  ["M12 Passe Relâmpago volta a «1 lance»", "src/lib/passes.js",
    "beneficio: \"10 pontos de fidelidade + 200 pontos de lance + 1 ECOQUILDO\",", "beneficio: \"10 pontos + 1 lance no Menor Lance Único\",", [T.d110, T.e106]],
  ["M13 hint do CardLance volta aos créditos", "src/components/CardLance.jsx",
    "\"Cada lance gasta o seu valor em pontos de lance (um lance de 37 gasta 37) · menor lance único vence.\"",
    "\"Cada lance consome 1 crédito de lance (Passe Relâmpago) · menor lance único vence.\"", [T.voc]],
  ["M14 o card volta a chamar-se «creditos»", "src/pages/MinhaCarteira.jsx",
    "<div data-saldo=\"pontos-lance\" style={{", "<div data-saldo=\"creditos\" style={{", [T.e110, T.g1, T.miss]],
  ["M15 proporção cita o artigo errado (18º → 9º)", "src/lib/pontosLance.js",
    "à razão de 1 ponto = R$ 0,01 (Art. 18º).", "à razão de 1 ponto = R$ 0,01 (Art. 9º).", [T.art]],
  // SEG5 — sobreviventes do validador. VM2..VM6, V1 fechados; VM1 e VM3 fechados em 2026-10-18
  // por decisão do operador (R16: mutante sobrevivente é lacuna de teste).
  ["VM1 nota da conversão SEM a guarda de leitura", "src/pages/MinhaCarteira.jsx",
    "{!saldosIlegiveis && (conversao.creditos || conversao.senhas) && (", "{!saldosIlegiveis && (", [T.novo]],
  ["VM3 linha do custo SEM a guarda de sessão", "src/components/CardLance.jsx",
    "{!isProgramado && isConnected && pontosL.custo !== null && (", "{!isProgramado && pontosL.custo !== null && (", [T.novo]],
  // SEG5 — sobreviventes do validador, agora com teste (os restantes já com teste).
  ["VM2 conversão de senhas conta com delta ≤ 0", "src/lib/pontosLance.js",
    "senhas: ms.some((m) => m.motivo === \"conversao-senhas\" && m.delta > 0),", "senhas: ms.some((m) => m.motivo === \"conversao-senhas\"),", [T.novo]],
  ["VM4 bónus aceita bonusEmitido não-booleano", "src/pages/MeusAtivos.jsx",
    "else if (bonusEmitido === true) {", "else if (bonusEmitido) {", [T.novo]],
  ["VM5 senhas convertidas caem em «Outros»", "src/lib/pontosLance.js",
    "if (CONVERSOES.some((c) => c.motivo === m.motivo)) r.conversao += m.delta;", "if (m.motivo === \"conversao-creditos\") r.conversao += m.delta;", [T.novo]],
  ["VM6 rótulo das senhas convertidas desaparece", "src/lib/pontosLance.js",
    "Object.freeze({ motivo: \"conversao-senhas\", rotulo: \"Senhas antigas convertidas\" }),", "", [T.novo]],
  ["V1 volta a promessa «pelo menos 210»", "src/lib/pontosLance.js",
    "com lances de 1 ponto ficam ${CICLO_LIQUIDO} pontos líquidos (com lances maiores, ficam menos).", "ficam garantidos pelo menos ${CICLO_LIQUIDO} pontos líquidos.", [T.novo]],
];

function correr(testes) {
  const r = spawnSync(process.execPath, ["--test", "--test-concurrency=1", "--test-reporter=tap", ...testes], { cwd: FE, encoding: "utf8", input: "" });
  const out = (r.stdout || "") + (r.stderr || "");
  const m = out.match(/^# fail (\d+)/m);
  const p = out.match(/^# pass (\d+)/m);
  return { fail: m ? Number(m[1]) : null, pass: p ? Number(p[1]) : null };
}

const base = correr(Object.values(T));
if (base.fail !== 0 || !base.pass) { console.error(`BASELINE VERMELHA/NÃO MEDIDA: ${JSON.stringify(base)}`); process.exit(2); }
console.log(`baseline: pass=${base.pass} fail=0`);

let provados = 0;
for (const [nome, rel, de, para, testes] of MUTANTES) {
  const f = resolve(FE, rel);
  const orig = readFileSync(f);
  const s = orig.toString("utf8");
  const n = s.split(de).length - 1;
  if (n !== 1) { console.error(`${nome}: âncora encontrada ${n}× (tem de ser 1)`); process.exit(3); }
  writeFileSync(f, s.replace(de, para));
  try {
    if (md5(readFileSync(f)) === md5(orig)) throw new Error("o mutante não ENTROU");
    const r = correr(testes);
    const ok = r.fail !== null && r.fail > 0;
    console.log(`${ok ? "PROVADO " : "SOBREVIVEU"} ${nome} → fail=${r.fail}`);
    if (ok) provados++;
  } finally {
    writeFileSync(f, orig);
    if (md5(readFileSync(f)) !== md5(orig)) { console.error(`RESTAURO FALHOU: ${rel}`); process.exit(4); }
  }
}
console.log(`${provados}/${MUTANTES.length} PROVADOS · restauro md5 idêntico em todos`);
process.exit(provados === MUTANTES.length ? 0 : 1);
