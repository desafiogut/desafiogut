# UTAC109h.2 — SEG-1 · MEDIÇÃO E DESENHO DA MUDANÇA

**Data:** 2026-10-09 · **Executor:** Hermes (DeepSeek) · **Spec:** `_logs/UTAC109h.2.spec.yml`
**Baseline:** `6d62637` (= fecho do UTAC109h, em produção) · **Alvo do revert:** `1a41cf7` (o estado anterior ao 109h)

## -1.1 A decisão do operador (verbatim)

> «o layout mudou, nao era pra ter mudado, volte ao anterior, era somente a cor, e nao deixe laranja,
> deixe apenas amarelo, no tom que ja temos no app, como o amarelo do botao palpite, quero esse tom»

Isto **reverte o R18-A/B/C** do UTAC109h (o 109h tinha decidido, por R18-A, um cabeçalho novo «no estilo da
OP» e, por R18-B, mover Comprar Passe/MLC/OP/senhas para um 2.º vidro). O 109h está **fechado e em produção**
⇒ decisão nova, UTAC novo (109h.2), com o commit do 109h **intocado**.

## -1.2 ⚠️ ÂMBITO ESCOLHIDO SEM CONFIRMAÇÃO (declarado)

Perguntei ao operador qual dos 3 âmbitos queria; **não respondeu em tempo** e a instrução foi «usa o teu
melhor juízo». Escolhi a **leitura literal** das palavras dele:

| Leitura | Decisão |
|---|---|
| «volte ao anterior» | repor o ecrã **exactamente** como em `1a41cf7` (layout, tamanhos, 1.º vidro com tudo, 4 estilos de botão) |
| «era somente a cor» | a **única** diferença face a `1a41cf7` é cor (provado em §-1.3) |
| «nao deixe laranja, deixe apenas amarelo» | **uma só** cor de destaque: `#f5a623`; o laranja `#ff6b35` **não existe** em nenhum ponto ⚠️ **REFUTADO repo-wide — ver errata E1** |
| «no tom que ja temos no app, como o amarelo do botao palpite» | `COR.gold = "#f5a623"` — medido: o botão «Dar palpite» usa `background: COR.gold` em `Dashboard.jsx:462` e `OfertasProgramadas.jsx:153`; o próprio `glassTokens.js` nota que `#f5a623` é «o dos mockups aprovados e de 56 ficheiros de src/» |

**Não escolhi** a variante «manter o layout novo e só trocar o laranja» (opção 3), porque contradiz
«volte ao anterior». Se o operador queria essa, é um `git revert` deste commit.

## -1.3 PROVA de que a mudança é SÓ de cor (o ponto crítico)

`git diff 1a41cf7 -- <ficheiro>` linha a linha, com um detector de cor
(`#[0-9a-f]{3,8}` / `rgba(...)` / nomes de cor):

| Ficheiro | linhas removidas | **removidas SEM qualquer cor** |
|---|---|---|
| `src/pages/MinhaCarteira.jsx` | 7 | **0** |
| `src/components/PainelIndicacao.jsx` | 10 | **0** |

⇒ **Todas** as linhas que a mudança remove são linhas de cor. As linhas **adicionadas** a mais são o
comentário-cabeçalho desta decisão (4 linhas em `MinhaCarteira`, 3 em `PainelIndicacao`). Nenhum tamanho,
padding, gap, ordem, estrutura ou texto mudou. `numstat` vs `1a41cf7`: `11/7` e `13/10`.

## -1.4 Mapa de cores (antes → depois)

