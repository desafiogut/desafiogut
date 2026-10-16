# UTAC110i.1b — SEG-1 (RE-MEDIÇÃO CURTA) — ISOLAR O HANG DO TESTE (c)

**Auto-contido.** Continuação do UTAC110i.1 (não é UTAC novo). Só se re-mede o que o enunciado
manda: o hang, o tempo real, a RAM do portão A14 e a comparação com o 106e. **Nada é alterado
neste segmento.** As restantes medições do SEG-1 do 110i.1 **não se repetem** (estão em
`_logs/UTAC110i.1_SEG-1_MEDICAO.md`).

Executor: Hermes (deepseek-v4-flash) · Data: 2026-10-16 · Baseline: `a8fe980` · HEAD medido: `a8fe980`

---

## -1.1 RAM — portão A14 (medido 3×, antes de arrancar)

```
[int]((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024)
938 · 939 · 939 MB
```

**DESVIO DECLARADO** (portão = ≥ 1 500 MB) — o **mesmo desvio herdado** do 110i/110i.1 (que mediu
973·973·974 MB e, no 110i, 591→108 MB em minutos nesta máquina de 5 877 MB). Decisão §3.2 da skill
`windows-memory-pressure`: correr **abaixo do limiar**, registar pico/mínimo, e **PARAR** se aparecer
falha inexplicada. RAM medida de novo **antes** da suíte no SEG2.

## -1.2 O hang — tempo REAL medido (teste (c) isolado)

Comando (script `seg1-repro-hang.sh`, fora do repo; `timeout --signal=KILL`):

```
node --test --test-concurrency=1 --test-name-pattern="flag DESLIGADA" \
  src/__tests__/utac110i1-front-billing.test.mjs
```

| leitura | resultado |
|---|---|
| duração até ao KILL | **90 s** (limite do instrumento) — o processo **não terminou** |
| linha do teste impressa | **NENHUMA** (nem ✔ nem ✖) |
| exit | 137 (KILL) |

⇒ **O hang não é de 40 s: é ≥ 90 s** (o enunciado media «não termina em 40s»). Não é infinito
*técnico*: o ramo nativo espera a transacção com `TIMEOUT_COMPRA_MS = 300 000` ms
(`src/lib/google-play-billing.js:67/207`) — o tecto teórico é **300 s**, muito acima de qualquer
limite razoável de instrumento.

## -1.3 O ficheiro INTEIRO, antes de qualquer correcção (limite 45 s)

```
✔ (a) Android com a flag ligada ⇒ encomenda na loja, ... valida e só depois se fecha (2499ms)
✔ (a) o fluxo nativo NUNCA chama os endpoints PIX
✔ (b) PWA com a flag ligada no Blob ⇒ PIX ... e ZERO peças do Billing
✔ (b) iOS com a flag ligada ⇒ PIX
✔ (b) Android nativo mas SEM o plugin nativo ⇒ PIX (fail-closed)
<KILL aos 45 s — o 6.º teste, (c), nunca imprime linha>
```

**DESVIO ao enunciado (declarado):** o enunciado diz «12/13 testes a passar». **Medido: 5 testes
completam-se** e o 6.º (o (c)) pendura — os 7 seguintes **nem chegam a correr**. «12/13» não é
reproduzível com este comando e este ficheiro. (Hipótese mais provável do número antigo: corrida
por `--test-name-pattern` test a test, com o (c) excluído.)

## -1.4 Porque é que o 106e corre em 6,6 s e este ficheiro pendura

**Medido (leitura do ficheiro + o duplo):** `src/pages/__tests__/utac106e-compra-passe.test.mjs`
**não** importa `src/lib/__tests__/_duplo-capacitor.mjs`, **não chama `ARRANCAR_ANDROID()`** e **não
tem alias para `@capacitor/core`** (a lista de aliases do 106e não o inclui). Logo, no 106e o
`@capacitor/core` REAL responde `getPlatform()==="web"` ⇒ **`billingDisponivel()` é `false`** ⇒ o
gate do hook **curto-circuita sempre** e o ramo nativo nunca é considerado — com ou sem a flag.

O 106e **não consegue** portanto exercitar a segunda condição do gate. É essa a razão de ele correr
em 6,6 s: nunca entra no Billing. (E é também a razão de ele **não apanhar** o defeito que este UTAC
isola — ver `UTAC110i.1b_SEG0_FRENTE-A-DIAGNOSTICO.md` §0.4.)

## -1.5 Veredito

**HANG REPRODUZIDO** (≥ 90 s, sem linha de teste) + **RAM medida** (938·939·939 MB — desvio
declarado) + **razão do 106e explicada por medição**. Segue para o SEG0 (diagnóstico), que é onde a
causa é isolada.
