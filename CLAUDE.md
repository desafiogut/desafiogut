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

---

## MC93-A — Motor de pontuação do torneio de habilidade (2026-09-23)

**Entregue:** motor PURO. **Não entregue, por decisão do operador (R18):** tabelas,
endpoints, gancho de rodada e emissão de senhas → **MC93-B**.
**Código:** `netlify/functions/_lib/pontuacao-utils.mjs` ·
**Testes:** `_tests/mc93-pontuacao.test.mjs` (33) ·
**Spec:** `docs/TORNEIO-HABILIDADE.md` · **Logs:** `_logs/MC93_*`

### ⚠️ O enunciado do MC93 tinha 7 de 9 premissas erradas

Verificado no SEG-1 (`_logs/MC93_SEG-1_QUESTIONAMENTO.txt`). Guardar, porque
qualquer MC futuro que parta do mesmo enunciado repete os mesmos erros:

| Premissa do enunciado | Realidade |
|---|---|
| `lance-programado.mjs` | **não existe** |
| `admin-cotas.mjs` (padrão de referência) | **não existe** — o padrão é `guardAdmin` de `_lib/admin-auth.mjs` |
| tabela `edicoes` | **não existe** — é `mapping` dentro do contrato `LeilaoGUT` |
| tabela `usuarios` | **não existe** — a chave é o `endereco` da carteira (Privy) |
| tabela `senhas` | **não existe** |
| `lances` tem `usuario_id`/`criado_em`/`repetido` | tem `endereco`/`created_at`/`payload`; e **0 linhas** (os lances vivem em Blobs) |
| baseline 842 verdes | **403** (medido) |
| `pytest` / `ruff` | são de Python; aqui é `node --test` e `eslint` |
| gancho de fim de rodada em `lance-relampago.mjs` | é endpoint **por lance**; o fecho está em **`consolidar-lances.mjs`** |

### ⛔ O bónus de senhas NÃO é um UPDATE

`comprar-senhas.mjs:281` e `troco.mjs:89` → `creditarSenhas()` → `adicionarSenhas`
**on-chain, Ethereum mainnet** (`_lib/contract.mjs`). Creditar 20 senhas é uma
transação assinada pela coordenação: **gas real + R$ 40,00 de valor emitido** por
sequência, sem limite definido. O enunciado declarava "R2 SUSPENSA (custo zero)" —
premissa falsa. **R2 tem de ser reativada antes de qualquer emissão.**

Por isso o motor **calcula e não executa**: `detectarConsecutivos` devolve
`senhasBonus`/`pontosBonus` — o que *seria* devido. Não credita nada.

### Regras implementadas (fonte única em `REGRAS`, `Object.freeze`)

`VALOR_MINIMO_CENTAVOS 1` (Art. XXIII) · `PONTOS_ACERTO_UNICO 1` ·
`PONTOS_MENOR_UNICO 3` · `ACERTOS_PARA_BONUS 5` · `PONTOS_BONUS 5` ·
`SENHAS_BONUS 20`.
**Quando o MC95 fixar o regulamento, muda-se ali — num sítio só.** Há testes que
fixam os cinco números **em literal**: se mudarem, a suíte falha de propósito.

### ⚠️ Defeitos encontrados por validação independente (e o que os causou)

A minha própria prova de mutação deu **12/12 mortos** e eu dei o segmento por
fechado. O Validador encontrou **seis defeitos reais**. Todos confirmados por
execução antes de aceitar:

1. **`valorCentavos: null` ganhava a rodada.** `Number.isInteger(Number(null))` é
   `true` porque `Number(null) === 0` → lance único, o mais baixo, vencedor, 4
   pontos. ⚠️ **`Number.isInteger` NÃO coage** — o defeito era o `Number()` à
   volta dele. E há caminho real: `_lib/data-store-supabase.mjs:117` grava
   `valor_centavos = null` **de propósito** para marcar lance inválido. Duas
   convenções opostas.
2. **Zero e negativos pontuavam**, contra o Art. XXIII.
3. **Lance sem dono anulava o +3 para todos** — era eleito menor único e o bónus
   evaporava-se em vez de passar ao seguinte.
4. **`atualizarRanking` rebentava** com `Map` de chaves não-textuais: o caminho do
   Map não normalizava, o da lista sim — duas políticas na mesma função.
5. **`detectarConsecutivos` falhava ABERTO**: `Boolean("sim")` pagava 20 senhas.
6. **O teste de pureza é cego através do import** — `simulador.mjs` importa
   `@netlify/blobs`. E o teste "não duplicar" só via a *linha* de import: apagar
   a *chamada* e reimplementar localmente deixava tudo verde.

### Lições de método (recorrência alta, impacto alto)

- **Asserção que usa a mesma constante do código não testa a regra de negócio.**
  Na 1ª ronda, `PONTOS_MENOR_UNICO: 3 → 0` deixou a suíte toda verde, porque os
  testes comparavam contra `REGRAS.*`. Valores de negócio fixam-se **em literal**.
- **Uma prova de mutação só é tão boa quanto os mutantes que alguém se lembra de
  escrever.** Foi a independência que pagou, não o método.
- **Teste de estrutura por regex lê prosa.** O primeiro `R1: é PURO` falhou por
  causa do meu próprio comentário a nomear `process.env`. Usar `semComentarios()`
  (convenção já existente em `_tests/mc8843-estado-edicao.test.mjs:33`).

### Estado e pendências

**436/436 verdes** (baseline 403 + 33). **Zero ficheiros modificados** — o motor
não tem chamador, logo zero efeito em produção (R1 trivial).
⚠️ Validado só com **dados sintéticos**: o leilão está travado
(`EM_BREVE_MODE = true`; `isLeilaoAtivo:{ios:false,android:false}`), não há rodadas
reais. Cobertura **não medida** (o projeto não tem alvo configurado).

**A fechar antes do MC93-B:** definir "ciclo" (não existe em lado nenhum);
desempate e limite de bónus por participante (ambos com efeito financeiro);
reativar R2; decidir se se inverte a dependência do Blobs. Ver
`docs/TORNEIO-HABILIDADE.md` §6 e §7.

> ⚠️ **Conflito de sequência, registado:** este MC constrói o mecanismo do torneio
> enquanto o regulamento (`TermosConsentimento.jsx` Art. 8) continua a prometer
> "O MENOR LANCE ÚNICO GANHA" e prémio em dinheiro (Art. 14). É a inversão que o
> MC00.0 identificou (errata E6) — mecanismo antes da promessa. O motor foi mantido
> puro e sem chamador precisamente para que essa divergência não chegue a produção
> antes do MC95.

---

## MC93-B — Persistência, endpoints e integração do torneio (2026-09-24)

**Entregue:** `_lib/pontuacao-store.mjs`, `pontuacao.mjs`, `ranking.mjs`,
migração `20260923_mc93b_pontuacoes.sql`, gancho em `consolidar-lances.mjs`, 41 testes.
**477/477 verdes** (baseline 436 + 41). **Logs:** `_logs/MC93B_*` · **Spec:** `docs/TORNEIO-HABILIDADE.md` §4b.
⚠️ **Validação independente: REPROVADO à primeira.** Os números e as afirmações
válidas são os da errata `_logs/MC93B_SEG4_EXECUTOR.txt` §4.9.

### ⛔ PENDÊNCIAS QUE BLOQUEIAM O USO

1. **A migração NÃO foi aplicada.** `pontuacoes` e `rankings_ciclo` não existem
   em produção. O código que as usa falha hoje. Execução é do operador.
2. **Não há handler de fila para `creditar-senhas-bonus`.** Uma tarefa
   enfileirada esgota as 5 tentativas e cai na DLQ. Criar o handler é emissão
   on-chain — fora deste MC, precisa de R2 reativada.

### ⚠️ O bónus é um DIREITO, não um saldo — e porquê

O enunciado mandava "creditar em `saldo_senhas` (Supabase)". **Não é possível:**
`saldo_senhas` nessa base é coluna de **`lojistas`** (0 linhas), não do
participante; e `darLance` exige `saldoSenhas[msg.sender] > 0` **on-chain**
(`Leilao.sol:88`), decrementando-o em `:107`. Uma senha creditada fora da cadeia
**não habilita lance nenhum** — o utilizador veria "+20 senhas" e a transação
reverteria. Além disso `saldo-senhas.mjs` calcula
`saldoEfetivo = saldoOnChain − senhasConsumidas`: somar um termo off-chain
quebraria a invariante `saldoEfetivo ≤ saldoOnChain`.

Decisão do operador (Opção A): grava-se `senhas_a_creditar` com
`liquidado_em = NULL` e enfileira-se `creditar-senhas-bonus`. **A UI do MC94 tem
de dizer "20 senhas a creditar", não "+20 senhas".**

### Decisões do operador materializadas (R18, 2026-09-23)

`ciclo_id` é **TEXT** (ciclo = 1 edição; os ids são `"R-1"` e `lances.edicao_id`
é `VARCHAR(66)` — um UUID impediria o join) · desempate por **mais acertos** ·
**1 bónus por ciclo** · bónus como direito, sem gas.

> ⚠️ O desempate por acertos **não cabia no motor** do MC93-A (que desempata por
> endereço e este MC não podia alterar). Vive no store; há um teste que exige
> que as duas regras coincidam quando os acertos são iguais. Quando o MC95
> ratificar a regra, leva-se ao motor e o store delega.

### Os seis defeitos que a validação independente encontrou

A minha suíte tinha **466 verdes e 0 falhas** ao mesmo tempo que tudo isto era
verdade. **Verde não é prova.**

| | Defeito | Correcção |
|---|---|---|
| P0 | **`/feedback` avariado a 100%** — passei o `Request` onde `verificarUserSession` quer a **string do token** (`_lib/jwt.mjs:78`, como nos outros 18 chamadores). Lançava `JWSInvalid` → 500 fora do `jsonResponse` → **sem CORS** → "Failed to fetch" no APK | Bearer extraído + try/catch → 401. **O mock passou a exigir string** |
| P0 | **Bónus inalcançável em produção** — a integração nunca passava `historicos` → `detectarConsecutivos([])` → `bonus: 0` sempre | O store lê o histórico da **sua própria tabela** |
| P0 | **Concorrência pagava a dobrar** — read-then-write: duas consolidações paralelas gravavam 20 e enfileiravam 40 | **Compare-and-set** (`UPDATE … WHERE bonus_emitido = false`) |
| P1 | **`error` do Supabase ignorado em todas as chamadas** → escrita recusada respondia 200 OK, e tornava decorativo o fail-soft | helper `exigir()` |
| P1 | **Refechar apagava os pontos do bónus** (9 → 4) | preservados e testados |
| P2 | SQL sem `GRANT … TO service_role` (o `REVOKE … FROM PUBLIC` retira o herdado → 42501 **em silêncio**) e CHECK a bloquear a liquidação óbvia | ambos corrigidos |

