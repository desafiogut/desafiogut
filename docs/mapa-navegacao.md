# Mapa de Navegação — DesafioGUT

**Data:** 2026-05-12
**Branch:** `main` @ `675faaa`
**Método:** análise manual por leitura de código (sem MCP/uxaudit nesta sessão — ver `inventario-remocao.md` para limitações de tooling).

---

## 1. Árvore de rotas atuais (`src/App.jsx:49-58`)

```
/                       Dashboard           (index)
/carteira               MinhaCarteira       (WalletCard + VoucherPanel)
/mercado                MercadoLances       (leilão R-1 — produção validada)
/vitrine                Vitrine             (4 slots informativos — Onda 2)
/ativos                 MeusAtivos          (histórico de lances)
/seguranca              Seguranca           (status sessão + checks LGPD)
/configuracoes          Configuracoes       (notif/idioma/tema — em breve)
```

Gate global: `TermosConsentimento` (LGPD) renderiza antes do Router (`App.jsx:41-43`).

## 2. Shells de navegação

### Desktop — Sidebar lateral (`src/widgets/layout/Sidebar.jsx`)
- 7 links no `NAV_ITEMS`: Dashboard / Minha Carteira / Mercado de Lances / **Vitrine (4 Slots)** / Meus Ativos / Segurança / Configurações.
- Avatar + nome do usuário; status `🔗 saldoSenhas` com sufixo.
- CTA único: **"⚡ Aceito o DesafioGUT"** (login) ou **"🚪 Sair"** (logout).
- Botão recolher (240px ↔ 72px).

### Mobile — BottomNav fixo (`src/widgets/layout/BottomNav.jsx`)
- 3 tabs principais: **Início** (`/`) · **Lances** (`/mercado`) · **Carteira** (`/carteira`).
- Botão **Mais** abre sheet com `SECONDARY_LINKS`: **Vitrine (4 Slots)** / Meus Ativos / Segurança / Configurações.
- No sheet: CTA login/logout repetido.

### Layout global (`src/widgets/layout/Layout.jsx`)
- Desktop: rodapé global com links âncora **`#privacidade` / `#termos` / `#suporte`** + copyright.
- Mobile: sem rodapé global (apenas `<BottomNav />` fixa).

## 3. Página por página — CTAs e saídas

| Página | CTAs internos | Navega para | Estado vazio | Modal disparado |
|---|---|---|---|---|
| **Dashboard** | 4 KPI cards (clickable) + "⚡ Ir para o Mercado" + 6 atalhos | `/carteira` (×2 KPI + 2 atalhos) · `/mercado` (×2) · `/ativos` (×2) · `/seguranca` · `/configuracoes` | Header diferente para `!isConnected` (sem CTA login direto — depende do Sidebar/BottomNav) | — |
| **MinhaCarteira** | "Comprar Fichas" · "Trocar por Senhas" · "Ir para Lance Relâmpago" · "Aceito DesafioGUT" (se !connected) · WalletCard "↻ Atualizar" · VoucherPanel "↻ Atualizar" + "Validar" | `/mercado` (3 CTAs distintos: KPI click, atalho, botão direto) | "Faça login para visualizar…" + botão | `ComprarFichasModal` |
| **MercadoLances** | "Confirmar Lance" · "🔄 Nova Rodada" (overlay vencedor) · "⚡ Entrar" (header AuthArea) · toggle `Modo: Relâmpago/Programado` | — (autocontido — sem navegação externa) | Aviso "Leilão encerrado" inline | OverlayVencedor + CountdownOverlay |
| **Vitrine** | 4× "Participar do leilão →" (SlotCards) | `/mercado` (TODOS os 4 slots vão pro mesmo destino) | — | — |
| **MeusAtivos** | Filtros (Todos/Únicos/Repetidos) + CTA "Aceito DesafioGUT — Entrar" (se !connected) | — (autocontido) | "Nenhum lance encontrado" (sem CTA para dar lance) | — |
| **Seguranca** | Links externos LGPD (Iubenda) + Etherscan | externos (target=_blank) | — | — |
| **Configuracoes** | Desconectar · "Aceito DesafioGUT — Entrar" · Salvar (toast efêmero) · seletores notif/idioma/tema (✗ em breve) | — | "Faça login para acessar…" + botão | — |

## 4. TABELA DE INCONSISTÊNCIAS

