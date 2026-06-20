# Security Audit — MC28.1 (Blindagem de Privacidade dos Lances / Anti-Bot)

> PILAR 1 (SUPERPERS): nenhum código entra em produção sem passar por este ficheiro.
> Branch `feat/mc28.1` · Abordagem A2 (Compromisso Cego + Key-Per-Bid) · só `NETWORK_STAGE === 'mainnet'`.

## 1. Modelo de ameaça resolvido

| ID | Risco (MC28.txt) | Mitigação MC28.1 |
|----|------------------|------------------|
| G-1 | Valor em claro no mempool/calldata (front-running) | Em mainnet o lance NUNCA vai on-chain em claro — só `keccak256(abi.encode(valor,endereco))` via `comprometerLance`. |
| G-2 | Valor em claro no blob público `lances-flash` (bot scan) | `lances-flash` em mainnet devolve `{oculto:true, valor:null}`; `acao=verificar` → 403. |
| G-3 | Race condition no blob único (perda de lances) | Stateless Key-Per-Bid: 1 chave imutável por lance, sufixo `randomUUID().slice(0,8)` (anti-colisão). Provado: 150 concorrentes → 150 chaves. |
| G-6 | Sem anti-replay/anti-MEV na coordenação | Consolidação assinada EIP-712 + `edicaoNonce` on-chain + envio via Flashbots Protect. |

## 2. Separação EIP-712 off-chain vs `edicaoNonce` on-chain (decisão-chave)

A blindagem usa **duas camadas distintas e complementares** — não confundir:

- **EIP-712 (off-chain) — recibo criptográfico de auditoria.**
  `consolidar-lances.mjs` assina `Consolidacao{idEdicao, vencedor, menorUnico, nonce}`
  com domínio `{name:LeilaoGUT, version:1, chainId, verifyingContract}`. Esta
  assinatura **não é verificada on-chain** — serve como prova auditável,
  reproduzível e atribuível de qual decisão a coordenação tomou e com que nonce.
  Por isso **não** se importou `@openzeppelin/contracts` (EIP712/ECDSA) para o
  contrato: mantém-se enxuto, com menor superfície de ataque (ITEM 1.3).

- **`edicaoNonce` (on-chain) — anti-replay nativo, a fonte de verdade de segurança.**
  `consolidarResultado` exige `require(!resultados[idEdicao].consolidado)` e faz
  `edicaoNonce[idEdicao]++`. Uma edição **não pode** ser reconsolidada; uma
  assinatura/decisão de uma edição/nonce anterior é inútil porque o estado
  on-chain já avançou. O anti-replay **não depende** da assinatura off-chain.

> Resumo: a segurança anti-replay é **on-chain** (`edicaoNonce` + idempotência).
> A assinatura EIP-712 é **auditoria off-chain**, não um gate de segurança.

## 3. Controlo de acesso

- `comprometerLance` / `consolidarResultado`: `apenasCoordenacao` (modificador já
  existente e testado, reutilizado — zero nova superfície).
- `consolidar-lances.mjs`: `guardAdmin` (admin-JWT **ou** `x-admin-token`) + gate
  `NETWORK_STAGE==='mainnet'`. Testado: não-admin → 401; fora de mainnet → 409.
- Abordagem A2: a coordenação (relayer confiável) submete o commitment apontando
  para o endereço real do participante → auditabilidade pública sem 2ª assinatura.
- Custódia da `COORDENACAO_PRIVATE_KEY`: fora do bundle (só funções Lambda). A sua
  isolação reforçada está agendada para o MC30 (fora do âmbito deste PR).

## 4. Integridade do hash (compatibilidade EVM)

Backend: `keccak256(AbiCoder.defaultAbiCoder().encode(["uint256","address"],[valor,endereco]))`.
Isto é exatamente `keccak256(abi.encode(valor, lancador))` na EVM. Testado:
determinístico, formato `bytes32` (66 chars), e sensível a valor/endereço.

## 5. Resultados dos testes (offline, `node --test`)

