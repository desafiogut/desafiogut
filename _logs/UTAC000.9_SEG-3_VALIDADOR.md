# VEREDICTO — validação ADVERSARIAL do commit `e1aacda` (UTAC000.9 / DEBT-008)

**Validador:** subagente independente (sessão própria)
**Data:** 2026-10-01
**Alvo:** `e1aacda` (`fix(UTAC000.9): vencedor do Dashboard — resultado oficial (DEBT-008)`), HEAD de `main`, 1 à frente de `origin/main`=`e19306e`
**Ancoragem medida:** `git log --oneline -3` → `e1aacda`, `e19306e`, `e92147b` (não se moveu durante a auditoria)
**Ambiente:** Windows 10 · git-bash/MSYS · worktree `--detach` em `C:/Users/Moltbot/tmp-utac0009-val/fe` · junctions (não cópias) para `frontend/node_modules` e `frontend/netlify/functions/node_modules`
**Regra de ouro aplicada:** tentar REFUTAR. Tudo abaixo é medido, não lido.

---

## VEREDICTO: **APROVA (com ressalvas)**

A alegação central **não foi refutada**. Medições independentes confirmam que (a) os dois sítios passam a mostrar
o vencedor OFICIAL quando ele existe, (b) sem resultado oficial o comportamento é **byte-idêntico** ao anterior,
(c) os testes discriminantes morrem no código antigo (3+3 RED) e as mutações mordem onde devem, e (d) nada mais
muda no que o utilizador vê. As ressalvas (nenhuma bloqueante) estão na secção 7.

---

## 0. Ambiente montado (e dois artefactos do MEU ambiente, declarados)

```
git worktree add --detach C:/Users/Moltbot/tmp-utac0009-val/fe e1aacda      # OK
powershell New-Item -ItemType Junction ...\fe\desafio-gut\frontend\node_modules -> repo real   # OK (505 entradas)
powershell New-Item -ItemType Junction ...\frontend\netlify\functions\node_modules -> repo real # OK (feito depois; ver §6)
```

⚠️ **Artefacto do meu ambiente #1 (não é regressão):** a 1.ª corrida da suíte deu **582 reportados / 1 ficheiro RED**
com `ERR_MODULE_NOT_FOUND: Cannot find package 'undici' imported from netlify\functions\img-proxy.mjs`. Causa: faltava
a junction do **backend**. Com a junction criada, a suíte fecha **589/589** (§6). Sem isto, os 8 subtests do
`mc9952-seguranca-gate` não corriam e o total caía a 582 — a diferença 589−582=7/8 explica-se **só** por isso.

⚠️ **Artefacto do meu ambiente #2:** as minhas sondas rodaram com `node ... /c/Users/...` e o Node no Windows
resolveu `/c/...` como drive-relativo → escreveu em `C:\c\Users\Moltbot\tmp-utac0009-val\`. Os snapshots estão lá;
os comandos abaixo usam o caminho real.

⚠️ **A suíte exige PTY.** `node --test ... | tail` e `> ficheiro` (sem pty) devolvem `stdout is not a tty` /
`stdin is not a tty` e **exit 1 sem contagens** → NÃO MEDIDO. Com `pty=true` fecha. (Já é sabido do projecto.)

---

## 1. Foco 1 — TODOS OS SÍTIOS FORAM CORRIGIDOS? (inventário independente)

Inventário PRÓPRIO, exaustivo (não confiei no do autor; grep sobre o repo principal):
```
grep -rn "vencedor\|menorUnico\|menor unico\|Menor e Único\|idxVencedor\|apurarMenor\|Menor Lance Único" \
  src/ --include=*.jsx --include=*.js --include=*.mjs | grep -v "__tests__" | grep -v "_stubs"
