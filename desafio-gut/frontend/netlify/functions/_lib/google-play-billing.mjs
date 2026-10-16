// _lib/google-play-billing.mjs — UTAC110i.1 (FRENTE C). Validação server-side de compras do
// Google Play + registo de idempotência na tabela `public.google_play_compras`.
//
// PORQUE A VALIDAÇÃO É NO SERVIDOR: o cliente (o APK) não é fonte de verdade sobre dinheiro — quem
// manda é a Google Play Developer API. O cliente só entrega o `purchaseToken`; é aqui que ele é
// conferido contra a loja, e é SÓ depois disso que os benefícios do Passe são creditados
// (`creditarPasseGoogle`, em `_lib/comprar-passe-tipado.mjs` — R18-110i.1-1).
//
// ── Credenciais ─────────────────────────────────────────────────────────────────────────────────
// `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (env var, **nunca** hardcoded — e nunca em log). É o JSON da
// service account com acesso ao Play Console (A2/A3 do enunciado do 110i). Se não existir, a lib
// falha FECHADO com `google_play_nao_configurado` — o endpoint responde 503 e nada é creditado.
//
// ── Sem `googleapis` (DECISÃO D-2 do SEG-1, declarada) ──────────────────────────────────────────
// A cadeia é `jose` (RS256 da service account) + `fetch`:
//   1) JWT `{iss: client_email, scope: androidpublisher, aud: oauth2/token}` assinado RS256;
//   2) `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer` em `oauth2.googleapis.com/token`
//      → `access_token` (cacheado até `expires_in` menos margem);
//   3) `GET androidpublisher.googleapis.com/androidpublisher/v3/applications/<pkg>/purchases/
//      products/<sku>/tokens/<token>`.
// Razão: o `googleapis` (186.0.0) é um pacote pesado que entraria no bundle da função sem medição
// de tamanho; o `jose` já é dependência declarada de `netlify/functions` e já é usado no repo para
// os tokens de sessão (GATE 5 — Ponytail). A API usada é uma: `purchases.products.get`.
//
// ── Estados do Google (`purchases.products.get`) ────────────────────────────────────────────────
//   purchaseState:        0 = purchased · 1 = canceled · 2 = pending
//   consumptionState:     0 = ainda não consumida · 1 = consumida
//   acknowledgementState: 0 = ainda não reconhecida · 1 = reconhecida
//   (uma compra consumível não reconhecida/consumida é REEMBOLSADA pela Google ao fim de 3 dias —
//    daí o cliente ter de fazer `finish()`; ver a nota de `consumirCompra`.)
//
// Fail-closed em TODA a linha: qualquer erro de rede, HTTP ou JSON devolve `{ok:false, code}`.
// NUNCA se devolve `ok:true` sem uma resposta 200 da Google com `purchaseState === 0`.

import { importPKCS8, SignJWT } from "jose";
import { getSupabase } from "./supabase-client.mjs";

export const PACKAGE_ANDROID = "com.desafiogut.app";

/** SKU do Play Console por tipo de Passe (R18-110i-7) — os MESMOS ids de `src/lib/google-play-billing.js`. */
export const SKU_PASSE = {
  relampago: "passe_relampago_r2",
  programado: "passe_programado_r2",
};

/** Inverso de `SKU_PASSE`: o SKU é o identificador forte, o tipo deriva dele (defesa em profundidade). */
export const TIPO_POR_SKU = {
  passe_relampago_r2: "relampago",
  passe_programado_r2: "programado",
};

export const TABELA_COMPRAS = "google_play_compras";

const ESCOPO = "https://www.googleapis.com/auth/androidpublisher";
const URL_TOKEN = "https://oauth2.googleapis.com/token";
const URL_API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";
const MARGEM_TOKEN_MS = 60000;

/** Erros de rede/HTTP → código do domínio. Nunca lança: devolve sempre `{ok:false, code}`. */
const CODIGO_POR_STATUS = {
  400: "token_invalido",
  401: "credencial_invalida",
  403: "credencial_invalida",
  404: "compra_nao_encontrada",
  410: "token_invalido",
};

let _cacheToken = null; // { token, expiraEm }

/**
 * A env var está presente e é um JSON de service account utilizável?
 * @returns {{ok:true, conta:object}|{ok:false, code:string}}
 */
export function lerCredencial() {
  const bruto = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (typeof bruto !== "string" || bruto.trim() === "") return { ok: false, code: "google_play_nao_configurado" };
  let conta;
  try {
    conta = JSON.parse(bruto);
  } catch {
    return { ok: false, code: "google_play_credencial_invalida" };
  }
  if (!conta || typeof conta.client_email !== "string" || typeof conta.private_key !== "string") {
    return { ok: false, code: "google_play_credencial_invalida" };
  }
  return { ok: true, conta };
}

