# UTAC108e.1 — SEG7 — Validador adversarial

Commit validado: `46e536a` (pai `abfb476`). Worktree próprio: `C:/Users/Moltbot/AppData/Local/Temp/val108e1/wt` (criado e removido com `scripts/worktree-helper.mjs`; 4 junctions). O repo principal não foi alterado; este ficheiro é o único escrito nele.

## Veredicto: APROVADO, com ressalvas (0 bloqueantes)

Nenhuma das alíneas (a)–(n) foi refutada no comportamento que o commit entrega. A alínea (h) só se cumpre em parte: os tokens estão unificados, mas sobram tons de dourado em código anterior ao commit, fora do escopo dele ou proibido de tocar. Há também 3 buracos nos testes, provados por mutação (ver «Mutações»).

## Alínea a alínea

| # | Alegação a refutar | Resultado | Evidência |
|---|---|---|---|
| (a) | MLC não mostra a variante B | **NÃO REFUTADA** | `MercadoLances.jsx:405-408` monta `<CartaoEdicao destaque …>`. `CartaoEdicao.jsx:61-93`: a arte ocupa a largura toda (`width:100%`), `aspectRatio` 1:1 no mobile e 16:9 no desktop, e há uma faixa com nome e tempo. Num render SSR real (emBreve=false), o cartão tem `data-destaque="true"`, a imagem `/artes/edicao-especial-airfryer.jpg` e o texto «R-1 ABERTA Air Fryer». Mutante M1 (tirar `destaque`): 1 RED. |
| (b) | Sem edição, o MLC ainda mostra o aviso solto | **NÃO REFUTADA** (com buraco de teste ⚠️T1) | `SemEdicaoAviso` saiu (`MercadoLances.jsx:21-23`). Render SSR com emBreve=true: «Nenhuma edição em andamento» aparece **uma só vez**, dentro de `article[data-testid=cartao-edicao][data-vazio=true]`, e não há `data-testid="sem-edicao"`. |
| (c) | O cartão vazio não aparece | **NÃO REFUTADA** | MLC: `MercadoLances.jsx:396-399`, com GUTO, «Nenhuma edição em andamento», «Volte quando houver», «SEM EDIÇÃO» e o lance desligado (`input disabled` + `button disabled`). OP: `OfertasProgramadas.jsx:361-376`. Mutante M3 (sem cartão vazio no MLC): 9 RED. Mutante M11 (OP sem estado vazio): 1 RED. Ressalva ⚠️T2 abaixo. |
| (d) | A OP não usa a variante A | **NÃO REFUTADA** | Ordem do `op.html` painel A (cabeçalho+selo → pontos com «faltam N» e histórico recolhido → cartão Quildo com resgate → edições programadas em carrossel → cartão vazio → Regras → tabela «Palpites») é igual à de `OfertasProgramadas.jsx:224-420`. O cartão é compacto (`data-destaque="false"`, arte 64 px e GUTO ao lado do tempo). Mutante M4 (OP com `destaque`): 1 RED. |
| (e) | Os cartões do MLC e da OP são de famílias diferentes | **NÃO REFUTADA** | As duas abas importam e montam o MESMO `components/CartaoEdicao.jsx`; só mudam o modo (`destaque` = B no MLC, compacto = A na OP, como decidido) e a acção (`children`). Há um teste que impede a OP de voltar a ter `<GlassCard as="article">` próprio. Mutante M8 (`children` não renderizado): 19 RED. |
| (f) | A tabela do MLC e a da OP têm padrões diferentes (Regra 2) | **NÃO REFUTADA**, com ressalva ⚠️R2 | Ambas usam `gut-glass-standard`, têm 3 colunas e são o último vidro antes do rodapé. A da OP passou a aparecer sempre. Mutante M7 (tabela da OP volta a depender de edição): 2 RED. |
| (g) | Há texto fora de vidro (Regra 1) | **NÃO REFUTADA** no código novo, com buraco de teste ⚠️T3 | O cabeçalho da OP, o cartão vazio, o histórico e o resgate estão todos dentro de `GlassCard`. No MLC, o lance desligado está dentro do `CartaoEdicao`. O teste 108d (b) confirma «dentroDeVidro» do estado vazio. |
| (h) | O dourado tem 2 tons | **PARCIAL — ressalva ⚠️R4** | Tokens unificados: `glassTokens.js:8` `gold:"#f5a623"` e `globals.css:37` `--color-gut-gold:#f5a623`. No MLC renderizado não aparece `#ff9500` nem `255,149,0`. **Mas** o tom único fica por cumprir em código anterior ao commit: o `#e89400` do gradiente do botão «Dar lance» do `CardLance.jsx:595` (proibido tocar; com edição aparece DENTRO do cartão B, ao lado do botão desligado plano `#f5a623`); `MercadoLances.jsx:516` `linear-gradient(#f5a623,#e89400)` (vista de conformidade das lojas); `#fbbf24` ×8 em `MercadoLances.jsx` (Countdown/OverlayVencedor, l.64-200, hoje inalcançável porque o `showOverlay` está fechado pelo EM_BREVE); `--color-gut-orange-warm:#ff9500` e `--gradient-orange` em `globals.css:30,99` (o nome é «orange», não «gold»). |
| (i) | A Air Fryer ainda diz «PAGA» | **NÃO REFUTADA** | `public/artes/edicao-especial-airfryer.jpg`: md5 `30f3e240…` (original) → `5a555caa…`. Mantém 1254×1254 RGB. Inspecção visual: «Quanto você **OFERTA** por esta Airfryer?». Diff de píxeis contra a original: bbox (748,502)-(1134,756). Fora dessa caixa a média de diferença é ≤0,7 (título, produto, «menor lance», período). O recorte ampliado de «por esta» é visualmente idêntico ao original. A diferença média de 39,7 na faixa de «por esta» vem das pernas do antigo «PAGA», que desciam até essa linha. «Quanto você» está intacto (média 3,2). ℹ️ O «OFERTA» usa uma fonte condensada direita, diferente do pincel itálico do «PAGA» e do resto da arte: é cosmético. |
| (j) | O CardLance foi alterado | **NÃO REFUTADA** | `git diff --name-only abfb476 46e536a` não lista `CardLance.jsx`. No MLC sem edição o CardLance não monta (o teste exige-o). |
| (k) | O «Sem saldo» (108c) partiu | **NÃO REFUTADA** | `MercadoLances.jsx:391-392`: `!EM_BREVE_MODE && mostrarAvisoSemSaldo(...)`. No render emBreve=false com saldo 0 aparece «⚠️ Sem saldo. Carregar agora?». Os testes 108c e 108d continuam verdes. |
| (l) | O backend foi alterado | **NÃO REFUTADA** | Nada em `netlify/functions` no diff. `leilaoLock.js` intacto (`EM_BREVE_MODE = true`). |
| (m) | Algum `.bak-*` foi tocado | **NÃO REFUTADA** | Há 5 `.bak-*` versionados e nenhum aparece no diff. `package*.json` também não. |
| (n) | A suíte canónica está vermelha | **NÃO REFUTADA** | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` em foreground, no worktree: `frontend: VERDE 906/906 pass` · `backend: VERDE 1095/1101 pass` · `VEREDITO: VERDE` (1 min 46 s). |

## Mutações próprias

Cada mutação foi aplicada a uma cópia (worktree próprio) e o ficheiro foi depois restaurado byte a byte, com o sha256 confirmado. Ficheiros corridos: utac108e1, utac108d, utac108c, utac107d e utac106f (84 testes na base, todos verdes).

| Mutante | Resultado |
|---|---|
| M1 MLC sem `destaque` | 1 RED |
| M3 sem edição → nada (cartão vazio some) | 9 RED |
| M4 OP com `destaque` | 1 RED |
| M7 tabela da OP volta a `edicaoTabela &&` | 2 RED |
| M8 `children` não renderizado no cartão | 19 RED |
| M9 botão «Dar lance» desligado deixa de ter `disabled` | 1 RED |
| M11 OP sem `vazio` | 1 RED |
| M12 GUTO removido do cartão vazio | 1 RED |
| **M2** aviso solto «Nenhuma edição em andamento.» (com ponto) em vidro AO LADO do cartão vazio | **SOBREVIVE (84/84 verde)** → ⚠️T1 |
| **M5** cartão vazio da OP com `style={{display:"none"}}` | **SOBREVIVE** → ⚠️T2 |
| **M6** 2.º dourado `#fbbf24` no nome do cartão | **SOBREVIVE** → ⚠️T4 |
| **M10** `<p>` solto fora de vidro no topo da OP | **SOBREVIVE** → ⚠️T3 |

