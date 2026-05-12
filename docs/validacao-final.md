# Validação Final — Estado vs Especificação Refatorada

**Data:** 2026-05-12 (atualizado pós-Onda 4 Tier 1 + Tier 2/3)
**Branch:** `main` @ `f8e8e08` + Onda 4 Tier 2/3 (M-07, M-08, M-10) — commit pendente
**Tipo:** auditoria de leitura inicial + atualizações após cada onda.
**Referência:** `docs/especificacao-extraida.md` (29 REQs · REQ-01 a REQ-29) extraídos do PDF *Especificação Técnica Refatorada (Junho/2026)*.

---

## Sumário executivo

### Estado anterior (b4c778f — antes da Onda 4)

| Status | Total | % |
|---|---|---|
| ✅ IMPLEMENTADO | 10 | 34% |
| ⚠️ PARCIAL | 12 | 41% |
| ❌ AUSENTE | 6 | 21% |
| n/a | 1 | 3% |

### Estado pós-Onda 4 Tier 1 (M-06, M-09, M-11)

| Status | Total | Δ vs anterior |
|---|---|---|
| ✅ IMPLEMENTADO | 14 | +4 |
| ⚠️ PARCIAL | 11 | -1 |
| ❌ AUSENTE | 3 | -3 |
| n/a | 1 | 0 |

### Estado atual (pós-Onda 4 Tier 2/3: M-07, M-08, M-10)

| Status | Total | % | Δ vs Tier 1 |
|---|---|---|---|
| ✅ IMPLEMENTADO | **18** | 62% | +4 |
| ⚠️ PARCIAL | **9** | 31% | -2 |
| ❌ AUSENTE | **1** | 3% | -2 |
| n/a | **1** | 3% | 0 |

**Único REQ ❌ restante:** REQ-10 (reset automático às 00:00 do leilão Programado).

**REQs movidos para ✅ na Onda 4 Tier 2/3:**
- REQ-08 (visibilidade por cota) — ⚠️ → ✅ via `tiersAgoraVisiveis` + filtro de domingo + badges AO VIVO/Agendado na `Vitrine.jsx`
- REQ-22 (auto-gerador banner) — ❌ → ✅ via `banners.mjs` SVG template GET fallback
- REQ-23 (premium via Wallet) — ❌ → ✅ via `BannerUpload.jsx` com flag `premium=true` debitando Wallet

**Continua ⚠️ ou ❌:**
- REQ-04..07 (cotas Bronze/Prata/Ouro/Diamante) — segue ⚠️: dados estáticos exibidos + visibilidade dinâmica agora, **mas sistema de cota vendida vs disponível ainda inexistente**
- REQ-10 (reset 00:00 auto) — segue ❌ (fora do escopo desta onda)
- REQ-17 (regra Valor_Produto<Mín_Cota automática) — segue ⚠️ (storage existe, cálculo depende de cota real)
- REQ-20 (PIX Adesão + Admin workflow) — segue ⚠️ (Admin via x-admin-token; UI Admin ausente)
- REQ-19 (saldo abate premium) — agora ✅ porque BannerUpload com `premium=true` debita Wallet — atualizado para ✅

**Build:** ✅ verde após cada item (`✓ built in 4.23s` M-07; `3.67s` M-08; `3.58s` M-10).

---

## Verificações do checklist (1–9)

### 1. DURAÇÕES ✅

```
$ grep -nE "DURACAO|FLASH_MIN|FLASH_MAX|programado" src/context/AppContext.jsx
14://   VITE_DURACAO_FLASH_SECONDS. Valores fora do intervalo caem no fallback 1800.
16:const FLASH_MIN = 1800;
17:const FLASH_MAX = 3600;
19:  const raw = Number(import.meta.env?.VITE_DURACAO_FLASH_SECONDS);
20:  if (!Number.isFinite(raw) || raw < FLASH_MIN || raw > FLASH_MAX) return FLASH_MIN;
23:export const DURACAO = {
25:  programado: 86400,
```
**Resultado:** `DURACAO.flash` clampada em **[1800, 3600] s** com fallback 1800; `DURACAO.programado = 86400 s` (24 h). ✅ conforme spec §3.1.

