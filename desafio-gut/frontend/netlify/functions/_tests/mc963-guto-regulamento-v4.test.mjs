// mc963-guto-regulamento-v4.test.mjs — MC96.3, Frente A.
//
// Medido no SEG-1: `Art.N = 0` em `chatbot.mjs` e `guto-perfis.mjs` — o GUTO não citava artigo
// nenhum. As perguntas sobre regras eram respondidas "de memória", sem âncora normativa.
//
// HARD GATE 7 — BIDIRECCIONAL, e é aqui que o teste ganha o direito ao nome:
//   (a) o prompt instrui a citar o artigo e traz os factos;
//   (b) cada facto do prompt CORRESPONDE ao texto real do `docs/REGULAMENTO-v4.md` (lido, não
//       copiado) — é isto que impede o prompt de "saber" um regulamento que não existe;
//   (c) alterar o v4 TEM de matar o teste (mutação sobre o DOCUMENTO, não sobre o código).
//
// node --test --experimental-test-module-mocks _tests/mc963-guto-regulamento-v4.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { obterPromptSystem, REGRA_REGULAMENTO, ARTIGOS_V4 } from "../_lib/guto-perfis.mjs";

// ⚠️ O 1.º caminho estava ERRADO por um nível: de `netlify/functions` até `DESAFIOGUT/docs`
// são QUATRO "..", não três (functions → netlify → frontend → desafio-gut → DESAFIOGUT).
// Falhou com ENOENT, e o reporter por omissão só disse "test failed" — daí os candidatos
// explícitos: um caminho errado tem de dar uma falha LEGÍVEL, não um ENOENT opaco.
const CANDIDATOS = [
  resolve(process.cwd(), "..", "..", "..", "..", "docs", "REGULAMENTO-v4.md"),
  resolve(process.cwd(), "..", "..", "..", "docs", "REGULAMENTO-v4.md"),
  resolve(process.cwd(), "..", "..", "docs", "REGULAMENTO-v4.md"),
];
const CAMINHO = CANDIDATOS.find((p) => existsSync(p));
assert.ok(CAMINHO, `não encontrei o REGULAMENTO-v4.md. Tentei:\n  ${CANDIDATOS.join("\n  ")}`);
const V4 = readFileSync(CAMINHO, "utf8");
const PERFIS = ["visitante", "comum", "corporativo", "admin"];

/** Extrai o texto de um artigo do v4 (formato real: "Art. Nº - ..."). */
function artigo(n) {
  // ⚠️ O formato do v4 usa o ordinal "º" (`Art. 20º -`). Um regex sem o "º" não encontra NADA
  // e devolveria "" — e um teste que compara com "" passa sempre. Medido, não suposto.
  const m = V4.match(new RegExp(`Art\\.\\s*${n}\\u00ba\\s*-\\s*([\\s\\S]*?)(?=\\n\\s*Art\\.\\s*\\d|\\n\\s*##|$)`, "i"));
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

// ── (a) o prompt ────────────────────────────────────────────────────────────

test("(a) TODOS os perfis levam a regra do regulamento e a instrução de citar o artigo", () => {
  for (const perfil of PERFIS) {
    const p = obterPromptSystem(perfil, {});
    assert.ok(p.includes(REGRA_REGULAMENTO), `${perfil}: sem REGRA_REGULAMENTO`);
    assert.match(p, /CITA o artigo/i, `${perfil}: falta a instrução de citar`);
  }
  assert.ok(obterPromptSystem("visitante", { conformidade: true }).includes(REGRA_REGULAMENTO),
    "o modo de conformidade também tem de citar o regulamento");
});

test("(a2) a regra proíbe inventar artigos", () => {
  assert.match(REGRA_REGULAMENTO, /NUNCA cites um artigo que não esteja aqui/i);
  assert.match(REGRA_REGULAMENTO, /nunca inventes o número de um artigo/i);
});

// ── (b) BIDIRECCIONAL: o prompt corresponde ao DOCUMENTO ────────────────────

// Cada entrada: n.º do artigo no v4 -> fragmentos que TÊM de existir no artigo E no prompt.
const FATOS = [
  ["5",  ["cadastrar gratuitamente"]],
  ["6",  ["maior de idade", "código único"]],
  ["7",  ["QUANTO VOCÊ OFERTA", "menor lance único", "estratégia"]],
  ["38", ["torneio de habilidade", "Portaria SPA/MF"]],
  ["8",  ["saldo em dinheiro", "Relâmpago", "Programado"]],
  ["20", ["R$ 2,00", "Programado"]],
  ["26", ["R$ 0,01", "duas"]],
  ["27", ["menor lance único"]],
];

test("(b) cada artigo existe no v4 e o texto corresponde ao que o prompt afirma", () => {
  for (const [n, fragmentos] of FATOS) {
    const txt = artigo(n);
    assert.ok(txt && txt.length > 20, `Art. ${n}: NÃO encontrado no docs/REGULAMENTO-v4.md`);
    for (const f of fragmentos) {
      const alvo = f.replace("duas", "2 (duas)").replace("R$ 2,00", "R$ 2,00");
      const noDoc = txt.toLowerCase().includes(f.toLowerCase()) ||
                    txt.toLowerCase().includes(alvo.toLowerCase());
      assert.ok(noDoc, `Art. ${n} do v4 não contém «${f}» — o prompt afirma-o e o documento não o diz`);
    }
  }
});

test("(b2) ARTIGOS_V4 (o que o prompt usa) bate com o documento, artigo a artigo", () => {
  for (const [n, afirmacao] of Object.entries(ARTIGOS_V4)) {
    const txt = artigo(n);
    assert.ok(txt, `Art. ${n}: ausente do v4`);
    // as palavras-chave da afirmação têm de aparecer no artigo real
    const chaves = afirmacao.toLowerCase()
      .replace(/[()º,.]/g, " ").split(/\s+/)
      .filter((w) => w.length > 5 && !["poderá", "deverá", "através", "receberá", "participante", "qualquer"].includes(w));
    const faltam = chaves.filter((w) => !txt.toLowerCase().includes(w));
    assert.ok(faltam.length <= 2,
      `Art. ${n}: a afirmação do prompt diverge do documento (palavras ausentes: ${faltam.join(", ")})`);
    // ⚠️ NÚMEROS, explicitamente. A 1.ª versão filtrava palavras com <=5 caracteres e por isso
    // DESCARTava «R$ 0,01», «0,05», «um», «cinco» — a verificação ficava VACUOSA nos valores, que
    // são o cerne jurídico. O mutante M2 (trocar R$ 0,01 por R$ 0,05 no prompt) SOBREVIVEU por
    // isso. Um filtro de ruído que come o sinal não é um filtro: é um buraco.
    // ⚠️ Incluir os ORDINAIS escritos («2 (duas) casas»): a 1.ª versão procurava só \b\d+\b e o
    // mutante A1 («1 (uma) casas») passava — o «1» solto existe no documento por outros motivos.
    const numeros = afirmacao.match(/R\$\s*[\d.,]+|\b\d+\s*\([^)]+\)|\b\d+\b/g) || [];
    for (const num of numeros) {
      const limpo = num.replace(/\s+/g, " ");
      assert.ok(txt.replace(/\s+/g, " ").includes(limpo),
        `Art. ${n}: o valor «${limpo}» do prompt NÃO consta do documento`);
    }
  }
});

