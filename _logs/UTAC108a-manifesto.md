# UTAC108a — Manifesto de aprovações do operador (série 107)

**Tipo:** documento único (READ-ONLY — zero alterações de código) · **Owner:** Hermes (deepseek-v4-flash)
**Data:** 2026-10-06 · **Baseline:** `86ffe2c` (= `origin/main`) · **Entrega:** `docs/aprovacoes-operador.md`
**HI5:** 2 h.

> **Objectivo:** produzir o manifesto único com (1) o que o operador **aprovou** na série 107,
> (2) o que está **implementado** hoje (verificado no código, `ficheiro:linha`), (3) as
> **discrepâncias** e (4) as **pendências**. Base da auditoria (108b) e das correcções (108c+).
> **Motivo:** os logs registam o que foi **FEITO**, não o que foi **APROVADO** — a aprovação vive
> nas conversas. O operador identificou que nem tudo o que aprovou foi implementado (ex.: o botão
> «Menor Lance Único» da Carteira) e há uma decisão estrutural nova (o lojista sai do app).
>
> **Este UTAC NÃO:** altera código (`src/`, `netlify/`, `scripts/`), corrige discrepâncias, remove o
> lojista, faz deploy, edita `.bak-*`, toca nos bytes de controlo do `CLAUDE.md`, altera
> `package*.json`/`package-lock`, nem desliga o `EM_BREVE_MODE`.

---

## §Baseline (SEG-1)

| Item | Medido | Comando |
|---|---|---|
| `HEAD` / `origin/main` | `86ffe2c` / `86ffe2c` (iguais) — **confere com o enunciado** | `git log --oneline -1` |
| Suíte canónica (HI1) | **frontend VERDE 849/849 · backend VERDE 1095/1101** → `VEREDITO: VERDE` | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| Sujidade (tracked) | **0** | `git diff --name-only` → vazio |
| `.bak-*` versionados | **5** | `git ls-files \| grep '.bak-'` |
| `CLAUDE.md` — bytes de controlo | 2×`0x00` · 2×`0x1F` · 2×`0x7F` (412 563 B) | `python` (bytes) |
| `EM_BREVE_MODE` | `true` (`src/lib/leilaoLock.js:10`) | `grep` |
| `_logs/DEBT.md` lido | 101 linhas; **DEBT-021** presente (FECHADA SEM RESIDUO) | `read_file` |
| Logs da série 107 | **12** logs + 11 `_SEG*_VALIDADOR.md` | `ls _logs/UTAC107*` |
| Mockups | `docs/mockups-107a/` — 5 HTML do INPUT + `tokens.css`/`DESIGN.md` | `ls` |

> ⚠️ **Medição, não suposição (A4/lição da série):** o `mc966-suite-harness.mjs` **não corre em
> background** — devolve `stdin is not a tty` com **exit 0 e sem números** (falso-verde). Corrido em
> **foreground**; foi preciso repetir a medição (a 1.ª tentativa, em background, «passou» sem medir).

**Veredito SEG-1: SEGUIR** — o `HEAD` confere com o enunciado e a suíte está verde.

---

## §SEG0 — Leitura dos logs da série 107

Lidos, por ordem: `UTAC107a-back-mapeamento.md` (572 l.) · `UTAC107a-front-mockups.md` (202) ·
`UTAC107b-carteira.md` (241) · `UTAC107c-inicio.md` (151) · `UTAC107d-mlc.md` (135) ·
`UTAC107e-op.md` (125) · `UTAC107e.2_SEG-1_MEDICAO.md` (57) · `UTAC107e.2-privacidade.md` (117) ·
`UTAC107g-navegacao.md` (329) · `UTAC107g.1-pendencias.md` (127) · `UTAC107g.2-copy.md` (100) ·
`UTAC107g.3-rc1.md` (143) · `UTAC107g.4-porta-rc1.md` (219) = **13 logs**. Também lidos: os 11
veredictos `_SEG*_VALIDADOR.md`, o bloco **R14** do `CLAUDE.md` (`:4635-4950`) e o `_logs/DEBT.md`.

> ⚠️ **Correcção do meu próprio instrumento (achado do validador adversarial, §SEG5):** a 1.ª versão
> dizia **12** logs e omitia o `UTAC107e.2_SEG-1_MEDICAO.md` (que o próprio manifesto cita). Existiam
> **13** `.md` não-validador. Corrigido e o ficheiro em falta **lido**.

