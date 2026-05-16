# Backup de Blobs Netlify — Operação

> Mega Comando 6 / Item 2. Atualizado em 2026-05-16.

Backup automatizado dos Blob stores críticos do DesafioGUT, executado diariamente como Scheduled Function. Cobre os cenários de **corrupção pontual de chave** e **deleção acidental** (LGPD purge ou rollback de um pedido). Não cobre perda total da conta Netlify — para isso, ver Fase 2 (S3).

---

## 1. Visão geral

| Item | Valor |
|---|---|
| Trigger | Scheduled Function — `0 2 * * *` UTC (23:00 BRT do dia anterior) |
| Função | `desafio-gut/frontend/netlify/functions/backup-blobs.mjs` |
| Cron wrapper | `desafio-gut/frontend/netlify/functions/backup-blobs-scheduled.mjs` |
| Destino (Fase 1) | Blob store `backups`, chave `backup:YYYY-MM-DD` |
| Destino (Fase 2) | AWS S3 (a configurar — Seção 4) |
| Retenção | 30 dias (GC automático ao final de cada run) |
| Stores cobertos | `audit`, `audit-admin`, `lance-idem`, `pedidos`, `webhook-mp`, `consent-log`, `admin-refresh`, `fingerprint` |
| Stores excluídos | `rate-limit`, `jwt-fail-counter` (ephemeral), `backups` (recursão), `purge-logs-meta` |

Cada execução produz **um JSON único** com o seguinte schema:

```jsonc
{
  "criadoEm": "2026-05-16T02:00:00.000Z",
  "versao": 1,
  "stores": {
    "audit":      { "<key>": <valor original>, ... },
    "pedidos":    { "<key>": <valor original>, ... },
    "...": "..."
  }
}
```

---

## 2. Operação manual (admin)

Mesmo padrão MC1 (admin JWT ou `ADMIN_TOKEN` legado + rate limit). Útil para:
- Forçar backup antes de uma operação destrutiva (purge manual, schema change).
- Listar backups disponíveis para escolher restauração.

### Listar backups disponíveis

```bash
curl -sS -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://app.desafiogut.com.br/.netlify/functions/backup-blobs
```

Resposta:
```json
{ "ok": true, "total": 14, "backups": ["backup:2026-05-16", "backup:2026-05-15", ...] }
```

### Forçar backup imediato

```bash
curl -sS -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://app.desafiogut.com.br/.netlify/functions/backup-blobs
```

Resposta inclui `key`, `totalKeys`, `totalBytes`, `duracaoMs`, `gc`, e `stores[]` com status de cada store.

---

## 3. Restauração manual (Fase 1)

Não há endpoint de restore — é operação rara e destrutiva, deve ser feita por código one-off. Procedimento:

1. **Identificar o backup**:
   ```bash
   curl -sS -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://app.desafiogut.com.br/.netlify/functions/backup-blobs
   # escolher uma chave, ex: "backup:2026-05-14"
   ```

2. **Download local** (Netlify CLI):
   ```bash
   netlify blobs:get backups "backup:2026-05-14" > backup-2026-05-14.json
   ```

3. **Restaurar uma chave específica** (via Netlify CLI):
   ```bash
   # Extrair valor da chave que se quer restaurar:
   jq '.stores.pedidos["pedido:abc123"]' backup-2026-05-14.json > pedido-abc123.json

   # Repor no store original:
   netlify blobs:set pedidos "pedido:abc123" --input pedido-abc123.json
   ```

4. **Restaurar um store inteiro** (caso raro — deleção em massa):
   Script auxiliar em `scripts/restore-store.mjs` (a criar quando for necessário pela primeira vez). Padrão:
   - Ler o JSON do backup
   - Para cada `key` em `dump.stores.<nome>`, chamar `store.setJSON(key, valor)`
   - Idempotente: substitui chaves existentes

---

## 4. Fase 2 — Upload para AWS S3 (futuro)

Quando o projeto crescer além do beta e a recuperação fora do ecossistema Netlify virar requisito, adicionar upload para S3. Não está implementado neste MC.

### 4.1 Pré-requisitos

- Bucket S3 dedicado: `s3://desafiogut-backups` (região `us-east-1` ou `sa-east-1` para latência).
- Bucket Policy: bloqueio público total, versionamento ativado, lifecycle de 90 dias para Glacier Deep Archive.
- IAM role/user com permissão mínima:
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::desafiogut-backups/*", "arn:aws:s3:::desafiogut-backups"]
    }]
  }
  ```
- Credenciais como variáveis Netlify:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`
  - `S3_BACKUP_BUCKET`

### 4.2 Mudança no código

Adicionar dependência:
```bash
cd desafio-gut/frontend/netlify/functions && npm install @aws-sdk/client-s3
```

Em `backup-blobs.mjs`, após `await backupStore.setJSON(key, dump);`, adicionar bloco:
```js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

if (process.env.S3_BACKUP_BUCKET) {
  const s3 = new S3Client({ region: process.env.AWS_REGION });
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BACKUP_BUCKET,
    Key: `${key}.json`,
    Body: JSON.stringify(dump),
    ContentType: "application/json",
    ServerSideEncryption: "AES256",
  }));
}
```

Fail-soft: se S3 falhar, log mas não aborta — backup primário em Blobs já está persistido.

---

## 5. Verificação periódica (mensal)

Para validar que o backup é **realmente recuperável**, executar mensalmente:

1. Listar backups (Seção 2).
2. Escolher 1 backup arbitrário, baixar via CLI (Seção 3.2).
3. `jq '.stores | keys' backup-xxxx.json` — confirmar que os 8 stores estão presentes.
4. `jq '.stores.pedidos | length' backup-xxxx.json` — sanity de contagem.
5. Restaurar 1 chave de teste em um Blob de staging e verificar que retorna íntegra.
6. Registrar resultado no log de DR (a criar em `docs/dr-test-log.md` no primeiro teste).

---

## 6. Limitações conhecidas

| Limite | Mitigação |
|---|---|
| Blob individual ≤ 5 GB (Netlify) | Stores atuais bem abaixo (kBs); revalidar se algum store crescer muito |
| Run com >10 min é killed (Netlify Functions limit) | Stores cobertos são pequenos; com 8 stores e leituras paralelizadas via `for-await`, ficar abaixo de 1 min |
| Backup só captura snapshots — não cobre lance perdido entre runs | RPO 24h é aceito; lances on-chain têm fonte autoritativa em Sepolia (recuperáveis via event log) |
| Recursão `backups → backup` | Resolvida — `backups` está explicitamente fora de `STORES_PARA_BACKUP` |
