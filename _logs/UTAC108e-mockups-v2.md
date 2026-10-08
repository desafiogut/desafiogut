# UTAC108e — Mockups de design: Menor Lance Único + Ofertas Programadas coerentes

**Tipo:** MOCKUPS (design) — HTML/CSS estático. **Não altera código do app.**
**Owner:** Hermes · **Data:** 2026-10-07 · **Arranque:** 05:51 · **HI5:** 2 h
**Depende de:** UTAC108d (fechado)

---

## 0. Baseline (SEG-1)

| Item | Medido |
|---|---|
| `HEAD` / `origin/main` | **`a68ec46`** / `a68ec46` (iguais) — pós-108d, como o enunciado previa |
| Suíte canónica | **frontend VERDE 885/885 · backend VERDE 1095/1101 → `VEREDITO: VERDE`** |
| Tracked modificados | **0** |
| Código alterado (`src/`, `netlify/`, `scripts/`, `package*`) | **ZERO** |
| `.bak-*` tocados | **ZERO** |
| `EM_BREVE_MODE` | `true` (`lib/leilaoLock.js:10`) |
| Pasta de destino | `docs/mockups-107a/mlc-op-v2/` — **não existia** antes deste UTAC |

**Nota:** a suíte do frontend subiu de **849** (medido no UTAC108b) para **885** — os UTAC108c/108c.1/108d
acrescentaram testes. Não é desvio; é a série a andar.

### Ficheiros de partida lidos
`docs/mockups-107a/`: `tokens.css` (213 linhas), `DESIGN.md`, `mockup.js`, `menor-lance-unico.html`,
`ofertas-programadas.html`, `tabela-especial.html`, `regra-1-glass.html`, `inicio.html`.

---

## 1. SEG0 — Análise de coerência (o problema, medido)

### 1.1 O diagnóstico numa frase
**O conteúdo das duas abas já era o mesmo — a roupa é que era diferente.** Foi daí que nasceu a
sensação de «duas apps». A prova está nos ficheiros, não numa opinião:

| Divergência | Menor Lance Único (107d) | Ofertas Programadas (107e) |
|---|---|---|
| **Componente de edição** | `.edicao-unica` (`menor-lance-unico.html:85`, `:103`, `:124`) | `.edicao` (`ofertas-programadas.html:80`, `:82`, `:84`, `:86`, `:88`) |
| **Raio / padding** | vidro a `padding:24px` (`menor-lance-unico.html:68`); botão do lance `border-radius:28px` | `--gut-radius` 14 px; `.btn` 12 px (tokens.css:42-43) |
| **Dourado** | gradiente `linear-gradient(135deg,#f5a623,#e89400)` (`menor-lance-unico.html:68`) | `#f5a623` sólido (`ofertas-programadas.html:54`) |
| **Coluna de conteúdo** | sem limite (só `.tela` sem `.coluna`) | `--gut-coluna` 640 px (`ofertas-programadas.html:66-70`) |
| **Cabeça da aba** | `<h1 class="h-aba">` solto dentro de um vidro sem padrão | `glass titulo-aba` com `<div>` (`:70`) |
| **Estados** | nenhum (só o 🔒 da tabela) | `.estado` com 5 variantes (`:80-88`) |
| **Tabela no fim (Regra 2)** | `.tabela-especial` com 🔒 | `.tabela-especial` com 🔒 |
| **Nome da tabela** | «Lances — Edição R-1» | «**Lances** — Edição PROG-1» ← **desalinhado** do decidido |

### 1.2 Duas divergências que o `tokens.css` já anunciava em comentário
O próprio ficheiro de tokens da série 107a já declarava onde as abas divergiam — foi lido, não inventado:
- `tokens.css:40` — «padding interno de TODO o vidro (**CardLance hoje: 24px**)»
- `tokens.css:42` — «`.gut-glass-standard` (**TabelaLances hoje: 12px**)»
- `tokens.css:44` — «coluna única das 4 abas (**só a OP a tem hoje**)»
- `tokens.css:32` / `:37` — «ÚNICO dourado (**hoje coexistem `#f5a623` e `#ff9500`**)» · «um só vermelho (**hoje `#ef4444`/`#ff3d71`/`#ff5a5f`**)»
- `tokens.css:45-46` — toque 48 px e rótulo 12 px, ambos **PROPOSTA** (hoje há alvos de 44 px e rótulos a ~9 px)

