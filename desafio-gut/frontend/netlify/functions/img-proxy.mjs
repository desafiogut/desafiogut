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
// MC99.5.2.1e (7.ª GERAÇÃO) — o `Agent` do undici aceita um `connect.lookup` PRÓPRIO, que é
// chamado NO MOMENTO DA LIGAÇÃO. É isso — e só isso — que fecha o TOCTOU: o `fetch` deixa de
// fazer a sua própria resolução de DNS (a 2.ª, que escolhia livremente o AAAA e por onde o
// ataque do «nome prefixado» entrava) e passa a ligar-se ao endereço que NÓS validámos.
// `undici` é a implementação que serve o `fetch` global do Node, logo o dispatcher é aceite.
import { Agent } from "undici";
import { respostaPreflight } from "./_lib/cors.mjs";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const TIMEOUT_MS = 6000;

/** True se o IP (v4/v6 literal) pertence a um range não roteável/privado. */
/** Expande um literal IPv6 em 8 hextetos (respeitando a compressão `::`), ou null se for inválido.
 * MC99.5.2.1b — substitui as regex que exigiam hextetos presentes: era isso que deixava passar
 * `2002:a00::1`, onde o `::` come o 2.º hexteto do IPv4 embutido. */
function hextetos(h) {
  if (!/^[0-9a-f:]+$/.test(h) || !h.includes(":")) return null;
  const partes = h.split("::");
  if (partes.length > 2) return null;
  const esq = partes[0] ? partes[0].split(":") : [];
  const dir = partes.length === 2 ? (partes[1] ? partes[1].split(":") : []) : [];
  if (partes.length === 1 && esq.length !== 8) return null;
  const faltam = 8 - esq.length - dir.length;
  if (faltam < 0) return null;
  const tudo = [...esq, ...Array(faltam).fill("0"), ...dir];
  if (tudo.some((x) => x === "" || !/^[0-9a-f]{1,4}$/.test(x))) return null;
  return tudo.map((x) => parseInt(x, 16));
}

export function isBlockedIp(ip) {
  const v4 = String(ip).match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = +v4[1], b = +v4[2], c = +v4[3];
    if (a === 0 || a === 10 || a === 127) return true;          // this-host / privado / loopback
    if (a === 169 && b === 254) return true;                     // link-local (metadata 169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true;            // privado
    if (a === 192 && b === 168) return true;                     // privado
    if (a === 100 && b >= 64 && b <= 127) return true;           // CGNAT
    // ── MC99.5.3 (Opção A) — FAIXAS DE PROPÓSITO ESPECIAL (RFC 6890) ──
    // Um validador adversarial mediu 6 faixas que PASSavam a classificação (handler devolvia 502
    // para literais destas faixas — DEP4 da série). Não eram SSRF VIVO (são globalmente
    // não-roteáveis) mas passavam a guarda. Alargamento cirúrgico: mesmas linhas do check acima,
    // sem refactor. Nenhuma imagem legítima vive nestas faixas (verificado: os CDNs usados pelo
    // app resolvem fora delas). A metadata cloud (169.254.169.254) já estava bloqueada.
    if (a === 192 && b === 0 && c === 0) return true;            // 192.0.0.0/24   atribuições IETF
    if (a === 192 && b === 88 && c === 99) return true;          // 192.88.99.0/24 6to4 relay anycast
    if (a === 192 && b === 0 && c === 2) return true;            // 192.0.2.0/24   TEST-NET-1 (RFC 5737)
    if (a === 198 && (b === 18 || b === 19)) return true;        // 198.18.0.0/15  benchmarking (RFC 2544)
    if (a === 198 && b === 51 && c === 100) return true;         // 198.51.100.0/24 TEST-NET-2 (RFC 5737)
    if (a === 203 && b === 0 && c === 113) return true;          // 203.0.113.0/24 TEST-NET-3 (RFC 5737)
    if (a >= 224) return true;                                    // multicast / reservado
    return false;
  }
  const h = String(ip).toLowerCase();
  // ⚠️ isBlockedIp é chamado TAMBÉM com NOMES DE DOMÍNIO (última linha de isBlockedHostname).
  // O IPv4 pontuado sai no regex `v4` acima; o que chega aqui sem ":" é um DOMÍNIO -> não se
  // aplica o intervalo. (A 1.ª versão deste guard faltou esta linha e passou a BLOQUEAR
  // i.imgur.com — o proxy de imagens recusava todas as imagens. Apanhado pelos controlos
  // POSITIVOS do HARD GATE 7, não pelos negativos: «bloquear tudo» passa em todos os negativos.)
  if (!h.includes(":")) return false;
  const mapped = h.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/); // IPv4-mapped (dotted)
  if (mapped) return isBlockedIp(mapped[1]);
  // ── MC99.5.2.1b (4.ª geração) — A PERGUNTA CERTA É «QUE ENDEREÇO É PÚBLICO?» ──
  // A 3.ª geração provou que `2000::/3` NÃO significa «seguro»: o 6to4 (`2002::/16`) e o Teredo
  // (`2001::/32`) VIVEM lá dentro e transportam um IPv4 embutido. O validador adversarial deixou
  // passar 8 payloads, incluindo `[2002:a9fe::1]` = **metadata cloud 169.254.169.254**.
  // A causa de fundo: regex que exigiam hextetos presentes (`2002:h1:h2`), logo a forma COMPRIMIDA
  // (`2002:a00::1`, com o `::` a comer o 2.º hexteto) escapava. Agora há um parser de hextetos
  // (`hextetos`) que respeita a compressão, e a decisão é sempre «descodifica o IPv4 e pergunta se
  // é público» — reutilizando `isBlockedIp`. Blocos de transição primeiro, intervalo no fim.
  const he = hextetos(h);
  if (!he) return true;                                    // IPv6 malformado -> fail-closed
  const v4de = (a, b) => [(a >> 8) & 255, a & 255, (b >> 8) & 255, b & 255].join(".");
  if (he[0] === 0x2002) return isBlockedIp(v4de(he[1], he[2]));                    // 6to4: IPv4 = bits 16-48
  if (he[0] === 0x2001 && he[1] === 0x0000)                                       // Teredo
    return isBlockedIp(v4de(he[6] ^ 0xffff, he[7] ^ 0xffff));                     //   cliente = XOR 0xffffffff
  if (he[0] === 0x2001 && he[1] === 0x0db8) return true;                          // documentação (2001:db8::/32)
  if (he.slice(0, 6).includes(0xffff)) return isBlockedIp(v4de(he[6], he[7]));    // mapeado/traduzido
  return !(he[0] >= 0x2000 && he[0] <= 0x3fff);            // ALLOWLIST: só 2000::/3 (fora dos acima)
}

