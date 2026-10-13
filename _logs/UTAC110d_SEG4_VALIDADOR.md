# UTAC110d — SEG4 — Validador adversarial independente

**Alvo:** commit `cfe9faa` (main local, NÃO empurrado). **Worktree próprio:** `C:\Users\Moltbot\wt-seg4-110d` (helper A13, 4 junctions).
**Data:** 2026-10-13.

## Veredicto

**APROVADO COM RESSALVAS** — **0 bloqueantes de código**; **1 condição bloqueante de LIBERAÇÃO** (não empurrar antes da migração; ver ⛔ L1).

Nenhuma das alíneas (a)–(j) foi refutada no núcleo. Foram refutadas duas **garantias de teste** (2 mutantes meus sobrevivem) e
foram demonstrados por execução dois buracos de integridade em cenários de concorrência/falha dupla (ABA no histórico; Passe grátis
após falha dupla). Nenhum deles é atingível pelo caminho feliz.

## RAM (A14)

| momento | MB livres |
|---|---|
| arranque | 1594 |
| antes dos testes dirigidos | 1503 |
| antes da suíte completa | 1520 / 1508 / 1518 |

Acima do limiar (marginal) ⇒ a suíte completa foi corrida em foreground.

## Tabela (a)–(j)

| # | Tentativa de refutação | Resultado | Evidência |
|---|---|---|---|
| (a) | Os dois Passes não são separados | **NÃO refutado** | `comprar-passe-tipado.mjs:76` `ref = passe-<tipo>:<key>`; o tipo vem do endpoint, não do corpo. Mutante V5 (mesma ref nos dois) → **MORDE** (B2, B3). Sonda P4: mesma chave nos 2 endpoints → 201/201, R$ 4,00, 20 pontos, 1 crédito (2 compras — comportamento declarado). |
| (b) | Fidelidade e lance misturados / ledger de lance vaza para o histórico ou cartão | **NÃO refutado** | `aplicarMovimento` (passe-pontos.mjs:117) escreve só `endereco,pontos,historico,atualizado_em`; o ledger (ledger-lance.mjs:92-101) só `creditos_lance,pontos_lance,historico_lance`. `ler-pontos` mantém `historico` = fidelidade. Mutante V6 (misturar histórico de lance na fidelidade) → **MORDE** (B11). |
| (c) | O lance MLC ainda consome R$ com a flag off | **NÃO refutado** | `lance-relampago.mjs:233` `else if (!DEBITO_SALDO_LANCE_ATIVO)` antes do `else` de `debitarSaldoRs`; constante `false` (l.45). M1 do executor (flag true) → fail=6. Teste mc9112 «sem créditos» exige `chamadasDebitoRs === 0`. |
| (d) | Compra de Passe credita pontos de lance | **NÃO refutado** | `grep creditarPontosLance` = 0 chamadores fora do próprio módulo; `creditarCreditoLance` usa `CAMPO_CREDITOS`. Mutante V8 (crédito do Passe ir para `pontos_lance`) → **MORDE** (12 falhas). |
| (e) | O lance não valida créditos (0 passa; falha cai para débito R$) | **NÃO refutado** | `lance-relampago.mjs:240-247`: `CREDITOS_INSUFICIENTES` → 400 `sem_creditos_lance`; outro erro → 502 `consumo_credito_falhou`; **nenhum** caminho cai para o débito R$. Mutante V4 (não recusar) → **MORDE**. Sonda P2/P3 com o ledger REAL: 2 paralelos / 1 crédito → 1 ok + 1 INSUFICIENTES; 10 paralelos / 3 créditos → 3 ok, 7 recusados, contador 0. |
| (f) | Migração parte dados ou não é reversível | **NÃO refutado no conteúdo / ⚠️ re-execução** | Só `ADD COLUMN IF NOT EXISTS ... DEFAULT` + 3 CHECKs + comentários; rollback documentado. **Não medi** em BD (sem acesso, R5). ⚠️ os `ADD CONSTRAINT` **não** têm guarda de existência ⇒ re-aplicar o ficheiro falha com 42710 (a alegação «re-apply 7» não é verificável por mim). |
| (g) | Endpoints antigos partidos | **NÃO refutado** | `comprar-passe-pontos.mjs`: diff = 3 linhas de comentário. `ler-pontos`: campos antigos inalterados (B11 + `_tests/ler-pontos.test.mjs` 9/9). `registar-palpite`/`resgatar-cartao`: fora do diff. Suíte backend VERDE. |
| (h) | Lógica on-chain alterada | **NÃO refutado** | `git diff cfe9faa~1 cfe9faa -- lance-relampago.mjs`: keccak256/AbiCoder, `comprometerLanceOnchain`, `addLance`, ramo programado/senhas byte-iguais; só (1) `lanceId = randomUUID()` movido para antes do pagamento (mesmo valor, sem efeito), (2) ramo 6c' aditivo, (3) reversão no `catch` da blindagem, (4) 2 campos aditivos na resposta 201. |
| (i) | Testes falsos / mutantes não mordem | **PARCIAL — 2 garantias refutadas** | Martelo do executor re-corrido: **11/11 PROVADOS** (md5 restaurado). Os meus 8: **6 mordem, 2 sobrevivem** (V1, V2 — abaixo). |
| (j) | Âmbito saiu da área autorizada | **NÃO refutado** | `git diff --stat cfe9faa~1 cfe9faa -- desafio-gut/frontend/src package.json package-lock.json` = vazio; 13 ficheiros, todos em `netlify/functions/` + 1 migração. |

