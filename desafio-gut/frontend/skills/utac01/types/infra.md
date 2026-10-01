# TIPO: `infra` — UTAC que constrói INFRAESTRUTURA

**Auto-contido.** UTACs de infra: CAS, flags, migrações SQL, bibliotecas partilhadas. O risco é
irreversível (DDL) ou global (flag que muda comportamento).

## HARD GATES extra
- **Migração SQL só com autorização explícita (HG15)** — o SQL vai para
  `desafio-gut/frontend/supabase/migrations/` e para `_logs/`; aplicar só com autorização do operador.
- **Flags em default seguro** — criar e **NÃO ligar** (defaults = comportamento actual); A/B tempo
  zero de diferença.
- **`REVOKE` de `DELETE`/`TRUNCATE` explícito** — as `default privileges` do Supabase concedem
  DELETE/TRUNCATE ao `service_role` em tabelas novas; revogar é passo próprio *(lição MC105a)*.
- **CAS / escrita condicional** — usar `If-Match`/ETag; `setJSON` não envia o header *(MC102.0)*.
- **Duplos copiados do `dist/` real** — comportamento exacto do pacote *(lição MC102.0)*.
- **A/B das tabelas existentes** — contagens iguais onde nada devia mudar.

## Segmentos típicos
`SEG-1` (medir schema/estado) → `SEG0` (infra) → `SEG3` (validador) → `SEG5` (verificar) → `SEG6`.

## Autorizações típicas
- AUTORIZA criar migração em `supabase/migrations/`; aplicar **só com autorização**; criar flags.
- NÃO AUTORIZA ligar flags, tocar em dados, nem DDL não autorizada.

## Ficheiros típicos afectados
- `_lib/`, `supabase/migrations/`, `netlify/functions/` (stores), `scripts/`.

## Exemplos
**UTAC102.0** (CAS) · **UTAC103** (5 flags de transição, criadas e não ligadas) · **UTAC105a.1**
(revoga DELETE/TRUNCATE, UNIQUE parcial).

## Prompt de arranque (para o executor)
> Construa [INFRA] em [FICHEIROS]. Migração só com autorização; flags em default seguro; CAS nas
> escritas. Prove A/B igual onde nada devia mudar.
