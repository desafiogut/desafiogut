# MC98 · SEG-1 — DIAGNÓSTICO (dependências de `en.js`/`es.js`)

Base: commit `56f8305` (MC97 fechado). Data: 2026-09-27.
Suíte baseline medida (harness 3 estados): **frontend VERDE 392/392 · backend VERDE 680/686**.

---

## 0. ERRATA DE PREMISSAS (medido antes de executar — HARD GATE 1/2)

| premissa do enunciado | medição | veredicto |
|---|---|---|
| «Simplificar `src/i18n/index.js`» (SEG0.3) | **`src/i18n/index.js` NÃO EXISTE.** `ls src/i18n/` = `pt.js, en.js, es.js, __tests__/` | ❌ **FALSA** — o *entry-point* real é `src/context/IdiomaContext.jsx` |
| «Remover selector de idioma (se existir)» | **EXISTE**: `src/pages/Configuracoes.jsx:142-164` (`<select>` com pt/en/es) | ✅ verdadeira |
| «59 de 62 ficheiros de UI usam PT hardcoded» | não re-medido neste MC (fora de âmbito); o consumidor real do i18n é **3 páginas** | parcialmente confirmada |
| «35 de 129 chaves i18n mortas» | não re-medido (fora de âmbito) | não verificada |

### ⚠️ ARMADILHA DE MEDIÇÃO (a lição do MC96.3, outra vez)

O primeiro `grep -r "es\.js"` devolveu **dezenas de falsos positivos** — porque
`Lanc`**`es.js`**`x` contém a sub-cadeia `es.js`. Um extractor sem fronteira de palavra
«encontra» dependências que não existem e é exactamente o defeito que o MC96.3 apanhou.
Medição refeita com fronteira:
`grep -rnE "(^|[^A-Za-z])en\.js([^A-Za-z]|$)|(^|[^A-Za-z])es\.js([^A-Za-z]|$)"`.

---

## 1.1 — Dependências de `en.js` / `es.js`

**Resultado: UM único ficheiro importa.** Zero dependências indirectas.

| ficheiro | linha | import |
|---|---|---|
| `src/context/IdiomaContext.jsx` | 6 | `import en from "../i18n/en.js";` |
| `src/context/IdiomaContext.jsx` | 7 | `import es from "../i18n/es.js";` |

Restantes ocorrências da busca precisa: **só um comentário** em
`src/i18n/__tests__/glossario.test.mjs:51` (texto explicativo, não código).

`src/i18n/en.js` e `es.js` nunca são importados por nenhum outro módulo, página,
componente, script ou `index.html`.

---

## 1.2 — Selector de idioma (EXISTE)

`src/pages/Configuracoes.jsx`, card «Preferências», linhas **142-164**:

```jsx
<span ...>{t("config.idioma")}</span>
<select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t("config.idioma")}>
  <option value="pt">🇧🇷 Português (Brasil)</option>
  <option value="en">🇺🇸 English (US)</option>
  <option value="es">🇪🇸 Español</option>
</select>
```

Como funciona (medido em `src/context/IdiomaContext.jsx`):

| mecanismo | linha | efeito |
|---|---|---|
| `useState(() => normalize(localStorage.getItem("gut_lang") \|\| navigator.language))` | 22-28 | **detecção automática** do idioma do browser no 1.º arranque |
| `useEffect` → `document.documentElement.lang = lang` | 30-32 | muda o atributo `lang` do `<html>` |
| `setLang` → `localStorage.setItem("gut_lang", n)` | 34-38 | persiste a escolha |
| `SUPPORTED = ["pt","en","es"]` | 10 | `normalize()` só aceita estes |

Consumidores de `useIdioma()` / `useT()`:

| ficheiro | uso |
|---|---|
| `src/App.jsx:16,422,509` | monta `<IdiomaProvider>` (aninhado em `AppProvider`) |
| `src/pages/Configuracoes.jsx:21` | `{ lang, setLang, t }` — **o selector** |
| `src/pages/Dashboard.jsx:21,79` | `useT()` — só tradução |
| `src/pages/MeusAtivos.jsx:6,38` | `useT()` — só tradução |
| `src/pages/__tests__/_stubs/IdiomaContext.jsx` | duplo de teste (já devolve `SUPPORTED: ["pt"]`) |

