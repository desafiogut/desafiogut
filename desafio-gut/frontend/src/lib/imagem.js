// Resolve o `src` de imagem de um produto respeitando o CSP estrito (img-src 'self').
// MC31: URLs externas são roteadas pelo proxy same-origin (/.netlify/functions/img-proxy)
// para não violarem o CSP nem exigirem alargar o img-src a domínios arbitrários.
//
//   - imagemBase64 → data URI (permitido por 'data:').
//   - imagem_url data:/blob: → usada diretamente.
//   - imagem_url http(s) same-origin → direta; externa → proxy same-origin.
//   - sem imagem → null.
//
// UTAC154 (DEBT-121) — no app nativo (Capacitor: `https://localhost` no Android, `capacitor://localhost` no
// iOS) um caminho relativo resolve-se no PRÓPRIO telemóvel: o `<img>` do proxy pedia
// `https://localhost/.netlify/functions/img-proxy?…`, recebia o index.html do fallback de SPA e ficava em
// branco. O `fetch` já era reescrito por `instalarReescritaApi()`, mas um `<img>` não passa pelo fetch.
// `apiUrl()` (a mesma base das chamadas à API) torna absolutos SÓ os caminhos `/.netlify/functions/*` e SÓ
// no nativo; na web devolve-os intactos (relativos: servem a produção, os deploy previews e o `vite dev`
// por igual — um absoluto apontaria sempre à produção). Assets locais (`/assets/…`, `/icons/…`, `/artes/…`)
// não começam por `/.netlify/functions/` e ficam como estavam: no nativo são servidos pelo próprio WebView,
// e apontá-los à produção nem funcionaria (o `Cross-Origin-Resource-Policy: same-origin` do netlify.toml
// aplica-se aos estáticos, não às functions — SEG4 UTAC154 ℹ️2).
import { apiUrl } from "./apiOrigin.js";

export function imagemProdutoSrc(p) {
  if (!p) return null;
  if (p.imagemBase64) return `data:${p.mime || "image/png"};base64,${p.imagemBase64}`;
  const url = p.imagem_url;
  if (!url) return null;
  if (/^(data:|blob:)/i.test(url)) return url;
  if (/^https?:\/\//i.test(url)) {
    try {
      const u = new URL(url);
      if (typeof window !== "undefined" && u.origin === window.location.origin) return url;
    } catch {
      return null;
    }
    return apiUrl(`/.netlify/functions/img-proxy?url=${encodeURIComponent(url)}`);
  }
  return apiUrl(url); // relativo: asset local fica igual; uma function (/.netlify/functions/…) fica absoluta no nativo
}