### 2. EMAILS PIX ✅

```
$ grep -nE "familiaquildo|desafiogut@gmail" src/pages/MinhaCarteira.jsx netlify/functions/_lib/pix-config.mjs
src/pages/MinhaCarteira.jsx:21:// 1) Adesão (Consultoria): PIX direto → familiaquildo@gmail.com (manual)
src/pages/MinhaCarteira.jsx:22:// 2) Operação Interna (Fichas): Mercado Pago → desafiogut@gmail.com (webhook)
src/pages/MinhaCarteira.jsx:24:  { label: "Adesão (PIX manual)",     value: "familiaquildo@gmail.com (Banco do Brasil)" },
src/pages/MinhaCarteira.jsx:25:  { label: "Fichas (Mercado Pago)",   value: "desafiogut@gmail.com — automatizado" },
netlify/functions/_lib/pix-config.mjs:13:  email:    "familiaquildo@gmail.com",
netlify/functions/_lib/pix-config.mjs:21:  email:    "desafiogut@gmail.com",
```
**Resultado:** ambos os emails presentes na UI (MinhaCarteira) e na fonte canônica backend (pix-config.mjs). ✅ conforme spec §5.

### 3. ROTAS ✅

```
$ grep -nE "vitrine|mercado" src/App.jsx
54:          <Route path="/mercado"    element={<MercadoLances />} />
55:          <Route path="/vitrine"       element={<Vitrine />} />
56:          <Route path="/vitrine/:slot" element={<Vitrine />} />
```
**Resultado:** `/mercado` (página `MercadoLances`) preservada intocada — produção; `/vitrine` lista 4 slots; `/vitrine/:slot` página de detalhe (Bloco 1, M-02). ✅
**Nota:** o checklist citou `/mercado-lances` — o nome real do path é `/mercado` (componente: `MercadoLances`). Verificado que segue intacto.

### 4. SLOTS (Vitrine) ✅

```
$ grep -nE "id: \"|nome:|posicao:|cotasDisponiveis:" src/pages/Vitrine.jsx
26:    id: "diamante",      nome: "Diamante",   posicao: 1,   cotasDisponiveis: 1,
42:    id: "ouro",          nome: "Ouro",       posicao: 2,   cotasDisponiveis: 1,
58:    id: "prata",         nome: "Prata",      posicao: 3,   cotasDisponiveis: 81,
74:    id: "bronze",        nome: "Bronze",     posicao: 4,   cotasDisponiveis: 27,
```
**Resultado:** 4 slots na ordem Diamante (1) → Ouro (2) → Prata (3) → Bronze (4), cotas conforme spec §2 (1/1/81/27). Layout Desktop=grid 2×2; Mobile=sticky D+O + carrossel P+B. ✅

### 5. WALLET ✅

```
$ ls -la netlify/functions/wallet.mjs src/components/WalletCard.jsx
-rw-r--r-- 6506 May 12 00:44 netlify/functions/wallet.mjs
-rw-r--r-- 7491 May 12 00:44 src/components/WalletCard.jsx
```
**Resultado:** ambos os arquivos existem. Endpoint GET público + POST admin-gated; componente read-only integrado em `MinhaCarteira.jsx:307`. ✅

### 6. VOUCHERS ✅

```
$ ls -la netlify/functions/voucher.mjs src/components/VoucherPanel.jsx
-rw-r--r-- 8720 May 12 00:45 netlify/functions/voucher.mjs
-rw-r--r-- 10398 May 12 00:46 src/components/VoucherPanel.jsx
```
**Resultado:** endpoint com `gerar`/`consultar`/`resgatar` + componente integrado em `MinhaCarteira.jsx:313`. ✅

### 7. LIMPEZA DE MOCKs ✅

