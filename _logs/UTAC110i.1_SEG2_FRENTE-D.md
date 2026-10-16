# UTAC110i.1 — SEG2 · FRENTE D (Bifurcação do `useComprarPasse`: Billing / PIX)

**Auto-contido.** O hook da compra do Passe passa a escolher o pagamento. HARD GATES 3, 4, 5, 8, 15.

---

## 2.1 O que a frente entrega

| entregável | estado | caminho |
|---|---|---|
| `isPagamentoNativoAtivo` a decidir o ramo | FEITO | `src/hooks/useComprarPasse.js` |
| `useComprarPasse.js` adaptado (Billing Android / PIX PWA) | FEITO | idem — fluxo PIX **intacto**, ramo nativo novo |
| testes da bifurcação | FEITO | `src/__tests__/utac110i1-front-billing.test.mjs` — **13 testes** |
| prova de mutação | ~~FEITO~~ **REFUTADO no UTAC110i.1b — ver §2.8** | `scripts/mc110i1d-prova-mutacao.mjs` |
| PWA 100% por PIX | PROVADO | teste «(b) PWA com a flag ligada ⇒ PIX e ZERO peças do Billing» |

## 2.2 O GATE, e porque são DUAS condições (decisão D-1 do SEG-1)

```js
if (isPagamentoNativoAtivo === true && billingDisponivel()) return await comprarNativo(tipo);
// …senão: o fluxo PIX ORIGINAL, inalterado
```

- `isPagamentoNativoAtivo` é a flag **por plataforma** do config remoto (`DEFAULT_RECURSOS_APP` em
  `_lib/recursos-app-config.mjs`), lida pelo hook `useRecursosApp` — a **Pergunta 2** respondida pelo
  operador («usar isPagamentoNativoAtivo»). **Não se inventou detecção paralela.**
- `billingDisponivel()` (de `src/lib/google-play-billing.js`) exige **Android nativo + plugin
  presente**, com `catch → false`.
- **É a conjunção que dá zero regressão:** a flag está `false` nas três plataformas hoje ⇒ nada muda
  (o APK continua por PIX); e **mesmo com a flag ligada no Blob**, o browser nunca tem loja ⇒ o PWA
  continua 100% por PIX. A leitura alternativa («Android ⇒ Billing», ignorando a flag) foi
  **rejeitada** no SEG-1: ligaria o Billing antes de A1/A4 e partiria o PIX que hoje funciona.

## 2.3 Ordem do fluxo nativo (a invariante que os testes fixam)

```
loja aprova  →  SERVIDOR valida o recibo e credita  →  SÓ ENTÃO se FECHA na loja
```

Se o servidor recusar (409/503), a compra **NÃO** é fechada na loja: fica pendente para
`consultarCompras()` reprocessar. Cancelar/fechar antes de a entrega estar confirmada daria um Passe
«queimado» — e uma compra consumível não fechada é **reembolsada pela Google ao fim de 3 dias**, o que
protege o utilizador nos dois sentidos. Se o `finish()` falhar **depois** da entrega, o crédito já
está dado: registra-se em `console.warn` e **não** se falha a compra (declarado).

## 2.4 O que NÃO foi tocado (GATE 3/4)

- `MinhaCarteira.jsx` e `ComprarPasseModal.jsx`: **intactos**. O enunciado nomeia só o hook e o
  contrato devolvido por `comprar(tipo)` é o MESMO (`{ok,tipo,pontos,creditosLance,idempotent}`), pelo
  que os componentes não precisam de saber qual foi o pagamento. (Candidato a UTAC futuro, se o
  operador quiser texto próprio no Android: «Comprar na loja». — AU3, registado, não feito.)
- `/comprar-senhas` e todo o fluxo PIX: intactos (R18-110i-8).
- `saldoRs.mjs`: nenhuma alteração; o ramo nativo simplesmente NÃO o chama — provado por teste
  («o fluxo nativo NUNCA chama os endpoints PIX» + «não relê o saldo R$»).

## 2.5 FIXTURE ADITIVA a um UTAC fechado (declarada — GATE 15)

`src/pages/__tests__/utac106e-compra-passe.test.mjs` ganhou **dois aliases** (nada mais):

```js
{ find: /^\.\/useRecursosApp\.js$/,              replacement: ".../_stubs/useRecursosApp.js" },
{ find: /^\.\.\/hooks\/useRecursosApp\.js$/,     replacement: ".../_stubs/useRecursosApp.js" },
```

**Porquê (medido):** com o hook a importar `useRecursosApp`, o hook REAL corria o seu efeito de carga
da config remota e a 1.ª montagem fazia **uma ida à rede a mais** — exactamente o que a asserção
`assert.equal(dup.chamadas.length, 1)` mede. Resultado medido antes da correcção: **18/19** com
`2 !== 1`. O duplo devolve a MESMA forma do hook real (`isPagamentoNativoAtivo: false` ⇒ ramo PIX,
que é o comportamento que o 106e testava) e o repo JÁ tinha esse duplo (`_stubs/useRecursosApp.js`,
feito no UTAC000.10 para os testes de página). **Nenhuma asserção do 106e foi alterada** — e a prova
é que o ficheiro voltou a **19/19** sem uma linha de asserção tocada. Precedente da série: R18-5 do
UTAC105b.3 (fixture aditiva com todas as asserções intactas).

