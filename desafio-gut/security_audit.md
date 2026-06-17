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
