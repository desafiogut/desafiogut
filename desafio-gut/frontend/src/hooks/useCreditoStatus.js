// MC59.6 — hook de polling da confirmação de crédito assíncrono (resposta 202).
//
// Dado o txHash devolvido pelo 202 de comprar-senhas, faz polling on-chain do
// receipt até um estado terminal (confirmado/revertido) ou timeout. Cancela no
// unmount (não atualiza estado após desmontar; não deixa timer órfão).
//
// Estados expostos: "idle" | "processing" | "confirmed" | "reverted" | "timeout".
// A lógica de loop é pura e testada em src/lib/creditoPolling.js.

import { useEffect, useRef, useState } from "react";
import { aguardarConfirmacaoCredito } from "../lib/creditoPolling.js";
import { verificarCreditoOnchain } from "../utils/web3.js";

const MAPA = { confirmado: "confirmed", revertido: "reverted", timeout: "timeout", cancelado: "idle" };

/**
 * @param {string|null} txHash  — txHash do 202 (null → idle, sem polling).
 * @param {{ maxTentativas?: number, intervaloMs?: number }} [opts]
 * @returns {{ status: string, txHash: string|null }}
 */
export function useCreditoStatus(txHash, { maxTentativas = 30, intervaloMs = 2000 } = {}) {
  const [status, setStatus] = useState(txHash ? "processing" : "idle");
  const canceladoRef = useRef(false);

  useEffect(() => {
    if (!txHash) { setStatus("idle"); return; }
    canceladoRef.current = false;
    setStatus("processing");

    aguardarConfirmacaoCredito({
      verificar: () => verificarCreditoOnchain(txHash),
      maxTentativas,
      intervaloMs,
      cancelado: () => canceladoRef.current,
    }).then((r) => {
      if (canceladoRef.current) return;         // desmontou → não atualiza estado
      setStatus(MAPA[r.estado] || "processing");
    });

    return () => { canceladoRef.current = true; }; // cleanup: cancela o polling
  }, [txHash, maxTentativas, intervaloMs]);

  return { status, txHash };
}

export default useCreditoStatus;
