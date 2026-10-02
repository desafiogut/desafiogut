# UTAC000.15 — Veredicto do validador adversarial independente

**Commit validado:** `ab244aa` (base `49bc141`) · worktree destacado `C:/Users/Moltbot/tmp-utac00015-val/wt` (já removido)

## VEREDICTO: APROVADO COM RESSALVAS

A DEBT-010 está fechada no que declara: o M12 morde (2 RED) e a cablagem `AppProvider → contexto → página` é exercitada em runtime, não por texto. Matei 10 dos meus 14 mutantes, e também os M12, M16 e M11 do executor. Os 4 que sobrevivem não são vacuidade do arnês. São zonas que ele não cobre e que ficam por declarar. A mais séria é o duplo **estático** do resultado oficial (⚠️1).

---

## 1. O arnês é vácuo ou tautológico? — NÃO

- O duplo `useResultadoOficial` é partilhado entre o Provider e a página, mas o `MercadoLances` **não** o importa (`grep`: só `AppContext`, `TabelaLances`, `Dashboard` e `MeusAtivos` o importam). O overlay recebe `vencedor` do contexto.
- O `V7_edicaoErrada` foi morto pela verificação do argumento. Isso prova que o handle do arnês e o do Provider são a **mesma instância** do módulo.
- O `V4_timerNest` (um `AppContext.Provider` aninhado dentro do `TimerProvider` que repõe o vencedor local) foi morto pela asserção sobre o **HTML**, embora `valor()` (o `props.value` exterior) continuasse OFICIAL. Isto prova que a página lê o contexto *efectivo* e não o `value` de topo.
- `P1` (a página passa a ler o hook directamente + M12 no Provider): o teste do overlay passa, mas o teste do leitor de contexto fica RED. Os dois describes complementam-se. Isolado, o teste do overlay **não** provaria a cablagem se a página mudasse de arquitectura (ℹ️).

## 2. Mutantes (comando: script `mut/run.mjs`, âncoras CRLF exactas, entrada do mutante verificada, restauro a partir de `.bak`)

```
M12:                 pass=2 fail=2 MORTO
V3_value (vencedor: vencedorLocal no value)          MORTO (2)
V4_timerNest (Provider aninhado sobrescreve)          MORTO (2)
V5_soAntesDoFim (oficial só se !encerrado)            MORTO (1, overlay)
V6_overlaySempre (tira o gate EM_BREVE)               MORTO (1)
V7_edicaoErrada (useResultadoOficial("R-0"))          MORTO (1)
V8_valorLocal (endereço oficial, valor local)         MORTO (2)
V10_dependente de pathname                            MORTO (2)
P1_paginaLeHook + M12                                 MORTO (1, só o leitor)
M16 (comenta setShowOverlay)                          MORTO (1)
M11 (página re-deriva dos lances)                     MORTO (1)
V1_soFlash   (oficial só se modalidade==="flash")     SOBREVIVE  ⚠️
V11_congelaPrimeiro (useRef(resultadoOficial))        SOBREVIVE  ⚠️
V2_ate2lances (oficial só se lances<=2)               SOBREVIVE  ℹ️
V9_soComLocal<50 (sobrescreve se local.valor<50)      SOBREVIVE  ℹ️
```

### ⚠️1 — O duplo do resultado oficial é ESTÁTICO desde o 1.º render; o hook real NÃO é
O hook real (`src/hooks/useResultadoOficial.js` l. 67-96) devolve **sempre `null` no primeiro render**. O resultado só chega depois, num efeito assíncrono e com polling. O duplo devolve OFICIAL logo na primeira chamada e nunca muda. O mutante `V11` (`const __ro0 = useRef(resultadoOficial); const vencedor = __ro0.current ? …`) congela o valor do primeiro render e passa os 4 testes. Em produção esse mutante mostraria **sempre o vencedor local**, ou seja, exactamente o defeito da DEBT-009. Pela mesma razão, um `useMemo` com dependências velhas (sem `resultadoOficial`) também sobreviveria. A transição `null → oficial` com re-render não está provada.
*Sugestão:* ou um duplo que comece em `null` e passe a OFICIAL depois de um tick (forçando re-render), ou duplicar mais abaixo (o `lerResultadoOnchain`/RPC) e deixar correr o hook REAL.

### ⚠️2 — Modalidade `programado` não coberta
O `V1` sobrevive. O arnês só exercita `modalidade = "flash"` (o estado inicial, l. 178) com lances via `lances-flash`. Ficam por cobrir: o caminho `programado`, com `lances` on-chain por `subscribeLanceDado` (o duplo é um no-op), e a mudança de modalidade. O cabeçalho do arnês não declara este limite.

### ℹ️3 — Fixture de ponto único
`V2`/`V9` sobrevivem porque há um só conjunto de dados (2 lances, local = 100). É inerente a testes por exemplo e de baixo risco, mas convém registá-lo.

### ℹ️4 — Travessias fora do arnês
O `Dashboard` e o `MeusAtivos` chamam `useResultadoOficial` **eles próprios** (Dashboard l. 90-93, MeusAtivos l. 89-95). Para eles o `vencedor` do Provider é só reserva, e não são renderizados no arnês. O `FimEdicaoOverlay` recebe `vencedorExibido` do Dashboard. A DEBT-010 dizia respeito ao `MercadoLances`, por isso isto não é um defeito, apenas fica fora do âmbito provado.

