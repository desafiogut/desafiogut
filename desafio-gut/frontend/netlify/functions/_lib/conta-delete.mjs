// _lib/conta-delete.mjs — MC72 (Exclusão de conta / conformidade Play Store)
//
// Lógica PURA e INJETÁVEL da exclusão de conta. Não importa @netlify/blobs nem o
// cliente Supabase diretamente — recebe-os por parâmetro para ser 100% testável
// com mocks (node --test). Os handlers (delete-account.mjs) injetam as deps reais.
//
// Estratégia (decisões MC72, ver docs/MC72-delete-account.txt):
//   1) HARD-DELETE dos dados PESSOAIS não-fiscais (Supabase + Blobs).
//   2) ANONIMIZAR e RETER os registros FINANCEIROS/FISCAIS (obrigação legal BR):
//      remove o vínculo com o endereço/PII mas mantém valor/data/pedido.
//   3) RETER (só declarar) os dados ON-CHAIN (imutáveis — impossível apagar).
//
// A exclusão é BEST-EFFORT com manifesto detalhado: não há transação distribuída
// entre Blobs + Supabase + N tabelas, logo cada sub-operação é fail-soft e os
// erros são coletados. O caller decide o HTTP status a partir de `erros`.
//
// dryRun=true calcula o manifesto (o que SERIA apagado/anonimizado) SEM mutar —
// para o operador validar antes da execução real (Pilar 1 SUPERPERS).

// Token de anonimização que substitui o endereço nos registros retidos.
export const ENDERECO_ANONIMO = "0x000000000000000000000000000000000000dead";

// ── Alvos Supabase ───────────────────────────────────────────────────────────
// Hard-delete por cliente_id = endereço (usuário individual).
const SUPA_DELETE_POR_CLIENTE = ["saldo_rs", "troco_senhas", "wallet"];
// Hard-delete por coluna `endereco`.
// MC89.43: `atividade_utilizadores` entra aqui. É a contrapartida obrigatória de
// passar a registar presença (P0-A) — sem isto, apagar a conta deixava para trás
// o endereço e os carimbos de acesso, e a exclusão deixaria de ser completa
// (MC72 / requisito da Play Store).
const SUPA_DELETE_POR_ENDERECO = ["lances", "lojistas", "atividade_utilizadores"];
// Anonimizar (reter fiscal): keyed por PK própria; filtro por payload->>endereco.
const SUPA_ANON = [
  { tabela: "saldo_rs_creditos", pk: "pedido_id" },
  { tabela: "saldo_rs_debitos", pk: "operacao_id" },
];

// ── Alvos Blobs ──────────────────────────────────────────────────────────────
// Hard-delete: chave do blob = endereço.
const BLOBS_DELETE_POR_CHAVE = ["saldo-rs", "wallet", "cotas", "renovacao-adesao", "voucher"];
// Hard-delete: registros cujo payload referencia o endereço (chave arbitrária).
const BLOBS_DELETE_POR_VALOR = ["lance-idem"];
// Anonimizar (reter financeiro): payload.endereco → ENDERECO_ANONIMO.
const BLOBS_ANON = ["pedidos", "pedidos-pagos", "pedidos-meta"];

// Dados retidos por imposição técnica/legal — só declarados (disclosure).
export const DADOS_RETIDOS = [
  {
    categoria: "on-chain",
    descricao: "Saldo de senhas e histórico de lances registrados no smart contract " +
      "(blockchain Ethereum). São imutáveis e pseudônimos (identificados apenas pelo " +
      "endereço da carteira) — tecnicamente impossíveis de apagar.",
  },
  {
    categoria: "fiscal",
    descricao: "Registros contábeis de pagamentos PIX (valor, data, pedido) são " +
      "anonimizados (desvinculados do titular) e retidos pelo prazo legal exigido pela " +
      "legislação fiscal brasileira.",
  },
];

function normalizar(endereco) {
  return String(endereco || "").toLowerCase();
}

// Chaves de PII a REMOVER dos registros retidos (defesa em profundidade): hoje os
// registros fiscais só carregam `endereco`, mas se um campo pessoal for adicionado
// no futuro ele é limpo automaticamente ao anonimizar. `endereco`/`address` são
// substituídos pelo token; os demais são removidos por completo.
const PII_KEYS_REMOVER = ["email", "cpf", "cnpj", "nome", "name", "telefone", "phone", "payerEmail", "payer_email"];

/** Anonimiza um payload in-place: endereço→token, remove demais PII, carimba. */
function anonimizarPayload(payload) {
  const obj = { ...(payload || {}) };
  if ("endereco" in obj) obj.endereco = ENDERECO_ANONIMO;
  if ("address" in obj) obj.address = ENDERECO_ANONIMO;
  for (const k of PII_KEYS_REMOVER) if (k in obj) delete obj[k];
  obj.anonimizadoEm = new Date().toISOString();
  obj.anonimizadoPor = "mc72-exclusao-conta";
  return obj;
}

