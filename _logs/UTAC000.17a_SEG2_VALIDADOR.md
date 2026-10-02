# VEREDICTO DO VALIDADOR ADVERSARIAL — UTAC000.17a (commit `12fd198`)

> ⚠️ **NOTA DE ARQUIVO (executor):** transcrito **verbatim** do ficheiro que ele gravou em
> `C:/Users/Moltbot/tmp-utac17a-veredicto/VEREDICTO-VALIDADOR.md` (20 095 bytes), seguido da
> minha resposta com as correcções que ele motivou. Ele gravou-o **antes** de esgotar iterações
> (como pedido) e o veredicto está **completo**.

---

# VEREDICTO ADVERSARIAL — commit `12fd198` (UTAC000.17a)

**Validador:** subagente independente · **Data:** 2026-10-02
**Repo:** `C:/Users/Moltbot/Desktop/DESAFIOGUT` · **HEAD medido:** `12fd198` (`git rev-parse --short HEAD`)
**Base:** `7db1ff3` (= `origin/main` antes do UTAC). Âncora re-medida no arranque e no fecho: HEAD não se moveu durante a auditoria.
**Modo:** TENTAR REFUTAR. Nada foi comitado, empurrado ou restaurado com `git checkout --`; as mutações usaram backup em bytes FORA do repo e restauro em `finally`, com `git hash-object` antes/depois.
**Instrumentos próprios:** `C:/Users/Moltbot/tmp-utac17a-veredicto/` (`probe1-blobs.mjs`, `probe2-supabase.mjs`, `mutar.mjs`, `mutar2.mjs` + `.out`).

---

## VEREDICTO: **APROVA (com ressalvas)**

Nenhuma das quatro alegações foi refutada. Os três mutantes do autor reproduzem-se e **três mutantes MEUS também mordem** (dirigidos). Duas ressalvas de cobertura/instrumento e uma de custo/escala ficam registadas — nenhuma exige correcção **antes do push**.

| alegação | veredicto | prova |
|---|---|---|
| **A** — só o titular, nunca valores | **CONFIRMA** | 41/41 vectores adversariais PASS (`probe1-blobs.mjs`) |
| **B** — leitura correcta nos 2 backends, índice existente, sem migração | **CONFIRMA com ressalvas** | 18/18 PASS (`probe2-supabase.mjs`) + índice pré-existente + `git diff` sem migrações |
| **C** — escopo limpo | **CONFIRMA (1 imprecisão de evidência)** | `git diff --name-only` + `--numstat` |
| **D** — os testes mordem | **CONFIRMA (1 número sub-declarado)** | 3 mutantes meus + 2 sobreviventes meus |

---

## A) «Só devolve as edições do próprio titular e nunca valores de lance»

**Como tentei partir:** token de terceiro, token admin (com e sem endereço), endereço não-string, endereço de 41 chars (prefixo exacto do titular), endereços que diferem só no último carácter, parâmetros manipulados (`?endereco=`, `?cliente_id=`, `?clienteId=`, `?user=`, `?address=`, `?wallet=`, `?edicaoId=` de terceiros, `__proto__`, vazio, `%20`, duplicado), cabeçalhos forjados (`x-endereco`, `x-user-endereco`, `x-cliente-id`, `x-forwarded-user`), 5 métodos HTTP, chaves com `:` extra (tipo `cnpj:`/`anon:`), e varredura do corpo por `valor/centavos/hash/commitment/payload`.

