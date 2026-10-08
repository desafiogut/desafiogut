import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { GlassCard } from "@/components/ui";
import { useComprarPasse } from "../hooks/useComprarPasse.js";
import ComprarPasseModal from "../components/ComprarPasseModal.jsx";
import Toast from "../widgets/toast/Toast.jsx";
import ComprarFichasModal from "../components/ComprarFichasModal.jsx";
import PainelIndicacao from "../components/PainelIndicacao.jsx";
import BotaoLoginPrincipal from "../components/BotaoLoginPrincipal.jsx";

const VALOR_POR_SENHA_BRL = 2;
// UTAC106c — Passe Desafio: R$ 2,00 (NORTE Via B). Aqui vive só o PREÇO e o balão de
// confirmação; a compra (débito/crédito/gravação) é do UTAC106e — este ecrã não toca em lógica.
// Guardado como STRING (e não número + toFixed) para o rótulo sair exactamente «R$ 2,00»,
// com vírgula decimal (pt-BR), como o enunciado o escreve.
const PRECO_PASSE_DESAFIO = "R$ 2,00";

const COR = {
  primary: "#f5a623", primaryDim: "rgba(245,166,35,0.15)",
  gold: "#f5a623", text: "#e8f0fe", muted: "#6b7db8",
  success: "#10b981", danger: "#ef4444", blue300: "#fbbf24", purple: "#a78bfa",
  pix: "#00d4ff",
};
// UTAC107b — texto sobre o DOURADO. Branco sobre `#f5a623` dá 2,03:1 e falha o AA
// (mockup 107a-front, §SEG4); navy `#0a0f1a` dá 9,45:1. É o único par usado no CTA dourado.
const ON_GOLD = "#0a0f1a";

// MC99 (HARD GATE 4) — o card "🏦 Dados para Pagamento (Art. 21)", que consumia esta
// lista, foi REMOVIDO. Medido: a informação não se perdeu —
//   · "R$ 2,00 por senha" está no próprio cartão de saldo e em Configurações → Segurança e
//     Transparência ("Art. 20 — Senha: R$ 2,00 por edição");
//   · os dados bancários/PIX do Art. 21 estão no regulamento (gate de consentimento,
//     Art. 21: chave PIX, agência e conta);
//   · o fluxo de pagamento em si é o modal "💰 Depositar PIX", que gera o código.
// Ou seja: o cartão repetia no ecrã o que o utilizador já lê no regulamento e no
// próprio botão de depósito.
//
// ⚠️ UTAC107b — o e-mail do destinatário PIX (`desafiogut@gmail.com`) CONTINUA aqui, na
// nota do rodapé do cartão. Medido no SEG0: o modal de depósito (`ComprarFichasModal.jsx`)
// mostra o CÓDIGO PIX (copia-e-cola), o valor e o provider — mas NÃO mostra o destinatário
// como texto. É por isso que esta nota fica (RESSALVA 5 do enunciado: «se o depósito NÃO
// mostrar, NÃO remover da Carteira»). O MC99 repôs-a de propósito.

