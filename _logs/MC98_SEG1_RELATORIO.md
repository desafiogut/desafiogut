# MC98 · SEG1 — LIMPAR TESTES E DOCS (relatório)

---

## 1.1 — Testes de 3 idiomas

Regra aplicada (do enunciado): *se o teste verifica consistência entre 3 idiomas, remover;
se verifica só PT, manter.* Foram removidas **4 asserções** e reduzido o âmbito de 6 testes.

| ficheiro | asserção | destino |
|---|---|---|
| `src/i18n/__tests__/glossario.test.mjs` | «as 3 linguas tem as MESMAS CHAVES (consistencia entre idiomas)» | ❌ **removida** |
| `src/i18n/__tests__/glossario.test.mjs` | «IDIOMA: um valor em EN/ES nao pode conter marcadores de portugues» | ❌ **removida** |
| `src/i18n/__tests__/glossario.test.mjs` | listas `PROIBIDOS.en/es` e `OBRIGATORIOS.en/es` | ❌ **removidas** |
| `src/i18n/__tests__/ativos-i18n.test.mjs` | «os três idiomas têm exactamente o mesmo conjunto de chaves» | ❌ **removida** |
| `src/i18n/__tests__/ativos-i18n.test.mjs` | `IDIOMAS` de 3 → 1 | reduzido |
| `src/components/edicao-especial/__tests__/especial-i18n.test.mjs` | «en e es têm todas as chaves, traduzidas» | ❌ **removida** |
| `src/components/edicao-especial/__tests__/especial-i18n.test.mjs` | laço `["pt","en","es"]` → `["pt"]` | reduzido |

**Mantida toda a inteligência que continua a ter objecto:**
pt == fallbacks (os testes de componente renderizam com o FALLBACK — uma divergência faz a
suíte medir um texto e o utilizador ler outro), zero chaves órfãs, zero valores vazios,
zero «saldo» no dicionário, zero promessa de bónus que só o backend pode fazer, e o
glossário PT (sem «leilão/aposta/sorte/azar/loteria», com «senha» e não «token»).

**Novo:** `src/i18n/__tests__/pt-only.test.mjs` — 6 guardas da declaração PT-only
(ver SEG2 para as mutações que as provam).

### ⛔ A correcção que só apareceu na 4.ª medição

`netlify/functions/_tests/mc8843-estado-edicao.test.mjs` (teste do **backend**, MC88.43)
também lia `src/i18n/es.js` e `en.js` — numa lista de padrões proibidos que guardava o B3/B4
(o mesmo cartão a dizer «Encerrada» + «EM BREVE»). A suíte do backend passou de
**680/686 VERDE** a **1 falha** por causa disso.

Corrigido: as duas entradas `i18n/es.js` («Ediciones en Curso») e `i18n/en.js`
(«Other Editions Running») foram removidas da lista, **com o comentário registado**, e a
entrada `i18n/pt.js` (`/Outras Edições em Andamento/`) **ficou** — é a guarda que interessa,
porque é a única língua que o produto pode ler. Backend de volta a **680/686 VERDE**.

**Causa-raiz:** o varrimento do SEG-1 tinha âmbito estreito. Não foi o teste que estava mal
— foi a medição que não olhou para lá.

## 1.2 — `docs/FICHA-PLAY-PT.md` (novo)

- Secção PT-BR copiada **verbatim** da ficha anterior (3 blocos: título, descrição curta,
  descrição longa). Nenhuma copy foi reescrita.
- Nova secção «Porquê PT-BR apenas»: a decisão do operador (R18, 27/09/2026) com os números
  que a sustentam (59/62 ficheiros em PT hardcoded; 35 das 129 chaves de i18n mortas).
- Nota do MC98: as secções EN/ES saíram **porque a promessa saiu**, não porque a tradução
  fosse má. Os três campos que ficam são os que já existiam.
- Contagens **medidas**, não escritas: 29/30, 74/80, 1132/4000.

## 1.3 — `docs/FICHA-PLAY-3-IDIOMAS.md` removido

`git rm docs/FICHA-PLAY-3-IDIOMAS.md` (5586 bytes, 9 blocos → 3).

⚠️ **Dependência tratada antes de apagar:** `scripts/mc97-medir-ficha.mjs` lia este ficheiro
e exigia **9** blocos. Apagá-lo sem tocar no script deixaria o medidor de ficha **quebrado**
— e a regra da série é que a ficha é **medida**, nunca contada à mão. Reapontado no mesmo MC.

## 1.4 — `scripts/mc97-medir-ficha.mjs` (não previsto no enunciado; feito por necessidade)

| antes | depois |
|---|---|
| lia `FICHA-PLAY-3-IDIOMAS.md`, exigia 9 blocos | lê `FICHA-PLAY-PT.md`, exige 3 blocos |
| validava só os limites | validava os limites **+** que a contagem **declarada** no texto («**29 caracteres**») seja igual à **medida** |
| — | **guarda nova:** recusa se a ficha voltar a ter uma secção EN/ES ou copy «English (US)»/«Español» |

A guarda da contagem declarada fecha o defeito do MC97 (a 1.ª ficha tinha 5 dos 9 campos a
exceder o limite, com um ✅ inventado ao lado). Saída actual:

```
OK    PT titulo: 29/30 (declarado 29)
OK    PT curta: 74/80 (declarado 74)
OK    PT longa: 1132/4000 (declarado 1132)
Ficha PT-BR: 3/3 campos dentro dos limites da Play Console e contagens declaradas == medidas.
```

## 1.5 — `docs/GLOSSARIO-OFICIAL.md` (só PT)

Tabela de 3 colunas → **1 coluna** (termo + razão). Listas de proibidos de EN e ES
removidas; a lista PT ficou. Nova secção «O que o MC98 mudou aqui» que **regista** as
traduções que existiam (Senha → *Token* em EN/ES, para não evocar «ficha» de casino nem
«password» de credencial de conta) — como **nota histórica de decisão**, não como fonte de
tradução. Um glossário que regula traduções inexistentes é documentação a mentir sobre o
produto.

## 1.6 — Veredicto

**SEG1 cumprido.** 4 asserções de 3 idiomas removidas, 7 mantidas com âmbito PT, 1 ficheiro
de teste novo, 2 docs criados/actualizados, 1 removido, 1 script reapontado e endurecido.
Frontend **VERDE 395/395** · backend **VERDE 680/686**.
