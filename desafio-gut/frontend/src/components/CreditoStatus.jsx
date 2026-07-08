// MC59.6 — feedback do crédito assíncrono (resposta 202). Faz polling on-chain via
// useCreditoStatus e mostra o estado ao utilizador sem travar a UI.
//
// Usa explorerTx da config central de rede (MC59.2) — nada de host hardcoded.

import { useCreditoStatus } from "../hooks/useCreditoStatus.js";
import { explorerTx } from "../lib/network.js";

const ESTILO = {
  base: { display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", padding: "0.5rem 0" },
  link: { color: "#fbbf24", wordBreak: "break-all" },
};

/**
 * @param {{ txHash: string|null, qtd?: number }} props
 */
export function CreditoStatus({ txHash, qtd }) {
  const { status } = useCreditoStatus(txHash);
  if (!txHash || status === "idle") return null;

  const senhasTxt = qtd ? `${qtd} ${qtd === 1 ? "senha" : "senhas"}` : "senhas";

  if (status === "processing") {
    return (
      <div style={ESTILO.base} role="status" aria-live="polite">
        <span>🔄</span>
        <span>Crédito de {senhasTxt} em processamento… aguarde a confirmação on-chain.</span>
      </div>
    );
  }
  if (status === "confirmed") {
    return (
      <div style={ESTILO.base} role="status" aria-live="polite">
        <span>✅</span>
        <span>
          Crédito confirmado!{" "}
          <a style={ESTILO.link} href={explorerTx(txHash)} target="_blank" rel="noopener noreferrer">
            ver transação
          </a>
        </span>
      </div>
    );
  }
  if (status === "reverted") {
    return (
      <div style={ESTILO.base} role="alert">
        <span>❌</span>
        <span>Crédito não confirmado (transação revertida) — o valor será reembolsado.</span>
      </div>
    );
  }
  // timeout
  return (
    <div style={ESTILO.base} role="alert">
      <span>⏳</span>
      <span>
        Confirmação ainda pendente.{" "}
        <a style={ESTILO.link} href={explorerTx(txHash)} target="_blank" rel="noopener noreferrer">
          acompanhar no explorer
        </a>{" "}
        — se persistir, contacte o suporte.
      </span>
    </div>
  );
}

export default CreditoStatus;
