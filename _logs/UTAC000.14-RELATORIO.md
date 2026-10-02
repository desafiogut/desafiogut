# UTAC000.14 — Relatório: guarda do FimEdicaoOverlay (DEBT-013) + religar o `showOverlay`

**Data:** 2026-10-02 · **Executor:** Claude Code (Opus 5.5) · **Base medida:** `3a0f6fa` = `origin/main` = HEAD
**Commits:** `f635b32` (guarda + religar) · `9b9556e` (religar só fora do EM BREVE — refutação do validador) · commit de fecho (testes R5/R7 + registos)
**VEREDICTO: CONCLUÍDO** — DEBT-013 **fechada**; `showOverlay` **religado com a condição do operador**; validador **APROVADO COM RESSALVAS** (2.ª ronda).

---

## 1. SEG-1 — medição (conflitos do spec ⇒ AJUSTAR ⇒ decididos pelo operador)
- Suíte baseline **630/630 · 967/973** (= declarado). Disco C: 18 GB livres.
- Caminho real: `src/components/FimEdicaoOverlay.jsx` (o spec dizia `components/edicao-especial/`).
- **Conflito 1:** a l.14 (endereço) também rebentava — 6 casos, incluindo `vencedor: {}`, que o GATE 22 exige não rebentar; o spec só autorizava a l.16. **Operador: «Guardar l.14 + l.16».**
- **Conflito 2:** o `setShowOverlay(true)` comentado está em **`AppContext.jsx` l.1205**, não no `MercadoLances.jsx` (que só lê a flag). O spec proibia o AppContext. **Operador: «Autorizar AppContext l.1205».**
- Evidência ANTES preservada: `_logs/UTAC000.14_SEG-1_EVIDENCIA.txt` (teste novo contra o código antigo: **17 RED / 7 verdes**, com os 2 TypeError de BigInt/Symbol e os 6 do `.slice`).

## 2. SEG0 — DEBT-013 (Frente A/B)
Guarda de tipo, igual à do `OverlayVencedor` (UTAC000.11): endereço = string não vazia; valor = finito ≥ 0. Edição por bytes (CRLF íntegro).
- Teste `src/components/__tests__/utac00014-fim-edicao-overlay.test.mjs` (24 casos, GATE 22 completo): **17 RED → 24/24**.
- Mutantes: M15a 10 RED · M15b 8 · M15c 1 · M15d 4 — restauro da **cópia** fora do repo, md5 idêntico (GATE 20).
- Alteração declarada: `valor: "300"` passa de «R$ 3.00» a «—» (regra «malformado = ausente», igual ao UTAC000.12).

## 3. SEG1 — `showOverlay` (Frente C) — em DUAS rondas
**1.ª (`f635b32`):** descomentada a linha. Teste novo `src/context/__tests__/utac00014-show-overlay.test.mjs` extrai a função `tick` **real** do AppContext e executa-a com duplos (relógio, setTimeout, setters). Original 2 RED → 5/5; M16 2 RED.

**⚠️ REFUTADO pelo validador (G1):** com `EM_BREVE_MODE = true` e prazo on-chain da R-1 = 0, o prazo do relâmpago é um **cronómetro LOCAL de 30 min** ⇒ o overlay «EDIÇÃO ENCERRADA» + confetti abria **sozinho** 30 min após qualquer 1.ª visita (e 1,25 s após um F5), sobre ecrãs «Em breve», só saindo por «NOVA RODADA», que rearma 30 min. Era exactamente o motivo do MC63/64. **Confirmei as premissas no código** e escalei.
**Decisão do operador (R18):** «Religar só fora do EM BREVE».

**2.ª (`9b9556e`):** `import { EM_BREVE_MODE } from "../lib/leilaoLock.js";` + `if (!EM_BREVE_MODE) setShowOverlay(true);`. Hoje não abre (o minificador elimina a chamada — medido pelo validador no bundle); no dia em que a flag for `false`, abre como antes do MC63/64 e religa **os dois** overlays (`FimEdicaoOverlay` no Dashboard + `OverlayVencedor` no Mercado).
- Mutantes: **M17 (EM_BREVE_MODE ignorado — o pedido do operador) 3 RED** · M16 2 · M18 (import removido) 1 · M19 (invertida) 5.
- Fecho das ressalvas do validador (R5/R7, só testes): +2 testes ⇒ **9/9**; R5 → 2 RED, R7 (era sobrevivente) → 1 RED.

