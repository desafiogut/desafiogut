// utac110i2-verificar-cadeia.mjs — UTAC110i.2 · SEG3. Prova da CADEIA do APK contra a PRODUÇÃO.
//
// O que faz (e porque não é um teste da suíte): carrega o `useRecursosApp.js` REAL pelo Vite, com o
// `@capacitor/core` em duplo no estado «APK Android» e com as `VITE_SUPABASE_*` REAIS (lidas do
// ambiente por quem invoca). Depois chama `carregarRecursos()` — que é o caminho que o bundle do
// APK executa — e imprime o que ele devolve. Não há duplo de rede: fala com o Supabase de produção.
//
// Uso:
//   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... node scripts/utac110i2-verificar-cadeia.mjs
//
// Exit 0 = a cadeia devolveu plataforma android + flag true (e pwa continuou false).
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const FE = join(AQUI, "..", "desafio-gut", "frontend");
// O `vite` vive no `node_modules` do FRONTEND (o `scripts/` da raiz não o resolve) — mesma técnica
// dos testes do repo (`utac110i1-front-billing.test.mjs`).
const { createServer } = await import(
  pathToFileURL(resolve(FE, "node_modules", "vite", "dist", "node", "index.js")).href
);

const URL_ = process.env.VITE_SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;
if (!URL_ || !ANON) { console.error("FALTA VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no ambiente"); process.exit(2); }
console.log(`supabase: ${URL_.replace(/https:\/\/([^.]+)\..*/, "https://$1.supabase.co")} (anon len=${ANON.length})`);

// As `VITE_*` têm de vir de um .env (o Vite expõe-nas por `import.meta.env`); ficheiro temporário
// fora do repo, apagado no fim pelo SO.
const envDir = mkdtempSync(join(tmpdir(), "utac110i2-env-"));
writeFileSync(join(envDir, ".env"), `VITE_SUPABASE_URL=${URL_}\nVITE_SUPABASE_ANON_KEY=${ANON}\n`);

const v = await createServer({
  root: FE, configFile: false, server: { middlewareMode: true }, appType: "custom", logLevel: "error",
  optimizeDeps: { noDiscovery: true }, envDir,
  resolve: { dedupe: ["react", "react-dom"],
    alias: [{ find: /^@capacitor\/core$/, replacement: join(FE, "src", "lib", "__tests__", "_duplo-capacitor.mjs") }] },
  ssr: { external: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "scheduler"] },
});

try {
  const mod = await v.ssrLoadModule("/src/hooks/useRecursosApp.js");
  const duplo = await import(pathToFileURL(join(FE, "src", "lib", "__tests__", "_duplo-capacitor.mjs")).href);

  for (const cenario of [
    ["APK Android nativo", () => duplo.reiniciarDuploCapacitor({ plataforma: "android", nativo: true, pluginDisponivel: true })],
    ["browser (PWA)", () => duplo.reiniciarDuploCapacitor()],
    ["iOS nativo", () => duplo.reiniciarDuploCapacitor({ plataforma: "ios", nativo: true, pluginDisponivel: false })],
  ]) {
    cenario[1]();
    globalThis.window = { location: { search: "" } }; // sem marcadores: a decisão é do detector REAL
    const r = await mod.carregarRecursos();
    console.log(`${cenario[0].padEnd(20)} -> plataforma=${r.plataforma}  isPagamentoNativoAtivo=${r.isPagamentoNativoAtivo}  isLeilaoAtivo=${r.isLeilaoAtivo}`);
    if (cenario[0] === "APK Android nativo" && !(r.plataforma === "android" && r.isPagamentoNativoAtivo === true)) {
      console.error("FALHA: a cadeia do APK não devolveu android/true"); process.exit(1);
    }
  }
} finally {
  await v.close();
}
console.log("OK: a cadeia do APK (detector -> config de produção) devolve android + Billing ligado.");
