# DesafioGUT — Relatório Final de Trabalho Beta v1.0

> **Engenheiro-chefe responsável:** Claude Code (Anthropic)
> **Data:** 2026-05-04 | **Commit HEAD:** `2cc8c59`
> **Classificação:** Interno — Confidencial

---

## 1. Sumário Executivo

### O que é

O **DesafioGUT** é uma plataforma digital de leilão pelo **Menor Lance Único** (Art. VIII do regulamento), operada pelo Grupo União e Trabalho (CNPJ 23.040.066/0001-00). O participante registra um valor em centavos: o menor valor que aparecer **exatamente uma vez** vence. Cada participação consome uma senha (R$ 2,00), adquirida via PIX. O sistema opera em duas modalidades:

| Modalidade | Duração | Mecânica de pagamento |
|---|---|---|
| **Flash (Relâmpago)** | 5 minutos | Débita saldo R$ off-chain (blob) |
| **Programado** | 30 minutos | Consome 1 senha on-chain (contrato Sepolia) |

### Estágio atual

O sistema está em **Beta v1.0**, acessível em https://silly-stardust-ca71bc.netlify.app. Todos os fluxos críticos estão implementados e funcionais no testnet Ethereum Sepolia. A última sessão de trabalho fecha o gap de segurança do Lance Relâmpago (autenticação via EIP-191, idempotência server-side) e habilita visibilidade cross-user em tempo real.

### Escala de maturidade: **6,5 / 10**

| Dimensão | Nota | Justificativa |
|---|---|---|
| Autenticação / Auth | 8 | Privy + JWT + EIP-191 — produção validada em 2026-04-30 |
| Pipeline PIX | 7 | Mock 100%; MP sandbox configurado; webhook funcionando |
| On-chain (programado) | 8 | darLance validado end-to-end (tx `0xf5991092…`) |
| Off-chain (flash) | 6 | Wired + auth, pendente smoke-test em produção |
| Segurança | 7 | Auth em lance-relampago, idempotência — comprar-senhas sem auth ainda |
| Real-time cross-user | 6 | Polling 3s implementado; WebSocket futuro |
| UX / UI | 7 | Responsivo, glassmorphism, countdown, revelação de valores |
| Pronto para mainnet | 2 | Sepolia apenas; sem PIX real ativo; sem auditoria de contrato |
| Observabilidade | 6 | Sentry + logs Netlify; sem dashboard de métricas |
| Documentação | 5 | CLAUDE.md + RELATORIO-BETA-FINAL.md; sem OpenAPI |

**Justificativa da nota 6,5:** O sistema cobre o ciclo completo (PIX → saldo → lance → vencedor → nova rodada) com segurança razoável para beta. Os bloqueadores para produção são conhecidos e enumerados na seção 8.

---

## 2. Arquitetura Geral

### Diagrama textual

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER (React SPA)                         │
│  PrivyProvider → AppProvider → Routes → Telas                       │
│  AppContext: estado global, polling, listeners                       │
│  VITE_MOCK_MODE=false (produção)                                     │
└────────────────┬────────────────────────────────────────────────────┘
                 │  HTTPS / fetch / EventSource
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        NETLIFY PLATFORM                              │
│  ┌─────────────────┐   ┌──────────────────────────────────────────┐ │
│  │  CDN / Edge     │   │         Netlify Functions (Node ESM)     │ │
│  │  SPA rewrite    │   │                                          │ │
│  │  CSP / headers  │   │  iniciar-pagamento    (gera JWT + PIX)   │ │
│  │  Cache-Control  │   │  confirmar-pagamento  (verifica MP + R$) │ │
│  └─────────────────┘   │  webhook-mercadopago  (evento MP)        │ │
│                         │  saldo-rs             (GET saldo R$)    │ │
│                         │  lance-relampago      (debita R$ flash) │ │
│                         │  lances-flash         (GET lances blob) │ │
│                         │  auth-lance           (emite JWT EIP)   │ │
│                         │  comprar-senhas       (R$ → senhas)     │ │
│                         │  health / debug-pedido                  │ │
│                         └──────────────┬───────────────────────────┘ │
│                                        │                             │
│  ┌─────────────────────────────────────┴────────────────────────┐   │
│  │                   Netlify Blobs (KV serverless)              │   │
│  │  saldo-rs          saldo-rs-creditos   mp-aprovados          │   │
│  │  lances-relampago  lance-idem          pedidos-meta          │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  eth_call / eth_sendTransaction
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│               ETHEREUM SEPOLIA TESTNET (chainId 11155111)            │
│                                                                     │
│  Contrato LeilaoGUT: 0x273Ef96f5be04601FD39DAcDFB039d6fB552445e    │
│  ├─ darLance(idEdicao, valorEmCentavos)                             │
│  ├─ adicionarSenhas(usuario, quantidade) [coordenacao only]         │
│  ├─ abrirEdicao(idEdicao, nome, duracaoSeg) [coordenacao only]      │
│  ├─ saldoSenhas(address) → uint256                                  │
│  └─ apurarVencedor(idEdicao) → (uint256, address)                   │
│                                                                     │
│  RPC: Alchemy Sepolia (eth-sepolia.g.alchemy.com/v2/...)            │
└─────────────────────────────────────────────────────────────────────┘
                           ▲
                           │  PIX / webhook
