UTAC000.17bc — SEG4: VEREDICTO DO VALIDADOR ADVERSARIAL (transcrição VERBATIM do ficheiro que ele escreveu)
Origem: C:/Users/Moltbot/tmp-utac17bc-veredicto/VEREDICTO-VALIDADOR.md
Subagente: deleg_632f3f30 · duração 483 s · commit validado: 1f446db (código)
=========================================================================================
# VEREDICTO — Validador adversarial do commit `1f446db` (UTAC000.17bc)

**Repo:** `C:/Users/Moltbot/Desktop/DESAFIOGUT` (branch main)
**Commit validado:** `1f446db feat(UTAC000.17bc): prazo real do servidor + overlay agregado (DEBT-016 + DEBT-017)`
**HEAD medido:** `2207bc0` no início; **`be9e7a3` no fim** — o autor acrescentou um commit de docs (`_logs/DEBT.md`, `_logs/UTAC000.17bc-RELATORIO.md`, `_logs/UTAC000.17bc_SEG-2_MUTACOES.txt`) **durante a minha sessão**. O task dizia `165a499`; na realidade há **5** commits de docs depois do `1f446db` (`a27be1f`, `41d522c`, `165a499`, `2207bc0`, `be9e7a3`). **Confirmado que TODOS são só docs** — `git diff --name-only 1f446db HEAD` filtrado de `_logs/`/`CLAUDE.md` devolve **vazio**; a árvore de código é byte-a-byte a do `1f446db` (md5 dos ficheiros mutados conferido). **Não fui eu que commitei** (nunca corri `git add`/`commit`).
**Baseline:** `dd3f151` (= origin/main).
**Sem deploy** ⇒ não houve verificação em produção (não tentada, por instrução).

## VEREDICTO: **APROVA (com ressalvas)**

Nada aqui **bloqueia o push** (a app não está deployada com este código). Mas **duas ressalvas exigem correcção antes de ligar o novo caminho a um chamador**: (1) um teste que prove que FECHAR/NOVA RODADA marcam «visto» — hoje **nenhum** prova, e a mutação M4 sobrevive à suíte; (2) uma guarda contra a **sobrescrita** de uma R-1 real existente por `criarEdicao({id:'R-1'})`, demonstrada abaixo.

---

## Tabela-resumo

| Alegação | Resultado | Nota |
|---|---|---|
| (A) fim pelo prazo real do servidor; sintética/ausente nunca encerra nem abre | **HOLDS (com ressalva de precisão)** | As três negativas (sintética, ausente, prazo ilegível) confirmadas. Mas `offsetRelogioMs \|\| 0` deixa o relógio do **aparelho** decidir quando o servidor não manda `agora` — a redacção «o relógio local NUNCA o decide» é imprecisa |
| (B) não reabre em edição vista; «visto» por endereço e por edição | **HOLDS** | 8/8 testes verdes + leitura de código; EIP-55 normalizado; JSON corrompido tratado |
| (C) R-1 real criável sem quebrar o antigo nem abrir buraco | **HOLDS em parte** | id explícito funciona, regex fecha a injecção, contador intacto, `listarEdicoes` prefere a real. **MAS sobrescreve uma R-1 viva** (buraco latente, hoje inalcançável) |
| (D) os testes mordem | **PARCIALMENTE REFUTADA** | M1/M2/M3 mordem (RED + restauro md5-idêntico) e coincidem com 3 dos 7 mutantes do autor (`be9e7a3`). **M4 (remover `marcarVisto` dos DOIS handlers) SOBREVIVE às 4 suítes** — e nenhum mutante do autor cobre os call-sites ⇒ a cablagem «fechar/nova rodada marca visto» não está coberta |
| (E) escopo limpo; overlay agregado só mostra participações do titular | **HOLDS** | 19 ficheiros = 8 prod + 6 teste + 5 docs; zero deps; EOL não-misto; endpoint do 17a deriva o endereço do TOKEN; ambos os overlays com o mesmo contrato |

