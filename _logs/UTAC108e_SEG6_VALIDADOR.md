# VEREDICTO — UTAC de mockups `docs/mockups-107a/mlc-op-v2/`

**Autor:** subagente adversarial (tentativa de REFUTAÇÃO)
**Worktree:** `C:\Users\Moltbot\tmp-108e-val\wt` @ `bf0caf7` (`design(UTAC108e): mockups v2 do MLC+OP — familia visual unica, 3 variantes por aba, Inicio de referencia`)
**Alvo:** `docs/mockups-107a/mlc-op-v2/` — `index.html` (127 l.), `mlc.html` (260 l.), `op.html` (379 l.), `inicio.html` (168 l.), `v2.css` (117 l.)
**Método:** leitura integral dos 5 ficheiros + `tokens.css` + `mockup.js`, git, e contagens com Python (grep de acento é frágil neste ambiente).

---

## VEREDICTO: **APROVADO COM RESSALVAS — 1 bloqueante**

- **Bloqueantes de design: 0.** (a) Regra 1, (c) Regra 2/tabela, (d) alvos de toque, (e) contraste, (g) código, (h) `.bak-*` — **não consegui derrubar nenhum**.
- **1 bloqueante de conformidade:** **(i) a decisão 9 («pt-BR sempre») é VIOLADA** — inclusive com texto pt-PT **dentro dos ecrãs renderizados** (o ecrã é o que o app vai dizer). Barato de corrigir, mas é um INPUT verbatim do operador.
- **1 alegação REFUTADA (literal):** **A7, 2.ª metade** — «e v2.css NÃO redefine nada do tokens.css» é **FALSO** (sobrepõe-se em 5 seletores).
- Ressalvas ℹ️ adicionais: auditor da Regra 1 é **vacuiamente verde** nas variantes B/C; alvos < 48 px **existem fora do `.fone`** (prancha); Início tem **0 variantes e 0 placar** (leitura literal das decisões 5/6).

---

## Reproduzido por execução

```
$ git log --oneline -1
bf0caf7 design(UTAC108e): mockups v2 do MLC+OP — familia visual unica, 3 variantes por aba, Inicio de referencia

$ git status --porcelain | wc -l
0

$ git show --name-only --format= bf0caf7
_logs/UTAC108e-mockups-v2.md
docs/mockups-107a/mlc-op-v2/index.html
docs/mockups-107a/mlc-op-v2/inicio.html
docs/mockups-107a/mlc-op-v2/mlc.html
docs/mockups-107a/mlc-op-v2/op.html
docs/mockups-107a/mlc-op-v2/v2.css
```

```
$ grep -n "^\.ed-card" docs/mockups-107a/tokens.css docs/mockups-107a/mlc-op-v2/v2.css
tokens.css:146:.ed-card { ... gap: 10px; }
tokens.css:147:.ed-card .cab { ... }
tokens.css:148:.ed-card .caixa { ... padding: 10px 12px; ... }
tokens.css:150:.ed-card .relogio { ... gap: 10px; }
v2.css:17:.ed-card { ... gap: 12px; }          <-- sobrepõe tokens.css:146
v2.css:18:.ed-card .cab { ... }                <-- sobrepõe tokens.css:147
v2.css:19:.ed-card .caixa { ... padding: 12px; }  <-- sobrepõe tokens.css:148
v2.css:32:.ed-card .relogio { ... gap: 8px; }  <-- sobrepõe tokens.css:150
```

```
$ grep -c "fecho" docs/mockups-107a/mlc-op-v2/mlc.html docs/mockups-107a/mlc-op-v2/op.html
mlc.html:4      op.html:2

$ grep -n "rodape-tab" ... 
mlc.html:91/138/191:  Valores revelados após o fecho da edição (Art. 24).     <-- pt-PT
op.html:158:          Palpites revelados após a apuração da edição (Art. 24). <-- pt-BR

$ grep -n "cron[óô]metro" docs/mockups-107a/mlc-op-v2/op.html
30:  ... ordem prêmio → cronômetro → ação.        <-- pt-BR
328: ... prêmio ao lado do cronómetro; ...       <-- pt-PT   (MESMO ficheiro!)
```

