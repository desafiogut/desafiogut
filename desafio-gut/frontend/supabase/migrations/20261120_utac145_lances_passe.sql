-- UTAC145 (Frente A) — a contagem «1 Passe a cada N lances» da edição especial (R18-142.1-A, regra intocada) sai do Blob
-- `especial-lances-passe` e passa para o Postgres. Motivo (ℹ️3 do SEG4 do UTAC142, reproduzido em
-- `_tests/utac145-passe-idempotencia.test.mjs` I1): no Blob, uma escrita que chega mas cuja resposta se perde (503) era
-- repetida e contava o MESMO lance duas vezes, adiantando o consumo do Passe.
--
-- Desenho:
--   · uma linha por LANCE (`lance_id` = chave primária) ⇒ repetir a chamada com o mesmo lance devolve o que já foi gravado
--     (nem conta nem consome outra vez);
--   · posição e consumo decididos na MESMA transacção, sob advisory lock por (edição, endereço) ⇒ lances em paralelo da
--     mesma carteira recebem posições diferentes (UNIQUE (edicao_id, endereco, posicao) como rede);
--   · o Passe é consumido pela RPC já existente `passes_consumir` (atómica) DENTRO desta transacção: ou fica a linha com
--     `passe_consumido = true` e o inventário desce, ou nenhum dos dois.
-- Só o backend (service_role). Ordem: aplicar ANTES do deploy (o backend novo chama `registar_lance_passe`).

create table if not exists public.especial_lances_passe (
  lance_id        text primary key,
  edicao_id       text not null check (edicao_id ~ '^ESPECIAL-[A-Z0-9]+$'),
  endereco        text not null check (length(btrim(endereco)) > 0),
  posicao         integer not null check (posicao >= 1),
  passe_consumido boolean not null default false,
  criado_em       timestamptz not null default now(),
  unique (edicao_id, endereco, posicao)
);

alter table public.especial_lances_passe enable row level security;
revoke all on public.especial_lances_passe from public, anon, authenticated;
grant select, insert, update on public.especial_lances_passe to service_role;

create or replace function public.registar_lance_passe(p_lance_id text, p_edicao_id text, p_endereco text, p_a_cada integer)
returns table (posicao_lance integer, passe_gasto boolean, novo boolean, passes_restantes integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pos  integer;
  v_cons boolean := false;
begin
  if p_lance_id is null or length(btrim(p_lance_id)) = 0 then raise exception 'lance_id_obrigatorio'; end if;
  perform pg_advisory_xact_lock(hashtext('lances_passe:' || p_edicao_id || ':' || p_endereco));

  -- repetição do MESMO lance (resposta perdida, retry): devolve o gravado, sem contar nem consumir
  select e.posicao, e.passe_consumido into v_pos, v_cons
    from public.especial_lances_passe e where e.lance_id = p_lance_id;
  if found then
    return query select v_pos, v_cons, false,
      (select i.passes_relampago from public.passes_inventario i where i.endereco = p_endereco);
    return;
  end if;

  -- ⚠️ achado do ensaio em Postgres (UTAC145): o SELECT … INTO acima, sem linha, põe v_cons a NULL ⇒ repor antes de contar
  v_cons := false;
  select coalesce(max(e.posicao), 0) + 1 into v_pos
    from public.especial_lances_passe e where e.edicao_id = p_edicao_id and e.endereco = p_endereco;

  if p_a_cada is not null and p_a_cada > 0 and v_pos % p_a_cada = 0 then
    v_cons := public.passes_consumir(p_endereco, 'relampago', 1);  -- sem Passe ⇒ false; o lance passa na mesma
  end if;

  insert into public.especial_lances_passe (lance_id, edicao_id, endereco, posicao, passe_consumido)
    values (p_lance_id, p_edicao_id, p_endereco, v_pos, v_cons);

  return query select v_pos, v_cons, true,
    (select i.passes_relampago from public.passes_inventario i where i.endereco = p_endereco);
end;
$$;

revoke all on function public.registar_lance_passe(text, text, text, integer) from public, anon, authenticated;
grant execute on function public.registar_lance_passe(text, text, text, integer) to service_role;
