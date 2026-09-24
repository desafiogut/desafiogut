// MC93-A — motor de pontuação do torneio de habilidade (funções PURAS).
//
// PORQUÊ ESTE TESTE EXISTE: a pontuação decide prémio. Um erro aqui não é um
// bug de ecrã — é dinheiro atribuído à pessoa errada. E o motor nasce sem
// caminho de execução real (o leilão está travado em EM_BREVE_MODE), logo a
// suíte é a ÚNICA prova de que ele funciona: não há ambiente onde observá-lo.
//
// O SEG-1 deste MC refutou 7 das 9 premissas do enunciado. Três consequências
// estão gravadas nestes testes, para não se perderem:
//   1. a chave do participante é `endereco` (carteira), não `usuario_id` —
//      não existe tabela `usuarios` no projeto;
//   2. a forma de um lance é { endereco, valorCentavos, nomeExibicao? },
//      que é a assinatura já usada por `_lib/simulador.mjs`;
//   3. "lance único" tem UMA definição no projeto (apurarMenorLanceUnico);
//      o motor reutiliza-a em vez de reimplementar a contagem, senão passam a
//      existir duas definições que podem divergir — o defeito que o MC88.43
//      documentou para o estado da edição.
//
// node --test --experimental-test-module-mocks _tests/mc93-pontuacao.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  REGRAS,
  calcularPontosRodada,
  detectarConsecutivos,
  atualizarRanking,
} from "../_lib/pontuacao-utils.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));

// Mesma convenção do mc8843: as asserções de ESTRUTURA leem código, não prosa.
// Sem isto, uma linha de comentário a explicar a proibição dispara a própria
// proibição — foi o que aconteceu na primeira execução deste ficheiro.
const semComentarios = (src) =>
  src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
const lerModulo = () =>
  semComentarios(readFileSync(resolve(AQUI, "../_lib/pontuacao-utils.mjs"), "utf8"));

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const C = "0xcccccccccccccccccccccccccccccccccccccccc";

const lance = (endereco, valorCentavos) => ({ endereco, valorCentavos });
const pontosDe = (mapa, endereco) => mapa.get(endereco.toLowerCase())?.pontos ?? 0;

// ── REGRAS: os números do torneio, fixados em literal ────────────────────────
//
// PORQUÊ ESTE TESTE EXISTE: na primeira prova de mutação (SEG4), baixar
// PONTOS_MENOR_UNICO de 3 para 0 e subir PONTOS_ACERTO_UNICO de 1 para 2
// deixou a suíte TODA verde. A causa: as asserções comparavam o resultado
// contra `REGRAS.*` — a mesma constante que o código usa — logo os dois lados
// mudavam juntos. Um teste que partilha a premissa com o código não testa
// nada. Aqui os valores estão em literal, porque é a REGRA DE NEGÓCIO que se
// quer proteger, não a coerência interna do módulo.
//
// Se o MC95 ratificar outros números, este teste falha DE PROPÓSITO: a
// alteração passa a ser uma decisão consciente, não um deslize silencioso.

test("REGRAS: os valores são os decididos pelo operador (+1 / +3 / 5 seguidos → +5 e 20 senhas)", () => {
  assert.equal(REGRAS.PONTOS_ACERTO_UNICO, 1, "+1 ponto por acerto de lance único");
  assert.equal(REGRAS.PONTOS_MENOR_UNICO, 3, "+3 pontos pelo menor lance único da rodada");
  assert.equal(REGRAS.ACERTOS_PARA_BONUS, 5, "bónus a cada 5 acertos consecutivos");
  assert.equal(REGRAS.PONTOS_BONUS, 5, "+5 pontos pela sequência");
  assert.equal(REGRAS.SENHAS_BONUS, 20, "+20 senhas pela sequência");
  assert.ok(Object.isFrozen(REGRAS), "REGRAS tem de ser imutável em runtime");
});

test("REGRAS em literal: o menor lance único vale exactamente 4 pontos", () => {
  // 1 (acerto) + 3 (menor) = 4. Em literal, de propósito — ver o teste acima.
  const mapa = calcularPontosRodada([lance(A, 30), lance(B, 70), lance(C, 50), lance(C, 50)]);
  assert.equal(mapa.get(A.toLowerCase()).pontos, 4, "menor lance único = 1 + 3");
  assert.equal(mapa.get(B.toLowerCase()).pontos, 1, "acerto sem ser o menor = 1");
});