```
$ python: léxico por ficheiro (ocorrências)
index.html  pt-PT -> telemóvel:2 cronómetro:1 ecrã:1 utilizador:2 ficheiro:1 carregue:1
mlc.html    pt-PT -> telemóvel:1 cronómetro:6 utilizador:2 fecho:4
op.html     pt-PT -> cronómetro:1 utilizador:2 fecho:2
inicio.html pt-PT -> ecrã:3 conversam:2
v2.css      pt-PT -> cronómetro:1
TOTAL pt-PT: telemóvel:3 cronómetro:9 ecrã:4 utilizador:6 ficheiro:1 carregue:1 fecho:6 conversam:2  (=31)

$ python: tokens usados (9) que não existem no tokens.css -> NENHUM
$ python: alvos de link -> tokens.html OK, regra-1-glass.html OK, tabela-especial.html OK,
          inicio.html OK, menor-lance-unico.html OK, ofertas-programadas.html OK,
          tokens.css OK, mockup.js OK, fonts/ (inter, orbitron, jetbrains) OK
$ python: .bak-* -> 5 ficheiros pré-existentes (2026-07) TRACKED, todos limpos no status
          ("nenhum bak no status")
```

---

## Tabela de achados

| Sev. | Achado (evidência) | Tratamento proposto |
|---|---|---|
| ⚠️ grave | **(i) decisão 9 violada.** Léxico **pt-PT** em 31 ocorrências: `telemóvel`×3, `cronómetro`×9, `ecrã`×4, `utilizador`×6, `ficheiro`, `carregue`, `fecho`×6. E **dentro dos ecrãs renderizados**: `mlc.html:91,138,191` (`.rodape-tab`) e `mlc.html:109` / `op.html:199,216` (`<span class="rotulo">para o fecho</span>`). «fecho» só existe em pt-PT; pt-BR = «fechamento». | Trocar por pt-BR: `fecho→fechamento`, `telemóvel→celular`, `cronómetro→cronômetro`, `ecrã→tela`, `utilizador→usuário`, `ficheiro→arquivo`, `carregue em→clique em`. Re-verificar com o mesmo contador Python. |
| ⚠️ grave | **Ortografia MISTA no mesmo ficheiro:** `op.html:30` escreve `cronômetro` (pt-BR) e `op.html:328` escreve `cronómetro`→`cronómetro` com ó (pt-PT). É o sintoma mais visível da violação acima. | Unificar em pt-BR (`cronômetro`) em todo o entregável. |
| ⚠️ nota-média | **Alegação A7 (2.ª metade) falsa.** `v2.css` **redefine** `.ed-card`, `.ed-card .cab`, `.ed-card .caixa`, `.ed-card .relogio` do `tokens.css` (5 seletores, provado acima). O cabeçalho do próprio `v2.css` (linha 3) afirma «NÃO redefine nada do tokens.css» — comentário desmentido pelo conteúdo, porque `v2.css` carrega depois e a especificidade é igual ⇒ vence. Consequência: há **duas fontes de verdade** para o mesmo componente (futuro risco de divergência). | Reescrever o comentário para a verdade («esta camada é um OVERRIDE deliberado de `.ed-card`») ou mover os valores para tokens.css. A 1.ª metade de A7 (valores vêm do tokens.css, 9/9 tokens existem) **confirma-se**. |
| ℹ️ nota | **O placar das duas abas não usa o mesmo registo verbal** — o defeito mais próximo de (b)/(c): a tabela MLC fecha com «revelados **após o fecho** da edição» (pt-PT) e a tabela OP com «revelados **após a apuração** da edição» (pt-BR). Mesmo componente, mesma posição, léxico diferente. | Unificar a forma: «...revelados após o **fechamento** da edição» nas duas. |
| ℹ️ nota | **Auditor da Regra 1 é vacuiamente verde em B e C.** `mockup.js:19` faz `fone.querySelector(".tela")` — só o **PRIMEIRO** `.tela`. Ao clicar B/C, o painel A recebe `hidden`, e o TreeWalker percorre o painel **invisível** (todos os nós caem em `visibleira(p)===false` ⇒ `fora.size===0` por construção). O número «Regra 1: 0» das variantes B e C **não é medição**. (Coincide com A10.) | Não é bloqueante: por leitura, **nenhum** texto dos painéis B/C está fora de `.glass`. Mas a afirmação «0 em TODOS» não tem evidência em B/C. Corrigir só num UTAC do `mockup.js` (fora do AUTORIZA). |
| ℹ️ nota | **(d) alvos < 48 px existem, mas fora do `.fone`** (a prancha é ferramenta, não produto): `tokens.css:68` `.controles button{ min-height:40px }` (os botões A/B/C e 375/768/1024) e `.navdocs a` (`padding:6px 10px; font-size:13px` ⇒ ~33 px). O auditor (`mockup.js:56 - .fone[id]`) não os vê. | Fora do escopo do produto; se o operador medir a **página**, acusa. Subir a `--gut-touch` para os controles, ou declarar a prancha como excepção. |
| ℹ️ nota | **Início: 0 variantes e 0 placar.** Decisão 6 diz «3 variantes por ecrã» e decisão 5 «cada aba tem a sua tabela no fim». O `inicio.html` tem **uma só** composição e **nenhuma** tabela, e o próprio entregável o assume (`index.html:38` «O Início não se escolhe»; `inicio.html:152` «Sem tabela no Início»). | Defensável (é referência do 107c já aprovado), mas é uma **leitura literal das decisões 5/6 que fica por adjudicar pelo operador**. Registar como desvio declarado, não silencioso. |
| ℹ️ nota | **Rótulo do cronómetro inconsistente entre abas:** MLC `restante` (A/C) e OP `restante` (A) mas `para o fecho` (B) — duas palavras para o mesmo campo. | Escolher «restante» (pt-BR neutral) ou «para o fechamento» nas duas. |

