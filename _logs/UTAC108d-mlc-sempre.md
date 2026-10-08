# UTAC108d — Vista real do MLC sempre visível (estado vazio no lugar do «EM BREVE»)

**Tipo:** produto (frontend) · **Executor:** Opus 5.5 (Claude Code) · **Data:** 2026-10-08 (03:39 →)
**Pedido do operador:** a vista do Menor Lance Único aprovada no 107d sempre visível, com estado vazio dentro de vidro
quando não há edição, sem desligar o `EM_BREVE_MODE`.

---

## Baseline (SEG-1)

| medição | resultado | comando |
|---|---|---|
| HEAD = origin/main | `1f00b30` (registo do 108c.1) | `git log -1`, `git log -1 origin/main` |
| Suíte canónica | frontend 871/871 · backend 1095/1101 → VERDE (medida no fecho do 108c.1, mesmo HEAD de código) | harness |
| 5 `.bak-*` | md5 5/5 OK | `md5sum -c` |
| Bundle de produção antes | `assets/index-BZluhY9V.js` | `curl` |

### ⚠️ Premissa do enunciado REFUTADA por medição (GATE 1/12) → PARAGEM e decisão do operador

| o enunciado dizia | medido |
|---|---|
| o MLC faz early return para «EM BREVE / Aguardando abertura» quando não há edição | o early return é `MercadoLances.jsx:287` `if (!isLeilaoAtivo) return <MercadoConformidade/>` e mostra **«🛍️ Edições na versão Web»** (`:420`) — a vista de conformidade das **lojas** (MC29.1) |
| sem edição ⇒ early return | `isLeilaoAtivo` é **por plataforma**, não por edição: `{ ios:false, android:false, pwa:true }` (`useRecursosApp.js:24`). Na **web** o early return **não dispara** ⇒ produção **já** mostrava a vista real (e o APK lê-se como `pwa`, MC101) |
| (o «EM BREVE» que o operador vê) | vem do **próprio cabeçalho da vista real**: `GlassHeader.jsx:61` → `ComingSoonHero.jsx:48`, herói **incondicional** (decisão MC65/66) que **nem lê** o `EM_BREVE_MODE`. O mockup aprovado tira-o (`docs/mockups-107a/menor-lance-unico.html:148`, «Cabeçalho: só o título e uma frase»), mas o 107d aplicou só frase/envelope/rótulo/tabela |
| «edição activa» | não há sinal no MLC: `EDICAO_ATIVA = "R-1"` fixo; o servidor sintetiza a R-1 |

Remover o early return **não mudaria nada na web** e só exporia o leilão nas builds das lojas (risco de conformidade Play).
`EM_BREVE_MODE` **não** envolvido no early return ⇒ a ressalva 1 do enunciado não se aplica ao early return.

**Decisões do operador (R18):**
- **R18-A — «Trocar o herói»:** o «EM BREVE» do cabeçalho dá lugar ao estado vazio; **o early return das lojas fica intacto**.
  Autoriza `GlassHeader.jsx` (e o `ComingSoonHero`, que acabou por não ser preciso tocar).
- **R18-B — sinal = `EM_BREVE_MODE`**, só **lido** (`src/lib/leilaoLock.js:10`, continua `true`): enquanto ligado, nenhuma
  edição corre ⇒ estado vazio sempre e «Sem saldo» nunca.

## SEG0 — Vista de conformidade / dependências

- A vista de conformidade (early return) **não é tocada** (R18-A); continua a servir iOS/Android quando `isLeilaoAtivo=false`.
- O que o herói renderizava (`ComingSoonHero.jsx`): selo «Edição R-1», «EM BREVE» (Orbitron, pulsação), «Menor lance único vence · Art. 8».
- Estado vazio sem crash: o **CardLance** recebe exactamente as mesmas props de antes (`idEdicao="R-1"`, nunca vazio — não há
  edição «vazia» no código); a **TabelaLances** já trata `lances = []` («📭 Nenhum lance registrado ainda»). Nenhum componente
  precisou de mudar ⇒ sem extensão de escopo ao CardLance.

## SEG1 — Herói removido (o early return fica)

