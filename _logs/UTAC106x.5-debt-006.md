# UTAC106x.5 — DEBT-006: DISCREPÂNCIA DE CONTAGEM EM WORKTREE (logs)

**Tipo:** infraestrutura de testes · **Skill UTAC** · **Data:** 2026-10-04 ·
**Modelo:** deepseek-v4-flash (Hermes Agent) · **Baseline:** `49889cb` · **Estado:** **FECHADO**
(`8499425` fix → `02bc335` DEBT/R14 → fecho)

> Corrige a **DEBT-006** (baixa severidade) antes do UTAC106a, para o mapeamento do fluxo correr com
> medição fiável. Diferente do UTAC106x.3: ali documentou-se a **criação/remoção de junctions** (A13);
> aqui investiga-se a **discrepância de contagem de testes** em si.

---

## §1 BASELINE (SEG-1) — a discrepância, com números exactos

`HEAD == origin/main == 49889cb` (0/0).

| | testes | pass | fail | skipped (reporter) | linhas `﹣` |
|---|---|---|---|---|---|
| **Repo principal** | **998** | **992** | 0 | **6** | 6 |
| **Worktree (pré-fix)** | **991** | **984** | 0 | **7** | **8** (1 aninhada) |
| **Δ** | **−7** | **−8** | 0 | **+1** | **+2** |

**Frontend: 694/694 nos dois lados** — a discrepância é **só no backend**.

### A aritmética, explicada (para não haver números soltos)

- **7 testes deixam de ser descobertos** (998 → 991).
- **2 testes passam a *skip***, e um deles é **aninhado** (indentação 2) — por isso as *linhas* `﹣` sobem
  2 (6 → 8) mas o contador do reporter sobe **1** (6 → 7), e o `pass` cai **8**.
- **9 nomes** existem como *pass* no main e não no worktree: 7 não descobertos + 2 skips = 9 ✅
  (a conta fecha).

### Os testes afectados (todos num único ficheiro)

`desafio-gut/frontend/netlify/functions/_tests/mc93e-fork-onchain.test.mjs` — o grupo **MC93-E** do
contrato num EVM local. Os 2 skips novos (identificados pelo próprio motivo que o teste imprime):

1. `a fixture é o que o solc produz a partir desta fonte` → *«solc não instalado (não vem no
   package-lock.json)»*
2. `MC93-E · cenário on-chain numa EVM local` → *«POR INSTALAR, não impossível: @nomicfoundation/edr
   não resolve…»*

E os 7 que não chegam a ser descobertos são os restantes do mesmo grupo (`o deploy põe bytecode…`,
`adicionarSenhas → darLance…`, `CONTROLO NEGATIVO/POSITIVO…`, `creditar LOGO A SEGUIR…`, `só a
coordenação credita senhas…`, `⚠️ chamar adicionarSenhas num endereço SEM bytecode…`).

### Reprodução exacta

```sh
# repo principal
cd desafio-gut/frontend/netlify/functions && node --test --experimental-test-module-mocks _tests/*.test.mjs
#   → ℹ tests 998 · pass 992 · skipped 6

# worktree (pelo helper A13) e o mesmo comando lá dentro
node scripts/worktree-helper.mjs criar <TEMP>/wt <sha>
#   → ℹ tests 991 · pass 984 · skipped 7      (pré-fix)
```

---

## §2 CAUSA RAIZ (SEG0)

**A hipótese «junction» está certa — mas era uma junction que FALTAVA.**

O helper (A9/A13) ligava **dois** `node_modules` (`desafio-gut/frontend/node_modules` e
`.../netlify/functions/node_modules`). Não ligava a **raiz do monorepo**: `desafio-gut/node_modules`.

**Porque isso importa:** os testes do backend resolvem módulos com
`createRequire(import.meta.url)("solc")` a partir de `_tests/` — a resolução **sobe a árvore** e, no repo
principal, chega a `desafio-gut/node_modules`, onde vivem as dependências **dev-only**. No worktree essa
pasta **não existe**, a resolução falha e o teste converte-se em *skip* (ou nem é descoberto).

### Prova (cadeia de resolução, `createRequire` a partir de `_tests/`)

| módulo | repo principal | worktree (pré-fix) |
|---|---|---|
| `solc` | `…\DESAFIOGUT\desafio-gut\node_modules\solc\index.js` | **MODULE_NOT_FOUND** |
| `@nomicfoundation/edr` | `…\DESAFIOGUT\desafio-gut\node_modules\@nomicfoundation\edr\index.js` | **MODULE_NOT_FOUND** |
| `ethers` | `…\frontend\netlify\functions\node_modules\ethers\…` | ✅ (vem da junction que já existia) |

