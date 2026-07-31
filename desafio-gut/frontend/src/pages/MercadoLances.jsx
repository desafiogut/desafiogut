import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import Confetti from "../components/Confetti.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useLanceFeedback } from "../hooks/useLanceFeedback.js";
import CardLance from "../components/CardLance.jsx";
import LanceStatusBadge from "../components/LanceStatusBadge.jsx";
import TabelaLances from "../components/TabelaLances.jsx";
import BannerCard from "../components/BannerCard.jsx";
import { GlassCard } from "@/components/ui";
import GlassHeader from "../components/glass/GlassHeader.jsx";
import { COR } from "../components/glass/glassTokens.js";
import { useRecursosApp } from "../hooks/useRecursosApp.js";
import { apiGet } from "../lib/api.js";

// REQ-01: descobre o cliente cujo leilão está ativo no momento, conforme
// a categoria correspondente ao tipoLeilao atual. Sem cota cadastrada:
// retorna null e o banner não é exibido.
const CATEGORIAS_POR_TIPO = {
  flash:      ["bronze", "prata"],   // relâmpago
  programado: ["diamante", "ouro"],  // 24h fixo
};
async function buscarClienteDoLeilaoAtivo(tipo) {
  const cats = CATEGORIAS_POR_TIPO[tipo] || [];
  for (const cat of cats) {
    try {
      const { ok, data } = await apiGet(`cotas?categoria=${cat}`);
      if (!ok) continue;
      const cotas = Array.isArray(data?.cotas) ? data.cotas : [];
      const ativa = cotas.find((c) => c?.disponivel || c?.vendida);
      if (ativa?.cliente_id) return { cliente_id: ativa.cliente_id, categoria: cat, nome: ativa.cliente_nome };
    } catch {}
  }
  return null;
}

// MC66 — COR migrado para components/glass/glassTokens.js (fonte única, compartilhada
// com os subcomponentes do Glass). Importado no topo.

