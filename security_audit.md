# DESAFIOGUT — security_audit.md (Gate de Merge · Superpers)

> Nenhum código entra em produção sem passar por este checklist. Se não estiver sólido,
> **NÃO fazer merge**. Resultado da validação preenchido por revisão; PENDENTE bloqueia.
> Última auditoria: 2026-06-12 (MC20.3). Escopo auditado: redesign frontend MC20.x (UI/UX).

Legenda: ✅ PASS · ⚠️ ATENÇÃO · ⏸️ PENDENTE · N/A não aplicável a esta alteração.

---

## 1. INTEGRIDADE DE TRANSAÇÃO
- [✅] **transaction_uuid único por lance** — flash usa `idempotencyKey = keccak256(address:valorCentavos:edicaoId)` (`CardLance.handleDarLance`), determinístico → reenvio do MESMO lance é idempotente no backend (`lance-relampago.mjs`).
- [✅] **State Lock (anti-duplo-clique)** — `fase ∈ {autenticando,hashing,assinando,enviando}` ⇒ `ocupado=true` ⇒ botão `disabled`. Bloqueia reentrância durante o processamento.
- [✅] **nonce/timestamp** — programado: assinatura EIP-191 + tx on-chain (nonce gerido por ethers/contrato). Flash: token JWT de auth com `ts` no payload (`DESAFIOGUT-AUTH:${ts}:${address}`).
- [✅] **Verdade do saldo** — sempre on-chain (`getSaldoSenhasOnChain` + listeners `LanceDado`/`SenhasCreditadas`). A UI nunca decide saldo (optimistic ADIADO — §5).
- **MC20.x:** o redesign tocou o CTA de lance **apenas visualmente** (`<button>`→`motion.button`, whileTap). `handleDarLance`, idempotência e State Lock **inalterados**. ✅

## 2. ZERO-TRUST
- [✅] **Nenhuma chave secreta no código** — `VITE_PRIVY_APP_ID` é client-id público; segredos (Alchemy/Privy server) ficam em env Netlify, não no bundle.
- [⚠️] **Alchemy URL com API key no client** (`VITE_ALCHEMY_URL`) — exposição inerente a RPC client-side; mitigar com allowlist de domínio/rate-limit no painel Alchemy. (pré-existente, fora do escopo MC20.x)
- [✅] **Rotas de backend autenticadas** — `lance-relampago` exige `Authorization: Bearer <token>` (de `auth-lance`); admin/chatbot usam `authToken`; `_lib/jwt`.
- [✅] **Inputs validados server-side + client-side** — `sanitizeLance` (1–999999), `sanitizeEdicaoId` (DOMPurify + regex); `_lib/validate` no backend; CSP estrita (netlify.toml).
- **MC20.x:** sem novas rotas, sem novos inputs, sem novas chaves. ✅

## 3. RESILIÊNCIA A FALHAS
- [✅] **Tratamento de erro 4xx/5xx** — `CardLance` mapeia 401/429/503 e reverts (`fase=ERRO`), traduz reverts on-chain para PT; Sentry captura (exceto `ACTION_REJECTED`).
- [✅] **Utilizador notificado** — `boxErro`, badges de saldo, banner de sistema pausado; chatbot mostra fallback amigável em 503/429.
- [✅] **Logs com metadados** — Sentry com tags `{idEdicao, wallet, chainId, fase}` + scrub de `argon2id_`; `[GUT-DEBUG]` para CSP/erros/unhandledrejection.
- [✅] **rollback_ui()** — hoje o saldo só muda após confirmação on-chain (não há estado otimista a reverter). `useShakeOnError` (MC20.3) está PRONTO para ligar ao rollback quando o ITEM 10 avançar.
- **MC20.x:** AtmosphereFilter/GutoSpritePlayer degradam graciosamente (`useReducedMotion`, fallback de frame). ✅

## 4. AUDITORIA DE CÓDIGO
- [✅] **Lógica de lance alterada nas últimas 24h?** — Sim, mas **só apresentação** (motion.button). Lógica de negócio/on-chain intacta → teste de concorrência não exigido para esta alteração (sem mudança no caminho transacional).
- [⏸️] **Teste de concorrência (multi-lance simultâneo)** — recomendado ANTES de qualquer mudança REAL no caminho de lance (ex.: ITEM 10). Hoje não há tal mudança. (gate para o ITEM 10)
- [✅] **Código morto / console.log exposto** — sem `console.log` novo introduzido pelo MC20.x; instrumentação existente é `console.info/warn` `[GUT-DEBUG]` (intencional). Imports não usados removidos (ex.: `Layout` em App.jsx).
- [✅] **node --check `.mjs` limpo + build verde** — verificado a cada commit (R7).

