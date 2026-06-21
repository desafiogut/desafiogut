# DESAFIOGUT — Auditoria Topográfica (MC35)

**Data:** 2026-06-21 · **Branch:** `feat/mc35` · **Método:** evidência concreta (inventário `find`/`ls`, `grep`, CLI Supabase/Netlify, conhecimento verificado das sessões MC32–34). Itens não verificáveis nesta passagem marcados `[INCONCLUSIVO]` ou `[INVENTÁRIO]`.

> ⚠️ **Graphify:** o cache `graphify-out/` é de 2026-06-05 (anterior a MC32.1/33/34) → **desatualizado**. NÃO foi citado (evita alucinação, R1). Recomenda-se `graphify update .` antes de gerar grafos automáticos formais. O mapa de dependências abaixo é manual, baseado em imports verificados.

---

## 1. Resumo executivo
Plataforma de leilão "menor lance único" com pipeline de lance on-chain (Sepolia), auth sem barreira (Privy), assistente RAG (GUTO) e backend serverless (Netlify Functions). **Supabase é o backend de dados de escrita em produção** desde MC33 (flip `DATA_STORE_BACKEND=supabase`); realtime de `config_remota` ativo (MC34). Estado de saúde: **68/68 testes verdes, build verde, deploy produção `ready`, CLS=0**. Segurança de base sólida (RLS anti-sniping intacta, sem segredos no bundle, contrato sem `tx.origin`). Dívidas técnicas concentram-se em: realtime de lances/edições (bloqueado por design anti-sniping), reconciliação `lojistas` (cotas/wallet ainda em Blobs), e alguns gotchas operacionais (dedup Netlify, MCP Supabase indisponível).

## 2. Inventário de arquivos (excl. node_modules/dist/.netlify/.git/.claude)
| Camada | Contagem | Localização |
|---|---|---|
| Backend handlers (.mjs) | **45** | `desafio-gut/frontend/netlify/functions/*.mjs` |
| Backend libs (.mjs) | **36** | `netlify/functions/_lib/*.mjs` |
| Testes (.mjs) | **17** | `netlify/functions/_tests/` |
| Componentes (.jsx) | **32** | `src/components/` |
| Hooks | **8** | `src/hooks/` |
| Páginas (.jsx) | **15** | `src/pages/` |
| Contextos | **3** | `src/context/` (AppContext, IdiomaContext, useAppContextEnvironment) |
| Contrato | 1 + testes | `contracts/Leilao.sol`, `tests/foundry/`, `tests/fuzzing/` |
| Migrations SQL | **3** | `supabase/migrations/` |
| Scripts | 21 + 8 | `frontend/scripts/`, `../../scripts/` |
| Totais aproximados | 59 .jsx · 37 .js · 131 .mjs | — |

**Dependências-chave:** react ^18.3.1 · ethers ^6.16.0 · @supabase/supabase-js ^2.108.2 · @privy-io/react-auth ^3.22.1 · framer-motion ^12.38.0 · hash-wasm ^4.11.0 · dompurify ^3.1.6 · Vite 8.

**Bundle (dist/, maiores chunks):** `privy` 2.7MB · `index` 1.1MB · `core` 384KB · `dist` 320KB. ⚠️ Bundle pesado dominado por Privy/walletconnect (dívida P2 — code-split/avaliar).

## 3. Mapa de funções (por módulo)
### 3.1 Backend — 45 handlers (agrupados por domínio)
- **Auth:** `auth-lance`, `auth-user`, `auth-admin` (JWT via `_lib/jwt`).
- **Lance/Leilão:** `lance-relampago` (escrita KPB→fachada), `lances-flash`, `consolidar-lances` (apuração off-chain + Flashbots), `edicoes`, `purge-lances`, `recursos-app`.
- **Pagamento/Cotas/Senhas:** `comprar-senhas`, `iniciar-pagamento`, `confirmar-pagamento`, `info-pagamento`, `iniciar-cota`, `cotas`, `voucher`, `saldo-rs`, `troco`, `webhook-mercadopago`, `renovacao-adesao`.
- **Corporativo/Admin:** `admin-aprovacao`, `admin-list`, `analytics`, `corporativo-analytics`, `banners`, `produtos`, `exportar-dados`, `auth-admin`.
- **GUTO/Notif:** `chatbot` (RAG), `notificacoes`.
- **Infra/Scheduled:** `health`, `backup-blobs(-scheduled)`, `purge-logs(-scheduled)`, `monitor-onchain(-scheduled)`, `ia-preditiva-scheduled`, `cron-reset-programado`, `schedule`, `img-proxy`, `debug-pedido`.
- **MC30.2 (KMS/Biconomy):** `mc302-aceitar`, `mc302-diagnostico`.
- **Referral:** `referral`, `wallet`.
> `[INVENTÁRIO]` I/O detalhado (método/body/resposta) por handler não foi aberto individualmente nesta passagem; os do caminho de lance (lance-relampago, consolidar-lances, recursos-app) estão documentados nas auditorias MC28/32–34.

