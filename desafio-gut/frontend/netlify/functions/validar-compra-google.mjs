// POST /.netlify/functions/validar-compra-google — UTAC110i.1 (FRENTE C).
//
// Valida uma compra do Passe Desafio feita no GOOGLE PLAY BILLING (Android) e — só depois de a
// Google Play Developer API confirmar o recibo — credita os benefícios do Passe.
//
// Fluxo:
//   1) Bearer `user-session` (o MESMO token dos endpoints PIX; `verificarUserSession`);
//   2) O TIPO FIXA O SKU: `{ tipo, sku }` têm de coincidir com `SKU_PASSE` (defesa em profundidade
//      R18-110i-7: o cliente manda os dois, mas quem decide é o servidor);
//   3) idempotência pelo `purchase_token` na tabela `google_play_compras` (PK) — o mesmo recibo
//      entregue 2× (retry, app morta entre pagamento e entrega, dois cliques) credita UMA vez;
//   4) `validarCompra` contra a Google (`purchaseState === 0`);
//   5) `creditarPasseGoogle` — MESMA cadeia de crédito do PIX, **sem débito nem reembolso de R$**
//      (o dinheiro foi para a Google; R18-110i.1-1 — decisão do operador);
//   6) fecha o registo com os números entregues.
//
// ⚠️ Quem FECHA a compra na loja é o CLIENTE (`transaction.finish()` do plugin — ver SEG0), não
//    este endpoint: reconhecer no servidor E consumir no cliente seriam dois caminhos de fecho da
//    mesma compra, com uma corrida entre eles. `reconhecerCompra` existe na lib, sem uso — declarado.
//
// Body: { tipo: "relampago"|"programado", sku: "passe_relampago_r2"|"passe_programado_r2", purchaseToken }
// 200/201 { ok, idempotent, tipo, pontosFidelidade, creditosLance?, ecoQuildo }
// 400 tipo_invalido|sku_divergente|token_invalido|body_invalido
// 401 token_ausente|token_invalido
// 409 compra_nao_encontrada|compra_cancelada|compra_pendente|compra_ja_consumida
// 502 registo_falhou|creditar_pontos_falhou|creditar_pontos_lance_falhou|creditar_eco_quildo_falhou
// 503 sistema_pausado|google_play_nao_configurado|google_play_indisponivel

import { createHash } from "node:crypto";
import { respostaPreflight } from "./_lib/cors.mjs";
import { jsonResponse, jsonError, parseJsonBody, ValidationError } from "./_lib/validate.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { sistemaPausado, lerEstadoSistema } from "./_lib/system-state.mjs";
import { captureSecurityAlert } from "./_lib/sentry-server.mjs";
import { TIPOS_PASSE } from "./_lib/passe-pontos.mjs";
import { creditarPasseGoogle } from "./_lib/comprar-passe-tipado.mjs";
import {
  SKU_PASSE, TIPO_POR_SKU, validarCompra, carregarCredencial,
  lerCompra, registarCompra, fecharCompra,
} from "./_lib/google-play-billing.mjs";

const NOME = "validar-compra-google";
const TOKEN_MIN = 8;
const TOKEN_MAX = 512;

/** `ref` da compra derivada do RECIBO (não do clique): o mesmo token nunca credita duas vezes.
 *  Hash porque o `purchaseToken` da Google chega a ~200 chars e o limite da `ref` nos ledgers é 200. */
