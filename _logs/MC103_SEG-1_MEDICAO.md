# MC103 — SEG-1 · MEDIÇÃO

Data: 2026-09-30 · HEAD `fd68c8a` (main; baseline do enunciado `ebeae13` + 1 commit doc-only do MC102.1b)

## -1.1 Suíte (harness `scripts/mc966-suite-harness.mjs ambos`, foreground)
```
frontend: VERDE 508/508 pass
backend: VERDE 788/794 pass
VEREDITO: VERDE
```
Bate com o enunciado.

## -1.2 `_lib/recursos-app-config.mjs`
- Exporta `PLATAFORMAS`, `DEFAULT_RECURSOS_APP`, `normalizarPlataforma`, `resolverRecursos(config, plataforma)`.
- `DEFAULT_RECURSOS_APP` (l.18-21): `isLeilaoAtivo {ios:false, android:false, pwa:true}`,
  `isPagamentoNativoAtivo {ios:false, android:false, pwa:false}` — **mapas por plataforma**.
- `resolverRecursos` lê cada chave do config; se a chave faltar ou não for objecto, cai no default; devolve `Boolean(mapa[plat])`.
- **Não há `getConfig` neste ficheiro** — `getConfig` vive em `_lib/data-store.mjs` (facade). O enunciado diz
  "ajustar o `getConfig`"; o ponto de extensão real é `resolverRecursos`. `data-store.mjs` NÃO é tocado.
- EOL: índice git **LF** (`attr eol=lf`); cópia de trabalho CRLF (checkout com `autocrlf=true`). O commit normaliza.

## -1.3 `recursos-app.mjs`
- `GET ?plataforma=` → `jsonResponse(resolverRecursos(config, plataforma))`. O output **é** o objecto devolvido
  pelo resolvedor → qualquer chave nova em `resolverRecursos` aparece automaticamente. **Nenhuma alteração necessária.**

## -1.4 `src/lib/leilaoLock.js`
- **Premissa do enunciado falsa:** o ficheiro NÃO lê flags. É a trava de apresentação `EM_BREVE_MODE = true` (MC67).
- Quem lê as flags no cliente é `src/hooks/useRecursosApp.js` (não autorizado neste MC). Tem **espelho próprio**
  (`resolverParaPlataforma` + `fallbackLocal`) que devolve só as 2 chaves actuais e lê o Supabase **directamente**
  (`config_remota`) quando `VITE_SUPABASE_*` está definido — portanto não passa por `resolverRecursos`.
- Consumidores de `resolverRecursos`: `recursos-app.mjs` e `chatbot.mjs:1427` (este só lê `.isLeilaoAtivo`).

## -1.5 Supabase (só SELECT)
- Backend de dados em produção: `DATA_STORE_BACKEND=supabase` (`netlify env:get --context production`).
- `config_remota`: 1 linha, `chave=recursos_app`, `valor` JSONB com **só** `isLeilaoAtivo` e `isPagamentoNativoAtivo`
  (valores = iguais ao default). Actualizado em 2026-06-21.
- `saldo_rs` (8 linhas; `cliente_id`, `payload jsonb {centavos,…}`), `saldo_rs_creditos` (21), `saldo_rs_debitos` (0).
- Bónus MC93-F: **não há tabela "dívidas"** — a dívida é `rankings_ciclo` (`senhas_a_creditar`, `bonus_emitido`,
  `liquidado_em`). 0 linhas. `pontuacoes` 0 linhas.
- `wallet` (0 linhas), `wallet_idem` (0), `troco_senhas` (0).

## -1.6 On-chain
- Contrato `0x0052477A…16cd` (produção: `CONTRATO_SEPOLIA` termina em `16cd`), Ethereum mainnet.
- RPC **público** `ethereum-rpc.publicnode.com` (evita tocar em `RPC_URL`, que contém chave — R5).
- `eth_chainId=0x1`, `getCode` 9648 chars, `saldoSenhas(0x0)=0` → leitura OK.
- `saldoSenhas` é mapping (não enumerável) → titulares via eventos `SenhasCreditadas` + `LanceDado`.

## -1.7 Vale-Crédito
- **Premissa parcial:** o Vale-Crédito vive no Supabase `wallet` (MC36.1); o Blob `wallet` é só fallback legado de leitura.
- Blob `wallet`: **0 chaves**. Controlo positivo com o mesmo comando: `edicoes-metadata`=5 → o zero é real.
- Achado lateral: Blob legado **`saldo-rs` tem 5 chaves** (`saldo-rs-creditos` 8). `lerSaldoRsCentavos` faz
  `getSaldo() ?? lerSaldoLegado()` → estes saldos continuam vivos para quem não tem linha no Supabase.
  Ler o conteúdo NÃO está autorizado neste MC (só `wallet:`) → **lacuna declarada** no SEG1.

## -1.8 Disco
`C: 238G, 14G livres` (≥ 5 GB).

## Discrepâncias com o enunciado
| # | Enunciado | Medido |
|---|---|---|
| D1 | `leilaoLock.js` lê as flags no cliente | Não lê; o leitor é `useRecursosApp.js` (não autorizado) |
| D2 | "ajustar o `getConfig`" | `getConfig` está em `data-store.mjs`; extensão real = `resolverRecursos` |
| D3 | Vale-Crédito = Blob `wallet:` | Primário = Supabase `wallet`; Blob = fallback legado |
| D4 | Dívidas de bónus = tabela MC93-F | `rankings_ciclo.senhas_a_creditar` com `liquidado_em IS NULL` |
| D5 | Flags novas com default escalar (`true`, `5`) | Flags actuais são mapas por plataforma → ver interpretação no SEG0 |

## Veredito SEG-1: **SEGUIR**
Nenhuma discrepância bloqueia; todas mudam só *onde* se toca, não *o quê*.