grep -rn "repetido" src/ ...   # p/ caçar derivações locais que não usem a palavra «vencedor»
```

**Sítios que MOSTRAM ao utilizador um vencedor derivado dos lances locais:**

| # | Sítio | Estado | Nota |
|---|---|---|---|
| 1 | `src/context/AppContext.jsx:697-700` (`vencedor` = `[...lancesExibidos].filter(!repetido).sort(valor)[0]`) | **fonte** derivada localmente | Consumida por 3 páginas; declarada pelo commit |
| 1a | `src/pages/Dashboard.jsx` (card + `FimEdicaoOverlay`) | **CORRIGIDO** | `vencedorExibido = oficial ?? vencedor` (l.90-93), usado no card (l.407-416) e no prop do overlay (l.516) |
| 1b | `src/pages/MercadoLances.jsx:69-73/157/195` (`OverlayVencedor`) | **NÃO corrigido — DECLARADO** | Usa `vencedor` local; commit declara e escala |
| 1c | `src/pages/DetalheProduto.jsx:39` (`vencedor` desestruturado do contexto) | **não usado (destructure morto)** | Só `produto.vencedor` (l.268) é mostrado — dado do servidor, não dos lances |
| 2 | `src/components/TabelaLances.jsx` 🏆 (`idxVencedor`) | **CORRIGIDO** | Casa endereço+valor do oficial; sem oficial, apuramento local |

**Conclusão do inventário:** os **dois** vencedores que o commit declara fora de escopo (o `vencedor` do
`AppContext` e o `OverlayVencedor` do `MercadoLances`) são, de facto, os **únicos dois** sítios que apresentam um
*vencedor* derivado de lances locais e não foram corrigidos. **NÃO encontrei mais nenhum.**

Sítios ADJACENTES que derivam localmente mas **não são «vencedor»** (classificação por lance, não resultado da
edição) — não entram na alegação, mas listo-os para um segundo validador:
- `src/pages/DetalheProduto.jsx:312-330` — tabela «Histórico de Lances» com selo local `ÚNICO`/`REPETIDO`
  (usa `l.repetido` do contexto; **não declarado no commit**, mas não é um vencedor).
- `src/components/meus-ativos/FeedbackLance.jsx:99-105` — «menor único **seu**» (escopo = os lances DO próprio
  utilizador; não é o vencedor da edição).
- `src/pages/MinhaCarteira.jsx:308` — idem (classificação dos lances próprios).
- `src/components/edicao-especial/*` e `src/pages/MeusAtivos.jsx` — **já usam** o resultado oficial (UTAC000.8).

---

## 2. Foco 2 — O DASHBOARD MOSTRA MESMO O VENCEDOR REAL? (casos adversariais medidos)

Sonda própria: `fe/desafio-gut/frontend/validador-adversarial.mjs` (só no MEU worktree, nunca no principal).

```
node validador-adversarial.mjs <OUT>
```

| Caso | Cenário | Resultado medido | Veredicto |
|---|---|---|---|
| **D1** | oficial `EU(300)` vs local `OUTRO(100)` (discriminante) | `mostraEU=true mostraLocal=false R$3.00=true R$1.00=false` | ✅ mostra o OFICIAL |
| **D2** | oficial com endereço em **caixa EIP-55** (via duplo) | mostra a forma EIP-55; **mas** em produção o hook real baixa a caixa → ver H1 | ⚠️ gap do ARNÊS/duplo, não da produção |
| **D3** | oficial com `valor` em **string** `"300"` | `R$ 3.00=true R$ 0.00=false` | ✅ sem mentira visível; e em produção o hook rejeita `"300"` (H2→null→fallback local) |
| **D4** | oficial existe mas `vencedor` local é `null` | card mostra o oficial | ✅ o oficial manda quando o local não existe |
| T1 | tabela: local `OUTRO(100)` vs oficial `EU(300)` | 🏆 em `0xaaaa...` | ✅ |
| T2 | tabela: oficial em EIP-55 via duplo | 0 🏆 (o duplo não normaliza) | ⚠️ gap do arnês (produção: H1→minúsculas→casa) |
| T3 | linha `valor:null` (não `oculto`) + oficial `valor:0` → tentar `Number(null)===0` | 0 🏆 | ✅ **não explorável**: a linha é descartada no render (`!oculto && valorSanitizado===null → return null`), e `i` mantém-se consistente |
| T4 | oficial casa uma linha `repetido:true` | 0 🏆 | ✅ `statusFor()` testa `repetido` antes de `isVencedor` |
| T5 | oficial: endereço na lista mas **valor diferente** | 0 🏆 | ✅ não assinala por aproximação |
| T6 | linhas blindadas (`oculto:true`) + oficial | 0 🏆 | ✅ |

**Contra-prova da normalização (o que salva a produção em D2/T2)** — hook REAL importado sem alias:
```
H1 EIP-55 -> minusculas: {"consolidado":true,"vencedor":"0xaaaa...0001","menorUnicoCentavos":300}
H2 valor string: null
H3 endereco nulo (zero): null
H4 nao consolidado: null
H5 valor 0 + vencedor valido: {"consolidado":true,"vencedor":"0xaaaa...0001","menorUnicoCentavos":0}
H6 sem valor (undefined): null
```
→ `normalizarResultadoOficial` baixa a caixa (l.53), rejeita valor não-inteiro, rejeita endereço nulo e não-consolidado.
**A produção é segura.** O que NÃO está coberto é o caminho real de normalização *através* dos componentes (os duplos devolvem
o objecto cru) — ver §7.2.

**A página mente em algum caso?** Nos casos que consegui construir, **não**. O único caso em que a página mostra um
vencedor «não-oficial» é quando o resultado oficial **não existe** (não consolidado / leitura falha / endereço nulo /
valor ilegível) — e aí mostra o local, que é exactamente o comportamento declarado.

---

## 3. Foco 3 — ALGUM TESTE FICOU VERDE POR ACIDENTE? (A/B + mutação)

**A/B (checkout do código pré-correcção):**
```
cd fe && git checkout e1aacda~1 -- .../Dashboard.jsx .../TabelaLances.jsx
```
```
Dashboard.test.mjs (código antigo):  tests 14 · pass 11 · fail 3
  ✖ com resultado oficial: o card mostra o ENDEREÇO e o VALOR oficiais
  ✖ o overlay de FIM DE LEILÃO recebe o MESMO vencedor oficial
  ✖ cablagem: o Dashboard pede o resultado da EDIÇÃO ACTIVA
utac0009-tabela-vencedor.test.mjs (código antigo):  tests 6 · pass 3 · fail 3
  ✖ com resultado oficial: o 🏆 vai para a linha do VENCEDOR OFICIAL
  ✖ o vencedor oficial AUSENTE da lista → nenhum 🏆
  ✖ cablagem: a tabela pede o resultado da EDIÇÃO recebida por prop
```
→ **batem certo com o declarado (M7 → 3 RED; M8 → 3 RED).** Nenhum teste discriminante fica verde no código antigo.
Os que ficam verdes (controlos de regressão, «mantém-se o apuramento local») devem ficar verdes nos dois lados — é o seu papel.

**Bateria de mutação (restauro por `git checkout`, âncoras com contagem assertada):**

| Mutação | RED | Leitura |
|---|---|---|
| BASE (sem mutação) | 0 | controlo do instrumento ✅ |
| MD7 Dashboard ignora o oficial (expressão inteira) | 3 testes (suíte RED) | morde ✅ |
| **MD1 — SÓ o prop do overlay volta a `vencedor` local** | **exactamente 1 teste: «o overlay de FIM DE LEILÃO recebe o MESMO vencedor oficial»** | **a suspeita do briefing é REFUTADA: o teste do overlay morde POR SI, não por arrasto do card** ✅ |
| MD8 Tabela ignora o oficial (`if (false)`) | 3 testes | morde ✅ |
| MD4 Tabela casa só por ENDEREÇO (tira o valor) | exactamente 1 teste: «o vencedor oficial AUSENTE da lista → nenhum 🏆» | morde ✅ (a comparação de valor está pinada) |
| **MD5 Tabela sem `.toLowerCase()` no lado da lista** | **0 — SOBREVIVE** | **cobertura em falta** → §7.2 |
| MEQ `Number()` extra à volta do valor oficial | 0 | equivalente declarado (não é defeito) |

⚠️ **Registo de previsão errada (skill §1.3):** eu previ que MD4 (tirar a comparação de valor) **sobreviveria** por
falta de caso discriminante. **Mediu-se o contrário:** morre no teste do «oficial ausente/valor 999». A previsão
estava errada; fica registada.

---

## 4. Foco 4 — O COMPORTAMENTO VISÍVEL MUDOU ALÉM DO VENCEDOR? (GATE 18)

**A) Sem resultado oficial — o HTML é BYTE-IDÊNTICO ao código anterior:**
```
diff snap-head/dash-null.html snap-old/dash-null.html   # idêntico
diff snap-head/tab-null.html  snap-old/tab-null.html    # idêntico
md5sum: dash-null  211f0e85657765ff6a4083b7b725164e  (HEAD == pré-fix)
        tab-null   7dbb7c9f9fffefc2ba87805d859446a8  (HEAD == pré-fix)
```
→ **Página inteira do Dashboard e a Tabela renderizam exactamente o mesmo** com o resultado em falta.

**B) Controlo negativo (o oficial TEM de mudar algo):** `dash-oficial.html` ≠ `dash-null.html` ✅ (senão o instrumento estava cego).

**C) Delta com resultado oficial (truncado ao essencial):**
- Dashboard: só muda a linha do card — `0xbbbb0000...000002`→`0xaaaa0000...000001` e `R$ 1.00`→`R$ 3.00`.
  **Inalterados**: «Saldo (R$) —», «Senhas —», «Lances Únicos 0», «Total de Lances 0», «EM BREVE»,
  «⚡ Relâmpago», «Aguardando abertura», «🏆 Menor Lance Único», «🔄 Liderando — pode ser superado», todos os
  botões e o footer.
- Tabela: só a linha do 🏆 troca de posição (o `#` da linha vencedora passa a «🏆» e o índice da outra ajusta-se).
  **Nada mais muda**: «🕒 Em breve», «🔒 valores ocultos até o fim», colunas, «🔒» nos valores, footer.

→ **GATE 18 cumprido: nada muda excepto o vencedor.**

---

## 5. Foco 5 — DEPENDÊNCIA NOVA?

```
git show --stat e1aacda -- '*/package.json' '*/package-lock.json'   # VAZIO
git diff --stat HEAD -- desafio-gut/frontend/package.json           # VAZIO
```
- `package.json` e `package-lock.json` **intocados** pelo commit. (A árvore principal tem ` M package-lock.json`
  **pré-existente**, de outra sessão — não é do commit.)
- Imports novos: apenas `../hooks/useResultadoOficial.js` (UTAC000.8, já em produção) e os duplos de teste.
- O duplo `dompurify` **substitui** uma dependência já declarada (`"dompurify": "^3.4.11"`), não acrescenta nenhuma.
→ **Zero dependências novas.** ✅

**A nota de ambiente do `dompurify` é honesta (medida).** Desliguei o alias e o teste morre com **exactamente** o
erro declarado:
```
TypeError: __vite_ssr_import_0__.default.sanitize is not a function
    at sanitizeString (src/utils/sanitize.js:16:40)
