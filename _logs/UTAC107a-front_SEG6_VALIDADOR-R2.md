# Veredicto do validador adversarial (2.ª ronda): UTAC107a-front, commit `057f5e4`

**Worktree:** `C:/Users/Moltbot/tmp-107afront-val2/wt` · **Contexto de browser:** `val107afront2` (Chrome real) · **Data:** 2026-10-06
**Método:** usei o meu auditor (`scratch/val.js`, `scratch/run2.js`), que mede rects, texto fora de vidro, contraste
computado, overflow, recorte de células/títulos e o CSS computado dos carrosséis. Corri 4 pranchas × 3 variantes ×
375/768/1024/360/320, mais o viewport mobile real de 375 px, o parser HTML (`scratch/html_check.py`) e o confronto com o `Dashboard.jsx`.

## VEREDICTO: **APROVADO** (sem bloqueantes; 3 ressalvas ⚠️ menores)

## Correcções da 1.ª ronda: todas confirmadas por medição

| achado | estado | evidência medida |
|---|---|---|
| R2-1 ⛔ | ✅ fechado | Em `tabela-especial.html`, as 3 instâncias (aberta MLC, **encerrada** MLC, OP) cabem no cartão a 320/360/375/768/1024: tabela = cartão (284/324/339/590/590), 3 colunas e 0 células ou títulos cortados. Nas pranchas MLC e OP, todas as variantes × 5 larguras dão 0 cortes. |
| D-1 | ✅ | A tabela tem a mesma largura em MLC A/B/C e OP A/B/C: 286/326/341/592/592 a 320/360/375/768/1024. Cabeçalho 56, `th` 48, `td` 48 e colunas idênticas (ex.: 50/184/105 a 375). Está sempre imediatamente antes do `.rodape-legal`; na OP-C seguem-se só o véu e a folha (overlay). |
| E-1 / E-3 | ✅ | As anotações estão presentes: a OP cita `lances-flash` → `lances-relampago:{edicaoId}` e o Início diz «o Sidebar só existe no desktop». |
| E-2 | ✅ | A copy diz «mais próximo ganha +2 pontos» e os estados são «MAIS PRÓXIMO» / «NÃO FOI DESSA VEZ». «acertaste» já não aparece nos «depois». |
| B-1 | ✅ | Borda do `.campo` `#6b7db8`: **4,61** sobre o vidro e **4,85** sobre o campo. Placeholder `#8fa0d8`: **7,56**. Já não há pontos de paginação (0 ocorrências de `pontos-pag` nos HTML). |
| G-1 | ✅ | O modal da OP-C tem `position:absolute`, `aria-modal="true"` e `aria-labelledby="folha-t"` (id existe), e o input tem `label for`. |
| H-1 | ✅ | Há uma nota na Carteira-C e o cartão Quildo está presente na OP-C. |
| I-1 | ✅ | Com viewport mobile de 375, `scrollWidth` = 375 em `tokens`, `carteira`, `menor-lance-unico` e `inicio`, também depois de clicar em 768/1024. |
| (f) diff | ✅ | `git diff --name-only dff04c7 057f5e4` mostra só `docs/mockups-107a/*` (8 ficheiros) e `_logs/UTAC107a-front_SEG6_VALIDADOR.md`. O worktree está limpo. |

**Sem regressões** nas alíneas a, c, d e i. O resultado é 0 alvos < 48 px, 0 textos fora de vidro e 0 falhas de contraste (só existem
botões `disabled`, que estão isentos) em todas as 60 combinações. O overflow é 0, excepto o scroll intencional dos carrosséis. Os «antes» mantêm-se:
Carteira 5/2, Início 1/1, MLC 5/3, OP 4/3. Parser: sem tags por fechar e sem ids duplicados. Os inputs sem nome acessível estão só nos
«antes» reconstruídos. O carrossel (`.carrossel`, usado no Início e na OP) coincide com o `Dashboard.jsx:465-481`: flex, `overflow-x:auto`,
`overflow-y:hidden`, `x mandatory`, item `0 0 100%`, `start`, `padding-bottom` 4 px. O item mede exactamente a largura do contentor, sem peek. As decisões
R18-F (4 tiles; o 🏆 só aparece no «antes») e o MLC com 3 vidros conferem.

## Ressalvas novas

| id | grav. | evidência | correcção |
|---|---|---|---|
| N-1 | ⚠️ | O deslizador do MLC (`.slides`, CSS local, que não usa `.carrossel`) tem `overflow-y:auto` e `padding-bottom:0`. No Dashboard são `hidden` e 0,25rem. É a única rolagem lateral que não é a do MC99 (R18-G). Em todos os carrosséis, o `gap` é 12 px fixo, enquanto o Dashboard usa 0,75rem no mobile e **1rem no desktop**. | Reutilizar `.carrossel` no MLC. Gap a 16 px a partir de 700 px. |
| N-2 | ⚠️ | No MLC, o rótulo do valor passou a `.sr` (1 px, invisível). O único indício visual é o placeholder «R$ 0,01», que desaparece quando se escreve (WCAG 3.3.2). O botão «Dar lance» é partilhado pelos slides e fica activo mesmo com o slide «EM BREVE» visível. | Rótulo visível curto. Mostrar o estado desactivado quando o slide visível está EM BREVE. |
| N-3 | ⚠️ | O Acesso Rápido do Início B voltou a ter «🎫 Converter Ficha», que leva a `/carteira`. Como a Carteira já não tem «Trocar R$2 → 1 Senha», o atalho fica sem destino útil. | Confirmar com o operador: retirar ou re-apontar. |
| N-4 | ℹ️ | O ícone de estado da tabela (`<span aria-label="valores ocultos">` / «edição encerrada») não tem `role="img"`. Num `span` genérico, o `aria-label` não é anunciado de forma fiável. O vencedor só se distingue pelo emoji 🏆 na coluna #. | `role="img"` nos ícones. `aria-label="vencedor"` no 🏆. |

## Limites

- Usei Chromium no desktop, com a largura simulada no `.fone`.
- Medi o viewport mobile real em 4 das 8 pranchas (`tokens`, `carteira`, `menor-lance-unico`, `inicio`); `ofertas-programadas`, `tabela-especial`, `regra-1-glass` e `index` ficaram por medir.
- Não usei leitor de ecrã nem axe-core.
- O contraste ignora gradientes.
- Não verifiquei de novo o lint do DESIGN.md: os ficheiros alterados são outros e o DESIGN.md não está no diff.
