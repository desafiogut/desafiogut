# Plan 001: Deploy do LeilaoGUT na Ethereum Mainnet + transferência da coordenação para a Smart Account (KMS)

> **Executor instructions**: Siga passo a passo. Rode cada comando de verificação e
> confirme o resultado esperado antes de avançar. Vários passos são **OPERADOR-ONLY**
> (segredos, serviços externos, dinheiro real) — marcados `[OPERADOR]`; um agente NÃO
> os executa, apenas prepara/valida. Se qualquer "STOP condition" ocorrer, pare e
> reporte — não improvise. Ao terminar, atualize a linha de status em `plans/README.md`.
>
> **Drift check (rode primeiro)**: `git diff --stat e842d4b..HEAD -- desafio-gut/contracts/Leilao.sol desafio-gut/hardhat.config.js desafio-gut/ignition desafio-gut/frontend/netlify/functions/_lib/signer.mjs`
> Se algum arquivo in-scope mudou desde este plano, compare os excertos de "Current
> state" com o código vivo antes de prosseguir; em divergência, trate como STOP.

## Status
- **Priority**: P1 (bloqueia o lançamento real; tudo a jusante depende disto)
- **Effort**: L (auditoria externa + on-chain + janela de validação)
- **Risk**: HIGH (dinheiro real, irreversível on-chain, chaves de coordenação)
- **Depends on**: none (é o marco-raiz; Plan 002/003 dependem deste estar concluído)
- **Category**: migration / security
- **Planned at**: commit `e842d4b`, 2026-06-30

## Review-plan refinements (revisão de contexto fresco · 2026-06-30, MC40 session)
Achados da revisão (`improve review-plan`) — incorporar ANTES de executar:
1. **[CRÍTICO] O `aceitarTransferenciaCoordenacao()` da Smart Account NÃO pode usar
   `cast send --private-key`.** A coordenação-alvo é uma **Smart Account ERC-4337** (Biconomy,
   owner AWS KMS) — uma **conta-contrato sem chave privada bruta**. A chamada de aceitação tem de
   ser submetida como **UserOperation** assinada pelo owner KMS, via o caminho Biconomy/KMS já no
   projeto (`_lib/signer.mjs`, `_lib/kms-signer.mjs`, `_lib/kms/aws-kms.mjs`), **nunca** via
   `--private-key <SMART_ACCOUNT_KEY>` (esse argumento não existe para uma Smart Account). Usar
   `cast --private-key` aqui falha ou, pior, assina com uma EOA errada → coordenação presa.
2. **[ALTO] Verificar o endereço da Smart Account ANTES do transfer.** Se o `aceitarTransferencia`
   vier de um endereço que o KMS NÃO controla, a coordenação fica **permanentemente perdida** (só o
   `coordenacaoPendente` pode aceitar). Antes do Step 5: derivar/confirmar via KMS+Biconomy que o
   endereço alvo (ex.: o fornecido pelo operador) é exatamente a Smart Account cujo owner é a chave KMS
   configurada, e que ela consegue assinar um UserOp de teste (ex.: uma tx no-op/aprovação barata).
3. **[ALTO] Dry-run em fork de mainnet antes do deploy real.** Ensaiar deploy + two-step num
   `hardhat node --fork $MAINNET_RPC_URL` (ou Foundry `--fork-url`) custa ~0 e valida o fluxo
   inteiro (deploy → iniciar → aceitar → `coordenacao()`) sem gastar ETH real. Adicionar como
   pré-passo do Step 4.
4. **[MÉDIO] `npx hardhat verify` exige um bloco `etherscan` (apiKey) no config** — hoje ausente.
   Adicionar no Step 1 (apiKey via env, ex.: `ETHERSCAN_API_KEY`), senão o Step 4 (verify) falha.
5. **[ESCLARECIMENTO] "Deploy via KMS" vs DEPLOYER raw key.** A coordenação final é KMS (Smart
   Account). O **deployer** pode ser uma **EOA efêmera** (chave raw, financiada só p/ o deploy) que é
   **totalmente divestida** pelo two-step transfer — esse é o caminho mais simples e seguro. Se o
   operador exigir deploy assinado por KMS, é preciso um provider/signer KMS no Hardhat (custom) —
   decisão de arquitetura; documentar qual caminho foi escolhido antes do Step 4.
