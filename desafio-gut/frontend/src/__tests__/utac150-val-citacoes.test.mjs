// utac150-val-citacoes.test.mjs — UTAC150 (validador adversarial, SEG4).
//
// O UTAC150 passou o app ao Regulamento v8.0, que RENUMEROU os artigos do v7 a partir do 21 (o antigo Art. 23, a
// conversão de 50 ECOQUILDOs em Passe, passou ao § único do Art. 21; o 23 é agora o «Indique e Ganhe») e tirou os
// +2 pontos do palpite. As guardas existentes (citacoesRegulamento, artigosUI) cobrem o gate e uma lista curada de
// ficheiros, mas NÃO cobriam três textos VISÍVEIS que ficaram para trás (medido no bundle do AAB vc15):
//   1. Regras Oficiais (`PROPORCOES_TEXTO`): «… converte-os automaticamente em 1 Passe Desafio (Art. 23).»;
//   2. Carteira sem Passes: «O Passe é opcional (Art. 3º): lances e palpites não precisam dele.» — o v8.0 diz o
//      contrário (Arts. 3º e 6º) e o servidor recusa o lance/palpite sem Passe (`consumirPasse`);
//   3. Ofertas Programadas, cartão: «O palpite dá pontos EXTRA …» — no v8.0 o palpite dá 50 ECOQUILDO, zero pontos.
// Este teste lê o Regulamento v8.0 e confere cada citação pelo CONTEÚDO do artigo citado, não por um número fixo.
//
// node --test --test-concurrency=1 src/__tests__/utac150-val-citacoes.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PROPORCOES_TEXTO } from "../lib/pontosLance.js";

const ler = (p) => readFileSync(resolve(process.cwd(), p), "utf8");
const V8 = ler("../../docs/REGULAMENTO-v8.0.md");

/** Texto do Art. N do v8.0, com o § único (linha seguinte) incluído. */
function artigo(n) {
  const re = new RegExp(`^Art\\. ${n}(?:º|\\.) (.*)$`);
  const linhas = V8.split(/\r?\n/).map((l) => l.trim());
  const i = linhas.findIndex((l) => re.test(l));
  if (i < 0) return null;
  let txt = linhas[i].match(re)[1];
  for (let j = i + 1; j < linhas.length && linhas[j].startsWith("§"); j++) txt += " " + linhas[j];
  return txt;
}

/** Números citados numa frase: «(Art. 21)», «(Arts. 7º e 8º)», «(Art. 6º)». */
const citados = (s) => {
  const out = [];
  for (const m of s.matchAll(/\bArts?\.\s*([\dº.,\se]+?)\)/g)) for (const n of m[1].matchAll(/\d+/g)) out.push(Number(n[0]));
  return out;
};

/** Código sem comentários JS/JSX (os comentários de UTAC citam números antigos de propósito). */
const semComentarios = (t) => t.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ")
  .split(/\r?\n/).map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");

test("controlo positivo: o leitor do v8.0 acha a conversão no Art. 21 e o Indique e Ganhe no Art. 23", () => {
  assert.match(artigo(21), /conversão automática e imediata desse montante em 1 \(um\) Passe Desafio/);
  assert.match(artigo(23), /Indique e Ganhe/);
  assert.doesNotMatch(artigo(23), /conversão/);
  assert.match(artigo(6), /Sem Passe disponível não é possível registrar lance nem palpite/);
  assert.equal(artigo(29), null, "o v8.0 tem 28 artigos");
  // O leitor de citações apanha os dois formatos.
  assert.deepEqual(citados("x (Arts. 7º e 8º)."), [7, 8]);
  assert.deepEqual(citados("y (Art. 23)."), [23]);
});