| Suite | Testes | Estado |
|-------|--------|--------|
| `mc28-keyperbid.test.mjs` | anti-colisão, 150 concorrentes, 1500 c/ paginação <5s, marcador | 4/4 ✅ |
| `mc28-seguranca.test.mjs` | hash EVM-compat, apuração Art. VIII, authz, gate ambiente, idempotência | 6/6 ✅ |
| Suites pré-existentes (regressão) | cota, referral-throttle, troco-senhas | 17/17 ✅ |
| **Total** | | **27/27 ✅** |

Build: `vite build` verde · Contrato: `hardhat compile` verde (solc 0.8.20).

## 6. Limitações conhecidas / follow-ups honestos

- **Testes Foundry (`.t.sol`) não adicionados neste PR**: `forge` está ausente no
  ambiente de desenvolvimento; adicionar testes não compiláveis quebraria o CI. A
  authz/idempotência/nonce on-chain estão cobertas por código compile-verified e
  trivialmente correto (`apenasCoordenacao`, `require(!consolidado)`, `nonce++`).
  Adicionar asserções Foundry quando `forge` estiver disponível.
- **Verificação visual do display mainnet** (tabela blindada + reveal do vencedor):
  não executável localmente (sem contrato/ENV mainnet). O caminho Sepolia é
  byte-idêntico (gating) → zero regressão verificada por build. Recomenda-se um
  passo de validação visual (claude-eyes) em staging com `NETWORK_STAGE=mainnet`.
- **`saldoRs.mjs`** mantém o padrão read-modify-write (mitigado por idempotência);
  fora do âmbito do MC28.1 (G-5, iteração futura).

---

# Security Audit — MC30.1 (Isolamento da Chave Mestra · OpenZeppelin Defender Relay)

> PILAR 1 (SUPERPERS): este apêndice cobre a migração da assinatura da coordenação.
> Branch `feat/mc30.1` · Endurece a camada introduzida no MC28.1 (consolidação
> assinada pela coordenação). Baseado em `MC30.plano.txt`.

## 1. Ameaça resolvida

A `COORDENACAO_PRIVATE_KEY` era lida de `process.env` e injetada num `ethers.Wallet`
na RAM da Function em **três** sítios independentes (`_lib/contract.mjs:67`,
`consolidar-lances.mjs:68`, `_lib/ia-preditiva.mjs:274`). Quem detivesse a chave
podia cunhar senhas, abrir edições, forjar compromissos e **decidir o vencedor**
(`apenasCoordenacao` em `Leilao.sol`). Superfície crítica:

| ID | Risco | Mitigação MC30.1 |
|----|-------|------------------|
| S-1 | Env do Netlify comprometido → chave bruta lida das vars | Em mainnet a chave deixa de existir no env; só credenciais de API escopadas e **revogáveis** do Defender. |
| S-2 | Supply-chain npm in-process lê `process.env`/hooka `Wallet` | A chave **nunca entra no processo** — vive no HSM do Defender; o backend só fala API. |
| S-4 | Chave persistida em RAM no container quente | Sem chave em RAM no backend Defender. |

## 2. Nova fronteira de confiança

- **Assinatura centralizada** em `_lib/signer.mjs` (fachada única). `new Wallet(...)`
  existe agora **apenas** nesse ficheiro (verificado por grep) — de 3 pontos de
  exposição para 1.
- **Backend selecionável** por `SIGNER_BACKEND` (explícito) ou `NETWORK_STAGE`
  (`mainnet → defender`, restante → `local-key`). Isolamento por ambiente (R3):
  Sepolia/localhost mantêm uma chave de testnet de baixo valor; mainnet usa o HSM.
- **Defender Relay (HSM)** via `@openzeppelin/defender-sdk` (Ethers v6). O Relayer
  envia a tx como o **seu próprio EOA**; basta transferir a coordenação para esse
  endereço pelo two-step já existente (`iniciarTransferenciaCoordenacao` +
  `aceitarTransferenciaCoordenacao`) — **zero alteração no `Leilao.sol`** (R10).
