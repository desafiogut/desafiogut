// Wrapper Netlify Scheduled Functions — Mega Comando 3 / Item 4.
//
// Executa `executar()` do monitor-onchain.mjs a cada 30 min.
// O handler HTTP de monitor-onchain.mjs continua disponível para invocação
// manual / debug (admin-gated). Esta versão é interna ao Netlify e não exige
// autenticação — o cron é gatilho confiável do próprio runtime.
//
// Doc: https://docs.netlify.com/functions/scheduled-functions/

import { schedule } from "@netlify/functions";
import { executar } from "./monitor-onchain.mjs";

const EDICAO = "R-1";

export const handler = schedule("*/30 * * * *", async () => {
  try {
    const r = await executar({ edicaoId: EDICAO, dryRun: false });
    console.info("[cron:monitor-onchain] ok", {
      eventosProcessados: r.eventosProcessados,
      bursts: r.bursts, outliers: r.outliers,
    });
    return { statusCode: 200 };
  } catch (err) {
    console.error("[cron:monitor-onchain] erro:", err?.message);
    // Retornar 200 evita retry agressivo do Netlify — o próximo tick (30 min)
    // tentará novamente e o erro já foi logado.
    return { statusCode: 200 };
  }
});
