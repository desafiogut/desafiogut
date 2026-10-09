# UTAC109h — SEG4 · VEREDICTO DO VALIDADOR ADVERSARIAL

**Validador:** Hermes (subagente independente) · **Data:** 2026-10-09
**Alvo:** commit LOCAL `93e17ac989c37ab7dbd0181b198e0a7c04885731` (pai `1a41cf7`, não empurrado).
**Método:** worktree próprio no sha (`scripts/worktree-helper.mjs`, A13), só leitura no main tree; script de mutação re-corrido por mim; razões WCAG recalculadas do zero; geometria medida nos PNG por análise de pixels.

## Veredicto

**APROVADO COM RESSALVAS — 0 bloqueantes.**

## Reproduzido por execução (pelo validador)

| # | Comando (bash, da raiz do repo) | Saída REAL (verbatim, resumida) |
|---|---|---|
| 1 | `git log --oneline -3` | `93e17ac feat(UTAC109h): Carteira com 2 cores…` / `1a41cf7 docs(UTAC109g)…` — HEAD=93e17ac, `git rev-parse origin/main`=1a41cf7 (não empurrado) |
| 2 | `git diff 1a41cf7..93e17ac --name-only` | **exactamente 7 ficheiros**: `MinhaCarteira.jsx`, `PainelIndicacao.jsx`, `__tests__/utac109h-carteira.test.mjs` (novo), `__tests__/utac106c-carteira.test.mjs`, `__tests__/utac106c-carteira-render.test.mjs`, `pages/__tests__/mc99-limpeza-ui.test.mjs`, `scripts/utac109h-prova-mutacao.mjs` (novo). Zero fora de `frontend/src` e `scripts/utac109h-*` |
| 3 | `git diff --stat 1a41cf7..93e17ac` | `7 files changed, 507 insertions(+), 188 deletions(-)` |
| 4 | `node scripts/worktree-helper.mjs criar …/utac109h-val/wt 93e17ac` | criou worktree com 4 junctions (`node_modules`, `desafio-gut/node_modules`, `frontend/node_modules`, `frontend/netlify/functions/node_modules`) |
| 5 | `node scripts/utac109h-prova-mutacao.mjs` (no MEU worktree) | `M1…M12: PROVADO`; `restauro MinhaCarteira.jsx: md5 idêntico` · `restauro PainelIndicacao.jsx: md5 idêntico` · **`MUTAÇÃO 12/12 PROVADOS`**, `EXIT=0`; `git status --porcelain` no worktree → **vazio** |
| 6 | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` (foreground) | **`frontend: VERDE 974/974 pass`** · **`backend: VERDE 1095/1101 pass`** · `VEREDITO: VERDE` (RAM livre medida antes: **1553 MB ≥ 1500**, A14 satisfeita) |
| 7 | `for f in GlassHeader.jsx CartaoEdicao.jsx Dashboard.jsx MercadoLances.jsx TabelaLances.jsx OfertasProgramadas.jsx glassTokens.js; do git diff --stat 1a41cf7..93e17ac -- "$f"; done` | **UNCHANGED** em todos (7/7) |
| 8 | grep de hex/rgb nos 2 componentes **com comentários removidos** (replicando o `codigo()` do teste) | MinhaCarteira: `#ff6b35 #f5a623 #e8f0fe #6b7db8 #ef4444 #0a0f1a` + `rgba(239,68,68`. PainelIndicacao: `#ff6b35 #f5a623 #e8f0fe #94a3b8 #ef4444 #0a0f1a` + `rgba(255,107,53` `rgba(3,15,36` `rgba(245,166,35`. **forbidden found: []`** nos dois |
| 9 | Recálculo WCAG próprio (sRGB→lum→(L1+0,05)/(L2+0,05)) | laranja/vidro **6,50:1** · amarelo/vidro **9,09:1** · muted#6b7db8/vidro **4,61:1** · muted#94a3b8/vidro **7,18:1** · danger#ef4444/vidro **4,89:1** · navy/laranja cheio **6,76:1** · #e8f0fe/vidro 16,07:1 · **branco/laranja 2,84:1 (falha, é o par evitado)**. Bolha 402: danger/rgba(239,68,68,.10)/vidro = **4,52:1**; gold = 8,38:1 |
| 10 | Medição de pixels do PNG `depois/carteira-375.png` (375×2400) | botão «Depositar PIX» x=33..341 (**largura 309**); ⇒ cartão = 309+2·16+2·1 = **343 px**, margem 16 px/lado. Título «Carteira» x=35..147 laranja |
| 11 | Medição de pixels do PNG `depois/ofertas-programadas-375.png` | título OP «Ofertas Programadas» x=**34**..264 (laranja) ⇒ mesma margem esquerda (16 px) que a Carteira |
| 12 | `git diff` dos 3 testes alterados (ver abaixo) | contratos 106c/mc99 actualizados às decisões R18; ver Achados |
| 13 | Remoção do worktree: `node scripts/worktree-helper.mjs remover <path>` | `{"ok":true,"nota":"removido"}`; `ls` → *No such file or directory*; `git rev-parse HEAD` → **93e17ac** (inalterado); `git status --porcelain \| wc -l` → 37 (idêntico ao inicial: `M CLAUDE.md` + 36 `??` pré-existentes) |
| 14 | `ls -1 desafio-gut/frontend/node_modules \| wc -l` e `…/netlify/functions/node_modules \| wc -l` **antes e depois** de remover | **498 / 414** antes → **498 / 414** depois ⇒ as junctions não tocaram o `node_modules` real |

