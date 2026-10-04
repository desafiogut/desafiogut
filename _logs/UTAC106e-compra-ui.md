# UTAC106e — UI da compra do Passe (ligar o botão «Comprar Passe Desafio» ao endpoint)

**Tipo:** alteração de UI de frontend (integração com endpoint existente) · **Skill:** `mc-driven-projects` ·
**Data:** 2026-10-04 · **Modelo:** deepseek-v4-flash (Hermes Agent) ·
**HEAD de arranque:** `532698c9578a4d8a5b3680a78cb9dbfbbeb93d86` (= `origin/main`) ·
**Commit do código:** `044c26c`. **Baseline:** `532698c` (fecho do UTAC106d-v2).

> **Objectivo:** ligar o botão «Comprar Passe Desafio R$ 2,00» (que existe na Carteira desde o UTAC106c)
> ao endpoint `POST /comprar-passe-pontos` (que existe e está LIVE desde o UTAC106d-v2): hook
> `useComprarPasse` + balão `ComprarPasseModal` + estados (loading/sucesso/erro) + `idempotencyKey`
> UUID v4 por clique. **Só frontend** — o backend (endpoint, `_lib/passe-pontos.mjs`, Via A) fica intocado.
> ⚠️ HI4/GATE 3/GATE 6 violados por decisão do operador (incorporado); HI5 alargado a 2 h.

---

## §SEG-1 — Baseline

| Item | Medido | Comando |
|---|---|---|
| Data | 2026-10-04 | `date` |
| `HEAD` / `origin/main` | `532698c9578a4d8a5b3680a78cb9dbfbbeb93d86` | `git rev-parse HEAD` |
| Suíte (baseline) | **frontend VERDE 725/725 · backend VERDE 1012/1018** | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| Endpoint LIVE | `POST /comprar-passe-pontos` → **401** (sem token) | `curl -s -o /dev/null -w "%{http_code}" -X POST …` |
| `EM_BREVE_MODE` | **`true`** (`src/lib/leilaoLock.js:10`) | leitura do ficheiro |
| `.bak-*` versionados | **5**, intactos | `git ls-files \| grep "\.bak-"` |
| Bundle em produção (antes) | **`index-CDCJz5rl.js`** · home 200 · health 200 | `curl -s https://silly-stardust-ca71bc.netlify.app/ \| grep -oE 'index-…js'` |
| Saldo da API — arranque | **US$ 6,18** | `curl https://api.deepseek.com/user/balance` |

### SEG-1 — o que o botão fazia (medido ANTES de alterar)

`src/pages/MinhaCarteira.jsx:273-280` — botão `type="button"` com `onClick={() => setPasseAberto(true)}` e
rótulo `Comprar Passe Desafio ${PRECO_PASSE_DESAFIO}` (`PRECO_PASSE_DESAFIO = "R$ 2,00"`, `:17`).
O balão era **inline** (`:350-385`, `<Modal … open={passeAberto}>`, do design system) e «Confirmar» fazia
`setPasseAberto(false); navigate("/ofertas-programadas")` — **não comprava nada** (a compra era deste UTAC).

**Padrão de I/O do repo:** `src/lib/api.js` — `apiPost(path, body, { token })` monta `BASE =
"/.netlify/functions/"`, o `Content-Type` e o `Authorization: Bearer ${token}` (`:25-30,60-69`) e devolve
`{ ok, status, data, text, headers }`. Os componentes NÃO montam `fetch` à mão.
**Token:** a Carteira já compra senhas por `useTrocarPorSenhas` → `getAuthToken()` (JWT `auth-lance`,
assinado pelo Privy, cache 10 min, `hooks/useTrocarPorSenhas.js:33-49`) — é a cadeia de auth do ecrã.
**Toast:** `src/widgets/toast/Toast.jsx` — o componente `Toast` (default export) **posiciona-se sozinho**
(`fixed top-4 left-1/2 -translate-x-1/2 z-[100]`, `:80-86`) e auto-dispensa em 4 s. (O `useToast()` NÃO é
contexto — só o `App.jsx` o usa; por isso o ecrã renderiza `<Toast>` directamente.)

