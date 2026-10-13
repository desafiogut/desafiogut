// _stubs-110d/useTrocarPorSenhas.js — UTAC110d-front. Duplo do hook da Via A para o CardLance REAL.
// O CardLance faz `import useTrocarPorSenhas from …` (DEFAULT = a função) — por isso este duplo
// exporta a função como default, ao contrário do `_stubs-106e` (pensado para outro import).
// No Relâmpago a conversão R$ → senha nunca corre; se correr, falha alto.
export function useTrocarPorSenhas() {
  return {
    trocarPorSenhas: async () => { throw new Error("duplo: a conversão R$ → senha não devia correr neste teste"); },
    carregando: false, erro: "", sucesso: "",
    getAuthToken: async () => "TOKEN-DE-TESTE-110d",
    setErro: () => {}, setSucesso: () => {},
  };
}
export default useTrocarPorSenhas;
