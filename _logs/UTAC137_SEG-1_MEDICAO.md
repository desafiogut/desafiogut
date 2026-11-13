# UTAC137 — SEG-1 MEDIÇÃO (frontend + GUTO no Regulamento v6.0 + AAB v10)

Spec: tipo `publicacao`/`produto`, baseline `b740046` (= HEAD = origin/main). Fecha a DEBT-089.

- **-1.1** HEAD `b740046`, nada por publicar. Ficheiros alheios modificados (`.agents/…`, `.gitignore`, `.mcp.json`, `package-lock.json`) não se tocam.
- **-1.2** `docs/REGULAMENTO-v6.md` **existe** (UTAC135; 43 linhas, 6 capítulos, 30 artigos; formato `#`/`##`, `Art. 1º …` sem travessão,
  linhas sem parágrafo em branco). Não se altera (é o texto registado no RTD).
- **-1.3 Onde vive o texto antigo (grep em `src/`, sem testes):**
  | Sítio | Texto antigo |
  |---|---|
  | `pages/RegrasOficiais.jsx` | importa `REGULAMENTO-v5.md`; o parser só lê o formato v5 (`Art. Nº — `) |
  | `lib/pontosLance.js` | `PROPORCOES.fidelidadePorPasse: 10`; resumo «+200 pontos de lance (bônus…)» nas Regras Oficiais |
  | `lib/passes.js` | benefícios/sucesso do Passe: «10 pontos … + 200 pontos de lance», «+10 pontos e 1 palpite» |
  | `pages/Dashboard.jsx:504`, `pages/OfertasProgramadas.jsx:156` | botão do palpite **bloqueado** sem Passe Programado + «Precisa de 1 Passe Programado para palpitar.» |
  | `i18n/pt.js:134`, `edicao-especial/CardEdicaoEspecial.jsx:193` | «o Passe dá +200 pontos de lance» |
  | `components/TermosConsentimento.jsx` | gate legal cita o **v5** (Arts. 8º «10 pontos», 47º «1 ECOQUILDO = R$ 1,00», …) e «Regulamento Oficial v5.0» |
  | `CardLance.jsx` | **já não** tem «Precisa de 1 Passe» nem «+200» (UTAC129/130) — premissa do enunciado desactualizada |
  | `MinhaCarteira.jsx` | não mostra «10 pontos» nem «R$ 1,00» (medido); o ECOQUILDO aparece como saldo — premissa desactualizada |
- **-1.4 GUTO:** o RAG **já não existe** (UTAC110c-1); o GUTO leva o Regulamento inteiro no prompt a partir de
  `_lib/guto-regulamento.mjs` (`REGULAMENTO_VERSAO = "5.1"`), cópia byte a byte de `docs/GUTO-REGULAMENTO.md`, que por sua vez tem o
  mesmo corpo de `docs/REGULAMENTO-v5.md` (invariante de `utac106h-regras.test.mjs`). `_lib/guto-perfis.mjs` tem âncoras verbatim.
- **-1.5 Consentimento:** `VERSAO_CONSENTIMENTO` (front) = `VERSAO_GATE` (`_lib/consentimento.mjs`) = "3.3"; o backend recusa o
  aceite de outra versão (`validarAceite`).
- **-1.6** Disco 6,6 GB (≥ 5). RAM a medir antes do build (A14).

## ⚠️ Conflitos (perguntados — R18)
1. **R18-137-1:** o gate legal passa ao v6 **e** a versão do aceite sobe para **3.4** no app e no backend (todos reaceitam). Risco aceite:
   instalações novas da v9 (enviam 3.3) ficam recusadas no aceite até actualizarem.
2. **R18-137-2:** depois do AAB, **push + `netlify deploy --prod --build`** (o enunciado não o autorizava e dizia «não altera o backend»,
   mas a Frente C e o gate exigem `_lib/` + deploy para valerem).
3. (declarado) O enunciado manda `npm run build:apk` + `gradlew bundleRelease` — é o caminho certo (memória: nunca `npm run build`).
4. (declarado) CardLance e MinhaCarteira já não têm os textos que o enunciado nomeia; os que existem estão na tabela acima.

**Veredito: SEGUIR** com R18-137-1/2.
