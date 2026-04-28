# CLAUDE_DEBUG.md — Diário de Tentativas DesafioGUT
> Iniciado: 2026-04-28 | Protocolo: Resolução Definitiva com Auto-Aprendizado

---

## Estado Atual da Investigação

### Sintoma Relatado
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

## Próximos Passos
- [ ] Deploy para produção (`vercel --prod` ou push para repo monitorado pelo Vercel)
- [ ] Verificar no painel Privy → Settings → Allowed Origins: `https://frontend-one-tawny-20.vercel.app`
- [ ] Verificar no painel Privy → Login Methods: Google, Email, Apple ATIVADOS
- [ ] Testar clique do botão na URL de produção
- [ ] Confirmar que modal Privy aparece em 3s

---

## Raiz do Erro (a preencher após sucesso)
_Será preenchido após confirmação de sucesso em produção._