⇒ **A família visual única já estava desenhada na série 107a; nunca foi aplicada às duas abas ao
mesmo tempo.** Este UTAC aplica-a.

### 1.3 Uma terceira divergência, achada por leitura: o substantivo da tabela
`ofertas-programadas.html:93` diz «**Lances** — Edição PROG-1». Mas a decisão **R18-C do 107e.1**
(registada em `docs/aprovacoes-operador.md` §6, item 3) escolheu «**Palpites** — Edição». O mockup
ficou desalinhado do que foi decidido e implementado. Corrigido na v2.

### 1.4 Compromisso de superfície (regra do `claude-design`)
As duas abas são **Operate** — o utilizador age dentro de uma edição viva (dá o lance / palpita); o
cronómetro e o estado são **Monitor** secundário. Consequência de composição: **ação primeiro,
placar no fim, sem herói**. Foi por isso que NÃO se introduziu nenhuma grelha de 3 cartões nem
qualquer bloco de «herói» — a composição aprovada já era a certa; o defeito era só de acabamento.

---

## 2. A família visual única (o que a v2 fixa)

Um só componente de edição — **`.ed-card`** — usado pelas duas abas:

```
.ed-card = glass + cabeça (pílula do id + .estado) + caixa (miniatura 52 + prémio + nota)
           + cronómetro (Orbitron) + slot de ação
```

| Peça | MLC | OP | v2 (as duas) |
|---|---|---|---|
| Casco | `.edicao-unica` | `.edicao` | **`.ed-card`** |
| Cabeça | `h1.h-aba` solto | `glass.titulo-aba` | **`glass.titulo-aba` + pílula da família** |
| Pílula da família | — | — | **`⚡ Relâmpago` / `🎫 Programada`** |
| Estados | só 🔒 | `.estado` | **`.estado`** (aberto/breve/apurado-ok/apurado-nao/encerrado) |
| Cronómetro | `.t` | `.tempo` | **`.relogio > .t`** |
| Slot de ação | campo de centavos | campo de palpite | **mesma posição e forma; conteúdo diferente** |
| Tabela (Regra 2) | `.tabela-especial` | `.tabela-especial` | **igual** — só muda o substantivo (Lances / Palpites) |

**Ficheiro novo:** `docs/mockups-107a/mlc-op-v2/v2.css` — camada v2. **Não redefine nada do
`tokens.css`**; só acrescenta o que faltava. Todos os valores (raio, pad, gap, gutter, dourado,
vermelho, toque, coluna) vêm do `tokens.css`.

---

## 3. Entregáveis (SEG1-SEG4)

| Ficheiro | Conteúdo | Bytes |
|---|---|---|
| `index.html` | índice: links directos por variante, o que mudou, que problema resolve cada uma, recomendação | 7 993 |
| `mlc.html` | Menor Lance Único — **3 variantes** (A fiel+harmónica · B cartão maior · C 2 colunas) | 14 846 |
| `op.html` | Ofertas Programadas — **3 variantes** (A fiel+harmónica · B progresso em destaque · C cards compactos) | 21 679 |
| `inicio.html` | Início (referência): as duas famílias no mesmo ecrã, cards compactos | 8 537 |
| `v2.css` | a camada v2 (`.ed-card`, variantes, pontos, densidade) | 8 203 |

**As variantes não são trocas de cor** (regra do `claude-design`): mudam composição —
- **MLC B** sobe o cronómetro para cima do prémio (urgência primeiro) e centra o prémio;
- **MLC C** move o formulário para uma coluna fixa à direita no desktop;
- **OP B** dá protagonismo aos pontos (número e barra maiores) e encolhe o cartão da Família Quildo;
- **OP C** densifica o carrossel para o placar subir na tela.

**Ligação directa a uma variante:** `mlc.html#A|#B|#C` e `op.html#A|#B|#C` abrem já na variante
(script próprio dentro dos ficheiros; o `mockup.js` partilhado **não foi tocado**).

---

## 4. SEG5 — Verificação (medida num browser real, não por leitura)

Instrumentos: o navegador abriu os 3 ficheiros por `file://`; os auditores do `mockup.js` correram; e
uma auditoria própria correu **painel a painel** (ver §5.3, o ponto cego do instrumento partilhado).

### 4.1 Matriz de área de toque e Regra 1 — 21 estados
Cada célula = variante × largura. Colunas: largura renderizada · painel visível · alvos · alvos < 48 px · blocos de texto fora de vidro.

**`mlc.html`**

