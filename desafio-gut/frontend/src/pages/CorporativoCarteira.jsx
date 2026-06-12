// MC17.1 — Carteira do Lojista (mundo corporativo, rota /corporativo/carteira).
//
// Regra de negócio (validada pelo cliente):
//   - O lojista NÃO compra senhas avulsas. Contrata uma COTA COMERCIAL
//     (Bronze/Prata/Ouro/Diamante) via Adesão (PIX manual + aprovação admin).
//   - Anunciar produto abaixo do mínimo da cota gera SENHAS DE TROCO (R$ 2 cada),
//     válidas 30 dias (FIFO). Backend: cotas.mjs -> _lib/troco-senhas.mjs.
//   - O lojista converte o troco em senhas on-chain (/troco?action=converter) e
//     licita em /corporativo/mercado como utilizador comum.
// Tom profissional, sem emojis (MC15.5). Sem qualquer UI de compra avulsa.

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useTrocarPorSenhas } from "../hooks/useTrocarPorSenhas.js";
import BotaoLoginPrincipal from "../components/BotaoLoginPrincipal.jsx";
// MC17.3 — elementos do lojista realocados da MinhaCarteira (utilizador comum):
// Wallet Digital (Vale-Crédito), Renovação de Adesão/Consultoria e Vouchers.
import WalletCard from "../components/WalletCard.jsx";
import RenovacaoCard from "../components/RenovacaoCard.jsx";
import VoucherPanel from "../components/VoucherPanel.jsx";

// Valores oficiais (ESPECIFICACAO-TECNICA REQ-04..07; confirmados pelo cliente):
//   preco   = valor do contrato da cota (o que o lojista paga via Adesão)
//   minimo  = valor mínimo do produto anunciado (abaixo disso gera troco)
const COTAS = [
  { id: "bronze",   nome: "Bronze",   preco: 2640,  minimo: 660,  cor: "#cd7f32",
    beneficios: "Banner app + exposição Relâmpago · 1 voucher/mês" },
  { id: "prata",    nome: "Prata",    preco: 5600,  minimo: 1350, cor: "#cbd5e1",
    beneficios: "Banner site 1200x300 · 3 vouchers/mês · Analytics 30d" },
  { id: "ouro",     nome: "Ouro",     preco: 11000, minimo: 2250, cor: "#f5a623",
    beneficios: "Leilões Programados 24h · 10 vouchers/mês · Analytics 90d" },
  { id: "diamante", nome: "Diamante", preco: 18000, minimo: 4500, cor: "#00d4ff",
    beneficios: "Topo fixo · 28 banners app · 10 vouchers bônus" },
];