┌─────────────────────────────────────────────────────────────────────┐
│                      MERCADO PAGO (sandbox)                          │
│  POST /v1/payment_intents  →  QR Code PIX                           │
│  GET  /v1/payments/:id     →  verifica status                       │
│  Webhook v2 (JSON)         →  notifica `approved`                   │
└─────────────────────────────────────────────────────────────────────┘
                           ▲
                           │  SDK + eventos
┌────────────────────────────────┐    ┌──────────────────────────────┐
│       PRIVY (auth)              │    │         SENTRY               │
│  AppID: cmo51f3v300l90cl…       │    │  Browser tracing 10%         │
│  Google + Email ativos          │    │  Replay on error 100%        │
│  Embedded wallet Sepolia        │    │  Argon2id hash redactado     │
│  signMessage EIP-191            │    │  PII: nenhum campo de        │
│  switchChain(11155111)          │    │  identificação pessoal       │
└────────────────────────────────┘    └──────────────────────────────┘
```

### Tecnologias

| Camada | Tecnologia | Versão | Função |
|---|---|---|---|
| UI | React | 18.3.1 | SPA, componentes |
| Build | Vite | 8.0.8 | Bundle, dev server |
| Estilo | Tailwind CSS v4 | 4.2.2 | Design tokens, utilities |
| Animações | Framer Motion | 12.38.0 | Tabela de lances (layout, AnimatePresence) |
| Auth + Wallet | Privy | 3.22.1 | Login Google/Email, embedded wallet, signMessage |
| Blockchain lib | ethers.js | 6.16.0 | Contract, BrowserProvider, verifyMessage, keccak256 |
| Hash off-chain | hash-wasm | 4.11.0 | Argon2id WASM — prova de intenção do lance |
| Sanitização | DOMPurify | 3.1.6 | XSS em todas as strings vindas do usuário/blockchain |
| Roteamento | react-router-dom | 7.14.2 | SPA routing, NavLink |
| Monitoring | Sentry React | 10.51.0 | Error boundary, tracing, replay |
| Functions runtime | Node.js ESM | 18 | Netlify Lambda (esbuild bundle) |
| JWT | jose | 5.9.6 | HS256 assinar/verificar tokens PIX e lance-auth |
| Blobs | @netlify/blobs | 8.1.0 | KV serverless (saldo R$, lances, idempotência) |
| PIX | Mercado Pago REST | v1 | Sandbox/produção PIX |
| RPC | Alchemy Sepolia | v2 | JSON-RPC para o contrato |
| Smart Contract | Solidity | ^0.8.0 | LeilaoGUT — lógica do leilão |
| Deploy | Netlify | — | Auto-deploy main, Functions, Blobs, CDN |
| Versionamento | GitHub | — | desafiogut/desafiogut, branch main |

---

## 3. Funcionalidades por Tela

### `/` — Dashboard

**O que o usuário vê:**
- Saudação personalizada (userLabel do Privy: nome Google ou email)
- 4 KPIs clicáveis: Saldo R$ (blob saldo-rs), Senhas on-chain, Lances Únicos, Total de Lances
- Card "Edição Ativa" com timer regressivo + tipo de leilão
- Card "Menor Lance Único" (vencedor em tempo real)
- Atalhos para todas as telas

**Integrações:**
- `saldoRsCentavos`: polling 5s via `GET /saldo-rs` (off-chain)
- `saldoSenhas`: leitura on-chain via Alchemy + listener `SenhasCreditadas` + polling 30s
- `lances`: `lancesExibidos` (flash → blob polling 3s; programado → listener on-chain)

---

### `/mercado` — Mercado de Lances

**Componentes principais:** `MercadoLances.jsx` (container), `CardLance.jsx` (formulário), `TabelaLances.jsx` (lista de lances)

**Modo Flash (⚡):**
| Etapa | Descrição |
|---|---|
| Auth (1ª vez) | `signMessage("DESAFIOGUT-AUTH:<ts>:<address>")` → `POST /auth-lance` → JWT 10min cacheado em `useRef` |
| Idempotência | `keccak256(endereco:valor:edicao)` enviado como `idempotencyKey` |
| Débito | `POST /lance-relampago` (Authorization: Bearer JWT) → debita saldo R$ no blob |
| Feedback | Recibo UUID, badge R$ atualiza em até 5s (polling) |
| Cross-user | `GET /lances-flash` polled a cada 3s — todos os participantes veem todos os lances |
| Valores | Ocultos (🔒) até o encerramento, revelados com animação CSS |

**Modo Programado (🎫):**
| Etapa | Descrição |
|---|---|
| Gate | `saldoSenhas[address] > 0` on-chain obrigatório |
| Hash | Argon2id WASM (prova de intenção off-chain) |
| Assinatura | EIP-191 via Privy popup |
| Envio | `darLance(idEdicao, valorEmCentavos)` — decrementa `saldoSenhas` on-chain |
| Feedback | `txHash` + link Etherscan |
| Atualização | Listener `LanceDado` via Alchemy (tempo real para todos) |

**Ciclo de rodada:**
1. Countdown 3→2→1→VAI! (animação overlay fullscreen)
2. Timer regressivo circular (CSS conic-gradient)
3. Encerramento: efeito relâmpago → overlay "LEILÃO ENCERRADO" com Confetti
4. Revelação: coluna Valor revela com animação `gut-reveal` (blur 0 + scale 1)
5. Botão "Nova Rodada" → limpa lances, reinicia ciclo

---

### `/carteira` — Minha Carteira

**O que o usuário vê e faz:**

| Seção | Modo real | Modo MOCK |
|---|---|---|
| Saldo Disponível (R$) | Blob `saldo-rs` · polling via AppContext | carteiraFlash em localStorage |
| Saldo de Senhas | `saldoSenhas(address)` on-chain | fichasProgramadas em localStorage |
| Depositar PIX | Modal → `iniciar-pagamento` → QR Code → polling automático | Botão `+ PIX R$ 10` (simula) |
| Trocar R$ → Senhas | `POST /comprar-senhas` → debita R$, credita on-chain | `converterEmFichas()` local |
| Lance Relâmpago | Navega para `/mercado` em modo Flash | Mesma ação |
| Meus Lances | Filtra `lances` onde `endereco == address` | Idem |
| Dados de pagamento | PIX desafiogut01@gmail.com, BB Ag.181627 | Exibidos mesmo em MOCK |

---

### `/ativos` — Meus Ativos

Exibe o histórico completo de lances da edição ativa com 3 filtros (Todos / Únicos ✅ / Repetidos ❌) e estatísticas (total, únicos, repetidos, menor lance). Lê `lances` do AppContext (que pode ser on-chain ou off-chain dependendo do modo ativo).

---

### `/seguranca` — Segurança

Página informativa com checklist de medidas de segurança implementadas e planejadas, links para Política de Privacidade (iubenda), Regulamento registrado em cartório, e contato do DPO (desafiogut01@gmail.com).

---

### `/configuracoes` — Configurações

Página estática com informações da versão, modo ativo (MOCK/PRODUÇÃO), e configurações do usuário. Interface de suporte.

---

## 4. Modelo de Dados

### 4.1 On-chain — Contrato `LeilaoGUT` (Sepolia)

**Endereço:** `0x273Ef96f5be04601FD39DAcDFB039d6fB552445e`
**Etherscan:** https://sepolia.etherscan.io/address/0x273Ef96f5be04601FD39DAcDFB039d6fB552445e

```solidity
mapping(address => uint256) saldoSenhas;         // senhas disponíveis por wallet
mapping(string  => Edicao)  edicoes;             // edições (ex: "R-1", "P-1")

