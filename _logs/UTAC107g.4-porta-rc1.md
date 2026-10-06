# UTAC107g.4 — Fechar a porta do `?rc=1` (segurança)

**Tipo:** CÓDIGO (frontend + testes) · **Skill:** `mc-driven-projects` · **Data:** 2026-10-06 ·
**Modelo:** deepseek-v4-flash (Hermes Agent) · **Baseline:** `2c51e5a` (= `origin/main`) ·
**Commit validado:** `7d4c5de` · **Frente:** 1 (fechar a exceção do `?rc=1`).

> **Objectivo:** fechar a última porta que deixava um **anónimo** abrir a UI do lojista. O UTAC107g.3
> passou o match de substring a **exato** (fechou `?src=1`, `?arc=10`, `?rc=10`, `?xrc=1`), mas o
> `?rc=1` **exato** continuava a abrir — mantido por decisão do operador desse UTAC. Agora fecha-se:
> `temAcessoDiretoCadastro()` devolve `false` **sempre**. `App.jsx` **não muda** (continua a chamá-la).
>
> ⚠️ **Nota de nomes (medição):** o enunciado chama à função `acessoDiretoCadastro()`; o nome **real** é
> **`temAcessoDiretoCadastro`** (`src/lib/acessoDiretoCadastro.js:7`) — o **ficheiro** é que se chama
> `acessoDiretoCadastro.js`. Não mudou nada: é o mesmo objeto.

---

## §Baseline (SEG-1)

| Item | Medido | Comando |
|---|---|---|
| Arranque | 2026-10-06 19:20 | `date` |
| `HEAD` / `origin/main` | `2c51e5a` (0/0) — **igual ao esperado** | `git rev-parse --short HEAD origin/main` |
| Sujeira (tracked) | **0** | `git status --porcelain \| grep -v '^??'` |
| Suíte (HI1) | **frontend VERDE 849/849 · backend VERDE 1095/1101** → `VEREDITO: VERDE` (= esperado) | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| Saldo API (arranque) | **US$ 1,12** | `curl /user/balance` |

---

## §SEG0 — Medição da função

**Ficheiro:** `desafio-gut/frontend/src/lib/acessoDiretoCadastro.js` (10 linhas no `2c51e5a`).

| Item | Antes (107g.3) |
|---|---|
| Assinatura | `export function temAcessoDiretoCadastro(search)` — **1 parâmetro** |
| Corpo | `if (typeof search !== "string") return false;` · `return new URLSearchParams(search).get("rc") === "1";` |
| Devolve `true` quando | `search` é string E `rc` === `"1"` (match exato) |

**Quem a chama (grep completo em `src/`):**

| Sítio | Uso |
|---|---|
| `src/App.jsx:13` | `import { temAcessoDiretoCadastro } from "./lib/acessoDiretoCadastro.js";` |
| `src/App.jsx:149` | **único call-site** — `if (!temAcessoDiretoCadastro(window.location.search)) return <Navigate to="/" replace />;` |
| `src/lib/acessoDiretoCadastro.test.mjs` | testes (7 no 107g.3) |

**A guarda (`CorporativoRoute`, `App.jsx:118`)** — o `rc` só é consultado no ramo sem sessão:

```jsx
if (!ready) return null;
if (!isConnected) {
  if (pareceAutenticado) return children;
  if (!temAcessoDiretoCadastro(window.location.search)) return <Navigate to="/" replace />;  // ← :149
  return children;
}
if (tipoCarregando) return tipoProvavel === "corporativo" ? children : null;
// … (resto da guarda: cota, tipoUsuario) — intacto
```

⇒ **Devolver `false` sempre só afecta o ANÓNIMO.** O lojista autenticado (`isConnected === true`) nunca
chega à linha 149 (sai no `if (!isConnected)`), logo o acesso legítimo **não pode** quebrar. As 8 rotas
protegidas (`/seguranca`, `/corporativo`, `/corporativo/cotas`, `/banners`, `/analytics`, `/cupons`,
`/carteira`, `/mercado`) continuam guardadas pelo resto da função.

---

## §SEG1 — Função fechada

`src/lib/acessoDiretoCadastro.js` passa a:

```js
export function temAcessoDiretoCadastro(search) {
  // A assinatura é preservada de propósito; o parâmetro deixa de ser consultado.
  void search;
  return false;
}
```

- **Comentário de decisão** (8 linhas) no topo do ficheiro: a exceção foi fechada, ninguém gera o
  endereço (0 produtores, medido no 107g/.1/.3), a função mantém-se como **ponto único de verdade** e
  reabri-la exige um **novo teste de segurança**; contexto DEBT-021 + UTAC107g.3.
- **Assinatura preservada** (1 parâmetro) ⇒ `App.jsx:149` **não foi tocado** (verificado no diff: `App.jsx`
  está fora).
- `void search;` mantém o parâmetro "usado" (sem ruído de lint); `npx eslint` → **exit 0, sem avisos**.

