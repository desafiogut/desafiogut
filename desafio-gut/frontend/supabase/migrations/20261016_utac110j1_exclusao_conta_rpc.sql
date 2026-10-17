-- UTAC110j.1 — EXCLUSÃO DE CONTA: transacção única (atomicidade) + política tabela a tabela.
--
-- PORQUE EXISTE: o `_lib/conta-delete.mjs` (MC72…MC104.3) executa a exclusão **tabela a tabela**,
-- cada sub-operação isolada. Isso é fail-visível, mas NÃO é atómico: se a 5.ª de 11 tabelas falhar,
-- as 4 primeiras já foram apagadas e o processo fica a MEIO. Este UTAC exige transacção. A única
-- forma honesta de a ter num Postgres é fazer TODO o trabalho dentro de UMA função — é o que esta
-- migração cria.
--
-- O que a função NÃO resolve (declarado, não escondido): os Netlify Blobs estão FORA do Postgres. Não
-- existe transacção distribuída entre os dois. A parte Postgres passa a ser atómica; a parte Blobs
-- continua fail-soft por store, idempotente e re-executável (o endpoint responde 500 e a repetição
-- completa o que faltou). Ver `_logs/UTAC110j.1_SEG1.md` §Atomicidade.
--
-- ⚠️ NÃO é aplicada em produção por este UTAC (decisão do operador, R18). Enquanto não estiver
-- aplicada, `excluirSupabase` não encontra a função (42883) e usa a via tabela-a-tabela — o manifesto
-- diz qual das duas correu (`via: "rpc" | "legado"`).
--
-- POLÍTICA (fonte única em JS: `POLITICA_EXCLUSAO` em `_lib/conta-delete.mjs`). O teste
-- `utac110j1-exclusao-lgpd.test.mjs` lê ESTE ficheiro e falha se as listas divergirem.
--
--   HARD DELETE (sem obrigação de retenção — LGPD art. 15/16):
--     saldo_rs, troco_senhas, wallet            (por cliente_id)
--     lances, lojistas, atividade_utilizadores  (por endereco)
--     palpites, pontuacoes, rankings_ciclo      (por endereco)
--     cotas                                     (cliente_id OU endereco)
--     pontos                                    (o CONTEÚDO sai sempre; a linha sobrevive vazia e
--                                                pseudónima só quando há resgate retido — âncora da FK)
--   ANONIMIZAR (retenção fiscal/contabilística — LGPD art. 16, I e IV):
--     saldo_rs_creditos, saldo_rs_debitos       (payload: PII apagada, endereco→pseudónimo)
--     cotas_pagas, fila_tarefas, wallet_idem    (payload: idem — B3, achado do validador)
--     passes                                    (prova de compra)
--     google_play_compras                       (prova contabilística; DELETE revogado no 110i.1)
--     eco_quildo                                (passivo com lastro em R$; saldo/histórico ficam)
--     resgates                                  (R18-110j.1-4b: prova de entrega; morada → «[Conta
--                                                Deletada]», registo da transacção fica)
--
-- NOTA sobre às FKs: `palpites` e `resgates` têm FK `ON DELETE CASCADE` para `pontos`. Por isso a
-- ordem é: `palpites` → apagado; `resgates` → ANONIMIZADO (2b); `pontos` → conteúdo apagado (2c). Se
-- `pontos` fosse apagado antes de (2b), o CASCADE levaria consigo o registo de entrega que o operador
-- mandou reter (R18-110j.1-4b).
--
-- Rollback (seguro: a migração só CRIA funções; nenhum dado é tocado por ela):
--   DROP FUNCTION IF EXISTS public.excluir_conta_titular(text, text, boolean);
--   DROP FUNCTION IF EXISTS public.mc72_anon_payload(jsonb, text);