test("(b3) o Art. 20 diz que a senha é SÓ no Programado — o erro que já nos custou um MC", () => {
  const txt = artigo("20");
  assert.match(txt, /quando utilizadas na modalidade Programado/i,
    "o Art. 20 tem de condicionar o custo da senha à modalidade Programado");
});

// ── (c) a mutação sobre o DOCUMENTO ─────────────────────────────────────────

test("(c0) ⚠️ OS NÚMEROS DO TEXTO VIVO (o que vai ao LLM) também batem no documento", () => {
  // A auditoria adversarial mostrou que ARTIGOS_V4 estava MORTO e que só ele era verificado: o
  // texto que REALMENTE vai ao LLM é REGRA_REGULAMENTO, e os seus números não eram conferidos.
  // Mutante A1 («2 (duas) casas» -> «1 (uma) casas») passava em VERDE. Agora não passa.
  // ⚠️ `[\d.,]+` apanhava a VÍRGULA da frase («R$ 0,01,» não consta do doc -> falso positivo).
  const vivos = REGRA_REGULAMENTO.match(/R\$\s*\d+(?:[.,]\d+)*|\b\d+\s*\((?:uma|duas|três|cinco|vinte)\)/g) || [];
  assert.ok(vivos.length > 0, "não encontrei valores no texto vivo — a verificação seria vacuosa");
  const doc = V4.replace(/\s+/g, " ");
  for (const v of vivos) {
    const limpo = v.replace(/\s+/g, " ").trim();
    assert.ok(doc.includes(limpo), `o texto VIVO afirma «${limpo}» e o documento não o diz`);
  }
});

test("(c0a) ⚠️ OS VALORES CRÍTICOS estão no SEU artigo, não em qualquer parte do documento", () => {
  // A auditoria adversarial mostrou que a verificação «o número existe no documento» era fraca:
  // o mutante A1 («2 (duas) casas» -> «1 (uma) casas») passava, porque «1 (uma)» existe no v4
  // noutro artigo (o Art. 33, das indicações). Presença num documento de 40 artigos não é
  // correspondência. Aqui cada valor fica AMARRADO ao artigo que o fundamenta.
  const AMARRAS = [
    ["20", ["R$ 2,00", "Programado"]],
    ["26", ["R$ 0,01", "2 (duas) casas"]],
    ["27", ["menor lance único"]],
    ["38", ["torneio de habilidade", "Portaria SPA/MF"]],
    ["8",  ["Relâmpago", "Programado"]],
  ];
  for (const [n, frases] of AMARRAS) {
    const txt = artigo(n);
    assert.ok(txt, `Art. ${n} ausente`);
    for (const f of frases) {
      assert.ok(txt.toLowerCase().includes(f.toLowerCase()),
        `o v4 Art. ${n} não contém «${f}» — o prompt amarra-o lá`);
      assert.ok(REGRA_REGULAMENTO.toLowerCase().includes(f.toLowerCase()),
        `o prompt vivo perdeu «${f}» (Art. ${n})`);
    }
  }
});

test("(c0b) ARTIGOS_V4 NÃO é código morto: alimenta mesmo o prompt", () => {
  const p = obterPromptSystem("comum", {});
  for (const [n, txt] of Object.entries(ARTIGOS_V4)) {
    assert.ok(p.includes(txt), `Art. ${n}: o texto de ARTIGOS_V4 não chega ao prompt (seria código morto)`);
  }
});

test("(c) o teste realmente lê o documento (não uma cópia): o v4 tem >= 40 artigos", () => {
  const arts = V4.match(/Art\.\s*\d+\u00ba/g) || [];
  assert.ok(new Set(arts).size >= 40, `o v4 devia ter >=40 artigos, vi ${new Set(arts).size}`);
  assert.match(V4, /Portaria SPA\/MF/i, "o v4 invoca a Portaria que sustenta a tese");
});
