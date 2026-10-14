// utac110h1-guto-indicacao.test.mjs — UTAC110h.1 · Frente B: o GUTO deixa de prometer «+1 senha».
//
// Decisão do operador (R18-110h.1-C): o GUTO diz o que o app credita HOJE por indicação —
// +50 pontos de lance ao indicante e ao indicado, até 10 indicações creditadas por mês
// (UTAC110f, `_lib/fontes-lance.mjs`). O ECOQUILDO do Regulamento v5.0 Art. 51º fica pendente
// (não está ligado no backend) — o GUTO não o promete.
//
// BIDIRECCIONAL: o verificador reprova as 4 respostas antigas (verbatim) e aprova as novas.
// Os números do texto são AMARRADOS às constantes do código (lidas da fonte): se o crédito mudar,
// este teste cai antes de o GUTO mentir.
//
// node --test _tests/utac110h1-guto-indicacao.test.mjs   (a partir de netlify/functions)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { obterResposta } from "../_lib/guto-perfis.mjs";

const PERFIS = ["visitante", "comum", "corporativo", "admin"];
const DADOS = { codigo: "IND-ABC123", total_indicados: 3, total_convertidos: 2, senhas_ganhas: 7 };

const fonte = readFileSync(new URL("../_lib/fontes-lance.mjs", import.meta.url), "utf8");
const constante = (nome) => {
  const m = fonte.match(new RegExp(`export const ${nome} = (\\d+);`));
  assert.ok(m, `não encontrei ${nome} em _lib/fontes-lance.mjs`);
  return Number(m[1]);
};
const PONTOS = constante("PONTOS_INDICACAO");
const LIMITE = constante("LIMITE_INDICACOES_MES");

/** Uma resposta de indicação está certa se não fala de senha e promete exactamente o crédito real. */
function problemas(txt) {
  const p = [];
  if (/\bsenhas?\b/i.test(txt)) p.push("fala de «senha»");
  if (!new RegExp(`\\+${PONTOS} pontos de lance`).test(txt)) p.push(`não diz «+${PONTOS} pontos de lance»`);
  if (/ECOQUILDO/i.test(txt)) p.push("promete ECOQUILDO (Art. 51º ainda não ligado)");
  return p;
}

test("controlo positivo: as constantes foram lidas e o verificador apanha uma resposta má", () => {
  assert.equal(PONTOS, 50);
  assert.equal(LIMITE, 10);
  assert.ok(problemas("ganhas +1 senha na hora").length >= 2);
});

test("as 4 respostas do Indique e Ganhe dizem o crédito real, sem «senha» e sem ECOQUILDO", () => {
  for (const perfil of PERFIS) {
    const r = obterResposta("indique_e_ganhe", perfil, DADOS);
    assert.ok(typeof r === "string" && r.length > 20, `${perfil}: resposta vazia`);
    assert.deepEqual(problemas(r), [], `${perfil}: «${r}»`);
  }
});

test("o limite mensal dito pelo GUTO é o do código (comum e corporativo)", () => {
  for (const perfil of ["comum", "corporativo"]) {
    const r = obterResposta("indique_e_ganhe", perfil, DADOS);
    assert.match(r, new RegExp(`até ${LIMITE} indicações`), `${perfil}: o limite mensal não bate com LIMITE_INDICACOES_MES`);
  }
});

test("TODOS os números de crédito e de limite, em todos os perfis, são os do código (achados X9/X10 do SEG4)", () => {
  for (const perfil of PERFIS) {
    const r = obterResposta("indique_e_ganhe", perfil, DADOS);
    for (const m of r.matchAll(/\+(\d+)/g)) assert.equal(Number(m[1]), PONTOS, `${perfil}: «+${m[1]}» ≠ PONTOS_INDICACAO`);
    for (const m of r.matchAll(/até (\d+)/g)) assert.equal(Number(m[1]), LIMITE, `${perfil}: «até ${m[1]}» ≠ LIMITE_INDICACOES_MES`);
  }
});

test("BIDIRECCIONAL: as 4 respostas antigas (verbatim, até ao UTAC110h) são reprovadas", () => {
  const antigas = [
    "Indique e Ganhe é para membros! Cria a tua conta e, por cada amigo que se registar com o teu código, ganhas +1 senha na hora (e o teu amigo também). 😊",
    "Aqui está o teu Indique e Ganhe! 🎁 Partilha o teu link: por cada amigo que criar a conta com o teu código, ganhas +1 senha na hora (e o teu amigo também) — já não é preciso esperar pelo primeiro lance. Código: IND-ABC123.",
    "Indique e Ganhe — código IND-ABC123. Por cada indicado que crie a conta com o seu código: +1 senha para si e +1 para o indicado, creditadas imediatamente no registo. Indicados: 3; convertidos: 2; senhas ganhas: 7.",
    "Indique e Ganhe — código IND-ABC123. Indicados: 3; convertidos: 2; senhas: 7.",
  ];
  for (const a of antigas) assert.ok(problemas(a).length > 0, `o verificador aprovou a resposta antiga: «${a}»`);
});
