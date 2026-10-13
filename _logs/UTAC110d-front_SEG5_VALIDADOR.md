# UTAC110d-front — SEG5 · VALIDADOR ADVERSARIAL

- Commit sob teste: `275a43b` (local) · baseline `183e703`
- Worktree próprio (A13): `C:/Users/Moltbot/tmp-110dfront-val/wt`, criado por `scripts/worktree-helper.mjs criar` e removido no fim pelo mesmo helper
- Nada foi corrigido, commitado, enviado (push) nem publicado (deploy). Nenhum segredo nem variável de ambiente foi tocado. Os mutantes foram aplicados e revertidos só no worktree; no fim, `git status` do worktree estava limpo.
- Data: 2026-10-13

## Suíte completa (minha medição)

`node scripts/mc966-suite-harness.mjs ambos < /dev/null` no worktree:

```
frontend: VERDE 997/997 pass
backend: VERDE 1128/1134 pass
VEREDITO: VERDE
```

Bate com o que o executor declarou. A remoção do bloqueio por saldo R$ no CardLance não quebrou os testes de outros ecrãs (Dashboard/Início, MercadoLances e o resto da suíte continuam verdes).

Os 4 ficheiros do domínio (`utac110d-front`, `utac106e-compra-passe`, `utac106c-carteira`, `utac106c-carteira-render`) somam 63 testes, todos verdes, em cerca de 12 s.

## As 10 alegações