| Onde | Antes (1a41cf7) | Depois |
|---|---|---|
| `MinhaCarteira` `COR.primary` / `gold` | `#f5a623` | `#f5a623` (sem mudança) |
| `MinhaCarteira` `COR.blue300` (era o 2.º amarelo) | `#fbbf24` | **`#f5a623`** |
| `MinhaCarteira` `COR.pix` (botão Depositar PIX) | `#00d4ff` (ciano) | **`#f5a623`** |
| `MinhaCarteira` `COR.success` / `purple` | `#10b981` / `#a78bfa` | **`#f5a623`** / **`#f5a623`** |
| `MinhaCarteira` botão primário | `linear-gradient(135deg,#f5a623,#e89400)` | **`#f5a623`** (tom único) |
| `MinhaCarteira` PIX (fundo/borda) | `rgba(0,212,255,.14)` / `.4` | `rgba(245,166,35,.14)` / `.4` |
| `MinhaCarteira` `danger` / texto sobre dourado | `#ef4444` / `#0a0f1a` | **iguais** (erro é semântico) |
| `PainelIndicacao` `COR.primary` | `#00d4aa` (verde-água) | **`#f5a623`** |
| `PainelIndicacao` botão Copiar | `linear-gradient(135deg,#00d4aa,#0aa37e)` + texto `#04080f` | **`#f5a623`** + texto `#04080f` |
| `PainelIndicacao` `success` / `blue300` | `#10b981` / `#fbbf24` | **`#f5a623`** / **`#f5a623`** |
| `PainelIndicacao` tingidos (`primaryDim`, `border`, `boxShadow`, caixa, chips) | `rgba(0,212,170,…)` / `rgba(16,185,129,…)` | `rgba(245,166,35,…)` |
| `PainelIndicacao` erro | `#ef4444` | **igual** |

**Cores proibidas vivas (comentários removidos) = 0 nos dois ficheiros**: `#ff6b35`, `#00d4ff`, `#00d4aa`,
`#0aa37e`, `#10b981`, `#fbbf24`, `#a78bfa`, `#e89400`, `rgb(0,212,255)`, `rgb(0,212,170)`, `rgb(16,185,129)`.
⚠️ Um `grep` **cru** encontra 5 dessas em `MinhaCarteira` e 1 em `PainelIndicacao` — são as citações dentro
do **comentário-cabeçalho** que declara o que saiu (a armadilha documentada no §17 da skill).

## -1.5 Contraste WCAG AA (recalculado, com controlo negativo)

| Par | Razão |
|---|---|
| amarelo `#f5a623` sobre o vidro `#0c1131` | 9,09:1 |
| amarelo sobre o **tingido** do botão PIX (`rgba(245,166,35,.14)` sobre o vidro ≈ `#2d262f`) | **7,25:1** |
| navy `#0a0f1a` sobre o CTA dourado cheio | 9,45:1 |
| vermelho `#ef4444` sobre o vidro | 4,89:1 |
| **CONTROLO NEGATIVO:** branco `#ffffff` sobre `#f5a623` | **2,03:1 (reprova AA)** ← é o par que o `ON_GOLD` evita |

## -1.6 Testes e mutação

| Peça | O que ficou |
|---|---|
| `utac106c-carteira.test.mjs`, `utac106c-carteira-render.test.mjs`, `mc99-limpeza-ui.test.mjs` | **repostos ao conteúdo de `1a41cf7`** (contratos do layout anterior). Medido antes de restaurar: os 3 só fixam `#f5a623`, `#0a0f1a` e `#6b7db8` — cores que **sobrevivem** à unificação ⇒ não foi preciso tocar-lhes. |
| `src/__tests__/utac109h-carteira.test.mjs` (nascido no 109h) | **REMOVIDO** — o seu sujeito (o redesenho) reverteu; mantê-lo daria suíte vermelha. Registado aqui e no log do fecho. |
| `src/__tests__/utac109h2-carteira.test.mjs` (novo) | **9 testes**: (1) cor única sem nenhuma proibida; (1b) **token a token** do `COR` (esta asserção nasceu de uma lacuna: o mutante **M9 sobreviveu** enquanto o teste só exigia *algum* `#f5a623`); (2) erros vermelhos; (3) layout revertido (sem `data-vidro`/`TAM_*`/`data-testid` novos, 2 `GlassCard`, título 0,85/0,88 rem, valor 2,4/3 rem); (4) os 4 botões no MESMO vidro; (5) 48 px e ↻ 48×48; (6) contraste com controlo negativo; (7) copy visível inalterada; (8) `ON_GOLD`. |
| `scripts/utac109h2-prova-mutacao.mjs` (novo) | **10 mutantes, 10/10 PROVADOS** (lote 1: M1 ciano, M2 paleta retirada, M3 laranja, M4 verde-água, M5 gradiente de 2 tons — todos RED; lote 2: M6 texto branco no CTA, M7 título do 109h, M8 erro não-vermelho, M9 `gold`→neutro, M10 botões a 44 px). Restauro por md5 idêntico. |

## -1.7 Medições

