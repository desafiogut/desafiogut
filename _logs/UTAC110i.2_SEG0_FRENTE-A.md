# UTAC110i.2 — SEG0 · FRENTE A: o detetor de plataforma

## O defeito (medido, SEG-1 §-1.2)

`detectarPlataforma()` (`src/hooks/useRecursosApp.js:74`) reconhecia nativo por três marcadores e
**nenhum deles existe no APK**:

1. `?plataforma=` — não vem na URL do APK;
2. `window.__GUT_PLATAFORMA__` — só os testes/MCP escrevem;
3. `window.GUT_NATIVE.platform` — **0 escritores no repositório** (1 ocorrência: esta leitura).

⇒ o APK classificava-se **`"pwa"`** e ia buscar a chave `pwa` da config.

## A correcção (Ponytail: 6 linhas + 1 import)

Em `detectarPlataforma()`, **antes** do `return "pwa"`, um passo 3 que pergunta ao próprio Capacitor:

```js
if (Capacitor?.isNativePlatform?.() === true) {
  const nativaCapacitor = Capacitor.getPlatform?.();
  if (nativaCapacitor === "android" || nativaCapacitor === "ios") return nativaCapacitor;
}
```

`import { Capacitor } from "@capacitor/core";` no topo — o mesmo pacote que
`src/lib/google-play-billing.js` já importa (não é dependência nova; medido no `package.json`).

### Porque `isNativePlatform()` e não só `getPlatform()` — e porque não o `MainActivity.java`

- **`isNativePlatform()` é o guarda anti-falsificação.** `getPlatform()` devolve uma *string* que
  qualquer script da página pode forjar (`window.Capacitor = {...}`); `isNativePlatform()` lê a
  **ponte nativa** (`window.androidBridge` / `webkit.messageHandlers.bridge`, medido no dist do
  pacote). O mutante **A2** (largar este guarda) é morto pelo teste `(c)`.
- **Não se tocou no `MainActivity.java`.** O enunciado autorizava escrever lá `GUT_NATIVE`; a
  alternativa que ele próprio recomenda (`Capacitor.getPlatform()`) é **mais robusta e sem
  manutenção manual** — não há interface JS a manter sincronizada com o JS da app. O ficheiro fica
  como está (5 linhas, `BridgeActivity`), e isso está declarado: **nenhuma alteração em Java**.
- **Precedência preservada**: `?plataforma=` > `__GUT_PLATAFORMA__` > `GUT_NATIVE` > Capacitor >
  `"pwa"`. Um `GUT_NATIVE` com valor inválido (`browser`) **deixa de forçar `pwa`** e cai no
  Capacitor — antes caía em `pwa`. É uma melhoria, coberta pelo teste `(e)`.

## Prova

| teste (novo ficheiro `src/hooks/__tests__/utac110i2-plataforma-billing.test.mjs`) | o que fixa |
|---|---|
| (a) | Android nativo ⇒ `"android"`; browser ⇒ `"pwa"` (controlo negativo) |
| (b) | iOS nativo ⇒ `"ios"` |
| (c) | `getPlatform()="android"` **com** `isNativePlatform()=false` ⇒ `"pwa"` |
| (d) | ponte nativa lança ⇒ `"pwa"` (fail-soft) |
| (e) | precedência dos 4 marcadores, incluindo valor inválido em `GUT_NATIVE` |

O arnês `_recursos-arnes.mjs` passou a trocar `@capacitor/core` pelo duplo **já existente**
(`src/lib/__tests__/_duplo-capacitor.mjs`, do UTAC110i.1), que é **fiel ao pacote real em Node**
(`web` / `false` / `false` — medido e reproduzido no próprio duplo). Os testes do MC104.1 que usam
este arnês continuam **12/12 verdes** (medido).

## Limite declarado

O teste é de **comportamento do detector**, não de execução no APK: não há dispositivo nem emulador
nesta máquina (`adb devices` → 0; `emulator -list-avds` → sem emulador instalado). A verificação no
APK real é a **estática sobre o artefacto construído** (SEG2) e, em runtime, fica para depois de
A1-A4 com um aparelho — declarado, não maquilhado.