---

## Integridade do ambiente de validação

Backups FORA do repo com md5 conferido antes/depois (nunca `git checkout --`):

```
backup: e57b1ef56bbe8685a1b075284f847e9c AppContext.jsx
backup: f1c4b7707381da8f6dc518327c960fc6 edicoes-core.mjs
```

No fim de todos os experimentos:

```
$ md5sum desafio-gut/frontend/src/context/AppContext.jsx desafio-gut/frontend/netlify/functions/_lib/edicoes-core.mjs
e57b1ef56bbe8685a1b075284f847e9c  .../AppContext.jsx
f1c4b7707381da8f6dc518327c960fc6  .../edicoes-core.mjs
$ git status --porcelain desafio-gut/     # (vazio)
```

Nenhum ficheiro temporário deixado no repo (`ls _tests/ | grep -c ZZZ` → `0`).

---

## (A) O fim do leilão e o prazo real do servidor

**O que tentei.** Ler a `tick` real (`src/context/AppContext.jsx:1191-1247`), correr as 4 suítes focadas, e reproduzir eu próprio: (a) prazo sintético vencido; (b) prazo ausente/ilegível; (c) `offsetRelogioMs` ausente com o relógio do aparelho adiantado.

**Comando e saída (suíte oficial, VERDE):**
```
$ node --test --test-concurrency=1 src/context/__tests__/utac00014-show-overlay.test.mjs
✔ prazo real vencido: relâmpago já, e 1200 ms depois `setShowOverlay(true)`
✔ DEBT-016: edição SINTÉTICA com prazo vencido NÃO abre o overlay (é prazo inventado)
✔ DEBT-016/GATE 26: SEM prazo do servidor (nenhuma edição) não abre — a espera é o comportamento seguro
✔ o fim lê o relógio do SERVIDOR (offset aplicado), não o do aparelho
✔ controlo: com a linha do overlay comentada (em memória), NÃO abre — o teste morde
✔ GATE 22: edição JÁ VISTA não abre o overlay (o relâmpago ainda corre)
ℹ tests 12 / pass 12 / fail 0
```
Prova em RUNTIME (arnês real do Provider): `utac0015-provider-cablagem.test.mjs` → `tests 7 / pass 7 / fail 0`, incluindo «DEBT-016: edição SINTÉTICA … NÃO encerra nem abre o overlay» com o prazo LOCAL vencido de propósito no `localStorage`.

**Caminho no código (confirmado):** `terminoMs = ativa && ativa.sintetizada !== true && typeof ativa.termino_em === "string" ? Date.parse(...) : NaN`; `restante = prazoRealSeg === null ? null : max(0, prazoRealSeg - agoraSeg)`; `if (restante === 0)` — logo `null !== 0` **não** encerra. Uma edição com `termino_em` ilegível é ainda **descartada** na normalização (`useEdicoes.js:81` `if (!termino || Number.isNaN(Date.parse(termino))) continue`), e edição ausente ⇒ `ativa === undefined` ⇒ `restante === null`. As três negativas **seguram**.

**CONTRA-EXEMPLO (ressalva de precisão), reproduzido:**
`AppContext.jsx:1206` faz `const agoraSeg = Math.floor((Date.now() + (offsetRelogioMs || 0)) / 1000);`. `offsetRelogioMs` **começa em `null`** (`useEdicoes.js:126`) e só é preenchido quando a resposta traz `agora`. Com `offsetRelogioMs === null`, o `|| 0` faz o `Date.now()` do **aparelho** decidir. Reprodução mínima (extracção da `tick` real, sonda própria fora do repo `probe-offset-local.mjs`):

```
$ node C:/Users/Moltbot/tmp-utac17bc-veredicto/probe-offset-local.mjs
offset=null, aparelho +2h =>  chamadas: [["setEncerrado",true],["setLightningActive",true]] | temporizadores: 1
  => o APARELHO encerrou o leilão 2h mais cedo? SIM (relógio local decidiu)
```