/** A validação está operacional (credencial presente e com a forma certa)? */
export function configurado() {
  return lerCredencial().ok;
}

/** Só para testes: esquece o token cacheado. */
export function _limparCacheToken() {
  _cacheToken = null;
}

/**
 * Access token OAuth2 da service account (JWT bearer), cacheado.
 * @returns {Promise<{ok:true, token:string}|{ok:false, code:string}>}
 */
export async function obterAccessToken() {
  const cred = lerCredencial();
  if (!cred.ok) return cred;
  const agora = Date.now();
  if (_cacheToken && _cacheToken.expiraEm > agora) return { ok: true, token: _cacheToken.token };

  let jwt;
  try {
    const chave = await importPKCS8(cred.conta.private_key.replace(/\\n/g, "\n"), "RS256");
    jwt = await new SignJWT({ scope: ESCOPO })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(cred.conta.client_email)
      .setAudience(URL_TOKEN)
      .setIssuedAt(Math.floor(agora / 1000))
      .setExpirationTime(Math.floor(agora / 1000) + 3600)
      .sign(chave);
  } catch {
    return { ok: false, code: "google_play_credencial_invalida" };
  }

  let resposta;
  try {
    resposta = await fetch(URL_TOKEN, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }).toString(),
    });
  } catch {
    return { ok: false, code: "validacao_indisponivel" };
  }
  if (!resposta.ok) {
    // 400 invalid_grant = chave/relógio/escopo; 401/403 = conta sem acesso. Nenhum vaza o corpo
    // (pode conter detalhes da credencial) — só o estado.
    return { ok: false, code: resposta.status >= 500 ? "validacao_indisponivel" : "google_play_credencial_invalida" };
  }
  let corpo;
  try {
    corpo = await resposta.json();
  } catch {
    return { ok: false, code: "validacao_indisponivel" };
  }
  if (typeof corpo?.access_token !== "string" || corpo.access_token === "") {
    return { ok: false, code: "google_play_credencial_invalida" };
  }
  const ttlMs = Number.isFinite(corpo.expires_in) ? corpo.expires_in * 1000 : 3600000;
  _cacheToken = { token: corpo.access_token, expiraEm: agora + Math.max(ttlMs - MARGEM_TOKEN_MS, 0) };
  return { ok: true, token: _cacheToken.token };
}

/**
 * Valida uma compra contra a Google Play Developer API.
 *
 * @param {{produtoId:string, purchaseToken:string}} args
 * @returns {Promise<{ok:true, pago:true, purchaseState:number, consumptionState:number,
 *                    acknowledgementState:number|null, orderId:string|null,
 *                    purchaseTimeMillis:number|null, quantity:number}> |
 *                  {ok:false, code:string}>}
 *   `ok:true` exige SEMPRE `purchaseState === 0` (purchased). Compra cancelada (1) ou pendente (2)
 *   devolvem `ok:false` com código próprio — nunca se credita nada.
 */
export async function validarCompra({ produtoId, purchaseToken } = {}) {
  if (typeof produtoId !== "string" || produtoId === "") return { ok: false, code: "produto_invalido" };
  if (typeof purchaseToken !== "string" || purchaseToken.length < 8 || purchaseToken.length > 512) {
    return { ok: false, code: "token_invalido" };
  }
  const auth = await obterAccessToken();
  if (!auth.ok) return auth;

  let resposta;
  try {
    resposta = await fetch(
      `${URL_API}/${encodeURIComponent(PACKAGE_ANDROID)}/purchases/products/${encodeURIComponent(produtoId)}/tokens/${encodeURIComponent(purchaseToken)}`,
      { method: "GET", headers: { authorization: `Bearer ${auth.token}`, accept: "application/json" } },
    );
  } catch {
    return { ok: false, code: "validacao_indisponivel" };
  }
  if (!resposta.ok) {
    return { ok: false, code: CODIGO_POR_STATUS[resposta.status] ?? "validacao_indisponivel" };
  }
  let corpo;
  try {
    corpo = await resposta.json();
  } catch {
    return { ok: false, code: "validacao_indisponivel" };
  }

  const estado = Number(corpo?.purchaseState);
  if (!Number.isInteger(estado)) return { ok: false, code: "validacao_indisponivel" };
  if (estado === 1) return { ok: false, code: "compra_cancelada" };
  if (estado === 2) return { ok: false, code: "compra_pendente" };
  if (estado !== 0) return { ok: false, code: "compra_estado_desconhecido" };

  return {
    ok: true,
    pago: true,
    purchaseState: 0,
    consumptionState: Number.isInteger(Number(corpo?.consumptionState)) ? Number(corpo.consumptionState) : null,
    acknowledgementState: Number.isInteger(Number(corpo?.acknowledgementState)) ? Number(corpo.acknowledgementState) : null,
    orderId: typeof corpo?.orderId === "string" && corpo.orderId !== "" ? corpo.orderId : null,
    purchaseTimeMillis: Number.isFinite(Number(corpo?.purchaseTimeMillis)) ? Number(corpo.purchaseTimeMillis) : null,
    quantity: Number.isInteger(Number(corpo?.quantity)) ? Number(corpo.quantity) : 1,
  };
}

