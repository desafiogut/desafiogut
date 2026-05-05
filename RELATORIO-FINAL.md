# DesafioGUT — Relatório Final de Trabalho

> **Classificação:** Interno — Confidencial  
> **Data de emissão:** 2026-05-05  
> **Versão do sistema:** Beta v1.0 · Commit HEAD `c3c26bd`  
> **Repositório:** github.com/desafiogut/desafiogut · branch `main`  
> **Produção:** https://silly-stardust-ca71bc.netlify.app

---

## 1. Sumário Executivo

### O que é o DesafioGUT

O **DesafioGUT** é uma plataforma digital de leilão pelo critério **Menor Lance Único**, operada pelo Grupo União e Trabalho (CNPJ 23.040.066/0001-00). O mecanismo é definido pelo Art. VIII do regulamento: vence quem registrar o menor valor que apareça **exatamente uma vez** entre todos os lances da rodada.

Cada lance exige uma **senha** (R$ 2,00), adquirida com saldo proveniente de depósito PIX. O sistema opera em dois modos:

| Modalidade | Duração | Custo | Execução |
|---|---|---|---|
| **⚡ Relâmpago (Flash)** | 5 min | Debita saldo R$ off-chain | Netlify Blobs |
| **🎫 Programado** | 30 min | Consome 1 senha on-chain | Contrato Ethereum |

O projeto está em **Beta v1.0 no testnet Sepolia**. Todos os fluxos principais foram implementados e validados. A sessão mais recente fechou os gaps de segurança críticos: autenticação via EIP-191 no Lance Relâmpago, idempotência server-side e visibilidade cross-user em tempo real.

### Escala de Maturidade: **6,5 / 10**

| Dimensão | Nota | Justificativa |
|---|---|---|
| Autenticação | 8 | Privy + JWT HS256 + EIP-191 + lance-auth. Validado em produção em 2026-04-30. |
| Pipeline PIX | 7 | Mock 100% funcional. MP sandbox configurado. Webhook operando. PIX real gated por `PIX_PROVIDER`. |
| Lance Programado (on-chain) | 8 | `darLance` validado ponta a ponta (tx `0xf5991092…`). Listener, polling, gate de saldo. |
| Lance Flash (off-chain) | 7 | Wired com auth + idempotência (commit `2cc8c59`). Pendente smoke-test em produção. |
| Segurança | 7 | Auth em `lance-relampago`. `comprar-senhas` ainda sem auth (baixo risco por design). |
| UX / Dinamismo | 7 | Countdown 3-2-1, revelação de valores, cross-user polling 3s, responsivo mobile/desktop. |
| Observabilidade | 6 | Sentry ativo. Logs Netlify Functions. Sem dashboard de métricas de negócio. |
| Pronto para mainnet | 2 | Sepolia testnet. Sem auditoria do contrato. PIX real não ativado. |
| Cobertura de testes | 2 | Playwright instalado. Nenhum teste automatizado escrito. |
| Documentação | 7 | CLAUDE.md + CLAUDE_DEBUG.md + este relatório. Sem OpenAPI das functions. |

**Bloqueadores para lançamento público:** auditoria do contrato, ativação PIX real, upgrade do plano Privy (acima de 100 MAU), e migração para mainnet.

---

## 2. Arquitetura Geral

### Diagrama de Sistema

```
┌────────────────────────────────────────────────────────────────────────────┐
│                            BROWSER (React 18 SPA)                          │
│                                                                            │
│  PrivyProvider (Google / Email / embedded wallet Sepolia)                  │
│    └─ AppProvider (estado global: lances, saldos, timer, auth)             │
│         └─ Routes                                                          │
│              ├─ / Dashboard     ├─ /mercado  MercadoLances                │
│              ├─ /carteira       ├─ /ativos   MeusAtivos                   │
│              ├─ /seguranca      └─ /configuracoes                         │
│                                                                            │
│  Polling contínuo:                                                         │
│    saldoRs      5s  │  saldoSenhas guardião  30s  │  lancesFlash  3s       │
│  Listeners ethers.js: LanceDado (on-chain) · SenhasCreditadas             │
└────────────────┬──────────────────────────────────────┬────────────────────┘
                 │  HTTPS / fetch                        │  EIP-1193 / ethers
                 ▼                                       ▼
┌────────────────────────────────┐       ┌──────────────────────────────────┐
│       NETLIFY PLATFORM         │       │   ETHEREUM SEPOLIA (chainId      │
│                                │       │   11155111)                      │
│  CDN / SPA rewrite             │       │                                  │
│  CSP · X-Frame · Cache-Control │       │  Contrato LeilaoGUT              │
│                                │       │  0x273Ef96f5be04601FD39…         │
│  Netlify Functions (Node ESM)  │       │                                  │
│  ├─ auth-lance           (POST)│       │  darLance(id, valor)             │
│  ├─ iniciar-pagamento    (POST)│       │  adicionarSenhas(addr, n)        │
│  ├─ confirmar-pagamento  (POST)│◄──────│  saldoSenhas(addr) → uint256     │
│  ├─ webhook-mercadopago  (POST)│       │  abrirEdicao(id, nome, dur)      │
│  ├─ saldo-rs              (GET)│       │  apurarVencedor(id) [coord only] │
│  ├─ lance-relampago      (POST)│       │                                  │
│  ├─ lances-flash          (GET)│       │  Events: LanceDado               │
│  ├─ comprar-senhas       (POST)│       │          SenhasCreditadas        │
│  └─ health / debug-pedido     │       │          EdicaoAberta            │
│                                │       │                                  │
│  Netlify Blobs (KV strong)     │       │  RPC: Alchemy Sepolia            │
│  ├─ saldo-rs                   │       └──────────────────────────────────┘
│  ├─ saldo-rs-creditos          │
│  ├─ mp-aprovados               │       ┌──────────────────────────────────┐
│  ├─ pedidos-meta               │       │       MERCADO PAGO               │
│  ├─ pedidos-pagos              │       │  POST /v1/payment_intents (PIX)  │
│  ├─ lances-relampago           │◄──────│  GET  /v1/payments/:id           │
│  └─ lance-idem                 │       │  Webhook → nossa function        │
└────────────────────────────────┘       └──────────────────────────────────┘

         ┌──────────────────────┐         ┌──────────────────────┐
         │      PRIVY           │         │       SENTRY         │
         │  Auth OAuth Google   │         │  Error boundary      │
         │  OTP e-mail          │         │  Tracing 10%         │
         │  Embedded wallet     │         │  Replay on-error 100%│
         │  signMessage EIP-191 │         │  Argon2id redactado  │
         └──────────────────────┘         └──────────────────────┘
```

