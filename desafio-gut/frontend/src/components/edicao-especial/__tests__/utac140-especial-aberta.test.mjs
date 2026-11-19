// UTAC140 — frontend da especial aberta: tabela AO VIVO com valores ocultos (E), Top 10 público mascarado e
// Top 10 completo só com Passe em Meus Ativos (D), e guarda de vocabulário («leilão» não introduzido).
//
// Corre com: node --test src/components/edicao-especial/__tests__/utac140-especial-aberta.test.mjs (de desafio-gut/frontend).

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { carregar, render, texto, fechar } from "../../meus-ativos/__tests__/_render.mjs";

const D = "/src/components/edicao-especial";
let Ranking, Top10, Passe;
before(async () => {
  Ranking = await carregar(`${D}/RankingEspecialOculto.jsx`);
  Top10 = await carregar(`${D}/ResultadosEdicao.jsx`);
  Passe = await carregar("/src/components/meus-ativos/Top10EspecialPasse.jsx");
});
after(fechar);

const posicoes = (html) => [...html.matchAll(/data-posicao="(\d+)"/g)].map((m) => Number(m[1]));
const nunca = () => false;

describe("UTAC140 · RankingEspecialOculto (Frente E)", () => {
  test("ordem de chegada + endereço encurtado + «**** pontos»; o valor NUNCA se desenha, nem que venha", () => {
    const html = render(Ranking, {
      edicaoId: "ESPECIAL-RELAMPAGO1", configurado: nunca,
      inicial: [
        { posicao: 2, endereco: "0x2222…bbbb", valor_oculto: 777777 },
        { posicao: 1, endereco: "0x1111…aaaa", valor_oculto: null },
      ],
    });
    assert.deepEqual(posicoes(html), [1, 2]);
    const t = texto(html);
    assert.match(t, /1º\s*0x1111…aaaa\s*\*\*\*\* pontos/);
    assert.match(t, /2 lances/);
    assert.match(t, /Por ordem de chegada\. Os valores ficam secretos até a apuração\./);
    assert.equal(html.includes("777777"), false, "um valor que viesse na resposta não pode aparecer");
    assert.equal((html.match(/data-valor="oculto"/g) || []).length, 2);
  });
  test("linhasDoRanking: descarta lixo, ordena, e o objecto devolvido não tem valor", async () => {
    const { linhasDoRanking } = await import("../_ranking-especial.js");
    const l = linhasDoRanking([{ posicao: 3, endereco: "0x3…c" }, null, { posicao: "x", endereco: "a" }, { posicao: 1, endereco: "" }, { posicao: 1, endereco: "0x1…a", valor_oculto: 5 }]);
    assert.deepEqual(l, [{ posicao: 1, endereco: "0x1…a" }, { posicao: 3, endereco: "0x3…c" }]);
    assert.deepEqual(linhasDoRanking(null), []);
  });
  test("sem dados ainda ⇒ «…»; lista vazia ⇒ convite ao primeiro lance", () => {
    assert.match(render(Ranking, { edicaoId: "ESPECIAL-RELAMPAGO1", configurado: nunca }), /data-estado="a-carregar"/);
    const vazio = render(Ranking, { edicaoId: "ESPECIAL-RELAMPAGO1", configurado: nunca, inicial: [] });
    assert.match(vazio, /data-estado="vazio"/);
    assert.match(texto(vazio), /Ainda sem lances/);
  });
});

