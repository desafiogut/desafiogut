// components/AvisoRede.jsx — MC88.25 (P3)
//
// Avisa quando a app NÃO está na rede de produção.
//
// PORQUÊ EXISTE: no MC88.24 um APK foi para as mãos do operador a apontar para
// Sepolia e para um contrato abandonado. O saldo aparecia a zero, o utilizador
// concluiu "o PIX debitou e a senha não creditou" — e a senha estava creditada em
// mainnet. Nada na interface dizia em que rede a app estava. A investigação levou
// um MC inteiro; um aviso na tela tê-la-ia resolvido em dois minutos.
//
// DECISÃO DE DESENHO: mostra-se APENAS quando algo está errado. Uma etiqueta
// permanente "mainnet" seria ruído numa app que movimenta dinheiro, e o utilizador
// aprenderia a ignorá-la — que é como os avisos deixam de funcionar. Em produção
// não aparece nada; a ausência é o sinal de que está tudo bem.
//
// Lê de src/lib/network.js (fonte única de config de rede), não do env directo.

import { CHAIN_ID_DEC, CONTRATO } from "@/lib/network.js";

const STAGE = String(import.meta.env.VITE_NETWORK_STAGE ?? "").trim();
const CHAIN_MAINNET = 1;

/** Contrato abandonado (MC56/MC59.15) — se estiver ativo, o saldo lê-se do lado errado. */
const CONTRATO_ABANDONADO = "0x59a73acc8e8b210c874b0e3a9ec9b8b64847f6d5";

function diagnosticar() {
  const problemas = [];
  if (CHAIN_ID_DEC !== CHAIN_MAINNET) problemas.push(`rede ${CHAIN_ID_DEC === 11155111 ? "Sepolia" : CHAIN_ID_DEC}`);
  if (STAGE && STAGE !== "mainnet") problemas.push(`stage "${STAGE}"`);
  if (!CONTRATO) problemas.push("contrato não configurado");
  else if (CONTRATO.toLowerCase() === CONTRATO_ABANDONADO) problemas.push("contrato abandonado");
  return problemas;
}

export default function AvisoRede() {
  const problemas = diagnosticar();
  if (problemas.length === 0) return null;   // produção: silêncio

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "0.5rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9998,          // abaixo do botão do GUTO (9999)
        maxWidth: "min(92vw, 30rem)",
        padding: "0.4rem 0.8rem",
        borderRadius: "999px",
        background: "rgba(120, 20, 20, 0.92)",
        border: "1px solid rgba(255, 120, 120, 0.5)",
        color: "#ffd9d9",
        font: "600 0.7rem/1.35 ui-monospace, monospace",
        textAlign: "center",
        pointerEvents: "none",   // nunca rouba um toque ao utilizador
      }}
    >
      ⚠️ Ambiente de teste — {problemas.join(" · ")}. Os saldos aqui não são os reais.
    </div>
  );
}
