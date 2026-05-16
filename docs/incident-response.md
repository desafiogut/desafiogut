# Incident Response Plan — DesafioGUT

> Mega Comando 7 / Item 2. Atualizado em 2026-05-16.
> Complementar a `docs/disaster-recovery.md` (DR cobre **falhas técnicas**; IR cobre **incidentes de segurança**).

Este playbook descreve o procedimento para detectar, conter e notificar incidentes de segurança no DesafioGUT. Cobre vazamento de dados, comprometimento de credenciais, ataques ativos, exploração de vulnerabilidades, e violações da LGPD.

---

## 1. Matriz de severidade

A severidade define o tempo de resposta, quem é acionado, e se notificação externa é obrigatória.

| Severidade | Critérios | RTO contenção | Notificação ANPD? | Notificação usuários? |
|---|---|---|---|---|
| **Crítica** | Vazamento de dados pessoais confirmado; comprometimento da coordenação on-chain; tomada total de controle de conta admin | 1h | **Obrigatória em 24h** | **Obrigatória em 24h** |
| **Alta** | Tentativa ativa de exploração com indícios de sucesso parcial; comprometimento de credencial admin sem ação ainda; brecha em RBAC | 4h | Se afetar dados pessoais | Se afetar conta de usuário |
| **Média** | Vulnerabilidade reproduzível por pentest, sem evidência de exploração; flood DDoS contido por WAF mas com degradação | 24h | Não | Banner informativo opcional |
| **Baixa** | Vulnerabilidade reportada por bug bounty / pesquisador externo; falso positivo em scan automatizado; problema interno sem impacto user-facing | 7d | Não | Não |

Critérios de escalada: 1 sintoma da severidade superior **promove automaticamente** o incident.

---

## 2. Playbook de 3 fases

### Fase 1 — Detecção (< 1h)

**Gatilhos de detecção:**
- Alerta Sentry com tag `severity:critical` ou `category:security`
- Alerta Cloudflare WAF Spike (configurado no MC4 docs/cloudflare-waf-setup.md Seção 10)
- Notification do monitor on-chain (`monitor-onchain.mjs` — MC3) detectando transação fora do padrão
- Reporte externo: bug bounty, pesquisador, suporte usuário, Privy/Netlify alertando breach
- Anomalia em logs auditoria (`audit-admin` Blob) — login admin de IP inusitado, sequência de ações suspeita

**Steps imediatos (primeiros 60min):**
1. **Confirmar** o incident — não tomar ação destrutiva com base em alerta isolado. Cruzar 2+ fontes (Sentry + WAF logs, ou Sentry + reporte usuário).
2. **Triagem de severidade** (Seção 1).
3. **Notificar canal interno** (Seção 4) com formato:
   ```
   [INCIDENT] SEV=<Crítica|Alta|Média|Baixa>
   Início: <HH:MM UTC>
   Detector: <Sentry|WAF|usuário|...>
   Sintoma: <1 frase>
   Status: investigando
   ```
4. **Snapshot estado** — `git log -5`, `gh run list`, ler último backup-blobs disponível, screenshot Sentry.
5. **Designar incident commander** — 1 pessoa que decide. Se há só 1 pessoa no oncall, é ela.

### Fase 2 — Contenção (< 4h)

Objetivo: parar o sangramento sem destruir evidência forense.

**Ações de contenção por tipo:**

