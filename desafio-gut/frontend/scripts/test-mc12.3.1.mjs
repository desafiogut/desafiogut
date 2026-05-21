#!/usr/bin/env node
// test-mc12.3.1.mjs — 6 checks para MC12.3.1 (cadastro direto sem email-OTP).
import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC  = path.join(ROOT, "src");
const NET  = path.join(ROOT, "netlify", "functions");
const DIST = path.join(ROOT, "dist", "assets");

let passed = 0;
let failed = 0;

function check(n, label, fn) {
  try {
    const ok = fn();
    if (ok) { console.log(`✅ ${n}. ${label}`); passed++; }
    else    { console.log(`❌ ${n}. ${label}`); failed++; }
  } catch (e) {
    console.log(`❌ ${n}. ${label} — ERRO: ${e.message}`);
    failed++;
  }
}

// 1. Build verde.
check(1, "Build verde (dist/index.html existe)", () => {
  return fs.existsSync(path.join(ROOT, "dist", "index.html"))
      && fs.existsSync(DIST);
});

// 2. Zero TDZ no bundle (proxy para "console limpo no boot").
check(2, "Zero TDZ no bundle minificado", () => {
  if (!fs.existsSync(DIST)) return false;
  const files = fs.readdirSync(DIST).filter(f => f.endsWith(".js"));
  for (const f of files) {
    const txt = fs.readFileSync(path.join(DIST, f), "utf8");
    if (txt.includes("Cannot access") || txt.includes("before initialization")) {
      return false;
    }
  }
  return true;
});

// 3. SejaNossoParceiro NÃO chama login() nem importa usePrivy/useWallets
//    (cadastro direto sem modal email-OTP).
check(3, "SejaNossoParceiro: sem chamada login() nem useEffect[authenticated]", () => {
  const src = fs.readFileSync(path.join(SRC, "pages/SejaNossoParceiro.jsx"), "utf8");
  const noComments = src.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  return !/\bawait\s+login\s*\(/.test(noComments)
      && !/usePrivy/.test(noComments)
      && !/useWallets/.test(noComments)
      && !/useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[^}]*authenticated/.test(noComments);
});

// 4. handleSubmit chama POST register-corporativo direto (sem aguardar login).
check(4, "SejaNossoParceiro: POST register-corporativo dentro do handleSubmit", () => {
  const src = fs.readFileSync(path.join(SRC, "pages/SejaNossoParceiro.jsx"), "utf8");
  // captura o bloco do handleSubmit e checa se contém o POST
  const m = src.match(/const\s+handleSubmit\s*=\s*async[\s\S]*?^  \};/m);
  if (!m) return false;
  return /action=register-corporativo/.test(m[0]) && /method:\s*"POST"/.test(m[0]);
});

// 5. cotas.mjs torna accessToken e endereco OPCIONAIS em register-corporativo.
check(5, "cotas.mjs: accessToken e endereco opcionais (cliente_id = cnpj: se ausente)", () => {
  const src = fs.readFileSync(path.join(NET, "cotas.mjs"), "utf8");
  // não pode mais ter o guard original 401 token_invalido com "obrigatório"
  const hasOptionalToken = /accessToken\s*&&\s*\(typeof\s+accessToken/.test(src);
  const hasOptionalEndereco = /if\s*\(enderecoRaw\)\s*\{[\s\S]*?validarEndereco/.test(src);
  const hasPseudoId = /clienteId\s*=\s*endereco\s*\?\?\s*`cnpj:/.test(src);
  return hasOptionalToken && hasOptionalEndereco && hasPseudoId;
});

// 6. UI de sucesso (state `sucesso`) renderiza após cadastro concluído.
check(6, "SejaNossoParceiro: UI de sucesso (state `sucesso`) renderiza pós-cadastro", () => {
  const src = fs.readFileSync(path.join(SRC, "pages/SejaNossoParceiro.jsx"), "utf8");
  return /\[sucesso,\s*setSucesso\]\s*=\s*useState/.test(src)
      && /Cadastro corporativo realizado/.test(src);
});

console.log(`\n${passed}/${passed + failed} OK`);
process.exit(failed === 0 ? 0 : 1);
