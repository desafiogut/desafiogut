# Pré-requisitos Manuais para o Cutover Mainnet (MC40)

> Ações que exigem credenciais reais, painéis externos, fundos on-chain ou contratação —
> NÃO executáveis numa sessão de código. Executar nesta ordem. Ver também:
> `Desktop\MC40-checklist.md`, `Desktop\SEGURANCA-MAINNET-READINESS.md`, `cloud.md §9.12/§9.13`,
> `docs/runbook-incidentes.md`. Estado atual: produção em **Sepolia** (`NETWORK_STAGE` ausente).

## 1. Auditoria externa do contrato (P0 — bloqueante)
- [ ] Contratar/realizar uma auditoria independente de `contracts/Leilao.sol` antes do deploy mainnet.
- [ ] A auditoria interna (`SEGURANCA-MAINNET-READINESS.md`) é estática e NÃO substitui revisão externa.
- [ ] Tratar achados (se houver) e congelar a versão auditada do contrato.

## 2. Deploy do contrato em Mainnet
- [ ] Deploy de `Leilao.sol` em Ethereum mainnet (Hardhat/Foundry). **Anotar o endereço.**
- [ ] Verificar o contrato no Etherscan (código-fonte público).
- [ ] `coordenacao()` inicial = deployer (será transferida para o Smart Account no passo 4).

## 3. Financiar o Smart Account (coordenação) em Mainnet (P0)
- [ ] Smart Account (Biconomy ERC-4337): `0xdEbe637d7f74C4bfe71263920F68589f0c672D92`
      (owner KMS EOA `0xAEFe11EDBb32fb6727693e5994a51df8ADb5EdFF`). **Confirmar que o MESMO Smart
      Account existe/deploya em mainnet** (o do MC30.2.1 foi montado em Sepolia).
- [ ] Enviar ETH suficiente para gas das operações iniciais (estimar ~0.05–0.1 ETH) **OU** ativar o
      Paymaster (`BICONOMY_PAYMASTER_URL`) com saldo.
      Ex.: `cast send 0xdEbe637d7f74C4bfe71263920F68589f0c672D92 --value 0.1ether --rpc-url <mainnet> --private-key <funder>`
- [ ] Confirmar saldo on-chain antes de prosseguir.

## 4. Transferir a coordenação para o Smart Account (two-step, on-chain)
- [ ] `iniciarTransferenciaCoordenacao(<smartAccount>)` (chamada pela coordenação atual/deployer).
- [ ] `aceitarTransferenciaCoordenacao()` (UserOp do Smart Account via Bundler).
- [ ] Confirmar `coordenacao() == smartAccount` e `coordenacaoPendente() == 0x0`.

## 5. Bundler + Fallback (P0/P1) — MC39.2 já preparou o código
- [ ] `BICONOMY_BUNDLER_URL` = bundler mainnet (EntryPoint compatível com o Smart Account).
- [ ] `BICONOMY_BUNDLER_URL_FALLBACK` = bundler alternativo (ex.: Alchemy/Pimlico, mesmo EntryPoint)
      → o código (`signer.mjs` via `_lib/rpc-fallback.mjs`) usa-o automaticamente se o primário cair.
- [ ] Validar handshake real: KMS responde (`kms:Sign`), Bundler responde (`eth_chainId`), endereço do
      Smart Account correto.

## 6. RPC de consolidação + Flashbots + Fallback (P1) — MC39.2 já preparou o código
- [ ] `CONSOLIDATION_RPC_URL` = Flashbots Protect mainnet (anti-MEV).
- [ ] `CONSOLIDATION_RPC_URL_FALLBACK` = RPC alternativo (ex.: Alchemy/Infura mainnet) → usado
      automaticamente se o Flashbots não responder (`_lib/rpc-fallback.mjs`).

## 7. Revisar o painel Privy (P0/P1 — externo)
- [ ] **Allowed Origins:** só `https://silly-stardust-ca71bc.netlify.app` (remover dev/localhost/test).
- [ ] **HttpOnly cookies:** habilitar (proteção de sessão contra XSS).
- [ ] **MFA:** habilitar para transações de alto valor.
- [ ] **Duração de sessão:** ajustar (default 30 dias).
- [ ] **OAuth redirects/escopos:** revistos.
- [ ] **supportedChains (código):** já inclui mainnet (MC39.1). Se a UI for a mainnet, considerar
      `defaultChain` mainnet e atualizar `VITE_CONTRATO_*`/`VITE_RPC_*` mainnet.

## 8. Definir variáveis reais + ATIVAR (último passo, P0)
> Só depois de TODOS os passos acima verdes. Caminhos mainnet fazem gate APENAS por `NETWORK_STAGE`
> (não validam se o contrato é real) → flip prematuro quebra o fluxo de lance (lição MC39).
- [ ] `netlify env:set CONTRATO_MAINNET <endereço real do passo 2> --context production`
- [ ] `netlify env:set CONSOLIDATION_RPC_URL <flashbots mainnet> --context production`
- [ ] (opcional) `netlify env:set CONSOLIDATION_RPC_URL_FALLBACK <rpc> --context production`
- [ ] (opcional) `netlify env:set BICONOMY_BUNDLER_URL_FALLBACK <bundler> --context production`
- [ ] `MAINNET_CHAIN_ID=1` (já definido no MC39).
- [ ] Confirmar `COORDENACAO_PRIVATE_KEY` **AUSENTE** (R9; `signer.mjs:68` recusa arrancar com ela em mainnet).
- [ ] **FLIP:** `netlify env:set NETWORK_STAGE mainnet --context production` + `netlify deploy --build --prod`
      (commit vazio NÃO redesdobra — gotcha OPS-1).

## 9. Validação pós-flip
- [ ] `/health` → modo de assinatura mainnet, `chaveBrutaEmMainnet=false`.
- [ ] Lance de teste controlado → `lance-relampago` segue blindagem MC28 (commit on-chain real); confirmar tx.
- [ ] `consolidar-lances` (admin) → consolida contra `CONTRATO_MAINNET` real; EIP-712 OK.
- [ ] Visual MCP 375/1440 CLS=0; suite local 83/83; Supabase (dados) inalterado.

## 10. Rollback (ver runbook-incidentes.md §1/§6)
- [ ] `netlify env:unset NETWORK_STAGE` (ou `=sepolia`) + `netlify deploy --build --prod` → volta a Sepolia.
- [ ] Dados (Supabase) não dependem da rede; Blobs/backup intactos.

## Dívida conhecida (não bloqueante para o cutover, tratar depois)
- [ ] ~39 advisories transitivos no stack Privy/wallet/transformers (1 critical `protobufjs`) — exigem
      upgrades MAJOR de SDK; planear upgrade quando upstream estabilizar.
- [ ] Hardening: Gnosis Safe multisig 2/3 como owner (elimina single-point KMS) — MC42.
- [ ] Débito atómico no `saldo_rs` (`UPDATE ... WHERE centavos >= :v`).
