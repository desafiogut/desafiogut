# UTAC132 — RELATÓRIO FINAL · PIX/Saldo fora do APK em tempo de build, sem splash, AAB v9

Tipo `publicacao` + `produto` · baseline `3f00660` · commits `17732af` (código) + fecho (docs) · Opus 5.5 · 2026-11-06.
**Veredicto: FECHADO.** Validação: grep e guarda sobre o `.aab` extraído (o SEG3 do enunciado). **Sem validador adversarial independente**: declarado.

## Premissas do enunciado vs medido
- HEAD era `3f00660` (UTAC130 e UTAC131 já fechados), não `eae7654`.
- **Frente B já estava feita** pelo UTAC130: tiles «Carteira» (pontos de lance) e «Passe Desafio» (inventário), sem «Saldo (R$)». Sem alteração.
- A Carteira já escondia Saldo/PIX no APK em runtime (UTAC116), mas **as strings iam no bundle**: o AAB v8 tinha «Depositar PIX» ×2 e «Saldo Disponível» ×1. Agora saem.
- O `.env.production` não existe e, se fosse criado, tiraria o PIX também do site → a flag foi para o `build:apk` (R18-132-1).
- Mudar só o `parent` do tema não tirava o logo, e no Android 12+ o ícone do sistema aparece sempre → splash completo (R18-132-2).

## Entregas
| Checklist | Estado |
|---|---|
| PIX e Saldo removidos do bundle Android via env de build | ✅ `VITE_IS_ANDROID_APP=true` só no `build:apk`; o guarda do Gradle exige a flag e recusa as strings |
| Cards do Início | ✅ já estavam (UTAC130); agora publicados também na web |
| Splash nativo removido | ✅ `values/styles.xml` + `values-v31/styles.xml` (ícone transparente) |
| versionCode 9 | ✅ confirmado com `bundletool dump manifest` |
| Suíte verde | ✅ frontend **1318/1318** · backend **1456/1462** |
| AAB v9 | ✅ `C:\Users\Moltbot\Desktop\DesafioGUT-v9\DesafioGUT-v9.aab` · 32 438 269 B · SHA-256 `f258d0c7b0d3693d8c24e312c2dd8c9d9ba5c231770d9543307fbfb7e1c1ad42` · certificado = v8 · `jar verified.` |
| grep no AAB v9 | ✅ nenhum ficheiro com «Depositar PIX» ou «Saldo Disponível» (controlo positivo: «Comprar Passe Desafio» presente) |
| Deploy web | ✅ `6aed9f0f…` em produção, «CDN requesting 0 files» (= draft validado `6aed9d9a…`): mainnet, o site **mantém** o PIX |

## Provas
Build com a flag vs sem a flag vs mutante M2 (`_logs/UTAC132_SEG0-3.md`). Mutação **9/9 RED** com md5 restaurado. Guarda exit 0 sobre o `.aab` extraído.

## Pendências
- **Não observado no aparelho:** o splash sem ícone e a Carteira sem Saldo/PIX foram provados pelos recursos e pelo bundle do AAB.
- **DEBT-088** continua aberta: «Saldo R$ insuficiente. Recarregue via PIX.» (`CardLance`) e os outros textos latentes ainda vão no AAB. O guarda aceita mais strings na lista.
- `androidx.core:core-splashscreen` ficou nas dependências, inerte.
- O envio do AAB v9 à Play continua com o operador/Ruan (substitui o v8, que não foi promovido).
