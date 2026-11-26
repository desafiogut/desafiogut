// UTAC140 (Frente D) — lógica PURA do Top 10 completo (sem React: testável com node --test).

/**
 * PURO — o que mostrar a partir da resposta do endpoint. `null` = não mostrar nada.
 * @param {{ok?:boolean, data?:any}|null} resp
 * @returns {{top10:object[], vencedor:object|null, produto:string|null}|null}
 */
export function decidirTop10Passe(resp) {
  const d = resp?.ok ? resp.data : null;
  if (!d || typeof d !== "object" || d.pronto !== true || d.valoresRestritos !== false) return null;
  if (!Array.isArray(d.top10) || d.top10.length === 0) return null;
  return { top10: d.top10, vencedor: d.vencedor ?? null, produto: typeof d.produto === "string" ? d.produto : null };
}


// UTAC140-SEG4 (validador) — a especial cujo Top 10 completo Meus Ativos pede. NÃO é a do `escolherEspecial`
// (essa prefere a que ainda não acabou): com a seguinte já gravada (agendada), a regra do Início trocava para ela
// e a tabela da que acabou desaparecia dentro da janela de 24 h. Aqui: a ENCERRADA mais recente ainda retida.
import { ehEspecial, ehEspecialProgramada, estadoEspecial, dentroDaRetencao, ESTADO_ESPECIAL } from "../edicao-especial/_estilo-especial.js";

/** PURO — a última especial encerrada dentro da retenção, ou null. */
export function escolherEspecialTop10(edicoes, agendadas, agoraMs) {
  const porId = new Map();
  for (const mapa of [edicoes, agendadas]) {
    for (const e of Object.values(mapa || {})) {
      // UTAC149 — o Top 10 é da especial Relâmpago (menor lance único); a especial Programada (palpite) não tem.
      if (e && ehEspecial(e.id) && !ehEspecialProgramada(e) && estadoEspecial(e, agoraMs) === ESTADO_ESPECIAL.ENCERRADA
          && dentroDaRetencao(e, agoraMs)) porId.set(e.id, e);
    }
  }
  const fim = (e) => { const ms = Date.parse(e.termino_em); return Number.isFinite(ms) ? ms : -Infinity; };
  return [...porId.values()].sort((a, b) => fim(b) - fim(a))[0] ?? null;
}
