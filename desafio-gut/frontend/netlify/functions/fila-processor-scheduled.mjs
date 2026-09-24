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
// MC59.5 (ADR) — worker de confirmação assíncrona do crédito de senhas.
import { confirmarCreditoSenhas } from "./_lib/worker-credito.mjs";
// MC93-C — bónus do torneio de habilidade. Sem este registo, as tarefas
// produzidas por `_lib/pontuacao-store.mjs` esgotavam 5 tentativas e caíam
// na DLQ (ressalva nº 2 do MC93-B).
import { creditarSenhasBonus } from "./_lib/worker-bonus.mjs";

const handlers = {
  // MC59.5: confirma em background a tx de adicionarSenhas submetida por
  // comprar-senhas (flag CREDITO_ASSINCRONO). Dormant enquanto a fila estiver
  // inerte (migração 20260629_fila_tarefas não aplicada).
  "confirmar-credito-senhas": confirmarCreditoSenhas,
  // MC93-C: liquida o direito a bónus do torneio. ⚠️ Em DRY-RUN por default —
  // sem `BONUS_EMISSAO_ATIVA=true` lê, decide "não emitir", regista o motivo e
  // termina. Nada é creditado on-chain. Activação = decisão do operador (R2).
  "creditar-senhas-bonus": creditarSenhasBonus,
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
