# MC98 · SEG3 — VALIDAÇÃO INDEPENDENTE (HARD GATE 7)

**Validador:** subagente independente, despachado com a instrução **TENTAR REFUTAR, não
confirmar.** Worktree próprio: `.claude/worktrees/mc98-refutador` (detached HEAD `b7a9057`).
Escreveu os seus próprios medidores (`_refut/check3.mjs`, `check3b.mjs`, mutadores) e usou
`git checkout` para restaurar. **Nada escreveu no repositório principal.**
Duração: 869 s. Verdicto completo: `_logs/MC98_SEG3-VEREDICTO-VALIDADOR.txt`.

---

## Verdicto por afirmação

| # | afirmação | veredicto do validador |
|---|---|---|
| A1 | zero imports quebrados de `en.js`/`es.js` | ✅ **CONFIRMADA** |
| A2 | nenhum selector de idioma na UI | ✅ **CONFIRMADA** |
| A3 | nenhuma string de UI desapareceu | ✅ **CONFIRMADA** (0 divergências `dict`↔fallback em 78 pares; 0 órfãs) |
| A4 | 395/395 frontend e 680/686 backend | ✅ **CONFIRMADA** (mediu 395 e 686 exactos) |
| A5 | as guardas morrem com os mutantes | ⚠️ **PARCIALMENTE REFUTADA** |
| A6 | a ficha PT está dentro dos limites | ✅ números confirmados · ⚠️ **defeito de reprodutibilidade** |
| A7 | nenhuma string de PT alterada | ✅ **CONFIRMADA** |

## ⚠️ O que foi REFUTADO (e o que fiz com isso)

### R1 — As guardas eram cegas a duas evasões realistas (A5) · **CORRIGIDO**

As 4 mutações que eu tinha escrito morriam todas — mas o validador notou o que eu não vi:
**eu testei as guardas com a mesma forma que a própria guarda testa.** Isso é circular.

| evasão | o que fez | resultado ANTES |
|---|---|---|
| **E1** `<option value='en'>English</option>` | aspas **simples** e rótulo sem «(US)» (e «Spanish») | **6/6 VERDE** — guarda cega |
| **E2** `src/i18n/en.mjs` + `import en from "../i18n/en.mjs"` | a guarda da pasta filtrava `.endsWith(".js")`; as outras procuravam `i18n/(en\|es)\.js` | **6/6 VERDE** — guarda cega |

**Correcção aplicada:**
- o detector de selector passou a casar as **2 formas de aspas** e **3 grafias de rótulo**
  (`English`/`Spanish`/`Inglés` + `Español` + `Portuguese`), com **fronteiras de palavra
  medidas** (sem elas, «Espa» casaria `whiteSpace`/`espalhados` — 73 ocorrências — e «Ingl»
  casaria `paddingLeft` — 24);
- a guarda da pasta passou a exigir que `src/i18n/` **só contenha `pt.js`**, qualquer que
  seja a extensão (apanha `en.mjs`, `en.json`, `en.jsx`, incluso um `README`);
- o detector de caminho passou a `i18n[\\/](en|es)(\.[A-Za-z0-9]+)?(?![A-Za-z0-9_.-])` —
  cobre qualquer extensão e **não** casa `i18n/estilo.js` (falso positivo que a 1.ª tentativa
  produzia);
- a bateria de mutação passou de 4 para **7 mutações**, incluindo E1, E1b e E2.

**Prova de que fechou:** as 3 evasões são agora **RED** —
`MUT1c` (E2) mata «a pasta i18n só pode conter pt.js» + «nenhum ficheiro… importa»;
`MUT2b`/`MUT2c` (E1/E1b) matam «nenhum selector de idioma na UI do produto».

> **A lição, que é a do MC96.3 outra vez, com um angulo novo:** *uma guarda tem de ser
> testada contra as variantes que o ATACANTE escolheria, não contra a que o AUTOR escreveu.*
> Uma mutação que reusa a forma que o detector procura não prova nada — mede o autor.

### R2 — O medidor da ficha não era reprodutível (A6) · **CORRIGIDO**

`node scripts/mc97-medir-ficha.mjs` num worktree limpo: **exit 2** —
`esperava 3 blocos, vi 0 — medicao invalida`, num ficheiro **correcto**.

Causa-raiz medida pelo validador: `core.autocrlf=true` + ausência de regra `*.md` no
`.gitattributes` ⇒ `git worktree add` faz checkout **CRLF** nos `.md`; a regex do script
assumia ` ```\n ` (LF) e deixava de casar.

**Correcção (as duas partes):**
1. o script passou a ` ```\r?\n ` — tolerante a CRLF;
2. **causa-raiz:** `.gitattributes` ganhou `*.md text eol=lf`. Medido: os `.md` do repo já
   estavam LF no índice, logo a regra **não altera conteúdo nenhum** (`git status` ficou
   limpo nos ficheiros com tracking) — só torna o checkout reprodutível fora do repo principal.

**Prova:** o SEG2 passou a incluir um teste de **instrumento** — escrever
`docs/FICHA-PLAY-PT.md` em CRLF (86 linhas, 4053 bytes), correr o medidor, exigir exit 0 e
`3/3 campos dentro dos limites`, e restaurar **byte a byte**. Resultado: **PROVADO**.

## ✅ Notas de metodologia que o validador registou (e que fica bem documentar)

- **Os testes do backend exigem `cwd = netlify/functions` E `--experimental-test-module-mocks`.**
  Sem isso dá **61 falhas falsas** (`TypeError: mock.module is not a function`, `ENOENT …
  frontend/_lib/guto-perfis.mjs`). O validador passou por lá antes de acertar — e registou-o
  para quem repetir a medição.
- **A divergência 677/666/5 que ele mediu a meio era artefacto do próprio cwd**, não do
  código. Confirmei-o por fora: os 3 ficheiros em causa passam **21/21** no repo principal
  com o cwd certo, e o glob `_tests/*.test.mjs` expandido por mim dá exactamente
  `686 tests / 680 pass / 0 fail` — igual ao `find` recursivo (79 ficheiros, 0 em subdirs).
- **Sinal honesto:** o validador declarou explicitamente o que **não** conseguiu verificar
  (ficha contra a Play Console real, contagem de emojis/`«»` pela Play, suíte inteira como
  número único, e não fez `vite build`). O build foi feito por mim, por fora — ver SEG4.

## Limitação desta validação (declarada)

O validador validou o **código** no commit `b7a9057`. Não viu produção **com** a mudança —
por desenho: o deploy é o último acto (HARD GATE 8) e acontece no SEG4. A validação em
produção é feita no SEG4.5, com medição própria e captura de ecrã.

E o validador **não conseguiu remover o seu worktree** (esgotou as iterações) — removido por
mim em `SEG4.7`.