## 4. SEG2 — verificação final
- Suíte (foreground, `node scripts/mc966-suite-harness.mjs ambos </dev/null`): **frontend 663/663 · backend 967/973 VERDE** (+33 = 24 + 9).
- `vite build` (para o scratchpad, **não** para o `dist/` do APK): exit 0.
- Escopo: só `FimEdicaoOverlay.jsx`, `AppContext.jsx` (import + 1 condição + comentários), 2 testes novos e `_logs/`. O `package-lock.json` modificado é **pré-existente** e não entra.
- Antes/depois: `_logs/UTAC000.14_SEG-2_ANTES-DEPOIS.txt`.

## 5. SEG3 — validador adversarial (2 rondas, worktree próprio, junctions A9 removidas com `rmdir`)
- **1.ª ronda: REFUTADO na Frente C (G1), Frente B APROVADA** — válido byte-idêntico (44 renders com `Math.random` semeado), todos os mutantes dele mordem, suíte reproduz.
- **2.ª ronda: APROVADO COM RESSALVAS** (só ℹ️) — 0 aberturas em C1–C6 com a flag real; produtor único; sem ciclo de módulos (+35 B no bundle, grafo eager igual); R5/R7 fechados por mim depois (não re-validados — declarado).
- Veredictos integrais + respostas: `_logs/UTAC000.14_SEG-3_VALIDADOR.md`.

## 6. Dívida
- **DEBT-013 FECHADA.**
- **DEBT-016 ABERTA (nova, média):** antes de desligar o `EM_BREVE_MODE`, o relâmpago tem de ter um prazo **real** (servidor/on-chain); senão o overlay volta ao ciclo de 30 min locais. O `FimEdicaoOverlay` também não tem `onClose`.
- ℹ️ **APK (N7 do validador):** o overlay só chega ao APK com um novo `build:apk`.

## 7. O que este UTAC NÃO fez
Não tocou em contrato, GUTO, `_ponte-ssr.mjs`, `_render.mjs`, `vite.config.js`, `package.json`, `useResultadoOficial.js`, `MeusAtivos.jsx`, `Dashboard.jsx`, `MercadoLances.jsx`, backend. Não fechou DEBT-001/002/003/005/006/010/015.

## 8. Erros dos meus instrumentos (declarados)
1. No 2.º teste do overlay, um escape `\\n` dentro de um script gerador virou newline literal e partiu o regex (`SyntaxError`, ficheiro não carregava — 0 pass). Detectado pela própria corrida; substituído por `includes` literal.
2. O meu SEG-1 só provou «com prazo 0, abre» — não provou «não abre quando não deve». Foi por aí que passou o G1. A prova do controlo negativo de contexto é o que o validador acrescentou.

## 9. Custo e tempo
- **Sessão:** Claude Code (Opus 5.5), não o Hermes — o `state.db` citado no spec **não existe nesta máquina** para esta sessão (procurado; não encontrado). **Custo em USD não medido** (GATE 17: não se inventa).
- Medido: validador adversarial **142 985 tokens** (1.ª ronda, 29 chamadas, 441 s) + **176 406 tokens** (2.ª ronda, 20 chamadas, 367 s).
- Tempo: dentro das 2 h (R18-2), contando as duas rondas.

## 10. Deploy (autorizado pelo operador)
- `git log origin/main..HEAD` antes do push = só `f635b32`, `9b9556e`, `04a842d`. Push `3a0f6fa..04a842d` (o «Bypassed rule violations» é o conhecido).
- Auto-deploy **`6abf3c20df1454000984408b`** → **ready**, `commit_ref 04a842d` (sem `netlify deploy` manual — lição do MC93-F).
- **Bundle servido verificado** (BFS, 131 chunks): guarda de tipo (`typeof …endereco=="string"` + `Number.isFinite(…?.valor)`) presente nos chunks dos DOIS overlays (`PrivyRoot-DZA5Lz9d.js` = Dashboard/`FimEdicaoOverlay`, `MercadoLances-DBvMdnwx.js`); o `setTimeout` de 1200 ms do `AppContext-DttfR1he.js` é `{de(!1),nt.current=null}` — **sem `setShowOverlay(true)`** (eliminado com `EM_BREVE_MODE = true`); contrato mainnet presente.
