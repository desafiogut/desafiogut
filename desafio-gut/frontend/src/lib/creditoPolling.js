// MC59.6 — lógica PURA de polling da confirmação de crédito assíncrono (202).
//
// Sem React e sem `import.meta` → testável em isolamento (node:test). O hook
// useCreditoStatus injeta `verificar` (leitura on-chain do receipt) e `sleep`.
//
// `verificar()` deve resolver para: "confirmado" | "revertido" | "pendente".
// Erros de rede/RPC em `verificar` são tratados como "pendente" (re-tenta).
//
// Retorna { estado, tentativas }, com estado ∈
//   "confirmado" | "revertido" | "timeout" | "cancelado".

/**
 * @param {{
 *   verificar: () => Promise<"confirmado"|"revertido"|"pendente">,
 *   maxTentativas?: number,
 *   intervaloMs?: number,
 *   sleep?: (ms: number) => Promise<void>,
 *   cancelado?: () => boolean,
 * }} opts
 * @returns {Promise<{ estado: string, tentativas: number }>}
 */
export async function aguardarConfirmacaoCredito({
  verificar,
  maxTentativas = 30,
  intervaloMs = 2000,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  cancelado = () => false,
} = {}) {
  if (typeof verificar !== "function") throw new Error("aguardarConfirmacaoCredito: 'verificar' é obrigatório");

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    if (cancelado()) return { estado: "cancelado", tentativas: tentativa - 1 };

    let estado;
    try {
      estado = await verificar();
    } catch {
      estado = "pendente"; // erro transitório (RPC/rede) → re-tenta
    }
    if (estado === "confirmado" || estado === "revertido") {
      return { estado, tentativas: tentativa };
    }

    if (tentativa < maxTentativas) {
      await sleep(intervaloMs);
      if (cancelado()) return { estado: "cancelado", tentativas: tentativa };
    }
  }
  return { estado: "timeout", tentativas: maxTentativas };
}
