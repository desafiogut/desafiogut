// MC17.1 ITEM 1 — Hook reutilizável de compra de senhas (cotas) on-chain.
//
// Extrai a lógica que vivia inline em MinhaCarteira.jsx (getComprarAuthToken +
// trocarPorSenhas) para um hook partilhável, sem alterar o comportamento do
// fluxo do utilizador comum (R2). Reutiliza o backend genérico já validado:
//   auth-lance (JWT lance-auth, assinatura EIP-191) -> comprar-senhas
//     (debita saldo-rs R$ 2,00/senha -> creditarSenhas on-chain, com reembolso).
//
// Consumido por:
//   - src/pages/MinhaCarteira.jsx     (utilizador comum — referência)
//   - src/pages/CorporativoCarteira.jsx (utilizador corporativo — MC17.1)
//
// API: { trocarPorSenhas, carregando, erro, sucesso, getAuthToken,
//        setErro, setSucesso }

import { useRef, useState, useCallback } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { getSignerFromProvider } from "../utils/web3.js";
import { apiPost } from "../lib/api.js";

const SUCESSO_LIMPAR_MS = 5000;

export function useTrocarPorSenhas() {
  const { address, privyWallet, refetchSaldo, refetchSaldoRs } = useAppContext();

  // Token JWT de auth (cached 10min). Abre popup Privy só quando expirado.
  const authRef = useRef({ token: null, expiresAt: 0 });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro]             = useState("");
  const [sucesso, setSucesso]       = useState("");

  const getAuthToken = useCallback(async () => {
    const now = Date.now();
    if (authRef.current.token && authRef.current.expiresAt > now + 60_000) {
      return authRef.current.token;
    }
    if (!privyWallet) throw new Error("Carteira não conectada. Faça login novamente.");
    const ts      = Date.now();
    const message = `DESAFIOGUT-AUTH:${ts}:${address}`;
    await privyWallet.switchChain(11155111);
    const provider = await privyWallet.getEthereumProvider();
    const { signer } = await getSignerFromProvider(provider);
    const signature = await signer.signMessage(message);
    const { ok, data } = await apiPost("auth-lance", { endereco: address, signature, message });
    if (!ok) throw new Error(data?.error?.message || "Falha ao autenticar.");
    authRef.current = { token: data.token, expiresAt: now + (data.ttl || 600) * 1000 };
    return data.token;
  }, [address, privyWallet]);

  const trocarPorSenhas = useCallback(async (qtd = 1) => {
    if (!address || carregando) return { ok: false, code: "indisponivel" };
    setErro("");
    setSucesso("");
    setCarregando(true);
    try {
      const authToken = await getAuthToken();
      const { ok, status, data } = await apiPost("comprar-senhas", { endereco: address, qtd }, { token: authToken });
      if (!ok) {
        // 401 invalida o cache do token para forçar nova assinatura.
        if (status === 401) authRef.current = { token: null, expiresAt: 0 };
        const msg = data?.error?.message || `HTTP ${status}`;
        setErro(msg);
        return { ok: false, code: data?.error?.code, message: msg };
      }
      setSucesso(`✓ ${qtd} ${qtd === 1 ? "senha creditada" : "senhas creditadas"} on-chain`);
      try { refetchSaldoRs?.(); } catch {}
      try { refetchSaldo?.(); } catch {}
      setTimeout(() => setSucesso(""), SUCESSO_LIMPAR_MS);
      return { ok: true, data };
    } catch (err) {
      setErro(err?.message || "Falha na troca");
      return { ok: false, message: err?.message };
    } finally {
      setCarregando(false);
    }
  }, [address, carregando, getAuthToken, refetchSaldo, refetchSaldoRs]);

  return { trocarPorSenhas, carregando, erro, sucesso, getAuthToken, setErro, setSucesso };
}

export default useTrocarPorSenhas;
