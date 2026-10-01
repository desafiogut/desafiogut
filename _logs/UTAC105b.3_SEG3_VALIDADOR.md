# VEREDICTO DO VALIDADOR ADVERSARIAL — UTAC105b.3 (commit `945dcac`)

**Data:** 2026-10-01 · **Worktree:** `C:/Users/Moltbot/tmp-utac105b3-val/wt` (detached em `945dcac`)
**Mandato:** TENTAR REFUTAR a correcção «posse do `endereco` no `register-corporativo`». Não confirmar.
**Ambiente:** handler REAL (`cotas.mjs`), duplos só nas fronteiras externas; CNPJs sintéticos; `git status` limpo no fim; nenhuma escrita no repo principal.

---

## VEREDICTO: **APROVADO COM RESSALVAS**

**0 achados ⚠️ (graves). 3 achados ℹ️ (nota) + 1 nota de contexto.**
**NÃO consegui refutar a correcção.** Depois de ~20 vectores de bypass desenhados por mim, a prova
bidireccional contra o código antigo, a mutação independente da guarda e a re-corrida da suíte canónica,
o defeito V-4 está fechado: o anónimo com `endereco` de terceiros é recusado (401) sem escrever; o cadastro
legítimo e o admin permanecem intactos; nenhuma asserção legada foi enfraquecida.

As ressalvas são **inexactidões de documentação/evidência** (não defeitos de código). Nenhuma exige
correcção do comportamento; duas recomendam limpeza da evidência.

---

## O que tentei e NÃO consegui refutar (com medição)

### Foco 1 — anónimo com `endereco` é recusado (401) e não escreve ✅
- `_tests/utac105b3-register-endereco.test.mjs` → **11/11 passam** (medido).
- PoC próprio (12/12): B4 (caixa mista sem token → 401), B7 (token de OUTRO → 403). Em ambos
  `escritas.length === 0` e `cotas.get(VITIMA) === undefined` — **não escreve na cota**.
- Ordem de código confirmada por leitura: a guarda (l.449-461) devolve antes de `upsertCota` (l.519)
  e de `setFingerprint` (l.530).

### Foco 2 — cadastro legítimo continua a funcionar ✅
- E5 / meu B2: sem `endereco` no corpo → **201** e `clienteId === "cnpj:77788899000183"` (medido).
- Confirmação de que o frontend não envia `endereco` (leitura de `SejaNossoParceiro.jsx:203-212`,
  feita pelo executor e reconferida pelo SEG-1): corpo = `cnpj, empresa, segmento, site, logoUrl, email`.

### Foco 3 — admin mantém acesso total ✅
- E6 / meu B9: admin + `endereco` de terceiros → **201**, escreve no endereço informado (excepção declarada).

### Foco 4 — HÁ BYPASS? **NÃO. ~20 vectores, todos recusados** ✅
Ficheiro temporário `_tests/zz0-validador-poc.test.mjs` (12 testes, **todos verdes**; apagado no fim):

| vector | resultado medido |
|---|---|
| campos alternativos `cliente_id`, `clienteId`, `address`, `wallet`, `ENDERECO` | **ignorados** → 201 em `cnpj:…`; cota da vítima `undefined` |
| chave `"endereco "` (espaço), `"endereco\u0000"` (NUL) | **ignorados** → caminho `cnpj:…` |
| `0X…` (X maiúsculo), espaço inicial/final, NBSP, unicode no último char | **400** (`endereco_invalido`) |
| `endereco` número / array / `{toString}` / `{valueOf}` / `{endereco:…}` aninhado | **400** |
| chaves duplicadas `endereco:VITIMA` ×2 | **401**, sem escrita |
| poluição de protótipo `__proto__` / `constructor.prototype` | **ignorados**; `Object.prototype.endereco === undefined` |
| caixa mista do endereço da vítima sem token | **401**, sem escrita |
| token de OUTRO + endereço da vítima | **403 `endereco_nao_corresponde`**, sem escrita |

**Consistência da variável (o ponto crítico do foco 4):** confirmado por leitura de `cotas.mjs`
l.377-465 que **a guarda e a decisão usam a MESMA variável `endereco`** (a saída normalizada de
`validarEndereco`, l.379-384): a guarda em l.449-451 valida `endereco`; o `clienteId` em l.396 é
`endereco ?? \`cnpj:${cnpjNums}\``. Não há divergência guarda-vs-escrita. `clienteId` é `const` e só
atribuído uma vez.

