-- UTAC140b — o ranking ao vivo deixa de ter a edição FIXA na BD (operador: «o objetivo é que possamos mudar essas
-- coisas assim como as edições, de forma dinâmica»). Qualquer edição ESPECIAL-* criada no Blob `edicoes-metadata`
-- passa a ter ranking legível pelo anon, sem migração nova. Mantém-se tudo o resto da 20261119_utac140:
-- a tabela não guarda valor durante a edição e o anon não tem privilégio sobre `valor_oculto`.

drop policy if exists ranking_especial_ler_especial on public.ranking_especial;
create policy ranking_especial_ler_especial on public.ranking_especial
  for select to anon, authenticated
  using (edicao_id ~ '^ESPECIAL-[A-Z0-9]+$');

drop function if exists public.get_ranking_especial(text);
create function public.get_ranking_especial(p_edicao_id text)
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
     and p_edicao_id ~ '^ESPECIAL-[A-Z0-9]+$'
   order by r.posicao
   limit 1000;
$$;

revoke all on function public.get_ranking_especial(text) from public;
grant execute on function public.get_ranking_especial(text) to anon, authenticated, service_role;
