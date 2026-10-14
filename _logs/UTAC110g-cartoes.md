# UTAC110g — CARTÕES COLECIONÁVEIS + PENDÊNCIAS DO 110f-front

**Executor:** Hermes · **Data:** 2026-10-13/14 · **Baseline:** `2579b51` (pós-110f-front)
**Carimbos:** arranque `23:42:33` (13/10) · suíte SEG-1 `23:44:22`→`23:48:51` · fecho das medições `00:10:36` (14/10)

---

## §0. Resumo executivo

| Frente | Estado | Nota |
|---|---|---|
| **A — 3 pendências do 110f-front** | ✅ **FEITA** (as 3) | F2, P-1 (com o alvo CORRIGIDO por medição) e P-2. 3 ficheiros de produção. |
| **B — adaptar `resgatar-cartao`** | ✅ **JÁ ESTAVA FEITA** | Medido: o endpoint do 106g cumpre TODO o B2 (valida ≥ 50 de CARTÃO, captura morada, grava em `resgates`, debita, idempotente, rollback). **Verificação**, não re-construção. + 5 testes novos do hook. |
| **C — integrações** | ⚠️ **PARCIAL, declarado** | C1 in-app ✅ (com o prazo) · C1-email ✅ (novo, com o e-mail do login) · C2 (Nota Técnica) ✅ **como texto do e-mail**, emissão formal é do patrocinador · **C3 (estado do pedido visível) NÃO FEITA — exige endpoint e ecrã novos, fora do AUTORIZA** (§6). |
| **D — UI** | ✅ **JÁ ESTAVA FEITA** | Botão + modal + hook existem desde o **UTAC106g**, no ecrã «Ofertas Programadas». **Não se duplicou** na Carteira (GATE 3/4). |
| Suíte | ✅ **VERDE 1049/1049 · 1213/1219** | baseline 1033/1033 · 1194/1200 → **+16** frontend, **+19** backend (RAM 1751 MB na corrida de fecho) |
| Mutação | ✅ **13/13 MORTOS** | `scripts/utac110g-prova-mutacao.mjs` |
| Bidirecional (A/B) | ✅ **20 falhas no código ANTIGO** | 11 backend + 9 frontend, medido em worktree `2579b51` |
| **Validador adversarial (SEG5)** | ⚠️ **1 BLOQUEANTE — FECHADO** | o e-mail prometia um ecrã («na sua Carteira») que a C3 não entregou; corrigido + teste-guarda + mutante M13 (§10) |

**Duração medida** (carimbos desta ronda, §11.m): `23:42:33` → fecho do código `00:10:36` = **≈28 min** de trabalho efectivo (dentro do HI5).

---

## §1. SEG-1 — medição (o log completo está em `_logs/UTAC110g_SEG-1_MEDICAO.md`)

- **RAM (A14):** 1722 / 1726 / 1734 MB livres ⇒ ≥ 1 500 ✅.
- **HEAD** `2579b51eb1d1293fcc84068d51434ca917f190b1` = baseline declarado ✅.
- **`git status`**: 6 `M` + 30 `??` **todos PRÉ-EXISTENTES** (`.agents/skills/*`, `.gitignore`, `.mcp.json`, `package-lock.json` + `_logs/MC100_*`). Nenhum tocado; commit por `git add` individual.
- **Suíte baseline:** `frontend VERDE 1033/1033 · backend VERDE 1194/1200` — reproduz o declarado ao número.

### ⚠️ 4 premissas do enunciado REFUTADAS POR MEDIÇÃO (antes de escrever código)

