// _lib/admin-alertas.mjs — MC89.7 (Fase 1 do plano do MC89.5)
//
// Computação PURA dos alertas do painel ADM. Todas as dependências são
// injetadas (supabase client, env, relógio), para que os alertas se testem
// sem Postgres, sem rede e sem variáveis de ambiente reais.
//
// A função principal `computarAlertas` devolve o array de alertas. O endpoint
// `admin-alerts.mjs` é uma casca fina: `guardAdmin` + `computarAlertas(sb, env)`.
//
// ⚠️ NÃO IMPORTA `ethers`. Os alertas que dependem de RPC (EOA, bloco) são
// computados NO FRONTEND com os dados que este já tem do `admin-onchain` (R7).

/**
 * @param {object} deps
 * @param {{from: (table:string) => object}} deps.sb      cliente Supabase (ou duplo)
 * @param {Record<string,string|undefined>} deps.env       process.env (ou duplo)
 * @param {() => Date} [deps.agora]
 * @returns {Promise<Array<{id:string, nivel:string, mensagem:string, fonte:string}>>}
 */
export async function computarAlertas({ sb, env = {}, agora = () => new Date() }) {
  const alerts = [];
  const now = agora();

  // ── A2: Fila travada ─────────────────────────────────────────────────────
  try {
    const limite = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    const { data: fila, error: errFila } = await sb.from("fila_tarefas")
      .select("id,status,atualizado_em")
      .neq("status", "done")
      .lt("atualizado_em", limite)
      .limit(5);
    if (errFila) throw new Error(errFila.message);
    if (fila && fila.length > 0) {
      alerts.push({
        id: "fila_travada", nivel: "critical",
        mensagem: `${fila.length} tarefa(s) parada(s) há mais de 10 minutos na fila de processamento.`,
        fonte: "fila_tarefas",
      });
    }
  } catch (_err) {
    alerts.push({
      id: "fila_indisponivel", nivel: "warning",
      mensagem: "Não foi possível verificar o estado da fila de tarefas.",
      fonte: "fila_tarefas",
    });
  }

  // ── A3: Webhook MP inativo ───────────────────────────────────────────────
  try {
    const diasWebhook = 7;
    const desde = new Date(now.getTime() - diasWebhook * 24 * 60 * 60 * 1000).toISOString();
    const { count: nWebhook, error: errW } = await sb.from("saldo_rs_creditos")
      .select("*", { count: "exact", head: true })
      .gte("criado_em", desde)
      .filter("payload->>fonte", "eq", "webhook");
    if (errW) throw new Error(errW.message);
    if (nWebhook === 0) {
      alerts.push({
        id: "webhook_inativo", nivel: "warning",
        mensagem: `Nenhum crédito com origem no webhook do Mercado Pago nos últimos ${diasWebhook} dias. Os pagamentos estão a ser confirmados manualmente.`,
        fonte: "saldo_rs_creditos",
      });
    }
  } catch (_err) {
    alerts.push({
      id: "webhook_indisponivel", nivel: "warning",
      mensagem: "Não foi possível verificar a atividade do webhook do Mercado Pago.",
      fonte: "saldo_rs_creditos",
    });
  }

  // ── A5: RAG sem metadado ─────────────────────────────────────────────────
  alerts.push({
    id: "rag_sem_metadado", nivel: "info",
    mensagem: "A data do índice RAG não está disponível no backend — o índice é construído fora do repositório pelo operador. O alerta de desatualização ficará ativo quando houver um endpoint de metadado.",
    fonte: "build-rag-index.mjs",
  });

  // ── A6: Blobs cego ───────────────────────────────────────────────────────
  if (!env.BLOBS_TOKEN) {
    alerts.push({
      id: "blobs_cego", nivel: "warning",
      mensagem: "Variável BLOBS_TOKEN não definida no ambiente. O monitor on-chain e a IA preditiva podem estar a ler/escrever sem efeito — as operações de Blob são no-op sem token, e falham em silêncio.",
      fonte: "env",
    });
  }

  // ── A7: Cache Redis não configurado ──────────────────────────────────────
  if (!env.REDIS_URL) {
    alerts.push({
      id: "cache_sem_redis", nivel: "info",
      mensagem: "Cache Redis não configurado (REDIS_URL ausente). As consultas do painel vão sempre à fonte — com 7 telas e polling, isto satura as dependências a cada abertura.",
      fonte: "env",
    });
  }

  return alerts;
}
