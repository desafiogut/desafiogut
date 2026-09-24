// MC93-B — persistência da pontuação do torneio de habilidade (Supabase).
//
// O motor puro vive em `pontuacao-utils.mjs` (MC93-A) e não é tocado aqui.
// Este módulo dá-lhe memória: grava o resultado de cada rodada, mantém o
// agregado do ciclo e regista o DIREITO ao bónus.
//
// ⚠️ O BÓNUS NÃO É UM SALDO. Decisão do operador em 2026-09-23, tomada depois
// de o SEG-1 mostrar que creditar senhas em Supabase produz um bug garantido:
// `darLance` exige `saldoSenhas[msg.sender] > 0` ON-CHAIN (`Leilao.sol:88`) e
// decrementa-o (`:107`). Uma senha creditada fora da cadeia não habilita lance
// nenhum — o utilizador veria "+20 senhas" e a transação reverteria com
// "Voce nao possui senhas disponiveis". Além disso, `saldo-senhas.mjs` calcula
// `saldoEfetivo = saldoOnChain − senhasConsumidas`: somar-lhe um termo
// off-chain quebraria a invariante `saldoEfetivo ≤ saldoOnChain`.
//
// Logo: grava-se `senhas_a_creditar` com `liquidado_em = NULL` (uma DÍVIDA) e
// enfileira-se a liquidação em `fila_tarefas` — o mesmo mecanismo que o projeto
// já usa para creditar senhas on-chain depois do PIX. A emissão acontece quando
// o operador a autorizar, por esse caminho já auditado. Há um teste que falha
// se este ficheiro voltar a importar `creditarSenhas` ou `ethers`.
//
// CICLO = 1 EDIÇÃO (decisão do operador). Por isso `ciclo_id` é TEXT: os ids de
// edição são strings ("R-1"), e `lances.edicao_id` é VARCHAR(66) — um UUID não
// permitiria o join.

import { getSupabase } from "./supabase-client.mjs";
import { enfileirar } from "./fila.mjs";
import { calcularPontosRodada, detectarConsecutivos, REGRAS } from "./pontuacao-utils.mjs";

const T_PONTUACOES = "pontuacoes";
const T_RANKINGS   = "rankings_ciclo";
/** Tipo de tarefa na fila. O handler on-chain é criado quando o operador autorizar. */
export const TIPO_TAREFA_BONUS = "creditar-senhas-bonus";

const normalizar = (e) => (typeof e === "string" && e ? e.toLowerCase() : null);

/**
 * Desembrulha uma resposta do Supabase, LANÇANDO em caso de erro.
 *
 * ⚠️ Existe porque a primeira versão deste módulo ignorava `error` em TODAS as
 * chamadas (a validação independente do SEG4 contou: zero ocorrências de
 * "error" no ficheiro). Uma escrita recusada — por RLS, por constraint, por
 * falta de GRANT — passava despercebida e o endpoint respondia 200 OK. Pior:
 * tornava decorativo o `try/catch` fail-soft da integração, que nunca teria
 * nada para apanhar.
 */
function exigir(resposta, operacao) {
  if (resposta?.error) {
    const err = new Error(`[pontuacao-store] ${operacao}: ${resposta.error.message || resposta.error}`);
    err.causa = resposta.error;
    throw err;
  }
  return resposta?.data ?? null;
}

/**
 * Ordena o ranking de um ciclo e atribui posição.
 *
 * ⚠️ NÃO usa `atualizarRanking` do MC93-A DE PROPÓSITO. O operador fixou o
 * desempate em "mais acertos totais" (2026-09-23); o motor puro desempata por
 * endereço e este MC não está autorizado a alterá-lo. O terceiro critério
 * (endereço) fica para garantir determinismo — o ranking decide prémio, logo a
 * ordem de chegada dos dados nunca pode mudar o resultado.
 *
 * Há um teste que exige que esta ordenação COINCIDA com `atualizarRanking`
 * quando os acertos são iguais, para que a divergência deliberada não cresça.
 * Quando o MC95 ratificar a regra, leva-se o desempate ao motor e este
 * comparador passa a delegar.
 *
 * @param {Array<{endereco:string, pontos_totais:number, acertos_totais:number}>} linhas
 * @returns {Array<object>} as mesmas linhas, ordenadas e com `posicao` (1-2-2-4).
 */
