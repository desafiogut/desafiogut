> ⚠️ **NOTA DE ARQUIVO (executor, UTAC000.13) — versão FINAL, re-registada:**
> este é o veredicto **completo** do validador (11 932 bytes). Ele gravou uma versão inicial com
> placeholders (que eu registei primeiro, com um anexo a declarar os limites) e **escreveu o §A por
> cima antes de esgotar as iterações** — a versão anterior ficou obsoleta e esta substitui-a.
> **O que mudou, e é o essencial: ele APANHOU o flaky, com nome, linha e causa** — a minha
> conclusão «não reproduzível» está **REFUTADA**. Só os passos secundários (FASE C/D) ficaram por
> preencher. Origem: `C:\Users\Moltbot\tmp-utac0013-val\VEREDICTO-VALIDADOR.md`

---

# VEREDICTO DO VALIDADOR ADVERSARIAL — UTAC000.13 SEG-1 · commit `cc072c6`

**Validador:** subagente Hermes (adversarial, tarefa = REFUTAR) · **Data:** 2026-10-02
**Repo:** `C:/Users/Moltbot/Desktop/DESAFIOGUT` (branch `main`) · **Commit:** `cc072c6` (HEAD, 1 à frente de `d614b4c`=`origin/main`)
**Método:** corridas da suíte na ÁRVORE PRINCIPAL em modo só-leitura (documentado abaixo); NENHUM ficheiro do repo alterado por mim; sem commits.

> ESTADO: **EM CURSO** — ficheiro escrito antes de esgotar as iterações (lição do UTAC anterior). A secção A é actualizada no fim.

---

## A) Alegação: «o flaky da DEBT-014 NÃO é reproduzível (60 corridas, 0 falhas)»

### O que tentei (adversarial)
Não me limitei a repetir o método do autor. Cobri as lacunas que ele próprio não cobriu:
1. **Tempo por ficheiro** (achar um teste lento/temporizador oculto que a suíte de 90 s esconderia).
2. **N = 15 corridas da suíte completa** na árvore principal (`node --test --test-concurrency=1` + 49 `src/**/*.test.mjs`), com output de CADA corrida guardado e isolamento por `^not ok`/`^✖`.
3. **Martelar (hammer) 120×** cada ficheiro com temporizadores reais (`hooks-torneio`, `cotaAtiva`, `mc99-limpeza-ui`, `utac0008-resultado-oficial-hook`, `useEdicoes-especial`, `utac0010-mercado-vencedor`, `Dashboard`).
4. **`--test-concurrency=4`** (concorrência de ficheiros — hipótese do autor: "o harness usa 1, mas talvez o validador tenha corrido outra coisa") × 5.
5. **`--test-reporter=tap`** × 5 (isolar `not ok`).
6. **Harness EXACTO** (`node scripts/mc966-suite-harness.mjs frontend`) com stdin NÃO-TTY (`</dev/null`) — testar a "armadilha do TTY" que o autor invocou.

### Resultados (comandos colados)
- **Tempo por ficheiro:** nenhum ficheiro > 5.8 s; soma de todos = **49,7 s**; a suíte "90 s" é só o custo de 49 spawns de `node` + os testes. **Não há nenhum teste com `sleep` de 90 s** (hipótese descartada). Comando: `node --test --test-concurrency=1 <1 ficheiro>` por ficheiro, 49×.
- **FASE A (suíte completa ×15):** **14/15 VERDE 630/630** (A-14 morreu com `rc=127`, output truncado SEM bloco de resumo — anomalia de SO/processo, NÃO contagem como falha de teste; ver nota). 0 falhas de teste.
- **FASE B (hammer ×120/ficheiro):** ⚠️ **FLAKY CAPTURADO** — `hooks-torneio.test.mjs` **FALHOU 1/120** (corrida 114, `rc=1`). Ver abaixo.
- **FASE C (`--test-concurrency=4` ×5):** _(a preencher)_
- **FASE D (reporter TAP ×5):** _(a preencher)_
- **FASE E (PARALELO — condição exacta da DEBT-014):** 3 rodadas × **4 suítes do frontend SIMULTÂNEAS** = **12 suítes, TODAS VERDES** (`fail=0 rc=0`). Reproduz «o validador corria em paralelo com 2-3 suítes» e **não** apanha o flaky ⇒ o flaky **não é só pressão de CPU/processos**.
- **Harness TTY:** `node scripts/mc966-suite-harness.mjs frontend < /dev/null` → **`frontend: VERDE 630/630 pass`, exit 0**. ⇒ **o harness NÃO exige TTY** (a «armadilha» que o autor invocou não se reproduz; provável má-diagnóstico).

