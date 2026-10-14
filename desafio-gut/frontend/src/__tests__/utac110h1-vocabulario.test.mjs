// utac110h1-vocabulario.test.mjs — UTAC110h.1 · vocabulário do Regulamento v5.0 no que o utilizador lê.
//
// Frente C: «torneio de habilidade» → «competição de habilidade» (v5 Art. 14º) e
// «pontos de compra» → «pontos de fidelidade» (v5 Arts. 8º/35º), no texto VISÍVEL.
// Frente A (parte de versão): o gate e o servidor passam a "3.0" (R18-110h.1-B).
//
// BIDIRECCIONAL: o mesmo verificador que dá verde ao código actual REPROVA as frases antigas
// (fixadas aqui verbatim, tal como estavam até ao UTAC110h).
//
// node --test src/__tests__/utac110h1-vocabulario.test.mjs   (a partir de desafio-gut/frontend)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const FE = process.cwd();
const ler = (p) => readFileSync(resolve(FE, p), "utf8");

/** Código sem comentários (os comentários podem — e devem — contar a história do termo antigo). */
const semComentarios = (src) => src
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .split(/\r?\n/).map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");

// SEG4 (ℹ️ do validador): «funcionamento do torneio» na Privacidade :126 também é vocabulário antigo.
const ANTIGOS = [/torneio de habilidade/i, /pontos de compra/i, /funcionamento do torneio/i];
const violacoes = (txt) => ANTIGOS.filter((re) => re.test(txt)).map(String);

/** Ficheiros de UI (sem testes) + os endpoints que falam com o utilizador. */
function alvos() {
  const out = [];
  const IGNORAR = new Set(["node_modules", "dist", ".vite", "android", "__tests__"]);
  (function walk(dir) {
    for (const e of readdirSync(dir)) {
      if (IGNORAR.has(e)) continue;
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(jsx?|tsx?)$/.test(e)) out.push(p);
    }
  })(resolve(FE, "src"));
  return [...out, resolve(FE, "netlify/functions/resgatar-cartao.mjs")];
}

test("controlo positivo: a varredura vê ficheiros e o verificador apanha os termos antigos", () => {
  assert.ok(alvos().length > 150, `a varredura viu só ${alvos().length} ficheiros — medição suspeita`);
  assert.deepEqual(violacoes("🏆 Torneio de habilidade"), ["/torneio de habilidade/i"]);
  assert.deepEqual(violacoes("Você precisa de 50 pontos de compra"), ["/pontos de compra/i"]);
});

test("ZERO «torneio de habilidade» / «pontos de compra» no texto visível (código sem comentários)", () => {
  const maus = [];
  for (const f of alvos()) {
    const v = violacoes(semComentarios(readFileSync(f, "utf8")));
    if (v.length) maus.push(`${f.replace(/\\/g, "/").replace(/^.*\/frontend\//, "")}: ${v.join(", ")}`);
  }
  assert.deepEqual(maus, [], "vocabulário antigo visível:\n" + maus.join("\n"));
});

test("BIDIRECCIONAL: as frases ANTIGAS (verbatim) são reprovadas; as novas passam", () => {
  const antigas = [
    'O DesafioGUT é uma plataforma de torneio de habilidade de "menor lance único"',   // Privacidade.jsx (até 110h)
    '"ativos.torneio.titulo": "🏆 Torneio de habilidade"',                                // pt.js (até 110h)
    '402: "Você precisa de 50 pontos de compra para resgatar o cartão"',                // useResgatarCartao.js (até 110h)
    "são precisos ${PONTOS_POR_CARTAO} pontos de compra para resgatar o cartão",          // resgatar-cartao.mjs (até 110h)
  ];
  for (const a of antigas) assert.ok(violacoes(a).length > 0, `o verificador deixou passar: «${a}»`);
  assert.match(semComentarios(ler("src/pages/Privacidade.jsx")), /plataforma de competição de habilidade de "menor lance único"/);
  assert.match(ler("src/i18n/pt.js"), /"ativos\.torneio\.titulo": "🏆 Competição de habilidade"/);
  assert.match(semComentarios(ler("src/components/meus-ativos/PainelTorneio.jsx")), /"🏆 Competição de habilidade"/);
  assert.match(ler("src/hooks/useResgatarCartao.js"), /402: "Você precisa de 50 pontos de fidelidade para resgatar o cartão"/);
  assert.match(semComentarios(ler("netlify/functions/resgatar-cartao.mjs")), /pontos de fidelidade para resgatar o cartão/);
});

test("versão do aceite: gate e servidor em \"3.0\" (R18-110h.1-B — o v4 deixou de valer)", () => {
  const front = ler("src/components/TermosConsentimento.jsx").match(/export const VERSAO_CONSENTIMENTO = "([^"]+)"/);
  const back = ler("netlify/functions/_lib/consentimento.mjs").match(/export const VERSAO_GATE = "([^"]+)"/);
  assert.ok(front && back, "não encontrei as constantes de versão");
  assert.equal(front[1], "3.0", "o gate não subiu de versão — quem aceitou o v4 não volta a ver o gate");
  assert.equal(back[1], "3.0", "o servidor recusaria o aceite do gate novo (versao_invalida)");
});
