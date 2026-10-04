// _stubs-106e/useTrocarPorSenhas.js — UTAC106e. Duplo da fronteira de I/O do hook VIZINHO.
//
// O `useComprarPasse` reutiliza `getAuthToken` do `useTrocarPorSenhas` (é a cadeia de auth do ecrã:
// JWT `auth-lance` assinado pelo Privy). Aqui essa peça é substituída por um token fixo — o objecto
// em teste é o hook da COMPRA, não a assinatura. As restantes chaves mantêm a forma REAL do hook
// (`hooks/useTrocarPorSenhas.js:86`) para o duplo não ser mais permissivo do que o original.
export function useTrocarPorSenhas() {
  return {
    trocarPorSenhas: async () => null,
    carregando: false,
    erro: "",
    sucesso: "",
    getAuthToken: async () => "TOKEN-DE-TESTE-106e",
    setErro: () => {},
    setSucesso: () => {},
  };
}

export default { useTrocarPorSenhas };
