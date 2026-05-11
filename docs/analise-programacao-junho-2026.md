# Análise — Programação de Bens Junho/2026
> **Fontes**:  
> - `DESAFIOGUT programaçao dos bens 1 (1).doc` (grade original, Word 97-2003)  
> - `Especificação Técnica Refatorada (1).pdf` (versão definitiva, Junho/2026)  
> **Data de análise**: 2026-05-11  
> **Status**: ✅ Todas as 7 inconsistências resolvidas pela especificação refatorada

---

## 1. Extração da Grade de Programação

### 1.1 Estrutura do Documento

O documento descreve a **grade de distribuição de clientes no aplicativo DesafioGUT durante junho/2026**, organizada por:
- Dia da semana + data específica (4 semanas completas, seg–sáb; domingos exclusivos)
- Horário de transmissão (slots de tempo)
- Cliente alocado (Bronze 01–27, Prata 01–81, Ouro 01, Diamante 01, Bônus 01–10)
- Tipo de leilão: **Relâmpago** (Bronze/Prata, 30min–1h) ou **Programado** (Ouro/Diamante, ciclos de 24h)

### 1.2 Grade Completa em JSON (schedule.json)

```json
{
  "meta": {
    "month": "2026-06",
    "version": "2.0",
    "source": "Especificação Técnica Refatorada (1).pdf",
    "platform": "DesafioGUT App",
    "company": "Grupo União e Trabalho",
    "site": "www.grupouniaoetrabalho.com.br"
  },

  "tiers": {
    "bronze":   { "slots": 27,  "exclusive": false, "price_brl": 2640.00,  "payment": "50% bens + 50% dinheiro", "banner_app": 8,  "banner_site": "1 VITRINE permanente",           "banner_period": "semanal horários alternados" },
    "prata":    { "slots": 81,  "exclusive": true,  "price_brl": 5600.00,  "payment": "50% bens + 50% dinheiro", "banner_app": 12, "banner_site": "1 FIXO INICIAL permanente",      "banner_period": "semanal triplicada" },
    "ouro":     { "slots": 1,   "exclusive": true,  "price_brl": 11000.00, "payment": "50% bens + 50% dinheiro", "banner_app": 20, "banner_site": "2 rotativos + 1 destaque",       "banner_period": "seg a sáb × 4 semanas" },
    "diamante": { "slots": 1,   "exclusive": true,  "price_brl": 18000.00, "payment": "50% bens + 50% dinheiro", "banner_app": 28, "banner_site": "2 rotativos + 1 destaque + redes sociais", "banner_period": "seg a dom × 4 semanas" }
  },

  "business_rules": {
    "min_product_value_brl": {
      "bronze":   660.00,
      "prata":    1350.00,
      "ouro":     2250.00,
      "diamante": 4500.00
    },
    "min_contract_months": 1,
    "payment_adesao": "PIX direto → familiaquildo@gmail.com (Banco do Brasil) — requer aprovação manual no Admin",
    "payment_fichas": "Mercado Pago → desafiogut@gmail.com — automatizado via Webhook",
    "delivery": "Premiação entregue na Loja indicada, documentada com fotos e vídeos",
    "product_quality_responsibility": "Contratante",
    "art_creation": "Gratuita via Auto-Gerador ou solicitação premium via Wallet Digital",
    "vale_credito": "Se Valor_Produto < Valor_Minimo_Cota → diferença gera Vale-Crédito na Wallet Digital"
  },

  "schedule": {
    "weekdays": {
      "slots_per_day": ["07:00", "11:00", "15:00", "19:00", "21:00"],
      "note": "21:00 é overnight — vai até 07:00 do dia seguinte (~10h)"
    },
    "saturday": {
      "slots_per_day": ["07:00", "09:00", "11:00", "13:00", "15:00", "17:00", "19:00", "21:00"]
    },
    "sunday": {
      "rule": "Exclusivo: apenas repetições de Prata + slot fixo Diamante",
      "slots_per_day": ["07:00", "09:00", "11:00", "13:00", "15:00", "17:00", "19:00", "21:00"],
      "filter": "auto — exibe apenas prata_repeat e diamante_01"
    }
  },

  "june_2026_sessions": [
    {
      "weekday": "monday", "dates": ["2026-06-01","2026-06-08","2026-06-15","2026-06-22"],
      "sessions": [
        { "time": "07:00", "week1": [{"client":"bronze_01","type":"relampago"},{"client":"prata_01","type":"relampago"}], "week2": [{"client":"bronze_10","type":"relampago"},{"client":"prata_10","type":"relampago"},{"client":"ouro_01","type":"programado","repeat":true},{"client":"diamante_01","type":"programado","repeat":true}], "week3": [{"client":"ouro_01","type":"programado","repeat":true},{"client":"diamante_01","type":"programado","repeat":true}], "week4": [{"client":"ouro_01","type":"programado","repeat":true},{"client":"diamante_01","type":"programado","repeat":true}] },
        { "time": "11:00", "week1": [{"client":"bronze_02","type":"relampago"},{"client":"prata_02","type":"relampago"},{"client":"bronze_03","type":"relampago"},{"client":"prata_03","type":"relampago"},{"client":"ouro_01","type":"programado","repeat":true},{"client":"diamante_01","type":"programado","repeat":true}] },
        { "time": "15:00", "week1": [{"client":"bronze_04","type":"relampago"},{"client":"prata_04","type":"relampago"},{"client":"ouro_01","type":"programado"},{"client":"diamante_01","type":"programado"}], "notes": "ouro/diamante iniciam ciclo de 24h às 15:00 semana 1" },
        { "time": "19:00", "week1": [{"client":"bronze_05","type":"relampago"},{"client":"prata_05","type":"relampago"},{"client":"bronze_06","type":"relampago"},{"client":"prata_06","type":"relampago"},{"client":"ouro_01","type":"programado","repeat":true},{"client":"diamante_01","type":"programado","repeat":true}] },
        { "time": "21:00", "week1": [{"client":"bronze_09","type":"relampago"},{"client":"prata_09","type":"relampago"},{"client":"ouro_01","type":"programado","repeat":true},{"client":"diamante_01","type":"programado","repeat":true}], "note": "overnight até 07:00" }
      ]
    },
    { "weekday": "tuesday",   "dates": ["2026-06-02","2026-06-09","2026-06-16","2026-06-23"], "pattern": "bronze_10..18, prata_10..18 semana 1; ouro/diamante repeat em todos horários" },
    { "weekday": "wednesday", "dates": ["2026-06-03","2026-06-10","2026-06-17","2026-06-24"], "pattern": "bronze_19..27, prata_19..27 semana 1; repete a partir de bronze_01 semana 2" },
    { "weekday": "thursday",  "dates": ["2026-06-04","2026-06-11","2026-06-18","2026-06-25"], "pattern": "bronze_02..10 repetidos semanas 2-4; ouro/diamante sempre presentes" },
    { "weekday": "friday",    "dates": ["2026-06-05","2026-06-12","2026-06-19","2026-06-26"], "pattern": "bronze_11..19, prata_11..19; ouro_01 e diamante_01 fresh (sem REPETIDO) semana 1" },
    { "weekday": "saturday",  "dates": ["2026-06-06","2026-06-13","2026-06-20","2026-06-27"], "pattern": "bronze_20..27, prata_20..27 semana 1; 8 slots (09h e 13h extras); prata repetidos final mês" },
    { "weekday": "sunday",    "dates": ["2026-06-07","2026-06-14","2026-06-21","2026-06-28"], "pattern": "EXCLUSIVO: prata_21..27 + prata_repeat; bonus_01..10 em 19:00 e 21:00 (4ª semana); diamante_01 fixed slot" }
  ],

  "bonus_clients": {
    "count": 10,
    "ids": ["bonus_01","bonus_02","bonus_03","bonus_04","bonus_05","bonus_06","bonus_07","bonus_08","bonus_09","bonus_10"],
    "type": "Vouchers de Networking — gerados pelo cliente Diamante",
    "when": "Domingos 19:00 e 21:00 (rotação na 4ª semana principalmente)",
    "benefit": "Isenção total da taxa de compra de fichas na primeira participação em leilões Bronze ou Prata",
    "mechanism": "Diamante gera código único de convite → indicado redime isenção"
  },

  "unassigned_slots": {
    "marker": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "meaning": "Slot não atribuído — aguardando confirmação de cliente",
    "fill_process": "Painel Admin da coordenação (Fase D do roadmap)",
    "count_approx": "~40% dos slots na 1ª semana, reduzindo nas seguintes"
  },

  "totals_estimate": {
    "sessions_per_day_weekday": 5,
    "sessions_per_day_weekend": 8,
    "total_sessions_june": 168,
    "unique_slots_bronze": 27,
    "unique_slots_prata": 81,
    "unique_slots_ouro": 1,
    "unique_slots_diamante": 1,
    "unique_slots_bonus": 10
  }
}
```

