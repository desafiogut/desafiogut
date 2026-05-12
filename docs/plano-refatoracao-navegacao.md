# Plano de Refatoração — Navegação DesafioGUT

**Data:** 2026-05-12
**Base:** [`mapa-navegacao.md`](./mapa-navegacao.md) — 19 inconsistências catalogadas (I-01 a I-19).
**Estado:** plano proposto — aguardando aprovação antes de qualquer alteração.

---

## Priorização

| Prioridade | Definição | Critério |
|---|---|---|
| **🔴 ALTA** | Bloqueia ou confunde fluxos de usuário; risco de regressão na UX da spec | Atacar primeiro |
| **🟡 MÉDIA** | Inconsistência visível de marca/CTA; débito acumulado | Atacar depois |
| **🔵 BAIXA** | A11y avançada, refactor estrutural, persistência local | Backlog |

---

## Bloco 1 — 🔴 ALTA prioridade (5 itens, ~2h)

### M-01 · Remover links âncora mortos do footer global (I-01)
**Mudança:** em `Layout.jsx:59-61`, substituir `<a href="#privacidade">` etc por links reais (`/seguranca` para Privacidade, link externo Iubenda para Termos) ou remover o footer enquanto não há páginas. **Recomendo redirecionar:**
- "Privacidade" → `/seguranca` (já tem LGPD_LINKS lá)
- "Termos" → externo `https://www.iubenda.com/terms-and-conditions/DESAFIOGUT` ou `/seguranca`
- "Suporte" → externo `mailto:desafiogut01@gmail.com` (DPO já existe em Seguranca)

**Risco:** baixo. **Esforço:** 10 min.

### M-02 · Vitrine slots passam contexto para /mercado (I-02)
**Mudança:** Cada SlotCard navega para `/mercado?categoria=diamante|ouro|prata|bronze` (query param). MercadoLances lê o param e:
1. Exibe badge "Modo Diamante" no header.
2. Força `setTipoLeilao("programado")` para Diamante/Ouro, `"flash"` para Prata/Bronze.
3. Mostra mensagem se a edição R-1 atual não casa com a categoria pedida ("Edição atual é R-1 / Bronze · Próxima Diamante em…").

**Justificativa:** REQ-13 da spec ("4 slots simultâneos") ainda não está implementado no backend de leilões (só vitrine informativa). Sem o backend de cotas, o melhor que dá é passar contexto e ajustar o modo. Quando REQ-04..07 existirem, troca-se por rotas reais `/mercado/diamante` etc.

**Risco:** baixo (apenas query param + leitura). **Esforço:** 30 min.

### M-03 · CTA de login com label único (I-03)
**Mudança:** criar componente reusável `<BotaoLoginPrincipal />` em `src/components/BotaoLoginPrincipal.jsx` que renderiza sempre **"⚡ Aceito o DesafioGUT"** (alinhado com a fala original do gate LGPD). Trocar nos 5 sítios:
- Sidebar (já usa esse texto)
- BottomNav (já usa esse texto)
- MercadoLances AuthArea ("⚡ Entrar" → padroniza)
- MinhaCarteira ("— Entrar" → remove sufixo)
- MeusAtivos ("— Entrar para ver seus lances" → remove sufixo)
- Configuracoes ("— Entrar" → remove sufixo)

**Risco:** baixo (rename apenas). **Esforço:** 30 min.

### M-04 · Dashboard atalhos incluir Vitrine (I-04)
**Mudança:** adicionar `{ label: "Vitrine 4 Slots", icon: "🪟", to: "/vitrine" }` em `Dashboard.ATALHOS:21-28`. Posição: entre "Dar Lance" e "Meus Ativos" para destacar.

**Risco:** zero. **Esforço:** 2 min.

### M-05 · Footer global presente em mobile (I-10)
**Mudança:** `Layout.jsx:45` remover `if (!isMobile)` ou criar versão compacta para mobile (linkar Privacidade/Termos/Suporte em uma linha). Pode-se mover footer para DENTRO do `<main>` em mobile para não conflitar com `BottomNav`.

**Risco:** baixo. **Esforço:** 15 min.

**Sub-total Bloco 1:** ~1h30, 5 PRs lógicos (podem ir em 1 commit).

---

## Bloco 2 — 🟡 MÉDIA prioridade (8 itens, ~3h)

### M-06 · Label único da rota /mercado (I-05)
Padronizar para **"Mercado de Lances"** em Sidebar, BottomNav e Dashboard.ATALHOS. BottomNav usar "Mercado" se espaço for problema.

**Esforço:** 5 min.

### M-07 · Ícones distintos para Mercado vs Vitrine (I-06)
Trocar Vitrine para um ícone próprio. Sugestão: criar `IconGrid` (4 quadradinhos) em vez de reutilizar `IconTarget`.

**Esforço:** 20 min.

### M-08 · Consolidar footers (I-07)
Manter **só** o footer do Layout (uma fonte de verdade). Remover `<footer>` próprio de:
- MercadoLances:447-472
- Vitrine:253-256
- Dashboard:326-333 (footer "info")
- MeusAtivos:167-174 (parágrafo de Art. 26/Art. 8)

Itens informativos viram tooltip ou ficam só em `/seguranca`.

