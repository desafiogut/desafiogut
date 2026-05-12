# Especificação Técnica Refatorada — Requisitos Extraídos

**Fonte:** `Especificação Técnica Refatorada (2).pdf` (2 páginas, Junho/2026)
**Data da extração:** 2026-05-12
**Total de requisitos:** 29 (REQ-01 a REQ-29)

Cada requisito tem **ID único**, **seção-fonte do PDF**, **descrição literal/parafraseada** e **classificação** (UI = frontend visual; BE = backend/endpoint; REGRA = regra de negócio; DATA = modelo de dados).

---

## §1 — Visão Geral

| ID | Seção | Tipo | Descrição |
|---|---|---|---|
| **REQ-01** | §1 | REGRA | Plataforma híbrida: publicidade (banners) **+** vendas por leilão (relâmpago e programado). |
| **REQ-02** | §1 | REGRA | Eliminar ambiguidades na grade de horários. |
| **REQ-03** | §1 | BE/REGRA | Automatizar processos financeiros. |

## §2 — Categorias e Hierarquia de Cotas

| ID | Seção | Tipo | Descrição |
|---|---|---|---|
| **REQ-04** | §2 | DATA | Bronze: 27 cotas **não exclusivas** · R$ 2.640 contrato · R$ 660 produto mín · 1 banner vitrine + 8 banners app. |
| **REQ-05** | §2 | DATA | Prata: 81 cotas **exclusivas** · R$ 5.600 · R$ 1.350 · 1 banner fixo + 12 banners app. |
| **REQ-06** | §2 | DATA | Ouro: 1 cota **exclusiva** · R$ 11.000 · R$ 2.250 · 2 banners rotativos + 20 app. |
| **REQ-07** | §2 | DATA | Diamante: 1 cota **exclusiva** · R$ 18.000 · R$ 4.500 · 2 banners rotativos + 28 app + 10 bônus. |
| **REQ-08** | §2 | REGRA | Cotas determinam visibilidade e prioridade na UI. |

## §3.1 — Tipos de Leilão

| ID | Seção | Tipo | Descrição |
|---|---|---|---|
| **REQ-09** | §3.1 | REGRA | Leilão **Programado** (Ouro/Diamante): ciclos de **24 horas**, fixado no topo da página principal. |
| **REQ-10** | §3.1 | REGRA | Leilão Programado: **reset automático às 00:00**. |
| **REQ-11** | §3.1 | REGRA | Leilão **Relâmpago** (Bronze/Prata): duração **30 min a 1 hora**. |
| **REQ-12** | §3.1 | UI | Leilão Relâmpago exibido em seção "Oportunidade Agora". |

## §3.2 — Prioridade de Exibição e Responsividade

| ID | Seção | Tipo | Descrição |
|---|---|---|---|
| **REQ-13** | §3.2 | UI | **Desktop**: grid com **4 slots** simultaneamente visíveis. |
| **REQ-14** | §3.2 | UI | **Mobile (<768px)**: Slot 1 (Diamante) e Slot 2 (Ouro) como **Sticky Highlights** no topo. |
| **REQ-15** | §3.2 | UI | Mobile: Slots 3 (Prata) e 4 (Bronze) em **Carrossel Horizontal** abaixo dos destaques. |

## §4 — Gestão Financeira e Wallet Digital

| ID | Seção | Tipo | Descrição |
|---|---|---|---|
| **REQ-16** | §4 | REGRA | Wallet virtual para modelo de **"Vale-Crédito"**. |
| **REQ-17** | §4 | REGRA | Regra do Saldo: se `Valor_Produto < Valor_Minimo_Cota`, a diferença gera Vale-Crédito. |
| **REQ-18** | §4 | BE/DATA | Persistir saldo em **Netlify Blob** com chave `wallet:{cliente_id}`, **consistência forte**. |
| **REQ-19** | §4 | REGRA | Saldo Wallet abate custos de **renovação** ou **compra de artes premium**. |

## §5 — Fluxo de Pagamento e Assinatura

| ID | Seção | Tipo | Descrição |
|---|---|---|---|
| **REQ-20** | §5.1 | REGRA | **Taxa de Adesão (Consultoria)**: PIX direto → `familiaquildo@gmail.com`. Requer **aprovação manual no Admin** para ativar o perfil. |
| **REQ-21** | §5.2 | BE | **Operação Interna (Fichas)**: Mercado Pago → `desafiogut@gmail.com`. **Automatizado via webhook** para liberação imediata de lances. |

## §6 — Automação de Banners e Artes

| ID | Seção | Tipo | Descrição |
|---|---|---|---|
| **REQ-22** | §6 | BE/UI | **Auto-Gerador**: quando o cliente não envia arte, o sistema gera banner dinâmico usando título do produto + logo do perfil. |
| **REQ-23** | §6 | BE/UI | **Solicitação Premium**: cliente solicita arte profissional via app, custo debitado da Wallet Digital. |

## §7 — Bônus Diamante (Vouchers de Networking)

| ID | Seção | Tipo | Descrição |
|---|---|---|---|
| **REQ-24** | §7 | REGRA | Os 10 bônus do cliente Diamante funcionam como **Vouchers de Networking**. |
| **REQ-25** | §7 | BE | Diamante gera **código único de convite**. |
| **REQ-26** | §7 | REGRA | Indicado: **isenção total** da taxa de compra de fichas na **primeira participação** em leilões Bronze ou Prata. |
| **REQ-27** | §7 | REGRA | Objetivo: estimular entrada de novos usuários qualificados via indicação VIP. |

## §8 — Calendário e Automação de Loop

| ID | Seção | Tipo | Descrição |
|---|---|---|---|
| **REQ-28** | §8 | BE | **Lógica programática**: servidor carrega grade semanal (Seg–Sáb) e replica por **4 semanas**, alterando apenas os **ponteiros de ID** dos clientes Bronze/Prata. |
| **REQ-29** | §8 | BE/REGRA | **Domingos Exclusivos**: filtro automático exibe apenas repetições de Prata + slot fixo de Diamante. |

---

## Sumário por classificação

| Tipo | Total | IDs |
|---|---|---|
| UI (frontend visual) | 4 | REQ-12, REQ-13, REQ-14, REQ-15 |
| UI + Backend | 2 | REQ-22, REQ-23 |
| REGRA de negócio | 13 | REQ-01, REQ-02, REQ-08, REQ-09, REQ-10, REQ-11, REQ-16, REQ-17, REQ-19, REQ-20, REQ-24, REQ-26, REQ-27 |
| BE (backend/endpoint) | 4 | REQ-03, REQ-21, REQ-25, REQ-28 |
| BE + REGRA | 1 | REQ-29 |
| DATA (modelo de dados) | 5 | REQ-04, REQ-05, REQ-06, REQ-07, REQ-18 |
