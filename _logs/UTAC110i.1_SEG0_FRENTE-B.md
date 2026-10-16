# UTAC110i.1 — SEG0 · FRENTE B (Plugin Capacitor + abstracção Billing)

**Auto-contido.** Instalar o plugin, sincronizar o Android e criar a abstracção que é a **única**
porta do frontend para o Google Play Billing. HARD GATES 3, 4, 5, 7, 8, 10, 14.

---

## 0.1 O que a frente entrega

| entregável | estado | caminho |
|---|---|---|
| `capacitor-plugin-cdv-purchase` instalado | FEITO | `desafio-gut/frontend/package.json` → `^13.19.1` (+ `package-lock.json`) |
| `npx cap sync android` | FEITO | `android/capacitor.settings.gradle`, `android/app/capacitor.build.gradle` |
| `src/lib/google-play-billing.js` | FEITO | 300 linhas; `billingDisponivel`, `iniciarCompra`, `confirmarCompra`, `consultarCompras` |
| testes da abstracção | FEITO | `src/__tests__/utac110i1-google-play-billing.test.mjs` (23 testes) |
| prova de mutação | FEITO | `scripts/mc110i1-prova-mutacao.mjs` — **11/11 RED**, md5 reposto |

## 0.2 Medições feitas ANTES de escrever código (GATE 1 / GATE 2)

Instalação medida: `npm view capacitor-plugin-cdv-purchase` → **13.19.1**,
peerDeps `@capacitor/core: ^6.0.0 || ^7.0.0 || ^8.0.0` ⇒ compatível com o **8.4.2** do repo.
`npm install` → `added 5 packages` (o pacote traz dependências próprias). `npx cap sync android` →
`Found 2 Capacitor plugins for android: @capacitor/app@8.1.1, capacitor-plugin-cdv-purchase@13.19.1`.

**Sonda contra o pacote INSTALADO** (script em pasta temporária fora do repo, removida no fecho;
método da skill `dependency-mechanism-probing` §1 — `createRequire` ancorado no directorio com
`node_modules`). Resultados que mudaram o desenho:

| # | medido | consequência no código |
|---|---|---|
| 1 | o pacote toca `window.console` no **topo do módulo** (`dist/index.js:324`) ⇒ importá-lo em Node/SSR lança `ReferenceError: window is not defined` | o import é **DINÂMICO** (`carregarPlugin()`), só depois dos guardas ⇒ o módulo é SSR-seguro (é o que permite testá-lo no arnês do repo, que corre sem `window`) |
| 2 | `when().approved(cb)` devolve o próprio `when()` e registar o **MESMO** callback 2× lança `REGISTERING THE SAME CALLBACK TWICE?` | **UM** listener de módulo (`garantirListenerAprovado`), não um por compra |
| 3 | `await store.order(oferta)` resolve **`undefined`** em sucesso (casos `purchased`/`deferred` do adaptador GooglePlay) e `{isError,code,message,...}` em falha | a transacção **não** vem do `order()`: vem do listener `approved` |
| 4 | sem adaptador, `order()` devolve `{isError:true, code:6777008, message:'Adapter not found or not ready (undefined)'}`; `store.products` fica vazio e `store.get(id)` = `undefined` | o duplo dos testes copia estes dois factos; o código trata o 6777008 e o cancelamento 6777005 |
| 5 | a transacção Android expõe `nativePurchase.purchaseToken`, `transactionId` (= orderId‖token), `purchaseId` (= token), `products=[{id}]`, `isAcknowledged`, `isConsumed` | é daí que sai o payload do servidor (nada inventado) |
| 6 | `store.finish(t)` resolve `undefined`; o adaptador dereferencia `transaction.products[0].id` | `confirmarCompra` exige `products[0].id` (senão era `TypeError` dentro da biblioteca) |
| 7 | `ProductType.CONSUMABLE === "consumable"`, `Platform.GOOGLE_PLAY === "android-playstore"` | usados literalmente |
| 8 | `@capacitor/core` em Node: `getPlatform()="web"`, `isNativePlatform()=false`, `isPluginAvailable("PurchasePlugin")=false` | é este o «Billing disponível» do enunciado (fail-closed fora do Android) |