| Prova | Resultado |
|---|---|
| Suíte canónica (RAM livre **1 504 MB** ≥ 1 500, A14) | **frontend VERDE 970/970** (961 repostos + 9 novos) · **backend VERDE 1095/1101** · `VEREDITO: VERDE` |
| Mutação | **10/10 PROVADOS**, restauro md5 idêntico |
| Diff vs `1a41cf7` | linhas removidas sem cor = **0** (§-1.3) |
| Ordem de grandeza | 970 = 961 (o valor do frontend **antes** do 109h) + 9 novos ⇒ os 13 testes do 109h saíram com o teste que os continha |

## ⚠️ Limites declarados (não são regressões deste UTAC — o revert repõe-nos de propósito)

1. **`PainelIndicacao` sem `minHeight` nos botões** («📋 Copiar código» / «📤 Compartilhar») — medidos em
   **44-45 px** no SEG-1 do UTAC109h, abaixo dos 48 px. Vinha do estado anterior e o revert repõe-no.
2. **4 estilos de botão** na Carteira (não os 3 padronizados do 109h) — decisão de layout, revertida.
3. **`R$ 12.50` com ponto** (`toFixed(2)`) — pré-existente.
4. Não houve **medição no browser** nesta frente (decisão de escopo: a mudança é de cor e está provada por
   leitura do código + contraste recalculado; o validador pode fazê-lo se tiver recursos).
5. **A interpretação do âmbito não foi confirmada pelo operador** (§-1.2) — declarada como risco.

## Veredicto

**SEGUIR** para commit local → validador adversarial → fecho em 3 lugares → push. O revert é
`git revert`ável num só commit se o operador quiser a leitura oposta.

## Adenda SEG-1b — correcções pedidas pelo validador (1.ª ronda) e prova no ambiente que as expôs

O validador da 1.ª ronda (`_logs/UTAC109h.2_SEG4_VALIDADOR.md`) deu **APROVADO COM RESSALVAS — 1
bloqueante**, e o bloqueante era **real**: a minha guarda nova era **frágil ao fim de linha**.

| Achado | O que era | Correcção (commit `f509e21`) |
|---|---|---|
| **F1 ⚠️ (bloqueante)** | O teste novo usava `\n` nos regex multi-linha e o `.gitattributes` **não** fixa `*.jsx` a LF ⇒ num worktree/clone limpo (fonte **CRLF**) dava **2 falhas** (testes 5 e 8); 9/9 só com fonte LF. | `ler()` que normaliza `\r\n` → `\n` na leitura dos dois componentes. |
| **F2 ⚠️ (mesma raiz)** | No worktree CRLF a baseline já tinha 2 RED ⇒ os mutantes **M6/M10 reportavam 2 RED = igual à baseline**: prova **VACUOSA**. O mutador não exigia baseline verde. | O mutador passa a **exigir `fail == 0` antes de mutar** (aborta com exit 2 e «BASELINE VERMELHA») e a exigir `fail > baseline` em cada mutante. |
| **F8 ℹ️** | O comentário-cabeçalho do `PainelIndicacao.jsx` ficou **mutilado pela minha própria substituição de cor**: dizia «Saíram o verde-água `#f5a623`, o gradiente `#0aa37e`, o verde `#f5a623` e o `#f5a623`». | Corrigido para `#00d4aa` / `#0aa37e` / `#10b981` / `#fbbf24`. |
| **F3/F4 ℹ️** | «0 ocorrências» e «tom único» sem **escopo** ⇒ literalmente falsos repo-wide (as cores retiradas vivem em `glassTokens.js`, `globals.css`, `OfertasProgramadas.jsx`) e as **modais** da Carteira mantêm o gradiente de 2 tons `#f5a623→#e89400`. | Nota de **ESCOPO** acrescentada aos dois ficheiros: «uma só cor» vale para as **duas peças** do ecrã; modais e tokens globais **ficam como estavam** (fora do âmbito). Detalhe em §Pendências. |
| **F5 ℹ️** | Redacção: o git registou **1 D** (teste) + **1 R052** (mutador **renomeado**, 52 % de similaridade) — não 2 remoções. | Corrigido neste log. |
| **F7 ℹ️** | O número de RAM «1 504 MB» era o **da minha execução**; o validador mediu 1 169 e 1 493 (momentos diferentes). | Registado abaixo como valor **por execução**, não como constante. |

