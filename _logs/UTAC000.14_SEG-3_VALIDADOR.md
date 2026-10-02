# UTAC000.14 — SEG-3 — Veredicto do validador adversarial independente

**Data:** 2026-10-02 · **Commit validado:** `f635b32` (base `3a0f6fa`) · **Worktree:** `C:/Users/Moltbot/tmp-utac00014-val/wt` (destacado, junctions A9, removido no fim)

## VEREDICTO: **REFUTADO (Frente C — `showOverlay`)** · Frente B (DEBT-013) **APROVADA**

A guarda do `FimEdicaoOverlay` está correcta, não regride com vencedores válidos (byte-idêntica) e os testes mordem.
O religar do `showOverlay` faz o que o operador pediu, mas **ninguém mediu o que isso faz em produção hoje**: com
`EM_BREVE_MODE = true` e prazo on-chain da R-1 = 0, o prazo do relâmpago é um cronómetro **local de 30 min** que
corre em todos os browsers. Resultado medido: o overlay «EDIÇÃO ENCERRADA» (com confetti) abre sozinho **30 min
depois de qualquer 1.ª visita** e **1,25 s depois de um F5** feito até 10 min após esse prazo, enquanto o resto da app
diz «Em breve». Não se deve publicar a Frente C assim; a Frente B pode seguir sozinha.

---

## ⚠️ Achados graves

### ⚠️ G1 — Com o `showOverlay` religado, o overlay abre sozinho numa edição que não está a correr («EM BREVE»)
Por que acontece (código, `f635b32`):
- `AppContext.jsx` l.177 `modalidade = useState("flash")` (por omissão); l.192-194 `prazoFlash = lerPrazoStorage(LS_PRAZO_FLASH) ?? now + DURACAO.flash` (1800 s) → **prazo puramente local**, nada o liga a uma edição real.
- `lib/leilaoTimer.js` `lerPrazoStorage` só descarta prazos **vencidos há mais de 10 min** (`n + 600 < now`) → um prazo vencido há menos de 10 min é reaceite no arranque → `restante === 0` no 1.º `tick()`.
- `lib/leilaoLock.js` `EM_BREVE_MODE = true` → `getEstadoEdicao` devolve «Em breve» em todos os ecrãs, mesmo com `encerrado = true`.
- O programado não salva: on-chain (mainnet, contrato `0x0052477A…16cd` do bundle de produção) a R-1 tem `prazo = 0`, logo `getEdicaoPrazo` devolve `null` e o prazo do programado também é local (24 h + a mesma janela de 10 min).

Medição (a `tick` REAL extraída de cada revisão + o `lerPrazoStorage` REAL + relógio simulado a 250 ms; `src/context/__tests__/_val-arranque.test.mjs`, temporário):
```
node --test --test-concurrency=1 --test-reporter=tap src/context/__tests__/_val-arranque.test.mjs
[NOVO f635b32] C1 1ª visita (flash, sem LS), 30 min de aba: aberturas aos 5s=0, aos 30min=1 em t+1801.25s; getEstadoEdicao(encerrado=true).rotulo="Em breve"
[NOVO f635b32] C2 F5 5min após expirar: lerPrazoStorage=prazo VENCIDO aceite; aberturas em 2s=1 (t+1.25s)
[NOVO f635b32] C3 F5 11min após expirar: prazo novo=1800s; aberturas em 2s=0
[NOVO f635b32] C4 programado, prazo on-chain há 30 dias: aberturas em 2s=1
[NOVO f635b32] C5 prazo=0: aberturas=1; prazo=NaN: aberturas=0 encerrado=false
[VELHO 3a0f6fa] C1 … aos 30min=0 · C2 … aberturas=0 · C3 0 · C4 0 · C5 0/0
```
Prazo on-chain em produção (só leitura, `eth_call` pelo RPC público que vem no bundle `web3-DeSSObZG.js`):
```
0x0052477A8CA81BCAF4a60e21e635F9e00a5d16cd nome=  ativa= false prazo= 0
```
(C4 não acontece hoje porque o prazo on-chain é 0 e é ignorado; acontece logo que uma edição programada seja aberta e termine. C1/C2 acontecem já, em todos os browsers.)

