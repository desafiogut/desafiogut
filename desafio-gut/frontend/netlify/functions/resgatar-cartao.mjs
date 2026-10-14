// POST /.netlify/functions/resgatar-cartao — UTAC106g. RESGATE do cartão colecionável (50 pontos → 1 cartão).
//
// ⚠️ ADITIVO. Endpoint NOVO e SEPARADO do Via A (`comprar-passe.mjs`) e do Via B da compra
// (`comprar-passe-pontos.mjs`) — ambos intactos.
//
// Header: Authorization: Bearer ***   ·   Body: { cartaoId, morada, idempotencyKey, email? }
//   (a chave também é aceite no header `x-idempotency-key`, como no `comprar-passe-pontos`)
//   `morada` = o MESMO contrato de `_lib/pedidos.mjs` (`validarMorada`): nome, cpf, cep,
//   logradouro, numero, complemento?, bairro, cidade, uf, telefone?
//
// ⚠️ UTAC110g (FRENTE C) — `email?` (OPCIONAL, decisão D-110g-1 declarada ao operador): o único e-mail
// que o sistema conhece é o do LOGIN (Privy), que vive no CLIENTE — o JWT do titular só traz
// `{ endereco, tipo }` e `validarMorada`/`public.resgates` não têm e-mail. O cliente envia-o, o servidor
// usa-o SÓ PARA ENVIAR a confirmação e **NÃO o persiste** (minimização — o espírito da R18-110g-4,
// «evita armazenar dados sem uso»). Sem `email` no corpo, o resgate segue exactamente como antes.
//
// 201 { ok, idempotent:false, resgateId, status:"pendente", pontos }   resgate criado, 50 pontos debitados
// 200 { ok, idempotent:true,  resgateId, status }                      já criado (mesma chave; nada debitado)
// 400 morada_invalida|cartao_invalido|idempotencyKey_invalida|email_invalido · 401 token_ausente|token_invalido
// 402 pontos_insuficientes (o cartão conta SÓ pontos de COMPRA)
// 405 metodo_invalido · 503 sistema_pausado|store_indisponivel
// 502 resgate_falhou (o débito foi compensado — rollback; ver §)
//
// FLUXO (decisão do operador + RESSALVA «rollback obrigatório»): a ordem vive em
// `registarResgate()` (`_lib/passe-pontos.mjs`): idempotência pela chave → gate do CARTÃO por
// `podeResgatarCartaoComCompra()` (NUNCA a antiga) → DÉBITO atómico dos 50 pontos → REGISTO do
// pedido em `public.resgates` → ROLLBACK do débito se o registo falhar.
// Sem dados pessoais em logs (P10 / LGPD): a `morada` e o `email` NUNCA são registados — só códigos de erro.

import { jsonResponse, jsonError, parseJsonBody, ValidationError, validarEmail } from "./_lib/validate.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { sistemaPausado, lerEstadoSistema } from "./_lib/system-state.mjs";
import { validarMorada } from "./_lib/pedidos.mjs";
import { registarResgate, PONTOS_POR_CARTAO } from "./_lib/passe-pontos.mjs";
import { adicionarNotificacao } from "./_lib/notificacoes-usuario.mjs";

const IDEMPOTENCY_RE = /^[A-Za-z0-9._:-]{8,200}$/;

// ── FRENTE C (UTAC110g) — prazos e textos decididos pelo operador ────────────────────────────────
/** R18-110g-3 — prazo de entrega do cartão, em dias CORRIDOS. */
export const PRAZO_ENTREGA_DIAS = 30;
/** R18-110g-2 — quem paga o envio. */
export const PAGADOR_ENVIO = "Associação Recreativa dos Nordestinos no Amazonas (Família Quildo)";
/** Mensagem in-app do GUTO (C1). O prazo é o da R18-110g-3. */
export const MSG_NOTIFICACAO_RESGATE =
  `Cartão resgatado! Chega em ${PRAZO_ENTREGA_DIAS} dias. A Família Quildo prepara e paga o envio.`;

