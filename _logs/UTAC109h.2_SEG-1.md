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
| «nao deixe laranja, deixe apenas amarelo» | **uma só** cor de destaque: `#f5a623`; o laranja `#ff6b35` **não existe** em nenhum ponto |
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
