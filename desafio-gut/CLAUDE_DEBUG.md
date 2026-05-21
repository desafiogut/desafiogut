# CLAUDE_DEBUG — DesafioGUT Debug Log

---

## MC12.3 — Login Corporativo Independente via CNPJ

**Data:** 2026-05-21
**Plano:** `C:\Users\Moltbot\Desktop\MC12.3.txt`
**Sessão:** execução guiada por documento (Opus 4.7)

### ✅ MC9.1 — Chatbot 24/7 funcional

**Índice RAG:** 5 chunks · dim 384 · modelo Xenova/all-MiniLM-L6-v2 (local).
**Pipeline em produção:** busca textual (TF-IDF) + resposta template com chunks.
**Status:** chatbot RESPONDE corretamente perguntas sobre o regulamento.

#### Diagnóstico (FASE 1)
- ChatbotWidget no bundle ✅
- netlify/functions/chatbot.mjs com handler POST ✅
- Endpoint produção retornava `embedding_indisponivel` ❌ (versão antiga)

#### Loop de correções (FASE 3)

**T1 — Deploy direto Xenova → FALHOU**
- Erro Lambda: `Something went wrong installing the "sharp" module
  libvips-cpp.so.42: cannot open shared object file`
- Causa: @xenova/transformers requer sharp (peer dep) que precisa de
  libvips binário Linux. Não disponível no Lambda Netlify.

**T2 — Externalizar sharp/xenova + HF Inference API → PARCIAL**
- netlify.toml: `external_node_modules = ["@xenova/transformers"]`
- esbuild não bundla mais o pacote (sharp resolvido)
- HF Inference API antiga (`api-inference.huggingface.co`) descontinuada
- HF Router (`router.huggingface.co/hf-inference/...`) retorna 401 sem token

**T3 — URL HF nova + mensagem clara → DOCUMENTADO**
- Atualizado para `router.huggingface.co/hf-inference/...`
- Mensagem de erro pede `HF_API_TOKEN` em vez de `OPENAI_API_KEY`
- Ainda bloqueado por falta de credentials

**T4 — Fallback textual TF-IDF + resposta template → ✅ RESOLVIDO**
- `rag.mjs::buscarChunksTextual(store, pergunta, topK)`: TF-IDF leve com
  stopwords pt-br, tokenização sem acentos. Sem deps externas.
- `chatbot.mjs` pipeline em 4 camadas com fallback gracioso:
  1. Embedding semântico (HF API ou Xenova) — bloqueado sem token
  2. Busca textual TF-IDF — sempre disponível
  3. LLM (DeepSeek/OpenAI) — bloqueado sem LLM_API_KEY
  4. Resposta template com top-K chunks formatados em markdown
- Resposta sempre 200 OK com `{resposta, fontes, modoBusca, modoResposta}`

#### Validação MCP (FASE 2 + FASE 5)
- `/` em produção → widget visível (botão "Abrir assistente DESAFIOGUT")
- Click → modal abre com input "Pergunte sobre regras…"
- Pergunta "Como funciona o leilão de menor lance único?" enviada
- Resposta exibida: 3 trechos do regulamento, incluindo Trecho 3 mencionando
  "Menor Lance Único (Artigo VIII)"
- Fontes: rag:2, rag:3, rag:0
- modoBusca: textual · modoResposta: template
- Console limpo (apenas 1 erro HTTP/2 protocolar, não relacionado)
- Screenshot: `CLAUDE_DEBUG_screenshots/mc9-1-chatbot-resposta-real.png`

#### `scripts/test-mc9.1.mjs` → **8/8 OK** ✅
1. ChatbotWidget no bundle
2. Endpoint /chatbot responde 200 OK
3. Índice RAG existe (fontes retornadas)
4. rag.mjs exporta buscarChunksTextual
5. chatbot.mjs retorna modoBusca + modoResposta
6. Resposta produção contém termos do regulamento
7. netlify.toml externaliza @xenova/transformers
8. Build verde + zero TDZ

