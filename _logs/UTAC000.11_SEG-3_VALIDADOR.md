# VEREDICTO — Validação adversarial do commit `dec577d` (UTAC000.11 / DEBT-011)

**Validador:** subagente adversarial independente
**Data:** 2026-10-01
**Commit validado:** `dec577d` («fix(UTAC000.11): guarda do vencedor em MercadoLances (DEBT-011)»). No arranque, HEAD de `main`, 1 à frente de `origin/main` = `6282d8d` — **ver §RE-ANCORAGEM: o alvo foi empurrado a meio**.
**Worktree isolado:** `C:/Users/Moltbot/tmp-utac0011-val/fe` (detached em `dec577d`). Árvore principal **não tocada**.
**Postura:** tentar **REFUTAR**. Todos os números abaixo são medições minhas, não transcrições.

---

## ⚠️ RE-ANCORAGEM (o alvo moveu-se a meio da auditoria)

No arranque, HEAD = `dec577d` e `origin/main` = `6282d8d` («ainda NÃO pushado»). **No fim:** HEAD = `79f56ef` e **`origin/main` = `79f56ef`** — um **agente irmão commitou e empurrou** durante a auditoria.

```
$ git log --oneline -2
79f56ef docs(UTAC000.11): medicao, reproducao, evidencias e fecho da DEBT-011 (R14/R18)
dec577d fix(UTAC000.11): guarda do vencedor em MercadoLances (DEBT-011)
$ git merge-base --is-ancestor dec577d HEAD  → SIM (dec577d é ancestral)
$ git diff --name-only dec577d HEAD | grep -vE "_logs/|\.md$"  → (VAZIO: só docs/logs)
$ git rev-parse HEAD:…/MercadoLances.jsx     → 94a74910cbcc5a8d71b9f2f42ff5479e22be77a4
$ git rev-parse dec577d:…/MercadoLances.jsx  → 94a74910cbcc5a8d71b9f2f42ff5479e22be77a4  ← IDÊNTICO
```
O commit novo é **só documentação** (`CLAUDE.md`, `_logs/DEBT.md`, `_logs/UTAC000.11*`) e **não toca no código validado** (blob do `MercadoLances.jsx` inalterado) ⇒ **este veredicto mantém-se válido sem re-correr nada**. Mas o pressuposto do briefing «commit ainda NÃO pushado» ficou **falso a meio**; o push deixou de ser decisão pendente. Declarado, não corrigido.

---

## VEREDICTO: **APROVA (com ressalvas)**

A alegação **no seu escopo literal** («um `vencedor` malformado com endereço ou valor **ausentes/null** deixou de rebentar e mostra «—»; com um `vencedor` válido nada muda») fica **PROVADA por medição**. Tentei refutá-la em 6 frentes e falhei nas 6 no que respeita ao escopo literal.

**MAS** a **regra declarada mais ampla** pelo autor — no commit («malformado = ausente, CAMPO A CAMPO») e no comentário do código (l. 70: «Um `vencedor` MALFORMADO não pode rebentar o overlay») — **é FALSA como afirmação geral**: a guarda é só de *truthiness*, pelo que um `endereco` **presente-mas-não-string** (número, boolean, objecto) **continua a rebentar** com um `TypeError` diferente (`...slice is not a function`). Medido, 3 casos (Foco 1). Não bloqueia o push (o overlay está hoje inalcançável — Foco 7), mas a alegação/comentário deve ser estreitado **ou** a guarda endurecida numa linha.

---

## Setup (medido)

```
$ cd /c/Users/Moltbot/Desktop/DESAFIOGUT && git rev-parse --short HEAD && git log --oneline -3
dec577d
dec577d fix(UTAC000.11): guarda do vencedor em MercadoLances (DEBT-011)
6282d8d docs(UTAC000.10): DEBT-011 (sem guarda no OverlayVencedor) + custo e limite de tempo declarados
25c783c docs(UTAC000.10): veredicto SEG3 (APROVA com ressalvas) + correccao de conclusao da premissa + DEBT-010

$ git worktree add --detach C:/Users/Moltbot/tmp-utac0011-val/fe dec577d
Preparing worktree (detached HEAD dec577d) … HEAD is now at dec577d …

$ md5sum .../src/pages/MercadoLances.jsx   → 48c619176a777765fa120938712a8509  (disco, CRLF)
$ git hash-object .../MercadoLances.jsx    → 94a74910cbcc5a8d71b9f2f42ff5479e22be77a4
$ git rev-parse HEAD:.../MercadoLances.jsx → 94a74910cbcc5a8d71b9f2f42ff5479e22be77a4   ← ficheiro PRISTINO
```

