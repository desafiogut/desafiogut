# UTAC150 — SEG4 · VALIDADOR ADVERSARIAL (2026-11-26, Opus 5.5)

Alvo: código `715b0c5` (sobre `f8e0d71`), docs `8caf6dd`/`ed76f5a`, AAB `DesafioGUT-v15.aab` (sha256 `ebea578c…8d79`), deploy `6b08206e`.
Worktree isolado `tmp-utac150-val/wt` (HEAD destacado em `ed76f5a`). Nada foi escrito em produção. Nenhum AAB gerado.

## Veredicto: **APROVADO COM RESSALVAS**

O núcleo da entrega aguenta a refutação: a transcrição do v8.0 é fiel ao PDF linha a linha, as cópias do GUTO batem,
o gate 3.7 é texto literal, o backend aceita 3.7 + 3.4/3.5/3.6 e recusa o resto, os +2 pontos saíram sem partir as
compensações do ECOQUILDO, o AAB é vc15/1.5.0 com o certificado do v13 e a produção está no v8.0.
Mas ficaram **3 textos visíveis que contradizem o v8.0** (2 com citação errada), todos no bundle do AAB vc15 e no site.
Corrigi-os no worktree, com teste e mutantes. **Corrigi-los obriga a regerar o AAB e a novo deploy web.**

---

## Achados

### ⚠️1 — Regras Oficiais citam o «Art. 23» para a conversão ECOQUILDO → Passe (no v8.0 é o Art. 21; o 23 é o Indique e Ganhe)
- Evidência (fonte): `desafio-gut/frontend/src/lib/pontosLance.js:120`
  `` `A cada ${PROPORCOES.ecoPorConversao} ECOQUILDOs, o sistema converte-os automaticamente em 1 Passe Desafio (Art. 23).` ``
  `PROPORCOES_TEXTO` é renderizado em `RegrasOficiais.jsx` (import na l. 35), por cima do texto do v8.0.
- Evidência (AAB vc15, comentários já removidos pelo minificador): `pontosLance-B_wTfCpX.js: … converte-os automaticamente em 1 Passe Desafio (Art. 23).`
- Evidência (produção, GET público): o mesmo chunk `assets/pontosLance-B_wTfCpX.js` é servido pelo site com `(Art. 23)`.
- v8.0: `Art. 21. … § único. A cada 50 (cinquenta) ECOQUILDOs … conversão automática e imediata …`; `Art. 23. Por meio do programa "Indique e Ganhe" …`.
- Porque escapou: `citacoesRegulamento.test.mjs` só verifica o gate e uma lista curada de ficheiros; o teste que fixava esta frase (`utac110j5 C`) está em `test.skip`.
- **Tratamento:** corrigido para `(Art. 21)`. **Regera AAB: sim. Novo deploy: sim (frontend web).**

### ⚠️2 — Carteira sem Passes diz «O Passe é opcional (Art. 3º): lances e palpites não precisam dele.»
- Evidência: `src/pages/MinhaCarteira.jsx:393` (bloco `data-sem-passes`, mostrado a todo o utilizador com 0 Passes);
  no AAB: `MinhaCarteira-Ct1DqiaR.js: … children:"Ainda não tem Passes. O Passe é opcional (Art. 3º): lances e palpites não precisam dele."`
- Contradiz o v8.0 (Art. 3º «exige a aquisição prévia do Passe Desafio correspondente»; Art. 6º «Sem Passe disponível não é possível registrar lance nem palpite»)
  e o próprio servidor (`registar-palpite.mjs:94` e `lance-relampago.mjs:304`: `consumirPasse` → 400 `sem_passes_disponiveis`).
- Pré-existente (texto do v6, UTAC137-SEG3), mas a tarefa pedia conferir as citações da Carteira contra o v8.0, e a guarda
  `src/__tests__/utac137-seg3-validador.test.mjs:76` **fixava activamente** a frase falsa (`assert.match(bloco, /O Passe é opcional \(Art\. 3º\)/)`).