E, medido: no repo principal `desafio-gut/node_modules` **existe** (com `solc`, `hardhat` e
`@nomicfoundation`); no worktree **não existia**. O `ethers` resolve nos dois porque está nos
`frontend/...` — que **já** eram ligados. Isso explica porque é que **só** estes testes falhavam.

**Outras hipóteses descartadas por medição:** não é o `node --test` discovery (o mesmo comando, no mesmo
caminho relativo, encontra 991 em vez de 998 — a diferença vem de *imports* que resolvem a menos), nem
`cwd`, nem env. É **resolução de módulos**, e é especificamente a raiz que faltava.

---

## §3 ACÇÃO (SEG1) — decisão **(a) FECHAR**

A decisão é **(a) fechar**, porque é viável **sem** alterar testes, **sem** alterar produção e **sem**
alterar a regra A13/A9 — os três limites do enunciado.

**A correcção (Ponytail — uma linha, GATE 6):** acrescentar `"desafio-gut/node_modules"` à lista
`JUNCTIONS` de `scripts/worktree-helper.mjs`. Nada mais.

**GATE 8 — bidireccional, medido nas duas direcções:**

| estado | backend (worktree) |
|---|---|
| sem a 3.ª junction (pré-fix) | 991 / 984 / 7 skipped |
| **com** a 3.ª junction | **998 / 992 / 6 skipped** = **idêntico ao repo principal** |
| removida outra vez | **991 / 984 / 7** ← confirma que é *esta* a variável |

**Confirmações obrigatórias:**

- Worktree **completo** (frontend + backend) pelo caminho do helper corrigido: **VERDE 694/694 + 992/998**
  (exit 0) — os mesmos números do repo principal.
- Repo principal: **VERDE 694/694 + 992/998** — **sem regressão**.
- Teste do próprio helper: **12/12** (usa `res.junctions.length >= 1` e itera, por isso aceita a 3.ª
  junction sem alteração — verificado antes de mexer, porque o enunciado **proíbe alterar testes**).
- As 3 junctions são criadas e **removidas** sem tocar no `node_modules` real (o helper faz `rmdir`
  primeiro, A13) — o `remover` devolveu `ok:true`.

**DEBT-006 → FECHADA**, com citação do commit (ver §5).

---

## §4 VALIDADOR ADVERSARIAL (SEG2)

Subagente independente em worktree próprio (criado com `scripts/worktree-helper.mjs`).

### 4.1 Ronda 1 — commit `02bc335` → **APROVADO** (1 ⚠️ latente + 2 ℹ️)

**Não conseguiu refutar nenhum dos 5 eixos**, e reproduziu todas as provas por medição própria:

- **(a) Resolve na totalidade?** Comparação **teste a teste** (não só totais): correu os dois lados com
  `--test-reporter=tap` e comparou linha estrutural a linha estrutural — **1917 linhas iguais em cada
  lado, 0 diferenças** no backend; **794 linhas, 0 diferenças** no frontend. Nenhum teste passa num lado e
  não no outro. As 6 skips são as pré-existentes (1 R5 + 5 `SUPABASE_CONTRATO_URL/KEY`).
- **(b) Introduz discrepância nova?** Não. `git status` do worktree = **0** (a junction é gitignored,
  `.gitignore:2:node_modules/`); helper **12/12** (T7 lê `res.junctions.length >= 1` e itera).
- **(c) Aceitação prematura?** Não — `npm ci` no worktree seria o oposto do propósito das junctions, e
  tocar nos testes está proibido.
- **(d) Causa raiz certa?** Confirmada por ele: `solc`/`hardhat`/`@nomicfoundation/edr` existem **só** em
  `desafio-gut/node_modules` (ausentes nos dois `frontend/...`); a cadeia `createRequire` dá
  `MODULE_NOT_FOUND` num worktree sem a raiz. **GATE 8 bidireccional reproduzido por ele** num worktree
  descartável.
- **(e) Números iguais?** Sim — e o helper cria **e remove** com segurança (`node_modules` real
  **568/499/414** antes e depois, inalterado).

| # | Achado | Tratamento |
|---|---|---|
| **⚠️ F1** | **Residual latente:** o fix ligava só `desafio-gut/node_modules`. A **raiz do GIT** (`DESAFIOGUT/node_modules`, 449 pacotes) continuava por ligar ⇒ **105 pacotes** (ex.: `chai`, `ts-node`, `typechain`, `@solidity-parser/parser`) resolviam no main e **não** no worktree. **Impacto actual: nulo** (nenhum teste os importa — medido), mas a equivalência **não era total** e isso não estava documentado | **FECHADO** (§4.2) — 4.ª junction |
| ℹ️ F2 | Deriva A13: a regra documenta **2** junctions, o helper passa a criar **4** | **Declarado** — o enunciado **proíbe** alterar a A13 (pendência para UTAC próprio) |
| ℹ️ F3 | O log mantinha «Estado: em curso» e §4/§5 por preencher | **CORRIGIDO** (§4/§5 fechados agora) |
| ℹ️ F4 | `solc`/`er` não estão no `package-lock.json` ⇒ em CI (`npm ci`) o grupo MC93-E volta a saltar | **Declarado** — o «verde» do worktree reproduz o **main local**, não o CI (limite pré-existente, documentado no próprio teste) |

