// utac107c-deposito.test.mjs — UTAC107c, frente B (pendência escalada pelo UTAC107b).
//
// O UTAC107b tirou o botão «Trocar R$ 2,00 → 1 Senha» da Carteira, mas a mensagem de SUCESSO do
// depósito PIX (`ComprarFichasModal.jsx:547`) continuava a mandar o utilizador «usar Trocar R$
// por Senhas na carteira» — um botão que já não existe. O texto passa a dizer o que o app faz:
// no Lance Programado, o `CardLance` converte R$ 2,00 em 1 senha sozinho (`CardLance.jsx:416`).
// R18-D do UTAC107c: o comentário JSX da l. 490, com a mesma instrução, também foi actualizado.
//
// ⚠️ O ecrã de sucesso só aparece depois de um PIX aprovado (estado interno do modal), por isso a
// prova é sobre a FONTE — com os comentários retirados, para que a frase nova conte só se for
// TEXTO renderizável (lição do MC99: um guarda que lê comentários mede a menção, não o uso).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ler = (p) => readFileSync(resolve(RAIZ, p), "utf8");

/** Mesmo stripper do `mc99-limpeza-ui.test.mjs`: fora comentários JSX, blocos e `//`. */
function codigo(src) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1"))
    .filter((l) => !/^\s*\*/.test(l))
    .join("\n");
}

const FRASE_NOVA = "Para o Lance Programado, o app converte R$ 2,00 em 1 senha automaticamente.";

test("controlo positivo: o stripper apaga a frase quando ela está só num comentário", () => {
  const so_comentario = `{/* ${FRASE_NOVA} */}\n<p>outra coisa</p>`;
  assert.ok(!codigo(so_comentario).includes(FRASE_NOVA), "o stripper deixou passar um comentário");
  assert.ok(codigo(`<p>${FRASE_NOVA}</p>`).includes(FRASE_NOVA), "o stripper apagou texto real");
});

test("o sucesso do depósito diz a frase nova, como TEXTO (não em comentário)", () => {
  const modal = codigo(ler("src/components/ComprarFichasModal.jsx"));
  assert.ok(modal.includes(FRASE_NOVA), "a frase nova não está no texto do modal");
  // e está no bloco de SUCESSO (depois do «PIX aprovado» / antes do botão Fechar)
  const i = modal.indexOf(FRASE_NOVA);
  const fechar = modal.indexOf("fecharComSucesso}", i);
  assert.ok(fechar > i, "a frase nova não está no ecrã de sucesso (antes do «Fechar»)");
});

test("a instrução obsoleta «Trocar R$ por Senhas» desapareceu do ficheiro inteiro (incl. comentários)", () => {
  const cru = ler("src/components/ComprarFichasModal.jsx");
  assert.doesNotMatch(cru, /Trocar R\$ por Senhas/, "a instrução obsoleta continua no modal");
});

test("coerência: o CardLance faz mesmo a conversão automática que o texto promete", () => {
  const card = codigo(ler("src/components/CardLance.jsx"));
  assert.match(card, /o app converte R\$ 2,00 do saldo automaticamente/,
    "o CardLance deixou de dizer que converte R$ 2,00 sozinho — o texto do depósito ficaria a mentir");
});
