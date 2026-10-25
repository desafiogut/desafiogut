# UTAC115 — Viabilidade e plano de migração para Netlify Functions v2

Data: 2026-10-25 · Autor: Hermes · **Análise apenas — nenhum ficheiro de produção foi alterado**

## 0. Veredicto em três linhas

1. **A premissa «~120 endpoints por migrar» não corresponde ao código**: existem **93 funções**, e **86 delas já estão escritas no formato v2** (`export default` que recebe `Request` e devolve `Response`).
2. **O que falta não é reescrever 120 ficheiros** — é fazer a Netlify *correr* as funções em v2. Hoje estão a ser construídas em **Lambda compatibility mode**, e é daí que vem o limite de 4 KB.
3. **Só 7 ficheiros estão realmente presos ao modelo antigo**: os *scheduled wrappers* que usam `export const handler = schedule(...)` de `@netlify/functions`.

Recomendação: **avançar para a Fase 1** (desbloqueio do Billing, 1 ficheiro, 1 linha), e só depois decidir a Fase 2 (converter os 7 scheduled + desligar o modo de compatibilidade no site).

---

## 1. Inventário medido (não estimado)

| Métrica | Valor | Comando/origem |
|---|---|---|
| Funções `.mjs` em `netlify/functions/` | **93** | `ls netlify/functions/*.mjs \| wc -l` |
| Com `exports.handler` (CommonJS legado) | **0** | `grep -l "exports.handler"` |
| Com `export default` | **86** | `grep -l "export default"` |
| Com `export const handler` (wrapper v1) | **7** | ver lista abaixo |
| Com `export const config` (marcador v2) | **0** | `grep -l "export const config"` |
| Funções que tocam no Billing | **1** | `grep -l "google-play-billing"` |
| Declarações `schedule =` no `netlify.toml` | **0** | o agendamento vive no wrapper |

**As 7 funções presas ao v1** (todas com `schedule(...)`):
`backup-blobs-scheduled.mjs`, `fila-processor-scheduled.mjs`, `ia-preditiva-scheduled.mjs`,
`monitor-onchain-scheduled.mjs`, `purge-logs-scheduled.mjs`,
`scheduled-anuncio-especial.mjs`, `scheduled-encerrar-especial.mjs`

Exemplo real (`purge-logs-scheduled.mjs:9`):
```js
import { schedule } from "@netlify/functions";
export const handler = schedule("0 3 * * *", async () => { ... return { statusCode: 200 }; });
```

---

## 2. As funções do Billing — padrão actual

### `netlify/functions/validar-compra-google.mjs`
```js
// linha 84
export default async function handler(req) { ... }
```
- **Já é v2-shaped**: recebe `Request`, usa `req.method`, `parseJsonBody(req)`.
- Respostas construídas com `new Response(...)` dentro de `_lib/validate.mjs:105` (`jsonResponse`).
- **Não usa `exports.handler` nem `event.body`.** Não há `context` no handler.

Imports (linhas 29-38): `node:crypto` (createHash), `_lib/cors`, `_lib/validate`, `_lib/jwt`, `_lib/rate-limiter`, `_lib/system-state`, `_lib/sentry-server`, `_lib/passe-pontos`, `_lib/comprar-passe-tipado`, `_lib/google-play-billing`.

### `netlify/functions/_lib/google-play-billing.mjs`
```js
import { importPKCS8, SignJWT } from "jose";
import { getSupabase } from "./supabase-client.mjs";
```
- Assinatura do JWT da service account com **`jose` 5.10.0** (`importPKCS8` + `SignJWT`).
- Cache de token em módulo (`_cacheToken`), sem estado externo.

### Porque é que uma função v2-shaped está a ser construída em modo Lambda?
A mensagem do deploy é explícita:
> `Failed to create function: invalid parameter for function creation: Your environment variables exceed the 4KB limit imposed by AWS Lambda. Please consider reducing them or upgrading from Lambda compatibility mode...`

A AWS Lambda só entra na conversa quando a Netlify embrulha a função no modo de compatibilidade. Conclusão: **o código pede v2, o site entrega v1**. O `netlify.toml` contribui com `[functions] node_bundler = "esbuild"` (legado), e **nenhuma** função declara `export const config` — que é o marcador explícito de v2.

