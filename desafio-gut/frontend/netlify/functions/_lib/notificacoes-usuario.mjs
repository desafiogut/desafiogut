// _lib/notificacoes-usuario.mjs — MC15.7 (GUTO para o Participante)
//
// Notificações PESSOAIS do participante, persistidas em Blob "notificacoes"
// (chave = endereço lowercase; valor = { notificacoes: [...] }, FIFO máx 50).
// Espelha o padrão fail-soft do _lib/log-operacional.mjs (MC15.6 ITEM 9).
//
// Tipos: "lance_unico" | "perdeu_exclusividade" | "voce_venceu" | "edicao_encerrada".
// Entrada: { id, timestamp(ISO), tipo, edicaoId, valor(centavos|null), mensagem, lida:false }.
//
// Regra oficial (Art. VIII / R7): reutiliza apurarMenorLanceUnico (simulador.mjs)
// para o resumo pós-edição. A deteção por-lance usa contagem de frequência do
// valor (leve), pois precisamos saber se UM valor específico é único.
//
// 100% fail-soft: nenhuma operação aqui pode quebrar um lance ou um encerramento.

import { getStore } from "@netlify/blobs";
import { apurarMenorLanceUnico, brlCentavos } from "./simulador.mjs";

const STORE_NOTIF = "notificacoes";
const BLOB_LANCES = "lances-relampago";
export const MAX_NOTIF = 50;

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[notificacoes-usuario] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

/** Chave de dedupe de uma notificação (tipo + edição + valor). */
function chaveDedupe(n) {
  return `${n.tipo}:${n.edicaoId ?? ""}:${n.valor ?? ""}`;
}

/** Lê as notificações do participante (mais recentes ao fim). Fail-soft → []. */
export async function lerNotificacoes(endereco) {
  const chave = String(endereco || "").toLowerCase();
  if (!chave) return [];
  const store = abrirStore(STORE_NOTIF);
  if (!store) return [];
  try {
    const doc = await store.get(chave, { type: "json" });
    return Array.isArray(doc?.notificacoes) ? doc.notificacoes : [];
  } catch (err) {
    console.warn("[notificacoes-usuario] leitura falhou:", err?.message);
    return [];
  }
}

/**
 * Adiciona uma notificação ao Blob do participante. FIFO (máx 50). Fail-soft.
 * Dedupe: ignora se já existe uma notificação NÃO-LIDA com a mesma chave
 * (tipo:edicaoId:valor) — evita spam no mesmo evento.
 * @returns {Promise<boolean>} true se gravou; false se no-op/erro.
 */
export async function adicionarNotificacao(endereco, notif) {
  const chave = String(endereco || "").toLowerCase();
  if (!chave || !notif?.tipo) return false;
  const store = abrirStore(STORE_NOTIF);
  if (!store) return false;
  try {
    const doc = (await store.get(chave, { type: "json" })) || { notificacoes: [] };
    const lista = Array.isArray(doc.notificacoes) ? doc.notificacoes : [];
    const dk = chaveDedupe(notif);
    if (lista.some((n) => !n.lida && chaveDedupe(n) === dk)) return false; // já pendente
    const entrada = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      lida: false,
      tipo: notif.tipo,
      edicaoId: notif.edicaoId ?? null,
      valor: Number.isInteger(notif.valor) ? notif.valor : null,
      mensagem: String(notif.mensagem || "").slice(0, 500),
    };
    lista.push(entrada);
    const podada = lista.slice(-MAX_NOTIF); // FIFO: mantém as 50 mais recentes
    await store.setJSON(chave, { notificacoes: podada, atualizadoEm: entrada.timestamp });
    return true;
  } catch (err) {
    console.warn("[notificacoes-usuario] adicionar falhou:", err?.message);
    return false;
  }
}

/** Marca TODAS as notificações do participante como lidas. Fail-soft. */
export async function marcarLidas(endereco) {
  const chave = String(endereco || "").toLowerCase();
  if (!chave) return false;
  const store = abrirStore(STORE_NOTIF);
  if (!store) return false;
  try {
    const doc = await store.get(chave, { type: "json" });
    if (!doc || !Array.isArray(doc.notificacoes)) return true; // nada a marcar
    let mudou = false;
    const agora = new Date().toISOString();
    for (const n of doc.notificacoes) {
      if (!n.lida) { n.lida = true; n.lidaEm = agora; mudou = true; }
    }
    if (mudou) await store.setJSON(chave, { ...doc, atualizadoEm: agora });
    return true;
  } catch (err) {
    console.warn("[notificacoes-usuario] marcarLidas falhou:", err?.message);
    return false;
  }
}

/**
 * FUNÇÃO PURA — deteta o evento de unicidade de um lance recém-inserido.
 * @param {Array} lances  todos os lances da edição (já INCLUI o novo)
 * @param {number} valorCentavos  valor do lance recém-inserido
 * @returns {{ count:number, unico:boolean, perdeuExclusividade:boolean, afetados:string[] }}
 *   - unico: o valor aparece exatamente 1 vez (o autor está único)
 *   - perdeuExclusividade: o valor aparece >= 2 vezes (todos com esse valor perdem)
 *   - afetados: endereços (lowercase, distintos) que têm esse valor
 */
