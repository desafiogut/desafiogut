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
