# UTAC107c — Início: Passe Desafio + destino + pendência 107b

**Tipo:** produto (frontend) · **Skill:** `utac` (`desafio-gut/frontend/skills/utac/`) · **Data:** 2026-10-06 ·
**Modelo:** claude-opus-5-5 (Claude Code) · **Baseline:** `b4eb151` (= `origin/main`) · **Frentes:** 2.

> **Estado: PARADO no SEG0** — o mockup aprovado diverge das decisões do enunciado (SEG0 passo 4).
> Nada foi alterado no código.

---

## §Baseline (SEG-1)

| Item | Medido | Comando |
|---|---|---|
| Arranque | 2026-10-06 03:42 | `date` |
| `HEAD` / `origin/main` | `b4eb15133ca9a3628d344fee365b022d76b9574f` (iguais) | `git fetch; git rev-parse HEAD origin/main` |
| Sujeira (tracked) | **0** | `git status --porcelain \| grep -v '^??'` |
| Disco | 11 GB livres (> 5 GB) | `df -h /c` |
| Suíte (HI1) | **frontend VERDE 779/779 · backend VERDE 1061/1067** → `VEREDITO: VERDE` | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| Deploy vivo | `https://silly-stardust-ca71bc.netlify.app/` → **200**, entry `index-CTHlkxI4.js` | `curl` |
| Último deploy | build git de `b4eb151` (o 107b registou `index-C85vkUz0.js` no deploy CLI de `f0da383`; o deploy por git de `b4eb151` gerou novos hashes). Conteúdo confere: chunk `MinhaCarteira-BJNJ9MhB.js` tem «Ofertas Programadas» ×2, `#0a0f1a` ×1, «Trocar R$ 2,00» ×0 | `netlify api listSiteDeploys` + `curl` |
| `.bak-*` versionados | 5 (capacitor.config.ts, App.jsx, PrivyRoot.jsx ×3) | `git ls-files \| grep .bak-` |

### Medições do código (HEAD `b4eb151`)

| Ponto | Medido |
|---|---|
| Card «Senhas» | `src/pages/Dashboard.jsx:174` — `saldoSenhas` (Via A), cor `#a78bfa`, ícone 🔗, `to: "/carteira"` |
| KPIs de lances | `Dashboard.jsx:179` «Lances Únicos» → `/mercado` · `:180` «Total de Lances» → `/ativos` |
| Card 🏆 | `Dashboard.jsx:420-448` (`GlassCard` com `<h3>🏆 Menor Lance Único</h3>`) |
| «🗓️ Outras Edições» | `Dashboard.jsx:458` — título |
| `usePontos` | `src/hooks/usePontos.js` — devolve `pontosCartao`, `pontosParaCartao` (50), `loading`, `erro`; `GET /ler-pontos` com `authToken`. **O Dashboard não o importa hoje.** |
| Pendência 107b | `src/components/ComprarFichasModal.jsx:547` — «💡 Para participar de Lance Programado, use **Trocar R$ por Senhas** na carteira (R$ 2,00 = 1 senha on-chain).» (confirmado na linha exacta). Há um **2.º resíduo** em comentário JSX, `:490` («Senhas só vêm depois via "Trocar R$ por Senhas" na carteira.») — fora da autorização («só a linha 547»), não é texto visível. |
| Coerência | `src/components/CardLance.jsx:416` — «sem senha, o app converte R$ 2,00 do saldo automaticamente» ✓ (a frase nova é coerente) |

---

## §SEG0 — Mockup `docs/mockups-107a/inicio.html`

O mockup tem 3 variantes. A **aprovada pelo operador** é a **A · Fiel ao actual ★** — registada como
**R18-F** em `_logs/UTAC107a-front-mockups.md:71-74` e no próprio mockup (`data-desc` e anotação 2).

| Elemento | Variante A (aprovada, R18-F) | Enunciado UTAC107c | Confere? |
|---|---|---|---|
| Card «Senhas» → «🎟️ Passe Desafio» `12 / 50` | sim (tile) | sim | ✅ |
| Número = `pontosCartao` (`/ler-pontos`) | sim (R18-B) | sim | ✅ |
| Destino `/ofertas-programadas` | sim | sim | ✅ |
| **Barra de progresso** | **não** — tile com só «12 / 50» (a barra é das variantes **B** e **C**) | sim (decisão 7) | ❌ |
| **KPIs «Lances Únicos» + «Total de Lances»** | **FICAM** — «os 4 botões que tínhamos»; «os 2 KPIs de lances **voltam**, o que substitui a parte da R18-A sobre eles» | **REMOVER** (decisão 3) | ❌ |
| Card «🏆 Menor Lance Único» | removido | removido | ✅ |
| Regra 1 (título «Outras Edições» dentro de vidro) | sim — e **divide** em «⚡ Relâmpago» / «🎫 Programadas» | só «Regra 1» (não pede a divisão) | ⚠️ |
| Botão da Edição Ativa | «⚡ Ir para o Menor Lance Único» | não mencionado | ⚠️ |

