# VEREDICTO DO VALIDADOR ADVERSARIAL — commit `7c5ac6b` (UTAC000.10 / DEBT-009)

- **Alvo:** `7c5ac6b` — «fix(UTAC000.10): vencedor no AppContext + MercadoLances — resultado oficial (DEBT-009)»
- **Repo:** `C:/Users/Moltbot/Desktop/DESAFIOGUT` (branch `main`)
- **Worktree de validação:** `C:/Users/Moltbot/tmp-utac0010-val/fe` (`git worktree add --detach … 7c5ac6b`)
- **Ambiente:** Windows 10 · git-bash/MSYS · `node v24.14.1` · junctions para `frontend/node_modules` e `frontend/netlify/functions/node_modules`
- **Papel:** REFUTAR (medir, não confirmar). Nada do commit foi tocado na árvore principal; todas as mutações correram no worktree e foram restauradas por `git checkout HEAD -- <ficheiro>` com hash de blob conferido.
- **Âncora (re-medida antes de fechar):** `HEAD` da árvore principal passou `7c5ac6b → 5394b4f` **e foi empurrado a meio da auditoria** (`origin/main = 5394b4f`). O briefing («ainda NÃO pushado») ficou falso a meio. Prova de que o veredicto continua válido sem re-correr nada: `git merge-base --is-ancestor 7c5ac6b origin/main` = **SIM** e `git diff --name-only 7c5ac6b origin/main | grep -vE "_logs|\.md$"` = **vazio** (o commit novo `5394b4f` é só `_logs/`, `CLAUDE.md` e relatórios).

---

## VEREDICTO

# **APROVA (com ressalvas)**

O código **faz exactamente o que a alegação diz**, a suíte fecha **600/600**, não há regressão de comportamento e a interface pública do contexto **não mudou** (provado por diff de chaves). **Nada exige correcção antes do push** — mas a ressalva principal é material: **a correcção é, hoje, invisível para o utilizador**, porque o único consumidor NOVO (`OverlayVencedor` do `MercadoLances`) está atrás de `showOverlay`, e **nenhum código de produção põe `showOverlay = true`** (a linha está comentada desde antes deste commit). Não é um defeito introduzido pelo commit; é uma **premissa do DEBT-009 que não confere** («o overlay mostra esse vencedor» — o overlay não é alcançável).

---

## Foco 1 — «É MESMO A FONTE OFICIAL?» — **CONFIRMADO** (tentativa de refutação falhada)

Cadeia medida de ponta a ponta, por leitura:

```
netlify/functions/_lib/consolidacao.mjs:42   export function apurarMenorUnico(lances)  → menor valor com contagem === 1
netlify/functions/_lib/consolidacao.mjs:83   const apurado = apurarMenorUnico(lances)
netlify/functions/_lib/consolidacao.mjs:117  contrato.consolidarResultado(edicaoId, apurado.vencedor, apurado.menorUnico)
src/utils/web3.js:19                         "function resultados(string) view returns (uint256 menorUnico, address vencedor, bool consolidado)"
src/components/edicao-especial/useResultadoEspecial.js:21   contrato.resultados(edicaoId)
```

O `resultados()` on-chain (mapping público, escrito **só** por `consolidarResultado`) é **o menor único** e é quem decide o vencedor. O `AppContext` passou a expor exactamente esse valor:

`src/context/AppContext.jsx:713-716`
```js
const resultadoOficial = useResultadoOficial(EDICAO_ATIVA);
const vencedor = resultadoOficial
  ? { endereco: resultadoOficial.vencedor, valor: resultadoOficial.menorUnicoCentavos }
  : vencedorLocal;
```

**Unidades:** o ramo oficial usa `menorUnicoCentavos` (`Number(menorUnico)` do mapping, gravado a partir de `l.valorCentavos`); o ramo local usa `lance.valor`, que é **também centavos** — `AppContext.jsx:1310` (`valor: valorCentavos`) e `:799-805` (`valor: lance.valor`, comparação `l.valor === valorCentavos`). Não há erro de unidades ⇒ o overlay divide por 100 nos dois casos. *Tentativa de refutação (divergência de unidade) falhada.*