### Foco 5 — IDEMPOTÊNCIA ✅
- **Dono comprovado (token = próprio endereço):** 1.º → 201; após simular activação
  (`categoria:ouro/vendida:true/valor:55000/pedidoId:P1`), 2.º registo → **201**, `escritas.length === 1`
  (upsert por `cliente_id`), e os campos pagos **preservados** (`ouro/true/55000/P1`). Sem duplicado,
  sem corrupção (a correcção V-1 do b.2 sustenta isto). *(PoC I1)*
- **Anónimo repetindo o cadastro directo (sem `endereco`):** 2.º POST → **401 `token_ausente`** —
  comportamento **pré-existente do b.2** (cota já existe + anónimo não prova posse), não introduzido
  por este commit. Não parte o frontend: `SejaNossoParceiro.jsx` só posta após o GET de duplicidade dar
  404. *(PoC I2)* — nota de contexto, não é regressão do V-4.

### Foco 6 — ESCOPO ✅
`git show --stat 945dcac` (9 ficheiros):

| ficheiro | numstat | veredicto |
|---|---|---|
| `cotas.mjs` | **+27 / −0, 1 hunk** | só o ramo `register-corporativo` (a inserção é imediatamente a seguir ao `resolverChamador` que o b.2 já tinha, l.435) |
| `_tests/utac105b3-register-endereco.test.mjs` | novo (190 l.) | autorizado |
| `_tests/cotas-anti-fraude.test.mjs` | +18 / −14, 5 hunks | **só setup** (ver foco 8) |
| `_logs/*` (6) | novos | evidência (convenção `_logs/`) |

- `update-corporativo` (l.548+) **não tocado**; o POST genérico de admin (excepção `?action=` ausente)
  **não tocado** — a única hunk em `cotas.mjs` está dentro do ramo `register-corporativo`.
  Confirmado por `git status` limpo e por `git diff … | grep -c '^@@'` = **1**.

### Foco 7 — AU3 (concepção fora do escopo) ✅
A guarda aplica a regra **MC89.38 já existente** (mesma família do `update-corporativo`/b.1), dentro do
ramo autorizado, **reutilizando** `resolverChamador` que o b.2 já ali tinha. Códigos de erro reutilizados
(`token_ausente`, `endereco_nao_corresponde`). **Nenhuma regra, feature ou decisão de produto nova.**

### Foco 8 — asserções dos 7 testes legados preservadas ✅ (verificação decisiva)
- **Prova forte:** extraí as linhas `assert`/`test(` de `945dcac^` e de `945dcac` e comparei-as
  (ignorando números de linha): **60 linhas em ambos os lados, `diff` VAZIO.** Nenhuma asserção alterada.
- **Prova complementar:** as **14 linhas removidas** são exactamente: 1 assinatura de `reqRegister`,
  1 linha de `headers` e **12 call sites** (`await handler(await reqRegister(...))`). Zero `assert` entre
  as removidas. `git diff --numstat` = 18/14 ⇒ **+4 líquidas** = 5 linhas do helper (2 comentários +
  `async` + `const headers` + `if`) − 1 (assinatura) + 0.

### Foco 9 — Ordenação / oráculo / escrita antes da recusa ⚠️→ℹ️ (ressalva ℹ️-1)
A afirmação dos logs **«auth ANTES da leitura do store»** é **inexacta**: a guarda de posse (l.449) está
antes de `getCota(clienteId)` (l.465) — mas **depois de duas leituras ao store**:
`getCotaByCnpj` (l.402) e `getFingerprint` (l.410). Medição própria (PoC O1): anónimo + `endereco` da
vítima + CNPJ **já registado noutro lado** → **409 `cnpj_duplicado`**, não 401.
**Porque não é grave (ℹ️, não ⚠️):** (i) **nenhuma escrita** acontece nesse caminho; (ii) o mesmo 409 é
alcançável **anonimamente sem `endereco`** (bloco anti-duplicidade do MC12.3, **inalterado** por este
commit — a única hunk é a inserção em l.433), logo **não é oráculo novo**; (iii) a recusa da guarda não
revela nada que o fluxo já não revelasse. Recomendação: emendar a frase para «auth antes da leitura da
**cota**». Nenhum caminho de escrita antes da recusa foi encontrado.

### Foco 10 — Suíte canónica re-corrida por mim ✅
```
frontend: VERDE 535/535 pass
backend:  VERDE 967/973 pass
VEREDITO: VERDE
```
- `node scripts/mc966-suite-harness.mjs ambos`, da raiz do worktree, **com TTY** (a 1.ª tentativa sem pty
  devolveu `stdin is not a tty` / exit 1 — pitfall conhecido; NÃO tratado como verde).
