# UTAC110i.2 — SEG1 · FRENTE B: a flag `isPagamentoNativoAtivo` no Android

## O que estava desligado — e em QUANTOS sítios (medido)

O SEG-1 mostrou que a flag tem **duas** fontes possíveis e que a produção usa **as duas** para
públicos diferentes:

| caminho | quem o usa | onde lê | valor medido ANTES |
|---|---|---|---|
| Supabase directo (`config_remota:recursos_app`) | frontend quando tem `VITE_SUPABASE_*` — **o PWA em produção E o APK construído no SEG2** (correcção de uma medição minha: ver a ERRATA do SEG-1 §-1.3) | `useRecursosApp.js:108-119` | `isPagamentoNativoAtivo.android = false` |
| Função `/.netlify/functions/recursos-app` | clientes sem as `VITE_*` **e o fallback do APK** quando a leitura do Supabase falha | `recursos-app.mjs` → `getConfig("recursos_app")` → **Blob** `config-experiencia` | Blob **vazio** ⇒ `DEFAULT_RECURSOS_APP` ⇒ `false` |

⇒ ligar a chave num sítio só não chegava para cobrir os dois caminhos possíveis. **Foram corrigidos os
dois** (o enunciado previa «config remoto»; o medido é «duas cópias, uma por caminho»).

## O que foi escrito (produção) — e como se repõe

### 1. Supabase `config_remota` (chave `recursos_app`)

```
ANTES  (backup: _logs/UTAC110i.2_SEG1_BACKUP-config_remota-ANTES.json, md5 b4aef292…)
  isLeilaoAtivo:          { ios:false, pwa:true,  android:false }
  isPagamentoNativoAtivo: { ios:false, pwa:false, android:false }   ← atualizado_em 2026-06-21

DEPOIS (leitura de confirmação: _logs/UTAC110i.2_SEG1_BACKUP-config_remota-DEPOIS.json)
  isLeilaoAtivo:          { ios:false, pwa:true,  android:false }   ← INTACTO
  isPagamentoNativoAtivo: { ios:false, pwa:false, android:true  }   ← única chave alterada
  atualizado_em: 2026-10-18T12:27:12Z
```

Operação: `PATCH /rest/v1/config_remota?chave=eq.recursos_app` com o **objecto completo** (a coluna
`valor` é JSONB e o PATCH substitui-a — enviar só a chave apagaria `isLeilaoAtivo`). Resposta
HTTP **200** com a linha devolvida (`Prefer: return=representation`). Payload exacto guardado em
`_logs/UTAC110i.2_SEG1_patch.json`.

**Repor** = `PATCH` com o conteúdo do ficheiro `…-ANTES.json` (está no repo, com o md5 registado).

### 2. Netlify Blob `config-experiencia:recursos_app` (o caminho do APK)

Estava **vazio** (`netlify blobs:list config-experiencia` → «store is empty»). Escrito com o
`valor` do bloco acima (`netlify blobs:set config-experiencia recursos_app --input …`, resposta
«Success»); conteúdo em `_logs/UTAC110i.2_SEG1_blob-recursos_app.json`.
**Repor** = `netlify blobs:delete config-experiencia recursos_app` (volta ao estado «vazio», que é o
estado medido antes).

### Porque é que escrever o Blob foi seguro (e não mudou mais nada)

O objecto escrito é **igual ao `DEFAULT_RECURSOS_APP` em todas as chaves menos uma**
(`isPagamentoNativoAtivo.android`): `isLeilaoAtivo` continua `{ios:false, pwa:true, android:false}`.
Logo o caminho da função, que antes respondia «defaults», responde agora «defaults + o Billing do
Android ligado». `chatbot.mjs` (o outro consumidor de `resolverRecursos`) lê as mesmas chaves e vê
exactamente os mesmos valores.

## Prova em PRODUÇÃO (três chamadas reais, depois da escrita)

```
GET /…/recursos-app?plataforma=pwa
  {"plataforma":"pwa","isLeilaoAtivo":true,"isPagamentoNativoAtivo":false,…}

GET /…/recursos-app?plataforma=android
  {"plataforma":"android","isLeilaoAtivo":false,"isPagamentoNativoAtivo":true,…}   ← LIGADA

GET /…/recursos-app?plataforma=ios
  {"plataforma":"ios","isLeilaoAtivo":false,"isPagamentoNativoAtivo":false,…}
```

`isLeilaoAtivo` inalterado nos três. **A flag liga no Android e só no Android.**

## Prova no código (o que fica fixado)

| teste | o que fixa |
|---|---|
| `(f)` | APK Android ⇒ o cliente pede `?plataforma=android` (URL medido) e recebe a flag `true` |
| `(f.2)` | controlo negativo: o APK antigo pedia `?plataforma=pwa` e recebia `false` |
| `(g)` | o outro ramo (Supabase) devolve o mesmo `true` |
| `(h)` | com a config REAL de produção antiga (`android:false`) a flag **continua false** ⇒ o detetor sozinho não liga nada: são **duas** condições |
| `(i)` | PWA intocado: com `android:true` na config, no browser a flag é `false` |
| `(j)` | paridade cliente/servidor nas três plataformas |
| `(m)` | sem config (fallback local) fica `false` — fail-safe declarado |

O teste `(h)` é a prova de que a frente A **não** é suficiente sozinha: sem o valor na config, o
detector correcto devolve `plataforma:"android"` com `isPagamentoNativoAtivo:false`. Foi por isso
que as duas frentes tiveram de ser feitas juntas.

## Efeito hoje (declarado, para não se ler o verde como «já vende»)

- **PWA**: nada muda (chave `pwa` = `false`, como antes).
- **APK actualmente distribuído**: nada muda — o bundle em campo tem o detetor antigo, logo pede
  `?plataforma=pwa`. O efeito começa quando for distribuído um APK com o bundle novo.
- ⚠️ **Sequência obrigatória**: um APK com o bundle novo **antes de A1-A4** (produtos no Play
  Console + service account) não consegue vender — a loja devolve `produto_indisponivel` ao fim de
  15 s. Com a Frente C (PIX desligado no APK) isso significa **zero compras no APK** até A1-A4.
  Registado como bloqueio de lançamento, não como defeito do código.