**Caminhos onde o Provider mostra um vencedor NÃO oficial, com o oficial a existir** (tentativa de refutação):

| caso | mostra | é defeito? |
|---|---|---|
| RPC em baixo / leitura lança | `null` → reserva LOCAL | fail-soft declarado; **igual ao comportamento anterior** (não é regressão). ⚠️ mas é uma **imprecisão da alegação**: «quando existe» depende de ser *legível*, não de existir |
| oficial consolidado há <60 s (a sondagem é de 60 s) | reserva LOCAL até à sondagem seguinte | janela de até 60 s; honesto, mas é uma janela em que o ecrã pode discordar da cadeia |
| transição de edição `A(consolidada) → B(pendente/falhada)` | `null` → reserva LOCAL de B | **comportamento CORRECTO** — o hook guarda o valor com a chave da edição (`useResultadoOficial.js:70/96`) e devolve `null` se `estado.edicaoId !== edicaoId`. Este é o defeito da §1.8 da skill e está **fechado** (herdado do UTAC000.8, re-verificado aqui) |

Nenhum destes é introduzido por este commit. **Nenhum caminho em que o valor oficial seja *substituído* por outro.** Foco 1: nada a refutar.

---

## Foco 2 — «O OVERLAY MOSTRA MESMO O OFICIAL?» — **SIM, no código; sonda adversarial própria abaixo**

Ficheiro de sonda criado só no worktree (não faz parte do commit):
`C:/Users/Moltbot/tmp-utac0010-val/zz-validador-adversarial.test.mjs` (movido para fora de `src/` depois de medido, para a suíte de evidência continuar limpa).

```
$ node --test --test-concurrency=1 src/pages/__tests__/zz-validador-adversarial.test.mjs
✔ A1 · valor em STRING no vencedor (o overlay coage?)            → "R$ 3.00"  (coage; não mente)
✔ A2 · endereco EIP-55 misto: mostra tal-e-qual, sem rebentar    → mostra abrev(EU_EIP); 0× abrev(EU)
✔ A3 · EMPATE local + sem vencedor no contexto: nao inventa      → "Nenhum lance único registrado"; 0× OUTRO; 0× EU
✖ A4 · vencedor = {} (forma malformada): o overlay rebenta?      → REBENTOU: Cannot read properties of undefined (reading 'slice')
✖ A5 · vencedor = { endereco: null, valor: 0 }                   → REBENTOU: Cannot read properties of null (reading 'slice')
✔ A6 · valor = 0 no vencedor oficial (lance de R$0)              → "R$ 0.00" (NÃO cai no ramo «sem vencedor»)
ℹ tests 6 · pass 4 · fail 2
```

**Leitura honesta:**
- A1/A2/A3/A6: a página **não mente**. Não recalcula, não normaliza caixa, não inventa em empate, não confunde valor `0` com ausência.
- **A4/A5 são CRASHES** (`MercadoLances.jsx:71` → `vencedor.endereco.slice(...)` **sem guarda**). **Não são alcançáveis pelo contexto real**: o ramo oficial devolve sempre um `endereco` validado como `0x`+40 hex por `normalizarResultadoOficial` (e o ramo local devolve um objecto-lance que, nos caminhos medidos, tem `endereco`). **É pré-existente** (a linha é do overlay original, não foi tocada) — não é achado contra este commit, é **robustez em falta** a registar. Contraste: o cartão do Dashboard **guarda** (`Dashboard.jsx:410` → `vencedorExibido.endereco ? … : "—"`), o overlay **não**.

---

## Foco 3 — «O MercadoLances NÃO precisou de ser alterado» é verdade? — **SIM**, mas com uma descoberta que MUDA a leitura do commit

Inventário PRÓPRIO (independente do autor), por `grep` a **todos** os ficheiros que fazem `useAppContext()` **e** mencionam `vencedor`, mais `grep` global a `setShowOverlay`/`showOverlay`:

| consumidor do campo `vencedor` do contexto | o que faz | muda o que o utilizador vê? |
|---|---|---|
| `src/pages/MercadoLances.jsx:157/195` → `OverlayVencedor:69` | mostra `vencedor` | **NÃO — inalcançável** (ver abaixo) |
| `src/pages/Dashboard.jsx:65` (`vencedor`) → `:93` reserva de `vencedorExibido` | já tem o **seu próprio** `useResultadoOficial` (`:90`, do UTAC000.9) | **não** — o ramo oficial já era primário antes deste commit; só a **reserva** mudou de valor |
| `src/pages/DetalheProduto.jsx:39` | destrutura e **NUNCA usa** (a l. 268 usa `produto.vencedor`, do servidor) | **código morto confirmado** (`grep -c "\bvencedor\b"` = 2: a destruturação e uma **string** `produto.vencedor`) — SIM, é mesmo código morto |
| `TabelaLances.jsx:62`, `MeusAtivos.jsx:89` | têm o **seu próprio** hook | não consomem o campo do contexto |
| `FimEdicaoOverlay.jsx:11` | prop, vinda de `Dashboard.jsx:516` (`vencedorExibido`) | atrás de `showOverlay` (ver abaixo) |

**Nenhum consumidor que devia mostrar o LOCAL passa a mostrar o OFICIAL.** Não há regressão no Dashboard (a reserva melhorou, o ramo primário é o mesmo).

### ⚠️ DESCOBERTA PRINCIPAL (não declarada no commit nem no relatório): o overlay é INALCANÇÁVEL

```
$ grep -rn "setShowOverlay" src | grep -v __tests__
src/context/AppContext.jsx:206:  const [showOverlay,     setShowOverlay]     = useState(false);
src/context/AppContext.jsx:757:    setShowOverlay(false);
src/context/AppContext.jsx:1205:            // setShowOverlay(true);        ← COMENTADO
src/context/AppContext.jsx:1212:        setShowOverlay(false);
src/context/AppContext.jsx:1325:    setShowOverlay(false);
```

- `setShowOverlay(true)` existe **apenas comentado** (`MC63/64: animação de vencedor desabilitada no front-end`).
- O setter **não é exposto** no `const value` (só `showOverlay,` em leitura) ⇒ nenhuma página pode ligá-lo.
- `{showOverlay && <OverlayVencedor …/>}` (`MercadoLances.jsx:193`) e `{showOverlay && <FimEdicaoOverlay …/>}` (`Dashboard.jsx:514`) **nunca renderizam em produção**.
- **Pré-existente ao commit** — confirmado no ancestral: `git show a122b18:…/AppContext.jsx | grep setShowOverlay` dá a **mesma** lista, com a linha `true` comentada na l. 1189.

**Consequência para a alegação:** «e por isso o `OverlayVencedor` do `MercadoLances` fica correcto sem ser alterado» é **verdadeiro no condicional** (se o overlay renderizasse, mostraria o oficial) mas **não tem efeito observável**: o overlay não renderiza. E o outro consumidor (Dashboard) **já mostrava o oficial desde o UTAC000.9**. Logo: **este commit não altera nenhum pixel do que o utilizador vê hoje.** O que é coerente com a segunda metade da alegação («nada mais mudou no que o utilizador vê») — mas por um motivo diferente do que o commit sugere: não é que «só o overlay mudou»; é que **nada mudou de visível**.

Único delta visível plausível (não medido — necessitaria de um arnês de temporização): no **Dashboard**, o ramo de reserva passou de local→oficial, o que remove o **flash transitório** do vencedor local entre a montagem da página e a resolução do hook próprio (sub-segundo, e só quando o hook do provider já tem valor). Declaro-o como **não medido**, não como ganho.

---

## Foco 4 — «TESTE VÁCULO?» — **o teste é de CONTRATO (declarado) e o A/B MORDE; o CONTROLO é DECORATIVO; e medi uma lacuna de travessia**