- **Tratamento:** texto passou a «Ainda não tem Passes. Sem Passe disponível não é possível registrar lance nem palpite (Arts. 3º e 6º).»
  (palavras literais do Art. 6º); a guarda do UTAC137 foi invertida. Nota: a 1.ª versão citava «(Art. 6º)» sozinho e a suíte completa
  ficou VERMELHA 1 (`citacoesRegulamento.test.mjs:171`, guarda do v5 que proíbe «(Art. 6º)» na Carteira, onde era a citação do preço);
  passei a «(Arts. 3º e 6º)» — o Art. 3º também exige o Passe — sem mexer nessa guarda. **Regera AAB: sim. Novo deploy: sim (frontend web).**

### ⚠️3 — Ofertas Programadas ainda promete pontos pelo palpite: «O palpite dá pontos EXTRA, mas o cartão é conquistado só com os pontos das suas compras.»
- Evidência: `src/pages/OfertasProgramadas.jsx:57-59` (`CARTAO_DESCRICAO`, renderizado na l. 319 em render normal, no vidro «Cartão»),
  o MESMO ficheiro em que o executor trocou «+2 pontos» por «50 ECOQUILDO»; no AAB: `OfertasProgramadas-C8qot-mK.js: … O palpite dá pontos EXTRA, mas …`.
- Contradiz R18-150-D (os +2 pontos saíram) e o v8.0 (Art. 18: só os 50 ECOQUILDOs).
- **Tratamento:** «O palpite mais próximo ganha 50 ECOQUILDO; o cartão é conquistado só com os pontos das suas compras.»
  **Regera AAB: sim. Novo deploy: sim (frontend web).**

### ⚠️4 (escalado, não implementado) — consentimento para publicar nomes (Arts. 7º § único / 25 § único)
- O gate cita o Art. 7º **sem** o seu § único (o meu verificador: `PREFIX 7º (omite: § único. A publicação de que trata este artigo observará a LGPD, mediante conse…)`),
  enquanto nos Arts. 17, 18 e 21 o executor incluiu o § único. O § único do Art. 7º e o do Art. 25 são justamente o que o v8.0 acrescenta sobre
  consentimento «colhido no ato do cadastro ou da participação, podendo ser revogado». O gate não tem caixa para isso nem há revogação.
- Já está na DEBT-114(b) (o executor mediu que não existe caixa nem revogação). Acrescento só o facto do resumo truncado do Art. 7º.
- Decidir se o gate é o «ato do cadastro», se o resumo deve mostrar o § único e como se revoga = **operador + jurídico**. Não implementado.

### ℹ️5 — Remissões internas do próprio v8.0 (texto fechado; jurídico)
- Art. 6º («sem prejuízo do disposto no Art. 17») e Art. 15 («benefícios … conforme o Art. 17»): o Art. 17 trata do vencedor; os benefícios mantidos estão no Art. 19.
  O PDF v8 de 23/11 dizia «Art. 19» no Art. 15 (medido com `pdftotext`). Já na DEBT-114(c) para o Art. 15; o Art. 6º tem o mesmo padrão. Não alterado.

### ℹ️6 — GUTO (perfis corporativo/admin) cita «Arts. 12º e 24º» para as Cotas de patrocínio
- `netlify/functions/_lib/guto-perfis.mjs:508,509,516`. No v8.0 o Art. 12 é o pagamento do vencedor por PIX e o 24 o Google Billing; o v8.0 não fala de Cotas.
  Pré-existente (vem do v5) e só nos perfis corporativo/admin. Não corrigido (o visitante e o comum não o vêem). **Se corrigido: novo deploy sim, AAB não.**

### ℹ️7 — Cabeçalho do `docs/GUTO-REGULAMENTO.md` (que vai no prompt do GUTO) descreve as mudanças de forma incompleta
- Diz «altera os Arts. 6º, 12, 17, 18, 19, 21 e 25 … retira o antigo Art. 26». Medido artigo a artigo contra o v7: também mudaram o Art. 7º (ganhou § único)
  e o Art. 15 (remissão 19 → 17), e o antigo Art. 23 passou ao § único do Art. 21. O corpo do Regulamento não é afectado. Não corrigido.

