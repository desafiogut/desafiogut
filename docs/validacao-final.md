# Validação Final — Estado vs Especificação Refatorada

## Mega Comando 6 — Cloudflare WAF Automatizado + Backup Blobs + DR (2026-05-16)

Última camada operacional: automatiza o WAF (antes era playbook manual MC4), adiciona backup diário dos Blobs (cobertura para corrupção/purge acidental), e fecha com playbook de Disaster Recovery cobrindo 4 cenários. Sem ambiente standby físico (desproporcional para beta).

### Item 1 — Cloudflare WAF Automatizado

- `scripts/apply-waf.mjs` — Node ESM puro, sem deps, usa `fetch` nativo. Idempotente: GET ruleset por nome → PUT se existe, POST se não.
  - **Regra 1**: rate-limit `phase=http_ratelimit`, 50 req/min/IP, action=block, mitigation_timeout 600s
  - **Regra 2**: OWASP CRS managed, ID `4814384a9e5d4951ca4e3d97527332ec` (oficial Cloudflare — corrige typo do doc MC4), paranoia-level-1 only
  - **Regra 3**: bot challenge action=`managed_challenge`, expression `cf.threat_score gt 30` (Free plan — divergência consciente da spec original que usava `cf.bot_management.score < 30` Pro+)
- Variáveis: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`
- `docs/cloudflare-waf-execucao.md` — pré-requisitos (token + escopos), execução, verificação pós (cf-ray, lista de rulesets, smoke tests), rollback manual

```
$ grep -c "rulesets" scripts/apply-waf.mjs
10   (≥ 3 ✅)
```

### Item 2 — Backup de Blobs Netlify

- `desafio-gut/frontend/netlify/functions/backup-blobs.mjs` — segue padrão `purge-logs.mjs`:
  - `executar()` exportada (chamada pelo cron) + `default` handler HTTP admin-gated
  - Stores cobertos: 8 críticos (`audit`, `audit-admin`, `lance-idem`, `pedidos`, `webhook-mp`, `consent-log`, `admin-refresh`, `fingerprint`)
  - Stores excluídos: `rate-limit`, `jwt-fail-counter` (ephemeral, baixo valor); `backups` (evita recursão); `purge-logs-meta`
  - Dump no Blob store `backups` com chave `backup:YYYY-MM-DD`
  - GC automático: retenção 30 dias
  - HTTP: GET lista backups disponíveis, POST executa
- `desafio-gut/frontend/netlify/functions/backup-blobs-scheduled.mjs` — cron wrapper `schedule("0 2 * * *", ...)` — 02:00 UTC = 23:00 BRT do dia anterior, 1h antes do `purge-logs`
- `docs/backup-blobs.md` — operação manual, restauração via Netlify CLI, Fase 2 (S3) documentada mas não implementada, verificação periódica mensal

```
$ grep -c "store\|backup\|Blob" desafio-gut/frontend/netlify/functions/backup-blobs.mjs
39   (≥ 5 ✅)
```

### Item 3 — Disaster Recovery Playbook

- `docs/disaster-recovery.md` — 7 seções: 4 cenários + RTO/RPO + ativação + checklist por cenário + contatos + testes trimestrais + anti-padrões.
  - **Cenário A** (Blobs): RTO 2h / RPO 24h — restaurar do backup diário
  - **Cenário B** (Netlify outage): RTO 4h / RPO 0 — failover para Cloudflare Pages (read-only, sem Functions)
  - **Cenário C** (Alchemy down): RTO 1h / RPO 0 — swap `VITE_ALCHEMY_URL` para publicnode (já no CSP)
  - **Cenário D** (Privy comprometido): RTO 24h / RPO 0 — rotação App Secret + força logout
- Contatos: Netlify Support, Alchemy Support, Privy Support, Cloudflare, GitHub (+ status pages)
- Testes DR trimestrais com log em `docs/dr-test-log.md` (criar no 1º teste)

```
$ grep -c "RTO\|RPO\|cenário\|restauração" docs/disaster-recovery.md
26   (≥ 8 ✅)
```

### Validação cruzada

```
$ Test-Path scripts/apply-waf.mjs                                                          → True
$ Test-Path docs/cloudflare-waf-execucao.md                                                 → True
$ Test-Path desafio-gut/frontend/netlify/functions/backup-blobs.mjs                         → True
$ Test-Path desafio-gut/frontend/netlify/functions/backup-blobs-scheduled.mjs               → True
$ Test-Path docs/backup-blobs.md                                                            → True
$ Test-Path docs/disaster-recovery.md                                                       → True

$ node --check scripts/apply-waf.mjs                                                        → OK
$ node --check desafio-gut/frontend/netlify/functions/backup-blobs.mjs                      → OK
$ node --check desafio-gut/frontend/netlify/functions/backup-blobs-scheduled.mjs            → OK

