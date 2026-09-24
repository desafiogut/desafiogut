// MC93-A — motor de pontuação do torneio de habilidade. FUNÇÕES PURAS.
//
// PORQUÊ ESTE MÓDULO É PURO (e tem de continuar a ser):
// O SEG-1 do MC93 refutou 7 das 9 premissas do enunciado e encontrou 6
// contradições de política — entre elas, que o "bónus de 20 senhas" é uma
// transação ON-CHAIN em mainnet (custo de gas real + R$ 40,00 de valor por
// evento), e que o regulamento em vigor ainda promete "O MENOR LANCE ÚNICO
// GANHA" (Art. 8). O operador decidiu, durante o MC, executar só o motor puro.
// Em consequência, este módulo CALCULA e não EXECUTA: devolve quantos pontos e
// quantas senhas seriam devidos, e nunca credita, grava ou submete nada.
// A persistência, os endpoints e a emissão ficam para o MC93-B, depois de
// resolvidas as decisões D2/D4 (natureza jurídica) e de reativada a R2 (custo).
//
// Há um teste de estrutura (`mc93-pontuacao.test.mjs`) que falha se alguém
// importar Blobs, Supabase, ethers, fetch, fs ou process.env aqui dentro.
//
// REGRAS, e onde mudá-las: todas as constantes numéricas vivem em `REGRAS`.
// Quando o MC95 fixar o regulamento, muda-se ali — num sítio só — e a lógica
// não se toca. Foi para isto que o motor nasceu antes da integração.

import { apurarMenorLanceUnico } from "./simulador.mjs";

/**
 * Parâmetros do torneio. FONTE ÚNICA — não repetir estes números no código.
 *
 * ⚠️ Três destes valores são decisões do operador ainda NÃO ratificadas pelo
 * regulamento (MC95). Ver docs/TORNEIO-HABILIDADE.md §Lacunas:
 *   - ACERTOS_PARA_BONUS aplica-se "a cada N" (10 acertos = 2 bónus), e não
 *     "uma vez só";
 *   - o desempate do ranking é por endereço ascendente;
 *   - "acerto" = ter feito um lance cujo valor é único na rodada.
 */
export const REGRAS = Object.freeze({
  /**
   * Lance mínimo aceite, em centavos (Art. XXIII — R$ 0,01).
   * Existe porque a validação independente do SEG4 mostrou que sem ela
   * `valorCentavos: null` virava um lance de 0 centavos, único e o mais baixo
   * — ou seja, VENCEDOR. E há um caminho real para isso: o
   * `_lib/data-store-supabase.mjs:117` grava `valor_centavos = null` DE
   * PROPÓSITO para marcar um lance inválido. As duas convenções eram opostas.
   */
  VALOR_MINIMO_CENTAVOS: 1,
  /** Pontos por cada lance único do participante na rodada (Art. VIII). */
  PONTOS_ACERTO_UNICO: 1,
  /** Bónus de pontos para quem fez o MENOR lance único da rodada. */
  PONTOS_MENOR_UNICO: 3,
  /** Acertos consecutivos necessários para disparar o bónus de sequência. */
  ACERTOS_PARA_BONUS: 5,
  /** Pontos concedidos por cada sequência completa. */
  PONTOS_BONUS: 5,
  /** Senhas concedidas por cada sequência completa. NÃO são emitidas aqui. */
  SENHAS_BONUS: 20,
});

/** Normaliza um endereço de carteira para a forma canónica de comparação. */
function normalizarEndereco(valor) {
  return typeof valor === "string" && valor.length > 0 ? valor.toLowerCase() : null;
}

/**
 * Um lance só conta se for ATRIBUÍVEL e o valor for um inteiro em centavos
 * dentro do mínimo legal.
 *
 * ⚠️ `Number.isInteger(x)` é ESTRITO — não coage. Era o `Number()` à volta
 * dele que criava o defeito: `Number.isInteger(Number(null))` é `true`, porque
 * `Number(null) === 0`. O mesmo para `""`, `false`, `[]`, `"50"` e `true`. Um
 * lance nulo virava um lance de 0 centavos: único, o mais baixo, VENCEDOR.
 * Há caminho real para isso — `_lib/data-store-supabase.mjs:117` grava
 * `valor_centavos = null` DE PROPÓSITO para marcar um lance inválido.
 *
 * Sem endereço também não conta: um lance que não se consegue atribuir não
 * pode pontuar nem levar o bónus de menor único — e, se ficasse na lista,
 * ganhava o bónus para ninguém, fazendo os +3 evaporarem-se em vez de
 * passarem ao lance válido seguinte.
 */
