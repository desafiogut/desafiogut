// BannerUpload — painel de upload de banner pelo cliente (REQ-22, REQ-23).
//
// • Cliente conectado (Privy) upa imagem → POST /banners (status: pendente).
// • Opção "Premium" debita Wallet em valorCentavos antes de persistir.
// • Sem upload: cai no template auto-gerado pelo BannerCard via fallback do GET.
// • Sem auth (Privy) ou sem signer: bloqueia o submit com mensagem.
//
// Auth JWT: pede assinatura única (cached 10min em ref via prop opcional).
// Para esta primeira versão, exige `getAuthToken()` injetado pelo parent.

import { useRef, useState } from "react";
import BannerCard from "./BannerCard.jsx";
import { Button } from "@/components/ui";

const COR = {
  primary: "#f5a623",
  primaryDim: "rgba(245,166,35,0.15)",
  border: "rgba(245,166,35,0.30)",
  text: "#e8f0fe",
  muted: "#94a3b8",
  success: "#10b981",
  danger: "#ef4444",
};

const DIMENSAO_INFO = {
  app:  { label: "App",  largura: 800,  altura: 200, descricao: "Banner exibido dentro do aplicativo (800×200 px)." },
  site: { label: "Site", largura: 1200, altura: 300, descricao: "Banner exibido no site (1200×300 px)." },
};