`src/components/glass/GlassHeader.jsx`: sai o `import ComingSoonHero` e o `<ComingSoonHero …/>`; a secção 2 fica com a frase
do mockup + o seletor de modo (o 108c.1 depende da `modalidade`); sai também a prop `edicao` do destructuring (só servia o
herói; o lint acusava `no-unused-vars` — introduzido por mim e corrigido). `ComingSoonHero.jsx` fica **sem consumidor** —
não apagado (fora do AUTORIZA estrito; candidato ao **108h**).

## SEG2 — Estado vazio (vidro)

- **Novo** `src/components/SemEdicaoAviso.jsx`: `GlassCard role="status"` com **«⏳ Nenhuma edição em andamento.»** +
  «Volte quando houver.». ⚠️ **Copy:** o enunciado dizia «Nenhuma edição **a decorrer**» — construção pt-PT («a» + infinitivo,
  a mesma família que a guarda do 107g.2 combate); usou-se a forma **pt-BR «em andamento»** (regra «pt-BR sempre»). Reversível.
- `src/pages/MercadoLances.jsx`: importa `EM_BREVE_MODE` e, no topo do `<main>` (mesmo sítio do «Sem saldo»):
  `{EM_BREVE_MODE ? <SemEdicaoAviso /> : mostrarAvisoSemSaldo({…}) && <SemSaldoBanner />}` ⇒ **os dois nunca juntos**.
  O aviso «Sem saldo» em si (função/componente) **não mudou**.
- ⚠️ **Resíduo declarado:** a pílula do prazo **«🕒 Em breve»** no cabeçalho da `TabelaLances` (`TabelaLances.jsx`, fora do
  AUTORIZA) continua visível. Não é o herói; fica para decisão do operador (um teste regista-a de propósito).

## SEG3 — Testes + mutação

| ficheiro | alteração |
|---|---|
| `src/pages/__tests__/utac108d-mlc-sempre.test.mjs` (**novo**, 12) | sem edição: o título «EM BREVE» não aparece; estado vazio 1×, em vidro, no topo do `<main>` antes do formulário; a vista real fica inteira (frase, seletor, formulário, tabela vazia) e não cai na conformidade; «Sem saldo» não aparece; **com edição:** sem estado vazio, «Sem saldo» com saldo 0, nenhum com saldo > 0, ordem lance → tabela → rodapé do 107d; **o que não mudou:** early return das lojas e esqueleto (fonte sem comentários), `EM_BREVE_MODE = true`, GlassHeader sem o herói; resíduo da pílula registado |
| `src/pages/__tests__/_stubs/leilaoLock.js` (**novo**) | duplo com a **mesma forma pública** do real; `EM_BREVE_MODE` em ligação viva + `definirEmBreve()` (o real é constante `true`: o ramo «com edição» seria inalcançável em teste) |
| `src/pages/__tests__/utac108c-mlc-aviso.test.mjs` (**actualizado**, declarado) | os casos do «Sem saldo» correm com edição (`EM_BREVE_MODE` desligado no duplo) + 1 caso novo: sem edição não há «Sem saldo» e há o estado vazio |
| `src/pages/__tests__/utac107d-mlc.test.mjs` | **sem alteração** — continua 9/9 (corre com o `EM_BREVE_MODE` real) |

Mutação `scripts/utac108d-prova-mutacao.mjs` (**novo**): **6/6 PROVADOS**, md5 restaurado — D1 herói de volta (2 RED) · D2 sem
estado vazio (2) · D3 os dois avisos juntos (1) · D4 estado vazio fora de vidro (1) · **D5 early return reintroduzido para «sem
edição» (4)** · D6 sinal deixa de ser o `EM_BREVE_MODE` (2). `scripts/utac108c-prova-mutacao.mjs`: âncora do **M12** actualizada
ao novo call site → de novo **14/14**.

⚠️ Erros dos meus instrumentos (declarados): (1) o 1.º arnês do 108d não tinha o duplo do router — 2 falhas por `useNavigate()`
fora de `<Router>`, não da página; (2) o mutante D1 ficou a citar a prop `edicao` que eu removi (morderia por crash, não pelo
«EM BREVE») e a 1.ª correcção via `sed` meteu aspas duplas dentro de string JS → o script não carregou (saída vazia, **nenhum
mutante aplicado**, md5 conferido); corrigido para `edicao={null}`; (3) o M12 do 108c ficou INVÁLIDO (âncora ausente) até ser
actualizado — o script declarou-o em vez de o contar como provado.

## SEG4 — Verificação