Consequências visíveis (lidas do código):
- O overlay (`FimEdicaoOverlay`, Dashboard l.524; `OverlayVencedor`, MercadoLances l.209) diz «EDIÇÃO ENCERRADA · Edição R-1 · ⚡ Relâmpago» com confetti, por cima de um ecrã que diz «Em breve».
- O `<Modal open>` do `FimEdicaoOverlay` não recebe `onClose` → sem Escape e sem clique no fundo; a **única** saída é «⚡ NOVA RODADA» (ou trocar de modo, que dispara `setShowOverlay(false)` na l.757).
- «NOVA RODADA» (`handleNovaRodada`) mostra o `CountdownOverlay`, apaga localmente `lances`/`lancesFlash` e arma mais 30 min locais → **o ciclo repete-se de 30 em 30 min** com a aba aberta.
- A flag vive no `AppProvider` (global): dispara em qualquer página e o overlay aparece quando se entra no Dashboard ou no /mercado.
- Não medi o que `vencedorExibido` mostra nesse momento (depende de `useResultadoOficial("R-1")` / lances vistos): será um vencedor oficial antigo ou «Nenhum lance único registrado».

Foi exactamente isto que o MC63/64 desligou (`36b46c7`: «OverlayVencedor/FimLeilaoOverlay + Confetti não disparam mais automaticamente»). O SEG-1 do executor (§3) e o teste novo só provam que, com prazo 0, abre; não provam que **não abre quando não deve**.
Correcção sugerida (não é minha decisão): pôr uma condição no produtor, p.ex. `if (!EM_BREVE_MODE) setShowOverlay(true)`, ou só abrir com prazo on-chain real (> 0); e um teste de controlo negativo «EM BREVE ⇒ não abre».

---

## ℹ️ Notas

### ℹ️ N1 — DEBT-013: a guarda cobre os malformados; o que sobra é igual ao código antigo
Comparação do HTML antigo (`3a0f6fa`) com o novo, campo a campo (`_val-adv.test.mjs`, temporário):
```
string 'abc' / 5 / true / [] / [1,2] / função   VELHO: THROW …reading 'slice'     NOVO: — | —
{endereco:{toString}}                         VELHO: THROW …slice is not a function NOVO: — | R$ 3.00
new Number(300)                               VELHO: R$ 3.00                       NOVO: —
endereco new String(EU)                       VELHO: 0xaaaa0000...000001           NOVO: —
valor 1e21    VELHO = NOVO: R$ 10000000000000000000.00
valor 1e300   VELHO = NOVO: R$ 1.0000000000000001e+298
valor MAX_VALUE VELHO = NOVO: R$ 1.7976931348623156e+306
valor 0.5 → R$ 0.01 · 0.4 → R$ 0.00 · -0 → R$ 0.00 · 250.5 → R$ 2.50 (iguais)
endereco "x" → «x...x» · "abc" → «abc...abc» · "   " → «   ...   » (iguais)
getter que lança / Proxy que lança            VELHO: THROW  NOVO: THROW (iguais)
<script> no endereço → escapado pelo React (iguais)
```
- Nada de novo a rebentar ou a mostrar «R$ NaN»/negativo/«Infinity». O `vencedor` não-objecto (string, número, `true`, array, função) **rebentava antes e já não rebenta** — ganho não declarado.
- Restos (todos **iguais ao antigo**, não são regressão): números finitos gigantes (`1e21`, `MAX_VALUE`) saem em notação absurda; endereços curtos/só espaços dão «x...x»; getters/Proxy que lançam continuam a lançar (fora do modelo de ameaça — os dados vêm de JSON/contrato).
- Muda de comportamento, de forma aceitável: `new Number(300)` e `new String(EU)` passam a «—» (antes formatavam). São formas que não aparecem nas fontes reais (JSON e ethers devolvem primitivos).