### A/B contra o código ANTERIOR (o ficheiro real do `a122b18`)
```
$ git checkout a122b18 -- src/context/AppContext.jsx     # blob 60c1e12… (mudou: SIM)
$ node --test --test-concurrency=1 src/context/__tests__/utac0010-vencedor-contexto.test.mjs
ℹ tests 5 · pass 1 · fail 4
✖ o Provider LÊ o resultado oficial da edição activa
✖ o vencedor exposto é o OFICIAL quando existe, com a forma { endereco, valor }
✖ sem resultado oficial, mantém-se o apuramento local (zero regressões)
✖ CONTROLO: com a correcção revertida (em memória), a regra oficial FALHA e a reserva passa
$ git checkout HEAD -- src/context/AppContext.jsx        # blob 0360b492… (idêntico ao de partida)
```
**4 RED**, não 2. O teste **morde** — não é vácuo. (A 3.ª e a 4.ª morrem porque a regex da reserva exige o literal `vencedorLocal`, que não existe no código antigo.)

### Mutação declarada M10 (a mensagem do commit diz «→ 2 RED») — **medido 1 RED**
```
M10 ENTROU (CRLF=True)     # "const vencedor = vencedorLocal;"
ℹ tests 5 · pass 4 · fail 1
✖ o vencedor exposto é o OFICIAL quando existe, com a forma { endereco, valor }
```
Com esta forma (natural) de M10, «o Provider LÊ o resultado oficial» **continua verde** (o `import` e o `const resultadoOficial = useResultadoOficial(EDICAO_ATIVA);` ficam). **A evidência declarada (2 RED) não reproduz** com a mutação natural; ou o M10 do autor removia também a chamada do hook, ou o número está sobre-declarado. É imprecisão de **evidência**, não defeito de produto (skill §1.6: um conjunto morto declarado é um limite superior errado — mede-se).

### M11 (página re-deriva dos lances locais) — **3 RED, confere exactamente com o declarado**
```
M11 ENTROU (CRLF=True)
ℹ tests 4 · pass 1 · fail 3
✖ overlay de fim de rodada: mostra o vencedor do CONTEXTO (endereço + valor)
✖ ⚠️ NÃO re-deriva dos lances locais (o caso discriminante)
✖ sem vencedor no contexto: o overlay declara que não há lance único (não inventa)
```
Não é arrasto: o caso discriminante (contexto 300/EU vs lista local 100/OUTRO) morre isoladamente.

### O «CONTROLO negativo em memória» — **DECORATIVO como controlo de mordida**
`utac0010-vencedor-contexto.test.mjs:67-73` faz `semComentarios(ler()).replace(/resultadoOficial/g,"NADA")` e assere `doesNotMatch(REGRA_OFICIAL_PRIMEIRO)`. Como `REGRA_OFICIAL_PRIMEIRO` **contém literalmente a subcadeia `resultadoOficial`**, substituí-la por `NADA` garante a não-correspondência **por construção**. É uma **tautologia**: não testa que o instrumento morde; testa que um regex não casa depois de lhe apagarmos o literal. A 2.ª asserção (`assert.match(revertido, REGRA_LOCAL_RESERVA)`) é que tem conteúdo — mas só detecta o **rename** da reserva.

### Lacuna de travessia — MEDIDA (não apenas declarada)
Mutante **M12**: mantém **todo** o texto da regra (todos os 5 regex passam) e desliga a travessia em runtime, sobrescrevendo o vencedor oficial com o local imediatamente antes de o expor:
```js
    : vencedorLocal;
  // M12 (validador): de-wiring em runtime, texto da regra INTACTO
  if (resultadoOficial && vencedorLocal) { vencedor.endereco = vencedorLocal.endereco; vencedor.valor = vencedorLocal.valor; }
```
```
M12 ENTROU (CRLF=True)
ℹ tests 5 · pass 5 · fail 0          ← nenhum teste morreu
```
**5/5 VERDE com a correcção funcionalmente desligada.** É a prova de que o teste de contrato pina o **texto**, não o comportamento — o que o próprio ficheiro declara («Limite declarado: isto não prova comportamento em runtime»). Como o `AppContext` não pode ser renderizado (importa `@privy-io/react-auth`, confirmado em `AppContext.jsx:3`) e o teste da página corre com um **duplo** do contexto, **a travessia `AppContext → página` não tem hoje NENHUMA prova de runtime** — só texto. Aceitável como convenção do repo (o autor declara-o); **a registar como cobertura em falta, não como cobertura aprovada**.

---

