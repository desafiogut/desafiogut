# VEREDICTO — UTAC106f (ecrã Ofertas Programadas + palpite bónus)
## APROVADO COM RESSALVAS — 0 bloqueadores duros, 2 ressalvas (1 alta)

Validador adversarial INDEPENDENTE. Worktree: `C:/Users/Moltbot/tmp-utac106f-val/wt` (detached em `e713c3e`).
Todas as medições foram feitas por execução real neste worktree. Árvore principal NÃO tocada.

---

## Reproduzido por execução

| # | Comando / medição | Resultado real |
|---|---|---|
| 1 | `git diff --name-status b5686a6 e713c3e` | 12 ficheiros: 5 `A` (endpoints/hooks/migração/testes/mutação) + 4 `M` (`_lib/passe-pontos.mjs`, `OfertasProgramadas.jsx`, `utac106b-navegacao-frases.test.mjs`) — **`comprar-passe-pontos.mjs`, `MinhaCarteira.jsx`, `leilaoLock.js` e os 5 `.bak-*` NÃO constam** |
| 2 | `node scripts/mc966-suite-harness.mjs ambos` | **frontend: VERDE 752/752 · backend: VERDE 1024/1030 (6 skipped) → VEREDITO VERDE** (bate 752/1024 das alegações) |
| 3 | Frontend isolado `utac106f-ofertas.test.mjs` | **13/13 pass, 0 fail** |
| 4 | Backend isolado `palpite.test.mjs` | **12/12 pass, 0 fail** |
| 5 | `node scripts/mc106f-prova-mutacao.mjs` | **VEREDITO: 6/6 PROVADOS** (MP1 +2→+3 RED; MP2 sem idempotência RED; MP3 não escolhe o mais próximo RED; MP4 vencedor→«perdeu» RED; MP5 «Resgatar» <50 RED; MP6 cartão depende do palpite RED); restauro `md5 IDÊNTICO` |
| 6 | `git diff` de `_lib/passe-pontos.mjs` | **só linhas `+`** — as 6 funções existentes (lerPontos/getPontos/creditarPontos/debitarPontos/podeResgatarCartao/aplicarMovimento) intactas; a única alteração no bloco antigo é a linha de import acrescentada |
| 7 | `grep EDICAO_ID_RE _lib/edicoes-core.mjs` | existe e é exportado (linha 46) — o import novo resolve; módulo não parte |
| 8 | `podeResgatarCartao` (endpoint `ler-pontos.mjs`) | `pontos >= PONTOS_POR_CARTAO` calculado no servidor; frontend só confia no flag |
| 9 | `autenticarAdmin` (admin-auth.mjs:162) | exige Bearer admin-JWT **e** endereço na lista `getAdminAddresses()`; único caller de `apurarPalpite` é `apurar-palpite.mjs`; **nenhum cron** o chama |
| 10 | `leilaoLock.js` | `EM_BREVE_MODE = true` (linha de export) — intacto |
| 11 | `.bak-*` | `git diff --quiet` por ficheiro → os **5 INTACTOS**; `git status --porcelain` = 0 linhas |
| 12 | `public/artes/` | só `edicao-especial-airfryer.jpg` + `email-banner.jpg` → **não existe imagem «Família Quildo»** (o cartão é CSS, como alegado) |
| 13 | Sonda adversarial PRÓPRIA (ver «Alegações REFUTADAS») | 2/2 hipóteses de ataque CONFIRMADAS por execução real |

---

## Alegações REFUTADAS

