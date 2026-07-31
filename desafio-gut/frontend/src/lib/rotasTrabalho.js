// rotasTrabalho — MC89.4: quais rotas são ecrãs de TRABALHO.
//
// PORQUÊ ESTE FICHEIRO EXISTE: o MC89.3 mediu o painel de administração
// desenhado por cima de uma ilustração de showroom animada (frigorífico, PS5,
// Smart TV) com confetes dourados em queda a passar por cima do texto — e sem
// superfície própria. Havia texto que NÃO SE LIA. A atmosfera é a identidade do
// produto de consumo; num ecrã onde se leem números, é ruído e é custo (o vídeo
// estava a descodificar, medido `paused=false`).
//
// A decisão vive AQUI, num sítio só, e não repetida em três componentes. É a
// lição do MC88.43: uma fonte de verdade por decisão. Três consumidores:
//   widgets/layout/BackgroundCanvas.jsx  → fundo ESTÁTICO (sem vídeo, sem parallax)
//   widgets/layout/AppLayout.jsx         → sem vinheta de atmosfera
//   widgets/layout/Layout.jsx            → sem rodapé legal de consumidor
//
// ⚠️ `false` POR OMISSÃO, sempre. Um `true` a mais aqui apaga a identidade
// visual do produto de consumo em rotas onde ela é o produto. A lista é
// explícita de propósito — nada de heurísticas.

const PREFIXOS_TRABALHO = ["/admin", "/corporativo"];

/**
 * @param {string} pathname
 * @returns {boolean} true só para as rotas de trabalho declaradas acima.
 */
export function ehRotaDeTrabalho(pathname) {
  const p = String(pathname || "").toLowerCase();
  return PREFIXOS_TRABALHO.some((pre) => p === pre || p.startsWith(`${pre}/`));
}

/**
 * A navegação inferior de consumo só é RETIRADA onde há outra saída.
 *
 * ⚠️ NÃO é o mesmo que `ehRotaDeTrabalho`, e a diferença é funcional, não
 * estética: em `/corporativo` a barra inferior é a ÚNICA navegação do lojista
 * (Painel · Cotas · Banners — BottomNav.jsx:63-67). Retirá-la deixaria-o sem
 * forma de circular no telemóvel. O `/admin` recebe um "Sair do painel" no
 * cabeçalho, por isso pode dispensá-la.
 */
export function escondeNavegacaoConsumo(pathname) {
  const p = String(pathname || "").toLowerCase();
  return p === "/admin" || p.startsWith("/admin/");
}
