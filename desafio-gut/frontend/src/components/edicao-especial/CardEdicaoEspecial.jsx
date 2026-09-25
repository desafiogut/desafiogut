import { useEffect, useState } from "react";
import ContagemDecrescente from "./ContagemDecrescente.jsx";
import PainelVencedorEspecial from "./PainelVencedorEspecial.jsx";
import { useResultadoEspecial } from "./useResultadoEspecial.js";
import {
  COR, T_PADRAO, caixa, ESTADO_ESPECIAL, estadoEspecial, alvoDaContagem, janelaEmBrasilia,
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

/**
 * Card da edição especial no Dashboard (MC94.2). Orquestra os quatro estados:
 *
 *   agendada  → arte + contagem até à abertura
 *   a_abrir   → arte + "Abrindo…" + contagem (último minuto)
 *   activa    → arte + contagem até ao fim + o formulário de lance DESTA edição
 *   encerrada → arte + resultado (vencedor e métricas) — decisão D4
 *
 * ⚠️ O FORMULÁRIO NÃO É UM LINK PARA /mercado. O /mercado monta o `CardLance`
 * com `EDICAO_ATIVA = "R-1"` fixo: um botão "Dar lance" que navegasse para lá
 * mandaria o lance para a edição errada. O Dashboard passa `renderLance`, que
 * monta o `CardLance` existente com o id da especial e `tipoLeilao="programado"`
 * (decisão D1 do MC94.1: cada lance gasta 1 senha).
 *
 * ⚠️ Estado e contagem usam a hora do SERVIDOR (`offsetMs`, calculado pelo
 * `useEdicoes` a cada fetch). Sem offset ainda, a contagem mostra "…".
 *
 * @param {object} props
 * @param {object} props.edicao edição normalizada pelo useEdicoes (com inicio_em)
 * @param {number|null} props.offsetMs
 * @param {(p:{idEdicao:string, tipoLeilao:string, encerrado:boolean})=>import("react").ReactNode} props.renderLance
 * @param {boolean} [props.isMobile]
 * @param {(chave:string, fallback:string)=>string} [props.t]
 * @param {number} [props.agoraMs] instante fixo (testes)
 * @param {object} [props.resultadoEspecial] resultado já lido (testes); senão lê-se
 */
export default function CardEdicaoEspecial({
  edicao, offsetMs, renderLance, isMobile = false, t = T_PADRAO, agoraMs, resultadoEspecial,
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

  let corpo;
  if (estado === ESTADO_ESPECIAL.AGENDADA) {
    corpo = <ContagemDecrescente restanteMs={restanteMs} rotulo={t("edicao.especial.abreEm", "Abre em")} isMobile={isMobile} t={t} />;
  } else if (estado === ESTADO_ESPECIAL.A_ABRIR) {
    corpo = <>
      <div style={{ textAlign: "center", color: "#fbbf24", fontWeight: 800, marginBottom: "0.4rem" }}>
        {t("edicao.especial.abrindo", "Abrindo em instantes…")}
      </div>
      <ContagemDecrescente restanteMs={restanteMs} cor="#fbbf24" isMobile={isMobile} t={t} />
    </>;
  } else if (estado === ESTADO_ESPECIAL.ACTIVA && !Number.isFinite(offsetMs)) {
    // Sem hora do servidor, "activa" foi decidido pelo relógio do APARELHO — que
    // pode estar adiantado. Não se abre o formulário por um palpite: o backend
    // recusaria com 409. Achado da validação independente.
    corpo = <ContagemDecrescente restanteMs={null} isMobile={isMobile} t={t} />;
  } else if (estado === ESTADO_ESPECIAL.ACTIVA) {
    corpo = <>
      <ContagemDecrescente restanteMs={restanteMs} rotulo={t("edicao.especial.fechaEm", "Fecha em")} cor={COR.success} isMobile={isMobile} t={t} />
      <div style={{ marginTop: "0.9rem" }}>
        {renderLance?.({ idEdicao: edicao.id, tipoLeilao: "programado", encerrado: false })}
      </div>
    </>;
  } else {
    corpo = <PainelVencedorEspecial {...resultado} isMobile={isMobile} t={t} />;
  }

  return (
    <section data-secao="edicao-especial" data-estado={estado} data-edicao={edicao.id} style={caixa(isMobile)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <h3 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 800, color: COR.gold, letterSpacing: "0.04em", fontFamily: "'Orbitron', sans-serif" }}>
          {t("edicao.especial.titulo", "🎁 Edição especial")}
        </h3>
        <span style={{
          fontSize: "0.7rem", fontWeight: 800, color: badge.cor, whiteSpace: "nowrap",
          border: `1px solid ${badge.cor}`, borderRadius: "999px", padding: "0.2rem 0.6rem",
        }}>{t(badge.chave, badge.texto)}</span>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 220px) minmax(0, 1fr)",
        gap: isMobile ? "0.8rem" : "1.1rem",
        alignItems: "center",
      }}>
        {edicao.imagem_url && (
          <img
            src={edicao.imagem_url}
            alt={`${t("edicao.especial.altArte", "Arte da edição especial")}: ${produto}`}
            width={1254}
            height={1254}
            loading="lazy"
            decoding="async"
            style={{
              width: "100%", height: "auto", aspectRatio: "1 / 1",
              maxWidth: isMobile ? "340px" : "220px", justifySelf: "center",
              borderRadius: "12px", display: "block", objectFit: "cover",
            }}
          />
        )}
        <div>
          <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.62rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>
              {t("edicao.especial.premioEmDisputa", "Prêmio em disputa")}
            </div>
            <div style={{ fontSize: isMobile ? "1.1rem" : "1.2rem", fontWeight: 900, color: COR.text }}>{produto}</div>
            {janela && (
              <div style={{ fontSize: "0.75rem", color: COR.muted, marginTop: "0.15rem" }}>
                {janela.dia} · {janela.inicio}–{janela.fim} {t("edicao.especial.brasilia", "(horário de Brasília)")}
              </div>
            )}
            <div style={{ fontSize: "0.7rem", color: COR.muted, marginTop: "0.15rem" }}>
              {t("edicao.especial.regra", "Vence o menor lance único · cada lance usa 1 senha")}
            </div>
          </div>
          {corpo}
        </div>
      </div>
    </section>
  );
}
