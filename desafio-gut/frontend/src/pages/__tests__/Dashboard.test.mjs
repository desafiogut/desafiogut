// Dashboard.test.mjs — MC94.2, revisto no MC94.3.1. Renderiza a PÁGINA INTEIRA do
// Dashboard, a sério.
//
// Corre com:  node --test src/pages/__tests__/Dashboard.test.mjs
// (a partir de desafio-gut/frontend). Mesmo arnês do MeusAtivos.test.mjs: Vite
// transpila, react-dom/server renderiza, `resolve.alias` troca o AppContext, o
// IdiomaContext e o CardLance por duplos. Nenhum ficheiro do projeto muda.
//
// ⚠️ MC94.3.1 (adendo do operador, 2026-09-25) — REVERSÃO DO DESIGN DO MC94.2.
// O MC94.2 montava a especial numa SECÇÃO PRÓPRIA entre "Edição Ativa" e
// "Acesso Rápido", com a R-1 a continuar ao lado. O operador confirmou que isso
// foi um erro: a especial tem de PREENCHER O SLOT EXISTENTE. Este ficheiro testa
// o novo contrato:
//
//   • sem especial  -> o slot mostra a R-1 de sempre ("🎯 Edição Ativa")
//   • com especial  -> o slot é preenchido pela especial (marca `data-slot`),
//                      o cabeçalho da R-1 DESAPARECE, e o ícone de presente
//                      usa o TAMANHO PADRÃO do ícone, igual às outras edições (MC94.3.2)
//   • a especial continua a NÃO aparecer em "Outras Edições"
//
// ⚠️ Em SSR o `useEffect` não corre, logo o relógio de 1 s do card não avança:
// o card usa o instante do render. As datas são RELATIVAS ao relógio real — uma
// data fixa caducaria no dia do evento (achado da validação do MC94.1).

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
// ⚠️ React e o renderizador vêm do MESMO pipeline do servidor (`_ponte-ssr.mjs`), não do Node:
// importá-los pelo Node dá uma instância diferente da que o componente recebe pelo runner SSR,
// deixando o `ReactCurrentDispatcher` a null (`Cannot read properties of null (reading 'useState')`).
let React = null;
let renderToStaticMarkup = null;
import { fileURLToPath } from "node:url";
import { dirname, resolve as caminho } from "node:path";
import { opcoesServidorTeste, ALIASES } from "../../__tests__/_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const STUBS = caminho(AQUI, "_stubs");
let vite = null;
let Pagina = null;
let MemoryRouter = null;
let definirContexto = null;
// UTAC000.9 (DEBT-008)
let definirResultadoOficial = null;
let edicoesPedidas = null;