- **Confere exactamente** a reivindicação do executor (535/535 · 967/973). Aritmética fechada:
  962 → 973 = +11 (o ficheiro novo de 11 testes); 956 → 967 = +11. Contagem confirmada
  independentemente: com o meu PoC de 12 testes presente o harness mediu 979/985 (= 967+12 · 973+12),
  provando que a régua conta o que eu acrescento e que os 12 não estavam no número de base.

### Prova bidirecional contra o código ANTIGO (independente) ✅
Substituí `cotas.mjs` pela versão `945dcac^` no worktree e corri o ficheiro novo:
**E1, E3, E8, E11 FALHAM** (4 falhas), E2 continua verde (a guarda do b.2 já a recusa). Restaurado por
`git checkout`, **md5 LF = `48f0ba05befd289a34b4cce176036d20`**, `git status` limpo. Reproduz exactamente
o `_logs/UTAC105b.3_SEG0_bidirecional.txt`.

### Mutação independente da guarda (minha, não herdada) ✅
Mutante «`if (false && endereco && …)`» (repo o V-4) → **RED em E1, E3, E8, E11**; restaurado
(md5 idêntico). A guarda está **realmente coberta** por testes que morrem sem ela.

---

## ACHADOS

### ℹ️-1 — Frase «auth antes da leitura do store» inexacta
**Sustentação:** guarda em l.449, mas `getCotaByCnpj` (l.402) e `getFingerprint` (l.410) correm antes.
PoC O1 mede **409 `cnpj_duplicado`** em vez de 401 quando o CNPJ já existe noutro `cliente_id`.
**Impacto:** nenhum (sem escrita; oráculo 409 pré-existente e alcançável sem `endereco`; bloco
anti-duplicidade inalterado pelo commit). **Acção:** corrigir a frase na documentação.

### ℹ️-2 — Mapa de mutações no ficheiro de teste COMETIDO está desactualizado/errado
**Sustentação (medida por mim):** os comentários l.184-190 afirmam `MB5 (sem .toLowerCase() no corpo) → E10`.
Corri esse mutante: **11/11 passam ⇒ MB5 é EQUIVALENTE**, não mata E10 — porque `endereco` já sai
minúsculo de `validarEndereco` (l.383) antes da guarda. (O commit message e `_SEG1_mutacao_saida.txt`
declaram MB5 como equivalente — **correcto**; só o comentário do ficheiro está errado.) Além disso o
ficheiro descreve `ME1` como «`String(endereco)` (já é string)», enquanto o log de mutação define `ME1`
como «sem o `!!chamadorReg.endereco &&`» — **duas definições do mesmo mutante**.
**Impacto:** nenhum no comportamento (a equivalência do MB5 verifiquei-a; a guarda continua coberta por
MB1/MB4). **Acção:** alinhar/remover o mapa de mutações do ficheiro de teste (é o artefacto de segurança
que fica no repo).

### ℹ️-3 — Log de mutação sub-relata o conjunto morto do MB1
**Sustentação (medida por mim):** `_SEG1_mutacao_saida.txt` diz `MB1 (E1,E3)`; a minha execução do mesmo
mutante mata **E1, E3, E8, E11**. O veredicto `RED ✅` mantém-se, mas a enumeração está incompleta
(provável truncagem do nome pelo medidor — pitfall `^ok \d+ - (\S+)`).
**Impacto:** nenhum na conclusão; a evidência como documentação fica mais fraca do que o real.

### ℹ️-4 (contexto) — Repetição anónima do cadastro directo devolve 401
Comportamento **pré-existente do b.2** (cota já existe + anónimo não prova posse); não é regressão deste
commit nem quebra o frontend (que só posta após o GET de duplicidade dar 404). Registado para não ser
confundido com um defeito do V-4.

---

## Resumo da postura adversarial

Tentei refutar por **execução**, não por leitura: ~20 vectores de bypass activos (tipos, chaves
disfarçadas, unicode, poluição de protótipo, campos alternativos), prova bidirecional contra o código
antigo, mutação independente da guarda, comparação byte-a-byte das asserções e re-corrida da suíte
canónica com TTY. **O único «quase-achado» foi a ordenação das leituras antes da guarda (ℹ️-1), sem
impacto de segurança. Não encontrei qualquer bypass, qualquer escrita antes da recusa, qualquer
enfraquecimento de asserção ou qualquer saída de escopo.**

---

### Artefactos
- PoC adversário temporário `_tests/zz0-validador-poc.test.mjs` — **criado, corrido (12/12), APAGADO**.
- `cotas.mjs` mutado 3× para medição — **restaurado em todas**; md5 LF `48f0ba05befd289a34b4cce176036d20`
  antes e depois; `git status` limpo.
