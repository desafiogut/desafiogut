# UTAC110c-2b — VEREDICTO DO VALIDADOR ADVERSARIAL

> Validador: subagente Hermes (turno adversarial). Worktree isolado `tmp-utac110c-2b-val/wt`,
> commit `8275db2` = `origin/main`. Só leitura + execução. Nada escrito no repo.
> Saídas cruas: `tmp-utac110c-2b-val/out/` (`logs12m.txt`, `logs20m.txt`, `logs45m.txt`, `suite_val.txt`).

## Veredicto: **APROVADO COM RESSALVAS**   ## Bloqueantes: **0 novos** (B-4 permanece ABERTO por causa externa — conta/API sem saldo)

## O 402 persiste (medido por mim)?
**SIM — medido por mim, não aceite de palavra.**
- **10 chamadas minhas** ao `POST /.netlify/functions/chatbot` (produção), em 2 séries de 5 (2.ª com
  marcador `MARCADOR-n-<rand>` para garantir texto distinto). **Todas HTTP 200**, todas
  `"modoResposta":"template"`, todas a **mesma resposta de 171 chars**, `fontes: []`,
  `modoBusca:"regulamento"`, `perfil:"visitante"`. `modoResposta=="llm"`: **0 de 10.**
- **Logs por mim lidos** (`netlify logs --source functions --function chatbot`, do repo real):
  na janela de 45 min há **23 `WARN … llm_http_402`**, **23 `request_id` distintos**, 23 `resposta gerada`
  e **0 linhas com `modoResposta: 'llm'`**. Repartição por minuto:
  `04:35→5` (ronda anterior) · `05:05→10` (**a ronda do executor**) · `05:12→5` (**minha 1.ª série**)
  · `05:14→3` (**minha 2.ª série, 3 das 5 retidas — ver ⚠️ G2**).
- A única mensagem de `WARN` que existe em toda a janela é a do 402. **Não há 401, nem
  «Model Not Exist», nem `LLM_API_KEY ausente`, nem timeout, nem DNS, nem 429/500.**
- **Recorte do run do executor**: as 10 entradas de 05:05 têm `perguntaLen`
  **21/29/35/20/34 ×2** — exactamente as 5 perguntas dele, duas vezes. Confere com
  `UTAC110c-2b_SEG0_saida.txt` e `_saida_2.txt`. ⇒ as 10 chamadas foram reais.

## A inferência «conta errada» é sólida, ou há causa alternativa?
**Sólida para a conclusão operativa; a frase «o saldo está na conta ERRADA» é a hipótese mais
parcimoniosa, mas assenta numa premissa que eu NÃO pude medir (P4) — e há alternativas não exploradas.**

**O que fica ESTABELECIDO (com a minha prova):**
1. O `402 Insufficient Balance` vem **da própria DeepSeek**, não de um proxy: `LLM_BASE_URL` = 
   `https://api.deepseek.com/v1` (verifiquei por `netlify env:list`, valor não-secreto), e o
   **único** consumidor de LLM no backend é `chatbot.mjs` (grep por `api.deepseek.com|LLM_BASE_URL|
   openrouter|api.openai.com` ⇒ 1 ficheiro). Não há gateway pelo meio.
