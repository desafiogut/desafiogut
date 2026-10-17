# Saldo DeepSeek — leituras para medir custo por DELTA

> Porquê: `state.db` mente nos dois sentidos (memória do operador). A verdade é o **delta de saldo**
> entre o início e o fim de cada UTAC. Este ficheiro é append-only: uma linha por leitura.
> Endpoint: `GET https://api.deepseek.com/user/balance` (chave em `~/AppData/Local/hermes/.env`).

| Data/hora (local) | total USD | granted | topped_up | Contexto |
|---|---|---|---|---|
| 2026-10-17 01:54 | **5.61** | 4.48 | 1.13 | baseline antes do UTAC110k / fecho do 110j.1 · 110j e 110j.1 **não medidos** (3 UTACs sem leitura) |
| 2026-10-17 02:52 | 5.34 | 4.20 | 1.13 | fecho do UTAC110k.1 · **delta = 0.27 USD** vs baseline (cobre o fim do 110k + todo o 110k.1; **110j e 110j.1 ficam antes da baseline e não medidos**) |