> Severidade: 🔴 alta (bloqueia/confunde usuário) · 🟡 média (UX inconsistente) · 🔵 baixa (cosmético/manutenção)

| # | Severidade | Categoria | Achado | Evidência |
|---|---|---|---|---|
| **I-01** | 🔴 | Dead link | Footer global do Layout tem 3 âncoras (`#privacidade`, `#termos`, `#suporte`) que **não levam a lugar nenhum** | `Layout.jsx:59-61` |
| **I-02** | 🔴 | UX confusão | Os 4 SlotCards da `/vitrine` (Diamante/Ouro/Prata/Bronze) **apontam todos para `/mercado`**, que hospeda apenas a edição R-1 (mistura flash/programado via toggle) | `Vitrine.jsx:155` (`to="/mercado"` no SlotCard genérico) |
| **I-03** | 🟡 | CTA labels divergentes | Botão de login tem **5 labels diferentes** no app: "⚡ Aceito o DesafioGUT" (Sidebar/BottomNav) · "⚡ Entrar" (MercadoLances) · "⚡ Aceito o DesafioGUT — Entrar" (MinhaCarteira/Configuracoes) · "⚡ Aceito o DesafioGUT — Entrar para ver seus lances" (MeusAtivos) · "⚡ Ir para o Mercado de Lances" (Dashboard, mas é navegação não login) | múltiplos arquivos |
| **I-04** | 🟡 | Discoverability | `Dashboard.ATALHOS` tem 6 entradas mas **omite `/vitrine`** (rota nova da Onda 2). Usuário só descobre Vitrine pelo Sidebar/BottomNav | `Dashboard.jsx:21-28` |
| **I-05** | 🟡 | Labels de rota | Mesma rota tem 3 nomes: Sidebar "Mercado de Lances" · BottomNav "Lances" · Dashboard atalho "Dar Lance" · path `/mercado` | `Sidebar.jsx:63`, `BottomNav.jsx:40`, `Dashboard.jsx:24` |
| **I-06** | 🟡 | Ícones duplicados | "Vitrine" e "Mercado" usam o **mesmo ícone `IconTarget`** no Sidebar e BottomNav, impossível distinguir visualmente | `Sidebar.jsx:63,64`, `BottomNav.jsx:40, BottomNav.jsx:45` |
| **I-07** | 🟡 | Footers conflitantes | 4 páginas têm footer próprio (`MercadoLances`, `Vitrine`, `Dashboard`, `MeusAtivos`) com conteúdo diferente; Layout tem footer global. **Usuário vê footers diferentes a cada página** | múltiplos |
| **I-08** | 🟡 | Atalhos com falsa promessa | Dashboard ATALHOS "Depositar PIX" e "Converter Ficha" navegam para `/carteira` mas **não abrem o modal específico** — usuário chega na carteira e ainda precisa caçar o botão | `Dashboard.jsx:22-23` |
| **I-09** | 🟡 | Empty state sem CTA | MeusAtivos com `isConnected` mas sem lances mostra "Nenhum lance encontrado" sem botão "Dar Lance" | `MeusAtivos.jsx:142-145` |
| **I-10** | 🟡 | Mobile sem rodapé | Footer global do Layout só renderiza em **desktop** (`Layout.jsx:45 if(!isMobile)`); mobile não tem Privacidade/Termos acessível fora da página `/seguranca` | `Layout.jsx:45` |
| **I-11** | 🟡 | Avatar não-acessível | Sidebar avatar tem `onClick={!isConnected ? abrirModal}` mas **é um `<div>`**, não focável por teclado, sem `role="button"` | `Sidebar.jsx:121-125` |
| **I-12** | 🟡 | A11y: páginas sem aria-label | 5 páginas têm **zero `aria-label`** em buttons: MercadoLances, MeusAtivos, Seguranca, MinhaCarteira (mostly) — botões com apenas emoji ou texto curto não anunciam contexto ao screen reader | grep `aria-label` retornou 0 em `pages/Mercado*`, `pages/Meus*`, `pages/Seguranca*` |
| **I-13** | 🟡 | Tabela sem headers semânticos | `MeusAtivos.DesktopTable` usa `<th>` mas sem `scope="col"` nem `<caption>` | `MeusAtivos.jsx:248-253` |
| **I-14** | 🔵 | Sidebar sem landmark | `<aside>` do Sidebar não tem `aria-label="Navegação principal"`; `<nav>` interna idem | `Sidebar.jsx:88, 174` |
| **I-15** | 🔵 | Sem skip link | Falta `<a href="#main">Pular para o conteúdo</a>` em Layout — usuário de teclado precisa tabular por toda Sidebar | `Layout.jsx` |
| **I-16** | 🔵 | Configurações sem persistência | Toggles `notifLances/notifVencedor/notifPix`, `idioma`, `tema` são `useState` local; "Salvar" só mostra toast — **nada persiste** entre reloads | `Configuracoes.jsx:15-24` |
| **I-17** | 🔵 | Botão idempotente sem feedback | WalletCard / VoucherPanel "↻ Atualizar" não dá feedback visual de sucesso (só estado loading) | `WalletCard.jsx:96`, `VoucherPanel.jsx:115` |
| **I-18** | 🔵 | Header inconsistente | MercadoLances tem header próprio (com Logo + Timer + AuthArea); demais páginas usam só o título inline. Em mobile, MercadoLances duplica auth widget — Sidebar/BottomNav já mostra | `MercadoLances.jsx:233-327` |
| **I-19** | 🔵 | Sem feedback de rota ativa em Dashboard | Dashboard tem 4 KPIs + 6 atalhos clicáveis, mas nenhum tem hover/focus distintivo além do estilo base | `Dashboard.jsx:132-156, 301-322` |