export function ordenarRanking(linhas) {
  // ⚠️ `b.x - a.x` com um valor em falta dá NaN, que é falsy — o `||` saltava o
  // critério primário e uma linha sem `pontos_totais` chegava ao 1.º lugar.
  // Achado da validação independente do SEG4. Coagir antes de comparar.
  const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const lista = Array.isArray(linhas) ? [...linhas] : [];
  lista.sort((a, b) =>
    (num(b.pontos_totais) - num(a.pontos_totais))
    || (num(b.acertos_totais) - num(a.acertos_totais))
    || String(a.endereco).localeCompare(String(b.endereco)));

  let posicao = 0;
  let ordem = 0;
  let anterior = null;
  return lista.map((linha) => {
    ordem += 1;
    const chave = `${linha.pontos_totais}|${linha.acertos_totais}`;
    if (chave !== anterior) { posicao = ordem; anterior = chave; }
    return { ...linha, posicao };
  });
}

/**
 * Pontua e persiste uma rodada. Idempotente: repetir o fecho da mesma edição
 * REPÕE os valores (upsert por `ciclo_id, endereco`), nunca os soma.
 *
 * @param {string} cicloId  id da edição — o ciclo é a edição.
 * @param {Array<{endereco:string, valorCentavos:number}>} lances
 * @param {{historicos?: Record<string, Array<boolean|{acertou:boolean}>>}} [opcoes]
 *   `historicos` traz, por endereço, a sequência de acertos em ciclos
 *   anteriores (mais antigo → mais recente). Sem ele, não há bónus a avaliar.
 * @returns {Promise<{cicloId:string, participantes:number, bonusRegistados:number}>}
 */
export async function registrarPontuacaoRodada(cicloId, lances) {
  const ciclo = String(cicloId || "").trim();
  if (!ciclo) throw new Error("[pontuacao-store] cicloId obrigatório");

  const pontos = calcularPontosRodada(lances);
  // Participantes da rodada, COM e SEM acerto. Quem falhou tem de ficar
  // registado: sem a falha, a sequência de acertos consecutivos conta a mais.
  const participantes = new Map();
  for (const l of Array.isArray(lances) ? lances : []) {
    const e = normalizar(l?.endereco);
    if (e) participantes.set(e, pontos.get(e) || { pontos: 0, acertos: 0, menorUnico: false });
  }
  if (participantes.size === 0) return { cicloId: ciclo, participantes: 0, bonusRegistados: 0 };

  const supabase = getSupabase();
  let bonusRegistados = 0;

  for (const [endereco, v] of participantes.entries()) {
    exigir(await supabase.from(T_PONTUACOES).upsert({
      ciclo_id: ciclo,
      endereco,
      pontos: v.pontos,
      acertos: v.acertos,
      menor_unico: v.menorUnico,
    }, { onConflict: "ciclo_id,endereco" }), "upsert pontuacoes");

    // O histórico vem da NOSSA tabela — já inclui a rodada acabada de gravar.
    // ⚠️ A versão anterior exigia que o chamador passasse `historicos`, e a
    // integração em `consolidar-lances.mjs` nunca o fazia: `detectarConsecutivos([])`
    // devolvia sempre `bonus: 0` e o bónus de sequência era INALCANÇÁVEL no
    // único caminho de produção. Achado da validação independente do SEG4.
    const sequencia = detectarConsecutivos(await lerHistoricoAcertos(endereco, supabase));
    const jaConcedidos = await contarBonusConcedidos(endereco, supabase);

    const atual = await supabase.from(T_RANKINGS)
      .select("*").eq("ciclo_id", ciclo).eq("endereco", endereco).maybeSingle();
    const anterior = exigir(atual, "ler rankings_ciclo");
    const jaTemBonus = anterior?.bonus_emitido === true;

    // ⚠️ O upsert NÃO escreve `bonus_emitido`, `senhas_a_creditar` nem
    // `liquidado_em`. Essas três colunas pertencem EXCLUSIVAMENTE ao
    // compare-and-set (`reclamarBonus`) e ao worker de liquidação.
    // A versão anterior repunha-as a partir de uma leitura feita antes, noutra
    // transacção: com latência real, o upsert de uma execução apagava o
    // `bonus_emitido: true` que a outra acabara de gravar, e o CAS voltava a
    // conceder — reaparecendo o pagamento duplo que o MC93-B dizia ter
    // corrigido. O PostgREST preserva as colunas não listadas no ON CONFLICT.
    exigir(await supabase.from(T_RANKINGS).upsert({
      ciclo_id: ciclo,
      endereco,
      acertos_totais: v.acertos,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: "ciclo_id,endereco" }), "upsert rankings_ciclo");

    // Pontos: duas escritas condicionais, para que os +5 do bónus nunca se
    // percam nem se dupliquem, sem depender de uma leitura desactualizada.
    exigir(await supabase.from(T_RANKINGS)
      .update({ pontos_totais: v.pontos })
      .eq("ciclo_id", ciclo).eq("endereco", endereco).eq("bonus_emitido", false),
    "pontos sem bónus");
    exigir(await supabase.from(T_RANKINGS)
      .update({ pontos_totais: v.pontos + REGRAS.PONTOS_BONUS })
      .eq("ciclo_id", ciclo).eq("endereco", endereco).eq("bonus_emitido", true),
    "pontos com bónus");

    // ⚠️ `sequencia.bonus` é CUMULATIVO sobre todo o histórico e nunca decresce:
    // uma vez atingidos 5 acertos seguidos, vale ≥1 para sempre. A guarda
    // `jaTemBonus` é POR CICLO, logo não o limita — cada ciclo novo nascia com
    // `bonus_emitido: false` e concedia OUTRO bónus. Medido pela validação
    // independente: 5 vitórias + 10 derrotas davam 11 bónus (R$ 440 em vez de
    // R$ 40), inclusive em edições com zero acertos.
    // A comparação certa é contra o que JÁ FOI concedido ao participante, em
    // todos os ciclos.
    if (!jaTemBonus && sequencia.bonus > jaConcedidos) {
      const ganhou = await reclamarBonus(ciclo, endereco, v.pontos, supabase);
      if (ganhou) {
        bonusRegistados += 1;
        // Regista a DÍVIDA para liquidação posterior. Não credita nada agora.
        await enfileirar(TIPO_TAREFA_BONUS, {
          cicloId: ciclo, endereco, quantidade: REGRAS.SENHAS_BONUS,
        });
      }
    }
  }

  await recalcularPosicoes(ciclo, supabase);
  return { cicloId: ciclo, participantes: participantes.size, bonusRegistados };
}

