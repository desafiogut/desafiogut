// UTAC137-SEG3 (validador adversarial) — duas guardas que o UTAC137 não tinha.
//
// 1. O 7640ff8 passou o app ao Regulamento v6.0 importando `docs/REGULAMENTO-v6.md?raw`, mas o ficheiro
//    ficou POR VERSIONAR: num clone limpo (CI: `npm run build` e os testes) dava ENOENT. Guarda: todo o
//    `docs/*.md?raw` importado por `src/` está no índice do git.
// 2. O `usePalpite` traduzia QUALQUER 409 do `registar-palpite` por «Você precisa ter comprado um Passe
//    para palpitar» — texto visível que contradiz o v6 (palpite gratuito) e que aparecia quando a edição
//    fechava ou já estava apurada. Guarda: cada código 409 do servidor tem mensagem própria e nenhuma
//    fala em Passe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { mensagemErroPalpite } from "../lib/palpite.js";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(AQUI, "..");
const FRONT = resolve(SRC, "..");
const RAIZ = resolve(FRONT, "..", "..");

function fontes(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (n !== "__tests__") fontes(p, out); }
    else if (/\.(jsx?|mjs)$/.test(n) && !/\.test\./.test(n)) out.push(p);
  }
  return out;
}

test("SEG3 · todo o docs/*?raw importado por src/ está versionado no git", () => {
  const importados = new Set();
  for (const f of fontes(SRC)) {
    for (const m of readFileSync(f, "utf8").matchAll(/^import\s+\w+\s+from\s+"([^"]+\.md)\?raw"/gm)) {
      importados.add(relative(RAIZ, resolve(dirname(f), m[1])).split("\\").join("/"));
    }
  }
  assert.ok(importados.has("docs/REGULAMENTO-v6.md"), `RegrasOficiais deixou de importar o v6: ${[...importados]}`);
  const versionados = new Set(
    execFileSync("git", ["ls-files", "--", ...importados], { cwd: RAIZ, encoding: "utf8" }).split(/\r?\n/).filter(Boolean),
  );
  const fora = [...importados].filter((p) => !versionados.has(p));
  assert.deepEqual(fora, [], `importado com ?raw mas fora do git (clone limpo dá ENOENT): ${fora.join(", ")}`);
});

test("SEG3 · cada 409 do registar-palpite tem mensagem própria e nenhuma pede Passe", () => {
  const back = readFileSync(resolve(FRONT, "netlify", "functions", "registar-palpite.mjs"), "utf8");
  const codigos = [...back.matchAll(/jsonError\(409,\s*"([a-z_]+)"/g)].map((m) => m[1]);
  assert.ok(codigos.length >= 3, `esperava vários códigos 409 no backend, li ${codigos}`);
  const generica = mensagemErroPalpite(409, "codigo_que_nao_existe");
  for (const c of codigos) {
    const msg = mensagemErroPalpite(409, c);
    assert.doesNotMatch(msg, /passe/i, `409 ${c} ainda pede Passe: «${msg}»`);
    assert.notEqual(msg, generica, `409 ${c} cai na mensagem genérica`);
  }
  assert.doesNotMatch(generica, /passe/i);
  for (const s of [400, 401, 404, 500, 502, 503]) assert.doesNotMatch(mensagemErroPalpite(s, "sem_passe"), /passe/i);
});

test("SEG3 · o usePalpite usa mensagemErroPalpite com o código do servidor (não um mapa por status)", () => {
  const hook = readFileSync(resolve(SRC, "hooks", "usePalpite.js"), "utf8");
  assert.match(hook, /mensagemErroPalpite\(status,\s*data\?\.error\?\.code\)/);
  const codigo = hook.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  assert.doesNotMatch(codigo, /comprado um Passe/);
});
