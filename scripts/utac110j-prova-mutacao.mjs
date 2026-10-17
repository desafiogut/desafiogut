// utac110j-prova-mutacao.mjs — UTAC110j: cada guarda nova tem de MORDER.
// Para cada mutante: backup FORA do repo → aplica (exige exactamente 1 ocorrência) → corre os testes
// → espera VERMELHO → restaura do backup e confere o md5. Restauro também em `process.on("exit")`
// (lição da DEBT-041: um processo morto a meio não pode deixar o mutante no disco).
// Uso: node scripts/utac110j-prova-mutacao.mjs
import { readFileSync, writeFileSync, mkdtempSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(RAIZ, "desafio-gut", "frontend");
const FN = join(FE, "netlify", "functions");
const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");

const TESTES_FE = [
  "src/__tests__/utac110j-vocabulario-v5.test.mjs",
  "src/components/__tests__/artigosUI.test.mjs",
  "src/components/__tests__/citacoesRegulamento.test.mjs",
  "src/__tests__/mc991-ui.test.mjs",
  "src/__tests__/utac107c-deposito.test.mjs",
  "src/components/edicao-especial/__tests__/especial-i18n.test.mjs",
];
const TESTES_FN = ["_tests/utac110h4-grafo.test.mjs"];

const M = [
  ["M1 a mensagem do ramo legado volta a prometer senha", "src/components/CardLance.jsx",
    'export const MSG_PROGRAMADO_LEGADO = "Esta modalidade não está disponível.";',
    'export const MSG_PROGRAMADO_LEGADO = "Lance programado consome 1 senha (R$ 2,00).";', "fe"],
  ["M2 o código do ramo Programado é removido", "src/components/CardLance.jsx",
    'const isProgramado = modalidade === "programado";', "const isProgramado = false;", "fe"],
  ["M3 o depósito volta a perguntar «Quantas senhas?»", "src/components/ComprarFichasModal.jsx",
    "Quanto quer depositar? (em múltiplos de R$ 2,00)", "Quantas senhas?", "fe"],
  ["M4 o comportamento do depósito muda (R$ 1 por unidade)", "src/components/ComprarFichasModal.jsx",
    "const VALOR_POR_SENHA_BRL = 2;", "const VALOR_POR_SENHA_BRL = 1;", "fe"],
  ["M5 as senhas antigas perdem «(on-chain, legado)»", "src/pages/MeusAtivos.jsx",
    "🎫 Senhas antigas (on-chain, legado)", "🎫 Senhas antigas", "fe"],
  ["M6 a exclusão volta a dizer que apaga as senhas", "src/pages/ExcluirConta.jsx",
    "Saldo em R$ e registro off-chain de senhas (legado)", "Saldo em R$ e senhas disponíveis", "fe"],
  ["M7 Configurações volta ao Art. 20 do v4", "src/pages/Configuracoes.jsx",
    '["Art. 6º",     "Passe Desafio: R$ 2,00."],', '["Art. 20",     "Senha: R$ 2,00 por edição."],', "fe"],
  ["M8 o herói volta ao Art. 8 do v4", "src/components/glass/ComingSoonHero.jsx",
    "Menor lance único vence · Art. 14º</p>", "Menor lance único vence · Art. 8</p>", "fe"],
  ["M9 a Carteira volta ao Art. 20", "src/pages/MinhaCarteira.jsx",
    "Passe Desafio: R$ {VALOR_POR_SENHA_BRL.toFixed(2)} (Art. 6º).",
    "Custo de cada senha: R$ {VALOR_POR_SENHA_BRL.toFixed(2)} por edição (Art. 20).", "fe"],
  ["M10 a especial volta a «Prêmio em disputa» (só no fallback)", "src/components/edicao-especial/CardEdicaoEspecial.jsx",
    't("edicao.especial.premioEmDisputa", "Produto em disputa")', 't("edicao.especial.premioEmDisputa", "Prêmio em disputa")', "fe"],
  ["M11 a Privacidade perde a nota do LeilaoGUT", "src/pages/Privacidade.jsx",
    "smart contract LeilaoGUT (nome do contrato on-chain, imutável)", "smart contract LeilaoGUT", "fe"],
  ["M12 o GUTO volta a sugerir «cotas» ao comprador", "src/components/ChatbotWidget.jsx",
    'Pergunte sobre regras, pagamentos, vouchers', 'Pergunte sobre regras, cotas, pagamentos, vouchers', "fe"],
  ["M13 a Vitrine volta a mostrar «Cotas»", "src/pages/Vitrine.jsx",
    '<Info label="Tipo" value={slot.modalidade} small />',
    '<Info label="Cotas" value="1 de 4" />\n        <Info label="Tipo" value={slot.modalidade} small />', "fe"],
  ["M14 DEBT-034: a resposta volta a devolver o indicador", "netlify/functions/referral.mjs",
    "    // UTAC110j (R18-110j-5c · DEBT-034)", "    indicador:  r.indicador,\n    // UTAC110j (R18-110j-5c · DEBT-034)", "fn"],
  // SEG4 — B1, R1 e os mutantes do validador que sobreviviam à 1.ª versão das guardas (R3):
  ["M15 B1: a especial volta a dizer que o lance debita R$", "src/components/edicao-especial/CardEdicaoEspecial.jsx",
    "cada lance consome 1 crédito de lance\")", "a partir de R$ 0,01 (debita do saldo)\")", "fe"],
  ["M16 R1: o rótulo do depósito volta a «(R$)» (o campo conta unidades de R$ 2,00)", "src/components/ComprarFichasModal.jsx",
    "Quanto quer depositar? (em múltiplos de R$ 2,00)", "Quanto quer depositar (R$)?", "fe"],
  ["M17 V: preço da senha citado ao Art. 6º", "src/pages/Configuracoes.jsx",
    '"Passe Desafio: R$ 2,00."', '"Senha: R$ 2,00 por edição."', "fe"],
  ["M18 V: «prêmio» em minúscula", "src/components/edicao-especial/CardEdicaoEspecial.jsx",
    't("edicao.especial.premio", "Produto especial")', 't("edicao.especial.premio", "prêmio especial")', "fe"],
  ["M19 V: «Artigo 25» por extenso", "src/pages/MeusAtivos.jsx",
    "Art. 14º: Menor lance único ganha", "Artigo 25: Apuração automática · Art. 14º: Menor lance único ganha", "fe"],
  ["M20 V: a aresta volta como `indicante` mascarado", "netlify/functions/referral.mjs",
    "    // UTAC110j (R18-110j-5c · DEBT-034)", "    indicante: mascararEndereco(r.indicador),\n    // UTAC110j (R18-110j-5c · DEBT-034)", "fn"],
  ["M21 V: o modal diz que apaga as senhas on-chain", "src/components/ExcluirContaModal.jsx",
    "(saldo em R$, registro off-chain de senhas,", "(saldo em R$, senhas on-chain,", "fe"],
  ["M22 V: «cotas» numa página do comprador (Meus Ativos)", "src/pages/MeusAtivos.jsx",
    "Ficam registradas on-chain (legado).", "Ficam registradas on-chain (legado). Veja também as suas cotas.", "fe"],
  ["M23 V: «converter R$ 2,00 em senha»", "src/components/CardLance.jsx",
    'export const MSG_PROGRAMADO_LEGADO = "Esta modalidade não está disponível.";',
    'export const MSG_PROGRAMADO_LEGADO = "O app vai converter R$ 2,00 em senha.";', "fe"],
];

const backupDir = mkdtempSync(join(tmpdir(), "utac110j-mut-"));
let pendente = null; // { alvo, bak, md5 }
function restaurar() {
  if (!pendente) return;
  copyFileSync(pendente.bak, pendente.alvo);
  const ok = md5(pendente.alvo) === pendente.md5;
  pendente = null;
  if (!ok) { console.error("⛔ RESTAURO FALHOU — md5 diferente"); process.exitCode = 3; }
}
process.on("exit", restaurar);
process.on("SIGINT", () => { restaurar(); process.exit(130); });

function correr(tipo) {
  const [cwd, args] = tipo === "fn"
    ? [FN, ["--test", "--experimental-test-module-mocks", ...TESTES_FN]]
    : [FE, ["--test", ...TESTES_FE]];
  const r = spawnSync(process.execPath, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 300000 });
  const out = (r.stdout || "") + (r.stderr || "");
  const fail = Number((out.match(/ℹ fail (\d+)/) || [])[1]);
  const pass = Number((out.match(/ℹ pass (\d+)/) || [])[1]);
  return { fail, pass };
}

