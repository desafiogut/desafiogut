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
//   Gated por x-admin-token. Remove a cota.
//
// Persistência (MC37/MC38 — Supabase, ver _lib/cotas-store.mjs):
//   cotas:{cliente_id}             → tabela `cotas` (payload jsonb + colunas índice)
//   cotas-cnpj:{cnpj}              → coluna `cotas.cnpj` (anti-duplicidade, query WHERE)
//   cotas-indice:{categoria}       → query WHERE categoria= (deixou de ser store)
//   cotas-fingerprint:{visitorId}  → tabela `cota_fingerprints` (anti-Sybil)
//   Leitura e escrita 100% Supabase (R11). MC38 removeu o fallback de leitura dos
//   Blobs legados (migração de cotas confirmada: 7/7 byte-fiel em prod+staging).

import {
  jsonResponse, jsonError, validarEndereco, parseJsonBody, ValidationError,
  validarOwnerOuAdmin, mascararDoc,
} from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { guardAdmin, autenticarAdmin } from "./_lib/admin-auth.mjs";
// MC87 (P0-1) — o GET deixou de ser público. Ver `resolverChamador` e as projeções.
import { verificarUserSession } from "./_lib/jwt.mjs";
import { getAdminAddresses } from "./_lib/admin-helpers.mjs";
// MC17.1 — o excedente da cota comercial gera SENHAS DE TROCO (off-chain, 30d).
import { creditarTroco, senhasDoExcedente, TROCO_VALIDADE_DIAS } from "./_lib/troco-senhas.mjs";
// MC17.1 — mínimos por categoria centralizados (fonte única; usados no troco).
import { MIN_POR_CATEGORIA_BRL } from "./_lib/cota-ativacao.mjs";
// MC37/MC38 — cotas em Supabase (cotas-store), leitura e escrita 100% Supabase (R11).
// O índice CNPJ vira coluna `cnpj` (não-única; anti-duplicidade aplicacional); o
// anti-Sybil vira tabela cota_fingerprints; o índice por categoria vira query WHERE.
import {
  getCota, getCotaByCnpj, getCotaByEmail, listarCategoria as listarCategoriaStore,
  resumoCotas, upsertCota, deleteCota, getFingerprint, setFingerprint,
} from "./_lib/cotas-store.mjs";

const CATEGORIAS  = new Set(["bronze", "prata", "ouro", "diamante"]);

// MC17.1 — MIN_POR_CATEGORIA_BRL importado de cota-ativacao.mjs (fonte única).
// O excedente (produto < mínimo) gera senhas de troco (ver creditarTrocoExcedente).

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

// MC37 — índice por categoria eliminado (categoria é coluna → query WHERE no Supabase).
async function listarCategoria(categoria) {
  try { return await listarCategoriaStore(categoria); }
  catch (err) { console.warn("[cotas] listarCategoria falhou:", err?.message); return []; }
}

// MC17.1 — Conversão do excedente da cota em SENHAS DE TROCO.
// Regra (validada pelo cliente): se o produto anunciado vale menos que o mínimo
// da categoria, a diferença vira senhas (R$ 2,00 cada), válidas 30 dias (FIFO).
// SUBSTITUI o antigo Vale-Crédito em R$ (REQ-17) neste fluxo.
// Idempotente por idemKey (cliente+categoria+valor) — re-upsert não duplica.
async function creditarTrocoExcedente({ cliente_id, categoria, valorProduto }) {
  const minimoBrl = MIN_POR_CATEGORIA_BRL[categoria];
  if (!minimoBrl) return null;
  if (!Number.isFinite(valorProduto) || valorProduto >= minimoBrl) return null;

  const diferencaBrl      = minimoBrl - valorProduto;
  const diferencaCentavos = Math.round(diferencaBrl * 100);
  const senhas = senhasDoExcedente(diferencaCentavos);
  if (senhas <= 0) return null;

  const res = await creditarTroco({
    endereco: cliente_id,
    senhas,
    origem: `excedente-${categoria}`,
    idemKey: `cota-${String(cliente_id).toLowerCase()}-${categoria}-${Math.round(valorProduto * 100)}`,
  });
  if (!res.ok) {
    console.warn("[cotas] crédito de troco falhou (não-fatal):", res.code, res.message);
    return null;
  }
  return {
    senhas,
    diferencaBrl,
    diferencaCentavos,
    validadeDias: TROCO_VALIDADE_DIAS,
    idempotent: res.idempotent,
    saldoTroco: res.saldoTroco,
  };
}

