# UTAC107b — Veredicto do validador adversarial (SEG8)

> ⚠️ **NOTA DE TRANSCRIÇÃO (declarada).** O validador **esgotou o limite de iterações de ferramentas
> ANTES de gravar** `tmp-107b-val/VEREDICTO-107b.md` — declarou-o ele próprio («Declaro-o em vez de o
> fingir»). O texto abaixo é a **transcrição integral** do resumo final dele
> (`subagent-summary-0-20261006_021319_223228.txt`), obtido do harness de delegação. Não foi
> editorializado: é a prova. O que ele **mediu** está reproduzido; o que **não** mediu, ele declara.
>
> *Lição registada (protocolo §5): instruído a gravar primeiro, o validador gastou o orçamento em
> medição e não gravou. Na próxima ronda: impor a gravação do ficheiro como **1.ª acção**.*

---

Não consegui gravar o ficheiro `VEREDICTO-107b.md` — esgotei o limite de iterações de ferramentas **antes** de o escrever. Declaro-o em vez de o fingir. Abaixo segue o veredicto **integral e completo** (para copiar/salvar), com toda a evidência que medi por execução própria.

---

# VEREDICTO 107b — Carteira no commit f1dc10f

**VEREDICTO: APROVADO · 0 bloqueantes (2 notas ℹ️)**

Todas as 9 alegações (a)–(i) e as 4 verificações extra foram reproduzidas por execução independente (sonda própria + AST + mutações fora do worktree). Uma alegação do commit — «a alteração do guard `vocabularioUI.test.mjs` PRESERVA a invariante» — é **parcialmente REFUTADA**: a invariante fica só a cargo de outro teste; o guard em si ficou mais fraco.

## Reproduzido por execução

**(i) Suíte canónica** — `cd wt && node scripts/mc966-suite-harness.mjs ambos < /dev/null`:
```
frontend: VERDE 779/779 pass
backend: VERDE 1061/1067 pass
VEREDITO: VERDE  (RC=0)
```
NOTA: a minha 1.ª tentativa com `| tee` deu exit 1 (pipe/stdio) — artefacto do meu comando, não do harness. Sem `tee`, VERDE.

**(a) botão «Trocar R$» desapareceu** — `grep -n "Trocar" MinhaCarteira.jsx` → só a linha 199 (COMENTÁRIO). Sonda própria (render real): rótulos dos botões =
`["↻","💰 Depositar PIX","Comprar Passe Desafio R$ 2,00","⚡ Menor Lance Único","🎫 Ofertas Programadas","Cancelar","Confirmar"]` — sem «Trocar». ✅

**(b) os 2 botões novos navegam** — sonda própria (registo de navegação meu, `rr-probe.jsx`):
- clique «Ofertas Programadas» → `["/ofertas-programadas"]` ✅
- clique «Menor Lance Único» → `["/mercado"]` ✅
Rotas existem em `App.jsx:462` (`/mercado`) e `App.jsx:474` (`/ofertas-programadas`).

**(c) ordem real no render** — sonda própria: `iPix < iPasse < iMlc < iOp` ✅ (Depositar PIX → Comprar Passe → MLC → Ofertas Programadas).

**(d) contraste** — sonda própria leu o `style` REAL do elemento: `{"background":"#f5a623","color":"#0a0f1a"}`; WCAG calculado por mim = **9,4524** (esperava 9,45). Não é branco. ✅

**(e) Regra 1 (vidro)** — análise **AST** (`acorn`+`acorn-jsx`, ascensão JSX): 2 GlassCards; **0** nódulos de texto visível fora de qualquer GlassCard; `⚠️ Saldo insuficiente.` (linha 277) → `dentroGlass=true`; `⚠️ Não foi possível ler o saldo R$ agora.` → `true`; nota do e-mail (linha 304) dentro do GlassCard de saldo. ✅

**(f)** `git diff --name-only 3714bbe..f1dc10f` → **só os 4 ficheiros declarados**. `Dashboard.jsx`, `MercadoLances.jsx`, `OfertasProgramadas.jsx`, `AppContext.jsx` **não** estão no diff. ✅

**(g)** nenhum `netlify/functions` nem `_lib` no diff. ✅

**(h)** 5 `.bak-*` presentes, md5 **idêntico** ao repo de referência (DESAFIOGUT):
```
16b8f60…  capacitor.config.ts.bak-20260725182152
0b455e9…  src/App.jsx.bak-20260724145416
245f901…  src/PrivyRoot.jsx.bak-20260724200959
f6b2c71…  src/PrivyRoot.jsx.bak-custom-scheme-20260725182152
feb4e75…  src/PrivyRoot.jsx.bak-oauth
```
✅