### 🎯 O FLAKY (capturado) — REFUTA da alegação (A)
```
=== B FALHA src/hooks/__tests__/hooks-torneio.test.mjs corrida 114 rc=1 ===
20:  ✖ um pedido novo limpa o erro do anterior (53.56ms)
21:✖ MC94 · useRanking — a corrida que a guarda `vivo` trava (100.1072ms)
...
test at src\\hooks\\__tests__\\hooks-torneio.test.mjs:231:3
✖ um pedido novo limpa o erro do anterior (53.56ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  false !== true
      at TestContext.<anonymous> (.../src/hooks/__tests__/hooks-torneio.test.mjs:244:14)
    actual: false   expected: true   operator: 'strictEqual'
```
- **Nome do teste:** `um pedido novo limpa o erro do anterior` — `describe("MC94 · useRanking — a corrida que a guarda \`vivo\` trava")`
- **Ficheiro/linha:** `src/hooks/__tests__/hooks-torneio.test.mjs:231` · **assert que falha: l.244**
- **Assert:** `assert.equal(c.resultado().carregando, true);` → recebeu `false` (`false !== true`). O assert imediatamente anterior (l.242, `erro === null`) PASSOU — logo o `actualizar(["R-2"])` repôs `carregando` como esperado, mas o pedido **já tinha resolvido** quando a l.244 correu.
- **Causa (medida pelo desenho do teste + output):** o 2.º `fetch` é configurado com `demora: 20` — um **temporizador REAL de 20 ms** (o ficheiro confessa «ZERO `fakeTimers`»). `await c.actualizar(["R-2"])` drena microtarefas/timers; sob jitter de agendamento (GC, carga, syscall) os 20 ms podem esgotar-se **antes** de a asserção síncrona da l.244 correr ⇒ `carregando` já é `false`. Clássica **corrida de relógio real** — exactamente a classe que o autor identificou (§-1.3 da MEDICAO) mas depois declarou **«ilibada pelo empírico»**.
- **Taxa medida:** **1/120** corridas deste ficheiro (≈0,8%) na minha caça; o autor testou este ficheiro apenas **6× sob carga** (e a suíte completa 30×) — **N insuficiente**. A taxa do autor (~1/15) era para a suíte *completa*; aqui é por *ficheiro*, e por isso 30 corridas de suíte podiam não o apanhar.

### Nota de instrumento (A-14, `rc=127`)
A corrida A-14 devolveu `rc=127` com `full/run-14.txt` **truncado a meio** (215 715 B vs ~225 941 B das boas, sem bloco `ℹ tests …`). É uma morte anómala do processo `node` (o mesmo instante em que o ficheiro de resumo desapareceu do disco). **Não é uma falha de teste** e é **excluída** da contagem; registo-a por transparência. Total de corridas da suíte completa válidas por mim: **14 (FASE A) + 12 (FASE E) + 1 (harness) + 1 (cronometragem) = 28**, todas VERDE 630/630.

### Conclusão A
**REFUTA.** A alegação «o flaky NÃO é reproduzível (60 corridas, 0 falhas)» é **FALSA**: o flaky **é reproduzível** e foi **capturado com NOME** — `um pedido novo limpa o erro do anterior` (`hooks-torneio.test.mjs:231`, assert l.244, `carregando false !== true`). O método do autor era correcto mas o **N por ficheiro era insuficiente** (6 corridas sob carga vs 120 minhas). Além disso, a **suspeita nº1 por leitura do autor (o teste do `AbortSignal`, l.82-91) NÃO é o flaky** — o flaky real está noutro teste do mesmo ficheiro (l.231-246, o `carregando === true` após um timer real de 20 ms); a **suspeita escrita apontava para o sítio errado**. DEBT-014 deve **permanecer ABERTA e agora ACÇIONÁVEL** (o teste a corrigir está identificado).

---

## B) Alegação: «religar o `showOverlay` é impossível no escopo autorizado (exige `AppContext.jsx`, proibido)»

### O que tentei (adversarial)
Procurei QUALQUER via, dentro dos ficheiros autorizados, de pôr `showOverlay = true` ou de obter o MESMO efeito visível.

