// Exportação de dados do titular — LGPD art. 18 / Mega Comando 3 / Item 2.
//
// POST /.netlify/functions/exportar-dados
// Headers: Authorization: Bearer <user-session>
// Body:    { "endereco": "0x..." }
//
// Retorna JSON único com TODOS os dados do address. Autorização granular:
//   - owner (JWT.endereco === body.endereco) OU
//   - admin (admin-access JWT).
//
// Stores coletados: saldo-rs, wallet, cotas, renovacao-adesao, voucher,
// consent-log (entradas do address), lance-idem (idem) e pedidos (idem).
//
// MC104 (LGPD art. 18 — acesso a TODOS os dados do titular, e SÓ aos dele):
//   - pedidos casam também por `comprador` (é o campo do pedido; antes nunca casavam);
//   - `lances_relampago`: só os lances DO titular dentro do Blob legado por edição;
//   - `supabase`: as tabelas onde o sistema vive desde o MC36.1 (saldo R$, créditos/débitos PIX,
//     Vale-Crédito, troco, cotas, lances, lojista, actividade, pontuação e ranking do torneio),
//     cada uma filtrada pelo titular. Os Blobs legados continuam exportados como antes (HARD GATE 4).
//   - `consent_log` já inclui o aceite do gate legal (MC104 Frente A).

import { getStore } from "@netlify/blobs";
import {
  jsonResponse, jsonError, validarEndereco, ValidationError,
  parseJsonBody, validarOwnerOuAdmin, mascararEndereco,
} from "./_lib/validate.mjs";
import { getSupabaseReadOnly, supabaseConfigurado } from "./_lib/supabase-client.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { getAdminAddresses } from "./_lib/admin-helpers.mjs";
import { registrarFalhaJwt } from "./_lib/jwt-fail-counter.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

const STORES_POR_CHAVE = ["saldo-rs", "wallet", "cotas", "renovacao-adesao", "voucher"];

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[exportar-dados] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

async function coletarPorChave(nome, endereco) {
  const store = abrirStore(nome);
  if (!store) return null;
  try {
    return await store.get(endereco, { type: "json" });
  } catch (err) {
    console.warn(`[exportar-dados] get ${nome}:${mascararEndereco(endereco)} falhou:`, err?.message);
    return null;
  }
}

async function coletarConsentLog(endereco) {
  const store = abrirStore("consent-log");
  if (!store) return [];
  const out = [];
  try {
    const { blobs } = await store.list();
    for (const { key } of blobs) {
      if (!key.endsWith(":" + endereco)) continue;
      try {
        const obj = await store.get(key, { type: "json" });
        if (obj) out.push({ key, ...obj });
      } catch {}
    }
  } catch (err) {
    console.warn("[exportar-dados] list consent-log falhou:", err?.message);
  }
  return out;
}

async function coletarPorValor(nome, endereco) {
  const store = abrirStore(nome);
  if (!store) return [];
  const out = [];
  try {
    const { blobs } = await store.list();
    for (const { key } of blobs) {
      try {
        const obj = await store.get(key, { type: "json" });
        const enderecoObj = String(obj?.endereco || obj?.address || obj?.comprador || "").toLowerCase();
        if (enderecoObj === endereco) out.push({ key, ...obj });
      } catch {}
    }
  } catch (err) {
    console.warn(`[exportar-dados] list ${nome} falhou:`, err?.message);
  }
  return out;
}

// Blob legado `lances-relampago`: chave = edição, valor = { lances:[…de TODOS…] }. Só os do titular.
async function coletarLancesLegado(endereco) {
  const store = abrirStore("lances-relampago");
  if (!store) return [];
  const out = [];
  try {
    const { blobs } = await store.list();
    for (const { key } of blobs) {
      try {
        const obj = await store.get(key, { type: "json" });
        for (const l of Array.isArray(obj?.lances) ? obj.lances : []) {
          if (String(l?.endereco || "").toLowerCase() === endereco) out.push({ edicaoId: key, ...l });
        }
      } catch {}
    }
  } catch (err) {
    console.warn("[exportar-dados] list lances-relampago falhou:", err?.message);
  }
  return out;
}

