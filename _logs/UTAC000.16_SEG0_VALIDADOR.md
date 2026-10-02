# UTAC000.16 — Veredicto do validador adversarial independente

Data: 2026-10-02 · HEAD da árvore principal `3e80c64` (não alterada) · node v24.14.1

| Item | Veredicto |
|---|---|
| 1 — 3.ª validação dos testes #6 e #7 (`utac00014-show-overlay.test.mjs`) | **APROVADO COM RESSALVAS** |
| 4 — arquivo da branch `claude/zen-goldberg-ce8759` (DEBT-015) | **APROVADO COM RESSALVAS** (o `.mbox` é sólido; o `.patch` corrompe-se num checkout fresco) |

---

## Item 1 — cobertura dos testes #6 e #7

Método: worktree destacado em `3e80c64`, mais um script `mutar.mjs` com âncoras exactas `\r\n`. Para cada mutante: confirmei que a âncora tinha 1 ocorrência, confirmei que o mutante entrou (o texto novo está presente e o md5 mudou), corri o teste e restaurei a partir do `.bak`. O md5 voltou a `e1e675369989d194039ffe91942c4ddb` depois de cada mutante. Base: `# pass 9 # fail 0`.

### (a) R5 e R7 reproduzidos. A declaração do executor confirma-se.
```
R5: entrou=true pass=7 fail=2
   RED: EM BREVE: também com prazo 0 e com prazo já vencido há muito, o overlay NÃO abre
   RED: CONTROLO: com a linha de novo comentada (em memória), o overlay NÃO abre — o teste morde
R7: entrou=true pass=8 fail=1
   RED: EM BREVE: prazo reaberto on-chain depois de encerrado continua a FECHAR o overlay
```
- O #6 apanha o R5 **por si próprio**: é semântico, não depende só do CONTROLO.
- Quem morde é o sub-caso `prazoTimestamp=0`. O sub-caso «vencido há 30 dias» (prazo 1000) não activa o R5.
- O #7 é o único teste que apanha o R7.

### (b) Mutantes meus
```
V1  `|| Date.now()/1000 - prazo > 3600`                 → pass=7 fail=2  (#6 semântico + CONTROLO)   morde
V4  `|| prazoTimestamp > 0`                             → pass=5 fail=4                               morde
V5  2.º tick: `else if (EM_BREVE_MODE) setShowOverlay(true)` → pass=8 fail=1 (#6, graças ao 2.º m.tick()) morde
V2  `|| encerrado`                                      → pass=8 fail=1  só CONTROLO (âncora textual)
V3  `|| prazoTimestamp > 1700000000` (epoch real)       → pass=8 fail=1  só CONTROLO (âncora textual)
V11 `|| prazoTimestamp % 1000 !== 0`                    → pass=8 fail=1  só CONTROLO (âncora textual)
V6  abrir SÍNCRONO no ramo de disparo: `if (EM_BREVE_MODE && prazoTimestamp > 1e9) setShowOverlay(true)` → pass=9 fail=0  <<< SOBREVIVE
V7  ramo novo: prazo no futuro + EM BREVE abre          → pass=9 fail=0  <<< SOBREVIVE
V10 R7 condicionado a epoch real: `if (!(EM_BREVE_MODE && prazoTimestamp > 1e9)) setShowOverlay(false)` → pass=9 fail=0  <<< SOBREVIVE
V8  `if (!EM_BREVE_MODE) fimDisparadoRef.current = false` no ramo de reabertura → pass=9 fail=0  <<< SOBREVIVE
V9  reset de `fimDisparadoRef` removido                 → pass=9 fail=0  <<< SOBREVIVE
V12 sem temporizador em EM BREVE com prazo 0 (`return` antes do setTimeout) → pass=9 fail=0  <<< SOBREVIVE
restaurado md5=e1e675369989d194039ffe91942c4ddb
```
- ⚠️ **R-1: os prazos dos testes são de brinquedo.** Usam 0, 1000, 2000 e `1000+30·86400 = 2 593 000`, todos abaixo de 1e9. Os prazos reais são epoch (cerca de 1.7e9).
  - Uma fuga condicionada a valores realistas sobrevive a toda a suíte quando está fora da linha-âncora (V6, V10).
  - Na própria linha-âncora (V3) só é apanhada pelo `replace` textual do CONTROLO, não por semântica.
  - Correcção barata: acrescentar ao #6 e ao #7 um caso com `prazoTimestamp ≈ 1_760_000_000`.
