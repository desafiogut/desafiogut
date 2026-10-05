# UTAC106f-R1t — Reparação da garantia de regressão da R1

**Tipo:** testes + mutação + copy (SEM alterar comportamento) · **Skill:** `mc-driven-projects` ·
**Data:** 2026-10-04 · **Modelo:** deepseek-v4-flash (Hermes Agent) ·
**HEAD de arranque:** `e49e782eacefb8112ab949341d97a110d77afb87` (= `origin/main`) ·
**Commit deste UTAC:** `79ce968`. **Frentes:** 2 (teste de endpoint + mutantes de regressão).

> **Objectivo:** reparar a **garantia de regressão** da R1 (bloqueante 1 do veredicto do R1v). O
> COMPORTAMENTO da R1 já estava correcto e provado; o que faltava era **teste na camada certa**: o
> endpoint `ler-pontos.mjs` — a única camada de produção que decide o cartão — não tinha um único teste,
> e 3 mutantes (R-C, R-D, R-F) sobreviviam à suíte canónica **inteira** e ao gate `7/7`.
> **Este UTAC não altera comportamento** — só testes, mutação e copy visual.

---

## §SEG-1 — Baseline + reprodução dos 3 mutantes sobreviventes

| Item | Medido | Comando |
|---|---|---|
| `HEAD` / `origin/main` | `e49e782eacefb8112ab949341d97a110d77afb87` | `git rev-parse HEAD` |
| Suíte (baseline) | **frontend VERDE 753/753 · backend VERDE 1028/1034 → VERDE** | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| `_tests/ler-pontos.test.mjs` | **NÃO existia** (medido: ausente da listagem de `_tests/`) | `ls netlify/functions/_tests/` |
| Mutação versionada | **7** mutantes (MP1-MP7) | leitura de `scripts/mc106f-prova-mutacao.mjs` |
| `OfertasProgramadas.jsx:68` | `progresso` **já usa `pontosCartao`** | leitura do ficheiro |
| Saldo API — abertura | **US$ 5,48** | `curl https://api.deepseek.com/user/balance` |

### §SEG-1.a — Reprodução dos 3 mutantes que SOBREVIVEM (o defeito da garantia)

Script temporário (`%TEMP%/hermes-verify-r1t-mutantes.py`, removido no fim). Cada mutante: alvo único
verificado, md5 antes/depois, **suíte canónica inteira**, restauro por md5.

| Mutante | Ficheiro | Entrou? | Suíte canónica | Restauro |
|---|---|---|---|---|
| **R-C** `const pontosCartao = pontos;` | `ler-pontos.mjs` | SIM | **VERDE 753/753 + 1028/1034** ← sobrevive | md5 idêntico |
| **R-D** `podeResgatarCartao: pontos >= 50` | `ler-pontos.mjs` | SIM | **VERDE** ← sobrevive | md5 idêntico |
| **R-F** `progresso` usa o total | `OfertasProgramadas.jsx` | SIM | **VERDE** ← sobrevive | md5 idêntico |

⇒ Reproduzido exactamente o que o validador do R1v mediu: **a suíte não via o defeito**.

### §SEG-1.b — Porque escapavam (causa medida)

`ler-pontos.mjs:56` (`pontosCartao = pontosDeCompra(registo)`) e `:63` (`podeResgatarCartao: pontosCartao >= 50`)
são a **decisão do cartão** — e **nenhum** teste importava `ler-pontos.mjs`; os testes do ecrã **injectam
a resposta HTTP**. O `MP7` versionado só muda o **texto** da barra. A LARGURA (`progresso`) não tinha guarda.

---

## §SEG0 — Teste de endpoint `ler-pontos` promovido para a suíte

**Ficheiro novo:** `desafio-gut/frontend/netlify/functions/_tests/ler-pontos.test.mjs` (163 linhas, 9 testes),
baseado no teste do validador do R1v (**extensão de escopo declarada** — GATE 3; a promoção está no
AUTORIZA/objectivo 1). Duplo PostgREST **inline** (modela `public.pontos` + `public.palpites`; qualquer
operação não modelada LANÇA) + mocks de `supabase-client`/`jwt`/`system-state`. O `ler-pontos.mjs` e o
`_lib/passe-pontos.mjs` testados são os **REAIS**. Mede o **COMPORTAMENTO** (a resposta HTTP que a UI
consome), não um proxy de texto.

