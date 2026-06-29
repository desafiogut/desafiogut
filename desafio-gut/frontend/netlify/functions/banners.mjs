// Banners — Auto-Gerador + Persistência (REQ-22, REQ-23).
//
// GET /.netlify/functions/banners?cliente_id=<id>&formato=app|site[&raw=1]
//   - Retorna banner do cliente se houver upload em Blob banner:{cliente_id}.
//   - Caso contrário, gera SVG template automático com cliente_id + tier inferido.
//   - Formatos: app (800×200) ou site (1200×300).
//   - Default: retorna JSON { svg, mime, dimensao, fonte: "upload"|"auto" }.
//   - Com ?raw=1: retorna o SVG cru com Content-Type: image/svg+xml.
//
// POST /.netlify/functions/banners
//   - Modo Admin (x-admin-token):  status=aprovado, ativo imediatamente.
//   - Modo Cliente (Authorization Bearer JWT lance-auth + premium flag):
//       status=pendente · debita Wallet em valorCentavos (se body.premium=true).
//   - Body: { cliente_id, dimensao: "app"|"site", imagemBase64, mime, premium?, valorCentavos? }
//   - imagemBase64 capped em 700KB raw (≈ 525KB binário) por upload.
//
// Decisões (sessão 2026-05-12, Onda 4 Tier 2/3):
//   - SVG puro inline (sem sharp/canvas — não disponíveis em Netlify Functions).
//   - Cliente_id continua = endereço Privy (consistente com wallet:{cliente_id}).
//   - Premium debita Wallet (REQ-19 → ✅): se body.premium=true e cliente_id casa
//     com o JWT, débito de valorCentavos antes de persistir o banner.

import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import {
  jsonResponse, jsonError, validarEndereco,
  parseJsonBody, ValidationError,
} from "./_lib/validate.mjs";
import { verificarLanceAuth } from "./_lib/jwt.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { autenticarAdmin } from "./_lib/admin-auth.mjs";
import { scrubSvg } from "./_lib/svg-sanitize.mjs";

const BLOB_BANNER = "banner";
const BLOB_WALLET = "wallet";
const DIMENSOES = {
  app:  { w: 800,  h: 200 },
  site: { w: 1200, h: 300 },
};
const MAX_BASE64_LEN = 700_000;   // ~ 525 KB binário
const MIMES_VALIDOS  = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[banners] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Infere tier a partir do endereço (best-effort sem sistema de cota real):
// hash dos primeiros 4 bytes do endereço → 4 buckets.
function inferTier(endereco) {
  const hex = (endereco || "0x0").toLowerCase().replace(/^0x/, "").slice(0, 8);
  const n   = parseInt(hex || "0", 16);
  const bucket = n % 100;
  if (bucket < 1)   return { nome: "Diamante", cor: "#00d4ff" };
  if (bucket < 2)   return { nome: "Ouro",     cor: "#f5a623" };
  if (bucket < 30)  return { nome: "Prata",    cor: "#cbd5e1" };
  return { nome: "Bronze", cor: "#cd7f32" };
}

function gerarSvgTemplate({ cliente_id, dimensao, tier }) {
  const { w, h } = DIMENSOES[dimensao];
  const fundo  = "#050818";
  const texto  = "#f5c800";
  const subt   = tier.cor;
  const id     = escapeXml(cliente_id || "—");
  const nome   = escapeXml(tier.nome);
  const titulo = `DesafioGUT · ${nome}`;
  const sub    = `Slot ${dimensao === "site" ? "Vitrine" : "App"} · ${id.slice(0, 10)}…${id.slice(-6)}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${titulo} ${sub}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${fundo}"/>
      <stop offset="1" stop-color="#0a1a30"/>
    </linearGradient>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${texto}"/>
      <stop offset="1" stop-color="${subt}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="0" y="${h - 4}" width="100%" height="4" fill="url(#brand)"/>
  <g fill="${texto}" font-family="'Orbitron','Inter',sans-serif" font-weight="900">
    <text x="${w * 0.04}" y="${h * 0.42}" font-size="${h * 0.22}" letter-spacing="2">${titulo}</text>
  </g>
  <g fill="${subt}" font-family="'Inter',sans-serif" font-weight="600">
    <text x="${w * 0.04}" y="${h * 0.66}" font-size="${h * 0.11}" opacity="0.85">${sub}</text>
  </g>
  <g fill="${texto}" font-family="'Inter',sans-serif" font-weight="400">
    <text x="${w * 0.04}" y="${h * 0.88}" font-size="${h * 0.07}" opacity="0.55">Auto-gerado · upload pendente</text>
  </g>
</svg>`;
}

