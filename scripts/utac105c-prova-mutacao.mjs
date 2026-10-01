#!/usr/bin/env node
// UTAC105c — prova de mutação (T1). Cada mutante:
//   1. é aplicado e CONFIRMA-SE QUE ENTROU (contagem exacta do alvo; o ficheiro mudou);
//   2. corre os testes do UTAC (+ guarda i18n) → tem de dar VERMELHO;
//   3. o ficheiro é reposto a partir do snapshot em bytes e o md5 tem de ser o original.
// Uso: node scripts/utac105c-prova-mutacao.mjs   (a partir da raiz do repo; foreground)

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const FE = join(dirname(fileURLToPath(import.meta.url)), "..", "desafio-gut", "frontend");
const PAGINA = join(FE, "src/pages/MeusAtivos.jsx");
const PT = join(FE, "src/i18n/pt.js");
const TESTES = ["src/pages/__tests__/utac105c-meus-ativos.test.mjs", "src/i18n/__tests__/ativos-i18n.test.mjs"];

const md5 = (b) => createHash("md5").update(b).digest("hex");

const MUTANTES = [
  { id: "M1", alvo: PAGINA, desc: "repor o defeito: 🏆 = 1.º não repetido da lista",
    de: "const isVencedor = lance === menorUnico;", para: "const isVencedor = !lance.repetido && i === 0;", n: 2 },
  { id: "M2", alvo: PAGINA, desc: "🏆 a todos os lances únicos",
    de: "const isVencedor = lance === menorUnico;", para: "const isVencedor = !lance.repetido;", n: 2 },
  { id: "M3", alvo: PAGINA, desc: "MobileList deixa de receber o menorUnico",
    de: "<MobileList lances={lancesExibidos} menorUnico={menorUnico} />", para: "<MobileList lances={lancesExibidos} />", n: 1 },
  { id: "M4", alvo: PAGINA, desc: "DesktopTable deixa de receber o menorUnico",
    de: "<DesktopTable lances={lancesExibidos} menorUnico={menorUnico} />", para: "<DesktopTable lances={lancesExibidos} />", n: 1 },
  { id: "M5", alvo: PAGINA, desc: "remover a secção de cupons",
    de: 'data-secao="meus-cupons"', para: 'data-secao="x-cupons"', n: 1 },
  { id: "M6", alvo: PAGINA, desc: "remover a secção de palpites",
    de: 'data-secao="meus-palpites"', para: 'data-secao="x-palpites"', n: 1 },
  { id: "M7", alvo: PAGINA, tambem: PT, desc: "o placeholder de cupons inventa um número (jsx + pt, para não ser a guarda i18n a morder)",
    de: '"Esta área ainda não está disponível. Seus cupons de desconto vão aparecer aqui quando o recurso for lançado."',
    para: '"Esta área ainda não está disponível. Você tem 0 cupons."', n: 1 },
  { id: "M8", alvo: PAGINA, tambem: PT, desc: "o placeholder de palpites deixa de se declarar (jsx + pt)",
    de: '"Esta área ainda não está disponível. Seus palpites vão aparecer aqui quando o recurso for lançado."',
    para: '"Seus palpites vão aparecer aqui."', n: 1 },
  { id: "M9", alvo: PAGINA, desc: "tirar o data-estado dos placeholders",
    de: 'data-estado="placeholder"', para: 'data-estado="x"', n: 2 },
  { id: "M10", alvo: PT, desc: "o dicionário diverge do fallback",
    de: '"ativos.cupons.titulo": "🎟️ Meus cupons"', para: '"ativos.cupons.titulo": "🎟️ Cupons"', n: 1 },
];

function correr() {
  const r = spawnSync("node", ["--test", "--test-concurrency=1", ...TESTES], { cwd: FE, encoding: "utf8", maxBuffer: 64 << 20 });
  const s = `${r.stdout}${r.stderr}`;
  const pass = Number(s.match(/^ℹ pass (\d+)$/m)?.[1]);
  const fail = Number(s.match(/^ℹ fail (\d+)$/m)?.[1]);
  return { pass, fail, medido: Number.isInteger(pass) && Number.isInteger(fail) };
}

const base = correr();
if (!base.medido || base.fail !== 0) { console.log(`CONTROLO FALHOU: sem mutante esperava VERDE, vi ${JSON.stringify(base)}`); process.exit(2); }
console.log(`controlo (sem mutante): VERDE ${base.pass}/${base.pass}`);

let provados = 0;
for (const m of MUTANTES) {
  const alvos = m.tambem ? [m.alvo, m.tambem] : [m.alvo];
  const originais = alvos.map((a) => readFileSync(a));
  try {
    alvos.forEach((a, k) => {
      const texto = originais[k].toString("utf8");
      const contagem = texto.split(m.de).length - 1;
      const esperado = k === 0 ? m.n : 1;
      if (contagem !== esperado) throw new Error(`${m.id} NAO_ENTROU em ${a}: alvo ${contagem}× (esperava ${esperado})`);
      writeFileSync(a, texto.split(m.de).join(m.para));
      if (md5(readFileSync(a)) === md5(originais[k])) throw new Error(`${m.id} NAO_ENTROU: ${a} não mudou`);
    });
    const r = correr();
    const ok = r.medido && r.fail > 0;
    if (ok) provados++;
    console.log(`${m.id} ${ok ? "PROVADO" : "SOBREVIVEU"} (pass ${r.pass} · fail ${r.fail}) — ${m.desc}`);
  } catch (e) {
    console.log(e.message); process.exitCode = 2;
  } finally {
    alvos.forEach((a, k) => {
      writeFileSync(a, originais[k]);
      if (md5(readFileSync(a)) !== md5(originais[k])) { console.log(`${m.id} RESTAURO FALHOU em ${a}`); process.exit(3); }
    });
  }
  if (process.exitCode === 2) process.exit(2);
}
const fim = correr();
console.log(`restauro: md5 idêntico em todos · suíte do UTAC ${fim.fail === 0 ? "VERDE" : "VERMELHA"} ${fim.pass}/${fim.pass + fim.fail}`);
console.log(`RESULTADO: ${provados}/${MUTANTES.length} mutantes PROVADOS`);
process.exit(provados === MUTANTES.length && fim.fail === 0 ? 0 : 1);
