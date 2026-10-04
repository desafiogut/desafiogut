# UTAC106x.3 — REGRA A13: JUNCTIONS EM WORKTREE (logs)

**Tipo:** infraestrutura + documentação da regra · **Skill UTAC** · **Data:** 2026-10-04 ·
**Modelo:** deepseek-v4-flash (Hermes Agent) · **Baseline:** `27f8b55` · **Estado:** em curso

> **Origem:** no UTAC106x.1, a limpeza do worktree destruiu dois `node_modules` reais.
> O operador autorizou UTAC próprio (este) e ordenou-o **antes** do UTAC106x.2, porque o x.2
> precisa de worktree fiável para o validador adversarial.

---

## §1 BASELINE + REPRODUÇÃO (SEG-1)

| Item | Medido |
|---|---|
| `HEAD` / `origin/main` | `27f8b55` (0/0) |
| Regras `A` existentes | **A1–A12** ⇒ o próximo livre é **A13** ✅ |
| Suíte | **VERDE 694/694 · 992/998** |
| Disco | **19 GB** livres (> 5 GB) |
| `node_modules` reais | intactos (`frontend` 499 · `netlify/functions` 414) |
| Recorrência do tema | **25 commits** mencionam «worktree» (`git log --grep=worktree`); no UTAC000.10 (Frente F) foram removidos **7** worktrees |

### Reprodução (alvo DESCARTÁVEL — nunca o `node_modules` real)

**Repro A — caminho > MAX_PATH.** `git worktree` + junction + caminho de **570 chars** dentro do alvo:
```
$ git -C <raiz> worktree remove C:/Users/Moltbot/AppData/Local/Temp/utac106x3/wt
error: failed to delete 'C:/Users/Moltbot/AppData/Local/Temp/utac106x3/wt': Filename too long
exit code: 255
```
⇒ É a **mensagem exacta** do incidente do UTAC106x.1.

**Repro B — caminhos curtos (o caso GRAVE).** Worktree + junction + alvo de 3 ficheiros:
```
git worktree remove -> exit 0   (sem qualquer aviso!)
alvo DEPOIS: 0 ficheiros        <== ESVAZIADO  →  PERDA SILENCIOSA
```
⇒ `exit 0` e o alvo **destruído**: o delete recursivo **segue o reparse point**. Pior do que o
«Filename too long», que ao menos aborta.

**Contra-prova — procedimento correcto (rmdir das junctions PRIMEIRO):**
```
(a) rmdir da junction  -> exit 0 | junction deixa de existir
(b) git worktree remove -> exit 0 (limpo)
(c) git worktree prune  -> exit 0
alvo DEPOIS: 3 ficheiros  <== INTACTO
```
⇒ **A ordem é a correcção.** O worktree de teste foi removido; nada do repo foi tocado.

### Primitivas medidas (para o helper)
| Primitiva | Medição |
|---|---|
| `spawnSync("cmd", ["/c","mklink","/J",link,alvo])` | status **0**, junction criada (sem `.bat`) |
| `lstatSync(link).isSymbolicLink()` | **true** para uma junction ⇒ dá para a **detectar** |
| `spawnSync("cmd", ["/c","rmdir",link])` | status **0**, **link removido, alvo intacto** |
| varrer a árvore sem descer nos reparse points | devolve a junction aninhada, sem a seguir |

---

## §2 SEG0 — REGRA A13 ESCRITA

**`desafio-gut/frontend/skills/utac/protocol/regras/A-ambiente.md`** — acrescentada a regra **A13**
(«Junctions em worktree: criar e remover (o delete SEGUE a junction)»), com: o que se mediu (as 2 repros),
o procedimento de **criação**, o procedimento de **remoção na ordem obrigatória** e a **guarda** («nunca
`git worktree remove` nem `rm -rf` com junctions dentro»). Inclui a alternativa medida em Node
(`spawnSync` + `lstat().isSymbolicLink()`) e remete para `scripts/worktree-helper.mjs`.

**`desafio-gut/frontend/skills/utac/SKILL.md`** — duas referências actualizadas (a árvore de pastas
«A1-A13» e a tabela «As 10 categorias de regras» → `A1-A13`).

**Consistência com a A9:** a A9 fica **intacta** (descreve *porque* as junctions existem e como criá-las);
a A13 **acrescenta** o procedimento de remoção e a guarda. A A9 já dizia «removê-las com `rmdir` — nunca
`rm -rf`»; a A13 **prova-o** e estende-o a `git worktree remove`. Sem contradição (A13 cita A9).

---

## §3 SEG1 — SCRIPT AUXILIAR (justificado)

**Decisão: CRIAR.** Justificação (Ponytail ≠ não fazer nada; GATE 5): o procedimento manual tem 3 passos
dependentes de ordem, a invocação `cmd /c 'a & b'` do git-bash **falha em silêncio** (medido), e o modo de
falha é **destrutivo** (perda silenciosa de um `node_modules`). Um helper que **recusa** o delete recursivo
enquanto existirem reparse points converte um erro irreversível num erro ruidoso.

**`scripts/worktree-helper.mjs`** — `criar(path, sha, {junctions})`, `listarReparse(dir)`, `ehReparse(p)`,
`removerJunction(p)`, `remover(path)` + CLI (`criar|check|remover`). A **invariante**: `remover` faz
`rmdir` das junctions, **re-verifica**, e **ABORTA** se restar alguma; o fallback `rm -rf` só corre depois
de provar que não há reparse points.

**`scripts/worktree-helper.test.mjs`** (fora da suíte canónica — corre a mão):
| Teste | Resultado |
|---|---|
| T1 worktree criado | ✔ |
| T2 junction existe e é reparse point | ✔ |
| T3 `listarReparse` acha 1 sem descer nele | ✔ |
| T4 `remover` apaga junction + worktree | ✔ |
| **T5 o ALVO fica INTACTO** (o caso central) | ✔ |
| T6 `remover` de caminho inexistente é idempotente | ✔ |

**Mutação (R16/GATE 7) — mutando uma CÓPIA, nunca o ficheiro do repo:**
| Mutante | Defeito | Testes RED |
|---|---|---|
| **M1** | desliga só o `rmdir` | **T4** (o **guarda** detecta a junction e ABORTA) |
| **M2** | desliga o `rmdir` **e** o guarda | **T5** (o alvo é **esvaziado**) |
⇒ 2/2 mutantes mordem, em asserções **diferentes**; `md5` do helper do repo **idêntico** antes/depois.

> ⚠️ **Correcção declarada:** a 1.ª corrida de mutação tinha um **check vácuo** (procurava «T5» no texto,
> que aparece mesmo quando o teste PASSA) e o mutante M1 na verdade exercitava o **guarda**, não o `rmdir`.
> Refiz com 2 mutantes e leitura estrita dos testes que falham. (Mesmo defeito de método que o controlo
> negativo do UTAC106x.1 apanhou no spec — registado por ser recorrência.)

---

## §4 VALIDADOR ADVERSARIAL (SEG2)

*(preenchido no fecho)*

---

## §5 PENDÊNCIAS (declaradas)

1. **`protocol/ambiente.md`** — a skill manda acrescentar **prosa** além da regra em `regras/A`. A prosa
   **não** foi tocada: **não estava na lista de autorizações** (GATE 3/HI4 — o executor não estende o
   próprio escopo). Fica recomendado.
2. **Suíte canónica** intocada (os testes do helper correm à mão) — decisão declarada para não perturbar
   `694/694 · 992/998`.
3. **UTAC106x.2** — arranca depois deste (worktree já fiável).
