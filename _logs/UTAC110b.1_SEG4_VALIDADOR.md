# UTAC110b.1 — Veredicto do validador adversarial

**Alvo:** `_logs/UTAC110b.1-guto-arquitectura.md`, `_logs/UTAC110b.1-proposta-sistema.md`, `_logs/UTAC110b.1_SEG-1_MEDICAO.md`
**Código:** worktree só de leitura `C:\Users\Moltbot\tmp-110b1-val\wt` @ `ae72248` (`git log -1` confirma).
**Regras cumpridas:** nenhum ficheiro dos repositórios foi alterado. Não corri `netlify env:*`. Não li nenhuma credencial. Não fiz chamadas DeepSeek nem HF.
**Instrumentos:**
- `git grep`;
- `node` com `buscarChunksTextual`, `buscarChunksRelevantes` e `montarContexto` **reais**, importados do worktree, sobre um store falso (script `scratchpad/ragprobe.mjs`);
- `netlify blobs:get rag rag:meta`, só de leitura;
- WebFetch de `api-docs.deepseek.com/` e de `/quick_start/pricing`.

## Veredicto global: **PARCIAL — 1 bloqueante**

O núcleo factual está em grande parte correcto. Confirma-se:
- o índice tem 3 chunks;
- a HF só é usada em `rag.mjs:216`;
- o `deepseek-v4-flash` é um nome legado ainda aceite e o nome actual é `deepseek-flash`;
- a DeepSeek não tem endpoint de embeddings;
- os custos batem certo;
- 18 das 20 citações conferem.

Falha uma coisa de fundo. Os relatórios **não vêem a terceira fonte de conhecimento do GUTO**: o regulamento escrito no próprio system prompt (`_lib/guto-perfis.mjs:100-161`). Esse texto descreve o **modelo antigo**: «Programado consome SENHAS», «Senha R$ 2,00», «Portaria SPA/MF 1.207/2024», «menor lance único». Como os relatórios não o vêem, a proposta não o trata. A regra «nunca religar o LLM antes de o conhecimento corrigido estar publicado» **não fica garantida** pelos passos 1-8.

Há ainda um erro na alegação central (c), no caminho que corre hoje em produção: a busca textual **filtra** os chunks que têm zero ocorrências dos termos da pergunta.

## Tabela (a)–(j)

