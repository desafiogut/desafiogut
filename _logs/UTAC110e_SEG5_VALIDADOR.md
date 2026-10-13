# UTAC110e — SEG5 — VEREDICTO DO VALIDADOR ADVERSARIAL

Commit validado: `0a1350b39e1807d02b48819cc4a7686375483e6b` · worktree `C:/Users/Moltbot/tmp-utac110e-val/wt` (A13, 4 junctions, sem `rm -rf`).
Data: 2026-10-13. Zero alterações de código no repositório (os meus scripts vivem em `C:/Users/Moltbot/tmp-utac110e-val/val/`; árvore `git status` limpa no fim; cada mutante restaurado com md5 idêntico).

## 1. Sumário e veredicto

**PARCIAL — 1 BLOQUEANTE.**

O código da aplicação (lib, 4 endpoints, compra dos Passes, hook, Carteira) resistiu a quase todos os ataques. O que cai é a **migração**:
`20261014_utac110e_eco_quildo.sql` **não liga RLS nem revoga os privilégios de `anon`/`authenticated`**. Medido no Supabase de produção
numa transacção revertida: com o papel `anon` (a chave pública que vai no bundle do frontend) dá para **criar saldo do nada, zerar a conta de
outra pessoa e reescrever o lastro**. Isto anula ao nível da base de dados as garantias do Art. 49º (não transferível) e do Art. 50º (lastro)
que o código da lib defende. Todas as tabelas irmãs (`pontos`, `passes`, `palpites`, `resgates`, `cupons`) têm `relrowsecurity = true`.
Se a migração for aplicada como está, o defeito fica explorável a partir do browser de qualquer pessoa.

Há ainda 2 mutantes meus sobreviventes (caminhos de reversão dos endpoints sem teste) e 1 achado de dupla falha. Nenhum destes é bloqueante.

## 2. Alegações 1-10

### (1) O ECOQUILDO pode ser convertido em dinheiro — **NÃO REFUTADA no código / REFUTADA na base de dados (ver §4 A1)**
- `grep -rln "eco_quildo|eco-quildo|EcoQuildo"` em `src` e `netlify/functions`: só os ficheiros do UTAC. Nenhum endpoint credita R$ a partir do ECOQUILDO;
  `usar-eco-quildo` só debita ECOQUILDO e mexe em `total_usado`. Não existe chamada a `reembolsarSaldoRs`/`creditarSaldoRs` com origem no ECOQUILDO.
- Ressalva: a conversão não existe no código, mas o defeito A1 deixa qualquer pessoa reescrever o próprio saldo — a «não-convertibilidade» deixa
  de ter valor se a moeda puder ser fabricada.

### (2) O ECOQUILDO pode ser transferido entre contas — **REFUTADA (via base de dados)**; o código está certo
- Código: `usar-eco-quildo.mjs:70` → `const endereco = t.endereco` (sai do Bearer). O meu mutante **V1** (`debitarEcoQuildo(body?.endereco ?? endereco, …)`)
  é morto pelo teste B3 (fail=1). `creditar-eco-quildo` aceita `endereco` no corpo, mas está atrás de `autenticarAdmin` (mutante **V8** sem a guarda → morto por B4).
- Base de dados: com `SET LOCAL ROLE anon`, `UPDATE public.eco_quildo SET saldo=0 WHERE endereco=<vítima>` → **1 linha alterada**, `saldo_vitima_depois=0`;
  `INSERT … saldo=1000000` → **OK**. Saída verbatim (bloco `DO` terminado em `RAISE EXCEPTION`, nada persistido):
  ```
  RESULTADO(revertido): anon_insert=OK anon_update_vitima_linhas=1 anon_update_lastro_linhas=1 anon_select_count=2 saldo_vitima_depois=0
  ```
  Não é uma «transferência» com destinatário, mas é pior: tirar a uma conta e pôr noutra é possível com dois pedidos PostgREST.

### (3) A compra do Passe não credita ECOQUILDO — **NÃO REFUTADA**
- C1/C2 (relâmpago e programado) verdes; mutante executor M12 morto (fail=6); o meu **V9** (retry sem `garantirEcoQuildo`) morto por C6/C8 (fail=2).
- `ref` do ECOQUILDO = `passe-<tipo>:<chave>` (C1 verifica `historico[0].ref`).

