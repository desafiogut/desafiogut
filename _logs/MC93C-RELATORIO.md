# MC93-C — Handler de fila do bónus + validação dupla independente

**Projeto:** DesafioGUT · **Data:** 2026-09-24 · **Commit base:** `3dabb10`
**Modo:** COMPLETO (SEG-1 → SEG5) · **Veredito do SEG-1:** **AJUSTAR** · **R19:** não ativada
**Validação dupla:** Validador A **REPROVADO** · Validador B **REPROVADO**
**Veredito final:** CONCLUÍDO **com ressalva material**

---

## Veredito em cinco linhas

1. **A dupla validação pagou-se, e caro.** Os dois validadores reprovaram, e entre eles encontraram três P0 que eu não vi — um deles em código já committado.
2. **O pior custava dinheiro:** o bónus repetia-se para sempre. 5 vitórias + 10 derrotas pagavam **R$ 440 em vez de R$ 40**.
3. **O meu próprio handler não funcionava:** `.eq(col, null)` não é `IS NULL` — o compare-and-set não existia.
4. **Os três P0 estão corrigidos e testados.** 507/507 verdes, 18 de 19 mutantes mortos.
5. **Não activar** sem aplicar a migração, re-enfileirar a dívida órfã e reativar a R2.

---

## 1. EXECUTOR — o que foi construído

### 1.1 O SEG-1 evitou um endpoint público que emite senhas

A autorização mandava criar `netlify/functions/fila-creditar-senhas-bonus.mjs`. Tudo nessa raiz é **endpoint HTTP público** — este seria um endpoint aberto cuja função é creditar senhas. O padrão real do projeto é `_lib/worker-*.mjs` registado num mapa, invocado só pelo cron.

Refutei mais duas premissas: registar o handler exigia `fila-processor-scheduled.mjs`, fora da lista (sem essa linha o MC entregava o defeito que vinha corrigir); e o ajuste ao `pontuacao-store.mjs` era um **no-op** — o tipo já estava correcto desde o MC93-B.

### 1.2 Três condições, não uma

O MC pedia a trava por uma flag. Uma flag sozinha é **fail-open por omissão de disciplina**. A emissão exige em simultâneo: a flag (`=== "true"`, string exacta); a dívida existente e por liquidar **no livro-razão** — a idempotência ancora no registo, não na fila; e o payload a coincidir com o livro-razão **e com a regra**.

Dry-run confirmado **por execução**: com dívida perfeita em aberto, `{"emitir":false,"motivo":"flag_desligada"}`.

### 1.3 Reclamar antes de creditar

Disciplina copiada do `_lib/worker-credito.mjs`. Entre pagar a dobrar e pagar a menos, escolhe-se pagar a menos: o excesso é irreversível on-chain, a falta reconcilia-se. Se o crédito falhar, a reclamação **não** é desfeita — desfazê-la reabriria a janela de pagamento duplo.

---

## 2. VALIDADORES — os dois reprovaram

Verifiquei por execução cada alegação grave. **Todas se confirmaram.**

| | Defeito | Medição |
|---|---|---|
| **P0** (A) | **O bónus repetia-se para sempre.** `detectarConsecutivos().bonus` é cumulativo e nunca decresce; `bonus_emitido` é por ciclo. Uma bandeira por-ciclo não limita um contador que atravessa ciclos | 5 vitórias + 10 derrotas → **11 bónus = R$ 440**, com bónus em edições de 0 acertos |
| **P0** (A) | **O compare-and-set do MC93-B era neutralizado** pelo `upsert` 12 linhas acima, que repunha `bonus_emitido: false` de uma leitura anterior | "fila 40 senhas, livro-razão 20" — o sintoma que o MC93-B dizia ter corrigido |
| **P0** (B) | **`.eq(col, null)` não é `IS NULL`.** Gera `eq.null`, que o PostgREST rejeita com 400 numa coluna TIMESTAMPTZ | o CAS **não existia**; com a flag ligada, falha em 100% → DLQ |
| P1 (B) | **A suíte pinava o defeito**: a correcção `.is()` partia 6 testes, porque assertavam o valor do filtro `eq` | — |
| P1 (B) | **Dívida órfã**: em dry-run a tarefa é consumida sem liquidar, e `enfileirar` só corre quando a dívida nasce | dívidas antigas nunca serão pagas |