**R1 — (m) O cartão PASSA a depender do palpite (contradiz «cartão é SÓ por pontos de COMPRA»).** ⚠️ ALTA
- Prova real: com um duplo Supabase que modela a semântica PostgREST usada, semeei `A` com **48 pontos de compra**, `A` ganhou o palpite e o bónus +2 foi creditado na **mesma coluna `pontos`** usada pelo contador do cartão.
- Saída medida: `[ADV-m] pontos A=50 (48 compra + 2 palpite) · podeResgatarCartao=true · limiar=50`.
- Consequência: `48 + 2 = 50` **desbloqueia o botão «Resgatar cartão»**. O ecrã escreve «o cartão conquista-se só com os pontos das tuas compras» (CARTAO_DESCRICAO) — **falso na implementação**: o bónus de palpite conta para o limiar.
- Nota de justiça: o cartão **não está condicionado a vencer** o palpite (compras sós chegam aos 50, teste 13) → sob a leitura «o palpite não é GATE» a alegação aguenta; sob a leitura declarada «SÓ por pontos de compra» (requisito marcado *crítico da Google Play* no próprio commit) **é refutada**.
- Tratamento: ou excluir `tipo:"palpite"` da soma que alimenta `podeResgatarCartao`, ou corrigir a copy/contrato.

**R2 — (d) A idempotência do apuramento NÃO é por edição; `apurarPalpite` pode creditar 2× na mesma edição.** ⚠️ MÉDIA
- Prova real: `A` palpita (100), `B` palpita (500); 1.ª apuração com valorReal=100 → `A` +2. Depois **`C` palpita 100 na mesma edição** (o endpoint `registar-palpite` não bloqueia após apuração nem edição encerrada) e 2.ª apuração → `C` recebe +2 **outra vez**.
- Saída medida: `r1.vencedor=A · r2.vencedor=C · A=2 C=2` → **total 4 pontos na MESMA edição**.
- Contradiz o contrato declarado no código («`ref` do crédito do bónus: UMA por edição ⇒ re-apurar NÃO credita duas vezes»): a `ref` `palpite-certo:<edicaoId>` é verificada no **histórico de cada endereço**, não globalmente por edição. O teste 9 só cobre re-apuração **sem palpites novos**.
- Tratamento: marcar a edição como apurada (flag/bloqueio de novos palpites + de re-apuração) ou usar um registo de idempotência por edição.

---

## o que NÃO consegui refutar (alegações que resistiram)

- **(a)** UI mostra pontos reais: `usePontos` → `GET /.netlify/functions/ler-pontos` (URL correto, `api.js` BASE + path), `7 / 50 pontos` + `role=progressbar aria-valuenow=7 aria-valuemax=50` — teste 2 verde.
- **(b)** Botão «Resgatar» com <50: só renderiza no ramo `podeResgatarCartao` (servidor: `pontos >= PONTOS_POR_CARTAO`); a <50 mostra «Chega a 50 pontos para resgatar». Teste 49-pts verde e MP5 prova que o teste morde.
- **(c)** Palpite duplicado na mesma edição: UNIQUE `(endereco, edicao_id)` + 23505 → devolve o existente (`idempotent:true`) + guarda `emCurso` no `usePalpite` + campo desaparece após palpitar. Testes 3 e 10 verdes.
- **(e)** Sem palpites ninguém é creditado: `porApurar.length===0 → vencedor:null, pontosCreditados:0`. Teste 8 verde.
- **(f)** `comprar-passe-pontos.mjs` NÃO foi tocado (fora do diff; `git diff` vazio).
- **(g)** Funções EXISTENTES de `_lib/passe-pontos.mjs` NÃO alteradas — diff só com `+`.
- **(h)** `MinhaCarteira.jsx` NÃO foi tocado (`git diff --stat` vazio).
- **(i)** `EM_BREVE_MODE` continua `true`.
- **(j)** Os 5 `.bak-*` intactos; worktree limpo (`porcelain`=0).
- **(k)** Suíte canónica VERDE (752/752 · 1024/1030).
- **(l)** `apurar-palpite` NÃO é público: `autenticarAdmin` (Bearer admin-JWT + lista de admins); nenhum cron/caller alternativo.
- **Extra** — cartão sem palpite vencedor: teste 13 (50 pts + palpite «perdeu» → «Resgatar» continua) verde; a mutação MP6 cai. (Isto refuta a leitura «o palpite é gate», mas não a R1 acima.)

