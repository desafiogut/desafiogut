# UTAC109h.2 — SEG4 · VEREDICTO DO VALIDADOR ADVERSARIAL

Validador independente (subagente Hermes). Alvo: commit local `11f6416` (não empurrado). Baseline `6d62637`; referência do revert `1a41cf7`. Worktree próprio em `C:/Users/Moltbot/AppData/Local/Temp/utac109h2-val/wt` (sha `11f6416`, criado e removido com `scripts/worktree-helper.mjs`; `git status` do worktree ficou LIMPO antes de remover → o mutador restaurou o md5). Main tree intocado (só leitura).

## Veredicto
APROVADO COM RESSALVAS — 1 bloqueante.

O **conteúdo** do commit resiste: é um revert fiel só-de-cor, os 3 contratos estão byte-iguais a `1a41cf7`, os contrastes reproduzem ao centésimo, a suíte canónica está VERDE no main tree e a mutação dá 10/10 no main tree. O bloqueante é de **reprodutibilidade da própria guarda**, não do artefacto de produção.

## Reproduzido por execução (pelo validador)

Cada linha: comando → saída REAL (verbatim, resumida).

1. `git show --stat 11f6416` → **10 paths**: `_logs/UTAC109h.2.spec.yml`, `_logs/UTAC109h.2_SEG-1.md`, `utac106c-carteira-render.test.mjs`, `utac106c-carteira.test.mjs`, `utac109h-carteira.test.mjs` (**D**), `utac109h2-carteira.test.mjs` (**A**), `PainelIndicacao.jsx`, `MinhaCarteira.jsx`, `mc99-limpeza-ui.test.mjs`, `scripts/{utac109h-prova-mutacao.mjs => utac109h2-prova-mutacao.mjs}` (**R052**, não D+A).
2. `git diff --name-status 6d62637 11f6416` → 10 entradas, as mesmas. Nenhum outro caminho. `numstat` vs `1a41cf7` nos 2 alvos: `11/7` (MinhaCarteira) e `13/10` (PainelIndicacao).
3. Detector próprio (node, strip de comentários — bloco/JSX/`//` — preservando newlines) sobre `desafio-gut/frontend/src` (**283 ficheiros**), cores proibidas, **em CÓDIGO**: `#ff6b35`=18, `#00d4ff`=11, `#00d4aa`=9, `#0aa37e`=2, `#10b981`=35, `#fbbf24`=52, `#a78bfa`=9, `#e89400`=9; `rgb(0,212,255)`=0, `rgb(0,212,170)`=0, `rgb(16,185,129)`=0. **Nas 2 peças do ecrã: 0 cada** (a única ocorrência `#0aa37e` em `PainelIndicacao.jsx:17` é comentário).
4. Refeito o diff `1a41cf7..11f6416` por ficheiro (script): **MinhaCarteira** removidas=7, sem QUALQUER token de cor=**0**, sem hex/rgba=**2** (são 2 comentários com nomes PT «azul»/«laranja»); adicionadas=11, sem hex/rgba=2 (1 do comentário-cabeçalho + 1 comentário «âmbar»). **PainelIndicacao** removidas=10, sem cor=**0**, sem hex/rgba=**0**; adicionadas=13, sem hex/rgba=0.
5. `git rev-parse 1a41cf7:<f>` vs `11f6416:<f>` nos 3 contratos → **BLOB-EQUAL**: `214ab42daaa859e639e58cc6db9ef0411106c629`, `0cec0afbe6c121629adc88d133232fd34cf06cba`, `b9ecfe2dfe3ea563c83fde95af3d31ddb6c2e9e8`.
6. Contraste recalculado por mim (sRGB→luminância relativa): amarelo/vidro=**9,09**; amarelo/tingido `rgba(245,166,35,.14)` sobre `#0c1131` (=`#2d262f`)=**7,25**; navy/amarelo=**9,45**; vermelho/vidro=**4,89**; branco/amarelo (controlo negativo)=**2,03** → bate exacto com o SEG-1.
7. Suíte canónica, main tree, foreground, `< /dev/null`: `frontend: VERDE 970/970 pass` · `backend: VERDE 1095/1101 pass` · `VEREDITO: VERDE`.
8. Mutador no meu worktree: `node scripts/utac109h2-prova-mutacao.mjs` → `M1 4RED M2 4RED M3 4RED M4 4RED M5 3RED M6 2RED M7 3RED M8 4RED M9 3RED M10 2RED` · `restauro …: md5 idêntico` (×2) · `MUTAÇÃO 10/10 PROVADOS`.
9. Teste novo, isolamento do fim de linha — 3 execuções:
   - worktree do sha (fonte **CRLF**) → `tests 9 / pass 7 / fail 2` (falham **5** e **8**).
   - main tree (fonte **LF**) → `tests 9 / pass 9 / fail 0`.
   - cópia da fonte com `tr -d '\r'` (LF) → `tests 9 / pass 9 / fail 0`.
   Causa: os regex do teste usam `\n` (`/width: "100%",\n    minHeight: "48px",/` e `/background: COR\.gold,\n                    color: ON_GOLD,/`); com `\r\n` não casam. `frontend/…/MinhaCarteira.jsx` no main tree tem **0 CR**; o worktree checkout deu CRLF (`core.autocrlf=true`, e o `.gitattributes` fixa LF para `*.mjs/.js/.cjs/.sh/.py/.json/.yml/.yaml/.toml/.md` — **não** para `*.jsx`).
