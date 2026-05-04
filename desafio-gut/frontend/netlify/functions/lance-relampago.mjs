// POST /.netlify/functions/lance-relampago
// Body: { endereco: "0x...", valorCentavos: 1..999999, edicaoId?: "R-1" }
// Resposta 200: { ok, endereco, valorCentavos, saldoRsAntesCentavos, saldoRsDepoisCentavos, lanceId, edicaoId, processadoEm }
// Resposta 400: saldo_insuficiente | params_invalidos
//
// Modelo dual (Frente B.9): Lance Relâmpago consome centavos do saldo R$
// off-chain — não toca em senhas on-chain. O lance é registrado em blob
// `lances-relampago:${edicaoId}` (lista) e fica disponível para a UI puxar.
//
// Auth: para o beta, sem auth (mesmo padrão de comprar-senhas). Hardening
// futuro: exigir signMessage do address dono.

import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import {
  jsonResponse, jsonError, validarEndereco,
  parseJsonBody, ValidationError,
} from "./_lib/validate.mjs";
import { debitarSaldoRs } from "./_lib/saldoRs.mjs";

const LANCE_MIN_CENTAVOS = 1;        // Art. XXIII
const LANCE_MAX_CENTAVOS = 999999;   // R$ 9.999,99
const EDICAO_PADRAO      = "R-1";
const BLOB_LANCES        = "lances-relampago";

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[lance-relampago] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

function validarValorCentavos(input) {
  const n = typeof input === "number" ? input : Number(input);
  if (!Number.isInteger(n)) throw new ValidationError("valor_invalido", "valorCentavos deve ser inteiro");
  if (n < LANCE_MIN_CENTAVOS || n > LANCE_MAX_CENTAVOS) {
    throw new ValidationError("valor_fora_do_limite", `valorCentavos deve estar entre ${LANCE_MIN_CENTAVOS} e ${LANCE_MAX_CENTAVOS}`);
  }
  return n;
}

export default async (req) => {
  if (req.method !== "POST") {
    return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  }
  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com endereco e valorCentavos");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  let endereco, valorCentavos;
  try {
    endereco      = validarEndereco(body.endereco);
    valorCentavos = validarValorCentavos(body.valorCentavos);
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  const edicaoId = String(body.edicaoId || EDICAO_PADRAO);

  console.info("[lance-relampago] início", { endereco, valorCentavos, edicaoId });

  // Debita saldo R$.
  const debito = await debitarSaldoRs({ endereco, valorCentavos, motivo: `lance-${edicaoId}` });
  if (!debito.ok) {
    const status = debito.code === "saldo_insuficiente" ? 400 : 502;
    return jsonError(status, debito.code || "debito_falhou", debito.message || "não foi possível debitar saldo R$");
  }

  const lanceId = randomUUID();
  const registro = {
    lanceId, edicaoId, endereco, valorCentavos,
    saldoAntesCentavos:  debito.resultado.saldoAntesCentavos,
    saldoDepoisCentavos: debito.resultado.saldoDepoisCentavos,
    processadoEm: new Date().toISOString(),
  };

  // Persiste em lista por edição. Em produção este blob é a fonte de verdade
  // dos lances relâmpago — UI lê para popular a tabela.
  const store = abrirStore(BLOB_LANCES);
  if (store) {
    try {
      const existente = (await store.get(edicaoId, { type: "json" })) || { lances: [] };
      existente.lances.push(registro);
      existente.atualizadoEm = new Date().toISOString();
      await store.setJSON(edicaoId, existente);
    } catch (err) {
      console.warn("[lance-relampago] persistir lance falhou (não-fatal):", err?.message);
    }
  }
  console.info("[lance-relampago] concluído", {
    endereco, valorCentavos, edicaoId, lanceId,
    saldoAntes: debito.resultado.saldoAntesCentavos,
    saldoDepois: debito.resultado.saldoDepoisCentavos,
  });

  return jsonResponse({
    ok: true,
    lanceId, edicaoId, endereco, valorCentavos,
    saldoRsAntesCentavos:  debito.resultado.saldoAntesCentavos,
    saldoRsDepoisCentavos: debito.resultado.saldoDepoisCentavos,
    processadoEm: registro.processadoEm,
  });
};
