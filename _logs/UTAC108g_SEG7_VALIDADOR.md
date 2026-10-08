# UTAC108g — Veredicto do validador adversarial

Worktree `C:/Users/Moltbot/tmp-108g-val/wt`, commit `f398c0f` (pai `4d909a1`). Repo principal não tocado.

## VEREDICTO: **APROVADO** (0 ⛔; 2 ⚠️ de cobertura de teste; 4 ℹ️)

Não consegui refutar nenhum dos itens (a)–(p). A limpeza não muda o comportamento de nenhuma rota viva e o encaminhamento ficou igual. A suíte está verde nos números esperados. Dois mutantes sobreviveram: são lacunas dos testes novos, não defeitos no código entregue.

## Tabela (a)–(p)

| # | Pergunta | Resultado | Evidência |
|---|---|---|---|
| a | `/corporativo` em src/ de produção | **0** | `grep -rn "/corporativo" src` sem testes/__tests__: só aparece em `src/App.jsx.bak-20260724145416` (cópia .bak, fora da meta). Extensões em src/ (fora de testes): jsx 107, js 63, mjs 16, css 2, .bak 4. A varredura do teste cobre todas. No bundle (`vite build`), `/corporativo` só aparece em `robots.txt` (vem de `public/`, ver ℹ️1). |
| b | selo «◈ Lojista» | **saiu** | `ChatbotWidget.jsx:206-210`: só restam `⚡ Admin` e `●`. 0 ocorrências de U+25C8 em src/ e em netlify/. 0 no bundle. |
| c | `corporativoWallet` | **saiu** | 0 ocorrências em src/ fora de comentários e testes. 0 no bundle. Único resto: `scripts/test-mc12.mjs:40-43` (script legado, ver ℹ️2). |
| d | admin `/admin/*` | **intacto** | As 13 rotas admin estão em `App.jsx:396-409`. `ehRotaDeTrabalho` e `escondeNavegacaoConsumo` dão o mesmo resultado em 13 caminhos /admin (enumeração antigo vs novo: 0 diferenças). Nenhuma página admin usava as chaves removidas. |
| e | Carteira, Início, MLC, OP | **intactos** | Enumeração em 34 caminhos vivos (incluindo /carteira, /, /mercado, /menor-lance-unico, /ofertas-programadas, maiúsculas, `""`, null, undefined): `tabFromPath`, `offsetFor`, `ehRotaDeTrabalho` e `escondeNavegacaoConsumo` dão **0 diferenças**. Em `MercadoLances.jsx`, `useTrocarPorSenhas.js` e `Vitrine.jsx` só mudaram comentários. Build exit 0. |
| f | aviso «Sem saldo» (108c) | **intacto** | `SemSaldoBanner.jsx` não aparece no diff. O mutante M7 (tirar o R18-B) é apanhado com 5 falhas. |
| g | `tipoProvavel === "corporativo"` | **mantido** | `SemSaldoBanner.jsx:21`, `AppContext.jsx:558` (cálculo) e `:1354` (exposto no value). |
| h | `cotas.mjs` / `admin/Cotas.jsx` | **não tocados** | Nenhum dos dois aparece em `git diff --name-only 4d909a1 f398c0f`. |
| i | endpoint removido | **nenhum** | O único ficheiro alterado fora de `frontend/src/` é `netlify/functions/_tests/mc894-rotas-trabalho.test.mjs`. |
| j | backend fora do escopo | **não** | Idem (i). O diff do backend é só esse teste: +10/−7. |
| k | `.bak-*` tocado | **não** | Nenhum `.bak` no diff. `git status --short` dá 0 linhas no fim. |
| l | suíte canónica | **VERDE** | `node ../../scripts/mc966-suite-harness.mjs ambos`: `frontend: VERDE 898/898 pass`, `backend: VERDE 1095/1101 pass`, `VEREDITO: VERDE` (exit 0). `npx vite build --outDir C:/Users/Moltbot/tmp-108g-val/build-out`: exit 0, `✓ built in 5.80s` (os avisos são todos "comment ignored due to position" no `@privy-io`). |
| m | consumidor dependente das chaves removidas | **nenhum** | grep `\b(cotaAtiva\|CATEGORIAS_COTA\|atualizarTipoCorporativo\|corporativoWallet\|addressCorporativo)\b` em todo o `frontend/` (.js/.jsx/.mjs/.ts, sem node_modules/.bak): só comentários, os próprios testes de remoção e `scripts/test-mc12.mjs`. `_arnes-provider.mjs`, `_stubs-provider/*`, `pages/__tests__/_stubs*/AppContext.jsx` e `_recursos-arnes.mjs` não referem nenhuma delas. Também não há enumeração de chaves do value (`Object.keys(value/ctx)`). |
| n | `decidirDestino` mudou? | **não** | Enumeração completa de 9216 combinações (12 entradas; tipo ∈ {comum, corporativo, undefined}), antigo com CORPORATIVO mapeado para DASHBOARD: **0 diferenças**. 1600 casos davam CORPORATIVO. As outras chaves de `DESTINO` e `PRAZO_ESTADO_NEUTRO_MS` são iguais. `DESTINO.CORPORATIVO` tem 0 consumidores em produção. |
| o | testes vácuos? | **não vácuos; 2 lacunas** | 11 mutantes, 9 mortos e 2 sobreviventes (tabela abaixo). |
| p | ramos removidos com efeito em rota viva | **sem efeito** | 0 diferenças nas 34 rotas vivas. Só as 5 URLs mortas mudam (/corporativo, /corporativo/{mercado,carteira,cotas}, /seguranca): antes ficavam carteira/lances/perfil, offset ±12/6 e "trabalho"=true; agora ficam lances, 0 e false. Isso vale apenas para o render transitório antes do `<Navigate to="/" replace>` do catch-all; depois fica igual a "/". Controlo positivo: as versões antigas distinguem de facto essas URLs. |

