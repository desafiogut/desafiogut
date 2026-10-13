# UTAC110c-2 — INVENTÁRIO MEDIDO DO RESÍDUO (pré-UTAC, nada alterado)

> **Ficheiro:** `_logs/UTAC110c-2_INVENTARIO-RESIDUO.md`.
> **Natureza:** reconhecimento **só-leitura**. Nenhum ficheiro de produção foi tocado por este
> documento. Existe para dar ao operador (ou ao curador) a lista com **ficheiro:linha medidos**, que é
> o que falta para abrir o UTAC de arrumação. Método: skill `utac` (GATE 3 — resíduo à vista).

---

## 0. Porque isto existe

Os dois validadores desta ronda (110c-1 e 1b) deram **APROVADO COM RESSALVAS, 0 bloqueantes** e
mandaram tratar o resíduo **sem reverter a entrega**. O resíduo não é falha do que foi feito — é o que
**não estava no AUTORIZA** e ficou deliberadamente **à vista**. A regra do operador manda-o para UTAC
próprio; este documento é a matéria-prima.

## 1. GRUPO A — O prompt do perfil `corporativo` ainda ensina o modelo antigo (⚠️ o mais grave)

`_lib/guto-perfis.mjs` — **entra no system prompt**, por isso contradiz o Regulamento no mesmo prompt:

| linha | o que diz |
|---|---|
| **70** | «Foca em planos, **cotas comerciais**, banners e no **Painel Lojista**.» |
| 338 | «...Para volume de lances e cotas, consulta o Painel Lojista.» |
| 352 | (perfil `comum`) «Dados de mercado são exclusivos do Painel Lojista.» |
| 353 | «Detalhe completo de cotas/banners no Painel Lojista» |
| 360 | «No Painel Lojista tens os teus relatórios comerciais.» |
| 448, 449, 452 | fallbacks que remetem para o «Painel Lojista» |
| 577 | saudação: «Painel Lojista ativo. Posso dar informação sobre edições, cotas e banners.» |

**Estado:** declarado como resíduo no 110c-1. **Medido agora:** os termos «Painel Lojista»/«cotas
comerciais» aparecem em **9 linhas** do prompt do corporativo (e em 1 do `comum`, a 352).
**Nota:** o `Painel Lojista` era UI que saiu no UTAC108f ⇒ o prompt remete para um painel que já não
existe. **Risco:** o GUTO diz ao lojista que consulte um painel inexistente e usa vocabulário que o
Regulamento 5.0 não tem.

## 2. GRUPO B — «senha» na prosa de 7 intents (texto que chega ao utilizador)

`_lib/guto-perfis.mjs`, blocos `RESPOSTAS` — **18 linhas de código**, 7 intents distintos:

| intent | linhas |
|---|---|
| `indique_e_ganhe` | 367, 368, 369, 370 |
| `meu_saldo` | 384, 386, 387, 388, 390, 391, 392 |
| `relatorio_compras` | 424 |
| `metricas_usuarios` | 486 |
| `metricas_fila` | 513 |
| `metricas_eoa` | 527, 534 |
| `suporte` | 568, 569 |

Exemplos literais: «ganhas **+1 senha** por indicado»; «O saldo de **senhas** é para membros»;
«Tens N **senha(s)** válida(s)»; «Se for sobre pagamento ou **senhas**, junta o comprovativo do PIX».

**Atenuante declarada:** o subsistema **«senhas de troco» está VIVO** —
`_lib/troco-senhas.mjs` (12 linhas), importado por `chatbot.mjs:47` (`lerTroco`,
`resumoTrocoAdmin`). **Não é resíduo morto: é vocabulário do modelo antigo num subsistema que ainda
funciona.** ⇒ **Decisão de produto, não de código:** ou o subsistema migra para «Vale-Crédito»/
«pontos», ou o vocabulário fica. **Escalar ao operador antes de mexer.**

## 3. GRUPO C — referências a RAG/índice que já não existe (arrumação barata)

| # | sítio | o que se mediu |
|---|---|---|
| C1 | `desafio-gut/frontend/package.json:10` | `"build:rag": "node ../../scripts/build-rag-index.mjs"` — **alvo não existe** ⇒ deixou de ser «stale» e passou a **script QUEBRADO** (MODULE_NOT_FOUND) |
| C2 | `_lib/admin-alertas.mjs:74-76` | alerta `rag_sem_metadado` com `fonte: "build-rag-index.mjs"` — **ficheiro inexistente**; é um alerta que nunca pode ser verdadeiro |
| C3 | `chatbot.mjs:99` | regex do intent `dados_mercado` ainda dispara em **«cotas comerciais»** (gatilho de entrada, não prosa) |
| C4 | `graphify-out/graph.json` | **menciona `_lib/rag.mjs`** (artefacto gerado; regenerar é opcional) |
| C5 | `docs/RAG-GUTO-v2.md` · `docs/chatbot/regulamento.md` · `scripts/mc967-unificar-fontes.mjs` · `_tests/mc967-fontes-rag.test.mjs` | documentam/vigiam um índice que **ninguém constrói** |
| C6 | `docs/REGULAMENTO-v3.md` · `docs/REGULAMENTO-v4.md` | **FICAM** — históricos (GATE 4). Não são resíduo. |

