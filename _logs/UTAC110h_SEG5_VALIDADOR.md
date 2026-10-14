# UTAC110h — SEG5 · VALIDADOR ADVERSARIAL

**Commit validado:** `db10cc3` (pai `649ffd1`) · **Worktree:** `C:\Users\Moltbot\Desktop\wt-utac110h-val` (criado e removido com `scripts/worktree-helper.mjs`; 4 junctions removidas com `rmdir` antes do `git worktree remove` → exit 0; `node_modules` reais intactos: frontend **498**, functions **414**). Nada foi alterado no repo principal além deste ficheiro. Os meus instrumentos ficaram fora do repo (`%TEMP%\val110h\instr.mjs`, `mut2.mjs`).

## VEREDICTO: **APROVADO COM RESSALVAS — 0 bloqueantes**

As alegações centrais resistiram a instrumentos meus: (a) a transcrição é idêntica byte a byte, (b) a página publica exactamente as 2728 palavras do v5, pela mesma ordem e com a mesma estrutura de elementos, e (e)/(f) não tocou em nenhum ficheiro proibido nem em texto jurídico. As ressalvas são **fraquezas do teste** (4 mutantes meus sobrevivem), **uma contradição de produto anterior ao commit** que o executor não declarou (gate legal) e **2 problemas de design/acessibilidade** (rodapé fora do vidro).

---

## (a) REGULAMENTO-v5.md vs GUTO-REGULAMENTO.md — **NÃO REFUTADO**

Instrumento próprio (não o teste do autor):
```
tail -n +40 docs/GUTO-REGULAMENTO.md  > g.txt   # a partir de «REGULAMENTO OFICIAL DO DESAFIOGUT»
tail -n +13 docs/REGULAMENTO-v5.md    > v.txt
cmp g.txt v.txt  → IDÊNTICOS
sha256 (os dois) = e6163ee9655a272fb4c07493f13699d003e7efad5ff277e2b20cc9fe4b7d01bd · 17 944 B cada · 0 CR
```
- 72 linhas `^Art. Nº —`, numeração 1..72 sem lacunas; 12 `^CAPÍTULO`.
- `docs/GUTO-REGULAMENTO.md` em `db10cc3` tem o mesmo sha256 que em `649ffd1` (`b75a3a4b…`) — não foi tocado.
- O corpo do GUTO-REGULAMENTO começa na linha 40 e vai até ao fim; o preâmbulo e a ERRATA DA FONTE (linhas 1-39) ficaram de fora **por desenho** (desvio declarado pelo executor; o cabeçalho do v5 aponta para lá). Correcto: são anotações, não texto do Regulamento.
- Paridade com o runtime do GUTO: o início (5000 car.) e o fim (3000 car.) do corpo estão dentro de `_lib/guto-regulamento.mjs` → **true/true**.

## (b) A página vs o documento, palavra a palavra — **NÃO REFUTADO**

Instrumento próprio: carreguei o componente **REAL** pelo Vite (`opcoesServidorTeste` + `_ponte-ssr`), `renderToStaticMarkup`, retirei SÓ o «Sumário» e o link «Voltar ao app», descodifiquei entidades e comparei com o corpo do `.md` **como sequência ordenada** (não `includes`):
```
palavras doc 2728 · página 2728 → SEQUÊNCIA IGUAL (0 palavras perdidas, duplicadas ou trocadas)
elementos <p>/<li>/<h1>/<h2>/<h3>: página 133 · esperados 132 → a única diferença é o <p> vazio
  que envolvia o «← Voltar ao app» (que eu removi) — artefacto do meu instrumento, não da página.
```
- Os 4 parágrafos órfãos que o parser cola (encontrados por mim, independentemente): `#43` (Art. 20º ← «termos do Capítulo VI…»), `#88` (Art. 42º ← «edição, antes do despacho…»), `#110` (Art. 53º ← «Relâmpago) poderá ser realizada via PIX…») e `#134/#135` (rodapé). São exactamente os 4 declarados. Em nenhum o parágrafo anterior é um item de lista ⇒ **nenhuma continuação foi colada ao item errado** (o risco do `ultimo = {alvo: art.itens…}` não se materializa neste documento).
- Itens por artigo (da estrutura): Art. 2º:2 · 13º:5 · 16º:6 · 22º:6 · 25º:5 · 37º:2 · 43º:6 · 48º:2; tipos de bloco `{artigo:72, seccao:10}`, **0 parágrafos soltos**; 0 itens repetidos dentro de um artigo (não há colisão de `key={it}`).
- Conteúdo antigo: o JSX não contém texto jurídico; não há string das Regras v1.0 na página.

## (c) O teste é verde por acidente? — **PARCIAL (fraquezas reais, não bloqueantes)**

Autor no worktree: **19/19**. Bateria minha de 15 mutantes sobre `RegrasOficiais.jsx` (âncora contada = 1, entrada confirmada por md5, restauro md5 `8fbcebb32dddeb83d9f8146dbb45fe23` idêntico):

