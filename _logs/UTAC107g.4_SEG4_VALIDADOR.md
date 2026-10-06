# VEREDICTO ADVERSARIAL — UTAC107g.4 (commit `7d4c5de`)

**Alvo auditado:** `C:/Users/Moltbot/tmp-107g4-val/wt` @ `7d4c5de43a12286ea8d21d54458c68d55fdb0e98` (worktree isolado, 4 junctions A13)
**Diff:** `2c51e5a..7d4c5de` — 2 ficheiros (helper + testes). `App.jsx` FORA do diff.
**Postura:** tentar REFUTAR a correcção (procurar porta aberta a anónimo, teste vacuoso, regressão).
**Data:** 2026-10-06 · validador adversarial (subagente), só-leitura, nenhuma escrita no worktree.

---

## VEREDICTO: **APROVADO** — **0 bloqueantes** (0 ⛔ / 0 ⚠️; 5 ℹ️)

A excepção `?rc=1` está fechada: **nenhum** dos 49 URLs + 14 entradas não-texto que testei abre a UI do lojista a um anónimo; a função devolve `false` sempre, com assinatura intacta (aridade 1); os testes **mordem** (mutação M1/M2/M3 ⇒ RED); o `App.jsx` (guarda das 8 rotas) está fora do diff; o backend não foi tocado; os 5 `.bak-*` estão presentes e intactos; a suíte canónica está **VERDE 849/849 + 1095/1101**.

---

## «Reproduzido por execução» (comandos + saída real)

### Diff: só 2 ficheiros, e o `App.jsx` não está nele
```
$ git diff --name-status 2c51e5a..7d4c5de
M	desafio-gut/frontend/src/lib/acessoDiretoCadastro.js
M	desafio-gut/frontend/src/lib/acessoDiretoCadastro.test.mjs

$ git diff --name-only 2c51e5a..7d4c5de -- desafio-gut/frontend/src/App.jsx
(vazio = fora do diff)

$ git status --porcelain
(vazio = worktree limpo)
```
O núcleo do patch:
```
-  if (typeof search !== "string") return false;
-  return new URLSearchParams(search).get("rc") === "1";
+  void search;
+  return false;
```

### (a)+(b) — chamei a função REAL (`src/lib/acessoDiretoCadastro.js`) sobre 63 entradas
Corpus: `?rc=1`, `#rc=1`, `&rc=1`, `?RC=1`, `?rc=01`, `?rc=true`, `?rc=%31`, `?foo=bar&rc=1`,
`?rc= 1`, `?rc=1%20`, `?rc=%201`, `?rc=\t1`, `?rc=1\n`, `?rc=1%00`, `?r%63=1`, `?%72c=1`,
`?rc[]=1`, `?rc=1&rc=`, `?rc=%31%20`, `?RC=%31`, `??rc=1`, `?rc==1`, `?rc=1#rc=1`, `#?rc=1`,
`?rc=1&`, `?&rc=1`, `rc=1`, `/corp?rc=1`, `https://x.test/?rc=1`, `?src=1`, `?arc=10`, `?rc=10`,
`?xrc=1`, `?rc=1x`, `?foo=1&src=1`, `javascript:?rc=1`, … + não-texto `undefined, null, 1, 0,
true, false, {}, [], ["?rc=1"], URLSearchParams("?rc=1"), {toString:()=>"?rc=1"}, Symbol, 1n, fn`.
```
$ node .../ab-portas.mjs
URLs testados: 49 | não-texto: 14
Casos que ABRIRAM (devolveram != false): 0
(nenhum — 0 portas abertas)
assinatura/aridade temAcessoDiretoCadastro.length = 1
```
⇒ **(a)** nenhum URL abre; **(b)** nenhuma entrada (incluindo não-texto) devolve `true`; aridade = **1** (assinatura preservada).

