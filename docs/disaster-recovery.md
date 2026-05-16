# Disaster Recovery Playbook — DesafioGUT

> Mega Comando 6 / Item 3. Atualizado em 2026-05-16.
> Audience: oncall, CTO, coordenação. Imprimir/manter offline para acesso em incidentes.

Este playbook cobre os 4 cenários de falha mais prováveis do DesafioGUT em produção. **Não substitui** consulta direta a Netlify Support, Alchemy Support ou Privy Support — é o guia de **primeiros passos** + critérios de decisão. Para beta, conscientemente **não** mantemos ambiente standby físico (custo desproporcional ao SLA atual).

---

## 1. Cenários de falha cobertos

### Cenário A — Perda ou corrupção de Blobs Netlify

**Sintomas:** Function `/.netlify/functions/comprar-senhas`, `/auth-user`, ou `/info-pagamento` retornam 5xx com mensagem `"BLOBS_INDISPONIVEL"` ou JSON com `data: null` onde deveria haver pedido. Painel admin não lista pedidos antigos. Logs Sentry com pico de `Blobs.read.error`.

**Causa raiz típica:** Bug no `purge-logs` deletando além da janela; corrupção isolada de chaves; falha pontual do Blobs CDN.

**Impacto:** Pedidos PIX em andamento não confirmam; histórico de auditoria perde rastreabilidade; saldoSenhas off-chain inconsistente.

### Cenário B — Queda total do Netlify (CDN + Functions)

**Sintomas:** `app.desafiogut.com.br` retorna `530` (Cloudflare) ou `502/503` (Netlify edge). Status page do Netlify reporta incident. Não há `cf-ray` ou `server: cloudflare` nos headers.

**Causa raiz típica:** Outage regional Netlify (ex: 2022-06-21, 2023-09-12); BGP issue; falha da AWS us-east-1 que hospeda parte da infra Netlify.

**Impacto:** App totalmente fora do ar. Lances on-chain ainda possíveis via Etherscan direto (workaround user-side).

### Cenário C — Falha do RPC Alchemy (Sepolia inacessível)

**Sintomas:** `wallet.getEthereumProvider()` ou `provider.send()` retornam timeout/erro 5xx. Frontend log `"failed to fetch from Alchemy"`. Lances não enviam, saldo `null`.

**Causa raiz típica:** Alchemy mantenção, quota excedida, RPC Sepolia upstream offline.

**Impacto:** Frontend funciona, mas darLance/apurarVencedor falham. Pedidos PIX continuam (operação independente da chain).

### Cenário D — Comprometimento de chave Privy

**Sintomas:** Login Privy continua, mas usuários relatam transações não autorizadas em suas embedded wallets; Privy Support alerta sobre breach.

**Causa raiz típica:** Vazamento de App Secret Privy; comprometimento da conta admin do dashboard Privy.

**Impacto:** Risco de transações fraudulentas. Confiança da plataforma comprometida.

---

## 2. RTO/RPO por cenário

| # | Cenário | RTO (recuperar) | RPO (perda aceita) | Estratégia |
|---|---|---|---|---|
| A | Perda/corrupção de Blobs | **2h** | **24h** | Restaurar do backup diário (`docs/backup-blobs.md`) |
| B | Queda total Netlify | **4h** | **0** | Código no GitHub, redeploy em Vercel/Cloudflare Pages como fallback |
| C | Falha RPC Alchemy | **1h** | **0** | Failover para Infura / publicnode.com (fallback já no CSP) |
| D | Privy comprometido | **24h** | **0** | Rotação de App Secret; migração de usuários para novas wallets se necessário |

**Definições:**
- **RTO (Recovery Time Objective):** tempo máximo entre detecção e restabelecimento do serviço para usuários.
- **RPO (Recovery Point Objective):** janela máxima de dados perdidos (medida em tempo). `0` = sem perda aceitável.

---

## 3. Procedimento de ativação

### 3.1 Quem aciona

| Detector | Acionador primário | Acionador secundário |
|---|---|---|
| Alerta Sentry | Oncall do dia | CTO |
| Reporte de usuário | Suporte → CTO | CTO |
| Status page externa | Oncall (poll diário) | — |

