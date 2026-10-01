// POST /.netlify/functions/comprar-passe — MC105a. Compra do Passe Desafio (R$ 2,00, pago com saldo R$; off-chain).
// Header: Authorization: Bearer <user-session>      Body: { edicaoId, produtoId }
//
// 201 { ok, idempotent:false, passe, saldoRsAntesCentavos, saldoRsDepoisCentavos }   passe criado, R$ 2,00 debitado
// 200 { ok, idempotent:true,  passe }                                                  já existia (nada debitado)
// 400 params_invalidos · 401 token_ausente|token_invalido · 402 saldo_insuficiente · 404 edicao/produto_nao_encontrado
// 409 edicao_nao_programada|edicao_encerrada|edicao_nao_iniciada|produto_nao_vinculado|produto_nao_ativo|sem_cupons_ativos
// 502 debito_falhou|gravar_passe_falhou (com reembolso) · 503 sistema_pausado|store_indisponivel
//
// Idempotência (HG13, decisão do operador no SEG-1): 1 passe por (endereco, edição, produto) — o UNIQUE da tabela.
// `saldoRs.mjs` não tem débito com chave: verifica-se o passe → debita (atómico, nunca negativo) → INSERT; se o INSERT
// perde uma corrida (23505), REEMBOLSA e devolve o existente. Em falha do INSERT, reembolsa. Reembolso falhado → alerta.
// Edições aceites (decisão do operador): só `tipo === "programado"`, dentro da janela, e o produto tem de ser o vinculado
// à edição (`meta.produtoId`) e estar `ativo` no catálogo. Sem dados pessoais em logs (P10).
// UTAC105b: o passe nasce com os cupons ACTIVOS do lojista do produto (`produto.lojista`), lidos antes do débito e gravados no
// próprio INSERT (R18-D). Sem cupons activos → 409 `sem_cupons_ativos`, nada debitado (R18-C).

import { getStore } from "@netlify/blobs";
import { jsonResponse, jsonError, parseJsonBody, ValidationError } from "./_lib/validate.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { sistemaPausado, lerEstadoSistema } from "./_lib/system-state.mjs";
import { captureSecurityAlert } from "./_lib/sentry-server.mjs";
import { buscarEdicao, EDICAO_ID_RE } from "./_lib/edicoes-core.mjs";
import { verificarJanelaLance } from "./_lib/edicao-janela.mjs";
import { debitarSaldoRs, reembolsarSaldoRs } from "./_lib/saldoRs.mjs";
import { criarPasse, lerPasse } from "./_lib/passe.mjs";
import { listarCuponsAtivosDoLojista } from "./_lib/cupom.mjs";

export const VALOR_PASSE_CENTAVOS = 200; // R$ 2,00
const PRODUTO_ID_RE = /^[0-9a-f-]{10,64}$/i;

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

