# UTAC137 — SEG0 (frentes A-D) · SEG1 (verificação) · SEG2 (AAB v10)

## Frentes
- **A — Regulamento na UI:** `RegrasOficiais.jsx` importa `docs/REGULAMENTO-v6.md`; o parser aceita o formato do v6 (títulos `#`, uma linha por
  artigo, `Art. 1º …` / `Art. 10. …` sem travessão, separador guardado e desenhado tal qual) e continua a ler o v5 (12/72, rodapé, alíneas).
- **B — Textos da UI:** `pontosLance.js` (proporções do v6: 0 pontos de lance por Passe, 1 ponto, ECOQUILDO R$ 0,50, 50 → 1 Passe; resumo das
  Regras Oficiais reescrito), `passes.js` (benefícios/sucesso do Passe), `pt.js` + `CardEdicaoEspecial` (sem «+200»), `Dashboard`/`OfertasProgramadas`
  (palpite sem bloqueio nem aviso de Passe), `MinhaCarteira` («1 = R$ 0,50 · 50 = 1 Passe»; Art. 6º → 5º), citações v5 → v6 em `Configuracoes`,
  `MeusAtivos`, `ComingSoonHero`, `PainelPontosLance`. **Gate legal** (`TermosConsentimento`): resumo gerado do texto do v6 (12 artigos literais),
  vigência = registo no RTD (Art. 30), aceites sem os artigos que o v6 não tem (funcionários, imagem), versão **3.4** (R18-137-1).
- **C — GUTO:** `docs/GUTO-REGULAMENTO.md` = cabeçalho + v6 byte a byte; `_lib/guto-regulamento.mjs` regenerado (`REGULAMENTO_VERSAO = "6.0"`);
  `_lib/guto-perfis.mjs` com instruções e 14 âncoras literais do v6 (rótulo `Art. Nº`/`Art. N.`); `_lib/consentimento.mjs` `VERSAO_GATE = "3.4"`.
  O RAG já não existia (UTAC110c-1).
- **D — Guarda `utac110j5 «P»`:** compara `fidelidadePorPasse`, `ecoCentavos`, `ecoPorConversao`, `ecoPorPasse`, `pontosPorCartao` com as constantes
  do backend e exige que a compra não volte a usar `PONTOS_LANCE_POR_PASSE_RELAMPAGO`. **Verde.**
- Testes do v5 adaptados ao v6 em 26 ficheiros (o texto antigo fica no comentário/nome); as guardas do v5 que eram históricas (Arts. 17/48/9/53)
  ficam só sobre `REGULAMENTO-v5.md`.

## SEG1 — verificação
| Medida | Resultado |
|---|---|
| Suíte frontend | **VERDE 1325/1325** (`UTAC137_SUITE_frontend.txt`) |
| Suíte backend | **VERDE 1472/1478** (6 skipped pré-existentes; `UTAC137_SUITE_backend.txt`) |
| Mutação | **10/10 RED**, md5 idêntico (`UTAC137_MUTACAO_saida.txt`) |
| Corrida interrompida | a 1.ª corrida conjunta foi morta pelo Claude Code por falta de memória (`UTAC137_SUITE_corrida-interrompida.txt`: front 30 falhas antes das correcções, back não medido) |
| `mc9952` (DNS `exemplo.com`) | falhou 2× numa corrida e passou na seguinte — depende de DNS externo; `img-proxy.mjs` não foi tocado |
| RAM (A14) | 1 190-1 412 MB depois de fechar programas — **excepção R18-137-3** (autorizada pelo operador) |

## SEG2 — AAB v10
`npm run build:apk` (guarda: mainnet, `VITE_IS_ANDROID_APP=true`, sem PIX/Saldo) → `gradlew bundleRelease` (JDK 21 do Android Studio).
`Desktop/DesafioGUT-v10/DesafioGUT-v10.aab` · 32 434 729 B · SHA-256 `A0459AEEB7C08846A983344E186E68EE25A2E0F4F3F306BAA308163BA3D9A5E1` ·
`jar verified` · certificado = v9 · `versionCode 10` / `versionName 1.1.0` · guarda OK sobre o `.aab` extraído · v6 presente e
«Versão 5.1 · Vigente», «o Passe dá +200 pontos de lance», «Precisa de 1 Passe Programado para palpitar» ausentes.

## Divergências v6 × servidor (fora do âmbito — DEBT)
Art. 8º (cartão **digital** creditado automaticamente) × resgate de cartão físico com morada · Art. 18 (o vencedor do palpite ganha o **produto**) ×
+2 pontos · Art. 22 (ECOQUILDO usável **dentro do app**) × só no site.