**Extraído de cada log:** o que foi implementado, as referências `ficheiro:linha`, as pendências
declaradas, os veredictos do validador e os **erros dos próprios instrumentos** (ex.: o guard
`vocabularioUI` do 107b media um proxy — REFUTADO pelo validador e fechado em `f0da383`; a contagem
de consumidores por substring do 107a-back — B1/B2/B3; o `/*` dentro de `//` em `main.jsx` que
escondia 98 linhas da guarda pt-BR do 107g.2 — G-cega).

**Itens da lista INPUT não registados em nenhum log: NENHUM.** Os 51 itens aparecem todos, ao menos
implicitamente, num log da série. Cada um foi depois **verificado no código** (§SEG2), não aceite
pelo log.

---

## §SEG1 — Leitura dos mockups

| Mockup | O que mostra |
|---|---|
| `index.html` | Índice das pranchas + as **8 decisões R18** do operador (A-H) tomadas durante o 107a-front |
| `carteira.html` | Antes (1 cartão), Depois com 3 variantes; **A · Fiel ao actual ★** (R18-D): ordem PIX→Passe→MLC→OP, aviso 402 dentro do vidro, nota do e-mail PIX (com aviso para o 107b) |
| `inicio.html` | Antes + 3 variantes; **A** (R18-F): 4 tiles (Saldo, Passe Desafio 12/50, Lances Únicos, Total de Lances), 7 atalhos no «Acesso Rápido», «Outras Edições» com rolagem lateral |
| `menor-lance-unico.html` | 3 vidros; rótulo do campo **só para leitor de ecrã** (`Valor do lance em reais`), placeholder «R$ 0,01»; tabela 3 colunas com 🔒 |
| `ofertas-programadas.html` | Título em vidro, pontos 12/50 + histórico em `<details>`, cartão Quildo, carrossel com o palpite dentro (5 estados) e tabela «**Lances** — Edição PROG-1» |

**Divergências mockup ↔ lista INPUT (todas resolvidas por R18 — registadas, não escondidas):**

| Ponto | Mockup | Lista INPUT | Decisão |
|---|---|---|---|
| Frase do MLC | «Ganha o menor lance que ninguém repetir.» | igual | igual ✔ |
| Título da tabela da OP | «**Lances** — Edição PROG-1» | «**Palpites** — Edição <id>» | **Palpites** (R18-C) |
| KPIs do Início | variante A **mantém** os 2 KPIs de lances | enunciado mandava **remover** | **Manter** (R18-A/F) |
| Rótulo do campo do lance | só para leitor de ecrã (`sr-only`), «R$» | rótulo **visível** «Seu lance (em centavos)» | **Visível** (R18-C, pt-BR, centavos) |
| Barra de progresso do Passe | só nas variantes B/C | o enunciado (decisão 7) pedia barra | **Sem barra** (R18-B) |

**Veredito SEG1: SEGUIR** — as divergências são conhecidas e estão decididas; nenhuma ficou ambígua.

---

## §SEG2 — Estado no código (verificação item a item)

Verificados **51 itens** da lista INPUT + a decisão estrutural. Resultado por UTAC:

| UTAC | ✅ | ⚠️ | ❌ |
|---|---|---|---|
| 107b Carteira | 6 | 1 (`#2`) | 0 |
| 107c Início | 6 | 0 | 0 |
| 107d MLC | 6 | 0 | 0 |
| 107e.1 OP + V2 | 6 | 0 | 0 |
| 107e.2 Privacidade + Etiqueta | 7 | 0 | 0 |
| 107g Navegação | 7 | 0 | 0 |
| 107g.1 Pendências pequenas | 3 | 0 | 0 |
| 107g.2 Copy pt-BR | 3 | 0 | 0 |
| 107g.3 Segurança `rc=1` | 2 | 1 (`#2`) | 0 |
| 107g.4 Fechar porta `rc=1` | 3 | 0 | 0 |
| Decisão estrutural (lojista) | 0 | 0 | **1** |

**Destaques das medições (as que mais divergem do que se esperaria):**

