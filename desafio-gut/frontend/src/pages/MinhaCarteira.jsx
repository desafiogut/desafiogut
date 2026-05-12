import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useWallets } from "@privy-io/react-auth";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import ComprarFichasModal from "../components/ComprarFichasModal.jsx";
import WalletCard from "../components/WalletCard.jsx";
import VoucherPanel from "../components/VoucherPanel.jsx";
import BannerUpload from "../components/BannerUpload.jsx";
import BotaoLoginPrincipal from "../components/BotaoLoginPrincipal.jsx";
import { getSignerFromProvider } from "../utils/web3.js";

const VALOR_POR_SENHA_BRL = 2;

const COR = {
  primary: "#f5a623", primaryDim: "rgba(245,166,35,0.15)",
  gold: "#f5a623", text: "#e8f0fe", muted: "#4a6490",
  success: "#10b981", danger: "#ef4444", blue300: "#fbbf24", purple: "#a78bfa",
};

// Dois fluxos de pagamento (Especificação Refatorada §5):
// 1) Adesão (Consultoria): PIX direto → familiaquildo@gmail.com (manual)
// 2) Operação Interna (Fichas): Mercado Pago → desafiogut@gmail.com (webhook)
const DADOS_PAGAMENTO = [
  { label: "Adesão (PIX manual)",     value: "familiaquildo@gmail.com (Banco do Brasil)" },
  { label: "Fichas (Mercado Pago)",   value: "desafiogut@gmail.com — automatizado"        },
  { label: "Custo por senha",         value: "R$ 2,00 por edição (Art. 20)"               },
  { label: "Cartão Débito",           value: "Nacional e Internacional"                   },
];

