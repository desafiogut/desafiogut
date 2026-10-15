# UTAC110h.4 — SEG-1 · MEDIÇÃO
> Baseline `57fe37d` (= origin/main, pós-110h.3). Frentes: A (quota do bónus on-chain), B/C (grafo social),
> D (fecho das pendências do 110h.3). **Nada foi alterado neste segmento** (só leitura e medição).
> HARD GATES 1, 2, 3, 12. Contexto obrigatório: `_logs/DEBT.md` (DEBT-030, DEBT-031) — lido.

---

## -1.1 Estado do repo

| item | medido | enunciado | desvio |
|---|---|---|---|
| `git rev-parse HEAD` | `57fe37d72f01eb8a3f1192948dcedc918f82391f` | `57fe37d` | **nenhum** ✅ |
| `git status --porcelain` | **6 `M` pré-existentes** (`.agents/skills/aidesigner-frontend/*` ×3, `.gitignore`, `.mcp.json`, `desafio-gut/frontend/package-lock.json`) + `?? _logs/MC100_*`/`MC101_*`/`MC102_*` pré-existentes | «limpo (ou só pré-existentes)» | **pré-existentes** ✅ |
| Suíte frontend | ver §-1.1.b | 1108/1108 | — |
| Suíte backend | ver §-1.1.b | 1255/1261 | — |

Comando: `cd C:/Users/Moltbot/Desktop/DESAFIOGUT && node scripts/mc966-suite-harness.mjs ambos`.

⚠️ **NOTA DE TOPOGRAFIA (armadilha medida).** Os caminhos do enunciado são relativos a
**`desafio-gut/frontend/`** — que é a raiz que o `scripts/mc966-suite-harness.mjs` usa
(`FE = <raiz>/desafio-gut/frontend`, `FN = FE/netlify/functions`). **Não** à raiz do repo: existe
uma árvore `netlify/functions/` na raiz que é **residual** (sem `_lib/`), e existem cópias em
`desafio-gut/frontend/.netlify/functions-serve/*` (build artefacts). Uma varredura feita na raiz
devolve **0 ocorrências** e parece «não há grafo» — é falso. Medido.

### -1.1.b Suíte baseline
| momento | frontend | backend |
|---|---|---|
| baseline `57fe37d` | **1108/1108** ✅ | **1255/1261** (6 `skipped`=DEBT-001) ✅ |

### -1.1.c RAM (A14) — 3 medições + trim
| momento | leitura |
|---|---|
| **gate do enunciado (3×)** | **724 · 726 · 730 MB** → **ABAIXO do limiar de 1500** ⚠️ |
| 2.ª ronda de diagnóstico (3×) | 1165 · 1327 · 1569 MB (oscilação medida: +845 MB em minutos — o fenómeno do §0 da skill) |
| **escada segura aplicada** | fechada a árvore `msedge` **sem nenhuma janela** (root com `--no-startup-window`, 7 procs, **289 MB**) + `EmptyWorkingSet` em 55 procs (WS 422 → 0 MB de working set residente) — **nada do utilizador foi fechado** (árvore do WhatsApp, M365Copilot, MsMpEng, explorer, dwm intactos) |
| **portão (3× a seguir ao trim)** | **1621 · 1653 · 1651 MB** ⇒ **3/3 ≥ 1500 MB, portão cumprido** ✅ |
| leituras seguintes | 1651 · 1647 · 1644 MB |
| **imediatamente antes da suíte** | **1569 MB** ✅ (a leitura que vale para o portão) |

Máquina de 5877 MB (`TotalVisibleMemorySize`). Pico da janela **1653 MB**, mínimo **1621 MB**,
mínimo «no arranque da tarefa» **1569 MB** — os três ≥ 1500.

⚠️ **LACUNA DE INFRAESTRUTURA (HI).** O enunciado e a skill `windows-memory-pressure` referem
`scripts/liberar-ram.ps1` como **pré-existente e re-executável**. **Medido: não existe** — `find` na
raiz do repo e em `C:/Users/Moltbot` (profundidade 5) devolve **0 ficheiros** `liberar-ram*`. O script
foi reconstruído em `C:/Users/Moltbot/tmp-utac110h4/liberar-ram.ps1` (**ASCII puro**, para não cair na
armadilha de codificação ANSI/UTF-8 do PS 5.1 documentada na skill) e será **removido no fecho**
(política do operador: temporários numa pasta de trabalho). Registado como pendência no relatório.

---

## -1.2 Existência dos caminhos nomeados (relativos a `desafio-gut/frontend/`)

