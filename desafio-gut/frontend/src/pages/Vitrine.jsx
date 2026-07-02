// Vitrine — 4 slots de categoria conforme Especificação Refatorada §2 e §3.2.
//
// REQ-13 (Desktop): grid de 4 slots simultaneamente visíveis.
// REQ-14 (Mobile <768px): Slot 1 (Diamante) e Slot 2 (Ouro) sticky no topo.
// REQ-15 (Mobile <768px): Slot 3 (Prata) e Slot 4 (Bronze) empilhados na vertical
//   (MC42: carrossel horizontal removido — a página passa a ter scroll único vertical).
//
// Esta rota COEXISTE com /mercado (página atual de leilão R-1 preservada).
// Cada SlotCard hoje é vitrine informativa + CTA → /mercado. O backend de
// cotas (Wallet, voucher, estado vendido/disponível) é implementado em ondas
// posteriores; aqui ficam os dados estáticos da spec.

import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useAppContext, useAppTimer } from "../context/AppContext.jsx";
import GutoAvatar from "../components/GutoAvatar.jsx";
import { GlassCard } from "@/components/ui";
import { imagemProdutoSrc } from "../lib/imagem.js";
import { tiersAgoraVisiveis, tierAtivoAgora } from "../data/programacao-junho-2026.js";
import { apiGet } from "../lib/api.js";

// MC11.3 — Header dual da Vitrine. Renderizado SOMENTE quando
// tipoUsuario === "corporativo": dá ao lojista um resumo da cota ativa +
// atalho para /corporativo/analytics, mantendo abaixo a vitrine "cliente
// final" para ele ver o que o usuário comum enxerga.
function VitrineHeaderLojista({ cota, isMobile }) {
  const categoria = cota?.categoria || "—";
  const impressoes = cota?.impressoes != null ? cota.impressoes : "—";
  const cliques    = cota?.cliques    != null ? cota.cliques    : "—";
  const ctr        = cota?.ctr        != null ? `${cota.ctr.toFixed(1)}%` : "—";
  return (
    <GlassCard
      as="section"
      aria-label="Painel do Parceiro"
      className={`flex gap-3 ${isMobile ? 'flex-col items-start p-4' : 'flex-row items-center justify-between px-6 py-5'}`}
    >
      <div>
        <div style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.08em",
          color: "#00d4aa", textTransform: "uppercase",
        }}>
          🏢 Painel do Parceiro · Vitrine
        </div>
        <div style={{ marginTop: "0.35rem", fontSize: isMobile ? "0.92rem" : "1.02rem", color: "#e8f0fe", fontWeight: 700 }}>
          Cota <strong style={{ color: "#f5a623" }}>{categoria}</strong>
          {" "}· {impressoes} imp · {cliques} cliq · {ctr} CTR
        </div>
      </div>
      <Link
        to="/corporativo/analytics"
        style={{
          padding: "0.6rem 0.9rem",
          background: "linear-gradient(135deg,#00d4aa,#00a888)",
          color: "#0a0f1a", fontWeight: 800, fontSize: "0.8rem",
          textDecoration: "none", borderRadius: "10px",
          letterSpacing: "0.04em", whiteSpace: "nowrap",
        }}
      >
        Ver analytics completo →
      </Link>
    </GlassCard>
  );
}

const TZ_PADRAO = "America/Sao_Paulo";
function getTimezone() {
  return import.meta.env?.VITE_TIMEZONE || TZ_PADRAO;
}

const COR = {
  bg:      "#0a0f1a",
  surface: "rgba(8,30,64,0.82)",
  text:    "#e8f0fe",
  muted:   "#94a3b8",
  border:  "rgba(245,166,35,0.15)",
};

