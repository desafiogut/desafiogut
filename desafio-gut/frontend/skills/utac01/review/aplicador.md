# APLICADOR — como o operador aplica sugestões aceites de um Review Report

**Auto-contido.** **MANUAL — o operador decide. Nada é automático.** O revisor só sugere
(`_logs/REVIEWS/<UTAC>_REVIEW.md`); nenhum modelo aplica uma sugestão sem o operador a ter aceitado,
sugestão a sugestão. Uma aplicação é ela própria trabalho versionado (commit próprio, ficheiros nomeados, nunca `git add -A`).

## 0. Decidir
Para cada sugestão das secções 4 e 5 do report: **aceite**, **rejeitada** ou **adiada**. Escrever a decisão na coluna
«decisão do operador» de `_logs/REVIEWS/INDEX.md` (ex.: `T-novo-1 aceite · L-novo-2 rejeitada`). Só as aceites seguem.

## 1. Nova regra (aceite)
1. **Categoria** — a do report (E, T, G, L, S, A, P, AU, ST). Se o operador mudar de categoria, vale a dele.
2. **Abrir** `protocol/regras/<categoria>.md` (ex.: `T-testes.md`).
3. **Acrescentar no FIM da lista** — nunca no meio, nunca reutilizar um ID, nunca reescrever regras existentes.
4. **ID definitivo** = próximo número da categoria (ex.: depois de `T5` vem `T6`). O ID provisório do report (`T-novo-1`) não entra.
5. **Formato** (igual às existentes):
   ```
   ## T6 — <título curto>
   <texto: 1-3 linhas, imperativo>
   Origem: <UTAC de origem>.
   ```
6. **Actualizar as contagens** (ficam erradas se não): `protocol/regras/README.md` (linha da categoria, título e «Total»),
   `protocol/regras-legado.md` («Total: N regras …»), `SKILL.md` (árvore, tabela «As 9 categorias de regras», texto «N regras»).
   `exemplo.UTAC.md` é um exemplo histórico — não se actualiza.
7. **Bump de versão** — ver §3.

## 2. Nova lição (aceite)
1. **Abrir** `protocol/licoes.md`.
2. **Acrescentar no FIM da secção** indicada no report (ou da última, se não houver).
3. **Número** = o seguinte ao último da lista (a numeração é contínua no ficheiro inteiro).
4. **Formato** (igual às existentes): `N. **<título>** *(<UTAC de origem>)*. <texto, 1-3 linhas>`
5. Não reescrever lições existentes. **Bump de versão** — ver §3.

## 3. Bump de versão
Em `review/VERSAO.md`:
1. **Versão actual** sobe: regra ou lição nova → **minor** (1.0 → 1.1); mudança de gate, de tipo ou de formato → **major** (decisão do operador).
2. **Changelog** — uma linha no FIM da tabela: versão · data · UTAC de origem (o revisto) · o que entrou (IDs definitivos).
3. `_logs/REVIEWS/INDEX.md` — coluna «versão da skill depois» da linha do report = a nova versão.

## 4. Registo R18 em 3 lugares
A decisão do operador (o que aceitou/rejeitou) fica escrita em:
1. `_logs/REVIEWS/INDEX.md` (coluna «decisão do operador»);
2. `review/VERSAO.md` (changelog);
3. `CLAUDE.md` do repo (nota curta na secção do UTAC em que se aplicou).

## 5. Verificar antes do commit
- `git diff --stat` mostra **só** os ficheiros acima; nenhuma regra/lição existente mudou (`git diff` só com linhas `+` nesses ficheiros, além das contagens).
- IDs sem duplicados: `grep -c "^## T6 " protocol/regras/T-testes.md` → 1.
- Commit com os ficheiros nomeados; mensagem com o UTAC revisto e a nova versão.
