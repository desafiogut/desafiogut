# UTAC110i.2 — SEG-1 (MEDIÇÃO)

Data: 2026-10-18 · Executor: Hermes · HEAD medido: `52c5b9d` (= `origin/main`, igual ao enunciado)

Todas as afirmações abaixo apontam o comando/ficheiro que as produziu (GATE 2). Onde o enunciado
divergiu do medido, está declarado com o número medido (GATE 1).

---

## -1.1 RAM (A14) — portão cumprido

`powershell -NoProfile -Command "[int]((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024)"`
três leituras espaçadas de 3 s:

```
1663 · 1673 · 1679  MB livres
```

Portão A14 (≥ 1 500 MB): **cumprido**, 3 leituras concordantes. Sem escada de libertação aplicada.
Registo conforme `windows-memory-pressure` §3.2 (a leitura tem de ser re-medida antes de cada corrida).

## -1.2 O detetor de plataforma (Frente A) — CONFIRMADO

`desafio-gut/frontend/src/hooks/useRecursosApp.js:74-86` — `detectarPlataforma()`:

1. `?plataforma=` na query string;
2. `window.__GUT_PLATAFORMA__`;
3. `window.GUT_NATIVE.platform` — **e nada no repositório define `GUT_NATIVE`**:
   `grep -rn "GUT_NATIVE" src/ netlify/` devolve **1** ocorrência, a própria leitura em
   `useRecursosApp.js:80`. Zero escrita. **Confirmado.**
4. senão → `"pwa"`.

`android/app/src/main/java/com/desafiogut/app/MainActivity.java` — **5 linhas**:

```java
package com.desafiogut.app;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {}
```

Vazio de qualquer `addJavascriptInterface`/`GUT_NATIVE`. **Confirmado** (o enunciado diz «vazio»;
o medido é «BridgeActivity sem overrides» — mesma conclusão).

`capacitor.config.ts` — 10 linhas, só `appId`/`appName`/`webDir`. Sem bloco `server` nem `plugins`.

⇒ No APK os passos 1-3 falham todos ⇒ `detectarPlataforma()` devolve **`"pwa"`**.
É a causa raiz medida da frente A.

## -1.3 Cadeia medida da flag (Frente B) — o APK lê a chave `pwa`

`carregarRecursos()` (`useRecursosApp.js:102-138`) tem **dois** caminhos:

- **Supabase directo** (`config_remota`, chave `recursos_app`) — só se
  `supabaseConfigurado()` = `VITE_SUPABASE_URL` **e** `VITE_SUPABASE_ANON_KEY` presentes
  (`src/lib/supabaseClient.js:26-28`).
- **Função** `/.netlify/functions/recursos-app?plataforma=<detetada>` → `getConfig("recursos_app")`
  → `resolverRecursos(config, plataforma)` (`netlify/functions/recursos-app.mjs:32-41`).
- **Fallback local** → `fallbackLocal(plataforma)` (defaults).

Como `plataforma` é `"pwa"` no APK, **os três caminhos devolvem a chave `pwa`** — que é `false`.
Ligar `android:true` **não muda nada** enquanto o detetor disser `pwa`. É exactamente o item 4 do
contexto do enunciado, agora com o mecanismo medido.

### Produção, medido agora (não presumido)

`GET https://silly-stardust-ca71bc.netlify.app/.netlify/functions/recursos-app?plataforma=<p>`,
três chamadas reais:

```
pwa     -> {"plataforma":"pwa",    "isLeilaoAtivo":true,  "isPagamentoNativoAtivo":false, ...}
android -> {"plataforma":"android","isLeilaoAtivo":false, "isPagamentoNativoAtivo":false, ...}
ios     -> {"plataforma":"ios",    "isLeilaoAtivo":false, "isPagamentoNativoAtivo":false, ...}
```

O valor **armazenado** (fonte de verdade da função), lido por REST com a ANON key de produção:

```
GET /rest/v1/config_remota?select=chave,valor,atualizado_em&chave=eq.recursos_app
-> [{ "chave":"recursos_app",
      "valor":{ "isLeilaoAtivo":{"ios":false,"pwa":true,"android":false},
                "isPagamentoNativoAtivo":{"ios":false,"pwa":false,"android":false} },
      "atualizado_em":"2026-06-21T07:52:51.831294+00:00" }]
```

**`isPagamentoNativoAtivo.android = false` em produção. Confirmado** (o enunciado dizia «false nas
três plataformas» — confirmado, e o valor **não** tem as 5 flags de transição, que caem nos defaults).

### Onde a config NÃO está (medido, descarta uma hipótese)

`netlify blobs:list config-experiencia` → **«store is empty»**. E `DATA_STORE_BACKEND` **não** está
definido no contexto `production` (`netlify env:list --context production | grep DATA_STORE` → 0
linhas) ⇒ o backend é o default `blobs` (`_lib/data-store.mjs:21`) ⇒ a função responde com
`DEFAULT_RECURSOS_APP`, não com um Blob escrito. **A config real vive só no Supabase.**

⚠️ Nota de coerência com a auditoria do 110m.1: ela diz «confirmado no Supabase» — **certo**, mas
pelo caminho errado (o Blob está vazio; quem lê o valor é o frontend via Supabase, não a função).

### Qual dos dois caminhos o APK usa? (medido no artefacto construído)

> ⚠️ **ERRATA (medida depois, no build novo — o raciocínio abaixo estava errado e fica À VISTA).**
> A primeira redacção desta secção concluía: «**o APK lê a flag pela FUNÇÃO, não pelo Supabase**».
> **REFUTADA por medição no artefacto construído no SEG2.** O que se mediu, e a diferença:
> o `android/app/src/main/assets/public/` que existia no repo era de um **build ANTIGO** (sem
> `VITE_SUPABASE_*`); `npm run build:apk` com `netlify build --context production` **injecta as
> `VITE_*` de produção** e o artefacto novo **tem** o projecto Supabase:
> `grep` do bundle novo → `https://vjslwowwrpcawijdiksm.supabase.co` **presente** e a chamada
> `createClient("https://vjslwowwrpcawijdiksm.supabase.co", "eyJ…")` no chunk do `useRecursosApp`.
> ⇒ **o APK que se constrói hoje lê `config_remota` directamente no Supabase** (o mesmo caminho do
> PWA); o caminho da função/Blob fica como *fallback* (config ilegível → função → Blob → defaults).
> Consequência prática (e é por isso que a errata importa): **a escrita que governa o APK é a do
> Supabase**, não a do Blob. As duas foram feitas (SEG1), por isso o resultado não depende de qual
> dos caminhos corre — mas a afirmação «o APK usa a função» era **falsa para o build novo**.

~~Texto original (REFUTADO, preservado): o APK desta árvore lê a flag pela FUNÇÃO, não pelo Supabase
— `grep` dos assets por um URL de projecto Supabase dava 0 ocorrências; as 5 ocorrências de
«supabase.co» eram de `privy`/`sentry`. Consequência: o APK nunca vê o valor do Supabase e a função,
com o Blob vazio, devolve o default.~~

O que **continua** verdadeiro da medição original: (a) o artefacto que estava no repo **não** levava
`VITE_SUPABASE_*`; (b) o Blob `config-experiencia` estava **vazio** e a função respondia com
`DEFAULT_RECURSOS_APP`; (c) **por isso a Frente B teve de ser feita nos dois sítios** — se o build
fosse feito sem as `VITE_*` (ou se a leitura do Supabase falhasse em runtime), o caminho da função
seria o que responde, e só o Blob escrito evita que ele devolva `android:false`.

## -1.4 Consequência NÃO declarada no enunciado: o leilão no APK

O mesmo `plataforma` governa **duas** flags. Em produção `isLeilaoAtivo.android = false`:

- `src/pages/MercadoLances.jsx:302` — `if (!isLeilaoAtivo) return <MercadoConformidade …>`;
- `src/components/CardLance.jsx:391` — `if (recursosCarregando || !isLeilaoAtivo)` ⇒ sem formulário de lance.

