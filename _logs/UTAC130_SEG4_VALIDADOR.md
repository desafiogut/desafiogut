# UTAC130 — SEG4 VALIDADOR ADVERSARIAL (modo leve)

Commit: `f3a86a3` · só leitura · 1 teste corrido: `node --test src/pages/__tests__/Dashboard.test.mjs` → **53/53 pass**.

## Veredicto: **APROVADO COM RESSALVAS**

O objectivo principal está cumprido: o tile «Saldo (R$)» saiu do Início, era o único R$ sem condição de plataforma que se via no APK, e a remoção não parte nada no ficheiro. Não confirmei nenhum Saldo R$ visível nem botão PIX activo no APK fora do que já está condicionado. Há, porém, um 0 falso de um commit no tile novo «Passe Desafio», que contradiz a promessa «nunca um 0 inventado». Os testes também deixam essa janela sem cobertura.

---

## ⚠️ Achados

### ⚠️1 — «Passe Desafio» mostra um «0» falso durante um commit quando o token chega (ou quando o address chega depois do token)
- `src/hooks/useInventarioPasses.js:28-31`: sem `authToken`, `recarregar` faz `setCarregando(false)` e põe os passes a 0/0.
- `src/hooks/useInventarioPasses.js:66`: a forma exposta só cobre a janela **sem** token, com `carregando || (address && !authToken)`.
- Sequência real: o address chega sem token (skeleton, correcto). Depois chega o token e o React renderiza **antes** de o efeito voltar a pôr `carregando=true`. Nesse render: `carregando=false`, `erro=""`, `0/0`. Resultado: `valorTilePasses` (`Dashboard.jsx:88-94`) devolve **"0"**. Como o token chega por fetch (não é um evento discreto), o efeito passivo corre depois do paint, logo o «0» pode chegar ao ecrã.
- Acontece o mesmo num refresh com o token em cache e o address a chegar depois (o 1.º efeito, com `address=null`, já pôs `carregando=false`). Na troca de conta, mostra durante um commit o total da conta **anterior**.
- É exactamente a janela que o validador do UTAC107c apanhou e que `estadoPasse` + `passeMemo` resolviam (`Dashboard.jsx:108-118, 243`). O UTAC130 deixou essa protecção calculada mas **sem uso** (`void passeValor`, `Dashboard.jsx:254`) e não a aplicou aos tiles novos.
- Correcção sugerida: passar `valorTilePasses` (e `valorTileCarteira`) pelo mesmo memo `chave=address|authToken → pendente` até se ver `carregando/loading=true` uma vez. A alternativa é o hook devolver `carregando=true` quando `address|authToken` mudou e ainda não houve pedido.

### ⚠️2 — Os testes não cobrem a janela do ⚠️1 e o duplo esconde-a
- `_stubs/useInventarioPasses.js` **não reproduz** a regra derivada `carregando || (address && !authToken)` do hook real. Com `authToken:null` e o duplo por omissão, o tile mostraria «0».
- O teste «sessão ainda a cunhar» (`Dashboard.test.mjs:370`) só verifica a **Carteira**. Por acaso, o estado do inventário herdado do teste anterior (`carregando:true`, linha 362; `definirInventario` não é reposto entre testes) também deixaria o Passe em skeleton. Há acoplamento à ordem dos testes.
- Nenhum teste reproduz «token chega → 1.º commit», nem para os pontos nem para o inventário.

### ⚠️3 — Frente A: «sem alteração» assenta numa hipótese que não foi verificada no aparelho
- Pela leitura do código, o argumento aguenta. `detectarPlataformaNativa` (`src/lib/google-play-billing.js:106-136`) tem 3 sinais. O 3.º (`https:` + `localhost` + sem porta) é determinístico com Capacitor 8.4.2 (o `androidScheme` por omissão é https) e com `android/app/src/main/assets/capacitor.config.json` sem `server.url`, `hostname` nem `allowNavigation`. Não encontrei nenhum caminho dentro da WebView do APK que devolva «web».
- Mas o operador disse (R18-130-1) que os prints **são do APK**. O executor explica o print com «APK pré-v4 ou navegador» (`_logs/UTAC130_SEG0_SEG1.md`) sem prova no aparelho. Se for o login Google a cair num Chrome Custom Tab em `silly-stardust…/redirect` (UTAC124), o utilizador vê o **PWA**, com Saldo/PIX, e acha que está na app. O código do APK está certo, mas o requisito «o APK nunca mostra Saldo/PIX», tal como o utilizador o vive, **não está garantido**. Fica pendente: confirmar no aparelho (v8) ou corrigir o App Link.

---

## ℹ️ Achados menores