## Foco 5 — «RE-RENDER / CUSTO» — **real, mas imaterial; JÁ declarado pelo autor**

Leitura de `src/hooks/useResultadoOficial.js`:
```js
const [estado, setEstado] = useState({ edicaoId: null, resultado: null });
…
const r = normalizarResultadoOficial(await lerResultado(edicaoId));
setEstado({ edicaoId, resultado: r });              // ← objecto NOVO a cada ciclo
if (r && intervalo) { clearInterval(intervalo); }   // ← consolidado: pára de sondar
… intervalo = setInterval(ler, intervaloMs);        // intervaloMs = 60_000
```
- **Sim**: enquanto **não** consolidado, cada sondagem de 60 s cria um objecto **novo** por identidade (`setEstado({…})`) ⇒ `setState` sempre "diferente" ⇒ **re-render do `AppProvider`** e, porque `const value = {…}` (`AppContext.jsx:1344`) **não é memoizado**, de **todos** os consumidores do contexto. Depois de consolidado, o `clearInterval` **para** a sondagem ⇒ o custo é finito e termina.
- **É regressão de desempenho?** Tecnicamente o custo passou de uma página para a raiz da app. **Mas é imaterial**: o re-render já acontece muito mais frequentemente por outros canais (`AppContext.jsx:1157` já faz `setInterval(fetchOnchain, 60_000)`; `:1440` 250 ms; `:1450` **1 s** no `TimerProvider`). Medir o delta exigiria instrumentar contadores de render (não há `react-test-renderer`/`@testing-library` no repo) — **declaro como leitura de código, não como medição de runtime**.
- **Já declarado pelo autor** em `_logs/DEBT.md` (DEBT-009): «o hook faz `setEstado` com objecto novo a cada sondagem ⇒ o Provider re-renderiza a cada 60 s enquanto não consolidado … não corrigido, com as 3 opções medidas no relatório §7.1». Verifiquei a afirmação de forma independente: **procede**. Correcção de uma linha, se algum dia incomodar: guardar `edicaoId` **dentro** do resultado e usar `setEstado(prev => prev.edicaoId === edicaoId && prev.resultado === r ? prev : { edicaoId, resultado: r })`.
- **Custo de I/O — a alegação «acrescenta 1 leitura on-chain read-only por página» está imprecisa.** Call sites de `useResultadoOficial(`: `TabelaLances.jsx:62`, `AppContext.jsx:713` (NOVO, no provider = roda sempre), `Dashboard.jsx:90`, `MeusAtivos.jsx:89`. Como o provider roda em **toda** a app, no Dashboard passam a existir **2** hooks concorrentes (o próprio + o do provider) ⇒ **2** leituras por ciclo de 60 s, não 1; e é 1 por **carregamento da app**, não «por página».

---

## Foco 6 — «DEPENDÊNCIA NOVA?» — **NENHUMA** (confirmado)

```
$ git diff --stat a122b18 7c5ac6b -- desafio-gut/frontend/package.json desafio-gut/frontend/package-lock.json
(vazio)
```
`package.json` **e** `package-lock.json` intocados pelo commit. O hook reutiliza `lerResultadoOnchain` (`useResultadoEspecial.js`, já em produção). ⚠️ **Nota de estado:** a **árvore principal** tem `package-lock.json` modificado (` M desafio-gut/frontend/package-lock.json`) — **não faz parte do commit** (o commit é de 4 ficheiros, nenhum é o lock). É resíduo de outra sessão; declaro-o, não o toco.

Sem ciclo de importações: nenhum módulo da cadeia (`useResultadoOficial → useResultadoEspecial → api.js/web3.js/_estilo-especial.js/network.js`) importa `AppContext` (verificado ficheiro a ficheiro).

---

## Foco 7 — «REGRESSÃO» — **nenhuma**

```
$ node --test --test-concurrency=1 $(find src -name '*.test.mjs' -not -path '*/node_modules/*')
ℹ tests 600 · suites 37 · pass 600 · fail 0 · exit 0        (corrido 2×: antes e depois de remover a minha sonda)
$ node --test --test-concurrency=1 src/context/__tests__/utac0010-vencedor-contexto.test.mjs   → 5/5
$ node --test --test-concurrency=1 src/pages/__tests__/utac0010-mercado-vencedor.test.mjs     → 4/4
```
591→600 fecha a aritmética: +9 testes novos (5+4), zero antigos mudaram de estado. Nenhum teste pré-existente ficou RED.

