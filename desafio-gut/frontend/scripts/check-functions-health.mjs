// Smoke-test direto do health.mjs sem depender do Netlify CLI.
// Carrega .env.local para popular process.env (mesmo que `netlify dev` faria).
// Importa health.mjs, invoca, valida estrutura da resposta.
//
// Uso: node scripts/check-functions-health.mjs
// Retorna exit 0 se ok=true e env esperadas estão "set"; exit 1 caso contrário.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoFrontend = resolve(__dirname, "..");

// Carrega .env.local manualmente (sem dotenv para evitar dep nova).
try {
  const env = readFileSync(resolve(repoFrontend, ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  console.warn("aviso: .env.local não encontrado — env vars devem estar no shell");
}

// Importa a função e invoca como o Netlify runtime faria.
const healthUrl = pathToFileURL(resolve(repoFrontend, "netlify/functions/health.mjs")).href;
const { default: health } = await import(healthUrl);

const req = new Request("http://localhost/.netlify/functions/health");
const res = await health(req, {});
const body = await res.json();

console.log(JSON.stringify(body, null, 2));

let failed = false;
if (res.status !== 200) { console.error("FAIL: status != 200"); failed = true; }
if (body.ok !== true)   { console.error("FAIL: ok != true");   failed = true; }
if (!body.timestamp)    { console.error("FAIL: timestamp ausente"); failed = true; }
if (!body.node)         { console.error("FAIL: node ausente"); failed = true; }

// Em prod (Netlify Dashboard) todas devem estar "set". Localmente, JWT_SECRET
// e RPC_URL ficam em .env.local; COORDENACAO_PRIVATE_KEY é opcional até B.3.
const obrigatorias = ["JWT_SECRET", "RPC_URL"];
for (const k of obrigatorias) {
  if (body.env?.[k] !== "set") { console.error(`FAIL: env.${k} = ${body.env?.[k]}`); failed = true; }
}

if (failed) process.exit(1);
console.log("OK: health responde 200, env mínima configurada.");
