// _lib/passe-pontos.mjs — UTAC106d-v2. Pontos de fidelidade (NORTE Via B).
//
// Store: Supabase `public.pontos` — 1 linha por ENDEREÇO (acumulado + histórico JSONB).
// Regra (Via B): 1 Passe = 1 ponto · 50 pontos = 1 cartão colecionável físico.
//
// ⚠️ ADITIVO. NÃO toca no modelo Via A (`_lib/passe.mjs`, `comprar-passe.mjs`, `public.passes`).
//    São conceitos distintos que partilham o nome "Passe": o Via A é 1 Passe = 1 palpite = 1
//    produto (edição Programada + cupons); este é acumulação de PONTOS por endereço.
//
// Padrões herdados POR LEITURA (não cópia cega) de ficheiros existentes:
//   - normalização do endereço para minúsculas ......... `_lib/passe.mjs:15,21` (`normalizar`)
//   - escrita devolve `{ok:false, code}` (nunca excepção no caminho de escrita) ... `_lib/passe.mjs:37,43`
//   - leitura devolve `null` para chave inválida e LANÇA em erro do Supabase ... `_lib/passe.mjs:22,25`
//   - Compare-And-Swap (lê → grava só se o valor não mudou) ... `_lib/saldoRs.mjs:57-66` (`casSaldo`)
//   - timestamps ISO8601 ............... `_lib/saldoRs.mjs:60` (`new Date().toISOString()`)
//   - idempotência pela chave natural / 23505 devolve o existente ... `_lib/passe.mjs:40-47`
//   - sem dados pessoais em logs (P10): só códigos de erro.

import { getSupabase } from "./supabase-client.mjs";
// UTAC106f — a mesma regex de id de edição do resto do backend (uma só fonte de verdade).
import { EDICAO_ID_RE } from "./edicoes-core.mjs";

// ── Constantes de negócio (a REGRA vive aqui, nunca como número mágico no endpoint) ──
export const PONTOS_POR_PASSE = 1;
export const PONTOS_POR_CARTAO = 50;
export const VALOR_PASSE_RS = 2.00;
// Derivado — uma só fonte de verdade (o débito do saldo trabalha em CENTAVOS inteiros, saldoRs.mjs:8).
export const VALOR_PASSE_CENTAVOS = Math.round(VALOR_PASSE_RS * 100);

// Tipos de movimento do histórico. "palpite" (bónus +2) é do UTAC106f; "resgate" (cartão) é do UTAC106g.
export const TIPO_COMPRA = "compra";
export const TIPO_PALPITE = "palpite";
export const TIPO_RESGATE = "resgate";
const TIPOS_VALIDOS = Object.freeze([TIPO_COMPRA, TIPO_PALPITE, TIPO_RESGATE]);

const TABELA = "pontos";
const ENDERECO_RE = /^0x[0-9a-f]{40}$/;
const UNIQUE_VIOLATION = "23505";
const MAX_TENTATIVAS = 5;
const REF_MAX = 200;

const normalizar = (e) => String(e ?? "").toLowerCase();
const enderecoValido = (e) => ENDERECO_RE.test(e);

/** Valida os argumentos comuns de crédito/débito. Devolve `{ok:false, code}` ou `null` se válidos. */
function validarArgs(endereco, quantidade, tipo, ref) {
  if (!enderecoValido(normalizar(endereco))) return { ok: false, code: "ENDERECO_INVALIDO" };
  if (!Number.isInteger(quantidade) || quantidade <= 0) return { ok: false, code: "QUANTIDADE_INVALIDA" };
  if (!TIPOS_VALIDOS.includes(tipo)) return { ok: false, code: "TIPO_INVALIDO" };
  if (typeof ref !== "string" || ref.length === 0 || ref.length > REF_MAX) return { ok: false, code: "REF_INVALIDA" };
  return null;
}

/**
 * Lê o registo de pontos do endereço.
 * @returns {Promise<{endereco,pontos,historico,atualizado_em}|null>} — `null` se o endereço é
 *   inválido OU não existe; **lança** em erro do Supabase (o chamador decide o status HTTP).
 */
export async function lerPontos(endereco) {
  const e = normalizar(endereco);
  if (!enderecoValido(e)) return null;
  const { data, error } = await getSupabase().from(TABELA).select("*").eq("endereco", e).maybeSingle();
  if (error) throw new Error(`[passe-pontos] lerPontos falhou: ${error.code ?? error.message}`);
  return data ?? null;
}