-- ─── 1. Anonimização de payload (espelho JS de `anonimizarPayload`) ─────────────
-- Os nomes das chaves de PII são os MESMOS de `PII_KEYS_REMOVER` em `_lib/conta-delete.mjs`
-- (o teste de deriva compara as duas listas). `STABLE` porque carimba `now()`.
CREATE OR REPLACE FUNCTION public.mc72_anon_payload(p jsonb, p_anon text)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $fn$
  SELECT (coalesce(p, '{}'::jsonb)
            - 'email' - 'cpf' - 'cnpj' - 'nome' - 'name'
            - 'telefone' - 'phone' - 'payerEmail' - 'payer_email'
            - 'payerName' - 'nomeCompleto' - 'payer')
      || CASE WHEN coalesce(p, '{}'::jsonb) ? 'endereco'
              THEN jsonb_build_object('endereco', p_anon) ELSE '{}'::jsonb END
      || CASE WHEN coalesce(p, '{}'::jsonb) ? 'address'
              THEN jsonb_build_object('address', p_anon) ELSE '{}'::jsonb END
      || CASE WHEN coalesce(p, '{}'::jsonb) ? 'comprador'
              THEN jsonb_build_object('comprador', p_anon) ELSE '{}'::jsonb END
      || CASE WHEN jsonb_typeof(coalesce(p, '{}'::jsonb) -> 'morada') = 'object'
              THEN jsonb_build_object('morada', (
                     SELECT coalesce(jsonb_object_agg(k, '"***"'::jsonb), '{}'::jsonb)
                     FROM jsonb_object_keys(coalesce(p, '{}'::jsonb) -> 'morada') AS k))
              ELSE '{}'::jsonb END
      || jsonb_build_object(
           'anonimizadoEm',  to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
           'anonimizadoPor', 'mc72-exclusao-conta');
$fn$;

COMMENT ON FUNCTION public.mc72_anon_payload(jsonb, text) IS
  'UTAC110j.1 — anonimiza um payload retido: endereco/address/comprador → pseudónimo, morada → ***, PII de topo apagada. Espelho de anonimizarPayload (conta-delete.mjs).';

