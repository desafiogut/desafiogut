# UTAC110c-2d — RE-TESTE COM A CHAVE NOVA: **O GUTO FUNCIONA** (B-4 pronto a fechar, sob validação)

> **Ficheiro:** `_logs/UTAC110c-2d-verificacao-b4.md`. Saídas cruas:
> `_logs/UTAC110c-2d_SEG0_saida.txt` (as 5 respostas completas) e
> `_logs/UTAC110c-2d_recontagem-frases.txt` (correcção do meu contador).
> Endpoint: `POST https://silly-stardust-ca71bc.netlify.app/.netlify/functions/chatbot`

---

## 0. Pré-condições verificadas ANTES de testar (como combinado)

| # | pré-condição | medido | ✅ |
|---|---|---|---|
| 1 | Cauda mascarada do `LLM_API_KEY` mudou para a chave nova | **`DDLD` → `DDDD`** | ✅ |
| 2 | Deploy novo `ready` **e** `published` | **`6acdc63b609891bbd25e68e4`** · state `ready` · `published_at 05:53:09Z` · branch `main` — o mesmo id indicado pelo operador | ✅ |

📌 **A mudança de `DDLD` para `DDDD` valida retroactivamente o método**: a máscara do CLI, que eu já
tinha usado para *diagnosticar* que a var não mudava, alterou-se exactamente como previsto quando o valor
mudou de facto. **A impressão digital funciona nos dois sentidos** — serve para dizer «não mudou» **e**
«mudou».

## 1. As 5 respostas (cruas) e os critérios

| # | pergunta | HTTP | ms | `modoBusca` | `modoResposta` | chars | frases | cita artigo | proibidos | Via B |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | O que é o DesafioGUT? | 200 | 5 454 | regulamento | **`llm`** | 256 | 4 | **Art. 1º** | nenhum | pontos, ECOQUILDO, programa de fidelidade |
| 2 | Quanto custa o Passe Desafio? | 200 | 1 453 | regulamento | **`llm`** | 294 | 4 | **Art. 6º** | nenhum | Passe, pontos |
| 3 | Como consigo o cartão colecionável? | 200 | 1 674 | regulamento | **`llm`** | 249 | 3 | **Art. 9º, Art. 8º** | nenhum | Passe, pontos, cartão colecionável |
| 4 | O que é o ECOQUILDO? | 200 | 1 881 | regulamento | **`llm`** | 261 | 4 | **Art. 47º** | nenhum | Passe, ECOQUILDO |
| 5 | Como funciona o Menor Lance Único? | 200 | 2 308 | regulamento | **`llm`** | 369 | 4 | **Art. 14º, 17º, 18º** | nenhum | Menor Lance |

**Respostas literais (no log cru).** Exemplos:
- Q1: «Olha! O DesafioGUT é um programa de fidelidade gamificado do Grupo União e Trabalho, lá de Manaus
  — segundo o **Art. 1º** do Regulamento. Tem a Oferta Relâmpago e a Oferta Programada, com pontos de
  fidelidade e o ECOQUILDO. Quer criar tua conta pra participar?»
- Q2: «Boa pergunta! O Passe Desafio custa **R$ 2,00**, com preço fixo — tá no **Art. 6º** do
  Regulamento. Tem duas modalidades: Passe Relâmpago (1 lance) e Passe Programado (1 palpite), e cada um
  te dá **10 pontos de fidelidade**…»

### 1.a Avaliação dos critérios do enunciado — **TODOS CUMPRIDOS**

| critério | resultado |
|---|---|
| `modoResposta == "llm"` | ✅ **5/5** (era `template` em 10/10 nas rondas anteriores) |
| Sem HTTP 402 | ✅ nenhum; **zero** `WARN llm_http_*` nesta ronda |
| Resposta cita artigo do Regulamento | ✅ **5/5** (8 citações distintas) |
| Vocabulário Via B | ✅ presente nas 5 |
| Sem termos proibidos («senha», «Portaria 1.207», «torneio») | ✅ **ZERO** |
| Resposta curta (≤ 5 frases) | ✅ **4, 4, 3, 4, 4** |

## 2. ⚠️ ERRO DO MEU INSTRUMENTO (apanhado por mim, com prova)

Na 1.ª passagem, o critério «≤ 5 frases» deu **FAIL em 4 de 5** (6, 6, 6, 8). **Era o meu contador.**
Ele usava `/[.!?](\s|$)/g`, que conta o ponto da **abreviatura «Art.»** como fim de frase — e como as
respostas **citam** artigos, **cada citação inflacionava a contagem em 1**.

- **Não refiz as chamadas** (não gastaria API para isto): **recontei os textos já gravados**, com as duas
  lógicas lado a lado. Resultado: **5→4, 6→4, 6→3, 6→4, 8→4** ⇒ **5/5 cumprem**.
- ⚠️ **O erro era meu e ia dar um FAIL falso ao operador** sobre o único critério que faltava. Um
  contador ingénuo de frases transforma uma resposta correcta em falha de conformidade.

