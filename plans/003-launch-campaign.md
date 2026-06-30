# Plan 003: Campanha de lançamento do DESAFIOGUT (E-mail + WhatsApp)

> **Executor instructions**: Este é um plano de OPERAÇÃO/MARKETING (não de código). A
> maioria dos passos é `[OPERADOR]` (ferramentas de disparo, LGPD/opt-in, conteúdo).
> Execute na ordem; cada passo tem um critério de verificação objetivo. Se uma "STOP
> condition" ocorrer (ex.: base sem opt-in válido), pare e reporte. Ao terminar,
> atualize a linha em `plans/README.md`.
>
> **Drift check**: este plano não toca código; o único insumo do repo é a definição de
> segmentos (perfis). Confirme que os perfis abaixo ainda existem antes de segmentar.

## Status
- **Priority**: P2 (amplifica o lançamento; só faz sentido APÓS o produto estar em produção real)
- **Effort**: M (conteúdo + setup de ferramenta + 4 semanas de execução)
- **Risk**: MED (LGPD/anti-spam: disparo sem opt-in válido gera bloqueio/penalidade; reputação)
- **Depends on**: Plan 001 (produto em mainnet) e idealmente Plan 002 (link da Play Store no CTA)
- **Category**: direction (go-to-market)
- **Planned at**: commit `e842d4b`, 2026-06-30

## Why this matters
Lançar sem um plano de comunicação desperdiça o momento. A base do DESAFIOGUT tem perfis
distintos (lojista vs. usuário comum vs. lead) que exigem mensagens diferentes. Disparo
mal-feito (sem opt-in, mesma mensagem para todos) queima a reputação do remetente e fere a
LGPD. Este plano define segmentação, ferramentas, cronograma e métricas para um lançamento
medido e ajustável.

## Current state (segmentos derivados do produto)
- O app distingue perfis em `desafio-gut/frontend/src/context/AppContext.jsx` →
  `tipoUsuario` ∈ {`"corporativo"` (lojista), `"comum"`}; derivado da store `cotas`.
- **Lojistas (corporativo):** cadastram-se em `SejaNossoParceiro.jsx` (POST `cotas?action=register-corporativo`) — fornecem **email + CNPJ + empresa**. Fonte de contatos B2B.
- **Usuários comuns:** login via Privy (Google/email) — email disponível via Privy; consentiram ao gate LGPD (TermosConsentimento) no 1º acesso.
- **Leads:** ainda não cadastrados (redes sociais, indicações via programa "Indique e Ganhe" — `referral`).
- Política de privacidade pública: `https://www.iubenda.com/privacy-policy/DESAFIOGUT` (usar no rodapé de todo e-mail). Suporte: `desafiogut01@gmail.com`; WhatsApp `(92) 98428-5774` (CLAUDE.md/regulamento).
- **NÃO** há, no repo, exportação de contatos pronta — a extração da base (emails corporativos do Supabase, emails Privy) é tarefa `[OPERADOR]` (R12: Supabase via CLI/service_role; nunca expor segredos — R10).

## Tools (escolher 1 de disparo; recomendação)
| Necessidade | Recomendado | Alternativas |
|---|---|---|
| E-mail em massa + automação | **Brevo** (ex-Sendinblue; bom free tier, BR-friendly, double opt-in) | ActiveCampaign, Mailchimp |
| WhatsApp (oficial, em escala) | **WhatsApp Business API** via BSP (ex.: Brevo/Twilio/360dialog) com **templates aprovados** | SocialHub, Zenvia |
| WhatsApp (pequeno volume) | WhatsApp Business app (manual, listas de transmissão) | — |
> **Regra dura WhatsApp:** mensagens proativas exigem **template HSM aprovado** pela Meta e **opt-in** do destinatário. Disparo fora disso = ban do número.

## Steps

### Step 1 — `[OPERADOR]` Extrair e segmentar a base (com base legal LGPD)
Extrair 3 listas, cada uma só com contatos que **consentiram** (opt-in/gate LGPD):
- **A — Lojistas:** emails corporativos (Supabase store `cotas`, perfil `corporativo`) + WhatsApp se coletado.
- **B — Usuários comuns:** emails Privy de quem aceitou os termos.
- **C — Leads:** contatos de redes/indicações com opt-in explícito.

**Verify**: 3 CSVs com coluna de consentimento (data/origem do opt-in). **STOP se um segmento não tiver prova de opt-in** — não disparar para ele.

### Step 2 — `[OPERADOR]` Higienizar contatos
Validar e-mails (sintaxe + verificação de entregabilidade, ex.: ferramenta do próprio Brevo) e
números WhatsApp (formato E.164, +55). Remover duplicados, inválidos e hard-bounces históricos.

**Verify**: taxa de inválidos < 5% por lista; lista de supressão (descadastros) criada e respeitada.