---

## Alegações REFUTADAS

1. **A7 (2.ª metade) — «e v2.css NÃO redefine nada do tokens.css» → REFUTADA.**
   `v2.css` sobrepõe-se a `tokens.css` em 5 seletores (`.ed-card`, `.ed-card .cab`, `.ed-card .caixa`, `.ed-card .relogio`), carregados depois e com igual especificidade ⇒ vencem. Prova em comando acima. É *de propósito* (é assim que as duas abas convergem), mas a frase, tal como está escrita (e no comentário do próprio ficheiro, linha 3), é factualmente falsa.
   *(A 1.ª metade de A7 — um só `.ed-card` nas duas abas, e 9/9 tokens existem no `tokens.css` — **confirma-se**.)*

2. **A4 — «0 blocos de texto fora de vidro em TODOS os 21 estados» → REFUTADA na parte mensurável (não no resultado).**
   Para as variantes **B e C**, a Regra 1 nunca é avaliada: o auditor lê sempre o primeiro `.tela` (`mockup.js:19`), que nesses estados está `hidden`. O «0» de B/C é aritmética, não medição. O **resultado** (0 violações) mantém-se por leitura — nenhum texto dos painéis B/C está fora de `.glass` — logo **não é bloqueante**, mas a alegação de que foi *medido* em 21 estados é falsa para 14 deles (Regra 1).

