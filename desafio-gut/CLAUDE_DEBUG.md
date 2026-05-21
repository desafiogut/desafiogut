# CLAUDE_DEBUG — DesafioGUT Debug Log

---

## MC12.3 — Login Corporativo Independente via CNPJ

**Data:** 2026-05-21
**Plano:** `C:\Users\Moltbot\Desktop\MC12.3.txt`
**Sessão:** execução guiada por documento (Opus 4.7)

### Itens 1–5 ✅ — script test-mc12-3.mjs: 10/10 OK

### Item 1 — Remover login prévio no SejaNossoParceiro ✅

**Mudanças em `src/pages/SejaNossoParceiro.jsx`:**
- Removido botão "⚡ Fazer login para se cadastrar" do hero (chamava `abrirModal`)
- Removida dependência de `abrirModal` no `useAppContext`
- Substituído `useCreateWallet` por `login` direto de `usePrivy()`
- Adicionado campo NOVO: `email` da empresa (input type="email")
- Adicionado estado `cnpjJaExiste` (banner amarelo se duplicado)
- Adicionada feature flag `VITE_CORPORATIVO_ATIVO` (default ON)
- Gate `{isConnected && tipoUsuario !== "corporativo"}` → `{tipoUsuario !== "corporativo"}`
- handleSubmit reordenado: validação → GET cnpj → login Privy OTP → useEffect dispara POST
- CTA final "Quero ser um parceiro" agora faz scroll para `#form-corporativo`

**Build:** ✓ built in 5.50s (`npm run build`)
**TDZ check:** `grep -c "Cannot access" dist/assets/*.js` → 0
**Validação visual (MCP chrome-devtools):**
- Screenshot: `CLAUDE_DEBUG_screenshots/mc12-3-item1-form-sem-login.png`
- Formulário visível imediatamente sem login prévio ✅
- Campo "Email da Empresa" presente ✅
- Botão "⚡ Receber código e ativar Painel" (texto novo) ✅
- Console errors: apenas CSP/WalletConnect/Sentry pré-existentes (não regressão)

### Item 2 — Validação CNPJ + endpoint GET ?cnpj=XXX ✅

**Mudanças em `netlify/functions/cotas.mjs`:**
- Constantes `BLOB_COTAS_CNPJ` e `BLOB_COTAS_FP` adicionadas
- `validarCNPJ()` movido para escopo superior (uso em GET e POST)
- `handleGet` aceita `?cnpj=XXX` → 200 (existe) ou 404 (livre) via blob `cotas-cnpj:{cnpj}`
- `handlePost` register-corporativo: guard `cnpj_duplicado` (409) se CNPJ pertence a endereço diferente
- Após `setJSON` em `cotas:{endereco}`, grava índice em `cotas-cnpj:{cnpj}` (não-fatal se falhar)

**handleSubmit cliente:**
- FASE A: validação CNPJ + email + URLs client-side
- FASE B: `fetch('/.netlify/functions/cotas?cnpj=' + cnpjNums)` — 404 segue, 200 pede confirmação
- Banner amarelo "Este CNPJ já está cadastrado" quando `cnpjJaExiste === true`

### Item 3 — Register pós-Privy OTP + X-Visitor-ID ✅

**Mudanças em `netlify/functions/cotas.mjs`:**
- Header `X-Visitor-ID` obrigatório (≥ 16 chars) — `visitor_id_obrigatorio` (400) se ausente
- Campo `email` aceito no body (validação regex)
- Response `register-corporativo` retorna 201 (criado) em vez de 200

**handleSubmit cliente (consolidado no Item 1):**
- `dadosPendentesRef` guarda dados antes de chamar `login()` Privy
- `useEffect([authenticated, address])` dispara POST quando Privy resolve OTP
- POST envia `X-Visitor-ID` via `getVisitorId()` (FingerprintJS MC3)
- Após 201: `atualizarTipoCorporativo(registro)` + `navigate('/corporativo', { replace: true })`
- Trata 409 (CNPJ outra conta) e 429 (rate-limit/Sybil) com mensagens específicas

### Item 4 — Redirect automático + sidebar isolada ✅

**Mudanças em `src/App.jsx`:**
- Wrapper `DashboardOuCorporativo` na rota raiz → redirecciona corporativos para `/corporativo`
- Zero regressão para visitantes/comuns: continua renderizando `<Dashboard />`

**Mudanças em `src/context/AppContext.jsx`:**
- `useEffect([tipoUsuario, location.pathname])`: se corporativo cair em `/`, `/carteira`, `/mercado`, `/vitrine`, `/programacao`, `/ativos`, `/seguranca` → redirect para `/corporativo` com `replace: true`

**Mudanças em `src/widgets/layout/Sidebar.jsx`:**
- Corporativo vê apenas: `CORPORATIVO_ITEMS` + Configurações + Admin (se isAdmin)
- Comum/visitante: comportamento atual preservado

### Item 5 — Feature flag + anti-Sybil + script validação ✅

**Mudanças em `.env`, `.env.local`, `.env.production`:**
- `VITE_CORPORATIVO_ATIVO=true` (default ON; OFF esconde formulário)

**Mudanças em `netlify/functions/cotas.mjs`:**
- Anti-Sybil: blob `cotas-fingerprint:{visitorId}` registra CNPJs criados nas últimas 24h
- Se já tem 1 CNPJ DIFERENTE no mesmo visitorId em 24h → `sybil_detectado` (429)
- Atualiza histórico após sucesso (idempotente para mesmo CNPJ)