// Baseline tem de estar verde (sem isso a mutação mede nada).
for (const t of ["fe", "fn"]) {
  const b = correr(t);
  if (!(b.fail === 0 && b.pass > 0)) { console.error(`⛔ BASELINE ${t} não está verde (pass=${b.pass} fail=${b.fail})`); process.exit(2); }
  console.log(`baseline ${t}: pass=${b.pass} fail=0`);
}

let provados = 0;
for (const [nome, rel, de, para, tipo] of M) {
  const alvo = join(FE, rel);
  const orig = readFileSync(alvo, "utf8");
  const n = orig.split(de).length - 1;
  if (n !== 1) { console.error(`⛔ ${nome}: âncora encontrada ${n}× (esperado 1)`); process.exitCode = 2; continue; }
  const bak = join(backupDir, rel.replace(/[\\/]/g, "_"));
  copyFileSync(alvo, bak);
  pendente = { alvo, bak, md5: md5(alvo) };
  writeFileSync(alvo, orig.replace(de, () => para));
  if (md5(alvo) === pendente.md5) { console.error(`⛔ ${nome}: o mutante NÃO entrou`); restaurar(); process.exitCode = 2; continue; }
  const r = correr(tipo);
  restaurar();
  const morde = r.fail > 0;
  if (morde) provados++;
  console.log(`${morde ? "PROVADO " : "SOBREVIVEU"}  ${nome}  (fail=${r.fail})`);
}
console.log(`\n${provados}/${M.length} PROVADOS · backups em ${backupDir}`);
if (provados !== M.length) process.exitCode = process.exitCode || 1;
