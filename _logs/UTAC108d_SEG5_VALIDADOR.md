# UTAC108d — Veredicto do validador adversarial

**Commit:** 50a9223 (base 1f00b30) · worktree `C:/Users/Moltbot/tmp-108d-val/wt`

## Veredicto: APROVADO COM RESSALVAS

Nenhum dos pontos de (a) a (j) refuta a correcção. Ficam ressalvas: há mutantes de visibilidade que os testes não apanham, comentários que ficaram desactualizados, um componente agora sem uso e uma contradição de UX que já existia antes (o formulário de lance está activo debaixo de «Nenhuma edição em andamento.»).

## Tabela (a)–(j)

| # | Hipótese de refutação | Resultado | Evidência |
|---|---|---|---|
| a | O MLC ainda mostra «EM BREVE» sem edição | **Não refuta. Fica o resíduo declarado.** | O herói saiu: `GlassHeader.jsx` perdeu o import e o `<ComingSoonHero …/>`. Em `src/` a única ocorrência de `EM BREVE` em maiúsculas que ainda se renderiza é a do `ComingSoonHero.jsx:48`, que já ninguém usa. Sobra a pílula `🕒 Em breve` (`TabelaLances.jsx:124-125`, que vem de `getEstadoEdicao` → `edicao.js:48`). Não tem `textTransform`, por isso aparece em minúsculas. Sonda temporária: com `emBreve=true` aparece «🕒 Em breve»; com `false` aparece «Prazo: — 🟢 Ativo». |
| b | O estado vazio não aparece sem edição | Não refuta | `MercadoLances.jsx:355-357` renderiza `EM_BREVE_MODE ? <SemEdicaoAviso/> : …`. Os testes 108d (b) passam: aparece uma vez, com as duas frases, dentro de vidro e entre `<main>` e o card-lance. |
| c | O «Sem saldo» aparece sem edição | Não refuta | Fica no ramo `:` do ternário. Os testes 108d (c) e 108c («UTAC108d · sem edição…») passam. O mutante D3 morre. |
| d | O mockup do 107d quebrou com edição activa | Não refuta | `utac107d-mlc.test.mjs` dá 9/9. O teste 108d com `emBreve:false` confirma a frase e a ordem lance → tabela → rodapé. Nota: o 107d não aplica o alias ao leilaoLock, por isso só corre o ramo com `true`. O ramo `false` só é coberto pelo 108d. |
| e | O CardLance rebenta com o estado vazio | Não refuta. O render real não foi medido. | `git diff 1f00b30 50a9223 -- …/CardLance.jsx` vem vazio. As props em `MercadoLances.jsx:359-369` são as mesmas e já eram montadas antes com `EM_BREVE_MODE=true`, porque na web o early return não dispara. Nos testes o CardLance é um duplo (o real faz rebentar a heap no SSR, MC94), por isso o render real não foi medido. |
| f | A tabela rebenta com um array vazio | Não refuta | O TabelaLances é o REAL nos testes. O teste «vista real fica inteira» com `lances: []` passa e mostra `tabela-fim`. A ordenação usa `lances = []` por omissão. |
| g | Outro ecrã quebrou (Carteira, Início, OP) | Não refuta | O diff toca só em 8 ficheiros: MLC, GlassHeader, SemEdicaoAviso, 3 de teste e 2 scripts. O GlassHeader só tem um consumidor (o MLC) e o SemEdicaoAviso também. Suíte frontend 884/884. Não houve validação visual em browser. |
| h | O backend foi alterado | Não refuta | `git diff --name-only 1f00b30 50a9223 \| grep -i "backend\|netlify/functions\|package\|bak"` não devolve nada. |
| i | Algum `.bak-*` foi tocado | Não refuta | Há 5 `.bak-*` versionados e nenhum aparece no diff. |
| j | A suíte canónica está vermelha | Não refuta | `node scripts/mc966-suite-harness.mjs ambos` em foreground (1m43s): frontend VERDE 884/884, backend VERDE 1095/1101, veredito VERDE. |

## Números medidos

- `utac108d-mlc-sempre.test.mjs`: 12/12
- `utac108c-mlc-aviso.test.mjs`: 17/17
- `utac107d-mlc.test.mjs`: 9/9
- `utac108d-prova-mutacao.mjs`: 6/6 provados (D1–D6), exit 0
- `utac108c-prova-mutacao.mjs`: 14/14 provados (M1–M14, incluindo o M12 com a âncora nova), exit 0
- Os dois scripts mutam o worktree: os caminhos saem de `import.meta.url`. O md5 dos ficheiros do repo principal (MercadoLances, GlassHeader, SemSaldoBanner) ficou igual antes e depois, e o `git status` do worktree ficou limpo.
- `EM_BREVE_MODE = true` em `src/lib/leilaoLock.js:10`. O diff não toca em CardLance, leilaoLock, TabelaLances, package.json, package-lock.json, `.bak-*` nem backend.