1. **107b#2 — a queixa do operador tem causa medida.** `MinhaCarteira.jsx:242-259` tem o botão
   «⚡ Menor Lance Único» com `onClick={irParaMenorLanceUnico}` (→ `navigate("/mercado")`), **mas**
   `disabled={!saldoReais}` (`:245`) e `title={!saldoReais ? "Deposite PIX primeiro" : …}` (`:256`).
   Com saldo **R$ 0,00** ou `null` (a carregar) o clique **não faz nada**. É um **gate pré-existente**
   (UTAC106c/MC48), já notado pelo 107a-back §B.6(c) — **não** fazia parte das aprovações do 107b.
   ⇒ **D-1** no manifesto.
2. **107g.3#2 — superado por decisão posterior.** `?rc=1` exacto continuava a abrir (aprovado como
   **temporário** no 107g.3); hoje `temAcessoDiretoCadastro()` devolve **`false` sempre**. ⇒ **D-2**.
3. **107c#1 — o tile do Início mudou de fonte de dados:** era `saldoSenhas` (Via A, on-chain), passou
   a `pontosCartao` (Via B, `GET /ler-pontos`) via `usePontos`, com destino `/ofertas-programadas`.
   Confirma a decisão 2 e o R18-B.
4. **107d#5 — a tabela foi mesmo para o fim:** `MercadoLances.jsx:333-342` (comentário R18-D) e o
   `<main>` com `gridTemplateColumns: "1fr"`, com a secção `data-testid="tabela-fim"` em `:366`.
5. **107e.1#5 / V2 — o troféu 🏆 deixou de ser local:** `AppContext.jsx:707-717` mostra que a
   derivação `vencedorLocal` **saiu**; `TabelaLances.jsx:60` e `MeusAtivos.jsx:119-127` só assinalam
   com resultado **oficial**.
6. **107e.2 — a etiqueta existe e está só em 2 ecrãs:** `grep -rn 'EtiquetaMeuLance' src/pages/`
   devolve **exactamente** `Dashboard.jsx:451` e `MercadoLances.jsx:363` ⇒ a OP está sem etiqueta,
   como o R18-D mandou.
7. **107g#1 — o «Acesso Rápido» tem 4 entradas** (`Dashboard.jsx:59-66`). ⚠️ O array tem um
   comentário (`:62-63`) sobre uma remoção **anterior** do atalho «Segurança» (MC39.3.1) — não
   confundir com os 3 atalhos removidos pelo 107g.
8. **107g#5/#6 — rotas mortas removidas e o ficheiro apagado:** `ls src/pages/EdicaoDetalhe.jsx` →
   **não existe**; `grep '"/corp"' src/App.jsx` → **0**; o catch-all está em `App.jsx:530`.

**Veredito SEG2: SEGUIR.**

---

## §SEG3 — Manifesto

Criado **`docs/aprovacoes-operador.md`** (≈ 33 kB): cabeçalho, baseline, sumário, 10 secções por UTAC
(cada item com **aprovado + fonte + estado + `ficheiro:linha` + discrepância**), decisão estrutural,
pendências, **extras** (feito sem estar na lista) e resumo executivo.

**Contagens:** 52 itens (51 da série + 1 estrutural) → **49 ✅ · 2 ⚠️ · 1 ❌**.

**Honestidade aplicada:** nenhum item marcado «implementado» sem `ficheiro:linha`; as 2 observações e
a decisão em falta ficam **à vista** (§16 D-1..D-4), com a natureza de cada uma declarada.

---

## §SEG4 — Verificação ponta a ponta

| Verificação | Resultado |
|---|---|
| Suíte canónica (read-only, confirmada) | **frontend 849/849 · backend 1095/1101 VERDE** (inalterada) |
| `git diff --name-only` | **vazio** ⇒ nenhum ficheiro de código alterado |
| Itens do INPUT presentes no manifesto | **52/52** (verificação programática por token-chave de cada item) |
| Pendências declaradas presentes | **5/5** |
| Discrepâncias presentes | **D-1 … D-5** (com a natureza de cada uma declarada) |
| Referências `ficheiro:linha` no manifesto | 48 referências `.jsx:N` + 6 `.mjs:N` (+ linhas do `App.jsx`, `DEBT.md`, `GlassHeader.jsx`) |
| `.bak-*` | 5, intactos (fora do diff) |
| `EM_BREVE_MODE` | `true` |
| Bytes de controlo do `CLAUDE.md` | 2×`0x00` + 2×`0x1F` + 2×`0x7F` (inalterados antes/depois) |

**Ficheiros que este UTAC criou/alterou:** `docs/aprovacoes-operador.md` (novo) · `_logs/UTAC108a-manifesto.md` (novo) · `CLAUDE.md` (bloco R14 apenas) · `Desktop/RELATORIO-UTAC108a-MANIFESTO.txt` (novo).

