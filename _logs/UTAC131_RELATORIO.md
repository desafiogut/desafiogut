# UTAC131 — RELATÓRIO · assetlinks.json com a chave de App Signing da Play

Tipo `infra` · baseline `94dc50d` · commit `ebad6dc` (+ fecho) · Opus 5.5 · 2026-11-05.

## Feito
- `desafio-gut/frontend/public/.well-known/assetlinks.json` (servido em `/.well-known/assetlinks.json`): mesma declaração
  (`delegate_permission/common.handle_all_urls`, `android_app`, `com.desafiogut.app`), agora com **3** impressões SHA-256:
  - `70:6F:9E:83…9F:08` — debug (mantida, MC88.5)
  - `85:44:BC:E8…17:29` — upload (medida no AAB, UTAC124)
  - `10:25:43:5B…9B:AB` — **App Signing da Play** (fornecida pelo operador do Play Console)
- Teste `src/__tests__/utac131-assetlinks.test.mjs` **3/3** (JSON válido, as 3 chaves exactas, formato). Controlo positivo: o
  mesmo teste contra o ficheiro antigo → **RED** (J2).
- Deploy de produção `6aecc1469b75d2bdadc685ed` (`netlify deploy --prod --build`, foreground): «Deploy is live».
  ⚠️ Declarado: este deploy publica também as mudanças do Início do **UTAC130** (já commitadas e validadas; a produção estava
  no deploy do UTAC129).
- Ficheiro público: `curl …/.well-known/assetlinks.json` → **HTTP 200 `application/json`**, com as 3 chaves.

## Validação na API oficial do Google (Digital Asset Links)
| Chave | Logo após o deploy |
|---|---|
| debug `70:6F…` (controlo) | `{"linked":true,"maxAge":"3300s"}` |
| Play `10:25…` | `{"maxAge":"3600s"}` (ainda não ligada) |
| upload `85:44…` | `{"maxAge":"3600s"}` |
| chave inventada (controlo negativo) | `{"maxAge":"3600s"}` |

**Porquê:** a API guarda em cache a lista de declarações **do site inteiro** (até 1 h). O `maxAge` de 3300 s da chave debug
mostra que a cópia em cache foi lida ~5 min antes do deploy (provavelmente pela minha consulta de controlo do SEG-1). Até essa
cópia expirar, o verificador do Google continua a ver o ficheiro antigo. ⇒ **Confirmação `linked:true` da chave da Play: PENDENTE**,
com um verificador em segundo plano a repetir a chamada a cada 5 min (limite de 90 min).
Lição: não consultar a API para o site antes de publicar a alteração; a resposta, mesmo para uma chave de controlo, prende a lista antiga durante 1 h.

## ⚠️ Para os utilizadores (cache do Android)
O Android verifica os App Links **na instalação ou na actualização** da app. Quem já tem o app instalado **continua com a
verificação antiga** (falhada) até **desinstalar e instalar de novo**, ou até receber uma **actualização** pela Play (ex.: o
AAB v8), que dispara nova verificação. Instalações novas, feitas depois de a API do Google passar a ver o ficheiro novo, ficam
logo verificadas. Verificação no aparelho: `adb shell pm get-app-links com.desafiogut.app` deve mostrar
`silly-stardust-ca71bc.netlify.app: verified`.

## Pendências
- Confirmação `linked:true` da chave da Play na API do Google (cache de até 1 h): a correr em segundo plano.
- Teste no aparelho: instalar pela Play (ou reinstalar) e fazer login Google. Deve voltar à app, sem ficar no Chrome.
- O browser padrão continua a importar (MC88.5.3: com o Opera o ciclo não fechava). Esta correcção resolve a verificação, não esse caso.
