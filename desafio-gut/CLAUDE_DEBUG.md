# CLAUDE_DEBUG — DesafioGUT Debug Log

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
