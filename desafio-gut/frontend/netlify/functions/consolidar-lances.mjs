// POST /.netlify/functions/consolidar-lances   — APENAS coordenação/admin.
// Body: { edicaoId }   Header: Authorization: Bearer <admin-jwt>  OU  x-admin-token
//
// MC28.1 SEGMENTO 4. Consolida o leilão no fecho:
//   1) lê TODOS os lances (Key-Per-Bid) com paginação + paralelismo (SEGMENTO 5);
//   2) apura o menor lance único OFF-CHAIN (Artigo VIII) — custo on-chain O(1);
//   3) assina EIP-712 (recibo de auditoria; anti-replay reforçado pelo edicaoNonce);
//   4) envia consolidarResultado via Flashbots Protect (anti-MEV);
//   5) trata transação descartada (NUNCA reenvia automaticamente — ITEM 4.2).
//
// Só corre em NETWORK_STAGE === 'mainnet' (R9).

import { Contract } from "ethers";
import { jsonResponse, jsonError, parseJsonBody } from "./_lib/validate.mjs";
import { guardAdmin } from "./_lib/admin-auth.mjs";
import { marcarConsolidado, estaConsolidado } from "./_lib/bids-store.mjs";
import { getLances } from "./_lib/data-store.mjs";
import { obterSignerCoordenacao, backendAssinatura } from "./_lib/signer.mjs";

const ABI = [
  "function consolidarResultado(string idEdicao, address vencedor, uint256 menorUnico) public",
  "function edicaoNonce(string) view returns (uint256)",
];
const ZERO             = "0x0000000000000000000000000000000000000000";
const TIMEOUT_MINER_MS = 90_000; // janela de mineração antes de reportar "pendente"

/** Menor valor que aparece EXATAMENTE uma vez (Artigo VIII). null se não houver. */
export function apurarMenorUnico(lances) {
  const cont = new Map();
  for (const l of lances) cont.set(l.valorCentavos, (cont.get(l.valorCentavos) || 0) + 1);
  let menor = Infinity, vencedor = ZERO;
  for (const l of lances) {
    if (cont.get(l.valorCentavos) === 1 && l.valorCentavos < menor) {
      menor = l.valorCentavos; vencedor = l.endereco;
    }
  }
  return menor === Infinity ? null : { menorUnico: menor, vencedor };
}

export default async (req) => {
  if (req.method !== "POST") return jsonError(405, "metodo_invalido", "use POST");
  if (process.env.NETWORK_STAGE !== "mainnet")
    return jsonError(409, "fora_de_mainnet", "consolidação só corre em mainnet");

  // 1. AUTORIZAÇÃO — admin (Bearer admin-jwt OU x-admin-token legado)
  const denied = await guardAdmin(req);
  if (denied) return denied;

  // 2. EDIÇÃO
  const body     = await parseJsonBody(req).catch(() => null);
  const edicaoId = String(body?.edicaoId || "").trim();
  if (!edicaoId) return jsonError(400, "edicao_obrigatoria", "edicaoId obrigatório");

  // 3. Idempotência de fecho — não reconsolida
  const jaFechado = await estaConsolidado(edicaoId);
  if (jaFechado) return jsonResponse({ ok: true, idempotent: true, edicaoId, ...jaFechado });

  // 4. ENV obrigatórias — credenciais conforme o backend de assinatura (MC30.1)
  const requeridas = ["CONSOLIDATION_RPC_URL", "CONTRATO_MAINNET", "MAINNET_CHAIN_ID"];
  if (backendAssinatura() === "local-key") requeridas.push("COORDENACAO_PRIVATE_KEY");
  else requeridas.push("KMS_KEY_ID", "BICONOMY_BUNDLER_URL");
  for (const k of requeridas) {
    if (!process.env[k]) return jsonError(503, "config_ausente", `${k} não configurado`);
  }

  // 5. Apurar menor lance único OFF-CHAIN — leitura via fachada data-store
  //    (MC32.1). Backend 'blobs' = listarBids (byte-idêntico); pronto p/ Supabase.
  const lances  = await getLances(edicaoId);
  const apurado = apurarMenorUnico(lances);
  if (!apurado) return jsonError(422, "sem_vencedor", "nenhum lance único nesta edição");

  // 6. Signer da coordenação via módulo central (MC30.1). No backend local-key
  //    o provider é o Flashbots Protect (CONSOLIDATION_RPC_URL); no backend
  //    'biconomy' o envio/assinatura ocorrem via Smart Account ERC-4337 (owner KMS).
  const { provider, signer } = await obterSignerCoordenacao(process.env.CONSOLIDATION_RPC_URL);
  const contrato = new Contract(process.env.CONTRATO_MAINNET, ABI, signer);

  // 7. EIP-712 (recibo de auditoria off-chain) — nonce do leilão (anti-replay)
  const nonce  = Number(await contrato.edicaoNonce(edicaoId));
  const domain = {
    name: "LeilaoGUT", version: "1",
    chainId: Number(process.env.MAINNET_CHAIN_ID),
    verifyingContract: process.env.CONTRATO_MAINNET,
  };
  const types = { Consolidacao: [
    { name: "idEdicao",   type: "string"  },
    { name: "vencedor",   type: "address" },
    { name: "menorUnico", type: "uint256" },
    { name: "nonce",      type: "uint256" },
  ] };
  const value = { idEdicao: edicaoId, vencedor: apurado.vencedor, menorUnico: apurado.menorUnico, nonce };
  const assinaturaEip712 = await signer.signTypedData(domain, types, value);

  // 8. Enviar consolidarResultado via Flashbots (fora do mempool público)
  let tx;
  try {
    tx = await contrato.consolidarResultado(edicaoId, apurado.vencedor, apurado.menorUnico);
  } catch (err) {
    return jsonError(502, "envio_falhou", "falha ao submeter consolidação: " + (err?.shortMessage || err?.message));
  }

  // 9. Dropped tx handling (ITEM 4.2): espera com timeout; NUNCA reenvia auto.
  const receipt = await provider.waitForTransaction(tx.hash, 1, TIMEOUT_MINER_MS).catch(() => null);
  if (!receipt) {
    return jsonResponse({
      ok: false, status: "pendente", edicaoId, txHash: tx.hash,
      vencedor: apurado.vencedor, menorUnicoCentavos: apurado.menorUnico,
      nonceUsado: nonce, assinaturaEip712,
      mensagem: "Transação não minerada na janela. NÃO foi reenviada — a coordenação deve reenviar manualmente com maxFeePerGas mais alto.",
    }, 202);
  }

  // 10. Marcar consolidado (idempotência) e responder
  const resultado = {
    vencedor: apurado.vencedor, menorUnicoCentavos: apurado.menorUnico,
    nonceUsado: nonce, assinaturaEip712,
    txHash: receipt.hash, blockNumber: receipt.blockNumber, totalLances: lances.length,
  };
  await marcarConsolidado(edicaoId, resultado);
  return jsonResponse({ ok: true, edicaoId, ...resultado });
};