### Pilha Tecnológica

| Camada | Tecnologia | Versão | Papel |
|---|---|---|---|
| SPA | React | 18.3.1 | Componentes e estado |
| Build | Vite | 8.0.8 | Bundle, dev server, HMR |
| CSS | Tailwind CSS v4 | 4.2.2 | Utilitários + design tokens |
| Animações | Framer Motion | 12.38.0 | Tabela de lances, transições |
| Auth + Wallet | Privy | 3.22.1 | Login, embedded wallet, signMessage |
| Blockchain | ethers.js | 6.16.0 | Contract, Provider, keccak256, verifyMessage |
| Hash | hash-wasm | 4.11.0 | Argon2id WASM — prova de intenção off-chain |
| Sanitização | DOMPurify | 3.1.6 | XSS em strings do usuário e da blockchain |
| Roteamento | react-router-dom | 7.14.2 | SPA routing |
| Monitoramento | Sentry React | 10.51.0 | Error boundary, tracing, session replay |
| Runtime Functions | Node.js ESM | 18 | Netlify Lambda (esbuild) |
| JWT | jose | 5.9.6 | HS256 — tokens PIX e lance-auth |
| Blob storage | @netlify/blobs | 8.1.0 | KV serverless (saldos, lances, idempotência) |
| PIX | Mercado Pago REST | v1 | Geração de QR Code, verificação, webhook |
| RPC | Alchemy Sepolia | v2 | JSON-RPC e event listeners |
| Smart contract | Solidity | ^0.8.0 | LeilaoGUT — regras do leilão |
| Deploy | Netlify | — | CDN, auto-deploy, Functions, Blobs |

---

## 3. Funcionalidades por Tela

### `/` — Dashboard

**O que o usuário vê:**
- Saudação personalizada: nome Google (via `user.google.name`) ou email
- Quatro KPIs clicáveis navegam para a tela correspondente:

| KPI | Fonte | Atualização |
|---|---|---|
| Saldo R$ | Blob `saldo-rs` via `GET /saldo-rs` | Polling 5s (AppContext) |
| Senhas | `saldoSenhas(address)` on-chain | Listener `SenhasCreditadas` + polling guardião 30s |
| Lances Únicos | `lancesExibidos.filter(!repetido).length` | Tempo real (listener/polling) |
| Total Lances | `lancesExibidos.length` | Tempo real |

- **Card "Edição Ativa"**: timer regressivo `MM:SS`, tipo do leilão, botão "Ir para o Mercado de Lances"
- **Card "Menor Lance Único"**: vencedor provisório em tempo real (endereço abreviado + valor em R$)
- **Atalhos rápidos**: 6 botões de navegação

---

### `/mercado` — Mercado de Lances

Tela principal da experiência de jogo. Composta por:

**Header**: logo, timer circular (CSS conic-gradient com `tempoRestante/duracao`), área de auth (botão "Entrar" ou badge endereço + saldo)

**Painel de saldos** (só MOCK_MODE): Flash R$, Fichas, botões "+ PIX R$ 10" e "→ 1 Ficha"

**Seletor de modo**: ⚡ Relâmpago | 🎫 Programado

**CardLance** — formulário de lance:

| Aspecto | Modo Flash (real) | Modo Programado (real) | MOCK |
|---|---|---|---|
| Gate de saldo | `saldoRsCentavos >= valorCentavos` | `saldoSenhas > 0` on-chain | localStorage |
| Auth do lance | JWT `lance-auth` (10min, EIP-191) | EIP-191 + darLance on-chain | — |
| Idempotência | `keccak256(addr:val:edicao)` → blob `lance-idem` | Contrato Solidity | — |
| Pipeline visual | 🔐 Autenticando → ⚡ Creditando | Argon2id → Privy sign → on-chain | 3 passos animados |
| Resultado | UUID recibo (`lanceId`) | `txHash` + link Etherscan | UUID fake |
| Atualização saldo | `refetchSaldoRs()` imediato | Listener `LanceDado` → `refetchSaldo()` | — |

**TabelaLances** — lista de lances da rodada:

| Estado | Comportamento |
|---|---|
| Rodada ativa | Coluna valor mostra 🔒 (oculto para todos) |
| Encerramento | Valores revelados com animação CSS `gut-reveal` (blur → foco, scale 0.94 → 1) |
| Vencedor | Linha com beam animado + badge 🏆 piscando (`gut-vencedor`) |
| Flash (real) | Dados vêm de `GET /lances-flash` polling 3s — cross-user |
| Programado (real) | Dados vêm do listener `subscribeLanceDado` via Alchemy |

**OverlayVencedor**: aparece quando `encerrado=true`, exibe Confetti + modal com endereço/valor vencedor + botão "🔄 Nova Rodada"

**CountdownOverlay**: exibido 3,5s antes de cada rodada (3→2→1→VAI! ⚡), animação CSS `gut-countdown-pop` com `key={texto}` para re-trigger por texto

---