### (d) — o LOJISTA AUTENTICADO não passa pela função (leitura directa)
`src/App.jsx:147-151`:
```js
if (!isConnected) {                     // ← só o ramo ANÓNIMO entra aqui
  if (pareceAutenticado) return children;
  if (!temAcessoDiretoCadastro(window.location.search)) return <Navigate to="/" replace />;
  return children;
}
if (tipoCarregando) return tipoProvavel === "corporativo" ? children : null;
... // gate de cota, etc.
```
Com `isConnected === true` o bloco `!isConnected` é **saltado inteiro** ⇒ `temAcessoDiretoCadastro` (linha 149) **nunca é chamada**. O lojista autenticado conserva o caminho `isConnected===true → tipoCarregando → gate de cota`. Sem regressão.

### (e) — os testes continuam a MORDER (mutação em cópia fora do worktree)
Cópia em `C:/Users/Moltbot/tmp-107g4-val/audit/mut/` (estrutura `lib/` + `App.jsx` real).
```
[ORIGINAL]   ℹ pass 6 | ℹ fail 0        (baseline intocada)
[M1-107g3]   ℹ pass 5 | ℹ fail 1   ✖ nenhum URL abre a UI do lojista (a função devolve SEMPRE false)
[M2-true]    ℹ pass 4 | ℹ fail 2   ✖ nenhum URL abre … ✖ entrada não-texto também não abre
[M3-substring] ℹ pass 5 | ℹ fail 1  ✖ nenhum URL abre a UI do lojista (a função devolve SEMPRE false)
```
M1 = repor `URLSearchParams.get("rc")==="1"` ⇒ **RED** (os URLs `?rc=1` acusam). M2 = `return true` ⇒ **RED**. M3 (extra) = substring antiga ⇒ **RED**. O teste **não é vacuoso** e o controlo bidireccional (`exatoDo107g3("?rc=1") === true`) confirma que o caso é discriminante. Worktree ficou limpo (`git status` vazio) e md5 do helper inalterado (`5ca58d1e640d7290760f3dfc84618b34`).

### (f) — backend NÃO foi alterado
```
$ git diff --name-only 2c51e5a..7d4c5de   → apenas os 2 ficheiros acima (0 netlify/functions, 0 backend)
```

### (g) — 5 `.bak-*` presentes e intactos
```
$ git ls-files "*.bak-*" | wc -l   → 5
capacitor.config.ts.bak-20260725182152 · App.jsx.bak-20260724145416 · PrivyRoot.jsx.bak-20260724200959 ·
PrivyRoot.jsx.bak-custom-scheme-20260725182152 · PrivyRoot.jsx.bak-oauth
$ git diff --name-only 2c51e5a..7d4c5de | grep -c bak   → 0
```
Nenhum `.bak-*` no diff; `git status` limpo ⇒ intactos.

### (h) — suíte canónica VERDE
```
$ node scripts/mc966-suite-harness.mjs ambos < /dev/null
frontend: VERDE 849/849 pass
backend: VERDE 1095/1101 pass
VEREDITO: VERDE            (exit 0)
```
(Nota de instrumento: em `background` o shell imprime «stdin is not a tty» e a saída perde-se; em **foreground** com `< /dev/null` o harness produz o resumo esperado.)

### Varrimento adicional — não há outra porta
```
$ git grep -n "location.search" -- src   → App.jsx:149 (guarda) + ReferralTracker.jsx:23 (?ref)
$ git grep -n "URLSearchParams" -- src   → ?ref, ?plataforma, CorporativoDashboard:32, admin (logs)  (nenhum gate de auth)
$ git grep -n "temAcessoDiretoCadastro" -- src → 1 def + 1 import + 1 uso (App.jsx:149)
```
`CorporativoRoute` só testa `rc` no ramo `!isConnected` (linha 149). `pareceAutenticado` (linha 148) = `isConnected || sessaoOtimista` (`AppContext.jsx:689`) — sinal PRÉ-EXISTENTE de restauro de sessão, **não é porta nova** (não está no diff; e mesmo passando, as guardas seguintes exigem `tipoUsuario/tipoProvavel === "corporativo"` e o servidor recusa escritas). O `CorporativoDashboard.jsx:30-36` (limpa `?rc=1`) mantém-se coerente com a nova guarda.

