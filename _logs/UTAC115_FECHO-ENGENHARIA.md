# UTAC115 — Fecho da fase de engenharia e handoff operacional

Data: 2026-10-25 · Hermes (Frentes B, C, D) + Opus 5.5 (Frente A)
Estado: **ENGENHARIA ENCERRADA** com duas dívidas declaradas (DEBT-078 alta, DEBT-080 média).
Nada em produção depende de trabalho de engenharia pendente para o **teste fechado**.

---

## 1. Resumo das auditorias

### Frente A — código (Opus 5.5, read-only) · **APROVADO COM RESSALVAS**
Refutação aos três commits da fase: `142ffd1` (UTAC111 PIX de produto), `095afbe` (UTAC112
compra múltipla), `739dc8f` (UTAC114 credencial via Supabase). Nada bloqueante **nos commits**;
dois furos de Billing **pré-existentes** (`49eca175`), que o UTAC114 tornou alcançáveis:

| ID | Achado | Estado |
|---|---|---|
| ALTO-1 | Corrida entre contas: o mesmo recibo creditado em várias carteiras | ✅ **CORRIGIDO neste UTAC** (409 na colisão com endereço diferente + teste + mutante) |
| ALTO-2 | Compra nunca consumida no servidor ⇒ reembolso com crédito retido | ⏳ **DEBT-078 / UTAC116** — antes de promover para Produção |
| MÉDIO-1 | Cache da credencial sem TTL/invalidação | ⏳ **DEBT-080** |
| BAIXO 1-3 | Erro do Supabase mascarado como «não configurado»; teste T7 frágil; grants em `google_play_compras`; `search_path` do trigger; cabeçalho do endpoint | registados na auditoria (`_logs/UTAC115_AUDITORIA.md`) |

**Verificado pelo Opus e não derrubado:** replay do mesmo token · recibo de outra conta
sequencial (409) · estados pending/cancelado · SKU divergente · quantidade sempre do recibo
(>100 não credita) · PIX com token assinado e `approved` confirmado · RLS de `config_secrets`
medido em produção · env inválida não cai para o banco · contrato 400/401/405/409/503.

### Correção do ALTO-1 (feita aqui)
`validar-compra-google.mjs` — no ramo de colisão `23505`:
- se o registo relido pertence a **outra** carteira ⇒ **409 `compra_nao_encontrada`** + alerta de
  segurança (mesmo tratamento da leitura inicial; não revela o dono);
- se a colisão não deixa reler o registo ⇒ **503 `registo_falhou`** (fail-closed; creditar às
  cegas era o buraco).
- teste novo: *«CORRIDA ENTRE CONTAS: o mesmo recibo, duas carteiras em paralelo ⇒ 409»*;
- prova de mutação: guarda removida ⇒ teste **RED** (mutante morto, md5 restaurado).

### Frente B — infra (Hermes) · **LIMPA**

| Item | Resultado |
|---|---|
| HEAD local | `739dc8f` (+ commit do ALTO-1 no fecho) |
| `origin/main` | sincronizado (0 à frente / 0 atrás no momento da auditoria) |
| Working tree | 8 rastreados pré-existentes + docs desta fase (não é código de produto) |
| Último deploy Netlify | **ready**, commit `739dc8f`, publicado 16:08:29 |
| Supabase `config_secrets` | RLS activo · política única SELECT→`service_role` · JSON presente (2 037 B) · **anon = 401** |
| Suíte canónica | **frontend 1258/1258 · backend 1434/1440 · VERDE** |

---

## 2. Arquitectura no fecho

- **Billing Google Play** — `validar-compra-google.mjs` (v2-shaped, a correr em compat mode):
  valida o recibo na Google, credita **N** Passes (quantidade do RECIBO, nunca do corpo),
  idempotente por `ref` de carteira, fail-closed em 400/401/409/503.
  Credencial: env var → **tabela `config_secrets`** (RLS, só `service_role`) → cache em memória.
- **PIX / produto físico** — token de pagamento assinado no servidor, `approved` confirmado no
  Mercado Pago, `marcarPedidoPago` com CAS e valor exacto. PIX não vive no APK (UTAC111).
- **Compra múltipla** — 1/3/5/10 Passes, preço 200 × N pontos, ecrã e servidor concordam.
- **Segredos** — nada de JSON de service account em env vars (limite de 4 KB da AWS Lambda);
  a chave vive na BD, protegida por RLS, com `anon` a receber 401 (medido).

---

## 3. Artefactos prontos

| Artefacto | Onde | Integridade |
|---|---|---|
| AAB v3 (final) | `Desktop\DesafioGUT-v3\DesafioGUT-v3.aab` | 32 419 569 B · versionCode 3 · SHA-256 `460d13bb1edb423dcc24219f30996ee490e011c5d81eac910a29529e8688ef6d` · `jar verified` |
| Relatórios da fase | mesma pasta (`RELATORIO-UTAC113/114/115.txt`) | — |
| Auditoria completa | `_logs/UTAC115_AUDITORIA.md` | — |
| Plano da migração v2 | `_logs/UTAC115_PLANO-MIGRACAO-V2.md` | — |
| Checklist da loja | `_logs/UTAC113_CHECKLIST-LOJA.md` | — |

---

## 4. Checklist do Ruan (nesta ordem)

1. **Subir o AAB v3** em Play Console → *Teste interno* → *Criar nova versão* → upload de
   `DesafioGUT-v3.aab` (versionCode **3**).
2. Confirmar os dois produtos com **Multi-quantity activo**: `passe_relampago_r2` (R$ 2,00) e
   `passe_programado_r2` (R$ 2,00).
3. **License Testing**: garantir que a conta de teste está na lista (compra sem cobrança real).
4. Instalar pelo link do teste interno e comprar **1 Passe** → tem de creditar +10 pontos de
   fidelidade, +200 pontos de lance e ECOQUILDO, e **não** debitar saldo R$.
5. Repetir com **3 ou 5 unidades** → o crédito tem de ser N × os benefícios.
6. Tentar comprar de novo o **mesmo** recibo (fechar e reabrir a app) → resposta idempotente,
   nada creditado duas vezes.
7. **Só depois** de 4-6 verdes: promover para Produção — e nesse momento a **DEBT-078 (UTAC116)
   tem de estar fechada**, porque em produção há dinheiro real e reembolso possível.
8. Se aparecer `503 google_play_nao_configurado`: é permissão da service account
   `desafiogut-play-billing` no Play Console (tem de ter acesso à app), não o código.

---

## 5. Dívidas registadas no fecho

- **DEBT-078 (alta)** — compra não consumida no servidor ⇒ reembolso com crédito retido.
  **UTAC116, antes de Produção.**
- **DEBT-079 (média)** — site inteiro em Lambda compatibility mode; migração v2 faseada
  (7 wrappers `schedule()` primeiro). Pós-lançamento.
- **DEBT-080 (média)** — cache da credencial do Billing sem TTL nem invalidação.

---

## 6. Limites deste fecho

- O ALTO-1 foi corrigido e provado por teste + mutante, mas **não** foi explorado contra o
  ambiente real (exigiria duas carteiras com sessão e um recibo real).
- O caminho completo *compra → validação na Google → crédito* só fica provado no teste do Ruan.
- A auditoria do Opus correu com RAM abaixo do portão A14 (1 209 → 1 483 MB); declarado por ele.
- `_logs/UTAC115_AUDITORIA.md` mantém a ressalva original mesmo depois de o ALTO-1 estar
  corrigido: o registo do que foi encontrado não se reescreve.