/** True se o hostname é local/interno ou um IP literal bloqueado. */
export function isBlockedHostname(hostname) {
  // MC99.5.2.1c — A INVERSÃO. Quatro gerações de descodificação foram refutadas por um adversário,
  // sempre com um nome novo que ninguém tinha escrito na lista (mapeado -> 6to4/Teredo -> ISATAP/
  // 6rd/NAT64-custom). A família de mecanismos de transição IPv4->IPv6 é ABERTA por construção:
  // cada protocolo novo inventa uma forma nova de embutir um IPv4. Descodificar é uma corrida que
  // não se ganha.
  // Um `img-proxy` NÃO tem valor de negócio em literais IPv6: quem serve imagens legitimamente
  // fá-lo por NOME, que o browser resolve por DNS. Portanto a decisão deixa de ser «este IPv4
  // embutido é privado?» e passa a ser «preciso mesmo de aceitar um literal IPv6 aqui?» — e a
  // resposta é não. Recusa-se SEM descodificar: fecha a classe inteira, presente e futura.
  // Os nomes de domínio seguem para `resolvesToBlocked`, que resolve o DNS e valida CADA endereço
  // devolvido (IPv4 ou IPv6, público ou privado) — fail-closed. A validação de rede não se perde.
  const h = String(hostname || "").toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (!h) return true;
  if (h.includes(":")) return true;                    // literal IPv6 -> recusado, sem descodificar
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  return isBlockedIp(h);
}

// ═══ MC99.5.2.1e — 7.ª GERAÇÃO: VALIDAR ONDE A LIGAÇÃO ACONTECE ═══════════════════════════
// As 6 gerações anteriores filtraram SEMPRE o resultado de uma resolução, e o `fetch` fazia
// depois OUTRA resolução independente. Duas resoluções, duas escolhas, nenhuma garantia de
// coincidirem — é TOCTOU, e é o que o DNS rebinding explora. A correcção não é mais uma regra
// sobre o que filtrar: é mudar ONDE a validação acontece. Aqui resolve-se UMA vez (a nossa),
// autoriza-se cada endereço, e devolve-se um ÚNICO endereço ao conector — que é o endereço que
// a ligação usa. O `fetch` já não tem resolução própria para correr.

/** True se um IPv6 transporta um IPv4 embutido por um mecanismo de TRANSIÇÃO conhecido.
 *  `isBlockedIp` descodifica 6to4/Teredo/mapeado/traduzido/NAT64 e decide pelo ENDEREÇO; mas um
 *  IPv6 de `2000::/3` com um IPv4 embutido PARECE global — foi por aí que
 *  `1-1-1-1.2601--5efe-a9fe-a9fe.sslip.io` (A público + AAAA ISATAP -> 169.254.169.254) passou a
 *  guarda da 6.ª geração. Aqui marca-se a FAMÍLIA pelo identificador do mecanismo (RFC 4291 §2.5.5
 *  mapeado, RFC 3056 6to4, RFC 4380 Teredo, RFC 6052 NAT64, RFC 5214 ISATAP) — não é uma lista de
 *  payloads: é a mesma leitura estrutural que `isBlockedIp` já faz, mais o ISATAP (0x5efe), cujo
 *  marcador não tinha decisor nenhum. Falha para o lado fechado. */