// ── Supabase ─────────────────────────────────────────────────────────────────

/** Conta/deleta linhas de `tabela` onde `coluna = endereco`. dryRun só conta. */
async function apagarPorColuna(supabase, tabela, coluna, endereco, dryRun) {
  if (dryRun) {
    const { count, error } = await supabase
      .from(tabela)
      .select(coluna, { count: "exact", head: true })
      .eq(coluna, endereco);
    if (error) throw new Error(`select ${tabela}.${coluna}: ${error.message}`);
    return count ?? 0;
  }
  const { data, error } = await supabase
    .from(tabela)
    .delete()
    .eq(coluna, endereco)
    .select(coluna);
  if (error) throw new Error(`delete ${tabela}.${coluna}: ${error.message}`);
  return Array.isArray(data) ? data.length : 0;
}

/** cotas: apaga onde cliente_id = endereço OU coluna endereco = endereço. */
async function apagarCotas(supabase, endereco, dryRun) {
  const filtro = `cliente_id.eq.${endereco},endereco.eq.${endereco}`;
  if (dryRun) {
    const { count, error } = await supabase
      .from("cotas")
      .select("cliente_id", { count: "exact", head: true })
      .or(filtro);
    if (error) throw new Error(`select cotas: ${error.message}`);
    return count ?? 0;
  }
  const { data, error } = await supabase
    .from("cotas")
    .delete()
    .or(filtro)
    .select("cliente_id");
  if (error) throw new Error(`delete cotas: ${error.message}`);
  return Array.isArray(data) ? data.length : 0;
}

/** Anonimiza (reter) as linhas fiscais cujo payload->>endereco = endereço. */
async function anonimizarFiscalSupabase(supabase, tabela, pk, endereco, dryRun) {
  const { data, error } = await supabase
    .from(tabela)
    .select(`${pk}, payload`)
    .eq("payload->>endereco", endereco);
  if (error) throw new Error(`select ${tabela} (anon): ${error.message}`);
  const linhas = data ?? [];
  if (dryRun) return linhas.length;

  let anonimizadas = 0;
  for (const linha of linhas) {
    const payload = anonimizarPayload(linha.payload);
    const { error: errUpd } = await supabase
      .from(tabela)
      .update({ payload })
      .eq(pk, linha[pk]);
    if (errUpd) throw new Error(`update ${tabela}.${pk}=${linha[pk]} (anon): ${errUpd.message}`);
    anonimizadas += 1;
  }
  return anonimizadas;
}

/**
 * Executa (ou simula) a exclusão no Supabase. Cada sub-operação é isolada: um erro
 * numa tabela não impede as outras — o erro entra em `erros` e o caller decide.
 * @returns {{ deletado: object, anonimizado: object, erros: string[] }}
 */
export async function excluirSupabase(supabase, endereco, { dryRun = false } = {}) {
  const ender = normalizar(endereco);
  const deletado = {};
  const anonimizado = {};
  const erros = [];

  for (const tabela of SUPA_DELETE_POR_CLIENTE) {
    try { deletado[tabela] = await apagarPorColuna(supabase, tabela, "cliente_id", ender, dryRun); }
    catch (err) { erros.push(`supabase:${tabela}: ${err.message}`); }
  }
  for (const tabela of SUPA_DELETE_POR_ENDERECO) {
    try { deletado[tabela] = await apagarPorColuna(supabase, tabela, "endereco", ender, dryRun); }
    catch (err) { erros.push(`supabase:${tabela}: ${err.message}`); }
  }
  try { deletado["cotas"] = await apagarCotas(supabase, ender, dryRun); }
  catch (err) { erros.push(`supabase:cotas: ${err.message}`); }

  for (const { tabela, pk } of SUPA_ANON) {
    try { anonimizado[tabela] = await anonimizarFiscalSupabase(supabase, tabela, pk, ender, dryRun); }
    catch (err) { erros.push(`supabase:${tabela} (anon): ${err.message}`); }
  }

  return { deletado, anonimizado, erros };
}

// ── Blobs ────────────────────────────────────────────────────────────────────

function abrirStoreSeguro(getStore, nome) {
  try { return getStore({ name: nome, consistency: "strong" }); }
  catch (err) {
    console.warn(`[conta-delete] Blobs ${nome} indisponível:`, err?.message);
    return null;
  }
}

/** Deleta o blob cuja chave é o próprio endereço. Devolve 1 se existia, 0 senão. */
async function apagarBlobPorChave(getStore, nome, endereco, dryRun) {
  const store = abrirStoreSeguro(getStore, nome);
  if (!store) return 0;
  let existente = null;
  try { existente = await store.get(endereco, { type: "json" }); }
  catch { existente = null; }
  if (existente == null) return 0;
  if (!dryRun) await store.delete(endereco);
  return 1;
}

