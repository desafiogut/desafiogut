// EdicaoBanner — MC45/MC47: banner QUADRADO (1:1) e CLICÁVEL de uma edição.
//
// MC47 — comportamento UNIFICADO: clicar no banner ABRE a imagem num MODAL
// (ImageModal) SOBRE a página, SEM navegar para outra rota/aba. Vale em TODOS os
// contextos (Dashboard "Edição Ativa", EdicaoCard das "Outras Edições" e a própria
// página /edicao/:id). O banner é sempre um <button> (nunca <Link>) — elimina a
// "página/aba" desnecessária que o clique abria antes (navegava para /edicao/:id).
//
// Mostra edicao.imagem_url quando existir (object-fit:cover); senão, placeholder
// quadrado (🎁). A11y: aria-label + aria-haspopup="dialog", foco visível
// (.gut-edicao-banner:focus-visible em globals.css); o ImageModal trata
// role="dialog"/aria-modal, focus-trap, ESC, clique-fora e restauro do foco.
//
// clicavel=false → quadrado estático (sem clique/modal).

import { useState } from "react";
import ImageModal from "./ImageModal.jsx";

// MC94.3.1 — `alt` opcional: quem sabe o que a imagem MOSTRA (a especial, que
// conhece o produto) pode dizê-lo; sem `alt`, o genérico de sempre. Aditivo:
// nenhum chamador existente muda de comportamento.
// MC94.3.2 — o TAMANHO PADRAO do icone quadrado, numa constante so. O operador
// mediu que a especial estava maior que as outras edicoes: o objetivo passou a ser
// a especial ficar IGUAL ao padrao. Com um valor unico, "igual" deixa de ser uma
// coincidencia entre literais espalhados e passa a ser estrutural (e testavel).
export const TAMANHO_BANNER_PADRAO = 52;

export default function EdicaoBanner({ edicao, size = TAMANHO_BANNER_PADRAO, radius = 8, clicavel = true, className = "", alt }) {
  const [aberto, setAberto] = useState(false);
  const id = edicao?.id;
  const imagem = edicao?.imagem_url || edicao?.banner_url || edicao?.imagem || null;
  const descricao = alt || `Banner da edição ${id ?? ""}`.trim();

  const box = {
    width: `${size}px`, height: `${size}px`, flexShrink: 0,
    borderRadius: `${radius}px`, overflow: "hidden",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(135deg, rgba(245,166,35,0.18), rgba(245,166,35,0.06))",
    border: "1px solid rgba(245,166,35,0.35)",
    textDecoration: "none",
  };

  const conteudo = imagem
    ? <img
        src={imagem}
        alt={descricao}
        loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    : <span aria-hidden="true" style={{ fontSize: `${Math.round(size * 0.42)}px`, lineHeight: 1 }}>🎁</span>;

  // Não clicável → quadrado estático.
  if (!clicavel) {
    return <div className={className} style={box}>{conteudo}</div>;
  }

  // Clicável → botão que abre o MODAL da imagem (sem navegar), em qualquer contexto.
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label={`Ampliar imagem da edição ${id ?? ""}`.trim()}
        aria-haspopup="dialog"
        className={`gut-edicao-banner ${className}`.trim()}
        style={{ ...box, cursor: "pointer", padding: 0 }}
      >
        {conteudo}
      </button>
      {aberto && (
        <ImageModal
          src={imagem}
          alt={`Imagem da edição ${id ?? ""}`.trim()}
          onClose={() => setAberto(false)}
        />
      )}
    </>
  );
}