- ⚠️ **R-2: o #6 e o #7 só observam `setShowOverlay`.**
  - Ninguém verifica o reset de `fimDisparadoRef` no ramo de reabertura (V8 e V9 sobrevivem). O V9 não é específico do EM BREVE: é uma lacuna anterior, que já existia no #4. Efeito real do V9: depois de uma reabertura on-chain, o fim seguinte não volta a disparar o relâmpago nem o overlay.
  - Basta acrescentar ao #7 `assert.equal(m.duplos.fimDisparadoRef.current, false)`, partindo de `fimDisparadoRef.current = true` (o estado realista depois do encerramento; hoje o duplo parte de `false`, e por isso a atribuição é invisível).
- ℹ️ **V7** (abrir com prazo futuro em EM BREVE) sobrevive porque nenhum teste combina EM BREVE com prazo futuro. O #3 só cobre esse caso com o leilão aberto.
- ℹ️ **V2** (`|| encerrado`) quase não é alcançável em runtime. O temporizador captura `encerrado` do tick que o arma. Esse valor é `false`, salvo no caso de ref=false com encerrado=true, que só o ramo de reabertura produz, e esse ramo põe `encerrado=false` no mesmo passo. Fica só para registo.

### (c) Vacuidade
Sonda (`sonda.mjs`) sobre o código original:
```
#6 prazo=0:    temporizadores=1 ms=1200 chamadas=[["setEncerrado",true],["setLightningActive",true],["setLightningActive",false],["setEncerrado",true]]
#6 prazo=1000: temporizadores=1 ms=1200 chamadas=[...igual...]
#7: chamadas=[["setEncerrado",false],["setShowOverlay",false]] fimDisparadoRef=false (partiu de false)
```
- Nos dois sub-casos do #6 é armado exactamente um temporizador, e o `forEach` executa-o. No código actual o teste **não é vácuo**.
- ⚠️ **R-3:** o #6 não o *afirma*. Não tem `assert.equal(m.temporizadores.length, 1)`, ao contrário do #1 e do #2.
  - O V12 (nenhum temporizador em EM BREVE com prazo 0) passa por isso trivialmente.
  - Nesse cenário o relâmpago ficaria aceso para sempre (`setLightningActive(false)` nunca corre). O #5 só verifica isso com prazo 1000.

### (d) O #7 face ao #4
- O `deepEqual` é igual ao do #4; só muda `emBreve: true`.
- **Distingue uma coisa, e mede-se:** o R7 passa no #4 e é RED no #7. Não distingue mais nada: os V8 e V10 passam em ambos.

**Conclusão do item 1:**
- A cobertura declarada para o R5 e o R7 é real, e o #6 é semântico.
- Há 3 ressalvas, todas só de teste e sem defeito no código de produção:
  - R-1: prazos de brinquedo.
  - R-2: `fimDisparadoRef` não é observado.
  - R-3: falta a afirmação de que o temporizador é armado.

---

## Item 4 — arquivo da branch `claude/zen-goldberg-ce8759` (DEBT-015)

### Declarações do executor confirmadas
```
git rev-parse B origin/B         → 24f82af2… / 24f82af2…   (local = remota)
git merge-base main B            → 39382d9a…   (é ancestral de main: sobrevive à remoção)
git rev-parse B^{tree}           → adfc078be7027429b26d016525ededda55e5e4bc
git diff main...B | sha256sum    → 04ab4e06…  = sha256 do .patch (regenerado, idêntico)
git format-patch --stdout 39382d9..24f82af | sha256sum → a8d57778… = sha256 do .mbox (idêntico)
tamanhos: .mbox 45234 B · .patch 37712 B
```

### O que se perde ao apagar a branch: tudo está coberto
- **Commits:** 4, em cadeia linear, sem merges (`rev-list --parents`). Autor = committer = `DESAFIOGUT <desafiogut@deploy.local>` nos 4.
- **Binários:** 0 (`numstat` sem `- -`). Os ficheiros têm 0 bytes CR nos blobs e 0 NUL.
- **Modos e renomeações:**
  - Há só 6 `create mode 100644` (`--summary -M`), sem mudanças de modo nem renomeações.
  - Ao todo são 12 ficheiros, +603/−65.
