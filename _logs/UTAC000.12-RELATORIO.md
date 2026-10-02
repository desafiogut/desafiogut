# UTAC000.12 — Relatório: DEBT-012 + harness no package.json + worktrees

**Data:** 2026-10-02 · **Executor:** Hermes Agent · **Base real medida:** `8e19ed0` = `origin/main`
**Objectivo:** fechar três resíduos declarados no fecho do UTAC000.11 (agrupados por economia de overhead)
**VEREDICTO: ENTREGUE** — as três frentes medidas, fechadas, com provas e escopo contido.

---

## 1. Frente A — DEBT-012: a guarda do VALOR no card do Dashboard
`src/pages/Dashboard.jsx` l. 416, **antes**: `R$ {(vencedorExibido.valor / 100).toFixed(2)}` — sem
guarda (o **endereço**, l. 410, já a tinha). **Reprodução preservada** (`_logs/UTAC000.12_SEG-1_EVIDENCIA.txt` §2):

| `vencedor` (local) | antes |
|---|---|
| `{}` | **«R$ NaN»** |
| `{ endereco: EU }` (sem valor) | **«R$ NaN»** |
| `{ endereco: EU, valor: NaN }` | **«R$ NaN»** |
| `{ endereco: EU, valor: "abc" }` | **«R$ NaN»** |
| `{ endereco: EU, valor: Infinity }` | **«R$ NaN»** |
| `{ endereco: EU, valor: -1 }` | **«R$ -0.01»** |

**Depois** (1 expressão, ao lado de onde o vencedor é escolhido — Ponytail):
```js
const valorVencedorFmt = Number.isFinite(vencedorExibido?.valor) && vencedorExibido.valor >= 0
  ? `R$ ${(vencedorExibido.valor / 100).toFixed(2)}`
  : "—";
```
mesma regra do UTAC000.11: **malformado = AUSENTE («—»)**; com valor válido **nada muda** (GATE 18 —
o caso válido já passava *antes* da correcção, medido).
**Provas:** **+8 testes** (7 casos em tabela + 1 controlo) → **22/22** no ficheiro (era 14);
suíte **frontend 622/622 VERDE** (era 614/614), backend 967/973; **mutante M14** → **6 RED dirigidos**.

## 2. Frente B — o harness exposto no `package.json`
`desafio-gut/frontend/package.json` não tinha script `test`. Adicionado:
```json
"test": "node ../../scripts/mc966-suite-harness.mjs ambos"
```
⚠️ **O spec deste UTAC indicava `node scripts/mc966-suite-harness.mjs ambos` — caminho que NÃO existe
nesse directório.** O harness vive em **`<repo>/scripts/mc966-suite-harness.mjs`** (medido) e
**auto-localiza-se** por `__dirname`; o caminho `../../scripts/` é o padrão que o próprio ficheiro já
usa (`build:rag`). Corrigido com medição, não com a letra do spec.
**Prova:** `npm test` (corrido no dir do frontend) → `frontend: VERDE 622/622` · `backend: VERDE
967/973` · `VEREDITO: VERDE` · **exit 0**. Diff do `package.json`: **2 inserções, 1 remoção** (sem
reformatação).

## 3. Frente C — os 3 worktrees preservados, limpos **com o trabalho arquivado antes**
Arquivo: **`_logs/UTAC000.12_worktrees-preservados.patch`** (126 linhas, **5 diffs** aplicáveis).

| worktree | edições **locais** (medido) | commits fora do main | destino |
|---|---|---|---|
| `agent-ab397f6377251548e` | nenhuma (só o untracked `_validacao-mc942/`, 1,2 M, transitório) | 0 | removido (pelo git) |
| `angry-faraday-46bb51` | 3 ficheiros: `vite.config.js`, `netlify.toml`, `main.jsx` | 0 | arquivado + removido |
| `ecstatic-almeida-869832` | 2 ficheiros: `Toast.jsx`, `globals.css` | 0 | arquivado + removido |
| `agent-a910933b732937233` (fora do registo) | — | — | removido |

**Distinção que evitou um erro grave:** o `diff` byte-a-byte contra a árvore principal acusava
«146/143/100 linhas» e «539 linhas» — era **o main ter avançado** (1984/2008 ficheiros) desde os HEADs,
**não** trabalho local. O trabalho local real eram 5 ficheiros, e do seu conteúdo: o **CSP já está no
main** (`vite.config.js` tem `127.0.0.1:8545`; `netlify.toml` tem `X-Frame-Options`), o `Toast.jsx` é
um **caminho que já não existe** (a peça vive em `src/widgets/toast/`) e o que resta é uma experiência
de **paleta** (`#f5a623→#ffa500`) de outra sessão + **1 linha** de CORS que o main não tem
(`Access-Control-Allow-Origin = "https://auth.privy.io"`). **Nada se apagou sem estar arquivado.**
**Verificado:** `node_modules` real **505 · 417 (antes == depois)**; `.claude/worktrees/` **3+1 → 0**;
`git worktree list` → só a principal + o scratchpad do Claude em `Temp/` (fora do repo).
**Declarado:** ficam **13 refs** `worktree-agent-*`/`claude/*` (a limpeza de worktree **não** apaga
branches; todas com **0** commits fora do main) — **não apagadas** (não autorizado).

