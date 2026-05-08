# PANORAMA — DesafioGUT
> **Gerado em:** 2026-05-05  
> **Versão do sistema:** Beta v1.0 · Commit HEAD `c3c26bd`  
> **Baseado em:** CLAUDE.md · CLAUDE_DEBUG.md · RELATORIO-FINAL.md · docs/auditoria-contrato.md · docs/stress-test.md · docs/design-system-final.md  
> **Produção:** https://silly-stardust-ca71bc.netlify.app

---

## 1. O QUE É O DESAFIOGUT

O **DesafioGUT** é uma plataforma de leilão digital pelo critério **Menor Lance Único**, operada pelo **Grupo União e Trabalho** (CNPJ 23.040.066/0001-00).

### Modelo de negócio

O usuário compra **senhas** (R$ 2,00 cada) via PIX e as usa para dar lances em edições do leilão. Vence quem registrar o **menor valor que apareça exatamente uma vez** entre todos os lances da rodada — nunca o menor absoluto, mas o menor *único*.

**Artigo VIII do regulamento (regra central):**
> Vence o menor lance com exatamente 1 ocorrência entre todos os lances registrados.

### Dois modos de jogo

| Modalidade | Duração | Custo | Armazenamento |
|---|---|---|---|
| ⚡ **Relâmpago (Flash)** | 5 min | Debita saldo R$ off-chain | Netlify Blobs |
| 🎫 **Programado** | 30 min | Consome 1 senha on-chain | Contrato Ethereum Sepolia |

**Status atual:** Beta v1.0 em testnet Sepolia. Todos os fluxos principais implementados. PIX real e mainnet não ativados.

---

## 2. ARQUITETURA

### Diagrama resumido

```
Browser (React 18 SPA)
│
├─ PrivyProvider → Auth Google/Email + Embedded Wallet Sepolia
├─ AppContext → estado global (lances, saldos, timer, auth)
│
├─ HTTPS ──────────────────────────────────────────────────►  Netlify Platform
│                                                              ├─ CDN / SPA rewrite
│                                                              ├─ 10 Netlify Functions (Node ESM)
│                                                              └─ Netlify Blobs (KV strong)
│
├─ EIP-1193 / ethers.js ──────────────────────────────────►  Ethereum Sepolia (chainId 11155111)
│                                                              └─ Contrato LeilaoGUT
│                                                                  0x273Ef96f5be04601FD39DAcDFB039d6fB552445e
│
├─ Privy OAuth / OTP ─────────────────────────────────────►  auth.privy.io
├─ Mercado Pago REST ─────────────────────────────────────►  /v1/payment_intents (PIX)
└─ Sentry SDK ────────────────────────────────────────────►  Error tracking + Session replay
```

### Stack tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| SPA | React | 18.3.1 |
| Build | Vite | 8.0.8 |
| CSS | Tailwind CSS v4 | 4.2.2 |
| Animações | Framer Motion | 12.38.0 |
| Auth + Wallet | Privy | 3.22.1 |
| Blockchain | ethers.js | 6.16.0 |
| Hash off-chain | hash-wasm (Argon2id WASM) | 4.11.0 |
| Sanitização | DOMPurify | 3.1.6 |
| Roteamento | react-router-dom | 7.14.2 |
| Monitoramento | Sentry React | 10.51.0 |
| Runtime Functions | Node.js ESM | 18 |
| JWT | jose | 5.9.6 |
| Blob storage | @netlify/blobs | 8.1.0 |
| PIX | Mercado Pago REST | v1 |
| RPC | Alchemy Sepolia | v2 |
| Smart contract | Solidity | ^0.8.0 |
| Deploy | Netlify | auto-deploy em push na `main` |

### Armazenamento de estado (3 camadas)

| Camada | Tecnologia | Conteúdo |
|---|---|---|
| On-chain | Ethereum Sepolia | Senhas, lances programados, edições, vencedor |
| Off-chain server | Netlify Blobs (KV strong) | Saldos R$, lances flash, idempotência, metadados PIX |
| Off-chain client | React state + AppContext | Lances exibidos, timer, auth, saldos com cache |

---

## 3. FUNCIONALIDADES

### `/` — Dashboard

Painel de entrada. Exibe saudação personalizada (nome Google ou e-mail via Privy) e **4 KPIs clicáveis**:

| KPI | Fonte | Atualização |
|---|---|---|
| Saldo R$ | Blob `saldo-rs` via `GET /saldo-rs` | Polling 5s |
| Senhas | `saldoSenhas(address)` on-chain | Listener `SenhasCreditadas` + polling guardião 30s |
| Lances Únicos | `lancesExibidos.filter(!repetido).length` | Tempo real |
| Total Lances | `lancesExibidos.length` | Tempo real |

Também exibe: Card "Edição Ativa" com timer regressivo MM:SS, Card "Menor Lance Único" provisório em tempo real, e 6 atalhos de navegação.

---

### `/mercado` — Mercado de Lances (tela central)

Composta por: header com timer circular (CSS conic-gradient), seletor Flash/Programado, formulário de lance e tabela de lances.

**CardLance — fluxo real por modo:**

| Aspecto | Flash | Programado |
|---|---|---|
| Gate de saldo | `saldoRsCentavos >= valorCentavos` | `saldoSenhas > 0` on-chain |
| Auth do lance | JWT HS256 `lance-auth` (TTL 10min, EIP-191) | EIP-191 + `darLance` on-chain |
| Idempotência | `keccak256(addr:val:edicao)` → blob `lance-idem` | Contrato Solidity |
| Resultado | UUID recibo (`lanceId`) | `txHash` + link Etherscan |

**TabelaLances — estados visuais:**
- Rodada ativa: valores exibidos como 🔒 para todos
- Encerramento: valores revelados com animação CSS `gut-reveal` (blur→foco, scale 0.94→1)
- Vencedor: linha com beam animado + badge 🏆 piscando
- Flash: dados via `GET /lances-flash` polling 3s (cross-user)
- Programado: dados via listener `subscribeLanceDado` (Alchemy WebSocket)

**Overlay e countdown:**
- `CountdownOverlay`: 3→2→1→"VAI! ⚡" (3.500ms) antes de cada rodada
- `OverlayVencedor`: Confetti + modal com endereço/valor vencedor após encerramento
- Efeito relâmpago (`gut-lightning-active`) ao zerar o timer

---

### `/carteira` — Minha Carteira

| Seção | Modo real |
|---|---|
| Saldo R$ | Blob via polling AppContext |
| Senhas | `saldoSenhas` on-chain |
| Depositar PIX | Modal 3 etapas: QR Code → polling automático 3s/15min → crédito automático sem botão manual |
| Trocar R$ → Senhas | `POST /comprar-senhas` (debita R$, credita on-chain via `adicionarSenhas`) |

**ComprarFichasModal — 3 etapas:**
1. Quantia: preset 1/5/10 ou campo livre (1–100 senhas)
2. Pagamento: QR Code PIX + código copia-e-cola + polling automático
3. Sucesso: diferença de saldo Antes/Depois exibida

---

### `/ativos` — Meus Ativos

Histórico de lances com filtro Todos/Únicos/Repetidos. Stats: total, únicos, repetidos, menor lance da rodada. Filtra por `address` quando logado.

---

### `/seguranca` — Segurança

Checklist visual de 8 itens (6 implementados, 2 em breve). Links para política de privacidade iubenda, regulamento RTD e contato DPO.

---

### `/configuracoes` — Configurações

Preferências de notificação (3 toggles), idioma e tema — UI apenas, sem persistência server-side. Botão "Salvar Preferências" com feedback visual 2,5s.

---

### Netlify Functions (10 endpoints)

| Método | Endpoint | Auth | Função |
|---|---|---|---|
| POST | `/auth-lance` | EIP-191 signMessage | Emite JWT `lance-auth` (10min) |
| POST | `/iniciar-pagamento` | — | Gera pedido PIX, retorna JWT + QR Code |
| POST | `/confirmar-pagamento` | JWT `pedido` (15min) | Verifica MP, credita saldo R$ |
| POST | `/webhook-mercadopago` | Implícita (paymentId real) | Recebe aprovação MP, credita R$ reativamente |
| GET | `/saldo-rs` | — | Lê saldo R$ off-chain |
| POST | `/lance-relampago` | JWT `lance-auth` | Debita saldo R$, registra lance flash |
| GET | `/lances-flash` | — | Retorna lances flash com `repetido` calculado |
| POST | `/comprar-senhas` | ⚠️ Nenhuma (gap conhecido) | Troca R$ por senhas on-chain |
| GET | `/health` | — | Health check |
| GET | `/debug-pedido` | ⚠️ Nenhuma (gap conhecido) | Metadados de pedido — apenas debug |

