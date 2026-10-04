# A — Ambiente

Armadilhas de Windows, MSYS, Netlify.

## A1 — Windows: usar `C:/...` SEMPRE
`python`, `git -C`, `curl` são binários Windows. Usar paths
Windows. `/c/...` falha.
Origem: disciplina base.

## A2 — `.jsx` CRLF; `.mjs` LF; `.md` LF
Medir em bytes, não com grep MSYS. O `.gitattributes` normaliza
para LF no índice.
Origem: UTAC104.2.

## A3 — `CLAUDE.md` tem bytes de controlo
Usar `grep -a`. Nunca editar com editor simples — usar Python
binário.
Origem: disciplina base.

## A4 — `curl -o /dev/null` no MSYS devolve `bytes=0`
Mesmo em sucesso. Não usar como indicador de sucesso.
Origem: disciplina base.

## A5 — `netlify env:set` imprime o valor
Usar `| Out-Null` e `--force` para esconder. `-AsSecureString` do
PowerShell NÃO cobre o output.
Origem: UTAC102.1b.

## A6 — `netlify env:list --json` devolve objecto, não lista
Filtrar com `.CHAVE` na raiz, não com `Where-Object`.
Origem: UTAC102.1b.

## A7 — `netlify env:get X` ausente = "No value set" com exit 0
Não confundir com "definido". Testar com `!/^No value set/i`.
Origem: UTAC104.2.

## A8 — RPC público pode devolver zeros em silêncio
Testar com controlo positivo (contrato movimentado no mesmo
intervalo). Sem isto, "0 eventos" pode ser bug do RPC.
Origem: UTAC103.

## A9 — Junctions para `node_modules` ao validar em worktree
Um `git worktree` **não traz `node_modules`** (não é versionado). Sem ele a suíte não corre — ou corre
a menos: no UTAC105b.3 um worktree sem a junction de
`desafio-gut/frontend/netlify/functions/node_modules` (onde vive `@netlify/blobs`) deu **69 falhas em
vez de 967/973**. Criar as junctions com `mklink /J` a partir de um `.bat` invocado por
`MSYS2_ARG_CONV_EXCL='*' cmd /c` (o `cmd //c` do git-bash abre em modo interactivo e não corre), e
**removê-las com `rmdir`** — nunca `rm -rf`, que segue o alvo e apaga o `node_modules` real.
Origem: UTAC105b.3.

## A10 — A ferramenta de leitura de ficheiros mascara segredos
Copiar código com a ferramenta de leitura substitui literais sensíveis por `***` e o resultado **não
compila** (`SyntaxError: Unexpected token '**'`, medido num template literal). Copiar código lendo
**bytes crus** (Python/`io`), nunca pela ferramenta de leitura.
Origem: UTAC105b.3.

## A11 — `patch` e linhas com `\r` literal
A ferramenta de edição pode partir uma linha **não relacionada** quando o ficheiro contém um `\r`
literal (ex.: dentro de um snippet que fala de CRLF) — o `git diff` acusou um hunk extra, medido. Em
`CLAUDE.md` (que tem bytes de controlo — ver A3) editar reconstruindo o ficheiro a partir do `HEAD` e
aplicando **só** a alteração pretendida, em bytes; confirmar depois que o `git diff` é **1 hunk, 1 linha**.
Origem: UTAC105b.3.

## A12 — Instância do React no runner SSR do Vite 8
O runner SSR do Vite 8 serve a um módulo carregado **mais tarde** uma instância de React
**diferente** da do primeiro: o `ReactCurrentDispatcher` fica a `null` e o componente rebenta com
`Cannot read properties of null (reading 'useState')` (ou `'useContext'`). Medido: o **primeiro**
`ssrLoadModule` de um processo acerta; os seguintes não. Foi isto que, no UTAC000.6, fez cair a suíte
do frontend de **535/535 para 68 falhas** sem que uma única linha de `frontend/src/**` tivesse sido
tocada — e o que explicou os sintomas cruzados (o componente carregado em 1.º passava; o 2.º caía;
um ficheiro que carregava um só componente passava).

**Solução:** o **primeiro** módulo que o servidor de testes carrega tem de importar os pacotes que
trazem React — `react`, `react-dom/server`, `react-router-dom`, `framer-motion` — fixando a instância
para tudo o que vem depois. É o papel de `src/__tests__/_ponte-ssr.mjs`, carregado antes de qualquer
componente. Dependências que trazem o seu próprio React (react-router, framer-motion) têm de vir daí,
não de um `import` do Node.

**Onde se regista:** criar a ponte **não chega** — o arnês tem de a carregar **antes de qualquer
componente**. Em `src/components/meus-ativos/__tests__/_render.mjs`, dentro de `obterServidor()`:
`await servidor.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs")`. Sem esse load, a ponte não faz nada.