export default function MinhaCarteira() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { wallets } = useWallets();
  const privyWallet   = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const comprarAuthRef = useRef({ token: null, expiresAt: 0 });
  const {
    isConnected, abrirModal,
    address, userLabel, lances,
    saldoSenhas, saldoSenhasStatus, refetchSaldo,
    saldoRsCentavos, saldoRsStatus, refetchSaldoRs,
    setTipoLeilao,
  } = useAppContext();

  const [comprarAberto, setComprarAberto] = useState(false);
  const [trocandoSenhas, setTrocandoSenhas] = useState(false);
  const [trocaErro,  setTrocaErro]  = useState("");
  const [trocaInfo,  setTrocaInfo]  = useState("");

  // Saldo on-chain — sufixo de status alinhado ao Sidebar/Dashboard.
  const saldoStatusSuffix =
    saldoSenhasStatus === "loading" ? " ⏳" :
    saldoSenhasStatus === "stale"   ? " ◇" :
    saldoSenhasStatus === "error"   ? " ✗" : "";
  const saldoNumero     = (saldoSenhas == null) ? null : Number(saldoSenhas);
  const valorFinanceiro = saldoNumero == null ? null : saldoNumero * VALOR_POR_SENHA_BRL;

  const statusRsSuffix =
    saldoRsStatus === "loading" ? " ⏳" :
    saldoRsStatus === "stale"   ? " ◇" :
    saldoRsStatus === "error"   ? " ✗" : "";

  // Modelo dual (Frente B.9): Saldo Disponível = saldo-rs (off-chain).
  // PIX aprovado credita aqui; "Trocar por Senhas" debita aqui e credita
  // saldoSenhas on-chain; Lance Relâmpago debita aqui em centavos.
  const saldoReais = saldoRsCentavos == null ? null : saldoRsCentavos / 100;

  function irParaLanceRelampago() {
    try { setTipoLeilao?.("flash"); } catch {}
    navigate("/mercado");
  }

  // Obtém token JWT de auth (cached 10min). Abre Privy popup só se expirado.
  async function getComprarAuthToken() {
    const now = Date.now();
    if (comprarAuthRef.current.token && comprarAuthRef.current.expiresAt > now + 60_000) {
      return comprarAuthRef.current.token;
    }
    if (!privyWallet) throw new Error("Carteira não conectada. Faça login novamente.");
    const ts      = Date.now();
    const message = `DESAFIOGUT-AUTH:${ts}:${address}`;
    await privyWallet.switchChain(11155111);
    const provider = await privyWallet.getEthereumProvider();
    const { signer } = await getSignerFromProvider(provider);
    const signature = await signer.signMessage(message);
    const resp = await fetch("/.netlify/functions/auth-lance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endereco: address, signature, message }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error?.message || "Falha ao autenticar.");
    comprarAuthRef.current = { token: data.token, expiresAt: now + (data.ttl || 600) * 1000 };
    return data.token;
  }

  async function trocarPorSenhas(qtd = 1) {
    if (!address || trocandoSenhas) return;
    setTrocaErro("");
    setTrocaInfo("");
    setTrocandoSenhas(true);
    try {
      const authToken = await getComprarAuthToken();
      const resp = await fetch("/.netlify/functions/comprar-senhas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({ endereco: address, qtd }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        if (resp.status === 401) comprarAuthRef.current = { token: null, expiresAt: 0 };
        const msg = data?.error?.message || `HTTP ${resp.status}`;
        setTrocaErro(msg);
        return;
      }
      setTrocaInfo(`✓ ${qtd} ${qtd === 1 ? "senha creditada" : "senhas creditadas"} on-chain`);
      try { refetchSaldoRs?.(); } catch {}
      try { refetchSaldo?.(); } catch {}
      setTimeout(() => setTrocaInfo(""), 5000);
    } catch (err) {
      setTrocaErro(err?.message || "Falha na troca");
    } finally {
      setTrocandoSenhas(false);
    }
  }

  const meusLances = lances.filter(
    (l) => l.endereco?.toLowerCase() === address?.toLowerCase()
  );

  const pad        = isMobile ? "1rem" : "2rem";
  const cardPad    = isMobile ? "1rem" : "1.25rem";
  const sectionGap = isMobile ? "1.25rem" : "1.5rem";

  const cardStyle = {
    background: "rgba(10,16,42,0.6)",
    border: "1px solid rgba(245,166,35,0.18)",
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
    background: "linear-gradient(135deg,#f5a623,#e89400)",
    border: "none", borderRadius: "12px", color: "#fff",
    fontWeight: "800", fontSize: "0.85rem", cursor: "pointer",
    boxShadow: "0 4px 14px rgba(245,166,35,0.35)",
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
          Acompanhe seu saldo de senhas e seus lances no DesafioGUT.
        </p>
      </header>

      {!isConnected ? (
        <div style={cardStyle}>
          <p style={{ color: COR.muted, marginBottom: "1rem", fontSize: isMobile ? "0.85rem" : "0.9rem" }}>
            Faça login para visualizar e gerenciar sua carteira.
          </p>
          <BotaoLoginPrincipal onClick={abrirModal} size="md" fullWidth={isMobile} />
        </div>
      ) : (
        <>
          {/* Saldo Disponível (R$) — modelo dual Frente B.9.
              Fonte: blob saldo-rs:${address}. PIX → +R$. /comprar-senhas → -R$.
              /lance-relampago → -centavos. */}
          <div style={{
              ...cardStyle,
              marginBottom: sectionGap,
              borderColor: "rgba(245,166,35,0.32)",
              background: "linear-gradient(180deg, rgba(10,16,42,0.6), rgba(245,166,35,0.06))",
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: "0.55rem", gap: "0.5rem",
              }}>
                <h3 style={{ ...tituloStyle, margin: 0, color: COR.gold }}>💰 Saldo Disponível</h3>
                <span style={{
                  fontSize: "0.62rem", fontWeight: 700,
                  color: saldoRsStatus === "error" ? COR.danger : COR.muted,
                  background: "rgba(3,15,36,0.6)",
                  border: "1px solid rgba(245,166,35,0.18)",
                  borderRadius: "999px",
                  padding: "0.18rem 0.55rem",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }} title={`Saldo R$ off-chain (blob saldo-rs) · status ${saldoRsStatus}`}>
                  R$ off-chain
                </span>
              </div>

              <div style={{
                fontSize: isMobile ? "2.4rem" : "3rem",
                fontWeight: 900, color: COR.gold, lineHeight: 1.05,
                marginBottom: "0.35rem",
              }}>
                {saldoReais == null
                  ? (saldoRsStatus === "loading" ? "R$ …" : "R$ —")
                  : `R$ ${saldoReais.toFixed(2)}`}
                <span style={{ fontSize: "0.85rem", color: COR.muted, fontWeight: 700, marginLeft: "0.4rem" }}>
                  {statusRsSuffix}
                </span>
              </div>

              <div style={{
                fontSize: isMobile ? "0.78rem" : "0.82rem",
                color: COR.muted, marginBottom: "0.95rem", lineHeight: 1.4,
              }}>
                Saldo em reais para Lance Relâmpago. Para Lance Programado, troque por Senhas (R$ {VALOR_POR_SENHA_BRL.toFixed(2)} cada).
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
                gap: "0.6rem",
              }}>
                <button
                  onClick={() => setComprarAberto(true)}
                  style={{
                    ...botaoPrimario,
                    background: "linear-gradient(135deg,#f5a623,#d97706)",
                    boxShadow: "0 4px 14px rgba(245,166,35,0.35)",
                  }}
                  title="Depósito PIX → +R$ (crédito automático após aprovação MP)"
                >
                  💰 Depositar PIX
                </button>
                <button
                  onClick={() => trocarPorSenhas(1)}
                  disabled={trocandoSenhas || (saldoReais == null) || saldoReais < VALOR_POR_SENHA_BRL}
                  style={{
                    ...botaoPrimario,
                    background: (trocandoSenhas || (saldoReais == null) || saldoReais < VALOR_POR_SENHA_BRL)
                      ? "rgba(167,139,250,0.25)"
                      : "linear-gradient(135deg,#a78bfa,#7c3aed)",
                    boxShadow: (trocandoSenhas || (saldoReais == null) || saldoReais < VALOR_POR_SENHA_BRL)
                      ? "none" : "0 4px 14px rgba(167,139,250,0.35)",
                    cursor: trocandoSenhas ? "wait" : ((saldoReais == null) || saldoReais < VALOR_POR_SENHA_BRL) ? "not-allowed" : "pointer",
                    opacity: ((saldoReais == null) || saldoReais < VALOR_POR_SENHA_BRL) ? 0.5 : 1,
                  }}
                  title={`Trocar R$ ${VALOR_POR_SENHA_BRL.toFixed(2)} por 1 senha on-chain`}
                >
                  {trocandoSenhas ? "Trocando…" : `🎫 Trocar R$ ${VALOR_POR_SENHA_BRL.toFixed(2)} → 1 Senha`}
                </button>
                <button
                  onClick={irParaLanceRelampago}
                  disabled={!saldoReais}
                  style={{
                    ...botaoPrimario,
                    background: !saldoReais
                      ? "rgba(245,166,35,0.2)"
                      : "linear-gradient(135deg,#f5a623,#e89400)",
                    boxShadow: !saldoReais ? "none" : "0 4px 14px rgba(245,166,35,0.35)",
                    cursor: !saldoReais ? "not-allowed" : "pointer",
                    opacity: !saldoReais ? 0.5 : 1,
                  }}
                  title={!saldoReais ? "Deposite PIX primeiro" : "Vai ao Mercado de Lances em modo Relâmpago"}
                >
                  ⚡ Lance Relâmpago
                </button>
              </div>

              {trocaInfo && (
                <p style={{ margin: "0.6rem 0 0", fontSize: "0.78rem", color: COR.success, lineHeight: 1.4, fontWeight: 700 }}>
                  {trocaInfo}
                </p>
              )}
              {trocaErro && (
                <p style={{ margin: "0.6rem 0 0", fontSize: "0.72rem", color: COR.danger, lineHeight: 1.4 }}>
                  ⚠️ {trocaErro}
                </p>
              )}
              {saldoRsStatus === "error" && (
                <p style={{ margin: "0.6rem 0 0", fontSize: "0.72rem", color: COR.danger, lineHeight: 1.4 }}>
                  ⚠️ Não foi possível ler o saldo R$ agora.
                </p>
              )}
            </div>

          {/* Wallet Digital — Vale-Crédito (Especificação Refatorada §4).
              Read-only para o usuário; mutações via Admin (x-admin-token). */}
          <div style={{ marginBottom: sectionGap }}>
            <WalletCard endereco={address} isMobile={isMobile} />
          </div>

          {/* Vouchers de Networking — Bônus Diamante (Especificação Refatorada §7).
              Emissão via Admin; resgate será integrado no fluxo de comprar-senhas. */}
          <div style={{ marginBottom: sectionGap }}>
            <VoucherPanel endereco={address} isMobile={isMobile} />
          </div>

          {/* Banners (§6 da spec): auto-gerador SVG + upload manual + premium via Wallet. */}
          <div style={{ marginBottom: sectionGap }}>
            <BannerUpload endereco={address} isMobile={isMobile} getAuthToken={getComprarAuthToken} />
          </div>

          {/* Saldo de Senhas — fonte: saldoSenhas on-chain (AppContext).
              Atualiza via listener SenhasCreditadas + LanceDado e polling
              guardião 30s — não precisa hook próprio. */}
          <div style={{
              ...cardStyle,
              marginBottom: sectionGap,
              borderColor: "rgba(16,185,129,0.28)",
              background: "linear-gradient(180deg, rgba(10,16,42,0.6), rgba(16,185,129,0.04))",
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
                  border: "1px solid rgba(245,166,35,0.18)",
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
                      ? "rgba(245,166,35,0.2)"
                      : "linear-gradient(135deg,#f5a623,#e89400)",
                    boxShadow: !saldoNumero ? "none" : "0 4px 14px rgba(245,166,35,0.35)",
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
                  border: "1px solid rgba(245,166,35,0.12)",
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
                    borderRadius: "10px", border: "1px solid rgba(245,166,35,0.1)",
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
            background: "rgba(245,166,35,0.06)",
            borderRadius: "12px",
            border: "1px solid rgba(245,166,35,0.12)",
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
          </div>
        </>
      )}

      <ComprarFichasModal
        aberto={comprarAberto}
        onFechar={() => setComprarAberto(false)}
        address={address}
        onSucesso={() => {
          try { refetchSaldoRs?.(); } catch {}
          try { refetchSaldo?.();   } catch {}
        }}
      />
    </div>
  );
}