3. **A6 — «muda SÓ o substantivo» → REFUTADA (em rigor).**
   Entre a tabela do MLC e a da OP não muda só o substantivo: muda também o **registo verbal** do rodapé («após o **fecho**» vs «após a **apuração**»), e o substantivo cai em grafias diferentes se se contar `fecho (pt-PT)`. O *componente* é de facto o mesmo (`.tabela-especial`, header 56 px, linhas 48 px, último vidro) — isso **confirma-se**.

---

## Alegações que NÃO consegui refutar

| Alegação | Como testei | Resultado |
|---|---|---|
| **A1** Zero alterações de código | `git status --porcelain` + `git show --name-only bf0caf7` | **CONFIRMA.** 0 linhas no porcelain; o commit só toca 5 mockups + `_logs/`. Nada em `src/`, `netlify/`, `scripts/`, `package*`. |
| **A2** Zero `.bak-*` tocados | `git status --porcelain --untracked-files=all`, `git ls-files` | **CONFIRMA.** Os 5 `.bak-*` (2026-07, pré-existentes, tracked) estão limpos; nenhum aparece no status. |
| **(a) Regra 1** | Leitura do DOM de todos os painéis dos 3 ecrãs + lista `PERMITIDO` de `mockup.js:9` | **CONFIRMA.** Dentro de cada `.tela` todo o texto está em `.glass` / `.btn` / `.campo` / `.rodape-legal`. (`barra-sis`, `.etq` e a auditoria estão fora do `.tela` e/ou na lista permitida.) |
| **(b) MLC ↔ OP conversam** | Comparação estrutural dos dois ficheiros | **CONFIRMA no essencial.** Mesma cabeça (`glass.titulo-aba` + `h1.h-aba` + `p.sub` + pílula da família), mesmo `.ed-card`, mesma ordem interna (cab → caixa → relógio → ação) na A/B, mesmo `.estado`, mesmas variantes A/B/C. Só notas ℹ️ (rodapé/registos). |
| **(c) Regra 2 / tabela** | `tokens.css:166-179` + ordem dos filhos de `.tela` | **CONFIRMA.** Um só `.tabela-especial` (header 56 px, `th`/`td` 48 px, `td:last-child` à direita) e é **o último `.glass` em todos os 6 painéis** (A/B/C de MLC e OP). Muda só o título/coluna. |
| **(d) alvos < 48 px no produto** | CSS dos interactivos dentro do `.fone` | **CONFIRMA.** `.btn` e `.campo` têm `min-height: var(--gut-touch)` = 48 px; links/botões dentro dos ecrãs usam `.btn`. Falhas só na prancha (fora do escopo) — ver tabela. |
| **(e) contraste** | Recálculo WCAG sobre o vidro composto (0,88 × `#0d1235` sobre `#050818` ⇒ ≈`#0c1132`) | **CONFIRMA os números de A5:** dourado `#f5a623` = **9,09:1** (A5 diz 9,07), `--gut-muted-strong #8fa0d8` = **7,19:1** (A5 diz 7,17), laranja `#ff6b35` = **6,50:1** (A5 diz 6,49). `--gut-muted` (4,60:1) **não é usado como texto** nestes 5 ficheiros. |
| **(f) links** | Exaustivo: todos os `href`/`src` dos 5 ficheiros + `@font-face` | **CONFIRMA.** Todos os alvos existem (`tokens.html`, `regra-1-glass.html`, `tabela-especial.html`, `inicio.html`, `menor-lance-unico.html`, `ofertas-programadas.html`, `tokens.css`, `mockup.js`, as 3 fontes `.woff2`). Sem `#A/#B/#C`: os hash-links do índice batem com os `data-v` dos botões. |
| **A9** defeito real corrigido (campo 28,5 px na C a 768/1024) | Leitura de `v2.css:39-44,58-62` + aritmética de colunas | **CONFIRMA por leitura.** A 768 px: telha = `min(640)` − 2×24 de padding ⇒ 592; `.duplo` gap 12 ⇒ coluna estreita = 580×0,85/2,00 ≈ **246,5 px**; sem correcção o botão `min-width:168px` deixaria ~30 px ao campo. `.v-c .sticky-acao .linha-campo{grid-template-columns:1fr}` + `.btn{width:100%;min-width:0}` (4 classes, vence o `@container` de 2 classes) resolvem. `@container tela` funciona porque `tokens.css:81` declara `container-type: inline-size; container-name: tela`. |
| **A10** não toca no `mockup.js` partilhado | `git status` + `mockup.js:19` | **CONFIRMA** (ficheiro limpo) **e confirma o diagnóstico**: o auditor só vê o primeiro `.tela`. |

