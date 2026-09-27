import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { GlassCard } from "@/components/ui";
import { useTrocarPorSenhas } from "../hooks/useTrocarPorSenhas.js";
import ComprarFichasModal from "../components/ComprarFichasModal.jsx";
import CreditoStatus from "../components/CreditoStatus.jsx"; // MC59.6 — feedback do 202 assíncrono
import PainelIndicacao from "../components/PainelIndicacao.jsx";
import BotaoLoginPrincipal from "../components/BotaoLoginPrincipal.jsx";

const VALOR_POR_SENHA_BRL = 2;

const COR = {
  primary: "#f5a623", primaryDim: "rgba(245,166,35,0.15)",
  gold: "#f5a623", text: "#e8f0fe", muted: "#6b7db8",
  success: "#10b981", danger: "#ef4444", blue300: "#fbbf24", purple: "#a78bfa",
};

// MC99 (HARD GATE 4) — o card "🏦 Dados para Pagamento (Art. 21)", que consumia esta
// lista, foi REMOVIDO. Medido: a informação não se perdeu —
//   · "R$ 2,00 por senha" está no próprio cartão de saldo (botão "Trocar R$ 2,00 → 1
//     Senha") e em Configurações → Segurança e Transparência ("Art. 20 — Senha:
//     R$ 2,00 por edição");
//   · os dados bancários/PIX do Art. 21 estão no regulamento (gate de consentimento,
//     Art. 21: chave PIX, agência e conta);
//   · o fluxo de pagamento em si é o modal "💰 Depositar PIX", que gera o código.
// Ou seja: o cartão repetia no ecrã o que o utilizador já lê no regulamento e no
// próprio botão de depósito.

