# UTAC110j.3 — GUTO animado no gate legal + Carteira com os 4 botões primeiro

Executor: Claude Code (Opus 5.5) · 2026-10-17 · baseline `973c003` (= origin/main) · **sem commit nem push** (aguarda autorização).
Medição: `_logs/UTAC110j.3_SEG-1_MEDICAO.md` (veredicto AJUSTAR → decisões R18-110j.3-A/B/C do operador).

## Recursos (A14)
- Arranque: 934 MB livres. Operador: «feche o necessário» → fechadas as árvores de 7 servidores MCP **desta sessão** sem uso
  (mockit, tapsite, sportscore, binance, validkit, pythonanywhere, jetbrains-proxy). Nada com janela foi tocado; o chrome-devtools ficou.
- Depois: **1 820 / 1 822 / 1 820 MB**; antes da suíte **1 981 MB** (portão cumprido).

## SEG0 — Frente A (gate legal) — `src/components/TermosConsentimento.jsx`
- Sai o `<img src="/assets/guto/custom/guto-bemvindo.png">` (96×96, 15 KB).
- Entra `<CarrosselGUTO size={96} slides={GUTO_GATE} />`, com `GUTO_GATE = Object.freeze([SLIDES[6]])` — o **GUTO animado 7**, o mesmo
  dos cartões das edições Relâmpago (MLC) e Programada (OP) (`CartaoEdicao.jsx`, `GUTO_ANIMADO_7`, UTAC109e). Não se importa o
  `CartaoEdicao` para não puxar o cartão para o chunk do arranque.
- Autoplay/loop/muted/fallback: **já vêm do `CarrosselGUTO`** (não alterado): `<video loop muted playsInline preload="auto">`, `play()` no
  efeito (UTAC109d.1), e o poster do próprio vídeo (`guto-7.png`) antes da 1.ª pintura (MC88.36), com reduced-motion e quando o vídeo
  falha (`onError`, ex.: Safari sem VP9-alfa). Caixa de tamanho fixo ⇒ sem salto de layout.
- Acessibilidade: o carrossel é `aria-hidden`; o invólucro passou a `role="img" aria-label="GUTO mascote"` (o `<img>` tinha `alt`).
- Texto, 4 caixas e botão do gate: **intocados**.
- **Peso no 1.º ecrã:** 15 KB → poster 198 KB (imediato) + vídeo 402 KB (depois da 1.ª pintura). < 5 MB (ressalva não accionada), mas
  ~40× o PNG — declarado.

## SEG1 — Frente B (Carteira) — `src/pages/MinhaCarteira.jsx`
- Bloco movido (por script, com asserções de contagem): a grelha dos 4 botões + o aviso 402 passaram de depois do «Resgatar cartão» para
  logo depois do «Saldo Disponível» (R18-110j.3-B). O «Resgatar cartão» ficou depois das Missões (R18-110j.3-C).
- Ordem nova: **Saldo R$ → Depositar PIX → Comprar Passe Desafio → Menor Lance Único → Ofertas Programadas → [aviso 402] → Pontos de
  fidelidade → Créditos de lance → ECOQUILDO → Missões de hoje → Resgatar cartão → nota do PIX → senhas antigas**. Tudo no mesmo vidro.
- Mudanças além da posição (só espaçamento e comentários): a grelha ganhou `marginBottom: 0.95rem` (a folga que os saldos davam por baixo);
  o aviso 402 passou de `marginTop: 0.85rem` para `margin: -0.35rem 0 0.95rem` (colado à grelha, com folga para os saldos); 2 comentários
  que diziam «antes dos botões» foram corrigidos. Rótulos, estilos e handlers dos botões e conteúdo dos cards: iguais.
- Sem Framer Motion neste ecrã ⇒ nada a reordenar.
- Efeito declarado: a nota «Depósito por PIX via Mercado Pago — e-mail» ficou no fim do vidro, agora mais longe do botão «Depositar PIX».

## SEG2 — Verificação
- **Testes alterados (declarados, invariante mantida — «dentro do 1.º vidro»):**
  - `src/pages/__tests__/utac110g1-carteira-resgate.test.mjs` (S): `saldos < missões < resgate < PIX` → `PIX < saldos < missões < resgate`.
  - `src/__tests__/utac110f-front-missoes.test.mjs` (S): `saldos < missões < PIX` → `PIX < saldos < missões`.
- **Teste novo** `src/__tests__/utac110j3-gate-carteira.test.mjs` (8): G1-G3 gate (mesmo slide das edições, 96 px, nome acessível, sem o
  PNG, texto/caixas/botão), V1-V2 vídeo (poster antes da 1.ª pintura; depois, `<video>` com loop+muted+playsInline+poster+onError),
  O1-O3 Carteira (ordem completa, dentro do 1.º vidro, cards com o mesmo texto, aviso 402 entre botões e saldos, resgate depois das missões).