### 3.2 Canal de comunicação

- **Interno**: Slack `#incidentes` (criar se ainda não existe) — registrar timeline em thread.
- **Externo**: Twitter/X `@desafiogut` + banner no site (`/index.html` → adicionar `<div>` no topo via deploy emergencial).
- **Suporte usuário**: e-mail de coordenação respondendo `suporte@desafiogut.com.br`.

### 3.3 Steps iniciais (primeiros 10 min)

1. **Confirmar incidente** — não tomar ação destrutiva com base em alerta isolado. Cruzar Sentry + curl + status page.
2. **Snapshot do estado** — `curl https://api.cloudflareanalytics.com/...` para tráfego, `git log -5` para confirmar último deploy, `gh run list -L 5` para status CI/CD.
3. **Decidir cenário** (Seção 1). Se múltiplos sintomas → escalar para o de RTO menor primeiro (C ou A).
4. **Comunicar** — postar em `#incidentes` com formato: **CENÁRIO X | INÍCIO HH:MM | IMPACTO | AÇÃO TOMADA**.
5. **Iniciar restauração** (Seção 4 abaixo).

---

## 4. Checklist de restauração por cenário

### 4.1 Restauração Cenário A — Blobs

1. [ ] Identificar quais chaves foram afetadas via logs Sentry (ou diff entre backup mais recente e estado atual).
2. [ ] Listar backups disponíveis:
       ```bash
       curl -sS -H "Authorization: Bearer $ADMIN_TOKEN" \
         https://app.desafiogut.com.br/.netlify/functions/backup-blobs
       ```
3. [ ] Escolher backup pré-incidente (ex: `backup:2026-05-15` se o problema foi detectado em 2026-05-16).
4. [ ] Restaurar conforme `docs/backup-blobs.md` Seção 3 (CLI Netlify `blobs:set`).
5. [ ] Validar: chamar endpoint admin que lê a chave restaurada e conferir payload.
6. [ ] Postar pós-mortem em `#incidentes` com checklist do que voltou.

### 4.2 Restauração Cenário B — Netlify outage

1. [ ] Verificar `https://www.netlifystatus.com` — confirmar incident oficial.
2. [ ] Se outage estimado < 1h: aguardar (deploy alternativo dá mais trabalho que o ganho).
3. [ ] Se outage > 1h ou indefinido:
       - [ ] Criar projeto novo em **Cloudflare Pages** apontando para o mesmo repo (`desafiogut/desafiogut`).
       - [ ] Replicar env vars: `VITE_PRIVY_APP_ID`, `VITE_CONTRATO_SEPOLIA`, `VITE_ALCHEMY_URL` (lista completa em `CLAUDE.md`).
       - [ ] Atualizar DNS Cloudflare: CNAME `app` → projeto Pages (do `silly-stardust...netlify.app` para `desafiogut.pages.dev`).
       - [ ] **Limitação**: Netlify Functions não rodam em Cloudflare Pages — endpoints `/comprar-senhas`, `/auth-*` etc. ficam offline até Netlify voltar. Frontend continua acessível em modo read-only.
4. [ ] Comunicar usuários do modo degradado.
5. [ ] Reverter para Netlify quando voltar (DNS swap de volta).

### 4.3 Restauração Cenário C — Alchemy fora

1. [ ] Confirmar via `curl https://eth-sepolia.g.alchemy.com/v2/<KEY>` retornando erro.
2. [ ] Editar `desafio-gut/frontend/.env.production`:
       ```
       VITE_ALCHEMY_URL=https://ethereum-sepolia-rpc.publicnode.com
       ```
       (já está no CSP `connect-src` — não precisa mudar `netlify.toml`)
3. [ ] Trigger redeploy: `rtk git commit --allow-empty -m "ops: failover RPC para publicnode" && rtk git push`.
4. [ ] Validar em ~3 min: abrir o site, fazer 1 lance de teste, confirmar tx em Etherscan.
5. [ ] Reverter `VITE_ALCHEMY_URL` quando Alchemy voltar.