- Suíte: `C:/Users/Moltbot/tmp-utac105b3-val/suite-validador.txt` (tentativa sem TTY — registada como NÃO medida).
- Repo principal `C:/Users/Moltbot/Desktop/DESAFIOGUT`: **não tocado**.


---

# TRATAMENTO DOS ACHADOS (executor, 2026-10-01) — pós-veredicto

O veredicto foi **lido** e cada achado tratado. **Nenhum ⚠️** (nada a corrigir no comportamento).

## ℹ️-1 — «auth ANTES da leitura do store» inexacta → **CORRIGIDO**
O validador tem razão e a medição dele (PoC O1: 409 `cnpj_duplicado` em vez de 401) reproduz o que o
código faz. Corrigido em **dois lugares**, sem alterar comportamento:
- comentário de `cotas.mjs` (l.448+): passou a «ANTES da leitura da **cota** (`getCota`)» + parágrafo de
  precisão que regista o 409 e porque não é grave (sem escrita; oráculo 409 **pré-existente**, alcançável
  anonimamente sem `endereco`, bloco anti-duplicidade do MC12.3 inalterado);
- `_logs/UTAC105b.3_SEG0.md`: a linha «Ordem: ANTES da leitura do store» foi emendada.
**Declarado como limitação aceite** (não escalado): não parte nenhum caso legítimo e não abre escrita.

## ℹ️-2 — mapa de mutações do ficheiro COMETIDO errado → **CORRIGIDO**
Ressalva **procedente**: era um defeito num artefacto meu que fica no repo. O comentário dizia
`MB5 → E10` (falso: MB5 é **equivalente**, `validarEndereco` já devolve minúsculas) e omitia o `MC1`;
e definia `ME1` de forma diferente do mutador. **Reescrito** com o conjunto de mortos **medido**.

## ℹ️-3 — log de mutação sub-relatava os mortos → **CORRIGIDO NO INSTRUMENTO**
Ressalva **procedente e do instrumento**: `mut-utac105b3.mjs` imprimia só a **intersecção** com os
esperados, escondendo que `MB1` mata também `E8`/`E11`. Corrigido para reportar **todos** os mortos
observados + os sobreviventes. Re-corrido; o mapa do teste foi escrito a partir dessa medição:

| mutante | MORTOS (conjunto completo, medido) | esperado antes | veredicto |
|---|---|---|---|
| MB1 sem a guarda da posse | **E1, E3, E8, E11** | (E1,E3) | RED ✅ |
| MC1 tira as DUAS guardas | **E1, E2, E3, E8, E11** | (E1,E2,E3) | RED ✅ |
| MB2 anónimo tratado como user | **E1, E2, E8, E11** | (E1,E2) | RED ✅ |
| MB3 sem a isenção do admin | **E6** | (E6) | RED ✅ |
| MB4 aceita qualquer token | **E1, E3, E8, E11** | (E1,E3) | RED ✅ |
| MB5 sem `.toLowerCase()` no corpo | nenhum | — | EQUIVALENTE ✅ declarado |
| ME1 sem o `!!chamadorReg.endereco &&` | nenhum | — | EQUIVALENTE ✅ declarado |

Lições: (a) os esperados eram **subconjuntos** dos mortos reais — o mutador passava por isso mesmo;
um mutador que só conta o esperado **sub-relata por construção**; (b) `E8`/`E11` dependem da guarda
existir (é ela que dá o 401 antes do store), logo morrem em qualquer mutante que a remova.

## ℹ️-4 (contexto) — repetição anónima do cadastro directo → 401
Comportamento **pré-existente do UTAC105b.2**, re-confirmado pelo validador. **Registado como
limitação declarada**, não como defeito deste UTAC: o frontend só posta após o GET de duplicidade dar
404, logo o caminho legítimo não o atinge.

## Achados que o validador NÃO conseguiu refutar (registados como confirmação)
~20 vectores de bypass (campos alternativos, chaves com espaço/NUL, `0X`/unicode, tipos não-string,
protótipo poluído, chaves duplicadas) → **todos recusados ou ignorados**; asserções dos 7 testes
legados **byte-iguais** (60 linhas, `diff` vazio); suíte canónica re-corrida **com TTY** pelo validador →
**535/535 · 967/973 VERDE**, coincidindo com a minha. O validador **mediu o seu próprio pitfall**:
a 1.ª tentativa sem TTY deu `stdin is not a tty` e foi registada como **NÃO MEDIDA**, não como verde.

**Correcções feitas DEPOIS do veredicto** (comentários de código + documentação + instrumento):
**não re-validadas por um 2.º validador independente**, conforme o precedente da série. Mitigação:
a suíte canónica foi **re-corrida** a seguir (535/535 · 967/973 VERDE) e os três ficheiros continuam LF.
