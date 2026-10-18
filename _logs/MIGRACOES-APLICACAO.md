# APLICAÇÃO DAS MIGRAÇÕES SUPABASE — 110i.1b (tabela) + 110j.1 (função)

**Data:** 2026-10-18 (UTC) · **Projecto:** `vjslwowwrpcawijdiksm` (DesafioGUT, produção)
**Decisão:** operador, 2026-10-17 — «APLICAR AGORA, pela ordem, individualmente»
**Modo:** aplicação por ficheiro individual (`db query --linked -f`), **nunca** `db push`

---

## 1. Janela de execução (UTC) e prova de tempo

| Marco | Hora (UTC) | Como foi medido |
|---|---|---|
| Baseline (`SELECT now()`) | 2026-10-18 **00:48:45** | query ao servidor |
| Fim da verificação | 2026-10-18 **00:50:58** | query ao servidor |
| Passo 1 (110i1) aplicado | **≈ 00:49:3x** | entre a baseline e a 1.ª verificação (`depois-tabelas.csv`, 00:50:01 UTC) |
| Passo 2 (110j1) aplicado | **≈ 00:50:0x** | antes da chamada de dry-run (00:50:20 UTC) |

**Declarado:** o timestamp exacto do DDL não é recuperável pela via usada —
`pg_stat_file()` devolve **42501 permission denied** (a Management API corre com um role
restrito, apesar de `current_user = postgres`). Os tempos acima são **janelas medidas**
por queries ao servidor e por mtime dos artefactos de verificação, não invenção.

---

## 2. Comandos usados (exactos)

```bash
# workdir saneado (o .env do frontend tem BOM e quebra a CLI — ver MIGRACOES-VERIFICACAO.md §3)
cd C:/Users/Moltbot/Desktop/DESAFIOGUT/_logs/.apply     # tem supabase/.temp + os 2 .sql

# md5 dos SQL confirmados iguais aos do repo ANTES de aplicar
d573d35c6d988ebc4de8597532871f05  20261016_utac110i1_google_play_compras.sql
dd16816b4af280840e48d536bea3f941  20261016_utac110j1_exclusao_conta_rpc.sql

# PASSO 1 — tabela
npx supabase db query --linked -f "C:/.../_logs/.apply/20261016_utac110i1_google_play_compras.sql"
#  -> exit 0, sem saída de erro

# PASSO 2 — função (só depois de o passo 1 estar verificado)
npx supabase db query --linked -f "C:/.../_logs/.apply/20261016_utac110j1_exclusao_conta_rpc.sql"
#  -> exit 0, sem saída de erro
```

**Ordem respeitada:** 110i1 → verificação → 110j1 → verificação. Nunca ao contrário
(o 110j1 referencia `google_play_compras` em SQL dinâmico; sem a tabela, a função criava
mas rebentava 42P01 ao ser chamada).

Os dois ficheiros são enviados ao servidor como **um único statement batch** → cada um
correu atomicamente: ou tudo, ou nada.

---

## 3. Passo 1 — 110i1 (`google_play_compras`): VERIFICAÇÕES

| Verificação | Resultado |
|---|---|
| Tabela existe (`information_schema.tables`) | **1 linha — EXISTE** |
| Controlo positivo (`passes`) | 1 linha — a sonda não está cega |
| Colunas | **13**, exactamente as do ficheiro (`purchase_token` PK `text NOT NULL` … `atualizado_em`) |
| RLS | `relrowsecurity = true` (sem políticas, como desenhado) |
| Índices | `google_play_compras_pkey` + `google_play_compras_endereco_idx` |
| Constraints | `_pkey` (p) + 5 CHECK: `tipo_passe`, `estado`, `pontos`, `creditos_lance`, `eco_quildo` |
| Grants `service_role` | INSERT, REFERENCES, SELECT, TRIGGER, UPDATE — **sem DELETE nem TRUNCATE** (o REVOKE do ficheiro pegou) |
| Linhas na tabela | 0 (tabela nova, correcto) |