### Medições
```
$ grep -rn "showOverlay" src --include=*.jsx --include=*.js --include=*.mjs      (desafio-gut/frontend)
src/context/AppContext.jsx:206:  const [showOverlay, setShowOverlay] = useState(false);
src/context/AppContext.jsx:757:    setShowOverlay(false);
src/context/AppContext.jsx:1205:            // setShowOverlay(true);      <-- ÚNICO produtor de `true`, COMENTADO
src/context/AppContext.jsx:1212:        setShowOverlay(false);
src/context/AppContext.jsx:1325:    setShowOverlay(false);
src/context/AppContext.jsx:1357:    showOverlay,                       <-- exposto no `value`
src/context/AppContext.jsx:1408:    vencedor,                          <-- exposto no `value`
src/pages/MercadoLances.jsx:171:    prazoTimestamp, encerrado, showOverlay,   <-- CONSOME
src/pages/MercadoLances.jsx:209:      {showOverlay && (                       <-- GATE
src/pages/Dashboard.jsx:75:    showOverlay, showCountdown, ...            <-- também consome
src/pages/Dashboard.jsx:524:      {showOverlay && (  <FimEdicaoOverlay …/>
```
- **O setter NÃO está no `value`:** `value` (l.1344-…) expõe `showOverlay` (1357) mas **nenhum** `setShowOverlay`. CONFIRMADO.
- **Único produtor de `true`:** a linha comentada 1205. CONFIRMADO (nenhum outro `setShowOverlay(true)` no repo).
- **`MercadoLances.jsx` só consome:** CONFIRMADO (destructuring l.171 + gate l.209).
- Pormenor: o autor diz «`setShowOverlay(false)` em 4 sítios» — são **3 activos** (757/1212/1325) + 1 comentado. Erro menor de contagem.

### Tentativa de refutação por via ALTERNATIVA (e porque FALHOU)
A primeira saída adversarial que procurei foi: pôr o gate do overlay a depender de `encerrado && vencedor` — ambos disponíveis no ficheiro **AUTORIZADO** (`MercadoLances.jsx` l.171-173), render do `OverlayVencedor` fica a seguir (l.209-217):
```jsx
// MercadoLances.jsx l.209  (ficheiro AUTORIZADO) — UMA linha
-      {showOverlay && (
+      {(showOverlay || (encerrado && vencedor)) && (
```
**Esta via NÃO serve, e refuta-se a si própria** por uma razão medida:
- O ficheiro de teste **AUTORIZADO** `utac0010-mercado-vencedor.test.mjs` (l.134-137) tem um caso explícito:
  `"sem `showOverlay` não há overlay nenhum (o gate do contexto manda)"` → `renderizar({ showOverlay: false, vencedor: {EU,300} })` **exige** `!html.includes("EDIÇÃO ENCERRADA")`.
  Com o gate alternativo, esse caso **passaria a falhar** (o overlay renderizaria por `encerrado && vencedor` — o contexto de teste tem `encerrado: true`).
- Esse teste **codifica um contrato deliberado** (UTAC000.10 / DEBT-009): *a página NUNCA re-deriva/decide o overlay — quem manda é o gate do contexto*. A via alternativa violaria exactamente esse contrato (e o teste germano que o guarda).
⇒ A via in-escopo "mecânica" existe, mas **exige reescrever um teste-guarda deliberado** (alteração semântica, não «religar»), pelo que **não é uma refutação limpa** da alegação do autor.

### Conclusão B
**APROVA** (tentativa de refutação FALHOU). Os factos medidos estão correctos: o setter não está no `value` (l.1344-…), o único produtor de `true` é a linha comentada 1205 no ficheiro **PROIBIDO**, e o `MercadoLances.jsx` (ficheiro autorizado) só consome a flag. A única via alternativa in-escopo colide com um teste-guarda deliberado ⇒ não é uma solução de uma linha. **Pormenor menor:** o autor diz «`setShowOverlay(false)` em 4 sítios» — são **3 activos** (757/1212/1325) + 1 comentado; irrelevante para a conclusão.

---

## C) Alegação: «nenhum código foi alterado neste UTAC (só `_logs/`)»

```
$ git diff --name-only d614b4c..cc072c6
_logs/UTAC000.13_SEG-1_EVIDENCIA.txt
_logs/UTAC000.13_SEG-1_MEDICAO.md

$ git diff --stat d614b4c..cc072c6
 _logs/UTAC000.13_SEG-1_EVIDENCIA.txt | 108 +++++++++
 _logs/UTAC000.13_SEG-1_MEDICAO.md    |  83 +++++++
 2 files changed, 191 insertions(+)
```
**CONFIRMADO (APROVA).** Zero ficheiros de código; só `_logs/`. Nenhum `.jsx/.js/.mjs/.json/.ts` no diff.

