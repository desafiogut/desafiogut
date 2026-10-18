# UTAC110i.2 — SEG3 · VERIFICAÇÃO

Data: 2026-10-18 · HEAD: `52c5b9d` · Executor: Hermes

## 3.1 Suíte completa (portão A14 re-medido no wrapper)

`bash scripts/utac110i2-suite.sh` → `_logs/UTAC110i.2_SEG3_SUITE.txt`

```
RAM_LIVRE_MB antes da suite: 1609 / 1609        ← portão A14 é ≥ 1500: CUMPRIDO
HEAD: 52c5b9d
frontend: VERDE 1202/1202 pass
backend:  VERDE 1351/1357 pass                  ← os 6 skipped conhecidos (DEBT-001)
VEREDITO: VERDE
```

Arranque da sessão (3 leituras, antes de tocar em nada): **1663 / 1673 / 1679 MB**.
Não foi preciso aplicar a escada do `windows-memory-pressure`.

Delta do frontend: **1189 → 1202** (`+13` = 12 do ficheiro novo + 1 do teste novo do ramo
bloqueado). Backend inalterado (1351/1357).

## 3.2 Prova de mutação (GATE 7 / R16) — 7/7

`node scripts/utac110i2-prova-mutacao.mjs` → exit **0** · `_logs/UTAC110i.2_SEG3_MUTACAO.txt`

```
controlo (sem mutação): VERDE 58/58
RED | entrou: sim | restaurado: sim | fail=7  | A1  o detetor volta a não reconhecer o Capacitor
RED | entrou: sim | restaurado: sim | fail=1  | A2  o detetor aceita a STRING sem a ponte nativa
RED | entrou: sim | restaurado: sim | fail=1  | A3  deixa de honrar GUT_NATIVE (regressão de builds)
RED | entrou: sim | restaurado: sim | fail=1  | A4  só reconhece Android (iOS passa a «pwa»)
RED | entrou: sim | restaurado: sim | fail=3  | C1  o bloco da frente C desaparece (volta o PIX no APK)
RED | entrou: sim | restaurado: sim | fail=1  | C2  androidNativo() = «qualquer nativo» (iOS perde o PIX)
RED | entrou: sim | restaurado: sim | fail=14 | C3  androidNativo() = sempre true (o PWA perde o PIX)

mutantes RED: 7/7
md5 final useRecursosApp.js:       ac4eab4e… (== inicial)
md5 final useComprarPasse.js:      693c8d01… (== inicial)
md5 final google-play-billing.js:  7f6abf78… (== inicial)
```

Cada mutante foi morto pelo teste **que lhe corresponde**, não por um efeito colateral:
A2 → só o `(c)`; A3 → só o `(e)`; A4 → só o `(b)`; C2 → só o «iOS ⇒ PIX»; C3 → 14, começando pelo
«PWA ⇒ PIX». O mutante **C3** é o que mostra porque a frente C **não** usa `plataforma === "android"`:
com um guarda largo, o PWA perdia a compra por PIX.

Backups dos três alvos escritos **fora do repo** (`%TEMP%\utac110i2-*-*.bak`) antes do 1.º mutante.

### Erro do meu instrumento, declarado
A 1.ª corrida **abortou** (exit 2) com `A1 -> 0 ocorrências do alvo`. Causa medida: as âncoras do
script estavam escritas com `\n` e os ficheiros do repo estão em **CRLF**. Correcção: conversão do
fim de linha da âncora para o do ficheiro. O instrumento **abortou em vez de medir lixo** — é o
comportamento correcto (GATE 2), mas o primeiro resultado não era um veredicto.

## 3.3 A cadeia do APK contra a PRODUÇÃO (a prova mais forte possível sem aparelho)

`node scripts/utac110i2-verificar-cadeia.mjs` com as `VITE_SUPABASE_*` reais de produção
→ código do repo carregado pelo Vite, `@capacitor/core` no estado do APK, **sem duplo de rede**:

```
APK Android nativo   -> plataforma=android  isPagamentoNativoAtivo=true   isLeilaoAtivo=false
browser (PWA)        -> plataforma=pwa      isPagamentoNativoAtivo=false  isLeilaoAtivo=true
iOS nativo           -> plataforma=ios      isPagamentoNativoAtivo=false  isLeilaoAtivo=false
OK: a cadeia do APK (detector -> config de produção) devolve android + Billing ligado.
```

Isto exercita, de uma vez: o detetor novo, a escolha do caminho de config, a leitura real de
`config_remota` com a ANON key, e o efeito da escrita da Frente B.

## 3.4 Artefacto construído (Frente D, parte estática)

`bash scripts/utac110i2-build-apk.sh` → `EXIT_BUILD=0` · `_logs/UTAC110i.2_SEG2_build.txt`
(`netlify build --context production` 4m11s · `validar:dist` OK · `cap sync android` OK).

| verificação | resultado |
|---|---|
| o detetor novo está no bundle | **sim** — `assets/useRecursosApp-DbS-vkyq.js`: `isNativePlatform?.()===!0){let e=r.getPlatform?.();if(e===\`android\`\|\|e===\`ios\`)return e}` |
| o bundle leva o Supabase de produção | **sim** — `https://vjslwowwrpcawijdiksm.supabase.co` + `createClient(…)` (ver ERRATA no SEG-1 §-1.3) |
| o plugin do Billing está no projecto Android | **sim** — `android/capacitor.settings.gradle` inclui `:capacitor-plugin-cdv-purchase` |

## 3.5 O que NÃO foi testado (declarado, não maquilhado)

1. **APK a correr num aparelho — NÃO.** `adb devices` → lista vazia;
   `AppData/Local/Android/Sdk/emulator` → **não existe** (sem emulador instalado, sem AVD).
   Ficam por medir em runtime: (a) o detetor devolver `android`; (b) a flag chegar `true`;
   (c) o botão abrir o balão da Google Play; (d) o PIX já não aparecer. → **DEBT-062**.
2. **Compra real** — impossível sem A1-A4 (produtos no Play Console + service account). O que se
   pode afirmar é o que se mediu: com a loja indisponível, o hook devolve
   `pix_indisponivel_no_apk` e **não vai ao endpoint PIX** (teste + mutante C1).
3. **Build de um APK instalável** (`gradlew assembleDebug`): não correu. O `build:apk` do repo faz
   `netlify build` + `validar:dist` + `cap sync` (é o que o projecto chama «build do APK»); a
   compilação Gradle não faz parte desse comando e não foi pedida no enunciado.

## 3.6 Estado do validador adversarial (SEG4)

Despachado em worktree próprio `C:\Users\Moltbot\tmp-utac110i2-val\wt` (HEAD `52c5b9d` + a alteração
aplicada por patch, `git status` com os 6 ficheiros + 4 scripts), instruído a **tentar refutar** as
alegações A-E. **O veredicto não chegou dentro do orçamento de tempo desta sessão** — é a única
peça da entrega em falta. Nota de honestidade: **sem o veredicto lido, este UTAC não está fechado**
(GATE 9/GATE 11).
