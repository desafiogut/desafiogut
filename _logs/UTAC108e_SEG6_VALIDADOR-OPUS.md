# UTAC108e — Veredicto do validador adversarial independente

Alvo: `docs/mockups-107a/mlc-op-v2/` @ 4f1050d (worktree `C:/Users/Moltbot/tmp-108e-val/wt`). Medições no DOM real via chrome-devtools (file:///), **375 px**, MLC e OP com 3 variantes × 2 estados, Início com 2 estados. Auditoria própria (não só `GUT.auditarTudo`), que recalcula toque, Regra 1 (lista PERMITIDO **e** fundo real ≥ 0,5 de alfa/backdrop num ancestral) e contraste WCAG (cor composta sobre a pilha de fundos até ao navy #050818).

## VEREDICTO: **APROVADO COM RESSALVAS**

Não consegui refutar nenhum dos 12 pontos. As ressalvas são de documentação e polimento e não bloqueiam.

## Tabela (a)–(l)

| # | Tentativa de refutação | Resultado | Evidência |
|---|---|---|---|
| a | Cores inventadas | **Não refutado** | 33 cores literais distintas em v2.css/HTML/JS. Todas existem em tokens.css/globals.css/glassTokens.js **ou** são o mesmo RGB de um token com outro alfa: navy `5,8,24` (=#050818 `--gut-bg`), primary `255,107,53` (=#ff6b35 `COR.primary`), gold `245,166,35`, superfície `13,18,53` (=#0d1235, globals.css:15), branco. Nenhum matiz novo. O `.ed` computado é `rgba(13,18,53,.88)`, borda `rgba(255,255,255,.10)`, raio 14 px, sombra `0 8px 32px rgba(0,0,0,.4)`, ou seja, idêntico a `.gut-glass-standard` (globals.css:406-411). **Dourado #f5a623 vs `COR.gold #ff9500`: é um desvio aceitável, não invenção.** É a proposta do 107a (tokens.css:32, «ÚNICO dourado») e é o dourado de facto do app: aparece em 56 ficheiros de `src/`, contra 3 com #ff9500. Ver ℹ️1. |
| b | Tipografia diferente da do app | **Não refutado** | Fontes computadas em todos os estados: só `Inter` e `Orbitron`, as mesmas de globals.css:79-80. Os woff2 são byte-idênticos aos de `public/fonts/`. A faixa de pesos `300 900` sobre um único ficheiro replica o app (fontes.css:40-112 aponta todos os pesos para o mesmo `inter-400-latin.woff2` / `orbitron-600-latin.woff2`). |
| c | MLC com aviso solto (erro do 108d) | **Não refutado** | No estado vazio, nas 3 variantes, o MLC mostra um `section.glass.ed.ed--vazio` «⚡ Relâmpago · SEM EDIÇÃO · Nenhuma edição em andamento · Próxima edição —», com input e botão `disabled`. O «Volte quando houver…» vive em `p.ajuda < div.lance < section.glass.ed.ed--vazio` (A) ou em `section.glass.form-col` (C). Em B não aparece. Não há texto solto. |
| d | Abas não conversam esteticamente | **Não refutado** | Estilo computado idêntico MLC↔OP em 13 componentes: `.ed`, `.ed .nome`, `.ed .t`, `.campo`, `.tabela-especial`, `th`, `td`, `.h-aba`, `.cab-aba .sub`, `.selo-tipo`, `.bottomnav`, título da tabela e `.btn-ouro`. Única diferença: o padding horizontal do botão (MLC 22 px, OP 18 px), ver ℹ️3. A captura do MLC A vazio a 375 px está coerente com a arena real + vidro navy. |
| e | Tabelas MLC/OP com padrões diferentes (Regra 2) | **Não refutado** | As duas usam `table` dentro de `.glass.tabela-especial`, 339 px a 375, cabeçalhos `# · Participante · Valor` (MLC) e `# · Participante · Palpite` (OP), `th` 12px/800 #8fa0d8 sobre `rgba(5,8,24,.35)`, `td` 14px #c8d0f0. O estilo é o mesmo; só a coluna de dados muda de nome. |
| f | Texto fora de vidro (Regra 1) | **Não refutado** | 0 nós de texto fora de PERMITIDO **e** 0 nós sem fundo real em MLC A/B/C × cheio/vazio, OP A/B/C × cheio/vazio e Início × cheio/vazio. O relatório `[data-relatorio]` dá o mesmo resultado («0 bloco(s)»). |
| g | Toque < 48 px | **Não refutado** | 0 alvos abaixo de 48 px em todos os 14 estados medidos (MLC 7–9 alvos, OP 6–10, Início 11). |
| h | Contraste WCAG insuficiente | **Não refutado** | 0 nós de texto abaixo de 4,5:1 (ou 3:1 para texto grande) nos 14 estados. Texto sobre a arte (faixa do MLC B, véu `rgba(5,8,24,.86)`), no pior caso de arte branca pura: fundo ≈ rgb(40,42,56), o que dá ≈7,3:1 para o dourado e ≈5,5:1 para #8fa0d8 (cálculo manual). |
| i | HTML inválido / links quebrados | **Não refutado** | Nos 4 HTML: `<!doctype html>`, `lang` presente, tags equilibradas, 0 ids duplicados, 0 `href`/`src` locais quebrados (parser próprio). No browser: todas as imagens com `naturalWidth>0`, fontes `loaded`, consola sem mensagens. Os `cssRules` dão ERR por ser file://; os estilos aplicam-se. Não corri um validador W3C formal. |
| j | Código alterado | **Não refutado** (com nota) | O commit 4f1050d só toca `docs/mockups-107a/mlc-op-v2/` (23 ficheiros). O **range** `d8c3e67..4f1050d` também traz `CLAUDE.md` e `_logs/UTAC108d-mlc-sempre.md`, que vêm do commit intermédio c11478a (fecho do UTAC108d), e não do 108e. Nenhum `.js/.jsx/.ts/.mjs/.py/.sol` fora de mlc-op-v2 no range. tokens.css, mockup.js e os HTML aprovados do 107a ficam inalterados. Ver ⚠️1. |
| k | `.bak-*` tocado | **Não refutado** | `git diff --name-only` do range filtrado por `bak`: vazio. Os 5 `.bak-*` existentes (frontend) não aparecem no diff. |
| l | Invenção em vez de evolução | **Não refutado** | Reutiliza as classes dos aprovados: `fone`, `barra-sis`, `h-aba`, `bottomnav`, `btn-ouro`, `campo`, `tabela-especial`, `glass`, `ed` (presentes em menor-lance-unico/ofertas-programadas/inicio/tabela-especial.html). Liga `../tokens.css` e `../mockup.js` sem os alterar. As anotações citam a base (107d, 107e, 107e.1, MC99). Os assets são reais: 6/6 sha256 idênticos (airfryer ← `public/artes/edicao-especial-airfryer.jpg`; arena-* ← `public/assets/backgrounds/background-*.webp`; guto ← `public/assets/guto/custom/guto-bemvindo.png`; inter/orbitron ← `public/fonts/`). |

## Achados

- ⚠️1 **A afirmação «o diff d8c3e67..4f1050d só toca mlc-op-v2» é falsa à letra.** O range inclui c11478a (CLAUDE.md +16, `_logs/UTAC108d-mlc-sempre.md` +126). Não é código e não é do 108e. Tratamento: citar o range `c11478a..4f1050d`, ou `git show 4f1050d`, no registo do 108e.
- ℹ️1 **Dourado:** `glassTokens.js`/`globals.css:37` continuam com `gold #ff9500`. O mockup segue a proposta do 107a (#f5a623). Tratamento: a implementação (108e.1) tem de decidir e unificar a fonte de verdade, para não ficarem três dourados.
- ℹ️2 **Capturas `mobile/`:** 11 de 14 combinações. Faltam `mlc-C-sem-edicao`, `op-B-sem-edicao` e `op-C-sem-edicao`. Tratamento: gerar as 3 que faltam, ou declarar a omissão.
- ℹ️3 **Padding do `.btn-ouro`:** 22 px no MLC, 18 px na OP. Tratamento: alinhar o padding num único valor.
- ℹ️4 **Rótulo do vazio da OP C:** «🎫 Programada — SEM EDIÇÃO» (com travessão) contra «🎫 Programada SEM EDIÇÃO» em A/B. Tratamento: uniformizar.
- ℹ️5 **pt-PT nas anotações da prancha** (fora do telefone): «acção», «desactivado/a», «ecrã», «activas» (index.html:21,57,66,68; mlc.html:144-145; op.html:14,24,191). A UI do telefone não tem nenhum (medido no MLC). Tratamento: rever a grafia, se o entregável for todo pt-BR.
- ℹ️6 **BottomNav do telefone** usa `href="#"`. É aceitável num mockup; poderia ligar a mlc.html/op.html/inicio.html.

## Não medido
- Larguras 768 e 1024 (fora do foco mobile pedido).
- Validação W3C formal (só parser próprio + DOM).
- Contraste sobre a arena: o cálculo usa o navy como base, e o véu `rgba(5,8,24,.45→.88)` não entra no composto. Todo o texto está em vidro ≥ .5 de alfa, por isso o impacto esperado é nulo, mas não foi medido pixel a pixel.