/**
 * Texto do e-mail de confirmação + a Nota Técnica do resgate (C1-email / C2). **PURA** — testável sem rede.
 * @returns {{assunto:string, mensagem:string}}
 */
export function montarEmailResgate({ nome, resgateId, pontos = PONTOS_POR_CARTAO, prazoDias = PRAZO_ENTREGA_DIAS } = {}) {
  const quem = typeof nome === "string" && nome.trim() ? nome.trim().split(/\s+/)[0] : "olá";
  const id = resgateId == null ? "—" : String(resgateId);
  return {
    assunto: `Cartão colecionável resgatado — chega em ${prazoDias} dias`,
    mensagem: [
      `${quem === "olá" ? "Olá" : `Olá, ${quem}`}!`,
      "",
      `O seu resgate do cartão colecionável DESAFIOGUT foi registado (pedido nº ${id}).`,
      `Trocou ${pontos} pontos de fidelidade pelo cartão.`,
      "",
      `· Prazo de entrega: até ${prazoDias} dias corridos.`,
      `· O envio é pago por ${PAGADOR_ENVIO}.`,
      // ⚠️ B-110g-1 (validador adversarial, 2026-10-14): aqui dizia-se «· O estado do pedido aparece na
      // sua Carteira.» — e isso era FALSO: a C3 (estado do pedido visível) NÃO foi implementada (exigiria
      // endpoint + ecrã novos, fora do AUTORIZA; `lerResgates` não tem consumidor e a Carteira não mostra
      // nada do resgate). Um e-mail transaccional não pode prometer um ecrã que não existe. A frase foi
      // trocada por uma afirmação VERDADEIRA (este e-mail É o comprovante) e há teste que a proíbe de voltar.
      "· Guarde este e-mail: é o comprovante do seu pedido.",
      "",
      `Nota Técnica do resgate nº ${id}`,
      `${PAGADOR_ENVIO} é a patrocinadora do cartão e emite a Nota Técnica da entrega.`,
      "O DESAFIOGUT não emite documento fiscal deste resgate: os pontos de fidelidade não são",
      "mercadoria e o cartão é entregue pela patrocinadora.",
    ].join("\n"),
  };
}

async function titular(req) {
  const h = req.headers.get("authorization") || "";
  const bearer = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!bearer) return { erro: "token_ausente" };
  try {
    const p = await verificarUserSession(bearer);
    const e = String(p?.endereco || "").toLowerCase();
    return /^0x[0-9a-f]{40}$/.test(e) ? { endereco: e } : { erro: "token_invalido" };
  } catch { return { erro: "token_invalido" }; }
}