**Conclusão (A).** O **prazo** é sempre server-authoritative e as negativas seguram — a DEBT-016 está fechada de facto. Mas a frase «o relógio local NUNCA o decide» **não é literalmente verdadeira**: há um `|| 0` que, quando o servidor não manda `agora`, faz o aparelho decidir o *instante*. **Agravante mitigado:** o endpoint `/edicoes` (`edicoes.mjs:54`) devolve sempre `agora`, e a única janela sem offset é a do 1.º render — em que a edição ainda é a sintética (`sintetizada: true`) e portanto bloqueada. **É uma lacuna de defesa-em-profundidade, não um defeito vivo.** Recomendação: tratar `offsetRelogioMs == null` como «não decidir» em vez de `|| 0` (a própria `calcularOffset` já recusa inventar um 0 — `useEdicoes.js:97-99`).

---

## (B) O «visto» por endereço e por edição

**O que tentei.** Correr a suíte do `overlayVisto`, ler o gate `!jaVisto(address, EDICAO_ATIVA)` e os dois handlers que marcam; testar EIP-55 vs minúsculas, JSON corrompido, duas edições, outro endereço.

**Comando e saída (VERDE):**
```
$ node --test src/lib/__tests__/utac0017bc-overlay-visto.test.mjs
✔ marcar e ler: a edição vista é lembrada por ENDEREÇO
✔ é POR ENDEREÇO: o que eu vi não conta para outro titular
✔ é POR EDIÇÃO: ver a R-1 não marca a R-2
✔ idempotente: marcar duas vezes não duplica
✔ endereço é normalizado (EIP-55 em maiúsculas casa com minúsculas)
✔ sobrevive a JSON corrompido e a storage que lança (nunca rebenta)
✔ limpar apaga só o endereço indicado
✔ sem `window` (SSR) não lança e assume «nada visto»
ℹ tests 8 / pass 8 / fail 0
```
O código confirma: chave `gut_overlay_visto` = `{ "<endereco-minusculas>": [ids] }`; `normalizarEndereco` faz `trim().toLowerCase()` (EIP-55 irrelevante); `lerTudo` engole `JSON.parse` inválido; o gate está no timeout de 1200 ms.

**Conclusão (B).** HOLDS. Ressalva menor (não refutação): se `address` for `null` (sessão ainda a resolver), `jaVisto(null, id)` devolve `false` e `marcarVisto(null, id)` devolve `false` sem gravar ⇒ o overlay reabriria em cada mount. **Inalcançável com prazo real** (exige uma R-1 real, que não existe em produção). Fica registado.

---

## (C) A R-1 real: id explícito

**O que tentei.** Suíte backend; e 4 sondas próprias (`probe-r1b.mjs`, ficheiro em `_tests/` apagado no fim) com o duplo de Blobs: sobrescrita, contador, bordas do regex, preferência real-vs-sintética.

**Comandos e saídas:**
```
$ node --test --experimental-test-module-mocks _tests/utac0017bc-edicao-r1.test.mjs
✔ sem id explícito: RELAMP-N/PROG-N (comportamento de sempre, sem regressão)
✔ id explícito R-1: cria a edição real com termino_em REAL
✔ id explícito inválido é recusado
✔ EDICAO_ID_RE: aceita R-N e os formatos antigos, recusa o resto
✔ DEBT-017 FECHADA: com a R-1 real criada, listarEdicoes devolve a REAL (não a sintética)
✔ GATE 26: sem R-1 no store, a sintética vem MARCADA (prazo inventado, não real)
ℹ tests 6 / pass 6 / fail 0
```

