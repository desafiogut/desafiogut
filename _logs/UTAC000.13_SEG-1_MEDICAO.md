# UTAC000.13 — SEG-1 · Medição, caça ao flaky e estado do `showOverlay` — 2026-10-02

**Objectivo:** fechar **DEBT-014** (teste flaky) e, no fim, **religar o `showOverlay`** (decisão do
operador). Ordem imposta: flaky primeiro (GATE 22).
**Veredito do SEG-1: SEGUIR na Frente A/B (flaky) · PARAR e ESCALAR na Frente D (`showOverlay`).**

## -1.1 Estado MEDIDO (antes de tocar)
| item | medido |
|---|---|
| `git rev-parse HEAD` | **`d614b4c`** = `origin/main` (como o spec declara) |
| suíte | frontend **630/630** · backend **967/973** (VERDE, corridas do fecho do UTAC000.12) |
| árvore | limpa excepto `desafio-gut/frontend/package-lock.json` (**pré-existente**) |

## -1.2 Caça ao flaky (Frente A) — método e resultado
**Método (o que o validador do UTAC000.12 não conseguiu):** `C:/Users/Moltbot/tmp-utac0013/cacar-flaky.sh`
corre a suíte do frontend **N=30×** (o mesmo conjunto de ficheiros que o harness: `find src -name
'*.test.mjs'`), guarda o output de **cada** corrida e, em falha, isola o **nome** (`grep '^not ok'`).
Artefactos: `C:/Users/Moltbot/tmp-utac0013/flaky/{resumo.txt,FALHAS-ISOLADAS.txt,FALHA-corrida-N.txt}`.
⚠️ Nota de instrumento: a 1.ª tentativa foi lançar o **harness** em background — morreu em 35 s com
`stdin is not a tty` (o harness exige TTY; armadilha já conhecida). O script usa `node --test`
directo, sem TTY.

**Resultado:** ver `_logs/UTAC000.13_SEG-1_EVIDENCIA.txt` (§1) — preenchido com o veredicto das 30
corridas.

## -1.3 Análise da causa (Frente B) — o que a medição provou
Varredura própria, por ordem de suspeição (medição, não palpite):
| padrão procurado | medido |
|---|---|
| `Math.random` em testes | **0 ficheiros** (o `Confetti` usa-o, mas nenhum teste assere sobre a página inteira) |
| `createHash`/`md5` em testes | 2 ficheiros — `mc993-preload` e `mc9953-performance` — mas ambos sobre **assets estáticos** (fontes/WebP) ⇒ **determinísticos**, ilibados |
| **temporizadores REAIS** (`setTimeout`/`await new Promise`) | **6 ficheiros**; topo: **`hooks-torneio.test.mjs` (7)**, `cotaAtiva` (3), e 1 em `mc99-limpeza-ui`, `Dashboard`, `utac0008-resultado-oficial-hook`, `useEdicoes-especial` |
| `fakeTimers`/`mock.timers`/`advance` | **nenhum** ⇒ não há controlo de tempo: tudo depende do relógio **real** |

**Suspeito nº1 (identificado por leitura, antes do empírico):** `hooks-torneio.test.mjs` l. 82-91,
«o duplo de fetch honra o AbortSignal»:
```js
const f = duploDeFetch(() => ({ demora: 50, json: {} }));
const controlador = new AbortController();
const promessa = globalThis.fetch("/x", { signal: controlador.signal });
controlador.abort();                      // ← abort IMEDIATAMENTE depois do fetch
await assert.rejects(promessa, (e) => e.name === "AbortError", …);
```
É uma **corrida de microtarefas**: se o duplo registar o *listener* de abort de forma assíncrona (ou
se a promessa resolver antes de o abort ser processado), a rejeição deixa de ser `AbortError` — falha
1 em N, dependendo da carga. **Suspeito nº2:** l. 59-80, um `setTimeout(…, 1)` a que se segue
`await … setTimeout(…, 5)` (margem de 5 ms sob carga).