// ─── HANDLERS ────────────────────────────────────────────────────────────────

async function handleGet(req) {
  const url       = new URL(req.url);
  const cliente   = url.searchParams.get("cliente_id") || "";
  const dimensao  = url.searchParams.get("formato") === "site" ? "site" : "app";
  const raw       = url.searchParams.get("raw") === "1";

  let cli;
  try { cli = validarEndereco(cliente); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  // Tenta blob primeiro
  let fonte = "auto";
  let svg, mime;
  const store = abrirStore(BLOB_BANNER);
  if (store) {
    try {
      const dados = await store.get(`${cli}:${dimensao}`, { type: "json" });
      // P1-3 (MC39.17.2) — defesa em profundidade: SVG armazenado (upload de
      // lojista) é entregue cross-user; faz scrub no servidor antes de devolver.
      // A sanitização autoritativa continua no cliente (DOMPurify svg-profile).
      if (dados?.svg) { svg = scrubSvg(dados.svg); mime = "image/svg+xml"; fonte = "upload-svg"; }
      else if (dados?.imagemBase64) {
        if (raw) {
          // Retorna binário decodificado direto
          const bin = Buffer.from(dados.imagemBase64, "base64");
          return new Response(bin, {
            status: 200,
            headers: { "Content-Type": dados.mime || "image/png", "Cache-Control": "public, max-age=300" },
          });
        }
        return jsonResponse({
          cliente_id: cli, dimensao,
          imagemBase64: dados.imagemBase64,
          mime: dados.mime || "image/png",
          fonte: "upload-binario",
          status: dados.status || "aprovado",
        });
      }
    } catch (err) {
      console.warn("[banners] leitura blob falhou (não-fatal):", err?.message);
    }
  }

  // Fallback: gera template automático.
  if (!svg) {
    const tier = inferTier(cli);
    svg = gerarSvgTemplate({ cliente_id: cli, dimensao, tier });
    mime = "image/svg+xml";
  }

  if (raw) {
    return new Response(svg, {
      status: 200,
      headers: { "Content-Type": mime, "Cache-Control": "public, max-age=300" },
    });
  }
  return jsonResponse({ cliente_id: cli, dimensao, svg, mime, fonte });
}

async function debitarWallet(cliente, valorCentavos, motivo) {
  const walletStore = abrirStore(BLOB_WALLET);
  if (!walletStore) return { ok: false, code: "wallet_indisponivel", message: "Netlify Blobs wallet indisponível" };
  const w = (await walletStore.get(cliente, { type: "json" })) || { saldoCentavos: 0, transacoes: [] };
  const saldoAntes = Number(w.saldoCentavos || 0);
  if (saldoAntes < valorCentavos) {
    return { ok: false, code: "saldo_insuficiente",
      message: `Saldo R$ ${(saldoAntes/100).toFixed(2)} < custo R$ ${(valorCentavos/100).toFixed(2)}` };
  }
  const saldoDepois = saldoAntes - valorCentavos;
  const tx = {
    id: randomUUID(),
    operacao: "debito", valorCentavos, motivo,
    saldoAntesCentavos: saldoAntes, saldoDepoisCentavos: saldoDepois,
    em: new Date().toISOString(),
  };
  await walletStore.setJSON(cliente, {
    saldoCentavos: saldoDepois,
    atualizadoEm:  tx.em,
    transacoes: [tx, ...(w.transacoes || [])].slice(0, 50),
  });
  return { ok: true, saldoAntes, saldoDepois, transacaoId: tx.id };
}

async function handlePost(req) {
  // Modo de autenticação tri-state:
  //   1) Admin (Bearer admin-JWT OR x-admin-token legado, via autenticarAdmin).
  //   2) Cliente (Authorization: Bearer <lance-auth JWT>).
  const adminCheck = await autenticarAdmin(req);
  const isAdmin    = !!adminCheck?.ok;

  let jwtPayload = null;
  if (!isAdmin) {
    const authHeader = req.headers.get("authorization") || "";
    const authToken  = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!authToken) {
      return jsonError(401, "auth_obrigatorio", "envie admin (Bearer admin-JWT ou x-admin-token) OU Authorization: Bearer <lance-auth>");
    }
    try { jwtPayload = await verificarLanceAuth(authToken); }
    catch (err) {
      const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
      return jsonError(401, code, "JWT lance-auth inválido ou expirado");
    }
  }

  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com cliente_id, dimensao, imagemBase64, mime");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  let cliente;
  try { cliente = validarEndereco(body.cliente_id); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  if (!isAdmin && jwtPayload.endereco !== cliente) {
    return jsonError(403, "endereco_nao_corresponde", "JWT não pertence ao cliente_id informado");
  }

  const dimensao = body.dimensao === "site" ? "site" : "app";
  const imagemBase64 = typeof body.imagemBase64 === "string" ? body.imagemBase64 : "";
  const mime = typeof body.mime === "string" ? body.mime : "";

  if (!imagemBase64) return jsonError(400, "imagem_obrigatoria", "imagemBase64 ausente");
  if (imagemBase64.length > MAX_BASE64_LEN) {
    return jsonError(413, "imagem_grande", `imagemBase64 > ${MAX_BASE64_LEN} chars (~525KB binário)`);
  }
  if (!MIMES_VALIDOS.has(mime)) {
    return jsonError(400, "mime_invalido", `mime deve ser um de: ${[...MIMES_VALIDOS].join(", ")}`);
  }

  // Premium (REQ-23): debita Wallet se cliente solicitou.
  let premiumInfo = null;
  if (!isAdmin && body.premium === true) {
    const valor = Number(body.valorCentavos);
    if (!Number.isInteger(valor) || valor <= 0) {
      return jsonError(400, "valor_premium_invalido", "valorCentavos deve ser inteiro positivo para premium");
    }
    const deb = await debitarWallet(cliente, valor, `banner-premium-${dimensao}`);
    if (!deb.ok) return jsonError(400, deb.code, deb.message);
    premiumInfo = deb;
  }

  const status = isAdmin ? "aprovado" : "pendente";
  const registro = {
    cliente_id: cliente, dimensao,
    imagemBase64, mime,
    status,
    submetidoEm: new Date().toISOString(),
    aprovadoEm:  isAdmin ? new Date().toISOString() : null,
    submetidoPor: isAdmin ? "admin" : "cliente",
    premium: !!premiumInfo,
    premiumWalletDebito: premiumInfo ? premiumInfo.transacaoId : null,
  };

  const store = abrirStore(BLOB_BANNER);
  if (!store) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");
  try { await store.setJSON(`${cliente}:${dimensao}`, registro); }
  catch (err) {
    console.error("[banners] persistir falhou:", err?.message);
    return jsonError(502, "persistencia_falhou", "não foi possível salvar banner");
  }

  console.info("[banners] upload concluído", { cliente, dimensao, status, premium: !!premiumInfo });
  return jsonResponse({
    ok: true,
    cliente_id: cliente, dimensao,
    status, submetidoEm: registro.submetidoEm, aprovadoEm: registro.aprovadoEm,
    premium: !!premiumInfo,
    saldoRsAposDebito: premiumInfo ? premiumInfo.saldoDepois : undefined,
  }, isAdmin ? 200 : 201);
}

export default async (req) => {
  if (req.method === "GET") {
    const rl = await aplicarRateLimit(req, "banners-get", 30);
    if (rl) return rl;
    return handleGet(req);
  }
  if (req.method === "POST") {
    const rl = await aplicarRateLimit(req, "banners-post", 5);
    if (rl) return rl;
    return handlePost(req);
  }
  return jsonError(405, "metodo_invalido", "use GET ou POST", { allowed: ["GET", "POST"] });
};