A combinação pedida pelo enunciado (Passe com barra + sem os 2 KPIs) corresponde à **variante B**
(«o Passe ganha peso de cartão, com barra de progresso, e saem os 2 tiles de lances»), que o operador
**preteriu** em favor da A (R18-F).

### ⚠️ Conflitos entre o enunciado e o medido (R20/AU3 — não resolvidos pelo executor)
1. **KPIs de lances:** o enunciado (decisão 3) remove-os; a variante aprovada (R18-F) mantém-nos. Qual vale?
2. **Barra de progresso:** o enunciado (decisão 7) pede-a; a variante A não a tem. Com a barra, o tile
   fica com 4 linhas (ícone, número, barra, rótulo) — se os 2 KPIs saírem, a grelha 2×2 fica com 2 tiles
   (Saldo + Passe).
3. **Divisão «Outras Edições» em Relâmpago/Programadas e rótulo do botão da Edição Ativa** (variante A):
   entram neste UTAC ou ficam fora (o enunciado não os pede)?
4. **Comentário `ComprarFichasModal.jsx:490`** com a mesma instrução obsoleta: actualizar também (é
   comentário, não visível) ou deixar (autorização = só a linha 547)?

**Veredito SEG0: PARAR** (passo 4 do enunciado) — aguarda resposta do operador antes do SEG1.

### Respostas do operador (R18, 2026-10-06 — registadas em 3 lugares: aqui, R14 do `CLAUDE.md`, relatório)
- **R18-A (conflito 1):** **manter** os KPIs «Lances Únicos» e «Total de Lances» (vale a variante A / R18-F;
  a decisão 3 do enunciado fica **revogada**).
- **R18-B (conflito 2):** **sem barra** — o tile mostra só «12 / 50» (a decisão 7 fica **revogada**).
- **R18-C (conflito 3):** a divisão Relâmpago/Programadas e o rótulo do botão da Edição Ativa ficam **fora**
  do escopo; a Regra 1 aplica-se pondo o título «Outras Edições» dentro de vidro.
- **R18-D (conflito 4):** actualizar **também** o comentário `ComprarFichasModal.jsx:490` (autorização alargada a 1 linha).
- Mantêm-se: card «Senhas» → «Passe Desafio» com `pontosCartao`; destino `/ofertas-programadas`; remover o card 🏆;
  loading = skeleton; erro = ocultar número; frase nova na linha 547.

**Veredito: AJUSTAR → respondido → SEGUIR.**

---

## §Estado ao corte (limite de uso atingido, 2026-10-06)

- **SEG1–SEG4 FEITOS** — commit local **`fc06e0a`** (NÃO publicado): tile «Passe Desafio» `pontosCartao` «X / 50» → `/ofertas-programadas`
  (sem conta «—» · a carregar/token por cunhar = skeleton · erro «—» · vazio «0 / 50 · comece já»); KPIs mantidos (R18-A); card 🏆 removido;
  «Outras Edições» dentro de GlassCard; `ComprarFichasModal.jsx` l.547 + l.490 com a frase nova.
- **SEG3 contraste:** gold 9,07:1 · muted 4,60:1 · texto 16,05:1 sobre o vidro (≥ 4,5).
- **SEG5:** suíte **778/778 · 1061/1067 VERDE** (−5 testes do card 🏆/UTAC000.12 removidos, +4 depósito; UTAC000.9 passou do card para o overlay);
  `vite build` OK; **mutação 7/7 RED**, restauro sha256 idêntico; ESLint = 5 warnings pré-existentes (iguais ao HEAD).
- **SEG6 ad-hoc:** escopo OK (controlo positivo apanha ficheiro fora da lista — 1.ª versão do controlo era defeituosa, `sed` não removia nada; corrigido),
  backend/`.bak-*`/App.jsx/AppContext/package*/Carteira/MLC/OP intactos, `EM_BREVE_MODE = true`, CLAUDE.md 2×0x00 + 2×0x1F.
- **SEG7 validador:** worktree `C:/Users/Moltbot/tmp-107c-val/wt` @ `fc06e0a` criado (4 junctions); subagente **interrompido sem veredicto** pelo limite de uso.
  ⛔ **GATE 9: sem veredicto, o UTAC NÃO fecha.** Remover o worktree com `node scripts/worktree-helper.mjs remover C:/Users/Moltbot/tmp-107c-val/wt` (nunca `rm -rf`).
- **SEG8 por fazer:** deploy, restaurar `package-lock`, registos R14 + Desktop, push. Produção «antes»: entry `index-CTHlkxI4.js`, chunk `Dashboard-BVy1kCx7.js`.

> ⚠️ A secção «Estado ao corte» acima foi escrita quando o limite de uso interrompeu o UTAC; fica à vista (GATE 15).
> Foi **superada** pelas secções seguintes (retoma na mesma sessão).

---

## §SEG7 — Validador adversarial (retoma)