### (4) O lastro não actualiza ou actualiza errado — **NÃO REFUTADA no código**
- Unidades: `CENTAVOS_POR_ECOQUILDO = 100`; mutante M1 (=1) morto (fail=14). C1 verifica `[1, 0, 100]`, C3 acumula, C7 ciclo `(3, 2, 100)`.
- Reserva derivada: M2 morto (fail=12); o meu **V14** (`novoUsado = usado`, uso não conta) morto (fail=3, A8/B2/C7).
- Sinal: M8 (débito vira crédito) morto (fail=6).
- `lastro-eco-quildo` denuncia incoerência: o meu **V7** (`coerente: true` fixo) morto por B5.
- Deriva sob dupla falha: ver §4 A3. Escrita directa pela `anon`: ver §4 A1 (`anon_update_lastro_linhas=1`).

### (5) O saldo pode ficar negativo ou não-inteiro — **NÃO REFUTADA**
- CHECKs da migração medidos em produção (revertido): `saldo=-1` → **23514**; `reserva_rs_centavos=-1` → **23514**; `historico='{}'` → **23514**; `id=2` no lastro → **23514**.
- Fracção: `INSERT saldo=1.5` → **aceite e arredondado para 2** (coluna `INTEGER`, coerção do Postgres). Não chega lá pela lib: `ehInteiroPositivo`
  (o meu **V16**, aceitar fracção na lib → morto por A4) e a guarda do endpoint. O meu **V15** (tirar a guarda de inteiro do endpoint) **sobrevive**, mas é
  **equivalente**: a lib recusa a seguir com `VALOR_INVALIDO` → 400.
- Lib: M9 (sem guarda de negativo) morto (fail=3); B2 testa `0, -1, 1.5, "3", null` → 400.

### (6) A idempotência não funciona — **NÃO REFUTADA (caminho normal) / PARCIAL (dupla falha, §4 A3)**
- B2: mesma chave → 200 `idempotent:true` e o lastro não se mexe. O meu **V6** (tirar o `return` idempotente do `usar`) morto por B2.
- C6: 5 cliques simultâneos → um ECOQUILDO e um lastro. O meu **V2** (registar lastro também com `criado=false`) morto por C6.
- B4: o crédito de admin com a mesma `chave` → 200 sem emitir 2×.
- M11 (ref constante) morto (fail=4).

### (7) A migração quebra dados — **NÃO REFUTADA quanto a dados / REFUTADA quanto a segurança**
- Estado de produção antes e depois: `to_regclass('public.eco_quildo') = null`, `to_regclass('public.eco_quildo_lastro') = null`, 27 tabelas em `public` —
  **a migração não está aplicada** e nenhuma das minhas sondas persistiu.
- Aditiva: só `CREATE TABLE IF NOT EXISTS` + `INSERT … ON CONFLICT DO NOTHING`. Corri o DDL **2× na mesma transacção** → `lastro_linhas=1` (re-executável).
- Revertível: as 2 tabelas nascem neste UTAC, logo o `DROP TABLE` do rollback não apaga dados anteriores.
- **Defeito:** não tem `ENABLE ROW LEVEL SECURITY` nem `REVOKE`. `grep -ciE "row level security|revoke|grant"` no ficheiro → **0**. Grants medidos na
  transacção: `anon` e `authenticated` com `DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE`; `rls=false`. Ver §4 A1.

### (8) A UI mostra número errado — **NÃO REFUTADA**
- Mutantes meus no frontend (`val/mut-front.mjs`, contra `src/__tests__/utac110e-front.test.mjs`):
  - F1: o bloco ECOQUILDO mostra `creditosLance` → **morto** (fail=2)
  - F2: erro mostra 0 → **morto**
  - F3: `Number()` coage o saldo → **morto**
  - F4: endpoint `ler-pontos` → **morto**
  - F5: sem releitura após compra → **morto**
  - F6: pedido sem Bearer → **morto**
  - F7: sem aviso de erro → **morto**
  - F8: grelha sempre com 3 colunas → **morto**
  - F9: passar `""` como erro ao `textoSaldo` → **sobrevive**. É **equivalente**: o hook põe `saldo=null` sempre que há erro, e `n == null` dá «—» na mesma.