### ⚠️ Consequência assumida da integração

O gancho é **fail-soft depois do recibo**. Como o `catch` engole,
`marcarConsolidado` **corre na mesma**: se a pontuação falhar, a edição fica
consolidada **sem pontos**, e a 2.ª chamada sai no `estaConsolidado` — o estado
parcial é **permanente** por esse caminho. A recuperação é manual:
`POST /pontuacao` com o mesmo `cicloId` repontua (idempotente, preserva bónus e
liquidação). A resposta devolve `pontuacao: null` para a coordenação ver.
*(Um comentário anterior afirmava que a edição ficava por marcar e a repetição
resolvia. Era falso — corrigido no código e na spec.)*

### Lições de método (recorrência alta, impacto alto)

- **Um duplo que aceita mais do que o original esconde o defeito que devia
  apanhar.** O mock de `verificarUserSession` ignorava o argumento e deu verde a
  um endpoint avariado a 100%. Mocks de funções de segurança têm de **rejeitar
  o que a real rejeita**.
- **Um controlo positivo que não morre invalida a ronda de mutação.** O meu
  tinha-se tornado mutante equivalente por causa do compare-and-set; trocá-lo
  revelou que **nada testava concorrência**.
- **Uma mutação que "sobrevive" pode nunca ter sido aplicada.** Duas das minhas
  falharam em silêncio (delimitador `|` do `sed`; padrão com LF). Assertar
  sempre a substituição antes de declarar um sobrevivente.
- **Testes que fazem `db.push()` e depois só leem não ligam escrita a leitura** —
  foi o padrão por trás de 10 mutações sobreviventes.

### Não medido (L-4)

Nada foi corrido contra o **Supabase real** (migração por aplicar) nem contra
uma **rodada real** (leilão travado em `EM_BREVE_MODE`;
`consolidar-lances.mjs:51` só corre em mainnet). Cobertura não medida.
⚠️ **As correcções aos seis defeitos não passaram por uma segunda validação
independente** — foram verificadas por quem as escreveu.

---

## MC93-C — Handler do bónus + validação dupla independente (2026-09-24)

**Entregue:** `_lib/bonus-emissao.mjs`, `_lib/worker-bonus.mjs`, registo no mapa da
fila, 30 testes. **507/507 verdes.** **Logs:** `_logs/MC93C_*` · **Spec:** §4c.
⚠️ **Os DOIS validadores independentes deram REPROVADO.** Três P0 confirmados por
execução e corrigidos — ver `_logs/MC93C_SEG4_EXECUTOR.txt` §4.8.

### ⛔ O bónus pagava 11× o devido (regressão do MC93-B, agora corrigida)

`detectarConsecutivos().bonus` é **cumulativo sobre todo o histórico e nunca
decresce**; a guarda `bonus_emitido` é **por ciclo**. Uma bandeira por-ciclo não
pode limitar um contador que atravessa ciclos: cada ciclo novo nascia com a
bandeira a `false` e concedia outro bónus.

**Medido:** 5 vitórias + 10 derrotas = **11 bónus = 220 senhas = R$ 440** (devidos
R$ 40), com bónus concedido em edições de `acertos_totais = 0`. Nenhum teste
passava de 5 ciclos, por isso a suíte não via.

**Correcção:** `contarBonusConcedidos(endereco)` conta os bónus já dados em todos
os ciclos; concede-se só se `sequencia.bonus > jaConcedidos`.

### ⛔ `.eq(col, null)` NÃO é `IS NULL` — regra permanente do projeto

O postgrest-js traduz `.eq(col, null)` para `col=eq.null`, que o PostgREST
rejeita numa coluna TIMESTAMPTZ com **HTTP 400 (`22007`)**. Só `.is()` gera
`col=is.null`. Verificado por execução:

```
.eq("liquidado_em", null) → ?liquidado_em=eq.null   ❌ 400
.is("liquidado_em", null) → ?liquidado_em=is.null   ✅
.eq("bonus_emitido", false) → ?bonus_emitido=eq.false  ✅ (booleano, eq é válido)
```

O compare-and-set do handler usava `.eq()`: **não existia**. Com a flag ligada
teria falhado em 100% das execuções → DLQ. E a suíte **pinava o defeito** — o
teste assertava o valor do filtro `eq`, logo a correcção partia 6 testes.
Hoje: o duplo **lança** se alguém chamar `.eq(col, null)`, como o PostgREST faz.

### ⛔ O CAS do MC93-B era neutralizado pelo upsert acima

O `upsert` repunha `bonus_emitido: false` a partir de uma leitura anterior,
noutra transacção — com latência real, o pagamento duplo reaparecia.
**Correcção:** o upsert deixou de escrever `bonus_emitido`, `senhas_a_creditar` e
`liquidado_em`. Essas três colunas são **exclusivas** do compare-and-set e do
worker de liquidação. Os pontos passaram a duas UPDATEs condicionais.

> O teste que o guarda é **comportamental** (observa as colunas realmente
> escritas), porque o sintoma precisa de MVCC e um duplo in-memory não o
> reproduz. Guarda-se a causa, já que não se consegue guardar o sintoma.

### O cadeado de três condições (além do pedido)

O MC pedia uma flag. Uma flag sozinha é **fail-open por omissão de disciplina**.
A emissão exige, em simultâneo: (1) `BONUS_EMISSAO_ATIVA === "true"` (string
exacta); (2) dívida existente e `liquidado_em IS NULL` no **livro-razão** — a
idempotência ancora no registo, não na fila; (3) payload a coincidir com o
livro-razão **e com a regra** em ciclo, endereço e quantidade.

**Estado hoje: DRY-RUN**, confirmado por execução — com dívida perfeita em
aberto, a decisão é `{"emitir":false,"motivo":"flag_desligada"}`.

### ⛔ Pendência que bloqueia a activação: a dívida órfã

Em dry-run a tarefa é consumida sem liquidar, e `enfileirar` só corre quando a
dívida **nasce**. Toda a dívida criada com a flag desligada fica
**permanentemente fora do alcance da fila**. Antes de ligar, re-enfileirar o que
está em aberto — a consulta está em `docs/TORNEIO-HABILIDADE.md` §4c. **Não
implementado.**

### Lições de método (recorrência ALTA — 3.º MC seguido)

- **Um duplo que aceita o que o sistema real recusa dá verde a código partido.**
  Já aconteceu com um mock que ignorava o argumento (MC93-B) e agora com um que
  aceitava `eq(col, null)`. Regra: o duplo **recusa o que o original recusa**, e
  **aplica os DEFAULTs das colunas** como a tabela real.
- **Um teste pode PINAR o defeito.** Aqui a correcção certa partia 6 testes,
  porque eles assertavam o mecanismo errado. Quando uma correcção óbvia parte
  testes, suspeitar dos testes primeiro.
- **Ancorar mutações em sintaxe executável, nunca numa expressão citada.**
  Segunda vez que um comentário meu corrompe a minha própria prova de mutação.
- **Duas validações em paralelo sobre a mesma working tree contaminam-se.** O
  Validador B viu ficheiros a mudar debaixo dos pés (era o A a mutar) e declarou
  a conformidade não-mensurável. Em série, ou cada um no seu worktree.

### Não medido (L-4)

Nada correu contra Supabase real nem contra a mainnet; a migração continua por
aplicar e tem **cobertura de teste zero**. `txHash` não é persistido e `err.code`
é descartado. `GET /ranking` é público e enumera todas as carteiras que
licitaram — decisão de produto por tomar.
⚠️ **As correcções deste MC não passaram por uma terceira validação
independente.** Três MCs, três reprovações: a ressalva é material.

---

## MC93-D — Contrato medido + sweeper da dívida órfã (2026-09-24)

**Entregue:** `_lib/sweeper-divida-orfa.mjs`, 3 ficheiros de teste de contrato,
registo no processor. **543 testes · 535 verdes · 0 falhas · 8 saltados.**
**Logs:** `_logs/MC93D_*` · **Spec:** `docs/TORNEIO-HABILIDADE.md` §4d.
Validadores **em série, em worktrees separados** (regra nova, nascida do MC93-C).

### ✅ A migração deixou de ter cobertura zero

Aplicada a um PostgreSQL real (17.6) com PostgREST: aplica limpa, e os 8 CHECKs
recusam o que devem. Era a lacuna nº 1 herdada do MC93-B.

### ⚠️ Regra permanente: `.eq(col, null)` NÃO é `IS NULL` — agora provada no servidor

| medido contra PostgREST real | |
|---|---|
| `.eq(col, null)` numa TIMESTAMPTZ | **ERRO `22007`** |
| `.is(col, null)` | funciona |
| `.eq(col, false)` num booleano | funciona (o CAS do store estava certo) |
| upsert parcial | **preserva** as colunas não listadas |

Há um teste que varre **toda** a árvore de produção e falha se algum ficheiro
voltar a usar `.eq(col, null)`.

> ⚠️ **`.select()` no fim do compare-and-set não é decoração.** Sem ele o
> PostgREST devolve `204`/`null`, o código conclui que perdeu a corrida e **o
> bónus nunca é concedido**. Invisível aos duplos. Guarda acrescentado; mata nos
> dois sítios.

### ⛔ O sweeper que eu criei era um moto-contínuo

`enfileirar` é um INSERT puro sem dedup. Em dry-run o handler consome a tarefa
sem liquidar → a dívida continua órfã → nova varredura reenfileira →
**~51.840 linhas/dia** em `fila_tarefas`. Corrigido: **no-op enquanto a emissão
estiver desarmada**, dedup contra tarefas por concluir, e `order`+`limit` no
**servidor** (o cliente truncava em 1000 e `encontradas` mentia).

### ⚠️ Poluição de protótipo armava a emissão

`process.env.X` resolve pela **cadeia de protótipos**:
`Object.prototype.BONUS_EMISSAO_ATIVA = "true"` armava a emissão sem variável
nenhuma — a validação independente chegou a creditar por essa via. Corrigido
com `Object.hasOwn` antes de ler. **Regra:** toda a flag que decide dinheiro
lê-se com `Object.hasOwn`, nunca por acesso directo.

### ⚠️ `CONTRATO_ADDRESS` tem fallback para um endereço SEM bytecode

