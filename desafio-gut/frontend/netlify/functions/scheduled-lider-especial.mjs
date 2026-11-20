// scheduled-lider-especial.mjs — UTAC142 (Frente E, R18-142-E). De 5 em 5 minutos, para cada edição ESPECIAL-* aberta
// com `avisosLider` (Blob `edicoes-metadata`, omissão: ligado), o GUTO avisa quem passou a liderar, deixou de liderar
// ou voltou a liderar o menor lance único. Regras anti-oráculo e porquê: `_lib/lider-especial.mjs`.
//
// Estado por edição no Blob `especial-lider` (strong): { lider, jaLideraram[], avaliadoEm }. Os avisos vão para o
// mesmo Blob de notificações que o app já lê (`notificacoes-usuario.mjs`). FAIL-SOFT: uma falha numa edição não
// afecta as outras nem o lance (este cron só lê lances).
import { schedule } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { listarEdicoes, buscarEdicao } from "./_lib/edicoes-core.mjs";
import { EDICAO_ESPECIAL_RE, verificarJanelaLance } from "./_lib/edicao-janela.mjs";
import { configDaEspecial } from "./_lib/especial-config.mjs";
import { getLances } from "./_lib/data-store.mjs";
import { lerInventario } from "./_lib/passes-inventario.mjs";
import { adicionarNotificacao } from "./_lib/notificacoes-usuario.mjs";
import { avaliarLider, JANELA_AVISO_MS } from "./_lib/lider-especial.mjs";
import { mascararEndereco } from "./_lib/validate.mjs";
import { passesConsumidosNaEdicao } from "./_lib/passe-a-cada-lances.mjs"; // UTAC142.1 · UTAC145 (Postgres)

export const CRON = "*/5 * * * *";
export const STORE_LIDER = "especial-lider";

function abrirEstado() {
  try { return getStore({ name: STORE_LIDER, consistency: "strong" }); }
  catch (err) { console.warn("[scheduled-lider-especial] store indisponível:", err?.message); return null; }
}

/**
 * UTAC142.1 — portador de Passe = tem Passe no inventário AGORA, ou já gastou pelo menos um NESTA edição (o Passe
 * a cada N lances pode tê-lo deixado a 0). O lance já não exige Passe, logo licitar não basta. Fail-closed.
 *
 * UTAC142-SEG4 (validador) — leitura falhada (inventário OU contagem) é INDETERMINADO, não «não portador»: lança
 * `portador_indeterminado` e o `tick` salta a edição nessa janela (sem avisos, sem gravar estado). Antes devolvia
 * `false` e o líder ainda vencedor recebia «deixou de ser o menor único» e, na janela seguinte, «voltou».
 */
// UTAC145 — `contagem` é agora uma FUNÇÃO (edicaoId, endereco) → nº de Passes gastos, lida da tabela
// `especial_lances_passe` (era o Blob do UTAC142.1). Continua a lançar em falha ⇒ indeterminado (⚠️1 do validador).
export function predicadoPortador(edicaoId, { ler = lerInventario, contagem = null } = {}) {
  return async (e) => {
    if (contagem) {
      let gastos;
      try { gastos = Number(await contagem(edicaoId, e)) || 0; }
      catch { throw new Error("portador_indeterminado"); }
      if (gastos > 0) return true;
    }
    const inv = await ler(e).catch(() => null);
    if (!inv?.ok) throw new Error("portador_indeterminado");
    return (Number(inv.passesRelampago) || 0) + (Number(inv.passesProgramado) || 0) > 0;
  };
}

/** Um tick. Dependências injectáveis para teste. Nunca lança. */
export async function tick({
  agoraMs = Date.now(), listar = listarEdicoes, ler = buscarEdicao, lerLances = getLances,
  store = abrirEstado(), notificar = adicionarNotificacao, lerInv = lerInventario, contagem = passesConsumidosNaEdicao,
} = {}) {
  const relatorio = [];
  if (!store) return relatorio;
  let edicoes = [];
  try { edicoes = (await listar(agoraMs)) || []; } catch (err) { console.warn("[scheduled-lider-especial] listar falhou:", err?.message); return relatorio; }
  const janela = Math.floor(agoraMs / JANELA_AVISO_MS);
  for (const e of edicoes) {
    const id = e?.id;
    if (typeof id !== "string" || !EDICAO_ESPECIAL_RE.test(id)) continue;
    try {
      const meta = await ler(id);
      if (!meta || verificarJanelaLance(meta, agoraMs) || !configDaEspecial(meta).avisosLider) continue;
      const anterior = await store.get(id, { type: "json" });
      const { estado, avisos } = await avaliarLider({
        edicaoId: id, lances: await lerLances(id), estadoAnterior: anterior, ehPortador: predicadoPortador(id, { ler: lerInv, contagem }),
      });
      for (const a of avisos) {
        await notificar(a.endereco, { tipo: a.tipo, edicaoId: id, valor: null, mensagem: a.mensagem, ref: `janela:${janela}` });
      }
      await store.setJSON(id, { ...estado, avaliadoEm: new Date(agoraMs).toISOString() });
      relatorio.push({ id, avisos: avisos.map((a) => [a.tipo, mascararEndereco(a.endereco)]) });
    } catch (err) {
      console.error("[scheduled-lider-especial] edição falhou (não-fatal)", id, err?.message);
      relatorio.push({ id, erro: true });
    }
  }
  console.info("[scheduled-lider-especial]", JSON.stringify(relatorio));
  return relatorio;
}

export const handler = schedule(CRON, async () => { await tick(); return { statusCode: 200 }; });
