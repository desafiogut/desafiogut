# Growth Viral — Sistema "Indique e Ganhe"

> Mega Comando 10 · Crescimento por indicação com recompensa on-chain e anti-fraude FingerprintJS + Sybil check.

## Visão geral

Cada usuário do DesafioGUT recebe automaticamente um **código de indicação pessoal** no formato `IND-XXXXXX` (3 letras prefixo + 6 caracteres alfanuméricos maiúsculos). Ao compartilhar esse código, qualquer novo usuário que **realizar sua primeira compra de senha** usando-o gera **+1 senha bônus on-chain** ao indicador (creditada pela coordenação no contrato `LeilaoGUT`).

## Como funciona, na prática

1. **Geração automática.** O código é criado/recuperado no primeiro acesso autenticado ao painel "Indique e Ganhe" (`/carteira`). Idempotente — o mesmo endereço sempre recebe o mesmo código.
2. **Compartilhamento.** Botões `📋 Copiar código` e `📤 Compartilhar` no painel. O segundo usa `navigator.share()` quando disponível (mobile) e cai para clipboard quando não (desktop).
3. **Registro da indicação.** O indicado informa o código no fluxo de cadastro/adesão. O endpoint `POST /referral?acao=usar-codigo` valida, anti-frauda e persiste o vínculo `referral:{codigo}:{indicado}` com status `pendente`.
4. **Conversão = primeira compra.** Quando o indicado executa `POST /comprar-senhas` com sucesso on-chain, o hook MC10 detecta o vínculo, marca `referral-convertido:{codigo}:{indicado}` (idempotente) e chama `concederBonus(indicador)` que credita +1 senha on-chain via `LeilaoGUT.adicionarSenhas(indicador, 1)`.
5. **Painel.** Indicador vê em tempo real: `👥 Indicados`, `✅ Converteram`, `🎁 Senhas ganhas`. Lista de indicados é anonimizada ("Indicado 1", "Indicado 2", ...) para preservar privacidade (LGPD).

## Regras de recompensa

- **+1 senha** por indicação convertida. A senha é creditada **on-chain** pela `coordenacao` — chega à wallet do indicador via mesmo evento `SenhasCreditadas` usado pelas compras normais (UI atualiza automaticamente).
- **Apenas a primeira compra do indicado** dispara o bônus. Recompras do mesmo indicado não geram bônus adicional (idempotência via blob `referral-convertido:{codigo}:{indicado}`).
- **Limite mensal: 10 conversões** por indicador (contador em `referral-monthly:{endereco}:{AAAA-MM}`). Atingido o teto, conversões posteriores são marcadas como convertidas mas **sem bônus** — o indicador volta a receber a partir do próximo mês.

## Anti-fraude

Camadas validadas **antes** de aceitar uma indicação:

| Camada | Reprovação | Status HTTP |
|---|---|---|
| Auto-indicação | `indicador === indicado` (mesmo endereço) | 400 `auto_indicacao` |
| Código inexistente | `IND-XXXXXX` não existe no blob | 404 `codigo_inexistente` |
| Mesmo dispositivo | `visitorId` (FingerprintJS) do indicado coincide com algum endereço já vinculado ao mesmo `visitorId` do indicador | 403 `mesmo_dispositivo` |
| Sybil suspeito | `visitorId` do indicado já vinculado a ≥3 endereços nas últimas 24h (MC3) | 403 `sybil_suspeito` |

Toda rejeição persiste em `referral-fraud:{codigo}:{indicado}` e (exceto auto-indicação/código inválido, que são UX) dispara `Sentry.captureSecurityAlert("referral_fraude", ...)`.

A camada FingerprintJS roda no frontend (`src/lib/fingerprint.js`, MC3) e envia `X-Visitor-ID` no POST `usar-codigo`. O servidor cruza com o store `fingerprint:*` (24h TTL) usado pelo Sybil check.

## Feature flag

- `REFERRAL_ATIVO=on` (default) → endpoints e bônus ativos.
- `REFERRAL_ATIVO=off` → endpoint `/referral` responde 503; o hook em `comprar-senhas.mjs` não concede bônus mesmo se houver vínculo.

Rollback é instantâneo via env var no Netlify Dashboard (sem necessidade de redeploy).

## Endpoints

### `GET /.netlify/functions/referral?acao=meu-codigo&endereco=0x...`

Anti-IDOR: JWT user-session do owner OU admin.

```json
{
  "endereco": "0x...",
  "codigo": "IND-A7K9X2",
  "novo": false,
  "total_indicados": 5,
  "total_convertidos": 2,
  "senhas_ganhas": 2
}
```

### `POST /.netlify/functions/referral?acao=usar-codigo`

Body: `{ "codigo_indicacao": "IND-A7K9X2", "endereco": "0x..." }`
Headers: `Authorization: Bearer <user-session>`, `X-Visitor-ID: <fingerprint>` (recomendado).

```json
{
  "sucesso": true,
  "idempotent": false,
  "codigo": "IND-A7K9X2",
  "indicador": "0xindicador...",
  "indicado": "0xindicado..."
}
```

## Armazenamento (Netlify Blobs)

| Store | Chave | Conteúdo | Retenção |
|---|---|---|---|
| `referral-codes` | `referral-code:{endereco}` | `{codigo, criadoEm}` | indefinida |
| `referral-codes` | `referral-code-reverso:{codigo}` | `{endereco, criadoEm}` | indefinida |
| `referral-links` | `referral:{codigo}:{indicado}` | vínculo + status | indefinida |
| `referral-links` | `referral-convertido:{codigo}:{indicado}` | conversão + txHash | indefinida |
| `referral-links` | `referral-fraud:{codigo}:{indicado}` | motivo da rejeição | 90 dias (sugerido) |
| `referral-bonus` | `referral-bonus:{endereco}` | histórico + total | indefinida |
| `referral-bonus` | `referral-monthly:{endereco}:{AAAA-MM}` | contador mensal | 13 meses (sugerido) |

> Os TTLs sugeridos devem ser implementados no `purge-logs.mjs` (MC3) em uma próxima onda. Hoje, os dados ficam indefinidamente.

## Rate limit

`/referral` aceita até **5 reqs/min/IP** (mesma postura defensiva dos endpoints sensíveis de MC1). Excedido → 429 `rate_limit_excedido` com header `Retry-After`.

## Integração frontend

- Painel `src/components/PainelIndicacao.jsx` montado em `/carteira` (entre `VoucherPanel` e `BannerUpload`).
- `visitorId` enviado em `X-Visitor-ID` é o mesmo cacheado em `localStorage.gut_visitor_id` pelo FingerprintJS (MC3).
- Compartilhamento gera link `${origin}/?ref=IND-XXXXXX` que o frontend pode interpretar futuramente (ex.: pre-fill no formulário de cadastro).

## Observabilidade

- Console log estruturado: `[referral] *`, `[comprar-senhas] referral check`.
- Sentry tags: `referral_fraude`, `referral_bonus_falhou`.
- Para auditar conversões: `netlify blobs:list referral-links --prefix=referral-convertido:`.