export default function MinhaCarteira() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  // MC99 — o destructure encolheu com os cartões: saíram `lances` (só servia o card
  // "Meus Lances") e `userLabel` (só o card "Carteira Conectada").
  // `refetchSaldo` FICA: o saldo de senhas continua a ser mostrado no Sidebar (indicador
  // "🔗 N"), e a compra de fichas tem de o refrescar também — senão o rail fica com um
  // número antigo.
  // UTAC107b — saiu `setModalidade` (só a modalidade do lance o usava; a navegação passa a
  // apontar à rota canónica `/mercado`, como em §SEG1 do 106c).
  const {
    isConnected, abrirModal,
    address, user,
    refetchSaldo,
    saldoRsCentavos, saldoRsStatus, refetchSaldoRs,
    // UTAC107g (Frente B) — só para o indicador discreto das senhas antigas (Via A).
    saldoSenhas, saldoSenhasStatus,
  } = useAppContext();

  // UTAC107g — o indicador só aparece com um número CONHECIDO e > 0. `null` (ainda não lido),
  // não-inteiros e o estado "error" não mostram nada: não se afirma o que não se sabe.
  const senhasAntigas =
    Number.isSafeInteger(saldoSenhas) && saldoSenhas > 0 && saldoSenhasStatus !== "error"
      ? saldoSenhas : 0;

  // Email do pagador para o PIX (MC39.15.1): coletado automaticamente do login
  // Privy (e-mail/Google/Apple). O CPF NÃO é coletado — o documento do payer é
  // resolvido no backend (env MP_PAYER_ID_NUMBER).
  const emailPagador =
    user?.email?.address || user?.google?.email || user?.apple?.email || null;

  const [comprarAberto, setComprarAberto] = useState(false);
  // UTAC106c — balão de confirmação do Passe Desafio. UTAC106e — o balão passou a COMPRAR
  // (chama o endpoint `comprar-passe-pontos`); o estado do balão mantém o nome do 106c.
  const [passeAberto, setPasseAberto] = useState(false);
  // UTAC106e — compra do Passe Desafio: hook que chama `POST /comprar-passe-pontos` (endpoint do
  // UTAC106d-v2). Devolve o estado da chamada; o saldo R$ é relido pelo próprio hook.
  const { comprar: comprarPasse, loading: comprandoPasse, pontos: pontosPasse } = useComprarPasse();
  // UTAC106e — feedback da compra: toast do repo + atalho «Carregar agora» no caso 402.
  const [toastPasse, setToastPasse] = useState(null);
  const [passeSemSaldo, setPasseSemSaldo] = useState(false);

  const statusRsSuffix =
    saldoRsStatus === "loading" ? " ⏳" :
    saldoRsStatus === "error"   ? " ✗" : "";
  const saldoRsPendente = saldoRsStatus === "stale";

  // Modelo dual (Frente B.9): Saldo Disponível = saldo-rs (off-chain).
  // PIX aprovado credita aqui; Lance Relâmpago debita aqui em centavos.
  const saldoReais = saldoRsCentavos == null ? null : saldoRsCentavos / 100;

  // UTAC106c — o botão «Lance Relâmpago» passou a «Menor Lance Único» (nome canónico da
  // modalidade, alinhado com a aba do UTAC106b e com a NORTE Via B). O destino NÃO mudou:
  // `/mercado` é a rota canónica do Menor Lance Único (GATE 4 — não se alterou lógica que
  // funcionava).
  function irParaMenorLanceUnico() {
    navigate("/mercado");
  }
  // UTAC107b — «Ofertas Programadas» (programa de fidelidade: Passe R$ 2,00 → pontos → cartão).
  // Destino = a rota registada em `App.jsx` (`/ofertas-programadas`).
  function irParaOfertasProgramadas() {
    navigate("/ofertas-programadas");
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
    minHeight: "48px",
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
          que passa a ser o primeiro — e único — título da página. */}

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
          {/* MC99 (HARD GATE 2) — SEM `background` nem `borderColor` inline: .gut-glass-standard puro. */}
          <GlassCard className={`${cardCls} ${isMobile ? 'mb-5' : 'mb-6'}`}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: "0.55rem", gap: "0.5rem",
              }}>
                <h3 style={{ ...tituloStyle, margin: 0, color: COR.gold }}>Carteira</h3>
                {/* MC99 (correcção do HARD GATE 4 — refutação do validador) — o botão
                    "↻ Atualizar saldo" vivia no card "Saldo de Senhas" e foi removido com
                    ele. Medido: NÃO tinha substituto nenhum — o auto-refresh é de 30 s
                    (AppContext: setInterval(refetchSaldo, 30000)). Vem para aqui, junta do
                    saldo a que diz respeito. A pílula «R$ OFF-CHAIN» saiu no UTAC107b (R18-E:
                    texto técnico desnecessário). */}
                <button
                  type="button"
                  onClick={() => { try { refetchSaldo?.(); } catch {} }}
                  aria-label="Atualizar o saldo on-chain"
                  title="Ler o saldo on-chain agora (normalmente actualiza sozinho a cada 30 s)"
                  style={{
                    background: "transparent", border: "1px solid rgba(245,166,35,0.18)",
                    borderRadius: "999px", color: COR.muted, cursor: "pointer",
                    fontSize: "0.72rem", lineHeight: 1.4,
                    minWidth: "48px", minHeight: "48px",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    flex: "none",
                  }}
                >
                  ↻
                </button>
              </div>

              {/* MC99 — a etiqueta veio do glass de cabeçalho removido: o número
                  grande precisa de dizer o que é. UTAC106c — o título passou a
                  «Carteira» e a etiqueta a amarelo, a par do valor. */}
              <div style={{
                fontSize: "0.75rem", color: COR.gold, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.06em",
                marginBottom: "0.15rem",
              }}>Saldo Disponível</div>
              <div
                className={saldoRsPendente ? "gut-valor-pendente" : undefined}
                style={{
                  fontSize: isMobile ? "2.4rem" : "3rem",
                  fontWeight: 900, color: COR.gold, lineHeight: 1.05,
                  marginBottom: "0.95rem",
                }}
              >
                {saldoReais == null
                  ? (saldoRsStatus === "loading" ? "R$ …" : "R$ —")
                  : `R$ ${saldoReais.toFixed(2)}`}
                <span style={{ fontSize: "0.85rem", color: COR.muted, fontWeight: 700, marginLeft: "0.4rem" }}>
                  {statusRsSuffix}
                </span>
              </div>

              {/* UTAC107b — ordem decidida pelo operador (decisão 4):
                  Depositar PIX → Comprar Passe Desafio → Menor Lance Único → Ofertas Programadas.
                  R18-E: a frase de apoio do saldo saiu (texto técnico) e o botão «Trocar R$ 2,00
                  → 1 Senha» foi removido (decisão 1 — a Via A deixa de ter caminho visível aqui). */}
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: "0.6rem",
              }}>
                <button
                  onClick={() => setComprarAberto(true)}
                  style={{
                    // MC48 P2 — azul suave (depósito), no idioma glass do design system.
                    ...botaoPrimario,
                    background: "rgba(0,212,255,0.14)",
                    border: "1px solid rgba(0,212,255,0.4)",
                    color: COR.pix,
                    boxShadow: "none",
                  }}
                  title="Depósito PIX → +R$ (crédito automático após aprovação MP)"
                >
                  💰 Depositar PIX
                </button>
                <button
                  type="button"
                  onClick={() => setPasseAberto(true)}
                  style={{
                    ...botaoPrimario,
                    // UTAC107b (decisão 5) — dourado SÓLIDO + texto navy `#0a0f1a` = 9,45:1
                    // (era branco sobre o gradiente = 2,03:1, reprovava o AA).
                    background: COR.gold,
                    color: ON_GOLD,
                  }}
                  title={`Comprar o Passe Desafio por ${PRECO_PASSE_DESAFIO}`}
                >
                  {`Comprar Passe Desafio ${PRECO_PASSE_DESAFIO}`}
                </button>
                {/* UTAC108c (D-1, Opção A do operador) — o botão NAVEGA SEMPRE. Tinha
                    `disabled={!saldoReais}`: com saldo R$ 0,00 (ou ainda a carregar) o clique não fazia
                    nada e o utilizador lia «o botão não navega». O saldo verifica-se no DESTINO (aviso
                    «Sem saldo» no MercadoLances; o lance em si continua bloqueado no CardLance). */}
                <button
                  type="button"
                  onClick={irParaMenorLanceUnico}
                  style={{
                    // MC48 P2 — laranja suave (CTA de lance). UTAC106c — passa a «Menor Lance Único».
                    ...botaoPrimario,
                    background: "rgba(245,166,35,0.14)",
                    border: "1px solid rgba(245,166,35,0.4)",
                    color: COR.gold,
                    boxShadow: "none",
                  }}
                  title="Ir para o Menor Lance Único"
                >
                  ⚡ Menor Lance Único
                </button>
                <button
                  type="button"
                  onClick={irParaOfertasProgramadas}
                  style={{
                    // UTAC107b — «Ofertas Programadas» com o mesmo estilo do «Menor Lance Único».
                    ...botaoPrimario,
                    background: "rgba(245,166,35,0.14)",
                    border: "1px solid rgba(245,166,35,0.4)",
                    color: COR.gold,
                    boxShadow: "none",
                  }}
                  title="Abre as Ofertas Programadas (programa de fidelidade)"
                >
                  🎫 Ofertas Programadas
                </button>
              </div>

              {/* UTAC107b (Regra 1, decisão 6) — o aviso 402 estava FORA do vidro (solto por
                  baixo do «Indique e Ganhe»); passa para DENTRO do cartão de saldo, onde o
                  utilizador está. Conteúdo: «⚠️ Saldo insuficiente.» + atalho «Carregar agora (PIX)». */}
              {passeSemSaldo && (
                <div role="status" style={{
                  marginTop: "0.85rem", padding: "0.7rem 0.85rem", borderRadius: "10px",
                  background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.3)",
                }}>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: COR.danger, lineHeight: 1.4, fontWeight: 700 }}>
                    ⚠️ Saldo insuficiente.{" "}
                    <button
                      type="button"
                      onClick={() => { setPasseSemSaldo(false); setToastPasse(null); setPasseAberto(false); setComprarAberto(true); }}
                      style={{
                        background: "none", border: "none", padding: 0, fontSize: "0.82rem",
                        color: COR.blue300, fontWeight: 800, textDecoration: "underline", cursor: "pointer",
                      }}
                    >
                      Carregar agora (PIX)
                    </button>
                  </p>
                </div>
              )}

              {/* MC99 (correcção do HARD GATE 4) — o card "Dados para Pagamento (Art. 21)"
                  foi removido e levou consigo o ÚNICO sítio do frontend onde constava o
                  email de pagamento do Mercado Pago. Medido pelo validador:
                  `grep -rn "desafiogut@gmail.com" src/` → 0 resultados. O custo da senha
                  tinha substituto; o email não. Volta como nota de uma linha, no sítio onde
                  o utilizador está quando vai pagar.
                  ⚠️ UTAC107b: CONFIRMADO que o modal de depósito NÃO mostra o destinatário
                  (só o código PIX) — por isso esta nota MANTÉM-SE (RESSALVA 5). */}
              <p style={{
                margin: "0.75rem 0 0", fontSize: "0.68rem", color: COR.muted, lineHeight: 1.45,
              }}>
                Depósito por PIX via Mercado Pago — <strong style={{ color: COR.blue300 }}>desafiogut@gmail.com</strong>{" "}
                (crédito automático após a aprovação). Custo de cada senha: R$ {VALOR_POR_SENHA_BRL.toFixed(2)} por edição (Art. 20).
              </p>

              {saldoRsStatus === "error" && (
                <p style={{ margin: "0.6rem 0 0", fontSize: "0.72rem", color: COR.danger, lineHeight: 1.4 }}>
                  ⚠️ Não foi possível ler o saldo R$ agora.
                </p>
              )}

              {/* UTAC107g (Frente B) — as senhas on-chain (Via A) perderam o botão de troca
                  (107b) e o tile (107c). A casa delas passa a ser «Meus Ativos»; aqui fica só
                  um aviso DISCRETO (cor muted, sem fundo), dentro do vidro, e só com senhas > 0.
                  Alvo de toque com 44 px de altura, mesmo sendo visualmente uma linha de texto. */}
              {senhasAntigas > 0 && (
                <button
                  type="button"
                  data-indicador="senhas-antigas"
                  onClick={() => navigate("/ativos")}
                  style={{
                    display: "flex", alignItems: "center", width: "100%", minHeight: "44px",
                    margin: "0.35rem 0 0", padding: 0, background: "none", border: "none",
                    color: COR.muted, fontSize: "0.72rem", textAlign: "left", cursor: "pointer",
                  }}
                >
                  Você tem {senhasAntigas} {senhasAntigas === 1 ? "senha antiga" : "senhas antigas"} → ver em Meus Ativos
                </button>
              )}
            </GlassCard>

          {/* MC10 — Sistema "Indique e Ganhe" (Growth Viral). */}
          <div style={{ marginBottom: sectionGap }}>
            <PainelIndicacao isMobile={isMobile} />
          </div>

          {/* MC99 (HARD GATE 4) — cards "🔗 Saldo de Senhas", "🏦 Dados para Pagamento" e
              "📋 Meus Lances" REMOVIDOS. A informação não se perdeu: o saldo on-chain está no
              Sidebar; os dados bancários no regulamento; os lances em /ativos. */}
        </>
      )}

      {/* UTAC106e — BALÃO de confirmação do Passe Desafio (componente próprio; o 106c tinha-o
          inline). «Confirmar» CHAMA o endpoint `comprar-passe-pontos` (débito de R$ 2,00 +
          crédito de 1 ponto) e, em sucesso, o balão FECHA e o utilizador FICA na Carteira. */}
      <ComprarPasseModal
        aberto={passeAberto}
        loading={comprandoPasse}
        pontos={pontosPasse}
        onCancelar={() => setPasseAberto(false)}
        onConfirmar={async () => {
          const r = await comprarPasse();
          if (r?.ok) {
            setPasseAberto(false);
            setPasseSemSaldo(false);
            setToastPasse({ variant: "success", message: "1 ponto creditado" });
          } else if (r?.status === 402 || r?.code === "saldo_insuficiente") {
            setPasseSemSaldo(true);
            setToastPasse({ variant: "error", message: "Saldo insuficiente. Carregar agora?" });
          } else {
            setToastPasse({ variant: "error", message: r?.message || "Erro. Tente de novo." });
          }
        }}
      />

      {/* UTAC106e — TOAST do repo (`widgets/toast/Toast.jsx`; posiciona-se sozinho, auto-dismiss 4 s). */}
      {toastPasse && (
        <Toast
          id={1}
          variant={toastPasse.variant}
          message={toastPasse.message}
          onDismiss={() => setToastPasse(null)}
        />
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