`_lib/contract.mjs:50` → `0x273Ef9…445e`, medido num fork: **zero bytes**. Uma
chamada a `adicionarSenhas` contra endereço sem código **não reverte** (status 1)
— o worker marcaria a dívida liquidada e ninguém receberia senhas. Só
`verificarCoordenacao()` impede. Agora coberto por teste; o fallback permanece
(`contract.mjs` não é alterável neste MC).

### ⛔ ERRATA: a minha refutação do fork on-chain era FALSA

O SEG-1 afirmou que o `hardhat` estava partido e que não havia como levantar uma
EVM sem instalar nada. **Errado**, reconfirmado por execução:

```
node_modules/hardhat                         → 2.28.0
node_modules/@nomicfoundation/hardhat-ethers → 4.0.9   (par CORRECTO)
./node_modules/.bin/hardhat --version        → 2.28.0, exit 0
@nomicfoundation/edr                         → INSTALADO (EVM em-processo)
```

**Causa:** o `package.json` PINA `^3.4.0` mas o INSTALADO é 2.28.0 — e o erro que
reportei vinha do hardhat v3.9.1 da cache do `npx`. Li o `package.json` e uma
mensagem de erro, **sem confirmar a versão instalada**.

A validação independente levantou um fork de mainnet sem instalar nada e correu
o cenário completo (`adicionarSenhas` → `darLance` → saldo decrementado, com
controlo negativo). ⇒ **A decisão de não instalar Foundry foi tomada sobre
informação errada minha.** Foundry continua a não ser preciso — mas o fork é
possível e **fica por fazer**.

### Lições de método (recorrência ALTA — 4.º MC seguido)

- **Confirmar a versão INSTALADA, não a que o `package.json` pina.** Um erro de
  `npx` pode vir de um binário que o projeto nem usa.
- **Assertar que o ficheiro MUDOU, não só que o padrão existia.** O HARD GATE 4
  (ignorar comentários) resolveu o falso sobrevivente por comentário; apareceu
  logo outro, por `replace` multilinha que não aplicou. Terceiro do projeto.
- **Um `skip` tem de dizer a verdade sobre porquê.** "Impossível" e "por fazer"
  não são a mesma coisa, e o primeiro dispensa-me de voltar lá.
- **Duplos: 8 de 16 métodos divergem do real, todos na direcção permissiva.**
  `update` sem `.select()`, tecto de 1000 linhas, `maybeSingle` com >1 linha,
  `select("a,b")` ignorado, upsert sem `onConflict`, upsert a omitir NOT NULL.

### Pendências

1. ✅ **RESOLVIDA no MC93-E** — ligar os testes de NÍVEL 2 em CI. O `ci.yml`
   passou a levantar Postgres + PostgREST reais; medido `# skipped 0`.
2. ✅ **RESOLVIDA no MC93-E** — o cenário on-chain existe e corre numa EVM
   local. ⚠️ NÃO é fork de mainnet: isso exige um RPC com credencial (R5).
3. Antes de activar a emissão: aplicar a migração em produção e reativar a R2.

---

## MC93-E — CI de contrato a correr + EVM local (2026-09-24)

**Entregue:** `ci.yml` com Postgres+PostgREST reais, `_tests/mc93e-ci-config.test.mjs`,
`_tests/mc93e-fork-onchain.test.mjs`, `_tests/_evm-local.mjs`, fixture do contrato,
3 scripts. **Fecha as DUAS pendências do MC93-D.**
**590 testes · 589 verdes · 0 falhas · 1 saltado** (condições do CI; base 543/535/8).
**Logs:** `_logs/MC93E_*` · **Spec:** `docs/TORNEIO-HABILIDADE.md` §4e.
**SEG-1: AJUSTAR.** Dois validadores independentes, em série: ambos
**APROVADO COM RESSALVAS**, com **4 achados ⛔** — todos corrigidos.

### ⚠️ A REGRA NOVA: a verdade que o CI corre é o `package-lock.json`

O MC93-D ensinou que `package.json` ≠ `node_modules`. Este mediu a terceira, e
depois levou com ela na cara uma segunda vez:

| fonte | hardhat | edr | solc |
|---|---|---|---|
| `node_modules` (esta árvore) | 2.28.0 | next.17 | 0.8.26 |
| `package.json` | `^3.4.0` | — | — |
| **`package-lock.json` — é ISTO que o CI corre** | **3.4.2** | **next.29** | **ausente** |

Reproduzido com `npm ci` numa pasta isolada. Por isso o arnês de EVM fala só com
a **API pública do `@nomicfoundation/edr`**, nunca com `hardhat/internal/...`.

> ⛔ **E a mesma armadilha apanhou-me outra vez, do lado do CI.** Dois testes do
> MC30.2.1 fazem `mock.module("@aws-sdk/client-kms")` — e `mock.module` **exige
> que o especificador resolva**. Esse pacote não está no lockfile das functions:
> resolve aqui por subir a árvore até `frontend/node_modules`. Em CI dava
> `ERR_MODULE_NOT_FOUND` e **o job nunca ficaria verde** — a correcção do nível 2
> estaria certa e seria invisível. A minha suíte local dava 0 falhas *por
> acidente de ambiente*.
>
> **Regra:** antes de um teste depender de um pacote, confirmar que ele está no
> lockfile que o job instala. Há agora uma guarda que varre `_tests/*.mjs` e
> exige exactamente isso — teria apanhado isto no dia em que nasceu.

### ✅ Os testes de contrato de nível 2 correm mesmo

`ci.yml` levanta **Postgres 17** (`service:` com health-check), cria os papéis
(`anon`/`authenticated`/`service_role`/`authenticator`), aplica a migração e corre
**PostgREST v12.2.3** com JWT de `service_role`.
Medido: sem servidor `# skipped 5` · com servidor `# skipped 0`.

> ⚠️ **O PostgREST NÃO pode ser um `service:`.** Os papéis e a migração têm de
> existir antes de ele ler o schema, e um `service:` arranca antes de qualquer
> passo. Fica em `docker run --network host`, depois da migração.

### ⚠️ Três formas de um gate de CI mentir — todas medidas neste MC

1. **Repórter errado.** `--test-reporter=tap` é obrigatório em qualquer guarda
   que conte saltos: o repórter por defeito escreve `ℹ skipped N`, e o parse de
   `# skipped N` devolve vazio. A guarda fica vermelha para sempre.
2. **Glob vazio.** `node --test` com um glob que não casa sai **0 com zero
   testes**. Apontar o passo ao directório errado deixa tudo verde a não testar
   nada. A guarda exige `# pass > 0`.
3. **`describe` saltado.** Os filhos **não contam** em `# skipped` e nem são
   emitidos — o gate via `skipped 0` com a EVM inteira por correr. E um `grep`
   por `adicionarSenhas` era satisfeito pelo teste de *selectores*, que nem toca
   na EVM. O gate exige agora o **nome do teste decisivo**.

### ✅ O cenário on-chain, que o MC93-D dizia impossível

`adicionarSenhas(20)` → `darLance` → saldo 19, com controlo **negativo** (razão do
revert em literal) e **positivo**, numa EVM em-processo. ~2 s, sem rede, sem
credencial, sem CLI do hardhat (que continua partido e não é preciso).

⚠️ **NÃO é fork de mainnet.** `ALCHEMY_URL` é credencial (R5) e os **três**
endpoints públicos que testei recusaram — três é amostra estreita, e a afirmação
honesta é essa. O salto passou a ter **alavanca**: `MAINNET_RPC_URL` no ambiente
faz o teste correr (só `eth_getCode`, nunca transacção).

### ⛔ `indexed` não entra no `topic0` — e a corrupção é SILENCIOSA

`topic0 = keccak(sighash)`, e o sighash **não inclui `indexed`, nem os nomes, nem
a mutabilidade**. Medido: tirar `indexed` de `LanceDado.lancador` mantém o mesmo
topic0, e `getLanceDadoEvents` — que lê `args[0..4]` **por posição** — passa a
devolver lançador errado, `valor: 0`, `repetido: true`, **sem excepção nenhuma**.
`monitor-onchain.mjs` detectaria "anomalias" sobre lixo.

**Regra:** comparar selectores fecha a cegueira a **aridade e tipos**; para
eventos é preciso comparar também `indexed`, e para funções a `stateMutability`.

### Lições de método (5.º MC seguido)

- **Terceira vez que um comentário meu satisfaz a minha própria asserção.** A
  guarda do `--test-reporter=tap` passava por causa do comentário que o
  explicava. Configuração executável lê-se sempre com os comentários fora.
- **Asserção sobre o agregado esconde o defeito no sítio exacto.** Procurar a
  variável no JOB inteiro sobrevivia a tirá-la do PASSO certo.
- **Mudar três coisas de uma vez impede saber qual corrigiu.** A bissecção
  mostrou que só `cacheTimeout: -1` faz diferença; `staticNetwork` e
  `batchMaxCount` não fazem nada.
- ⛔ **Declarar uma impossibilidade a partir de UMA tentativa falhada não é
  medir.** Escrevi no teste que o defeito da cache "não era prendível de forma
  fiável". Era: a cache do ethers é indexada pelos **argumentos**, e eu usava
  111 e depois 222 — nunca havia acerto. Com o mesmo argumento reproduz 5 em 5.
  É o mesmo erro do SEG-1 do MC93-D, em ponto pequeno.

### ⛔ Para o operador

**ROTAR a chave Alchemy de `desafio-gut/hardhat.config.cjs`.** Está em texto
simples e **commitada desde o MC89.14** (`a2c40ee`) — apagar o ficheiro agora não
a tira do histórico. Não foi tocada (R5). Mesma classe da chave DeepSeek do MC89
e da EOA do MC59.11.

### Pendências

1. ⛔ **O `ci.yml` nunca correu num runner do GitHub** (`act` não está instalado).
   Validado com `desafio-gut/scripts/ci-postgrest-local.sh`, mesmas imagens, e um
   teste que impede os dois de divergirem. Por provar: `${{ env.X }}` dentro de
   `run`, `$GITHUB_ENV` entre passos, `if: always()`, `--network host` a alcançar
   um `services:`.
2. ⛔ **Deriva entre `contracts/Leilao.sol` e o bytecode em mainnet.** Desbloqueia
   com `MAINNET_RPC_URL` autorizado pelo operador.
3. ⚠️ Adulterar os `settings` da fixture continua invisível em CI — fecha-se com
   `npm i -D solc@0.8.26` na raiz de `desafio-gut/`.
4. Antes de activar a emissão: migração em produção + R2 reativada.

---

## MC93-F — Preparação bloqueante do MC94: Supabase + Netlify (2026-09-25)