### Mutações (o) — cada uma restaurada com md5 IDÊNTICO

| Mutante | Suíte | Resultado |
|---|---|---|
| M1 `/corporativo` num comentário de `Layout.jsx` | frontend VERMELHO 1 | morto |
| M2 selo `◈ Lojista` de volta no chat | frontend VERMELHO 1 | morto |
| **M2b** badge corporativo com outro texto (`txt: "Parceiro"`) | frontend **VERDE 898/898** | **sobrevive** ⚠️1 |
| M3 `corporativoWallet` de volta no AppContext | frontend VERMELHO 1 | morto |
| M4 degrau 2 a devolver ESTADO_NEUTRO | frontend VERMELHO 5 | morto |
| M4b degrau 2 desligado (`if (false)`) | frontend VERMELHO 3 | morto |
| M5 `DESTINO.CORPORATIVO` de volta | frontend VERMELHO 1 | morto |
| M6 prefixo `"/corp"+"orativo"` em `PREFIXOS_TRABALHO` (ofuscado para fugir ao grep) | frontend VERMELHO 1 + backend VERMELHO 1 | morto |
| M7 tirar o `tipoProvavel === "corporativo"` do SemSaldoBanner | frontend VERMELHO 5 | morto |
| M8 `cotaAtiva` de volta no AppContext | frontend VERMELHO 1 | morto |
| **M9** ramo `/seguranca` de volta em `tabFromPath` | frontend **VERDE 898/898** | **sobrevive** ⚠️2 |

## Achados

**⛔ Bloqueantes:** nenhum.

**⚠️1 — o teste do selo protege o texto, não o comportamento.** `utac108g-sem-referencias.test.mjs` só procura U+25C8 e `Lojista"`. Um badge diferenciado para `tipoUsuario === "corporativo"` com outro texto passa (M2b). Pode fixar-se com `assert.doesNotMatch(chat, /tipoUsuario === "corporativo"/)` no ChatbotWidget, ou com um teste puro do `perfilBadge`. Não é defeito no código entregue.

**⚠️2 — a remoção de `/seguranca` (tabFromPath/offsetFor) não tem guarda.** O teste só varre `/corporativo` e um ramo `/seguranca` reintroduzido passa (M9). O efeito seria nulo, porque a rota não existe. É lacuna de cobertura e não tem impacto visível.

**ℹ️1** — `public/robots.txt` ainda tem `Disallow: /corporativo`. Está fora de `src/`, portanto fora da meta R18-B. É inofensivo: só proíbe indexar uma URL morta.

**ℹ️2** — `scripts/test-mc12.mjs` (check 3) exige `corporativoWallet`/`addressCorporativo` e agora falharia. Não faz parte do harness canónico e já estava partido desde o 108f, porque os checks 5–7 leem `SejaNossoParceiro.jsx`, que foi apagado. Candidato a arquivo.

**ℹ️3** — `dicaSessao.js:177-178` diz que o palpite "só esconde o aviso «Sem saldo»". Na verdade também faz o ex-lojista saltar o ESTADO_NEUTRO no degrau 2 (`encaminhamento.js:95`). É imprecisão de comentário, sem efeito no código.

**ℹ️4** — Nas URLs mortas `/corporativo*`, o primeiro render (antes do redirect) passa a tratá-las como rota de consumo: vídeo de fundo e vinheta ligados durante um frame, quando antes ficavam estático e sem vinheta. Depois do redirect fica igual. Não medi isto em browser.

## Limites (o que não medi)

- Não abri o app em browser nem no APK. Admin, Carteira, Início, MLC e OP foram validados por enumeração das funções puras, grep de consumidores, suíte e build. Não houve render real.
- A suíte não renderiza o AppProvider completo com Privy real. A ausência de consumidores das chaves removidas vem de grep, e uma desestruturação de chave ausente dá `undefined` em silêncio. O grep cobriu .js/.jsx/.mjs/.ts de todo o `frontend/` (sem node_modules).
- Não comparei a suíte a correr em `4d909a1`, só em `f398c0f`.
- Os 6 testes do backend que não passaram (1095/1101) aparecem no harness como não-falha (fail=0). Não os inspecionei um a um.
- Scripts de apoio (fora do repo): `C:/Users/Moltbot/tmp-108g-val/enum/{run.mjs,rotas.mjs,mutar.mjs}`. Saída da suíte: `suite-f398c0f.txt`. Build: `build-out/` e `build.txt`.
