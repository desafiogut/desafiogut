import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAppContext, useAppTimer } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import GutoAvatar from "../components/GutoAvatar.jsx";
import FimEdicaoOverlay from "../components/FimEdicaoOverlay.jsx";
// UTAC000.17bc (17c) — participações do titular (endpoint `/minhas-participacoes` do UTAC000.17a).
import { useMinhasParticipacoes } from "../hooks/useMinhasParticipacoes.js";
// UTAC000.9 (DEBT-008) — resultado OFICIAL da edição (UTAC000.8). O card «Menor Lance Único»
// e o overlay de fim deixam de mostrar «o menor único que este browser viu».
import { useResultadoOficial } from "../hooks/useResultadoOficial.js";
// UTAC107c — pontos de CARTÃO do Passe Desafio (`GET /ler-pontos → pontosCartao`, Via B).
import { usePontos } from "../hooks/usePontos.js";
import GutoSpritePlayer from "../components/GutoSpritePlayer.jsx";
import CarrosselGUTO from "../components/CarrosselGUTO.jsx";
import StatTile from "../components/StatTile.jsx";
// UTAC108h.3 — o vidro ÚNICO das duas famílias (o mesmo da aba OP) e a zona de palpite.
import CartaoEdicao from "../components/CartaoEdicao.jsx";
import { usePalpite } from "../hooks/usePalpite.js";
import { edicoesProgramadasDe, estadoPalpite, PILULA } from "../lib/palpite.js";
import { EtiquetaMeuLance } from "../components/EtiquetaEstadoLance.jsx";
import { GlassCard } from "@/components/ui";
// MC88.43 — fonte única do estado da edição. Antes o cronómetro obedecia à trava
// EM_BREVE_MODE e o resto do card obedecia ao `encerrado`, e o título da secção
// dizia "em Andamento" à mão — três vozes no mesmo ecrã (B3/B4).
import { getEstadoEdicao } from "../utils/edicao.js";
// MC94.2 — edição especial (Air Fryer): card próprio com os seus 4 estados.
import CardEdicaoEspecial from "../components/edicao-especial/CardEdicaoEspecial.jsx";
import { escolherEspecial, ehEspecial } from "../components/edicao-especial/_estilo-especial.js";
import { useT } from "../context/IdiomaContext.jsx";

// MC94.2 — o CardLance só é preciso das 20:00 às 20:30 da especial. O /mercado,
// que o usa hoje, é lazy (App.jsx:44); importá-lo aqui de forma eager metê-lo-ia
// no chunk do primeiro ecrã de todos os utilizadores, todos os dias.
const CardLance = lazy(() => import("../components/CardLance.jsx"));

const COR = {
  primary: "#f5a623", primaryDim: "rgba(245,166,35,0.15)",
  gold: "#f5a623", goldDark: "#e89400",
  text: "#e8f0fe", muted: "#6b7db8",
  success: "#10b981", amber: "#fbbf24", danger: "#ef4444", warning: "#f97316",
};

// 3 estágios de cor proporcionais à duração (escala para flash 30min e programado 24h).
function timerColor(tempoRestante, totalSegundos) {
  const total = Number.isFinite(totalSegundos) && totalSegundos > 0 ? totalSegundos : 1800;
  const ratio = tempoRestante / total;
  if (ratio > 0.6) return COR.success;   // verde   (>60% restante)
  if (ratio > 0.3) return COR.warning;   // laranja (30–60% restante)
  return COR.danger;                      // vermelho (<30% restante)
}

const VALOR_POR_SENHA_BRL = 2;

