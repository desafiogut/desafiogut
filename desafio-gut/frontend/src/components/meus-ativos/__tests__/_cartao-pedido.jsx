// Fixture de teste (MC102): o arnês `_render.mjs` só carrega exports default, e o cartão do
// pedido é um sub-componente de MeusPedidos. Re-exporta-o como default — nenhum ficheiro do
// produto muda de comportamento por isto.
export { CartaoPedido as default } from "../MeusPedidos.jsx";
