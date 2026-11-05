# UTAC129 — RELATÓRIO FINAL · Lance sem Passe, boas-vindas, links do APK e AAB v8

Tipo `produto` (+ publicação + config) · baseline `12e31d4` · commits `e8533c6` + `5841193` (+ fecho) · Opus 5.5 · 2026-11-05.
**Veredicto: FECHADO COM PENDÊNCIAS DECLARADAS.** Validador adversarial: **APROVADO COM RESSALVAS** (1 ⚠️ escalado).

## O que existe agora
| Frente | Estado | Onde |
|---|---|---|
| A — lance sem Passe | ✅ o lance Relâmpago gasta só pontos de lance; a missão +10 deixa de estar atrás de uma compra. **Palpite mantém o Passe** (R18-129-3) | `netlify/functions/lance-relampago.mjs` |
| B — boas-vindas | ✅ +50 pontos de lance no login, uma vez por conta (ref fixa + CAS), teto de 1 500 ms, nunca bloqueia o login | `netlify/functions/auth-user.mjs`, `_lib/fontes-lance.mjs` |
| C — links e textos | ✅ convite com `ORIGEM_PRODUCAO` (era `https://localhost` no APK); `desafiogut.com` → origem de produção; `CardLance` sem «Precisa de 1 Passe» nem botão de compra | `src/lib/apiOrigin.js`, `PainelIndicacao.jsx`, `ChatbotWidget.jsx`, `MercadoLances.jsx`, `useComprarPasse.js`, `CardLance.jsx` |
| D — flag | ✅ `isLeilaoAtivo.android = true` no Supabase (`jsonb_set`, outras chaves intactas) e no Blob; endpoint vivo confirma | `config_remota.recursos_app` |
| E — AAB v8 | ✅ `C:\Users\Moltbot\Desktop\DesafioGUT-v8\DesafioGUT-v8.aab` · versionCode 8 · SHA-256 `40934701af77b05daa5ecc3512b7ad467610bb583004dd95b92f4b32874c2b00` · certificado = v7 · guarda exit 0 sobre o `.aab` extraído | — |
| Deploy | ✅ `6aec4d740627b568f86da44c` ready (`--prod --build`, foreground) | Netlify |

## ⚠️ O que vale JÁ e o que só vale com a v8
| Vale **já** na v7 instalada (servidor e config) | Só vale com a **v8 aprovada pela Google** |
|---|---|
| lance aceite sem Passe (servidor) | link de convite correcto (hoje a v7 partilha `https://localhost/?ref=…`) |
| +50 de boas-vindas no próximo login | `CardLance` sem «Precisa de 1 Passe» / «Comprar Passe Relâmpago» |
| aba do Menor Lance Único deixa de mostrar «Edições na versão Web» (flag) | link «versão Web» e mensagem do PIX com o domínio certo |

Nota: com `EM_BREVE_MODE = true` (R18-129-2), a aba mostra o cartão vazio «SEM EDIÇÃO», sem formulário de lance, na v7 **e** na v8. Ninguém licita ainda, e a missão +10 continua por alcançar (DEBT-087).

## Decisões do operador (R18 — 3 lugares: `_logs/UTAC129_SEG-1_MEDICAO.md`, este relatório, `CLAUDE.md`)
- **R18-129-1** boas-vindas = 50 pontos de lance, uma vez por conta.
- **R18-129-2** manter `EM_BREVE_MODE = true` na v8.
- **R18-129-3** libertar só o lance; o palpite continua a consumir Passe Programado.
- **R18-129-4** RAM medida antes da suíte e do build (o operador fechou programas; o executor fechou o headless que sobrava do UTAC124, o Edge e o WhatsApp, com autorização).

## Provas por HARD GATE
| Gate | Resultado |
|---|---|
| 1 Medir antes | SEG-1 com linhas confirmadas e 4 conflitos levados ao operador antes de tocar |
| 2 Não inventar | o valor das boas-vindas veio do operador (o Regulamento não o fixa) |
| 3 Escopo | ficheiros das entregas + 2 testes que codificavam o comportamento removido (`utac120-inventario`, `utac110i1-front-billing`), declarados; `registar-palpite.mjs` e `Dashboard.jsx` intactos |
| 4 Preservar | suíte inteira verde; palpite, Billing e PWA sem mudança (A/B da flag: `pwa`/`ios` iguais) |
| 5 Mínimo | lance −13/−14 linhas; links = troca de constante |
| 7 Mutação | M1 (trava) 3+1 RED · M2 (sem chamada) 5 RED · M3 (ref variável) 4 RED · M4 (sem catch) 1 RED · M5 (sem teto) RED · M6 (devolução do Passe) 1 RED · md5 restaurado em todos. Validador: 16 mutantes, 14 mortos |
| 8 Bidirecional | positivo, negativo e inválido em cada teste novo (A1-A6, B0-B7, C1-C5) |
| Idempotência / concorrência (tipo produto) | 10 logins em `Promise.all` → 1 crédito |
| 9 Validador | subagente em worktree próprio: APROVADO COM RESSALVAS (`_logs/UTAC129_SEG4_VALIDADOR.md`) |
| 10 Foreground | deploy, build e commits em foreground; nunca `git add -A` |
| Suíte | **frontend 1301/1301 · backend 1456/1462** (os 6 restantes são skips de sempre) |

## Pendências (não executadas)
- **DEBT-083** ⚠️ o GUTO cita `desafiogut.com` (`_lib/guto-perfis.mjs:90/96`): ficheiro fora da autorização. É do servidor, vale sem AAB.
- **DEBT-084** textos e contador de Passe incoerentes (Carteira, GUTO, Regulamento Art. 13º-I).
- **DEBT-085** botão por pontos sem teste (pré-existente).
- **DEBT-086** boas-vindas repetíveis ao recriar a conta (anti-abuso).
- **DEBT-087** missão inalcançável enquanto `EM_BREVE_MODE = true`.
- **Boas-vindas em produção não observadas:** não criei contas falsas em produção. Confirmar no 1.º login real (`historico_lance` com `motivo:"boas-vindas"`).
- **UTAC124 continua por fazer:** o `assetlinks.json` só tem o SHA debug, logo o login Google pelo APK da Play continua a falhar. Acrescentar o SHA de App Signing da Play Console (+ upload `85:44…`) é uma mudança só de servidor.
- **Riscos do UTAC126/127 que este UTAC não resolve** (o operador decidiu ligar a flag): sem parecer jurídico no repo; o Passe continua a dar +200 pontos de lance.
- **Envio do AAB à Play:** operador/Ruan (fora do escopo).