---

## Tabela de achados

| # | Gravidade | Achado | Tratamento proposto |
|---|-----------|--------|---------------------|
| I-1 | ℹ️ nota | `CorporativoDashboard.jsx:30-36` conserva o ramo que limpa `?rc=1` da URL — agora **inalcançável pelo ataque** (a guarda redirecciona antes). Coerente, sem impacto de segurança (apenas código morto). | Opcional: remover o `useEffect` num UTAC de limpeza; **não bloqueia**. |
| I-2 | ℹ️ nota | `pareceAutenticado` (`App.jsx:148`) é um gate PRÉ-EXISTENTE no mesmo ramo `!isConnected`, for a do diff. Não é porta nova; ancorá-lo em `sessaoOtimista` (cache local) é comportamento anterior. | Registar como resíduo fora de escopo (o gate de tipo corporativo + auth no servidor continuam a segurar). |
| I-3 | ℹ️ nota | O comentário do helper afirma «0 produtores» de `?rc=1`; confirmo por leitura/grep (`git grep` em src não acha produtor), mas **não** medi em runtime. | Nota de escopo — a alegação não é premissa da segurança (mesmo com produtor, a função fechada impede o anónimo). |
| I-4 | ℹ️ nota | `src/__tests__/utac107g-navegacao.test.mjs:75` continua a assertar que `/corp?rc=1` cai no catch-all — verde no harness (rota `/corp` removida em 107g). | Nenhum. |
| I-5 | ℹ️ nota | Em `background` o harness não mede (saída perdida por TTY); **só** o comando em foreground com `< /dev/null` mede. | Usar foreground para o harness; registar o idioma. |

**Bloqueantes (⛔): 0 · Graves (⚠️): 0.**

---

## Alegações REFUTADAS

- *«Ainda existe algum URL que abre a UI do lojista a um anónimo»* — **REFUTADA**: 49 URLs + 14 não-texto ⇒ 0 abriram.
- *«Os testes ficaram vacuosos / não mordem»* — **REFUTADA**: M1 (`URLSearchParams.get("rc")==="1"`), M2 (`return true`) e M3 (substring) dão todos **RED**; baseline 6/6.
- *«A correcção quebrou o acesso do lojista autenticado»* — **REFUTADA**: `isConnected===true` salta o bloco que contém a chamada (App.jsx:147-151).
- *«O backend foi alterado»* — **REFUTADA**: diff = 2 ficheiros frontend/lib.
- *«O `App.jsx` foi tocado» / «a guarda das 8 rotas mudou»* — **REFUTADA**: `App.jsx` fora do diff (md5 idêntico ao repo de referência: `93c092d4b5d1028a2da1540b1a70cd06`).
- *«Algum `.bak-*` foi tocado»* — **REFUTADA**: 5 presentes, 0 no diff, árvore limpa.
- *«A assinatura da função mudou»* — **REFUTADA**: `.length === 1`; teste de aridade verde.
- *«A suíte canónica está vermelha»* — **REFUTADA**: VERDE 849/849 + 1095/1101.

## Alegações que NÃO consegui refutar (resistem à tentativa)

- O `?rc=1` exato **já não abre** — não encontrei nenhuma variante que reintroduza a porta.
- **Ninguém no app produz `?rc=1`** (nenhum produtor em `src/`/`netlify/functions/` por `git grep`) ⇒ fechar a excepção não degrada nenhum fluxo legítimo (não medi em runtime, mas a leitura é inequívoca).
- **Nenhum outro sítio** abre a UI do lojista sem auth: o único uso de `temAcessoDiretoCadastro` é `App.jsx:149`, dentro de `!isConnected`; as outras leituras de query string (`?ref`, `?plataforma`) não são gates de auth.

