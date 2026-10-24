// POST /.netlify/functions/iniciar-pagamento
// Body: { endereco: "0x...", qtd: 1..100 }
// Resposta 200: { pedidoId, valorBRL, qrCodeText, qrCodeImage|null,
//                 validUntil, token, provider, simulated }
// Resposta 400: { error: { code, message } }
//
// Idempotência: o pedidoId é gerado server-side. Replays do client com o mesmo
// payload geram pedidos diferentes — o que é OK; idempotência REAL é em
// /confirmar-pagamento (Netlify Blobs por pedidoId).

import { randomUUID } from "node:crypto";
import { assinarPedido } from "./_lib/jwt.mjs";
import {
  validarEndereco,
  validarQuantidadeFichas,
  calcularValorBRL,
  jsonResponse,
  jsonError,
  parseJsonBody,
  ValidationError,
  validarCPF,      // MC87 (P2-2)
  validarEmail,    // MC87 (P2-2)
} from "./_lib/validate.mjs";
import { getPixProvider, PIX_PROVIDER_NAME } from "./_lib/pix-provider/index.mjs";
import { gravarMetaPedido } from "./_lib/meta.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { lerPedido, marcarPedidoPago, guardarPixPendente } from "./_lib/pedidos.mjs";
import { consultarPagamento } from "./_lib/mp-client.mjs";

const TTL_SEC = 15 * 60; // 15 minutos para o usuário pagar
// UTAC111 — PIX do produto: válido 24 h no MP; reaproveita-se se faltarem mais de 2 min.
const VALIDADE_PIX_PRODUTO_MS = 24 * 3600 * 1000;
const MARGEM_REUSO_MS = 2 * 60 * 1000;
const STATUS_PENDENTES = new Set(["pending", "in_process", "authorized"]);

