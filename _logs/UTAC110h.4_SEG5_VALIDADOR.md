# UTAC110h.4 — SEG5 · VALIDADOR ADVERSARIAL

> **Commit validado:** `ea6d0bc8dfa4cbc01c153135f0f2763ea579298f` · **Baseline:** `57fe37d`
> **Worktree próprio (A13):** `C:/Users/Moltbot/tmp-utac110h4-val/wt`, detached HEAD, 4 junctions.
> **Data:** 2026-10-15. **Instrução recebida:** *TENTAR REFUTAR, não confirmar* (12 alegações, mutantes
> próprios obrigatórios).
>
> ⚠️ **NOTA DE ARQUIVO (do executor/pai, não do validador).** O subagente validador **atingiu o teto
> de iterações antes de gravar** este ficheiro. Todos os dados abaixo são **dele** (medidos por ele);
> a gravação foi feita pelo pai a partir do resumo que ele devolveu, sem alterar um único veredicto,
> número ou prova. O resumo integral está em
> `C:/Users/Moltbot/AppData/Local/hermes/cache/delegation/subagent-summary-0-20261015_183256_723302.txt`
> e a transcrição completa em
> `C:/Users/Moltbot/AppData/Local/hermes/cache/delegation/live/deleg_c2cb374e/task-0.log`.
> **Esta nota existe para que ninguém leia este ficheiro como «escrito pelo validador»: foi
> transcrito. O veredicto é dele e é PARCIAL.**

---

## §0 VEREDICTO

**PARCIAL.**

> *«O núcleo da Frente A (fail-closed na **leitura**, código `quota_indisponivel` distinto,
> não-selagem) está provado e morde. Mas o **GAP-1 não está fechado**: sobrevive a metade da
> **escrita**, e duas guardas novas são **cegas** a nomes fora da sua allowlist — com endereços
> completos a sair para o Sentry em **3 sítios** que o executor não viu.»*

---

## §1 Reprodução da suíte (medida por ele)

| item | medido por ele | declarado pelo executor | bate? |
|---|---|---|---|
| `git rev-parse HEAD` (worktree) | `ea6d0bc8dfa4cbc01c153135f0f2763ea579298f` | `ea6d0bc` | ✅ |
| md5 dos ficheiros citados | **== `git show ea6d0bc:<ficheiro>`** | — | ✅ (leu o COMMIT, não a cópia de trabalho) |
| Suíte backend | **VERDE 1269/1275** | 1269/1275 | ✅ |
| Suíte frontend | **VERDE 1110/1110** | 1110/1110 | ✅ |
| Testes novos isolados (quota + grafo) | **14 pass / 0 fail** | 8 + 6 | ✅ |
| Teste do mascarador (frontend) | **2 pass** | 2 | ✅ |
| Mutação do executor | **9/9 MORREM** (reproduzido) | 9/9 | ✅ |
| `1470369` | confirmado **ancestral** do baseline, com `LIMITE_MENSAL = 10` | quota pré-existente | ✅ |

**RAM:** mediu **807 / 867 / 869 / 880 / 1164 / 1373 MB** ⇒ **abaixo** do portão A14 (1500 MB).
**Desvio declarado por ele**, com 2 corridas VERDES. (Soma-se ao desvio que o executor já tinha
declarado — ver `_logs/UTAC110h.4_SEG-1_MEDICAO.md` e `_logs/UTAC110h.4-quota-grafo.md` §5, armadilha
E-2.)

⚠️ **Ele reproduziu, por conta própria, a armadilha E-1**: ao correr o harness num subshell de
background obteve **`stdin is not a tty` + `EXIT=1` com o log VAZIO** — e **percebeu** que «vazio» era
«NÃO MEDI», não «vermelho». Foi essa leitura correcta que o levou a correr o backend em foreground e
a obter os 1269/1275.

---

## §2 As 12 alegações, uma a uma