| # | Alegação atacada | Veredicto | Evidência |
|---|---|---|---|
| (a) | A arquitectura está completa: «consulta duas coisas… não existe um terceiro banco» (arq. §0.1 e §3) | **REFUTADO (parcial) ⛔** | Ver o achado ⛔ F1 abaixo. O resto do fluxo confere: 15 passos verificados por amostragem. |
| (b) | HF/`HF_API_TOKEN` só em runtime em `rag.mjs:216` | **CONFIRMADO** | `git grep -l -i -e huggingface -e HF_API_TOKEN -e gerarEmbedding -e lib/rag` (sem `.md`, `_logs`, `.html`, `.json`, `.txt`) devolve só: `_lib/rag.mjs`, `chatbot.mjs`, `netlify.toml`, `netlify.toml.backup-*`, `scripts/build-rag-index.mjs`, `scripts/mc964-gerar-chunks.mjs`. ℹ️ A frase «`test-mc9.1.mjs` importa `rag.mjs`» (SEG-1 §4) está errada: o script **lê o texto** do ficheiro (`fs.readFileSync(... "rag.mjs")`, `test-mc9.1.mjs:75`) e não o importa. |
| (c) | «3 chunks, TOP_K=3, sem limiar ⇒ a busca não escolhe nada, só a ordem e o corte» | **PARCIAL ⚠️** | O caminho **semântico** confirma-se: `rag.mjs:122-137` não tem limiar e devolve os 3 (só salta chunks com dimensão diferente ou cosseno não finito). O caminho **textual**, que é o que corre em produção porque a HF dá 401, tem `if (hits === 0) continue;` (`rag.mjs:287`) e **descarta** os chunks sem termos da pergunta. Prova com as funções reais: textual → `['rag:1','rag:0']`, semântica → os 3. Em produção a resposta medida no 110b §1 tem **2 fontes** (`rag:0`, `rag:1`), não 3. O diagrama («TOP_K=3 de 3 → devolve TUDO», dentro da caixa do fallback textual) está errado para esse caminho. Mesmo no caminho semântico, a ordem decide se um chunk **inteiro** cai: com a ordem `0,1,2`, `montarContexto` corta aos 4001 car. e o `rag:2` desaparece por completo (sonda: «rag:2 incluído? false»). Nesse sentido a busca «escolhe» mais do que a ordem. A conclusão da proposta (com 3 chunks, um índice não traz ganho) **mantém-se**; o que está errado é a justificação. `rag:meta` re-lido ao vivo e igual ao do relatório. |
| (d) | `deepseek-v4-flash` é nome legado aceite; `deepseek-flash` é o actual; a DeepSeek não tem embeddings | **CONFIRMADO** | A página de preços diz: «The legacy names `deepseek-v4-flash` and `deepseek-v4-flash-vision-exp` are still accepted»; esses modelos foram «retired» e as chamadas vão para o DeepSeek-V4.1-Flash, ao preço do Flash. O nome recomendado é `deepseek-flash`. Nenhuma das duas páginas lista um modelo ou endpoint de embeddings. O `deepseek-chat` não aparece em nenhuma (a LACUNA declarada está correcta). ℹ️ A página diz que o thinking é o modo **por omissão**, o que reforça o risco do `max_tokens: 512` (`chatbot.mjs:1339`) apontado na Pergunta 2. ℹ️ A documentação dá `base_url` `https://api.deepseek.com`, sem `/v1`; o código usa `/v1` (`chatbot.mjs:57`). Não testei. |
| (e) | A proposta é desproporcionada ou ignora alguma das causas C1-C5 | **PARCIAL ⚠️** | Não é desproporcionada: rejeita o Nível 3 e o pgvector, com justificação (proposta §6). Trata as 5 causas uma a uma (§3). Mas a C4 («a fonte descreve o modelo antigo») só é corrigida **no ficheiro de conhecimento novo**. A mesma classe de defeito continua viva em `guto-perfis.mjs:102,127-128,135,147-152` (F1), que nenhum passo toca. O passo 4 só toca `guto-perfis.mjs:354`. |
| (f) | As 3 respostas ao operador são genéricas ou sem prova | **CONFIRMADO que têm prova (alegação do atacante refutada)**, com 1 ⚠️ | Q1 cita `rag.mjs:216` e as contas de tamanho. Q2 é verificável na página oficial (confirmei-a). Q3 cita o Blob medido. ⚠️ Q3 diz «Dados vivos… **SERVEM**», mas os textos fixos dos intents `pacotes_cotas`/`comprar_cotas` (`guto-perfis.mjs:321-332`) ainda vendem cotas Bronze/Prata/Ouro/Diamante ao lojista. O lojista saiu do app no UTAC108f. O armazenamento serve; o conteúdo destes intents não. |
| (g) | Os diagramas ASCII não batem com o código | **PARCIAL ⚠️** | O diagrama actual (arq. §4) bate na sequência: 503, rate limit, perfil, conformidade, intents, RAG, LLM, template. Erros: (1) «TOP_K=3 de 3 → devolve TUDO» dentro do ramo textual — falso (ver c); (2) não mostra o conhecimento que já está no system prompt. O diagrama proposto (§2) mostra o system como `perfil+CONHECIMENTO`, mas `obterPromptSystem` devolve `base + REGRA_LINGUAGEM + REGRA_REGULAMENTO` (`guto-perfis.mjs:161`), e isso ficaria no prompt ao lado do conhecimento novo. |
| (h) | A ordem de implementação é insegura (regra «nunca religar o LLM antes do conhecimento corrigido publicado», passos 7-8) | **REFUTADO (parcial) ⛔** | A ordem dos passos está bem montada: o passo 7 faz deploy com a chave ainda inválida e o passo 8 põe a chave. Mas «conhecimento corrigido» só abrange o `GUTO-CONHECIMENTO.md`. No passo 8 o LLM volta com um system prompt que manda: «Programado (consome SENHAS)», «Senha: R$ 2,00 cada», «TORNEIO DE HABILIDADE nos termos da Portaria SPA/MF nº 1.207/2024» (`guto-perfis.mjs:147-150`) e «REGRA DE LINGUAGEM (obrigatória — Portaria SPA/MF 1.207/2024)» (`:102`). Isto contradiz a Via B (NORTE) e o próprio conhecimento novo. O GUTO religado passaria a dizer o modelo antigo a partir do system prompt. É a falha que a regra existe para impedir. Há ainda um conflito: o teste do passo 6 («zero «1.207/2024»») vai chocar com `REGRA_LINGUAGEM` e com o teste bidireccional `_tests/mc963-guto-regulamento-v4.test.mjs`, que liga `ARTIGOS_V4` ao `REGULAMENTO-v4.md`. A proposta não fala de nenhum dos dois. |
| (i) | As estimativas de custo são fantasia | **CONFIRMADO que estão certas** (alegação do atacante refutada), com ressalva | Refiz as contas com os preços oficiais de pico do Flash. Pior caso: 6k tokens de entrada sem cache a 0,30 US$/M dá 0,0018; 1k de saída a 1,20 US$/M dá 0,0012; total **0,0030 US$** = o valor da proposta. Caso típico: 5,5k em cache a 0,006 dá 0,000033; 0,5k sem cache a 0,30 dá 0,00015; 300 de saída a 1,20 dá 0,00036; total **≈0,00054 US$** ≈ 0,0005. Rácios do Pro: 1,32/0,30 = **4,4×** e 3,96/1,20 = **3,3×**. Ambos certos. ⚠️ O thinking é o modo por omissão. Os tokens de raciocínio são cobrados como saída, logo «300 de saída» no caso típico é optimista. Com 1-2k tokens de raciocínio, cada pergunta fica em ~0,0015-0,0027 US$, ou seja ~3-5× o «típico». Mesmo assim continua barato (< US$ 3 por 1.000 perguntas). |
| (j) | Alguma citação ficheiro:linha não diz o que o relatório afirma (≥ 12 conferidas) | **CONFIRMADO em 1, mais 2 imprecisões menores** | Ver a lista abaixo. |