### ℹ️ N2 — Com `vencedor` válido o output é byte-idêntico
O `Confetti` usa `Math.random`, por isso uma comparação ingénua dá sempre diferente (velho≠velho). Com `Math.random` semeado igual antes de cada render:
```
SEMEADO validos comparados=44 diferentes=0
```
(11 vencedores — null, undefined, valor 0/1/300/99999999/12345/250.5, maiúsculas, campo extra, endereço «x» — × flash/programado × `R-1`/`ESPECIAL-1`.)

### ℹ️ N3 — Os testes não são vácuos; todos os meus mutantes morrem
Mutantes próprios (script com âncoras exactas `\r\n`, cada um verificado como «entrou», restaurado de cópia `.bak`):
```
FM1 >=0 -> >0                          → pass=22 fail=2
FM2 sem length>0                       → pass=23 fail=1
FM3 Number.isFinite -> typeof number   → pass=23 fail=1
FM4 Number.isFinite -> isFinite global → pass=23 fail=1
FM5 typeof string -> vencedor?.endereco?.slice → pass=22 fail=2
AM1 1200 -> 1000                       → pass=4 fail=1
AM2 setShowOverlay(true) fora do setTimeout → pass=2 fail=3
AM3 overlay antes de apagar o relâmpago → pass=2 fail=3
AM4 sem fimDisparadoRef.current = true → pass=4 fail=1
AM5 reabertura on-chain não fecha overlay → pass=4 fail=1
```
FM2/FM3/FM4 só são apanhados por 1 caso cada (um só ponto de falha, mas apanhados).

### ℹ️ N4 — O teste do `showOverlay` (extracção da `tick` com `new Function`): honesto, com limites declarados
- Robusto: âncoras com `assert` de controlo; um identificador novo na `tick` dá `ReferenceError` (falha visível, não um verde enganador); o caso CONTROLO prova que distingue ligado de desligado.
- Limites (o cabeçalho declara-os): não prova a cablagem do `useEffect` (deps, `setInterval`, `tick()` inicial) nem o render. **O limite que conta:** não tem nenhum controlo negativo de contexto (EM BREVE / prazo local / arranque com prazo vencido) — foi por aí que passou o G1.
- Depende do texto «Máquina de fim de leilão» e de `"\n    tick();"` (indentação de 4). Se se reformatar, falha alto, não em silêncio.

### ℹ️ N5 — Escopo e dependências: limpos
```
git diff --name-only 3a0f6fa f635b32
_logs/UTAC000.14.spec.yml · _logs/UTAC000.14_SEG-1_EVIDENCIA.txt · _logs/UTAC000.14_SEG-1_MEDICAO.md
_logs/UTAC000.14_SEG-2_ANTES-DEPOIS.txt · src/components/FimEdicaoOverlay.jsx (10 linhas)
src/components/__tests__/utac00014-fim-edicao-overlay.test.mjs · src/context/AppContext.jsx (6 linhas)
src/context/__tests__/utac00014-show-overlay.test.mjs
```
Nenhum `package.json`/lock, nenhum ficheiro proibido pelo spec. No `AppContext.jsx` só a linha descomentada mais o comentário. Comportamento visível alterado: o valor e o endereço do overlay (N1) e a abertura automática do overlay (G1).

### ℹ️ N6 — Suíte reproduz
```
node scripts/mc966-suite-harness.mjs ambos < /dev/null
frontend: VERDE 659/659 pass
backend: VERDE 967/973 pass
VEREDITO: VERDE
```
(630 → 659 = +29 = 24 + 5 testes novos, bate com o declarado.)

### ℹ️ N7 — APK
O Dashboard (com o `FimEdicaoOverlay`) também existe no APK, sem a porta `isLeilaoAtivo`. O APK leva o frontend dentro do pacote, por isso o G1 só lá chega quando houver novo `build:apk`. Ter isto em conta antes do próximo APK.

