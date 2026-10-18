# VERIFICAÇÃO — ESTADO DAS MIGRAÇÕES SUPABASE (produção vjslwowwrpcawijdiksm)

**Data:** 2026-10-17 · **Modo:** só leitura (0 escritas na BD) · **CLI:** supabase 2.107.0
**Projecto:** `vjslwowwrpcawijdiksm` (DesafioGUT) — link confirmado
**Evidências brutas:** `_logs/MIGRACOES-VERIFICACAO-evidencias/`

---

## 1. Tabela pedida

| Item | Estado |
|---|---|
| migration list — google_play_compras (110i1) | **Pending** (nenhuma versão `20261016*` no histórico remoto) |
| migration list — exclusao_conta_rpc (110j1) | **Pending** (idem) |
| dry-run — lista de migrações pendentes | **NENHUMA LISTA — `db push --dry-run` ABORTA (exit 1)** com «Remote migration versions not found in local migrations directory». Por análise dos ficheiros: seriam tentados **19 dos 22** ficheiros (9 já aplicados + 8 da base + as 2 de 20261016) — ver §4 |
| tabela google_play_compras na BD | **NÃO EXISTE** (0 linhas; controlo positivo `passes` = 1) |
| função excluir_conta_titular na BD | **NÃO EXISTE** (0 linhas; `public` só tem 3 funções; nenhuma em qualquer schema) |
| credenciais Supabase configuradas | **SIM — mas NÃO por env var**: `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD` estão **vazias**; o token está no **Gestor de Credenciais do Windows** (`LegacyGeneric:target=Supabase CLI:supabase`) e as queries correm contra produção |

**Conclusão:** as duas migrações estão **por aplicar**, medido por dois instrumentos
independentes (histórico de migrações + catálogo do Postgres). E **`db push` está
bloqueado** — o que é bom: impede o desastre que o briefing temia.

---

## 2. Correção de uma premissa: «não aplicou por falta de credenciais» — **REFUTADA**

O briefing (e o estado declarado nos UTACs) atribui a não-aplicação à ausência de
credenciais. **Medido:**

```
$ echo $SUPABASE_ACCESS_TOKEN $SUPABASE_DB_PASSWORD
(vazias — não definidas na shell)

$ cmdkey.exe /list | grep -i supabase
Destino: LegacyGeneric:target=Supabase CLI:supabase        <-- token guardado pelo `supabase login`

$ npx supabase projects list
   LINKED | ORG ID               | REFERENCE ID         | NAME               | REGION
     ●    | dscmxoyhgjiywifmjlbw | vjslwowwrpcawijdiksm | DesafioGUT         | East US (Ohio)
          | dscmxoyhgjiywifmjlbw | gjuelqjjhuuwnlsjyeai | desafiogut-staging | West US (Oregon)
```

`projects list`, `migration list --linked` e `db query --linked` **funcionaram** contra
produção. Logo as credenciais **existem e funcionam**; a razão verdadeira da não-aplicação
é outra (ver §4: o `db push` falha-fechado por desalinhamento de versões). Registar como
conclusão anterior **errada**, não a apagar.

Nota: `~/.supabase/access-token` **não existe** (só `telemetry.json` e `traces/`) — o token
vive no keyring do SO, o que explica que uma procura por ficheiro tenha concluído «sem
credenciais». Foi um erro de instrumento, não um facto.

---

## 3. Instrumento que mentiu (declarado)

A CLI **não corre na pasta do projecto**:

```
$ cd desafio-gut/frontend && npx supabase migration list
failed to parse environment file: .env (unexpected character '»' in variable name)
```

Causa medida: `desafio-gut/frontend/.env` começa com **BOM UTF-8** (`EF BB BF`) — o parser
dotenv do CLI lê o BOM como carácter de nome de variável. Qualquer tentativa a partir
daquela pasta falha **antes** de contactar a rede, e o erro parece «sem credenciais».
Contornado **sem tocar no repo**: cópia saneada de `supabase/migrations` +
`supabase/.temp` (que traz o `project-ref`) para um workdir temporário, e `--linked` a
partir daí. O `.env` do repo **não foi alterado** (0 modificações, `git status` limpo).
*Correção definitiva fica para o UTAC de arrumação (§7).*

---

## 4. `db push --dry-run` — BLOQUEADO (fail-closed) e o risco que ele evita

