# UTAC109f — Início: ordem final + acessos rápidos + glass final + pendências do 109e

**Tipo:** produto (frontend) · **Executor:** Claude Code (Opus 5.5) · **Data:** 2026-10-09 · **HI5:** 2 h
**Baseline:** `731ec28` · **Commit do código:** `f8c622e` · Spec `_logs/UTAC109f.spec.yml` · SEG-1 `_logs/UTAC109f_SEG-1_MEDICAO.md`

## SEG-1 — medição (resumo)
HEAD = origin/main = `731ec28`; árvore sem código modificado; suíte **935/935 · 1095/1101 VERDE**; disco 8,1 GB. As 4 skills de
design vivem no Hermes (`~/AppData/Local/hermes/skills/`) — lidas e acessíveis. Inventário `ficheiro:linha` completo no log do SEG-1.
Veredicto **AJUSTAR** → 4 perguntas ao operador.

### Decisões do operador (R18, 2026-10-09)
| # | Decisão |
|---|---|
| R18-A | Glass MLC do Início com `EM_BREVE_MODE` = **o cartão vazio da aba MLC** (GUTO 7 + «Seu lance (em centavos)» desligado). O Início perde o botão para `/mercado` (a aba continua na barra) |
| R18-B | «Perfil» → **`/configuracoes`** (não existe `/perfil` nem `/mais`) |
| R18-C | «Suporte» → **`mailto:desafiogut01@gmail.com`** (o canal do rodapé, MC88.44) |
| R18-D | **P3 só local**: vite `127.0.0.1:3000` (não produção), perfil de browser NOVO e descartável, sem dados pessoais em formulário nenhum, browser fechado e perfil apagado no fim; o gate LGPD foi aceite **em ambiente de teste**, só para desbloquear a renderização visual |

## SEG0 — Frente A: o Início na ordem final (`src/pages/Dashboard.jsx`)
| Bloco | Feito |
|---|---|
| 1 Carrossel | intocado (8 vídeos, `CarrosselGUTO` no vidro de saudação) |
| 2 4 glass pequenos | **intocados** — o array `stats` e o render dos `StatTile` não aparecem no diff; já estavam entre o carrossel e o 1.º cartão |
| 3 Glass MLC | o mesmo `CartaoEdicao` do 109e; com `EM BREVE` (sinal da fonte única `estAtiva.emBreve`, porque a guarda MC88.43 proíbe ecrãs de importar `EM_BREVE_MODE`) → `vazio acao="lance"` (GUTO 7, «Seu lance (em centavos)», «Dar lance» desligado, estado «SEM EDIÇÃO»); fora do EM BREVE → R-1 + botão «⚡ Dar lance» → `/mercado` (como antes, agora com `acao="lance"`) |
| 4 Glass OP | o mesmo cartão com `acao="palpite"`; sem edição → GUTO 7 + palpite desligado + a frase da OP (P2); estado «SEM EDIÇÃO» |
| 5 Acessos rápidos | `ATALHOS` = 💳 Carteira `/carteira` · 📜 Regras `/regras-oficiais` · ✉️ Suporte `mailto:` · 👤 Perfil `/configuracoes`; ícone + rótulo + a mesma cor `#f5a623`; `min-height: 48px`; 2×2 no telemóvel, 4 numa linha no desktop |
| 6 Glass final | «🏅 Vencedores» em vidro com o aviso no padrão dos placeholders do app (`MeusAtivos.jsx:280,286`). **LACUNA:** não há fonte pública de vencedores (`/edicoes` em produção: 3 encerradas, sem `vencedor`; `registrar-vencedor` fechado; o oficial só se lê on-chain por edição). Sem «ver todos» (não há destino) e sem 🏆 (troféu só com resultado oficial — V2 do 107e.1; a guarda do 107c conta o 🏆 no Início) |

Os atalhos do 107g (Vitrine · Meus Ativos · Configurações) continuam no menu «Mais».