| mutante | resultado | teste que mordeu |
|---|---|---|
| M2b itens não desenhados | MORTO (2) | COBERTURA, PLAY |
| M6 continuação colada sem espaço | MORTO (1) | PARSER |
| M7 itens empurrados para o 1.º artigo do capítulo | MORTO (1) | PARSER |
| M8 secções não desenhadas | MORTO (1) | COBERTURA |
| M9 última palavra de cada item cortada | MORTO (2) | COBERTURA, PLAY |
| M10 rodapé omitido | MORTO (1) | COBERTURA |
| M11 1.º bloco de cada capítulo duplicado | MORTO (1) | ESTRUTURA (72 artigos) |
| M14 versão/vigência omitida | MORTO (2) | COBERTURA, ESTRUTURA h1 |
| **M1 texto de cada artigo DUPLICADO** | **SOBREVIVE** | — |
| **M3 frase jurídica escrita à mão** («O prêmio pode ser pago em dinheiro.») | **SOBREVIVE** | — |
| **M2 itens visualmente ANTES do artigo** (`column-reverse`) | **SOBREVIVE** | — |
| **M4 cor do corpo `#c9d3ee`→`#1a2040`** (ilegível) | **SOBREVIVE** | — |
| **M5 alvo do sumário 48→16 px** | **SOBREVIVE** | — |
| M13 títulos do sumário em minúsculas | SOBREVIVE | — (cosmético) |
| M12 (ultimo=null após Art. 19º) | EQUIVALENTE declarado (não há continuação depois do Art. 19º) | — |

Leitura: o núcleo (perda de texto, estrutura, uniões) está bem guardado. Mas a «COBERTURA TOTAL» usa `texto.includes(parágrafo)` ⇒ **mede presença, não igualdade**: texto **a mais** (duplicado ou inventado) passa. O guarda «a página não escreve texto jurídico à mão» só procura 5 literais ⇒ **M3** (uma cláusula falsa de prémio em dinheiro, que não existe no v5) passa verde. O meu instrumento (sequência de palavras igual + contagem de elementos) mataria M1, M3 e M11 — recomendo promovê-lo a teste (UTAC próprio). Contraste e alvo de toque não têm guarda (M4/M5).

## (d) Contradições GUTO ↔ página ↔ regulamento — **página = regulamento = GUTO; mas o app contradiz-se noutro sítio**

- página ⇄ `REGULAMENTO-v5.md` ⇄ corpo `GUTO-REGULAMENTO.md` ⇄ `_lib/guto-regulamento.mjs`: **iguais** (a, b acima).
- ⚠️ **NÃO declarado pelo executor (a Frente D lista Privacidade, guto-perfis, App.jsx, pontos de compra — mas não isto):** o **gate de consentimento** `src/components/TermosConsentimento.jsx` — o texto que o utilizador **aceita** antes de usar o app — continua a mostrar o regulamento **antigo**: «Art. 20 — As **senhas**, quando utilizadas na modalidade Programado, têm custo unitário de R$ 2,00» (`:130-131`), «lances por meio de … **senhas**, na modalidade Programado» (`:115`), «Art. 37 — Este regulamento está registrado…», «Art. 14 — O produto … não sendo admitida a sua conversão…», `VERSAO_CONSENTIMENTO = "2.0"`. ⇒ o mesmo app mostra, na mesma sessão, **dois regulamentos com numeração e mecânica diferentes** (Art. 20º do v5 = entrega por dropshipping; Art. 20 do gate = senhas) e o gate usa o termo **proibido** «senha». **Pré-existente** e fora do AUTORIZA deste UTAC — mas é a contradição de maior peso jurídico (é o texto aceite), e devia estar na lista escalada.
- `src/pages/Privacidade.jsx:77` «torneio de habilidade» — declarado pelo executor (confirmado).

## (e) Ficheiros proibidos tocados — **NÃO REFUTADO**

`git diff --name-only 649ffd1 db10cc3`:
```
_logs/UTAC110h.spec.yml · _logs/UTAC110h_SEG-1_MEDICAO.md · _logs/UTAC110h_SEG2_MUTACAO.txt
_logs/utac110h-browser/regras-1280.png · _logs/utac110h-browser/regras-375.png
desafio-gut/frontend/src/pages/RegrasOficiais.jsx
desafio-gut/frontend/src/pages/__tests__/utac106h-regras.test.mjs
docs/REGULAMENTO-v5.md · docs/regras-oficiais.md
```
Nenhum de `docs/GUTO-REGULAMENTO.md`, `_lib/guto-perfis.mjs`, `_lib/guto-regulamento.mjs`, `netlify/` (backend), `package*`, env.

## (f) Conteúdo jurídico alterado — **NÃO REFUTADO**