| # | Premissa do enunciado | Medido no `2579b51` |
|---|---|---|
| 1 | «falta a UI (botão «Resgatar cartão»…)» | **FALSO** — `OfertasProgramadas.jsx:327-336` tem o botão (gate ≥ 50 pontos de CARTÃO), + `ResgatarCartaoModal.jsx` (148 l.) + `useResgatarCartao.js`. Existem desde o **106g**. |
| 2 | «o endpoint nunca foi testado com pontos reais» | **FALSO** — 13 testes em `_tests/resgates.test.mjs` (toda a bateria do B4) + 6 em `utac106g-resgate.test.mjs`. |
| 3 | «P-1: `ler-pontos` lê a mesma linha 2× (pontos e pontosCartao)» | **NÃO é o que o código faz** — `ler-pontos.mjs:63` lê UMA vez; `pontosCartao` vem de `pontosDeCompra(registo)`, que é **pura**. A leitura dupla REAL é a do achado **F4**: `missoesDeHoje`→`estadoMissoesHoje`→`lerLedgerLance` faz um **2.º SELECT da mesma linha**, em série. Alvo corrigido. |
| 4 | «a morada é capturada onde?» | Respondido: **no modal do momento do resgate** — coerente com a R18-110g-4. |

As premissas 1 e 2 **reduzem** o trabalho; 3 e 4 **reorientam** o alvo. Não se accionou a RESSALVA «se estiver muito diferente → PARAR»: medido, o endpoint **está igual ao que o B2 pede** (§2).

---

## §2. FRENTE B — o endpoint do 106g já cumpre o B2 (tabela de verificação)

| Ponto do B2 | Medido | Onde |
|---|---|---|
| valida `pontosCartao ≥ 50` (**não** `pontos`) | ✅ | `registarResgate` → `podeResgatarCartaoComCompra` → `pontosDeCompra` (R1 do 106f) |
| captura a morada no body | ✅ | `validarMorada(body?.morada)` |
| regista em `public.resgates` com `pendente` | ✅ | `criarResgate` (`resgates.mjs:72`) |
| debita 50 pontos | ✅ | `debitarPontos(..., PONTOS_POR_CARTAO, TIPO_RESGATE, refResgate(key))` |
| idempotência | ✅ | `idempotency_key UNIQUE` + `lerResgatePorChave` + `ref` do débito |
| rollback se o registo falha | ✅ | `reverterMovimento` (reversão **integral**, achado B1 do 106g) |
| devolve o ID do pedido | ✅ | `{ resgateId, status, pontos }` |
| **B3 — migração** | ✅ **não é precisa** | `20261006_mc106g_resgates.sql` já tem TODAS as colunas (`id`, `endereco` FK, `cartao_id`, `morada` JSONB, `status` CHECK, `idempotency_key` UNIQUE, timestamps) + índices + RLS/GRANT de `service_role` |

**Testes novos desta frente (o único buraco real):** o **duplo clique no MESMO tick**, que o servidor
**não** pode proteger — `src/pages/__tests__/utac110g-resgate-hook.test.mjs` (7 testes: a guarda `emCurso`
com `Promise.all` → 1 só ida à rede; 201→ok+Bearer; chave nova por clique; 402; `sem_sessao`; C1-email
positivo e negativo).

---

## §3. FRENTE A — as 3 pendências

### A1/F2 — corrida login→leitura (`AppContext.jsx`)

**Defeito medido:** `apiPost("login-diario")` corria sem `await` e nada relia os pontos no `.then` — numa
carga directa de `/carteira` o `GET /ler-pontos` podia correr ANTES do crédito do dia (a missão saía
«⏳ Login diário» e «Você ganhou 0 pontos hoje» até à visita seguinte).

**Fix (3 linhas):** contador `pontosNonce` (`useState`) incrementado no `.then` de sucesso do login
(`setPontosNonce((n) => n + 1)`), exposto no `value` do provider e consumido pelo `usePontos` nas
dependências do `refetch` ⇒ releitura imediata. Incrementa também quando `jaCreditado` — o pedido
terminou, logo qualquer leitura concorrente é antiga.

### A2/P-1 — a leitura dupla (alvo corrigido: é o F4, não o par pontos/pontosCartao)

**Defeito medido:** 2 SELECTs da MESMA linha de `public.pontos` por pedido, **em série**
(`ler-pontos.mjs:75` → `fontes-lance.mjs:65` → `ledger-lance.mjs:56`).

