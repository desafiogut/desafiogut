// UTAC140 (Frente E — operador: «o layout é o layout da edição»; «já tínhamos esse padrão com as edições que ainda
// não estavam activas») — os lances AO VIVO da especial entram na TabelaLances PADRÃO como linhas BLINDADAS «🔒»,
// pela ordem de chegada, com o endereço já encurtado pelo servidor. Mesmo servidor de teste do utac0009 (duplos do
// DOMPurify e do resultado oficial); nenhum ficheiro de produção é alterado para o teste.
//
// node --test src/components/__tests__/utac140-tabela-especial.test.mjs   (de desafio-gut/frontend)

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve as caminho } from "node:path";
import { opcoesServidorTeste, ALIASES } from "../../__tests__/_servidor-teste.mjs";
import { lancesOcultosDoRanking } from "../edicao-especial/_ranking-especial.js";

const STUBS = caminho(dirname(fileURLToPath(import.meta.url)), "_stubs");
let React, renderToStaticMarkup, vite, Tabela, definirResultadoOficial;

before(async () => {
  vite = await createServer({
    ...opcoesServidorTeste(),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true },
    resolve: {
      alias: [...ALIASES,
        { find: /^\.\.\/hooks\/useResultadoOficial\.js$/, replacement: `${STUBS}/useResultadoOficial.js` },
        { find: /^dompurify$/, replacement: `${STUBS}/dompurify.js` },
      ],
    },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ definirResultadoOficial } = await vite.ssrLoadModule(`${STUBS}/useResultadoOficial.js`));
  Tabela = (await vite.ssrLoadModule("/src/components/TabelaLances.jsx")).default;
});
after(async () => { if (vite) await vite.close(); });

const texto = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const desenhar = (lances, idEdicao = "ESPECIAL-X") => {
  definirResultadoOficial(null);
  return renderToStaticMarkup(React.createElement(Tabela, { lances, idEdicao, prazoTimestamp: 0, encerrado: false }));
};
const RPC = [
  { posicao: 2, endereco: "0x2222…bbbb", valor_oculto: 777777 },
  { posicao: 1, endereco: "0x1111…aaaa", valor_oculto: null },
];

describe("UTAC140 · TabelaLances padrão com os lances blindados da especial", () => {
  test("endereço encurtado + 🔒 por linha, ordem de chegada, aviso «valores ocultos», nenhum valor", () => {
    const t = texto(desenhar(lancesOcultosDoRanking(RPC)));
    assert.match(t, /0x1111…aaaa/);
    assert.match(t, /0x2222…bbbb/);
    assert.ok(t.indexOf("0x1111…aaaa") < t.indexOf("0x2222…bbbb"), "ordem de chegada");
    assert.ok((t.match(/🔒/g) || []).length >= 3, "o aviso da tabela + um cadeado por linha");
    assert.match(t, /valores ocultos até o fim/);
    assert.equal(/R\$ \d/.test(t) || t.includes("777777"), false, "nenhum valor");
  });
  test("sem lances ⇒ o estado vazio padrão da tabela", () => {
    assert.match(texto(desenhar([])), /Nenhum lance registrado ainda/);
  });
  test("endereço curto só vale em linha BLINDADA: com valor continua a exigir o endereço inteiro (como antes)", () => {
    assert.equal(texto(desenhar([{ enderecoCurto: "0x1111…aaaa", valor: 5, oculto: false }], "R-1")).includes("0x1111…aaaa"), false);
    assert.equal(texto(desenhar([{ enderecoCurto: "0x1111aaaa", valor: null, oculto: true }])).includes("0x1111aaaa"), false, "formato curto inválido recusado");
  });
  test("linhas com endereço inteiro (as de sempre) não mudaram", () => {
    const t = texto(desenhar([{ endereco: "0xaaaa000000000000000000000000000000000001", valor: 300, repetido: false }], "R-1"));
    assert.match(t, /0xaaaa\.\.\.0001/);
    // (com `encerrado: false` a tabela esconde todos os valores — regra de divulgação anterior ao UTAC140)
  });
});
