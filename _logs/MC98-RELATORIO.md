# MC98 — DESAFIOGUT DECLARADO PT-BR ONLY · RELATÓRIO FINAL

**Data:** 2026-09-27 · **Base:** `56f8305` (MC97 fechado) · **Modo:** COMPLETO (SEG-1 → SEG4)
**Commits:** `b7a9057` (mudança) · `80b5dbc` (correcções do validador) — ambos em `origin/main`
**Produção:** https://silly-stardust-ca71bc.netlify.app (deploy `6ab89438c0ec03d1c39fde3c`)
**Logs:** `_logs/MC98_SEG-1_DEPENDENCIAS.md` · `_logs/MC98_SEG0_RELATORIO.md` ·
`_logs/MC98_SEG1_RELATORIO.md` · `_logs/MC98_SEG2_RELATORIO.md` (+ `MC98_SEG2_MUTACAO.txt`) ·
`_logs/MC98_SEG3_RELATORIO.md` (+ `MC98_SEG3-VEREDICTO-VALIDADOR.txt`) ·
`_logs/capturas/MC98-PRODUCAO-CONFIGURACOES.png`

---

## 1. Sumário executivo

O DesafioGUT é agora **oficialmente PT-BR only**. `en.js` e `es.js` foram removidos, o
selector de idioma saiu da UI, o glossário e a ficha da Play ficaram só em português, e
**seis guardas novas** impedem o regresso de qualquer um deles — provadas contra **sete
mutações**, incluindo duas evasões que só o validador independente descobriu.

| | antes | depois |
|---|---|---|
| dicionários em `src/i18n/` | 3 (`pt`, `en`, `es`) | **1 (`pt`)** |
| idiomas aceites (`SUPPORTED`) | `["pt","en","es"]` | **`["pt"]`** |
| detecção automática de idioma | `navigator.language` | **removida** |
| selector de idioma na UI | `<select>` pt/en/es | **removido** |
| chaves no dicionário | 129 | **127** (+2 mortas apagadas) |
| ficha da Play | 3 idiomas (9 campos) | **PT-BR (3 campos)** |
| testes frontend | 392/392 VERDE | **396/396 VERDE** |
| testes backend | 680/686 VERDE | **680/686 VERDE** |

Nenhuma string de UI em português foi alterada. Nenhuma capacidade do produto mudou.

## 2. A decisão PT-only (R18) e porque é a decisão certa

O MC97 mediu o que o produto entrega: **59 de 62 ficheiros de UI escrevem português
hardcoded** e **35 das 129 chaves de i18n nunca eram usadas pela UI**. O i18n era, em boa
parte, decorativo — o Sidebar escrevia «Mercado de Lances» à mão.

A contradição não era interna, era **externa**: a ficha da Play **prometia 3 idiomas** e o
app entregava 1. Um revisor que mudasse o selector em Configurações via a app continuar em
português. É uma promessa não cumprida, visível sem se procurar muito.

**Decisão do operador (R18, 27/09/2026): o DesafioGUT é PT-BR only.** Não é bloqueante — a
Google e a Apple não exigem múltiplos idiomas — e o mercado-alvo é o Brasil. Declarar um
idioma é mais honesto e mais simples do que manter três dicionários que o produto não lê.

## 3. O que foi removido

| # | onde | o que |
|---|---|---|
| 1 | `src/i18n/en.js`, `src/i18n/es.js` | **removidos** (276 linhas) |
| 2 | `src/context/IdiomaContext.jsx` | `DICTS = { pt }`, `SUPPORTED = ["pt"]`, **sem `navigator.language`**; `<html lang>` fixado a **`pt-BR`** (antes o runtime sobrescrevia o `pt-BR` do `index.html` com `pt` genérico) |
| 3 | `src/pages/Configuracoes.jsx` | card **«Preferências» removido inteiro** — o seu único conteúdo era o selector. Um card com título e corpo vazio seria pior |
| 4 | `src/i18n/pt.js` | 2 chaves mortas (`config.idioma`, `config.preferencias`) — 129 → **127** |
| 5 | 4 testes | âmbito 3-idiomas reduzido a PT; **4 asserções** que comparavam idiomas removidas |
| 6 | `docs/FICHA-PLAY-3-IDIOMAS.md` | removido (9 → 3 blocos) |
| 7 | `docs/GLOSSARIO-OFICIAL.md` | colunas EN/ES e listas de proibidos EN/ES removidas |
| 8 | `netlify/functions/_tests/mc8843-estado-edicao.test.mjs` | 2 entradas (`i18n/es.js`, `i18n/en.js`) removidas da lista de proibidos — os ficheiros deixaram de existir |

