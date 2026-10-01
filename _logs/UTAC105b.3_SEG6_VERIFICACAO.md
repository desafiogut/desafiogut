# UTAC105b.3 — SEG6 · Verificação ad-hoc e fecho (2026-10-01)

## 6.1 O script (nome único, corre UMA vez, NÃO fica no repo)
`tmp-utac105b3/verificacao-adhoc-utac105b3.mjs` — saída real em `_logs/UTAC105b.3_SEG6_saida.txt`.
Verifica, por medição: entregáveis (14) · a guarda no código **+ CONTROLRO POSITIVO** · escopo (GATE 3) ·
ramos proibidos intactos (GATE 4) · asserções do legado byte-iguais (R18-5) · R18-5 nos 3 lugares ·
suíte canónica · disco.

## 6.2 Escopo (GATE 3)
`git diff --name-only 00610b0` ∪ untracked (excl. o ruído pré-existente `_logs/MC10*`, `package-lock.json`,
`.claude/`) → **nenhum ficheiro de código fora do autorizado**. Os 3 ficheiros autorizados estão alterados.
`package-lock.json` **não** foi commitado.

## 6.3 Ramos proibidos intactos (GATE 4)
- `cotas.mjs`: **1 único hunk**, **aditivo puro (+32 / −0)**; as linhas novas vivem em **436..467**,
  muito antes do ramo `update-corporativo` (l.553) ⇒ o ramo fechado no b.1 e o POST genérico fechado no
  b.2 **não foram tocados**.
- `_tests/cotas-anti-fraude.test.mjs`: **45 asserções, byte-iguais** às do baseline.

## 6.4 CONTROLRO POSITIVO
A verificação da guarda é aplicada **também ao código do baseline** (`git show 00610b0:…`) e **tem de
FALHAR**. Falha, como deve — logo o detector **não é cego** e os verdes acima valem.

## 6.5 Resultado
```
VEREDITO AD-HOC: TUDO VERDE
```
Suíte canónica, no mesmo run: `frontend: VERDE 535/535` · `backend: VERDE 967/973` · `VEREDITO: VERDE`.

## 6.6 Erro do MEU instrumento, detectado pelo próprio controlo (6.º da série)
A **1.ª execução** do script deu **2 FALHAS em código correcto** — ambas **falsos positivos do detector**,
guardadas em `_logs/UTAC105b.3_SEG6_saida_run1_detectores-falsos.txt`:

| check | porque falhou | correcção do **detector** |
|---|---|---|
| «cotas.mjs contém a guarda» | o regex exigia `endereco_nao_corresponde` a **menos de 400 chars** do `if (…)`; as 6 linhas de comentário acrescentadas **após** o veredicto empurraram-na para lá | passou a exigir **as 3 marcas estruturais** (`if (endereco && … "admin")`, o `401 token_ausente` do ramo anónimo, o `403 endereco_nao_corresponde`) |
| «`update-corporativo` não aparece no hunk» | procurava a **string** no hunk — e ela aparece **no texto do meu próprio comentário** novo («como no `update-corporativo`») | passou a verificar a **REGIÃO** (linhas novas 436..467 &lt; 553), não a string |

**Lição (a mesma família do MC96.6):** um detector que só falha no caso errado é indistinguível de um
detector que não falha. Ambos os falsos positivos eram o detector a acusar código correcto — e é o
controlo positivo mais a re-leitura que os separam de um defeito real.

## 6.7 Fecho
Entregáveis presentes · validador lido e achados tratados · logs escritos · verificação ad-hoc VERDE
com controlo positivo · pendências **declaradas** (§9 do relatório) · `CLAUDE.md` actualizado (P5/R14) ·
commit final em foreground, ficheiros nomeados, `git log origin/main..HEAD` conferido antes do push.

## 6.8 VEREDITO DO SEG6: **FECHADO**