**Sondas próprias (4/4 verdes):**
```
PROBE 3: bordas do regex
  "R-1" => true   "R-0" => true   "R-999999999999" => true   "R-01" => true
  "R-1;drop" => false   "R-1 " => false   " R-1" => false
  "__proto__" => false   "constructor" => false   "r-1" => false
  "R-" => false   "R-1x" => false   "PROG-1" => true   "RELAMP-9" => true
PROBE 2: id explícito NÃO mexe no contador proximoId
  depois de criar R-1 explicito, sem id => RELAMP-1
PROBE 4: listarEdicoes prefere a REAL a sintetica?
  sem R-1 real: R-1.sintetizada = true
  com R-1 real: R-1.sintetizada = undefined | produto = P
```

**CONTRA-EXEMPLO (ressalva), reproduzido — SOBRESCRITA:**
```
PROBE 1: id explícito sobrescreve edição existente?
  2.a criacao ok = true | lances antes=42 depois= 0 | produto= P2 | status= aberto
```
`criarEdicao({id:'R-1'})` grava `store.setJSON('R-1', meta)` **incondicionalmente** (`edicoes-core.mjs:300`), sem verificar se a chave existe. Recriar a R-1 **destrói** a edição viva: `lances 42 → 0`, `status encerrado → aberto`, `produto` substituído. Não há CAS nem `if (!existente)`.

**Agravante mitigado (medido):** hoje **nada chama `criarEdicao` com `id`** — o `POST /edicoes` (`edicoes.mjs:98-106`) **não** reencaminha `body.id`; o wizard do GUTO (`chatbot.mjs:464` e `:1192`) também não. Logo o buraco é **latente e inalcançável pela API**; fecha-se sozinho se o novo caminho nunca for ligado, mas **há-de morder** no dia em que o operador ligar a criação real (item adiado por decisão R18) ou se alguém passar `body.id` no endpoint.

**Conclusão (C).** A capacidade pedida existe, o caminho antigo está intacto (contador não salta: `R-1` explícito ⇒ o próximo automático continua `RELAMP-1`) e o regex fecha injecção (`R-1;drop`, espaços, `__proto__`, `constructor` recusados). **Mas `criarEdicao` não é idempotente nem recusa colisão** — «sem abrir buraco» fica por provar. Corrigir antes de ligar o chamador.

---

## (D) Os testes mordem? (hammer próprio — e reconciliação com o do autor)

⚠️ **PREMISSA DO TASK DESACTUALIZADA:** o task dizia «o autor NÃO correu mutações». Durante a minha sessão o autor publicou `be9e7a3` (só `_logs/`) com um martelo de **7 mutantes, 7 mordem** — e, com honestidade, declara que o instrumento dele **mentiu 2×** antes (parser a contar `ℹ fail N`; e comando backend sem o prefixo `_tests/` ⇒ falso-verde). Os mutantes dele: M22 `!jaVisto`, M23 `sintetizada !== true`, M24 prazo ausente, M25 `marcarVisto` **deixa de gravar**, M26 `jaVisto` lê qualquer endereço, M27 `criarEdicao` ignora o id, M28 servidor não marca a sintética.

Reproduzi **quatro** mutações **minhas** (nenhuma copiada dos ficheiros de teste), com aplicação por substituição de bytes (EOL preservado), md5 antes/depois e restauro por cópia. As minhas M1/M2/M3 coincidem com M23/M22/M27 do autor (confirmação independente); a **M4 é a que expõe o ponto cego**: o autor mutou a *função* `marcarVisto` (M25, apanhada pelas 8 provas unitárias da função), mas **nenhum mutante dele remove a CHAMADA nos handlers** — tal como nenhum teste a cobre.

### M1 — neutralizar a guarda `sintetizada` do prazo (**MORDE**)
`ativa && ativa.sintetizada !== true && typeof …` → `ativa && typeof …`
```
APPLY M1 md5_antes=e57b1ef5… md5_depois=61b5b8a2…
✖ DEBT-016: edição SINTÉTICA com prazo vencido NÃO abre o overlay (é prazo inventado)
  AssertionError: tratou um prazo inventado como prazo real  1 !== 0
RESTORE M1 md5=e57b1ef56bbe8685a1b075284f847e9c (backup=igual) ✔
```