2. **402 ⇒ a chave autenticou.** Fui buscar a **documentação oficial** da DeepSeek
   (`https://api-docs.deepseek.com/quick_start/error_codes`, descarregada e lida por mim):
   «**401** – Authentication Fails … wrong API key» vs «**402** – Insufficient Balance … **check your
   account's balance**, and go to the Top up page». Além disso o código faz *throw local* se a chave
   faltar (`chatbot.mjs:1318` `if (!apiKey) throw new Error("LLM_API_KEY ausente")`) e esse erro
   **também** seria registado em `WARN` — e não aparece nenhum. ⇒ a chave existe, não está vazia e
   autenticou. (Isto **corrobora** a alegação #5.)
3. ⇒ **A conta dona da chave do Netlify não tem saldo de API utilizável.** Isto É a causa; não é
   timing, nem código, nem chave inválida, nem endereço. (As alegações #1, #2, #4-operativa, #5 ficam
   de pé.)

**Onde a inferência é FRÁGIL (ataque sério):**
- **(i) «o saldo é por conta, não por chave»** — o executor apresenta-o como facto, mas **não o mediu**
  (é conhecimento externo). A doc oficial fala de *«your **account's** balance»* e o endpoint de saldo
  é `/user/balance` — coerente com facturação por conta, mas a doc **não afirma** que duas chaves da
  mesma conta nunca possam divergir. **Contra-prova que a derrubaria:** se a DeepSeek tivesse limites/
  escopos por chave (ou chaves de sub-organização), o mesmo `402` poderia coexistir com saldo na conta
  — e a acção correcta seria «gerar chave nova na MESMA conta», não «descobrir outra conta».
  ⚠️ **Atenuante a favor do executor:** ele JÁ oferece essa via (PASSO 2 / OPÇÃO B: criar API Key nova
  na conta que tem saldo + redeploy). ⇒ a acção recomendada é **robusta à alternativa** mesmo que a
  inferência esteja errada.
- **(ii) A premissa load-bearing P4 é DECLARADA, não verificada.** O «USD 1,71 / is_available:true» da
  chave do Hermes é medição **do executor** e a ronda **proíbe-me de a repetir** — trato-a como
  afirmação, não como medição. Se P4 for falsa (conta partilhada mas saldo entretanto esgotado, ou
  leitura errada), «conta errada» degrada para «conta sem saldo» — **a acção continua certa** (cobre os
  dois casos). **Contra-prova:** comparar o **prefixo público** das duas chaves na UI de cada conta
  DeepSeek provaria se é a mesma conta — **não fiz** (exigiria ler/manusear credenciais).
- **(iii) Outras causas de `402` que o executor NÃO considerou:** conta **congelada / em atraso /
  com verificação pendente**, ou saldo numa **moeda/produto diferente** — devolvem o mesmo
  `Insufficient Balance` **com saldo visível** na conta. Isto é exactamente o cenário que faria a
  objeção do operador («a conta TEM saldo») ser **verdadeira** e o 402 persistir. O relatório só cobre
  isto no §6 (contactar `support@deepseek.com`) — **parcialmente**, e **depois** de mandar carregar
  dinheiro. ⚠️ Ver ℹ️ N3.
- **(iv) O executor nunca mediu se o operador chegou a carregar saldo, nem quando.** A cadeia
  «já falhava antes ⇒ não é timing» pressupõe que houve uma tentativa de correcção; nada o mostra.

## A acção recomendada ao operador está completa?
**Quase — é a parte mais forte do trabalho, e cobre a alternativa (ii) sozinha.**
- ✅ Tem PASSO 1 (descobrir a conta dona da chave), PASSO 2 com **duas opções** (A: carregar na conta da
  chave, mantendo contas separadas; B: criar chave nova na conta que já tem saldo + redeploy), PASSO 3
  (o passo que «ganha ou perde»: confirmar que o email da conta carregada é o mesmo da chave), PASSO 4
  (confirmar env vars + redeploy obrigatório), PASSO 5 (re-teste e as 2 leituras possíveis do resultado).
- ✅ Avisa explicitamente: **não** carregar «a ver se resolve» na conta do Hermes; **não** mexer no
  prompt. Isto protege dinheiro e âmbito.
- ⚠️ **Defeito concreto de exactidão:** o §6 do relatório manda o operador entregar ao suporte DeepSeek
  «`request_id` mais recente: **5e0fbbb8-5293-4310-9606-b54b1dbc3d2a**». Esse id **não é desta ronda**
  (ver ⚠️ G1) ⇒ o suporte não consegue rastrear. Tratamento: substituir por um id da ronda de 05:05
  (ex.: `20aebc82-…`) ou por um id recém-gerado.
- ℹ️ **Falta:** *como* descobrir a conta dona da chave (as chaves não são consultáveis por valor; só
  comparando o **prefixo** mostrado na UI do Netlify com o de cada conta DeepSeek), e um alerta de que
  «carregar na conta errada» produz exactamente o mesmo sintoma (ele diz isto no PASSO 3, mas não diz
  que **também** é o sintoma de uma conta congelada). ⇒ Risco residual de gastar dinheiro sem resolver.
  **Não pode** levar a carregar na conta do Hermes (o relatório proíbe-o explicitamente) — o risco é
  gastar **noutra conta** que afinal é a certa mas está congelada.

## Reproduzido por execução (pelo validador)
| item | comando | resultado |
|---|---|---|
| chamadas reais | `curl -X POST …/chatbot` ×10 (2 séries de 5, 5 perguntas distintas) | 10/10 **HTTP 200**, 10/10 `template`, 171 chars, `llm`=0/10 |
| logs | `netlify logs --source functions --function chatbot --since 45m` | **23** `llm_http_402`, **23** ids únicos, 0 `llm` |
| env (nomes) | `netlify env:list --json --context production` | `LLM_BASE_URL=https://api.deepseek.com/v1`, `LLM_MODEL=deepseek-flash`, `CHATBOT_ATIVO=on`, `LLM_API_KEY` **existe** (valor **nunca lido**) |
| suíte | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` (raiz do repo) | **frontend VERDE 979/979 · backend VERDE 1104/1110 · VEREDITO: VERDE** (exit 0) |
| código mudado? | `git rev-parse HEAD`; `git status --porcelain`; `git diff --stat cfe3eb8..8275db2` | HEAD `8275db2` = `origin/main`; worktree **limpo**; diff = **5 ficheiros `_logs/`, +265 linhas, ZERO código** |
| doc oficial | `curl https://api-docs.deepseek.com/quick_start/error_codes` | 401=chave errada · **402=Insufficient Balance «check your account's balance»** |

## Achados ⚠️ grave / ℹ️ nota (com tratamento proposto)
- **⚠️ G1 — Contaminação de evidência (o achado sólido desta ronda).** O 10.º `request_id` da lista
  «desta ronda» é `5e0fbbb8…` (`_logs/UTAC110c-2b-diagnostico-402.md:34` e §2 do
  `RELATORIO-UTAC110c-2b-GUTO.txt`). **Ele não é desta ronda.** A ronda dele (05:05) tem os 10 ids
  `86993279…, 9cbe8e00…, 4995feff…, 3773162d…, 9d64d1ca…, 5c9d7d23…, 9b284d09…, 1b79af2b…, 0d68b8fb…,
  `**`20aebc82…`** (ver `out/logs12m.txt:51`; `grep -c 20aebc82 logs45m.txt` = 1). `5e0fbbb8` aparece
  **0 vezes** em toda a janela de 45 min. Pior: veio por **cópia** do veredicto anterior
  (`_logs/UTAC110c-2_SEG3_VALIDADOR.md:48`), onde ele próprio é **errado** — a log de 04:35 tem hoje
  `…68427c56, **8cab8af1**` e **não** `5e0fbbb8`. E o §6 do relatório oferece-o ao **suporte DeepSeek**
  como «o mais recente». **Tratamento:** corrigir os 2 ficheiros; usar um id de 05:05 ou um id novo.
  **Nota de substância:** as 10 chamadas reais existem (prova: `perguntaLen` 21/29/35/20/34 ×2 e 10 ids
  distintos em 05:05) ⇒ a conclusão **não cai**; cai a **integridade da lista citada**.
- **⚠️ G2 — O stream `netlify logs` é LAGGY e LOSSY; não serve de ledger 1:1.** Medido por mim:
  **5 chamadas às 05:12→5 entradas**, mas **5 chamadas às 05:14→apenas 3 entradas** (e a 1.ª consulta,
  feita ~2 min depois, só mostrava 3 de 5 da 1.ª série e deu 6 de 10 no total). ⇒ a alegação #3
  («um `request_id` por chamada») **não é um método fiável** de contagem; vale no caso dele por
  coincidência favorável, e é exactamente esta perda que explica a contaminação G1 (preencher o
  «5.º id» com um valor antigo quando a linha ainda não chegou). **Tratamento:** contar chamadas pelo
  **lado do cliente** (HTTP/latência) e, ao usar logs, exigir `nº de WARN ≥ nº de chamadas` antes de
  concluir «1 por chamada»; re-consultar a mesma janela minutos depois (a janela ainda ENCHE).
- **ℹ️ N1 — «saldo por conta, não por chave» é conhecimento externo apresentado como facto.** Não
  medido por ninguém. Corroboração que arranjei: doc oficial + endpoint `/user/balance`. Tratamento:
  marcar como conhecimento externo (GATE da metodologia).
- **ℹ️ N2 — «não é timing» não está refutado, mas não está provado.** Argumento: já falhava no 110c-2
  (≈04:0xZ) e continua às 05:14Z (>1 h) ⇒ propagação improvável. **O que o mostraria cair:** um
  `modoResposta:"llm"` imediatamente após um top-up/redeploy; ou a prova de que o operador nunca
  alterou nada (aí «não é timing» perde a força, mas a causa «conta sem saldo» mantém-se).
- **ℹ️ N3 — A acção pode gastar dinheiro sem resolver.** Falta (a) o «como» descobrir a conta da chave
  (comparar prefixos na UI) e (b) o alerta de que **conta congelada/em atraso** dá o **mesmo** 402 com
  saldo visível ⇒ antes de carregar, confirmar `platform.deepseek.com → Billing` que a conta está
  **activa**, não só com saldo.
- **ℹ️ N4 — A14 reprovada e seguida: aceitável.** O executor mediu 3×, procurou o que era dele para
  libertar, não encontrou, seguiu e **declarou à cabeça**. Juízo: **aceitável**, porque (1) nesta ronda
  a suíte **não é decisória** (o objecto são 5 chamadas HTTP de ~10 MB) e (2) **um verde não se fabrica
  com falta de RAM** — a falta de RAM fabrica **vermelhos**, e ele obteve as contagens **exactas**.
  A minha medição independente: `MemFree` = **1507 MB** (antes) / **1413 MB** (durante a suíte) e
  `FreePhysicalMemory` (CIM) = **1432 MB** — **não** reproduzo a métrica dele de RAM “disponível”, mas
  os valores são da mesma ordem (não chegam folgadamente aos 1500 MB por aquela métrica). **Não devia
  ter PARADO** (o benefício de medir superava o risco); devia, sim, ter pedido o mesmo alívio de
  precedência que já tinha por escrito no 110c-1 — que foi o que fez.

## Alegações REFUTADAS
1. **Parcialmente refutada — #3 (a lista de evidência).** «10 `request_id` DISTINTOS … nos logs (um por
   chamada)»: **9 dos 10 citados são correctos; o 10.º (`5e0fbbb8…`) é de OUTRA ronda** e é uma
   cópia do veredicto anterior (que, por sua vez, também o registou mal). E o §6 do relatório manda-o
   ao suporte DeepSeek como «o mais recente» (falso — o id da sua ronda é `20aebc82-…`). A **substância**
   (10 chamadas reais e independentes) **não** cai: verifiquei 10 ids distintos em 05:05 com o padrão
   `perguntaLen` certo.