## 3. O GUTO NÃO INVENTOU NADA — cada afirmação conferida contra o Regulamento

| o GUTO disse | artigo citado | texto do Regulamento | confere |
|---|---|---|---|
| «programa de fidelidade gamificado … Grupo União e Trabalho» | Art. 1º | «O DesafioGUT é um programa de fidelidade gamificado operado pela … Grupo União e Trabalho (GUT)» | ✅ literal |
| «Manaus» | — | «Manaus» aparece **4×** no Regulamento | ✅ não inventado |
| «Passe Desafio custa R$ 2,00, com preço fixo» | Art. 6º | «preço fixo de R$ 2,00 (dois reais), nas modalidades Passe Relâmpago e Passe Programado» | ✅ literal |
| «cada um te dá 10 pontos de fidelidade» | Art. 8º | «concede ao utilizador 10 (dez) pontos de fidelidade» | ✅ literal |
| «a cada 50 pontos … 1 cartão colecionável da Família Quildo» | Art. 9º | «A cada 50 (cinquenta) pontos … 1 (um) cartão colecionável físico da Família Quildo» | ✅ literal |
| «menor lance que ninguém mais escolheu» | Art. 14º | «menor valor em pontos de lance que ninguém mais escolheu (menor lance único)» | ✅ literal |
| «pontos de lance não se compram com dinheiro; ganhos com atividade no app» | Art. 17º | «Os pontos de lance não são comprados com dinheiro real — são ganhos por atividade no aplicativo» | ✅ literal |
| «1 ponto = R$ 0,01» | Art. 18º | «à razão de 1 ponto = R$ 0,01 (um centavo)» | ✅ literal |
| «ECOQUILDO é moeda social interna … R$ 1,00» | Art. 47º | «moeda social interna do Grupo União e Trabalho … 1 ECOQUILDO = R$ 1,00 (um real)» | ✅ literal |

⚠️ **Nota:** este teste é possível porque **o Regulamento foi limpo das marcas de formatação no
UTAC110c-1b**. Se ainda tivesse `1\text{ ponto} = R\$ 0,01`, o GUTO leria (e repetiria) o valor
defeituoso — a ligação entre as duas rondas, agora visível em produção.

## 4. Estado do bloqueador B-4 → ✅ **FECHADO** (validador adversarial: APROVADO COM RESSALVAS, 0 bloqueantes)

**Todos os critérios do enunciado passam.** O objectivo do UTAC110c-1 — «o GUTO responde pelo Regulamento
inteiro, citando o artigo» — fica **demonstrado em produção**: responde `modoResposta: "llm"`, cita
artigos correctos e usa o vocabulário Via B, sem zero termos do modelo antigo.

**Validador adversarial** (`_logs/UTAC110c-2d_SEG3_VALIDADOR.md`, 20 657 B) — **tentou derrubar e não
conseguiu**, e ainda **reforçou** o resultado:
- **Reproduziu com 20 chamadas em 19 perguntas distintas** (as minhas 5 + 14 adversariais): **20/20
  `modoResposta:"llm"`, 0 `template`, 0 `llm_http_*`**.
- **Conferiu cada afirmação factual das 19 respostas** contra o Regulamento, lido por ele: **18 artigos
  distintos citados, todos correctos**. Apanhou detalhes que eu não tinha testado (Art. 51º, 33º, 41º,
  24º, 30º, 38º) — todos literais.
- **7 perguntas-armadilha** do modelo antigo («senha», «Portaria SPA/MF», «leilão», «torneio», «sorteio»,
  «prémio em dinheiro», «cota de ouro para lojista»): **recusou ou corrigiu em 7/7** — não ensinou o
  modelo antigo em nenhuma.
- **Recontou as frases à mão** com lógica corrigida: **3, 5, 4, 4, 5** ⇒ 5/5 ≤ 5 ✅. Confirmou a
  armadilha do meu contador: o ingénuo dava-lhe **4, 6, 6, 5, 7** = **3 fails falsos**.
- **Achou o que eu não vi:** com **5 perguntas** teria classificado **PARCIAL por amostra insuficiente**;
  só a extensão dele a 19 sustenta o fecho. **Limite declarado: 19 perguntas provam «zero invenções
  nesta amostra», não «o GUTO nunca inventa».**

⚠️ **Uma excepção que ele encontrou (ℹ️ nota, não bloqueante):** à pergunta **«Qual é a capital da
França?»** o GUTO respondeu **«Paris!»**. A resposta é verdadeira e não é invenção sobre o Regulamento,
mas mostra que **o guarda não restringe o modelo ao Regulamento** — conhecimento geral passa. Registado
como pendência (§6).

## 5. Declarado

- **Custo do GUTO: ~5 chamadas** (a primeira vez que ele consome tokens desde o 110c-1). Antes de fechar,
  medir o saldo da conta para reportar o consumo real — o meu estimador do `state.db` **sobrestima
  ~2,6×** (medido na ronda anterior), logo uso o saldo, não a estimativa.
