# MC104 — SEG1 · FRENTE B: EXPORTAÇÃO COMPLETA (LGPD art. 18)

## 1.1 Antes (medido no SEG-1)
Só Blobs: `saldo-rs`, `wallet`, `cotas`, `renovacao-adesao`, `voucher`, `consent_log`, `lance_idem`, `pedidos`.
**Pedidos nunca casavam** (campo `comprador`), **lances e pontos ausentes**, e os dados migrados para o Supabase
(MC36.1) saíam **do Blob legado** (desactualizados).

## 1.2 Correcção — `exportar-dados.mjs` (só acréscimos; decisão R18 3)
| Tipo | Como entra agora |
|---|---|
| **Pedidos** (morada, CPF, NF-e) | `coletarPorValor` casa também `obj.comprador` (o índice `comprador:${e}` = `{ids}` não casa: não tem o campo) |
| **Lances** | `dados.supabase.tabelas.lances` (produção mainnet grava aqui via `addLance`) + `dados.lances_relampago` = **só os lances do titular** dentro do Blob legado por edição (o Blob guarda os de todos) |
| **Pontos do torneio** | `pontuacoes` + `rankings_ciclo` |
| **Consentimento** | `consent_log` (já existia; agora inclui o aceite do gate — Frente A) |
| **Palpites** | **N/A** — a funcionalidade não existe (P10: não se inventa uma chave vazia) |
| Dados migrados (R18 3) | `saldo_rs`, `saldo_rs_creditos`, `saldo_rs_debitos` (por `payload->>endereco`), `troco_senhas`, `wallet`, `cotas` (por `cliente_id` OU `endereco`), `lojistas`, `atividade_utilizadores` |

Supabase via `getSupabaseReadOnly()` (só leitura). Sem Supabase → `dados.supabase = {disponivel:false}` (declarado, não vazio
silencioso). Erro numa tabela → `null` nessa tabela + mensagem em `erros` (nunca parece «sem dados»).
Logs do handler passaram a **mascarar o endereço** (HARD GATE 14; eram 2 linhas com o endereço completo).
Endereços no Supabase: medido `0` em maiúsculas/mistos em todas as colunas usadas → `.eq` com o endereço em minúsculas (como o `conta-delete`).

## 1.3 Testes — `_tests/mc104-exportar-dados.test.mjs` (8)
Handler real; Supabase em duplo que **aplica** os filtros (`eq` incl. `payload->>campo`, `or`) e **lança** com `.eq(col,null)`.
Em **todas** as fontes há dados de um terceiro.
- titular com dados → pedidos com morada/CPF/NF-e, lances (Blob + tabela), pontos, ranking, consentimento, saldo, créditos, cotas (2 vias);
- **HARD GATE 13:** o JSON inteiro não contém o endereço do terceiro nem nenhum dado dele (CEP, CPF, lance, saldo, e-mail, crédito);
- chaves antigas mantidas (HARD GATE 4);
- titular sem dados → 200 e listas vazias;
- Supabase ausente → `{disponivel:false}`; erro numa tabela → declarado, as outras vêm;
- auth: outro → 403; admin → só os dados do titular pedido;
- HARD GATE 14: log sem endereço completo (com controlo de que houve log).
**Mutação: 9/9 RED** (`scripts/mc104-prova-mutacao.mjs B`): sem `comprador`, sem lances legados, lance legado sem filtro,
cotas só por uma via, sem Supabase, **Supabase sem filtro do titular**, sem pontuações, log com endereço, erro engolido.

## 1.4 Verificação cruzada com o art. 18
- **Só o titular:** owner-ou-admin inalterado; cada fonte filtra pelo endereço autenticado/pedido; provado por teste e mutante (B4, B8).
- **Todos os tipos relevantes:** os 5 do enunciado (palpites N/A) + os migrados. **Ainda de fora (achados, não executados):**
  `usuarios_bloqueio` (moderação: decisão sobre expor a justificação do admin), `notifications` (tem `destino_ids`, não um
  endereço directo), Blobs `pedidos-pagos`/`pedidos-meta` (o `conta-delete` anonimiza-os), `notificacoes` por endereço (MC94.5),
  dados on-chain (públicos, declarados no `conta-delete`).

## Suíte
frontend **515/515** · backend **817/823** (+8), 0 falhas.

## Veredito SEG1: **VERDE**
