# UTAC107g.3 — Correção do `rc=1`: substring → match exato (DEBT-021)

**Executor:** Opus 5.5 (Claude Code) · **Data:** 2026-10-06 · **Tipo:** segurança de interface (frontend)
**Baseline:** `ceb5ab8` (= origin/main) · **Commit do código:** `4ca743d`

## Baseline (SEG-1)

| item | medido |
|---|---|
| HEAD / origin/main | `ceb5ab884b07853c49d494e6c11895d73d32299d` (iguais, 0 commits por empurrar) |
| Suíte canónica | frontend **843/843** · backend **1095/1101** (VERDE) |
| `_logs/UTAC107g.3-rc1.md` | não existia (107g.3 por fazer) |
| Disco C: | 12 G livres (> 5 G) |
| `.bak-*` | 5 (md5 registados antes de tocar; ver SEG3) |
| `EM_BREVE_MODE` | `true` (`src/lib/leilaoLock.js:10`) |
| Contexto lido | `_logs/DEBT.md` (DEBT-021), `_logs/UTAC107g.1-pendencias.md`, `_logs/UTAC107g-navegacao.md` |

Árvore: 30 ficheiros não versionados em `_logs/` (MC100_*, MC101_*, de outras sessões). Não foram tocados.

## SEG0 — Medição

`grep` em `src/` (sem `node_modules`, sem `.bak-*`) por `rc=1`, `rc=` e `'rc'`, e por qualquer
`location.search|href|hash|pathname` testado com `.includes/.indexOf/.match/.startsWith`:

| ficheiro:linha | o quê | comparação |
|---|---|---|
| `src/App.jsx:148` (`CorporativoRoute`, ramo `!isConnected`) | sem sessão, deixa passar se a query tiver `rc=1` | **`window.location.search.includes("rc=1")`**: substring, **o defeito** |
| `src/pages/CorporativoDashboard.jsx:32-33` | limpa o `?rc=1` da URL ao montar | `new URLSearchParams(window.location.search).get("rc") === "1"`: **já era exato** |
| `src/widgets/layout/BottomNav.jsx:104,298,301` | destaque do item activo | `location.pathname.startsWith(path)`: só estilo, **não é segurança** (registado, não tocado) |

- **O que `rc=1` abre:** a `CorporativoRoute` protege 8 rotas (`/seguranca`, `/corporativo`, `/corporativo/cotas`,
  `/banners`, `/analytics`, `/cupons`, `/carteira`, `/mercado`; ver DEBT-021). Sem sessão e com `rc=1`, a guarda devolve
  `children`: a UI abre. O gate de cota inactiva vem depois do ramo `!isConnected`, por isso não aparece. Os dados
  continuam protegidos no servidor (as escritas exigem sessão).
- **Router:** `BrowserRouter` (`src/main.jsx:113`). A guarda lê `window.location.search`, não o hash.
- **Reprodução (pura, com a expressão real de `App.jsx:148`):** `"?src=1".includes("rc=1")` → `true`. O mesmo para
  `?arc=10`, `?rc=10`, `?xrc=1`, `?rc=1x`, `?arc=1` e `?foo=1&src=1`: **todos abriam**. Ficou fixado como teste
  («cada ataque ABRIA com o substring antigo»). A reprodução no browser não foi feita: exige passar o gate legal LGPD,
  que é um consentimento em nome do operador (o mesmo limite do MC99.2). Declarado.
- **Produtor de `?rc=1`:** continua a haver 0 (DEBT-021). Preservar `rc=1` como abre-a-UI é a decisão 2 do operador.

## SEG1 — Correção

- **Novo** `src/lib/acessoDiretoCadastro.js`: `temAcessoDiretoCadastro(search)`. Devolve `false` se a entrada não for
  texto, senão `new URLSearchParams(search).get("rc") === "1"`.
- `src/App.jsx`: um `import` + a linha 148 passa a `if (!temAcessoDiretoCadastro(window.location.search)) return <Navigate to="/" replace />;`.
- **Extensão de escopo declarada:** criei um ficheiro em `src/lib/` em vez de pôr a expressão inline no `App.jsx`. Motivo:
  o `App.jsx` não se importa em teste (traz o Privy), e só uma função pura permite um teste de comportamento. É o padrão
  do repo (`retornoOAuth.js`, MC94.3.2).
- **Não alterado:** `CorporativoDashboard.jsx` (já era exato), backend, navegação, copy, `.bak-*`, package*, `CLAUDE.md`
  (fora do bloco R14), `EM_BREVE_MODE`.
- Diff: `App.jsx` +2/−1, helper +10, teste +60.

## SEG2 — Testes + mutação

`src/lib/acessoDiretoCadastro.test.mjs`, com 6 testes bidirecionais (GATE 8):
1. cada ataque (`?src=1`, `?arc=10`, `?rc=10`, `?xrc=1`, `?foo=1&src=1`, `?rc=1x`, `?arc=1`) **abria** com o predicado
   antigo, o que prova que os casos são discriminantes;
2. nenhum deles abre com o match exato;
3. `?rc=1`, `?foo=bar&rc=1`, `?rc=1&utm=x` e `?rc=%31` **continuam a abrir** (MC17 preservado);
4. `""`, `?`, `?rc=`, `?rc=0`, `?rc=2`, `?RC=1`, `?rc= 1`, `?rc`, `?rc=true` e entradas não-texto **não abrem**;
5. cablagem: a `CorporativoRoute` chama o helper sobre `window.location.search` e o `import` existe;
6. o `App.jsx`, sem comentários, não volta a testar a query string por substring.

