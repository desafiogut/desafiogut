// Ordenação dos alertas da Visão Geral — lógica pura, sem React.
//
// MC89.44 (S2). Vive num ficheiro próprio por uma razão prática: não há runner
// de React neste projeto, e uma regra que decide o que o administrador lê
// PRIMEIRO não pode ficar sem teste. Aqui testa-se com `node:test`.

/**
 * Peso de urgência. Um nível desconhecido cai para o FIM (3) em vez de rebentar
 * ou de subir ao topo — um alerta que ninguém sabe classificar não pode empurrar
 * para baixo um que se sabe ser crítico.
 */
export const URGENCIA = { critical: 0, warning: 1, info: 2 };
const PESO_DESCONHECIDO = 3;

export function pesoUrgencia(nivel) {
  return URGENCIA[nivel] ?? PESO_DESCONHECIDO;
}

/**
 * Ordena alertas por urgência, do mais grave para o menos.
 *
 * ⚠️ PORQUE É QUE ISTO EXISTE: até ao MC89.44 não havia ordenação nenhuma. Os
 * alertas do backend vinham por ordem de CONSTRUÇÃO (`_lib/admin-alertas.mjs`
 * emite fila → webhook → rag → blobs → cache, com um `info` a meio), e a esses
 * juntavam-se no fim os do frontend — que é onde vive o único `critical` do
 * painel: a EOA coordenadora sem gás. O alerta que diz que as compras deixaram
 * de ser creditadas era o ÚLTIMO da lista.
 *
 * Não altera a lista recebida, e o `sort` de JS é estável: dentro do mesmo
 * nível a ordem de origem mantém-se, por isso o backend continua a decidir a
 * ordem entre iguais.
 */
export function ordenarAlertas(lista) {
  return [...(lista || [])].sort((a, b) => pesoUrgencia(a?.nivel) - pesoUrgencia(b?.nivel));
}
