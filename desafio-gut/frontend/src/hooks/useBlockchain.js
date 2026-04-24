import { useState, useEffect, useCallback, useRef } from "react";
import { JsonRpcProvider, Contract, formatEther } from "ethers";
import { ABI, CONTRATO_SEPOLIA } from "../utils/web3.js";
import { traduzirErro } from "../utils/erros.js";

// Alchemy Sepolia como RPC primário; fallback público caso env não esteja definida
const SEPOLIA_RPC =
  import.meta.env.VITE_RPC_URL_SEPOLIA ??
  "https://eth-sepolia.g.alchemy.com/v2/demo";

const CONTRATO_ADDR =
  import.meta.env.VITE_CONTRACT_ADDRESS ?? CONTRATO_SEPOLIA;

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

// Verdadeiro apenas quando há um contrato real deployado
const CONTRATO_ATIVO = CONTRATO_ADDR && CONTRATO_ADDR !== ZERO_ADDR;

const POLL_MS = 15_000;

function getReadProvider() {
  return new JsonRpcProvider(SEPOLIA_RPC);
}

/**
 * Hook de leitura blockchain — polling Sepolia via Alchemy.
 *
 * - fetchSaldo: ETH balance sempre; saldoSenhas só quando contrato deployado
 * - fetchVencedor: só quando contrato deployado
 * - Desabilitado em MOCK_MODE ou sem address
 */
export function useBlockchain({ address, idEdicao, enabled = true }) {
  const [saldoSenhas,       setSaldoSenhas]       = useState(null);
  const [saldoETH,          setSaldoETH]          = useState(null);
  const [vencedorOnChain,   setVencedorOnChain]   = useState(null);
  const [isLoadingSaldo,    setIsLoadingSaldo]    = useState(false);
  const [isLoadingVencedor, setIsLoadingVencedor] = useState(false);
  const [erroBlockchain,    setErroBlockchain]    = useState(null);
  const pollRef = useRef(null);

  const fetchSaldo = useCallback(async () => {
    if (!address || !enabled) return;
    setIsLoadingSaldo(true);
    setErroBlockchain(null);
    try {
      const provider = getReadProvider();

      if (CONTRATO_ATIVO) {
        // Contrato deployado: busca ETH + fichas em paralelo
        const contrato = new Contract(CONTRATO_ADDR, ABI, provider);
        const [fichas, bal] = await Promise.all([
          contrato.saldoSenhas(address),
          provider.getBalance(address),
        ]);
        setSaldoSenhas(Number(fichas));
        setSaldoETH(Number(formatEther(bal)).toFixed(6));
      } else {
        // Endereço nulo / sem deploy: busca apenas saldo ETH real
        const bal = await provider.getBalance(address);
        setSaldoSenhas(null);
        setSaldoETH(Number(formatEther(bal)).toFixed(6));
      }
    } catch (err) {
      setErroBlockchain(traduzirErro(err));
    } finally {
      setIsLoadingSaldo(false);
    }
  }, [address, enabled]);

  const fetchVencedor = useCallback(async () => {
    if (!idEdicao || !enabled || !CONTRATO_ATIVO) return;
    setIsLoadingVencedor(true);
    try {
      const provider = getReadProvider();
      const contrato = new Contract(CONTRATO_ADDR, ABI, provider);
      const [valor, addr] = await contrato.apurarVencedor(idEdicao);
      if (addr && addr !== ZERO_ADDR) {
        setVencedorOnChain({ valor: Number(valor), endereco: addr });
      }
    } catch {
      // sem vencedor ainda é estado normal — silencioso
    } finally {
      setIsLoadingVencedor(false);
    }
  }, [idEdicao, enabled]);

  useEffect(() => {
    if (!enabled) return;
    fetchSaldo();
    fetchVencedor();
    pollRef.current = setInterval(() => {
      fetchSaldo();
      fetchVencedor();
    }, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchSaldo, fetchVencedor, enabled]);

  useEffect(() => {
    if (!address) {
      setSaldoSenhas(null);
      setSaldoETH(null);
    }
  }, [address]);

  return {
    saldoSenhas,
    saldoETH,
    vencedorOnChain,
    isLoadingSaldo,
    isLoadingVencedor,
    erroBlockchain,
    contratoAtivo: CONTRATO_ATIVO,
    limparErroBlockchain: () => setErroBlockchain(null),
    refetchSaldo:    fetchSaldo,
    refetchVencedor: fetchVencedor,
  };
}