2. **Parcialmente refutada — #4 (o estatuto epistémico da causa).** «A CAUSA É CONTA ERRADA» está
   apresentada como facto; é **inferência** e apoia-se em (P4) **não verificada por mim** (proibida) e
   em (P1) **conhecimento externo não medido**. Fica **de pé** como explicação mais parcimoniosa e
   com acção robusta, mas **não** com o grau de certeza que o texto lhe dá. Alternativas **não
   exploradas**: conta congelada/em atraso/verificação pendente (mesmo 402 **com** saldo visível).

## O que NÃO consegui refutar
- **#1 — o 402 persiste** (reproduzi 10/10 + 23 WARN no log).
- **#2 — não é timing de propagação** (falha >1 h depois do suposto redeploy; nenhuma observação
  falsificante).
- **#5 — a chave autentica** (doc oficial 401≠402 + `chatbot.mjs:1318` + ausência de qualquer
  `LLM_API_KEY ausente`/401 nos logs).
- **A conclusão operativa** «é uma condição de CONTA/facturação, não de código/chave/endereço»:
  robusta, com 3 provas independentes minhas (env var, único consumidor, doc oficial).
- **#6 — `deepseek-flash` é LACUNA declarada** (ver N-medi abaixo; honesto).
- **#7 — B-4 ABERTO** (zero respostas de modelo inspeccionáveis — confirmei: 0 linhas `llm`).
- **#8 — A14 reprovada e declarada** (os números dele são plausíveis; medições minhas da mesma ordem).
- **A suíte: VERDE 979/979 · 1104/1110** — **reproduzi exactamente** (exit 0). E o `1104/1110` é
  **VERDE legítimo**, não escondido: o harness (`scripts/mc966-suite-harness.mjs:64`) só dá VERMELHO se
  `fail>0`; logo os 6 que faltam são **skipped**, não falhas.