**Órfãos pós-remoção** — `grep` de `useTrocarPorSenhas|CreditoStatus|creditoTxHash|trocaInfo|trocaErro|setModalidade` no ficheiro → **só em comentários**. `VALOR_POR_SENHA_BRL` continua usado (linha 305). ✅
`utac106c-carteira.test.mjs` continua a provar «sem I/O inline»: asserções `doesNotMatch(CART, /fetch\(|apiPost|async function comprar/)` e `doesNotMatch(CART, /comprar-passe(?!-pontos)/)` — 16/16 PASS. ✅

**Mutação M1** (fundo dourado + texto `#fff`, cópia em `%TEMP%`-equivalente): `utac106c-carteira.test.mjs` → 15/16, **RED** em `UTAC107b/SEG4 · o botão «Comprar Passe» usa texto NAVY…`. ✅ morde.

**Mutação M3a** (apaguei os RÓTULOS `⚡ Menor Lance Único` e `🎫 Ofertas Programadas`, mantive os `title=`): `vocabularioUI.test.mjs` → **3/3 PASS (o guarda NÃO caiu)**; `utac106c-carteira.test.mjs` → 14/16 RED (SEG1+SEG3).

**Mutação M3b** (apaguei rótulos **e** `title=`): `vocabularioUI` → 2/3 **RED** — `AssertionError: Carteira: falta o par de modalidades EM CÓDIGO (vocabulário aprovado)` (linha 145).

**E-mail PIX factual** — `git grep -n "desafiogut@gmail.com" -- src/` → só `MinhaCarteira.jsx` (+1 teste `mc99-limpeza-ui`). `ComprarFichasModal.jsx` mostra «Valor PIX», «Código PIX (copia e cola)», `provider: {pedido.provider}` — **NÃO** mostra destinatário. Logo a justificação da RESSALVA 5 é factual. ✅

## Tabela de achados

| # | Gravidade | Achado | Tratamento proposto |
|---|---|---|---|
| N1 | ℹ️ nota | O guard `vocabularioUI.test.mjs:141` foi **enfraquecido**: a janela `Menor Lance Único[\s\S]{0,600}Ofertas Programadas` é satisfeita por `title=` (tooltips) que distam ~80 linhas — M3a prova que apagar os RÓTULOS visíveis mantém o guarda VERDE. Deixa de medir «a Carteira mostra vocabulário aprovado» e passa a medir presença de string no ficheiro. | Reduzir a janela (≤120 chars) e/ou ancorar ao texto do RÓTULO (ex.: `>\s*⚡ Menor Lance Único\s*<`) em vez de qualquer ocorrência. A invariante fica coberta por `utac106c SEG1/SEG3` (que mordem), pelo que é não-bloqueante. |
| N2 | ℹ️ nota | `utac106c-carteira-render.test.mjs` mantém aliases para `useTrocarPorSenhas` e `CreditoStatus` já removidos da página (stubs inertes). | Limpar os aliases mortos (higiene; sem efeito funcional — o harness tolera). |

## Alegações REFUTADAS
1. **«A alteração do guard `vocabularioUI.test.mjs:141` PRESERVA a invariante (a Carteira mostra vocabulário aprovado)»** — REFUTADA (enfraquecida). Medido: com rótulos ERGUIDOS como botões apagados do ecrã, o guarda continua verde (M3a). Só cai quando também se removem os `title=` (M3b). Preserva um *proxy*, não a invariante declarada.

## Alegações que NÃO consegui refutar
- (a) remoção do botão «Trocar R$»; (b) destinos `/ofertas-programadas` e `/mercado`; (c) ordem; (d) 9,4524:1 com par `#0a0f1a`/`#f5a623`; (e) Regra 1 (aviso 402 dentro do vidro); (f) nada de outros ecrãs no diff; (g) backend intocado; (h) 5 `.bak-*` intactos; (i) suíte VERDE; ausência de órfãos; «sem I/O inline»; M1 morde; e-mail PIX factual.

## O que NÃO mediste (limites declarados)
- **M2 (mutação de repor «Trocar R$» no render)** não ficou provada: as minhas 2 tentativas com `probe2-mut.test.mjs` falharam por resolução de módulos (`framer-motion`) ao carregar um `.jsx` fora da árvore — esgotei o limite de iterações antes de a resolver. A remoção está provada por render directo (sonda própria) + teste estático, mas **não** provo que a asserção `!rotulos.includes("Trocar R$")` do render test morra com o mutante reposto.
- Não medi layout/CSS real (sem DOM/hit-testing) — topologia e cores foram lidas da árvore de elementos React, como o próprio repo declara.
- Não corri `Search in whole repo` fora de `src/` para o e-mail (só `src/`).