### ℹ️8 — Texto «Cartão colecionável físico» em Ofertas Programadas vs Art. 8º («estritamente digital»)
- `OfertasProgramadas.jsx:57`. Pré-existente (o Art. 8º é igual no v7 e no v8.0) e há um fluxo de resgate com morada. Decisão de produto/jurídico. Não alterado.

### ℹ️9 — DEBT-113 desactualizada no `ed76f5a`
- Diz que a produção continua no backend do UTAC149 (gate 3.6, GUTO v7). Medido hoje (secção Produção): o site serve o gate 3.7 e o GUTO responde pelo v8.0.
  O deploy `6b08206e` já aconteceu; a DEBT-113 tem de ser fechada/actualizada pelo executor.

### ℹ️10 — Mutantes sobreviventes das guardas do executor (fechados pelo meu teste novo)
- F4 «(6 capítulos, 30 artigos)» · F5 «(Regulamento Oficial v6.0)» na caixa «Li e compreendi» · F6 «O palpite dá +2 pontos de bónus» no Início:
  os 3 sobreviviam aos 13 ficheiros de teste do UTAC150 (158/158 verdes). Agora morrem em `utac150-val-citacoes.test.mjs`.
- M10 «REGULAMENTO OFICIAL (versão 7)» no prompt do GUTO sobrevive (20/20 verdes nos testes do GUTO). Rótulo só; não fechado.

---

## Afirmações do executor