- **Nada foi alterado pelo executor**: `git diff --stat cfe3eb8..8275db2` = só 5 `_logs/`, +265 linhas.

## O que NÃO medi
- **O saldo da chave do Hermes** — **proibido** nesta ronda; P4 fica por verificar (é afirmação do
  executor).
- **O valor de `LLM_API_KEY`** (Netlify ou Hermes) — proibido (R5).
- **Qual é a conta dona da chave do Netlify** — impossível sem ler credenciais.
- **Se `deepseek-flash` é aceite** — a ronda proíbe a chamada directa de teste; e o 402 precede a
  resolução do modelo ⇒ não distinguível nesta ronda (LACUNA honesta).
- **Se a DeepSeek tem restrições por chave / sub-contas** — só conhecimento externo + doc; não medi.
- **A métrica exacta de RAM da A14 do executor** (`wmic` ausente neste host; usei `/proc/meminfo`
  `MemFree` e `FreePhysicalMemory` do CIM — métricas diferentes das dele).
- **Se/onde/quando o operador carregou saldo** — não há registo acessível a mim.

## Contra-prova por afirmação
| # | afirmação | o que a faria CAIR |
|---|---|---|
| 1 | «o 402 persiste» | uma única resposta com `modoResposta:"llm"`; ou 401/429/modelo nos logs |
| 2 | «não é timing» | um `llm` imediato após top-up/redeploy; ou prova de que nada foi alterado |
| 3 | «10 ids distintos ⇒ 10 chamadas reais» | 2 ids iguais; ou nº de WARN > nº de chamadas (⚠️ **já enfraquecida**: 1 id citado é de outra ronda; stream lossy — `grep -c 5e0fbbb8` = 0, `20aebc82` = 1) |
| 4 | «a causa é conta errada» | provar que as 2 chaves são da **mesma conta** (comparar prefixos na UI); ou `is_available:false`/conta congelada na conta do GUTO; ou refutar P1 (limites por chave) |
| 5 | «a chave autentica» | aparecer 401; ou `WARN … LLM_API_KEY ausente`; ou um gateway a validar saldo antes da chave |
| 6 | «`deepseek-flash` = lacuna» | uma chamada directa (proibida nesta ronda) ⇒ mantém-se lacuna, não erro |
| 7 | «B-4 aberto» | uma única resposta de modelo para inspeccionar |
| 8 | «suíte VERDE 979/979 · 1104/1110» | eu obter VERMELHO/`NAO_MEDI`, ou contagens diferentes |
| — | «zero código mudado» | qualquer `git status` sujo ou ficheiro não-`_logs` no diff |
| — | «402 vem da DeepSeek» | `LLM_BASE_URL` a apontar para outro host, ou 2.º consumidor de LLM |

