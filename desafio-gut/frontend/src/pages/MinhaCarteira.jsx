import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { GlassCard } from "@/components/ui";
import { useComprarPasse } from "../hooks/useComprarPasse.js";
// UTAC110d-front — os dois saldos (pontos de fidelidade + créditos de lance) vêm do `ler-pontos`.
import { usePontos } from "../hooks/usePontos.js";
import { useEcoQuildo } from "../hooks/useEcoQuildo.js";
import { passeDoTipo } from "../lib/passes.js";
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

// UTAC109h.2 (decisão do operador, 2026-10-09) — UMA só cor de destaque: o amarelo `#f5a623`
// (o dourado do botão «Dar palpite», o mesmo tom de 56 ficheiros do app). Saíram o ciano `#00d4ff`
// do PIX, o `#fbbf24`, o verde `#10b981`, o violeta `#a78bfa` e o gradiente `#e89400`.
// O LAYOUT é o de `1a41cf7` — o UTAC109h trocou-o por engano e foi revertido.
// ESCOPO: «uma só cor» vale para as DUAS peças deste ecrã; as modais (ComprarPasse/ComprarFichas)
// e os tokens globais (glassTokens/globals.css) ficam como estavam — fora do âmbito autorizado.
const COR = {
  primary: "#f5a623", primaryDim: "rgba(245,166,35,0.15)",
  gold: "#f5a623", text: "#e8f0fe", muted: "#6b7db8",
  success: "#f5a623", danger: "#ef4444", blue300: "#f5a623", purple: "#f5a623",
  pix: "#f5a623",
};
// UTAC107b — texto sobre o DOURADO. Branco sobre `#f5a623` dá 2,03:1 e falha o AA
// (mockup 107a-front, §SEG4); navy `#0a0f1a` dá 9,45:1. Era o par do CTA DOURADO SÓLIDO do Passe
// até ao UTAC109h.3, que pôs esse botão no padrão amarelo tingido dos restantes; a constante fica
// definida por contrato de teste do UTAC106c e já **não é usada por nenhum CTA** (achado F4 do
// validador do 109h.3 — registado, não removida).
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
  // UTAC106e — compra do Passe Desafio. UTAC110d-front — `comprar(tipo)` chama
  // `comprar-passe-relampago` OU `comprar-passe-programado` (já não o `comprar-passe-pontos`).
  // O saldo R$ é relido pelo próprio hook; os pontos/créditos relêem-se aqui (`refetchPontos`).
  const { comprar: comprarPasse } = useComprarPasse();
  // UTAC110d-front (Frente A) — dois saldos SEPARADOS: pontos de CARTÃO (`pontosCartao`, só
  // compras — R1 do UTAC106f; é o mesmo número da barra das Ofertas Programadas) e créditos de lance.
  const {
    pontosCartao, pontosParaCartao, creditosLance, missoesHoje,
    loading: pontosCarregando, erro: pontosErro, refetch: refetchPontos,
  } = usePontos();
  // UTAC110e (Frente D) — 3.º saldo: ECOQUILDO (moeda social, Arts. 47º-51º). Só leitura: NÃO se
  // compra, NÃO se converte em dinheiro, NÃO se transfere (Art. 49º); usa-se só no site oficial.
  const {
    saldo: saldoEco, loading: ecoCarregando, erro: ecoErro, refetch: refetchEco,
  } = useEcoQuildo();
  const [tipoEmCurso, setTipoEmCurso] = useState(null);
  const [erroPasse, setErroPasse] = useState("");
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

  // UTAC110d-front — leitura honesta dos dois saldos: a carregar «…», em erro «—» (não se inventa 0).
  const saldosIlegiveis = pontosCarregando || Boolean(pontosErro);
  const metaCartao = Number.isSafeInteger(pontosParaCartao) && pontosParaCartao > 0 ? pontosParaCartao : 50;
  const progressoCartao = saldosIlegiveis ? 0 : Math.min(100, Math.round((pontosCartao / metaCartao) * 100));
  // UTAC110e — a mesma leitura honesta serve o ECOQUILDO: passa-se o estado do hook dele.
  const textoSaldo = (n, carregando = pontosCarregando, erro = pontosErro) =>
    (carregando ? "…" : erro || n == null ? "—" : String(n));

  // UTAC110f-front — «Missões de hoje». Estado NEUTRO quando não se sabe (a carregar, erro, ou campo ilegível —
  // `missoesHoje === null`): não se afirma «feito» nem «pendente». ✓ feito = amarelo único `#f5a623`
  // (R18-110f-front-A: a decisão do 109h.2 prevalece sobre o «verde» do enunciado; o emoji ✅ seria pintado de verde
  // pela fonte do sistema, por isso usa-se o glifo de texto «✓», U+2713); ⏳ pendente = muted.
  const estadoMissoes = pontosCarregando ? "carregando" : missoesHoje ? "ok" : "neutro";
  const MISSOES = missoesHoje ? [
    { id: "login", rotulo: "Login diário", pontos: 5, feito: missoesHoje.loginFeito },
    { id: "lance", rotulo: "Completar 1 lance", pontos: 10, feito: missoesHoje.lanceFeito },
  ] : [];
  const todasFeitas = MISSOES.length > 0 && MISSOES.every((m) => m.feito);

  async function escolherPasse(tipo) {
    if (tipoEmCurso) return;
    setTipoEmCurso(tipo);
    setErroPasse("");
    try {
      const r = await comprarPasse(tipo);
      if (r?.ok) {
        setPasseAberto(false);
        setPasseSemSaldo(false);
        setToastPasse({ variant: "success", message: passeDoTipo(tipo)?.sucesso ?? "Passe comprado" });
        try { await refetchPontos?.(); } catch { /* releitura é best-effort */ }
        // UTAC110e (D3) — cada Passe comprado dá 1 ECOQUILDO (R18-110e-1): relê-se também.
        try { await refetchEco?.(); } catch { /* releitura é best-effort */ }
      } else if (r?.status === 402 || r?.code === "saldo_insuficiente") {
        setPasseSemSaldo(true);
        setErroPasse("Saldo insuficiente. Deposite via PIX e tente de novo.");
        setToastPasse({ variant: "error", message: "Saldo insuficiente. Carregar agora?" });
      } else {
        const msg = r?.message || "Erro. Tente de novo.";
        setErroPasse(msg);
        setToastPasse({ variant: "error", message: msg });
      }
    } finally {
      setTipoEmCurso(null);
    }
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
    background: "#f5a623",
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

              {/* UTAC110d-front (Frente A) — os DOIS saldos do programa, separados, DENTRO do vidro
                  do saldo (Regra 1): pontos de fidelidade (rumo ao cartão, X / 50 + barra) e
                  créditos de lance (cada lance no Menor Lance Único consome 1). */}
              <div data-saldos-passe="" style={{
                // UTAC110e — 3 saldos: lado a lado no desktop; empilhados no telemóvel (3 colunas
                // a 375 px apertariam o texto dos rótulos).
                display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: "0.6rem", marginBottom: "0.95rem",
              }}>
                <div data-saldo="fidelidade" style={{
                  padding: "0.65rem 0.75rem", borderRadius: "12px",
                  background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.25)",
                }}>
                  <div style={{ fontSize: "0.7rem", color: COR.text, fontWeight: 700 }}>🎟️ Pontos de fidelidade</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 900, color: COR.gold, lineHeight: 1.2 }}>
                    {textoSaldo(pontosCartao)} / {metaCartao}
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Progresso para o cartão"
                    aria-valuemin={0}
                    aria-valuemax={metaCartao}
                    aria-valuenow={saldosIlegiveis ? undefined : Math.min(pontosCartao, metaCartao)}
                    style={{
                      height: "6px", borderRadius: "999px", marginTop: "0.4rem",
                      background: "rgba(245,166,35,0.15)", overflow: "hidden",
                    }}
                  >
                    {/* Barra de progresso (não é botão): o preenchimento usa o amarelo único. */}
                    <div data-barra-cartao="" style={{ width: `${progressoCartao}%`, height: "100%", background: COR.primary }} />
                  </div>
                </div>
                <div data-saldo="creditos" style={{
                  padding: "0.65rem 0.75rem", borderRadius: "12px",
                  background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.25)",
                }}>
                  <div style={{ fontSize: "0.7rem", color: COR.text, fontWeight: 700 }}>⚡ Créditos de lance</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 900, color: COR.gold, lineHeight: 1.2 }}>
                    {textoSaldo(creditosLance)}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: COR.text, opacity: 0.85, marginTop: "0.25rem" }}>
                    {!saldosIlegiveis && creditosLance === 1 ? "disponível" : "disponíveis"}
                  </div>
                </div>
                {/* UTAC110e (Frente D2) — ECOQUILDO: SÓ leitura. Sem botão de compra (Art. 49º: não
                    se compra, não se converte em dinheiro, não se transfere); usa-se no site oficial. */}
                <div data-saldo="eco-quildo" style={{
                  padding: "0.65rem 0.75rem", borderRadius: "12px",
                  background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.25)",
                }}>
                  <div style={{ fontSize: "0.7rem", color: COR.text, fontWeight: 700 }}>🪙 ECOQUILDO</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 900, color: COR.gold, lineHeight: 1.2 }}>
                    {textoSaldo(saldoEco, ecoCarregando, ecoErro)}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: COR.text, opacity: 0.85, marginTop: "0.25rem" }}>
                    Usável no site oficial
                  </div>
                </div>
              </div>
              {pontosErro && (
                <p style={{ margin: "-0.5rem 0 0.8rem", fontSize: "0.72rem", color: COR.danger, lineHeight: 1.4 }}>
                  ⚠️ Não foi possível ler seus pontos e créditos agora.
                </p>
              )}
              {ecoErro && (
                <p data-erro-eco-quildo="" style={{ margin: "-0.5rem 0 0.8rem", fontSize: "0.72rem", color: COR.danger, lineHeight: 1.4 }}>
                  ⚠️ {ecoErro === "Sessão expirada" ? "Sessão expirada." : "Não foi possível ler seu ECOQUILDO agora."}
                </p>
              )}

              {/* UTAC110f-front — «Missões de hoje»: DENTRO do 1.º vidro (Regra 1), a seguir aos 3 saldos e antes dos
                  botões. Só visualização (sem botão — não há acção aqui). Os 3 saldos acima NÃO foram tocados. */}
              <section data-missoes-hoje="" data-estado={estadoMissoes} aria-labelledby="missoes-hoje-titulo" style={{
                padding: "0.65rem 0.75rem", borderRadius: "12px", marginBottom: "0.95rem",
                border: "1px solid rgba(245,166,35,0.25)",
              }}>
                <h4 id="missoes-hoje-titulo" style={{
                  margin: "0 0 0.45rem", fontSize: "0.75rem", color: COR.gold, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>🎯 Missões de hoje</h4>
                {estadoMissoes !== "ok" ? (
                  <p style={{ margin: 0, fontSize: "0.8rem", color: COR.text, opacity: 0.85 }}>
                    {estadoMissoes === "carregando" ? "…" : "—"}
                  </p>
                ) : (
                  <>
                    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.35rem", maxWidth: "26rem" }}>
                      {MISSOES.map((m) => (
                        <li
                          key={m.id}
                          data-missao={m.id}
                          data-feito={m.feito ? "true" : "false"}
                          style={{ display: "flex", alignItems: "center", gap: "0.55rem", fontSize: "0.8rem", lineHeight: 1.4 }}
                        >
                          <span aria-hidden="true" style={{
                            width: "1.25rem", textAlign: "center", flex: "none", fontWeight: 900,
                            color: m.feito ? COR.gold : COR.muted,
                          }}>{m.feito ? "✓" : "⏳"}</span>
                          <span style={{ flex: 1, minWidth: 0, color: COR.text, opacity: m.feito ? 1 : 0.85 }}>
                            {m.rotulo}
                            <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                              {m.feito ? " — feito" : " — pendente"}
                            </span>
                          </span>
                          <span style={{ flex: "none", fontWeight: 800, color: m.feito ? COR.gold : COR.muted }}>
                            +{m.pontos}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p data-missoes-rodape="" style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: COR.text, opacity: 0.85 }}>
                      {`Você ganhou ${missoesHoje.pontosHoje} pontos hoje.`}{todasFeitas ? " Volte amanhã!" : ""}
                    </p>
                  </>
                )}
              </section>

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
                    // UTAC109h.2 — amarelo único `#f5a623` (era ciano): o destaque do depósito usa o mesmo tom do app.
                    ...botaoPrimario,
                    background: "rgba(245,166,35,0.14)",
                    border: "1px solid rgba(245,166,35,0.4)",
                    color: COR.pix,
                    boxShadow: "none",
                  }}
                  title="Depósito PIX → +R$ (crédito automático após aprovação MP)"
                >
                  💰 Depositar PIX
                </button>
                <button
                  type="button"
                  onClick={() => { setErroPasse(""); setPasseAberto(true); }}
                  style={{
                    ...botaoPrimario,
                    // UTAC109h.3 (decisão do operador, 2026-10-09) — este botão deixou de ser
                    // DOURADO SÓLIDO e passa ao MESMO padrão amarelo dos restantes botões do ecrã
                    // («Depositar PIX», «Menor Lance Único», «Ofertas Programadas»): tingido
                    // `rgba(245,166,35,0.14)` + contorno `rgba(245,166,35,0.4)` + texto amarelo.
                    // Substitui a decisão 5 do UTAC107b (dourado cheio + navy — que era o que
                    // destoava). O `ON_GOLD` mantém-se definido (contrato do UTAC106c) mas já não
                    // é usado por nenhum CTA.
                    background: "rgba(245,166,35,0.14)",
                    border: "1px solid rgba(245,166,35,0.4)",
                    color: COR.gold,
                    boxShadow: "none",
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
                    // MC48 P2 — âmbar suave (CTA de lance). UTAC106c — passa a «Menor Lance Único».
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

      {/* UTAC106e — BALÃO do Passe Desafio. UTAC110d-front — passa a ESCOLHER entre os dois
          Passes: cada cartão chama o SEU endpoint (`escolherPasse` → hook). Em sucesso o balão FECHA
          e os saldos relêem-se; em erro a mensagem fica DENTRO do balão (e no toast). */}
      <ComprarPasseModal
        aberto={passeAberto}
        emCurso={tipoEmCurso}
        erro={erroPasse}
        pontosCartao={saldosIlegiveis ? null : pontosCartao}
        onCancelar={() => { setErroPasse(""); setPasseAberto(false); }}
        onComprar={escolherPasse}
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