---

## Higiene
- Ficheiros temporários do validador (`_VAL_old_*.jsx`, `_val-adv.test.mjs`, `_val-arranque.test.mjs`) só existiram no worktree e foram apagados antes da remoção.
- A árvore principal não foi alterada. Sem push, sem deploy, sem Supabase/Netlify. A única interacção com produção foi leitura: GET do bundle público e um `eth_call` só de leitura.
- Junctions removidas com `rmdir` via `cmd`, e depois `git worktree remove`.

---

# RESPOSTA DO EXECUTOR À 1.ª RONDA

- **G1 ACEITE.** Premissas confirmadas no código pelo executor (AppContext l.192-194, leilaoTimer.lerPrazoStorage 600 s, leilaoLock l.10). Escalado ao operador; decisão R18: «Religar só fora do EM BREVE» → commit `9b9556e` (`if (!EM_BREVE_MODE) setShowOverlay(true);` + import da fonte única + 2 testes + M16-M19).
- **N1-N6 aceites.** N7 (APK) registado no relatório. O aviso N2 do dia em que a flag for desligada → **DEBT-016**.

---

# UTAC000.14 — SEG-3 (2.ª ronda) — Veredicto do validador adversarial independente

**Data:** 2026-10-02 · **Commit validado:** `9b9556e` (sobre `f635b32`, base `3a0f6fa`) · **Worktree:** `C:/Users/Moltbot/tmp-utac00014-val/wt2` (destacado, junctions A9, removido no fim)

## VEREDICTO: **APROVADO COM RESSALVAS**

O G1 da 1.ª ronda está corrigido. Com `EM_BREVE_MODE = true` (hoje) o overlay **não abre em nenhum** dos cenários C1–C6. No bundle de produção o `setShowOverlay(true)` é **eliminado pelo minificador**. Há um só produtor, não há ciclo de módulos, o escopo está limpo e a suíte reproduz.

As ressalvas são notas (ℹ️), nenhuma bloqueia:
- uma fuga teórica que só um teste textual apanha;
- um mutante equivalente-em-produção que sobrevive;
- o que acontece no dia em que a flag for desligada.

---

## ℹ️ N1 — Com EM BREVE (hoje) o overlay nunca abre: 0 aberturas em C1–C6
Uso a `tick` REAL de `9b9556e`, o `lerPrazoStorage` REAL e o `EM_BREVE_MODE` REAL importado de `lib/leilaoLock.js`, com relógio simulado a 250 ms e temporizadores executados (`_val-r2.test.mjs`, temporário):
```
[flag=true]  C1 1ª visita 90min: aos5s=0 total=0 encerrado=true | C2 F5 5min após expirar: 0 | C3 F5 11min: 0 | C4 programado -30d: 0 | C5 prazo=0: 0 | C6 prazo=NaN: 0
```
(Na 1.ª ronda, com `f635b32`: C1=1, C2=1, C4=1, C5=1.)

Não há outro produtor de `true` (grep em `src`, fora dos testes):
```
AppContext.jsx:207  useState(false) · :758 setShowOverlay(false) · :1208 if (!EM_BREVE_MODE) setShowOverlay(true)
AppContext.jsx:1215 setShowOverlay(false) · :1328 setShowOverlay(false)
consumidores: Dashboard.jsx:524, MercadoLances.jsx:209 (só leem)
```
O value do contexto expõe `showOverlay`, mas não o setter.

Prova no bundle (`vite build` com `f635b32` e com `9b9556e`, mesmo worktree). O callback do `setTimeout` minificado:
```
f635b32: nt.current=setTimeout(()=>{ue(!1),ce(!0),nt.current=null      ← ce(!0) = setShowOverlay(true)
9b9556e: nt.current=setTimeout(()=>{ue(!1),nt.current=null             ← eliminado (EM_BREVE_MODE constante true)
```
Mantém-se como antes do UTAC: quando o prazo local chega a 0, liga-se `encerrado` e acende-se o relâmpago durante 1,2 s. Os ecrãs continuam a mostrar «Em breve» porque `getEstadoEdicao` dá prioridade à trava.