### SEG-1 — guardas do UTAC106c que o 106e NECESSARIAMENTE parte (medido)

| Guarda | Onde | O que fixava |
|---|---|---|
| `onClose={() => setPasseAberto(false)}` / `<Modal … open={passeAberto}` | `utac106c-carteira.test.mjs:96-98` | o balão **inline** |
| `navigate("/ofertas-programadas")` no Confirmar | `:100` | «Confirmar» **navegava** |
| `doesNotMatch(CART, /fetch\(\|apiPost\|…\|comprar-passe/)` | `:108` | a Carteira **não** tinha I/O |
| `CLICAR «Confirmar» NAVEGA para /ofertas-programadas` | `utac106c-carteira-render.test.mjs:182-190` | idem, por render+clique |

Medido: com o código novo, a suíte dá **3 falhas** — exactamente estes guardas. Actualizados **mantendo a
invariante** (§SEG3) e declarados (GATE 3).

---

## §SEG0 — Botão actual (ver §SEG-1: `MinhaCarteira.jsx:273-280` + `:350-385`)

O botão já existia e já abria o balão; o que se acrescenta é o **trabalho** do balão (comprar) e o
**estado** da chamada. Nada da Carteira fora desta zona foi tocado.

---

## §SEG1 — Hook `useComprarPasse` (+ `utils/idempotency.js`)

- `src/utils/idempotency.js` — `gerarIdempotencyKey()`: `crypto.randomUUID()` com fallback
  `getRandomValues` (o repo não tinha gerador — medido: `grep -rn "randomUUID\|uuid" src/` → 0 fora de
  `node_modules`). Formato casa a regex do servidor `^[A-Za-z0-9._:-]{8,200}$`.
- `src/hooks/useComprarPasse.js` — `{ comprar, loading, erro, pontos }`. `comprar()`: gera a chave
  **nova por clique**, `apiPost("comprar-passe-pontos", { idempotencyKey }, { token })`, mapeia
  **201/200 → ok** e **401 → «Sessão expirada» · 402 → «Saldo insuficiente» · 400 → «Pedido inválido» ·
  resto → «Erro do servidor»**; em sucesso faz `refetchSaldoRs()`. **NÃO** escreve no saldo local.
  Reutiliza (por leitura, sem duplicar): `apiPost` (`lib/api.js`), `getAuthToken`
  (`useTrocarPorSenhas` — a cadeia do botão vizinho), `gerarIdempotencyKey`.

## §SEG2 — Balão `ComprarPasseModal`

`src/components/ComprarPasseModal.jsx` — props `{ aberto, onConfirmar, onCancelar, loading, pontos }`.
Reutiliza o `Modal` do design system (overlay, `role="dialog"`+`aria-modal`, spring, **fecho por ESC**).
Texto decidido: **«Vais comprar 1 Passe por R$ 2,00. Ganhas 1 ponto. Continuar?»**. Mostra a progressão
dos pontos quando os há (`pontos → pontos + 1`). No `loading`: **spinner + `aria-busy`** no «Confirmar» e
**ambos os botões desactivados** (`Cancelar` e o fecho por ESC/backdrop ficam inertes — não se abandona
uma compra a meio).

## §SEG3 — Integração na Carteira (+ guardas do 106c)

`MinhaCarteira.jsx`, **só a zona do botão/balão do Passe**:
- novos imports (`useComprarPasse`, `ComprarPasseModal`, `Toast`) e novo estado
  (`passeAberto` mantém o nome; `toastPasse`, `passeSemSaldo`);
- `<ComprarPasseModal …>` substitui o `<Modal>` inline; `onConfirmar` **compra**:
  sucesso → fecha o balão + toast **«1 ponto creditado»**; **402** → toast vermelho
  **«Saldo insuficiente. Carregar agora?»** + atalho **«Carregar agora (PIX)»** (abre o depósito; o toast
  não aceita conteúdo rico, por isso o link vive inline); outro → toast «Erro. Tenta de novo.»;
- **nada mais** da Carteira foi tocado (título, subtítulo, botões Depositar/Trocar/Menor Lance, cards,
  `ComprarFichasModal`).

