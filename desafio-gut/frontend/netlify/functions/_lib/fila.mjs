// _lib/fila.mjs — MC39.20 (Onda 7): fila de tarefas durável em Postgres.
//
// Producer: enfileirar(tipo, payload). Consumer: processarLote(handlers, limite),
// chamado por um scheduled function (fila-processor-scheduled.mjs) ou pg_cron.
// O claim atômico (SKIP LOCKED) vive na RPC `reservar_tarefas` (migração 20260629_fila_tarefas).
//
// INERTE até a migração ser aplicada: se a tabela/RPC não existirem, processarLote
// devolve { inerte: true } sem erro (zero regressão). Nenhum fluxo síncrono atual é
// reescrito — produtores adotam a fila sob demanda.

import { getSupabase } from "./supabase-client.mjs";

const T_FILA = "fila_tarefas";

function pareceTabelaAusente(msg) {
  return /does not exist|relation .* does not exist|could not find the function|schema cache/i.test(String(msg || ""));
}

/**
 * Enfileira uma tarefa. @returns {Promise<string|null>} id da tarefa.
 * @param {string} tipo
 * @param {object} payload
 * @param {{agendadoPara?:string, maxTentativas?:number}} opts
 */
export async function enfileirar(tipo, payload = {}, { agendadoPara = null, maxTentativas = 5 } = {}) {
  if (!tipo || typeof tipo !== "string") throw new Error("[fila] tipo obrigatório");
  const row = { tipo, payload: payload ?? {}, max_tentativas: maxTentativas };
  if (agendadoPara) row.agendado_para = agendadoPara;
  const { data, error } = await getSupabase().from(T_FILA).insert(row).select("id").single();
  if (error) throw new Error(`[fila] enfileirar falhou: ${error.message}`);
  return data?.id ?? null;
}

/**
 * Reserva e processa um lote. Para cada tarefa, chama handlers[tipo](payload, tarefa).
 * Sucesso → status 'done'; erro → 'failed' com backoff exponencial (DLQ ao atingir
 * max_tentativas). Inerte se a migração não foi aplicada.
 *
 * @param {Record<string, (payload:object, tarefa:object)=>Promise<void>>} handlers
 * @param {number} limite
 * @returns {Promise<{ok:boolean, inerte?:boolean, processadas?:number, done?:number, falhas?:number, erro?:string}>}
 */
export async function processarLote(handlers = {}, limite = 10) {
  const sb = getSupabase();

  let reservadas;
  try {
    const { data, error } = await sb.rpc("reservar_tarefas", { p_limite: limite });
    if (error) {
      if (pareceTabelaAusente(error.message)) return { ok: true, inerte: true, processadas: 0 };
      return { ok: false, erro: error.message };
    }
    reservadas = Array.isArray(data) ? data : [];
  } catch (err) {
    if (pareceTabelaAusente(err?.message)) return { ok: true, inerte: true, processadas: 0 };
    return { ok: false, erro: err?.message };
  }

  let done = 0, falhas = 0;
  for (const tarefa of reservadas) {
    const handler = handlers[tarefa.tipo];
    try {
      if (typeof handler !== "function") throw new Error(`sem handler para tipo "${tarefa.tipo}"`);
      await handler(tarefa.payload, tarefa);
      await sb.from(T_FILA).update({ status: "done", atualizado_em: new Date().toISOString() }).eq("id", tarefa.id);
      done++;
    } catch (err) {
      // Backoff exponencial (30s, 60s, 120s, … até 1h). Ao atingir max_tentativas, a
      // RPC deixa de reservar → DLQ (fica em 'failed').
      const backoffSeg = Math.min(3600, Math.pow(2, Math.max(0, tarefa.tentativas - 1)) * 30);
      const proximo = new Date(Date.now() + backoffSeg * 1000).toISOString();
      await sb.from(T_FILA).update({
        status: "failed",
        ultimo_erro: String(err?.message || err).slice(0, 500),
        agendado_para: proximo,
        atualizado_em: new Date().toISOString(),
      }).eq("id", tarefa.id);
      falhas++;
    }
  }
  return { ok: true, processadas: reservadas.length, done, falhas };
}