### Gate objectivo de escopo («nada mais mudou»)
```
$ git diff a122b18 7c5ac6b -- desafio-gut/frontend/src/context/AppContext.jsx | grep "^@@"
@@ -20,6 +20,8 @@     ← só o import
@@ -694,11 +696,25 @@  ← só o bloco do vencedor
```
**2 hunks.** As 2 linhas apagadas são o **rename** `const vencedor = […lancesExibidos]` → `const vencedorLocal = […lancesExibidos]`. Diff global: `18 insertions, 2 deletions` no `AppContext.jsx`, +3 ficheiros de teste = os 4 do commit.

**Chaves da interface pública — idênticas (prova directa de que HI9 se cumpre):**
```
$ (extrair o bloco `const value = { … }` de cada versão, tirar as chaves de topo, ordenar, diff)
CHAVES IDENTICAS (45 chaves)
```
O bloco `const value` (l. 1344-1461) **não está em nenhum hunk** do diff ⇒ nenhuma chave nova, nenhuma renomeada. O `vencedor` continua exposto com o mesmo nome (l. 1408) e a exposição é a **única** leitura de `vencedor` dentro do `AppContext` (`grep -n "\bvencedor\b"` → só comentários + o bloco novo + a linha 1408) ⇒ o vencedor **não** alimenta lógica interna (nem a máquina de fim de leilão, nem pontuação).

---

## Contra-exemplos com reprodução mínima

1. **Overlay inalcançável (a ressalva principal).**
   `grep -rn "setShowOverlay" src/context/AppContext.jsx` → a **única** ocorrência de `true` está comentada (l. 1205); `git show a122b18:…/AppContext.jsx | grep setShowOverlay` mostra o mesmo ⇒ pré-existente. Em `MercadoLances.jsx:193` o overlay depende desse estado ⇒ nunca monta.
2. **Crash do overlay com `vencedor` malformado** (`zz-validador-adversarial.test.mjs`, A4/A5):
   `renderizar({showOverlay:true, vencedor:{}})` → `Cannot read properties of undefined (reading 'slice')` (`MercadoLances.jsx:71`). Pré-existente e não alcançável pelo contexto real; o Dashboard já tem a guarda que falta aqui.
3. **Teste de contrato cego à travessia** (M12): 5/5 verde com a correcção desligada em runtime.
4. **Número de mutação declarado não reproduz** (M10 → 2 RED declarado, **1 RED** medido; A/B → **4 RED**).
5. **`vencedor` morto**: `grep -n "vencedor" src/pages/DetalheProduto.jsx` → l. 39 (destruturação) e l. 268 (`produto.vencedor`, string diferente). Confirmado código morto — o autor declarou-o.

---

## O que um segundo validador deveria tentar (ainda não medido por mim)

1. **Provar a travessia em runtime** — o buraco real deste commit. Um arnês que monte o `AppProvider` **verdadeiro** com duplos dos seus I/O (Privy, Blobs, on-chain) e um consumidor de teste a ler `vencedor` do contexto; ou um teste de integração no browser (Playwright) contra uma edição consolidada em Sepolia. Sem isso, a cablagem `AppContext → página` é só texto (M12 acima).
2. **Medir o flash do Dashboard** com um contador de renders/temporização (o único delta visível que eu consigo conceber): montar o Dashboard com o hook próprio pendente e o do provider resolvido, e comparar `vencedorExibido` antes/depois do commit.
3. **Forçar a ressurreição do overlay** (`showOverlay=true`) e correr os 4 testes de render + os meus A4/A5 — aí o crash do item 2 deixa de ser teórico.
4. **Atacar o `normalizarResultadoOficial` com dados on-chain adversos** (menorUnico `> Number.MAX_SAFE_INTEGER` — o mapping é `uint256`! um lance de valor absurdo devolve `null` e cai na reserva local; é fail-soft correcto, mas vale medir); e `vencedor` com 20 bytes em caixa mista (EIP-55) já normalizado — coberto por leitura, não por teste de runtime.
5. **Medir o custo real** da sondagem de 60 s na raiz com React DevTools/Profiler num build de produção (não há `react-test-renderer` no repo).
6. Re-medir o M10 com a forma de mutação do autor (para saber se o «2 RED» era forma diferente ou sobre-declaração).