// UTAC107g (R18-A) — saíram «Depositar PIX», «Converter Ficha» e «Dar Lance»: o destino de
// cada um (/carteira, /mercado) já é uma aba da barra principal E já tem, neste mesmo ecrã,
// outro elemento que leva lá (KPI «Saldo», CTA da Edição Ativa). «Converter Ficha» ainda
// prometia a troca R$→senha que o UTAC107b tirou da Carteira. Ficam os atalhos para destinos
// que, no telemóvel, só existem dentro do «Mais» (1 toque em vez de 2).
const ATALHOS = [
  { label: "Vitrine 4 Slots",   icon: "🪟", to: "/vitrine"       },
  { label: "Meus Ativos",       icon: "📊", to: "/ativos"        },
  // UTAC108f (R18) — saiu o atalho «🤝 Seja Nosso Parceiro» (o lojista saiu do app).
  { label: "Configurações",     icon: "⚙️", to: "/configuracoes" },
];

/**
 * UTAC107c — estado do tile «Passe Desafio»: "sem-sessao" | "carregando" | "erro" | "vazio" | "dados".
 *
 * ⚠️ Achado do validador adversarial: sem `address`+`authToken` o `usePontos` devolve a forma
 * VAZIA com `loading:false`. Quando o par fica completo (login; refresh com o token em cache e o
 * `address` a chegar depois) ou muda (troca de conta), há UM commit em que o hook ainda não voltou
 * a pedir — `loading:false`, `pontosCartao:0` — e o tile diria «0 / 50» antes de tempo (decisão 8).
 * `memo` (um `useRef` da página) lembra o par: depois de um par incompleto ou de outro par, só se
 * aceitam números quando o hook tiver mostrado `loading:true` para o par actual.
 * Num mount com o par já completo o hook real começa em `loading:true`, logo não há espera a mais.
 */
