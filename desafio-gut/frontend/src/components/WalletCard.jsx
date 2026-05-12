// WalletCard — exibição read-only da Wallet Digital (Vale-Crédito).
//
// Especificação Refatorada §4: o saldo é alimentado pela regra
// "Valor_Produto < Valor_Minimo_Cota gera Vale-Crédito" e debitado por
// compra de premium/renovação. Operações de mutação são feitas pelo Admin
// (gated por x-admin-token em /.netlify/functions/wallet POST).
//
// Este componente apenas LÊ /.netlify/functions/wallet?endereco=0x...
// O usuário não tem botão para creditar/debitar — alinhado com a spec
// (saldo virtual, controle pelo sistema, não pelo cliente).

import { useEffect, useState, useCallback } from "react";

const COR = {
  primary:   "#a78bfa",
  primaryDim: "rgba(167,139,250,0.16)",
  border:    "rgba(167,139,250,0.35)",
  text:      "#e8f0fe",
  muted:     "#94a3b8",
  success:   "#10b981",
  danger:    "#ef4444",
};

function formatBRL(centavos) {
  if (centavos == null) return "—";
  return `R$ ${(Number(centavos) / 100).toFixed(2).replace(".", ",")}`;
}

function formatData(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export default function WalletCard({ endereco, isMobile = false }) {
  const [estado, setEstado] = useState({ status: "idle", dados: null, erro: null });

  const carregar = useCallback(async () => {
    if (!endereco) {
      setEstado({ status: "idle", dados: null, erro: null });
      return;
    }
    setEstado((s) => ({ ...s, status: s.dados ? "stale" : "loading", erro: null }));
    try {
      const resp = await fetch(`/.netlify/functions/wallet?endereco=${encodeURIComponent(endereco)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const dados = await resp.json();
      setEstado({ status: "ok", dados, erro: null });
    } catch (err) {
      console.warn("[WalletCard] carregar falhou", err?.message);
      setEstado((s) => ({ status: "error", dados: s.dados, erro: err?.message || "falha" }));
    }
  }, [endereco]);

  useEffect(() => { carregar(); }, [carregar]);

  const saldo = estado.dados?.saldoCentavos ?? 0;
  const transacoes = estado.dados?.transacoes ?? [];

  return (
    <section
      aria-label="Wallet Digital"
      style={{
        background: "linear-gradient(155deg, rgba(167,139,250,0.08) 0%, rgba(8,30,64,0.85) 100%)",
        border: `1px solid ${COR.border}`,
        borderRadius: "14px",
        padding: isMobile ? "1rem" : "1.25rem",
        display: "flex", flexDirection: "column", gap: "0.75rem",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.4rem" }} aria-hidden="true">🪙</span>
          <div>
            <h3 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 800, color: COR.primary, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Wallet Digital
            </h3>
            <p style={{ margin: 0, fontSize: "0.65rem", color: COR.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Vale-Crédito · §4 da spec
            </p>
          </div>
        </div>
        <button
          onClick={carregar}
          disabled={!endereco || estado.status === "loading"}
          aria-label="Atualizar saldo da wallet"
          style={{
            padding: "0.32rem 0.7rem",
            background: COR.primaryDim,
            border: `1px solid ${COR.border}`,
            borderRadius: "20px",
            color: COR.primary,
            fontSize: "0.7rem", fontWeight: 700,
            cursor: endereco && estado.status !== "loading" ? "pointer" : "not-allowed",
            opacity: endereco ? 1 : 0.5,
          }}
        >
          {estado.status === "loading" ? "⏳" : "↻ Atualizar"}
        </button>
      </header>

      {!endereco ? (
        <p style={{ margin: 0, color: COR.muted, fontSize: "0.78rem" }}>
          Faça login para ver seu saldo de Vale-Crédito.
        </p>
      ) : (
        <>
          <div style={{
            display: "flex", flexDirection: "column", gap: "0.2rem",
            padding: "0.75rem 0.9rem",
            background: "rgba(5,15,40,0.6)",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <span style={{ fontSize: "0.62rem", color: COR.muted, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
              Saldo disponível
            </span>
            <strong style={{ fontSize: isMobile ? "1.5rem" : "1.7rem", color: COR.primary, fontWeight: 900, lineHeight: 1.1 }}>
              {formatBRL(saldo)}
            </strong>
            <span style={{ fontSize: "0.66rem", color: COR.muted }}>
              Atualizado em {formatData(estado.dados?.atualizadoEm)}
              {estado.status === "stale" && <span style={{ color: "#fbbf24" }}> · stale</span>}
              {estado.status === "error" && <span style={{ color: COR.danger }}> · erro: {estado.erro}</span>}
            </span>
          </div>

          <div>
            <h4 style={{ margin: "0 0 0.4rem", fontSize: "0.72rem", color: COR.muted, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Últimas transações ({transacoes.length})
            </h4>
            {transacoes.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.74rem", color: COR.muted, fontStyle: "italic" }}>
                Nenhuma transação ainda. O Vale-Crédito é gerado quando seu produto fica abaixo do valor mínimo da cota (§4 — Regra do Saldo).
              </p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {transacoes.slice(0, 6).map((t) => (
                  <li key={t.id} style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "auto 1fr auto" : "auto 1fr auto auto",
                    gap: "0.5rem",
                    alignItems: "baseline",
                    fontSize: "0.74rem", color: COR.text,
                    padding: "0.3rem 0.5rem",
                    background: "rgba(5,15,40,0.4)",
                    borderRadius: "6px",
                  }}>
                    <span style={{ color: t.operacao === "credito" ? COR.success : COR.danger, fontWeight: 800 }}>
                      {t.operacao === "credito" ? "+" : "−"}
                    </span>
                    <span style={{ color: COR.muted, fontSize: "0.72rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          title={t.origem === "cotas-vale-credito-automatico" ? "Crédito automático: produto abaixo do mínimo da cota" : undefined}>
                      {t.origem === "cotas-vale-credito-automatico" && <span aria-label="Automático" style={{ marginRight: "0.3rem" }}>⚙️</span>}
                      {t.motivo}
                    </span>
                    <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                      {formatBRL(t.valorCentavos)}
                    </span>
                    {!isMobile && (
                      <span style={{ color: COR.muted, fontSize: "0.66rem" }}>
                        {formatData(t.em)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