**Data:** 2026-09-25 · **Origem:** MC93-F, medição por MCP/CLI · **Recorrência:**
ALTA (drift de produção é o 3.º caso) · **Impacto:** ALTO (desbloqueia o MC94).
**SEG-1: AJUSTAR** · **R19 ativada** · **SEG4: APROVADO** · **Zero código novo.**
**Logs:** `_logs/MC93F_*` · **Relatório:** `_logs/MC93F-RELATORIO.md`

### ✅ O que mudou em produção

| | antes | depois |
|---|---|---|
| tabelas em `public` | 19 | **21** (`pontuacoes`, `rankings_ciclo`) |
| migrações | 9 (última 2026-08-03) | **10** (`20260925002324 mc93b_pontuacoes`) |
| produção servia | árvore de **2026-08-18**, sem `commit_ref` | **`c199591`, com `commit_ref`** |
| `origin/main` | **104 commits atrás** | convergido |
| `/ranking` | 200 · `text/html` (ausente) | **200 · JSON, a ler a tabela** |

Projeto Supabase de produção: **`vjslwowwrpcawijdiksm`** (staging é
`gjuelqjjhuuwnlsjyeai`). Confirmar SEMPRE antes de escrever.
Medido: `pontuacoes` 3 CHECKs · `rankings_ciclo` 6 CHECKs = **9** no total
(a documentação do MC93-B/D dizia 8 — o número certo é 9).

### ⚠️ HTTP 200 não prova que a função existe

`netlify.toml:34` reescreve `/*` → `/index.html` com **status 200**. Uma função
AUSENTE responde `200` com `text/html`, indistinguível de um OK.

> **Regra:** validar endpoints por **`content-type: application/json`**, nunca
> pelo código HTTP. E sempre com os dois controlos — um endpoint inventado (tem
> de dar HTML) e um que se sabe deployado (tem de dar JSON).

E `total: 0` também não prova que se está a ler a tabela: pode ser erro engolido.
A prova é inserir uma linha sintética, ver o endpoint devolvê-la, e apagá-la.

### ⚠️ `/feedback` não existe como função

É `GET /ranking?recurso=feedback&cicloId=…&endereco=…` (`ranking.mjs:46`), com
JWT de user-session obrigatório (anti-IDOR, validado a responder `401
sessao_invalida` em produção). E o endpoint de escrita é **`/pontuacao`**, não
`/pontuar`.

### ⛔ NÃO existe MCP do Netlify

Nunca foi instalado. Usar o **CLI 26.1.0**, já autenticado. O MCP do Supabase
existe e funciona.

### ⛔ TRÊS PENDÊNCIAS PARA O OPERADOR

1. **Rotar a chave Alchemy** de `desafio-gut/hardhat.config.cjs`. Introduzida em
   `a2c40ee` (MC89.14), que **já estava no GitHub antes deste MC**. Não tocada (R5).
2. **`desafio-gut/frontend/package-lock.json` está dessincronizado** do
   `package.json` (`typescript@5.9.3`, `@types/react@19.3.0`,
   `@tanstack/react-query@5.103.2`, `@tanstack/query-core@5.103.2` ausentes do
   lock). O job `install` da CI falha e **`build`/`lint`/`test-functions`/
   `test-onchain` saem `skipped`.
   ⇒ **É por isto que o `ci.yml` do MC93-E continua a nunca ter corrido.**
   Remédio: `cd desafio-gut/frontend && npm install --package-lock-only`.
   ⇒ E explica a divergência: o Netlify usa `npm install --legacy-peer-deps`
   (tolerante), a CI usa `npm ci` (estrito).
3. **`test_limiteMaxLancesUnicos()` do Foundry falha** — e **não é regressão**:
   `git log df691cf..c199591` nos caminhos do contrato e do teste vem vazio.
   Último verde **2026-08-10**, este **2026-09-25**, e o workflow usa
   `foundry-rs/foundry-toolchain@v1` **sem versão fixada**. O teste faz 10 000
   `darLance` em ciclo e estoura o tecto de gas (2³⁰). Remédio: fixar a versão.

### ⚠️ O push contornou a proteção de branch

```
remote: Bypassed rule violations for refs/heads/main:
remote: - Changes must be made through a pull request.
remote: - 2 of 2 required status checks are expected.
```
104 commits entraram em `main` sem PR e sem checks verdes, porque a conta tem
bypass. Não foi usada nenhuma flag de contorno. Se a proteção existe por desenho,
é decisão do operador.

### ⚠️ O auto-deploy continua LIGADO (`stop_builds: false`)

Hoje é inofensivo **porque `main` == local**. Volta a ser perigoso no dia em que
o local se adiantar sem push. Foi assim que nasceu o drift dos MC79 e MC89.49.

> **Regra que este MC confirma pela terceira vez:** com auto-deploy ligado, o
> `git push` É o deploy. Um `netlify deploy --prod` manual produz um deploy **sem
> `commit_ref`** — irrastreável — e é revertido pelo próximo merge.

### Decisões do operador (R18)

1. Aplicar a migração a produção **agora**.
2. **Push dos 104 commits primeiro**, depois o deploy.
3. **Não correr `--prod`** — o auto-deploy já publicara o mesmo commit, e um
   deploy manual por cima teria removido o `commit_ref`.

### Ressalvas (L-4)

Nenhuma rodada real processada (o leilão continua em `EM_BREVE_MODE`); as tabelas
estão vazias. Créditos do plano Netlify não medidos por API. As definições de
build ao nível do site divergem do `netlify.toml` (o toml ganha). A 3.ª validação
das correcções do MC93-E continua por fazer.

---

## MC93-G — Lockfile sincronizado e o CI a correr a sério (2026-09-25)

**Data:** 2026-09-25 · **Origem:** MC93-G, medição em runner GitHub real ·
**Recorrência:** ALTA · **Impacto:** ALTO (desbloqueou 5 jobs de CI).
**Modo LEVE** · **SEG-1: SEGUIR** · **Validador: APROVADO COM RESSALVAS**
**Zero código de aplicação.** Um só ficheiro: `desafio-gut/frontend/package-lock.json`.
**Logs:** `_logs/MC93G_*` · **Relatório:** `_logs/MC93G-RELATORIO.md`

### ✅ Estado dos lockfiles (medido com `npm ci --dry-run`)

| directório | estado |
|---|---|
| `<raiz>` | ✅ sincronizado |
| `desafio-gut` | ✅ sincronizado |
| `desafio-gut/frontend` | ✅ **corrigido neste MC** (era o único quebrado) |
| `desafio-gut/frontend/netlify/functions` | ✅ sincronizado |

### ⚠️ A causa: DOIS modos de instalação que não coexistem

As 4 entradas em falta (`typescript`, `@types/react`, `@tanstack/react-query`,
`@tanstack/query-core`) **não estavam declaradas** — são **peerDependencies** de
pacotes de produção (`abitype`, `viem`, `ox`, `@biconomy/account`, `wagmi`,
`valtio`, `zustand`). O npm 7+ auto-instala peers; `--legacy-peer-deps` salta-os.

```
npm ci --dry-run                     -> EUSAGE
npm ci --dry-run --legacy-peer-deps  -> passa
```

O lock era gerado no modo do `netlify.toml` e o `ci.yml` corre `npm ci` simples.

> ⛔ **ESTA CORRECÇÃO TEM PRAZO DE VALIDADE.** Medido: correr
> `npm install --legacy-peer-deps` (é o que `netlify.toml:3` e `npm run build:apk`
> fazem) **reverte o lockfile a byte-idêntico ao anterior** — 1067→1063 entradas,
> `sha 044780d8… -> d1f12aaf…` — e o npm diz só **"up to date"**. O `npm ci`
> volta a falhar nos mesmos 4 pacotes.
> **Antes de commitar um lockfile, correr `npm ci --dry-run` no directório.**
> Correcção de raiz (próximo MC): um modo só — `.npmrc` com
> `legacy-peer-deps=true`, ou `netlify.toml` a usar `npm ci`.

### ⭐ O CI correu num runner real pela primeira vez (run 36080693006)

| job | resultado |
|---|---|
| `install` · `lint` · `build` | ✅ **success** (1.ª vez; o `install` falhava em ~3 s) |
| `test-functions` | 583 testes · 580 ✔ · 1 ✖ · 2 ﹣ |
| `test-onchain` | 24 testes · 22 ✔ · 1 ✖ · 1 ﹣ |
| `audit` | ⛔ dívida pré-existente (10 high; idêntico nos dois lockfiles) |

**Os cinco testes `SERVIDOR:` do MC93-E passaram** — Postgres 17 + PostgREST
v12.2.3 + papéis + migração + JWT funcionam mesmo em CI.
**Os 7 testes do cenário EVM passaram**, com **hardhat 3.4.2 + edr next.29** —
versões que esta máquina não tem. A portabilidade contra a API pública do EDR
deixou de ser argumento e passou a medição.

### ⛔ REGRA NOVA: hash de ficheiro quebra entre sistemas operativos

`core.autocrlf=true` e **não existe `.gitattributes`** ⇒ o Windows tem CRLF no
disco, o runner Linux tem LF, e o **mesmo ficheiro em git tem sha256 diferente**:

```
Leilao.sol em disco (CRLF) : 3a3c6ed8e6f259cf…   <- gravado na fixture do MC93-E
normalizado a LF           : ee745ccbe27a73c9…   <- o que o runner calculou
```

⇒ O teste `"o sha256 da fixture corresponde ao Leilao.sol actual"` **nunca poderia
passar em CI**. Não "podia falhar": não podia passar. E os avisos
`LF will be replaced by CRLF` de cada commit eram a pista.

⚠️ **E afecta o BYTECODE também**: o solc embute um bloco CBOR com o **hash IPFS
da fonte**, logo CRLF e LF produzem bytecode diferente na cauda (divergência no
hex 10012 de 10098). O teste do solc — hoje saltado — **também falharia em Linux**,
com a mensagem errada. **A fixture do MC93-E não é reproduzível fora de Windows.**

> **Regra:** nunca hashear bytes crus de um ficheiro de texto versionado. Normalizar
> a LF antes, ou usar o hash do blob do git. E o repositório precisa de
> `.gitattributes` (`*.sol text eol=lf`) — regenerar a fixture sozinho não resolve.

### ⛔ Um guarda que não corre quando é preciso

| guarda no `ci.yml` | `if: always()` | no run real |
|---|---|---|
| `Prova de que o NIVEL 2 nao saltou` | ✅ tem | correu, `saltados=0` |
| `Prova de que a EVM nao saltou` | ⛔ **não tem** | **`skipped`** |

