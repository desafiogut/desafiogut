# UTAC107g.3 — SEG4 Validador adversarial independente

Worktree: `scratchpad/wt-107g3` @ 4ca743d (baseline ceb5ab8). Nada de commit/push/deploy. Repo principal não tocado.
Script de ataque: `scratchpad/seg4-ataque.mjs` (importa o helper REAL do worktree). Log da suíte: `scratchpad/seg4-suite.log`. Bundle: `scratchpad/seg4_build_out/` (gerado em `wt-107g3/_seg4_build`, movido com `mv` para fora do worktree; `git status` limpo).

## Âmbito do diff
`git diff --name-only ceb5ab8 4ca743d` → só `desafio-gut/frontend/src/App.jsx` (+import, 1 linha trocada), `src/lib/acessoDiretoCadastro.js` (novo), `src/lib/acessoDiretoCadastro.test.mjs` (novo). Confirmado.
Router: `main.jsx:9,113` usa `BrowserRouter` → `window.location.search` é a mesma query que o router vê (sem divergência HashRouter).

## Alíneas

**(a) `?src=1` abre?** — `node seg4-ataque.mjs`: `"?src=1" | antigo true | novo false`. **Não abre. OK.**

**(b) `?arc=10` abre?** — `"?arc=10" | true | false`. **Não abre. OK.**

**(c) `?rc=10` abre?** — `"?rc=10" | true | false`. **Não abre. OK.**

**(d) Outros parâmetros/codificações disparam por substring?** Matriz de 35 casos (antigo|novo):
- Fechados agora (abriam antes): `?xrc=1`, `?rc=1+`, `?rc=2&rc=1`, `?;rc=1`, `?rc=1;`, `?rc=1%00`, `?rc=1.0`, `?utm=rc=1`, `??rc=1`, `?%20rc=1`.
- Fechados nos dois: `?rc%3D1`, `?rc=+1`, `?rc=%201`, `?RC=1`, `?Rc=1`, `?rc=%E2%80%8B1` (ZWSP), `?rc=١`, `?rc=１`, `?rc=01`, `?rc[]=1`, `?rc =1`, `#?rc=1` / `/#rc=1` (hash não entra em `location.search`: `new URL(...).search === ""`).
- Abrem agora e não abriam antes: `?%72c=1`, `?r%63=1`, `?rc=%31` — todos **decodificam para `rc=1`**, ou seja, é a mesma porta MC17 escrita de outra forma (qualquer anónimo já pode escrever `?rc=1`). Não é bypass novo. ℹ️
- `?rc=1&rc=2` abre (URLSearchParams.get devolve o 1.º valor); `?rc=2&rc=1` não abre. Contém `rc=1` exato como 1.º valor → aceitável. ℹ️
- Outro parâmetro com efeito na mesma guarda: o ramo `!isConnected` só tem `pareceAutenticado` e o helper. `pareceAutenticado = isConnected || sessaoOtimista` (AppContext.jsx:687-689) deriva de localStorage (`gut_saldo_cache` validado contra `privy:connections`) e cai com `ready && !authenticated` — não é controlável por URL. O único outro leitor de URL relevante, `/[?&]privy_oauth_/` (AppContext.jsx:314 → `loginEmCurso`), alimenta só `encaminhamento.js` (espera em "/"), não a CorporativoRoute. **Nenhum outro parâmetro abre a UI do lojista. OK.**

**(e) `?rc=1` deixou de funcionar?** — `"?rc=1" | true | true`; também `?foo=bar&rc=1`, `?rc=1&utm=x`, `?rc=1#a` (via URL real). **Preservado. OK.** Produtor de `?rc=1`: `git grep` em 4ca743d (excluindo .bak/.md/node_modules) só encontra comentários, o consumidor `CorporativoDashboard.jsx:33` e o teste `utac107g-navegacao.test.mjs:75`; nenhum produtor em frontend ou backend (confirma DEBT-021). Divergência para legítimos: inexistente na prática (sem produtor). Ganho colateral: guarda e `CorporativoDashboard` (já `get("rc")==="1"`) passam a usar o MESMO predicado — antes `?rc=10` abria a guarda mas o Dashboard não limpava a URL.

