# UTAC108g — Limpar referências ao lojista (Claude Code, Opus 5.5)

## Baseline (SEG-1)
- HEAD = origin/main = **`4d909a1`** (o esperado). Árvore: só `??` antigos em `_logs/` (MC100-102, não deste UTAC).
- Suíte canónica (`node ../../scripts/mc966-suite-harness.mjs ambos`): frontend **VERDE 899/899** · backend **VERDE 1095/1101**.
- Disco: 9,1 GB livres (> 5 GB).
- Lidos: `_logs/UTAC108f-remover-lojista.md` (fecho, lista do 108g) e `_logs/UTAC108f_SEG8_VALIDADOR.md` (F3).
- Greps (src/, sem `.bak-*`): `/corporativo` → 17 linhas em código de produção (comentários incluídos) + 22 em testes;
  `corporativoWallet` → 2 (AppContext.jsx:626 e 1392); `◈` → 1 (ChatbotWidget.jsx:207);
  `debug-pedido|info-pagamento` em src/ → 0 (mas ver D3).

## SEG0 — Inventário (PARAGEM OBRIGATÓRIA)

Classes: (a) código morto · (b) referência sem efeito (comentário) · (c) lógica partilhada — não tocar · (d) ambígua — PARAR.

| # | Ficheiro:linha | Referência | Cl. | Acção proposta |
|---|---|---|---|---|
| 1 | `lib/encaminhamento.js:95-97` | degrau 2 devolve `DESTINO.CORPORATIVO` (App.jsx cai no Dashboard) | **d** | ver D1 |
| 2 | `lib/encaminhamento.js:12,19,42-55` | comentário `CorporativoRoute`, constante `CORPORATIVO`, doc do degrau | b/a | segue D1 |
| 3 | `lib/rotasTrabalho.js:20` | prefixo `/corporativo` em `PREFIXOS_TRABALHO` (rota já não existe; catch-all) | a | remover o prefixo |
| 4 | `lib/rotasTrabalho.js:35-37` | comentário «barra é a ÚNICA navegação do lojista» | b | reescrever sem o lojista |
| 5 | `lib/dicaSessao.js:177-180` | comentário «expulso por `CorporativoRoute`… /corporativo» | b | reescrever |
| 6 | `lib/dicaSessao.js` (CHAVE_LOJISTA, `gravarDicaLojista`, `lojistaProvavel`) | dica do lojista → `tipoProvavel` → `SemSaldoBanner` (R18-B do 108c) | **c** | **manter** |
| 7 | `context/useAppContextEnvironment.jsx:48-50` | `/corporativo/mercado`, `/corporativo/carteira`, `/corporativo`, `/seguranca` em `tabFromPath` | a | remover os 4 ramos mortos |
| 8 | `widgets/layout/BackgroundCanvas.jsx:29-30,32` | `/corporativo/mercado`, `/corporativo`, `/seguranca` em `offsetFor` | a | remover |
| 9 | `BackgroundCanvas.jsx:18` · `AppLayout.jsx:19` · `Layout.jsx:57-60` | comentários «(/admin, /corporativo)», «ÚNICA navegação do lojista» | b | reescrever |
| 10 | `components/ChatbotWidget.jsx:207` | selo «◈ Lojista» (`tipoUsuario==="corporativo"`) | a | remover o ramo → ex-lojista vê «●» |
| 11 | `ChatbotWidget.jsx:244` | `tipoUsuario` na chave do histórico do chat | **c** | **manter** (mudar órfã o histórico) |
| 12 | `context/AppContext.jsx:624-629,1392-1393` | `corporativoWallet` + `addressCorporativo` — **0 consumidores** | a | remover |
| 13 | `AppContext.jsx:604-619,1389` | `atualizarTipoCorporativo` — 0 consumidores (os 2 chamadores saíram no 108f); só `cotaAtiva.test.mjs:101` o fixa | **d** | ver D5 |
| 14 | `AppContext.jsx:564-589,1414` | `cotaAtiva` — 0 consumidores; `cotaAtiva.test.mjs` fixa-o | **d** | ver D5 |
| 15 | `AppContext.jsx:632` | `userLabelReal` cai em `cotaCorporativa?.empresa` para corporativo (rótulo visível do ex-lojista) | **d** | ver D4 |
| 16 | `AppContext.jsx:351-370,523,559-562,599-601` | `cotaCorporativa`, `tipoUsuario`, `tipoProvavel`, `gravarDicaLojista` | **c** | **manter** (R18-B) |
| 17 | `AppContext.jsx:526-529,603,609-613` | comentários (redirect p/ /corporativo, SejaNossoParceiro, CorporativoCarteira) | b | reescrever/encurtar |
| 18 | `pages/MercadoLances.jsx:29,372` | comentários «gerido pelo lojista em /corporativo (BannerUpload)» — falso desde o 108f | b | reescrever |
| 19 | `widgets/layout/Sidebar.jsx:33,47-48` | comentários (isolamento, «card no CorporativoDashboard») | b | reescrever |
| 20 | `hooks/useTrocarPorSenhas.js:11` · `components/StatTile.jsx:7` | comentários citam `CorporativoCarteira.jsx`/`CorporativoDashboard.jsx` (apagados) | b | reescrever |
| 21 | `App.jsx:95-100,196-197,411-415` | comentários do 108f («limpeza da lib no 108g»; catch-all de `/corporativo/*`) | b | 196-197 segue D1; 411-415 ver D2 |
| 22 | `PrivyRoot.jsx:175-177` | «OTP corporativo» — o e-mail OTP serve hoje `/login-email` do comprador | c | manter |
| 23 | `pages/Privacidade.jsx:91` | **texto legal visível**: «e-mail com código OTP no fluxo corporativo» | **d** | ver D6 |
| 24 | `DetalheProduto.jsx:197,207` · `pedidos.js:63` · `admin/Cotas.jsx:81` · `AdminLayout.jsx:111` · `EstadoNeutro.jsx` · `Cadastro.jsx:52` · `SemSaldoBanner.jsx:21` | «lojista» = vendedor do produto / admin de cotas / R18-B | c | manter |
| 25 | `netlify/functions/info-pagamento.mjs` | 0 chamadores em todo o repo (só `graphify-out/`) | a | `git rm` (ver D3) |
| 26 | `netlify/functions/debug-pedido.mjs` | 0 chamadores no app; **1 teste de segurança** `_tests/mc87-seguranca.test.mjs:29,136-150` (P1-3 fail-closed) | **d** | ver D3 |
| 26b | `pages/Vitrine.jsx:26,409` | comentários do 108f (`/corporativo/analytics`, `addressCorporativo`) — **fugiu à 1.ª versão da tabela; apanhado pelo teste novo** | b | reescrever |
| 27 | Testes com `/corporativo` (`utac107g`, `utac108f-sem-lojista`, `utac106c`, `mc991-*`, `utac108c-mlc-aviso`, `encaminhamento.test`, `dicaSessao.test`, `dicaLojista.test`) | provam a AUSÊNCIA/catch-all — precisam do literal | **d** | ver D2 |