- **Nada alterado:** zero código, zero env vars, zero deploy.
  > ⛔ **ERRATA — a afirmação acima é IMPRECISA, e o validador mediu-o (ℹ️ N1 dele).** Ela é **exacta**
  > ao nível do **worktree** (`git status` vazio) e do **commit** (`git diff --stat 71c56c5..a0ab217` = 3
  > ficheiros, +182 linhas, **todos `_logs/`**, zero código) — que é o que interessa para o teste.
  > Mas no **repo PRINCIPAL** o `git status` **não está limpo**: `M desafio-gut/frontend/package-lock.json`,
  > com **mtime 02:48 local** (entre o commit da 2c, 02:45:31, e o da 2d, 03:05:46) e **numstat 31+/53−**
  > (remove `@tanstack/react-query`, `@tanstack/query-core`, `@types/react`; acrescenta `"dev": true`) —
  > assinatura de um `npm install/ci`.
  > **A forma correcta da afirmação é: «zero alterações MINHAS no worktree/commit»** — não «nada foi
  > alterado em lado nenhum». Fica registado assim, com o texto antigo à vista.
  > 📌 **Causa mais provável, e é conhecida:** `netlify deploy` corre **build local** e ensuja este
  > ficheiro — está na memória do projecto desde o UTAC110c-2. Os `netlify deploy` desta ronda foram os
  > **do operador** (é ele que publica), o que explica o mtime entre os meus dois commits. Não é, por
  > isso, uma alteração minha — mas **eu não devia ter escrito «nada foi alterado» sem o qualificar.**
  > **Pendência em §6.**
- **Latências:** 1,4-5,5 s (a 1.ª inclui *cold start* da função).

## 6. PENDÊNCIAS registadas (para UTAC próprio — **não** são deste UTAC, e nenhuma é bloqueante)

> Regra do operador: arrumação/saneamento vai para **UTAC próprio**, não para o corrente. Ficam aqui
> registadas para não se perderem — **nenhuma delas é executada nesta ronda**.

| # | pendência | origem | porque importa |
|---|---|---|---|
| **P1** | **Alerta automático** sobre `llm_http_*` e sobre a **taxa** de `modoResposta:"template"` em produção | ℹ️ N3 do validador | ⭐ **É a lição real do B-4.** O GUTO esteve **3 rondas** a responder uma frase fixa **sem avisar ninguém**: o único sinal era um `WARN` que alguém tinha de ir ler. Sem isto, uma futura expiração de chave/saldo **volta a passar em silêncio, pelo mesmo caminho**. Acompanhar também com as **5 perguntas de regressão** deste UTAC, a correr após qualquer rotação de chave. |
| **P2** | Contexto **`dev` do Netlify ainda tem a chave ANTIGA** (len 35, texto simples, cauda `DDLD`) — só `production` tem a nova (`DDDD`, mascarada) | ℹ️ N2 | Qualquer corrida **local/`dev`/`branch-deploy`** aponta para a conta **sem saldo** ⇒ **reproduz o 402 fora de produção**. Corrigir propagando a chave, **ou** declarar que só `production` é suportado. |
| **P3** | `netlify env:list` **sem `--context production` imprime os valores REAIS** de todos os segredos (só `--context production` mascara) | ℹ️ N4 | **Armadilha de R5.** ⚠️ **O próprio validador caiu nela e declarou tê-la cometido**, imprimindo **dois** valores de segredos (`ADMIN_TOKEN`, `APP_AWS_SECRET_ACCESS_KEY`) para o seu transcript: `C:\Users\Moltbot\AppData\Local\hermes\cache\delegation\live\deleg_3080b2e6\task-0.log` (24 768 B) + o respectivo `subagent-summary-*.txt`. **Não foi o executor** (eu usei sempre `--context production` e imprimi só classes). **Acção proposta:** decidir se esses 2 ficheiros se apagam/limpa, e escrever a regra «`env:list` **sempre** com `--context production`» na metodologia. **Risco actual: LOCAL** (ficheiro na máquina do operador; nada saiu para fora). |
| **P4** | `package-lock.json` do frontend sujo no repo principal (31+/53−, mtime 02:48) | ℹ️ N1 | Artefacto conhecido do `netlify deploy` (build local). **Não afecta produção** (o Netlify serve o bundle publicado). Decidir: reverter, commitar explicitamente, ou deixar declarado. |
| **P5** | O guarda **não restringe o modelo ao Regulamento**: «Qual é a capital da França?» → **«Paris!»** | achado do validador | Nada falso nem sensível foi dito, e o gasto é irrisório. Decidir: **reforçar o prompt** para recusar tudo o que não seja DesafioGUT, **ou** aceitar e registar. |

✅ **Nenhuma destas pendências bloqueia o B-4**, que fecha pelos seus próprios critérios com o validador
adversarial a **não** conseguir derrubá-lo.
