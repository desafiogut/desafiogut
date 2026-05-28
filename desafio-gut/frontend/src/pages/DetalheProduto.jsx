// DetalheProduto — Página de detalhe de um produto do Marketplace (MC15 ITEM 4).
// Rota: /produto/:id
// Exibe foto, descrição, preço, loja, GUTO apresentador, input de lance,
// LanceStatusBadge, cronômetro da edição e histórico de lances.

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import GutoAvatar from "../components/GutoAvatar.jsx";
import LanceStatusBadge from "../components/LanceStatusBadge.jsx";

const COR = {
  bg: "#0a0f1a", surface: "rgba(8,30,64,0.82)", text: "#e8f0fe",
  muted: "#94a3b8", border: "rgba(245,166,35,0.15)",
  primary: "#f5a623", teal: "#00d4aa", success: "#10b981", danger: "#ef4444",
};

function formatarTimer(segundosRestantes) {
  if (!Number.isFinite(segundosRestantes) || segundosRestantes <= 0) return "Encerrado";
  const h = Math.floor(segundosRestantes / 3600);
  const m = Math.floor((segundosRestantes % 3600) / 60);
  const s = segundosRestantes % 60;
  if (h > 0) return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

export default function DetalheProduto() {
  const { id } = useParams();
  const isMobile = useIsMobile();
  const { prazoFlash, prazoProgramado, lances, vencedor, tempoRestante, encerrado } = useAppContext();

  const [produto, setProduto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  // Lance input state
  const [lanceValor, setLanceValor] = useState("");
  const [lanceStatus, setLanceStatus] = useState(null); // { unico, valor }
  const [lanceMudou, setLanceMudou] = useState(false);
  const [ultimoLanceValor, setUltimoLanceValor] = useState(null);

  useEffect(() => {
    if (!id) return;
    let cancel = false;
    setLoading(true);
    fetch(`/.netlify/functions/produtos?id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancel) return;
        if (data) {
          setProduto(data);
          setErro(null);
        } else {
          setErro("Produto não encontrado");
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!cancel) { setErro(err.message); setLoading(false); }
      });
    return () => { cancel = true; };
  }, [id]);

  const verificarLance = (valor) => {
    if (!valor || !lances || lances.length === 0) {
      setLanceStatus(null);
      setLanceMudou(false);
      return;
    }
    const v = Number(valor);
    const ocorrencias = lances.filter((l) => l.valor === v).length;
    const unico = ocorrencias === 1;
    setLanceStatus({ unico, valor: v });

    if (ultimoLanceValor !== null && ultimoLanceValor !== v) {
      setLanceMudou(ocorrencias > 1);
    }
    setUltimoLanceValor(v);
  };

  const handleLanceChange = (e) => {
    const val = e.target.value;
    setLanceValor(val);
    if (val && Number(val) > 0) {
      verificarLance(Number(val));
    } else {
      setLanceStatus(null);
      setLanceMudou(false);
    }
  };

  // Ordena os lances do produto (se houver filtro por edição)
  const lancesProduto = lances || [];

  if (loading) {
    return (
      <div style={{ padding: "2rem", color: COR.text, textAlign: "center" }}>
        <GutoAvatar custom="detalhe-produto-loading" size={48} animate />
        <p style={{ marginTop: "1rem", color: COR.muted }}>Carregando produto…</p>
      </div>
    );
  }

  if (erro || !produto) {
    return (
      <div style={{ padding: "2rem", color: COR.text, textAlign: "center" }}>
        <p style={{ color: COR.danger, fontSize: "1.2rem", fontWeight: 700 }}>⚠️ {erro || "Produto não encontrado"}</p>
        <Link to="/vitrine" style={{ color: COR.primary, textDecoration: "none", fontWeight: 600, marginTop: "1rem", display: "inline-block" }}>
          ← Voltar à Vitrine
        </Link>
      </div>
    );
  }

  const catColor = {
    diamante: "#00d4ff", ouro: "#f5a623",
    prata: "#cbd5e1", bronze: "#cd7f32",
  }[produto.categoria] || COR.primary;

  const timerDisplay = formatarTimer(tempoRestante);

  return (
    <div style={{ padding: isMobile ? "1rem" : "1.5rem 2rem", color: COR.text, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: "0.78rem", color: COR.muted }}>
        <Link to="/vitrine" style={{ color: COR.primary, textDecoration: "none", fontWeight: 600 }}>← Vitrine</Link>
        {" "}/{" "}
        <span style={{ color: COR.text, textTransform: "capitalize" }}>{produto.categoria}</span>
        {" "}/{" "}
        <span style={{ color: COR.muted }}>{produto.nome}</span>
      </nav>

      {/* Hero — foto + info */}
      <section style={{
        display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: "1.25rem",
      }}>
        {/* Foto grande */}
        <div style={{
          borderRadius: "16px", overflow: "hidden",
          border: `1px solid ${catColor}44`,
          background: "rgba(5,15,40,0.8)",
          aspectRatio: "4/3",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {(produto.imagemBase64 || produto.imagem_url) ? (
            <img
              src={produto.imagemBase64 ? `data:${produto.mime || "image/png"};base64,${produto.imagemBase64}` : produto.imagem_url}
              alt={produto.nome}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            <span style={{ fontSize: "3rem" }}>📦</span>
          )}
        </div>

        {/* Info + Lance */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <GutoAvatar custom={`detalhe-produto-${produto.categoria}`} size={36} animate />
            <span style={{
              fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.08em",
              padding: "0.22rem 0.6rem", borderRadius: "999px",
              color: catColor, background: `${catColor}18`, border: `1px solid ${catColor}44`,
              textTransform: "uppercase",
            }}>
              {produto.categoria}
            </span>
            <span style={{
              fontSize: "0.62rem", fontWeight: 800, padding: "0.18rem 0.5rem", borderRadius: "999px",
              color: produto.status === "ativo" ? COR.success : produto.status === "vendido" ? COR.primary : produto.status === "entregue" ? COR.teal : COR.muted,
              background: produto.status === "ativo" ? "rgba(16,185,129,0.15)" : produto.status === "vendido" ? "rgba(245,166,35,0.15)" : produto.status === "entregue" ? "rgba(0,212,170,0.15)" : "rgba(148,163,184,0.15)",
            }}>
              {produto.status?.toUpperCase()}
            </span>
          </div>

          <h1 style={{
            margin: 0, fontSize: isMobile ? "1.3rem" : "1.6rem",
            fontWeight: 900, color: COR.text, lineHeight: 1.2,
          }}>
            {produto.nome}
          </h1>

          <p style={{ margin: 0, fontSize: "0.88rem", color: COR.muted, lineHeight: 1.5 }}>
            {produto.descricao || "Sem descrição fornecida pelo lojista."}
          </p>

          <div style={{
            fontSize: isMobile ? "1.6rem" : "2rem", fontWeight: 900,
            color: catColor, fontFamily: "'JetBrains Mono', monospace",
          }}>
            R$ {(produto.preco / 100).toFixed(2)}
          </div>

          {/* Cronômetro */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            padding: "0.4rem 0.75rem", borderRadius: "8px",
            background: encerrado ? "rgba(239,68,68,0.12)" : "rgba(0,212,170,0.08)",
            border: `1px solid ${encerrado ? "rgba(239,68,68,0.3)" : "rgba(0,212,170,0.25)"}`,
            fontSize: "0.8rem", fontWeight: 800,
            fontFamily: "'JetBrains Mono', monospace",
            color: encerrado ? COR.danger : COR.teal,
            alignSelf: "flex-start",
          }}>
            ⏱ {timerDisplay}
          </div>

          {/* Lance Status Badge */}
          <LanceStatusBadge valor={lanceStatus?.valor || 0} status={lanceStatus} mudou={lanceMudou} />

          {/* Input de lance */}
          {produto.status === "ativo" && !encerrado && (
            <div style={{
              padding: "0.85rem", borderRadius: "12px",
              background: "rgba(5,15,40,0.6)", border: `1px solid ${catColor}33`,
              display: "flex", flexDirection: "column", gap: "0.5rem",
            }}>
              <label style={{ fontSize: "0.72rem", color: COR.muted, fontWeight: 700 }}>
                🎯 Seu lance (centavos) — menor lance único vence
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="number" min="1" max="999999"
                  value={lanceValor}
                  onChange={handleLanceChange}
                  placeholder="Ex: 150"
                  style={{
                    flex: 1, padding: "0.55rem 0.7rem",
                    background: "rgba(5,13,30,0.8)",
                    border: `1px solid ${catColor}44`,
                    borderRadius: "8px", color: COR.text, fontSize: "0.9rem", outline: "none",
                  }}
                />
                <button
                  type="button"
                  disabled={!lanceValor || Number(lanceValor) <= 0}
                  style={{
                    padding: "0.55rem 1.25rem",
                    background: `linear-gradient(135deg, ${catColor}, ${catColor}cc)`,
                    border: "none", borderRadius: "8px", color: "#0a0f1a",
                    fontWeight: 800, fontSize: "0.85rem", cursor: "pointer",
                    opacity: (!lanceValor || Number(lanceValor) <= 0) ? 0.5 : 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  🎯 Dar Lance
                </button>
              </div>
            </div>
          )}

          {produto.status === "vendido" && produto.vencedor && (
            <div style={{
              padding: "0.85rem", borderRadius: "12px",
              background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.3)",
              fontSize: "0.82rem", color: COR.primary, fontWeight: 700,
            }}>
              🏆 Produto vendido! Vencedor registrado.
            </div>
          )}

          {produto.status === "entregue" && (
            <div style={{
              padding: "0.85rem", borderRadius: "12px",
              background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.3)",
              fontSize: "0.82rem", color: COR.teal, fontWeight: 700,
            }}>
              📦 Entregue em {produto.entregue_em ? new Date(produto.entregue_em).toLocaleDateString("pt-BR") : "—"}
            </div>
          )}
        </div>
      </section>

      {/* Histórico de lances */}
      <section style={{
        borderRadius: "16px", padding: isMobile ? "1rem" : "1.25rem",
        background: "linear-gradient(155deg, rgba(5,15,40,0.92), rgba(8,30,64,0.85))",
        border: `1px solid ${catColor}33`,
      }}>
        <h2 style={{
          margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 800,
          color: COR.primary, letterSpacing: "0.04em", textTransform: "uppercase",
        }}>
          📊 Histórico de Lances — {produto.edicaoId || "R-1"}
        </h2>
        {lancesProduto.length === 0 ? (
          <p style={{ color: COR.muted, fontSize: "0.82rem" }}>Nenhum lance registrado ainda. Seja o primeiro!</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${catColor}22` }}>
                  <th style={{ padding: "0.4rem 0.5rem", textAlign: "left", color: COR.muted, fontWeight: 700 }}>#</th>
                  <th style={{ padding: "0.4rem 0.5rem", textAlign: "left", color: COR.muted, fontWeight: 700 }}>Carteira</th>
                  <th style={{ padding: "0.4rem 0.5rem", textAlign: "right", color: COR.muted, fontWeight: 700 }}>Valor</th>
                  <th style={{ padding: "0.4rem 0.5rem", textAlign: "center", color: COR.muted, fontWeight: 700 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {lancesProduto.map((l, i) => (
                  <tr key={l.txHash || i} style={{ borderBottom: `1px solid ${catColor}11` }}>
                    <td style={{ padding: "0.4rem 0.5rem", color: COR.muted }}>{i + 1}</td>
                    <td style={{ padding: "0.4rem 0.5rem", color: COR.text, fontFamily: "monospace", fontSize: "0.7rem" }}>
                      {l.endereco ? `${l.endereco.slice(0, 6)}…${l.endereco.slice(-4)}` : "—"}
                    </td>
                    <td style={{ padding: "0.4rem 0.5rem", textAlign: "right", color: COR.text, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                      R$ {(l.valor / 100).toFixed(2)}
                    </td>
                    <td style={{ padding: "0.4rem 0.5rem", textAlign: "center" }}>
                      <span style={{
                        fontSize: "0.62rem", fontWeight: 800, padding: "0.15rem 0.4rem", borderRadius: "999px",
                        color: l.repetido ? "#f97316" : COR.success,
                        background: l.repetido ? "rgba(249,115,22,0.15)" : "rgba(16,185,129,0.15)",
                      }}>
                        {l.repetido ? "REPETIDO" : "ÚNICO"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
