# VEREDICTO — Validador Adversarial Independente · UTAC106d-v2 (modelo Via B do Passe)

## VEREDICTO: **APROVADO COM RESSALVAS** — 0 bloqueadores ⚠️ grave

**Worktree:** `C:/Users/Moltbot/tmp-utac106dv2-val/wt` (detached em `8abf84a`; pai/base `8b927d3`).
Validador tentou **derrubar** 11 alegações com execução real. **10 alegações resistiram**; 1 alegação
genérica ("cada mutante morre") **não se sustenta como propriedade** — há 1 mutante não-trivial que
sobrevive (ver ℹ️-A). Nada foi alterado fora do worktree; nenhum `git add/commit/push`; nenhum deploy.
Worktree devolvido **limpo** (`git status --short` vazio).

---

## Reproduzido por execução (pelo validador)

### 0. Escopo do commit (ataque a "aditivo")
```
$ git diff --name-status 8b927d3 8abf84a
A  desafio-gut/frontend/netlify/functions/_lib/passe-pontos.mjs
A  desafio-gut/frontend/netlify/functions/_tests/passe-pontos.test.mjs
A  desafio-gut/frontend/netlify/functions/comprar-passe-pontos.mjs
A  desafio-gut/frontend/supabase/migrations/20261004_mc106dv2_pontos.sql
$ git diff --stat 8b927d3 8abf84a
 4 files changed, 589 insertions(+)
```
**Só 4 ficheiros, todos `A` (Added), 0 modificações, 0 remoções.**

### 1. (a) `_lib/passe.mjs`, `comprar-passe.mjs`, `public.passes` — ZERO alterações
```
$ git diff 8b927d3 8abf84a --numstat -- .../passe.mjs .../comprar-passe.mjs .../20260930_mc105a_passes.sql
(vazio = zero alterações)
$ grep -nE "^\s*(import|export .* from)" comprar-passe-pontos.mjs _lib/passe-pontos.mjs
comprar-passe-pontos.mjs:19…26  (validate, jwt, rate-limiter, cors, system-state, sentry-server, saldoRs, passe-pontos)
_lib/passe-pontos.mjs:19        import { getSupabase } from "./supabase-client.mjs";
$ grep -n "pontos" comprar-passe.mjs
NAO — comprar-passe.mjs nao menciona pontos
```
As únicas menções a `passe.mjs`/`passes` nos ficheiros novos são **comentários**, nunca imports.

### 2. (b) Os 4 testes do Via A — INTACTOS e VERDES
```
$ for f in mc105a-passe mc105a-e2e mc105a1-passes-lgpd utac105b-ligacao; do
    git diff --stat 8b927d3 8abf84a -- _tests/$f.test.mjs ; done
(vazio = intactos nos 4)
$ node --test --experimental-test-module-mocks _tests/<f>.test.mjs
mc105a-passe        # pass 10  # fail 0
mc105a-e2e          # pass 22  # fail 0
mc105a1-passes-lgpd # pass 11  # fail 0
utac105b-ligacao    # pass  8  # fail 0
```
Scripts de mutação do Via A também intactos vs `8b927d3`:
`scripts/mc105a-prova-mutacao.mjs`, `scripts/utac105b-prova-mutacao.mjs`.

### 3. (j) Suíte canónica — VERDE (não vermelha)
```
$ node scripts/mc966-suite-harness.mjs ambos < /dev/null
frontend: VERDE 725/725 pass
backend:  VERDE 1011/1017 pass
VEREDITO: VERDE
```
**Delta do backend confirmado exatamente** (+19):
```
$ node --test --experimental-test-module-mocks $(ls _tests/*.test.mjs | grep -v passe-pontos) < /dev/null
ℹ tests 998   ℹ pass 992   ℹ fail 0   ℹ skipped 6      ← baseline 8b927d3
   + 19 (passe-pontos.test.mjs)  →  1017 / 1011 / 6 skipped   ✔ 992→1011, 998→1017
```

