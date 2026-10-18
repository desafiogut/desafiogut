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
-- ⚠️ A `ref` leva o INSTANTE da execução (achado ⚠️4 do validador SEG8, medido em Postgres 16):
-- sem ele, converter de novo créditos REINTRODUZIDOS na mesma linha (restauro de backup, caminho
-- legado) produzia uma segunda entrada com a MESMA `ref` — e `aplicar()`/`reverterMovimentoLance`
-- assumem que a `ref` é única. O instante é calculado UMA vez (`now()` é fixo dentro da transacção),
-- logo todas as linhas desta execução partilham o mesmo sufixo e cada uma continua única.
--
-- ⚠️ O índice do placar NÃO vive aqui (achado ⚠️3): foi para `20261018_utac110n_indice_ranking.sql`,
-- porque o ranking público precisa dele ANTES de a conversão ser aplicada.
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
         -- `to_char` com precisão de milissegundos: distingue duas execuções da mesma linha.
         'ref',    'conversao-creditos:' || endereco || ':' || creditos_lance
                   || ':' || to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISSMS')
       )),
       creditos_lance = 0,
       atualizado_em  = now()
 WHERE creditos_lance > 0;

COMMIT;

-- Nota de desenho: a conversão é uma ÚNICA instrução (atómica dentro da transacção), pelo que não há
-- estados intermédios em que os pontos já entraram e os créditos ainda não saíram.