---

## 4. SEGURANÇA

### Autenticação por camada

| Camada | Mecanismo |
|---|---|
| Login | Privy v3.22 — Google OAuth ou OTP e-mail. Embedded wallet Sepolia criada automaticamente. |
| Lance Flash | JWT HS256 `tipo:"lance-auth"`, TTL 10min. Emitido após verificação EIP-191. Cached em `flashAuthRef` (useRef). |
| Pedido PIX | JWT HS256 com `pedidoId/endereco/qtd/valorBRL`, TTL 15min. |
| Lance Programado | `signMessage` EIP-191 via popup Privy obrigatório. Vincula `idEdicao + valor + data` à carteira. |
| Coordenação on-chain | ECDSA via `COORDENACAO_PRIVATE_KEY` (env server-only). Nunca exposta ao browser. |
| Replay (flash) | `keccak256(end:val:edicao)` → blob `lance-idem` — idempotent 200 sem débito |
| Replay (PIX) | `pedidoId` UUID → blob `saldo-rs-creditos` — sem recrédito |

### Proteção de chaves

| Secret | Localização | Exposto? |
|---|---|---|
| `JWT_SECRET` | Netlify env (server-only) | Não |
| `COORDENACAO_PRIVATE_KEY` | Netlify env (server-only) | Não |
| `RPC_URL` (Alchemy server) | Netlify env (server-only) | Não |
| `MP_ACCESS_TOKEN` | Netlify env (server-only) | Não |
| `VITE_PRIVY_APP_ID` | Hard-coded em `main.jsx` | Sim (por design — identificador público) |
| `VITE_ALCHEMY_URL` | `.env.production` + Netlify | Sim (**risco médio** — API key embutida no bundle) |

### CSP e headers HTTP (`netlify.toml`)

`script-src`, `frame-src`, `connect-src`, `worker-src` com allowlist explícita de domínios Privy/Google/Alchemy/Sentry. `object-src 'none'`. `X-Frame-Options: SAMEORIGIN`. `X-Content-Type-Options: nosniff`. Cache HTML: `no-store, must-revalidate`. Assets: `max-age=31536000, immutable`.

### Sentry

- Error boundary ativo com `maskAllText: false`
- Session replay on-error: 100%
- Tracing: 10% das sessões
- Hash Argon2id redactado automaticamente (`[REDACTED:argon2id]`)
- Listener `securitypolicyviolation` em `main.jsx` captura violações CSP em tempo real

### Gaps de segurança conhecidos

| Gap | Risco | Ação |
|---|---|---|
| `comprar-senhas` sem auth | Aceita qualquer `endereco` sem prova de posse | Adicionar verificação JWT |
| `debug-pedido` sem auth | Expõe metadados de pedidos | Adicionar token admin ou desativar em prod |
| `VITE_ALCHEMY_URL` no bundle | API key Alchemy client-side | Proxy via function ou chave read-only dedicada |
| `lance-idem` sem TTL por rodada | Bloqueia mesmo valor para sempre na edição | Incluir `prazoTimestamp` na chave |

---

## 5. CONTRATO

### Identificação

| Campo | Valor |
|---|---|
| Endereço | `0x273Ef96f5be04601FD39DAcDFB039d6fB552445e` |
| Rede | Ethereum Sepolia (chainId `11155111`) |
| Etherscan | https://sepolia.etherscan.io/address/0x273Ef96f5be04601FD39DAcDFB039d6fB552445e |
| Deploy | Hardhat Ignition · 2026-04-28 |
| Edição ativa | `R-1` (aberta 2026-04-29 · tx `0x1767bffd…ce8e`) |
| 1º lance validado | tx `0xf5991092…29cbd` (2026-04-29) |

### Funções principais

