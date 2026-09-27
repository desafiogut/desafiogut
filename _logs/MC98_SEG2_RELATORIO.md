# MC98 · SEG2 — PROVA DE MUTAÇÃO (R16)

Script: `_tmp/mc98/seg2-mutacao.mjs` · Saída bruta: `_logs/MC98_SEG2_MUTACAO.txt`
Regra aplicada: **confirmar que o mutante ENTROU antes de ler o resultado.** Sem isso, um
mutante que não se aplicou «sobrevive» e o verde lê-se como guarda boa.

---

## As 4 mutações

| # | mutação | mutante entrou | veredicto | teste que a matou |
|---|---|---|---|---|
| MUT1 | recriar `src/i18n/en.js` | **SIM** | **RED** (exit 1) | «MC98 — o dicionario PT e o UNICO (en.js/es.js nao voltaram)» + «MC98 · a pasta i18n tem UM só dicionário: pt.js» |
| MUT1b | acrescentar `import en from "../i18n/en.js";` ao `IdiomaContext.jsx` | **SIM** | **RED** (exit 1) | «MC98 · nenhum ficheiro do produto importa i18n/en.js nem i18n/es.js» |
| MUT2 | acrescentar `<option value="en">English (US)</option>` à UI | **SIM** | **RED** (exit 1) | «MC98 · nenhum selector de idioma na UI do produto» |
| MUT3 | renomear `src/i18n/pt.js` (remover o único dicionário) | **SIM** | **RED** (exit 1) | 8 testes: as 6 asserções do glossário + «a pasta i18n tem UM só dicionário» + «o dicionário PT existe e não está vazio» |

Suítes por mutação: 13 testes (6 `pt-only` + 7 `glossario`).
MUT1: `tests=13 pass=11 fail=2` · MUT1b: `13/12/1` · MUT2: `13/12/1` · MUT3: `13/5/8`.

**4 mutações aplicadas, 4 mutantes confirmados a entrar, 4 mortos.** Nenhuma guarda é vácuac.

## Restauração

| ficheiro | md5 antes | md5 depois | |
|---|---|---|---|
| `src/context/IdiomaContext.jsx` | `fb7e0752da665f6e384ebe790f83ed2e` | igual | ✅ |
| `src/pages/Configuracoes.jsx` | `90e3955bc43357ab2c2905b432468f8e` | igual | ✅ |
| `src/i18n/pt.js` | `2b3c45d2df0ec83bff69adaca514cf6e` | igual | ✅ |

Lixo removido (`en.js`, `pt.js.mutado`): **SIM**. Suíte alvo depois de restaurar:
**VERDE 13/13**. Veredicto do script: `TODAS AS MUTACOES PROVADAS + RESTAURACAO EXACTA`.

### ⚠️ O defeito que eu escrevi no restaurador (e a lição)

A 1.ª versão do restaurador desfazia cada mutação com um `.replace()` inverso. Para o MUT2
o inverso era `/\r?\n?<select…>/ → ""`, que não consumia o `\r\n` que eu tinha **acrescentado
depois** do `</select>` — ficava um `\r\n` órfão e o ficheiro mudava de conteúdo **sem que
nada o denunciasse a não ser o md5**. Reescrito: **snapshot binário**, restauração por
reposição dos bytes originais. *Restaurar não é desfazer: é repor.*

## Controlos positivos (o extractor não é cego)

O `pt-only.test.mjs` inclui dois controlos que impedem o falso verde por vacuidade
— a classe de defeito do MC96.3 («um extractor cego faz um teste vacuoso»):

1. o detector de selector tem de **casar** um fixture que sabemos ter selector
   (`<option value="en">English (US)</option>`) e **não** casar `<option value="email">` nem
   `<option value="especifico">` — as fronteiras do valor têm de ser exactas;
2. o varrimento tem de visitar **≥ 30 ficheiros** de produto, senão «0 ocorrências» pode ser
   «0 olhares».

## ⚠️ E o escape file-vs-value, ao contrário

O guarda do MC97 falhava porque media o **ficheiro** e o **comentário** mantinha a frase. Aqui
o risco era o inverso: o código novo **fala** de `en.js`, `es.js` e `navigator.language` nos
seus próprios comentários explicativos. Um grep cru devolveria RED a um ficheiro **correcto**
— uma guarda que grita no sítio errado, e que a primeira tentativa de escrita deste MC
**produziu** (o comentário do `Configuracoes.jsx` continha a palavra `setLang` e a minha
própria asserção reprovou-o). Solução: `semComentarios()` antes de qualquer asserção sobre
código, com a limitação documentada (não remove comentários no fim da linha).
