// BannerCard — exibe o banner do cliente (REQ-22).
//
// Consome /.netlify/functions/banners?cliente_id=...&formato=app|site.
// Se houver upload, exibe; senão, mostra o template SVG auto-gerado pelo backend.
// Animação sutil de fade-in ao montar.
// MC23.3 — containers de estado migrados para GlassCard.

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui";

const COR = {
  border: "rgba(245,166,35,0.25)",
  muted:  "#94a3b8",
  danger: "#ef4444",
};

const DIMENSOES = {
  app:  { aspect: 800 / 200, alt: "Banner App (800×200)" },
  site: { aspect: 1200 / 300, alt: "Banner Site (1200×300)" },
};

export default function BannerCard({ clienteId, formato = "app", style = {}, mostrarFonte = false }) {
  const [estado, setEstado] = useState({ status: "idle", svg: null, fonte: null, erro: null });

  useEffect(() => {
    if (!clienteId) {
      setEstado({ status: "idle", svg: null, fonte: null, erro: null });
      return;
    }
    let cancelado = false;
    setEstado((s) => ({ ...s, status: "loading", erro: null }));
    fetch(`/.netlify/functions/banners?cliente_id=${encodeURIComponent(clienteId)}&formato=${formato}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (!cancelado) setEstado({
          status: "ok",
          svg:    data.svg ?? null,
          imagemBase64: data.imagemBase64 ?? null,
          mime:   data.mime ?? null,
          fonte:  data.fonte ?? null,
          erro:   null,
        });
      })
      .catch((err) => {
        if (!cancelado) setEstado({ status: "error", svg: null, fonte: null, erro: err?.message || "falha" });
      });
    return () => { cancelado = true; };
  }, [clienteId, formato]);

  const aspect = DIMENSOES[formato]?.aspect || DIMENSOES.app.aspect;
  const alt    = DIMENSOES[formato]?.alt || "Banner";

  if (!clienteId) {
    return (
      <GlassCard
        role="status"
        className="!rounded-xl flex items-center justify-center text-[#94a3b8] text-xs"
        style={{
          aspectRatio: String(aspect),
          borderStyle: "dashed",
          borderColor: COR.border,
          background: "rgba(5,15,40,0.55)",
          ...style,
        }}
      >
        Faça login para ver o banner do cliente.
      </GlassCard>
    );
  }

  if (estado.status === "loading") {
    return (
      <GlassCard
        role="status" aria-live="polite"
        className="!rounded-xl flex items-center justify-center text-[#94a3b8] animate-pulse"
        style={{
          aspectRatio: String(aspect),
          borderColor: COR.border,
          background: "rgba(5,15,40,0.45)",
          animation: "gut-pulse-banner 1.4s ease-in-out infinite",
          ...style,
        }}
      >
        ⏳ Carregando banner…
        <style>{`@keyframes gut-pulse-banner { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }`}</style>
      </GlassCard>
    );
  }

  if (estado.status === "error") {
    return (
      <GlassCard
        role="alert"
        className="!rounded-xl flex items-center justify-center text-[#ef4444] text-xs"
        style={{
          aspectRatio: String(aspect),
          borderColor: "rgba(239,68,68,0.35)",
          background: "rgba(239,68,68,0.06)",
          ...style,
        }}
      >
        ✗ Não foi possível carregar o banner ({estado.erro})
      </GlassCard>
    );
  }

  // Renderização: SVG inline OU imagem binária base64.
  const conteudo = estado.svg
    ? <div dangerouslySetInnerHTML={{ __html: estado.svg }} style={{ width: "100%", height: "100%" }} />
    : estado.imagemBase64
    ? <img src={`data:${estado.mime || "image/png"};base64,${estado.imagemBase64}`} alt={alt}
           style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    : null;

  return (
    <GlassCard
      as="figure"
      role="img" aria-label={alt}
      className="!rounded-xl !p-0 overflow-hidden"
      style={{
        margin: 0,
        aspectRatio: String(aspect),
        borderColor: COR.border,
        animation: "gut-fade-in-banner 0.35s ease-out both",
        ...style,
      }}
    >
      <style>{`@keyframes gut-fade-in-banner { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }`}</style>
      {conteudo}
      {mostrarFonte && estado.fonte && (
        <figcaption style={{
          position: "relative", marginTop: "-22px", padding: "2px 6px",
          background: "rgba(0,0,0,0.55)", color: "#cbd5e1", fontSize: "0.62rem",
          display: "inline-block", borderRadius: "0 0 6px 0",
        }}>fonte: {estado.fonte}</figcaption>
      )}
    </GlassCard>
  );
}