6. **[INFRA] Esta sessão de agente NÃO tem os segredos mainnet** (`MAINNET_RPC_URL`,
   `DEPLOYER_PRIVATE_KEY`, `KMS_KEY_ID`, `CONSOLIDATION_RPC_URL` ausentes) e NÃO deve manuseá-los
   (R9/R14). Os Steps 2–7 (deploy, on-chain, env, flip) são **OPERADOR-ONLY** — gastam ETH real, são
   irreversíveis e exigem segredos/KMS. Um agente prepara o código (Step 1) e o runbook; **não executa**
   a transação mainnet sem o operador conduzir, com confirmação explícita por ação irreversível.

## Why this matters
O DESAFIOGUT roda hoje **propositadamente em Sepolia testnet** (`NETWORK_STAGE`≠mainnet).
Para operar com valor real, o contrato `LeilaoGUT` precisa ser deployado na Ethereum
mainnet, a coordenação transferida para a Smart Account ERC-4337 (owner AWS KMS, sem
chave bruta — R9), e as variáveis de produção apontadas para o contrato real. Errar
aqui é caro e, on-chain, irreversível. O código já foi preparado em MC39 SEM ativar
(gates por `NETWORK_STAGE`); este plano executa a ativação com validação e rollback.

## Current state
- `desafio-gut/contracts/Leilao.sol` — contrato `LeilaoGUT`. Coordenação e two-step
  transfer já existem:
  - `Leilao.sol:59-61` — `constructor() { coordenacao = msg.sender; }` (o deployer vira coordenação inicial).
  - `Leilao.sol:130-140` — `iniciarTransferenciaCoordenacao(novaCoordenacao)` (only coordenação) + `aceitarTransferenciaCoordenacao()` (só o pendente aceita). É o mecanismo de transferência segura (M-02).
- `desafio-gut/hardhat.config.js:13-20` — **só a rede `sepolia` está configurada**. NÃO há rede `mainnet`. Excerto atual:
  ```js
  networks: {
    sepolia: { type: "http", url: process.env.RPC_URL || "", accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [], chainId: 11155111 },
  },
  ```
- `desafio-gut/ignition/modules/Leilao.js` — módulo Ignition `LeilaoModule` que faz `m.contract("LeilaoGUT")`. É o caminho de deploy (o `deploy.js` da raiz é um stub vazio).
- `desafio-gut/frontend/netlify/functions/_lib/signer.mjs` — `assertChaveBrutaAusenteEmMainnet()` recusa arrancar se `NETWORK_STAGE=mainnet` e `COORDENACAO_PRIVATE_KEY` presente (MC30.1, R9). O backend mainnet usa Biconomy Smart Account + KMS.
- Pré-requisitos e flip já documentados em: `Desktop\MC40-checklist.md`,
  `desafio-gut/docs/mainnet-prerequisites.md`, `cloud.md §9.12`, `security_audit.md` (MC39).
- Endereço Sepolia atual (referência, NÃO reusar em mainnet): ver `CLAUDE.md` (Smart Contracts Ativos).

## Commands you will need
| Purpose | Command (rode em `desafio-gut/`) | Expected |
|---|---|---|
| Instalar deps contrato | `npm install` | exit 0 |
| Compilar | `npx hardhat compile` | "Compiled" sem erros |
| Testes do contrato | `npx hardhat test` | todos passam |
| Foundry (fuzz) | `forge test` (config `foundry.toml`) | passa |
| Echidna (property) | `echidna . --config echidna.yaml` | sem contraexemplos |
| Deploy mainnet | `npx hardhat ignition deploy ignition/modules/Leilao.js --network mainnet` | imprime endereço deployado |
| Verificar Etherscan | `npx hardhat verify --network mainnet <ADDR>` | "Successfully verified" |

> **Nota:** CI (foundry/echidna/audit) está historicamente vermelho na `main` por infra/deps
> (memória `ci-checks-vermelhos`); rode estes gates LOCALMENTE e anexe a saída ao PR.

## Scope
**In scope** (arquivos que este plano pode tocar):
- `desafio-gut/hardhat.config.js` — adicionar rede `mainnet` (Passo 1).
- `plans/README.md` — atualizar status.
- (pós-deploy) variáveis Netlify e painel AWS/Biconomy/Privy — `[OPERADOR]`, não são arquivos.

