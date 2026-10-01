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
