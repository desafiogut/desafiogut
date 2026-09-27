// GET /.netlify/functions/img-proxy?url=<URL externa>
// Proxy same-origin de imagens de produto (MC31).
//
// Os lojistas podem fornecer uma "Imagem URL" externa para os produtos. O CSP
// estrito do site (img-src 'self' data: blob: + alguns domínios de auth) BLOQUEIA
// imagens cross-origin — então URLs externas nunca apareciam e geravam violações
// de CSP no console. Em vez de alargar o img-src a domínios ARBITRÁRIOS (enfraquece
// o CSP, contra o pilar SUPERPERS), buscamos a imagem no servidor e servimo-la
// same-origin (coberto por img-src 'self').
//
// Guardas SSRF: apenas http(s); bloqueia loopback/privado/link-local (literal IP +
// resolução DNS, fail-closed); redirect: "error" (sem bypass por redirect); valida
// content-type image/*; limites de tempo e tamanho.

import { lookup } from "node:dns/promises";
import { respostaPreflight } from "./_lib/cors.mjs";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const TIMEOUT_MS = 6000;

/** True se o IP (v4/v6 literal) pertence a um range não roteável/privado. */
export function isBlockedIp(ip) {
  const v4 = String(ip).match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = +v4[1], b = +v4[2];
    if (a === 0 || a === 10 || a === 127) return true;          // this-host / privado / loopback
    if (a === 169 && b === 254) return true;                     // link-local (metadata 169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true;            // privado
    if (a === 192 && b === 168) return true;                     // privado
    if (a === 100 && b >= 64 && b <= 127) return true;           // CGNAT
    if (a >= 224) return true;                                    // multicast / reservado
    return false;
  }
  const h = String(ip).toLowerCase();
  if (h === "::1" || h === "::") return true;                    // loopback / unspecified
  if (h.startsWith("fe80") || h.startsWith("fc") || h.startsWith("fd")) return true; // link-local / ULA
  const mapped = h.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/); // IPv4-mapped (dotted)
  if (mapped) return isBlockedIp(mapped[1]);
  // MC99.5.2 — IPv4 EMBUTIDO em IPv6, TODAS as formas que o WHATWG URL aceita.
  // A 1.ª correcção tratou só o IPv4-mapeado (2 grupos hex) e fechou 3 de 4 payloads; ao CAÇAR 17
  // payloads apareceram mais TRÊS famílias, todas a saltar o DNS:
  //   [::ffff:0:7f00:1]  IPv4-traduzido   [2002:7f00:1::]  6to4       [64:ff9b::7f00:1]  NAT64
  // Nota: `http://[::1]@evil.com/` NÃO é bypass — o hostname é `evil.com` (o `[::1]` é userinfo).
  // Decodifica o IPv4 embutido e reutiliza o isBlockedIp: as gamas privadas ficam num só sítio.
  const emb = h.match(/^(?:64:ff9b::|::ffff:0:|::ffff:)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
           || h.match(/^2002:([0-9a-f]{1,4}):([0-9a-f]{1,4})/);
  if (emb) {
    const n = parseInt(emb[1], 16) * 65536 + parseInt(emb[2], 16);
    return isBlockedIp([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join("."));
  }
  return false;
}

/** True se o hostname é local/interno ou um IP literal bloqueado. */
export function isBlockedHostname(hostname) {
  // MC99.5.2 — SSRF ENTRE BRACKETS IPv6, explorado antes de corrigido.
  // `new URL("http://[::1]/").hostname` devolve "[::1]" COM os brackets, e `isBlockedIp` só
  // conhece a forma sem eles ("::1", "fe80*", "fc"/"fd"*). Resultado: NÃO era bloqueado aqui,
  // e logo a seguir a linha `u.hostname.includes(":")` marcava-o como IP literal e SALTAVA a
  // verificação DNS — duas guardas caíam pela mesma causa.
  // PoC reproduzido contra este código: passavam [::1], [::ffff:127.0.0.1], [fc00::1] e [fd00::1],
  // enquanto 127.0.0.1, localhost e 169.254.169.254 eram correctamente recusados.
  // Correção na FUNÇÃO PARTILHADA (um guard aqui vale por todos os chamadores): normalizar os
  // brackets faz cair no `isBlockedIp` já existente — sem lista nova, sem dependência.
  const h = String(hostname || "").toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  return isBlockedIp(h);
}

/** Resolve um nome DNS e bloqueia se QUALQUER endereço for privado (fail-closed). */
async function resolvesToBlocked(hostname) {
  try {
    const results = await lookup(hostname, { all: true });
    return results.length === 0 || results.some((r) => isBlockedIp(r.address));
  } catch {
    return true;
  }
}

function texto(status, msg) {
  return new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export default async (req) => {
  // MC88.12 — preflight CORS do APK. Tem de ser a primeira coisa: o OPTIONS não
  // leva corpo nem Authorization, logo qualquer validação a montante responderia
  // 4xx e o browser abortaria a chamada real.
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  let target;
  try { target = new URL(req.url).searchParams.get("url"); } catch { return texto(400, "bad request"); }
  if (!target) return texto(400, "missing url");

  let u;
  try { u = new URL(target); } catch { return texto(400, "invalid url"); }
  if (u.protocol !== "http:" && u.protocol !== "https:") return texto(400, "scheme not allowed");
  if (isBlockedHostname(u.hostname)) return texto(403, "host not allowed");
  const ehIpLiteral = /^\d+\.\d+\.\d+\.\d+$/.test(u.hostname) || u.hostname.includes(":");
  if (!ehIpLiteral && await resolvesToBlocked(u.hostname)) return texto(403, "host not allowed");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(u.toString(), { signal: ctrl.signal, redirect: "error", headers: { Accept: "image/*" } });
    if (!r.ok) return texto(502, "upstream error");
    const ct = r.headers.get("content-type") || "";
    if (!/^image\//i.test(ct)) return texto(415, "not an image");
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_BYTES) return texto(413, "too large");
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch {
    return texto(502, "fetch failed");
  } finally {
    clearTimeout(timer);
  }
};
