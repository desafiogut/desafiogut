# DESAFIOGUT — Única Fonte de Verdade
> Atualizado em: 2026-06-14 | MC24 hotfix aplicado | Pipeline de lance 100% on-chain (Fase 6 — Faxina Final)

---

## Active Premium Skills

Skills padronizadas em `~\.claude\skills\<nome>\SKILL.md` (formato SKILL.md, ativas no Claude Code):

- @design-engineering — spring physics, layout anti-CLS, optimistic updates no pipeline de lance.
- @impeccable-design — cores dessaturadas + acento cirúrgico, dark mode profundo, contraste WCAG AA, foco visível.
- @taste-engineering — minimalismo funcional, copy honesta, microcopy de confiança em fluxo cripto/financeiro.
- @graphify — knowledge graph do codebase (`graphify update .`); query/path/explain sobre `graphify-out/`.

> Skills de infraestrutura adicionais (não-DESAFIOGUT, mesmo local): `aidesigner-frontend`, `skillcam-distill`.

---

## Instruções para Claude

1. **Use `@file` para acesso focado** — leia arquivos individuais ao invés do projeto completo.
2. **Privy é o padrão oficial** — use `wallets[0].getEthereumProvider()` (EIP-1193) para toda autenticação, assinatura e gestão de wallet.
3. **Deploy é Netlify** — auto-deploy ao push em `main` no repo `desafiogut/desafiogut`.
4. **Mantenha `MOCK_MODE`** — necessário para dev/test sem Privy.
5. **`VITE_PRIVY_APP_ID`** é obrigatório para o login funcionar em qualquer ambiente.

---

## Stack Oficial

| Camada | Tecnologia | Versão |
|---|---|---|
| Build | Vite | ^8.0.8 |
| UI | React | ^18.3.1 |
| Estilo | Tailwind CSS v4 + Shadcn UI (manual) | ^4.2.2 |
| Animações | Framer Motion | ^12.38.0 |
| Blockchain | Ethers.js v6 | ^6.16.0 |
| **Auth + Wallet** | **Privy** (Embedded Wallets — Google / E-mail / Apple) | **latest** |
| Rede | Ethereum **Sepolia Testnet** (chainId `11155111` / `0xaa36a7`) | — |
| Hash off-chain | Argon2id via `hash-wasm` WASM | ^4.11.0 |
| Sanitização | DOMPurify + regex custom | ^3.1.6 |
| Deploy | Netlify (SPA rewrite) — https://silly-stardust-ca71bc.netlify.app | — |

> ✅ **Privy é o padrão oficial de autenticação e gerenciamento de carteira.**
> Objetivo: **zero barreira de entrada** — sem extensão de browser, sem QR Code, sem seed phrase.
> O usuário faz login com Google, e-mail ou Apple. A carteira Ethereum (Sepolia) é criada automaticamente.
>
> Hooks Privy disponíveis (importar de `@privy-io/react-auth`):
> - `usePrivy()` → `{ ready, authenticated, user, login, logout }`
> - `useWallets()` → `{ wallets }` — `wallets[0]` é a embedded wallet Privy
> - `wallet.getEthereumProvider()` → provider EIP-1193 para assinar via ethers.js
> - `wallet.switchChain(11155111)` → força rede Sepolia antes de transações

---

## Regras de Negócio

- **Artigo VIII** — Vence o **menor lance único** (valor que aparece exatamente 1 vez).
- **Artigo XVII/XXI** — Senhas são liberadas pela coordenação após PIX ou Bônus.
- **Artigo XXIII** — Lance mínimo: R$ 0,01 (1 centavo).
- **Segurança** — Cada lance gera um hash Argon2id off-chain (prova de intenção imutável).
- **Assinatura** — EIP-191 via Privy embedded wallet antes de enviar a transação on-chain.
- **Rate Limit** — 5 lances/min, cooldown 3s por carteira (client-side, complementar ao contrato).
- **Compliance** — Gate de consentimento LGPD obrigatório antes de qualquer interação.

---

## Smart Contracts Ativos

### `LeilaoGUT` — Sepolia Testnet
```
Endereço : 0x59A73Acc8E8B210C874B0E3A9eC9B8B64847F6D5
Rede     : Ethereum Sepolia (chainId 11155111)
Etherscan: https://sepolia.etherscan.io/address/0x59A73Acc8E8B210C874B0E3A9eC9B8B64847F6D5
Arquivo  : desafio-gut/contracts/Leilao.sol
Deploy   : Hardhat Ignition em 2026-04-28 (Iteração 5). Coordenacao = deployer.
```

