import { useAppContext } from "../context/AppContext.jsx";

const COR = {
  primary: "#2563eb", primaryDim: "rgba(37,99,235,0.15)",
  text: "#e8f0fe", muted: "#4a6490",
  success: "#10b981", danger: "#ef4444", blue300: "#93c5fd", gold: "#f5a623",
};

const CHECKS = [
  { label: "Argon2id (hash-wasm WASM)", desc: "Gera prova de intenção off-chain imutável para cada lance. Impossível forjar retroativamente.", status: "ok" },
  { label: "EIP-191 (Privy embedded wallet)", desc: "Assinatura criptográfica antes de enviar o lance. Confirma que a ação partiu do titular da carteira.", status: "ok" },
  { label: "Rate Limit — 5 lances/min", desc: "Token bucket client-side impede spam. Cooldown de 3 segundos entre lances consecutivos.", status: "ok" },
  { label: "DOMPurify + regex", desc: "Sanitização de todos os campos contra XSS e injeção. Nenhum dado externo é interpolado como HTML.", status: "ok" },
  { label: "Compliance LGPD / GDPR", desc: "Gate de consentimento obrigatório. Dados sigilosos. Direitos de acesso, retificação e exclusão garantidos.", status: "ok" },
  { label: "Dados em trânsito", desc: "HTTPS em produção (Netlify). Todos os endpoints usam TLS 1.3.", status: "ok" },
  { label: "Autenticação 2FA", desc: "Multi-Factor via Privy (OTP por e-mail). Em breve: passkey + TOTP.", status: "em_breve" },
  { label: "Auditoria on-chain", desc: "Contrato LeilaoGUT verificado no Sepolia Etherscan. Beta: registro local. Produção: on-chain.", status: "em_breve" },
];

export default function Seguranca() {
  const { isConnected, address, userLabel, authenticated, MOCK_MODE } = useAppContext();

  return (
    <div style={{ padding: "2rem", flex: 1 }}>
      <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: "900", color: COR.text }}>
        🛡️ Segurança
      </h1>
      <p style={{ margin: "0 0 2rem", color: COR.muted, fontSize: "0.88rem" }}>
        Proteção de dados e autenticação do DesafioGUT — Art. 9 e Art. 35 do Regulamento.
      </p>

      {/* ── Status da sessão ── */}
      <div style={{ ...estilos.card, marginBottom: "1.5rem" }}>
        <h3 style={estilos.cardTitulo}>🔐 Status da Sessão</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
          {[
            { label: "Autenticação",  value: isConnected ? "✅ Conectado" : "❌ Desconectado",  color: isConnected ? COR.success : COR.danger },
            { label: "Método",        value: MOCK_MODE ? "🧪 Mock (Beta)" : "Privy Embedded Wallet", color: COR.blue300 },
            { label: "Carteira",      value: address ? `${address.slice(0,8)}...${address.slice(-4)}` : "—",  color: COR.blue300 },
            { label: "Usuário",       value: userLabel || (isConnected ? "Anônimo" : "—"), color: COR.text },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "rgba(3,15,36,0.6)", borderRadius: "10px",
              padding: "0.85rem", border: "1px solid rgba(37,99,235,0.12)" }}>
              <div style={{ fontSize: "0.65rem", color: COR.muted, textTransform: "uppercase",
                letterSpacing: "0.06em", marginBottom: "0.3rem" }}>{label}</div>
              <div style={{ fontSize: "0.84rem", fontWeight: "700", color, fontFamily: label === "Carteira" ? "monospace" : "inherit" }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Checklist de segurança ── */}
      <div style={{ ...estilos.card, marginBottom: "1.5rem" }}>
        <h3 style={estilos.cardTitulo}>🔒 Checklist de Proteção</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {CHECKS.map(({ label, desc, status }) => (
            <div key={label} style={{
              display: "flex", gap: "0.85rem", alignItems: "flex-start",
              padding: "0.75rem", borderRadius: "10px",
              background: status === "ok" ? "rgba(16,185,129,0.06)" : "rgba(245,166,35,0.06)",
              border: `1px solid ${status === "ok" ? "rgba(16,185,129,0.15)" : "rgba(245,166,35,0.15)"}`,
            }}>
              <span style={{ fontSize: "1.1rem", flexShrink: 0, marginTop: "1px" }}>
                {status === "ok" ? "✅" : "🔜"}
              </span>
              <div>
                <div style={{ fontSize: "0.84rem", fontWeight: "700",
                  color: status === "ok" ? COR.success : COR.gold, marginBottom: "0.25rem" }}>
                  {label}
                  {status === "em_breve" && (
                    <span style={{ marginLeft: "0.5rem", fontSize: "0.65rem",
                      background: "rgba(245,166,35,0.15)", padding: "0.1rem 0.4rem",
                      borderRadius: "4px", color: COR.gold }}>EM BREVE</span>
                  )}
                </div>
                <div style={{ fontSize: "0.78rem", color: COR.muted, lineHeight: "1.5" }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── LGPD ── */}
      <div style={estilos.card}>
        <h3 style={estilos.cardTitulo}>⚖️ Compliance LGPD</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          {[
            { label: "Política de Privacidade",  href: "https://www.iubenda.com/privacy-policy/DESAFIOGUT" },
            { label: "Política de Cookies",      href: "https://www.iubenda.com/privacy-policy/DESAFIOGUT/cookie-policy" },
            { label: "Regulamento RTD",          href: "#", note: "Registrado em cartório — Manaus/AM" },
            { label: "Contato DPO",              href: "mailto:desafiogut01@gmail.com", note: "desafiogut01@gmail.com" },
          ].map(({ label, href, note }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{
              display: "block", padding: "0.85rem", background: "rgba(3,15,36,0.6)",
              borderRadius: "10px", border: "1px solid rgba(37,99,235,0.12)",
              textDecoration: "none", transition: "all 0.15s",
            }}>
              <div style={{ fontSize: "0.82rem", fontWeight: "700", color: COR.blue300, marginBottom: note ? "0.2rem" : 0 }}>
                {label} ↗
              </div>
              {note && <div style={{ fontSize: "0.7rem", color: COR.muted }}>{note}</div>}
            </a>
          ))}
        </div>

        {/* Smart contract */}
        <div style={{ marginTop: "1rem", padding: "0.85rem", background: "rgba(37,99,235,0.06)",
          borderRadius: "10px", border: "1px solid rgba(37,99,235,0.15)" }}>
          <div style={{ fontSize: "0.72rem", color: COR.muted, marginBottom: "0.3rem" }}>
            Smart Contract LeilaoGUT — Sepolia Testnet
          </div>
          <a
            href="https://sepolia.etherscan.io/address/0xa513E6E4b8f2a923D98304ec87F64353C4D5C853"
            target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: "monospace", fontSize: "0.78rem", color: COR.blue300, textDecoration: "none" }}
          >
            0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 ↗
          </a>
        </div>
      </div>
    </div>
  );
}

const estilos = {
  card: {
    background: "rgba(8,24,64,0.6)", border: "1px solid rgba(37,99,235,0.18)",
    borderRadius: "16px", padding: "1.25rem",
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
  },
  cardTitulo: { margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: "800", color: "#93c5fd" },
};
