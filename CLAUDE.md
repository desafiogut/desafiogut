# DESAFIOGUT — Única Fonte de Verdade
> Atualizado em: 2026-08-08 (MC89.50) | **Ethereum MAINNET ativa desde o MC60** | Pipeline de lance 100% on-chain
>
> ⚠️ Este ficheiro esteve desatualizado entre o MC60 e o MC89.50: descrevia a rede
> como Sepolia, o contrato como `0x59A73Acc…` e o deploy como automático. Estava
> errado nos três pontos. Corrigido aqui.

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
3. **Deploy é Netlify e é MANUAL** — **não há auto-deploy**. Publica-se com
   `netlify deploy --prod --build` a partir da branch em checkout.
   **Nunca usar `--dir=dist`**: assa o env local no bundle e pode regredir a rede.
   Fluxo seguro: `netlify deploy --build` (draft) → validar o bundle → `--prod --build`.
   Sinal de que produção recebeu o artefacto validado: o CLI dizer `CDN requesting 0 files`.
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
| **Auth + Wallet** | **Privy** (Embedded Wallets — Google; E-mail OTP só no fluxo corporativo) | **latest** |
| Rede | Ethereum **MAINNET** (chainId `1` / `0x1`) — desde o MC60 | — |
| Hash off-chain | Argon2id via `hash-wasm` WASM | ^4.11.0 |
| Sanitização | DOMPurify + regex custom | ^3.1.6 |
| Deploy | Netlify (SPA rewrite) — https://silly-stardust-ca71bc.netlify.app | — |

> ✅ **Privy é o padrão oficial de autenticação e gerenciamento de carteira.**
> Objetivo: **zero barreira de entrada** — sem extensão de browser, sem QR Code, sem seed phrase.
> O login público é **Google** (`login({ loginMethods: ["google"] })` em `AppContext.jsx`).
> O **e-mail (OTP)** continua a ser usado no fluxo **corporativo**. **Apple está morto** —
> não está ativo no painel Privy nem no código. A carteira Ethereum (mainnet) é criada
> automaticamente.
>
> Hooks Privy disponíveis (importar de `@privy-io/react-auth`):
> - `usePrivy()` → `{ ready, authenticated, user, login, logout }`
> - `useWallets()` → `{ wallets }` — `wallets[0]` é a embedded wallet Privy
> - `wallet.getEthereumProvider()` → provider EIP-1193 para assinar via ethers.js
> - `wallet.switchChain(1)` → força rede mainnet antes de transações

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

### `LeilaoGUT` — Ethereum MAINNET (ativo)
```
Endereço : 0x0052477A8CA81BCAF4a60e21e635F9e00a5d16cd
Rede     : Ethereum mainnet (chainId 1)
Etherscan: https://etherscan.io/address/0x0052477A8CA81BCAF4a60e21e635F9e00a5d16cd
Arquivo  : desafio-gut/contracts/Leilao.sol
Marco    : MC60 — produção passou para mainnet. Coordenação = EOA 0xFea436…1E67.
```

> ⚠️ **`0x59A73Acc8E8B210C874B0E3A9eC9B8B64847F6D5` é o contrato Sepolia ABANDONADO.**
> Se aparecer num bundle de produção, é regressão — ver o portão de validação
> em `docs/MC89.49-DEPLOY-LOG.txt`.

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
| `VITE_CONTRATO_SEPOLIA` | `0x0052477A8CA81BCAF4a60e21e635F9e00a5d16cd` — **apesar do nome, é o contrato MAINNET**; é esta a var que o frontend lê (`src/lib/network.js:19`) | Netlify Dashboard |
| `VITE_ALCHEMY_URL` | endpoint **`eth-mainnet`** da Alchemy | Netlify Dashboard |
| `VITE_CHAIN_ID` | `1` | Netlify Dashboard |
| `VITE_NETWORK_STAGE` / `NETWORK_STAGE` | `mainnet` | Netlify Dashboard |
| `VITE_MOCK_MODE` | `false` em prod | `.env` |
| `VITE_WC_PROJECT_ID` | legado — não usado na lógica ativa | `.env.local` |
| `VITE_CONTRACT_ADDRESS` | ⚠️ **VAR MORTA** — está a `0x0000…0000` no Netlify e **ninguém a lê**. Não confundir com a de cima. | Netlify Dashboard |

