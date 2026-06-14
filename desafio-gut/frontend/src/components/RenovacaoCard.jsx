// RenovacaoCard — status e renovação de adesão (REQ-03).
//
// Mostra status atual da adesão e permite solicitar renovação.
// Fluxo: cliente solicita → vê PIX para pagar → admin confirma manualmente.

import { useEffect, useState, useCallback } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { GlassCard } from "@/components/ui";

const COR = {
  primary: "#f5a623",
  primaryDim: "rgba(245,166,35,0.15)",
  border: "rgba(245,166,35,0.30)",
  text: "#e8f0fe",
  muted: "#94a3b8",
  success: "#10b981",
  warn: "#fbbf24",
  danger: "#ef4444",
};

const STATUS_INFO = {
  "nao-iniciada": { cor: COR.muted,   icone: "○", texto: "Adesão não iniciada" },
  "pendente":     { cor: COR.warn,    icone: "🟡", texto: "Aguardando confirmação do pagamento" },
  "ativa":        { cor: COR.success, icone: "🟢", texto: "Adesão ativa" },
  "vencendo":     { cor: COR.warn,    icone: "🟡", texto: "Adesão vencendo em breve" },
  "vencida":      { cor: COR.danger,  icone: "🔴", texto: "Adesão vencida" },
};

const VALOR_RENOVACAO_BRL = 660; // valor mínimo padrão (R$ 660, equivalente Bronze)

function formatData(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }); }
  catch { return iso; }
}

