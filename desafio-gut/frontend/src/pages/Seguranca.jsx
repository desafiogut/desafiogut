import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";

const COR = {
  primary: "#f5a623", primaryDim: "rgba(245,166,35,0.15)",
  text: "#e8f0fe", muted: "#6b7db8",
  success: "#10b981", danger: "#ef4444", blue300: "#fbbf24", gold: "#f5a623",
};

const CONTRATO_ENDERECO = "0x59A73Acc8E8B210C874B0E3A9eC9B8B64847F6D5";

const CHECKS = [
  { label: "Argon2id (hash-wasm WASM)",       desc: "Gera prova de intenção off-chain imutável para cada lance. Impossível forjar retroativamente.", status: "ok" },
  { label: "EIP-191 (Privy embedded wallet)", desc: "Assinatura criptográfica antes de enviar o lance. Confirma que a ação partiu do titular da carteira.", status: "ok" },
  { label: "Rate Limit — 5 lances/min",       desc: "Token bucket client-side impede spam. Cooldown de 3 segundos entre lances consecutivos.", status: "ok" },
  { label: "DOMPurify + regex",               desc: "Sanitização de todos os campos contra XSS e injeção. Nenhum dado externo é interpolado como HTML.", status: "ok" },
  { label: "Compliance LGPD / GDPR",          desc: "Gate de consentimento obrigatório. Dados sigilosos. Direitos de acesso, retificação e exclusão garantidos.", status: "ok" },
  { label: "Dados em trânsito",               desc: "HTTPS em produção (Netlify). Todos os endpoints usam TLS 1.3.", status: "ok" },
  { label: "Autenticação 2FA",                desc: "Multi-Factor via Privy (OTP por e-mail). Em breve: passkey + TOTP.", status: "em_breve" },
  { label: "Auditoria on-chain",              desc: "Contrato LeilaoGUT verificado no Sepolia Etherscan. Beta: registro local. Produção: on-chain.", status: "em_breve" },
];

const LGPD_LINKS = [
  { label: "Política de Privacidade",  href: "https://www.iubenda.com/privacy-policy/DESAFIOGUT" },
  { label: "Política de Cookies",      href: "https://www.iubenda.com/privacy-policy/DESAFIOGUT/cookie-policy" },
  { label: "Regulamento RTD",          href: "#",                                                  note: "Registrado em cartório — Manaus/AM" },
  { label: "Contato DPO",              href: "mailto:desafiogut01@gmail.com",                       note: "desafiogut01@gmail.com" },
];