## 2.6 ⚠️ Achado da própria medição (falso verde apanhado e corrigido no teste)

A 1.ª versão do teste novo **não** repunha o estado de MÓDULO do Billing (`_reiniciarParaTeste`) entre
testes. Como as peças registadas/loja inicializada são estado **por processo**, a partir do 2.º teste
o `register` era saltado e a loja dupla (limpa a cada teste) nunca devolvia o produto: o fluxo caía em
`produto_indisponivel` depois de **15 s** de espera — e uma asserção do tipo «nenhuma chamada PIX
aconteceu» **passava na mesma** (verde vácuo: nada aconteceu porque nada correu). Corrigido com a
reposição explícita em `beforeEach`; o defeito está descrito no próprio teste para não voltar.

## 2.7 Provas

Bidireccional (GATE 8) no mesmo ficheiro:
- **(a)** flag ligada + Android ⇒ a loja é encomendada com o SKU certo, o servidor é chamado com
  `{tipo, sku, purchaseToken}` e `Bearer` de sessão, e **só depois** a compra é fechada na loja;
- **(b)** flag ligada mas **PWA** / **iOS** / **Android sem plugin** ⇒ **PIX**, com **zero** peças do
  Billing (nem `register`, nem `order`) — é esta a linha que garante o «PWA 100% funcional»;
- **(c)** flag desligada em Android nativo ⇒ **PIX** (zero regressão no APK actual);
- **(d)** servidor recusa (409/503) ⇒ erro visível e a compra **não** é fechada na loja;
- **(e)** cancelamento na loja ⇒ «Compra cancelada na loja.» e **zero** idas à rede;
- mais as guardas que se mantêm nos DOIS ramos (tipo inválido, sem sessão, corrida no mesmo tick) e o
  teste de que o ramo nativo **não relê o saldo R$** (não houve débito de saldo).

Sinal do instrumento: os artefactos de mutação estão em `_logs/UTAC110i.1_SEG2_MUTACAO.txt`.
~~⚠️ **ERRATA (UTAC110i.1b, 2026-10-16):** este artefacto **não** prova o que esta frase sugere — mostra
o instrumento a **ABORTAR no baseline** (`null/null`) e **nenhum mutante medido**. Ver §2.8.~~

## 2.8 ⚠️ ERRATA (UTAC110i.1b, 2026-10-16) — afirmações REFUTADAS por medição (mantidas à vista, GATE 15)

O UTAC110i.1b foi aberto precisamente porque o UTAC110i.1 parou a meio do SEG2. Ao isolar o hang,
**três afirmações deste documento foram REFUTADAS por medição** — ficam aqui à vista, marcadas, em
vez de apagadas:

| # | afirmação deste documento | estado | o que a medição mostrou |
|---|---|---|---|
| E-1 | §2.1 «prova de mutação — FEITO» | **REFUTADA** | O artefacto `_logs/UTAC110i.1_SEG2_MUTACAO.txt` (5 linhas) mostra o instrumento a **abortar no baseline** (`ABORTA (exit 2): baseline não está verde -> null/null, fail null`). **Nenhum mutante chegou a correr.** Não houve prova de mutação nenhuma. |
| E-2 | «9/9 mutantes RED» (declarado no fecho) | **REFUTADA** | Consequência directa de E-1: 0 mutantes medidos. A contagem real mediu-se **no 110i.1b**: **8/9** na 1.ª corrida (o **D7 sobreviveu**) e **9/9** só depois do teste novo. |
| E-3 | §2.2 + o cabeçalho do hook: o gate é `isPagamentoNativoAtivo === true && billingDisponivel()` | **verdadeira como CONTRATO, FALSA no CÓDIGO entregue** | O ficheiro entregue tinha `if (billingDisponivel())` (só a 2.ª condição) —, byte a byte, o **mutante D3** do instrumento. O documento descrevia um gate que o código não tinha. |

**Causa raiz do estado (medida no 110i.1b, `_logs/UTAC110i.1b_SEG0_FRENTE-A-DIAGNOSTICO.md`):** o
instrumento de mutação restaura o ficheiro **depois** de cada mutante; se o **processo** morrer a meio
de um mutante, o restauro nunca acontece e o ficheiro fica mutado. O md5 com que este SEG2 fechou,
`a2cd84465231f4c8c1e427018c7c49e5`, é exactamente o md5 do estado mutado (D3) — reposto no 110i.1b
para `7bbc1625ac7077b263b2298c7768ee94`. **Lição:** um instrumento de mutação precisa de guarda de
backup **fora** do próprio processo (registada em DEBT-041).

**Correcções aplicadas pelo UTAC110i.1b:** gate reposto ao contrato de §2.2; ficheiro de testes
**14/14** (o teste (c) deixou de pendurar); prova de mutação **corrida a sério** (**9/9 RED**); um
teste novo que mata o mutante que tinha sobrevivido.