test("Regras Oficiais (PROPORCOES_TEXTO): cada citação aponta para o artigo do v8.0 que diz aquilo", () => {
  // Tema da frase → o que o artigo citado TEM de conter.
  const temas = [
    [/converte/i, /conversão automática e imediata/],
    [/vale R\$/, /R\$ 0,50/],
    [/cartão colecionável/i, /Cartão/],
    [/GUTO/, /GUTO/],
    [/valor do seu lance/, /valor do seu lance/],
  ];
  const maus = [];
  let verificadas = 0;
  for (const linha of PROPORCOES_TEXTO.flatMap((b) => b.linhas)) {
    const ns = citados(linha);
    for (const n of ns) if (!artigo(n)) maus.push(`«${linha}» cita o Art. ${n}, que não existe no v8.0`);
    for (const [tema, deve] of temas) {
      if (!tema.test(linha) || ns.length === 0) continue;
      verificadas++;
      if (!ns.some((n) => deve.test(artigo(n) ?? ""))) maus.push(`«${linha}»: nenhum dos Arts. ${ns.join("/")} diz ${deve}`);
    }
  }
  assert.ok(verificadas >= 4, `poucas citações verificadas (${verificadas}) — o teste deixou de medir`);
  assert.deepEqual(maus, [], maus.join("\n"));
});

test("Carteira sem Passes: não diz que o Passe é opcional e cita os artigos que exigem o Passe (v8.0, Arts. 3º e 6º)", () => {
  const cart = semComentarios(ler("src/pages/MinhaCarteira.jsx"));
  const i = cart.indexOf("data-sem-passes");
  assert.ok(i > 0, "o aviso data-sem-passes desapareceu");
  const bloco = cart.slice(i, cart.indexOf("</p>", i));
  assert.doesNotMatch(bloco, /opcional|não precisam/i, "a Carteira voltou a dizer que o Passe é opcional");
  const ns = citados(bloco);
  assert.ok(ns.length > 0, `o aviso perdeu a citação: «${bloco}»`);
  // Cada artigo citado tem de exigir o Passe (Art. 3º «exige a aquisição prévia»; Art. 6º «Sem Passe disponível …») e pelo
  // menos um tem de dizer «sem Passe não há lance nem palpite». Não se escreve «(Art. 6º)» sozinho: a guarda antiga de
  // citacoesRegulamento proíbe-o na Carteira, onde no v5 era a citação do preço.
  for (const n of ns) assert.match(artigo(n) ?? "", /exige a aquisição prévia do Passe|Sem Passe disponível/, `o Art. ${n} não exige o Passe`);
  assert.ok(ns.some((n) => /Sem Passe disponível/.test(artigo(n) ?? "")), `nenhum dos Arts. ${ns.join("/")} diz «Sem Passe disponível»`);
});

test("palpite sem +2 pontos: Ofertas Programadas e Início não prometem pontos pelo palpite (v8.0, Art. 18)", () => {
  for (const f of ["src/pages/OfertasProgramadas.jsx", "src/pages/Dashboard.jsx"]) {
    const t = semComentarios(ler(f));
    assert.doesNotMatch(t, /palpite d[áa] (\+?\d+ )?pontos|pontos EXTRA|\+\s?2 pontos|2 pontos de b[oó]n/i, `${f}: voltou a prometer pontos pelo palpite`);
  }
  assert.match(semComentarios(ler("src/pages/OfertasProgramadas.jsx")), /50 ECOQUILDO/);
  assert.match(artigo(18), /50 \(cinquenta\) ECOQUILDOs/);
});

test("gate: a contagem de artigos e a versão na caixa «Li e compreendi» batem com o v8.0", () => {
  const termos = semComentarios(ler("src/components/TermosConsentimento.jsx"));
  const nArts = V8.split(/\r?\n/).filter((l) => /^Art\. \d+/.test(l.trim())).length;
  const nCaps = V8.split(/\r?\n/).filter((l) => /CAPÍTULO [IVX]+/.test(l)).length;
  const m = termos.match(/Regras completas \((\d+) capítulos, (\d+) artigos\)/);
  assert.ok(m, "o resumo perdeu «Regras completas (N capítulos, M artigos)»");
  assert.equal(Number(m[1]), nCaps);
  assert.equal(Number(m[2]), nArts);
  const versao = V8.match(/\(VERSÃO ([\d.]+)\)/)[1];
  assert.match(termos, new RegExp(`Li e compreendi o regulamento completo do DesafioGUT \\(Regulamento Oficial v${versao.replace(".", "\\.")}\\)`));
});
