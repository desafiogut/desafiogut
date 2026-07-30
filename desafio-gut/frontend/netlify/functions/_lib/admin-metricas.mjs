// _lib/admin-metricas.mjs — MC89.1 (Fase 1 do plano do MC89)
//
// Agregação das métricas de leitura do painel ADM. É a FONTE ÚNICA de cada
// número: o endpoint `admin-stats` e (no MC90) os intents de leitura do GUTO
// chamam esta mesma função. Dois sítios a contar a mesma coisa de maneiras
// diferentes foi o defeito que o MC88.43 gastou um MC inteiro a eliminar.
//
// ⚠️ NÃO IMPORTA `ethers`, nem direta nem indiretamente. Medido no MC88.31:
// `_lib/signer` arrasta ethers e custa ~2 s de cold start. O que precisa de RPC
// vive em `admin-onchain.mjs`, à parte, para não arrastar o painel todo.
//
// HONESTIDADE DOS NÚMEROS (RNF-06 do MC89): uma fonte que falha entra em
// `parciais[]` pelo nome e o campo fica `null`. Nunca um zero — zero é uma
// afirmação sobre o mundo, e "não consegui ler" não é zero.
//
// LIMITE CONHECIDO, assumido: a contagem de utilizadores distintos é feita em
// memória, sobre as linhas lidas. Hoje são ~30 no total. Deixa de servir na
// ordem dos milhares de linhas — nessa altura passa a ser uma view ou um RPC no
// Postgres. Está aqui escrito para que a decisão seja tomada com o número à
// frente, e não por surpresa.

import { getSupabaseReadOnly } from "./supabase-client.mjs";
import { resolverCoordenacao } from "./admin-helpers.mjs";

const DIAS_JANELA = 30;
const RPC_TIMEOUT_MS = 6000;

/** Soma um campo numérico guardado dentro do payload jsonb, ignorando lixo. */
function somar(linhas, extrair) {
  let total = 0;
  for (const l of linhas || []) {
    const n = Number(extrair(l));
    if (Number.isFinite(n)) total += n;
  }
  return total;
}

/** Normaliza um endereço para comparação; devolve null se não parecer um. */
function normalizarEndereco(valor) {
  const s = String(valor || "").trim().toLowerCase();
  return /^0x[0-9a-f]{40}$/.test(s) ? s : null;
}

/**
 * Endereço de uma cota. `cliente_id` primeiro porque é a chave real e é onde o
 * endereço está; `endereco` fica como segunda tentativa para o dia em que a
 * coluna passe a ser preenchida. Devolve o `cnpj:…` como não-endereço, e é assim
 * que as 2 cotas sem carteira ficam de fora sem desaparecerem da contagem total.
 */
function enderecoDaCota(cota) {
  return normalizarEndereco(cota?.cliente_id) || normalizarEndereco(cota?.endereco);
}

// ── Saldo da EOA coordenadora ───────────────────────────────────────────────
//
// MC89.2 — vive AQUI, e não dentro de `admin-onchain.mjs`, porque agora tem dois
// consumidores: o endpoint e o intent do GUTO. Uma fonte por número (a regra do
// MC89) só vale se for cumprida quando aparece o segundo consumidor.
//
// ⚠️ `obterMetricas()` NÃO a chama. É por isso que o `admin-stats` continua sem
// tocar na rede: importar este módulo não executa RPC nenhum.

/** Uma chamada JSON-RPC crua, com timeout. Sem ethers — é só um POST. */
async function rpc(url, method, params = []) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), RPC_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: ctrl.signal,
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    if (json?.error) throw new Error(json.error?.message || "erro rpc");
    return json?.result ?? null;
  } finally {
    clearTimeout(t);
  }
}

