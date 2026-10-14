# UTAC110f — SEG5 VALIDADOR ADVERSARIAL INDEPENDENTE

**Veredito final: APROVADO COM RESSALVAS** · **Bloqueadores (⛔): 0** · ⚠️: 5 · ℹ️: 5

Alvo: commit `602e3ad` (sobre `926c5df`). Isolamento A13: worktree próprio criado com
`node scripts/worktree-helper.mjs criar C:/Users/Moltbot/Desktop/tmp-110f-val/wt 602e3ad` e removido com
`... remover ...` (`exit 0`, `"nota": "removido"`). Todas as mutações/sondas foram feitas no worktree e restauradas
(md5 idêntico em todos os mutantes; `git status --short` vazio antes da suíte). Na árvore principal a ÚNICA escrita é
este ficheiro. Nada de push, deploy, env, Supabase ou Netlify.

Sondas próprias (guardadas fora do repo, no scratchpad): `seg5-probe-fontes.test.mjs` (P1–P9),
`seg5-probe-referral.test.mjs` (Q1–Q4), `seg5-mut.mjs` (10 mutantes), `relogio.mjs` (relógio deslocado via `--import`).
Todas usam os MESMOS duplos de fronteira do executor (`_pontos-duplo-110f.mjs`, `_blobs-cas-duplo.mjs`) e o código REAL.

## Reprodução das alegações do executor

| Alegação | Comando | Resultado |
|---|---|---|
| Suíte frontend 1015/1015, backend 1185/1191 | `npm test < /dev/null` (RAM livre 1752 MB) | `frontend: VERDE 1015/1015 pass` · `backend: VERDE 1185/1191 pass` · `VEREDITO: VERDE` — **confere** |
| Testes-alvo | `node --experimental-test-module-mocks --test` nos 5 ficheiros backend + `node --test` no frontend | 48/48 + 5/5 — **confere** |
| Mutação 17/17 | `node _tests/utac110f-prova-mutacao.mjs` | `17/17 PROVADOS`, todos com «restauro md5 idêntico» — **confere** |

## Tabela por item

| Item | Veredito | Evidência resumida |
|---|---|---|
| (a) login > 1×/dia Manaus | **NÃO REFUTADO** | P2: 10 paralelos a `2027-01-01T03:59:59.999Z` + 10 a `04:00:00.000Z` → `pontos=10`, refs `["login:2026-12-31","login:2027-01-01"]`, 2 creditados, 0 falhas. P3: 40 paralelos no mesmo dia → `pontos=5`, 0 falhas. |
| (b) missão > 1×/dia, programado, lance falhado, falha quebra lance | **NÃO REFUTADO** | L1–L6 do executor verdes; meus mutantes O5 (tirar o fail-soft) e O9 (creditar no ramo de blindagem falhada) **mortos** (L6, L5). Ver ℹ️-1 (modo legado). |
| (c) indicação: múltiplo crédito, auto-indicação, limite, throttle | **PARCIALMENTE REFUTADO (sem bloqueador)** | Idempotência OK (Q3: 5 re-submissões paralelas → A=50, B=50). Auto-indicação com caixas → `AUTO_INDICACAO` (P7). **Limite mensal ultrapassável em paralelo** (P8/Q4: 14 pagos vs limite 10) — declarado. **TOCTOU do vínculo paga 2 indicantes** (Q2). **Throttle de IP = atraso, não bloqueio** (Q1). Ver ⚠️-2/3/4. |
| (d) UTC-4 mal implementado | **NÃO REFUTADO** | `diaManaus` = `new Date(t − 4h).toISOString().slice(0,10)` — independente do fuso da máquina (máquina = `America/Sao_Paulo`, offset 180). P1: virada de ano, bissexto (`2028-03-01T03:59Z → 2028-02-29`), string/number → `null`. Mutante O6 (fuso local) **morto** (D1/A1/A2). |
| (e) CAS / sobrescrita de outras colunas | **NÃO REFUTADO** | P4: escritor concorrente (consumo de crédito + movimento de fidelidade) injectado entre ler e gravar → historico_lance `["passe:1","lance:k","login:2026-10-13"]`, `creditos_lance=0`, `pontos=8`, `historico` com 2 entradas — nada perdido. Ver ℹ️-3 (CONFLITO com ≥6 concorrentes). |
| (f) ledger / forma / motivos | **NÃO REFUTADO** | P5: todas as entradas com chaves exactamente `{campo,data,delta,motivo,ref}`, `campo="pontos_lance"`, motivos ∈ `MOTIVOS_PONTOS_LANCE` (`login`,`missao`,`indicacao`), A=65 (5+10+50), B=50. |
| (g) auth `/login-diario` + AppContext | **NÃO REFUTADO no código; teste com lacuna** | P9: token A + corpo `{endereco:B}` → 200, A=5, B=0; token lance-auth → 401; PUT → 405; lixo → 401. AppContext: `authToken` vem de `/auth-user` (`setAuthToken(data.token)`, AppContext.jsx:849-865) = user-session; `apiPost(path, body, {token})` (src/lib/api.js:60). **Mas** o mutante O8 (ler endereço do corpo) **sobrevive** — ver ⚠️-5. |
| (h) testes vácuos | **PARCIALMENTE REFUTADO** | 17/17 do executor confirmados. Meus 10 mutantes: **7 mortos, 3 sobreviventes** (O2, O7, O8). Além disso, **bomba-relógio no B5** (⚠️-1). |
| (i) escopo | **NÃO REFUTADO** | `git diff --name-only 926c5df 602e3ad`: 14 ficheiros, todos em `_lib/`, `netlify/functions/`, `_tests/`, `src/__tests__/`, `_logs/`, `AppContext.jsx`. Grep por `guto|chatbot|contract|Termos|leilaoLock|.env|netlify.toml` nos nomes → vazio. `process.env` novo só em testes. `EM_BREVE_MODE = true` (leilaoLock.js:10). |
| (j) migração | **NÃO REFUTADO** | `git diff --name-only 926c5df 602e3ad -- '*.sql'` → vazio. O código novo não faz I/O directo ao Supabase; escreve só via `creditarPontosLance` → `aplicar()` que grava `pontos_lance`, `historico_lance`, `atualizado_em` (INSERT inicial: + `creditos_lance:0`, `pontos_lance:0`), colunas existentes (migrações 20261004 + 20261013, todas NOT NULL com DEFAULT). |