test("REGRAS em literal: 5 seguidos valem 5 pontos e 20 senhas", () => {
  const r = detectarConsecutivos([true, true, true, true, true]);
  assert.equal(r.pontosBonus, 5);
  assert.equal(r.senhasBonus, 20);
});

// ── calcularPontosRodada ─────────────────────────────────────────────────────

test("calcular pontos: um acerto de lance único vale exactamente PONTOS_ACERTO_UNICO", () => {
  // B e C repetem 50 (não são únicos). A é o único com 70 → 1 acerto.
  // A não leva o bónus de menor único porque 70 é o único valor único e,
  // sendo o único, É o menor — então isolamos com um segundo valor único menor.
  const mapa = calcularPontosRodada([
    lance(A, 70),
    lance(B, 50),
    lance(C, 50),
    lance(B, 30), // valor único E menor → B fica com o bónus de menor
  ]);

  assert.equal(pontosDe(mapa, A), REGRAS.PONTOS_ACERTO_UNICO,
    "A tem 1 lance único e não é o menor → só o ponto de acerto");
  assert.equal(mapa.get(A.toLowerCase()).acertos, 1);
  assert.equal(mapa.get(A.toLowerCase()).menorUnico, false);
});

test("calcular pontos: o menor lance único acumula acerto + bónus de menor", () => {
  const mapa = calcularPontosRodada([
    lance(A, 30), // único e menor
    lance(B, 70), // único
    lance(C, 50),
    lance(C, 50), // repetido → não pontua
  ]);

  assert.equal(pontosDe(mapa, A), REGRAS.PONTOS_ACERTO_UNICO + REGRAS.PONTOS_MENOR_UNICO,
    "o menor único soma o ponto de acerto E o bónus de menor");
  assert.equal(mapa.get(A.toLowerCase()).menorUnico, true);
  assert.equal(pontosDe(mapa, B), REGRAS.PONTOS_ACERTO_UNICO,
    "B acerta mas não é o menor");
  assert.equal(pontosDe(mapa, C), 0, "valor repetido não pontua");
});

test("calcular pontos: lance repetido não pontua e não conta como acerto", () => {
  const mapa = calcularPontosRodada([lance(A, 50), lance(B, 50)]);
  assert.equal(pontosDe(mapa, A), 0);
  assert.equal(pontosDe(mapa, B), 0);
  assert.equal(mapa.size, 0, "rodada sem nenhum único não cria entradas");
});

test("calcular pontos: o mesmo endereço com dois lances únicos soma dois acertos", () => {
  const mapa = calcularPontosRodada([
    lance(A, 30), // único e menor
    lance(A, 70), // único
    lance(B, 50),
    lance(C, 50),
  ]);
  assert.equal(mapa.get(A.toLowerCase()).acertos, 2);
  assert.equal(pontosDe(mapa, A), REGRAS.PONTOS_ACERTO_UNICO * 2 + REGRAS.PONTOS_MENOR_UNICO);
});

test("calcular pontos: endereço é normalizado para minúsculas (mesma carteira, uma entrada)", () => {
  const mapa = calcularPontosRodada([
    lance(A.toUpperCase(), 30),
    lance(A, 70),
    lance(B, 50),
    lance(C, 50),
  ]);
  assert.equal(mapa.size, 1, "0xAAA… e 0xaaa… são a MESMA carteira");
  assert.equal(mapa.get(A.toLowerCase()).acertos, 2);
});

test("calcular pontos: entrada inválida não rebenta nem inventa pontos", () => {
  for (const entrada of [null, undefined, [], "lances", 42, [{}, { valorCentavos: "x" }]]) {
    const mapa = calcularPontosRodada(entrada);
    assert.ok(mapa instanceof Map, `${JSON.stringify(entrada)} devia devolver um Map`);
    assert.equal(mapa.size, 0);
  }
});

test("calcular pontos: valores não inteiros são ignorados (espelha apurarMenorLanceUnico)", () => {
  const mapa = calcularPontosRodada([
    lance(A, 30.5), // ignorado
    lance(B, 70),   // único e, com o 30.5 fora, o menor
    lance(C, 90),   // único
  ]);
  assert.equal(pontosDe(mapa, A), 0, "valor fraccionário não pontua");
  assert.equal(mapa.get(B.toLowerCase()).menorUnico, true);
});