### (j) Citações conferidas pelo conteúdo (20)

Conferem com o que o relatório diz:
- `chatbot.mjs:45` → `TOP_K = 3`
- `:43` → `RATE_LIMIT_RPM = 10`
- `:58` → `DEFAULT_LLM_MODEL = "deepseek-chat"`
- `:76` → `INTENT_PATTERNS`
- `:156` → `detectarIntent`
- `:289` → `detectarPerfil`
- `:886` → `INTENT_HANDLERS`
- `:1220-1255` → `tratarIntentEdicoes`
- `:1257-1260` → `chatbotAtivo`
- `:1262-1268` → `abrirStore`
- `:1284-1287` → `INSTRUCAO_CONTEXTO` (tom «tu»)
- `:1310-1369` → `chamarLLM`
- `:1311-1313` → as 3 variáveis de ambiente
- `:1317-1319` → `userContent`
- `:1339` → `max_tokens: 512`
- `:1365-1366` → `llm_resposta_vazia`
- `:1378-1380` → 503
- `:1446-1471` → bloco RAG
- `:1483-1498` → template
- `_lib/rag.mjs`: `:216` → chamada HF; `:136-137` → ordenação e corte, sem limiar; `:299-313` → `montarContexto`; `:209` → `HF_FORCE_REMOTE`
- `guto-perfis.mjs`: `:354` → `fallback_sem_llm`; `:372` → `fallback_rag`
- `ChatbotWidget.jsx`: `:367` → `apiPost(`; `:426` → `console.warn` da falha
- `docs/RAG-GUTO-v2.md`: `:17` → `---`; `:90-91` → Art. 14º
- `docs/REGULAMENTO-v4.md` = 16.770 B (exacto)
- `package.json:28` → `@xenova/transformers`
- `MC89-relatorio-final.txt:616-634` → chave DeepSeek exposta

Não conferem:
- ⚠️ **SEG-1 §5:** `NETLIFY`/`AWS_LAMBDA_FUNCTION_NAME` «(`rag.mjs:152-153`)». Essas linhas são **comentários** (o JSDoc «Detecção de ambiente»). A leitura real de `process.env` está em `rag.mjs:207-208`.
- ℹ️ **SEG-1 §4:** «`test-mc9.1.mjs` importa `_lib/rag.mjs`». Lê o texto do ficheiro, não o importa.
- ℹ️ **arq. §6:** a chave do MC89 estava num script que a escrevia em `~/.claude/settings.json` (`MC89-relatorio-final.txt:617-621`). É a chave do Claude Code em modo DeepSeek, não comprovadamente o `LLM_API_KEY`. O relatório marca o ponto como «hipótese, NÃO medida», o que é honesto.

## Achados

### ⛔ F1 — A terceira fonte de conhecimento (system prompt) não foi mapeada e tem o modelo antigo (bloqueante; afecta a, e, g, h)

O que `obterPromptSystem` (`guto-perfis.mjs:159-162`) injecta em **todas** as chamadas ao LLM:
- `REGRA_LINGUAGEM` (`:100-109`), com o título «obrigatória — Portaria SPA/MF 1.207/2024»;
- `REGRA_REGULAMENTO` (`:139-157`);
- `ARTIGOS_V4` (`:119-137`).

São factos do modelo antigo, contrários à NORTE Via B:
- «Programado (consome SENHAS)» (`:149`);
- «Senha: R$ 2,00 cada, e SÓ na modalidade Programado» (`:150`, e Art. 20 em `:128`);
- «TORNEIO DE HABILIDADE nos termos da Portaria SPA/MF nº 1.207/2024» (`:147`, Art. 38 em `:135`);
- «USA sempre: … "senha"» (`:108`).