/** Chave de idempotência: header `x-idempotency-key` tem prioridade; senão o corpo. */
function chaveIdempotencia(req, body) {
  const doHeader = req.headers.get("x-idempotency-key");
  const doBody = body?.idempotencyKey;
  const k = typeof doHeader === "string" && doHeader !== "" ? doHeader : doBody;
  return typeof k === "string" && IDEMPOTENCY_RE.test(k) ? k : null;
}

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });

  const rl = await aplicarRateLimit(req, "resgatar-cartao", 5);
  if (rl) return rl;
  if (sistemaPausado(await lerEstadoSistema())) {
    return jsonError(503, "sistema_pausado", "Sistema em manutenção. Tente novamente em breve.");
  }

  const t = await titular(req);
  if (t.erro) return jsonError(401, t.erro, "Authorization: Bearer *** válido obrigatório");

  let body;
  try { body = await parseJsonBody(req); }
  catch (err) { if (err instanceof ValidationError) return jsonError(400, err.code, err.message); throw err; }

  const idempotencyKey = chaveIdempotencia(req, body);
  if (!idempotencyKey) {
    return jsonError(400, "idempotencyKey_invalida", "envie { idempotencyKey } (8–200 chars [A-Za-z0-9._:-])");
  }

  const cartaoId = typeof body?.cartaoId === "string" ? body.cartaoId.trim() : "";
  if (!cartaoId || cartaoId.length > 80) {
    return jsonError(400, "cartao_invalido", "envie { cartaoId } (1–80 chars)");
  }

  // A MORADA é validada pelo MESMO contrato da entrega (`_lib/pedidos.mjs`) — não se duplica a regra.
  let morada;
  try { morada = validarMorada(body?.morada); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, "morada_invalida", err.message, { motivo: err.code });
    throw err;
  }

  // UTAC110g (FRENTE C) — e-mail de destino da confirmação: OPCIONAL. Ausente/vazio ⇒ `null` e o
  // resgate corre exactamente como antes; presente mas inválido ⇒ 400 (nunca se envia para lixo).
  let email = null;
  if (body?.email !== undefined && body?.email !== null && String(body.email).trim() !== "") {
    try { email = validarEmail(body.email); }
    catch (err) {
      if (err instanceof ValidationError) return jsonError(400, "email_invalido", err.message);
      throw err;
    }
  }

  let r;
  try { r = await registarResgate(t.endereco, { cartaoId, morada, idempotencyKey }); }
  catch { return jsonError(503, "store_indisponivel", "não foi possível registar o resgate"); }

  if (!r.ok) {
    if (r.code === "PONTOS_INSUFICIENTES") {
      return jsonError(402, "pontos_insuficientes",
        `são precisos ${PONTOS_POR_CARTAO} pontos de compra para resgatar o cartão`);
    }
    if (r.code === "ENDERECO_INVALIDO" || r.code === "CHAVE_INVALIDA" || r.code === "CARTAO_INVALIDO") {
      return jsonError(400, r.code.toLowerCase(), "pedido de resgate inválido");
    }
    // O débito foi compensado (rollback) — nunca se cobra pontos sem criar o pedido.
    console.error("[resgatar-cartao] resgate falhou", { code: r.code, motivo: r.motivo, devolvido: r.pontosDevolvidos });
    return jsonError(502, "resgate_falhou", "não foi possível criar o pedido de resgate",
      { devolvido: r.pontosDevolvidos === true });
  }

  // Notificação ao TITULAR (fail-soft: nunca parte o resgate). A operação vê o pedido na tabela
  // `public.resgates` (status "pendente") — não há aqui endereço da Associação configurado.
  // UTAC110g (FRENTE C/C1): o texto passou a dizer o PRAZO (R18-110g-3) e quem paga o envio (R18-110g-2).
  if (r.idempotent !== true) {
    adicionarNotificacao(t.endereco, {
      tipo: "resgate",
      mensagem: MSG_NOTIFICACAO_RESGATE,
      ref: String(r.resgate?.id ?? ""),
    }).catch(() => {});

    // UTAC110g (FRENTE C/C1-email + C2) — confirmação por e-mail (SendGrid) com a Nota Técnica em texto.
    // Só quando há destino E o resgate é NOVO (a repetição idempotente não reenvia). FAIL-SOFT por
    // inteiro: a falta da dependência, da chave ou uma falha do fornecedor NÃO muda a resposta.
    // O e-mail NÃO é guardado em lado nenhum (minimização — ver o cabeçalho).
    if (email) {
      try {
        const { enviarEmail } = await import("./_lib/email.mjs");
        const texto = montarEmailResgate({ nome: morada?.nome, resgateId: r.resgate?.id });
        await enviarEmail({ para: email, assunto: texto.assunto, mensagem: texto.mensagem });
      } catch { /* fail-soft: o resgate já está criado e debitado */ }
    }
  }

  const corpo = {
    ok: true, idempotent: r.idempotent === true,
    resgateId: r.resgate?.id ?? null, status: r.resgate?.status ?? "pendente",
    pontos: r.pontos,
  };
  return r.idempotent === true ? jsonResponse(corpo, 200) : jsonResponse(corpo, 201);
};