**Fix:** `missoesDoRegisto(registo, agora)` — função **PURA** nova em `_lib/fontes-lance.mjs` que deriva as
missões do `historico_lance` que o `select("*")` do `lerPontos` **já trazia**. `estadoMissoesHoje` foi
re-expressa sobre ela (mantém-se para quem não tem o registo em mão). ⇒ **1 leitura por pedido**.

⚠️ **Mudança de comportamento declarada:** o modo de falha «a leitura das missões falha ⇒
`missoesHoje: null`» **deixou de existir** (não há segunda leitura para falhar). Um `historico_lance`
ilegível dá agora missões NEUTRAS (0/0/0) — provado **igual** ao caso «array vazio». O teste M4 do
110f-front foi **reescrito** (a invariante preservada é «o bloco das missões nunca derruba os pontos») e
ganhou o M5, que conta as leituras.

### A3/P-2 — ecrã aberto à meia-noite de Manaus

**Defeito medido:** `estadoMissoesHoje` calcula `diaManaus(new Date())` **no momento da chamada** (servidor)
e o `usePontos` só relia em `[address, authToken]` — nada voltava a ler ⇒ o dia anterior ficava no ecrã.

**Fix:** `setInterval(refetchPontosAgora, 60 * 60 * 1000)` no `AppContext` (1×/hora) incrementa o mesmo
`pontosNonce` ⇒ releitura; o **servidor** recalcula o dia. O cleanup limpa o **seu** intervalo.
Provas: o tick incrementa; o hook depende do nonce; e o `diaManaus` vira exactamente às **04:00 UTC**
(03:59:59Z → dia anterior; 04:00:00Z → dia novo).

**Âmbito declarado (GATE 3):** `src/hooks/usePontos.js` **não estava** na lista de ficheiros autorizados do
enunciado, mas o próprio enunciado admite-o como local do fix do P-2 («`AppContext.jsx` (ou `usePontos`)»)
e o F2 é **inalcançável** sem ele (o contador não chega ao hook). Editado com o diff mínimo (3 linhas,
aditivas) e declarado aqui.

---

## §4. FRENTE C — integrações

- **C1 in-app ✅** — `MSG_NOTIFICACAO_RESGATE` = «**Cartão resgatado! Chega em 30 dias.** A Família
  Quildo prepara e paga o envio.» (R18-110g-2/-3). O texto antigo («…A Associação vai preparar o envio.»)
  saiu; há teste que o proíbe de voltar.
- **C1-email ✅ (novo)** — `email?` opcional no corpo do `resgatar-cartao` → `validarEmail` → SendGrid
  (`_lib/email.mjs`) com o prazo, o pagador e a Nota Técnica em texto. **FAIL-SOFT** por inteiro (falta da
  dependência/chave/fornecedor não muda a resposta 201). Enviado **só** quando o pedido é NOVO (a
  repetição idempotente não reenvia). **NÃO é persistido** (minimização — ver D-110g-1).
  O destino sai do **cliente**: `useResgatarCartao` lê o e-mail do login (Privy) e põe-no no corpo — é o
  único e-mail que o sistema conhece (o JWT só traz `{endereco, tipo}`).
- **C2 Nota Técnica ✅ (como TEXTO)** — bloco «Nota Técnica do resgate nº N» no mesmo e-mail, a declarar
  que a **patrocinadora** (Associação Recreativa dos Nordestinos no Amazonas) emite, e que o DESAFIOGUT
  **não** emite documento fiscal do resgate. **LIMITE DECLARADO:** o software não emite o documento
  formal — isso é da patrocinadora (ver D-110g-3).
- **C3 estado do pedido visível ❌ NÃO FEITA** — `lerResgates` existe em `_lib/resgates.mjs` mas **não tem
  consumidor** (`git grep` devolve só a definição); não há endpoint que exponha os resgates ao titular nem
  ecrã «Meus Pedidos» (`git grep "Meus Pedidos" -- src` → vazio). Criar endpoint + ecrã = backend fora do
  AUTORIZA ⇒ **escalado** (D-110g-2), não inventado.