- **ℹ️1 — «Carteira» também pisca durante a cunhagem:** skeleton → «—» → skeleton → valor. No commit em que o token chega, `usePontos` traz `loading=false` + `lance:null` (`usePontos.js:52`), e daí «—». Não é um 0 falso (a docstring assume-o), mas o ecrã muda de estado sem razão. Na troca de conta, mostra durante um commit os pts da conta anterior.
- **ℹ️2 — Teste de erro da Carteira fraco face a uma mutação:** em `Dashboard.test.mjs:377` vêm `erro:"falhou"` **e** `lance:null`. Se se apagar o ramo `erro` de `valorTileCarteira`, continua a sair «—» por causa do `lance:null`, e o teste fica verde. Na prática conta: em erro, o hook real **mantém** o `lance` anterior.
- **ℹ️3 — Hash dos dados re-carimbado:** a nova linha de base (`c25c78e5…`) foi gerada a partir do próprio código. Detecta mudanças, mas não prova que o código está certo. O bloco hasheado (`carteiraStat` … `cardPad`) também **não** inclui `carteiraValor =` (linha 261), `skeletonTile` nem `valorTile*`. A cobertura dessas partes vem só dos testes de comportamento, que no geral servem (a mutação de `!authToken`, de `carregando` e do «sem conta» dá RED). O hash do render `0b037a…` mantém-se e é uma guarda real.
- **ℹ️4 — Código morto:** `estadoPasse`, `passeMemo`, `passeValor` (cria um `<span>` em cada render, sem uso), `metaCartao`, e `VALOR_POR_SENHA_BRL` (`Dashboard.jsx:57`, já estava morto antes). O `pendente` de `stats.map` (linha 377) fica sempre `undefined`.
- **ℹ️5 — R$/PIX latentes no APK, sem condição de plataforma (pré-existentes, fora do diff):**
  - `src/components/SemSaldoBanner.jsx:45`: «⚠️ Sem saldo. Carregar agora?» + **«Carregar PIX →»** em `MercadoLances.jsx:364-365`. Hoje está tapado só por `EM_BREVE_MODE = true` (`src/lib/leilaoLock.js`). Se a trava sair, aparece no APK a quem tiver saldo R$ 0.
  - `src/pages/MinhaCarteira.jsx:675-678`: «⚠️ Não foi possível ler o saldo R$ agora.» fica **fora** do `depositoPix &&`. Aparece no APK se o saldo-rs der erro.
  - `src/components/CardLance.jsx:270`: «Saldo R$ insuficiente. Recarregue via PIX.» Só aparece se o servidor devolver `saldo_insuficiente` (não verifiquei se o backend ainda o produz).
  - `src/pages/MinhaCarteira.jsx:244`: o toast «Saldo insuficiente. Carregar agora?» não tem condição de plataforma (a mensagem de erro tem).
  - `Configuracoes.jsx:167`: o interruptor «Confirmação de depósito PIX» aparece no APK.
  - `MeusPedidos.jsx:189-201`: «Pagar Produto via PIX» é para produto **físico**, permitido pela política da Play. OK.
  - Bem condicionados: Carteira (Saldo Disponível `:331`, Depositar PIX `:407`, link `:489`, nota MP `:668`, `ComprarFichasModal` `:738`) e `BalaoComprarPasse` (`:22, :41`). No header, GUTO e Meus Ativos não há saldo R$ (os R$ que lá aparecem são valores de lance/vencedor).
- **ℹ️6 — Escopo:** o commit toca nos 7 ficheiros esperados. Não estava no pedido `utac123-build-blindado.test.mjs`, mas a alteração está justificada e certa (`android/app/build.gradle:27` = `versionCode 8`). `_logs/UTAC130_SUITE.txt` não vinha na lista anunciada. As alterações por commitar na árvore (`.agents/`, `.gitignore`, `.mcp.json`, `package-lock.json`) **não** entraram no commit.
- **ℹ️7 — O duplo muda o cenário por omissão de outros testes:** antes, o hook real em SSR ficava sempre `carregando:true`. Agora o duplo devolve `0/0` lido, logo `semPasses()` dá `true`. Hoje não há impacto (nenhum teste usa `isConnected:true`, e `semPasseProgramado` exige-o), mas um teste futuro com sessão herda «sem Passe Programado» por omissão.

## (6) Remoção de `saldoRsCentavos/saldoRsStatus`
Nada partido. Não restam referências a `saldoRs*`, `statusRsSuffix` nem `saldoReais*` no `Dashboard.jsx`, fora dos comentários. O módulo carrega e renderiza em SSR (53/53). Os imports (`useRef` e os restantes) continuam usados.

---

## Resposta do executor — correcções NÃO re-validadas por 2.ª ronda (declarado)
| Achado | Tratamento | Prova |
|---|---|---|
| ⚠️1 «0» falso no «Passe Desafio» (e total da conta anterior) no render em que o token chega | **CORRIGIDO**: `tileCarteiraComMemo` / `tilePassesComMemo` passam os dois tiles pelo memo `address|authToken` do `estadoPasse` (UTAC107c), com um `useRef` por tile | teste novo de sequência de renders (token a chegar, troca de conta) · mutante **M9** (sem memo, mesmo com a guarda do token) → **RED** |
| ⚠️2 o duplo não aplica a regra derivada; teste da sessão a cunhar só via a Carteira e herdava estado | **CORRIGIDO**: o teste define o inventário explicitamente (lido, 3 Passes) e exige skeleton nos DOIS tiles com `authToken:null` | `Dashboard.test.mjs` 54/54 |
| ⚠️3 Frente A assenta numa hipótese não verificada (print do PWA após o login Google, UTAC124) | **MANTIDO COMO PENDÊNCIA**: confirmar no aparelho com o v8, ou corrigir o `assetlinks.json` (UTAC124) | — |
| ℹ️ teste de erro vácuo no ramo `erro` | **CORRIGIDO**: caso com `erro` e campo VÁLIDO ⇒ «—» nos dois tiles | idem |
| ℹ️ código morto (`passeMemo`, `passeEstado`, `passeValor`, `metaCartao`) | **REMOVIDO**; `estadoPasse` continua (é usado pelos tiles novos) | lint 0 erros |
| ℹ️ R$/PIX latentes sem condição de plataforma (`SemSaldoBanner.jsx:45`, `MinhaCarteira.jsx:675-678`, `CardLance.jsx:270`, toast `MinhaCarteira.jsx:244`, `Configuracoes.jsx:167`) | **PENDÊNCIA** (DEBT-088), fora das entregas; hoje tapados por `EM_BREVE_MODE` ou por estados raros | — |
| ℹ️ hash dos dados gerado do próprio código | declarado: a guarda real do desenho é o hash do RENDER (`0b037a…`, inalterado); o de dados é linha de base nova | — |
