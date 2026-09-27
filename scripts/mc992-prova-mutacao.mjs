// MC99.2 — instrumento preservado (estava em _tmp992/, movido para scripts/ no fecho).
// Uso: node scripts/mc992-prova-mutacao.mjs
// MC99.2 — prova de mutação (HARD GATE 7/8). Cada mutação tem de ENTRAR (lido do ficheiro
// ANTES de medir) e dar RED. Restauração por snapshot binário + md5 idêntico.
// ⚠️ netlify.toml é LF; os .js do frontend são CRLF — normalizar ao ler, repor ao escrever.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const R = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FE = `${R}/desafio-gut/frontend`;
const TESTE = "src/__tests__/mc992-conexao.test.mjs";
const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");
const LER = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const ESC = (p, s) => writeFileSync(p, s.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n"), "utf8");

const TOML = `${R}/netlify.toml`;
const SB = `${FE}/src/lib/supabaseClient.js`;
const RT = `${FE}/src/hooks/useRealtimeConfig.js`;

const M = [
  { id: "M1", nome: "SEG0 — tirar o *.supabase.co do connect-src", f: TOML,
    apl: (s) => s.replace("connect-src 'self' https://*.supabase.co wss://*.supabase.co ", "connect-src 'self' "),
    entrou: (s) => !s.includes("https://*.supabase.co") },
  { id: "M2", nome: "SEG0/HARD GATE 4 — abrir o CSP TODO (wildcard generico)", f: TOML,
    apl: (s) => s.replace("connect-src 'self' https://*.supabase.co", "connect-src * https://*.supabase.co"),
    entrou: (s) => /connect-src \* /.test(s) },
  { id: "M3", nome: "SEG1 — voltar ao cache do VALOR (a janela que criava 2 clientes)", f: SB,
    apl: (s) => s.replace(`  if (!_promessa) {
    _promessa = import("@supabase/supabase-js")
      .then(({ createClient }) =>
        createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { auth: { persistSession: false, autoRefreshToken: false } }
        )
      )
      // Falha do import/create NÃO pode envenenar o singleton para sempre: solta a
      // promessa para que a próxima chamada possa tentar de novo.
      .catch((err) => { _promessa = null; throw err; });
  }
  return _promessa;`,
      `  const { createClient } = await import("@supabase/supabase-js");
  return createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {});`),
    entrou: (s) => !s.includes("if (!_promessa)") && s.includes("await import(\"@supabase/supabase-js\")") },
  { id: "M4", nome: "SEG2 — tirar o await da remocao do canal", f: RT,
    apl: (s) => s.replace("await sb?.removeChannel(c);", "sb?.removeChannel(c);"),
    entrou: (s) => s.includes("sb?.removeChannel(c);") && !s.includes("await sb?.removeChannel(c);") },
  { id: "M5", nome: "SEG2 — inverter a ordem (.subscribe antes de .on)", f: RT,    apl: (s) => s.replace(`        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "config_remota", filter: \`chave=eq.\${chave}\` },
          (payload) => {
            const valor = payload?.new?.valor;
            if (valor !== undefined && !cancelado) cbRef.current?.(valor);
          }
        )
        .subscribe((status) => {`,
      `        .subscribe((status) => {`).replace(`        });
      canalAberto();`, `        })
        .on("postgres_changes", { event: "*", schema: "public", table: "config_remota" }, (payload) => {
          if (!cancelado) cbRef.current?.(payload?.new?.valor);
        });
      canalAberto();`),
    // ⚠️ 10.ª vez hoje: a 1.ª versão media o ficheiro CRU e o comentário do `limparCanal`
    // nomeia «.on() depois do .subscribe()» — dando «não entrou» a um mutante que entrou.
    // Mede-se sobre CÓDIGO.
    entrou: (s) => {
      const cod = s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "")
        .split("\n").map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).filter((l) => !/^\s*\*/.test(l)).join("\n");
      const iSub = cod.indexOf(".subscribe("), iOn = cod.indexOf(".on(");
      return iSub > -1 && iOn > -1 && iSub < iOn;
    } },
];

const PROTS = [...new Set(M.map((m) => m.f))];
const SNAP = new Map(PROTS.map((p) => [p, readFileSync(p)]));
const ANTES = Object.fromEntries(PROTS.map((p) => [p, md5(p)]));
const restaurar = () => { for (const [p, b] of SNAP) writeFileSync(p, b); };
const suite = () => {
  const r = spawnSync("node", ["--test", "--test-concurrency=1", TESTE],
    { cwd: FE, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  return { exit: r.status, falhas: [...new Set([...out.matchAll(/^✖ (.+?) \(\d/gm)].map((m) => m[1].trim()))] };
};

console.log(`baseline: ${JSON.stringify(suite())}\n`);
let todas = true;
const linhas = [];
for (const m of M) {
  const orig = LER(m.f);
  const mut = m.apl(orig);
  if (mut === orig) { console.error(`ABORTA ${m.id}: mutação não alterou nada`); process.exit(1); }
  ESC(m.f, mut);
  const entrou = m.entrou(LER(m.f));
  const r = entrou ? suite() : { exit: null, falhas: [], nota: "nao entrou" };
  const red = r.exit !== 0, ok = entrou && red;
  todas = todas && ok;
  console.log(`${m.id} — ${m.nome}`);
  console.log(`  entrou=${entrou ? "SIM" : "NAO"}  ${red ? `RED (exit ${r.exit})` : "VERDE (!)"}  ${ok ? "PROVADO" : "NAO PROVADO"}`);
  console.log(`  matou: ${r.falhas.length ? r.falhas.join(" | ") : "(nenhum)"}`);
  linhas.push({ ...m, entrou, red, ok, falhas: r.falhas });
  restaurar();
}
console.log("\n=== RESTAURACAO ===");
let exacto = true;
for (const p of PROTS) { const i = md5(p) === ANTES[p]; exacto = exacto && i; console.log(`  ${i ? "IDENTICO " : "DIFERENTE"} ${p.replace(R, "").replace(/\\/g, "/")} ${md5(p)}`); }
const rf = suite();
console.log(`\nsuite apos restaurar: ${rf.exit === 0 ? "VERDE" : "VERMELHO"} ${JSON.stringify(rf)}`);
const ok = todas && exacto && rf.exit === 0;
console.log(`\nMC99.2 mutacao: ${ok ? `${M.length} MUTACOES PROVADAS + RESTAURACAO EXACTA` : "FALHOU"}`);
writeFileSync(`${R}/_logs/MC99.2_PROVA-MUTACAO.txt`,
  linhas.map((l) => `${l.id} ${l.nome}\n  entrou=${l.entrou} red=${l.red} provado=${l.ok}\n  matou: ${l.falhas.join(" | ")}`).join("\n\n")
  + `\n\nrestauracao_md5_identica=${exacto}\nfinal=${rf.exit === 0 ? "VERDE" : "VERMELHO"}\n`);
process.exit(ok ? 0 : 1);