---

## §5. FRENTE D — já estava feita; não se duplicou

Medido: botão «🎁 Resgatar cartão» (`OfertasProgramadas.jsx:327-336`, visível e activo a ≥ 50 pontos de
CARTÃO, inactivo com a meta em falta), balão de morada (`ResgatarCartaoModal.jsx`, 148 l., campos nome/CPF/
CEP/rua/nº/compl./bairro/cidade/UF/telefone) e hook com guarda de corrida — **desde o UTAC106g**, com 6
testes de render/clique. O enunciado pedia o botão na **Carteira**; criar um segundo botão+modal lá seria
**duplicar** o fluxo (GATE 3/4). **Declarado, não duplicado.** O e-mail de confirmação (§4) foi ligado
**sem tocar em `OfertasProgramadas.jsx`** (fica no hook) — zero ficheiros de UI fora do autorizado.

---

## §6. Pendências de decisão ESCALADAS (GATE 2 — não se inventa)

| ID | Pendência | Opções medidas | Recomendação |
|---|---|---|---|
| **D-110g-1** | e-mail de confirmação: **não há destino** no servidor | (a) o cliente envia `email` no corpo (usado só para enviar, **não persistido**) · (b) migração + coluna + campo no modal · (c) não enviar | **(a) — foi a implementada.** Precisa de RATIFICAÇÃO do operador (acrescenta um campo ao contrato do corpo). |
| **D-110g-2** | estado do pedido visível (C3) | exige **endpoint novo** (`ler-resgates.mjs`) + ecrã → fora do AUTORIZA | candidato a **110g-front** / UTAC próprio |
| **D-110g-3** | «Emitir Nota Técnica» | o software não tem campos fiscais no resgate; `validarNfe`/`definirNfe` são dos **pedidos do MLC** | decidir conteúdo/formato/quem assina; hoje vai **em texto no e-mail** |
| **D-110g-4** | o botão «Resgatar cartão» ficou em **`OfertasProgramadas`**, não na **Carteira** como o enunciado pedia | (a) manter onde está (fluxo já testado, sem duplicar) · (b) acrescentar um botão/atalho na Carteira a apontar ao mesmo fluxo · (c) mover | **(a) — foi o executado** (GATE 3/4: não duplicar UI que funciona). **Achado ℹ️ do validador:** estava declarado na prosa mas **faltava nesta tabela**; fica aqui para ratificação. |

### Riscos residuais declarados (não mitigados por código)

- **Destino do e-mail vem do cliente** (D-110g-1): um autenticado com 50 pontos de COMPRA consegue pedir o
  envio do e-mail de marca para **um terceiro**. Mitigações medidas: `aplicarRateLimit(req,
  "resgatar-cartao", 5)` (5/min), custo de 50 pontos por tentativa, e o precedente `emailPagador` (PIX,
  `MinhaCarteira.jsx:88`) que já aceita e-mail do cliente. Fechar exigiria o e-mail no JWT (D-110g-1).
- **Limite da prova do P-2:** 5 dos 6 casos de `utac110g-p2-refetch-horario.test.mjs` fazem `assert.match`
  sobre o **texto** de `AppContext.jsx`/`usePontos.js` (não montam o provider real, que depende do Privy).
  Os mutantes M4/M5/M6 morrem, mas é evidência **mais fraca** que a do P-1 (execução real + contador de
  leituras). Declarado por achado ℹ️ do validador.

---

## §7. SEG4 — verificação

### Suíte canónica (foreground, `< /dev/null`)

| Momento | frontend | backend | Veredicto |
|---|---|---|---|
| Baseline SEG-1 (`23:48`) | 1033/1033 | 1194/1200 | VERDE |
| Fecho do código (`00:10`) | 1049/1049 | 1211/1217 | VERDE |
| **Fecho depois do veredicto (`00:51`, RAM 1751 MB)** | **1049/1049** | **1213/1219** | **VERDE** |