before(async () => {
  vite = await createServer({
      ...opcoesServidorTeste(),
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
    resolve: {
      alias: [...ALIASES, 
        { find: /^\.\.\/context\/AppContext\.jsx$/,    replacement: `${STUBS}/AppContext.jsx` },
        { find: /^\.\.\/context\/IdiomaContext\.jsx$/, replacement: `${STUBS}/IdiomaContext.jsx` },
        { find: /^\.\.\/components\/CardLance\.jsx$/,  replacement: `${STUBS}/CardLance.jsx` },
        // UTAC000.9 (DEBT-008) — o resultado OFICIAL é o que este ficheiro controla.
        { find: /^\.\.\/hooks\/useResultadoOficial\.js$/, replacement: `${STUBS}/useResultadoOficial.js` },
      ],
    },
  });
  // A ponte PRIMEIRO: é ela que fixa a instância de React do processo.
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule(`${STUBS}/AppContext.jsx`));
  // UTAC000.9 — duplo do resultado oficial (mesmo ficheiro usado pelos testes do MeusAtivos).
  ({ definirResultadoOficial, argumentos: edicoesPedidas } =
    await vite.ssrLoadModule(`${STUBS}/useResultadoOficial.js`));
  // react-router-dom é CJS: carregado pelo node, que é o que o Vite externaliza em SSR.
  ({ MemoryRouter } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
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
    encerrado: false, modalidade: "flash", DURACAO: { flash: 1800, programado: 86400 },
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
/** O corpo da especial DENTRO do slot (marca `data-slot`, desde o MC94.3.1). */
const dentroDoSlot = (html) => /data-slot="edicao-especial"/.test(html);
/** Lado do ícone de presente, em px, tal como saiu no `style` inline. */
const ladoDoBanner = (html) => html.match(/width:\s*(\d+)px;\s*height:\s*\d+px;\s*flex-shrink:\s*0;\s*border-radius:\s*\d+px;\s*overflow:\s*hidden/)?.[1] ?? null;

// ───────────────────────────────────────────────────────────────────────────
// UTAC000.9 (DEBT-008) — o card «Menor Lance Único» do Dashboard mostra o VENCEDOR OFICIAL.
// Antes: derivava dos lances locais (`vencedor` do contexto = «o menor único que este browser
// viu»). Em mainnet o browser vê pouco ou nada da edição (medido no UTAC000.8 §-1.9).
describe("UTAC000.9 · Dashboard — o vencedor mostrado é o OFICIAL", () => {
  const EU    = "0xaaaa000000000000000000000000000000000001";
  const OUTRO = "0xbbbb000000000000000000000000000000000002";
  // ⚠️ CASO DISCRIMINANTE: o local (100, OUTRO) ≠ o oficial (300, EU). Com o fix o card tem de
  // mostrar o OFICIAL; sem ele mostrava o local — é isso que faz o teste morder.
  const LOCAL  = { endereco: OUTRO, valor: 100 };
  const OFICIAL = { consolidado: true, vencedor: EU, menorUnicoCentavos: 300 };
  const abrev = (e) => `${e.slice(0, 10)}...${e.slice(-6)}`;

  test("com resultado oficial: o card mostra o ENDEREÇO e o VALOR oficiais", () => {
    definirResultadoOficial(OFICIAL);
    const html = renderizar({ vencedor: LOCAL, encerrado: true });
    assert.ok(html.includes(abrev(EU)), "o card não mostra o endereço do vencedor OFICIAL");
    assert.ok(html.includes("R$ 3.00"), "o card não mostra o valor do menor único OFICIAL");
    assert.ok(!html.includes("R$ 1.00"), "o card continua a mostrar o vencedor LOCAL");
  });

  test("SEM resultado oficial: mantém-se o apuramento local (zero regressões)", () => {
    definirResultadoOficial(null);
    const html = renderizar({ vencedor: LOCAL, encerrado: true });
    assert.ok(html.includes(abrev(OUTRO)), "o card deixou de mostrar o vencedor local");
    assert.ok(html.includes("R$ 1.00"), "o card deixou de mostrar o valor local");
  });

  test("o overlay de FIM DE LEILÃO recebe o MESMO vencedor oficial", () => {
    // ⚠️ Sem marcador no markup do overlay, assentar esta prova em `indexOf("FimEdicaoOverlay")`
    // seria um teste VÁCUO (a string não existe no HTML — daria 0 e o `slice` media a página
    // inteira). A prova é por CONTAGEM: com o overlay ligado, o endereço do vencedor oficial
    // aparece DUAS vezes (card + overlay); sem ele, uma. O local não aparece nenhuma.
    const contar = (s, alvo) => s.split(alvo).length - 1;
    definirResultadoOficial(OFICIAL); // ⚠️ ANTES dos dois renders (é estado de módulo do duplo)
    const semOverlay = renderizar({ vencedor: LOCAL, encerrado: true, showOverlay: false });
    const comOverlay = renderizar({ vencedor: LOCAL, encerrado: true, showOverlay: true });
    assert.equal(contar(semOverlay, abrev(EU)), 1, "controlo: o card devia mostrar o oficial uma vez");
    assert.equal(contar(comOverlay, abrev(EU)), 2, "o overlay NÃO recebeu o vencedor oficial");
    assert.equal(contar(comOverlay, abrev(OUTRO)), 0, "o overlay (ou o card) mostra o vencedor LOCAL");
  });

  test("cablagem: o Dashboard pede o resultado da EDIÇÃO ACTIVA", () => {
    definirResultadoOficial(null);
    renderizar({ vencedor: LOCAL });
    assert.deepEqual(edicoesPedidas(), ["R-1"], "o Dashboard não pediu o resultado da edição activa");
  });
});

describe("MC94.2/MC94.3.1 · Dashboard — a edição especial NO SLOT", () => {
  test("antes da hora (em `agendadas`): a especial preenche o slot, com arte e cronómetro", () => {
    const html = renderizar({ agendadas: { "ESPECIAL-AIRFRYER": especial(Date.now() + 5 * H) } });
    assert.ok(dentroDoSlot(html), "a especial não apareceu no slot");
    assert.match(html, /data-estado="agendada"/);
    assert.match(html, /src="\/artes\/edicao-especial-airfryer\.jpg"/);
    assert.match(html, /role="timer"/);
  });

  test("⛔ a secção própria do MC94.2 DESAPARECEU (o teste que o MC94.2 tinha exigia o contrário)", () => {
    const html = renderizar({ agendadas: { "ESPECIAL-AIRFRYER": especial(Date.now() + 5 * H) } });
    assert.doesNotMatch(html, /data-secao="edicao-especial"/, "o antigo marcador de secção voltou");
    const t = texto(html);
    // A R-1 continua na página (o card "Menor Lance Único" e os atalhos ficam),
    // mas o CABEÇALHO do slot deixa de dizer "🎯 Edição Ativa": quem o preenche
    // é a especial, e o cabeçalho tem de dizê-lo.
    assert.match(t, /Edição especial/, "o cabeçalho da especial");
    assert.doesNotMatch(t, /🎯 Edição Ativa/, "o slot continuava a dizer 'Edição Ativa' com a especial lá dentro");
    assert.match(t, /Menor Lance Único/, "a R-1 desapareceu da página");
  });

  test("a especial fica DENTRO do slot — antes do card 'Menor Lance Único'", () => {
    const html = renderizar({ agendadas: { "ESPECIAL-AIRFRYER": especial(Date.now() + 5 * H) } });
    const iEsp = html.indexOf("data-slot=\"edicao-especial\"");
    const iMenor = html.indexOf("Menor Lance Único");
    assert.ok(iEsp >= 0 && iMenor > iEsp, `ordem errada: slot=${iEsp} menor=${iMenor}`);
    // e ANTES de "Outras Edições"/"Acesso Rápido" (não é uma secção de topo)
    const iRapido = html.indexOf("Acesso Rápido");
    assert.ok(iRapido > iEsp, "a especial ficou depois do Acesso Rápido");
  });

  test("MC94.3.2 — o ícone da especial é IGUAL ao padrão das outras edições (não maior)", () => {
    // Medido no SEG-1: o padrão é 52 px (default do EdicaoBanner e o que a R-1 usa).
    // O MC94.3.1 tinha-o subido a 96 px SÓ na especial; o operador corrigiu: a
    // especial tem de ficar IGUAL, não maior. Este teste exige a IGUALDADE — não
    // um literal — para que uma futura alteração do padrão não volte a divergir.
    const comEspecial = renderizar({ agendadas: { "ESPECIAL-AIRFRYER": especial(Date.now() + 5 * H) } });
    const semEspecial = renderizar();
    const ladoEspecial = ladoDoBanner(comEspecial);
    const ladoR1 = ladoDoBanner(semEspecial);
    assert.ok(ladoEspecial, "não medi o ícone da especial");
    assert.equal(ladoEspecial, ladoR1, `a especial (${ladoEspecial}px) difere do padrão da R-1 (${ladoR1}px)`);
    assert.equal(ladoEspecial, "52", "o padrão medido no SEG-1 é 52 px");
  });

  test("sem especial: nenhuma marca de slot, e a página é a de sempre", () => {
    const html = renderizar();
    assert.equal(dentroDoSlot(html), false, "apareceu um card especial sem haver especial");
    const t = texto(html);
    for (const s of ["🎯 Edição Ativa", "Menor Lance Único", "Acesso Rápido"]) assert.match(t, new RegExp(s));
    assert.doesNotMatch(t, /🎁 Edição especial/);
  });

  test("a contagem do slot usa o offset do servidor que vem do contexto", () => {
    // Aparelho 3 h adiantado: pelo relógio dele a especial já teria acabado.
    // Na hora do servidor faltam ~2 h.
    const offset = -3 * H;
    const html = renderizar({
      agendadas: { "ESPECIAL-AIRFRYER": especial(Date.now() + offset + 2 * H) },
      offsetRelogioMs: offset,
    });
    assert.match(html, /data-estado="agendada"/, "o offset não chegou ao card");
    assert.match(texto(html), /0[12] horas/);
  });

  // MC94.4.1 — era "pago em senha" (R18 antiga do MC94.1). O operador reverteu: a
  // especial é RELÂMPAGO e o lance debita SALDO R$ a partir de R$ 0,01.
  test("na hora (já em `edicoes`): o formulário é o da ESPECIAL, pago em SALDO (flash)", async () => {
    const ctx = { edicoes: { "R-1": R1, "ESPECIAL-AIRFRYER": especial(Date.now() - 60_000, { status: "aberto" }) } };
    // O CardLance é lazy: o 1.º render em SSR dá o espaço reservado e dispara o
    // import. ⚠️ Uma 1.ª versão deste teste aceitava "duplo OU espaço reservado"
    // e, medido, corria SEMPRE o ramo do espaço reservado — a asserção do id
    // nunca executava. O lazy fica em cache depois de resolvido, por isso
    // re-renderiza-se e EXIGE-SE o formulário, sem alternativa.
    const primeiro = renderizar(ctx);
    assert.match(primeiro, /data-estado="activa"/);
    assert.match(primeiro, /aria-busy="true"/, "espaço reservado enquanto carrega");
    let html = "";
    for (let i = 0; i < 50 && !/data-stub="card-lance"/.test(html); i++) {
      await new Promise((r) => setTimeout(r, 20));
      html = renderizar(ctx);
    }
    assert.match(html, /data-stub="card-lance"/, "o formulário nunca chegou");
    assert.match(html, /data-id-edicao="ESPECIAL-AIRFRYER"/, "licitaria noutra edição");
    assert.match(html, /data-tipo="flash"/, "a especial debita SALDO R$ (MC94.4.1), não senha");
    assert.match(html, /data-encerrado="false"/);
    // O botão do slot da R-1 desapareceu com a especial lá dentro.
    assert.doesNotMatch(texto(html), /Ir para o Mercado de Lances/, "o botão da R-1 ficou no slot da especial");
  });

  test("na hora, a especial NÃO aparece também em 'Outras Edições'", () => {
    const html = renderizar({
      edicoes: { "R-1": R1, "ESPECIAL-AIRFRYER": especial(Date.now() - 60_000, { status: "aberto" }) },
    });
    assert.doesNotMatch(texto(html), /Outras Edições/, "desenhada duas vezes");
    // Contagem directa: a especial tem de aparecer UMA vez em todo o ecrã.
    const vezes = (texto(html).match(/Air Fryer/g) || []).length;
    assert.equal(vezes, 1, `a especial apareceu ${vezes} vezes no ecrã`);
  });

  test("'Outras Edições' continua a mostrar as outras", () => {
    const relamp = { id: "RELAMP-3", tipo: "relampago", produto: "Smart TV", termino_em: "2026-05-31T03:52:13.827Z", lances: 0, status: "encerrado" };
    const html = renderizar({
      edicoes: { "R-1": R1, "RELAMP-3": relamp, "ESPECIAL-AIRFRYER": especial(Date.now() - 60_000, { status: "aberto" }) },
    });
    assert.match(texto(html), /Outras Edições/);
    assert.match(html, /Smart TV/);
  });

  test("uma PROG-* em `agendadas` não vira card especial", () => {
    const html = renderizar({ agendadas: { "PROG-9": { ...especial(Date.now() + H), id: "PROG-9" } } });
    assert.equal(dentroDoSlot(html), false);
    assert.match(texto(html), /🎯 Edição Ativa/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// UTAC000.12 (DEBT-012) — O VALOR do card «🏆 Menor Lance Único» do Dashboard.
// Achado do validador adversarial do UTAC000.11: a guarda nova do `OverlayVencedor` «espelhava a
// do Dashboard (l. 410)» — verdade SÓ para o endereço. A linha do VALOR do card
// (`Dashboard.jsx` l. 416) nunca teve guarda: `R$ {(vencedorExibido.valor / 100).toFixed(2)}` ⇒
// com valor ausente/absurdo mostrava «R$ NaN» ou «R$ -0.01». Latente (o caminho oficial valida o
// valor), mas é a mesma classe da DEBT-011 — e é o IRMÃO dela.
// Regra (a mesma do UTAC000.11): malformado = AUSENTE («—»), campo a campo; com valor válido NADA
// muda (GATE 18).
describe("UTAC000.12 · Dashboard — o VALOR do card não mostra NaN nem absurdo (DEBT-012)", () => {
  const EU = "0xaaaa000000000000000000000000000000000001";
  const abrev = (e) => `${e.slice(0, 10)}...${e.slice(-6)}`;

  /** O bloco do card do vencedor: do título até ao fim do `<section>` dele.
   *  ⚠️ Medido (sonda): o `</h3>` seguinte só aparece muito depois (a 2.ª secção usa outra
   *  estrutura), e o texto de estado «🔄 Liderando — pode ser superado» TEM um travessão —
   *  por isso os «—» dos CAMPOS contam-se como `>—<` (o div vazio), não como `/—/g`. */
  function blocoDoCard(html) {
    const i = html.indexOf("🏆 Menor Lance Único");
    if (i < 0) return "";
    const resto = html.slice(i);
    const j = resto.indexOf("</section>");
    return j > 0 ? resto.slice(0, j) : resto;
  }
  const camposVazios = (bloco) => (bloco.match(/>—</g) || []).length;

  const CASOS = [
    // [nome,                                vencedor (LOCAL, sem oficial),  endereço esperado, valor esperado]
    ["objecto vazio",                        {},                             "—",              "—"],
    ["endereço presente, valor ausente",     { endereco: EU },               abrev(EU),        "—"],
    ["valor NaN",                            { endereco: EU, valor: NaN },   abrev(EU),        "—"],
    ["valor string (não numérico)",          { endereco: EU, valor: "abc" }, abrev(EU),        "—"],
    ["valor negativo",                       { endereco: EU, valor: -1 },    abrev(EU),        "—"],
    ["valor Infinity",                       { endereco: EU, valor: Infinity }, abrev(EU),     "—"],
    // ── Limites (acrescentados na 2.ª ronda, depois de medir a semântica da guarda):
    //    `0` é VÁLIDO (não é malformado!) e tem de continuar a formatar; `-0` é zero;
    //    BigInt e Symbol são os dois casos em que o código ANTIGO **LANÇAVA EXCEPÇÃO**
    //    («Cannot mix BigInt and other types» / «Cannot convert a Symbol value to a number»)
    //    — medido: `Number.isFinite(bigint|symbol)` devolve `false` SEM lançar.
    ["valor 0 (válido! não é malformado)",   { endereco: EU, valor: 0 },     abrev(EU),        "R$ 0.00"],
    ["valor -0 (zero negativo)",             { endereco: EU, valor: -0 },    abrev(EU),        "R$ 0.00"],
    ["valor BigInt (o antigo lançava)",      { endereco: EU, valor: 300n },  abrev(EU),        "—"],
    ["valor Symbol (o antigo lançava)",      { endereco: EU, valor: Symbol("x") }, abrev(EU), "—"],
    //    `0.5` centavo e `MAX_SAFE_INTEGER`/`1e21` (limites do Number) — ressalva (i) do validador;
    //    e `"300"` (string): ⚠️ ALTERAÇÃO DECLARADA — o código ANTIGO mostrava «R$ 3.00» e agora
    //    mostra «—» (a regra é «malformado = ausente»); strings não chegam em produção (os dois
    //    produtores numerificam), mas é uma mudança real e fica coberta por teste.
    ["0.5 centavo (arredonda)",              { endereco: EU, valor: 0.5 },   abrev(EU),        "R$ 0.01"],
    ["MAX_SAFE_INTEGER",                     { endereco: EU, valor: Number.MAX_SAFE_INTEGER }, abrev(EU), "R$ 90071992547409.91"],
    ["1e21 (fora do intervalo seguro)",      { endereco: EU, valor: 1e21 },  abrev(EU),        "R$ 10000000000000000000.00"],
    ["string \"300\" (mudou: era «R$ 3.00»)",{ endereco: EU, valor: "300" }, abrev(EU),        "—"],
    ["VÁLIDO (o caso que não pode mudar)",   { endereco: EU, valor: 300 },   abrev(EU),        "R$ 3.00"],
  ];

  for (const [nome, vencedor, enderecoEsperado, valorEsperado] of CASOS) {
    test(`${nome}: endereço «${enderecoEsperado}», valor «${valorEsperado}»`, () => {
      definirResultadoOficial(null); // o card usa o vencedor LOCAL do contexto
      const bloco = blocoDoCard(renderizar({ vencedor, encerrado: true }));
      assert.ok(bloco.includes("Menor Lance Único"), "controlo: o card do vencedor não foi encontrado");
      assert.ok(!/R\$ NaN/.test(bloco), "o card mostrou «R$ NaN»");
      assert.ok(!/R\$ -/.test(bloco), "o card formatou um valor NEGATIVO");
      assert.ok(bloco.includes(enderecoEsperado), `endereço: esperava «${enderecoEsperado}»`);
      assert.ok(bloco.includes(valorEsperado), `valor: esperava «${valorEsperado}»`);
      const tracos = (enderecoEsperado === "—" ? 1 : 0) + (valorEsperado === "—" ? 1 : 0);
      assert.equal(camposVazios(bloco), tracos, `esperava ${tracos} campo(s) «—» no bloco`);
    });
  }

  test("o card VÁLIDO não ganhou nenhum «—» (GATE 18)", () => {
    definirResultadoOficial(null);
    const bloco = blocoDoCard(renderizar({ vencedor: { endereco: EU, valor: 300 }, encerrado: true }));
    assert.equal(camposVazios(bloco), 0, "apareceu «—» num campo do caso válido");
    assert.ok(bloco.includes("R$ 3.00"), "controlo: o valor válido devia estar no bloco");
  });
});
