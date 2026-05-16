// Wrapper Netlify Scheduled Functions — Mega Comando 6 / Item 2.
//
// Executa executar() do backup-blobs.mjs diariamente às 02:00 UTC
// (= 23:00 BRT do dia anterior). Roda 1h antes do purge-logs (03:00 UTC),
// garantindo que o backup capture os dados ANTES da purga LGPD.
// O handler HTTP em backup-blobs.mjs continua admin-gated para disparos manuais.

import { schedule } from "@netlify/functions";
import { executar } from "./backup-blobs.mjs";

export const handler = schedule("0 2 * * *", async () => {
  try {
    const r = await executar();
    console.info("[cron:backup-blobs] ok", {
      key: r.key, totalKeys: r.totalKeys, totalBytes: r.totalBytes, duracaoMs: r.duracaoMs,
    });
    return { statusCode: 200 };
  } catch (err) {
    console.error("[cron:backup-blobs] erro:", err?.message);
    return { statusCode: 200 };
  }
});
