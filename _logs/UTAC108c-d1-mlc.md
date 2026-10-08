# UTAC108c — Correcção D-1: botão «Menor Lance Único» navega sempre

**Tipo:** produto (frontend) · **Executor:** Opus 5.5 (Claude Code) · **Data:** 2026-10-07
**Origem:** D-1 do manifesto `docs/aprovacoes-operador.md` §16 (UTAC108a), confirmada pela auditoria
`_logs/UTAC108b-auditoria-producao.md` como a **única** divergência com impacto visível.
**Decisão do operador (Opção A):** o botão navega sempre; o saldo verifica-se **no destino** (MLC).

---

## Baseline (SEG-1)

| medição | resultado | comando |
|---|---|---|
| HEAD | `3e4febe` | `git log --oneline -1` |
| origin/main | `3e4febe` (= HEAD, sem desvio do enunciado) | `git fetch; git log -1 origin/main` |
| Suíte canónica | **frontend VERDE 849/849 · backend VERDE 1095/1101 → VEREDITO: VERDE** (22:23→22:26) | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` (foreground) |
| Disco | 9,5 GB livres (≥ 5 GB) | `df -h /c` |
| Árvore rastreada | limpa (só `??` antigos de `_logs/MC100*`/`MC101*`, não são deste UTAC) | `git status --short` |
| 5 `.bak-*` | md5 guardado antes de tocar (scratchpad `bak-md5.txt`) | `md5sum $(git ls-files \| grep '\.bak-')` |
| D-1 no código | `MinhaCarteira.jsx:245` `disabled={!saldoReais}` · `:256` `title={!saldoReais ? "Deposite PIX primeiro" : …}` · `:253-254` cursor/opacidade condicionais | leitura |
| Destino | `MercadoLances.jsx` **não lê saldo nenhum** (nem `saldoRsCentavos`); nenhum aviso de saldo | leitura |
| Bloqueio da ACÇÃO de lance | **já existe**: `CardLance.jsx:101-104` `semSaldoRsFlash` (saldo R$ < valor) e `:99-100` `semFichas` entram em `desabilitado` (`:324-325`) | leitura |
| Semântica do saldo | `saldoRsCentavos`: `null` = não lido; status `idle \| loading \| ok \| stale \| error` (`AppContext.jsx:338-340`, `:1013-1040`) | leitura |

## SEG0 — Classificação

`grep -rn 'disabled={!saldo' src/ --include="*.jsx"` → **2** ocorrências (alargado a `disabled=.*saldo`: +1, de acção).

| Ficheiro:linha | Botão | Tipo | Decisão |
|---|---|---|---|
| `src/pages/MinhaCarteira.jsx:245` | «⚡ Menor Lance Único» → `navigate("/mercado")` | **navegação** | **remover `disabled`** (D-1) |
| `src/pages/CorporativoCarteira.jsx:214` | «Ir dar lances» → `navigate("/corporativo/mercado")` (lojista) | navegação | **NÃO tocar** — R18-B |
| `src/pages/CorporativoCarteira.jsx:211` | «Converter para licitar» (`converter()`, `saldoTroco < 1`) | **acção** | manter |
| `src/components/CardLance.jsx:324-325` | botão de dar lance (`semSaldoRsFlash`, `semFichas`, …) | **acção** | manter (é o bloqueio que o enunciado pede no destino; já existia) |

Nenhum `disabled` de segurança/permissão (role-based) encontrado no padrão → nada a escalar por isso.

### ⚠️ Ambiguidades levadas ao operador (GATE 12 / AU3) — respostas = R18

- **R18-A** (pergunta: o enunciado diz «saldo 0 **ou null**», mas `null` = «ainda não lido» — sem login,
  a carregar ou erro; o aviso seria uma afirmação falsa). **Resposta do operador: «Só saldo lido = 0».**
  O aviso aparece só com login feito, saldo **lido** (`ok`/`stale`) e igual a R$ 0,00.
- **R18-B** (pergunta: `CorporativoCarteira.jsx:214` é navegação do **lojista**, que sai no 108f; e no
  MLC do lojista o saldo que conta são senhas on-chain, não R$). **Resposta do operador: «Não tocar;
  aviso só no comum».** `CorporativoCarteira.jsx` fica intacta; o aviso não aparece a contas corporativas.

Veredito SEG-1/SEG0: **SEGUIR** (com R18-A e R18-B).

---

## SEG1 — `disabled` removido

`src/pages/MinhaCarteira.jsx` (botão «⚡ Menor Lance Único», agora `:241-258`):
- **saiu** `disabled={!saldoReais}`;
- **saíram** `cursor: !saldoReais ? "not-allowed" : "pointer"` e `opacity: !saldoReais ? 0.5 : 1` (sem isto o
  botão continuaria a *parecer* desactivado);
- `title` condicional («Deposite PIX primeiro» / «Abre o Mercado…») → texto neutro **«Ir para o Menor Lance Único»**;
- comentário de decisão no sítio.
`saldoReais` continua a ser usado (mostra o saldo, `:197-199`). Destino `/mercado` inalterado (`irParaMenorLanceUnico`).
Outros botões de navegação com o padrão: **nenhum alterado** (o único, `CorporativoCarteira.jsx:214`, fica por R18-B).

## SEG2 — Mensagem no destino

- **Novo** `src/components/SemSaldoBanner.jsx`: `mostrarAvisoSemSaldo({isConnected, saldoRsCentavos, saldoRsStatus,
  tipoProvavel})` (pura, sem coerção: só o **número 0** com status `ok`/`stale`, `isConnected === true`, e
  `tipoProvavel !== "corporativo"`) + componente `<GlassCard role="status">` com **«⚠️ Sem saldo. Carregar agora?»** e
  botão **«Carregar PIX →»** → `navigate("/carteira")` (44 px, navy `#0a0f1a` sobre `#ff9500`).