- Corpo do v5 = corpo do GUTO-REGULAMENTO byte a byte (a).
- `docs/regras-oficiais.md`: diff = **+5 linhas de banner** «⛔ SUBSTITUÍDO…» no topo; texto v1.0 intacto (0 linhas removidas).
- A página só une 4 parágrafos com um espaço (b: sequência de palavras igual).
- O cabeçalho do v5 (bloco `>`) é texto novo **não jurídico** (versão/vigência repetem o corpo; «Fonte de verdade…» / «Não alterar sem aprovação…» vêm do enunciado).

## (g) Screenshots — **existem e foram vistas**

- `regras-375.png` (750×1624, DPR 2): cartão de título (h1 + «Programa de Fidelidade Gamificado» + versão/vigência a dourado), Sumário com I–X visíveis, alvos altos (~48 px CSS), sem overflow lateral visível. A faixa vermelha «Ambiente de teste — rede Sepolia…» tapa a zona da barra inferior (servidor local sem env, declarado pelo executor).
- `regras-1280.png` (1280×900): Cap. III com Secções I-III, Arts. 12º-17º, listas I-VI do Art. 13º e 16º, rótulos «Art. Nº» a dourado, corpo legível no vidro; Sidebar com «📜 Regras Oficiais» activo.
- Limite: as capturas não mostram o rodapé nem o «← Voltar ao app» (ver (h)).

## (h) Design / acessibilidade

Contraste medido (WCAG 2.x) do vidro `rgba(13,18,53,0.92)` composto sobre o pior fundo (branco), sobre preto e sobre o dourado:

| texto | sobre vidro/branco | sobre vidro/preto |
|---|---|---|
| corpo `#c9d3ee` | **9,94:1** | 12,31:1 |
| muted `#8f9cc8` | **5,49:1** | 6,80:1 |
| dourado `#f5a623` | 7,34:1 | 9,09:1 |
| texto `#e8f0fe` | 12,98:1 | 16,07:1 |

Tudo AA dentro do vidro. Alvos do sumário: `minHeight: 48px`, linha inteira clicável → OK (mas sem guarda — M5).

- ⚠️ **H1 — rodapé e «← Voltar ao app» FORA do vidro (Regra 1 do 107a).** O `<p>` do rodapé (muted `#8f9cc8`, 0,8rem) e o link de volta são irmãos dos `GlassCard`, assentes directamente na ilustração de fundo. Contraste do muted sem vidro: **2,71:1 sobre branco**, 3,81:1 sobre `#3a3f5a`, 6,72:1 sobre navy ⇒ **depende da zona da imagem por baixo; pode reprovar AA**. O rodapé é texto jurídico (identificação CNPJ/versão). Não medi o pixel real por baixo (captura não o mostra).
- ℹ️ H2 — âncoras `#cap-i` com `BrowserRouter` (verificado em `main.jsx:113`) ⇒ navegação nativa por fragmento, OK; `scrollMarginTop: 1rem` não foi exercitado num browser com cabeçalho fixo — não medido.
- ℹ️ H3 — `key={i}` (índice) nos blocos e `key={linha}`/`key={it}` por texto: sem colisões neste documento (medido), frágil se o regulamento mudar.

---

## Achados

- ⚠️ **A1 (teste)** — COBERTURA mede presença, não igualdade: texto duplicado (M1) ou cláusula jurídica inventada (M3) passam verdes. Proposta: igualdade da sequência de palavras do conteúdo renderizado com o corpo do `.md` (o instrumento `instr.mjs` faz isto em <3 s).
- ⚠️ **A2 (produto, pré-existente, não declarado)** — o gate `TermosConsentimento.jsx` (texto aceite) contradiz o v5 publicado e usa «senhas». Escalar.
- ⚠️ **A3 (design)** — rodapé jurídico e link de volta fora do vidro; muted pode cair abaixo de 4,5:1.
- ℹ️ A4 — sem guarda de contraste (M4) nem de alvo de toque (M5) na página.
- ℹ️ A5 — suíte completa **não corrida** por mim: RAM livre 1256 MB < 1500 (A14). O teste isolado foi corrido: 19/19.
- ℹ️ A6 — `_logs/UTAC110h-regulamento.md` (entregável da Frente D) está **por commitar** no repo principal (`??`) — o commit `db10cc3` não o inclui.

## Comandos-chave

```
git diff --name-only 649ffd1 db10cc3
cmp <(tail -n +40 docs/GUTO-REGULAMENTO.md) <(tail -n +13 docs/REGULAMENTO-v5.md)
node %TEMP%\val110h\instr.mjs <frontend>     # render real → sequência de palavras + elementos
node %TEMP%\val110h\mut2.mjs  <frontend>     # 15 mutantes, md5 de entrada/restauro
cd desafio-gut/frontend && node --test src/pages/__tests__/utac106h-regras.test.mjs   → 19/19
node scripts/worktree-helper.mjs criar|remover ../wt-utac110h-val
```