**Out of scope** (NÃO tocar):
- `desafio-gut/contracts/Leilao.sol` — o contrato está auditado/estável; NÃO mude o código
  antes do deploy (qualquer mudança exige re-auditoria). O deploy usa o bytecode atual.
- Qualquer caminho de dados Supabase (rede ≠ backend de dados).
- `NETWORK_STAGE` no frontend/backend até TODO o pré-flight estar verde (Passo 6).

## Git workflow
- Branch: `feat/mc40` (a partir da `main` atualizada).
- Commits estilo conventional (ex.: `chore(mc40): add mainnet network to hardhat.config`).
- NÃO fazer push/PR sem instrução do operador. Merge na `main` exige `--admin` (CI vermelho — infra).

## Steps

### Step 1 — Adicionar a rede `mainnet` ao Hardhat
Em `desafio-gut/hardhat.config.js`, dentro de `networks`, adicionar (ao lado de `sepolia`):
```js
mainnet: {
  type: "http",
  url: process.env.MAINNET_RPC_URL || "",
  accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
  chainId: 1,
},
```
> `DEPLOYER_PRIVATE_KEY` é a chave do **deployer** (efêmera, financiada só p/ o deploy) —
> NÃO é a coordenação final (que será a Smart Account KMS). Após o two-step transfer, o
> deployer perde o controlo. NUNCA commitar a chave (R9); ela vive só no `.env` local do operador.

**Verify**: `cd desafio-gut && grep -A5 'mainnet:' hardhat.config.js` → mostra o bloco com `chainId: 1`.

### Step 2 — `[OPERADOR]` Auditoria externa do contrato (gate de bloqueio)
Contratar/concluir a auditoria externa do `Leilao.sol` (pré-requisito firme do MC40 —
`mainnet-prerequisites.md`). Anexar o relatório ao PR. **STOP se a auditoria apontar HIGH/CRITICAL** não resolvido.

**Verify**: relatório de auditoria anexado + `npx hardhat test` + `forge test` + `echidna` verdes localmente (saída anexada).

### Step 3 — `[OPERADOR]` Provisionar infra mainnet
- RPC mainnet (Alchemy/Infura) → valor de `MAINNET_RPC_URL` e `CONSOLIDATION_RPC_URL` (Flashbots Protect) + fallback `CONSOLIDATION_RPC_URL_FALLBACK`.
- AWS KMS: `KMS_PROVIDER=aws`, `KMS_KEY_ID` apontando a chave mainnet; Biconomy (`BICONOMY_*`) mainnet + `BICONOMY_BUNDLER_URL_FALLBACK`.
- Smart Account de coordenação criada e **financiada** em mainnet (gas) OU Paymaster ativo.
- `MP_WEBHOOK_SECRET` definido no Netlify (pendência herdada do MC39.17 — webhook Mercado Pago).

**Verify**: operador confirma cada item; nenhuma chave bruta exibida (R10). KMS responde a um `getPublicKey` de teste (endereço derivado anotado).

### Step 4 — Deploy do contrato em mainnet
Com `MAINNET_RPC_URL` + `DEPLOYER_PRIVATE_KEY` (deployer financiado) no `.env`:
```
cd desafio-gut && npx hardhat ignition deploy ignition/modules/Leilao.js --network mainnet
```
Anotar o **endereço deployado** = `CONTRATO_MAINNET`. Depois verificar no Etherscan:
`npx hardhat verify --network mainnet <ADDR>`.

**Verify**: endereço impresso; `npx hardhat verify` → "Successfully verified"; `coordenacao()` lido on-chain == endereço do deployer (estado inicial, antes do transfer).

### Step 5 — Two-step transfer da coordenação para a Smart Account
Como o **deployer** (coordenação inicial), chamar `iniciarTransferenciaCoordenacao(<SmartAccountAddr>)`.
Depois, como a **Smart Account (KMS)**, chamar `aceitarTransferenciaCoordenacao()`.

**Verify**: `coordenacao()` on-chain == endereço da Smart Account; `coordenacaoPendente()` == `0x000…0`.
Anotar a tx hash de cada passo. **STOP se `coordenacao()` não bater** — não prosseguir para o flip.