Junctions (`node_modules`) por `New-Item -ItemType Junction` (PowerShell), frontend **e** `netlify/functions`. Confirmado no fim: `frontend/node_modules` = **505** entradas, `netlify/functions/node_modules` = **417** — as árvores reais **intactas**.

**Escopo do commit (numstat):**
```
$ git show dec577d --numstat
13	2	desafio-gut/frontend/src/pages/MercadoLances.jsx
51	0	desafio-gut/frontend/src/pages/__tests__/utac0010-mercado-vencedor.test.mjs
```
Só os 2 ficheiros declarados. O teste é `51 0` ⇒ **nenhuma linha pré-existente apagada ou alterada**.

---

## Foco 1 — A guarda cobre TODOS os casos? **NÃO.** 3 REBENTAM.

Sonda própria (`val0011-adv.mjs`, SSR com o mesmo arnês de alias do autor; **não** toca no ficheiro de testes dele):

```
$ node val0011-adv.mjs
ok       | (controlo) válido                  | ["0xaaaa0000...000001","R$ 3.00"]
ok       | {} vazio                           | ["—","—"]
ok       | null                               | (sem bloco vencedor; mostraSemLance=true)
ok       | endereco null                      | ["—","—"]
ok       | endereco undefined explícito       | ["—","R$ 3.00"]
ok       | endereco 0                         | ["—","—"]
ok       | endereco ''                        | ["—","—"]
ok       | endereco []                        | ["...","—"]           ← ABSURDO (não rebenta)
REBENTA  | endereco 12345 (número)            | TypeError: vencedor.endereco.slice is not a function
REBENTA  | endereco true (boolean)            | TypeError: vencedor.endereco.slice is not a function
REBENTA  | endereco {} (objecto)              | TypeError: vencedor.endereco.slice is not a function
ok       | endereco '0x' (curto)              | ["0x...0x","—"]
ok       | endereco EU.toUpperCase()          | ["0XAAAA0000...000001","R$ 3.00"]
ok       | valor NaN                          | ["0xaaaa0000...000001","—"]
ok       | valor Infinity                     | ["0xaaaa0000...000001","—"]
ok       | valor -Infinity                    | ["0xaaaa0000...000001","—"]
ok       | valor -1                           | ["0xaaaa0000...000001","R$ -0.01"]   ← ABSURDO (não rebenta)
ok       | valor 0                            | ["0xaaaa0000...000001","R$ 0.00"]
ok       | valor 1                            | ["0xaaaa0000...000001","R$ 0.01"]
ok       | valor 12345                        | ["0xaaaa0000...000001","R$ 123.45"]
ok       | valor '300' (string)               | ["0xaaaa0000...000001","—"]
ok       | valor true (boolean)               | ["0xaaaa0000...000001","—"]
ok       | valor null                         | ["0xaaaa0000...000001","—"]
ok       | valor BigInt 300n                  | ["0xaaaa0000...000001","—"]
ok       | Object.create(null)                | ["—","—"]
ok       | Object.create(null) c/ valor bom   | ["0xaaaa0000...000001","R$ 3.00"]

--- RESULTADO: 3 REBENTA · 0 saída suspeita · 26 casos ---
```

E a 2.ª sonda (`val0011-adv2.mjs`) mostra que `vencedor` **não-objecto** (5, `'abc'`, `true`, `[]`, `[1,2]`, função, Symbol) **não** rebenta — a guarda cobre esses. O furo é **específico de `endereco` *truthy* e não-string**.

