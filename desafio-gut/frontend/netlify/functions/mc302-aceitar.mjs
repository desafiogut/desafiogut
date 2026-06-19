// netlify/functions/mc302-aceitar.mjs — PASSO 6 / ETAPA 2 do MC30.2.1.
// Aceita a transferência da coordenação para o Smart Account, via UserOperation
// (Biconomy + owner KMS). `aceitarTransferenciaCoordenacao()` exige
// msg.sender == coordenacaoPendente → tem de ser executada PELO Smart Account.
//
// ⚠️ ESCRITA ON-CHAIN IRREVERSÍVEL. Por isso, guarda TRIPLA:
//   1) método POST + token (x-mc302-diag-token vs MC302_DIAG_TOKEN, tempo constante);
//   2) corpo { "confirmar": "ACEITAR-COORDENACAO" } (evita disparo acidental);
//   3) pré-checagem: coordenacaoPendente() == Smart Account (a Etapa 1 — iniciar —
//      tem de ter sido feita pela coordenação atual). Sem isto, aborta (409).
//
// Sem BICONOMY_PAYMASTER_URL, o gás (deploy do SA + call, numa só UserOp) é pago
// pelo próprio SA → tem de estar financiado. Corre server-side (creds KMS no Netlify).

import { createHash, timingSafeEqual } from "node:crypto";
import { JsonRpcProvider, Contract, Interface, Network } from "ethers";
import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { criarKmsSigner } from "./_lib/kms-signer.mjs";

const ABI = [
  "function coordenacao() view returns (address)",
  "function coordenacaoPendente() view returns (address)",
  "function aceitarTransferenciaCoordenacao()",
];

// Comparação de token em tempo constante (SHA-256 + timingSafeEqual).
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
  if (req.method !== "POST") return jsonError(405, "metodo_invalido", "use POST");

  const negado = verificarToken(req.headers.get("x-mc302-diag-token"));
  if (negado) return negado;

  let body = {};
  try { body = await req.json(); } catch { /* corpo opcional/ inválido tratado abaixo */ }
  if (body?.confirmar !== "ACEITAR-COORDENACAO") {
    return jsonError(400, "confirmacao_ausente", 'envie {"confirmar":"ACEITAR-COORDENACAO"} para confirmar a escrita on-chain');
  }

  const rpcUrl = process.env.RPC_URL;
  const bundlerUrl = process.env.BICONOMY_BUNDLER_URL;
  const contrato = process.env.CONTRATO_SEPOLIA || process.env.CONTRATO_MAINNET;
  if (!rpcUrl || !bundlerUrl || !contrato) {
    return jsonError(503, "config_ausente", "RPC_URL / BICONOMY_BUNDLER_URL / CONTRATO_* em falta");
  }

  try {
    const { createSmartAccountClient, PaymasterMode, extractChainIdFromBundlerUrl } = await import("@biconomy/account");
    let chainId = null;
    try { chainId = Number(extractChainIdFromBundlerUrl(bundlerUrl)); } catch { /* fica null */ }
    const provider = chainId
      ? new JsonRpcProvider(rpcUrl, Network.from(chainId), { staticNetwork: true })
      : new JsonRpcProvider(rpcUrl);

    // Owner KMS + Smart Account (read-only até ao envio).
    const owner = await criarKmsSigner(provider);
    const paymasterUrl = process.env.BICONOMY_PAYMASTER_URL || null;
    const sa = await createSmartAccountClient({
      signer: owner,
      bundlerUrl,
      rpcUrl,
      ...(paymasterUrl ? { paymasterUrl } : {}),
    });
    const smartAccount = await sa.getAccountAddress();

    // Guarda 3 — só aceita se a transferência estiver PENDENTE para este SA.
    const iface = new Interface(ABI);
    const ro = new Contract(contrato, ABI, provider);
    const pendente = await ro.coordenacaoPendente();
    if (pendente.toLowerCase() !== smartAccount.toLowerCase()) {
      return jsonResponse({
        ok: false,
        etapa: "pre-check",
        erro: "coordenacaoPendente não é o Smart Account — falta a Etapa 1 (iniciarTransferenciaCoordenacao) pela coordenação atual",
        coordenacaoPendente: pendente,
        smartAccount,
      }, 409);
    }

    // ENVIO: aceitarTransferenciaCoordenacao() — deploya o SA + chama numa só UserOp.
    const data = iface.encodeFunctionData("aceitarTransferenciaCoordenacao", []);
    const opts = paymasterUrl ? { paymasterServiceData: { mode: PaymasterMode.SPONSORED } } : {};
    const userOp = await sa.sendTransaction({ to: contrato, data, value: 0n }, opts);
    const { transactionHash } = await userOp.waitForTxHash();

    // Aguarda a mineração e confirma o estado (best-effort).
    let coordenacaoDepois = null, sucesso = null;
    try {
      const res = await userOp.wait(1);
      sucesso = res?.success !== false;
      coordenacaoDepois = await ro.coordenacao();
    } catch { /* devolve o hash mesmo se a espera expirar */ }

    return jsonResponse({
      ok: true,
      nota: "UserOperation 'aceitar' enviada (IRREVERSÍVEL).",
      smartAccount,
      contrato,
      chainId,
      txHash: transactionHash,
      sucesso,
      coordenacaoDepois,
      transferenciaConcluida: coordenacaoDepois
        ? coordenacaoDepois.toLowerCase() === smartAccount.toLowerCase()
        : null,
    });
  } catch (e) {
    return jsonResponse({ ok: false, etapa: "envio", erro: e?.shortMessage || e?.message }, 502);
  }
};