export function estadoPasse(memo, { address, authToken, loading, erro, pontosCartao }) {
  if (!address || !authToken) {
    memo.chave = null;
    memo.pendente = true;
    return address ? "carregando" : "sem-sessao";
  }
  const chave = `${String(address).toLowerCase()}|${authToken}`;
  if (memo.chave === null) memo.chave = chave;
  else if (memo.chave !== chave) { memo.chave = chave; memo.pendente = true; }
  if (loading) { memo.pendente = false; return "carregando"; }
  if (memo.pendente) return "carregando";
  if (erro) return "erro";
  if (!Number.isSafeInteger(pontosCartao) || pontosCartao < 0) return "erro"; // nunca «NaN / 50»
  return pontosCartao > 0 ? "dados" : "vazio";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    lances, vencedor,
    saldoRsCentavos, saldoRsStatus,
    encerrado, modalidade, DURACAO,
    // MC88.38 — `pareceAutenticado` substitui `isConnected` APENAS no texto do
    // cabeçalho. `isConnected` deixou de ser usado neste ficheiro; continua a
    // ser a fonte única para HABILITAR ações nos componentes que o fazem
    // (CardLance, AuthArea, MercadoLances, …), que não foram tocados.
    pareceAutenticado,
    address, userLabel, EDICAO_ATIVA,
    showOverlay, showCountdown, handleNovaRodada, setPrazoTimestamp,
    authToken, fecharOverlay, // UTAC000.17bc (17c) — token das participações e saída explícita do overlay
    edicoes,
    // MC94.2 — edição especial: `agendadas` antes da hora, `offsetRelogioMs`
    // para a contagem na hora do servidor; o resto é para o CardLance dela.
    agendadas, offsetRelogioMs, isConnected, ready, abrirModal, desconectar,
  } = useAppContext();
  // UTAC000.17bc (17c/GATE 21) — em que EDIÇÕES o titular deu lance (filtrado pelo token, no servidor).
  const { participacoes } = useMinhasParticipacoes(authToken);
  // UTAC107c — o tile «Passe Desafio» conta SÓ os pontos de CARTÃO (R1 do UTAC106f: o bónus
  // do palpite não entra). NÃO é o `saldoSenhas` (Via A, senhas on-chain) nem o `pontos` total.
  const {
    pontosCartao, pontosParaCartao, palpites,
    loading: pontosLoading, erro: pontosErro,
  } = usePontos();
  // UTAC108h.3 — a zona de PALPITE do vidro «🎫 Programada» do Início usa o MESMO hook e as MESMAS
  // regras da aba Ofertas Programadas (uma só verdade sobre quando se pode palpitar).
  const [valorPalpite, setValorPalpite] = useState("");
  const { registar: registarPalpite, loading: aPalpitar, erro: erroPalpite } = usePalpite(null);

  // ── UTAC000.9 (DEBT-008) — O VENCEDOR MOSTRADO É O OFICIAL QUANDO EXISTE ──────────
  // O `vencedor` do contexto é derivado dos lances que ESTE browser viu (em mainnet: nada, ou
  // só os do próprio). Com o resultado OFICIAL — `resultados()` on-chain, escrito pela
  // consolidação, que é quem decide o vencedor — é ELE que manda. Sem resultado oficial
  // (leilão a decorrer, edição por consolidar, rede em baixo) mantém-se o apuramento local:
  // exactamente o comportamento anterior, zero regressões (GATE 18).
  // A FORMA é a mesma que o card e o `FimEdicaoOverlay` já esperam ({ endereco, valor }) —
  // por isso nenhum deles precisa de mudar.
  const resultadoOficial = useResultadoOficial(EDICAO_ATIVA);
  const vencedorExibido = resultadoOficial
    ? { endereco: resultadoOficial.vencedor, valor: resultadoOficial.menorUnicoCentavos }
    : vencedor;
  // UTAC107c — o card «🏆 Menor Lance Único» saiu do Início (redundante com a aba do BottomNav;
  // R18-A do UTAC107a-front). O `vencedorExibido` continua a alimentar o `FimEdicaoOverlay`, que
  // tem a sua própria guarda do valor (UTAC000.14, DEBT-013). A guarda do valor do card
  // (UTAC000.12, DEBT-012) saiu com o card.
  const { tempoRestante } = useAppTimer(); // MC44 P0 — timer isolado
  const t = useT();

  // MC94.2 — a especial a mostrar (ou nenhuma). Escolhida na hora do servidor;
  // o card tem o seu próprio relógio de 1 s, o Dashboard não re-renderiza por ele.
  const edicaoEspecial = escolherEspecial(
    edicoes, agendadas, Date.now() + (Number.isFinite(offsetRelogioMs) ? offsetRelogioMs : 0),
  );

  // MC15.4 ITEM 7 — edições adicionais (todas menos R-1, que já tem o card
  // "Edição Ativa" abaixo). Cada uma renderiza um cronómetro independente.
  // MC94.2 — e menos as ESPECIAL-*: às 20:00 a especial passa para `edicoes` e
  // seria desenhada duas vezes (card especial + EdicaoCard com "EM BREVE").
  //
  // ⚠️ A ESPECIAL fica de fora: ela ocupa o vidro «⚡ Relâmpago» (slot da edição ativa, MC94.2).
  // Sem esta exclusão apareceria duas vezes no ecrã — medido num teste que conta o produto.
  const edicaoProgramada = edicoesProgramadasDe(edicoes).filter((e) => !ehEspecial(e.id))[0] ?? null;
  /** Regista o palpite da edição programada mostrada (mesma regra da OP: inteiro >= 0). */
  async function palpitar(edicaoId) {
    const valor = Number.parseInt(String(valorPalpite ?? "").trim(), 10);
    const r = await registarPalpite(valor, edicaoId);
    if (r?.ok) setValorPalpite("");
  }
  const estProgramada = edicaoProgramada ? getEstadoEdicao(edicaoProgramada) : null;
  const palpiteDoUsuario = edicaoProgramada ? (palpites?.[edicaoProgramada.id] ?? null) : null;
  const estadoPal = edicaoProgramada ? estadoPalpite(edicaoProgramada, palpiteDoUsuario) : null;

  // MC45 — edição ativa (objeto) para o banner clicável. Fallback defensivo
  // garante sempre um id navegável mesmo antes de o mapa hidratar.
  const edicaoAtiva = (edicoes && edicoes[EDICAO_ATIVA]) || {
    id: EDICAO_ATIVA,
    tipo: modalidade === "flash" ? "relampago" : "programado",
  };

  // MC88.43 — estado da R-1. `encerrado` (FONTE A: prazoTimestamp on-chain) é
  // passado como veredito e a fonte única decide o que se mostra. O /mercado faz
  // exatamente esta chamada com o mesmo `encerrado` — é isso que fecha o B4.
  const estAtiva = getEstadoEdicao(edicaoAtiva, { encerrado });

  // MC88.40 — o estado "stale" deixou de ter sufixo textual. " (antigo)" era
  // jargão interno do MC88.34 exposto ao utilizador, e as alternativas textuais
  // não cabiam no tile (medido: 145 px contra 121 px disponíveis → seriam
  // cortadas). Passa a ser sinalizado por opacidade — ver `.gut-valor-pendente`
  // em globals.css. "loading" e "error" mantêm os seus ícones: são estados
  // diferentes e ocupam um caractere.
  const statusRsSuffix =
    saldoRsStatus === "loading" ? " ⏳" :
    saldoRsStatus === "error"   ? " ✗" : "";

  const totalLances  = lances.length;
  const lancesUnicos = lances.filter((l) => !l.repetido).length;
  const timerDisplay = (() => {
    const t = Math.max(0, tempoRestante);
    const d = Math.floor(t / 86400);
    const h = Math.floor((t % 86400) / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    const pad = (n) => String(n).padStart(2, "0");
    if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  })();

  // Modelo dual (Frente B.9): "Saldo (R$)" = saldo-rs blob (PIX → +R$,
  // comprar-senhas → -R$, lance-relâmpago → -R$). "Senhas" = saldoSenhas
  // on-chain. Os dois nunca derivam um do outro — sem duplicação.
  const saldoReais = saldoRsCentavos == null ? null : saldoRsCentavos / 100;
  const saldoReaisStr = saldoReais == null
    ? `R$ —${statusRsSuffix}`
    : `R$ ${saldoReais.toFixed(2)}${statusRsSuffix}`;

  // UTAC107c — tile «Passe Desafio» (era «Senhas», Via A). Mostra os pontos de CARTÃO «X / 50»
  // e leva às Ofertas Programadas (mockup `docs/mockups-107a/inicio.html`, variante A — R18-B
  // do UTAC107c: sem barra de progresso). Estados (decisões 8 e 9 do operador):
  //   • sem conta                    → «—» (não há pontos de ninguém a mostrar)
  //   • a carregar / sessão a cunhar → skeleton (o `usePontos` devolve 0 enquanto o `authToken`
  //                                    não chega — mostrar «0 / 50» nesse intervalo seria falso)
  //   • erro                         → «—» (o número fica oculto)
  //   • 0 pontos                     → «0 / 50» + convite para começar
  const metaCartao = Number.isSafeInteger(pontosParaCartao) && pontosParaCartao > 0 ? pontosParaCartao : 50;
  const passeMemo = useRef({ chave: null, pendente: false });
  const passeEstado = estadoPasse(passeMemo.current, {
    address, authToken, loading: pontosLoading, erro: pontosErro, pontosCartao,
  });
  const passeValor = passeEstado === "carregando"
    // As classes são as do `Skeleton` (ui/Skeleton.jsx), num <span>: o valor vive dentro de um
    // <button>, onde um <div> seria HTML inválido.
    ? <span data-testid="passe-skeleton" aria-hidden="true" className="inline-block animate-pulse rounded-lg bg-white/[0.06] border border-white/5" style={{ width: "4.5rem", height: "1.2em" }} />
    : (passeEstado === "dados" || passeEstado === "vazio")
      ? `${pontosCartao} / ${metaCartao}`
      : "—";
  const passeStat = {
    label: passeEstado === "vazio" ? "Passe Desafio · comece já" : "Passe Desafio",
    value: passeValor, color: COR.gold, icon: "🎟️", to: "/ofertas-programadas",
  };

  const stats = [
    { label: "Saldo (R$)",      value: saldoReaisStr,                    color: COR.gold,    icon: "💰", to: "/carteira", pendente: saldoRsStatus === "stale" },
    passeStat,
    { label: "Lances Únicos",   value: lancesUnicos,                     color: COR.success, icon: "✅", to: "/mercado"  },
    { label: "Total de Lances", value: totalLances,                      color: COR.amber,   icon: "📊", to: "/ativos"   },
  ];

  const cardPad   = isMobile ? "1rem" : "1.25rem";
  const sectionGap = isMobile ? "1.25rem" : "2rem";
  const innerGap   = isMobile ? "0.75rem" : "1rem";

  // MC23.3 — GlassCard primitivo substitui o objeto inline card.
  const cardCls = isMobile ? "p-4" : "p-5";
  const cardTitulo = {
    margin: `0 0 ${isMobile ? "0.75rem" : "1rem"}`,
    fontSize: "0.85rem",
    fontWeight: "800",
    color: COR.gold,
    letterSpacing: "0.04em",
    fontFamily: "'Orbitron', sans-serif",
  };

  return (
    <div style={{ padding: cardPad, flex: 1 }}>
      {/* ── Saudação ── (MC43: entrada pelo wrapper do Layout · MC48 P1: em Glass) */}
      <motion.header
        className="gut-glass-standard"
        style={{
          marginBottom: sectionGap,
          padding: isMobile ? "1.25rem 1rem" : "1.5rem",
        }}
      >
        {/* MC58.1 — proporção da REFERÊNCIA (REFERENCIA DE PROPORÇOES GUTO E LOGO):
            linha de cima = GUTO (esq) + logo (dir), larguras semelhantes, logo
            centrado na vertical; a saudação fica ABAIXO de ambos, horizontal
            (NÃO entre o GUTO e o logo). */}
        <div style={{
          display: "flex",
          flexWrap: "nowrap",
          alignItems: "center",
          justifyContent: "center",
          gap: isMobile ? "1.25rem" : "2.5rem",
          marginBottom: isMobile ? "0.75rem" : "1rem",
        }}>
          {/* GUTO animado (imagem 1) a flutuar na glass */}
          <CarrosselGUTO size={isMobile ? 116 : 176} />

          {/* Logo Grupo União e Trabalho — largura ~igual à do GUTO (referência) */}
          <img
            src="/assets/guto/logo-uniao-trabalho.png"
            alt="Grupo União e Trabalho"
            style={{
              height: isMobile ? 76 : 116,
              width: "auto",
              objectFit: "contain",
              flexShrink: 0,
              display: "block",
            }}
          />
        </div>

        {/* Saudação — horizontal, ABAIXO do GUTO e do logo, largura total */}
        <div style={{ textAlign: "center" }}>
          <h1 style={{
            margin: "0 0 0.35rem",
            fontSize: isMobile ? "1rem" : "1.3rem",
            fontWeight: "900", color: COR.text,
            lineHeight: 1.2,
            wordBreak: "break-word",
          }}>
            {/* MC88.37 — `pareceAutenticado` inclui o estado "Privy ainda a
                restaurar, mas há sessão validada em disco". Sem isto, um
                utilizador já autenticado via "Faça login" durante ~1,6 s, com
                o saldo dele pintado ao lado. NÃO usar para habilitar ações. */}
            {pareceAutenticado
              ? `Olá, ${userLabel || (address ? address.slice(0, 8) + "..." : "Participante")}!`
              : "Bem-vindo ao DesafioGUT!"}
          </h1>
          <p style={{
            margin: 0,
            color: COR.muted,
            fontSize: isMobile ? "0.75rem" : "0.85rem",
            lineHeight: 1.4,
          }}>
            {/* MC88.38 — tem de acompanhar o <h1> acima. Se só o título usasse
                `pareceAutenticado`, o ecrã passaria a dizer "Olá, Fulano!" com
                "Faça login para participar" logo por baixo — trocando uma
                contradição por outra. */}
            {pareceAutenticado
              ? "Acompanhe seus dados e acesse o mercado de lances."
              : "Faça login para participar e dar seu lance agora."}
          </p>
        </div>
      </motion.header>

      {/* ── KPIs ── */}
      <section style={{
        display: "grid",
        gridTemplateColumns: isMobile
          ? "repeat(2, minmax(0, 1fr))"
          : "repeat(auto-fit, minmax(160px, 1fr))",
        gap: innerGap,
        marginBottom: sectionGap,
      }}>
        {stats.map(({ label, value, color, icon, to, pendente }) => (
          <StatTile key={label} label={label} value={value} color={color} icon={icon} to={to} pendente={pendente} />
        ))}
      </section>

      {/* ── UTAC108h.3 — APENAS AS DUAS EDIÇÕES (decisão do operador, 2026-10-08) ─────────────
          O Início mostra só DOIS vidros, um por família: «⚡ Relâmpago» e «🎫 Programada».
          Saíram: o vidro separado «🎯 Edição Ativa» (e o seu h3), os títulos soltos das
          prateleiras, o carrossel de «Outras Edições» e o vidro de estado vazio.
          O casco é o MESMO das duas abas (`CartaoEdicao`, UTAC108e.1): topo (id + estado) →
          produto (arte + nome) → tempo → ACÇÃO. Entre os dois vidros só muda a acção — e ela vive
          DENTRO do vidro: o lance no Relâmpago, o palpite na Programada. Sem edição, o vazio vive
          DENTRO do vidro (Regra 1), nunca num vidro solto. */}
      <section data-testid="vidros-inicio" style={{ display: "grid", gap: innerGap, marginBottom: sectionGap }}>

        {/* VIDRO 1 · ⚡ Relâmpago — mostra a edição VIVA (a ativa). Decisão declarada: encher este
            vidro com as Relâmpago já ENCERRADAS tiraria do Início a porta de entrada do lance, o
            que parte um caso legítimo. A edição ESPECIAL (MC94.2/94.3.1) continua a ocupar este
            lugar, como sempre ocupou o slot da edição ativa. */}
        {edicaoEspecial ? (
          <CardEdicaoEspecial
            edicao={edicaoEspecial}
            offsetMs={offsetRelogioMs}
            isMobile={isMobile}
            t={t}
            renderLance={({ idEdicao, modalidade, encerrado: fechada }) => (
              <Suspense fallback={<div aria-busy="true" style={{ minHeight: "12rem" }} />}>
                <CardLance
                  idEdicao={idEdicao}
                  modalidade={modalidade}
                  encerrado={fechada}
                  address={address}
                  isConnected={isConnected}
                  onConnect={abrirModal}
                  onDisconnect={desconectar}
                  ready={ready}
                />
              </Suspense>
            )}
          />
        ) : (
          <CartaoEdicao
            id={edicaoAtiva.id}
            titulo="⚡ Relâmpago"
            estado={{ texto: estAtiva.rotulo, cor: estAtiva.cor }}
            produto={edicaoAtiva.produto}
            arteUrl={edicaoAtiva.imagem_url}
            tempo={estAtiva.timer ?? timerDisplay}
            tempoRotulo={estAtiva.encerrada ? "Encerrada" : "Termina em"}
            destaque
            isMobile={isMobile}
          >
            {/* UTAC107e.2 (Frente B) — etiqueta do PRÓPRIO lance na Edição Ativa, só com a edição
                encerrada no ecrã (fonte única MC88.43) E consolidada no servidor. Veio do card
                «Edição Ativa» que o UTAC108h.3 substituiu; fica no vidro da família Relâmpago,
                que é o vidro da edição ativa. */}
            {estAtiva.encerrada && (
              <div style={{ display: "flex", justifyContent: "center", margin: "0 0 0.75rem" }}>
                <EtiquetaMeuLance edicaoId={EDICAO_ATIVA} encerrado authToken={authToken} />
              </div>
            )}
            <button
              onClick={() => navigate("/mercado")}
              style={{
                padding: "0.7rem 1rem",
                background: estAtiva.encerrada
                  ? "rgba(245,166,35,0.18)"
                  : "linear-gradient(135deg,#f5a623,#e89400)",
                border: "none", borderRadius: "10px",
                color: estAtiva.encerrada ? COR.gold : "#0a0f1a",
                fontWeight: "800", cursor: "pointer",
                fontSize: "0.88rem", width: "100%",
                fontFamily: "'Orbitron', sans-serif",
                letterSpacing: "0.04em",
                boxShadow: estAtiva.encerrada ? "none" : "0 4px 18px rgba(245,166,35,0.40)",
              }}
            >
              ⚡ Dar lance
            </button>
          </CartaoEdicao>
        )}

        {/* VIDRO 2 · 🎫 Programada — o MESMO casco, com a zona do palpite em baixo, DENTRO do vidro.
            As regras (`estadoPalpite`/`PILULA`) e a acção (`usePalpite`) são as MESMAS da aba
            Ofertas Programadas — uma só verdade sobre quando se pode palpitar. */}
        <CartaoEdicao
          id={edicaoProgramada?.id}
          titulo="🎫 Programada"
          estado={estadoPal ? { texto: PILULA[estadoPal].texto, cor: PILULA[estadoPal].cor } : undefined}
          produto={edicaoProgramada?.produto}
          arteUrl={edicaoProgramada?.imagem_url}
          tempo={estProgramada ? (estProgramada.timer ?? estProgramada.rotuloLongo) : undefined}
          tempoRotulo={estProgramada?.encerrada ? "Encerrada" : "Termina em"}
          vazio={!edicaoProgramada}
          mensagemVazio="Nenhuma edição Programada em andamento"
          ajudaVazio="Próxima edição —"
          destaque
          isMobile={isMobile}
        >
          {edicaoProgramada && estadoPal === "sem_palpite" && (
            <div data-testid="palpite-zona">
              <label htmlFor="palpite-inicio" style={{ display: "block", color: COR.text, fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.35rem" }}>
                Seu palpite (nº de lances)
              </label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <input
                  id="palpite-inicio" type="number" inputMode="numeric" min="0" step="1"
                  value={valorPalpite}
                  onChange={(e) => setValorPalpite(e.target.value)}
                  placeholder="Ex.: 120"
                  style={{ flex: "1 1 120px", minHeight: "48px", padding: "0.6rem 0.75rem", borderRadius: "10px", border: "1px solid rgba(107,125,184,0.45)", background: "rgba(12,16,24,0.55)", color: COR.text, fontSize: "0.9rem" }}
                />
                <button
                  type="button" onClick={() => palpitar(edicaoProgramada.id)} disabled={aPalpitar}
                  style={{ minHeight: "48px", padding: "0.6rem 1.1rem", borderRadius: "10px", cursor: aPalpitar ? "wait" : "pointer", border: "none", background: aPalpitar ? "rgba(107,125,184,0.35)" : COR.gold, color: "#12161f", fontWeight: 800, fontSize: "0.86rem" }}
                >
                  {aPalpitar ? "Enviando…" : "Palpitar"}
                </button>
              </div>
              {erroPalpite && (
                <p role="alert" style={{ margin: "0.4rem 0 0", color: "#ff8a8d", fontSize: "0.78rem" }}>{erroPalpite}</p>
              )}
              <p style={{ margin: "0.4rem 0 0", color: COR.muted, fontSize: "0.76rem" }}>
                O palpite dá +2 pontos de bónus. Não decide o cartão.
              </p>
            </div>
          )}
          {edicaoProgramada && estadoPal === "com_palpite" && (
            <p data-testid="palpite-feito" style={{ margin: 0, color: "#3ddc84", fontWeight: 700, fontSize: "0.86rem" }}>
              Seu palpite: {palpiteDoUsuario?.valor} lances
            </p>
          )}
          {edicaoProgramada && estadoPal === "abre_em_breve" && (
            <p style={{ margin: 0, color: COR.muted, fontSize: "0.82rem" }}>O palpite abre quando a edição começar.</p>
          )}
          {edicaoProgramada && estadoPal === "encerrada" && (
            <p style={{ margin: 0, color: COR.muted, fontSize: "0.82rem" }}>Edição encerrada.</p>
          )}
        </CartaoEdicao>
      </section>

      {/* ── Atalhos ── */}
      <GlassCard as="section" className={cardCls}>
        <h3 style={cardTitulo}>🚀 Acesso Rápido</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "0.5rem",
        }}>
          {ATALHOS.map(({ label, icon, to }) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              style={{
                display: "flex", alignItems: "center", gap: "0.45rem",
                padding: "0.65rem 0.85rem",
                background: "rgba(245,166,35,0.08)",
                border: "1px solid rgba(245,166,35,0.22)",
                borderRadius: "10px",
                color: COR.gold,
                cursor: "pointer",
                fontSize: "0.8rem", fontWeight: "600",
                transition: "all 0.15s",
                textAlign: "left",
                minWidth: 0,
              }}
            >
              <span style={{ fontSize: "0.95rem", flexShrink: 0 }}>{icon}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
            </button>
          ))}
        </div>
      </GlassCard>

      {/* MC16 — overlay de fim de leilão (relâmpago e programado) */}
      {showOverlay && (
        <FimEdicaoOverlay
          vencedor={vencedorExibido}
          modalidade={modalidade}
          onNovaRodada={handleNovaRodada}
          EDICAO_ATIVA={EDICAO_ATIVA}
          participacoes={participacoes}
          meuEndereco={address}
          onClose={fecharOverlay}
        />
      )}

      {/* MC16 — botões temporários de teste do cronómetro (DEV only) */}
      {import.meta.env.DEV && (
        <div style={{
          position: "fixed", bottom: "80px", right: "16px", zIndex: 9999,
          display: "flex", gap: "6px", flexWrap: "wrap",
          background: "rgba(0,0,0,0.85)", padding: "10px 12px",
          borderRadius: "12px", border: "1px solid rgba(255,107,53,0.35)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}>
          {[
            { label: "5s",  sec: 5 },
            { label: "10s", sec: 10 },
            { label: "30s", sec: 30 },
            { label: "1min", sec: 60 },
            { label: "2min", sec: 120 },
          ].map(({ label, sec }) => (
            <button
              key={sec}
              onClick={() => {
                const novo = Math.floor(Date.now() / 1000) + sec;
                setPrazoTimestamp(novo);
              }}
              style={{
                background: "linear-gradient(135deg, #ff6b35, #e55a25)",
                color: "#fff", border: "none",
                padding: "5px 10px", borderRadius: "6px",
                cursor: "pointer", fontWeight: "bold", fontSize: "12px",
                whiteSpace: "nowrap",
              }}
            >{label}</button>
          ))}
          <span style={{
            color: "#ff6b35", fontSize: "10px", fontWeight: 700,
            display: "flex", alignItems: "center", marginLeft: "4px",
            letterSpacing: "0.04em",
          }}>⏱️ TESTE</span>
        </div>
      )}

      {/* ── Footer info ── */}
      <footer style={{
        marginTop: sectionGap,
        paddingTop: "1rem",
        borderTop: "1px solid rgba(245,166,35,0.08)",
        textAlign: "center",
        fontSize: "0.7rem",
        color: "#6b7db8",
        lineHeight: 1.5,
      }}>
        DesafioGUT · Grupo União e Trabalho
        <br />
        CNPJ 23.040.066/0001-00
      </footer>
    </div>
  );
}
