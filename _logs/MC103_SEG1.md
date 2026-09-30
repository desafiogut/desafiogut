# MC103 — SEG1 · FRENTE B: MEDIÇÃO DO LEGADO (só leitura, só agregados)

Medido em 2026-09-30 ~04:34–04:39 UTC. Todas as queries: `SELECT` (MCP Supabase, projecto de produção).
On-chain: RPC público, sem credencial. Nenhum endereço, nenhum saldo individual neste documento.

## Tabela consolidada

| Tipo | Contas com valor | Valor total | Fonte | Medido em |
|---|---|---|---|---|
| **Saldo em R$** | **7** (de 8 linhas) | **R$ 23,75** (2 375 centavos) | `saldo_rs.payload.centavos` | 2026-09-30 04:34Z |
| ↳ distribuição | até R$ 10: **6** · R$ 10–50: **1** · > R$ 50: **0** | — | faixas (MIN/MAX omitidos, HG14) | idem |
| Créditos PIX históricos | 21 registos, 8 contas | R$ 58,00 | `saldo_rs_creditos` | idem |
| Débitos registados | 0 | — | `saldo_rs_debitos` | idem |
| **Senhas on-chain** | **1** | **12 senhas** (nominal R$ 24,00 a R$ 2,00) | `saldoSenhas` @ bloco 26087953 | 04:38Z |
| **Dívidas de bónus** | **0** | 0 senhas | `rankings_ciclo` (`senhas_a_creditar>0 AND liquidado_em IS NULL`); tabela com 0 linhas | 04:34Z |
| Tarefas de bónus na fila | 0 | — | `fila_tarefas` | idem |
| **Vale-Crédito** | **0** | R$ 0,00 | `wallet` (0 linhas) + Blob legado `wallet` (0 chaves) | 04:34Z / 04:39Z |
| Troco de senhas | 0 | — | `troco_senhas` (0 linhas) | 04:34Z |

**Corroboração independente:** R$ 23,75 em 7 contas é exactamente o número que o MC00.0 (2026-09-23) mediu por
outro caminho. Última alteração de saldo e último crédito: 2026-09-23 14:11Z.

## 1.1 Saldo R$ — nota sobre o Blob legado
`lerSaldoRsCentavos` faz `getSaldo() ?? lerSaldoLegado()`. O Blob `saldo-rs` tem 5 chaves. Comparação por **hash md5**
(sem ler valores nem trazer endereços): **as 5 têm linha em `saldo_rs`** → o fallback nunca as serve → o saldo vivo é o
do Supabase. Controlo positivo: 8/8 hashes de `saldo_rs` casam com os candidatos. **Lacuna do SEG-1 fechada.**

## 1.2 Senhas on-chain — método e o instrumento que mentiu
- Plano A (eventos `SenhasCreditadas`/`LanceDado`): **abandonado**. RPCs públicos: publicnode e drpc **recusam**
  leituras históricas; o `rpc.flashbots.net` **devolve 0 em silêncio**. Controlo positivo que o expôs: USDC, 100 blocos de
  junho → **0 logs** no flashbots (há milhares). Sem esse controlo, o relatório diria «0 senhas» com toda a confiança.
- Plano B (usado): `saldoSenhas` no **estado actual** (não-archive) sobre a união dos endereços conhecidos do sistema:
  `saldo_rs`, `saldo_rs_creditos`, `atividade_utilizadores`, `rankings_ciclo`, `troco_senhas` e chaves do Blob legado
  `saldo-rs` → **23 candidatos**, 0 falhas de leitura. Controlos: `coordenacao()` ≠ 0 e `code` 9648 chars (contrato certo).
- ⚠️ **Limite (L-4):** conta só senhas de endereços que o sistema conhece. Um `adicionarSenhas` manual para um endereço
  que nunca entrou na app **não seria visto**. Fechar exige `getLogs` históricos → RPC com credencial (R5, operador).
