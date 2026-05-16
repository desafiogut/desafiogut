# Auditoria Externa — Preparação e Escopo

> Mega Comando 7 / Item 3. Atualizado em 2026-05-16.
> Documento preparatório. **NÃO** contrata firma. Define o caminho para quando o produto sair do beta.

Após MC1-MC7, o DesafioGUT cobre defesa em profundidade: APIs hardened, contrato fuzzed/coberto por testes, CI com Slither + SBOM, WAF/Backups/DR/IR. O próximo passo lógico antes de habilitar transações reais (PIX BRL > beta) é uma auditoria externa profissional do contrato e da infra.

Este doc lista as firmas recomendadas, o escopo sugerido, faixa de orçamento e checklist pré-auditoria.

---

## 1. Firmas recomendadas

Em ordem de afinidade com o stack (Solidity 0.8 + Hardhat + Node Functions + Privy):

### 1.1 OpenZeppelin (recomendada como primeira opção)

- **Site**: `https://www.openzeppelin.com/security-audits`
- **Pontos fortes**: maintainers do framework Solidity mais usado do mundo, padrão de qualidade muito alto, relatórios são referência da indústria. Foco em contratos.
- **Pontos fracos**: caro para o estágio do projeto; fila de espera tipicamente 6-12 semanas.
- **Foco do escopo**: `contracts/Leilao.sol` (LeilaoGUT) — auditoria padrão Solidity.
- **Orçamento típico**: US$ 50k-150k para contrato de complexidade média.
- **Prazo típico**: 3-6 semanas de engajamento + 1-2 semanas de fixes/re-audit.

### 1.2 Trail of Bits (segunda opção)

- **Site**: `https://www.trailofbits.com/audits`
- **Pontos fortes**: forte em fuzzing (são criadores do Echidna que usamos no MC4/MC5), excelente cobertura cross-stack (contrato + off-chain).
- **Pontos fracos**: também caro; melhor para projetos com componentes off-chain críticos (que é o caso do DesafioGUT — Netlify Functions).
- **Foco do escopo**: contrato + Netlify Functions (`comprar-senhas`, `lance-relampago`, `webhook-mercadopago`, admin endpoints) + RBAC.
- **Orçamento típico**: US$ 60k-200k.
- **Prazo típico**: 4-8 semanas.

### 1.3 Cantina (alternativa moderna, fixed-price)

- **Site**: `https://cantina.xyz`
- **Pontos fortes**: marketplace de auditores reputados, preços fixos por scope, prazos previsíveis (2-4 semanas), feedback rápido.
- **Pontos fracos**: menos profundidade que OpenZeppelin/Trail of Bits, mas suficiente para projetos beta.
- **Foco do escopo**: contrato + funções críticas.
- **Orçamento típico**: US$ 25k-60k.
- **Prazo típico**: 2-4 semanas.

### 1.4 Code4rena (competition-style)

- **Site**: `https://code4rena.com`
- **Pontos fortes**: dezenas de auditores indo a fundo simultaneamente; ótimo para encontrar issues que 1 firma sozinha pode passar; relatório público após contest (boost reputacional).
- **Pontos fracos**: tudo público (não para projeto pré-launch confidencial); auditores variam em qualidade individual; aceitar relatório requer triagem interna.
- **Foco do escopo**: contrato apenas (Code4rena não cobre off-chain bem).
- **Orçamento típico**: US$ 30k-100k (prize pool).
- **Prazo típico**: 1-2 semanas de contest + 2 semanas de triagem.

---

## 2. Escopo recomendado (3 ondas)

### Onda 1 — Contrato Solidity (prioritária)

**Escopo:**
- `contracts/Leilao.sol` (LeilaoGUT) — 100% do contrato
- Invariantes documentadas em `tests/fuzzing/LeilaoGUT.sol` (MC4) como base
- Testes Foundry em `tests/foundry/LeilaoGUT.t.sol` (MC4) como prova de cobertura

**Firma sugerida**: OpenZeppelin (gold standard) ou Cantina (relação custo/benefício).

**Entregáveis esperados:**
- Relatório com severidade por finding (Critical/High/Medium/Low/Info)
- Fixes propostos para Critical/High
- Re-audit após fix (incluso em quase todos os engagements)

### Onda 2 — Off-chain (Netlify Functions + RBAC)

**Escopo:**
- `desafio-gut/frontend/netlify/functions/_lib/` — todas as utilities (admin-auth, jwt, rbac, validate, rate-limiter, require-mfa)
- Endpoints críticos: `comprar-senhas.mjs`, `lance-relampago.mjs`, `webhook-mercadopago.mjs`, `admin-aprovacao.mjs`, `wallet.mjs`, `voucher.mjs`, `auth-admin.mjs`, `auth-user.mjs`
- Política LGPD: `docs/lgpd-politica-retencao.md` + `purge-logs.mjs` + `consent-log` Blob

**Firma sugerida**: Trail of Bits (forte em off-chain) ou hire boutique especializado em Node + JWT (Doyensec, Cure53).

**Entregáveis esperados:**
- Relatório com vulnerabilidades por categoria (Auth, IDOR, Injection, Crypto, Privacy)
- Compliance check vs OWASP API Top 10 e LGPD
- Sugestões de hardening além do MC1

### Onda 3 — Infraestrutura

**Escopo:**
- Configuração Netlify (deploy hooks, env vars, CSP em `netlify.toml`)
- Cloudflare WAF (3 regras do `apply-waf.mjs`)
- GitHub Actions workflows (`security-scan.yml`, `contract-security.yml`)
- Privy integration (App Secret no env, MFA enforcement em `docs/mfa-setup.md`)

**Firma sugerida**: combine com Onda 2 se firma o cobre; senão, audit interno via checklist da CIS.