## Os meus mutantes (aplicados só no worktree; entrada confirmada por md5; restauro md5 idêntico em todos)

Script: `scratchpad/seg4-mut.mjs` (recusa correr fora do worktree do validador). Testes: os 3 do martelo + `ler-pontos` + `auth-via-b-401` (48 testes, baseline VERDE).

| Mutante | Resultado | Testes que caíram |
|---|---|---|
| V1 ref do consumo constante `lance:${endereco}` (2.º lance = no-op idempotente ⇒ grátis) | **SOBREVIVE** (fail 0) | — |
| V2 CAS sem `.eq("pontos_lance", …)` | **SOBREVIVE** (fail 0) | — |
| V3 idempotência do ledger desligada | MORDE (1) | A2 |
| V4 lance sem crédito segue em frente | MORDE (1) | RELAMPAGO sem creditos |
| V5 mesma ref nos dois Passes | MORDE (2) | B2, B3 |
| V6 histórico de lance misturado na fidelidade | MORDE (1) | B11 |
| V7 reverter não remove a entrada | MORDE (1) | A8 |
| V8 Passe Relâmpago credita `pontos_lance` | MORDE (12) | A2, A5–A8, B1, … |

## Sondas por execução (ledger e handler REAIS sobre o duplo do teste; ficheiro temporário apagado)

- **P1 — ABA no histórico (confirmado):** A lê `(creditos 1, [c1])`; entre a leitura e a escrita, um consumo B (−1) e um crédito C (+1) deixam os contadores iguais; o CAS de A casa e **reescreve `historico_lance` = `[c1, lance:a]`** — as entradas `lance:B` e `passe-relampago:C` desaparecem. Consequência medida: `creditarCreditoLance(A, "passe-relampago:C")` volta a dar `criado: true` ⇒ **+1 crédito grátis** no retry da compra C; e a entrada do lance B deixa de poder ser revertida.
- **P2/P3 — double-spend de crédito:** não reproduzido (o CAS do contador fecha-o).
- **P5 — Passe grátis após falha dupla (confirmado):** o crédito de lance falha **e** a reversão dos 10 pontos falha ⇒ 1.ª resposta 502 `{reembolsado:true, pontosDesfeitos:false}`, saldo R$ 500 (devolvido), pontos 10; retry com a mesma chave → **200**, saldo 500, pontos 10, créditos 1 ⇒ **Passe completo sem pagar**. Há `captureSecurityAlert(..._reversao_pontos_falhou)`, mas nenhum bloqueio.

## Achados

### ⛔ Bloqueante de LIBERAÇÃO (não de código)
- **L1 — Empurrar `cfe9faa` = deploy imediato com a migração por aplicar.** O push para `main` dispara o auto-deploy da Netlify. Sem as colunas, `consumirCreditoLance` lê colunas inexistentes → `ERRO_DB` → **todo o lance relâmpago dá 502**, e `comprar-passe-relampago`/`-programado` falham. Mesmo com a migração aplicada, **nenhum utilizador tem créditos e o frontend não tem como comprar o Passe Relâmpago** (`src/` sem `comprar-passe-relampago`/`creditosLance`/`sem_creditos_lance`) ⇒ o lance MLC passa a 400 para toda a gente (hoje mascarado pelo `EM_BREVE_MODE`). Ordem exigida: migração aplicada → (front 110d ou decisão explícita) → push.

### ⚠️ Avisos
- **W1 — Garantia «CAS sobre os DOIS contadores» sem teste** (V2 sobrevive). Hoje `creditarPontosLance` não tem chamadores, logo o risco é latente.
- **W2 — `lance-relampago` ignora `criado` do consumo** e o ref nunca é exercitado com o ledger real (V1 sobrevive): o mc9112 usa um duplo do ledger; nenhum teste prova «2 lances = 2 créditos» ponta a ponta. Hoje o `randomUUID` torna a colisão impossível; uma alteração futura do ref (p.ex. derivá-lo da `idempotencyKey`) passaria verde e daria lances grátis.
- **W3 — ABA no `historico_lance` (P1)**: o CAS só compara contadores, não a versão do array. Requer intercalação específica; mesma classe já existe no ledger de fidelidade (pré-existente). Fecho possível: CAS também por comprimento do histórico ou por `atualizado_em`.
- **W4 — Passe grátis após falha dupla (P5)**: reembolso feito mesmo quando os pontos não foram desfeitos ⇒ o retry completa a compra sem cobrar. Alternativa: não reembolsar quando `rev` falha (fica cobrado + alerta) ou marcar a ref como «estornada» para o retry não a tratar como compra paga.
- **W5 — Idempotência do LANCE não cobre concorrência**: dois pedidos simultâneos com a mesma `idempotencyKey` passam ambos o passo 5 e consomem **2 créditos** (refs `lance:<uuid>` distintas). Pré-existente para o débito R$, mas o ref do crédito poderia ter sido `lance:<idempotencyKey>` para o fechar.
- **W6 — Migração não re-executável** (`ADD CONSTRAINT` sem guarda) — re-aplicar dá 42710.
- **W7 — Testes antigos actualizados**: mantêm a invariante «custo cobrado antes do registo; nunca consome senha» e passaram a exigir que a falta de crédito **não** caia no débito R$ (mais forte). Mas o «custo R$» original já não tem guarda nenhuma (é decisão R18-110d-3; o M1 do executor cobre a flag).