/** Devolve só o número de pontos (0 se o endereço não existe). Lança em erro do Supabase. */
export async function getPontos(endereco) {
  const r = await lerPontos(endereco);
  return Number(r?.pontos ?? 0);
}

/** Há pontos suficientes para 1 cartão? (`pontos >= PONTOS_POR_CARTAO`)
 *
 * ⚠️ UTAC106f (achado ⚠️ R1 do validador adversarial, decisão do operador = opção A): **NÃO usar esta
 * função para decidir o cartão.** Ela compara o TOTAL — e o bónus de palpite (`tipo:"palpite"`) entra
 * nesse total, o que fazia `48 pontos de compra + 2 de bónus = 50` DESBLOQUEAR o cartão. Isso contradiz
 * o requisito declarado «o palpite NÃO decide o cartão» (crítico Google Play). Quem decide o cartão é
 * `podeResgatarCartaoComCompra()`, abaixo. Esta função fica À VISTA (nada foi apagado), sem uso.
 */
export async function podeResgatarCartao(endereco) {
  return (await getPontos(endereco)) >= PONTOS_POR_CARTAO;
}

/**
 * Aplica um movimento ao histórico com CAS (lê → grava só se `pontos` não mudou entretanto).
 * `delta` positivo = crédito; negativo = débito. Nunca deixa `pontos < 0`.
 * Idempotente por `ref`: se já existe uma entrada com a mesma `ref`, não repete (criado:false).
 * @returns {Promise<{ok:true,criado:boolean,pontos:number,historico:Array}|{ok:false,code:string}>}
 */
async function aplicarMovimento(endereco, delta, tipo, ref) {
  const e = normalizar(endereco);
  const supabase = getSupabase();

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    let atual;
    try {
      atual = await lerPontos(e);
    } catch {
      return { ok: false, code: "ERRO_DB" };
    }

    // Idempotência: a mesma `ref` já creditada/debitada → devolve o estado, sem repetir.
    if (atual && Array.isArray(atual.historico) && atual.historico.some((h) => h?.ref === ref)) {
      return { ok: true, criado: false, pontos: Number(atual.pontos), historico: atual.historico };
    }

    const base = Number(atual?.pontos ?? 0);
    const novoPontos = base + delta; // delta negativo não pode furar o 0 (ver guarda abaixo)
    if (novoPontos < 0) {
      return { ok: false, code: "PONTOS_INSUFICIENTES", pontos: base };
    }
    const entrada = { data: new Date().toISOString(), tipo, pontos: delta, ref };
    const historico = [...(atual?.historico ?? []), entrada];
    const payload = { endereco: e, pontos: novoPontos, historico, atualizado_em: new Date().toISOString() };

    let data, error;
    if (atual == null) {
      // Primeira linha deste endereço: INSERT. Corrida (23505) → relê e repete.
      ({ data, error } = await supabase.from(TABELA).insert(payload).select("endereco"));
      if (error && error.code === UNIQUE_VIOLATION) continue;
    } else {
      // CAS: só grava se `pontos` ainda for o valor lido (fecha o lost-update de créditos concorrentes).
      ({ data, error } = await supabase.from(TABELA)
        .update(payload).eq("endereco", e).eq("pontos", base).select("endereco"));
      if (!error && Array.isArray(data) && data.length === 0) continue; // CAS perdeu → relê
    }
    if (error) return { ok: false, code: "ERRO_DB" };
    return { ok: true, criado: true, pontos: novoPontos, historico };
  }
  return { ok: false, code: "CONFLITO_CONCORRENCIA" };
}

/**
 * Credita pontos + entrada no histórico. Idempotente por `ref`.
 * @returns {Promise<{ok:true,criado:boolean,pontos:number,historico:Array}|{ok:false,code:string}>}
 */
export async function creditarPontos(endereco, quantidade, tipo, ref) {
  const invalido = validarArgs(endereco, quantidade, tipo, ref);
  if (invalido) return invalido;
  return aplicarMovimento(endereco, quantidade, tipo, ref);
}

/**
 * Debita pontos + entrada no histórico. Falha com `PONTOS_INSUFICIENTES` se não chega
 * (nunca deixa saldo negativo). Idempotente por `ref`.
 * @returns {Promise<{ok:true,criado:boolean,pontos:number,historico:Array}|{ok:false,code:string}>}
 */
