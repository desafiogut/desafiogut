// VoucherPanel — Bônus Diamante / Vouchers de Networking (§7 da spec).
//
// Funções para o usuário comum:
//   - Listar vouchers EMITIDOS pelo seu endereço (GET /voucher?endereco_emissor=).
//   - Consultar um código por número (POST /voucher acao=consultar).
//
// Geração nova é admin-only nesta onda (sem cota Diamante real ainda), por
// isso o painel mostra os vouchers existentes e permite só consulta — não
// expõe botão "gerar" para o cliente.
//
// Resgate (acao=resgatar) também não é executado daqui, porque deve estar
// embutido no fluxo de compra de fichas (próxima onda). O painel apenas
// mostra o estado.

import { useEffect, useState, useCallback } from "react";

const COR = {
  diamond:   "#00d4ff",
  diamondBg: "rgba(0,212,255,0.10)",
  border:    "rgba(0,212,255,0.35)",
  text:      "#e8f0fe",
  muted:     "#94a3b8",
  success:   "#10b981",
  warn:      "#fbbf24",
  danger:    "#ef4444",
};

function formatData(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }); }
  catch { return iso; }
}

export default function VoucherPanel({ endereco, isMobile = false }) {
  const [emitidos, setEmitidos] = useState({ status: "idle", vouchers: [], erro: null });
  const [codigoBusca, setCodigoBusca] = useState("");
  const [consulta, setConsulta] = useState({ status: "idle", resultado: null, erro: null });

  const carregarEmitidos = useCallback(async () => {
    if (!endereco) {
      setEmitidos({ status: "idle", vouchers: [], erro: null });
      return;
    }
    setEmitidos((s) => ({ ...s, status: s.vouchers.length ? "stale" : "loading", erro: null }));
    try {
      const resp = await fetch(`/.netlify/functions/voucher?endereco_emissor=${encodeURIComponent(endereco)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setEmitidos({ status: "ok", vouchers: data.vouchers || [], erro: null });
    } catch (err) {
      setEmitidos((s) => ({ status: "error", vouchers: s.vouchers, erro: err?.message || "falha" }));
    }
  }, [endereco]);

  useEffect(() => { carregarEmitidos(); }, [carregarEmitidos]);

  async function consultarCodigo(e) {
    e.preventDefault();
    const codigo = codigoBusca.trim().toUpperCase();
    if (!codigo) return;
    setConsulta({ status: "loading", resultado: null, erro: null });
    try {
      const resp = await fetch("/.netlify/functions/voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "consultar", codigo }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setConsulta({ status: "error", resultado: null, erro: data?.error?.message || `HTTP ${resp.status}` });
        return;
      }
      setConsulta({ status: "ok", resultado: data, erro: null });
    } catch (err) {
      setConsulta({ status: "error", resultado: null, erro: err?.message || "falha" });
    }
  }

  return (
    <section
      aria-label="Vouchers de Networking"
      style={{
        background: "linear-gradient(155deg, rgba(0,212,255,0.06) 0%, rgba(8,30,64,0.85) 100%)",
        border: `1px solid ${COR.border}`,
        borderRadius: "14px",
        padding: isMobile ? "1rem" : "1.25rem",
        display: "flex", flexDirection: "column", gap: "0.85rem",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.4rem" }} aria-hidden="true">💎</span>
          <div>
            <h3 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 800, color: COR.diamond, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Vouchers de Networking
            </h3>
            <p style={{ margin: 0, fontSize: "0.65rem", color: COR.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Bônus Diamante · §7 da spec
            </p>
          </div>
        </div>
        <button
          onClick={carregarEmitidos}
          disabled={!endereco || emitidos.status === "loading"}
          aria-label="Atualizar lista de vouchers"
          style={{
            padding: "0.32rem 0.7rem",
            background: COR.diamondBg,
            border: `1px solid ${COR.border}`,
            borderRadius: "20px",
            color: COR.diamond,
            fontSize: "0.7rem", fontWeight: 700,
            cursor: endereco && emitidos.status !== "loading" ? "pointer" : "not-allowed",
            opacity: endereco ? 1 : 0.5,
          }}
        >
          {emitidos.status === "loading" ? "⏳" : "↻ Atualizar"}
        </button>
      </header>

      {/* Lista de vouchers emitidos pelo endereço atual (Diamante real ou teste) */}
      {!endereco ? (
        <p style={{ margin: 0, color: COR.muted, fontSize: "0.78rem" }}>
          Faça login para ver vouchers emitidos pelo seu endereço.
        </p>
      ) : (
        <div>
          <h4 style={{ margin: "0 0 0.4rem", fontSize: "0.72rem", color: COR.muted, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Emitidos por este endereço ({emitidos.vouchers.length})
          </h4>
          {emitidos.vouchers.length === 0 ? (
            <p style={{ margin: 0, fontSize: "0.74rem", color: COR.muted, fontStyle: "italic", lineHeight: 1.4 }}>
              Nenhum voucher emitido ainda. Clientes Diamante recebem 10 vouchers de convite (REQ-24); a emissão é feita pelo Admin.
            </p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {emitidos.vouchers.map((v) => (
                <li key={v.codigo} style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr auto" : "auto 1fr auto auto",
                  gap: "0.5rem",
                  alignItems: "baseline",
                  padding: "0.4rem 0.6rem",
                  background: "rgba(5,15,40,0.45)",
                  borderRadius: "6px",
                  fontSize: "0.74rem",
                }}>
                  <code style={{ color: COR.diamond, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{v.codigo}</code>
                  {!isMobile && (
                    <span style={{ color: COR.muted, fontSize: "0.7rem" }}>
                      criado {formatData(v.criadoEm)}
                    </span>
                  )}
                  {!isMobile && v.resgatadoEm && (
                    <span style={{ color: COR.muted, fontSize: "0.7rem" }}>
                      resgatado {formatData(v.resgatadoEm)}
                    </span>
                  )}
                  <span style={{
                    fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.06em",
                    padding: "0.18rem 0.45rem", borderRadius: "999px",
                    color: v.ativo ? COR.success : COR.muted,
                    background: v.ativo ? "rgba(16,185,129,0.16)" : "rgba(148,163,184,0.12)",
                    border: `1px solid ${v.ativo ? "rgba(16,185,129,0.35)" : "rgba(148,163,184,0.25)"}`,
                    textTransform: "uppercase",
                  }}>
                    {v.ativo ? "Disponível" : "Resgatado"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {emitidos.status === "error" && (
            <p style={{ margin: "0.4rem 0 0", fontSize: "0.72rem", color: COR.danger }}>
              Erro ao carregar: {emitidos.erro}
            </p>
          )}
        </div>
      )}

      {/* Consulta avulsa: qualquer um pode validar um código */}
      <div style={{ borderTop: `1px dashed ${COR.border}`, paddingTop: "0.75rem" }}>
        <h4 style={{ margin: "0 0 0.4rem", fontSize: "0.72rem", color: COR.muted, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Consultar código
        </h4>
        <form onSubmit={consultarCodigo} style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <input
            type="text"
            value={codigoBusca}
            onChange={(e) => setCodigoBusca(e.target.value)}
            placeholder="GUT-XXXXXXXX"
            aria-label="Código do voucher"
            style={{
              flex: 1, minWidth: "140px",
              padding: "0.45rem 0.7rem",
              background: "rgba(5,15,40,0.6)",
              border: `1px solid ${COR.border}`,
              borderRadius: "8px",
              color: COR.text,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.82rem",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={!codigoBusca.trim() || consulta.status === "loading"}
            style={{
              padding: "0.45rem 0.9rem",
              background: COR.diamondBg,
              border: `1px solid ${COR.border}`,
              borderRadius: "8px",
              color: COR.diamond,
              fontSize: "0.78rem", fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {consulta.status === "loading" ? "⏳" : "Validar"}
          </button>
        </form>
        {consulta.resultado && (
          <div style={{ marginTop: "0.5rem", fontSize: "0.74rem", color: COR.text, lineHeight: 1.45 }}>
            Código <code style={{ color: COR.diamond }}>{consulta.resultado.codigo}</code>{" "}
            está {consulta.resultado.ativo ? (
              <strong style={{ color: COR.success }}>disponível</strong>
            ) : (
              <strong style={{ color: COR.muted }}>resgatado em {formatData(consulta.resultado.resgatadoEm)}</strong>
            )}.
            <br />
            Emissor: <code style={{ fontSize: "0.7rem", color: COR.muted }}>{consulta.resultado.emissor?.slice(0,10)}…{consulta.resultado.emissor?.slice(-6)}</code>
          </div>
        )}
        {consulta.erro && (
          <p style={{ margin: "0.4rem 0 0", fontSize: "0.72rem", color: COR.warn }}>{consulta.erro}</p>
        )}
      </div>
    </section>
  );
}