### 1. A UI ainda chama `comprar-passe-pontos` — NÃO REFUTADO
- Procurei `comprar-passe-pontos` em `src/` fora de `__tests__`. Só aparece em comentários: `ComprarPasseModal.jsx:6,19`, `useComprarPasse.js:4`, `MinhaCarteira.jsx:91,94` e `utils/idempotency.js:3`.
- Procurei endpoints montados dinamicamente (`"comprar-passe`, `` `comprar-passe- ``, `passe-${`). Os únicos são os literais `comprar-passe-relampago` e `comprar-passe-programado`, em `lib/passes.js`.

### 2. O CardLance permite um lance sem créditos — NÃO REFUTADO
Sondei `lib/passes.js` diretamente:

| entrada `creditos` | creditosDaResposta | podeLancar |
|---|---|---|
| 0, "1", 1.5, null, undefined, -1, NaN, Infinity, 2^53, true, [1], {} | 0 | false |
| 1, 2 | 1, 2 | true |
| 5 com `loading:true` | — | false («Carregando…») |
| 5 com `erro` | — | false (mensagem de erro) |
| 5 com `isConnected:false` | — | false |

- No CardLance, `desabilitado` inclui `semCreditosFlash`, que é `!isProgramado && isConnected && !creditos.podeLancar`. O único gatilho do lance é o `motion.button` com `onClick={handleDarLance}`: não há `onSubmit` nem `onKeyDown` com Enter.
- ℹ️ Não há defesa em profundidade: `handleDarLance` não verifica os créditos por si. Se o `disabled` for contornado, quem barra é o servidor (400 `sem_creditos_lance`), e a UI trata essa resposta com mensagem clara e releitura dos créditos.

### 3. A Carteira não mostra os dois saldos separados — NÃO REFUTADO, com lacuna de teste
- O teste C renderiza a Carteira real com `pontos:37, pontosCartao:30, lance.creditos:3`. Resultado: «Pontos de fidelidade 30 / 50», barra a 60 %, «Créditos de lance 3 disponíveis». O 37 não aparece.
- O código usa `pontosCartao` na barra, no texto e na prop do balão.
- ⚠️ Lacuna de teste: a ligação Carteira → balão (`pontosCartao={…}`) não tem teste. O meu mutante V2 (ver abaixo) passou a enviar ao balão um número diferente de `pontosCartao` e os 63 testes ficaram verdes. Hoje o código está certo; só a regressão ficaria invisível.

### 4. O balão chama o endpoint errado — NÃO REFUTADO
- Cada botão chama `onComprar(p.tipo)`. O hook resolve o endpoint com `passeDoTipo(tipo)`, que usa `Object.hasOwn`. «constructor», «__proto__», «pontos», «toString», «RELAMPAGO», 1 e null dão `null`.
- O teste HOOK verifica `Object.keys(corpo) == ["idempotencyKey"]`: o tipo não vai no corpo.
- Mutante V5 (botões trocados): MORTO.

### 5. Progresso do cartão errado — NÃO REFUTADO
- `metaCartao` é 50 por omissão e vem de `pontosParaCartao`. A largura é `Math.min(100, round(pontosCartao/meta*100))`: 0 dá 0 %, 30 dá 60 %, 60 dá 100 %.
- Mutante V11 (sem o teto de 100): MORTO.
- ℹ️ O piso a 0 não existe e há coerção herdada do `usePontos`, que faz `Number(data?.pontosCartao ?? 0)`. Um `pontosCartao` negativo ou não numérico vindo do servidor daria largura negativa ou `NaN%` e o texto «NaN / 50». O backend calcula esse valor por soma, por isso o risco é baixo, e a coerção já existia antes deste commit.

### 6. CartaoEdicao, GlassHeader ou EM_BREVE_MODE foram tocados — NÃO REFUTADO
- `git diff 183e703..275a43b --name-only` lista 15 ficheiros, todos em `desafio-gut/frontend/src/{__tests__,components/CardLance.jsx,components/ComprarPasseModal.jsx,hooks/useComprarPasse.js,hooks/usePontos.js,lib/passes.js,pages/MinhaCarteira.jsx,pages/__tests__}`.
- Nenhum é CartaoEdicao, GlassHeader ou `leilaoLock.js`. `leilaoLock.js:10` continua com `export const EM_BREVE_MODE = true;`.

### 7. O backend foi tocado — NÃO REFUTADO
- Nenhum ficheiro sob `netlify/` no diff.
- A premissa da remoção do bloqueio por R$ confere: `frontend/netlify/functions/lance-relampago.mjs:45` tem `const DEBITO_SALDO_LANCE_ATIVO = false;`.
- `ler-pontos.mjs:71` devolve `lance.creditos`, e `pontosCartao` conta `tipo:"compra"`, que é o que `comprar-passe-tipado` grava (`:7`).

### 8. Erro silencioso ou pouco claro — NÃO REFUTADO, com ressalva
- 401, 402, 400, 502 e 503 têm mensagem própria em pt-BR. Qualquer outro status mostra «Erro do servidor».
- Na Carteira, o erro aparece dentro do balão com `role="alert"`, mais um toast, e o balão fica aberto.
- Mutantes V8 (402 só no toast), V12 (erro fecha o balão), V17 (sem `role=alert`) e V19 (503 sem mensagem): todos MORTOS.
- ⚠️ Erro de rede (herdado, não introduzido): o `apiPost` não apanha a exceção do `fetch`, e o hook mostra `err.message`. Num WebView/Chrome isso é «Failed to fetch» (em inglês, sem pista de ação). Não é silencioso, mas não é claro em pt-BR. O `catch` era igual em `183e703`.

### 9. Teste bidirecional falso — NÃO REFUTADO (16 de 18 mutantes mortos; os 2 sobreviventes são lacunas menores)
Os mutantes são meus e diferentes dos do executor. Cada um foi aplicado com node (contagem da âncora = 1 e conteúdo confirmado como alterado), corrido contra os 4 ficheiros do domínio e revertido.

| # | Mutante | Resultado |
|---|---|---|
| V1 | `usePontos` coage os créditos com `Number(...)` («"1"» passaria a 1) | MORTO (B) |
| V2 | Carteira passa ao balão um número ≠ `pontosCartao` | **SOBREVIVEU** |
| V3 | CardLance: carregamento/erro libertam o botão (só `sem_creditos` bloqueia) | MORTO (D fail-closed) |
| V4 | `passeDoTipo` sem `hasOwn` | MORTO (A + HOOK) |
| V5 | Botões do balão trocados | MORTO (RENDER ×2) |
| V6 | Carteira não relê os saldos após a compra | MORTO (RENDER ×2) |
| V7 | Guarda `emCurso` nunca libertada (2.ª compra bloqueada para sempre) | MORTO (HOOK idempotencyKey) |
| V8 | 402: erro só no toast | MORTO |
| V9 | CardLance não relê os créditos após 400 `sem_creditos_lance` | MORTO (D) |
| V10 | Aceita créditos não inteiros (`isFinite`) | MORTO (A ×2) |
| V11 | Barra sem teto de 100 % | MORTO (C) |
| V12 | Erro genérico fecha o balão | MORTO (RENDER 502) |
| V13 | Sem `authToken`, `usePontos` dá `creditosLance:1` | **SOBREVIVEU** |
| V14 | Singular «disponível» para 0 | MORTO (C) |
| V17 | Alerta do balão sem `role="alert"` | MORTO (RENDER 402/502) |
| V18 | Erro de leitura mostra «0» em vez de «—» | MORTO (C) |
| V19 | 503 sem mensagem própria | MORTO (HOOK) |
| V20 | Aviso do CardLance some nos estados carregando/erro | MORTO (D) |

- V2 é a lacuna real (alegação 3).
- V13 é artificial: o código atual devolve VAZIO, com 0 créditos, quando falta sessão. Mostra só que o ramo «address sem authToken» do `usePontos` não tem teste para os créditos.
- Os testes D usam o CardLance REAL contra um servidor simulado com ledger: o crédito desce de 2 para 1 e para 0, e o botão desliga no fim. Não é tautologia.

### 10. Alvo de toque < 44 px ou contraste < AA — REFUTADO EM PARTE (contraste)
**Alvos de toque.** Os botões novos do balão têm `minHeight: 48px` («Comprar Passe Relâmpago», «Comprar Passe Programado», «Cancelar»), e há um teste para isso. A Carteira não tem botões novos e o botão de lance não mudou. OK.

**Contraste.** Calculado com a fórmula WCAG 2.x, usando glass `#0d1235`; o fundo do balão é `rgba(13,18,53,0.88)` sobre `#050818`, e os tons dos cartões foram compostos por cima:

| Texto | Fundo | Razão | AA texto normal (4,5) |
|---|---|---|---|
| ouro `#f5a623` | glass / balão / cartão ouro 6 % / botão ouro 14 % | 8,97 / 9,09 / 8,28–8,40 / 6,50 | ✔ |
| muted `#6b7db8` | glass / balão (sem tom) | 4,55 / 4,61 | ✔ (por pouco) |
| **muted `#6b7db8`** | **cartão ouro 6 % (Carteira)** | **4,20** | ✘ |
| **muted `#6b7db8`** | **cartão ouro 6 % (balão)** | **4,26** | ✘ |
| vermelho `#ef4444` | glass / balão | 4,83 / 4,90 | ✔ |
| vermelho `#ef4444` | alerta do balão (10 % vermelho) | 4,53 | ✔ (por pouco) |
| **vermelho `#ef4444`** | **`boxErro` do CardLance (12 % vermelho sobre glass)** | **4,37** | ✘ |
| `#fbbf24` (aviso neutro do CardLance) | aviso 10 % ouro | 9,39 | ✔ |

- ⚠️ Texto novo abaixo de AA:
  - no balão, o benefício de cada Passe (0,82 rem, muted, dentro do cartão com 6 % de ouro), 4,26:1;
  - na Carteira, os rótulos «🎟️ Pontos de fidelidade» e «⚡ Créditos de lance» (0,7 rem) e «disponível/disponíveis» (0,68 rem), 4,20:1.
- O `boxErro` do CardLance é um estilo antigo, mas passa a ser usado no estado «erro ao ler créditos»: 4,37:1, 0,85 rem.
- São falhas marginais (4,2–4,4 contra 4,5). A correção é trivial: um muted mais claro dentro de cartões com tom, por exemplo `#8090c8`, ou tirar o tom do fundo.

## Copy pt-BR
Varri as linhas adicionadas não comentadas de `components`, `hooks`, `lib` e `MinhaCarteira` à procura de «Escolhe», «o teu», «a tua», «adquire», «a carregar», «ecrã», «utilizador», «registo», «tens», «podes». Não há nenhuma ocorrência em strings visíveis; só em comentários. A copy visível está em pt-BR: «Escolha o seu Passe Desafio», «Adquira um Passe Relâmpago», «Carregando seus créditos…», «Seus pontos de cartão».

## Defeitos e ressalvas
- ⛔ Bloqueante: **nenhum**.
- ⚠️ Contraste abaixo de AA (4,20–4,37:1) em texto novo pequeno (alegação 10).
- ⚠️ Lacuna de teste: a ligação Carteira → balão `pontosCartao` não tem teste (mutante V2 sobreviveu).
- ⚠️ (herdado) Erro de rede na compra mostra «Failed to fetch» em inglês.
- ℹ️ O CardLance passa a chamar `usePontos()` em todas as instâncias, também no modo Programado (que não usa créditos). São mais `GET /ler-pontos` por cartão no Início/MLC; sem impacto funcional.
- ℹ️ Na janela em que há `address` mas ainda não há `authToken`, `usePontos` dá `loading:false` com 0 créditos. O CardLance mostra «Sem créditos de lance. Adquira um Passe…» até a sessão ser criada. É fail-closed (correto quanto à segurança), mas a mensagem é enganosa por momentos; «carregando» seria mais honesto.
- ℹ️ Logo após um lance com sucesso, a releitura põe `loading=true`, e o aviso «⏳ Carregando seus créditos…» pisca por instantes. É cosmético.
- ℹ️ Não há defesa em profundidade no `handleDarLance` (alegação 2); o servidor barra.
- ℹ️ `pontosCartao` NaN/negativo não é tratado na barra (coerção herdada).

## Limites da medição
- Não houve DOM real nem browser: render SSR e handlers chamados diretamente (os mesmos instrumentos do executor). Não validei visualmente a 360 px nem com leitor de ecrã.
- O contraste assume o glass opaco `#0d1235`. O vidro real é translúcido com `backdrop-filter`, e o fundo efetivo varia com o que está atrás.
- Não testei contra o backend real nem em produção, e não testei o APK.
- Os mutantes cobriram os 4 ficheiros do domínio, não a suíte toda. A suíte toda foi corrida só no commit sem mutação.

## Veredito final: **APROVADO COM RESSALVAS**
Não consegui refutar nenhuma das alegações funcionais (1–9): o fluxo de dois Passes, o bloqueio fail-closed por créditos, os dois saldos, o escopo dos ficheiros e a suíte (997/997 e 1128/1134) se confirmam. As ressalvas são o contraste do texto muted em cartões com tom (4,20–4,26:1) e do `boxErro` (4,37:1), a falta de teste da ligação Carteira → balão `pontosCartao`, e a mensagem de erro de rede em inglês (herdada).