- **Recibo EIP-712** continua a ser produzido pelo signer ativo (Defender suporta
  `signTypedData`); permanece auditoria off-chain, **não** gate de segurança
  (anti-replay é o `edicaoNonce` on-chain — coerente com o MC28.1).

## 3. Guarda anti-reintrodução (ITEM 3.5)

`assertChaveBrutaAusenteEmMainnet()` é chamada no início de
`obterSignerCoordenacao`: se `NETWORK_STAGE==='mainnet'` **e** uma chave bruta
estiver presente, recusa arrancar. `health.mjs` expõe `CHAVE_BRUTA_EM_MAINNET:
ALERT` no mesmo caso. `health.mjs`/`debug-pedido.mjs` reportam agora o **modo**
de assinatura (`SIGNER_BACKEND`), não a presença da chave.

## 4. Resultados dos testes (offline, `node --test`)

| Suite | Cobertura | Estado |
|-------|-----------|--------|
| `mc30-signer.test.mjs` | seleção de backend, local-key, handshake Defender (mock), rejeição da chave bruta em mainnet | 8/8 ✅ |
| `mc30-integracao.test.mjs` | `creditarSenhas`/`comprometerLanceOnchain` assinam via fachada | 3/3 ✅ |
| Suites pré-existentes (regressão) | mc28 + cota + referral + troco | 27/27 ✅ |
| **Total** | | **38/38 ✅** |

Build `vite build` verde. `node --check` verde em todos os `.mjs`.

## 5. AÇÕES HUMANAS PENDENTES (fora do alcance do código — não executadas neste PR)

> Estas etapas exigem credenciais reais e/ou transações on-chain irreversíveis.
> O código está pronto; **a migração só se completa após estes passos**, nesta ordem:

1. **Criar a conta + Relayer no OpenZeppelin Defender** (mainnet) e registar a
   chave da coordenação no HSM. Obter `DEFENDER_API_KEY`/`DEFENDER_API_SECRET`
   (e, opcionalmente, `DEFENDER_RELAYER_ADDRESS`). — ITEM 2.1.
2. **Validar o handshake real** contra o Relayer (o teste de handshake do PR é
   mockado; só com credenciais reais se confirma o endereço e a assinatura).
3. **Transferir a coordenação on-chain** para o endereço do Relayer pelo two-step
   (`iniciarTransferenciaCoordenacao` → `aceitarTransferenciaCoordenacao`) e
   **confirmar** `coordenacao() == endereço do Relayer` ANTES do passo 4. — ITEM 3.3.
4. **Remover `COORDENACAO_PRIVATE_KEY`/`COORDENACAO_PRIVATE` do env de mainnet do
   Netlify** e definir `SIGNER_BACKEND=defender`/`NETWORK_STAGE=mainnet`. A guarda
   de runtime impede a reintrodução acidental. — ITEM 3.5 / SEGMENTO 6.
5. **(Opcional, recomendado) Gnosis Safe** como coordenação (multisig) para
   eliminar o single-point-of-failure — também via two-step, sem mudar o contrato. — SEGMENTO 7.

## 6. Limitações honestas

- O **backend Defender não foi exercitado contra a API real** (sem credenciais no
  ambiente de dev). A wiring segue os tipos do `@openzeppelin/defender-sdk` v6
  (`DefenderRelayProvider`/`DefenderRelaySigner`) e está coberta por handshake
  mockado; requer a validação do passo 2 acima antes do cutover.
- A `COORDENACAO_PRIVATE_KEY` **permanece** no caminho `local-key` (testnet) por
  desenho (R3) — a remoção total da R9 aplica-se ao **ambiente de mainnet**.

---

# §MC30.2.1 — Migração Defender → Biconomy + KMS

> Branch `feat/mc30.2.1`. Motivação: **sunset do OpenZeppelin Defender a 2026-07-01**.
> Substitui o HSM do Defender por **Biconomy (ERC-4337)** com **owner em KMS remoto**.
> Ver `docs/MC30.2.1-isolamento-chave.md`. O contrato `Leilao.sol` NÃO é alterado (R10).