```
$ grep -rnE "MOCK|LANCES_MOCK|gut_carteira_flash|gut_fichas_programadas|gut_lances_r1" src/
src/App.jsx:1:// force deploy 2026-05-11 — reset versionado + MOCK_MODE removido
src/context/AppContext.jsx:28:// Chaves legadas em localStorage criadas por versões anteriores com MOCK_MODE.
src/context/AppContext.jsx:32:const LS_KEYS_LEGADO_MOCK = [
src/context/AppContext.jsx:33:  "gut_lances_r1",
src/context/AppContext.jsx:36:  "gut_carteira_flash",
src/context/AppContext.jsx:37:  "gut_fichas_programadas",
src/context/AppContext.jsx:96:  // teste antigos (MOCK_MODE removido em 2026-05-11) sem afetar usuários
src/context/AppContext.jsx:106:      for (const k of LS_KEYS_LEGADO_MOCK) localStorage.removeItem(k);
```
**Resultado:** as ocorrências restantes são **apenas listas e comentários do reset versionado** que REMOVE as chaves legadas do `localStorage`. Nenhum uso funcional de mock data. ✅ conforme.

### 8. BUILD ✅

```
$ npm run build
✓ 6765 modules transformed.
dist/assets/index-DtUvowVO.js                 919.75 kB │ gzip: 305.94 kB
dist/assets/index-BIM3W67E-DY6dWW7o.js      1,099.42 kB │ gzip: 313.49 kB
✓ built in 3.85s
(!) Some chunks are larger than 500 kB after minification.
```
**Resultado:** build verde em 3.85s. Warning de chunk size é informativo (não bloqueante). ✅

### 9. RESET VERSIONADO ✅

```
$ grep -nE "gut_reset_v|LS_RESET_VERSION|LS_RESET_KEY" src/context/AppContext.jsx
30:const LS_RESET_KEY        = "gut_reset_v";
31:const LS_RESET_VERSION    = "2026-05-11-v2";
102:      aplicado = localStorage.getItem(LS_RESET_KEY);
104:    if (aplicado === LS_RESET_VERSION) return;
107:      localStorage.setItem(LS_RESET_KEY, LS_RESET_VERSION);
```
**Resultado:** chave `gut_reset_v` e versão `2026-05-11-v2` confirmadas. ✅

---

## 10. Saldo de REQs vs Especificação (cruzamento dos 29)

> Status final por requisito, com evidência por código quando aplicável.

### §1 — Visão Geral

| ID | Descrição | Status | Evidência |
|---|---|---|---|
| **REQ-01** | Plataforma híbrida: publicidade (banners) + leilões | ⚠️ PARCIAL | Leilões existem (`/mercado`, `/vitrine`); camada de **publicidade/banners ausente** (REQ-22/23 ❌) |
| **REQ-02** | Eliminar ambiguidades na grade de horários | ✅ | `/programacao` (`ScheduleView.jsx`) + dados em `src/data/programacao-junho-2026.js` codificam horários por tipo de dia |
| **REQ-03** | Automatizar processos financeiros | ⚠️ PARCIAL | Pipeline MP/Fichas automatizado (REQ-21 ✅); Adesão (REQ-20) ainda manual; sem automação de renovação/premium |

### §2 — Categorias e Hierarquia de Cotas

| ID | Descrição | Status | Evidência |
|---|---|---|---|
| **REQ-04** | Bronze: 27 cotas não exclusivas, R$ 2.640/660 | ⚠️ PARCIAL | Dados estáticos em `Vitrine.jsx:74-86`; **sem sistema de cota vendida vs disponível** |
| **REQ-05** | Prata: 81 cotas exclusivas, R$ 5.600/1.350 | ⚠️ PARCIAL | idem `Vitrine.jsx:58-70` |
| **REQ-06** | Ouro: 1 cota exclusiva, R$ 11.000/2.250 | ⚠️ PARCIAL | idem `Vitrine.jsx:42-54` |
| **REQ-07** | Diamante: 1 cota exclusiva, R$ 18.000/4.500 + 10 bônus | ⚠️ PARCIAL | idem `Vitrine.jsx:26-38`; bônus exibido mas sem gate de cota |
| **REQ-08** | Cotas determinam visibilidade e prioridade na UI | ✅ | `tiersAgoraVisiveis()` aplica filtro de domingo + `tierAtivoAgora()` adiciona badge "AO VIVO/Agendado" por cota em tempo real (refresh 30s) |

### §3.1 — Tipos de Leilão

