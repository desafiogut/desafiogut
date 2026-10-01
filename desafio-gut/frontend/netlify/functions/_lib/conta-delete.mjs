// _lib/conta-delete.mjs — MC72 (Exclusão de conta / conformidade Play Store)
//
// Lógica INJETÁVEL da exclusão de conta. Recebe o Supabase e o getStore dos Blobs por parâmetro,
// para ser testável com mocks (node --test); os handlers (delete-account.mjs) injetam as deps reais.
// ⚠️ MC104.3: a escrita dos pedidos passa por `atualizarPedido` (_lib/pedidos.mjs, CAS), que usa o
// `@netlify/blobs` REAL — em produção é o mesmo store que o delete-account injecta; nos testes troca-se
// o módulo (`mock.module("@netlify/blobs")`, ver _tests/_blobs-cas-duplo.mjs).
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

import { createHash } from "node:crypto";
import { atualizarPedido } from "./pedidos.mjs";

// Token de anonimização que substitui o endereço nos registros retidos.
export const ENDERECO_ANONIMO = "0x000000000000000000000000000000000000dead";

// MC104.3 (DEC-104.3-1/-4) — identificador anónimo DETERMINÍSTICO que substitui o endereço nas CHAVES
// (índice de pedidos, notificações, lances): o mesmo endereço dá sempre o mesmo `anon:<sha256>`.
// ⚠️ É pseudonimização: sem sal, quem já conhece o endereço recalcula o hash.
export function chaveAnonima(endereco) {
  return "anon:" + createHash("sha256").update(normalizar(endereco)).digest("hex");
}

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
    descricao: "Registros contábeis de pagamentos PIX (valor, data, pedido) e a NF-e dos pedidos " +
      "(número, série e chave de acesso) são anonimizados (desvinculados do titular) e retidos " +
      "pelo prazo legal exigido pela legislação fiscal brasileira.",
  },
];

function normalizar(endereco) {
  return String(endereco || "").toLowerCase();
}

// Chaves de PII a REMOVER dos registros retidos (defesa em profundidade): os
// registros fiscais carregam `endereco` (ou `comprador` + `morada`, nos pedidos — tratados
// em anonimizarPayload), mas se um campo pessoal de topo for adicionado
// no futuro ele é limpo automaticamente ao anonimizar. `endereco`/`address` são
// substituídos pelo token; os demais são removidos por completo.
const PII_KEYS_REMOVER = ["email", "cpf", "cnpj", "nome", "name", "telefone", "phone", "payerEmail", "payer_email"];

