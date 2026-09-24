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

1. ⛔ **Ligar os testes de NÍVEL 2 em CI** — o `ci.yml` não define
   `SUPABASE_CONTRATO_URL/KEY`, logo os únicos testes que exercem a migração
   ficam saltados. Maior efeito, menor custo.
2. ⛔ **O fork on-chain**, que é possível e não está feito.
3. Antes de activar a emissão: aplicar a migração em produção e reativar a R2.