## Ressalvas

### ⚠️ Comportamento e coerência

- **⚠️R1 — Com edição, o MLC não tem contagem decrescente.** No modo B, `tempo={est.timer ?? est.rotulo}` (`MercadoLances.jsx:410`). Para uma edição ATIVA, `PERFIL_ESTADO.timer` é `null` («null = o ecrã desenha a contagem viva», `utils/edicao.js:56`). O cartão mostra então «Ativa» em Orbitron dourado na faixa do tempo, redundante com a pílula «ABERTA». O mockup B mostra «24:31». Medido no render SSR: «R-1 ABERTA Air Fryer Ativa». Hoje não se vê em produção (EM_BREVE ligado), mas aparece no dia em que se desligar.
- **⚠️R2 — Sem edição, a tabela do MLC continua a dizer «📋 Lances — Edição R-1 🕒 Em breve».** O cartão diz «Nenhuma edição em andamento», o que é contraditório. O mockup B (vazio) diz só «Lances», e a OP vazia já diz só «Palpites». A causa está na `TabelaLances`, que não foi tocada. É uma assimetria da Regra 2 no texto, não na estrutura.
- **⚠️R3 — Com edição, cartão dentro de cartão.** O `CardLance` real renderiza o seu próprio `<Card glow="primary" className="p-6 …">` (`CardLance.jsx:373`) DENTRO do `GlassCard` do `CartaoEdicao`. Isto dá moldura e brilho duplos, enquanto o mockup B tem o lance sem moldura própria. Não foi medido em browser e está escondido hoje pelo EM_BREVE.
- **⚠️R4 — Tom único de dourado só parcial.** Ver a alínea (h): `#e89400` (CardLance e conformidade) e `#fbbf24` (overlays) mantêm-se.

