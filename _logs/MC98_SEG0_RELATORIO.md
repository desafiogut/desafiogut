# MC98 · SEG0 — SIMPLIFICAR O i18n (relatório)

Base: `56f8305`. Executado por script (`_tmp/mc98/seg0-editar.mjs`), ficheiro por ficheiro,
com asserções de entrada e saída — **não à mão**. Os `.jsx` foram escritos em CRLF (o
projecto é CRLF nesses ficheiros) e os `.js`/`.mjs` em LF (`*.js text eol=lf`).

---

## 0.1 — Redireccionar imports (HARD GATE 5)

Medido no SEG-1: **um único importador** de `en.js`/`es.js` — o próprio
`src/context/IdiomaContext.jsx`. Não havia nenhum outro ficheiro a apontar para os
dicionários removidos, logo não houve import a redireccionar em terceiros.

⚠️ **Correcção feita a meio do MC:** o âmbito do varrimento do SEG-1 estava estreito
(`src/` + `scripts/`) e falhou um segundo leitor — `netlify/functions/_tests/mc8843-estado-edicao.test.mjs`.
Só apareceu quando a suíte do backend ficou vermelha (4.ª medição). Ver SEG1 §1.1.
Varredura final com âmbito repo-inteiro: **3434 ficheiros varridos, zero imports reais**.

## 0.2 — `en.js` e `es.js` removidos

```
 antes:  src/i18n/{pt.js, en.js, es.js}   146 + 138 + 138 = 422 linhas
 depois: src/i18n/{pt.js}                 146 linhas
```

## 0.3 — `IdiomaContext.jsx` simplificado

O enunciado pedia para simplificar `src/i18n/index.js` — **esse ficheiro não existe**
(errata registada no SEG-1 §0). O alvo real é `src/context/IdiomaContext.jsx`.

| antes | depois | porquê |
|---|---|---|
| `DICTS = { pt, en, es }` | `DICTS = { pt }` | os outros dois ficheiros deixaram de existir |
| `SUPPORTED = ["pt","en","es"]` | `SUPPORTED = ["pt"]` | com o fallback `\|\| pt`, uma instalação com `gut_lang=en` ficava com `lang="en"` **e** dicionário PT — estado inconsistente que o fallback escondia |
| `normalize(localStorage.getItem(KEY) \|\| navigator.language)` | `normalize(localStorage.getItem(KEY))` | a detecção automática deixava o idioma do **aparelho** decidir o idioma de um app que só tem um |
| `document.documentElement.lang = lang` (`"pt"`) | `= LANG_HTML` (`"pt-BR"`) | o `index.html` diz `lang="pt-BR"` e o runtime **sobrescrevia-o** com `pt` (genérico, lê-se como pt-PT). Não havia `:lang()` nenhum no CSS (medido) |
| `return "pt"` em 3 sítios | `IDIOMA_PADRAO` | uma constante, uma fonte |

`t(key, fallback)` **mantido igual** (`dict[key] ?? pt[key] ?? fallback ?? key`) — é o que
faz a UI continuar a funcionar sem lhe tocar (HARD GATE 3).

## 0.4 — Selector de idioma removido

`src/pages/Configuracoes.jsx`, o `<select>` de pt/en/es e o card «Preferências» que o
continha. O destructure passou de `{ lang, setLang, t }` para `{ t }`.

**Decisão registada:** o card foi removido **inteiro** porque o seu único conteúdo era o
selector (o resto era um comentário histórico sobre um slider removido no MC25.3). Manter
um card «Preferências» com título e corpo vazio seria um defeito visual novo — pior do que
não ter card.

**Chaves mortas removidas** em consequência: `config.idioma` e `config.preferencias`
(129 → **127** chaves, medido). A lição do MC94 é que uma chave sem call-site é uma arma
carregada no dicionário.

## 0.5 — Suíte

| momento | frontend |
|---|---|
| baseline (antes de tocar) | **VERDE 392/392** |
| com o i18n removido e os testes por actualizar | **VERMELHO 14 falhas** (esperado, ver SEG1) |
| depois do SEG1 | **VERDE 395/395** |

As 14 falhas intermédias eram **exactamente** as previstas pelo SEG-1 §1.3: 7 em
`glossario.test.mjs`, 5 em `ativos-i18n.test.mjs`, 2 em `especial-i18n.test.mjs`
(2+5+7 = 14). O total de testes manteve-se em 392 → **nenhum outro ficheiro foi afectado**.

## 0.6 — Veredicto

**SEG0 cumprido.** O i18n passou de 3 dicionários a 1, o selector saiu, o estado deixou de
poder divergir do que existe, e nenhuma string de UI em PT foi alterada (HARD GATE 3).
