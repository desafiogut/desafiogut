import { useState, useEffect, useCallback } from "react";

// Mesmo RPC do useBlockchain — Alchemy Sepolia com fallback público
const SEPOLIA_RPC =
  import.meta.env.VITE_RPC_URL_SEPOLIA ??
  "https://eth-sepolia.g.alchemy.com/v2/demo";

const CHECK_MS   = 30_000;
const TIMEOUT_MS = 5_000;

/**
 * Monitora conectividade do browser e saúde do RPC Sepolia/Alchemy.
 * Verifica a cada 30s; re-verifica imediatamente ao voltar online.
 *
 * isSepoliaOk: null = verificando, true = OK, false = falhou
 */
export function useNetworkStatus() {
  const [isOnline,    setIsOnline]    = useState(navigator.onLine);
  const [isSepoliaOk, setIsSepoliaOk] = useState(null);
  const [networkError, setNetworkError] = useState(null);

  useEffect(() => {
    const onOnline  = () => { setIsOnline(true);  setNetworkError(null); };
    const onOffline = () => {
      setIsOnline(false);
      setIsSepoliaOk(false);
      setNetworkError("Sem conexão com a internet. Verifique sua rede.");
    };
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const checkSepolia = useCallback(async () => {
    if (!navigator.onLine) { setIsSepoliaOk(false); return; }
    try {
      const res = await fetch(SEPOLIA_RPC, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
        signal:  AbortSignal.timeout(TIMEOUT_MS),
      });
      const data = await res.json();
      if (data.result) {
        setIsSepoliaOk(true);
        setNetworkError(null);
      } else {
        throw new Error("sem resultado");
      }
    } catch {
      setIsSepoliaOk(false);
      if (navigator.onLine) {
        setNetworkError("Rede Sepolia indisponível. Reconectando automaticamente…");
      }
    }
  }, []);

  useEffect(() => {
    checkSepolia();
    const pollId = setInterval(checkSepolia, CHECK_MS);
    const onOnline = () => checkSepolia();
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(pollId);
      window.removeEventListener("online", onOnline);
    };
  }, [checkSepolia]);

  return {
    isOnline,
    isSepoliaOk,
    networkError,
    limparNetworkError: () => setNetworkError(null),
    recheckSepolia:     checkSepolia,
  };
}