/** Wei (hex) → ETH em string, por BigInt: `Number` não representa 10^18 exato. */
export function weiParaEth(hex) {
  const wei = BigInt(hex);
  const inteiro = wei / 10n ** 18n;
  const resto   = wei % 10n ** 18n;
  return `${inteiro}.${resto.toString().padStart(18, "0").slice(0, 6)}`;
}

/**
 * Saldo em ETH da EOA coordenadora + bloco atual.
 *
 * Devolve `{ eoa, saldoEth, bloco, parciais }`. `saldoEth: null` significa
 * "não consegui ler" e NUNCA deve ser mostrado como 0: um zero aqui quer dizer
 * "a carteira que credita as senhas secou" e mandaria alguém abastecer uma
 * carteira cheia.
 *
 * @throws se RPC_URL não estiver no ambiente — o caller decide o que dizer.
 */
export async function obterSaldoEoa() {
  const url = process.env.RPC_URL;
  if (!url) {
    const err = new Error("RPC_URL ausente no ambiente");
    err.code = "rpc_nao_configurado";
    throw err;
  }
  const eoa = resolverCoordenacao();
  const parciais = [];
  let saldoEth = null;
  let bloco = null;

  try {
    const hex = await rpc(url, "eth_getBalance", [eoa, "latest"]);
    saldoEth = hex ? weiParaEth(hex) : null;
  } catch (err) {
    console.warn("[admin-metricas] eth_getBalance falhou:", err?.message);
    parciais.push("saldo");
  }
  try {
    const hex = await rpc(url, "eth_blockNumber");
    bloco = hex ? Number(BigInt(hex)) : null;
  } catch (err) {
    console.warn("[admin-metricas] eth_blockNumber falhou:", err?.message);
    parciais.push("bloco");
  }

  return { eoa, saldoEth, bloco, parciais };
}

/**
 * Métricas de leitura do painel ADM.
 *
 * Cada bloco é lido de forma independente e um erro num deles NÃO derruba os
 * outros: o bloco fica `null` e o seu nome entra em `parciais`.
 *
 * @returns {Promise<{
 *   utilizadores: { comAtividade: number, fontes: object }|null,
 *   financeiro:   { saldoTotalCentavos: number, creditadoCentavos: number,
 *                   creditos: number, creditosJanela: number }|null,
 *   cotas:        { total: number, vendidas: number, comCarteira: number }|null,
 *   operacao:     { fila: object }|null,
 *   janelaDias: number, geradoEm: string, parciais: string[]
 * }>}
 */