E `mc93e-ci-config.test.mjs` exige `if: always()` para o primeiro e **não** para o
segundo. A lição do MC93-E ("sem isto, se o passo falhar a prova nem corre") foi
aplicada a metade dos sítios, e o teste de configuração passou **verde** com a
assimetria dentro.

### Lições de método

- **Um teste que só correu na máquina de quem o escreveu mede também o sistema
  operativo dele.** Três dos quatro defeitos deste MC são do MC93-E e nenhum era
  visível sem runner real.
- **Auditar as remoções do diff, não só as adições.** As 31 remoções deste commit
  não eram pacotes: eram entradas que perderam `"dev": true`. Direcção medida:
  31 dev→prod, 0 prod→dev ⇒ instaladas em mais cenários, nunca menos.
- **Validar a correcção em cópia isolada antes de tocar no repositório.**

### Pendências

1. ⛔ **Um modo de instalação só** (A-1) — sem isto o lockfile volta a dessincronizar.
2. ⛔ **`.gitattributes` + regenerar a fixture** (A-3/A-4) — fecha as duas falhas CRLF.
3. ⛔ **`if: always()` no guarda da EVM** + a asserção que falta (A-2).
4. `npm audit`: 10 high pré-existentes. `test_limiteMaxLancesUnicos()` do Foundry
   (herdado do MC93-F). Chave Alchemy por rotacionar (operador, R5).
---

---

## MC94.4 — Inspecção geral e faxina (2026-09-25)

**Data:** 2026-09-25 · **Origem:** inspecção antes da sequência operacional ·
**Recorrência:** única (MC de casa-a-limpo) · **Impacto:** ALTO (achado P2 pode bloquear a Play Store)
**Fecho:** commit `3e39de0` · **Zero alteração a código de produção.**

### ⛔ P2 — O RELEASE ASSINA COM A CHAVE DE DEBUG (achado crítico, ainda ABERTO)

`desafio-gut/frontend/android/app/build.gradle:38`:

```groovy
signingConfig keystorePropsFile.exists() ? signingConfigs.release : signingConfigs.debug
```

`keystore.properties` **não existe** (linha 4 lê-o; está no `.gitignore`). Logo o bloco
`signingConfigs.release` fica vazio e **um `bundleRelease` assina com a chave de DEBUG** — a
Play Store rejeita. **ACÇÃO DO OPERADOR:** recriar `keystore.properties` com `storeFile`,
`storePassword`, `keyAlias`, `keyPassword` a partir de `keystore/credenciais.txt`.
**Não foi corrigido por agente de propósito:** a correcção exige ler a senha (R5/HARD GATE 4
proíbem). É o primeiro item a resolver antes de qualquer submissão.

### ⛔ P1 — Chave Alchemy em 11 ficheiros rastreados (ABERTO)

Uma chave Alchemy (21 chars) está replicada em **11 ficheiros rastreados**, incluindo
`frontend/src/utils/web3.js` — que é **empacotada pelo Vite e vai no bundle público**, e fica
no histórico do git para sempre. Os 3 `hardhat.config.*` estão **limpos** (usam
`process.env`) — o briefing apontava o ficheiro errado. `.env.example` tem um placeholder.
Retirar o hardcode exige variáveis de ambiente no Netlify (**não autorizado sem o operador**);
a rotação é do operador (R5).

### Método de auditoria de segredos (reutilizável)

1. Varrer por **classe**, não por padrão solto: PEM, `Bearer`, `sk-`, depois `0x`+64hex.
2. `0x`+64hex **classificar por CONTEXTO** — pode ser `SECP256K1_N` (constante pública),
   chave de teste documentada, ou **tx hash** (dado público). Encontrar ≠ expor.
3. Para saber se dois locais têm o **mesmo** segredo sem o ler: **SHA-256 truncado**.
   (Foi assim que se provou «mesma chave em 11 ficheiros, placeholder no `.env.example`».)
4. Nunca imprimir o valor: `grep -l` (só nomes), `cut -d: -f1` (só linhas), hash para comparar.

### Cofre de chaves

`DESAFIOGUT/secrets/` existe, ignorada pelo git (`secrets/*` + `!secrets/README.md`).
`secrets/README.md` é o **mapa** (ficheiro | propósito pelos NOMES das variáveis | origem)
— **nunca** valores. Foi movida para lá a única chave do DesafioGUT que estava solta
(`~/.mc33-staging.env`, com `SUPABASE_SERVICE_ROLE_KEY`). As que **não** foram movidas, e
porquê, estão tabeladas no README.

> **Regra:** o keystore (`DESAFIOGUT/keystore/`) **não se move** — o `storeFile` do
> `keystore.properties` aponta para lá. Já está no repo e gitignorado.

### `.gitattributes` (resolve a fragilidade CRLF)

Normaliza LF para `*.mjs/*.js/*.cjs/*.sh/*.py/*.json/*.yml` e mantém CRLF em `*.bat/*.ps1`.
Motivo: no MC94.3.1 o validador independente viu **1 falha falsa** por CRLF de um worktree novo
(o mesmo ficheiro passava 25/25 no repo principal).
⚠️ Ao adicionar/alterar `.gitattributes`, **medir sempre** `git status --porcelain | wc -l`:
a re-normalização em massa é o risco real dessa mudança (aqui não aconteceu: 7 entradas).

### `docs/`

`docs/README.md` é índice de **256 ficheiros**, gerado do conteúdo real. O `docs/` é
**arquivo**: a maioria dos ficheiros é de maio–julho e descreve estados que já não existem.
**A fonte da verdade é o código + este `CLAUDE.md`.** Verificar a data antes de confiar.

### Lições

1. **Antes de mover um ficheiro, perguntar quem o referencia.** Foi esse reflexo (ver quem usava
   o keystore) que revelou o achado P2 — que nenhum briefing mencionava.
2. **A R5 não impede a auditoria; obriga-a a ser melhor.** O hash truncado respondeu a
   «é a mesma chave nos 11 ficheiros?» sem o valor entrar no contexto.
3. **Uma regra cumpre-se quando custa.** P2 estava a um `cat` de distância e não foi feito.
4. **Não inflacionar.** O SEG3 pedia «centralizar todas as chaves»; mover **uma** e justificar
   as outras é o resultado honesto.


---

## MC94.3.2 — ADENDO — O retorno do OAuth não tinha rota (bug de login) (2026-09-25)

**Data:** 2026-09-25 · **Origem:** evidência reproduzida pelo operador · **Recorrência:**
ALTA (qualquer OAuth que volte a um caminho sem rota) · **Impacto:** ALTO (impede entrar na conta).

### ⛔ O defeito

`/redirect` é o `customOAuthRedirectUrl` do Privy. **Não tinha `<Route>` nenhum** em
`App.jsx` (nem catch-all): existia apenas para o deep link **nativo** (Capacitor), e em web
esse efeito é **no-op** (`if (!window.Capacitor) return`). O privy CONCLUÍA o login
(`[GUT] login completo`, `temAddress:true`, `temAuthToken:true` — medido na consola) e o
utilizador ficava numa **página vazia**, sem entrar na conta.

### ⛔ E a hipótese inicial estava errada — o que se mediu

O adendo apontava para a function `cotas.mjs` ausente/com 404. **Medido:**

- `cotas.mjs` existe, não foi tocada pelo MC94.3.1/94.3.2, e aparece empacotada no deploy;
- `GET /.netlify/functions/cotas` → **200** com dados reais;
- os 404 vistos são a resposta **certa** da própria function para um utilizador **sem cota
  atribuída** (`jsonError(404,"email_nao_encontrado")` :291, `"cota_nao_encontrada"` :316/579).

⇒ Os 404 são **ruído**, não causa. E `temCodigo` não é do login — é do
`ReferralRegistrar.jsx:51` (código de *referral*), outro assunto.

> **Lição:** a evidência já continha a resposta — `temAddress:true` + `temAuthToken:true`
> dizem que **o login funcionou**. Se o login funcionou, o defeito só pode estar DEPOIS dele.
> Ler a evidência até ao fim antes de ir atrás da hipótese mais chamativa.

### Correção

Rota **standalone** `/redirect` (fora do `<Route element={<AppLayout/>}>` — dentro, os gates
de cota/LGPD podiam bloquear a própria página que existe para completar a entrada) +
`EntradaOAuth`: com `ready && isConnected` → `navigate('/', {replace:true})`; sem sessão →
estado de entrada e, ao fim de **6 s**, saída **manual** em `<a href="/">` (carregamento novo,
que é onde o SDK restaura a sessão). Decisão em `src/lib/retornoOAuth.js`, pura e testável.

### O teste que faltava

`src/lib/retornoOAuth.test.mjs` — dois testes **leem a fonte**: o `App.jsx` tem de declarar
`<Route path="/redirect">`, e as duas pontas têm de coincidir (`ROTA_RETORNO_OAUTH` ↔ o path
do `customOAuthRedirectUrl` do `PrivyRoot`). **Este defeito viveu meses** e nenhum teste de
componente o podia apanhar (o `App.jsx` não é renderizável em teste — precisa do Privy).

### ⚠️ REGRA DE MÉTODO — um FAIL é um pedido de segunda medição

Neste par de MCs (94.3.1 + 94.3.2) uma asserção **minha** acusou um defeito inexistente
**quatro vezes**:

| acusou | era |
|---|---|
| "buraco de cobertura" no caminho `202` | `grep` a ler o ficheiro errado |
| mutante do CSS "sobreviveu" | a mutação não aplicou (CRLF) → **verde falso** |
| `COR.bg` ainda usado | o check apanhava o meu comentário **e** `COR.bgSoft` |
| "introduzi um `console.log`" / "a rota ficou no AppLayout" | o `console.log` já existia no HEAD; o caminho MSYS `/c/...` que o python do Windows lê como `C:\c\...` |

**Em todos, o código estava certo e a asserção errada.** Portanto:
1. **Nunca reportar um FAIL sem o re-medir** — o primeiro suspeito é a asserção.
2. **Confirmar que o mutante ENTROU** (contar substituições) antes de ler o resultado. Um
   mutante que não aplica dá um **verde falso**, que é pior que um vermelho.
3. **Não misturar dialectos de caminho** (MSYS `/c/...` vs Windows `C:/...`) em scripts que
   correm sob python no Windows.
4. Num teste que compara, **preferir asserção de IGUALDADE entre dois valores medidos** a um
   literal — foi assim que o teste da dimensão da especial passou a travar a divergência.

### Lição de design