Total de tabelas em `public`: **28 → 29** (+1, só esta).

---

## 4. Passo 2 — 110j1 (`excluir_conta_titular`): VERIFICAÇÕES

| Verificação | Resultado |
|---|---|
| `excluir_conta_titular` existe (`information_schema.routines`) | **1 linha — EXISTE** |
| `mc72_anon_payload` (helper do mesmo ficheiro) | **1 linha — EXISTE** |
| Controlo positivo (`registar_atividade`) | 1 linha — sonda válida |
| ACL | `anon` = **false**, `authenticated` = **false**, `authenticator` = **false**, `service_role` = **true** |

Total de funções em `public`: **3 → 5** (+2, exactamente as duas do ficheiro).

### 4.1 Prova de que a dependência da tabela resolve (a razão da ordem)

O corpo da função foi lido **antes** de a exercitar: **todas** as escritas (DELETE/UPDATE/
INSERT, passos 1, 2, 2b, 2c, 3, 4, 5) estão atrás de `IF p_dry_run`. Só então se chamou,
com um endereço inexistente e `p_dry_run = true`:

```sql
SELECT public.excluir_conta_titular(
  '0xdededededededededededededededededededede',
  'anon:aaaa…aaaa', true);
```

Resposta (`dryRun: true`): as **21 tabelas** foram percorridas, incluindo
`"google_play_compras": 0`. **Sem 42P01.** É a prova end-to-end que a ordem 110i1→110j1
era obrigatória e ficou satisfeita.

---

## 5. Confirmação de que NÃO houve escritas inesperadas

`n` de linhas de **todas** as 28 tabelas existentes, antes vs. depois (incluindo o
dry-run):

```
$ diff antes-tabelas.csv pos-dryrun-tabelas.csv
12a13
> google_play_compras,0
```

**Única diferença: a tabela nova, com 0 linhas.** Nenhuma linha de nenhuma tabela
preexistente foi criada, apagada ou alterada (incluindo as 23 de
`atividade_utilizadores`, 22 de `saldo_rs_creditos`, 8 de `saldo_rs`, 7 de `cotas`, 7 de
`fila_tarefas`).

Contagens globais:

| Métrica | Antes | Depois | Esperado |
|---|---|---|---|
| tabelas `public` | 28 | **29** | +1 (tabela nova) |
| funções `public` | 3 | **5** | +2 (função + helper) |
| linhas em `supabase_migrations.schema_migrations` | 19 | **19** | **inalterado** (ver §7) |
| materialized views `public` | 0 | **0** | inalterado |

---

## 6. O que NÃO foi feito

- **Não** se correu `db push`.
- **Não** se correu `migration repair` nem se escreveu nada em
  `supabase_migrations.schema_migrations`.
- **Não** se aplicou ao contrário (110j1 antes de 110i1).
- **Não** se commitou nada: as migrações já estavam no repo; mudou o **estado da BD**.
- **Não** se executou nenhuma exclusão de conta real: a única chamada à função foi
  `p_dry_run = true`, com endereço inexistente, e o §5 prova que não escreveu.
- **Não** se validou o endpoint `validar-compra-google` de ponta a ponta — ressalva
  formal no **§10**. O que está provado é o **esquema** e a **função**, não a chamada
  real à Google Play API.

---

## 7. Consequência declarada: as migrações ficam aplicadas mas NÃO registadas

`db query` executa SQL **sem** registar versão no histórico. O histórico continua com
**19 linhas** e **zero** `20261016%`. Efeito prático:

- `migration list` continuará a mostrar as duas como pendentes (falso negativo);
- um futuro `db push` (depois da normalização) voltaria a tentá-las — **mas ambos os
  ficheiros são idempotentes** (`CREATE TABLE/INDEX IF NOT EXISTS`, `CREATE OR REPLACE
  FUNCTION`), logo a re-execução é inofensiva;