export default function Seguranca() {
  const isMobile = useIsMobile();
  const { isConnected, address, userLabel } = useAppContext();

  const pad        = isMobile ? "1rem" : "2rem";
  const cardPad    = isMobile ? "1rem" : "1.25rem";
  const sectionGap = isMobile ? "1.25rem" : "1.5rem";

  const cardStyle = {
    background: "rgba(255,255,255, var(--glass-opacity, 0.03))",
    border: "1px solid rgba(245,166,35,0.18)",
    borderRadius: "16px",
    padding: cardPad,
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
  };
  const cardTituloStyle = {
    margin: `0 0 ${isMobile ? "0.75rem" : "1rem"}`,
    fontSize: isMobile ? "0.88rem" : "0.9rem",
    fontWeight: "800", color: COR.blue300, letterSpacing: "0.03em",
  };

  const sessionItems = [
    { label: "Autenticação", value: isConnected ? "✅ Conectado" : "❌ Desconectado", color: isConnected ? COR.success : COR.danger },
    { label: "Método",       value: "Privy Embedded Wallet",  color: COR.blue300 },
    { label: "Carteira",     value: address ? `${address.slice(0, 8)}...${address.slice(-4)}` : "—", color: COR.blue300, mono: true },
    { label: "Usuário",      value: userLabel || (isConnected ? "Anônimo" : "—"),               color: COR.text },
  ];

  return (
    <div style={{ padding: pad, flex: 1 }}>
      <header style={{ marginBottom: sectionGap }}>
        <h1 style={{
          margin: "0 0 0.35rem",
          fontSize: isMobile ? "1.3rem" : "1.5rem",
          fontWeight: "900", color: COR.text, lineHeight: 1.2,
        }}>🛡️ Segurança</h1>
        <p style={{ margin: 0, color: COR.muted, fontSize: isMobile ? "0.82rem" : "0.88rem", lineHeight: 1.4 }}>
          Proteção de dados e autenticação do DesafioGUT — Art. 9 e Art. 35 do Regulamento.
        </p>
      </header>

      {/* Status da sessão */}
      <div style={{ ...cardStyle, marginBottom: sectionGap }}>
        <h3 style={cardTituloStyle}>🔐 Status da Sessão</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "repeat(2, minmax(0, 1fr))"
            : "repeat(auto-fit, minmax(180px, 1fr))",
          gap: isMobile ? "0.6rem" : "0.75rem",
        }}>
          {sessionItems.map(({ label, value, color, mono }) => (
            <div key={label} style={{
              background: "rgba(255,255,255, var(--glass-opacity, 0.03))", borderRadius: "10px",
              padding: "0.75rem 0.85rem", border: "1px solid rgba(245,166,35,0.12)",
              minWidth: 0,
            }}>
              <div style={{
                fontSize: "0.62rem", color: COR.muted,
                textTransform: "uppercase", letterSpacing: "0.06em",
                marginBottom: "0.3rem", fontWeight: "600",
              }}>{label}</div>
              <div style={{
                fontSize: "0.82rem", fontWeight: "700", color,
                fontFamily: mono ? "monospace" : "inherit",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist */}
      <div style={{ ...cardStyle, marginBottom: sectionGap }}>
        <h3 style={cardTituloStyle}>🔒 Checklist de Proteção</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {CHECKS.map(({ label, desc, status }) => (
            <div key={label} style={{
              display: "flex", gap: "0.75rem", alignItems: "flex-start",
              padding: isMobile ? "0.7rem 0.75rem" : "0.75rem",
              borderRadius: "10px",
              background: status === "ok" ? "rgba(16,185,129,0.06)" : "rgba(245,166,35,0.06)",
              border: `1px solid ${status === "ok" ? "rgba(16,185,129,0.15)" : "rgba(245,166,35,0.15)"}`,
            }}>
              <span style={{ fontSize: "1.05rem", flexShrink: 0, marginTop: "1px" }}>
                {status === "ok" ? "✅" : "🔜"}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: isMobile ? "0.82rem" : "0.84rem",
                  fontWeight: "700",
                  color: status === "ok" ? COR.success : COR.gold,
                  marginBottom: "0.25rem",
                  display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.4rem",
                }}>
                  <span>{label}</span>
                  {status === "em_breve" && (
                    <span style={{
                      fontSize: "0.6rem", background: "rgba(245,166,35,0.15)",
                      padding: "0.1rem 0.4rem", borderRadius: "4px",
                      color: COR.gold, letterSpacing: "0.04em",
                    }}>EM BREVE</span>
                  )}
                </div>
                <div style={{
                  fontSize: isMobile ? "0.74rem" : "0.78rem",
                  color: COR.muted, lineHeight: 1.5,
                }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LGPD */}
      <div style={cardStyle}>
        <h3 style={cardTituloStyle}>⚖️ Compliance LGPD</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: "0.6rem",
        }}>
          {LGPD_LINKS.map(({ label, href, note }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{
              display: "block",
              padding: isMobile ? "0.75rem 0.85rem" : "0.85rem",
              background: "rgba(255,255,255, var(--glass-opacity, 0.03))", borderRadius: "10px",
              border: "1px solid rgba(245,166,35,0.12)",
              textDecoration: "none", transition: "all 0.15s",
            }}>
              <div style={{
                fontSize: "0.82rem", fontWeight: "700",
                color: COR.blue300, marginBottom: note ? "0.2rem" : 0,
              }}>{label} ↗</div>
              {note && <div style={{ fontSize: "0.7rem", color: COR.muted }}>{note}</div>}
            </a>
          ))}
        </div>

        {/* Smart contract — endereço com quebra adequada */}
        <div style={{
          marginTop: "1rem",
          padding: isMobile ? "0.85rem" : "1rem",
          background: "rgba(245,166,35,0.06)",
          borderRadius: "10px",
          border: "1px solid rgba(245,166,35,0.15)",
        }}>
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", flexWrap: "wrap", gap: "0.4rem",
            marginBottom: "0.5rem",
          }}>
            <div style={{
              fontSize: "0.7rem", color: COR.muted, fontWeight: "700",
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>Smart Contract LeilaoGUT</div>
            <span style={{
              fontSize: "0.62rem", fontWeight: "700",
              color: COR.gold,
              background: "rgba(245,166,35,0.12)",
              border: "1px solid rgba(245,166,35,0.3)",
              padding: "0.15rem 0.5rem", borderRadius: "10px",
              letterSpacing: "0.04em",
            }}>SEPOLIA TESTNET</span>
          </div>
          <a
            href={`https://sepolia.etherscan.io/address/${CONTRATO_ENDERECO}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              display: "block",
              fontFamily: "monospace",
              fontSize: isMobile ? "0.74rem" : "0.82rem",
              color: COR.blue300, textDecoration: "none",
              wordBreak: "break-all",
              lineHeight: 1.4,
              padding: "0.4rem 0",
            }}
          >{CONTRATO_ENDERECO} ↗</a>
          <div style={{
            fontSize: "0.66rem", color: COR.muted, marginTop: "0.35rem",
          }}>Toque para abrir no Etherscan</div>
        </div>
      </div>
    </div>
  );
}