describe("UTAC140 · Top 10 (Frente D)", () => {
  test("público: linhas sem valor desenham-se com «****»; com valor, R$ como antes (UTAC138)", () => {
    const html = render(Top10, { top10: [
      { posicao: 1, endereco: "0x0001…abcd", nome: null },
      { posicao: 2, endereco: "0x0002…abcd", nome: null, valorCentavos: 9 },
    ] });
    assert.deepEqual(posicoes(html), [1, 2]);
    assert.match(html, /data-valor="oculto"[^>]*>\*\*\*\*</);
    assert.match(texto(html), /R\$ 0,09/);
  });
  test("decidirTop10Passe: só mostra com pronto + valoresRestritos:false + Top 10 não vazio", async () => {
    const { decidirTop10Passe } = await import("../../meus-ativos/_top10-passe.js");
    const top10 = [{ posicao: 1, endereco: "0x1…a", valorCentavos: 4 }];
    assert.deepEqual(decidirTop10Passe({ ok: true, data: { pronto: true, valoresRestritos: false, top10, vencedor: top10[0], produto: "Fritadeira" } }),
      { top10, vencedor: top10[0], produto: "Fritadeira" });
    for (const resp of [
      null, { ok: false, status: 403, data: { error: { code: "acesso_restrito_passe" } } },
      { ok: true, data: { pronto: false } }, { ok: true, data: { pronto: true, valoresRestritos: true, top10 } },
      { ok: true, data: { pronto: true, top10 } }, { ok: true, data: { pronto: true, valoresRestritos: false, top10: [] } },
      { ok: true, data: "<!doctype html>" },
    ]) assert.equal(decidirTop10Passe(resp), null, JSON.stringify(resp));
  });
  test("UTAC140b · Meus Ativos: sem edição (nenhuma especial nos dados) não desenha nem pede nada", () => {
    let pedidos = 0;
    const carregarDuplo = async () => { pedidos++; return { ok: true, data: {} }; };
    assert.equal(render(Passe, { temSessao: true, authToken: "tok", carregar: carregarDuplo }), "");
    assert.equal(pedidos, 0);
  });
  test("UTAC140b · nenhum id de edição fixo no código do Top 10 nem do ranking", () => {
    for (const f of ["src/components/meus-ativos/Top10EspecialPasse.jsx", "src/components/edicao-especial/RankingEspecialOculto.jsx", "src/pages/MeusAtivos.jsx"]) {
      const s = readFileSync(new URL(`../../../../${f}`, import.meta.url), "utf8");
      assert.equal(/ESPECIAL-[A-Z0-9]+/.test(s.replace(/\/\/.*$/gm, "")), false, `${f} tem um id fixo`);
    }
  });
  test("Meus Ativos: sem sessão não desenha nada (e não há I/O sem token)", () => {
    let pedidos = 0;
    const carregarDuplo = async () => { pedidos++; return { ok: true, data: {} }; };
    assert.equal(render(Passe, { temSessao: false, authToken: null, carregar: carregarDuplo }), "");
    assert.equal(pedidos, 0);
  });
});

describe("UTAC140 · guarda de vocabulário", () => {
  const RAIZ = new URL("../../../../", import.meta.url);
  const NOVOS = [
    "src/components/edicao-especial/RankingEspecialOculto.jsx",
    "src/components/meus-ativos/Top10EspecialPasse.jsx",
    "src/components/edicao-especial/_ranking-especial.js",
    "src/components/meus-ativos/_top10-passe.js",
  ];
  test("os ficheiros novos do UTAC140 não contêm «leilão»/«leilões»", () => {
    for (const f of NOVOS) {
      const s = readFileSync(new URL(f, RAIZ), "utf8");
      assert.equal(/leil[aã]o|leil[oõ]es/i.test(s), false, `${f} contém o termo proibido`);
    }
  });
  test("as linhas UTAC140 dos ficheiros alterados não contêm «leilão»", () => {
    for (const f of ["src/pages/MercadoLances.jsx", "src/pages/MeusAtivos.jsx", "src/components/edicao-especial/CardEdicaoEspecial.jsx", "src/components/edicao-especial/ResultadosEdicao.jsx"]) {
      const linhas = readFileSync(new URL(f, RAIZ), "utf8").split("\n");
      const marcadas = linhas.filter((l, i) => /UTAC140/.test(l) || /UTAC140/.test(linhas[i - 1] ?? "") || /UTAC140/.test(linhas[i - 2] ?? ""));
      assert.ok(marcadas.length > 0, `${f}: esperava linhas UTAC140`);
      // A palavra do enunciado (com acento). Identificadores sem acento que JÁ existiam ao lado (ex.: o import de
      // `leilaoLock.js`) não são texto e não foram introduzidos — a prova por diff vive no script do SEG6.
      assert.equal(marcadas.some((l) => /leilão|leilões/i.test(l)), false, `${f}: «leilão» numa linha UTAC140`);
    }
  });
});