## 5. IDEMPOTÊNCIA (R5)
- [✅] **Lance flash** — idempotencyKey determinística (§1) → "disparar 10x executa só a 1ª" no backend.
- [✅] **State Lock UI** — impede reentrância no cliente.
- [✅] **Referral** — registo de `?ref=` idempotente por sessão (`sessionStorage desafiogut_ref` + dedupe no backend `_lib/referral`).
- [⏸️] **Optimistic updates (ITEM 10)** — quando implementado, EXIGE: UUID de operação + reconciliação on-chain + lock até evento confirmar. **Bloqueado neste audit até validação on-chain.**

---

## VEREDICTO DESTA AUDITORIA (MC20.x — redesign UI/UX)
**APROVADO para merge.** O escopo é apresentação (3 camadas, Nav Dock, vidro temperado,
GutoSpritePlayer, parallax) + 1 hook utilitário (`useShakeOnError`) + integração aditiva do
trigger thinking. **Zero alteração ao caminho transacional/on-chain** (R1). Itens ⏸️
(ITEM 7 Mercado Pago, ITEM 10 optimistic, teste de concorrência) ficam como **gates futuros**
e não bloqueiam este merge porque não foram tocados.

---

## VEREDICTO MC21.1 — refundação visual (biblioteca Glass UI + vidro no visitante)
Escopo: **100% apresentação**. (1) `globals.css`: novo `.glass-panel` + migração do `.gut-glass`
para base neutra (white/0.03, blur-off mobile, `backdrop-saturate` corrigido). (2) 10 primitivos
novos em `src/components/ui/` (sem lógica de negócio). (3) `Layout.jsx` rodapé e `MercadoLances.jsx`
3 barras do topo: `background` opaco (0.80–0.92) → vidro neutro.
- **Integridade de transação / idempotência:** N/A — `CardLance`, `web3.js`, idempotencyKey,
  State Lock, EIP-191 **não tocados**. ✅
- **Zero-trust:** sem novas rotas/inputs/chaves. Primitivos são puramente visuais. ✅
- **Auditoria de código:** sem `console.log` novo; sem código morto; `node --check` `.mjs` limpo +
  `npm run build` verde a cada commit; primitivos <100 linhas (R3). ✅
- **Regra de Ouro (arena visível):** validado via MCP como visitante (`/`, `/mercado`, `/carteira`,
  `/vitrine`, `/seja-nosso-parceiro`, chatbot) — arena transparece; CLS=0 (residual 0.008 no
  `/mercado` = cronómetro ao vivo, não o redesign); consola só ruído pré-existente. ✅
- **WCAG AA:** texto do aviso do Mercado clareado (#64748b→#94a3b8) sobre vidro. ✅
- ⏸️ **Pendente (MC21.2):** corporativo/admin + painéis auth-gated + forms profundos — **NÃO**
  validados visualmente (login Privy não automatizável via CDP). Refator desses fica para MC21.2
  com validação autenticada. **Não bloqueiam este PR porque não foram tocados.**

**APROVADO para merge** (escopo entregue). O caminho transacional/on-chain permanece intacto (R1).

---

## VEREDICTO MC23.I — auditoria de design/UX (FASE 1 parcial)
Escopo entregue: **100% apresentação**. (1) `GutoSpritePlayer.jsx`: mood `celebrating` deixa de
fazer loop infinito (`loop=false`) → celebração de vencedor toca UMA vez (ACHADO A2/D2).
- **Integridade de transação / idempotência:** N/A — `CardLance`, `web3.js`, idempotencyKey,
  State Lock, EIP-191 **não tocados**. ✅
- **Zero-trust:** sem novas rotas/inputs/chaves; alteração é um booleano de vídeo. ✅
- **Auditoria de código:** `npm run build` verde (6.91s); sem `console.log` novo; sem código morto. ✅
- **Validação visual (MCP, 375px):** ANTES `loop=true` (infinito); DEPOIS `loop=false`, `ended=true`
  (4s, 1×), e após "Nova Rodada" GUTO volta a `idle.webm` (loop). `prefers-reduced-motion` intacto. ✅
- ⏸️ **Pendente / não bloqueia este escopo:**
  - **D1** (overlays de vencedor empilhados): não reproduzível em dev (edições via Blobs, 404 local) —
    requer ambiente com múltiplas edições para validar sem regressão.
  - **A1** (fallback do chatbot cego ao perfil quando o LLM cai): é **backend** (`chatbot.mjs`) — fora
    do escopo desta branch visual; candidato a MC próprio (MC23.G).
  - **Auditorias 1, 2, 4, 5** (vidro/contraste/layout/primitivos): varredura MCP **não concluída** —
    limitação ambiental (o build nativo rolldown/win32 faz access-violation sob pressão de memória,
    obrigando a fechar o Chrome/MCP antes de cada build; loop MCP↔build instável nesta máquina).

**APROVADO para merge (escopo D2).** O caminho transacional/on-chain permanece intacto (R1). As
auditorias restantes ficam para nova passagem em ambiente estável / com edições reais.