**ABI mínimo utilizado pelo frontend:**
```solidity
function darLance(string idEdicao, uint256 valorEmCentavos) public
function apurarVencedor(string idEdicao) public view returns (uint256, address)
function saldoSenhas(address) public view returns (uint256)
function coordenacao() public view returns (address)
function abrirEdicao(string idEdicao, string nome, uint256 duracaoSegundos) public
function edicoes(string) view returns (string nome, bool ativa, uint256 prazo)
```

**Edição ativa no frontend:** `"R-1"`

---

## Variáveis de Ambiente

| Variável | Valor | Arquivo |
|---|---|---|
| `VITE_PRIVY_APP_ID` | `cmo51f3v300l90clgzksivvad` | `.env.local` + Netlify Dashboard |
| `VITE_CONTRATO_SEPOLIA` | `0x59A73Acc8E8B210C874B0E3A9eC9B8B64847F6D5` | `.env.local` + `.env.production` |
| `VITE_ALCHEMY_URL` | `https://eth-sepolia.g.alchemy.com/v2/qU_kw3WpEY4gttS0Cfr2B` | `.env.production` + Netlify Dashboard |
| `VITE_MOCK_MODE` | `false` em prod | `.env` |
| `VITE_WC_PROJECT_ID` | legado — não usado na lógica ativa | `.env.local` |

> ⚠️ **`VITE_PRIVY_APP_ID` é obrigatório.** Sem ele, o login não inicializa.
> 1. Acesse https://privy.io → projeto já criado (App ID `cmo51f3v300l90clgzksivvad`)
> 2. Em Settings → Login Methods → Google + Email ativos (Apple ainda desabilitado no painel)
> 3. Em Settings → Embedded Wallets → "Create on login" ativo para "All users"
> 4. Em Allowed Origins: `https://silly-stardust-ca71bc.netlify.app`

---

## Arquitetura de Arquivos

```
desafio-gut/
├── contracts/
│   └── Leilao.sol                  ← Contrato auditável
└── frontend/
    ├── .env                        ← VITE_MOCK_MODE (dev)
    ├── .env.local                  ← VITE_PRIVY_APP_ID + VITE_CONTRATO_SEPOLIA (não commitar)
    ├── .env.production             ← Idem (deploy Netlify)
    └── (raiz do repo) netlify.toml ← SPA rewrite + headers de segurança
    ├── vite.config.js              ← Tailwind v4 plugin + alias @
    └── src/
        ├── main.jsx                ← Entry point: PrivyProvider com Sepolia + Google/Email/Apple
        ├── globals.css             ← Design tokens @theme + keyframes
        ├── App.jsx                 ← Orquestrador: usePrivy + useWallets + timer + lances
        ├── lib/utils.js            ← cn() helper (clsx + tailwind-merge)
        ├── components/
        │   ├── CardLance.jsx       ← Formulário de lance + Privy wallet signing + Argon2id
        │   ├── TabelaLances.jsx    ← Tabela ordenada + Framer Motion + beam
        │   ├── TermosConsentimento.jsx  ← Gate LGPD
        │   └── ui/
        │       ├── card.jsx        ← Shadcn Card (glassmorphism)
        │       ├── badge.jsx       ← Shadcn Badge (success/warning)
        │       └── progress.jsx    ← Shadcn Progress
        └── utils/
            ├── appkit.js           ← ⚠️ ARQUIVADO — substituído por Privy
            ├── web3.js             ← OFICIAL: hashLance, assinarLance, enviarLance, getEdicaoPrazo
            ├── sanitize.js         ← DOMPurify + validação de endereços
            └── rateLimiter.js      ← Token bucket (5/min, cooldown 3s)
```

---

## Design Tokens (globals.css)

| Token | Valor | Uso |
|---|---|---|
| `--color-gut-bg` | `#04080f` | Fundo da aplicação |
| `--color-gut-primary` | `#00d4aa` | Acento teal-cripto + `accentColor` Privy |
| `--color-gut-gold` | `#f5a623` | CTAs, overlay vencedor |
| `--color-gut-danger` | `#ff3d71` | Timer urgente ≤5s |
| `--color-gut-success` | `#00c853` | Dot conectado, saldo |
| `--color-gut-warning` | `#f97316` | Timer 6–15s |

---