> **Veredicto (verbatim):** *«VEREDICTO: **APROVADO** (com 1 residual ⚠️ latente + 2 ℹ️)»*

### 4.2 Correcção do ⚠️ F1 — a 4.ª junction (raiz do GIT)

Medido antes de adoptar: com a 4.ª junction os 105 pacotes **resolvem** (`chai`, `@solidity-parser/parser`,
`ts-node`, `typechain` → `…\DESAFIOGUT\node_modules\…`), a suíte mantém **998/992/6** e o `git status` do
worktree continua **0**. Adoptada: `JUNCTIONS` passa a ter **4** entradas (as **duas** raízes + os dois
`frontend/...`). Prova end-to-end pelo caminho do helper: worktree recriado com **4** junctions ⇒
**694/694 + 992/998** (idêntico ao repo principal).

> ⚠️ **Declarado:** a versão que o validador aprovou tinha **3** junctions; a versão final tem **4**. A
> correcção do F1 **não passou por validação independente** (HI5 — ver §6).

---

## §5 ESTADO FINAL + REGISTO (SEG3)

| Item | Estado |
|---|---|
| Discrepância reproduzida com números exactos | ✅ §1 |
| Causa raiz identificada com evidência | ✅ §2 (cadeia `createRequire` medida) |
| Decisão | ✅ **(a) FECHAR** |
| Worktree dá os mesmos números do repo | ✅ **694/694 + 992/998** nos dois |
| Suíte no repo principal verde | ✅ sem regressão |
| Validador adversarial + veredicto | ✅ **APROVADO** (§4.1) |
| Registo em 3 lugares | ✅ abaixo |
| Commit + push foreground | ✅ `8499425` (fix) → `02bc335` (+ DEBT/R14) → fecho |
| Custo de API | ✅ §6 |

**Registo em 3 lugares (R18):**
1. `_logs/UTAC106x.5-debt-006.md` (este, detalhado)
2. `CLAUDE.md` — bloco **R14** do x.5 (única zona autorizada; resto byte-idêntico)
3. `Desktop/RELATORIO-UTAC106x.5-DEBT006.txt`

**Ficheiros alterados:** `scripts/worktree-helper.mjs` (a lista `JUNCTIONS`), `_logs/DEBT.md` (DEBT-006 →
FECHADA), `CLAUDE.md` (só o bloco R14), `_logs/UTAC106x.5-debt-006.md` (novo). **Zero** código de produção,
**zero** testes, **zero** alterações à A13/A9.

---

## §6 CUSTO DE API + PENDÊNCIAS

### Custo (SEG3.5)

**NÃO MENSURÁVEL** neste ambiente (sem telemetria de tokens/facturação). **Declarado, não estimado.**
Consumo observável: **1 subagente validador** (702 s) + ~55 chamadas de ferramenta no executor.

### Pendências declaradas

1. ⚠️ **HI5 EXCEDIDO** — este UTAC passou de 1 h (investigação + validador + correcção do F1). Declarado.
2. ⚠️ **A correcção do F1 (4.ª junction) NÃO passou por validação independente** — o validador aprovou a
   versão de **3** junctions; a final tem **4**. Verificado por medição própria (105 pacotes resolvem,
   suíte 998/992/6, `git status` 0, worktree recriado pelo helper ⇒ 694/694 + 992/998).
3. **Deriva A13 (ℹ️ F2)** — a regra `A-ambiente.md` (linhas ~115-116) documenta **2** junctions e o helper
   cria **4**. **Não corrigida** (o enunciado proíbe alterar a A13). **Recomendação:** UTAC próprio de 1
   linha para alinhar a regra ao helper.
4. **CI vs local (ℹ️ F4)** — `solc`/`@nomicfoundation/edr` **não** estão no `package-lock.json`; em CI
   (`npm ci`) o grupo MC93-E volta a *skip*. O «verde» do worktree reproduz o **main local**. Limite
   pré-existente, documentado dentro do próprio teste.
5. **O `node_modules` da raiz do GIT tem 449 pacotes** e é ligado inteiro ao worktree — só os que os
   `_tests/` alcançam importam, mas a junction é total (não selectiva). Se algum dia pesar, a alternativa é
   `NODE_PATH`, que o Node já não honra para ESM.