- **Assinaturas e notas:** `gpgsig` 0/4 e `git notes` vazio.
- **Refs:** só `refs/heads/claude/zen-goldberg-ce8759` e `refs/remotes/origin/…` contêm qualquer um dos 4 commits.
  - Tags: 0. Stash: vazio. Nenhum worktree tem a branch.
  - `ls-remote`: a remota está só nessa ref, e é igual à local.
- **PR no GitHub:** `gh pr list --head … --state all` → `[]`.
- **Reflog:** os ficheiros `.git/logs/refs/{heads,remotes/origin}/claude/zen-goldberg-ce8759` têm 0 linhas, e `reflog --all` não tem nenhuma menção. Não há pontas antigas por arquivar.
- ℹ️ **Perde-se a config `branch.claude/zen-goldberg-ce8759.*`** (`remote=origin`, `merge=refs/heads/main`, `vscode-merge-base=origin/main`). É irrelevante.
- ℹ️ **Reconstrução bit-a-bit dos SHAs a partir do mbox, medida:**
  ```
  GIT_COMMITTER_NAME=DESAFIOGUT GIT_COMMITTER_EMAIL=desafiogut@deploy.local \
    git am --committer-date-is-author-date DEBT-015_zen-goldberg.mbox   (sobre 39382d9)
  → HEAD=24f82af2907f3ebcae95c4665f692bbed7ca83e0, e os 4 SHAs são iguais aos originais
  ```
  - O mbox não guarda o committer, mas aqui committer = autor e a data é a mesma. Por isso a reconstrução é **exacta**, o que vai além de «mesma árvore».
  - Vale a pena registar este comando no DEBT-015.

### ⚠️ R-4: o `.patch` não sobrevive a um checkout fresco com `core.autocrlf=true`
O teste foi feito num worktree destacado de `3e80c64`, só com os 2 ficheiros adicionados e um commit temporário `0742eb7`, descartável. Esse commit ficou como objecto inalcançável, que o gc vai limpar.
```
blob (git show 0742eb7:_logs/…):  sha256 iguais ao original (LF preservado no índice: i/lf)
checkout fresco desse commit:     i/lf  w/crlf  attr/text=auto   → patch CR=923, mbox CR=1115 (sha mudam)

                                   blob LF          checkout CRLF
apply --check (worktree autocrlf)   rc=0             rc=0  (só por coincidência: a worktree também é CRLF)
apply --index                       rc=0 tree=adfc078  rc=1 → "patch does not apply" (CardLance, AppContext, main.jsx…)
apply --check em worktree LF        rc=0             12 erros
  (simulação de Linux/CI: worktree criado com -c core.autocrlf=false -c core.eol=lf)
git am (worktree autocrlf)          rc=0 tree=adfc078  rc=0 tree=adfc078
git am (worktree LF)                rc=0 tree=adfc078  rc=0 tree=adfc078 (mailsplit tira os CR)
git am bit-exacto (acima)           24f82af          24f82af
```
- **O `.mbox` é robusto nos dois cenários.**
- **O `.patch` lido de um checkout fresco** falha com `--index`/`--cached` em qualquer ambiente, e falha de vez num worktree LF. O `apply` simples num worktree autocrlf funciona (seguido de `git add` dá `adfc078`), mas é frágil.
- **Correcção antes de commitar:**
  - Acrescentar ao `.gitattributes` `*.patch -text` e `*.mbox -text`, ou `binary`.
  - Alternativa mínima: `_logs/DEBT-015_* -text`.
  - Com `eol=lf` também funciona.
  - Depois, confirmar com `git ls-files --eol` que a coluna `w/` fica `-text`/`lf`.

