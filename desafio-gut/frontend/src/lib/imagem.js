// Resolve o `src` de imagem de um produto respeitando o CSP estrito (img-src 'self').
// MC31: URLs externas são roteadas pelo proxy same-origin (/.netlify/functions/img-proxy)
// para não violarem o CSP nem exigirem alargar o img-src a domínios arbitrários.
//
//   - imagemBase64 → data URI (permitido por 'data:').
//   - imagem_url data:/blob: → usada diretamente.
//   - imagem_url http(s) same-origin → direta; externa → proxy same-origin.
//   - sem imagem → null.
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
    return `/.netlify/functions/img-proxy?url=${encodeURIComponent(url)}`;
  }
  return url; // relativo (same-origin)
}
