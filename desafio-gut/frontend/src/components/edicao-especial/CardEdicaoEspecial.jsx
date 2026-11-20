// CardEdicaoEspecial — MC94.2 / MC94.3.1 / UTAC138. O CORPO da edição especial.
//
// ⭐ UTAC138 (decisão do operador, 2026-11-18): «a edição deve aparecer em Menor Lance Único e em Início, ocupando o
// espaço da edição relâmpago … todas as edições entram nesse padrão que já temos no layout de edições». O invólucro
// visual passou a ser o `CartaoEdicao` (o cartão ÚNICO das edições, UTAC108e.1/109e: topo id + estado → ARTE na largura
// toda com nome e tempo na faixa → ACÇÃO). Saíram a caixa amarela com o ícone pequeno e o GUTO ao lado do cronómetro
// (layout próprio do MC94.3.1). A LÓGICA não mudou: estados, hora do servidor, contagem, formulário e resultado.
// O mesmo componente é montado no vidro «⚡ Relâmpago» do Início e no cartão da aba Menor Lance Único.
//
// (histórico) desenhado
// para viver DENTRO do slot "🎯 Edição Ativa" do Dashboard.
//
// ⚠️ MC94.3.1 (adendo do operador, 2026-09-25) — REVERSÃO DO DESIGN DO MC94.2.
// O MC94.2 montou a especial numa SECÇÃO PRÓPRIA entre "Edição Ativa" e "Outras
// Edições". Foi um erro: a especial tem de PREENCHER O SLOT EXISTENTE. Este
// componente deixou de ser uma <section> e passou a ser o corpo que o Dashboard
// monta lá dentro, no lugar do conteúdo da R-1:
//
//   caixa amarela (a MESMA da R-1, ícone de presente no TAMANHO PADRÃO — MC94.3.2)
//   ↓
//   GUTO (o mesmo componente do Dashboard) + o cronómetro/informações ao lado
//   ↓
//   o formulário de lance DESTA edição (activa) ou o painel do vencedor (encerrada)
//
// Os quatro estados (agendada · a_abrir · activa · encerrada) e TODA a lógica de
// hora-do-servidor vêm do MC94.2, sem alteração.
//
// ⚠️ O FORMULÁRIO NÃO É UM LINK PARA /mercado. O /mercado monta o `CardLance`
// com `EDICAO_ATIVA = "R-1"` fixo: um botão "Dar lance" que navegasse para lá
// mandaria o lance para a edição errada. O Dashboard passa `renderLance`, que
// monta o `CardLance` existente com o id da especial e `tipoLeilao="flash"`
// (decisão D1 do MC94.1: cada lance gasta 1 senha).
//
// ⚠️ Estado e contagem usam a hora do SERVIDOR (`offsetMs`, calculado pelo
// `useEdicoes` a cada fetch). Sem offset ainda, a contagem mostra "…".
//
// ⚠️ O cabeçalho (título + badge de estado) vive AQUI e não no Dashboard: é o que
// identifica o slot como sendo da especial. O Dashboard não desenha o cabeçalho
// da R-1 quando este componente ocupa o slot.

import { useEffect, useState } from "react";
import CartaoEdicao from "../CartaoEdicao.jsx"; // UTAC138 — o padrão do layout de edições
import PainelVencedorEspecial from "./PainelVencedorEspecial.jsx";
import { useResultadoEspecial } from "./useResultadoEspecial.js";
import {
  COR, T_PADRAO, ESTADO_ESPECIAL, SELO_ESPECIAL, estadoEspecial, alvoDaContagem, formatarContagem,
} from "./_estilo-especial.js";


/**
 * Hora do SERVIDOR, a avançar de segundo a segundo — só dentro deste card.
 *
 * ⚠️ O tick vive AQUI e não no AppContext: o MC44 mediu que um relógio de 1 s no
 * contexto re-renderizava a app inteira. Aqui re-renderiza um card.
 * `agoraFixo` (testes/SSR) desliga o intervalo e fixa o instante.
 *
 * @param {number|null} offsetMs `Date.now() + offsetMs` = hora do servidor
 * @param {number} [agoraFixo]
 * @returns {number} ms no relógio do aparelho corrigido pelo offset (ou sem
 *   correcção enquanto o offset não chega — o card não mostra contagem nesse caso)
 */
function useAgoraServidor(offsetMs, agoraFixo) {
  const agoraAparelho = () => (agoraFixo ?? Date.now());
  const [aparelho, setAparelho] = useState(agoraAparelho);
  useEffect(() => {
    if (agoraFixo != null) return undefined;
    const id = setInterval(() => setAparelho(Date.now()), 1000);
    return () => clearInterval(id);
  }, [agoraFixo]);
  const base = agoraFixo ?? aparelho;
  return base + (Number.isFinite(offsetMs) ? offsetMs : 0);
}