---

## Resumo final

- **VEREDICTO: APROVA (com ressalvas).** Nada exige correcção antes do push: o commit é aditivo, medido, sem regressão, com interface pública provadamente intacta (45 chaves idênticas) e suíte **600/600**.
- **Descobertas principais:**
  1. **A correcção é latentemente correcta e presentemente invisível.** O `OverlayVencedor` está atrás de `showOverlay`, que **nenhum código de produção liga** (`setShowOverlay(true)` comentado; setter não exposto) — e o Dashboard **já mostrava** o oficial desde o UTAC000.9. Logo, DEBT-009 fica fechada **no código**, não no ecrã; a premissa do DEBT-009 («o overlay mostra esse vencedor») não confere hoje. **Não é defeito deste commit** (pré-existente, `a122b18` incluído) — é a alegação que está sobre-dimensionada.
  2. **A prova da travessia é textual.** Medi M12: 5/5 verde com a correcção desligada em runtime. O teste de contrato (convenção do repo, declarada) + o duplo do contexto no teste da página deixam `AppContext → página` **sem prova de runtime**. Cobertura em falta, não cobertura aprovada.
  3. **Duas imprecisões de evidência** (não defeitos): «M10 → 2 RED» (medido **1 RED**; o A/B dá 4) e «o CONTROLO negativo em memória» (tautológico). Mais: «1 leitura on-chain por página» é, na verdade, 1 por carregamento da app e **2** no Dashboard. O autor **já declara** o re-render de 60 s (verifiquei: procede), o que é honesto.
- **Precisa de correcção antes do push? NÃO.** O commit já está, aliás, empurrado (`origin/main = 5394b4f`, com `7c5ac6b` ancestral e **zero** diferenças de código entre eles). Se algo merecer seguimento, é **dívida nova, não bloqueio**: (a) decidir se o `showOverlay` volta a ligar — sem isso o UTAC000.10 não tem efeito no utilizador; (b) guardar `endereco` no overlay como o Dashboard faz (`:410`); (c) registar a prova de travessia em runtime como dívida de teste.

### Ficheiros criados / modificados por esta validação (fora do repo)
- `C:/Users/Moltbot/tmp-utac0010-val/VEREDICTO-VALIDADOR.md` (este)
- `…/ab-mutacao.sh`, `…/m12.sh`, `…/run-suite.sh`, `…/zz-validador-adversarial.test.mjs` (sonda, 6 testes: 4 pass / 2 fail)
- `…/ab-antigo.txt`, `…/m10.txt`, `…/m11.txt`, `…/m12.txt`, `…/suite-utac0010.txt`, `…/keys-*.txt`
- **Árvore principal intocada.** `git status` da árvore principal no fim: ` M desafio-gut/frontend/package-lock.json` (resíduo de outra sessão, não meu) + dezenas de `?? _logs/MC1*.md` (também de outras sessões). Nada de `git add`, nada commitado, nada empurrado por mim.


---

# RESPOSTA DO EXECUTOR AO VEREDICTO — 2026-10-02

**Veredicto recebido: APROVA (com ressalvas), «nada exige correcção antes do push».** O validador
fez o trabalho a sério: confirmou a cadeia de ponta a ponta, mediu o A/B, e trouxe **uma descoberta
que eu não tinha** — que muda a leitura do UTAC. Trato cada ponto.

## ⚠️ DESCOBERTA PRINCIPAL (dele): o overlay é INALCANÇÁVEL — e eu tinha aceitado a premissa
Ele mediu: `setShowOverlay(true)` existe **apenas comentado** (`AppContext.jsx` l. 1205;
`MC63/64: animação de vencedor desabilitada no front-end`), o setter **não é exposto** no
`const value`, e os dois overlays (`OverlayVencedor` do `MercadoLances` l. 193 e `FimEdicaoOverlay`
do `Dashboard` l. 514) estão atrás de `{showOverlay && …}` ⇒ **nunca renderizam em produção**.
Confirmou que é **pré-existente** (`git show a122b18:…` dá a mesma lista).

