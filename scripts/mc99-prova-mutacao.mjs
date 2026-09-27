// MC99 — instrumento preservado (estava em _tmp/mc99/, movido para scripts/ na limpeza
// final). Uso: node scripts/mc99-prova-mutacao.mjs
// MC99 — prova de mutação (HARD GATE 5 / R16). Regras:
//  · cada mutação tem de ENTRAR (verificado por leitura ANTES de medir o resultado);
//  · cada mutação tem de dar RED nos guardas do MC99;
//  · restaurar por SNAPSHOT BINÁRIO (não por substituições inversas) + md5 idêntico.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const R = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FE = resolve(R, "desafio-gut", "frontend");
const abs = (p) => resolve(FE, p);
const md5 = (p) => createHash("md5").update(readFileSync(abs(p))).digest("hex");
// ⚠️ Os .jsx do projecto são CRLF. As mutações de VÁRIAS LINHAS têm de casar: por isso
// a leitura normaliza para LF e a escrita repõe CRLF. Sem isto, o `replace` multi-linha
// não casa e a mutação «não altera nada» (um falso «não entrou», que se leria como
// guarda boa).
const LER = (p) => readFileSync(abs(p), "utf8").replace(/\r\n/g, "\n");
const ESCREVER = (p, s) => writeFileSync(abs(p), s.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n"), "utf8");

const ALVOS_TESTE = ["src/pages/__tests__/mc99-limpeza-ui.test.mjs"];
const PROTEGIDOS = [
  "src/pages/Dashboard.jsx",
  "src/widgets/layout/BottomNav.jsx",
  "src/pages/MinhaCarteira.jsx",
  "src/components/PainelIndicacao.jsx",
  "src/pages/MercadoLances.jsx",
  "src/pages/SejaNossoParceiro.jsx",
  "src/pages/Vitrine.jsx",
];
const SNAP = new Map(PROTEGIDOS.map((p) => [p, readFileSync(abs(p))]));
const ANTES = Object.fromEntries(PROTEGIDOS.map((p) => [p, md5(p)]));
const restaurar = () => { for (const [p, b] of SNAP) writeFileSync(abs(p), b); };

function suite() {
  const r = spawnSync("node", ["--test", "--test-concurrency=1", ...ALVOS_TESTE],
    { cwd: FE, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const falhas = [...new Set([...out.matchAll(/^✖ (.+?) \(\d/gm)].map((m) => m[1].trim()))];
  const n = {};
  for (const m of out.matchAll(/^ℹ (tests|pass|fail) (\d+)$/gm)) n[m[1]] = Number(m[2]);
  return { exit: r.status, falhas, ...n };
}

// cada mutação: aplica (substituição que TEM de casar) + verifica que entrou
const M = [
  { id: "MUT1", nome: "SEG0 — voltar a empilhar Outras Edições (grid)",
    f: "src/pages/Dashboard.jsx",
    apl: (s) => s.replace('data-testid="outras-edicoes-scroll"', 'data-testid="outras-edicoes-scroll-off"')
                  .replace('overflowX: "auto"', 'overflowX: "hidden"').replace('display: "flex",\n              gap: innerGap,', 'display: "grid",\n              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(240px, 1fr))",'),
    entrou: (s) => /overflowX: "hidden"/.test(s) || /repeat\(auto-fit, minmax\(240px/.test(s) },
  { id: "MUT2", nome: "SEG1 — voltar à ordem antiga da barra inferior",
    f: "src/widgets/layout/BottomNav.jsx",
    apl: (s) => s.replace(`  { path: "/carteira", label: "Carteira", Icon: IconWallet,    end: false, ariaLabel: "Ir para Minha Carteira" },
  { path: "/mercado",  label: "Lances",   Icon: IconTarget,    end: false, ariaLabel: "Ir para Mercado de Lances" },`,
                       `  { path: "/mercado",  label: "Lances",   Icon: IconTarget,    end: false, ariaLabel: "Ir para Mercado de Lances" },
  { path: "/carteira", label: "Carteira", Icon: IconWallet,    end: false, ariaLabel: "Ir para Minha Carteira" },`),
    entrou: (s) => /path: "\/mercado",  label: "Lances"[\s\S]{0,200}path: "\/carteira"/.test(s) },
  { id: "MUT3", nome: "SEG2 — reintroduzir um card removido (Saldo de Senhas)",
    f: "src/pages/MinhaCarteira.jsx",
    apl: (s) => s.replace("          <GlassCard className={`${cardCls} ${isMobile ? 'mb-5' : 'mb-6'}`}>",
      `          <GlassCard><h3>🔗 Saldo de Senhas</h3></GlassCard>
          <GlassCard className={\`\${cardCls} \${isMobile ? 'mb-5' : 'mb-6'}\`}>`),
    entrou: (s) => (s.match(/<GlassCard/g) || []).length === 3 },
  { id: "MUT4", nome: "SEG2 — voltar a pôr vidro próprio no cartão de saldo",
    f: "src/pages/MinhaCarteira.jsx",
    apl: (s) => s.replace("          <GlassCard className={`${cardCls} ${isMobile ? 'mb-5' : 'mb-6'}`}>",
      `          <GlassCard className={\`\${cardCls} \${isMobile ? 'mb-5' : 'mb-6'}\`} style={{
              borderColor: "rgba(245,166,35,0.32)",
              background: "linear-gradient(180deg, rgba(10,16,42,0.6), rgba(245,166,35,0.06))",
            }}>`),
    entrou: (s) => /linear-gradient\(180deg, rgba\(10,16,42,0\.6\)/.test(s) },
  { id: "MUT5", nome: "SEG2.3 — voltar a pôr o rótulo «MC10 · Growth»",
    f: "src/components/PainelIndicacao.jsx",
    apl: (s) => s.replace("<h3 style={tituloStyle}>🎁 Indique e Ganhe</h3>\n      </div>",
      `<h3 style={tituloStyle}>🎁 Indique e Ganhe</h3>
        <span style={{ fontSize: "0.62rem" }}>MC10 · Growth</span>
      </div>`),
    entrou: (s) => /MC10 · Growth/.test(s) },
  { id: "MUT6", nome: "SEG3.1 — voltar a pôr o banner nos Lances",
    f: "src/pages/MercadoLances.jsx",
    apl: (s) => s.replace('        {/* ── Grid principal ── */}',
      `        <BannerCard clienteId="x" formato="app" />
        {/* ── Grid principal ── */}`),
    entrou: (s) => /<BannerCard/.test(s) },
  { id: "MUT7", nome: "SEG3.2 — tirar o vidro de UM dos dois heroes",
    f: "src/pages/SejaNossoParceiro.jsx",
    apl: (s) => s.replace('        <motion.header\n          className="gut-glass-standard"\n          style={{\n            textAlign: "center",\n            padding: isMobile ? "1.5rem 1rem" : "2.5rem 2rem",',
      '        <motion.header\n          style={{\n            textAlign: "center",\n            padding: isMobile ? "1.5rem 1rem" : "2.5rem 2rem",'),
    entrou: (s) => (s.match(/className="gut-glass-standard"/g) || []).length === 4 }, // eram 5
  { id: "MUT8", nome: "SEG4 — voltar a pôr o rodapé técnico na Vitrine",
    f: "src/pages/Vitrine.jsx",
    apl: (s) => s.replace('      {/* MC99 (SEG4) — rodapé TÉCNICO removido.',
      `      <footer>Vitrine em modo informativo · Pipeline de lance em /mercado (Edição R-1, validada em produção).</footer>
      {/* MC99 (SEG4) — rodapé TÉCNICO removido.`),
    entrou: (s) => /Pipeline de lance/.test(s) },
];

let todasOk = true;
const linhas = [];
console.log(`baseline: ${JSON.stringify(suite())}\n`);

for (const m of M) {
  const original = LER(m.f);
  const mutado = m.apl(original);
  if (mutado === original) { console.error(`ABORTA ${m.id}: a mutação não alterou nada`); process.exit(1); }
  ESCREVER(m.f, mutado);
  const entrou = m.entrou(LER(m.f));                 // ← confirmar ANTES de ler o resultado
  const r = entrou ? suite() : { exit: null, falhas: [], nota: "mutante NAO entrou" };
  const red = r.exit !== 0, ok = entrou && red;
  todasOk = todasOk && ok;
  console.log(`${m.id} — ${m.nome}`);
  console.log(`  entrou=${entrou ? "SIM" : "NAO"}  ${red ? "RED (exit " + r.exit + ")" : "VERDE (!)"}  ${ok ? "PROVADO" : "NAO PROVADO"}`);
  console.log(`  matou: ${r.falhas.length ? r.falhas.join(" | ") : "(nenhum)"}`);
  if (r.tests !== undefined) console.log(`  suite: tests=${r.tests} pass=${r.pass} fail=${r.fail}`);
  linhas.push({ ...m, entrou, red, ok, falhas: r.falhas, tests: r.tests, pass: r.pass, fail: r.fail });
  restaurar();
}

console.log("\n=== RESTAURAÇÃO (snapshot binário) ===");
let restaurado = true;
for (const p of PROTEGIDOS) {
  const igual = md5(p) === ANTES[p];
  restaurado = restaurado && igual;
  console.log(`  ${igual ? "IDÊNTICO " : "DIFERENTE"}  ${p}  ${md5(p)}`);
}
const rf = suite();
console.log(`\nsuite após restaurar: ${rf.exit === 0 ? "VERDE" : "VERMELHO"} (tests=${rf.tests} pass=${rf.pass} fail=${rf.fail})`);
const sucesso = todasOk && restaurado && rf.exit === 0;
console.log(`\nMC99 SEG2-mutação: ${sucesso ? `${M.length} MUTACOES PROVADAS + RESTAURACAO EXACTA` : "FALHOU"}`);
writeFileSync(resolve(R, "_logs/MC99_PROVA-MUTACAO.txt"),
  linhas.map((l) => `${l.id} ${l.nome}\n  entrou=${l.entrou} red=${l.red} provado=${l.ok}\n  matou: ${l.falhas.join(" | ")}\n  suite: tests=${l.tests} pass=${l.pass} fail=${l.fail}`).join("\n\n")
  + `\n\nrestauracao_md5_identica=${restaurado}\nfinal=${rf.exit === 0 ? "VERDE" : "VERMELHO"} tests=${rf.tests} pass=${rf.pass} fail=${rf.fail}\n`);
process.exit(sucesso ? 0 : 1);