### `/carteira` — Minha Carteira

| Seção | Modo real | Modo MOCK |
|---|---|---|
| Saldo Disponível R$ | Blob `saldo-rs` · polling AppContext | `carteiraFlash` localStorage |
| Saldo de Senhas | `saldoSenhas` on-chain | `fichasProgramadas` localStorage |
| Depositar PIX | Modal `ComprarFichasModal` → `iniciar-pagamento` → QR Code → polling automático → crédito automático | Botão `+ PIX R$ 10` (simula) |
| Trocar R$ → Senhas | `POST /comprar-senhas` (debita R$, credita on-chain) | `converterEmFichas()` local |
| Lance Relâmpago | Navega `/mercado` com `tipoLeilao = "flash"` | Mesma ação |
| Meus Lances | Filtra `lancesExibidos` onde `endereco == address` | Idem |
| Dados de pagamento | PIX desafiogut01@gmail.com · BB Ag. 181627 CC 847534 | Exibidos |

**ComprarFichasModal** — 3 etapas:
1. **Quantia**: preset 1/5/10 ou campo livre (1–100 senhas)
2. **Pagamento**: QR Code PIX + código copia-e-cola + polling automático 3s/15min (`confirmar-pagamento`). Sem botão manual "Já paguei" — crédito 100% automático.
3. **Sucesso**: R$ creditado + diferença de saldo Antes/Depois

---

### `/ativos` — Meus Ativos

- Exibe histórico de `lancesExibidos` com 3 filtros: Todos / ✅ Únicos / ❌ Repetidos
- Stats: total, únicos, repetidos, menor lance da rodada
- Filtra por `address` quando logado; mostra todos quando deslogado
- Lê `lances` do AppContext (automático conforme o modo ativo)

---

### `/seguranca` — Segurança

Checklist com status de 8 itens de segurança implementados ou planejados:

| Item | Status |
|---|---|
| Argon2id (hash-wasm WASM) | ✅ ok |
| EIP-191 (Privy embedded wallet) | ✅ ok |
| Rate Limit 5 lances/min | ✅ ok |
| DOMPurify + regex | ✅ ok |
| Compliance LGPD / GDPR | ✅ ok |
| HTTPS / TLS 1.3 | ✅ ok |
| Autenticação 2FA / passkey | 🔜 em breve |
| Auditoria on-chain Etherscan | 🔜 em breve |

Links: Política de Privacidade (iubenda), Cookies, Regulamento RTD (registrado em cartório), contato DPO.

---

### `/configuracoes` — Configurações

- Preferências de notificação (3 toggles: lances, vencedor, PIX) — UI apenas, sem persistência server-side
- Seletor de idioma (pt-BR padrão) e tema (dark padrão) — UI apenas
- Informações da conta: endereço conectado, nome/email Privy, indicador MOCK_MODE
- Botão "Salvar Preferências" (feedback visual 2,5s, sem chamada de API)

---

## 4. Modelo de Dados

### 4.1 On-chain — Contrato `LeilaoGUT` (Sepolia)

**Endereço:** `0x273Ef96f5be04601FD39DAcDFB039d6fB552445e`  
**Edição ativa:** `R-1` (aberta em 2026-04-29 · tx `0x1767bffd…ce8e`)

```solidity
mapping(address => uint256) public saldoSenhas;
mapping(string  => Edicao)  public edicoes;

struct Edicao {
    string   nome;
    bool     ativa;
    uint256  prazo;                      // Unix timestamp
    uint256[] listaDeValores;
    mapping(uint256 => address) lances;  // valor → último lancador
    mapping(uint256 => uint256) contagem;// valor → total de lances
}
```

| Função | Acesso | Comportamento |
|---|---|---|
| `darLance(id, valor)` | Público | Requer `saldoSenhas > 0`, edição ativa, prazo válido. Decrementa 1 senha. Emite `LanceDado`. |
| `adicionarSenhas(addr, qtd)` | `apenasCoordenacao` | Credita senhas pós-PIX. Emite `SenhasCreditadas`. |
| `abrirEdicao(id, nome, dur)` | `apenasCoordenacao` | Cria edição com `prazo = block.timestamp + dur`. |
| `apurarVencedor(id)` | `apenasCoordenacao` (view) | Percorre `listaDeValores`, retorna `(menorUnico, ganhador)`. |
| `saldoSenhas(addr)` | Público (view) | Lê saldo atual. |
| `coordenacao()` | Público (view) | Endereço da wallet coordenadora. |

| Evento | Campos | Consumidor |
|---|---|---|
| `LanceDado` | idEdicao, lancador, valorEmCentavos, repetido, timestamp | `subscribeLanceDado` → `setLances` em AppContext |
| `SenhasCreditadas` | usuario, quantidade | `subscribeSaldoSenhas` → `refetchSaldo` em AppContext |
| `EdicaoAberta` | idEdicao, nome, prazo | (não consumido ativamente — `getEdicaoPrazo` lê on-demand) |

---

### 4.2 Off-chain — Netlify Blobs

