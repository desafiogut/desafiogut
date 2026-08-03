// ComandoButton — execução de comandos operacionais com confirmação.
// MC89.12 (Fase 3). Modal inline com justificativa obrigatória.
// Sem dependências externas.

import { useState } from "react";
import { Button, Input } from "../ui";

export default function ComandoButton({ acao, label, descricao, nivelMinimo, nivelAdmin, onExecutar, disabled }) {
  const [aberto, setAberto] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const bloqueado = nivelMinimo === "super-admin" && nivelAdmin !== "super-admin";
  const podeExecutar = !bloqueado && !disabled;

  async function confirmar() {
    if (!justificativa.trim() || justificativa.trim().length < 6) return;
    setExecutando(true);
    setResultado(null);
    try {
      const r = await onExecutar(acao, justificativa.trim());
      setResultado(r);
    } catch (err) {
      setResultado({ ok: false, mensagem: err?.message || "falha" });
    } finally {
      setExecutando(false);
    }
  }

  function fechar() {
    setAberto(false);
    setJustificativa("");
    setResultado(null);
  }

  return (
    <div style={{
      padding: "0.65rem 0.8rem",
      background: "rgba(13,18,53,0.25)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "8px",
      display: "flex", flexDirection: "column", gap: "0.5rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <div>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#e8f0fe" }}>{label}</span>
          <div style={{ fontSize: "0.66rem", color: "#94a3b8", marginTop: "0.1rem" }}>{descricao}</div>
        </div>
        {bloqueado ? (
          <span style={{ fontSize: "0.64rem", color: "#64748b", fontStyle: "italic" }}>super-admin</span>
        ) : (
          <Button
            variant="ghost" size="sm"
            onClick={() => setAberto(true)}
            disabled={!podeExecutar}
            className="!border-white/20 !text-[#e8f0fe] !rounded-md shrink-0"
          >
            Executar
          </Button>
        )}
      </div>

      {aberto && (
        <div style={{
          padding: "0.7rem",
          background: "rgba(0,0,0,0.2)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "8px",
          display: "flex", flexDirection: "column", gap: "0.5rem",
        }}>
          {!resultado ? (
            <>
              <p style={{ margin: 0, fontSize: "0.7rem", color: "#fbbf24" }}>
                {/* MC89.44 — saiu o emoji de aviso que abria esta linha. A linha
                    já é âmbar e já diz que a ação fica no log; o emoji não
                    acrescentava aviso nenhum e quebrava a regra de UI neutra do
                    MC89.4. Estava invisível porque a guarda de emoji não varria
                    `components/admin` — passa a varrer. */}
                Confirmar <strong>{label}</strong>. Esta ação será registada no log de auditoria.
              </p>
              <Input
                type="text"
                placeholder="Justificativa (mín. 6 caracteres)"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                autoFocus
              />
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <Button
                  variant="primary" size="sm"
                  onClick={confirmar}
                  disabled={executando || justificativa.trim().length < 6}
                >
                  {executando ? "Executando…" : "Confirmar"}
                </Button>
                <Button variant="ghost" size="sm" onClick={fechar}
                  className="!border-white/15 !text-[#94a3b8]">
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <p style={{
                margin: 0, fontSize: "0.76rem", color: resultado.ok ? "#10b981" : "#ef4444",
                fontWeight: 600,
              }}>
                {resultado.ok ? "✓" : "✗"} {resultado.mensagem}
              </p>
              <Button variant="ghost" size="sm" onClick={fechar}
                className="!border-white/15 !text-[#94a3b8] self-start">
                Fechar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