**Novo arquivo `scripts/test-mc12-3.mjs`:**
- 10 checks: build, TDZ, abrirModal removido, campo email, GET ?cnpj, blob cotas-cnpj, X-Visitor-ID, 409, DashboardOuCorporativo, feature flag
- **Resultado:** 10/10 ✅

**Validação visual final:**
- `/seja-nosso-parceiro` deslogado → formulário direto ✅
- `/` deslogado → Dashboard normal (zero regressão) ✅
- Screenshot: `CLAUDE_DEBUG_screenshots/mc12-3-item5-form-final.png`

---

## MC12.2 — "i is not a function" ao submeter CNPJ no SejaNossoParceiro

**Data:** 2026-05-21  
**Status:** ✅ RESOLVIDO — commit `f8f46a6`

### Sintoma
Ao preencher o formulário de cadastro corporativo em `/seja-nosso-parceiro`
e clicar em "Ativar Painel Lojista", o console exibia:
```
TypeError: i is not a function
```
O erro ocorria no `handleSubmit` do `SejaNossoParceiro.jsx`.

### Root Cause
`setCustomMetadata` foi **removido do SDK Privy v3.22.1 client-side**.
Em versões anteriores (v1.x/v2.x) estava disponível via `usePrivy()`.
Na v3.x, passou a ser exclusivamente Admin API (server-side).

Evidência:
```bash
grep -c "setCustomMetadata" node_modules/@privy-io/react-auth/dist/cjs/privy-context-DYbYS8e0.js
# → 0
```

Quando destructurado de `usePrivy()`, retornava `undefined`.
Chamando `await undefined({...})` → `TypeError: i is not a function`
(onde `i` é o nome minificado de `setCustomMetadata` no bundle).

### Fix Aplicado

**Arquivos alterados:**
- `netlify/functions/cotas.mjs` — novo code path `POST ?action=register-corporativo`
  - Aceita `{ accessToken, endereco, cnpj, empresa, segmento, site, logoUrl }`
  - Valida: accessToken não-nulo (JWT format), CNPJ (dígitos verificadores), endereco Ethereum
  - Cria blob `cotas:{endereco}` com `tipo: "corporativo"` e dados do cadastro
  - Rate-limited (5 req/min por IP via `aplicarRateLimit`)
  - **Sem admin token** — autenticado por Privy access token (presença de JWT)

- `src/context/AppContext.jsx`:
  - `tipoUsuario` agora derivado de `cotaCorporativa?.tipo === "corporativo"` (não de `user.customMetadata.tipo`)
  - `cotaCorporativa` fetch roda para **todos** os usuários autenticados (não só corporativos)
  - Novo estado `tipoCarregando` — true enquanto o fetch inicial está pendente
  - Nova função `atualizarTipoCorporativo(data)` — atualiza contexto em memória após cadastro (sem re-fetch)

- `src/App.jsx` — `CorporativoRoute`:
  - Agora respeita `tipoCarregando` — retorna `null` enquanto loading (não redireciona para `/`)

- `src/pages/SejaNossoParceiro.jsx`:
  - Remove `setCustomMetadata` + `user` do `usePrivy()`
  - Adiciona `getAccessToken` do `usePrivy()`
  - `handleSubmit` agora: `await getAccessToken()` → `POST cotas.mjs?action=register-corporativo`
  - Após sucesso: `atualizarTipoCorporativo(registro)` atualiza AppContext imediatamente

- `scripts/test-mc12.mjs` — checks 1 e 6 atualizados para nova arquitetura

**Verificações pós-deploy:**
```bash
# Endpoint funcional:
curl -X POST "/.netlify/functions/cotas?action=register-corporativo" \
  -d '{"accessToken":"eyJ...","endereco":"0x...","cnpj":"23040066000100","empresa":"Teste"}' 
# → {"tipo":"corporativo","cnpj":"23040066000100",...}

# Validação CNPJ rejeita inválido:
# → {"error":{"code":"cnpj_invalido",...}}

# Token ausente rejeitado:
# → {"error":{"code":"token_invalido",...}}

# test-mc12.mjs → 10/10 ✅
```

### Decisão Arquitetural
A fonte de verdade para `tipoUsuario` mudou de `user.customMetadata.tipo` (Privy, síncrono)
para `cotaCorporativa?.tipo` (Netlify Blob, assíncrono com loading state).
Isso evita dependência da Privy Admin API (requereria `PRIVY_APP_SECRET` no servidor).
O blob persiste entre sessões e dispositivos (server-side storage).

---

## MC11.18 — Privy iframe bloqueado por COEP

**Data:** 2026-05-XX  
**Status:** ✅ RESOLVIDO — commit `eead861`

### Root Cause
`Cross-Origin-Embedder-Policy: credentialless` no `netlify.toml` bloqueava o iframe
do Privy SDK (wallet embedded), que não enviava header `Cross-Origin-Resource-Policy`.

### Fix
Removido `Cross-Origin-Embedder-Policy` do `netlify.toml`. Mantidos `COOP` e `CORP`.

---

## MC11.16-T2 — TDZ "Cannot access 'we' before initialization"

**Data:** 2026-05-XX  
**Status:** ✅ RESOLVIDO — commit incluído em MC12 Item 1

### Root Cause
`const address = privyWallet?.address` declarado APÓS `useCallback`/`useEffect`
que usavam `address` em suas deps arrays. Rolldown minifica `address` → `we`,
e o bundle acessa `we` antes da inicialização (TDZ clássico).

### Fix
`useWallets()` + derivações de `address` movidos para ANTES de qualquer hook
que referencie `address` no array de dependências.