## 4. Ficha da Play simplificada (`docs/FICHA-PLAY-PT.md`)

3 campos, **todos medidos por código** (`scripts/mc97-medir-ficha.mjs`), que passou a
**recusar aprovar** se uma contagem declarada no texto divergir da medida — o defeito do
MC97 (5 de 9 campos fora do limite com um ✅ inventado ao lado).

```
OK  PT titulo: 29/30 (declarado 29)
OK  PT curta:  74/80  (declarado 74)
OK  PT longa: 1132/4000 (declarado 1132)
Ficha PT-BR: 3/3 dentro dos limites e contagens declaradas == medidas.
```

A copy PT-BR foi copiada **verbatim** da ficha anterior — não é tradução nova, é a mesma.
**Pendente para o MC101:** URL da política de privacidade, e-mail de contacto, classificação
etária (18+), capturas em PT-BR.

## 5. Testes e mutação (R16)

**Suíte:** frontend **VERDE 396/396** · backend **VERDE 680/686**.
A aritmética fecha: 392 − 4 (asserções removidas) + 8 (1 glossário + 7 pt-only) = 396.

**7 mutações, todas confirmadas a ENTRAR e todas mortas:**

| mutação | resultado |
|---|---|
| reintroduzir `src/i18n/en.js` | RED (2 testes) |
| reintroduzir o import de `i18n/en.js` | RED (1) |
| **EVASÃO E2** — dicionário `src/i18n/en.mjs` + import `.mjs` | RED (2) |
| selector na forma original (`value="en"` + «English (US)») | RED (1) |
| **EVASÃO E1** — aspas simples + «English»/«Spanish» | RED (1) |
| **EVASÃO E1b** — rótulos «Inglés»/«Español» | RED (1) |
| remover o `pt.js` | RED (8) |

**Instrumento:** `docs/FICHA-PLAY-PT.md` escrito em **CRLF** → medidor exit 0, `3/3 dentro
dos limites`, restauração byte a byte.
**Restauração:** snapshot binário, md5 idêntico nos 3 ficheiros, suíte de volta a VERDE.

## 6. Veredicto do validador independente (HARD GATE 7)

Subagente próprio em worktree próprio (`mc98-refutador`, 869 s), instruído a **TENTAR
REFUTAR**. Confirmou A1, A2, A3, A4 e A7 com medição independente
(escreveu os seus próprios medidores; 0 divergências `dict`↔fallback em 78 pares; 0 órfãs).

**Refutou-me em duas coisas — as duas reais, as duas corrigidas:**

1. **As minhas guardas eram cegas a duas evasões realistas.** O validador notou o que eu
   não vi: **`MUT2` e o detector de selector usavam a mesma forma** (`value="en"` +
   «English (US)»). Era uma mutação **circular** — media o autor, não o atacante. Provou-o:
   `<option value='en'>English</option>` e `src/i18n/en.mjs` + import davam **6/6 VERDE**.
   → **Corrigido** (aspas duplas *ou* simples; 3 grafias de rótulo com fronteiras de palavra
   medidas — sem elas «Espa» casaria `whiteSpace`/`espalhados`, 73 ocorrências, e «Ingl»
   casaria `paddingLeft`, 24; `src/i18n/` só pode conter `pt.js`, qualquer extensão). As
   duas evasões entraram na bateria (MUT1c/MUT2b/MUT2c) e são agora RED.
2. **O medidor da ficha não era reprodutível.** `exit 2` num worktree limpo, num ficheiro
   **correcto** — `core.autocrlf=true` + ausência de regra `*.md` no `.gitattributes` faz o
   `git worktree add` entregar CRLF e a regex assumia LF. → **Corrigido** no script
   (`\r?\n`) **e** na causa-raiz (`*.md text eol=lf`; medido: os `.md` já estavam LF no
   índice, logo não altera conteúdo).