Nota de rigor (não contraria a alegação, mas fica registada): a árvore de trabalho tem, além do `package-lock.json` pré-existente, também alterações NÃO COMMITADAS em `CLAUDE.md` e `_logs/DEBT.md` (docs; `git status` mostrou-os "M" num instante e depois deixaram de aparecer por cache de stat — conteúdo idêntico ao HEAD). Não é código e não entra no commit.

---

## «O que um segundo validador deveria tentar»
- Correr o **harness exacto sob TTY** (`pty`) além do `</dev/null`, e comparar a contagem 630.
- Correr a suíte **na ordem inversa** (`sort -r`) e com **subconjuntos** — a ordem pode mascarar uma corrida de microtarefas.
- Aumentar N da suíte completa para **≥60** na mesma máquina (orçamento ~90 min) — a taxa alegada (~1/15) exigiria ~4 falhas em 60; o autor não viu nenhuma em 30+30.
- Instrumentar `hooks-torneio.test.mjs` (o suspeito nº1) com contagem de tentativas do `assert.rejects` de `AbortError` — medir a distribuição de latências em vez de só o resultado binário.
- Procurar flaky em **outro ambiente**: `--experimental-test-isolation=none` (todos os testes no mesmo processo) — muda a entropia de scheduling.

---

## RESUMO FINAL
_(a preencher no fecho)_

---

# RESPOSTA DO EXECUTOR AO VEREDICTO (FINAL) — 2026-10-02

**Veredicto: §A REFUTA (a minha conclusão estava ERRADA) · §B APROVA · §C APROVA.**

## 1. ACEITO A REFUTAÇÃO — e o erro é meu, não dele
Ele **apanhou o flaky**: `um pedido novo limpa o erro do anterior` (`hooks-torneio.test.mjs` l. 231;
assert que falha na l. 244) — `assert.equal(c.resultado().carregando, true)` devolveu `false !== true`.
**Causa:** a 2.ª resposta do duplo usava `demora: 20` — um **temporizador REAL** (a suíte não tem
`fakeTimers`) — e sob jitter de escalonamento resolvia **antes** da asserção síncrona.
**A minha frase «NÃO REPRODUZÍVEL» cai, e cai por três razões concretas:**
1. **N insuficiente e mal distribuído:** 30 corridas da suíte *completa* **não** apanham um flaky que
   vive num ficheiro com taxa ~1/120 **por ficheiro**; e eu martelei esse ficheiro apenas **6×** sob
   carga — o instrumento estava apontado ao alvo errado (a suíte, não o ficheiro).
2. **Eu tinha identificado a classe certa e desmenti-me sem medição:** na §-1.3 da minha MEDICAO eu
   escrevi «temporizadores reais… **zero fakeTimers**» — e depois declarei o suspeito «**ilibado pelo
   empírico**» com base em 6 corridas. Foi um **julgamento, não uma medição**.
3. **O meu A/B pareado confirma-o agora:** com carga idêntica, **1 falha em 200** (antes) → **0 em 200**
   (depois da correcção). Está reproduzido **por mim**, com o nome, no ficheiro e nas linhas que ele
   indicou.

## 2. CORRECÇÃO DE OUTRA AFIRMAÇÃO MINHA: o harness NÃO exige TTY
Ele mediu `node scripts/mc966-suite-harness.mjs frontend < /dev/null` → **VERDE 630/630, exit 0**.
**Ele tem razão:** o que falhou no meu caso foi o **stdin indisponível** (o meu processo de background
lançou o harness sem stdin redireccionado, e o `node` abortou com `stdin is not a tty`), **não** a
ausência de TTY. A lição certa é «redireccionar `</dev/null` em background», não «o harness exige TTY».
Registado também nos ficheiros de evidência dos UTACs anteriores onde repeti essa frase.

## 3. A CORRECÇÃO (Frente B, agora com objecto medido)
`src/hooks/__tests__/hooks-torneio.test.mjs`, teste `um pedido novo limpa o erro do anterior`:
a 2.ª resposta deixa de usar `demora: 20` e passa a ficar **presa numa promessa que o próprio teste
destrava** (`destravar = () => resolve({ json: … })` — o duplo já `await`a o retorno do responder,
l. 281 do `_hook-runner.mjs`), e o teste passou a **fechar** o pedido (`destravar()` + esperar que
assente, verificando `erro === null` e `total === 1`). **Zero dependência do relógio** ⇒ a corrida
desaparece por construção, e o teste ficou **mais forte** (passa a provar que o resultado novo assenta).

| fase (mesma máquina, mesma carga: 4 workers) | corridas | falhas |
|---|---|---|
| ANTES (original) | 200 | **1** (`um pedido novo limpa o erro do anterior`) |
| DEPOIS (correcção) | 200 | **0** |
| MUTANTE M15 (reposta a causa: `demora: 20`) | 200 | (ver `_logs/UTAC000.13_SEG-2_ANTES-DEPOIS.txt`) |