**Esforço:** 45 min.

### M-09 · Atalhos com modal direto (I-08)
"Depositar PIX" e "Converter Ficha" no Dashboard navegam para `/carteira?abrir=comprar-fichas` ou `/carteira?abrir=trocar-senhas`. MinhaCarteira lê o param e abre o modal/scroll para a seção.

**Esforço:** 30 min.

### M-10 · Empty state com CTA (I-09)
MeusAtivos com `isConnected` + lista vazia → adicionar botão `<button onClick={() => navigate("/mercado")}>🎯 Dar primeiro lance</button>` abaixo do "📭 Nenhum lance encontrado".

**Esforço:** 10 min.

### M-11 · Avatar acessível por teclado (I-11)
`Sidebar.jsx:109-125` envolver avatar em `<button type="button" onClick={!isConnected ? abrirModal : undefined}>` quando clicável, ou usar `<div role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && abrirModal()}>`. Adicionar `aria-label`.

**Esforço:** 10 min.

### M-12 · aria-label em buttons críticos (I-12)
Auditar e adicionar `aria-label` em buttons com label visual ambíguo: "↻ Atualizar" (já tem), "🚪 Desconectar conta" (adicionar), filtros de MeusAtivos, toggle de tipo de leilão em MercadoLances, KPIs do Dashboard.

**Esforço:** 30 min.

### M-13 · Tabela MeusAtivos com semântica (I-13)
`MeusAtivos.DesktopTable:244-292` adicionar `<caption className="sr-only">Histórico de lances da edição R-1</caption>` + `scope="col"` nos `<th>`.

**Esforço:** 10 min.

**Sub-total Bloco 2:** ~2h30.

---

## Bloco 3 — 🔵 BAIXA prioridade (6 itens, backlog)

### M-14 · Landmarks ARIA no Layout (I-14)
`<aside aria-label="Menu lateral">` + `<nav aria-label="Navegação principal">` na Sidebar. `<nav aria-label="Navegação inferior">` no BottomNav.

### M-15 · Skip link (I-15)
Adicionar `<a href="#main" className="skip-link">Pular para o conteúdo</a>` no topo do Layout; `<main id="main">` ganha id.

### M-16 · Persistir preferências do Configuracoes (I-16)
`useEffect` que lê `localStorage.getItem("gut_prefs")` na montagem; "Salvar" grava no `localStorage`. Não envolve backend.

### M-17 · Feedback positivo nos botões ↻ (I-17)
Toast "Atualizado" após `carregar()` bem-sucedido em WalletCard/VoucherPanel.

### M-18 · Reduzir header duplicado em MercadoLances (I-18)
Em mobile, o header de MercadoLances duplica auth widget que já está no BottomNav. Remover ou condicionar.

### M-19 · Estilo hover/focus consistente (I-19)
Definir tokens CSS para `:hover` e `:focus-visible` em todos os botões.

**Sub-total Bloco 3:** backlog (~3h se for fazer junto).

---

## Resumo

| Bloco | Esforço | Comentário |
|---|---|---|
| Bloco 1 — ALTA | ~1h30 | **Recomendo aprovar Bloco 1 integral** — 5 mudanças baratas que somem confusões reais |
| Bloco 2 — MÉDIA | ~2h30 | Aprovar item-a-item ou em sub-blocos |
| Bloco 3 — BAIXA | ~3h | Backlog. Atacar quando houver demanda específica |

**Total se tudo:** ~7h de refator.

---

## Decisões abertas (aguardando você)

1. **Bloco 1 aprovado integral?** ou aprovar item a item?
2. **M-02 (Vitrine query param)** — aceito o design com `?categoria=` ou prefere outro? (alternativa: criar `/vitrine/:slot` que renderiza o mesmo MercadoLances internamente).
3. **M-08 (consolidar footers)** — você está OK em **remover** o footer próprio do MercadoLances? É o mais cheio dos 4 (Privacidade Iubenda + link grupo).
4. **Bloco 2 e 3** — atacar depois (próxima sessão) ou já incluir agora?

---

## Lista de arquivos que serão tocados (preview)

- `src/widgets/layout/Layout.jsx` (M-01, M-05, M-08, M-14, M-15, M-19)
- `src/widgets/layout/Sidebar.jsx` (M-06, M-07, M-11, M-14)
- `src/widgets/layout/BottomNav.jsx` (M-06, M-07, M-14)
- `src/pages/Dashboard.jsx` (M-04, M-08, M-09, M-12, M-19)
- `src/pages/MercadoLances.jsx` (M-02, M-08, M-12, M-18)
- `src/pages/MinhaCarteira.jsx` (M-03, M-09)
- `src/pages/MeusAtivos.jsx` (M-03, M-10, M-12, M-13)
- `src/pages/Vitrine.jsx` (M-02)
- `src/pages/Configuracoes.jsx` (M-03, M-12, M-16)
- `src/components/BotaoLoginPrincipal.jsx` (novo, M-03)
- `src/components/WalletCard.jsx` (M-17)
- `src/components/VoucherPanel.jsx` (M-17)

**NÃO tocar (regra explícita do usuário):** `AppContext.jsx`, `web3.js`, `sanitize.js`, `rateLimiter.js`.