function lanceValido(l) {
  return Number.isInteger(l?.valorCentavos)
    && l.valorCentavos >= REGRAS.VALOR_MINIMO_CENTAVOS
    && normalizarEndereco(l?.endereco) !== null;
}

/** Conta quantas vezes cada valor aparece, sobre uma lista JÁ filtrada. */
function contarPorValor(lista) {
  const contagem = new Map();
  for (const l of lista) {
    contagem.set(l.valorCentavos, (contagem.get(l.valorCentavos) || 0) + 1);
  }
  return contagem;
}

/**
 * Pontua uma rodada.
 *
 * Cada lance cujo valor apareça exactamente uma vez vale PONTOS_ACERTO_UNICO
 * ao seu autor; quem fez o MENOR desses valores leva ainda PONTOS_MENOR_UNICO.
 * Um mesmo endereço pode acertar mais do que uma vez na mesma rodada.
 *
 * Quem é o menor lance único é decidido por `apurarMenorLanceUnico`
 * (`_lib/simulador.mjs`) — a definição já existente no projeto. Este módulo não
 * a reimplementa: se a regra do Artigo VIII mudar, muda num sítio só.
 *
 * @param {Array<{endereco?:string, valorCentavos:number, nomeExibicao?:string}>} lances
 *   Lances da rodada, na forma usada por `_lib/bids-store.mjs`. A chave do
 *   participante é `endereco` (carteira) — não existe `usuario_id` no projeto.
 * @returns {Map<string, {pontos:number, acertos:number, menorUnico:boolean}>}
 *   Mapa indexado por endereço em minúsculas. Participantes sem nenhum acerto
 *   NÃO aparecem — uma rodada sem lances únicos devolve um mapa vazio.
 */
export function calcularPontosRodada(lances) {
  const resultado = new Map();
  if (!Array.isArray(lances)) return resultado;

  // Filtra UMA vez e passa a MESMA lista às duas leituras (contagem própria e
  // apuração do menor). Assim não há como divergirem sobre o que é um lance.
  const lista = lances.filter(lanceValido);
  if (lista.length === 0) return resultado;

  const contagem = contarPorValor(lista);

  // Autoridade sobre o menor lance único: a função que o projeto já usa.
  const apuracao = apurarMenorLanceUnico(lista);
  const menorValor = apuracao.ok ? apuracao.valorCentavos : null;

  for (const l of lista) {
    const v = l.valorCentavos;
    if (contagem.get(v) !== 1) continue; // valor repetido não pontua

    const endereco = normalizarEndereco(l.endereco);
    const atual = resultado.get(endereco) || { pontos: 0, acertos: 0, menorUnico: false };
    atual.acertos += 1;
    atual.pontos += REGRAS.PONTOS_ACERTO_UNICO;
    if (menorValor !== null && v === menorValor) {
      atual.menorUnico = true;
      atual.pontos += REGRAS.PONTOS_MENOR_UNICO;
    }
    resultado.set(endereco, atual);
  }

  return resultado;
}

/**
 * Lê o acerto de uma entrada do histórico (booleano ou registo `{acertou}`).
 *
 * ⚠️ FALHA FECHADO, de propósito: só `true` estrito conta. A versão anterior
 * usava `Boolean(entrada?.acertou)`, e por isso `{ acertou: "sim" }` ou
 * `{ acertou: 1 }` contavam como acerto — num contador que decide a emissão de
 * 20 senhas (R$ 40,00) por sequência. Quando a dúvida vale dinheiro, a dúvida
 * não paga.
 */
function leuAcerto(entrada) {
  if (typeof entrada === "boolean") return entrada;
  return entrada?.acertou === true;
}

/**
 * Procura sequências de acertos consecutivos no histórico de um participante.
 *
 * O bónus é concedido A CADA `ACERTOS_PARA_BONUS` acertos seguidos: dez acertos
 * numa só corrida valem dois bónus, e duas corridas de cinco separadas por uma
 * falha valem igualmente dois. Uma falha parte a corrente.
 *
 * ⚠️ Devolve o que SERIA devido. Não credita pontos nem emite senhas — creditar
 * senhas é uma transação on-chain em mainnet e está fora deste MC.
 *
 * @param {Array<boolean|{acertou:boolean}>} historico
 *   Rodadas por ordem cronológica, da mais antiga para a mais recente.
 * @returns {{
 *   bonus:number, sequenciaAtual:number, maiorSequencia:number,
 *   pontosBonus:number, senhasBonus:number
 * }} `sequenciaAtual` é a corrida viva no fim do histórico.
 */