| Estado | Largura | Painel visível | Alvos | < 48 px | Fora de vidro |
|---|---|---|---|---|---|
| A@375 · A@768 · A@1024 | 375/768/1024 | **true** | 2 | **0** | **0** |
| B@375 · B@768 · B@1024 | 375/768/1024 | **true** | 2 | **0** | **0** |
| C@375 · C@768 · C@1024 | 375/768/1024 | **true** | 2 | **0** | **0** |

**`op.html`**

| Estado | Largura | Painel visível | Alvos | < 48 px | Fora de vidro |
|---|---|---|---|---|---|
| A@375 · A@768 · A@1024 | 375/768/1024 | **true** | 6 | **0** | **0** |
| B@375 · B@768 · B@1024 | 375/768/1024 | **true** | 2 | **0** | **0** |
| C@375 · C@768 · C@1024 | 375/768/1024 | **true** | 3 | **0** | **0** |

**`inicio.html`** — 375/768/1024 → largura 375/768/1024 · 6 alvos · **0** abaixo de 48 px · **0** fora de vidro.

⇒ **21/21 estados sem violação.** O texto está sempre dentro de `.glass` (Regra 1) e nenhum alvo
interactivo fica abaixo dos 48 px.

### 4.2 Contraste WCAG — calculado com as funções do PRÓPRIO repo (`window.GUT.contraste`)
Vidro composto medido: `rgb(12,17,50)`.

| Par | Rácio | AA (4,5 texto normal / 3 grande) |
|---|---|---|
| texto principal `#e8f0fe` | **16,05:1** | OK |
| corpo `#c8d0f0` | **12,03:1** | OK |
| rótulo pequeno (12 px) `#8fa0d8` | **7,17:1** | OK |
| muted `#6b7db8` | **4,60:1** | OK (o token declara: só ≥ 14 px) |
| dourado `#f5a623` | **9,07:1** | OK |
| laranja do título (18 px) `#ff6b35` | **6,49:1** | OK |
| estado aberto/apurado `#5ee0b4` | **11,21:1** | OK |
| estado não-apurado `#ff9a9d` | **9,07:1** | OK |
| texto sobre dourado (`on-gold` no botão) | **9,45:1** | OK |

**Nenhuma violação.** Nota honesta: o **vidro sobre o fundo** mede **1,08:1** — a separação do vidro
não vem do contraste de cor, vem da **borda** (`rgba(255,255,255,.10)`) e da sombra. É por desenho
(o `DESIGN.md` proíbe `backdrop-filter`, MC82.1); fica declarado, não escondido.

### 4.3 Regra 2 (tabela especial) — igual nas duas abas
Mesmo componente `.tabela-especial`, sempre o **último vidro**, cabeçalho de 56 px, linhas de 48 px.
Diferença única e deliberada: o **substantivo** — «Lances» (MLC, coluna Valor) e «Palpites» (OP,
coluna Palpite). Provado por leitura directa dos dois ficheiros (mesmas classes, mesma ordem).

### 4.4 HTML, links e navegação
- As 3 páginas **carregam e renderizam** no browser (título e conteúdo correctos).
- **0 links quebrados** — todos os `href`/`src` das 4 páginas resolvem no disco (verificador com
  `#fragmento` removido; ver erro de instrumento §5.5).
- **`#A`/`#B`/`#C` funcionam nos dois caminhos**: em **carga nova** (`mlc.html#C` → painel C visível,
  legenda da C) e em **`hashchange`** (`#C` → `#A` na mesma página → variante A).
- **Nenhum erro de JavaScript é atribuível aos mockups** (§5.6).

---

## 5. Erros dos MEUS instrumentos, declarados (todos corrigidos)

Esta secção existe porque três das minhas primeiras medições deram números **falsos** — e um deles
era um falso-verde que teria escondido um defeito real.

### 5.1 Leitura da largura no mesmo tick da mutação → **stale**
A 1.ª matriz leu 375 px em **todos** os estados. Causa: li `getBoundingClientRect()` no mesmo tick
em que o botão de largura mudava o atributo. Medição inválida ⇒ repetida com um `requestAnimationFrame`
de intervalo. (O `browser_console` espera Promises, o que permitiu medir com pausa.)

### 5.2 O `.fone` tem `transition: width .25s` → medi **a meio da animação**
A 2.ª matriz deu 593/748/870 px (larguras a caminho de 375/768/1024). Causa: `tokens.css:86`
(`transition: width .25s ease`). Passou a esperar 400 ms: 375/768/1024 exactos.

