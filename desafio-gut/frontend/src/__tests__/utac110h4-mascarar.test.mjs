// UTAC110h.4 — o mascarador do FRONTEND (DEBT-031) e os seus dois pontos de uso.
//
// O backend já tinha `_lib/validate.mjs::mascararEndereco`; o browser não tinha nada, e os
// `console.*` de diagnóstico escreviam o endereço COMPLETO. Este ficheiro prova:
//   • a função mascara, devolve `null` no vazio e NÃO inventa forma para o que não é um endereço;
//   • os dois pontos de uso (`ReferralRegistrar`, `PrivyRoot`) e o da `AppContext` usam-na —
//     amarrado por leitura da fonte, para uma edição futura que volte a escrever o endereço cru
//     não passar verde.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mascararEnderecoLog } from "../lib/mascarar.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", ".."); // desafio-gut/frontend
const A = "0x" + "a".repeat(40);
const B = "0x" + "b".repeat(40);

test("mascararEnderecoLog: 0x1234…abcd, null no vazio, e o que não é endereço não vira endereço", () => {
  assert.equal(mascararEnderecoLog(A), "0xaaaa…aaaa");
  assert.equal(mascararEnderecoLog(B), "0xbbbb…bbbb");
  // Um endereço REAL de 40 hex tem de mostrar 6+4 e esconder o meio:
  const real = "0x1234567890abcdef1234567890abcdef12345678";
  assert.equal(mascararEnderecoLog(real), "0x1234…5678");
  assert.doesNotMatch(mascararEnderecoLog(real), /[a-f0-9]{20,}/i, "o miolo não pode aparecer");
  // Vazio → null (não é uma string vazia nem um endereço inventado). É o comportamento do BACKEND
  // (`_lib/validate.mjs::mascararEndereco`), que este helper ESPELHA — os dois lados do sistema têm
  // de concordar no que é «log mascarado».
  for (const v of [null, undefined, ""]) assert.equal(mascararEnderecoLog(v), null, `«${String(v)}» devia dar null`);
  // O que não tem a forma de endereço é reduzido a «0x…» — NUNCA passa inteiro (0/false incluídos,
  // porque `String(0)` não é vazio: é o mesmo critério do backend).
  for (const v of ["0x1234", "texto", 0, false]) assert.equal(mascararEnderecoLog(v), "0x…", `«${String(v)}» devia dar «0x…»`);
  // Bidireccional: a forma mascarada NÃO é um endereço completo (é isso que o teste mede).
  for (const v of [A, real]) assert.doesNotMatch(mascararEnderecoLog(v), /^0x[a-f0-9]{40}$/i);
});

// ── mini-varrimento (as MESMAS regras do guarda do backend, do lado do browser) ────────────────────
// Um `console.*` cujo payload mencione `address`/`endereco` tem de o passar pelo mascarador. As
// excepções são as mesmas do backend: chave de objecto (`x: valor` — o valor é verificado por si),
// rótulo de template literal (`x=`), booleano (`!!x`, `Boolean(x)`) e truncagem (`.slice`/`.length`).
const IDENT = /(\baddress\b|\bendereco\b)/g;

