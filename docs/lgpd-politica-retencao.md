# Política de Retenção LGPD — DesafioGUT

> Atualizado em: 2026-05-15 (Mega Comando 3)
> Controlador: Grupo União e Trabalho — CNPJ 23.040.066/0001-00

Este documento formaliza a política de retenção de dados pessoais e a base legal aplicável a cada categoria, em conformidade com a Lei nº 13.709/2018 (LGPD).

## 1. Categorias de dados e prazos

| Categoria | Blob/store ou origem | Retenção | Base legal | Justificativa |
|---|---|---|---|---|
| **Logs de auditoria** | `audit-*`, `lance-idem`, `admin-audit` | **13 meses** | Marco Civil da Internet, art. 15 | Obrigação legal de manter logs de acesso por 6 meses; estendemos a 13 meses para correlação anual de incidentes. |
| **Dados contábeis (PIX)** | `pedidos`, `webhook-mercadopago-*`, `info-pagamento-*` | **10 anos** | Decreto 8.539/2015 + Código Civil art. 1.183 | Comprovação fiscal de operações financeiras (cobrança e crédito on-chain). |
| **Dados de sessão** | `rate-limit:*`, `jwt-fail-counter:*`, `admin-refresh:*` | **30 dias** | Legítimo interesse (art. 7, IX) | Detecção de fraude e proteção do serviço; expira automaticamente. |
| **Consentimento LGPD** | `consent-log:*` | **5 anos** | Cumprimento do art. 7, I + art. 8 §6º | Comprova que o titular aceitou o tratamento; preservado mesmo após inatividade. |
| **Dados de identificação Privy** | E-mail/Google/Apple do usuário (off-chain Privy) | Enquanto durar a relação | Execução de contrato (art. 7, V) | Necessário para autenticação. Removido em até 30 dias após pedido de exclusão. |
| **Endereço on-chain + lances** | Sepolia testnet (`LeilaoGUT`) | **Imutável** | Natureza da blockchain | Dados imutáveis na rede pública; titular é informado no termo de consentimento. |
| **Fingerprint anti-Sybil** | `fingerprint:{visitorId}` | **24 horas** | Legítimo interesse (art. 7, IX) | Detecção de farming/Sybil; janela curta minimiza retenção de identificador comportamental. |

### 1.1. Exclusão de conta — o que se apaga, o que se pseudonimiza, o que se retém

A tabela do §1 define **prazos**. Esta secção define o **destino de cada categoria quando o titular
pede a exclusão da conta** (implementado no UTAC110j.1; o ecrã de exclusão lista isto ao utilizador):

| Dados | Destino na exclusão | Porquê |
|---|---|---|
| Conta, e-mail, identificadores, atividade, notificações, sessões, consent-log | **APAGADOS** | sem obrigação de retenção |
| `palpites`, `pontuacoes`, `rankings_ciclo`, cotas, `wallet`, saldo em R$ | **APAGADOS** | sem obrigação de retenção |
| Código e vínculos de indicação **do próprio titular** | **APAGADOS** | sem obrigação de retenção |
| Vínculo de indicação de um **terceiro** em que o titular é o indicador | **PSEUDONIMIZADO** (só o campo `indicador`) | o vínculo é do terceiro; apagá-lo destruiria dado alheio |
| Registos de pagamento PIX e Google Play | **PSEUDONIMIZADOS** (endereço → hash derivado) | prova fiscal — 10 anos |
| `resgates` (entrega do cartão: morada com nome, **CPF**, CEP, logradouro) | **PSEUDONIMIZADOS** — a morada passa a «[Conta Deletada]»; data, produto e valor ficam | prova de entrega / obrigação contabilística |
| `eco_quildo` (saldo e histórico com lastro em R$) | **PSEUDONIMIZADO** (titular → identificador derivado; o lastro fica) | passivo contabilístico da Associação |
| `passes`, `cotas_pagas`, `fila_tarefas`, `wallet_idem` | **PSEUDONIMIZADOS** no conteúdo pessoal | registo da operação |
| Logs de auditoria de edições (`auditoria`) | **PSEUDONIMIZADOS** (o endereço sai do evento) | Marco Civil, art. 15 — 13 meses |
| Lances de uma edição **ainda em curso** | **RETIDOS** com a carteira até a edição fechar | apurar a edição; o ecrã avisa quantos |
| Dados on-chain (`LeilaoGUT`) | **RETIDOS** (imutáveis) | natureza da blockchain |

**Pseudonimização não é anonimização** (ANPD): nos registos pseudonimizados o dado continua a ser
pessoal e o titular mantém os direitos do art. 18 — incluindo pedir informação, correção e oposição
ao Encarregado (DPO, §5). O hash usado é derivado do endereço da carteira, que é **público**: quem
conhecer a carteira pode recalcular o identificador. É por isso que o texto não promete anonimato.