| Store | Chave de acesso | Estrutura JSON | Consistência | Mutado por |
|---|---|---|---|---|
| `saldo-rs` | `endereco.toLowerCase()` | `{ centavos: number, atualizadoEm }` | strong | `confirmar-pagamento`, `webhook-mp`, `comprar-senhas`, `lance-relampago` |
| `saldo-rs-creditos` | `pedidoId` (UUID) | `{ pedidoId, endereco, valorCentavos, saldoAntes, saldoDepois, processado: true, processadoEm, fonte }` | strong | `creditarSaldoRsIdempotente` (previne duplo crédito PIX) |
| `mp-aprovados` | `pedidoId` | `{ status:"approved", paymentId, capturadoEm, fonte }` | strong | `webhook-mercadopago`, `confirmar-pagamento` |
| `pedidos-meta` | `pedidoId` | `{ endereco, qtd, valorBRL, paymentId?, criadoEm }` | strong | `iniciar-pagamento` (webhook lê para descobrir destino) |
| `pedidos-pagos` | `pedidoId` | `{ pedidoId, endereco, qtd, txHash, blockNumber, gasUsed, saldoAntes, saldoDepois, contrato, etherscanUrl, processadoEm, fonte }` | strong | `creditarPedidoIdempotente` (previne duplo crédito on-chain) |
| `lances-relampago` | `edicaoId` | `{ lances: [{ lanceId, edicaoId, endereco, valorCentavos, nomeExibicao, saldoAntes, saldoDepois, processadoEm }], atualizadoEm }` | strong | `lance-relampago` (append por lance) |
| `lance-idem` | `keccak256(end:val:edicao)` | `{ lanceId, edicaoId, endereco, valorCentavos, nomeExibicao, saldoRsAntes, saldoRsDepois, processadoEm, ok: true }` | strong | `lance-relampago` (previne duplo débito flash) |

---

### 4.3 Frontend — AppContext (estado global)

```
AppContext.value {
  // Constantes de configuração
  MOCK_MODE       boolean        // VITE_MOCK_MODE==="true"
  EDICAO_ATIVA    "R-1"
  DURACAO         { flash: 300, programado: 1800 }  // segundos (real)
  CUSTO_FICHA_BRL 2.00

  // Estado do leilão
  tipoLeilao      "flash" | "programado"
  lances          lancesExibidos (derivado — ver abaixo)
  prazoTimestamp  Unix timestamp (encerramento da rodada)
  encerrado       boolean
  showOverlay     boolean (overlay vencedor)
  showCountdown   boolean (countdown 3-2-1)
  tempoRestante   number (segundos, tick a cada 1s)
  lightningActive boolean (animação relâmpago)

  // Saldo on-chain (programado)
  saldoSenhas        number | null
  saldoSenhasStatus  "idle"|"loading"|"ok"|"stale"|"error"
  refetchSaldo       () → Promise<void>

  // Saldo R$ off-chain (flash)
  saldoRsCentavos  number | null
  saldoRsStatus    "idle"|"loading"|"ok"|"stale"|"error"
  refetchSaldoRs   () → Promise<void>

  // Auth (Privy)
  address          "0x..." | null
  isConnected      boolean
  userLabel        string | null  // nome Google ou email
  ready            boolean (Privy SDK inicializado)

  // Vencedor
  vencedor  { endereco, valor } | null  // menor lance único de lancesExibidos
}

// Derivação de lances exibidos:
lancesExibidos =
  MOCK_MODE         → lances[]    (seeded de LANCES_MOCK ou localStorage)
  flash (real)      → lancesFlash (GET /lances-flash polling 3s)
  programado (real) → lances[]    (listener subscribeLanceDado on-chain)
```

**Efeitos e polling ativos em produção:**

| Efeito | Trigger | Frequência | Condição |
|---|---|---|---|
| `subscribeLanceDado` | Alchemy WebSocket/polling | event-driven | `!MOCK_MODE` |
| `subscribeSaldoSenhas` | Alchemy WebSocket/polling | event-driven | `!MOCK_MODE && address` |
| Polling guardião `saldoSenhas` | `setInterval` | 30s | `!MOCK_MODE && address` |
| Polling `saldoRsCentavos` | `setInterval` | 5s | `!MOCK_MODE && address` |
| Polling `lancesFlash` | `setInterval` | 3s | `!MOCK_MODE && tipoLeilao==="flash"` |
| Timer regressivo | `setInterval` | 1s | sempre |

---

## 5. Fluxos Principais

### 5.1 PIX → Saldo R$ → Comprar Senhas → Lance Programado

```
Usuário              Frontend                    Functions              Blockchain
───────              ────────                    ─────────              ──────────

Login Google    →    Privy OAuth
                     embedded wallet criada
                     address = 0x...

Depositar PIX   →    Modal Quantidade
                     POST /iniciar-pagamento
                     { endereco, qtd }         →  pedidoId = UUID
                                                  JWT(pedidoId,end,qtd,val,paymentId?) 15min
                                                  MP.gerarPedidoPix() ou mock
                                               ←  { token, qrCodeText, qrCodeImage }
                     exibe QR Code

[PIX aprovado]  →                              ←  webhook-mercadopago (POST)
                                                  MP.consultarPagamento(paymentId)
                                                  status === "approved"
                                                  grava blob mp-aprovados
                                                  lerMetaPedido(pedidoId) → { endereco, valorBRL }
                                                  creditarSaldoRsIdempotente()
                                                  blob saldo-rs: +R$

polling 3s      →    POST /confirmar-pagamento
                     { token }                 →  verifica JWT
                                                  verifica MP (blob mp-aprovados ou live)
                                                  creditarSaldoRsIdempotente()  ← idempotente
                                               ←  { ok, saldoRsDepoisCentavos }
                     saldoRsCentavos ↑

Trocar → Senha  →    POST /comprar-senhas
                     { endereco, qtd }         →  lerSaldoRsCentavos ≥ custo?
                                                  debitarSaldoRs() → blob saldo-rs: −R$
                                                  creditarSenhas(endereco, qtd)  →  adicionarSenhas()
                                                                                     event SenhasCreditadas
                                               ←  { txHash, senhasDepois }
                     refetchSaldo()
                     saldoSenhas ↑

Lance           →    sanitizeLance(valor)
Programado           verificarRateLimit()
                     saldoSenhas > 0 ? OK
                     hashLance() [Argon2id WASM]
                     signMessage() [Privy popup]
                     enviarLance()             →                   darLance("R-1", val)
                                                                   saldoSenhas[addr]--
                                                                   event LanceDado
                     txHash + Etherscan link
                     listener LanceDado        ←                   LanceDado event
                     tabela atualiza todos
```