$ cd desafio-gut/frontend && npm run build
✓ built in 7.85s  (warnings pré-existentes do projeto, não MC6)
```

---

## Mega Comando 5 — Foundry CI + Echidna CI + SBOM (2026-05-16)

Move Foundry e Echidna para o CI (antes só locais — MC4) e adiciona SBOM CycloneDX formal versionado. Slither continua em `security-scan.yml` (MC4). Tudo em um único workflow novo: `.github/workflows/contract-security.yml`, 3 jobs paralelos, paths-filter `desafio-gut/**`.

### Item 1 — Foundry no CI

- Job `foundry-test` em `.github/workflows/contract-security.yml`:
  - `runs-on: ubuntu-latest`, `working-directory: ./desafio-gut`
  - `foundry-rs/foundry-toolchain@v1` instala forge
  - `forge install foundry-rs/forge-std --no-commit` resolve dep do `tests/foundry/LeilaoGUT.t.sol` (forge-std não é commitado)
  - `forge test -vv` roda os 16 testes existentes
- Trigger: push/pull_request em `main`, paths `desafio-gut/**`

```
$ grep -c -i "foundry" .github/workflows/contract-security.yml
10   (≥ 3 ✅)
```

### Item 2 — Echidna no CI

- Job `echidna-fuzz` no mesmo workflow:
  - `crytic/echidna-action@v1` com `files: .`, `contract: LeilaoGUTFuzzing`, `config: echidna.yaml`
  - **`solc-version: 0.8.20`** — alinhado com `hardhat.config.js`, `foundry.toml` e bytecode deployado na Sepolia (spec original sugeria 0.8.28 mas projeto trava em 0.8.20)
  - `timeout-minutes: 35` cobre os 50000 iterations do `echidna.yaml` com margem sobre os 30 min
- `crytic-args: --solc-disable-warnings` para output limpo

```
$ grep -c -i "echidna" .github/workflows/contract-security.yml
7   (≥ 3 ✅)
```

### Item 3 — SBOM CycloneDX

- Job `sbom-generate` no mesmo workflow:
  - `anchore/sbom-action@v0` gera `sbom.cyclonedx.json` do `./desafio-gut`
  - `upload-artifact: true` + `artifact-name: sbom-cyclonedx` permite download de qualquer build (PRs e push)
  - Step de auto-commit roda apenas em `github.event_name == 'push' && github.ref == 'refs/heads/main'`:
    - cria `docs/sbom/sbom-YYYYMMDD.json`
    - committer `github-actions[bot]`
    - mensagem inclui `[skip ci]` (defesa em profundidade contra loop; GITHUB_TOKEN padrão já não re-triggers)
    - `git diff --staged --quiet` previne commit vazio em runs idempotentes do mesmo dia
- `docs/sbom/.gitkeep` criado para garantir que o diretório existe no primeiro run

```
$ grep -c -i "sbom" .github/workflows/contract-security.yml
16   (≥ 3 ✅)
```

### Validação cruzada

```
$ grep -E "^  [a-z][a-z-]+:$" .github/workflows/contract-security.yml | grep -v "push\|run"
22:  foundry-test:
44:  echidna-fuzz:
66:  sbom-generate:
   (3 jobs ✅)

$ cd desafio-gut && npx hardhat compile --force
Compiled 1 Solidity file with solc 0.8.20 (evm target: shanghai)
   (baseline verde ✅ — MC5 não toca em .sol)
```

### Permissions e Branch Protection

Para o auto-commit do SBOM funcionar, o workflow declara `permissions: contents: write` no nível do arquivo (apenas `sbom-generate` realmente usa). Os outros 2 jobs só leem.

Quando habilitar branch protection para os novos checks no GitHub Settings → Branches:

- `contract-security / foundry`
- `contract-security / echidna`
- `contract-security / sbom`

---

## Mega Comando 4 — Análise Estática + Fuzzing + WAF (2026-05-15)

Última onda de blindagem. Foca no contrato (Slither/Foundry/Echidna) e no edge (Cloudflare WAF doc).

### Item 1 — Echidna fuzzing (LOCAL)

- `desafio-gut/tests/fuzzing/LeilaoGUT.sol` — harness `LeilaoGUTFuzzing` que herda `LeilaoGUT`, pré-abre edição `R-FUZZ` e pré-credita 1000 senhas em 3 wallets do pool de senders.
- 6 invariants Echidna ancorados no contrato real:
  1. `echidna_coordenacao_nao_zero()` — sanity.
  2. `echidna_listaDeValores_limitada()` — `length <= MAX_LANCES_UNICOS` (10_000).
  3. `echidna_unicidade_para_ganhar()` — `apurarVencedor` só elege quando `contagem[v] == 1`.
  4. `echidna_lance_consome_senha()` — conservação total via shadow accounting.
  5. `echidna_apenas_coordenacao_credita()` — bots não-coord falham `adicionarSenhas`.
  6. `echidna_two_step_transfer()` — coord só muda via `aceitar()`.
- `desafio-gut/echidna.yaml` — testLimit 50000, seqLen 100, workers 4, deployer/sender pool configurados.

```
$ grep -c "function echidna_" desafio-gut/tests/fuzzing/LeilaoGUT.sol
6
$ grep "testLimit\|seqLen\|workers" desafio-gut/echidna.yaml
testLimit: 50000
seqLen: 100
workers: 4
```

Comando local:
```
docker run --rm -v $(pwd):/code ghcr.io/crytic/echidna/echidna:latest \
  echidna /code/desafio-gut/tests/fuzzing/LeilaoGUT.sol \
  --contract LeilaoGUTFuzzing --config /code/desafio-gut/echidna.yaml
```

### Item 2 — Foundry test suite (LOCAL)

- `desafio-gut/tests/foundry/LeilaoGUT.t.sol` — 16 testes (briefing pedia ≥12):
  - 3× acesso (reuso de id, apenasCoord abre, apenasCoord credita)
  - 4× gates de `darLance` (sem saldo, prazo expirado, valor 0, valor 1)
  - 3× `apurarVencedor` (menor único, vazio, todos repetidos)
  - 1× limite anti-DoS (10_000 lances únicos)
  - 5× two-step transfer (happy path, sem aceitar, aceitar sem iniciar, aceitar por outro, iniciar com zero)
- `desafio-gut/foundry.toml` — src=contracts, test=tests/foundry, solc 0.8.20, optimizer 200.
- `.gitignore` atualizado: `out/`, `cache_forge/`, `lib/`, `tests/fuzzing/corpus/`, `crytic-export/`.

```
$ grep -c "function test_" desafio-gut/tests/foundry/LeilaoGUT.t.sol
16
$ cat desafio-gut/foundry.toml | grep -E "src|test|solc"
src         = "contracts"
test        = "tests/foundry"
solc        = "0.8.20"
```

Comando local:
```
cd desafio-gut
forge install foundry-rs/forge-std --no-git --no-commit
forge test -vv
```

### Item 3 — Slither no CI

- `desafio-gut/slither.config.json` — `fail_on: high`, `exclude_dependencies: true`, `filter_paths` cobre node_modules + tests + lib.
- Job `slither-scan` em `.github/workflows/security-scan.yml`:
  - Python 3.11 + Node 24
  - `pip install slither-analyzer`
  - `npm ci` no diretório `desafio-gut/`
  - Run Slither com auto-detect; fallback para `slither contracts/Leilao.sol` direto se o auto-detect tropeçar no Hardhat v3 ESM.
- Independente dos jobs MC2 (axios/hono pre-existentes) — não fica bloqueado por checks vermelhos não relacionados.

```
$ ls desafio-gut/slither.config.json
desafio-gut/slither.config.json
$ grep -c "slither\|Slither" .github/workflows/security-scan.yml
13
$ grep "fail_on" desafio-gut/slither.config.json
  "fail_on": "high",
```

### Item 4 — Cloudflare WAF (docs)

- `docs/cloudflare-waf-setup.md` — 10 seções + checklist final cobrindo:
  - Pré-requisitos (token API, scopes)
  - Onboarding (zona, nameservers, CNAME proxied, SSL Full Strict, Netlify accept domain)
  - 3 cURLs API prontos:
    - **Regra 1**: rate-limit `requests_per_period:50, period:60, mitigation_timeout:600, characteristics:["ip.src"]`
    - **Regra 2**: OWASP Core Ruleset (`efb7b8c949ac4650a09736fc376e9aee`) paranoia 1, action block
    - **Regra 3**: JS Challenge para `cf.bot_management.score lt 30` (Free fallback: `cf.threat_score gt 30`), excluindo `/.netlify/functions/health`
  - Verificação pós-setup (4 testes: `cf-ray`, flood 429, XSS 403, bot 403)
  - Limitações (Free 5 regras max, bot management precisa Pro+, JS challenge bloqueia REST sem JS)
  - Rollback (DELETE + esvaziamento do managed entrypoint)
  - Observabilidade (Dashboard Security + Notifications WAF Spike + Logpush)

```
$ ls docs/cloudflare-waf-setup.md
docs/cloudflare-waf-setup.md
$ grep -c "^## " docs/cloudflare-waf-setup.md
11
$ grep -c "curl -sS" docs/cloudflare-waf-setup.md
5
```

⚠️ Sem credenciais Cloudflare nem domínio próprio nesta sessão, MC4 entrega só docs/playbook. Quando o domínio estiver pronto, executar passos 1–9 da checklist (Seção 10 do doc).

### Build verde

```
$ cd desafio-gut && npx hardhat compile
Compiled 1 Solidity file with solc 0.8.20 (evm target: shanghai)
```

### Decisões corretivas vs briefing (já documentadas via /AskUserQuestion)

| Briefing | Realidade | Decisão |
|---|---|---|
| 6 invariants citados (resetEdicao, voucher etc.) | `resetEdicao` não existe; voucher é off-chain; `senhaNuncaDuplica` contradiz menor único; `totalCreditos` exigiria accumulator | 6 invariants ancorados no contrato real |
| Echidna+Foundry no CI | Binários pesados (echidna docker, foundryup) | Só Slither no CI; Echidna+Foundry local com comandos doc |
| Cloudflare WAF setup completo | Sem domínio nem token nesta sessão | Docs + cURLs prontos pra colar |
| `git push origin main` direto | Branch protection bloqueia (MC2) | Branch + PR + janela de bypass admin curta (padrão MC3) |

### Resumo geral dos 4 MCs

| Camada | Mega Comando |
|---|---|
| Aplicação — rate-limit + JWT + RBAC + anti-IDOR | MC1 |
| Supply chain — Dependabot + audit + lockfile + Socket | MC2 |
| Detecção — Sentry + LGPD + FingerprintJS + monitor on-chain | MC3 |
| Contrato + Edge — Slither (CI) + Foundry/Echidna (local) + Cloudflare WAF (docs) | MC4 |

---

## Mega Comando 3 — Detecção + Compliance + Sybil + On-chain (2026-05-15)

Evidências brutas dos 4 itens (grep + ls + npm run build).

### Item 1 — Alertas automáticos Sentry

- `src/lib/sentry-alerts.js` — 4 helpers client-side (`checkRateLimit`, `checkJwtFailures`, `checkBurstCompras`, `checkGeoAnomaly`).
- `netlify/functions/_lib/sentry-server.mjs` — wrapper `@sentry/node` com `captureSecurityAlert(kind, payload)` + flush em Lambda.
- `netlify/functions/_lib/jwt-fail-counter.mjs` — contador persistente em Blob `jwt-fail-counter:{ip}:{minuto}` (cobre o problema de Lambdas ephemeral). Alerta ao cruzar 5 falhas/min.
- Integração em `auth-user.mjs`, `auth-admin.mjs` (login + refresh), `exportar-dados.mjs`, `rate-limiter.mjs` (>50/min vira alerta), `AppContext.jsx` (401/429 + burst de lances + tz proxy).

```
$ grep -rn "captureSecurityAlert\|registrarFalhaJwt" netlify/functions/ | wc -l
13
$ grep -n "from \"../lib/sentry-alerts.js\"\|checkBurstCompras\|checkGeoAnomaly\|checkJwtFailures\|checkRateLimit" src/context/AppContext.jsx
11..15  (imports)
336     checkJwtFailures("saldo-rs");
344     checkRateLimit("saldo-rs", count, null);
459     checkBurstCompras(addr);
460     checkGeoAnomaly();
$ grep "@sentry/node" netlify/functions/package.json
    "@sentry/node": "^9.0.0",
```

### Item 2 — Compliance LGPD

- `docs/lgpd-politica-retencao.md` — política formal de retenção (13m audit, 10a contábil, 30d sessão, 5a consentimento, 24h fingerprint).
- `netlify/functions/purge-logs.mjs` — admin-gated, idempotente, GET dryRun + POST.
- `netlify/functions/exportar-dados.mjs` — endpoint art. 18 LGPD, autorização via `validarOwnerOuAdmin` (MC1) + JWT user-session.
- `consent-log:{timestamp}:{endereco}` gravado em `comprar-senhas.mjs` (linha 236), termo versão `v2026-05`, inclui IP + UA.

```
$ ls -la docs/lgpd-politica-retencao.md netlify/functions/exportar-dados.mjs netlify/functions/purge-logs.mjs
docs/lgpd-politica-retencao.md            (4753 bytes)
netlify/functions/exportar-dados.mjs      (5143 bytes)
netlify/functions/purge-logs.mjs          (5428 bytes)
$ grep -n "consent-log\|TERMO_VERSAO\|gravarConsentLog" netlify/functions/comprar-senhas.mjs
35:const TERMO_VERSAO = "v2026-05";
36:const BLOB_CONSENT = "consent-log";
54:async function gravarConsentLog(req, endereco) { … }
236:  await gravarConsentLog(req, endereco);
```

### Item 3 — FingerprintJS anti-Sybil

- `@fingerprintjs/fingerprintjs ^4.6.0` instalado via npm (CDN jsdelivr é bloqueado pela CSP em `netlify.toml:58`).
- `src/lib/fingerprint.js` — `getVisitorId()` (async) + `getCachedVisitorId()` (sync para headers); cache em `localStorage.gut_visitor_id`.
- `netlify/functions/_lib/sybil-check.mjs` — `registerVisitor` + `checkSybil` + `registerAndCheck` (limiar 3 addresses/24h → `sybil_suspect` Sentry alert).
- `AppContext.jsx` — useEffect carrega visitor no mount; X-Visitor-ID anexado em fetches de `auth-user` e `saldo-rs`.
- `auth-user.mjs` lê o header e chama `registerAndCheck` após sessão emitida (passive monitoring, não bloqueia).

```
$ grep "fingerprintjs" frontend/package.json
    "@fingerprintjs/fingerprintjs": "^4.6.0",
$ grep -n "X-Visitor-ID" src/context/AppContext.jsx
307     ...(visitorId ? { "X-Visitor-ID": visitorId } : {}),
348     ...(visitorId ? { "X-Visitor-ID": visitorId } : {}),
$ grep -n "registerAndCheck\|x-visitor-id" netlify/functions/auth-user.mjs
21      import { registerAndCheck } from "./_lib/sybil-check.mjs";
95      const visitorId = req.headers.get("x-visitor-id");
97        await registerAndCheck(visitorId, endereco, "auth-user")
```

### Item 4 — Monitor on-chain

- ABI estendido em `netlify/functions/_lib/contract.mjs`: adicionado evento `LanceDado(string,address,uint256,bool,uint256)` (não havia no MC2; era só ABI de crédito).
- `_lib/contract.mjs` exporta `getLanceDadoEvents(fromBlock, toBlock)` + `getBlocoAtual()`.
- `netlify/functions/monitor-onchain.mjs` — endpoint admin-gated, idempotente via `ultimo-bloco-processado:R-1`. Alertas:
  - `onchain_burst`: >5 lances do mesmo `lancador` na janela (≈30 min).
  - `onchain_outlier`: valor a >3σ da média histórica (Welford online em `onchain-stats:R-1`); só dispara após 20 amostras.

```
$ grep -n "LanceDado\|getLanceDadoEvents" netlify/functions/_lib/contract.mjs
23:  "event LanceDado(string idEdicao, address indexed lancador, uint256 valorEmCentavos, bool repetido, uint256 timestamp)",
107: export async function getLanceDadoEvents(fromBlock, toBlock = "latest") { … }
$ ls -la netlify/functions/monitor-onchain.mjs
netlify/functions/monitor-onchain.mjs    (8061 bytes)
```

### Build verde

```
$ npm install --legacy-peer-deps                                  → added 1, removed 3, audited 750 packages in 6s
$ npm install --prefix netlify/functions --legacy-peer-deps        → added 76, audited 88 packages in 11s
$ npm run build                                                    → ✓ built in 5.36s
```

### Decisões corretivas vs briefing (já documentadas via /AskUserQuestion)

| Briefing | Realidade | Decisão |
|---|---|---|
| FingerprintJS via CDN jsdelivr | CSP de MC1 não permite | npm install local |
| `purge-logs.mjs` já existe | só `purge-lances.mjs` | criado novo, separado |
| Sentry só client-side | rate-limit/JWT são server-side | `@sentry/node` em functions |
| Evento `LanceEfetuado` | contrato emite `LanceDado` | usado o nome real |

### Scheduled functions (Netlify) — adendo pós-merge inicial

- `netlify/functions/monitor-onchain-scheduled.mjs` — cron `*/30 * * * *` chamando `executar()` (named export do monitor-onchain).
- `netlify/functions/purge-logs-scheduled.mjs` — cron `0 3 * * *` chamando `executar(false)` (named export do purge-logs).
- `monitor-onchain.mjs` e `purge-logs.mjs` ganharam o `export` na função `executar` (para o wrapper chamar core sem precisar de Request/admin gate; cron é trigger confiável).
- `@netlify/functions ^3.0.0` adicionado em `netlify/functions/package.json`.

### npm audit — vulns pré-existentes (não causadas pelo MC3)

`npm audit --audit-level=high` falha em axios@1.15.0 (via `@coinbase/cdp-sdk` ← Privy/Wagmi) e hono@4.12.14 (via `@wagmi/connectors/porto`). **Estas versões já estavam em `main` (commit 346af25) antes do MC3** — confirmado por `git show origin/main:.../package-lock.json | grep '1.15.0'`. Advisories foram publicadas após o CI verde do MC2. Unblock requer ação fora do escopo do MC3:

1. **Recomendado**: aguardar Privy/Wagmi liberar versão com axios ≥1.17.
2. **Alternativo**: relaxar `npm audit --audit-level=critical` no `.github/workflows/security-scan.yml` (não recomendado — perde detecção de high).
3. **Hack**: adicionar overrides manuais e revalidar (tentado em MC3 com `axios:^1.17.0` mas cdp-sdk rejeita — pin não cola).

---

## Mega Comando 2 — Blindagem DevSecOps (2026-05-15)

Evidências brutas dos 5 itens (grep + dir + npm run build).

### Item 1 — Dependabot Configuration
`.github/dependabot.yml` — 3 ecosystems: npm (frontend), npm (netlify/functions), github-actions.
Weekly Monday 05:00, open-pull-requests-limit: 5, dev-dependencies group.

```
$ cat .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/desafio-gut/frontend"
    schedule: { interval: "weekly", day: "monday", time: "05:00" }
    open-pull-requests-limit: 5
    groups:
      dev-dependencies:
        dependency-type: "development"
  - package-ecosystem: "npm"
    directory: "/desafio-gut/frontend/netlify/functions"
    schedule: { interval: "weekly", day: "monday", time: "05:00" }
    open-pull-requests-limit: 5
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule: { interval: "weekly", day: "monday", time: "05:00" }
    open-pull-requests-limit: 5