| Tipo de incident | Ação primária | Ação secundária |
|---|---|---|
| Credencial admin comprometida | Revogar todos refresh tokens via `revogarAdmin(endereco)` (`_lib/admin-auth.mjs:revogarAdmin`); ligar `MFA_ENFORCEMENT=enforce` se Phase 2 ativa | Remover endereço de `admin-list:admins` (Blob) |
| Exploit ativo em endpoint | WAF custom rule bloqueando o IP/path em até 15 min via `apply-waf.mjs` (regra adicional) | Hotfix do código + deploy emergencial via PR + branch protection bypass |
| Vazamento de Blobs | Não deletar dados (forense); revogar token Netlify; rotacionar `JWT_SECRET` | Snapshot do estado atual em `backups:emergency-<timestamp>` antes de qualquer mudança |
| Comprometimento coordenação (chave on-chain) | **Two-step transfer** já implementado (MC4) — iniciar `transferirCoordenacao` para wallet segura nova, sem aceitar; comunicar | Pausar admin endpoints via WAF (block path `/admin-*`) até nova coordenação ativa |
| DDoS / flood | WAF rate-limit já cobre (50/min/IP no MC6); subir limite mitigation_timeout temporariamente | Cloudflare Under Attack Mode (Dashboard → Security → Settings) — JS Challenge global |

**Documentar todas as ações em timeline** no canal `#incidentes` (formato: `HH:MM AÇÃO`).

### Fase 3 — Notificação (< 24h, se obrigatória)

Decisão de notificar é do incident commander, baseada na Seção 1.

#### 3.1 Notificação ANPD (LGPD Art. 48)

**Obrigatória se** dados pessoais (PII) foram acessados, vazados, alterados, ou perdidos por terceiro não autorizado.

**Como notificar:**
1. Acessar `https://www.gov.br/anpd/pt-br` → **Comunicar incidente**.
2. Preencher formulário com:
   - Descrição do incident
   - Volume estimado de titulares afetados
   - Categoria de dados afetados (e-mail, endereço wallet, histórico de lances)
   - Medidas técnicas adotadas
   - Comunicação aos titulares (link)
3. Anexar timeline do `#incidentes`.

**Prazo: 2 dias úteis** a contar do conhecimento do incident.

#### 3.2 Notificação a usuários

Canais para notificação:
- **E-mail** via Privy (notifica usuários cadastrados via SMTP integrado)
- **Banner** no site (`/index.html` — deploy emergencial com `<div>` no topo)
- **Twitter/X** `@desafiogut` (se conta ativa)

Template mínimo (LGPD-compliant):
```
Assunto: Comunicação de incident de segurança — DesafioGUT

Identificamos em <DATA> um incident envolvendo <CATEGORIA DE DADOS>.
Volume estimado: <N> usuários.
Medidas tomadas: <Lista>.
Recomendação para você: <Reset senha | reativar MFA | etc>.
Estamos comunicando esta situação à ANPD conforme LGPD Art. 48.
Para dúvidas: suporte@desafiogut.com.br
```

Não minimizar nem omitir. Transparência reduz dano reputacional.

#### 3.3 Notificação providers

Se o incident envolve infraestrutura terceira:
- **Privy**: `support@privy.io` se for breach de auth
- **Netlify**: form em `https://www.netlify.com/support/` se for breach de Functions ou Blobs
- **Cloudflare**: ticket no Dashboard se WAF bypass detectado

---

## 3. Canais de comunicação

| Canal | Uso | Quem |
|---|---|---|
| **Slack/Discord `#incidentes`** (criar se ausente) | Timeline operacional do incident | Time interno |
| **E-mail `suporte@desafiogut.com.br`** | Comunicação com usuários (passiva) | Time interno → usuários |
| **Twitter `@desafiogut`** | Banner público de incident em andamento | Marketing/CTO |
| **Privy Dashboard** | Forçar logout de todos os usuários | CTO |
| **Cloudflare Dashboard** | Under Attack Mode, WAF custom rules emergenciais | Oncall |
| **GitHub** | Hotfix branches `hotfix/incident-YYYYMMDD-<slug>` | Oncall |

⚠️ **Não usar e-mail pessoal para timeline** — perdemos histórico e auditoria.

---

## 4. Template de post-mortem

Após o incident estar resolvido (Fase 3 completa ou Severidade Baixa/Média encerrada), escrever post-mortem em até **7 dias**. Salvar em `docs/postmortems/YYYY-MM-DD-<slug>.md`.

