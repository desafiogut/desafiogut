# VEREDICTO — Validador adversarial INDEPENDENTE · UTAC106e (UI da compra do Passe Desafio)

## APROVADO COM RESSALVAS — 0 bloqueadores

Commit validado: `044c26c` (base `532698c`). Worktree adversário: `C:/Users/Moltbot/tmp-utac106e-val/wt`.
Tentativa de derrube das 12 hipóteses (a)–(l). **Todas as 12 foram REFUTADAS por execução real** —
o comportamento alegado confirma-se. Ficam **2 ressalvas ℹ️** (não bloqueadores) de robustez/documentação,
abaixo. Nenhum bloqueador.

---

## Reproduzido por execução (no meu worktree, não na árvore principal)

| Comando | Resultado real |
|---|---|
| `git diff --name-status 532698c 044c26c` | **9 ficheiros** exactamente os declarados (4 NOVOS de produção + 1 stub + 1 teste + 1 script de mutação + `MinhaCarteira.jsx` + 2 testes 106c). Nenhum ficheiro de backend. |
| `node scripts/mc966-suite-harness.mjs ambos < /dev/null` | **`frontend: VERDE 738/738 pass` · `backend: VERDE 1012/1018 pass` · `VEREDITO: VERDE`** (exit 0). +13 vs 725 — confere. |
| `node --test … src/pages/__tests__/utac106e-compra-passe.test.mjs` | **13/13 pass, 0 fail** (TAP). |
| `node scripts/mc106e-prova-mutacao.mjs` | **controlo 33/33 VERDE** · **8/8 PROVADOS** (MF1–MF8) · restauração `md5 IDÊNTICO` nos 4 ficheiros de produção. Worktree limpo depois. |
| `npx vite build` (frontend) | **`✓ built in 3.04s`, exit 0** — o build aceita a remoção do import `Modal` e os novos imports. |
| Sonda própria: `gerarIdempotencyKey()` ×5000 | **5000/5000 distintos**, 0 fora da regex do servidor, todos UUID v4 válidos. |
| Sonda própria: mutação manual **«sem Bearer»** (`{token}`→`{}`) + teste isolado | **12 pass / 1 fail** — o teste MORDE de verdade (não é vácuo), e o worktree ficou limpo após repor. |
| Sonda própria: `git log --oneline -2 -- netlify/functions/comprar-passe-pontos.mjs` | último toque do endpoint = **`8abf84a` (UTAC106d-v2)**, não o `044c26c`. |
| `grep EM_BREVE_MODE src/lib/leilaoLock.js` | **`export const EM_BREVE_MODE = true;`** (intacto, sem diff). |

---

## Tabela de achados e tratamento proposto

| # | Sev | Achado | Tratamento proposto |
|---|---|---|---|
| R1 | ⚠️ | **Corrida de mesmo tick no `useComprarPasse`.** Duas invocações de `comprar()` no MESMO render (guard `if (loading)` lê estado obsoleto do closure) → **2 fetch com 2 chaves distintas** = duplo débito no servidor. Medido: `RACE chamadas fetch = 2`, chaves distintas. Hoje só o `disabled={loading}` do botão trava isto (React descarrega `click` discreto antes do 2.º evento) ⇒ não acessível pelo rato/WebView normal, mas o guard lógico é frágil. | Guarda por `useRef` de «em voo» (`if (emCurso.current) return; emCurso.current=true … finally emCurso.current=false`), independente do timing de render. Só se quiseres endurecer; não é bloqueador. |
| R2 | ℹ️ | **Documentação invertida.** Comentários + nome do teste dizem que o duplo clique «reusa a MESMA chave» / «dois cliques com a MESMA chave = risco de duplo débito». O código faz o OPOSTO (chave NOVA por chamada) — e é a chave única que permitiria duplo débito numa corrida. A idempotência do servidor não protege retries do cliente porque a chave nunca é reusada. | Corrigir comentários (`idempotency.js:4-5`, `useComprarPasse.js:46`, título/asserção do 2.º teste do 106e) para descrever o mecanismo real: «trava pelo `loading`/`disabled`, não pela reutilização da chave». |
| R3 | ℹ️ | **«Carregar agora (PIX)» (402) abre o depósito mas NÃO fecha o balão do Passe** — `onClick` faz `setComprarAberto(true)` sem `setPasseAberto(false)`; ficam dois `Modal` z-[60] empilhados. | Adicionar `setPasseAberto(false)` ao atalho (ou confirmar que dois modais empilhados é intencional). |