/**
 * Sequência de acertos de um endereço, através dos ciclos, do mais antigo para
 * o mais recente. Cada registo em `pontuacoes` é uma rodada em que participou;
 * `acertos > 0` diz se acertou.
 *
 * ⚠️ É por isto que se grava uma linha para QUEM NÃO ACERTOU: sem as falhas, a
 * corrente nunca se parte e o contador que paga 20 senhas conta a mais.
 */
/**
 * Quantos bónus já foram concedidos a este participante, somando TODOS os
 * ciclos. É o contrapeso de `detectarConsecutivos().bonus`, que é cumulativo.
 *
 * ⚠️ Sem isto, uma bandeira por-ciclo (`bonus_emitido`) tentava limitar um
 * contador que atravessa ciclos — e falhava: depois da primeira sequência de 5,
 * TODOS os ciclos seguintes concediam bónus.
 */
async function contarBonusConcedidos(endereco, supabase = getSupabase()) {
  const r = await supabase.from(T_RANKINGS)
    .select("*").eq("endereco", endereco).eq("bonus_emitido", true);
  return (exigir(r, "contar bónus concedidos") || []).length;
}

async function lerHistoricoAcertos(endereco, supabase = getSupabase()) {
  const r = await supabase.from(T_PONTUACOES)
    .select("*").eq("endereco", endereco).order("criado_em", { ascending: true });
  return (exigir(r, "ler histórico") || []).map((linha) => Number(linha?.acertos) > 0);
}

/**
 * Reclama o bónus do ciclo de forma ATÓMICA: só passa `bonus_emitido` de false
 * a true, e devolve se foi esta chamada a consegui-lo.
 *
 * ⚠️ Compare-and-set, e não read-then-write, porque a versão anterior lia o
 * estado e escrevia depois: duas consolidações em paralelo liam ambas
 * `bonus_emitido: false`, ambas gravavam 20 senhas e ambas enfileiravam — o
 * livro-razão dizia 20 e a fila mandava creditar 40. Achado da validação
 * independente do SEG4.
 *
 * @returns {Promise<boolean>} true se ESTA chamada reclamou o bónus.
 */
