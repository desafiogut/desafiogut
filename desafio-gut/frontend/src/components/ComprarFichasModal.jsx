import { useEffect, useState } from "react";
import { useIsMobile } from "../hooks/useIsMobile.js";

const COR = {
  primary: "#f5a623",
  primaryDim: "rgba(245,166,35,0.15)",
  gold: "#f5a623",
  text: "#e8f0fe",
  muted: "#4a6490",
  success: "#10b981",
  danger: "#ef4444",
  blue300: "#fbbf24",
  purple: "#a78bfa",
};

const PRESETS = [1, 5, 10];
const MIN_QTD = 1;
const MAX_QTD = 100;
const VALOR_POR_SENHA_BRL = 2;

const ENDPOINT_INICIAR   = "/.netlify/functions/iniciar-pagamento";
const ENDPOINT_CONFIRMAR = "/.netlify/functions/confirmar-pagamento";

async function postJson(url, body) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = null;
  try { data = await resp.json(); } catch {}
  if (!resp.ok) {
    const msg = data?.error?.message || data?.errorMessage || `HTTP ${resp.status}`;
    const code = data?.error?.code || `http_${resp.status}`;
    const err = new Error(msg);
    err.code = code;
    throw err;
  }
  return data;
}

// Polling: a cada 3s o cliente chama confirmar-pagamento. O endpoint é
// idempotente — quando MP retorna `approved`, o crédito on-chain dispara
// automaticamente e o modal avança para sucesso sem o usuário clicar
// "Já paguei". Cobre falha do webhook MP.
const POLL_INTERVALO_MS = 3000;
const POLL_TIMEOUT_MS   = 15 * 60 * 1000; // 15 min (igual TTL do JWT)