| caminho | medido |
|---|---|
| `netlify/functions/_lib/referral.mjs` | **existe** — 684 linhas; `concederBonus` em :475, `verificarLimiteMensal` em :456, `registrarConversao` em :557 |
| `netlify/functions/_lib/fontes-lance.mjs` | **existe** — 221 linhas; `indicacoesDoMes` em :111, `LIMITE_INDICACOES_MES` em :35 |
| `netlify/functions/_lib/contract.mjs` | **existe** — `creditarSenhas` (wrapper on-chain; **não tocado**) |
| `netlify/functions/referral.mjs` (endpoint) | **existe** — 251 linhas; `console.log` do grafo em :198 |
| `netlify/functions/comprar-senhas.mjs` | **existe** — 395 linhas; 2.º caminho de conversão em :353 |
| `netlify/functions/_lib/sentry-server.mjs` | **existe** — 77 linhas; `captureSecurityAlert` em :56 |
| `netlify/functions/_lib/validate.mjs` | **existe** — `mascararEndereco` em :77 (já existe, já importado no endpoint) |
| `_logs/DEBT.md` | **existe** — 71 339 bytes; DEBT-030 em :65, DEBT-031 em :66 |
| `_logs/UTAC110h.3-pendencias.md` | **existe** — 267 linhas (é o «relatório» do 110h.3 a confirmar na Frente D) |

---

## -1.3 FRENTE A — medição: a quota do bónus on-chain **JÁ EXISTE**

> ⚠️ **A PREMISSA DA DEBT-030 ESTÁ REFUTADA PELA MEDIÇÃO.** A DEBT-030 diz «o bónus on-chain está
> reactivado, mas **SEM QUOTA**». Medido, a quota existe — e é **pré-existente ao UTAC110h.3**.

**Prova 1 — a guarda está no caminho do crédito.** `_lib/referral.mjs::concederBonus` (:475) verifica o
limite **antes** de chamar `creditarSenhas`:

```js
:483   const limite = await verificarLimiteMensal(enderecoLower);
:484   if (!limite.ok) {
:485     return { ok: false, code: "limite_mensal_excedido", message: `${limite.conversoes}/${limite.limite} conversões no mês` };
:486   }
:491   const r = await creditarSenhas(enderecoLower, 1);   // ← só chega aqui se a quota não estiver cheia
```

**Prova 2 — o contador é por indicante e por mês.** `verificarLimiteMensal` (:456) lê o Blob
`referral-monthly:{endereco}:{AAAA-MM}` (chave montada em :459 por `mesAtualKey()`, que usa
`getUTCFullYear()/getUTCMonth()`), com `LIMITE_MENSAL = 10` (:41). O contador é **incrementado** em
:517, depois de o crédito on-chain ter sucesso.

**Prova 3 — é pré-existente (não veio do 110h.3).**

```
git log --oneline -S "verificarLimiteMensal" --reverse -- .../_lib/referral.mjs
  1470369 innovation: mega comando 10 — growth viral sistema indique e ganhe     ← nascimento
git show 57fe37d:.../_lib/referral.mjs | grep -n "LIMITE_MENSAL\|verificarLimiteMensal\|limite_mensal_excedido"
  41:const LIMITE_MENSAL   = 10;   456:export async function verificarLimiteMensal(...)
  483:  const limite = await verificarLimiteMensal(enderecoLower);   485: ... "limite_mensal_excedido" ...
  587:  if (!bonus.ok && bonus.code !== "limite_mensal_excedido") {
```

⇒ a quota de **10/mês por indicante** que o **R18-110h.4-1** decidiu **já está implementada e viva** no
baseline. O que a DEBT-030 descreve a sério é **outra coisa** — ver §-1.5 (GAP-3).

**Prova 4 — a quota está SEM TESTE.** `grep -rn "limite_mensal_excedido\|semBonusIndicador\|referral-monthly"`
em `netlify/functions/_tests/` e `src/__tests__/` devolve **0 ocorrências**. Nenhum teste do repo
exercita o limite mensal do bónus on-chain nem o seu efeito no marcador de convertido. É o GAP-2.

### -1.4 Os dois contadores de «indicações do mês» (medidos, e divergem)

| contador | onde | o que conta | janela | limite | incrementado quando |
|---|---|---|---|---|---|
| `indicacoesDoMes` (110f) | `_lib/fontes-lance.mjs:111` | entradas `historico_lance` com `motivo==="indicacao"` e `ref` a começar por `"indicacao:"` | mês **UTC** (`mesUTC`) | `LIMITE_INDICACOES_MES = 10` | o ledger de pontos credita (+50) |
| `verificarLimiteMensal` (on-chain) | `_lib/referral.mjs:456` | Blob `referral-monthly:{end}:{AAAA-MM}.conversoes` | mês **UTC** (`mesAtualKey`) | `LIMITE_MENSAL = 10` | o crédito on-chain tem sucesso |

