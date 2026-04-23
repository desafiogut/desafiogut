import { useAppContext } from "../context/AppContext.jsx";

const COR = {
  primary: "#2563eb", primaryDim: "rgba(37,99,235,0.15)",
  gold: "#f5a623", text: "#e8f0fe", muted: "#4a6490",
  success: "#10b981", danger: "#ef4444", blue300: "#93c5fd",
};

export default function MinhaCarteira() {
  const {
    carteiraFlash, fichasProgramadas, erroCarteira,
    handleSimularPix, handleConverterFicha,
    CUSTO_FICHA_BRL, isConnected, abrirModal,
    address, userLabel, lances, MOCK_MODE,
  } = useAppContext();

  const meusLances = lances.filter(
    (l) => l.endereco?.toLowerCase() === address?.toLowerCase()
  );

  return (
    <div style={{ padding: "2rem", flex: 1 }}>
      <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: "900", color: COR.text }}>
        💰 Minha Carteira
      </h1>
      <p style={{ margin: "0 0 2rem", color: COR.muted, fontSize: "0.88rem" }}>
        Gerencie seu saldo Flash e suas fichas para participar do DesafioGUT.
      </p>

      {!isConnected ? (
        <div style={estilos.card}>
          <p style={{ color: COR.muted, marginBottom: "1rem" }}>
            Faça login para visualizar e gerenciar sua carteira.
          </p>
          <button onClick={abrirModal} style={estilos.botaoPrimario}>
            ⚡ Aceito o DesafioGUT — Entrar
          </button>
        </div>
      ) : (
        <>
          {/* ── Saldos ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ ...estilos.card, borderColor: "rgba(37,99,235,0.3)" }}>
              <div style={{ fontSize: "0.72rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.4rem" }}>
                Saldo Flash ⚡
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: "900", color: COR.primary }}>
                R$ {carteiraFlash.toFixed(2)}
              </div>
              <div style={{ fontSize: "0.72rem", color: COR.muted, marginTop: "0.25rem" }}>
                Usado em leilões Relâmpago
              </div>
            </div>

            <div style={{ ...estilos.card, borderColor: "rgba(167,139,250,0.3)" }}>
              <div style={{ fontSize: "0.72rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.4rem" }}>
                Fichas Programadas 🎫
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: "900", color: "#a78bfa" }}>
                {fichasProgramadas}
              </div>
              <div style={{ fontSize: "0.72rem", color: COR.muted, marginTop: "0.25rem" }}>
                Art. 20 · R$ {CUSTO_FICHA_BRL.toFixed(2)} / ficha
              </div>
            </div>
          </div>

          {/* ── Ações ── */}
          <div style={{ ...estilos.card, marginBottom: "1.5rem" }}>
            <h3 style={estilos.secaoTitulo}>⚡ Ações de Carteira</h3>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
              {/* Simular PIX */}
              <div style={{ flex: "1", minWidth: "220px" }}>
                <div style={{ fontSize: "0.8rem", color: COR.muted, marginBottom: "0.5rem" }}>
                  Depósito via PIX
                </div>
                <button onClick={handleSimularPix} style={estilos.botaoPrimario}>
                  + PIX R$ 10,00 (Simulação Beta)
                </button>
                <p style={{ margin: "0.4rem 0 0", fontSize: "0.68rem", color: "#334155" }}>
                  PIX real: desafiogut01@gmail.com (Art. 21)
                </p>
              </div>

              {/* Converter ficha */}
              <div style={{ flex: "1", minWidth: "220px" }}>
                <div style={{ fontSize: "0.8rem", color: COR.muted, marginBottom: "0.5rem" }}>
                  Converter em Ficha Programada
                </div>
                <button
                  onClick={handleConverterFicha}
                  disabled={carteiraFlash < CUSTO_FICHA_BRL}
                  style={{
                    ...estilos.botaoSecundario,
                    opacity: carteiraFlash < CUSTO_FICHA_BRL ? 0.4 : 1,
                    cursor: carteiraFlash < CUSTO_FICHA_BRL ? "not-allowed" : "pointer",
                  }}
                >
                  → 1 Ficha (R$ {CUSTO_FICHA_BRL.toFixed(2)})
                </button>
                <p style={{ margin: "0.4rem 0 0", fontSize: "0.68rem", color: "#334155" }}>
                  {carteiraFlash < CUSTO_FICHA_BRL ? "Saldo insuficiente" : `Saldo disponível: R$ ${carteiraFlash.toFixed(2)}`}
                </p>
              </div>
            </div>

            {erroCarteira && (
              <div style={{ padding: "0.6rem 0.9rem", background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px",
                color: COR.danger, fontSize: "0.82rem" }}>
                ⚠️ {erroCarteira}
              </div>
            )}
          </div>

          {/* ── Dados bancários de pagamento ── */}
          <div style={{ ...estilos.card, marginBottom: "1.5rem" }}>
            <h3 style={estilos.secaoTitulo}>🏦 Dados para Pagamento (Art. 21)</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
              {[
                { label: "PIX (e-mail)",      value: "desafiogut01@gmail.com"       },
                { label: "Banco do Brasil",   value: "Ag. 181627 · CC 847534"       },
                { label: "Cartão Débito",     value: "Nacional e Internacional"      },
                { label: "Custo por senha",   value: "R$ 2,00 por edição (Art. 20)" },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "rgba(3,15,36,0.6)", borderRadius: "10px",
                  padding: "0.75rem", border: "1px solid rgba(37,99,235,0.12)" }}>
                  <div style={{ fontSize: "0.65rem", color: COR.muted, textTransform: "uppercase",
                    letterSpacing: "0.06em", marginBottom: "0.25rem" }}>{label}</div>
                  <div style={{ fontSize: "0.82rem", color: COR.blue300, fontWeight: "600" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Meus lances ── */}
          <div style={estilos.card}>
            <h3 style={estilos.secaoTitulo}>📋 Meus Lances ({meusLances.length})</h3>
            {meusLances.length === 0 ? (
              <p style={{ color: COR.muted, fontSize: "0.85rem" }}>
                Nenhum lance registrado ainda com esta carteira.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {meusLances.map((l, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "0.6rem 0.85rem", background: "rgba(3,15,36,0.6)",
                    borderRadius: "8px", border: "1px solid rgba(37,99,235,0.1)",
                  }}>
                    <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: COR.muted }}>
                      {l.txHash ? `${l.txHash.slice(0, 14)}...` : "—"}
                    </span>
                    <span style={{ fontWeight: "700", color: l.repetido ? COR.danger : COR.success }}>
                      {l.repetido ? "❌ Repetido" : "✅ Único"} · R$ {(l.valor / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Account info */}
          <div style={{ marginTop: "1.5rem", padding: "0.75rem 1rem",
            background: "rgba(37,99,235,0.06)", borderRadius: "10px",
            border: "1px solid rgba(37,99,235,0.12)" }}>
            <div style={{ fontSize: "0.72rem", color: COR.muted, marginBottom: "0.25rem" }}>Carteira conectada</div>
            <div style={{ fontFamily: "monospace", fontSize: "0.82rem", color: COR.blue300 }}>{address}</div>
            {userLabel && <div style={{ fontSize: "0.72rem", color: COR.muted, marginTop: "0.2rem" }}>{userLabel}</div>}
            {MOCK_MODE && <div style={{ fontSize: "0.68rem", color: "#f5a623", marginTop: "0.25rem" }}>🧪 Modo Beta Interno — saldo em localStorage</div>}
          </div>
        </>
      )}
    </div>
  );
}

const estilos = {
  card: {
    background: "rgba(8,24,64,0.6)", border: "1px solid rgba(37,99,235,0.18)",
    borderRadius: "16px", padding: "1.25rem",
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    marginBottom: 0,
  },
  secaoTitulo: { margin: "0 0 1rem", fontSize: "0.88rem", fontWeight: "800", color: "#93c5fd" },
  botaoPrimario: {
    padding: "0.65rem 1.2rem",
    background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
    border: "none", borderRadius: "20px",
    color: "#fff", cursor: "pointer",
    fontWeight: "800", fontSize: "0.84rem",
    boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
  },
  botaoSecundario: {
    padding: "0.65rem 1.2rem",
    background: "rgba(167,139,250,0.12)",
    border: "1px solid rgba(167,139,250,0.35)",
    borderRadius: "20px", color: "#a78bfa",
    fontWeight: "800", fontSize: "0.84rem",
  },
};
