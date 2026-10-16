# UTAC110i.1b — SEG0 (FRENTE A) — DIAGNÓSTICO DO HANG (causa MEDIDA, não presumida)

**Auto-contido.** Frente única deste UTAC: isolar o hang do teste (c). Ficheiro alterado:
`src/hooks/useComprarPasse.js` (autorizado, **depois** de a medição provar que o defeito é de código).

Executor: Hermes (deepseek-v4-flash) · Data: 2026-10-16 · Baseline `a8fe980`

---

## 0.1 AS CINCO HIPÓTESES DO ENUNCIADO — testadas uma a uma

| # | hipótese | veredicto MEDIDO |
|---|---|---|
| 1 | «Remover o `beforeEach` do Billing → o ramo PIX corre?» | **NÃO é a causa.** O `beforeEach` (110i.1-front-billing.test.mjs:87-98) faz 4 reposições de estado de módulo+duplos; **nenhuma** toca na escolha do ramo. Removê-lo não muda nada: o ramo é decidido por `isPagamentoNativoAtivo`/`billingDisponivel()` dentro do hook. |
| 2 | «Remover o import do `google-play-billing.js` → o ramo PIX corre?» | **CONFUNDE CAUSA COM SINTOMA.** O import é estático (`useComprarPasse.js:42`) e não executa I/O (o `import()` do plugin nativo é dinâmico e só corre no ramo nativo). Removê-lo «resolveria» o hang apenas porque **tira o ramo nativo** — não porque seja a causa. |
| 3 | «Correr o teste (c) num ficheiro isolado → pendura?» | **SIM — mas em QUALQUER ficheiro.** Medido com `--test-name-pattern` (ficheiro inteiro): pendura ≥ 90 s. A causa não é a posição do teste no ficheiro. |
| 4 | «Há `setTimeout`/promise não resolvida?» | **SIM — e é o SINTOMA, não a causa.** `google-play-billing.js:204-214`: a promise `aprovada` fica pendente; o `setTimeout(..., TIMEOUT_COMPRA_MS = 300 000)` (`:67/:207`) é o que transforma «espera a loja» em 300 s de pendura. |
| 5 | «Há módulo a tocar `window.console` (SSR)?» | **NÃO.** O único módulo que toca `window.console` no topo é o `capacitor-plugin-cdv-purchase` (documentado em `google-play-billing.js:19-22`) — e é por isso que ele é importado **dinamicamente**. Nunca é importado no ramo PIX. Provado pelos ramos (b)/(c) correrem sem tocar no plugin. |

## 0.2 A MEDIÇÃO QUE ISOLA A CAUSA (sonda do ramo — ficheiro REAL, duplos do teste)

`tmp-utac110i1b-31066/sonda-ramo.mjs` monta o hook **REAL** pelo Vite com os **mesmos duplos** do
teste e observa os três sinais decisivos (loja tocada / URL de rede / se `comprar()` resolve).

**ANTES da correcção (estado herdado do 110i.1):**

```
=== CENA DO TESTE (c): flag DESLIGADA + Android nativo ===
  recursos:               {"isPagamentoNativoAtivo":false,"plataforma":"android"}
  billingDisponivel():    true
  LOJA tocada (order):    1   register: 1   initialize: 1      <-- o RAMO NATIVO foi tomado
  rede (0):        (nenhuma)                                   <-- o PIX NÃO foi chamado
  comprar() ->            <<NAO RESOLVEU em 4s>>               <-- pendura (300 s no tecto real)
  decorrido:              4013 ms
```

**A causa está isolada:** com a flag **DESLIGADA** e Android nativo, o hook **entra no ramo do
Google Play Billing** (a loja é registada, inicializada e encomendada) e **não** chama o endpoint
PIX. O teste (c) — que exige PIX — fica à espera da transacção que ninguém vai aprovar.

## 0.3 CAUSA RAIZ (ficheiro:linha) — o gate perdeu a primeira condição

`src/hooks/useComprarPasse.js:135`, **antes**:

```js
if (billingDisponivel()) return await comprarNativo(tipo);            // <-- só a 2.ª condição
```

O **contrato declarado** do MESMO UTAC exige as DUAS condições (cabeçalho do ficheiro, l. 9-14;
`_logs/UTAC110i.1_SEG2_FRENTE-D.md` §2.2):

```js
if (isPagamentoNativoAtivo === true && billingDisponivel()) return await comprarNativo(tipo);
```

⚠️ `isPagamentoNativoAtivo` **estava desestruturado** (l. 68) e **no array de dependências**
(l. 167) mas **nunca lido** — sinal inequívoco de que a condição foi perdida do `if`.

**O estado do ficheiro é, byte a byte, o MUTANTE D3 do próprio instrumento de mutação.**
`scripts/mc110i1d-prova-mutacao.mjs:38-40` define:

```
D3  a bifurcação ignora a flag (o APK actual deixava o PIX)
    de:  if (isPagamentoNativoAtivo === true && billingDisponivel()) return await comprarNativo(tipo);
    para:if (billingDisponivel()) return await comprarNativo(tipo);
```

ou seja: **o ficheiro estava exactamente no estado em que o mutante D3 o deixa** — uma mutação
**não restaurada**. Prova documental: o md5 medido do ficheiro antes da correcção,
`a2cd84465231f4c8c1e427018c7c49e5`, é **exactamente** o `md5 inicial` que o instrumento registou na
sua corrida abortada (`_logs/UTAC110i.1_SEG2_MUTACAO.txt:2`). (Qual das duas histórias produziu isso
— instrumento morto a meio de D3, ou edição manual com a mesma omissão — **não se distingue pelos
dados**; ambas declaram o mesmo estado. O que se mede, e basta, é o estado.)

## 0.4 PORQUE É QUE NINGUÉM APANHOU ISTO (o falso verde do SEG2 do 110i.1)

1. **A prova de mutação do 110i.1 NUNCA CORREU.** `_logs/UTAC110i.1_SEG2_MUTACAO.txt` (5 linhas)
   mostra o instrumento a **ABORTAR no baseline**:
   `ABORTA (exit 2): baseline não está verde -> null/null, fail null`. O baseline é corrido com o
   ficheiro **inteiro** (110i.1 + 106e); como o (c) pendura, o `node --test` **não imprime o resumo**
   (`tests/pass/fail` = `null`) e o instrumento **aborta antes do 1.º mutante**.
   ⇒ A afirmação «prova de mutação FEITO» e «9/9 mutantes RED» do SEG2 do 110i.1 **é FALSA como
   medição**: nenhum mutante chegou a ser medido. Não se declara verde o que não correu.
2. **A rede de segurança do 106e não cobre este gate** (§-1.4): sem `ARRANCAR_ANDROID()`, o
   `@capacitor/core` real diz `web` ⇒ `billingDisponivel()` é `false` ⇒ o ramo nativo nunca é
   considerado. O 106e passa com o mutante D3 **e** sem ele — é cego a esta condição.
3. Resultado: com o ficheiro já mutado, o único teste que morde (o (c)) pendura, o instrumento
   aborta e o ciclo fecha-se em falso verde.

## 0.5 O DEFEITO É DE CÓDIGO (não de teste) — como se prova

- O teste (c) exige **exactamente** o contrato declarado pelo UTAC («flag DESLIGADA ⇒ PIX, mesmo em
  Android nativo»): `_logs/UTAC110i.1_SEG2_FRENTE-D.md` §2.2 e o cabeçalho do próprio hook.
- O teste (c) está **correcto**: a sonda de §0.2 mostra que, com a condição reposta, ele passa.
- **A/B PAREADO (E8) no MESMO ficheiro, mudando SÓ a linha 135:**

| cena (sonda do ramo) | loja tocada | rede | `comprar()` | veredicto |
|---|---|---|---|---|
| flag OFF + Android — **antes** | `order:1 register:1 initialize:1` | **0 chamadas** | não resolve (≥4 s; real ≥90 s) | **DEFEITO** |
| flag OFF + Android — **depois** | `0 / 0 / 0` | `comprar-passe-relampago` | `ok:true` em **4 ms** | corrigido |
| flag ON + Android (controlo) | `order:1` | 0 | não resolve (espera o utilizador — correcto) | inalterado |
| flag OFF + PWA (controlo) | `0` | `comprar-passe-relampago` | `ok:true` em 32 ms | inalterado |

- Teste (c) isolado: **pendura ≥ 90 s (KILL) → PASSA em 1 635 ms**.
- Ficheiro inteiro: **5 ✔ e pendura → 13/13 VERDE em 2,6 s**.

⇒ o diagnóstico está feito, a correcção é a reposição da condição perdida (1 linha) e **não** toca
em mais nada: o fluxo PIX, o 106e, os endpoints e o `google-play-billing.js` ficam intactos.

## 0.6 Alteração aplicada (autorizada: «o defeito é de código, provado com medição»)

```diff
-      if (billingDisponivel()) return await comprarNativo(tipo);
+      if (isPagamentoNativoAtivo === true && billingDisponivel()) return await comprarNativo(tipo);
```

md5 antes `a2cd84465231f4c8c1e427018c7c49e5` → depois `7bbc1625ac7077b263b2298c7768ee94`.

**Duas notas de honestidade:**
1. **Não há impacto em PRODUÇÃO:** a bifurcação do 110i.1 está **não commitada** (o `HEAD a8fe980`
   tem o hook do 106e, só PIX). O defeito era um risco **no ramo de trabalho**, não no que está no ar.
2. A correcção **repõe o contrato declarado** — não introduz decisão nova (o gate já estava escrito e
   documentado no SEG2 do 110i.1).