---

### 5.2 PIX → Saldo R$ → Lance Relâmpago

```
Usuário              CardLance (Flash)           /auth-lance    /lance-relampago   Blobs
───────              ─────────────────           ───────────    ────────────────   ─────

(logado, saldo R$)

Lance Flash    →     flashAuthRef.expiresAt > now?
  (1ª vez)             NÃO → getFlashAuthToken()
                     signMessage(              →
                       "DESAFIOGUT-AUTH:       verifyMessage(sig, msg)
                        <ts>:<address>"        ts < 5min?
                     ) [Privy popup]           end na msg == body.end?
                                               assinarLanceAuth(end, 600s)
                                            ←  { token, ttl:600 }
                     cache flashAuthRef

                     idempotencyKey =
                       keccak256(addr:val:edicao)

                     POST /lance-relampago   →
                       Authorization: Bearer JWT
                       { endereco, valorCentavos,
                         idempotencyKey,           verificarLanceAuth(token)
                         nomeExibicao }            JWT.end == body.end
                                                   check blob lance-idem       → miss
                                                   debitarSaldoRs()            → saldo-rs: −R$
                                                   append blob lances-relampago
                                                   grava blob lance-idem
                                            ←  { ok:true, lanceId, 201 }
                     refetchSaldoRs()
                     saldoRsCentavos ↓
                     otimistic: setLancesFlash()

polling 3s     →     GET /lances-flash       →                  lê blob lances-relampago
(todos users)        setLancesFlash()        ←  { lances[] }   computa repetido
                     tabela atualiza cross-user

  (replay)     →     POST /lance-relampago   →                  check lance-idem  → HIT
                                             ←  { idempotent:true, 200 }  sem débito
```

---

### 5.3 Ciclo Completo do Leilão

```
handleNovaRodada()
  ├─ setLances([]) / setLancesFlash([])
  ├─ setEncerrado(false) · setShowOverlay(false)
  ├─ setShowCountdown(true)
  │
  │   [CountdownOverlay — fullscreen, pointerEvents:none]
  │   "3" (800ms) → "2" (800ms) → "1" (800ms) → "VAI! ⚡" (800ms)
  │   CSS: gut-countdown-pop · key={texto} para re-trigger da animação
  │
  └─ setTimeout(3500ms)
       setPrazoTimestamp(now + DURACAO[tipoLeilao])
       setTempoRestante(DURACAO)
       setShowCountdown(false)

RODADA ATIVA
  ├─ Flash: polling /lances-flash 3s → lancesFlash[]
  │         TabelaLances: valores = 🔒
  ├─ Programado: listener LanceDado → lances[]
  │             TabelaLances: valores = 🔒
  └─ Timer: tick a cada 1s, conic-gradient no círculo

tempoRestante === 0
  ├─ setEncerrado(true)
  ├─ setLightningActive(true)   ← classe CSS gut-lightning-active no timer
  └─ setTimeout(1200ms)
       setLightningActive(false)
       setShowOverlay(true)     ← OverlayVencedor + Confetti (70 peças CSS)

OVERLAY VENCEDOR
  ├─ TabelaLances: valores REVELADOS (animação gut-reveal)
  │               coluna "Valor 🔒" → "Valor (R$)"
  │               vencedor: beam + blink + 🏆
  ├─ Modal: endereço vencedor + valor em R$ + confetti
  └─ "🔄 Nova Rodada" → handleNovaRodada() → loop
```

---

## 6. Segurança

### 6.1 Autenticação por camada

| Camada | Mecanismo | Detalhes técnicos |
|---|---|---|
| Login do usuário | Privy v3.22 — Google OAuth ou OTP e-mail | Cria embedded wallet Sepolia automaticamente. Sem seed phrase exposta. `createOnLogin: "all-users"`. |
| Lance Flash | JWT HS256, claim `tipo:"lance-auth"` | Emitido por `/auth-lance` após verificar assinatura EIP-191. TTL 10 min. Cached em `flashAuthRef` (useRef) no CardLance. |
| Pedido PIX | JWT HS256, claim `pedidoId/endereco/qtd/valorBRL/paymentId?` | Emitido por `/iniciar-pagamento`. TTL 15 min. Não há refresh. |
| Lance Programado | EIP-191 `signMessage` via Privy | Popup Privy obrigatório. Assinatura vincula `idEdicao + valorCentavos + data` à carteira. |
| Operações da Coordenação | ECDSA via `COORDENACAO_PRIVATE_KEY` (env server-only) | Chama `adicionarSenhas` on-chain. Wallet nunca exposta ao browser. |
| Replay prevention (flash) | `keccak256(end:val:edicao)` → blob `lance-idem` | Mesmo usuário/valor/edição = recibo existente sem débito (idempotent: true). |
| Replay prevention (PIX) | `pedidoId` UUID → blob `saldo-rs-creditos` | Confirmações repetidas retornam `idempotent: true` sem recrédito. |

### 6.2 Proteção de chaves

| Secret | Localização | Exposto ao browser? | Quem usa |
|---|---|---|---|
| `JWT_SECRET` | Netlify env (server-only) | Não | Assina/verifica todos os JWTs |
| `COORDENACAO_PRIVATE_KEY` | Netlify env (server-only) | Não | `contract.mjs` → `adicionarSenhas` |
| `RPC_URL` (Alchemy server) | Netlify env (server-only) | Não | `contract.mjs`, `confirmar-pagamento` |
| `MP_ACCESS_TOKEN` | Netlify env (server-only) | Não | `mp-client.mjs` → Mercado Pago API |
| `VITE_PRIVY_APP_ID` | Hard-coded em `main.jsx` | Sim (by design) | Identificador público do app Privy |
| `VITE_CONTRATO_SEPOLIA` | `.env.production` + Netlify | Sim (by design) | Endereço público do contrato |
| `VITE_ALCHEMY_URL` | `.env.production` + Netlify | Sim (risco baixo) | JSON-RPC read-only no frontend |
| `VITE_SENTRY_DSN` | Netlify env (build-time) | Sim (by design) | SDK Sentry no browser |