**Comando:**
```
cd C:/Users/Moltbot/Desktop/DESAFIOGUT/desafio-gut/frontend/netlify/functions
node --experimental-test-module-mocks C:/Users/Moltbot/tmp-utac17a-veredicto/probe1-blobs.mjs
```
**Saída (colada, íntegra):**
```
V1 corpo: {"participacoes":[{"edicaoId":"R-3","lances":1}],"total":1,"filtro":null}
PASS  V1 tok-outro devolve só R-3
PASS  V1 tok-outro não mostra edições do TITULAR
PASS  V1 tok-outro não inclui o endereço do TITULAR
V2 corpo: {"participacoes":[{"edicaoId":"R-1","lances":2},{"edicaoId":"R-2","lances":1},{"edicaoId":"R-5","lances":1}],"total":3,"filtro":null}
PASS  V2 tok-admin devolve só as edições do endereço do token
PASS  V3 admin sem endereço → 401
PASS  V4 endereço parecido devolve só R-4
PASS  V4 não vaza TITULAR
PASS  V5 endereço inválido (41 chars) → 401
PASS  V6 endereco não-string → 401
PASS  V7 ?endereco=<TITULAR> ignorado (tok-outro só vê R-3)
PASS  V7 ?cliente_id=<TITULAR> ignorado (tok-outro só vê R-3)
PASS  V7 ?clienteId=<TITULAR> ignorado (tok-outro só vê R-3)
PASS  V7 ?user=<TITULAR> ignorado (tok-outro só vê R-3)
PASS  V7 ?address=<TITULAR> ignorado (tok-outro só vê R-3)
PASS  V7 ?wallet=<TITULAR> ignorado (tok-outro só vê R-3)
PASS  V8 header x-endereco ignorado
PASS  V8 header x-user-endereco ignorado
PASS  V8 header x-cliente-id ignorado
PASS  V8 header x-forwarded-user ignorado
PASS  V9 ?edicaoId=R-3 (de OUTRO) → vazio
PASS  V9 ?edicaoId=__proto__ → vazio (sem crash)
PASS  V9 ?edicaoId= (vazio) → sem filtro (comportamento: devolve tudo)
PASS  V9 ?edicaoId duplicado → usa o 1.º (R-1)
PASS  V9 ?edicaoId=%20 → vazio
PASS  V10 corpo não contém "valorcentavos" / "centavos" / "hash" / "commitment" / "payload" / "0xdead" / "4242"
PASS  V10 chaves exactas edicaoId+lances
PASS  V11 POST/PUT/DELETE/PATCH/HEAD → 405
PASS  V12 sem token → 401 · token inválido → 401
PASS  V13 chaves com ':' extra não contam para ninguém
V14 60 003 chaves: resposta em 916 ms
PASS  V14 resultado correcto à escala
== 41 PASS / 0 FALHA ==
```

**Contra-exemplo mínimo (o mais forte que construí)** — token de terceiro + parâmetro forjado:
```
const r = await chamar({ token: "tok-outro",
  url: ".../minhas-participacoes?endereco=0xaaa…aaa&cliente_id=0xaaa…aaa" });
// -> {"participacoes":[{"edicaoId":"R-3","lances":1}],"total":1,"filtro":null}
```
O endereço do pedido **não influencia a resposta**: não há leitura de nenhum parâmetro/cabeçalho de identidade (confirmado por leitura do handler: o `endereco` só nasce em `validarEndereco(jwtPayload?.endereco)`).

**Nota (não é defeito):** o `admin-access` **também** é servido pelo endereço do próprio token — não é «admin vê tudo». Para este endpoint isso é o comportamento *mais* restritivo e coerente com a alegação; o teste do autor (`sessoes` inclui `tok-outro`) não chega a exercer o token de terceiro (gap de cobertura, coberto agora por mim).
**Nota 2:** `?edicaoId=` (vazio) cai em falsy → devolve **tudo** e o corpo diz `filtro: null`. Um consumidor que passe `edicaoId` vazio recebe todas as edições. Menor; documentar no 17c.

**Conclusão A: alegação CONFIRMA.**

---

## B) «Leitura correcta nos dois backends, usa o índice existente, sem migração nova»

