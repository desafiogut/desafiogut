// _lib/worker-bonus.mjs — MC93-C.
//
// Handler da fila (MC39.20) para o tipo "creditar-senhas-bonus", produzido por
// `_lib/pontuacao-store.mjs` quando um participante completa uma sequência de
// acertos no torneio. Antes deste MC o tipo não tinha handler nenhum: a tarefa
// esgotava as 5 tentativas e caía na DLQ.
//
// ⚠️ ESTE É O ÚNICO SÍTIO DO SISTEMA QUE PODE CREDITAR SENHAS POR MÉRITO.
// Cada execução a mais são R$ 40,00 (20 × R$ 2,00) emitidos sem contrapartida,
// numa transação irreversível na Ethereum mainnet. E corre sozinho, de 5 em 5
// minutos, sem ninguém a olhar.
//
// ESTADO DE PRODUÇÃO HOJE: **dry-run**. Sem `BONUS_EMISSAO_ATIVA=true` o
// handler lê, decide "não emitir", regista o motivo e termina em silêncio. Não
// credita, não marca liquidado, não altera o livro-razão. A activação é uma
// decisão explícita do operador (R2), documentada em docs/TORNEIO-HABILIDADE.md §4c.
//
// NÃO LANÇA em dry-run, de propósito: lançar faria a fila re-enfileirar com
// backoff e, ao fim de 5 tentativas, encher a DLQ de tarefas que só estão à
// espera de uma decisão — que é o problema que este MC veio resolver.
//
// ORDEM DAS OPERAÇÕES — reclamar ANTES de creditar. É a disciplina do
// `_lib/worker-credito.mjs` ("CLAIM ANTES do reembolso"): grava-se o marcador
// antes de mover dinheiro, para que um processo que morra a meio nunca pague
// duas vezes. Entre pagar a dobrar e pagar a menos, escolhe-se pagar a menos:
// o excesso é irreversível on-chain; a falta reconcilia-se à mão.

import { getSupabase } from "./supabase-client.mjs";
import { creditarSenhas } from "./contract.mjs";
import { captureSecurityAlert } from "./sentry-server.mjs";
import { podeEmitir, emissaoArmada, MOTIVOS } from "./bonus-emissao.mjs";
import { mascararEndereco } from "./validate.mjs";

const T_RANKINGS = "rankings_ciclo";

/**
 * Processa uma tarefa `creditar-senhas-bonus`.
 *
 * @param {{cicloId:string, endereco:string, quantidade:number}} payload
 *   Produzido por `_lib/pontuacao-store.mjs`. O payload é uma PISTA: a verdade
 *   sobre a dívida está em `rankings_ciclo`, e é lá que se confirma.
 * @returns {Promise<void>} Termina em silêncio quando não há nada a emitir.
 * @throws Se o crédito on-chain falhar — aí sim a fila deve retentar.
 */
export async function creditarSenhasBonus(payload) {
  const cicloId = String(payload?.cicloId || "").trim();
  const endereco = String(payload?.endereco || "").toLowerCase();
  if (!cicloId || !endereco) {
    console.warn("[worker-bonus] payload sem ciclo ou endereço — ignorado");
    return;
  }

  const supabase = getSupabase();

  // A dívida, lida do livro-razão. Nunca se confia só na mensagem da fila.
  const { data: divida, error } = await supabase.from(T_RANKINGS)
    .select("*").eq("ciclo_id", cicloId).eq("endereco", endereco).maybeSingle();
  if (error) throw new Error(`[worker-bonus] ler dívida: ${error.message}`);

  const decisao = podeEmitir({ flagAtiva: emissaoArmada(), divida, payload });

  if (!decisao.emitir) {
    // Dry-run e recusas são normais, não são falhas: log e fim. A tarefa fica
    // `done` e não volta a ser tentada.
    const nivel = decisao.motivo === MOTIVOS.FLAG_DESLIGADA ? "info" : "warn";
    console[nivel === "info" ? "info" : "warn"]("[worker-bonus] não emitido", {
      cicloId, endereco: mascararEndereco(endereco), motivo: decisao.motivo,
    });
    return;
  }

  // ── RECLAMAR: compare-and-set sobre `liquidado_em IS NULL`. ───────────────
  // Só uma execução consegue passar daqui. Se duas correrem em paralelo (a
  // mesma tarefa reservada duas vezes, ou duas tarefas para a mesma dívida),
  // a segunda não afecta linha nenhuma e sai sem creditar.
  //
  // ⚠️ `.is("liquidado_em", null)`, NUNCA `.eq(...)`. O postgrest-js traduz
  // `.eq(col, null)` para `col=eq.null` — que o PostgREST rejeita numa coluna
  // TIMESTAMPTZ com HTTP 400 (`22007 invalid input syntax`). Só `.is()` gera
  // `col=is.null`. A primeira versão usava `.eq()`: o compare-and-set NÃO
  // EXISTIA, e com a flag ligada o handler teria falhado em 100% das execuções
  // (fail-closed, sem risco financeiro — mas também sem funcionar nunca).
  // Verificado por execução e confirmado pela validação independente do SEG4.
  const quandoISO = new Date().toISOString();
  const { data: reclamadas, error: erroClaim } = await supabase.from(T_RANKINGS)
    .update({ liquidado_em: quandoISO, atualizado_em: quandoISO })
    .eq("ciclo_id", cicloId)
    .eq("endereco", endereco)
    .is("liquidado_em", null)   // ⚠️ .is(), NÃO .eq() — ver o comentário abaixo
    .select();
  if (erroClaim) throw new Error(`[worker-bonus] reclamar dívida: ${erroClaim.message}`);

  if (!Array.isArray(reclamadas) || reclamadas.length === 0) {
    console.info("[worker-bonus] dívida já reclamada por outra execução — no-op", {
      cicloId, endereco: mascararEndereco(endereco),
    });
    return;
  }

  // ── CREDITAR on-chain. A partir daqui a dívida está marcada. ──────────────
  try {
    const r = await creditarSenhas(endereco, decisao.quantidade);
    console.info("[worker-bonus] bónus creditado", {
      cicloId, endereco: mascararEndereco(endereco),
      quantidade: decisao.quantidade, txHash: r?.txHash,
    });
  } catch (err) {
    // NÃO se desfaz a reclamação: a tx pode ter sido submetida e ter falhado só
    // a confirmação, e reabrir a dívida criaria a janela de pagamento duplo.
    // Vai para reconciliação manual, como no worker-credito.
    captureSecurityAlert("worker_bonus_credito_falhou", {
      cicloId, endereco, quantidade: decisao.quantidade,
      liquidadoEm: quandoISO, erro: String(err?.message || err).slice(0, 300),
    }, "error").catch(() => {});
    throw err;
  }
}
