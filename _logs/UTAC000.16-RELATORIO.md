# UTAC000.16 — Relatório: higiene (3.ª validação · package-lock · custo · branch DEBT-015)

**Data:** 2026-10-02 · **Executor:** Claude Code (Opus 5.5) · **Base medida:** `3e80c64` = `origin/main` = HEAD
(o spec diz `04a842d`; `3e80c64` = `04a842d` + só o registo de deploy do UTAC000.14 — zero código).
**VEREDICTO: CONCLUÍDO** — 4 frentes fechadas; validador adversarial **APROVADO COM RESSALVAS** nos dois itens, ressalvas ⚠️ corrigidas. **Zero código de produção alterado.**

---

## 1. SEG-1 — medição (`_logs/UTAC000.16_SEG-1_MEDICAO.md` + `_SEG-1_EVIDENCIA.txt`)
- Suíte **663/663 · 967/973** (= declarado). Disco C: **12 GB livres (95%)** ⚠️ (−6 GB desde o UTAC000.14; não é deste UTAC).
- Premissa corrigida: o GATE 7 cita o «mutante M12» — não existe no UTAC000.14 (o M12 é do UTAC000.10). Os 2 testes cobrem os mutantes **R5/R7**.
- Veredito: **SEGUIR** (com ajustes declarados: base real; R5/R7; arquivar também um `.mbox`).