```
$ npx supabase db push --dry-run
DRY RUN: migrations will *not* be pushed to the database.
Remote migration versions not found in local migrations directory.
  ... supabase migration repair --status reverted 20260722040324 ... 20261014003418
---EXIT=1---
```

O comando **aborta** e não produz a lista pedida. Isto é o comportamento seguro.

**Causa raiz (medida, não presumida):** os ficheiros locais usam versão de **8 dígitos
(data)** — `20261016_utac110i1_…sql` → versão `20261016` — enquanto o histórico remoto usa
**timestamps de 14 dígitos** — `20261014003418`. As 22 migrações locais aparecem **todas**
com a coluna `Remote` vazia, incluindo as 3 de 20261004/05/06 que existem dos dois lados
(o CLI emparelha-as por nome, não por versão).

**O que aconteceria se o operador corresse o `repair` sugerido e depois `push`:**

| # | Ficheiro local | Situação real na BD | Efeito de re-executar |
|---|---|---|---|
| 1 | `20260620_amend_jsonb_payload.sql` | DDL presente (pré-tracking) | idempotente |
| 2 | `20260620_schema_definitivo.sql` | DDL presente | `IF NOT EXISTS` → passa |
| 3 | `20260621_cotas_schema.sql` | `cotas`/`cotas_pagas`/`cota_fingerprints` **existem** | ⛔ `CREATE TABLE cotas` sem `IF NOT EXISTS` → **42P07, push ABORTA a meio** |
| 4-5 | `20260621_enable_realtime_config` · `…saldo_troco_wallet_schema` | presentes | mista |
| 6-8 | `20260629_fila_tarefas` · `…indices_escalabilidade` · `…materialized_views` | fila/índices presentes; **0 materialized views em `public`** | a 8 **criaria** objectos que hoje não existem |
| 9 | `20260722_mc87_hardening_reservar_tarefas` | **Applied** (`20260722040324`) | re-aplicar função existente |
| 10 | `20260726_mc8829_fila_tarefas_corrigida` | **Applied** (`20260726224230`) | idem |
| 11 | `20260802_mc8943_atividade_utilizadores` | **Applied** (`20260803011332`) | idem |
| 12 | `20260923_mc93b_pontuacoes` | **Applied** (`20260925002324`) | idem |
| 13-15 | `20260930_mc105a_passes*` | **Applied** (`20260930124155` + 2× `20261001*`) — provado: `passes_endereco_check` e `passes_endereco_edicao_produto_key` existem em `pg_constraint`/`pg_indexes` | idem |
| 16-18 | `20261004/05/06` | **Applied** (versão igual) | idem |
| 19 | `20261013_utac110d_ledger_lance` | **Applied** (`20261013083639`) | idem |
| 20 | `20261014_utac110e_eco_quildo` | **Applied** (`20261014003418`) | idem |
| 21 | `20261016_utac110i1_google_play_compras` | **NÃO aplicada** | tabela nova |
| 22 | `20261016_utac110j1_exclusao_conta_rpc` | **NÃO aplicada** | função nova |

→ `db push` tentaria **19 dos 22** ficheiros (não os 3 de versão igual, 20261004/05/06):
**9 já registados como aplicados** + **8 da base** (pré-tracking) + **as 2 novas**.
Abortaria na 3.ª da ordem (`20260621_cotas_schema.sql`, `CREATE TABLE cotas` → 42P07),
deixando histórico com linhas falsas e DDL parcialmente re-executado.
**Confirma-se o risco do briefing: NÃO correr `db push`.** Ver §7.

---

## 5. Verificação directa na BD (com controlos)

```
A) tabela  google_play_compras .................. 0   -> NAO EXISTE
B) tabela  passes            [CONTROLO POSITIVO] . 1   -> a sonda devolve 1 quando existe
C) funcao  excluir_conta_titular ................ 0   -> NAO EXISTE
D) funcoes em public        [CONTROLO] .......... 3   -> a sonda não está cega
```

- `public` tem **28 tabelas**; a de Google Play **não é uma delas**.
- Tabelas com `%google%` em **qualquer** schema: **nenhuma**.
- Funções `public` (as únicas 3): `registar_atividade`, `reservar_tarefas`,
  `update_fila_tarefas_updated_at`. Funções com `conta`/`excluir` em qualquer schema:
  **nenhuma do projecto** (só `pg_catalog.*contains`).