- Resultado: **8/9 mortos, 1 equivalente**.
- O teste C é bidireccional (0 e 5). O teste N confirma que não há botão, link nem `onClick` no bloco.
- ℹ️ Na janela em que já há `address` mas ainda não há `authToken`, o hook põe `saldo=0` e `loading=false`: a Carteira mostra «0» por instantes. É o mesmo padrão do `usePontos` (`VAZIO`), logo é coerente com o resto do ecrã, mas é um «0» não medido.

### (9) Os testes são falsos — **PARCIAL**
- 15/15 mutantes do executor reproduzidos (baseline `pass=58`, todos PROVADOS, md5 idêntico).
- Os meus mutantes do backend (corridos contra a suíte INTEIRA `_tests/*.test.mjs`, baseline `fail=0 pass=1150`): **13/17 mortos**. Os 4 sobreviventes:
  - **V3** — `usar-eco-quildo`: quando o lastro falha, o débito NÃO é revertido. **Sobrevive (fail=0). Real**: nenhum teste exercita a falha do lastro no `usar`.
  - **V4** — `creditar-eco-quildo`: quando o lastro falha, a emissão NÃO é revertida. **Sobrevive (fail=0). Real**: emissão sem lastro sem teste no endpoint de admin.
  - **V15** — equivalente (ver alegação 5).
  - **V17** — `respostaIdempotente` ignora `temRef(st.led.historico)`. Equivalente: `creditarCreditoLance` é idempotente por `ref` (`ledger-lance.mjs:83-84`).
- Os testes não modelam RLS nem grants. O duplo `_supabase-duplo-mc105a.mjs` corre como `service_role`, por isso nenhum teste podia apanhar A1.

### (10) O escopo saiu do autorizado — **NÃO REFUTADA**
`git show --stat 0a1350b` → 18 ficheiros:

| ficheiro | classificação |
|---|---|
| `supabase/migrations/20261014_utac110e_eco_quildo.sql` | AUTORIZADO |
| `_lib/eco-quildo.mjs` | AUTORIZADO |
| `ler-/usar-/creditar-/lastro-eco-quildo.mjs` | AUTORIZADO |
| `_lib/comprar-passe-tipado.mjs` | AUTORIZADO (handler partilhado, declarado como conflito 1) |
| `_tests/utac110e-eco-quildo.test.mjs`, `_tests/utac110e-prova-mutacao.mjs` | AUTORIZADO |
| `_tests/_supabase-duplo-mc105a.mjs` (+30) | AUTORIZADO (infra de teste) |
| `_tests/utac110d-dois-passes.test.mjs` (+6) | AUTORIZADO com nota: só fixture aditiva (semeia o lastro); 0 asserções alteradas. ⚠️ O comentário diz «como a produção a tem» — falso hoje, a linha não existe em produção |
| `src/hooks/useEcoQuildo.js`, `src/pages/MinhaCarteira.jsx`, `src/__tests__/utac110e-front.test.mjs` | AUTORIZADO |
| `_logs/*` (2 md + 2 png) | AUTORIZADO |

`grep -iE "guto|contract|\.sol|cors|Termos|netlify.toml|\.env|package"` na lista → **vazio**. GUTO, contrato, gate legal, `cors.mjs`, env e `package*` não foram tocados.

## 3. Números reproduzidos

| medida | valor |
|---|---|
| RAM livre (A14) | 1º trio 1706/1471/1200 MB → **não** corri a suíte; 2º trio, antes da suíte: **1642/1644/1630 MB** |
| Suíte canónica (`node scripts/mc966-suite-harness.mjs ambos`, foreground, `< /dev/null`) | **frontend VERDE 1010/1010 · backend VERDE 1150/1156** |
| Testes ECOQUILDO | 22/22 pass |
| Mutantes do executor | **15/15** reproduzidos |
| Mutantes meus — backend | **13/17 mortos** (2 sobreviventes reais V3/V4; 2 equivalentes V15/V17) |
| Mutantes meus — frontend | **8/9 mortos** (F9 equivalente) |

