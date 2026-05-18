// Wrapper Netlify Scheduled Functions — Mega Comando 8 / Item 4.
//
// Executa `analisarEngajamento()` do motor IA preditiva a cada 5 min.
// Mesmo padrão de purge-logs-scheduled.mjs e backup-blobs-scheduled.mjs:
//   - Retorno 200 mesmo em erro (evita retry agressivo do Netlify).
//   - Logs estruturados em console.info / console.error.
//   - Sem auth — gatilho é o próprio runtime do Netlify, não público.
//
// A função admin-gated equivalente (acionamento manual via HTTP) NÃO existe
// neste MC porque o motor é puramente reativo aos Blobs de analytics. Para
// debug manual, invoque `analisarEngajamento()` em um endpoint admin.

import { schedule } from "@netlify/functions";
import { analisarEngajamento } from "./_lib/ia-preditiva.mjs";

export const handler = schedule("*/5 * * * *", async () => {
  try {
    const r = await analisarEngajamento();
    console.info("[cron:ia-preditiva] ok", {
      modo: r.modo,
      disparado: r.disparado,
      acao: r.acao,
      ativos: r.metricas?.usuarios_ativos,
      taxa: r.metricas?.taxa_clique_compra,
      tendencia: r.metricas?.tendencia,
      condicoes: r.threshold?.condicoes_batidas,
      erro: r.erro,
    });
    return { statusCode: 200 };
  } catch (err) {
    console.error("[cron:ia-preditiva] erro:", err?.message);
    return { statusCode: 200 };
  }
});