**Contra-exemplo com reprodução mínima:**
```js
renderizar({ showOverlay: true, vencedor: { endereco: 12345 }, lances: [] })
// TypeError: vencedor.endereco.slice is not a function
// (idem com  { endereco: true }  e  { endereco: {} })
```
Causa exacta: a guarda é `vencedor?.endereco ? … : "—"` — testa **truthiness**, não **tipo**. `Number.prototype.slice`/`Object.prototype.slice` não existem. O valor `0`/`""`/`null`/`undefined` é apanhado; um valor *presente mas não-string* passa a guarda e rebenta na linha seguinte.

**Reachability (medida, para não inflacionar a severidade):**
- Caminho **oficial** — `AppContext.jsx:714-716` → `normalizarResultadoOficial` (`useResultadoOficial.js:50-57`) exige `ENDERECO_RE = /^0x[0-9a-fA-F]{40}$/` sobre `String(r.vencedor ?? "")` ⇒ **garante string** e `Number.isInteger(menorUnicoCentavos)` ⇒ **garante valor inteiro finito**. Nunca produz endereço não-string.
- Caminho **local** — `vencedorLocal` (`AppContext.jsx:700`) vem de `lances` / `lancesFlash`, alimentados em `AppContext.jsx:797-803` com `endereco: lance.endereco` — **dados de fora** (Supabase/API). Só se a fonte devolvesse um número/objecto aqui chegaria ao overlay; implausível com o esquema actual, **não impossível**.
⇒ O furo é **latente**, não um defeito explorável — coerente com o que o próprio commit declara. **Ressalva, não bloqueio.**

**Conclusão Foco 1:** a alegação literal («ausentes/null») **resiste**; a regra declarada «malformado = ausente, campo a campo» **é refutada** (3 crashes) e `endereco: []` mostra `"..."` em vez de `"—"`.

---

## Foco 2 — O caso VÁLIDO mudou? **NÃO.** (GATE 18 confirmado por md5 do bloco)

`val0011-ab.mjs` compara o HTML renderizado de `dec577d` (novo) com o de `6282d8d` (antigo), mesmo contexto, para 9 casos válidos.

⚠️ **Armadilha de instrumento (a minha, corrigida):** o md5 da **página inteira** NÃO é comparável — o `<Confetti/>` usa `Math.random()` na posição das partículas. A unidade comparável é o **bloco do overlay** (`Carteira Vencedora` → `Nova Rodada`).

```
CONTROLO md5 sensível: NOVO(300)=075016ea vs NOVO(301)=c0abd710 -> difere (ok)
CONTROLO bloco sensível: bloco(300)=61e03380 vs bloco(301)=e9af703c -> difere (ok)
CONTROLO A/B defeito: ANTIGO com {endereco:null} -> REBENTA (Cannot read properties of null (reading 'slice'))
CONTROLO A/B defeito: NOVO com {endereco:null} -> NÃO rebenta

DIFERE   | pagina=597e3edc vs 0572f8c9 | bloco=igual | válido 300 / EU
DIFERE   | pagina=9c3f6de4 vs 56a1d634 | bloco=igual | válido 1 (R$ 0.01)
DIFERE   | pagina=4f01fc02 vs 324c026c | bloco=igual | válido 12345 (R$ 123.45)
DIFERE   | pagina=b94aaec0 vs 267c3914 | bloco=igual | válido 0 (R$ 0.00)
DIFERE   | pagina=6aa46a6b vs 6aaddab3 | bloco=igual | válido 99.999.999 centavos
DIFERE   | pagina=2666a98a vs 064eab58 | bloco=igual | válido caixa mista
DIFERE   | pagina=c6185f9b vs 3a2595f4 | bloco=igual | sem vencedor (null)
IDENTICO | pagina=b30c9b6b vs b30c9b6b | bloco=igual | showOverlay=false
IDENTICO | pagina=b30c9b6b vs b30c9b6b | bloco=igual | showOverlay=false + null
--- A/B: 7 de 9 casos válidos DIFEREM ---
```