O enunciado deste SEG5 dá «frontend 999/999» como baseline. É o número de **antes** do UTAC. O commit declara **1010/1010** e eu reproduzi 1010/1010: a diferença de +11 é o `utac110e-front.test.mjs`.

## 4. Achados novos

### A1 — ⛔ BLOQUEANTE — migração sem RLS: `anon` escreve saldo e lastro
- **Reprodução mínima.** No Supabase de produção, num bloco `DO … RAISE EXCEPTION` (tudo revertido; confirmei depois que as tabelas continuam ausentes):
  1. corro o DDL da migração;
  2. `SET LOCAL ROLE anon`;
  3. `INSERT` com saldo 1 000 000 → OK;
  4. `UPDATE` da vítima → 1 linha;
  5. `UPDATE eco_quildo_lastro` → 1 linha;
  6. `SELECT` → lê o histórico de todos (fuga de dados: endereços + movimentos).
- **Porque importa.** `src/lib/supabaseClient.js` usa `VITE_SUPABASE_ANON_KEY`, que vai no bundle público. Logo, aplicada a migração, qualquer pessoa no browser:
  - emite ECOQUILDO sem lastro;
  - apaga o saldo de terceiros;
  - falsifica o lastro;
  - lê o ledger de todos.
- **Comentário que mente.** `ler-eco-quildo.mjs:3-4` diz «`public.eco_quildo` tem RLS só para `service_role` (a migração … não abre policy a anon/authenticated)». É falso: o RLS nem está ligado.
- **Correcção sugerida (só descrição; quem corrige é o executor):** fazer como as irmãs (`20261004_mc106dv2_pontos.sql`, `20261005_mc106f_palpites.sql`, `20261006_mc106g_resgates.sql`):
  - `ALTER TABLE … ENABLE ROW LEVEL SECURITY` nas 2 tabelas;
  - `REVOKE ALL … FROM anon, authenticated` (nota: em produção `palpites` e `resgates` mantêm grants a `anon`/`authenticated`, só que com RLS ligado);
  - prova: sonda com `SET LOCAL ROLE anon` → 42501 / 0 linhas.
- **Condição.** **Não aplicar a migração em produção antes disto.**

### A2 — ⚠️ caminhos de reversão dos endpoints sem teste (mutantes V3, V4 sobrevivem)
- **`usar-eco-quildo`:** se o lastro falhar e a reversão não existir → o utilizador perde o ECOQUILDO e o lastro não regista o uso. Hoje o código reverte, mas nada o prende.
- **`creditar-eco-quildo`:** idem → moeda emitida sem lastro. Hoje o código reverte, mas nada o prende.
- **Reprodução:** aplicar os mutantes V3/V4 (`val/mut-val.mjs`) → suíte backend completa **1150 pass / 0 fail**.

### A3 — ⚠️ dupla falha deixa ECOQUILDO sem lastro para sempre (idempotência «bloqueia» a reparação)
Em `garantirEcoQuildo` (compra) e em `creditar-eco-quildo`, a sequência é:
1. o crédito é escrito (`criado:true`);
2. o lastro falha;
3. a reversão **também** falha.

Resultado: a entrada fica no histórico. No retry com a mesma chave, `creditarEcoQuildo` devolve `criado:false` e o código **salta o registo do lastro** (`if (ec.criado === true)`). Fica moeda em circulação acima de `total_emitido`, e o retry responde 200/201 como se estivesse tudo certo.

O `lastro-eco-quildo` **não** apanha isto: compara a reserva com o par (emitido, usado), não com a soma dos saldos.

O mesmo padrão existe no `usar` (débito feito, lastro falha, reversão falha → retry `idempotent:true`, e `total_usado` fica subcontado — erro no sentido seguro).

Severidade média. Há alerta Sentry, mas não há reparação automática nem detecção pelo invariante publicado.

### A4 — ℹ️ corrida compra-principal × retry concorrente pode deixar o lastro acima da circulação
1. O pedido A está no caminho principal e já debitou + creditou os pontos.
2. O pedido B, com a mesma chave, vê `fid` → `respostaIdempotente` → `garantirEcoQuildo` cria o ECOQUILDO + lastro.
3. Se A falhar a seguir (por exemplo no crédito de lance), `desfazerCompra` reverte o ECOQUILDO que B criou, mas **não** o lastro: `total_emitido` fica +1 sem moeda.