10. `file`/contagens: `frontend/node_modules`=498 entradas, `netlify/functions/node_modules`=414, root=568 → ordens de grandeza intactas após criar+remover o worktree.
11. Tom do botão: `Dashboard.jsx:39 gold:"#f5a623"` + `Dashboard.jsx:462 background: COR.gold`; `OfertasProgramadas.jsx:48 gold:"#f5a623"` + `:154 background: COR.gold`; `glassTokens.js:8 gold:"#f5a623"`. `MinhaCarteira.jsx:32 ON_GOLD="#0a0f1a"`, `:240 color: ON_GOLD`. Erros: `PainelIndicacao.jsx:255 color:"#ef4444"`, `MinhaCarteira.jsx:27 danger:"#ef4444"`.

## Achados

| id | ⚠️/ℹ️ | alegação afectada | evidência | tratamento |
|---|---|---|---|---|
| F1 | ⚠️ grave | 8 e 9 (suíte verde / mutação 10/10) | O teste novo é **frágil ao fim de linha**: passa 9/9 só com fonte LF. No worktree do sha (fonte CRLF) dá **2 falhas (testes 5 e 8)**; em LF dá 9/9. `core.autocrlf=true` e `.gitattributes` não fixa `*.jsx` a LF (`* text=auto`). Reproduzido (medição 9). | Acrescentar `*.jsx text eol=lf` (e `.tsx`/`.css`) ao `.gitattributes`; **e/ou** normalizar `\r\n`→`\n` no `readFileSync` do teste; e no mutador exigir **baseline VERDE** (`fail==0`) antes de mutar, senão a prova é vacuosa. Correr mutador+suíte num worktree NOVO, não no main tree. |
| F2 | ⚠️ grave (mesma raiz de F1) | 9 («10/10 PROVADOS e não circular») | No worktree CRLF a baseline já tem 2 RED → os mutantes **M6** (alvo = teste 8) e **M10** (alvo = teste 5) reportam `2 RED`, **igual à baseline** ⇒ provas VACUOSAS. O mutador não verifica que o teste está verde antes de mutar (linhas 39-52 do `utac109h2-prova-mutacao.mjs`). | Ver F1 (asserção de baseline verde impede a vacuidade). No main tree (LF) os 10/10 são válidos. |
| F3 | ℹ️ nota | 3 («0 ocorrências no CÓDIGO») | A redacção, sem escopo, é **falsa**: em código repo-wide `#ff6b35`=18, `#fbbf24`=52, `#10b981`=35, `#e89400`=9, etc. (medição 3). Vivas em: `glassTokens.js:7 primary:"#ff6b35"`, `globals.css:27/65/70/99` (tokens laranja + `--gradient-orange`), `OfertasProgramadas.jsx:48 primary:"#ff6b35"`. Só é verdadeira **nas 2 peças** (0 cada). | Reparar a redacção: «0 nas duas peças do ecrã» (escopo explícito), como o SEG-1 §-1.4 já faz. |
| F4 | ℹ️ nota | 3/11 («apenas amarelo, tom único») | As **próprias modais da Carteira** mantêm as cores retiradas: `ComprarFichasModal.jsx:266` e `ComprarPasseModal.jsx:77` usam `linear-gradient(135deg,#f5a623,#e89400)` (o gradiente de 2 tons que o UTAC diz ter retirado do botão base), e o `COR` local delas lista `#fbbf24`/`#10b981`/`#a78bfa`. Herdado (nem `93e17ac` nem `11f6416` tocaram nesses ficheiros). `.gut-glass-standard` usa só navy/branco ⇒ o laranja `#ff6b35` não chega ao vidro da Carteira. | Declarar o escopo («as 2 peças»), ou estender a unificação às modais se o operador quiser «tom único» no écran inteiro. |
| F5 | ℹ️ nota | 1 e 7 («2 ficheiros removidos») | O git regista **1 D** (`utac109h-carteira.test.mjs`) e **1 R052** (rename) para o mutador — não delete+add. E o novo mutador deriva do antigo (14+/16-), casando 52%. | Corrigir a redacção para «teste removido + mutador renomeado». Não muda o resultado. |
| F6 | ℹ️ nota | 2 («0/7 e 0/10») | O «0/7» depende de contar **nomes PT de cor em comentários**: 2 das 7 linhas removidas de `MinhaCarteira` não têm hex/rgba (são os comentários «azul suave» / «laranja suave»). Sob hex/rgba estrito seria 2/7. Não afecta a substância (são comentários, não layout/copy). | Manter, mas dizer que o detector inclui nomes de cor. |
| F7 | ℹ️ nota | 8 (RAM) | O log declara «1 504 MB de RAM livre». Medi **1 169 MB** e **1 493 MB** (momentos diferentes) — o valor não reproduz e está **abaixo** do limiar A14 (1500) na minha execução, ainda assim `VEREDITO: VERDE`. | Não tratar o número de RAM como evidência; reportar o valor da execução. |
| F8 | ℹ️ nota | 4/10 (documentação) | O comentário-cabeçalho do `PainelIndicacao.jsx:16-18` está **mutilado**: diz «Saíram o verde-água `#f5a623`, o gradiente `#0aa37e`, o verde `#f5a623` e o `#f5a623`» — escreveu `#f5a623` onde deviam estar `#00d4aa`/`#10b981`/`#fbbf24` (auto-contraditório). O homólogo em `MinhaCarteira` está correcto. | Corrigir as 3 linhas de comentário. Sem impacto funcional. |

