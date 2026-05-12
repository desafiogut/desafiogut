// POST /.netlify/functions/purge-lances
// Body: { edicaoId: "R-1" }
// Deleta a chave lances-relampago:{edicaoId} no Netlify Blobs e remove
// entradas relacionadas em lance-idem (cujo valor referencia o mesmo edicaoId).
// Sem auth — endpoint de reset/manutenção. Idempotente: pode ser chamado várias vezes.

import { getStore } from "@netlify/blobs";
import { jsonResponse, jsonError, parseJsonBody, ValidationError } from "./_lib/validate.mjs";

const BLOB_LANCES   = "lances-relampago";
const BLOB_IDEM     = "lance-idem";
const EDICAO_PADRAO = "R-1";

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[purge-lances] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

export default async (req) => {
  if (req.method !== "POST") {
    return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  }

  let body;
  try {
    body = (await parseJsonBody(req)) || {};
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  const edicaoId = String(body.edicaoId || EDICAO_PADRAO);
  const resultado = { ok: true, purged: edicaoId, lancesRemovido: false, idemRemovidos: 0 };

  const storeLances = abrirStore(BLOB_LANCES);
  if (storeLances) {
    try {
      const existente = await storeLances.get(edicaoId, { type: "json" });
      if (existente) {
        await storeLances.delete(edicaoId);
        resultado.lancesRemovido = true;
      }
    } catch (err) {
      console.warn("[purge-lances] delete lances falhou:", err?.message);
    }
  }

  const storeIdem = abrirStore(BLOB_IDEM);
  if (storeIdem) {
    try {
      const { blobs } = await storeIdem.list();
      for (const { key } of blobs) {
        try {
          const val = await storeIdem.get(key, { type: "json" });
          if (val?.edicaoId === edicaoId) {
            await storeIdem.delete(key);
            resultado.idemRemovidos += 1;
          }
        } catch (err) {
          console.warn(`[purge-lances] inspeção idem ${key} falhou:`, err?.message);
        }
      }
    } catch (err) {
      console.warn("[purge-lances] list lance-idem falhou:", err?.message);
    }
  }

  console.info("[purge-lances] concluído", resultado);
  return jsonResponse(resultado);
};
