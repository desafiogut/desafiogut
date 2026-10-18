-- UTAC110n.1 (DECISÃO DO OPERADOR, 2026-10-18) — DEBT-076: as SENHAS antigas do bónus de 5 acertos
-- convertem-se em PONTOS DE LANCE (1 senha = 200 pontos).
--
-- Porquê: o bónus de 5 acertos pagava em SENHAS on-chain (`rankings_ciclo.senhas_a_creditar` com
-- `liquidado_em IS NULL` = uma DÍVIDA, modelo do MC93-B/110d). O UTAC110n passou a pagar esse bónus em
-- +50 PONTOS DE LANCE e as linhas NOVAS nascem com `senhas_a_creditar = 0` — mas as dívidas ANTIGAS
-- ficaram por liquidar e o `sweeper-divida-orfa` continua a pô-las na fila `creditar-senhas-bonus`
-- (DEBT-076). Decisão do operador: NÃO emitir senhas on-chain para elas; converter em pontos, ao mesmo
-- preço a que o Passe converte um crédito (200).
--
-- ⚠️ NÃO apaga o worker (`worker-bonus.mjs`) nem o sweeper: ficam como legado. O que esta migração faz é
-- deixar de haver DÍVIDA (a condição que ambos procuram é `senhas_a_creditar > 0`). Um item já na fila
-- deixa de poder emitir por si: `bonus-emissao.mjs` recusa quando
-- `payload.quantidade !== divida.senhas_a_creditar` (agora 0) ⇒ nenhuma senha on-chain sai depois disto.
--
-- IDEMPOTENTE por construção (mesmo padrão da conversão de créditos): o UPDATE final só toca em linhas
-- com `senhas_a_creditar > 0 AND liquidado_em IS NULL` e zera essa coluna na MESMA instrução. Uma 2.ª
-- execução encontra 0 linhas, não escreve nada e não duplica entradas no histórico.
--
-- ⚠️ COBERTURA DE QUEM NÃO TEM LINHA EM `public.pontos`: a dívida vive em `rankings_ciclo` e o saldo em
-- `public.pontos`. Um endereço com dívida e sem linha de saldo perderia os pontos num UPDATE simples,
-- por isso a escrita é um UPSERT: cria a linha quando não existe, soma quando existe.
--
-- ⚠️ A `ref` leva o INSTANTE da execução (lição do achado ⚠️4 do SEG8): sem ele, uma re-conversão de
-- senhas REINTRODUZIDAS (restauro de backup) repetiria a `ref`, que `aplicar()`/`reverterMovimentoLance`
-- assumem única. `now()` é fixo dentro da transacção ⇒ todas as linhas desta execução partilham o
-- sufixo e cada uma continua única por endereço.
--
-- Projecto de produção: vjslwowwrpcawijdiksm. REQUER autorização do operador para ser APLICADA.
--
-- Verificação DEPOIS de correr — as TRÊS têm de devolver 0:
--   (1) nenhuma dívida antiga sobra:
--       SELECT count(*) FROM public.rankings_ciclo
--        WHERE senhas_a_creditar > 0 AND liquidado_em IS NULL;
--   (2) nenhum endereço com dívida ficou sem saldo:
--       SELECT count(*) FROM public.rankings_ciclo r
--        WHERE r.senhas_a_creditar > 0 AND r.liquidado_em IS NULL
--          AND NOT EXISTS (SELECT 1 FROM public.pontos p WHERE p.endereco = r.endereco);
--   (3) o saldo bate certo com a soma do histórico (é assim que o ledger se escreve sempre):
--       SELECT count(*) FROM public.pontos p
--        WHERE p.pontos_lance <> coalesce((
--          SELECT sum((h->>'delta')::int) FROM jsonb_array_elements(p.historico_lance) h
--           WHERE h->>'campo' = 'pontos_lance'), 0);
--
-- Rollback: não é automático. A informação «quantas senhas eram» fica no histórico (motivo
-- `conversao-senhas`): por cada entrada dessas, subtraem-se os pontos correspondentes e devolve-se
-- `delta / 200` a `senhas_a_creditar` na linha de `rankings_ciclo` do mesmo endereço.

BEGIN;

WITH divida AS (
  SELECT endereco,
         SUM(senhas_a_creditar)::integer AS senhas
    FROM public.rankings_ciclo
   WHERE senhas_a_creditar > 0
     AND liquidado_em IS NULL
   GROUP BY endereco
), instante AS (
  SELECT to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISSMS') AS marca
), creditado AS (
  INSERT INTO public.pontos AS p
        (endereco, pontos, historico, atualizado_em, creditos_lance, pontos_lance, historico_lance)
  SELECT d.endereco,
         0,
         '[]'::jsonb,
         now(),
         0,
         d.senhas * 200,
         jsonb_build_array(jsonb_build_object(
           'data',   to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
           'campo',  'pontos_lance',
           'motivo', 'conversao-senhas',
           'delta',  d.senhas * 200,
           'ref',    'conversao-senhas:' || d.endereco || ':' || d.senhas || ':' || i.marca
         ))
    FROM divida d
    CROSS JOIN instante i
  ON CONFLICT (endereco) DO UPDATE
     SET pontos_lance    = p.pontos_lance + EXCLUDED.pontos_lance,
         historico_lance = p.historico_lance || (EXCLUDED.historico_lance -> 0),
         atualizado_em   = now()
  RETURNING p.endereco
)
UPDATE public.rankings_ciclo r
   SET senhas_a_creditar = 0
 WHERE r.senhas_a_creditar > 0
   AND r.liquidado_em IS NULL;

COMMIT;

-- Nota de desenho: a conversão é UMA instrução com o UPSERT e a zeragem na mesma transacção, pelo que
-- não há estados intermédios em que os pontos já entraram e a dívida ainda não saiu (nem o contrário).
-- As linhas de `rankings_ciclo` ficam com `liquidado_em` a NULL de propósito: `liquidado_em` significa
-- «emitido on-chain» e o CHECK da tabela exige `bonus_emitido = true` para o preencher. Escrevê-lo aqui
-- seria afirmar uma emissão que não aconteceu. A dívida deixa de existir porque a coluna passou a 0 —
-- que é a única condição que o sweeper e o worker procuram.