### B.1 Supabase — query filtrada, sem `payload`, paginada
**Comando:** `node --experimental-test-module-mocks C:/Users/Moltbot/tmp-utac17a-veredicto/probe2-supabase.mjs` (cwd = functions)
**Saída (íntegra, resumida nas linhas de dados):**
```
S1 corpo (resumo): {"participacoes":[{"edicaoId":"R-1","lances":1500},{"edicaoId":"R-2","lances":1000}],"total":2,"filtro":null}
PASS  S1 3500 linhas → R-1:1500 · R-2:1000 (paginação multi-página exacta)
PASS  S1 nº de consultas = ceil(2500/1000)=3
PASS  S1 todas as consultas filtram por endereco=TOKEN
PASS  S1 SÓ a coluna edicao_id é pedida (nunca payload/valor/hash)
PASS  S1 count exact pedido
PASS  S1 não pede payload em NENHUMA consulta
PASS  S1 não menciona valor em NENHUMA consulta
PASS  S1 ordem: edicao_id ASC, id ASC (paginação determinística)
PASS  S2 tok-outro só vê R-3 (7)
PASS  S2 filtro é o endereço do OUTRO
S3 corpo: {"participacoes":[{"edicaoId":"R-1","lances":1}],"total":1,"filtro":null}
PASS  S3 só conta a linha com edicao_id não-vazio
PASS  S3 endereco em MAIÚSCULAS na tabela NÃO casa
PASS  S4 count ausente → termina e conta bem
PASS  S4 nº de consultas finito (<5)
PASS  S6 ?edicaoId=R-3 (de OUTRO) → vazio no backend supabase
PASS  S6 ?endereco=OUTRO ignorado no supabase
== 18 PASS / 0 FALHA ==
```
`S1` prova a **contagem exacta em 3 páginas** (2500 linhas do titular, `PAGINA_LANCES=1000`) e que **nenhuma** consulta menciona `payload`/`valor`. `S4` prova que sem `count` (PostgREST sem `Prefer`) a salvaguarda anti-loop termina.

### B.2 Índice existente / sem migração
```
$ git diff --name-only 7db1ff3 12fd198 -- '*migrations*'
(vazio)
$ grep -rn "CREATE INDEX" desafio-gut/frontend/supabase/migrations/ | grep lances
20260620_schema_definitivo.sql:51:CREATE INDEX IF NOT EXISTS idx_lances_endereco ON lances(endereco);
```
`idx_lances_endereco` é **pré-existente** (migração de 2026-06-20, anterior ao commit) ⇒ `.eq("endereco", alvo)` usa índice existente. **Zero migrações novas.** Alegação CONFIRMA.

### B.3 Blobs — correcto, mas com duas ressalvas medidas
- Filtro por **endereço completo**, não prefixo/substring: `:${partes[2]}:` comparado com `:${alvo}:`; chaves com `:` extra (5 segmentos) são descartadas (V13 PASS). O marcador `bid:{edicao}:consolidado` (3 segmentos) é ignorado e não soma (teste do autor + V13).
- **Ressalva 1 (custo/escala, real):** por cada pedido o código faz `store.list({ prefix: "bid:" })` — **toda a store**, não só as chaves do titular. Medido em memória: 60 003 chaves → **916 ms** de CPU simples + `ceil(N/1000)` páginas internas. `?edicaoId=X` **não** estreita a listagem (o prefixo poderia ser `bid:{edicaoId}:`, ~N_edição em vez de N_total). Hoje o impacto é **nulo** — o próprio autor mediu `netlify blobs:list` (= DEBT-018, §4 do relatório): store `bids` tem **0 chaves** em produção. É dívida de escala para o 17c, não defeito.
- **Ressalva 2 (instrumento):** o `do { … } while (cursor)` do blobs é **código morto com a lib instalada**. Por leitura de `node_modules/@netlify/blobs/dist/main.js` v10.0.0 (l. 142–158): `list()` sem `paginate:true` faz `collectIterator(...).reduce(...)` e devolve `{blobs, directories}` — **sem `cursor`**; e `getListIterator` só lê `options.prefix/directories` (um `cursor` passado é ignorado). Logo, em produção, o laço corre **uma vez** e a lib entrega tudo. O duplo do autor simula um `list()` paginado por `cursor` que a lib não tem ⇒ o teste «paginação por cursor (> página) não perde edições» pina um comportamento do **duplo**, não do código (o resultado continua correcto nos dois casos). *Evidência por leitura de código-fonte, não por execução contra a API real — declarado como tal.*
- **Ressalva 3 (cobertura, ver §D):** o `.toLowerCase()` do alvo nas **duas** camadas não é exercido por nenhum teste ⇒ sobrevive a mutação.

**Conclusão B: alegação CONFIRMA (leitura correcta nos dois backends; índice existente; sem migração), com 3 ressalvas que não são defeito.**

---

## C) «Escopo limpo: só endpoint + mínimo em _lib + testes; exportar-dados e on-chain intocados»