- ⚠️ **HG14 com n=1:** «1 conta, 12 senhas» é agregado sem identificador, mas com uma só conta equivale ao saldo dessa
  conta. Não há endereço no relatório.

## 1.3 Bónus
`rankings_ciclo` e `pontuacoes` têm **0 linhas** — o torneio nunca pontuou uma rodada real (leilão em `EM_BREVE_MODE`).
Dívida de bónus = **0**.

## 1.4 Vale-Crédito
Primário Supabase `wallet`: 0. Blob legado `wallet`: 0 chaves (controlo positivo do comando: `edicoes-metadata` = 5).

## 1.6 Estabilidade (2 corridas)
| | corrida 1 | corrida 2 | Δ |
|---|---|---|---|
| saldo R$ (contas / soma) | 7 / 2375 | 7 / 2375 | 0 |
| créditos (n / soma) | 21 / 5800 | 21 / 5800 | 0 |
| dívidas de bónus | 0 | 0 | 0 |
| Vale-Crédito (tabela / Blob) | 0 / 0 | 0 / 0 | 0 |
| senhas (contas / soma) | 1 / 12 (bloco 26087953) | 1 / 12 (bloco 26087956) | 0 |

## Observação de plausibilidade (não investigada — R20, candidato ao MC111)
Créditos R$ 58,00 − saldo R$ 23,75 = **R$ 34,25 consumidos**, com **0 registos em `saldo_rs_debitos`**. O consumo existe
(saldo < créditos) mas não deixa livro-razão nessa tabela. **Refinado pelo validador (SEG2):** as 12 senhas on-chain
explicam no máximo R$ 24,00 → **R$ 10,25 sem destino conhecido**. O MC111, antes de liquidar, tem de reconstituir esse valor.

## L-4 fechado pelo validador
Com `rpc.mevblocker.io` (que serve logs históricos; controlo USDC 8736 logs onde o flashbots dava 0), o validador leu **todos**
os logs do contrato desde o deploy (~bloco 25491209): **12 logs, todos `SenhasCreditadas`, 1 conta, 12 senhas** — igual ao
método B. Não há senhas em endereços desconhecidos do sistema.

## Queries executadas (texto integral — todas SELECT; F4 do validador)
1. `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name IN (...)`
2. `SELECT chave, jsonb_typeof(valor), (array_agg de jsonb_object_keys(valor)), valor, valor_booleano, versao_alvo, atualizado_em FROM config_remota`
3. `SELECT 't', k, count(*) FROM <saldo_rs|saldo_rs_creditos|wallet|troco_senhas>, jsonb_object_keys(payload) k GROUP BY k` (UNION ALL)
4. Agregado corrida 1: `SELECT now(), count(*)/count(*) FILTER centavos>0/sum(centavos)/contagens por faixa/payload inválido FROM saldo_rs; count+sum(valorCentavos)+count(DISTINCT endereco) FROM saldo_rs_creditos; count(*) FROM saldo_rs_debitos; count+sum(senhas_a_creditar) FROM rankings_ciclo WHERE senhas_a_creditar>0 AND liquidado_em IS NULL; count(*) FROM wallet, troco_senhas; count(*) FROM fila_tarefas WHERE tipo ILIKE '%bonus%'`
5. Candidatos on-chain: `WITH u AS (SELECT lower(cliente_id) FROM saldo_rs UNION ALL ... saldo_rs_creditos, atividade_utilizadores, rankings_ciclo, troco_senhas) SELECT count(DISTINCT e), ..., string_agg(DISTINCT e)` — lista usada só em memória/scratch, nunca em relatório
6. `SELECT string_agg(md5(lower(cliente_id)), ',') FROM saldo_rs` (comparação por hash com o Blob legado)
7. Agregado corrida 2: como a 4, mais `max(atualizado_em)` / `max(criado_em)`
Nenhum INSERT/UPDATE/DELETE/UPSERT; nenhuma migração.

## Veredito SEG1: **VERDE** (com o limite L-4 do método B declarado)
