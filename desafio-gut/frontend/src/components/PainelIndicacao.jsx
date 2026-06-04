// PainelIndicacao — Sistema "Indique e Ganhe" (Mega Comando 10 / Item 4).
//
// Mostra: código pessoal IND-XXXXXX, botões Copiar e Compartilhar, cards de
// estatísticas (indicados, converteram, senhas ganhas) e mensagem motivacional.
// Aderente ao mesmo design system inline-style dos outros componentes da pasta
// (WalletCard, VoucherPanel, RenovacaoCard) — Tailwind v4 só está disponível
// no globals.css mas o padrão prático aqui é JSX inline-style.

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";

const COR = {
  primary:    "#00d4aa",
  primaryDim: "rgba(0,212,170,0.15)",
  gold:       "#f5a623",
  text:       "#e8f0fe",
  muted:      "#94a3b8",
  success:    "#10b981",
  blue300:    "#fbbf24",
  border:     "rgba(0,212,170,0.32)",
};

export default function PainelIndicacao({ isMobile: isMobileProp }) {
  const isMobileHook = useIsMobile();
  const isMobile = typeof isMobileProp === "boolean" ? isMobileProp : isMobileHook;
  const { address, authToken, isConnected } = useAppContext();

  const [dados, setDados] = useState({ status: "idle", codigo: null, total_indicados: 0, total_convertidos: 0, senhas_ganhas: 0, erro: null });
  const [copiado, setCopiado] = useState(false);
  const [compartilhado, setCompartilhado] = useState(false);

  const carregar = useCallback(async () => {
    if (!address || !authToken) {
      setDados((s) => ({ ...s, status: "idle" }));
      return;
    }
    setDados((s) => ({ ...s, status: "loading", erro: null }));
    try {
      const resp = await fetch(`/.netlify/functions/referral?acao=meu-codigo&endereco=${encodeURIComponent(address)}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (resp.status === 503) {
        setDados({ status: "off", codigo: null, total_indicados: 0, total_convertidos: 0, senhas_ganhas: 0, erro: null });
        return;
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const d = await resp.json();
      setDados({
        status: "ok",
        codigo: d.codigo,
        total_indicados:   Number(d.total_indicados   || 0),
        total_convertidos: Number(d.total_convertidos || 0),
        senhas_ganhas:     Number(d.senhas_ganhas     || 0),
        erro: null,
      });
    } catch (err) {
      setDados((s) => ({ ...s, status: "error", erro: err?.message || "falha" }));
    }
  }, [address, authToken]);

  useEffect(() => { carregar(); }, [carregar]);

  const linkConvite = dados.codigo
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${dados.codigo}`
    : null;

  async function copiarCodigo() {
    if (!dados.codigo) return;
    try {
      await navigator.clipboard.writeText(dados.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      console.warn("[PainelIndicacao] clipboard.writeText falhou:", err?.message);
    }
  }

  async function compartilhar() {
    if (!linkConvite) return;
    const texto = `🎯 Te convido para o DesafioGUT! Use meu código ${dados.codigo} e, no teu 1º lance, nós dois ganhamos +1 senha.`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "DesafioGUT — Indique e Ganhe", text: texto, url: linkConvite });
      } else {
        await navigator.clipboard.writeText(`${texto}\n${linkConvite}`);
        setCompartilhado(true);
        setTimeout(() => setCompartilhado(false), 2200);
      }
    } catch (err) {
      // navigator.share rejeita silenciosamente quando usuário cancela — ignoramos.
      console.warn("[PainelIndicacao] compartilhar falhou:", err?.message);
    }
  }

  const cardStyle = {
    background:      "rgba(10,16,42,0.6)",
    border:          `1px solid ${COR.border}`,
    borderRadius:    "16px",
    padding:         isMobile ? "1rem" : "1.25rem",
    backdropFilter:  "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    marginBottom:    isMobile ? "1.25rem" : "1.5rem",
  };
  const tituloStyle = {
    margin:        `0 0 ${isMobile ? "0.6rem" : "0.8rem"}`,
    fontSize:      isMobile ? "0.85rem" : "0.88rem",
    fontWeight:    "800", color: COR.primary, letterSpacing: "0.03em",
  };
  const botaoPrimario = {
    width: "100%",
    padding: isMobile ? "0.75rem 1rem" : "0.7rem 1.2rem",
    background: "linear-gradient(135deg,#00d4aa,#0aa37e)",
    border: "none", borderRadius: "12px", color: "#04080f",
    fontWeight: "800", fontSize: "0.85rem", cursor: "pointer",
    boxShadow: "0 4px 14px rgba(0,212,170,0.35)",
  };
  const botaoSecundario = {
    width: "100%",
    padding: isMobile ? "0.75rem 1rem" : "0.7rem 1.2rem",
    background: "rgba(245,166,35,0.12)",
    border: "1px solid rgba(245,166,35,0.35)",
    borderRadius: "12px", color: COR.gold,
    fontWeight: "800", fontSize: "0.85rem", cursor: "pointer",
  };
  const statCardStyle = {
    background:   "rgba(3,15,36,0.6)",
    border:       "1px solid rgba(0,212,170,0.18)",
    borderRadius: "12px",
    padding:      "0.85rem 1rem",
    minWidth:     0,
  };

  if (!isConnected) {
    return (
      <div style={cardStyle}>
        <h3 style={tituloStyle}>🎁 Indique e Ganhe</h3>
        <p style={{ margin: 0, color: COR.muted, fontSize: "0.85rem" }}>
          Faça login para obter seu código e começar a indicar amigos.
        </p>
      </div>
    );
  }

  if (dados.status === "off") {
    return (
      <div style={cardStyle}>
        <h3 style={tituloStyle}>🎁 Indique e Ganhe</h3>
        <p style={{ margin: 0, color: COR.muted, fontSize: "0.82rem" }}>
          O programa de indicação está temporariamente desligado.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      style={cardStyle}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
        <h3 style={tituloStyle}>🎁 Indique e Ganhe</h3>
        <span style={{
          fontSize: "0.62rem", color: COR.muted,
          textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700,
        }}>
          MC10 · Growth
        </span>
      </div>

      <p style={{ margin: "0 0 1rem", fontSize: isMobile ? "0.85rem" : "0.9rem", color: COR.text, lineHeight: 1.5 }}>
        Quando um amigo entra com o seu código e dá o
        <strong style={{ color: COR.primary }}> 1º lance, vocês dois ganham +1 senha! </strong>
        Compartilhe e cresça com a gente.
      </p>

      {/* Código pessoal */}
      <div style={{
        ...statCardStyle,
        marginBottom: "1rem",
        background: "linear-gradient(180deg, rgba(0,212,170,0.08), rgba(0,212,170,0.02))",
        borderColor: COR.border,
      }}>
        <div style={{
          fontSize: "0.62rem", color: COR.muted, textTransform: "uppercase",
          letterSpacing: "0.06em", marginBottom: "0.35rem", fontWeight: 700,
        }}>Seu código de indicação</div>
        <div style={{
          fontFamily: "monospace", fontSize: isMobile ? "1.5rem" : "1.8rem",
          fontWeight: 900, color: COR.primary, letterSpacing: "0.08em",
          marginBottom: "0.85rem",
        }}>
          {dados.status === "loading" ? "IND-——————" : (dados.codigo || "IND-??????")}
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: "0.6rem",
        }}>
          <button onClick={copiarCodigo} disabled={!dados.codigo} style={botaoPrimario}>
            {copiado ? "✓ Copiado!" : "📋 Copiar código"}
          </button>
          <button onClick={compartilhar} disabled={!dados.codigo} style={botaoSecundario}>
            {compartilhado ? "✓ Texto copiado" : "📤 Compartilhar"}
          </button>
        </div>
      </div>

      {/* Estatísticas — grid 2 colunas desktop / 1 mobile (3 cards) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
        gap: "0.6rem",
        marginBottom: "0.85rem",
      }}>
        <div style={statCardStyle}>
          <div style={{ fontSize: "0.62rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: "0.25rem" }}>
            👥 Indicados
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: COR.text }}>
            {dados.total_indicados}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: "0.62rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: "0.25rem" }}>
            ✅ Converteram
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: COR.success }}>
            {dados.total_convertidos}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: "0.62rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: "0.25rem" }}>
            🎁 Senhas ganhas
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: COR.gold }}>
            {dados.senhas_ganhas}
          </div>
        </div>
      </div>

      {/* Lista anonimizada de indicados convertidos */}
      {dados.total_convertidos > 0 && (
        <div style={{ ...statCardStyle, padding: "0.7rem 0.9rem" }}>
          <div style={{ fontSize: "0.62rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: "0.4rem" }}>
            Últimos convertidos (anonimizado)
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {Array.from({ length: Math.min(dados.total_convertidos, 10) }).map((_, i) => (
              <span key={i} style={{
                fontSize: "0.72rem", padding: "0.25rem 0.55rem",
                background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.32)",
                borderRadius: "999px", color: COR.success, fontWeight: 700,
              }}>
                Indicado {i + 1}
              </span>
            ))}
          </div>
        </div>
      )}

      {dados.status === "error" && (
        <p style={{ margin: "0.75rem 0 0", fontSize: "0.72rem", color: "#ef4444" }}>
          ⚠️ Não foi possível carregar suas estatísticas: {dados.erro}
        </p>
      )}

      <div style={{
        marginTop: "0.85rem", fontSize: "0.7rem", color: COR.muted, lineHeight: 1.4,
      }}>
        Limite: até <strong>10 indicações convertidas por mês</strong>. Anti-fraude: FingerprintJS + Sybil check (MC3) rejeita indicações do mesmo dispositivo.
      </div>
    </motion.div>
  );
}
