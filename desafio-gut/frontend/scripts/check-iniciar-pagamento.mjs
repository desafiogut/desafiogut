// Smoke test do iniciar-pagamento.mjs sem Netlify CLI.
// Carrega .env.local, importa a função, invoca com payloads válidos e inválidos.
// Confirma: 200 nos válidos com JWT verificável; 400 nos inválidos com error.code esperado.
//
// Uso: node scripts/check-iniciar-pagamento.mjs

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoFrontend = resolve(__dirname, "..");

// .env.local manual (sem dep nova).
try {
  const env = readFileSync(resolve(repoFrontend, ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const fnUrl  = pathToFileURL(resolve(repoFrontend, "netlify/functions/iniciar-pagamento.mjs")).href;
const jwtUrl = pathToFileURL(resolve(repoFrontend, "netlify/functions/_lib/jwt.mjs")).href;
const { default: iniciar } = await import(fnUrl);
const { verificarPedido }  = await import(jwtUrl);

let failed = false;

async function call(method, body) {
  const init = { method };
  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
    init.headers = { "content-type": "application/json" };
  }
  const res = await iniciar(new Request("http://localhost/iniciar-pagamento", init), {});
  const json = await res.json();
  return { status: res.status, json };
}

function expect(name, cond, detail) {
  if (cond) console.log(`  ✓ ${name}`);
  else { console.error(`  ✗ FAIL ${name}: ${detail}`); failed = true; }
}

// ── Caso feliz ──────────────────────────────────────────────────────────────
console.log("[1] payload válido (5 fichas):");
const ok = await call("POST", { endereco: "0xE1a0F02AC3aaB22946b0D9f33Eb0A8fDAc812a4d", qtd: 5 });
expect("status 200", ok.status === 200, `got ${ok.status}`);
expect("pedidoId é UUID", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ok.json.pedidoId), ok.json.pedidoId);
expect("valorBRL = 10", ok.json.valorBRL === 10, ok.json.valorBRL);
expect("qtd = 5", ok.json.qtd === 5, ok.json.qtd);
expect("qrCodeText presente", typeof ok.json.qrCodeText === "string" && ok.json.qrCodeText.length > 20, ok.json.qrCodeText);
expect("simulated = true (mock)", ok.json.simulated === true, ok.json.simulated);
expect("provider = mock", ok.json.provider === "mock", ok.json.provider);
expect("token presente", typeof ok.json.token === "string", ok.json.token?.slice?.(0, 20));
expect("validUntil futuro", new Date(ok.json.validUntil).getTime() > Date.now(), ok.json.validUntil);

// JWT carrega o payload original
try {
  const decoded = await verificarPedido(ok.json.token);
  expect("jwt.pedidoId === resp.pedidoId", decoded.pedidoId === ok.json.pedidoId, decoded.pedidoId);
  expect("jwt.endereco lowercased", decoded.endereco === "0xe1a0f02ac3aab22946b0d9f33eb0a8fdac812a4d", decoded.endereco);
  expect("jwt.qtd = 5", decoded.qtd === 5, decoded.qtd);
  expect("jwt.valorBRL = 10", decoded.valorBRL === 10, decoded.valorBRL);
} catch (e) {
  expect("jwt verificável", false, e.message);
}

// ── Casos de erro ───────────────────────────────────────────────────────────
const erros = [
  { name: "GET → 405",                req: ["GET",  undefined],                                       status: 405, code: "metodo_invalido" },
  { name: "body vazio → 400",         req: ["POST", undefined],                                       status: 400, code: "body_obrigatorio" },
  { name: "json malformado → 400",    req: ["POST", "{not json"],                                     status: 400, code: "body_invalido" },
  { name: "endereco inválido → 400",  req: ["POST", { endereco: "lixo", qtd: 5 }],                    status: 400, code: "endereco_invalido" },
  { name: "endereco curto → 400",     req: ["POST", { endereco: "0x123", qtd: 5 }],                   status: 400, code: "endereco_invalido" },
  { name: "qtd zero → 400",           req: ["POST", { endereco: "0x" + "a".repeat(40), qtd: 0 }],     status: 400, code: "quantidade_fora_do_limite" },
  { name: "qtd 101 → 400",            req: ["POST", { endereco: "0x" + "a".repeat(40), qtd: 101 }],   status: 400, code: "quantidade_fora_do_limite" },
  { name: "qtd decimal → 400",        req: ["POST", { endereco: "0x" + "a".repeat(40), qtd: 2.5 }],   status: 400, code: "quantidade_invalida" },
];

for (const { name, req, status, code } of erros) {
  console.log(`[err] ${name}:`);
  const r = await call(...req);
  expect(`status ${status}`, r.status === status, `got ${r.status}`);
  expect(`error.code = ${code}`, r.json?.error?.code === code, JSON.stringify(r.json));
}

if (failed) { console.error("\nFAIL"); process.exit(1); }
console.log("\nOK: iniciar-pagamento aprovado em todos os cenários.");
