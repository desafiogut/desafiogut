// _lib/sweeper-divida-orfa.mjs — MC93-D.
//
// Re-enfileira as dívidas de bónus que ficaram órfãs.
//
// PORQUE HÁ DÍVIDAS ÓRFÃS: `_lib/pontuacao-store.mjs:184` enfileira a tarefa
// `creditar-senhas-bonus` DENTRO do compare-and-set que faz a dívida nascer —
// uma dívida só gera tarefa uma vez, no instante da criação. E enquanto
// `BONUS_EMISSAO_ATIVA` estiver desligado, o handler consome essa tarefa
// (fica `done`) sem liquidar nada.
//
// Resultado, medido na validação independente do MC93-C: **toda a dívida criada
// em dry-run fica permanentemente fora do alcance da fila**. Quando o operador
// ligar a emissão, essas dívidas não seriam pagas por ninguém.
//
// ⚠️ O CRITÉRIO É O ESTADO, NÃO A IDADE. O enunciado do MC93-D propunha filtrar
// por `atualizado_em < now() - interval 'X'`. Uma janela temporal esconde
// exactamente o caso mais comum: em dry-run a tarefa é consumida no minuto
// seguinte ao nascimento, logo a dívida é órfã e recente ao mesmo tempo. O que
// torna uma dívida órfã é estar por liquidar — não ser velha.
// (A coluna, já agora, chama-se `atualizado_em`; `updated_at` não existe.)
//
// ⚠️ RE-ENFILEIRAR É SEGURO, E É POR ISSO QUE NÃO PRECISA DE JANELA. O handler
// valida contra o livro-razão e reclama com compare-and-set: uma tarefa a mais
// para uma dívida já liquidada sai sem creditar. A idempotência vive lá, não
// aqui.
//
// ESTE MÓDULO É READ-ONLY sobre `rankings_ciclo` e NÃO toca on-chain. Há um
// teste que falha se alguém acrescentar `update`/`upsert`/`insert` ou importar
// `creditarSenhas`/`ethers`.

import { getSupabase } from "./supabase-client.mjs";
import { enfileirar } from "./fila.mjs";
import { TIPO_TAREFA_BONUS } from "./pontuacao-store.mjs";
import { emissaoArmada } from "./bonus-emissao.mjs";

const T_RANKINGS = "rankings_ciclo";
const T_FILA = "fila_tarefas";

/**
 * Procura dívidas de bónus por liquidar e volta a pô-las na fila.
 *
 * Uma dívida é órfã quando o bónus foi concedido, ainda não foi liquidado e há
 * senhas a creditar — independentemente de quando foi actualizada.
 *
 * @param {{limite?: number}} [opcoes] `limite` corta a varredura (default 200),
 *   para que um arranque não gere milhares de tarefas de uma vez.
 * @returns {Promise<{reenfileiradas:number, encontradas:number}>}
 * @throws Se a leitura falhar — silenciar aqui esconderia a dívida outra vez.
 */
export async function varrerDividaOrfa({ limite = 200 } = {}) {
  // ⚠️ NO-OP EM DRY-RUN, e é isto que impede um moto-contínuo.
  // Com a emissão desarmada, o handler consome a tarefa sem liquidar a dívida:
  // ela continua órfã, o sweeper volta a enfileirá-la 5 minutos depois, e a
  // `fila_tarefas` cresce para sempre (~51.840 linhas/dia, medido pela
  // validação independente do MC93-D). Re-enfileirar só faz sentido quando há
  // quem liquide. Enquanto não há, o sweeper não tem nada a fazer.
  if (!emissaoArmada()) {
    return { reenfileiradas: 0, encontradas: 0, inerte: true };
  }

  const supabase = getSupabase();

  // ⚠️ `.is("liquidado_em", null)`, NUNCA `.eq(...)`. O postgrest-js traduz
  // `.eq(col, null)` para `col=eq.null`, e o PostgreSQL responde
  // `22007 invalid input syntax` numa coluna TIMESTAMPTZ — medido contra a base
  // real do projeto no MC93-D. Foi este o P0 do MC93-C.
  // ⚠️ `limite` e `order` do lado do SERVIDOR, não do cliente. O PostgREST
  // trunca em `db-max-rows` (1000 por omissão): com um `.slice()` no cliente,
  // `encontradas` reportaria 1000 havendo 1500 — mentiria — e sem ordenação
  // não há garantia de progresso entre varreduras (as mesmas dívidas podiam
  // voltar sempre, e as do fim nunca ser tratadas). Achado da validação
  // independente do MC93-D.
  const { data, error } = await supabase.from(T_RANKINGS)
    .select("ciclo_id, endereco, senhas_a_creditar")
    .eq("bonus_emitido", true)
    .is("liquidado_em", null)
    .gt("senhas_a_creditar", 0)
    .order("atualizado_em", { ascending: true })   // mais antigas primeiro
    .limit(limite);

  if (error) {
    throw new Error(`[sweeper-divida-orfa] ler dívidas: ${error.message || error}`);
  }

  const orfas = Array.isArray(data) ? data : [];
  const jaNaFila = await lerTarefasPendentes(supabase);
  let reenfileiradas = 0;
  let saltadas = 0;

  for (const d of orfas) {
    // Não duplicar: `enfileirar` é um INSERT puro, sem deduplicação. Sem esta
    // guarda, uma dívida que o handler recuse (ex.: quantidade divergente)
    // acumularia uma tarefa nova a cada 5 minutos, para sempre.
    if (jaNaFila.has(`${d.ciclo_id}|${d.endereco}`)) { saltadas += 1; continue; }

    // A quantidade vem do LIVRO-RAZÃO, tal como está. O sweeper não corrige um
    // registo divergente: re-enfileira-o e deixa o handler recusá-lo — assim o
    // problema aparece no log em vez de ser silenciosamente "arranjado" aqui.
    await enfileirar(TIPO_TAREFA_BONUS, {
      cicloId: d.ciclo_id,
      endereco: d.endereco,
      quantidade: d.senhas_a_creditar,
    });
    reenfileiradas += 1;
  }

  if (reenfileiradas > 0 || saltadas > 0) {
    console.info("[sweeper-divida-orfa] varredura", {
      reenfileiradas, saltadas, encontradas: orfas.length,
    });
  }

  return { reenfileiradas, saltadas, encontradas: orfas.length };
}

/**
 * Chaves `ciclo|endereco` das tarefas de bónus que ainda NÃO foram concluídas.
 *
 * Serve para não duplicar: `enfileirar` é um INSERT puro e a fila não tem
 * deduplicação. Uma dívida que o handler recuse ficaria a acumular uma tarefa
 * nova a cada varredura.
 *
 * Fail-soft: se a fila não puder ser lida, devolve um conjunto vazio — mais
 * vale arriscar uma tarefa repetida (que o handler recusa, sem custo) do que
 * deixar uma dívida por pagar.
 */
async function lerTarefasPendentes(supabase) {
  const { data, error } = await supabase.from(T_FILA)
    .select("payload, status")
    .eq("tipo", TIPO_TAREFA_BONUS)
    .neq("status", "done");
  if (error) {
    console.warn("[sweeper-divida-orfa] não consegui ler a fila:", error.message || error);
    return new Set();
  }
  return new Set((data || [])
    .map((t) => `${t?.payload?.cicloId}|${t?.payload?.endereco}`));
}