Re-despachado no mesmo worktree limpo (`fc06e0a`). **Veredicto: APROVADO COM RESSALVAS** — (a)–(l) todas resistiram;
8 mutações próprias do validador mordem; contraste 9,09:1 / 4,61:1. Verbatim + tratamento: **`_logs/UTAC107c_SEG7_VALIDADOR.md`**.

- ⚠️ **V1 (corrigido, `5ce939b`)** — «0 / 50» prematuro durante 1 commit na transição de sessão (login; refresh com token em cache
  e `address` a chegar depois): o `usePontos` devolve VAZIO com `loading:false` até o efeito re-correr. O meu stub fixava `loading`
  e não via a transição (**erro do meu instrumento**). Correcção **só no `Dashboard.jsx`** (o hook é partilhado com Ofertas
  Programadas, fora do escopo): `estadoPasse(memo, …)` pura e exportada — depois de par incompleto ou de outro par, só aceita
  números quando o hook mostrar `loading:true` para o par actual. Também cobre a troca de conta (V2).
- ℹ️ V3 comentário do stub corrigido · V4 `pontosCartao` não inteiro ⇒ «—» (nunca «NaN / 50») · V5 dois tiles dourados = mockup A.
- **Correcções NÃO re-validadas** por 2.ª ronda (declarado). Worktree removido pela ordem A13 (`node_modules` 498 · 414 intactos).

## §SEG5 (final) — Testes + mutação

| Ficheiro | Alteração (declarada) |
|---|---|
| `src/pages/__tests__/Dashboard.test.mjs` | UTAC000.9: provas do vencedor passaram do card para o **overlay** (contagem 0 no Início / 1 no overlay); especial: «Menor Lance Único» → «Passe Desafio»/«Acesso Rápido»; bloco **UTAC000.12** (16 testes do valor do card 🏆) **substituído** por 11 testes UTAC107c + 5 de sequência (`estadoPasse`) |
| `src/pages/__tests__/_stubs/usePontos.js` | **novo** — duplo do hook, mesma forma do real |
| `src/__tests__/utac107c-deposito.test.mjs` | **novo** — 4 testes (frase nova como texto, antiga ausente incl. comentários, coerência com `CardLance`, controlo do stripper) |

Suíte final: **frontend 783/783 · backend 1061/1067 VERDE** (era 779: −16 do bloco UTAC000.12, +11 UTAC107c, +5 sequência, +4 depósito = 783). `vite build` OK. ESLint: 5 warnings **pré-existentes** (iguais ao HEAD).
**Mutação 10/10 RED** (M1 destino · M2 total · M3 depósito · M4 sem-skeleton · M5 erro · M6 Regra 1 · M7 «Senhas» · M8 troca de conta ·
M9 pendente · M10 NaN), restauro sha256 idêntico. ⚠️ Erro meu no mutador: uma `str.replace` sem assert não casou (M5) e os escapes
`\r\n` expandiram ao editar o script — apanhado pelo `SyntaxError`/conferência e corrigido antes de ler resultados.

## §SEG8 — Deploy + registo

| Item | Medido |
|---|---|
| Comando | `npx netlify deploy --prod` (raiz) — **foreground**, 04:31:30 → 04:35:54 |
| Produção | home **200** · `/.netlify/functions/health` **200** |
| Entry | `index-CTHlkxI4.js` → **`index-CTjgmNWO.js`** |
| Início | o Dashboard passou a viver no chunk `PrivyRoot-DiNpEIuB.js` (era `PrivyRoot-DH3F5yla.js` + `Dashboard-BVy1kCx7.js`), `content-type: application/javascript` |
| Literais servidos | `passe-skeleton` 1 · «Passe Desafio» 2 · `/ofertas-programadas` 4 · «comece já» 1 · «Lances Únicos» 1 · «Total de Lances» 1 · «Liderando» (só do card 🏆) **0** · «Vencedor final» **0** |
| Depósito | «converte R$ 2,00 em 1 senha automaticamente» **1** · «Trocar R$ por Senhas» **0** (todos os chunks servidos) |

⚠️ **Instrumento:** um pedido a um chunk que NÃO existe devolve **200 (rewrite do SPA)** — o 1.º «chunk local = servido» era isso;
medido de novo pelo nome que o `index` referencia e pelo `content-type` (lição MC93-F). Não localizei o literal antigo do card no
bundle «antes» (strings do `Dashboard-BVy1kCx7.js` não casaram por texto) — a prova da remoção é a ausência no chunk novo.

`package-lock.json` sujo pelo build → **arquivado** no scratchpad e **restaurado**; suíte re-corrida **depois** do deploy: **VERDE 783/783 · 1061/1067**.

**Commits** (foreground, ficheiros individuais): `fc06e0a` (código) → `5ce939b` (correcção pós-veredicto) → registo.

**Custo:** USD **não medido** (Claude Code sem `state.db`); validador ≈ **105 630 tokens** (2.ª tentativa; a 1.ª foi interrompida).
**Duração:** 03:42 → ~04:45 ≈ **1 h** (pausa do limite de uso incluída) — dentro do HI5 de 2 h.

**Veredito final: FECHADO** (com correcções pós-veredicto não re-validadas).
