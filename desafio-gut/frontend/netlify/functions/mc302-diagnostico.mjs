// netlify/functions/mc302-diagnostico.mjs — Diagnóstico READ-ONLY do MC30.2.1.
// GET /.netlify/functions/mc302-diagnostico  (gated por TOKEN)
//   Header obrigatório:  x-mc302-diag-token: <MC302_DIAG_TOKEN>
//
// Corre DENTRO do Netlify, com os segredos REAIS (KMS_KEY_ID, APP_AWS_*, Biconomy),
// e devolve: backend ativo, presença da chave bruta (R9), owner EOA (KMS), endereço
// da Smart Account e o estado on-chain da coordenação. NUNCA devolve segredos nem
// envia transações — só leituras (KMS GetPublicKey, getAccountAddress, view coordenacao()).
//
// Gate: token dedicado e DESCARTÁVEL em `MC302_DIAG_TOKEN` (comparação em tempo
// constante). Se a env var não estiver definida, o endpoint recusa (503) — nunca
// fica aberto. REMOVER `MC302_DIAG_TOKEN` do ambiente após concluir a migração.

import { createHash, timingSafeEqual } from "node:crypto";
import { JsonRpcProvider, Contract, Network } from "ethers";
import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { criarKmsSigner } from "./_lib/kms-signer.mjs";
import { backendAssinatura, resolverChaveCoordenacao } from "./_lib/signer.mjs";

const ABI_RO = ["function coordenacao() view returns (address)"];

// Compara o token fornecido com MC302_DIAG_TOKEN em tempo constante (via SHA-256
// de ambos → buffers de igual comprimento, sem fuga por timing nem por tamanho).
function verificarToken(fornecido) {
  const esperado = process.env.MC302_DIAG_TOKEN;
  if (!esperado) return jsonError(503, "config_ausente", "MC302_DIAG_TOKEN não configurado — endpoint desativado");
  if (!fornecido) return jsonError(401, "token_ausente", "header x-mc302-diag-token em falta");
  const a = createHash("sha256").update(String(fornecido)).digest();
  const b = createHash("sha256").update(String(esperado)).digest();
  if (!timingSafeEqual(a, b)) return jsonError(401, "token_invalido", "token inválido");
  return null;
}

export default async (req) => {
  // Gate por token de uso único (descartável). Sem admin auth.
  const negado = verificarToken(req.headers.get("x-mc302-diag-token"));
  if (negado) return negado;

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
