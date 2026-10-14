# BRIEF — SEG3 · VALIDADOR ADVERSARIAL do UTAC110g.1

Você é o **validador adversarial** (SEG3) deste UTAC. A sua função **NÃO é confirmar**: é
**TENTAR REFUTAR**. Um validador que só confirma não vale nada. Se não conseguir derrubar nada,
diga-o — mas só depois de ter tentado a sério, com instrumentos próprios.

Responda em **português (PT-BR)**.

## 0. Objeto e alvo

- Repo: `C:\Users\Moltbot\Desktop\DESAFIOGUT`
- **Commit sob validação:** `41e5768` (pai: `a78626f`)
- Trabalhe num **worktree PRÓPRIO** (regra A13 do projeto) — **nunca** na árvore principal:
  ```
  cd /c/Users/Moltbot/Desktop/DESAFIOGUT
  node scripts/worktree-helper.mjs criar C:/Users/Moltbot/Desktop/DESAFIOGUT/.wt-110g1-val 41e5768
  ```
  (o helper trata das junctions do `node_modules`; `remover` no fim, OBRIGATÓRIO — um delete
  recursivo que siga as junctions APAGA o `node_modules` real).
- ⚠️ **Não altere NADA na árvore principal.** O ÚNICO ficheiro que escreve na árvore principal é o
  seu veredicto, no caminho absoluto:
  `C:\Users\Moltbot\Desktop\DESAFIOGUT\_logs\UTAC110g.1_SEG3_VALIDADOR.md`
- O que o UTAC diz que foi feito: `_logs/UTAC110g.1-nota-tecnica.md`,
  `_logs/UTAC110g.1-front-frenteB.md`, `_logs/UTAC110g.1_SEG-1_MEDICAO.md`.
  **Não acredite neles** — são a alegação, não a prova.

## 1. Decisões do operador que o commit devia cumprir

- **R18-110g.1-1** (D-110g-3): a Nota Técnica é uma **nota padrão de envio de produto**, texto
  estruturado (sem PDF), com: nome do produto, destinatário (nome + morada), remetente
  (Associação + CNPJ), nº do pedido e data. Integrada no **e-mail de confirmação** do resgate.
- **R18-110g.1-2** (D-110g-4): o botão «Resgatar cartão» passa a existir **só na Carteira** e é
  **removido** das Ofertas Programadas; mesmo visual; aparece com **≥ 50 pontos**; abre o
  `ResgatarCartaoModal` já existente.
- **R18-110g.1-3** (D-110g-1 = a): «o e-mail da sessão (Privy) é a fonte de verdade».

## 2. O que deve TENTAR REFUTAR (lista mínima — acrescente o que achar)

1. **A Nota Técnica não tem os campos esperados** (falta produto, ou destinatário, ou remetente,
   ou CNPJ, ou nº do pedido, ou data; ou a data sai errada/`Invalid Date`/em UTC em vez de Manaus).
2. **O e-mail usa o e-mail do `body` e não o do Privy** — e/ou o servidor aceita um destino que não
   vem da sessão. (⚠️ o autor do commit DECLARA que a decisão não é implementável à letra: o JWT de
   sessão não carrega e-mail. Verifique essa alegação: se for FALSA — se houver no código um caminho
   que dê ao servidor o e-mail do Privy — é bloqueante.)
3. **O botão ainda está em Ofertas** (ou o resgate ficou acessível por dois caminhos).
4. **O botão aparece com menos de 50 pontos** — ou decide pelo campo `pontos` (total, com o bónus do
   palpite) em vez de pontos de COMPRA.
5. **O botão não abre o modal.**
6. **Foi tocado backend fora do escopo** — o único backend autorizado é
   `resgatar-cartao.mjs` + o novo `_lib/nota-tecnica.mjs`. Confira com
   `git diff --stat a78626f 41e5768`.
7. **Foi tocado `CartaoEdicao.jsx`, `GlassHeader.jsx` ou `CardLance.jsx`** (proibido).
8. **`EM_BREVE_MODE` foi alterado** (`src/lib/leilaoLock.js`), ou env vars, ou `package.json`.
9. **Os testes são falsos** — vacuosos, tautológicos, ou a medir o duplo em vez do produto.
   Concretamente: a prova de mutação (`scripts/mc110g1-prova-mutacao.mjs`) é honesta? Os 7 mutantes
   são mutações REAIS do código de produção (e não do teste)? O «equivalente declarado» é mesmo
   equivalente, ou é um mutante que devia morrer e o autor desculpou?