**(f) Outros sítios com comparação substring frágil?** — `grep -rnE "location\.(search|href|hash|pathname)...\.(includes|indexOf|match|startsWith|endsWith|test)\("` em src (sem .bak):
- `BottomNav.jsx:104,298,301` `location.pathname.startsWith(path)` — só realce visual da navegação, sem efeito de acesso. ℹ️
- `AppContext.jsx:314` e `App.jsx` (retorno OAuth) `/[?&]privy_oauth_/` — prefixo com fronteira `[?&]`, família de parâmetros do Privy; efeito = esperar/spinner, não abre UI. ℹ️
- `ReferralTracker.jsx:23`, `useRecursosApp.js:77` já usam `URLSearchParams.get`. 
- Bundle (`npx vite build --outDir .../_seg4_build`, ✓ built 4.20s): `includes("rc=1")` / `location.search.includes|indexOf|match` → **0 ocorrências**; presente `function Fe(e){return typeof e==\`string\`?new URLSearchParams(e).get(\`rc\`)===\`1\`:!1}` e a guarda `c||Fe(window.location.search)?e:(0,H.jsx)(s,{to:\`/\`,replace:!0})`. `src/App.jsx.bak-20260724145416:61` ainda contém `includes("rc=1")` — cópia de arquivo, não importada nem no bundle. ℹ️
**Nenhum outro sítio com o mesmo padrão em código servido. OK.**

**(g) Quebrou outra funcionalidade?** — Diff mínimo (import + 1 linha); suíte verde (ver j); build OK; `utac107g-navegacao` (que usa `/corp?rc=1`) passa. Mutação (restauro por `cp -p` de cópia prévia + verificação md5 → `RESTORED-OK`, `git status` limpo):
- M1 guarda revertida para `includes("rc=1")` → 2 fail (cablagem + anti-substring). Morta.
- M2 helper revertido para substring → 2 fail. Morta.
- M3 guarda sem `return <Navigate>` → 1 fail. Morta.
- M4 helper com `toLowerCase()` (aceita `?RC=1`) → 1 fail. Morta.
**OK.**

**(h) Backend alterado?** — `git diff --name-only ceb5ab8 4ca743d` só lista 3 ficheiros de frontend. **Não. OK.**

**(i) `.bak-*` tocados?** — md5 medidos: capacitor.config.ts.bak-20260725182152 `16b8f60f…1def`, App.jsx.bak-20260724145416 `0b455e9c…85d5`, PrivyRoot.jsx.bak-20260724200959 `245f901e…b6`, PrivyRoot.jsx.bak-custom-scheme-20260725182152 `f6b2c718…e`, PrivyRoot.jsx.bak-oauth `feb4e75c…dc34` — **todos iguais aos esperados**; nenhum no diff. **OK.**

**(j) Suíte canónica** — `node scripts/mc966-suite-harness.mjs ambos < /dev/null` → rc=0, `frontend: VERDE 849/849`, `backend: VERDE 1095/1101`, `VEREDITO: VERDE`. `EM_BREVE_MODE = true` (leilaoLock.js:10). **OK.**

## Achados
- ℹ️ **I-1** `?rc=1` exato continua a abrir a UI das rotas do lojista a um anónimo (por desenho MC17). O fix fecha só os falsos positivos. Como o produtor já não existe (DEBT-021), remover a porta por completo é a correção de fundo — fora do âmbito deste UTAC. Dados continuam protegidos no servidor.
- ℹ️ **I-2** Variantes percent-encoded (`?%72c=1`, `?r%63=1`, `?rc=%31`) passam a abrir — são `rc=1` decodificado, não ampliam a superfície.
- ℹ️ **I-3** `?rc=1&rc=2` abre, `?rc=2&rc=1` não (1.º valor ganha). Inócuo.
- ℹ️ **I-4** Em `/corporativo`, o Dashboard limpa `?rc=1` (navigate replace) e o anónimo é depois expulso para "/"; nas outras 7 rotas do lojista o `?rc=1` persiste. Comportamento anterior, inalterado.
- ℹ️ **I-5** `App.jsx.bak-20260724145416` mantém o padrão antigo; não é servido (ausente do bundle).
- ℹ️ **I-6** `startsWith`/regex `privy_oauth_` restantes não controlam acesso.
- Nenhum ⛔ nem ⚠️.

## Veredicto
**APROVADO** — (a)-(d) fechados por medição, (e) preservado, (f) sem outro padrão frágil em código servido nem no bundle, (g)-(j) limpos; testes novos matam 4/4 mutações.
