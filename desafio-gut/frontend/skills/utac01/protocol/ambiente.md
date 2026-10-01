# ARMADILHAS DE AMBIENTE — protocolo da série UTAC (DesafioGUT)

Medido nos UTACs da série. **Auto-contido.** Host: Windows 10; shell do agente: bash (git-bash/MSYS).

---

## Binários, caminhos e fim de linha

- **`python`, `git -C` e `curl` são binários Windows.** Usar caminhos `C:/...` (barra normal ou
  dupla) **SEMPRE**; caminhos tipo `/tmp` ou `/c/...` podem falhar dentro do processo Windows.
- **`curl` é o binário Windows:** escrever a saída só em caminhos `C:/...`. `-o /dev/null` **mente**
  (reporta `bytes=0` com corpo real). Nunca confiar no `/dev/null`. *(MC102.1b)*
- **Fins de linha (bytes, repo é LF):** `*.md` **LF** · `*.mjs`/`*.js`/`*.cjs`/`*.json`/`*.yml`
  **LF** · `*.jsx` **CRLF**. Regra em `.gitattributes`. Um medidor que faça regex a um `.md` com
  CRLF rebenta no worktree.
- **Nunca usar backticks nem heredoc** nos comandos: o MSYS interpreta-os e a string parte-se.
  Usar `write_file` para criar ficheiros.

## Ficheiros grandes e busca

- **`grep -r` SEMPRE com `--exclude-dir=node_modules`** — sem isto, o comando dá timeout (180 s).
- **`CLAUDE.md` tem bytes de controlo crus** (0x00/0x1f): usar `grep -a` (senão é tratado como binário).
- **`git worktree remove` falha com «Filename too long»** em Windows → remover com `rm -rf` do
  directório em vez de confiar no git.

## Netlify

- **Auto-deploy:** o `push` já publica. Deploys com estado «error» podem ser «no content change»
  (não é falha real) — medir antes de concluir. *(MC101)*
- **Reingestão do RAG:** o corpus é derivado (`regulamento.md` ← `docs/RAG-GUTO-v2.md`); re-ingerir
  e publicar com `netlify blobs:set`.
- **`netlify env:set` imprime o valor** no ecrã → nunca usar para segredos com eco visível.
  `env:list --json` devolve um **objecto** (chave→valor), não uma lista. *(MC102.1b)*
- **Deploy e harness correm em FOREGROUND** (nunca background).

## Disco, RAM e settings

- **Disco crítico** (~17 GB livres no ambiente medido). Um UTAC que precise dele **PARA se < 5 GB**.
- **RAM crítica** (~0,7 GB livres, histórico de BSOD 0x50/0x20001). Evitar builds paralelos pesados.
- ⚠️ **Não tocar em `.claude/settings.json` nem em credenciais** (R5). Ficam fora de qualquer UTAC.
- **Android/Capacitor:** exige **JAVA 21** (`JAVA_HOME=… Android Studio\jbr`); APK com
  `npm run build:apk` (**nunca** `npm run build`) + `gradlew assembleDebug`.