```markdown
# Post-mortem: <Título descritivo> (<DATA>)

## Resumo executivo
<2 frases sobre o que aconteceu e o impacto>

## Severidade
<Crítica|Alta|Média|Baixa> — <Justificativa>

## Timeline (UTC)
- HH:MM — Detecção: <fonte>
- HH:MM — Triagem: <SEV definida>
- HH:MM — Contenção iniciada: <ação>
- HH:MM — Contenção completa
- HH:MM — Notificação ANPD (se aplicável)
- HH:MM — Notificação usuários (se aplicável)
- HH:MM — Incident encerrado

## Impacto
- Usuários afetados: <N>
- Dados afetados: <categorias>
- Downtime: <duração>
- Custo financeiro estimado: R$ <X> (reembolsos, créditos, etc.)

## Causa raiz
<Explicação técnica, não-conclusões — 5 Whys se aplicável>

## O que funcionou
- <Item 1>
- <Item 2>

## O que falhou
- <Item 1>
- <Item 2>

## Action items
| # | Descrição | Owner | Prazo |
|---|---|---|---|
| 1 | <Ação preventiva 1> | <Nome> | <Data> |
| 2 | <Ação preventiva 2> | <Nome> | <Data> |

## Lições aprendidas
<O que muda no playbook a partir daqui — atualizar este doc se necessário>
```

---

## 5. Testes semestrais de IR

Para validar que o playbook funciona quando o time precisar, executar **simulação de incident** a cada 6 meses.

### Procedimento de teste

1. CTO escolhe 1 cenário plausível (ex: "credencial admin vazada via phishing").
2. **Sem avisar previamente** o oncall, dispara um alerta forjado no Sentry com a tag do cenário.
3. Cronometra: detecção, triagem, contenção, notificação.
4. Pós-teste: comparar com RTOs da Seção 1; identificar gaps.
5. Registrar resultado em `docs/ir-test-log.md` (criar no 1º teste) com formato:
   ```markdown
   ## Teste IR — 2026-11-15 — Cenário: phishing admin
   - Detecção: 8 min (target < 60min — ok)
   - Triagem: 15 min total
   - Contenção: 42 min total (target < 240min — ok)
   - Gaps encontrados: ninguém sabia como revogar refresh tokens de um admin específico
   - Action item: documentar comando em `_lib/admin-auth.mjs:revogarAdmin` no playbook
   ```

### Calendário sugerido

| Quando | Cenário | Quem testa |
|---|---|---|
| 2026-11 | Credencial admin vazada | Oncall |
| 2027-05 | Exploit em endpoint público | Oncall |
| 2027-11 | DDoS sustentado | Oncall |

---

## 6. Anti-padrões — NÃO fazer durante incident

- **Não** deletar logs/Blobs "para limpar" — destrói evidência forense.
- **Não** rotacionar TODAS as credenciais de uma vez — quebra coordenação. Rotacionar apenas as comprometidas.
- **Não** comunicar publicamente sem incident commander aprovar — boatos pioram a percepção.
- **Não** atribuir culpa individual em post-mortem — foco em sistema, não em pessoa (cultura blameless).
- **Não** pular notificação ANPD por achar "menor" — multa LGPD pode chegar a 2% do faturamento.
- **Não** restaurar de backup sem confirmar que o backup não está comprometido (verificar timestamp pré-incident).

---

## 7. Referências cruzadas

- **MC1** (`_lib/admin-auth.mjs`): `revogarAdmin(endereco)` para revogar refresh tokens
- **MC3** (`audit-admin` Blob): logs de toda ação admin para forense
- **MC3** (`monitor-onchain.mjs`): detecta tx fora do padrão na coordenação
- **MC4** (`docs/cloudflare-waf-setup.md`): rollback WAF e Under Attack Mode
- **MC6** (`docs/disaster-recovery.md`): cenários técnicos (Netlify outage, Alchemy down) complementam IR
- **MC6** (`docs/backup-blobs.md`): restauração de Blobs como parte da contenção
- **MC7** (`docs/mfa-setup.md`): MFA enforce como ação de contenção em comprometimento de credencial
