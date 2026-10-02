# UTAC000.12 — SEG-1 · Medição dos três resíduos — 2026-10-02

**Objectivo:** fechar três resíduos declarados no fecho do UTAC000.11, agrupados por economia de
overhead: **DEBT-012** (guarda do valor no Dashboard), **harness no `package.json`** e **3 worktrees
preservados**.
**Veredito do SEG-1: SEGUIR** nos três — cada um medido antes de tocar, com escopo próprio.

## -1.1 Estado MEDIDO (antes de tocar)
| item | medido |
|---|---|
| `git rev-parse HEAD` | **`8e19ed0`** = `origin/main` (como o spec declara) |
| suíte frontend / backend | **VERDE 614/614** · **VERDE 967/973** |
| árvore | limpa excepto `desafio-gut/frontend/package-lock.json` (**pré-existente**) |
| evidência bruta | `_logs/UTAC000.12_SEG-1_EVIDENCIA.txt` |

## -1.2 FRENTE A — DEBT-012 (defeito reproduzido, HI10)
`src/pages/Dashboard.jsx` l. 416 (**antes**):
```jsx
R$ {(vencedorExibido.valor / 100).toFixed(2)}
```
O **endereço** (l. 410) já tinha guarda; a linha do **valor** nunca teve. Reprodução real (com o
vencedor LOCAL do contexto, `definirResultadoOficial(null)`), capturada no ficheiro de evidência §2:
| `vencedor` | medido |
|---|---|
| `{}` | mostra **«R$ NaN»** |
| `{ endereco: EU }` (sem valor) | **«R$ NaN»** |
| `{ endereco: EU, valor: NaN }` | **«R$ NaN»** |
| `{ endereco: EU, valor: "abc" }` | **«R$ NaN»** |
| `{ endereco: EU, valor: Infinity }` | **«R$ NaN»** |
| `{ endereco: EU, valor: -1 }` | **«R$ -0.01»** (valor negativo formatado) |

**Alcance:** latente — o caminho oficial passa por `normalizarResultadoOficial` (exige
`Number.isInteger(menorUnicoCentavos)`), mas o ramo **local** recebe `lance.valor` de dados externos.
É o **irmão** da DEBT-011 (mesma classe, mesma linha de raciocínio, sítio diferente).
**Achado NOVO deste SEG-1:** `src/components/FimEdicaoOverlay.jsx` l. 16 tem **o mesmo defeito**
(`vencedor ? \`R$ ${(vencedor.valor / 100).toFixed(2)}\` : "—"` — guarda por truthiness, e o endereço
na l. 14 pela mesma via). Recebe `vencedor={vencedorExibido}` do Dashboard ⇒ mesma exposição.
**Fora do escopo autorizado** deste UTAC ⇒ registado como **DEBT-013**.

## -1.3 FRENTE B — o `package.json` (medido)
`desafio-gut/frontend/package.json` **não tem** script `test` (scripts: `dev`, `build`, `preview`,
`build:rag`, `validar:dist`, `lint`, `build:apk`).
⚠️ **O spec deste UTAC dá um caminho que NÃO existe:** o harness **não** está em
`desafio-gut/frontend/scripts/` — está em **`<repo>/scripts/mc966-suite-harness.mjs`** (medido:
`ls -la scripts/mc966-suite-harness.mjs` = 3878 bytes). Se eu escrevesse
`"test": "node scripts/mc966-suite-harness.mjs ambos"`, o `npm test` apontaria para um ficheiro
inexistente. **O caminho correcto é `../../scripts/mc966-suite-harness.mjs`** — e é o padrão que o
próprio ficheiro já usa (`"build:rag": "node ../../scripts/build-rag-index.mjs"`). O harness
**auto-localiza-se** (`join(__dirname, "..", "desafio-gut", "frontend")`), logo funciona de qualquer
cwd — confirmado a correr.

## -1.4 FRENTE C — os 3 worktrees preservados (medido, um a um)
| worktree | HEAD | edições **locais** (`git -C <wt> diff --stat`) | commits fora do main |
|---|---|---|---|
| `agent-ab397f6377251548e` | `cbc6d11` | **nenhuma** (só o untracked `_validacao-mc942/`, 1,2 M, transitório) | **0** |
| `angry-faraday-46bb51` | `39382d9` | 3 ficheiros (`vite.config.js`, `netlify.toml`, `main.jsx`) | **0** |
| `ecstatic-almeida-869832` | `79a923c` | 2 ficheiros (`Toast.jsx`, `globals.css`) | **0** |

**Distinção que evita um erro grave:** o `diff` byte-a-byte contra a árvore principal acusava
«146/143/100 linhas» e «539 linhas» — mas isso era **o main ter avançado** (1984/2008 ficheiros)
desde os HEADs desses worktrees, **não** trabalho local. O trabalho local real são **5+2 ficheiros**.
E do conteúdo arquivado: o **CSP** deles já está no main (`vite.config.js` tem `127.0.0.1:8545`;
`netlify.toml` tem `X-Frame-Options`) ⇒ resíduo **superado**; o `Toast.jsx` é um **caminho que já não
existe** (a peça vive em `src/widgets/toast/`); o que resta é uma experiência de **paleta**
(`#f5a623→#ffa500`, `#e8f0fe→#e0e0e0`) — decisão de produto de outra sessão — e **1 linha** que o
main não tem (`Access-Control-Allow-Origin = "https://auth.privy.io"`).
**Nada se apagou sem ficar arquivado:** `_logs/UTAC000.12_worktrees-preservados.patch` (126 linhas,
5 diffs, aplicável).
⚠️ **Correcção de um registo meu anterior:** no UTAC000.10 declarei que o
`agent-a910933b732937233` tinha «31 ficheiros» — esses 31 eram o **status do repo-pai** (o `git -C`
subiu a árvore, e os caminhos vinham como `../../../…`), **não** trabalho desse worktree. Fica
corrigido aqui.

## -1.5 Saúde global (HI1)
Disco OK · suíte **VERDE 614/614 · 967/973** · árvore limpa (só o `package-lock.json` pré-existente)
· nenhum worktree de validação montado · `node_modules` real **505 · 417**.
