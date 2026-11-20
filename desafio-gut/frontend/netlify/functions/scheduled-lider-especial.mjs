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
import { passesConsumidosNaEdicao, STORE_CONTAGEM } from "./_lib/passe-a-cada-lances.mjs"; // UTAC142.1

export const CRON = "*/5 * * * *";
export const STORE_LIDER = "especial-lider";

function abrirEstado() {
  try { return getStore({ name: STORE_LIDER, consistency: "strong" }); }
  catch (err) { console.warn("[scheduled-lider-especial] store indisponível:", err?.message); return null; }
}

function abrirContagem() {
  try { return getStore({ name: STORE_CONTAGEM, consistency: "strong" }); } catch { return null; }
}

/**
 * UTAC142.1 — portador de Passe = tem Passe no inventário AGORA, ou já gastou pelo menos um NESTA edição (o Passe
 * a cada N lances pode tê-lo deixado a 0). O lance já não exige Passe, logo licitar não basta. Fail-closed.
 */
export function predicadoPortador(edicaoId, { ler = lerInventario, contagem = null } = {}) {
  return async (e) => {
    if (contagem && (await passesConsumidosNaEdicao(contagem, edicaoId, e)) > 0) return true;
    const inv = await ler(e).catch(() => ({ ok: false }));
    return !!inv?.ok && (Number(inv.passesRelampago) + Number(inv.passesProgramado)) > 0;
  };
}

/** Um tick. Dependências injectáveis para teste. Nunca lança. */
export async function tick({
  agoraMs = Date.now(), listar = listarEdicoes, ler = buscarEdicao, lerLances = getLances,
  store = abrirEstado(), notificar = adicionarNotificacao, lerInv = lerInventario, contagem = abrirContagem(),
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