function CountdownOverlay() {
  const [texto, setTexto] = useState("3");
  useEffect(() => {
    const seq = ["3", "2", "1", "VAI! ⚡"];
    let idx = 0;
    const id = setInterval(() => {
      idx += 1;
      if (idx < seq.length) setTexto(seq[idx]);
    }, 800);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <style>{`
        @keyframes gut-countdown-pop {
          from { transform: scale(1.7); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
      <div style={{
        position: "fixed", inset: 0, zIndex: 10002,
        background: "rgba(0,0,0,0.88)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
      }}>
        <div
          key={texto}
          style={{
            fontSize: "clamp(5rem, 18vw, 11rem)",
            fontWeight: "900",
            color: texto.startsWith("VAI") ? "#10b981" : "#fbbf24",
            textShadow: texto.startsWith("VAI")
              ? "0 0 40px #10b981, 0 0 80px #059669"
              : "0 0 40px #fbbf24, 0 0 80px #f59e0b",
            animation: "gut-countdown-pop 0.45s ease-out both",
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          {texto}
        </div>
      </div>
    </>
  );
}

function OverlayVencedor({ vencedor, tipoLeilao, onNovaRodada, EDICAO_ATIVA, isMobile }) {
  const enderecoAbrev = vencedor
    ? `${vencedor.endereco.slice(0, 10)}...${vencedor.endereco.slice(-6)}`
    : "—";
  const valorFmt = vencedor ? `R$ ${(vencedor.valor / 100).toFixed(2)}` : "—";

  return (
    <>
      <Confetti />
      <style>{`
        @keyframes gut-gold-pulse {
          0%,100% { box-shadow: 0 0 30px 8px #fbbf24, 0 0 70px 20px #f59e0b55; }
          50%      { box-shadow: 0 0 55px 18px #fbbf24, 0 0 110px 40px #f59e0b77; }
        }
        @keyframes gut-slide-up-modal {
          from { transform: translateY(60px) scale(0.92); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
      <div style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(0,0,0,0.90)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
        overflow: "hidden",
      }}>
        <div onClick={(e) => e.stopPropagation()} style={{
          background: "linear-gradient(135deg,#0a1628 0%,#0f172a 60%)",
          border: "2px solid #fbbf24", borderRadius: "20px",
          padding: isMobile ? "1.75rem 1.25rem" : "2.5rem 2rem",
          maxWidth: "480px", width: "100%",
          textAlign: "center", color: "#e8f0fe",
          animation: "gut-gold-pulse 2s ease-in-out infinite, gut-slide-up-modal 0.5s ease-out both",
        }}>
          <div style={{ fontSize: isMobile ? "2.75rem" : "3.5rem", lineHeight: 1 }}>🏆</div>
          <h2 style={{
            margin: "0.75rem 0 0.25rem",
            fontSize: isMobile ? "1.4rem" : "1.8rem",
            fontWeight: "900",
            color: "#fbbf24", letterSpacing: "0.04em",
            textShadow: "0 0 20px #fbbf24",
          }}>LEILÃO ENCERRADO</h2>
          <p style={{ margin: "0 0 1.25rem", color: "#94a3b8", fontSize: isMobile ? "0.78rem" : "0.9rem", lineHeight: 1.5 }}>
            <strong style={{ color: COR.gold }}>DesafioGUT</strong>
            {" · Edição "}<strong style={{ color: COR.gold }}>{EDICAO_ATIVA}</strong>
            {" · "}{tipoLeilao === "flash" ? "⚡ Relâmpago" : "🎫 Programado"}
          </p>
          {vencedor ? (
            <div style={{
              background: "#0a1e38", border: `1px solid ${COR.gold}`,
              borderRadius: "12px", padding: isMobile ? "1rem" : "1.25rem",
              marginBottom: "1.25rem",
            }}>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.72rem", color: "#6b7db8",
                textTransform: "uppercase", letterSpacing: "0.08em" }}>Carteira Vencedora</p>
              <p style={{ margin: "0 0 0.75rem", fontFamily: "monospace",
                fontSize: isMobile ? "0.85rem" : "0.95rem", color: "#e8f0fe", wordBreak: "break-all" }}>
                {enderecoAbrev}
              </p>
              <p style={{ margin: 0, fontSize: isMobile ? "1.7rem" : "2rem", fontWeight: "900",
                color: "#fbbf24", textShadow: "0 0 12px #fbbf24" }}>{valorFmt}</p>
            </div>
          ) : (
            <div style={{ padding: "1.25rem", color: "#6b7db8", marginBottom: "1.25rem" }}>
              Nenhum lance único registrado.
            </div>
          )}
          <button
            onClick={onNovaRodada}
            style={{
              width: "100%", padding: "0.85rem", borderRadius: "10px", border: "none",
              background: "#fbbf24", color: "#0f172a", fontWeight: "800",
              fontSize: "1rem", cursor: "pointer",
            }}
          >🔄 Nova Rodada</button>
        </div>
      </div>
    </>
  );
}

export default function MercadoLances() {
  const isMobile = useIsMobile();
  const {
    EDICAO_ATIVA,
    tipoLeilao, setTipoLeilao,
    lances,
    prazoTimestamp, encerrado, showOverlay,
    address, isConnected, userLabel, ready,
    vencedor,
    showCountdown,
    abrirModal, desconectar,
    handleLanceSucesso, handleNovaRodada,
  } = useAppContext();
  // MC66 (Direção C) — o cronômetro vivo foi removido da aba Lances ("EM BREVE"
  // permanente). useAppTimer/derivações de timer saíram junto. O Dashboard mantém
  // o seu próprio cronômetro (implementação separada), intocado.

  // MC29.1 — modelo de entrega híbrido transparente. No app das lojas
  // (isLeilaoAtivo=false) os componentes de leilão NÃO são montados; em seu
  // lugar uma vista de conformidade declara que o leilão está na versão Web.
  const { isLeilaoAtivo, isLoading: recursosCarregando } = useRecursosApp();

  // ── Feedback de lance em tempo real ──
  const [meuUltimoLance, setMeuUltimoLance] = useState(null); // { valor, edicao }
  const { status: lanceStatus, mudou: lanceMudou } = useLanceFeedback(
    meuUltimoLance?.edicao ?? null,
    meuUltimoLance?.valor ?? null
  );

  const onLanceSucessoWrapper = useCallback((info) => {
    setMeuUltimoLance({ valor: info.valorCentavos, edicao: EDICAO_ATIVA });
    handleLanceSucesso?.(info);
  }, [handleLanceSucesso, EDICAO_ATIVA]);

  // REQ-01: banner do cliente do leilão ativo.
  const [clienteAtivo, setClienteAtivo] = useState(null);
  useEffect(() => {
    let cancelado = false;
    buscarClienteDoLeilaoAtivo(tipoLeilao).then((c) => { if (!cancelado) setClienteAtivo(c); });
    return () => { cancelado = true; };
  }, [tipoLeilao]);

  // MC29.1 — gate de plataforma. Skeleton enquanto a config carrega (CLS=0);
  // vista de conformidade quando o leilão não está ativo nesta plataforma.
  // Os componentes de leilão (CardLance, TabelaLances, timers) ficam DESMONTADOS.
  if (recursosCarregando) return <MercadoSkeleton isMobile={isMobile} />;
  if (!isLeilaoAtivo)     return <MercadoConformidade isMobile={isMobile} />;

  return (
    <>
      {showCountdown && <CountdownOverlay />}

      {showOverlay && (
        <OverlayVencedor
          vencedor={vencedor}
          tipoLeilao={tipoLeilao}
          onNovaRodada={handleNovaRodada}
          EDICAO_ATIVA={EDICAO_ATIVA}
          isMobile={isMobile}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>

        {/* ── Cabeçalho (MC66 Direção C): GlassHeader compõe identidade+auth,
             HERO "EM BREVE" (foco) + seletor de modo, e o rodapé legal fino.
             Subcomponentes isolados em components/glass/. O cronômetro vivo foi
             removido (EM BREVE permanente). ── */}
        <GlassHeader
          isMobile={isMobile}
          isConnected={isConnected}
          ready={ready}
          address={address}
          userLabel={userLabel}
          onLogin={abrirModal}
          tipoLeilao={tipoLeilao}
          setTipoLeilao={setTipoLeilao}
          encerrado={encerrado}
          edicao={EDICAO_ATIVA}
        />

        {/* ── Banner do cliente do leilão ativo (REQ-01) ── */}
        {clienteAtivo?.cliente_id && (
          <div style={{
            padding: isMobile ? "0.75rem 1rem 0" : "1rem 2rem 0",
          }}>
            <BannerCard
              clienteId={clienteAtivo.cliente_id}
              formato={isMobile ? "app" : "site"}
              style={{ width: "100%" }}
            />
            {clienteAtivo.nome && (
              <p style={{
                margin: "0.4rem 0 0", fontSize: "0.72rem", color: COR.muted,
                textAlign: "center", letterSpacing: "0.04em",
              }}>
                Leilão {tipoLeilao === "flash" ? "⚡ Relâmpago" : "🎫 Programado"} ·
                cliente <strong style={{ color: COR.gold }}>{clienteAtivo.nome}</strong>
                {" "}({clienteAtivo.categoria})
              </p>
            )}
          </div>
        )}

        {/* ── Grid principal ── */}
        <main style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1.6fr",
          gap: isMobile ? "1rem" : "1.5rem",
          padding: isMobile ? "1rem" : "1.5rem 2rem",
          flex: 1,
        }}>
          <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <CardLance
              idEdicao={EDICAO_ATIVA}
              onLanceSucesso={onLanceSucessoWrapper}
              address={address}
              isConnected={isConnected}
              onConnect={abrirModal}
              onDisconnect={desconectar}
              encerrado={encerrado}
              tipoLeilao={tipoLeilao}
              ready={ready}
            />

            <LanceStatusBadge
              valor={meuUltimoLance?.valor}
              status={lanceStatus}
              mudou={lanceMudou}
            />
            {/* MC67 (item 8) — card "Segurança e Transparência" movido para Configurações. */}
          </section>
          <section>
            <TabelaLances lances={lances} idEdicao={EDICAO_ATIVA} prazoTimestamp={prazoTimestamp} encerrado={encerrado} />
          </section>
        </main>

        {/* ── Footer ── */}
        <footer style={{
          padding: isMobile ? "1rem" : "1rem 2rem",
          borderTop: "1px solid rgba(245,166,35,0.12)",
          textAlign: "center",
          fontSize: isMobile ? "0.7rem" : "0.76rem",
          color: COR.muted,
          lineHeight: 1.6,
        }}>
          <p style={{ margin: 0 }}>
            © {new Date().getFullYear()} <strong>DesafioGUT</strong> · Grupo União e Trabalho
            {!isMobile && (
              <>
                {" · "}
                <a href="https://www.iubenda.com/privacy-policy/DESAFIOGUT" target="_blank" rel="noopener noreferrer" style={{ color: COR.gold }}>Privacidade</a>
                {" · "}
                <a href="https://www.grupouniaoetrabalho.com.br" target="_blank" rel="noopener noreferrer" style={{ color: COR.gold }}>grupouniaoetrabalho.com.br</a>
              </>
            )}
          </p>
          {!isMobile && (
            <p style={{ margin: "0.4rem 0 0", fontSize: "0.72rem", color: "#6b7db8" }}>
              Implantação: <strong style={{ color: COR.muted }}>1º de junho de 2026</strong>
            </p>
          )}
        </footer>
      </div>
    </>
  );
}

// MC66 — AuthArea + badgeStyle movidos para components/glass/AuthArea.jsx.
// saldo*Style/chipBtnStyle removidos (código morto, sem uso).

// ── MC29.1 — Vista de conformidade (modo loja iOS/Android) ───────────────────
// Transparente: declara que o leilão está na versão Web, sem o esconder e sem
// dark patterns (taste-engineering). Glass UI .gut-glass-standard (impeccable-
// design), contraste WCAG AA, acento laranja cirúrgico. Dimensões fixas → CLS=0.
const PWA_URL = "https://desafiogut.com";

function MercadoConformidade({ isMobile }) {
  return (
    <div style={{
      minHeight: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: isMobile ? "1.5rem 1rem" : "3rem 2rem",
    }}>
      <GlassCard style={{
        maxWidth: "520px", width: "100%",
        padding: isMobile ? "1.75rem 1.5rem" : "2.5rem 2.25rem",
        textAlign: "center",
      }}>
        <div style={{ fontSize: isMobile ? "2.5rem" : "3rem", lineHeight: 1 }} aria-hidden="true">🛍️</div>
        <h2 style={{
          margin: "1rem 0 0.5rem",
          fontSize: isMobile ? "1.25rem" : "1.5rem",
          fontWeight: 800, color: COR.text, letterSpacing: "0.01em",
        }}>Leilões na versão Web</h2>
        <p style={{
          margin: "0 0 1.5rem", color: COR.muted,
          fontSize: isMobile ? "0.9rem" : "0.95rem", lineHeight: 1.6,
        }}>
          Os leilões do DesafioGUT acontecem na nossa versão Web. Abre{" "}
          <strong style={{ color: COR.gold }}>desafiogut.com</strong> no teu navegador
          para participar com saldo, lances e carteira — tudo o que já usas.
          Por aqui, continua a explorar a loja e os produtos.
        </p>
        <a
          href={PWA_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            padding: "0.8rem 1.6rem", borderRadius: "28px",
            background: "linear-gradient(135deg,#f5a623,#e89400)",
            color: "#0a0f1a", fontWeight: 800, fontSize: "0.95rem",
            textDecoration: "none", letterSpacing: "0.02em",
            boxShadow: "0 4px 18px rgba(245,166,35,0.35)",
          }}
        >Abrir versão Web</a>
        <p style={{ margin: "1.25rem 0 0", color: COR.muted, fontSize: "0.78rem", lineHeight: 1.5 }}>
          Esta versão da loja não inclui o leilão. Nada fica escondido — é só uma
          questão de onde cada funcionalidade vive.
        </p>
      </GlassCard>
    </div>
  );
}

// Skeleton com o MESMO contentor/dimensões da vista de conformidade → sem salto
// de layout (CLS=0) entre o estado de carregamento e o estado resolvido.
function MercadoSkeleton({ isMobile }) {
  const barra = (w) => ({
    height: "0.9rem", width: w, borderRadius: "6px",
    background: "rgba(255,255,255,0.06)", margin: "0.5rem auto",
  });
  return (
    <div style={{
      minHeight: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: isMobile ? "1.5rem 1rem" : "3rem 2rem",
    }}>
      <GlassCard style={{
        maxWidth: "520px", width: "100%",
        padding: isMobile ? "1.75rem 1.5rem" : "2.5rem 2.25rem",
        textAlign: "center",
      }} aria-busy="true" aria-label="A carregar">
        <div style={{
          width: "3rem", height: "3rem", borderRadius: "50%",
          background: "rgba(255,255,255,0.06)", margin: "0 auto 1rem",
        }} />
        <div style={barra("60%")} />
        <div style={barra("90%")} />
        <div style={barra("80%")} />
      </GlassCard>
    </div>
  );
}
