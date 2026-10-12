# UTAC110a · SEG3 — VALIDADOR ADVERSARIAL (tentativa de REFUTAÇÃO)

**Alvo:** commit `d2c8bea0f5f23e66ce72fe3e71b3b979c58501a3` (branch `main`).
**Repo:** `C:\Users\Moltbot\Desktop\DESAFIOGUT` (monorepo; frontend em `desafio-gut/frontend`).
**Worktree isolado e próprio:** `C:\Users\Moltbot\Desktop\DESAFIOGUT-wt-110a` (criado com o helper do repo).
**Baseline declarado:** `a9feb9b`. **Data da medição:** 2026-10-12.

---

## 0. Ambiente, worktree e RAM (regra A14)

Criação do worktree (helper do repo, A13 — **nunca** `rm -rf`/`git worktree remove`):

```
$ cd C:/Users/Moltbot/Desktop/DESAFIOGUT && node scripts/worktree-helper.mjs criar C:/Users/Moltbot/Desktop/DESAFIOGUT-wt-110a d2c8bea
{
  "path": "C:\\Users\\Moltbot\\Desktop\\DESAFIOGUT-wt-110a",
  "junctions": [
    "node_modules",
    "desafio-gut/node_modules",
    "desafio-gut/frontend/node_modules",
    "desafio-gut/frontend/netlify/functions/node_modules"
  ]
}
```

HEAD do worktree:

```
$ cd C:/Users/Moltbot/Desktop/DESAFIOGUT-wt-110a && git log --oneline -1
d2c8bea fix(UTAC110a): selo de estado do Mercado com texto navy -- WCAG AA (4,79-7,55:1) + teste de contraste
```

RAM livre (regra A14) — medida antes e durante as corridas:

```
$ powershell -NoProfile -c "[int]((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024)"
1765   (antes)
1587   (antes do teste isolado)
1589   (antes da suíte canónica)
```

Todas ≥ 1500 MB ⇒ **sem ressalva de RAM**. Nenhuma corrida foi feita em background.
Nenhum ficheiro de produção do repo principal foi alterado. A única escrita no repo principal
é este ficheiro.

---

## 1. Âmbito do commit (R3, R4, R5)

Ficheiros tocados **pelo próprio commit** `d2c8bea` (só ele):

```
$ git show --name-only --format="" d2c8bea
desafio-gut/frontend/src/components/TabelaLances.jsx
desafio-gut/frontend/src/components/__tests__/_stubs/leilaoLock.js
desafio-gut/frontend/src/components/__tests__/utac110a-selo-contraste.test.mjs
```

Ficheiros tocados **no intervalo** `a9feb9b..d2c8bea`:

```
$ git diff --name-only a9feb9b..d2c8bea
CLAUDE.md
_logs/UTAC109i-auditoria.md
_logs/UTAC109i_PERGUNTAS-OPUS.md
desafio-gut/frontend/src/components/TabelaLances.jsx
desafio-gut/frontend/src/components/__tests__/_stubs/leilaoLock.js
desafio-gut/frontend/src/components/__tests__/utac110a-selo-contraste.test.mjs
```

(`CLAUDE.md` + os 2 `_logs` são os 2 commits de docs já presentes em `ee476e2`, anteriores ao
`d2c8bea`; nenhum deles é código.)

**R3 — CartaoEdicao tocado? REFUTADO (não tocado).**

```
$ git diff --name-only a9feb9b..d2c8bea -- '*CartaoEdicao*'
(vazio)
```

**R4 — OfertasProgramadas (OP) tocada? REFUTADO (não tocada).**

```
$ git diff --name-only a9feb9b..d2c8bea -- '*OfertasProgramadas*'
(vazio)
$ git diff a9feb9b..d2c8bea --stat -- desafio-gut/frontend/src/pages/OfertasProgramadas.jsx
(vazio)
```

E o selo da OP mantém-se com o navy (linha 411, `color: "#0a0f1a"`):

```
$ grep -n "badge: {" desafio-gut/frontend/src/pages/OfertasProgramadas.jsx
411:  badge: { padding: "0.22rem 0.75rem", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 700, color: "#0a0f1a" },
```

**R5 — GlassHeader / MinhaCarteira tocados? REFUTADO (não tocados).**

