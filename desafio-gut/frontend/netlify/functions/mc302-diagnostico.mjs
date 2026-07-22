// netlify/functions/mc302-diagnostico.mjs — DESATIVADO no MC87 (P2-5).
//
// Diagnóstico read-only da migração MC30.2.1: derivava o owner EOA a partir do
// KMS, o endereço counterfactual do Smart Account Biconomy e o estado on-chain da
// coordenação. Era fail-closed (503 sem MC302_DIAG_TOKEN) e nunca devolveu
// segredos — em produção respondia 503, como a auditoria do MC86 confirmou.
//
// Desativado pela mesma razão do mc302-aceitar: a migração terminou e foi superada
// (MC52.1 matou o bundler Biconomy, MC56 redeployou o contrato com coordenação em
// EOA, MC60 pôs a mainnet em produção). Um endpoint que instancia o SDK do KMS com
// credenciais reais não tem porque continuar publicado para diagnosticar um fluxo
// que já não existe.
//
// Para diagnosticar a coordenação ATUAL, o caminho é o /health autenticado como
// admin (SIGNER_BACKEND, SIGNER_READY, CHAVE_BRUTA_EM_MAINNET) ou uma leitura
// direta de `coordenacao()` no contrato ativo.

import { jsonResponse } from "./_lib/validate.mjs";

export default async () => jsonResponse({
  ok: false,
  error: {
    code: "endpoint_removido",
    message: "Endpoint desativado no MC87. Use GET /health autenticado como admin para o estado "
      + "do signer, ou leia coordenacao() diretamente no contrato ativo.",
  },
}, 410);