// Dados das categorias — fonte da verdade: docs/especificacao-extraida.md REQ-04..07
const SLOTS = [
  {
    id: "diamante",
    nome: "Diamante",
    posicao: 1,
    emoji: "💎",
    cor: "#00d4ff",
    corDim: "rgba(0,212,255,0.18)",
    corBorda: "rgba(0,212,255,0.45)",
    cotasDisponiveis: 1,
    exclusiva: true,
    valorContrato: "R$ 18.000,00",
    valorMinProduto: "R$ 4.500,00",
    beneficios: ["2 banners rotativos", "28 banners app", "10 bônus (vouchers VIP)"],
    tipoLeilao: "Programado · 24 h",
    rotuloSecao: "Slot fixo do topo",
  },
  {
    id: "ouro",
    nome: "Ouro",
    posicao: 2,
    emoji: "🥇",
    cor: "#f5a623",
    corDim: "rgba(245,166,35,0.18)",
    corBorda: "rgba(245,166,35,0.45)",
    cotasDisponiveis: 1,
    exclusiva: true,
    valorContrato: "R$ 11.000,00",
    valorMinProduto: "R$ 2.250,00",
    beneficios: ["2 banners rotativos", "20 banners app"],
    tipoLeilao: "Programado · 24 h",
    rotuloSecao: "Slot fixo do topo",
  },
  {
    id: "prata",
    nome: "Prata",
    posicao: 3,
    emoji: "🥈",
    cor: "#cbd5e1",
    corDim: "rgba(203,213,225,0.16)",
    corBorda: "rgba(203,213,225,0.40)",
    cotasDisponiveis: 81,
    exclusiva: true,
    valorContrato: "R$ 5.600,00",
    valorMinProduto: "R$ 1.350,00",
    beneficios: ["1 banner fixo", "12 banners app"],
    tipoLeilao: "Relâmpago · 30 min – 1 h",
    rotuloSecao: "Oportunidade Agora",
  },
  {
    id: "bronze",
    nome: "Bronze",
    posicao: 4,
    emoji: "🥉",
    cor: "#cd7f32",
    corDim: "rgba(205,127,50,0.18)",
    corBorda: "rgba(205,127,50,0.45)",
    cotasDisponiveis: 27,
    exclusiva: false,
    valorContrato: "R$ 2.640,00",
    valorMinProduto: "R$ 660,00",
    beneficios: ["1 banner vitrine", "8 banners app"],
    tipoLeilao: "Relâmpago · 30 min – 1 h",
    rotuloSecao: "Oportunidade Agora",
  },
];