## O duplo do leilaoLock

- **É fiel.** Exporta o mesmo que o real (`EM_BREVE_MODE`, `EM_BREVE_LABEL`, `displayTimer`), mais `definirEmBreve`. O real usa `const` e o duplo `let`; a omissão é `true` em ambos.
- **O ramo «com edição» é mesmo exercido.** O alias `^\.\.\/lib\/leilaoLock\.js$` também apanha o import de `utils/edicao.js:23`. Por isso, com `false`, o mundo todo fica coerente: a pílula da tabela passa a «🟢 Ativo» (controlo positivo medido numa sonda temporária, já apagada). Os mutantes D6 e X5 confirmam que um caminho de import fora do alias seria apanhado.

## Mutantes extra tentados

Cópia em memória e restauro com md5 idêntico. Script em `C:/Users/Moltbot/tmp-108d-val/mut/extra.mjs`.

| Id | Mutante | Resultado |
|---|---|---|
| X1 | Estado vazio com `display:"none"` | **SOBREVIVEU** |
| X2 | Estado vazio com o atributo `hidden` | **SOBREVIVEU** |
| X6 | Estado vazio com `opacity:0` | **SOBREVIVEU** |
| X3 | Sem `role="status"` (a11y) | **SOBREVIVEU** |
| X4 | Herói reintroduzido como `<h2 style={{textTransform:"uppercase"}}>Em breve</h2>` no cabeçalho | **SOBREVIVEU** |
| X5 | Import do sinal por caminho não aliasado | Morto (2 testes falham) |
| X7 | Copy em pt-PT, «a decorrer» | Morto (2 testes falham) |

## Achados

- ⚠️ **A1. Os testes não verificam a visibilidade nem o herói disfarçado.**
  - X1, X2, X6: o estado vazio pode ficar invisível e os testes continuam verdes. O 108c tinha o M11 para este caso; o 108d não tem equivalente.
  - X4: o teste (a) procura `/EM BREVE/` com distinção de maiúsculas no texto SSR, e por isso não vê um herói em minúsculas com CSS uppercase.
  - *Proposta:* acrescentar ao 108d asserts de que não há `display:none`, `hidden` nem `opacity:0` no nó `data-testid="sem-edicao"` e nos seus pais. No (a), procurar com `/em breve/i` excluindo a pílula conhecida, ou exigir que o `<h2>` do cabeçalho não exista.
- ⚠️ **A2. Contradição de UX que já existia (não medida em runtime).**
  - Com `EM_BREVE_MODE=true` e sem prazo real, `encerrado` fica `false` (`AppContext.jsx:1211-1236`). O CardLance só bloqueia por `encerrado`: não lê o EM_BREVE e só usa o `getEstadoEdicao` dentro do bloco de `encerrado`.
  - Resultado: «⏳ Nenhuma edição em andamento. Volte quando houver.» aparece imediatamente acima de um formulário de lance activo. Antes o herói dizia «EM BREVE» com o mesmo formulário, por isso não é regressão, mas a frase nova contradiz o formulário com mais força.
  - *Proposta:* um UTAC à parte para decidir se o CardLance deve ser bloqueado ou escondido enquanto `EM_BREVE_MODE` estiver ligado.
- ℹ️ **A3. A pílula «🕒 Em breve» da TabelaLances (resíduo declarado).**
  - Na minha opinião deve ficar, porque vem da fonte única `getEstadoEdicao` (MC88.43), partilhada com o Dashboard e o EdicaoCard. Tirá-la só no MLC reabria o tipo de incoerência do B3/B4.
  - Não está em minúsculas de herói nem tem uppercase, e é compatível com «nenhuma edição em andamento» (ainda não abriu).
  - Fica como redundância visual para o operador decidir. Não justifica refutar.
- ℹ️ **A4. Código morto e comentários desactualizados.**
  - O `ComingSoonHero.jsx` ficou sem consumidor em `src/`.
  - O MLC continua a passar `edicao={EDICAO_ATIVA}` (`MercadoLances.jsx:328`) a um GlassHeader que já não a lê.
  - Estes comentários ainda falam do herói «EM BREVE»: `MercadoLances.jsx:314-317` («HERO "EM BREVE" (foco)»), o cabeçalho do `GlassHeader.jsx:2-3` e o `leilaoLock.js:8` («Hero "EM BREVE" permanente»).
  - *Proposta:* limpeza num UTAC de manutenção (apagar o ComingSoonHero, ou documentá-lo como reserva, e retirar a prop).
- ℹ️ **A5. A referência «Menor lance único vence · Art. 8» do herói desapareceu do MLC.** A regra continua coberta pela frase «Ganha o menor lance que ninguém repetir.», mas a citação do Art. 8 deixou de aparecer neste ecrã. Fica para o operador decidir.

## Não medido

- O render do CardLance real no SSR (não é possível, pela heap do Privy).
- A validação visual em browser ou APK.
- O build de produção (`vite build`).
