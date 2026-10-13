# UTAC110d — DOIS PASSES: modelo de dados + lógica (backend)

Skill: `desafio-gut/frontend/skills/utac/` (tipo `produto`). Baseline `b677e92` (= `a0ab217` + 1 commit só de docs).
Commit de código: **`cfe9faa`**. SEG-1: `_logs/UTAC110d_SEG-1_MEDICAO.md`.

## Decisões do operador (R18 — registadas aqui, no relatório do Desktop e no R14 do CLAUDE.md)
- **R18-110d-1** Onde guardar → opção (b): colunas novas NA MESMA LINHA de `public.pontos`
  (`creditos_lance`, `pontos_lance`, `INTEGER DEFAULT 0 CHECK >= 0`). Sem alterar PK nem FK.
- **R18-110d-2** O lance consome **só 1 crédito de lance**. Pontos de lance NÃO são consumidos pelo lance.
  O Art. 16º VI deve dizer «crédito de lance» (não «pontos de lance") — **correcção ao regulamento fica
  para update futuro (pendência registada)**.
- **R18-110d-3** Débito R$ no lance: **mantido atrás de flag DESLIGADA** — `const DEBITO_SALDO_LANCE_ATIVO = false;`.
  Não removido (está na mainnet).
- **R18-110d-4** 10 pontos por Passe: **só compras novas**, não retroactivo (o Regulamento v5 entra em vigor a 02/11).
- **A14 (R18)** «feche o que for necessário»: fechados 8 servidores MCP desta sessão sem uso no UTAC + o Claude
  Desktop da bandeja (sem janela) → RAM 1.648/1.642/1.657 MB.

## 1. FRENTE A — modelo de dados

| peça | o quê |
|---|---|
| `supabase/migrations/20261013_utac110d_ledger_lance.sql` | `ADD COLUMN creditos_lance`, `pontos_lance` (int, default 0, CHECK ≥ 0) e **`historico_lance`** (jsonb `[]`, CHECK array) |
| `_lib/ledger-lance.mjs` (novo) | `lerLedgerLance`, `creditarCreditoLance` (+1, motivo `passe-relampago`), `consumirCreditoLance` (−1, motivo `lance`), `creditarPontosLance` (SÓ motivos de engajamento: boas-vindas, login, missao, indicacao, sequencia), `reverterMovimentoLance` |
| `_lib/passe-pontos.mjs` (aditivo, +18/−0) | `PONTOS_FIDELIDADE_POR_PASSE = 10`, `TIPOS_PASSE`, `refPasse(tipo, chave)` = `passe-<tipo>:<chave>` |

**Extensão declarada — `historico_lance`:** a decisão 1 fala de 2 colunas; acrescentei a 3.ª porque partilhar o
`historico` de fidelidade faria duas escritas CAS sobre colunas diferentes reescreverem o MESMO array (uma
perderia a entrada da outra). Cada ledger tem o seu array e o seu CAS: `aplicarMovimento` (fidelidade) escreve só
`pontos/historico`; o ledger de lance escreve só as suas 3 colunas, com CAS sobre os DOIS contadores.
**Módulo separado** de `passe-pontos.mjs` porque o `lance-relampago` o importa e os testes dele simulam
`edicoes-core` só com `buscarEdicao` (o `passe-pontos` importa `EDICAO_ID_RE` de lá).

**Migração testada em produção, numa transacção REVERTIDA** (bloco `DO` terminado em `RAISE EXCEPTION`, técnica
do MC105a.1). Resultado:
`apply_ok;linhas=2;com_defaults=2;pontos_intactos;neg_creditos=23514;neg_pontos_lance=23514;hist_obj=23514;rollback_colunas=4;reapply_colunas=7`.
Confirmado depois: a produção ficou com as 4 colunas originais e 2 linhas. ⚠️ **A migração NÃO foi aplicada em produção**
(o enunciado autoriza CRIAR migrações; aplicar é decisão do operador — ver «Antes do push»).

## 2. FRENTE B — endpoints

| endpoint | efeito |
|---|---|
| `comprar-passe-relampago.mjs` (novo) | R$ 2,00 → +10 pontos de fidelidade (`tipo:"compra"` ⇒ conta para o cartão) **+1 crédito de lance**. Pontos de lance: **0**. |
| `comprar-passe-programado.mjs` (novo) | R$ 2,00 → +10 pontos de fidelidade. Não toca no ledger de lance. |
| `_lib/comprar-passe-tipado.mjs` (novo) | handler partilhado; tipo fixado pelo endpoint (nunca pelo corpo) |
| `ler-pontos.mjs` (aditivo) | + `fidelidade:{total,historico}` e `lance:{creditos,pontos,historico}`; campos antigos iguais |
| `comprar-passe-pontos.mjs` | **deprecated** (só comentário) — continua a dar 1 ponto, porque a UI actual (`useComprarPasse.js`) ainda o chama |

Fluxo da compra (por leitura do `comprar-passe-pontos`): idempotência pela `ref` tipada → débito CAS → +10 pontos →
(Relâmpago) +1 crédito. Falha depois do débito → desfaz o que entrou (`reverterMovimento`) + reembolso; reembolso
ou reversão falhados → alerta Sentry. Compra Relâmpago **a meio** (pontos sim, crédito não) → o retry completa o
crédito **sem cobrar**. 5 cliques simultâneos → cobra 1× e credita 1× (teste B5).

**Desvios declarados:**
- **`registar-lance.mjs` NÃO criado.** O consumo do crédito vive dentro do `lance-relampago.mjs` (Frente C), o único
  caminho de lance. Um 2.º endpoint seria um 2.º caminho com risco de consumo duplo. Se o operador o quiser como
  fachada, é UTAC próprio.
- **«1 palpite por Passe Programado» NÃO foi imposto.** Hoje o `registar-palpite` exige apenas ter linha em `pontos`
  (qualquer Passe) e 1 palpite por edição. Impor 1:1 muda o direito dos compradores actuais ⇒ **decisão de produto,
  escalada** (opção medida: contar compras `passe-programado:`/genéricas vs palpites registados, sem coluna nova).
  `registar-palpite.mjs` intacto.

## 3. FRENTE C — integração com o MLC (`lance-relampago.mjs`, +35/−2)
- Ramo relâmpago, com `DEBITO_SALDO_LANCE_ATIVO = false`: `consumirCreditoLance(endereco, "lance:<lanceId>")`.
  - Sem créditos → **400 `sem_creditos_lance`** («Sem créditos de lance suficientes — compre um Passe Relâmpago…»), sem
    blindagem, sem gravação e **sem cair no débito R$**.
  - Falha do store → 502 `consumo_credito_falhou`.
- Blindagem mainnet falhou (`comprometerLanceOnchain`/`addLance`) → **o crédito é devolvido** (`reverterMovimentoLance`).
- **SEG4 W5:** a `ref` do consumo deriva da `idempotencyKey` (`lance:<chave>`; sem chave, `lance:<lanceId>`). Dois pedidos concorrentes com a mesma chave: o 2.º recebe **409 `lance_em_processamento`** (sem 2.º crédito, sem 2.º lance).
- Resposta: + `creditoLanceConsumido`, `creditosLanceRestantes`; `saldoRs*` = null.
- **Intactos:** ramo programado (senhas on-chain + ledger), janela da edição, idempotência `lance-idem`, `keccak256` +
  `comprometerLanceOnchain` + `addLance`, ramo legado não-mainnet. Com a flag a `true`, o ramo antigo é byte a byte o mesmo.
- O `lanceId` passou a ser gerado antes do passo 6 (mesmo valor, só mais cedo) para dar a `ref` do consumo.
- ⚠️ **Consequência:** com a migração aplicada e o código no ar, **ninguém licita no relâmpago sem comprar um Passe
  Relâmpago** (todos começam com 0 créditos). Hoje o `EM_BREVE_MODE = true` esconde-o.

## 4. Verificação
- Suíte canónica (A14 ≥ 1.500 MB): **frontend 979/979 · backend 1124/1130 — VERDE** (baseline 1104/1110; +20).
- Testes novos `_tests/utac110d-dois-passes.test.mjs` (19): ledger real, handler de compra real, `saldoRs` real, JWT
  ASSINADO (o `lance-auth` → 401, bidireccional), `ler-pontos` real; duplo de `pontos` com as colunas da migração e
  os CHECKs (42703/23514). Inclui: compra não credita pontos de lance; lance não toca fidelidade nem pontos de lance;
  ledgers separados; CAS concorrente; 402; falha do crédito desfaz pontos + reembolsa; compra a meio; 10 pontos contam
  para o cartão; `ler-pontos` com os dois ledgers.
- Testes antigos com o contrato mudado por R18-110d-3 (`mc9112`, `mc941`): o «relâmpago debita R$» passou a «consome
  1 crédito»; **a invariante mantém-se** (custo cobrado antes do registo; nunca consome senha); + caso «sem créditos»
  e «blindagem falha → crédito volta».
- **SEG4 W3:** o CAS do ledger de lance inclui `atualizado_em` (versão da linha) — fecha o ABA que apagava entradas do histórico (crédito grátis no retry).
- **Depois do SEG4: suíte 979/979 · 1128/1134 VERDE; mutação 15/15 PROVADOS** (+M12 ref constante, M13 CAS sem pontos_lance, M14 CAS sem versão, M15 sem 409).
- (1.ª ronda) **Mutação 11/11 PROVADOS** (`_tests/utac110d-prova-mutacao.mjs`, baseline verde exigida, restauro md5 idêntico).
- Validador adversarial: **APROVADO COM RESSALVAS, 0 bloqueantes de código, 1 condição de liberação (L1)** — `_logs/UTAC110d_SEG4_VALIDADOR.md` (com a resposta do executor; correcções NÃO re-validadas em 2.ª ronda).

## 5. Pendências
1. **Aplicar a migração 20261013 em produção ANTES do push** (o push dispara o auto-deploy do Netlify; sem as colunas,
   o `lance-relampago` responde 502 a qualquer lance relâmpago e as compras tipadas falham). Decisão do operador.
2. Corrigir o Art. 16º VI do Regulamento («crédito de lance») — update futuro (R18-110d-2).
3. Fontes de pontos de lance (login, missões, indicações) — UTAC próprio; a função `creditarPontosLance` já existe.
4. «1 palpite por Passe Programado» — decisão de produto (acima).
5. 110d-front: a UI ainda compra pelo endpoint genérico (1 ponto) e não mostra créditos de lance.
6. **W4 (SEG4):** falha dupla (crédito + reversão dos pontos) deixa 10 pontos grátis — só alerta Sentry; reconciliação = UTAC próprio.
7. **ABA no ledger de FIDELIDADE** (`aplicarMovimento`, CAS só em `pontos`) — pré-existente, mesma classe do W3; não tocado.
8. Fora do AUTORIZA, não tocado: `_logs/DEBT.md` (as pendências acima ficam aqui até haver autorização).