## 1. Modelo de ameaças (alterações)

| # | Ameaça | Mitigação MC30.2.1 |
|---|--------|--------------------|
| S-1 | Exfiltração da chave da coordenação do env serverless | A chave **owner** vive no **KMS** (AWS KMS); nunca entra no processo Node. O KMS só recebe digests e devolve assinaturas DER. |
| S-2 | Reintrodução acidental da chave bruta | Guarda `assertChaveBrutaAusenteEmMainnet`: com `biconomy`, recusa arrancar se houver chave bruta **ou** faltar `KMS_KEY_ID`/`BICONOMY_BUNDLER_URL`. |
| S-3 | Concorrência de nonces (lances simultâneos) | Resolvida **nativamente** pelo Bundler ERC-4337 (sem fila/lock no cliente) — validado em `mc302-integracao` (ITEM 6.5). |
| S-4 | Assinatura forjada do recibo de consolidação | `signTypedData` (EIP-712) delegado ao owner KMS → ECDSA recuperável à EOA owner (idêntico ao MC30.1). |
| S-5 | `msg.sender` errado on-chain (Smart Account ≠ EOA) | Autoridade transferida ao Smart Account via two-step do contrato; `apenasCoordenacao` continua a validar sem alterar `Leilao.sol`. |

## 2. Superfície de chave

- **Antes (MC30.1):** chave no HSM do Defender (API escopada/revogável).
- **Depois (MC30.2.1):** chave **owner** no KMS; credenciais IAM escopadas/revogáveis
  substituem o segredo do ambiente. A chave privada **nunca** sai do KMS.
- A normalização criptográfica (DER → low-S + recovery id `v`) foi **validada
  ponta-a-ponta** contra `ethers` (`verifyMessage`/`verifyTypedData`).

## 3. Testes

`kms-handshake` (6/6) · `biconomy-handshake` (3/3) · `mc302-guarda` (5/5) ·
`mc302-integracao` (5/5). Regressão: **57/57**, `vite build` verde, `node --check`
verde em 89 `.mjs`. Nenhuma alteração em `src/`, GUTO, Glass UI ou `Leilao.sol`.

## 4. EXECUÇÃO DO RUNBOOK — ✅ ISOLAMENTO DA CHAVE MESTRA CONCLUÍDO (2026-06-20)

> Veredicto: **a chave mestra da coordenação está isolada.** A autoridade on-chain pertence
> agora a um Smart Account ERC-4337 cujo owner é uma chave **AWS KMS** que nunca entra no
> processo Node. As chaves antigas foram removidas do ambiente. Estado verificado on-chain.

| # | Ação do runbook | Estado |
|---|-----------------|--------|
| 1 | Chave no AWS KMS (`ECC_SECG_P256K1`) + IAM escopado; `KMS_PROVIDER`/`KMS_KEY_ID`/`APP_AWS_REGION` | ✅ provisionada; policy IAM `KMS-Sign-Key` concede `kms:Sign`+`kms:GetPublicKey` só no ARN da chave |
| 2 | `BICONOMY_*` + handshake real (KMS + Bundler) | ✅ validado em produção (build+assinatura via SDK Biconomy + owner KMS) |
| 3 | Resolver e financiar o Smart Account | ✅ `0xdEbe637d7f74C4bfe71263920F68589f0c672D92`, financiado 0.05 ETH Sepolia (SA paga o próprio gás; sem Paymaster) |
| 4 | Transferir a coordenação on-chain (two-step) e confirmar | ✅ `coordenacao() == smartAccount`, `coordenacaoPendente() == 0x0` |
| 5 | Remover `COORDENACAO_PRIVATE_KEY` e `DEFENDER_*` do env (R9) | ✅ removidas do Netlify (production) + redeploy; site HTTP 200 |
| 6 | Remover o backend `defender` do código | ✅ MC31 (`feat/mc31`): backend, `criarSignerDefender`, `@openzeppelin/defender-sdk` e `DEFENDER_*` removidos; default mainnet → `biconomy`. Ver §MC31. |
| 7 | (Opcional) Gnosis Safe multisig | 📄 MC31: runbook documentado (ver §MC31). Sem transações on-chain neste PR. |