/**
 * Reconhece (acknowledge) uma compra não consumível. **NÃO é usada pelo fluxo deste UTAC** — está
 * aqui declarada porque a linha de base do Google a exige para não consumíveis, e o Passe é
 * CONSUMÍVEL (quem o fecha é o cliente, com `transaction.finish()` do plugin — ver SEG0).
 *
 * ⚠️ Deixada de fora do endpoint DE PROPÓSITO: reconhecer no servidor E consumir no cliente daria
 * dois caminhos de fecho da mesma compra, com uma corrida entre os dois. Declarado, não escondido.
 */
export async function reconhecerCompra({ produtoId, purchaseToken } = {}) {
  if (typeof produtoId !== "string" || produtoId === "") return { ok: false, code: "produto_invalido" };
  if (typeof purchaseToken !== "string" || purchaseToken === "") return { ok: false, code: "token_invalido" };
  const auth = await obterAccessToken();
  if (!auth.ok) return auth;
  let resposta;
  try {
    resposta = await fetch(
      `${URL_API}/${encodeURIComponent(PACKAGE_ANDROID)}/purchases/products/${encodeURIComponent(produtoId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${auth.token}`, "content-type": "application/json" },
        body: JSON.stringify({ developerPayload: "" }),
      },
    );
  } catch {
    return { ok: false, code: "validacao_indisponivel" };
  }
  if (!resposta.ok) return { ok: false, code: CODIGO_POR_STATUS[resposta.status] ?? "validacao_indisponivel" };
  return { ok: true };
}

// ─── registo de idempotência (tabela `google_play_compras`) ─────────────────────────────────────
//
// A chave primária é o PRÓPRIO `purchase_token` (a Google garante-lhe unicidade): receber o mesmo
// recibo duas vezes (retry do cliente, app morta entre o pagamento e a entrega, dois cliques) tem
// de ser UM crédito. É a trava ST5 (idempotência) ao nível do recibo; a trava por `ref` do ledger
// de pontos é a segunda linha (defesa em profundidade).

/** Lê o registo de uma compra pelo token. `null` = não existe. **Lança** em erro do Supabase. */
export async function lerCompra(purchaseToken) {
  const { data, error } = await getSupabase()
    .from(TABELA_COMPRAS).select("*").eq("purchase_token", purchaseToken).maybeSingle();
  if (error) throw new Error(`[google-play-billing] lerCompra falhou: ${error.code ?? error.message}`);
  return data ?? null;
}

/**
 * Grava o registo de uma compra. `23505` (corrida com outro pedido do MESMO token) → devolve
 * `criado:false` com o registo existente, que o chamador volta a ler.
 * @returns {Promise<{ok:true, criado:boolean, registo:object|null}|{ok:false, code:string}>}
 */
export async function registarCompra({ purchaseToken, orderId = null, produtoId, tipoPasse, endereco, payload = null }) {
  const { data, error } = await getSupabase().from(TABELA_COMPRAS).insert({
    purchase_token: purchaseToken,
    order_id: orderId,
    produto_id: produtoId,
    tipo_passe: tipoPasse,
    endereco,
    estado: "recebida",
    payload,
  }).select("*");
  if (error) {
    if (error.code === "23505") return { ok: true, criado: false, registo: null };
    return { ok: false, code: "registo_falhou" };
  }
  return { ok: true, criado: true, registo: Array.isArray(data) ? data[0] ?? null : data ?? null };
}

/** Fecha o estado do registo (`creditada`/`falhada`) com os números entregues. Erros → `{ok:false}`. */
export async function fecharCompra(purchaseToken, estado, numeros = {}) {
  const patch = {
    estado,
    pontos: Number.isInteger(numeros.pontos) ? numeros.pontos : null,
    creditos_lance: Number.isInteger(numeros.creditosLance) ? numeros.creditosLance : null,
    eco_quildo: Number.isInteger(numeros.ecoQuildo) ? numeros.ecoQuildo : null,
    motivo: typeof numeros.motivo === "string" ? numeros.motivo : null,
    atualizado_em: new Date().toISOString(),
  };
  const { error } = await getSupabase().from(TABELA_COMPRAS).update(patch).eq("purchase_token", purchaseToken);
  return error ? { ok: false, code: "registo_falhou" } : { ok: true };
}
