# UTAC000.2 — SEG-1 Medição (2026-09-30) · skill UTAC01 (tipo `infra`) · spec `_logs/UTAC000.2.spec.yml`

| # | Medição | Resultado |
|---|---|---|
| -1.1 | Repo | HEAD **`5e7ed24`** (fecho do UTAC105b). ⚠️ **Árvore partilhada com o UTAC105b.1 em curso**: modificados por outra sessão `netlify/functions/cotas.mjs`, `src/pages/CorporativoDashboard.jsx`; por versionar `_tests/utac105b1-cotas.test.mjs`, `_logs/UTAC105b.1_SEG-1_MEDICAO.md`. `package-lock.json` modificado (pré-existente). **Nada disto é tocado nem commitado por este UTAC.** |
| -1.2 | Skill UTAC01 | `SKILL.md, comandos.md, exemplo.UTAC.md, exemplo.spec.yml, spec-template.yml, protocol/ (hard-gates, regras/ 9+README, regras-legado, licoes (53 l.), ambiente, contexto), segments/ (4), types/ (6)`. `review/` **não existe** ✅ · `_logs/REVIEWS/` **não existe** ✅ |
| -1.2b | Versão da skill | ⚠️ **não existe número de versão** em lado nenhum da skill (grep «versão/version/v1.0» → 0 ocorrências relevantes). O enunciado pede «bump de versão» (v1.0 → v1.1). |
| -1.2c | Formatos | regra = `## <ID> — <título>` + texto + `Origem: <UTAC>.` (ex. `T-testes.md`); lição = item numerado `N. **título** *(UTAC de origem)*. texto` em secções de `licoes.md` |
| -1.2d | Verificação da skill no UTAC000 | scripts **fora do repo** (`C:/Users/Moltbot/tmp-utac000/…`); nenhum teste versionado da skill. Este UTAC põe as sondas em `scripts/utac0002-*.mjs` (padrão UTAC105b), declarado no spec |
| -1.3 | Candidato Frente D | **UTAC105b fechado**: spec, SEG-1, SEG0, SEG1, SEG2, SEG3_VALIDADOR, SEG3b, SEG5 (+2 saídas), MIGRACAO.sql; relatório em `_logs/` e `Desktop/`; commits `b6e8488 0811c2b 4cbb9f3 5e7ed24`, baseline `5cac238` ✅. UTAC105b.1 em curso → não usado |
| -1.4 | Suíte | 1.ª: frontend VERDE 535/535 · backend **VERMELHO 3** · 2.ª (node --test directo): 935 · 929 pass · 0 fail · 6 skip · 3.ª (harness): **VERDE 535/535 · 929/935**. As 3 falhas **não se reproduziram** — provável escrita concorrente da sessão do UTAC105b.1 durante a 1.ª corrida (os 935 incluem o teste dela por versionar). Declarado, não atribuído com certeza |
| -1.5 | Disco C: | 13 GB livres ✅ |

## ⚠️ Conflitos (AU3/AU4 — perguntas ao operador)
1. **Onde vive a versão da skill?** Não há versão. O aplicador tem de dizer onde se faz o «bump».
2. O enunciado diz «Não faz review de nenhum UTAC específico (só testa o mecanismo)» e a Frente D faz o review do UTAC105b → leio como: o review do UTAC105b É o teste do mecanismo (autorizado explicitamente).

## Veredito: **AJUSTAR** (1 pergunta) → parar antes do SEG0.

## R18 — resposta do operador (2026-09-30)
- **R18-A** A versão da skill vive em **`skills/utac01/review/VERSAO.md`** (versão actual 1.0 + changelog); o `SKILL.md` só aponta para lá.
- Conflito 2: sem objecção → o review do UTAC105b é o teste do mecanismo.

Veredito após R18: **SEGUIR**.
