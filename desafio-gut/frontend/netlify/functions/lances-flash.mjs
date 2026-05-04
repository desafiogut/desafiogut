// GET /.netlify/functions/lances-flash?edicaoId=R-1
// Retorna array de lances flash do blob lances-relampago:{edicaoId}.
// Campo repetido é computado server-side com base na contagem de valores.
// Sem auth — dados visíveis a todos os participantes.

import { getStore } from "@netlify/blobs";
import { jsonResponse, jsonError } from "./_lib/validate.mjs";

const BLOB_LANCES   = "lances-relampago";
const EDICAO_PADRAO = "R-1";

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[lances-flash] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

export default async (req) => {
  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET");
  }

  const url      = new URL(req.url);
  const edicaoId = url.searchParams.get("edicaoId") || EDICAO_PADRAO;

  const store = abrirStore(BLOB_LANCES);
  if (!store) {
    return jsonResponse({ edicaoId, lances: [] });
  }

  let rawLances = [];
  try {
    const blob = await store.get(edicaoId, { type: "json" });
    rawLances  = blob?.lances ?? [];
  } catch (err) {
    console.warn("[lances-flash] leitura blob falhou:", err?.message);
    return jsonResponse({ edicaoId, lances: [] });
  }

  // Computa repetido: valores com count > 1 são repetidos
  const valorCounts = {};
  for (const l of rawLances) {
    valorCounts[l.valorCentavos] = (valorCounts[l.valorCentavos] || 0) + 1;
  }

  const lances = rawLances.map((l) => ({
    lanceId:      l.lanceId,
    endereco:     l.endereco,
    valor:        l.valorCentavos,
    nomeExibicao: l.nomeExibicao ?? null,
    txHash:       l.lanceId,
    repetido:     (valorCounts[l.valorCentavos] || 0) > 1,
  }));

  return jsonResponse({ edicaoId, lances });
};