// UTAC141 — o selo vive em `_estilo-especial.js` (`SELO_ESPECIAL`) porque a TABELA de lances o desenha
// também: uma só tabela de estados, para o cartão e a tabela não voltarem a divergir.
const BADGE = SELO_ESPECIAL;

// UTAC138 — a caixa amarela (`caixa`) e o `ROTULO` saíram com o layout próprio: o invólucro é o `CartaoEdicao`.

/**
 * Corpo da edição especial dentro do slot do Dashboard.
 *
 * @param {object} props
 * @param {object} props.edicao edição normalizada pelo useEdicoes (com inicio_em)
 * @param {number|null} props.offsetMs
 * @param {(p:{idEdicao:string, tipoLeilao:string, encerrado:boolean})=>import("react").ReactNode} props.renderLance
 * @param {boolean} [props.isMobile]
 * @param {(chave:string, fallback:string)=>string} [props.t]
 * @param {number} [props.agoraMs] instante fixo (testes)
 * @param {object} [props.resultadoEspecial] resultado já lido (testes); senão lê-se
 * @param {string} [props.titulo] nome da família no topo do vidro (o Início passa «⚡ Relâmpago»; a aba MLC não passa)
 */
export default function CardEdicaoEspecial({
  edicao, offsetMs, renderLance, isMobile = false, t = T_PADRAO, agoraMs,
  resultadoEspecial, titulo, onEstado,
}) {
  const agora = useAgoraServidor(offsetMs, agoraMs);
  const estado = estadoEspecial(edicao, agora);
  const encerrada = estado === ESTADO_ESPECIAL.ENCERRADA;
  const lido = useResultadoEspecial(edicao?.id, encerrada && !resultadoEspecial);

  // UTAC141 (achado ⚠️1 do validador) — o CARTÃO é o único que tem relógio (tick de 1 s). Quem desenha o
  // estado da MESMA edição noutro sítio (o selo da tabela) tem de ler daqui: uma fotografia do relógio na
  // página ficava 1 segundo atrasada no instante do fecho e os dois voltavam a divergir.
  useEffect(() => { onEstado?.(estado); }, [estado, onEstado]);

  if (!estado) return null;

  const resultado = resultadoEspecial ?? lido;
  const alvo = alvoDaContagem(edicao, estado);
  const restanteMs = Number.isFinite(offsetMs) && alvo != null ? alvo - agora : null;
  const badge = BADGE[estado];
  const produto = edicao.produto || t("edicao.especial.produto", "Produto especial");
  const semRelogio = !Number.isFinite(offsetMs);

  // UTAC138 (operador: «a edição precisa entrar no padrão que já temos, não ter um próprio») — o tempo vive na FAIXA
  // da arte, como em qualquer edição (`CartaoEdicao`): contagem até abrir, contagem até fechar, nada depois do fim.
  // Sem hora do servidor não se mostra contagem («…»): o relógio do aparelho pode estar adiantado (achado do MC94.2).
  let tempo = null;
  if (estado !== ESTADO_ESPECIAL.ENCERRADA) tempo = semRelogio ? "…" : formatarContagem(restanteMs);
  // UTAC140 (Frente A) — com a edição ABERTA o cronómetro conta para a APURAÇÃO (`termino_em`, R18-140-A: 20:00 BRT).
  if (estado === ESTADO_ESPECIAL.ACTIVA && !semRelogio) {
    tempo = `${t("edicao.especial.apuracaoEm", "A apuração será em:")} ${formatarContagem(restanteMs)}`;
  }

  // ── Por baixo da arte: a ACÇÃO da edição (o lance, só com a edição aberta) ou o resultado ──
  let abaixo = null;
  if (estado === ESTADO_ESPECIAL.ACTIVA && !semRelogio) {
    // MC94.4.1 — a especial é RELÂMPAGO: "flash" posta em `lance-relampago` (pontos de lance), como a edição normal.
    abaixo = renderLance?.({ idEdicao: edicao.id, modalidade: "flash", encerrado: false }) ?? null;
  } else if (estado === ESTADO_ESPECIAL.ENCERRADA) {
    abaixo = <PainelVencedorEspecial {...resultado} isMobile={isMobile} t={t} />;
  }

  return (
    <div data-slot="edicao-especial" data-estado={semRelogio && estado !== ESTADO_ESPECIAL.ENCERRADA ? "sincronizando" : estado} data-edicao={edicao.id}>
      <CartaoEdicao
        acao="lance"
        titulo={titulo}
        id={edicao.id}
        estado={{ texto: t(badge.chave, badge.texto), cor: badge.cor }}
        produto={produto}
        arteUrl={edicao.imagem_url || undefined}
        tempo={tempo}
        isMobile={isMobile}
      >
        {abaixo}
      </CartaoEdicao>
    </div>
  );
}
