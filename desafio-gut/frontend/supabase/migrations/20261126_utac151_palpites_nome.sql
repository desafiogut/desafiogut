-- UTAC151 (R18-151-A — backend mínimo autorizado pelo operador). A tabela de palpites da especial Programada passa a
-- mostrar «PrimeiroNome I.» como a tabela de lances da Relâmpago (UTAC142). Guarda-se SÓ a forma reduzida, calculada
-- no backend (`_lib/nome-exibicao.mjs`) a partir do nome VERIFICADO pelo identity token do Privy (UTAC146): nunca o
-- nome completo e nunca um e-mail (CHECK sem «@», o mesmo do `ranking_especial`). Sem nome → NULL e a tabela mostra o
-- endereço encurtado. Os palpites já feitos ficam NULL (não há nome verificado deles no servidor).
-- Ordem: aplicar ANTES do deploy (o `ler-palpites` novo pede a coluna).

alter table public.palpites
  add column if not exists nome_exibicao text
  check (nome_exibicao is null or (char_length(nome_exibicao) between 1 and 44 and position('@' in nome_exibicao) = 0));
