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
  const [adesao, setAdesao] = useState(null);
  const [troco,  setTroco]  = useState(null);
  const [tier,   setTier]   = useState(null);
  const [contratando, setContratando] = useState(false);
  const [convertendo, setConvertendo] = useState(false);
  const [qtdConv, setQtdConv] = useState(1);
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
      const ra = await fetch(`/.netlify/functions/renovacao-adesao?cliente_id=${address}`,
        { headers: { Authorization: `Bearer ${authToken}` } });
      if (ra.ok) setAdesao(await ra.json());
    } catch { /* não-fatal */ }
    try {
      const rt = await fetch(`/.netlify/functions/troco?cliente_id=${address}`,
        { headers: { Authorization: `Bearer ${authToken}` } });
      if (rt.ok) setTroco(await rt.json());
    } catch { /* não-fatal */ }
  }, [address, authToken]);

  useEffect(() => { carregar(); }, [carregar]);

  async function contratar() {
    if (!tier || !address) return;
    setContratando(true); setErro(""); setMsg("");
    try {
      const resp = await fetch("/.netlify/functions/renovacao-adesao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "solicitar", cliente_id: address, valor: tier.preco }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) { setErro(data?.error?.message || `HTTP ${resp.status}`); return; }
      setMsg(`Solicitação registada para a cota ${tier.nome} (${brl(tier.preco)}). Pague o PIX abaixo; a coordenação confirma manualmente.`);
      carregar();
    } catch (err) {
      setErro(err?.message || "Falha ao solicitar contratação.");
    } finally {
      setContratando(false);
    }
  }

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
    background: "rgba(10,16,42,0.6)", border: "1px solid rgba(245,166,35,0.18)",
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
                style={{ width: "5rem", padding: "0.5rem", background: "rgba(3,15,36,0.7)", border: "1px solid rgba(245,166,35,0.3)", borderRadius: "8px", color: "#e8f0fe", textAlign: "center", fontWeight: 700 }}
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
            {cota?.categoria ? (
              <div style={{ marginTop: "0.4rem", color: "#e8f0fe" }}>
                Categoria <strong style={{ color: COTAS.find(c => c.id === cota.categoria)?.cor || "#f5a623", textTransform: "uppercase" }}>{cota.categoria}</strong>
                {" · "}{cota.vendida ? "ativa" : "inativa"}
                {adesao?.status ? ` · adesão ${adesao.status}` : ""}
              </div>
            ) : (
              <div style={{ marginTop: "0.4rem", color: "#5a7090" }}>
                Sem cota ativa. Contrate uma abaixo. {adesao?.status && adesao.status !== "nao-iniciada" ? `(adesão: ${adesao.status})` : ""}
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
                  background: tier?.id === c.id ? "rgba(245,166,35,0.12)" : "rgba(3,15,36,0.6)",
                  border: `1px solid ${tier?.id === c.id ? c.cor : "rgba(245,166,35,0.15)"}`,
                }}>
                  <div style={{ fontWeight: 900, color: c.cor, textTransform: "uppercase", fontSize: "0.95rem" }}>{c.nome}</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#e8f0fe" }}>{brl(c.preco)}</div>
                  <div style={{ fontSize: "0.72rem", color: "#5a7090" }}>produto mínimo {brl(c.minimo)}</div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.3rem" }}>{c.beneficios}</div>
                </button>
              ))}
            </div>
            <button onClick={contratar} disabled={!tier || contratando} style={{ ...btn("#f5a623", !tier || contratando), marginTop: "0.8rem" }}>
              {contratando ? "A solicitar..." : tier ? `Contratar ${tier.nome} via PIX (${brl(tier.preco)})` : "Selecione uma cota"}
            </button>

            {adesao?.status === "pendente" && adesao?.pix && (
              <div style={{ marginTop: "0.8rem", padding: "0.8rem", borderRadius: "10px", background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.3)", fontSize: "0.8rem", color: "#e8f0fe", lineHeight: 1.6 }}>
                <strong style={{ color: "#fbbf24" }}>Pague o PIX para confirmar a cota:</strong><br />
                Chave PIX: <strong style={{ color: "#f5a623" }}>{adesao.pix.email}</strong> · Banco: {adesao.pix.banco}<br />
                <span style={{ color: "#5a7090", fontSize: "0.74rem" }}>Após o pagamento, a coordenação confirma manualmente (até 24h).</span>
              </div>
            )}
          </div>

          {msg && <p style={{ fontSize: "0.82rem", color: "#10b981", fontWeight: 700 }}>{msg}</p>}
          {erro && <p style={{ fontSize: "0.8rem", color: "#ef4444" }}>{erro}</p>}
        </>
      )}
    </div>
  );
}