## SEG1 — Frente B: as 5 pendências
- **P1 (fonte):** `src/utils/edicao.js` — `montar(estado, edicao)` escolhe «Em andamento — **palpite** já!» quando o estado é ATIVO e `edicao.tipo === "programado"`. Só o estado ATIVO muda; os outros consumidores de `rotuloLongo` (`CardLance`, `AuctionStatusBar`) usam-no fora do ATIVO. Resolve Início + aba OP **sem tocar em `OfertasProgramadas.jsx`**.
- **P2 (fonte):** `CartaoEdicao.jsx` — `VAZIO_POR_ACAO` (`palpite` → «Sem edições programadas no momento.» / «Volte quando houver»; `lance` e sem acção → o texto de sempre). Um `mensagemVazio` explícito continua a mandar. O Início deixou de forçar «Nenhuma edição Programada em andamento». Resolve a aba OP sem a tocar.
- **P3 (browser):** feito em LOCAL (R18-D) com Playwright + Chrome do sistema, perfil em `mkdtemp` apagado no `finally` (medido: 0 perfis no fim; porta 3000 livre no fim). Screenshots `_logs/utac109f-browser/inicio-375.png` e `inicio-1280.png`. Medido no DOM: ordem crescente (375: stats 248 → MLC 424 → OP 925 → acessos 1417 → vencedores 1608; 1280: 344 → 473 → 1210 → 1942 → 2100), **0 px de overflow lateral**, 4 acessos com **48 px** de altura, vídeos do carrossel e GUTO 7 a tocar (`paused:false`). ⚠️ Os 1.ºs screenshots com `fullPage` só apanharam o viewport (o scroll vive num contentor interno) — refeitos com viewport alto. Ruído local declarado: painel DEV dos cronómetros, aviso «Ambiente de teste — rede Sepolia», erro ENS do ethers (sem contrato no localhost) — nada disto existe em produção.
- **P4 (375 px):** a faixa do cartão (`CartaoEdicao`) passou a `flex-wrap: wrap`, nome com `flex: 1 1 9rem`, tempo `flex: 0 1 auto` (era `flex: none`). **A/B medido a 375 px** (o cartão real renderizado, nome longo): com o tempo «Em andamento — palpite já!» o nome visível passou de **15 px → 285 px** (o tempo desce de linha); com um relógio `02:15:33` fica **igual (195 px)**. Limite: Orbitron não carregada nessa página de medição (fonte de recurso).
- **P5 (skills de design):**
  - **mobile-ux-design** — alvos ≥ 48 px (Android 48 dp), 8 px entre alvos, coluna única, «uma acção primária por cartão», ícone sempre com rótulo; P4 (texto não espremido a 375 px).
  - **claude-design** — processo: medir o que existe, reutilizar o casco (sem variante nova), verificar o artefacto em browser real nos 2 tamanhos, evitar «slop» (sem números/nomes inventados no glass final).
  - **popular-web-designs** — vocabulário de «quick actions» em grelha uniforme (estilo Linear/Stripe: superfícies iguais, um acento) aplicado com os tokens do próprio app, sem trazer cores de fora.
  - **design-md** — contraste WCAG calculado contra os tokens de `docs/mockups-107a/DESIGN.md` (surface `#0c1132`): dourado nos acessos **8,11:1**, dourado sobre superfície 9,07:1, texto 16,05:1, «SEM EDIÇÃO» (`#6b7db8`) **4,6:1** — todos ≥ AA. O lint `npx @google/design.md` não correu (sem rede/pacote local) — declarado.

## SEG2 — Verificação
- Suíte **frontend 945/945 · backend 1095/1101 VERDE** (935 + 10 novos). `vite build` ✓ (para o scratchpad).
- Testes novos em `src/pages/__tests__/Dashboard.test.mjs`: ordem dos 6 blocos; os 4 glass pequenos; acessos (4, ordem, 48 px, mesmo estilo, destinos, Suporte = `<a href=mailto>`); glass final; glass MLC vazio **e** com edição (bidireccional, via o duplo `_stubs/leilaoLock.js` do 108d); P1 na fonte e no ecrã (palpite vs lance, bidireccional); P2 (vazio vs com edição); P4 (estilo da faixa).
- **Contratos alterados (declarado):** UTAC107g (3 atalhos) → substituído pelo 109f; 108h.3 «R-1 visível» passa a valer fora do EM BREVE; P2 nos testes do 106f e 109e (o texto do vazio da OP).
- **Mutação 12/12** (`scripts/utac109f-prova-mutacao.mjs`, restauro md5 idêntico): F1/F2 P1 desligada/alargada · F3/F4 P2 desligada/só na OP · F5 P4 · F6 ordem · F7 Perfil · F8 48 px · F9 glass MLC · F10 🏆 · F11 e-mail · F12 um glass pequeno a menos.
- **Diff zero nos 4 glass pequenos:** `git diff 731ec28 f8c622e -- Dashboard.jsx` não toca no array `stats` nem no render dos `StatTile`.

