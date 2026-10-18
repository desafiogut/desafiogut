import { COR, caixa, tituloSecao, legenda } from "./_estilo.js";
import { FONTES, ganhosPorFonte, recentes, rotuloMotivo, diaMes } from "../../lib/pontosLance.js";

/**
 * UTAC110j.4b (Frente B, só-UI) — «Seus pontos de lance». Toma, em Meus Ativos, o lugar do painel do motor MC93
 * (`PainelTorneio`: posição, pontuação 1/3 e acertos, que o Regulamento v5.1 não tem). Mostra o progresso PESSOAL
 * dos pontos de lance (Art. 16º): o saldo, quanto veio de cada fonte e os últimos movimentos.
 *
 * Não promete o que o código ainda não faz: hoje os pontos de lance só se GANHAM (o gasto no lance é o UTAC do
 * Hermes, R18-110j.4b-2). Não há ranking de todos (exige endpoint novo). `PainelTorneio.jsx` fica no código.
 *
 * Apresentacional (sem I/O). Quatro estados que não se confundem: sem sessão, a carregar, erro, dados.
 *
 * @param {{ temSessao?:boolean, carregando?:boolean, erro?:string|null,
 *           lance?:{pontos:number,movimentos:Array}|null, isMobile?:boolean }} props
 */
export default function PainelPontosLance({ temSessao = false, carregando = false, erro = null, lance = null, isMobile = false }) {
  let estado;
  if (!temSessao) estado = "sem-sessao";
  else if (erro) estado = "erro";
  else if (carregando) estado = "carregando";
  else if (!lance) estado = "erro";
  else estado = "dados";

  const titulo = <h2 style={tituloSecao(isMobile)}>⭐ Seus pontos de lance</h2>;
  const base = (corpo) => (
    <section style={caixa(isMobile)} data-secao="pontos-lance">
      {titulo}
      <div data-estado={estado}>{corpo}</div>
    </section>
  );

  if (estado === "sem-sessao") {
    return base(<p style={legenda(isMobile)}>Entre na sua conta para ver seus pontos de lance.</p>);
  }
  if (estado === "erro") {
    return base(
      <p style={{ ...legenda(isMobile), color: COR.danger }}>
        Não foi possível carregar seus pontos agora. Tente novamente mais tarde.
      </p>,
    );
  }
  if (estado === "carregando") {
    return base(<p style={{ ...legenda(isMobile), minHeight: "2.4rem" }}>Carregando seus pontos…</p>);
  }

  const ganhos = ganhosPorFonte(lance);
  const linhas = [...FONTES.map((f) => ({ id: f.motivo, rotulo: f.rotulo, n: ganhos[f.motivo] })),
    { id: "outro", rotulo: "Outros", n: ganhos.outro }].filter((l) => l.n > 0);
  const ultimos = recentes(lance, 5);

  return base(
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.45rem" }}>
        <strong data-testid="pontos-lance-saldo"
          style={{ fontSize: isMobile ? "1.3rem" : "1.55rem", fontWeight: 900, color: COR.gold, lineHeight: 1 }}>
          {lance.pontos}
        </strong>
        <span style={{ fontSize: "0.82rem", color: COR.gold, fontWeight: 700 }}>
          {lance.pontos === 1 ? "ponto de lance" : "pontos de lance"}
        </span>
      </div>
      <p style={{ ...legenda(isMobile), marginTop: "0.35rem" }}>
        Ganhos de graça pelo seu engajamento no app (Art. 16º).
      </p>

      {linhas.length === 0 ? (
        <p style={{ ...legenda(isMobile), marginTop: "0.5rem" }} data-testid="pontos-lance-vazio">
          Você ainda não ganhou pontos de lance. Comece pelo login de hoje.
        </p>
      ) : (
        <ul data-testid="pontos-por-fonte"
          style={{ listStyle: "none", margin: "0.55rem 0 0", padding: 0, display: "grid", gap: "0.25rem" }}>
          {linhas.map((l) => (
            <li key={l.id} data-fonte={l.id}
              style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: COR.text }}>
              <span>{l.rotulo}</span>
              <strong style={{ color: COR.gold }}>+{l.n}</strong>
            </li>
          ))}
        </ul>
      )}

      {ultimos.length > 0 && (
        <>
          <p style={{ ...legenda(isMobile), marginTop: "0.65rem", fontWeight: 700 }}>Últimos movimentos</p>
          <ul data-testid="pontos-ultimos"
            style={{ listStyle: "none", margin: "0.25rem 0 0", padding: 0, display: "grid", gap: "0.2rem" }}>
            {ultimos.map((m, i) => (
              <li key={`${m.data}-${i}`} style={{ display: "flex", gap: "0.5rem", fontSize: "0.78rem", color: COR.muted }}>
                <span style={{ minWidth: "2.8rem" }}>{diaMes(m.data)}</span>
                <span style={{ flex: 1 }}>{rotuloMotivo(m.motivo)}</span>
                <strong style={{ color: m.delta > 0 ? COR.gold : COR.text }}>{m.delta > 0 ? `+${m.delta}` : m.delta}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </>,
  );
}