---

## 2. Modelo de Dados para Netlify Blobs

### 2.1 `schedule-2026-06` — Blob de Sessões

```typescript
interface ScheduleBlob {
  meta: ScheduleMeta;
  clients: Record<string, Client>;
  sessions: Session[];
  last_updated: string; // ISO 8601
}

interface ScheduleMeta {
  month: string;          // "2026-06"
  version: string;
  company: string;
  active: boolean;
}

interface Client {
  id: string;             // "bronze_01", "prata_15", "ouro_01"
  tier: "bronze" | "prata" | "ouro" | "diamante" | "bonus";
  slot_number: number;    // bronze/prata: 1–27/81; ouro/diamante: 1
  display_name?: string;
  goods_description?: string;
  min_lance_brl: number;  // R$ 0,01 padrão (Art. XXIII)
  banner_url?: string;    // auto-gerado se ausente
  logo_url?: string;
}

interface Session {
  id: string;             // "2026-06-01T07:00"
  date: string;           // "2026-06-01"
  time: string;           // "07:00"
  type: "relampago" | "programado";
  client_id: string;
  week: 1 | 2 | 3 | 4;
  repeat: boolean;        // true = REPETIDO (ponteiro de ID apenas, sem nova edição on-chain)
  status: "pending" | "active" | "closed" | "archived";
  edicao_id?: string;     // "R-1" quando aberta on-chain
  vencedor?: string;      // endereço on-chain
  menor_lance?: number;   // em centavos
}
```

