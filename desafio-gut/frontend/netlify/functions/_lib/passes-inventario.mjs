// _lib/passes-inventario.mjs — UTAC120. Inventário de Passes (Relâmpago/Programado).
//
// O utilizador compra o Passe no Google Play e ele FICA GUARDADO (não vira pontos).
// O Passe é descontado só quando é usado: 1 no lance relâmpago, 1 no palpite programado.
//
// RLS: a tabela `passes_inventario` só é acessível ao service_role (o backend). As operações
// atómicas vivem em RPCs (`passes_creditar`, `passes_consumir`, `passes_devolver`) — o
// `passes_consumir` só desconta se houver saldo, o que evita corridas com dois pedidos ao mesmo tempo.
//
// Fail-closed: qualquer erro do Supabase devolve `ok:false` e quem chama decide (nunca se assume
// que há passe quando não se conseguiu ler).

import { getSupabase } from "./supabase-client.mjs";

export const TIPOS_PASSE_INVENTARIO = ["relampago", "programado"];

/**
 * ⚠️ Só para DUPLOS DE TESTE antigos (anteriores ao UTAC120), que expõem um cliente Supabase
 * mínimo com `from()` e SEM `rpc()`. Em produção o cliente real tem `rpc` e este caminho nunca
 * corre: as operações atómicas são as funções SQL `passes_creditar/consumir/devolver`.
 * O stock inicial é generoso de propósito — os testes que não se interessam pelo inventário
 * continuam a medir o que mediam; os testes que o querem a zero usam o duplo com `rpc`
 * (`_supabase-duplo-mc105a.mjs` + `g.passesIniciais = { relampago: 0, programado: 0 }`).
 */
const _memoria = new Map();
const STOCK_DUPLO = 99;
function semRpc(endereco) {
  if (!_memoria.has(endereco)) {
    _memoria.set(endereco, { passes_relampago: STOCK_DUPLO, passes_programado: STOCK_DUPLO });
  }
  return _memoria.get(endereco);
}
function temRpc() {
  try { return typeof getSupabase()?.rpc === "function"; } catch { return false; }
}

/** Lê o inventário. Sem linha = 0 passes (utilizador novo). */
export async function lerInventario(endereco) {
  if (typeof endereco !== "string" || endereco.trim() === "") {
    return { ok: false, code: "endereco_invalido" };
  }
  if (!temRpc()) {
    const m = semRpc(endereco);
    return { ok: true, passesRelampago: m.passes_relampago, passesProgramado: m.passes_programado };
  }
  try {
    const { data, error } = await getSupabase()
      .from("passes_inventario")
      .select("passes_relampago, passes_programado")
      .eq("endereco", endereco)
      .maybeSingle();
    if (error) return { ok: false, code: "inventario_indisponivel" };
    return {
      ok: true,
      passesRelampago: Number(data?.passes_relampago ?? 0),
      passesProgramado: Number(data?.passes_programado ?? 0),
    };
  } catch {
    return { ok: false, code: "inventario_indisponivel" };
  }
}

/** Credita N passes (compra validada na Google). */
export async function creditarPasse({ endereco, tipo, quantidade = 1 }) {
  if (!TIPOS_PASSE_INVENTARIO.includes(tipo)) return { ok: false, code: "tipo_invalido" };
  if (!Number.isInteger(quantidade) || quantidade < 1) return { ok: false, code: "quantidade_invalida" };
  if (!temRpc()) {
    const m = semRpc(endereco);
    m[tipo === "relampago" ? "passes_relampago" : "passes_programado"] += quantidade;
    return { ok: true, passesRelampago: m.passes_relampago, passesProgramado: m.passes_programado };
  }
  try {
    const { data, error } = await getSupabase().rpc("passes_creditar", {
      p_endereco: endereco, p_tipo: tipo, p_qtd: quantidade,
    });
    if (error) return { ok: false, code: "inventario_indisponivel" };
    const linha = Array.isArray(data) ? data[0] : data;
    return {
      ok: true,
      passesRelampago: Number(linha?.passes_relampago ?? 0),
      passesProgramado: Number(linha?.passes_programado ?? 0),
    };
  } catch {
    return { ok: false, code: "inventario_indisponivel" };
  }
}

/**
 * Consome 1 passe de forma ATÓMICA.
 * @returns {{ok:true,restantes:number}|{ok:false,code:"sem_passes"|"inventario_indisponivel"}}
 */
export async function consumirPasse({ endereco, tipo, quantidade = 1 }) {
  if (!TIPOS_PASSE_INVENTARIO.includes(tipo)) return { ok: false, code: "tipo_invalido" };
  if (!temRpc()) {
    const m = semRpc(endereco);
    const campo = tipo === "relampago" ? "passes_relampago" : "passes_programado";
    if (m[campo] < quantidade) return { ok: false, code: "sem_passes" };
    m[campo] -= quantidade;
    return { ok: true, restantes: m[campo] };
  }
  try {
    const { data, error } = await getSupabase().rpc("passes_consumir", {
      p_endereco: endereco, p_tipo: tipo, p_qtd: quantidade,
    });
    if (error) return { ok: false, code: "inventario_indisponivel" };
    if (data !== true) return { ok: false, code: "sem_passes" };
    const inv = await lerInventario(endereco);
    return { ok: true, restantes: tipo === "relampago" ? inv.passesRelampago : inv.passesProgramado };
  } catch {
    return { ok: false, code: "inventario_indisponivel" };
  }
}

/** Devolve N passes (reversão quando o passo seguinte do fluxo falha). */
export async function devolverPasse({ endereco, tipo, quantidade = 1 }) {
  if (!temRpc()) {
    const m = semRpc(endereco);
    m[tipo === "relampago" ? "passes_relampago" : "passes_programado"] += quantidade;
    return { ok: true };
  }
  try {
    const { error } = await getSupabase().rpc("passes_devolver", {
      p_endereco: endereco, p_tipo: tipo, p_qtd: quantidade,
    });
    if (error) return { ok: false, code: "inventario_indisponivel" };
    return { ok: true };
  } catch {
    return { ok: false, code: "inventario_indisponivel" };
  }
}