// ── detectarConsecutivos ─────────────────────────────────────────────────────

test("detectar consecutivos: 5 acertos seguidos concedem exactamente um bónus", () => {
  const r = detectarConsecutivos([true, true, true, true, true]);
  assert.equal(r.bonus, 1);
  assert.equal(r.sequenciaAtual, 5);
  assert.equal(r.maiorSequencia, 5);
  assert.equal(r.pontosBonus, REGRAS.PONTOS_BONUS);
  assert.equal(r.senhasBonus, REGRAS.SENHAS_BONUS);
});

test("detectar consecutivos: 4 acertos seguidos NÃO concedem bónus", () => {
  const r = detectarConsecutivos([true, true, true, true]);
  assert.equal(r.bonus, 0);
  assert.equal(r.pontosBonus, 0);
  assert.equal(r.senhasBonus, 0);
  assert.equal(r.sequenciaAtual, 4);
});

test("detectar consecutivos: um falhado parte a sequência", () => {
  const r = detectarConsecutivos([true, true, false, true, true, true]);
  assert.equal(r.bonus, 0, "nenhuma corrida chega a 5");
  assert.equal(r.maiorSequencia, 3);
  assert.equal(r.sequenciaAtual, 3, "a sequência viva é a do fim do histórico");
});

test("detectar consecutivos: 10 seguidos dão dois bónus (regra 'a cada 5')", () => {
  const r = detectarConsecutivos(Array(10).fill(true));
  assert.equal(r.bonus, 2);
  assert.equal(r.pontosBonus, REGRAS.PONTOS_BONUS * 2);
  assert.equal(r.senhasBonus, REGRAS.SENHAS_BONUS * 2);
});

test("detectar consecutivos: duas corridas de 5 separadas dão dois bónus", () => {
  const r = detectarConsecutivos([
    true, true, true, true, true,
    false,
    true, true, true, true, true,
  ]);
  assert.equal(r.bonus, 2);
  assert.equal(r.sequenciaAtual, 5);
});

test("detectar consecutivos: aceita histórico de objectos { acertou }", () => {
  const r = detectarConsecutivos(Array(5).fill({ acertou: true }));
  assert.equal(r.bonus, 1, "a forma de registo de rodada também é aceite");
});

test("detectar consecutivos: histórico vazio ou inválido é zero, não erro", () => {
  for (const entrada of [null, undefined, [], "abc", 7]) {
    const r = detectarConsecutivos(entrada);
    assert.equal(r.bonus, 0);
    assert.equal(r.sequenciaAtual, 0);
    assert.equal(r.maiorSequencia, 0);
  }
});

// ── atualizarRanking ─────────────────────────────────────────────────────────

test("atualizar ranking: ordena por pontos e atribui posição", () => {
  const r = atualizarRanking([
    { endereco: B, pontosTotais: 5 },
    { endereco: A, pontosTotais: 12 },
    { endereco: C, pontosTotais: 9 },
  ]);
  assert.deepEqual(r.map((x) => x.endereco), [A.toLowerCase(), C.toLowerCase(), B.toLowerCase()]);
  assert.deepEqual(r.map((x) => x.posicao), [1, 2, 3]);
});

test("atualizar ranking: empate partilha posição e a seguinte salta (padrão 1-2-2-4)", () => {
  const r = atualizarRanking([
    { endereco: A, pontosTotais: 10 },
    { endereco: B, pontosTotais: 7 },
    { endereco: C, pontosTotais: 7 },
    { endereco: "0xdddddddddddddddddddddddddddddddddddddddd", pontosTotais: 1 },
  ]);
  assert.deepEqual(r.map((x) => x.posicao), [1, 2, 2, 4],
    "dois empatados em 2º → o seguinte é 4º, não 3º");
});

test("atualizar ranking: empate tem ordem determinística (por endereço)", () => {
  const entrada = [
    { endereco: C, pontosTotais: 7 },
    { endereco: B, pontosTotais: 7 },
  ];
  const r1 = atualizarRanking(entrada);
  const r2 = atualizarRanking([...entrada].reverse());
  assert.deepEqual(r1.map((x) => x.endereco), r2.map((x) => x.endereco),
    "a ordem do input NÃO pode mudar o ranking — decide prémio");
  assert.equal(r1[0].endereco, B.toLowerCase(), "endereço menor primeiro");
});