**Provas on-chain (Sepolia, `LeilaoGUT 0x59A73Acc8E8B210C874B0E3A9eC9B8B64847F6D5`):**
- Owner KMS (EOA derivada da chave pública): `0xAEFe11EDBb32fb6727693e5994a51df8ADb5EdFF`
- Etapa 1 `iniciarTransferenciaCoordenacao`: `0xa32aaea1bad595d45c105a48b562ac4afe47a19d272be3b65c242da9f5908f5a`
- Etapa 2 `aceitarTransferenciaCoordenacao`: `0xb8d92cae7a5d2b54cb5823a8fc1448e842d706a5f63f780b2b12811c8b150812` (`success=true`)
- UserOp enviada via **bundler da Alchemy** (o Bundler v2 da Biconomy descontinuou Sepolia — eth_sendUserOperation raw, mantendo build/assinatura via SDK Biconomy + KMS).

**Higiene pós-operação:** endpoint admin `mc302-aceitar` desativado (token `MC302_DIAG_TOKEN`
removido → HTTP 503); credenciais lidas apenas em runtime, nunca persistidas no bundle.

### Pendentes residuais (não-bloqueantes para o isolamento)

1. ~~**Remover o backend `defender`** do código após o cutover de mainnet. — SEG 8.~~ ✅ **feito no MC31** (§MC31).
2. **(Opcional) Gnosis Safe** multisig como coordenação (via two-step). — SEG 9 → runbook documentado no MC31 (§MC31); execução on-chain continua pendente.
3. `COORDENACAO_PRIVATE_KEY` permanece **apenas** no caminho `local-key` (testnet) por desenho (R3).

## 5. Limitações honestas

- O backend **Biconomy não foi exercitado contra Bundler/Paymaster/KMS reais** (sem
  credenciais no dev). A wiring segue a API real da `@biconomy/account` v4
  (`createSmartAccountClient`, `PaymasterMode`, `extractChainIdFromBundlerUrl`),
  inspecionada no pacote instalado, e está coberta por handshake mockado.
- O **owner KMS** assume `KMS_PROVIDER=aws`; `turnkey`/`fireblocks` têm o desenho
  preparado mas a implementação é futura (a guarda aceita os três nomes).
- A `COORDENACAO_PRIVATE_KEY` **permanece** no caminho `local-key` (testnet) por
  desenho — a R9 aplica-se ao **ambiente de mainnet/biconomy**.

---

# §MC31 — Consolidação: remoção do Defender + Endurecimento via Gnosis Safe

> Branch `feat/mc31`. Conclui o **SEG 8** (remover o backend Defender do código) e
> documenta o **SEG 9** (runbook da Gnosis Safe multisig). `Leilao.sol` NÃO é
> alterado (R10). Nenhuma transação on-chain é executada neste PR.

## 1. SEG 8 — Backend Defender REMOVIDO do código

O backend `defender` deixou de existir. Alterações (`feat/mc31`):

| Área | Alteração |
|------|-----------|
| `_lib/signer.mjs` | Removidos: caminho `'defender'` de `backendAssinatura()`, branch no dispatcher e a função `criarSignerDefender()` (imports do SDK incluídos). Default mainnet passa de `'defender'` para `'biconomy'`. |
| Consumidores | `consolidar-lances`, `ia-preditiva`, `health`, `debug-pedido`, `contract` deixam de ramificar em `backend==='defender'`/`DEFENDER_*`; o caminho não-`local-key` exige agora `KMS_KEY_ID`/`BICONOMY_BUNDLER_URL`. |
| `package.json` | `@openzeppelin/defender-sdk` desinstalado. |
| `.env.example` | Bloco `DEFENDER_API_KEY`/`DEFENDER_API_SECRET` removido; `SIGNER_BACKEND ∈ {biconomy, local-key}`. |
| Testes | `mc30-signer`: handshake Defender substituído por guarda KMS + teste MC31 (`SIGNER_BACKEND=defender` deixa de ser reconhecido). |