- `src/pages/MercadoLances.jsx`: lê `saldoRsCentavos, saldoRsStatus, tipoProvavel` do contexto e renderiza o aviso
  como **1.º filho do `<main>`** (antes do formulário do lance). **Não esconde nada**: cabeçalho da edição, CardLance,
  badge, etiqueta e tabela continuam montados. A acção de lance já estava bloqueada (`CardLance.jsx:101-104`
  `semSaldoRsFlash` → `desabilitado` `:324-325`) — **não tocada**.
- Mecânica escolhida para não partir arnêses: a **decisão** vive no MercadoLances (sem router); o `useNavigate` só é
  chamado dentro do banner, que só monta quando há aviso ⇒ os arnêses do 107d/0010/0015 (sem `<Router>`) não rebentam.
- Na build das lojas (`isLeilaoAtivo=false`) a página mostra a vista de conformidade e o aviso não aparece (igual
  a todo o resto do MLC — limite herdado do MC29.1).

## SEG3 — Testes + mutação

| ficheiro | testes | o que prova |
|---|---|---|
| `src/__tests__/utac108c-carteira-mlc.test.mjs` | 6 | Carteira REAL (arnês do 106c): com saldo **0 / null-loading / null-error** o botão **não tem `disabled`**, não tem cursor `not-allowed` nem opacidade 0,5, e o clique navega para **`/mercado`**; controlo com saldo 12,34; `title` neutro; os outros 3 botões da grelha também clicáveis com saldo 0 |
| `src/pages/__tests__/utac108c-mlc-aviso.test.mjs` | 12 | função pura nas 3 direcções (positivo 0 ok/stale · negativo >0 · desconhecido/ inválido sem coerção) + R18-B; **página REAL** do MLC: aviso aparece 1×, **dentro de vidro**, **antes** do formulário, e cabeçalho/formulário/tabela continuam lá; desaparece com saldo > 0; sem aviso a carregar/sem login/corporativo; clique de «Carregar PIX» → **`/carteira`** |