export function detectarEventoUnicidade(lances, valorCentavos) {
  const lista = Array.isArray(lances) ? lances : [];
  let count = 0;
  const afetados = new Set();
  for (const l of lista) {
    if (Number(l?.valorCentavos) === valorCentavos) {
      count++;
      const a = String(l?.endereco || "").toLowerCase();
      if (a) afetados.add(a);
    }
  }
  return {
    count,
    unico: count === 1,
    perdeuExclusividade: count >= 2,
    afetados: [...afetados],
  };
}

/**
 * MC15.7 ITEM 1 — após persistir um lance, regista as notificações de unicidade.
 * - count === 1 → "lance_unico" para o autor (menciona se é o menor único/líder).
 * - count >= 2 → "perdeu_exclusividade" para TODOS os endereços com esse valor.
 * Fail-soft: nunca lança.
 */
export async function registrarEventosDeLance({ lances, valorCentavos, edicaoId, autorEndereco }) {
  try {
    const ev = detectarEventoUnicidade(lances, valorCentavos);
    const idEd = String(edicaoId || "");
    if (ev.unico) {
      const apur = apurarMenorLanceUnico(lances);
      const lider = apur.ok && apur.valorCentavos === valorCentavos;
      const msg = lider
        ? `Boa! 🎯 O teu lance de ${brlCentavos(valorCentavos)} é o menor único na edição ${idEd}. Estás a ganhar — se ninguém repetir, vences!`
        : `Boa! 🎯 O teu lance de ${brlCentavos(valorCentavos)} é único na edição ${idEd}.`;
      await adicionarNotificacao(autorEndereco, {
        tipo: "lance_unico", edicaoId: idEd, valor: valorCentavos, mensagem: msg,
      });
    } else if (ev.perdeuExclusividade) {
      for (const a of ev.afetados) {
        await adicionarNotificacao(a, {
          tipo: "perdeu_exclusividade", edicaoId: idEd, valor: valorCentavos,
          mensagem: `⚠️ O teu lance de ${brlCentavos(valorCentavos)} na edição ${idEd} deixou de ser único. Dá um novo lance para voltares à frente!`,
        });
      }
    }
  } catch (err) {
    console.warn("[notificacoes-usuario] registrarEventosDeLance falhou:", err?.message);
  }
}

/**
 * MC15.7 ITEM 2 — no encerramento, gera o resumo pós-edição para cada
 * participante: vencedor → "voce_venceu"; restantes → "edicao_encerrada"
 * (com o lance vencedor anónimo). Reutiliza apurarMenorLanceUnico (R7). Fail-soft.
 */
export async function gerarResumosPosEdicao(edicaoId) {
  try {
    const id = String(edicaoId || "");
    if (!id) return;
    const store = abrirStore(BLOB_LANCES);
    if (!store) return;
    let lances = [];
    try {
      const doc = await store.get(id, { type: "json" });
      lances = Array.isArray(doc?.lances) ? doc.lances : [];
    } catch (err) {
      console.warn("[notificacoes-usuario] leitura lances (resumo) falhou:", err?.message);
      return;
    }
    if (lances.length === 0) return;

    const apur = apurarMenorLanceUnico(lances);
    const participantes = new Set(
      lances.map((l) => String(l?.endereco || "").toLowerCase()).filter(Boolean),
    );
    const vencedor = apur.ok ? String(apur.vencedorEndereco || "").toLowerCase() : null;

    for (const endereco of participantes) {
      const numLances = lances.filter(
        (l) => String(l?.endereco || "").toLowerCase() === endereco,
      ).length;
      if (vencedor && endereco === vencedor) {
        await adicionarNotificacao(endereco, {
          tipo: "voce_venceu", edicaoId: id, valor: apur.valorCentavos,
          mensagem: `🏁🎉 A edição ${id} terminou e GANHASTE! O teu lance de ${brlCentavos(apur.valorCentavos)} foi o menor único. Parabéns! Em breve recebes as instruções.`,
        });
      } else {
        const msg = apur.ok
          ? `🏁 A edição ${id} terminou. O lance vencedor foi ${brlCentavos(apur.valorCentavos)}. Não foi desta — deste ${numLances} lance(s). Tenta na próxima! 🚀`
          : `🏁 A edição ${id} terminou sem lances únicos. Não houve vencedor desta vez.`;
        await adicionarNotificacao(endereco, {
          tipo: "edicao_encerrada", edicaoId: id, valor: apur.ok ? apur.valorCentavos : null,
          mensagem: msg,
        });
      }
    }
  } catch (err) {
    console.warn("[notificacoes-usuario] gerarResumosPosEdicao falhou:", err?.message);
  }
}