- o estado real da BD é agora **verdadeiro e verificável por catálogo**, que é o que
  interessa para o AAB (110l).

Registado como **DEBT-057** em `_logs/DEBT.md` (normalização das versões + remoção do BOM
→ UTAC próprio).

---

## 8. Estado final

| Item | Estado |
|---|---|
| `google_play_compras` | **EXISTE** — 13 colunas, RLS ligada, 2 índices, 5 CHECK, sem DELETE/TRUNCATE para `service_role` |
| `excluir_conta_titular(text,text,boolean)` | **EXISTE** — SECURITY DEFINER, `search_path` fixo, só `service_role` executa |
| `mc72_anon_payload(jsonb,text)` | **EXISTE** (helper) |
| Dados de produção | **intactos** (diff de linhas: só a tabela nova, vazia) |

O caminho de compra nativo (`validar-compra-google`) já tem onde gravar, e a exclusão de
conta passa a poder correr em transacção única — **desde que a flag
`isPagamentoNativoAtivo` e o env `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` sejam ligados pelo
operador** (pendências separadas, não tocadas aqui).

---

## 9. Evidências

`_logs/MIGRACOES-APLICACAO-evidencias/`: `antes-tabelas.csv`, `antes-funcoes.csv`,
`antes-globais.csv`, `depois-tabelas.csv`, `depois-globais.csv`,
`pos-dryrun-tabelas.csv`, `dryrun-resultado.json`.

---

## 10. RESSALVA FORMAL — o que esta aplicação NÃO prova

Registada a pedido do operador (2026-10-18), para não deixar implícito o que fica por
medir. **A aplicação das migrações é real e verificada; o fluxo de compra não é.**

> **O endpoint `validar-compra-google` NÃO foi validado de ponta a ponta.**
>
> **O que está provado:**
> - o **esquema** da tabela `google_play_compras` (13 colunas, PK `purchase_token`,
>   5 CHECK, RLS ligada, `service_role` sem DELETE/TRUNCATE) — verificado por
>   `information_schema` / `pg_constraint` / `pg_indexes` / `role_table_grants`;
> - a **idempotência estrutural** por `purchase_token`: a PK é o que fará o mesmo recibo
>   creditar uma só vez (é a trava do endpoint, na BD);
> - a função **`excluir_conta_titular`** — cria, e corre em `dry_run` sem **42P01**,
>   percorrendo as 21 tabelas, incluindo `google_play_compras`.
>
> **O que NÃO está provado:**
> - a **chamada real à Google Play API** na validação do `purchaseToken`
>   (`purchases.products.get` / `purchases.subscriptions.get`) — nunca foi feita contra
>   a Google com um recibo verdadeiro;
> - o **fluxo completo de compra Android** (Play Billing → `validar-compra-google` →
>   crédito de pontos/crédito/ECOQUILDO → 200 idempotente no retry), incluindo
>   **License Testing** com os testadores;
> - que a tabela seja efectivamente escrita/lida pelo endpoint em produção (o endpoint
>   nem é alcançável pela UI enquanto a flag estiver desligada).
>
> **Depende de A1–A4 (Ruan):**
> 1. **A1** — produtos/subscrições criados no **Play Console** (`produto_id` reais);
> 2. **A2** — **Service Account** com acesso à Play Developer API;
> 3. **A3** — env var **`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`** configurada no **Netlify**
>    (hoje ausente — declarado no CLAUDE.md como pendência do 110i.1);
> 4. **A4** — **License Testing** com as contas de teste do closed testing.
>
> Sem A1–A4 não existe recibo válido para validar: a ressalva **não se fecha por código**
> nem por mais medições — fecha-se quando o operador configurar a cadeia acima.
> **Nada disto bloqueia o AAB** (o artefacto compila e é assinável); bloqueia a
> **verificação em dispositivo** do caminho nativo.