// ── UTAC111 — PIX do PRODUTO físico (o vencedor paga o valor do seu lance) ──────────────────────
// Body: { tipo: "produto", produtoId }  ·  Header: Authorization: Bearer <user-session>
// O comprador sai do TOKEN e o valor sai do PEDIDO gravado na consolidação (`valorPagoCentavos`,
// 14 pontos = R$ 0,14) — NUNCA do corpo. O meta leva `tipo:"produto"` + `produtoId`, para o webhook e
// o `confirmar-pagamento` marcarem o pedido como pago em vez de creditarem saldo R$.
// 401 token_ausente|token_invalido · 404 pedido_nao_encontrado · 409 pedido_ja_pago
async function iniciarPagamentoProduto(req, body) {
  const h = req.headers.get("authorization") || "";
  const bearer = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!bearer) return jsonError(401, "token_ausente", "Authorization: Bearer *** obrigatório");
  let endereco;
  try {
    endereco = String((await verificarUserSession(bearer))?.endereco || "").toLowerCase();
  } catch {
    return jsonError(401, "token_invalido", "token rejeitado");
  }
  if (!/^0x[0-9a-f]{40}$/.test(endereco)) return jsonError(401, "token_invalido", "token rejeitado");

  const produtoId = typeof body.produtoId === "string" ? body.produtoId.trim() : "";
  const pedido = produtoId ? await lerPedido(produtoId) : null;
  // Outro comprador = 404, como em definirMorada: não confirma que o pedido existe.
  if (!pedido || pedido.comprador !== endereco) return jsonError(404, "pedido_nao_encontrado", "pedido não encontrado");
  if (pedido.pago_em) return jsonError(409, "pedido_ja_pago", "este produto já foi pago");
  // Um pedido já enviado (pedidos anteriores a este fluxo) nunca pede pagamento — a mesma regra do cliente.
  if (pedido.rastreio) return jsonError(409, "pedido_ja_enviado", "este pedido já foi enviado");
  if (!Number.isInteger(pedido.valorPagoCentavos) || pedido.valorPagoCentavos <= 0) {
    return jsonError(409, "valor_invalido", "pedido sem valor de lance válido");
  }
  const valorCentavos = pedido.valorPagoCentavos;
  const valorBRL = Number((valorCentavos / 100).toFixed(2));
  const agora = Date.now();

  // 1) Reaproveita o PIX pendente (decisão do operador): o mesmo código enquanto não for pago nem expirar.
  const pend = pedido.pixPendente;
  if (pend?.paymentId && pend.valorCentavos === valorCentavos && Date.parse(pend.expiraEm) - agora > MARGEM_REUSO_MS) {
    const status = await consultarPagamento(pend.paymentId).then((p) => p?.status ?? null).catch(() => null);
    if (status === "approved") {
      await marcarPedidoPago(produtoId, { endereco, valorCentavos, paymentId: pend.paymentId, fonte: "iniciar-pagamento" });
      return jsonError(409, "pedido_ja_pago", "este produto já foi pago");
    }
    // Pendente — ou o MP não respondeu: devolver o MESMO código é seguro (pagar duas vezes é que não).
    if (status === null || STATUS_PENDENTES.has(status)) {
      return responderPixProduto({ pix: pend, endereco, produtoId, valorBRL, valorCentavos, reutilizado: true });
    }
    // cancelled / rejected / expired → gera um novo abaixo.
  }

  // 2) PIX novo, válido 24 h no MP; a sondagem do cliente segue ESSE prazo (o JWT dura até lá).
  const expiraEmMs = agora + VALIDADE_PIX_PRODUTO_MS;
  const pedidoId = randomUUID();
  let gerado;
  try {
    gerado = await getPixProvider().gerarPedidoPix({ pedidoId, valorBRL, expiraEmMs });
  } catch (err) {
    console.error("[iniciar-pagamento] produto: provider falhou", {
      name: err?.name, code: err?.code, message: err?.message, status: err?.status,
    });
    if (err?.code === "mp_config_invalida") {
      return jsonError(500, "pix_provider_mal_configurado", "PIX provider sem credenciais válidas");
    }
    return jsonError(502, "pix_provider_indisponivel", "não foi possível gerar o PIX agora");
  }
  const pix = {
    pedidoId, paymentId: gerado.paymentId ?? null, qrCodeText: gerado.qrCodeText, qrCodeImage: gerado.qrCodeImage ?? null,
    expiraEm: new Date(expiraEmMs).toISOString(), valorCentavos, simulated: !!gerado.simulated,
  };
  await gravarMetaPedido({ pedidoId, endereco, qtd: null, valorBRL, paymentId: pix.paymentId, tipo: "produto", produtoId });

  // Só um PIX com paymentId (MP real) se pode reaproveitar — o do mock não é verificável.
  if (pix.paymentId) {
    const g = await guardarPixPendente(produtoId, endereco, pix, agora, pend?.paymentId ?? null);
    if (g?.vencedor) return responderPixProduto({ pix: g.vencedor, endereco, produtoId, valorBRL, valorCentavos, reutilizado: true });
    if (g?.code === "pedido_ja_pago") return jsonError(409, "pedido_ja_pago", "este produto já foi pago");
    if (!g?.ok) console.warn("[iniciar-pagamento] produto: PIX pendente não guardado (não-fatal)", { produtoId, code: g?.code });
  }
  return responderPixProduto({ pix, endereco, produtoId, valorBRL, valorCentavos, reutilizado: false });
}