> ⚠️ **`.env.production` já não existe** em `desafio-gut/frontend/`. Os valores de
> produção vivem no **dashboard do Netlify** e são injetados pelo `--build`.

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
    │   (.env.production JÁ NÃO EXISTE — produção vem do dashboard do Netlify)
    └── (raiz do repo) netlify.toml ← base=desafio-gut/frontend + SPA rewrite + CSP
    ├── vite.config.js              ← Tailwind v4 plugin + alias @
    └── src/
        ├── main.jsx                ← Entry point: PrivyProvider (mainnet) + Google
        ├── lib/network.js          ← FONTE ÚNICA de rede/contrato/explorer (MC59.2)
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
   ├─ wallet.switchChain(1)        → garante rede mainnet
   ├─ wallet.getEthereumProvider() → provider EIP-1193
   ├─ getSignerFromProvider()      → ethers.js BrowserProvider + Signer
   ├─ assinarLance()               → EIP-191 signMessage (popup Privy na tela)
   └─ enviarLance()                → darLance(idEdicao, valorEmCentavos) on-chain MAINNET
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

---

## MC00.0 — Análise de impacto: leilão → e-commerce por dropshipping (2026-09-23)

**Natureza:** diagnóstico puro, zero código. **SEG-1: SEGUIR** (R19 ativada).
**Validação independente: APROVADO COM RESSALVAS** (7 ressalvas, 3 bloqueantes).
**Relatório:** `_logs/MC00.0-RELATORIO.md`.
⚠️ Os números corrigidos vivem em `_logs/MC00.0_SEG4_ERRATA-EXECUTOR.txt`, que
**supersede** os SEG0–SEG3. Inventário bruto grep-ável:
`_logs/MC00.0_SEG4_INVENTARIO-V3-CORRIGIDO.tsv`.

### O leilão já está desligado — mas o alinhamento falha onde importa

Não é plano; é o estado do código em `main`:

| Onde | O quê |
|---|---|
| `src/lib/leilaoLock.js:10` | `EM_BREVE_MODE = true` — todos os cronómetros mostram "EM BREVE" |
| `netlify/functions/_lib/recursos-app-config.mjs:19` | `isLeilaoAtivo: { ios:false, android:false, pwa:true }` ⚠️ é o **default no código**; o valor vivo do Blob não foi lido |
| `src/pages/MercadoLances.jsx:338` | "Vista de conformidade (modo loja iOS/Android)" |
| `netlify/functions/_lib/guto-perfis.mjs:74` | `PROMPT_CONFORMIDADE`: *"…nesta versão do app (loja de e-commerce)"* |
| `src/components/ScheduleView.jsx` | lógica do calendário removida; só resta "EM BREVE" |

⚠️ **Mas:** `GlassHeader.jsx:35` ("E-commerce através de Dropshipping") está dentro
de `{!isMobile && …}` — **não aparece no telemóvel**, que é a superfície que a Play
distribui. E `index.html:8` diz, na mesma frase, *"E-commerce via Dropshipping. Dê
seu lance: o menor valor único vence."* O alinhamento é **parcial e inconsistente**.

### Os três níveis (decisão D1 — nenhum MC de execução abre sem esta resposta)

| Nível | O que é | Custo |
|---|---|---|
| **N1 terminológico** | trocar as palavras | 4 MCs · **⛔ PROIBIDO isolado** |
| **N2 declarativo** | alinhar loja + regulamento + identidade visual | 9 MCs (recomendado **já**) |
| **N3 funcional** | construir o e-commerce | 22 MCs (bloco C: 13–19) |