## Achados

### ⛔ Bloqueadores
Nenhum.

### ⚠️ Ressalvas

**⚠️-1 Bomba-relógio no teste B5 — a suíte fica VERMELHA a partir de 2026-11-01 (UTC).**
`creditarIndicacao(…, agora)` calcula o mês do limite com o `agora` injectado, mas as entradas do histórico são
datadas pelo relógio REAL dentro de `aplicar()` (`data: new Date().toISOString()`). O B5 injecta `agora=2026-10-20`
e só passa porque hoje o relógio real também está em Outubro de 2026.
Evidência (`node --import relogio.mjs` com o `Date` deslocado; código e testes intocados):
```
== relógio 2026-10-20T12:00:00Z → ℹ pass 33 · ℹ fail 0
== relógio 2026-11-15T12:00:00Z → ✖ B5 … actual: [ true, true, undefined, true ]  expected: [ true, false, 'LIMITE_MENSAL', true ]
== relógio 2027-02-10T12:00:00Z → ✖ B5 (idem)
```
Em produção não há defeito (ambos usam o relógio real), mas o parâmetro `agora` é enganador: controla o mês da
contagem e NÃO o mês da entrada gravada. Correcção sugerida: fixar o relógio no teste (`mock.timers.enable({apis:["Date"], now})`)
ou fazer o ledger aceitar a data. Prioridade alta: em 18 dias o `npm test` fica vermelho sem nenhuma alteração de código.

**⚠️-2 Limite mensal de 10 ultrapassável em paralelo (declarado pelo executor; medido).**
P8/Q4: 9 indicações pagas + 6 novas em `Promise.all` → **14 pagas** ao indicante (limite 10); a 6.ª devolveu
`{"ok":false,"code":"CONFLITO_CONCORRENCIA"}`. O excesso é limitado pela concorrência (≤ ~5 por rajada, pelo
`MAX_TENTATIVAS=5`), não é marginal de 1 como sugere o comentário («podem dar 11»). Na prática exige N contas
indicadas a submeter no mesmo instante, cada uma a passar user-session, Sybil e throttle de IP. Corrigir o comentário
ou mover a verificação para dentro do CAS.