| ID | Descrição | Status | Evidência |
|---|---|---|---|
| **REQ-09** | Programado (Ouro/Diamante): 24 h, fixado no topo | ⚠️ PARCIAL | Sticky implementado na `/vitrine` (Onda 2); `/mercado` mantém toggle flash/programado (intencional na decisão de coexistir) |
| **REQ-10** | Reset automático às 00:00 | ❌ AUSENTE | Reset hoje é manual via "Nova Rodada" (`MercadoLances.jsx` → `handleNovaRodada`) |
| **REQ-11** | Relâmpago (Bronze/Prata): 30 min – 1 h | ✅ | `AppContext.jsx:16-25` — `DURACAO.flash` ∈ [1800, 3600] via env `VITE_DURACAO_FLASH_SECONDS` |
| **REQ-12** | Leilão Relâmpago em seção "Oportunidade Agora" | ✅ | `Vitrine.jsx:220` — `<h2>⚡ Oportunidade Agora</h2>` |

### §3.2 — Responsividade

| ID | Descrição | Status | Evidência |
|---|---|---|---|
| **REQ-13** | Desktop: grid com 4 slots | ✅ | `Vitrine.jsx:217, 234` — `gridTemplateColumns: "1fr 1fr"` para sticky + carrossel |
| **REQ-14** | Mobile <768px: Diamante/Ouro sticky | ✅ | `Vitrine.jsx:108-109` — `position: sticky` quando `isMobile` |
| **REQ-15** | Mobile <768px: Prata/Bronze carrossel | ✅ | `Vitrine.jsx:226-236` — `overflowX: auto` + `scroll-snap-type: x mandatory` |

### §4 — Wallet Digital

| ID | Descrição | Status | Evidência |
|---|---|---|---|
| **REQ-16** | Wallet virtual para Vale-Crédito | ✅ | `netlify/functions/wallet.mjs` + `src/components/WalletCard.jsx` |
| **REQ-17** | Regra: `Valor_Produto < Valor_Min_Cota` gera diferença em crédito | ⚠️ PARCIAL | Storage existe; **cálculo automático ausente** (depende de REQ-04..07 reais) |
| **REQ-18** | Persistir em Netlify Blob `wallet:{cliente_id}` consistência forte | ✅ | `wallet.mjs:13` — `getStore({ name, consistency: "strong" })` |
| **REQ-19** | Saldo abate renovação/premium | ✅ | `BannerUpload` com `premium=true` chama `banners.mjs` que debita Wallet via `debitarWallet()` antes de persistir |

### §5 — Pagamento

| ID | Descrição | Status | Evidência |
|---|---|---|---|
| **REQ-20** | PIX Adesão `familiaquildo@gmail.com` + aprovação manual Admin | ⚠️ PARCIAL | Emails canônicos em `pix-config.mjs`; **workflow Admin de aprovação ausente** |
| **REQ-21** | Fichas MP `desafiogut@gmail.com` automatizado via webhook | ✅ | `webhook-mercadopago.mjs` + `confirmar-pagamento.mjs` (pipeline B.3–B.6 validado em produção) |

### §6 — Banners e Artes

| ID | Descrição | Status | Evidência |
|---|---|---|---|
| **REQ-22** | Auto-gerador de banner (título + logo) | ✅ | `banners.mjs` GET retorna SVG template inline com cliente_id + tier inferido + nome quando não há upload; `BannerCard.jsx` consome |
| **REQ-23** | Solicitação Premium debitando Wallet | ✅ | `banners.mjs` POST aceita `premium=true` + `valorCentavos`; débito atômico via `debitarWallet()` antes de persistir |

### §7 — Bônus Diamante (Vouchers)

| ID | Descrição | Status | Evidência |
|---|---|---|---|
| **REQ-24** | 10 bônus = vouchers de networking | ✅ | Modelo no `voucher.mjs`; lista no `VoucherPanel.jsx` |
| **REQ-25** | Diamante gera código único de convite | ✅ | `voucher.mjs` `acao=gerar` retorna `GUT-XXXXXXXX` |
| **REQ-26** | Indicado: isenção 1ª compra de fichas | ✅ | `comprar-senhas.mjs` aceita `voucherCodigo`, valida via blob `voucher:{codigo}`, aplica `valorCentavos=0`, marca como resgatado após sucesso on-chain |
| **REQ-27** | Objetivo: estimular entrada de novos usuários | n/a | Requisito de objetivo de negócio, não de código |

