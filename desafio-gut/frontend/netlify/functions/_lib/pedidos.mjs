// _lib/pedidos.mjs — MC-ECOMMERCE-01a. A camada de e-commerce sobre o catálogo:
// ponte apuração → catálogo, dados de entrega, rastreio e NF-e.
//
// ⛔ PORQUE A PONTE VIVE AQUI E NÃO NO `produtos.mjs` (medido no SEG-1):
//   o `PUT produtos?acao=registrar-vencedor` aceitava o vencedor do CORPO do pedido e
//   deixava o LOJISTA dono do produto chamá-lo — um lojista escolhia quem ganhava.
//   Aqui o vencedor só entra por UM caminho: o resultado da consolidação, DEPOIS do
//   recibo on-chain (`consolidacao.mjs`) ou relido do marcador de consolidação
//   (`reprocessarVendaDaEdicao`, admin). Nenhuma função deste módulo lê um Request.
//
// A LIGAÇÃO edição → produto é do ADMIN (`produtoId` na criação da edição, ver
// `vincularProdutoAEdicao`). O `produto.edicaoId` que o lojista escreve no POST é
// informativo e NÃO é fonte da ponte.
//
// ⚠️ PRIVACIDADE (LGPD): a morada e o CPF do destinatário vivem num store PRÓPRIO
// ("pedidos"), NUNCA no registo do produto — o `GET produtos?id=` é público.
//
// Stores (consistency: strong):
//   "produtos"  chave `produto:${id}`      (o mesmo do produtos.mjs)
//   "pedidos"   chave `pedido:${produtoId}` + índice `comprador:${endereco}` = { ids }

import { getStore } from "@netlify/blobs";
import { cacheDel } from "./cache.mjs";
import { validarCPF, ValidationError } from "./validate.mjs";
import { adicionarNotificacao } from "./notificacoes-usuario.mjs";

const STORE_PRODUTOS = "produtos";
const STORE_PEDIDOS  = "pedidos";
const ENDERECO_RE = /^0x[0-9a-f]{40}$/;
const ZERO = "0x0000000000000000000000000000000000000000";
export const UFS = new Set(["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]);
export const PRAZO_MAX_DIAS = 90;

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[pedidos] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}
const chaveProduto = (id) => `produto:${id}`;
const chavePedido  = (id) => `pedido:${id}`;
const chaveIndice  = (e)  => `comprador:${e}`;
// A mesma chave de cache que o produtos.mjs usa para a vitrine (write-through, R11).
const invalidarVitrine = (cat) => (cat ? cacheDel(`produtos:cat:${cat}`) : null);

// ── Validação (pura — testável sem store) ─────────────────────────────────────

const texto = (v, max) => (typeof v === "string" ? v.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max) : "");

/** CEP: 8 dígitos, com ou sem hífen. Devolve só dígitos. */
export function validarCep(input) {
  const d = String(input ?? "").replace(/\D/g, "");
  if (d.length !== 8 || /^0{8}$/.test(d)) throw new ValidationError("cep_invalido", "CEP deve ter 8 dígitos");
  return d;
}

/**
 * Dados de entrega do destinatário. CPF obrigatório: a NF-e modelo 55 a consumidor
 * final identifica o destinatário. Devolve o objecto normalizado ou lança ValidationError.
 */
export function validarMorada(m) {
  if (!m || typeof m !== "object") throw new ValidationError("morada_obrigatoria", "envie os dados de entrega");
  const nome = texto(m.nome, 120);
  if (nome.length < 3) throw new ValidationError("nome_invalido", "nome do destinatário obrigatório");
  const cpf = validarCPF(m.cpf ?? "");
  const cep = validarCep(m.cep);
  const logradouro = texto(m.logradouro, 160);
  if (!logradouro) throw new ValidationError("logradouro_invalido", "rua/avenida obrigatória");
  const numero = texto(m.numero, 20);
  if (!numero) throw new ValidationError("numero_invalido", "número obrigatório (use S/N se não houver)");
  const bairro = texto(m.bairro, 80);
  if (!bairro) throw new ValidationError("bairro_invalido", "bairro obrigatório");
  const cidade = texto(m.cidade, 80);
  if (!cidade) throw new ValidationError("cidade_invalida", "cidade obrigatória");
  const uf = texto(m.uf, 2).toUpperCase();
  if (!UFS.has(uf)) throw new ValidationError("uf_invalida", "UF inválida");
  const telefone = String(m.telefone ?? "").replace(/\D/g, "");
  if (telefone && (telefone.length < 10 || telefone.length > 11)) {
    throw new ValidationError("telefone_invalido", "telefone com DDD: 10 ou 11 dígitos");
  }
  return { nome, cpf, cep, logradouro, numero, complemento: texto(m.complemento, 80), bairro, cidade, uf,
    telefone: telefone || null };
}