export default function RenovacaoCard({ endereco, isMobile = false }) {
  const { authToken } = useAppContext();
  const [estado, setEstado] = useState({ status: "idle", dados: null, erro: null });
  const [solicitando, setSolicitando] = useState(false);
  const [msgSolicit, setMsgSolicit] = useState("");

  const carregar = useCallback(async () => {
    if (!endereco || !authToken) {
      setEstado({ status: "idle", dados: null, erro: null });
      return;
    }
    setEstado((s) => ({ ...s, status: s.dados ? "stale" : "loading", erro: null }));
    try {
      const resp = await fetch(`/.netlify/functions/renovacao-adesao?cliente_id=${encodeURIComponent(endereco)}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setEstado({ status: "ok", dados: data, erro: null });
    } catch (err) {
      setEstado((s) => ({ status: "error", dados: s.dados, erro: err?.message || "falha" }));
    }
  }, [endereco, authToken]);

  useEffect(() => { carregar(); }, [carregar]);

  async function solicitar() {
    if (!endereco) return;
    setSolicitando(true); setMsgSolicit("");
    try {
      const resp = await fetch("/.netlify/functions/renovacao-adesao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "solicitar", cliente_id: endereco, valor: VALOR_RENOVACAO_BRL }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setMsgSolicit(`✗ ${data?.error?.message || `HTTP ${resp.status}`}`);
        return;
      }
      setMsgSolicit("✓ Solicitação registrada — pague o PIX abaixo");
      carregar();
    } catch (err) {
      setMsgSolicit(err?.message || "falha");
    } finally {
      setSolicitando(false);
    }
  }

  const statusAtual = estado.dados?.status || "nao-iniciada";
  const info        = STATUS_INFO[statusAtual] || STATUS_INFO["nao-iniciada"];
  const pix         = estado.dados?.pix;
  const podeSolicitar = statusAtual === "nao-iniciada" || statusAtual === "vencendo" || statusAtual === "vencida";

  return (
    <GlassCard
      as="section"
      aria-label="Status da adesão e renovação"
      className={`flex flex-col ${isMobile ? 'gap-3 p-4' : 'gap-3 p-5'}`}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.4rem" }} aria-hidden="true">📋</span>
          <div>
            <h3 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 800, color: COR.primary, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Adesão (Consultoria)
            </h3>
            <p style={{ margin: 0, fontSize: "0.65rem", color: COR.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              §5 da spec · PIX manual + aprovação admin
            </p>
          </div>
        </div>
        <button
          onClick={carregar}
          disabled={!endereco || estado.status === "loading"}
          aria-label="Atualizar status da adesão"
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
        >{estado.status === "loading" ? "⏳" : "↻"}</button>
      </header>

      {!endereco ? (
        <p style={{ margin: 0, color: COR.muted, fontSize: "0.78rem" }}>Faça login para ver sua adesão.</p>
      ) : (
        <>
          {/* Status atual */}
          <div style={{
            display: "flex", flexDirection: "column", gap: "0.25rem",
            padding: "0.75rem 0.9rem",
            background: "rgba(5,15,40,0.6)",
            borderRadius: "10px",
            border: `1px solid ${info.cor}33`,
          }}>
            <span style={{ fontSize: "0.62rem", color: COR.muted, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
              Status
            </span>
            <strong style={{ fontSize: isMobile ? "1rem" : "1.05rem", color: info.cor, fontWeight: 800 }}>
              {info.icone} {info.texto}
            </strong>
            {estado.dados?.dias_restantes != null && estado.dados.dias_restantes >= 0 && (
              <span style={{ fontSize: "0.74rem", color: COR.text }}>
                {estado.dados.dias_restantes} dia(s) restante(s)
                {estado.dados?.registro?.validade && (
                  <> · vence em <strong>{formatData(estado.dados.registro.validade)}</strong></>
                )}
              </span>
            )}
            {estado.status === "error" && (
              <span style={{ fontSize: "0.66rem", color: COR.danger }}>erro: {estado.erro}</span>
            )}
          </div>

          {/* Solicitar */}
          {podeSolicitar && (
            <div>
              <button
                type="button"
                onClick={solicitar}
                disabled={solicitando}
                aria-label="Solicitar renovação de adesão"
                style={{
                  width: "100%", padding: "0.7rem 0.9rem",
                  background: "linear-gradient(135deg,#f5a623,#f97316)",
                  border: "none", borderRadius: "10px",
                  color: "#0a0f1a", fontWeight: 800, fontSize: "0.85rem",
                  cursor: solicitando ? "wait" : "pointer",
                }}
              >
                {solicitando ? "⏳ Solicitando…" : `📋 Solicitar renovação (R$ ${VALOR_RENOVACAO_BRL})`}
              </button>
              {msgSolicit && (
                <p style={{ margin: "0.4rem 0 0", fontSize: "0.74rem", color: msgSolicit.startsWith("✓") ? COR.success : COR.danger }}>
                  {msgSolicit}
                </p>
              )}
            </div>
          )}

          {/* Instruções PIX */}
          {statusAtual === "pendente" && pix && (
            <div style={{
              padding: "0.85rem 1rem",
              background: "rgba(251,191,36,0.06)",
              border: "1px solid rgba(251,191,36,0.3)",
              borderRadius: "10px",
              fontSize: "0.78rem", color: COR.text, lineHeight: 1.55,
            }}>
              <strong style={{ color: COR.warn }}>📌 Pague o PIX para confirmar:</strong>
              <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.2rem" }}>
                <li>Chave PIX: <strong style={{ color: COR.primary }}>{pix.email}</strong></li>
                <li>Banco: {pix.banco}</li>
                <li>Valor: R$ {VALOR_RENOVACAO_BRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</li>
                <li style={{ fontSize: "0.72rem", color: COR.muted, marginTop: "0.3rem" }}>
                  Após o pagamento, o Admin tem até 24h para confirmar. Acompanhe aqui.
                </li>
              </ul>
            </div>
          )}

          {/* Histórico */}
          {Array.isArray(estado.dados?.registro?.historico) && estado.dados.registro.historico.length > 0 && (
            <details style={{ fontSize: "0.74rem", color: COR.muted }}>
              <summary style={{ cursor: "pointer", color: COR.muted, fontWeight: 700 }}>
                Histórico ({estado.dados.registro.historico.length})
              </summary>
              <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                {[...estado.dados.registro.historico].reverse().slice(0, 8).map((h, i) => (
                  <li key={i} style={{ fontSize: "0.7rem" }}>
                    {formatData(h.em)} — <strong>{h.de}</strong> → <strong>{h.para}</strong>
                    {h.por && <> (por {h.por})</>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </GlassCard>
  );
}