Nesse caso B devolveu 200 e A reembolsou. É o padrão pré-existente do 110d. Não reproduzi por execução — **é análise de código**.

### A5 — ℹ️ emissão retroactiva por replay de compras pré-110e
Uma compra 110d (pontos com `ref passe-<tipo>:<chave>`, sem ECOQUILDO), repetida com a mesma chave, cai em `respostaIdempotente` e recebe 1 ECOQUILDO + lastro sem nova cobrança.

Medido em produção:
```
count(ref like 'passe-relampago:%') = 0
count(ref like 'passe-programado:%') = 0
```
Logo é **latente**: hoje não há compras a que se aplique.

### A6 — ℹ️ dependência dura da migração
Os dois Passes passam a responder 502 (`creditar_eco_quildo_falhou` / `LASTRO_AUSENTE`) enquanto a migração não estiver aplicada. O executor declarou-o. Confirmo: em produção as tabelas não existem, por isso o push = deploy desliga a venda de Passes.

### A7 — ℹ️ `ler-eco-quildo` sem rate limit
Os outros 3 endpoints têm `aplicarRateLimit`; este não. Como `ler-pontos` também não tem, é baixa severidade.

## 5. Erros dos instrumentos do executor

1. **Comentário falso de RLS** em `ler-eco-quildo.mjs:3-4` (ver A1). Foi o que tornou o defeito invisível em leitura.
2. **Comentário falso** em `_tests/utac110d-dois-passes.test.mjs`: «semeia-a como a produção a tem». A produção não tem a linha (`to_regclass = null`).
3. **Duplo sem modelo de privilégios.** O duplo Supabase corre sem papéis nem RLS. O teste A2 («o duplo modela os CHECKs da migração») cria a impressão de que a migração está coberta, mas cobre só CHECKs, não grants/RLS.
4. **Mutação limitada aos 4 ficheiros-alvo.** A bateria do executor corre só 4 ficheiros de teste e não tem mutantes nos ramos de reversão dos endpoints (V3/V4).
5. **Baseline do enunciado.** «999/999» é a contagem pré-UTAC. O commit (1010/1010) está certo; o enunciado não.

## 6. O que NÃO consegui medir

- **UI no browser** (overflow a 375 px, contraste do rótulo/nota): não montei harness Playwright nem sessão sintética. **Não medido.** Só a lógica de layout (`isMobile ? "1fr" : "repeat(3, 1fr)"`) está provada, pelo mutante F8.
- **PostgREST real:** o A1 foi medido com papéis Postgres (`SET LOCAL ROLE anon`), não por HTTP com a anon key, que não li (R5). O comportamento do PostgREST com esses grants é o mesmo (é o papel que ele assume), mas o pedido HTTP em si não foi feito.
- **A3/A4:** concluídos por leitura de código, sem reprodução por execução.
- **Comportamento do `atualizado_em` no CAS** contra PostgREST real (formato do timestamp no `eq`): não medido. É o mesmo padrão do `ledger-lance`, já em produção.


---

# RESPOSTA DO EXECUTOR (UTAC110e) — 1 ronda, correcções NÃO re-validadas

Registo o veredicto **PARCIAL — 1 BLOQUEANTE** sem o amenizar: o validador **refutou-me** no ponto que mais
importava, e apanhou **um comentário FALSO meu** que era exactamente o que tornava o defeito invisível a quem lê.