---

## 3. Compatibilidade das dependências com o runtime v2 (Node 18/20/22)

| Dependência | Versão | Veredicto | Nota |
|---|---|---|---|
| `jose` | **5.10.0** | ✅ funciona | A exigência de WebCrypto é da **v6**; a v5 usa `node:crypto` com fallback. Mesmo na v6 o Node 18+ já expõe `crypto.subtle`. |
| `jsonwebtoken` | **ausente** | ✅ não é problema | Não está no `package.json` das functions — a autenticação usa `jose`. Nada a substituir. |
| `@supabase/supabase-js` | 2.108.2 | ✅ | `fetch` nativo no Node 18+; sem `node-fetch`. |
| `ethers` | 6.16.0 | ✅ | Puro JS + WebCrypto/`node:crypto`. |
| `@sentry/node` | ^9 | ✅ com atenção | Inicialização em módulo; em v2 o `context` é diferente, mas o SDK não depende dele. |
| `@netlify/blobs` | ^10 | ✅ (v2-first) | A v10 assume o runtime novo; é o sinal mais claro de que o projecto *quer* v2. |
| `undici` | ^6 | ✅ | Polyfill de `fetch`; em v2 é redundante mas inofensivo. |
| `aws-sdk` | ^2.1693 | ⚠️ funciona, mas pesado | SDK legado, ainda suportado em Node 18+. **Aumenta o bundle** de cada função que o importa; não bloqueia a migração. |
| `@netlify/functions` (`schedule`) | ^3 | ❌ **só v1** | Único ponto realmente incompatível: o wrapper `schedule()` não existe no modelo v2 (lá usa-se `export const config = { schedule: "..." }`). |

**Conclusão de compatibilidade:** nenhuma dependência crítica impede a v2. O único bloqueio técnico é o wrapper de agendamento em 7 ficheiros.

---

## 4. Plano faseado

### Fase 1 — Desbloqueio do Billing (recomendada, ~30-45 min)

**Objectivo:** a função de validação de compras passa a correr em v2 e o limite de 4 KB desaparece *para ela*.

1. Em `validar-compra-google.mjs`, acrescentar **uma linha** (marcador explícito de v2):
   ```js
   export const config = { path: "/.netlify/functions/validar-compra-google" };
   ```
2. Deploy. Verificar dois sinais:
   - o erro `exceed the 4KB limit` **desaparece** do deploy;
   - `POST /.netlify/functions/validar-compra-google` sem sessão continua a devolver **401 token_ausente** (mesmo contrato).
3. Devolver `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` ao scope `functions` e repetir o deploy. Se o limite já não se aplicar, o deploy fica verde **com** a credencial.
4. Teste do Ruan: compra real no AAB v3 → deve deixar de devolver `503 google_play_nao_configurado`.

**Critério de sucesso:** deploy verde com o JSON em `functions` **e** 401 no smoke test **e** compra validada.

**Risco principal:** se a Netlify ignorar o opt-in por ficheiro enquanto o site estiver em modo de compatibilidade, o passo 3 volta a falhar com o mesmo erro. Nesse caso é preciso a Fase 2 **antes** de reintroduzir a credencial.

**Rollback:** apagar a linha `export const config` (1 linha).

### Fase 2 — Conversão dos 7 scheduled + saída do modo de compatibilidade (~4-6 h)

Por esta ordem, para não deixar *crons* silenciosamente mortos:

1. Converter cada wrapper:
   ```js
   // antes (v1)
   export const handler = schedule("0 3 * * *", async () => {...});
   // depois (v2)
   export const config = { schedule: "0 3 * * *" };
   export default async () => { ...; return new Response("ok"); };
   ```
2. Validar cada um com uma invocação manual (`/.netlify/functions/<nome>`), confirmando 200 e efeito.
3. Só então desligar o **Lambda compatibility mode** no site (painel Netlify).
4. Regressão por áreas, com evidência: **auth** (3), **pagamentos/PIX** (comprar*, webhook-mercadopago), **catálogo/produtos**, **admin** (22), **webhooks** (frenet, mercadopago), **crons** (7).
5. Reintroduzir todas as env vars no scope `functions` que hoje foram movidas para `builds` (VITE_* não precisam; o JSON da service account sim).

