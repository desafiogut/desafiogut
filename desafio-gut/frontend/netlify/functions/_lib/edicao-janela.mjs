// _lib/edicao-janela.mjs — MC94.1. A janela temporal de uma edição.
//
// PURO (sem Blobs, sem env): separado de edicoes-core.mjs para que os testes
// que fazem duplo do store continuem a correr a regra REAL — um duplo desta
// função esconderia exactamente o defeito que ela existe para impedir.
//
// Toda a decisão usa o relógio do SERVIDOR (MC93-D): o do dispositivo não é fonte.

// Edições especiais: id escolhido pelo operador (não sequencial), só existem com
// metadata persistido (não há sintética) e têm janela própria inicio_em..termino_em.
// Nascem por seed (scripts/mc941-seed-edicao-especial.mjs), não por criarEdicao.
export const EDICAO_ESPECIAL_RE = /^ESPECIAL-[A-Z0-9]+$/;

/** ms de um ISO, ou null se ausente/ilegível. */
export function msDe(iso) {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/** true quando a edição tem inicio_em e ele ainda não chegou. */
export function estaAgendada(meta, agoraMs = Date.now()) {
  const inicio = msDe(meta?.inicio_em);
  return inicio != null && agoraMs < inicio;
}

/**
 * Pode entrar um lance nesta edição agora? null = sim; { code, message } = não.
 * Sem inicio_em nem termino_em não há janela a impor.
 */
export function verificarJanelaLance(meta, agoraMs = Date.now()) {
  if (!meta) return null;
  if (estaAgendada(meta, agoraMs)) {
    return { code: "edicao_nao_iniciada", message: `a edição ${meta.id} abre em ${meta.inicio_em}` };
  }
  const termino = msDe(meta.termino_em);
  if (termino != null && agoraMs > termino) {
    return { code: "edicao_encerrada", message: `a edição ${meta.id} encerrou em ${meta.termino_em}` };
  }
  return null;
}
