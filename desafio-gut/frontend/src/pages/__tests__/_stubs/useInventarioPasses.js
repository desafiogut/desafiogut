// _stubs/useInventarioPasses.js — UTAC130. Duplo do `useInventarioPasses` para o Dashboard.
//
// PORQUÊ: em SSR os efeitos NÃO correm, logo o hook real fica para sempre em `carregando: true` e o
// tile «Passe Desafio» (total do inventário, UTAC130) mostraria só o skeleton.
// ⚠️ Devolve a MESMA forma do real (`src/hooks/useInventarioPasses.js`): passesRelampago, passesProgramado,
// carregando, erro, recarregar. Por omissão: lido, 0/0, sem erro. `semPasses` = cópia literal do real
// (o real importa o AppContext e a API; aqui não se quer arrastar isso).
export function semPasses(inventario, campo) {
  return Boolean(inventario) && !inventario.carregando && !inventario.erro && inventario[campo] === 0;
}

const BASE = Object.freeze({ passesRelampago: 0, passesProgramado: 0, carregando: false, erro: "" });
let estado = { ...BASE };

/** Define o que o hook devolve no próximo render (por cima da forma lida 0/0). */
export function definirInventario(parcial = {}) {
  estado = { ...BASE, ...parcial };
}

export function useInventarioPasses() {
  return { ...estado, recarregar: async () => null };
}