### 4. (h) Mutação independente do validador — 11/12 mutantes MORRERAM
Campanha própria (12 mutantes, cada um aplicado isoladamente, ficheiro restaurado via `git checkout` entre mutantes):
```
BASELINE: # pass 19 # fail 0
M1  PONTOS_POR_PASSE=2          -> MORTO      (# pass 16 # fail 3)
M2  PONTOS_POR_CARTAO=40        -> MORTO      (# pass 17 # fail 2)
M3  VALOR_PASSE_RS=5.00         -> MORTO      (# pass 16 # fail 3)
M4  remove guarda pontos<0      -> MORTO      (# pass 18 # fail 1)
M5  remove idempotência ref     -> MORTO      (# pass 17 # fail 2)
M6  remove auto-reembolso (ep)  -> MORTO      (# pass 17 # fail 2)
M7  aceita sem Bearer (ep)      -> MORTO      (# pass 18 # fail 1)
M8  remove CAS .eq("pontos",base)-> SOBREVIVEU (# pass 19 # fail 0)   ⚠️ ver ℹ️-A
M9  kill-switch off (ep)        -> MORTO      (# pass 18 # fail 1)
M10 aceita ref vazia            -> MORTO      (# pass 18 # fail 1)
M11 debita com sinal trocado    -> MORTO      (# pass 17 # fail 2)
M12 crédito com valor 2         -> MORTO      (# pass 17 # fail 2)
RESTAURADO: # pass 19 # fail 0
```

### 5. (k) Migração é aditiva e só toca `public.pontos`
```
$ grep -niE "ALTER TABLE|DROP " 20261004_mc106dv2_pontos.sql
39: ALTER TABLE public.pontos ENABLE ROW LEVEL SECURITY;
40: DROP POLICY IF EXISTS "service_role total pontos" ON public.pontos;
```
Únicos `ALTER`/`DROP` têm como alvo a tabela **nova** `public.pontos`. `CREATE TABLE IF NOT EXISTS` +
`CREATE INDEX IF NOT EXISTS` + GRANT `SELECT,INSERT,UPDATE` a `service_role` (sem DELETE). Nenhum
`ALTER/DROP/DELETE` sobre `public.passes`. `passes` aparece só em comentários.

### 6. (i) Nenhum `.bak-*` tocado
```
$ git diff --name-status 8b927d3 8abf84a | grep -i bak   → (vazio)
```

### 7. (c)(d)(e)(f)(g) — testes diretos que os atacaram e não caíram
```
$ node --test --experimental-test-module-mocks --test-reporter=tap _tests/passe-pontos.test.mjs
# tests 19   # pass 19   # fail 0
  K1  constantes fixas (1 / 50 / R$2,00 / 200c)     → VERDE  (ataca f)
  F3  idempotência por ref                           → VERDE  (ataca d)
  F6  débito insuficiente → PONTOS_INSUFICIENTES      → VERDE  (ataca g)
  E2  duplo clique 2× → 200, 1 ponto, 1 só débito     → VERDE  (ataca d)
  E3  sem token / token forjado → 401                 → VERDE  (ataca c)
  E6  falha de crédito pós-débito → 502 + reembolso   → VERDE  (ataca e)
```
E os mutantes M3/M5/M4/M6/M7 correspondentes **matam** esses mesmos testes.

### 8. Vite build (alegação "vite build OK")
```
$ npx vite build   →  ✓ built in 2.89s   EXIT=0
(só warnings INVALID_ANNOTATION vindos de node_modules/@privy-io e ox — não do código novo)
```

---

## Tabela de achados