**Guardas do 106c actualizados (extensão de escopo DECLARADA, GATE 3)** — substituíam a mudança de
contrato por construção (suíte vermelha = ST4 manda PARAR). Mantêm a invariante:
- `utac106c-carteira.test.mjs`: o botão abre o balão ✓; o balão é agora `<ComprarPasseModal>` (aberto/onCancelar)
  e «Confirmar» chama `comprarPasse()`; o guarda «sem I/O» passa a **«sem I/O inline + o ecrã nunca
  referencia o `comprar-passe` da Via A»**;
- `utac106c-carteira-render.test.mjs`: «Confirmar» passa a guardar **«NÃO navega»**; a árvore de
  ELEMENTOS do condutor de cliques ganhou um passo para **descer dentro do `ComprarPasseModal`** (os
  botões do balão deixaram de estar inline no ecrã — o componente é **puro**, por isso chamá-lo não corre
  hooks; o `Modal` do design system NÃO é chamado).

---

## §SEG4 — Testes + mutação

- `src/pages/__tests__/utac106e-compra-passe.test.mjs` — **13 testes** (6 do hook: path+Bearer+corpo,
  chave diferente por clique, 200/201, 401, 402, 400/500; 7 de render: botão, balão com o texto decidido,
  Cancelar fecha, Confirmar compra+fecha+toast, 402→toast+atalho PIX, spinner no loading, progressão de
  pontos). Duplos só nas fronteiras: `_stubs-106e/useTrocarPorSenhas.js` (getAuthToken) + o duplo de
  AppContext já existente + `duploDeFetch` do `_hook-runner`, que deixa correr o **`apiPost` REAL**.
- **Mutação (GATE 7/8)** — `scripts/mc106e-prova-mutacao.mjs` (versionado, reproduzível do repo):
  **8/8 mortos**, RED dirigido, restauro byte-idêntico (md5).

| # | Mutante | Resultado |
|---|---|---|
| MF1 | hook: corpo sem `idempotencyKey` | **RED** (fail 2) |
| MF2 | hook: sem `Bearer` | **RED** |
| MF3 | hook: 402 não mapeado | **RED** |
| MF4 | Carteira: não fecha o balão no sucesso | **RED** |
| MF5 | Carteira: sem toast de sucesso | **RED** |
| MF6 | modal: sem spinner | **RED** |
| MF7 | Carteira: «Confirmar» não chama o hook | **RED** (fail 3) |
| MF8 | util: chave CONSTANTE | **RED** |

---

## §SEG5 — Verificação ponta a ponta

1. **Suíte canónica:** `node scripts/mc966-suite-harness.mjs ambos < /dev/null` →
   **frontend VERDE 739/739 · backend VERDE 1012/1018** (+14 = os testes do 106e; base 725/725).
2. **`vite build`:** `✓ built in 3.28s`.
3. **Verificação ad-hoc** (`hermes-verify-utac106e.mjs` em `%TEMP%`, corrida e removida):
   **12 PASS / 0 FAIL** — teste novo 13/13 (→14 após o fecho de R1); guardas do 106c 20/20; mutação
   8/8 (→9/9); backend **intocado** (`netlify/functions` sem alterações); nenhum `.bak-*` tocado;
   `package.json`/`package-lock` intactos; o endpoint + `_lib` do Passe (Via B **e** Via A) **sem
   alterações vs base**; **nenhuma** linha do resto do ecrã da Carteira removida (0/9 sentinelas:
   título, subtítulo, Depositar, Trocar, Menor Lance, cards, `ComprarFichasModal`, e-mail, `PainelIndicacao`).
4. **Mutação (GATE 7/8):** `scripts/mc106e-prova-mutacao.mjs` → **9/9 mortos** (MF1 MF2 MF3 MF4 MF5 MF6
   MF7 MF8 MF9), RED dirigido, restauro byte-idêntico (md5).

---

## §SEG6 — Validador adversarial

**Veredicto: APROVADO COM RESSALVAS · 0 bloqueadores.** Subagente independente em worktree próprio
(`scripts/worktree-helper.mjs criar … 044c26c`); as **12 hipóteses (a)-(l) foram todas REFUTADAS** por
execução real. Veredicto **verbatim** + resposta: `_logs/UTAC106e_SEG6_VALIDADOR.md`.

