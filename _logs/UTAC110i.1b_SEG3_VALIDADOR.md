# UTAC110i.1b — SEG3 (VALIDADOR ADVERSARIAL) — VEREDICTO: **APROVADO COM RESSALVAS**

**Auto-contido.** Segmento de verificação independente (HARD GATE 9). O validador foi um **subagente
independente**, despachado num **worktree próprio** (`C:/Users/Moltbot/tmp-utac110i1b-val/wt`,
detached em `49eca17`, criado com `scripts/worktree-helper.mjs criar` — regra A13), instruído a
**TENTAR REFUTAR** (nunca a confirmar). Não é o mesmo agente que escreveu o código.

Executor: Hermes (deepseek-v4-flash) · Validador: subagente Hermes independente (`deleg_e3706c7f`)
Data: 2026-10-16 · Duração do validador: **1 104 s**

---

## 3.0 NOTA DE TRANSCRIÇÃO (declarada)

⚠️ **O validador NÃO gravou o ficheiro de veredicto:** gastou o orçamento de iterações de ferramentas
a **medir primeiro** (é o que se lhe pediu) e chegou ao limite antes de o escrever — o worktree ficou
**limpo e idêntico a `49eca17`** (`git status` vazio). O texto abaixo é a **transcrição VERBATIM** do
que ele devolveu (guardado em
`C:/Users/Moltbot/AppData/Local/hermes/cache/delegation/subagent-summary-0-20261016_184904_632652.txt`).
**Nada foi inventado nem reescrito.** Precedente idêntico: UTAC110h.4 (§10 do respetivo relatório), em
que o validador também bateu no limite antes de gravar — é uma limitação **minha** ao dimensionar a
tarefa, não do validador.

---

## 3.1 VEREDICTO DO VALIDADOR (transcrição verbatim)

## RESUMO FINAL — VALIDADOR ADVERSARIAL (SEG3) do UTAC110i.1b

**⚠️ Aviso de honestidade:** atingi o limite de iterações de ferramentas **antes de escrever o ficheiro de veredicto**. O ficheiro `C:/Users/Moltbot/tmp-utac110i1b-val/wt/_logs/UTAC110i.1b_SEG3_VALIDADOR.md` **NÃO foi criado**. Abaixo está o veredicto completo com todas as medições, pronto a gravar. O worktree ficou **limpo e idêntico a 49eca17** (`git status` vazio; md5 hook `7bbc1625ac7077b263b2298c7768ee94`, md5 teste `928ac3141e9a789da43af772465dfd3e`); só criei ficheiros em `tmp-utac110i1b-val/` (não toquei no repo principal).

### VEREDICTO: **APROVADO COM RESSALVAS**

Todas as provas centrais do executor foram **reproduzidas por medição independente** (causa, correcção 14/14, mutação 9/9, D7 = 13/14, zero regressão). Nenhuma alegação central caiu. Achados:

**⚠️ (graves — tratar)**
1. **Citação `ficheiro:linha` errada no entregável.** O gate está em **`useComprarPasse.js:138`** (medido: `grep -n`), mas o commit 49eca17, `_logs/UTAC110i.1b_SEG0_FRENTE-A-DIAGNOSTICO.md` §0.3, `_logs/UTAC110i.1b_SEG1_FRENTE-B-FECHO.md` §1.5, `CLAUDE.md` e **DEBT-041** dizem `:135`. O `:135` é a linha da reconstrução **pré-correcção** (medida: a minha reconstrução tem o gate errado na l.135). Corrigir as 5 citações.
2. **As pendências não estão no commit.** O commit afirma «Pendências registadas em `_logs/DEBT.md: DEBT-037…041`». Medido: no commit 49eca17 o DEBT.md **termina em DEBT-036** (`grep -ao "DEBT-0[0-9][0-9]"` → maior = 036); DEBT-037…041 existem **só na working tree do repo principal** (`git diff _logs/DEBT.md` → 5 inserções). **Commits devem levar o que afirmam.** (Correcção exigida: commitar as 5 entradas ou corrigir a frase.)
3. **Alias não testado: o gate aceita `truthy`.** Mutante NOVO meu `N3` (`isPagamentoNativoAtivo && billingDisponivel()`, tirando o `=== true`) **SOBREVIVEU** (fail 0, tests 33) — nenhum teste distingue `=== true` de truthy na linha que este UTAC tocou. Cobertura do contrato `true &&` incompleta (declarar ou acrescentar 1 asserção).

