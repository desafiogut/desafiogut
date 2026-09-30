// consentimento.mjs — MC104 (LGPD art. 8º §2º — prova do aceite do gate legal)
//
// POST /.netlify/functions/consentimento
//   Headers: Authorization: Bearer <user-session>
//   Body:    { endereco, versao, aceitos: {lido,maiores,termos,privacidade}, aceiteDeclaradoEm }
//   → 201 { criado:true } | 200 { criado:false } (mesmo aceite já registado)
//   Só o PRÓPRIO titular regista (nem admin regista em nome de outro).
//
// GET /.netlify/functions/consentimento?endereco=0x...
//   → { endereco, historico:[...] }  — owner OU admin (como exportar-dados).
//
// Lógica em _lib/consentimento.mjs. Nunca registar o conteúdo do consentimento em log (HARD GATE 14).

import { getStore } from "@netlify/blobs";
import {
  jsonResponse, jsonError, validarEndereco, ValidationError,
  parseJsonBody, validarOwnerOuAdmin, mascararEndereco,
} from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { getAdminAddresses } from "./_lib/admin-helpers.mjs";
import { registrarFalhaJwt } from "./_lib/jwt-fail-counter.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { validarAceite, registrarConsentimento, lerConsentimento } from "./_lib/consentimento.mjs";

function extrairIp(req) {
  const nf = req.headers.get("x-nf-client-connection-ip");
  if (nf) return nf.trim();
  const xff = req.headers.get("x-forwarded-for");
  return xff ? xff.split(",")[0].trim() : "unknown";
}

async function autenticar(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    await registrarFalhaJwt(req, "consentimento");
    return { erro: jsonError(401, "token_ausente", "Authorization: Bearer <user-session> obrigatório") };
  }
  try { return { payload: await verificarUserSession(token) }; }
  catch (err) {
    await registrarFalhaJwt(req, "consentimento");
    const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
    return { erro: jsonError(401, code, "token de sessão inválido ou expirado") };
  }
}

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST" && req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use POST ou GET", { allowed: ["POST", "GET"] });
  }
  const rl = await aplicarRateLimit(req, "consentimento", 10);
  if (rl) return rl;

  let body = null;
  let enderecoBruto;
  if (req.method === "POST") {
    try {
      body = await parseJsonBody(req);
      if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com endereco");
    } catch (err) {
      if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
      throw err;
    }
    enderecoBruto = body.endereco;
  } else {
    enderecoBruto = new URL(req.url).searchParams.get("endereco");
  }

  let endereco;
  try { endereco = validarEndereco(enderecoBruto); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  const { erro, payload } = await autenticar(req);
  if (erro) return erro;

  if (req.method === "POST") {
    // Só o titular: um admin NÃO consente em nome de ninguém.
    if (String(payload?.endereco || "").toLowerCase() !== endereco) {
      return jsonError(403, "acesso_negado", "só o próprio titular regista o seu consentimento");
    }
    const v = validarAceite(body);
    if (!v.ok) return jsonError(400, v.code, v.message);
    try {
      const { criado } = await registrarConsentimento(getStore, {
        endereco, versao: v.versao, aceitos: v.aceitos, aceiteDeclaradoEm: v.aceiteDeclaradoEm,
        ip: extrairIp(req), userAgent: req.headers.get("user-agent"),
      });
      console.info("[consentimento] registo", { endereco: mascararEndereco(endereco), criado });
      return jsonResponse({ ok: true, criado }, criado ? 201 : 200);
    } catch (err) {
      console.warn("[consentimento] gravação falhou:", err?.message);
      return jsonError(503, "registo_indisponivel", "não foi possível registar o consentimento");
    }
  }

  const admins = await getAdminAddresses();
  const guard = validarOwnerOuAdmin(payload, endereco, admins);
  if (!guard.ok) return jsonError(403, "acesso_negado", "token não pertence ao endereço solicitado e não é admin");
  try {
    return jsonResponse({ endereco, historico: await lerConsentimento(getStore, endereco) });
  } catch (err) {
    console.warn("[consentimento] leitura falhou:", err?.message);
    return jsonError(503, "leitura_indisponivel", "não foi possível ler o histórico");
  }
};