Nota de instrumento: a prova do Carteira mede a **prop `disabled`** do elemento — o `clicar()` do arnês chama o
`onClick` directamente e, sozinho, passaria mesmo com o botão desactivado.

**Mutação** (`scripts/utac108c-prova-mutacao.mjs`, versionado — extensão de escopo declarada, padrão da série;
confirma que cada mutante ENTROU e restaura com md5 idêntico): **7/7 PROVADOS (RED)**

| id | mutante | resultado |
|---|---|---|
| M1 | reintroduzir `disabled={!saldoReais}` | RED (3 falhas: saldo 0, a carregar, erro) |
| M2 | remover a mensagem do MLC | RED (3) |
| M3 | aviso com saldo desconhecido (`!saldoRsCentavos`) — viola R18-A | RED (2) |
| M4 | «Carregar PIX» → `/mercado` | RED (1) |
| M5 | aviso a contas corporativas — viola R18-B | RED (2) |
| M6 | aviso fora de vidro (`div` em vez de `GlassCard`) | RED (1) |
| M7 | o aviso passa a esconder o formulário do lance | RED (1) |

md5 antes = depois: MinhaCarteira `7e861bbd…`, MercadoLances `84047c9c…`, SemSaldoBanner `fe77a644…`.

## SEG4 — Verificação ponta a ponta

| verificação | resultado | comando |
|---|---|---|
| Suíte canónica | **frontend VERDE 867/867** (= 849 + 18) · **backend VERDE 1095/1101** → VERDE | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| `vite build` | ✓ 14,87 s (para o scratchpad, **não** para o `dist/` do APK) | `npx vite build --outDir <scratchpad>` |
| Chunk da Carteira (`MinhaCarteira-*.js`) | `title:"Ir para o Menor Lance…"` sem `disabled` no botão; «Deposite PIX primeiro» = **0** | grep no bundle |
| Chunk do MLC (`MercadoLances-*.js`) | contém «Sem saldo. Carregar agora?» e `/carteira` | grep no bundle |
| Controlo positivo do grep | o chunk do lojista ainda tem `disabled:!…` («Ir dar lances», R18-B) ⇒ o grep vê `disabled` quando existe | grep no bundle |
| Botão clicável com saldo 0 → `/mercado` | ✅ (teste M1) | — |
| MLC mostra o aviso com saldo 0; «Carregar PIX» → `/carteira` | ✅ | — |
| Backend / `.bak-*` / package* / `EM_BREVE_MODE` | intactos (diff só nos 6 ficheiros do commit) | `git diff --stat 3e4febe` |

Commit do código: **`dcb4f43`** (local; push só depois do veredicto do validador).
Bundle de produção **antes** do deploy: `assets/index-Ci4XuUO-.js` (home 200).

## SEG5 — Validador adversarial

Subagente independente, worktree próprio (`C:/Users/Moltbot/tmp-108c-val/wt` @ `dcb4f43`, helper A13), instruído a
**refutar**. Veredicto verbatim: `_logs/UTAC108c_SEG5_VALIDADOR.md`.

**Veredicto: APROVADO COM RESSALVAS · 0 achados graves (⚠️).** As 12 alíneas (a)–(l) resistiram; R18-A e R18-B sem
defeito. Suíte medida por ele: 867/867 · 1095/1101; o script de mutação dele confirmou 7/7 e que muta o worktree, não o
repo principal. Dos 15 mutantes próprios, **8 morreram e 7 sobreviveram**: todos lacunas de TESTE, nenhum defeito no código.

