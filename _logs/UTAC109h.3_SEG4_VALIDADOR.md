# UTAC109h.3 — SEG4 · VEREDICTO DO VALIDADOR ADVERSARIAL

## Veredicto
APROVADO COM RESSALVAS — 0 bloqueantes

## Reproduzido por execução (pelo validador)
Todas as provas foram corridas num **worktree próprio** em `bcbeeba`
(`node scripts/worktree-helper.mjs criar C:/Users/Moltbot/AppData/Local/Temp/utac109h3-val/wt bcbeeba`,
4 junctions A13), que entregou os `.jsx` em **CRLF** (confirmado por contagem de bytes `\r`), e no
main tree só para leitura.

**1) Ficheiros do commit (alegação 1)**
```
$ git diff --name-status e48acf6 bcbeeba
A  _logs/UTAC109h.3.spec.yml
A  _logs/UTAC109h.3_SEG-1.md
M  desafio-gut/frontend/src/__tests__/utac106c-carteira.test.mjs
M  desafio-gut/frontend/src/__tests__/utac109h2-carteira.test.mjs
M  desafio-gut/frontend/src/components/PainelIndicacao.jsx
M  desafio-gut/frontend/src/pages/MinhaCarteira.jsx
M  scripts/utac109h2-prova-mutacao.mjs
$ git diff --name-only e48acf6 bcbeeba | wc -l
7
```

**2) Suíte canónica (alegação 6)** — foreground, `< /dev/null`, do worktree
```
$ node scripts/mc966-suite-harness.mjs ambos < /dev/null
frontend: VERDE 970/970 pass
backend: VERDE 1095/1101 pass
VEREDITO: VERDE
```
Detalhe do backend (com a flag que o harness usa): `tests 1101 · pass 1095 · fail 0 · skipped 6 · cancelled 0`.

**3) Ficheiros isolados (alegação 6)** — worktree CRLF
```
$ node --test src/__tests__/utac109h2-carteira.test.mjs          -> tests 9  pass 9  fail 0
$ node --test src/__tests__/utac106c-carteira.test.mjs           -> tests 16 pass 16 fail 0
$ node --test src/__tests__/utac106c-carteira-render.test.mjs    -> tests 15 pass 15 fail 0
```

**4) Portabilidade CRLF (o que já custou um bloqueante)** — worktree entrega `.jsx` em CRLF; contei os bytes e corri os 3 testes nesse ambiente:
```
BEFORE-CONVERT cart_cr=412 painel_cr=265      (CRLF confirmado; o main tree também é 412/265)
utac109h2 9/9 · utac106c-carteira 16/16 · utac106c-carteira-render 15/15   (tudo verde em CRLF)
```
(as .jsx passam pelo normalizador `.replace(/\r\n/g,"\n")` do `ler()` do teste — é isso que as salva.)

**5) Prova de mutação (alegação 7)**
```
$ node scripts/utac109h2-prova-mutacao.mjs
baseline do teste: fail=0
M1..M5 PROVADO · M6 CTA do Passe volta a dourado SÓLIDO: PROVADO (1 RED) · M7/M8/M9/M10 PROVADO
M11 «Copiar código» volta a cheio: PROVADO (1 RED > baseline 0)
restauro MinhaCarteira.jsx: md5 idêntico
restauro PainelIndicacao.jsx: md5 idêntico
MUTAÇÃO 11/11 PROVADOS
```

**6) Contraste recalculado por mim (alegação 5)** — sRGB→luminância relativa→(L1+.05)/(L2+.05):
```
tingido rgba(245,166,35,.14) sobre vidro #0c1131 = #2d262f   (confere)
ratio(#f5a623, #2d262f) = 7.2463  ~ 7,25:1  (>= 4,5:1  AA: PASSA)
sensibilidade: vidro #0d1235 -> 7,16 ; #0a0f1a -> 7,56 ; #04080f -> 8,11  (sempre > 7)
```

**7) Sonda de vacuidade (atacar a própria correcção)** — apliquei o "MUTANTE-A": removi as
sobreposições do Passe (fica a usar o objecto-base `botaoPrimario` = amarelo SÓLIDO real) e corri os testes:
```
utac109h2: tests 9  pass 8  fail 1  (✖ teste 8 «nenhum botão usa preenchimento AMARELO SÓLIDO»)
utac106c-carteira: tests 16 pass 15 fail 1 (✖ teste do Passe)
restauro: md5 idêntico
```
=> as guardas **mordem** neste regresso; e a asserção `>= 4 ocorrências de rgba(245,166,35,0.14)`
fecha a lacuna que sobraria (se qualquer dos 4 botões deixasse de sobrepor, a contagem cai abaixo de 4).

