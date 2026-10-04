# UTAC106x.5 — DEBT-006: DISCREPÂNCIA DE CONTAGEM EM WORKTREE (logs)

**Tipo:** infraestrutura de testes · **Skill UTAC** · **Data:** 2026-10-04 ·
**Modelo:** deepseek-v4-flash (Hermes Agent) · **Baseline:** `49889cb` · **Estado:** em curso

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

*(preenchido no fecho)*

---

## §5 ESTADO FINAL + REGISTO

*(preenchido no fecho)*
