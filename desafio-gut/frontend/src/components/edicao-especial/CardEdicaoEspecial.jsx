// CardEdicaoEspecial — MC94.2 / MC94.3.1. O CORPO da edição especial, desenhado
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
import EdicaoBanner, { TAMANHO_BANNER_PADRAO } from "../EdicaoBanner.jsx";
import GutoSpritePlayer from "../GutoSpritePlayer.jsx";
import ContagemDecrescente from "./ContagemDecrescente.jsx";
import PainelVencedorEspecial from "./PainelVencedorEspecial.jsx";
import { useResultadoEspecial } from "./useResultadoEspecial.js";
import {
  COR, T_PADRAO, ESTADO_ESPECIAL, estadoEspecial, alvoDaContagem, janelaEmBrasilia,
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

const BADGE = {
  [ESTADO_ESPECIAL.AGENDADA]:  { chave: "edicao.especial.badgeEmBreve",   texto: "🕒 Em breve",   cor: "#ff6b35" },
  [ESTADO_ESPECIAL.A_ABRIR]:   { chave: "edicao.especial.badgeAbrindo",   texto: "⏳ Abrindo",    cor: "#fbbf24" },
  [ESTADO_ESPECIAL.ACTIVA]:    { chave: "edicao.especial.badgeAberta",    texto: "🟢 Aberta",     cor: COR.success },
  [ESTADO_ESPECIAL.ENCERRADA]: { chave: "edicao.especial.badgeEncerrada", texto: "🔴 Encerrada",  cor: COR.danger },
};

// A caixa amarela translúcida — a MESMA da R-1 (Dashboard.jsx). Não se inventa
// um segundo estilo: a especial tem de parecer parte do slot, não um anexo.
const caixa = (isMobile) => ({
  display: "flex", alignItems: "center", gap: "0.65rem",
  padding: "0.6rem 0.75rem",
  background: "rgba(245,166,35,0.07)",
  border: "1px solid rgba(245,166,35,0.22)",
  borderRadius: "10px",
  marginBottom: isMobile ? "0.6rem" : "0.75rem",
});

const ROTULO = {
  fontSize: "0.58rem", color: COR.muted, textTransform: "uppercase",
  letterSpacing: "0.07em", fontWeight: 700, marginBottom: "0.15rem",
};

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
 * @param {number} [props.size] lado do ícone de presente (px)
 */
export default function CardEdicaoEspecial({
  edicao, offsetMs, renderLance, isMobile = false, t = T_PADRAO, agoraMs,
  resultadoEspecial, size = TAMANHO_BANNER_PADRAO,
}) {
  const agora = useAgoraServidor(offsetMs, agoraMs);
  const estado = estadoEspecial(edicao, agora);
  const encerrada = estado === ESTADO_ESPECIAL.ENCERRADA;
  const lido = useResultadoEspecial(edicao?.id, encerrada && !resultadoEspecial);
  if (!estado) return null;

  const resultado = resultadoEspecial ?? lido;
  const janela = janelaEmBrasilia(edicao);
  const alvo = alvoDaContagem(edicao, estado);
  const restanteMs = Number.isFinite(offsetMs) && alvo != null ? alvo - agora : null;
  const badge = BADGE[estado];
  const produto = edicao.produto || t("edicao.especial.premio", "Prêmio especial");
  // O alt do banner diz o que a imagem mostra (o produto), não só que existe.
  const altArte = `${t("edicao.especial.altArte", "Arte da edição especial")}: ${produto}`;
  const semRelogio = !Number.isFinite(offsetMs);

  // ── O cronómetro (e o que o substitui em cada estado) ──
  let contagem = null;
  if (estado === ESTADO_ESPECIAL.A_ABRIR) {
    contagem = <>
      <div style={{ textAlign: "center", color: "#fbbf24", fontWeight: 800, marginBottom: "0.4rem" }}>
        {t("edicao.especial.abrindo", "Abrindo em instantes…")}
      </div>
      <ContagemDecrescente restanteMs={restanteMs} cor="#fbbf24" isMobile={isMobile} t={t} />
    </>;
  } else if (estado === ESTADO_ESPECIAL.AGENDADA) {
    contagem = <ContagemDecrescente restanteMs={restanteMs} rotulo={t("edicao.especial.abreEm", "Abre em")} isMobile={isMobile} t={t} />;
  } else if (estado === ESTADO_ESPECIAL.ACTIVA && semRelogio) {
    // Sem hora do servidor, "activa" foi decidido pelo relógio do APARELHO — que
    // pode estar adiantado. Não se abre o formulário por um palpite: o backend
    // recusaria com 409. Achado da validação independente do MC94.2.
    contagem = <ContagemDecrescente restanteMs={null} isMobile={isMobile} t={t} />;
  } else if (estado === ESTADO_ESPECIAL.ACTIVA) {
    contagem = <ContagemDecrescente restanteMs={restanteMs} rotulo={t("edicao.especial.fechaEm", "Fecha em")} cor={COR.success} isMobile={isMobile} t={t} />;
  }

  // ── Abaixo do cronómetro: o formulário DESTA edição, ou o resultado ──
  let abaixo = null;
  if (estado === ESTADO_ESPECIAL.ACTIVA && !semRelogio) {
    abaixo = (
      <div style={{ marginTop: "0.9rem" }}>
        {/* MC94.4.1 — era "programado" (R18 antiga do MC94.1). O operador reverteu: a
            especial é RELÂMPAGO e o lance debita SALDO (a partir de R$ 0,01), não senha.
            Em `CardLance`, `tipoLeilao` decide o caminho todo: "programado" liga o gate
            on-chain de senhas + a conversão R$→senha e posta em `auth-lance`; "flash"
            posta em `lance-relampago` e debita saldo. Alinhar aqui com o `tipo` da
            metadata é o que mantém UI e backend coerentes. */}
        {renderLance?.({ idEdicao: edicao.id, modalidade: "flash", encerrado: false })}
      </div>
    );
  } else if (estado === ESTADO_ESPECIAL.ENCERRADA) {
    abaixo = (
      <div style={{ marginTop: "0.9rem" }}>
        <PainelVencedorEspecial {...resultado} isMobile={isMobile} t={t} />
      </div>
    );
  }

  return (
    <div data-slot="edicao-especial" data-estado={estado} data-edicao={edicao.id}>
      {/* Cabeçalho do slot: identifica a edição que o slot está a mostrar. */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", marginBottom: isMobile ? "0.5rem" : "0.75rem" }}>
        <h3 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 800, color: COR.gold, letterSpacing: "0.04em", fontFamily: "'Orbitron', sans-serif" }}>
          {t("edicao.especial.titulo", "🎁 Edição especial")}
        </h3>
        <span style={{
          fontSize: "0.7rem", fontWeight: 800, color: badge.cor, whiteSpace: "nowrap",
          border: `1px solid ${badge.cor}`, borderRadius: "999px", padding: "0.2rem 0.6rem",
        }}>{t(badge.chave, badge.texto)}</span>
      </div>

      {/* A caixa amarela do slot: ícone no tamanho PADRÃO + prémio e janela. */}
      <div style={caixa(isMobile)}>
        <EdicaoBanner edicao={edicao} size={size} alt={altArte} />

        <div style={{ minWidth: 0 }}>
          <div style={ROTULO}>{t("edicao.especial.premioEmDisputa", "Prêmio em disputa")}</div>
          <div style={{ fontSize: isMobile ? "0.95rem" : "1.05rem", color: COR.text, fontWeight: 800, lineHeight: 1.25 }}>
            {produto}
          </div>
          {janela && (
            <div style={{ fontSize: "0.68rem", color: COR.muted, lineHeight: 1.3 }}>
              {janela.dia} · {janela.inicio}–{janela.fim} {t("edicao.especial.brasilia", "(horário de Brasília)")}
            </div>
          )}
          <div style={{ fontSize: "0.66rem", color: COR.muted, lineHeight: 1.3 }}>
            {t("edicao.especial.regra", "Lance relâmpago · vence o menor lance único · a partir de R$ 0,01 (debita do saldo)")}
          </div>
        </div>
      </div>

      {/* GUTO (o mesmo do Dashboard) + o cronómetro e o estado ao lado. */}
      <div style={{
        display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: isMobile ? "0.6rem" : "0.9rem",
        padding: isMobile ? "0.5rem 0 0.6rem" : "0.25rem 0 0.6rem",
      }}>
        <GutoSpritePlayer variant="inline" size={isMobile ? 88 : 104} mood={encerrada ? "celebrating" : undefined} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem", minWidth: 0 }}>
          {contagem ?? (
            <div style={{ fontSize: isMobile ? "1.05rem" : "0.98rem", fontWeight: 900, color: COR.danger, letterSpacing: "0.04em" }}>
              {t("edicao.especial.encerrada", "Edição encerrada")}
            </div>
          )}
        </div>
      </div>

      {abaixo}
    </div>
  );
}