**Prova de que a diferença da página é SÓ o `Confetti` (ruído), não a guarda:** no caso `vencedor: null` **novo e antigo produzem o mesmo bloco** (ambos caem no ramo `: "—"` / «Nenhum lance único»), e no entanto o md5 da **página** difere; e com `showOverlay=false` (sem `Confetti`) o md5 é **byte-idêntico** nos dois. Logo a não-determinância está confinada ao `Confetti`.

**Formatação dos centavos (medida na sonda, novo):** `0 → "R$ 0.00"`, `1 → "R$ 0.01"`, `12345 → "R$ 123.45"` — inalterados face ao antigo.
**`bloco=igual` nos 9/9** (com controlo que prova que o comparador detecta diferenças) ⇒ **nada muda no que o utilizador vê quando o `vencedor` é válido.** GATE 18 **confirmado**.

A/B do **2.º defeito** (endereço presente, valor ausente) — `val0011-adv2.mjs`:
```
ANTIGO 6282d8d  | {"endereco":"0xaaaa…0001"}              | ["0xaaaa0000...000001","R$ NaN"]   ← o defeito
NOVO dec577d    | {"endereco":"0xaaaa…0001"}              | ["0xaaaa0000...000001","—"]
ANTIGO 6282d8d  | {"endereco":"0xaaaa…0001","valor":"300"} | ["0xaaaa0000...000001","R$ 3.00"]
NOVO dec577d    | {"endereco":"0xaaaa…0001","valor":"300"} | ["0xaaaa0000...000001","—"]
ANTIGO 6282d8d  | {"endereco":"0xaaaa…0001","valor":null}  | ["0xaaaa0000...000001","R$ 0.00"]
NOVO dec577d    | {"endereco":"0xaaaa…0001","valor":null}  | ["0xaaaa0000...000001","—"]
```
⇒ «R$ NaN» **reproduzido** no código antigo e **suprimido** no novo. As duas últimas linhas são **mudanças de exibição em entradas MALFORMADAS** (`"300"`, `null`) — conformes com a regra «malformado = ausente»; **não** violam «nada muda com vencedor válido».

---

## Foco 3 — Alguma mutação não morde? **Mordem as duas. Os números conferem (4 RED cada).**

`val0011-mut.mjs` — restauro a partir de **cópia de segurança em bytes** fora do repo (**nunca** `git checkout --`), com contagem de âncora e md5 antes/depois.

```
ORIGINAL md5(disco)=48c619176a777765fa120938712a8509 md5(LF)=83f214924dc022855d6e7270575d2be5 bytes=16976
EOL detectado: CRLF

===== BASELINE (dec577d, intocado) =====
  pass=12 fail=0 mortos=[]

===== M13a — guarda do endereço fora =====
  âncora ocorre 1x (esperado 1)
  RESULTADO: pass=8 fail=4 | MORTOU: [objecto vazio / endereço null, valor 0 / sem endereço, valor presente / endereço e valor null]
  RESTAURO md5=48c619176a777765fa120938712a8509 (idêntico OK)

===== M13b — guarda do valor fora =====
  âncora ocorre 1x (esperado 1)
  RESULTADO: pass=8 fail=4 | MORTOU: [objecto vazio / endereço presente, sem valor / endereço e valor null / valor não numérico]
  RESTAURO md5=48c619176a777765fa120938712a8509 (idêntico OK)
```
*(o medidor de nomes do reporter `spec` repete cada teste morto — 4 nomes únicos, confirmados por inspecção.)*

**Declarado: M13a → 4 RED, M13b → 4 RED. Medido: 4 RED, 4 RED. Confere exactamente.** Restauros byte-idênticos (md5 igual).

### Teste vácuo? **Não.** Os 12 testes (novos) contra o código **ANTIGO**:
```
===== VACUIDADE: 12 testes (novos) contra o código ANTIGO 6282d8d =====
  pass=6 fail=6
  → 6 testes PASSAM com o código SEM guarda.
```
Aritmética: 6 que passam = 4 testes originais do UTAC000.10 + 2 controlos do caso válido (que, por desenho, não asseram mudança). Os **6 casos malformados** da tabela **morrem todos** no código antigo ⇒ **cada um morde**. Nenhum teste novo é vácuo.

