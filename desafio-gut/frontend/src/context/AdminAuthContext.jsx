// AdminAuthContext — sessão admin partilhada pelas telas de /admin.
//
// MC89.6 (Fase 0). Com rotas aninhadas (D-NAV), as sete telas deixam de viver
// dentro de um componente e passam a precisar da MESMA sessão. Este contexto é a
// casca de React à volta de `lib/adminAuth.js` — toda a lógica que pode partir
// está lá, pura e testada; aqui fica apenas o que é mesmo React: um ciclo de
// vida, um temporizador e um re-render.
//
// ⚠️ O access token NÃO passa por aqui. `sessaoRef.current` é o objeto da
// closure; este ficheiro nunca lê o token, nunca o guarda em estado e nunca o
// põe num log. Só sabe se ele existe.

import { createContext, useContext, useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useAppContext } from "./AppContext.jsx";
import { useAdmin } from "../hooks/useAdmin.js";
import { getSignerFromProvider } from "../utils/web3.js";
import {
  criarSessaoAdmin, sessaoValidaPara, limparTokenLegado,
  INTERVALO_REFRESH_MS, ESTADOS,
} from "../lib/adminAuth.js";

const AdminAuthContext = createContext(null);

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth precisa de estar dentro de <AdminAuthProvider>");
  return ctx;
}

function obterStorage() {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage; } catch { return null; }
}

export function AdminAuthProvider({ children }) {
  const { address, privyWallet, isConnected } = useAppContext();
  const { isAdmin, loading: aVerificarAdmin } = useAdmin(address);

  const [authState, setAuthState] = useState(ESTADOS.SEM_LOGIN);
  const [authError, setAuthError] = useState("");
  const sessaoRef = useRef(null);

  // A sessão é criada UMA vez. `aoMudarEstado` é o único canal entre o módulo
  // puro e o React — e é por isso que o módulo não precisa de saber que existe
  // um React do outro lado.
  if (sessaoRef.current === null && typeof window !== "undefined") {
    sessaoRef.current = criarSessaoAdmin({
      fetch: window.fetch.bind(window),
      storage: obterStorage(),
      aoMudarEstado: (estado, erro) => { setAuthState(estado); setAuthError(erro); },
    });
  }

  // Limpa a chave legada do MC1 na primeira montagem (one-shot).
  useEffect(() => { limparTokenLegado(obterStorage()); }, []);

  // ── Arranque: retomar a sessão guardada, se for DESTE endereço ─────────────
  useEffect(() => {
    const sessao = sessaoRef.current;
    if (!sessao) return;
    if (!isConnected || !isAdmin) { setAuthState(ESTADOS.SEM_LOGIN); return; }
    if (!sessaoValidaPara(obterStorage(), address)) {
      // Sessão de outra carteira (ou expirada): não a usar em nome desta.
      setAuthState(ESTADOS.SEM_LOGIN);
      return;
    }
    sessao.renovar();
  }, [address, isConnected, isAdmin]);

  // ── Renovação periódica ───────────────────────────────────────────────────
  useEffect(() => {
    if (authState !== ESTADOS.AUTENTICADO) return;
    const id = setInterval(() => { sessaoRef.current?.renovar(); }, INTERVALO_REFRESH_MS);
    return () => clearInterval(id);
  }, [authState]);

  // ── Login: a assinatura EIP-191 é INJETADA na sessão ─────────────────────
  // É aqui, e só aqui, que Privy e ethers entram. O módulo puro recebe uma
  // função `(mensagem) => Promise<assinatura>` e não sabe de onde vem.
  const login = useCallback(async (adminTokenLegado) => {
    const sessao = sessaoRef.current;
    if (!sessao) return false;
    if (!privyWallet || !address) {
      setAuthState(ESTADOS.ERRO);
      setAuthError("Carteira Privy ausente — reconecte e tente novamente.");
      return false;
    }
    return sessao.entrar({
      endereco: address,
      adminToken: adminTokenLegado,
      assinar: async (mensagem) => {
        const provider = await privyWallet.getEthereumProvider();
        const { signer } = await getSignerFromProvider(provider);
        return signer.signMessage(mensagem);
      },
    });
  }, [privyWallet, address]);

  const logout = useCallback(async () => { await sessaoRef.current?.sair(); }, []);

  // Identidade ESTÁVEL: a função nunca muda, portanto não invalida os
  // `useEffect` das telas que a têm nas dependências. Um `chamarAdmin` que muda
  // de identidade a cada render põe cada tela a recarregar em ciclo — foi o que
  // o MC44 corrigiu noutro domínio (AppTimerContext).
  const chamarAdmin = useCallback(
    (url, init) => sessaoRef.current.chamarAdmin(url, init), []);

  // Durante a renovação a credencial ainda é válida: cortar as chamadas aqui
  // faria as telas piscarem "autentique-se" a cada 12 minutos.
  const autenticado = authState === ESTADOS.AUTENTICADO || authState === ESTADOS.A_RENOVAR;

  const valor = useMemo(() => ({
    authState,
    authError,
    autenticado,
    /** `null` quando não há sessão — as telas testam isto antes de chamar. */
    chamarAdmin: autenticado ? chamarAdmin : null,
    login,
    logout,
    endereco: address,
    isAdmin,
    aVerificarAdmin,
    isConnected,
  }), [authState, authError, autenticado, chamarAdmin, login, logout, address, isAdmin, aVerificarAdmin, isConnected]);

  return <AdminAuthContext.Provider value={valor}>{children}</AdminAuthContext.Provider>;
}
