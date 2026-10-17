# UTAC110j.3 — SEG3 Validador adversarial

**Veredicto: APROVADO COM RESSALVAS — 0 bloqueantes** (3 ⚠️, 5 ℹ️). Nenhuma das 8 afirmações foi refutada no essencial.
Encontrei 1 imprecisão de detalhe na afirmação 4 (sobre os comentários) e 1 lacuna de prova na afirmação 3 (o texto do gate só está protegido pelo diff; nenhum teste o fixa).

Worktree: `C:\Users\Moltbot\tmp-110j3-val\wt` (HEAD `973c003` + patch por commitar). Fiz todas as medições lá. Escrevi apenas este ficheiro no repo principal.
Mutações temporárias restauradas byte-a-byte. md5 antes = depois:
- `TermosConsentimento.jsx` `458c0b41c084f06166a48efeb392074b`
- `MinhaCarteira.jsx` `fe9ceafd8838d1cf700adafaf866ac52`
- `CarrosselGUTO.jsx` `552521363f74a433ef09b8fdca41ed0b`

`git status` no fim é igual ao do início (4 M + 1 ??).

## Afirmações 1–8

**1. CONFIRMADA.** `CartaoEdicao.jsx:39` `GUTO_ANIMADO_7 = Object.freeze([SLIDES[6]])` e `:131` `<CarrosselGUTO size={isMobile?112:128} slides={GUTO_ANIMADO_7}/>`.
No gate: `GUTO_GATE = Object.freeze([SLIDES[6]])`, `TAMANHO_GUTO_GATE = 96`, e o invólucro tem `role="img" aria-label="GUTO mascote" data-testid="guto-gate"`.
Os assets existem com os tamanhos declarados (`ls -l`):
- `guto-7.webm` 401 630 B
- `guto-7.png` 197 691 B

No browser, a rede pediu `guto-7.webm?v=mc60` e `guto-7.png?v=mc60`. São os mesmos ficheiros das edições.

**2. CONFIRMADA.** `git diff --quiet CarrosselGUTO.jsx` → sem diff.
O código já tem `loop muted playsInline preload="auto" poster=… onError→failed→<img poster>`, o efeito `play()` com dependências `[cur, reduce, pronto]` e o poster antes de `pronto` e com reduced-motion.
Medido no Chromium/Playwright com o meu próprio harness (vite dev :3917, entretanto morto):

| Viewport | Estado do vídeo | currentTime | Caixa | Overflow lateral | Checkboxes | Erros de página |
|---|---|---|---|---|---|---|
| 375 | `paused:false` `loop:true` `muted:true` `readyState 4` | 2.46 → 3.98 s em 1,5 s | 96×96 | 0 | 4 | 0 |
| 1280 | idem | 2.43 → 3.95 s | 96×96 | 0 | 4 | 0 |
| 375, `reducedMotion: reduce` | sem `<video>`; mostra `<img src=guto-7.png?v=mc60>` | — | 96×96 | 0 | 4 | 0 |

**3. CONFIRMADA por diff, mas o texto do gate fica sem guarda de teste.**
O diff de `TermosConsentimento.jsx` toca só: o import, as 2 constantes, o bloco do `<img>` e 1 comentário. Texto, checkboxes e botões estão intactos.
⚠️ O meu mutante S7 acrescentou « MUTANTE» ao texto da 2.ª checkbox («Declaro ter 18 anos…»). **Sobreviveu** a `utac110j3`, `utac110f`, `utac110g1`, **`mc9951-gate-legal`, `mc9952-seguranca-gate` e `utac110h1-gate-render`**.
O G3 só fixa «DesafioGUT», «Ler o resumo» e 4 checkboxes. A lacuna é anterior a este UTAC, mas «o texto não mudou» assenta só no diff.

**4. CONFIRMADA. Há uma imprecisão de detalhe nos comentários.**
Comparei o multiset de linhas (HEAD vs worktree, normalizando CRLF).
Saem só 4 linhas:
- 3 de comentário;
- `marginTop: "0.85rem", padding: …` do aviso 402.

