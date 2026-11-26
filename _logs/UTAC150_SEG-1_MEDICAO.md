# UTAC150 — SEG-1 MEDIÇÃO (2026-11-26, Opus 5.5)

## -1.1 Repo
HEAD `f8e0d71` = origin/main = baseline. Árvore limpa no código (só o ruído pré-existente: .agents, .mcp.json, .gitignore, package-lock).

## -1.2/-1.3 Fontes
- **Regulamento v8.0 só em PDF:** `Desktop/REGULAMENTO-DesafioGUT-v8.0.pdf` (24/11 14:18, 4 págs., 1312 palavras). Há também `REGULAMENTO-DesafioGUT-v8.pdf` (23/11), uma versão anterior; a única diferença está nas referências cruzadas e no Art. 17 § único. Não existe `docs/REGULAMENTO-v8*.md`. O repo publica o v7.
- **v8.0 × v7 (28 × 30 artigos; mudam 9):**
  - Art. 6: o Passe não é devolvido na derrota.
  - Art. 12: o lance passa a ser expresso «em centavos».
  - **Art. 17 § único:** o palpite conta «o número total de lances registrados na edição», e é o sistema que contabiliza e publica.
  - **Art. 18 § único:** os 50 ECOQUILDO equivalem a 1 Passe.
  - **Art. 19:** o perdedor perde o Passe Programado.
  - Art. 21 § único: a conversão 50 → 1 Passe (era o Art. 23).
  - **Art. 25 § único:** o consentimento para publicar nomes é recolhido no cadastro ou na participação.
  - O Art. 26 do v7 (PIX para produtos físicos) sai e os artigos seguintes são renumerados.
- **Gate:** `VERSAO_GATE = "3.6"` (`_lib/consentimento.mjs:18`, `TermosConsentimento.jsx:28`), legado aceite `["3.4","3.5"]` (`:25`).
- **«+2 pontos»:**
  - textos em `Dashboard.jsx:552`, `OfertasProgramadas.jsx:161,243` e comentários;
  - o backend **ainda credita** `PONTOS_POR_PALPITE_CERTO` (+2 de fidelidade) **e** 50 ECOQUILDO (`_lib/passe-pontos.mjs` `apurarPalpite`). O desempate é por `criado_em`, como diz o Art. 17.
- **Build:** `versionCode 14` / `"1.3.0"` (`android/app/build.gradle:27-28`); `build:apk` + `gradlew bundleRelease` (padrão do UTAC148).

## -1.5 Disco / RAM
15 G livres · 1650 MB de RAM livres.

## ⚠️ Conflitos (R20 — não resolvidos pelo executor)
1. **Regra dos lances da apuração** (pergunta obrigatória do enunciado; DEBT-111(b); ⚠️4 do validador do UTAC149). O Art. 17 § único diz «lances registrados na edição» e diz que é o sistema que contabiliza. A especial palpite não recebe lances.
2. **Versão do gate:** o enunciado diz «3.8 (ou a próxima sequencial)»; a próxima é a **3.7**. Quanto ao legado, o enunciado manda aceitar a 3.5 e a nova, mas o AAB v13 (vc14) envia a **3.6**; se a 3.6 sair do legado, esse AAB fica bloqueado.
3. **Frente C × R18-149-C:** o enunciado pede `CardEdicaoEspecial` + `TabelaLances ocultosPermanentes`. Ontem o operador decidiu o layout da Programada (`CartaoEdicao` palpite + `FormularioAcao` + `TabelaPalpites` com 🔒), que já está publicado e validado.
4. **«+2 pontos»:** o v8.0 não prevê os +2 pontos de fidelidade ao vencedor (o Art. 7 só dá o ponto pelo Passe e o prémio do Art. 18 são 50 ECOQUILDO). Trocar só o texto deixa o backend a creditar +2 sem o dizer.
5. ℹ️ O Art. 15 do v8.0 remete para o «Art. 17» na frase dos benefícios mantidos; o v8 de 23/11 dizia «Art. 19», que é o artigo dos benefícios. Uso o texto literal do v8.0 aprovado e registo para o jurídico.

## -1.7 Veredito
**AJUSTAR** — perguntar ao operador.

## Decisões do operador (R18-150, 2026-11-26)
- **R18-150-A** apuração: «para o palpite, o que conta é o número de lances que o usuário acredita que terá a edição». A resposta define o palpite, mas **não diz de onde vem o número real**. Como a apuração é manual depois de 09/12 (o admin informa o número), não implementei contagem nenhuma. O DEBT-111(b) continua aberto.
- **R18-150-B** gate **3.7**; o backend aceita também **3.4/3.5/3.6** (os APKs v11, v12.1 e v13 continuam a funcionar).
- **R18-150-C** Frente C: manter o layout do UTAC149 (R18-149-C). A Frente C fica reduzida a verificação.
- **R18-150-D** tirar os **+2 pontos** do backend e dos textos: o vencedor do palpite recebe só os 50 ECOQUILDO (v8.0, Art. 18).
- **R18-150-E** «coloque a v8.0 no código primeiro depois crie o aab v13» (ordem das frentes). O operador chama-lhe «v13», mas o versionCode é **15** (o 14 é o AAB v13 do UTAC148). A pasta `Desktop/DesafioGUT-v13` já existe com o vc14, por isso o ficheiro novo vai para `Desktop/DesafioGUT-v15/DesafioGUT-v15.aab`, como pede o checklist.

**Veredito final do SEG-1: SEGUIR.**