### 3.2 Backend — 36 libs (`_lib/`)
- **Camada de dados (fachada/adapter):** `data-store.mjs` (fachada, seleção por `DATA_STORE_BACKEND`), `data-store-blobs.mjs`, `data-store-supabase.mjs` (paginado, K1), `bids-store.mjs` (Key-Per-Bid MC28), `supabase-client.mjs` (singleton service_role).
- **On-chain/assinatura:** `contract.mjs`, `signer.mjs`, `kms-signer.mjs` (MC30 Biconomy/KMS).
- **Auth/segurança:** `jwt.mjs`, `jwt-fail-counter.mjs`, `rbac.mjs`, `admin-auth.mjs`, `require-mfa.mjs`, `sybil-check.mjs`, `rate-limiter.mjs`, `validate.mjs`.
- **Negócio:** `edicoes-core.mjs`, `cota-ativacao.mjs`, `credito.mjs`, `saldoRs.mjs`, `troco-senhas.mjs`, `referral.mjs`, `recursos-app-config.mjs`, `system-state.mjs`, `wizard-session.mjs`, `simulador.mjs`, `pulso.mjs`.
- **Integrações/obs:** `mp-client.mjs` (Mercado Pago), `pix-config.mjs`, `rag.mjs`, `guto-perfis.mjs`, `ia-preditiva.mjs`, `notificacoes-usuario.mjs`, `sentry-server.mjs`, `log-operacional.mjs`, `admin-helpers.mjs`.

### 3.3 Frontend
- **Hooks (8):** `useAdmin`, `useEdicoes` (poll 60s à função `edicoes`), `useIsMobile`, `useLanceFeedback`, `useRealtimeConfig` (MC34), `useRecursosApp` (MC29.1+realtime), `useShakeOnError`, `useTrocarPorSenhas`.
- **Páginas (15):** Dashboard, MercadoLances, MinhaCarteira, MeusAtivos, Vitrine, DetalheProduto, Configuracoes, Seguranca, SejaNossoParceiro, AdminPanel, Corporativo{Dashboard,Analytics,Banners,Carteira,Cotas}.
- **Contextos (3):** AppContext (negócio: saldo/perfil/edições/notificações), IdiomaContext (i18n pt/en/es), useAppContextEnvironment (ambiente UI/GUTO).

### 3.4 Contrato `Leilao.sol`
- **Funções:** `abrirEdicao`, `adicionarSenhas`, `darLance`, `apurarVencedor` (view), `comprometerLance` (commit cego MC28), `consolidarResultado`, `iniciarTransferenciaCoordenacao`, `aceitarTransferenciaCoordenacao` (M-02 2-step).
- **Eventos:** `LanceDado`, `EdicaoAberta`, `SenhasCreditadas`, `TransferenciaIniciada`, `LanceComprometido`, `ResultadoConsolidado`.
- **Guarda:** `modifier apenasCoordenacao` (7 usos). Solidity 0.8 (overflow safe).

## 4. Mapa de dependências (fluxo de dados)
```
Frontend (React/Vite, Privy embedded wallet)
  ├─ useRecursosApp ──(VITE_SUPABASE_* ? Supabase config_remota : fetch)──► recursos-app  fn
  │     └─ useRealtimeConfig ──WS──► Supabase Realtime (config_remota)            (MC34)
  ├─ CardLance/web3.js ──EIP-191 + darLance──► Contrato Leilao.sol (Sepolia)
  └─ chamadas REST ──► Netlify Functions
                          ├─ _lib/data-store.mjs (fachada)
                          │     ├─ data-store-blobs → bids-store (Netlify Blobs)
                          │     └─ data-store-supabase → Supabase (ATIVO em prod)
                          ├─ consolidar-lances → apuração off-chain → Flashbots → consolidarResultado
                          └─ signer.mjs → (local-key | Biconomy ERC-4337 + KMS owner)
Integrações externas: Privy, Ethers/Alchemy, Mercado Pago, Sentry, SendGrid[INCONCLUSIVO].
```
**Acoplamento/duplicação:** o `resolverRecursos` (backend `recursos-app-config.mjs`) está **duplicado** no frontend (`useRecursosApp.resolverParaPlataforma`) — necessário (lados diferentes) mas a manter em sincronia (dívida P2).

