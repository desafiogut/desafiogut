# UTAC108c.1 — Esconder o aviso «Sem saldo» no modo Programado (N3)

**Tipo:** produto (frontend) · **Executor:** Opus 5.5 (Claude Code) · **Data:** 2026-10-08 (00:20 →)
**Origem:** achado **N3** do validador adversarial do UTAC108c (`_logs/UTAC108c_SEG5_VALIDADOR.md`): no modo «Programado»
o lance usa **senhas on-chain**, não R$; quem tinha R$ 0,00 e senhas > 0 lia «Sem saldo» e mesmo assim conseguia licitar.
**Decisão do operador:** esconder o aviso no modo Programado; Relâmpago, R18-A e R18-B mantêm-se.

---

## Baseline (SEG-1)

| medição | resultado | comando |
|---|---|---|
| HEAD = origin/main | `b8ee946` (registo do 108c, posterior ao `1e18792` esperado — só docs) | `git log -1`, `git log -1 origin/main` |
| Suíte canónica | **frontend 867/867 · backend 1095/1101 → VERDE** | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| 5 `.bak-*` | md5 conferido (5/5 OK) | `md5sum -c` |
| `_logs/DEBT.md` | **sem entrada** para a N3 (só registada nos logs do 108c) ⇒ nada a fechar lá | `grep N3\|108c` |
| Bundle de produção antes | `assets/index-CRWGSol9.js` | `curl` |

## SEG0 — Modalidade

| pergunta | resposta medida |
|---|---|
| De onde vem | **contexto**: `AppContext.jsx:180` `const [modalidade, setModalidade] = useState("flash")`; o MercadoLances já a desestrutura (`MercadoLances.jsx:249`) |
| Que forma tem | `"flash"` (⚡ Relâmpago) \| `"programado"` (🎫 Programado) — `components/glass/ModeSelector.jsx:7-8` (escolha do utilizador no seletor do cabeçalho) |
| É a mesma que decide o débito? | **Sim**: o MercadoLances passa **a mesma variável** ao CardLance (`MercadoLances.jsx:360`), que faz `isProgramado = modalidade === "programado"` (`CardLance.jsx:91`) e só aplica `semSaldoRsFlash` (saldo R$) quando **não** é programado (`CardLance.jsx:101-104`) |
| `useRecursosApp` / `edicao.tipo`? | não usados aqui (o `useRecursosApp` só dá `isLeilaoAtivo`); o tipo da edição não entra na decisão do débito do CardLance |
| Ambiguidade? | **nenhuma** — «relâmpago» do enunciado = valor `"flash"` ⇒ SEGUIR |

## SEG1 — Função

`src/components/SemSaldoBanner.jsx`: `mostrarAvisoSemSaldo({ …, modalidade })` — **primeira** linha:
`if (modalidade === "programado") return false;` com comentário (N3 / UTAC108c.1). O resto da regra (R18-A, R18-B)
**inalterado**. Sem `modalidade` (undefined) a regra anterior aplica-se (compatível).

## SEG2 — Call site

`src/pages/MercadoLances.jsx`: `mostrarAvisoSemSaldo({ isConnected, saldoRsCentavos, saldoRsStatus, tipoProvavel,
modalidade })` + comentário actualizado. CardLance **não tocado**.

## SEG3 — Testes + mutação

Teste actualizado (declarado): `src/pages/__tests__/utac108c-mlc-aviso.test.mjs` (+4 → 16):
- puro: `"programado"` com saldo lido 0 (ok e stale) ⇒ **false**;
- puro: `"flash"` mantém a regra (0 → true; 500 → false; null → false; corporativo → false);
- página REAL: modo Programado com R$ 0 ⇒ **sem aviso** e o formulário do lance continua lá;
- página REAL: o mesmo em Relâmpago ⇒ **com aviso** (controlo).
Os casos anteriores (R18-A, R18-B, vidro, `<main>`, «Carregar PIX») mantêm-se; a fixture já usava `"flash"`.

Mutação (`scripts/utac108c-prova-mutacao.mjs`, âncoras M2/M12 actualizadas ao novo call site): **14/14 PROVADOS (RED)**,
md5 restaurado — novos **M13** (remover a guarda do Programado → 2 RED) e **M14** (o call site deixa de passar a modalidade
→ 1 RED). Escape `\n` perdido de novo ao gerar o script (mesma armadilha do 108c): apanhado pelo `node --check` **antes** de
correr; nenhum mutante aplicado; corrigido com o Edit tool.

## SEG4 — Verificação