struct Edicao {
    string   nome;
    bool     ativa;
    uint256  prazo;                               // timestamp Unix de encerramento
    uint256[] listaDeValores;                     // valores distintos lançados
    mapping(uint256 => address) lances;           // valor → último lancador
    mapping(uint256 => uint256) contagem;         // valor → nº de lances
}
```

| Função | Acesso | Descrição |
|---|---|---|
| `darLance(id, valor)` | Público | Consome 1 senha, registra lance. Revert se sem senha / edição inativa / prazo expirado |
| `adicionarSenhas(user, qtd)` | Coordenação | Credita senhas após PIX confirmado |
| `abrirEdicao(id, nome, durSeg)` | Coordenação | Abre rodada com prazo |
| `apurarVencedor(id)` | Coordenação (view) | Retorna menor valor único e seu endereço |
| `saldoSenhas(addr)` | Público (view) | Lê saldo de senhas |
| `coordenacao()` | Público (view) | Endereço da wallet coordenadora |

| Evento | Campos | Uso |
|---|---|---|
| `LanceDado` | idEdicao, lancador, valorEmCentavos, repetido, timestamp | Atualiza TabelaLances em tempo real (programado) |
| `SenhasCreditadas` | usuario, quantidade | Dispara refetchSaldo no AppContext |
| `EdicaoAberta` | idEdicao, nome, prazo | Sincroniza timer no frontend |

**Edição ativa:** `R-1` — aberta em 2026-04-29 via tx `0x1767bffd…ce8e`

---

### 4.2 Off-chain — Netlify Blobs

| Store | Chave | Estrutura | Consistência | Uso |
|---|---|---|---|---|
| `saldo-rs` | `{address.toLowerCase()}` | `{ centavos: number, atualizadoEm: ISO }` | strong | Saldo R$ off-chain por wallet |
| `saldo-rs-creditos` | `{pedidoId}` | `{ pedidoId, endereco, valorCentavos, saldoAntes/Depois, processadoEm, processado: true, fonte }` | strong | Idempotência de créditos PIX |
| `mp-aprovados` | `{pedidoId}` | `{ status, paymentId, capturadoEm, fonte }` | strong | Dedup de webhook MP + cache live-check |
| `lances-relampago` | `{edicaoId}` | `{ lances: [{ lanceId, edicaoId, endereco, valorCentavos, nomeExibicao, saldoAntes/Depois, processadoEm }], atualizadoEm }` | strong | Histórico de lances flash por edição |
| `lance-idem` | `{keccak256(end:val:edicao)}` | `{ lanceId, edicaoId, endereco, valorCentavos, saldoRsAntes/Depois, processadoEm, ok: true }` | strong | Idempotência de lances flash (previne duplo débito) |
| `pedidos-meta` | `{pedidoId}` | `{ pedidoId, endereco, qtd, valorBRL, paymentId?, criadoEm }` | best-effort | Metadados de pedido para webhook creditar sem JWT |

---

### 4.3 Frontend — AppContext (estado global)

```
AppContext.value {
  // Constantes
  MOCK_MODE, EDICAO_ATIVA, DURACAO, LANCES_MOCK, CUSTO_FICHA_BRL

  // Estado do leilão
  tipoLeilao            "flash" | "programado"
  lances                lancesExibidos — derivado abaixo
  prazoTimestamp        Unix timestamp do encerramento da rodada
  encerrado             boolean — timer == 0
  showOverlay           boolean — overlay de vencedor
  showCountdown         boolean — overlay 3-2-1
  tempoRestante         seconds (atualizado a cada 1s)
  lightningActive       boolean — animação relâmpago

  // Saldo on-chain (programado)
  saldoSenhas           number | null — saldoSenhas[address] no contrato
  saldoSenhasStatus     "idle"|"loading"|"ok"|"stale"|"error"
  refetchSaldo          () → Promise<void>

  // Saldo R$ off-chain (flash)
  saldoRsCentavos       number | null — blob saldo-rs
  saldoRsStatus         "idle"|"loading"|"ok"|"stale"|"error"
  refetchSaldoRs        () → Promise<void>

  // Auth (Privy)
  address               0x... | null
  isConnected           boolean
  userLabel             string | null (nome Google ou email)
  ready                 boolean — Privy SDK pronto
  authenticated         boolean
  user                  Privy user object

  // Vencedor
  vencedor              { endereco, valor } | null — menor lance único

  // Handlers
  handleLanceSucesso, handleNovaRodada, abrirModal, desconectar, ...
}

