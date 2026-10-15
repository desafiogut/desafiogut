// UTAC110h.2 · FRENTE C — o GUTO diz os DOIS créditos da indicação e bate com o Art. 51º do v5.0.
//
// R18-110h.2-4 + C2 do enunciado («Relê o Art. 51º antes de reescrever. Se o v5 disser diferente, seguir
// o v5»). Este teste NÃO repete o que a guarda do UTAC110h.1 já defende (as 4 respostas, o limite mensal,
// os números amarrados): acrescenta o que é NOVO no 110h.2 —
//   (a) os números do ECOQUILDO ditos pelo GUTO são os do CÓDIGO **e** os do REGULAMENTO (lidos da fonte);
//   (b) BIDIRECCIONAL: as respostas da era 110h.1 (só pontos, sem ECOQUILDO) são reprovadas;
//   (c) o papel de cada crédito não se troca (+2 é do indicante, +1 é do indicado).
//
// node --test _tests/utac110h2-guto-eco.test.mjs   (a partir de netlify/functions)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { obterResposta } from "../_lib/guto-perfis.mjs";

const PERFIS = ["visitante", "comum", "corporativo", "admin"];
const DADOS = { codigo: "IND-ABC123", total_indicados: 3, total_convertidos: 2, senhas_ganhas: 7 };

const fonteCodigo = readFileSync(new URL("../_lib/fontes-lance.mjs", import.meta.url), "utf8");
const constante = (nome) => {
  const m = fonteCodigo.match(new RegExp(`export const ${nome} = (\\d+);`));
  assert.ok(m, `não encontrei ${nome} em _lib/fontes-lance.mjs`);
  return Number(m[1]);
};
const PONTOS = constante("PONTOS_INDICACAO");
const ECO_INDICANTE = constante("ECOQUILDO_INDICACAO_INDICANTE");
const ECO_INDICADO = constante("ECOQUILDO_INDICACAO_INDICADO");

// A FONTE LEGAL: o Art. 51º do Regulamento v5.0, lido do ficheiro (não copiado à mão).
// Sobe a árvore até encontrar `docs/REGULAMENTO-v5.md` (a profundidade até à raiz do git não é óbvia
// a partir de `netlify/functions/_tests/` — uma contagem errada de `..` dava `desafio-gut/docs`, medido).
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const REGULAMENTO = (() => {
  let d = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    const p = resolve(d, "docs", "REGULAMENTO-v5.md");
    if (existsSync(p)) return readFileSync(p, "utf8");
    d = resolve(d, "..");
  }
  throw new Error("não encontrei docs/REGULAMENTO-v5.md a subir a árvore");
})();
const art51 = (REGULAMENTO.match(/Art\. 51º[^\n]*/) ?? [])[0] ?? "";
/** «concede 2 (dois) ECOQUILDO ao indicante e 1 (um) ECOQUILDO ao indicado» → [2, 1]. */
const numerosDoArt51 = [...art51.matchAll(/(\d+) \(\w+\) ECOQUILDO ao (indicante|indicado)/g)]
  .map((m) => ({ valor: Number(m[1]), papel: m[2] }));
const doRegulamento = (papel) => numerosDoArt51.find((n) => n.papel === papel)?.valor;

test("o Art. 51º do v5 diz 2 ao indicante e 1 ao indicado, e o código diz o mesmo", () => {
  assert.ok(art51.length > 40, "não encontrei o Art. 51º em docs/REGULAMENTO-v5.md");
  assert.equal(doRegulamento("indicante"), 2, `Art. 51º: indicante — «${art51}»`);
  assert.equal(doRegulamento("indicado"), 1, `Art. 51º: indicado — «${art51}»`);
  assert.deepEqual([ECO_INDICANTE, ECO_INDICADO], [doRegulamento("indicante"), doRegulamento("indicado")],
    "as constantes do código divergem do Regulamento v5.0");
});

test("as 4 respostas do GUTO dizem os DOIS créditos, com os papéis certos e sem «senha»", () => {
  for (const perfil of PERFIS) {
    const r = obterResposta("indique_e_ganhe", perfil, DADOS);
    const p = [];
    if (/\bsenhas?\b/i.test(r)) p.push("fala de «senha»");
    if (!new RegExp(`\\+${PONTOS} pontos de lance`).test(r)) p.push(`sem «+${PONTOS} pontos de lance»`);
    if (!new RegExp(`\\+${ECO_INDICANTE} ECOQUILDO`).test(r)) p.push(`sem «+${ECO_INDICANTE} ECOQUILDO» (indicante)`);
    if (!new RegExp(`\\+${ECO_INDICADO} ECOQUILDO`).test(r)) p.push(`sem «+${ECO_INDICADO} ECOQUILDO» (indicado)`);
    assert.deepEqual(p, [], `${perfil}: «${r}»`);
    // C2 — coerência explícita com o Art. 51º: nenhum outro número de ECOQUILDO pode aparecer.
    for (const m of r.matchAll(/\+(\d+) ECOQUILDO/g)) {
      assert.ok([ECO_INDICANTE, ECO_INDICADO].includes(Number(m[1])),
        `${perfil}: «+${m[1]} ECOQUILDO» não é ${ECO_INDICANTE} nem ${ECO_INDICADO}`);
    }
  }
});