export async function debitarPontos(endereco, quantidade, tipo, ref) {
  const invalido = validarArgs(endereco, quantidade, tipo, ref);
  if (invalido) return invalido;
  return aplicarMovimento(endereco, -quantidade, tipo, ref);
}

// ══════════════════════════════════════════════════════════════════════════════════════
// UTAC106f — PALPITE (bónus +2 pontos). ADITIVO: NADA acima desta linha foi alterado.
//
// Regra do operador: o palpite é sobre o Nº TOTAL DE LANCES de uma edição Programada; 1 palpite
// por endereço e edição; apura-se quando a edição fecha; o MAIS PRÓXIMO do valor real recebe
// `PONTOS_POR_PALPITE_CERTO` pontos; sem acertadores, ninguém recebe. **O palpite NÃO decide o
// cartão** — o cartão é SÓ por pontos de compra (50). Store: `public.palpites` (UTAC106f).
// ══════════════════════════════════════════════════════════════════════════════════════

/** Bónus por ser o mais próximo do número real de lances. */
export const PONTOS_POR_PALPITE_CERTO = 2;

const TABELA_PALPITES = "palpites";
const FK_VIOLATION = "23503";

/** `ref` do crédito do bónus: UMA por edição ⇒ re-apurar NÃO credita duas vezes (idempotência por `ref`). */
export const refBonusPalpite = (edicaoId) => `palpite-certo:${edicaoId}`;

const edicaoValida = (id) => typeof id === "string" && EDICAO_ID_RE.test(id);

/** Lê o palpite do endereço numa edição (ou `null`). Lança em erro do Supabase. */
export async function lerPalpite(endereco, edicaoId) {
  const e = normalizar(endereco);
  if (!enderecoValido(e) || !edicaoValida(edicaoId)) return null;
  const { data, error } = await getSupabase().from(TABELA_PALPITES).select("*")
    .eq("endereco", e).eq("edicao_id", edicaoId).maybeSingle();
  if (error) throw new Error(`[passe-pontos] lerPalpite falhou: ${error.code ?? error.message}`);
  return data ?? null;
}

/** Lista os palpites do endereço (mais recentes primeiro). Lança em erro do Supabase. */
export async function lerPalpites(endereco) {
  const e = normalizar(endereco);
  if (!enderecoValido(e)) return [];
  const { data, error } = await getSupabase().from(TABELA_PALPITES).select("*")
    .eq("endereco", e).order("criado_em", { ascending: false });
  if (error) throw new Error(`[passe-pontos] lerPalpites falhou: ${error.code ?? error.message}`);
  return Array.isArray(data) ? data : [];
}

/**
 * Regista o palpite (nº de lances previstos) de um endereço numa edição.
 * Idempotente por (endereco, edicao_id): a 2.ª tentativa devolve o existente (`criado:false`).
 * @returns {Promise<{ok:true,criado:boolean,palpite:object}|{ok:false,code:string}>}
 */
export async function registarPalpite(endereco, edicaoId, valor) {
  const e = normalizar(endereco);
  if (!enderecoValido(e)) return { ok: false, code: "ENDERECO_INVALIDO" };
  if (!edicaoValida(edicaoId)) return { ok: false, code: "EDICAO_INVALIDA" };
  if (!Number.isInteger(valor) || valor < 0) return { ok: false, code: "VALOR_INVALIDO" };

  const { data, error } = await getSupabase().from(TABELA_PALPITES)
    .insert({ endereco: e, edicao_id: edicaoId, valor }).select("*").maybeSingle();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      const existente = await lerPalpite(e, edicaoId);
      return existente ? { ok: true, criado: false, palpite: existente } : { ok: false, code: "ERRO_DB" };
    }
    // FK para public.pontos: sem Passe comprado não há linha de pontos ⇒ não pode palpitar.
    if (error.code === FK_VIOLATION) return { ok: false, code: "SEM_PASSE" };
    return { ok: false, code: "ERRO_DB" };
  }
  return { ok: true, criado: true, palpite: data };
}