export default function ComprarFichasModal({ aberto, onFechar, address, onSucesso }) {
  const isMobile = useIsMobile();
  const [etapa, setEtapa]           = useState("quantia"); // quantia | pagamento | sucesso
  const [qtd, setQtd]               = useState(1);
  const [pedido, setPedido]         = useState(null);      // resposta iniciar-pagamento
  const [resultado, setResultado]   = useState(null);      // resposta confirmar-pagamento
  const [loading, setLoading]       = useState(false);
  const [erro, setErro]             = useState("");
  const [copiado, setCopiado]       = useState(false);
  const [aguardandoPix, setAguardandoPix] = useState(false); // polling background ativo

  // Reset ao abrir
  useEffect(() => {
    if (!aberto) return;
    setEtapa("quantia");
    setQtd(1);
    setPedido(null);
    setResultado(null);
    setLoading(false);
    setErro("");
    setCopiado(false);
    setAguardandoPix(false);
  }, [aberto]);

  // Polling automático — ativo enquanto etapa=="pagamento" e há pedido com token.
  // Cada tick: POST confirmar-pagamento. Se MP ainda não aprovou → 402 silencioso
  // (continua polling). Se aprovou → dispara o caminho de sucesso. Se erro real
  // de servidor → marca erro mas mantém polling (auto-retry transparente).
  useEffect(() => {
    if (!aberto) return;
    if (etapa !== "pagamento") return;
    if (!pedido?.token) return;

    let cancelado = false;
    setAguardandoPix(true);
    const inicio = Date.now();

    const tick = async () => {
      if (cancelado) return;
      if (Date.now() - inicio > POLL_TIMEOUT_MS) {
        if (!cancelado) setAguardandoPix(false);
        return;
      }
      try {
        const data = await postJson(ENDPOINT_CONFIRMAR, { token: pedido.token });
        if (cancelado) return;
        setResultado(data);
        setEtapa("sucesso");
        setAguardandoPix(false);
        return;
      } catch (err) {
        // 402 pagamento_nao_confirmado é o caminho feliz do polling: ainda não
        // aprovado. Outros erros podem ser transitórios (mp_indisponivel, rede).
        const code = err?.code || "";
        if (code !== "pagamento_nao_confirmado" && code !== "http_402") {
          // Erros transitórios (mp_indisponivel, rede): loga mas continua polling.
          console.warn("[comprar-fichas] poll falhou", { code, message: err?.message });
        }
      }
      if (!cancelado) setTimeout(tick, POLL_INTERVALO_MS);
    };
    const t0 = setTimeout(tick, POLL_INTERVALO_MS);
    return () => {
      cancelado = true;
      clearTimeout(t0);
      setAguardandoPix(false);
    };
  }, [aberto, etapa, pedido?.token]);

  // ESC fecha (exceto durante loading)
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e) => { if (e.key === "Escape" && !loading) fechar(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto, loading]);

  if (!aberto) return null;

  const valorBRL = qtd * VALOR_POR_SENHA_BRL;

  function fechar() {
    if (loading) return;
    onFechar?.();
  }

  function fecharComSucesso() {
    onSucesso?.();
    onFechar?.();
  }

  async function iniciarPagamento() {
    if (!address) { setErro("Endereço da carteira não disponível."); return; }
    setLoading(true);
    setErro("");
    try {
      const data = await postJson(ENDPOINT_INICIAR, { endereco: address, qtd });
      setPedido(data);
      setEtapa("pagamento");
    } catch (err) {
      setErro(err?.message || "Falha ao gerar pedido PIX.");
    } finally {
      setLoading(false);
    }
  }

  async function copiarQr() {
    if (!pedido?.qrCodeText) return;
    try {
      await navigator.clipboard.writeText(pedido.qrCodeText);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro("Não foi possível copiar o código.");
    }
  }

  // ── Estilos ──────────────────────────────────────────────────────────────────
  const overlay = {
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(2,6,20,0.78)", backdropFilter: "blur(6px)",
    display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center",
    padding: isMobile ? 0 : "1.5rem",
  };
  const dialog = {
    width: "100%", maxWidth: isMobile ? "100%" : "440px",
    maxHeight: isMobile ? "92vh" : "85vh",
    background: "linear-gradient(180deg, rgba(10,16,42,0.96), rgba(3,15,36,0.96))",
    border: "1px solid rgba(245,166,35,0.28)",
    borderRadius: isMobile ? "20px 20px 0 0" : "20px",
    padding: isMobile ? "1.1rem" : "1.4rem",
    color: COR.text,
    boxShadow: "0 -10px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,166,35,0.08) inset",
    overflowY: "auto",
  };
  const cabecalho = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: "1rem", gap: "0.5rem",
  };
  const titulo = {
    margin: 0, fontSize: isMobile ? "1.1rem" : "1.2rem",
    fontWeight: 900, color: COR.text,
  };
  const subTitulo = {
    margin: "0.25rem 0 0", fontSize: "0.78rem", color: COR.muted, lineHeight: 1.4,
  };
  const passos = {
    display: "flex", gap: "0.4rem", marginBottom: "1.1rem",
  };
  const dotPasso = (ativo, completo) => ({
    flex: 1, height: "4px", borderRadius: "4px",
    background: completo ? COR.success : ativo ? COR.primary : "rgba(245,166,35,0.18)",
    transition: "background 0.2s",
  });
  const labelInput = {
    fontSize: "0.74rem", color: COR.muted, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.06em",
    marginBottom: "0.45rem", display: "block",
  };
  const presetBtn = (ativo) => ({
    flex: 1, padding: "0.65rem 0.4rem",
    background: ativo ? COR.primary : "rgba(245,166,35,0.12)",
    border: `1px solid ${ativo ? COR.primary : "rgba(245,166,35,0.3)"}`,
    borderRadius: "10px",
    color: ativo ? "#fff" : COR.blue300,
    fontWeight: 800, fontSize: "0.88rem",
    cursor: "pointer",
  });
  const inputNum = {
    width: "100%", padding: "0.7rem 0.85rem",
    background: "rgba(3,15,36,0.7)",
    border: "1px solid rgba(245,166,35,0.3)",
    borderRadius: "10px",
    color: COR.text, fontSize: "0.95rem", fontWeight: 700,
    textAlign: "center",
    outline: "none",
  };
  const valorBox = {
    background: "rgba(245,166,35,0.08)",
    border: "1px solid rgba(245,166,35,0.3)",
    borderRadius: "12px",
    padding: "0.85rem",
    textAlign: "center",
    margin: "1rem 0 1.1rem",
  };
  const btnPrimario = (disabled) => ({
    width: "100%", padding: "0.85rem 1rem",
    background: disabled ? "rgba(245,166,35,0.3)" : "linear-gradient(135deg,#f5a623,#e89400)",
    border: "none", borderRadius: "12px",
    color: "#fff", fontWeight: 800, fontSize: "0.92rem",
    cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: disabled ? "none" : "0 4px 14px rgba(245,166,35,0.35)",
  });
  const btnSecundario = {
    width: "100%", padding: "0.7rem 1rem",
    background: "transparent",
    border: "1px solid rgba(74,100,144,0.4)",
    borderRadius: "12px", color: COR.muted,
    fontWeight: 700, fontSize: "0.85rem",
    cursor: "pointer",
    marginTop: "0.6rem",
  };
  const btnFechar = {
    background: "transparent", border: "none",
    color: COR.muted, fontSize: "1.4rem",
    cursor: loading ? "not-allowed" : "pointer",
    padding: "0.2rem 0.5rem",
    opacity: loading ? 0.4 : 1,
  };
  const erroBox = {
    padding: "0.65rem 0.85rem",
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: "10px",
    color: COR.danger,
    fontSize: "0.8rem", marginBottom: "0.85rem",
    lineHeight: 1.4,
  };

  return (
    <div role="dialog" aria-modal="true" style={overlay} onClick={fechar}>
      <div style={dialog} onClick={(e) => e.stopPropagation()}>
        <div style={cabecalho}>
          <div style={{ minWidth: 0 }}>
            <h2 style={titulo}>💰 Depositar PIX</h2>
            <p style={subTitulo}>Saldo R$ disponível para Lance Relâmpago ou troca por senhas</p>
          </div>
          <button onClick={fechar} aria-label="Fechar" style={btnFechar} disabled={loading}>×</button>
        </div>

        <div style={passos}>
          <div style={dotPasso(etapa === "quantia",   etapa !== "quantia")} />
          <div style={dotPasso(etapa === "pagamento", etapa === "sucesso")} />
          <div style={dotPasso(etapa === "sucesso",   false)} />
        </div>

        {erro && <div style={erroBox}>⚠️ {erro}</div>}

        {etapa === "quantia" && (
          <>
            <label style={labelInput}>Quantas senhas?</label>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
              {PRESETS.map((p) => (
                <button key={p} onClick={() => setQtd(p)} style={presetBtn(qtd === p)}>
                  {p}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={MIN_QTD}
              max={MAX_QTD}
              value={qtd}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isNaN(v)) { setQtd(MIN_QTD); return; }
                setQtd(Math.max(MIN_QTD, Math.min(MAX_QTD, v)));
              }}
              style={inputNum}
              aria-label="Quantidade de senhas"
            />

            <div style={valorBox}>
              <div style={{ fontSize: "0.7rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem", fontWeight: 700 }}>
                Total a pagar
              </div>
              <div style={{ fontSize: "1.7rem", fontWeight: 900, color: COR.gold, lineHeight: 1.1 }}>
                R$ {valorBRL.toFixed(2)}
              </div>
              <div style={{ fontSize: "0.72rem", color: COR.muted, marginTop: "0.3rem" }}>
                {qtd} {qtd === 1 ? "senha" : "senhas"} × R$ {VALOR_POR_SENHA_BRL.toFixed(2)}
              </div>
            </div>

            <button
              onClick={iniciarPagamento}
              disabled={loading || !address}
              style={btnPrimario(loading || !address)}
            >
              {loading ? "Gerando PIX…" : "Continuar para pagamento →"}
            </button>
            {!address && (
              <p style={{ fontSize: "0.72rem", color: COR.muted, textAlign: "center", marginTop: "0.5rem" }}>
                Faça login para comprar fichas.
              </p>
            )}
          </>
        )}

        {etapa === "pagamento" && pedido && (
          <>
            <div style={{ ...valorBox, margin: "0 0 1rem" }}>
              <div style={{ fontSize: "0.7rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem", fontWeight: 700 }}>
                Valor PIX
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 900, color: COR.gold }}>
                R$ {Number(pedido.valorBRL).toFixed(2)}
              </div>
              <div style={{ fontSize: "0.72rem", color: COR.muted, marginTop: "0.3rem" }}>
                {pedido.qtd} {pedido.qtd === 1 ? "senha" : "senhas"} · provider: {pedido.provider}
              </div>
            </div>

            <label style={labelInput}>Código PIX (copia e cola)</label>
            <div style={{
              padding: "0.7rem 0.85rem",
              background: "rgba(3,15,36,0.7)",
              border: "1px solid rgba(245,166,35,0.25)",
              borderRadius: "10px",
              fontFamily: "monospace", fontSize: "0.7rem",
              color: COR.blue300, wordBreak: "break-all",
              maxHeight: "120px", overflowY: "auto",
              marginBottom: "0.6rem",
            }}>
              {pedido.qrCodeText}
            </div>
            <button onClick={copiarQr} style={{ ...btnSecundario, marginTop: 0, marginBottom: "0.85rem" }}>
              {copiado ? "✓ Copiado!" : "📋 Copiar código PIX"}
            </button>

            {pedido.simulated && (
              <div style={{
                padding: "0.55rem 0.75rem",
                background: "rgba(245,166,35,0.1)",
                border: "1px solid rgba(245,166,35,0.3)",
                borderRadius: "10px",
                color: COR.gold, fontSize: "0.74rem", fontWeight: 700,
                marginBottom: "0.85rem", lineHeight: 1.4,
              }}>
                🧪 PIX simulado (provider mock). Em produção real, esta etapa
                aguarda o webhook do provedor antes de creditar.
              </div>
            )}

            {aguardandoPix && !loading && (
              <div style={{
                padding: "0.55rem 0.75rem",
                background: "rgba(245,166,35,0.1)",
                border: "1px solid rgba(245,166,35,0.3)",
                borderRadius: "10px",
                color: COR.blue300, fontSize: "0.74rem", fontWeight: 600,
                marginBottom: "0.85rem", lineHeight: 1.4,
                display: "flex", alignItems: "center", gap: "0.5rem",
              }}>
                <span style={{ fontSize: "0.95rem" }}>⏳</span>
                <span>Aguardando confirmação do PIX… o crédito acontece automaticamente assim que o pagamento for aprovado.</span>
              </div>
            )}

            <button onClick={fechar} style={btnSecundario} disabled={loading}>
              {aguardandoPix ? "Fechar (continuará processando em background)" : "Cancelar"}
            </button>
          </>
        )}

        {etapa === "sucesso" && resultado && (
          <>
            {/* Modelo dual (Frente B.9): PIX aprovado credita R$ no blob saldo-rs.
                Senhas só vêm depois via "Trocar R$ por Senhas" na carteira. */}
            <div style={{
              textAlign: "center", padding: "1rem 0 0.5rem",
            }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.4rem" }}>
                {resultado.idempotent ? "🔁" : "✅"}
              </div>
              <div style={{ fontSize: "1.05rem", fontWeight: 800, color: COR.success, marginBottom: "0.3rem" }}>
                {resultado.idempotent ? "Pedido já processado" : "PIX aprovado!"}
              </div>
              <div style={{ fontSize: "0.78rem", color: COR.muted, lineHeight: 1.45 }}>
                R$ {Number(resultado.valorBRL ?? (resultado.valorCentavos ? resultado.valorCentavos / 100 : 0)).toFixed(2)} creditados no seu saldo.
              </div>
            </div>

            {(typeof resultado.saldoRsAntesCentavos === "number" && typeof resultado.saldoRsDepoisCentavos === "number") && (
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem", margin: "1rem 0",
              }}>
                <div style={{
                  background: "rgba(3,15,36,0.7)",
                  border: "1px solid rgba(245,166,35,0.18)",
                  borderRadius: "10px",
                  padding: "0.65rem 0.75rem",
                }}>
                  <div style={{ fontSize: "0.62rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.2rem", fontWeight: 700 }}>
                    Saldo Antes
                  </div>
                  <div style={{ fontSize: "1.1rem", color: COR.blue300, fontWeight: 800 }}>
                    R$ {(resultado.saldoRsAntesCentavos / 100).toFixed(2)}
                  </div>
                </div>
                <div style={{
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.3)",
                  borderRadius: "10px",
                  padding: "0.65rem 0.75rem",
                }}>
                  <div style={{ fontSize: "0.62rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.2rem", fontWeight: 700 }}>
                    Saldo Depois
                  </div>
                  <div style={{ fontSize: "1.1rem", color: COR.success, fontWeight: 800 }}>
                    R$ {(resultado.saldoRsDepoisCentavos / 100).toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            <div style={{
              padding: "0.7rem 0.85rem",
              background: "rgba(245,166,35,0.08)",
              border: "1px solid rgba(245,166,35,0.25)",
              borderRadius: "10px",
              color: COR.gold, fontSize: "0.76rem", lineHeight: 1.45,
              marginBottom: "1rem",
            }}>
              💡 Para participar de Lance Programado, use <strong>Trocar R$ por Senhas</strong> na carteira (R$ 2,00 = 1 senha on-chain).
            </div>

            <button onClick={fecharComSucesso} style={btnPrimario(false)}>
              Fechar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
