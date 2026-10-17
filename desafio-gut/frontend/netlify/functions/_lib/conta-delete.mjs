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
const SUPA_DELETE_POR_ENDERECO = [
  "lances", "lojistas", "atividade_utilizadores",
  "palpites", "pontuacoes", "rankings_ciclo",
];
// R18-110j.1-4b (operador, 2026-10-16) — `resgates` e `pontos` SAEM deste ciclo e passam a ser
// tratados em conjunto (`anonimizarResgates` + `tratarPontos`): o resgate é **anonimizado** (prova de
// entrega, obrigação contabilística) e a linha de `pontos` fica como **âncora da FK**. A ORDEM é
// obrigatória: se `pontos` fosse apagado primeiro, o `ON DELETE CASCADE` levaria consigo o registo
// que o operador mandou reter.
// UTAC110j.1 (R18-110j.1-1) — LACUNA LGPD fechada: `palpites`, `pontuacoes` e `rankings_ciclo` passam
// a ser APAGADOS (`pontos`/`resgates` pela via do comentário acima, decidida depois em R18-110j.1-4b).
// `pontuacoes`/`rankings_ciclo` NÃO podem ser anonimizados (CHECK `endereco ~ '^0x[0-9a-f]{40}$'`) e
// não têm obrigação de retenção ⇒ hard-delete.
// Anonimizar (reter fiscal): keyed por PK própria; filtro por payload->>endereco.
const SUPA_ANON = [
  { tabela: "saldo_rs_creditos", pk: "pedido_id" },
  { tabela: "saldo_rs_debitos", pk: "operacao_id" },
  // B3 (achado do validador, medido): `cotas_pagas.payload` guarda o registo inteiro da cota —
  // `{ cnpj, email, endereco }` — e ficava intacto. É registo de pagamento (retém-se), mas deixa de
  // identificar (art. 16, IV). `fila_tarefas.payload.endereco` idem: uma tarefa falhada ficava com o
  // endereço para sempre.
  { tabela: "cotas_pagas", pk: "pedido_id" },
  { tabela: "fila_tarefas", pk: "id" },
  // O MC88.29 renomeou a `fila_tarefas` antiga para `fila_tarefas_legado`. Se ela existir em produção
  // com linhas antigas, tem o mesmo `payload.endereco`. É OPCIONAL: ausência não é erro (42P01 → 0).
  { tabela: "fila_tarefas_legado", pk: "id", opcional: true },
  // Achado da 2.ª ronda: `wallet.mjs` grava `{ transacaoId, endereco, … }` em `wallet_idem`
  // (PK `idem_key`) — é alcançável pelo endereço e ficava intacto.
  { tabela: "wallet_idem", pk: "idem_key" },
];

// UTAC110j.1 — anonimizar por coluna `endereco` (o registo fica, a pessoa sai):
//   * `passes`              — registo de compra do Passe (Via A); DELETE revogado do service_role.
//   * `google_play_compras` — prova contabilística da compra na Google Play; DELETE revogado.
//   * `eco_quildo`          — passivo monetário com lastro em R$ (Regulamento 5.0, arts. 47º-51º):
//     o SALDO e o HISTÓRICO ficam (o lastro global `eco_quildo_lastro` deixaria de fechar se a linha
//     desaparecesse), o `endereco` passa a `anon:<sha256>`.
const SUPA_ANON_POR_ENDERECO = ["passes", "google_play_compras", "eco_quildo"];

/**
 * UTAC110j.1 (R18-110j.1-1/-2/-3) — POLÍTICA DE EXCLUSÃO, tabela a tabela. FONTE ÚNICA do que é
 * apagado e do que é retido: o teste de deriva (`utac110j1-exclusao-lgpd.test.mjs`) compara esta
 * lista com a migração SQL e com o texto do ecrã de exclusão, e falha se as três divergirem.
 */
