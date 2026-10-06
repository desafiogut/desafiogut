# UTAC107b — Carteira: botões, ordem, contraste, Regra 1

**Tipo:** CÓDIGO (frontend + testes) · **Skill:** `mc-driven-projects` + `mobile-ux-design` · `design-md` ·
**Data:** 2026-10-06 · **Modelo:** deepseek-v4-flash (Hermes Agent) · **Baseline:** `3714bbe` (= `origin/main`) ·
**Commit validado:** `f1dc10f` · **Frente:** 1 (Carteira).

> **Objectivo:** aplicar o mockup `docs/mockups-107a/carteira.html` (variante **A · Fiel ao actual**, R18-D)
> em `src/pages/MinhaCarteira.jsx` — remover «Trocar R$ 2,00 → 1 Senha», garantir «Menor Lance Único»,
> acrescentar «Ofertas Programadas», reordenar (PIX → Passe → MLC → OP), corrigir o contraste do Passe
> (2,03:1 → 9,45:1), aplicar a Regra 1 e decidir o e-mail PIX pelo SEG0. **Nenhum** outro ecrã, backend,
> `_lib/` ou `AppContext` tocado.

---

## §Baseline (SEG-1)

| Item | Medido | Comando |
|---|---|---|
| Arranque | 2026-10-06 01:43 | `date` |
| `HEAD` / `origin/main` | `3714bbe2366ca869860ea1e5a814328250e94ee2` (0/0) | `git rev-parse HEAD origin/main` |
| Sujeira (tracked) | **0** | `git status --porcelain \| grep -v '^??'` |
| Suíte (HI1) | **frontend VERDE 774/774 · backend VERDE 1061/1067** → `VEREDITO: VERDE` | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| Deploy vivo | `https://silly-stardust-ca71bc.netlify.app/` → **200** | `curl` |
| Saldo API (arranque) | **US$ 2,10** | `curl /user/balance` |
| Mockups 107a-front | `docs/mockups-107a/` (carteira.html + tokens.css + DESIGN.md); HEAD do mockup `536c9cb` | `ls` |

O `HEAD` confere com o esperado do enunciado (`3714bbe`) ⇒ ambiente não alterado.

---

## §SEG0 — O e-mail PIX aparece no depósito? (verificação ANTES de remover)

**Medido** — o ecrã de depósito é `src/components/ComprarFichasModal.jsx` (modal «💰 Depositar PIX»).

| Pergunta | Medido |
|---|---|
| Mostra o destinatário `desafiogut@gmail.com`? | **NÃO.** Renderiza: `Valor PIX` (`:427`), `Código PIX (copia e cola)` com `pedido.qrCodeText` (`:446`), botão «📋 Copiar código PIX» (`:448`), `provider` (`:431`). O e-mail **nunca** é escrito no ecrã. |
| Onde aparece o e-mail no `src/`? | **Só** em `MinhaCarteira.jsx:304` (a nota do rodapé do cartão de saldo), no ficheiro actual (commit `f1dc10f`). `grep -rn "desafiogut@gmail.com" src/` → 1 sítio. |
| O que o modal usa do e-mail? | Só o **do pagador** (`:186-188`, `body.pagador = { email: emailPagador }`) — que é o e-mail do **próprio utilizador**, não o do recebedor. |

**Conclusão (RESSALVA 5): o e-mail NÃO pode ser removido da Carteira** — é o único sítio do frontend onde
o destinatário do PIX aparece. A nota **mantém-se** (com guarda de teste, §SEG6).

---

## §SEG1 — Remover «Trocar R$ 2,00 → 1 Senha»

- **Antes** (no baseline `3714bbe`, `MinhaCarteira.jsx:241-261`): botão que chamava `trocarPorSenhas(1)` (Via A), com 202 assíncrono.
- **Removido** o botão **e** os órfãos que só ele usava: import `useTrocarPorSenhas`, import `CreditoStatus`,
  estado `creditoTxHash`, `trocaInfo`, `trocaErro`, e os 3 parágrafos de feedback associados.
- **Mantido**: `VALOR_POR_SENHA_BRL` (ainda usado na nota do Art. 20), `refetchSaldo` (usado no `onSucesso`),
  `Toast` (usado pelo balão do Passe).
- ⚠️ **Consequência declarada (decisão 1, reversível):** a UI deixa de ter caminho visível para comprar
  senhas da Via A. O Lance Programado converte R$ → senha sozinho (`CardLance.jsx:416`).