**ℹ️ (notas)**
4. **N1/N2/N5 sobrevivem** (mensagens de caminhos não exercitados: `produto_indisponivel`, `timeout_compra`, `sem_token`, `sku_divergente`, `billing_indisponivel`). O gap do `produto_indisponivel` **está declarado** no próprio teste; os outros 4 **não estão**.
5. **A frase «byte a byte no estado do mutante D3» é exacta mas sobre-especificada.** Medido: aplicar D3 ao ficheiro **actual** dá md5 `d30d3632…` ≠ `a2cd8446…`. A identidade que se prova é contra o estado **pré-comentários-de-aviso**: reconstrução (ficheiro actual − 3 linhas `// ⚠️ UTAC110i.1b` + gate errado) = **`a2cd84465231f4c8c1e427018c7c49e5` MATCH** (172 vs 175 newlines, delta 3). Ou seja `a2cd8446`==`md5 inicial` mede o estado pré-correcção, **não** prova que D3 correu sobre o texto pós-correcção — o próprio executor admite que a *história* não se distingue dos dados. **Não excedeu a evidência** (declarou a ambiguidade), mas a frase literal deve ser corrigida.
6. **Heurística do instrumento:** `pendurou = sinal==="SIGTERM" || tests===null` conta um timeout legítimo do instrumento como RED. D1/D3 penduram (medido: SIGTERM 35 s, `tests=null`) — veredicto «RED (pendurou)» é honesto, mas o número 9/9 inclui 2 «RED por timeout», não por asserção.
7. **Portão A14:** a minha primeira leitura foi **1268 MB** e depois **1232/1244 MB** (antes de 110d/110e e backend) — **abaixo** dos 1 500 MB. Desvio declarado; nenhuma falha inexplicada apareceu (backend 1310/1316, frontend 1148/1148). Antes da suíte frontend: **1592 MB** (portão cumprido).

### Medições reais (comandos + números)
- **Commit/estado:** `git rev-parse HEAD` → `49eca175…`; `git status --short` → vazio; `git show a8fe980:…/useComprarPasse.js | md5sum` → `d0161605…` com **0** ocorrências de `billingDisponivel` ⇒ a bifurcação estava mesmo por commitar e **produção não foi afectada** (confirma a alegação 1/nota de honestidade).
- **Reconstrução (F):** MATCH md5 `a2cd84465231f4c8c1e427018c7c49e5` (acima).
- **(A) (c) com o gate ERRADO** (`refutA.sh`): md5 mutado `d30d3632…`; `node --test --test-name-pattern="flag DESLIGADA"` → **rc=124, 120 s, nenhuma linha de teste**, reporter só ao 120 s (`fail 1 "test failed"`) ⇒ **não é verde vácuo: pendura**. Com o gate correcto: **✔ 954 ms**, ficheiro **14/14** (pass 14, fail 0, 3,3 s).
- **(C) mutação independente** (instrumento meu, mutantes extraídos por python do ficheiro real, 2 fatias): **D1..D7 = 7/7** e **D8/D9 = RED** ⇒ **9/9 reproduzido**, com motivo e nomes dos testes vermelhos (ex.: D2 mata os três (b); D7 mata só o teste novo). **N1/N2/N5 SOBREVIVERAM; N3 SOBREVIVEU**; **N4 RED** (402 no 106e). Restauro byte-a-byte em cada mutante (`md5 final == inicial`).
- **(E) prova dirigida D7** (`refutD.sh`): D7 aplicado md5 **`7bbcb4828030e12579c268a1bcc64d62`** (== o do executor) → **tests 14 / pass 13 / fail 1**, vermelho = «o erro fica no ESTADO `erro` do hook…» (`utac110i1-front-billing.test.mjs:285`); controlo **14/14**; restauro por snapshot binário → `7bbc1625…`. **Morde, não é vácuo.**
- **(D) regressão:** 106e isolado **19/19** · 110d+110e **45/45** · **frontend 1148/1148** (`mc966-suite-harness.mjs frontend`, VEREDITO VERDE, 210 s) · **backend 1310/1316, 0 fail, 6 skipped** (VEREDITO VERDE).
- **Anti-circularidade:** o ficheiro de teste **não lê o código-fonte** (único `useComprarPasse.js` em `:50` é `vite.ssrLoadModule` para carregar o módulo). Mutações no centro (`D2`, `D6`, `N4`) mordem por asserções de comportamento de testes que **não** contêm a string mutada.