**Fora do alcance do fluxo por endereço (declarado):** `cota_fingerprints` (chave `visitor_id`) não é
atingível pela exclusão por carteira — pendência registada em DEBT-050.

## 2. Procedimentos automatizados

### 2.1. Purge programado

A função `netlify/functions/purge-logs.mjs` percorre os blobs acima e remove entradas vencidas. Disparo recomendado: diário às 03:00 (cron externo / GitHub Actions). Endpoint:

```
POST /.netlify/functions/purge-logs           # executa
GET  /.netlify/functions/purge-logs?dryRun=1  # lista sem deletar
```

Autenticação: admin-JWT ou `x-admin-token`. Idempotente.

### 2.2. Exportação de dados (LGPD art. 18)

A função `netlify/functions/exportar-dados.mjs` retorna em JSON único todos os dados pessoais do titular:

```
POST /.netlify/functions/exportar-dados
Headers: Authorization: Bearer <user-session>
Body:    { "endereco": "0x..." }
```

A autorização é granular: o próprio titular (owner) ou um admin podem disparar. Resposta inclui: saldo R$, wallet, cotas, adesão, vouchers, lances on-chain do endereço, registros de consentimento.

### 2.3. Direitos do titular

O titular pode solicitar, conforme art. 18 da LGPD:
- **Confirmação e acesso** (art. 18, I/II): atendido por `exportar-dados`.
- **Correção** (art. 18, III): contato com a coordenação (e-mail no termo).
- **Anonimização/eliminação** (art. 18, IV/VI): solicitado por e-mail; executado em até 15 dias úteis, exceto dados sob retenção legal (linha 2 da tabela acima).
- **Portabilidade** (art. 18, V): JSON retornado por `exportar-dados` é o formato oficial.

## 3. Consent log

Toda interação que exige consentimento explícito (`TermosConsentimento.jsx`) grava em `consent-log:{timestamp}:{endereco}` com:

```json
{
  "endereco":   "0x…",
  "aceiteEm":   "2026-05-15T19:33:00.000Z",
  "termoVersao": "v2026-05",
  "ip":          "203.0.113.10",
  "userAgent":   "Mozilla/5.0 …"
}
```

Esse registro **prova a base legal (art. 7, I)** e é mantido por 5 anos. A coleta ocorre em endpoints que lidam com financeiro (`comprar-senhas`).

## 4. Notificação de incidentes (art. 48)

Eventos de segurança capturados pelo Sentry (`security_alert` tags: `rate_limit`, `jwt_failures`, `sybil_suspect`, `onchain_burst`, `onchain_outlier`) são tratados como sinal de potencial incidente. Procedimento:

1. Análise em até 24h do disparo.
2. Se confirmado vazamento ou comprometimento, notificação à ANPD + titulares em até 2 dias úteis.
3. Registro do incidente em log de auditoria com retenção mínima de 5 anos.

## 5. Pontos de contato

- **Encarregado de Dados (DPO): Francisco Canindé Marinho** — `dpo@grupouniaoetrabalho.com.br`
  (alternativa: `contato@grupouniaoetrabalho.com.br` com o assunto «DPO»)
  · Designado por **R18-110k.1-DPO** (2026-10-17), nos termos do art. 41 da LGPD.
  · Identidade e contacto divulgados publicamente: aqui, na Política de Privacidade
    da app e na página de exclusão de conta.
- Coordenação operacional: gerenciada pelo address `coordenacao()` no contrato `LeilaoGUT`.

## 6. Histórico de versões

| Versão | Data | Mudança |
|---|---|---|
| 1.0 | 2026-05-15 | Versão inicial — Mega Comando 3 (Sentry alerts + purge-logs + exportar-dados + fingerprint anti-Sybil). |
| 1.1 | 2026-10-17 | **DPO designado e divulgado** (art. 41): Francisco Canindé Marinho — `dpo@grupouniaoetrabalho.com.br` (R18-110k.1-DPO). Deixa de estar «a designar». |
| 1.3 | 2026-10-17 | **Secção 1.1 — política de exclusão por tabela**: o documento passa a dizer o que acontece a `resgates` (morada com CPF → «[Conta Deletada]»), `eco_quildo`, `palpites`, `passes`, `cotas_pagas`, `fila_tarefas`, `wallet_idem` e `auditoria`. Antes desta data a política só definia prazos e não cobria a entrega do cartão. |
| 1.2 | 2026-10-17 | **Pseudonimização ≠ anonimização** (ANPD): onde o identificador é hash de dado público, o texto passa a dizer «pseudonimizado» e a declarar que o registo continua a ser dado pessoal, com os direitos do art. 18. |
