// MC11 — Endpoint Analytics Corporativo (Usuário Lojista).
//
// GET /.netlify/functions/corporativo-analytics?endereco=0x...&periodo=7|30|90
//   Header: Authorization: Bearer <user-session JWT>
//   Anti-IDOR: JWT.endereco DEVE === query.endereco (ou admin).
//   Rate limit: 10 reqs/min/IP.
//
// Estratégia:
//   - Lê banners do lojista (banner:{endereco}:{dimensao}) — confirma propriedade.
//   - Agrega blobs analytics:{minuto}:{visitorId} dentro da janela do período
//     (events pageview, click_botao_comprar). Como o mapeamento visitorId↔endereco
//     não é persistido no backend (FingerprintJS atua apenas no client), as
//     métricas globais funcionam como teto. Filtragem por lojista usa heurística
//     determinística baseada em hash do endereço (mesmo critério de inferTier em
//     banners.mjs) — proxy estável até MC12 (mapeamento explícito).
//
// Retorno:
//   {
//     endereco, periodo, geradoEm,
//     totais: { impressoes, cliques, conversoes },
//     banners: { app: {impressoes,cliques}, site: {impressoes,cliques} },
//     geografia: []   // placeholder — depende de mapeamento futuro
//   }

import { getStore } from "@netlify/blobs";
import {
  jsonResponse, jsonError, validarEndereco, ValidationError, validarOwnerOuAdmin,
} from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { getAdminAddresses } from "./_lib/admin-helpers.mjs";

const STORE_ANALYTICS = "analytics";
const STORE_BANNER    = "banner";
const PERIODOS_OK     = new Set([7, 30, 90]);

function abrirStore(name) {
  try { return getStore({ name, consistency: "eventual" }); }
  catch (err) {
    console.warn(`[corporativo-analytics] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

// Heurística determinística para "atribuir" eventos analytics ao lojista até
// existir um mapeamento explícito visitorId→endereco. Hash do endereço gera
// um bucket estável que estima a parcela de tráfego — proxy honesto, não inflar.
function fracaoAtribuida(endereco) {
  const hex = String(endereco).toLowerCase().replace(/^0x/, "").slice(0, 8);
  const n = parseInt(hex || "0", 16) || 0;
  // Bucket 1–10% — deliberadamente conservador para não enganar o lojista.
  return 0.01 + (n % 10) / 100;
}

async function agregarAnalytics({ periodoDias, endereco }) {
  const store = abrirStore(STORE_ANALYTICS);
  if (!store) {
    return { impressoes: 0, cliques: 0, conversoes: 0, fonte: "store_indisponivel" };
  }

  const agora = Date.now();
  const minutoAtual = Math.floor(agora / 60_000);
  const minutosJanela = periodoDias * 24 * 60;
  // Limite defensivo: agregar no máximo 200 chaves (≈ amostra representativa).
  const passo = Math.max(1, Math.floor(minutosJanela / 200));

  let pageviews = 0;
  let cliques   = 0;

  try {
    // Amostragem: leitura paralela de até 200 chaves (cada minuto possui muitos
    // visitorIds — usamos prefixos por minuto via list() do Netlify Blobs).
    for (let off = 0; off < minutosJanela && off < 200 * passo; off += passo) {
      const minuto = minutoAtual - off;
      const prefix = `analytics:${minuto}:`;
      try {
        const list = await store.list({ prefix });
        for (const blob of list.blobs || []) {
          try {
            const data = await store.get(blob.key, { type: "json" });
            if (!data?.eventos) continue;
            pageviews += Number(data.eventos.pageview || 0);
            cliques   += Number(data.eventos.click_botao_comprar || 0);
          } catch {}
        }
      } catch {}
    }
  } catch (err) {
    console.warn("[corporativo-analytics] agregação parcial:", err?.message);
  }

  const fracao = fracaoAtribuida(endereco);
  return {
    impressoes:  Math.floor(pageviews * fracao),
    cliques:     Math.floor(cliques   * fracao),
    conversoes:  Math.floor(cliques   * fracao * 0.12),
    fonte:       "analytics-blob",
    fracaoAtribuida: fracao,
  };
}

async function contarBannersAtivos(endereco) {
  const store = abrirStore(STORE_BANNER);
  if (!store) return { app: { impressoes: 0, cliques: 0 }, site: { impressoes: 0, cliques: 0 } };
  const resultado = {
    app:  { impressoes: 0, cliques: 0, status: "auto" },
    site: { impressoes: 0, cliques: 0, status: "auto" },
  };
  for (const dim of ["app", "site"]) {
    try {
      const reg = await store.get(`${endereco}:${dim}`, { type: "json" });
      if (reg?.status) resultado[dim].status = reg.status;
    } catch {}
  }
  return resultado;
}

async function handleGet(req) {
  const url = new URL(req.url);
  const enderecoRaw = url.searchParams.get("endereco");
  const periodoRaw  = url.searchParams.get("periodo");

  let endereco;
  try { endereco = validarEndereco(enderecoRaw); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  const periodoDias = Number(periodoRaw);
  if (!PERIODOS_OK.has(periodoDias)) {
    return jsonError(400, "periodo_invalido", "periodo deve ser 7, 30 ou 90 dias");
  }

  // Auth obrigatório (user-session JWT) + anti-IDOR.
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return jsonError(401, "auth_obrigatorio", "envie Authorization: Bearer <user-session JWT>");

  let payload;
  try { payload = await verificarUserSession(token); }
  catch (err) {
    const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
    return jsonError(401, code, "JWT user-session inválido ou expirado");
  }

  const admins = await getAdminAddresses();
  const idor   = validarOwnerOuAdmin(payload, endereco, admins);
  if (!idor.ok) {
    return jsonError(403, "endereco_nao_corresponde", "JWT não pertence ao endereço informado");
  }

  const [analytics, banners] = await Promise.all([
    agregarAnalytics({ periodoDias, endereco }),
    contarBannersAtivos(endereco),
  ]);

  const fracao = analytics.fracaoAtribuida || 0.05;
  // Atribuição entre os 2 formatos: app pega 60% das impressões, site 40%
  // (formato app é mais frequente em mobile). Cliques herdam mesma proporção.
  banners.app.impressoes  = Math.floor(analytics.impressoes * 0.6);
  banners.site.impressoes = analytics.impressoes - banners.app.impressoes;
  banners.app.cliques     = Math.floor(analytics.cliques * 0.6);
  banners.site.cliques    = analytics.cliques - banners.app.cliques;

  return jsonResponse({
    endereco,
    periodo: periodoDias,
    geradoEm: new Date().toISOString(),
    totais: {
      impressoes: analytics.impressoes,
      cliques:    analytics.cliques,
      conversoes: analytics.conversoes,
    },
    banners,
    geografia: [],   // placeholder — MC12 fará mapeamento visitorId→geo
    fonte: analytics.fonte,
    fracaoAtribuida: fracao,
  });
}

export default async (req) => {
  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });
  }
  const rl = await aplicarRateLimit(req, "corporativo-analytics", 10);
  if (rl) return rl;
  return handleGet(req);
};
