// Dashboard.test.mjs — MC94.2. Renderiza a PÁGINA INTEIRA do Dashboard, a sério.
//
// Corre com:  node --test src/pages/__tests__/Dashboard.test.mjs
// (a partir de desafio-gut/frontend). Mesmo arnês do MeusAtivos.test.mjs: Vite
// transpila, react-dom/server renderiza, `resolve.alias` troca o AppContext, o
// IdiomaContext e o CardLance por duplos. Nenhum ficheiro do projeto muda.
//
// ⚠️ Em SSR o `useEffect` não corre, logo o relógio de 1 s do card não avança:
// o card usa o instante do render. As datas são RELATIVAS ao relógio real — uma
// data fixa caducaria no dia do evento (achado da validação do MC94.1).

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { fileURLToPath } from "node:url";
import { dirname, resolve as caminho } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const STUBS = caminho(AQUI, "_stubs");
let vite = null;
let Pagina = null;
let MemoryRouter = null;
let definirContexto = null;

before(async () => {
  vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
    resolve: {
      alias: [
        { find: /^\.\.\/context\/AppContext\.jsx$/,    replacement: `${STUBS}/AppContext.jsx` },
        { find: /^\.\.\/context\/IdiomaContext\.jsx$/, replacement: `${STUBS}/IdiomaContext.jsx` },
        { find: /^\.\.\/components\/CardLance\.jsx$/,  replacement: `${STUBS}/CardLance.jsx` },
      ],
    },
  });
  ({ definirContexto } = await vite.ssrLoadModule(`${STUBS}/AppContext.jsx`));
  // react-router-dom é CJS: carregado pelo node, que é o que o Vite externaliza em SSR.
  ({ MemoryRouter } = await import("react-router-dom"));
  Pagina = (await vite.ssrLoadModule("/src/pages/Dashboard.jsx")).default;
});
after(async () => { if (vite) await vite.close(); });

const H = 3_600_000;
const iso = (ms) => new Date(ms).toISOString();
const especial = (inicioMs, extra = {}) => ({
  id: "ESPECIAL-AIRFRYER", tipo: "programado", produto: "Air Fryer",
  inicio_em: iso(inicioMs), termino_em: iso(inicioMs + H / 2),
  status: "agendado", imagem_url: "/artes/edicao-especial-airfryer.jpg", lances: 0, ...extra,
});
const R1 = { id: "R-1", tipo: "relampago", produto: null, termino_em: iso(Date.now() + 24 * H), lances: 0, status: "aberto" };

function renderizar(contexto = {}) {
  definirContexto({
    lances: [], vencedor: null,
    saldoSenhas: null, saldoSenhasStatus: "idle", saldoRsCentavos: null, saldoRsStatus: "idle",
    encerrado: false, tipoLeilao: "flash", DURACAO: { flash: 1800, programado: 86400 },
    pareceAutenticado: false, address: null, userLabel: null, EDICAO_ATIVA: "R-1",
    showOverlay: false, showCountdown: false, handleNovaRodada: () => {}, setPrazoTimestamp: () => {},
    edicoes: { "R-1": R1 }, agendadas: {}, offsetRelogioMs: 0,
    isConnected: false, ready: true, abrirModal: () => {}, desconectar: () => {},
    ...contexto,
  });
  return renderToStaticMarkup(
    React.createElement(MemoryRouter, null, React.createElement(Pagina)),
  );
}
const texto = (html) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const secaoEspecial = (html) => html.match(/<section[^>]*data-secao="edicao-especial"[\s\S]*?<\/section>/)?.[0] ?? "";