### Prova no WORKTREE NOVO com fonte CRLF (o ambiente que expunha o defeito) — o que o validador exigiu
```
worktree @ f509e21 (junctions A13)
  EOL da fonte:  MinhaCarteira.jsx -> CRLF: 405 | LF soltas: 0
  teste isolado: ℹ tests 9 · ℹ pass 9 · ℹ fail 0            <- era 7/9 antes da correcção
  mutador lote 1: baseline do teste: fail=0 · M1..M5 PROVADO (1-2 RED > baseline 0) · MUTAÇÃO 5/5
  mutador lote 2: baseline do teste: fail=0 · M6..M10 PROVADO (1-2 RED > baseline 0) · MUTAÇÃO 5/5
  suíte canónica: frontend VERDE 970/970 · backend VERDE 1095/1101 · VEREDITO: VERDE   (14:15-14:18)
```
⇒ fecha também o limite «a suíte canónica correu só no main tree» que o validador declarou.

### Incidente de arrumação (worktree) — medido, sem dano
`worktree-helper.mjs remover` devolveu **`Permission denied`** (o helper **recusou forçar**, como manda a A13:
«o `git recusou/falhou remover e NÃO há prova de que está limpo»). O `git` **já tinha desregistado** o worktree e
o que ficou no disco era uma pasta **VAZIA** (conteúdo e junctions já apagados) ⇒ `rmdir /s /q` só do directório
vazio. **Prova de que as junctions não foram seguidas:** `node_modules` real **498 / 414 antes e depois**.
O excesso de RAM era meu: `bash` da própria sessão (cwd dentro do worktree) segurava o directório.

## Pendências novas (declaradas, não corrigidas — fora do âmbito autorizado)

| # | Pendência | Evidência |
|---|---|---|
| **P-109h.2-1** | **As modais da Carteira mantêm as cores retiradas**: `ComprarFichasModal.jsx:266` e `ComprarPasseModal.jsx:77` usam `linear-gradient(135deg,#f5a623,#e89400)` e o `COR` local lista `#fbbf24`/`#10b981`/`#a78bfa`. Herdado (nem `93e17ac` nem `f509e21` tocaram nesses ficheiros) e **fora do R18-C do 109h** («modais fora»). **Decisão do operador:** se «apenas amarelo/tom único» deve valer também para as modais e para os tokens globais (`glassTokens.js:7` `primary:"#ff6b35"`, `globals.css` tokens laranja), é UTAC próprio. | validador ℹ️ F4 |
| **P-109h.2-2** | **Dois worktrees órfãos registados no repo**, de outros executores — nenhum com commits fora do `main`: (a) `C:/Users/Moltbot/AppData/Local/Temp/claude/C--Users-Moltbot/ffd22ecc-…/scratchpad/wt-94` @ `e3d8791` — **1 414 edições locais** (apagamento de `.agents/skills/**`), 689 KB, 0 commits próprios; (b) `C:/Users/Moltbot/tmp-109h-val/wt` @ `93e17ac` — **limpo** (0 edições, 0 commits), 93 MB. **Não limpei** (arrumação em UTAC alheio segue a regra do operador: saneamento em UTAC próprio; e a A13 manda arquivar antes de apagar). | `git worktree list` |
| **P-109h.2-3** | Os botões do `PainelIndicacao` («📋 Copiar código»/«📤 Compartilhar») continuam **sem `minHeight`** (44-45 px, < 48) — o revert repõe o estado anterior de propósito; o validador confirmou o limite como **verdadeiro**, não como defeito novo. | validador alegação 12 |
| **P-109h.2-4** | O número de RAM é **por execução** (1 504 na minha; 1 169/1 493 nas do validador) e a suíte deu VERDE **abaixo** de 1 500 numa das corridas ⇒ reforça a **A14 a medir depois de estabilizar**, não no instante. | validador ℹ️ F7 |

## SEG4 — validador adversarial (1.ª e 2.ª ronda)

**1.ª ronda** (`_logs/UTAC109h.2_SEG4_VALIDADOR.md`, alvo `11f6416`): **APROVADO COM RESSALVAS — 1
bloqueante.** O conteúdo resistiu (revert fiel só-de-cor, 3 contratos byte-iguais a `1a41cf7`,
contrastes ao centésimo, suíte verde); o bloqueante era da **reprodutibilidade da própria guarda**.
**2.ª ronda** (`_logs/UTAC109h.2_SEG4b_VALIDADOR.md`, alvo `f509e21` = a correcção): **APROVADO COM
RESSALVAS — 0 bloqueantes.** As 6 alegações da correcção resistiram; o validador **atacou o guarda**
(teste deliberadamente vermelho ⇒ `BASELINE VERMELHA` + exit 2, sem PROVADOS) e **fechou o limite** que
ele próprio tinha declarado (suíte canónica **no worktree CRLF**: 970/970 · 1095/1101).

### Resposta do executor às ressalvas (ressalva → tratamento)
| # | Ronda | Tratamento nesta passagem |
|---|---|---|
| **F1/F2** | 1.ª | ⚠️ **BLOQUEANTE — FECHADO.** `ler()` normaliza `\r\n`; mutador exige baseline verde. **Provado no worktree CRLF**: 9/9, baseline 0, 10/10, suíte 970/970. |
| **F8** | 1.ª | FECHADO — o comentário do `PainelIndicacao` deixa de citar `#f5a623` onde deviam estar `#00d4aa`/`#10b981`/`#fbbf24`. |
| **F3/F4** | 1.ª | FECHADO como **escopo** (nota nos 2 ficheiros, «as duas peças do ecrã»); o resto vai a pendência **P-109h.2-1**. |
| **F5** | 1.ª | FECHADO na redacção («1 `D` + 1 `R052` = renomeado»). |
| **F6** | 1.ª | Nada a fazer — o detector declarado **já incluía nomes de cor** (reconhecido pelo validador na 2.ª ronda, R6). |
| **F7 / R4** | 1.ª/2.ª | A RAM passa a ser reportada **por execução** e **não** como prova — o harness não tem gate de RAM. |
| **R1** | 2.ª | **Dívida declarada**: o `.gitattributes` continua **sem** `*.jsx/.tsx/.css text eol=lf` ⇒ a guarda ficou EOL-tolerante **no leitor**, não na causa-raiz. Mudar a política de EOL do repo é **higiene de repo** ⇒ UTAC próprio (regra do operador: saneamento em UTAC próprio). |
| **R2/R3** | 2.ª | FECHADO nesta passagem: a adenda SEG-1b **vai commitada** e a frase refutada ficou **à vista, marcada** (errata E1). |
| **R5** | 2.ª | Assinalado: o mutador prova «**algum** teste ficou RED (delta > baseline)», não «a asserção visada». Rigor para UTAC futuro; os 10 mutantes são distintos e o validador não encontrou contaminação cruzada. |
| **R7** | 2.ª | Cosmético: o cabeçalho cita só o 2.º stop do gradiente (`#0aa37e`), que era `#00d4aa→#0aa37e`. Sem impacto. |

## Errata (pós-veredicto) — a versão errada fica À VISTA, marcada

**E1 — «o laranja `#ff6b35` não existe em nenhum ponto» (§-1.2, linha marcada acima).** O texto original
**fica à vista**. O validador **refutou-o repo-wide** (2.ª ronda, medição 7; também a 1.ª ronda, F3): com
strip de comentários sobre `frontend/src` (**283 ficheiros visitados**) o `#ff6b35` aparece **18×**, o
`#fbbf24` **52×**, o `#10b981` **35×**, o `#00d4ff` **11×**, o `#e89400` **9×** — por exemplo em
`components/glass/glassTokens.js:7`, `globals.css` (tokens laranja) e `OfertasProgramadas.jsx:48`. A frase
correcta é a de **§-1.4**: «0 nas **duas peças** do ecrã» (Carteira + Indique e Ganhe). É a mesma classe
de erro que a série já pune: **um «0» sem escopo declarado é uma alegação falsa**, mesmo quando o facto
escopado é verdadeiro.

## Custo e fecho
- **Executor:** Hermes (DeepSeek). **Baseline:** `6d62637` · **Commits:** `11f6416` (revert + cor única) →
  `f509e21` (correcção do bloqueante) → **este commit** (fecho: logs, relatório, R14).
- **Custo:** sessões lidas no `state.db` do Hermes; **saldo da API NÃO LIDO** (R5 proíbe tocar em credenciais).
  Valores no relatório do Desktop (`Desktop/RELATORIO-UTAC109h.2-CARTEIRA-REVERT.txt`).