| verificação | resultado |
|---|---|
| Testes do UTAC | 22/22 (16 MLC + 6 Carteira) |
| Suíte canónica | **frontend 871/871** (= 867 + 4) · **backend 1095/1101** → VERDE |
| `vite build` (scratchpad) | exit 0 |
| Chunk `MercadoLances-*.js` construído | `…modalidade:i}){return i===\`programado\`\|\|e!==!0\|\|r===\`corpo…` |
| Programado + saldo 0 → sem aviso | ✅ (teste página + puro) |
| Relâmpago + saldo 0 → com aviso | ✅ |
| Relâmpago + saldo > 0 → sem aviso | ✅ |
| Corporativo → sem aviso (R18-B) | ✅ |
| CardLance, backend, `.bak-*`, package*, `EM_BREVE_MODE` | intactos (diff só nos 4 ficheiros do commit) |

Commit do código: **`37d9420`** (local; push só depois do veredicto).

## SEG5 — Validador adversarial

Subagente independente em worktree próprio (`C:/Users/Moltbot/tmp-108c1-val/wt` @ `37d9420`, helper A13). Veredicto
verbatim: `_logs/UTAC108c.1_SEG5_VALIDADOR.md`.

**Veredicto: APROVADO COM RESSALVAS · 0 achados graves (⚠️).** (a)–(h) **não refutadas**: suíte 871/871 · 1095/1101; teste
16/16; mutação 14/14 (confirmou que muta o worktree, não o repo principal). Mutantes próprios: **9/12 mortos**; V7
(`includes("prog")`) é **equivalente** (o único valor real com «prog» é «programado»); V8 inválido (âncora LF em CRLF).

| achado | tratamento |
|---|---|
| ℹ️ I1 — a modalidade é o seletor de UI global, não o tipo da edição (`EDICAO_ATIVA = "R-1"` fixo) | sem acção: o aviso fica coerente com o débito que o CardLance tenta |
| ℹ️ I2 — Programado com R$ 0 **e** 0 senhas: o aviso do topo some, mas o CardLance mostra «Sem senhas… recarregue via PIX» (`CardLance.jsx:515-525`) e bloqueia; só falta o atalho «Carregar PIX →» | decisão de produto, fora do escopo — **registado para o operador** |
| ℹ️ I3 — o teste de página usa duplo do CardLance; um mutante na prop `CardLance modalidade=` não seria apanhado | sem acção (o CardLance está fora do AUTORIZA; a prop não foi tocada) |
| ℹ️ I4 — chamada sem `modalidade` aplica a regra antiga | aceite; único call site passa o valor (M14 cobre) |
| «versões diferentes no repo principal vs worktree» | **medido**: só fins de linha (LF no meu ficheiro; CRLF no checkout do worktree por `autocrlf`) — 2365 bytes normalizados nos dois; `git status` limpo |

Sem correcções pós-veredicto. Worktree removido pelo helper (`"ok": true`).

## SEG6 — Deploy + registo

| verificação | resultado |
|---|---|
| Push | `b8ee946..37d9420` (só o commit do UTAC) |
| Bundle antes → depois | `index-CRWGSol9.js` → **`index-BZluhY9V.js`** · home **200** · `health` **200** |
| Chunk do MLC em produção | `MercadoLances-CdjCLUBx.js` (`application/javascript`) contém `modalidade:i}){return i===\`programado\`` e «Sem saldo. Carregar agora?» (1) |
| `package-lock.json` | não sujo |
| `_logs/DEBT.md` | não aplicável (a N3 nunca lá foi registada) — não tocado |

**Custo:** validador **96 765 tokens** = 1,9–194 ¢ (≈ 39 ¢ se tudo input; Opus 5.5 em ¢/1M: 400 in · 2 000 out · 20 cache).
Sessão principal não medida (`/cost`). **Duração:** ≈ 20 min (00:20 → 00:40) — **dentro do HI5 (30 min)**.

## Entrega final

[x] função recebe `modalidade` · [x] `false` em «programado» · [x] Relâmpago mantém a regra · [x] call site passa a
modalidade · [x] testes (Programado + Relâmpago + R18-A/B) · [x] mutação (M13/M14 mordem) · [x] suíte verde · [x] build ·
[x] backend intacto · [x] 5 `.bak-*` · [x] `EM_BREVE_MODE = true` · [x] validador · [x] deploy verificado · [x] package-lock
limpo · [x] 3 registos · [x] commit + push · [x] custo. **N3 FECHADA.** Pendência para o operador: I2 (atalho PIX no aviso
de senhas do CardLance).