// Fonte de lances por modo:
lancesExibidos = MOCK_MODE    ? lances (localStorage)
               : flash real   ? lancesFlash (blob polling 3s via /lances-flash)
               : programado   ? lances (listener LanceDado on-chain)
```

**Efeitos ativos em produção:**

| Efeito | Frequência | Condição |
|---|---|---|
| `subscribeLanceDado` | event-driven (Alchemy) | `!MOCK_MODE` |
| `subscribeSaldoSenhas` | event-driven (Alchemy) | `!MOCK_MODE && address` |
| Polling guardião saldoSenhas | 30s | `!MOCK_MODE && address` |
| Polling saldoRs | 5s | `!MOCK_MODE && address` |
| Polling lancesFlash | 3s | `!MOCK_MODE && flash` |
| Timer regressivo | 1s | sempre |

---

## 5. Fluxos Principais

### 5.1 PIX → Saldo R$ → Comprar Senhas → Lance Programado

```
Usuário                   Frontend                  Netlify Functions        Blockchain
───────                   ────────                  ─────────────────        ──────────
Login Google          →   Privy auth flow       →   —                    →   —
                          embedded wallet criada
                          address = 0x...

"Depositar PIX"       →   POST /iniciar-pagamento
                          { endereco, qtd }
                                                 →  gera pedidoId
                                                    assina JWT (15min)
                                                    PIX provider
                                                    mock → QR simulado
                                                    MP → QR real
                          exibe QR Code

Paga PIX (real)       →   —                    ←   webhook-mercadopago
                                                    status=approved?
                                                    persiste mp-aprovados:{pedidoId}

polling automático 3s →   POST /confirmar-pagamento
                          { token: JWT }
                                                →   verifica JWT
                                                    verifica MP (blob + live)
                                                    creditarSaldoRsIdempotente()
                                                    saldo-rs: +R$
                          saldoRsCentavos ↑

