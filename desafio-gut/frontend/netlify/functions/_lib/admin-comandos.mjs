// _lib/admin-comandos.mjs — MC89.12 (Fase 3 do plano do MC89.5)
//
// Lógica PURA dos comandos operacionais. Cada função recebe as dependências
// injetadas (sb, env, fetch, log) para ser testável sem Postgres nem rede.
// O endpoint `admin-commands.mjs` é a casca: gate + esta lógica.
//
// ⚠️ CADA COMANDO ESCREVE EM admin_logs ANTES DE EXECUTAR (fail-CLOSED).
// ⚠️ COMANDOS IMPOSSÍVEIS RESPONDEM COM HONESTIDADE — nunca "executado".

/**
 * Sondas de status para o admin-status.
 * Cada sonda é independente — uma falha não derruba as outras (Promise.allSettled).
 */
export async function sondarStatus({ sb, fetch, rpcUrl, agora = () => new Date() }) {
  const sondas = {};

  // Backend: esta função respondeu → ok.
  sondas.backend = { ok: true, ms: 0, rotulo: "Backend" };

  // Supabase: SELECT 1
  const t0 = Date.now();
  try {
    const { error } = await sb.from("cotas").select("cliente_id").limit(1);
    sondas.supabase = { ok: !error, ms: Date.now() - t0, erro: error?.message || null };
  } catch (err) {
    sondas.supabase = { ok: false, ms: Date.now() - t0, erro: err?.message };
  }

  // RPC: eth_blockNumber (sem ethers — JSON-RPC cru)
  if (rpcUrl) {
    const t1 = Date.now();
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const resp = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber" }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const json = await resp.json();
      const bloco = json?.result ? Number(BigInt(json.result)) : null;
      sondas.rpc = { ok: !!bloco, ms: Date.now() - t1, bloco };
    } catch (err) {
      sondas.rpc = { ok: false, ms: Date.now() - t1, erro: err?.message };
    }
  } else {
    sondas.rpc = { ok: false, erro: "RPC_URL ausente no ambiente" };
  }

  // Webhook MP: último crédito com fonte='webhook'
  try {
    const { data, error } = await sb.from("saldo_rs_creditos")
      .select("criado_em")
      .filter("payload->>fonte", "eq", "webhook")
      .order("criado_em", { ascending: false })
      .limit(1);
    sondas.webhook = {
      ok: !error && data?.length > 0,
      ultimoEm: data?.[0]?.criado_em || null,
      diasSem: data?.length ? null : "toda a história",
      erro: error?.message || null,
    };
  } catch (err) {
    sondas.webhook = { ok: false, erro: err?.message };
  }

  // Blobs: BLOBS_TOKEN definido?
  sondas.blobs = { ok: !!process.env.BLOBS_TOKEN, configurado: !!process.env.BLOBS_TOKEN };

  // Cache: REDIS_URL definido?
  sondas.cache = { ok: !!process.env.REDIS_URL, configurado: !!process.env.REDIS_URL };

  sondas.geradoEm = agora().toISOString();
  return sondas;
}

/**
 * Estado da fila de tarefas.
 *
 * ⚠️ MC89.28 — O desdobramento por status é contado no SERVIDOR, sobre a tabela
 * inteira, e NÃO sobre as `limite` linhas carregadas para a tabela do painel.
 *
 * PORQUÊ: até ao MC89.28 os contadores eram derivados de `linhas`, que está
 * limitada a 30 (admin-queue.mjs). O `total` já era global. Com a fila acima de
 * 30 tarefas o painel podia mostrar "Total 500 · Pendentes 0" — um zero que
 * afirma que a fila está limpa quando pode não estar. É o defeito que a regra
 * R-UI-1 (`ouTraco`, _ui.jsx) existe para evitar, mas do lado do servidor, onde
 * o `ouTraco` não chega: ele só sabe distinguir null de número, e um 0 mentiroso
 * chega-lhe como número legítimo.
 *
 * Uma contagem que falha vale `null` (o painel mostra "—"), nunca 0.
 */
export async function estadoFila({ sb, limite = 20 }) {
  const contar = (...estados) =>
    sb.from("fila_tarefas").select("*", { count: "exact", head: true }).in("status", estados);

  const [rLinhas, rPendentes, rProcessando, rConcluidas, rFalhas] = await Promise.allSettled([
    sb.from("fila_tarefas").select("*", { count: "exact" })
      .order("criado_em", { ascending: false })
      .limit(limite),
    contar("pending"),
    contar("processing"),
    contar("done"),
    contar("failed", "falha"),
  ]);

  if (rLinhas.status !== "fulfilled") return { erro: rLinhas.reason?.message || "falha ao ler a fila" };
  if (rLinhas.value?.error) return { erro: rLinhas.value.error.message };

  const linhas = rLinhas.value.data || [];

  /** Contagem exata, ou null se a consulta não respondeu. Nunca 0 por omissão. */
  const n = (r) =>
    r.status === "fulfilled" && !r.value?.error && typeof r.value?.count === "number"
      ? r.value.count
      : null;

  return {
    total: rLinhas.value.count ?? linhas.length,
    pendentes:   n(rPendentes),
    processando: n(rProcessando),
    concluidas:  n(rConcluidas),
    falhas:      n(rFalhas),
    linhas,
  };
}

