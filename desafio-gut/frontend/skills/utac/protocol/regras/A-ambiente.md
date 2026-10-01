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
