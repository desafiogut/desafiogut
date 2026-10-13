# UTAC110c-1 — VEREDICTO DO VALIDADOR ADVERSARIAL

Worktree: `C:/Users/Moltbot/tmp-utac110c-val/wt` (detached, sha `f66520071bf729a83d126b7046c5f9d6d2489bce`).
Nada foi escrito no repo/worktree (só este ficheiro). `git status --porcelain` limpo no fim.
RAM livre medida antes da suíte: **960 MB** (A14 exige 1500 — desvio declarado, R18-110c-1).

## Veredicto: APROVADO COM RESSALVAS   ## Bloqueantes: 0

## Reproduzido por execução (pelo validador)

| # | Alegação | Comando | Resultado medido |
|---|---|---|---|
| 1 | Regulamento: 12 caps / 72 arts sem lacunas / 17 109 chars de corpo / LF / ERRATA 9 escapes | `node -e` sobre `docs/GUTO-REGULAMENTO.md` + `_lib/guto-regulamento.mjs` | 12 caps `CAPÍTULO I..XII`; arts 1..72 sem lacunas; corpo (de "REGULAMENTO OFICIAL DO DESAFIOGUT") = **17109** chars; escapes no CORPO = **9** (6×`\text{` + 3×`\$`); ficheiro LF (CR=0) |
| 2 | 2 cópias idênticas byte-a-byte | `assert REGULAMENTO_TEXTO === readFileSync(docs)` | len 19459 = 19459; **sha256 igual** `5eb7bfe4…01d9f1` |
| 3 | Prompt = base+REGRA_LINGUAGEM+REGRA_REGULAMENTO+"\n\n"+REGULAMENTO_TEXTO | `obterPromptSystem(p)` para 4 perfis + conformidade | confirmado; `includes(REGULAMENTO_TEXTO)` = **true** nos 5 |
| 4 | RAG removido, `max_tokens` 4000, HTTP `{…,fontes:[],modoBusca:"regulamento"}` | duplo de `fetch` sobre `chamarLLM` | corpo real: `max_tokens: 4000`, `model: deepseek-chat`; system leva o Regulamento inteiro; user `"Pergunta do usuário: …"`; `chatbot.mjs:1503` `fontes: [], modoBusca: "regulamento"` |
| 5 | 4 ficheiros apagados, sem importadores | `git diff --name-only`, `existsSync`, grep | `_lib/rag.mjs`, `scripts/build-rag-index.mjs`, `scripts/mc964-gerar-chunks.mjs`, `frontend/scripts/test-mc9.1.mjs` — todos GONE; imports só em comentários |
| 6 | Testes mc963/mc962 actualizados; via-b (7) e martelo novos | `wc -l`, `git diff`, `node --test` | mc963 **10/10**, mc962 **10/10**, cumulativo via-b **7/7** — todos VERDE |
| 7 | Suíte canónica frontend 979/979 · backend 1103/1109 VERDE | `node scripts/mc966-suite-harness.mjs backend|frontend < /dev/null` | `backend: VERDE 1103/1109 pass`; `frontend: VERDE 979/979 pass` — bate exactamente |
| 8 | Martelo 8/8 morde | `node _tests/utac110c-prova-mutacao.mjs` | **8/8 MORDE, 0 anulados**, restauro sha256 idêntico em todos; `git status` limpo depois |

## Achados ⚠️ grave / ℹ️ nota (com tratamento proposto)