"Trocar R$ → 1 Senha" →   POST /comprar-senhas
                          { endereco, qtd }
                                                →   lerSaldoRsCentavos
                                                    debitarSaldoRs (−R$ 2,00)
                                                    creditarSenhas()        →  adicionarSenhas(addr, 1)
                                                                               event SenhasCreditadas
                          refetchSaldo()        ←   { txHash, senhasDepois }
                                                →   getSaldoSenhasOnChain
                          saldoSenhas ↑

"Confirmar Lance"     →   verificarRateLimit()
(programado)              hashLance() [Argon2id]
                          signMessage() [Privy]
                          enviarLance()                                     →  darLance("R-1", val)
                                                                               saldoSenhas[addr]--
                                                                               event LanceDado
                          txHash exibido
                          listener LanceDado    ←   —                    ←   LanceDado event
                          tabela atualizada
```

---

### 5.2 PIX → Saldo R$ → Lance Relâmpago

```
Usuário              Frontend (CardLance)          /auth-lance    /lance-relampago    Blob
───────              ────────────────────          ───────────    ────────────────    ────
(já logado,
 tem saldo R$)

"Lance Relâmpago" →  getFlashAuthToken()
  (1ª vez)           signMessage(              →
                       "DESAFIOGUT-AUTH:ts:addr"
                     ) [Privy popup]
                                               →   verifyMessage()
                                                   verifica ts < 5min
                                                   assinarLanceAuth()
                                               ←   { token (JWT 10min) }
                     cache → flashAuthRef

                     idempotencyKey =
                       keccak256(addr:val:edicao)

                     POST /lance-relampago    →
                       Authorization: Bearer JWT
                       { endereco, valorCentavos,
                         idempotencyKey,
                         nomeExibicao }
                                                              →   verificarLanceAuth()
                                                                  JWT.endereco == body.endereco
                                                                  check lance-idem blob
                                                                  debitarSaldoRs()           → saldo-rs: −R$
                                                                  gravra lances-relampago blob
                                                                  grava lance-idem blob
                                                              ←   { lanceId, saldoRsDepois }
                     refetchSaldoRs()
                     saldoRsCentavos ↓

 (outros usuários)   polling /lances-flash   →              ←   lê lances-relampago blob
                     setLancesFlash()                            computa repetido
                     tabela atualiza (3s)
```

---

### 5.3 Ciclo do Leilão (Flash ou Programado)

```
handleNovaRodada()
       │
       ├─ setShowCountdown(true)
       ├─ setLances([]) / setLancesFlash([])
       │
       ▼ (setTimeout 3500ms)
  CountdownOverlay: "3" → "2" → "1" → "VAI! ⚡"
       │ (animação CSS gut-countdown-pop, key=texto para re-trigger)
       ▼
  setPrazoTimestamp(now + 300s)   ← RODADA ATIVA
  setShowCountdown(false)
       │
       ├─ Flash: polling /lances-flash a cada 3s
       │         TabelaLances: valores ocultos (🔒)
       │
       ├─ Programado: listener LanceDado (Alchemy)
       │              TabelaLances: valores ocultos (🔒)
       │
       ▼ timer → 0
  setEncerrado(true)
  setLightningActive(true)        ← animação relâmpago no timer
       │ (setTimeout 1200ms)
  setLightningActive(false)
  setShowOverlay(true)            ← OverlayVencedor + Confetti
       │
       ├─ TabelaLances: valores REVELADOS (animação gut-reveal)
       │  coluna "Valor 🔒" vira "Valor (R$)"
       │  destaque vencedor (beam animation + gut-vencedor blink)
       │
       └─ Usuário clica "🔄 Nova Rodada" → handleNovaRodada()