**Alinhamento (R18-110h.4-1: «alinhada com o limite das indicações do 110f»):** mesmo **número** (10)
e mesma **janela** (mês UTC) ✅. **Mas os contadores DIVERGEM** quando um dos créditos falha: se o
`creditarSenhas` falhar (transitório), o contador on-chain **não** incrementa e o dos pontos **sim** (ou
vice-versa). Consequência: um indicante pode ter 10 indicações pagas em pontos e ainda ter folga no
contador on-chain. **Medido por leitura, não corrigido** (GAP-4).

### -1.5 GAPS medidos na Frente A (o que É preciso fazer)

| # | gap | medido em | severidade | decisão neste UTAC |
|---|---|---|---|---|
| **GAP-1** | a contagem **falha ABERTA**: `verificarLimiteMensal` devolve `{ok:true, conversoes:0, fonte:"fail-open"}` se o Blobs estiver indisponível (:457-458) ⇒ **credita on-chain sem quota** (gas ilimitado durante uma indisponibilidade) | `_lib/referral.mjs:457-458` | **média** | **CORRIGIR** (é a ordem explícita do §A3: «se a contagem falhar → não creditar on-chain (conservador)») |
| **GAP-2** | a quota **não tem teste nenhum** | 0 ocorrências no grep | média | **CORRIGIR** (§A4) |
| **GAP-3** | ⚠️ **o marcador de convertido é gravado na mesma quando a quota bloqueia** — `registrarConversao:587` só considera transitórios os códigos ≠ `limite_mensal_excedido`, e o marcador (`referral-convertido:{codigo}:{indicado}`) é **definitivo por (codigo, indicado)**: aquele indicado **nunca mais** gera a senha on-chain do indicador, nem depois de o mês virar | `_lib/referral.mjs:587-612` | **média** | **NÃO corrigir** — é a ⚠️-1 já escalada; **parte um caso legítimo** (perde o bónus para sempre por ter entrado no mês errado) e a correcção muda uma doutrina documentada (R2: «o marcador é a FONTE ÚNICA») que o operador **não decidiu**. Registado como **DEBT-032** e escalado. |
| **GAP-4** | **TOCTOU da quota**: `verificarLimiteMensal` verifica FORA do CAS, o crédito é submetido, e o contador só incrementa depois ⇒ N conversões **em paralelo** perto do limite podem ultrapassá-lo em até N−1. **É a MESMA família de defeito já declarada e aceite** para o limite do 110f (`fontes-lance.mjs:184-186`: *«9 pagos + 6 em paralelo → 14 … Fechar exige contador atómico — UTAC próprio»*), agora medida **também no contador on-chain** (custo: gas a mais) | `_lib/referral.mjs:483` + `:491` + `:517` | média | **NÃO corrigir** (exige contador atómico — UTAC próprio, como a 110f declarou) — **medido e registado** como **DEBT-033**, com teste que documenta o comportamento |
| **GAP-5** | **custo não documentado** | — | baixa | **DOCUMENTAR** (§A5) |

---

## -1.6 FRENTE B — medição do grafo social (§e do enunciado)

> ⚠️ **O instrumento do enunciado é CEGO para 7 das 8 ocorrências.** O `grep -rn
> "registrarConversao|indicante.indicado|indicou"` proposto devolve, medido:
> `indicou` → **0 ocorrências** (em `netlify/` e `src/`, fora de testes — a string não existe no
> código); `indicante.indicado` → 0; `registrarConversao` → **15 ocorrências, 12 delas em `_tests/`**
> (as 3 de produção são chamadas, não logs). **Conclusão: o grep do enunciado mediria ~0 fugas reais.**
> Substituído por uma varredura por **semântica** (as chaves `indicador:`/`indicado:`/`endereco:` em
> argumentos de log, mais `appendReferralLog` e `captureSecurityAlert`). Registado — é a mesma família
> de erro do `^.` do MC96.5 (um instrumento que devolve vazio lido como «não há»).

A medIção completa, ocorrência a ocorrência e com a classificação, está em ficheiro dedicado:
**`_logs/UTAC110h.4-GRAFO.md`**. Resumo: **8 ocorrências de GRAFO** (par indicador+indicado) — **1
mascarada, 7 a descoberto** — repartidas por **4 superfícies**: console do backend (INTERNO),
`referral-log` persistido (INTERNO-em-repouso), **Sentry** (EXPOSTO — serviço externo) e **resposta de
API** (EXPOSTO — cliente).

