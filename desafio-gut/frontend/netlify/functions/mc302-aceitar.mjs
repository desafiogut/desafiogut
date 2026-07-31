// netlify/functions/mc302-aceitar.mjs — DESATIVADO no MC87 (P2-5).
//
// O que este endpoint fazia: aceitava a transferência da coordenação para um
// Smart Account Biconomy, enviando uma UserOperation — uma ESCRITA ON-CHAIN
// IRREVERSÍVEL. Tinha guarda tripla (POST + MC302_DIAG_TOKEN comparado em tempo
// constante + corpo de confirmação + pré-checagem de coordenacaoPendente), e por
// isso nunca foi explorável na prática.
//
// Porque foi desativado (MC86 / A-11): a migração que ele servia terminou e foi
// SUPERADA três vezes —
//   · MC52.1  o bundler da Biconomy foi desativado (falha para todas as chains);
//   · MC56    o contrato foi redeployado com a coordenação numa EOA, não num SA;
//   · MC60    a mainnet entrou em produção nessa linhagem.
// Ou seja: um caminho de escrita irreversível continuava publicado para executar
// uma migração que já não existe. A guarda dependia inteiramente de uma variável
// de ambiente continuar ausente — e variáveis de ambiente voltam.
//
// Mantemos o ficheiro (em vez de o apagar) para que a rota responda 410 Gone de
// forma explícita e auditável, em vez de um 404 ambíguo que se confunde com falha
// de deploy. O histórico do código está no git.

import { jsonResponse } from "./_lib/validate.mjs";

export default async () => jsonResponse({
  ok: false,
  error: {
    code: "endpoint_removido",
    message: "Endpoint desativado no MC87. A migração MC30.2.1 (coordenação → Smart Account "
      + "Biconomy) foi superada pelo MC56/MC60 — a coordenação vive numa EOA e a mainnet já "
      + "está em produção. Ver o histórico do git para reconstituir o fluxo.",
  },
}, 410);