| # | alegação a refutar | veredicto dele | prova |
|---|---|---|---|
| 1 | A quota não bloqueia a 11.ª | **NÃO REFUTADA** | teste `QUOTA:` + mutante Q5 morre |
| 2 | A quota é contada por um mês errado | **NÃO REFUTADA** | `_lib/referral.mjs:90-94` `mesAtualKey` é UTC; mutante Q2 morre |
| 3 | A quota permite duplo crédito em paralelo (TOCTOU) | **CONFIRMADO** (não é falsa refutação) | `VAL-T2`: 2 créditos em paralelo com contador a 9 ⇒ **11** no mês. «DEBT-033 bem declarada, severidade média adequada» |
| 4 | O fail-closed não funciona | **REFUTADA (parcial)** | leitura OK (`:495`/`:501`); **ESCRITA NÃO**: `VAL-T1` = **12/12 créditos com contador = 0** (`:553-574`; `catch` não-fatal `:571`; `return { ok:true }` `:574`) |
| 5 | O fail-closed selou a conversão | **NÃO REFUTADA** | o selo só acontece em `limite_mensal_excedido` (DEBT-032); `VAL-T3` confirma o selo nesse ramo |
| 6 | Os logs ainda expõem endereços completos | **REFUTADA** | 3 sítios: `_lib/sybil-check.mjs:101-104` (`addresses`, N endereços → Sentry) · `monitor-onchain.mjs:170-178` (`lancador` → Sentry) · `src/lib/sentry-alerts.js:70` (`burst_compras {address}` → Sentry **cliente**, `VITE_SENTRY_DSN`) |
| 7 | A medição do grafo está incompleta | **REFUTADA** | as «8 arestas» não incluem esses 3 sítios |
| 8 | Alguma ocorrência exposta não foi classificada | **REFUTADA** | as 3 acima; e o «endereço isolado» não ficou com inventário completo |
| 9 | O Sentry ainda expõe o par indicador+indicado | **NÃO REFUTADA no essencial** | `:546` fecha o par; **mas a CLASSE do defeito subsiste** (ver #6) |
| 10 | Foi tocado o contrato on-chain ou o REGULAMENTO | **NÃO REFUTADA** | md5 idênticos base↔head: `REGULAMENTO-v5.md 7d248be…` · `GUTO-REGULAMENTO.md 4232369…` · `regras-oficiais.md 36f4306…` · `.env.example ae18031…` · `contract.mjs 108cb43…` |
| 11 | Testes FALSOS (verdes por acidente) | **REFUTADA** | **2 mutantes dele sobrevivem** (V1, V4) — há buracos reais |
| 12 | O campo `indicador` da API foi alterado | **NÃO REFUTADA** | continua em `netlify/functions/referral.mjs:219` |

**Resumo: 5 alegações REFUTADAS (4, 6, 7, 8, 11) · 7 NÃO REFUTADAS (1, 2, 3, 5, 9, 10, 12).**
⚠️ Destas, a #4 e a #11 são **defeitos reais** — não refutações do mérito, mas buracos que o executor
declarou fechados sem ressalva.

---

## §3 Os mutantes DELE (o que o executor não testou)

| # | mutante | entrou? | morreu? |
|---|---|---|---|
| **V1** | `catch` fail-open reintroduzido em `_lib/referral.mjs:501` | sim | ❌ **SOBREVIVEU** |
| **V2** | `mascararEndereco` devolve `s` (deixa de mascarar) | sim | ✅ morreu |
| **V3** | `mascararEnderecoLog` (frontend) deixa de mascarar | sim | ✅ morreu |
| **V4** | `console.warn({ addresses })` cru em `sybil-check.mjs:101` | sim | ❌ **SOBREVIVEU** |
| **V5** | o contador deixa de incrementar | sim | ✅ morreu |

**3/5 morrem.** Os dois que sobrevivem são exactamente os dois buracos do §4 (F2/F3 e F4).

---

## §4 Achados (dele)

### F1 — **ALTA** — o GAP-1 foi fechado só na LEITURA; a ESCRITA do contador falha em silêncio
O bloco «Persiste histórico + incrementa contador mensal» (`_lib/referral.mjs:551-574`) engole a falha
de escrita (`catch { console.warn }`, `:570`) e depois `return { ok: true, txHash }` (`:574`). Se a
escrita do contador falhar **depois** do crédito on-chain, o contador **fica a menos** ⇒ a quota deixa
passar mais do que 10. Medido: **`VAL-T1` = 12/12 créditos com o contador a 0**.
⚠️ **A ordem «creditar → persistir» é PRÉ-EXISTENTE** (também em `57fe37d`): a dívida é de
*tratamento*, mas a alegação «GAP-1 FECHADO» foi emitida **sem ressalva**.

### F2 — **ALTA (processo)** — a guarda estática tem uma allowlist estreita
`_tests/utac110h4-grafo.test.mjs:199` lista os identificadores de endereço por nome
(`endereco|enderecos|indicador|indicado|indicante|novoEndereco|address|subject`). Nomes como
**`addresses`**, **`lancador`** e **`wallet`** passam **verdes** (mutante **V4**). A guarda também só
olha para `console.*` e `captureSecurityAlert(` — não para outros wrappers de envio
(ex.: `captureAlert`, `Sentry.captureMessage`).

### F3 — **MÉDIA-ALTA (LGPD)** — o Sentry EXPOSTO ainda recebe endereços completos em 3 sítios
`_lib/sybil-check.mjs:101-104` · `netlify/functions/monitor-onchain.mjs:170-178` ·
`src/lib/sentry-alerts.js:70`. O `_logs/UTAC110h.4-GRAFO.md` §5 afirma «nenhum evento do cliente envia
o par» — **verdade para o PAR, falso para o ENDEREÇO**. A classe do defeito do §2.6 (S6) subsiste.

### F4 — **MÉDIA** — lacuna de mutação
O `catch` fail-closed (`:501`) **não é coberto por nenhum dos 9 mutantes** do executor.

---

## §5 Ressalvas / não testável (dele)

- **RAM abaixo do portão** (807-1373 MB) — desvio declarado, 2 corridas verdes.
- **Não correu `scheduled-*` nem `worker-*` em runtime** (leitura apenas) — esses caminhos não foram
  exercidos dinamicamente.
- **Nada on-chain** (proibido) — o custo real de gas continua **não medido**.
- **Não re-validou o delta** — os achados F2/F3/F4 são anteriores às correcções que o pai venha a
  fazer a partir deles.

---

## §6 Efeito no UTAC

**PARCIAL** ⇒ pela regra do processo: **registar as ressalvas** e **não corrigir sozinho o que exige
decisão do operador**. O tratamento que o executor deu a cada achado, e o que ficou aberto, está em
`_logs/UTAC110h.4-quota-grafo.md` §6 e no `Desktop/RELATORIO-UTAC110h.4.txt` §6.