Cenários: (a) 48 compra + 2 palpite → `pontosCartao 48`, `podeResgatarCartao false`; (b) 50 compra → `50/true`;
(c) só palpite 2 → `0/false`; **(c2) só palpite 60 (acima do limiar) → `0/false`**; (d) 50 compra + resgate 50
→ `0/false`; (d2) 60 compra + resgate 50 → `10`; **(f) histórico vazio mas coluna `pontos`=50 → `0/false`**;
+ contratos de bordo (401 sem Bearer; 405 método).

```
$ cd desafio-gut/frontend/netlify/functions
$ node --test --experimental-test-module-mocks --test-reporter=tap _tests/ler-pontos.test.mjs
# tests 9 · # pass 9 · # fail 0
```

### §SEG0.b — Controlo positivo OBRIGATÓRIO (GATE 8): o teste morde

| Mutante | Entrou? | test `ler-pontos.test.mjs` | Restauro |
|---|---|---|---|
| R-C | SIM | **9 tests · 5 pass · 4 fail → RED** | md5 idêntico |
| R-D | SIM | **9 tests · 6 pass · 3 fail → RED** | md5 idêntico |

⇒ O teste **morde por si só** (não é vacuidade) — a prova exigida pelo enunciado.

---

## §SEG1 — Mutantes R-C / R-D / R-F (+R-G) acrescentados ao script versionado

`scripts/mc106f-prova-mutacao.mjs`: alvos novos `ENDPOINT` (`ler-pontos.mjs`) e `MODAL`
(`ComprarPasseModal.jsx`), alvos de teste novos `ALVO_ENDP` (`_tests/ler-pontos.test.mjs`) e `ALVO_MODAL`
(`utac106e-compra-passe.test.mjs`); `originais` passou a cobrir os 4 ficheiros.

```
$ node scripts/mc106f-prova-mutacao.mjs
controlo frontend: 15/15 (fail 0)   ·   controlo backend: 16/16 (fail 0)
MP1..MP7 PROVADO (RED)
R-C endpoint: pontosCartao volta a ser o TOTAL: PROVADO (RED) — 5/9, fail 4
R-D endpoint: limiar do cartão usa o TOTAL: PROVADO (RED) — 6/9, fail 3
R-F barra: LARGURA volta a usar o TOTAL: PROVADO (RED) — 14/15, fail 1
R-G rótulo do modal: deixa de declarar «(total)»: PROVADO (RED) — 13/14, fail 1
restauração: passe-pontos.mjs / OfertasProgramadas.jsx / ler-pontos.mjs / ComprarPasseModal.jsx — md5 IDÊNTICO
VEREDITO: 11/11 PROVADOS
```

**7/7 → 11/11.** (R-G é guarda de **copy** decidida pelo operador — não de comportamento; declarado.)

---

## §SEG2 — Barra (R-F) + rótulo do modal

### §SEG2.a — Barra: já usava `pontosCartao`; faltava a guarda da LARGURA

`OfertasProgramadas.jsx:68` **já** usava `pontosCartao` (a R1 corrigiu-o). O que faltava era o TESTE:
`utac106f-ofertas.test.mjs` guardava o texto «48 / 50» e o `aria-valuenow`, mas **não a largura**. Acrescentado:
`R1 REGRESSÃO · a LARGURA da barra usa pontosCartao (não o TOTAL)` → exige `width:96%` (48/50) no
`progresso`, não `100%`. Ficheiro de teste **não** listado no AUTORIZA (**extensão de escopo declarada**,
exigida pelo SEG2 §3).

### §SEG2.b — ⚠️ Rótulo do modal: NÃO era executável como especificado — ESCALADO

O enunciado manda: *«alterar para `pontosCartao`; texto: «Pontos de cartão: X → X+1»»*. **Medido: não há
fonte de `pontosCartao` alcançável dentro do escopo.** O valor do modal vem de `useComprarPasse().pontos`,
que é a resposta de `comprar-passe-pontos` — o **TOTAL** da coluna `pontos`. E `pontosCartao` **não existe**
em `MinhaCarteira.jsx`, `useComprarPasse.js`, `AppContext.jsx` nem em `comprar-passe-pontos.mjs`
(medido: `grep -rn pontosCartao` nesses 4 → **0**). Esses ficheiros **não** estão no AUTORIZA
(`MinhaCarteira` está explicitamente no NÃO AUTORIZA; o endpoint também). **Não inventei nem estendi o
escopo (GATE 3/12).**