```

### Item 2 — npm audit no CI
`.github/workflows/security-scan.yml` — 2 jobs paralelos: `npm-audit-frontend` + `npm-audit-functions`.
Ambos usam `npm audit --audit-level=high` SEM `|| true` — falha REAL em high/critical.
Triggers: push + pull_request para main.

### Item 3 — Lockfile Integrity
Job `lockfile-integrity` no `security-scan.yml`:
- `npm install --package-lock-only && git diff --exit-code package-lock.json` (frontend + functions)
- `npx lockfile-lint --allowed-hosts npmjs.com --validate-https` (frontend + functions)
- Falha se lockfile dessincronizado ou hosts não confiáveis.

### Item 4 — Socket.dev Integration
Job `socket-security` no `security-scan.yml`:
- GitHub Action oficial `socket-security/github-actions@v0`
- Config: `fail-on: critical,high`
- Detecta: malware, typosquatting, protestware, telemetria oculta.
- `docs/socket-setup.md` documenta obtenção de API key gratuita.

### Item 5 — CI Security Gates
`.github/workflows/ci.yml` — 4 estágios sequenciais (fail-fast):
1. `install` — npm ci (frontend + functions)
2. `lint` — ESLint check
3. `build` — npm run build (frontend)
4. `audit` — npm audit (frontend)
Triggers: push + pull_request para main. Timeout: 10 min por job.

`docs/ci-security-gates.md` documenta como habilitar branch protection no GitHub.

### Build
`npm run build` — verde, 6.31s, sem warnings novos (apenas chunk size > 500KB pré-existente).

### Arquivos criados
```
.github/
├── dependabot.yml
└── workflows/
    ├── ci.yml
    └── security-scan.yml