```

---

## 6. Segurança

### 6.1 Autenticação por camada

| Camada | Mecanismo | Detalhes |
|---|---|---|
| Login usuário | Privy v3.22 | Google OAuth ou OTP e-mail. Cria embedded wallet Sepolia automaticamente. Sem seed phrase exposta. |
| Auth de lance flash | JWT HS256 (`lance-auth`) | Emitido por `/auth-lance` após verificar `signMessage` EIP-191. TTL 10min. Claim `tipo:"lance-auth"` previne reutilização de outros JWTs. |
| Auth de pedido PIX | JWT HS256 (`pedido`) | Emitido por `/iniciar-pagamento`. TTL 15min. Vincula pedidoId/endereco/qtd/paymentId. |
| Operações on-chain programado | EIP-191 signMessage | Assinatura antes de `darLance`. Popup Privy obrigatório ao usuário. |
| Wallet coordenação | `COORDENACAO_PRIVATE_KEY` | Env var Netlify server-only. Nunca exposta no bundle. Usada apenas por functions. |

### 6.2 Proteção de chaves

| Secret | Localização | Exposta ao cliente? |
|---|---|---|
| `JWT_SECRET` | Netlify env vars (server-only) | Não |
| `COORDENACAO_PRIVATE_KEY` | Netlify env vars (server-only) | Não |
| `MP_ACCESS_TOKEN` | Netlify env vars (server-only) | Não |
| `RPC_URL` (Alchemy) | Netlify env vars (server-only) | Não |
| `VITE_PRIVY_APP_ID` | Hard-coded em `main.jsx` (público) | Sim — by design (Privy App ID é público) |
| `VITE_CONTRATO_SEPOLIA` | `.env.production` + Netlify | Sim — endereço de contrato é público |
| `VITE_ALCHEMY_URL` | `.env.production` + Netlify | Sim — URL Alchemy tem API key embutida; risco baixo (read-only, rate-limited) |

### 6.3 Proteções do frontend

| Proteção | Implementação |
|---|---|
| XSS | DOMPurify em todas as strings antes de renderizar; regex para endereços e IDs de edição |
| CSP | `netlify.toml`: `default-src 'self'` + whitelist explícita para Privy, Google, WalletConnect, Alchemy, Sentry |
| Clickjacking | `X-Frame-Options: SAMEORIGIN` |
| MIME sniffing | `X-Content-Type-Options: nosniff` |
| Rate limit | Token bucket client-side: 5 lances/min, cooldown 3s por carteira |
| Input sanitization | `sanitizeLance` (1–999999), `sanitizeAddress` (0x + 40 hex), `sanitizeEdicaoId` (alfanum + hífen, max 20) |
| Gate LGPD | `TermosConsentimento` renderizado antes de qualquer conteúdo; aceite em `sessionStorage` |
| Payload sanitization | `netlify/functions/_lib/validate.mjs`: `validarEndereco`, `validarQuantidadeFichas`, `parseJsonBody` |

### 6.4 Sentry — Captura e PII

| O que é capturado | O que é redactado |
|---|---|
| Exceções de tx (revert, rede, assinatura cancelada) | Hash Argon2id (`argon2id_*` → `[REDACTED:argon2id]`) |
| Tags: idEdicao, wallet (address), chainId, fase, mockMode | — |
| Extras: reasonRaw, valorCentavos, isProgramado | — |
| Session replay (erros): 100% | maskAllText: false (conteúdo visível, sem dados bancários expostos) |
| Session tracing: 10% | — |
| Violações CSP (`securitypolicyviolation`) | — |
| Rejeições não tratadas (`unhandledrejection`) | — |

### 6.5 Idempotência por operação

| Operação | Chave | Store | Resultado de replay |
|---|---|---|---|
| PIX confirmar-pagamento | `pedidoId` (UUID do servidor) | `saldo-rs-creditos` | Retorna `idempotent: true`, mesmo txHash |
| Webhook MP | `pedidoId` | `mp-aprovados` | Ignora duplicata |
| Lance Relâmpago | `keccak256(end:val:edicao)` | `lance-idem` | Retorna recibo existente (200) sem debitar |
| darLance on-chain | N/A (contrato Solidity) | — | Revert ou novo lance (mesmo valor = repetido) |

---

## 7. Infraestrutura e Custos

### 7.1 Provedores

| Provedor | Plano atual | Uso | Custo estimado/mês |
|---|---|---|---|
| **Netlify** | Free / Pro | Hosting SPA, Functions, Blobs, CDN | R$ 0–300 (Free tier suficiente para beta) |
| **Alchemy** | Free (Sepolia) | JSON-RPC, eventos, leituras | R$ 0 (testnet gratuito) |
| **Mercado Pago** | Sandbox | PIX geração/verificação, webhook | R$ 0 (sandbox) |
| **GitHub** | Free | Repositório, auto-deploy | R$ 0 |
| **Sentry** | Free | Error tracking, 5k events/mês | R$ 0 |
| **Privy** | Developer | Auth, embedded wallets | R$ 0 (até 100 MAU) |
| **iubenda** | Free | Políticas de privacidade/cookies | R$ 0 |

**Custo total atual: R$ 0/mês** (beta em testnet com free tiers)

### 7.2 Limites conhecidos

| Limite | Threshold | Impacto |
|---|---|---|
| Alchemy Sepolia CU | 300M CU/mês (free) | Listeners ethers.js consomem ~1 CU/poll. Com 100 usuários ativos + polling 30s = ~170k CU/dia. Seguro. |
| Netlify Functions | 125k invocações/mês (free) | Cada lance flash = 2–3 calls (auth-lance + lance-relampago + saldo-rs). Com 1k lances/dia → ~90k/mês. Seguro. |
| Netlify Blobs | 1 GB storage, 5M reads/mês (free) | Cada poll de lances-flash = 1 read. 100 usuários × 20 polls/min × 60min = 120k reads/h. Pode pressionar o limite em produção real. |
| Privy MAU | 100 (free tier) | Upgrade necessário antes do lançamento público. |
| Sentry events | 5k/mês (free) | Suficiente para beta. Upgrade antes de escalar. |
| Sepolia ETH | Gratuito (faucet) | `coordenacao` precisa de ETH para gas em `adicionarSenhas`. Monitorar saldo. |

---

## 8. Pendências e Riscos

### 8.1 Tabela de pendências

| Prioridade | Item | Arquivo(s) afetado(s) |
|---|---|---|
| 🔴 CRÍTICO | Smoke-test lance-relampago em produção (auth + idempotência wired mas não testado ao vivo) | Manual |
| 🔴 CRÍTICO | `comprar-senhas` sem autenticação — qualquer address pode enviar pedido de compra | `comprar-senhas.mjs` |
| 🟡 ALTA | Habilitar Apple OAuth no painel Privy | Painel Privy |
| 🟡 ALTA | `apurarVencedor()` no contrato é `apenasCoordenacao` — UI não pode exibir vencedor real sem backend | `Leilao.sol` + nova function |
| 🟡 ALTA | Lance Relâmpago não emite evento on-chain → `subscribeLanceDado` não recebe → sem atualização cross-user para lances flash de outros em modo programado simultâneo | `AppContext.jsx` |
| 🟡 ALTA | Idempotência `lance-idem` bloqueia o mesmo valor indefinidamente na mesma edição (sem TTL) — mesmo usuário não pode relançar mesmo valor em nova rodada | `lance-relampago.mjs` |
| 🟡 ALTA | `keccak256` importado de `ethers` no frontend — aumenta bundle size; pode ser substituído por `crypto.subtle` | `CardLance.jsx` |
| 🟠 MÉDIA | PIX real: configurar URL de webhook no painel MP → `https://silly-stardust-ca71bc.netlify.app/.netlify/functions/webhook-mercadopago` | Painel Mercado Pago |
| 🟠 MÉDIA | Variável `VITE_PRIVY_APP_ID` no Netlify Dashboard ainda incorreta (`cmo5113v`) — contornada por hard-code em `main.jsx` | Netlify env vars |
| 🟠 MÉDIA | Lance Flash cross-user via blob polling (3s) — latência máxima 3s; não é WebSocket | `AppContext.jsx` |
| 🟠 MÉDIA | `apurarVencedor()` público (para qualquer leitura) não existe — só view por coordenação | `Leilao.sol` |
| 🟠 MÉDIA | Sem persistência multi-sessão de lances on-chain — tabela começa vazia a cada reload (backfill de eventos não implementado) | `AppContext.jsx`, nova function |
| 🟢 BAIXO | Apple OAuth no painel Privy (Login Methods) | Painel Privy |
| 🟢 BAIXO | ENS / name service para nomes de outros participantes (hoje: endereço abreviado se sem `nomeExibicao`) | `TabelaLances.jsx` |
| 🟢 BAIXO | `debug-pedido.mjs` exposto em produção sem auth — apenas GET de metadados | `debug-pedido.mjs` |
| 🟢 BAIXO | `VITE_ALCHEMY_URL` exposta no bundle (API key embutida) — considerar proxy server-side | `AppContext.jsx`, nova function |