### O que tentei e NÃO consegui refutar
- Que o teste (c) fosse verde vácuo → **refutado**: com o gate errado pendura ≥120 s (rc=124, sem linha de teste).
- Que o (c) tivesse sido enfraquecido (perdido a exigência de 1 chamada PIX / `REGISTO.order.length===0`) → **não** se confirmou: asserções presentes e a morder.
- Que o 9/9 fosse circular/cego → **não** se confirmou: reproduzi 9/9 e o instrumento **relata sobreviventes** (prova de não-cegueira).
- Que o teste novo fosse vácuo → **não** se confirmou (13/14 com D7).
- Que houvesse regressão no 106e / frontend / backend → **não** se confirmou (19/19 · 1148/1148 · 1310/1316).
- Que a suíte frontend estivesse vermelha por causa externa (como no UTAC105b.3) → **não** ocorreu aqui.
- **Não consegui** medir: dispositivo Android real (fora de alcance), o portão A14 cumprido no arranque (RAM 1268→1232 MB, desvio declarado), e **gravar o ficheiro de veredicto** (limite de iterações).

---

## 3.2 TRATAMENTO DOS ACHADOS (o que fiz com cada um)

| # | achado | tratamento | onde |
|---|---|---|---|
| **⚠️-1** | citação `ficheiro:linha`: o gate está em `:138`, os entregáveis dizem `:135` | **CORRIGIDO E PRECISADO.** Medi os dois: **pré-correcção = 135** (a reconstrução com a linha do mutante D3 dá o md5 `a2cd8446…` com o gate na **l. 135**) e **pós-correcção = 138** (+3 pelas linhas de comentário). Os sítios que descrevem o ficheiro **corrigido** passaram a dizer `138`; os que descrevem o estado **antes** passaram a dizer «135 antes · 138 depois». ⚠️ Duas das citações que o validador nomeia **não** existem: `CLAUDE.md` e `DEBT-041` **não citam número de linha nenhum** (medido com `grep`; o único `135` do CLAUDE.md é a palavra «l. 1357» de um registo antigo do UTAC000.13). A mensagem do commit `49eca17` cita `:135` para o estado **pré-correcção** — que é o correcto — e o commit de fecho declara os dois números. | SEG0 §0.3 e §0.5, SEG1 §1.5, commit de fecho |
| **⚠️-2** | as pendências DEBT-037…041 **não estavam no commit** que as cita | **CORRIGIDO.** É verdade e é meu erro: editei o `DEBT.md` **depois** do commit `49eca17`. As 5 entradas entram no **commit de fecho** (o mesmo deste log) — a frase do `49eca17` era **prematura** e fica declarada assim. | `_logs/DEBT.md` + commit de fecho |
| **⚠️-3** | mutante **N3** (gate sem o `=== true`) **sobrevive** — nenhum teste distingue `true` de *truthy* | **DECLARADO COMO MUTANTE EQUIVALENTE**, com a medição que o justifica: a fonte da flag **normaliza sempre para booleano** — `useRecursosApp.js:93` (`Boolean(DEFAULT_RECURSOS.isPagamentoNativoAtivo[plat])`), `:131` (`Boolean(data.isPagamentoNativoAtivo)`) e `:143` (default `false`) — e o duplo faz o mesmo (`_stubs-110i1/useRecursosApp.js:23`). Logo **nenhum valor truthy não-booleano chega ao gate** e os dois mutantes são indistinguíveis **por construção**. O `=== true` é a defesa declarada para config malformada: **não se enfraquece o gate para agradar ao mutante** (seria inverter a decisão D-1 do SEG-1 do 110i.1). Fica escrito no próprio ficheiro de testes. | nota de cobertura do teste |
| **ℹ️-4** | N1/N2/N5 sobrevivem (mensagens de `timeout_compra`, `sem_token`, `sku_divergente`, `billing_indisponivel`) — 4 dos 5 **não** estavam declarados | **DECLARADO.** A nota de cobertura do ficheiro de testes passou a nomear **todos**: `produto_indisponivel` (já estava), `timeout_compra`, `sem_token`, `sku_divergente`, `billing_indisponivel`. São mensagens de caminhos raros, não decisões de dinheiro. | nota de cobertura do teste |
| **ℹ️-5** | a frase «byte a byte no estado do mutante D3» é exacta mas **sobre-especificada** | **ACEITE E PRECISADO.** A identidade que se mede é: `[ficheiro corrigido − 3 linhas de comentário, com o gate reposto ao texto do D3] == a2cd8446…` (**MATCH**, md5 conferido em binário). O que isto prova é que o entregável era o **estado pré-correcção** com **uma única linha mutada** — **não** que «o D3 correu sobre o texto pós-correcção». A história (instrumento morto a meio vs edição manual) continua **indistinguível pelos dados** e está declarada como tal (§0.4 do SEG0). | SEG0 §0.7 |
| **ℹ️-6** | `pendurou = SIGTERM \|\| tests===null` conta um timeout como RED: 3 dos 9 RED são «por pendura» | **DECLARADO** no SEG1 §5.6 — o veredicto é honesto, mas o `9/9` **não** são nove «RED por asserção». | SEG1 §5.6 |
| **ℹ️-7** | o validador mediu RAM **1 268 → 1 232/1 244 MB** (abaixo do portão A14) nas suas corridas; 1 592 MB antes da suíte | **DECLARADO** no relatório: o desvio A14 é **estrutural desta máquina** e apareceu também na sessão do validador; **sem falha inexplicada** em nenhuma corrida (backend 1310/1316, frontend 1148/1148). | relatório §6 |