**Como se verifica:** mutação que desliga o load da ponte → RED (medido: suíte **VERMELHO 15 falhas**,
6+1+8, exactamente os ficheiros que dependem dela); religar → **VERDE 535/535**.

⚠️ **REFUTADO pelo validador (UTAC000.7/SEG-2) — afirmação errada mantida à vista, não apagada.** A
redacção inicial desta regra dizia: «com `node_modules/.vite` **apagado** o mutante dá **0/15** e com a
cache **quente** dá **6/15** — declarar sempre o estado da cache, porque a cifra muda». **É FALSO.** O
validador mediu as **duas** condições e obteve o **mesmo** resultado: **6/15** (dos 15 testes de
`mc1021a`, 9 não usam hooks — só o hook parte com o React em duplicado). O `0/15` que aqui se citava
vinha de um **mutante diferente**: um que, além de desligar a ponte, também repunha o renderizador no
React do Node — **dupla mutação**, no código de antes da redução do UTAC000.6. Com `configFile:false` +
`optimizeDeps.noDiscovery` em `_servidor-teste.mjs`, as corridas **não consomem** pré-bundle: o estado
da cache é **inerte** nesta medição. Lição de método: **comparar medições só entre o MESMO estado de
código**.
Origem: op: 2026-10-01 (UTAC000.6).
Cross-ref: HI10, A9, A11, T4.

## A13 — Junctions em worktree: criar e remover (o delete SEGUE a junction)
**Medido no UTAC106x.3.** Um `git worktree` não traz `node_modules` (ver **A9**); criar junctions para os
`node_modules` resolve a **criação** — mas a **remoção é perigosa**: `git worktree remove` (tal como
`rm -rf`) faz um delete recursivo que **segue o reparse point** e apaga o conteúdo do **alvo REAL**.

Duas reprodutibilidades, ambas medidas (alvo descartável, NUNCA o `node_modules` real):
- **Caminhos curtos: `git worktree remove` devolve exit 0 e o alvo fica VAZIO** — perda **silenciosa**
  (alvo de 3 ficheiros → 0; o worktree sai e nada avisa).
- **Caminho > MAX_PATH: exit 255 + `error: failed to delete '<wt>': Filename too long`** — aborta a meio.
  Foi o que, no UTAC106x.1, deixou `frontend/node_modules` **505→498** e o
  `netlify/functions/node_modules` **417→0**.

### Criar
1. `git worktree add C:/Users/<user>/tmp-<utac>/wt <sha> --detach`
2. Junctions por **`.bat`** invocado com `cmd /c` (`mklink` é builtin do cmd — não existe em git-bash):
   ```
   mklink /J "<wt>\desafio-gut\frontend\node_modules" "<raiz>\desafio-gut\frontend\node_modules"
   mklink /J "<wt>\desafio-gut\frontend\netlify\functions\node_modules" "<raiz>\...\netlify\functions\node_modules"
   ```
   invocar com `MSYS2_ARG_CONV_EXCL='*' MSYS_NO_PATHCONV=1 cmd /c "C:\...\junctions.bat"`.
   ⚠️ A forma `cmd /c 'a & b'` do git-bash **falha em silêncio** (medido) — usar sempre `.bat`.
   ✅ **Alternativa medida e fiável em Node** (é o que `scripts/worktree-helper.mjs` usa):
   `spawnSync("cmd", ["/c", "mklink", "/J", link, alvo])` — sem `.bat`, sem quoting frágil.
   ✅ **Detecção (o guarda do helper):** `lstatSync(p).isSymbolicLink()` devolve **true** para uma junction
   (medido), logo dá para *varrer a árvore sem descer nos reparse points* e recusar o delete recursivo.

### Remover — **A ORDEM É OBRIGATÓRIA**
1. **`rmdir` das junctions PRIMEIRO** (por `.bat`; `rmdir` remove **só o link**, não o alvo):
   `rmdir "<wt>\desafio-gut\frontend\node_modules"` (e o par de `netlify\functions`).
2. Confirmar que os links desapareceram (`if exist` → «não existe»).
3. **Só então** `git worktree remove <wt>` (sem `--force`) e `git worktree prune`.
⇒ Medido: com esta ordem o alvo fica **INTACTO** (3/3 ficheiros) e o worktree sai limpo.
**Guarda:** **nunca** `git worktree remove` nem `rm -rf` enquanto houver junctions dentro do worktree —
nenhum dos dois distingue «directoria real» de «reparse point».

Origem: UTAC106x.3 (incidente do UTAC106x.1) · Cross-ref: A9, HI10, GATE 10.