### 6.3 Proteções de transporte e renderização

| Proteção | Implementação | Local |
|---|---|---|
| TLS | HTTPS obrigatório (Netlify CDN) | Infraestrutura |
| CSP | `script-src`, `frame-src`, `connect-src`, `worker-src`, `object-src 'none'` | `netlify.toml` headers `/*` |
| X-Frame-Options | `SAMEORIGIN` | `netlify.toml` |
| X-Content-Type-Options | `nosniff` | `netlify.toml` |
| Referrer-Policy | `strict-origin-when-cross-origin` | `netlify.toml` |
| Cache-Control HTML | `no-store, must-revalidate` (evita clientes presos em deploy antigo) | `netlify.toml` headers `/` e `/index.html` |
| Cache assets | `max-age=31536000, immutable` (hash no nome) | `netlify.toml` headers `/assets/*` |
| XSS — strings | `DOMPurify.sanitize(v, { ALLOWED_TAGS:[], ALLOWED_ATTR:[] })` | `sanitize.js` |
| XSS — endereços | `/^0x[0-9a-fA-F]{40}$/` | `sanitize.js` + `validate.mjs` |
| Input lance | `parseInt`, range 1–999999 | `sanitize.js` + `validate.mjs` |
| Rate limit | Token bucket: 5 lances/min, cooldown 3s (por carteira) | `rateLimiter.js` (client-side) |
| Gate LGPD | `TermosConsentimento` renderizado antes de qualquer rota | `App.jsx` |
| Argon2id | Prova off-chain de intenção do lance antes de assinar | `CardLance.jsx` + `web3.js` |

### 6.4 Sentry — Captura e Redação de PII

| Dado capturado | Dado redactado / não capturado |
|---|---|
| Stack trace de exceções de tx | Hash Argon2id (`argon2id_*` → `[REDACTED:argon2id]`) em `extra`, `contexts`, `breadcrumbs` |
| Tags: `idEdicao`, `wallet` (address), `chainId`, `fase`, `mockMode` | Conteúdo do signMessage (não logado) |
| Extra: `reasonRaw` (revert do contrato), `valorCentavos`, `isProgramado` | Chaves privadas (nunca no browser) |
| Violações CSP (`securitypolicyviolation`) | — |
| Erros globais (`window.error`, `unhandledrejection`) | — |
| Session replay on-error: 100% (maskAllText: false) | — |
| Tracing: 10% das sessões | — |

### 6.5 Idempotência — Mapa completo

| Operação | Chave de idempotência | Store | Comportamento no replay |
|---|---|---|---|
| Crédito R$ PIX | `pedidoId` (UUID servidor) | `saldo-rs-creditos` | Retorna registro existente, `idempotent: true` |
| Crédito senhas on-chain | `pedidoId` | `pedidos-pagos` | Retorna txHash existente, não rechama contrato |
| Registro MP aprovado | `pedidoId` | `mp-aprovados` | Re-gravação idêntica (last-write-wins sem efeito) |
| Lance Flash | `keccak256(end:val:edicao)` | `lance-idem` | Retorna recibo existente (200), sem débito R$ |
| Lance Programado | Contrato Solidity | — | Mesmo valor = `repetido=true`, outra senha consumida |

---

## 7. Infraestrutura e Custos

### 7.1 Provedores ativos

| Provedor | Plano | Uso atual | Custo/mês estimado |
|---|---|---|---|
| **Netlify** | Free / Starter | SPA hosting, Functions, Blobs, CDN global | R$ 0 (free tier suficiente para beta) |
| **Alchemy** | Free (Sepolia) | RPC read/write, listeners de eventos | R$ 0 (testnet gratuito) |
| **Mercado Pago** | Sandbox | PIX QR Code, webhook, verificação | R$ 0 (sandbox) |
| **GitHub** | Free | Repositório, CI/CD (push → deploy Netlify) | R$ 0 |
| **Sentry** | Free (Developer) | Error tracking, 5k eventos/mês | R$ 0 |
| **Privy** | Developer | Auth Google/Email, embedded wallets (até 100 MAU) | R$ 0 |
| **iubenda** | Free | Políticas de privacidade e cookies hospedadas | R$ 0 |

**Custo total atual: R$ 0 / mês**  
**Custo estimado pós-lançamento (até 1.000 MAU):** R$ 300–800/mês (Netlify Pro + Privy Growth + Alchemy Growth + Sentry Team)

### 7.2 Limites e projeções

| Recurso | Limite free | Projeção com 1k usuários/dia | Risco |
|---|---|---|---|
| Netlify Functions | 125k invocações/mês | ~300k/mês (PIX + lances + polls) | Alto — upgrade necessário |
| Netlify Blobs reads | 5M reads/mês | ~1,8M/mês (polling 3s × 100 usuários ativos × 60min) | Médio |
| Netlify bandwidth | 100 GB/mês | ~5–20 GB/mês | Baixo |
| Alchemy Sepolia CU | 300M CU/mês | ~5M CU/mês (listeners + reads) | Baixo |
| Privy MAU | 100 (free) | > 100 desde o dia 1 do lançamento | **Crítico — upgrade antes do launch** |
| Sentry events | 5k/mês | > 5k com volume real | Médio — upgrade ou rate limiting |
| Sepolia ETH (coordenação) | Faucet gratuito | ~0,01 ETH/1k senhas creditadas (gas) | Baixo (testnet) |

### 7.3 Build e deploy