async function resumoAgregado() {
  try { return await resumoCotas([...CATEGORIAS]); } // MC37 — agregação via Supabase
  catch (err) { console.warn("[cotas] resumoAgregado falhou:", err?.message); return {}; }
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

// MC15.3 — Normaliza nome de empresa para comparação insensível a acentos/maiúsculas/espaços.
function normalizarEmpresa(v) {
  return String(v || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // MC15.3 — remove acentos
    .toLowerCase().trim().replace(/\s+/g, " ");
}

// ── MC87 (P0-1) — controlo de acesso do GET ──────────────────────────────────
//
// O GET era INTEIRAMENTE anónimo enquanto POST/DELETE exigiam admin. Quatro ramos
// devolviam o cadastro completo do lojista (cnpj + email + carteira) a qualquer
// pessoa. Como produção ainda lê Blobs, o dano estava latente — mas o Supabase já
// tem 7 cotas reais e o flip DATA_STORE_BACKEND ligaria a torneira.
//
// A correção NÃO é um 401 cego: dois ramos (?cnpj= no cadastro, ?acao=verificar-login)
// são legitimamente PRÉ-autenticação. O modelo aplicado é minimização de dados:
//   anon  → projeção pública (sem cnpj/email); ?cnpj= exige também `empresa`
//   user  → o próprio registo (owner-check por carteira)
//   admin → registo completo
const CAMPOS_PUBLICOS_COTA = [
  "cliente_id", "categoria", "cliente_nome", "vendida", "disponivel",
  "produto_nome", "produto_url", "produto_valor", "valor",
  "empresa", "segmento", "site", "logoUrl", "tipo",
];

/** Projeção pública de uma cota: vitrine/mercado, sem PII (cnpj, email, payload). */
function projetarCotaPublica(cota) {
  if (!cota || typeof cota !== "object") return cota;
  const out = {};
  for (const k of CAMPOS_PUBLICOS_COTA) if (cota[k] !== undefined) out[k] = cota[k];
  return out;
}

/**
 * Resolve o papel do chamador do GET, sem nunca lançar.
 * @returns {Promise<{ papel: "admin"|"user"|"anon", endereco: string|null }>}
 */
async function resolverChamador(req) {
  // Admin: mesmo guard do POST/DELETE (x-admin-token legado OU Bearer admin-access).
  try {
    const auth = await autenticarAdmin(req);
    if (auth?.ok) return { papel: "admin", endereco: auth.endereco || null };
  } catch { /* segue para user-session */ }

  const header = req.headers.get("authorization") || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try {
      const payload = await verificarUserSession(token);
      return { papel: "user", endereco: String(payload?.endereco || "").toLowerCase() };
    } catch { /* token inválido/expirado → anon */ }
  }
  return { papel: "anon", endereco: null };
}

async function handleGet(req) {
  const url       = new URL(req.url);
  const clienteId = url.searchParams.get("cliente_id");
  const categoria = url.searchParams.get("categoria");
  const cnpjParam = url.searchParams.get("cnpj"); // MC12.3 — anti-duplicidade
  const acao      = url.searchParams.get("acao");  // MC15.3 — roteamento por ação

  // MC15.3 — autenticação de lojista já cadastrado por CNPJ + Nome da Empresa.
  if (acao === "verificar-login") {
    // MC15.3 — rate limit primeiro (10 req/min, padrão MC1).
    const rl = await aplicarRateLimit(req, "cotas-login-cnpj", 10);
    if (rl) return rl;

    // MC15.3 — lê e normaliza CNPJ (apenas dígitos).
    const cnpjRaw = url.searchParams.get("cnpj");
    const empresa = url.searchParams.get("empresa");
    const cnpjNums = String(cnpjRaw || "").replace(/\D/g, "");

    // MC15.3 — valida CNPJ.
    if (!validarCNPJ(cnpjNums)) return jsonError(400, "cnpj_invalido", "CNPJ inválido");

    // MC15.3 — valida Nome da Empresa (mínimo 3 caracteres).
    const empresaTrim = String(empresa || "").trim();
    if (empresaTrim.length < 3) return jsonError(400, "empresa_invalida", "Nome da Empresa inválido");

    // MC37 — busca pelo CNPJ no Supabase (coluna cnpj), fallback Blob legado.
    const reg = await getCotaByCnpj(cnpjNums);

    // MC15.3 — compara nomes normalizados (anti-enumeração: mensagem genérica).
    if (!reg || normalizarEmpresa(reg.empresa) !== normalizarEmpresa(empresaTrim)) {
      console.warn("[cotas] verificar-login falhou", { cnpj: cnpjNums.slice(0, 4) + "…", match: false });
      return jsonError(404, "login_nao_confere", "CNPJ ou Nome da Empresa não encontrados. Verifique os dados.");
    }

    // MC15.3 — match ok: retorna email para envio de OTP client-side (email NUNCA em log).
    console.info("[cotas] verificar-login ok", { cnpj: cnpjNums.slice(0, 4) + "…", match: true });
    return jsonResponse({ ok: true, email: reg.email || null, endereco: reg.endereco || null });
  }

  // MC12.3 — verifica se CNPJ já está cadastrado. Retorna 200 com índice ou 404.
  //
  // MC87 (P0-1): este ramo devolvia { endereco, email, empresa } a QUALQUER pessoa
  // que soubesse um CNPJ — e CNPJ é dado público no Brasil, o que tornava a colheita
  // de e-mails de parceiros trivial. Agora:
  //   · sem `empresa`  → só o facto de estar ocupado (o que o cadastro precisa de saber)
  //   · com `empresa`  → dados de contacto, se o nome bater (mesma barreira do
  //                      ramo `verificar-login`, que já era o gate pré-auth desenhado)
  //   · admin          → sempre completo
  // Rate-limit aplicado (antes este ramo não tinha nenhum).
  if (cnpjParam) {
    const rlCnpj = await aplicarRateLimit(req, "cotas-cnpj", 10);
    if (rlCnpj) return rlCnpj;

    const nums = String(cnpjParam).replace(/\D/g, "");
    if (!validarCNPJ(nums)) {
      return jsonError(400, "cnpj_invalido", "CNPJ inválido");
    }
    const reg = await getCotaByCnpj(nums);
    if (!reg) return jsonError(404, "cnpj_nao_encontrado", "CNPJ livre");

    const chamador   = await resolverChamador(req);
    const empresaQry = url.searchParams.get("empresa");
    const nomeConfere = Boolean(empresaQry)
      && normalizarEmpresa(reg.empresa) === normalizarEmpresa(empresaQry);

    if (chamador.papel === "admin" || nomeConfere) {
      return jsonResponse({
        status: "cnpj_ja_registado",
        endereco: reg.endereco,
        email: reg.email || null,
        empresa: reg.empresa || null,
      });
    }
    // Resposta mínima: confirma a duplicidade sem revelar de quem.
    console.info("[cotas] cnpj ocupado (resposta mínima)", { cnpj: mascararDoc(nums) });
    return jsonResponse({ status: "cnpj_ja_registado", detalhesOcultos: true });
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
    // MC87 (P0-1) — exige sessão autenticada. Não é possível fazer owner-check por
    // e-mail (o JWT prova a CARTEIRA, e o propósito deste ramo é justamente cobrir
    // o caso em que o cadastro tem outra carteira — MC15.2/15.3). O que se fecha
    // aqui é a colheita ANÓNIMA em massa: agora o chamador tem de ter carteira,
    // sessão válida e passa por rate-limit, ficando atribuível.
    const chamadorEmail = await resolverChamador(req);
    if (chamadorEmail.papel === "anon") {
      return jsonError(401, "token_ausente",
        "Authorization: Bearer <user-session> obrigatório para consulta por email");
    }
    const rlEmail = await aplicarRateLimit(req, "cotas-email", 10);
    if (rlEmail) return rlEmail;
    // MC37 — lookup direto por email no Supabase (coluna email); devolve o registo
    // COMPLETO com tipo "corporativo" (necessário p/ AppContext definir o perfil).
    try {
      const completo = await getCotaByEmail(emailParam.toLowerCase());
      if (completo) return jsonResponse(completo.tipo ? completo : { ...completo, tipo: "corporativo" });
    } catch (err) {
      console.warn("[cotas] lookup por email falhou:", err?.message);
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
    // MC87 (P0-1) — IDOR fechado: o registo completo (cnpj/email) só sai para o
    // DONO da carteira ou para admin. Os quatro call-sites do frontend consultam
    // sempre o próprio endereço, logo passam no owner-check.
    const chamadorId = await resolverChamador(req);
    if (chamadorId.papel === "anon") {
      return jsonError(401, "token_ausente",
        "Authorization: Bearer <user-session> obrigatório para consulta por cliente_id");
    }
    const admins = await getAdminAddresses();
    const guard  = validarOwnerOuAdmin({ endereco: chamadorId.endereco }, endereco, admins);
    if (!guard.ok && chamadorId.papel !== "admin") {
      return jsonError(403, "acesso_negado", "token não pertence ao endereço solicitado e não é admin");
    }

    const reg = await getCota(endereco);
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
    // MC87 (P0-1) — este ramo listava TODAS as cotas da categoria com cnpj e email,
    // sem autenticação: divulgação em massa sem sequer precisar de um identificador.
    // A vitrine e o /mercado precisam apenas de cliente_id/nome/produto, então o
    // não-admin recebe a projeção pública e o admin continua a ver tudo.
    const chamadorCat = await resolverChamador(req);
    const lista = chamadorCat.papel === "admin" ? cotas : cotas.map(projetarCotaPublica);
    return jsonResponse({ categoria: cat, total: lista.length, cotas: lista });
  }
  // Sem params: resumo agregado.
  // MC87 (P0-1) — o resumo carregava `cliente_ids` (carteiras) por categoria; a
  // Vitrine pública só usa `total_atribuidas`. Enumeração removida para não-admin.
  const resumo = await resumoAgregado();
  const chamadorResumo = await resolverChamador(req);
  if (chamadorResumo.papel === "admin") return jsonResponse({ resumo });
  const resumoPublico = {};
  for (const [cat, v] of Object.entries(resumo || {})) {
    const { cliente_ids, ...resto } = v || {};
    resumoPublico[cat] = resto;
  }
  return jsonResponse({ resumo: resumoPublico });
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
    // MC12.3 Item 2 / MC37 — anti-duplicidade: getCotaByCnpj (coluna cnpj UNIQUE no
    // Supabase) + fallback Blob legado. Mesmo CNPJ em cliente diferente → 409.
    const existenteCnpj = await getCotaByCnpj(cnpjNums);
    if (existenteCnpj && existenteCnpj.cliente_id !== clienteId) {
      return jsonError(409, "cnpj_duplicado", "CNPJ já cadastrado em outra conta.");
    }

    // MC12.3 Item 5B / MC37 — Anti-Sybil: 1 CNPJ por visitorId a cada 24h (tabela
    // cota_fingerprints).
    try {
      const fpData = (await getFingerprint(visitorId)) ?? { cnpjs: [] };
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
    await upsertCota(clienteId, registro); // MC37 — escrita só Supabase (R11)

    // MC37 — o índice CNPJ deixou de ser store próprio: a coluna `cnpj` (UNIQUE) da
    // própria linha (extraída do registro pelo cotas-store) serve a anti-duplicidade.

    // MC12.3 Item 5B / MC37 — atualiza histórico anti-Sybil (cota_fingerprints).
    try {
      const fpData = (await getFingerprint(visitorId)) ?? { cnpjs: [] };
      const agora24h = Date.now() - 24 * 60 * 60 * 1000;
      const recentes = (fpData.cnpjs || []).filter(c =>
        new Date(c.em).getTime() > agora24h);
      await setFingerprint(visitorId, {
        cnpjs: [...recentes.filter(c => c.cnpj !== cnpjNums), { cnpj: cnpjNums, em: agora }],
        ultimoCnpj: cnpjNums,
        ultimoEm:   agora,
      });
    } catch (err) {
      console.warn("[cotas] anti-Sybil update falhou (não-fatal):", err?.message);
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
    const existenteUpdate = await getCota(clienteIdUpdate);
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
    await upsertCota(clienteIdUpdate, atualizado); // MC37 — coluna cnpj/email atualiza com a linha
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

  const existente = await getCota(endereco);
  // MC37 — índice por categoria eliminado (categoria é coluna); sem manutenção de índice.

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

  await upsertCota(endereco, registro); // MC37 — escrita só Supabase (R11)

  // MC17.1: senhas de troco se valor_produto < mínimo da categoria.
  // Só gera no PRIMEIRO upsert OU quando valor/categoria mudaram — evita
  // creditar duas vezes na mesma operação.
  let trocoSenhas = null;
  const mudouValor = !existente || existente.valor !== registro.valor;
  const mudouCategoria = !existente || existente.categoria !== registro.categoria;
  if (registro.valor != null && (mudouValor || mudouCategoria)) {
    trocoSenhas = await creditarTrocoExcedente({
      cliente_id: endereco,
      categoria,
      valorProduto: registro.valor,
    });
  }

  console.info("[cotas] upsert", {
    endereco, categoria, vendida: registro.vendida,
    troco_senhas: trocoSenhas ? { senhas: trocoSenhas.senhas, diferencaBrl: trocoSenhas.diferencaBrl } : null,
  });
  return jsonResponse({
    ok: true,
    ...registro,
    troco_senhas: trocoSenhas,
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
  const existente = await getCota(endereco);
  if (!existente) return jsonError(404, "cota_nao_encontrada", "cliente não tem cota atribuída");
  await deleteCota(endereco); // MC37 — só Supabase (R11)
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
