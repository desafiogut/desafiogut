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

// UTAC109h (R18-A/C) — DUAS cores de destaque, as do título e da frase da aba MLC
// (`components/glass/glassTokens.js`): laranja `#ff6b35` (títulos, botão primário) e amarelo `#f5a623`
// (subtítulo, valor, botões secundário/terciário). Saíram o ciano do PIX, o 2.º amarelo `#fbbf24`, o
// verde e o roxo. `muted` é neutro (texto de apoio); `danger` fica SÓ para os estados de erro (R18-C).
// Contraste sobre o vidro (`rgba(13,18,53,.88)` ≈ `#0c1131`): laranja 6,50:1 · amarelo 9,09:1 · muted 4,61:1.
const COR = {
  primary: "#ff6b35", gold: "#f5a623", text: "#e8f0fe", muted: "#6b7db8",
  danger: "#ef4444",
};
// Texto sobre fundo cheio: branco sobre `#ff6b35` dá 2,84:1 (falha o AA); navy `#0a0f1a` dá 6,76:1
// sobre o laranja e 9,45:1 sobre o amarelo (UTAC107b). É o único texto usado sobre os botões cheios.
const ON_COR = "#0a0f1a";

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
  const sectionGap = isMobile ? "1.25rem" : "1.5rem";

  const cardCls = isMobile ? "p-4" : "p-5";
  // UTAC109h (R18-A) — cabeçalho no estilo da 2.ª secção do `GlassHeader` da OP (título Orbitron 800 a
  // laranja + subtítulo a amarelo), SEM login nem CNPJ. O título é o maior texto do 1.º vidro:
  // 24/28 px (era 13,6/14,08 px = 1,76×/1,99×) e o valor do saldo desce para 21,6/25,6 px (era 38,4/48),
  // para a hierarquia ser nome > valor > subtítulo (pedido do enunciado: «nome = elemento mais visível»).
  const TAM_TITULO = isMobile ? "1.5rem" : "1.75rem";
  const TAM_SUBTITULO = isMobile ? "0.9rem" : "1rem";
  const TAM_VALOR = isMobile ? "1.35rem" : "1.6rem";
  // UTAC109h (Frente B) — três tipos de botão, a mesma altura (≥ 48 px), raio e tipografia:
  //   primário  = fundo laranja cheio + texto navy (6,76:1);
  //   secundário = transparente + contorno e texto amarelo;
  //   terciário = só texto amarelo (sublinhado no hover).
  const botaoBase = {
    width: "100%", minHeight: "48px",
    padding: isMobile ? "0.75rem 1rem" : "0.7rem 1.2rem",
    borderRadius: "12px", fontWeight: "800", fontSize: "0.9rem", cursor: "pointer",
  };
  const botaoPrimario = { ...botaoBase, background: COR.primary, border: `1px solid ${COR.primary}`, color: ON_COR };
  const botaoSecundario = { ...botaoBase, background: "transparent", border: `1px solid ${COR.gold}`, color: COR.gold };
  const botaoTerciario = {
    display: "inline-flex", alignItems: "center", minHeight: "48px", minWidth: "48px",
    padding: 0, background: "none", border: "none", color: COR.gold,
    fontWeight: 700, cursor: "pointer", textAlign: "left",
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
          {/* MC99 (HARD GATE 2) — SEM `background` nem `borderColor` inline: .gut-glass-standard puro.
              UTAC109h (R18-A) — 1.º VIDRO = «quanto tenho + como carrego»: cabeçalho no estilo da OP
              (título laranja + subtítulo amarelo), valor do saldo e Depositar PIX. O que não é isso passou
              ao 2.º vidro (R18-B). Ficam aqui, por serem do saldo/depósito: o ↻, o aviso 402 (é falta de
              saldo → carregar), a nota do e-mail PIX (RESSALVA 5 do 107b) e o erro de leitura. */}
          <GlassCard data-vidro="saldo" className={`${cardCls} ${isMobile ? 'mb-5' : 'mb-6'}`}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                marginBottom: "0.75rem", gap: "0.5rem",
              }}>
                <div style={{ minWidth: 0 }}>
                  <h3 data-testid="titulo-carteira" style={{
                    margin: 0, fontFamily: "'Orbitron', sans-serif", fontWeight: 800, letterSpacing: "0.03em",
                    fontSize: TAM_TITULO, color: COR.primary, lineHeight: 1.2,
                  }}>Carteira</h3>
                  {/* MC99 — a etiqueta diz o que o número é. UTAC109h (R18-A) — passa a SUBTÍTULO no
                      estilo da frase da OP (amarelo, 700), sem maiúsculas. Texto inalterado. */}
                  <div data-testid="subtitulo-carteira" style={{
                    margin: "0.3rem 0 0", fontSize: TAM_SUBTITULO, fontWeight: 700,
                    color: COR.gold, letterSpacing: "0.01em",
                  }}>Saldo Disponível</div>
                </div>
                {/* MC99 (correcção do HARD GATE 4 — refutação do validador) — o botão
                    "↻ Atualizar saldo" vivia no card "Saldo de Senhas" e foi removido com
                    ele. Medido: NÃO tinha substituto nenhum — o auto-refresh é de 30 s
                    (AppContext: setInterval(refetchSaldo, 30000)). Vem para aqui, junta do
                    saldo a que diz respeito. A pílula «R$ OFF-CHAIN» saiu no UTAC107b (R18-E:
                    texto técnico desnecessário). UTAC109h — botão secundário (contorno amarelo). */}
                <button
                  type="button"
                  onClick={() => { try { refetchSaldo?.(); } catch {} }}
                  aria-label="Atualizar o saldo on-chain"
                  title="Ler o saldo on-chain agora (normalmente actualiza sozinho a cada 30 s)"
                  style={{
                    background: "transparent", border: `1px solid ${COR.gold}`,
                    borderRadius: "999px", color: COR.gold, cursor: "pointer",
                    fontSize: "1rem", lineHeight: 1,
                    minWidth: "48px", minHeight: "48px",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    flex: "none",
                  }}
                >
                  ↻
                </button>
              </div>

              <div
                data-testid="valor-saldo"
                className={saldoRsPendente ? "gut-valor-pendente" : undefined}
                style={{
                  fontSize: TAM_VALOR,
                  fontWeight: 900, color: COR.gold, lineHeight: 1.1,
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

              {/* UTAC109h (R18-A) — «como carrego»: o único botão do 1.º vidro, primário (laranja). */}
              <button
                type="button"
                onClick={() => setComprarAberto(true)}
                style={botaoPrimario}
                title="Depósito PIX → +R$ (crédito automático após aprovação MP)"
              >
                💰 Depositar PIX
              </button>

              {/* UTAC107b (Regra 1, decisão 6) — o aviso 402 estava FORA do vidro (solto por
                  baixo do «Indique e Ganhe»); passa para DENTRO do cartão de saldo, onde o
                  utilizador está. Conteúdo: «⚠️ Saldo insuficiente.» + atalho «Carregar agora (PIX)».
                  UTAC109h (R18-C) — o aviso continua VERMELHO (estado de erro); o atalho passa a botão
                  terciário amarelo com alvo de 48 px. */}
              {passeSemSaldo && (
                <div role="status" style={{
                  marginTop: "0.85rem", padding: "0.5rem 0.85rem", borderRadius: "10px",
                  background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.3)",
                  display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: "0.5rem",
                }}>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: COR.danger, lineHeight: 1.4, fontWeight: 700 }}>
                    ⚠️ Saldo insuficiente.
                  </p>
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() => { setPasseSemSaldo(false); setToastPasse(null); setPasseAberto(false); setComprarAberto(true); }}
                    style={{ ...botaoTerciario, fontSize: "0.82rem", fontWeight: 800 }}
                  >
                    Carregar agora (PIX)
                  </button>
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
                Depósito por PIX via Mercado Pago — <strong style={{ color: COR.gold }}>desafiogut@gmail.com</strong>{" "}
                (crédito automático após a aprovação). Custo de cada senha: R$ {VALOR_POR_SENHA_BRL.toFixed(2)} por edição (Art. 20).
              </p>

              {saldoRsStatus === "error" && (
                <p style={{ margin: "0.6rem 0 0", fontSize: "0.72rem", color: COR.danger, lineHeight: 1.4 }}>
                  ⚠️ Não foi possível ler o saldo R$ agora.
                </p>
              )}
            </GlassCard>

          {/* UTAC109h (R18-B) — 2.º VIDRO: o que sai do 1.º sem se perder. Ordem do UTAC107b (decisão 4)
              mantida para os três botões: Comprar Passe Desafio → Menor Lance Único → Ofertas Programadas.
              Comprar Passe = primário (é o único sítio de compra do Passe); MLC e OP = secundários. */}
          <GlassCard data-vidro="usar-saldo" className={`${cardCls} ${isMobile ? 'mb-5' : 'mb-6'}`}>
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: "0.6rem",
              }}>
                <button
                  type="button"
                  onClick={() => setPasseAberto(true)}
                  style={{ ...botaoPrimario, gridColumn: isMobile ? undefined : "1 / -1" }}
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
                  style={botaoSecundario}
                  title="Ir para o Menor Lance Único"
                >
                  ⚡ Menor Lance Único
                </button>
                <button
                  type="button"
                  onClick={irParaOfertasProgramadas}
                  style={botaoSecundario}
                  title="Abre as Ofertas Programadas (programa de fidelidade)"
                >
                  🎫 Ofertas Programadas
                </button>
              </div>

              {/* UTAC107g (Frente B) — as senhas on-chain (Via A) perderam o botão de troca
                  (107b) e o tile (107c). A casa delas passa a ser «Meus Ativos»; aqui fica só
                  um aviso DISCRETO, dentro do vidro, e só com senhas > 0.
                  UTAC109h (R18-B) — passa ao 2.º vidro e a botão terciário (amarelo, 48 px). */}
              {senhasAntigas > 0 && (
                <button
                  type="button"
                  data-indicador="senhas-antigas"
                  className="hover:underline"
                  onClick={() => navigate("/ativos")}
                  style={{ ...botaoTerciario, display: "flex", width: "100%", margin: "0.5rem 0 0", fontSize: "0.78rem" }}
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
