# CLAUDE_DEBUG — MC14.10.2 Correções

**Sessão:** 2026-05-27 | **Modelo:** DeepSeek V4 Pro
**Objetivo:** Executar plano MC14.10.1.txt com validação visual MCP

---

## Alterações Realizadas (9 arquivos, ~224 linhas)

### 1. `netlify/functions/cotas.mjs`
- **+30 linhas** — handleGet: novo branch `?email=` para lookup de cadastros diretos (cnpj:XXXXX)
  - Itera BLOB_COTAS_CNPJ procurando `reg.email === emailParam`
  - Retorna 200 com registro ou 404 `email_nao_encontrado`
- **+40 linhas** — handlePost: novo `action=update-corporativo`
  - Edita empresa, segmento, site, logoUrl, email
  - Bloqueia alteração de cnpj, tipo, categoria, vendida, valor
  - Atualiza também índice CNPJ

### 2. `src/context/AppContext.jsx`
- **Linha 226-240** — useEffect de cotaCorporativa: fallback por email
  - Se `fetch(?cliente_id=address)` falha, tenta `fetch(?email=user.email.address)`
  - Lojista cadastrado direto + login Privy mesmo email → encontra cota
- **Linha 282** — userLabel: adicionado fallback `cotaCorporativa?.empresa` para corporativo

### 3. `src/pages/SejaNossoParceiro.jsx`
- **Linha 157-175** — CNPJ duplicado: redirect/login em vez de erro
  - Logado → `atualizarTipoCorporativo(reg)` + `navigate("/corporativo")`
  - Não-logado → UI "CNPJ já cadastrado" com botão `abrirModal()`
- **Linha 354-397** — Nova UI: `sucesso.loginPendente` com botão "Fazer login com {email}"
- Import adicionado: `useNavigate`, `abrirModal`

### 4. `src/widgets/layout/BottomNav.jsx`
- **ITEM 1:** `/seja-nosso-parceiro` adicionado em SECONDARY_LINKS
- **ITEM 3:** `tipoUsuario` lido do contexto + CORP_TABS + secundariosAtivos
  - Corporativo → abas: Painel, Cotas, Banners
  - "Mais" → Analytics, Configurações (sem itens de leilão)
  - Comum → comportamento original preservado (R1)

### 5. `src/pages/CorporativoDashboard.jsx`
- **+90 linhas** — Formulário inline de edição:
  - Estado `editando` com toggle
  - Inputs: empresa*, segmento, site, logoUrl, email
  - POST `/cotas?action=update-corporativo`
  - Mobile: grid colapsa para 1 coluna
  - Feedback visual: "Dados atualizados com sucesso!"

### 6. `src/components/ChatbotWidget.jsx`
- **1 linha** — `bottom: isMobile ? "5rem" : "1.25rem"`
  - Mobile: botão fica ACIMA do BottomNav (64px + safe-area)
  - Desktop: posição original preservada

### 7. `src/pages/Dashboard.jsx`
- **ITEM 7:** Atalho `{ label: "Seja Nosso Parceiro", icon: "🤝", to: "/seja-nosso-parceiro" }` adicionado
- **ITEM 8:** Guard `vencedor.endereco ? ... : "—"` evita crash em `.slice(null)`

---

## Build
```
npm run build → ✓ built in 3.74s
ZERO erros de compilação.
ZERO warnings React novos.
```

## Validação Visual (MCP chrome-devtools)
- Mobile 375×812: BottomNav visível, "🤝 Seja nosso parceiro!" no menu "Mais" ✅
- Desktop 1440×900: Sidebar preservada, Dashboard com atalho ✅
- ChatbotWidget: bottom=80px mobile (5rem), bottom=20px desktop (1.25rem) ✅
- Console: apenas CSP pre-existente, ZERO erros React ✅

## Screenshots
- `C:\Users\Moltbot\Desktop\mc14-screenshots\mobile-mais-menu.png`
- `C:\Users\Moltbot\Desktop\mc14-screenshots\mobile-dashboard-pos-consent.png`
- `C:\Users\Moltbot\Desktop\mc14-screenshots\desktop-dashboard-final.png`