### M2 — neutralizar o gate do «visto» (**MORDE**)
`if (!EM_BREVE_MODE && !jaVisto(address, EDICAO_ATIVA)) …` → `if (!EM_BREVE_MODE && true) …`
```
APPLY M2 md5_depois=7de01fd5…
✖ GATE 22: edição JÁ VISTA não abre o overlay (o relâmpago ainda corre)
✖ controlo: com a linha do overlay comentada (em memória), NÃO abre — o teste morde
ℹ tests 12 / pass 10 / fail 2
RESTORE M2 md5=e57b1ef5… (backup=igual) ✔
```

### M3 — ignorar o `id` explícito no backend (**MORDE**)
`if (idPedido != null && String(idPedido) !== "") {` → `if (false) {`
```
APPLY M3 md5_depois=8469c5d2…
✖ id explícito R-1: cria a edição real com termino_em REAL
✖ id explícito inválido é recusado
✖ DEBT-017 FECHADA: com a R-1 real criada, listarEdicoes devolve a REAL
ℹ tests 6 / pass 3 / fail 3
RESTORE M3 md5=f1c4b770… (backup=igual) ✔
```

### M4 — remover `marcarVisto` dos DOIS handlers (**SOBREVIVE ⇒ REFUTAÇÃO PARCIAL de (D)**)
`marcarVisto(address, EDICAO_ATIVA);` (2 ocorrências: `handleNovaRodada` e `fecharOverlay`) → `void 0;`
```
APPLY M4 count=2 md5_depois=4320f3ac6f4066c283404513256b8f9
--- show-overlay   : tests 12 / pass 12 / fail 0
--- overlay-visto  : tests 8  / pass 8  / fail 0
--- backend r1     : tests 6  / pass 6  / fail 0
--- provider harness: tests 7 / pass 7  / fail 0
RESTORE M4 md5=e57b1ef5… (backup=igual) ✔
```
**As quatro suítes ficam TODAS verdes.** A cablagem que o commit acrescentou para fechar a 2.ª metade da DEBT-016 — «sair pelo FECHAR (ou NOVA RODADA) marca a edição como vista» — **não tem um único teste**. Confirmado por grep: nenhuma asserção em `src/**/__tests__` ou `netlify/functions/_tests` menciona `FECHAR`, `fecharOverlay` ou os handlers (só `marcarVisto` da função pura). Um mutante que reintroduza o defeito do «modal que não fecha» passa a suíte inteira.

**Conclusão (D).** As três regras centrais (prazo sintético, gate do visto, id explícito) **mordem** — confirmado por mim e coincidente com 3 dos 7 mutantes do autor. Mas a afirmação geral «os testes mordem» **é refutada em parte pela soma das peças ≠ integração**: nem a minha M4 nem nenhum dos 7 mutantes do autor cobrem a **chamada** a `marcarVisto` em `fecharOverlay`/`handleNovaRodada` (o autor mutou a função, não os call-sites). Um mutante que reintroduza o defeito do «modal que não fecha» passa a suíte inteira. É preciso um teste que clique FECHAR/NOVA RODADA num Provider real e verifique `jaVisto(...) === true` (o arnês `_arnes-provider.mjs` já monta o Provider e a página real — só falta o clique).

---

## (E) Escopo e fuga de participações

**Escopo.** `git diff --stat dd3f151 1f446db` = **19 ficheiros**: 8 de produção (`edicoes-core.mjs`, `AppContext.jsx`, `useEdicoes.js`, `overlayVisto.js`*, `useMinhasParticipacoes.js`*, `FimEdicaoOverlay.jsx`, `MercadoLances.jsx`, `Dashboard.jsx`) + 6 de teste + 5 de docs (`CLAUDE.md`, `_logs/*`). Nenhum ficheiro de produção fora do escopo. **Zero dependências novas** (`git diff … -- '*package.json' '*package-lock.json'` = vazio). EOL **não-misto** por ficheiro (medido em bytes):
```
AppContext.jsx            CRLF=1492 LF_total=1492 loneLF=0 loneCR=0
edicoes-core.mjs          CRLF=0    LF_total=372  loneLF=372 loneCR=0
overlayVisto.js           CRLF=0    LF_total=72   (LF puro)
useMinhasParticipacoes.js CRLF=0    LF_total=48   (LF puro)
FimEdicaoOverlay.jsx      CRLF=131  MercadoLances.jsx CRLF=449  Dashboard.jsx CRLF=596
```
O teste `mc941-edicao-especial.test.mjs` foi editado **legitimamente** (move `R-1` dos rejeitados para os aceites e **acrescenta** `R-1;drop`/`R-x`/`R1` aos rejeitados — não enfraquece nada).