## O que NÃO medistei

- **Runtime real do browser**: não renderizei as 8 rotas com uma sessão Privy viva nem confirmei o redirect `<Navigate to="/">` a correr; a prova é de **código + teste unitário + suíte**, não de UI ao vivo.
- **`pareceAutenticado` em runtime** (cache `gut_saldo_cache` no disco): resíduo pré-existente, não exercido.
- **Auth do servidor**: não re-verifiquei as funções Netlify (fora do diff, UI-only como declarado).
- **A alegação «0 produtores»** e o «último produtor removido no MC99.1» — aceites por leitura/grep, não por histórico de runtime.

---

## DECISÃO

**APROVADO, 0 bloqueantes.** A correcção faz exactamente o que diz: a excepção `?rc=1` está fechada, a assinatura preservada, o `App.jsx` intocado, o backend intacto, os testes a morder e a suíte verde. Os 5 achados são ℹ️ (notas de limpeza/resíduo fora de escopo), nenhum bloqueia o fecho do UTAC107g.4 / DEBT-021. Recomendações não bloqueantes: (1) remover num UTAC futuro o ramo morto `?rc=1` de `CorporativoDashboard.jsx:30-36`; (2) registar `pareceAutenticado`/`sessaoOtimista` como resíduo fora do escopo desta correcção.


---

# RESPOSTA DO EXECUTOR AO VEREDICTO

**Veredicto: APROVADO · 0 bloqueantes (0 ⛔ / 0 ⚠️; 5 ℹ️).** Aceite. O validador testou **49 URLs + 14
entradas não-texto** chamando a função REAL: **0 abriram**. Provou também que os testes **mordem**
(M1/M2/M3 ⇒ RED), que o `App.jsx` está fora do diff (md5 `93c092d4…`), que o lojista autenticado não
passa pela função (`isConnected===true` salta o bloco de `App.jsx:147-151`) e que a suíte está VERDE.

| Achado | Grav. | Tratamento |
|---|---|---|
| I-1 — `CorporativoDashboard.jsx:30-36` conserva o ramo que limpa `?rc=1` da URL (agora **inalcançável**) | ℹ️ | **Declarado** — código morto, **sem impacto de segurança**. Fora do escopo autorizado (o UTAC só autoriza `acessoDiretoCadastro.js` + testes + DEBT + CLAUDE.md). **Proposta:** remover num UTAC de limpeza próprio. |
| I-2 — `pareceAutenticado` (`App.jsx:148`) é um gate **pré-existente** no mesmo ramo | ℹ️ | **Declarado** — não está no diff, não é porta nova (as guardas seguintes exigem tipo corporativo e o servidor recusa escritas). **Resíduo fora de escopo.** |
| I-3 — a alegação «0 produtores de `?rc=1`» é por leitura/grep, **não** runtime | ℹ️ | **Declarado** — e **não é premissa da segurança**: mesmo com um produtor, a função fechada impede o anónimo. |
| I-4 — `utac107g-navegacao.test.mjs:75` asserta `/corp?rc=1` | ℹ️ | Nenhum — verde no harness (a rota `/corp` saiu no 107g). |
| I-5 — o harness em `background` não mede (TTY) | ℹ️ | Nenhum — idioma já conhecido e usado: foreground com `< /dev/null`. |

**Erros dos meus instrumentos (declarados):** nenhum novo neste UTAC. Registo o padrão que se repetiu:
a `write_file` grava **LF** enquanto o working tree do repo está em **CRLF** (`core.autocrlf=true`) —
as âncoras de mutação têm de usar o EOL **do ficheiro em disco**, não o do `git show`.

**Correcções pós-veredicto: NENHUMA** (o veredicto não pediu código; **não houve alterações depois dele**).