### ⚠️ Desvio na evidência DECLARADA pelo autor (auditoria da prova alheia, skill §1.6)

A evidência commitada em `_logs/UTAC000.11_SEG-2_ANTES-DEPOIS.txt` (l. 17) declara, para o GATE 6a:
```
$ node --test … utac0010-mercado-vencedor.test.mjs
# tests 12 · # pass 7 · # fail 5        ← RED com os stack traces:  (5 grupos)
    …undefined (reading 'slice')  ({} e {valor:300})
    …null (reading 'slice')       ({endereco:null,…} e {endereco:null,valor:null})
    «o overlay mostrou «R$ NaN»»  ({endereco:EU} sem valor)
```
**A minha re-medição contra o código `6282d8d` (o mesmo «antes») com o ficheiro de teste COMITADO dá `pass=6 · fail=6`** — falta um caso na lista do autor: **`{ endereco: EU, valor: "300" }` (valor não numérico)**, que no código antigo mostra `"R$ 3.00"` (não `"—"`) e por isso **tem** de falhar. Os outros 5 grupos conferem.

Leitura honesta: a evidência «ANTES» do autor está **SUB-relatada** (5 em vez de 6) — provavelmente o caso foi endurecido de `valor: 300` para `valor: "300"` **depois** de correr o «antes», sem re-medir. Direcção do desvio: o RED real é **mais forte** do que o declarado, logo **não enfraquece** a prova da correcção; é **imprecisão de evidência** (ℹ️), não defeito. Os números de M13a/M13b (4 RED cada) e o md5 `48c619176a777765fa120938712a8509` **conferem exactamente** com o meu worktree (§Foco 3 acima).

---

## Foco 4 — Outros pontos sem guarda no `MercadoLances.jsx`? **1 irmão no Dashboard; no ficheiro-alvo, só os que a guarda cobre.**

Varrimento próprio:
```
$ grep -nE "\.slice\(|\.toFixed\(|\.endereco|\.valor|txHash|lances\b" .../MercadoLances.jsx
79:  const enderecoAbrev = vencedor?.endereco          ← guardado
80:    ? `${vencedor.endereco.slice(0, 10)}...${vencedor.endereco.slice(-6)}`
82:  const valorFmt = Number.isFinite(vencedor?.valor)  ← guardado
83:    ? `R$ ${(vencedor.valor / 100).toFixed(2)}`
186/190/262:  meuUltimoLance?.valor ...              ← optional chaining, seguro
269:  <TabelaLances lances={lances} …/>               ← pass-through (a tabela é outro ficheiro, fora do escopo)
```
⇒ No `MercadoLances.jsx` **não há outro sítio** que rebente com dados malformados.

**Irmão (fora do commit, DEBT de arrasto):** `Dashboard.jsx:415` tem a guarda **só no endereço** —
```
{vencedorExibido.endereco ? `${vencedorExibido.endereco.slice(0,10)}...${vencedorExibido.endereco.slice(-6)}` : "—"}
…
R$ {(vencedorExibido.valor / 100).toFixed(2)}      ← SEM guarda: valor ausente ⇒ "R$ NaN"
```
O comentário do commit diz que a guarda nova «espelha a que o cartão do Dashboard já tinha (l. 410)» — **verdade só para a metade do endereço**. A linha do **valor** do Dashboard continua sem guarda (o 2.º defeito que este commit corrige no overlay **existe também no Dashboard**). Não faz parte deste commit; registar como DEBT.

---

## Foco 5 — Dependência nova? **NÃO.**
```
$ git show dec577d --name-only | grep -iE "package(-lock)?\.json"  → NENHUM
```
`package.json`/`package-lock.json` fora do commit. (Nota: a árvore **principal** tem `M desafio-gut/frontend/package-lock.json` **não commitado** — alheio a este commit, não tocado.)

---

## Foco 6 — Regressão? **Não.** Suíte completa e integridade do ficheiro de teste.