---

## O que NÃO medi e porquê

| Não medido | Motivo |
|---|---|
| **A3 — suítes frontend 885/885 e backend 1095/1101** | **NÃO MEDI.** Fora do orçamento deste UTAC (~16 ferramentas) e irrelevante: o entregável é 100 % documental — o `git show --name-only` prova que o commit não encosta em `src/`/`netlify/`, logo as suítes não podem ter mudado por causa dele. Não confirmei os números. |
| **Auditoria de toque/Regra 1 em runtime (os 21 estados)** | **NÃO MEDI.** Não tenho browser neste worktree (o contexto diz explicitamente que foi o autor que mediu). Substituí por leitura do DOM + do CSS. |
| **Contraste WCAG ao vivo** | **NÃO MEDI.** Recalculei à mão sobre a cor composta do vidro; os 3 valores que confiro batem com A5 ao centésimo, mas `tokens.html` não foi aberto em browser. |
| **Validade HTML por validador** | **NÃO MEDI.** Li integralmente os 5 ficheiros e não vi tag por fechar, `role`/`aria-*` inválidos nem duplicação de `id` (`a-lance`/`b-lance`/`c-lance`/`a-p1`/`b-p1`/`c-p1` distintos), mas não corri um validador. |
| **Larguras px reais a 768/1024** | **NÃO MEDI** em browser; o valor 246,5 px da coluna estreita é aritmética sobre `tokens.css`/`v2.css`, não medição. |

---

## Nota de método (para quem repetir)

- `grep` de acentos/emoji é frágil aqui: as contagens de léxico foram feitas em **Python** (`re.findall` sobre o ficheiro em UTF-8).
- Para reproduzir a refutação principal: `grep -n "fecho" docs/mockups-107a/mlc-op-v2/*.html` e `grep -n "cron[óô]metro" docs/mockups-107a/mlc-op-v2/op.html`.
- Pressuposto do veredicto: **o texto dentro do `.tela` é «o que o app vai dizer»** e, por isso, cai sob a decisão 9. Se o operador entender que a decisão 9 só vincula a *copy* final de implementação e que as pranchas de mockup são documentação interna, o achado ⚠️ grave desce a ℹ️ nota — mas os 5 `fecho` **dentro dos ecrãs** e o `cronómetro`/`cronômetro` misto no mesmo ficheiro continuam a ser defeitos reais.


---

# RESPOSTA DO EXECUTOR AO VEREDICTO

Veredicto: **APROVADO COM RESSALVAS — 1 bloqueante** (0 bloqueantes de design). Tabela `achado -> tratamento`:

| Achado | Grav. | Tratamento | Prova |
|---|---|---|---|
| **(i) decisão 9 (pt-BR) violada** — 31 ocorrências de léxico pt-PT, incluindo **dentro dos ecrãs** | ⚠️ **bloqueante** | **CORRIGIDO.** 32 substituições + 4 correcções de concordância que a substituição mecânica introduziu; recontado por Python: **0 pt-PT nos 5 ficheiros** | contador Python (§11) |
| **Ortografia mista** (`cronômetro` e `cronómetro` no mesmo ficheiro) | ⚠️ | **CORRIGIDO** (é o mesmo fix) | idem |
| **A7, 2.ª metade** — «v2.css NÃO redefine nada do tokens.css» é **FALSO** (sobrepõe `.ed-card`, `.cab`, `.caixa`, `.relogio`) | ⚠️ nota-média | **CORRIGIDO.** O cabeçalho do `v2.css` passou a declarar que é um **OVERRIDE deliberado**, com a lista dos 5 seletores e o que muda em cada um | `v2.css:1-20` |
| **A4** — o «0 fora de vidro» de B/C é **vacuamente verde** no auditor partilhado | ℹ️ | **ACEITO e já declarado** (§5.3 deste log). Esclarecimento: os 21 estados do §4.1 vieram do **meu auditor painel-a-painel**, não do `mockup.js` — o número do instrumento partilhado é que era vazio, e foi por isso que o corrigi | §5.3 |
| **A6** — a tabela não muda «só o substantivo»: o rodapé diz «apuração» na OP e «encerramento» no MLC | ℹ️ | **DEFENDIDO com prova, mantido.** «Apuração/apurada» é o **vocabulário do próprio app** para a Programada (`tokens.css:161-162` — `.estado.apurado-ok` / `.estado.apurado-nao`; e o manifesto 107e.1 usa «apurada»). No MLC a edição **encerra**; na OP **apura-se** o palpite. São acontecimentos diferentes — forçar a mesma palavra seria menos fiel. Declarado, não escondido | `tokens.css:161-162` |
| **Rótulo do cronómetro inconsistente** («restante» vs «para o encerramento») | ℹ️ | **CORRIGIDO:** unificado em **«restante»** nos dois ecrãs e nas 3 variantes | medido no browser |
| **Alvos < 48 px FORA do `.fone`** (botões da prancha: `.controles button` 40 px; `.navdocs a` ~33 px) | ℹ️ | **ACEITO como excepção declarada.** A prancha é **ferramenta**, não produto — e o próprio auditor do repo concorda: `mockup.js:56` audita só `.fone[id]`. Dentro do telefone (o produto) está tudo ≥ 48 px. Os valores são do `tokens.css`, que não é meu para alterar | `mockup.js:56` |
| **Início com 0 variantes e 0 placar** | ℹ️ | **DECLARADO com citação:** o **SEG3 deste UTAC** manda «Criar **1 variante** de `inicio.html`… só serve de referência» e lista os blocos **sem tabela**. Não é omissão minha; é o enunciado. O entregável di-lo em voz alta (`index.html`: «O Início não se escolhe») | SEG3 |
| **Validade HTML por validador** | não medido | **NÃO MEDI** um validador formal (o validador leu os 5 ficheiros e o browser renderizou os 3). Declarado | §7.3 |

### Correcção feita DEPOIS do veredicto: **não re-validada**
Todas as correcções acima (pt-BR, cabeçalho do `v2.css`, rótulo do cronómetro, concordância) foram aplicadas
**depois** do veredicto. **Re-medidas por mim** (21/21 estados continuam limpos no artefacto final), mas **não
passaram por uma 2.ª ronda de validação** — declarado por regra.

### Erros dos MEUS instrumentos que esta ronda expôs
1. **A substituição mecânica de léxico introduziu 4 erros de concordância** — «no mesmo tela» (tela é feminino),
   «Este tela», «o tela real», «Ele existe». Apanhados por varrimento das ocorrências com contexto, corrigidos.
   Lição: substituição de palavra sem olhar à concordância é o mesmo defeito de classe que apagar comentários
   sem preservar linhas — mexe no que não devia.
2. **A minha lista de marcadores pt-PT estava incompleta** — não tinha `ficheiro` nem `carregue em`; foi o
   **validador** que os apanhou. Uma lista feita de cabeça não é uma varredura.
3. **«conversam» foi marcado como pt-PT e não é** — é forma legítima do pt-BR («eles conversam»). Fica
   registado como falso positivo do validador, aceite o resto da lista.