```
$ cd C:/Users/Moltbot/Desktop/DESAFIOGUT
$ git diff --name-only 7db1ff3 12fd198 -- ':!*_logs*'
desafio-gut/frontend/netlify/functions/_lib/bids-store.mjs
desafio-gut/frontend/netlify/functions/_lib/data-store-blobs.mjs
desafio-gut/frontend/netlify/functions/_lib/data-store-supabase.mjs
desafio-gut/frontend/netlify/functions/_lib/data-store.mjs
desafio-gut/frontend/netlify/functions/_tests/utac0017a-minhas-participacoes-supabase.test.mjs
desafio-gut/frontend/netlify/functions/_tests/utac0017a-minhas-participacoes.test.mjs
desafio-gut/frontend/netlify/functions/minhas-participacoes.mjs

$ git diff --numstat 7db1ff3 12fd198
57      0       _logs/UTAC000.17a_SEG-1_EVIDENCIA.txt
74      0       _logs/UTAC000.17a_SEG-1_MEDICAO.md
66      0       _logs/UTAC000.17a_SEG-2_ANTES-DEPOIS.txt
29      0       .../_lib/bids-store.mjs
10      1       .../_lib/data-store-blobs.mjs
37      0       .../_lib/data-store-supabase.mjs
9       0       .../_lib/data-store.mjs
124     0       .../_tests/utac0017a-minhas-participacoes-supabase.test.mjs
184     0       .../_tests/utac0017a-minhas-participacoes.test.mjs
96      0       .../minhas-participacoes.mjs
```
- **`exportar-dados.mjs` NÃO aparece** ⇒ intocado. **Zero ficheiros de contrato on-chain** no diff (o diff só tem 7 ficheiros de código + 3 `_logs/`). **`package.json`/lockfile não tocados.** **Nenhuma migração.** Os `+N 0` são inserções puras (só `data-store-blobs.mjs` tem `−1`, que é a linha de `import` reescrita).
- **Dependências novas:** zero. Imports do endpoint novo = `./_lib/{validate,cors,rate-limiter,jwt,jwt-fail-counter,data-store}.mjs` (todos pré-existentes); as implementações novas só usam `node:crypto`, `@netlify/blobs` e `./supabase-client.mjs` (já existentes).
- **Fins de linha** (medidos em bytes, não supostos):
```
minhas-participacoes.mjs                    bytes=3827  CRLF=0   LF=96   CR_solo=0
_lib/bids-store.mjs                         bytes=4425  CRLF=102 LF=102  CR_solo=0
_lib/data-store.mjs                         bytes=2676  CRLF=73  LF=73   CR_solo=0
_lib/data-store-blobs.mjs                   bytes=2683  CRLF=68  LF=68   CR_solo=0
_lib/data-store-supabase.mjs                bytes=7268  CRLF=166 LF=166  CR_solo=0
_tests/utac0017a-….test.mjs                 bytes=8657  CRLF=0   LF=184  CR_solo=0
_tests/utac0017a-…-supabase.test.mjs        bytes=5679  CRLF=0   LF=124  CR_solo=0
```
  Nenhum ficheiro misto. **⚠️ Imprecisão de evidência:** `_logs/UTAC000.17a_SEG-1_EVIDENCIA.txt` §7 declara «endpoint novo em **CRLF** (como os seus pares)» — medido, o endpoint é **LF** (`CRLF=0`). O que o author afirma a seguir («cada ficheiro ficou internamente consistente») é **verdadeiro**. Como `.gitattributes` tem `*.mjs text eol=lf`, o blob do git é LF em todos de qualquer forma. Sem efeito em produção; só a frase está errada.

**Conclusão C: alegação CONFIRMA** (com a imprecisão declarada acima).

---

## D) «Os testes mordem» — mutantes MEUS + sobreviventes MEUS