**Mutação 6/6 RED.** Restauro com md5 idêntico nos 2 ficheiros. Script no scratchpad da sessão (`mut-107g3.mjs`), fora
do repo.

| mutante | resultado |
|---|---|
| M1 o App volta ao `includes("rc=1")` | RED (2) |
| M2 o helper volta a substring | RED (2) |
| M3 o helper usa `get("rc").startsWith("1")` | RED (1) |
| M4 o helper devolve sempre `true` | RED (2) |
| M5 sem guarda de tipo | RED (1) |
| M6 o App deixa de verificar o `rc` | RED (1) |

## SEG3 — Verificação

- Suíte canónica: **frontend 849/849 (= 843 + 6) · backend 1095/1101**, VERDE.
- `npx vite build` (para o scratchpad, **não** para o `dist/` do APK): ✓ 14,98 s. No bundle há **0** ocorrências de
  `includes("rc=1")` e **0** de `rc=1` em qualquer chunk. O helper aparece minificado em `PrivyRoot-*.js`
  (`typeof e=="string"?new URLSearchParams(e).get("rc")==="1":!1`).
- `.bak-*`: os 5 com md5 igual ao baseline (verificado de novo no fecho).
- `EM_BREVE_MODE = true`.

## SEG4 — Validador adversarial

Subagente independente, em worktree próprio (helper A13), sobre o commit `4ca743d`. Veredicto integral em
`_logs/UTAC107g.3_SEG4_VALIDADOR.md`.

**Veredicto: APROVADO** (0 ⛔, 0 ⚠️). Testou uma matriz de 35 URLs de ataque: codificações, parâmetros repetidos, hash,
maiúsculas, espaços largura-zero e dígitos unicode. Fez 4 mutações próprias (todas RED), restaurou com md5 e o
`git status` ficou limpo. Confirmou: backend intacto, 5 `.bak-*` com md5 iguais, suíte 849/849 + 1095/1101,
`EM_BREVE_MODE = true`, e 0 `includes("rc=1")` no bundle.

Notas (todas ℹ️):
- **I-1:** `?rc=1` exato continua a abrir a UI a um anónimo. É por desenho (MC17, decisão 2 do operador). Remover a
  porta fica fora deste UTAC.
- **I-2:** `?%72c=1` / `?r%63=1` / `?rc=%31` passam a abrir. Descodificam para `rc=1`: é a mesma porta.
- **I-3:** vale o 1.º valor (`?rc=1&rc=2` abre, `?rc=2&rc=1` não). Inócuo.
- **I-4:** em 7 das 8 rotas o `?rc=1` fica na URL. É anterior a este UTAC e não mudou.
- **I-5:** `App.jsx.bak-*` ainda tem o padrão antigo. É um arquivo, não é servido.
- **I-6:** `startsWith` (BottomNav) e o regex `privy_oauth_` não controlam acesso.

Validador: ~97 k tokens.

## SEG5 — DEBT-021 + deploy + registo

- **DEBT-021 → FECHADA** (`_logs/DEBT.md`): a correção do objectivo (substring → exato) é total. O resíduo I-1
  (`?rc=1` exato, sem produtor) fica anotado na própria linha como **preservado por decisão do operador**. Remover a
  porta exige um UTAC próprio e uma decisão.
- **Deploy:** push `ceb5ab8..4ca743d` (auto-deploy). O entry passou de `index-4MPVXBeU.js` para `index-Dns58GNo.js`.
  home **200**, health **200** `application/json`. No chunk servido `PrivyRoot-D1hDRK22.js` (`application/javascript`)
  há **0** `includes("rc=1")` e está presente `new URLSearchParams(e).get("rc")==="1"`.
- `package-lock.json`: **não sujo** (nada a restaurar).
- **Worktree do validador** removido pelo helper, que fez `rmdir` das junctions primeiro.
  - `node_modules`: frontend **498** · functions **414** entradas. O UTAC106x.6 registava **499**. A diferença não é
    atribuível com o que medi: não contei antes de criar o worktree. A suíte continua verde. Declarado.
- **Registo (R18):** este log, o bloco R14 do `CLAUDE.md` e `Desktop/RELATORIO-UTAC107g.3-RC1.txt`.
- **Tempo:** ~35 min (18:45 → 19:20). Excede o HI5 de 30 min em ~5 min, por causa da espera do deploy e da validação.
  Declarado.
- **Custo (centavos/1M; Opus 5.5: in 400 · out 2000 · cache 20):**
  - validador: 96 984 tokens = 1,9–194 ¢ (38,8 ¢ se fosse tudo input);
  - sessão principal: não medida (`/cost`), estimada em ~120 k tokens de contexto = 2,4–240 ¢ (48 ¢ se fosse tudo input).

## Entrega final

- [x] Comportamento actual medido (substring em `App.jsx:148`; o Dashboard já era exato).
- [x] Match exato implementado (`URLSearchParams.get`).
- [x] `?src=1` já não abre a UI do lojista.
- [x] `?rc=10` já não abre.
- [x] `?rc=1` mantém o comportamento.
- [x] Testes + mutação 6/6, e 4/4 do validador.
- [x] Suíte verde 849/849 + 1095/1101.
- [x] `vite build` OK.
- [x] 5 `.bak-*` intactos.
- [x] `EM_BREVE_MODE = true`.
- [x] Validador adversarial: APROVADO.
- [x] DEBT-021 actualizada (FECHADA, com o resíduo anotado).
- [x] Deploy verificado em produção.
- [x] Registo em 3 lugares.
- [x] Commit + push.
- [x] Custo reportado.