## 5. Matriz de riscos
| ID | Risco | Crit. | Estado/Evidência |
|---|---|---|---|
| RLS-1 | Leitura anónima de `lances` | P0 | ✅ Mitigado — anon→`[]`/401 (testado prod+staging) |
| SEC-1 | service_role no bundle | P0 | ✅ Ausente no `dist/` (grep=0) |
| SEC-2 | JWT/segredos hardcoded em src | P0 | ✅ 0 ocorrências |
| CHAIN-1 | `tx.origin`, reentrância, acesso | P0 | ✅ `tx.origin`=0; `apenasCoordenacao`×7; Solidity 0.8 |
| K2 | Split-brain no rollback do flip | P1 | ⚠️ Documentado — flip/rollback entre edições ou backfill (cloud.md §9.8) |
| OPS-1 | Dedup Netlify cancela deploy de commits sem mudança de conteúdo | P1 | ⚠️ Confirmado — flip/rollback exige `netlify deploy --build --prod` |
| OPS-2 | MCP Supabase indisponível | P2 | ⚠️ Usar CLI autenticada (`db query --linked`) |
| CAM-1 | Literais Web3 no bundle (darLance/endereço) | P2 | ⚠️ Pré-existente; MC29.1 é conformidade por plataforma, não ofuscação |
| CFG-1 | `config_remota` contrato feature-major vs platform-major | P2 | ⚠️ Documentado; seed corrigido aplicado |
| BUNDLE-1 | Bundle Privy 2.7MB | P2 | ⚠️ Avaliar code-split |
| ENV-1 | `SUPABASE_ANON_KEY` (backend) ausente em prod | P3 | ℹ️ Inócuo (adapter usa service_role) |

## 6. Dívidas técnicas (prioridade)
- **P1 — Reconciliação `lojistas` (cotas/wallet):** `cotas.mjs`/`wallet.mjs` ainda em Blobs; tabela `lojistas` existe no Supabase mas sem fachada/migração de consumo.
- **P1 — Realtime de lances/edições:** bloqueado por design (anti-sniping) e por tabelas inexistentes (`edicoes`/`notificacoes`). Requer redesenho (realtime pós-fecho ou Broadcast mediado pelo backend; criar tabelas).
- **P2 — Bundle:** code-split Privy/walletconnect; lazy-load de páginas corporativas.
- **P2 — Duplicação `resolverRecursos`** front/back: extrair contrato partilhado ou testes de paridade.
- **P2 — Camuflagem do bundle:** decidir se ofuscação real de strings Web3 é objetivo (hoje não é).
- **P3 — Higiene:** apagar `~/.mc33-staging.env`, `temp/`, `$null` (untracked).
- **[INCONCLUSIVO]** Cobertura de testes (sem relatório de coverage); SendGrid (referido no plano, não confirmado no inventário).

## 7. Recomendações
- **Curto prazo:** `graphify update .` (cache stale); seed/automação documentados; observação 24h do flip.
- **Médio prazo:** MC de reconciliação `lojistas`; code-split do bundle; testes de paridade do contrato de config.
- **Longo prazo:** redesenho do realtime de lances (pós-fecho/Broadcast); ofuscação real se for requisito de conformidade; relatório de cobertura de testes.

## 8. Checklist final de auditoria
| Verificação | Resultado |
|---|---|
| Inventário de ficheiros | ✅ |
| Mapa de funções (módulo) | ✅ (I/O por handler = [INVENTÁRIO]) |
| Grafos de dependência | ✅ manual · ⚠️ graphify stale (recomendado update) |
| RLS / anti-sniping | ✅ testado prod+staging |
| Segredos fora do bundle/código | ✅ |
| Segurança do contrato | ✅ (tx.origin=0, guard, 0.8) |
| 68/68 testes · build verde · CLS=0 | ✅ |
| Realtime config_remota ativo | ✅ (E2E prod) |
| Dívidas técnicas priorizadas | ✅ |
| Nenhum código modificado | ✅ (auditoria read-only) |

---
*Auditoria MC35 — read-only. Nenhum ficheiro de código alterado; apenas este relatório + atualização de `security_audit.md`.*