### ⚠️ Testes (provados por mutação)

- **⚠️T1** — A contagem de «aparece uma só vez» procura `"Nenhuma edição em andamento<"`. Um aviso solto com ponto final passa ao lado da regra (M2).
- **⚠️T2** — O estado vazio da OP não tem verificação de visibilidade. O 108d só a tem do lado do MLC (M5).
- **⚠️T3** — Não há guarda da Regra 1 (texto fora de vidro) para a OP (M10).
- **⚠️T4** — A guarda do dourado único só proíbe `#ff9500`. Qualquer outro tom passa (M6).

### ℹ️ Informativas

- O `ModeSelector.jsx` ficou como código morto, sem importadores. O comentário dele ainda diz `flash=gold (#ff9500)`.
- A `modalidade` fica fixa em `"flash"` porque nenhuma UI chama `setModalidade`. O contexto ainda a expõe, e por isso o aviso «Sem saldo» nunca é escondido pelo ramo «programado» do 108c.1, que deixou de ser alcançável no MLC.
- O selo «⚡ Relâmpago» aparece duas vezes no MLC vazio (selo do cabeçalho e pílula do cartão), como no mockup.
- `email-banner.jpg` diz «QUANTO QUER PAGAR». Está fora do escopo: não é a arte da Air Fryer.

## Comandos-chave

- `node scripts/worktree-helper.mjs criar C:/Users/Moltbot/AppData/Local/Temp/val108e1/wt 46e536a` → 4 junctions.
- `node scripts/mc966-suite-harness.mjs ambos < /dev/null` → `frontend: VERDE 906/906` · `backend: VERDE 1095/1101`.
- Corrida-base dos 5 ficheiros → `ℹ pass 84 · ℹ fail 0`.
- Mutações: `val108e1/mut/run.py`, que restaura cada ficheiro com assert de sha256 («restaurado byte-identico»).
- Arte: PIL `ImageChops.difference` old/new → bbox `(748,502,1134,756)` a thr 12.
- Dump SSR do MLC: um teste temporário no worktree (já apagado) reutilizou o arnês do `utac108e1-mlc-op.test.mjs`.

VEREDICTO: APROVADO (com ressalvas; 0 bloqueantes; (h) parcial por resíduos anteriores ou fora do escopo; 4 buracos de teste provados por mutação)
