// src/components/BalaoComprarPasse.jsx — UTAC120 (Frente B). O MESMO balão de compra do Passe que a
// Carteira abre (`ComprarPasseModal` + `useComprarPasse`), embrulhado para ser aberto de onde falta o
// Passe: o «Comprar Passe Relâmpago» do CardLance e o CTA do palpite sem Passe Programado.
//
// Porque um embrulho e não abrir a Carteira: o utilizador está a meio de licitar/palpitar — compra ali e
// continua. A lógica de pagamento NÃO se duplica: quem decide Billing (APK) vs saldo R$ (PWA) é o hook.
// Só o essencial do `escolherPasse` da Carteira vem para aqui (fecha em sucesso, mensagem no balão em erro);
// o atalho «Carregar agora (PIX)» fica na Carteira, onde vive o depósito.
import { useState } from "react";
import { createPortal } from "react-dom";
import ComprarPasseModal from "./ComprarPasseModal.jsx";
import { useComprarPasse } from "../hooks/useComprarPasse.js";
import { pixPermitido, detectarPlataformaNativa } from "../lib/google-play-billing.js";
import { precoTotal } from "../lib/passes.js";

export default function BalaoComprarPasse({ aberto, onFechar, onComprado }) {
  const { comprar } = useComprarPasse();
  const [tipoEmCurso, setTipoEmCurso] = useState(null);
  const [erro, setErro] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  // Medido no clique (não no 1.º render): o bridge do Capacitor pode chegar depois (lição do UTAC116).
  const depositoPix = pixPermitido(detectarPlataformaNativa());

  function fechar() {
    setErro("");
    setQuantidade(1);
    onFechar?.();
  }

  async function escolher(tipo, qtd = 1) {
    if (tipoEmCurso) return;
    setTipoEmCurso(tipo);
    setErro("");
    try {
      const r = await comprar(tipo, qtd);
      if (r?.ok) {
        try { await onComprado?.(r); } catch { /* releitura é best-effort */ }
        fechar();
      } else if (r?.status === 402 || r?.code === "saldo_insuficiente") {
        const falta = qtd > 1 ? `Saldo insuficiente para ${qtd} passes (${precoTotal(qtd)}).` : "Saldo insuficiente.";
        setErro(depositoPix ? `${falta} Deposite via PIX na Carteira e tente de novo.` : falta);
      } else {
        setErro(r?.message || "Erro. Tente de novo.");
      }
    } finally {
      setTipoEmCurso(null);
    }
  }

  const balao = (
    <ComprarPasseModal
      aberto={aberto}
      emCurso={tipoEmCurso}
      erro={erro}
      onCancelar={fechar}
      onComprar={escolher}
      quantidade={quantidade}
      onQuantidade={setQuantidade}
      quantidadeNaLoja={!depositoPix}
    />
  );
  // O `Modal` não usa portal e é `fixed`: dentro de um vidro (`backdrop-filter` cria contentor) ficaria
  // preso ao cartão. Aberto e com DOM → vai para o `body`. Fechado, ou no render SSR dos testes (que não
  // suporta portais), renderiza-se no sítio — e fechado não pinta nada.
  if (aberto && typeof document !== "undefined" && document.body) return createPortal(balao, document.body);
  return balao;
}

/**
 * UTAC120 — aviso «sem Passe» + CTA de compra, no padrão tingido amarelo dos botões da Carteira.
 * Partilhado pelas duas zonas de palpite (Ofertas Programadas e o vidro «🎫 Programada» do Início).
 */
export function AvisoSemPasse({ mensagem, rotuloCta, onComprar }) {
  return (
    <div role="status" data-sem-passe="" style={{
      marginTop: "0.5rem", padding: "0.65rem 0.75rem", borderRadius: "10px",
      background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.25)",
    }}>
      <p style={{ margin: "0 0 0.5rem", color: "#e8f0fe", fontSize: "0.8rem", fontWeight: 700, lineHeight: 1.4 }}>
        {mensagem}
      </p>
      <button
        type="button" onClick={onComprar} data-cta-comprar-passe=""
        style={{
          width: "100%", minHeight: "48px", padding: "0.6rem 1rem", borderRadius: "10px", cursor: "pointer",
          background: "rgba(245,166,35,0.14)", border: "1px solid rgba(245,166,35,0.4)",
          color: "#f5a623", fontWeight: 800, fontSize: "0.85rem",
        }}
      >
        {rotuloCta}
      </button>
    </div>
  );
}
