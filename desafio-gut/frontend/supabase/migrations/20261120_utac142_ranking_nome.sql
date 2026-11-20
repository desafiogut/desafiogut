-- UTAC142 (Frente D, R18-142-D — migração autorizada pelo operador). A tabela ao vivo da especial passa a mostrar
-- «PrimeiroNome I.» em vez do endereço. Guarda-se SÓ a forma reduzida, calculada no backend
-- (`_lib/nome-exibicao.mjs`): nunca o nome completo e nunca um e-mail (CHECK sem «@»). Sem nome → NULL e a tabela
-- mostra o endereço encurtado, como antes. O valor continua oculto (nada muda em `valor_oculto`).
-- Ordem: aplicar ANTES do deploy (o backend novo chama a função com p_nome).

alter table public.ranking_especial
  add column if not exists nome_exibicao text
  check (nome_exibicao is null or (char_length(nome_exibicao) between 1 and 44 and position('@' in nome_exibicao) = 0));

grant select (nome_exibicao) on public.ranking_especial to anon, authenticated;

-- A de 3 argumentos sai: com as duas, uma chamada com nomes ficava ambígua. A nova aceita a antiga (p_nome default null).
drop function if exists public.registar_lance_especial(text, text, text);
create or replace function public.registar_lance_especial(p_id text, p_edicao_id text, p_endereco text, p_nome text default null)
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
  insert into public.ranking_especial (id, edicao_id, endereco, posicao, nome_exibicao)
    values (p_id, p_edicao_id, p_endereco, v_pos, nullif(btrim(p_nome), ''));
  return v_pos;
end;
$$;
revoke all on function public.registar_lance_especial(text, text, text, text) from public, anon, authenticated;
grant execute on function public.registar_lance_especial(text, text, text, text) to service_role;

drop function if exists public.get_ranking_especial(text);
create function public.get_ranking_especial(p_edicao_id text)
returns table (posicao integer, endereco text, valor_oculto integer, criado_em timestamptz, nome_exibicao text)
language sql
stable
security definer
set search_path = public
as $$
  select r.posicao,
         r.endereco,
         case when coalesce(auth.role(), '') = 'service_role' then r.valor_oculto else null end,
         r.criado_em,
         r.nome_exibicao
    from public.ranking_especial r
   where r.edicao_id = p_edicao_id
     and p_edicao_id ~ '^ESPECIAL-[A-Z0-9]+$'
   order by r.posicao
   limit 1000;
$$;
revoke all on function public.get_ranking_especial(text) from public;
grant execute on function public.get_ranking_especial(text) to anon, authenticated, service_role;