#### Para upgrade futuro (qualidade total)
Provisionar no Netlify Dashboard:
- `HF_API_TOKEN=hf_...` → ativa busca semântica via HF Inference API
- `LLM_API_KEY=sk-...` → ativa resumo IA via DeepSeek/OpenAI
Sem essas chaves, chatbot opera em modo fallback (textual + template) com
qualidade aceitável para FAQ.

---

### MC12.3.1 — Cadastro corporativo DIRETO sem email-OTP ✅

**Problema:** após MC12.3, o submit do formulário disparava `login()` Privy
(modal email-OTP). O usuário pediu cadastro DIRETO, sem etapa OTP.

**Diagnóstico (grep SejaNossoParceiro.jsx):**
- Linha 127: `usePrivy` importava `login`
- Linha 185: `await login()` abria modal Privy email-OTP
- Linha 195/247: `useEffect [authenticated, wallets[0]?.address]` aguardava
  autenticação para fazer POST
- Servidor `cotas.mjs` exigia `accessToken` Privy JWT obrigatório

**Correção T1+T3 (cliente + servidor):**
- `SejaNossoParceiro.jsx`:
  - Imports `usePrivy`, `useWallets`, `useNavigate`, `useEffect`, `useRef` removidos
  - `handleSubmit` agora faz POST DIRETO após GET ?cnpj (404→continua)
  - `dadosPendentesRef` + `useEffect [authenticated]` removidos
  - Estado `sucesso` adicionado + UI de sucesso pós-cadastro (não redireciona;
    coordenação entra em contato pelo email)
- `cotas.mjs` register-corporativo:
  - `accessToken` opcional (era 401 token_invalido obrigatório)
  - `endereco` opcional (cadastro sem login → `cliente_id = "cnpj:" + cnpjNums`)
  - `origem` registrada no blob: "autenticado" ou "direto"
  - Índice `cotas-cnpj` agora indexa por `cliente_id` (não mais por `endereco`)

**Validação visual MCP local:**
- `/seja-nosso-parceiro` → form aparece sem login
- Preencher CNPJ + email + empresa → click "⚡ Enviar cadastro corporativo"
- **Resultado:** banner "Este CNPJ já está cadastrado" inline (sem modal Privy)
- Console: apenas CSP/walletconnect pré-existentes (zero novos erros)

**Script `test-mc12.3.1.mjs`:** 6/6 ✅
1. Build verde
2. Zero TDZ
3. Sem login()/useEffect[authenticated]/usePrivy/useWallets em SejaNossoParceiro
4. POST register-corporativo dentro do handleSubmit
5. cotas.mjs: accessToken/endereco opcionais + cliente_id pseudo "cnpj:"
6. UI sucesso (state `sucesso`) presente

**Validação produção (commit 165d541 deploy ~16:15):**
- `GET /cotas?cnpj=11444777000161` → antes do cadastro: 404 livre ✅
- Form preenchido (CNPJ 11.444.777/0001-61, email teste@corporativo.com,
  empresa "Teste MC12.3.1", segmento Varejo) + click submit
- **UI exibe imediatamente:** "✅ Cadastro corporativo realizado!" sem modal Privy
- `GET /cotas?cnpj=11444777000161` → após cadastro: 200 com
  `{cliente_id: "cnpj:11444777000161", endereco: null, email: "teste@corporativo.com"}`
- Screenshot: `CLAUDE_DEBUG_screenshots/mc12-3-1-prod-sucesso.png`
- ✅ **RESOLVIDO**

**Tech debt:** `GET /cotas?cliente_id=cnpj:XXX` retorna 400 `endereco_invalido`
porque o branch `clienteId` em handleGet ainda chama `validarEndereco()`.
Sem impacto no fluxo atual (AppContext busca por `address` Privy, não por
pseudo-id). Se cadastro direto + login Privy posterior precisar buscar o
blob original, criar branch separado em handleGet para `cliente_id=cnpj:...`.

---

### Itens 1–5 (MC12.3 original) ✅ — script test-mc12-3.mjs: 10/10 OK

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
