# UTAC136 — SEG0 (aplicação) + SEG1 (verificação)

Commit `9936e9e` (base `f08b572`). Ficheiros de produção: `_lib/comprar-passe-tipado.mjs`, `_lib/passe-pontos.mjs`,
`_lib/eco-quildo.mjs`, `_lib/fontes-lance.mjs`, `_lib/conversao-eco-passe.mjs` (novo), `registar-palpite.mjs`,
`creditar-eco-quildo.mjs`. Zero ficheiros em `src/`.

## Frente A — Passe sem +200 pontos de lance (Art. 6º)
- Saiu da cadeia `creditarBeneficios` / `completarPendentes` / `estadoDaCompra` / `desfazerCompra` todo o passo de pontos de lance.
  O PIX e o Google Play partilham a cadeia, logo os dois caminhos ficam cobertos.
- A resposta do Relâmpago deixa de ter `pontosLance`; mantém `creditosLance: 0` (legado). Medido: o cliente v9 não lê `pontosLance` da compra.
- `PONTOS_LANCE_POR_PASSE_RELAMPAGO` continua em `ledger-lance.mjs` (registo + guarda do frontend), sem chamadores de produção na compra.

## Frente B — fidelidade 1 por Passe (Art. 7º) e palpite gratuito
- `PONTOS_FIDELIDADE_POR_PASSE` 10 → 1 (não retroactivo).
- `registar-palpite.mjs`: sem `consumirPasse`/`devolverPasse`; o import do inventário saiu.
- Limite declarado: `quantidadeJaCreditada` lê compras antigas a meio (10 pontos) como 10 Passes. Medido em produção: 0 compras a meio.

## Frente C — ECOQUILDO R$ 0,50 (Art. 21º) e conversão 50 → 1 Passe (Art. 23º)
- `CENTAVOS_POR_ECOQUILDO` 100 → 50; a reserva é sempre derivada.
- `_lib/conversao-eco-passe.mjs`: débito idempotente `eco-conversao:<k>` (CAS) → lastro «usado» 50 → +1 ponto (mesma ref) → +1 Passe
  Programado (RPC sem ref, por isso é o último). Falha ⇒ desfaz pela ordem inversa. Crash entre passos = limite declarado.
- Chamada após cada emissão: compra de Passe (`garantirEcoDoPasse`), indicação (import preguiçoso, para não alterar o grafo do lance)
  e crédito de admin. Fail-soft: uma falha da conversão não desfaz o crédito; o saldo converte-se no próximo crédito.
- O COMMENT SQL da coluna `reserva_rs_centavos` ainda diz R$ 1,00: alterá-lo é DDL (fora do âmbito).

## SEG1 — verificação
| Medida | Resultado |
|---|---|
| Suíte backend (harness) | **VERDE 1471/1477** (6 skipped pré-existentes; baseline 1456/1462 + 15 testes novos) — `_logs/UTAC136_SUITE_saida.txt` |
| Testes novos | `utac136-conversao-eco-passe` 11 · `utac136-palpite-gratis` 3 · +1 no `utac110h2` (indicação converte) |
| Testes antigos invertidos | 110d, 110e, 110i1, 110n, 120, 129-A5: as asserções da regra antiga ficaram no nome/comentário |
| Mutação | **12/12 RED**, md5 restaurado idêntico — `_logs/UTAC136_MUTACAO_saida.txt` (o M11 sobrevivia na 1.ª corrida: fechado com o teste da indicação) |
| Concorrência (T4) | 10 conversões simultâneas sobre 100 ECOQUILDO ⇒ exactamente 2 Passes e 2 pontos |
| Frontend | o teste de guarda `src/__tests__/utac110j5-pontos-lance.test.mjs` «P» fica **VERMELHO de propósito**: o v9 mostra 10 pontos por Passe e o backend dá 1. `src/` está fora do âmbito; resolve-se no UTAC do AAB v10. O build do Netlify (`vite build`) não corre testes. |
| RAM (A14) | 469 → 987 MB depois de fechar Edge/WebView2/WhatsApp/OneDrive (R18-136-5: o operador mandou fechar; os 1 500 MB não são alcançáveis numa máquina de 5,9 GB sem fechar as sessões do Claude) |
| Achado de regressão | a 1.ª suíte completa deu 29 falhas: o import estático da conversão no `fontes-lance` puxava `passe-pontos` para o grafo do lance (os testes do lance simulam `edicoes-core` sem `EDICAO_ID_RE`). Corrigido com import preguiçoso. |
