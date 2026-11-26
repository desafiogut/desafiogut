# UTAC149 — SEG-1 MEDIÇÃO (2026-11-26, Opus 5.5)

Spec: `_logs/UTAC149.spec.yml` (tipo `produto`). Nada alterado neste segmento.

## -1.1 Estado do repo
- HEAD `a023a5d` (UTAC148) = baseline do spec; `git log HEAD..origin/main` vazio.
- `git status`: só ruído pré-existente (.agents/skills, .gitignore, .mcp.json, package-lock, `_logs/MC100*` não versionados). Nenhum é deste UTAC.
- Não há `_logs/UTAC149*` anterior ⇒ número livre.

## -1.2 Caminhos nomeados
| Nome no enunciado | Medido |
|---|---|
| imagem `EDICAO ESPECIAL PALPITE` | `Desktop/EDICAO ESPECIAL PALPITE.jpeg` (401 306 B, 2026-11-26 05:37) |
| `CardEdicaoEspecial` | `src/components/edicao-especial/CardEdicaoEspecial.jsx` — **fixo em Relâmpago**: `acao="lance"`, `renderLance({modalidade:"flash"})` |
| `FormularioAcao` | existe como default export de `src/components/_formAcaoEdicao.jsx` |
| `TabelaLances` + `ocultosPermanentes` | existe, só usado no MLC (`MercadoLances.jsx:478`). **A aba Ofertas Programadas NÃO usa a TabelaLances**: usa `TabelaPalpites` (local, `OfertasProgramadas.jsx:379+`), que já mostra «🔒 valores ocultos até o fim» |
| Blob `edicoes-metadata` | padrão em `scripts/utac138-seed-edicao-especial.mjs` e `scripts/utac140-abrir-especial.mjs`; bucket `artes-edicoes` |
| Regulamento v8.0 | só PDF no Desktop (`REGULAMENTO-DesafioGUT-v8.0.pdf`, 24/11); o repo está no **v7** (`docs/REGULAMENTO-v7.md`) |

## -1.3/-1.4 Medições específicas
1. **Regex do id.** `ESPECIAL-[A-Z0-9]+$` em `_estilo-especial.js:54`, `_lib/edicao-janela.mjs:12` e `_lib/edicoes-core.mjs:46`. `ESPECIAL-PALPITE-1` (2.º hífen) **falha os três** ⇒ a edição fica invisível no frontend e o backend responde `edicao_id_invalido`.
2. **Palpite exige `tipo:"programado"` e `status:"aberto"`** (`registar-palpite.mjs:77-81`). Apuração manual do admin: `apurarPalpite(edicaoId, valorReal)` — o admin informa o nº real de lances.
3. **«ESPECIAL-*» = Relâmpago em todo o código.** Sem guarda de `tipo`: `escolherEspecial` (Início ⚡ e MLC), `scheduled-encerrar-especial` (apuração menor lance único + consolidação), `scheduled-lider-especial`, `especial-config` (GUTO anuncia), `chatbot.mjs`, `ranking-especial`, `apuracao-especial`, `pontuacao-store`, `consolidacao`. ⇒ inserir uma ESPECIAL programada sem guarda de `tipo` faz a especial palpite **disputar o slot da Relâmpago** no Início e no MLC (`escolherEspecial` ordena por `inicio_em` e escolhe a 1.ª não encerrada: até 30/11 ganha a Relâmpago, aberta desde 20/11; depois do fecho dela, a palpite tomaria o slot ⚡ até 9/12) e põe os crons da Relâmpago a correr sobre ela.
4. **Início:** vidro 1 «⚡ Relâmpago» (especial Relâmpago) e vidro 2 «🎫 Programada» (`CartaoEdicao acao="palpite"`), que **exclui de propósito** as especiais (`Dashboard.jsx:255`).
5. **Ofertas Programadas:** `edicoesProgramadasDe` filtra `tipo === "programado"` e **não** exclui especiais ⇒ uma especial `programado` aparece lá sozinha, com `CartaoEdicao acao="palpite"` + `FormularioAcao` + `TabelaPalpites`.
6. **A arte** diz «Edição Especial 1 Palpiteiros · 25 de novembro a 9 de dezembro», mostra uma **air fryer** e «O palpite mais próximo ganha!». O enunciado propõe produto «50 ECOQUILDO».

## -1.5 Disco
`df -h /c` → 16 G livres (≥ 5 GB).

## ⚠️ Conflitos entre o enunciado e o medido (R20 — não resolvidos pelo executor)
1. **Datas** — o enunciado manda o operador informar; a arte diz 25/11 a 9/12 (horas por definir).
2. **Id** `ESPECIAL-PALPITE-1` não casa com o regex (fica invisível). Alternativa sem mexer em código: `ESPECIAL-PALPITE1` (padrão de `ESPECIAL-RELAMPAGO1`).
3. **`CardEdicaoEspecial` é Relâmpago.** Reutilizá-lo «exactamente» para palpite obriga a parametrizá-lo; a alternativa sem componente novo é o `CartaoEdicao acao="palpite"` que já é o 2.º layout oficial.
4. **Guarda de `tipo`** na escolha da especial e nos crons da Relâmpago é necessária para não tocar a Relâmpago — mudança pequena mas na lógica dela.
5. **Tabela em Ofertas Programadas:** o enunciado pede `TabelaLances ocultosPermanentes`; a aba usa `TabelaPalpites` (já com 🔒).
6. **Produto:** «50 ECOQUILDO» (enunciado) × air fryer (arte). O v7 já dá 50 ECOQUILDO ao vencedor de qualquer palpite.
7. **Que lances conta o palpite** («quantos lances terá essa edição?») — a especial palpite não recebe lances; o admin informa o nº na apuração.

## -1.7 Veredito
**AJUSTAR** — perguntar ao operador antes do SEG0.

## Decisões do operador (R18-149, 2026-11-26)
- **R18-149-A** datas: 25/11 00:00 → 09/12 23:59 BRT (`2026-11-25T03:00:00.000Z` → `2026-12-10T02:59:00.000Z`).
- **R18-149-B** id `ESPECIAL-PALPITE1` (sem 2.º hífen; nenhum regex mexido).
- **R18-149-C** layout oficial da Programada: vidro «🎫 Programada» do Início (abaixo do ⚡) + aba OP, com `CartaoEdicao acao="palpite"` + `FormularioAcao`. `CardEdicaoEspecial` não é tocado.
- **R18-149-D** produto air fryer. Sem nome dado, uso o da Relâmpago («Fritadeira Elétrica Sem Óleo Quad Fry 4,2 L Elgin»), como a opção previa.
- **R18-149-E** «libere a RAM necessária»: fechados Edge, WhatsApp e Widgets (1033 → 1666 MB livres). MCPs e a ponte do Hermes ficaram intocados.
- Consequências decididas pelo executor dentro do âmbito (conflitos 4/5/7): guarda de `tipo` para a palpite não entrar no circuito Relâmpago; a tabela da OP é a `TabelaPalpites` (o padrão da aba, com 🔒); a apuração do palpite é manual (`apurar-palpite`, o admin informa o nº de lances).

**Veredito final do SEG-1: SEGUIR.**