- **ℹ️ (a) `_lib/guto-perfis.mjs:70` — o prompt do perfil `corporativo` AINDA ensina o modelo antigo.** Texto: «Foca em planos, **cotas comerciais**, banners e no **Painel Lojista**.» Isto ENTRA no system prompt (`obterPromptSystem("corporativo").length=23822`). Com o Regulamento 5.0 (patrocinadores / Cotas Bronze-Prata-Ouro-Diamante) injectado no mesmo prompt, a persona contradiz a fonte — exactamente o defeito que o UTAC veio corrigir. Ficheiro-linha + comando: `grep -n "Painel Lojista" _lib/guto-perfis.mjs` → `70,338,352,353,360,448,449,452,577`. **Tem atenuação:** o perfil `corporativo` está na lista de resíduo DECLARADO do operador → não é bloqueante, mas a declaração deve dizer que é o *prompt* (não só as respostas) que ficou no modelo antigo. Tratamento proposto: reescrever `PROMPT_SYSTEMS.corporativo` (e as respostas `dados_mercado`/`auditoria`/`fallback_sem_llm`) para «patrocinador / Cotas / contrato privado» no UTAC110c-2.
- **⚠️ (a) O verificador do teste (1)/(5) tem um BLIND SPOT — a bidireccionalidade é INCOMPLETA.** O needle-set do teste é `[/Portaria SPA/, /SPA\/MF/, /1.207\/2024/, /torneio/, /\bsenhas?\b/]` (`utac110c-guto-via-b.test.mjs:43-49`). Alimentei-o com um prompt antigo construído só com os termos que o operador listou (**«cotas comerciais» + «Painel Lojista»**) → **0 violações**. Prova: o prompt REAL do corporativo contém os dois termos e o teste (1) reporta 0 violações e passa verde. ⇛ *um mutante que reintroduza apenas «cotas comerciais»/«Painel Lojista» SOBREVIVE ao martelo* — o 8/8 não cobre esse vector. Tratamento: acrescentar `/Painel Lojista/i` e `/cotas comerciais/i` (e `/Carteira do Lojista/`) ao array `MODELO_ANTIGO`, e um mutante M9 no martelo. Nota: o enunciado do UTAC pedia só «SPA/MF, senha, torneio» — o teste cumpre a sua espec, a lacuna é face à lista (a) alargada do operador.
- **ℹ️ Resíduo NÃO declarado: «senha» sobrevive na prosa determinística de ≥7 intents** (a declaração nomeia só `meu_saldo`, `relatorio_compras`, `_lib/troco-senhas.mjs`). Medido: `indique_e_ganhe` (367-370), `meu_saldo` (384-392), `relatorio_compras` (424), `metricas_usuarios` comum (486), `metricas_fila` comum (513), `metricas_eoa` (527,534), `suporte` (568-569). Isto é texto que chega ao utilizador e usa um conceito que o Regulamento 5.0 NÃO tem. Tratamento: alargar a lista de resíduo declarado (ou purgar no 110c-2). Não é bloqueante porque o subsistema «senhas de troco» ainda existe vivo (`troco-senhas.mjs`, importado por `chatbot.mjs:47`, `cotas.mjs`, `troco.mjs`).
- **ℹ️ `package.json:10` — `"build:rag": "node ../../scripts/build-rag-index.mjs"` aponta para ficheiro APAGADO.** `existsSync('scripts/build-rag-index.mjs')` = **false** ⇛ `npm run build:rag` agora rebenta com MODULE_NOT_FOUND. Declarado como resíduo, mas deixou de ser «stale» e passou a ser um script QUEBRADO — merce um comentário ou remoção. Idem `_lib/admin-alertas.mjs:74-77`: o alerta `rag_sem_metadado` tem `fonte: "build-rag-index.mjs"` (ficheiro inexistente).
- **ℹ️ `chatbot.mjs:99` — o regex do intent `dados_mercado` ainda dispara em «cotas comerciais»** (`/volume de lances|cotas comerciais|relatorio de mercado|dados de mercado/`). Vocabulário antigo em runtime, ainda que só como gatilho de entrada. Tratamento: trocar por «Cotas Bronze/Prata/Ouro/Diamante».
- **ℹ️ Alcance (fora do AUTORIZA literal, mas defensável):** `desafio-gut/frontend/scripts/test-mc9.1.mjs` foi APAGADO — não consta da lista explícita de remoções autorizadas (`scripts/build-rag-index.mjs`, `scripts/mc964-gerar-chunks.mjs`), e vive em `frontend/scripts/`, não em `_tests/`. É um teste do RAG, logo a remoção acompanha o escopo. `_logs/UTAC110c_SEG0_geracao.txt` e `_logs/UTAC110c_SEG4_MUTACAO.txt` são `.txt`, e o AUTORIZA dizia `_logs/UTAC110c-*.md`. Nenhum dos ficheiros NÃO-AUTORIZADOS do contexto (`CartaoEdicao`, `GlassHeader`, `MinhaCarteira`, `OfertasProgramadas`, contrato on-chain, gate legal, `git add -A`) foi tocado — verificado no `git diff --name-only`.
- **ℹ️ A2/LF — falso alarme meu, resolvido:** `grep -c $'\r'` deu CR=linhas em todos os ficheiros; medição byte-level (`git cat-file blob | node` + leitura directa) prova o contrário: **blob_bytes == worktree_bytes** e **CR=0** em `docs/GUTO-REGULAMENTO.md` e `_lib/guto-perfis.mjs`; `.gitattributes` tem `*.mjs`/`*.md text eol=lf`. O blob COMMITADO é LF. A normalização alegada confirma-se.
- **ℹ️ `graphify-out/graph.json`** (artefacto gerado, excluído do runtime pelos testes) ainda referencia `_lib/rag.mjs` — regenerar é opcional.

## Alegações REFUTADAS

- **Parcialmente refutada: «o system prompt NÃO ensina o modelo antigo — nos 4 perfis»** (`utac110c-guto-via-b.test.mjs:56`). O perfil `corporativo` contém «cotas comerciais» e «Painel Lojista» (`guto-perfis.mjs:70`). A alegação vale para os 5 needles do teste, NÃO para a lista completa do operador. (Atenuada por resíduo declarado.)
- **Parcialmente refutada: a bidireccionalidade do martelo.** Existe um vector antigo («cotas comerciais»/«Painel Lojista») que NENHUM dos 8 mutantes cobre e que o verificador declara limpo (0 violações num prompt positivo). O 8/8 é verdadeiro, mas não exaustivo.
- Nenhuma outra alegação caiu: 1, 2, 3, 4, 5, 6, 7 e o 8/8 foram reproduzidos por execução própria.

## O que NÃO consegui refutar