⇒ Corrigir o detetor **também** troca o leilão real pela vista de conformidade dentro do APK. Isso é
o **desenho** do modelo por plataforma (`_lib/recursos-app-config.mjs:7-14`), mas é uma mudança
**visível** que o enunciado não nomeia. **Declarada ao operador (R18) — não é decisão do executor.**
Não há como corrigir o pagamento sem mexer no mesmo detetor (é o mesmo valor).

## -1.5 O gate do pagamento (já implementado, 110i.1b)

`src/hooks/useComprarPasse.js:138`:

```js
if (isPagamentoNativoAtivo === true && billingDisponivel()) return await comprarNativo(tipo);
// senão → PIX / saldo R$ (fluxo original, inalterado)
```

`billingDisponivel()` (`src/lib/google-play-billing.js`) = `isNativePlatform() === true` **e**
`getPlatform() === "android"` **e** `isPluginAvailable("PurchasePlugin")`. Fail-closed.

Medido em Node (o ambiente da suíte): `getPlatform()="web"`, `isNativePlatform()=false`,
`isPluginAvailable=false` ⇒ **`billingDisponivel()` = false** nos testes, sem duplo.

⇒ Com o detetor corrigido **e** a flag ligada, o APK entra em Billing; tudo o resto (PWA, iOS)
continua em PIX pelas duas condições. **Zero regressão no PWA** — as duas condições são necessárias.

## -1.6 Plugin nativo presente no projecto Android

`android/capacitor.settings.gradle`:

```
include ':capacitor-plugin-cdv-purchase'
project(':capacitor-plugin-cdv-purchase').projectDir = new File('../node_modules/capacitor-plugin-cdv-purchase/android')
```

E `android/app/build.gradle:60` inclui `:capacitor-cordova-android-plugins`. ⇒ o plugin do Billing
está no build Android; `isPluginAvailable("PurchasePlugin")` não é false por falta de registo.

## -1.7 Testes que fixam o detetor / a flag

| ficheiro | o que fixa |
|---|---|
| `src/hooks/useRecursosApp.test.mjs` | `resolverParaPlataforma` (285+ comparações com o backend), os 3 caminhos do hook, tempo real. Plataforma entra por `window.__GUT_PLATAFORMA__` (`_recursos-arnes.mjs:55`). |
| `src/hooks/__tests__/_recursos-arnes.mjs` | arnês: substitui `window` por `{location:{search:""}, __GUT_PLATAFORMA__}` |
| `src/__tests__/utac110i1-front-billing.test.mjs` (+ stubs `_stubs-110i1/`) | o gate `isPagamentoNativoAtivo === true && billingDisponivel()` |
| `netlify/functions/_tests/mc103-flags-transicao.test.mjs` | paridade cliente/backend das 5 flags |

**Nenhum teste fixa hoje o caminho do Capacitor** (não existe). É o que os testes novos vão cobrir.

## -1.8 Desvios do enunciado (GATE 1)

| enunciado | medido |
|---|---|
| «MainActivity.java está vazio» | 5 linhas: `class MainActivity extends BridgeActivity {}` — vazio de overrides (mesma conclusão) |
| «flag false nas 3 plataformas (confirmado no Supabase)» | confirmado o valor; **mas** o APK lê pela função e o Blob está **vazio** ⇒ o APK vê o **default**, não o valor do Supabase |
| «detetor … só reconhece Android se existir GUT_NATIVE» | certo; acresce que **nada** o escreve (1 ocorrência no repo, de leitura) |
| — | **não declarado no enunciado:** o mesmo detetor governa `isLeilaoAtivo` (leilão vs conformidade no APK) |

## -1.9 Ficheiros que este UTAC vai poder tocar

`src/hooks/useRecursosApp.js` · `src/hooks/useComprarPasse.js` (só se a Frente C for aprovada) ·
`android/app/src/main/java/com/desafiogut/app/MainActivity.java` (só se necessário — **não é**,
porque a solução escolhida é `Capacitor.getPlatform()`) · testes novos · `_logs/*`.