export function detectarConsecutivos(historico) {
  const lista = Array.isArray(historico) ? historico : [];

  let corrida = 0;
  let maiorSequencia = 0;
  let bonus = 0;

  for (const entrada of lista) {
    if (leuAcerto(entrada)) {
      corrida += 1;
      if (corrida > maiorSequencia) maiorSequencia = corrida;
    } else {
      bonus += Math.floor(corrida / REGRAS.ACERTOS_PARA_BONUS);
      corrida = 0;
    }
  }
  bonus += Math.floor(corrida / REGRAS.ACERTOS_PARA_BONUS); // corrida em aberto

  return {
    bonus,
    sequenciaAtual: corrida,
    maiorSequencia,
    pontosBonus: bonus * REGRAS.PONTOS_BONUS,
    senhasBonus: bonus * REGRAS.SENHAS_BONUS,
  };
}

/**
 * Aceita o Map de `calcularPontosRodada` ou uma lista `{endereco, pontosTotais}`
 * e devolve entradas normalizadas, com UMA SÓ política para os dois caminhos.
 *
 * ⚠️ A versão anterior normalizava e filtrava o endereço no caminho da lista e
 * não no do Map — duas políticas na mesma função. Com uma chave não-textual
 * (`new Map([[42, …]])`) o `sort` rebentava em `localeCompare`. Agora ambos
 * passam pela mesma porta.
 *
 * Endereços repetidos são AGREGADOS (somados): a mesma carteira não pode
 * ocupar duas posições no ranking.
 */
function normalizarPontuacoes(pontuacoes) {
  const entradas = pontuacoes instanceof Map
    ? [...pontuacoes.entries()].map(([endereco, v]) => ({ endereco, pontosTotais: v?.pontos }))
    : Array.isArray(pontuacoes)
      ? pontuacoes.map((p) => ({ endereco: p?.endereco, pontosTotais: p?.pontosTotais ?? p?.pontos }))
      : [];

  const somaPorEndereco = new Map();
  for (const e of entradas) {
    const endereco = normalizarEndereco(e.endereco);
    if (endereco === null) continue;
    const pontos = typeof e.pontosTotais === "number" && Number.isFinite(e.pontosTotais)
      ? e.pontosTotais
      : 0;
    somaPorEndereco.set(endereco, (somaPorEndereco.get(endereco) || 0) + pontos);
  }
  return [...somaPorEndereco.entries()].map(([endereco, pontosTotais]) => ({ endereco, pontosTotais }));
}

/**
 * Ordena participantes por pontos e atribui posição.
 *
 * Empates partilham a posição e a seguinte salta (1-2-2-4), como em competição.
 * Dentro do empate a ordem é por endereço ascendente — determinística de
 * propósito: o ranking decide prémio, logo a ordem de chegada dos dados NUNCA
 * pode alterar o resultado.
 *
 * ⚠️ O critério de desempate é um default deste MC, não uma regra ratificada.
 * Se o MC95 fixar outro (ex.: menor valor, ou quem chegou primeiro aos pontos),
 * é aqui que se muda.
 *
 * @param {Map<string,{pontos:number}>|Array<{endereco:string, pontosTotais:number}>} pontuacoes
 * @returns {Array<{endereco:string, pontosTotais:number, posicao:number}>}
 *   Lista ordenada. Entrada inválida devolve lista vazia.
 */
export function atualizarRanking(pontuacoes) {
  const lista = normalizarPontuacoes(pontuacoes);
  if (lista.length === 0) return [];

  lista.sort((a, b) =>
    b.pontosTotais - a.pontosTotais || a.endereco.localeCompare(b.endereco));

  let posicao = 0;
  let anteriores = 0;
  let pontosAnteriores = null;

  return lista.map((p) => {
    anteriores += 1;
    if (p.pontosTotais !== pontosAnteriores) {
      posicao = anteriores;          // salta para o nº de ordem (padrão 1-2-2-4)
      pontosAnteriores = p.pontosTotais;
    }
    return { endereco: p.endereco, pontosTotais: p.pontosTotais, posicao };
  });
}
