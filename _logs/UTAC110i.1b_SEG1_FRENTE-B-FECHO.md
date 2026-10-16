# UTAC110i.1b — SEG1 (FRENTE B) — FECHAR A FRENTE D (13/13 → 14/14 e mutação 9/9)

**Auto-contido.** Depois de a causa estar isolada (SEG0), este segmento fecha a FRENTE D:
ficheiro inteiro verde + prova de mutação completa. HARD GATES 7 (mutação), 8 (bidireccional), 9.

Executor: Hermes (deepseek-v4-flash) · Data: 2026-10-16

---

## 1.1 O ficheiro inteiro (depois da correcção do SEG0)

```
node --test --test-concurrency=1 src/__tests__/utac110i1-front-billing.test.mjs
✔ (a) Android com a flag ligada ⇒ encomenda na loja, SERVIDOR valida e só depois se fecha (2037ms)
✔ (a) o fluxo nativo NUNCA chama os endpoints PIX
✔ (b) PWA com a flag ligada no Blob ⇒ PIX ... e ZERO peças do Billing
✔ (b) iOS com a flag ligada ⇒ PIX
✔ (b) Android nativo mas SEM o plugin nativo ⇒ PIX (fail-closed)
✔ (c) Android nativo com a flag DESLIGADA ⇒ PIX (zero regressão no APK actual)   <-- ERA O HANG
✔ (d) o servidor RECUSA (409) ⇒ erro visível e a compra NÃO é fechada na loja
✔ (d) servidor indisponível (503) ⇒ erro claro, sem fechar na loja
✔ (e) cancelamento na loja ⇒ erro claro e ZERO idas à rede
✔ (e) a loja falha na encomenda (6777008) ⇒ erro claro, sem tocar no servidor nem nos PIX
✔ tipo inválido ⇒ erro LOCAL nos dois ramos, sem rede e sem loja
✔ sem `authToken` ⇒ `sem_sessao` nos dois ramos, sem rede
✔ corrida no MESMO tick ⇒ só uma compra, nos dois ramos
✔ o erro fica no ESTADO `erro` do hook (loja e servidor) e um sucesso posterior limpa-o  <-- NOVO (§1.3)
ℹ tests 14 · pass 14 · fail 0
```

O teste (c) isolado: **pendura ≥ 90 s (KILL) → PASSA em 1 635 ms.**

## 1.2 Prova de mutação — PRIMEIRA corrida: 8/9 (o instrumento FUNCIONOU e apanhou um sobrevivente)

Antes desta frente, a prova de mutação do 110i.1 **nunca tinha corrido** (§0.4 do SEG0). A primeira
corrida completa deu:

```
controlo (sem mutação): VERDE 32/32
RED (pendurou) | D1 · D2 · D3 · D4 · D5 · D6 · D8 · D9
SOBREVIVEU     | D7  o erro do Billing deixa de ser visível (silêncio)
mutantes RED: 8/9     (md5 final == inicial: restauro confirmado)
```

**D7 sobreviveu porque o ficheiro não tinha NENHUMA asserção sobre o estado `erro` do hook** — todas
liam o objecto DEVOLVIDO por `comprar()` (`r.message`). O mutante apaga o `setErro(message)` do ramo
`!compra.ok` (o desfecho LOCAL da loja): o `comprar()` continua a devolver a mesma mensagem, mas o
**estado** que o ecrã pinta (`MinhaCarteira` / `ComprarPasseModal`) fica **vazio** ⇒ falha silenciosa.
É cobertura em falta real, não um mutante equivalente.

## 1.3 O teste que mata D7 (acrescentado ao ficheiro autorizado)

`src/__tests__/utac110i1-front-billing.test.mjs` — **1 teste novo** (13 → 14), sem tocar numa única
asserção dos 13 existentes. Prova três coisas na MESMA montagem do hook:

1. **desfecho LOCAL da loja** (6777008) ⇒ `estado.erro === "Não foi possível concluir a compra na
   loja. Tente de novo."` (é o ramo que o D7 silencia);
2. **sucesso posterior por PIX** ⇒ `estado.erro === ""` (o erro antigo **limpa** — não fica preso no ecrã);
3. **recusa do SERVIDOR** (409) ⇒ `estado.erro === "Não foi possível confirmar a compra na loja.
   Contacte o suporte."` (o ramo irmão, que o D7 *não* toca, fica provado na mesma).

⚠️ Achado da própria escrita do teste (declarado): a 1.ª versão mudava a cena (`definirRecursos` /
`ARRANCAR_ANDROID`) **depois** de montar o hook e **sem** re-renderizar ⇒ o hook continuava com a flag
do render anterior e a asserção media outra cena (medido: `true !== false` na 1.ª asserção). Corrigido
com `await c.actualizar()` antes de cada `comprar()`.

**Prova dirigida de atribuição (ficheiro:linha)** — `tmp-utac110i1b-31066/prova-d7.mjs`:

| passo | resultado |
|---|---|
| controlo positivo (sem mutação) | **pass 14 · fail 0** |
| só o D7 aplicado (`md5 7bbcb4828030e12579c268a1bcc64d62`) | **pass 13 · fail 1** |
| teste que morde | `o erro fica no ESTADO `erro` do hook ...` — `utac110i1-front-billing.test.mjs:285` |
| restauro | `7bbc1625ac7077b263b2298c7768ee94` **== inicial** |

⇒ o D7 morre **por causa do teste novo** (o 106e e os outros 13 não o apanhavam), e o ficheiro voltou
byte a byte ao original.

## 1.4 Prova de mutação — SEGUNDA corrida: 9/9 RED

```
controlo (sem mutação): VERDE 33/33      (14 do 110i.1 + 19 do 106e)
RED (pendurou) | D1 · D2 · D3            (os três que partem a bifurcação penduram — veredicto certo:
                                          a espera pela loja é de 300 s e o instrumento corta aos 45 s)
RED            | D4 · D5 · D6 · D7 · D8 · D9
mutantes RED: 9/9
md5 final: 7bbc1625ac7077b263b2298c7768ee94 (== inicial)
```

**Sinal do instrumento (declarado; achado ℹ️-6 do validador do SEG3):** dos 9 RED, **três**
(D1/D2/D3 — os que partem a bifurcação) são «**RED por pendura**»: a heurística
`pendurou = sinal==="SIGTERM" || tests===null` conta um corte do limite de 45 s como RED. É um
veredicto **honesto** (com o gate partido o ramo nativo fica à espera dos 300 s da loja e o reporter
nunca imprime resumo), mas o `9/9` inclui esses casos e **não** são nove «RED por asserção».
Declarado, não escondido.

**GATE 8 (bidireccional):** o mesmo instrumento dá **8/9** com o ficheiro de 13 testes e **9/9** com o
de 14 — o delta é o teste novo, e nada mais. Não é circular: o mutante é o **código** (o gate/setErro),
o teste é o **juiz**, e o controlo positivo de cada corrida exige baseline verde antes de mutar.

## 1.5 Ficheiros tocados neste UTAC (e SÓ estes)

| ficheiro | mudança |
|---|---|
| `desafio-gut/frontend/src/hooks/useComprarPasse.js` | **1 linha** — reposição da condição `isPagamentoNativoAtivo === true &&` no gate (**l. 135** antes da correcção · **l. 138** no ficheiro corrigido) + 3 linhas de comentário |
| `desafio-gut/frontend/src/__tests__/utac110i1-front-billing.test.mjs` | **+1 teste** (13 → 14) |

Nada mais: SEG0 (plugin) e SEG1 (backend) **não foram tocados**; o `106e` **não foi tocado**;
`google-play-billing.js`, os endpoints e a migração ficaram intactos.