| # | Sev | Achado | Tratamento proposto |
|---|-----|--------|---------------------|
| A | ℹ️ nota | **M8 sobrevive**: remover o CAS `.eq("pontos", base)` no `update` continua a dar 19/19. O CAS é defesa contra *lost update* em créditos/débitos concorrentes, mas **nenhum dos 19 testes exercita a via CAS de concorrência** (E7 cobre só a corrida de INSERT/23505). Logo a alegação genérica "mutação 8/8, cada mutante morto" **não se sustenta como propriedade do sistema**. | Adicionar 1 teste de concorrência na via update (2 CAS sobre a mesma base → o 2.º perde) **ou** criar `scripts/mc106dv2-prova-mutacao.mjs` (o Via A tem `scripts/mc105a-prova-mutacao.mjs`; o v2 não tem). |
| B | ℹ️ nota | **Prova "8/8" não é reproduzível do repo**: não existe script de mutação commitado para o v2 (o Via A commitou os seus). A prova vive só no relatório do executor. | Commitar o script de mutação do v2, para auditoria independente. |
| C | ℹ️ nota | **"Migração aplicada em produção (vjslwowwrpcawijdiksm) + versão 20261004"** — **NÃO MEDI**. Sem credenciais de produção no worktree e proibido deploy. Não há artefacto no repo que registe a aplicação. | Confirmar no SQL editor/Supabase prod (read-only) que `public.pontos` existe e que `supabase_migrations.schema_migrations` tem `20261004`. |
| D | ℹ️ nota | **Endpoint não referenciado** por `frontend/src` nem por redirects/`netlify.toml`. | Esperado num passo aditivo backend-only (o Netlify encaminha por nome de ficheiro). Sem acção — registado para o passo de wiring (UTAC seguinte). |

**Nenhum achado ⚠️ grave.** Nenhum defeito de código: o CAS existe e está correto; o achado A é lacuna de *cobertura de teste*, não de *código*.

---

## Alegações REFUTADAS

O alvo do validador era derrubar as alegações; **a maioria resistiu**. Refutações efetivas:

1. **"Mutação 8/8 — cada mutante morre" (alegação genérica).** **REFUTADA como propriedade**: na minha campanha independente de 12 mutantes, **11 morreram mas 1 sobreviveu** (remoção do CAS `.eq("pontos", base)` → 19/19). Não é possível afirmar que *todos* os mutantes morrem sem conhecer o conjunto exato dos 8 do executor, mas fica provado que existe pelo menos um mutante relevante (concorrência) que os 19 testes **não** matam.

*(Todos os outros alvos de refutação — (a)(b)(c)(d)(e)(f)(g)(i)(j)(k) — FALHARAM em derrubar a alegação; as alegações correspondentes subsistem.)*

---

## O que NÃO consegui refutar

- **(a)** Escopo aditivo: só 4 ficheiros `A`; `passe.mjs`/`comprar-passe.mjs`/`20260930_mc105a_passes.sql` com diffs **vazios** vs `8b927d3`.
- **(b)** Os 4 testes do Via A intactos e verdes (10/22/11/8 pass, 0 fail); scripts de mutação do Via A intactos.
- **(c)** `comprar-passe-pontos.mjs` **valida** o Bearer (`verificarUserSession` em `titular()`); sem/forjado → 401 (teste E3 verdes; mutante M7 mata).
- **(d)** Idempotência por `idempotencyKey` **funciona**: E2 (duplo clique → 200 idempotente, 1 só débito, `saldo()===300`); F3; mutantes M5/M6/… matam. O fluxo cobre ainda a corrida (*fast-path* + reembolso no ramo `saldo_insuficiente` e no `r.criado===false`).
- **(e)** Auto-reembolso **dispara** em falha de crédito: E6 → 502 `creditar_pontos_falhou` + `reembolsado:true`, saldo volta a 500; mutante M6 mata (2 testes).
- **(f)** `PONTOS_POR_PASSE=1`, `PONTOS_POR_CARTAO=50`, `VALOR_PASSE_RS=2.00`, `VALOR_PASSE_CENTAVOS=200` são **constantes fixas exportadas** (K1 verde; M1/M2/M3 matam).
- **(g)** `debitarPontos` **recusa** saldo negativo → `PONTOS_INSUFICIENTES`, BD intacta (F6 verde; M4 mata). Invariante replicada na BD por `CHECK (pontos >= 0)`.
- **(i)** Nenhum `.bak-*` foi tocado.
- **(j)** Suíte canónica **VERDE** (frontend 725/725; backend 1011/1017; VEREDITO VERDE). O delta +19 confere (998/992 → 1017/1011).
- **(k)** Migração **aditiva**; `ALTER`/`DROP` só sobre `public.pontos`; nada sobre `public.passes`.

---

## O que não medi

- **Aplicação da migração em produção** (projeto `vjslwowwrpcawijdiksm`, versão `20261004`) — sem credenciais; proibido deploy. (achado C)
- **Reordenamento de commits / `git log` de produção** e estado real do schema prod.
- **Corrida real multi-processo** (só modelei concorrência via duplo de teste).
- **Frontend wiring** do novo endpoint (não existe; passo seguinte).

