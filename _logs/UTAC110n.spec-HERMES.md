# UTAC110n (para o Hermes) — O LANCE PASSA A SER FEITO COM PONTOS DE LANCE GRATUITOS

Nome confirmado pelo operador: **UTAC110n** (R18-110j.4b-9; o 110m.3 é o GUTO).
Origem: `_logs/UTAC110j.4b_SEG-1_DIAGNOSTICO.md` (diagnóstico + R18-110j.4b-1..5).
Objectivo do operador: afastar o app da lógica «pagar pela possibilidade de ganhar». Os pontos de lance são dados
de graça pelo app (Art. 16º) e servem para licitar no Menor Lance Único; o Passe Relâmpago (R$ 2,00) é um produto
e um ACELERADOR, nunca condição para licitar.

## Estado actual (medido no 110j.4b)
- `lance-relampago.mjs` consome **1 crédito de lance** por lance (UTAC110d, R18-110d-2); sem crédito → 400 `sem_creditos_lance`.
- O crédito só vem de `comprar-passe-relampago` (R$ 2,00, `_lib/comprar-passe-tipado.mjs`). Os `pontos_lance` só se ganham; nada os consome.
- Fontes ligadas (`_lib/fontes-lance.mjs`): login +5/dia, missão «1.º lance do dia» +10/dia, indicação +50.
- Bónus de 5 acertos: `_lib/pontuacao-store.mjs` → `senhas_a_creditar` + fila `creditar-senhas-bonus` →
  `_lib/worker-bonus.mjs` → `adicionarSenhas` on-chain (flag `BONUS_EMISSAO_ATIVA`, hoje dry-run).
- `_lib/ledger-lance.mjs:36` já aceita o motivo `"sequencia"`; ninguém o usa.

## Frentes (valores decididos pelo operador)
- **A — o lance gasta pontos (R18-2):** `lance-relampago.mjs` debita `pontos_lance` = valor do lance (centavos = pontos),
  por CAS, idempotente pela chave do lance; saldo insuficiente → 400 (código novo); devolução integral se a
  blindagem/persistência falhar. Deixa de exigir crédito.
  **Decidido (R18-10):** o lance gasta os pontos; o vencedor paga o produto em R$ por PIX pelo valor do lance
  (Art. 18º/19º) — não é cobrança dupla. Confirmação em **DEBT-072**; dívidas ligadas: **DEBT-073**, **DEBT-074**.
- **B — Passe Relâmpago (R18-3):** `comprar-passe-tipado.mjs` mantém 10 pontos de fidelidade + ECOQUILDO e passa a
  creditar **+200 pontos de lance** (motivo novo para o Art. 16º VI, ex. `"passe-relampago"` em `MOTIVOS_PONTOS_LANCE`),
  com a mesma `ref` da compra e desfeito no rollback.
  **Créditos já existentes (R18-6):** converter 1 crédito = 200 pontos de lance (migração idempotente, entrada no
  `historico_lance`) — **DEBT-071**.
- **C — bónus de 5 acertos (R18-4):** `pontuacao-store.mjs`/`worker-bonus.mjs`: `creditarPontosLance(endereco, 50,
  "sequencia", ref-por-ciclo)` em vez de senhas; deixa de enfileirar `creditar-senhas-bonus` (worker on-chain sem
  produtor; não apagar). Manter «1 bónus por ciclo» e a regra anti-cumulativa do MC93-C.
- **D — ciclo de missões = 200 pontos (R18-5):** em `fontes-lance.mjs`, definir os dias/valores (sugestões do operador:
  20 dias × 10 pts ou 14 dias × 15 pts) somando as fontes diárias existentes; alcançável de graça.
- **E — ranking de pontos de lance (R18-7):** endpoint novo, ordenado pelo **saldo actual** de `pontos_lance`,
  endereços **mascarados** como no `/ranking` actual.
- **F — Regulamento Art. 17º (R18-8):** «1 crédito de lance» → «200 pontos de lance» (extensão do 110m.2 ou UTAC
  próprio), propagado aos 3 ficheiros da invariante (v5, GUTO, `guto-regulamento.mjs`) e ao gate se citar o artigo.

## Depois (frontend, Opus)
CardLance (validar o valor contra o saldo; mensagens), Carteira (créditos → pontos), Meus Ativos (bónus de 5
acertos em pontos; ranking por saldo), copy do Passe («+200 pontos de lance»), GUTO.
Já feito pelo Opus (110j.4b): o painel «Seus pontos de lance» (progresso PESSOAL) em Meus Ativos.

## Riscos a medir
Farming de pontos gratuitos (contas múltiplas: sybil-check/fingerprint existentes); Art. 17º do v5.1; ficha/Data
Safety da Play (o lance deixa de estar ligado a pagamento: declarar).