### 2.2 `wallet:{cliente_id}` — Blob de Wallet Digital

```typescript
// Chave Netlify Blob: wallet:{cliente_id}
// Ex: wallet:bronze_01, wallet:diamante_01
interface WalletDigitalBlob {
  cliente_id: string;
  saldo_brl: number;        // saldo atual em R$, incluindo Vale-Crédito acumulado
  historico: WalletEntry[];
  last_updated: string;     // ISO 8601
}

interface WalletEntry {
  id: string;               // UUID
  type: "credito_vale" | "debito_arte" | "debito_renovacao" | "bonus_isencao";
  valor_brl: number;        // positivo = crédito, negativo = débito
  descricao: string;        // "Vale-Crédito: Produto R$500 < Mínimo R$660"
  session_id?: string;      // sessão de origem
  timestamp: string;        // ISO 8601
}
```

### 2.3 Endpoints Netlify Functions necessários

```javascript
// Schedule
// GET  /.netlify/functions/schedule           → lista sessões do mês
// GET  /.netlify/functions/schedule?date=...  → sessões de uma data
// GET  /.netlify/functions/schedule/next      → próxima sessão pending
// POST /.netlify/functions/schedule/open      → abre edição (programado auto-reset às 00:00)
// POST /.netlify/functions/schedule/close     → fecha edição + apura vencedor

// Wallet Digital
// GET  /.netlify/functions/wallet/:cliente_id          → saldo atual
// POST /.netlify/functions/wallet/:cliente_id/creditar → adiciona Vale-Crédito
// POST /.netlify/functions/wallet/:cliente_id/debitar  → desconta compra premium

// Bônus / Vouchers
// POST /.netlify/functions/bonus/gerar       → Diamante gera código de convite
// POST /.netlify/functions/bonus/resgatar    → indicado resgata isenção de fichas
```

---

## 3. Requisitos Técnicos

