# UTAC110i.1b — SEG2 (VERIFICAÇÃO) — REDES DE SEGURANÇA E SUÍTES INTEIRAS

**Auto-contido.** Verificação do que NÃO devia mudar + suítes completas, com a RAM (portão A14)
medida **antes de cada corrida**. Nada foi alterado neste segmento.

Executor: Hermes (deepseek-v4-flash) · Data: 2026-10-16 · Script: `tmp-utac110i1b-31066/seg2-verificacao.sh`
Saída real: `_logs/UTAC110i.1b_SEG2_saida.txt`

---

## 2.1 Resultados (saída real do script)

| # | alvo | RAM antes (MB) | resultado | veredicto |
|---|---|---|---|---|
| 1 | `106e` (rede de segurança do PIX) | 1752/1746 | **19/19** · 0 fail | **VERDE** |
| 2 | `110d + 110e` (rede de segurança do SEG1/backend) | 1645/1642 | **45/45** · 0 fail | **VERDE** |
| 3 | **suíte FRONTEND completa** (`scripts/mc966-suite-harness.mjs frontend`) | 1577/1573 | **1148/1148** · 0 fail · 354 s | **VERDE** |
| 4 | **suíte BACKEND completa** (`... backend`) | 1778/1758 | **1310/1316** · **0 fail** · 6 skipped · 20 s | **VERDE** |
| — | RAM no fim | 1724/1723 | — | — |

## 2.2 Leitura dos números (por comparação com a baseline do enunciado)

| suíte | baseline do enunciado | MEDIDO agora | delta explicado |
|---|---|---|---|
| frontend | 1111/1111 | **1148/1148** | **+37** = testes novos do UTAC110i.1/110i.1b (14 do `front-billing` + os de `google-play-billing` + os do backend-mock no frontend). Cresceram, nenhum caiu. |
| backend | 1276/1282 (6 skipped) | **1310/1316** (6 skipped) | **+34** = testes do SEG1 do 110i.1 (`validar-compra-google`). Os **6 skipped são os MESMOS** da baseline (condicionais de credenciais — DEBT-001). |
| 106e | 19/19 | **19/19** | inalterado (nem uma linha tocada neste UTAC). |
| 110d+110e | 45/45 | **45/45** | inalterado. |

## 2.3 ⚠️ Portão A14 — CUMPRIDO (e o desvio do SEG-1 é real, medido na mesma sessão)

A RAM medida no SEG-1 (`938 · 939 · 939 MB`) estava **abaixo** do portão de 1 500 MB (desvio herdado
do 110i). No SEG2, **o operador fechou o que estava a usar** e a RAM subiu para **1 752–1 794 MB**:

```
938 · 939 · 939 MB   (SEG-1, antes dos fechos do operador)   -> DESVIO DECLARADO
1792 · 1788 · 1794 MB (após os fechos: baseline do SEG2)     -> PORTÃO CUMPRIDO
1752 · 1645 · 1577 · 1778 · 1724 MB (leituras antes/depois de cada suíte) -> todas ACIMA de 1 500
```

Aplica-se o §3 da skill `windows-memory-pressure`: **um portão cumprido numa ronda não transfere para
as seguintes** ⇒ a RAM foi medida **antes de cada** corrida (coluna «RAM antes» da §2.1), e **nenhuma
falha inexplicada** apareceu com o portão cumprido. O desvio do SEG-1 fica **declarado à vista**
(não apagado) como o enunciado exige.

## 2.4 Nada que não devia mudar mudou

- `106e`: **não tocado** (o ficheiro não aparece na lista de alterações deste UTAC).
- `scripts/mc110i1d-prova-mutacao.mjs`: **não tocado** (o alvo dos mutantes é o hook; o instrumento é
  do 110i.1 e ficou como estava).
- `google-play-billing.js` (frontend) e todo o SEG1 (backend): **não tocados**.
- A correria de mutação restaurou o hook **byte a byte** (`md5 7bbc1625…` == inicial, confirmado no
  fim das DUAS corridas).