-- ─── 2. Exclusão atómica ───────────────────────────────────────────────────────
-- `SECURITY DEFINER`: corre com os privilégios do dono (postgres/service_role dono das tabelas), logo
-- NÃO depende de GRANT de DELETE nas tabelas criadas depois do MC105a (`pontos`, `palpites`,
-- `resgates`, `eco_quildo` só têm SELECT/INSERT/UPDATE para o service_role; `passes` e
-- `google_play_compras` tiveram o DELETE REVOGADO de propósito).
CREATE OR REPLACE FUNCTION public.excluir_conta_titular(
  p_endereco  text,
  p_anon      text,
  p_dry_run   boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_end   text := lower(btrim(coalesce(p_endereco, '')));
  v_anon  text := btrim(coalesce(p_anon, ''));
  v_del   jsonb := '{}'::jsonb;
  v_anonj jsonb := '{}'::jsonb;
  r       record;
  n       bigint;
  v_saldo integer;
  v_hist  jsonb;
  v_morada jsonb;
BEGIN
  -- Guardas: o chamador é o service_role (endpoint), mas a função valida de novo — nunca confiar
  -- no chamador para o formato. O pseudónimo vem de FORA (chaveAnonima, JS) para haver UMA só
  -- implementação da regra de pseudonimização.
  IF v_end !~ '^0x[0-9a-f]{40}$' THEN
    RAISE EXCEPTION 'endereco_invalido' USING ERRCODE = '22023';
  END IF;
  IF v_anon !~ '^anon:[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'anon_invalido' USING ERRCODE = '22023';
  END IF;

  -- (1) HARD DELETE — ordem: filhos antes do pai (`pontos`).
  FOR r IN SELECT * FROM (VALUES
      ('saldo_rs',              'cliente_id'),
      ('troco_senhas',          'cliente_id'),
      ('wallet',                'cliente_id'),
      ('lances',                'endereco'),
      ('lojistas',              'endereco'),
      ('atividade_utilizadores','endereco'),
      ('palpites',              'endereco'),
      ('pontuacoes',            'endereco'),
      ('rankings_ciclo',        'endereco')
  ) AS t(tabela, coluna) LOOP
    IF p_dry_run THEN
      EXECUTE format('SELECT count(*) FROM public.%I WHERE %I = $1', r.tabela, r.coluna)
        INTO n USING v_end;
    ELSE
      EXECUTE format('DELETE FROM public.%I WHERE %I = $1', r.tabela, r.coluna)
        USING v_end;
      GET DIAGNOSTICS n = ROW_COUNT;
    END IF;
    v_del := v_del || jsonb_build_object(r.tabela, n);
  END LOOP;

  -- (2) cotas: a chave é dual (endereco logado OU "cnpj:{cnpj}" cadastrado no mesmo endereço).
  IF p_dry_run THEN
    SELECT count(*) INTO n FROM public.cotas WHERE cliente_id = v_end OR endereco = v_end;
  ELSE
    DELETE FROM public.cotas WHERE cliente_id = v_end OR endereco = v_end;
    GET DIAGNOSTICS n = ROW_COUNT;
  END IF;
  v_del := v_del || jsonb_build_object('cotas', n);

  -- (2b) resgates — ANONIMIZAR (R18-110j.1-4b, decisão do operador): é a PROVA DE ENTREGA
  -- (obrigação contabilística). Fica o registo (id, cartao_id, status, datas) e sai o que identifica:
  -- `endereco` → pseudónimo e TODOS os valores da `morada` → «[Conta Deletada]» (as chaves mantêm-se).
  -- ⚠️ B1 (achado do validador, medido em Postgres real): a FK `resgates.endereco → pontos.endereco`
  -- é verificada em CADA statement. Atualizar `resgates` para `v_anon` sem uma linha de `pontos` com
  -- essa chave dá 23503 e reverte a transação INTEIRA — a função falhava sempre que o titular tinha
  -- resgate. A âncora nasce PRIMEIRO (idempotente: ON CONFLICT DO NOTHING).
  IF NOT p_dry_run AND EXISTS (SELECT 1 FROM public.resgates WHERE endereco = v_end) THEN
    INSERT INTO public.pontos (endereco, pontos, historico)
    VALUES (v_anon, 0, '[]'::jsonb)
    ON CONFLICT (endereco) DO NOTHING;
  END IF;

  n := 0;
  FOR r IN SELECT * FROM public.resgates WHERE endereco = v_end LOOP
    IF NOT p_dry_run THEN
      v_morada := CASE
        WHEN jsonb_typeof(r.morada) = 'object'
          THEN (SELECT coalesce(jsonb_object_agg(k, to_jsonb('[Conta Deletada]'::text)), '{}'::jsonb)
                  FROM jsonb_object_keys(r.morada) AS k)
        ELSE to_jsonb('[Conta Deletada]'::text)
      END;
      UPDATE public.resgates
         SET endereco = v_anon, morada = v_morada, atualizado_em = now()
       WHERE id = r.id;
    END IF;
    n := n + 1;
  END LOOP;
  v_anonj := v_anonj || jsonb_build_object('resgates', n);

  -- (2c) pontos — o CONTEÚDO sai sempre. Se havia resgate retido, a âncora criada em (2b) sustenta a
  -- FK e esta linha pode ser apagada sem disparar CASCADE nenhum.
  SELECT count(*) INTO n FROM public.pontos WHERE endereco = v_end;
  IF NOT p_dry_run AND n > 0 THEN
    DELETE FROM public.pontos WHERE endereco = v_end;
  END IF;
  v_del := v_del || jsonb_build_object('pontos', n);

  -- (3) ANONIMIZAR payload (retenção fiscal).
  FOR r IN SELECT * FROM (VALUES
      ('saldo_rs_creditos', 'endereco'),
      ('saldo_rs_debitos',  'endereco'),
      -- B3 (achado do validador, medido): o registo da cota paga guardava {cnpj,email,endereco} e a
      -- fila de tarefas guardava o endereço para sempre numa tarefa falhada.
      ('cotas_pagas',       'endereco'),
      ('fila_tarefas',      'endereco'),
      -- tabela LEGADA do rename do MC88.29: pode não existir ⇒ é OPCIONAL (ausência não é erro)
      ('fila_tarefas_legado','endereco'),
      ('wallet_idem',       'endereco')
  ) AS t(tabela, campo) LOOP
    -- Uma tabela marcada como opcional (legado) que não exista neste ambiente conta 0 e não é erro;
    -- qualquer OUTRA tabela ausente rebenta a transação (fail-closed: uma migração em falta não pode
    -- passar por «não havia dados»).
    IF r.tabela = 'fila_tarefas_legado' AND to_regclass('public.fila_tarefas_legado') IS NULL THEN
      n := 0;
      v_anonj := v_anonj || jsonb_build_object(r.tabela, n);
      CONTINUE;
    END IF;
    IF p_dry_run THEN
      EXECUTE format('SELECT count(*) FROM public.%I WHERE payload->>%L = $1', r.tabela, r.campo)
        INTO n USING v_end;
    ELSE
      EXECUTE format('UPDATE public.%I SET payload = public.mc72_anon_payload(payload, $2) WHERE payload->>%L = $1', r.tabela, r.campo)
        USING v_end, v_anon;
      GET DIAGNOSTICS n = ROW_COUNT;
    END IF;
    v_anonj := v_anonj || jsonb_build_object(r.tabela, n);
  END LOOP;

  -- (4) ANONIMIZAR a coluna `endereco` (o registo fica, a pessoa sai).
  FOR r IN SELECT * FROM (VALUES ('passes'), ('google_play_compras')) AS t(tabela) LOOP
    IF p_dry_run THEN
      EXECUTE format('SELECT count(*) FROM public.%I WHERE endereco = $1', r.tabela)
        INTO n USING v_end;
    ELSE
      EXECUTE format('UPDATE public.%I SET endereco = $2 WHERE endereco = $1', r.tabela)
        USING v_end, v_anon;
      GET DIAGNOSTICS n = ROW_COUNT;
    END IF;
    v_anonj := v_anonj || jsonb_build_object(r.tabela, n);
  END LOOP;

  -- (5) eco_quildo: passivo com lastro em R$ ⇒ saldo e histórico FICAM, o endereço sai.
  --     A 2.ª exclusão do mesmo endereço colide na PK (o pseudónimo já existe) ⇒ soma/junta e
  --     remove a linha com o endereço (nunca deixar o endereço de quem pediu eliminação).
  IF p_dry_run THEN
    SELECT count(*) INTO n FROM public.eco_quildo WHERE endereco = v_end;
  ELSE
    SELECT saldo, historico INTO v_saldo, v_hist FROM public.eco_quildo WHERE endereco = v_end;
    IF FOUND THEN
      INSERT INTO public.eco_quildo AS e (endereco, saldo, historico, atualizado_em)
      VALUES (v_anon, coalesce(v_saldo, 0), coalesce(v_hist, '[]'::jsonb), now())
      ON CONFLICT (endereco) DO UPDATE
        SET saldo         = e.saldo + EXCLUDED.saldo,
            historico     = e.historico || EXCLUDED.historico,
            atualizado_em = now();
      DELETE FROM public.eco_quildo WHERE endereco = v_end;
      n := 1;
    ELSE
      n := 0;
    END IF;
  END IF;
  v_anonj := v_anonj || jsonb_build_object('eco_quildo', n);

  RETURN jsonb_build_object('deletado', v_del, 'anonimizado', v_anonj, 'dryRun', p_dry_run);
END;
$fn$;

COMMENT ON FUNCTION public.excluir_conta_titular(text, text, boolean) IS
  'UTAC110j.1 — exclusão de conta do titular numa ÚNICA transacção (hard delete + anonimização). R18-110j.1-1.';

-- Só o service_role (as Netlify Functions) pode executar: `anon`/`authenticated` nunca.
-- B9 (achado do validador): `anon` e `authenticated` só existem no Supabase. Sem esta guarda o
-- ficheiro não era executável num Postgres limpo — sinal de que nunca tinha sido corrido em lado
-- nenhum. Guardar por role torna a migração portável e o efeito é o mesmo no Supabase.
DO $grants$
BEGIN
  REVOKE ALL ON FUNCTION public.excluir_conta_titular(text, text, boolean) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.mc72_anon_payload(jsonb, text) FROM PUBLIC;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.excluir_conta_titular(text, text, boolean) FROM anon;
    REVOKE ALL ON FUNCTION public.mc72_anon_payload(jsonb, text) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.excluir_conta_titular(text, text, boolean) FROM authenticated;
    REVOKE ALL ON FUNCTION public.mc72_anon_payload(jsonb, text) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.excluir_conta_titular(text, text, boolean) TO service_role;
    GRANT EXECUTE ON FUNCTION public.mc72_anon_payload(jsonb, text) TO service_role;
  END IF;
END
$grants$;