---

## Alegações REFUTADAS (tentadas e não conseguidas — o defeito alegado NÃO existe)

- **(a) botão não abre o modal** → REFUTADA. `MinhaCarteira.jsx:285 onClick={() => setPasseAberto(true)}`; teste RENDER abre o balão e vê o texto decidido. Mutação MF7 (Confirmar não chama o hook) e MF4/MF5 caem.
- **(b) modal não fecha ao confirmar (sucesso)** → REFUTADA. `onConfirmar`: `if (r.ok){ setPasseAberto(false); … }`; teste ««Confirmar» COMPRA: fecha o balão…» (13/13). Mutação MF4 (não fecha) → RED.
- **(c) idempotencyKey não é gerado / é constante** → REFUTADA. 5000/5000 distintas, UUID v4, casa a regex `^[A-Za-z0-9._:-]{8,200}$`; mutação MF1 (sem chave) e MF8 (chave constante) → RED. (A _conclusão_ «duplo clique debitaria duas vezes» só é verdadeira numa corrida de mesmo tick — ver R1 — e o _raciocínio_ dado «chave constante» é invertido — ver R2.)
- **(d) Bearer não é passado (401 indevido)** → REFUTADA. `apiPost` injecta `Authorization: Bearer ${token}` (`api.js:28`); teste assere o header exacto; a minha mutação manual «sem Bearer» fez o teste falhar (12/1).
- **(e) 402 não tratado / sem atalho PIX** → REFUTADA. `MSG_POR_STATUS[402]="Saldo insuficiente"`; a Carteira faz toast vermelho «Saldo insuficiente. Carregar agora?» + atalho «Carregar agora (PIX)» que abre `ComprarFichasModal` — que é o modal «💰 Depositar PIX». Teste 402 verde; mutação MF3 → RED.
- **(f) toast de sucesso não aparece** → REFUTADA. `<Toast variant="success" message="1 ponto creditado"/>` (widget do repo, props `{id,variant,message,onDismiss}` compatíveis); teste verde; mutação MF5 → RED.
- **(g) endpoint `comprar-passe-pontos.mjs` alterado** → REFUTADA. Fora do diff; último toque `8abf84a` (106d-v2).
- **(h) `_lib/passe-pontos.mjs` alterado** → REFUTADA. Fora do diff (`_lib/passe.mjs` e `comprar-passe.mjs` também).
- **(i) `MinhaCarteira.jsx` alterado fora da zona do Passe** → REFUTADA. `git diff -U0` dá hunk headers **só** nos imports da zona (linhas 5/6), no bloco de estado do Passe (68/69) e no bloco do balão (346–377). Título, subtítulo, Deposit, Trocar, Menor Lance, cards e `ComprarFichasModal` intactos. A remoção do import `Modal` de `@/components/ui` é segura (não há mais `<Modal>` órfão no ficheiro — verificado por grep + `vite build` OK).
- **(j) algum `.bak-*` tocado** → REFUTADA. Nenhum dos 5 `.bak-*` no diff; `git status` limpo.
- **(k) suíte canónica vermelha** → REFUTADA. **VERDE** (frontend 738/738; backend 1012/1018; exit 0).
- **(l) `EM_BREVE_MODE` desligado** → REFUTADA. `leilaoLock.js:10 = true`, sem diff.

---

## O que NÃO consegui refutar

- O mapeamento de status do hook (201/200→ok, 401/402/400/5xx→mensagem) e a cadeia de auth reutilizada (`getAuthToken` de `useTrocarPorSenhas`, real — confirmada em `hooks/useTrocarPorSenhas.js:33`) resistiram a todas as sondas.
- A não-vacuidade da suíte: a mutação manual independente (Bearer) e os 8 mutantes versionados (com `md5` de restauração) provam que os testes mordem.
- O isolamento declarado (5 `.bak-*` intactos; backend zero toques) resistiu.

## O que não medi