## 4. ⚠️ Erros MEUS de instrumento (declarados)
1. **Mutante inválido (1.ª tentativa):** passei `"...\"R\$ \"..."` pelo shell ⇒ o `\$` **entrou no
   ficheiro** e os «16 RED / 0 pass» foram por o módulo nem carregar (transform falhou). Experimento
   **inválido**; refeito com aspas simples.
2. **Mutante inválido (2.ª tentativa):** substituí só a **1.ª das 3 linhas** do ternário ⇒ linhas
   órfãs ⇒ erro de sintaxe. Corrigido com um mutador próprio (`tmp-utac0008/mutar-m14.py`) que
   substitui o **bloco inteiro** com âncoras em **bytes** e **imprime a linha do mutante** para
   conferência (foi o que faltava nas duas primeiras tentativas).
3. **Medição de bloco sobre-extraída (teste):** o recorte do card ia até ao `<h3` seguinte e contava o
   travessão do texto «🔄 Liderando — pode ser superado» como campo vazio. Corrigido: fim do bloco =
   `</section>`, e os «—» dos **campos** contam-se como `>—<`. (Encontrado com uma sonda própria —
   que bateu na armadilha **A12** quando tentou carregar o React fora da ponte; abandonada em favor
   de fazer o próprio teste imprimir o bloco no erro.)
4. **Correcção de um registo meu anterior:** no UTAC000.10 declarei que o
   `agent-a910933b732937233` tinha «**31 ficheiros**» — eram o **status do repo-pai** (o `git -C`
   subiu a árvore; os caminhos vinham como `../../../…`), **não** trabalho desse worktree. Corrigido
   na `_logs/UTAC000.12_SEG-1_MEDICAO.md` §-1.4.

## 5. Achado NOVO → **DEBT-013**
`src/components/FimEdicaoOverlay.jsx` l. 16 tem **o mesmo defeito** (guarda por **truthiness** no
valor; l. 14 igual para o endereço) e recebe `vencedor={vencedorExibido}` do Dashboard ⇒ mesma
exposição. **Fora do escopo autorizado** ⇒ registado, **não** corrigido. (Em `MercadoLances` o
precedente mostrou que a guarda tem de ser **de tipo**: truthiness não basta.)

## 6. Validador adversarial (obrigatório) — **APROVA (com ressalvas)**
Despachado sobre o commit **`8e17e3a`** (*commit local, ainda NÃO empurrado* — o veredicto fecha
primeiro; correcção de método que declarei no UTAC000.11), em worktree próprio, instruído a **tentar
refutar as três** frentes. Texto integral: `_logs/UTAC000.12_SEG-3_VALIDADOR.md` (ele **esgotou as
iterações antes de gravar o ficheiro** — o conteúdo foi transcrito do resumo final dele, sem uma
palavra alterada, e isso está declarado no cabeçalho do ficheiro).

**As 3 descobertas dele:**
1. **A guarda é MAIS robusta do que eu declarei.** Ele mediu o código **antigo**: **9 «R$ NaN»**,
   **3 valores negativos** e — isto eu não tinha visto — **2 EXCEPÇÕES** (`BigInt(300)`, `Symbol()` →
   o render **rebentava**, página em branco). A guarda elimina os três grupos. Caso válido
   **byte-idêntico** (`300→R$ 3.00`, `1→R$ 0.01`, `0→R$ 0.00`, `12345→R$ 123.45`) ⇒ **GATE 18
   confirmado**. M14 reproduzido com **md5 igual ao meu** e **exactamente 6 RED**. `>= 0` é
   justificável (os dois produtores numerificam; nunca dão negativo).
2. **Refutou 3 afirmações minhas — todas ACEITES** (ver §4 abaixo, ampliada):
   (a) «todas as 13 refs com 0 commits fora do main» é **falso** — `claude/zen-goldberg-ce8759` tem
   **4 commits**; eu generalizei a partir dos 3 worktrees que limpei e **nunca medi as 13** ⇒
   **DEBT-015** (trabalho não integrado de outra sessão: Sepolia + Privy + Netlify, 12 ficheiros,
   +603/−65 — **não perdido**, a branch está lá; e a nota de que *worktree limpo ≠ branch limpa*);
   (b) os números do backend: ele mediu **959/966 + 7 skipped** contra o meu «967/973» — a minha
   medição **2×** em cru dá `tests 973 · pass 967 · fail 0 · skipped 6`, e o harness imprime
   **`pass/tests`**; a diferença é coerente com o flake que **ele próprio** apanhou ⇒ passo a declarar
   os números em cru; (c) «backend» é o rótulo do harness para **`frontend/netlify/functions`** (o
   repo não tem `desafio-gut/backend/`).