## 5. Pontos altos preservar

- BottomNav modal "Mais" tem **`role="dialog" aria-modal="true" aria-label="Mais opções"`** + botão fechar com `aria-label` (`BottomNav.jsx:120-122, 143`).
- Vitrine tem `aria-label="Destaques fixos no topo"` e `aria-label="Oportunidade Agora — Prata e Bronze"` nas `<section>` (`Vitrine.jsx:204, 220`).
- WalletCard e VoucherPanel têm `aria-label` nos botões ↻ Atualizar e Validar.
- TermosConsentimento bloqueia rota até consentimento — gate forte LGPD.
- Privy Embedded Wallet abstrai complexidade de assinatura on-chain — usuário comum não precisa entender crypto.

## 6. Mapa textual

```
TermosConsentimento (gate LGPD)
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Layout (Sidebar desktop / BottomNav mobile + Outlet)                │
│                                                                     │
│  Dashboard (/)                                                      │
│   ├─ KPI Saldo (R$)        → /carteira                              │
│   ├─ KPI Senhas             → /carteira                             │
│   ├─ KPI Lances Únicos      → /mercado                              │
│   ├─ KPI Total Lances       → /ativos                               │
│   ├─ Edição Ativa "Ir Mercado" → /mercado                           │
│   └─ Atalhos × 6 (sem Vitrine!) → /carteira, /mercado, /ativos, …  │
│                                                                     │
│  MinhaCarteira (/carteira)                                          │
│   ├─ Saldo R$ → ComprarFichasModal (open)                          │
│   ├─ WalletCard (read-only)                                         │
│   ├─ VoucherPanel (consultar)                                       │
│   ├─ Saldo Senhas → /mercado (3 CTAs)                              │
│   └─ Histórico lances (autocontido)                                 │
│                                                                     │
│  MercadoLances (/mercado)                                           │
│   ├─ CardLance (form de lance)                                      │
│   ├─ TabelaLances (autocontido)                                     │
│   ├─ Toggle Modo (flash/programado)                                 │
│   └─ OverlayVencedor → handleNovaRodada (interno)                  │
│                                                                     │
│  Vitrine (/vitrine)                                                 │
│   ├─ 4 SlotCards (Diamante/Ouro/Prata/Bronze)                       │
│   └─ TODOS → /mercado  ⚠ confusão I-02                             │
│                                                                     │
│  MeusAtivos (/ativos) — autocontido (filtros + lista)              │
│  Seguranca (/seguranca) — links externos LGPD                       │
│  Configuracoes (/configuracoes) — toggles sem persistência          │
│                                                                     │
│  Footer Desktop: #privacidade, #termos, #suporte (DEAD)             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Próximos artefatos

- [`plano-refatoracao-navegacao.md`](./plano-refatoracao-navegacao.md) — priorização de cada inconsistência.
- [`scripts/teste-navegacao.mjs`](../scripts/teste-navegacao.mjs) — script Playwright local para regressão.
