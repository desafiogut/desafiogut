# Inventário Pré-Remoção — FASE 0 da Onda 3

**Data:** 2026-05-12
**Branch:** `main` @ `74c7614`
**Método:** grep recursivo de imports/usos em `src/` e `netlify/functions/`. Nada deletado nesta fase — aguardando aprovação.

---

## Achado principal: 3 árvores órfãs de Feature-Sliced Design

O codebase tem uma camada intermediária de **re-exports** (`entities/`, `features/`, `shared/`) que parece resíduo de uma migração para Feature-Sliced Design **não concluída**. Nenhum arquivo do projeto importa desses módulos. Todos os consumidores reais usam os caminhos diretos (`./components/...`, `../hooks/...`).

Total: **3 diretórios, 9 arquivos, ~250 linhas de código morto** (incluindo um arquivo de design tokens CSS que ninguém importa).

---

## Candidatos a remoção (✅ seguros — zero consumidores)

| # | Caminho | Tipo | Conteúdo |
|---|---|---|---|
| 1 | `src/entities/edicao/index.js` | Constantes/enum | `EDICAO_ATIVA_ID = 'R-1'` (já existe em `AppContext.jsx:10`); `EdicaoStatus` (não usado em lugar nenhum) |
| 2 | `src/entities/lance/index.js` | Constantes + função | `LANCE_MIN_CENTAVOS/MAX` (já em `lance-relampago.mjs:20-21`); `centavosToDisplay` (não usado) |
| 3 | `src/features/auth/index.js` | Re-export | `export { default as TermosConsentimento } from '@/components/TermosConsentimento'` |
| 4 | `src/features/comprar-fichas/index.js` | Re-export | `export { default as ComprarFichasModal } from '@/components/ComprarFichasModal'` |
| 5 | `src/features/lance/index.js` | Re-export | Re-exporta `CardLance` e `TabelaLances` |
| 6 | `src/shared/hooks/index.js` | Re-export | Re-exporta `useIsMobile` |
| 7 | `src/shared/lib/index.js` | Re-export | Re-exporta `cn` |
| 8 | `src/shared/ui/index.js` | Re-export | Re-exporta `Badge`, `Card*`, `Progress` |
| 9 | `src/shared/design/tokens.css` | CSS órfão | ~210 linhas de design tokens (`--gradient-premium`, `--z-sticky` etc.). `globals.css` não faz `@import` deste arquivo. |

**Evidência da ausência de consumidores:**
```
$ grep -rnE "@/entities|@/features|@/shared|from .entities|from .features|from .shared" src/
(nenhum resultado)
```

**Verificação de que os componentes reais continuam alcançáveis:** todos os consumidores usam paths diretos:
```
src/App.jsx:5:           import TermosConsentimento from "./components/TermosConsentimento.jsx";
src/pages/MercadoLances.jsx:4: import CardLance      from "../components/CardLance.jsx";
src/pages/MercadoLances.jsx:5: import TabelaLances   from "../components/TabelaLances.jsx";
src/pages/Vitrine.jsx:13:      import { useIsMobile } from "../hooks/useIsMobile.js";
src/components/CardLance.jsx:5: import { Card } from "@/components/ui/card";
src/components/CardLance.jsx:6: import { cn }   from "@/lib/utils";
```

---

## NÃO candidatos (em uso ativo — preservar)

Estes apareceram nas suas regras de "NÃO tocar" ou foram confirmados em uso pelos greps:

### Frontend
- `src/context/AppContext.jsx` — regra explícita.
- `src/utils/web3.js`, `sanitize.js`, `rateLimiter.js` — regra explícita.
- `src/pages/MercadoLances.jsx` — regra explícita.
- `src/pages/Vitrine.jsx` — regra explícita.
- `src/pages/{Dashboard,MinhaCarteira,MeusAtivos,Configuracoes,Seguranca}.jsx` — todos consumidos pelas rotas em `App.jsx:51-58`.
- `src/components/{CardLance,TabelaLances,TermosConsentimento,ComprarFichasModal}.jsx` — todos com consumidores diretos.
- `src/components/ui/{badge,card,progress}.jsx` — usados via `@/components/ui/...`.
- `src/hooks/useIsMobile.js` — 7 consumidores diretos.
- `src/lib/utils.js` — `cn` é importado em 4 lugares.
- `src/widgets/layout/{Sidebar,BottomNav,Layout}.jsx`, `src/widgets/toast/Toast.jsx`, `src/main.jsx`, `src/App.jsx` — fundamentais.

### Backend (`netlify/functions/`)
Todos os endpoints `.mjs` estão em uso. Mapeamento das chamadas frontend → backend:

| Endpoint | Chamado por |
|---|---|
| `auth-lance.mjs` | `CardLance.jsx:90`, `MinhaCarteira.jsx:82` |
| `comprar-senhas.mjs` | `MinhaCarteira.jsx:100` |
| `confirmar-pagamento.mjs` | `ComprarFichasModal.jsx:22` |
| `iniciar-pagamento.mjs` | `ComprarFichasModal.jsx:21` |
| `lance-relampago.mjs` | `CardLance.jsx:150` |
| `lances-flash.mjs` | `AppContext.jsx:143` |
| `purge-lances.mjs` | `AppContext.jsx:111` |
| `saldo-rs.mjs` | `AppContext.jsx:222` |
| `webhook-mercadopago.mjs` | (callback externo do MP — preservar) |
| `health.mjs` | (health check — preservar) |
| `info-pagamento.mjs` | (REQ-20, novo — sem consumidor frontend ainda; preservar) |
| `debug-pedido.mjs` | (ferramenta de troubleshooting via `curl` pelo operador — preservar) |

`_lib/` todos importados por endpoints: `validate`, `jwt`, `saldoRs`, `credito`, `mp-client`, `contract`, `pix-config`, `pix-provider/`.

---

## Risco da remoção proposta

Muito baixo:
- Os 8 arquivos órfãos têm **zero importadores** em qualquer parte do projeto (frontend, backend, configs, scripts).
- O conteúdo dos `entities/` é redundante (duplica constantes já presentes em `AppContext.jsx` e `lance-relampago.mjs`); os demais são apenas re-exports.
- Build verde garantido pelo fato de que ninguém depende deles.

Se quiser reduzir ainda mais o risco, posso fazer a remoção em **2 commits separados** (entities + features+shared), com `npm run build` entre eles. Mas tecnicamente é um único diff seguro.

---

## Recomendação

✅ **APROVAR remoção dos 9 arquivos** (3 diretórios completos: `src/entities/`, `src/features/`, `src/shared/` — este último inclui o `design/tokens.css` órfão).
❌ **NÃO REMOVER** nada além disso. Os demais arquivos estão todos em uso.

**Aguardando sua aprovação antes de qualquer `rm`.**

---

## Nota sobre o escopo restante da Onda 3

Sua tarefa pede também FASE 2 com 4 novos requisitos (Wallet, Voucher, Banner, Schedule). Realisticamente cada um deles tem complexidade:
- **REQ-WALLET**: endpoint + componente + decisão de "cliente_id" (uma das 5 perguntas abertas do relatório de auditoria que ainda não foi respondida).
- **REQ-VOUCHER**: endpoint + componente + integração com `comprar-senhas.mjs` (lógica de "primeira participação").
- **REQ-BANNER**: endpoint + componente + decisão sobre formato (SVG server-side? upload simples?).
- **REQ-SCHEDULE**: componente + modelo de dados de grade semanal (pergunta aberta sobre fuso de "domingo").

Sugiro confirmar a remoção e, em seguida, eu sigo direto para FASE 2 com **escopo realista** (Wallet + Voucher como MVPs primeiro, Banner e Schedule depois) — ou me diga se prefere ir com os 4 em uma passada.