// O JWT de confirmação dura até à expiração REAL do PIX (não 15 min): um pagamento tardio continua confirmável.
async function responderPixProduto({ pix, endereco, produtoId, valorBRL, valorCentavos, reutilizado }) {
  const ttlSec = Math.max(60, Math.floor((Date.parse(pix.expiraEm) - Date.now()) / 1000));
  let token;
  try {
    const payload = { pedidoId: pix.pedidoId, endereco, valorBRL, tipo: "produto", produtoId };
    if (pix.paymentId) payload.paymentId = pix.paymentId;
    token = await assinarPedido(payload, ttlSec);
  } catch (err) {
    console.error("[iniciar-pagamento] jwt falhou", { name: err?.name, message: err?.message });
    return jsonError(500, "jwt_indisponivel", "configuração de servidor incompleta");
  }
  return jsonResponse({
    pedidoId: pix.pedidoId,
    tipo: "produto",
    produtoId,
    valorBRL,
    valorCentavos,
    qrCodeText: pix.qrCodeText,
    qrCodeImage: pix.qrCodeImage,
    simulated: !!pix.simulated,
    provider: PIX_PROVIDER_NAME,
    validUntil: pix.expiraEm,
    reutilizado,
    token,
  });
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

  const rl = await aplicarRateLimit(req, "iniciar-pagamento", 5);
  if (rl) return rl;

  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com endereco e qtd");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  // UTAC111 — ramo isolado do produto físico; o depósito de saldo abaixo fica igual.
  if (body.tipo === "produto") return iniciarPagamentoProduto(req, body);

  let endereco, qtd, valorBRL;
  try {
    endereco = validarEndereco(body.endereco);
    qtd      = validarQuantidadeFichas(body.qtd);
    valorBRL = calcularValorBRL(qtd);
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  const pedidoId = randomUUID();
  const issuedAt = Date.now();
  const validUntil = new Date(issuedAt + TTL_SEC * 1000).toISOString();

  // Dados opcionais do pagador (CPF/e-mail/nome) — quando o frontend os coletar.
  // Contas de produção do MP podem exigir payer.identification; sem isso o
  // provider cai para o fallback de env (MP_PAYER_*). Campos só lidos se forem
  // strings; documento é normalizado para dígitos no provider.
  // MC87 (P2-2) — o CPF era aceite como "qualquer string até 32 chars" e o e-mail
  // sem validação de formato. Não havia risco de injeção (o valor vira JSON para a
  // API do MP), mas um documento malformado só falhava lá à frente, com um erro
  // opaco para quem estava a pagar. Agora validamos aqui, com dígitos
  // verificadores, e devolvemos 400 com a causa.
  //
  // Ambos continuam OPCIONAIS: ausentes → o provider cai no fallback de env
  // (MP_PAYER_*), exatamente como antes. Só o que VEM tem de ser válido.
  let pagador;
  if (body.pagador && typeof body.pagador === "object") {
    const p = body.pagador;
    try {
      pagador = {
        email:   p.email != null && p.email !== "" ? validarEmail(p.email)     : undefined,
        cpf:     p.cpf   != null && p.cpf   !== "" ? validarCPF(p.cpf)         : undefined,
        tipoDoc: typeof p.tipoDoc === "string" ? p.tipoDoc.slice(0, 8)         : undefined,
        nome:    typeof p.nome    === "string" ? p.nome.slice(0, 140)          : undefined,
      };
    } catch (err) {
      if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
      throw err;
    }
  }

  let pix;
  try {
    // await aceita retorno síncrono (mock) e Promise (mercadopago).
    pix = await getPixProvider().gerarPedidoPix({ pedidoId, valorBRL, pagador });
  } catch (err) {
    console.error("[iniciar-pagamento] provider falhou", {
      name: err?.name, code: err?.code, message: err?.message, status: err?.status,
    });
    if (err?.code === "mp_config_invalida") {
      return jsonError(500, "pix_provider_mal_configurado", "PIX provider sem credenciais válidas");
    }
    return jsonError(502, "pix_provider_indisponivel", "não foi possível gerar pedido PIX agora");
  }

  let token;
  try {
    // paymentId só existe quando o provider real (mercadopago) é usado.
    // No mock fica undefined → JWT sem paymentId → confirmar-pagamento
    // mantém o caminho legado (trust JWT, sem checar MP).
    const payload = { pedidoId, endereco, qtd, valorBRL };
    if (pix.paymentId) payload.paymentId = pix.paymentId;
    token = await assinarPedido(payload, TTL_SEC);
  } catch (err) {
    console.error("[iniciar-pagamento] jwt falhou", { name: err?.name, message: err?.message });
    return jsonError(500, "jwt_indisponivel", "configuração de servidor incompleta");
  }

  // Persiste metadados para o webhook poder creditar sem o JWT (que vive
  // só no cliente). Não-fatal: confirmar-pagamento ainda funciona via JWT.
  await gravarMetaPedido({ pedidoId, endereco, qtd, valorBRL, paymentId: pix.paymentId });

  return jsonResponse({
    pedidoId,
    valorBRL,
    qtd,
    qrCodeText: pix.qrCodeText,
    qrCodeImage: pix.qrCodeImage,
    simulated: pix.simulated,
    provider: PIX_PROVIDER_NAME,
    validUntil,
    token,
  });
};