### 5.3 **Ponto cego no `mockup.js` partilhado** — a Regra 1 só era auditada no 1.º painel
`mockup.js:19` faz `const tela = fone.querySelector(".tela")` ⇒ audita **só o primeiro painel** (a
variante A). O meu «0 blocos fora de vidro» para as variantes **B e C não estava provado** — o auditor
nunca as olhava. Corrigido com auditoria própria, **painel a painel**, a partir do painel visível.
*Não corrigi o `mockup.js`: é partilhado com os mockups aprovados e está fora do meu AUTORIZA.*

### 5.4 Navegação no mesmo documento **não recarrega** a página
A 1.ª verificação do `#B` deu «variante A visível» e pareceu um defeito. Não era: navegar de
`mlc.html` para `mlc.html#B` é navegação no **mesmo documento** — o browser só muda o fragmento e o
script de carga não volta a correr. Corrigido no código (acrescentado `hashchange`) **e** re-testado.

### 5.5 O meu verificador de links não removia o `#fragmento`
Acusou `mlc.html#A` (3×) e `op.html#A` (3×) como **quebrados**. Falso positivo do instrumento: o alvo
é `mlc.html`, que existe. Corrigido com `sed 's/#.*//'` → **0 links quebrados**.

### 5.6 As 18 excepções de consola **não são dos mockups**
O `browser_console` devolveu 18 excepções com **mensagem vazia**. Reprogramei para uma página
**`about:blank`** — sem código meu — e as **mesmas 18** continuaram lá. Vêm do ambiente do browser
(extensão/instrumentação da sessão), são **não-limpaáveis** pelo `clear` e **não atribuíveis** ao meu
código. Fica declarado: **não posso afirmar «a consola está limpa»** — posso afirmar que nenhuma
excepção é atribuível aos ficheiros deste UTAC.

### 5.7 ✅ E o erro que a correcção do instrumento APANHOU (defeito real, já corrigido)
Com a auditoria **por painel visível** (a correcta), apareceu uma violação verdadeira:

> **`mlc.html`, variante C, a 768 e 1024 px: o campo do lance ficava com 28,5 px de largura.**
> Medido: `aside` = 246,5 px · botão = 168 px fixos · **input = 28,5 px** (altura 48 ✓, largura ✗).
> Um campo de 28 px é inutilizável — não se vê o número que se escreve.

Causa: o `@container tela (min-width: 480px)` decide pela largura do **telefone**, mas na variante C
o campo vive numa **coluna** de 246 px — a regra aplicava-se quando não havia largura para ela.
**Correcção** (`v2.css`): na coluna estreita da C, campo e botão **empilham**, com o botão a 100 % e
`min-width:0`. Re-medido: **C@768 e C@1024 → 0 alvos abaixo de 48 px**.

⚠️ Se eu tivesse ficado com a medição do instrumento partilhado (§5.3), este defeito **não teria
aparecido** e o mockup iria para o operador com um campo de 28 px.

---

## 6. Auto-auditoria de «slop» (regra do `claude-design`) — 2/10

Corri o diagnóstico dos 10 indícios sobre a minha própria peça: **2 pontos**, ambos herdados e
justificados, nenhum estrutural.

| # | Indício | Veredicto |
|---|---|---|
| 1 gradiente de tecnologia | **não** — o acento é o laranja da marca; o único gradiente é o poço da miniatura | 
| 2 cor genérica (indigo/violeta) | **não** — laranja + dourado, escolhidos pela marca | 
| 3 grelha de 3 cartões iguais | **não** — a composição é ação → placar, com hierarquia real | 
| 4 barra colorida à esquerda dos cartões | **não** | 
| 5 vidro sem profundidade | **parcial (herdado)** — o vidro é a **Regra 1** do produto, com borda e sombra definidas; o `backdrop-filter` está **proibido** (MC82.1). Declarado, não contornado | 
| 6 número-monumento | **parcial (motivado)** — o «12 / 50» é o motor da OP; na variante B cresce **porque é informação**, e é isso que a variante propõe | 
| 7 ícone em cima de cada título | **parcial (herdado)** — as miniaturas de 52 px com emoji existem no aprovado; mantidas iguais nas duas abas | 
| 8 tudo centrado | **não** — a variante B centra o prémio de propósito; as A e C são alinhadas à esquerda | 
| 9 tipo por omissão | **não** — Orbitron + Inter autohospedadas do repo, usadas por função | 
| 10 superfície errada | **não** — compromisso explícito em **Operate** (§1.4) | 