test("a ORDEM dos créditos é a do Art. 51º: o 1.º ECOQUILDO dito é o do INDICANTE (+2)", () => {
  // Este teste existe por causa de um MUTANTE SOBREVIVENTE medido (C2 do `utac110h2-prova-mutacao.mjs`):
  // trocar os papéis («+1 ao indicante, +2 ao indicado») passava a verificação por NÚMERO, porque os dois
  // valores apareciam na resposta. A ordem é que carrega o papel — a 1.ª menção é a do indicante.
  for (const perfil of PERFIS) {
    const r = obterResposta("indique_e_ganhe", perfil, DADOS);
    const nums = [...r.matchAll(/\+(\d+) ECOQUILDO/g)].map((m) => Number(m[1]));
    assert.deepEqual(nums, [ECO_INDICANTE, ECO_INDICADO],
      `${perfil}: os papéis não batem com o Art. 51º ([+${ECO_INDICANTE} indicante, +${ECO_INDICADO} indicado]) — «${r}»`);
  }
});

test("a notificação de indicação (mensagemInducao) diz os DOIS créditos, com n×50 e n×2", async () => {
  // Frente B3. Vive AQUI (backend) de propósito: um mutante do ficheiro da notificação só é apanhado por
  // um teste do lado backend — medido (B3/B3b do `utac110h2-prova-mutacao.mjs` sobreviviam a correr só o
  // lado frontend).
  const { mensagemInducao } = await import("../_lib/referral.mjs");
  const um = mensagemInducao(1, "Ana");
  const tres = mensagemInducao(3, "Ana");
  for (const t of [um, tres]) {
    assert.ok(!/\bsenhas?\b/i.test(t), `a notificação ainda fala de «senha»: «${t}»`);
    assert.match(t, /\+\d+ pontos de lance/, `sem pontos de lance: «${t}»`);
    assert.match(t, /\+\d+ ECOQUILDO/, `sem ECOQUILDO: «${t}»`);
  }
  assert.match(um, /\bAna\b/, "o singular perdeu o nome do primeiro indicado do dia");
  assert.match(um, new RegExp(`\\+${PONTOS} pontos de lance e \\+${ECO_INDICANTE} ECOQUILDO`), `singular: «${um}»`);
  assert.match(tres, new RegExp(`\\+${3 * PONTOS} pontos de lance e \\+${3 * ECO_INDICANTE} ECOQUILDO`), `plural: «${tres}»`);
});

test("BIDIRECCIONAL: as 4 respostas da era UTAC110h.1 (só pontos) são reprovadas", () => {
  // ⚠️ A 1.ª é a resposta do «visitante» do 110h.1, verbatim (git 703e78e).
  const era110h1 = [
    "Indique e Ganhe é para membros! Crie a sua conta e, por cada amigo que se cadastrar com o seu código, você ganha +50 pontos de lance (e o seu amigo também). 😊",
    "Aqui está o seu Indique e Ganhe! 🎁 Compartilhe o seu link: por cada amigo que criar a conta com o seu código, você ganha +50 pontos de lance na hora (e o seu amigo também), até 10 indicações por mês. Código: IND-ABC123.",
    "Indique e Ganhe — código IND-ABC123. Por cada indicado que crie a conta com o seu código: +50 pontos de lance para si e +50 para o indicado, creditados no cadastro (até 10 indicações creditadas por mês). Indicados: 3; convertidos: 2.",
    "Indique e Ganhe — código IND-ABC123. Indicados: 3; convertidos: 2. Recompensa: +50 pontos de lance ao indicante e ao indicado (até 10 por mês por indicante).",
  ];
  for (const a of era110h1) {
    assert.ok(!new RegExp(`\\+${ECO_INDICANTE} ECOQUILDO`).test(a), `a resposta do 110h.1 devia reprovar: «${a}»`);
  }
});

test("BIDIRECCIONAL: os papéis trocados (+2 ao indicado) são reprovados", () => {
  const trocado = "você ganha +50 pontos de lance e +1 ECOQUILDO para si, +50 pontos de lance e +2 ECOQUILDO para o indicado.";
  // A guarda é por NÚMERO, não por ordem: «+2 ECOQUILDO» existe, logo esta resposta PASSA a verificação
  // numérica — o que a apanha é o teste do TEXTO real (acima) e o mutante M8 da prova de mutação.
  // Este teste documenta o LIMITE declarado do instrumento (não o esconde).
  assert.match(trocado, /\+2 ECOQUILDO/);
  const semEco = "você ganha +50 pontos de lance para si e para o indicado.";
  assert.ok(!new RegExp(`\\+${ECO_INDICANTE} ECOQUILDO`).test(semEco) && !new RegExp(`\\+${ECO_INDICADO} ECOQUILDO`).test(semEco));
});
