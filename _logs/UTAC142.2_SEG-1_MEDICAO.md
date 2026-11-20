# UTAC142.2 · SEG-1 — MEDIÇÃO E DECISÕES

Executor: Claude Code (Opus 5.5) · 2026-11-20 · baseline `4961aa8` (produção real `6affd3ec`, ℹ️9 do validador).

## Decisões do operador (R18-142.2)
- **R18-142.2-A** «pode aplicar os patches e publicar»: os patches do validador (`e5ef05a`, `99d467e`), aplicados por fast-forward. O código é o do validador; o executor não o alterou (regra do Ramon).
- **R18-142.2-B** «reduza o nome também» (ℹ️6 do SEG4): o Top 10 público e o vencedor passam a «PrimeiroNome I.». Era o nome completo aparado a 80; o teste utac138-seg4 V-B1 foi actualizado com o motivo.

## Medição
- `_lib/apuracao-especial.mjs#nomePublico` publicava o nome completo (≤ 80, sem «@»). Passa a `formatarNome` (o mesmo da tabela ao vivo), que também cobre os lances antigos já gravados com o nome cru.
- `lance-relampago.mjs` guardava `body.nomeExibicao` cru (até 80) no Key-Per-Bid, na idempotência e na resposta (pode ser e-mail). Passa a `formatarNome` na origem: minimização (LGPD).
- Ainda não existe resultado gravado da ESPECIAL-RELAMPAGO1 (fecha a 30/11), logo nada publicado precisa de correcção.

## Ressalvas do SEG4 que este UTAC NÃO trata (ficam para decisão/UTAC próprio)
ℹ️3 contagem dupla rara com 503 do Blobs (contar por lanceId) · ℹ️5 nome escolhido pelo cliente (não verificado no servidor)
· ℹ️7 o frontend não mostra o consumo do Passe · ℹ️8 CLS do esqueleto não medido · ℹ️11 assimetrias de portador
· ℹ️13 mutantes sem teste (V1, V4, D1, D2, mapa do ChatbotWidget).

## Mutação
P1 (apuração volta ao nome completo) RED 2 · P2 (origem volta ao nome cru) RED 1 · md5 restaurado.

## Veredicto
SEGUIR.

## Suíte canónica (A14: 1585 MB livres antes)
`backend VERDE 1557/1563` · `frontend VERMELHO 2`. As 2 falhas medidas são `mc9952-seguranca-gate` (f) e (g), testes de DNS
que dependem de `exemplo.com` resolver; hoje dá `ENOTFOUND` (`dns.lookup`). Ficheiro não tocado pelo UTAC141/142/142.1/142.2.
É o mesmo ℹ️12 do validador (HI: ambiente, não código).