- Identidade do alvo confirmada: `current_database=postgres`, `pg=17.6`, 28 tabelas,
  histórico com 19 linhas cujos nomes casam com o repo (`mc105a_passes`, `utac110e_eco_quildo`, …).
- **Histórico remoto completo (19):** última = `20261014003418 utac110e_eco_quildo`.
  **Zero** linhas `20261016%`.

---

## 6. Dependência crítica entre as duas migrações (achado)

`20261016_utac110j1_exclusao_conta_rpc.sql` corre, no passo (4), SQL dinâmico sobre
`('passes'), ('google_play_compras')`:

```sql
FOR r IN SELECT * FROM (VALUES ('passes'), ('google_play_compras')) AS t(tabela) LOOP
  ... EXECUTE format('UPDATE public.%I SET endereco = $2 WHERE endereco = $1', r.tabela) ...
```

A função é `LANGUAGE plpgsql` → **cria sem erro** mesmo com a tabela ausente (o corpo só é
resolvido em execução). Mas se for **chamada** sem a tabela, levanta **42P01** e, sendo a
função a transacção atómica da exclusão de conta, **aborta a exclusão inteira**.
Pior: o `_lib/conta-delete.mjs` escolhe a via pela existência da função — passaria a usar
`via:"rpc"` e a responder 500, quando hoje usa a via legada tabela-a-tabela que funciona.

**Ordem obrigatória: 110i1 (tabela) → depois 110j1 (função).** Nunca ao contrário.

---

## 7. Recomendação

**NÃO aplicar por `db push`.** `db push` está bloqueado por desalinhamento de versões e,
se fosse «reparado» à pressa, tentaria 19 ficheiros (9 já aplicados + 8 da base + as 2
novas) e abortaria a meio (`20260621_cotas_schema.sql`).

**Aplicar os dois ficheiros individualmente, pela ordem, com registo de histórico** —
`supabase db query --linked -f <ficheiro>` (ou MCP `apply_migration`), um de cada vez,
verificando depois de cada um. Ambos são **aditivos e re-executáveis**:

- `110i1` — `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` + `ENABLE RLS`;
  não altera nenhuma tabela existente. **Risco: nulo.** Desbloqueia o endpoint
  `validar-compra-google` (hoje responderia 502/503 sem a tabela).
- `110j1` — 2× `CREATE OR REPLACE FUNCTION` (`mc72_anon_payload`, `excluir_conta_titular`),
  nenhum `CREATE TABLE`/`DROP`. **Risco baixo** — e só depois do 110i1.

**Aplicar agora ou depois?** Recomendo **agora, antes do AAB (110l)**:
1. o 110i1 é pré-requisito do caminho de compra nativo que o AAB vai levar a revisão;
2. o 110j1 fecha parte da pendência LGPD declarada no 110i.1 (a tabela
   `google_play_compras` passa a ser anonimizada na exclusão de conta);
3. ambos são idempotentes — aplicar cedo não cria dívida.

**Decisão do operador (R18).** Enquanto não decidir, o estado actual é seguro e
**fail-closed**: nada credita, nada apaga, e a via legada da exclusão continua a correr.

**Pendência de arrumação → UTAC próprio (não este):** normalizar as versões das 22
migrações locais para timestamps de 14 dígitos + `migration repair` para alinhar o
histórico, e remover o BOM do `.env` do frontend. Sem isso, `db push` fica inutilizável
para sempre — e a cada migração nova o desalinhamento cresce.

---

## 8. Checklist de entrega

- [x] Tabela com o estado das 2 migrações (Pending / Pending)
- [x] «Lista do dry-run» — **não existe**: o comando aborta (exit 1); lista derivada de 10 ficheiros + prova do risco em §4
- [x] Resultado das 2 queries SQL — 0 linhas / 0 linhas, com controlo positivo (1 linha / 3 funções)
- [x] Credenciais — env vars vazias, **token no keyring do Windows**, link e queries a funcionar
- [x] Registo neste ficheiro + `_logs/MIGRACOES-VERIFICACAO-evidencias/` (saídas brutas)
- [x] Recomendação — **não aplicar por push**; aplicar os 2 ficheiros por ordem, de preferência agora