| achado | tratamento |
|---|---|
| ℹ️ N1 — os testes só mediam `disabled`/opacidade/cursor; o teste do banner chamava `onClick()` sem ver `disabled` (V3, V4, V5, V10, V11, V13) | **FECHADO** (`1e18792`): Carteira e «Carregar PIX» passam a exigir `!disabled`, `!hidden`, `pointerEvents !== "none"`, `display !== "none"`; o aviso inteiro também |
| ℹ️ N2 — aviso fora do `<main>` passava (V7) | **FECHADO**: o aviso tem de vir depois de `<main` |
| ℹ️ N3 — o aviso ignora a modalidade: em «Programado» o lance usa senhas; R$ 0 com senhas > 0 vê «Sem saldo» mas consegue licitar | **ESCALADO ao operador** (decisão de produto: `modalidade !== "programado"` ou considerar `saldoSenhas`). Não é regressão: o gate antigo da Carteira também só olhava R$. Não bloqueia |
| ℹ️ N4 — `stale` do cache de arranque com 0 mostra o aviso alguns segundos após um depósito noutro aparelho | aceite (coberto por R18-A) |
| ℹ️ N5 — o defeito de UX continua no lojista (`CorporativoCarteira.jsx:214`) | por R18-B; o **UTAC108f** tem de o tratar (ou apagá-lo com o lojista) |

Mutação depois do fecho: **12/12 PROVADOS** (M8 = V4 · M9 = V5 · M10 = V10 · M11 = V11 · M12 = V7), md5 restaurado.
V3 e V13 ficam cobertos pelas mesmas asserções (`display`/`pointerEvents`), sem mutante próprio no script. As correcções
pós-veredicto **não passaram por 2.ª ronda** do validador (declarado). Suíte re-corrida: **867/867 · 1095/1101 VERDE**.
Worktree removido pelo helper (`"ok": true`); `node_modules` reais funcionais (teste re-corrido 12/12).
⚠️ Erro do meu instrumento: a 1.ª edição do script de mutação perdeu os escapes `\n` (viraram quebras reais) → `SyntaxError`
ao carregar; **nenhum mutante chegou a ser aplicado** (md5 conferido) e foi corrigido com o Edit tool.

## SEG6 — Deploy + registo

| verificação | resultado |
|---|---|
| Push | `3e4febe..1e18792` (só os 2 commits do UTAC; «Bypassed rule violations» conhecido) |
| Bundle **antes** | `assets/index-Ci4XuUO-.js` |
| Bundle **depois** (auto-deploy Git) | `assets/index-CRWGSol9.js` · home **200** · `health` **200** |
| Chunk da Carteira `MinhaCarteira-C_FmRtxy.js` | «Ir para o Menor Lance» **1** · «Deposite PIX primeiro» **0** |
| Chunk do MLC `MercadoLances-BUfxxtJM.js` | «Sem saldo. Carregar agora?» **1** · «Carregar PIX» presente |
| Controlo positivo | `CorporativoCarteira-7s9EX7-m.js` ainda tem `disabled:!…` (R18-B) ⇒ o grep vê `disabled` quando existe |
| Chunks servidos como | `application/javascript` (não o `index.html` do catch-all) |
| `package-lock.json` | **não sujo** (o deploy foi pelo Git, sem build local) |

**Custo:** validador **115 615 tokens** = 2,3–231 ¢ (≈ 46 ¢ se tudo input; tarifa Opus 5.5 em ¢/1M: 400 in · 2 000 out ·
20 cache). Sessão principal **não medida** com precisão (usar `/cost`). **Duração:** ≈ 35 min (HI5 = 2 h — dentro).

## Entrega final

[x] botão MLC sem `disabled` · [x] navega para `/mercado` com saldo 0 · [x] «Sem saldo. Carregar agora?» no MLC (saldo
lido 0) · [x] «Carregar PIX» → `/carteira` · [x] desaparece com saldo > 0 · [x] outros botões de navegação: o único
(lojista) mantido por R18-B · [x] acção (CardLance) e segurança intactos · [x] testes + mutação 12/12 · [x] suíte verde ·
[x] `vite build` · [x] backend não tocado · [x] 5 `.bak-*` intactos · [x] `EM_BREVE_MODE = true` · [x] validador +
veredicto · [x] deploy verificado · [x] `package-lock` limpo · [x] 3 registos · [x] commit + push · [x] custo.

**Pendências:** N3 (modalidade Programado — decisão do operador) · lojista (108f) · correcções N1/N2 não re-validadas.