/** Anonimiza um payload in-place: endereço→token, remove demais PII, carimba. */
function anonimizarPayload(payload) {
  const obj = { ...(payload || {}) };
  if ("endereco" in obj) obj.endereco = ENDERECO_ANONIMO;
  if ("address" in obj) obj.address = ENDERECO_ANONIMO;
  // MC104.2 — pedidos (store "pedidos"): o dono está em `comprador` e a morada traz nome, CPF,
  // morada e telefone. Substituem-se por "***" (anonimizar ≠ apagar); a `nfe` (nº/série/chave)
  // fica intacta — obrigação fiscal, LGPD art. 16, I.
  if ("comprador" in obj) obj.comprador = ENDERECO_ANONIMO;
  if (obj.morada && typeof obj.morada === "object") {
    obj.morada = Object.fromEntries(Object.keys(obj.morada).map((k) => [k, "***"]));
  }
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
 * MC105a.1 — `passes`: anonimizar ≠ apagar (o service_role nem tem DELETE na tabela). Só o
 * `endereco` passa a `chaveAnonima` (o mesmo pseudónimo do MC104.3); edição, produto, datas,
 * palpite, cupons e status ficam. ⚠️ O UNIQUE (endereco, edicao_id, produto_id) COLIDE se a mesma
 * carteira voltar, comprar o mesmo passe e excluir outra vez (23505, validador do MC105a.1): o erro
 * sobe para `erros` e o passe fica com o endereço. Correcção pendente de decisão do operador.
 */
async function anonimizarPasses(supabase, endereco, dryRun) {
  if (dryRun) {
    const { count, error } = await supabase
      .from("passes")
      .select("id", { count: "exact", head: true })
      .eq("endereco", endereco);
    if (error) throw new Error(`select passes (anon): ${error.message}`);
    return count ?? 0;
  }
  const { data, error } = await supabase
    .from("passes")
    .update({ endereco: chaveAnonima(endereco) })
    .eq("endereco", endereco)
    .select("id");
  if (error) throw new Error(`update passes (anon): ${error.message}`);
  return Array.isArray(data) ? data.length : 0;
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
  try { anonimizado["passes"] = await anonimizarPasses(supabase, ender, dryRun); }
  catch (err) { erros.push(`supabase:passes (anon): ${err.message}`); }

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
      // MC104.2: `comprador` é o campo do dono nos pedidos (a mesma regra da exportação, MC104).
      const e = normalizar(obj?.endereco ?? obj?.address ?? obj?.comprador);
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
  const falhas = [];
  for (const key of chaves) {
    try {
      // MC104.3 Frente D (DEC-104.3-5): o pedido de e-commerce escreve-se por `atualizarPedido` (CAS, MC102.0)
      // — uma escrita concorrente (ex.: evento de rastreio) já não se perde. Uma falha não fica silenciosa:
      // sobe para `erros` (o endpoint responde 500 e a exclusão pode ser repetida).
      if (nome === "pedidos" && key.startsWith("pedido:")) {
        const r = await anonimizarPedidoCAS(key.slice("pedido:".length), endereco);
        if (r?.ok) n += 1;
        else if (r?.code !== "pedido_nao_e_do_titular") falhas.push(r?.code ?? "desconhecido");
        continue;
      }
      const obj = await store.get(key, { type: "json" });
      if (!obj) continue;
      await store.setJSON(key, anonimizarPayload(obj));
      n += 1;
    } catch (err) {
      console.warn(`[conta-delete] anonimizar ${nome}:${key} falhou:`, err?.message);
      if (nome === "pedidos" && key.startsWith("pedido:")) falhas.push("excepcao");
    }
  }
  if (falhas.length) throw new Error(`${falhas.length} pedido(s) não anonimizado(s) (${falhas.join(",")}); ${n} anonimizado(s)`);
  return n;
}

/** CAS: relê o pedido com ETag, volta a confirmar o dono, anonimiza no próprio objecto e grava condicional. */
function anonimizarPedidoCAS(produtoId, endereco) {
  return atualizarPedido(produtoId, (pedido) => {
    // Sem pedido lido (a leitura com ETag falhou ou o registo sumiu entre a listagem e aqui) é FALHA visível,
    // não «não é do titular» — senão o pedido do titular ficava por anonimizar com ok:true.
    if (!pedido) return { ok: false, code: "pedido_ilegivel" };
    if (normalizar(pedido.endereco ?? pedido.address ?? pedido.comprador) !== endereco) {
      return { ok: false, code: "pedido_nao_e_do_titular" };
    }
    const anon = anonimizarPayload(pedido);
    for (const k of Object.keys(pedido)) if (!(k in anon)) delete pedido[k];
    Object.assign(pedido, anon);
    return { evento: "anonimizado" };
  });
}

/**
 * MC104.3 Frente A (DEC-104.3-1) — o índice `comprador:<endereço>` = { ids } do store "pedidos" passa a
 * `anon:<sha256>` = { ids: [] }: a entrada fica (existiu), o valor é esvaziado e a chave com o endereço sai
 * (decisão do operador: apagar só a chave antiga do índice). Devolve 1 se existia, 0 senão.
 */
async function anonimizarIndicePedidos(getStore, endereco, dryRun) {
  const store = abrirStoreSeguro(getStore, "pedidos");
  if (!store) return 0;
  const antiga = `comprador:${endereco}`;
  const existente = await store.get(antiga, { type: "json" });
  if (existente == null) return 0;
  if (!dryRun) {
    await store.setJSON(chaveAnonima(endereco), { ids: [] });
    await store.delete(antiga);
  }
  return 1;
}

/**
 * MC104.3 Frente B (DEC-104.3-4) — notificações: o documento (chave = endereço) passa, sem alterações de
 * conteúdo (tipo, data, referências de NF-e/rastreio), para a chave `anon:<sha256>`; a chave com o endereço
 * sai. Nenhuma notificação traz nome/morada/CPF (medido no SEG-1): o elo à pessoa é a chave.
 */
async function anonimizarNotificacoes(getStore, endereco, dryRun) {
  const store = abrirStoreSeguro(getStore, "notificacoes");
  if (!store) return 0;
  const doc = await store.get(endereco, { type: "json" });
  if (doc == null) return 0;
  if (!dryRun) {
    // Uma exclusão anterior do mesmo endereço já pode ter deixado notificações em `anon:` — juntam-se, nunca
    // se sobrescrevem (achado do validador: a 2.ª exclusão apagava as retidas da 1.ª).
    const anon = chaveAnonima(endereco);
    const retidas = await store.get(anon, { type: "json" });
    const juntas = Array.isArray(retidas?.notificacoes)
      ? { ...doc, notificacoes: [...retidas.notificacoes, ...(Array.isArray(doc.notificacoes) ? doc.notificacoes : [])] }
      : doc;
    await store.setJSON(anon, juntas);
    await store.delete(endereco);
  }
  return 1;
}

/** Lance anonimizado: endereço → `anon:<sha256>`, nome de exibição → "***"; valor, edição, datas e commitmentHash ficam. */
function anonimizarLance(lance, endereco) {
  const out = { ...lance, endereco: chaveAnonima(endereco) };
  if ("nomeExibicao" in out) out.nomeExibicao = "***";
  return out;
}

/**
 * MC104.3 Frente B (DEC-104.3-4) — lances Relâmpago nos Blobs (o Supabase `lances` continua a ser APAGADO,
 * MC72 — decisão do operador):
 *  - "bids" (Key-Per-Bid): chave `bid:{edição}:{endereço}:{sufixo}` → `bid:{edição}:anon:<sha256>:{sufixo}`
 *    (continua sob o prefixo da edição) e o registo anonimizado; a chave com o endereço sai;
 *    ⚠️ SÓ em edições já consolidadas (marcador `bid:{edição}:consolidado`): numa edição aberta, a apuração
 *    elegeria `anon:…` como vencedor e a consolidação falharia sempre (endereço inválido na assinatura EIP-712 —
 *    achado do validador; decisão do operador). Esses lances ficam e contam-se em `pendentes`;
 *  - "lances-relampago" (legado, fora de mainnet): chave = edição, anonimiza só os lances do titular.
 */
async function anonimizarLancesBlobs(getStore, endereco, dryRun, pendentes = {}) {
  let n = 0;
  const bids = abrirStoreSeguro(getStore, "bids");
  if (bids) {
    const { blobs = [] } = await bids.list({ prefix: "bid:" });
    for (const { key } of blobs) {
      const m = /^bid:(.+):(0x[0-9a-fA-F]{40}):([^:]+)$/.exec(key);
      if (!m || normalizar(m[2]) !== endereco) continue;
      if ((await bids.get(`bid:${m[1]}:consolidado`, { type: "json" })) == null) {
        pendentes["lances-edicao-aberta"] = (pendentes["lances-edicao-aberta"] ?? 0) + 1;
        continue;
      }
      n += 1;
      if (dryRun) continue;
      const nova = `bid:${m[1]}:${chaveAnonima(endereco)}:${m[3]}`;
      const lance = await bids.get(key, { type: "json" });
      if (lance == null) continue;
      await bids.setJSON(nova, { ...anonimizarLance(lance, endereco), key: nova });
      await bids.delete(key);
    }
  }
  const legado = abrirStoreSeguro(getStore, "lances-relampago");
  if (legado) {
    const { blobs = [] } = await legado.list();
    for (const { key } of blobs) {
      const doc = await legado.get(key, { type: "json" });
      if (!Array.isArray(doc?.lances)) continue;
      const doTitular = (l) => normalizar(l?.endereco ?? l?.address ?? l?.comprador) === endereco;
      const k = doc.lances.filter(doTitular).length;
      if (k === 0) continue;
      n += k;
      if (!dryRun) {
        await legado.setJSON(key, { ...doc, lances: doc.lances.map((l) => (doTitular(l) ? anonimizarLance(l, endereco) : l)) });
      }
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
  const pendente = {}; // MC104.3: o que NÃO pôde ser anonimizado agora (ex.: lance de edição aberta)

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
  try { anonimizado["pedidos-indice"] = await anonimizarIndicePedidos(getStore, ender, dryRun); }
  catch (err) { erros.push(`blobs:pedidos-indice (anon): ${err.message}`); }
  try { anonimizado["notificacoes"] = await anonimizarNotificacoes(getStore, ender, dryRun); }
  catch (err) { erros.push(`blobs:notificacoes (anon): ${err.message}`); }
  try { anonimizado["lances"] = await anonimizarLancesBlobs(getStore, ender, dryRun, pendente); }
  catch (err) { erros.push(`blobs:lances (anon): ${err.message}`); }

  return { deletado, anonimizado, pendente, erros };
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
    blobs: { deletado: blobs.deletado, anonimizado: blobs.anonimizado, pendente: blobs.pendente },
    retido: DADOS_RETIDOS,
    erros,
    ok: erros.length === 0,
  };
}