/** Retorna as chaves de um store cujo payload referencia o endereço. */
async function chavesDoEndereco(store, endereco, { sufixoChave = false } = {}) {
  const alvo = [];
  let listagem;
  try { listagem = await store.list(); }
  catch (err) {
    console.warn("[conta-delete] list falhou:", err?.message);
    return alvo;
  }
  for (const { key } of listagem?.blobs ?? []) {
    if (sufixoChave && key.endsWith(":" + endereco)) { alvo.push(key); continue; }
    if (sufixoChave) continue;
    try {
      const obj = await store.get(key, { type: "json" });
      const e = normalizar(obj?.endereco ?? obj?.address);
      if (e === endereco) alvo.push(key);
    } catch { /* ignora chave ilegível */ }
  }
  return alvo;
}

/** Deleta blobs cujo payload referencia o endereço (chave arbitrária). */
async function apagarBlobPorValor(getStore, nome, endereco, dryRun) {
  const store = abrirStoreSeguro(getStore, nome);
  if (!store) return 0;
  const chaves = await chavesDoEndereco(store, endereco);
  if (!dryRun) for (const key of chaves) { try { await store.delete(key); } catch {} }
  return chaves.length;
}

/** consent-log: chaves no formato `<ts>:<endereco>`. */
async function apagarConsentLog(getStore, endereco, dryRun) {
  const store = abrirStoreSeguro(getStore, "consent-log");
  if (!store) return 0;
  const chaves = await chavesDoEndereco(store, endereco, { sufixoChave: true });
  if (!dryRun) for (const key of chaves) { try { await store.delete(key); } catch {} }
  return chaves.length;
}

/** Anonimiza (reter) blobs financeiros: payload.endereco → ENDERECO_ANONIMO. */
async function anonimizarBlob(getStore, nome, endereco, dryRun) {
  const store = abrirStoreSeguro(getStore, nome);
  if (!store) return 0;
  const chaves = await chavesDoEndereco(store, endereco);
  if (dryRun) return chaves.length;
  let n = 0;
  for (const key of chaves) {
    try {
      const obj = await store.get(key, { type: "json" });
      if (!obj) continue;
      await store.setJSON(key, anonimizarPayload(obj));
      n += 1;
    } catch (err) {
      console.warn(`[conta-delete] anonimizar ${nome}:${key} falhou:`, err?.message);
    }
  }
  return n;
}

/**
 * Executa (ou simula) a exclusão nos Netlify Blobs. Fail-soft por store.
 * @returns {{ deletado: object, anonimizado: object, erros: string[] }}
 */
export async function excluirBlobs(getStore, endereco, { dryRun = false } = {}) {
  const ender = normalizar(endereco);
  const deletado = {};
  const anonimizado = {};
  const erros = [];

  for (const nome of BLOBS_DELETE_POR_CHAVE) {
    try { deletado[nome] = await apagarBlobPorChave(getStore, nome, ender, dryRun); }
    catch (err) { erros.push(`blobs:${nome}: ${err.message}`); }
  }
  for (const nome of BLOBS_DELETE_POR_VALOR) {
    try { deletado[nome] = await apagarBlobPorValor(getStore, nome, ender, dryRun); }
    catch (err) { erros.push(`blobs:${nome}: ${err.message}`); }
  }
  try { deletado["consent-log"] = await apagarConsentLog(getStore, ender, dryRun); }
  catch (err) { erros.push(`blobs:consent-log: ${err.message}`); }

  for (const nome of BLOBS_ANON) {
    try { anonimizado[nome] = await anonimizarBlob(getStore, nome, ender, dryRun); }
    catch (err) { erros.push(`blobs:${nome} (anon): ${err.message}`); }
  }

  return { deletado, anonimizado, erros };
}

// ── Orquestração ─────────────────────────────────────────────────────────────

/**
 * Exclui (ou simula) TODOS os dados de um endereço em Supabase + Blobs, anonimiza
 * os fiscais e devolve um manifesto único auditável.
 *
 * @param {{ supabase: object, getStore: Function, endereco: string, dryRun?: boolean }} args
 * @returns {Promise<{ endereco, dryRun, executadoEm, supabase, blobs, retido, erros, ok }>}
 */
export async function excluirConta({ supabase, getStore, endereco, dryRun = false }) {
  const ender = normalizar(endereco);
  const supa = await excluirSupabase(supabase, ender, { dryRun });
  const blobs = await excluirBlobs(getStore, ender, { dryRun });
  const erros = [...supa.erros, ...blobs.erros];

  return {
    endereco: ender,
    dryRun,
    executadoEm: new Date().toISOString(),
    supabase: { deletado: supa.deletado, anonimizado: supa.anonimizado },
    blobs: { deletado: blobs.deletado, anonimizado: blobs.anonimizado },
    retido: DADOS_RETIDOS,
    erros,
    ok: erros.length === 0,
  };
}