```
$ node --test --test-concurrency=1 $(find src -name '*.test.mjs' -not -path '*/node_modules/*')
ℹ tests 608
ℹ suites 38
ℹ pass 608
ℹ fail 0
ℹ duration_ms 38336.0839      (exit 0)
```
**608/608 VERDE** — igual ao declarado no commit. Aritmética fecha: o único ficheiro de teste alterado é `+8` testes (4 → 12), logo 600 + 8 = **608**.

**Os 4 testes originais do UTAC000.10 intactos:** `git diff --numstat 6282d8d dec577d -- <teste>` = `51 0` (zero linhas removidas) e `grep -c "assert\."` = 9 (antigo) → 16 (novo), com **0** linhas `assert.` removidas pelo diff ⇒ **nenhuma asserção pré-existente enfraquecida**. Os 4 passam (12/12 no ficheiro).

---

## Foco 7 — Alcançabilidade (o que decide se isto muda o ecrã) — **efeito observável NULO**

```
$ grep -rn "setShowOverlay" desafio-gut/frontend/src
AppContext.jsx:206:  const [showOverlay, setShowOverlay] = useState(false);
AppContext.jsx:757:  setShowOverlay(false);
AppContext.jsx:1205:            // setShowOverlay(true);        ← COMENTADO
AppContext.jsx:1212:        setShowOverlay(false);
AppContext.jsx:1325:    setShowOverlay(false);
```
O **único** caminho para `true` está **comentado** (l. 1205, desde MC63/64) e o setter não é exposto no `value` do contexto. O overlay do `MercadoLances` (e o do `Dashboard.jsx:514`) está atrás de `{showOverlay && …}` ⇒ **inalcançável em produção**. A correcção é **latente**: **fecha a DEBT no código, sem alterar um pixel no ecrã**. Isto é **declarado com honestidade pelo próprio commit** («hoje inalcancavel pelo contexto real») — **não** é defeito do commit; é a **leitura correcta da alegação** (não é «passou a mostrar —» ao utilizador, é «deixou de poder rebentar se/quando o gate voltar a ligar»).

---

## Ressalvas (contra-exemplos, reprodução mínima)

| # | Caso | Resultado medido | Classe |
|---|---|---|---|
| R1 | `{ endereco: 12345 }` | **REBENTA** `TypeError: vencedor.endereco.slice is not a function` | guarda de truthiness, não de tipo |
| R2 | `{ endereco: true }` | **REBENTA** (idem) | idem |
| R3 | `{ endereco: {} }` | **REBENTA** (idem) | idem |
| R4 | `{ endereco: [] }` | mostra `"..."` (não `"—"`) | saída absurda, sem crash |
| R5 | `{ endereco: EU, valor: -1 }` | mostra `"R$ -0.01"` | valor finito negativo passa a guarda |
| R6 | `Dashboard.jsx:415` valor | `"R$ NaN"` ainda possível | divisor irmão, fora do escopo |

R1–R3 refutam a **afirmação geral** («malformado nunca rebenta»); **não** refutam o **escopo literal** da alegação («endereço ou valor **ausentes/null**»), que fica provado. R4–R6 são limites/saídas absurdas, não crashes.

---

## Exige correcção? (nota: **o push já aconteceu** — HEAD/origin = `79f56ef`)

**Não é bloqueador do que entrou** (a guarda entrega o escopo literal declarado, os mutantes mordem, a suíte fecha 608/608 e o caso válido é byte-idêntico). Como o commit já está em `origin/main`, fica como **correcção de seguimento** (1 linha, opcional) para tornar a **afirmação geral verdadeira**:

```js
const enderecoAbrev = typeof vencedor?.endereco === "string"
  ? `${vencedor.endereco.slice(0, 10)}...${vencedor.endereco.slice(-6)}`
  : "—";
```
**Ou**, se se preferir não tocar, **estreitar o comentário** (l. 70) de «Um `vencedor` MALFORMADO não pode rebentar o overlay» para «um `vencedor` com endereço/valor **ausentes/null** não pode rebentar», e corrigir a frase «malformado = ausente» no commit/DEBT. Achados R4/R6 → registar como DEBT (R6 reabre o 2.º defeito no `Dashboard`).