```
$ git diff --name-only a9feb9b..d2c8bea -- '*GlassHeader*' '*MinhaCarteira*'
(vazio)
$ git diff a9feb9b..d2c8bea --stat -- '*MinhaCarteira*' '*GlassHeader*'
(vazio)
```

---

## 2. R1 — «O contraste do selo ainda é < 4,5:1 em algum estado»

Cálculo **independente**, com implementação própria (Python, WCAG 2.x — luminância relativa
`0.2126R+0.7152G+0.0722B`, linearização `c/12.92` se `c<=0.03928` senão `((c+0.055)/1.055)^2.4`),
a partir das cores reais de `src/utils/edicao.js` (`COR_ESTADO`):

```
estado        fundo     branco(antes)  navy(depois)
EM BREVE       #ff6b35    2.84           6.76
ATIVA          #10b981    2.54           7.55
ENCERRADA      #ef4444    3.76           5.09
INDISPONIVEL   #6b7db8    4.00           4.79

MIN navy ratio = 4.79 | >=4.5 ? True
MAX navy ratio = 7.55
max branco ratio = 4.0 | all white fail 4.5? True
```

O mínimo com o navy é **4,79:1** (INDISPONÍVEL), que **é ≥ 4,5:1**. Os valores do executor
(2,84 / 2,54 / 3,76 / 4,00 → 6,76 / 7,55 / 5,09 / 4,79) ficam **confirmados por cálculo
independente**.

Fonte única da paleta (não interpolada):

```
$ grep -n -A 5 "COR_ESTADO" desafio-gut/frontend/src/utils/edicao.js
35:const COR_ESTADO = {
36-  em_breve:     "#ff6b35",
37-  ativa:        "#10b981",
38-  encerrada:    "#ef4444",
39-  indisponivel: "#6b7db8",
40-};
```

→ **R1 REFUTADO**: nenhum estado fica abaixo de 4,5:1.

---

## 3. R2 — «O teste de contraste é CIRCULAR (compara a mesma constante)»

Onde o teste lê as cores (ficheiro
`desafio-gut/frontend/src/components/__tests__/utac110a-selo-contraste.test.mjs`):

```
85:  const cor = estilo.match(/(?:^|;)\s*color:([^;]+)/)?.[1];
86:  const fundo = estilo.match(/(?:^|;)\s*background:([^;]+)/)?.[1];
```

Ambas saem do **estilo inline do `<span>` renderizado** (`renderToStaticMarkup`), capturado por
`seloDe(html)` a partir do markup — não de constantes copiadas para o teste. Prova de que o markup
real traz o par:

```
$ cd C:/Users/Moltbot/Desktop/DESAFIOGUT-wt-110a/desafio-gut/frontend && node _tmp-validador-markup.mjs
[EM BREVE] fundo_markup=#ff6b35 cor_markup=#0a0f1a esperado_cor=#ff6b35 esperado_badge="🕒 Em breve"
    texto_markup="">🕒 Em breve" | razao(navy)=6.76 razao(branco)=2.84
[ATIVA] fundo_markup=#10b981 cor_markup=#0a0f1a esperado_cor=#10b981 esperado_badge="🟢 Ativo"
    texto_markup="">🟢 Ativo" | razao(navy)=7.55 razao(branco)=2.54
[ENCERRADA] fundo_markup=#ef4444 cor_markup=#0a0f1a esperado_cor=#ef4444 esperado_badge="🔴 Encerrado"
    texto_markup="">🔴 Encerrado" | razao(navy)=5.09 razao(branco)=3.76
getEstadoEdicao({}, {}) = "indisponivel" #6b7db8

(Nota: o `">` no início de `texto_markup` é artefacto do MEU script temporário — recorta uma
posição a menos no slicing. O `seloDe` do TESTE usa o match completo (`tag[0]`), pelo que não
tem este artefacto; o conteúdo do rótulo é o que conta e está correcto. O script temporário foi
apagado do worktree no fim.)
```

O texto (`cor`) é o literal `color: "#0a0f1a"` de `TabelaLances.jsx`; o fundo (`fundo`) é o
`est.cor` de `edicao.js`. **São duas fontes distintas** — o teste cruza-as, não as iguala. O
`getEstadoEdicao` carregado é o **real** (`/src/utils/edicao.js` via Vite SSR); o único duplo é o
`leilaoLock` (para tornar ATIVA/ENCERRADA alcançáveis, pois `EM_BREVE_MODE` real é `true`).

Dose de bidireccionalidade (A3): o branco antigo tem de REPROVAR o mesmo cálculo — e reprova
(2,84 / 2,54 / 3,76), pelo que o teste não é verde por construção.

**RESSALVA MEDIDA (não invalida o acima):** no sub-teste **A2** o fundo é um **literal do próprio
teste**, não lido do markup:

```
133:  const cor = "#6b7db8";
```

(A2 justifica-o: o estado INDISPONÍVEL **não é alcançável** por este componente — o `encerrado` é
sempre booleano, logo `derivar()` só devolve `ENCERRADA`/`ATIVA` (+`EM_BREVE`), nunca
`INDISPONIVEL`.)  Ou seja: a acusação «compara a mesma constante» **não se sustenta** no núcleo
(A1: 3 estados medidos no markup); apenas A2 usa uma constante copiada, e fá-lo declaradamente.

→ **R2 REFUTADO** (com a ressalva de A2 acima).

---

## 4. R6 — «O contraste calculado à mão difere do calculado pelo teste»

Funções do teste (`luminancia`/`razao`, linhas ~69-79) reproduzidas e corridas em Node:

```
$ node -e '... mesmas fórmulas ...'
EMBREVE navy= 6.76 branco= 2.84
ATIVA navy= 7.55 branco= 2.54
ENCERRADA navy= 5.09 branco= 3.76
INDISP navy= 4.79 branco= 4.00
```

Os meus números (Python, §2), os do teste (Node) e os do executor são **idênticos** célula a
célula. A fórmula usada pelo teste é exactamente a WCAG 2.x (`c <= 0.03928 ? c/12.92 :
((c+0.055)/1.055)^2.4`, pesos `0.2126/0.7152/0.0722`). O limiar AA usado é `4.5` (texto normal —
o selo é `0.7rem`/`700`, portanto **não** é «texto grande»).

→ **R6 REFUTADO**: não há divergência.

---

## 5. R7 — «O selo perdeu funcionalidade (deixou de mostrar estado)»

O componente continua a renderizar rótulo + fundo com a cor do estado
(`TabelaLances.jsx`):

```
124:          <span style={{ ...estilos.statusBadge, background: est.cor }}>
125:            {est.badge}
```

Markup real (§3): `fundo_markup` = cor do estado, e o texto do selo é o rótulo
`"🕒 Em breve"` / `"🟢 Ativo"` / `"🔴 Encerrado"` — que coincide com `esperado_badge` do
`getEstadoEdicao` real. O sub-teste A1 assere `selo.fundo === esperado.cor` e
`selo.texto.includes(esperado.badge)`, e A5 assere que o resto do selo (padding, raio, tamanho,
peso) e o único ponto de uso (`<span style={{ ...estilos.statusBadge, background: est.cor }}>`)
estão intactos.

→ **R7 REFUTADO**: o selo mostra estado (cor + rótulo) como antes.

---

## 6. R8 — «A correcção foi cosmética e não resolve o problema»

O texto passou a navy `#0a0f1a` (quase-preto, luminância 0,0048) sobre fundos **opacos**
(`background: est.cor`, hex de 6 dígitos — sem alpha, sem `blur`, logo sem tingimento pelo vidro).
Razões reais por estado (markup, §3):

| estado | fundo (opaco) | texto | razão | AA (4,5) | AAA (7,0) |
|---|---|---|---|---|---|
| EM BREVE | `#ff6b35` (laranja) | `#0a0f1a` | 6,76 | passa (folga 50%) | não |
| ATIVA | `#10b981` (verde) | `#0a0f1a` | 7,55 | passa | passa |
| ENCERRADA | `#ef4444` (vermelho) | `#0a0f1a` | 5,09 | passa (folga 13%) | não |
| INDISPONÍVEL | `#6b7db8` (azul-acinzentado) | `#0a0f1a` | **4,79** | passa (folga **6,4%**) | não |

Legibilidade real: nos **3 estados alcançáveis** por este componente o pior caso é ENCERRADA com
**5,09:1** (confortável). O único caso apertado é INDISPONÍVEL (4,79:1, ~6% acima do limiar), mas
**esse estado não é alcançável** pela `TabelaLances` (§3) — a régua vale para ele apenas por
prudência, porque a cor vive na mesma fonte única. Nenhum estado alcançável é visualmente
duvidoso.

