// EdicaoBanner — MC45: banner QUADRADO (1:1) e CLICÁVEL de uma edição.
//
// Requisito: o elemento clicável é o BANNER (o quadrado), não o card inteiro.
// Envolve só o quadrado num <Link to="/edicao/:id">. Mostra edicao.imagem_url
// quando existir (object-fit:cover); senão, um placeholder quadrado (imagem
// padrão) — nunca quadrado vazio nem imagem quebrada. A11y: aria-label, foco
// visível (.gut-edicao-banner:focus-visible em globals.css), alvo ≥ tamanho.
//
// clicavel=false → renderiza o quadrado estático (ex.: na própria página de
// detalhe da edição, onde um self-link não faz sentido).

import { Link } from "react-router-dom";

export default function EdicaoBanner({ edicao, size = 52, radius = 8, clicavel = true, className = "" }) {
  const id = edicao?.id;
  const imagem = edicao?.imagem_url || edicao?.banner_url || edicao?.imagem || null;

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
        alt={`Banner da edição ${id ?? ""}`.trim()}
        loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    : <span aria-hidden="true" style={{ fontSize: `${Math.round(size * 0.42)}px`, lineHeight: 1 }}>🎁</span>;

  // Sem id ou não clicável → quadrado estático (defensivo, sem navegação).
  if (!id || !clicavel) {
    return <div className={className} style={box}>{conteudo}</div>;
  }

  return (
    <Link
      to={`/edicao/${encodeURIComponent(id)}`}
      aria-label={`Ver informações da edição ${id}`}
      className={`gut-edicao-banner ${className}`.trim()}
      style={{ ...box, cursor: "pointer" }}
    >
      {conteudo}
    </Link>
  );
}