// [tabela, coluna do titular]. `payload->>endereco` = registos fiscais (JSONB).
const SUPA_POR_COLUNA = [
  ["saldo_rs", "cliente_id"],
  ["troco_senhas", "cliente_id"],
  ["wallet", "cliente_id"],
  ["saldo_rs_creditos", "payload->>endereco"],
  ["saldo_rs_debitos", "payload->>endereco"],
  ["lances", "endereco"],
  ["lojistas", "endereco"],
  ["atividade_utilizadores", "endereco"],
  ["pontuacoes", "endereco"],
  ["rankings_ciclo", "endereco"],
];

async function coletarSupabase(endereco) {
  if (!supabaseConfigurado()) return { disponivel: false };
  const sb = getSupabaseReadOnly();
  const tabelas = {};
  const erros = [];
  for (const [tabela, coluna] of SUPA_POR_COLUNA) {
    const { data, error } = await sb.from(tabela).select("*").eq(coluna, endereco);
    if (error) { erros.push(`${tabela}: ${error.message}`); tabelas[tabela] = null; continue; }
    tabelas[tabela] = data ?? [];
  }
  // cotas: o titular pode estar em cliente_id OU em endereco (como no conta-delete).
  const { data: cotas, error: errCotas } = await sb.from("cotas").select("*")
    .or(`cliente_id.eq.${endereco},endereco.eq.${endereco}`);
  if (errCotas) { erros.push(`cotas: ${errCotas.message}`); tabelas.cotas = null; }
  else tabelas.cotas = cotas ?? [];
  return { disponivel: true, tabelas, erros };
}

export default async (req) => {
  // MC88.12 — preflight CORS do APK. Tem de ser a primeira coisa: o OPTIONS não
  // leva corpo nem Authorization, logo qualquer validação a montante responderia
  // 4xx e o browser abortaria a chamada real.
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") {
    return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  }
  const rl = await aplicarRateLimit(req, "exportar-dados", 6);
  if (rl) return rl;

  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com endereco");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  let endereco;
  try { endereco = validarEndereco(body.endereco); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  // Auth: user-session (owner) OU admin.
  const authHeader = req.headers.get("authorization") || "";
  const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    await registrarFalhaJwt(req, "exportar-dados");
    return jsonError(401, "token_ausente", "Authorization: Bearer <user-session> obrigatório");
  }
  let jwtPayload;
  try { jwtPayload = await verificarUserSession(token); }
  catch (err) {
    await registrarFalhaJwt(req, "exportar-dados");
    const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
    return jsonError(401, code, "token de sessão inválido ou expirado");
  }
  const admins = await getAdminAddresses();
  const guard  = validarOwnerOuAdmin(jwtPayload, endereco, admins);
  if (!guard.ok) {
    return jsonError(403, "acesso_negado", "token não pertence ao endereço solicitado e não é admin");
  }

  // ── Coleta ─────────────────────────────────────────────────────────────────
  const dados = {};
  for (const nome of STORES_POR_CHAVE) {
    dados[nome] = await coletarPorChave(nome, endereco);
  }
  dados.consent_log = await coletarConsentLog(endereco);
  dados.lance_idem  = await coletarPorValor("lance-idem", endereco);
  dados.pedidos     = await coletarPorValor("pedidos", endereco);
  dados.lances_relampago = await coletarLancesLegado(endereco);
  dados.supabase = await coletarSupabase(endereco);

  const payload = {
    titular:   endereco,
    geradoEm:  new Date().toISOString(),
    geradoPor: guard.papel,           // "owner" ou "admin"
    politicaRetencao: "/docs/lgpd-politica-retencao.md",
    dados,
  };

  console.info("[exportar-dados] exportação concluída", { endereco: mascararEndereco(endereco), papel: guard.papel });
  return jsonResponse(payload);
};
