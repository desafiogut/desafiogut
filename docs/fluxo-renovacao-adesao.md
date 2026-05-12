# Fluxo de Renovação de Adesão (REQ-03)

**Endpoint:** `POST /.netlify/functions/renovacao-adesao`
**Componente UI:** `src/components/RenovacaoCard.jsx` (integrado em `MinhaCarteira`)
**Persistência:** Blob `renovacao-adesao:{cliente_id}`

---

## Visão geral

| Etapa | Quem | Como |
|---|---|---|
| 1. Solicitar | Cliente | Botão "Solicitar renovação" no `MinhaCarteira` → cria registro `pendente` |
| 2. Pagar PIX | Cliente | Vê chave PIX `familiaquildo@gmail.com` exibida pelo card |
| 3. Confirmar | Admin | POST com `x-admin-token` → status `ativa` por `ADESAO_DIAS` dias (default 30) |
| 4. Vencendo | Sistema | Quando faltar ≤ 7 dias, status calculado = `vencendo` (visual amarelo) |
| 5. Vencida | Sistema | Após validade, status calculado = `vencida` (visual vermelho); cliente pode renovar |

## Estados

| Status | Significado | Origem |
|---|---|---|
| `nao-iniciada` | Nunca solicitou renovação | derivado (sem blob) |
| `pendente` | Solicitou mas admin ainda não confirmou pagamento | persistido |
| `ativa` | Pagamento confirmado, dentro da validade | persistido + calculado |
| `vencendo` | Ativa mas ≤ 7 dias do fim | calculado on-read |
| `vencida` | Passou da validade | calculado on-read |

## Contratos

### `GET ?cliente_id=0x...`
Público. Retorna:
```json
{
  "cliente_id": "0x...",
  "status": "ativa",
  "dias_restantes": 22,
  "registro": {
    "cliente_id": "0x...",
    "status": "ativa",
    "valor_brl": 660,
    "solicitadoEm": "2026-05-12T...",
    "confirmadoEm": "2026-05-12T...",
    "validade": "2026-06-11T...",
    "historico": [{"em":"...","de":"nao-iniciada","para":"pendente","por":"cliente","valor":660}, ...]
  },
  "pix": { "email": "familiaquildo@gmail.com", "banco": "Banco do Brasil", "modo": "manual", ... },
  "duracao_dias_padrao": 30
}
```

### `POST { acao: "solicitar", cliente_id, valor }`
Sem token. Cria/idempotente atualiza registro `pendente`. Erro `409 ja_ativa` se já está ativa (evita renovação dupla).

### `POST { acao: "confirmar", cliente_id }`
Header `x-admin-token`. Marca `ativa`, gera `validade = agora + ADESAO_DIAS`. Erro `409 nao_pendente` se não está pendente.

## Testes via curl

```bash
URL="https://silly-stardust-ca71bc.netlify.app"
TOKEN="seu-admin-token"
ENDERECO="0xDa3a83A24b25aa71e1a9b5A74503fFA93487e84E"

# 1. Status inicial (sem registro)
curl -s "$URL/.netlify/functions/renovacao-adesao?cliente_id=$ENDERECO" | head -c 300
# → { status: "nao-iniciada", pix: { email: "familiaquildo@gmail.com", ... } }

# 2. Cliente solicita renovação
curl -s -X POST "$URL/.netlify/functions/renovacao-adesao" \
  -H "Content-Type: application/json" \
  -d "{\"acao\":\"solicitar\",\"cliente_id\":\"$ENDERECO\",\"valor\":660}" | head -c 300
# → { status: "pendente", ... }

# 3. Admin confirma após PIX recebido
curl -s -X POST "$URL/.netlify/functions/renovacao-adesao" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $TOKEN" \
  -d "{\"acao\":\"confirmar\",\"cliente_id\":\"$ENDERECO\"}" | head -c 300
# → { status: "ativa", validade: "...", dias_restantes: 30 }

# 4. Re-solicitação no mesmo dia: 409 ja_ativa
```

## Configuração

| Env | Default | Descrição |
|---|---|---|
| `ADESAO_DIAS` | `30` | Duração da adesão após confirmação |
| `ADMIN_TOKEN` | (obrigatório) | Para confirmar pagamento. Ver `docs/configuracao-admin-token.md` |

## Limitações do MVP

- Detecção automática do PIX recebido **não** implementada — depende de confirmação manual via `acao=confirmar` (admin). Em produção, integrar com o webhook do Banco do Brasil seria a evolução natural.
- "Aviso de vencimento" no card é puramente visual (cor + texto). Notificação push/email não-escopada.
- Valor da renovação fixo em R$ 660 no `RenovacaoCard.jsx` (alinhado com mínimo Bronze). Para valores diferentes por categoria, futuro: consultar cota do cliente e usar `valor_minimo_cota` correspondente.
