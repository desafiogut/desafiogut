# UTAC108h.3 — INÍCIO SÓ COM OS DOIS VIDROS (Relâmpago + Programada)

**Tipo:** produto (frontend). **Owner:** Hermes · **Data:** 2026-10-08.
**Origem:** pedido do operador depois de ver o 108h.2 no ar: «em inicio, precisamos ficar apenas com duas
ediçoes, relampago e programada»; «o card da edição do programado é exatamente igual ao da ediçao
relampago a qual ja tem, a diferença é que ele é relampago, e a abaixo precisa ter a sessao palpite».

## Baseline
- HEAD no arranque: `8b3e4c4` (= `origin/main`, o fecho do 108h.2). Suíte: **909/909 + 1095/1101**.

## O que mudou

| Antes (108h.2, no ar) | Agora (108h.3) |
|---|---|
| Vidro separado «🎯 Edição Ativa» + 2 prateleiras (título em vidro + carrossel) + vidro de vazio | **DOIS vidros**, um por família: «⚡ Relâmpago» e «🎫 Programada» |
| As Relâmpago **encerradas** (RELAMP-1/2/3) em carrossel | O vidro Relâmpago mostra a edição **VIVA** (a ativa) |
| A Programada era um título solto + um vidro de vazio | Um **vidro completo** igual ao do Relâmpago, com o **palpite dentro** |
| «Outras Edições» e o seu carrossel | **saíram** do Início |

- **Casco único:** `CartaoEdicao` (o MESMO componente que as abas MLC e OP já usam, do UTAC108e.1), agora
  com o rótulo de família opcional `titulo` (aditivo — quem não o passa fica igual).
- **Zona do palpite:** reutiliza `usePalpite` e a regra `estadoPalpite`/`PILULA` — que **mudaram de casa**
  para `src/lib/palpite.js` (fonte única; a aba Ofertas Programadas passou a importá-la de lá). Antes
  viviam dentro da página da OP, e o Início precisaria de as copiar: seriam duas verdades sobre *quando é
  que se pode palpitar*.
- **Sem edição Programada** (o caso de hoje: ZERO no ar), o vidro fica com o estado vazio **dentro** dele
  («Nenhuma edição Programada em andamento» / «Próxima edição —»), nunca num vidro solto (Regra 1).

### Decisão que eu tive de tomar (declarada)
O vidro «⚡ Relâmpago» mostra **a edição viva (a ativa)**. Se mostrasse as Relâmpago já **encerradas**
(RELAMP-1/2/3, que eram o conteúdo da antiga prateleira), o Início perdia a **porta de entrada do lance**
— partir um caso legítimo. A edição ESPECIAL (MC94.2/94.3.1) continua a ocupar esse lugar, como sempre
ocupou o slot; e por isso a especial é **excluída** do vidro da Programada (senão apareceria duas vezes —
apanhado por um teste que conta o produto).

## Guardas e testes — o que foi actualizado e o que foi APOSENTADO

- `Dashboard.test.mjs`: os testes do desenho anterior (prateleiras + a função pura `prateleirasDeEdicoes`)
  **saíram** — o objecto deles desapareceu. Entraram **7 testes novos** do 108h.3 (exactamente 2 vidros,
  ordem dos títulos, saída do «Edição Ativa»/prateleiras/encerradas, o vidro Relâmpago com a viva e o
  lance, o palpite DENTRO do vidro com prova de profundidade, o vazio dentro do vidro, a escolha da
  Programada aberta). 3 asserções antigas foram reapontadas (MC94.3.2, «sem especial», «PROG-*»).
- **Guarda APOSENTADA (declarado):** o MC99 media o scroll LATERAL das edições do Início. O Início deixou
  de ter lista — a guarda ficaria **verde por vacuidade**, que é o que esta série combate. Saiu a guarda
  **e** o mutador `MUT1` (que apontava à string desaparecida: um mutador assim não testa nada e ainda
  dava `entrou: false` em silêncio).
- `utac106f-ofertas.test.mjs`: 2 imports de `estadoPalpite` reapontados para `lib/palpite.js` (mudou de casa).
- **A etiqueta do meu lance** (guarda B11 do UTAC107e.2) foi **reposta** dentro do vidro Relâmpago — era
  funcionalidade que vivia no card «Edição Ativa» que saiu; apagá-la em silêncio seria perder um caso.

## Verificação
| Verificação | Resultado |
|---|---|
| Suíte canónica | frontend **VERDE 904/904** · backend **VERDE 1095/1101** |
| `npx vite build` | exit 0 |
| Deploy | `8b3e4c4..380d728` · entry **`index-Brxo6SkT.js`** (era `TvfL10s1`) |
| Chunk do Início (`PrivyRoot-DrJMklAG.js`) | `palpite-zona` ✓ · «⚡ Relâmpago» ✓ · «🎫 Programada» ✓ · «Dar lance» ✓ · «Nenhuma edição Programada em andamento» ✓ · **«🎯 Edição Ativa» 0 · `prateleira-scroll` 0 · «Outras Edições» 0 · «Smart TV» 0** |
| `package-lock` / `package.json` | intactos · `.bak-*` **0 tocados** |

## O que NÃO provei
- **Não abri o ecrã num browser com sessão.** Produção está atrás do gate de consentimento LGPD e eu não
  clico aceites legais por ninguém; a prova do que está no ar é por conteúdo do bundle + os testes de
  render (SSR). **A confirmação visual é do operador** — é ele que está a olhar para o ecrã.
- O palpite **não foi exercido ponta a ponta** contra o servidor (exigiria sessão + Passe comprado). O que
  está provado é a ligação ao MESMO hook e à MESMA regra da aba OP, que já está em produção.

## Custo
Sessão CLI partilhada (sem sessão isolável). Ver `state.db` no fecho.
