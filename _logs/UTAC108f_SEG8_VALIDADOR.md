# UTAC108f — SEG8 · Validador adversarial (Claude Code, Opus 5.5)

Commit validado: `ed4bffe` (pai `c54ecff`). Worktree próprio `C:/Users/Moltbot/AppData/Local/Temp/val108f/wt`, criado e removido com `scripts/worktree-helper.mjs`. A remoção devolveu `{"ok":true}`; depois dela o `node_modules` real continua com 380 entradas e o `desafio-gut/frontend/node_modules` com 498. O repo principal não foi tocado, à excepção deste ficheiro.

## Itens pedidos (a–m)

| # | Tentativa de refutação | Resultado | Evidência |
|---|---|---|---|
| a | Ainda existe alguma rota `/corporativo`? | **Não refutado** | `grep 'path="' App.jsx`: só restam as rotas públicas, as do comprador, o `/admin/*` e o catch-all `*` (App.jsx:348-418). O teste `utac107g` confirma que `/corporativo*`, `/seguranca` e `/seja-nosso-parceiro` caem no `*`. |
| b | BottomNav/Sidebar mostram itens do lojista? | **Não refutado** | Os itens actuais são Carteira, MLC, Início e OP, mais o «Mais»/rail: Vitrine, Programação, Meus Ativos, Regras Oficiais e Configurações. O Admin só aparece se a conta for admin (BottomNav.jsx:30-46,76; Sidebar.jsx:35-59). `tipoUsuario` já não aparece em nenhum dos dois. |
| c | O atalho «Parceiro» continua no Início? | **Não refutado** | Dashboard.jsx:59-64 tem só Vitrine, Meus Ativos e Configurações. |
| d | O admin foi quebrado? | **Não refutado** | `git diff c54ecff ed4bffe -- App.jsx`: a única linha alterada que menciona admin é um comentário novo (App.jsx:416). Os lazy imports e as 12 sub-rotas admin estão intactos. `git diff --stat` de `pages/admin` e `components/admin` está vazio. |
| e | O `cotas.mjs` foi apagado? | **Não refutado** | `desafio-gut/frontend/netlify/functions/cotas.mjs` continua presente. |
| f | O `admin/Cotas.jsx` foi tocado? | **Não refutado** | Não aparece no `--name-status` do commit. |
| g | Foi removido algum endpoint que ainda tem chamador? | **Não refutado** | O diff não tem nenhum ficheiro em `netlify/` (R18-A). |
| h | Carteira, Início, MLC ou OP partiram? | **Não refutado** | `MinhaCarteira`, `MercadoLances` e `OfertasProgramadas` não foram tocados. O Dashboard perdeu só o atalho. As rotas continuam (App.jsx:368-381). `vite build` → `✓ built in 4.99s`. O `eslint` com `no-undef` dá 0 erros nos 6 ficheiros alterados. |
| i | O «Sem saldo» (108c) partiu? | **Não refutado** | `SemSaldoBanner.jsx` não foi tocado. `tipoProvavel` continua no contexto (AppContext.jsx:562). |
| j | O CardLance foi alterado? | **Não refutado** | Não aparece no diff. |
| k | O backend foi alterado? | **Não refutado** | O diff não tem nenhum ficheiro em `netlify/functions`. `package*.json` não foram tocados. O `EM_BREVE_MODE` não mudou: o único `-` é um comentário dentro de um ficheiro apagado, e `leilaoLock.js` não foi tocado. |
| l | Algum `.bak-*` foi tocado? | **Não refutado** | `git show --name-only ed4bffe \| grep -c .bak` → 0. |
| m | A suíte canónica está vermelha? | **Não refutado** | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` em foreground: `frontend: VERDE 899/899`, `backend: VERDE 1095/1101`, `VEREDITO: VERDE`. Passou de 909 para 899 testes: saíram os testes do lojista e entraram 5 novos. |

## Verificações extra

- **Imports para ficheiros apagados:** nenhum, e o `vite build` passa. Recolhi os imports dos 18 ficheiros apagados e procurei os importadores de cada alvo (`useTrocarPorSenhas`, `imagem`, `fingerprint`, `StatTile`, `GutoAvatar`, `BotaoLoginPrincipal`, `useIsMobile`). Todos mantêm pelo menos um importador fora dos testes, por isso o commit **não deixou nenhum órfão novo**. Os órfãos que existem (`CreditoStatus`, `AdminSpinner`, `ComingSoonHero`, `lib/tempo.js`, …) já eram órfãos antes e não estão ligados aos ficheiros apagados.
- **Arranque de uma conta corporativa:** a sequência é `decidirDestino` → `DESTINO.CORPORATIVO` (encaminhamento.js:95-96) → `DashboardOuCorporativo`. Como já não há ramo para esse destino, a conta recebe `<Dashboard />` (App.jsx:199-203). O isolamento `rotasProibidas` saiu (AppContext.jsx:621). Um URL antigo `/corporativo/*` vai para o catch-all, depois para `/` e depois para o Dashboard. **Não há ciclo.** O `SemSaldoBanner` fica escondido para corporativos, como o 108c pretende.
- **Mutações próprias contra `utac108f-sem-lojista.test.mjs`.** Foram aplicadas com `cp` de backup. Depois de cada uma corri `git diff --quiet`, que confirmou o restauro **byte-idêntico**, e o worktree terminou com `git status --porcelain` vazio.
  - M1: `<Route path="/corporativo">` em App.jsx → **morta** (fail 1)
  - M2: atalho «Seja Nosso Parceiro» no Dashboard → **morta**
  - M3: `{ path: "/corporativo" }` no BottomNav → **morta**
  - M4: um `useEffect` com `navigate("/corporativo")` no AppContext → **morta**
  - M5: `pages/Seguranca.jsx` recriado → **morta**
  - M6: `cotas.mjs` apagado → **morta**
  - M8: `admin/Cotas.jsx` com uma linha a mais → sobrevive. É esperado: o teste só verifica que o ficheiro existe, e o «não tocado» verifica-se com git (item f).
  - **M7b:** `if (destino === DESTINO.CORPORATIVO) return <Navigate to="/corporativo" replace />;` em `DashboardOuCorporativo` → **SOBREVIVE** (pass 5, fail 0), apesar de o teste 1 ter a regex explícita `Navigate to="\/corporativo"`.
  - **M7:** a mesma linha com `to={DESTINO.CORPORATIVO}` → **SOBREVIVE** em toda a vizinhança (`utac108f`, `mc991-rotas`, `utac106c-carteira`, `dicaLojista`, `dicaSessao`, `encaminhamento`, `retornoOAuth`, `utac108c-mlc-aviso`): pass 121, fail 0.

## Achados

**F1 (média, defeito da prova, não do código):** a guarda nova não vê a parte do App.jsx onde vive o R18-B. O `codigo()` de `utac108f-sem-lojista.test.mjs:14-17` remove os comentários `/* … */` **antes** dos `//`. O próprio commit acrescentou em App.jsx:97 o comentário de linha ``// … removidos com as rotas `/corporativo/*`. Histórico no git.`` (o `git blame` atribui essa linha a `ed4bffea`). O `/*` dentro de `` `/corporativo/*` `` abre um falso bloco que só fecha no `*/` seguinte, e com isso apaga **6664 caracteres** de código. Medido: `codigo(App.jsx)` deixa de conter `function DashboardOuCorporativo`, `decidirDestino({`, `DESTINO.ADMIN` e `return <Dashboard />`. Consequência: se o redirect do lojista voltar, o ciclo `/` → `/corporativo` → `*` → `/` passa a ser possível e nenhum teste da suíte o apanha (M7 e M7b). A alegação «mutação 6/6» do commit só cobre as mutações escolhidas pelo autor.
  - *Correcção sugerida:* remover os `//` antes dos blocos, ou reescrever o comentário sem `/*`. Acrescentar uma asserção positiva de que `codigo(App.jsx)` contém `function DashboardOuCorporativo` (controlo positivo) e uma asserção de que `DESTINO.CORPORATIVO` não é alvo de nenhum `Navigate`.