| Função | Acesso | Comportamento |
|---|---|---|
| `darLance(id, valor)` | Público | Requer `saldoSenhas > 0`, edição ativa, prazo válido. Decrementa 1 senha. Emite `LanceDado`. |
| `adicionarSenhas(addr, qtd)` | `apenasCoordenacao` | Credita senhas pós-PIX. Emite `SenhasCreditadas`. |
| `abrirEdicao(id, nome, dur)` | `apenasCoordenacao` | Cria edição com `prazo = block.timestamp + dur`. |
| `apurarVencedor(id)` | `apenasCoordenacao` (view) | Retorna `(menorUnico, ganhador)`. Loop `listaDeValores`. |
| `saldoSenhas(addr)` | Público (view) | Lê saldo de senhas. |

### Eventos

| Evento | Campos | Consumidor |
|---|---|---|
| `LanceDado` | idEdicao, lancador, valorEmCentavos, repetido, timestamp | `subscribeLanceDado` → `setLances` no AppContext |
| `SenhasCreditadas` | usuario, quantidade | `subscribeSaldoSenhas` → `refetchSaldo` no AppContext |
| `EdicaoAberta` | idEdicao, nome, prazo | Não consumido ativamente |

### Auditoria — Findings (Krait v8 + Trail of Bits principles)

| ID | Severidade | Título | Status |
|---|---|---|---|
| **H-01** | 🔴 Alta | Loop ilimitado em `apurarVencedor` — DoS potencial a ~37.500 lances únicos | Não aplicado |
| **M-01** | 🟡 Média | Estado da edição não resetado ao re-abrir — lances obsoletos persistem | Não aplicado |
| **M-02** | 🟡 Média | Papel de coordenação é EOA único sem mecanismo de transferência — single point of failure | Não aplicado |
| **M-03** | 🟡 Média | `apurarVencedor` restrito à coordenação — sem verificação pública do vencedor | Não aplicado |
| **L-01** | 🟢 Baixa | Frontrunning estrutural — lances visíveis no mempool (MEV) | Post-MVP |
| **I-01** | ⚪ Info | Manipulação de `block.timestamp` ± 12s | Negligenciável no contexto atual |
| **I-02** | ⚪ Info | Sem função de emergência para encerrar edição | Não aplicado |
| **I-03** | ⚪ Info | Sem evento `VencedorApurado` — trilha de auditoria incompleta | Não aplicado |

**Contrato corrigido** já documentado em `docs/auditoria-contrato.md` (90 linhas → versão corrigida com H-01, M-01-B, M-02, M-03, I-02, I-03 aplicados). **Nenhuma correção foi deployada** — contrato original ainda em uso no Sepolia.

---

## 6. INFRAESTRUTURA

### Provedores e custos atuais

| Provedor | Plano | Custo/mês |
|---|---|---|
| Netlify | Free / Starter | R$ 0 |
| Alchemy | Free (Sepolia) | R$ 0 |
| Mercado Pago | Sandbox | R$ 0 |
| GitHub | Free | R$ 0 |
| Sentry | Developer (5k eventos/mês) | R$ 0 |
| Privy | Developer (até 100 MAU) | R$ 0 |
| iubenda | Free | R$ 0 |
| **Total atual** | | **R$ 0/mês** |
| **Estimado pós-lançamento (≤1.000 MAU)** | | **R$ 300–800/mês** |

### Limites e gargalos identificados (stress-test)

| Superfície | Breaking point | Risco para lançamento |
|---|---|---|
| Netlify CDN | >10.000 VUs simultâneos | Baixo — free tier muito acima da demanda esperada |
| **Alchemy Free RPC** | **~13 VUs contínuos** (300M CUs/mês ÷ 26 CU/eth_call) | **CRÍTICO** — 100+ usuários ativos esgotam em ~6h de uso intenso |
| Smart Contract | ~31 tx/s teórico (Sepolia) | Arquitetural — limite da rede |
| **Privy MAU** | **100 usuários** (free tier) | **CRÍTICO** — excedido desde o dia 1 do lançamento público |
| Netlify Functions | 125k invocações/mês | Alto — ~300k/mês projetado com 1.000 usuários/dia |
| Sentry | 5k eventos/mês | Médio — ajustar `tracesSampleRate` ou fazer upgrade |

### Build e deploy

```
Base dir:     desafio-gut/frontend
Build:        npm install --legacy-peer-deps
            + npm install --prefix netlify/functions --legacy-peer-deps
            + npm run build
Publish dir:  dist
Functions:    netlify/functions (node_bundler = esbuild)
Auto-deploy:  git push origin main → Netlify (~90s)
```