### ℹ️ Notas
- **N1** — A reversão do crédito no `catch` da blindagem também corre se `comprometerLanceOnchain` teve sucesso e só o `addLance` falhou ⇒ commitment on-chain sem crédito consumido (antes: R$ debitado e não devolvido). Aceitável, mas assimétrico.
- **N2** — Erros 502 expõem só códigos internos curtos (`ERRO_DB`, `CONFLITO_CONCORRENCIA`); sem PII nem mensagens do Supabase.
- **N3** — `lanceId` passou a ser gerado antes do pagamento; mesmo valor no registo, sem efeito observável.
- **N4** — Mesma `idempotencyKey` nos dois Passes ⇒ 2 cobranças (declarado e testado em B3).
- **N5** — Declarações do executor confirmadas: martelo 11/11; suíte **frontend 979/979 · backend 1124/1130 VERDE** (reproduzido no worktree).

## Suítes medidas no worktree

- Dirigidos (5 ficheiros, 48 testes): **48/48**.
- `npm test < /dev/null` (harness mc966): **frontend VERDE 979/979 · backend VERDE 1124/1130** · VEREDITO VERDE.
- Martelo do executor: **11/11 PROVADOS**, restauro md5 idêntico.

## Limpeza do worktree

`node scripts/worktree-helper.mjs remover C:/Users/Moltbot/wt-seg4-110d` → 4 junctions `rmdir` OK → `git worktree remove` exit 0 → `{"ok":true,"nota":"removido"}`. Directório ausente; `git worktree list` sem entrada. `node_modules` reais intactos (frontend 498 · functions 414). Árvore principal **não tocada** por mim (o `package-lock.json` sujo e os `_logs/MC100_*` não versionados já lá estavam).

---

## Resposta do executor (pós-veredicto, mesma ronda) — NÃO re-validada por 2.ª ronda

| achado | tratamento |
|---|---|
| ⛔ L1 liberação | **Aceite.** O push de `cfe9faa`+correcções = deploy. Ordem: migração em produção → (front ou decisão explícita) → push. **Escalado ao operador; NÃO empurrado.** |
| ⚠️ W1/V2 CAS sem `pontos_lance` sem teste | **Fechado:** teste A7b + mutante **M13 → RED**. |
| ⚠️ W2/V1 ref constante sobrevivia | **Fechado:** a ref deriva da `idempotencyKey` (ou do `lanceId`); duplo do ledger passou a ser idempotente por ref como o real; teste «2 lances = 2 créditos» + **M12 → RED**. |
| ⚠️ W3 ABA no `historico_lance` (crédito grátis) | **Fechado:** CAS passou a incluir `atualizado_em` (versão da linha), em `aplicar` e em `reverterMovimentoLance`; teste A7c + **M14 → RED**. ℹ️ A mesma classe no ledger de FIDELIDADE (`aplicarMovimento`, pré-existente) **não foi tocada** — fora do escopo, pendência. |
| ⚠️ W4 Passe grátis após falha dupla | **Declarado, não corrigido:** exige reconciliação (job) — fora do escopo. Fica o alerta Sentry `comprar-passe-relampago_reversao_pontos_falhou`. |
| ⚠️ W5 mesma `idempotencyKey` concorrente = 2 créditos | **Fechado:** o 2.º pedido recebe `criado:false` → **409 `lance_em_processamento`**, sem 2.º lance e sem devolver o crédito do outro; **M15 → RED**. |
| ⚠️ W6 migração não re-executável | **Fechado:** `DROP CONSTRAINT IF EXISTS` antes do `ADD`; sonda revertida em produção: `apply1_ok;apply2_ok;defaults=2;neg=23514`, produção intacta (4 colunas, 2 linhas). |
| ⚠️ W7 | Nada a fazer (a invariante ficou mais forte). |
| ℹ️ crédito devolvido quando o commit on-chain passou e só o `addLance` falhou | Declarado: o lance não fica registado (`registro.key` em falta ⇒ 502), logo o crédito volta; o commitment órfão on-chain é o comportamento pré-existente da blindagem. |

**Verificação depois das correcções:** martelo **15/15 PROVADOS** (era 11/11; +M12..M15; o M9 chegou a sobreviver por eu ter feito o escritor do A7 mudar também a versão — reposto, volta a morder); suíte canónica **frontend 979/979 · backend 1128/1134 VERDE** (RAM 1.557 MB).
