import { useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { useIdioma } from "../context/IdiomaContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { GlassCard } from "@/components/ui";
import { Button } from "@/components/ui";
import BotaoLoginPrincipal from "../components/BotaoLoginPrincipal.jsx";
// MC25.3 — SliderOpacidade removido. Vidro fixo (.gut-glass-standard).

const COR = {
  primary: "#f5a623", primaryDim: "rgba(245,166,35,0.15)",
  text: "#e8f0fe", muted: "#6b7db8",
  success: "#10b981", danger: "#ef4444", blue300: "#fbbf24", gold: "#f5a623",
};

export default function Configuracoes() {
  const isMobile = useIsMobile();
  const { isConnected, address, userLabel, desconectar, abrirModal } = useAppContext();
  const { lang, setLang, t } = useIdioma();

  const [notifLances,    setNotifLances]    = useState(true);
  const [notifVencedor,  setNotifVencedor]  = useState(true);
  const [notifPix,       setNotifPix]       = useState(false);
  const [salvo,          setSalvo]          = useState(false);

  function handleSalvar() {
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  }

  const pad        = isMobile ? "1rem" : "2rem";
  const cardPad    = isMobile ? "1rem" : "1.25rem";
  const sectionGap = isMobile ? "1.25rem" : "1.5rem";

  const cardCls = isMobile ? "p-4" : "p-5";
  const cardTituloStyle = {
    margin: `0 0 ${isMobile ? "0.75rem" : "1rem"}`,
    fontSize: isMobile ? "0.88rem" : "0.9rem",
    fontWeight: "800", color: COR.blue300, letterSpacing: "0.03em",
  };

  return (
    <div style={{ padding: pad, flex: 1 }}>
      <header style={{ marginBottom: sectionGap }}>
        <h1 style={{
          margin: "0 0 0.35rem",
          fontSize: isMobile ? "1.3rem" : "1.5rem",
          fontWeight: "900", color: COR.text, lineHeight: 1.2,
        }}>{t("config.titulo")}</h1>
        <p style={{ margin: 0, color: COR.muted, fontSize: isMobile ? "0.82rem" : "0.88rem", lineHeight: 1.4 }}>
          {t("config.subtitulo")}
        </p>
      </header>

      {/* Conta */}
      <GlassCard className={`${cardCls} ${isMobile ? 'mb-5' : 'mb-6'}`}>
        <h3 style={cardTituloStyle}>{t("config.conta")}</h3>
        {isConnected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <InfoRow label="Usuário" value={userLabel || "—"} isMobile={isMobile} />
            <InfoRow label="Carteira" value={address} mono breakable isMobile={isMobile} />
            <InfoRow label="Tipo de Auth" value="Privy Embedded Wallet" isMobile={isMobile} />
            <InfoRow label="Status" value="✅ Conectado" valueColor={COR.success} isMobile={isMobile} />

            <div style={{ marginTop: "0.75rem" }}>
              <Button variant="ghost" size="md" onClick={desconectar}
                className={`${isMobile ? "w-full" : ""} !border-[#ef4444]/30 !bg-[#ef4444]/[0.1] !text-[#ef4444]`}>
                {t("config.desconectar")}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ color: COR.muted, marginBottom: "1rem", fontSize: isMobile ? "0.85rem" : "0.9rem" }}>
              Faça login para acessar as configurações da sua conta.
            </p>
            <BotaoLoginPrincipal onClick={abrirModal} size="md" fullWidth={isMobile} />
          </div>
        )}
      </GlassCard>

      {/* Notificações */}
      <GlassCard className={`${cardCls} ${isMobile ? 'mb-5' : 'mb-6'}`}>
        <h3 style={{ ...cardTituloStyle, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>{t("config.notificacoes")}</span>
          <span style={{
            fontSize: "0.6rem", color: COR.gold,
            background: "rgba(245,166,35,0.12)",
            border: "1px solid rgba(245,166,35,0.3)",
            padding: "0.15rem 0.5rem", borderRadius: "10px",
            letterSpacing: "0.04em",
          }}>{t("config.emBreve")}</span>
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {[
            { label: t("config.notifLances"),      value: notifLances,   setter: setNotifLances   },
            { label: t("config.notifVencedor"),       value: notifVencedor, setter: setNotifVencedor },
            { label: t("config.notifPix"), value: notifPix,      setter: setNotifPix      },
          ].map(({ label, value, setter }) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem",
            }}>
              <span style={{ fontSize: isMobile ? "0.84rem" : "0.86rem", color: COR.text }}>{label}</span>
              <button
                onClick={() => setter((v) => !v)}
                aria-pressed={value}
                style={{
                  width: "44px", height: "24px", borderRadius: "12px", border: "none",
                  background: value ? COR.primary : "rgba(255,255,255,0.1)",
                  cursor: "pointer", position: "relative",
                  transition: "background 0.2s", flexShrink: 0,
                }}
              >
                <div style={{
                  width: "18px", height: "18px", borderRadius: "50%",
                  background: "#fff", position: "absolute",
                  top: "3px", left: value ? "23px" : "3px",
                  transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                }} />
              </button>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Preferências */}
      <GlassCard className={`${cardCls} ${isMobile ? 'mb-5' : 'mb-6'}`}>
        <h3 style={cardTituloStyle}>{t("config.preferencias")}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Idioma */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            gap: "0.75rem", flexWrap: "wrap",
          }}>
            <span style={{ fontSize: isMobile ? "0.84rem" : "0.86rem", color: COR.text }}>{t("config.idioma")}</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              aria-label={t("config.idioma")}
              style={{
                background: "rgba(13,18,53,0.25)",
                border: "1px solid rgba(245,166,35,0.25)",
                borderRadius: "8px", color: COR.blue300,
                padding: "0.4rem 0.75rem",
                fontSize: "0.82rem", cursor: "pointer",
              }}
            >
              <option value="pt">🇧🇷 Português (Brasil)</option>
              <option value="en">🇺🇸 English (US)</option>
              <option value="es">🇪🇸 Español</option>
            </select>
          </div>

          {/* MC25.3 — Slider de opacidade removido. O vidro .gut-glass-standard é fixo e imutável. */}
        </div>
      </GlassCard>

      {/* Sobre */}
      <GlassCard className={cardCls}>
        <h3 style={cardTituloStyle}>{t("config.sobre")}</h3>
        <div style={{
          display: "flex", flexDirection: "column", gap: "0.5rem",
          fontSize: isMobile ? "0.8rem" : "0.84rem", color: COR.muted, lineHeight: 1.5,
        }}>
          <SobreItem label="Versão" value="Beta v0.9" valueColor={COR.blue300} />
          <SobreItem label="Stack" value="React 18 · Vite 8 · Tailwind v4 · Privy · Ethers v6" />
          <SobreItem label="Rede" value="Ethereum Sepolia Testnet" />
          <SobreItem label="CNPJ" value="23.040.066/0001-00 — Grupo União e Trabalho" />
          <SobreItem label="Implantação" value="1º de junho de 2026" valueColor={COR.gold} />
          <div style={{ marginTop: "0.4rem" }}>
            <a
              href="https://www.grupouniaoetrabalho.com.br"
              target="_blank" rel="noopener noreferrer"
              style={{ color: COR.blue300, fontSize: "0.8rem", wordBreak: "break-all" }}
            >www.grupouniaoetrabalho.com.br ↗</a>
          </div>
        </div>
      </GlassCard>

      {/* Salvar */}
      <div style={{
        marginTop: sectionGap,
        display: "flex", justifyContent: isMobile ? "stretch" : "flex-end",
      }}>
        <Button variant="primary" size="lg" onClick={handleSalvar}
          className={`${isMobile ? "w-full" : ""} ${salvo ? "!bg-[#10b981]/[0.2] !border !border-[#10b981]/40 !text-[#10b981] !shadow-none" : ""}`}>
          {salvo ? t("config.salvo") : t("config.salvar")}
        </Button>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono, breakable, valueColor, isMobile }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: isMobile && breakable ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isMobile && breakable ? "stretch" : "center",
      padding: "0.4rem 0",
      borderBottom: "1px solid rgba(245,166,35,0.08)",
      gap: "0.4rem",
    }}>
      <span style={{
        fontSize: "0.74rem", color: "#6b7db8", fontWeight: "600",
        flexShrink: 0,
      }}>{label}</span>
      <span style={{
        fontSize: mono ? "0.78rem" : "0.84rem",
        color: valueColor || "#e8f0fe",
        fontWeight: "500",
        textAlign: isMobile && breakable ? "left" : "right",
        fontFamily: mono ? "monospace" : "inherit",
        wordBreak: breakable ? "break-all" : "normal",
        overflow: breakable ? "visible" : "hidden",
        textOverflow: breakable ? "clip" : "ellipsis",
        whiteSpace: breakable ? "normal" : "nowrap",
        maxWidth: breakable ? "100%" : (isMobile ? "210px" : "260px"),
        lineHeight: mono ? 1.4 : 1.3,
      }}>{value}</span>
    </div>
  );
}

function SobreItem({ label, value, valueColor }) {
  return (
    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
      <span style={{ fontWeight: "700", color: "#6b7db8", flexShrink: 0 }}>{label}:</span>
      <span style={{ color: valueColor || "inherit" }}>{value}</span>
    </div>
  );
}