**Postura de segurança:** a remoção **reduz a superfície de confiança** — elimina um
caminho de assinatura inteiro (credenciais de API do Relayer) e um pacote de
dependência. O isolamento da chave mestra (MC30.2.1) permanece intacto: a única
via de produção é `biconomy` (Smart Account ERC-4337 + owner KMS).

**Validação:** suíte **57/57** verde, `vite build` verde, `node --check` verde nos
9 `.mjs` alterados. Nenhuma alteração em `src/`, GUTO, Glass UI ou `Leilao.sol`.

## 2. SEG 9 — Runbook: Gnosis Safe multisig (2/3) como coordenação

> **Apenas documentação.** Migra a coordenação do Smart Account de owner único
> (KMS) para uma **Gnosis Safe multisig 2/3**, eliminando o ponto único de falha
> do owner. Reutiliza o mesmo mecanismo two-step do contrato (`Leilao.sol`
> inalterado). **Não executar on-chain sem aprovação humana.**

### Pré-condição

- Coordenação atual = Smart Account `0xdEbe637d7f74C4bfe71263920F68589f0c672D92`
  (owner KMS `0xAEFe11EDBb32fb6727693e5994a51df8ADb5EdFF`), confirmada on-chain
  no MC30.2.1.

### Passos

1. **Criar a Gnosis Safe (multisig 2/3)** com signers de confiança.
   - Via Safe{Wallet} (app.safe.global) na mesma rede do `LeilaoGUT`.
   - 3 signers independentes (ex.: owner KMS atual + 2 hardware wallets de
     custódia distinta); threshold = 2. Registar o `enderecoSafe`.
   - **Não** reutilizar a EOA owner KMS como signer único — anula o ganho do multisig.

2. **Iniciar a transferência (Etapa 1)** a partir da coordenação atual.
   - A coordenação (Smart Account, via owner KMS) submete a UserOp que chama
     `iniciarTransferenciaCoordenacao(enderecoSafe)`.
   - Confirmar `coordenacaoPendente() == enderecoSafe`.

3. **Aceitar a transferência (Etapa 2)** a partir da Safe.
   - Um dos signers da Safe propõe a chamada `aceitarTransferenciaCoordenacao()`;
     um segundo signer aprova (threshold 2/3); a Safe executa a transação.
   - Por ser two-step *pull*, só a `coordenacaoPendente` pode aceitar — evita
     transferir a autoridade para um endereço que não controla a chave.

4. **Verificar on-chain.**
   - `coordenacao() == enderecoSafe` **e** `coordenacaoPendente() == 0x0`.
   - Smoke: `health` reporta `signer_backend` esperado; um lance/consolidação de
     teste em ambiente controlado confirma `apenasCoordenacao` a validar a Safe.

### Rollback / segurança operacional

- Enquanto a Etapa 2 não é aceite, a coordenação **permanece** no Smart Account
  atual — a Etapa 1 é reversível repetindo `iniciarTransferenciaCoordenacao` com
  outro alvo (ou o próprio Smart Account).
- Guardar as seed phrases dos signers da Safe em custódia separada; perder 2/3
  signers torna a coordenação irrecuperável (trade-off do multisig).

### Limitações honestas

- Runbook **não exercitado on-chain** neste PR — apenas desenho. Os endereços de
  signers e o `enderecoSafe` são placeholders até à execução humana.
- `apenasCoordenacao` no `Leilao.sol` valida `msg.sender == coordenacao()`: como a
  Safe é o `msg.sender` efetivo das suas execuções, nenhuma alteração de contrato
  é necessária — a assunção deve ser reconfirmada com um lance de teste pós-migração.