test("atualizar ranking: aceita o Map devolvido por calcularPontosRodada", () => {
  const mapa = calcularPontosRodada([
    lance(A, 30), lance(B, 70), lance(C, 50), lance(C, 50),
  ]);
  const r = atualizarRanking(mapa);
  assert.equal(r[0].endereco, A.toLowerCase());
  assert.equal(r[0].pontosTotais, REGRAS.PONTOS_ACERTO_UNICO + REGRAS.PONTOS_MENOR_UNICO);
  assert.equal(r[0].posicao, 1);
});

test("atualizar ranking: entrada inválida devolve lista vazia", () => {
  for (const entrada of [null, undefined, "x", 3, []]) {
    assert.deepEqual(atualizarRanking(entrada), []);
  }
});

// ── VALIDAÇÃO DE ENTRADA — os pontos cegos que a validação do SEG4 expôs ─────
//
// Todos estes testes nasceram de defeitos REAIS encontrados por verificação
// independente, não de imaginação. Cada um documenta o defeito que mata.

test("coerção: valorCentavos null/''/false/[] NÃO é um lance de 0 centavos", () => {
  // DEFEITO ORIGINAL: `Number.isInteger(Number(null))` é true, porque
  // Number(null) === 0. Um lance nulo virava único, o mais baixo, e VENCEDOR.
  // Há caminho real: _lib/data-store-supabase.mjs:117 grava valor_centavos=null
  // DE PROPÓSITO para marcar lance inválido.
  for (const lixo of [null, undefined, "", false, [], "50", "0x10", true, [4]]) {
    const mapa = calcularPontosRodada([
      { endereco: A, valorCentavos: lixo },
      lance(B, 50),
      lance(C, 90),
    ]);
    assert.equal(pontosDe(mapa, A), 0, `valorCentavos=${JSON.stringify(lixo)} não pode pontuar`);
    assert.equal(mapa.get(B.toLowerCase()).menorUnico, true,
      "o menor único tem de ser o menor lance VÁLIDO, não o lixo coagido a 0");
  }
});

test("Art. XXIII: zero e negativos não são lances (mínimo R$ 0,01)", () => {
  const mapa = calcularPontosRodada([lance(A, 0), lance(B, -5), lance(C, 10)]);
  assert.equal(pontosDe(mapa, A), 0, "0 centavos não é lance");
  assert.equal(pontosDe(mapa, B), 0, "valor negativo não é lance");
  assert.equal(mapa.get(C.toLowerCase()).menorUnico, true);
  assert.equal(REGRAS.VALOR_MINIMO_CENTAVOS, 1, "o mínimo legal é 1 centavo");
});

test("lance válido sem endereço não rouba o bónus de menor único", () => {
  // DEFEITO ORIGINAL: o lance sem endereço continuava na lista, era eleito
  // menor único, e ninguém recebia os +3 — evaporavam-se em vez de passarem
  // ao lance atribuível seguinte.
  const mapa = calcularPontosRodada([
    { valorCentavos: 10 },            // válido no valor, sem dono
    lance(B, 20),
    lance(C, 30),
  ]);
  assert.equal(mapa.get(B.toLowerCase()).menorUnico, true,
    "o +3 passa ao menor lance ATRIBUÍVEL");
  assert.equal(mapa.get(B.toLowerCase()).pontos, 4);
});

test("endereço vazio não cria participante fantasma", () => {
  const mapa = calcularPontosRodada([{ endereco: "", valorCentavos: 10 }, lance(B, 20)]);
  assert.equal(mapa.size, 1);
  assert.ok(!mapa.has(""), "string vazia não é uma carteira");
});

test("ranking: líder com 0 pontos continua em 1º (não em 0º)", () => {
  // DEFEITO POSSÍVEL: com `pontosAnteriores` inicializado a 0 em vez de null,
  // um líder com 0 pontos receberia posicao 0 e toda a tabela descia.
  const r = atualizarRanking([{ endereco: A, pontosTotais: 0 }, { endereco: B, pontosTotais: 0 }]);
  assert.deepEqual(r.map((x) => x.posicao), [1, 1]);
});

