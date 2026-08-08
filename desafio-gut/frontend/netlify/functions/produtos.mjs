// Produtos — Marketplace Local com Leilão de Menor Lance Único (MC15).
//
// GET /.netlify/functions/produtos
//   ?id=<uuid>           → 1 produto
//   ?lojista=<clienteId> → lista do lojista via índice
//   ?categoria=<cat>     → lista por slot via índice-cat
//   sem params           → resumo agregado por categoria
//
// POST /.netlify/functions/produtos
//   Body: { nome, descricao?, preco, categoria, imagemBase64?, mime?, imagem_url? }
//   JWT user-session obrigatório (Authorization Bearer). Cria produto:{id} +
//   atualiza 2 índices (produtos-indice:{lojista} + produtos-indice-cat:{categoria}).
//
// PUT /.netlify/functions/produtos?id=<uuid>[&acao=marcar-entregue|registrar-vencedor]
//   Anti-IDOR pelo endereco/cliente_id.
//
// DELETE /.netlify/functions/produtos?id=<uuid>
//   Anti-IDOR. Remove produto + limpa índices.

import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import {
  jsonResponse, jsonError,
  parseJsonBody, ValidationError,
} from "./_lib/validate.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
// MC89.38 (P0) — posse do `cliente_id`. Mesmas dependências que o `banners.mjs`
// já usa para a guarda equivalente; nada de novo entra no bundle da função.
import { autenticarAdmin } from "./_lib/admin-auth.mjs";
import { getCota } from "./_lib/cotas-store.mjs";
// MC89.40 (F1) — "esta cota está paga?", em fonte única partilhada com banners.
import { validarCotaAtiva, MSG_COTA_INATIVA } from "./_lib/cota-utils.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
// MC39.19 (Onda 3) — cache distribuído (itens 20/33), ETag/SWR (16/17). Env-gated:
// sem REDIS_* o cache no-opa → comportamento atual (zero regressão).
import { cacheAside, cacheDel } from "./_lib/cache.mjs";
import { jsonCacheavel } from "./_lib/http-cache.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

// Chave de cache da listagem pública por categoria (vitrine).
const cacheKeyCategoria = (cat) => `produtos:cat:${cat}`;
// Invalida o cache de uma categoria (write-through na escrita — R11). No-op sem cache.
async function invalidarCategoria(cat) {
  if (cat) await cacheDel(cacheKeyCategoria(cat));
}

const BLOB_PRODUTOS = "produtos";
const BLOB_INDICE   = "produtos-indice";
const BLOB_INDICE_CAT = "produtos-indice-cat";

const CATEGORIAS = new Set(["bronze", "prata", "ouro", "diamante"]);
const STATUS_VALIDOS = new Set(["rascunho", "ativo", "vendido", "entregue"]);

const MAX_BASE64_LEN = 700_000;
const MIMES_VALIDOS = new Set(["image/png", "image/jpeg", "image/webp"]);

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[produtos] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

function validarCategoria(c) {
  if (typeof c !== "string") throw new ValidationError("categoria_invalida", "categoria deve ser string");
  const norm = c.toLowerCase();
  if (!CATEGORIAS.has(norm)) {
    throw new ValidationError("categoria_invalida", `categoria deve ser uma de: ${[...CATEGORIAS].join(", ")}`);
  }
  return norm;
}