Nada disto aparece nos relatórios do 110b nem do 110b.1. `grep -n "ARTIGOS_V4\|REGRA_REGULAMENTO\|REGRA_LINGUAGEM\|PROMPT_SYSTEMS"` nos 7 `_logs/UTAC110b*.md` → 0 ocorrências.

Consequências:
1. A arq. §0.1 («não existe um terceiro banco») está errada: o conhecimento **já está, em parte, no prompt**, que é exactamente o que a Opção A propõe.
2. Os passos 1-8 publicam um conhecimento novo, mas o prompt continua a afirmar o contrário. No passo 8 o LLM religado diria o modelo antigo.
3. Existe um teste que fixa estes textos (`_tests/mc963-guto-regulamento-v4.test.mjs`). Alterá-los obriga a decidir sobre esse contrato, e a proposta não o prevê.

**Correcção pedida:** acrescentar à proposta um passo **antes do passo 7**. Esse passo reescreve ou retira `REGRA_LINGUAGEM`/`REGRA_REGULAMENTO`/`ARTIGOS_V4` para a Via B (ou passa-os para o `GUTO-CONHECIMENTO.md`, que fica como fonte única) e actualiza o teste `mc963`. O teste do passo 6 tem de medir o **system prompt completo** (`obterPromptSystem(perfil)`, para os 4 perfis e com `conformidade`), não só o ficheiro de conhecimento.

### ⚠️ F2 — Na busca textual (o caminho que corre hoje) há filtro, e o diagrama diz «devolve TUDO»

Em `rag.mjs:287`, `if (hits === 0) continue;` descarta os chunks sem termos da pergunta. Prova com as funções reais: textual → 2 de 3. Em produção a resposta do 110b §1 tem 2 fontes. A justificação da proposta («a busca não escolhe nada») só vale para o caminho semântico, que hoje nunca corre, e mesmo aí a ordem pode deitar fora um chunk inteiro. A recomendação continua válida; a frase tem de ser corrigida.

### ⚠️ F3 — Os textos fixos dos intents ainda vendem as cotas do lojista

`guto-perfis.mjs:321-332` (`pacotes_cotas`/`comprar_cotas`): «Bronze R$ 2.640 … Diamante R$ 18.000», «Painel Lojista». O lojista saiu do app no UTAC108f. A frase «Dados vivos SERVEM» (Q3) e «intents ficam como estão» (proposta §1) deixam este conteúdo velho de fora da reescrita. Não é bloqueante para o B-4, mas é a mesma classe de defeito.

### ⚠️ F4 — O custo típico subestima a saída de um modelo com thinking por omissão

A página oficial diz que o modo thinking é o padrão. O relatório já aponta o risco do `max_tokens`, mas a estimativa «típica» de 300 tokens de saída não conta com os tokens de raciocínio. O valor realista fica ~3-5× acima, e mesmo assim barato.

### ⚠️ F5 — Citação de comentário tomada como código

SEG-1 §5 dá `rag.mjs:152-153` como sítio onde se leem `NETLIFY`/`AWS_LAMBDA_FUNCTION_NAME`. São linhas de comentário; a leitura real está em `:207-208`.

### ℹ️ F6 — `test-mc9.1.mjs` não importa `rag.mjs`

Faz `readFileSync` do ficheiro.

### ℹ️ F7 — `base_url` oficial sem `/v1`

A documentação oficial dá `https://api.deepseek.com`; o default do código é `https://api.deepseek.com/v1` e o env diz `api.deepseek.com/v1`. Não testado (sem chave). Fica como item para a sonda P0.

### ℹ️ F8 — Correcção de premissa correcta e confirmada

`deepseek-v4-flash` ainda é aceite (confirmei-o na página oficial). O nome do modelo não é a causa do 401.

## O que resistiu (não consegui refutar)

- 3 chunks, com `rag:meta` re-lido ao vivo e igual ao relatório.
- `TOP_K=3`; ausência de limiar no caminho semântico.
- HF só em `rag.mjs:216`.
- Os nomes e o estado do modelo DeepSeek; ausência de embeddings na documentação oficial.
- A matemática de custos.
- A proporcionalidade da recomendação: rejeita o Nível 3 e trata C1-C5.
- A ordem dos passos 7→8 **dentro do que a proposta cobre**.
- 18 das 20 citações conferidas pelo conteúdo.

## Limites deste veredicto

- Não verifiquei o `scope` das variáveis de ambiente (R5).
- Não chamei a API da DeepSeek, logo o comportamento do `max_tokens` com o thinking ligado não foi medido.
- Não corri a suíte de testes.
- Não abri o widget no browser.
