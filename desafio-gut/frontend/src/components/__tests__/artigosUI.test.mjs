// artigosUI.test.mjs — MC96.7, HARD GATE 3.
//
// O QUE ESTE TESTE TAPA
// O validador da série (`deleg_af25f606`) provou que trocar um número de artigo na PROSA
// sobrevive verde: mudar `(Art. 27º)` para `(Art. 9º)` numa string da UI não fazia falhar nada.
// O Art. 9º fala de senhas bloqueadas; o Art. 27º é o pagamento do ganhador — uma citação errada
// num produto regulado por portaria não é um detalhe cosmético.
//
// COMO TRAVA (e porque não é vacuoso)
// Cada artigo citado na UI tem de ter, NA MESMA LINHA, uma palavra-chave que só faz sentido
// para ESSE artigo — e essa palavra tem de constar do texto do artigo no Regulamento v4.
// Assim o teste fica amarrado em DUAS pontas:
//   (a) a UI cita o artigo certo (a palavra-chave bate com o assunto);
//   (b) o artigo existe mesmo no v4 e trata daquele assunto.
// Trocar o número quebra (a). Inventar um artigo quebra (b).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const FE = process.cwd();
const ler = (f) => readFileSync(resolve(FE, f), "utf8");

// Artigos citados na UI e a palavra que TEM de estar perto da citação.
// ⚠️ Os valores foram MEDIDOS no v4 — não inventados aqui.
const EXIGIDO = {
  "1":  ["torneio de habilidade", "dropshipping", "e-commerce", "venda à ordem", "habilidade"],
  "4":  ["5 (cinco) de outubro", "implantado", "tempo indeterminado", "coordenação", "outubro de 2026"],
  "9":  ["bloqueia", "senha", "inutilizada", "indevidamente", "repetida"],
  "10": ["sigilo", "segurança", "dados pessoais", "senha", "acesso restrito"],
  "13": ["transferência", "propriedade", "despesas", "10.000"],
  "14": ["contemplado", "manaus", "prémio em dinheiro", "dinheiro", "integral"],
  "29": ["cedem", "imagem", "som de voz", "divulgação", "direitos"],
  "34": ["proibida", "funcionários", "colaboradores", "familiares", "empresas promotoras"],
  "37": ["registrado", "rtd", "cartório", "títulos e documentos"],
  "5":  ["gratuit", "cadastr", "maior de idade", "18"],
  "6":  ["senha", "código único", "lances"],
  "7":  ["menor lance", "oferta", "estratégia", "QUANTO VOCÊ OFERTA"],
  "8":  ["lance", "lance único", "proposta"],
  "20": ["senha", "R$ 2,00", "Programado", "2 (dois)"],
  "21": ["pagamento", "PIX", "23.040.066"],
  "26": ["R$ 0,01", "lance", "Relâmpago", "saldo"],
  "27": ["ganhador", "pagamento", "prémio", "entrega"],
  "24": ["mensagem", "lance", "menor e único", "comunicação"],
  "25": ["apuração", "automátic", "painel", "controle restrito"],
  "33": ["indicação", "bónus", "contato"],
  "38": ["habilidade", "destreza", "loteria", "azar"],
};