### Varredura de segredos (só contagens/hashes)
- Padrões testados nos 2 ficheiros, linhas `+`, `-` e contexto incluídas: chave privada `0x{64}`, JWT `eyJ…`, `sk-…`, `AKIA…`, `alchemy.com/v2/<chave>`, `infura.io/v3/<id>`, `BEGIN PRIVATE KEY`, `(PRIVATE_KEY|SECRET|TOKEN|PASSWORD|API_KEY)=valor{12+}`, `ghp_`, `xox?-`, `AIza…`. **Resultado: 0 em todos.**
- Strings longas `[A-Za-z0-9+/]{40,}`: 5 no `.patch` e 11 no `.mbox`, todas classificadas:
  - caminhos de ficheiro (len 43, com `/`);
  - endereços Ethereum públicos (len 42, `0x`);
  - SHAs das linhas `From <sha>` do mbox (sha1hex, 4).
- ℹ️ **Há 3 linhas com um Privy App ID** (25 car., prefixo `cm`, sha256 `45ba59ce84…`). É um identificador público de cliente, não um segredo, e o mesmo valor **já existe em 16 ficheiros de `main`**. Não é uma exposição nova.

**Conclusão do item 4:**
- O arquivo contém tudo o que se perde ao apagar a branch: commits, autoria, datas, mensagens e árvore. Os SHAs reconstroem-se bit-a-bit a partir do mbox.
- Não há binários, mudanças de modo, renomeações, tags, reflog nem refs extra.
- **Ressalva R-4:** o `.patch` corrompe-se (CRLF) no checkout. É preciso corrigir o `.gitattributes` antes do commit, ou tratar o `.mbox` como o artefacto canónico.

---

## Limpeza
```
git worktree remove --force …/wt  → removido wt
git worktree remove --force …/wt2 → removido wt2
git worktree remove --force …/wt3 → removido wt3
git worktree remove --force …/wt4 → removido wt4
git worktree prune; git worktree list | grep -c tmp-utac00016 → 0
árvore principal: HEAD 3e80c64; 0 alterações rastreadas; sha256 dos 2 ficheiros _logs inalterados
```
- Não criei junctions. Não houve push, deploy, Supabase nem Netlify. Não apaguei branches.
- O md5 do `AppContext.jsx` no worktree estava restaurado antes da remoção.
- Ficaram em `C:/Users/Moltbot/tmp-utac00016-val/`, fora do repo: `VEREDICTO.md`, `mutar.mjs`, `sonda.mjs`, `AppContext.jsx.bak`, `blob/` (cópias dos 2 ficheiros, LF e CRLF) e `err.txt`.
- O único rasto no repo é o objecto inalcançável `0742eb7` (commit temporário), que o gc vai limpar.

---

# RESPOSTA DO EXECUTOR

**Aceite (APROVADO COM RESSALVAS nos dois itens). As 4 ⚠️ fechadas (R15, sem código de produção):**

- **R-1/R-3** (#6): +caso com epoch real (`1_760_000_000`), `temporizadores.length === 1` em cada sub-caso, e o relâmpago tem de acender E apagar. **R-1/R-2** (#7): +caso com epoch real e `fimDisparadoRef` partindo de `true` tem de voltar a `false`. **V7** (ℹ️): novo teste «EM BREVE: prazo no futuro (epoch real) — nada dispara». Ficheiro 10/10.
- **Bateria do validador re-corrida contra o teste reforçado** (o próprio `mutar.mjs` dele, apontado a um worktree meu `tmp-utac00016/wt-m`; restauro md5 `e1e67536…`): **14/14 mutantes morrem** — antes sobreviviam 6 (V6, V7, V8, V9, V10, V12); agora cada um tem um RED semântico. V2 e V11 continuam apanhados só pelo CONTROLO textual (V2 classificado por ele como quase inalcançável em runtime) — aceite.
- **R-4**: `.gitattributes` + `*.patch` / `*.mbox` / `*.diff` `text eol=lf` (a regra do resto do ficheiro). Medido: os 3 ficheiros têm **CR=0**; o `UTAC000.12_worktrees-preservados.patch` já era `i/lf` ⇒ diff vazio, conteúdo inalterado. ⚠️ Escolhi `eol=lf` em vez do `-text` sugerido: mesmo efeito para ficheiros LF puros, coerente com as regras existentes.
- **Reconstrução exacta** (o comando dele) registada na DEBT-015.
- Suíte: **frontend 664/664 · backend 967/973**.
- ⚠️ Estas correcções **não passaram por 4.ª validação** (declarado).