**⚠️-3 TOCTOU do vínculo ⇒ dois indicantes pagos pelo mesmo indicado.**
Q2: o mesmo indicado B submete os códigos de A e de C em paralelo → `200 200 A=50 C=50 B=50`. A corrida é
pré-existente em `registrarIndicacao` (`buscarVinculoPorIndicado` não é atómico), mas o UTAC110f passa a pagar
+50 pontos a cada indicante vinculado. O ledger só deduplica por par (`indicacao:<indicado>` por indicante).
Sequencialmente está correcto (R3 do executor: 409 `ja_indicado`).

**⚠️-4 Throttle de IP é só um atraso.**
Q1: 3.ª conversão do mesmo IP/hora → `pontosLance:null`, 0 pontos; re-submeter o MESMO código de outro IP → `200`,
`idempotent:true`, `{"indicante":true,"indicado":true}`, 50/50. Cumpre literalmente o R18 («só no ramo que passa o
throttle») e é o mesmo comportamento pré-existente da conversão de senhas (`registrarConversao` também converte no
retry). Fica registado para o operador decidir.

**⚠️-5 Três mutantes do SEG5 sobrevivem (lacunas reais de teste).**
`node seg5-mut.mjs` (baseline `fail:0 pass:48`; todos os restauros com md5 idêntico):
```
SOBREVIVE O2 limite conta também o bónus RECEBIDO (indicacao-recebida) — fail=0 pass=48
SOBREVIVE O7 referral troca os papéis (creditarIndicacao(endereco, r.indicador)) — fail=0 pass=48
SOBREVIVE O8 login-diario aceita endereço do corpo (IDOR) — fail=0 pass=48
MORTOS: O1 (>= → >), O3 (sem toLowerCase), O4 (ignora pausa), O5 (sem fail-soft), O6 (fuso local),
        O9 (missão no ramo de blindagem falhada), O10 (guarda de auto-indicação enfraquecida) — 7/10
```
- **O8**: o A7 afirma «endereço SÓ do token», mas o helper `login()` do teste não envia corpo — a afirmação não é
  medida. O código actual está correcto (P9 prova-o), mas uma regressão IDOR passaria verde. Acrescentar ao A7 um corpo
  `{endereco: B}` e afirmar B=0.
- **O7**: trocar indicante↔indicado no `referral.mjs` passa R1–R7 (ambos recebem 50 nos dois casos). Efeito real:
  o indicante só receberia UMA vez na vida (`indicacao-recebida`) e o limite mensal aplicar-se-ia ao indicado.
  Afirmar as `ref` gravadas no R1 (`indicacao:<B>` em A, `indicacao-recebida` em B).
- **O2**: nenhum teste mistura, no mesmo endereço, bónus recebido e bónus de indicante; o filtro
  `startsWith("indicacao:")` não é medido.

### ℹ️ Informativos

**ℹ️-1 Modo legado (não-mainnet):** a persistência do lance é não-fatal (`catch` → `console.warn`); a missão é creditada
mesmo que o blob não tenha sido gravado. Em mainnet a blindagem é fatal e a missão não é creditada (L5 + O9 mortos).
Comportamento herdado; o débito já ocorreu nesse ponto.

**ℹ️-2 Indicante inválido ainda paga o indicado:** P7 — `creditarIndicacao(" "+A, A)` →
indicante `ENDERECO_INVALIDO`, indicado `creditado:true` (50). Não é explorável (o indicante vem do store de códigos,
não do cliente), mas `ok:false` com indicado creditado é assimétrico.

**ℹ️-3 CONFLITO perde o crédito silenciosamente com ≥6 escritores concorrentes no mesmo endereço:** Q4 — a 6.ª
chamada devolve `CONFLITO_CONCORRENCIA`. Login: o `/login-diario` responde 502 e o AppContext volta a tentar.
Missão: o próximo lance do dia volta a tentar. Indicação: só com nova submissão do código.

**ℹ️-4 `/login-diario` não tem rate limit:** cada chamada autenticada faz ≥1 leitura ao Supabase. Mesmo padrão do
`ler-pontos.mjs` em que se baseia.

**ℹ️-5 Bug pré-existente fora do escopo** (não contado): `referral.mjs` passa `mascararEndereco(...)` ao
`registrarConversao` (commit 0ec7d13). O UTAC110f usa correctamente os endereços reais (mutante M12 do executor morto).

## Tokens
O uso exacto de tokens não está disponível ao validador; estimativa de ~85 mil tokens de contexto consumidos nesta validação.
