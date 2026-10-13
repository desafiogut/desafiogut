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

## 4. Estado do bloqueador B-4

**Todos os critérios do enunciado passam.** O objectivo do UTAC110c-1 — «o GUTO responde pelo Regulamento
inteiro, citando o artigo» — fica **demonstrado em produção**: responde `modoResposta: "llm"`, cita
artigos correctos e usa o vocabulário Via B, sem zero termos do modelo antigo.

⚠️ **B-4 fica PRONTO A FECHAR, pendente do validador adversarial** (despachado nesta ronda): foi ele que
apanhou, nas duas rondas anteriores, coisas que eu não vi — o ponto cego do needle-set e o `request_id`
contaminado. Não fecho um bloqueador sem lhe dar a oportunidade de o tentar derrubar.

## 5. Declarado

- **Custo do GUTO: ~5 chamadas** (a primeira vez que ele consome tokens desde o 110c-1). Antes de fechar,
  medir o saldo da conta para reportar o consumo real — o meu estimador do `state.db` **sobrestima
  ~2,6×** (medido na ronda anterior), logo uso o saldo, não a estimativa.
- **Nada alterado:** zero código, zero env vars, zero deploy.
- **Latências:** 1,4-5,5 s (a 1.ª inclui *cold start* da função).