/**
 * Executa UM comando operacional.
 *
 * @returns {{ ok: boolean, mensagem: string, precisaConfirmar?: boolean }}
 *   `precisaConfirmar` = comando com custo ou risco, exige segundo passo.
 */
export async function executarComando(acao, { registrarLog, sb, env, fetch, endereco }) {
  // ⚠️ CADA COMANDO ESCREVE NO LOG ANTES DE AGIR (fail-CLOSED).
  // Se registrarLog lançar, a exceção propaga e o endpoint devolve 503.

  if (acao === "forcar_fila") {
    const { id } = await registrarLog({
      admin_endereco: endereco, tipo_acao: "forcar_fila",
      justificativa: "Comando manual via Tela 4",
    });
    try {
      const { processarLote } = await import("./fila.mjs");
      const resultado = await processarLote();
      await import("./admin-log.mjs").then((m) =>
        m.confirmarAcao(id, { sucesso: true }));
      const n = resultado?.processados ?? 0;
      return { ok: true, mensagem: `Fila processada: ${n} tarefa(s).${resultado?.inerte ? " (sistema inerte — fila vazia ou RPC indisponível)" : ""}` };
    } catch (err) {
      await import("./admin-log.mjs").then((m) =>
        m.confirmarAcao(id, { sucesso: false, erro: err?.message }));
      return { ok: false, mensagem: `Erro ao processar a fila: ${err?.message}` };
    }
  }

  if (acao === "limpar_cache") {
    const redisOk = !!env.REDIS_URL;
    const { id } = await registrarLog({
      admin_endereco: endereco, tipo_acao: "limpar_cache",
      justificativa: "Comando manual via Tela 4",
    });
    if (!redisOk) {
      await import("./admin-log.mjs").then((m) =>
        m.confirmarAcao(id, { sucesso: false, erro: "REDIS_URL ausente" }));
      return { ok: false, mensagem: "Cache Redis não configurado (REDIS_URL ausente). As consultas do painel vão sempre à fonte — não há cache para limpar." };
    }
    try {
      const { cacheDel } = await import("./cache.mjs");
      await cacheDel("admin:stats:v1");
      await cacheDel("admin:series:v1");
      await cacheDel("admin:alerts:v1");
      await import("./admin-log.mjs").then((m) =>
        m.confirmarAcao(id, { sucesso: true }));
      return { ok: true, mensagem: "Cache do painel limpo (admin-stats, admin-series, admin-alerts)." };
    } catch (err) {
      await import("./admin-log.mjs").then((m) =>
        m.confirmarAcao(id, { sucesso: false, erro: err?.message }));
      return { ok: false, mensagem: `Erro ao limpar cache: ${err?.message}` };
    }
  }

  if (acao === "executar_monitor") {
    const { id } = await registrarLog({
      admin_endereco: endereco, tipo_acao: "executar_monitor",
      justificativa: "Disparo manual via Tela 4",
    });
    try {
      const { executar } = await import("./monitor-onchain.mjs");
      const resultado = await executar();
      await import("./admin-log.mjs").then((m) =>
        m.confirmarAcao(id, { sucesso: true }));
      const resumo = resultado?.ok ? `Bloco ${resultado.blocoAtual ?? "?"}, ${resultado.eventos ?? 0} evento(s).` : (resultado?.erro || "sem resultado");
      return { ok: true, mensagem: `Monitor executado. ${resumo}` };
    } catch (err) {
      await import("./admin-log.mjs").then((m) =>
        m.confirmarAcao(id, { sucesso: false, erro: err?.message }));
      return { ok: false, mensagem: `Erro ao executar o monitor: ${err?.message}` };
    }
  }

  if (acao === "panic" || acao === "unpause") {
    const { id } = await registrarLog({
      admin_endereco: endereco, tipo_acao: acao,
      justificativa: `Comando ${acao} via Tela 4`,
    });
    try {
      const { escreverEstadoSistema } = await import("./system-state.mjs");
      const novo = acao === "panic" ? "paused" : "active";
      const estado = await escreverEstadoSistema(novo, `acionado via Tela 4 (${acao})`);
      await import("./admin-log.mjs").then((m) =>
        m.confirmarAcao(id, { sucesso: true }));
      return { ok: true, mensagem: `Sistema ${novo === "paused" ? "PAUSADO" : "REATIVADO"} às ${new Date(estado.timestamp).toLocaleTimeString("pt-BR")}.` };
    } catch (err) {
      await import("./admin-log.mjs").then((m) =>
        m.confirmarAcao(id, { sucesso: false, erro: err?.message }));
      return { ok: false, mensagem: `Erro ao ${acao === "panic" ? "pausar" : "reativar"}: ${err?.message}` };
    }
  }

  // ── Comando desconhecido ─────────────────────────────────────────────────
  return { ok: false, mensagem: `Comando desconhecido: "${acao}". Comandos disponíveis: forcar_fila, limpar_cache, executar_monitor, panic, unpause.` };
}