function semStrings(src) {
  return src.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, (m) => {
    const branco = (s) => "·".repeat(s.length);
    if (m[0] !== "`") return branco(m);
    return m.split(/(\$\{(?:[^{}]|\{[^{}]*\})*\})/g).map((p) => (p.startsWith("${") ? p : branco(p))).join("");
  });
}
function violacoes(texto, ficheiro) {
  const out = [];
  const limpo = semStrings(texto.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 "));
  const re = /console\.(?:log|info|warn|error|debug|trace)\s*\(/g;
  let m;
  while ((m = re.exec(limpo))) {
    let i = re.lastIndex - 1, nivel = 0, fim = -1;
    for (; i < limpo.length; i++) {
      if (limpo[i] === "(") nivel++;
      else if (limpo[i] === ")") { nivel--; if (nivel === 0) { fim = i; break; } }
    }
    if (fim < 0) continue;
    const corpo = limpo.slice(re.lastIndex, fim);
    IDENT.lastIndex = 0;
    let t;
    while ((t = IDENT.exec(corpo))) {
      const pos = t.index;
      const antes = corpo.slice(Math.max(0, pos - 60), pos);
      const depois = corpo.slice(pos + t[0].length);
      if (/^\s*:/.test(depois) && !/^\s*::/.test(depois)) continue;   // chave
      if (/^=/.test(depois) && !/^==/.test(depois)) continue;         // rótulo
      if (/mascararEnderecoLog\(\s*[\w.?,[\]' ]*$/.test(antes)) continue;  // mascarado (aceita cadeias: wallet?.address)
      if (/!!\s*[\w.?[\]' ]*$/.test(antes) || /Boolean\(\s*[\w.?[\]' ]*$/.test(antes)) continue; // booleano
      if (/^\s*[\w.?[\]'"]*\.(slice|length|substring|substr)\b/.test(depois.replace(/\?/g, ""))) continue; // truncado
      if (/String\(\s*$/.test(antes) && /^\)\s*\.(slice|length|substring|substr)\b/.test(depois)) continue;
      out.push(`${ficheiro}: «${t[0]}» cru → …${corpo.slice(Math.max(0, pos - 30), pos + t[0].length + 30).replace(/\s+/g, " ")}…`);
    }
  }
  return out;
}

test("os pontos de uso do frontend chamam o mascarador (nenhum escreve o endereço cru)", () => {
  const alvos = [
    "src/components/ReferralRegistrar.jsx",
    "src/PrivyRoot.jsx",
    "src/context/AppContext.jsx",
  ];
  const todas = [];
  for (const rel of alvos) {
    const txt = readFileSync(join(RAIZ, rel), "utf8");
    assert.match(txt, /import \{[^}]*mascararEnderecoLog[^}]*\}/, `${rel} não importa o mascarador`);
    todas.push(...violacoes(txt, rel));
  }
  assert.deepEqual(todas, [], `endereço cru em console.* do browser:\n${todas.join("\n")}`);
  // CONTROL POSITIVO: o varrimento VERIA a forma crua se ela existisse (senão o verde é por cegueira).
  const cru = ['console.info("[x]", { address, message: err })', 'console.warn("[y]", { endereco: endereco })'].join("\n");
  assert.equal(violacoes(cru, "sintetico").length, 2, "o varrimento não vê a forma crua");
});

test("o `beforeSend` do cliente mascara o EVENTO inteiro (choke point do Sentry cliente)", () => {
  // ⚠️ Achado F2/F3 do validador adversarial: o `beforeSend` do `sentryLazy.js` só saneava `argon2id_`.
  // O `CardLance` mandava `tags.wallet = address` completo. Aqui amarra-se o choke point: se alguém
  // voltar a fazer `return event;`, este teste cai.
  const txt = readFileSync(join(RAIZ, "src/lib/sentryLazy.js"), "utf8");
  assert.match(txt, /return mascararEnderecosProfundo\(event\);/,
    "o beforeSend do cliente deixou de mascarar o evento (o endereço volta a sair inteiro para o Sentry)");
  assert.match(txt, /import \{ mascararEnderecosProfundo \}/, "o sentryLazy.js perdeu o import do mascarador");
  // E o wrapper de excepções tem de existir e mascarar o contexto.
  const alertas = readFileSync(join(RAIZ, "src/lib/sentry-alerts.js"), "utf8");
  assert.match(alertas, /extra: mascararEnderecosProfundo\(payload\)/,
    "o `captureAlert` deixou de mascarar o payload do cliente");
  assert.match(alertas, /Sentry\.captureException\(err, mascararEnderecosProfundo\(ctx\)\)/,
    "o `capturarExcecao` deixou de mascarar o contexto");
  // CONTROL POSITIVO: um ficheiro sem o mascaramento NÃO passaria esta verificação.
  assert.doesNotMatch("return event;", /return mascararEnderecosProfundo\(event\);/);
});