3 achados, **todos fechados na mesma ronda** (commit `298ee65`):
- ⚠️ **R1** — corrida no mesmo tick (o guard `if (loading)` lê ESTADO obsoleto) → **fechado com código**:
  guarda por `useRef`; teste novo + **mutante MF9** → RED;
- ℹ️ **R2** — comentários invertidos (erro **meu**) → corrigidos;
- ℹ️ **R3** — «Carregar agora (PIX)» não fechava o balão do Passe → fechado com código.

**Correcções pós-veredicto: NÃO re-validadas** (sem 2.ª ronda); suíte e build re-corridos depois:
**739/739 · 1012/1018 · VERDE**; mutação 9/9.

---

## §SEG7 — Deploy (foreground, GATE 10)

**ANTES:** home 200 · health 200 · bundle **`index-CDCJz5rl.js`**.

**DEPLOY:** `npx netlify deploy --prod` (foreground) → **`✔ Deploy complete`** · build **3m8,6s**.
Unique deploy: `6ac2ccde8e656974ee646b30--silly-stardust-ca71bc.netlify.app`.

| # | Verificação (depois) | Resultado |
|---|---|---|
| 1 | Site responde | **home 200 · health 200** ✅ |
| 2 | **Bundle do frontend MUDOU** | `index-CDCJz5rl.js` → **`index-DB6OZpjL.js`** ✅ |
| 3 | Endpoint do Passe (do 106d-v2) | `POST /comprar-passe-pontos` → **401 `token_ausente`** ✅ |
| 4 | Código do 106e ao vivo (chunk *lazy* `assets/MinhaCarteira-UHbbZ0zW.js`) | **«Vais comprar»**, **«Continuar?»**, **«Carregar agora»**, **`comprar-passe-pontos`** presentes ✅ |
| 5 | Build reproduzível | **sha256 do chunk local == produção** (`07707dc1884da960`) ⇒ a Netlify produziu o MESMO artefacto ✅ |

**⚠️ Efeito colateral medido e REVERTIDO (3.º UTAC seguido — skill §15.i):** o `npm install` do build
alterou `desafio-gut/frontend/package-lock.json` (sha256 `5b40f11c…` → mutado); arquivado **fora do repo**
(`%TEMP%/utac106e-deploy-dirt/`) e **restaurado ao HEAD** (`5b40f11c…`). **Suíte re-corrida depois do
deploy: 739/739 · 1012/1018 · VERDE.**

---

## §SEG8 — Registo, commit e push

**Registo em 3 lugares (R18):** (1) este log + `_logs/UTAC106e_SEG6_VALIDADOR.md` (veredicto verbatim +
resposta); (2) `CLAUDE.md` **bloco R14** (anexado ao EOF em bytes; 4 bytes de controlo intactos,
**0 remoções**); (3) `Desktop/RELATORIO-UTAC106e-COMPRA-UI.txt`.

**Commits:** `044c26c` (código + testes; **o commit validado**) → `298ee65` (fecho dos 3 achados) →
**este** (registo). Push em foreground, ficheiros individuais (**nunca `git add -A`**).

**Extensão de escopo declarada (GATE 3):** o AUTORIZA listava só `src/pages/__tests__/utac106e-compra-passe.test.mjs`;
foram também tocados — por necessidade medida — `src/__tests__/utac106c-carteira.test.mjs` e
`…-render.test.mjs` (guardas que fixavam o comportamento substituído), criado `_stubs-106e/` (duplo de
teste) e `scripts/mc106e-prova-mutacao.mjs` (prova de mutação reproduzível). Nada de produção fora da
zona do Passe.

## §Custo (API) e duração

| Medição | Valor |
|---|---|
| Saldo da API — arranque (1.ª chamada da sessão) | **US$ 6,18** |
| Saldo da API — fecho | **US$ 6,01** |
| **Consumo REAL** | ≈ **US$ 0,17** (inclui a delegação do validador) |
| Duração | ≈ **18:22 → 19:08** ⇒ **≈ 46 min**, dentro do HI5 (2 h) |
