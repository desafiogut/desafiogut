# CLAUDE_DEBUG.md — Diário de Tentativas DesafioGUT
> Iniciado: 2026-04-28 | Protocolo: Resolução Definitiva com Auto-Aprendizado

---

## Tentativa 2 — Diagnóstico Playwright + Bundle Live (2026-04-28)

### Sintoma da Iteração 2
Botão preso em "⏳ Aguarde..." → `ready: false`. Fix da iteração 1 não funcionou.

### Auditoria do Bundle Live
```
Bundle live: index-CfY2sf-O.js
App ID no bundle: cmo5113v300l90clgzksivvad ← AINDA ERRADO
```
**Causa:** Netlify dashboard tem `VITE_PRIVY_APP_ID=cmo5113v...` como env var.
O Vite substitui `import.meta.env.VITE_PRIVY_APP_ID` em build time pelo valor do
dashboard — o fallback `|| "cmo51f3v..."` no código NUNCA é atingido se o env var
estiver definido, mesmo com valor errado.

### Achados do Playwright (node playwright-debug.js)
```
[HTTP 400] https://auth.privy.io/api/v1/apps/cmo5113v300l90clgzksivvad
  → App ID inválido → Privy não consegue buscar configuração do app

[CONSOLE ERROR] Connecting to 'https://explorer-api.walletconnect.com/v3/wallets'
  violates CSP connect-src → TypeError: Failed to fetch
  → WalletConnect bloqueado pelo CSP → crash no inicializador Privy
  → ready fica false permanentemente

[CONSOLE ERROR] img-src CSP violation: https://frontend-one-tawny-20.vercel.app/favicon.ico
  → Logo URL do Vercel bloqueada pelo CSP de imagens
```

### Fixes da Iteração 2 (commit 16068b0)
1. **App ID hardcoded** em `main.jsx` sem `import.meta.env` — env var Netlify não pode interferir
2. **`walletList` removido** do config Privy — eliminado WalletConnect fetch → CSP OK
3. **Logo URL** corrigida para `silly-stardust-ca71bc.netlify.app` (mesma origem)
4. **CSP expandido** no `netlify.toml` para cobrir todos os domínios WalletConnect

### Resultado da Iteração 2 — Playwright Confirmado
```
[STATUS] ✅ SUCESSO — Privy ready=true. Botão ativo!
[MODAL] iframes/elementos Privy: 1
[MODAL] Botão Google encontrado: SIM ✅
[RESULTADO FINAL] ✅ MODAL PRIVY ABRIU — TESTE DE CLIQUE: SUCESSO!
```
- Bundle live `index-DYzJoxu9.js` tem App ID correto `cmo51f3v300l90clgzksivvad`
- 0 erros de CSP no Playwright
- 0 erros de página
- Modal Privy detectado (1 iframe + botão Google presente)

---

## Estado Anterior da Investigação

### Sintoma Relatado (Iteração 1)
Clicar no botão de login/lance na produção não dispara o modal da Privy.

---

## Tentativa 1 — Diagnóstico Profundo (2026-04-28)

### Hipóteses Testadas

#### H1: Privy App ID incorreto ✅ CONFIRMADO
- **Código atual**: `cmo5113v300l90clgzksivvad`
- **ID correto (fornecido pelo usuário)**: `cmo51f3v300l90clgzksivvad`
- **Diferença**: posição 5 (0-indexado) — `1` no código vs `f` correto
- **Arquivos afetados**: `.env`, `.env.local`, `.env.production`, `main.jsx` (fallback hardcoded)
- **Impacto**: SDK Privy inicializa com ID errado → `ready` pode ficar `false` ou `login()` falha silenciosamente

#### H2: Botão silencioso quando `!ready` ✅ CONFIRMADO
- **Arquivo**: `AppContext.jsx:137`
- **Código**: `if (!ready) return;` — sem feedback para o usuário
- **Impacto**: usuário clica, nada acontece, sem indicador de loading
- **Fix aplicado**: botão mostra `⏳ Aguarde...` e fica desabilitado enquanto Privy inicializa

#### H3: Sem polyfills `global`/`Buffer` no Vite ✅ CONFIRMADO
- **Arquivo**: `vite.config.js`
- **Problema**: Privy SDK e ethers.js v6 precisam de `global = globalThis` no browser
- **Fix aplicado**: `define: { global: 'globalThis' }` + `optimizeDeps` para pré-bundlizar Privy

#### H4: `switchChain` ausente antes de assinar ✅ CONFIRMADO
- **Arquivo**: `CardLance.jsx:116`
- **Problema**: CLAUDE.md especifica `wallet.switchChain(11155111)` antes de transações, mas não estava sendo chamado
- **Impacto**: assinatura pode falhar em rede errada
- **Fix aplicado**: `await privyWallet.switchChain(11155111)` antes de `getEthereumProvider()`

#### H5: `vercel.json` inexistente ✅ CONFIRMADO
- **CLAUDE.md** descreve `vercel.json ← SPA rewrite + headers de segurança`
- **Realidade**: arquivo não existe no diretório `frontend/`
- **Impacto**: refresh da página quebra rota SPA em produção Vercel
- **Fix aplicado**: criado `frontend/vercel.json` com rewrites + headers de segurança