## Ficheiros
- Criados (fora do worktree, nada tocado no repo): `C:\Users\Moltbot\tmp-107b-val\probe\{rr-probe.jsx, carteira-probe.test.mjs, ast-regra1.mjs, probe2-mut.test.mjs}`, `C:\Users\Moltbot\tmp-107b-val\mutfe\` (cópia para mutações), `harness-out.txt`.
- **NÃO criado:** `C:\Users\Moltbot\tmp-107b-val\VEREDICTO-107b.md` — acima está o conteúdo integral para gravar.
- Worktree/f1dc10f: **nenhum ficheiro alterado** (auditoria só-leitura; `git status` vazio no início).

## Decisão
**APROVADO com 0 bloqueantes.** O commit cumpre as 7 decisões do operador e todas as 9 verificações (a)–(i), provado por medição independente (sonda de render própria, AST, mutações fora do worktree). As duas notas são de higiene: N1 (guard mais fraco do que afirma — compensado por teste redundante que morde) deve ser corrigida numa próxima passagem, mas não invalida o fecho.

---

# RESPOSTA DO EXECUTOR AO VEREDICTO

**Veredicto: APROVADO · 0 bloqueantes.** Aceite. As 9 hipóteses (a)–(i) e as 4 verificações extra
foram reproduzidas pelo validador por medição própria (sonda de render própria com registo de navegação,
análise **AST** com `acorn`+`acorn-jsx`, mutações fora do worktree). **Uma alegação do commit foi
REFUTADA** (ℹ️ N1) e **fechada com código** no commit `f0da383`.

| Achado | Tratamento |
|---|---|
| **N1** ℹ️ — «a alteração do guard `vocabularioUI.test.mjs` PRESERVA a invariante» → **REFUTADA**: a janela `Menor Lance Único[\s\S]{0,600}Ofertas Programadas` era satisfeita pelos `title=` (tooltips a ~80 linhas), pelo que apagar os **rótulos visíveis** mantinha o guarda VERDE (mutação M3a do validador). | **FECHADO com código** (`f0da383`): o guarda passa a extrair os **nós de texto JSX** (`>…<`) e a exigir os dois nomes como **rótulo VISÍVEL** — os `title=`/strings de atributo deixam de contar. **Prova nova (minha, pós-correcção):** a MESMA mutação M3a (apagar rótulos, manter `title=`) agora dá **1 RED** no `vocabularioUI` (antes: 3/3 verde). |
| **N2** ℹ️ — aliases mortos (`useTrocarPorSenhas`, `CreditoStatus`) em `utac106c-carteira-render.test.mjs` | **FECHADO** (`f0da383`): os dois aliases foram removidos; a suíte mantém-se VERDE. |
| Limite declarado por ele: **M2** (mutação de repor «Trocar R$» no render) não ficou provada (falhas de resolução de módulos na cópia fora da árvore). | **Coberto pelo executor:** a mutação M1 da minha ronda (§SEG6) repõe o botão no ficheiro real e dá **1 RED** no teste de render — é a mesma asserção (`!rotulos.includes("Trocar R$")`). |
| Limite: não mediu layout/CSS real (sem DOM) | Aceite — o próprio repo declara esse limite; a topologia/cores foram lidas da árvore de elementos React. |

**Erros dos MEUS instrumentos (declarados):**
1. **O guard que eu escrevi media um proxy, não a invariante** — a 1.ª versão (`{0,600}` sobre o ficheiro)
   passava com o vocabulário só em `title=`. REFUTADO pelo validador e corrigido (N1).
2. O verificador ad-hoc tinha `HEAD == origin/main` **pré-push** → **FAIL falso** (o commit era local).
   Corrigido para «`origin/main` é ancestral do HEAD».
3. **Resíduo de escopo (NOVO, escalado ao operador):** `ComprarFichasModal.jsx:547` (mensagem de
   sucesso do depósito) diz «use **Trocar R$ por Senhas** na carteira» — **instrução obsoleta** desde a
   decisão 1 (o botão deixou de existir). **NÃO corrigido** (o enunciado autoriza alterar só a Carteira;
   RESSALVA 1). Vai declarado no §SEG9 e escalado.

**Correcções pós-veredicto (`f0da383`): medidas pelo executor, NÃO re-validadas** (sem 2.ª ronda — GATE 11).