async function reclamarBonus(ciclo, endereco, pontosRodada, supabase = getSupabase()) {
  const r = await supabase.from(T_RANKINGS)
    .update({
      bonus_emitido: true,
      senhas_a_creditar: REGRAS.SENHAS_BONUS,
      pontos_totais: pontosRodada + REGRAS.PONTOS_BONUS,
      atualizado_em: new Date().toISOString(),
    })
    .eq("ciclo_id", ciclo)
    .eq("endereco", endereco)
    .eq("bonus_emitido", false)   // ← a condição que só um vencedor satisfaz
    .select();
  return (exigir(r, "reclamar bónus") || []).length > 0;
}

/** Relê o ciclo, reordena e grava as posições. */
async function recalcularPosicoes(ciclo, supabase = getSupabase()) {
  const r = await supabase.from(T_RANKINGS).select("*").eq("ciclo_id", ciclo);
  const linhas = exigir(r, "ler ciclo para posições") || [];
  for (const linha of ordenarRanking(linhas)) {
    // UPDATE, não upsert: só a posição muda, e a linha já existe de certeza.
    exigir(await supabase.from(T_RANKINGS)
      .update({ posicao: linha.posicao })
      .eq("ciclo_id", ciclo).eq("endereco", linha.endereco), "gravar posição");
  }
}

/**
 * Ranking ordenado de um ciclo.
 * @param {string} cicloId
 * @returns {Promise<Array<{posicao:number, endereco:string, pontosTotais:number,
 *   acertosTotais:number, bonusEmitido:boolean}>>}
 */
export async function lerRankingCiclo(cicloId) {
  const ciclo = String(cicloId || "").trim();
  if (!ciclo) return [];
  const r = await getSupabase().from(T_RANKINGS).select("*").eq("ciclo_id", ciclo);
  const data = exigir(r, "ler ranking");
  return ordenarRanking(data || []).map((l) => ({
    posicao: l.posicao,
    endereco: l.endereco,
    pontosTotais: l.pontos_totais,
    acertosTotais: l.acertos_totais,
    bonusEmitido: l.bonus_emitido === true,
  }));
}

/**
 * Situação de um participante num ciclo: pontos, posição, sequência viva e
 * quanto lhe falta para o próximo bónus.
 *
 * A sequência é lida do histórico de `pontuacoes` ATRAVÉS de ciclos (ordenado
 * por `criado_em`), porque um ciclo é uma edição e a sequência de 5 acertos
 * atravessa várias.
 *
 * @param {string} cicloId
 * @param {string} endereco
 * @returns {Promise<object>} zeros (não erro) para quem nunca jogou.
 */
export async function lerFeedback(cicloId, endereco) {
  const ciclo = String(cicloId || "").trim();
  const addr = normalizar(endereco);
  const vazio = {
    cicloId: ciclo, endereco: addr, pontosTotais: 0, acertosTotais: 0, posicao: null,
    sequenciaAtual: 0, faltamParaBonus: REGRAS.ACERTOS_PARA_BONUS,
    bonusEmitido: false, senhasACreditar: 0,
  };
  if (!ciclo || !addr) return vazio;

  const supabase = getSupabase();
  const r = await supabase.from(T_RANKINGS)
    .select("*").eq("ciclo_id", ciclo).eq("endereco", addr).maybeSingle();
  const linha = exigir(r, "ler feedback");

  // Mesma leitura de histórico que a pontuação usa — inclui as rodadas
  // FALHADAS. A versão anterior fazia `.map(() => true)`, tratando cada linha
  // como um acerto: uma rodada perdida contava como ganha e a sequência dizia
  // 2 onde era 1. Achado da validação independente do SEG4.
  const sequencia = detectarConsecutivos(await lerHistoricoAcertos(addr, supabase));
  const faltam = Math.max(
    0,
    REGRAS.ACERTOS_PARA_BONUS - (sequencia.sequenciaAtual % REGRAS.ACERTOS_PARA_BONUS),
  );

  if (!linha) return { ...vazio, sequenciaAtual: sequencia.sequenciaAtual, faltamParaBonus: faltam };

  return {
    cicloId: ciclo,
    endereco: addr,
    pontosTotais: linha.pontos_totais,
    acertosTotais: linha.acertos_totais,
    posicao: linha.posicao || null,
    sequenciaAtual: sequencia.sequenciaAtual,
    faltamParaBonus: faltam,
    bonusEmitido: linha.bonus_emitido === true,
    // DIREITO por liquidar. NÃO é saldo e não entra em `saldoEfetivo`.
    senhasACreditar: linha.senhas_a_creditar ?? 0,
    liquidado: linha.liquidado_em !== null && linha.liquidado_em !== undefined,
  };
}