---

## O QUE UM SEGUNDO VALIDADOR DEVERIA TENTAR

1. **Endurecer o conjunto de `endereco` truthy-não-string**: `new String("0x...")` (objecto-wrapper, tem `slice` por boxe? — medir), `Object.create(String.prototype)`, array com 40 hex, `Symbol.toPrimitive`. Verificar se `typeof === "string"` resolve todos.
2. **Provar R1–R3 contra a fonte real**: instrumentar `AppContext.jsx:797-803` e confirmar que `lance.endereco` vem sempre string do Supabase (ou forçar a API a devolver número e observar o overlay). É o que decide se R1 é dívida teórica ou furo real.
3. **Medir a alcançabilidade de forma independente**: tentar ligar `showOverlay=true` numa cópia não versionada e confirmar que (a) o overlay monta e (b) o mutante M13a passa a ter efeito visível no ecrã. Sem isso, a alegação «o utilizador passa a ver —» continua por provar ao nível do ecrã.
4. **Auditar a objeção «o autor não enfraqueceu testes» por leitura, não só por numstat**: comparar os 4 testes originais linha a linha (`git show 6282d8d:<teste>` vs HEAD) — feito aqui como `51 0`, mas um segundo par de olhos deve confirmar que nenhuma **asserção** dos 4 originais mudou de semântica (só inserções).
5. **Repetir o A/B com a página inteira determinística** (stub do `Confetti` com posições fixas) para obter md5 de página comparável — aqui fui obrigado a isolar o bloco por causa do `Math.random()`.
6. **Validar o `package-lock.json` modificado na árvore principal**: não é deste commit, mas confirmar que não é arrasto de uma sessão paralela nem que altera a resolução de dependências do frontend.

---

### Ficheiros de evidência
O worktree `C:/Users/Moltbot/tmp-utac0011-val/fe` foi **desmontado em segurança** (junctions removidas com `[System.IO.Directory]::Delete(path,$false)`, depois `rm -rf` + `git worktree prune`); `node_modules` reais confirmados **505 / 417 intactos**. Os instrumentos foram copiados para `C:/Users/Moltbot/tmp-utac0011-val/evidencia/`:

- `evidencia/val0011-adv.mjs` — sonda Foco 1 (26 casos malformados)
- `evidencia/val0011-ab.mjs` — A/B do caso válido (md5 do bloco) + controlos de sensibilidade
- `evidencia/val0011-adv2.mjs` — formas não-objecto + A/B do 2.º defeito («R$ NaN»)
- `evidencia/val0011-mut.mjs` — mutações M13a/M13b + A/B de vacuidade (restauro por cópia de segurança)
- `evidencia/suite-frontend.txt` — saída integral da suíte (608/608)
- `C:/Users/Moltbot/tmp-utac0011-val/_bak-MercadoLances.jsx` — cópia de segurança do ficheiro (ficheiro original no repo **pristino**: blob `94a74910…` = HEAD)


---

# RESPOSTA DO EXECUTOR AO VEREDICTO — 2026-10-02

**Veredicto recebido: APROVA (com ressalvas).** A alegação no seu **escopo literal** ficou provada;
o validador refutou a **regra geral** que eu declarei («malformado = ausente») e — com razão — três
casos que eu não tinha construído. Fecho cada ressalva com medição.

## ⚠️ R1–R3 (o achado principal): a guarda testava TRUTHINESS, não TIPO → **FECHADO**
Ele mediu 3 crashes que a minha guarda não cobria: `{ endereco: 12345 }`, `{ endereco: true }`,
`{ endereco: {} }` → `TypeError: vencedor.endereco.slice is not a function` (e `{ endereco: [] }`
mostrava «...»). Causa exacta: `vencedor?.endereco ? …` testa a **presença** do valor, não o **tipo**
— `Number.prototype.slice`/`Object.prototype.slice` não existem. **Correcção aplicada** (a que ele
sugeriu, com o caso `""` incluído):
```js
const enderecoAbrev = typeof vencedor?.endereco === "string" && vencedor.endereco.length > 0
  ? `${vencedor.endereco.slice(0, 10)}...${vencedor.endereco.slice(-6)}`
  : "—";
```
**+6 casos novos na tabela** (numérico, boolean, objecto, array, string vazia, valor negativo),
todos verificados: **18/18 no ficheiro** e **mutante M13c** (voltar à truthiness) → **4 RED**.
A regra declarada passou a ser **VERDADEIRA** («malformado = ausente»), não apenas a metade
ausente/null.