const MIMES_ACEITOS = "image/png,image/jpeg,image/webp,image/svg+xml";
const TAMANHO_MAX_KB = 500;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload  = () => {
      const result = String(reader.result || "");
      // result vem como "data:<mime>;base64,<...>"
      const i = result.indexOf(",");
      resolve(i >= 0 ? result.slice(i + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

export default function BannerUpload({ endereco, isMobile = false, getAuthToken }) {
  const [dimensao, setDimensao] = useState("app");
  const [premium,  setPremium]  = useState(false);
  const [valorPremium, setValorPremium] = useState("5000"); // R$ 50 default
  const [arquivo, setArquivo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState({ tipo: "idle", msg: "" }); // idle|enviando|ok|erro
  const [refreshTick, setRefreshTick] = useState(0);

  const fileInputRef = useRef(null);

  function escolherArquivo(ev) {
    const f = ev.target.files?.[0];
    if (!f) return;
    if (f.size > TAMANHO_MAX_KB * 1024) {
      setStatus({ tipo: "erro", msg: `Arquivo > ${TAMANHO_MAX_KB} KB (atual: ${(f.size/1024).toFixed(0)} KB)` });
      ev.target.value = "";
      return;
    }
    setArquivo(f);
    setStatus({ tipo: "idle", msg: "" });
    const url = URL.createObjectURL(f);
    setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
  }

  function limpar() {
    setArquivo(null);
    setStatus({ tipo: "idle", msg: "" });
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function enviar() {
    if (!endereco) { setStatus({ tipo: "erro", msg: "Conecte-se primeiro." }); return; }
    if (!arquivo)  { setStatus({ tipo: "erro", msg: "Escolha um arquivo de imagem." }); return; }
    if (typeof getAuthToken !== "function") {
      setStatus({ tipo: "erro", msg: "Auth indisponível (getAuthToken não injetado)." }); return;
    }
    if (premium) {
      const v = Number(valorPremium);
      if (!Number.isInteger(v) || v <= 0) {
        setStatus({ tipo: "erro", msg: "Premium: valor em centavos inválido." }); return;
      }
    }
    setStatus({ tipo: "enviando", msg: "Preparando…" });
    try {
      const imagemBase64 = await fileToBase64(arquivo);
      const token = await getAuthToken();
      setStatus({ tipo: "enviando", msg: "Enviando…" });
      const resp = await fetch("/.netlify/functions/banners", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          cliente_id:   endereco,
          dimensao,
          imagemBase64,
          mime:         arquivo.type || "image/png",
          premium,
          valorCentavos: premium ? Number(valorPremium) : undefined,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setStatus({ tipo: "erro", msg: data?.error?.message || `HTTP ${resp.status}` });
        return;
      }
      setStatus({ tipo: "ok", msg: `✓ Enviado (status: ${data.status})` });
      setRefreshTick((n) => n + 1);
      limpar();
    } catch (err) {
      setStatus({ tipo: "erro", msg: err?.message || "falha desconhecida" });
    }
  }

  const info = DIMENSAO_INFO[dimensao];

  return (
    <section
      aria-label="Painel de upload de banner"
      style={{
        background: "linear-gradient(155deg, rgba(245,166,35,0.06) 0%, rgba(8,30,64,0.85) 100%)",
        border: `1px solid ${COR.border}`,
        borderRadius: "14px",
        padding: isMobile ? "1rem" : "1.25rem",
        display: "flex", flexDirection: "column", gap: "0.75rem",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "1.4rem" }} aria-hidden="true">🖼️</span>
        <div>
          <h3 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 800, color: COR.primary, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Meus Banners
          </h3>
          <p style={{ margin: 0, fontSize: "0.65rem", color: COR.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Auto-gerado · upload manual · premium (§6 da spec)
          </p>
        </div>
      </header>

      {/* Preview do banner atual (auto-gerado se não houver upload) */}
      <div>
        <h4 style={{ margin: "0 0 0.4rem", fontSize: "0.72rem", color: COR.muted, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Banner atual ({info.label} {info.largura}×{info.altura})
        </h4>
        <BannerCard key={`${dimensao}-${refreshTick}`} clienteId={endereco} formato={dimensao} mostrarFonte />
      </div>

      {/* Seletor de dimensão */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.72rem", color: COR.muted, fontWeight: 700 }}>Formato:</span>
        {["app", "site"].map((k) => (
          <Button
            key={k}
            variant="ghost" size="sm"
            onClick={() => setDimensao(k)}
            aria-pressed={dimensao === k}
            className={dimensao === k ? "!border-[#f5a623] !bg-[#f5a623]/[0.15] !text-[#f5a623] rounded-full" : "rounded-full text-[#94a3b8]"}
          >{DIMENSAO_INFO[k].label} ({DIMENSAO_INFO[k].largura}×{DIMENSAO_INFO[k].altura})</Button>
        ))}
      </div>

      {/* Upload */}
      <div style={{
        padding: "0.85rem",
        background: "rgba(5,15,40,0.5)",
        border: "1px dashed rgba(255,255,255,0.12)",
        borderRadius: "10px",
        display: "flex", flexDirection: "column", gap: "0.6rem",
      }}>
        <input
          ref={fileInputRef}
          type="file"
          accept={MIMES_ACEITOS}
          onChange={escolherArquivo}
          aria-label="Selecionar arquivo de banner"
          style={{ fontSize: "0.78rem", color: COR.text }}
        />
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Pré-visualização do banner escolhido"
            style={{
              maxWidth: "100%",
              maxHeight: "180px",
              objectFit: "contain",
              borderRadius: "8px",
              border: `1px solid ${COR.border}`,
            }}
          />
        )}

        {/* Premium toggle */}
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem", color: COR.text, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={premium}
            onChange={(e) => setPremium(e.target.checked)}
            aria-label="Solicitar arte premium (debita Wallet)"
          />
          <span>⭐ Premium (debita R$ da Wallet)</span>
        </label>
        {premium && (
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.74rem", color: COR.muted }}>
            <span>Valor (centavos):</span>
            <input
              type="number" min="100" step="100"
              value={valorPremium}
              onChange={(e) => setValorPremium(e.target.value)}
              aria-label="Valor do premium em centavos"
              style={{
                width: "100px", padding: "0.3rem 0.5rem",
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px", color: COR.text, fontSize: "0.78rem",
              }}
            />
            <span style={{ color: COR.muted }}>≈ R$ {(Number(valorPremium)/100).toFixed(2)}</span>
          </label>
        )}

        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <Button variant="primary" size="md" type="button" onClick={enviar}
            disabled={!arquivo || status.tipo === "enviando" || !endereco}
            className="flex-1">
            {status.tipo === "enviando" ? "⏳ Enviando…" : "📤 Enviar banner"}
          </Button>
          {arquivo && (
            <Button variant="ghost" size="md" type="button" onClick={limpar}
              aria-label="Limpar seleção de arquivo"
              className="!border-white/15 !text-[#94a3b8]">
              Limpar
            </Button>
          )}
        </div>

        {status.tipo === "ok" && (
          <p style={{ margin: 0, color: COR.success, fontSize: "0.78rem" }}>{status.msg}</p>
        )}
        {status.tipo === "erro" && (
          <p role="alert" style={{ margin: 0, color: COR.danger, fontSize: "0.78rem" }}>{status.msg}</p>
        )}
        {!endereco && (
          <p style={{ margin: 0, color: COR.muted, fontSize: "0.72rem" }}>
            Conecte-se com Privy para enviar.
          </p>
        )}
      </div>

      <p style={{ margin: 0, fontSize: "0.68rem", color: COR.muted, lineHeight: 1.5 }}>
        Sem upload, exibimos um banner auto-gerado com base no seu endereço (REQ-22).
        Upload pelo cliente entra como <strong>pendente</strong> até aprovação Admin.
        Premium debita Wallet (REQ-23).
      </p>
    </section>
  );
}