**8) Referências a `botaoPrimario` (alegação 3)** — `git grep -n botaoPrimario bcbeeba`:
```
PainelIndicacao.jsx:110   // ... comentário: «O antigo `botaoPrimario` (cheio `#f5a623`) ... saiu»
utac109h2-carteira.test.mjs:185  assert.doesNotMatch(codigo(PAINEL), /const botaoPrimario/, ...)
MinhaCarteira.jsx:126     const botaoPrimario = { ... }   (objecto-BASE distinto, 4 usos com spread)
_logs/MC99*.txt, _logs/UTAC109h.3_SEG-1.md:30   (texto histórico)
```
Uso de código do objecto do PainelIndicacao = **0**.

**9) Alegação 8** — `GlassHeader`, `CartaoEdicao`, `Dashboard`, backend/functions, `package*`, `.bak-*`
**não aparecem** no diff (NOT TOUCHED). `box-sizing: border-box` global (`globals.css:213`) garante que
o `border: 1px solid` adicionado ao Passe **não** desloca o layout (0 px de shift).

## Achados
| id | ⚠️/ℹ️ | alegação afectada | evidência (ficheiro:linha / comando+saída) | tratamento proposto |
|----|------|-------------------|--------------------------------------------|---------------------|
| F1 | ℹ️ | A3 «não sobra nenhuma referência a `botaoPrimario` em lado nenhum» | `git grep botaoPrimario` → PainelIndicacao.jsx:110 (comentário), utac109h2-carteira.test.mjs:185 (regex), _logs/MC99*.txt, _logs/UTAC109h.3_SEG-1.md:30. Uso de **código** = 0 | Reformular a alegação: «sem *uso* de código»; o texto é deliberado (registo) e não é defeito |
| F2 | ℹ️ | A5 «o histórico da decisão 5 fica à vista (não foi apagado)» | `git diff` mostra o comentário local do botão **reescrito** (o bloco «decisão 5 … 9,45:1 / 2,03:1» foi removido). O histórico sobrevive noutros sítios: MinhaCarteira.jsx:32-33 (`9,45:1`) e comentário do utac106c (`decisão 5`, `2,03:1`) | Aceitar como satisfeito no espírito; registar que **não** é literalmente o mesmo texto |
| F3 | ℹ️ | defeito **novo** criado pelo fix | MinhaCarteira.jsx:33 diz «navy `#0a0f1a` … **É o único par usado no CTA dourado**» — mas o comment novo (linha 244) diz «`ON_GOLD` … **já não é usado por nenhum CTA**». Contradição entre dois comentários do mesmo ficheiro | Corrigir/actualizar a linha 33 (ou acrescentar «(estado anterior a 109h.3)») |
| F4 | ℹ️ | A4/A5 | `ON_GOLD` (`MinhaCarteira.jsx:34`) ficou **código morto**: único uso de código é a própria definição; os testes exigem que a constante *exista* (utac106c:135, utac109h2:181) | Declarado pelo executor; manter (contrato de teste) ou remover com o teste, em UTAC próprio |
| F5 | ℹ️ | A4 (caveat) | `botaoPrimario` base `MinhaCarteira.jsx:126-134` mantém `background:"#f5a623"`+`color:"#fff"`+glow — **amarelo sólido latente**. Os **4/4** usos (linhas 224,238,264,279) sobrepõem `background`+`border`+`color`+`boxShadow` ⇒ nada é renderizado sólido | Declarado; a guarda cobre-o (bloco do Passe + contagem `>=4`) |
| F6 | ℹ️ | A3 (efeito UX) | «📋 Copiar código» e «📤 Compartilhar» passam ambos a `botaoSecundario` ⇒ **botões idênticos** lado a lado; perde-se a hierarquia primário/secundário | Declarado pelo executor; confirmar com o operador se é aceitável |
| F7 | ℹ️ | «padrão único» | Os tingidos **não são uniformes**: Carteira `rgba(…,0.14)`/`0.4` vs Painel `rgba(…,0.12)`/`0.35` (PainelIndicacao.jsx:114-115) | Nota de consistência (não é regressão) |
| F8 | ℹ️ | spec/SEG-1 (auto-relato) | `_logs/UTAC109h.3.spec.yml`: «4 dos 6 botões usam o estilo tingido … (PIX, MLC, OP)» — **enumera 3, diz 4** | Corrigir a contagem no relato |
| F9 | ℹ️ | contexto «tingido é o dominante» | Há CTAs de **dourado sólido** por todo o app: CartaoEdicao.jsx:68, LazyBoundary.jsx:62, SemSaldoBanner.jsx:42, MercadoLances.jsx:486, OfertasProgramadas.jsx:331 | Não afecta A4 (âmbito = 2 peças); relativizar a premissa «dominante» |
| F10 | ℹ️ | A2 «EXACTAMENTE o mesmo bloco» | Passe usa `color: COR.gold`; «Depositar PIX» usa `color: COR.pix` — **identificadores diferentes, mesmo valor** `#f5a623` (COR.pix = COR.gold) | Render idêntico; alegação aceitável |

## Alegações REFUTADAS
Nenhuma alegação **substantiva** caiu. Caíram duas formulações **literais** (o espírito mantém-se):

1. **(A3) «não sobra nenhuma referência a `botaoPrimario` em lado nenhum do repo» — REFUTADA no literal.**
   Prova: `git grep -n botaoPrimario bcbeeba` devolve 4 sítios textuais (comentário em
   PainelIndicacao.jsx:110; regex no utac109h2-carteira.test.mjs:185; logs MC99*; UTAC109h.3_SEG-1.md:30).
   **Em código, o uso é 0** — o objecto foi mesmo removido e nenhuma linha o invoca.