| Afirmação | Resultado | Evidência |
|---|---|---|
| `docs/REGULAMENTO-v8.0.md` = PDF v8.0 palavra a palavra | **CONFIRMADA** | `pdftotext -enc UTF-8` do v8.0 sem cabeçalhos/rodapés de página: **40/40 linhas idênticas** ao `.md` (sem `#`), 0 diferenças, incluindo acentos, «º», travessões «—», aspas rectas de "Indique e Ganhe" e os 4 «§ único». (A contagem «1282 palavras» não foi reproduzida; a comparação linha a linha é mais forte.) |
| 3 cópias byte a byte | **CONFIRMADA com nuance** | `GUTO-REGULAMENTO.md` tem um cabeçalho de 11 linhas; `tail -n +12` = `REGULAMENTO-v8.0.md` (`cmp` OK). `REGULAMENTO_TEXTO` do `guto-regulamento.mjs` === `GUTO-REGULAMENTO.md` (9210 = 9210, `===` true). |
| Gate 3.7 com resumo literal | **CONFIRMADA** (ressalva ⚠️4) | 12 blocos; 11 = texto integral do artigo; o Art. 7º omite o § único. |
| Backend aceita 3.4/3.5/3.6/3.7 e recusa o resto | **CONFIRMADA** | `_lib/consentimento.mjs:40`; mutantes M3 (tirar 3.6), M4 (gate 3.6), M5 (aceitar 3.3) morrem em `mc104-consentimento`. |
| Site e AAB enviam 3.7 | **CONFIRMADA** | AAB: `versao:\`3.7\`` (gate) e `versaoAtual:\`3.7\`` (AppContext); produção `index-B6ES8OJD.js`: `versao:\`3.7\`` e `t?.versao===\`3.7\``. |
| +2 pontos retirados do backend sem efeitos colaterais | **CONFIRMADA no backend; REFUTADA nos textos** | `apurarPalpite` com 0 não chama `creditarPontos`; ECOQUILDO, lastro e reversões intactos (palpite 25/25; M1/M2 morrem). Mas ficou «pontos EXTRA» (⚠️3). |
| «+2 pontos» → «50 ECOQUILDO» nos textos | **PARCIAL** | Dashboard e 2 textos de OP trocados; o 3.º texto de OP não (⚠️3). |
| AAB vc15 / 1.5.0 | **CONFIRMADA (no manifesto empacotado)** | `bundletool dump manifest`: `versionCode="15"`, `versionName="1.5.0"`, `package="com.desafiogut.app"`; v13: 14 / 1.3.0. |
| Certificado igual ao do v13 | **CONFIRMADA** | `keytool -printcert` de `META-INF/DESAFIOG.RSA`: SHA-256 `85:44:BC:…:17:29` nos dois; `jarsigner -verify` = `jar verified` (aviso PKIX: certificado auto-assinado, normal). sha256 do `.aab` = `ebea578c…8d79`. |
| Bundle web do AAB: gate 3.7, v8.0, sem «Depositar PIX»/«Saldo Disponível», mainnet, sem Sepolia | **CONFIRMADA** | `index-BAF9Bb-s.js`; «Depositar PIX» 0, «Saldo Dispon» 0; `VITE_CONTRATO_SEPOLIA:\`0x0052477A8CA81BCAF4a60e21e635F9e00a5d16cd\``, `VITE_CHAIN_ID:\`1\``, `VITE_NETWORK_STAGE:\`mainnet\``, `VITE_IS_ANDROID_APP:\`true\``, `VITE_MOCK_MODE:\`false\``. O `0x59a73acc…` só aparece em `PrivyRoot` como constante `CONTRATO_ABANDONADO` do `AvisoRede` (detector; também no v13). |
| Bundle = commit `715b0c5`; o `package-lock.json` modificado não mexeu no bundle | **CONFIRMADA por equivalência (sem rebuild)** | 220 dos 261 ficheiros de `base/assets/public` são byte a byte iguais aos do v13, incluindo os chunks de terceiros (`react-BQx8e5sa`, `privy-DqNJ0yps`, `core-BzW9KHqr`, `sentry-CkNIPmXQ`, `web3-CEMcuwLn`) ⇒ o `npm install --legacy-peer-deps` que o `netlify build` do `build:apk` corre (e que reescreveu o lock: só flags `"dev": true` e a remoção de 3 peers opcionais não instalados — `@tanstack/react-query`, `@types/react`, `typescript` — nenhum importado por `src/`) não alterou código empacotado. As alterações por commitar na árvore do executor hoje são `.agents/…`, `.gitignore`, `.mcp.json` e o lock: nada em `src/` nem em `android/`. Limite: não reconstruí o bundle (RAM ~1,7–1,9 GB) e não posso ver o estado da árvore no instante do build. |
| Produção no v8.0 | **CONFIRMADA** | Ver secção Produção. |
| Suíte VERDE 1369/1421 · 1535/1624 | **CONFIRMADA na base** (números meus abaixo, com as correcções) | |

## Produção (só GET público + 4 POST de visitante ao `/chatbot`, script `.mjs` com `fetch` UTF-8)
- `GET /` 200; `index-B6ES8OJD.js`: gate `3.7`, «Regulamento Oficial v8.0 — Resumo», «(Regulamento Oficial v8.0), disponível», «(Art. 28).», sem «Depositar PIX»/«Saldo Dispon» no index.
- `GET /regras-oficiais` 200. O chunk `pontosLance-B_wTfCpX.js` servido contém «1 Passe Desafio (Art. 23)» (⚠️1).
- GUTO (perfil `visitante`):
  1. perder o palpite → «perde o Passe Programado dessa participação — mas os pontos de fidelidade, os ECOQUILDOs e o GUTO ficam contigo. Está no Art. 19» (`modoResposta: llm`) ✔
  2. artigo da conversão e do Indique e Ganhe → caiu no intent `indique_e_ganhe` (recusa-perfil), resposta «+2 ECOQUILDO … +1» ✔ (não citou artigo)
  3. «O Regulamento tem 28 artigos e está na versão 8.0. A vigência está no Art. 28» ✔
  4. pontos ao vencedor do palpite → «Art. 18 … 50 ECOQUILDOs … viram automaticamente 1 Passe Desafio (Art. 21) … não há pontos extras "só por acertar"» ✔

