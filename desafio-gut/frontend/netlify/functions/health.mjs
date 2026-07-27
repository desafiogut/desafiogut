// GET /.netlify/functions/health
// Smoke-test das functions.
//
// MC87 (P0-2 / P3-3) — a resposta passou a ter DOIS níveis:
//
//   · PÚBLICO  → { ok, service, timestamp }. É tudo o que um monitor de uptime
//                precisa, e nada do que um atacante precisa.
//   · ADMIN    → acrescenta `node` e o mapa `env` (QUAIS variáveis estão
//                configuradas — nunca os valores) e o alarme CHAVE_BRUTA_EM_MAINNET.
//
// NOTA sobre CHAVE_BRUTA_EM_MAINNET: este campo NÃO expõe a chave — é um booleano
// que denuncia que a chave BRUTA existe no ambiente de mainnet (violação da R9).
// Apagá-lo do corpo silenciaria o alarme sem corrigir nada; por isso é PRESERVADO,
// apenas movido para trás da autenticação admin. A correção real da condição que
// ele denuncia é migrar a assinatura para KMS e remover COORDENACAO_PRIVATE_KEY
// do ambiente — trabalho do operador (R5).
//
// Continua a responder 200 sem credencial: um health-check que exige segredo
// deixa de servir para monitorização de disponibilidade.

import { jsonResponse } from "./_lib/validate.mjs";
// MC88.31 (Achado 6 do MC88.30) — _lib/signer.mjs arrasta o ethers (~2 s de
// cold start). O bloco que o usa fica DEPOIS do gate de admin, portanto o
// caminho público (o medido em 2089 ms) não precisa dele. Import dinâmico.
// MC88.31 — _lib/admin-auth.mjs também é caro (~1,3 s: arrasta @netlify/blobs
// e jwt). Importado dinamicamente mais abaixo, só quando há credencial.
import { respostaPreflight } from "./_lib/cors.mjs";

export default async (req) => {
  // MC88.12 — preflight CORS do APK. Tem de ser a primeira coisa: o OPTIONS não
  // leva corpo nem Authorization, logo qualquer validação a montante responderia
  // 4xx e o browser abortaria a chamada real.
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;
  const base = {
    ok: true,
    service: "desafiogut-functions",
    timestamp: new Date().toISOString(),
  };

  // MC88.31 (Achado 6 do MC88.30) — autenticarAdmin só reconhece duas fontes de
  // credencial: `Authorization: Bearer` e `x-admin-token`. Sem nenhuma delas o
  // resultado seria obrigatoriamente { ok:false }, portanto nem vale a pena
  // carregar o módulo. O health público (o medido em 2089 ms) passa a não pagar
  // nem o ethers nem o @netlify/blobs/jwt.
  let ehAdmin = false;
  const temCredencialAdmin = !!req && (
    (req.headers.get("authorization") || "").startsWith("Bearer ") ||
    !!req.headers.get("x-admin-token")
  );
  if (temCredencialAdmin) {
    try {
      const { autenticarAdmin } = await import("./_lib/admin-auth.mjs");
      const auth = await autenticarAdmin(req);
      ehAdmin = Boolean(auth?.ok);
    } catch { ehAdmin = false; }
  }
  if (!ehAdmin) return jsonResponse(base);

  const provider = (process.env.PIX_PROVIDER || "mock").toLowerCase();

  // MC88.31 — carregado só aqui (pós-gate de admin), para o health público não
  // pagar o custo de arranque do ethers.
  const { backendAssinatura, resolverChaveCoordenacao } = await import("./_lib/signer.mjs");

  // MC30.1 — reporta o MODO de assinatura (backend), não a presença da chave.
  const backend = backendAssinatura();
  const signerReady = backend === "biconomy"
    ? (!!process.env.KMS_KEY_ID && !!process.env.BICONOMY_BUNDLER_URL)
    : !!resolverChaveCoordenacao();
  const chaveBrutaEmMainnet = process.env.NETWORK_STAGE === "mainnet" && !!resolverChaveCoordenacao();

  const env = {
    JWT_SECRET:              process.env.JWT_SECRET              ? "set" : "MISSING",
    SIGNER_BACKEND:          backend,
    SIGNER_READY:            signerReady ? "set" : "MISSING",
    // Alerta de segurança: chave bruta NÃO pode existir em mainnet (R9/ITEM 3.5).
    CHAVE_BRUTA_EM_MAINNET:  chaveBrutaEmMainnet ? "ALERT" : "ok",
    RPC_URL:                 process.env.RPC_URL                 ? "set" : "MISSING",
    PIX_PROVIDER:            provider,
    // MP_ACCESS_TOKEN só é exigido quando PIX_PROVIDER=mercadopago.
    // Reportamos sempre para facilitar diagnóstico do gating.
    MP_ACCESS_TOKEN:         process.env.MP_ACCESS_TOKEN         ? "set" : "MISSING",
    // MC87 (P1-2) — torna auditável se o webhook do MP está mesmo fechado.
    MP_WEBHOOK_SECRET:       process.env.MP_WEBHOOK_SECRET       ? "set" : "MISSING",
  };

  return jsonResponse({ ...base, detalhe: "admin", node: process.version, env });
};
