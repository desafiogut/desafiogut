# UTAC110j.3 — SEG-1 (MEDIÇÃO) — GUTO animado no gate legal + Carteira com os 4 botões primeiro

Executor: Claude Code (Opus 5.5) · 2026-10-17 · nada alterado neste segmento.

## -1.1 Estado do repo
- `git rev-parse --short HEAD` = `973c003` = `origin/main` → **igual ao baseline do enunciado**.
- Árvore com sujidade **pré-existente e alheia** (`.agents/skills/*`, `.gitignore`, `.mcp.json`, `_logs/MC100_*` untracked) — não é deste UTAC, não se toca.

## -1.2 Recursos (A14) e disco
- RAM livre: **934 MB** (`Win32_OperatingSystem.FreePhysicalMemory`) → **abaixo do portão de 1 500 MB**. Mesmo desvio estrutural da DEBT-040 (máquina de 5,9 GB). Segmento de medição feito só com leituras; **a suíte NÃO corre abaixo do portão**.
- Disco C: 16 GB livres (> 5 GB).

## -1.3 Frente A — o GUTO do gate legal
- `src/components/TermosConsentimento.jsx:57-63` — `<img src="/assets/guto/custom/guto-bemvindo.png" width=96 height=96 alt="GUTO mascote - pensativo">` dentro de `estilos.gutoWrapper`. PNG de **15 375 B**.
- O gate é montado por `src/Boot.jsx:93` **antes** do PrivyRoot (pré-login). Já importa `Modal` (`components/ui/Modal.jsx`), que já traz `framer-motion` — o `useReducedMotion` do carrossel não acrescenta dependência ao chunk do arranque.
- **O GUTO animado das edições Relâmpago e Programado** = `CartaoEdicao.jsx:131` → `<CarrosselGUTO size={isMobile ? 112 : 128} slides={GUTO_ANIMADO_7} />`, com `GUTO_ANIMADO_7 = Object.freeze([SLIDES[6]])` (`CartaoEdicao.jsx:40`). Aparece no cartão VAZIO do MLC (Relâmpago) e da OP (Programada); com edição, a arte toma o lugar (UTAC109e).
  - Não é o `CardEdicaoEspecial`/`EdicaoCard` (esses usam o `GutoSpritePlayer`, outro GUTO).
- **Formato:** WebM VP9 com alfa (`alpha_mode=1`, 512²) + poster PNG com alfa. Ficheiros `public/assets/guto/carrossel/guto-7.webm` (**401 630 B**) e `guto-7.png` (**197 691 B**), `?v=mc60`.
  - Tamanho < 5 MB ⇒ não accionou a ressalva. Mas é **~39×** o PNG actual (15 KB → 599 KB) no 1.º ecrã ⇒ declarar.
- O `CarrosselGUTO` já cumpre o pedido: `<video loop muted playsInline preload="auto">`, `play()` no efeito (com `pronto` nas deps — UTAC109d.1), **fallback = poster** quando o vídeo falha (`onError`), quando há reduced-motion, e **antes da 1.ª pintura** (MC88.36 — o poster entra logo; os vídeos montam depois). Caixa de tamanho fixo ⇒ sem CLS.
- O carrossel é `aria-hidden`. O `<img>` actual tem `alt`. ⇒ manter o nome acessível com um invólucro `role="img"` + `aria-label`.
- `index.html:54` faz **preload** de `guto-bemvindo.png` (MC99.3) e `src/__tests__/mc993-preload.test.mjs:59` exige-o. Com a troca, o preload fica **sem uso** (custo: 15 KB e um aviso «preloaded but not used» na consola). `index.html` **não está no AUTORIZA** ⇒ não se toca; registar.

## -1.4 Frente B — a ordem da Carteira (`src/pages/MinhaCarteira.jsx`)
Tudo vive **num só vidro** (`GlassCard`, l.250-593). Ordem actual medida:
1. cabeçalho «Carteira» + ↻ (l.251-278) · «Saldo Disponível» + valor R$ (l.283-302)
2. **3 saldos** `data-saldos-passe` — Pontos de fidelidade · Créditos de lance · ECOQUILDO (l.307-361) + 2 erros (l.362-371)
3. **Missões de hoje** (l.375-418)
4. botão «Resgatar cartão» (só com `podeResgatarCartao`, l.431-448)
5. **grelha dos 4 botões** — Depositar PIX → Comprar Passe Desafio → Menor Lance Único → Ofertas Programadas (l.454-528)
6. aviso 402 «Saldo insuficiente → Carregar agora (PIX)» (l.533-552)
7. nota do e-mail PIX (l.562-567) · erro do saldo R$ (l.569-573) · aviso das senhas antigas (l.579-592)

- Sem Framer Motion neste ecrã (`grep motion` = 0) ⇒ não há animação de entrada a reordenar.
- A grelha é `1fr` no telemóvel e `1fr 1fr` no desktop; mover o bloco não muda a grelha.

## -1.5 Testes que fixam a ordem (vão partir)
- `src/pages/__tests__/utac110g1-carteira-resgate.test.mjs:175-195` — exige `saldos < missões < resgate < PIX`.
- `src/__tests__/utac110f-front-missoes.test.mjs:193-205` — exige `saldos < missões < PIX`.
- Não partem (medido por leitura): `utac106c-carteira-render` (só a ordem ENTRE os 4 botões, e saldo < senhas antigas), `utac110d-front`/`utac110e-front` (vidro < saldos), `utac109h2` (cores).
- Os nomes do enunciado `utac109h` (carteira) e `utac110k1` (gate) não fixam nada disto: o `utac110k1` compara texto do regulamento; nenhum teste do gate referencia a imagem do GUTO (`grep bemvindo` nos testes do gate = 0).

## ⚠️ Conflitos e ambiguidades (AU3 — não resolvidos pelo executor)
1. **RAM 934 MB < 1 500 (A14).** A suíte não corre assim; é preciso libertar memória.
2. **O «Saldo Disponível» (R$) fica onde?** A lista do operador começa em «Pontos de Fidelidade»; o saldo em R$ é o cabeçalho do vidro. Proposta: **fica no topo**; os 4 botões passam para logo a seguir a ele, antes dos 3 saldos.
3. **Onde ficam o «Resgatar cartão» e o aviso 402?** Proposta: o aviso 402 (é do botão do Passe) vai **colado à grelha**; o «Resgatar cartão» fica **depois das Missões** (é dos pontos).
4. **Fallback do vídeo no gate:** o poster do próprio vídeo (`guto-7.png`, 198 KB) — mesma pose, sem salto visual — e não o `guto-bemvindo.png` (outra pose).
5. **Preload órfão do `guto-bemvindo.png` em `index.html`** — fora do AUTORIZA; fica registado como pendência.

## -1.7 Veredicto
**AJUSTAR** — perguntar ao operador os itens 1-3 antes do SEG0.

## Decisões do operador (R18, 2026-10-17)
- **R18-110j.3-A** (A14): «feche o necessário» — só o que é desta sessão ou não tem janela.
- **R18-110j.3-B** (ordem): **Saldo R$ → 4 botões → cards** (Pontos · Créditos · ECOQUILDO · Missões); o aviso 402 fica colado aos botões.
- **R18-110j.3-C** (resgate): o «Resgatar cartão» fica **depois das Missões**.
- Itens 4-5 (poster do vídeo como fallback; preload órfão no `index.html`): seguem a proposta do executor, declarados.