docs/
├── ci-security-gates.md
└── socket-setup.md
```

---

## Ajuste Pós-MC1 — COEP credentialless (2026-05-15, mesmo dia)

`netlify.toml` linha 49 trocado: `Cross-Origin-Embedder-Policy: require-corp` → `credentialless`.

**Motivo**: `require-corp` exige que TODO recurso cross-origin envie `CORP` ou seja `credentialless`. Privy abre popups/iframes OAuth (Google/Apple) que tipicamente NÃO enviam esses headers, o que quebra o fluxo de login real-world. `credentialless` mantém o isolamento Spectre/XS-Leaks exigido por OWASP ASVS 5.0 §V14 mas permite recursos cross-origin sem credenciais (cookies/auth) sem exigir CORP — adequado para popups OAuth de terceiros.

**Trade-off**: aceito. Não é regressão de segurança, é ajuste de UX. As outras 5 headers (HSTS, COOP, CORP, Permissions-Policy, Referrer-Policy + CSP completa) permanecem intactas.

## Ajuste Pós-MC1 — AdminPanel migra para JWT Admin (2026-05-15)

`src/pages/AdminPanel.jsx` migrado de `x-admin-token` (sessionStorage eterno) para fluxo JWT:
- `accessToken` em `useRef` (memória apenas, 15min TTL)
- `refreshToken` em `sessionStorage.gut_admin_refresh` (7d TTL)
- Login: 1× Privy signMessage `DESAFIOGUT-ADMIN:<ts>:<addr>` + cola `ADMIN_TOKEN` legado UMA vez → POST `/auth-admin {acao:"login"}`
- Auto-refresh: `setInterval` 12min POST `/auth-admin {acao:"refresh"}`
- Fetches dos 3 tabs (Aprovações/Cotas/Admins): `Authorization: Bearer <access>`

Backend permanece dual-mode (legado `x-admin-token` ainda aceito por consumidores externos como cron). Cronograma de remoção do legado em `desafio-gut/docs/migracao-admin-token-jwt.md`.

---

## Mega Comando 1 — Blindagem APIs + Admin + Headers (2026-05-15)

Evidências brutas dos 5 itens (grep + npm run build).

### Item 1 — Rate Limiting Server-Side
16 funções integradas (5/min críticos, 10/min admin, 30/min GET públicos). Middleware `_lib/rate-limiter.mjs` (fixed-window, Netlify Blobs, fail-open).

```
$ grep -l "aplicarRateLimit" netlify/functions/*.mjs | xargs -n1 basename
admin-aprovacao.mjs   admin-list.mjs     auth-admin.mjs        auth-user.mjs
banners.mjs           comprar-senhas.mjs confirmar-pagamento.mjs cotas.mjs
cron-reset-programado.mjs                iniciar-pagamento.mjs lance-relampago.mjs
renovacao-adesao.mjs  saldo-rs.mjs       schedule.mjs          voucher.mjs
wallet.mjs
```

Resposta 429 inclui: `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

### Item 2 — Headers de Segurança
6 headers no bloco `/*` do `netlify.toml`:

```
Referrer-Policy                 = "strict-origin-when-cross-origin"
Strict-Transport-Security       = "max-age=63072000; includeSubDomains; preload"
Cross-Origin-Opener-Policy      = "same-origin"
Cross-Origin-Embedder-Policy    = "require-corp"
Cross-Origin-Resource-Policy    = "same-origin"
Permissions-Policy              = "camera=(), microphone=(), geolocation=()"
```

⚠️ Pós-deploy: smoke do login Privy. Se COEP=require-corp quebrar OAuth, baixar para `credentialless`.

### Item 3 — Anti-IDOR
4 GETs sensíveis exigem `Authorization: Bearer <user-session JWT>` + `validarOwnerOuAdmin`:
- `wallet.mjs` GET (linha ~70)
- `saldo-rs.mjs` (linha ~30)
- `renovacao-adesao.mjs` GET (linha ~70)
- `voucher.mjs` GET (linha ~205)

Novo endpoint `auth-user.mjs` (EIP-191 → JWT user-session 24h). Frontend `AppContext.jsx` adquire o JWT após login Privy e injeta em todos os fetches. Componentes atualizados: `WalletCard`, `RenovacaoCard`, `VoucherPanel`.

### Item 4 — JWT Admin Curta Duração
- `_lib/admin-auth.mjs` (emitirParAdmin, rotacionarRefresh, revogarAdmin, autenticarAdmin, guardAdmin)
- `/auth-admin` com 3 ações (login | refresh | logout)
- Access 15min + Refresh 7d (hash SHA-256 em Blob `admin-refresh:{endereco}`, máx 5 paralelos)
- Guarda dupla em 9 funções admin (Bearer JWT preferido, x-admin-token legado fallback)
- `docs/migracao-admin-token-jwt.md` documenta cronograma de deprecação

### Item 5 — RBAC Granular
- `_lib/rbac.mjs`: `getRole(endereco)` → admin | cliente | user (cache 5 min)
  - admin = ∈ admin-list:admins ∪ COORDENACAO
  - cliente = blob `cotas:{endereco}` existe OU `renovacao-adesao.status === "ativa"` dentro da validade
  - user = default
- `requireRole(papel, minimo)` (hierarquia admin > cliente > user)
- Aplicado em `comprar-senhas.mjs` e `lance-relampago.mjs` (exige cliente+)
- `admin-list.mjs` GET aceita `?endereco=` opcional e devolve `{ role, fonte }`
- `useAdmin.js` expõe `role` adicional

### Build
`npm run build` — verde, 4.90s, sem warnings novos (apenas o warning pré-existente de chunk size > 500KB).

### Smoke pós-deploy (a executar)
```bash
# 1. Headers
curl -sI https://silly-stardust-ca71bc.netlify.app/ | grep -iE 'strict-transport|cross-origin|permissions-policy|referrer'

# 2. Rate limit
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://silly-stardust-ca71bc.netlify.app/.netlify/functions/comprar-senhas \
    -H 'Content-Type: application/json' -d '{}'
done    # 5x 401/400, 6º 429

# 3. IDOR
curl -i https://silly-stardust-ca71bc.netlify.app/.netlify/functions/wallet?endereco=0xAAA   # 401
```

---

**Data:** 2026-05-12 (atualizado pós-Onda 7 — fechamento dos 3 parciais)
**Branch:** `main` @ `2c76660` + Onda 7 (REQ-01, REQ-03, REQ-17) — commit pendente
**Tipo:** auditoria de leitura inicial + atualizações após cada onda.
**Referência:** `docs/especificacao-extraida.md` (29 REQs · REQ-01 a REQ-29) extraídos do PDF *Especificação Técnica Refatorada (Junho/2026)*.

---

## Sumário executivo

### Estado anterior (b4c778f — antes da Onda 4)

| Status | Total | % |
|---|---|---|
| ✅ IMPLEMENTADO | 10 | 34% |
| ⚠️ PARCIAL | 12 | 41% |
| ❌ AUSENTE | 6 | 21% |
| n/a | 1 | 3% |

### Estado pós-Onda 4 Tier 1 (M-06, M-09, M-11)

| Status | Total | Δ vs anterior |
|---|---|---|
| ✅ IMPLEMENTADO | 14 | +4 |
| ⚠️ PARCIAL | 11 | -1 |
| ❌ AUSENTE | 3 | -3 |
| n/a | 1 | 0 |

### Estado pós-Onda 4 Tier 2/3 (M-07, M-08, M-10)

| Status | Total | Δ vs Tier 1 |
|---|---|---|
| ✅ IMPLEMENTADO | 18 | +4 |
| ⚠️ PARCIAL | 9 | -2 |
| ❌ AUSENTE | 1 | -2 |
| n/a | 1 | 0 |

### Estado pós-Onda 5 (timer fix + M-12 + M-13)

| Status | Total | Δ vs Onda 4 |
|---|---|---|
| ✅ IMPLEMENTADO | 19 | +1 |
| ⚠️ PARCIAL | 9 | 0 |
| ❌ AUSENTE | 0 | -1 |
| n/a | 1 | 0 |

### Estado pós-Onda 6 (M-14, M-14b, M-15, M-16, M-17)

| Status | Total | Δ vs Onda 5 |
|---|---|---|
| ✅ IMPLEMENTADO | 25 | +6 |
| ⚠️ PARCIAL | 3 | -6 |
| ❌ AUSENTE | 0 | 0 |
| n/a | 1 | 0 |

### Estado atual (pós-Onda 7: REQ-01, REQ-03, REQ-17)

| Status | Total | % | Δ vs Onda 6 |
|---|---|---|---|
| ✅ IMPLEMENTADO | **28** | 97% | +3 |
| ⚠️ PARCIAL | **0** | 0% | -3 |
| ❌ AUSENTE | **0** | 0% | 0 |
| n/a | **1** | 3% | 0 |

🏆 **Zero REQs pendentes** (apenas REQ-27, objetivo de negócio sem implementação direta, fica n/a). De 1 ✅ na auditoria inicial → **28 ✅** em 7 ondas.

**REQs movidos para ✅ na Onda 7:**
- **REQ-01** — banner do cliente no leilão ativo: `MercadoLances.jsx` busca primeira cota da categoria correspondente (Bronze/Prata para flash, Diamante/Ouro para programado) via `GET /cotas?categoria=`, e renderiza `<BannerCard>` acima do grid principal com nome do cliente
- **REQ-03** — renovação de adesão: `renovacao-adesao.mjs` (GET status público + POST solicitar/confirmar) + `RenovacaoCard.jsx` integrado em `MinhaCarteira` + `docs/fluxo-renovacao-adesao.md`. Status calculado on-read: nao-iniciada / pendente / ativa / vencendo / vencida
- **REQ-17** — Vale-Crédito automático: `cotas.mjs` POST agora calcula `diferenca = MIN_POR_CATEGORIA_BRL[categoria] - valor_produto`; se positiva, credita automaticamente na Wallet do cliente com `origem: cotas-vale-credito-automatico`. `WalletCard.jsx` destaca essas transações com ícone ⚙️ + tooltip explicativo

**Mudanças na Onda 5:**
- **FASE 0 timer fix** (Timer 1-4): não fecha REQ específico mas elimina bug crítico de timer zerando ao recarregar. `prazoTimestamp` agora persistido em `localStorage` (`gut_prazo_flash`/`gut_prazo_programado`); hidratação via `getEdicaoPrazo(R-1)` on-chain a cada 60s; cálculo absoluto; tick 250ms; `visibilitychange` re-sincroniza ao voltar de aba.
- **REQ-10 (reset 00:00 do Programado)** — ❌ → ✅ via `cron-reset-programado.mjs` (MVP off-chain) com idempotência por data ISO no fuso `RESET_TIMEZONE`. Doc `docs/configuracao-cron-reset.md` com 3 opções (GitHub Actions / cron-job.org / Netlify Scheduled).
- **REQ-04..07 cotas** — segue ⚠️: `schedule.mjs` (GET público + POST admin) prepara terreno; frontend tenta `buscarGradeRemota` com fallback estático. Badge "fonte: Blob/estática" no header da `/programacao`. **Sistema de cota vendida vs disponível** ainda não — depende do painel Admin (Onda futura).

**Único REQ ❌ restante:** nenhum — REQ-10 saiu da lista após M-12.
**Os 8 ⚠️ que sobram:** REQ-01, REQ-03, REQ-04..07, REQ-09, REQ-17, REQ-20. Todos esperam **sistema de cotas reais** (vendido/disponível) ou **UI Admin com role-based access**.

**REQs movidos para ✅ na Onda 4 Tier 2/3:**
- REQ-08 (visibilidade por cota) — ⚠️ → ✅ via `tiersAgoraVisiveis` + filtro de domingo + badges AO VIVO/Agendado na `Vitrine.jsx`
- REQ-22 (auto-gerador banner) — ❌ → ✅ via `banners.mjs` SVG template GET fallback
- REQ-23 (premium via Wallet) — ❌ → ✅ via `BannerUpload.jsx` com flag `premium=true` debitando Wallet

**Continua ⚠️ ou ❌:**
- REQ-04..07 (cotas Bronze/Prata/Ouro/Diamante) — segue ⚠️: dados estáticos exibidos + visibilidade dinâmica agora, **mas sistema de cota vendida vs disponível ainda inexistente**
- REQ-10 (reset 00:00 auto) — segue ❌ (fora do escopo desta onda)
- REQ-17 (regra Valor_Produto<Mín_Cota automática) — segue ⚠️ (storage existe, cálculo depende de cota real)
- REQ-20 (PIX Adesão + Admin workflow) — segue ⚠️ (Admin via x-admin-token; UI Admin ausente)
- REQ-19 (saldo abate premium) — agora ✅ porque BannerUpload com `premium=true` debita Wallet — atualizado para ✅

**Build:** ✅ verde após cada item (`✓ built in 4.23s` M-07; `3.67s` M-08; `3.58s` M-10).

---

## Verificações do checklist (1–9)

### 1. DURAÇÕES ✅

```
$ grep -nE "DURACAO|FLASH_MIN|FLASH_MAX|programado" src/context/AppContext.jsx
14://   VITE_DURACAO_FLASH_SECONDS. Valores fora do intervalo caem no fallback 1800.
16:const FLASH_MIN = 1800;
17:const FLASH_MAX = 3600;
19:  const raw = Number(import.meta.env?.VITE_DURACAO_FLASH_SECONDS);
20:  if (!Number.isFinite(raw) || raw < FLASH_MIN || raw > FLASH_MAX) return FLASH_MIN;
23:export const DURACAO = {
25:  programado: 86400,
```
**Resultado:** `DURACAO.flash` clampada em **[1800, 3600] s** com fallback 1800; `DURACAO.programado = 86400 s` (24 h). ✅ conforme spec §3.1.

### 2. EMAILS PIX ✅

```
$ grep -nE "familiaquildo|desafiogut@gmail" src/pages/MinhaCarteira.jsx netlify/functions/_lib/pix-config.mjs
src/pages/MinhaCarteira.jsx:21:// 1) Adesão (Consultoria): PIX direto → familiaquildo@gmail.com (manual)
src/pages/MinhaCarteira.jsx:22:// 2) Operação Interna (Fichas): Mercado Pago → desafiogut@gmail.com (webhook)
src/pages/MinhaCarteira.jsx:24:  { label: "Adesão (PIX manual)",     value: "familiaquildo@gmail.com (Banco do Brasil)" },
src/pages/MinhaCarteira.jsx:25:  { label: "Fichas (Mercado Pago)",   value: "desafiogut@gmail.com — automatizado" },
netlify/functions/_lib/pix-config.mjs:13:  email:    "familiaquildo@gmail.com",
netlify/functions/_lib/pix-config.mjs:21:  email:    "desafiogut@gmail.com",
```
**Resultado:** ambos os emails presentes na UI (MinhaCarteira) e na fonte canônica backend (pix-config.mjs). ✅ conforme spec §5.

### 3. ROTAS ✅

```
$ grep -nE "vitrine|mercado" src/App.jsx
54:          <Route path="/mercado"    element={<MercadoLances />} />
55:          <Route path="/vitrine"       element={<Vitrine />} />
56:          <Route path="/vitrine/:slot" element={<Vitrine />} />
```
**Resultado:** `/mercado` (página `MercadoLances`) preservada intocada — produção; `/vitrine` lista 4 slots; `/vitrine/:slot` página de detalhe (Bloco 1, M-02). ✅
**Nota:** o checklist citou `/mercado-lances` — o nome real do path é `/mercado` (componente: `MercadoLances`). Verificado que segue intacto.

### 4. SLOTS (Vitrine) ✅

```
$ grep -nE "id: \"|nome:|posicao:|cotasDisponiveis:" src/pages/Vitrine.jsx
26:    id: "diamante",      nome: "Diamante",   posicao: 1,   cotasDisponiveis: 1,
42:    id: "ouro",          nome: "Ouro",       posicao: 2,   cotasDisponiveis: 1,
58:    id: "prata",         nome: "Prata",      posicao: 3,   cotasDisponiveis: 81,
74:    id: "bronze",        nome: "Bronze",     posicao: 4,   cotasDisponiveis: 27,
```
**Resultado:** 4 slots na ordem Diamante (1) → Ouro (2) → Prata (3) → Bronze (4), cotas conforme spec §2 (1/1/81/27). Layout Desktop=grid 2×2; Mobile=sticky D+O + carrossel P+B. ✅

### 5. WALLET ✅

```
$ ls -la netlify/functions/wallet.mjs src/components/WalletCard.jsx
-rw-r--r-- 6506 May 12 00:44 netlify/functions/wallet.mjs
-rw-r--r-- 7491 May 12 00:44 src/components/WalletCard.jsx
```
**Resultado:** ambos os arquivos existem. Endpoint GET público + POST admin-gated; componente read-only integrado em `MinhaCarteira.jsx:307`. ✅

### 6. VOUCHERS ✅

```
$ ls -la netlify/functions/voucher.mjs src/components/VoucherPanel.jsx
-rw-r--r-- 8720 May 12 00:45 netlify/functions/voucher.mjs
-rw-r--r-- 10398 May 12 00:46 src/components/VoucherPanel.jsx
```
**Resultado:** endpoint com `gerar`/`consultar`/`resgatar` + componente integrado em `MinhaCarteira.jsx:313`. ✅

### 7. LIMPEZA DE MOCKs ✅

```
$ grep -rnE "MOCK|LANCES_MOCK|gut_carteira_flash|gut_fichas_programadas|gut_lances_r1" src/
src/App.jsx:1:// force deploy 2026-05-11 — reset versionado + MOCK_MODE removido
src/context/AppContext.jsx:28:// Chaves legadas em localStorage criadas por versões anteriores com MOCK_MODE.
src/context/AppContext.jsx:32:const LS_KEYS_LEGADO_MOCK = [
src/context/AppContext.jsx:33:  "gut_lances_r1",
src/context/AppContext.jsx:36:  "gut_carteira_flash",
src/context/AppContext.jsx:37:  "gut_fichas_programadas",
src/context/AppContext.jsx:96:  // teste antigos (MOCK_MODE removido em 2026-05-11) sem afetar usuários
src/context/AppContext.jsx:106:      for (const k of LS_KEYS_LEGADO_MOCK) localStorage.removeItem(k);
```
**Resultado:** as ocorrências restantes são **apenas listas e comentários do reset versionado** que REMOVE as chaves legadas do `localStorage`. Nenhum uso funcional de mock data. ✅ conforme.

### 8. BUILD ✅

```
$ npm run build
✓ 6765 modules transformed.
dist/assets/index-DtUvowVO.js                 919.75 kB │ gzip: 305.94 kB
dist/assets/index-BIM3W67E-DY6dWW7o.js      1,099.42 kB │ gzip: 313.49 kB
✓ built in 3.85s
(!) Some chunks are larger than 500 kB after minification.
```
**Resultado:** build verde em 3.85s. Warning de chunk size é informativo (não bloqueante). ✅

### 9. RESET VERSIONADO ✅

```
$ grep -nE "gut_reset_v|LS_RESET_VERSION|LS_RESET_KEY" src/context/AppContext.jsx
30:const LS_RESET_KEY        = "gut_reset_v";
31:const LS_RESET_VERSION    = "2026-05-11-v2";
102:      aplicado = localStorage.getItem(LS_RESET_KEY);
104:    if (aplicado === LS_RESET_VERSION) return;
107:      localStorage.setItem(LS_RESET_KEY, LS_RESET_VERSION);
```
**Resultado:** chave `gut_reset_v` e versão `2026-05-11-v2` confirmadas. ✅

---

## 10. Saldo de REQs vs Especificação (cruzamento dos 29)

> Status final por requisito, com evidência por código quando aplicável.

### §1 — Visão Geral

| ID | Descrição | Status | Evidência |
|---|---|---|---|
| **REQ-01** | Plataforma híbrida: publicidade (banners) + leilões | ✅ | Banner do cliente da cota ativa aparece em `/mercado` (BannerCard acima do grid). Vitrine + Banners + Leilões integrados |
| **REQ-02** | Eliminar ambiguidades na grade de horários | ✅ | `/programacao` (`ScheduleView.jsx`) + dados em `src/data/programacao-junho-2026.js` codificam horários por tipo de dia |
| **REQ-03** | Automatizar processos financeiros | ✅ | MP/Fichas (REQ-21), Voucher (REQ-26), Premium Wallet (REQ-23), **Renovação Adesão (REQ-03 endpoint próprio)** e Reset 00:00 (REQ-10). PIX manual restante (REQ-20) tem workflow Admin ativo |

### §2 — Categorias e Hierarquia de Cotas

| ID | Descrição | Status | Evidência |
|---|---|---|---|
| **REQ-04** | Bronze: 27 cotas não exclusivas, R$ 2.640/660 | ✅ | `cotas.mjs` GET/POST/DELETE; Blob `cotas:{cliente_id}` + índice por categoria; AdminPanel CRUD; Vitrine mostra "X / 27" |
| **REQ-05** | Prata: 81 cotas exclusivas, R$ 5.600/1.350 | ✅ | idem; Vitrine mostra "X / 81" |
| **REQ-06** | Ouro: 1 cota exclusiva, R$ 11.000/2.250 | ✅ | idem; Vitrine mostra "X / 1" |
| **REQ-07** | Diamante: 1 cota exclusiva, R$ 18.000/4.500 + 10 bônus | ✅ | idem; bônus via voucher (REQ-24/25 já ✅) |
| **REQ-08** | Cotas determinam visibilidade e prioridade na UI | ✅ | `tiersAgoraVisiveis()` aplica filtro de domingo + `tierAtivoAgora()` adiciona badge "AO VIVO/Agendado" por cota em tempo real (refresh 30s) |

### §3.1 — Tipos de Leilão

| ID | Descrição | Status | Evidência |
|---|---|---|---|
| **REQ-09** | Programado (Ouro/Diamante): 24 h, fixado no topo | ✅ | Sticky na `/vitrine`; M-12 reset automático 00:00; timer imune a refresh hidratado via `getEdicaoPrazo` on-chain |
| **REQ-10** | Reset automático às 00:00 | ✅ | `cron-reset-programado.mjs` MVP off-chain: idempotência por data ISO no fuso config, apura vencedor a partir do snapshot, persiste `resultado-programado:{edicao}:{data}`, limpa lances. Doc com 3 opções de cron (GH Actions / cron-job.org / Netlify Scheduled) |
| **REQ-11** | Relâmpago (Bronze/Prata): 30 min – 1 h | ✅ | `AppContext.jsx:16-25` — `DURACAO.flash` ∈ [1800, 3600] via env `VITE_DURACAO_FLASH_SECONDS` |
| **REQ-12** | Leilão Relâmpago em seção "Oportunidade Agora" | ✅ | `Vitrine.jsx:220` — `<h2>⚡ Oportunidade Agora</h2>` |

### §3.2 — Responsividade

| ID | Descrição | Status | Evidência |
|---|---|---|---|
| **REQ-13** | Desktop: grid com 4 slots | ✅ | `Vitrine.jsx:217, 234` — `gridTemplateColumns: "1fr 1fr"` para sticky + carrossel |
| **REQ-14** | Mobile <768px: Diamante/Ouro sticky | ✅ | `Vitrine.jsx:108-109` — `position: sticky` quando `isMobile` |
| **REQ-15** | Mobile <768px: Prata/Bronze carrossel | ✅ | `Vitrine.jsx:226-236` — `overflowX: auto` + `scroll-snap-type: x mandatory` |

### §4 — Wallet Digital

| ID | Descrição | Status | Evidência |
|---|---|---|---|
| **REQ-16** | Wallet virtual para Vale-Crédito | ✅ | `netlify/functions/wallet.mjs` + `src/components/WalletCard.jsx` |
| **REQ-17** | Regra: `Valor_Produto < Valor_Min_Cota` gera diferença em crédito | ✅ | `cotas.mjs` POST credita automaticamente Wallet quando produto < mínimo da categoria (`creditarValeCreditoAutomatico`); WalletCard mostra origem com ícone ⚙️ |
| **REQ-18** | Persistir em Netlify Blob `wallet:{cliente_id}` consistência forte | ✅ | `wallet.mjs:13` — `getStore({ name, consistency: "strong" })` |
| **REQ-19** | Saldo abate renovação/premium | ✅ | `BannerUpload` com `premium=true` chama `banners.mjs` que debita Wallet via `debitarWallet()` antes de persistir |

### §5 — Pagamento

| ID | Descrição | Status | Evidência |
|---|---|---|---|
| **REQ-20** | PIX Adesão `familiaquildo@gmail.com` + aprovação manual Admin | ✅ | Workflow completo: cliente inscreve via `admin-aprovacao.mjs` acao=inscrever (público); admin aprova/rejeita via AdminPanel `/admin` gated por `useAdmin` + ADMIN_TOKEN; histórico de transições preservado no Blob `admin-aprovacao:{cliente_id}` |
| **REQ-21** | Fichas MP `desafiogut@gmail.com` automatizado via webhook | ✅ | `webhook-mercadopago.mjs` + `confirmar-pagamento.mjs` (pipeline B.3–B.6 validado em produção) |

### §6 — Banners e Artes

| ID | Descrição | Status | Evidência |
|---|---|---|---|
| **REQ-22** | Auto-gerador de banner (título + logo) | ✅ | `banners.mjs` GET retorna SVG template inline com cliente_id + tier inferido + nome quando não há upload; `BannerCard.jsx` consome |
| **REQ-23** | Solicitação Premium debitando Wallet | ✅ | `banners.mjs` POST aceita `premium=true` + `valorCentavos`; débito atômico via `debitarWallet()` antes de persistir |

### §7 — Bônus Diamante (Vouchers)

| ID | Descrição | Status | Evidência |
|---|---|---|---|
| **REQ-24** | 10 bônus = vouchers de networking | ✅ | Modelo no `voucher.mjs`; lista no `VoucherPanel.jsx` |
| **REQ-25** | Diamante gera código único de convite | ✅ | `voucher.mjs` `acao=gerar` retorna `GUT-XXXXXXXX` |
| **REQ-26** | Indicado: isenção 1ª compra de fichas | ✅ | `comprar-senhas.mjs` aceita `voucherCodigo`, valida via blob `voucher:{codigo}`, aplica `valorCentavos=0`, marca como resgatado após sucesso on-chain |
| **REQ-27** | Objetivo: estimular entrada de novos usuários | n/a | Requisito de objetivo de negócio, não de código |

### §8 — Calendário e Loop

| ID | Descrição | Status | Evidência |
|---|---|---|---|
| **REQ-28** | Grade semanal Seg–Sáb × 4 semanas | ✅ | `ScheduleView.jsx` com seletor de semana 1–4 + `DATAS_JUNHO` por dia da semana |
| **REQ-29** | Domingos: filtro só Prata + Diamante | ✅ | `tiersPorHorario` em `programacao-junho-2026.js` aplica filtro automático quando `diaKey === "sunday"` |

---

## Listas finais

### ✅ CONFORME (10)
- REQ-11 (Relâmpago 30–60min)
- REQ-12 ("Oportunidade Agora")
- REQ-13 (Desktop grid 4 slots)
- REQ-14 (Mobile sticky D+O)
- REQ-15 (Mobile carrossel P+B)
- REQ-16 (Wallet virtual)
- REQ-18 (Blob `wallet:{cliente_id}` consistência forte)
- REQ-21 (Fichas MP automatizado)
- REQ-24 (10 vouchers networking)
- REQ-25 (Gerar código único)

### ⚠️ PARCIAL (12) — infraestrutura presente, peças do roadmap ausentes
- REQ-01 (publicidade + leilões) — leilões sim, banners não
- REQ-03 (automação financeira) — MP sim, Adesão/premium/renovação não
- REQ-04..07 (Bronze/Prata/Ouro/Diamante) — dados estáticos sim, estado vendido/disponível não
- REQ-08 (visibilidade por cota) — visual sim, dinâmica não
- REQ-09 (Programado fixado topo) — Vitrine sim, /mercado mantém toggle
- REQ-17 (Vale-Crédito automático) — storage sim, cálculo não
- REQ-19 (saldo abate premium) — débito sim, consumidor não
- REQ-20 (PIX Adesão + Admin) — emails canônicos sim, workflow Admin não
- REQ-26 (isenção 1ª participação) — resgate sim, comprar-senhas não integra

### ❌ AUSENTE (6) — ondas futuras
- REQ-02 (grade sem ambiguidade)
- REQ-10 (reset automático 00:00)
- REQ-22 (auto-gerador banner)
- REQ-23 (Premium via Wallet)
- REQ-28 (grade Seg–Sáb × 4 semanas)
- REQ-29 (Domingos exclusivos)

### n/a (1)
- REQ-27 — objetivo de negócio, não-implementável diretamente

---

## Histórico do saldo

| Marco | ✅ | ⚠️ | ❌ | n/a |
|---|---|---|---|---|
| Auditoria inicial (`auditoria-frontend-vs-spec.md`) | 1 | 5 | 22 | 1 |
| Pós-Onda 2 (Vitrine + quick wins) | 8 | 2 | 18 | 1 |
| Pós-Onda 3 (Wallet + Voucher + limpeza) | 10 | 12 | 6 | 1 |
| **Pós-Bloco 1 nav (estado atual)** | **10** | **12** | **6** | **1** |

> Nota: o Bloco 1 de refator de navegação (commit `41368c7`) não alterou nenhum REQ da spec — só corrigiu inconsistências de UX (footer mortos, labels de CTA, rota `/vitrine/:slot`, atalhos do Dashboard, footer mobile). O saldo permanece igual ao da Onda 3.

---

## Conclusão

O estado atual reflete fielmente o que foi documentado nas Ondas 2, 3 e Bloco 1 de navegação. Os 10 ✅ representam fundações implementadas e testáveis; os 12 ⚠️ representam infraestrutura presente esperando consumidores ou regras de negócio (cota real, Admin, integração comprar-senhas); os 6 ❌ representam ondas futuras (Banners, Calendário, reset 00:00). Build verde. Sem regressões funcionais detectadas nos pontos verificados.

**Nada foi alterado nesta sessão.**