async function lerProduto(produtoId) {
  let store;
  try { store = getStore({ name: "produtos", consistency: "strong" }); } catch { return { indisponivel: true }; }
  try { return { produto: await store.get(`produto:${produtoId}`, { type: "json" }) }; } catch { return { indisponivel: true }; }
}

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });

  const rl = await aplicarRateLimit(req, "comprar-passe", 5);
  if (rl) return rl;
  if (sistemaPausado(await lerEstadoSistema())) {
    return jsonError(503, "sistema_pausado", "Sistema em manutenção. Tente novamente em breve.");
  }

  const t = await titular(req);
  if (t.erro) return jsonError(401, t.erro, "Authorization: Bearer <user-session> válido obrigatório");
  const endereco = t.endereco;

  let body;
  try { body = await parseJsonBody(req); }
  catch (err) { if (err instanceof ValidationError) return jsonError(400, err.code, err.message); throw err; }
  const edicaoId = body?.edicaoId, produtoId = body?.produtoId;
  if (typeof edicaoId !== "string" || !EDICAO_ID_RE.test(edicaoId) || typeof produtoId !== "string" || !PRODUTO_ID_RE.test(produtoId)) {
    return jsonError(400, "params_invalidos", "envie { edicaoId, produtoId } válidos");
  }

  // Edição: existe, é Programada, está aberta, e vende ESTE produto.
  const meta = await buscarEdicao(edicaoId);
  if (!meta) return jsonError(404, "edicao_nao_encontrada", "edição não encontrada");
  if (meta.tipo !== "programado") return jsonError(409, "edicao_nao_programada", "o Passe só vale para edições Programadas");
  const janela = verificarJanelaLance(meta);
  if (janela) return jsonError(409, janela.code, janela.message);
  if (meta.produtoId !== produtoId) return jsonError(409, "produto_nao_vinculado", "o produto não é o desta edição");
  const { produto, indisponivel } = await lerProduto(produtoId);
  if (indisponivel) return jsonError(503, "store_indisponivel", "catálogo indisponível");
  if (!produto) return jsonError(404, "produto_nao_encontrado", "produto não encontrado");
  if (produto.status !== "ativo") return jsonError(409, "produto_nao_ativo", "o produto não está activo");

  // Idempotência: já tem o passe → devolve-o, sem debitar.
  let existente;
  try { existente = await lerPasse({ endereco, edicaoId, produtoId }); }
  catch { return jsonError(503, "store_indisponivel", "não foi possível ler os passes"); }
  if (existente) return jsonResponse({ ok: true, idempotent: true, passe: existente }, 200);

  // UTAC105b — cupons do lojista do produto (1 edição → 1 produto → 1 lojista), ANTES do débito.
  let cupons;
  try { cupons = await listarCuponsAtivosDoLojista(produto.lojista); }
  catch { return jsonError(503, "store_indisponivel", "não foi possível ler os cupons"); }
  if (cupons.length === 0) return jsonError(409, "sem_cupons_ativos", "o lojista desta edição não tem cupons activos");
  const cuponsIds = cupons.map((c) => c.id);

  // Débito atómico (CAS no saldoRs.mjs): recusa com `saldo_insuficiente` se não chega — nunca fica negativo (HG14).
  const debito = await debitarSaldoRs({ endereco, valorCentavos: VALOR_PASSE_CENTAVOS, motivo: "comprar-passe" });
  if (!debito.ok) {
    if (debito.code === "saldo_insuficiente") {
      // Cliques concorrentes na MESMA chave: o que ganhou já debitou e criou o passe — o perdedor devolve-o (HG13),
      // em vez de um 402 falso (achado do validador).
      const jaTem = await lerPasse({ endereco, edicaoId, produtoId }).catch(() => null);
      if (jaTem) return jsonResponse({ ok: true, idempotent: true, passe: jaTem }, 200);
      return jsonError(402, "saldo_insuficiente", "saldo R$ insuficiente para o Passe (R$ 2,00)");
    }
    return jsonError(502, "debito_falhou", "não foi possível debitar o saldo R$", { motivo: debito.code }); // `code` nos extras sobrescreveria error.code
  }

  // Criação. Corrida perdida, falha ou EXCEPÇÃO depois do débito → devolve o R$ 2,00 (nunca fica cobrado sem passe).
  let r;
  try { r = await criarPasse({ endereco, edicaoId, produtoId, cuponsIds }); }
  catch { r = { ok: false, code: "gravar_passe_falhou" }; }
  if (r.ok && r.criado) {
    return jsonResponse({
      ok: true, idempotent: false, passe: r.passe,
      saldoRsAntesCentavos: debito.resultado.saldoAntesCentavos, saldoRsDepoisCentavos: debito.resultado.saldoDepoisCentavos,
    }, 201);
  }
  const reembolso = await reembolsarSaldoRs({ endereco, valorCentavos: VALOR_PASSE_CENTAVOS, motivo: "comprar-passe" });
  if (!reembolso.ok) {
    captureSecurityAlert("comprar_passe_reembolso_falhou", { edicaoId, code: reembolso.code }, "error").catch(() => {});
  }
  if (r.ok) return jsonResponse({ ok: true, idempotent: true, passe: r.passe, reembolsado: reembolso.ok }, 200);
  console.error("[comprar-passe] gravar passe falhou", { code: r.code, reembolsado: reembolso.ok });
  return jsonError(502, "gravar_passe_falhou", "não foi possível registar o Passe", { reembolsado: reembolso.ok });
};