Entram só:
- `marginBottom: "0.95rem",` na grelha;
- `margin: "-0.35rem 0 0.95rem", padding: …`;
- comentários.

Todas as outras linhas (handlers, estilos, rótulos dos botões e dos cartões) são as mesmas, só deslocadas. `git diff --color-moved` mostra o bloco grelha+402 como movido inteiro.
Imprecisão: o executor fala em «dois comentários reescritos». Na verdade são 2 reescritos **+ 2 novos**: o bloco de 3 linhas «UTAC110j.3 (R18-110j.3-B)…» e a linha `// UTAC110j.3 — colado à grelha…`. Não há efeito no comportamento.
A ordem foi verificada na fonte e no SSR:
1. Saldo R$
2. Grelha dos 4 botões (PIX → Passe → MLU → OP)
3. Aviso 402
4. Saldos (Pontos → Créditos → ECOQUILDO)
5. Missões
6. Resgatar

A grelha continua a `isMobile ? "1fr" : "1fr 1fr"` (alínea g).

**5. CONFIRMADA. Os testes actualizados não ficaram mais fracos.**
- `utac110f` S: era `vidro<saldos<bloco<PIX` e passa a `vidro<PIX<saldos<bloco`. São as mesmas 4 âncoras em ordem total.
- `utac110g1` S: era `vidro<saldos<missões<resgate<PIX` e passa a `vidro<PIX<saldos<missões<resgate`. Mesmas 5 âncoras.

O ficheiro novo `utac110j3` tem 8 testes. Os 6 ficheiros relevantes correram 55/55.
ℹ️ Os comentários de cabeçalho destes dois testes continuam a descrever a ordem antiga: `utac110f…:9` «antes dos botões» e `utac110g1…:13` «ANTES dos botões».

**6. CONFIRMADA no que interessa. Não re-corri o script do executor; corri mutantes próprios.**
Usei `scratchpad/mut/seg3_mut.py`, apontado ao worktree, com tratamento de CRLF, restauro e verificação md5:

| Mutante | Resultado | Teste que matou |
|---|---|---|
| S1 PIX↔Passe | MORTO | O1 |
| S2 ECOQUILDO antes de Pontos | MORTO | O1 |
| S3 botões entre saldos e missões | MORTO | 4 testes (O1, O3, 110f S, 110g1 S) |
| S4 size 112 | MORTO | G1 |
| S5 sem `loop` | MORTO | V2 |
| S6 sem `playsInline` | MORTO | V2 |
| S7 texto de checkbox alterado | SOBREVIVEU | ver afirmação 3 |
| S8 `play()` nunca chamado | sobrevive aos 3 ficheiros | morto por `utac109d1-carrossel-play` (2 falhas) |

Conclusão sobre o S8: o autoplay está guardado ao nível do componente, não no teste do gate.

**7. CONFIRMADA (reproduzida).**
RAM livre antes da suíte: **1269 MB, abaixo do limiar A14 de 1500 MB (declarado)**. Mesmo assim o resultado deu verde.
Comando: `node ../../scripts/mc966-suite-harness.mjs ambos </dev/null` em primeiro plano, 3 min 42 s.
Resultado: **frontend VERDE 1189/1189 · backend VERDE 1351/1357 · VEREDITO VERDE**. Igual ao declarado.

**8. CONFIRMADA para o gate. Carteira não medida por mim.**
Os números do gate estão na tabela da afirmação 2.
Na Carteira só vi a captura `carteira-375.png` do executor. A ordem é a pedida, há uma só coluna e não há overflow visível. A ordem também está confirmada por SSR (O1) e pela fonte.

## Achados