test("ranking: chave não-textual não rebenta (Map com chaves numéricas)", () => {
  // DEFEITO ORIGINAL: o caminho do Map não normalizava nem filtrava, ao
  // contrário do caminho da lista → `a.endereco.localeCompare` lançava
  // TypeError. Duas políticas na mesma função.
  assert.deepEqual(atualizarRanking(new Map([[42, { pontos: 1 }], [7, { pontos: 1 }]])), []);
});

test("ranking: a mesma carteira não ocupa duas posições — agrega", () => {
  const r = atualizarRanking([
    { endereco: A, pontosTotais: 3 },
    { endereco: A.toUpperCase(), pontosTotais: 4 },
    { endereco: B, pontosTotais: 5 },
  ]);
  assert.equal(r.length, 2);
  assert.equal(r[0].endereco, A.toLowerCase());
  assert.equal(r[0].pontosTotais, 7, "3 + 4 na mesma carteira");
});

test("consecutivos: falha FECHADO — só `true` estrito conta como acerto", () => {
  // Este contador decide a emissão de 20 senhas (R$ 40,00) por sequência.
  // `Boolean("sim")` é true; um histórico mal formado pagava o bónus.
  for (const truthy of ["sim", 1, "true", {}, []]) {
    const r = detectarConsecutivos(Array(5).fill({ acertou: truthy }));
    assert.equal(r.bonus, 0, `acertou=${JSON.stringify(truthy)} não pode pagar bónus`);
    assert.equal(r.senhasBonus, 0);
  }
  assert.equal(detectarConsecutivos(Array(5).fill({ acertou: true })).bonus, 1);
});

// ── ESTRUTURA — o motor não pode ganhar efeitos colaterais ───────────────────

test("R1: pontuacao-utils é PURO — sem I/O, sem rede, sem on-chain", () => {
  const codigo = lerModulo();
  const proibidos = [
    [/@netlify\/blobs|getStore\s*\(/, "Netlify Blobs"],
    [/@supabase|createClient\s*\(/, "Supabase"],
    [/\bfetch\s*\(/, "rede"],
    [/from\s+["']ethers["']|creditarSenhas|adicionarSenhas/, "on-chain / emissão de senhas"],
    [/node:fs|readFileSync|writeFileSync/, "sistema de ficheiros"],
    [/process\.env/, "ambiente"],
  ];
  for (const [padrao, nome] of proibidos) {
    assert.doesNotMatch(codigo, padrao,
      `o motor de pontuação não pode tocar em ${nome} — MC93-A é puro por decisão do operador`);
  }
});

test("R1: a definição de 'lance único' não foi duplicada", () => {
  const codigo = lerModulo();
  assert.match(codigo, /from\s+["']\.\/simulador\.mjs["']/,
    "tem de importar apurarMenorLanceUnico de _lib/simulador.mjs, não reimplementá-la");
  assert.match(codigo, /apurarMenorLanceUnico\s*\(/,
    "importar não chega — tem de a CHAMAR. A validação do SEG4 mostrou que o "
    + "teste anterior só verificava a linha de import: apagar a chamada e "
    + "reimplementar a lógica localmente deixava a suíte toda verde.");
});

test("o módulo não executa I/O próprio — mas ARRASTA @netlify/blobs no import", async () => {
  // A validação independente do SEG4 mostrou que a asserção de pureza acima é
  // CEGA ATRAVÉS DO IMPORT: é uma regex sobre o texto deste ficheiro, e
  // `_lib/simulador.mjs` importa `@netlify/blobs`. As funções são puras (não
  // executam I/O), mas carregar este módulo carrega o SDK dos Blobs.
  //
  // Este teste não finge que o problema não existe: fixa-o por escrito, para
  // que o MC93-B decida conscientemente entre inverter a dependência e aceitar
  // o peso no bundle da função.
  const simulador = readFileSync(resolve(AQUI, "../_lib/simulador.mjs"), "utf8");
  assert.match(simulador, /@netlify\/blobs/,
    "se simulador.mjs deixar de importar Blobs, este teste deixa de fazer "
    + "sentido e o motor passa a ser puro também no grafo de imports — "
    + "actualizar o comentário e a nota em docs/TORNEIO-HABILIDADE.md");
});
