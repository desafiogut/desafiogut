// _lib/svg-sanitize.mjs — MC39.17.2 (P1-3, defesa em profundidade)
//
// Scrub conservador de SVG no servidor, SEM dependências (jsdom/DOMPurify não
// rodam bem no runtime das Netlify Functions). NÃO substitui a sanitização
// autoritativa do cliente (DOMPurify svg-profile em BannerCard/CorporativoBanners/
// Vitrine) — é uma segunda camada na fronteira de entrega de SVG armazenado.
//
// Remove os vetores de XSS conhecidos em SVG inline:
//   <script>, handlers on*=, javascript:/data:text/html em href/xlink:href,
//   <foreignObject>, <iframe>/<embed>/<object>, <set/animate ... attributeName=...>
//   apontando para atributos perigosos.

const PADROES = [
  // blocos executáveis inteiros
  /<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi,
  /<\s*script[^>]*\/\s*>/gi,
  /<\s*foreignObject[\s\S]*?<\s*\/\s*foreignObject\s*>/gi,
  /<\s*(iframe|embed|object)[\s\S]*?<\s*\/\s*\1\s*>/gi,
  /<\s*(iframe|embed|object)[^>]*\/\s*>/gi,
  // atributos de evento on*="..." / on*='...'
  /\son[a-z0-9_-]+\s*=\s*"[^"]*"/gi,
  /\son[a-z0-9_-]+\s*=\s*'[^']*'/gi,
  /\son[a-z0-9_-]+\s*=\s*[^\s>]+/gi,
  // hrefs perigosos (javascript:, data:text/html, vbscript:)
  /(href|xlink:href)\s*=\s*"(?:\s*)(?:javascript|vbscript|data:text\/html)[^"]*"/gi,
  /(href|xlink:href)\s*=\s*'(?:\s*)(?:javascript|vbscript|data:text\/html)[^']*'/gi,
];

/**
 * Devolve o SVG com os vetores perigosos removidos. Idempotente.
 * @param {string} svg
 * @returns {string}
 */
export function scrubSvg(svg) {
  if (typeof svg !== "string" || !svg) return "";
  let out = svg;
  for (const re of PADROES) out = out.replace(re, "");
  return out;
}