**Correcções:** contagem de bónus já concedidos; o upsert deixou de escrever as três colunas do cadeado (são exclusivas do CAS); `.is()` no código, com o **duplo a lançar** se alguém voltar a `.eq(col, null)`; e o duplo passou a aplicar os **DEFAULTs das colunas**, como a tabela real.

**Uma ressalva do próprio Validador B que aceito, e a culpa é minha:** despachei as duas validações em paralelo sobre a **mesma working tree**. B viu ficheiros a mudar debaixo dos pés (era A a mutar) e declarou a conformidade não-mensurável. Em série, ou cada um no seu worktree.

---

## 3. DOCUMENTADOR — estado e pendências

### 3.1 Números (executados)

| | |
|---|---|
| Suíte | **507/507, zero falhas** (477 + 30) |
| Mutação | 19 aplicados e assertados · **18 mortos** · 1 equivalente (medido, não suposto) |
| Modificados | 4, todos autorizados |
| Intactos | `pontuacao-utils.mjs`, `consolidar-lances.mjs`, `pontuacao.mjs`, `ranking.mjs`, migração |

### 3.2 ⛔ Não activar sem estes três passos

1. **Aplicar a migração** — as tabelas não existem em produção.
2. **Re-enfileirar a dívida órfã** — consulta em `docs/TORNEIO-HABILIDADE.md` §4c. **Não implementado**: seria comportamento novo, fora do autorizado.
3. **Reativar a R2** com autorização de custo — R$ 40,00 por liquidação, mais gas.

### 3.3 Registo operacional (R13)

**R1** ✅ 4 modificados, todos autorizados · **R2** ✅ custo zero real, dry-run confirmado por execução · **R14** ✅ CLAUDE.md antes do commit · **R16** ✅ 19 mutantes · **R18** 4 decisões registadas · **R19** não ativada, declarado antes.

### 3.4 A métrica que o enunciado pediu

> *"registrar se o Validador A apanhou o que o Executor não viu — é a métrica que mede o valor da dupla validação."*

**Apanhou, e era o mais caro de todos.** A regressão que pagava 11× o devido estava em código já committado, com 477 testes verdes, e eu não a vi. O Validador B apanhou o P0 que tornava o meu próprio handler inoperante. **Nenhum dos dois seria encontrado sem validação independente.**

### 3.5 O que NÃO foi medido (L-4)

Nada correu contra Supabase real nem contra a mainnet. A migração tem **cobertura zero**. `txHash` não é persistido; `err.code` é descartado. `GET /ranking` é público e enumera todas as carteiras que licitaram — decisão de produto por tomar.

⚠️ **As correcções deste MC não passaram por uma terceira validação.** Três MCs, três reprovações: a ressalva é material, não formal.

---

## 4. A lição, ao terceiro MC seguido

Três vezes, o mesmo padrão: **o duplo aceita o que o sistema real recusa**. Um mock que ignorava o argumento. Um duplo que aceitava `eq(col, null)`. Um duplo sem os DEFAULTs das colunas. De cada vez, a suíte ficou verde sobre código partido.

E desta vez houve um caso novo, pior: **o teste pinava o defeito**. A correcção certa partia seis testes, porque eles assertavam o mecanismo errado. Quando uma correcção óbvia parte testes, a suspeita devia recair primeiro sobre os testes.

O denominador não é falta de cobertura. É que **um duplo que eu escrevo herda as minhas suposições** — e um teste construído sobre ele mede a minha coerência comigo mesmo, não com o PostgREST, com o PostgreSQL ou com a mainnet.
