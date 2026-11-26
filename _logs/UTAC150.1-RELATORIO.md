# UTAC150.1 — Deploy, validador e entrega do AAB vc15 — RELATÓRIO (2026-11-26, Opus 5.5)

## Entrega para o Ruan
- **Link:** https://gofile.io/d/jo4UbOJe (o MD5 devolvido pelo GoFile é igual ao local)
- **Ficheiro:** `DesafioGUT-v15.aab` — **versionCode 15 / versionName 1.5.0**, 32 437 248 B
- **SHA-256:** `091c2394e9b4cd8bfc8dc45256f0313d1df1322917d38b73ad7dcb86817ec581`
- **MD5:** `df5a5b8057ed5addd9a7d826561132d3`
- `jar verified`; certificado igual ao do v13 (SHA-256 `85:44:BC…17:29`); guarda `validarAmbienteProducao` corrido no Gradle
- Substitui o vc15 anterior (`ebea578c…`), que nunca foi entregue: este leva as 3 correcções do validador.

## Frentes
- [x] **A — push + deploy:**
  - push `f8e0d71..a7d50cd`;
  - deploy `6b08206e` (backend v8.0, gate 3.7) e depois `6b082d0e` (correcções do validador; bundle `index-CDEQu9bm.js`).
- [x] **Verificação em produção:**
  - o GUTO responde pelo v8.0: versão 8.0, vigência no Art. 28, Art. 19 (o perdedor perde o Passe);
  - o site envia o gate 3.7 e mostra o v8.0;
  - ⚠️ o aceite 3.7 **no servidor** não foi medido sem conta: o endpoint só verifica a versão depois da sessão. Está provado pelo deploy e pelo teste `mc104`.
- [x] **B — validador adversarial: APROVADO COM RESSALVAS** (`_logs/UTAC150_SEG4_VALIDADOR.md`). Corrigiu 3 textos visíveis contra o v8.0:
  - a conversão citava o Art. 23 (é o Art. 21);
  - a Carteira dizia «Passe opcional»;
  - a aba OP dizia «palpite dá pontos EXTRA».
  
  Integração por cherry-pick, suíte **1374/1426 · 1535/1624 VERDE**, AAB regerado e novo deploy.
- [x] **C — link GoFile + SHA-256** (acima).

## Desvios declarados
- **A14:**
  - deploy 1 com 1438 MB (R18-150.1-A);
  - **o build do AAB regerado arrancou com 1106 MB sem nova medição** (falha minha; o build terminou bem);
  - deploy 2 com 1397 MB.
- **HI5 (1 h) excedida:** o validador demorou ~33 min.

## Pendências
- **DEBT-114** (jurídico, não bloqueia):
  - apuração manual e número final não publicado (Art. 17 § único);
  - consentimento revogável para publicar nomes (Arts. 7º/25 § único);
  - remissões ao Art. 17 nos Arts. 6º/15.
- **DEBT-115** (notas do validador).
- **DEBT-111(b)** — fonte do número real da especial palpite.