### 8.2 Bugs conhecidos

| Bug | Severidade | Workaround |
|---|---|---|
| Token de auth flash inválido não é limpo automaticamente se o server retornar 401 após expiração acelerada | BAIXA | Usuário tenta de novo; `flashAuthRef` é limpo no `catch` |
| `vencedor` no Dashboard usa lances de todos os modos (on-chain + flash mesclados em `lancesExibidos`) | BAIXA | Separação por `tipoLeilao` na derivação |
| `subscribeLanceDado` — evento pode ser recebido duplicado se o listener for recriado por HMR em dev | DEV ONLY | Dedup por `txHash` no handler |
| Polling `lancesFlash` continua ativo mesmo após encerramento | BAIXA | Parar polling quando `encerrado && showOverlay` |

### 8.3 Riscos para o lançamento

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Race condition em `debitarSaldoRs` (check-then-set sem lock) | Baixa (volume beta) | Duplo débito R$ | Implementar lock otimista com blob metadata |
| Wallet `coordenacao` sem ETH — `adicionarSenhas` falha | Média | PIX confirmado, senhas não creditadas | Monitor de saldo + alerta, reembolso automático em `comprar-senhas` |
| Alchemy RPC down — lances programados não chegam | Baixa | Tabela não atualiza, `saldoSenhas` não lê | Fallback RPC configurado em `web3.js` (publicnode.com) |
| Netlify Blobs lenta (`consistency: "strong"`) | Baixa | Latência > 2s em lances flash | Cache em memória (idem store) |
| Privy API down | Muito baixa | Login bloqueado | Sem workaround (dep crítica) |

