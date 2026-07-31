// MC88.16 (P1) — o caminho do PIX não pode alcançar o ethers por import ESTÁTICO.
//
// PORQUÊ ESTE TESTE EXISTE: `iniciar-pagamento` importava `gravarMetaPedido` de
// `_lib/credito.mjs`, que importava `_lib/contract.mjs`, que importa `ethers`. Como
// os imports ESM são hoisted e avaliados de forma eager, gerar um QR Code PIX —
// que nunca toca na blockchain — pagava a avaliação do ethers em cada cold start:
// `Duration: 2062 ms`, contra ~70 ms no caminho quente (medido no MC88.15).
//
// A regressão é silenciosa: um `import` inocente em qualquer módulo da cadeia
// devolve o ethers ao bundle e ninguém repara, porque tudo continua a funcionar —
// só fica lento. Este teste percorre o grafo de imports estáticos e falha nesse caso.
//
// Um `await import("./contract.mjs")` DENTRO de uma função é permitido: é
// exactamente a correcção do P1, e não é avaliado no arranque.
//
// node --test _tests/mc8816-pix-sem-ethers.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const FUNCTIONS = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Só ligações ESTÁTICAS: `import ... from "x"`, `import "x"` (side-effect) e
// `export ... from "x"` (re-export, que é a forma que credito.mjs usa). Um
// `await import("x")` NÃO é apanhado de propósito — é a forma lazy, que é o objectivo.
//
// A classe é `[^;'"]` e não `[\s\S]`: com `[\s\S]*?` o grupo atravessava linhas e ia
// buscar o ` from ` do import SEGUINTE, o que fazia os imports de side-effect
// (`import "./contract.mjs";`) passarem em silêncio. Apanhado por mutação — a
// primeira versão deste teste passava mesmo com o ethers de volta no grafo.
const RE_IMPORT_ESTATICO = /^\s*(?:import|export)\s+(?:[^;'"]*?\s+from\s+)?["']([^"']+)["']/gm;

/**
 * Percorre o grafo de imports estáticos a partir de `entrada` e devolve
 * { modulos, cadeiaAteEthers }.
 */
function grafoEstatico(entrada) {
  const vistos = new Set();
  const pilha = [{ ficheiro: entrada, cadeia: [entrada] }];
  let cadeiaAteEthers = null;

  while (pilha.length) {
    const { ficheiro, cadeia } = pilha.pop();
    if (vistos.has(ficheiro)) continue;
    vistos.add(ficheiro);

    let src;
    try { src = readFileSync(ficheiro, "utf8"); } catch { continue; }

    for (const m of src.matchAll(RE_IMPORT_ESTATICO)) {
      const spec = m[1];

      if (spec === "ethers" || spec.startsWith("ethers/")) {
        cadeiaAteEthers ??= [...cadeia, "ethers"];
        continue;
      }
      // Pacotes (não relativos) não são percorridos — só nos interessa o nosso código.
      if (!spec.startsWith(".")) continue;

      const alvo = resolve(dirname(ficheiro), spec);
      if (existsSync(alvo)) pilha.push({ ficheiro: alvo, cadeia: [...cadeia, spec] });
    }
  }
  return { modulos: vistos, cadeiaAteEthers };
}

const rel = (p) => p.replace(FUNCTIONS, "").replace(/\\/g, "/");

for (const fn of ["iniciar-pagamento.mjs", "iniciar-cota.mjs"]) {
  test(`${fn} não alcança o ethers por import estático`, () => {
    const { cadeiaAteEthers } = grafoEstatico(resolve(FUNCTIONS, fn));
    assert.equal(
      cadeiaAteEthers, null,
      `${fn} volta a arrastar o ethers para o cold start.\n  cadeia: ` +
      `${(cadeiaAteEthers || []).map(rel).join(" → ")}\n` +
      `  Se precisar do contrato, use \`await import("./contract.mjs")\` dentro da função.`,
    );
  });
}

test("_lib/meta.mjs mantém-se livre de ethers/contract/signer", () => {
  const { modulos, cadeiaAteEthers } = grafoEstatico(resolve(FUNCTIONS, "_lib/meta.mjs"));
  assert.equal(cadeiaAteEthers, null, "meta.mjs passou a arrastar o ethers");
  for (const proibido of ["contract.mjs", "signer.mjs"]) {
    assert.ok(
      ![...modulos].some((m) => m.endsWith(proibido)),
      `meta.mjs não pode importar ${proibido} — é esse acoplamento que o P1 desfez`,
    );
  }
});

test("credito.mjs carrega contract.mjs sob demanda, não no topo", () => {
  const src = readFileSync(resolve(FUNCTIONS, "_lib/credito.mjs"), "utf8");
  assert.ok(
    /await\s+import\(\s*["']\.\/contract\.mjs["']\s*\)/.test(src),
    "credito.mjs devia carregar contract.mjs com await import() dentro da função",
  );
  const estaticos = [...src.matchAll(RE_IMPORT_ESTATICO)].map((m) => m[1]);
  assert.ok(
    !estaticos.includes("./contract.mjs"),
    "credito.mjs voltou a importar contract.mjs estaticamente — anula o P1",
  );
});

test("o webhook também não paga ethers só para ler metadados", () => {
  // O webhook lê `lerMetaPedido`; creditar é feito por saldoRs.mjs. Se voltar a
  // apanhar o ethers no arranque, o P1 regrediu por outra porta.
  const { cadeiaAteEthers } = grafoEstatico(resolve(FUNCTIONS, "webhook-mercadopago.mjs"));
  assert.equal(
    cadeiaAteEthers, null,
    `webhook-mercadopago volta a arrastar o ethers:\n  ${(cadeiaAteEthers || []).map(rel).join(" → ")}`,
  );
});
