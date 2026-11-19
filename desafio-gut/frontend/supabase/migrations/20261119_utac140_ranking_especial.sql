-- UTAC140 (Frente B) — ranking AO VIVO da edição especial, com os valores OCULTOS até à apuração.
--
-- Decisões do operador (R18-140):
--   B · a «posicao» é a ORDEM DE CHEGADA (1 = primeiro lance). Uma posição por valor diria quem lidera
--       e deixaria sondar o valor com lances baratos (anti-bot MC28.1). O ranking por valor só existe
--       na apuração (Top 10 do UTAC138, Blob `edicoes-resultados`).
--   C · a app não tem sessão Supabase (Privy + JWT próprio), logo a leitura é do papel `anon`, e só
--       na ESPECIAL-RELAMPAGO1. A tabela NÃO recebe o valor durante a edição: `valor_oculto` fica NULL
--       até à apuração (os valores vivem no Key-Per-Bid). Além disso o `anon` nem tem privilégio de
--       coluna sobre `valor_oculto` (o Realtime filtra as colunas pelo privilégio do subscritor).
--   · o endereço é gravado ENCURTADO (0x1234…abcd) — o CHECK recusa um endereço inteiro (R4/LGPD).
--
-- Escrita: só o backend (service_role), por `registar_lance_especial` (idempotente pelo id do lance;
-- a posição é atribuída sob advisory lock, sem buracos nem repetidos em concorrência).
-- Revelação: `revelar_ranking_especial`, chamada pela apuração (`_lib/apuracao-especial.mjs`) DEPOIS de
-- `termino_em` + margem de fecho. `get_ranking_especial` só devolve o valor ao service_role.

create table if not exists public.ranking_especial (
  id            text primary key,                       -- lanceId (idempotência)
  edicao_id     text not null check (edicao_id ~ '^ESPECIAL-[A-Z0-9]+$'),
  endereco      text not null check (endereco ~ '^0x[0-9a-f]{4}…[0-9a-f]{4}$'),
  valor_oculto  integer check (valor_oculto is null or valor_oculto >= 1),
  posicao       integer not null check (posicao >= 1),
  criado_em     timestamptz not null default now(),
  unique (edicao_id, posicao)
);

comment on table public.ranking_especial is
  'UTAC140 — ranking ao vivo da edição especial (posição = ordem de chegada). valor_oculto fica NULL até à apuração; anon não tem privilégio sobre essa coluna.';

alter table public.ranking_especial enable row level security;

revoke all on table public.ranking_especial from public, anon, authenticated;
grant select (edicao_id, endereco, posicao, criado_em) on public.ranking_especial to anon, authenticated;
grant all on table public.ranking_especial to service_role;

drop policy if exists ranking_especial_ler_especial on public.ranking_especial;
create policy ranking_especial_ler_especial on public.ranking_especial
  for select to anon, authenticated
  using (edicao_id = 'ESPECIAL-RELAMPAGO1');

-- ── Escrita (só backend) ─────────────────────────────────────────────────────
create or replace function public.registar_lance_especial(p_id text, p_edicao_id text, p_endereco text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pos integer;
begin
  perform pg_advisory_xact_lock(hashtext('ranking_especial:' || p_edicao_id));
  select r.posicao into v_pos from public.ranking_especial r where r.id = p_id;
  if found then
    return v_pos;                                       -- retry do mesmo lance: mesma posição
  end if;
  select coalesce(max(r.posicao), 0) + 1 into v_pos
    from public.ranking_especial r where r.edicao_id = p_edicao_id;
  insert into public.ranking_especial (id, edicao_id, endereco, posicao)
    values (p_id, p_edicao_id, p_endereco, v_pos);
  return v_pos;
end;
$$;

revoke all on function public.registar_lance_especial(text, text, text) from public, anon, authenticated;
grant execute on function public.registar_lance_especial(text, text, text) to service_role;

-- Revelação na apuração: p_valores = [{"id": "<lanceId>", "valor": 123}, ...]. Só backend.
create or replace function public.revelar_ranking_especial(p_edicao_id text, p_valores jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
begin
  update public.ranking_especial r
     set valor_oculto = (v->>'valor')::integer
    from jsonb_array_elements(coalesce(p_valores, '[]'::jsonb)) v
   where r.edicao_id = p_edicao_id
     and r.id = v->>'id'
     and r.valor_oculto is null
     and (v->>'valor') ~ '^[0-9]+$';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.revelar_ranking_especial(text, jsonb) from public, anon, authenticated;
grant execute on function public.revelar_ranking_especial(text, jsonb) to service_role;

-- ── Leitura ──────────────────────────────────────────────────────────────────
-- anon/authenticated: posição + endereço encurtado (+ instante), valor SEMPRE NULL.
-- service_role: o valor (só existe depois da apuração). O acesso aos valores pelo utilizador final passa
-- pelo backend, que exige Passe (Frente D, `resultado-edicao?acao=completo`).
create or replace function public.get_ranking_especial(p_edicao_id text default 'ESPECIAL-RELAMPAGO1')
returns table (posicao integer, endereco text, valor_oculto integer, criado_em timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select r.posicao,
         r.endereco,
         case when coalesce(auth.role(), '') = 'service_role' then r.valor_oculto else null end,
         r.criado_em
    from public.ranking_especial r
   where r.edicao_id = p_edicao_id
     and (p_edicao_id = 'ESPECIAL-RELAMPAGO1' or coalesce(auth.role(), '') = 'service_role')
   order by r.posicao
   limit 1000;
$$;

revoke all on function public.get_ranking_especial(text) from public;
grant execute on function public.get_ranking_especial(text) to anon, authenticated, service_role;

-- ── Realtime ─────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ranking_especial'
  ) then
    alter publication supabase_realtime add table public.ranking_especial;
  end if;
end;
$$;