function validarURL(input) {
  if (typeof input !== "string" || !input) return null;
  try {
    const u = new URL(input.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href.slice(0, 500);
  } catch { return null; }
}

// ─── Índices ────────────────────────────────────────────────────────────────

async function atualizarIndices(produto, op) {
  const idxLoj = abrirStore(BLOB_INDICE);
  const idxCat = abrirStore(BLOB_INDICE_CAT);

  if (idxLoj) {
    try {
      const atual = (await idxLoj.get(produto.lojista, { type: "json" })) || { ids: [] };
      const set = new Set(atual.ids || []);
      if (op === "adicionar") set.add(produto.id);
      else set.delete(produto.id);
      await idxLoj.setJSON(produto.lojista, {
        lojista: produto.lojista,
        ids: Array.from(set),
        atualizadoEm: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[produtos] atualizar índice lojista falhou:", err?.message);
    }
  }

  if (idxCat && produto.categoria) {
    try {
      const atual = (await idxCat.get(produto.categoria, { type: "json" })) || { ids: [] };
      const set = new Set(atual.ids || []);
      if (op === "adicionar") set.add(produto.id);
      else set.delete(produto.id);
      await idxCat.setJSON(produto.categoria, {
        categoria: produto.categoria,
        ids: Array.from(set),
        atualizadoEm: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[produtos] atualizar índice categoria falhou:", err?.message);
    }
  }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleGet(req) {
  const url = new URL(req.url);
  const id        = url.searchParams.get("id");
  const lojista   = url.searchParams.get("lojista");
  const categoria = url.searchParams.get("categoria");

  const store = abrirStore(BLOB_PRODUTOS);
  if (!store) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");

  // GET ?id= → 1 produto
  if (id) {
    if (typeof id !== "string" || id.length < 10) {
      return jsonError(400, "id_invalido", "id deve ser UUID válido");
    }
    try {
      const reg = await store.get(`produto:${id}`, { type: "json" });
      if (!reg) return jsonError(404, "produto_nao_encontrado", "produto não encontrado");
      return jsonResponse(reg);
    } catch (err) {
      console.warn("[produtos] leitura por id falhou:", err?.message);
      return jsonError(502, "leitura_falhou", "não foi possível ler o produto");
    }
  }

  // GET ?lojista= → lista do lojista via índice
  if (lojista) {
    const idxLoj = abrirStore(BLOB_INDICE);
    if (!idxLoj) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");
    try {
      const idxData = await idxLoj.get(lojista, { type: "json" });
      const ids = idxData?.ids ?? [];
      const produtos = [];
      for (const pid of ids) {
        try {
          const reg = await store.get(`produto:${pid}`, { type: "json" });
          if (reg) produtos.push(reg);
        } catch {}
      }
      return jsonResponse({ lojista, total: produtos.length, produtos });
    } catch (err) {
      console.warn("[produtos] listagem por lojista falhou:", err?.message);
      return jsonError(502, "leitura_falhou", "não foi possível listar produtos");
    }
  }

  // GET ?categoria= → lista por slot
  if (categoria) {
    let cat;
    try { cat = validarCategoria(categoria); }
    catch (err) {
      if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
      throw err;
    }
    const idxCat = abrirStore(BLOB_INDICE_CAT);
    if (!idxCat) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");
    try {
      // MC39.19 — cache-aside (item 20/33): em miss/sem-cache, computa a listagem.
      const body = await cacheAside(cacheKeyCategoria(cat), 60, async () => {
        const idxData = await idxCat.get(cat, { type: "json" });
        const ids = (idxData?.ids ?? []).filter(Boolean);
        // Item 21 (N+1): busca os produtos em PARALELO (era sequencial).
        const regs = await Promise.all(
          ids.map((pid) => store.get(`produto:${pid}`, { type: "json" }).catch(() => null)),
        );
        const produtos = regs.filter((reg) => reg && reg.status === "ativo");
        return { categoria: cat, total: produtos.length, produtos };
      });
      // Itens 16/17 — ETag + Cache-Control stale-while-revalidate (304 em revalidação).
      return jsonCacheavel(req, body, { maxAge: 60, swr: 300 });
    } catch (err) {
      console.warn("[produtos] listagem por categoria falhou:", err?.message);
      return jsonError(502, "leitura_falhou", "não foi possível listar produtos");
    }
  }

  // Sem params: resumo agregado por categoria
  const idxCat = abrirStore(BLOB_INDICE_CAT);
  const resumo = {};
  if (idxCat) {
    for (const cat of CATEGORIAS) {
      try {
        const data = await idxCat.get(cat, { type: "json" });
        resumo[cat] = { total: (data?.ids ?? []).length };
      } catch {
        resumo[cat] = { total: 0 };
      }
    }
  } else {
    for (const cat of CATEGORIAS) resumo[cat] = { total: 0 };
  }
  return jsonResponse({ resumo });
}

async function handlePost(req) {
  // JWT user-session obrigatório
  const authHeader = req.headers.get("authorization") || "";
  const authToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!authToken) {
    return jsonError(401, "auth_obrigatorio", "Authorization: Bearer <token> obrigatório");
  }

  let jwtPayload;
  try { jwtPayload = await verificarUserSession(authToken); }
  catch (err) {
    const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
    return jsonError(401, code, "JWT user-session inválido ou expirado");
  }

  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com nome, preco, categoria");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  // Validação de campos
  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  if (!nome || nome.length > 120) {
    return jsonError(400, "nome_invalido", "nome obrigatório (máx 120 caracteres)");
  }

  const descricao = typeof body.descricao === "string" ? body.descricao.trim().slice(0, 500) : "";

  const preco = Number(body.preco);
  if (!Number.isInteger(preco) || preco <= 0) {
    return jsonError(400, "preco_invalido", "preco deve ser inteiro positivo (centavos)");
  }

  let categoria;
  try { categoria = validarCategoria(body.categoria); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  // Imagem: imagemBase64 OU imagem_url (um dos dois obrigatório)
  const imagemBase64 = typeof body.imagemBase64 === "string" ? body.imagemBase64 : "";
  const mime = typeof body.mime === "string" ? body.mime : "";
  const imagemUrl = validarURL(body.imagem_url);

  if (!imagemBase64 && !imagemUrl) {
    return jsonError(400, "imagem_obrigatoria", "imagemBase64 OU imagem_url obrigatório");
  }
  if (imagemBase64) {
    if (imagemBase64.length > MAX_BASE64_LEN) {
      return jsonError(413, "imagem_grande", `imagemBase64 > ${MAX_BASE64_LEN} chars`);
    }
    if (!MIMES_VALIDOS.has(mime)) {
      return jsonError(400, "mime_invalido", `mime deve ser: ${[...MIMES_VALIDOS].join(", ")}`);
    }
  }

  // Determinar lojista (cliente_id) e endereco
  const payloadEndereco = jwtPayload.endereco ? String(jwtPayload.endereco).toLowerCase() : null;
  // MC12.3.1 — aceita endereco (carteira) OU cliente_id direto (cnpj:XXXXX)
  const lojista = body.cliente_id
    ? String(body.cliente_id)
    : (payloadEndereco ?? `anon:${randomUUID().slice(0, 8)}`);

  // ── MC89.38 (P0) — POSSE DO `cliente_id` ───────────────────────────────────
  //
  // ⚠️ ISTO ESTAVA POR IMPLEMENTAR, E O COMENTÁRIO DIZIA QUE ESTAVA.
  // A linha que aqui existia era só `const endereco = payloadEndereco;` com um
  // comentário a anunciar "Anti-IDOR: … deve bater com payloadEndereco OU ser
  // admin". A verificação não existia: `body.cliente_id` era aceite tal e qual,
  // portanto qualquer autenticado podia publicar um produto ATRIBUÍDO A OUTRO
  // LOJISTA, que depois aparece na vitrine e na listagem `?lojista=`.
  //
  // Não é suspeita: o ficheiro irmão `banners.mjs:227-233` faz exatamente esta
  // verificação e devolve 403 `endereco_nao_corresponde`. Dois endpoints do
  // mesmo painel, o mesmo padrão, um com guarda e outro sem — é omissão.
  //
  // ⚠️ PORQUE É QUE NÃO COPIEI O `banners.mjs` TAL E QUAL:
  // ele exige que `cliente_id` seja um ENDEREÇO (`validarEndereco`). Aqui isso
  // partiria o cadastro direto do MC12.3.1, cujo `cliente_id` é `cnpj:XXXXX` e
  // nunca passaria nessa validação. Medido em produção (MC89.38-F0): das 7 cotas,
  // 2 têm o `cliente_id` nessa forma.
  //
  // A regra é: aceita-se `cliente_id` só quando a posse é DEMONSTRÁVEL.
  //   (a) igual ao endereço do JWT ......................... é o próprio
  //   (b) uma cota cujo campo `endereco` bate com o do JWT .. está vinculada
  //   (c) admin ............................................ mesma exceção do banners
  // Fora disto, 403. A ausência de prova não pode valer como prova.
  //
  // ⚠️ CONSEQUÊNCIA MEDIDA, E É PRECISO DIZÊ-LA: hoje NENHUMA das 7 cotas tem o
  // campo `endereco` preenchido (F0). Logo o ramo (b) não salva ninguém neste
  // momento, e um lojista de cadastro direto que tente publicar em nome do seu
  // `cnpj:XXXXX` leva 403. Isso é o comportamento CORRETO — o servidor não tem
  // como saber que aquela carteira lhe pertence —, mas é uma mudança de
  // comportamento real e está registada no relatório do MC89.38.
  const enderecoDaCota = async (clienteId) => {
    try {
      const cota = await getCota(clienteId);
      const e = cota?.endereco;
      return e ? String(e).toLowerCase() : null;
    } catch (err) {
      // Falha de leitura NÃO pode virar autorização. Fail-closed.
      console.warn("[produtos] leitura de cota para posse falhou:", err?.message);
      return null;
    }
  };

  if (body.cliente_id) {
    const idPedido = String(body.cliente_id).toLowerCase();
    const ehProprio = payloadEndereco && idPedido === payloadEndereco;
    if (!ehProprio) {
      const adminCheck = await autenticarAdmin(req);
      const isAdmin = !!adminCheck?.ok;
      if (!isAdmin) {
        const vinculado = payloadEndereco
          && (await enderecoDaCota(String(body.cliente_id))) === payloadEndereco;
        if (!vinculado) {
          return jsonError(403, "endereco_nao_corresponde",
            "JWT não pertence ao cliente_id informado");
        }
      }
    }
  }

  // ── MC89.40 (F1) — A COTA TEM DE ESTAR PAGA ────────────────────────────────
  //
  // Vem DEPOIS da posse (P0) de propósito: primeiro estabelece-se DE QUEM é o
  // pedido, só depois se pergunta se essa pessoa pode publicar. Pela ordem
  // inversa, alguém poderia sondar o estado da cota de terceiros.
  //
  // ⚠️ ANTES DESTE MC ESTE ENDPOINT NÃO LIA A COTA DE TODO. Bastava um JWT de
  // user-session — que é emitido a QUALQUER utilizador autenticado — para
  // publicar na vitrine. Não era só o nível que era ignorado: era a existência
  // da cota.
  //
  // `needsPayment` vai no corpo para o painel poder distinguir "não podes" de
  // "ainda não pagaste" e mostrar o caminho da compra em vez de um erro seco.
  const estadoCota = await validarCotaAtiva(lojista);
  if (!estadoCota.ativa) {
    return jsonError(403, "cota_inativa", MSG_COTA_INATIVA, { needsPayment: true });
  }

  // ⚠️ MC89.40 (D3) — O NÍVEL RESTRINGE O SLOT.
  //
  // `categoria` significa DUAS coisas diferentes neste código, e confundi-las é
  // fácil: na cota é o NÍVEL COMPRADO (bronze…diamante); no produto é o SLOT DA
  // VITRINE onde ele aparece. A regra decidida pelo operador é que têm de
  // coincidir, e NÃO é acumulativa — um diamante não publica no slot bronze.
  if (categoria !== estadoCota.categoria) {
    return jsonError(403, "categoria_nao_permitida",
      `A sua cota é ${estadoCota.categoria}; não pode publicar no slot ${categoria}.`,
      { categoriaPermitida: estadoCota.categoria });
  }

  const endereco = payloadEndereco;

  const agora = new Date().toISOString();
  const id = randomUUID();

  const produto = {
    id,
    lojista,
    endereco,
    nome,
    descricao,
    preco,
    imagem_url: imagemUrl || null,
    imagemBase64: imagemBase64 || null,
    mime: imagemBase64 ? mime : null,
    categoria,
    status: "ativo",
    edicaoId: body.edicaoId || "R-1",
    vencedor: null,
    criado_em: agora,
    atualizado_em: agora,
    vendido_em: null,
    entregue_em: null,
  };

  const store = abrirStore(BLOB_PRODUTOS);
  if (!store) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");

  try { await store.setJSON(`produto:${id}`, produto); }
  catch (err) {
    console.error("[produtos] persistir falhou:", err?.message);
    return jsonError(502, "persistencia_falhou", "não foi possível salvar produto");
  }

  await atualizarIndices(produto, "adicionar");
  await invalidarCategoria(produto.categoria); // write-through (R11)

  console.info("[produtos] criado", { id, lojista, categoria, preco });
  return jsonResponse({ ok: true, produto }, 201);
}

async function handlePut(req) {
  const authHeader = req.headers.get("authorization") || "";
  const authToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!authToken) {
    return jsonError(401, "auth_obrigatorio", "Authorization: Bearer <token> obrigatório");
  }

  let jwtPayload;
  try { jwtPayload = await verificarUserSession(authToken); }
  catch (err) {
    const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
    return jsonError(401, code, "JWT user-session inválido ou expirado");
  }

  const url = new URL(req.url);
  const id   = url.searchParams.get("id");
  const acao = url.searchParams.get("acao");

  if (!id || typeof id !== "string" || id.length < 10) {
    return jsonError(400, "id_obrigatorio", "?id= obrigatório");
  }

  const store = abrirStore(BLOB_PRODUTOS);
  if (!store) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");

  let produto;
  try {
    produto = await store.get(`produto:${id}`, { type: "json" });
    if (!produto) return jsonError(404, "produto_nao_encontrado", "produto não encontrado");
  } catch (err) {
    return jsonError(502, "leitura_falhou", "não foi possível ler o produto");
  }

  // Anti-IDOR: dono OU admin
  const payloadEndereco = jwtPayload.endereco ? String(jwtPayload.endereco).toLowerCase() : null;
  const isAdmin = jwtPayload.tipo === "admin-access";
  const isOwner = payloadEndereco && (
    produto.endereco === payloadEndereco ||
    produto.lojista === payloadEndereco ||
    // CNPJ direto: verifica se o JWT tem o mesmo cliente_id
    (produto.lojista && produto.lojista === payloadEndereco)
  );

  if (!isAdmin && !isOwner) {
    return jsonError(403, "nao_autorizado", "apenas o dono do produto pode editá-lo");
  }

  // ─── PUT ?acao=marcar-entregue ───
  if (acao === "marcar-entregue") {
    if (produto.status !== "vendido") {
      return jsonError(400, "status_invalido", "apenas produtos vendidos podem ser marcados como entregues");
    }
    produto.status = "entregue";
    produto.entregue_em = new Date().toISOString();
    produto.atualizado_em = new Date().toISOString();
    await store.setJSON(`produto:${id}`, produto);
    await invalidarCategoria(produto.categoria); // write-through (R11)
    console.info("[produtos] marcado como entregue", { id });
    return jsonResponse({ ok: true, produto });
  }

  // ─── PUT ?acao=registrar-vencedor ───
  if (acao === "registrar-vencedor") {
    const vencedorData = body && typeof body === "object" ? null : null;
    // Lê body se enviado
    let vencBody = null;
    try { vencBody = await parseJsonBody(req); } catch {}

    produto.vencedor = vencBody?.vencedor || { registrado_em: new Date().toISOString() };
    produto.status = "vendido";
    produto.vendido_em = new Date().toISOString();
    produto.atualizado_em = new Date().toISOString();
    await store.setJSON(`produto:${id}`, produto);
    await invalidarCategoria(produto.categoria); // write-through (R11)
    console.info("[produtos] vencedor registrado", { id });
    return jsonResponse({ ok: true, produto });
  }

  // ─── PUT normal (editar) ───
  let body;
  try { body = await parseJsonBody(req); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com campos a editar");

  if (body.nome !== undefined) {
    const n = typeof body.nome === "string" ? body.nome.trim() : "";
    if (!n || n.length > 120) return jsonError(400, "nome_invalido", "nome obrigatório (máx 120)");
    produto.nome = n;
  }
  if (body.descricao !== undefined) {
    produto.descricao = typeof body.descricao === "string" ? body.descricao.trim().slice(0, 500) : "";
  }
  if (body.preco !== undefined) {
    const p = Number(body.preco);
    if (!Number.isInteger(p) || p <= 0) return jsonError(400, "preco_invalido", "preco deve ser inteiro positivo");
    produto.preco = p;
  }
  if (body.categoria !== undefined) {
    try { produto.categoria = validarCategoria(body.categoria); }
    catch (err) {
      if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
      throw err;
    }
  }
  if (body.imagemBase64 !== undefined) {
    const b64 = String(body.imagemBase64 || "");
    const m = String(body.mime || "");
    if (b64) {
      if (b64.length > MAX_BASE64_LEN) return jsonError(413, "imagem_grande", `imagemBase64 > ${MAX_BASE64_LEN} chars`);
      if (!MIMES_VALIDOS.has(m)) return jsonError(400, "mime_invalido", `mime deve ser: ${[...MIMES_VALIDOS].join(", ")}`);
    }
    produto.imagemBase64 = b64 || null;
    produto.mime = b64 ? m : null;
    produto.imagem_url = null;
  }
  if (body.imagem_url !== undefined) {
    const u = validarURL(body.imagem_url);
    if (body.imagem_url && !u) return jsonError(400, "url_invalida", "imagem_url deve ser URL http/https válida");
    produto.imagem_url = u;
    if (u) { produto.imagemBase64 = null; produto.mime = null; }
  }
  if (body.status !== undefined) {
    const s = String(body.status).toLowerCase();
    if (!STATUS_VALIDOS.has(s)) return jsonError(400, "status_invalido", `status deve ser: ${[...STATUS_VALIDOS].join(", ")}`);
    produto.status = s;
  }

  produto.atualizado_em = new Date().toISOString();
  await store.setJSON(`produto:${id}`, produto);
  await invalidarCategoria(produto.categoria); // write-through (R11; staleness ≤TTL em troca de categoria)

  console.info("[produtos] editado", { id });
  return jsonResponse({ ok: true, produto });
}

async function handleDelete(req) {
  const authHeader = req.headers.get("authorization") || "";
  const authToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!authToken) {
    return jsonError(401, "auth_obrigatorio", "Authorization: Bearer <token> obrigatório");
  }

  let jwtPayload;
  try { jwtPayload = await verificarUserSession(authToken); }
  catch (err) {
    const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
    return jsonError(401, code, "JWT user-session inválido ou expirado");
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id || typeof id !== "string" || id.length < 10) {
    return jsonError(400, "id_obrigatorio", "?id= obrigatório");
  }

  const store = abrirStore(BLOB_PRODUTOS);
  if (!store) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");

  let produto;
  try {
    produto = await store.get(`produto:${id}`, { type: "json" });
    if (!produto) return jsonError(404, "produto_nao_encontrado", "produto não encontrado");
  } catch (err) {
    return jsonError(502, "leitura_falhou", "não foi possível ler o produto");
  }

  // Anti-IDOR
  const payloadEndereco = jwtPayload.endereco ? String(jwtPayload.endereco).toLowerCase() : null;
  const isAdmin = jwtPayload.tipo === "admin-access";
  const isOwner = payloadEndereco && (
    produto.endereco === payloadEndereco ||
    produto.lojista === payloadEndereco
  );
  if (!isAdmin && !isOwner) {
    return jsonError(403, "nao_autorizado", "apenas o dono do produto pode removê-lo");
  }

  await atualizarIndices(produto, "remover");
  await store.delete(`produto:${id}`);
  await invalidarCategoria(produto.categoria); // write-through (R11)

  console.info("[produtos] removido", { id });
  return jsonResponse({ ok: true, removido: id });
}

// ─── Export ──────────────────────────────────────────────────────────────────

export default async (req) => {
  // MC88.12 — preflight CORS do APK. Tem de ser a primeira coisa: o OPTIONS não
  // leva corpo nem Authorization, logo qualquer validação a montante responderia
  // 4xx e o browser abortaria a chamada real.
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  if (req.method === "GET") {
    const rl = await aplicarRateLimit(req, "produtos-get", 30);
    if (rl) return rl;
    return handleGet(req);
  }
  if (req.method === "POST") {
    const rl = await aplicarRateLimit(req, "produtos-post", 5);
    if (rl) return rl;
    return handlePost(req);
  }
  if (req.method === "PUT") {
    const rl = await aplicarRateLimit(req, "produtos-put", 10);
    if (rl) return rl;
    return handlePut(req);
  }
  if (req.method === "DELETE") {
    const rl = await aplicarRateLimit(req, "produtos-delete", 10);
    if (rl) return rl;
    return handleDelete(req);
  }
  return jsonError(405, "metodo_invalido", "use GET, POST, PUT ou DELETE", {
    allowed: ["GET", "POST", "PUT", "DELETE"],
  });
};
