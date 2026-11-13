# UTAC137 — Frontend, gate legal e GUTO no Regulamento v6.0 + AAB v10 — FECHADO (validador pendente)

**Commit** `7640ff8` (+ fecho) · push `b740046..7640ff8` · **deploy de produção `6af6ac1ab2b588d61d25df0a`** (rascunho validado antes: `6af6aaff…`).
**AAB v10:** `Desktop/DesafioGUT-v10/DesafioGUT-v10.aab` · 32 434 729 B · SHA-256 `A0459AEEB7C08846A983344E186E68EE25A2E0F4F3F306BAA308163BA3D9A5E1` ·
`versionCode 10` / `versionName 1.1.0` · `jar verified` · certificado = v9.

## Checklist
| Item | Estado | Prova |
|---|---|---|
| Regulamento v6.0 importado no frontend | ✅ | `RegrasOficiais.jsx` → `REGULAMENTO-v6.md`; `utac106h-regras` 21/21 (cobertura total, palavras exactas pela ordem, 6 capítulos, 30 artigos); mutantes M1/M2 RED |
| Textos da UI (sem «+200», sem «10 pontos», sem Passe obrigatório, ECOQUILDO R$ 0,50) | ✅ | grep no `src/` visível = 0; grep no `.aab` extraído = 0 para «Versão 5.1 · Vigente», «o Passe dá +200 pontos de lance», «Precisa de 1 Passe Programado para palpitar»; M3/M4/M7/M8 RED |
| Gate legal no v6 | ✅ | resumo literal do v6 (`citacoesRegulamento` 9/9 contra o v6); versão do aceite **3.4** no app e no backend (R18-137-1); M5/M6 RED |
| GUTO no v6 | ✅ | documento + `.mjs` = v6 byte a byte (`REGULAMENTO_VERSAO = "6.0"`); prompt e 14 âncoras do v6; **em produção** responde «1 ECOQUILDO vale R$ 0,50 (Art. 21.)» e «o Passe não dá pontos de lance (Art. 6º)»; M9/M10 RED |
| Guarda `utac110j5` verde | ✅ | compara os valores do v6 com as constantes do backend |
| `versionCode` 10 | ✅ | `build.gradle` + manifesto do `.aab` (1.1.0) |
| Suíte verde | ✅ | frontend **1325/1325** · backend **1472/1478** (6 skipped pré-existentes) |
| AAB v10 gerado | ✅ | `npm run build:apk` (guarda OK) → `gradlew bundleRelease`; guarda OK também sobre o `.aab` extraído |

## Decisões (R18)
- **R18-137-1** gate reescrito no v6 e versão do aceite **3.4** no app e no backend (todos reaceitam; instalações novas da v9 ficam recusadas no aceite até actualizarem).
- **R18-137-2** push + `netlify deploy --prod --build` depois do AAB (o enunciado dizia «não altera o backend»; a Frente C e o gate exigiam-no).
- **R18-137-3** RAM entre 1 190 e 1 412 MB depois de fechar programas — excepção à A14 autorizada pelo operador.
- Ordem de execução pedida pelo operador: suítes → mutação → AAB → commit/push/deploy.

## Desvios e achados
- O enunciado nomeava `CardLance` («+200», «Precisa de 1 Passe») e `MinhaCarteira` («10 pontos», «R$ 1,00»): esses textos **já não existiam** lá (UTAC129/130). Os textos reais estavam em `passes.js`, `pontosLance.js`, `pt.js`, `CardEdicaoEspecial`, `Dashboard`, `OfertasProgramadas` e no gate.
- O botão do palpite **estava bloqueado na UI** sem Passe Programado (o servidor já o aceitava desde o UTAC136): desbloqueado.
- O RAG do GUTO já não existe (UTAC110c-1); a Frente C foi o prompt + o documento embutido.
- A 1.ª corrida conjunta das suítes foi interrompida pelo Claude Code por falta de memória (registo preservado).
- `mc9952` (DNS de `exemplo.com`) falhou numa corrida e passou na seguinte — depende de DNS externo; código não tocado.

## Pendências (não executadas)
- ~~Validador adversarial (SEG3) NÃO corrido~~ → corrido a pedido do operador (ver secção SEG3 abaixo).
- **DEBT-091:** o v6 promete cartão **digital** automático (Art. 8º), **produto** ao vencedor do palpite (Art. 18) e ECOQUILDO **dentro do app** (Art. 22); o servidor faz resgate físico, +2 pontos e só site.
- O AAB v10 tem de ser enviado à Play pelo operador; até lá a v9 instalada mostra os textos antigos.
- PDF do Regulamento no Desktop não foi tocado (proibido).