function formatarTimer(segundosRestantes) {
  if (!Number.isFinite(segundosRestantes) || segundosRestantes <= 0) return null;
  const d = Math.floor(segundosRestantes / 86400);
  const h = Math.floor((segundosRestantes % 86400) / 3600);
  const m = Math.floor((segundosRestantes % 3600) / 60);
  const s = segundosRestantes % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

function SlotCard({ slot, isMobile, sticky, hrefOverride, status, timer, cotaInfo, bannerSvg, produtos, corporativo }) {
  const safeBannerSvg = bannerSvg
    ? DOMPurify.sanitize(bannerSvg, { USE_PROFILES: { svg: true } })
    : null;
  return (
    <GlassCard
      as="article"
      className={`flex flex-col gap-2.5 ${isMobile ? 'p-4' : 'p-5'} ${!isMobile ? 'min-h-[320px]' : ''}`}
      style={{
        // MC48 P4 — sticky removido: Diamante e Ouro (antes ambos sticky top:0.5rem
        // → sobrepunham-se ao rolar) passam a rolar normalmente, comportamento
        // consistente com os demais cards. O prop `sticky` fica inerte (decisão do operador).
        position: "relative",
        borderColor: slot.corBorda,
        boxShadow: `0 4px 18px rgba(0,0,0,0.35), 0 0 0 1px ${slot.corDim}`,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* MC48 P3 — ícone do plano = emoji do tier (sem foto do GUTO). */}
          <div aria-hidden="true" style={{
            width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "50%", background: slot.corDim, border: `1px solid ${slot.corBorda}`,
            fontSize: isMobile ? "0.95rem" : "1.05rem", lineHeight: 1,
          }}>{slot.emoji}</div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: isMobile ? "0.92rem" : "1.05rem",
              fontWeight: 800,
              color: slot.cor,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}>{slot.nome}</h3>
            <p style={{ margin: 0, fontSize: "0.65rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Slot {slot.posicao} · {slot.rotuloSecao}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
          <span style={{
            fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.08em",
            padding: "0.22rem 0.55rem", borderRadius: "999px",
            color: slot.cor, background: slot.corDim, border: `1px solid ${slot.corBorda}`,
            textTransform: "uppercase", whiteSpace: "nowrap",
          }}>
            {slot.exclusiva ? "Exclusiva" : "Não exclusiva"}
          </span>
          {status && (
            <span aria-label={status.ariaLabel} style={{
              fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.08em",
              padding: "0.18rem 0.5rem", borderRadius: "999px",
              color: status.cor,
              background: `${status.cor}1f`,
              border: `1px solid ${status.cor}55`,
              textTransform: "uppercase", whiteSpace: "nowrap",
            }}>
              {status.texto}
            </span>
          )}
          {timer?.display && (
            <span
              aria-label={`Tempo restante: ${timer.display}`}
              title="Tempo restante do leilão"
              style={{
                fontSize: "0.74rem", fontWeight: 900,
                fontFamily: "'JetBrains Mono', monospace",
                color: slot.cor, letterSpacing: "0.06em",
                padding: "0.12rem 0.5rem",
                background: "rgba(0,0,0,0.35)", borderRadius: "6px",
                border: `1px solid ${slot.corBorda}`,
              }}
            >⏱ {timer.display}</span>
          )}
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem 0.75rem" }}>
        <Info
          label="Cotas"
          value={cotaInfo?.atribuidas != null
            ? `${cotaInfo.atribuidas} de ${cotaInfo.total}`
            : `${slot.cotasDisponiveis}`}
        />
        <Info label="Tipo" value={slot.tipoLeilao} small />
        {/* MC39.3.1 (#8): "Contrato"/"Mín. produto" são dados internos do lojista —
            só visíveis ao perfil corporativo. O utilizador final vê Cotas + Tipo + benefícios. */}
        {corporativo && <Info label="Contrato" value={slot.valorContrato} />}
        {corporativo && <Info label="Mín. produto" value={slot.valorMinProduto} />}
      </div>

      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {slot.beneficios.map((b) => (
          <li key={b} style={{ fontSize: "0.72rem", color: COR.text, display: "flex", gap: "0.4rem", alignItems: "flex-start" }}>
            <span style={{ color: slot.cor, fontWeight: 800 }} aria-hidden="true">✦</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {/* MC12 — banner real para corporativo */}
      {safeBannerSvg && (
        <div
          aria-label="Banner publicitário do parceiro"
          style={{
            borderRadius: "8px", overflow: "hidden",
            border: `1px solid ${slot.corBorda}`,
            maxHeight: "100px",
          }}
          dangerouslySetInnerHTML={{ __html: safeBannerSvg }}
        />
      )}

      {/* MC15 ITEM 3 — produtos reais no slot */}
      {produtos && produtos.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.25rem" }}>
          {produtos.slice(0, 3).map((p) => (
            <Link
              key={p.id}
              to={`/produto/${p.id}`}
              style={{
                display: "flex", alignItems: "center", gap: "0.6rem",
                padding: "0.5rem 0.6rem",
                background: "rgba(13,18,53,0.25)",
                border: `1px solid ${slot.corBorda}55`,
                borderRadius: "10px",
                textDecoration: "none",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = slot.cor; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${slot.cor}55`; }}
            >
              <div style={{
                width: "40px", height: "40px", borderRadius: "8px", overflow: "hidden",
                flexShrink: 0, background: "rgba(0,0,0,0.3)",
                border: `1px solid ${slot.cor}33`,
              }}>
                {(p.imagemBase64 || p.imagem_url) ? (
                  <img
                    src={imagemProdutoSrc(p)}
                    alt={p.nome}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                ) : (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontSize: "1rem" }}>📦</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: COR.text, fontSize: "0.78rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.nome}
                </div>
                <div style={{ fontSize: "0.66rem", color: slot.cor, fontWeight: 800, marginTop: "0.1rem" }}>
                  R$ {(p.preco / 100).toFixed(2)}
                </div>
              </div>
              {/* MC48 P3 — emoji do tier no lugar do recorte do GUTO. */}
              <div aria-hidden="true" style={{
                width: 24, height: 24, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "50%", background: slot.corDim, border: `1px solid ${slot.corBorda}`,
                fontSize: "0.85rem", lineHeight: 1,
              }}>{slot.emoji}</div>
            </Link>
          ))}
          {produtos.length > 3 && (
            <p style={{ margin: 0, fontSize: "0.64rem", color: COR.muted, textAlign: "center" }}>
              +{produtos.length - 3} produto{produtos.length - 3 > 1 ? "s" : ""} neste slot
            </p>
          )}
        </div>
      )}

      <Link
        to={hrefOverride ?? `/vitrine/${slot.id}`}
        style={{
          marginTop: "auto",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          padding: "0.6rem 0.9rem",
          background: `linear-gradient(135deg, ${slot.cor}, ${slot.cor}cc)`,
          color: "#0f172a", fontWeight: 800, fontSize: "0.8rem",
          borderRadius: "10px", textDecoration: "none",
          letterSpacing: "0.04em",
          boxShadow: `0 4px 14px ${slot.corDim}`,
        }}
      >{hrefOverride ? "Ir para o leilão →" : "Ver detalhes →"}</Link>
    </GlassCard>
  );
}

function Info({ label, value, small }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: "0.58rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>{label}</p>
      <p style={{ margin: 0, fontSize: small ? "0.72rem" : "0.82rem", color: COR.text, fontWeight: 700 }}>{value}</p>
    </div>
  );
}

function VitrineDetalhe({ slot, isMobile, corporativo }) {
  return (
    <div style={{ padding: isMobile ? "1rem" : "1.5rem 2rem", color: "#e8f0fe", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <nav aria-label="Trilha de navegação" style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
        <Link to="/vitrine" style={{ color: "#f5a623", textDecoration: "none", fontWeight: 600 }}>← Voltar à Vitrine</Link>
      </nav>

      <header>
        <h1 style={{
          margin: 0,
          fontSize: isMobile ? "1.4rem" : "1.8rem",
          fontWeight: 900,
          color: slot.cor,
          fontFamily: "'Orbitron', sans-serif",
          letterSpacing: "0.05em",
        }}>{slot.emoji} Slot {slot.posicao} — {slot.nome}</h1>
        <p style={{ margin: "0.25rem 0 0", fontSize: isMobile ? "0.78rem" : "0.86rem", color: "#94a3b8", lineHeight: 1.5 }}>
          {slot.rotuloSecao} · {slot.tipoLeilao}
        </p>
      </header>

      <section style={{
        background: "linear-gradient(155deg, rgba(5,15,40,0.92) 0%, rgba(8,30,64,0.85) 100%)",
        border: `1px solid ${slot.corBorda}`,
        borderRadius: "16px",
        padding: isMobile ? "1.25rem" : "1.75rem",
        display: "flex", flexDirection: "column", gap: "1rem",
        boxShadow: `0 4px 18px rgba(0,0,0,0.35), 0 0 0 1px ${slot.corDim}`,
      }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: "0.75rem" }}>
          <Info label="Cotas disponíveis" value={`${slot.cotasDisponiveis}`} />
          <Info label="Exclusividade" value={slot.exclusiva ? "Sim" : "Não"} small />
          {/* MC39.3.1 (#8): dados internos do lojista — só perfil corporativo. */}
          {corporativo && <Info label="Valor de contrato" value={slot.valorContrato} />}
          {corporativo && <Info label="Valor mín. produto" value={slot.valorMinProduto} />}
        </div>

        <div>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", fontWeight: 800, color: slot.cor, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Benefícios de visibilidade
          </h2>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {slot.beneficios.map((b) => (
              <li key={b} style={{ fontSize: "0.84rem", color: "#e8f0fe", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <span style={{ color: slot.cor, fontWeight: 800 }} aria-hidden="true">✦</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={{
          padding: "0.85rem 1rem",
          background: "rgba(13,18,53,0.25)",
          borderRadius: "10px",
          border: "1px dashed rgba(255,255,255,0.1)",
          fontSize: "0.78rem", color: "#94a3b8", lineHeight: 1.5,
        }}>
          ⚠ <strong style={{ color: "#fbbf24" }}>Aviso</strong>: o sistema de cotas Diamante/Ouro/Prata/Bronze
          ainda não está ativo no contrato. O CTA abaixo leva ao leilão atual
          em produção (Edição R-1) — quando os 4 leilões paralelos da spec
          forem implementados, cada slot terá seu próprio destino.
        </div>

        <Link
          to="/mercado"
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            padding: "0.85rem 1rem",
            background: `linear-gradient(135deg, ${slot.cor}, ${slot.cor}cc)`,
            color: "#0f172a", fontWeight: 800, fontSize: "0.92rem",
            borderRadius: "12px", textDecoration: "none",
            letterSpacing: "0.04em",
            boxShadow: `0 4px 14px ${slot.corDim}`,
          }}
        >Ir para o leilão atual (R-1) →</Link>
      </section>
    </div>
  );
}

function statusDoSlot(slotId, visibilidade, tz) {
  if (!visibilidade.tiers.includes(slotId)) {
    return { texto: "Oculto · regra §8", cor: "#6b7280", ariaLabel: "Tier oculto pela regra de domingo" };
  }
  const ativo = tierAtivoAgora(slotId, tz);
  if (ativo) {
    if (slotId === "diamante" || slotId === "ouro") {
      return { texto: "● Programado 24h", cor: "#10b981", ariaLabel: "Leilão programado ativo agora" };
    }
    return { texto: "● Ao vivo agora", cor: "#10b981", ariaLabel: "Leilão ativo agora" };
  }
  return { texto: "Agendado", cor: "#94a3b8", ariaLabel: "Sem leilão ativo no horário atual" };
}

export default function Vitrine() {
  const isMobile = useIsMobile();
  const { slot: slotId } = useParams();
  const tz = getTimezone();
  // MC12 — vitrine dual: tipoUsuario + addressCorporativo para banners reais.
  // MC15.4 — edicoes (mapa multi-edição) para cronómetro por slot.
  const {
    prazoFlash, prazoProgramado, tipoUsuario, cotaCorporativa, addressCorporativo,
    edicoes,
  } = useAppContext();
  // MC44 P0 — timer via contexto isolado.
  const { edicoesTick, timeLeftEdicaoSegundos } = useAppTimer();

  // MC12 — banners reais para usuário corporativo (app + site).
  const [bannerData, setBannerData] = useState({ app: null, site: null });
  useEffect(() => {
    if (tipoUsuario !== "corporativo" || !addressCorporativo) {
      setBannerData({ app: null, site: null });
      return;
    }
    let cancel = false;
    Promise.all([
      apiGet(`banners?cliente_id=${encodeURIComponent(addressCorporativo)}&formato=app`),
      apiGet(`banners?cliente_id=${encodeURIComponent(addressCorporativo)}&formato=site`),
    ])
      .then(([rApp, rSite]) => {
        if (cancel) return;
        const app  = rApp.ok  ? rApp.data  : null;
        const site = rSite.ok ? rSite.data : null;
        setBannerData({ app, site });
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, [tipoUsuario, addressCorporativo]);

  // Tick a cada 1s para atualizar timers visíveis nos cards (Onda 5 FASE 0).
  // Cálculo é absoluto: `prazo - now`, então não acumula drift.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Cotas reais por categoria (M-16). Buscamos o resumo agregado uma vez.
  const [resumoCotas, setResumoCotas] = useState(null);
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const { ok, data } = await apiGet("cotas");
        if (!cancelado && ok && data) setResumoCotas(data.resumo || null);
      } catch { /* silencioso (igual ao .catch anterior) */ }
    })();
    return () => { cancelado = true; };
  }, []);

  // MC15 ITEM 3 — produtos reais por slot
  const [produtosPorCat, setProdutosPorCat] = useState({});
  useEffect(() => {
    let cancelado = false;
    Promise.all(
      SLOTS.map((s) =>
        apiGet(`produtos?categoria=${s.id}`)
          .then((r) => (r.ok ? r.data : null))
          .catch(() => null)
      )
    ).then((results) => {
      if (cancelado) return;
      const map = {};
      results.forEach((data, i) => {
        map[SLOTS[i].id] = data?.produtos || [];
      });
      setProdutosPorCat(map);
    });
    return () => { cancelado = true; };
  }, []);

  // Rota /vitrine/:slot — exibe detalhe do slot.
  if (slotId) {
    const slot = SLOTS.find((s) => s.id === slotId);
    if (!slot) return <Navigate to="/vitrine" replace />;
    return <VitrineDetalhe slot={slot} isMobile={isMobile} corporativo={tipoUsuario === "corporativo"} />;
  }

  // Regra §8: domingos ocultam Bronze e Ouro.
  const visibilidade = tiersAgoraVisiveis(tz);
  const slotsVisiveis = SLOTS.filter((s) => visibilidade.tiers.includes(s.id));

  // Rota /vitrine — lista os slots visíveis hoje.
  const sticky   = slotsVisiveis.filter((s) => s.posicao <= 2);   // Diamante + Ouro
  const carossel = slotsVisiveis.filter((s) => s.posicao > 2);    // Prata + Bronze

  const slotStatusMap = Object.fromEntries(
    SLOTS.map((s) => [s.id, statusDoSlot(s.id, visibilidade, tz)])
  );

  // Resumo de cotas atribuídas vs total declarado por cada slot (M-16).
  const slotCotasMap = Object.fromEntries(SLOTS.map((s) => {
    const atribuidas = resumoCotas?.[s.id]?.total_atribuidas ?? null;
    return [s.id, { atribuidas, total: s.cotasDisponiveis }];
  }));

  // MC15.4 ITEM 8 — Timer por slot ligado às edições.
  // Diamante/Ouro → edição "programado"; Prata/Bronze → edição "relampago".
  // Procura a 1ª edição ABERTA do tipo correspondente em `edicoes`; o tempo é
  // DERIVADO de termino_em (server-authoritative, imune a F5/login). Sem edição
  // aberta correspondente → sem timer → badge "Agendado" via statusDoSlot.
  // `edicoesTick` é lido só para re-render a cada segundo (cálculo é absoluto).
  void edicoesTick;
  const agora = Math.floor(Date.now() / 1000);
  const edicoesAbertas = Object.values(edicoes || {}).filter(
    (e) => e && e.status === "aberto"
  );
  function primeiraEdicaoAberta(tipo) {
    return edicoesAbertas.find((e) => e.tipo === tipo) || null;
  }
  const slotTimerMap = Object.fromEntries(SLOTS.map((s) => {
    const ativo = visibilidade.tiers.includes(s.id) && tierAtivoAgora(s.id, tz);
    if (!ativo) return [s.id, { display: null }];
    const tipoEdicao = (s.id === "diamante" || s.id === "ouro") ? "programado" : "relampago";
    const edicao = primeiraEdicaoAberta(tipoEdicao);
    if (edicao) {
      const restante = timeLeftEdicaoSegundos(edicao);
      if (restante <= 0) return [s.id, { display: null }];
      return [s.id, { display: formatarTimer(restante) }];
    }
    // Fallback de compat (R-1 sob vite puro): prazos legados em segundos.
    const prazo = tipoEdicao === "programado" ? prazoProgramado : prazoFlash;
    const restante = Math.max(0, prazo - agora);
    return [s.id, { display: formatarTimer(restante) }];
  }));

  return (
    <div style={{ padding: isMobile ? "1rem" : "1.5rem 2rem", color: COR.text, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {tipoUsuario === "corporativo" && (
        <VitrineHeaderLojista cota={cotaCorporativa} isMobile={isMobile} />
      )}
      <div style={{ textAlign: "center", marginBottom: isMobile ? "1rem" : "1.5rem" }}>
        <GutoAvatar custom="vitrine-header-confiante" size={isMobile ? 32 : 48} animate={false} />
        <h1 style={{
          margin: "0.5rem 0 0.25rem",
          fontSize: isMobile ? "1.35rem" : "1.75rem",
          fontWeight: 900,
          color: "#f5a623",
          fontFamily: "'Orbitron', sans-serif",
          letterSpacing: "0.05em",
        }}>Vitrine — Slots por Categoria</h1>
        <p style={{ margin: 0, fontSize: isMobile ? "0.78rem" : "0.86rem", color: COR.muted, lineHeight: 1.5 }}>
          Quatro slots paralelos da Especificação Refatorada §2 e §3.2.
          Diamante e Ouro são <strong style={{ color: "#f5a623" }}>fixos no topo</strong>;
          Prata e Bronze rodam em <strong style={{ color: "#f5a623" }}>Oportunidade Agora</strong>.
        </p>
        {visibilidade.regra === "sunday" && (
          <div style={{
            marginTop: "0.5rem",
            padding: "0.6rem 0.85rem",
            background: "rgba(0,212,255,0.06)",
            border: "1px solid rgba(0,212,255,0.3)",
            borderRadius: "10px",
            fontSize: "0.78rem", color: COR.text, lineHeight: 1.5,
          }}>
            <strong style={{ color: "#00d4ff" }}>💎 Domingo exclusivo (§8 da spec):</strong>{" "}
            Bronze e Ouro ocultos; apenas Diamante fixo + Prata (repetições) visíveis.
          </div>
        )}
      </div>

      {/* ── Destaques sempre visíveis (sticky em mobile, primeiras 2 colunas em desktop) ── */}
      <section
        aria-label="Destaques fixos no topo"
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: "1rem",
        }}
      >
        {sticky.map((slot) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            isMobile={isMobile}
            sticky={isMobile}
            status={slotStatusMap[slot.id]}
            timer={slotTimerMap[slot.id]}
            cotaInfo={slotCotasMap[slot.id]}
            produtos={produtosPorCat[slot.id] || []}
            corporativo={tipoUsuario === "corporativo"}
            bannerSvg={tipoUsuario === "corporativo"
              ? (slot.id === "diamante" || slot.id === "ouro"
                  ? bannerData.site?.svg ?? null
                  : bannerData.app?.svg ?? null)
              : null}
          />
        ))}
      </section>

      {/* ── Oportunidade Agora ── */}
      <section aria-label="Oportunidade Agora — Prata e Bronze">
        <div style={{ textAlign: "center", marginBottom: isMobile ? "0.75rem" : "1rem" }}>
          <h2 style={{
            margin: 0,
            fontSize: isMobile ? "0.85rem" : "0.95rem",
            fontWeight: 800,
            color: COR.text,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}>⚡ Oportunidade Agora</h2>
        </div>

        {isMobile ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {carossel.map((slot) => (
              <div key={slot.id}>
                <SlotCard
                  slot={slot}
                  isMobile={isMobile}
                  sticky={false}
                  status={slotStatusMap[slot.id]}
                  timer={slotTimerMap[slot.id]}
                  cotaInfo={slotCotasMap[slot.id]}
                  produtos={produtosPorCat[slot.id] || []}
                  corporativo={tipoUsuario === "corporativo"}
                  bannerSvg={tipoUsuario === "corporativo" ? (bannerData.app?.svg ?? null) : null}
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {carossel.map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                isMobile={isMobile}
                sticky={false}
                status={slotStatusMap[slot.id]}
                timer={slotTimerMap[slot.id]}
                cotaInfo={slotCotasMap[slot.id]}
                produtos={produtosPorCat[slot.id] || []}
                corporativo={tipoUsuario === "corporativo"}
                bannerSvg={tipoUsuario === "corporativo" ? (bannerData.app?.svg ?? null) : null}
              />
            ))}
          </div>
        )}
      </section>

      <footer style={{ marginTop: "0.5rem", fontSize: "0.7rem", color: COR.muted, lineHeight: 1.5 }}>
        Vitrine em modo informativo · Pipeline de lance em <code style={{ color: "#f5a623" }}>/mercado</code> (Edição R-1, validada em produção).
      </footer>
    </div>
  );
}