/** Código de rastreio: Correios (AA123456789BR) ou código de transportadora (5–40, A-Z0-9-). */
export function validarRastreio(codigo, transportadora) {
  const c = String(codigo ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{5,40}$/.test(c)) throw new ValidationError("rastreio_invalido", "código de rastreio inválido");
  const t = texto(transportadora, 60) || (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(c) ? "Correios" : "");
  if (!t) throw new ValidationError("transportadora_obrigatoria", "indique a transportadora");
  return { codigo: c, transportadora: t };
}

/** NF-e: número (1–9 dígitos), série (1–3 dígitos) e chave de acesso opcional (44 dígitos, DV módulo 11). */
export function validarNfe({ numero, serie, chave } = {}) {
  const n = String(numero ?? "").replace(/\D/g, "");
  if (!/^\d{1,9}$/.test(n) || Number(n) === 0) throw new ValidationError("nfe_numero_invalido", "número da NF-e: 1 a 9 dígitos");
  const s = String(serie ?? "1").replace(/\D/g, "") || "1";
  if (!/^\d{1,3}$/.test(s)) throw new ValidationError("nfe_serie_invalida", "série da NF-e: 1 a 3 dígitos");
  const k = String(chave ?? "").replace(/\D/g, "");
  if (k) {
    if (k.length !== 44) throw new ValidationError("nfe_chave_invalida", "chave de acesso: 44 dígitos");
    let soma = 0, peso = 2;
    for (let i = 42; i >= 0; i--) { soma += Number(k[i]) * peso; peso = peso === 9 ? 2 : peso + 1; }
    const resto = soma % 11;
    const dv = resto < 2 ? 0 : 11 - resto;
    if (dv !== Number(k[43])) throw new ValidationError("nfe_chave_invalida", "chave de acesso com dígito verificador inválido");
  }
  return { numero: n, serie: s, chave: k || null };
}

/** Prazo de entrega em dias (1–90). null/"" = não informado. */
export function validarPrazo(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > PRAZO_MAX_DIAS) {
    throw new ValidationError("prazo_invalido", `prazo de entrega: inteiro de 1 a ${PRAZO_MAX_DIAS} dias`);
  }
  return n;
}

// ── Ligação edição → produto (admin, na criação da edição) ────────────────────

/**
 * Verifica que o produto existe, está `ativo` e não está preso a outra edição; marca-o
 * como vinculado. Chamado por `criarEdicao` ANTES de gravar a edição.
 * @returns {Promise<{ok:true, produto}|{ok:false, code, message}>}
 */
export async function vincularProdutoAEdicao(produtoId, edicaoId, { buscarEdicao = null } = {}) {
  const store = abrirStore(STORE_PRODUTOS);
  if (!store) return { ok: false, code: "store_indisponivel", message: "catálogo indisponível" };
  const produto = await store.get(chaveProduto(produtoId), { type: "json" }).catch(() => null);
  if (!produto) return { ok: false, code: "produto_nao_encontrado", message: "produtoId não existe no catálogo" };
  if (produto.status !== "ativo") return { ok: false, code: "produto_nao_ativo", message: `produto está "${produto.status}", não "ativo"` };
  if (produto.edicaoVinculada && produto.edicaoVinculada !== edicaoId) {
    // Vínculo órfão (a edição anterior nunca chegou a ser gravada) não prende o produto.
    const anterior = buscarEdicao ? await buscarEdicao(produto.edicaoVinculada).catch(() => null) : { id: "?" };
    if (anterior) {
      return { ok: false, code: "produto_ja_vinculado", message: `produto já vinculado à edição ${produto.edicaoVinculada}` };
    }
  }
  produto.edicaoVinculada = edicaoId;
  produto.edicaoId = edicaoId;
  produto.atualizado_em = new Date().toISOString();
  await store.setJSON(chaveProduto(produtoId), produto);
  await invalidarVitrine(produto.categoria);
  return { ok: true, produto };
}