| # | Requisito | Prioridade | Complexidade | Status |
|---|-----------|------------|-------------|--------|
| RT-01 | **Endpoint `schedule`** — servir grade via Netlify Blob | P0 | Baixa | Pendente |
| RT-02 | **Tela "Grade"** — usuário vê próximas sessões em ordem | P0 | Média | Pendente |
| RT-03 | **Timer automático** — app abre/fecha edições por horário | P1 | Alta | Pendente |
| RT-04 | **Sistema de banners** — exibir banner do cliente ativo por tier (8/12/20/28/semana) | P1 | Média | Pendente |
| RT-05 | **Leilão Programado (Ouro/Diamante)** — ciclos de 24h, reset automático às 00:00, fixo no topo | P0 | Média | Parcialmente pronto |
| RT-06 | **Leilão Relâmpago (Bronze/Prata)** — 30min a 1h, seção "Oportunidade Agora" | P0 | Média | Parcialmente pronto |
| RT-07 | **Painel Admin** — coordenação atribui clientes a slots XXXXX | P1 | Alta | Pendente |
| RT-08 | **Notificação push** — avisar usuário ao iniciar nova sessão | P2 | Média | Pendente |
| RT-09 | **Repetição automática** — `repeat=true` não reabre edição on-chain, apenas reutiliza ponteiro | P1 | Média | Pendente |
| RT-10 | **Página Pública `/grade`** — schedule visível sem login | P2 | Baixa | Pendente |
| RT-11 | **Bônus / Vouchers (10)** — Diamante gera código; indicado resgata isenção | P1 | Média | Pendente |
| RT-12 | **Expiração overnight** — slot "21:00 às 7:00" dura ~10h | P1 | Média | Pendente |
| RT-13 | **Wallet Digital** — Netlify Blob `wallet:{cliente_id}`; Vale-Crédito; débito de arte premium | P1 | Média | Pendente |
| RT-14 | **Auto-Gerador de Banner** — gera banner dinâmico (título + logo) se cliente não enviar arte | P1 | Média | Pendente |
| RT-15 | **UI Responsiva: Slots 1-2 Sticky + Slots 3-4 Carousel** — mobile <768px | P0 | Média | Pendente |
| RT-16 | **Pagamento Adesão** — PIX direto (familiaquildo@gmail.com) + aprovação manual no Admin | P0 | Baixa | Parcialmente pronto |
| RT-17 | **Pagamento Fichas** — Mercado Pago (desafiogut@gmail.com) + Webhook automático | P0 | Baixa | Parcialmente pronto |

---

## 4. Inconsistências Resolvidas

Todas as 7 questões levantadas na análise inicial foram resolvidas pela **Especificação Técnica Refatorada**.

### ✅ P-01 — Slots "XXXXXXXXX"
**Resolução**: Slots aguardando confirmação de cliente. O preenchimento é feito via **Painel Admin** (Fase D). O sistema exibe esses slots como "Em breve" na grade pública.

### ✅ P-02 — Bronze "não exclusivo" — concorrência simultânea?
**Resolução**: No **Desktop**, todos os 4 slots são visíveis simultaneamente em grid. No **Mobile (<768px)**: Slot 1 (Diamante) + Slot 2 (Ouro) = "Sticky Highlights" no topo fixo; Slots 3 (Prata) + 4 (Bronze) = Carrossel horizontal deslizante abaixo — economiza espaço vertical sem perder navegabilidade.

### ✅ P-03 — "Repetido" na mesma hora em semanas diferentes
**Resolução**: O servidor carrega a grade semanal (Seg–Sáb) e **replica por 4 semanas alterando apenas os ponteiros de ID dos clientes Bronze/Prata**. Ouro e Diamante ficam fixos em todos os horários. Domingos: filtro automático exibe apenas repetições de Prata + slot fixo Diamante.

### ✅ P-04 — Duração real dos slots
**Resolução**:
- **Relâmpago (Bronze/Prata)**: 30 minutos a 1 hora por rodada. Seção "Oportunidade Agora".
- **Programado (Ouro/Diamante)**: Ciclos de 24 horas, reset automático às 00:00. Fixo no topo da página principal.

### ✅ P-05 — Bônus (10 clientes) — qual tier?
**Resolução**: Os 10 Bônus são **Vouchers de Networking gerados pelo cliente Diamante**. Não são um tier separado. O Diamante gera um código único de convite; o indicado recebe isenção total da taxa de compra de fichas na **primeira participação** em leilões Bronze ou Prata. Objetivo: entrada de novos usuários qualificados via indicação VIP.

### ✅ P-06 — Pagamento — dois fluxos distintos
**Resolução**: Dois fluxos completamente separados:
1. **Taxa de Adesão (Consultoria)**: PIX direto para `familiaquildo@gmail.com`. Requer **aprovação manual no Admin** para ativar o perfil.
2. **Operação Interna (Fichas)**: Mercado Pago (`desafiogut@gmail.com`). **Automatizado via Webhook** para liberação imediata de lances.

### ✅ P-07 — Quando os slots XXXXX serão preenchidos?
**Resolução**: Via **Painel Admin da coordenação** (Fase D). O processo deixa de ser manual (Word → app) e passa a ter interface dedicada. Para banners, o **Auto-Gerador** resolve os casos em que o cliente não enviou arte — gera banner dinâmico com título do produto + logo do perfil. Arte profissional pode ser solicitada via app com débito da Wallet Digital.

---

## 5. Roadmap Faseado (Atualizado)

### Estado atual (2026-05-11)