**F2 (baixa):** o commit deixou identificadores mortos. `navigate` (AppContext.jsx:447) e o import `useLocation` (App.jsx:3) só eram usados pelo isolamento e pela guarda removidos. O eslint emite `no-unused-vars` para os dois.

**F3 (baixa, para o 108g):** há restos textuais de `/corporativo` e `/seguranca` em ficheiros que **não** estão na lista declarada para o 108g:
- `widgets/layout/BackgroundCanvas.jsx:29-32`
- `components/ChatbotWidget.jsx:207` (o badge «◈ Lojista» continua a aparecer a contas corporativas)
- `pages/MercadoLances.jsx:372` (comentário)
- comentários desactualizados em App.jsx:99-100 («lojistas … vão direto para /corporativo»)

Nenhum destes pontos afecta o funcionamento.

## Conclusão

A remoção está correcta: nenhum dos itens a–m foi refutado, o build passa e a suíte está verde (899/899 · 1095/1101). Uma conta corporativa arranca no Início sem ciclo, e o admin, o backend e os ficheiros protegidos ficaram intactos. O que falha é a prova. A guarda nova do 108f não vê o `DashboardOuCorporativo` por causa de um comentário que o próprio commit introduziu (F1), e o regresso do redirect do lojista, com o ciclo que traria, não é apanhado por nenhum teste. F1 deve ser fechado (corrigir o `codigo()` e acrescentar o controlo positivo) antes de dar o 108f como provado. F2 e F3 não bloqueiam.

VEREDICTO: PARCIAL — a remoção do lojista está correcta (a–m não refutados, suíte VERDE 899/899 · 1095/1101, build OK), mas a guarda nova está cega no DashboardOuCorporativo (F1, mutações M7 e M7b sobrevivem).