---

## o que não medi

- **DDL real em produção**: CHECK/UNIQUE/FK/RLS/GRANT do `public.palpites` não foram executados (só o duplo PostgREST). A alegação `migration list = 20261005 | 20261005` **não foi verificada** por mim — não faço deploy nem falo com a BD de produção.
- **Aplicação real dos endpoints Netlify** (Bearer real, rate-limit, CORS) — sem deploy; testei só lógica + mocks.
- **Render visual real** (DOM/CSS/hit-testing): o «clique» dos testes é `onClick` do React sem DOM.
- **`registar-palpite` aceita edição NÃO-Programada**: `buscarEdicao` só verifica existência (não `tipo`/`status`), pelo que via API se pode palpitar numa edição Relâmpago ou encerrada — desvio do doc do ficheiro («e ser Programada»). Não é uma das 13 alvos, fica como ℹ️ nota.

---

## tabela de tratamento

| Marca | Achado | Vectores | Tratamento proposto |
|---|---|---|---|
| ⚠️ | R1 — o bónus +2 do palpite entra na soma que desbloqueia o cartão (48 compra + 2 palpite = 50) | (m) | Excluir `tipo:"palpite"` do contador de `podeResgatarCartao` **ou** alinhar a copy/contrato com «pontos totais». Decidir antes de fechar o 106g. |
| ⚠️ | R2 — apuramento não é idempotente POR EDIÇÃO; novo palpite + re-apuração credita um 2.º vencedor (+2 voltam a somar) | (d) | Bloquear novos palpites e/ou nova apuração quando a edição já está apurada (flag de edição), não só por `ref` no histórico do endereço. |
| ℹ️ | `registar-palpite` não exige edição Programada nem aberta (só existência) | fora dos 13 | Adicionar verificação de `tipo==="programado"` e `status` aberto, alinhado com a UI. |

---

## decisão final

**APROVADO COM RESSALVAS.** Nenhuma das 11 alegações «de ficheiro/estado» (f, g, h, i, j) foi refutada — os ficheiros proibidos estão intactos, a suíte está verde e a mutação é 6/6. Refutei, porém, **2 alegações funcionais**: (R1) o cartão passa a depender do bónus do palpite (contradiz o contrato «SÓ por pontos de compra» que o próprio commit marca como *crítico Google Play*); (R2) a idempotência do apuramento é por endereço, não por edição. Ambas precisam de decisão antes do UTAC106g; R1 é a prioritária. Não são bloqueadores de merge do ecrã em si, mas R1 é um bloqueador- potencial da exigência de conformidade declarada.

Veredicto do validador: **não derrubei o ecrã nem a infra do palpite; derrubei a alegação de que o cartão é imune ao palpite.**

---

# RESPOSTA DO EXECUTOR — REFUTAÇÃO ACEITE · UTAC106f PARA ANTES DE FECHAR

**Veredicto: APROVADO COM RESSALVAS.** Nada «de ficheiro/estado» caiu (o endpoint do 106e, o Via A, a
`MinhaCarteira`, os `.bak-*`, o `EM_BREVE_MODE` e a suíte estão todos intactos/verdes). Mas o validador
**derrubou 2 alegações funcionais MINHAS**, com execução real. **Aceito as duas.** Pela RESSALVA expressa
do enunciado — *«Palpite é bónus, não decisão. Se o executor fizer o cartão depender do palpite, PARAR e
reportar»* — **o UTAC106f PARA aqui, antes de se declarar fechado.**

## ⚠️ R1 (ALTA) — o bónus do palpite ENTRA na soma que desbloqueia o cartão · ACEITE · PAROU

Medido pelo validador: endereço com **48 pontos de COMPRA** + palpite vencedor → **48 + 2 = 50** →
`podeResgatarCartao = true`. O crédito do bónus usa a `TIPO_PALPITE = "palpite"` na **MESMA coluna
`pontos`** que alimenta o contador do cartão, e `podeResgatarCartao` compara essa soma com 50.

