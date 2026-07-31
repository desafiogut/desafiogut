# Pré-requisitos para o Deploy na Mainnet — Opção B (EOA + local-key)

> **Reescrito no MC59.13.** A versão anterior descrevia a arquitetura Smart Account
> (Biconomy ERC-4337 + owner KMS), **abandonada na Opção D** (bundler Biconomy
> desativado, MC52.1; coordenação = EOA local-key, MC56). Este documento reflete a
> arquitetura VIVA: **EOA comum + assinatura local-key**. Ações que exigem
> credenciais reais, fundos on-chain ou painéis externos **não são executáveis por
> agente** — o OPERADOR executa manualmente, nesta ordem.
> Ver também: `docs/MC59.10-relatorio.txt`..`MC59.12-relatorio.txt`, `cloud.md`,
> `docs/runbook-incidentes.md`, `docs/runbook-credito-pendente.md`.
> Estado atual: produção em **Sepolia** (`NETWORK_STAGE` ausente).

## 1. Arquitetura (Opção B)
- Coordenadora = **EOA comum** (não Smart Account). O contrato `LeilaoGUT` autoriza por
  `require(msg.sender == coordenacao)`; o `constructor` faz `coordenacao = msg.sender`,
  então **quem deploya vira a coordenadora automaticamente**.
- Backend assina com **`SIGNER_BACKEND=local-key`** (chave bruta em env). Em mainnet isso
  só é aceito com esse opt-in EXPLÍCITO — o default de mainnet continua `biconomy` e
  **recusa** arrancar com chave bruta (`_lib/signer.mjs`, guarda MC30.1/MC59.1).
- ⚠️ **Postura de segurança:** a chave é uma **HOT KEY**. A EOA deve conter **apenas ETH
  de gás** (não é tesouraria), com **rotação de chave** e **monitor on-chain**. Migração
  futura para custódia mais forte é dívida conhecida (ver §11).

## 2. Segurança (P0 — bloqueante)
- [ ] **Auditoria externa** independente de `contracts/Leilao.sol` (a auditoria interna
      estática + fuzzing Foundry/Echidna do MC40-CI **não** substitui revisão externa) —
      ou decisão formal de aceitação de risco pelo operador, registrada.
- [ ] **Gerar EOA nova** offline (`cast wallet new` ou hardware wallet). A chave privada
      **nunca** entra em chat/log/issue/git; guardar em cofre. Registrar só o endereço público.
- [ ] **Rotacionar/abandonar a chave atual** (`0x1394492e…`) — está COMPROMETIDA (foi
      exposta em texto puro). Não reutilizá-la na mainnet.

## 3. Deploy do contrato na mainnet — ✅ EXECUTADO (MC59.14, verificado on-chain)
> Contrato mainnet: **0x0052477A8CA81BCAF4a60e21e635F9e00a5d16cd**
> EOA coordenadora: **0xFea436f74059F885ea50D48aBbE21ef6665d1E67**
- [x] `npx hardhat compile` (artifact gerado).
- [x] Script `scripts/deploy-direct-mainnet.cjs` (revisado no MC59.11).
- [x] Deploy a partir da EOA nova (`PRIVATE_KEY`); EOA nonce=1.
- [x] Endereço do contrato anotado (acima).
- [ ] Verificar o contrato no **Etherscan** (código-fonte público) — pendente.
- [x] `eth_getCode` na mainnet ≠ `"0x"` (verificado).
- [x] `coordenacao()` (`0xe06f9dbf`) == EOA nova (verificado).

## 4. Backend (Netlify env, context production)
> Só definir depois de §2 e §3 verdes. O caminho mainnet faz gate **apenas** por
> `NETWORK_STAGE` (não valida se o contrato é real) → flip prematuro com contrato
> ausente/placeholder quebra o fluxo de lance (lição MC39). Setar `NETWORK_STAGE`
> por ÚLTIMO.
- [ ] `SIGNER_BACKEND=local-key` — **OBRIGATÓRIO e explícito** (senão o default `biconomy`
      rejeita a chave bruta e o backend não arranca).
- [ ] `COORDENACAO_PRIVATE_KEY` = **chave da EOA nova** — **PRESENTE e NECESSÁRIA** nesta
      arquitetura (corrige o gate antigo que pedia a chave AUSENTE; aquilo era do backend
      biconomy). Injetada manualmente pelo operador — nunca via agente/CLI logada.
- [ ] `CONTRATO_MAINNET` = endereço real do §3 (não o endereço Sepolia).
- [ ] `MAINNET_CHAIN_ID=1` (já definido no MC39; inerte até o flip).
- [ ] **FLIP (último):** `netlify env:set NETWORK_STAGE mainnet --context production` +
      `netlify deploy --build --prod` (commit vazio NÃO redesdobra — gotcha OPS-1).