`git diff --numstat MinhaCarteira.jsx`: **98/147** (a remoção do botão + reescrita da grelha + comentários).

---

## §SEG2 — Botões de redireccionamento

| Botão | Handler | Destino | Linha |
|---|---|---|---|
| **⚡ Menor Lance Único** | `irParaMenorLanceUnico()` | `navigate("/mercado")` | `MinhaCarteira.jsx:93` (fn) / `:236` (onClick) |
| **🎫 Ofertas Programadas** (NOVO) | `irParaOfertasProgramadas()` | `navigate("/ofertas-programadas")` | `MinhaCarteira.jsx:98` (fn) / `:254` (onClick) |

O MLC **já existia** (UTAC106c); o enunciado pede para o «adicionar» — foi mantido e o teste por clique
prova que continua a navegar para `/mercado`. O OP é **novo**, com o mesmo estilo do MLC.

---

## §SEG3 — Ordem

Ordem aplicada no JSX (decisão 4): **💰 Depositar PIX → Comprar Passe Desafio R$ 2,00 → ⚡ Menor Lance Único →
🎫 Ofertas Programadas**. A grelha é a mesma de antes (`1fr` mobile, `1fr 1fr` desktop).

---

## §SEG4 — Contraste do botão «Comprar Passe Desafio»

| | Antes | Depois |
|---|---|---|
| Estilo | `...botaoPrimario` (gradiente `#f5a623→#e89400`) com `color: #fff` | `background: COR.gold` (**sólido `#f5a623`**) + `color: ON_GOLD` (**`#0a0f1a`**) |
| Contraste WCAG | branco s/ `#f5a623` = **2,03:1** ✗ (reprova o AA) | navy s/ `#f5a623` = **9,45:1** ✓ |

**Verificado com a régua WCAG** (fórmula de luminância relativa, a mesma do `design-md`): o teste
`UTAC107b/SEG4` calcula a razão no próprio teste (`ratio("#0a0f1a","#f5a623")` → **9,45**) e exige ≥ 4,5.
A constante `ON_GOLD = "#0a0f1a"` fica no ficheiro (`MinhaCarteira.jsx:28`).

---

## §SEG5 — Regra 1 (textos dentro de glass)

| Texto | Antes | Depois |
|---|---|---|
| Aviso 402 «⚠️ Saldo insuficiente.» + «Carregar agora (PIX)» | **FORA** do vidro (solto sob o «Indique e Ganhe» — a violação que o mockup regista) | **DENTRO** do vidro de saldo, num `<div role="status">` (`MinhaCarteira.jsx:272`) |
| «Indique e Ganhe» (`PainelIndicacao`) | já em `GlassCard` (`PainelIndicacao.jsx:149`) | inalterado |
| Login / título / saldo / nota | já dentro do `GlassCard` | inalterado |

**Excepções declaradas** (não se envolvem): botões, modais (Passe/PIX), BottomNav, rodapé legal.
**Removidos por R18-E** (texto técnico): a pílula «R$ OFF-CHAIN» e a frase de apoio do saldo
(«Saldo em reais para Lance Relâmpago…»). O e-mail PIX **fica** (§SEG0).

---

## §SEG6 — Testes + mutação

### Testes actualizados (declarados)

| Ficheiro | Alteração |
|---|---|
| `src/__tests__/utac106c-carteira.test.mjs` | +4 testes: contraste do Passe (WCAG), ordem dos botões, aviso 402 dentro do vidro (Regra 1), e-mail PIX mantido |
| `src/__tests__/utac106c-carteira-render.test.mjs` | o teste «os 4 botões» passou a exigir a **nova** grelha (sem «Trocar R$», com «Ofertas Programadas») + ordem; **+1** teste de clique «Ofertas Programadas» → `/ofertas-programadas` |
| `src/components/__tests__/vocabularioUI.test.mjs` | o guarda do par de modalidades da Carteira passou de `Lance Relâmpago…Lance Programado` (nomes pré-106b) para `Menor Lance Único…Ofertas Programadas` — **preservando a invariante** («a Carteira mostra vocabulário aprovado em CÓDIGO», senão bastava apagar o ecrã) |

### Mutação (GATE 7/8) — 5/5 RED, restaurado byte-idêntico

Mutador próprio (Python, `%TEMP%/utac107b/`; âncoras em **bytes CRLF**, backup **fora do repo**, sha256 antes/depois).