> O `npm install --prefix netlify/functions` é **obrigatório** — sem ele, `@netlify/blobs` e `jose` não são resolvidos no bundle das functions.

---

## 7. DESIGN SYSTEM

### Status

**Design system extraído e documentado em 2026-05-05.**  
Arquivo: `docs/design-system-final.md` (868 linhas · 9 seções · score 100/100)

Baseado em análise visual das 5 imagens de referência (DesafioGUT flyer, Brazino777 desktop/mobile, Br4Bet banner, Plataforma 5 Reais).

### Tokens extraídos

| Token | Valor | Observação |
|---|---|---|
| Background principal | `#060b08` | Verde-floresta escuro — NOT navy-azul |
| Surface (cards) | `#0d2214` | Verde escuro elevado |
| Gold primário (CTA) | `#f5c800` | Vibrante — NOT âmbar apagado |
| Gold brilhante (preços) | `#ffd700` | Preços, troféus, contagem |
| Verde-vivido (btn 2ário) | `#1d8c2e` | Botão secundário, badges sucesso |
| Texto principal | `#ffffff` | |
| Fonte display | **Bebas Neue** | Condensada ALL-CAPS — padrão iGaming BR |
| Fonte headings/botões | **Barlow Condensed 800** | NOT Inter/Poppins/Roboto |
| Border-radius CTAs | `50px` | Pílulas — padrão Brazino777/Br4Bet |
| Border-radius cards | `12px` | Distinto dos botões |
| Motion tier | **L2** | GSAP count-up, scroll reveal, gold glow pulse |

### Validação anti-genérico (100/100)

- ✅ Zero Inter/Poppins/Roboto no spec
- ✅ Zero roxo/purple em nenhum hex
- ✅ Zero navy-azul como background — família é verde-floresta
- ✅ Gold ≥ `#f5c800` — não apagado
- ✅ Tipografia específica da categoria iGaming BR

### Próximo passo

O design system está pronto para **prototipagem e implementação visual**. A `globals.css` atual (`--color-gut-bg: #0a0f1a` navy + Inter) ainda não foi atualizada para os novos tokens. Isso é a próxima frente de desenvolvimento visual.

---

## 8. PENDÊNCIAS

### Críticas (bloqueiam lançamento público)

| # | Item | Onde |
|---|---|---|
| 1 | **Upgrade Privy antes do launch** — free tier limita a 100 MAU | Painel Privy → Growth Plan |
| 2 | **Smoke-test `lance-relampago` em produção** — auth + idempotência wired mas não validado ao vivo | Manual (commit `2cc8c59`) |
| 3 | **`comprar-senhas` sem autenticação** — aceita qualquer `endereco` sem prova de posse | `comprar-senhas.mjs` |
| 4 | **Alchemy: upgrade Free → Growth** (~$49/mês) — breaking point de 13 VUs contínuos | Painel Alchemy |

### Altas (pré-lançamento)

| # | Item |
|---|---|
| 5 | `apurarVencedor()` restrito à coordenação — UI não exibe vencedor real on-chain |
| 6 | Configurar webhook MP em produção: URL + evento "Pagamentos" no painel MP |
| 7 | Ativar PIX real: `PIX_PROVIDER=mercadopago` + `MP_ACCESS_TOKEN` produção no Netlify |
| 8 | Apple OAuth: habilitação no painel Privy (código já suporta) |
| 9 | Deploy contrato corrigido (H-01, M-01, M-02, M-03) no Sepolia — novo endereço |
| 10 | `VITE_PRIVY_APP_ID` hard-coded em `main.jsx` como workaround — corrigir no Netlify Dashboard |

### Médias (qualidade)

| # | Item |
|---|---|
| 11 | `VITE_ALCHEMY_URL` exposta no bundle — proxy via function ou chave read-only dedicada |
| 12 | Sem backfill de eventos on-chain — tabela começa vazia a cada reload |
| 13 | `lance-idem` sem TTL por rodada — bloqueia mesmo valor para sempre na edição |
| 14 | `debug-pedido.mjs` exposto sem autenticação em produção |
| 15 | Preferências de `/configuracoes` sem persistência server-side |