const brl = (n) => `R$ ${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export default function CorporativoCarteira() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const {
    isConnected, abrirModal, address, authToken, cotaCorporativa,
    saldoSenhas, saldoSenhasStatus, refetchSaldo,
  } = useAppContext();
  const { getAuthToken } = useTrocarPorSenhas(); // lance-auth para converter troco

  const [cota,   setCota]   = useState(cotaCorporativa || null);
  const [troco,  setTroco]  = useState(null);
  const [tier,   setTier]   = useState(null);
  const [produtoValor, setProdutoValor] = useState("");
  const [contratando, setContratando] = useState(false);
  const [convertendo, setConvertendo] = useState(false);
  const [qtdConv, setQtdConv] = useState(1);
  const [pedido, setPedido] = useState(null);          // resposta iniciar-cota (QR + token)
  const [pagStatus, setPagStatus] = useState("idle");  // idle | aguardando | confirmado
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    if (!address) return;
    try {
      const rc = await fetch(`/.netlify/functions/cotas?cliente_id=${address}`);
      setCota(rc.status === 404 ? null : (rc.ok ? await rc.json() : null));
    } catch { /* não-fatal */ }
    if (!authToken) return;
    try {
      const rt = await fetch(`/.netlify/functions/troco?cliente_id=${address}`,
        { headers: { Authorization: `Bearer ${authToken}` } });
      if (rt.ok) setTroco(await rt.json());
    } catch { /* não-fatal */ }
  }, [address, authToken]);

  useEffect(() => { carregar(); }, [carregar]);

  // MC17.1 — contratar cota via Mercado Pago (SEM aprovação manual).
  // Inicia o pedido PIX; o webhook ativa a cota ao aprovar (polling como fallback).
  async function contratar() {
    if (!tier || !address) return;
    setContratando(true); setErro(""); setMsg(""); setPagStatus("idle"); setPedido(null);
    try {
      const resp = await fetch("/.netlify/functions/iniciar-cota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endereco: address, categoria: tier.id,
          produtoValor: produtoValor === "" ? null : Number(produtoValor),
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) { setErro(data?.error?.message || `HTTP ${resp.status}`); return; }
      setPedido(data);
      setPagStatus("aguardando");
    } catch (err) {
      setErro(err?.message || "Falha ao iniciar contratação.");
    } finally {
      setContratando(false);
    }
  }

  // Polling: confirma o pagamento; ao aprovar, a cota é ativada automaticamente.
  useEffect(() => {
    if (pagStatus !== "aguardando" || !pedido?.token) return;
    let cancel = false;
    const inicio = Date.now();
    const tick = async () => {
      if (cancel || Date.now() - inicio > 15 * 60 * 1000) return;
      try {
        const r = await fetch("/.netlify/functions/confirmar-pagamento", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: pedido.token }),
        });
        if (!cancel && r.ok) {
          setPagStatus("confirmado");
          setMsg("Pagamento confirmado — cota ativada.");
          carregar();
          return;
        }
      } catch { /* transitório: continua */ }
      if (!cancel) setTimeout(tick, 3000);
    };
    const t = setTimeout(tick, 3000);
    return () => { cancel = true; clearTimeout(t); };
  }, [pagStatus, pedido?.token, carregar]);

  async function converter() {
    if (!address || convertendo) return;
    setConvertendo(true); setErro(""); setMsg("");
    try {
      const token = await getAuthToken();
      const resp = await fetch("/.netlify/functions/troco?action=converter", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endereco: address, qtd: qtdConv }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) { setErro(data?.error?.message || `HTTP ${resp.status}`); return; }
      setMsg(`${qtdConv} senha(s) de troco convertidas para on-chain. Já pode licitar.`);
      try { refetchSaldo?.(); } catch {}
      carregar();
    } catch (err) {
      setErro(err?.message || "Falha na conversão.");
    } finally {
      setConvertendo(false);
    }
  }

  const card = {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,166,35,0.18)",
    borderRadius: "16px", padding: isMobile ? "1rem" : "1.25rem",
    backdropFilter: "blur(16px)", marginBottom: isMobile ? "1rem" : "1.25rem",
  };
  const lbl = { fontSize: "0.7rem", color: "#5a7090", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 };
  const btn = (cor, off) => ({
    padding: "0.65rem 1rem", background: off ? "rgba(245,166,35,0.2)" : `linear-gradient(135deg,${cor},${cor}cc)`,
    border: "none", borderRadius: "10px", color: off ? "#9bb0c9" : "#0a0f1a",
    fontWeight: 800, fontSize: "0.85rem", cursor: off ? "not-allowed" : "pointer", opacity: off ? 0.7 : 1,
  });

  const saldoTroco     = troco?.saldoTroco ?? 0;
  const expiramEmBreve = troco?.expiramEmBreve ?? 0;
  const saldoOnChain   = saldoSenhas == null ? null : Number(saldoSenhas);

  return (
    <div style={{ padding: isMobile ? "1rem" : "1.25rem", flex: 1 }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900, color: "#e8f0fe" }}>Carteira do Lojista</h1>
        <p style={{ margin: "0.35rem 0 0", color: "#5a7090", fontSize: "0.85rem" }}>
          {cotaCorporativa?.empresa ? `${cotaCorporativa.empresa} · ` : ""}
          Contrate a sua cota comercial. As senhas para licitar vêm do excedente da cota.
        </p>
      </header>

      {!isConnected ? (
        <div style={{ ...card, color: "#5a7090" }}>
          <p style={{ marginTop: 0, fontSize: "0.9rem" }}>Inicie sessão como lojista para gerir a sua carteira.</p>
          <BotaoLoginPrincipal onClick={abrirModal} size="md" fullWidth={isMobile} />
        </div>
      ) : (
        <>
          {/* Senhas de troco */}
          <div style={{ ...card, borderColor: "rgba(16,185,129,0.28)" }}>
            <div style={lbl}>Senhas de troco (excedente da cota)</div>
            <div style={{ display: "flex", gap: "1.5rem", alignItems: "baseline", flexWrap: "wrap", margin: "0.4rem 0" }}>
              <div>
                <span style={{ fontSize: "2rem", fontWeight: 900, color: "#10b981" }}>{saldoTroco}</span>
                <span style={{ fontSize: "0.8rem", color: "#5a7090", marginLeft: "0.4rem" }}>válidas (30 dias, FIFO)</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#5a7090" }}>
                On-chain (para licitar): <strong style={{ color: "#e8f0fe" }}>
                  {saldoOnChain == null ? (saldoSenhasStatus === "loading" ? "..." : "—") : saldoOnChain}
                </strong>
              </div>
            </div>
            {expiramEmBreve > 0 && (
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.78rem", color: "#fbbf24", fontWeight: 700 }}>
                Atenção: {expiramEmBreve} senha(s) expiram nos próximos 5 dias. Use-as nos leilões.
              </p>
            )}
            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
              <input type="number" min={1} max={Math.max(1, saldoTroco)} value={qtdConv}
                onChange={(e) => setQtdConv(Math.max(1, Math.min(saldoTroco || 1, parseInt(e.target.value, 10) || 1)))}
                style={{ width: "5rem", padding: "0.5rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,166,35,0.3)", borderRadius: "8px", color: "#e8f0fe", textAlign: "center", fontWeight: 700 }}
                aria-label="Quantidade de troco a converter" />
              <button onClick={converter} disabled={convertendo || saldoTroco < 1} style={btn("#10b981", convertendo || saldoTroco < 1)}>
                {convertendo ? "A converter..." : "Converter para licitar"}
              </button>
              <button onClick={() => navigate("/corporativo/mercado")} disabled={!saldoOnChain} style={btn("#f5a623", !saldoOnChain)}>
                Ir dar lances
              </button>
            </div>
          </div>

          {/* Cota atual */}
          <div style={card}>
            <div style={lbl}>Cota atual</div>
            {cota?.categoria && cota?.vendida ? (
              <div style={{ marginTop: "0.4rem", color: "#e8f0fe" }}>
                Categoria <strong style={{ color: COTAS.find(c => c.id === cota.categoria)?.cor || "#f5a623", textTransform: "uppercase" }}>{cota.categoria}</strong>
                {" · "}<span style={{ color: "#10b981", fontWeight: 700 }}>ativa</span>
              </div>
            ) : (
              <div style={{ marginTop: "0.4rem", color: "#5a7090" }}>
                Sem cota ativa. Contrate uma abaixo.
              </div>
            )}
          </div>

          {/* Contratar cota comercial */}
          <div style={card}>
            <div style={{ ...lbl, marginBottom: "0.6rem" }}>Contratar cota comercial</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.6rem" }}>
              {COTAS.map((c) => (
                <button key={c.id} onClick={() => setTier(c)} style={{
                  textAlign: "left", padding: "0.8rem", borderRadius: "12px", cursor: "pointer",
                  background: tier?.id === c.id ? "rgba(245,166,35,0.12)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${tier?.id === c.id ? c.cor : "rgba(245,166,35,0.15)"}`,
                }}>
                  <div style={{ fontWeight: 900, color: c.cor, textTransform: "uppercase", fontSize: "0.95rem" }}>{c.nome}</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#e8f0fe" }}>{brl(c.preco)}</div>
                  <div style={{ fontSize: "0.72rem", color: "#5a7090" }}>produto mínimo {brl(c.minimo)}</div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.3rem" }}>{c.beneficios}</div>
                </button>
              ))}
            </div>
            {/* Valor do produto a anunciar (opcional) — define o troco do excedente. */}
            {tier && (
              <div style={{ marginTop: "0.8rem" }}>
                <label style={{ ...lbl, display: "block", marginBottom: "0.3rem" }}>
                  Valor do produto a anunciar (opcional)
                </label>
                <input
                  type="number" min={0} value={produtoValor}
                  onChange={(e) => setProdutoValor(e.target.value)}
                  placeholder={`mínimo ${brl(tier.minimo)}`}
                  style={{ width: "100%", padding: "0.6rem 0.8rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,166,35,0.3)", borderRadius: "10px", color: "#e8f0fe", fontWeight: 700, outline: "none" }}
                  aria-label="Valor do produto a anunciar"
                />
                {produtoValor !== "" && Number(produtoValor) >= 0 && Number(produtoValor) < tier.minimo && (
                  <p style={{ margin: "0.3rem 0 0", fontSize: "0.74rem", color: "#10b981" }}>
                    Gera {Math.floor((tier.minimo - Number(produtoValor)) / 2)} senha(s) de troco ao ativar.
                  </p>
                )}
              </div>
            )}

            <button onClick={contratar} disabled={!tier || contratando || pagStatus === "aguardando"}
              style={{ ...btn("#f5a623", !tier || contratando || pagStatus === "aguardando"), marginTop: "0.8rem" }}>
              {contratando ? "A gerar PIX..." : tier ? `Contratar ${tier.nome} via PIX (${brl(tier.preco)})` : "Selecione uma cota"}
            </button>

            {/* Pagamento Mercado Pago: QR + estado. Cota ativa automaticamente ao aprovar. */}
            {pedido?.qrCodeText && pagStatus !== "confirmado" && (
              <div style={{ marginTop: "0.8rem", padding: "0.8rem", borderRadius: "10px", background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.3)", fontSize: "0.78rem", color: "#e8f0fe", lineHeight: 1.6 }}>
                <strong style={{ color: "#fbbf24" }}>Pague com PIX (Mercado Pago) — {brl(pedido.valorBRL)}:</strong>
                <div style={{ marginTop: "0.4rem", padding: "0.5rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px", fontFamily: "monospace", fontSize: "0.68rem", color: "#fbbf24", wordBreak: "break-all", maxHeight: "100px", overflowY: "auto" }}>
                  {pedido.qrCodeText}
                </div>
                <button onClick={() => { try { navigator.clipboard.writeText(pedido.qrCodeText); } catch {} }}
                  style={{ ...btn("#00d4aa", false), marginTop: "0.5rem", padding: "0.45rem 0.9rem", fontSize: "0.78rem" }}>
                  Copiar código PIX
                </button>
                <p style={{ margin: "0.5rem 0 0", color: "#5a7090", fontSize: "0.74rem" }}>
                  Aguardando confirmação do pagamento… a cota é ativada automaticamente assim que o pagamento for aprovado.
                </p>
              </div>
            )}
            {pagStatus === "confirmado" && (
              <div style={{ marginTop: "0.8rem", padding: "0.8rem", borderRadius: "10px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.35)", fontSize: "0.82rem", color: "#10b981", fontWeight: 700 }}>
                Pagamento confirmado — cota ativada.
              </div>
            )}
          </div>

          {msg && <p style={{ fontSize: "0.82rem", color: "#10b981", fontWeight: 700 }}>{msg}</p>}
          {erro && <p style={{ fontSize: "0.8rem", color: "#ef4444" }}>{erro}</p>}

          {/* MC17.3 — Wallet Digital (Vale-Crédito) realocada do utilizador comum.
              Read-only; o crédito vem do excedente da cota (MC17.1 §2). */}
          <div style={{ marginBottom: isMobile ? "1rem" : "1.25rem" }}>
            <WalletCard endereco={address} isMobile={isMobile} />
          </div>

          {/* MC17.3 — Renovação de Adesão / Consultoria (MC17.1 §8) realocada do comum. */}
          <div style={{ marginBottom: isMobile ? "1rem" : "1.25rem" }}>
            <RenovacaoCard endereco={address} isMobile={isMobile} />
          </div>

          {/* MC17.3 — Vouchers de Networking (benefício de cota) realocados do comum. */}
          <div style={{ marginBottom: isMobile ? "1rem" : "1.25rem" }}>
            <VoucherPanel endereco={address} isMobile={isMobile} />
          </div>
        </>
      )}
    </div>
  );
}