## 5. Frontend (Netlify env, context production)
> O frontend tem fonte única de config em `src/lib/network.js` (MC59.2).
- [ ] `VITE_CONTRATO_SEPOLIA` (ou `VITE_CONTRATO`) = **endereço do contrato na mainnet**.
      ⚠️ O nome da variável ainda diz "SEPOLIA" (legado) mas é o endereço ATIVO lido pelo
      frontend — sem fallback hardcoded, falha alto se faltar.
- [ ] `VITE_CHAIN_ID=1` (default é 11155111/Sepolia).
- [ ] `VITE_EXPLORER_URL=https://etherscan.io` (default é sepolia.etherscan.io).
- [ ] `VITE_NETWORK_STAGE=mainnet` (separado do `NETWORK_STAGE` do backend; lido em
      `CardLance.jsx`).

## 6. Outras configurações
- [ ] `MP_WEBHOOK_SECRET` **real** (painel Mercado Pago) — hoje é placeholder `sk_live_XXXX`.
- [ ] `SENTRY_DSN` confirmado em prod (senão alertas de `credito_pendente` viram log
      silencioso — perde a observabilidade do MC59.3).
- [ ] `CONSOLIDATION_RPC_URL` = Flashbots Protect mainnet (anti-MEV da consolidação) +
      opcional `CONSOLIDATION_RPC_URL_FALLBACK` (código MC39.2, `_lib/rpc-fallback.mjs`).
- [ ] **Painel Privy (externo):** Allowed Origins só `https://silly-stardust-ca71bc.netlify.app`
      (remover dev/localhost); HttpOnly cookies; MFA para alto valor; duração de sessão;
      OAuth redirects/escopos revistos. `supportedChains` já inclui mainnet (MC39.1).

## 7. Validação pós-deploy
- [ ] `/health` → modo de assinatura **mainnet + local-key**. Sob Opção B espera-se
      `chaveBrutaEmMainnet=true` (a chave está presente por design — corrige o critério
      antigo, que assumia biconomy). Confirmar `SIGNER_BACKEND=local-key` reportado.
- [ ] Smoke: `comprar-senhas` com valor mínimo (R$ 1,00) → crédito confirmado.
- [ ] Lance de teste: `lance-relampago` segue blindagem MC28 (commit on-chain real);
      confirmar a tx no contrato mainnet.
- [ ] `consolidar-lances` (admin) → consolida contra `CONTRATO_MAINNET`; EIP-712 OK.
- [ ] PIX: webhook real dispara (linha `fonte=webhook`).
- [ ] Visual MCP 375/1440 CLS=0; suíte local verde; Supabase (dados) inalterado.

## 8. Revogação da chave antiga (0x1394492e…)
- [ ] Remover de `.env` (`desafio-gut/.env`, `frontend/.env.local`), segredos Netlify,
      scripts e histórico git (BFG/`git filter-repo` se preciso).
- [ ] `grep -r "0x1394492e" .` no repo deve retornar vazio.
- [ ] Marcar como revogada no `cloud.md`.

## 9. Concorrência de nonce (hot key EOA)
- [ ] O signer local-key **não serializa o nonce** → requisições concorrentes podem
      colidir. Mitigação já no código: retry ciente de nonce (MC59.4) +
      `docs/runbook-credito-pendente.md`. Fix definitivo (confirmação assíncrona via fila
      `fila_tarefas`, MC39.20) é dívida ativa — aplicar a migração antes de carga alta.

## 10. Rollback (ver runbook-incidentes.md §1/§6)
- [ ] `netlify env:unset NETWORK_STAGE` (ou `=sepolia`) + `netlify deploy --build --prod`
      → volta a Sepolia. Reverter também `VITE_*` (contrato/chain/explorer/stage).
- [ ] Dados (Supabase) não dependem da rede; Blobs/backup intactos.

## 11. Dívida conhecida / hardening futuro (não bloqueante)
- [ ] **Custódia:** migrar a coordenação de hot-key EOA para **Gnosis Safe multisig 2/3**
      e/ou signer KMS — elimina o single point da chave bruta (MC42). Enquanto for hot key,
      manter EOA só-gás + rotação + monitor on-chain.
- [ ] Fix definitivo do nonce (§9): aplicar migração `fila_tarefas` e ativar o async.
- [ ] ~39 advisories transitivos (1 critical `protobufjs`) — upgrades MAJOR de SDK.
- [ ] Débito atómico no `saldo_rs` (`UPDATE … WHERE centavos >= :v`).