/**
 * Desfaz o vínculo edição → produto. Só mexe se o vínculo for EXACTAMENTE com esta edição
 * e o produto continuar `ativo` (um produto vendido nunca se desvincula).
 * Usado no rollback de `criarEdicao` e pelo admin (`liberar-produto`).
 */
export async function desvincularProduto(produtoId, edicaoId) {
  const store = abrirStore(STORE_PRODUTOS);
  if (!store) return { ok: false, code: "store_indisponivel" };
  const produto = await store.get(chaveProduto(produtoId), { type: "json" }).catch(() => null);
  if (!produto) return { ok: false, code: "produto_nao_encontrado" };
  if (produto.edicaoVinculada !== edicaoId) return { ok: false, code: "vinculo_diferente" };
  if (produto.status !== "ativo") return { ok: false, code: "produto_nao_ativo" };
  delete produto.edicaoVinculada;
  produto.atualizado_em = new Date().toISOString();
  await store.setJSON(chaveProduto(produtoId), produto);
  await invalidarVitrine(produto.categoria);
  return { ok: true, produto };
}

/**
 * Admin: liberta um produto preso a uma edição que JÁ TERMINOU e NÃO TEM vencedor
 * possível (nenhum lance único). Com vencedor possível não se liberta — a venda tem de
 * seguir pela consolidação (ou `reprocessar-venda`), senão o lojista trocava o produto
 * entre o fim da edição e a consolidação.
 * @param {{buscarEdicao, getLances, apurarMenorUnico, agoraMs?}} deps
 */
export async function liberarProdutoDeEdicaoSemVencedor(produtoId, deps) {
  const store = abrirStore(STORE_PRODUTOS);
  const produto = store ? await store.get(chaveProduto(produtoId), { type: "json" }).catch(() => null) : null;
  if (!produto) return { ok: false, code: "produto_nao_encontrado" };
  const edicaoId = produto.edicaoVinculada;
  if (!edicaoId) return { ok: false, code: "produto_sem_vinculo" };
  const meta = await deps.buscarEdicao(edicaoId);
  const agora = deps.agoraMs ?? Date.now();
  const terminou = !meta || meta.status !== "aberto" || Date.parse(meta.termino_em) <= agora;
  if (!terminou) return { ok: false, code: "edicao_em_curso" };
  if (meta && deps.apurarMenorUnico(await deps.getLances(edicaoId))) {
    return { ok: false, code: "edicao_com_vencedor" };
  }
  return desvincularProduto(produtoId, edicaoId);
}

// ── A ponte: apuração → catálogo ──────────────────────────────────────────────

async function garantirPedido(pedidos, produto, venda) {
  const existente = await pedidos.get(chavePedido(produto.id), { type: "json" }).catch(() => null);
  if (existente) return { pedido: existente, criado: false };
  const agora = new Date().toISOString();
  const pedido = {
    produtoId: produto.id,
    edicaoId: venda.edicaoId,
    comprador: venda.endereco,
    lojista: produto.lojista ?? null,
    produtoNome: produto.nome ?? null,
    valorPagoCentavos: venda.menorUnicoCentavos,
    prazo_entrega_dias: Number.isInteger(produto.prazo_entrega_dias) ? produto.prazo_entrega_dias : null,
    txHash: venda.txHash,
    morada: null, rastreio: null, nfe: null,
    criado_em: agora, atualizado_em: agora,
    historico: [{ evento: "venda_registada", em: agora }],
  };
  await pedidos.setJSON(chavePedido(produto.id), pedido);
  const idx = (await pedidos.get(chaveIndice(venda.endereco), { type: "json" }).catch(() => null)) || { ids: [] };
  if (!idx.ids.includes(produto.id)) {
    idx.ids.push(produto.id);
    await pedidos.setJSON(chaveIndice(venda.endereco), idx);
  }
  return { pedido, criado: true };
}