- ⚠️ **A1. Peso do primeiro ecrã: +599 KB.** Medido pela rede no browser.
  - Antes: só `guto-bemvindo.png` (15 375 B).
  - Agora: `guto-7.png` (197 691 B, pintado antes da 1.ª pintura) + `guto-7.webm` (401 630 B, `preload="auto"` depois do idle) + o PNG antigo, que ainda é descarregado → **614 696 B**. São cerca de 40× mais bytes no ecrã de entrada, antes do login.
  - Agravante: o PNG de 512² aparece a 96 px.
  - No APK não pesa na rede, porque os assets são locais. Na web móvel pesa.
  - Mitigação possível, fora do escopo autorizado: preload do `guto-7.png` em vez do `guto-bemvindo.png`, ou um poster de 192 px.
- ⚠️ **A2. O preload `guto-bemvindo.png` ficou órfão.** Medido: o Chrome avisa na consola em todas as cargas «was preloaded using link preload but not used within a few seconds». São 15 375 B desperdiçados.
  - `src` só referencia `guto-bemvindo.png` em comentários e testes.
  - `mc993-preload.test.mjs:59` **continua a exigir** esse preload, com a justificação já falsa «mascote do gate (está acima da dobra)».
  - `scripts/mc993-prova-mutacao.mjs:33,40` tem âncoras nesse preload.
  - O executor declarou-o e deixou-o por `index.html` estar fora da autorização. Concordo, mas é dívida a registar: a correção toca `index.html` + `mc993` + o script de mutação.
- ⚠️ **A3. Carteira: a nota «Depósito por PIX via Mercado Pago — desafiogut@gmail.com» ficou separada do botão PIX** pelos 3 cartões + Missões (+ Resgatar).
  - O comentário MC99/RESSALVA 5 justifica a nota por estar «no sítio onde o utilizador está quando vai pagar».
  - Não é regressão funcional e o operador não decidiu este ponto. Fica para decisão (subir a nota para junto da grelha ou manter).
- ℹ️ **A4. Safari/iOS (VP9 com alfa) não medido.** A Playwright WebKit instalada não arranca: falta `webkit-2272`, e a 2248 dá «Protocol error Console.enable».
  - Por leitura: um WebM não suportado → `onError` → poster. Um VP9 sem suporte de alfa pode pintar a caixa opaca.
  - `v.play()` sem `.catch` → rejeição não tratada se o autoplay for bloqueado (Low Power Mode). Fica o atributo `poster` visível.
  - As duas situações já existiam nas edições e no Dashboard; o gate herda-as.
- ℹ️ **A5. Acessibilidade.** O `alt` mudou de «GUTO mascote - pensativo» para `aria-label="GUTO mascote"` num invólucro `role="img"` cujo filho é `aria-hidden`. Continua com nome acessível; não é regressão.
- ℹ️ **A6. O texto legal do gate não tem guarda de teste** (mutante S7). É anterior ao UTAC.
- ℹ️ **A7.** Comentários de cabeçalho desactualizados nos 2 testes actualizados (afirmação 5).
- ℹ️ **A8.** O `CarrosselGUTO` passa do chunk do Dashboard para o chunk de entrada (Boot → Termos). São poucos KB e o `framer-motion` já estava no boot (BackgroundCanvas e Modal). O tamanho do chunk não foi medido.

**Âncoras antigas (alínea i).** Procurei em `scripts/` da raiz por âncoras na ordem antiga, em `marginTop "0.85rem"`, nos comentários alterados e em `guto-bemvindo`/`gutoWrapper`/`width={96}`.
- Só `mc993-prova-mutacao.mjs` tem âncoras (no `index.html`, que não mudou). Continuam válidas.
- As mutações de `utac110f-front`, `utac109h2`, `mc9951` e as restantes não usam as linhas alteradas.

## O que NÃO medi

- Safari/iOS e Firefox: os binários da Playwright não batem com a versão instalada.
- A Carteira num browser real: vi apenas a captura do executor (ordem e layout parecem correctos).
- Não re-corri o script de mutação 7/7 do executor; corri os meus 8 mutantes.
- LCP/FCP reais na web móvel (só medi bytes) e a dimensão do chunk de entrada.
- Efeito colateral: o vite dev que corri escreve a cache de optimização em `node_modules/.vite`. O `node_modules` é uma junction para o repo principal, por isso essa cache pode ter sido actualizada lá. Não toquei em mais nada.