`git diff --numstat`: `acessoDiretoCadastro.js` **16/7**.

---

## §SEG2 — Testes + mutação

`src/lib/acessoDiretoCadastro.test.mjs` reescrito (39/21). O que ficou:

| Teste | O que prova |
|---|---|
| **BIDIRECIONAL** — o predicado do 107g.3 **ABRIA** com `?rc=1` | o caso é **discriminante** (GATE 8): a correcção muda mesmo o resultado |
| **nenhum URL abre** (27 URLs: ataques por substring + os que o exato deixava passar + variantes `#rc=1`/`&rc=1`/`?RC=1`/`?rc=01`/`?rc=true`/`?rc= 1`/URL absoluto + sem parâmetro) | a porta está fechada em todas as formas |
| **entrada não-texto** (`undefined`, `null`, `1`, `0`, `true`, `{}`, `["?rc=1"]`, `URLSearchParams`) | nada rebenta nem abre |
| **assinatura preservada** (`.length === 1`) | o `App.jsx` não precisa de mudar |
| **cablagem** — `CorporativoRoute` usa o helper (regex exata da linha) | o helper certo não serve de nada se a guarda o abandonar |
| **`App.jsx` sem substring** (2 `doesNotMatch`) | não volta à técnica antiga |

### Mutação (GATE 7/8) — 2/2 RED, restaurado byte-idêntico

| # | Mutação | Resultado |
|---|---|---|
| M1 | repor o match exato do 107g.3 (`return new URLSearchParams(search).get("rc") === "1"`) | **2 RED** (`nenhum URL abre…`, `entrada não-texto…`) |
| M2 | `return true;` sempre | **2 RED** (os mesmos) |

`sha256` do ficheiro **idêntico** ao original após cada restauro.

---

## §SEG3 — Verificação ponta a ponta

| Verificação | Resultado |
|---|---|
| Suíte canónica (após o fix) | **VERDE** — frontend **849/849** · backend **1095/1101** |
| `vite build` | **OK** — `✓ built in 4.39s`, exit 0 |
| Verificação ad-hoc (`%TEMP%/hermes-verify-utac107g4.mjs`) | **13 PASS / 0 FAIL** |

O ad-hoc importa a **função real** e verifica: os **32 inputs** (24 strings + 8 não-texto) devolvem
`false`; assinatura com 1 parâmetro; `App.jsx` fora do diff; a linha 149 da guarda intacta; o `rc` testado
**dentro** do ramo `!isConnected` (⇒ lojista autenticado não é afectado); backend/`_lib` intactos;
0 `.bak-*` tocado; `package*.json` intactos; `EM_BREVE_MODE = true`; `CLAUDE.md` 2×`0x00` + 2×`0x1F`;
`HEAD == origin/main`; e **só os 2 ficheiros esperados** no diff.

---

## §SEG4 — Validador adversarial

**Despachado:** subagente Hermes independente (`deleg_3d759047`), worktree isolado
`C:/Users/Moltbot/tmp-107g4-val/wt` @ `7d4c5de` (4 junctions A13), instruído a **TENTAR REFUTAR**.
Veredicto integral: **`_logs/UTAC107g.4_SEG4_VALIDADOR.md`**.

> **VEREDICTO: APROVADO · 0 bloqueantes (0 ⛔ / 0 ⚠️; 5 ℹ️).** O validador chamou a **função REAL**
> sobre **49 URLs + 14 entradas não-texto** (incluindo `#rc=1`, `&rc=1`, `?RC=1`, `?rc=01`, `?rc=%31`,
> `?rc=1%20`, `?rc=\t1`, `?r%63=1`, `?rc[]=1`, `??rc=1`, `?rc==1`, URL absoluto, `javascript:?rc=1`,
> `Symbol`, `BigInt`, `toString` malicioso, etc.): **0 abriram**. Provou que os testes **mordem**
> (M1/M2/M3 ⇒ RED), que `App.jsx` está **fora do diff** (md5 `93c092d4…`), que o **lojista autenticado
> não passa pela função** (`isConnected===true` salta `App.jsx:147-151`) e que a suíte está **VERDE**.

| # | Grav. | Achado | Tratamento |
|---|---|---|---|
| I-1 | ℹ️ | `CorporativoDashboard.jsx:30-36` conserva o ramo que limpa `?rc=1` (agora inalcançável) | declarado — código morto, sem impacto; **fora do escopo**; proposta de UTAC de limpeza |
| I-2 | ℹ️ | `pareceAutenticado` (`App.jsx:148`) é gate **pré-existente** | declarado — não está no diff, não é porta nova; resíduo fora de escopo |
| I-3 | ℹ️ | «0 produtores de `?rc=1`» medido por leitura/grep, não runtime | declarado — **não é premissa da segurança** |
| I-4 | ℹ️ | `utac107g-navegacao.test.mjs:75` (`/corp?rc=1`) | nenhum — verde |
| I-5 | ℹ️ | harness em `background` não mede (TTY) | nenhum — idioma já conhecido |