**Consequência, dita sem rodeios:** a frase do DEBT-009 — «o `OverlayVencedor` do fim da rodada
mostra esse `vencedor`» — **não confere**: o overlay não é alcançável. Este commit está **correcto**
(o valor que o Provider expõe passa a ser o oficial) mas **não altera um pixel do que o utilizador
vê hoje**. A minha alegação «fica correcto por arrasto» era verdadeira no condicional e **vazia na
prática** — e eu não a questionei, apesar de ter medido `showOverlay` no UTAC000.9 (o validador
daquele UTAC escreveu-o: «ambos os overlays são gated pelo **mesmo** `showOverlay`»). **O meu
inventário classificou o sítio como «defeito a corrigir» sem verificar se era ALCANÇÁVEL.**
Registado como correcção de conclusão no `DEBT.md` e no `CLAUDE.md`, com a conclusão errada **à
vista** (nunca apagada).

## Foco 4 — as duas precisões de EVIDÊNCIA (tinha razão nas duas)
1. **M10 — «2 RED» é preciso mas ambíguo.** A minha M10 substituiu o **bloco de 4 linhas**,
   incluindo `const resultadoOficial = useResultadoOficial(EDICAO_ATIVA);` ⇒ mata a chamada do hook
   **e** a atribuição ⇒ **2 RED** (testes 1 e 2). A mutação **mínima** (só a atribuição, deixando a
   chamada) dá **1 RED** — medido por ele. Ambas as medições estão certas; o rótulo «M10» é que
   precisava de qualificação. Registado com as duas formas.
2. **A/B contra o ancestral: 4 RED** (o ficheiro real do `a122b18`, corrido por ele) — evidência
   **mais forte** do que a minha (2 RED) e independente. Acrescentada ao registo.
3. **O «CONTROLO negativo em memória» é decorativo** — aceito a crítica: substituir o literal no
   fonte e asserir que o regex (que contém esse literal) não casa **não prova que o instrumento
   morde**; prova que um regex não casa depois de lhe tirarmos o alvo. Os controlos **reais** são a
   mutação no ficheiro e o A/B — que existem e foram medidos. Fica declarado, **não** defendido.
4. **M12 (de-wiring em runtime, texto da regra intacto) → 5/5 VERDE.** É a prova de que o teste de
   contrato pina **texto**, não comportamento — o próprio ficheiro o declara. Como o `AppContext` não
   pode ser renderizado (importa `@privy-io/react-auth`) e o teste da página corre com um **duplo**
   do contexto, **a travessia `AppContext → página` não tem hoje prova de runtime**. **Registado como
   cobertura em falta** (DEBT-010), não como cobertura aprovada.

## Foco 5 — re-render: ele mediu e concorda com o que eu declarei
Real, imaterial, já declarado por mim (o hook re-seta estado com **objecto novo** a cada ciclo de
60 s; o Provider re-renderiza). Não tocado: alterar o hook está **fora do escopo autorizado**.

## Focos 1, 2, 3, 6, 7 — sem ressalva
Fonte oficial (cadeia `apurarMenorUnico` → `consolidarResultado` → `resultados()`) **confirmada**;
«o MercadoLances não precisou de ser alterado» **verdadeiro**; **zero** dependências novas;
**zero** regressões (600/600); **45 chaves** do contexto idênticas (prova de que a interface pública
não mudou — melhor do que a minha alegação, que era qualitativa).

## O que isto muda no fecho do UTAC
O UTAC entregou uma correcção **correcta e sem efeito visível**: o valor exposto pelo Provider deixa
de ser «o que este browser viu». Como o único consumidor novo é inalcançável, o ganho imediato é
**defensivo** (quando/se o overlay for religado, já mostra o vencedor certo) — e **não** um ganho
para o utilizador de hoje. Preferi dizê-lo assim a deixar de pé a narrativa do commit.
