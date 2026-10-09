# UTAC109f — SEG3 · Validador adversarial (verbatim)

Worktree `C:/Users/Moltbot/tmp-109f-val/wt` em `f8c622e` (A13). Escrito pelo validador; copiado sem edição.

# UTAC109f — Veredicto do validador adversarial independente

**Alvo:** `f8c622e` (baseline `731ec28`) · worktree `C:/Users/Moltbot/tmp-109f-val/wt` · 2026-10-09
**Veredicto: APROVADO COM RESSALVAS — 0 bloqueantes no comportamento; 2 ⚠️ na garantia de teste**

O comportamento entregue resistiu a todas as tentativas de refutação: ordem, tiles, reutilização do cartão, P1/P2/P4, contraste, toque e suíte.
O que caiu foi parte da **garantia**:
- a P1 não tem teste na aba OP;
- a guarda que existia sobre os tiles foi apagada;
- a cópia do placeholder pode ser trocada por dados inventados sem que nenhum teste falhe.

## Alegações (a)–(k)

| # | Alegação | Veredicto | Evidência |
|---|---|---|---|
| a | Ordem dos 6 blocos | ✅ confirmada | JSX `Dashboard.jsx`: header c/ `CarrosselGUTO` → `<section>` KPIs → `vidros-inicio` (MLC, OP) → `acessos-rapidos` → `vencedores`. Mutante F6 (troca) → RED. Ambos os screenshots mostram essa ordem. |
| b | 4 tiles intocados (diff zero) | ✅ confirmada (diff) / ⚠️ guarda | `git diff 731ec28 f8c622e`: nenhum hunk em `stats`/`passeStat`/`StatTile`/secção KPIs. **Mas** o diff APAGA a asserção do 107g `label: "Saldo (R$)"…to: "/carteira"`. Meus mutantes V2 (Saldo → `/mercado`) e V3 (cor de «Lances Únicos») **sobrevivem** (fail=0). |
| c | Cartão do 109e reutilizado | ✅ confirmada | Dashboard usa `CartaoEdicao` + `acao`; não há componente novo. As mudanças no próprio cartão são aditivas: vazio por acção, cápsula condicional ao `id`, faixa com `flex-wrap`. |
| d | P1 corrigida na fonte, sem efeitos laterais | ✅ comportamento / ⚠️ teste | `montar(estado, edicao)`: só ATIVA + `tipo==="programado"`. Ver detalhe abaixo. |
| e | P2 no Início e na aba OP, sem editar `OfertasProgramadas.jsx` | ✅ confirmada | `OfertasProgramadas.jsx` fora do diff. A aba OP monta `<CartaoEdicao vazio acao="palpite">` sem `mensagemVazio` e herda «Sem edições programadas no momento.». A frase é igual à original em `6c0436c:321`. Testes nos dois ecrãs. Meu V9 (ajuda trocada) → RED. |
| f | Screenshots reais com os blocos | ✅ confirmada (ℹ️ alcance) | `inicio-375.png` (750×4600) e `inicio-1280.png` (2560×5200) mostram os 6 blocos, os cartões vazios com GUTO 7, «Seu lance (em centavos)»/«Seu palpite (nº de lances)», «Sem edições programadas no momento.», 4 acessos e Vencedores. Os dois cartões estão **vazios**, logo P1 e P4 não aparecem no browser. |
| g | P4 resolve o aperto a 375 px (15 → 285 px) | ✅ confirmada por reprodução própria | A evidência do executor não está commitada (só a mensagem de commit). Reproduzi a faixa isolada em Chrome headless (playwright), num contentor de 311 px. Ver detalhe abaixo. |
| h | Sem cópia inventada | ✅ com ℹ️ | 1.ª frase = `MeusAtivos.jsx:280/286`. «Os vencedores das edições vão aparecer aqui…» e «🏅 Vencedores» são adaptações novas, escritas em código e não pelo i18n `t()` (o MeusAtivos usa chaves). O meu V4 (placeholder trocado por «Último vencedor: Fulano de Tal.») **sobrevive**. |
| i | Toque ≥ 44 px e contraste AA | ✅ confirmada | `minHeight: "48px"` nos 4 acessos; mutante F8 → RED. Contrastes na tabela abaixo; o comentário do código fala em 9,07:1, o executor em 8,11 (ver ℹ️ 6). |
| j | Os testes mordem | ✅ 12/12; dos meus, 6 de 13 válidos sobrevivem | `node scripts/utac109f-prova-mutacao.mjs` → **12/12 PROVADOS**, restauro md5 OK, 38 s. Lista dos meus mutantes abaixo. |
| k | Suíte completa verde | ✅ confirmada | `node scripts/mc966-suite-harness.mjs ambos` (foreground) → frontend **VERDE 945/945** · backend **VERDE 1095/1101** · VEREDITO VERDE. |

### Detalhe de (d) — P1 e os consumidores de `getEstadoEdicao`

Nenhum consumidor existente muda indevidamente:

| Consumidor | O que passa | Efeito |
|---|---|---|
| `AuctionStatusBar` | `null` | nenhum |
| `CardLance:499` | `{id}` sem `tipo` | nenhum |
| `TabelaLances:39` | `{id}` sem `tipo` | nenhum |
| `MercadoLances:373` | edição Relâmpago | nenhum |
| `Vitrine:390` | `null` | nenhum |
| `EdicaoCard` | — | não está montado em nenhuma página |