describe("MC94.2 · Dashboard — o card da edição especial", () => {
  test("antes da hora (em `agendadas`): card agendado, com arte e cronómetro", () => {
    const html = renderizar({ agendadas: { "ESPECIAL-AIRFRYER": especial(Date.now() + 5 * H) } });
    const sec = secaoEspecial(html);
    assert.ok(sec, "o card não apareceu");
    assert.match(sec, /data-estado="agendada"/);
    assert.match(sec, /src="\/artes\/edicao-especial-airfryer\.jpg"/);
    assert.match(sec, /role="timer"/);
  });

  test("fica entre 'Edição Ativa' e 'Acesso Rápido' — a R-1 continua lá", () => {
    const html = renderizar({ agendadas: { "ESPECIAL-AIRFRYER": especial(Date.now() + 5 * H) } });
    const t = texto(html);
    const iAtiva = t.indexOf("Edição Ativa");
    const iEsp = t.indexOf("Edição especial");
    const iRapido = t.indexOf("Acesso Rápido");
    assert.ok(iAtiva >= 0 && iEsp > iAtiva && iRapido > iEsp, `ordem errada: ${iAtiva} ${iEsp} ${iRapido}`);
  });

  test("a contagem da PÁGINA usa o offset do servidor que vem do contexto", () => {
    // Aparelho 3 h adiantado: pelo relógio dele a especial já teria acabado.
    // Na hora do servidor faltam ~2 h.
    const offset = -3 * H;
    const html = renderizar({
      agendadas: { "ESPECIAL-AIRFRYER": especial(Date.now() + offset + 2 * H) },
      offsetRelogioMs: offset,
    });
    const sec = secaoEspecial(html);
    assert.match(sec, /data-estado="agendada"/, "o offset não chegou ao card");
    assert.match(texto(sec), /0[12] horas/);
  });

  test("na hora (já em `edicoes`): o formulário é o da ESPECIAL, pago em senha", async () => {
    const ctx = { edicoes: { "R-1": R1, "ESPECIAL-AIRFRYER": especial(Date.now() - 60_000, { status: "aberto" }) } };
    // O CardLance é lazy: o 1.º render em SSR dá o espaço reservado e dispara o
    // import. ⚠️ Uma 1.ª versão deste teste aceitava "duplo OU espaço reservado"
    // e, medido, corria SEMPRE o ramo do espaço reservado — a asserção do id
    // nunca executava. O lazy fica em cache depois de resolvido, por isso
    // re-renderiza-se e EXIGE-SE o formulário, sem alternativa.
    const primeiro = secaoEspecial(renderizar(ctx));
    assert.match(primeiro, /data-estado="activa"/);
    assert.match(primeiro, /aria-busy="true"/, "espaço reservado enquanto carrega");
    let sec = "";
    for (let i = 0; i < 50 && !/data-stub="card-lance"/.test(sec); i++) {
      await new Promise((r) => setTimeout(r, 20));
      sec = secaoEspecial(renderizar(ctx));
    }
    assert.match(sec, /data-stub="card-lance"/, "o formulário nunca chegou");
    assert.match(sec, /data-id-edicao="ESPECIAL-AIRFRYER"/, "licitaria noutra edição");
    assert.match(sec, /data-tipo="programado"/, "a especial paga-se em senha (D1 do MC94.1)");
    assert.match(sec, /data-encerrado="false"/);
    assert.doesNotMatch(sec, /href="\/mercado"/, "o /mercado licita na R-1");
  });

  test("na hora, a especial NÃO aparece também em 'Outras Edições'", () => {
    const html = renderizar({
      edicoes: { "R-1": R1, "ESPECIAL-AIRFRYER": especial(Date.now() - 60_000, { status: "aberto" }) },
    });
    assert.doesNotMatch(texto(html), /Outras Edições/, "desenhada duas vezes");
    const fora = html.replace(secaoEspecial(html), "");
    assert.doesNotMatch(fora, /ESPECIAL-AIRFRYER|Air Fryer/, "só o card especial fala dela");
  });

  test("'Outras Edições' continua a mostrar as outras", () => {
    const relamp = { id: "RELAMP-3", tipo: "relampago", produto: "Smart TV", termino_em: "2026-05-31T03:52:13.827Z", lances: 0, status: "encerrado" };
    const html = renderizar({
      edicoes: { "R-1": R1, "RELAMP-3": relamp, "ESPECIAL-AIRFRYER": especial(Date.now() - 60_000, { status: "aberto" }) },
    });
    assert.match(texto(html), /Outras Edições/);
    assert.match(html, /Smart TV/);
  });

  test("sem especial: nenhum card, e a página é a de sempre", () => {
    const html = renderizar();
    assert.equal(secaoEspecial(html), "");
    const t = texto(html);
    for (const s of ["Edição Ativa", "Menor Lance Único", "Acesso Rápido"]) assert.match(t, new RegExp(s));
  });

  test("uma PROG-* em `agendadas` não vira card especial", () => {
    const html = renderizar({ agendadas: { "PROG-9": { ...especial(Date.now() + H), id: "PROG-9" } } });
    assert.equal(secaoEspecial(html), "");
  });
});
