-- 20260802_mc8943_atividade_utilizadores.sql — MC89.43 (S2 / P0-A)
--
-- PORQUE ESTA TABELA EXISTE
-- O painel admin listava utilizadores a partir de `vw_utilizadores`, que é um
-- UNION de cotas + saldo_rs + saldo_rs_creditos. Isto é, reconstruía a lista a
-- partir de PEGADAS FINANCEIRAS: quem entra na app e não transaciona era
-- invisível — não podia ser apoiado nem bloqueado. Medido no MC89.42: a vista
-- devolvia 7 linhas, nenhuma de um utilizador comum.
--
-- ⚠️ ISTO É DADO PESSOAL NOVO. Não é uma alteração técnica neutra.
-- Decisão do operador (MC89.43, Opção A). Guarda-se o MÍNIMO que responde à
-- pergunta "quem usa isto?":
--     endereço (pseudónimo já público na blockchain) + carimbos + contador.
-- NÃO se guarda email, IP, user-agent, nem que ecrãs foram vistos. Não é
-- telemetria de comportamento; é uma lista de quem existe.
--
-- OBRIGAÇÕES QUE ANDAM COM ELA:
--   1. Política de privacidade (iubenda) — atualização é do OPERADOR, vive fora
--      deste repositório.
--   2. Exclusão de conta — `conta-delete.mjs` apaga esta linha (hard-delete por
--      `endereco`). Sem isso, apagar a conta deixaria rasto (MC72/Play Store).
--
-- Execução pelo OPERADOR (R12). Idempotente: sem DROP, sem perda de dados.

CREATE TABLE IF NOT EXISTS atividade_utilizadores (
  endereco        TEXT PRIMARY KEY
                  CHECK (endereco ~ '^0x[0-9a-f]{40}$'),  -- sempre minúsculas
  primeiro_acesso TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_acesso   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acessos         INT         NOT NULL DEFAULT 1
);

-- A listagem do painel ordena por acesso mais recente e filtra "ativos nos
-- últimos N dias" — é este o índice que serve as duas coisas.
CREATE INDEX IF NOT EXISTS idx_atividade_ultimo_acesso
  ON atividade_utilizadores (ultimo_acesso DESC);

ALTER TABLE atividade_utilizadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role total atividade" ON atividade_utilizadores;
CREATE POLICY "service_role total atividade" ON atividade_utilizadores
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Registo atómico numa só ida à base: primeira vez insere, seguintes só tocam
-- no carimbo e no contador. Feito em SQL (e não com um read-modify-write no
-- Node) porque `auth-user` é caminho quente de login — dois logins em paralelo
-- do mesmo endereço não podem perder uma contagem nem rebentar por PK duplicada.
-- ⚠️ SECURITY INVOKER, NÃO DEFINER — e isto é deliberado.
-- Com DEFINER a função ignoraria o RLS, e então bastava um `anon` conseguir
-- executá-la para escrever livremente na tabela. Com INVOKER, quem chama leva
-- consigo as suas permissões: o backend (service_role) passa pela política
-- acima, e um anónimo bate no RLS mesmo que consiga invocar a função.
-- Duas trancas independentes em vez de uma.
CREATE OR REPLACE FUNCTION registar_atividade(p_endereco TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  INSERT INTO atividade_utilizadores (endereco, primeiro_acesso, ultimo_acesso, acessos)
  VALUES (LOWER(p_endereco), NOW(), NOW(), 1)
  ON CONFLICT (endereco) DO UPDATE
    SET ultimo_acesso = NOW(),
        acessos       = atividade_utilizadores.acessos + 1;
$$;

-- ⚠️ REVOGAR DE `anon`/`authenticated` PELO NOME, não só de PUBLIC.
-- O Supabase tem ALTER DEFAULT PRIVILEGES que dá EXECUTE a esses papéis
-- DIRETAMENTE. `REVOKE ... FROM PUBLIC` não lhes toca — medido: depois de um
-- REVOKE só a PUBLIC, `has_function_privilege('anon', ...)` continuava `true`.
-- É a mesma armadilha do MC88.28/29, do outro lado.
REVOKE ALL ON FUNCTION registar_atividade(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION registar_atividade(TEXT) TO service_role;