/**
 * Apura os palpites AINDA POR APURAR de uma edição contra o número REAL de lances.
 * Vence o MAIS PRÓXIMO; empate → o mais antigo (`criado_em`, depois `id`). O vencedor fica
 * `mais_proximo` e recebe `PONTOS_POR_PALPITE_CERTO` pontos com a ref `palpite-certo:<edicaoId>`
 * (re-apurar é idempotente). Sem palpites por apurar → `vencedor:null` e ninguém é creditado.
 * @returns {Promise<{ok:true,total:number,vencedor:object|null,pontosCreditados:number}|{ok:false,code:string}>}
 */
export async function apurarPalpite(edicaoId, valorReal) {
  if (!edicaoValida(edicaoId)) return { ok: false, code: "EDICAO_INVALIDA" };
  if (!Number.isInteger(valorReal) || valorReal < 0) return { ok: false, code: "VALOR_INVALIDO" };

  const supabase = getSupabase();
  const { data, error } = await supabase.from(TABELA_PALPITES).select("*")
    .eq("edicao_id", edicaoId).eq("apurado", false)
    .order("criado_em", { ascending: true }).order("id", { ascending: true });
  if (error) return { ok: false, code: "ERRO_DB" };
  const porApurar = Array.isArray(data) ? data : [];
  if (porApurar.length === 0) return { ok: true, total: 0, vencedor: null, pontosCreditados: 0 };

  let vencedor = porApurar[0];
  for (const p of porApurar) {
    if (Math.abs(p.valor - valorReal) < Math.abs(vencedor.valor - valorReal)) vencedor = p;
  }

  // Crédito PRIMEIRO, com ref idempotente: se a marcação falhar, repetir o apuramento não paga 2×.
  const credito = await creditarPontos(
    vencedor.endereco, PONTOS_POR_PALPITE_CERTO, TIPO_PALPITE, refBonusPalpite(edicaoId),
  );
  if (!credito.ok) return { ok: false, code: credito.code };

  const perdedores = porApurar.filter((p) => p.id !== vencedor.id).map((p) => p.id);
  if (perdedores.length > 0) {
    const { error: e1 } = await supabase.from(TABELA_PALPITES)
      .update({ apurado: true, resultado: "perdeu" }).in("id", perdedores);
    if (e1) return { ok: false, code: "ERRO_DB" };
  }
  const { error: e2 } = await supabase.from(TABELA_PALPITES)
    .update({ apurado: true, resultado: "mais_proximo" }).eq("id", vencedor.id);
  if (e2) return { ok: false, code: "ERRO_DB" };

  return {
    ok: true,
    total: porApurar.length,
    vencedor: { endereco: vencedor.endereco, valor: vencedor.valor },
    pontosCreditados: PONTOS_POR_PALPITE_CERTO,
  };
}

// ══════════════════════════════════════════════════════════════════════════════════════
// UTAC106f — CORRECÇÃO R1 (achado ⚠️ do validador, decisão do operador = OPÇÃO A).
//
// O CARTÃO CONTA SÓ PONTOS DE COMPRA. O bónus do palpite é PRESTÍGIO: soma no `pontos` total e aparece
// no histórico, mas **não** conta para o limiar do cartão. Medido antes da correcção: 48 de compra + 2
// de bónus = 50 desbloqueava o cartão — o palpite «decidia» o cartão, contra o requisito crítico
// (Google Play). `resgate` subtrai (gastar pontos de compra), `palpite` é ignorado.
// ══════════════════════════════════════════════════════════════════════════════════════

/** Tipos de movimento que CONTAM para o cartão. `palpite` NÃO está aqui, de propósito. */
export const TIPOS_QUE_CONTAM_PARA_CARTAO = Object.freeze([TIPO_COMPRA, TIPO_RESGATE]);

/**
 * Soma dos movimentos que contam para o CARTÃO (compra soma, resgate subtrai; palpite ignorado).
 * Recebe o registo já lido (`lerPontos`) — é pura sobre ele, não vai à rede.
 */
export function pontosDeCompra(registo) {
  const hist = Array.isArray(registo?.historico) ? registo.historico : [];
  return hist.reduce(
    (soma, h) => (TIPOS_QUE_CONTAM_PARA_CARTAO.includes(h?.tipo) ? soma + Number(h?.pontos ?? 0) : soma),
    0,
  );
}

/** O endereço pode resgatar o cartão? SÓ com pontos de COMPRA (o bónus de palpite não conta). */
export async function podeResgatarCartaoComCompra(endereco) {
  return pontosDeCompra(await lerPontos(endereco)) >= PONTOS_POR_CARTAO;
}
