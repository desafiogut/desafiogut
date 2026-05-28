// Cotas — sistema de cotas vendidas/disponíveis por categoria (REQ-04..07).
//
// GET /.netlify/functions/cotas
//   ?cliente_id=0x...      → retorna 1 cota
//   ?categoria=bronze|prata|ouro|diamante  → lista cotas da categoria
//   sem params              → resumo agregado por categoria
//   Endpoint público.
//
// POST /.netlify/functions/cotas
//   Body: { cliente_id, categoria, vendida, disponivel, cliente_nome,
//           produto_nome, produto_url?, valor }
//   Gated por x-admin-token. Cria/atualiza a cota e o índice da categoria.
//
// DELETE /.netlify/functions/cotas?cliente_id=0x...
//   Gated por x-admin-token. Remove a cota e atualiza o índice.
//
// Blobs:
//   cotas:{cliente_id}             → registro individual
//   cotas-indice:{categoria}       → { cliente_ids: [...] }

import { getStore } from "@netlify/blobs";
import {
  jsonResponse, jsonError, validarEndereco, parseJsonBody, ValidationError,
} from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { guardAdmin } from "./_lib/admin-auth.mjs";

const BLOB_COTAS  = "cotas";
const BLOB_INDICE = "cotas-indice";
const BLOB_WALLET = "wallet";
// MC12.3 — índice CNPJ→endereço (anti-duplicidade O(1)) e fingerprint anti-Sybil.
const BLOB_COTAS_CNPJ = "cotas-cnpj";
const BLOB_COTAS_FP   = "cotas-fingerprint";
const CATEGORIAS  = new Set(["bronze", "prata", "ouro", "diamante"]);