## 2. Frente A — 3.ª validação dos 2 testes (#6 e #7 de `utac00014-show-overlay.test.mjs`)
Validador independente (agente novo, worktree próprio): **APROVADO COM RESSALVAS** — R5/R7 reproduzidos (o #6 morde R5 **por si**, não só pelo CONTROLO; o #7 morde R7 que o #4 não apanhava), não vácuos. Mas dos **12 mutantes dele, 6 sobreviviam** à suíte inteira:
- ⚠️ **R-1** prazos de brinquedo (< 1e9) ⇒ fugas condicionadas a epoch real passavam (V6, V10);
- ⚠️ **R-2** ninguém observava o reset de `fimDisparadoRef` (V8, V9 — o V9 é lacuna anterior, do #4);
- ⚠️ **R-3** o #6 não contava temporizadores ⇒ V12 (sem temporizador) passava;
- ℹ️ V7 (EM BREVE + prazo futuro abre) sem cobertura.

**Corrigido (só ficheiro de teste):** #6 com epoch real + `temporizadores.length === 1` + relâmpago acende/apaga; #7 com epoch real + `fimDisparadoRef` `true → false`; novo #8 «EM BREVE: prazo no futuro — nada dispara». **A bateria DO validador re-corrida contra o teste reforçado: 14/14 morrem** (eram 6 sobreviventes), restauro md5 idêntico. V2/V11 só pelo CONTROLO textual (aceite; V2 quase inalcançável). Ficheiro **10/10**.
Veredicto + resposta: `_logs/UTAC000.16_SEG0_VALIDADOR.md`.

## 3. Frente B — `package-lock.json`: REVERTIDO (era alteração real e PREJUDICIAL)
- Diff `+119/−138` **removia os 4 peers** `typescript`, `@types/react`, `@tanstack/react-query`, `@tanstack/query-core` (o padrão do MC93-G: um `npm install --legacy-peer-deps`); mtime 2026-10-01 12:18 (fora deste UTAC).
- **Medido em cópia isolada:** `npm ci --dry-run` com o lock modificado → **rc=1 `EUSAGE` «Missing: typescript@5.9.3…»**; com o do HEAD → rc=0 (1011 pacotes). Commitá-lo **partiria a CI**.
- Cópia de segurança (md5 `8f7abd2e…`) em `C:/Users/Moltbot/tmp-utac00016/package-lock.json.modificado` e o diff completo na evidência; depois `git checkout --` (autorizado). md5 = HEAD `dd3bec4c…`; `npm ci --dry-run` OK; `node_modules` intacto (505).
- ⚠️ Vai voltar a acontecer enquanto houver dois modos de instalação (pendência A-1 do MC93-G, não deste UTAC).

## 4. Frente C — custo (limitação declarada)
- **UTAC000.14:** custo em USD **não medido** — sessão Claude Code, sem o `state.db` do Hermes (procurado; inexistente). Medido só: validador 142 985 + 176 406 tokens.
- **UTAC000.16:** idem — **USD não medido**. Medido: validador **123 392 tokens** (28 chamadas, 359 s). ⚠️ Esta **não foi uma sessão dedicada**: é a mesma conversa do UTAC000.14 (não há forma de separar o custo do executor por UTAC aqui).

## 5. Frente D/E — branch `claude/zen-goldberg-ce8759` arquivada e apagada · DEBT-015 FECHADA
- `_logs/DEBT-015_zen-goldberg.patch` (diff `main...branch`, 37 712 B — o pedido) + `_logs/DEBT-015_zen-goldberg.mbox` (format-patch, 45 234 B — acrescentado: o diff perde mensagens/autoria).
- **GATE 21:** no merge-base `39382d9`, o patch dá a árvore `adfc078…` = `24f82af^{tree}`; o `git am` do mbox recria os 4 commits (o validador: **os 4 SHAs originais bit-a-bit**, comando na DEBT-015). 0 segredos.
- ⚠️ **R-4 (validador):** o checkout fresco do `.patch` saía CRLF e o `git apply --index` falhava ⇒ `.gitattributes`: `*.patch`, `*.mbox`, `*.diff` `text eol=lf` (CR=0 nos 3 ficheiros; o patch do UTAC000.12 já era `i/lf` — diff vazio).
- **Prova do R-4 a partir do commit `9341ed6`** (worktree fresco em HEAD): o `.patch` sai `i/lf w/lf`, CR=0; `git apply --index` no merge-base → rc=0 e árvore `adfc078…` (= ponta).
- Ponta re-verificada (`24f82af`) imediatamente antes; `git branch -D` + `git push origin --delete` ⇒ refs locais **0**, remotas **0**.

## 6. Verificação final
`git status` só com os ficheiros deste UTAC · suíte **664/664 · 967/973 VERDE** · patch/mbox existem · branch desaparecida · DEBT-015 fechada · nenhum ficheiro de produção (`src/**` fora de `__tests__`, `netlify/functions/**`) no diff.

## 7. Erros e desvios meus (declarados)
1. Removi um worktree (`wt-a`) **com a shell lá dentro** ⇒ `Permission denied`; a cadeia `&&` parou e as linhas seguintes correram no repo principal só em **leitura** (verificado: HEAD `3e80c64`, sem `rebase-apply`, status igual). Pasta órfã apagada depois de confirmar 0 junctions.
2. Usei **`git add -A`** — **só dentro desse worktree descartável**, para calcular o hash da árvore; nunca no repo principal nem num commit.
3. Escolhi `eol=lf` em vez do `-text` sugerido pelo validador (mesmo efeito em ficheiros LF puros; coerente com o resto do `.gitattributes`).
4. As correcções pós-veredicto (testes + `.gitattributes`) **não passaram por 4.ª validação**.

## 8. O que este UTAC NÃO fez
Não alterou código de produção, contrato, GUTO, regras da skill, `_ponte-ssr.mjs`, `_render.mjs`, `vite.config.js`, `package.json`; não integrou a branch; não fechou DEBT-001/002/003/005/006/010/013.

## 9. Deploy
Push autorizado pelo operador: `3e80c64..5b9335a`. O auto-deploy `6abf4330…` fez build (o teste vive em `desafio-gut/frontend`) → **ready**, `commit_ref 5b9335a`. **Bundle inalterado, medido:** o `index.html` servido tem o md5 `1fe2bf37…` igual ao do deploy do UTAC000.14 (`6abf3c20`, URL permanente) e os mesmos chunks com hash (`AppContext-DttfR1he.js` 200 nos dois) — GATE 18 confirmado em produção.
