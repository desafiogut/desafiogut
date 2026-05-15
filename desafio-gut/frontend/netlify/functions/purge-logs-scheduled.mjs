// Wrapper Netlify Scheduled Functions — Mega Comando 3 / Item 2.
//
// Executa `executar(false)` do purge-logs.mjs diariamente às 03:00 UTC.
// Em São Paulo (UTC-3) → 00:00 BRT, fora do horário de pico.
// O handler HTTP de purge-logs.mjs continua admin-gated para disparos manuais.

import { schedule } from "@netlify/functions";
import { executar } from "./purge-logs.mjs";

export const handler = schedule("0 3 * * *", async () => {
  try {
    const r = await executar(false);
    console.info("[cron:purge-logs] ok", {
      deleted: r.totalDeleted, kept: r.totalKept, stores: r.totalStores,
    });
    return { statusCode: 200 };
  } catch (err) {
    console.error("[cron:purge-logs] erro:", err?.message);
    return { statusCode: 200 };
  }
});
