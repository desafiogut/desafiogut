-- UTAC120 — inventário de Passes (o utilizador compra o Passe e ele fica guardado;
-- é descontado só quando usa: 1 no lance relâmpago, 1 no palpite programado).
-- RLS: só o service_role (backend) toca nesta tabela.

create table if not exists public.passes_inventario (
  endereco           text primary key,
  passes_relampago   integer not null default 0 check (passes_relampago   >= 0),
  passes_programado  integer not null default 0 check (passes_programado  >= 0),
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);

comment on table public.passes_inventario is
  'UTAC120 — inventário de Passes do utilizador (Relâmpago/Programado). Só o backend (service_role) lê e escreve.';

alter table public.passes_inventario enable row level security;
revoke all on table public.passes_inventario from anon, authenticated, public;
grant select, insert, update, delete on table public.passes_inventario to service_role;

drop policy if exists passes_inventario_service_role_select on public.passes_inventario;
create policy passes_inventario_service_role_select
  on public.passes_inventario for select to service_role using (true);

-- ── RPC: creditar (compra validada) ──────────────────────────────────────────────────────────
create or replace function public.passes_creditar(p_endereco text, p_tipo text, p_qtd integer)
returns public.passes_inventario
language plpgsql
security definer
set search_path = public
as $$
declare r public.passes_inventario;
begin
  if p_endereco is null or length(trim(p_endereco)) = 0 then
    raise exception 'endereco_obrigatorio';
  end if;
  if p_qtd is null or p_qtd < 1 then
    raise exception 'quantidade_invalida';
  end if;

  insert into public.passes_inventario (endereco, passes_relampago, passes_programado)
  values (p_endereco,
          case when p_tipo = 'relampago' then p_qtd else 0 end,
          case when p_tipo = 'programado' then p_qtd else 0 end)
  on conflict (endereco) do update set
    passes_relampago  = public.passes_inventario.passes_relampago
                        + case when p_tipo = 'relampago' then p_qtd else 0 end,
    passes_programado = public.passes_inventario.passes_programado
                        + case when p_tipo = 'programado' then p_qtd else 0 end,
    atualizado_em = now()
  returning * into r;

  return r;
end;
$$;

-- ── RPC: consumir (uso no lance/palpite) — atómico, só desconta se houver ────────────────────
create or replace function public.passes_consumir(p_endereco text, p_tipo text, p_qtd integer default 1)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare afectadas integer;
begin
  if p_qtd is null or p_qtd < 1 then
    raise exception 'quantidade_invalida';
  end if;

  if p_tipo = 'relampago' then
    update public.passes_inventario
       set passes_relampago = passes_relampago - p_qtd, atualizado_em = now()
     where endereco = p_endereco and passes_relampago >= p_qtd;
  elsif p_tipo = 'programado' then
    update public.passes_inventario
       set passes_programado = passes_programado - p_qtd, atualizado_em = now()
     where endereco = p_endereco and passes_programado >= p_qtd;
  else
    raise exception 'tipo_invalido';
  end if;

  get diagnostics afectadas = row_count;
  return afectadas = 1;
end;
$$;

-- ── RPC: devolver 1 passe (reversão quando o passo seguinte falha) ───────────────────────────
create or replace function public.passes_devolver(p_endereco text, p_tipo text, p_qtd integer default 1)
returns public.passes_inventario
language plpgsql
security definer
set search_path = public
as $$
declare r public.passes_inventario;
begin
  insert into public.passes_inventario (endereco, passes_relampago, passes_programado)
  values (p_endereco,
          case when p_tipo = 'relampago' then p_qtd else 0 end,
          case when p_tipo = 'programado' then p_qtd else 0 end)
  on conflict (endereco) do update set
    passes_relampago  = public.passes_inventario.passes_relampago
                        + case when p_tipo = 'relampago' then p_qtd else 0 end,
    passes_programado = public.passes_inventario.passes_programado
                        + case when p_tipo = 'programado' then p_qtd else 0 end,
    atualizado_em = now()
  returning * into r;
  return r;
end;
$$;

-- Semântica: apenas o service_role executa as RPCs
revoke all on function public.passes_creditar(text, text, integer) from anon, authenticated, public;
revoke all on function public.passes_consumir(text, text, integer) from anon, authenticated, public;
revoke all on function public.passes_devolver(text, text, integer) from anon, authenticated, public;
grant execute on function public.passes_creditar(text, text, integer) to service_role;
grant execute on function public.passes_consumir(text, text, integer) to service_role;
grant execute on function public.passes_devolver(text, text, integer) to service_role;