**Porque N1 isolado é proibido:** trocar a palavra mantendo o mecanismo de menor
lance único transforma uma declaração honesta ("isto é um leilão") numa declaração
falsa ("isto é uma loja"), perante o consumidor **e** perante a Play.

### Superfície medida (números v3 — com fronteira de palavra, PT+EN+ES)

| Área | Medida | Grau |
|---|---|---|
| Frontend | 128 strings de UI · 33 ficheiros · **0 rotas** com "leilao" | MÉDIO |
| Backend | 73 strings · **40 só em `_lib/guto-perfis.mjs`** · 5 nomes de função = URL pública | MÉDIO |
| Banco | tabela `lances` **0 linhas**; **0 matviews** no schema public | BAIXO |
| Docs | 1.121 em 154 ficheiros, mas **só ~6 normativos vivos** | BAIXO |
| Planos | ⛔ `plans/002:97` manda declarar "leilão pago (senhas R$2)" à Google; `:139` admite que leilão visível = **"real-money gaming"** | ALTO |
| CI | `contract-security.yml` + `security-scan.yml` apontam a `LeilaoGUT.sol` | MÉDIO |
| Lojas | 11 declarações, **incl. a CATEGORIA (Finanças)** | ALTO |
| Jurídico | regulamento **internamente contraditório**; 8 documentos inexistentes | CRÍTICO |
| Fiscal | zero infraestrutura (NF-e, NCM/CFOP, regime) | CRÍTICO |
| *[R19]* Contrato | `LeilaoGUT` em mainnet — **imutável**; `require("Lance minimo e R$ 0,01")` é permanente | IRREVERSÍVEL |
| *[R19]* Visual | **o ícone do app é o GUTO com um martelo de leiloeiro** (18 ficheiros) | ALTO |
| *[R19]* E-commerce | carrinho, frete, CEP, morada, NF-e, rastreio, devolução, stock, SKU, fornecedor = **0** | CRÍTICO |

> ⚠️ "dropshipping" aparece **2 vezes** no código, ambas cosméticas. **Zero** comportamento.
> ⚠️ A cópia de leilão **já está traduzida** em en.js/es.js ("Bids", "Pujas",
> "Lowest Unique Bid"). São **3 idiomas** a reescrever, não 1.
> ⚠️ Vocabulário adjacente (edição/senha/slot/vencedor) é **~1,7× o termo directo**
> no frontend (659 vs 376). Contar palavras dimensiona a copy, não o produto:
> `src/data/programacao-junho-2026.js` codifica 168 sessões de leilão por mês e tem
> **0 ocorrências** do termo.

### A contradição jurídica está dentro do regulamento, não na UI

`src/components/TermosConsentimento.jsx` declara no **Art. 1** que é *"atividade
comercial em formato de E-commerce através de Dropshipping"* e, 30 linhas abaixo,
no **Art. 8**, que *"O MENOR LANCE ÚNICO GANHA"*, e no **Art. 14** que o
contemplado recebe **prémio** em dinheiro (80% acima de R$ 10.000).

### Os três estrangulamentos (mandam na sequência)

1. **O índice RAG vive fora do repo.** Editar `docs/chatbot/regulamento.md` **não**
   muda o que o GUTO responde — é preciso `scripts/build-rag-index.mjs` (operador).
   Critério de aceitação = *perguntar ao GUTO em produção*, não ler o .md.
   ⚠️ Os pré-requisitos do rebuild (tokens HF/OpenAI/Netlify) **não estão
   documentados em lado nenhum**.
2. **O APK não se actualiza com deploy web.** Só mudam sem APK novo: respostas do
   backend/GUTO, o flag `recursos_app`, e conteúdo por API. ⇒ **agrupar tudo numa
   só submissão**; nunca "um MC por correção de texto".
3. **Há dinheiro real na economia de senhas.** Verificado por SQL:
   **R$ 23,75 em aberto, em 7 contas** + 21 registos de crédito + `saldoSenhas`
   on-chain. Nada se desmonta antes de decidir o que lhes acontece.

### ⛔ Dívida PRESENTE (não é risco futuro)