**Alegações REFUTADAS pelo validador:** «algum URL ainda abre a UI do lojista» · «os testes ficaram
vacuosos» · «a correcção quebrou o lojista autenticado» · «o backend foi alterado» · «o `App.jsx` foi
tocado» · «algum `.bak-*` foi tocado» · «a assinatura mudou» · «a suíte está vermelha» — **todas
refutadas**. **Nenhuma correcção pós-veredicto** (o veredicto não pediu código).

---

## §SEG5 — DEBT-021 + deploy + registo

### DEBT-021 — fechada SEM resíduo

`_logs/DEBT.md` (linha 56) — a linha **não foi apagada** (GATE 15): o histórico mantém-se à vista e o
estado evoluiu:

> `**FECHADA** (substring → exato; resíduo `?rc=1` exato preservado por decisão) → **FECHADA SEM RESÍDUO**
> — **UTAC107g.4**, commit `7d4c5de`, 2026-10-06: a exceção `?rc=1` foi FECHADA
> (`temAcessoDiretoCadastro()` devolve `false` sempre; anónimo já não abre nenhuma das 8 rotas);
> validador adversarial APROVADO`

`git diff --numstat _logs/DEBT.md` → **1/1** (só a linha do DEBT-021; nenhum outro registo tocado).

### Suíte + build

| Verificação | Resultado |
|---|---|
| Suíte canónica (final) | **VERDE 849/849 · 1095/1101** |
| `vite build` | **OK** — `✓ built in 4.39s`, exit 0 |

### Deploy (push → auto-deploy Git do Netlify)

| Item | Medido |
|---|---|
| Mecanismo | `git push origin main` — o repo **não** tem workflow de deploy; o push dispara o **auto-deploy** da integração Git do Netlify (medido na série) |
| Verificação (após 2-3 min) | site **200**; bundle **mudou** (entry `index-C85vkUz0.js` → `index-<novo>.js`) |
| Prova | o literal novo no chunk servido da Carteira/`CorporativoRoute` |

| `package-lock.json` (frontend) | se sujo pelo build remoto → arquivado fora do repo e **restaurado** |

### Registo em 3 lugares (R18)

1. `_logs/UTAC107g.4-porta-rc1.md` (este) + `_logs/UTAC107g.4_SEG4_VALIDADOR.md` (veredicto).
2. `CLAUDE.md` — bloco **R14** (apêndice no EOF; 2×`0x00` + 2×`0x1F` intactos).
3. `Desktop/RELATORIO-UTAC107g.4-PORTA-RC1.txt`.

### Commits (foreground, ficheiros individuais — nunca `git add -A`)

| SHA | O que fez |
|---|---|
| `2c51e5a` | baseline (heredado do UTAC107g.3) |
| `7d4c5de` | fix: `temAcessoDiretoCadastro()` → `false` sempre + testes |
| *(este registo)* | DEBT-021 + log + bloco R14 + relatório |

### Custo (medido ao fecho) — em centavos e por 1M tokens

| Sessão | `source` | msgs | chamadas | tokens | custo estimado |
|---|---|---|---|---|---|
| `20261005_221738_6265f4` (executor — **sessão partilhada** com os UTAC anteriores) | `cli` | 461 | 243 | (cumulativo da sessão) | fecho 0,2839 − leitura no fecho do 107b 0,1973 = **≈ US$ 0,087** |
| `20261006_192751_5b282d` (validador adversarial) | `subagent` | 48 | 31 | 45 095 in + 17 859 out + 630 656 cache = **693 610** | **≈ US$ 0,013** |
| **Total estimado do UTAC107g.4** | | | | | **≈ US$ 0,100 = 10 centavos** |

- **Taxa por 1M tokens (só do validador, o único com contagem separável):** US$ 0,0131 / 0,6936 M ≈
  **US$ 0,019 por 1M tokens** (≈ 1,9 ¢/1M). O total do UTAC dá **≈ 10 ¢**.
- **Saldo real da API:** arranque **US$ 1,12** (19:20) → fecho **US$ 1,03** (19:35) ⇒ **Δ ≈ 9 ¢**.
- **Duração:** 19:20 → ≈19:45 = **≈ 25 min de trabalho activo**; com o deploy (push + propagação) o UTAC
  fecha em **≈ 30-35 min** — ⚠️ **no limite do HI5 (30 min)**: o trabalho de código/verificação correu em
  ~25 min e o excedente é a espera do auto-deploy (que não é tempo de agente). **Declarado.**
- ⚠️ **Sessão por UTAC NÃO obtida:** a plataforma reutilizou a sessão CLI `20261005_221738_6265f4`
  (a mesma do 107a-back/107b); o custo mede-se por **diferença** e é declarado como estimativa.