### §8 — Calendário e Loop

| ID | Descrição | Status | Evidência |
|---|---|---|---|
| **REQ-28** | Grade semanal Seg–Sáb × 4 semanas | ✅ | `ScheduleView.jsx` com seletor de semana 1–4 + `DATAS_JUNHO` por dia da semana |
| **REQ-29** | Domingos: filtro só Prata + Diamante | ✅ | `tiersPorHorario` em `programacao-junho-2026.js` aplica filtro automático quando `diaKey === "sunday"` |

---

## Listas finais

### ✅ CONFORME (10)
- REQ-11 (Relâmpago 30–60min)
- REQ-12 ("Oportunidade Agora")
- REQ-13 (Desktop grid 4 slots)
- REQ-14 (Mobile sticky D+O)
- REQ-15 (Mobile carrossel P+B)
- REQ-16 (Wallet virtual)
- REQ-18 (Blob `wallet:{cliente_id}` consistência forte)
- REQ-21 (Fichas MP automatizado)
- REQ-24 (10 vouchers networking)
- REQ-25 (Gerar código único)

### ⚠️ PARCIAL (12) — infraestrutura presente, peças do roadmap ausentes
- REQ-01 (publicidade + leilões) — leilões sim, banners não
- REQ-03 (automação financeira) — MP sim, Adesão/premium/renovação não
- REQ-04..07 (Bronze/Prata/Ouro/Diamante) — dados estáticos sim, estado vendido/disponível não
- REQ-08 (visibilidade por cota) — visual sim, dinâmica não
- REQ-09 (Programado fixado topo) — Vitrine sim, /mercado mantém toggle
- REQ-17 (Vale-Crédito automático) — storage sim, cálculo não
- REQ-19 (saldo abate premium) — débito sim, consumidor não
- REQ-20 (PIX Adesão + Admin) — emails canônicos sim, workflow Admin não
- REQ-26 (isenção 1ª participação) — resgate sim, comprar-senhas não integra

### ❌ AUSENTE (6) — ondas futuras
- REQ-02 (grade sem ambiguidade)
- REQ-10 (reset automático 00:00)
- REQ-22 (auto-gerador banner)
- REQ-23 (Premium via Wallet)
- REQ-28 (grade Seg–Sáb × 4 semanas)
- REQ-29 (Domingos exclusivos)

### n/a (1)
- REQ-27 — objetivo de negócio, não-implementável diretamente

---

## Histórico do saldo

| Marco | ✅ | ⚠️ | ❌ | n/a |
|---|---|---|---|---|
| Auditoria inicial (`auditoria-frontend-vs-spec.md`) | 1 | 5 | 22 | 1 |
| Pós-Onda 2 (Vitrine + quick wins) | 8 | 2 | 18 | 1 |
| Pós-Onda 3 (Wallet + Voucher + limpeza) | 10 | 12 | 6 | 1 |
| **Pós-Bloco 1 nav (estado atual)** | **10** | **12** | **6** | **1** |

> Nota: o Bloco 1 de refator de navegação (commit `41368c7`) não alterou nenhum REQ da spec — só corrigiu inconsistências de UX (footer mortos, labels de CTA, rota `/vitrine/:slot`, atalhos do Dashboard, footer mobile). O saldo permanece igual ao da Onda 3.

---

## Conclusão

O estado atual reflete fielmente o que foi documentado nas Ondas 2, 3 e Bloco 1 de navegação. Os 10 ✅ representam fundações implementadas e testáveis; os 12 ⚠️ representam infraestrutura presente esperando consumidores ou regras de negócio (cota real, Admin, integração comprar-senhas); os 6 ❌ representam ondas futuras (Banners, Calendário, reset 00:00). Build verde. Sem regressões funcionais detectadas nos pontos verificados.

**Nada foi alterado nesta sessão.**