A ficha da Play descreve um leilão; o APK entregue tem `isLeilaoAtivo:{android:false}`
e mostra "EM BREVE". **Descrever funcionalidade que a app não entrega é motivo de
rejeição hoje.** E `plans/002` manda declarar "leilão pago" à Google.

### ✅ O teste fechado NÃO começou — a janela está aberta e é barata

`closed-testing/logs/coleta-2026-08-24_*.txt` → `closed_testing=nao_iniciado`, e não
existe `relatorios-diarios/`. Não há feedback a desperdiçar nem testadores a
confundir. **Adiar custa mais do que agir.** (Evidência de 2026-08-24 — confirmar
que nada mudou.)

### ⚠️ O catálogo vivo está em Netlify Blobs, NÃO no Supabase

`produtos.mjs:20,47` → `getStore` + `BLOB_PRODUTOS`. A tabela Supabase `produtos`
(0 linhas) é infraestrutura morta. O status de publicação **existe** no Blob
(`rascunho/ativo/vendido/entregue`). Qualquer plano de schema que ignore isto está
a desenhar migrações em tabelas mortas.

### Decisões pendentes (bloqueiam execução)

| # | Decisão | Quem decide |
|---|---|---|
| D1 ⛔ | Qual o nível (1, 2 ou 3)? | cliente |
| D2 ⛔ | O menor lance único continua a existir? Onde? | cliente + advogado |
| D3 ⛔ | Destino dos saldos já pagos (**R$ 23,75 em 7 contas** + on-chain) | cliente + advogado + contabilista |
| D4 ⚠️ | Quem vende: GUT em nome próprio ou intermediação? | advogado + contabilista |
| D11 ⚠️ | **Onde vive o catálogo: Blobs (hoje) ou Supabase?** | operador + agente |
| D6 ⚠️ | Categoria da Play passa de Finanças a Compras? | cliente |
| D7 ⚠️ | O martelo sai da marca? | cliente |
| D8 • | O contrato on-chain fica ligado ao app? | cliente |
| D9 • | "Vitrine (4 Slots)" e as cotas mantêm-se? | cliente |
| D10 • | Domínio definitivo (`MercadoLances.jsx:342` fixa `desafiogut.com`) | operador |
| ~~D5~~ | ~~O teste fechado já começou?~~ | **RESPONDIDA: não começou** |

### Sequência recomendada

```
A1 decisão+jurídico → A2 regulamento/políticas → B1 GUTO+RAG → B2+B3 copy em bloco
→ B4 identidade → B5 screenshots → B6 ficha+plans/002+003 → B7 APK (uma submissão)
```
e, só se D1 = Nível 3: `C1 liquidar senhas → … → C11 desmontar o leilão`
(**C1 sempre antes de C11**; C11 parte 2 workflows de CI e a suíte de testes).

> ⚠️ **B1 vem DEPOIS de A2, nunca antes.** A primeira versão deste plano invertia-os,
> e o Validador mostrou que isso era o "Nível 1 isolado" que a própria regra proíbe.
> O texto é a promessa; a promessa vem depois de se saber o que se pode prometer.

### Lição de método (vale para lá deste MC)

O scanner original usava `/lances?/` **sem fronteira de palavra** e contava "lance"
dentro de **"Balance"**. Só o **controlo negativo** o expôs — o controlo positivo
passava a 5/5. Varredura por palavra-chave precisa sempre dos dois controlos, e
fronteira de palavra em PT precisa da variante espelhada para camelCase
(`darLance`, `CardLance`: 557 ocorrências que a versão corrigida deixa de ver).

### Não medido (L-4)

Sem acesso à Play Console nem ao App Store Connect. Sem advogado nem contabilista —
as secções jurídica e fiscal são **levantamento de risco, não parecer**. MCPs
`chrome-devtools` e `claude-eyes` falharam a ligar: **nenhum ecrã foi observado a
correr**. O valor **vivo** do Blob `config-experiencia:recursos_app` não foi lido.
