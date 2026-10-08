// MC66 — paleta compartilhada do Glass da aba Lances (extraída de MercadoLances.jsx).
// Espelha os tokens oficiais globals.css @theme: navy #050818 + laranja #ff6b35.
// Um único ponto de verdade para os subcomponentes de components/glass/.
// UTAC108e.1 (pendência 1, decisão do operador): o dourado passa a ser UM só — #f5a623 (o dos mockups
// aprovados e de 56 ficheiros de src/). Era #ff9500, que divergia do resto do app.
export const COR = {
  primary: "#ff6b35", primaryDim: "rgba(255,107,53,0.18)",
  gold: "#f5a623", bg: "#050818", surface: "rgba(8,30,64,0.82)",
  text: "#ffffff", muted: "#6b7db8",
  success: "#00e5a0", danger: "#ff3d71", warning: "#ffb830", blue300: "#ffb830",
};

export default COR;