export async function obterMetricas() {
  const parciais = [];
  const sb = getSupabaseReadOnly(); // réplica de leitura quando existir; senão o primário
  const desde = new Date(Date.now() - DIAS_JANELA * 24 * 60 * 60 * 1000).toISOString();

  // Uma leitura por tabela, em paralelo. `allSettled` porque o objetivo é
  // degradar por bloco — não falhar o painel inteiro por causa de uma tabela.
  const [rCotas, rSaldo, rCreditos, rLances, rFila] = await Promise.allSettled([
    // ⚠️ MC89.2 — `cliente_id` é a CHAVE e é onde o endereço vive. A coluna
    // `endereco` existe e está SEMPRE NULA (verificado: 0 de 7 preenchidas).
    // Ler `endereco` dava "0 cotas com carteira" e deixava as cotas fora da
    // contagem de utilizadores — o painel dizia 5 quando são 7.
    // `cliente_id` guarda `0x…` para quem tem carteira e `cnpj:…` para quem foi
    // registado só por CNPJ (2 dos 7); `normalizarEndereco` separa os dois.
    sb.from("cotas").select("cliente_id, endereco, vendida"),
    sb.from("saldo_rs").select("cliente_id, payload"),
    sb.from("saldo_rs_creditos").select("payload, criado_em"),
    sb.from("lances").select("endereco"),
    sb.from("fila_tarefas").select("status, atualizado_em"),
  ]);

  // `allSettled` resolve mesmo quando o PostgREST devolve `{ error }` no corpo —
  // por isso a verificação tem de olhar para os dois: a promessa E o error.
  const dados = (r, nome) => {
    if (r.status !== "fulfilled" || r.value?.error) {
      const motivo = r.status === "rejected" ? r.reason?.message : r.value?.error?.message;
      console.warn(`[admin-metricas] ${nome} falhou:`, motivo);
      parciais.push(nome);
      return null;
    }
    return r.value.data || [];
  };

  const cotas    = dados(rCotas,    "cotas");
  const saldo    = dados(rSaldo,    "saldo_rs");
  const creditos = dados(rCreditos, "saldo_rs_creditos");
  const lances   = dados(rLances,   "lances");
  const fila     = dados(rFila,     "fila_tarefas");

  // ── Utilizadores ──────────────────────────────────────────────────────────
  // "COM ATIVIDADE", não "registados" — decisão D1 do MC89. A identidade vive
  // no Privy e o backend só conhece quem já apareceu nos dados. Quem se
  // registou e nunca fez nada NÃO está aqui, e o rótulo no ecrã tem de o dizer.
  let utilizadores = null;
  if (cotas || saldo || creditos || lances) {
    const enderecos = new Set();
    const conta = (lista, extrair) => {
      let n = 0;
      for (const l of lista || []) {
        const e = normalizarEndereco(extrair(l));
        if (e) { enderecos.add(e); n++; }
      }
      return n;
    };
    const fontes = {
      cotas:    cotas    ? conta(cotas,    (c) => enderecoDaCota(c))      : null,
      saldo:    saldo    ? conta(saldo,    (s) => s.cliente_id)           : null,
      creditos: creditos ? conta(creditos, (c) => c.payload?.endereco)    : null,
      lances:   lances   ? conta(lances,   (l) => l.endereco)             : null,
    };
    utilizadores = { comAtividade: enderecos.size, fontes };
  }

  // ── Financeiro ────────────────────────────────────────────────────────────
  let financeiro = null;
  if (saldo || creditos) {
    financeiro = {
      saldoTotalCentavos: saldo ? somar(saldo, (s) => s.payload?.centavos) : null,
      creditadoCentavos:  creditos ? somar(creditos, (c) => c.payload?.valorCentavos) : null,
      creditos:           creditos ? creditos.length : null,
      creditosJanela:     creditos
        ? creditos.filter((c) => c.criado_em && c.criado_em >= desde).length
        : null,
    };
  }

  // ── Cotas ─────────────────────────────────────────────────────────────────
  // `comCarteira` não é decoração: as cotas registadas só por CNPJ não têm
  // endereço, logo são indetectáveis por carteira em QUALQUER consulta. Ver o
  // registo do MC88.19. Expor a diferença evita que alguém a redescubra como bug.
  let cotasBloco = null;
  if (cotas) {
    cotasBloco = {
      total:       cotas.length,
      vendidas:    cotas.filter((c) => c.vendida === true).length,
      comCarteira: cotas.filter((c) => enderecoDaCota(c)).length,
    };
  }

  // ── Operação ──────────────────────────────────────────────────────────────
  let operacao = null;
  if (fila) {
    const porEstado = {};
    let ultimo = null;
    for (const t of fila) {
      const s = String(t.status || "desconhecido");
      porEstado[s] = (porEstado[s] || 0) + 1;
      if (t.atualizado_em && (!ultimo || t.atualizado_em > ultimo)) ultimo = t.atualizado_em;
    }
    operacao = {
      fila: {
        total:      fila.length,
        porEstado,
        pendentes:  porEstado.pending || 0,
        falhadas:   porEstado.failed  || porEstado.falha || 0,
        atualizadaEm: ultimo,
      },
    };
  }

  return {
    utilizadores,
    financeiro,
    cotas: cotasBloco,
    operacao,
    janelaDias: DIAS_JANELA,
    geradoEm: new Date().toISOString(),
    parciais,
  };
}
