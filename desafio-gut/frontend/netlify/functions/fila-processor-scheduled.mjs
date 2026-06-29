// fila-processor-scheduled.mjs — MC39.20 (Onda 7): processador da fila de tarefas.
//
// Scheduled function (padrão dos *-scheduled.mjs do projeto). Reserva e processa um
// lote da fila_tarefas a cada 5 min. INERTE até a migração 20260629_fila_tarefas ser
// aplicada (processarLote devolve { inerte:true }) — não loga, não erra.
//
// Handlers vazios por ora: nenhum fluxo síncrono foi reescrito (zero regressão).
// Para ADOTAR a fila, registre handlers aqui por tipo, ex.:
//   "notificacao-email": async (payload) => { await enviarEmail(payload); }
// e chame enfileirar("notificacao-email", {...}) no produtor.

import { schedule } from "@netlify/functions";
import { processarLote } from "./_lib/fila.mjs";

const handlers = {
  // (vazio — produtores adotam a fila sob demanda; ver _lib/fila.mjs)
};

export const handler = schedule("*/5 * * * *", async () => {
  try {
    const r = await processarLote(handlers, 20);
    if (!r.inerte && (r.processadas || !r.ok)) {
      console.info("[cron:fila] lote", r);
    }
    return { statusCode: 200 };
  } catch (err) {
    console.error("[cron:fila] erro:", err?.message);
    return { statusCode: 200 };
  }
});