## Achados

| id | ⚠️/ℹ️ | alegação afectada | evidência | tratamento proposto |
|---|---|---|---|---|
| F1 | ⚠️ | «baseline válido» (regra A14) + pista #14 | `_logs/UTAC109h-carteira.md:60` diz **«Suíte (RAM 1 607 MB antes)»**; `_logs/UTAC109h_SEG-1_MEDICAO.md:96-97` diz **«meta ≥1 500 atingida (1 504-1 508)… Antes da suíte: 1 488; depois: 1 107»**. Dois números diferentes para o MESMO evento (1607 vs 1488) e o 1488 **< 1 500 ⇒ pela letra da A14 (escrita pelo próprio executor) invalidaria a medição**. | **Não bloqueia**: re-corri a suíte à parte com RAM **1553 MB** e obtive o MESMO verde (974/974 · 1095/1101) ⇒ o resultado reproduz independentemente e a A14 fica satisfeita na substância. Corrigir a contradição no log (um dos dois números está errado) e registar a re-medição do validador. |
| F2 | ℹ️ | alegação 5 («1.º vidro só saldo + Depositar PIX + ↻») | `MinhaCarteira.jsx:267-272` (nota «Desafio por PIX… desafiogut@gmail.com») **sempre visível** no 1.º vidro; `:239-257` bolha 402 com um **3.º botão** «Carregar agora (PIX)»; `:274-278` erro de leitura. Confirmado no PNG `depois/carteira-375.png` (a nota do e-mail aparece dentro do 1.º cartão). O executor **declarou-o** em §SEG2 e justifica-o com a RESSALVA 5 do 107b (o modal de depósito não mostra o destinatário). | Aceitar como desvio declarado e justificado por conformidade; corrigir a REDAÇÃO da alegação (§SEG3/§SEG2) de «só ↻ + PIX» para «só saldo/depósito + ↻ + PIX; a nota do e-mail PIX e o aviso 402 ficam por conformidade». |
| F3 | ℹ️ | alegação 11 (cobertura) | O teste `utac109h-carteira.test.mjs:202` conta `buttons.length === 2` no 1.º vidro **apenas no render por omissão** (`passeSemSaldo=false`, contexto CONECTADO). No estado 402 o 1.º vidro renderiza um 3.º `<button>` (`MinhaCarteira.jsx:248`) — invariante não coberta. | Adicionar um caso de render com `passeSemSaldo`/estado de erro para fixar o que é permitido no 1.º vidro nesses estados. |
| F4 | ℹ️ | alegação 4 (contraste AA de CADA par) | O teste de contraste (`test.mjs:238-253`) mede **6 pares sobre o vidro liso**. O par real **danger `#ef4444` sobre a bolha 402** (`rgba(239,68,68,.10)` sobre o vidro) = **4,52:1** — passa, mas por 0,02; e `muted #6b7db8`/vidro = **4,61:1**. | Passa AA; sem acção obrigatória. Sugerido: incluir no teste os pares sobre os fundos tingidos (bolha 402) para travar regressões futuras. |
| F5 | ℹ️ | alegação 11/12 | Várias asserções são **regex sobre o TEXTO-FONTE**, não sobre o render (ex.: `test.mjs:224` `/const pad {8}= isMobile \? "1rem" : "2rem";/`, `:213-215` sobre `GlassHeader.jsx`). Provam «o código diz X», não «o ecrã mostra X»; qualquer reformatação que preserve o comportamento quebra-as. | Nota de método; não invalida. Preferir render sempre que possível. |
| F6 | ℹ️ | alegação 7 (metade desktop) | Verifiquei margens/largura **só a 375 px** (343 px / 16 px, por pixels). A metade **1280 px (32 px / 964 px)** não foi medida por mim (sem browser nesta ronda). | Re-medir 1280 px com browser antes do fecho, ou registar explicitamente como não-medido. |

## Alegações REFUTADAS

- **Alegação 5 («O 1.º vidro só tem saldo + Depositar PIX + ↻») — REFUTADA na letra.** O 1.º vidro contém também, de forma permanente, a nota do e-mail PIX (`MinhaCarteira.jsx:267-272`, visível no PNG) e, nos estados de erro, a bolha 402 com um 3.º botão «Carregar agora (PIX)» (`:248-255`) e a mensagem de erro de leitura (`:274-278`). Prova: leitura do código + PNG `depois/carteira-375.png` (a nota `desafiogut@gmail.com` está dentro do 1.º cartão) + o próprio teste (`test.mjs:204` **exige** que a nota esteja no 1.º vidro). **Mitigante:** desvio declarado em §SEG2 e imposto pela RESSALVA 5 do 107b (conformidade) — não é uma ocultação nem um bloqueio; é a redação da alegação que está errada.

