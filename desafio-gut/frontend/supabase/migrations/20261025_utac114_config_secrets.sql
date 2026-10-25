-- UTAC114 — credenciais de sistema lidas pelo backend (fallback quando a env var não cabe no limite de 4KB da AWS Lambda)
-- Tabela de segredos de configuração: leitura APENAS por service_role (backend). anon/authenticated sem acesso.

create table if not exists public.config_secrets (
  id            uuid primary key default gen_random_uuid(),
  chave         text not null unique,
  valor         text not null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table  public.config_secrets is 'Segredos de configuração lidos apenas pelo backend (service_role). Não expor no frontend.';
comment on column public.config_secrets.valor is 'Valor do segredo (ex.: JSON da service account do Google Play). Nunca devolver ao cliente.';

-- RLS: ninguém chega à tabela sem política explícita.
alter table public.config_secrets enable row level security;

-- Cinto e suspensórios: sem privilégios para os papéis do cliente.
revoke all on table public.config_secrets from anon, authenticated, public;
grant select, insert, update, delete on table public.config_secrets to service_role;

-- Política única: SELECT para service_role.
drop policy if exists config_secrets_service_role_select on public.config_secrets;
create policy config_secrets_service_role_select
  on public.config_secrets
  for select
  to service_role
  using (true);

-- atualizado_em automático
create or replace function public.tg_config_secrets_touch()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_config_secrets_touch on public.config_secrets;
create trigger trg_config_secrets_touch
  before update on public.config_secrets
  for each row execute function public.tg_config_secrets_touch();