| # | Mutação | Teste alvo | Resultado |
|---|---|---|---|
| M1 | repõe o botão «Trocar R$ 2,00 → 1 Senha» | `utac106c-carteira-render` | **1 RED** |
| M2 | «Ofertas Programadas» passa a navegar para `/mercado` | render (clique) | **1 RED** |
| M3 | cor do Passe volta a `#fff` | `utac106c-carteira` (contraste) | **1 RED** |
| M4 | aviso 402 movido para fora do vidro | `utac106c-carteira` (Regra 1) | **1 RED** |
| M5 | rótulo do Passe removido (ordem) | `utac106c-carteira` (ordem + SEG1) | **3 RED** |

`sha256` do ficheiro **idêntico** ao original após cada restauro (verificado).

---

## §SEG7 — Verificação ponta a ponta

| Verificação | Resultado |
|---|---|
| Suíte canónica (após o fix) | **VERDE** — frontend **779/779** (+5) · backend **1061/1067** |
| `vite build` | **OK** — `✓ built in 5.25s`, exit 0 |
| Verificação ad-hoc (`%TEMP%/hermes-verify-utac107b.mjs`) | **26 PASS / 0 FAIL** |
| Chunk do build | `dist/assets/MinhaCarteira-CBDjVirg.js` contém «Ofertas Programadas» + «Comprar Passe Desafio» e **já não** contém «Trocar R$ 2,00» |

O ad-hoc verifica: «Trocar R$» ausente · `useTrocarPorSenhas`/`CreditoStatus` removidos · os 2 botões e os
2 destinos · a ordem · o contraste (9,45) · a Regra 1 · o e-mail mantido · `netlify/functions`/`_lib`/
`AppContext`/`package*.json` intactos · 0 `.bak-*` tocado · `EM_BREVE_MODE = true` · `CLAUDE.md` com
2×`0x00` + 2×`0x1F` · Dashboard/MLC/OP/AppContext fora do diff.

---

## §SEG8 — Validador adversarial

**Despachado:** subagente Hermes independente (`deleg_1442fdfd`), worktree isolado
`C:/Users/Moltbot/tmp-107b-val/wt` @ `f1dc10f` (4 junctions A13), instruído a **TENTAR REFUTAR**.
Veredicto integral: **`_logs/UTAC107b_SEG8_VALIDADOR.md`**.

> **VEREDICTO: APROVADO · 0 bloqueantes (2 notas ℹ️).** Todas as 9 hipóteses (a)–(i) e as 4 verificações
> extra foram **reproduzidas por medição independente** (sonda de render própria com registo de
> navegação; análise **AST** `acorn`+`acorn-jsx` da ascendência JSX; mutações fora do worktree).
> **Uma alegação do commit foi REFUTADA** — ℹ️ **N1**: eu afirmei que a alteração do guard
> `vocabularioUI` «preserva a invariante»; o validador provou (mutação M3a) que o guarda ficava **VERDE
> com os rótulos visíveis apagados** (bastava o `title=`), logo media um proxy. **Fechado com código**
> no commit `f0da383`. **ℹ️ N2** (aliases mortos) também fechado.

| # | Grav. | Achado | Tratamento |
|---|---|---|---|
| N1 | ℹ️ | guard `vocabularioUI` enfraquecido (satisfeito por `title=`) — **alegação REFUTADA** | **fechado** (`f0da383`): exige os nomes como **rótulo VISÍVEL** (nós `>…<`); M3a volta a dar **RED** |
| N2 | ℹ️ | aliases mortos (`useTrocarPorSenhas`, `CreditoStatus`) no teste de render | **fechado** (`f0da383`) |

**O que ele NÃO mediu (declarado por ele):** a mutação M2 (repor «Trocar R$» no render) — resolução de
módulos na cópia fora da árvore; **o executor cobre-a** com a sua própria mutação M1 (§SEG6, 1 RED).
Não mediu layout/CSS real (sem DOM).
**Erro do MEU instrumento:** o validador **esgotou as iterações antes de gravar** o veredicto (declarou-o
ele próprio); o texto foi transcrito do resumo do harness de delegação, com nota declarada.
**Correcções pós-veredicto (`f0da383`): NÃO re-validadas** (GATE 11).

---

## §SEG9 — Deploy + registo

### Bundle e deploy