**Entregue (no ficheiro autorizado):** o rótulo passa a ser honesto e sem contradição com a barra —
`Teus pontos (total): X → X+1 — o cartão conta só os pontos das compras.` — mantendo a guarda de copy no
teste (`utac106e-compra-passe.test.mjs`, também extensão declarada). **A decisão do operador (mostrar
`pontosCartao` no modal) fica ESCALADA** — ver §SEG5.

---

## §SEG3 — Verificação ponta a ponta

| Passo | Comando | Resultado |
|---|---|---|
| 1 Suíte canónica | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` | **frontend VERDE 754/754 · backend VERDE 1037/1043 → VERDE** |
| 2 Build | `npx vite build` | **OK (`✓ built in 14.42s`)**; bundle novo `index-CeyNbKPY.js`; **`package-lock.json` NÃO foi sujado** (md5 igual) |
| 3 Mutação versionada | `node scripts/mc106f-prova-mutacao.mjs` | **11/11 PROVADOS**, restauros md5 idênticos |
| 4 **Os 3 mutantes do R1v contra a SUÍTE CANÓNICA** | script ad-hoc `%TEMP%/hermes-verify-r1t-seg3.py` | **R-C → VERMELHO (backend 4 falhas) · R-D → VERMELHO (3 falhas) · R-F → VERMELHO (frontend 1 falha)**; restauros md5 idênticos |

**O contraste é a prova:** no SEG-1 os três davam **VERDE**; agora dão **VERMELHO**. A fragilidade está
reparada — se alguém quebrar a R1, a suíte cai imediatamente.

---

## §SEG4 — Validador adversarial

**Subagente:** `deleg_6c7212a2` (1 tarefa · 50 api_calls · 2486 s) · **worktree próprio**
`C:/Users/Moltbot/tmp-r1t-val/wt` (detached em `79ce968`, 4 junctions do helper A13) · **baseline** `e49e782`.

> ⚠️ **LIMITE DECLARADO (regra da série):** o validador **esgotou o cap de iterações antes de gravar** o
> ficheiro do veredicto — ele próprio o declara («I hit the iteration cap before I could persist the verdict
> file»). O **executor** preservou-o do resumo final dele, **sem edição**, em
> `C:/Users/Moltbot/tmp-r1t-val/VEREDICTO-R1t.md`. Os *placeholders* não se preenchem (não havia).

### Veredicto (verbatim)

--- INÍCIO DO VEREDICTO VERBATIM ---

# VEREDICTO R1t — reparação da garantia de regressão da R1 (commit `79ce968`)

**VEREDICTO: APROVADO — 0 bloqueantes.** Os **3 mutantes do R1v (R-C, R-D, R-F) MORREM agora na suíte canónica** (medido 5×/5× por mutante, código limpo). O R-G (novo) também morre. Trabalho no worktree isolado `C:/Users/Moltbot/tmp-r1t-val/wt` (detached `79ce968`).

## Reproduzido por execução (comandos + saída real)

**Suíte canónica (árvore limpa):**
```
node scripts/mc966-suite-harness.mjs ambos < /dev/null
frontend: VERDE 754/754 pass
backend:  VERDE 1037/1043 pass
VEREDITO: VERDE
```

**Gate do repo `mc106f-prova-mutacao.mjs`:**
```
controlo frontend: 15/15 (fail 0) · controlo backend: 16/16 (fail 0)
R-C endpoint: pontosCartao volta a ser o TOTAL: PROVADO (RED) — 5/9, fail 4
R-D endpoint: limiar do cartão usa o TOTAL:    PROVADO (RED) — 6/9, fail 3
R-F barra: LARGURA volta a usar o TOTAL:       PROVADO (RED) — 14/15, fail 1
R-G rótulo do modal: deixa de declarar «(total)»: PROVADO (RED) — 13/14, fail 1
restauração (4 ficheiros): md5 IDÊNTICO
VEREDITO: 11/11 PROVADOS
```

**Testes-alvo:** `ler-pontos.test.mjs` **9/9** · `utac106f-ofertas.test.mjs` **15/15** · `utac106e-compra-passe.test.mjs` **14/14**.

**PONTO CENTRAL — os mutantes matam a SUÍTE CANÓNICA inteira?** (não só os testes-alvo; artefacto meu `r1t-mut.mjs`, cada mutante confirmado a ENTRAR e a SAIR por md5, árvore verificada limpa a seguir):
```
baseline backend  (5×): VERDE, VERDE, VERDE, VERDE, VERDE
R-C backend       (5×): VERMELHO 4 falha(s)  ×5  -> MORRE   (falham R1(a), R1(c), R1(c2), R1(f))
R-D backend       (5×): VERMELHO 3 falha(s)  ×5  -> MORRE   (falham R1(a), R1(c2), R1(f))
R-F frontend      (5×): VERMELHO 1 falha(s)  ×5  -> MORRE   («…a LARGURA da barra usa pontosCartao»)
R-G frontend      (3×): VERMELHO 1 falha(s)  ×3  -> MORRE   («…DECLARANDO que é o TOTAL»)
```
⇒ **R-C/R-D agora caem na canónica via `_tests/ler-pontos.test.mjs`** (que a suíte backend passa a correr); **R-F** cai na canónica via a nova guarda da largura; **R-G** via a guarda do rótulo. Antes (baseline `e49e782`) os 3 sobreviviam — confirmado no doc `_logs/UTAC106f-R1v-revalidacao.md`.

## Alegações que tentei REFUTAR e FALHARAM
- **«R-C/R-D/R-F ainda sobrevivem à canónica» → REFUTADO.** Morrem 5/5 cada (entrada md5 verificada, restauro md5 idêntico).
- **Teste do endpoint é proxy de texto? → REFUTADO: é comportamento real.** Importa o handler REAL `ler-pontos.mjs`, faz `mock.module` só nas fronteiras de I/O (`supabase-client`, `jwt`, `system-state`), chama `handler(real Request)` e asserta **status HTTP + corpo JSON** (`pontosCartao`, `bonusPalpite`, `podeResgatarCartao`). Não há `grep`/regex de ficheiro.
- **Teste morde por si só (controlo positivo)? → CONFIRMADO.** Com R-C aplicado, **4 dos 9** testes do endpoint falham; com R-D, **3** falham. Não é vazio.
- **(g) `_lib/passe-pontos.mjs` alterado? → NÃO** (`git diff e49e782..79ce968` vazio). **(h) `ler-pontos.mjs` alterado? → NÃO.** **(i) `.bak-*` tocado? → NÃO** (0 em `--name-status`).

## O que NÃO consegui refutar
- **(f) A BARRA usa `pontosCartao` em produção: SIM.** `OfertasProgramadas.jsx:68` (`progresso`), `:119` (texto «X / 50»), `:124` (`aria-valuenow`). Medido por grep em todo `src/` produção.
- Só um limiar de produção decide o cartão (`ler-pontos.mjs:63`, usa `pontosCartao`); a antiga `podeResgatarCartao()` (total) **não tem importador de produção**.

## Achados (não bloqueantes, declarados)
1. **(f) O MODAL NÃO usa `pontosCartao`.** Mostra `pontos` = **TOTAL** (vem de `useComprarPasse().pontos` ← `comprar-passe-pontos`, coluna `pontos`). Confirmado: `pontosCartao` não existe em `MinhaCarteira.jsx`/`useComprarPasse.js`. O rótulo passou a «Teus pontos **(total)**: X → X+1 — o cartão conta só os pontos das compras». É **honesto e coerente**, mas é um *disclaimer*, não o valor do cartão — a incoerência número-a-número (Carteira 50 vs Ofertas 48/50) **persiste**. Aceitável só porque o escopo não autorizava os ficheiros produtores; **fica escalado**.
2. **R-G é guarda de COPY, não de comportamento.** A sua «morte» prova que a string «(total)…» está presa, **não** que o modal mostre o número correcto. Um futuro `pontos+1` mal calculado passaria.
3. **Erro do meu instrumento (declaro-o):** a 1ª medição canónica automática correu **duplicada/concorrente** (o modo background do Hermes matou o wrapper mas deixou um `node` filho vivo), e **ambos os processos mutaram os mesmos ficheiros** → produziu falsos «baseline VERMELHO» e um falso «R-G SOBREVIVE». Também **deixou `OfertasProgramadas.jsx` mutado** em disco (daí os falsos verdes/vermelhos seguintes). Corrigi: `git checkout` restaurou a árvore (confirmado limpo), e **re-medi tudo em foreground, com `git status` limpo a seguir a cada mutante**. Os números acima são os limpos.
4. **Guarda da largura é regex sobre o HTML renderizado.** Morde (R-F morre 5/5) mas é proxy de texto do DOM, não asserção sobre o cálculo — funciona, com margem de fragilidade (o `[\s\S]{0,400}?` também poderia casar o `width:96%` de outro nó se a estrutura mudar).

## O que NÃO medistei (limitações honestas — iteração esgotada)
- **(b)/(e): não corro mutantes NOVOS** sobre `comprar-passe-pontos.mjs` nem `apurar-palpite.mjs`. Li-os: `apurar-palpite` é wrapper fino de `apurarPalpite()` (coberto por `palpite.test.mjs` 16/16 + MP1–MP4 do gate); `comprar-passe-pontos` é coberto por `passe-pontos.test.mjs` E1–E10 (incl. idempotência/reembolso/corrida). **Não re-medido com mutantes frescos.**
- **Mutantes endpoint de forma IDÊNTICA** (`const pontosCartao = registo?.pontos ?? 0;`, `bonusPalpite` forçado a 0) — não corridos. (Nota: `bonusPalpite` está assertado em R1(a)/R1(c2), logo morreria; `pontosParaCartao` no endpoint **não** está assertado — mutante potencialmente sobrevivente, mas fora do defeito R1.)
- Não fiz deploy; não li `.env`/chaves. Trabalho todo local no worktree.

## Decisão
**APROVADO.** A reparação cumpre o objectivo: os 3 mutantes do R1v (R-C/R-D/R-F) **morrem na suíte canónica** (5/5 cada), o teste do endpoint mede **comportamento real** e tem **controlo positivo**, o R-G também morre, e não houve alteração fora de escopo (`_lib/passe-pontos.mjs`, `ler-pontos.mjs`, `.bak-*` intactos). Suíte canónica **VERDE** com a árvore limpa. Ressalvas não bloqueantes: modal continua a mostrar o TOTAL (disclaimer honesto, incoerência de número persistente — escalada) e R-G é guarda de copy. Gaps declarados: mutantes novos em `comprar-passe-pontos`/`apurar-palpite` e os mutantes de forma idêntica no endpoint não foram corridos (limite de iterações).

---

## Notas operacionais (para a sessão-mãe)
- **AÇÃO PENDENTE:** gravar o bloco acima em `C:/Users/Moltbot/tmp-r1t-val/VEREDICTO-R1t.md` — não consegui (cap de iterações). O conteúdo integral está aqui.
- **Árvore do worktree:** restaurada e **limpa** (`git status --porcelain` vazio) depois de cada mutante. Matei 3 `node.exe` órfãos (PIDs 15748/11824/352) das corridas em background; as últimas corridas em foreground saíram com exit 0.
- **Artefactos criados** (só em `C:/Users/Moltbot/tmp-r1t-val/`, nunca no repo): `r1t-canonical-mutantes.mjs`, `r1t-rep.mjs`, `r1t-mut.mjs`, `r1t-canon.out` (run contaminado — descartar), `r1t-rg.out`, `ofertas-fail.out`.
--- FIM DO VEREDICTO VERBATIM ---

### §SEG4.b — Resposta do executor

**Veredicto: APROVADO · 0 bloqueantes.** O objectivo do UTAC está cumprido e **medido pelo validador**: os
**3 mutantes do R1v (R-C/R-D/R-F) morrem agora na suíte canónica** (5×5 cada, com entrada e saída por md5) e o
R-G novo também. O teste do endpoint **mede comportamento real** (handler real + `Request` real + asserção de
status/corpo), não um proxy de texto, e **morde por si só** (controlo positivo: 4 e 3 falhas). Nada fora de
escopo foi tocado (`_lib/passe-pontos.mjs`, `ler-pontos.mjs` e os `.bak-*` **intactos** por diff).

**Ressalvas não bloqueantes — aceites e registadas:**
1. **O MODAL continua a mostrar o TOTAL.** O validador confirma o que eu já tinha medido: a incoerência
   **número-a-número** (Carteira «50» vs Ofertas «48 / 50») **persiste**; o que fiz foi um *disclaimer* honesto
   («(total) … o cartão conta só os pontos das compras»). Aceitável **só** porque o escopo não autorizava os
   ficheiros produtores da Carteira/endpoint ⇒ **fica escalado** (§SEG5).
2. **O R-G é guarda de COPY, não de comportamento** — a sua morte prova que a string está presa, não que o
   modal mostre o número certo. Declarado como tal no script (não se vende como garantia de comportamento).
3. **A guarda da largura é regex sobre o HTML renderizado** — morde (R-F morre 5/5) mas é proxy do DOM, não
   asserção sobre o cálculo; tem margem de fragilidade declarada.
4. **Erro do instrumento DO VALIDADOR (declarado por ele):** a 1.ª medição automática correu
   **duplicada/concorrente** (o modo background matou o wrapper e deixou um `node` filho vivo) e dois
   processos mutaram os mesmos ficheiros ⇒ falsos «baseline VERMELHO» e um falso «R-G SOBREVIVE», e deixou
   `OfertasProgramadas.jsx` mutado em disco. Ele **corrigiu** (`git checkout`, árvore limpa), **re-mediu tudo
   em foreground** com `git status` limpo a seguir a cada mutante, e os números que reporta são os limpos.
   ⇒ **É exactamente o modo de falha que o meu próprio registo do R1v declarou** (processos pendurados de
   subagente). Confirmei **eu** que a árvore do worktree ficou limpa (`git status --porcelain` vazio em
   `79ce968`) e **matei por PID** os 4 `node.exe` órfãos que ficaram a correr (3996/14620/5084/2972) —
   sem tocar nos 2 MCP do utilizador.
5. **Limites do validador (iterações esgotadas):** **não** correu mutantes **novos** sobre
   `comprar-passe-pontos.mjs`/`apurar-palpite.mjs` (leu-os e reportou a cobertura existente), nem os
   mutantes de *forma idêntica* no endpoint (ex.: `pontosParaCartao` do endpoint **não** está assertado —
   mutante potencialmente sobrevivente, mas **fora do defeito R1**). Declarados como lacunas, não como verdes.

---

## §SEG5 — Registo, escalada e custo

### Escalada ao operador (decisão #3 — rótulo do modal)

**Facto medido:** o modal da Carteira **não tem** acesso a `pontosCartao` — esse valor **não existe** em
`MinhaCarteira.jsx`, `useComprarPasse.js`, `AppContext.jsx` nem em `comprar-passe-pontos.mjs`, e **nenhum**
desses ficheiros estava autorizado (o `MinhaCarteira` está explicitamente no NÃO AUTORIZA). Implementá-lo
exigiria **estender o escopo** (GATE 3/12). ⇒ **PARADO e escalado** nesse item; entregue o rótulo honesto.

**Opções para o operador** (todas pequenas; a decidir):
- **(A)** autorizar `MinhaCarteira.jsx` a passar `pontosCartao` ao modal — exige dar à Carteira uma fonte de
  pontos de cartão (o `usePontos` do ecrã Ofertas, ou um `pontosCartao` novo no `useComprarPasse`);
- **(B)** autorizar `comprar-passe-pontos.mjs` a devolver `pontosCartao` na resposta (o modal passaria a
  mostrá-lo directamente);
- **(C)** aceitar o rótulo actual («(total) … o cartão conta só as compras») como definitivo;
- **(D)** remover a linha do modal.

### Registo em 3 lugares (R18)

| Lugar | Ficheiro |
|---|---|
| Detalhado | `_logs/UTAC106f-R1t-reparacao.md` (este) |
| Doc de estado (bloco R14) | `CLAUDE.md` (apêndice no EOF; 4 bytes de controlo intactos) |
| Relatório do operador | `Desktop/RELATORIO-UTAC106f-R1t-REPARACAO.txt` |