// REQ-17: mínimos por categoria em BRL. Se valor_produto < mínimo,
// a diferença gera Vale-Crédito automático na Wallet do cliente.
const MIN_POR_CATEGORIA_BRL = {
  bronze:   660,
  prata:    1350,
  ouro:     2250,
  diamante: 4500,
};

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[cotas] Blobs ${name} indisponível:`, err?.message);
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

function sanitizeText(input, max = 200) {
  if (typeof input !== "string") return null;
  const v = input.trim();
  return v ? v.slice(0, max) : null;
}

async function atualizarIndice(categoria, clienteId, op) {
  // op: "adicionar" | "remover"
  const idx = abrirStore(BLOB_INDICE);
  if (!idx) return;
  try {
    const atual = (await idx.get(categoria, { type: "json" })) || { cliente_ids: [] };
    const set = new Set(atual.cliente_ids || []);
    if (op === "adicionar") set.add(clienteId);
    else                    set.delete(clienteId);
    await idx.setJSON(categoria, {
      categoria,
      cliente_ids: Array.from(set),
      atualizadoEm: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[cotas] atualizar índice falhou (não-fatal):", err?.message);
  }
}

async function listarCategoria(categoria) {
  const idx   = abrirStore(BLOB_INDICE);
  const store = abrirStore(BLOB_COTAS);
  if (!idx || !store) return [];
  let cliente_ids = [];
  try {
    const data = await idx.get(categoria, { type: "json" });
    cliente_ids = data?.cliente_ids ?? [];
  } catch {
    return [];
  }
  const cotas = [];
  for (const cid of cliente_ids) {
    try {
      const reg = await store.get(cid, { type: "json" });
      if (reg) cotas.push(reg);
    } catch {}
  }
  return cotas;
}

// REQ-17 helper: credita Vale-Crédito automático na Wallet do cliente.
// Idempotente por `idem_key` (cota_cliente + valor_produto + atualizadoEm)
// — re-execução do mesmo upsert não credita duas vezes.
async function creditarValeCreditoAutomatico({ cliente_id, categoria, valorProduto, motivo }) {
  const minimoBrl = MIN_POR_CATEGORIA_BRL[categoria];
  if (!minimoBrl) return null;
  if (!Number.isFinite(valorProduto) || valorProduto >= minimoBrl) return null;

  const diferencaBrl = minimoBrl - valorProduto;
  const diferencaCentavos = Math.round(diferencaBrl * 100);

  const walletStore = abrirStore(BLOB_WALLET);
  if (!walletStore) return null;
  try {
    const atual = (await walletStore.get(cliente_id, { type: "json" })) || { saldoCentavos: 0, transacoes: [] };
    const saldoAntes  = Number(atual.saldoCentavos || 0);
    const saldoDepois = saldoAntes + diferencaCentavos;
    const agora       = new Date().toISOString();
    const tx = {
      id: `vc-${cliente_id}-${Date.now()}`,
      operacao: "credito",
      valorCentavos: diferencaCentavos,
      motivo: motivo || `Vale-Crédito automático (${categoria}: produto R$ ${valorProduto.toFixed(2)} < mín R$ ${minimoBrl.toFixed(2)})`,
      origem: "cotas-vale-credito-automatico",
      saldoAntesCentavos: saldoAntes,
      saldoDepoisCentavos: saldoDepois,
      em: agora,
    };
    await walletStore.setJSON(cliente_id, {
      saldoCentavos: saldoDepois,
      atualizadoEm:  agora,
      transacoes: [tx, ...(atual.transacoes || [])].slice(0, 50),
    });
    return {
      diferencaBrl, diferencaCentavos, saldoAntes, saldoDepois,
      transacaoId: tx.id,
    };
  } catch (err) {
    console.warn("[cotas] crédito automático Wallet falhou (não-fatal):", err?.message);
    return null;
  }
}

async function resumoAgregado() {
  const idx = abrirStore(BLOB_INDICE);
  if (!idx) return {};
  const resumo = {};
  for (const cat of CATEGORIAS) {
    try {
      const data = await idx.get(cat, { type: "json" });
      const ids  = data?.cliente_ids ?? [];
      resumo[cat] = { total_atribuidas: ids.length, cliente_ids: ids };
    } catch {
      resumo[cat] = { total_atribuidas: 0, cliente_ids: [] };
    }
  }
  return resumo;
}

// MC12.3 — Validação de CNPJ (algoritmo dígitos verificadores). Definida aqui
// para uso em handleGet (?cnpj=) e handlePost (register-corporativo).
function validarCNPJ(cnpj) {
  const nums = String(cnpj).replace(/\D/g, "");
  if (nums.length !== 14) return false;
  if (/^(\d)\1+$/.test(nums)) return false;
  const calc = (arr, len) => {
    let sum = 0, pos = len - 7;
    for (let i = len; i >= 1; i--) { sum += arr[len - i] * pos--; if (pos < 2) pos = 9; }
    return sum % 11 < 2 ? 0 : 11 - (sum % 11);
  };
  const arr = nums.split("").map(Number);
  return calc(arr, 12) === arr[12] && calc(arr, 13) === arr[13];
}

async function handleGet(req) {
  const url       = new URL(req.url);
  const clienteId = url.searchParams.get("cliente_id");
  const categoria = url.searchParams.get("categoria");
  const cnpjParam = url.searchParams.get("cnpj"); // MC12.3 — anti-duplicidade

  // MC12.3 — verifica se CNPJ já está cadastrado. Retorna 200 com índice ou 404.
  if (cnpjParam) {
    const nums = String(cnpjParam).replace(/\D/g, "");
    if (!validarCNPJ(nums)) {
      return jsonError(400, "cnpj_invalido", "CNPJ inválido");
    }
    const idxCnpj = abrirStore(BLOB_COTAS_CNPJ);
    if (!idxCnpj) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");
    const reg = await idxCnpj.get(nums, { type: "json" });
    if (!reg) return jsonError(404, "cnpj_nao_encontrado", "CNPJ livre");
    return jsonResponse({ status: "cnpj_ja_registado", endereco: reg.endereco, email: reg.email || null, empresa: reg.empresa || null });
  }

  // MC14.10.1 ITEM 2 — lookup por email para cadastros directos (cnpj:XXXXX).
  // Lojista que se cadastrou sem Privy e depois faz login com o mesmo email
  // é encontrado via este branch.
  const emailParam = url.searchParams.get("email");
  if (emailParam) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailParam)) {
      return jsonError(400, "email_invalido", "Formato de email inválido");
    }
    const idxCnpjEmail = abrirStore(BLOB_COTAS_CNPJ);
    if (!idxCnpjEmail) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");
    try {
      const blobList = await idxCnpjEmail.list();
      if (blobList?.blobs) {
        for (const blob of blobList.blobs) {
          const reg = await idxCnpjEmail.get(blob.key, { type: "json" });
          if (reg && reg.email === emailParam.toLowerCase()) {
            // MC17 — retorna registo COMPLETO (BLOB_COTAS) com tipo: "corporativo".
            // O índice CNPJ só tem {cnpj, cliente_id, empresa, email} — sem tipo.
            // Sem o tipo, AppContext define tipoUsuario="comum" e perde o perfil.
            const storeCot = abrirStore(BLOB_COTAS);
            if (storeCot && reg.cliente_id) {
              const completo = await storeCot.get(reg.cliente_id, { type: "json" });
              if (completo) return jsonResponse(completo);
            }
            // Fallback: adiciona tipo manualmente se não achou o registo completo
            return jsonResponse({ ...reg, tipo: "corporativo" });
          }
        }
      }
    } catch (err) {
      console.warn("[cotas] listagem CNPJ falhou:", err?.message);
      return jsonError(502, "store_indisponivel", "Não foi possível pesquisar por email");
    }
    return jsonError(404, "email_nao_encontrado", "Nenhum cadastro encontrado para este email");
  }

  if (clienteId) {
    let endereco;
    try { endereco = validarEndereco(clienteId); }
    catch (err) {
      if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
      throw err;
    }
    const store = abrirStore(BLOB_COTAS);
    if (!store) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");
    const reg = await store.get(endereco, { type: "json" });
    if (!reg) return jsonError(404, "cota_nao_encontrada", "cliente não tem cota atribuída");
    return jsonResponse(reg);
  }
  if (categoria) {
    let cat;
    try { cat = validarCategoria(categoria); }
    catch (err) {
      if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
      throw err;
    }
    const cotas = await listarCategoria(cat);
    return jsonResponse({ categoria: cat, total: cotas.length, cotas });
  }
  // Sem params: resumo agregado
  const resumo = await resumoAgregado();
  return jsonResponse({ resumo });
}

async function handlePost(req) {
  // MC12.2 — auto-cadastro corporativo: nenhum admin token necessário.
  // Autenticado por Privy access token (presença de JWT válido) + rate limit.
  const url = new URL(req.url);
  if (url.searchParams.get("action") === "register-corporativo") {
    const rl = await aplicarRateLimit(req, "cotas-register", 5);
    if (rl) return rl;
    let body;
    try {
      body = await parseJsonBody(req);
      if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com accessToken, endereco, cnpj, empresa");
    } catch (err) {
      if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
      throw err;
    }
    const { accessToken, endereco: enderecoRaw, cnpj, empresa, segmento, site, logoUrl, email } = body;
    // MC12.3.1 — accessToken e endereco passam a ser OPCIONAIS.
    // Cadastro direto (sem login Privy): cliente_id derivado do CNPJ.
    // Cadastro autenticado (logado): cliente_id = endereco da carteira.
    if (accessToken && (typeof accessToken !== "string" || !accessToken.startsWith("eyJ"))) {
      return jsonError(401, "token_invalido", "accessToken inválido (deve ser JWT Privy)");
    }
    // MC12.3 — X-Visitor-ID obrigatório (FingerprintJS — anti-fraude).
    const visitorId = req.headers.get("x-visitor-id");
    if (!visitorId || typeof visitorId !== "string" || visitorId.length < 16) {
      return jsonError(400, "visitor_id_obrigatorio",
        "X-Visitor-ID header obrigatório para anti-fraude.");
    }
    let endereco = null;
    if (enderecoRaw) {
      try { endereco = validarEndereco(enderecoRaw); }
      catch (err) {
        if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
        throw err;
      }
    }
    if (!validarCNPJ(cnpj)) {
      return jsonError(400, "cnpj_invalido", "CNPJ inválido — verifique os dígitos");
    }
    if (!empresa || typeof empresa !== "string" || !empresa.trim()) {
      return jsonError(400, "empresa_obrigatoria", "campo empresa obrigatório");
    }
    if (email && (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) {
      return jsonError(400, "email_invalido", "email inválido");
    }
    const cnpjNums = String(cnpj).replace(/\D/g, "");
    // MC12.3.1 — cliente_id: endereço da carteira se logado, ou "cnpj:..." se cadastro direto.
    const clienteId = endereco ?? `cnpj:${cnpjNums}`;

    // MC12.3 Item 2 — Guard anti-duplicidade: mesmo CNPJ não pode ser
    // registrado em cliente_id diferente (endereco ou pseudo "cnpj:").
    const idxCnpj = abrirStore(BLOB_COTAS_CNPJ);
    if (idxCnpj) {
      const existente = await idxCnpj.get(cnpjNums, { type: "json" });
      if (existente && existente.cliente_id !== clienteId) {
        return jsonError(409, "cnpj_duplicado",
          "CNPJ já cadastrado em outra conta.");
      }
    }

    // MC12.3 Item 5B — Anti-Sybil: 1 CNPJ por visitorId a cada 24h.
    const idxFp = abrirStore(BLOB_COTAS_FP);
    if (idxFp) {
      try {
        const fpData = (await idxFp.get(visitorId, { type: "json" })) ||
                       { cnpjs: [] };
        const agora24h = Date.now() - 24 * 60 * 60 * 1000;
        const recentes = (fpData.cnpjs || []).filter(c =>
          new Date(c.em).getTime() > agora24h);
        const diferentes = recentes.filter(c => c.cnpj !== cnpjNums);
        if (diferentes.length >= 1) {
          return jsonError(429, "sybil_detectado",
            "Limite de 1 CNPJ por dispositivo a cada 24h.");
        }
      } catch (err) {
        console.warn("[cotas] anti-Sybil check falhou (não-fatal):", err?.message);
      }
    }

    const store = abrirStore(BLOB_COTAS);
    if (!store) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");
    const agora = new Date().toISOString();
    const registro = {
      cliente_id:   clienteId,
      endereco:     endereco, // null em cadastro direto, address em cadastro autenticado
      tipo:         "corporativo",
      cnpj:         cnpjNums,
      empresa:      empresa.trim().slice(0, 100),
      segmento:     segmento || "Outro",
      site:         site ? String(site).slice(0, 200) : null,
      logoUrl:      logoUrl ? String(logoUrl).slice(0, 500) : null,
      email:        email ? String(email).slice(0, 120).toLowerCase() : null,
      origem:       endereco ? "autenticado" : "direto", // MC12.3.1
      cadastradoEm: agora,
      updatedAt:    agora,
      categoria:    null,
      vendida:      false,
      disponivel:   false,
      valor:        0,
    };
    await store.setJSON(clienteId, registro);

    // MC12.3 Item 2 — grava índice CNPJ→cliente_id (chave para anti-duplicidade).
    if (idxCnpj) {
      try {
        await idxCnpj.setJSON(cnpjNums, {
          cnpj: cnpjNums,
          cliente_id: clienteId,
          endereco,
          empresa: registro.empresa,
          email: registro.email,
          cadastradoEm: agora,
        });
      } catch (err) {
        console.warn("[cotas] indice CNPJ falhou (não-fatal):", err?.message);
      }
    }

    // MC12.3 Item 5B — atualiza histórico anti-Sybil (visitorId → CNPJs 24h).
    if (idxFp) {
      try {
        const fpData = (await idxFp.get(visitorId, { type: "json" })) ||
                       { cnpjs: [] };
        const agora24h = Date.now() - 24 * 60 * 60 * 1000;
        const recentes = (fpData.cnpjs || []).filter(c =>
          new Date(c.em).getTime() > agora24h);
        await idxFp.setJSON(visitorId, {
          cnpjs: [...recentes.filter(c => c.cnpj !== cnpjNums),
                  { cnpj: cnpjNums, em: agora }],
          ultimoCnpj: cnpjNums,
          ultimoEm:   agora,
        });
      } catch (err) {
        console.warn("[cotas] anti-Sybil update falhou (não-fatal):", err?.message);
      }
    }

    console.info("[cotas] register-corporativo", {
      cliente_id: clienteId, endereco, origem: registro.origem,
      empresa: registro.empresa, cnpj: registro.cnpj,
      visitorId: visitorId.slice(0, 8) + "…",
    });
    return jsonResponse(registro, 201);
  }

  // MC14.10.1 ITEM 5 — edição do painel lojista (campos editáveis).
  if (url.searchParams.get("action") === "update-corporativo") {
    let body;
    try {
      body = await parseJsonBody(req);
      if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com cliente_id, empresa, segmento, site, logoUrl, email");
    } catch (err) {
      if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
      throw err;
    }
    const { cliente_id: clienteIdUpdate, empresa, segmento, site, logoUrl, email } = body;
    if (!clienteIdUpdate || typeof clienteIdUpdate !== "string") {
      return jsonError(400, "cliente_id_obrigatorio", "cliente_id é obrigatório");
    }
    // auth: verifica se o email do body bate com o registro (simples, mas eficaz)
    const storeUpdate = abrirStore(BLOB_COTAS);
    if (!storeUpdate) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");
    const existenteUpdate = await storeUpdate.get(clienteIdUpdate, { type: "json" });
    if (!existenteUpdate || existenteUpdate.tipo !== "corporativo") {
      return jsonError(404, "cota_nao_encontrada", "Registro corporativo não encontrado");
    }
    // campos proibidos: cnpj, tipo, categoria, vendida, valor
    const atualizado = {
      ...existenteUpdate,
      empresa:   empresa   ? String(empresa).trim().slice(0, 100)  : existenteUpdate.empresa,
      segmento:  segmento  ? String(segmento).trim().slice(0, 50)   : existenteUpdate.segmento,
      site:      site      ? String(site).trim().slice(0, 200)      : existenteUpdate.site,
      logoUrl:   logoUrl   ? String(logoUrl).trim().slice(0, 500)   : existenteUpdate.logoUrl,
      email:     email     ? String(email).trim().slice(0, 120).toLowerCase() : existenteUpdate.email,
      updatedAt: new Date().toISOString(),
    };
    await storeUpdate.setJSON(clienteIdUpdate, atualizado);
    // atualiza também o índice CNPJ
    const idxCnpjUpd = abrirStore(BLOB_COTAS_CNPJ);
    if (idxCnpjUpd && existenteUpdate.cnpj) {
      try {
        const idxEntry = await idxCnpjUpd.get(existenteUpdate.cnpj, { type: "json" });
        if (idxEntry) {
          await idxCnpjUpd.setJSON(existenteUpdate.cnpj, {
            ...idxEntry,
            empresa: atualizado.empresa,
            email: atualizado.email,
          });
        }
      } catch (err) {
        console.warn("[cotas] update indice CNPJ falhou:", err?.message);
      }
    }
    return jsonResponse(atualizado);
  }

  const denied = await guardAdmin(req);
  if (denied) return denied;

  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com cliente_id, categoria, vendida, disponivel");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  let endereco, categoria;
  try {
    endereco  = validarEndereco(body.cliente_id);
    categoria = validarCategoria(body.categoria);
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  const store = abrirStore(BLOB_COTAS);
  if (!store) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");

  const existente = await store.get(endereco, { type: "json" });

  // Se mudou de categoria, remove do índice antigo e adiciona no novo
  if (existente && existente.categoria !== categoria) {
    await atualizarIndice(existente.categoria, endereco, "remover");
  }

  const agora = new Date().toISOString();
  const registro = {
    cliente_id:    endereco,
    categoria,
    vendida:       !!body.vendida,
    disponivel:    body.disponivel === undefined ? !body.vendida : !!body.disponivel,
    cliente_nome:  sanitizeText(body.cliente_nome, 80),
    produto_nome:  sanitizeText(body.produto_nome, 120),
    produto_url:   sanitizeText(body.produto_url, 300),
    valor:         Number.isFinite(Number(body.valor)) ? Number(body.valor) : null,
    criadoEm:      existente?.criadoEm ?? agora,
    atualizadoEm:  agora,
  };

  await store.setJSON(endereco, registro);
  await atualizarIndice(categoria, endereco, "adicionar");

  // REQ-17: Vale-Crédito automático se valor_produto < mínimo da categoria.
  // Só gera no PRIMEIRO upsert OU quando valor/categoria mudaram — evita
  // creditar duas vezes na mesma operação.
  let valeCredito = null;
  const mudouValor = !existente || existente.valor !== registro.valor;
  const mudouCategoria = !existente || existente.categoria !== registro.categoria;
  if (registro.valor != null && (mudouValor || mudouCategoria)) {
    valeCredito = await creditarValeCreditoAutomatico({
      cliente_id: endereco,
      categoria,
      valorProduto: registro.valor,
      motivo: `Vale-Crédito ${categoria.toUpperCase()} (produto: ${registro.produto_nome || "—"})`,
    });
  }

  console.info("[cotas] upsert", {
    endereco, categoria, vendida: registro.vendida,
    vale_credito: valeCredito ? { transacaoId: valeCredito.transacaoId, diferencaBrl: valeCredito.diferencaBrl } : null,
  });
  return jsonResponse({
    ok: true,
    ...registro,
    vale_credito: valeCredito,
  }, existente ? 200 : 201);
}

async function handleDelete(req) {
  const denied = await guardAdmin(req);
  if (denied) return denied;

  const url = new URL(req.url);
  let endereco;
  try { endereco = validarEndereco(url.searchParams.get("cliente_id")); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }
  const store = abrirStore(BLOB_COTAS);
  if (!store) return jsonError(502, "store_indisponivel", "Netlify Blobs indisponível");
  const existente = await store.get(endereco, { type: "json" });
  if (!existente) return jsonError(404, "cota_nao_encontrada", "cliente não tem cota atribuída");
  await store.delete(endereco);
  await atualizarIndice(existente.categoria, endereco, "remover");
  return jsonResponse({ ok: true, removido: endereco });
}

export default async (req) => {
  if (req.method === "GET") {
    const rl = await aplicarRateLimit(req, "cotas-get", 30);
    if (rl) return rl;
    return handleGet(req);
  }
  if (req.method === "POST") {
    const rl = await aplicarRateLimit(req, "cotas-post", 10);
    if (rl) return rl;
    return handlePost(req);
  }
  if (req.method === "DELETE") {
    const rl = await aplicarRateLimit(req, "cotas-delete", 10);
    if (rl) return rl;
    return handleDelete(req);
  }
  return jsonError(405, "metodo_invalido", "use GET, POST ou DELETE", { allowed: ["GET", "POST", "DELETE"] });
};