## ℹ️ N2 — Com EM_BREVE_MODE = false (simulado) volta o comportamento anterior ao MC63/64, e é isso que o operador deve saber
```
[flag=false] C1 1ª visita 90min: aos5s=0 total=1 em t+1801.25s | C2 F5 5min após expirar: 1 (t+1.25) | C3 F5 11min: 0 | C4 programado -30d: 1 | C5 prazo=0: 1 | C6 prazo=NaN: 0
```
Abre uma vez, 1200 ms depois do prazo, tal como acontecia antes do MC63/64. Não é defeito novo.

**Para o dia em que a flag for desligada:**
- O prazo do relâmpago continua a ser um cronómetro **local de 30 min por browser** (`prazoFlash = LS ?? now + 1800`), e o programado só é real se o prazo on-chain for > 0. Hoje, na mainnet, a R-1 tem `prazo = 0` (medido na 1.ª ronda).
- Um F5 até 10 min depois do prazo volta a abrir o overlay 1,25 s após carregar (janela `n + 600` do `lerPrazoStorage`).
- O `FimEdicaoOverlay` não tem `onClose`: só sai com «NOVA RODADA», que arma mais 30 min locais.

Antes de desligar a trava convém ligar o relâmpago a um prazo real (servidor ou on-chain).

## ℹ️ N3 — O import novo não cria ciclo nem efeito colateral; o bundle muda +35 bytes
- `lib/leilaoLock.js` não tem imports, só constantes e uma função pura. Já era importado por `utils/edicao.js`. Na fonte não há ciclo.
- O build passa (exit 0): `✓ built in 6.16s`. Os avisos `advancedChunks`/`manualChunks` já existiam.
- Total de JS: `5967838 → 5967873` bytes (+35). Os chunks que mudam são `AppContext 65891→65906`, `edicao 889→921`, mais ruído de hash em `MeusAtivos`/`PrivyRoot` (±7 bytes).
- Efeito no grafo: o Rolldown mudou o módulo `leilaoLock` para dentro do chunk `AppContext`, e o chunk `edicao` passa a fazer `import{a as e}from"./AppContext-….js"`.
  - Medi quem importa `edicao`: `CardLance`, `EdicaoDetalhe`, `MercadoLances` e `PrivyRoot`, que **já importavam todos o `AppContext`** (`importa_AppContext=1` em ambos os builds).
  - O `AppContext` não importa `edicao`, por isso não há ciclo entre chunks.
  - O grafo estático do `index` é igual nos dois builds (motion, react, rolldown-runtime, router, ui).
  - Conclusão: nada novo é carregado de forma eager. É irrelevante para a performance. Regista-se por causa da lição «Vite 8/Rolldown ignora manualChunks».

