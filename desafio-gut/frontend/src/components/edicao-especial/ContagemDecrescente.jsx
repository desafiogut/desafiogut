import { COR, T_PADRAO, decompor, formatarContagem } from "./_estilo-especial.js";

const dois = (n) => String(n).padStart(2, "0");

/**
 * Contagem decrescente em dias / horas / minutos / segundos. Componente PURO:
 * recebe o tempo restante já calculado no relógio do SERVIDOR (o card faz a
 * conta com o offset) e só o formata. Não tem relógio próprio.
 *
 * `restanteMs === null` quer dizer "ainda não sei a hora do servidor": mostra
 * "…" e nenhum número — contar pelo relógio do aparelho seria mostrar a dois
 * utilizadores tempos diferentes para o mesmo instante (HARD GATE 3).
 *
 * @param {object} props
 * @param {number|null} props.restanteMs
 * @param {string} [props.rotulo] texto acima dos números (ex.: "Abre em")
 * @param {string} [props.cor]
 * @param {boolean} [props.isMobile]
 * @param {(chave:string, fallback:string)=>string} [props.t]
 */
export default function ContagemDecrescente({ restanteMs, rotulo, cor = COR.primary, isMobile = false, t = T_PADRAO }) {
  const partes = decompor(restanteMs);

  if (!partes) {
    return (
      <div data-estado="sincronizando" aria-busy="true" style={{ textAlign: "center", color: COR.muted, fontSize: "1.4rem", padding: "0.4rem 0" }}>
        …
        <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
          {t("edicao.especial.sincronizando", "Sincronizando o relógio")}
        </span>
      </div>
    );
  }

  const celulas = [
    [partes.dias,     t("edicao.especial.dias", "dias")],
    [partes.horas,    t("edicao.especial.horas", "horas")],
    [partes.minutos,  t("edicao.especial.min", "min")],
    [partes.segundos, t("edicao.especial.seg", "seg")],
  ];

  return (
    <div data-estado="a-contar">
      {rotulo && (
        <div style={{ textAlign: "center", fontSize: "0.68rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: "0.35rem" }}>
          {rotulo}
        </div>
      )}
      {/* role="timer" sem aria-live: um leitor de ecrã a anunciar cada segundo
          seria ruído. O rótulo acessível leva o valor completo. */}
      <div
        role="timer"
        aria-label={`${rotulo ? rotulo + " " : ""}${formatarContagem(restanteMs)}`}
        style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: isMobile ? "0.35rem" : "0.5rem" }}
      >
        {celulas.map(([valor, nome]) => (
          <div
            key={nome}
            data-celula="contagem"
            style={{
              textAlign: "center",
              padding: isMobile ? "0.45rem 0.2rem" : "0.55rem 0.3rem",
              background: "rgba(245,166,35,0.08)",
              border: "1px solid rgba(245,166,35,0.22)",
              borderRadius: "10px",
            }}
          >
            <div style={{
              fontFamily: "'Orbitron', sans-serif",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 900,
              fontSize: isMobile ? "1.35rem" : "1.6rem",
              color: cor,
              lineHeight: 1.1,
            }}>{dois(valor)}</div>
            <div style={{ fontSize: "0.62rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
              {" "}{nome}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