## Decisão
**APROVADO COM RESSALVAS — 0 bloqueantes novos.**

A ronda **cumpriu o que prometeu**: mediu o 402 em produção (**eu reproduzi 10/10**), provou que **não
é timing/chave/código/endereço** (com 3 provas independentes minhas, incluindo a doc oficial da
DeepSeek) e entregou uma acção ao operador **robusta**, que cobre inclusive a alternativa que refutaria
a sua própria inferência (OPÇÃO B: chave nova na conta com saldo). **B-4 permanece ABERTO** e é
**externo**: sem saldo na conta correcta não existe resposta de modelo para inspeccionar.

As ressalvas **não derrubam** o diagnóstico, **corrigem-nas**:
1. **⚠️ G1** — corrigir o `request_id` contaminado (`5e0fbbb8…` → `20aebc82…` ou id novo) em
   `_logs/UTAC110c-2b-diagnostico-402.md:34` e no §2/§6 do `RELATORIO-UTAC110c-2b-GUTO.txt`.
2. **⚠️ G2** — não usar `netlify logs` como ledger 1:1 (é laggy/lossy: **5 chamadas → 3 entradas**).
3. **ℹ️ N3** — acrescentar ao relatório: como achar a conta da chave (prefixo na UI) e o alerta de
   **conta congelada** (mesmo 402 com saldo visível) **antes** de carregar dinheiro.
4. **ℹ️ N1/ℹ️ N2** — marcar «saldo por conta» como conhecimento externo e «não é timing» como
   inferência (não medição).

**Não é PARCIAL nem REFUTADO** porque nenhuma alegação substantiva caiu: o 402 persiste, a causa é de
conta, a acção funciona. **Não é APROVADO limpo** porque a peça de evidência que o executor mais
destaca (a lista de 10 `request_id`) tem **1 entrada forjada por cópia de outra ronda**, e essa mesma
entrada errada foi endereçada ao suporte DeepSeek.