### D.1 Mutantes meus (não usei os do autor)
Instrumento: `node C:/Users/Moltbot/tmp-utac17a-veredicto/mutar.mjs` (backup em bytes fora do repo, âncora contada, EOL preservado, restauro em `finally`, `git hash-object` antes/depois).
```
### MINE-A (meu): filtro de endereço neutralizado na camada blobs
    ficheiro=.../_lib/bids-store.mjs EOL=CRLF hashAntes=9264ad631f6152984e9bb41986217231ef7aeab0
    linha mutante: 81:      /* MUTADO-A: filtro de endereço neutralizado */
    bytes mutados: CRLF=102 LF=102
    RESULTADO: tests=12 pass=10 fail=2
    MORTOS (2): "devolve SÓ as edições do titular — terceiro e endereço PARECIDO ficam de fora" | "titular sem lances → 200 e lista vazia (não é erro)"
    restauro: OK (hash idêntico)

### MINE-B (meu): resposta do endpoint passa a trazer um valor de lance
    ficheiro=.../minhas-participacoes.mjs EOL=LF hashAntes=9a0d3b60c7376b9cd448204654755603f6f4bd52
    linha mutante: 92:    valorCentavos: 4242, /* MUTADO-B */
    RESULTADO: tests=15 pass=14 fail=1
    MORTOS (1): "NUNCA devolve valores de lance (GATE 22)"
    restauro: OK (hash idêntico)

### MINE-C (meu): filtro ?edicaoId ignorado
    ficheiro=.../minhas-participacoes.mjs EOL=LF
    linha mutante: 87:  const participacoes = edicoes; /* MUTADO-C: ignora o filtro ?edicaoId */
    RESULTADO: tests=15 pass=13 fail=2
    MORTOS (2): "backend supabase: ?edicaoId= filtra e edição sem participação → vazio" | "filtro ?edicaoId= devolve só essa edição; edição sem participação → vazio, 200"
    restauro: OK (hash idêntico)
```
**Os três mordem, dirigidos** (cada um mata os testes do seu defeito, e o resto fica verde). Confirmação pós-instrumento: `git diff --stat HEAD -- desafio-gut/frontend/netlify/functions` = **vazio** e os hashes voltaram aos do commit.

### D.2 Confronto com os números DECLARADOS pelo autor
| mutante | autor declara | eu meço | leitura |
|---|---|---|---|
| M16 (filtro de endereço, blobs) | 2 RED | **2 RED** (MINE-A) | confere |
| M17 (valores na resposta) | 1 RED | **1 RED** (MINE-B) | confere |
| M18 (`?edicaoId` ignorado) | 1 RED | **2 RED** (MINE-C, correndo os 2 ficheiros) | **sub-declarado**: a mutação está no handler partilhado, logo mata também o caso homólogo do ficheiro supabase. Se o autor correu só o ficheiro blobs, o «1» está certo *no escopo dele*; o número que descreve a mutação é 2. Não enfraquece a prova (o RED real é ≤ o meu, nunca ≥). |
| SEG-2 §4: «Restauros: md5 idêntico … Estado final: 15/15 verde» | — | verificado: hashes dos ficheiros = blobs do commit; 15/15 verde re-corrido | confere |

### D.3 Caça a SOBREVIVENTES (o que ninguém testa)
`node C:/Users/Moltbot/tmp-utac17a-veredicto/mutar2.mjs`:
```
### SURV-1: tirar .toLowerCase() do alvo na camada blobs
    linha: 73:  const alvo = `:${String(endereco)}:`; /* SURV-1 */
    pass=12 fail=0 MORTOS(0)=(nenhum — SOBREVIVEU)
    restauro: OK
### SURV-2: tirar .toLowerCase() do alvo na camada supabase
    linha: 115:  const alvo = String(endereco); /* SURV-2 */
    pass=3 fail=0 MORTOS(0)=(nenhum — SOBREVIVEU)
```
**Duas linhas de defesa em profundidade SOBREVIVEM** — o `.toLowerCase()` do alvo nas duas implementações não é exercido por nenhum teste (o token passa primeiro por `validarEndereco`, que já normaliza). Não é defeito no caminho actual: é **cobertura em falta** e um **trap latente** — o próprio SEG-2 documenta «compara em minúsculas» como comportamento da camada de dados, e um consumidor futuro do 17c que chame a facade **directamente** com um endereço EIP-55 recebe `[]` em silêncio. Fecha-se com um teste de 1 linha por backend chamando `listarEdicoesPorEndereco("0xAAA…aAa")` directamente.

**Conclusão D: alegação CONFIRMA** (os 3 declarados mordem; 1 número sub-declarado; 2 sobreviventes = cobertura em falta, não defeito).

---

## Suíte canónica (régua do projecto, FOREGROUND com TTY)
```
$ cd C:/Users/Moltbot/Desktop/DESAFIOGUT
$ node scripts/mc966-suite-harness.mjs ambos           # pty=true
frontend: VERDE 670/670 pass
backend: VERDE 982/988 pass
VEREDITO: VERDE
```
Fecha a aritmética contra o baseline declarado: backend `967/973` + 15 = **`982/988`** ✓ (as 6 falhas de backend são pré-existentes: 973+15=988). Frontend inalterado em 670/670. **Sem regressão.**