## ℹ️ N4 — Mutantes: quase todos mordem; um sobrevive e é inócuo; um só é apanhado pelo texto
Usei âncoras exactas `\r\n`, confirmei que cada mutante «entrou» e restaurei de `.bak`. O `git status` ficou limpo no fim.
```
R1 if(true)                                  → pass=4 fail=3
R2 `!EM_BREVE_MODE && setShowOverlay(true)`  → pass=6 fail=1   (equivalente; só o CONTROLO falha, por âncora textual)
R3 if movido para fora do setTimeout         → pass=6 fail=1   (teste 1: «prazo a 0 … 1200 ms depois»)
R4 flag local `const EM_BREVE_MODE = false`  → pass=6 fail=1   (teste 6: exige o import da fonte única)
R5 fuga `if (!EM_BREVE_MODE || prazoTimestamp === 0)` → pass=6 fail=1   (só o CONTROLO, por âncora textual)
R6 import mantido + sombra local             → pass=2 fail=5
R7 `else if(encerrado)`: `if (!EM_BREVE_MODE) setShowOverlay(false)` → pass=7 fail=0  <<< SOBREVIVE
R8 condição invertida                        → pass=2 fail=5
```
- **R5:** é uma fuga real em teoria («em EM BREVE, com prazo 0, abre»). Morre só porque o CONTROLO faz `replace` da linha exacta e falha com «controlo mal construído». Não há nenhum teste semântico «EM BREVE + prazo 0 ⇒ não abre». O impacto é baixo: em produção o prazo nunca é 0 (há sempre o fallback local `now + dur`). Ainda assim, o caso EM BREVE só é testado com `prazoTimestamp: 1000`.
- **R2:** o reverso do R5. Uma refactorização equivalente fica vermelha pelo mesmo teste textual. É fragilidade ruidosa, não silenciosa: aceitável.
- **R7 sobrevive** porque nenhum teste combina EM BREVE com «reaberto on-chain». É inócuo enquanto a flag está ligada, porque o overlay nunca chega a `true`; com a flag desligada, o fecho volta a ser incondicional. Não é defeito, mas é uma lacuna de cobertura.
- Os mutantes que o executor declarou (M16, M17, M18 e M19) correspondem aos meus R1, R4 e R8, que também morrem.

## ℹ️ N5 — Escopo está limpo
```
git diff --name-only f635b32 9b9556e
_logs/UTAC000.14_SEG-2_ANTES-DEPOIS.txt · _logs/UTAC000.14_SEG-3_VALIDADOR.md
desafio-gut/frontend/src/context/AppContext.jsx · desafio-gut/frontend/src/context/__tests__/utac00014-show-overlay.test.mjs
git diff --name-only 3a0f6fa 9b9556e   → os 9 esperados (_logs ×5, FimEdicaoOverlay.jsx + teste, AppContext.jsx + teste)
```
No `AppContext.jsx` (`f635b32→9b9556e`) há 1 linha de import, a condição e 2 linhas de comentário. Não há `package.json`, lock, nem ficheiros proibidos. O `FimEdicaoOverlay.jsx` está igual ao `f635b32`, que foi aprovado na 1.ª ronda.

## ℹ️ N6 — A suíte reproduz
```
node scripts/mc966-suite-harness.mjs ambos < /dev/null
frontend: VERDE 661/661 pass
backend: VERDE 967/973 pass
VEREDITO: VERDE
```

---

## Higiene
- O ficheiro temporário (`_val-r2.test.mjs`) foi tirado do worktree antes de correr a suíte. O `AppContext.jsx` foi restaurado de `.bak` depois de cada mutante e o `git status --short` ficou vazio.
- Os builds de comparação foram para `C:/Users/Moltbot/tmp-utac00014-val/dist-{old,new}`, fora do repo, e foram apagados.
- A árvore principal não foi alterada. Não houve push, deploy, Supabase nem Netlify. Nesta ronda não houve nenhuma interacção com produção.
- Junctions removidas com `rmdir` via `cmd`, e depois `git worktree remove`.

---

# RESPOSTA DO EXECUTOR À 2.ª RONDA

- **APROVADO COM RESSALVAS — aceite.**
- **R5 e R7 FECHADOS (R15, só ficheiro de teste):** +2 testes em `utac00014-show-overlay.test.mjs` — «EM BREVE: com prazo 0 e prazo vencido há 30 dias não abre» e «EM BREVE: reaberto on-chain continua a fechar». Mutantes do validador re-aplicados: **R5 → 2 RED** (o teste semântico novo morde, já não só o CONTROLO) · **R7 → 1 RED** (era sobrevivente). Restauro md5 `e1e67536…` idêntico. Teste 9/9; suíte **663/663 · 967/973**.
- **R2** (refactor equivalente apanhado pelo CONTROLO textual): aceite como fragilidade ruidosa, não alterado.
- **N2 → DEBT-016** (pré-condição de activar o leilão: prazo real para o relâmpago).
- ⚠️ Estas 2 adições de teste **não passaram por 3.ª validação** (declarado).
