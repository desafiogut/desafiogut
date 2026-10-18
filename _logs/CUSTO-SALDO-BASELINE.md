# Saldo DeepSeek — leituras para medir custo por DELTA

> Porquê: `state.db` mente nos dois sentidos (memória do operador). A verdade é o **delta de saldo**
> entre o início e o fim de cada UTAC. Este ficheiro é append-only: uma linha por leitura.
> Endpoint: `GET https://api.deepseek.com/user/balance` (chave em `~/AppData/Local/hermes/.env`).

| Data/hora (local) | total USD | granted | topped_up | Contexto |
|---|---|---|---|---|
| 2026-10-17 01:54 | **5.61** | 4.48 | 1.13 | baseline antes do UTAC110k / fecho do 110j.1 · 110j e 110j.1 **não medidos** (3 UTACs sem leitura) |
| 2026-10-17 02:52 | 5.34 | 4.20 | 1.13 | fecho do UTAC110k.1 · **delta = 0.27 USD** vs baseline (cobre o fim do 110k + todo o 110k.1; **110j e 110j.1 ficam antes da baseline e não medidos**) |
| 2026-10-17 03:48 | 5.15 | 4.01 | 1.13 | fecho do UTAC110j.2 · **delta = 0.19 USD** vs baseline do 110k.1 (5.34) |
| 2026-10-18 15:40 | 2.36 | 1.22 | 1.13 | fecho do UTAC110n · **delta da sessão = 0.38 USD** (1.ª leitura desta sessão 2.74) · **desde o último registo (5.15, 110j.2) = 2.79 USD**, mas cobre também 110i.2, 110j.4b, 110m.2 e 110l, que não foram medidos |
| 2026-10-18 16:35 | **2.21** | 1.07 | 1.13 | fecho do **UTAC110n.1** (8 decisões do operador) · **delta desta ronda = 0.15 USD** vs fecho do 110n (2.36) · os 0.38 USD do UTAC110n ficam registados na linha acima, como o operador pediu (não se somam duas vezes) |