---

## Outros focos pedidos

| foco | medição | conclusão |
|---|---|---|
| **Custo/escala (blobs)** | lista a store inteira por pedido; `?edicaoId=X` não estreita o prefixo; 60 003 chaves → 916 ms in-memory + `ceil(N/1000)` páginas; **produção tem 0 chaves** (§4 do relatório, medido pelo autor via `netlify blobs:list`) | dívida de escala para o 17c; impacto **nulo hoje** |
| **Auth: o endereço do pedido influencia?** | V1/V7/V8/V9 (41 vectors) | **NÃO** — o endereço só vem do token |
| **Fins de linha** | tabela acima | internamente consistentes; evidência do autor diz CRLF, medido LF |
| **Dependências novas** | `git diff --name-only -- package.json` vazio; imports novos = só `_lib` pré-existente | **zero** |
| **O que o 17c precisa está lá?** | resposta `[{edicaoId, lances}]` = «em que edições dei lance + nº por edição» | **sim**. Ressalvas para o 17c: (i) `total` = nº de **edições**, não de lances — ambiguidade a documentar; (ii) `?edicaoId=` vazio devolve tudo; (iii) com `?edicaoId=` poderia usar prefixo estreito |

---

## O que um SEGUNDO validador deveria tentar

1. **Correr o harness completo com `DATA_STORE_BACKEND=supabase`** e medir quantos testes *existentes* do backend passam a depender da implementação supabase (anti-split-brain do flip). Eu só exercitei o endpoint com o duplo.
2. **Medição contra a API real de Blobs** (com credenciais) do contrato de `list()`: confirmar **por execução** o que aqui é leitura de código — que `list({prefix})` devolve tudo sem `cursor` e que o laço do endpoint corre uma vez. Um `edgeURL` local a emular a paginação fecha isto sem credenciais.
3. **Teste directo da facade** com endereço EIP-55/em maiúsculas (`listarEdicoesPorEndereco` sem passar pelo handler) — é o que mata SURV-1/SURV-2.
4. **Carga real**: com um store `bids` semeado (N grande) medir o tempo p95 do endpoint na Netlify e o limite de 10 s da função; e testar `?edicaoId=X` vs prefixo estreito.
5. **Ordem das defesas**: com rate limit a disparar, confirmar que a resposta 429 não revela nada e que o `registrarFalhaJwt` não escreve nada sensível com um token forjado.
6. **Fork/junction**: se alguém validar num worktree, o `node_modules` do **backend** (`netlify/functions/node_modules`) tem de estar ligado — sem ele o endpoint novo cai por `ERR_MODULE_NOT_FOUND` e parece regressão.
7. **Repetir a mutação M18 nos DOIS ficheiros** e reportar o split (2 RED), não 1.

---

## Ficheiros criados por este validador
- `C:/Users/Moltbot/tmp-utac17a-veredicto/VEREDICTO-VALIDADOR.md` (este)
- `probe1-blobs.mjs` / `probe1.out` · `probe2-supabase.mjs` / `probe2.out`
- `mutar.mjs` / `MUTACAO-MINE.out` · `mutar2.mjs` / `MUTACAO-SURV.out`
- `backup/*.orig` (cópias em bytes dos ficheiros mutados)
- **Nada** foi escrito, comitado ou deixado alterado dentro do repo (verificado: `git diff --stat HEAD -- desafio-gut/frontend/netlify/functions` vazio; hashes = blobs do commit).

---

# RESPOSTA DO EXECUTOR — 2026-10-02

**Veredicto: APROVA (com ressalvas).** §A CONFIRMA · §B CONFIRMA (3 ressalvas) · §C CONFIRMA
(1 imprecisão minha) · §D CONFIRMA (com 1 número meu sub-declarado e **2 sobreviventes**).

## 1. As ressalvas — todas fechadas nesta mesma ronda