**Fuga de participações.** O endpoint `minhas-participacoes.mjs` deriva o endereço **sempre do token** (`jwtPayload.endereco` via `validarEndereco`) — «não existe parâmetro de utilizador, logo é impossível pedir participações de terceiros». O hook (`useMinhasParticipacoes.js`) só chama com `authToken`; sem token ⇒ `semSessao` + lista vazia **sem chamada**; resposta não-array ⇒ `[]`; 401/erro ⇒ `[]`; filtra `typeof p.edicaoId === "string"`. Os **dois** overlays (`FimEdicaoOverlay` e `OverlayVencedor` do MercadoLances) recebem o **mesmo contrato** (`participacoes`, `meuEndereco`, `onClose`) e ambos usam a **mesma guarda de tipo** (`typeof vencedor?.endereco === "string"`, herdada da DEBT-013). «🏆 VENCEU» exige `id === EDICAO_ATIVA && vencedor.endereco === titular`.

**Ressalvas (E):** a secção agregada e o botão FECHAR **não têm teste** (mesma lacuna da M4); `p.lances` é formatado sem guarda (`${p.lances} lances` imprimiria `undefined lances` se o campo faltasse — cosmético); o token não é logado nem exposto no DOM (verificado por leitura).

**Conclusão (E).** HOLDS.

---

## O que um segundo validador deveria tentar

1. **Correr a suíte canónica completa** (`node ../../scripts/mc966-suite-harness.mjs ambos` **foreground**) na árvore do `1f446db`/`41d522c` e confirmar 681/681 + 990/996 (o autor declara-o; eu não o re-corri por orçamento de tempo — só as 4 suítes focadas).
2. **Provar a cablagem com clique**: estender `_arnes-provider.mjs`/`utac0015-provider-cablagem.test.mjs` para clicar FECHAR e NOVA RODADA e asseverar `jaVisto(EU,'R-1') === true` (é o mutante M4 que sobreviveu).
3. **Guardar a sobrescrita da R-1**: adicionar a `criarEdicao` uma recusa/`if (!existente)` (ou CAS) para o id explícito e um teste a recriar uma R-1 com lances.
4. **`offsetRelogioMs === null`**: testar que, sem o `agora` do servidor, o fim **não** dispara (hoje `|| 0` deixa o aparelho decidir).
5. **Corrida 1.º-render sintético → servidor real**: montar o Provider sem `/edicoes` e injectar a R-1 real depois (2.º fetch), verificando que o overlay não pisca (abre/fecha).
6. **`jaVisto` a 4 Hz**: medir o custo do `JSON.parse` no `localStorage` a cada tick de 250 ms (o `lerTudo` re-parseia a cada chamada) — hoje tolerável, mas não medido.
7. **R-1 agendada**: se a R-1 real tiver `inicio_em` no futuro, `listarEdicoes` põe-na em `agendadas` e **sintetiza** uma R-1 falsa em `edicoes` — confirmar que isso não abre overlay indevido.

---

*Veredicto escrito por validador adversarial independente. Experimentos executados em foreground; mutações restauradas por cópia FORA do repo com md5 idêntico ao original; nenhum `git add`/`commit`/`push`.*


=========================================================================================
# RESPOSTA DO EXECUTOR AO VEREDICTO (UTAC000.17bc) — 2026-10-02
=========================================================================================