**Contagem:** (a) 7 · (b) 10 · (c) 5 · (d) 7 (D1-D6).

### ⚠️ Conflitos/ambiguidades escalados ao operador (GATE 12 / AU3) — PARADO
- **D1 — degrau 2 do `encaminhamento.js`.** Remover o ramo muda o comportamento: hoje o ex-lojista (`tipoProvavel==="corporativo"`) vê o Dashboard **de imediato**; sem o ramo passa pelo **EstadoNeutro até `/cotas` responder (até 10 s)**, como um comprador. Proposta: manter o degrau mas devolvendo `DESTINO.DASHBOARD` (comportamento byte-idêntico) e apagar `DESTINO.CORPORATIVO`.
- **D2 — meta «`grep /corporativo src/` → 0».** Os testes que provam a ausência/catch-all precisam do literal. Proposta: **0 em código de produção (comentários incluídos)**; testes exceptuados; `App.jsx:411-415` reescrito sem o literal.
- **D3 — endpoints.** `info-pagamento`: 0 chamadores → remover. `debug-pedido`: o único «chamador» é o teste de segurança MC87 P1-3 (o backend desce de 1101). E o «O que NÃO faz» diz «NÃO altera backend» enquanto o SEG4 manda `git rm`. Proposta: remover os dois + o bloco P1-3 do teste.
- **D4 — `userLabelReal`** usa o nome da empresa como rótulo para corporativo. Proposta: manter (rótulo visível; ex-lojista ficaria sem nome).
- **D5 — `atualizarTipoCorporativo` e `cotaAtiva`**: mortos, mas fixados por `cotaAtiva.test.mjs` (MC89.40/41). Proposta: remover ambos + os testes que os fixam (o estado `cotaCorporativa` fica).
- **D6 — `Privacidade.jsx:91`** é texto legal visível. Proposta: não tocar aqui; registar no DEBT para a revisão de textos legais.

**Veredicto SEG0: PARAR** até às respostas.