### Step 6 — `[OPERADOR]` Variáveis Netlify (contexto production) + FLIP
Seguir `Desktop\MC40-checklist.md` seção B/C exatamente:
- `CONTRATO_MAINNET=<endereço real do Step 4>` (NÃO o placeholder `0x000…0`).
- `CONSOLIDATION_RPC_URL=<Flashbots/RPC real>`; `MAINNET_CHAIN_ID=1` (já definido).
- Confirmar `COORDENACAO_PRIVATE_KEY` **AUSENTE** (`signer.mjs:assertChaveBrutaAusenteEmMainnet` recusa arrancar se presente).
- `SIGNER_BACKEND` ausente (default por stage) ou `=biconomy`; `BICONOMY_*`/`KMS_*` apontando mainnet.
- Flip: `netlify env:set NETWORK_STAGE mainnet --context production` → `netlify deploy --build --prod`
  (deploy real força recompilação com a env; commit vazio NÃO redesdobra — gotcha OPS-1/MC33).

**Verify**: `netlify env:list --context production | grep -E 'NETWORK_STAGE|CONTRATO_MAINNET'` mostra mainnet + endereço real (NÃO exibir segredos completos — R10). Deploy `ready`.

### Step 7 — Validação pós-flip (produção)
- `curl .../.netlify/functions/health` → reporta modo mainnet, `chaveBrutaEmMainnet=false`, `SIGNER_READY` ok.
- Lance de teste controlado → `lance-relampago` segue a blindagem MC28 (commit on-chain real); confirmar `commitmentHash` + tx de `comprometerLanceOnchain` na mainnet.
- `consolidar-lances` (admin) → consolida contra `CONTRATO_MAINNET`; verificar EIP-712 domain (chainId 1).
- Suite local verde; Supabase (cotas/financeiro) inalterado.

**Verify**: cada item acima confirmado; tx reais visíveis no Etherscan mainnet.

## Test plan
- Pré-deploy: `npx hardhat test` + `forge test` + `echidna` localmente, saída anexada ao PR.
- Pós-deploy: smoke controlado (1 lance + 1 consolidação) com valores mínimos reais; registrar tx hashes.
- Não há "novos testes" de código — o contrato é imutável; o gate é a auditoria + os testes existentes verdes.

## Done criteria (ALL must hold)
- [ ] `hardhat.config.js` tem rede `mainnet` (chainId 1) — `grep 'chainId: 1' desafio-gut/hardhat.config.js`.
- [ ] Auditoria externa concluída sem HIGH/CRITICAL aberto (relatório anexado).
- [ ] Contrato deployado em mainnet + verificado no Etherscan; `CONTRATO_MAINNET` anotado (≠ placeholder).
- [ ] `coordenacao()` == Smart Account (KMS); `coordenacaoPendente()` == `0x0`.
- [ ] `/health` em prod: modo mainnet, `chaveBrutaEmMainnet=false`.
- [ ] Smoke: 1 lance + 1 consolidação on-chain mainnet com tx hash registrado.
- [ ] `plans/README.md` status row atualizado.

## STOP conditions
- Auditoria externa aponta HIGH/CRITICAL não resolvido.
- `coordenacao()` ≠ Smart Account após o two-step (NÃO flipar).
- `/health` reporta `chaveBrutaEmMainnet=true` ou `SIGNER_READY=MISSING` em mainnet.
- Qualquer excerto de "Current state" divergente do código vivo (drift).
- Necessidade de alterar `Leilao.sol` (exigiria re-auditoria → fora deste plano).

## Maintenance notes
- Rollback: `netlify env:unset NETWORK_STAGE` (ou `=sepolia`) + `netlify deploy --build --prod` → volta a Sepolia. Nenhuma migração de dados (rede ≠ backend; Supabase intacto).
- Os caminhos mainnet fazem gate APENAS por `NETWORK_STAGE` (não validam se o contrato é real) → o flip só é seguro com `CONTRATO_MAINNET` real (Step 6).
- Revisor deve escrutinar: ausência de chave bruta em prod, `coordenacao()` correto, EIP-712 chainId.
- Deferido: rever painel Privy (domínios/MFA/HttpOnly) e ~39 advisories transitivos (MC40-checklist).