**Só `Configuracoes.jsx` usa `lang`/`setLang`.** As outras duas páginas usam apenas `t`.

---

## 1.3 — Testes que verificam 3 idiomas

Três ficheiros. Os restantes que apareceram numa busca larga
(`vocabularioUI.test.mjs`, `citacoesRegulamento.test.mjs`) foram **falsos positivos**
(mencionam `MercadoLances.jsx`/`Configuracoes.jsx`, não o i18n).

### (a) `src/i18n/__tests__/glossario.test.mjs` (7 testes — MC97)
| teste | âmbito | destino |
|---|---|---|
| «os 3 dicionarios sao legiveis e nao vazios» | 3 idiomas | → só PT |
| «NENHUM idioma tem termos proibidos» | 3 idiomas | → só PT |
| «os termos OBRIGATORIOS do glossario estao presentes» | 3 idiomas | → só PT |
| «as 3 linguas tem as MESMAS CHAVES» | **3 idiomas (consistência)** | ❌ **remover** |
| «nenhum valor esta VAZIO» | 3 idiomas | → só PT |
| «IDIOMA: um valor em EN/ES nao pode conter marcadores de pt» | **EN/ES** | ❌ **remover** |
| «os termos obrigatorios sao medidos sobre os VALORES» | 3 idiomas | → só PT |
| «PT respeita o proprio glossario» | PT | manter |

### (b) `src/i18n/__tests__/ativos-i18n.test.mjs` (MC94 · 6 testes)
`const IDIOMAS = ["pt","en","es"]`. Testes puramente PT: «o dicionário pt é IGUAL aos
fallbacks», «a copy portuguesa é pt-BR». Testes com âmbito 3 idiomas: «não há chaves
órfãs», «não há chaves em falta», «os três idiomas têm exactamente o mesmo conjunto de
chaves» (**consistência → remover**), «nenhum idioma promete bónus», «'saldo' não entra
em nenhum idioma». → **manter a inteligência, reduzir `IDIOMAS` a `["pt"]`**.

### (c) `src/components/edicao-especial/__tests__/especial-i18n.test.mjs` (MC94.2 · 4 testes)
`test("en e es têm todas as chaves, traduzidas")` → ❌ **remover** (é EN/ES).
`test("nenhuma chave órfã nos dicionários")` percorre 3 → reduzir a PT.
Os outros dois (controlo positivo, pt == fallback) mantêm-se.

---

## 1.4 — Mecanismo de fallback

`IdiomaContext.jsx:41-44`:

```js
const t = useCallback((key, fallback) => {
  const dict = DICTS[lang] || pt;
  return dict[key] ?? pt[key] ?? fallback ?? key;
}, [lang]);
```

**Se `en.js`/`es.js` desaparecerem**, `DICTS[lang]` fica `undefined` e o `|| pt`
apanha — o app **não quebra**, cai em PT. Mas `normalize()` continuaria a aceitar
`"en"`/`"es"` (via `SUPPORTED`) e `localStorage.gut_lang` poderia trazer um valor
antigo → estado inconsistente («lang=en» com dicionário PT).

**Conclusão:** o fallback protege (R1), mas a simplificação tem de **fechar**
`SUPPORTED` a `["pt"]` e remover o `navigator.language`, para o estado deixar de
poder divergir do que existe. Não chega apagar ficheiros.

---

## 1.5 — VEREDITO DO SEG-1

**SEGUIR** — com dois ajustes ao plano do enunciado:

1. `src/i18n/index.js` não existe; o alvo real é `src/context/IdiomaContext.jsx`.
2. `scripts/mc97-medir-ficha.mjs` lê `docs/FICHA-PLAY-3-IDIOMAS.md` (espera **9** blocos).
   Apagar a ficha sem tocar no script deixa um medidor de ficha **quebrado** — e a
   regra da série é que a ficha é *medida*, nunca contada à mão. O script será
   reapontado para `docs/FICHA-PLAY-PT.md` (**3** blocos) no mesmo MC.

Risco residual: baixo. Um único importador, um único selector, três testes com âmbito
3-idiomas. Nenhum caminho de dados, contrato, RAG ou regulamento é tocado.