Nenhum indício **estrutural** (3, 8, 10) dispara ⇒ não há re-composição a fazer; o que sobra é
herdado do mockup aprovado e mantido de propósito.

---

## 7. Notas de método — o que este UTAC NÃO garante

1. **Não testei em telemóvel real.** As larguras foram simuladas pela largura do `.fone` no browser
   de desktop (375/768/1024), não por dispositivo. O que isso prova é o CSS container-based; não prova
   o comportamento do teclado nativo, do `scroll-snap` no toque nem das fontes no Android.
2. **Não medi performance** (peso, LCP). São mockups estáticos; não é o objectivo.
3. **Não escolhi por mim:** as 3 variantes existem para o operador decidir. A recomendação (§8) é
   opinião declarada, não decisão.
4. **Não implementei nada** — zero linhas em `src/`.
5. **Não validei com leitor de ecrã.** A semântica (roles, `aria-label`, `label`↔`input` por `for`/`id`)
   foi escrita com cuidado, mas não foi lida por NVDA/VoiceOver.


---

## 8. SEG6 — Validador adversarial

**Veredicto: APROVADO COM RESSALVAS — 1 bloqueante** (o bloqueante é de **conformidade**, não de design:
a decisão 9 «pt-BR sempre»). **0 bloqueantes de design**: (a) Regra 1, (b) conversa entre abas,
(c) Regra 2, (d) toque, (e) contraste, (g) código, (h) `.bak-*` — **nenhum foi derrubado**.
Veredicto integral verbatim + a minha resposta: `_logs/UTAC108e_SEG6_VALIDADOR.md`.

### 8.1 O que o validador derrubou — e o que fiz
| Derrubou | Tratamento |
|---|---|
| **(i) decisão 9 violada** — 31 ocorrências de pt-PT, **inclusive dentro dos ecrãs** (`rodape-tab` e o rótulo do cronómetro) | **CORRIGIDO**: 32 substituições; recontado por Python → **0 pt-PT**. Inclui 2 palavras que a minha lista não tinha (`ficheiro`→`arquivo`, `carregue em`→`clique em`) e que o **validador** apanhou |
| **A7, 2.ª metade** — «v2.css não redefine nada do tokens.css» é **falso** | **CORRIGIDO**: o cabeçalho do `v2.css` declara agora o **override** e lista os 5 seletores sobrepostos e o que muda |
| **A4** — o «0 fora de vidro» de B/C era **vacuamente verde** no `mockup.js` (lê só o 1.º `.tela`) | **Já estava declarado na §5.3.** Esclarecido: os 21 estados vieram do **meu** auditor painel-a-painel |
| **A6** — o rodapé da tabela muda mais que o substantivo | **DEFENDIDO com prova** (`tokens.css:161-162`: é o app que diz «apurada»; no MLC encerra-se, na OP apura-se) |

### 8.2 ERRATA — o que mudou depois do veredicto (NÃO re-validado)
1. **pt-BR em todo o entregável** (32 substituições). Isto muda texto **dentro dos ecrãs** ⇒ **re-medido**: 21/21 estados continuam sem alvos < 48 px e sem texto fora de vidro.
2. **4 erros de concordância que a MINHA substituição introduziu** («no mesmo tela», «Este tela», «o tela real», «Ele existe») — corrigidos. *A substituição mecânica de uma palavra sem olhar à concordância é do mesmo tipo de defeito que apagar comentários sem preservar as linhas: mexe no que não devia.*
3. **Rótulo do cronómetro unificado** em «restante» (era «restante» em A/C e «para o encerramento» em B).
4. **Cabeçalho do `v2.css`** reescrito com a verdade sobre o override.
As correcções **não passaram por 2.ª validação** — declarado (GATE 11).

### 8.3 Notas do validador que ACEITO sem corrigir (declaradas)
- **Alvos < 48 px na prancha** (`.controles button` 40 px, `.navdocs a` ~33 px): é a **ferramenta**, não o produto; o auditor do próprio repo também a exclui (`mockup.js:56`). Fica declarado.
- **Início sem variantes e sem placar:** o **SEG3 deste UTAC** manda «1 variante» e lista os blocos sem tabela. Declarado no entregável.
- **«conversam» marcado como pt-PT:** **falso positivo** — é forma legítima do pt-BR.

### 8.4 Fecho
**Hora do fecho:** 06:16 · duração dentro do HI5 de 2 h.