**Entregáveis esperados:**
- Audit trail review (acesso a Dashboard providers)
- Risk assessment de SPOFs (single provider dependencies)

---

## 3. Orçamento total estimado

Faixa para auditoria completa (3 ondas):

| Cenário | Onda 1 | Onda 2 | Onda 3 | Total |
|---|---|---|---|---|
| **Econômico** (Cantina + bug bounty Code4rena onda 1, audit interno ondas 2-3) | US$ 25k | US$ 0 (interno) | US$ 0 (interno) | **US$ 25k** |
| **Recomendado** (Cantina onda 1 + Trail of Bits onda 2 + interno onda 3) | US$ 30k | US$ 60k | US$ 0 | **US$ 90k** |
| **Gold standard** (OpenZeppelin onda 1+2 combinadas + audit infra externo) | US$ 100k | (incluído) | US$ 25k | **US$ 125k-150k** |

Recomendação para DesafioGUT em estágio beta: **cenário Econômico ou Recomendado**. Gold standard é desproporcional antes de validar product-market fit.

---

## 4. Checklist pré-auditoria

Cumprir **antes** de contratar firma — reduz custo e tempo (auditor não fica caçando o óbvio).

### 4.1 Documentação

- [ ] **README do contrato** — explica modelo de leilão, papéis (coordenação/cliente/user), eventos emitidos
- [ ] **Especificação refatorada** (`ESPECIFICACAO-TECNICA-DEFINITIVA.md`) atualizada
- [ ] **Diagrama de arquitetura** (texto ou imagem) mostrando fluxo: frontend → Privy → Netlify Functions → contrato Sepolia
- [ ] **Threat model** explicitando atacantes considerados (user malicioso, admin comprometido, validador hostil)

### 4.2 Cobertura de testes

- [ ] **Foundry tests** (MC4) — ≥ 16 testes, cobrindo cada função pública do contrato
- [ ] **Echidna invariants** (MC4) — ≥ 6 invariantes documentadas
- [ ] **Cobertura ≥ 90%** medida via `forge coverage` ou similar
- [ ] **CI verde** nos últimos 30 dias — `Contract Security` workflow (MC5) sem flakes

### 4.3 Análise estática

- [ ] **Slither limpo** — `fail_on: high` no `slither.config.json` (MC4); zero findings High/Medium não documentados
- [ ] **SBOM atualizado** — última geração em `docs/sbom/sbom-YYYYMMDD.json` (MC5)
- [ ] **Dependabot** sem PRs pendentes high-severity (MC2)

### 4.4 Estado do código

- [ ] Sem `TODO:` ou `FIXME:` em código crítico
- [ ] Sem console.log esquecidos em produção
- [ ] Variáveis de ambiente listadas em README (sem valores)
- [ ] Branch `main` representa fielmente o estado de produção

### 4.5 Postura de segurança operacional

- [ ] **WAF ativo** — `scripts/apply-waf.mjs` (MC6) rodado em prod
- [ ] **Backups Blobs** rodando — verificar último `backup:YYYY-MM-DD` (MC6)
- [ ] **DR plan testado** — pelo menos 1 teste em `docs/dr-test-log.md` (MC6)
- [ ] **IR plan testado** — pelo menos 1 simulação em `docs/ir-test-log.md` (MC7)
- [ ] **MFA enrollado** para todos os admins ativos (`docs/mfa-setup.md`)

### 4.6 Compliance LGPD

- [ ] **Política de retenção** ativa (`docs/lgpd-politica-retencao.md` + `purge-logs.mjs`)
- [ ] **Consent log** funcional (`consent-log` Blob preenchido)
- [ ] **DPO designado** ou processo claro para responder a solicitações de titular

---

## 5. Roadmap sugerido

| Quando | Ação |
|---|---|
| **2026-Q3** | Completar checklist pré-auditoria (Seção 4). Estimativa: 4-6 semanas após MC7 |
| **2026-Q4** | Solicitar orçamentos das 4 firmas (OpenZeppelin, Trail of Bits, Cantina, Code4rena). Comparar |
| **2027-Q1** | Contratar Onda 1 (contrato). Engagement 4-8 semanas |
| **2027-Q2** | Aplicar fixes da Onda 1. Re-audit |
| **2027-Q2** | Após Onda 1 limpa, iniciar Onda 2 (off-chain) |
| **2027-Q3** | Audit completo + publicar relatórios públicos em `docs/audits/<firma>-<data>.pdf` |

Após auditoria completa: **prosseguir com migração para mainnet** (de Sepolia para Polygon ou Ethereum L1) — fora do escopo deste doc.

---

## 6. Bug bounty programa (opcional, complementar)

Independente da auditoria contratada, considerar abrir bug bounty via **Immunefi** (`https://immunefi.com`) com:

- **Critical**: até US$ 50k (loss of funds, governance takeover)
- **High**: até US$ 10k (RBAC bypass, IDOR)
- **Medium**: até US$ 2k (DoS, info disclosure)
- **Low**: até US$ 500 (config issues, hardening)

Pago apenas por vulnerabilidades **reproduzíveis** e **previamente desconhecidas**. Não substitui auditoria — é defesa contínua após.

---

## 7. Como armazenar relatórios

Após cada auditoria recebida:

1. Salvar PDF em `docs/audits/<firma>-<YYYY-MM>.pdf` (commitar).
2. Criar issue para cada finding Critical/High, com label `audit:<firma>`.
3. Quando finding for resolvido, fechar issue referenciando o commit do fix.
4. Atualizar `docs/validacao-final.md` com o estado pós-auditoria.

Transparência: considerar publicar relatórios (após fixes) no README do projeto — boa prática de Web3.
