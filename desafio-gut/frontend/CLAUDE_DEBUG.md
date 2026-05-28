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

---

## BUGFIX — "desafiogut@gmail.com" exposto ao submeter CNPJ já registrado

**Diagnóstico:**
- `cotas.mjs:198` retornava o registro completo do blob BLOB_COTAS_CNPJ (incluindo `email`)
- `SejaNossoParceiro.jsx:170-173` exibia `reg.email` diretamente na UI com botão "Fazer login com {email}"
- O blob do CNPJ 23.040.066/0001-00 continha `email: "desafiogut@gmail.com"` (email de contato da org)

**Correção (3 arquivos):**

### `netlify/functions/cotas.mjs` (linha 198)
- `return jsonResponse(reg)` → `return jsonResponse({ status: "cnpj_ja_registado", endereco: reg.endereco })`
- Backend agora NÃO expõe email/cnpj/empresa do blob — apenas status + endereco da wallet

### `src/pages/SejaNossoParceiro.jsx`
- **Linha 8:** `useState` → `useState, useEffect`
- **Linha 124:** Adicionado `address` na desestruturação de `useAppContext()`
- **Linha 138:** Novo estado `cnpjEndereco` para validação pós-login
- **Linhas 142-152:** Novo `useEffect` — após login Privy disparado por CNPJ existente, verifica se `address` bate com `cnpjEndereco` e redireciona para `/corporativo`
- **Linhas 174-191:** CNPJ duplicado agora:
  - Logado → verifica `address === endereco` antes de redirecionar (em vez de `atualizarTipoCorporativo(reg)` cego)
  - Não-logado → `setCnpjEndereco(endereco)` + `abrirModal()` (login Privy normal, sem expor email)
- **Removido:** Bloco `sucesso.loginPendente` (~42 linhas) que exibia "Fazer login com {email}"

### Fluxo corrigido:
1. CNPJ já existe → backend retorna `{ status: "cnpj_ja_registado", endereco: "0x..." }`
2. Usuário NÃO logado → dispara login Privy normal (abrirModal)
3. Após login → useEffect verifica address === endereco → redireciona /corporativo
4. Usuário logado com address correto → redireciona /corporativo
5. Usuário logado com address diferente → erro "CNPJ já registrado em outra conta"

### Validação:
- Build: ✓ ZERO erros
- Desktop 1440×900: NENHUM "desafiogut@gmail.com" na tela ✅
- Mobile 375×812: NENHUM email exposto ✅
- Console: sem novos erros React ✅
- Screenshots: `bugfix-cnpj-desktop-no-email.png`, `bugfix-cnpj-mobile-no-email.png`

---

## BUGFIX 2 — Cronómetro zera no F5 (REQ-10 imunidade a refresh)

**Diagnóstico:**
- `AppContext.jsx:101-106`: `prazoFlash`/`prazoProgramado` inicializados via `useState(() => lerPrazoStorage(...) ?? Date.now()+dur)`
- O fallback `Date.now()+dur` NUNCA era persistido no localStorage
- `gravarPrazoStorage` só era chamado por `setPrazoTimestamp` (em `handleNovaRodada`) e pelo polling on-chain (apenas prazoProgramado)
- Resultado: localStorage `gut_prazo_flash` ficava `null` → cada F5 gerava novo deadline de 30min do zero

**Correção (1 arquivo, +6 linhas):**

### `src/context/AppContext.jsx` (linhas 117-121)
- Adicionados 2 `useEffect` que persistem `prazoFlash` e `prazoProgramado` no localStorage sempre que mudam
- Incluindo o valor inicial de fallback (`Date.now()+dur`) → localStorage nunca mais fica `null`
- F5 lê o valor persistido → cronómetro continua de onde parou

### Validação produção (3 cargas de página consecutivas):
- Carga 1: 29:57 → localStorage `gut_prazo_flash: "1779932039"` ✅
- Carga 2 (F5): 29:37 (~20s decorridos) — NÃO resetou ✅
- Carga 3 (F5): 29:22 (~15s decorridos) — NÃO resetou ✅
- Console: ZERO erros ✅
- Screenshot: `bugfix-timer-f5-immune.png`