Δ = **+16 frontend** (3 F5/F2 + 6 P-2 + 7 hook do resgate) e **+19 backend** (8 P-1/P-2 + 8 C1/C2 + 1 M5 + 2 do B-110g-1 — o bloqueante do validador).

⚠️ **Uma falha foi introduzida e fechada no processo** (declarada, não escondida): o teste **M4** do
`utac110f-front-missoes.test.mjs` passou a VERMELHO porque **codificava o defeito** que o P-1 fecha («a
leitura das missões falha ⇒ `missoesHoje: null`») — o modo de falha deixou de existir. Reescrito
preservando a INVARIANTE (o bloco das missões nunca derruba os pontos), com a versão antiga à vista no
histórico do git.

### Mutação dirigida — `scripts/utac110g-prova-mutacao.mjs` → **13/13 MORDEU, 0 sobreviventes**

| Mutante | RED em |
|---|---|
| M1 o endpoint volta a fazer o 2.º SELECT | p1 (3) + missoes (1) |
| M2 missões deixam de vir do registo lido | p1 (2) |
| M3 o login deixa de mandar reler | login-diario (2) |
| M4 o tick passa a 1 minuto | p2 (1) |
| M5 `pontosNonce` sai do `value` | p2 (1) |
| M6 `usePontos` perde a dependência do nonce | p2 (1) |
| M7 a guarda `emCurso` é desligada | resgate-hook (1) |
| M8 o prazo de 30 dias sai | c1c2 (3) |
| M9 o envio do e-mail é desligado | c1c2 (2) |
| M10 o e-mail deixa de ser validado | c1c2 (2) |
| M11 o e-mail é reenviado no idempotente | c1c2 (1) |
| M12 o e-mail do login deixa de ir no corpo | resgate-hook (1) |
| **M13** o e-mail volta a prometer o ecrã «Carteira» (frase falsa do B-110g-1) | c1c2 (1) |

### Bidirecional (A/B pareado) — worktree próprio em `2579b51`

Os 6 ficheiros de teste (4 novos + 2 actualizados) copiados para um worktree criado com
`scripts/worktree-helper.mjs` no commit **anterior** ao fix:

| Bloco | Código ANTIGO | Código NOVO |
|---|---|---|
| backend (p1 + c1c2 + missoes) | **11 falhas** em 24 | 0 falhas (8+8+8) |
| frontend (p2 + login-diario + resgate-hook) | **9 falhas** em 21 | 0 falhas (7+8+7) |

⇒ **20 asserções mordem no código antigo e passam no novo.** Worktree removido pelo helper; `node_modules`
reais **498 / 414 antes == depois**.

### Quatro instrumentos independentes (o padrão que funcionou — registo pedido)

1. **Suíte canónica quantificada** (com a RAM ao lado do número).
2. **Prova de mutação versionada** (`scripts/utac110g-prova-mutacao.mjs`, âncoras em bytes com o EOL do
   ficheiro em disco + `assert count==1` + backup fora do repo) — **13/13**.
3. **A/B pareado num worktree no commit anterior** (o juiz final: os testes novos não podem passar no
   código velho) — **20 falhas no `2579b51`**.
4. **Verificador ad-hoc** (`hermes-verify-utac110g.mjs`, em `%TEMP%`, com controlo negativo): suíte canónica
   + `EM_BREVE_MODE = true` (sem comentários) + os 2 bytes `0x00`/2 `0x1F` do `CLAUDE.md` + o commit toca
   exactamente os 15 ficheiros declarados + nenhum ficheiro proibido + nenhum `.bak-*` + `HEAD = 6418a25` +
   o `ler-pontos` (só código) não chama o ledger. **14 PASS / 0 FAIL** depois de corrigir dois controlos
   negativos mal formulados (ver os erros dos instrumentos, abaixo).

E um 5.º, para o P-1/F4 especificamente: **o CONTADOR de leituras no duplo** com **controlo de vitalidade**
(uma leitura directa do ledger conta +1) — sem ele, o «1 leitura» seria aritmética, não medição.