## A1 (BLOQUEANTE) — ACEITE e CORRIGIDO
**O que ele mediu:** em produção, numa transacção revertida, com `SET LOCAL ROLE anon` era possível
`INSERT` de saldo do nada, `UPDATE` do saldo de OUTRA pessoa, `UPDATE` do lastro e `SELECT` do ledger de todos.
A chave `anon` (`VITE_SUPABASE_ANON_KEY`) vai no **bundle público** do frontend ⇒ aplicada a migração, o defeito
ficaria explorável por qualquer pessoa no browser, e anularia ao nível da BASE DE DADOS o Art. 49º (não
transferível) e o Art. 50º (lastro) que a lib defende.
**A minha defesa era falsa e está agora marcada como falsa:** o comentário de `ler-eco-quildo.mjs` afirmava
«tem RLS só para `service_role` (a migração … não abre policy a anon/authenticated)». A migração **não ligava RLS
nenhum** e **não revogava grants**. O texto errado foi substituído, mas a alegação original fica **À VISTA** no
próprio comentário (bloco «CORRECÇÃO de um comentário MEU, FALSO»), não apagada.
**Correcção aplicada** (`supabase/migrations/20261014_utac110e_eco_quildo.sql`), seguindo o idiom das tabelas
irmãs (`20261004_mc106dv2_pontos.sql` l.39-47 · `20261005_mc106f_palpites.sql` l.31-37 ·
`20261006_mc106g_resgates.sql` l.34-40 · `20260930_mc105a_passes.sql` l.27-35):
`ENABLE ROW LEVEL SECURITY` nas 2 tabelas · `CREATE POLICY "service_role total …" FOR ALL TO service_role
USING (true) WITH CHECK (true)` · `REVOKE ALL … FROM PUBLIC, anon, authenticated` ·
`GRANT SELECT, INSERT, UPDATE … TO service_role` (o GRANT é obrigatório: sem ele o `service_role` leva **42501
em silêncio** — lição do MC93-B). **Zero policies para `anon`/`authenticated`.**
⚠️ **Limite honesto:** **NÃO re-corri a sonda `SET LOCAL ROLE anon`** depois da correcção — está pendente e
**não afirmo** que passou. É a acção nº 1 antes de aplicar a migração.

## A2 (V3/V4 sobreviventes) — ACEITE e FECHADO
Eram **reais**: nenhum teste prendia os ramos de **reversão** dos dois endpoints que mexem no lastro.
Acrescentei **B2b** (usar: falha do lastro → o ECOQUILDO volta ao saldo, histórico limpo, lastro coerente, e o
retry usa normalmente) e **B4b** (creditar: falha do lastro → emissão desfeita, auditoria fechada como
**falhada**, retry emite). E acrescentei os **meus mutantes M16/M17** (equivalentes aos V3/V4 dele) à bateria:
agora **17/17 PROVADOS** — os dois sobreviventes **morrem**. Testes do ECOQUILDO: **22 → 24/24**.

## A3 (dupla falha deixa ECOQUILDO sem lastro) — ACEITE como PENDÊNCIA, não corrigido
Ele tem razão: com crédito escrito + lastro falhado + reversão falhada, a entrada fica no histórico, o retry
devolve `criado:false` e **salta** o lastro ⇒ moeda acima de `total_emitido`, e o retry responde 200/201.
E o `lastro-eco-quildo` **não apanha** — compara a reserva com (emitido, usado), não com a **soma dos saldos**.
Corrigir exige uma decisão de desenho (reparação automática vs. detecção), e um invariante que some `saldo` de
todos os endereços (agregação que o cliente supabase-js não faz sem RPC) ⇒ **registado como pendência**, sem
fingir que está fechado. Severidade: média (só na dupla falha).

## A4 / A5 / A6 / A7 — ACEITES como pendências declaradas
- **A4** (corrida compra × retry concorrente deixa o lastro acima da circulação) é **análise de código** dele, não
  reproduzida — registado. Padrão pré-existente do 110d.
- **A5** (replay de uma compra pré-110e emite ECOQUILDO sem cobrar) — **latente**: ele mediu em produção
  `count(ref like 'passe-relampago:%') = 0`. Registado; a correcção exige distinguir compras anteriores ao 110e.
- **A6** (a migração é dependência dura: o push sem ela desliga a venda dos Passes) — **declarado por mim** e
  agora **confirmado por ele**. É o motivo pelo qual **NÃO fiz push**.
- **A7** (`ler-eco-quildo` sem rate limit) — espelha o `ler-pontos`, que também não tem. Registado.

## Erros dos MEUS instrumentos (declarados; ele apontou 5, aceito todos)
1. **Comentário falso de RLS** — corrigido, texto errado à vista.
2. **Comentário falso no teste do 110d** («semeia-a como a produção a tem») — **é falso**: `to_regclass` em
   produção é `null`. Corrigido com a alegação falsa à vista.