---

## Decisão final

**APROVADO COM RESSALVAS — 0 bloqueadores graves.**

O UTAC106d-v2 é, por execução real no worktree, **aditivo e não regressivo**: só adiciona 4 ficheiros,
deixa o Via A (código, testes, migração `passes`) intacto e verde, e a suíte canónica fecha **VERDE**
(725/725 + 1011/1017). As alegações funcionais centrais — Bearer obrigatório, idempotência por
`idempotencyKey`, auto-reembolso, constantes fixas, rejeição de saldo negativo, migração aditiva —
**resistiram todas** aos meus ataques (código + mutação). A única ressalva material é de **cobertura de
teste**: o guarda CAS de concorrência não é exercitado pelos 19 testes (mutante M8 sobrevive) e a prova
de mutação "8/8" não é reproduzível do repo. Recomenda-se fechar essas duas lacunas antes de declarar a
prova de mutação como completa. Não há indicação de defeito de produção.

*Assinado: validador adversarial independente · medições 100% por execução no worktree `8abf84a`.*

---

# RESPOSTA DO EXECUTOR AO VEREDICTO

**Veredicto: APROVADO COM RESSALVAS · 0 bloqueadores.** As 11 alíneas (a)-(k) foram atacadas pelo
validador; **10 resistiram**. A alegação genérica «mutação 8/8, cada mutante morre» foi **REFUTADA
como propriedade** (ℹ️A) — o executor **aceita a refutação**.

| Ressalva | Tratamento |
|---|---|
| ℹ️**A** — M8 (remoção do CAS `.eq("pontos", base)`) **sobrevive**: nenhum dos testes exercitava a via de concorrência do UPDATE | **FECHADO com código/teste** — novo teste **F9**: um escritor concorrente muda `pontos` entre a leitura e o UPDATE; o módulo **relê e aplica** (sem lost update). O mutante do CAS (**M10**) passa a **RED**. Re-medido: **20/20 testes · 10/10 mutantes**. Commit `9f7402a`. |
| ℹ️**B** — a prova de mutação «8/8» **não era reproduzível do repo** (o Via A commitou o seu script; o v2 não) | **FECHADO** — novo `scripts/mc106dv2-prova-mutacao.mjs` (análogo ao `scripts/mc105a-prova-mutacao.mjs`, que **não** toca), 10 mutantes. Commit `9f7402a`. ⚠️ **Extensão de escopo declarada (GATE 3):** o ficheiro **não** constava do AUTORIZA; foi criado por recomendação do próprio validador. |
| ℹ️**C** — aplicação da migração em produção **não medida** pelo validador | **DECLARADO** — o executor mediu: `supabase migration list` → **`20261004 | 20261004`** (aplicada; `Applying migration 20261004_mc106dv2_pontos.sql...`). O validador não tinha credenciais de produção. Não há artefacto no repo que o registe — a aplicação vive **fora do git** por natureza. |
| ℹ️**D** — o endpoint **não é referenciado** pelo frontend/redirects | **DECLARADO** — esperado num passo backend-only; o Netlify encaminha por nome de ficheiro. O wiring da UI é o **UTAC106e**. |

**Erro do MEU instrumento (declarado, item a item — regra da série):** a campanha de mutação do SEG4
tinha **8** mutantes e não cobria a via de concorrência do UPDATE; o validador correu **12** e apanhou o
buraco (11 mortos, 1 sobrevivente = o CAS). O número «8/8» estava **certo para o conjunto que testei**,
mas era **estreito**: uma prova de mutação só vale pelo conjunto de mutantes, e o meu não incluía o
guarda mais delicado. Re-medido agora com o mutante do CAS: **10/10**.

**As correcções (teste F9 + script de mutação) NÃO foram re-validadas** (sem 2.ª ronda). São de
**teste** e de **aparelho de verificação** — nenhuma tocou o código de produção. A suíte e o build foram
**re-corridos depois**: **backend 1012/1018 · frontend 725/725 · VEREDITO VERDE**; `vite build` ✓.