/**
 * Regista a venda do produto vinculado à edição: `ativo → vendido` com o vencedor da
 * consolidação, e cria o pedido de entrega. IDEMPOTENTE: a mesma edição com o mesmo
 * vencedor devolve ok (e repara um pedido em falta). Outro vencedor → conflito.
 *
 * @param {{edicaoId:string, vencedor:string, menorUnicoCentavos:number, txHash:string}} r
 *   — SEMPRE o resultado da consolidação, nunca um valor vindo de um pedido HTTP.
 * @param {{buscarEdicao: Function}} deps — injectado para não criar ciclo de imports
 */
export async function registrarVendaDaEdicao(r, { buscarEdicao }) {
  const edicaoId = String(r?.edicaoId || "");
  const endereco = String(r?.vencedor || "").toLowerCase();
  if (!ENDERECO_RE.test(endereco) || endereco === ZERO) return { ok: false, code: "vencedor_invalido" };
  if (!Number.isInteger(r?.menorUnicoCentavos) || r.menorUnicoCentavos <= 0) return { ok: false, code: "valor_invalido" };

  const meta = await buscarEdicao(edicaoId);
  if (!meta) return { ok: false, code: "edicao_nao_encontrada" };
  if (!meta.produtoId) return { ok: false, code: "edicao_sem_produto" }; // edições sem catálogo (legado)

  const produtos = abrirStore(STORE_PRODUTOS);
  const pedidos  = abrirStore(STORE_PEDIDOS);
  if (!produtos || !pedidos) return { ok: false, code: "store_indisponivel" };

  const produto = await produtos.get(chaveProduto(meta.produtoId), { type: "json" }).catch(() => null);
  if (!produto) return { ok: false, code: "produto_nao_encontrado", produtoId: meta.produtoId };

  const venda = { edicaoId, endereco, menorUnicoCentavos: r.menorUnicoCentavos, txHash: r.txHash ?? null };

  if (produto.status === "vendido" || produto.status === "entregue") {
    const mesma = produto.vencedor?.edicaoId === edicaoId && produto.vencedor?.endereco === endereco;
    if (!mesma) return { ok: false, code: "produto_ja_vendido", produtoId: produto.id };
    const { criado } = await garantirPedido(pedidos, produto, venda);
    return { ok: true, idempotent: true, produtoId: produto.id, pedidoReparado: criado };
  }
  if (produto.status !== "ativo") return { ok: false, code: "produto_nao_ativo", produtoId: produto.id, status: produto.status };

  const agora = new Date().toISOString();
  produto.vencedor = { endereco, edicaoId, txHash: venda.txHash, menorUnicoCentavos: venda.menorUnicoCentavos, registrado_em: agora };
  produto.status = "vendido";
  produto.vendido_em = agora;
  produto.atualizado_em = agora;
  await produtos.setJSON(chaveProduto(produto.id), produto);
  await invalidarVitrine(produto.categoria);
  await garantirPedido(pedidos, produto, venda);

  await adicionarNotificacao(endereco, {
    tipo: "pedido_morada", edicaoId,
    mensagem: `📦 Você comprou «${produto.nome}» na edição ${edicaoId}. Informe o endereço de entrega em Meus Ativos → Meus pedidos.`,
  });
  return { ok: true, idempotent: false, produtoId: produto.id };
}

// ── Pedidos: leitura e actualização ───────────────────────────────────────────

export async function lerPedido(produtoId) {
  const s = abrirStore(STORE_PEDIDOS);
  if (!s) return null;
  return s.get(chavePedido(produtoId), { type: "json" }).catch(() => null);
}

export async function listarPedidosDoComprador(endereco) {
  const s = abrirStore(STORE_PEDIDOS);
  if (!s) return [];
  const idx = await s.get(chaveIndice(String(endereco).toLowerCase()), { type: "json" }).catch(() => null);
  const regs = await Promise.all((idx?.ids || []).map((id) => s.get(chavePedido(id), { type: "json" }).catch(() => null)));
  return regs.filter(Boolean);
}