```
O `sanitize.js` REAL corre (só `DOMPurify` é trocado por um removedor de etiquetas — o mesmo que
`sanitizeString` faz com `{ALLOWED_TAGS:[],ALLOWED_ATTR:[]}`). E o 🏆 não depende de DOMPurify: usa
`sanitizeAddress`, que é **regex pura** (`/^0x[0-9a-fA-F]{40}$/`), sem DOMPurify. → **Não é contaminação do teste.**

---

## 6. Foco 6 — REGRESSÃO

```
node --test --test-concurrency=1 $(find src -name '*.test.mjs' -not -path '*/node_modules/*')   # com pty
ℹ tests 589 · suites 36 · pass 589 · fail 0     EXIT=0
```
- **589/589, exit 0** — igual ao declarado (era 579/579).
- Aritmética fechada: 579 + 4 (Dashboard) + 6 (novo ficheiro) = **589**.
- Ficheiros-alvo isolados: `Dashboard.test.mjs` **14/14**; `utac0009-tabela-vencedor.test.mjs` **6/6**.
- **Nenhum teste pré-existente mudou de estado** (a suíte passa integralmente; ver artefacto do ambiente em §0).
- Worktree restaurado e conferido: `git diff --stat e1aacda -- <2 ficheiros de produção>` = **VAZIO** (idênticos ao commit).
- Árvore PRINCIPAL intocada pelo validador (nenhum `git add`, nenhum commit, nenhum push). Só a `package-lock.json`
  pré-existente de outra sessão lá continua — declarada, não tocada.

---

## 7. Contra-exemplos / ressalvas (não bloqueiam o push)

**7.1 ℹ️ «zero I/O novo» é impreciso (a alegação, não o código).** O hook faz **1 leitura no mount + 1 a cada 60 s**
(até consolidar). Pré-correcção, NENHUMA destas páginas usava o hook:
```
git show e1aacda~1:.../Dashboard.jsx    | grep -c useResultadoOficial   -> 0
git show e1aacda~1:.../TabelaLances.jsx | grep -c useResultadoOficial   -> 0
```
→ há **I/O on-chain NOVO** no Dashboard e no Mercado de Lances (read-only, fail-soft, sem dependência nova, sem
mecanismo novo). O que é verdade é «zero **mecanismo** de I/O novo / zero I/O **novo em espécie**». Recomendo
corrigir a frase no registo do UTAC: «reutiliza o hook; acrescenta 1 leitura on-chain por página (mount + 60 s)».

**7.2 ℹ️ `.toLowerCase()` do lado da lista é load-bearing e NÃO está pinado por teste.**
MD5 (tirá-lo) **sobrevive aos 6 testes**. E é load-bearing: os lances vêm de
`subscribeLanceDado` → `contrato.on("LanceDado", …)` (ethers v6), que devolve endereços **em caixa EIP-55
(checksum)**; `endereco: lancador` (`src/utils/web3.js:223`) leva essa caixa para a lista. O código compara
`String(l.endereco).toLowerCase() === resultadoOficial.vencedor` — só normaliza UM lado, confiando que o hook
normaliza o outro (confirma-se: H1). Se o hook deixar de baixar a caixa, a tabela perde o 🏆 **em silêncio**.
→ **Cobertura em falta** (não defeito). Teste sugerido (trivial): lista com endereço em caixa EIP-55 + oficial em
minúsculas → 🏆 na linha certa.

**7.3 ℹ️ O resíduo declarado é agora VISIVELMENTE divergente.** `OverlayVencedor` (MercadoLances) continua a mostrar
o vencedor local; ambos os overlays (Dashboard `FimEdicaoOverlay` e Mercado `OverlayVencedor`) são gated pelo
**mesmo** `showOverlay` do contexto. Logo, no mesmo instante, o utilizador pode ver o **oficial** no overlay do
Dashboard e o **local** no overlay do Mercado de Lances. É o UTAC de seguimento; aqui só registo que a
incoerência ficou mais visível. **Fora do escopo autorizado — não corrigir aqui.**

**7.4 ℹ️ Sítios adjacentes que derivam localmente e NÃO foram declarados** (mas não são «vencedor»):
`DetalheProduto.jsx` (selos `ÚNICO`/`REPETIDO` do histórico de lances) e `FeedbackLance.jsx` («menor único
**seu**»). Não contradizem a alegação (que fala de *vencedor*), mas são «derivações locais mostradas ao
utilizador». Bónus: `DetalheProduto.jsx:39` desestrutura `vencedor` do contexto e **nunca o usa** (destructure morto).

**7.5 ℹ️ Tensão rótulo↔valor (edge, baixa probabilidade).** Se `resultados()` estiver consolidado mas
`estAtiva.encerrada` ainda for `false`, o card mostra o vencedor **final** oficial rotulado
«🔄 Liderando — pode ser superado». Exige consolidação **antes** do fecho na noção da UI; improvável, mas é uma
incoerência de rótulo (o rótulo vem de `estAtiva`, intocado por este commit).

**7.6 ℹ️ `menorUnicoCentavos: 0` é aceite pelo hook** (H5) e o código usa `Number(l?.valor)`, com
`Number(null)===0`. Medido (T3): **não explorável** — linhas `valor:null` sem `oculto` são descartadas no render e
os índices mantêm-se consistentes. Mesmo assim, é o padrão de armadilha que o projecto já pagou uma vez
(MC93-A / comentário explícito no `FeedbackLance.jsx`). Guarda defensiva sugerida: exigir `l?.valor != null`.

---

## 8. O que um SEGUNDO validador deveria tentar a seguir

1. **Cobertura do `.toLowerCase()` (§7.2):** escrever o teste com endereço em caixa EIP-55 na LISTA (hoje todos os
   fixtures são minúsculos) e confirmar que morde. É a única linha load-bearing sem mutante.
2. **Caminho real de normalização através dos componentes:** os duplos devolvem o objecto CRU — nenhum teste
   passa pelo `normalizarResultadoOficial` real com um componente. Ligar o hook real (com `lerResultado` injectado
   a devolver um resultado cru, incluindo endereço EIP-55 / valor string) e medir o 🏆 e o card. Isto fecha T2/D2/H*.
3. **Transições do hook (skill §1.8):** apesar de o hook ser do UTAC000.8, verificar num COMPONENTE que a troca de
   `EDICAO_ATIVA` (A→B com leitura a falhar / pendente / vazia) não deixa o vencedor de A. O teste «cablagem»
   só verifica o argumento pedido, não a transição.
4. **Modalidade FLASH:** confirmar que, em flash (`lancesExibidos = lancesFlash`, off-chain, endereços do servidor),
   a caixa dos endereços casa com o `vencedor` minúsculo do hook — *é aqui que uma caixa EIP-55 servida pelo blob
   poderia partir o 🏆* (não medido por mim: não construí um blob real).
5. **Leitura on-chain real:** confirmar em produção que o provider read-only do `lerResultadoOnchain` responde
   `resultados(EDICAO_ATIVA)` sem carteira/sessão na página do Dashboard (o hook é o do UTAC000.8, mas a montagem
   em duas páginas novas é nova) e medir a latência/erros 429 do endpoint RPC com 2 páginas a ler de 60 em 60 s.
6. **Rever a alegação «zero I/O novo»** no registo do UTAC (§7.1) — ou corrigi-la, ou justificá-la como
   «zero I/O de espécie nova».

---

## 9. Resumo executivo

**Veredicto: APROVA (com ressalvas).**

**2-3 descobertas principais:**
1. **A alegação central resiste a todas as tentativas de refutação.** GATE 18 provado por bytes: com resultado
   oficial ausente, o HTML do Dashboard e da Tabela é **idêntico** (md5 iguais) ao código anterior; com resultado
   presente, só muda o vencedor. A/B 3+3 RED e as mutações mordem exactamente onde devem — incluindo **MD1, que
   derruba a suspeita do briefing**: o teste do overlay morre sozinho quando se muta **só** o prop do overlay.
2. **Uma linha load-bearing sem mutante que a mate:** o `.toLowerCase()` do lado da lista (MD5 sobrevive), e é
   load-bearing porque o ethers v6 entrega endereços em caixa EIP-55. É cobertura em falta, não defeito.
3. **Duas imprecisões de alegação, nenhuma de código:** «zero I/O novo» (há 1 leitura on-chain por página, mount +
   60 s, em duas páginas que antes não liam nada) e o resíduo declarado do `OverlayVencedor` do Mercado de Lances,
   que fica **visivelmente divergente** do overlay do Dashboard (mesmo `showOverlay`).

**Exige correcção antes do push?** **NÃO.** Nada bloqueia: não há dependência nova, `package.json` intocado, suíte
**589/589 exit 0**, sem regressões, e o comportamento visível mudou só no vencedor. Recomenda-se como seguimento
(não bloqueante): (a) acrescentar o teste do endereço em caixa EIP-55 (§7.2) e (b) corrigir a frase «zero I/O novo»
no registo do UTAC (§7.1).


---

# RESPOSTA DO EXECUTOR AO VEREDICTO — 2026-10-02

**Veredicto recebido: APROVA (com ressalvas).** A alegação central não foi refutada e o inventário
independente **confirmou** que os dois sítios declarados fora de escopo são os únicos. As ressalvas
foram tratadas uma a uma — duas delas eram **lacunas reais** e foram fechadas com medição.

## §7.1 «zero I/O novo» é impreciso → **CORRIGIDO no registo**
O validador tem razão: o hook faz **1 leitura on-chain por página** (mount + 60 s até consolidar), e
o Dashboard e a TabelaLances não o usavam antes (`git show e1aacda~1:… | grep -c useResultadoOficial`
→ 0 em ambos, medido por ele). O que é verdade é «**zero mecanismo/dependência nova**». O registo
(`_logs/DEBT.md`, `CLAUDE.md`, relatório) passa a dizer: *reutiliza o hook; acrescenta 1 leitura
on-chain read-only por página (mount + 60 s), fail-soft*.

## §7.2 o `toLowerCase()` da lista é load-bearing e não estava pinado → **FECHADO**
Era o achado mais útil: o mutante que retirava o `toLowerCase()` **sobrevivia aos 6 testes**, e a
linha é load-bearing (os lances chegam por `contrato.on("LanceDado", …)` do ethers v6, que devolve
endereços em caixa **EIP-55**). Fiz o teste que ele sugeriu — **lista com endereço EIP-55 + oficial
em minúsculas → o 🏆 na linha certa** — e a mutação **M9** (retirar o `toLowerCase()` da lista)
passa a dar **1 RED**. Nota de honestidade: a 1.ª versão do meu teste **falhou por bug do MEU
instrumento** (o regex do helper só casava `[0-9a-f]`, minúsculas) e a 2.ª por **expectativa minha
errada** (`enderecosVencedores` conta o selo, 1 por linha, não 2) — ambos corrigidos e declarados.

## §7.6 `Number(null) === 0` → **GUARDA ADICIONADA**
`l?.valor != null` explícito na comparação (uma linha sem valor não casa um oficial de valor 0).
Ele mediu que **não** era explorável; a guarda é uma linha, torna a comparação estrita e mata a
armadilha que o projecto já pagou (MC93-A). Teste novo: «linha SEM valor (null) não casa um oficial
de valor 0».

## §7.3/§7.4/§7.5 — **DECLARADAS, não corrigidas (fora do escopo)**
- **§7.3** o `OverlayVencedor` do MercadoLances continua a mostrar o vencedor local e ambos os
  overlays são gated pelo **mesmo** `showOverlay` → no mesmo instante pode ver-se o **oficial** no
  overlay do Dashboard e o **local** no do Mercado. É a **DEBT-009**; fica declarado que a
  incoerência ficou **mais visível** por causa desta correcção.
- **§7.4** sítios adjacentes que derivam localmente e **não** são «vencedor» (selos `ÚNICO`/`REPETIDO`
  do histórico em `DetalheProduto.jsx`, «menor único **seu**» em `FeedbackLance.jsx`/`MinhaCarteira.jsx`):
  ficam declarados aqui para o próximo UTAC.
- **§7.5** tensão rótulo↔valor (consolidado antes do fecho → «🔄 Liderando» num vencedor final):
  o rótulo vem de `estAtiva`, **intocado** por este commit; improvável e fora do escopo.

## Estado final depois de fechar as ressalvas
`frontend: VERDE 591/591` (era 589) · `backend: VERDE 967/973` · **3 mutantes mordem** neste sítio
(M7 3 RED · M8 3 RED · **M9 1 RED**), todos restaurados com **md5 idêntico**. O validador declarou
os seus próprios artefactos (1 falso vermelho por falta da junction do **backend**, 2 sondas escritas
em `C:\c\Users\…` por caminho drive-relativo, e que a suíte exige PTY) — crédito e limites no
próprio veredicto.
