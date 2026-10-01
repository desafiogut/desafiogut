# UTAC105c — SEG4 · Validador adversarial independente

- Commit em teste: `08dc863` (local, não publicado) · base: `4dd0403` (código = `f0f02a6`)
- Ambiente: worktree próprio destacado em `scratchpad/val105c` + junções `node_modules` (frontend e functions). No fim: junções removidas com `rmdir`, worktree removido com `git worktree remove --force`; `desafio-gut/frontend/node_modules` real continua com **505** entradas (functions: 417). Não toquei na árvore partilhada (só criei este ficheiro).
- Data: 2026-10-01

## Veredito: **APROVADO COM RESSALVAS**

A correção da Frente B está certa em todos os casos que consegui construir e não regride a vista anónima. As ressalvas são **lacunas de teste** (há mutantes que sobrevivem) e uma **limitação de origem dos dados** que já existia e o UTAC não piora. Não há nada bloqueante.

---

## 1. Afirmações: confirmadas ou refutadas

| # | Afirmação do executor | Resultado | Evidência |
|---|---|---|---|
| 1 | Frente B: `isVencedor = lance === menorUnico` nos dois layouts; `menorUnico` calculado na página sobre TODOS os lances ordenados por valor | **CONFIRMADA** | `git diff 4dd0403 08dc863 -- src`: as duas linhas `isVencedor` e as duas props trocadas; `menorUnico = todosLances.filter(!repetido)[0]` (já existia, usado no cartão «Menor Lance») |
| 2 | A identidade de objeto é válida | **CONFIRMADA** | `meusLances = lances.filter(...)` e `todosLances = [...lances].sort(...)` copiam o **array**, não os objetos; tudo é derivado do mesmo `lances` no mesmo render. O `setLances` do `AppContext` (l. 781-791 e 1297-1303) cria objetos novos (`{...l, repetido:true}`), mas isso só acontece **entre** renders, nunca dentro de um |
| 3 | Maiúsculas/minúsculas do endereço não afetam | **CONFIRMADA** | sonda com `address = "0xAaAa…"` e lances em minúsculas: a lista filtra bem e o 🏆 vai para o lance certo |
| 4 | Vista anónima não regride | **CONFIRMADA** | teste "sem sessão" (desktop e mobile) + meu mutante V4 (tirar o 🏆 ao anónimo) é **morto** |
| 5 | Frentes D/E: secções `meus-cupons`/`meus-palpites`, `data-estado="placeholder"`, sem números, chaves `ativos.cupons.*`/`ativos.palpites.*` em `pt.js`, guarda i18n passa a varrer `MeusAtivos.jsx` | **CONFIRMADA** | diff; guarda `ativos-i18n.test.mjs` verde; mutante M10 (dicionário diverge do fallback) morto |
| 6 | 12 testes novos, SSR da página inteira, desktop + mobile via `window.matchMedia` | **CONFIRMADA** | `useIsMobile` lê `window.matchMedia` no estado inicial, que o SSR executa; os mutantes V1 (defeito só no mobile) e V2 (só no desktop) são mortos **cada um com 3 falhas**, o que prova que cada layout é mesmo renderizado e observado |
| 7 | Mutação 10/10 com md5 reposto | **CONFIRMADA (reproduzida)** | `node scripts/utac105c-prova-mutacao.mjs` no meu worktree → `RESULTADO: 10/10 mutantes PROVADOS`, controlo 18/18, md5 reposto; `git status` limpo depois |
| 8 | Suíte frontend 547/547 | **CONFIRMADA** | `node scripts/mc966-suite-harness.mjs ambos` → `frontend: VERDE 547/547 pass` (535 + 12) |
| 9 | Suíte backend 967/973 | **NÃO REPRODUZIDA, mas explicada** | meu worktree limpo: `backend: VERDE 959/966` (959 pass + 7 skipped, 0 fail). O próprio executor regista no `UTAC105c_SEG-1_MEDICAO.md:27-32` que o worktree limpo dá 959/966 e a árvore partilhada dá 967/973. O backend não muda entre `4dd0403` e `08dc863`, logo a diferença vem do ambiente e não deste UTAC. A mensagem do commit cita só o número da árvore partilhada (ℹ️) |
| 10 | Âmbito: sem mudanças em `netlify/functions/**`, `_ponte-ssr.mjs`, `_render.mjs`, `App.jsx`, `AppContext.jsx` | **CONFIRMADA** | `git diff --name-only 4dd0403 08dc863 \| grep -E "netlify/functions\|_ponte-ssr\|_render.mjs\|App.jsx\|AppContext"` → vazio (exit 1). `_stubs/` também intactos |
| 11 | Nada novo (nem páginas nem componentes); A e C intocadas | **CONFIRMADA** | só `MeusAtivos.jsx`, `pt.js` e testes; secções inline com `caixa/tituloSecao/legenda` de `_estilo.js`, que já existia; nenhuma rota nova |
| 12 | Lint | **OK** | `npx eslint` nos 4 ficheiros tocados: 0 erros e 1 aviso (`cardPad` sem uso), **o mesmo aviso que já está na base** (`git show 4dd0403:…MeusAtivos.jsx \| eslint --stdin` dá o mesmo resultado) |