2. **(A5) «o histórico da decisão 5 … não foi apagado» — REFUTADA no literal.**
   Prova: o `git diff` removeu o bloco de comentário original (`// UTAC107b (decisão 5) — dourado SÓLIDO +
   texto navy #0a0f1a = 9,45:1`). O histórico **sobrevive**, mas noutro ponto (MinhaCarteira.jsx:33 mantém
   `9,45:1`; o teste preserva `2,03:1` e nomeia «decisão 5»). Não é o mesmo texto, é a mesma informação.

## Alegações que NÃO consegui refutar
1. **A1 (7 ficheiros)** — `git diff --name-status` dá exactamente os 7, com as acções A/M esperadas.
2. **A2 (Passe no bloco tingido; sem `COR.gold` nem `ON_GOLD`)** — o diff troca `background: COR.gold`/
   `color: ON_GOLD` por `rgba(245,166,35,0.14)`+`1px solid rgba(245,166,35,0.4)`+`color: COR.gold`+
   `boxShadow:"none"`, igual aos 3 irmãos. Tentei apanhar divergência (F10) e só achei alias `COR.pix`=`COR.gold`.
3. **A3 (espírito)** — «Copiar código» usa `style={botaoSecundario}` (igual ao «Compartilhar»); o objecto
   `botaoPrimario` do painel foi removido e não é invocado em código (grep + mutação M11 morde).
4. **A4 (nenhum sólido nas 2 peças)** — enumerei **todos** os botões: Carteira tem 4 no grid (todos
   sobrepõem), o «↻» e o «ver em Meus Ativos» (transparent), o «Carregar agora» (`background:none`); Painel
   tem 2 (ambos `botaoSecundario`). Nenhum renderiza `#f5a623` sólido. A sonda MUTANTE-A provou que a guarda
   apanha o regresso (teste 8 + teste do 106c falham). Não consegui refutar.
5. **A5 (invariante de contraste ≥ AA; par 7,25:1)** — recálculo independente dá **7,2463:1** para
   `#f5a623` sobre `#2d262f`, e o `#2d262f` confere (composição do tingido sobre o vidro). Sensível a
   variações do vidro, o par nunca desce de ~7,1. Teste morde (MUTANTE-A).
6. **A6 (970/970 · 1095/1101)** — reproduzido tal e qual, e o detalhe do backend (`fail 0`) confirma que os
   6 não-passantes são `skipped`, não falhas.
7. **A7 (11/11, baseline fail=0, M6/M11 renomeados)** — reproduzido; M6 = «CTA do Passe volta a dourado
   SÓLIDO», M11 = «Copiar código volta a cheio»; md5 do restauro idêntico (nada ficou mutado).
8. **A8 (nada mais mudou)** — só 7 ficheiros; os nomeados (GlassHeader/CartaoEdicao/Dashboard/backend/
   package/.bak/MLC/OP) não entram no diff; `box-sizing:border-box` ⇒ o `border` novo não desloca layout;
   a copy é a mesma (teste 7 «o texto visível não mudou» passa em CRLF).

## O que NÃO foi medido
- **RAM 1 470 MB** (auto-referido no SEG-1): não reproduzi qualquer medição de memória. Declarado, não verificado.
- **Render real / browser:** executor declara «prova estática sobre o código»; eu também não abri browser,
  nem fiz captura de ecrã, nem verificação de pixel. «Não renderiza sólido» é conclusão **estática**, não visual.
- **Baseline `e48acf6`:** não corri a suíte no baseline — logo não há A/B dos números (medi só `bcbeeba`).
- **Quais os 6 testes backend `skipped`** — contei-os (6), não os identifiquei.
- **Acessibilidade em render:** foco/outline, contraste do estado `disabled` (ambos os botões do painel ficam
  desactivados quando não há código) — não medidos.
- **Ecrã completo fora das 2 peças:** outros CTAs dourados sólidos (F9) e restantes ecrãs — fora do âmbito.

## Decisão
Fecho **autorizado** (0 bloqueantes). Antes de fechar, o executor deve:
1. **Corrigir a contradição/obsoletismo** em `MinhaCarteira.jsx:33` (F3): a frase «É o único par usado no CTA
   dourado» deixou de ser verdadeira — actualizar ou marcar como histórica, para o ficheiro não mentir.
2. **Reformular duas alegações no registo** (F1, F2) para reflectir o que é literal: «sem *uso* de código»
   (A3) e «histórico preservado noutro ponto, não o mesmo texto» (A5).
3. **Confirmar com o operador** a perda de hierarquia «Copiar código» = «Compartilhar» (F6) — se quiser
   manter distinção, é outro UTAC.
4. **Decidir sobre `ON_GOLD` morto** (F4): manter (contrato de teste do 106c, explícito) ou remover num UTAC
   próprio — hoje é só ruído.
5. **Corrigir o auto-relato** da spec/SEG-1 (F8: «4 dos 6» enumera 3).