3. **O duplo Supabase não modela privilégios/RLS** ⇒ nenhum teste podia apanhar A1. **Admitido**: os testes
   provam CHECKs, não grants. É a lacuna estrutural que deixou passar o bloqueante.
4. **A minha mutação corria só 4 ficheiros** e não tinha mutantes nos ramos de reversão — **era verdade**;
   corrigido (M16/M17 + os 2 testes novos).
5. **Baseline do enunciado (999/999)** é a contagem **pré-UTAC**; o commit declara 1010/1010 e **ambos
   medimos 1010/1010**.

## Números finais (depois das correcções)
| medida | valor |
|---|---|
| Suíte canónica (`mc966 ambos`, foreground, RAM 2 893-2 896 MB) | **frontend VERDE 1010/1010 · backend VERDE 1152/1158** (era 1150/1156; +2 = B2b/B4b) |
| Testes do ECOQUILDO | **24/24** (era 22) |
| Mutação | **17/17 PROVADOS**, restauro md5 idêntico (era 15/15; +M16/M17 fecham V3/V4) |
| Varredura de homoglifos nos ficheiros tocados | **0** |

**Não re-validado em 2.ª ronda** (prática da série, declarada): as correcções acima são minhas e ninguém as
atacou — em especial a secção de segurança da migração **ainda não foi medida com `SET LOCAL ROLE anon`**.
Por isso: **a migração continua a NÃO ser aplicada em produção**, e isso é agora uma **condição de liberação**,
não uma preferência.

## Verificação AD-HOC da correcção A1 (o que É possível medir sem o MCP)
**Bloqueio concreto e declarado:** a sonda `SET LOCAL ROLE anon` exige o servidor MCP `supabase`, que **não existe
na sessão Hermes** (o `config.yaml` não o tem) e cujo único instrumento — a sessão Claude Code — **bateu no limite
de sessão** («You've hit your session limit · resets 7:50pm»). **Não a corri, e não afirmo que passou.**

**O que foi medido em vez disso (ad-hoc, NÃO é a suíte e NÃO é a sonda):** um script temporário
`hermes-verify-ecoquildo-rls.mjs` (em `%TEMP%`, com prefixo `hermes-verify-`, removido no fim) comparou o meu bloco
de segurança com o das **4 migrações irmãs**. Resultado **depois de corrigir os erros do próprio instrumento**:
- **As minhas 2 tabelas têm as 4 peças** (leitura directa, `grep -n`, sem regex): l.55/62 `ENABLE ROW LEVEL SECURITY`
  · l.57/64 `CREATE POLICY "…" … TO service_role` · l.59/66 `REVOKE ALL … FROM PUBLIC, anon, authenticated` ·
  l.60/68 `GRANT SELECT, INSERT, UPDATE … TO service_role`.
- **Zero GRANT a `anon`/`authenticated`** — verificado por `grep`, e não pelo regex (o regex deu **falso positivo**).
- **A minha migração é ESTRITAMENTE MAIS FORTE do que 2 das 4 irmãs:** `palpites` e `resgates` **não revogam**
  nada (dependem só do RLS sem policy); eu faço **RLS + REVOKE**.
- Continua **aditiva**: 2 `CREATE TABLE IF NOT EXISTS`, zero `ALTER`/`DROP` sobre tabelas existentes.

**⚠️ Os erros do MEU instrumento nesta verificação (3/3 falsos):** (1) e (2) o regex exigia `REVOKE` em todas as
irmãs — `palpites`/`resgates` não revogam, logo acusou o **controlo** de falhar; (3) o regex de «GRANT a anon»
casou em **texto de comentário** e acusou a minha migração de um grant que não existe. Lição (a mesma do SEG-1):
um regex sobre SQL com comentários não é medição — a leitura directa das linhas é. O script foi **removido**.
**Limite mantido:** isto prova **paridade/força do idioma**, não o **comportamento** do RLS/grants. A sonda
`SET LOCAL ROLE anon` continua por correr — é o passo 2 da condição de liberação.