> **A lição:** uma guarda tem de ser testada contra as variantes que o **atacante**
> escolheria, não contra a que o **autor** escreveu.

## 7. Produção — deploy e validação

`netlify deploy --prod --build` → exit 0, **`CDN requesting 37 files`**, *Deploy is live!*
(4m22s). Produção: `silly-stardust-ca71bc` / deploy `6ab89438c0ec03d1c39fde3c`.

**Validação do artefacto (129 chunks, 5,9 MB) — 13/13 verificações OK:**
`DICTS = {pt:i}` · `SUPPORTED = ["pt"]` · `lang="pt-BR"` · **sem** `navigator.language` ·
**sem** dicionários EN/ES · **sem** selector (nem `config.idioma`/`config.preferencias`) ·
texto PT presente. Chunks novos (`index-BL1liSYL.js`, `IdiomaContext-CT3O0B4W.js`,
`Configuracoes-Da24bBVa.js`) — é de facto outro build.

Também verificado no bundle local: nenhum vestígio de EN/ES, `lang="pt-BR"`, texto PT.

**Captura:** `_logs/capturas/MC98-PRODUCAO-CONFIGURACOES.png` — página Configurações com
Conta → Notificações → Sobre → Segurança e Transparência, **sem** card «Preferências» e
**sem** selector; sidebar e rodapé todos em português.

⚠️ **Antes/depois de produção medido:** o primeiro medidor de produção dizia «nenhum
selector» e estava **errado** — lia só o HTML inicial, e o chunk da página Configurações é
**lazy (code-split)** e não aparece lá. Corrigido para percorrer o mapa de chunks. *O
baseline pré-deploy mostrou os 3 selectores; o pós-deploy, nenhum.*

## 8. Errata de premissas do enunciado (medir antes de executar)

| premissa | medido | veredicto |
|---|---|---|
| «simplificar `src/i18n/index.js`» | **não existe**; o entry é `src/context/IdiomaContext.jsx` | ❌ falsa |
| «remover o selector de idioma (se existir)» | existe em `Configuracoes.jsx:142-164` | ✅ |
| «UM único ficheiro importa en/es» (minha, do SEG-1) | eram **dois** — havia um teste do **backend** que também lia `es.js` | ❌ **o meu âmbito estava estreito** |

## 9. Pendências

- **8 worktrees antigos** em `.claude/worktrees/` (validadores dos MC94–MC97) + 2 fora do
  repo. Não removidos: fora do âmbito do MC98. **A revisitar.**
- `Configuracoes.jsx:36` — `cardPad` é variável morta (warning de ESLint). **Pré-existente**
  (confirmado em `56f8305`), não introduzido aqui; R1 ditou não tocar.
- Herdadas: chave Alchemy por rotacionar (R5) · auto-deploy do Netlify ligado · testes do
  frontend fora do CI.
- **MC101:** colar a ficha PT-BR na Play Console (com os 4 campos em falta).

## 10. Lições aprendidas

1. **O âmbito do extractor é parte da medição.** «Procurei em `src/` e não encontrei» não é
   «não existe». O 2.º importador apareceu no backend, e só quando a suíte ficou vermelha.
2. **Um extractor cego dá um falso verde.** O 1.º medidor de produção lia só o HTML e
   declarava «sem selector» — as páginas são lazy. Correu-se o mapa de chunks.
3. **Uma guarda tem de ser testada contra as variantes do ATACANTE.** Mutação circular não
   prova nada. Foi o validador que o descobriu, não eu.
4. **Um byte NUL num `.md` pode ser o objecto do texto, não corrupção** — mas o `grep` sem
   `-a` salta as linhas a partir dele em silêncio (perdi `CLAUDE.md:1652/1905/1968/2081`).
5. **Restaurar não é desfazer: é repor.** O inverso por `.replace()` deixava um `\r\n`
   órfão — md5 diferente, ninguém dava por isso.
6. **`grep` sem fronteira de palavra inventa dependências** (`Lanc`**es.js**`x`).
7. **Um teste pode falhar por causa do ambiente, não do código:** backend sem
   `cwd=netlify/functions` + `--experimental-test-module-mocks` dá **61 falhas falsas**.