### Para mainnet (roadmap)

| # | Item | Estimativa |
|---|---|---|
| 16 | Auditoria de contrato com Slither + Mythril + auditoria externa | 2–4 semanas |
| 17 | Deploy em Ethereum Mainnet (novo endereço, ETH real para gas) | 1 dia + 1 semana rodada piloto |
| 18 | PIX real com HMAC do webhook (`x-signature` Mercado Pago) | 1 semana |
| 19 | PWA: `manifest.json` + service worker + ícones | 1–2 semanas |
| 20 | Build iOS (Capacitor) — requer Apple Developer Account ($99/ano) | 1–2 semanas |
| 21 | Build Android (Capacitor) | 3–5 dias |
| 22 | Implementação visual do novo design system (globals.css, componentes) | A definir |
| 23 | Suite de testes automatizados Playwright | A definir |
| 24 | Dashboard de métricas de negócio (Netlify Analytics ou Posthog) | A definir |

---

## 9. NOTA ATUAL

### **6,5 / 10**

| Dimensão | Nota | Justificativa |
|---|---|---|
| Autenticação | **8** | Privy + JWT HS256 + EIP-191 + `lance-auth`. Validado em produção (2026-04-30). Gap: `comprar-senhas` sem auth. |
| Pipeline PIX | **7** | Mock 100% funcional. MP sandbox configurado. Webhook operando. PIX real gated por `PIX_PROVIDER`. |
| Lance Programado (on-chain) | **8** | `darLance` validado ponta a ponta (tx `0xf5991092…`). Listener, polling, gate de saldo. |
| Lance Flash (off-chain) | **7** | Wired com auth + idempotência (commit `2cc8c59`). Pendente smoke-test em produção ao vivo. |
| Segurança geral | **7** | Auth no flash, idempotência nos dois modos, CSP, Sentry. Gaps: `comprar-senhas`, `debug-pedido`, Alchemy key. |
| UX / Dinamismo | **7** | Countdown 3-2-1, revelação de valores, cross-user polling 3s, responsivo mobile/desktop, OverlayVencedor. |
| Observabilidade | **6** | Sentry ativo, logs Netlify Functions. Sem dashboard de métricas de negócio. Sem alertas automáticos. |
| Contrato / Blockchain | **5** | Funcional mas com H-01, M-01, M-02, M-03 não corrigidos. `apurarVencedor` sem verificação pública. |
| Design system / Visual | **5** | Tokens extraídos e documentados (100/100). Não implementados — `globals.css` ainda usa navy + Inter. |
| Cobertura de testes | **2** | Playwright instalado. Nenhum teste automatizado escrito. Scripts k6 documentados, não executados. |
| Pronto para mainnet | **2** | Sepolia testnet. Sem auditoria do contrato certificada. PIX real não ativado. Privy free tier. |
| Documentação | **7** | CLAUDE.md + CLAUDE_DEBUG.md + RELATORIO-FINAL.md + auditoria + stress-test + design system. Sem OpenAPI. |

### Por que 6,5 e não mais

O sistema **funciona end-to-end** — usuário faz login com Google, deposita via PIX (mock), compra senhas, assina lances, vê a tabela atualizar em tempo real para todos os participantes. Isso é sólido para um beta.

O que segura a nota: **zero testes automatizados**, **contrato não corrigido**, **PIX real não ativado**, **Privy free tier insuficiente para qualquer lançamento público**, e o **design system documentado mas não implementado** na UI.

### O que leva a 10

1. Corrigir e redesployar o contrato (H-01, M-02, M-03 são prioritários)
2. Auditoria de contrato certificada + deploy em mainnet
3. Ativar PIX real com webhook HMAC
4. Upgrade Privy (Growth) + Alchemy (Growth)
5. Implementar design system nos componentes (substituir navy + Inter por verde-floresta + Bebas Neue)
6. Suite de testes E2E Playwright (fluxo PIX → lance → vencedor)
7. Smoke-test `lance-relampago` em produção validado
8. Fechar gaps de segurança: auth em `comprar-senhas`, desativar `debug-pedido`, proxy Alchemy key

---

*Documento gerado em 2026-05-05 com base na leitura integral dos arquivos de código-fonte e documentação do projeto.*