Nota (não pedida, sem efeito no veredicto): os glifos `🕒/🟢/🔴` são emoji — a propriedade CSS
`color` não controla a sua cor de tinta (são glifos coloridos por fonte). O texto **da frase**
(«Em breve»/«Ativo»/«Encerrado») é que usa `color`. Isto é anterior a este commit e igual ao selo
da OP.

→ **R8 REFUTADO**: a correcção é do par texto/fundo real e o texto é legível (≥ 4,79:1; ≥ 5,09:1
nos estados alcançáveis).

---

## 7. Suíte canónica no worktree limpo (baseline da validação)

```
$ cd C:/Users/Moltbot/Desktop/DESAFIOGUT-wt-110a && node scripts/mc966-suite-harness.mjs ambos
frontend: VERDE 979/979 pass
backend: VERDE 1095/1101 pass
VEREDITO: VERDE
real    2m44,932s
```

Bate com o declarado (frontend 979/979; backend 1095/1101).

Teste novo isolado (9/9):

```
$ cd .../desafio-gut/frontend && node --test --test-concurrency=1 src/components/__tests__/utac110a-selo-contraste.test.mjs
✔ A1 · selo EM BREVE: contraste ≥ 4.5:1 medido no MARKUP renderizado
✔ A1 · selo ATIVA: contraste ≥ 4.5:1 medido no MARKUP renderizado
✔ A1 · selo ENCERRADA: contraste ≥ 4.5:1 medido no MARKUP renderizado
✔ A2 · INDISPONÍVEL (4.º estado herdado): a cor do selo também passa o AA sobre `#6b7db8`
✔ A3 · EM BREVE: o branco ANTIGO (#ffffff) reprova o mesmo cálculo (o teste morde)
✔ A3 · ATIVA: o branco ANTIGO (#ffffff) reprova o mesmo cálculo (o teste morde)
✔ A3 · ENCERRADA: o branco ANTIGO (#ffffff) reprova o mesmo cálculo (o teste morde)
✔ A4 · o selo do Mercado usa a MESMA cor de texto do selo da OP (replicação do 109g)
✔ A5 · o resto da `statusBadge` não mudou (padding, raio, tamanho, peso)
ℹ tests 9  ℹ pass 9  ℹ fail 0
```

---

## 8. MUTAÇÃO no worktree (R16) — a suíte morde?

Mutação em `desafio-gut/frontend/src/components/TabelaLances.jsx` (só no worktree):

```
-    fontSize: "0.7rem", fontWeight: "700", color: "#0a0f1a",
+    fontSize: "0.7rem", fontWeight: "700", color: "#fff",
```

md5 do ficheiro mutado: `4f094a09a984cc89ed0a1debdb2aa7eb`.

Suíte (harness):

```
$ node scripts/mc966-suite-harness.mjs frontend
frontend: VERMELHO 8 falha(s)
VEREDITO: VERMELHO
```

Contagem exacta e localização (`node --test` sobre os ficheiros de `src/`):

```
ℹ tests 979
ℹ pass 971
ℹ fail 8
```

As 8 falhas (todas do ficheiro novo):

```
✖ A1 · selo EM BREVE: contraste ≥ 4.5:1 medido no MARKUP renderizado
✖ A1 · selo ATIVA: contraste ≥ 4.5:1 medido no MARKUP renderizado
✖ A1 · selo ENCERRADA: contraste ≥ 4.5:1 medido no MARKUP renderizado
✖ A2 · INDISPONÍVEL (4.º estado herdado): a cor do selo também passa o AA sobre `#6b7db8`
✖ A3 · EM BREVE: o branco ANTIGO (#ffffff) reprova o mesmo cálculo (o teste morde)
✖ A3 · ATIVA: o branco ANTIGO (#ffffff) reprova o mesmo cálculo (o teste morde)
✖ A3 · ENCERRADA: o branco ANTIGO (#ffffff) reprova o mesmo cálculo (o teste morde)
✖ A4 · o selo do Mercado usa a MESMA cor de texto do selo da OP (replicação do 109g)
```

Prova de que **todas** apontam para o ficheiro novo — 8 linhas `test at`, todas com o mesmo path:

```
$ sed -n '2862,2990p' mut-out.txt | grep -E "^test at"
test at src\components\__tests__\utac110a-selo-contraste.test.mjs:110:3
test at src\components\__tests__\utac110a-selo-contraste.test.mjs:110:3
test at src\components\__tests__\utac110a-selo-contraste.test.mjs:110:3
test at src\components\__tests__\utac110a-selo-contraste.test.mjs:127:1
test at src\components\__tests__\utac110a-selo-contraste.test.mjs:140:3
test at src\components\__tests__\utac110a-selo-contraste.test.mjs:140:3
test at src\components\__tests__\utac110a-selo-contraste.test.mjs:140:3
test at src\components\__tests__\utac110a-selo-contraste.test.mjs:152:1
$ grep -c "^test at" mut-out.txt
8
```

Mensagem de asserção real (exemplo):

```
AssertionError [ERR_ASSERTION]: selo EM BREVE: texto #fff sobre fundo #ff6b35 dá 2.84:1 (< 4.5:1) — REPROVA o WCAG AA
```

Observação verificada: com o branco, **A5 continua a PASSAR** (não olha à cor), pelo que o
total é 8 falhas em 9 testes — coerente com o declarado. O nome `A3 · ` também aparece noutro
ficheiro (`src/pages/__tests__/utac109g-op-alinhamento.test.mjs:98`, teste `"A2/A3 · 1.º vidro…"`),
mas é um nome diferente e **não** está entre as falhas.

**Restauro e prova de identidade:**

```
$ md5sum desafio-gut/frontend/src/components/TabelaLances.jsx
c108510c3731d2fa38ed4f52776651d0 *desafio-gut/frontend/src/components/TabelaLances.jsx
$ git status --porcelain -- desafio-gut/frontend/src/components/TabelaLances.jsx
(vazio — idêntico ao commit d2c8bea)
```

md5 pós-restauro = **c108510c3731d2fa38ed4f52776651d0**, exactamente o declarado no commit.

---

## 9. Veredicto

| Alegação | Resultado |
|---|---|
| R1 · contraste < 4,5:1 em algum estado | **REFUTADO** — mínimo 4,79:1 (INDISPONÍVEL); alcançáveis ≥ 5,09:1 |
| R2 · teste circular (mesma constante) | **REFUTADO** (ressalva: A2 usa o literal `#6b7db8`) |
| R3 · CartaoEdicao tocado | **REFUTADO** — diff vazio |
| R4 · OP tocada | **REFUTADO** — diff vazio |
| R5 · GlassHeader / MinhaCarteira tocados | **REFUTADO** — diff vazio |
| R6 · cálculo à mão ≠ cálculo do teste | **REFUTADO** — idênticos (6,76/7,55/5,09/4,79) |
| R7 · selo perdeu função | **REFUTADO** — mantém cor de fundo do estado + rótulo |
| R8 · correcção cosmética inepta | **REFUTADO** — par texto/fundo real, legível em todos os estados |

**VEREDICTO GLOBAL: APROVADO.**

Não consegui refutar nenhuma das 8 alegações. Prova de mordedura (mutação R16) obtida:
branco reintroduzido ⇒ 8 falhas exactas, todas do teste novo; restauro com md5 idêntico.

### Lacunas / ressalvas declaradas
1. **A2** assere contra um fundo **literal do teste** (`#6b7db8`), não lido do markup — check mais
   fraco que A1, embora justificado (estado não alcançável pelo componente).
2. **INDISPONÍVEL** (4,79:1) é o pior caso e tem margem estreita (~6%) — mas **não é alcançável**
   pela `TabelaLances`; é medido por prudência sobre a fonte única.
3. Valores de contraste são por **luminância relativa** e válidos porque o fundo é **opaco**
   (`background: est.cor`, hex sem alpha); não medi renderização real em browser (fora do escopo
   do teste SSR).
4. A suíte backend (1095/1101) foi corrida, mas não foi alvo de mutação (o commit não toca backend).

### Nota de NÃO-MEDIÇÃO
Nada do pedido ficou NAO_MEDI. Todas as 8 alegações foram atacadas com comando + saída reais.
A RAM livre manteve-se ≥ 1500 MB em todas as corridas, pelo que nenhum vermelho desta validação
é atribuível a pressão de memória (falha falsa tipo erro 1450 / queda do Vite).
