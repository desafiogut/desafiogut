// UTAC150.2 — sonda do gate 3.7 em PRODUÇÃO (/consentimento).
//
// Porquê: o /consentimento valida o corpo ANTES da sessão e a versão só DEPOIS (UTAC150.1, DEBT-115(e)).
// Sem uma sessão real não se prova o aceite 3.7 no servidor. Esta sonda usa a sessão do PRÓPRIO operador.
//
// ⚠️ Efeito: o passo 2 grava um aceite 3.7 REAL na conta do operador (é o mesmo que aceitar o gate no site).
//
// Como obter o token (nunca o colar em chat, commit ou log):
//   1. Entrar em https://silly-stardust-ca71bc.netlify.app com a conta Google.
//   2. F12 → Consola → copy(JSON.parse(sessionStorage.getItem("gut_auth_user")).token)
//   3. No terminal (Git Bash):  GUT_SESSION='<colar>' node _logs/UTAC150.2_sonda-gate-3.7.mjs
//
// Passos (cada um tem de dar o esperado, senão a sonda pára com exit 1):
//   1. CONTROLO: POST com versao "3.3"  → 400 versao_invalida  (prova que a sessão passou e a versão é verificada;
//      401 = token inválido/expirado → a sonda não prova nada)
//   2. POST com versao "3.7"            → 201 (ou 200 se o mesmo aceite já existir)
//   3. GET ?endereco=                   → o histórico tem um registo termoVersao "3.7" com o aceiteDeclaradoEm do passo 2
//
// Nunca imprime o token nem o endereço completo.

const BASE = process.env.GUT_BASE || "https://silly-stardust-ca71bc.netlify.app";
const URL_C = `${BASE}/.netlify/functions/consentimento`;

let token = (process.env.GUT_SESSION || "").trim();
if (token.startsWith("{")) { try { token = JSON.parse(token).token; } catch { /* segue e falha abaixo */ } }
if (!token || token.split(".").length !== 3) {
  console.error("GUT_SESSION ausente ou não é um JWT (ver o cabeçalho deste ficheiro).");
  process.exit(2);
}

let claims;
try { claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")); }
catch { console.error("Não consegui ler as claims do token."); process.exit(2); }
const endereco = String(claims.endereco || "").toLowerCase();
if (!/^0x[0-9a-f]{40}$/.test(endereco)) { console.error("O token não traz um endereço válido."); process.exit(2); }
if (claims.exp && claims.exp * 1000 < Date.now()) { console.error("Token expirado: voltar a entrar no site."); process.exit(2); }
const mascara = `${endereco.slice(0, 6)}…${endereco.slice(-4)}`;
console.log(`Conta ${mascara} · tipo ${claims.tipo} · alvo ${BASE}`);

const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
const aceitos = { lido: true, maiores: true, termos: true, privacidade: true };
const corpo = (versao, aceiteDeclaradoEm) => JSON.stringify({ endereco, versao, aceitos, aceiteDeclaradoEm });

async function pedir(metodo, url, body) {
  const r = await fetch(url, { method: metodo, headers, body });
  let j = null; try { j = await r.json(); } catch { /* corpo não-JSON */ }
  return { status: r.status, j };
}
// process.exit() com um fetch ainda aberto rebenta o Node no Windows (assert do libuv) — usar exitCode.
class Pare extends Error {}
function falhar(passo, r) {
  console.error(`✗ ${passo}: HTTP ${r.status} ${JSON.stringify(r.j)?.slice(0, 200)}`);
  throw new Pare();
}

async function main() {

// 1. Controlo negativo (não grava nada: 400 antes do registo).
const r1 = await pedir("POST", URL_C, corpo("3.3", new Date().toISOString()));
const cod1 = r1.j?.error?.code || r1.j?.code;
if (r1.status !== 400 || !JSON.stringify(r1.j).includes("versao_invalida")) falhar("1 controlo 3.3", r1);
console.log(`✓ 1 controlo: versão 3.3 recusada (400 ${cod1 ?? "versao_invalida"}) — a sessão passou e a versão é verificada`);

// 2. Aceite 3.7.
const declarado = new Date().toISOString();
const r2 = await pedir("POST", URL_C, corpo("3.7", declarado));
if (r2.status !== 201 && r2.status !== 200) falhar("2 aceite 3.7", r2);
console.log(`✓ 2 aceite 3.7: HTTP ${r2.status} ${JSON.stringify(r2.j)}`);

// 3. Releitura do histórico.
const r3 = await pedir("GET", `${URL_C}?endereco=${endereco}`);
if (r3.status !== 200) falhar("3 releitura", r3);
const hist = r3.j?.historico || [];
const achado = hist.find((h) => h.termoVersao === "3.7" && h.aceiteDeclaradoEm === declarado);
if (!achado) { console.error(`✗ 3 releitura: nenhum registo 3.7 com aceiteDeclaradoEm=${declarado} (${hist.length} registos)`); throw new Pare(); }
console.log(`✓ 3 gravado: termoVersao ${achado.termoVersao} · aceiteEm ${achado.aceiteEm} · contexto ${achado.contexto} · ${hist.length} registos na conta`);
console.log("GATE 3.7 VALIDADO EM PRODUÇÃO");
}

try { await main(); }
catch (e) { if (!(e instanceof Pare)) console.error(`✗ erro: ${e?.message}`); process.exitCode = 1; }
