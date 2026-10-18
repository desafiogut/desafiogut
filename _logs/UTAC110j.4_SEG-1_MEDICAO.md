# UTAC110j.4 — SEG-1 MEDIÇÃO (nada alterado)

## -1.1 Estado
- HEAD `e995f1c` = baseline do enunciado.
- **RAM livre: 526 MB de 5.877 MB** (`Win32_OperatingSystem.FreePhysicalMemory`; 1.ª leitura 757 MB). **A14 exige ≥ 1.500 MB → FALHA.**
- Disco C: 16 GB livres (≥ 5 GB, ok).

## -1.2 Caminhos (desvios)
- «Bônus de senhas» e «Competição de habilidade» **não estão em `MeusAtivos.jsx`**: os textos vivem em
  `src/components/meus-ativos/EstadoBonus.jsx:36`, `PainelTorneio.jsx:31` e `src/i18n/pt.js:59-89`.
  `MeusAtivos.jsx:178-230` só os monta. **Nenhum destes 3 ficheiros está nas autorizações.**
- «Prêmio a anunciar»: `CartaoEdicao.jsx:83` (não :79) e `EdicaoCard.jsx:96`.

## -1.3 Frente A — «🎟️ Bônus de senhas» (`EstadoBonus.jsx`)
- **Dados:** API — `useFeedback(EDICAO_ATIVA, address, token)` → `senhasACreditar`, `bonusEmitido`, `liquidado`
  (tabela `rankings_ciclo`, motor MC93-B). Não é hardcoded.
- **O que é:** bónus do motor de torneio MC93 — completar uma sequência de `ACERTOS_PARA_BONUS` acertos
  dá N **senhas** (saldo on-chain `saldoSenhas`, `Leilao.sol:88`), creditadas pela coordenação.
  Vem acompanhado de `ProgressoBonus` («🎯 Progresso para o bônus», «acertos seguidos») — o enunciado não o cita.
- **NÃO é** pontos de engajamento do 110f (login +5 / missão +10 / indicação +50): nenhum destes campos é lido.
- **v5.1:** não há «senhas» nem bónus por acerto. O mais próximo é Art. 16º V «Sequências de **participação**»
  (sequência de acertos ≠ sequência de participação; e a unidade seria pontos de lance, não senhas).
- **Diagnóstico: AMBÍGUO** — resquício do modelo MC93 *ou* embrião do Art. 16º V. Auditoria 110m.1 (A3): «não existe no v5.1».

## -1.4 Frente B — «🏆 Competição de habilidade» (`PainelTorneio.jsx`)
- **Dados:** mesma API `useFeedback` → `posicao`, `pontosTotais`, `acertosTotais` do utilizador no ciclo.
- **O que é:** estatísticas pessoais (ranking) do motor MC93, com uma regra de pontuação visível:
  «Um lance único vale 1 ponto; o menor lance único vale 3» (`pt.js:68`).
- **v5.1:** Art. 14º só diz que vence o menor lance único. **Não há posição/ranking nem a regra 1/3 pontos**;
  e «Pontos» aqui colide com «pontos de lance» (Art. 16º), que é outra coisa.
- **Diagnóstico: AMBÍGUO** — o título é do Art. 14º, mas o conteúdo é estatística de uma regra que o v5.1 não tem.
- Visível por omissão: `useRecursosApp.js:36` `isTorneioVisivel: true`.

## -1.5 Frente C — «Prêmio a anunciar»
- Contexto: fallback quando `produto` falta — `CartaoEdicao` (cartão de edição único, 109e) e `EdicaoCard` (cabeçalho do cartão).
- **Nome do patrocinador: NÃO disponível** — nenhum campo patrocinador/lojista/sponsor em `src/` nem em `netlify/`.
- Decisão do enunciado aplicável sem ambiguidade: **«Produto patrocinado»**.
  Nota: a variante «Prémio oferecido por…» reintroduziria «Prêmio», que o 110j trocou por «Produto» (R18-110j-5a).

## -1.6 Testes que fixam os textos
- `utac110h1-vocabulario.test.mjs:68-69` fixa «🏆 Competição de habilidade» (pt.js + PainelTorneio).
- `utac110h2-pendencias.test.mjs:51` e `utac110h3-pendencias-front.test.mjs:142-144` exigem a chave `ativos.torneio.titulo` e `isTorneioVisivel`.
- `glossario.test.mjs:53-56` e `artigosUI.test.mjs` exigem «competição de habilidade» (no Termos/Art. 14º — fora deste painel).
- «Prêmio a anunciar»: **nenhum teste o fixa** (utac109e, 106c, 110g1 não o contêm).

## ⚠️ Conflitos (AU3 — não resolvidos pelo executor)
1. **A14 falhado** (526 MB < 1.500 MB): a suíte (SEG3) e o validador em worktree (SEG4) não devem correr assim.
2. **Frente A ambígua:** remover (resquício MC93) ou converter (Art. 16º V)? Converter exige backend novo (fora de âmbito). Remover o `EstadoBonus` implica também o `ProgressoBonus`?
3. **Frente B ambígua:** renomear o título não resolve a regra «1 ponto / 3 pontos» nem o ranking, que o v5.1 não tem. Opções: esconder (`isTorneioVisivel: false`, 1 linha, reversível), remover, ou renomear + retirar a regra.
4. **Autorização:** os textos estão em `pt.js`, `EstadoBonus.jsx`, `PainelTorneio.jsx` (e talvez `useRecursosApp.js`) — fora da lista autorizada.

## -1.7 Veredito: **PARAR** (A14 + ambiguidade nas Frentes A e B). Frente C está pronta a executar («Produto patrocinado»).

## -1.8 Retoma (operador: «fechei tudo, libere primeiro a ram necessaria»)
- 1.086 MB depois de o operador fechar as janelas. O fecho dos MCP desta sessão foi **recusado pelo classificador**
  (não contornado). Fiz um trim de working sets (`EmptyWorkingSet`, 112 processos, **nada fechado**) e a RAM ficou em
  **2 134 / 2 361 / 2 280 MB** ⇒ **A14 cumprida**.
- Baseline em `e995f1c`: **frontend 1208/1208 · backend 1351/1357 VERDE** (= declarado).
- **Frente C FEITA:** «Prêmio a anunciar» → **«Produto patrocinado»** (`CartaoEdicao.jsx:83`, `EdicaoCard.jsx:96`).
  Teste novo `utac110j4-produto-patrocinado.test.mjs` 4/4. Mutação 2/2 (repor o texto antigo em cada ficheiro dá
  2 RED), restauro md5 idêntico.
- **Frentes A e B continuam AMBÍGUAS** ⇒ pergunta ao operador (AU3).