```
├── ✅ Contrato LeilaoGUT deployado (Sepolia, 0x59A7...)
├── ✅ Pipeline PIX → adicionarSenhas → darLance funcionando
├── ✅ Privy auth (Google/Email/Apple) validado
├── ✅ Edição R-1 aberta on-chain
├── ✅ MOCK_MODE=false em .env.production
├── ✅ Especificação técnica refatorada lida e incorporada
├── ⚠️ Pendente: abrirEdicao() automático por horário (RT-03)
├── ⚠️ Pendente: schedule.json no Netlify Blobs (RT-01)
├── ⚠️ Pendente: UI responsiva Sticky+Carousel mobile (RT-15)
├── ⚠️ Pendente: Wallet Digital Netlify Blob (RT-13)
└── ⚠️ Pendente: Dois fluxos de pagamento separados (RT-16, RT-17)
```

### Fase A — Fundação do Schedule (até 2026-05-25)

| Tarefa | Descrição | Blocker |
|--------|-----------|---------|
| A.1 | Criar `schedule-2026-06` em Netlify Blobs com as 168 sessões | — |
| A.2 | Netlify Functions: `GET /schedule`, `GET /schedule/next` | A.1 |
| A.3 | Tela "Grade" no app — lista próximas 10 sessões | A.2 |
| A.4 | UI Mobile: Slots 1-2 Sticky Highlights + Slots 3-4 Carousel Horizontal | — |

### Fase B — Automação de Sessões (até 2026-06-01)

| Tarefa | Descrição | Blocker |
|--------|-----------|---------|
| B.1 | Cron que verifica `/schedule/next` a cada minuto | A.2 |
| B.2 | Auto-open: `status=pending` + `hora_atual = session.time` → `abrirEdicao` on-chain | B.1 |
| B.3 | Auto-close: edição expirada → `apurarVencedor` | B.2 |
| B.4 | Programado: reset às 00:00, fica fixo no topo, não reabre on-chain (reutiliza edicao_id) | — |
| B.5 | Relâmpago `repeat=true`: não abre nova edição, apenas atualiza ponteiro | — |
| B.6 | Domingos: filtro automático exibe apenas prata_repeat + diamante_01 | B.1 |

### Fase C — Wallet + Banners + Bônus (até 2026-06-08)

| Tarefa | Descrição | Blocker |
|--------|-----------|---------|
| C.1 | Netlify Blob `wallet:{cliente_id}`: saldo, Vale-Crédito, histórico | — |
| C.2 | Auto-Gerador de Banner: título + logo quando cliente não enviou arte | C.1 |
| C.3 | Componente `<ClientBanner>` — exibe banner do cliente da sessão ativa | C.2 |
| C.4 | Rotação de banners por tier (8/12/20/28/semana) | C.3 |
| C.5 | Sistema de Vouchers Bônus: gerar código (Diamante) + resgatar isenção (indicado) | C.1 |
| C.6 | Separar fluxo Adesão (PIX manual) de Fichas (Mercado Pago Webhook) | — |

### Fase D — Painel Admin (até 2026-06-15)

| Tarefa | Descrição | Blocker |
|--------|-----------|---------|
| D.1 | Rota `/admin` protegida por endereço de coordenação | — |
| D.2 | Interface para preencher slots XXXXX com clientes reais | D.1 |
| D.3 | Aprovação manual de Adesão (PIX confirmado → ativa perfil) | D.1 |
| D.4 | Export da grade editada de volta para `schedule-2026-06` Blob | D.2 |

---

## 6. Schema Netlify Blob — Configuração Final

```json
{
  "blob_name": "schedule-2026-06",
  "schema_version": "2.0.0",
  "meta": {
    "month": "2026-06",
    "total_sessions": 168,
    "active_clients": { "bronze": 27, "prata": 81, "ouro": 1, "diamante": 1, "bonus": 10 },
    "last_updated": "2026-05-11T00:00:00Z",
    "updated_by": "coordination"
  },
  "clients": {},
  "sessions": [],
  "config": {
    "session_duration_relampago_seconds": 1800,
    "session_duration_relampago_max_seconds": 3600,
    "session_duration_programado_seconds": 86400,
    "session_duration_overnight_seconds": 36000,
    "programado_daily_reset_time": "00:00",
    "programado_sticky_top": true,
    "timezone": "America/Sao_Paulo",
    "auto_open_edicao": false,
    "auto_apurar_vencedor": false,
    "sunday_filter": ["prata_repeat", "diamante_01"]
  }
}
```

---

*Documento v2.0 — incorpora a Especificação Técnica Refatorada (Junho/2026). Todas as inconsistências resolvidas. Pronto para implementação.*
