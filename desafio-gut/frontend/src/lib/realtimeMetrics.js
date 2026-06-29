// realtimeMetrics — MC39.19 (Onda 4, item 32): observabilidade de canais Realtime.
//
// Contador leve de canais WebSocket ativos. Serve para detectar vazamento de
// canais (canal não removido no unmount) e para o monitoramento de conexões
// rumo a 10k usuários (item 36). Zero efeito colateral: só incrementa/decrementa
// um contador em memória e, em DEV, expõe um getter no window para inspeção.

let _ativos = 0;
let _picoSessao = 0;

export function canalAberto() {
  _ativos += 1;
  if (_ativos > _picoSessao) _picoSessao = _ativos;
  return _ativos;
}

export function canalFechado() {
  _ativos = Math.max(0, _ativos - 1);
  return _ativos;
}

export function canaisAtivos() {
  return _ativos;
}

export function picoCanais() {
  return _picoSessao;
}

// Em DEV, expõe para inspeção manual no console (window.__gutRealtime).
if (typeof window !== "undefined" && import.meta?.env?.DEV) {
  window.__gutRealtime = { canaisAtivos, picoCanais };
}