## Fluxo de um Lance (produção)

> **Pré-requisito (leilão programado):** o endereço do usuário precisa ter
> `saldoSenhas > 0` no contrato. O crédito é feito **on-chain pela coordenação**
> via `adicionarSenhas(usuario, n)` após confirmação do PIX (Art. XVII/XXI) —
> não há mais conversão local de saldo flash em ficha. O frontend lê o saldo
> via `getSaldoSenhasOnChain` e escuta `SenhasCreditadas` + `LanceDado` para
> manter a UI sincronizada (`AppContext.subscribeSaldoSenhas`).

```
1. Usuário clica "🎯 Entrar no Leilão"
   └─ login() Privy → modal com Google / E-mail / Apple
      ├─ Login Google: OAuth flow → carteira embedded criada automaticamente
      ├─ Login E-mail: código OTP → carteira embedded criada automaticamente
      └─ Login Apple: OAuth flow → carteira embedded criada automaticamente
      ✅ Sem extensão de browser. Sem QR Code. Sem seed phrase visível.

2. Privy confirma autenticação
   └─ usePrivy() → { authenticated: true, user: { google: { email, name } } }
   └─ useWallets() → { wallets: [{ address, walletClientType: 'privy' }] }

3. AppContext lê saldoSenhas(address) on-chain (gate de darLance)
   └─ getSaldoSenhasOnChain(address) → exposto como { saldoSenhas, saldoSenhasStatus }
   └─ Botão "Confirmar Lance" fica disabled enquanto saldoSenhas == null/0
      ou status ∈ { loading, error }.

4. Usuário digita valor (centavos) e clica "Confirmar Lance"
   ├─ sanitizeLance()              → valida range 1–999999
   ├─ verificarRateLimit()         → token bucket client-side
   ├─ hashLance()                  → Argon2id WASM (prova off-chain)
   ├─ wallet.switchChain(11155111) → garante rede Sepolia
   ├─ wallet.getEthereumProvider() → provider EIP-1193
   ├─ getSignerFromProvider()      → ethers.js BrowserProvider + Signer
   ├─ assinarLance()               → EIP-191 signMessage (popup Privy na tela)
   └─ enviarLance()                → darLance(idEdicao, valorEmCentavos) on-chain Sepolia
                                     ↳ contrato decrementa saldoSenhas[msg.sender]
                                       (não há gastarFicha localStorage no fluxo real)

5. Confirmação da tx → receipt.hash exibido + tabela atualizada
   └─ Listener LanceDado dispara refetchSaldo → badge 🔗 atualiza sozinho
```

---

## Próximos Passos

- [ ] Habilitar Apple OAuth no painel Privy
- [ ] Adicionar `apurarVencedor()` público para exibição do vencedor real on-chain
- [ ] Persistência multi-usuário dos lances (backend ou indexação de eventos)

---

## MC24 — Hotfix ReferenceError `card is not defined` (2026-06-14)

**PR:** [#55](https://github.com/desafiogut/desafiogut/pull/55) | **Branch:** `feat/mc24` → `main`

### Bugs Corrigidos

| # | Ficheiro | Erro | Causa |
|---|---|---|---|
| 1 | `Dashboard.jsx:302` | `...card` → undefined | Objeto `card` deletado no commit `b6ef24c` (MC23.3 GlassCard) |
| 2 | `CorporativoAnalytics.jsx:98,114` | `...cardStyle` → undefined | `cardStyle` nunca definido |
| 3 | `SejaNossoParceiro.jsx:584` | `...inputStyle` → undefined | `inputStyle` removido; `<select>` não usa `<Input>` |
| 4 | `CorporativoDashboard.jsx:426,503,507` | `inputStyle` → undefined | `inputStyle` removido; `<select>`/`<textarea>` não migrados |

### Lição Aprendida

**Ao substituir objetos de estilo inline por componentes primitivos, verificar TODOS os spreads residuais.**  
`grep -rn '\.\.\.varName' src/` deve retornar vazio ou ter definição correspondente.

### Regra Adicionada ao Pipeline

Antes de merge de migração de UI:
1. `rg '\.\.\.(card|cardStyle|inputStyle|buttonStyle|modalStyle|tableStyle|badgeStyle)[^a-zA-Z]' src/` → cada spread deve ter `const` correspondente no mesmo ficheiro
2. `npm run build` → verde obrigatório
3. Smoke test MCP em `/` (Dashboard) — página mais complexa