export function refGoogle(tipoPasse, purchaseToken) {
  const h = createHash("sha256").update(String(purchaseToken)).digest("hex").slice(0, 32);
  return `passe-${tipoPasse}:gpl-${h}`;
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

/** Códigos de falha da GOOGLE → (estado HTTP, código de domínio). Falha de validação NUNCA é 2xx. */
const RESPOSTA_VALIDACAO = {
  token_invalido: [409, "token_invalido"],
  compra_nao_encontrada: [409, "compra_nao_encontrada"],
  compra_cancelada: [409, "compra_cancelada"],
  compra_pendente: [409, "compra_pendente"],
  compra_estado_desconhecido: [409, "compra_nao_encontrada"],
  google_play_nao_configurado: [503, "google_play_nao_configurado"],
  google_play_credencial_invalida: [503, "google_play_indisponivel"],
  credencial_invalida: [503, "google_play_indisponivel"], // 401/403 do androidpublisher (mesma causa, nome do adaptador)
  validacao_indisponivel: [503, "google_play_indisponivel"],
};

/** UTAC112 — a quantidade de uma compra já creditada (guardada no `payload`); registos antigos = 1. */
function quantidadeDoRegisto(registo) {
  const q = registo?.payload?.quantidade;
  return Number.isSafeInteger(q) && q >= 1 ? q : 1;
}

export default async function handler(req) {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });

  const rl = await aplicarRateLimit(req, NOME, 5);
  if (rl) return rl;
  if (sistemaPausado(await lerEstadoSistema())) {
    return jsonError(503, "sistema_pausado", "Sistema em manutenção. Tente novamente em breve.");
  }

  const t = await titular(req);
  if (t.erro) return jsonError(401, t.erro, "Authorization: Bearer *** válido obrigatório");
  const endereco = t.endereco;

  let body;
  try { body = await parseJsonBody(req); }
  catch (err) { if (err instanceof ValidationError) return jsonError(400, err.code, err.message); throw err; }

  const tipo = body?.tipo;
  const sku = body?.sku;
  const purchaseToken = body?.purchaseToken;
  if (typeof tipo !== "string" || !TIPOS_PASSE.includes(tipo)) {
    return jsonError(400, "tipo_invalido", "tipo tem de ser «relampago» ou «programado»");
  }
  // Defesa em profundidade (R18-110i-7): o SKU manda, e tem de casar com o tipo pedido.
  if (typeof sku !== "string" || TIPO_POR_SKU[sku] !== tipo || SKU_PASSE[tipo] !== sku) {
    return jsonError(400, "sku_divergente", "o sku não corresponde ao tipo de Passe pedido");
  }
  if (typeof purchaseToken !== "string" || purchaseToken.length < TOKEN_MIN || purchaseToken.length > TOKEN_MAX) {
    return jsonError(400, "token_invalido", `purchaseToken tem de ter ${TOKEN_MIN}–${TOKEN_MAX} caracteres`);
  }

  // UTAC114 — cascata: env var -> tabela `config_secrets` (Supabase) -> cache em memória.
  const cred = await carregarCredencial();
  if (!cred.ok) {
    // Falha FECHADO, com código próprio: sem credencial não se valida nada.
    return jsonError(503, cred.code, "pagamento pela loja indisponível de momento");
  }

  // ── idempotência pelo RECIBO ──────────────────────────────────────────────────────────────────
  let registo;
  try {
    registo = await lerCompra(purchaseToken);
  } catch {
    return jsonError(503, "registo_falhou", "não foi possível ler o registo da compra");
  }
  if (registo?.estado === "creditada") {
    return jsonResponse({
      ok: true, idempotent: true, tipo: registo.tipo_passe, quantidade: quantidadeDoRegisto(registo),
      pontosFidelidade: Number(registo.pontos ?? 0),
      ...(tipo === "relampago" ? { creditosLance: Number(registo.creditos_lance ?? 0) } : {}),
      ecoQuildo: Number(registo.eco_quildo ?? 0),
    }, 200);
  }
  if (registo && registo.endereco && registo.endereco !== endereco) {
    // O recibo é de OUTRA conta: não se credita no endereço errado (nem se revela o dono).
    captureSecurityAlert(`${NOME}_recibo_de_outra_conta`, { produto: sku }, "warning").catch(() => {});
    return jsonError(409, "compra_nao_encontrada", "compra não encontrada para esta conta");
  }

  if (!registo) {
    const r = await registarCompra({ purchaseToken, orderId: null, produtoId: sku, tipoPasse: tipo, endereco, payload: null });
    if (!r.ok) return jsonError(502, "registo_falhou", "não foi possível registar a compra");
    if (!r.criado) {
      // Corrida: outro pedido registou o MESMO token entre a leitura e o insert → relê.
      try { registo = await lerCompra(purchaseToken); } catch { registo = null; }
      if (registo?.estado === "creditada" && registo.endereco === endereco) {
        return jsonResponse({
          ok: true, idempotent: true, tipo: registo.tipo_passe, quantidade: quantidadeDoRegisto(registo),
      pontosFidelidade: Number(registo.pontos ?? 0),
          ...(tipo === "relampago" ? { creditosLance: Number(registo.creditos_lance ?? 0) } : {}),
          ecoQuildo: Number(registo.eco_quildo ?? 0),
        }, 200);
      }
      // UTAC115 (ALTO-1) — CORRIDA ENTRE CONTAS: o registo que ganhou a corrida pode pertencer a
      // OUTRA carteira. Sem esta guarda, o pedido perdedor seguia para a Google e creditava o MESMO
      // recibo numa segunda carteira (N Passes por um pagamento, com N sessões em paralelo).
      // Mesmo tratamento da leitura inicial: não se credita no endereço errado nem se revela o dono.
      if (registo && registo.endereco && registo.endereco !== endereco) {
        captureSecurityAlert(`${NOME}_recibo_de_outra_conta_corrida`, { produto: sku }, "warning").catch(() => {});
        return jsonError(409, "compra_nao_encontrada", "compra não encontrada para esta conta");
      }
      // Colisão sem conseguir reler o registo: fail-CLOSED. Creditar aqui seria creditar às cegas.
      if (!registo) return jsonError(503, "registo_falhou", "não foi possível ler o registo da compra");
    }
  }

  // ── validação contra a Google ────────────────────────────────────────────────────────────────
  const v = await validarCompra({ produtoId: sku, purchaseToken });
  if (!v.ok) {
    const [status, code] = RESPOSTA_VALIDACAO[v.code] ?? [502, "validacao_falhou"];
    await fecharCompra(purchaseToken, "falhada", { motivo: v.code }).catch(() => {});
    return jsonError(status, code, "não foi possível confirmar a compra na loja");
  }

  // ── crédito (sem débito de R$: o pagamento foi da Google) ────────────────────────────────────
  const ref = refGoogle(tipo, purchaseToken);
  let creditado;
  try {
    // UTAC112 — os benefícios multiplicam-se pela quantidade do RECIBO validado na Google (nunca do corpo).
    creditado = await creditarPasseGoogle({ endereco, tipoPasse: tipo, ref, quantidade: v.quantity });
  } catch {
    creditado = { ok: false, etapa: "store", code: "ERRO_DB" };
  }
  if (!creditado.ok) {
    await fecharCompra(purchaseToken, "falhada", { motivo: `${creditado.etapa}:${creditado.code}` }).catch(() => {});
    // UTAC112 — recibo PAGO com quantidade acima do limite: não se credita; alerta para tratar à mão
    // (o cliente só fecha a compra na loja depois de o servidor confirmar ⇒ a Google reembolsa a não reconhecida).
    if (creditado.code === "quantidade_invalida") {
      captureSecurityAlert(`${NOME}_quantidade_fora_do_limite`, { produto: sku, quantidade: v.quantity }, "error").catch(() => {});
    }
    const mapa = {
      pontos: "creditar_pontos_falhou",
      lance: "creditar_pontos_lance_falhou", // UTAC110n: a etapa «lance» passou a creditar pontos
      eco: "creditar_eco_quildo_falhou",
    };
    return jsonError(502, mapa[creditado.etapa] ?? "creditar_falhou",
      "a compra foi confirmada mas os benefícios não foram entregues; tente de novo", { motivo: creditado.code });
  }

  const fecho = await fecharCompra(purchaseToken, "creditada", {
    pontos: creditado.pontos, creditosLance: creditado.creditosLance, ecoQuildo: creditado.ecoQuildo,
    motivo: v.orderId ?? null, quantidade: v.quantity,
  }).catch(() => ({ ok: false }));
  if (!fecho.ok) {
    // Os benefícios JÁ foram entregues: devolver erro faria o cliente repetir (e repetir é inócuo,
    // mas o utilizador veria um erro falso). Alerta-se e responde-se ok — declarado no relatório.
    captureSecurityAlert(`${NOME}_fecho_registo_falhou`, { produto: sku }, "error").catch(() => {});
  }

  return jsonResponse({
    ok: true, idempotent: creditado.idempotent === true, tipo, quantidade: v.quantity,
    pontosFidelidade: creditado.pontos,
    ...(tipo === "relampago" ? { creditosLance: creditado.creditosLance ?? 0 } : {}),
    ecoQuildo: creditado.ecoQuildo,
  }, creditado.idempotent === true ? 200 : 201);
}