**Veredito SEG4: SEGUIR.**

---

## §SEG5 — Validador adversarial

**Despachado:** subagente Hermes independente (`deleg_6820c58b`), worktree isolado
`C:/Users/Moltbot/tmp-108a-val/wt` @ `e2e793a` (helper A13; 4 junctions), instruído a **TENTAR
REFUTAR** (não confirmar), com a **lista INPUT completa** no contexto (o subagente não tem acesso às
conversas). Duração 225,9 s.

### VEREDICTO: **PARCIAL**

> **Conteúdo (os 51 itens + 1 decisão): resistiu à refutação — 51/51 verificados no código.**
> **Auto-descrição (§18.5, entregáveis): REFUTADA — 3 dos 4 artefactos declarados NÃO existem.**
> Anexos: 2 imprecisões de contagem/linha e 1 prova inválida (grep de emoji).

| # | Grav. | Achado do validador | Tratamento |
|---|---|---|---|
| V1 | ⛔ | **§18.5 declarava 4 entregáveis que ainda não existiam** (só `docs/aprovacoes-operador.md` estava no commit `e2e793a`) — o manifesto afirmava ter escrito o log, o bloco R14 e o relatório do Desktop | **corrigido** no manifesto (§18.5 passa a declarar que os outros 3 são produzidos no **fecho do UTAC**) **e os 3 artefactos foram mesmo criados** neste fecho (`_logs/UTAC108a-manifesto.md`, bloco R14 do `CLAUDE.md`, `Desktop/RELATORIO-UTAC108a-MANIFESTO.txt`) |
| V2 | ⚠️ | **Prova inválida por emoji:** a remoção do card 🏆 do Início era provada com `grep '🏆' Dashboard.jsx` → 0. **O grep de emoji falha em silêncio** (controlo: `grep -c '🏆' GlassHeader.jsx` → 0, mas o ficheiro contém 🏆; `python` conta 1) | **corrigido** (107c#4): a prova passa a ser o array `stats` (`Dashboard.jsx:226-231`, **4 tiles**, sem card de troféu) + contagem por `python`. **Erro do MEU instrumento declarado** no manifesto (§18.6) |
| V3 | ℹ️ | **Contagem de logs:** existem **13** `.md` não-validador (o manifesto dizia 12 e omitia o `UTAC107e.2_SEG-1_MEDICAO.md`) | **corrigido** (§0 do manifesto e §SEG0) + o ficheiro foi lido |
| V4 | ℹ️ | Linhas imprecisas: `/redirect` em `App.jsx:460` (citado `:455`); o laranja da etiqueta em `EtiquetaEstadoLance.jsx:21` (citado `:19-20`) | **corrigidos** ambos |
| V5 | ℹ️ | `e2e793a` não está em nenhum ramo remoto — o manifesto estava por publicar | **declarado** no manifesto (§18.7); resolvido no fecho (push, §SEG6) |
| V6 | ℹ️ | **Achado lateral:** comentário obsoleto em `TabelaLances.jsx:52-58` («Sem resultado oficial mantém-se o apuramento local») contradito pelo código (`:70-73 return -1`) | **registado** como **discrepância D-5** no manifesto (§16) e pendência de limpeza |

**Alegações que RESISTIRAM** (o validador tentou derrubar e não conseguiu): todos os 51 estados
✅/⚠️ e o ❌ estrutural; a **D-1** (`disabled={!saldoReais}`) e a **D-2** (`rc=1` superado) bem
diagnosticadas; a honestidade do §0 sobre os bytes do `CLAUDE.md` conferiu à unidade (**412 563
bytes, 2×`0x00`, 2×`0x1F`, 2×`0x7F`**); (f) nenhum código alterado (`git show --name-only HEAD` → só
o manifesto); (g) `.bak-*` = **5**, nenhum tocado; (h) suíte **849/849 + 1095/1101 VERDE** (medida por
ele, em foreground).

**Lacunas de prova que ELE declarou não ter fechado:** não leu os logs `_logs/UTAC107*` linha a linha
(usou-os por amostragem contra o R14); não mapeou *onde* residem os bytes de controlo do `CLAUDE.md`.

**Correcções pós-veredicto: NÃO re-validadas** por uma 2.ª ronda (declarado — GATE 11; as correcções
são de evidência/contagem e de redacção, e o conteúdo dos 51 itens não foi tocado).

### O que isto diz ao operador (declarado, não escondido)

O **conteúdo** do manifesto (o que interessa à auditoria 108b) **passou** a refutação: 51/51 itens
verificados por medição independente. O que caiu foi a **auto-descrição** (declarar artefactos antes
de os produzir), **uma prova minha inválida** (grep de emoji) e **duas contagens/linhas**. É o mesmo
padrão da série: os instrumentos do executor mentem por defeito (aqui, o `grep` de emoji), e o
veredicto é o que os apanha.

---

## §SEG6 — Registo + custo

### Registo em 3 lugares (R18/P4)

1. `_logs/UTAC108a-manifesto.md` (este) + `docs/aprovacoes-operador.md` (o entregável).
2. `CLAUDE.md` — bloco **R14** (apêndice no EOF; 2×`0x00` + 2×`0x1F` + 2×`0x7F` intactos).
3. `Desktop/RELATORIO-UTAC108a-MANIFESTO.txt`.

### Commits (foreground, ficheiros individuais — NUNCA `git add -A`)

| SHA | O que fez |
|---|---|
| `86ffe2c` | baseline (heredado do UTAC107g.4) |
| `e2e793a` | o manifesto (`docs/aprovacoes-operador.md`) — validado pelo validador adversarial |
| *(este registo)* | manifesto corrigido (achados V1..V6) + log + bloco R14 + relatório do Desktop |

### Escopo / verificação final

- **Zero alterações de código:** `git diff --name-only` vazio; `src/`, `netlify/`, `scripts/`,
  `_lib/`, `package*.json` intactos; `EM_BREVE_MODE = true`.
- **`.bak-*`:** 5, md5 = baseline (nenhum tocado).
- **Suíte canónica no fecho:** frontend **849/849** · backend **1095/1101** — **VERDE**.
- **Worktree do validador** (`tmp-108a-val/wt`) **removido pela ordem A13** — o helper
  `scripts/worktree-helper.mjs remover` fez `rmdir` das 4 junctions primeiro, depois
  `git worktree remove` → exit 0. **`node_modules` intactos: 498 (frontend) · 414 (functions)**.

### Custo (medido ao fecho, 2026-10-06 — Hermes usa USD)

Fonte: `state.db` → tabela `sessions` (sessão do executor + sessão do validador). `cost_status` = `estimated`.

| Sessão | `source` | msgs | chamadas | in | out | cache read | custo estimado |
|---|---|---|---|---|---|---|---|
| `20261007_000624_7dfe52` (executor) | `cli` | 168 | 63 | 236 812 | 63 177 | 12 706 944 | **≈ US$ 0,0864** |
| `20261007_001355_9f38fd` (validador adversarial) | `subagent` | 43 | 16 | 65 971 | 20 687 | 915 712 | **≈ US$ 0,0176** |
| **TOTAL do UTAC108a** | | | | | | | **≈ US$ 0,104 = ≈ 10,4 centavos** |

- É uma **estimativa** (`estimated_cost_usd`; `actual_cost_usd` = `None`) e **cresce** enquanto a sessão
  corre — os turnos de fecho (relatório, commit, push) ainda somam. Valor lido **até este momento**.
- ⚠️ **SALDO DA API: NÃO LIDO neste UTAC (declarado).** Não existe comando de saldo no Hermes
  (`hermes insights` só dá agregados de 30 dias, sem custo por sessão; `hermes status` mostra as chaves
  **mascaradas**, mas não o saldo) e a chave `DEEPSEEK_API_KEY` **não está no ambiente** do shell.
  Lê-la do `.env`/config para chamar `GET /user/balance` **violaria a R5** («o agente nunca toca em
  credenciais; o `.env` não é lido nem escrito») ⇒ **não o fiz**. Para o operador obter o número:
  abrir o painel da DeepSeek, ou correr ele próprio
  `curl -s -H "Authorization: Bearer $DEEPSEEK_API_KEY" https://api.deepseek.com/user/balance`.
  (Os UTACs anteriores reportaram o saldo; se o operador quiser que este UTAC também o faça, é preciso
  autorização explícita para ler a credencial.)
- **Duração:** dentro do HI5 de 2 h.

**Veredito final: FECHADO** — manifesto produzido, verificado no código, validado adversarialmente
(PARCIAL → achados V1..V6 tratados) e publicado.