## R4 (`{ endereco: [] }` mostrava «...») e R5 (`valor: -1` → «R$ -0.01») → **FECHADOS**
Ambos pela mesma passagem: o array deixa de passar a guarda (tipo) e o valor exige
`Number.isFinite(v) && v >= 0` (um lance negativo não é lance válido). Testados na tabela.

## R6 (divisor irmão): a linha do VALOR do Dashboard continua sem guarda → **DEBT-012**
Ele mediu que `Dashboard.jsx` l. 415 (`R$ {(vencedorExibido.valor / 100).toFixed(2)}`) continua a
poder mostrar «R$ NaN». **Correcção minha ao meu próprio comentário:** eu escrevi que a guarda nova
«espelha a que o cartão do Dashboard já tinha (l. 410)» — é verdade **só para o endereço**; a linha
do **valor** do Dashboard nunca teve guarda. O comentário no código foi corrigido e o irmão fica
registado como **DEBT-012** (`Dashboard.jsx` está fora do escopo autorizado deste UTAC).

## ⚠️ «Desvio na evidência declarada» (5 vs 6 RED) → **ACEITE E CORRIGIDO**
Ele re-mediu: com o ficheiro de teste **comitado** contra o código antigo (`6282d8d`) o resultado é
**pass=6 · fail=6**, não «5 RED» como a minha evidência declara. Causa: eu **endureci** o caso
`valor` de `300` para `"300"` **depois** de correr o «antes», sem re-medir. O RED real é **mais
forte** do que o declarado (não enfraquece a prova), mas é **imprecisão de evidência** e fica
corrigido em `_logs/UTAC000.11_SEG-2_ANTES-DEPOIS.txt` (o número passa a 6, com a razão declarada).

## Focos 2, 3, 5, 6 — sem ressalva
Caso válido **byte-idêntico** (md5 do bloco) ⇒ GATE 18 confirmado; **as duas mutações mordem** e os
números conferem (4 RED cada); **nenhum dos 12 testes era vácuo** (6 morrem no código antigo — os
outros 6 são os 4 originais do UTAC000.10 + 2 controlos do caso válido, que por desenho não asseram
mudança); **zero** dependências novas; **zero** regressões. Ele confirmou ainda que no
`MercadoLances.jsx` **não há outro sítio** que rebente com dados malformados (varrimento próprio).

## Foco 7 — alcançabilidade: **efeito observável NULO** (ele confirma o que eu declarei)
O `showOverlay` continua desligado ⇒ esta correcção é **robustez defensiva**, não muda nada do que o
utilizador vê hoje. A decisão de religar continua a ser do operador — e é ela que dá sentido ao
esforço: com o overlay ligado, R1–R3 seriam **alcançáveis** pelo caminho **local**
(`lance.endereco` vem de dados externos), pelo que esta 2.ª ronda não foi cosmética.

## Desvio de âncora (declarado por ele)
O briefing dizia «commit ainda NÃO pushado»; a meio da auditoria o commit já estava em
`origin/main`. Ele provou que o commit novo (`79f56ef`) é **só documentação** e que o blob do
`MercadoLances.jsx` é **idêntico** (`94a74910…`), logo o veredicto mantém-se válido sem re-correr
nada. A minha responsabilidade: empurrei antes de ter o veredicto — decisão declarada nos UTACs
anteriores pelo mesmo raciocínio (o caminho novo só actua pós-consolidação **e** o overlay está
desligado, logo o risco de implantar era nulo). Desta vez o validador **refutou parte da regra** —
e é a prova de que o push antecipado **não** devia ser hábito: o certo é fechar o veredicto primeiro.