## -1.4 Estado do `showOverlay` (Frente D) — **PREMISSA DO SPEC NÃO CONFERE**
O spec diz: «o `setShowOverlay(true)` está comentado no código (**l.1205 do `MercadoLances.jsx`**)».
**Medido:**
```
src/context/AppContext.jsx l.1205   →   // setShowOverlay(true);        ← é AQUI que está
   (dentro do setTimeout de 1200 ms do "lightning", com o comentário «MC63/64: animação de vencedor
    desabilitada no front-end»)
src/pages/MercadoLances.jsx          →   l.171 destrutura `showOverlay` · l.209 `{showOverlay && (`
                                          NÃO tem `setShowOverlay` (nem nenhum setter do contexto)
src/context/AppContext.jsx l.1357    →   expõe `showOverlay,` … e NÃO expõe `setShowOverlay`
```
⇒ **`MercadoLances.jsx` só CONSOME a flag; quem a produz é o `AppContext` — e o `AppContext.jsx` está
expressamente PROIBIDO neste UTAC** («NÃO AUTORIZA alterar o `useResultadoOficial.js`, `MeusAtivos.jsx`,
`Dashboard.jsx` nem `AppContext.jsx`»), enquanto o MercadoLances só é autorizado «apenas religar o
`showOverlay`» — que é **impossível nesse ficheiro**.
**Não há via alternativa dentro do escopo autorizado:** o setter não é exposto, e não existe outro
produtor de `showOverlay = true`.
  ⚠️ **CORRECÇÃO (refutação parcial do validador adversarial, ACEITE):** a minha conclusão «é
  **impossível** no escopo autorizado» era **forte demais**. Existe uma via **in-escopo** que eu não
  apresentei: o **gate** do overlay está no ficheiro **autorizado** (`MercadoLances.jsx` l.209) e
  `encerrado` (l.171) e `vencedor` (l.173) **já lá estão** ⇒ **1 linha** no ficheiro autorizado
  produz o efeito visível pretendido:
  ```jsx
  -  {showOverlay && (
  +  {(showOverlay || (encerrado && vencedor)) && (
  ```
  **Ressalvas medidas a essa via** (para a decisão ser informada, não simplificada): (a) **não é
  «religar a flag»** — **muda o gatilho** (o overlay passa a abrir por `encerrado && vencedor`, e não
  pelos 1200 ms após o início do lightning que a l.1205 comentada fazia); (b) **só traz UM dos dois
  overlays** — o do `Dashboard.jsx` (l.524, `FimEdicaoOverlay`) continua gateado por `showOverlay` e
  esse ficheiro está **fora do escopo** deste UTAC; (c) o validador confirma a minha medição de base
  (o setter **não** está no `value`; o único produtor de `true` é a l.1205 comentada).
  ⇒ Escalado ao operador com **4 opções medidas** (ver §-1.6).
  ⚠️ **Correcção menor:** eu escrevi «`setShowOverlay(false)` em 4 sítios» — são **3 activos**
  (l.757, 1212, 1325) + a linha comentada.

## -1.5 Saúde global (HI1)
Disco OK · suíte VERDE no baseline · árvore limpa (só o `package-lock.json` pré-existente) · nenhum
worktree de validação montado · `node_modules` real 505 · 417 (verificado no fecho do UTAC000.12
depois da limpeza dos worktrees do validador).

## -1.6 VEREDITO do SEG-1
- **Frente A/B (flaky): SEGUIR** — há suspeitos medidos e um método que isola o nome.
- **Frente D (`showOverlay`): PARAR E ESCALAR (GATE 10).** A decisão do operador («vamos religar») é
  clara quanto ao **querer**, mas o **onde** está fora do escopo autorizado. Opções para o operador:
  1. **Autorizar o `AppContext.jsx` (só a l.1205)** neste UTAC — é a correcção mínima: descomentar
     uma linha (a flag é `useState(false)` na l.206; o gate do overlay já existe no MercadoLances).
  2. Abrir **UTAC próprio** para o `AppContext` (mais lento, zero risco de escopo).
  3. **Não religar** (manter o comportamento actual: o overlay nunca renderiza).
  ⚠️ **Determinante medido:** religar torna **alcançáveis** as dívidas latentes DEBT-011/012/013
  (o `OverlayVencedor` e o `FimEdicaoOverlay` só renderizam com a flag a `true`) — as guardas do
  UTAC000.11/12 já estão lá; a do `FimEdicaoOverlay` (DEBT-013) **não**.
  ⚠️ **CORRECÇÃO (refutação parcial do validador, ACEITE):** a minha conclusão «impossível no escopo
  autorizado» era **forte demais** — há uma **4.ª opção in-escopo**: mudar o **gate** na l.209 do
  `MercadoLances.jsx` (ficheiro AUTORIZADO) para `{(showOverlay || (encerrado && vencedor)) && (…)}`
  (1 linha; `encerrado`/`vencedor` já estão disponíveis no mesmo ficheiro). **Limites medidos dessa
  via:** (a) **muda o gatilho** (não é «religar a flag»: abre por `encerrado && vencedor`, não pelos
  1200 ms do lightning); (b) só traz **um** dos dois overlays (o do `Dashboard.jsx` l.524 continua
  gateado por `showOverlay`, e esse ficheiro está fora do escopo). Correcção menor aceite:
  «`setShowOverlay(false)` em 4 sítios» → **3 activos** (757/1212/1325) + a linha comentada.