**Veredicto recebido: APROVA (com ressalvas).** As duas ressalvas que ele marcou como EXIGINDO
correcção antes de ligar o novo caminho a um chamador foram corrigidas nesta mesma ronda, com teste,
mutação e suíte verde. As ressalvas menores foram corrigidas ou registadas.

| achado do validador | o que fiz | prova |
|---|---|---|
| **(D) M4: remover `marcarVisto` dos DOIS handlers SOBREVIVE às 4 suítes** | NOVO `src/context/__tests__/utac0017bc-handlers-visto.test.mjs`: extrai `fecharOverlay` e `handleNovaRodada` do `AppContext.jsx` (balanceamento de chaves) e **executa-os com duplos**, exigindo `marcarVisto(address, EDICAO_ATIVA)` — o mesmo estilo do contrato do `tick` (o arnês não tem DOM para cliques; declarado no ficheiro) | **M29 = exactamente o M4 dele: 8 RED → MORDE** (antes sobrevivia) |
| **(C) `criarEdicao({id})` sobrescreve uma R-1 viva** | guarda antes da escrita: com id EXPLÍCITO, se a edição já existe → `edicao_ja_existe`; e **falha-CLOSED** se a leitura do store falhar (operação destrutiva não arrisca) | 2 testes novos no `utac0017bc-edicao-r1.test.mjs` (8/8) + **M30 → 3 RED** |
| **(A) precisão: `offsetRelogioMs \|\| 0` deixa o relógio do APARELHO decidir** | o fim passou a **exigir** o `agora` do servidor (`offsetRelogioMs === null` ⇒ não decide) — o `/edicoes` manda sempre `agora` (medido em `edicoes.mjs` l.54), logo é seguro | teste novo no contrato do `tick` (13/13) + **M31 → 4 RED**; a alegação do relatório foi corrigida (de «NUNCA» para «nunca com o prazo real disponível, e nunca sem o relógio do servidor») |
| **(E) a secção agregada e o FECHAR sem teste** | NOVO `src/components/__tests__/utac0017bc-overlay-agregado.test.mjs` (contrato nos DOIS sítios: secção, guarda de tipo na contagem, regra do «🏆 VENCEU» idêntica, FECHAR/onClose, mesmas props) + caso no arnês que prova que o FECHAR é renderizado e que **sem participações a secção não aparece** | 7/7 + arnês 8/8 |
| **(E) `p.lances` sem guarda (cosmético)** | `Number.isFinite(p.lances) ? … : "—"` nos dois overlays | coberto pelo contrato novo |
| **(B) menor: `address === null` ⇒ o «visto» não persiste e o overlay reabriria** | **registado** (não corrigido): inalcançável com prazo real (exige uma R-1 real, que não existe em produção por decisão R18) — fica anotado no `DEBT.md` para o UTAC que criar a R-1 | — |
| **limite medido por mim (novo)**: o CONTEÚDO da secção (linhas + 🏆) não é renderizável no arnês | sonda própria: no condutor do arnês o `authToken` é **null** (visitante) e o `globalThis.sessionStorage` nem existe no contexto SSR ⇒ não há como autenticar o fetch ali. **Declarado**, com o anexo de contrato a cobrir a forma | sonda removida; registo abaixo |

**Martelo da 2.ª ronda: 10 mutantes, 10 mordem** (M22–M31), todos com restauro md5-idêntico
(`_logs/UTAC000.17bc_SEG-2_MUTACOES.txt`). **Suíte canónica final: frontend 694/694 · backend 992/998
(VERDE)** — subiu de 681/681 e 990/996 com os testes das correcções.

**Nota sobre o item 1 da lista «o que um segundo validador deveria tentar»** (correr a suíte canónica):
feito por mim na revisão congelada e agora de novo na revisão corrigida — o comando literal do
`package.json` está escrito em `_logs/UTAC000.17bc_SEG3_AD-HOC.txt`.