- **DOM real / Capacitor / WebView**: o «clique» é exercido pelo `onClick` da árvore de elementos (limite DECLARADO pelo próprio teste) — sem hit-testing, CSS, foco ou `AnimatePresence` real. O R1 depende exactamente de quão depressa o React descarrega o `disabled`; não corri um browser.
- **Endpoint LIVE**: não fiz `deploy` nem chamei a produção; a integração real (201/402/CAS/concorrência no servidor) não foi exercida por mim (é do UTAC106d-v2, já validado).
- **Os 6 testes backend** que não correram (1012/1018) — não inspeccionei quais nem porquê.
- Os 2 testes 106c modificados: li o diff (guardas actualizados, invariante «sem I/O inline» mantida via `fetch(|apiPost|async function comprar` + `useComprarPasse()`), mas não os mutei individualmente para provar que o guard novo ainda morde.

## Decisão final

**APROVADO COM RESSALVAS.** As 12 hipóteses de defeito (a)–(l) foram todas REFUTADAS com execução real no worktree — a UI da compra do Passe Desafio liga, compra com Bearer + chave nova por clique, fecha no sucesso com toast, trata o 402 com atalho PIX, não toca no backend nem fora da zona do Passe, e a suíte canónica está VERDE. **0 bloqueadores.** Recomendo aceitar o commit; as ressalvas R1 (guarda de corrida por `ref`), R2 (comentários invertidos) e R3 (fechar o balão ao abrir o PIX) são melhorias de robustez/clareza, não impedimentos. Antes de fechar o ciclo, vale corrigir **R2** (barato) e, se houver apetite, **R1**.

---

# RESPOSTA DO EXECUTOR AO VEREDICTO

**Veredicto: APROVADO COM RESSALVAS · 0 bloqueadores.** As 12 hipóteses (a)-(l) foram **todas
REFUTADAS** por execução real. Ficam **3 achados** — todos fechados nesta mesma ronda.

| Achado | Tratamento |
|---|---|
| ⚠️ **R1** — corrida no MESMO tick: o guard `if (loading)` lê **estado** (closure do render antigo) ⇒ dois `comprar()` sem `await` entre eles davam **2 fetch com 2 chaves** = duplo débito latente (hoje travado só pelo `disabled` do botão) | **FECHADO com código** — guarda por `useRef` (`emCurso`), síncrona e independente do timing do render; o 2.º pedido do mesmo tick sai sem tocar na rede. **Teste novo** (corrida no mesmo tick) + **mutante MF9** (remover o ref) → **RED**. Commit `298ee65`. |
| ℹ️ **R2** — documentação invertida: os comentários diziam que o duplo clique «reusa a MESMA chave»; o código faz o oposto (chave NOVA por chamada) | **FECHADO** — comentários corrigidos em `utils/idempotency.js` e `hooks/useComprarPasse.js` e título/asserção do teste reescritos: a chave nova por chamada serve o **RETRY do mesmo pedido**; contra dois pedidos distintos a trava é o **ref**. |
| ℹ️ **R3** — «Carregar agora (PIX)» abria o depósito **sem fechar** o balão do Passe (dois `Modal` z-[60] empilhados) | **FECHADO com código** — o atalho passa a `setPasseAberto(false)` antes de `setComprarAberto(true)`. Commit `298ee65`. |

**Erro do MEU instrumento (declarado, item a item):** o achado R2 é **meu** — escrevi a justificação da
idempotência **ao contrário** (descrevi a chave única como «trava do duplo clique», quando é precisamente
o contrário: chave nova por chamada **não** protege dois pedidos distintos). E o ⚠️ R1 é a **mesma
classe** de defeito que o repo já documentou (um guarda que lê estado obsoleto em vez de um `ref`); o meu
mutador não o apanhava porque **nenhum teste exercia dois `comprar()` no mesmo tick** — a lacuna foi do
meu conjunto de testes, não do validador.

**As correcções NÃO foram re-validadas** (sem 2.ª ronda). Suíte e build re-corridos depois:
**frontend 739/739 · backend 1012/1018 · VERDE**; `vite build` ✓; mutação **9/9**.

**Ressalvas do validador ACEITES como limites declarados:** o «clique» é exercido no `onClick` da árvore
de elementos (sem DOM/hit-testing/CSS — limite que o próprio teste declara); a integração real com o
endpoint em produção (201/402/concorrência no servidor) é do UTAC106d-v2, já validado; os 6 testes
backend que não correm (1012/1018) são pré-existentes ao UTAC106e.