- **Mutação 7/7 PROVADOS** (`_logs/UTAC110j.3_MUTACAO.py`), restauro md5 idêntico: M1 gate volta ao PNG (2 RED) · M2 outro slide (3) ·
  M3 sem nome acessível (1) · M4 Carteira com a ordem antiga (4) · M5 vídeo sem `muted` (1) · M6 vídeo sem `onError` (1) · M7 aviso 402
  depois dos saldos (1).
- **Suíte canónica:** frontend **VERDE 1189/1189** (1181 + 8) · backend **VERDE 1351/1357** (igual ao baseline), RAM 1 981 MB.
- **Browser** (Chromium/Playwright, arnês temporário com o `vite.config.js` real; gate verdadeiro; Carteira com sessão sintética; apagado):
  - Gate 375/1280: `<video>` a tocar (`paused:false`; `currentTime` 3,98 → 5,20 s), `loop` e `muted` true, `readyState 4`, caixa 96×96,
    PNG antigo ausente, 4 caixas, overflow lateral **0**.
  - Carteira 375: tops saldo 90 · PIX 166 · Passe 223 · MLU 281 · OP 338 · pontos 402 · créditos 487 · ECOQUILDO 581 · missões 680 ·
    resgate 810; 1280: saldo 110 · PIX=Passe 196 · MLU=OP 253 · 3 saldos 317 · missões 416 · resgate 546. Overflow **0** nos dois.
  - **0 erros de página.** Capturas: `_logs/utac110j.3-browser/` (gate-375/1280, carteira-375/1280).
  - Alvo mínimo 45 px = botões do painel «Indique e Ganhe» — pendência pré-existente P-109h.2-3, não deste UTAC.

## Erros dos meus instrumentos (declarados)
1. O mutador assumiu LF em todos os ficheiros; o `CarrosselGUTO.jsx` é CRLF. O `assert count==1` apanhou-o (o mutante M5 não entrou e o
   script parou **antes** de escrever) — corrigido com âncoras convertidas para o EOL do ficheiro.
2. A 1.ª correcção foi feita por heredoc e o shell transformou os escapes `\r\n` em bytes reais (armadilha já registada) — reescrita com `chr()`.

## Pendências (fora do AUTORIZA — decisão do operador)
- **P-110j.3-1:** `index.html:54` continua a fazer **preload** do `guto-bemvindo.png`, que o gate deixou de usar (15 KB e um aviso «preloaded but
  not used»); `src/__tests__/mc993-preload.test.mjs:59` exige esse preload. Trocar para o `guto-7.png` (ou retirar) mexe em `index.html` + teste.
- **P-110j.3-2:** o APK só recebe isto com o AAB novo (110l) — o frontend vive dentro do `.apk`.
- **Commit + push + deploy:** não feitos (proibido sem autorização).

## SEG3 — Validador adversarial
**APROVADO COM RESSALVAS — 0 bloqueantes (3 ⚠️, 5 ℹ️)** — `_logs/UTAC110j.3_SEG3_VALIDADOR.md` (worktree próprio A13, patch aplicado sobre `973c003`).
Nenhuma das 8 alegações refutada. Reproduziu a suíte (1189/1189 · 1351/1357, com RAM 1 269 MB — abaixo do A14, declarado por ele) e mediu o
gate no seu Chromium (vídeo a tocar 2,46 → 3,98 s; reduced-motion ⇒ só poster). 8 mutantes próprios: 6 morrem nos testes do UTAC; «nunca
chamar play()» morre no `utac109d1`; **o mutante do TEXTO do gate sobreviveu a todos os testes do gate — lacuna PRÉ-EXISTENTE** (A6).
- ⚠️ A1 1.º ecrã +599 KB na rede (15 375 → 614 696 B, inclui o PNG antigo ainda pré-carregado; poster 512 px mostrado a 96 px). No APK sem custo de rede.
- ⚠️ A2 preload órfão confirmado (= P-110j.3-1); a justificação do `mc993-preload` deixou de ser verdade.
- ⚠️ A3 a nota do e-mail PIX ficou longe do botão PIX (decisão do operador) — já declarado acima.
- ℹ️ A4 Safari/iOS não medido · A5 nome acessível encurtado («GUTO mascote») · A6 texto legal do gate sem teste · A7 cabeçalhos de 2 testes
  ainda diziam «antes dos botões» → **CORRIGIDO** depois do veredicto (só comentários; testes 36/36), não re-validado · A8 carrossel no chunk de entrada.
- Correcção de detalhe à alegação 4: são 2 comentários reescritos **e 2 novos**.
- Efeito colateral declarado pelo validador: o vite dele escreveu cache em `node_modules/.vite` (junction ⇒ repo principal).
- Worktree removido pelo helper depois de desfazer o patch (o helper recusou o worktree sujo, como deve); `node_modules` 500 / 414 intactos.

## Pendências novas
- **P-110j.3-3** (A1): poster/vídeo a 512 px para uma caixa de 96 px — uma variante leve (ex.: 192 px) cortaria ~90 % do peso; exige gerar asset.
- **P-110j.3-4** (A6): o texto legal do gate não tem guarda que o fixe (pré-existente).
