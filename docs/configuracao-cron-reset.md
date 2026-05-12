# Configuração — Reset automático às 00:00 (REQ-10)

**Endpoint:** `POST /.netlify/functions/cron-reset-programado`
**Aplica-se a:** leilão **Programado** (Ouro/Diamante · ciclos de 24h).
**Modo:** MVP off-chain — apura vencedor a partir do snapshot off-chain de lances do programado, persiste resultado, limpa estado local. **Re-abertura on-chain segue manual pela coordenação.**

---

## 1. Pré-requisitos

- `ADMIN_TOKEN` configurado no Netlify Env (ver `docs/configuracao-admin-token.md`).
- (Opcional) `RESET_TIMEZONE` no Netlify Env — default `America/Sao_Paulo`. Define o "dia" da idempotência: dois POSTs no mesmo dia (data ISO no fuso) retornam `idempotent:true`.

## 2. Comportamento

```
POST /.netlify/functions/cron-reset-programado
Header: x-admin-token: <token>

Response 200:
{
  "ok": true,
  "idempotent": false,
  "edicaoId": "R-1",
  "dataIso": "2026-05-12",
  "resultado": {
    "apuradoEm": "...",
    "qtdLances": 42,
    "vencedor": { "endereco": "0x...", "valorCentavos": 1234, "txHash": "..." },
    "snapshot": [...]
  }
}
```

**Idempotência:** chamadas repetidas no mesmo dia (no fuso config.) retornam `{ ok:true, idempotent:true }` **sem reprocessar**. Reset do dia é registrado em `blob:ultimo-reset-programado/{edicaoId}`.

**Dry-run** (`GET ?dryRun=1`): retorna o que seria feito **sem persistir**. Útil para validar antes de plugar o cron.

## 3. Opção A — GitHub Actions (gratuita)

`.github/workflows/cron-reset-programado.yml`:

```yaml
name: cron-reset-programado
on:
  schedule:
    # 00:00 America/Sao_Paulo == 03:00 UTC
    - cron: "0 3 * * *"
  workflow_dispatch: {}      # permite disparo manual via UI
jobs:
  reset:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger cron-reset-programado
        run: |
          curl -fsS -X POST "https://silly-stardust-ca71bc.netlify.app/.netlify/functions/cron-reset-programado" \
            -H "x-admin-token: ${{ secrets.ADMIN_TOKEN }}" \
            -H "Content-Type: application/json" \
            -w "\nHTTP_STATUS:%{http_code}\n"
```

Configure `secrets.ADMIN_TOKEN` em **Repository settings → Secrets and variables → Actions → New repository secret**.

## 4. Opção B — cron-job.org (gratuita, sem GitHub)

1. Crie conta em https://cron-job.org
2. **Create cronjob:**
   - Title: `DesafioGUT — reset programado 00:00`
   - URL: `https://silly-stardust-ca71bc.netlify.app/.netlify/functions/cron-reset-programado`
   - Schedule: **Every day at 03:00 UTC** (= 00:00 America/Sao_Paulo)
   - Request method: **POST**
   - **Advanced → Headers:**
     - `x-admin-token: <seu token>`
3. **Save**. Use o painel para ver execuções e logs.

> Aviso: cron-job.org tem rate-limit no plano gratuito; aceitável para 1 execução/dia.

## 5. Opção C — Netlify Scheduled Functions (Netlify built-in)

Se o site usa o plano que inclui Scheduled Functions, dá pra agendar nativo:

`netlify.toml`:

```toml
[functions."cron-reset-programado"]
  schedule = "0 3 * * *"   # 00:00 America/Sao_Paulo
```

Limitação: scheduled function **não recebe headers customizados** (não dá pra mandar `x-admin-token` por aqui). Para usar essa rota, seria preciso refatorar o endpoint para validar via assinatura/hmac em vez de header — fora do escopo desta onda. Por enquanto, prefira **Opção A ou B**.

## 6. Teste manual

```bash
TOKEN="seu-admin-token"
URL="https://silly-stardust-ca71bc.netlify.app/.netlify/functions/cron-reset-programado"

# Dry-run: vê o que seria feito sem persistir
curl -s "$URL?dryRun=1" \
  -H "x-admin-token: $TOKEN" | head -c 500

# Execução real (1ª vez do dia)
curl -s -X POST "$URL" \
  -H "x-admin-token: $TOKEN" | head -c 500
# → { "ok":true, "idempotent":false, "edicaoId":"R-1", "dataIso":"YYYY-MM-DD", "resultado":{...} }

# 2ª execução no mesmo dia: idempotente
curl -s -X POST "$URL" \
  -H "x-admin-token: $TOKEN" | head -c 200
# → { "ok":true, "idempotent":true, ... }
```

## 7. O que esse endpoint NÃO faz (limites do MVP)

- ❌ **NÃO** chama `apurarVencedor()` no contrato (off-chain only).
- ❌ **NÃO** chama `abrirEdicao()` para a nova rodada (manual via coordenação).
- ❌ **NÃO** mexe nos lances do **flash** (apenas no `programado`).

Para fechar o ciclo com TX on-chain seria necessário:
1. Adicionar `creditarVencedor`/`apurar`/`abrirEdicao` ao backend `_lib/contract.mjs`.
2. Configurar `PRIVATE_KEY` da coordenação no Netlify Env.
3. Implementar retry com backoff para falhas RPC e gas spikes.
4. Decidir política de gas (paga sempre? cap em wei?).

Cada um desses tópicos é uma onda em si. Decisão: deixar para fase Admin/Gov.

## 8. Onde os resultados ficam

| Blob | Conteúdo |
|---|---|
| `resultado-programado:R-1:YYYY-MM-DD` | Snapshot completo + vencedor apurado off-chain. Histórico permanente. |
| `ultimo-reset-programado:R-1` | `{ ultimaDataIso, ultimoEm, qtdLancesApurados, vencedorEndereco }` — flag de idempotência. |
| `lances-programado:R-1` | **Apagado pelo reset.** Próximas rodadas começam vazias. |