| Item | Medido |
|---|---|
| Comando | `npx netlify deploy --prod` (da raiz, onde está o `netlify.toml`) — **foreground** (GATE 10) |
| Build remoto | `Netlify Build Complete` — **3m 56.9s** · 267 ficheiros + 83 funções |
| Deploy URL único | `https://6ac48566fbccab23d9d587dc--silly-stardust-ca71bc.netlify.app` |
| Produção | `https://silly-stardust-ca71bc.netlify.app` → **200** |
| **Entry mudou** | `index-BGDcUbTp.js` → **`index-C85vkUz0.js`** |
| **Chunk da Carteira mudou** | `MinhaCarteira-Dxs6j9bI.js` → **`MinhaCarteira-jQnp-D7l.js`** (30 888 → 27 638 bytes) |

**Prova do deploy = o LITERAL dentro do chunk servido** (a app é code-split; o nome do chunk é o mapa em
`PrivyRoot-*.js`, não o `index`):

| Literal no chunk servido | Antes | Depois |
|---|---|---|
| «Ofertas Programadas» | 0 | **2** ✅ |
| «Menor Lance Único» | 2 | 2 ✅ |
| «Comprar Passe Desafio» | 2 | 2 ✅ |
| **`#0a0f1a`** (texto navy sobre dourado) | **0** | **1** ✅ |
| «Trocar R$ 2,00» (o botão removido) | 3 | **0** ✅ |

`package-lock.json` (frontend) sujo pelo `npm install` do build → **arquivado fora do repo** e
**restaurado** (`git status` tracked = vazio). Suíte re-corrida **depois** do deploy: **VERDE** (779/779 · 1061/1067).
`node_modules` 498/414 (inalterados).

### ⚠️ Resíduo de escopo (escalado ao operador — NÃO corrigido)

`src/components/ComprarFichasModal.jsx:547` — a mensagem de **sucesso do depósito** PIX diz
«💡 Para participar de Lance Programado, use **Trocar R$ por Senhas** na carteira (R$ 2,00 = 1 senha
on-chain).» **Essa instrução ficou obsoleta com a decisão 1** (o botão «Trocar» deixou de existir na
Carteira). **Não corrigido** porque o enunciado autoriza alterar **só a Carteira** (RESSALVA 1) e o
`ComprarFichasModal.jsx` não está na lista de autorizações. **Opções para o operador:**
(a) remover a frase; (b) reescrever para «Para o Lance Programado, o app converte R$ 2,00 em 1 senha
automaticamente» (é o que o `CardLance.jsx:416` faz). ~2 min, exige autorização nova.

### Registo em 3 lugares (R18)

1. `_logs/UTAC107b-carteira.md` (este) + `_logs/UTAC107b_SEG8_VALIDADOR.md` (veredicto).
2. `CLAUDE.md` — bloco **R14** (apêndice no EOF; 2×`0x00` + 2×`0x1F` intactos).
3. `Desktop/RELATORIO-UTAC107b-CARTEIRA.txt`.

### Commits (foreground, ficheiros individuais — nunca `git add -A`)

| SHA | O que fez |
|---|---|
| `3714bbe` | baseline (heredado do UTAC107a-front) |
| `f1dc10f` | código: Carteira (itens 1-7) + testes actualizados (+5) |
| `f0da383` | correcções pós-veredicto: N1 (guarda exige rótulo visível) + N2 (aliases mortos) |
| *(este registo)* | log + bloco R14 + relatório |

### Custo (medido ao fecho)

| Sessão | `source` | msgs | chamadas | custo estimado (`state.db`) |
|---|---|---|---|---|
| `20261005_221738_6265f4` (executor — **sessão partilhada com o UTAC107a-back**) | `cli` | 348 | 189 | fecho 0,1973 − leitura no fecho do 107a-back 0,0709 = **≈ US$ 0,126** |
| `20261006_015603_175b3a` (validador adversarial) | `subagent` | 122 | 69 | **≈ US$ 0,033** |
| **Total estimado do UTAC107b** | | | | **≈ US$ 0,159** |

- **Duração:** arranque **01:43** → fecho **02:28** = **≈ 45 min** (HI5 = 2 h — dentro).
- **Saldo real da API:** arranque **US$ 2,10** → fecho **US$ 1,78** ⇒ **Δ ≈ US$ 0,32** (real, inclui a
  delegação e as chamadas de deploy). As duas leituras vão **separadas** — a de `state.db` é estimativa.
- ⚠️ **Sessão por UTAC NÃO obtida:** a plataforma **reutilizou** a sessão CLI do UTAC107a-back
  (`20261005_221738_6265f4`); o custo do 107b mede-se por **diferença** e é declarado como estimativa.