/** Todos os ficheiros de UI (exclui os testes: o vocabulário faz parte do que eles testam). */
function ficheirosUI() {
  const out = [];
  const IGNORAR = new Set(["node_modules", "dist", ".vite", "android", "__tests__"]);
  (function walk(dir) {
    for (const e of readdirSync(dir)) {
      if (IGNORAR.has(e)) continue;
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(jsx?|tsx?)$/.test(e)) out.push(p.replace(/\\/g, "/").replace(/^.*\/frontend\//, ""));
    }
  })(resolve(FE, "src"));
  return out.sort();
}

/** Extrai as citações «Art. Nº» com a linha onde estão. */
// ⚠️ A janela é de ±3 linhas: no JSX, a citação (`<strong>Art. 5</strong> — …`) e o assunto
// caem quase sempre em linhas ADJACENTES, por causa da quebra de linha do markup. Exigir a
// mesma linha dava 3 falsos positivos medidos em `TermosConsentimento.jsx` (linhas 88/94/100),
// onde o assunto está na linha seguinte. O que se julga é a CORRESPONDÊNCIA de assunto, não a
// proximidade tipográfica.
const JANELA = 3;
// ⚠️ Um COMENTÁRIO que mencione um artigo não é uma citação ao utilizador. Sem isto, o
// comentário «// Tipo de leilão (Art. 8)» em `AppContext.jsx:172` era julgado como citação.
// 3.ª vez nesta série que um comentário gera falso positivo numa guarda: a lição é que
// uma guarda que julga CÓDIGO tem de remover comentários primeiro.
function semComentarios(src) {
  // ⚠️ Os comentários são substituídos por espaço PRESERVANDO os `\n`. A 1.ª versão apagava-os
  // inteiros e os números de linha deslizavam: o teste acusava «linha 69», que no ficheiro é uma
  // linha VAZIA (a citação real está na 75). Um diagnóstico que aponta para o sítio errado
  // custa mais do que não apontar nada.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|\s)\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, " "));
}

function citacoes(src) {
  const linhas = semComentarios(src).split("\n");
  const out = [];
  linhas.forEach((linha, i) => {
    for (const m of linha.matchAll(/Art\.?\s*(\d+)\s*[ºo°]?/gi)) {
      out.push({ artigo: m[1], linha: i, texto: linhas.slice(Math.max(0, i - JANELA), i + JANELA + 1).join(" ") });
    }
  });
  return out;
}

const V4 = ler("../../docs/REGULAMENTO-v4.md");

test("o v4 é legível e tem os artigos citados (guarda contra medição vazia)", () => {
  assert.ok(V4.length > 5000, "o Regulamento v4 não foi lido — medição inválida");
  for (const n of Object.keys(EXIGIDO)) {
    assert.match(V4, new RegExp(`Art\\.?\\s*${n}\\s*[ºo°]`, "i"), `o Art. ${n}º não existe no v4`);
  }
});

test("cada (Art. Nº) na UI aponta para o artigo certo — palavra-chave na mesma linha", () => {
  const fs_ = ficheirosUI();
  assert.ok(fs_.length > 100, `a varredura viu ${fs_.length} ficheiros — demasiado poucos, medição suspeita`);
  const problemas = [];
  let total = 0;
  for (const f of fs_) {
    const lista = citacoes(ler(f));
    // ⚠️ CITAÇÕES COLECTIVAS: uma legenda como «Proteção de dados … — Art. 9 e Art. 10 do
    // Regulamento» cita dois artigos e resume-os em conjunto, sem repetir as palavras de cada
    // um. Quando uma mesma linha cita >=2 artigos, exigimos a UNIÃO das palavras-chave deles.
    // O trap mantém-se para a citação simples (a do validador: `(Art. 7º)` -> `(Art. 9º)`).
    const porLinha = new Map();
    for (const c of lista) {
      if (!porLinha.has(c.linha)) porLinha.set(c.linha, []);
      porLinha.get(c.linha).push(c.artigo);
    }
    for (const c of lista) {
      total++;
      const grupo = porLinha.get(c.linha);
      const chaves = grupo.length >= 2
        ? grupo.flatMap((n) => EXIGIDO[n] || [])
        : EXIGIDO[c.artigo];
      // ⚠️ O DEFAULT É REPROVAR, não ignorar. A 1.ª versão fazia `continue` para artigos fora
      // do mapa — e a mutação do validador (`Art. 7º` -> `Art. 9º`) SOBREVIVEU por isso mesmo:
      // o 9 não estava mapeado, logo não era julgado. Uma citação que o teste não sabe verificar
      // é uma citação NÃO VERIFICADA — e uma guarda não pode tratar o desconhecido como aprovado.
      if (!chaves || !chaves.length) {
        problemas.push(`${f}:${c.linha + 1} cita Art. ${c.artigo}º, que NÃO está no mapa de verificação (acrescentar ou corrigir)`);
        continue;
      }
      const linha = c.texto.toLowerCase();
      if (!chaves.some((k) => linha.includes(k.toLowerCase()))) {
        problemas.push(`${f}:${c.linha + 1} cita Art. ${c.artigo}º sem nenhuma de [${chaves.join(", ")}]`);
      }
    }
  }
  assert.ok(total > 0, "NÃO SE ENCONTROU NENHUMA CITAÇÃO — teste vacuoso, abortar");
  assert.deepEqual(problemas, [], "citações de artigo sem correspondência de assunto:\n" + problemas.join("\n"));
});

test("as palavras-chave exigidas constam mesmo do texto do artigo no v4 (não inventadas)", () => {
  // Para cada artigo mapeado, exige-se que PELO MENOS uma palavra-chave conste do v4 —
  // senão estaríamos a exigir algo que o documento não diz. Não se exige que esteja no
  // artigo exacto (o v4 referencia-se a si próprio); exige-se que exista no documento.
  for (const [n, chaves] of Object.entries(EXIGIDO)) {
    assert.ok(chaves.some((k) => V4.toLowerCase().includes(k.toLowerCase())),
      `Art. ${n}º: nenhuma palavra-chave (${chaves.join(", ")}) consta do v4 — a exigência é inventada`);
  }
});