### 4.4 Restauração Cenário D — Privy comprometido

1. [ ] Contatar Privy Support **IMEDIATAMENTE** (`support@privy.io`) — confirmar breach e plano de mitigação.
2. [ ] Rotacionar App Secret Privy via Dashboard → Settings → Keys → Rotate.
3. [ ] Atualizar `VITE_PRIVY_APP_ID` se Privy emitir App ID novo (raro, mas possível em breach severo).
4. [ ] Forçar logout de todos os usuários: implementação rápida = trocar nome do localStorage key do Privy (faz client reautenticar).
5. [ ] Se transações fraudulentas detectadas on-chain: alertar via banner `/index.html` + e-mail, sugerir aos usuários transferirem saldoSenhas para wallets externas (MetaMask) até nova auth estar 100% verificada.
6. [ ] Pós-mortem público — comunicar abertura sobre o incident (boa prática LGPD + confiança).

---

## 5. Contatos de emergência

### 5.1 Suporte direto

| Provider | Canal primário | SLA típico Free | Página de status |
|---|---|---|---|
| **Netlify** | `https://www.netlify.com/support/` (form) | 24h (Free) / 2h (Pro) | https://www.netlifystatus.com |
| **Alchemy** | `https://www.alchemy.com/contact-sales` ou Discord | 24h (Free) / 2h (Growth) | https://status.alchemy.com |
| **Privy** | `support@privy.io` | 8h (Builder) | https://status.privy.io |
| **Cloudflare** | Dashboard ticket | 24h (Free) | https://www.cloudflarestatus.com |
| **GitHub** | https://support.github.com | 8h (Free) | https://www.githubstatus.com |

### 5.2 Interno

| Papel | Como acionar |
|---|---|
| CTO/Coordenação | (preencher quando time crescer) |
| Suporte usuário | `suporte@desafiogut.com.br` |
| Oncall do dia | Slack `#incidentes` (ping `@oncall`) |

> ⚠️ **Manter atualizado**: revisar contatos a cada onboarding/offboarding de membro do time.

---

## 6. Testes de DR (trimestral)

Para que o playbook funcione **quando precisar**, ele precisa ser testado **antes** de precisar. Calendário sugerido:

| Quando | O que testar | Quem |
|---|---|---|
| 1× / trimestre | Cenário A — restaurar 1 chave aleatória de um backup arbitrário em staging | Oncall |
| 1× / trimestre | Cenário C — failover RPC em staging (não em prod) | Oncall |
| 1× / semestre | Cenário B — deploy alternativo (Cloudflare Pages) com DNS sandbox | CTO |
| Após cada release maior | Re-validar contatos da Seção 5 | CTO |

### Procedimento de teste

1. Reservar 1h em horário de baixo tráfego (madrugada BRT).
2. Reproduzir o cenário em ambiente staging (`silly-stardust-ca71bc--staging.netlify.app` ou similar).
3. Cronometrar tempo até serviço restaurado.
4. Registrar resultado em `docs/dr-test-log.md` (criar no primeiro teste) com formato:
   ```markdown
   ## Teste DR — 2026-08-15 — Cenário A
   - Backup escolhido: backup:2026-08-14
   - Chave restaurada: pedido:abc123 em store `pedidos`
   - Tempo: 12 min (vs RTO de 120 min — folga 10×)
   - Problemas encontrados: nenhum
   - Action items: nenhum
   ```
5. Se tempo > RTO planejado, abrir issue para reavaliar RTO ou melhorar o procedimento.

---

## 7. Não fazer durante incidente

- **Não** rodar `npm install` ou `forge build` em produção durante incident — usar deploys versionados do GitHub.
- **Não** deletar Blobs "para limpar" sem ter feito snapshot antes (backup pode salvar, mas só se for recente).
- **Não** rotacionar JWTs admin durante o incident a menos que o cenário D específico seja confirmado — quebra coordenação interna.
- **Não** comunicar publicamente antes de ter o cenário confirmado — boatos pioram a percepção do incident.
- **Não** restaurar backup em produção sem confirmar com pelo menos 1 outra pessoa do time se houver alguma.