```
Build command: npm install --legacy-peer-deps
            && npm install --prefix netlify/functions --legacy-peer-deps
            && npm run build
Base dir:     desafio-gut/frontend
Publish dir:  dist
Functions:    netlify/functions  (node_bundler = esbuild)
```

O `npm install --prefix netlify/functions` é **obrigatório** — sem ele, pacotes server-only (`@netlify/blobs`, `jose`) não são resolvidos no bundle das functions.

Auto-deploy ativo: qualquer `git push origin main` dispara o pipeline Netlify em ~90s.

---

## 8. Pendências e Riscos

### 8.1 Tabela de pendências

| Prioridade | Item | Responsável | Arquivo(s) |
|---|---|---|---|
| 🔴 CRÍTICO | Smoke-test lance-relampago em produção (auth + idempotência wired mas não validado ao vivo) | QA | Manual |
| 🔴 CRÍTICO | Upgrade plano Privy antes do lançamento (free tier limita a 100 MAU) | Comercial | Painel Privy |
| 🔴 CRÍTICO | `comprar-senhas` sem autenticação (aceita qualquer `endereco` sem prova de posse) | Dev | `comprar-senhas.mjs` |
| 🟡 ALTA | Habilitar Apple OAuth no painel Privy (código já suporta, `loginMethods` aguarda ativação) | Ops | Painel Privy → Login Methods |
| 🟡 ALTA | `apurarVencedor()` restrito à coordenação — UI não exibe vencedor real on-chain | Dev | `Leilao.sol` → tornar `public view` |
| 🟡 ALTA | Configurar webhook MP em produção: URL + evento "Pagamentos" no painel MP | Ops | Painel Mercado Pago |
| 🟡 ALTA | Ativar PIX real: `PIX_PROVIDER=mercadopago` + `MP_ACCESS_TOKEN` produção no Netlify | Ops | Netlify env vars |
| 🟡 ALTA | `VITE_PRIVY_APP_ID` incorreto no Netlify Dashboard (workaround: hard-coded em `main.jsx`) | Ops | Netlify env: `cmo51f3v300l90clgzksivvad` |
| 🟠 MÉDIA | `VITE_ALCHEMY_URL` exposta no bundle (API key embutida) | Dev | Proxy via function ou chave read-only dedicada |
| 🟠 MÉDIA | Sem backfill de eventos on-chain — tabela começa vazia a cada reload | Dev | Nova function `backfill-lances` |
| 🟠 MÉDIA | Idempotência `lance-idem` sem TTL — bloqueia mesmo valor para sempre na edição (sem reset por rodada) | Dev | `lance-relampago.mjs` — incluir `prazoTimestamp` na chave |
| 🟠 MÉDIA | `debug-pedido.mjs` exposto em produção sem autenticação (retorna metadados de pedidos) | Dev | Adicionar token de admin |
| 🟠 MÉDIA | Configurações (`/configuracoes`) sem persistência server-side — preferências reiniciam no reload | Dev | Persiste em blob ou localStorage |
| 🟢 BAIXO | ENS / name service para exibir nomes de outros participantes além do usuário logado | Dev | `TabelaLances.jsx` |
| 🟢 BAIXO | Polling `/lances-flash` ativo após `encerrado=true` (continua consumindo chamadas) | Dev | `AppContext.jsx` — parar quando `encerrado` |
| 🟢 BAIXO | Sem testes automatizados (Playwright instalado, sem specs) | Dev | `tests/` |

### 8.2 Bugs conhecidos

| Bug | Severidade | Workaround atual |
|---|---|---|
| Token de auth flash com 401 do servidor não limpa o cache imediatamente em todos os fluxos de erro | Baixa | Cache invalidado no branch `!resp.ok && resp.status===401` |
| `subscribeLanceDado` pode disparar duplicatas em HMR (dev) | Dev only | Dedup por `txHash` no handler |
| Race condition em `debitarSaldoRs` (check-then-set sem lock distribuído) | Baixa (volume beta) | Volume esperado torna o risco prático irrelevante |
| `apurarVencedor` usa `apenasCoordenacao` — front usa JS puro para calcular o vencedor | Design | Funcional; vira gap se o contrato tiver lances off-chain |

### 8.3 Riscos para o lançamento

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Wallet coordenação sem ETH — `adicionarSenhas` reverte | Média | PIX confirmado, senha não creditada | Monitor de saldo + reembolso automático em `comprar-senhas` |
| Alchemy RPC down — lance programado não confirma | Baixa | Tx pendente, timeout no cliente | Fallback RPC configurado (`ethereum-sepolia-rpc.publicnode.com`) |
| Netlify Blobs `consistency:"strong"` com latência alta | Baixa | Lance Flash lento (> 3s) | Blob idem como cache; lance já debitado responde mais rápido |
| Privy API down | Muito baixa | Login bloqueado | Sem workaround (dependência crítica) |
| Auditoria do contrato revela vulnerabilidade pós-mainnet | Média | Revert de fundos impossível no contrato atual | Auditar antes de migrar para mainnet |

---

## 9. Roadmap para Produção

### 9.1 Sepolia → Mainnet

| Etapa | Descrição | Estimativa |
|---|---|---|
| Auditoria do contrato | Revisar `LeilaoGUT.sol` para reentrância, overflow, `apurarVencedor` público, auth de `darLance`. Ferramentas: Slither, Mythril, ou auditoria externa. | 2–4 semanas |
| Tornar `apurarVencedor` público | Remover `apenasCoordenacao` da view function — UI precisa para overlay de vencedor real | 1h (+ deploy contrato) |
| Deploy mainnet | `hardhat ignition deploy` com private key mainnet. Atualizar `VITE_CONTRATO_SEPOLIA` e `CONTRATO_SEPOLIA` nas env vars. | 1 dia |
| ETH real para coordenação | Transferir ETH mainnet para `coordenacao` wallet (gas para `adicionarSenhas`) | Imediato |
| Atualizar RPC URLs | `RPC_URL` e `VITE_ALCHEMY_URL` → mainnet Alchemy | 1 hora |
| Rodada piloto controlada | Executar 1 rodada completa com usuários internos antes de abrir ao público | 1 semana |