## 0.3 Desenho (e o que ficou de fora, GATE 3)

`billingDisponivel()` não é opinião: é `isNativePlatform() && getPlatform()==="android" &&
isPluginAvailable("PurchasePlugin")`, com `catch → false` (falha fechada).
`iniciarCompra(tipo)` → guarda do tipo → guarda de disponibilidade → registo do SKU →
`initialize()` (uma vez) → espera da oferta (timeout 15 s) → `store.order()` → espera da aprovação
pelo listener (timeout 300 s) → normalização. Devolve **`ok:true` = a Google aprovou e há um
`purchaseToken` para validar no servidor** — nunca «entregue».

**NÃO faz:** não valida a compra (é servidor), não credita benefícios, não define validador externo
(`store.validator`/Iaptic ficam por usar — a validação é NOSSA), não trata iOS
(`Platform.GOOGLE_PLAY` fixo). `/comprar-senhas` e todo o fluxo PIX ficam intactos (R18-110i-8).

## 0.4 ACHADO ⚠️ (defeito real, apanhado por medição e corrigido)

Na primeira versão, quando a loja devolvia **erro**, o `setTimeout` de `TIMEOUT_COMPRA_MS` (300 s)
ficava **PENDENTE**: o `node --test` nunca saía (medido: processo vivo aos 300 s com **4 031
`FSWatcher`** e 1 `Server` em `_getActiveHandles()`), e o harness da suíte corre os ficheiros **num
só processo e sem timeout** ⇒ a suíte inteira ficaria **pendurada** (não vermelha — pendurada, o pior
desfecho possível: um instrumento morto que parece lento).
Correcção: `cancelar()` explícito no caminho de erro e no `catch`, declarado **fora** do `try`
(a primeira correcção punha-o dentro e o `catch` dava `ReferenceError: cancelar is not defined` —
apanhado pela suíte, corrigido). O mutante **M11** é exactamente este defeito: o seu veredicto é
**«RED (pendurou)»**, porque o defeito não se manifesta por asserção e sim por o ficheiro não
terminar. Fica declarado como prova.

## 0.5 Provas

```
controlo (sem mutação): VERDE 23/23 (fail 0)
mutantes RED: 11/11        md5 final: e5d1bbca2a82c7e9abcf400444671541 (== inicial)
M1 billingDisponivel liga sempre · M2 sem guarda de Android · M3 sem guarda do plugin ·
M4 falha aberta · M5 SKUs trocados · M6 tipo inválido vai à loja · M7 listener por compra ·
M8 token não lido do nativePurchase · M9 SKU não conferido · M10 finish sem produtos ·
M11 (pendura) timer não cancelado
```

Bidireccional (GATE 8) no mesmo ficheiro de teste: **(a)** Android+plugin ⇒ compra com
`purchaseToken` do SKU certo, 1 só `initialize`, 1 só listener; **(b)** PWA / iOS / Android sem
plugin / ponte a lançar ⇒ `billing_indisponivel` com **ZERO** idas à loja (é isto que garante o
«PWA continua por PIX»); **(c)** tipo inválido ⇒ `tipo_invalido` sem tocar na loja.

**A/B pareado (E8), declarado com honestidade:** o alvo é um ficheiro NOVO — não há «antes» de
produção para comparar. O par que faz de A/B é o **braço do duplo**: o mesmo `iniciarCompra` com
`plataforma/nativo/plugin` a alternar entre `web` e `android`. O teste (a) e o teste (b) correm o
MESMO caminho de código com os mesmos inputs e só o braço muda — e o próprio par é o controlo de
que o duplo está ligado ao alvo (com o estado separado, o (a) falharia).

**Limite declarado:** não há dispositivo Android real nesta máquina ⇒ nada prova o comportamento do
bridge nativo (Play Services, licença de teste, balão do Google). O que está provado é a abstracção
contra a API REAL do pacote (medida) e o roteamento. O teste real de compra exige A1+A4 (pendentes).