### Step 3 — `[OPERADOR]` Configurar a ferramenta de disparo
- E-mail: autenticar o domínio remetente (**SPF, DKIM, DMARC**) — sem isto, vai para spam. Configurar double opt-in para novos leads. Rodapé com link de descadastro + política de privacidade.
- WhatsApp: conectar o número via BSP, submeter os **templates HSM** (Step 5) para aprovação da Meta.

**Verify**: e-mail de teste chega à Inbox (não spam) com SPF/DKIM "pass" (ver cabeçalhos); templates WhatsApp com status "Aprovado".

### Step 4 — Cronograma de 4 semanas (teaser → lançamento → follow-up)
| Semana | Fase | E-mail | WhatsApp |
|---|---|---|---|
| 1 | Teaser + Educação | "Algo novo vem aí" + "Como funciona o menor lance único" | Teaser curto (template) |
| 2 | Expectativa + Incentivo | Conta regressiva + benefício (ex.: senhas bônus 1ª compra) | Lembrete de expectativa |
| 3 | **Lançamento** | "Está no ar!" + CTA (app/site + link Play Store se Plan 002 pronto) | Anúncio de lançamento + CTA |
| 4 | Follow-up + Reativação | Caso de uso/depoimento; reengajar quem não abriu | Lembrete final + suporte |

Por segmento: **A (lojistas)** foca ROI/visibilidade (cotas, banners, vitrine); **B (comuns)** foca a emoção do leilão + "Indique e Ganhe"; **C (leads)** foca educação + prova social.

**Verify**: calendário com data/hora por envio e por segmento aprovado pelo operador; sem sobreposição que gere fadiga (máx ~2 e-mails/semana por contato).

### Step 5 — Templates de mensagem (por segmento)
Produzir e versionar os textos (e-mail HTML + WhatsApp HSM). Diretrizes de marca: tom do GUTO
(amigável, frases curtas — ver `cloud.md`/persona), CTA único e claro por mensagem, sem promessa de
ganho garantido (compliance). Incluir variáveis (nome, segmento). Guardar os textos em um doc do
operador (não no repo, salvo se versionarem em `plans/assets/`).

**Verify**: ≥1 template por (fase × segmento × canal) revisado; WhatsApp dentro das categorias HSM (marketing/utility) aprovadas.

### Step 6 — `[OPERADOR]` Disparo faseado + A/B
Começar por um **piloto (5–10% da lista)** para validar entregabilidade e CTR antes do envio total.
A/B testar assunto/CTA. Respeitar horários (evitar madrugada) e a janela de 24h do WhatsApp para sessões.

**Verify**: piloto enviado; métricas do piloto dentro do alvo (Step 7) antes do envio em massa.

### Step 7 — Métricas e ajuste pós-campanha
Acompanhar por segmento/fase:
- **E-mail:** entrega, **abertura** (alvo ≥25% B2C, ≥30% B2B), **clique/CTR** (alvo ≥3%), descadastro (< 0,5%), spam-complaint (< 0,1%).
- **WhatsApp:** entrega, leitura, clique no CTA, opt-out.
- **Conversão (norte):** cadastros novos, 1ª compra de senhas, lojistas que contrataram cota — atribuir via UTM nos links (`?utm_source=email&utm_campaign=lancamento`).

**Verify**: dashboard/planilha consolidada por segmento; relatório de ajustes (o que repetir/cortar) escrito ao fim das 4 semanas.

## Done criteria (ALL must hold)
- [ ] 3 segmentos extraídos COM prova de opt-in (LGPD).
- [ ] Domínio de e-mail autenticado (SPF/DKIM/DMARC "pass"); templates WhatsApp aprovados pela Meta.
- [ ] Calendário de 4 semanas executado (teaser→lançamento→follow-up) por segmento.
- [ ] Piloto validado antes do envio em massa; UTMs em todos os links.
- [ ] Relatório final de métricas (abertura/CTR/conversão) por segmento + plano de ajuste.
- [ ] `plans/README.md` status row atualizado.

## STOP conditions
- Um segmento sem prova de opt-in válido → não disparar para ele (risco LGPD/ban).
- Spam-complaint > 0,3% ou bounce alto no piloto → pausar, higienizar, revisar conteúdo antes do envio total.
- Número WhatsApp sinalizado/limitado pela Meta → pausar WhatsApp, seguir só por e-mail.
- Produto ainda não em produção real (Plan 001 incompleto) → adiar a fase de "Lançamento" (Semana 3).

## Maintenance notes
- Manter a lista de supressão (descadastros) sincronizada entre ferramentas — reenviar a quem optou por sair é violação.
- Reaproveitar os melhores templates como fluxos automatizados (boas-vindas, carrinho/lance abandonado) pós-campanha.
- Próxima iteração: integrar eventos do produto (RUM/analytics já existente — `lib/analytics.js`) para gatilhos comportamentais; tratar como plano separado.
- Sem assets de marca versionados no repo: se a equipe quiser versioná-los, criar `plans/assets/` (fora do código).