Nenhuma outra alegação caiu.

## Alegações que NÃO consegui refutar

| # | Alegação | Como tentei refutar | Resultado |
|---|---|---|---|
| 1 | 7 ficheiros exactos | `git diff --name-only` + filtro por diretório | 7/7, nada fora do escopo ✅ |
| 2 | Só 2 cores de destaque; erros vermelhos | grep de hex/rgb **com comentários removidos** (para não cair nos hex «saíram» citados em comentário) + leitura do render | só `#ff6b35`+`#f5a623` como destaque; `#ef4444` só em erros; proibidas ausentes ✅ |
| 3 | Botões ≥48 px / alvos ≥48×48 | corrida da suíte (o teste conta TODOS os `<button>` do render) | passa a 974/974 ✅ |
| 4 | Contraste AA em cada par | **recálculo independente** da luminância WCAG (não aceitei as razões declaradas) | todos ≥4,5:1 (o mais baixo: 4,52 na bolha 402) ✅ |
| 6 | 2.º vidro = Passe + MLC + OP + senhas antigas | leitura de `MinhaCarteira.jsx:284-335` + PNG | confirmado ✅ |
| 7 | 1.º vidro alinhado com a OP (16/32, 343/964) | **medição de pixels** dos PNG (não a alegação) | a 375 px: cartão 343 px, margens 16 px em AMBOS ✅ (1280 não medido — F6) |
| 8 | Título = elemento mais visível | comparação de tamanhos (CSS e glifos) + inspecção visual | título 24 px > valor 21,6 px, laranja, topo do cartão ✅ |
| 9 | GlassHeader/CartaoEdicao/Dashboard/MLC/OP intactos | `git diff --stat` ficheiro-a-ficheiro | 7 arquivos UNCHANGED ✅ |
| 10 | Sem copy nova inventada | `git diff` linha-a-linha dos literais visíveis nos 2 componentes | painel: diff de texto visível **vazio**; carteira: frases existentes só mudaram de sítio/cor ✅ |
| 12 | Mutação 12/12 real e não circular | **re-corri o script eu próprio**; verifiquei âncoras únicas (`n===1`) e o restauro por md5 | 12/12 PROVADO, md5 idêntico, worktree limpo ✅ |
| 13 | 974/974 · 1095/1101 | **corri a suíte canónica eu próprio**, foreground, RAM 1553 MB | idêntico ✅ |

## O que NÃO foi medido

- **Suíte durante a execução do próprio executor:** a RAM real nesse instante é indeterminada (F1: os dois logs dão 1488 vs 1607). O que mede é a MINHA re-corrida (1553 MB → verde).
- **1280 px:** margens/largura do 1.º vidro e overflow a 1280 (F6) — só verifiquei 375 px.
- **`vite build` exit 0** (alegado em §SEG3): não re-corrido.
- **Browser vivo:** não abri browser; usei os PNG deixados pelo executor como artefactos (assumi que são do commit — a comparação visual bate certo com o código).
- **Proveniência das capturas `antes/`/`depois/`** (8 PNG + comparação): existem e são coerentes com o código, mas não re-gerei.
- **Desktop/OP/MLC «intactos» ao nível do ecrã:** provado só ao nível do commit (ficheiros não tocados), não por render.
- **Acessibilidade além do contraste:** foco por teclado, `aria-*`, ordem de tabulação — não medido.

## Decisão

**Fecho autorizado com ressalvas (0 bloqueantes).** Antes de fechar, o executor deve:

1. **(F1 — ⚠️ obrigatório)** Resolver a contradição `1607` (log principal §SEG3) vs `1488` (SEG-1 §-1.9 «antes da suíte») e registar que o validador **re-correu a suíte a 1553 MB** com o mesmo resultado — assim a A14 fica satisfeita na substância (a letra da A14 seria violada pelo 1488 declarado pelo próprio executor).
2. **(F2 — obrigatório na redação)** Corrigir a alegação 5 em §SEG2/§SEG3 para reflectir o 1.º vidro real (saldo + ↻ + Depositar PIX **+ nota do e-mail PIX [RESSALVA 5] + aviso 402/erro**); a substância (Passe/MLC/OP/senhas fora do 1.º vidro) está correcta.
3. **(F3, F4, F6 — recomendado)** Fechar as lacunas de teste/medição: caso de render no estado 402; pares de contraste sobre fundos tingidos; medição a 1280 px.
4. Manter o commit `93e17ac` como está (não reescrever); as ressalvas são de documentação/testes, não de produto. Só depois do fecho em 3 lugares + `M CLAUDE.md` (R14/A14) commitar/push (este UTAC).

**Não reproduzido ⇒ não verde:** nenhum item acima foi assumido verde sem medição; o que não medi está em «O que NÃO foi medido».
