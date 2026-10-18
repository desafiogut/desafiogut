-- UTAC110n — DEBT-071: CONVERSÃO dos créditos de lance em pontos de lance (1 crédito = 200 pontos).
--
-- Porquê: o UTAC110d criou os «créditos de lance» (1 por Passe Relâmpago; 1 por lance no MLC). O
-- UTAC110n (R18-110j.4b-1/-2/-6) substituiu-os: o lance passou a gastar PONTOS de lance e o Passe
-- passou a dar +200 pontos. Um crédito antigo vale exactamente o mesmo que o Passe passa a dar, logo
-- converte-se a 200 pontos (Art. 17º v5.1) e a coluna volta a zero — não se apaga nada do histórico.
--
-- IDEMPOTENTE por construção: o UPDATE só toca em linhas com `creditos_lance > 0` e, na mesma
-- instrução, zera essa coluna. Uma 2.ª execução encontra 0 linhas e não escreve nada (nem duplica
-- entradas no histórico). Não usa DDL destrutivo: nenhuma coluna é removida.
--
-- Projecto de produção: vjslwowwrpcawijdiksm. Requer autorização do operador para ser APLICADA.
-- Verificação DEPOIS de correr — as DUAS têm de devolver 0:
--   (1) nenhum crédito sobra:
--       SELECT count(*) FROM public.pontos WHERE creditos_lance > 0;
--   (2) o saldo bate certo com a soma do histórico (é assim que o ledger se escreve sempre):
--       SELECT count(*) FROM public.pontos p
--        WHERE p.pontos_lance <> coalesce((
--          SELECT sum((h->>'delta')::int) FROM jsonb_array_elements(p.historico_lance) h
--           WHERE h->>'campo' = 'pontos_lance'), 0);
--
-- Rollback: NÃO é trivial (a informação «quantos créditos eram» fica no histórico, motivo
-- `conversao-creditos`, e permite reconstruir). Não se inverte por SQL automático; se for preciso,
-- devolve-se 1 crédito por cada entrada `conversao-creditos` e subtraem-se os pontos correspondentes.

BEGIN;

UPDATE public.pontos
   SET pontos_lance = pontos_lance + (creditos_lance * 200),
       historico_lance = historico_lance || jsonb_build_array(jsonb_build_object(
         'data',   to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
         'campo',  'pontos_lance',
         'motivo', 'conversao-creditos',
         'delta',  creditos_lance * 200,
         'ref',    'conversao-creditos:' || endereco || ':' || creditos_lance
       )),
       creditos_lance = 0,
       atualizado_em  = now()
 WHERE creditos_lance > 0;

-- Índice para o placar novo (`GET /ranking-pontos-lance`, UTAC110n Frente F): ordena por saldo.
CREATE INDEX IF NOT EXISTS pontos_pontos_lance_idx
  ON public.pontos (pontos_lance DESC);

COMMIT;

-- Nota de desenho: a conversão é uma ÚNICA instrução (atómica dentro da transacção), pelo que não há
-- estados intermédios em que os pontos já entraram e os créditos ainda não saíram.