### Erros dos MEUS instrumentos, medidos nesta ronda (declarados por exigência da série)

1. **1.º mutador (Python): 5 de 12 âncoras falhadas.** Causa: heurística de EOL errada (`d.count(b"\r\n") >
   d.count(b"\n") - d.count(b"\r\n")` avalia sempre falso em ficheiros CRLF) **e** âncoras escritas com
   `\r\n` literal que, convertidas, davam `\r\r\n`. Medido que estes ficheiros estão em **LF**.
   Corrigido: âncoras **sem EOL** e EOL derivado do ficheiro. → v2: **0 âncoras falhadas**.
2. **1.ª versão do M4 (a minha): asserção falsa.** Comparei a resposta «ilegível» com a resposta «com um
   movimento de login» e chamei-lhe «o resto é igual» — as entradas eram diferentes. Corrigido com o
   controlo certo (**ilegível == array vazio**).
3. **Erro de âncora ao escrever o teste P-1(b):** aspas duplas dentro de uma string JS com aspas duplas →
   `SyntaxError` na descoberta. Apanhado na 1.ª corrida do ficheiro.
4. **`patch` do `usePontos.js`/`useResgatarCartao.js` reportou «lint error»** com
   `Cannot find module 'C:\c\Users\...'` — é o **path mangling** conhecido do linter no Windows (C:\c\…),
   não um erro do ficheiro: a suíte canónica passou 1049/1049 depois das duas edições.
5. **Dois controlos negativos do verificador ad-hoc estavam mal formulados** (apanhados e corrigidos na
   mesma ronda): (a) um afirmava «NÃO (a suíte está verde E o fix está lá)» — verde+fix é precisamente o
   que se quer, asserção sem sentido; (b) o outro procurava `lerLedgerLance` no ficheiro **cru** e apanhou
   o símbolo citado no **comentário que explica o fix** (armadilha do §17/§19.4). O (b) passou a fazer
   *strip* de comentários **sem apagar newlines**, com controlo de vitalidade de que o *strip* não apaga
   código; o (a) passou a ser um controlo real («a suíte diz VERMELHO» tem de ser falso).
6. **Um VERMELHO transitório, declarado e não resolvido até ao fim:** a 1.ª execução do verificador ad-hoc
   deu `frontend VERMELHO 2 falha(s)`, executada **enquanto o validador adversarial corria a suíte dele na
   mesma máquina**. RAM medida nesse instante: **1707 MB** (A14 cumprida) ⇒ o suspeito é **contenção de
   CPU/IO** (os testes de render sobem um servidor vite + esbuild). **Não reproduzível:** 3 corridas
   isoladas (1 canónica + 2 com a lista exacta dos 85 ficheiros) deram **1049/1049** nas três, e a corrida
   de fecho (1751 MB) deu VERDE. **Limite declarado: não consegui nomear os 2 testes em falha** — o
   harness publica contagens, não nomes; registo em vez de silêncio.

---

## §10. SEG5 — validador adversarial

Ficheiro: `_logs/UTAC110g_SEG5_VALIDADOR.md` (cópia **integral** do veredicto + a **resposta do executor**).
Worktree próprio (`C:/Users/Moltbot/tmp-110g-val/wt` em `6418a25`), mandato «REFUTAR, não confirmar»,
gravação do veredicto como **1.ª acção**, 909,7 s.

**VEREDICTO: `ATENÇÃO — 1 BLOQUEANTE`.** Tudo o que era quantitativo foi **reproduzido ao número** e não
refutado: suíte de fecho e baseline iguais ao declarado ⇒ Δ +16/+17; mutação própria **12/12**;
A/B **11+9 falhas** no `2579b51`; e as 4 premissas refutadas por medição (o P-1 do enunciado, o endpoint
do 106g já completo, a UI já existente, «13 testes» reais) também **não** foram derrubadas.