---

## 9. Roadmap para Produção

### 9.1 Sepolia → Mainnet

| Etapa | Descrição | Estimativa |
|---|---|---|
| Auditoria do contrato | Revisar `LeilaoGUT.sol` para reentrância, overflow, autorização. Contratar auditor ou usar Slither/Mythril. | 2–4 semanas |
| Deploy Mainnet | `hardhat ignition deploy` na mainnet com `PRIVATE_KEY` mainnet | 1 dia |
| Atualizar envs | `VITE_CONTRATO_SEPOLIA`, `RPC_URL`, `VITE_ALCHEMY_URL` → mainnet | 1 dia |
| ETH real para coordenação | Transferir ETH mainnet para a wallet `coordenacao` (gas para `adicionarSenhas`) | Imediato |
| Remover `apurarVencedor` restriction | Tornar view público para a UI exibir vencedor | 1h |
| Testar ciclo completo mainnet | Rodada controlada com coordenação manual antes do público | 1 semana |

### 9.2 Integrar PIX real (Mercado Pago Produção)

| Etapa | Descrição | Requisito |
|---|---|---|
| Aprovação conta MP Produção | Conta verificada, CNPJ vinculado, acordo de serviços aceito | Comercial |
| `MP_ACCESS_TOKEN` produção | Substituir token sandbox pelo de produção no Netlify | Ops |
| `PIX_PROVIDER=mercadopago` | Flipar env var — único toggle necessário | Ops (sem redeploy) |
| Webhook MP configurado | URL: `https://silly-stardust-ca71bc.netlify.app/.netlify/functions/webhook-mercadopago` · Evento: Pagamentos | Painel MP |
| Smoke test PIX real | Realizar 1 depósito real de R$ 2,00 e confirmar crédito on-chain | QA |
| Monitorar webhook latência | MP envia webhook em ~5s pós aprovação. Polling de 3s no cliente cobre a janela. | Observabilidade |

### 9.3 PWA / Mobile (pós-produção)

| Etapa | Descrição | Dependência |
|---|---|---|
| `manifest.json` + service worker | Instalação nativa no Android/iOS (PWA) | Vite PWA plugin |
| Push notifications | Notificar usuário quando vencer ou quando rodada iniciar | Service worker + VAPID key |
| Capacitor (Ionic) | Build nativo para iOS App Store e Google Play | Revisão Apple (pode bloquear) |
| Deep links | Abrir app direto no lance ao clicar em link externo | Universal Links / App Links |

---

## Apêndice — Variáveis de Ambiente

### Frontend (Vite/build)

| Variável | Valor Produção | Arquivo |
|---|---|---|
| `VITE_MOCK_MODE` | `false` | `.env` |
| `VITE_PRIVY_APP_ID` | `cmo51f3v300l90clgzksivvad` *(hard-coded em main.jsx)* | Netlify + `.env.local` |
| `VITE_CONTRATO_SEPOLIA` | `0x273Ef96f5be04601FD39DAcDFB039d6fB552445e` | `.env.production` + Netlify |
| `VITE_ALCHEMY_URL` | `https://eth-sepolia.g.alchemy.com/v2/qU_kw3...` | `.env.production` + Netlify |
| `VITE_SENTRY_DSN` | DSN do projeto Sentry | Netlify |

### Backend (Netlify Functions — server-only)

| Variável | Uso |
|---|---|
| `JWT_SECRET` | Assina todos os JWTs (pedido PIX + lance-auth) |
| `COORDENACAO_PRIVATE_KEY` | Wallet que chama `adicionarSenhas` on-chain |
| `RPC_URL` | Alchemy Sepolia para as functions |
| `CONTRATO_SEPOLIA` | Endereço do contrato (opcional, tem default) |
| `MP_ACCESS_TOKEN` | Mercado Pago (sandbox ou produção) |
| `PIX_PROVIDER` | `"mock"` (default) ou `"mercadopago"` |

---

## Apêndice — Comandos Úteis

```bash
# Verificar contrato deployado
curl -s -X POST https://eth-sepolia.g.alchemy.com/v2/$ALCHEMY_KEY \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getCode","params":["0x273Ef96f5be04601FD39DAcDFB039d6fB552445e","latest"],"id":1}'

# Smoke test auth-lance (precisa de assinatura válida — usar script)
curl -X POST https://silly-stardust-ca71bc.netlify.app/.netlify/functions/health

# Ver lances flash da edição R-1
curl https://silly-stardust-ca71bc.netlify.app/.netlify/functions/lances-flash?edicaoId=R-1

# Deploy manual (auto-deploy ao push em main)
git push origin main
```

---

*Relatório gerado em 2026-05-04. Para atualizações, consultar `CLAUDE_DEBUG.md` e o histórico git (`git log --oneline`).*