Quando uma superfície tem de ser igual a outra, faça-se a igualdade **estrutural** (uma
constante partilhada), não uma coincidência entre dois literais. E quando um caminho é um
ponto de retorno externo (OAuth, pagamento, deep link), ele **tem de ter rota** — e um teste
que LÊ a fonte a exigir que ela exista.


---

## MC94.3.2 — Correções pontuais pós-MC94.3.1 (2026-09-25)

**Data:** 2026-09-25 · **Origem:** MC94.3.2 (4 problemas reportados pelo operador) ·
**Recorrência:** ALTA (a regra do vidro e a lição do tamanho servem todo o design system) ·
**Impacto:** MÉDIO-ALTO (superfície pública + uma sessão que não nascia).
**Logs:** `_logs/MC94.3.2_SEG*` · **Relatório:** `_logs/MC94.3.2-RELATORIO.md`

### 1. Dimensão: um valor só, não literais espalhados

A especial estava a **96 px** e o padrão medido é **52 px** (`EdicaoBanner` default e
`size` da R-1). Passou a existir `TAMANHO_BANNER_PADRAO` em `EdicaoBanner.jsx`, usada
pela R-1 **e** pela especial. "Igual ao padrão" deixou de ser coincidência entre dois
literais e passou a ser estrutural — não podem divergir outra vez. O teste exige
**igualdade**, não um número.

> Lição: quando duas superfícies têm de ser iguais, igualdade tem de ser uma
> consequência do código, não uma promessa. Três comentários diziam "96 px" e ficaram a
> mentir — um comentário falso é uma armadilha para o próximo agente.

### 2. Texto das senhas

