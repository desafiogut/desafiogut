# UTAC107c — SEG7 Validador adversarial

**Despachado:** subagente independente (Claude Code), worktree `C:/Users/Moltbot/tmp-107c-val/wt` @ `fc06e0a` (helper A13, 4 junctions),
instruído a **TENTAR REFUTAR**. 1.ª tentativa interrompida pelo limite de uso (sem veredicto); 2.ª tentativa completa (25 chamadas, ~4 min).

## Veredicto (transcrito do relatório do validador)

**APROVADO COM RESSALVAS** — nenhuma das hipóteses (a)–(l) foi refutada; uma ressalva real na hipótese extra
(«0 / 50» prematuro durante um commit na sequência real de login/refresh).

- (a) «Senhas» ainda existe → refutado (`saldoSenhas*`, `senhasStat`, `statusSuffix` removidos; teste `\bSenhas\b` ausente).
- (b) número mostra senhas → refutado (só `usePontos()`; teste injecta `saldoSenhas: 7` e o 7 não aparece).
- (c) clique vai à Carteira → refutado (`to: "/ofertas-programadas"`; teste lê a fonte; mutação "/carteira" morde).
- (d) KPIs removidos/alterados → refutado (linhas intactas, ordem dos 4 tiles testada).
- (e) card 🏆 no Início → refutado (removido, grelha `1fr`; `vencedorExibido` continua a chegar ao `FimEdicaoOverlay`, que tem guarda própria l.31; teste de contagem 0 no Início / 1 no overlay). A guarda DEBT-012 morreu com o card, sem perda real.
- (f) texto antigo do depósito → refutado (0 ocorrências fora de testes; `CardLance` converte mesmo, l.174).
- (g) total em vez de `pontosCartao` → refutado.
- (h) texto fora de vidro → refutado (saudação, tiles, slot, «Outras Edições» em `GlassCard`, «Acesso Rápido»; resto = excepções).
- (i) Carteira/MLC/OP partiram → refutado (diff toca só 5 ficheiros; suíte verde).
- (j) backend → refutado (diff vazio). (k) `.bak-*` → refutado. (l) suíte → **VERDE 778/778 · 1061/1067**.

**Testes não vácuos:** 8 mutações próprias (backup em %TEMP%, restauro sha256) — todas derrubam o teste certo.
**Contraste** (vidro composto ~#0C1132): valor `#f5a623` 9,09:1; rótulo `#6b7db8` 4,61:1 (AA, à justa; cor pré-existente).

| # | Grav. | Achado | Tratamento (executor) |
|---|---|---|---|
| V1 | ⚠️ | «0 / 50» prematuro durante 1 commit: sem par `address`+`authToken` o `usePontos` devolve VAZIO com `loading:false`; quando o par fica completo (login; **refresh com token em cache e `address` depois**) há um commit antes de o efeito pôr `loading:true` → estado «vazio». O stub fixa `loading` e não modela a transição. | **Corrigido** em `5ce939b`: `estadoPasse(memo, …)` pura, exportada; depois de par incompleto ou de outro par só aceita números quando o hook mostrar `loading:true` para o par actual. +5 testes de sequência; mutantes M8/M9 RED. |
| V2 | ℹ️ | Troca de conta: endereço novo com token antigo podia mostrar pontos de A (não medido). | **Coberto** pelo mesmo `memo` (mudança de par ⇒ espera pelo `loading:true`); teste «troca de conta». Respostas fora de ordem no `refetch` = pré-existente no hook (fora do escopo). |
| V3 | ℹ️ | Comentário do stub dizia «DISTINTOS por omissão» (BASE tem os dois a 0). | **Corrigido** (`5ce939b`). |
| V4 | ℹ️ | `pontosCartao` não numérico ⇒ «NaN / 50». | **Corrigido**: não inteiro/negativo ⇒ «erro» («—»); mutante M10 RED. |
| V5 | ℹ️ | Saldo e Passe ambos dourados (o roxo das senhas saiu, correctamente). | Declarado — é o mockup A aprovado. |

**Não medido (declarado pelo validador):** render real com efeitos (sem jsdom — o frame prematuro foi deduzido do código e do ciclo do React);
visual no browser/APK; AppContext na troca de conta render a render.
**Worktree no fim:** `git status --porcelain` vazio, HEAD `fc06e0a`.

**Correcções pós-veredicto (`5ce939b`): NÃO re-validadas** por 2.ª ronda (GATE 11 — declarado).
