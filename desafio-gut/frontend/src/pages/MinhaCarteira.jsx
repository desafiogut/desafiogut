import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";

const COR = {
  primary: "#2563eb", primaryDim: "rgba(37,99,235,0.15)",
  gold: "#f5a623", text: "#e8f0fe", muted: "#4a6490",
  success: "#10b981", danger: "#ef4444", blue300: "#93c5fd", purple: "#a78bfa",
};

const DADOS_PAGAMENTO = [
  { label: "PIX (e-mail)",    value: "desafiogut01@gmail.com"        },
  { label: "Banco do Brasil", value: "Ag. 181627 · CC 847534"        },
  { label: "Cartão Débito",   value: "Nacional e Internacional"      },
  { label: "Custo por senha", value: "R$ 2,00 por edição (Art. 20)"  },
];

export default function MinhaCarteira() {
  const isMobile = useIsMobile();
  const {
    carteiraFlash, fichasProgramadas, erroCarteira,
    handleSimularPix, handleConverterFicha,
    CUSTO_FICHA_BRL, isConnected, abrirModal,
    address, userLabel, lances, MOCK_MODE,
  } = useAppContext();

  const meusLances = lances.filter(
    (l) => l.endereco?.toLowerCase() === address?.toLowerCase()
  );

  const pad        = isMobile ? "1rem" : "2rem";
  const cardPad    = isMobile ? "1rem" : "1.25rem";
  const sectionGap = isMobile ? "1.25rem" : "1.5rem";

  const cardStyle = {
    background: "rgba(8,24,64,0.6)",
    border: "1px solid rgba(37,99,235,0.18)",
    borderRadius: "16px",
    padding: cardPad,
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
  };
  const tituloStyle = {
    margin: `0 0 ${isMobile ? "0.75rem" : "1rem"}`,
    fontSize: isMobile ? "0.85rem" : "0.88rem",
    fontWeight: "800", color: COR.blue300, letterSpacing: "0.03em",
  };
  const botaoPrimario = {
    width: "100%",
    padding: isMobile ? "0.75rem 1rem" : "0.7rem 1.2rem",
    background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
    border: "none", borderRadius: "12px", color: "#fff",
    fontWeight: "800", fontSize: "0.85rem", cursor: "pointer",
    boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
  };
  const botaoSecundario = {
    width: "100%",
    padding: isMobile ? "0.75rem 1rem" : "0.7rem 1.2rem",
    background: "rgba(167,139,250,0.12)",
    border: "1px solid rgba(167,139,250,0.35)",
    borderRadius: "12px", color: COR.purple,
    fontWeight: "800", fontSize: "0.85rem",
  };

  return (
    <div style={{ padding: pad, flex: 1 }}>
      <header style={{ marginBottom: sectionGap }}>
        <h1 style={{
          margin: "0 0 0.35rem",
          fontSize: isMobile ? "1.3rem" : "1.5rem",
          fontWeight: "900", color: COR.text, lineHeight: 1.2,
        }}>💰 Minha Carteira</h1>
        <p style={{ margin: 0, color: COR.muted, fontSize: isMobile ? "0.82rem" : "0.88rem", lineHeight: 1.4 }}>
          {MOCK_MODE
            ? "Gerencie seu saldo Flash e suas fichas para participar do DesafioGUT."
            : "Acompanhe seu saldo de senhas e seus lances no DesafioGUT."}
        </p>
      </header>

      {!isConnected ? (
        <div style={cardStyle}>
          <p style={{ color: COR.muted, marginBottom: "1rem", fontSize: isMobile ? "0.85rem" : "0.9rem" }}>
            Faça login para visualizar e gerenciar sua carteira.
          </p>
          <button onClick={abrirModal} style={{ ...botaoPrimario, width: isMobile ? "100%" : "auto" }}>
            ⚡ Aceito o DesafioGUT — Entrar
          </button>
        </div>
      ) : (
        <>
          {/* Saldos + Ações — apenas em MOCK_MODE.
              Em produção, "Saldo Flash R$" e "Fichas (localStorage)" não existem;
              o saldo real é o badge 🔗 no Sidebar/Dashboard, e a aquisição de
              senhas será via botão "Comprar Fichas" (Frente B). */}
          {MOCK_MODE && (
            <>
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "1fr 1fr",
                gap: isMobile ? "0.75rem" : "1rem",
                marginBottom: sectionGap,
              }}>
                <div style={{ ...cardStyle, borderColor: "rgba(37,99,235,0.3)", minWidth: 0 }}>
                  <div style={{
                    fontSize: "0.65rem", color: COR.muted,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    marginBottom: "0.4rem", fontWeight: "700",
                  }}>SALDO FLASH ⚡</div>
                  <div style={{
                    fontSize: isMobile ? "1.55rem" : "2.2rem",
                    fontWeight: "900", color: COR.primary, lineHeight: 1.1,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>R$ {carteiraFlash.toFixed(2)}</div>
                  <div style={{ fontSize: "0.7rem", color: COR.muted, marginTop: "0.3rem" }}>
                    Usado em leilões Relâmpago
                  </div>
                </div>

                <div style={{ ...cardStyle, borderColor: "rgba(167,139,250,0.3)", minWidth: 0 }}>
                  <div style={{
                    fontSize: "0.65rem", color: COR.muted,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    marginBottom: "0.4rem", fontWeight: "700",
                  }}>FICHAS 🎫</div>
                  <div style={{
                    fontSize: isMobile ? "1.55rem" : "2.2rem",
                    fontWeight: "900", color: COR.purple, lineHeight: 1.1,
                  }}>{fichasProgramadas}</div>
                  <div style={{ fontSize: "0.7rem", color: COR.muted, marginTop: "0.3rem" }}>
                    R$ {CUSTO_FICHA_BRL.toFixed(2)} / ficha (Art. 20)
                  </div>
                </div>
              </div>

              <div style={{ ...cardStyle, marginBottom: sectionGap }}>
                <h3 style={tituloStyle}>⚡ Ações de Carteira</h3>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: isMobile ? "0.75rem" : "1rem",
                  marginBottom: erroCarteira ? "0.75rem" : 0,
                }}>
                  <div>
                    <div style={{ fontSize: "0.78rem", color: COR.muted, marginBottom: "0.4rem", fontWeight: "600" }}>
                      Depósito via PIX
                    </div>
                    <button onClick={handleSimularPix} style={botaoPrimario}>
                      + PIX R$ 10,00 (Simulação Beta)
                    </button>
                    <p style={{ margin: "0.4rem 0 0", fontSize: "0.66rem", color: "#334155" }}>
                      PIX real: desafiogut01@gmail.com (Art. 21)
                    </p>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.78rem", color: COR.muted, marginBottom: "0.4rem", fontWeight: "600" }}>
                      Converter em Ficha Programada
                    </div>
                    <button
                      onClick={handleConverterFicha}
                      disabled={carteiraFlash < CUSTO_FICHA_BRL}
                      style={{
                        ...botaoSecundario,
                        opacity: carteiraFlash < CUSTO_FICHA_BRL ? 0.4 : 1,
                        cursor: carteiraFlash < CUSTO_FICHA_BRL ? "not-allowed" : "pointer",
                      }}
                    >→ 1 Ficha (R$ {CUSTO_FICHA_BRL.toFixed(2)})</button>
                    <p style={{ margin: "0.4rem 0 0", fontSize: "0.66rem", color: "#334155" }}>
                      {carteiraFlash < CUSTO_FICHA_BRL
                        ? "Saldo insuficiente"
                        : `Saldo disponível: R$ ${carteiraFlash.toFixed(2)}`}
                    </p>
                  </div>
                </div>

                {erroCarteira && (
                  <div style={{
                    padding: "0.6rem 0.85rem",
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: "10px", color: COR.danger,
                    fontSize: "0.82rem",
                  }}>⚠️ {erroCarteira}</div>
                )}
              </div>
            </>
          )}

          {/* Dados de pagamento */}
          <div style={{ ...cardStyle, marginBottom: sectionGap }}>
            <h3 style={tituloStyle}>🏦 Dados para Pagamento (Art. 21)</h3>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))",
              gap: isMobile ? "0.5rem" : "0.75rem",
            }}>
              {DADOS_PAGAMENTO.map(({ label, value }) => (
                <div key={label} style={{
                  background: "rgba(3,15,36,0.6)", borderRadius: "10px",
                  padding: "0.7rem 0.85rem",
                  border: "1px solid rgba(37,99,235,0.12)",
                  minWidth: 0,
                }}>
                  <div style={{
                    fontSize: "0.62rem", color: COR.muted,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    marginBottom: "0.25rem", fontWeight: "600",
                  }}>{label}</div>
                  <div style={{
                    fontSize: "0.82rem", color: COR.blue300, fontWeight: "600",
                    wordBreak: "break-word",
                  }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Meus lances */}
          <div style={cardStyle}>
            <h3 style={tituloStyle}>📋 Meus Lances ({meusLances.length})</h3>
            {meusLances.length === 0 ? (
              <div style={{
                padding: "1.5rem 0", textAlign: "center", color: COR.muted,
                display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "center",
              }}>
                <span style={{ fontSize: "1.4rem", opacity: 0.45 }}>📭</span>
                <span style={{ fontSize: "0.82rem" }}>Nenhum lance registrado ainda com esta carteira.</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {meusLances.map((l, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "0.7rem 0.85rem", background: "rgba(3,15,36,0.6)",
                    borderRadius: "10px", border: "1px solid rgba(37,99,235,0.1)",
                    gap: "0.6rem",
                  }}>
                    <span style={{
                      fontFamily: "monospace", fontSize: "0.74rem", color: COR.muted,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      flex: 1, minWidth: 0,
                    }}>
                      {l.txHash ? `${l.txHash.slice(0, 14)}...` : "—"}
                    </span>
                    <span style={{
                      fontWeight: "700",
                      color: l.repetido ? COR.danger : COR.success,
                      fontSize: "0.82rem",
                      whiteSpace: "nowrap",
                    }}>{l.repetido ? "❌" : "✅"} R$ {(l.valor / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Account info */}
          <div style={{
            marginTop: sectionGap,
            padding: isMobile ? "0.85rem" : "0.75rem 1rem",
            background: "rgba(37,99,235,0.06)",
            borderRadius: "12px",
            border: "1px solid rgba(37,99,235,0.12)",
          }}>
            <div style={{
              fontSize: "0.62rem", color: COR.muted,
              textTransform: "uppercase", letterSpacing: "0.06em",
              marginBottom: "0.35rem", fontWeight: "700",
            }}>Carteira Conectada</div>
            <div style={{
              fontFamily: "monospace", fontSize: isMobile ? "0.74rem" : "0.82rem",
              color: COR.blue300, wordBreak: "break-all", lineHeight: 1.4,
            }}>{address}</div>
            {userLabel && (
              <div style={{ fontSize: "0.72rem", color: COR.muted, marginTop: "0.35rem" }}>
                {userLabel}
              </div>
            )}
            {MOCK_MODE && (
              <div style={{
                fontSize: "0.66rem", color: COR.gold, marginTop: "0.35rem",
                fontWeight: "700",
              }}>🧪 Modo Beta Interno — saldo em localStorage</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