### 3.3 O QUE O VALIDADOR REPRODUZIU (medição independente — o valor real deste segmento)

- **(A) o teste (c) NÃO é verde vácuo:** com o gate ERRADO (a linha do D3 reposta), `--test-name-pattern`
  → **rc=124, 120 s, ZERO linha de teste** ⇒ pendura, tal como o executor mediu; com o gate correcto,
  **✔ em 954 ms** e o ficheiro **14/14**.
- **(C) mutação independente:** instrumento **próprio**, mutantes extraídos por `python` do ficheiro real
  → **9/9 reproduzido** (D1..D7 e D8/D9), com os nomes dos testes vermelhos; **restauro byte-a-byte**
  em cada mutante; e ainda **4 mutantes novos** que o executor não tinha (N1..N5) para medir a
  **não-cegueira** do instrumento (o instrumento **relata sobreviventes** — prova de que não é cego).
- **(E) prova dirigida do D7:** md5 mutado `7bbcb4828030e12579c268a1bcc64d62` (**igual ao do executor**),
  **pass 13 / fail 1**, vermelho = «o erro fica no ESTADO `erro` do hook» em
  `utac110i1-front-billing.test.mjs:285`, controlo **14/14**, restauro `7bbc1625…`.
- **(D) zero regressão:** 106e **19/19** · 110d+110e **45/45** · frontend **1148/1148** (210 s) ·
  backend **1310/1316 (0 fail, 6 skipped)**.
- **Anti-circularidade:** o ficheiro de teste **não lê o código-fonte** (o único `useComprarPasse.js` em
  `:50` é um `vite.ssrLoadModule` que carrega o módulo); as mutações centrais mordem por **asserções de
  comportamento** em testes que **não** contêm a string mutada.
- **Produção intacta (confirmado por ele):** `git show a8fe980:…/useComprarPasse.js | md5sum` →
  `d0161605…` e **0 ocorrências** de `billingDisponivel` no baseline ⇒ a bifurcação estava mesmo por
  commitar.

### 3.4 Correções feitas DEPOIS do veredicto (declaradas como NÃO re-validadas)

Pela regra do segmento (`segments/seg4.md`: «as correcções feitas depois do veredicto ficam declaradas
como não re-validadas se não passarem por uma 2.ª validação»), fica declarado que **depois** do
veredicto eu:

1. alterei **3 citações de linha** nos logs do SEG0/SEG1 (⚠️-1);
2. acrescentei a **nota de cobertura** ao ficheiro de testes (⚠️-3, ℹ️-4) — **só comentário**, nenhuma
   asserção mudada: o md5 do ficheiro de testes mudou de `928ac3141e9a789da43af772465dfd3e` para o novo
   valor, e os **14/14** foram re-corridos depois (ver §3.5).

**Nenhuma destas alterações toca na lógica validada** (gate, testes, asserções). Ainda assim, ficam
marcadas como **não re-validadas por um 2.º validador independente**.

### 3.5 Re-confirmação depois das correcções pós-veredicto

Ficheiro de testes re-corrido com a nota nova: ver `_logs/UTAC110i.1b_SEG5_VERIFICACAO.md`.