| verificação | resultado |
|---|---|
| Suíte canónica | **frontend 884/884** (= 871 + 13) · **backend 1095/1101** → VERDE |
| `vite build` (scratchpad) | exit 0 |
| Chunk do MLC construído | `MercadoLances-*.js` contém «Nenhuma edição em andamento»; «EM BREVE» = **0**; a classe `gut-hero-comingsoon` (herói) em **nenhum** chunk |
| ESLint dos 3 ficheiros | 0 problemas |
| Sem edição → vista real + estado vazio · sem «Sem saldo» | ✅ |
| Com edição → vista real + dados · «Sem saldo» com saldo 0 | ✅ |
| Early return das lojas / `EM_BREVE_MODE` / CardLance / backend / package* / `.bak-*` | intactos (diff: 8 ficheiros, +285/−7, só frontend + scripts) |

Commit do código: **`50a9223`** (local; push só depois do veredicto).

## SEG5 — Validador adversarial

Worktree próprio (`C:/Users/Moltbot/tmp-108d-val/wt` @ `50a9223`, helper A13). Veredicto verbatim: `_logs/UTAC108d_SEG5_VALIDADOR.md`.
**APROVADO COM RESSALVAS** — (a)–(j) **não refutados** (suíte 884/884 · 1095/1101; 108d 12/12, 108c 17/17, 107d 9/9;
mutação 6/6 e 14/14; duplo do `leilaoLock` fiel — o alias apanha também `utils/edicao.js`, ramo «com edição» coerente).

| achado | tratamento |
|---|---|
| ⚠️ A1 — os testes não mediam a VISIBILIDADE do estado vazio (5 mutantes sobreviviam: `display:none`, `hidden`, `opacity:0`, sem `role`, herói «Em breve» com CSS uppercase) | **FECHADO** (`a68ec46`): visibilidade medida nos ancestrais + «em breve» em qualquer caixa (só a pílula da tabela tolerada); mutação **6/6 → 11/11** (D7–D11) |
| ⚠️ A2 — com EM_BREVE ligado o CardLance continua activo por baixo de «Nenhuma edição em andamento» (já era assim com o herói) | **ESCALADO** — mexe no CardLance (fora do AUTORIZA) |
| ℹ️ A3 — pílula «🕒 Em breve» da tabela vem da fonte única `getEstadoEdicao`; o validador recomenda mantê-la | decisão do operador |
| ℹ️ A4 — comentários desactualizados + prop `edicao` morta no call site | **FECHADO** nos ficheiros autorizados; `leilaoLock.js:8` (fora do AUTORIZA) e `ComingSoonHero.jsx` sem consumidor → **108h** |
| ℹ️ A5 — «Menor lance único vence · Art. 8» saiu do ecrã com o herói | decisão do operador |

Correcções pós-veredicto **não re-validadas** (declarado). Suíte depois: **885/885 · 1095/1101 VERDE**; lint limpo; build OK.

## SEG6 — Deploy + registo

| verificação | resultado |
|---|---|
| Push | `1f00b30..a68ec46` (só os 2 commits do UTAC) |
| Espera do deploy | o poll em background foi **parado pelo Claude Code por falta de memória do sistema** (não por falha); verificação refeita em foreground mais tarde |
| Bundle antes → depois | `index-BZluhY9V.js` → **`index-BwrYbmL7.js`** · home 200 · health 200 |
| Chunk do MLC em produção | `MercadoLances-*.js` contém «Nenhuma edição em andamento» (1) e «EM BREVE» **0**; a classe do herói `gut-hero-comingsoon` em **0** chunks |
| `/mercado` aberto num browser | **NÃO feito** — exige aceitar o gate legal (LGPD/maioridade/cessão de imagem) em nome do operador (precedente MC99.2); verificação pelo código servido |
| `package-lock.json` | limpo |

**Custo:** validador 114 022 tokens = 2,3–228 ¢ (≈ 46 ¢ se tudo input; Opus 5.5 ¢/1M: 400 in · 2 000 out · 20 cache).
Sessão principal não medida. **Fecho:** FECHADO, com A2/A3/A5 escalados.
⚠️ **Nota posterior (UTAC108e, 2026-10-08):** o operador classificou o estado vazio solto como **erro** — o mockup pede o
**card da edição** em estado vazio. A correcção é desenhada no UTAC108e (mockups) e implementada num UTAC futuro (108e.1).