## Escopo
Arquivos tocados pelo `715b0c5`: 35 (lista em `git diff f8e0d71..715b0c5 --stat`). Sem layout novo; a lógica da especial Relâmpago/Programada
não mudou (só o `PONTOS_POR_PALPITE_CERTO` e o guarda do crédito em `apurarPalpite`); o texto do v8.0 não foi alterado (40/40 linhas = PDF).

## Testes
- Base (antes das minhas correcções), ficheiros do UTAC150: frontend 13 ficheiros **158/158**; backend `palpite` 25/25, `mc104-consentimento` 10/10,
  `mc963-guto-regulamento-v4` 10/10, `utac110c-guto-via-b` 8/8, `utac110n-pontos-lance` 30 pass + 10 skip, `utac137-seg3-guto-modelo` 3/3.
- Teste novo `src/__tests__/utac150-val-citacoes.test.mjs` (5 testes): **3 vermelhos antes** das correcções (⚠️1, ⚠️2, ⚠️3), 5/5 depois.
- Suíte completa com as correcções (`mc966-suite-harness.mjs ambos`): **frontend VERDE 1374/1426 · backend VERDE 1535/1624** (os não-pass são skips; executor: 1369/1421 · 1535/1624, a diferença são os 5 testes novos). Uma 1.ª corrida deu frontend VERMELHO 1 (ver ⚠️2) antes do ajuste para «(Arts. 3º e 6º)». RAM livre medida antes: 1910 MB e 1770 MB.

## Mutantes (restauro de `.bak` com md5 confirmado em todos)
| # | Mutante | Resultado |
|---|---|---|
| M1 | `PONTOS_POR_PALPITE_CERTO = 2` | morto (palpite 7 RED) |
| M2 | crédito de pontos sem o guarda `> 0` | morto (11 RED) |
| M3 | legado sem `3.6` | morto (1 RED) |
| M4 | `VERSAO_GATE = "3.6"` | morto (2 RED) |
| M5 | legado aceita `3.3` | morto (2 RED) |
| M6 | GUTO: Indique e Ganhe «(Art. 24.)» | morto |
| M7 | GUTO: conversão «(Arts. 21. e 23.)» | morto |
| M8 | `guto-regulamento.mjs`: Art. 6º «Art. 19.» | morto |
| M9 | âncora 19 «não perde o Passe» | morto |
| M10 | prompt «versão 7» | **sobrevive** (ℹ️10) |
| F1 | gate vigência «(Art. 30)» | morto |
| F2 | gate privacidade «Art. 27.» | morto |
| F3 | `VERSAO_CONSENTIMENTO = "3.6"` | morto |
| F4 | «30 artigos» | sobrevivia → **morto** pelo teste novo |
| F5 | «Regulamento Oficial v6.0» na caixa | sobrevivia → **morto** pelo teste novo |
| F6 | Início «+2 pontos de bónus» | sobrevivia → **morto** pelo teste novo |
| F7 | OP «🎯 +2 pontos!» | morto (1 RED) |
| V1 | Regras «(Art. 23)» | morto |
| V2 | Carteira «O Passe é opcional (Art. 3º)…» | morto (teste novo e guarda UTAC137 invertida) |
| V3 | Carteira cita «(Arts. 3º e 8º)» | morto |
| V3b | Carteira cita só «(Art. 3º)» | morto |
| V4 | OP «O palpite dá pontos EXTRA» | morto |

## Commits do validador
- `6b01293` fix(UTAC150-val): os 3 textos (⚠️1–⚠️3) + teste novo + guarda do UTAC137 invertida.
- (este relatório) docs(UTAC150-val).

## O que obriga a regerar o AAB / novo deploy
As 3 correcções (⚠️1–⚠️3) mudam `src/` ⇒ **regerar o AAB e novo deploy web** (se o vc15 já subiu à Play, o novo precisa de versionCode 16 — decide o operador). Nenhuma toca no backend.
Os ℹ️6/ℹ️7, se o operador os quiser corrigidos, são só backend/GUTO ⇒ deploy, sem AAB.