Os meus mutantes V13 («palpite» também em ENCERRADA) e F2 → RED.
**Mas** o meu mutante V1 (P1 desligada), corrido contra os testes da aba OP (`utac106f-ofertas` + `utac109e-cartao-unico`), **sobrevive** (fail=0). A prova bidireccional da P1 existe só no Início, e a aba OP — o sítio onde o defeito foi reportado — não tem teste.

### Detalhe de (g) — reprodução da faixa (contentor de 311 px)

| Caso | Antes | Depois |
|---|---|---|
| «Em andamento — palpite já!» | nome **0 px** (truncado), tempo 301 px a transbordar | nome **287 px**, tempo passa para 2 linhas (42 px), sem transbordo |
| «Sem informação de prazo» | nome 0 px | nome 287 px |
| tempos curtos («02:13:44», «EM BREVE») | — | ficam numa linha, sem regressão |

O número do executor (15 px) difere do meu (0 px) só pela fonte. A conclusão confere.

### Detalhe de (i) — contrastes medidos (WCAG)

| Par | Rácio |
|---|---|
| dourado sobre o fundo do botão (dourado a 8 % sobre `#0c1132`) | **8,11:1** |
| texto `#e8f0fe` sobre `#0c1132` | 16,05:1 |
| muted `#6b7db8` sobre `#0c1132` | 4,60:1 |

### Detalhe de (j) — os meus 14 mutantes

Restaurados em `finally`; `git status --porcelain` vazio no fim.

| Resultado | Mutantes |
|---|---|
| **MORTOS** | V6 (MLC vazio sem `acao`), V7/V8 (P4), V9 (P2), V10/V11 (destinos dos acessos), V13 (P1 em ENCERRADA) |
| **SOBREVIVEM** | V1 (P1 na aba OP), V2 (destino do tile Saldo), V3 (cor de um tile), V4 (placeholder inventado), V5 (o vidro OP vazio perde «SEM EDIÇÃO»), V14 (acessos em 2 colunas no desktop) |
| **Equivalente / descartado** | V12 (não mudava nada) |

## Achados

### ⚠️ Corrigir (garantia, não comportamento)
1. **P1 sem teste na aba OP.** O brief pede teste bidireccional da P1, e ele só existe em `Dashboard.test.mjs`. Desligar a P1 deixa `utac106f-ofertas` e `utac109e-cartao-unico` verdes (V1).
   - Para fechar: um teste em `utac106f-ofertas.test.mjs` que renderize uma Programada ATIVA (com `leilaoLock` a duplo) e exija «palpite já!» e nenhum «lance já!».
   - Isto mexe só no teste; `OfertasProgramadas.jsx` não é tocado.
2. **A guarda dos tiles foi enfraquecida.** O teste do 107g que fixava `Saldo (R$) → /carteira` (e o CTA `/mercado`) foi apagado na reescrita do bloco de acessos.
   - Hoje um tile pode mudar de destino ou de cor e a suíte fica verde (V2, V3).
   - O «diff zero» é verdade neste commit, mas deixou de estar protegido. Repor a asserção do destino do Saldo (e, se quiser, a cor e o destino dos 4 tiles).

### ℹ️ Notas
3. A guarda do placeholder de vencedores só fixa a 1.ª frase e proíbe dígitos, `0x` e `R$`. Um nome inventado passa (V4). E a frase está escrita em código, não pelo i18n como no `MeusAtivos`.
4. A evidência P3 é real, mas os dois cartões estão vazios (EM_BREVE): nem P1 nem P4 aparecem no browser. A medição 15→285 px do executor não está commitada (aqui foi reproduzida à parte).
5. Faixa P4: com tempo longo, a faixa sobe de ~38 para ~85 px e cobre mais arte a 375 px. É aceitável, mas é uma mudança visual não declarada.
6. O comentário em `Dashboard.jsx` («9,07:1») mede dourado sobre o vidro sólido; sobre o fundo real do botão o rácio é 8,11:1. Os dois passam AA, mas o comentário e o log divergem.
7. Latente: o fallback `edicaoAtiva` do Dashboard leva `tipo: "programado"` quando `modalidade !== "flash"`. Hoje não tem efeito visível (no estado ATIVO o vidro usa o `timerDisplay`, não o `rotuloLongo`), mas a P1 tornou este campo semanticamente relevante.
8. O vazio do OP no Início passou a mostrar «SEM EDIÇÃO» (antes não havia estado). Faz sentido, mas não tem teste (V5).

## Mutantes sobreviventes
V1, V2, V3, V4, V5, V14 (e V12, que é equivalente).

## Restrições cumpridas
Sem push, sem commit, sem tocar em produção, Supabase ou Netlify. Tudo correu em foreground e `git -C <wt> status --porcelain` está vazio no fim.

Os ficheiros proibidos estão fora do diff:
- `netlify/`
- `OfertasProgramadas.jsx`
- `MinhaCarteira.jsx`
- `leilaoLock.js`
- `TermosConsentimento.jsx`

Scripts próprios (fora do repo), no scratchpad: `p4/p4.mjs` e `mut.mjs`.