## Alegações REFUTADAS

1. **Alegação 3 na sua forma literal** («É uma só cor de destaque e NENHUMA outra viva … 0 ocorrências no CÓDIGO»). **Derrubada**: a varredura repo-wide com strip de comentários (283 ficheiros, medição 3) encontra as cores retiradas vivas em código — `#ff6b35` (18), `#fbbf24` (52), `#10b981` (35), `#e89400` (9), `#00d4ff` (11), `#00d4aa` (9), `#a78bfa` (9), `#0aa37e` (2). Exemplos: `glassTokens.js:7`, `globals.css:27/65/70/99`, `OfertasProgramadas.jsx:48`. A alegação é **verdadeira só se escopada às 2 peças** — aí sim 0 cada.
2. **Alegação 7** («os 2 ficheiros removidos são exactamente o teste e o mutador»). **Derrubada na forma**: `git diff --name-status` mostra **1 D** + **1 R052** (rename), não 2 remoções. O mutador antigo foi renomeado (52% de similaridade), não apagado.
3. **Alegação 2, número «0/7», sob detector hex/rgba estrito**. **Derrubada na forma**: 2 das 7 linhas removidas de `MinhaCarteira` não têm qualquer hex/rgba (são comentários com nomes PT). Sob o detector declarado (hex/rgba + nomes de cor) o 0/7 mantém-se.
4. **Alegação 3/11 na parte «apenas amarelo/tom único» ao nível do ecrã**. **Derrubada**: as modais que a Carteira abre (`ComprarFichasModal.jsx:266`, `ComprarPasseModal.jsx:77`) renderizam o gradiente de 2 tons `#f5a623→#e89400` e listam `#fbbf24`/`#10b981`/`#a78bfa` no seu `COR`. O «tom único» vale só para as 2 peças, não para o fluxo do ecrã.

## Alegações que NÃO consegui refutar

Tentei derrubar cada uma e resistiram:

- **1** (10 ficheiros exactos) — `git show --stat` + `--name-status` dão exactamente os 10 paths, nenhum outro.
- **2** (mudança só de cor) — refiz o diff `1a41cf7..11f6416` linha a linha: **0/7** e **0/10** linhas removidas sem token de cor; nenhuma dimensão/padding/gap/ordem/estrutura/copy alterada (as linhas extra adicionadas são o comentário-cabeçalho). Net diff = cor. **Resistiu.**
- **4** — `#ef4444` presente em ambos; `ON_GOLD = "#0a0f1a"` e `color: ON_GOLD` no CTA. **Resistiu.**
- **5** (contrastes) — recalculei de raiz: 9,09 / 7,25 / 9,45 / 4,89 e o controlo negativo 2,03 (reprova). **Resistiu.**
- **6** (contratos byte-iguais a `1a41cf7`) — blobs idênticos nos 3. Tentativa de refutação (procurar «adaptação») falhou. **Resistiu.**
- **8** (suíte 970/970 + 1095/1101) — reproduzido no main tree por execução directa. **Resistiu** (só o número de RAM não).
- **9** (mutação 10/10, não circular) — o mutador muta o **código-fonte** e verifica `fail>0` do teste novo (não lê as asserções) → não é circular. 10/10 no main tree. **Resistiu no main tree**; em worktree CRLF há 2 provas vacuosas (F2).
- **10** (`#f5a623` é o tom do botão «Dar palpite») — `COR.gold="#f5a623"` em `Dashboard.jsx:39` e `OfertasProgramadas.jsx:48`; ambos os botões usam `background: COR.gold`. **Resistiu.**
- **11** (nada fora do escopo tocado) — o commit toca só os 10 paths; `GlassHeader.jsx`, `CartaoEdicao.jsx`, `Dashboard.jsx`, MLC, OP, `netlify/`, `package*.json`, `.bak-*` não aparecem. **Resistiu** (o alcance «apenas amarelo» tem a ressalva F4).
- **12** (`PainelIndicacao` sem `minHeight` nos botões Copiar/Compartilhar) — confirmado: **nenhum `minHeight`** no ficheiro. O limite declarado é **verdadeiro**, não é defeito novo. **Resistiu.**

## O que NÃO foi medido

- **Não houve medição no browser / renderização.** Toda a prova (minha e do executor) é **estática sobre o texto-fonte**. Não vi o écran da Carteira a correr; «laranja ausente do écran» é inferência do código, não observação.
- **A suíte canónica correu só no main tree (LF).** Não corri os 970 no worktree CRLF — só o teste novo isolado (2/9 falhas). Não sei quantos dos 970 falhariam num clone fresco.
- **RAM:** a alegação «1 504 MB» não foi reproduzida (medi 1 169 e 1 493).
- **Fragilidade CRLF:** só medi `*.jsx`; não medi `*.tsx` nem `*.css` (o scan de cores cobriu `.css`, mas não a fragilidade de regex).
- **Backend 1095/1101** (6 não-passados): não investiguei se são pré-existentes deste UTAC.
- **Contraste:** calculado, não visto no écran (sem validação por amostragem de pixéis).
- Não auditei o conteúdo das modais contra o resto do programa de fidelidade (fora do escopo dos 2 ficheiros).

## Decisão

O **conteúdo** do commit cumpre o pedido (revert fiel só-de-cor + amarelo único `#f5a623` nas 2 peças) e a suíte canónica está VERDE no main tree. Antes do fecho, o executor tem de:

1. **[BLOQUEANTE F1/F2]** Tornar a guarda portável e não-vacuosa: acrescentar `*.jsx text eol=lf` (e `.tsx`/`.css`) ao `.gitattributes` **e/ou** normalizar `\r\n`→`\n` na leitura do teste; e adicionar ao mutador a asserção de **baseline VERDE (`fail==0`) antes de mutar**. Depois, **provar num worktree NOVO** (não no main tree) que o teste dá 9/9 e a mutação 10/10 — hoje, num worktree do sha, o teste dá 2 falhas e M6/M10 são vacuosos.
2. **[NOTA F8]** Corrigir as 3 linhas do comentário-cabeçalho do `PainelIndicacao.jsx` (cita `#f5a623` onde deviam estar `#00d4aa`/`#10b981`/`#fbbf24`).
3. **[NOTA F3/F4/F5/F7]** Reparar a redacção das alegações 3 («0 nas duas peças»), 7 («renomeado», não removido) e o número de RAM; e decidir, com o operador, se «apenas amarelo/tom único» deve estender-se às modais da Carteira (`#f5a623→#e89400` ainda vivo).

Nada do acima contesta a correcção do artefacto de produção (os 2 blobs repostos, LF, byte-correctos): os bloqueantes são da **reprodutibilidade da prova**, não do ecrã.

---
*Veredicto do validador adversarial independente · UTAC109h.2 · commit local `11f6416` (não empurrado).*