## 4. GRUPO D — lacuna de COBERTURA da suíte (achado do validador do 1b)

`ARTIGOS_V4` tem **15 âncoras** (Arts. 1, 6, 8, 9, 12, 14, 17, 18, 24, 27, 33, 34, 37, 47, 52) para
**72 artigos** ⇒ **57 artigos sem guarda de conteúdo**. Medido pelo validador com 4 mutações
**simétricas** que passam VERDES: Art. 28º (regra de desempate invertida), Art. 21º (direito
retirado), Art. 72º (lei `5.768/1971`→`9.999/1999`), Art. 19º (CNPJ trocado). Apagar um artigo é
apanhado; **alterá-lo não é**.

**Correção proposta (barata):** `sha256` por artigo num ficheiro de referência, ou alargar o teste
`(b2)` a todos os artigos que fixam valor/prazo/lei. É o único item desta lista que aumenta a
**força de prova** em vez de arrumar.

## 5. GRUPO E — código vestigial (declarado pelo validador do 1b)

`_lib/guto-perfis.mjs:184` — o docstring de `semEscapesDaFonte` afirma «**O texto transcrito NÃO é
alterado** — é com o escape que ele vai no prompt». **Verdade até ao UTAC110c-1; FALSA depois do
1b** (o texto está limpo, 0 marcas). A função passou a **no-op**. Não foi corrigido porque
`guto-perfis.mjs` está **fora do AUTORIZA do 1b** — disciplina de escopo, deliberada.

## 6. Ordem sugerida (por risco, não por facilidade)

| prioridade | grupo | porque |
|---|---|---|
| **1** | **A** (corporativo) | é o único que faz o GUTO **contradizer o Regulamento no mesmo prompt** e remete para um painel inexistente |
| **2** | **D** (cobertura) | aumenta a força de prova; os outros são arrumação |
| 3 | C (RAG morto) | barato e sem risco de comportamento (C1/C2 são quebras reais, mas de scripts de dev) |
| 4 | E (docstring) | cosmético, mas é um comentário a mentir |
| — | **B** («senha») | **NÃO mexer sem decisão do operador**: o subsistema está vivo |

## 7. ⛔ O que falta para abrir o UTAC110c-2 — e é do OPERADOR

O roadmap do 110c-1 é: «110c-2: pôr a chave DeepSeek nova + verificação em produção». Duas metades:

1. **A chave (só o operador).** O UTAC110c-1/1b diz explicitamente «NÃO pôr a chave» e a regra **R5**
   do `CLAUDE.md` proíbe o agente de tocar em credenciais. ⇒ **A chave tem de ser posta por ti** no
   Netlify; eu não a leio nem a escrevo.
2. **A verificação em produção (minha, depois disso):** perguntar ao GUTO em produção coisas cujo
   valor está no Regulamento (ex.: «quantos pontos vale um Passe?» → 10) e coisas do modelo antigo
   (ex.: «quanto custa a senha?» → deve NÃO responder com senhas), confirmando que responde pela
   fonte nova e **não** pela antiga.

## 8. Erros dos MEUS instrumentos neste inventário (declarados)

| # | medição | o erro | correção |
|---|---|---|---|
| I1 | cobertura dos artigos | deu «**0 âncoras**» por regex sobre o texto — o número real é **15** | importar `ARTIGOS_V4` e contar as chaves |
| I2 | prosa com «senha» | grepei o **`chatbot.mjs`** e apanhei os **gatilhos** (regex), não a prosa | a prosa vive em `guto-perfis.mjs` (`RESPOSTAS`) |
| I3 | idem | deu «**1 linha**» quando o validador dizia ≥7 intents | corrigido: **18 linhas em 7 intents** — coincide com o validador |

**Nota de método:** três instrumentos errados na mesma tarefa pequena, todos apanhados por
**conferência contra a medição do validador** ou por contradição interna. É o padrão da série: o
verificador próprio mente primeiro, e a primeira medição confortável («0 âncoras», «1 linha») é
precisamente a que estava errada.