`git diff --stat 4dd0403 08dc863`: 13 ficheiros, +710/−6 (`MeusAtivos.jsx` +38/−6, `pt.js` +5, guarda +1, teste +178, script de mutação +88, o resto são logs/capturas).

## 2. Desvio declarado (`_render.mjs` → arnês do `MeusAtivos.test.mjs`)

**É legítimo.** `MobileList` e `DesktopTable` são funções **locais**, não exportadas, de `MeusAtivos.jsx`. O `_render.mjs` renderiza componentes apresentacionais por props e não troca o `AppContext`. Para exercitar o defeito é preciso renderizar a página inteira com o contexto substituído, e é isso que o arnês de `src/pages/__tests__/` faz (Vite SSR + `react-dom/server` + aliases para `_stubs`). O princípio de "renderização real, não regex sobre a fonte" é o mesmo do `_render.mjs`. Nenhum ficheiro do projeto foi alterado para o teste.

## 3. Os meus mutantes (para além dos 10 do executor)

Script: `scratchpad/val-mutantes.mjs` (alvo `MeusAtivos.jsx`; corre `utac105c-meus-ativos.test.mjs` + `ativos-i18n.test.mjs`). Para cada mutante: confirmo que **ENTROU** (o md5 mudou), corro os testes, reponho os bytes e verifico o md5 (`51df744a…` antes e depois). Conto `fail + cancelled`. O V12 serve de controlo positivo: prova que um ficheiro partido dá vermelho e não um falso "pass 6 fail 0". Foi isso que apanhei numa primeira versão do meu V9, que tinha a sintaxe partida.

| ID | Mutante | Entrou | Resultado |
|---|---|---|---|
| V1 | defeito reposto **só no MobileList** | sim | **MORTO** (3 falhas) |
| V2 | defeito reposto **só na DesktopTable** | sim | **MORTO** (3) |
| V3 | comparar por **valor** (`!repetido && valor === menorUnico.valor`) em vez de identidade | sim | **SOBREVIVEU** (equivalente sob o invariante: um valor não repetido aparece uma só vez) |
| V4 | anónimo sem 🏆 (`menorUnico` só com `address`) | sim | **MORTO** (2) |
| V5 | "correção ingénua": menor único da **lista exibida** | sim | **MORTO** (2) |
| V6 | só repetidos: o fallback dá 🏆 ao 1.º (`menorUnico ?? lances[0]`) | sim | **SOBREVIVEU** |
| V7 | **avatar** do mobile (`🏆` vs `i+1`) volta ao defeito; o selo de estado fica certo | sim | **SOBREVIVEU** |
| V8 | coluna **#** da desktop volta ao defeito; o selo de estado fica certo | sim | **SOBREVIVEU** |
| V9 | placeholders de cupons só com sessão | sim | **MORTO** (1) |
| V10 | `menorUnico` calculado sobre `meusLances` | sim | **MORTO** (2) |
| V11 | `menorUnico` = **maior** único | sim | **MORTO** (6) |
| V12 | sintaxe partida (controlo do arnês) | sim | **MORTO** (12 cancelados) |

Resultado: 8 mortos e 4 sobreviventes. O V3 é equivalente; V6, V7 e V8 mostram uma lacuna real nos testes.

## 4. Achados, por severidade

### ⛔ Bloqueantes
Nenhum.

### ⚠️ Ressalvas