#### H6: Alchemy RPC não utilizado
- **Problema**: `web3.js` usa `publicnode.com` como fallback RPC em vez de Alchemy
- **Fix aplicado**: variável `VITE_ALCHEMY_URL` adicionada ao env; web3.js atualizado para usar Alchemy

### Status dos Fixes
| Fix | Arquivo | Status |
|---|---|---|
| App ID correto | `.env`, `.env.local`, `.env.production`, `main.jsx` | ✅ Aplicado |
| Polyfill global | `vite.config.js` | ✅ Aplicado |
| Botão loading state | `AppContext.jsx`, `MercadoLances.jsx`, `CardLance.jsx` | ✅ Aplicado |
| switchChain Sepolia | `CardLance.jsx` | ✅ Aplicado |
| vercel.json | `frontend/vercel.json` | ✅ Criado |
| Alchemy RPC | `web3.js`, env files | ✅ Aplicado |

---

## Handshake de API — Resultados (2026-04-28)

### Privy Management API — GET /api/v1/apps/{app_id}
```
App ID: cmo51f3v300l90clgzksivvad ✅ VÁLIDO
App Name: DESAFIOGUT
```

**`allowed_domains` atual:**
```json
["http://localhost:3000", "http://localhost:5173", "https://silly-stardust-ca71bc.netlify.app"]
```
- ✅ URL de produção Netlify já está na whitelist
- ⚠️ URL Vercel (`https://frontend-one-tawny-20.vercel.app`) NÃO está — adicionar se usar Vercel
- ⚠️ API Privy não aceita PUT/PATCH — atualizar manualmente via dashboard

**Problemas encontrados:**
- `apple_oauth: false` → Apple desabilitado, mas código listava `"apple"` em loginMethods → CORRIGIDO no código
- `embedded_wallet_config.create_on_login: "users-without-wallets"` → difere do código `"all-users"` → sem impacto no SDK v3 (client-side prevalece)
- `netlify.toml` tinha `X-Frame-Options: DENY` → bloqueia iframes → CORRIGIDO para SAMEORIGIN

## Deploy
- Push para `https://github.com/desafiogut/desafiogut.git` → commit `593ee2b` em 2026-04-28
- Netlify auto-deploy acionado (~2 min para live)
- URL de produção: `https://silly-stardust-ca71bc.netlify.app`

## Ações Manuais Necessárias (não automatizáveis via API)

### 1. Painel Privy → Settings → Login Methods
- [ ] Verificar Google: ATIVO ✅
- [ ] Verificar Email: ATIVO ✅  
- [ ] Apple: DESATIVADO — ativar se quiser oferecer login Apple

### 2. Painel Privy → Embedded Wallets
- [ ] Confirmar "Create on login" → "All users" (ou manter "users-without-wallets")

### 3. Netlify Dashboard → Environment Variables
- [ ] Verificar se `VITE_PRIVY_APP_ID` está definido — SE SIM, confirmar que é `cmo51f3v300l90clgzksivvad` (não o antigo `cmo5113v`)
- [ ] Adicionar `VITE_ALCHEMY_URL=https://eth-sepolia.g.alchemy.com/v2/qU_kw3WpEY4gttS0Cfr2B`
- [ ] Adicionar `VITE_CONTRATO_SEPOLIA=0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`

---

## Raiz do Erro — Confirmado após Diagnóstico

### Raiz Principal
**App ID incorreto** em todos os arquivos de configuração:
- Errado: `cmo5113v300l90clgzksivvad` (caractere 6 = `1`)
- Correto: `cmo51f3v300l90clgzksivvad` (caractere 6 = `f`)
- Origem provável: typo manual ao copiar o App ID do painel Privy (confusão entre `f` e `1` em fontes monospace)
- Com ID errado, o SDK Privy inicializa apontando para um app inexistente. O SDK pode ficar em estado `ready: false` indefinidamente OU tentar `login()` contra um app inválido — em ambos os casos, o modal NUNCA abre.

### Causas Secundárias
1. **Sem polyfill `global`**: ethers.js e Privy SDK precisam de `global = globalThis`
2. **Silêncio no `!ready`**: botão de login não dava feedback de loading → usuário achava que estava quebrado
3. **`X-Frame-Options: DENY`**: bloquearia carregamento de iframes do Privy (auth modal usa iframes)
4. **Sem `switchChain`**: transações podiam falhar em rede errada
5. **Apple OAuth**: listado no código mas desabilitado no painel → erro ao tentar Apple login

### Lógica da Solução
1. Corrigir o App ID em TODOS os pontos de entrada (main.jsx fallback + todos os .env files)
2. Adicionar `define: { global: 'globalThis' }` no Vite para polyfill browser
3. Desabilitar botão enquanto `ready: false` e mostrar spinner — elimina confusão UX
4. `X-Frame-Options: SAMEORIGIN` — permite iframes de mesmo domínio (necessário para Privy)
5. `switchChain(11155111)` antes de assinar — garante Sepolia sempre
6. Remover Apple de loginMethods até habilitar no painel Privy