⇒ **O cartão passa a poder ser desbloqueado pelo palpite.** Isso contradiz (a) a copy que EU escrevi no
ecrã — «o cartão conquista-se só com os pontos das tuas compras» — e (b) o requisito que o meu próprio
commit marcou como **crítico da Google Play**. É exactamente o caso que a RESSALVA manda **PARAR**.

**Erro do MEU instrumento (declarado, o mais grave desta ronda):** o teste 11 do `palpite.test.mjs`
afirmava `48 + 2 = 50` com a legenda *«a regra do cartão é de COMPRA, o bónus soma»* — ou seja,
**codifiquei o defeito como comportamento esperado**. Um teste que fixa o bug é pior do que nenhum:
deu-me confiança falsa e só o validador (que foi medir 48+2 contra o limiar) o viu. O mutante MP6 que
criei **não** o apanha (testa o gate, não a soma).

**DECISÃO NECESSÁRIA DO OPERADOR** (é produto, não código — por isso PARO em vez de escolher sozinho):

| Opção | O que muda | Consequência |
|---|---|---|
| **A** — cartão só por pontos de COMPRA | `podeResgatarCartao` (e a barra) passam a contar apenas movimentos `tipo:"compra"` | Alinha com a copy e com «não decide o cartão». O bónus +2 deixa de ter efeito prático no cartão ⇒ o palpite fica **sem incentivo material** (só prestígio) — convém decidir para que serve o +2 |
| **B** — o bónus conta para o cartão | Corrigir a copy («pontos totais, incluindo bónus de palpite») | O palpite **contribui** para o cartão ⇒ conflita com «o palpite não decide» / Google Play |

## ⚠️ R2 (MÉDIA) — a idempotência da apuração é por ENDEREÇO, não por EDIÇÃO · ACEITE

Medido: `A` palpita (100) e ganha; depois `C` palpita 100 **na mesma edição já apurada** e uma nova
apuração credita **outra vez** +2 (`A=2, C=2` na MESMA edição). A `ref` `palpite-certo:<edicaoId>` é
verificada no histórico **de cada endereço**, não globalmente por edição — o meu comentário no código
(«UMA por edição ⇒ re-apurar NÃO credita duas vezes») é **falso** nesse cenário; o meu teste 9 só cobre
re-apuração **sem palpites novos**. Tratamento (a fechar no 106g): flag de edição apurada que bloqueia
novos palpites **e** nova apuração.

## ℹ️ Nota aceite — `registar-palpite` só verifica que a edição EXISTE

Não exige `tipo === "programado"` nem `status` aberto (o comentário do ficheiro dizia que sim). A UI só
oferece o campo quando há edição Programada aberta, mas **pela API** é possível palpitar numa edição
Relâmpago/encerrada. A corrigir no 106g junto com R2.

## O que o validador NÃO conseguiu refutar (e eu confirmo)

O ecrã real (pontos/progresso/cartão/histórico/resgate a ≥50/estado vazio), o endpoint `ler-pontos`, a
idempotência do REGISTO (UNIQUE + 23505 + guarda `emCurso` + campo que desaparece), a apuração escolher
o mais próximo, «sem vencedor ninguém recebe», `apurar-palpite` exigir admin, e o isolamento de escopo
(`_lib` **só com adições, +115/−0**, `comprar-passe-pontos.mjs` e `MinhaCarteira.jsx` sem alterações).

## Estado do UTAC106f

**NÃO FECHADO.** O ecrã, a infra do palpite, os testes, a migração aplicada e o deploy estão feitos e
verdes — mas **R1 é um requisito crítico declarado** e a RESSALVA manda PARAR e reportar. Fica à espera
da decisão do operador (A ou B) para a ronda seguinte (106g), junto com R2 e a nota da edição.
**A produção está neste momento com o comportamento refutado** (48+2 → 50); a exposição real é baixa
(não há edição Programada a decorrer ⇒ o campo do palpite não aparece a ninguém), mas fica declarado.