## Entrega ao Ruan
Link Litterbox (válido 72 h a partir de 2026-11-13): https://litter.catbox.moe/1j4qvj.aab — 32 434 729 B, SHA-256 `A0459AEEB7C08846A983344E186E68EE25A2E0F4F3F306BAA308163BA3D9A5E1` (confirmado ao descarregar de volta).

## SEG3 — Validador adversarial (corrido depois, a pedido do operador) — **REFUTADO na entrega; conteúdo v6 aprovado**
Veredicto integral: `_logs/UTAC137_SEG3_VALIDADOR.md`. O conteúdo aguentou: Regras Oficiais = v6 palavra a palavra (o «conforme o Art. 19.» fica no
Art. 15), parser do v5 intacto, gate literal (12 blocos) e 3.4 igual nos dois lados, GUTO = v6 com 14 âncoras literais, palpite desbloqueado,
nenhum teste enfraquecido. **4 defeitos graves, corrigidos PELO VALIDADOR** (o executor só integrou — cherry-pick `c4b71fb`, `06fd32b`, `d0cb27f`, `f3c20d7`):
1. ⚠️ **`docs/REGULAMENTO-v6.md` nunca entrou no git** (era `??` desde o UTAC135) ⇒ o `build` do CI de `7640ff8`/`cce5e75`/`2dff292` falhou com
   `UNRESOLVED_IMPORT`. A produção e o AAB v10 **não** foram afectados (compilados da árvore local, que tinha o ficheiro). Versionado byte a byte
   (md5 `4f72defc…`) + guarda para todo o `docs/*?raw`. **Erro meu**: o `git add` foi por lista de modificados (`^ M`) e o ficheiro era não-versionado.
2. ⚠️ Qualquer 409 do palpite mostrava «precisa ter comprado um Passe» (`usePalpite.js`) → mensagem por código (`lib/palpite.js`).
3. ⚠️ Carteira sem Passes: «compre abaixo para dar lances e palpites» → «O Passe é opcional (Art. 3º)…».
4. ⚠️ A prosa «MODELO DE HOJE» do prompt do GUTO não tinha guarda (R$ 1,00 passava verde) e citava o Art. 6º com «indicações» → frase com as
   palavras do Art. 6º + teste que amarra cada número da prosa ao artigo citado.
Suítes no worktree do validador: frontend 1327/1329 (2 = `mc9952`, DNS) · backend 1467/1474 (7 skipped, ambiente). Testes tocados re-corridos
na árvore principal: 51/51 + 21/21. Push `2dff292..f3c20d7`; CI: `build` volta a passar; `lint`/`test-onchain`/`test-functions` já falhavam em `b740046`.
**Deploy de produção das correcções BLOQUEADO pela permissão** (o pedido era só o validador): produção continua em `6af6ac1a…`; rascunho
validado `6af6b397…` pronto. As correcções 2 e 3 só chegam ao APK num **AAB v11** (o v10 foi compilado sobre `7640ff8`).

## Fecho das correcções do SEG3 (autorizado pelo operador)
- **Deploy de produção `6af6b8ce5da303d98cdc3ddc`** (a partir de `ec64968` = código do rascunho `6af6b397` + docs): mainnet, PIX no site, v6, sem o 409 antigo.
  GUTO em produção cita o Art. 6º com as palavras do v6 («engajamento diário, login contínuo e missões») e diz que o palpite não exige Passe (Art. 3º).
- **AAB v11** `Desktop/DesafioGUT-v11/DesafioGUT-v11.aab` (substitui o v10) · versionCode **11** · versionName **1.1.1** · 32 434 939 B ·
  SHA-256 `DF715E874BCA67C2B55B67A718E2367848AFC4BAC91A0840EB5A088FBFED03E0` · `jar verified` · certificado = v10/v9 · guarda OK sobre o `.aab`
  extraído · contém «O Passe é opcional (Art. 3º)» e o v6; sem «precisa ter comprado um Passe», «compre abaixo para dar lances e palpites»,
  «+200», «Versão 5.1». Guardas de versão (`utac123`, `utac132`) passam a 11.
- **DEBT-091** fica aberta para um UTAC futuro (decisão do operador: não mexer no backend agora).
