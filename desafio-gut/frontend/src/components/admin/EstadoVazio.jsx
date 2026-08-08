// EstadoVazio — mensagem padronizada de "não há nada para mostrar".
//
// MC89.28 (Fase 3 da reforma). Substitui os 8 `<p>` itálicos inline espalhados
// pelas telas, que diziam a mesma coisa de oito maneiras e em dois tamanhos de
// letra (0.78 e 0.82rem).
//
// PORQUÊ UM COMPONENTE E NÃO UMA CONSTANTE DE ESTILO: o ganho real não era a
// consistência visual — era a informação em falta. "Nenhum utilizador
// encontrado." não diz se a lista está vazia porque não há dados, porque o
// filtro é estreito, ou porque a fonte não os contém. As três situações pedem
// ações diferentes de quem está a olhar. Ter um lugar para `descricao` e `acao`
// obriga a responder a essa pergunta em cada tela.
//
// Sem emojis (regra do MC89.4). O ícone é SVG e é decorativo — `aria-hidden`,
// para o leitor de ecrã anunciar o título e não um desenho sem nome.

const COR = {
  text:  "#e8f0fe",
  muted: "#94a3b8",
  dim:   "#64748b",
};

/** Caixa vazia, neutra. Serve qualquer lista sem itens. */
function IconePadrao() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5v-7Z"
        stroke="rgba(148,163,184,0.45)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M3 8.5 12 13l9-4.5M12 13v7" stroke="rgba(148,163,184,0.28)" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * @param {object}   props
 * @param {React.ReactNode} [props.icone]     SVG próprio; `null` remove o ícone.
 * @param {string}   props.titulo             O que não existe. Curto, sem ponto final.
 * @param {string}   [props.descricao]        Porquê, ou o que fazer a seguir.
 * @param {{texto: string, onClick: Function}} [props.acao]  Botão de recuperação.
 */
export default function EstadoVazio({ icone, titulo, descricao, acao }) {
  const mostraIcone = icone !== null;

  return (
    <div
      role="status"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.4rem",
        padding: "1.6rem 1.1rem",
        textAlign: "center",
        background: "rgba(255,255,255,0.015)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "10px",
      }}
    >
      {mostraIcone && (icone || <IconePadrao />)}

      <p style={{ margin: 0, fontSize: "0.84rem", fontWeight: 600, color: COR.text }}>
        {titulo}
      </p>

      {descricao && (
        <p style={{ margin: 0, fontSize: "0.72rem", color: COR.muted, lineHeight: 1.45, maxWidth: "34ch" }}>
          {descricao}
        </p>
      )}

      {acao && (
        <button
          type="button"
          onClick={acao.onClick}
          style={{
            marginTop: "0.35rem",
            padding: "0.3rem 0.7rem",
            fontSize: "0.7rem",
            fontWeight: 700,
            color: COR.muted,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "999px",
            cursor: "pointer",
          }}
        >
          {acao.texto}
        </button>
      )}
    </div>
  );
}

export { COR as COR_ESTADO_VAZIO, IconePadrao };