| # | ressalva dele | o que fiz |
|---|---|---|
| B.3.1 | **custo/escala:** cada pedido lista a store **inteira**; com `?edicaoId=` podia usar o prefixo estreito (medido: 60 003 chaves → 916 ms) | **CORRIGIDO**: `listarEdicoesPorEndereco(endereco, {edicaoId})` — em **blobs** o prefixo passa a `bid:{edicaoId}:` e em **supabase** acrescenta-se `.eq("edicao_id")`. É o caso normal do 17c (o overlay pergunta por UMA edição). **Mutante M19** (ignorar o estreitamento) → **2 RED** ✓ |
| B.3.2 | **instrumento:** o laço `while (cursor)` é **código morto** com a lib v10 (`list()` sem `paginate` devolve tudo e não dá cursor) e o meu teste de paginação pina o **duplo**, não a lib | **ACEITE e RELABELADO**: o teste passa a chamar-se «defensivo: não perde edições mesmo se o store paginar (a lib v10 devolve tudo de uma vez)» com a citação da medição dele (v10.0.0, `dist/main.js`). O laço fica (inofensivo, mesmo padrão do `listarChavesBids` pré-existente) — mas o rótulo deixou de mentir |
| B.3.3 / D.3 | **2 SOBREVIVENTES:** o `.toLowerCase()` do alvo nas duas camadas não era exercido por nenhum teste (o handler normaliza antes) ⇒ um consumidor directo da facade com endereço EIP-55 recebia `[]` em silêncio | **CORRIGIDO**: 1 teste por camada a chamar `listarEdicoesPorEndereco("0xAAA…aAa")` **directamente**. **M20 e M21** (remover o `.toLowerCase()`) → **2 RED cada** ⇒ **sobreviventes MORRERAM** ✓ |
| C | **imprecisão minha:** a evidência §7 dizia «endpoint novo em CRLF»; medido, é **LF** | **CORRIGIDO** na evidência (e a lição: eu tinha planeado CRLF e escrevi LF; declarei como medido sem medir — falha minha de instrumento). O que ele confirma (cada ficheiro internamente consistente) mantém-se: re-medido, todos puros |
| D.2 | o meu «M18 = 1 RED» era **sub-declarado** (a mutação está no handler partilhado ⇒ mata também o caso do ficheiro supabase = 2 RED) | **ACEITE** — e há mais: **depois da correcção do custo o M18 deixou de morder de todo (0 RED)**: o estreitamento da listagem já restringe o resultado, logo ignorar o filtro da resposta não muda nada ⇒ é agora um **mutante EQUIVALENTE** (redundância de defesas). O caminho do filtro passa a ser coberto pelo **M19**. Registo o número verdadeiro: M16 4 RED · M17 2 · M18 **0 (equivalente)** · M19 2 · M20 2 · M21 2 |

## 2. Os sobreviventes eram um trap real — obrigado
O caso que ele descreve (consumidor futuro do 17c a chamar a **facade** com um endereço em EIP-55 e a
receber `[]` **em silêncio**) era exactamente o tipo de defeito latente que os testes do endpoint
nunca revelariam, porque o `validarEndereco` normaliza antes. Fechado com 2 testes directos ✓.

## 3. Erros MEUS de instrumento nesta ronda (declarados, além dos 4 da 1.ª)
5. **Bug do meu script de mutação:** a lógica de backup reutilizou um `.bak` **da 1.ª ronda** para o M16
   ⇒ restaurou a versão **anterior ao estreitamento** (a minha guarda `md5 identico?` apanhou-o e
   **abortou**; re-apliquei a edição e corrigi o script para usar backup sempre fresco);
6. **Relatório de EOL enganoso:** o meu helper de substituição tenta CRLF **primeiro**, e para âncoras
   de **1 linha** as duas variantes casam ⇒ inseriu **1 linha CRLF** num ficheiro LF (medido: `CRLF=1`).
   Corrigido ao byte e re-medido (puro LF ✓). Lição: **o EOL do ficheiro decide-se ANTES**, não se
   infere do que casou.
7. Erro de sintaxe meu num f-string (backslash) — o script nem correu (nada escrito) ✓ sem dano.

## 4. O que fica para o 17c (do veredicto dele, aceite)
- `total` = nº de **EDIÇÕES** (não de lances) ⇒ **documentado no cabeçalho do endpoint** ✓
  (a contagem de lances vai em `lances` de cada item);
- sem `?edicaoId=` a listagem varre a store inteira (custo documentado; hoje **0 chaves** em produção);
- com `?edicaoId=` a listagem é estreita ✓ (é o caminho que o 17c deve usar).