export async function listarTodosPedidos() {
  const s = abrirStore(STORE_PEDIDOS);
  if (!s) return [];
  const { blobs = [] } = await s.list({ prefix: "pedido:" }).catch(() => ({ blobs: [] }));
  const regs = await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" }).catch(() => null)));
  return regs.filter(Boolean);
}

async function gravar(pedido, evento) {
  const s = abrirStore(STORE_PEDIDOS);
  if (!s) return { ok: false, code: "store_indisponivel" };
  const agora = new Date().toISOString();
  pedido.atualizado_em = agora;
  pedido.historico = [...(pedido.historico || []), { evento, em: agora }].slice(-30);
  await s.setJSON(chavePedido(pedido.produtoId), pedido);
  return { ok: true, pedido };
}

/** O comprador define a morada. Só antes do envio (depois do rastreio já não muda). */
export async function definirMorada(produtoId, endereco, morada) {
  const pedido = await lerPedido(produtoId);
  if (!pedido || pedido.comprador !== String(endereco).toLowerCase()) return { ok: false, code: "pedido_nao_encontrado" };
  if (pedido.rastreio) return { ok: false, code: "pedido_ja_enviado" };
  // A NF-e identifica o destinatário: depois de emitida, os dados já não mudam aqui.
  if (pedido.nfe) return { ok: false, code: "nfe_ja_emitida" };
  pedido.morada = validarMorada(morada);
  return gravar(pedido, pedido.historico?.some((h) => h.evento === "morada_definida") ? "morada_alterada" : "morada_definida");
}

/** O operador regista o envio. Exige morada. Notifica o comprador. */
export async function definirRastreio(produtoId, { codigo, transportadora }) {
  const pedido = await lerPedido(produtoId);
  if (!pedido) return { ok: false, code: "pedido_nao_encontrado" };
  if (!pedido.morada) return { ok: false, code: "morada_em_falta" };
  pedido.rastreio = { ...validarRastreio(codigo, transportadora), enviado_em: new Date().toISOString() };
  const r = await gravar(pedido, "enviado");
  await adicionarNotificacao(pedido.comprador, {
    tipo: "pedido_enviado", edicaoId: pedido.edicaoId, ref: pedido.rastreio.codigo,
    mensagem: `🚚 «${pedido.produtoNome}» foi enviado (${pedido.rastreio.transportadora}). Código de rastreio: ${pedido.rastreio.codigo}.`,
  });
  return r;
}

/** O operador regista a NF-e (emitida fora do app). Notifica o comprador. */
export async function definirNfe(produtoId, dados) {
  const pedido = await lerPedido(produtoId);
  if (!pedido) return { ok: false, code: "pedido_nao_encontrado" };
  pedido.nfe = { ...validarNfe(dados), registada_em: new Date().toISOString() };
  const r = await gravar(pedido, "nfe_registada");
  await adicionarNotificacao(pedido.comprador, {
    tipo: "nfe_emitida", edicaoId: pedido.edicaoId, ref: `${pedido.nfe.serie}-${pedido.nfe.numero}`,
    mensagem: `🧾 A nota fiscal de «${pedido.produtoNome}» foi emitida: NF-e nº ${pedido.nfe.numero}, série ${pedido.nfe.serie}`
      + (pedido.nfe.chave ? `, chave de acesso ${pedido.nfe.chave}.` : "."),
  });
  return r;
}

/**
 * Relê o resultado de uma edição JÁ consolidada e corre a ponte — recuperação manual
 * (admin) para quando a ponte falhou depois do recibo. O vencedor vem do marcador de
 * consolidação, nunca do pedido.
 */
export async function reprocessarVendaDaEdicao(edicaoId, { estaConsolidado, buscarEdicao }) {
  const marcador = await estaConsolidado(edicaoId);
  if (!marcador) return { ok: false, code: "edicao_nao_consolidada" };
  return registrarVendaDaEdicao({
    edicaoId, vencedor: marcador.vencedor,
    menorUnicoCentavos: marcador.menorUnicoCentavos, txHash: marcador.txHash,
  }, { buscarEdicao });
}
