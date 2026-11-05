# UTAC130 — RELATÓRIO FINAL · Início sem «Saldo (R$)», tiles «Carteira» e «Passe Desafio», AAB v8 corrigido

Tipo `produto` · baseline `eae7654` · commits `f3a86a3` + `cdea860` (+ fecho) · Opus 5.5 · 2026-11-05.
**Veredicto: FECHADO COM PENDÊNCIAS DECLARADAS.** Validador adversarial (leve): **APROVADO COM RESSALVAS** (⚠️1 e ⚠️2 corrigidos, não re-validados; ⚠️3 pendente).

## O que se apurou
- **A premissa «o UTAC129 reintroduziu Saldo/PIX» não se confirma:** nenhum commit do UTAC129 tocou na Carteira nem no Início.
- **Carteira no APK:** «Saldo Disponível» e «Depositar PIX» já estão escondidos (UTAC116: `pixPermitido(detectarPlataformaNativa())`;
  a WebView serve sempre `https://localhost`, sem `server.url`). Prova: `utac116-pix-apk` 10/10. **Sem alteração.**
- **O R$ que o APK mostrava de facto** era o tile «Saldo (R$)» do **Início**, sem condição nenhuma de plataforma.
- ⚠️ **Hipótese para o print da Carteira (por confirmar no aparelho):** um APK anterior ao v4, ou o **site no navegador do
  telemóvel**: o login Google pelo APK da Play cai no Chrome porque o App Link não verifica (UTAC124). Lá aparece o PWA, que
  mostra Saldo/PIX por desenho. Barra de endereço visível = navegador.

## O que mudou (Início, `src/pages/Dashboard.jsx`)
| Tile | Antes | Agora |
|---|---|---|
| 1 | «Saldo (R$)» → Carteira | **«Carteira» 👛 «N pts»** (pontos de lance) → Carteira |
| 2 | «Passe Desafio» «X / 50» (pontos de cartão) → Ofertas Programadas | **«Passe Desafio» «N»** (total do inventário Relâmpago + Programado) → Carteira |
| 3, 4 | «Lances Únicos», «Total de Lances» | **iguais** (render byte-igual, sha `0b037a…`) |
- Nos dois tiles novos, «a carregar» = skeleton e sem conta/erro/ilegível = «—». Nunca um 0 inventado: os dois passam pelo memo `address|authToken` do UTAC107c (achado ⚠️1).
- Navegação (Frente C): já estava correcta (`/mercado`, `/ofertas-programadas`).

## AAB v8 (sobrescreve o v8 do UTAC129, autorizado)
`C:\Users\Moltbot\Desktop\DesafioGUT-v8\DesafioGUT-v8.aab` · versionCode 8 · SHA-256 `222e30650b2fe09d166eb85060600682e357618099d3cf11d77f7b0a02f2fb24` ·
certificado = v7 · guarda exit 0 sobre o `.aab` extraído. Compilado com excepção à ressalva A14 dada pelo operador (RAM 1 213-1 422 MB).

## Decisões do operador (R18 — `_logs/UTAC130_SEG-1_MEDICAO.md`, este relatório, `CLAUDE.md`)
R18-130-1 prints do APK ⇒ garantir que o APK nunca mostra Saldo/PIX · R18-130-2 tile «Carteira» = pontos de lance, em todas
as plataformas · R18-130-3 o executor pode fechar programas para RAM · R18-130-4 compilar com a RAM abaixo de 1 500 MB
(excepção à A14) · AAB sobrescreve o v8 (versionCode 8, sem v9).

## Provas
| Gate | Resultado |
|---|---|
| 1 Medir | SEG-1 refutou a premissa com `git log` e localizou a causa real (tile do Início) antes de tocar |
| 7 Mutação | M7 (repor «Saldo (R$)») 10 RED · M8 (Passe → Ofertas Programadas) 2 RED · M9 (sem memo) RED · md5 restaurado |
| 8 Bidirecional | dados / vazio / a carregar / sessão a cunhar / erro / sem conta / sequência de renders |
| 9 Validador | APROVADO COM RESSALVAS (`_logs/UTAC130_SEG4_VALIDADOR.md`) |
| Suíte | **frontend 1303/1303 · backend 1456/1462** |
| ⚠️ Erro meu herdado do UTAC129 | `utac123-build-blindado` fixava `versionCode 7`; o bump para 8 só tinha sido seguido de re-corrida do backend. Corrigido aqui |

## Pendências
- ⚠️3 **Confirmar no aparelho com este v8** que a Carteira não mostra Saldo/PIX. Se o print era do navegador, a causa é o **UTAC124** (`assetlinks.json` só com o SHA debug: o login Google cai no Chrome).
- **DEBT-088** textos de R$/PIX latentes sem condição de plataforma (`SemSaldoBanner`, mensagem de leitura do saldo, `CardLance:270`, toast, Configurações).
- **Deploy web não feito** (não pedido): o Início do site continua com os tiles antigos até ao próximo `netlify deploy --prod --build`.
- O envio do AAB à Play continua com o operador/Ruan.