10. **Regressão escondida**: as guardas antigas foram só apagadas/invertidas para o verde ficar?
    Compare `git diff a78626f 41e5768 -- '*/__tests__/*'` e diga se alguma asserção foi
    ENFRAQUECIDA em vez de MOVIDA.

## 3. Instrumentos que deve usar (próprios, não os do autor)

- `node scripts/mc966-suite-harness.mjs ambos` (dentro do worktree) — **repita os números**.
- `node scripts/mc110g1-prova-mutacao.mjs` — **corra-o você**; e **acrescente pelo menos 2 mutantes
  SEUS**, escolhidos por si (não copiados): escreva-os num script **dentro do seu worktree** e
  mostre, com md5, que o ficheiro foi mutado e reposto. Um mutante seu que **sobreviva** é um achado.
- `node --test --experimental-test-module-mocks _tests/utac110g1-nota-tecnica.test.mjs` e
  `node --test --test-concurrency=1 src/pages/__tests__/utac110g1-carteira-resgate.test.mjs`.
- `git diff a78626f 41e5768` (leia-o TODO, ficheiro a ficheiro).
- **Sonda própria da Nota Técnica**: chame `gerarNotaTecnica` com dados REAIS e imprima o documento;
  verifique os 5 campos à mão e a data no fuso de Manaus.
- **Sonda própria do e-mail**: execute o handler com duplos SEUS (pode reutilizar o padrão de
  `_tests/utac110g-c1c2-email.test.mjs`) e imprima o `para` e o corpo.
- Para a alegação do Privy: `grep -rn -i "privy" netlify/functions/ src/context/ src/hooks/` e leia
  `_lib/jwt.mjs` + `auth-user.mjs` + `src/hooks/useResgatarCartao.js`. Se concluir que existe um
  caminho server-side que o autor não viu, é **BLOQUEANTE**.

## 4. Regras de higiene (obrigatórias)

- Portão de RAM (A14): ≥ 1500 MB livres antes da suíte —
  `powershell -NoProfile -Command "[int]((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024)"`.
  A máquina é pequena e oscila; se ler abaixo do limiar, **escreva o número medido** e diga que a
  evidência é fraca (não declare o limiar cumprido sem o medir).
- **Corra a suíte em foreground e nada mais ao mesmo tempo** (o UTAC110g já teve um VERMELHO
  transitório causado por contensão quando dois agentes corriam a suíte na mesma máquina).
- **NÃO** faça `git add -A`; **NÃO** commite; **NÃO** faça push. Não altere o worktree principal.
- No fim: `node scripts/worktree-helper.mjs remover C:/Users/Moltbot/Desktop/DESAFIOGUT/.wt-110g1-val`
  e confirme que o `node_modules` do frontend ficou intacto (conte as entradas de
  `desafio-gut/frontend/node_modules` antes e depois).

## 5. Formato do veredicto (`_logs/UTAC110g.1_SEG3_VALIDADOR.md`, PT-BR, secções numeradas)

1. **Veredicto**: `APROVADO` / `APROVADO COM RESSALVAS` / `REFUTADO` / `PARCIAL` — e o que o
   sustentaria para trás.
2. **O que reproduzi ao número** (suíte, mutação, os comandos exactos e a saída).
3. **O que TENTEI refutar e NÃO consegui** (item a item da §2), com o instrumento usado.
4. **O que REFUTEI** (bloqueantes) — com a prova mínima reprodutível.
5. **Achados não-bloqueantes** (ℹ️) e o que ficou por medir (limites da SUA medição).
6. **Testes do autor que considerei fracos/vacuosos**, se houver, e porquê.
7. **Higiene**: worktree criado/removido, node_modules antes/depois, RAM medida.

⚠️ Se houver **bloqueante**, diga-o com todas as letras na primeira linha do veredicto — o operador
lê isso primeiro.