### Decisões do operador (R18, SEG0, 2026-10-08)
- **R18-A (D1):** manter o degrau 2 mas a devolver `DESTINO.DASHBOARD`; apagar `DESTINO.CORPORATIVO` (comportamento byte-idêntico).
- **R18-B (D2):** meta = **0 `/corporativo` no código de produção** (comentários incluídos); testes exceptuados.
- **R18-C (D3):** **nenhum** endpoint removido — backend intacto (`debug-pedido`/`info-pagamento` ficam para o 108h). SEG4 sem objecto.
- **R18-D (D5):** remover `atualizarTipoCorporativo` e `cotaAtiva` + as asserções do `cotaAtiva.test.mjs` que os fixam; `cotaCorporativa` fica.
- D4 (`userLabelReal`) e D6 (`Privacidade.jsx:91`): seguida a proposta (manter / não tocar) — sem objecção do operador.

## SEG1 — Ficheiros (referências em produção)
- `lib/encaminhamento.js`: sai `DESTINO.CORPORATIVO` e o comentário `CorporativoRoute`; o degrau 2 devolve `DESTINO.DASHBOARD` (R18-A).
- `lib/rotasTrabalho.js`: `PREFIXOS_TRABALHO = ["/admin"]`; comentário da barra inferior reescrito.
- `lib/dicaSessao.js`: comentário da `CorporativoRoute` reescrito (a dica do lojista FICA — alimenta `tipoProvavel`, R18-B do 108c).
- `context/useAppContextEnvironment.jsx` (`tabFromPath`) e `widgets/layout/BackgroundCanvas.jsx` (`offsetFor` + comentário): saem os ramos `/corporativo*` e `/seguranca` (rotas removidas no 108f; caem no catch-all).
- Só comentários: `AppLayout.jsx`, `Layout.jsx`, `Sidebar.jsx`, `MercadoLances.jsx`, `useTrocarPorSenhas.js`, `StatTile.jsx`, `App.jsx` (5 comentários), `Vitrine.jsx` (#26b).
- `/corporativo` em produção: **17 → 0**.

## SEG2 — Selo
`ChatbotWidget.jsx:207`: sai o ramo `tipoUsuario === "corporativo" ? «◈ Lojista»` — o ex-lojista vê o «●» do comprador. `tipoUsuario` na chave do histórico do chat **mantido** (#11). `◈` em `src/`: **1 → 0** (o teste novo usa `String.fromCodePoint(0x25c8)`).

## SEG3 — Contexto (`AppContext.jsx`, cada linha declarada)
- l.95-99 `CATEGORIAS_COTA` (só usado por `cotaAtiva`) → removido (R18-D).
- l.564-589 `cotaAtiva` + value l.1411-1414 → removido (R18-D).
- l.603-619 `atualizarTipoCorporativo` + value l.1390 → removido (R18-D).
- l.624-629 `corporativoWallet`/`addressCorporativo` + value l.1392-1393 → removido (0 consumidores).
- l.529, l.621: comentários sem `/corporativo`.
- **Mantidos:** `cotaCorporativa`, `tipoUsuario`, `tipoProvavel`, `gravarDicaLojista`, `userLabelReal` (D4).

## SEG4 — Endpoints mortos
**Sem objecto (R18-C):** `debug-pedido` e `info-pagamento` ficam; backend de produção intacto.

## SEG5 — Testes + mutação
- Novo `src/__tests__/utac108g-sem-referencias.test.mjs` (7): controlo positivo da varredura, 0 `/corporativo` em produção, sem selo, sem carteira corporativa, degrau → DASHBOARD (discriminante + controlo), rotas de trabalho, R18-B do 108c preservado.
- `cotaAtiva.test.mjs`: −9 testes (regra/paridade/useCallback do código removido) +1 guarda de remoção (com controlo positivo de `cotaCorporativa`).
- `encaminhamento.test.mjs`: 3 expectativas `CORPORATIVO` → `DASHBOARD`.
- **Extensão declarada:** `netlify/functions/_tests/mc894-rotas-trabalho.test.mjs` (teste do backend que testa a lib do frontend) — `/corporativo` deixou de ser rota de trabalho. Código do backend intocado.
- **Mutação 8/8 RED**, restauro md5-idêntico (script no scratchpad, fora do repo): M1 prefixo `/corporativo` (3) · M2 selo (1) · M3 `corporativoWallet` (1) · M4 degrau → `/corporativo` (5) · M5 degrau removido (3) · M6 `cotaAtiva` (1) · M7 R18-B do 108c removido (5) · M8 `/corporativo` no `tabFromPath` (1).
- ⚠️ Instrumento: o 1.º run da bateria rebentou no `print` (consola cp1252 vs `◈`) — o `finally` já tinha restaurado o ficheiro (confirmado: 0 `◈`); repetido com `PYTHONIOENCODING=utf-8`.

## SEG6 — Verificação
- Suíte canónica **VERDE**: frontend **898/898** (899 − 9 + 8) · backend **1095/1101**. `vite build` ✓ (para o scratchpad).
- `/corporativo` em produção = **0** · `◈` em `src/` = **0** · `corporativoWallet` = **0**.
- Intactos (diff vazio): `cotas.mjs`, `admin/Cotas.jsx`, `leilaoLock.js` (`EM_BREVE_MODE = true`), `package.json`, `package-lock.json`, 5 `.bak-*`. Admin/Carteira/Início/MLC/OP: suíte verde (sem browser — declarado).
- Commit local `f398c0f` (sem push até ao veredicto). Produção antes: entry `index-BmsJdBht.js`.

## SEG7 — Validador adversarial
Worktree próprio (`C:/Users/Moltbot/tmp-108g-val/wt` @ `f398c0f`, helper A13 — criado e removido; `node_modules` real intacto: 498). Verbatim: `_logs/UTAC108g_SEG7_VALIDADOR.md`.
**APROVADO — 0 ⛔ · 2 ⚠️ (cobertura de teste) · 4 ℹ️.** (a)-(p) não refutados; `decidirDestino` igual em **9216** combinações (1600 eram CORPORATIVO → DASHBOARD); 34 caminhos vivos sem diferença em `tabFromPath`/`offsetFor`/`ehRotaDeTrabalho`/`escondeNavegacaoConsumo`; 11 mutantes, 9 mortos.
- ⚠️1 badge corporativo com outro texto («Parceiro») passava → **fechado**: o `perfilBadge` não pode citar `tipoUsuario`/`tipoProvavel`/`corporativo` (M2b → RED).
- ⚠️2 ramo `/seguranca` reintroduzido passava → **fechado**: guarda sobre os corpos de `tabFromPath`/`offsetFor` (M9a/M9b → RED).
- ℹ️3 comentário da `dicaSessao.js` incompleto (o palpite também salta o estado neutro) → **corrigido**.
- ℹ️1 `public/robots.txt` tem `Disallow: /corporativo` (fora de `src/`, inofensivo) → **declarado, para o 108h**.
- ℹ️2 `scripts/test-mc12.mjs` (fora da suíte) exige `corporativoWallet`; partido desde o 108f → **declarado, para o 108h**.
- ℹ️4 URLs mortas: o frame antes do redirect passa a rota de consumo (sem browser) → aceite.
Correcções em `ceb9c67`; suíte **899/899 · 1095/1101 VERDE**. Correcções NÃO re-validadas em 2.ª ronda (declarado).

## SEG8 — Deploy + registo
- Push `4d909a1..ceb9c67` (`f398c0f` refactor + `ceb9c67` achados do validador) = auto-deploy Git (deploy `ceb9c67` ready).
- Entry **`index-BmsJdBht.js` → `index-DnPRjG5D.js`**; site **200**; `health` **200 JSON**.
- Crawl BFS de **124 chunks**: 0 `/corporativo` · 0 `◈ Lojista` · 0 `corporativoWallet` · 0 `atualizarTipoCorporativo` · 0 `CATEGORIAS_COTA`; chunk admin `Cotas-DdV4xwem.js` presente.
- ⚠️ Instrumento: a 1.ª sonda só viu 5 chunks (o regex exigia `/assets/` ou `./` e o Vite referencia `"assets/X.js"`); corrigido e repetido → 124.
- `package-lock.json` não sujado (sem build local de deploy).
- Pendências para o 108h: `public/robots.txt` (`Disallow: /corporativo`), `scripts/test-mc12.mjs` (exige `corporativoWallet`), `debug-pedido`/`info-pagamento` (R18-C), `Privacidade.jsx:91` «fluxo corporativo» (texto legal, D6). `_logs/DEBT.md` não tocado (fora do AUTORIZA).

## Custo (¢/1M tokens; Opus 5.5: 400 in · 2000 out · 20 cache)
Validador 133 551 tokens = **2,7–267 ¢** (53,4 ¢ se tudo input). Sessão principal não medida (`/cost`). Duração ≈ 10:00 → 11:13 ≈ **1 h 15** (dentro do HI5 de 2 h).