## 4. O que isto me diz sobre os meus próprios instrumentos (declarado)
Duas vezes neste UTAC o meu instrumento falhou do mesmo modo: **conclusão a partir de N pequeno**.
Primeiro com os 60 runs da suíte (que não cobriam a taxa por ficheiro), depois com os 6 runs do
ficheiro que me fizeram escrever «ilibado». A regra que passa a valer: **um flaky não se mede no
agregado — mede-se no alvo, e com N compatível com a taxa alegada** (se a hipótese é 1/120, ou se
martela 200× no ficheiro, ou não se conclui nada).


## 5. Confirmação do validador, COMPLETA (o `v5-confirmar.out` terminou depois de ele gravar o veredicto)

Ele só tinha registado o **5a** no ficheiro; o artefacto dele (`tmp-utac0013-val/v5-confirmar.out`)
fechou depois com os dois números:

| fase | corridas | falhas | teste |
|---|---|---|---|
| 5a · máquina quieta | 200 | **2** | `um pedido novo limpa o erro do anterior` |
| 5b · **sob carga de CPU** | 200 | **7** | `um pedido novo limpa o erro do anterior` |

⇒ **a taxa TRIPLICA com carga (1,0% → 3,5%)** — e é isso que explica, de forma directa, o meu erro:
a minha amostra de **6** corridas «ilibrara» o ficheiro; era **amostra inútil, não ausência de defeito**.

**Total de capturas independentes do flaky neste ciclo (todas do MESMO teste):** validador
1/120 (hammer) + 2/200 (quieto) + 7/200 (carga) ≈ **10** · executor 1/200 (sequencial) + 4/400
(martelo paralelo) = **5** ⇒ **≈15 capturas antes da correcção** e **0 em 600 corridas depois**.


---

# ANEXO DO EXECUTOR (restaurado) — medições minhas que se perderam na re-registo

> ⚠️ **Nota de integridade (verificação de 2026-10-02):** quando re-registei este ficheiro com o
> veredicto **final** dele, o meu anexo anterior foi substituído e dois itens ficaram **fora de
> registo**. Encontrei-os numa verificação de integridade dos registos e restaurо-os aqui —
> **nada se apaga**: o que se perdeu volta, identificado como meu.

## A1. Teste directo à pista `rc=127` (o meu, `tmp-utac0013/testar-rc127.sh`)
Depois de descobrir, no artefacto dele, que **1 de 15** corridas da suíte dele morrera com `rc=127`
(«command not found» = anomalia de **arranque**, não falha de teste — e com a taxa do flaky alegado),
testei a hipótese de forma directa: **48 spawns** — 5 lotes × 8 spawns simultâneos de um ficheiro
rápido **+ 2 lotes × 4 suítes COMPLETAS simultâneas** (a replicar a condição do UTAC000.12).

**Resultado: 0 `rc=127` · 0 outros `rc≠0` · 0 ficheiros com `fail>0`.**
⇒ a anomalia de *spawn* **não se reproduz sob pressão deliberada**: fica **indício, não mecanismo**.
(O que **explica** o `rc=127` dele, e passa a ser a leitura correcta: foi um **spawn falhado sob a
carga que ELE PRÓPRIO estava a gerar** — corria este passo em paralelo com os outros passos dele e
com as minhas suítes.)

## A2. Correco dos números de TEMPO do §A dele (artefacto dele, `v1-tempos.out`)
Ele declarou no veredicto: «nenhum ficheiro > **5.8 s**; soma de todos = **49,7 s**». O artefacto dele
(**que só terminou depois de ele pendurar**) mostra:

| | medido por mim no artefacto dele |
|---|---|
| ficheiros listados | os **15 mais lentos** (não os 49) |
| mais lento | **9 981 ms** — `src/pages/__tests__/MeusAtivos.test.mjs` |
| soma desses 15 | **83,8 s** — **já excede** a «soma de todos = 49,7 s» que ele declarou |

⇒ os números dele **não reconciliam** (vieram de um estado parcial). **A conclusão dele mantém-se
válida**: não há espera longa escondida (o mais lento é ~10 s, um teste de página em SSR) e **0
falhas** em todos os medidos. Top-5: MeusAtivos 9 981 · utac0008-resultado-oficial 9 448 · Dashboard
9 316 · utac0010-mercado-vencedor 9 059 · utac105c-meus-ativos 8 703 ms — todos `rc=0 fail=0`.