1. **O teste só olha para o selo de texto e não para o 🏆 da posição (V6, V7 e V8 sobrevivem).** `vencedoresNoEcra` só casa `R$ x.xx 🏆 Menor e Único`. O mesmo `isVencedor` também desenha o 🏆 no **avatar** (mobile) e na **coluna #** (desktop), e muda as cores da linha. Se alguém repuser o defeito só nessas células, a página volta a mostrar um 🏆 em quem não ganha e a suíte fica verde. O código atual está certo, porque as quatro utilizações leem a mesma variável. Correção barata: contar os `🏆` dentro da lista de lances, ou exigir que o 🏆 da posição e o selo caiam na mesma linha.
2. **"Menor único DA EDIÇÃO" quer dizer, na prática, "menor único que este browser viu desde que abriu".** O `lances` do `AppContext` só se enche com os eventos `LanceDado` em tempo real (`subscribeLanceDado`, `contrato.on`, sem histórico) e com os lances do próprio utilizador (`handleLanceSucesso`). Não há carga inicial dos lances da edição. Se outra pessoa deu um lance único mais baixo **antes** de a página abrir, o lance da pessoa ainda pode ganhar o 🏆 «Menor e Único». Isto já existia: afeta o cartão «Menor Lance» e o `vencedor` do Dashboard da mesma forma. A correção do UTAC é a certa para os dados disponíveis e não piora nada, mas o texto do commit e do teste ("da edição") promete mais do que os dados garantem. Fica para um UTAC de backend/contexto.

### ℹ️ Informativos

3. **V3 é equivalente:** a identidade é mais estrita do que comparar por valor; só seriam diferentes com dados incoerentes (dois lances não repetidos com o mesmo valor). Não precisa de teste.
4. **`filtro` "unicos"/"repetidos" não é exercitado pelos testes** (é `useState("todos")` interno e o SSR não consegue clicar). A lógica nova não depende do filtro: o `menorUnico` nunca é repetido, logo nunca aparece em "repetidos". Em "unicos" aparece se for da pessoa. Analisado à mão: correto. O código antigo tinha `filtro !== "repetidos"`, que agora sobra e foi removido com razão.
5. **`valor` NaN/null**: o comparador `a.valor - b.valor` daria uma ordem indefinida. Não é atingível: os eventos fazem `Number(BigInt)` e o lance local vem de `valorCentavos` validado. Já existia.
6. **`repetido` indefinido** conta como único (sonda: o lance de 0,90 sem `repetido` leva o 🏆). É coerente com `totalUnico`/`menorUnico` e com o `vencedor` do contexto.
7. **Placeholders vs. regra MC94 (4 estados):** não há conflito. As secções não mostram dados da pessoa nem fazem I/O, dizem que o recurso "ainda não está disponível" e não têm números (o mutante M7 e o teste "nem com sessão, nem sem" confirmam). Aparecem iguais com e sem sessão, o que é honesto. Quando UTAC106/108 ligarem dados reais, os 4 estados (sem sessão / a carregar / erro / vazio-dados) passam a ser obrigatórios.
8. **Texto:** PT-BR correto e coerente ("Esta área ainda não está disponível…"). `glossario.test.mjs` e `pt-only.test.mjs` estão verdes dentro dos 547. "Cupons de desconto" bate com `_lib/cupom.mjs` (valores R$ 5/10/20 do Passe), mas o UTAC106 deve confirmar a semântica.
9. **Rotas:** `App.jsx` não foi tocado; nenhuma rota partida.
10. **Script de mutação do executor:** conta só `fail`, não `cancelled`. Um mutante que parta a sintaxe seria dado como "SOBREVIVEU". O erro é para o lado conservador (não gera falsos PROVADOS), por isso não invalida o 10/10.
11. **Mensagem do commit:** o título "ofertas, cupons e acompanhamento" é o nome do UTAC, mas as frentes A (ofertas) e C (acompanhamento) não foram tocadas (o corpo explica). Cita o backend 967/973 da árvore partilhada em vez do 959/966 do worktree limpo.

## 5. Comandos executados (resumo)

```
git worktree add --detach <scratch>/val105c 08dc863 ; mklink /J (2 junções)
git diff --stat 4dd0403 08dc863 ; git diff 4dd0403 08dc863 -- desafio-gut/frontend/src
node scripts/utac105c-prova-mutacao.mjs            → 10/10 PROVADOS, md5 reposto
node <scratch>/val-mutantes.mjs <wt>/desafio-gut/frontend → tabela §3
node scripts/mc966-suite-harness.mjs ambos         → frontend 547/547 · backend 959/966 · VERDE
node --test --experimental-test-module-mocks "_tests/*.test.mjs" (functions) → 966 tests, 959 pass, 7 skipped, 0 fail
npx eslint (4 ficheiros) → 0 erros, 1 aviso igual ao da base
sonda SSR temporária (criada e apagada no worktree) → cenários de sessão mista, endereço em maiúsculas, repetido indefinido, só repetidos
rmdir (junções) ; git worktree remove --force ; node_modules real = 505 entradas
```