- A identidade **byte-a-byte** das duas cópias do Regulamento (sha256 coincidente; a mutação em MEMÓRIA `Art. 8º→Art. 8o` faz divergir, logo o teste (c) MORDE — confirmei-o eu).
- A estrutura do documento: 12 capítulos, arts 1..72 sem lacuna, corpo 17 109 chars, 9 escapes no CORPO.
- A injeção do Regulamento INTEGRO nos 5 prompts (lengths 23769/23822/24266/24270/24309, todos `includes(REGULAMENTO_TEXTO)=true`, `Art. 72º` presente).
- `max_tokens: 4000` no corpo REAL do pedido (duplo de `fetch`, medido por mim, independente do teste).
- Remoção total de HuggingFace em runtime (`HF_API_TOKEN`/`huggingface.co`/`gerarEmbeddingHF` — 0 ocorrências fora de `_tests/`).
- Remoção do Blob `rag` (`getStore`/`STORE_NAME`/`name:"rag"` — só resta o comentário `chatbot.mjs:50`).
- Apagamento dos 4 ficheiros e ausência de importadores reais.
- Suíte canónica VERDE **reproduzida por mim** no meu worktree isolado (979/979 e 1103/1109).
- O martelo: medição da referência ANTES de mutar (bug histórico corrigido em `utac110c-prova-mutacao.mjs:128-131`), prova de que o mutante entrou (sha), restauro sha256 idêntico — o instrumento é sólido.
- Ausência de código fora do escopo nos ficheiros proibidos do contexto.

## O que NÃO medi

- Não medi a **fidelidade da transcrição ao PDF** (`Regulamento Oficial DesafioGUT.pdf` no Desktop): não extraí o PDF. Aceitei «12 caps / 72 arts / 17 109 chars / 9 escapes» como medição INTERNA ao repo (docs↔módulo coerentes), não como prova contra o PDF.
- Não corri a **primeira execução do harness em background** com sucesso (saída vazia → «NÃO MEDI»); resolvi correndo em primeiro plano, onde deu VERDE. Os dois resultados não foram obtidos na mesma invocação «ambos».
- Não testei o comportamento do LLM real (sem chave DeepSeek — UTAC110c-2 por desenho); não houve chamada de rede a nenhum modelo.
- Não validei o conteúdo dos artefactos `_logs/UTAC110c_SEG*.txt` além da existência e comprimento.

## Contra-prova por teste (o que teria de mudar para ficar vermelho)

- `mc963 (c)` — bastava mudar **1 char** em `docs/GUTO-REGULAMENTO.md` (provado: `Art. 8º`→`Art. 8o` diverge). MORDE.
- `mc963 (d)` — apagar um `CAPÍTULO` ou um `Art. Nº`. MORDE.
- `mc963 (e)` — «corrigir» 1 dos 9 escapes no CORPO ⇒ passa a 8. MORDE.
- `mc963 (b)/(f)` — trocar 1 âncora de `ARTIGOS_V4` por texto que o artigo não diz (provado com `R$ 5,00`). MORDE.
- `via-b (1)/(5)` — repor «Portaria SPA/MF»/«torneio»/«senha» no prompt. MORDE **para esses 5 needles**; **NÃO morde** «cotas comerciais»/«Painel Lojista» (blind spot provado).
- `via-b (2)` — retirar «competição de habilidade»/«ECOQUILDO» do prompt. MORDE.
- `via-b (3)` — condicionar/vazar o Regulamento do prompt. MORDE (também coberto por M3).
- `via-b (4)` — `max_tokens` ≠ 4000 (M2=512 ⇒ RED). MORDE.
- `via-b (6)/(7)` — reintroduzir HF ou `STORE_NAME="rag"` (M6/M7 ⇒ RED). MORDE.
- `mc962 (b)` — repor «torneio» no `guto-perfis.mjs` (`assert.doesNotMatch(limpo,/torneio/i)`). MORDE.
- Martelo M1–M8: todos mordem, restauro íntegro.

## Decisão

**APROVADO COM RESSALVAS — 0 bloqueantes.** Todas as alegações centrais foram reproduzidas por execução própria no worktree isolado: Regulamento integral no prompt (arquivo e módulo idênticos por sha256), RAG/HF/Blob `rag`/scripts removidos sem importadores, `max_tokens 4000` no pedido real, testes actualizados e suíte VERDE (frontend 979/979, backend 1103/1109). As ressalvas são de **cobertura e resíduo**, não de correcção: (i) o prompt do perfil `corporativo` continua no modelo antigo («cotas comerciais», «Painel Lojista`) — resíduo declarado mas convivendo com a fonte nova no mesmo prompt; (ii) o verificador do teste (1)/(5) é CEGO a esses dois termos (blind spot provado por execução), pelo que o martelo 8/8 não é exaustivo; (iii) «senha» sobrevive em ≥7 intents além dos 3 declarados; (iv) `package.json:build:rag` aponta para ficheiro apagado (script quebrado). Recomendo tratar (i)–(iv) no UTAC110c-2 (ou num resíduo-2 declarado), sem reverter esta entrega.