## Erros dos meus instrumentos (declarados)
1. Heredoc com `\n` dentro de strings Python → quebras reais no script de mutação (SyntaxError) — corrigido; motor comparado byte-a-byte com o do 109e (igual).
2. Um heredoc grande partiu no parser do shell — passei a usar ficheiros escritos com a ferramenta Write.
3. 1.ª versão importava `EM_BREVE_MODE` no Dashboard — a guarda MC88.43 (`mc8843-estado-edicao`) apanhou; trocado pela fonte única.
4. `fullPage` do Playwright capturou só o viewport (contentor de scroll interno).
5. `TaskStop` do vite deixou o processo node vivo na porta 3000 — terminado pelo PID (8016) confirmado pela linha de comando.

## Escopo
Tocados: `Dashboard.jsx`, `CartaoEdicao.jsx`, `utils/edicao.js` + testes + script de mutação + logs/screenshots. **Intactos:** os 4 glass pequenos, `OfertasProgramadas.jsx`, Carteira, backend (`netlify/`), gate legal, contrato, `EM_BREVE_MODE = true`, `package*`, os 5 `.bak-*`.

## SEG3 — Validador adversarial
Subagente independente, worktree A13 em `f8c622e`. **Veredicto: APROVADO COM RESSALVAS · 0 defeitos de comportamento** (verbatim:
`_logs/UTAC109f_SEG3_VALIDADOR.md`). (a)-(k) confirmadas: ordem, 4 tiles fora do diff, cartão 109e reutilizado (alterações aditivas),
P1 só muda Programada ATIVA (nenhum outro consumidor passa `tipo` programado), P2 nos dois ecrãs sem tocar na OP, screenshots reais,
P4 reproduzida por ele (nome 0 → 287 px num contentor de 311 px), 48 px e AA, mutação 12/12, suíte 945/945 · 1095/1101.
14 mutantes próprios: 7 mortos, 6 sobreviventes, 1 equivalente.

**Tratados na mesma ronda (não re-validados em 2.ª ronda — declarado):**
- ⚠️1 (V1) P1 sem teste na ABA OP → teste novo em `utac106f-ofertas` (duplo `leilaoLock`): ativa → «palpite já!», EM BREVE → «EM BREVE».
- ⚠️2 (V2/V3) os 4 tiles sem guarda → teste «diff zero» (sha256 dos blocos `passeStat/stats` e do render dos KPIs = baseline
  `731ec28`, medido byte-igual) + destino do Saldo → `/carteira`.
- ℹ️ V4 placeholder fixado por inteiro · V5 «SEM EDIÇÃO» nos dois vazios · V14 4 colunas no desktop · comentário do contraste
  corrigido para 8,11:1.
- Mutação **18/18** (12 + V1, V2, V3, V4, V5, V14). Suíte final **947/947 · 1095/1101 VERDE**.

**Declarados (não corrigidos):** a faixa do cartão com tempo longo cresce de ~38 para ~85 px a 375 px (é o preço da P4: o tempo
desce de linha); o `edicaoAtiva` de reserva do Dashboard leva `tipo: "programado"` quando a modalidade não é «flash» — hoje
inalcançável (MLC fixo em flash desde o 108e.1), mas com a P1 diria «palpite já!» se a modalidade mudasse; a 2.ª frase do
placeholder e o título «🏅 Vencedores» são adaptação nova do padrão (sem i18n); a P1/P4 não são visíveis nos screenshots (os dois
cartões estão vazios com EM BREVE) — provadas por SSR e pela medição A/B.

## Pendências
- **Fonte pública de vencedores** (LACUNA do bloco 6) — exige backend (fora do escopo).
- O APK só recebe estas mudanças com AAB novo.