function temIpv4EmbutidoPorTransicao(h) {
  const he = hextetos(h);
  if (!he) return true;                                    // não compreendido -> fail-closed
  if (he[0] === 0x2002) return true;                        // 6to4        (RFC 3056)
  if (he[0] === 0x2001 && he[1] === 0x0000) return true;    // Teredo      (RFC 4380)
  if (he[0] === 0x0064 && he[1] === 0xff9b) return true;    // NAT64       (RFC 6052)
  if (he.includes(0xffff)) return true;                     // mapeado/traduzido (RFC 4291)
  return he[5] === 0x5efe;                                  // ISATAP      (RFC 5214, SGI 0x5EFE)
}

/** UMA resolução: autoriza CADA endereço devolvido e escolhe o endereço a FIXAR (pin).
 *  Devolve `{ bloqueado, pin }`. Fail-closed em tudo o que não se compreendeu.
 *  - qualquer endereço (A ou AAAA) não autorizado  -> bloqueado  (o «nome prefixado» cai aqui)
 *  - sem IPv4 (só AAAA)                            -> bloqueado  (não há endereço IPv4 a fixar)
 *  - caso contrário                                -> `pin` = o IPv4 validado que a ligação usará */
export async function resolverEEscolher(hostname) {
  try {
    const results = await lookup(hostname, { all: true });
    if (results.length === 0) return { bloqueado: true, pin: null };
    const algumNaoAutorizado = results.some(
      (r) => isBlockedIp(r.address) || (r.address.includes(":") && temIpv4EmbutidoPorTransicao(r.address))
    );
    if (algumNaoAutorizado) return { bloqueado: true, pin: null };
    const v4 = results.filter((r) => !r.address.includes(":"));
    if (v4.length === 0) return { bloqueado: true, pin: null };
    return { bloqueado: false, pin: v4[0].address };
  } catch {
    return { bloqueado: true, pin: null };                 // resolução falhou -> fail-closed
  }
}

/** Compatibilidade histórica (PoC/relatórios citam este nome): é a MESMA decisão de `resolverEEscolher`. */
export async function resolvesToBlocked(hostname) {
  return (await resolverEEscolher(hostname)).bloqueado;
}

/** Marca própria de recusa na LIGAÇÃO. Viaja no `cause` do `fetch failed` (medido) e é o que
 *  permite responder 403 em vez de 502 quando é a NOSSA guarda a recusar. */
const HOST_BLOQUEADO = "__img_proxy_host_bloqueado__";

/** O `lookup` que a LIGAÇÃO usa. É chamado pelo conector no momento da ligação: resolve (uma só
 *  vez), autoriza, e devolve um ÚNICO endereço. Se não autorizar, a ligação NÃO acontece —
 *  a decisão e o endereço são o mesmo dado, logo o TOCTOU desaparece. */
function lookupValidado(hostname, _options, callback) {
  resolverEEscolher(hostname).then(({ bloqueado, pin }) => {
    if (bloqueado) return callback(new Error(HOST_BLOQUEADO));
    callback(null, [{ address: pin, family: pin.includes(":") ? 6 : 4 }]);
  }).catch(() => callback(new Error(HOST_BLOQUEADO)));
}

/** Um único Agent, partilhado (keep-alive preservado): a decisão é por-requisição e acontece
 *  dentro do `lookup`, não na construção do agent — logo não é preciso um por pedido. */
const agenteValidado = new Agent({ connect: { lookup: lookupValidado } });

/** True se o erro (ou a sua cadeia de `cause`) é a NOSSA recusa na ligação. */
function erroEhHostBloqueado(e) {
  for (let x = e, i = 0; x && i < 5; x = x.cause, i++) {
    if (String(x.message || "").includes(HOST_BLOQUEADO)) return true;
  }
  return false;
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
  // ── MC99.5.2.1e (7.ª geração) — A VALIDAÇÃO ACONTECE NA LIGAÇÃO ──
  // Já NÃO há um pré-check de DNS seguido de um `fetch` que resolve outra vez (eram duas
  // resoluções independentes — o TOCTOU). O `dispatcher` abaixo leva o `lookup` da casa: o
  // conector pede o endereço NO MOMENTO DA LIGAÇÃO, nós resolvemos UMA vez, autorizamos, e
  // devolvemos um único endereço validado. Se não autorizar, a ligação não chega a acontecer e
  // o erro marcado sobe no `cause` -> 403. Literais de IP não passam pelo dispatcher (sem DNS).

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(u.toString(), {
      signal: ctrl.signal,
      redirect: "error",
      headers: { Accept: "image/*" },
      ...(ehIpLiteral ? {} : { dispatcher: agenteValidado }),
    });
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
  } catch (e) {
    // A recusa da NOSSA guarda na ligação chega aqui marcada -> 403 (não é uma falha de rede).
    if (erroEhHostBloqueado(e)) return texto(403, "host not allowed");
    return texto(502, "fetch failed");
  } finally {
    clearTimeout(timer);
  }
};