`edicao.especial.regra` passou a "Rodada programada · vence o menor lance único · cada
lance usa 1 senha (R$ 2,00)" (pt/en/es). Suportado por duas fontes do próprio código:
Art. 20 do regulamento e a cópia do `CardLance` ("Lance programado consome 1 senha
(Art. 20: R$ 2,00)"). Se a intenção era o oposto (lance gratuito na especial), é uma
linha por idioma.

### 3. ⛔ A regra de hover que ficou obsoleta (bug do "Total de Lances" transparente)

**Causa raiz com história** — e é o achado de método deste MC:

| commit | o que fez |
|---|---|
| `07c4d88` (MC25.3) | criou `.gut-glass-standard` com base **0.25** e hover **0.35** (hover MAIS opaco → "lift") |
| `936b724` (MC82.1) | subiu a base para **0.88** (vidro sólido) e **não tocou no hover** |

Desde o MC82.1 o hover **inverteu o sentido**: passou a tornar a superfície ~2,5× **mais
transparente**. Num ecrã táctil o `:hover` fica *colado* depois de um toque → ao rolar, o
KPI aparece transparente. Correção em duas partes: o hover eleva em vez de esvaziar, e
passa a existir **só** dentro de `@media (hover: hover) and (pointer: fine)` — num ecrã
táctil não há hover, e não aplicar a regra elimina o *estado colado*, que é a causa.

> Lição: **ao subir a opacidade de uma base, procurem-se as regras que a comparavam com
> ela.** Um `-S` no git acha-as em segundos. O MC82.1 mudou a base e deixou o par dela
> para trás; o defeito só apareceu no aparelho, meses depois.

### 4. Navy glass onde havia vidro de segunda linguagem

`SejaNossoParceiro.jsx` tinha **zero** `gut-glass-standard` e usava
`COR.bg = rgba(13,18,53,0.25)` — a opacidade **antiga** do vidro — mais
`backdrop-filter: blur(16px)`, exactamente a combinação que o MC82.1 mediu como custo
dominante de render. As 3 secções passam a `.gut-glass-standard` (fonte única) e o
separador inactivo deixa de ser `variant="ghost"` (que o `Button.jsx` documenta como
*transparente*) para `variant="secondary"`. Bónus medido: sai o `backdrop-filter`.

### 5. Sessão que não nascia (bug de login) — parcialmente reproduzido

**Beco #1, provado e corrigido:** `obterAuthToken` era tentado **uma só vez** e o efeito
não voltava a correr numa falha (as dependências não mudavam). Uma falha transitória do
`/auth-user` (rede, 429, 500, CORS, cold start) deixava o utilizador **autenticado no
Privy e sem sessão, para sempre**. A política passou a `src/lib/retryAuth.js` (pura,
testável): 4 tentativas, recuo exponencial com tecto, aviso ao desistir.

**Beco #2, provado e NÃO alterado:** `AppContext` recusa abrir o modal com
`authenticated && !address` à espera de uma auto-criação de carteira que está
**desligada** (`createOnLogin: "off"` em `PrivyRoot.jsx`).

⛔ **O HARD GATE 9 (reproduzir primeiro) ficou PARCIALMENTE satisfeito** e diz-se assim:
completar um login exige credenciais de conta real (R5) e concluir o OAuth Google é acção
do operador. Mediu-se a **lógica**, não o fluxo vivo. Não se tocou no
`PrivyEventsBridge` — o próprio ficheiro avisa que o histórico de crashes do arranque do
Privy torna arriscado "melhorar" ali sem reprodução.

### Lições de método (recorrência ALTA)

- **Um mutante que não aplica dá um verde falso.** Na 1.ª tentativa da mutação do CSS a
  âncora falhou por CRLF: a substituição não aconteceu e o teste ficou **verde**. Verde
  que não provava nada. Detetei-o pelo próprio resultado e refiz a mutação. Confirmar
  sempre que o mutante ENTROU (contar as substituições) antes de ler o resultado.
- **Um teste pode apanhar código errado — e isso é o sistema a funcionar.** O teste do
  recuo mostrou que o tecto de 30 s era código morto (o expoente limitado a 5 dava no
  máximo 25 600 ms). Estava certo o teste, não o código.
- **Declarar o âmbito de um teste.** Os testes de `retryAuth` provam a **regra**, não o
  efeito de React (o `AppContext` não é testável por unidade: os testes do Dashboard
  substituem-no por um duplo). Dizê-lo é mais honesto do que apresentar aritmética de
  recuo como prova de ponta a ponta.
- **Testar CSS na folha, não no render.** O SSR não aplica a folha, logo nenhum teste de
  componente apanharia o defeito do hover. O invariante testa-se lendo `globals.css` —
  como o teste i18n lê os dicionários.

## MC94 — O torneio dentro de "Meus Ativos" (2026-09-25)

**Entregue:** 5 secções + 2 hooks + 2 arneses de teste, tudo **numa só tela**.
Zero rotas novas, zero páginas novas, navegação intacta.
****137 testes · 137 verdes · 0 saltados** · mutação **63/64** (1 equivalente, removido do código)** · build verde · `eslint` sem erros.
**Logs:** `_logs/MC94_*` · **Spec:** `docs/TORNEIO-HABILIDADE.md` §4f ·
**Relatório:** `_logs/MC94-RELATORIO.md`
⚠️ **DUAS validações independentes, ambas REPROVADO.** Os números e afirmações
válidos são os desta entrada.

### ⛔ Um ecrã que afirma factos sobre quem não identificou

Visível em **produção**, na captura de `e3d8791`: um utilizador **anónimo** lia
`0 / 5 acertos seguidos · Faltam 5 acertos` e `Nenhum bónus conquistado neste
ciclo`, enquanto o painel ao lado dizia correctamente "Entre na sua conta". Uma
falha de rede dava exactamente o mesmo texto.

**Causa:** escrevi os quatro estados (sem sessão · erro · a carregar · dados) no
`PainelTorneio` e **não os levei às outras duas secções**. Um zero inventado é pior
do que um aviso, porque o utilizador acredita nele.

**Regra:** toda a secção que mostra dados de uma pessoa tem de saber dizer *"não sei
quem és"*, *"não consegui ler"* e *"estou a ler"* — não só *"aqui está"*. O estado
marca-se no markup (`data-estado`), para a página poder provar que ele lá chega.

### ⛔ `Number(null) === 0` chegou ao ecrã (a armadilha do MC93-A, repetida por mim)

Um lance com `valor: null` aparecia como **`R$ 0,00 · menor único seu · vale 3
pontos`** — e há caminho real: `_lib/data-store-supabase.mjs` grava
`valor_centavos = null` **de propósito**. Do outro lado, `senhasACreditar: Infinity`
renderizava **"Infinity senhas"** (`Number(x) || 0` deixa passar).
`_estilo.js` tem agora `valorUtilizavel` / `reais` / `inteiroSeguro`, **sem coerção**.

### ⛔ O `index.html` com status 200 passava por resposta válida

`netlify.toml:34` reescreve `/*` → `/index.html` com **200**; o `apiGet` devolve
`{ok:true, data:null}` e os dois hooks mostravam "ainda não há pontuações" **com o
backend em baixo**. A regra já estava registada no MC93-F (validar o **corpo**, não
o código HTTP) — faltava aplicá-la aqui. Hoje: `!ok || !corpoEhJson(data)` → erro.

### ⚠️ Duas secções a contradizerem-se na mesma página

`ProgressoBonus` declarava "Bónus conquistado!" a partir de uma conta **local**
(`faltam === 0`) enquanto `EstadoBonus`, a ler `bonusEmitido` do livro-razão, dizia
"Nenhum bónus conquistado neste ciclo". Só o backend o pode afirmar — a concessão
tem o cadeado de três condições do MC93-C e custa senhas reais.

### ⚠️ Aplicar a correcção a metade dos sítios

`totalReal` (reconciliar `total` com o tamanho da lista) foi aplicado só ao ramo
"a mostrar os N primeiros de M". O ramo `else` — **o caso comum**, menos de 10
participantes — continuava a escrever `total` cru: **"0 participantes."** por baixo
de 4 linhas. Mesmo padrão do `if: always()` do MC93-E.

### Como se testa React neste projeto (não há runner, e não se instala um)

Medido: `jsdom` · `linkedom` · `happy-dom` · `react-test-renderer` ·
`@testing-library/react` → **todos ausentes**. E instalar um cai no ciclo do MC93-G
(`npm install --legacy-peer-deps` reverte o lockfile em silêncio).

| instrumento | o que faz | limite |
|---|---|---|
| `_render.mjs` | `vite` transpila o JSX + `react-dom/server` renderiza | `useEffect` **não corre** |
| `_hook-runner.mjs` | despachante próprio em `ReactCurrentDispatcher`; o hook corre a sério | a comparação de **deps** é minha, não do React |

> ⚠️ Por isso a suíte de hooks abre com **quatro controlos positivos** (deps `[]`,
> deps certas, efeito sem limpeza, `AbortSignal` honrado). Se um passar, o
> instrumento é cego. *Sonda precisa de controlo positivo.*

> ⚠️ **O duplo é de `fetch`, nunca de `apiGet`.** Deixar o `apiGet` real correr foi
> o que expôs o defeito do `index.html` com 200. Um duplo de `apiGet` tê-lo-ia
> escondido — a 4.ª vez que este projeto encontra a mesma família de defeito.

### ⚠️ Um duplo que ignora os argumentos torna a CABLAGEM invisível

O duplo dos hooks devolvia os dados combinados aconteça o que acontecesse. Uma
página que se esquecesse de ligar `address` ou `authToken` passava **todos** os
testes: o componente correcto, ligado a `undefined`, renderiza "sem dados" e fica
verde. Hoje o duplo **regista os argumentos**, e há testes que exigem que `erro`,
`carregando`, `semSessao` e `address` cheguem a cada secção.

### ⛔ ERRATA minha: a "colisão" entre servidores Vite em paralelo não existe

`_render.mjs` afirmava `# fail 2` por colisão. **Falso** — 91/91 verdes, 3 corridas
de 3, sem `--test-concurrency=1`. A causa real do `# fail 2` era a heap estourada
pelo `BotaoLoginPrincipal` (2,68 MB de Privy) sem duplo. Diagnosticado de **uma**
observação, como no MC93-E com a cache do ethers.

### ⛔ E repeti a lição do MC93-C sobre validações em paralelo

Lancei uma segunda ronda de mutação julgando a primeira morta — a saída estava
vazia por **tamponamento do Python**, não por fim de processo. As duas mutaram a
mesma árvore e o controlo negativo falhou com um mutante da outra aplicado.
**`wc -c` a zero não significa processo morto.** Confirmar com a lista de processos.

### ⛔ A 2.ª ronda: a mesma lição, nos sítios onde ela não tinha sido aplicada

| | defeito |
|---|---|
| ⛔ | `FeedbackLance` sem estado de sessão: dizia a um **anónimo** "Ainda não há lances seus", ao lado de três secções a convidar a entrar. **Estava na captura que eu tirei e olhei.** |
| ⛔ | A **janela do `authToken`** (~2 s): a página mandava entrar quem já tinha entrado **e** mostrava-lhe os lances dele ao mesmo tempo |
| ⛔ | "Sequência completa" era **código morto**: o backend nunca manda `faltam: 0` (domínio [1..5]), logo quem fechava 5 acertos lia "0 / 5 · Faltam 5 acertos" |
| ⚠️ | `inteiroSeguro` em 2 de 3 sítios; o 5.º estado em 1 de 2; `valorUtilizavel` mais frouxo que `inteiroSeguro` |
| ⚠️ | o condutor de hooks **engolia** escritas pós-desmonte → duas asserções minhas eram vácuas |
| ⚠️ | dicionário ≠ fallback, chave órfã com a frase proibida, e copy em **pt-PT** num app **pt-BR** |

**Regra nova:** "sem sessão" e "sessão sem token ainda" são estados **diferentes**.
Quem sabe se há sessão é o contexto (`isConnected` + `address`), não o hook que
precisa do token. A espera pelo token é **estar a carregar**.

**Regra nova:** o dicionário `pt` gera-se **a partir dos fallbacks**, e há uma
guarda (`src/i18n/__tests__/ativos-i18n.test.mjs`) que exige que continuem iguais —
porque os testes renderizam com o fallback, logo uma divergência faz a suíte medir
um texto e o utilizador ler outro.

⚠️ **Os testes do frontend NÃO são um portão de CI.** O `ci.yml` só corre os testes
das functions. "137 verdes" é medição, não protecção contínua.

### Não entregue, e porquê

`EvolucaoPontos`: medido via MCP — `pontuacoes` tem **0 linhas** e **0 ciclos
distintos** em produção. Não há série temporal para desenhar.

### Achado registado para o MC97 (copy)

A tela existente mostra **`R$ 1.00`** (`.toFixed(2)` sem troca de separador); as
secções novas mostram `R$ 1,00`. **Não corrigido** — HARD GATE 5 proíbe alterar o
existente neste MC.

### Pendências herdadas (nenhuma nasce aqui)

`.gitattributes`/CRLF · um modo de instalação só · `if: always()` no guarda da EVM ·
chave Alchemy por rotacionar (operador, R5) · versão do Foundry por fixar.

---

## MC94.1 — Dados da edição especial Air Fryer (2026-09-25)

**Data:** 2026-09-25 · **Origem:** MC94.1, medição por execução · **Recorrência:**
MÉDIA (próximas edições especiais usam o mesmo caminho) · **Impacto:** ALTO (sorteio
com prémio físico e hora anunciada).
**SEG-1: AJUSTAR** · **R19 exercida** · **Validador: APROVADO COM RESSALVAS**
**Logs:** `_logs/MC94.1_*` · **Relatório:** `_logs/MC94.1-RELATORIO.md` · **Spec:** `docs/TORNEIO-HABILIDADE.md` §4g

### O que existe agora

Blob `edicoes-metadata`, chave **`ESPECIAL-AIRFRYER`**: Air Fryer, `inicio_em
2026-10-04T23:00:00.000Z` (20:00 Brasília), `termino_em 2026-10-04T23:30:00.000Z`,
`tipo programado` (lance = 1 senha), `imagem_url /artes/edicao-especial-airfryer.jpg`.
Seed idempotente: `node scripts/mc941-seed-edicao-especial.mjs [--print|--force]`
(pelo login do CLI; nenhum token manuseado).

### ⛔ Premissas do enunciado que eram falsas

| enunciado | realidade medida |
|---|---|
| edição em Supabase ou mappings | vive em **Blobs** (`edicoes-metadata`); Supabase não tem tabela de edições |
| gravar `ESPECIAL-AIRFRYER` basta | o regex `^(PROG\|RELAMP)-\d+$` **descartava-a em silêncio** (listar, buscar, encerrar) |
| `/ranking` vazio antes da hora = gate | `/ranking` devolve `[]` para **qualquer** ciclo até à consolidação — é vacuidade, não gate |
| "a partir das 20:00 aparece no ranking" | aparece no **`/edicoes`**; no ranking só depois de `consolidar-lances` |
| `imagem_path` | o frontend já lê **`imagem_url`** (`useEdicoes.js:81`, MC45) |
| "Tipo: menor lance único" | `tipo` é o **meio de pagamento** (senha vs R$); a regra é a mesma para todas |

### ⛔ O servidor aceitava lances a qualquer hora, em qualquer edição

`lance-relampago.mjs` não verificava início, fim nem estado; o contrato também não.
Agora (`_lib/edicao-janela.mjs`, passo 5.6, decisão D2 do operador): **409** antes de
`inicio_em`, depois de `termino_em`, ou com `status` encerrado/apurado; **503
fail-closed** para `ESPECIAL-*` sem metadata (antes cairia em "relâmpago" e cobraria R$).

### Regra: estado derivado do relógio do servidor, não gravado

Uma edição com `inicio_em` no futuro sai de `edicoes` e vai para **`agendadas`**
(`GET /edicoes`), que o frontend actual não lê → invisível no ecrã sem tocar em `.jsx`.
Às 23:00Z passa sozinha. `GET /edicoes` devolve também **`agora`** (servidor) para o
cronómetro do MC94.3. Gravar "agendada" exigiria um cron — e um cron que falhe
fecha a edição no dia.

### ⚠️ Lição de método: teste com data fixa caduca

Dois testes meus comparavam com `Date.now()` real e a data do evento: ficariam
**vermelhos para sempre a partir de 04/10**. Apanhado pelo Validador (17/19 com o
relógio a 05/10). Regra: se o código lê o relógio real, o teste usa datas
**relativas**; datas literais só com o relógio injectado. Verificar correndo a
suíte com `Date.now` deslocado para depois da data.

### ⛔ Por decidir pelo operador ANTES de 04/10

1. A arte diz **"PERÍODO: 20/setembro a 04/outubro"** — contradiz 20:00–20:30.
2. `consolidar-lances` **pontua a especial no torneio** (sequências e bónus de 20 senhas).
3. A especial já é **pública pela API** (`agendadas`), embora não no ecrã.
4. Encerramento às 20:30 é **manual** (`POST /edicoes?acao=encerrar&id=ESPECIAL-AIRFRYER`).

### Decisões do operador (R18, 2026-09-25)

Data-alvo e fim (enunciado) · **D1** `tipo = programado` (1 senha por lance) ·
**D2** guarda de janela em `lance-relampago.mjs` autorizada neste MC.

---

## MC94.2 — Edição especial Air Fryer no Dashboard (2026-09-25)

**Data:** 2026-09-25 · **Origem:** MC94.2 · **Recorrência:** MÉDIA (próximas especiais
reutilizam o card) · **Impacto:** ALTO (UI pública + sorteio com prémio físico).
**SEG-1: SEGUIR** (R19: AppContext +2 linhas) · **Validador: APROVADO COM RESSALVAS**
**Logs:** `_logs/MC94.2_*` · **Relatório:** `_logs/MC94.2-RELATORIO.md` · **Spec:** §4h
**Capturas:** `_logs/MC94.2_captura-producao-{card,pagina}-{desktop,mobile}.png`

### O que existe

`src/components/edicao-especial/` — card com 4 estados (agendada · a_abrir · activa ·
encerrada), contagem na **hora do servidor** (`offset = agora − (t0+t1)/2`, por fetch),
painel do vencedor (on-chain `resultados(id)` + `lances-flash`). `consolidar-lances`
**não pontua** `ESPECIAL-*` (`pontua:false`).

### ⛔ "Dar lance" NÃO pode ir para o /mercado

O `/mercado` monta o `CardLance` com `EDICAO_ATIVA = "R-1"` **fixo** — um link levaria
o lance para a edição errada. O card monta o `CardLance` com o id da especial e
`tipoLeilao="programado"`, em `lazy` (o /mercado já é lazy; eager poria o form no
chunk do primeiro ecrã). Sem `handleLanceSucesso` (acrescentaria à tabela da R-1).

### ⚠️ Excepção declarada à fonte única do MC88.43

Com `EM_BREVE_MODE = true`, `getEstadoEdicao` diz "em breve" a tudo; a especial usa
`estadoEspecial()` própria. A R-1 ao lado continua "EM BREVE" — é o pedido.

### ⛔ Por decidir pelo operador

1. ~~**`POST /pontuacao` repontua a especial**~~ — ✅ **RESOLVIDO no MC94.3** (2026-09-25).
   A guarda passou para `registrarPontuacaoRodada` (`_lib/pontuacao-store.mjs`), o ponto
   único por onde passam os DOIS caminhos (`consolidar-lances` e `POST /pontuacao`).
   Ver a secção do MC94.3 abaixo.
2. A arte ("20/set a 04/out") agora é **pública** ao lado de "20:00–20:30".
3. Especial sem lance único → consolidar-lances dá 422 e o painel fica em
   "apuração em curso" para sempre.

### Lições de método (recorrência ALTA)

- **Um teste com ramo "ou isto ou aquilo" pode nunca executar a asserção que importa.**
  O teste do formulário aceitava "duplo OU fallback do Suspense" e, medido, corria
  SEMPRE o fallback. Correcção: re-renderizar depois de o `lazy` resolver e exigir.
- **Duplo de contexto com forma diferente do real parte em sítios longe do teste**
  (`useAppTimer` devolvia chaves que o real não tem → EdicaoCard partia).
- **Captura de ecrã depois de mexer no relógio mostra o offset velho** (≤ 60 s):
  recapturar num documento novo antes de concluir.
- **Um processo de mutação morto a meio deixa o mutante no disco.** Verificar os alvos
  com grep e `git diff --stat` antes de qualquer outra coisa.
- **Gate LGPD:** uma sessão de browser nova vê o regulamento, não o Dashboard —
  capturas automáticas têm de aceitar as 4 caixas + "Aceito o DesafioGUT".

### Decisões do operador (R18, 2026-09-25)
D1 arte mantém-se · D2 especial não pontua · D3 cronómetro usa `agendadas` ·
D4 encerrada = "Edição encerrada" + vencedor + métricas · D5 hora do servidor.

---

## MC94.3 / MC94.3.1 — Cronómetro, auto-fecho da especial e a guarda central (2026-09-25)

**Data:** 2026-09-25 · **Origem:** MC94.3 (backend, agente anterior) + MC94.3.1 (validação,
mutação, frontend e deploy, HERMES) · **Recorrência:** ALTA (a guarda e o cron servem
todas as especiais futuras) · **Impacto:** ALTO (impede que um sorteio de teste entre no
ranking do torneio; move dinheiro on-chain sem clique humano).
**SEG-1: SEGUIR com escopo ajustado** · **Validador: ver `_logs/MC94.3.1_SEG6_*`**
**Logs:** `_logs/MC94.3.1_SEG*` · **Relatório:** `_logs/MC94.3.1-RELATORIO.md`
**Commit:** `47cdc65` (+ commit de fecho) · **Deploy:** `netlify deploy --prod --build`

### O que existe (backend)

1. **Guarda central — `_lib/pontuacao-store.mjs`.** `registrarPontuacaoRodada(cicloId, lances)`
   devolve `{ cicloId, pontua:false, participantes:0, bonusRegistados:0 }` **antes de
   qualquer ligação ao Supabase** quando o ciclo casa `^ESPECIAL-[A-Z0-9]+$`. Está aqui e
   não nos chamadores porque o `POST /pontuacao` — o caminho de recuperação que o próprio
   `consolidar-lances` manda usar — não tinha guarda nenhuma (era o defeito do MC94.2).
2. **Núcleo partilhado — `_lib/consolidacao.mjs`.** O que move dinheiro on-chain
   (apuração off-chain, EIP-712 com `edicaoNonce`, envio via Flashbots, recibo, marcação)
   extraído do handler para ter DOIS chamadores sem duas cópias. **Não lê nenhum `Request`**:
   a autorização fica em quem chama. Devolve `{ status, corpo }` / `{ status, erro }`.
3. **Handler fino — `consolidar-lances.mjs`.** Preflight CORS, método, rede, `guardAdmin`,
   corpo. Contratos HTTP preservados: 405/409/400/503/422/502/202/200. Reexporta
   `apurarMenorUnico` (compat de `mc28-seguranca` e `mc33-load`).
4. **Cron — `scheduled-encerrar-especial.mjs`.** `schedule("* * * * *")`; por especial
   vencida (`agora > termino_em`, estritamente maior — a mesma fronteira de
   `edicao-janela.mjs`, que aceita lances no último milissegundo): encerra
   (`encerrarEdicao({origem:"scheduled"})`) e consolida **UMA vez**.

### ⛔ O cron NUNCA reenvia uma transacção (ITEM 4.2)

Um cron que repetisse a cada falha reenviaria 60× por hora. Por isso:

- o marcador (Blob `consolidacao-automatica`) é gravado **ANTES** da consolidação: se o
  Netlify matar a função aos ~30 s, o tick seguinte não repete;
- `202` (pendente), `502` (envio falhou), `200` e excepção são **finais** — o caminho
  automático acaba, o que falte faz-se à mão (`POST /consolidar-lances`);
- só as falhas de **antes do envio** (`409/422/503/400`) se repetem, no máximo
  `MAX_TENTATIVAS_ANTES_DO_ENVIO = 5`;
- `timeoutMinerMs = 20_000` na scheduled (o `90_000` do handler morreria a meio, DEPOIS de
  a transacção ter saído).

### Frontend (MC94.3.1)

- **Retenção de 24 h — `_estilo-especial.js`.** `RETENCAO_APOS_FIM_MS` + `dentroDaRetencao()`;
  `escolherEspecial` passou a filtrar. Sem isto, terminava em `?? lista.at(-1)` e uma
  especial encerrada era devolvida **para sempre** — o Dashboard ficava preso ao sorteio
  de 04/10 meses depois. A retenção é sobre o **fim**: antes de abrir também se mostra.
  Sem `termino_em` legível não se mostra (não se inventa janela).

### ✅ A especial preenche o SLOT (adendo do operador, reversão do MC94.2)

O MC94.3.1 parou no HARD GATE 8 porque a "absorção no slot" obrigava a reverter um teste
**commitado** do MC94.2 (`Dashboard.test.mjs:85` exigia a especial como secção própria) e a
decidir, sem as D originais, em que janela a especial substitui a R-1. Parou-se, mediu-se e
documentou-se — e o operador enviou o adendo com a autorização explícita ("esse teste foi um
erro do MC94.2"). Executado no mesmo MC (commit `0448216`):

- `Dashboard.jsx` — o slot "🎯 Edição Ativa" tem DOIS ramos: com especial é ela que o
  preenche; sem especial, o conteúdo da R-1 de sempre. A secção própria do MC94.2 saiu.
- `CardEdicaoEspecial.jsx` — deixou de ser `<section>` e passou a ser o CORPO do slot:
  caixa amarela com o `EdicaoBanner`, GUTO (o mesmo `GutoSpritePlayer`) com o cronómetro ao
  lado, e o formulário/painel por baixo.
- `EdicaoBanner.jsx` — prop `alt` OPCIONAL (aditiva). Evita que a chave
  `edicao.especial.altArte` ficasse órfã nos 3 dicionários: em vez de apagar uma tradução
  útil, o alt passa a dizer o que a imagem mostra.
- **96 px SÓ na especial** (R18); a R-1 fica a 52 px.
- `Dashboard.test.mjs` reescrito ao novo contrato (10 testes): inclui um que verifica que o
  antigo marcador `data-secao` **desapareceu** e outro que exige a especial **uma só vez**
  no ecrã. Mutação: o mutante "a especial não entra no slot" é morto por 7 de 10 testes.

⏳ Continua pendente apenas a **captura por CDP no dispositivo** (`webview-devtools.ps1`),
que exige um Android ligado.

### ⚠️ Achado prioritário para o MC94.4 — id com sufixo minúsculas escapa a TUDO

`EDICAO_ESPECIAL_RE` / `EDICAO_ID_RE` são `^ESPECIAL-[A-Z0-9]+$` (sensível à caixa).
Com um id como `ESPECIAL-airfryer`: a guarda central **não dispara** (a especial pontuaria
o torneio), o cron **nunca** a encerra nem consolida, a retenção de 24 h não se aplica, e
`listarEdicoes` **ignora a chave em silêncio** (`continue`) — a edição desaparece do
dashboard sem aviso. Fail-closed quanto a "não pontua", **fail-silent quanto ao auto-fecho**.
Hoje os ids nascem de `scripts/mc941-seed-edicao-especial.mjs` (constante em maiúsculas),
logo o risco é um id escrito à mão. **Correcção a fazer:** normalizar o id no ponto de
entrada (`.toUpperCase()`) **e** logar em vez de ignorar as chaves inválidas em
`listarEdicoes`, com um teste por efeito. Não se fez no MC94.3.1 porque o regex é
partilhado com a janela de lances e a mudança não era comprovadamente necessária (R1).

### Lições de método (recorrência ALTA)

- **A medição vem do resumo da ferramenta, não de uma linha filtrada.** O log do SEG6
  chegou a dizer "backend fail 0" a partir de um `grep` parcial; o número real era
  `606 pass / 1 fail` (um teste frágil a CRLF, provado não-regressão). Corrigido no mesmo
  log, à vista.
- **O briefing não é a fonte da verdade; o código é.** O MC94.3.1 pedia para subir
  `EdicaoBanner` para 96 px dentro do slot — mas o slot é um teste commitado que diz o
  contrário. Medir primeiro evitou reescrever um requisito sem saber porquê.
- **Contagens de teste do briefing ≠ contagens reais.** "34/34" saía 51 porque o glob
  `mc93b-*.test.mjs` apanha dois ficheiros que a suíte anterior já contava; `mc33-load.test.mjs`
  não existe (é `.mjs`). 0 falhas é o que importa; o número é cosmética.
- **Mutação antes de confiar num teste.** Os 4 mutantes foram mortos por testes nomeados —
  e o mutante do marcador matou exactamente o teste do marcador.
- **Duvidar de si mesmo antes de acusar o código.** Por pouco não se reportou um falso
  "buraco de cobertura" no caminho `202`: o grep inicial tinha lido o ficheiro errado.
  Voltar a medir custa um comando; um falso positivo custa credibilidade.
- **O working tree de outro agente é sagrado.** Nada de stash/reset/checkout; medir,
  validar, continuar.
- **Teste flaky sob paralelismo ≠ regressão.** `hooks-torneio.test.mjs` falha 1 em 28 sob
  carga (`demora: 20 ms` + asserção a `carregando`); isolado passa sempre. Fica registado
  para o MC94.4.

### Decisões do operador (R18, 2026-09-25 — as que fecharam o MC94.3)

E1 **"Encerrar e consolidar"** — a scheduled encerra E consolida (gasta gas da coordenação;
autorizado). · E2 **"Maior só na especial"** — o ícone de presente a ~96 px só na especial
(pendente em MC94.3.2). · E3 **"24 h após o fim"** — a especial fica no slot 24 h depois do
fim (implementado e testado neste MC).