**O bloqueante era meu e era real:** o e-mail de confirmação dizia «· O estado do pedido aparece na sua
Carteira.» — e a **C3 não existe**. Um e-mail transaccional a prometer um ecrã inexistente é uma afirmação
falsa dirigida ao titular, e **nenhum** dos meus instrumentos a podia apanhar (todos medem
alegação↔código; nenhum pergunta se o **texto** promete algo que o sistema cumpre).

**ERRATA (a conclusão errada fica à vista, marcada REFUTADA):**

> ~~«· O estado do pedido aparece na sua Carteira.»~~ — **REFUTADO** pelo validador (B-110g-1).
> Corrigido para «· Guarde este e-mail: é o comprovante do seu pedido.» + teste `B-110g-1`
> (`doesNotMatch(/Carteira/)` e `match(/comprovante/)`) + mutante **M13**. **Não re-validado** por uma
> 2.ª ronda independente (declarado).

Achados ℹ️ tratados: **D-110g-4** (o desvio do botão passa a constar da tabela de decisões escaladas);
o **risco residual do destino do e-mail** vem do cliente (declarado com as mitigações medidas); a
**evidência parcialmente *source-scraping* do P-2** (declarada como limite); e a **RAM** medida pelo
validador (1304/1296/1307) **não** é defeito do commit — o gate foi cumprido no SEG-1 e no fecho.

---

## §8. Ficheiros tocados (todos com `git add` individual)

**Produção (6):**
`netlify/functions/ler-pontos.mjs` · `netlify/functions/resgatar-cartao.mjs` ·
`netlify/functions/_lib/fontes-lance.mjs` · `src/context/AppContext.jsx` · `src/hooks/usePontos.js` ·
`src/hooks/useResgatarCartao.js`

**Testes (6):** `_tests/utac110g-p1-leitura-unica.test.mjs` (novo) ·
`_tests/utac110g-c1c2-email.test.mjs` (novo) · `_tests/utac110f-front-missoes.test.mjs` (M4 reescrito + M5) ·
`src/__tests__/utac110g-p2-refetch-horario.test.mjs` (novo) · `src/__tests__/utac110f-login-diario.test.mjs`
(F5/F5b/F5c) · `src/pages/__tests__/utac110g-resgate-hook.test.mjs` (novo)

**Instrumento:** `scripts/utac110g-prova-mutacao.mjs` (novo, 13 mutantes)

**Logs:** `_logs/UTAC110g_SEG-1_MEDICAO.md` · `_logs/UTAC110g-cartoes.md` · `_logs/UTAC110g_SEG5_VALIDADOR.md` (veredicto + resposta)

**Fecho (depois do veredicto):** `resgatar-cartao.mjs` (frase do e-mail corrigida) + `_tests/utac110g-c1c2-email.test.mjs` (+2 testes: guarda do B-110g-1 + controlo negativo) + M13 no mutador.

**NÃO tocados:** `CartaoEdicao`, `GlassHeader`, `CardLance`, `OfertasProgramadas.jsx`, `MinhaCarteira.jsx`,
migrações, env vars, `EM_BREVE_MODE` (continua `true`), `package.json`/`package-lock.json` (o lock está
sujo de sessões anteriores — não é meu e **não se toca**).

## §9. Não-medido / limites declarados

- **Runtime real com o Supabase de produção**: os testes usam duplos. A DDL (CHECK/UNIQUE/FK/RLS) e o
  deploy são do Postgres/Netlify — não medidos aqui.
- **O e-mail em produção**: o envio depende de `SENDGRID_API_KEY` (env var que o UTAC **não** autoriza
  mexer); o caminho é provado com duplo, incluindo o caso de o fornecedor falhar.
- **C3** não implementada (ver D-110g-2) e **C2** apenas como texto (ver D-110g-3).
- O **duplo clique** é provado no hook (1 só ida à rede); o clique físico (rato) não é testado (sem DOM).
- **Validador adversarial (SEG5)** despachado em worktree próprio — ver `_logs/UTAC110g_SEG5_VALIDADOR.md`.
