# UTAC108c.1 — Veredicto do validador adversarial independente

**Veredicto: APROVADO COM RESSALVAS.** Nenhuma das refutações (a)–(h) se confirmou. As ressalvas são só informativas (ℹ️) e nenhuma bloqueia.

Worktree: `C:/Users/Moltbot/tmp-108c1-val/wt` @ 37d9420 (detached). Base: b8ee946. Diff: 4 ficheiros, +34/−5.

## Tabela (a)–(h)

| # | Tentativa de refutação | Resultado | Evidência |
|---|---|---|---|
| a | O aviso ainda aparece no modo Programado | **Não refutado** | `SemSaldoBanner.jsx:19` `if (modalidade === "programado") return false;` é a 1.ª guarda. O call site `MercadoLances.jsx:350` passa `modalidade`. Os testes `utac108c-mlc-aviso.test.mjs:103-106` (função pura, ok e stale) e `:155-159` (página) dão verde. M13 (remover a guarda) e M14 (o call site deixa de passar a modalidade) dão RED. |
| b | O aviso desapareceu do Relâmpago por engano | **Não refutado** | Com `"flash"` a função cai na regra anterior. Testes `:107-112` e `:161-163` (controlo positivo da página com `modalidade:"flash"`) verdes. O meu V2 (`=== "flash"`) morre com 7 fail e o V9 (allowlist `!== "flash"`) morre com 1 fail. |
| c | R18-A quebrada | **Não refutado** | `SemSaldoBanner.jsx:20,22,23`: as guardas ficam intactas e só se acrescentou um `return false` antes (não pode passar a mostrar o aviso em mais casos). M3, V11 (`!isConnected`) e V12 (sem "stale") morrem. |
| d | R18-B quebrada | **Não refutado** | `SemSaldoBanner.jsx:21` intacto. M5 RED. O teste `:111` cobre corporativo em flash. |
| e | Outro ecrã quebrou | **Não refutado** | `mostrarAvisoSemSaldo`/`SemSaldoBanner` só são consumidos em `MercadoLances.jsx:17,350` (grep em `src`, excluindo testes). `CardLance.jsx` tem 0 linhas de diff. Frontend 871/871. Nenhum ecrã foi medido no browser. |
| f | Backend alterado | **Não refutado** | `git diff --name-only b8ee946 37d9420 \| grep -iE 'netlify\|backend\|functions\|supabase\|contracts'` dá «nenhum». |
| g | Algum `.bak-*` tocado | **Não refutado** | `git ls-files \| grep -c '\.bak-'` dá 5 (versionados). Nenhum está no diff. `git status` limpo. |
| h | Suíte canónica vermelha | **Não refutado** | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` (foreground) dá frontend VERDE **871/871**, backend VERDE **1095/1101** e VEREDITO: VERDE (exit 0). |

## Números medidos
- `node --test src/pages/__tests__/utac108c-mlc-aviso.test.mjs`: **16/16 pass**, 0 fail.
- `node scripts/utac108c-prova-mutacao.mjs < /dev/null`: **14/14 PROVADOS**, restauro md5 idêntico, exit 0. O script resolve `RAIZ` a partir da sua própria localização (`scripts/..`), portanto muta o **worktree**. Confirmado por md5 dos 3 ficheiros-alvo no repo principal antes e depois, iguais: `MercadoLances.jsx dd1451c2…`, `SemSaldoBanner.jsx 55a2a80c…`, `MinhaCarteira.jsx 7e861bbd…`. Nota: o repo principal tem versões diferentes do worktree nos dois primeiros ficheiros (alterações locais ou outra revisão). Não foi investigado, só constatado.
- Suíte: frontend 871/871, backend 1095/1101 (os 6 conhecidos).
- `EM_BREVE_MODE = true` em `src/lib/leilaoLock.js:10`. `package.json`/`package-lock.json` sem diff. `CardLance.jsx` sem diff.

## Mutantes próprios (script `C:/Users/Moltbot/tmp-108c1-val/val/mut.mjs`, restauro byte-a-byte por md5)
| Mutante | Resultado |
|---|---|
| V1 `=== "Programado"` (maiúscula) | MORTO (fail=2) |
| V2 `=== "flash"` (inverter) | MORTO (fail=7) |
| V3 `!== "programado"` | MORTO (fail=8) |
| V4 `if (modalidade) return false` | MORTO (fail=5) |
| V5 call site com `modalidade: "flash"` fixo | MORTO (fail=1) |
| V6 call site com `modalidade: "programado"` fixo | MORTO (fail=4) |
| V7 `String(modalidade).includes("prog")` | SOBREVIVEU: **mutante equivalente** (o único valor real que contém "prog" é "programado"). Não é falha de teste. |
| V8 guarda movida para depois de R18-A | INVÁLIDO (âncora com `\n` num ficheiro CRLF). Seria equivalente de qualquer forma, porque todos são `return false` antecipados. |
| V9 allowlist `!== "flash"` ⇒ false | MORTO (fail=1) |
| V10 call site passa `tipoProvavel` como modalidade | MORTO (fail=1) |
| V11 `!isConnected` em vez de `!== true` | MORTO (fail=1) |
| V12 só "ok" (sem "stale") | MORTO (fail=1) |

Restauro: md5 pós-mutação do worktree `aa975f95…` (MLC) e `036789f2…` (Banner) é igual ao de antes. `git status` limpo.

## Pedido 3: é a mesma variável que chega ao CardLance?
Sim, por leitura de código. `MercadoLances.jsx:249` desestrutura `modalidade` de `useAppContext()`. A mesma variável vai para `mostrarAvisoSemSaldo` (`:350`), para `CardLance modalidade={modalidade}` (`:360`) e para o GlassHeader/ModeSelector (`:322-323`). O `CardLance.jsx:91` decide o débito por `modalidade === "programado"`. Os valores do `ModeSelector.jsx:7-8` são exactamente `"flash"`/`"programado"` e o estado nasce em `AppContext.jsx:180` com `"flash"`.

## Achados
- ℹ️ **I1, modalidade ≠ tipo da edição.** `modalidade` é um toggle de UI global (default `"flash"`) e não deriva do tipo da edição. `EDICAO_ATIVA = "R-1"` é fixo (`AppContext.jsx:59`). Se a edição real for de um só tipo, o utilizador pode escolher o modo «errado» e o aviso acompanha o modo escolhido, não a edição. Mesmo assim, o aviso fica **coerente com o débito que o CardLance tentará**, porque é a mesma variável. Não induz em erro em relação ao formulário ao lado. Tratamento proposto: nenhum aqui. Se um dia a modalidade passar a vir da edição, o aviso herda isso automaticamente.
- ℹ️ **I2, Programado com R$ 0 e 0 senhas.** O aviso do topo fica escondido, mas o próprio CardLance mostra «🎫 Sem senhas on-chain — recarregue via PIX…» (`CardLance.jsx:515-525`) e bloqueia o botão (`semFichas`, `:99-100`). O utilizador não fica sem informação. Só falta o atalho «Carregar PIX →» nesse caso. Tratamento proposto: decisão de produto, se o operador quiser o atalho também no Programado sem senhas. Fora do âmbito.
- ℹ️ **I3, cobertura da prop do CardLance.** O teste de página faz stub do CardLance (`data-stub="card-lance"`) e injecta `modalidade` por contexto falso, não via ModeSelector real. A igualdade «aviso ↔ CardLance» está garantida por leitura de código e não por teste: um mutante em `CardLance modalidade=…` não seria apanhado por este teste. Não foi medido. Tratamento proposto: opcional, um assert de que o stub recebe a mesma modalidade.
- ℹ️ **I4, chamada sem `modalidade`.** Com `undefined`, aplica-se a regra antiga (mostra em flash). Só existe um call site e ele passa o valor (M14/V10 cobrem). Não é um problema.

## Não medido
- Validação visual no browser/APK (não pedida).
- O comportamento real do toggle ModeSelector → aviso em runtime com o AppProvider real.
