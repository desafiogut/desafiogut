// netlify/functions/mc302-diagnostico.mjs — Diagnóstico READ-ONLY do MC30.2.1.
// GET /.netlify/functions/mc302-diagnostico  (ADMIN-GATED)
//
// Corre DENTRO do Netlify, com os segredos REAIS (KMS_KEY_ID, APP_AWS_*, Biconomy),
// e devolve: backend ativo, presença da chave bruta (R9), owner EOA (KMS), endereço
// da Smart Account e o estado on-chain da coordenação. NUNCA devolve segredos nem
// envia transações — só leituras (KMS GetPublicKey, getAccountAddress, view coordenacao()).
//
// É o substituto seguro do smoke local quando as credenciais vivem só no Netlify:
// os segredos nunca saem do ambiente; a resposta contém apenas endereços públicos.

import { JsonRpcProvider, Contract, Network } from "ethers";
import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { guardAdmin } from "./_lib/admin-auth.mjs";
import { criarKmsSigner } from "./_lib/kms-signer.mjs";
import { backendAssinatura, resolverChaveCoordenacao } from "./_lib/signer.mjs";

const ABI_RO = ["function coordenacao() view returns (address)"];

export default async (req) => {
  // Gate de administração — só a coordenação/admin pode consultar.
  const denied = await guardAdmin(req);
  if (denied) return denied;

  const rpcUrl = process.env.RPC_URL;
  const bundlerUrl = process.env.BICONOMY_BUNDLER_URL;
  const contrato = process.env.CONTRATO_SEPOLIA || process.env.CONTRATO_MAINNET || null;
  if (!bundlerUrl) return jsonError(503, "config_ausente", "BICONOMY_BUNDLER_URL não configurado");
  if (!rpcUrl) return jsonError(503, "config_ausente", "RPC_URL não configurado");

  const diag = {
    backend: backendAssinatura(),
    chaveBrutaPresente: !!resolverChaveCoordenacao(), // true → ainda remover (R9 / PASSO 8)
    chainId: null,
    ownerEOA: null,
    smartAccount: null,
    contrato,
    coordenacaoOnChain: null,
    transferenciaPendente: null,
  };

  try {
    const { createSmartAccountClient, extractChainIdFromBundlerUrl } = await import("@biconomy/account");
    try { diag.chainId = Number(extractChainIdFromBundlerUrl(bundlerUrl)); } catch { /* fica null */ }

    const provider = diag.chainId
      ? new JsonRpcProvider(rpcUrl, Network.from(diag.chainId), { staticNetwork: true })
      : new JsonRpcProvider(rpcUrl);

    // Owner KMS — derivação do endereço (read-only: kms:GetPublicKey).
    const owner = await criarKmsSigner(provider);
    diag.ownerEOA = await owner.getAddress();

    // Smart Account — endereço counterfactual (read-only: getAccountAddress).
    const sa = await createSmartAccountClient({
      signer: owner,
      bundlerUrl,
      rpcUrl,
      ...(process.env.BICONOMY_PAYMASTER_URL ? { paymasterUrl: process.env.BICONOMY_PAYMASTER_URL } : {}),
    });
    diag.smartAccount = await sa.getAccountAddress();

    // Estado on-chain — coordenação atual vs Smart Account (read-only).
    if (contrato) {
      try {
        const ro = new Contract(contrato, ABI_RO, provider);
        diag.coordenacaoOnChain = await ro.coordenacao();
        diag.transferenciaPendente =
          diag.coordenacaoOnChain.toLowerCase() !== diag.smartAccount.toLowerCase();
      } catch (e) {
        diag.coordenacaoOnChain = `erro: ${e?.shortMessage || e?.message}`;
      }
    }
  } catch (e) {
    return jsonResponse({ ok: false, etapa: "derivacao", erro: e?.shortMessage || e?.message, ...diag }, 502);
  }

  return jsonResponse({
    ok: true,
    nota: "read-only; nenhuma transação enviada; segredos não expostos",
    ...diag,
  });
};