## 3. Fidelidade dos duplos
- **Privy:** sempre «visitante pronto, não autenticado», e isto está declarado. Os ramos com sessão (endereço, saldos) não são exercitados. Pelo código, o `vencedor` não depende deles (ℹ️).
- **web3/fingerprint:** fronteiras de I/O, fail-soft `null`. São aceitáveis e é isso que permite ao processo terminar.
- **Condutor `_hook-runner`:** o `useContext` devolve `_currentValue` (l. 171-172). O `AppProvider` só lê contextos através do react-router (`useLocation`/`useNavigate`). `useAppContext`/`useAppTimer` são definidos mas não são chamados pelo Provider. O `TimerProvider` e a página correm no `renderToStaticMarkup` real, onde o empilhamento de Providers é o do React. Não há divergência material.
- **Router por `_currentValue`:** o valor é reposto em `desmontar()` e no `catch`. Aguentou-se sob carga (abaixo).
- **`fetch`:** devolve 404 em tudo o que não seja `lances-flash`. Os avisos são capturados mas não são verificados (ℹ️: um erro novo do Provider passaria em silêncio).

## 4. Robustez
```
10× sequencial: pass 4 fail 0 em todas, 7-9 s cada, rc=0 (o processo termina, sem handles pendurados)
6× em paralelo + 4 processos a 100% CPU: pass 4 fail 0 em todas, ~20,3 s, rc=0
```
Mesmo sob carga, o tecto de 5 s para o temporizador de 1200 ms deixou margem. Os 3 servidores Vite do ficheiro correm em sequência (`--test-concurrency=1`, `before`/`after` por describe) e não se viu interferência. Os runs com mutante (RED) também terminaram.

## 5. Âmbito do commit
`git diff --stat 49bc141 ab244aa`: 10 ficheiros, +499/−0. Tudo em `desafio-gut/frontend/src/__tests__/` (o arnês, o teste e 5 stubs) e `_logs/UTAC000.15_*`. **Nenhum código de produção**. `_ponte-ssr.mjs`, `_render.mjs`, `vite.config.js` e `package.json`/lock estão intocados, sem dependências novas.

## 6. Suíte
```
node scripts/mc966-suite-harness.mjs ambos < /dev/null   (73 s, rc=0)
frontend: VERDE 668/668 pass
backend: VERDE 967/973 pass
VEREDITO: VERDE
```
Reproduz o declarado: 668 = 664 + os 4 novos, o que mostra que o ficheiro está no glob da suíte.

## Limpeza
- As junctions (4: `frontend/node_modules`, `frontend/netlify/functions/node_modules`, `desafio-gut/node_modules`, `node_modules` da raiz) foram removidas com PowerShell `[System.IO.Directory]::Delete(<caminho>, $false)`. Cada uma deu `Test-Path` = False, e o alvo real `DESAFIOGUT\desafio-gut\frontend\node_modules\vite\package.json` continua presente.
- O worktree foi removido com `git worktree remove --force` (`Test-Path` = False). Os `.bak` foram apagados e o `git status` do worktree estava limpo antes da remoção. A árvore principal não foi tocada. Não houve push nem deploy.

---

# RESPOSTA DO EXECUTOR

**APROVADO COM RESSALVAS — aceite. As 2 ⚠️ e os ℹ️ de cobertura corrigidos (só ficheiros de teste):**

- **⚠️1 (duplo do oficial estático):** o arnês deixou de duplicar o `useResultadoOficial` — o hook **REAL** corre dentro do Provider (1.º render `null`, oficial por efeito assíncrono, `normalizarResultadoOficial` real). O duplo passou a ser **só** a leitura on-chain `lerResultadoOnchain` (`_stubs-provider/resultado-onchain.js`, forma crua do contrato, 5 ms assíncrono, com `aguardarLeituras()` para o arnês esperar). O teste exige ainda que o **1.º render** não tenha vencedor (`valorInicial().vencedor === null`). ⇒ **V11 (congelar o 1.º render) → 3 RED.**
- **⚠️2 (programado não coberto):** o duplo de `web3.js` guarda o callback do `subscribeLanceDado`; 2 testes novos mudam para `programado` pelo `setModalidade` real e emitem 4 `LanceDado` (com repetidos; menor único local = 30). ⇒ **V1 (oficial só em flash) → RED.** Cabeçalho do arnês declara o âmbito (MercadoLances; Dashboard/MeusAtivos fora).
- **ℹ️3 (fixture de ponto único):** a fixture do programado tem 4 lances e local < 50 ⇒ **V2 e V9 → RED.**
- **ℹ️ avisos ignorados:** `assertSemErros()` exige 0 TypeError/ReferenceError/RangeError/«Warning:»/unhandled.
- **Bateria re-corrida (8 mutantes, os 4 meus + os 4 sobreviventes dele): 8/8 RED**, restauro md5 idêntico. M12 contra a suíte inteira: **VERMELHO 3** (era 2). Anti-flaky: 10/10 sequencial + 8/8 sob carga. Suíte **670/670 · 967/973**.
- ⚠️ Estas correcções **não passaram por 2.ª validação** (declarado). ℹ️ V1/V2/V9 são apanhados por um único teste (o do programado com oficial).