**A DEBT-031 estava SUBESTIMADA:** descreve **1** ocorrência (`referral.mjs:193`, hoje **:198** — a linha
andou 5 linhas por causa das 4 linhas de comentário que o próprio 110h.3 acrescentou a :160), com a
correcção «trivial (1 linha)». A varredura sistemática mede **8 de grafo + 9 de endereço isolado**.

---

## -1.7 FRENTE D — confirmação das pendências do 110h.3 (só leitura, §D1)

| pendência | instrumento | medido | veredicto |
|---|---|---|---|
| **P1** — contador de indicações na UI | `grep`/leitura | `ler-pontos.mjs:23,46` usa `indicacoesDoMes` (campo aditivo) e `PainelIndicacao.jsx:244-246` mostra «Este mês: X / 10 indicações»; commit `3d72419` | **FEITA** ✅ |
| **P2** — «Senhas creditadas» no relatório admin | `grep` | **0 ocorrências em código de produção**; `_lib/referral.mjs:271` diz «Recompensas on-chain creditadas»; resíduos só no teste que **proíbe** o texto antigo (`utac110h3-pendencias.test.mjs:173`), no arnês de mutação e em `CLAUDE_DEBUG.md:884` (documento, fora do escopo — declarado no 110h.3) | **FEITA** ✅ |
| **P4** — data da Privacidade | leitura | `src/pages/Privacidade.jsx:45` = «15 de outubro de 2026» | **FEITA** ✅ |
| **Boot.jsx** — teste de comportamento | `ls`/`git show --stat` | `src/__tests__/utac110h3-boot-comportamento.test.mjs` existe (5 895 bytes) e entra no commit `3d72419` | **FEITA** ✅ |

**Nenhuma pendência do 110h.3 por fechar ⇒ nada a escalar na Frente D.**

---

## -1.8 Conflitos e ambiguidades (AU3 / GATE 12)

> ⚠️ **CONFLITO 1 (declarado) — a premissa da DEBT-030 é falsa.** «SEM QUOTA» não se confirma: a quota
> existe, é de 10/mês por indicante, é UTC, e nasceu no commit `1470369`. Executa-se a **intenção** do
> R18-110h.4-1 (garantir a quota) fechando os gaps reais dela (GAP-1, GAP-2, GAP-5) e escalando os que
> partem casos legítimos (GAP-3) ou exigem desenho novo (GAP-4).

> ⚠️ **CONFLITO 2 (escalada ao operador) — GAP-3 (o marcador definitivo) parte um caso legítimo.** Ver
> §-1.5. Não se corrige sem decisão: a correcção muda a doutrina R2 do marcador.

> ⚠️ **CONFLITO 3 (escalada ao operador) — há EXPOSIÇÃO (Sentry + resposta de API).** O §R18-110h.4-2
> manda, quando o log é EXPOSTO, «correcção + auditoria de todos os logs + revisão da Data Safety», e a
> ressalva do enunciado manda **não corrigir sozinho e escalar** (pode exigir decisão sobre Data Safety).
> Resolução: **mascarar o que é log** (autorizado e sem efeito de produto) e **escalar** o que muda
> contrato/Data Safety (o campo `indicador` da resposta de API e a revisão da Data Safety).

> ℹ️ **CONFLITO 4 (menor) — o log de auditoria em repouso tem de ficar.** `appendReferralLog` grava
> `{indicador, indicado}` no Blob `referral-log`, e o relatório admin **precisa do endereço real** para
> agregar o «top 3 indicadores» (`gerarRelatorioIndicacoes:252-260`), mascarando **na saída**
> (`abreviarEndereco`). Mascarar na **escrita** partiria o relatório (colisões «0x1234…abcd» a somar
> indicadores diferentes) — trade-off que parte um caso legítimo ⇒ **não se mascara na escrita**;
> classificado INTERNO-em-repouso e declarado.

---

## -1.9 Veredito

**VEREDITO: SEGUIR** — as 4 frentes são exequíveis com as autorizações dadas, com **4 desvios/flags
declarados**: (1) a premissa da DEBT-030 está refutada (a quota existe) e o trabalho desloca-se para os
gaps reais; (2) o instrumento de medição (§e) é cego e foi substituído; (3) GAP-3 fica escalado, não
corrigido; (4) há exposição externa (Sentry) ⇒ mascarar o que é log e escalar a Data Safety. O
**contrato on-chain NÃO é tocado** (só leitura). `REGULAMENTO-v5.md` **não é tocado**.