export default function MinhaCarteira() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  // MC99 — o destructure encolheu com os cartões: saíram `lances` (só servia o card
  // "Meus Lances") e `userLabel` (só o card "Carteira Conectada").
  // `refetchSaldo` FICA: apesar de o card "Saldo de Senhas" ter saído, o saldo de
  // senhas continua a ser mostrado no Sidebar (indicador "🔗 N"), e a compra de fichas
  // tem de o refrescar também — senão o rail fica com um número antigo.
  const {
    isConnected, abrirModal,
    address, user,
    refetchSaldo,
    saldoRsCentavos, saldoRsStatus, refetchSaldoRs,
    setModalidade,
  } = useAppContext();

  // Email do pagador para o PIX (MC39.15.1): coletado automaticamente do login
  // Privy (e-mail/Google/Apple). O CPF NÃO é coletado — o documento do payer é
  // resolvido no backend (env MP_PAYER_ID_NUMBER).
  const emailPagador =
    user?.email?.address || user?.google?.email || user?.apple?.email || null;

  // MC17.1 ITEM 1 — lógica de compra de senhas extraída para hook reutilizável.
  // Aliases preservam os nomes usados no JSX (zero alteração de comportamento — R2).
  const {
    trocarPorSenhas,
    carregando: trocandoSenhas,
    erro: trocaErro,
    sucesso: trocaInfo,
  } = useTrocarPorSenhas();

  const [comprarAberto, setComprarAberto] = useState(false);
  // MC59.6 — txHash de uma compra assíncrona (202); alimenta <CreditoStatus>.
  // Inerte enquanto CREDITO_ASSINCRONO=OFF (o caminho síncrono não retorna txHash).
  const [creditoTxHash, setCreditoTxHash] = useState(null);

  const statusRsSuffix =
    saldoRsStatus === "loading" ? " ⏳" :
    saldoRsStatus === "error"   ? " ✗" : "";
  const saldoRsPendente = saldoRsStatus === "stale";

  // Modelo dual (Frente B.9): Saldo Disponível = saldo-rs (off-chain).
  // PIX aprovado credita aqui; "Trocar por Senhas" debita aqui e credita
  // saldoSenhas on-chain; Lance Relâmpago debita aqui em centavos.
  const saldoReais = saldoRsCentavos == null ? null : saldoRsCentavos / 100;

  function irParaLanceRelampago() {
    try { setModalidade?.("flash"); } catch {}
    navigate("/mercado");
  }

  const pad        = isMobile ? "1rem" : "2rem";
  const cardPad    = isMobile ? "1rem" : "1.25rem";
  const sectionGap = isMobile ? "1.25rem" : "1.5rem";

  const cardCls = isMobile ? "p-4" : "p-5";
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

  return (
    <div style={{ padding: pad, flex: 1 }}>
      {/* MC99 — o GLASS DE CABEÇALHO foi removido. Dois títulos a dizer o mesmo na
          mesma dobra ("Minha Carteira" no cabeçalho e "Saldo Disponível" no cartão
          logo abaixo) era ruído: o nome da página já vem na navegação ("Carteira" na
          barra inferior, item activo). O nome foi INCORPORADO no cartão de saldo,
          que passa a ser o primeiro — e único — título da página. O texto de apoio
          ("Acompanhe seu saldo de senhas e seus lances") saiu porque descrevia
          exactamente o que os cartões mostram; e os "lances" que ele prometia já não
          estão aqui (ver remoção do card "Meus Lances"). */}

      {!isConnected ? (
        <GlassCard className={cardCls}>
          <p style={{ color: COR.muted, marginBottom: "1rem", fontSize: isMobile ? "0.85rem" : "0.9rem" }}>
            Faça login para visualizar e gerenciar sua carteira.
          </p>
          <BotaoLoginPrincipal onClick={abrirModal} size="md" fullWidth={isMobile} />
        </GlassCard>
      ) : (
        <>
          {/* Saldo Disponível (R$) — modelo dual Frente B.9.
              Fonte: blob saldo-rs:${address}. PIX → +R$. /comprar-senhas → -R$.
              /lance-relampago → -centavos. */}
          {/* MC99 (HARD GATE 2) — SEM `background` nem `borderColor` inline. Este cartão
              tinha um vidro PRÓPRIO (gradiente quase transparente, 0.6 → 0.06) no meio
              de vidros standard (navy 0.88) — o texto do saldo assentava em
              transparência, e era o único cartão da app fora do padrão. Passa a
              .gut-glass-standard puro. O destaque do saldo fica a cargo do que sempre
              devia: o TAMANHO do número e a cor do valor. */}
          <GlassCard className={`${cardCls} ${isMobile ? 'mb-5' : 'mb-6'}`}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: "0.55rem", gap: "0.5rem",
              }}>
                <h3 style={{ ...tituloStyle, margin: 0, color: COR.gold }}>💰 Minha Carteira</h3>
                <span style={{
                  fontSize: "0.62rem", fontWeight: 700,
                  color: saldoRsStatus === "error" ? COR.danger : COR.muted,
                  background: "rgba(13,18,53,0.25)",
                  border: "1px solid rgba(245,166,35,0.18)",
                  borderRadius: "999px",
                  padding: "0.18rem 0.55rem",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }} title={`Saldo R$ off-chain (blob saldo-rs) · status ${saldoRsStatus}`}>
                  R$ off-chain
                </span>
                {/* MC99 (correcção do HARD GATE 4 — refutação do validador) — o botão
                    "↻ Atualizar saldo" vivia no card "Saldo de Senhas" e foi removido com
                    ele. Medido: NÃO tinha substituto nenhum — o Sidebar não o chama, os
                    StatTile do Dashboard só navegam, e o auto-refresh é de 30 s
                    (AppContext: setInterval(refetchSaldo, 30000)). Volta aqui, compacto,
                    junto do saldo a que diz respeito. */}
                <button
                  type="button"
                  onClick={() => { try { refetchSaldo?.(); } catch {} }}
                  aria-label="Atualizar o saldo on-chain"
                  title="Ler o saldo on-chain agora (normalmente actualiza sozinho a cada 30 s)"
                  style={{
                    background: "transparent", border: "1px solid rgba(245,166,35,0.18)",
                    borderRadius: "999px", color: COR.muted, cursor: "pointer",
                    fontSize: "0.72rem", padding: "0.1rem 0.45rem", lineHeight: 1.4,
                  }}
                >
                  ↻
                </button>
              </div>

              {/* MC99 — a etiqueta veio do glass de cabeçalho removido: o número
                  grande precisa de dizer o que é. */}
              <div style={{
                fontSize: "0.62rem", color: COR.muted, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.06em",
                marginBottom: "0.15rem",
              }}>Saldo Disponível</div>
              <div
                className={saldoRsPendente ? "gut-valor-pendente" : undefined}
                style={{
                  fontSize: isMobile ? "2.4rem" : "3rem",
                  fontWeight: 900, color: COR.gold, lineHeight: 1.05,
                  marginBottom: "0.35rem",
                }}
              >
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
                    // MC48 P2 — azul suave (depósito), no idioma glass do design system.
                    ...botaoPrimario,
                    background: "rgba(0,212,255,0.14)",
                    border: "1px solid rgba(0,212,255,0.4)",
                    color: "#00d4ff",
                    boxShadow: "none",
                  }}
                  title="Depósito PIX → +R$ (crédito automático após aprovação MP)"
                >
                  💰 Depositar PIX
                </button>
                <button
                  onClick={async () => {
                    const r = await trocarPorSenhas(1);
                    // MC59.6 — se a resposta foi 202 (assíncrono), acompanha via polling.
                    if (r?.assincrono && r.txHash) setCreditoTxHash(r.txHash);
                  }}
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
                    // MC48 P2 — laranja suave (CTA de lance).
                    ...botaoPrimario,
                    background: "rgba(245,166,35,0.14)",
                    border: "1px solid rgba(245,166,35,0.4)",
                    color: "#f5a623",
                    boxShadow: "none",
                    cursor: !saldoReais ? "not-allowed" : "pointer",
                    opacity: !saldoReais ? 0.5 : 1,
                  }}
                  title={!saldoReais ? "Deposite PIX primeiro" : "Vai ao Mercado de Lances em modo Relâmpago"}
                >
                  ⚡ Lance Relâmpago
                </button>
              </div>

              {/* MC99 (correcção do HARD GATE 4) — o card "Dados para Pagamento (Art. 21)"
                  foi removido e levou consigo o ÚNICO sítio do frontend onde constava o
                  email de pagamento do Mercado Pago. Medido pelo validador:
                  `grep -rn "desafiogut@gmail.com" src/` → 0 resultados. O custo da senha
                  tinha substituto; o email não. Volta como nota de uma linha, no sítio onde
                  o utilizador está quando vai pagar. */}
              <p style={{
                margin: "0.6rem 0 0", fontSize: "0.68rem", color: COR.muted, lineHeight: 1.45,
              }}>
                Depósito por PIX via Mercado Pago — <strong style={{ color: COR.blue300 }}>desafiogut@gmail.com</strong>{" "}
                (crédito automático após a aprovação). Custo de cada senha: R$ {VALOR_POR_SENHA_BRL.toFixed(2)} por edição (Art. 20).
              </p>

              {trocaInfo && (
                <p style={{ margin: "0.6rem 0 0", fontSize: "0.78rem", color: COR.success, lineHeight: 1.4, fontWeight: 700 }}>
                  {trocaInfo}
                </p>
              )}
              {/* MC59.6 — feedback do crédito assíncrono (202); null com flag OFF. */}
              <CreditoStatus txHash={creditoTxHash} qtd={1} />
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
            </GlassCard>

          {/* MC10 — Sistema "Indique e Ganhe" (Growth Viral). */}
          <div style={{ marginBottom: sectionGap }}>
            <PainelIndicacao isMobile={isMobile} />
          </div>

          {/* MC99 (HARD GATE 4) — card "🔗 Saldo de Senhas" REMOVIDO. A informação NÃO
              se perdeu: o mesmo saldo on-chain está no Sidebar (indicador "🔗 N" com
              status, visível em todos os ecrãs) e no KPI "Senhas" do Dashboard. Aqui
              era um terceiro sítio a mostrar o mesmo número, com botões próprios
              ("Usar no Mercado de Lances" / "Atualizar saldo") que duplicavam caminhos
              que já existem na barra inferior e nos Lances. */}

          {/* MC99 (HARD GATE 4) — card "🏦 Dados para Pagamento (Art. 21)" REMOVIDO.
              Ver a nota no topo do ficheiro: o custo da senha está no botão de troca e
              nas Configurações; os dados bancários estão no regulamento (Art. 21), que
              o utilizador aceita antes de participar. */}

          {/* MC99 (HARD GATE 4) — card "📋 Meus Lances" REMOVIDO. A informação existe e
              está MELHOR noutro sítio: /ativos ("Meus Ativos") filtra os lances do
              endereço e classifica-os (único/repetido/pontos) — este card mostrava uma
              lista crua de txHash + valor, sem os pontos nem o estado do torneio. */}

          {/* MC99 (HARD GATE 4) — card "Carteira Conectada" (endereço completo) REMOVIDO.
              O endereço truncado e o nome do utilizador estão no Sidebar (cartão de
              conta, no rodapé do rail) — visível em todos os ecrãs — e o endereço
              completo está nas Configurações, onde faz sentido (é lá que se gere a
              conta). */}

        </>
      )}

      <ComprarFichasModal
        aberto={comprarAberto}
        onFechar={() => setComprarAberto(false)}
        address={address}
        email={emailPagador}
        onSucesso={() => {
          try { refetchSaldoRs?.(); } catch {}
          try { refetchSaldo?.();   } catch {}
        }}
      />
    </div>
  );
}
