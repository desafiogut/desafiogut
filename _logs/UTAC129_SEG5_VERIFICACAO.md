# UTAC129 — SEG3 (build) + SEG5 (deploy, config e verificação em produção)

## SEG3 — AAB v8 (R18-129-4: RAM medida antes)
| Passo | Resultado |
|---|---|
| RAM antes do build | 1 819 MB (≥ 1 500) |
| `npm run build:apk` | exit 0 · Netlify Build Complete (4 min) · `validar:dist` «✓ bundle coerente com PRODUÇÃO (mainnet)» · `cap sync` OK |
| `gradlew bundleRelease` (JAVA_HOME = Android Studio jbr) | `> Task :app:validarAmbienteProducao` ✓ · **BUILD SUCCESSFUL in 51s** |
| Artefacto | `C:\Users\Moltbot\Desktop\DesafioGUT-v8\DesafioGUT-v8.aab` · 32 441 393 B · SHA-256 `40934701af77b05daa5ecc3512b7ad467610bb583004dd95b92f4b32874c2b00` |
| versionCode / versionName | `8` / `1.0.0` (manifesto fundido de release) |
| Assinatura | `jar verified` · certificado de upload SHA-256 `85:44:BC:E8…17:29` = o do v7 |
| Guarda sobre o `.aab` EXTRAÍDO | exit 0 · «chave RPC Sepolia embutida: não» · «✓ bundle coerente com PRODUÇÃO (mainnet)» |
| Conteúdo do AAB | «Precisa de 1 Passe Relâmpago» 0 chunks · `https://desafiogut.com` 0 · origem de produção 2 chunks · «Precisa de 1 Passe Programado» 2 (palpite mantém o Passe, R18-129-3) |

## SEG5 — publicação (A/B pareado)
| Medida | ANTES | DEPOIS |
|---|---|---|
| Deploy de produção | `12e31d4` (2026-11-01) | `6aec4d740627b568f86da44c` ready, 2026-11-05T09:33Z, título «UTAC129 5841193 …» (`netlify deploy --prod --build`, foreground; CDN 40 ficheiros + 94 funções) |
| Bundle de entrada | `index-C8XgglMq.js` | `index-VMuhDkPc.js` |
| Bundle servido (24 chunks) | — | trava do lance 0 · `desafiogut.com` 0 · origem de produção 2 |
| `lance-relampago` sem auth | — | 401 `token_ausente` (função viva) |
| `auth-user` corpo vazio | — | 400 `endereco_invalido` (função viva) |
| `/regras-oficiais` | 200 | 200 |
| `recursos-app?plataforma=android` | `isLeilaoAtivo:false` | **`isLeilaoAtivo:true`**, `isPagamentoNativoAtivo:true` (intacto) |
| `…pwa` / `…ios` | true / false | true / false (sem mudança) |

## Frente D — config (depois do deploy, de propósito)
- Cópia antes: `_logs/UTAC129_SEG5_BACKUP-config_remota-ANTES.json`.
- Supabase: `UPDATE config_remota SET valor = jsonb_set(valor,'{isLeilaoAtivo,android}','true'), atualizado_em = now() WHERE chave='recursos_app'` → devolveu
  `{"isLeilaoAtivo":{"ios":false,"pwa":true,"android":true},"isPagamentoNativoAtivo":{"ios":false,"pwa":false,"android":true}}`
  (as outras chaves intactas), `atualizado_em 2026-11-05 09:40:06Z`.
- Blob `config-experiencia/recursos_app`: `blobs:set` com o JSON completo; `blobs:get` confere byte a byte.
- **Reversão:** o mesmo `jsonb_set` com `'false'` + `blobs:set` com `android:false`.

## O que NÃO foi verificado (declarado)
- **Boas-vindas em produção:** não criei contas de teste na base de produção (não escrevo dados falsos em produção). Prova = os testes B1-B7 com o ledger real. O 1.º login real depois do deploy deve deixar uma entrada `motivo:"boas-vindas"`, `delta:50` em `pontos.historico_lance`.
- **Sem aparelho:** o ecrã do APK v7 com a flag virada não foi observado. Pela leitura do código, a aba deixa de mostrar «Edições na versão Web» e passa ao cartão vazio «SEM EDIÇÃO» (`EM_BREVE_MODE`).
