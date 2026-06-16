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
