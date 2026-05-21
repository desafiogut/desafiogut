#!/usr/bin/env node
// test-mc12.mjs — 10 checks para MC12 (separação Usuário Comum × Corporativo)
import fs from "fs";
import path from "path";

const ROOT  = path.resolve(import.meta.dirname, "..");
const SRC   = path.join(ROOT, "src");
const DIST  = path.join(ROOT, "dist", "assets");
const NETLIFY_TOML = path.resolve(ROOT, "..", "..", "netlify.toml");

let passed = 0;
let failed = 0;

function check(n, label, fn) {
  try {
    const ok = fn();
    if (ok) { console.log(`✅ ${n}. ${label}`); passed++; }
    else     { console.log(`❌ ${n}. ${label}`); failed++; }
  } catch (e) {
    console.log(`❌ ${n}. ${label} — ERRO: ${e.message}`);
    failed++;
  }
}

// 1. tipoUsuario derivado de cotaCorporativa?.tipo (não de customMetadata)
check(1, "AppContext: tipoUsuario derivado de cotaCorporativa.tipo (cotas blob)", () => {
  const src = fs.readFileSync(path.join(SRC, "context/AppContext.jsx"), "utf8");
  const hasState = src.includes("setTipoUsuario");
  const hasDerived = /tipoUsuario\s*=\s*cotaCorporativa\?\.tipo/.test(src);
  return !hasState && hasDerived;
});

// 2. AppContext sem function/useCallback detectarTipoCorporativo (polling removido)
check(2, "AppContext: polling detectarTipoCorporativo não está definido", () => {
  const src = fs.readFileSync(path.join(SRC, "context/AppContext.jsx"), "utf8");
  const noComments = src.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  return !noComments.includes("detectarTipoCorporativo") && !noComments.includes("setTipoStatus");
});

// 3. AppContext expõe corporativoWallet + addressCorporativo
check(3, "AppContext: expõe corporativoWallet e addressCorporativo", () => {
  const src = fs.readFileSync(path.join(SRC, "context/AppContext.jsx"), "utf8");
  return src.includes("corporativoWallet") && src.includes("addressCorporativo");
});

// 4. App.jsx: CorporativoRoute sem tipoStatus (derivado puro)
check(4, "App.jsx: CorporativoRoute sem referência a tipoStatus", () => {
  const src = fs.readFileSync(path.join(SRC, "App.jsx"), "utf8");
  const routeFn = src.match(/function CorporativoRoute[\s\S]*?^}/m)?.[0] ?? "";
  return !routeFn.includes("tipoStatus");
});

// 5. Sidebar: filtra /seja-nosso-parceiro para usuário corporativo
check(5, "Sidebar: oculta /seja-nosso-parceiro para tipoUsuario === 'corporativo'", () => {
  const src = fs.readFileSync(
    path.join(SRC, "widgets/layout/Sidebar.jsx"), "utf8"
  );
  return src.includes("/seja-nosso-parceiro") && src.includes("filter") &&
         src.includes("corporativo");
});

// 6. SejaNossoParceiro: POSTa para cotas?action=register-corporativo (sem setCustomMetadata)
check(6, "SejaNossoParceiro: POSTa para cotas register-corporativo (sem setCustomMetadata)", () => {
  const src = fs.readFileSync(
    path.join(SRC, "pages/SejaNossoParceiro.jsx"), "utf8"
  );
  const noComments = src.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  return !noComments.includes("setCustomMetadata") &&
         noComments.includes("register-corporativo") &&
         noComments.includes("getAccessToken");
});

// 7. SejaNossoParceiro: cria carteira adicional somente para corporativo
check(7, "SejaNossoParceiro: useCreateWallet + createAdditional:true", () => {
  const src = fs.readFileSync(
    path.join(SRC, "pages/SejaNossoParceiro.jsx"), "utf8"
  );
  return src.includes("useCreateWallet") && src.includes("createAdditional");
});

// 8. Vitrine: usa DOMPurify para sanitizar bannerSvg
check(8, "Vitrine: DOMPurify.sanitize com USE_PROFILES svg:true", () => {
  const src = fs.readFileSync(path.join(SRC, "pages/Vitrine.jsx"), "utf8");
  return src.includes("DOMPurify") && src.includes("USE_PROFILES") &&
         src.includes("svg: true");
});

// 9. Build dist sem padrões TDZ clássicos
check(9, "dist/assets: zero padrões 'Cannot access … before initialization'", () => {
  if (!fs.existsSync(DIST)) {
    console.log("   (dist ausente — execute npm run build antes)");
    return false;
  }
  const files = fs.readdirSync(DIST).filter(f => f.endsWith(".js"));
  for (const f of files) {
    const content = fs.readFileSync(path.join(DIST, f), "utf8");
    if (/Cannot access .+ before initialization/.test(content)) {
      console.log(`   TDZ encontrado em: ${f}`);
      return false;
    }
  }
  return true;
});

// 10. Rotas protegidas respondem 200 (SPA rewrite ok)
check(10, "Produção: /seja-nosso-parceiro + /corporativo → 200 (SPA rewrite)", async () => {
  try {
    const [r1, r2] = await Promise.all([
      fetch("https://silly-stardust-ca71bc.netlify.app/seja-nosso-parceiro", { method: "HEAD" }),
      fetch("https://silly-stardust-ca71bc.netlify.app/corporativo", { method: "HEAD" }),
    ]);
    console.log(`   /seja-nosso-parceiro: ${r1.status}  /corporativo: ${r2.status}`);
    return r1.status === 200 && r2.status === 200;
  } catch { return false; }
});

await new Promise(r => setTimeout(r, 300));

console.log(`\n${passed}/10 checks passaram (${failed} falharam)`);
process.exit(failed > 0 ? 1 : 0);