export const POLITICA_EXCLUSAO = [
  ...SUPA_DELETE_POR_CLIENTE.map((t) => ({ alvo: t, acao: "hard_delete", chave: "cliente_id", base: "sem obrigação de retenção (LGPD art. 15/16)" })),
  ...SUPA_DELETE_POR_ENDERECO.map((t) => ({ alvo: t, acao: "hard_delete", chave: "endereco", base: "sem obrigação de retenção (LGPD art. 15/16)" })),
  { alvo: "cotas", acao: "hard_delete", chave: "cliente_id|endereco", base: "sem obrigação de retenção (LGPD art. 15/16)" },
  // R18-110j.1-4b (operador): `resgates` é ANONIMIZADO (prova de entrega) e `pontos` mantém-se como
  // hard delete do CONTEÚDO (saldo + histórico) — quando há resgate retido, a linha sobrevive vazia e
  // pseudónima, só como âncora da FK. O saldo e o histórico nunca sobrevivem.
  { alvo: "pontos", acao: "hard_delete", chave: "endereco", base: "sem obrigação de retenção (saldo/histórico); linha vazia só como âncora da FK do resgate retido" },
  { alvo: "resgates", acao: "anonimizar", chave: "endereco", base: "prova de entrega/contabilística (LGPD art. 16, I/IV); morada → «[Conta Deletada]»" },
  ...SUPA_ANON.map(({ tabela }) => ({ alvo: tabela, acao: "anonimizar", chave: "payload->>endereco", base: "obrigação fiscal (LGPD art. 16, I/IV)" })),
  { alvo: "passes", acao: "anonimizar", chave: "endereco", base: "prova de compra (LGPD art. 16, I/IV)" },
  { alvo: "google_play_compras", acao: "anonimizar", chave: "endereco", base: "prova contabilística (LGPD art. 16, I/IV)" },
  { alvo: "eco_quildo", acao: "anonimizar", chave: "endereco", base: "passivo com lastro em R$ (Reg. arts. 47º-51º; LGPD art. 16, IV)" },
  // Blobs: os stores com o endereço na chave ou no valor são apagados; os de auditoria são
  // anonimizados (Marco Civil art. 15). Listados aqui para o teste de deriva.
  { alvo: "blobs:referral-codes", acao: "hard_delete", chave: "endereco", base: "sem obrigação de retenção" },
  { alvo: "blobs:referral-links", acao: "hard_delete", chave: "endereco", base: "sem obrigação de retenção" },
  { alvo: "blobs:referral-bonus", acao: "hard_delete", chave: "endereco", base: "sem obrigação de retenção" },
  { alvo: "blobs:referral-induzido", acao: "hard_delete", chave: "endereco", base: "sem obrigação de retenção" },
  { alvo: "blobs:referral-log", acao: "anonimizar", chave: "eventos", base: "auditoria (Marco Civil art. 15; LGPD art. 16, IV)" },
  { alvo: "blobs:auditoria", acao: "anonimizar", chave: "endereco", base: "auditoria de edições (13 meses); o endereço sai, o evento fica" },
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
// B6 (achado do validador): a lista era curta — `payerName`/`nomeCompleto`/`payer` sobreviviam à
// anonimização (medido em `mc72_anon_payload`). Continua a ser uma DENYLIST: chaves novas não listadas
// aqui sobrevivem — é limite conhecido do desenho, declarado no relatório.
const PII_KEYS_REMOVER = ["email", "cpf", "cnpj", "nome", "name", "telefone", "phone", "payerEmail", "payer_email", "payerName", "nomeCompleto", "payer"];

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
const ausenteOuIlegivel = (err, opcional) => opcional && String(err?.code ?? "") === "42P01";

async function anonimizarFiscalSupabase(supabase, tabela, pk, endereco, dryRun, { opcional = false } = {}) {
  const { data, error } = await supabase
    .from(tabela)
    .select(`${pk}, payload`)
    .eq("payload->>endereco", endereco);
  // Tabela opcional que não existe neste ambiente: 0, sem erro (não é «dado por apagar»).
  if (error) {
    if (ausenteOuIlegivel(error, opcional)) return 0;
    throw new Error(`select ${tabela} (anon): ${error.message}`);
  }
  const linhas = data ?? [];
  if (dryRun) return linhas.length;

  let anonimizadas = 0;
  for (const linha of linhas) {
    const payload = anonimizarPayload(linha.payload);
    const { error: errUpd } = await supabase
      .from(tabela)
      .update({ payload })
      .eq(pk, linha[pk]);
    if (errUpd) {
      if (ausenteOuIlegivel(errUpd, opcional)) return anonimizadas;
      throw new Error(`update ${tabela}.${pk}=${linha[pk]} (anon): ${errUpd.message}`);
    }
    anonimizadas += 1;
  }
  return anonimizadas;
}

/**
 * MC105a.1 — `passes`: anonimizar ≠ apagar (o service_role nem tem DELETE na tabela). Só o
 * `endereco` passa a `chaveAnonima` (o mesmo pseudónimo do MC104.3); edição, produto, datas,
 * palpite, cupons e status ficam. O UNIQUE (endereco, edicao_id, produto_id) é PARCIAL (só endereços
 * 0x…, MC105a.1): se a mesma carteira voltar, comprar o mesmo passe e excluir outra vez, os dois passes
 * ficam com o mesmo pseudónimo em vez de a 2.ª anonimização falhar com 23505.
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
 * B1 (achado do validador, medido em Postgres): cria a linha-âncora de `pontos` com a chave pseudónima
 * ANTES de qualquer escrita em `resgates`, porque a FK é verificada em cada statement. Idempotente:
 * uma 2.ª exclusão encontra a âncora e não faz nada (23505 é corrida concorrente, não falha).
 * A âncora nasce com 0 pontos e histórico vazio — é a única linha de `pontos` que sobrevive, e não
 * tem nada do titular.
 */
async function garantirAncoraPontos(supabase, anon) {
  const { data, error } = await supabase.from("pontos").select("endereco").eq("endereco", anon);
  if (error) throw new Error(`select pontos (âncora): ${error.message}`);
  const existentes = Array.isArray(data) ? data : (data ? [data] : []);
  if (existentes.length > 0) return false;
  const { error: errIns } = await supabase.from("pontos").insert({ endereco: anon, pontos: 0, historico: [] });
  if (errIns && String(errIns.code ?? "") !== "23505") {
    throw new Error(`insert pontos (âncora): ${errIns.message}`);
  }
  return true;
}

/**
 * R18-110j.1-4b (operador, 2026-10-16) — `resgates` NÃO é apagado: é a PROVA DE ENTREGA (obrigação
 * contabilística). Fica o registo da transacção (id, cartao_id, status, datas) e sai o que identifica:
 * `endereco` → `anon:<sha256>` e TODOS os valores da `morada` → `«[Conta Deletada]»` (as chaves
 * mantêm-se, para o registo continuar legível como registo).
 */
export const MORADA_DELETADA = "[Conta Deletada]";

async function anonimizarResgates(supabase, endereco, anon, dryRun) {
  const { data, error } = await supabase.from("resgates").select("id, morada").eq("endereco", endereco);
  if (error) throw new Error(`select resgates: ${error.message}`);
  const linhas = Array.isArray(data) ? data : (data ? [data] : []);
  if (dryRun) return linhas.length;

  // ⚠️ ACHADO B1 DO VALIDADOR (medido contra Postgres real): a FK `resgates.endereco → pontos.endereco`
  // é verificada em CADA statement. Escrever `resgates.endereco = anon` antes de existir uma linha de
  // `pontos` com essa chave dá 23503 e reverte TUDO — a RPC «atómica» falhava sempre que o titular
  // tinha um resgate. A âncora tem de nascer PRIMEIRO.
  if (linhas.length > 0) await garantirAncoraPontos(supabase, anon);

  let n = 0;
  for (const linha of linhas) {
    const morada = (linha.morada && typeof linha.morada === "object" && !Array.isArray(linha.morada))
      ? Object.fromEntries(Object.keys(linha.morada).map((k) => [k, MORADA_DELETADA]))
      : MORADA_DELETADA;
    const { error: errUpd } = await supabase
      .from("resgates")
      .update({ endereco: anon, morada, atualizado_em: new Date().toISOString() })
      .eq("id", linha.id);
    if (errUpd) throw new Error(`update resgates id=${linha.id} (anon): ${errUpd.message}`);
    n += 1;
  }
  return n;
}

/**
 * R18-110j.1-4b — `pontos`: o CONTEÚDO (saldo + histórico) é apagado sempre; a LINHA só sobrevive
 * quando há resgate retido, e nesse caso fica vazia e pseudónima — é a âncora da FK
 * `resgates.endereco → pontos.endereco`.
 *
 * ⚠️ Se a anonimização dos resgates falhou (`nResgates < 0`), NÃO se toca em `pontos`: apagar a linha
 * com o endereço dispararia o `ON DELETE CASCADE` e levaria o registo que o operador mandou reter.
 * É um erro visível, não um dano silencioso.
 */
async function tratarPontos(supabase, endereco, anon, dryRun, nResgates) {
  if (nResgates < 0) {
    throw new Error("resgates não anonimizados — `pontos` NÃO foi apagado (o CASCADE levaria o registo retido)");
  }
  if (dryRun) {
    const { count, error } = await supabase
      .from("pontos").select("endereco", { count: "exact", head: true }).eq("endereco", endereco);
    if (error) throw new Error(`select pontos: ${error.message}`);
    return count ?? 0;
  }
  // O CONTEÚDO do titular sai sempre; se havia resgate, a âncora pseudónima (já criada em
  // `garantirAncoraPontos`) fica a sustentar a FK, e esta linha pode ser apagada sem CASCADE nenhum.
  const { data, error } = await supabase.from("pontos").delete().eq("endereco", endereco).select("endereco");
  if (error) throw new Error(`delete pontos: ${error.message}`);
  return Array.isArray(data) ? data.length : 0;
}

/**
 * Executa (ou simula) a exclusão no Supabase. Cada sub-operação é isolada: um erro
 * numa tabela não impede as outras — o erro entra em `erros` e o caller decide.
 * @returns {{ deletado: object, anonimizado: object, erros: string[], via: string }}
 */
export async function excluirSupabase(supabase, endereco, { dryRun = false } = {}) {
  const ender = normalizar(endereco);
  const anon = chaveAnonima(ender);
  const deletado = {};
  const anonimizado = {};
  const erros = [];

  // UTAC110j.1 — via ATÓMICA primeiro (uma transacção, se a migração estiver aplicada).
  try {
    const rpc = await excluirSupabaseViaRpc(supabase, ender, anon, dryRun);
    if (rpc) return rpc;
  } catch (err) {
    // A RPC existe e falhou: o Postgres reverteu TUDO. Não se cai em silêncio para a via não
    // atómica (era isso que deixaria o processo a meio); devolve-se o erro para o endpoint.
    return { deletado: {}, anonimizado: {}, erros: [`supabase:rpc: ${err.message}`], via: "rpc:falhou" };
  }

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

  // R18-110j.1-4b — ORDEM OBRIGATÓRIA: primeiro o resgate (é o filho e é o que fica), depois `pontos`.
  // `nResgates < 0` significa que a anonimização do resgate falhou; `tratarPontos` recusa apagar
  // `pontos` nesse caso (o CASCADE levaria o registo retido).
  let nResgates = 0;
  try {
    nResgates = await anonimizarResgates(supabase, ender, anon, dryRun);
    anonimizado["resgates"] = nResgates;
  } catch (err) {
    nResgates = -1;
    erros.push(`supabase:resgates (anon): ${err.message}`);
  }
  try { deletado["pontos"] = await tratarPontos(supabase, ender, anon, dryRun, nResgates); }
  catch (err) { erros.push(`supabase:pontos: ${err.message}`); }

  for (const { tabela, pk, opcional } of SUPA_ANON) {
    try { anonimizado[tabela] = await anonimizarFiscalSupabase(supabase, tabela, pk, ender, dryRun, { opcional }); }
    catch (err) { erros.push(`supabase:${tabela} (anon): ${err.message}`); }
  }
  // `passes` tem tratamento próprio (merge sob UNIQUE parcial, MC105a.1) — fica fora do ciclo.
  for (const tabela of SUPA_ANON_POR_ENDERECO.filter((t) => t !== "passes")) {
    try {
      if (tabela === "eco_quildo") anonimizado[tabela] = await anonimizarEcoQuildo(supabase, ender, anon, dryRun);
      else {
        anonimizado[tabela] = await anonimizarColunaEndereco(
          supabase, tabela, "purchase_token", ender, anon, dryRun, { atualizado_em: new Date().toISOString() },
        );
      }
    } catch (err) { erros.push(`supabase:${tabela} (anon): ${err.message}`); }
  }
  try { anonimizado["passes"] = await anonimizarPasses(supabase, ender, dryRun); }
  catch (err) { erros.push(`supabase:passes (anon): ${err.message}`); }

  return { deletado, anonimizado, erros, via: "legado" };
}

/**
 * UTAC110j.1 — ATOMICIDADE (Frente B). A migração `20261016_utac110j1_exclusao_conta_rpc.sql` cria
 * `public.excluir_conta_titular(p_endereco, p_anon, p_dry_run)`: TODAS as tabelas numa só transacção
 * (se uma falhar, nenhuma fica a meio; `SECURITY DEFINER` ⇒ não depende de GRANT de DELETE nas
 * tabelas criadas depois do MC105a). Só existe depois de o operador aplicar a migração — enquanto
 * não existir, devolve `null` e o caller usa a via tabela-a-tabela (fail-visível, em que uma falha
 * NÃO desfaz as outras: isso é declarado em `via`).
 */
async function excluirSupabaseViaRpc(supabase, endereco, anon, dryRun) {
  if (typeof supabase?.rpc !== "function") return null;
  const { data, error } = await supabase.rpc("excluir_conta_titular", {
    p_endereco: endereco, p_anon: anon, p_dry_run: dryRun,
  });
  if (error) {
    const codigo = String(error.code ?? "");
    const ausente = codigo === "42883" || codigo === "PGRST202"
      || /could not find the function|function .* does not exist/i.test(String(error.message ?? ""));
    if (ausente) {
      console.warn("[conta-delete] RPC excluir_conta_titular ausente — via tabela-a-tabela (NÃO atómica)");
      return null;
    }
    throw new Error(`rpc excluir_conta_titular: ${error.message}`);
  }
  const d = data ?? {};
  return { deletado: d.deletado ?? {}, anonimizado: d.anonimizado ?? {}, erros: [], via: "rpc" };
}

/** Anonimiza (retenção) as linhas de `tabela` com `endereco` = endereço: o registo fica, a pessoa sai. */
async function anonimizarColunaEndereco(supabase, tabela, pk, endereco, anon, dryRun, extra = {}) {
  if (dryRun) {
    const { count, error } = await supabase.from(tabela).select(pk, { count: "exact", head: true }).eq("endereco", endereco);
    if (error) throw new Error(`select ${tabela} (anon): ${error.message}`);
    return count ?? 0;
  }
  const { data, error } = await supabase.from(tabela).update({ endereco: anon, ...extra }).eq("endereco", endereco).select(pk);
  if (error) throw new Error(`update ${tabela} (anon): ${error.message}`);
  return Array.isArray(data) ? data.length : 0;
}

/**
 * UTAC110j.1 (R18-110j.1-1) — `eco_quildo` é um PASSIVO com lastro em R$ (Regulamento 5.0, arts.
 * 47º-51º): apagar a linha deixaria `eco_quildo_lastro` a declarar uma reserva que já não tem
 * contraparte. Fica o SALDO e o HISTÓRICO; sai o `endereco` (→ `anon:<sha256>`). A 2.ª exclusão do
 * MESMO endereço colide na PK (o pseudónimo já existe) ⇒ os saldos somam-se, os históricos juntam-se
 * e a linha com o endereço é removida: nunca fica uma linha com o endereço de quem pediu eliminação.
 */
async function anonimizarEcoQuildo(supabase, endereco, anon, dryRun) {
  const { data: origem, error: errSel } = await supabase.from("eco_quildo").select("saldo, historico").eq("endereco", endereco);
  if (errSel) throw new Error(`select eco_quildo: ${errSel.message}`);
  const linhas = Array.isArray(origem) ? origem : (origem ? [origem] : []);
  if (linhas.length === 0) return 0;
  if (dryRun) return linhas.length;

  const { data: destino, error: errDest } = await supabase.from("eco_quildo").select("saldo, historico").eq("endereco", anon);
  if (errDest) throw new Error(`select eco_quildo (anon): ${errDest.message}`);
  const ja = (Array.isArray(destino) ? destino : [])[0];

  if (!ja) {
    const { error } = await supabase.from("eco_quildo").update({ endereco: anon }).eq("endereco", endereco);
    if (error) throw new Error(`update eco_quildo (anon): ${error.message}`);
    return linhas.length;
  }
  const historico = [
    ...(Array.isArray(ja.historico) ? ja.historico : []),
    ...linhas.flatMap((l) => (Array.isArray(l.historico) ? l.historico : [])),
  ];
  const saldo = linhas.reduce((s, l) => s + Number(l.saldo ?? 0), Number(ja.saldo ?? 0));
  const { error: errMerge } = await supabase.from("eco_quildo").update({ saldo, historico }).eq("endereco", anon);
  if (errMerge) throw new Error(`update eco_quildo (merge): ${errMerge.message}`);
  const { error: errDel } = await supabase.from("eco_quildo").delete().eq("endereco", endereco);
  if (errDel) throw new Error(`delete eco_quildo (resíduo com endereço): ${errDel.message}`);
  return linhas.length;
}

// ── Blobs ────────────────────────────────────────────────────────────────────

function abrirStoreSeguro(getStore, nome) {
  try { return getStore({ name: nome, consistency: "strong" }); }
  catch (err) {
    // ⚠️ B2 (achado do validador, medido): devolver `null` aqui fazia CADA chamador traduzir a falha
    // num `0` de contagem — o manifesto ficava `ok:true`, `erros: []` e o endpoint respondia **200
    // sem ter apagado nada**. Um store indisponível é ERRO (fail-visível), não «store vazio».
    throw new Error(`store ${nome} indisponível: ${err?.message ?? err}`);
  }
}

/** Deleta o blob cuja chave é o próprio endereço. Devolve 1 se existia, 0 senão. */
async function apagarBlobPorChave(getStore, nome, endereco, dryRun) {
  const store = abrirStoreSeguro(getStore, nome);
  let existente = null;
  // B2 residual (2.ª ronda do validador): um `get` que falha NÃO pode ler-se como «não existe».
  try { existente = await store.get(endereco, { type: "json" }); }
  catch (err) { throw new Error(`get ${nome}:${endereco} falhou: ${err?.message}`); }
  if (existente == null) return 0;
  if (!dryRun) await store.delete(endereco);
  return 1;
}

/** Retorna as chaves de um store cujo payload referencia o endereço. */
async function chavesDoEndereco(store, endereco, { sufixoChave = false } = {}) {
  const alvo = [];
  let falhasLeitura = 0;
  let listagem;
  try { listagem = await store.list(); }
  catch (err) {
    // B2: uma listagem que falha não pode ler-se como «este titular não tem nada aqui».
    throw new Error(`list falhou: ${err?.message}`);
  }
  for (const { key } of listagem?.blobs ?? []) {
    if (sufixoChave && key.endsWith(":" + endereco)) { alvo.push(key); continue; }
    if (sufixoChave) continue;
    try {
      // B2 residual: a leitura por chave também conta — engolir isto escondia PII em disco.
      const obj = await store.get(key, { type: "json" });
      // MC104.2: `comprador` é o campo do dono nos pedidos (a mesma regra da exportação, MC104).
      const e = normalizar(obj?.endereco ?? obj?.address ?? obj?.comprador);
      if (e === endereco) alvo.push(key);
    } catch (err) {
      falhasLeitura += 1;
      console.warn(`[conta-delete] leitura de ${key} falhou:`, err?.message);
    }
  }
  if (falhasLeitura > 0) {
    throw new Error(`${falhasLeitura} chave(s) ilegível(is) — não se pode afirmar que o titular não tem dados aqui`);
  }
  return alvo;
}

/** Deleta blobs cujo payload referencia o endereço (chave arbitrária). */
async function apagarBlobPorValor(getStore, nome, endereco, dryRun) {
  const store = abrirStoreSeguro(getStore, nome);
  const chaves = await chavesDoEndereco(store, endereco);
  let falhas = 0;
  if (!dryRun) {
    for (const key of chaves) {
      try { await store.delete(key); } catch (err) { falhas += 1; console.warn(`[conta-delete] ${nome}:${key} não apagado:`, err?.message); }
    }
  }
  if (falhas > 0) throw new Error(`${falhas} chave(s) não apagada(s) em ${nome}`);
  return chaves.length;
}

/** consent-log: chaves no formato `<ts>:<endereco>`. */
async function apagarConsentLog(getStore, endereco, dryRun) {
  const store = abrirStoreSeguro(getStore, "consent-log");
  const chaves = await chavesDoEndereco(store, endereco, { sufixoChave: true });
  let falhas = 0;
  if (!dryRun) {
    for (const key of chaves) {
      try { await store.delete(key); } catch (err) { falhas += 1; console.warn(`[conta-delete] consent-log:${key} não apagado:`, err?.message); }
    }
  }
  if (falhas > 0) throw new Error(`${falhas} chave(s) de consent-log não apagada(s)`);
  return chaves.length;
}

/** Anonimiza (reter) blobs financeiros: payload.endereco → ENDERECO_ANONIMO. */
async function anonimizarBlob(getStore, nome, endereco, dryRun) {
  const store = abrirStoreSeguro(getStore, nome);
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
      // B2: a falha de QUALQUER store conta (antes só contava para `pedidos`/`pedido:`).
      falhas.push(`${key}:excepcao`);
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

// -- Indicações / referral (UTAC110j.1) --------------------------------------
// O ecrã de exclusão dizia que os «vínculos de indicação» eram eliminados — e o conta-delete NÃO
// tocava em nenhum dos 6 stores do `_lib/referral.mjs`. Esta é a correcção (R18-110j.1-3):
//   referral-codes    `referral-code:{end}` + `referral-code-reverso:{codigo}`  → APAGA (o código
//                     deixa de mapear para a pessoa; um código órfão não identifica ninguém)
//   referral-links    `referral:{codigo}:{end}` e `referral-convertido|fraud:{codigo}:{end}`
//                     → APAGA (o vínculo é do titular);
//                     `referral:{codigo}:{terceiro}` onde o titular é o INDICADOR → ANONIMIZA o
//                     campo `indicador` (o registo é do TERCEIRO: apagá-lo destruiria dados de
//                     outra pessoa; o endereço do titular sai)
//   referral-bonus    `referral-bonus:{end}`, `referral-monthly:{end}:{mes}`   → APAGA
//   referral-induzido `{end}:{dia}`                                            → APAGA
//   referral-log      `log:{dia}` com `eventos[].indicador|indicado`           → ANONIMIZA (retenção
//                     de auditoria, 13 meses — Marco Civil art. 15; o endereço sai, o evento fica)
//   referral-ip       `ip:{ipHash}:{hora}`                                     → NÃO TOCA: não tem
//                     endereço (só um hash de IP) e expira em 24 h (política de retenção §1).

/** APAGA as chaves de um store que são do titular (`:{end}` no fim) ou que começam por `{end}:`. */
async function apagarChavesDoTitular(getStore, nome, endereco, dryRun, modo = "sufixo") {
  const store = abrirStoreSeguro(getStore, nome);
  let listagem;
  try {
    listagem = modo === "prefixo"
      ? await store.list({ prefix: `${endereco}:` })
      : await store.list();
  } catch (err) {
    throw new Error(`[conta-delete] list ${nome} falhou:`, err?.message);
    
  }
  const alvo = (listagem?.blobs ?? []).map((b) => b.key)
    .filter((k) => (modo === "prefixo"
      ? k.startsWith(`${endereco}:`)
      // `referral-bonus:{end}` (sufixo), `referral-monthly:{end}:{mes}` (no meio) e `{end}` (chave nua)
      : (k === endereco || k.endsWith(`:${endereco}`) || k.includes(`:${endereco}:`))));
  let falhas = 0;
  if (!dryRun) {
    for (const k of alvo) {
      try { await store.delete(k); } catch (err) { falhas += 1; console.warn(`[conta-delete] ${nome}:${k} não apagado:`, err?.message); }
    }
  }
  // UTAC110j.1: falha por chave NÃO é silenciosa — sobe como erro do store (o endpoint responde 500 e a
  // exclusão pode ser repetida). Engolir isto deixaria PII em disco com o manifesto a dizer «verde».
  if (falhas > 0) throw new Error(`${falhas} chave(s) não apagada(s) em ${nome}`);
  return alvo.length;
}

/** referral-codes: apaga `referral-code:{end}` e o reverso `referral-code-reverso:{codigo}`. */
async function apagarCodigoIndicacao(getStore, endereco, dryRun) {
  const store = abrirStoreSeguro(getStore, "referral-codes");
  let reg = null;
  try { reg = await store.get(`referral-code:${endereco}`, { type: "json" }); }
  catch (err) { throw new Error(`get referral-code falhou: ${err?.message}`); }
  const chaves = [`referral-code:${endereco}`];
  if (reg?.codigo) chaves.push(`referral-code-reverso:${reg.codigo}`);
  let n = 0;
  for (const k of chaves) {
    let existe = null;
    try { existe = await store.get(k, { type: "json" }); }
    catch (err) { throw new Error(`get ${k} falhou: ${err?.message}`); }
    if (existe == null) continue;
    n += 1;
    if (!dryRun) {
      try { await store.delete(k); } catch (err) {
        throw new Error(`chave ${k} não apagada: ${err?.message}`);
      }
    }
  }
  return n;
}

/**
 * referral-links: apaga os vínculos do TITULAR (como indicado) e anonimiza o campo `indicador` nos
 * vínculos de TERCEIROS que ele indicou. Devolve `{ apagados, anonimizados }`.
 */
async function tratarVinculosIndicacao(getStore, endereco, anon, dryRun) {
  const store = abrirStoreSeguro(getStore, "referral-links");
  let listagem;
  try { listagem = await store.list(); } catch (err) {
    throw new Error(`list referral-links falhou: ${err?.message}`);
  }
  const chaves = (listagem?.blobs ?? []).map((b) => b.key);
  let apagados = 0;
  let anonimizados = 0;

  // (1) o titular como INDICADO — `referral:`, `referral-convertido:` e `referral-fraud:` (este
  // guarda o visitorId do dispositivo, que também é dele) terminam em `:{end}`.
  for (const key of chaves) {
    if (!key.endsWith(`:${endereco}`)) continue;
    apagados += 1;
    if (!dryRun) {
      try { await store.delete(key); } catch (err) {
        throw new Error(`vínculo ${key} não apagado: ${err?.message}`);
      }
    }
  }
  // (2) o titular como INDICADOR — o registo é do terceiro indicado: fica, sem o endereço dele.
  for (const key of chaves) {
    if (!key.startsWith("referral:")) continue;          // só vínculos (não convertido/fraude)
    if (key.endsWith(`:${endereco}`)) continue;           // já apagado em (1)
    let reg = null;
    try { reg = await store.get(key, { type: "json" }); }
    catch (err) { throw new Error(`get ${key} falhou: ${err?.message}`); }
    if (normalizar(reg?.indicador) !== endereco) continue;
    anonimizados += 1;
    if (!dryRun) {
      try { await store.setJSON(key, { ...reg, indicador: anon, anonimizadoEm: new Date().toISOString() }); }
      catch (err) { throw new Error(`vínculo ${key} não anonimizado: ${err?.message}`); }
    }
  }
  return { apagados, anonimizados };
}

/** referral-log (auditoria): troca o endereço do titular nos eventos por `anon:<sha256>`; o evento fica. */
async function anonimizarLogIndicacoes(getStore, endereco, anon, dryRun) {
  const store = abrirStoreSeguro(getStore, "referral-log");
  let listagem;
  try { listagem = await store.list(); } catch (err) {
    throw new Error(`list referral-log falhou: ${err?.message}`);
  }
  let n = 0;
  for (const { key } of listagem?.blobs ?? []) {
    let doc = null;
    try { doc = await store.get(key, { type: "json" }); }
    catch (err) { throw new Error(`get ${key} falhou: ${err?.message}`); }
    if (!Array.isArray(doc?.eventos)) continue;
    let mudou = false;
    const eventos = doc.eventos.map((ev) => {
      const out = { ...ev };
      for (const campo of ["indicado", "indicador"]) {
        if (out[campo] && normalizar(out[campo]) === endereco) { out[campo] = anon; mudou = true; }
      }
      return out;
    });
    if (!mudou) continue;
    n += 1;
    if (!dryRun) {
      try { await store.setJSON(key, { ...doc, eventos }); }
      catch (err) { throw new Error(`log ${key} não anonimizado: ${err?.message}`); }
    }
  }
  return n;
}

/**
 * UTAC110j.1 (achado do validador adversarial) — store Blob `auditoria`: cada criação/encerramento de
 * edição grava `{ acao, edicaoId, endereco, em, origem }` (ver `edicoes-core`). O `conta-delete` NUNCA
 * lhe tocou, e o ecrã já prometia «logs de auditoria … sem o seu endereço». Aqui o registo FICA
 * (retenção de auditoria, 13 meses) e o `endereco` passa a `anon:<sha256>` — mesmo tratamento do
 * `referral-log`.
 */
async function anonimizarAuditoria(getStore, endereco, anon, dryRun) {
  const store = abrirStoreSeguro(getStore, "auditoria");
  let listagem;
  try { listagem = await store.list(); } catch (err) {
    throw new Error(`list auditoria falhou: ${err?.message}`);
  }
  let n = 0;
  for (const { key } of listagem?.blobs ?? []) {
    let doc = null;
    try { doc = await store.get(key, { type: "json" }); }
    catch (err) { throw new Error(`get ${key} falhou: ${err?.message}`); }
    if (!doc || typeof doc !== "object") continue;
    // A entrada pode ser um objecto único ou uma lista de eventos.
    const alvos = Array.isArray(doc) ? doc : [doc];
    let mudou = false;
    const saida = alvos.map((ev) => {
      const out = { ...ev };
      for (const campo of ["endereco", "address", "comprador", "indicador", "indicado"]) {
        if (out[campo] && normalizar(out[campo]) === endereco) { out[campo] = anon; mudou = true; }
      }
      return out;
    });
    if (!mudou) continue;
    n += 1;
    if (!dryRun) {
      try { await store.setJSON(key, Array.isArray(doc) ? saida : saida[0]); }
      catch (err) { throw new Error(`auditoria ${key} não anonimizada: ${err?.message}`); }
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

  // UTAC110j.1 — indicações: o texto do ecrã prometia «vínculos de indicação» eliminados e o
  // backend não tocava neles. Cada store é fail-VISÍVEL: uma chave que não se apague/anonimize sobe
  // como erro (HTTP 500 + manifesto) — não se declara verde o que ficou por fazer.
  try { deletado["referral-codes"] = await apagarCodigoIndicacao(getStore, ender, dryRun); }
  catch (err) { erros.push(`blobs:referral-codes: ${err.message}`); }
  for (const nome of ["referral-bonus"]) {
    try { deletado[nome] = await apagarChavesDoTitular(getStore, nome, ender, dryRun); }
    catch (err) { erros.push(`blobs:${nome}: ${err.message}`); }
  }
  try { deletado["referral-induzido"] = await apagarChavesDoTitular(getStore, "referral-induzido", ender, dryRun, "prefixo"); }
  catch (err) { erros.push(`blobs:referral-induzido: ${err.message}`); }
  try {
    const v = await tratarVinculosIndicacao(getStore, ender, chaveAnonima(ender), dryRun);
    deletado["referral-links"] = v.apagados;
    anonimizado["referral-links:indicador"] = v.anonimizados;
  } catch (err) { erros.push(`blobs:referral-links: ${err.message}`); }
  try { anonimizado["referral-log"] = await anonimizarLogIndicacoes(getStore, ender, chaveAnonima(ender), dryRun); }
  catch (err) { erros.push(`blobs:referral-log (anon): ${err.message}`); }
  // UTAC110j.1 — store `auditoria` (criação/encerramento de edição): o endereço sai, o registo fica.
  try { anonimizado["auditoria"] = await anonimizarAuditoria(getStore, ender, chaveAnonima(ender), dryRun); }
  catch (err) { erros.push(`blobs:auditoria (anon): ${err.message}`); }

  return { deletado, anonimizado, pendente, erros };
}

// ── Orquestração ─────────────────────────────────────────────────────────────

/**
 * Exclui (ou simula) TODOS os dados de um endereço em Supabase + Blobs, anonimiza
 * os fiscais e devolve um manifesto único auditável.
 *
 * @param {{ supabase: object, getStore: Function, endereco: string, dryRun?: boolean }} args
 * @returns {Promise<{ endereco, anon, dryRun, via, executadoEm, supabase, blobs, retido, auditoria, erros, ok }>}
 */
export async function excluirConta({ supabase, getStore, endereco, dryRun = false }) {
  const ender = normalizar(endereco);
  const anon = chaveAnonima(ender);
  const supa = await excluirSupabase(supabase, ender, { dryRun });
  const blobs = await excluirBlobs(getStore, ender, { dryRun });
  const erros = [...supa.erros, ...blobs.erros];

  const manifesto = {
    endereco: ender,
    anon,
    dryRun,
    via: supa.via,
    // Achado da 3.ª ronda: na via legado cada tabela é uma operação — se uma falhar depois de outras
    // terem sido aplicadas, o titular fica a meio (fail-VISÍVEL, não silencioso). `atomico` diz isso
    // sem rodeios no manifesto: só a via RPC é uma transacção única.
    atomico: supa.via === "rpc",
    executadoEm: new Date().toISOString(),
    supabase: { via: supa.via, deletado: supa.deletado, anonimizado: supa.anonimizado },
    blobs: { deletado: blobs.deletado, anonimizado: blobs.anonimizado, pendente: blobs.pendente },
    retido: DADOS_RETIDOS,
    auditoria: false,
    erros,
    ok: erros.length === 0,
  };

  // UTAC110j.1 — registo de auditoria da exclusão (SEM os dados apagados): pseudónimo + CONTAGENS.
  // Dry-run não audita (nada foi apagado). Falha de auditoria não desfaz a exclusão, mas fica
  // DECLARADA no manifesto (`auditoria: false`) — não se declara verde o que não correu.
  if (!dryRun) manifesto.auditoria = await registarAuditoriaExclusao(getStore, manifesto);

  return manifesto;
}

/**
 * Grava UMA linha de auditoria por exclusão no store `audit-exclusao`: o pseudónimo (`anon:`) e as
 * contagens por tabela/store — nunca o endereço, nunca o conteúdo apagado, nunca PII. É isto que
 * permite provar depois «a conta X foi eliminada a D e o que foi apagado» sem reconstruir a pessoa.
 */
async function registarAuditoriaExclusao(getStore, manifesto) {
  try {
    const store = abrirStoreSeguro(getStore, "audit-exclusao");
    if (!store) return false;
    const chave = `exclusao:${manifesto.executadoEm}:${manifesto.anon.slice(5, 17)}`;
    await store.setJSON(chave, {
      em: manifesto.executadoEm,
      anon: manifesto.anon,
      via: manifesto.via,
      // B8 (achado do validador): o registo era escrito também quando a exclusão FALHOU, e lido como
      // «exclusão feita». Passa a trazer `ok` — cumprida vs incompleta.
      ok: manifesto.ok,
      deletado: { ...manifesto.supabase.deletado, ...manifesto.blobs.deletado },
      anonimizado: { ...manifesto.supabase.anonimizado, ...manifesto.blobs.anonimizado },
      erros: manifesto.erros.length,
    });
    return true;
  } catch (err) {
    console.warn("[conta-delete] auditoria da exclusão não gravada:", err?.message);
    return false;
  }
}