### 9.2 PIX real (Mercado Pago Produção)

| Etapa | Descrição |
|---|---|
| Aprovação conta MP | Conta verificada, CNPJ vinculado ao GUT, Termos MP aceitos |
| Access Token produção | Substituir `MP_ACCESS_TOKEN` sandbox pelo de produção no Netlify Dashboard |
| Toggle PIX | `PIX_PROVIDER=mercadopago` — único env var necessário, sem redeploy de código |
| Webhook configurado | Painel MP → Webhooks → URL: `https://silly-stardust-ca71bc.netlify.app/.netlify/functions/webhook-mercadopago` · Evento: Pagamentos |
| Smoke test produção | 1 pagamento real de R$ 2,00 → confirmar crédito R$ no blob → trocar 1 senha → dar 1 lance on-chain |
| HMAC do webhook | Implementar validação `x-signature` do MP (`MP_WEBHOOK_SECRET`) para autenticar notificações |

### 9.3 PWA e publicação nas lojas

| Etapa | Pré-requisito | Estimativa |
|---|---|---|
| `manifest.json` + service worker (Vite PWA plugin) | — | 1–2 dias |
| Ícones e splash screens | Designer | 2–3 dias |
| Push notifications (VAPID) | Service worker | 3–5 dias |
| Build iOS (Capacitor) | Conta Apple Developer (USD 99/ano), Mac com Xcode | 1–2 semanas |
| Build Android (Capacitor) | Conta Google Play (USD 25 único) | 3–5 dias |
| Revisão App Store Apple | Apple pode barrar apps de jogo com pagamento. Consultar App Store Review Guidelines §4.3 (loterias/apostas). | Imprevisível (2–90 dias) |
| Revisão Google Play | Política de conteúdo financeiro requer declaração | 1–2 semanas |

---

## Apêndice A — Variáveis de Ambiente

### Frontend (build-time — `VITE_*`)

| Variável | Valor em produção | Fonte |
|---|---|---|
| `VITE_MOCK_MODE` | `"false"` | `.env` |
| `VITE_PRIVY_APP_ID` | `cmo51f3v300l90clgzksivvad` | Hard-coded em `main.jsx` (env incorreta no Netlify) |
| `VITE_CONTRATO_SEPOLIA` | `0x273Ef96f5be04601FD39DAcDFB039d6fB552445e` | `.env.production` + Netlify |
| `VITE_ALCHEMY_URL` | `https://eth-sepolia.g.alchemy.com/v2/qU_kw3…` | `.env.production` + Netlify |
| `VITE_SENTRY_DSN` | DSN do projeto Sentry | Netlify env |

### Backend (server-only — Netlify Functions)

| Variável | Uso | Quem define |
|---|---|---|
| `JWT_SECRET` | Assina todos os JWTs (pedido PIX e lance-auth) | Netlify env |
| `COORDENACAO_PRIVATE_KEY` | Wallet coordenação (`adicionarSenhas` on-chain) | Netlify env |
| `RPC_URL` | Alchemy Sepolia para as functions | Netlify env |
| `CONTRATO_SEPOLIA` | Endereço do contrato (tem default no código) | Netlify env (opcional) |
| `MP_ACCESS_TOKEN` | Mercado Pago (sandbox ou produção) | Netlify env |
| `PIX_PROVIDER` | `"mock"` (default) ou `"mercadopago"` | Netlify env |

---

## Apêndice B — Endpoints das Netlify Functions

| Método | Endpoint | Auth exigida | Função |
|---|---|---|---|
| POST | `/auth-lance` | EIP-191 signMessage | Emite JWT `lance-auth` (10min) |
| POST | `/iniciar-pagamento` | — | Gera pedido PIX, retorna JWT + QR Code |
| POST | `/confirmar-pagamento` | JWT `pedido` (15min) | Verifica MP, credita saldo R$ |
| POST | `/webhook-mercadopago` | Implícita (paymentId real) | Recebe aprovação MP, credita R$ reativamente |
| GET | `/saldo-rs?endereco=0x…` | — | Lê saldo R$ off-chain |
| POST | `/lance-relampago` | JWT `lance-auth` | Debita saldo R$, registra lance flash |
| GET | `/lances-flash?edicaoId=R-1` | — | Retorna lances flash com `repetido` calculado |
| POST | `/comprar-senhas` | — (gap de segurança conhecido) | Troca R$ por senhas on-chain |
| GET | `/health` | — | Health check |
| GET | `/debug-pedido?pedidoId=…` | — (gap de segurança conhecido) | Metadados de pedido (apenas debug) |

---

## Apêndice C — Contrato LeilaoGUT (resumo)

```
Endereço:    0x273Ef96f5be04601FD39DAcDFB039d6fB552445e (Sepolia)
Etherscan:   https://sepolia.etherscan.io/address/0x273Ef96f5be04601FD39DAcDFB039d6fB552445e
Deployer:    Hardhat Ignition · 2026-04-28 · bytecode verificado
Coordenação: derivada da COORDENACAO_PRIVATE_KEY (env server-only)
Edição R-1:  aberta em 2026-04-29 · tx 0x1767bffd…ce8e
1º lance:    validado em 2026-04-29 · tx 0xf5991092…29cbd
```

---

*Documento gerado em 2026-05-05 com base na leitura integral dos arquivos de código-fonte do projeto. Para atualizações, consultar o histórico git (`git log --oneline`) e `CLAUDE_DEBUG.md`.*