**Esforço:** conversão dos 7 wrappers 2-3 h; regressão das áreas críticas 2-3 h; total **4-6 h**, em 2 sessões.
**Risco maior:** *crons* a deixar de correr sem erro visível (purge de logs, backup de blobs, monitor on-chain, fila, anúncio/encerrar especial). Mitigação: converter e validar **antes** de desligar o modo.

### Fase 3 (descartável)
Migrar `aws-sdk` v2 → v3 e remover `undici`. Só ganho de bundle; **não** desbloqueia nada. Não recomendo gastar tempo nisto agora.

---

## 5. Estimativas e riscos — resumo

| Fase | Âmbito | Esforço | Risco | Bloqueia o Ruan? |
|---|---|---|---|---|
| 1 | 1 ficheiro, 1 linha, 1 deploy | **30-45 min** | Médio (depende do opt-in ser honrado em modo compat) | **Desbloqueia** |
| 2 | 7 scheduled + flag do site + regressão | **4-6 h** | Alto (crons silenciosos) | Não, se a Fase 1 passar |
| 3 | aws-sdk v3, limpeza | 2-3 h | Baixo | Não |

---

## 6. Recomendação final

**Avançar para a Fase 1.** É a única alteração que resolve o problema do Ruan hoje, mexe num ficheiro e tem rollback de uma linha. Se o opt-in por ficheiro não for honrado em modo de compatibilidade, **parar** e ir para a Fase 2 (converter os 7 wrappers primeiro) — nunca desligar o modo de compatibilidade com os crons ainda em v1.

**Não** fazer uma «migração dos 120 endpoints»: 86 dos 93 já estão no formato certo. O trabalho real são 7 ficheiros.

### O que este relatório NÃO prova
- Não confirmei em documentação oficial qual é o critério exacto que faz a Netlify tratar uma função como v2 quando o site está em compatibilidade (a API do site não expõe nenhum campo `compat`/`runtime`; só `use_functions` e `functions_region`). O passo 1 da Fase 1 é precisamente o teste barato dessa hipótese.
- Não medi o tamanho dos bundles por função (a migração pode alterar o que o esbuild empacota).
- Não testei nenhuma invocação em v2 — não há ambiente de pré-visualização com o modo desligado.


---

## 7. ⚠️ HIPÓTESE DA FASE 1 — REFUTADA NA EXECUÇÃO (2026-10-25, 15:40)

**O que se fez:** acrescentou-se a linha proposta ao `validar-compra-google.mjs`
(`export const config = { path: "/.netlify/functions/validar-compra-google" }`), devolveu-se o
`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` ao scope `functions` e disparou-se o deploy.

**Resultado:** **FALHOU outra vez**, com a mensagem exacta:
> `Failed to create function: invalid parameter for function creation: Your environment variables
> exceed the 4KB limit imposed by AWS Lambda. Please consider reducing them or upgrading from
> Lambda compatibility mode...`

**Conclusão (medida, não suposta):** o marcador `export const config` **por ficheiro NÃO tira a
função do Lambda compatibility mode**. O modo é **do site**, e aplica-se a todas as funções
independentemente do que cada ficheiro declare. A Fase 1, tal como estava desenhada, **não
funciona** — o erro desta análise foi assumir que o opt-in por ficheiro poderia ser honrado;
ficou escrito como «não provado» na secção 6, mas a aposta era errada.

**Rollback executado (deploy VERDE):**
- linha `export const config` removida → `validar-compra-google.mjs` volta a `git diff` limpo;
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` de volta ao scope `builds`;
- deploy publicado às **15:39:44** (READY).

**Consequência para o plano:** a única via para o limite desaparecer é a **Fase 2 completa**
(converter os 7 wrappers `schedule()` e desligar o modo de compatibilidade no site) — não há
atalho por função. Para desbloquear o Billing **hoje**, o caminho mais curto passa a ser o
**UTAC114** (credencial lida do Supabase, que não depende do limite de env vars).