3. **DEBT-014 — a suíte do frontend tem um teste FLAKY.** Ele viu `frontend: VERMELHO 1 falha(s)`
   (exit 1) numa corrida e **14 corridas verdes** depois; não conseguiu capturar o nome. **Não é
   atribuível a este commit** (as minhas 3 corridas do dia foram verdes) mas **o `npm test` que este
   UTAC expôs não é determinístico** — é o achado mais valioso do ciclo e fica registado.

**Fecho das ressalvas (2.ª ronda, no mesmo UTAC):** tabela de testes ampliada para **30 casos**
(`0`, `-0`, `0.5`, `MAX_SAFE_INTEGER`, `1e21`, `BigInt`, `Symbol`, `"300"`); a **alteração de
comportamento** em `valor: "300"` (era «R$ 3.00», agora «—») fica **declarada** (é a regra
malformado=ausente; strings não chegam em produção); e a conclusão do relatório foi **corrigida para
cima** (o defeito era mais grave: crash, não só formatação).

## 7. O que este UTAC NÃO fez (declarado)
- **Não** tocou em `FimEdicaoOverlay.jsx` (DEBT-013 fica aberta), nem no contrato, GUTO, Passe,
  Concurso, `_render.mjs`, `_ponte-ssr.mjs`, `vite.config.js`, `useResultadoOficial.js`,
  `MeusAtivos.jsx`, `AppContext.jsx`, `MercadoLances.jsx`, backend.
- **Não** implementou a DEBT-010 (arnês de runtime) nem religou o `showOverlay` (decisões fora do escopo).
- **Não** apagou as 13 refs de branch das sessões antigas (não autorizado).
- **Não** fechou DEBT-001/002/003/005/006/010.

## 8. Ficheiros entregues
| ficheiro | o que |
|---|---|
| `desafio-gut/frontend/src/pages/Dashboard.jsx` | a guarda (`valorVencedorFmt`), md5 `d7066379b7677841169a30ec87f7d3a0` |
| `desafio-gut/frontend/package.json` | `"test": "node ../../scripts/mc966-suite-harness.mjs ambos"`, md5 `a5615f17a6f32f2583f524bf74fabbe3` |
| `desafio-gut/frontend/src/pages/__tests__/Dashboard.test.mjs` | +8 testes (22/22), md5 `a44968610e9f292379d1ef3963d2a4ef` |
| `_logs/UTAC000.12_SEG-1_MEDICAO.md` · `_logs/UTAC000.12_SEG-1_EVIDENCIA.txt` · `_logs/UTAC000.12_SEG-2_ANTES-DEPOIS.txt` · `_logs/utac0012-evidencia.sh` | medição, evidência bruta, antes/depois, script re-executável |
| `_logs/UTAC000.12_worktrees-preservados.patch` | o trabalho das sessões antigas, arquivado antes da limpeza |
| `_logs/DEBT.md` · `CLAUDE.md` · `_logs/UTAC000.12-RELATORIO.md` · `Desktop/UTAC000.12-RELATORIO.md` | registo em 3 lugares (R14/R18) |

## 9. Custo da API (GATE 16) e saldo
**Declaração:** mesma sessão Hermes do ciclo (`20261001_184741_207919`, `cli`) — custo por **diferença**
de leituras do `state.db` (`cost_status = estimated`):

| | input | output | cache-read | ≈ USD |
|---|---|---|---|---|
| leitura no fecho do UTAC000.11 | 678 081 | 396 279 | 117 671 168 | 0,5354 |
| leitura no fecho do UTAC000.12 | 936 347 | 489 611 | 142 890 496 | 0,6683 |
| **diferença = UTAC000.12 (pai)** | **+258 266** | **+93 332** | **+25 219 328** | **≈ 0,1329** |

Mais o **validador adversarial** (subagente `20261001_222127_d41d42`): **US$ 0,0279**.
**⇒ UTAC000.12 ≈ US$ 0,161.**
**Saldo da API (a pedido do operador — novo padrão):** `GET https://api.deepseek.com/user/balance` →
**US$ 1,96** no fecho (era **2,08** no início do UTAC ⇒ consumo real do ciclo ≈ **0,12**;
`is_available: true`).
**Deploy verificado:** bundle `index-CZDR4cNs.js` → **`index-BKCa0d9t.js`** (o push mudou o bundle; site
serve a nova build).
**Limite de tempo (HI5/R18-2):** excedeu as **2 h** — o UTAC teve 3 frentes, 2 erros meus de
instrumento, a 2.ª ronda de testes e o fecho de 3 ressalvas do validador. Declarado: o trabalho
posterior ao limite foi **fecho de ressalvas e registos**, não escopo novo.