---

## Validação Final — Ambos os Bugs

| Bug | Status | Evidência |
|---|---|---|
| Cronómetro F5 | ✅ FIXED | 3 cargas consecutivas: 29:57→29:37→29:22 |
| CNPJ "desafiogut@gmail.com" | ✅ FIXED | Privy modal abre normal, sem email fixo |

**Build:** `DSvt4x91` em produção — ZERO erros, ZERO regressão.

---

## MC15 — Feedback de Lance em Tempo Real

**Sessão:** 2026-05-27 | **Modelo:** DeepSeek V4 Pro
**Objetivo:** Implementar feedback visual para o utilizador saber se o lance continua único ou foi repetido, com polling a cada 5s.

---

### Alterações Realizadas (4 arquivos, +147 linhas)

### 1. `netlify/functions/lances-flash.mjs`
- **+28 linhas** — Novo branch `?acao=verificar&valor=X` no GET handler
  - Lê o blob `lances-relampago:{edicaoId}`
  - Conta ocorrências do valor: `rawLances.filter(l => l.valorCentavos === valor).length`
  - Devolve `{ edicaoId, valor, count, unico: count === 1 }`
  - Validação: 400 se `valor` ausente ou inválido
  - Edição inexistente devolve `count:0, unico:false` (graceful)

### 2. `src/hooks/useLanceFeedback.js` (NOVO)
- **+46 linhas** — Hook customizado com polling 5s
  - `useLanceFeedback(edicaoId, meuValor)` → `{ status, mudou }`
  - `status`: `{ count, unico }` do endpoint
  - `mudou`: deteta transição `unico → repetido`, auto-reset após 5s
  - Só faz fetch se ambos `edicaoId` e `meuValor` definidos
  - Cancelamento limpo no unmount (cancelado + clearInterval)

### 3. `src/components/LanceStatusBadge.jsx` (NOVO)
- **+51 linhas** — Componente visual com Framer Motion
  - Exibe "✅ Único" (verde) ou "❌ Repetido" (laranja)
  - Alerta ⚠️ animado quando estado muda de único → repetido
  - `AnimatePresence` para transições suaves
  - Retorna `null` se `!status` (sem lance dado)

### 4. `src/pages/MercadoLances.jsx`
- **+24 linhas** — Integração do badge na página de leilão
  - Estado `meuUltimoLance` guarda `{ valor, edicao }` do último lance
  - `onLanceSucessoWrapper` — intercepta callback do CardLance para registar valor
  - `<LanceStatusBadge>` renderizado entre CardLance e Segurança
  - Imports: `useLanceFeedback`, `LanceStatusBadge`, `useCallback`

---

### Build
```
npm run build → ✓ built in 8.26s
ZERO erros de compilação.
ZERO warnings React novos.
```

### Validação Backend
- `?acao=verificar&valor=0.07` → `{"edicaoId":"R-1","valor":0.07,"count":0,"unico":false}` ✅
- Sem valor → 400 `valor_ausente` ✅
- Valor inválido (abc) → 400 `valor_invalido` ✅
- Edição inexistente (R-99) → `count:0, unico:false` ✅
- Múltiplos valores testados (7, 0.01, 999999) — todos corretos ✅

### Validação Frontend (MCP chrome-devtools)
- Desktop 1440×900: página carrega sem crashes ✅
- LanceStatusBadge oculto quando sem lance (comportamento correto) ✅
- CardLance, TabelaLances, Segurança — sem regressão ✅
- Console: ZERO erros React ✅
- Leilão ativo (30:00 ⚡ RELÂMPAGO) — UI correta ✅

### Limitação
- Não foi possível testar o fluxo completo (login → lance → badge → polling) porque o Privy OAuth requer uma conta Google/Apple real, indisponível no ambiente MCP.
- A validação funcional completa requer um teste manual com conta real.

### Commit
`317224b` — `feat: feedback de lance em tempo real — status unico/repetido com polling 5s`
