import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import ComprarFichasModal from "../components/ComprarFichasModal.jsx";

const VALOR_POR_SENHA_BRL = 2;

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
  const navigate = useNavigate();
  const {
    carteiraFlash, fichasProgramadas, erroCarteira,
    handleSimularPix, handleConverterFicha,
    CUSTO_FICHA_BRL, isConnected, abrirModal,
    address, userLabel, lances, MOCK_MODE,
    saldoSenhas, saldoSenhasStatus, refetchSaldo,
  } = useAppContext();

  const [comprarAberto, setComprarAberto] = useState(false);

  // Saldo on-chain — sufixo de status alinhado ao Sidebar/Dashboard.
  const saldoStatusSuffix =
    saldoSenhasStatus === "loading" ? " ⏳" :
    saldoSenhasStatus === "stale"   ? " ◇" :
    saldoSenhasStatus === "error"   ? " ✗" : "";
  const saldoNumero    = (saldoSenhas == null) ? null : Number(saldoSenhas);
  const valorFinanceiro = saldoNumero == null ? null : saldoNumero * VALOR_POR_SENHA_BRL;

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

          {/* Saldo de Senhas — produção (não MOCK_MODE).
              Fonte: saldoSenhas on-chain (AppContext). Atualiza via listener
              SenhasCreditadas + LanceDado e polling guardião 30s — não precisa
              hook próprio. */}
          {!MOCK_MODE && (
            <div style={{
              ...cardStyle,
              marginBottom: sectionGap,
              borderColor: "rgba(16,185,129,0.28)",
              background: "linear-gradient(180deg, rgba(8,24,64,0.6), rgba(16,185,129,0.04))",
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: "0.6rem", gap: "0.5rem",
              }}>
                <h3 style={{ ...tituloStyle, margin: 0, color: COR.success }}>🔗 Saldo de Senhas</h3>
                <span style={{
                  fontSize: "0.62rem", fontWeight: 700,
                  color: saldoSenhasStatus === "error" ? COR.danger : COR.muted,
                  background: "rgba(3,15,36,0.6)",
                  border: "1px solid rgba(37,99,235,0.18)",
                  borderRadius: "999px",
                  padding: "0.18rem 0.55rem",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }} title={`Status on-chain: ${saldoSenhasStatus}`}>
                  on-chain
                </span>
              </div>

              <div style={{
                display: "flex", alignItems: "baseline", gap: "0.5rem",
                marginBottom: "0.35rem", flexWrap: "wrap",
              }}>
                <span style={{
                  fontSize: isMobile ? "2.6rem" : "3.2rem",
                  fontWeight: 900, color: COR.success, lineHeight: 1,
                }}>
                  {saldoNumero == null
                    ? (saldoSenhasStatus === "loading" ? "…" : "—")
                    : saldoNumero}
                </span>
                <span style={{ fontSize: "0.85rem", color: COR.muted, fontWeight: 700 }}>
                  {saldoNumero === 1 ? "senha" : "senhas"}{saldoStatusSuffix}
                </span>
              </div>

              <div style={{
                fontSize: isMobile ? "0.82rem" : "0.88rem",
                color: COR.blue300, fontWeight: 600, marginBottom: "0.85rem",
                lineHeight: 1.4,
              }}>
                {valorFinanceiro == null
                  ? "Aguardando leitura on-chain…"
                  : <>
                      {saldoNumero} × R$ {VALOR_POR_SENHA_BRL.toFixed(2)} ={" "}
                      <strong style={{ color: COR.gold }}>R$ {valorFinanceiro.toFixed(2)}</strong>
                    </>
                }
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: "0.6rem",
              }}>
                <button
                  onClick={() => navigate("/mercado")}
                  disabled={!saldoNumero}
                  style={{
                    ...botaoPrimario,
                    background: !saldoNumero
                      ? "rgba(37,99,235,0.2)"
                      : "linear-gradient(135deg,#2563eb,#1d4ed8)",
                    boxShadow: !saldoNumero ? "none" : "0 4px 14px rgba(37,99,235,0.35)",
                    cursor: !saldoNumero ? "not-allowed" : "pointer",
                    opacity: !saldoNumero ? 0.5 : 1,
                  }}
                  title={!saldoNumero ? "Compre fichas para participar do leilão" : "Ir ao Mercado de Lances"}
                >
                  🎯 Usar no Mercado de Lances
                </button>
                <button
                  onClick={() => { try { refetchSaldo?.(); } catch {} }}
                  disabled={saldoSenhasStatus === "loading"}
                  style={{
                    ...botaoSecundario,
                    cursor: saldoSenhasStatus === "loading" ? "wait" : "pointer",
                    opacity: saldoSenhasStatus === "loading" ? 0.6 : 1,
                  }}
                >
                  {saldoSenhasStatus === "loading" ? "Atualizando…" : "↻ Atualizar saldo"}
                </button>
              </div>

              {saldoSenhasStatus === "error" && (
                <p style={{
                  margin: "0.6rem 0 0", fontSize: "0.72rem",
                  color: COR.danger, lineHeight: 1.4,
                }}>
                  ⚠️ Não foi possível ler o saldo on-chain agora. Use “Atualizar saldo”.
                </p>
              )}
            </div>
          )}

          {/* Comprar Fichas — produção (não MOCK_MODE) */}
          {!MOCK_MODE && (
            <div style={{
              ...cardStyle,
              marginBottom: sectionGap,
              borderColor: "rgba(245,166,35,0.3)",
              background: "linear-gradient(180deg, rgba(8,24,64,0.6), rgba(245,166,35,0.04))",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.85rem" }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ ...tituloStyle, margin: 0, color: COR.gold }}>🎫 Comprar Fichas</h3>
                  <p style={{ margin: "0.3rem 0 0", fontSize: "0.78rem", color: COR.muted, lineHeight: 1.4 }}>
                    Adquira senhas via PIX para participar do leilão. Crédito automático on-chain após aprovação.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setComprarAberto(true)}
                style={{
                  ...botaoPrimario,
                  background: "linear-gradient(135deg,#f5a623,#d97706)",
                  boxShadow: "0 4px 14px rgba(245,166,35,0.35)",
                }}
              >
                💸 Comprar com PIX
              </button>
            </div>
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

      <ComprarFichasModal
        aberto={comprarAberto}
        onFechar={() => setComprarAberto(false)}
        address={address}
        onSucesso={() => { try { refetchSaldo?.(); } catch {} }}
      />
    </div>
  );
}
