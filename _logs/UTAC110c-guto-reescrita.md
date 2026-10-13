# UTAC110c-1 — SEG1/SEG2/SEG3/SEG4 · FRENTES B, C, D, E

> **Ficheiro:** `_logs/UTAC110c-guto-reescrita.md`. Complementa `_logs/UTAC110c_SEG-1_MEDICAO.md`
> (medição) e `_logs/UTAC110c_SEG4_MUTACAO.txt` (saída crua do martelo).
> Método: skill `utac` (`segments/seg0-3.md`, `seg4.md`), HARD GATES 3-8, 10, 12, 14, 16.

---

## 0. O DEFEITO QUE ISTO CORRIGE (causa medida, não suposta)

O validador do UTAC110b.1 deu **PARCIAL com 1 bloqueante (F1)**: mesmo com chaves novas e o índice
RAG corrigido, o GUTO continuaria a ensinar o **modelo antigo**, porque o **system prompt**
(`guto-perfis.mjs:100-162`) o ensinava por palavras próprias — «torneio de habilidade», «Portaria
SPA/MF 1.207/2024», «Programado (consome SENHAS)», «Senha: R$ 2,00 cada».

Havia **três fontes de conhecimento** e todas as três traziam o modelo antigo:
1. a **persona** (`PROMPT_SYSTEMS`, «Ajuda com lances, senhas e regras»);
2. o **resumo de 10 artigos** (`ARTIGOS_V4`, copiado do `REGULAMENTO-v4.md`);
3. o **índice RAG** (Blob `rag`, 3 excertos / 6 640 chars) — o HuggingFace dava **401** em produção,
   logo corria sempre o fallback textual, e os excertos carregavam o vocabulário antigo que o LLM
   espelhava ao utilizador. **É a causa-raiz do «o DESAFIOGUT é tipo um leilão sim» (2026-09-25).**

A decisão do operador: **o GUTO passa a ter o REGULAMENTO INTEIRO no prompt** (não um resumo, não
um índice de 3 excertos) e responde directamente a partir dele.

---

## 1. FRENTE A (SEG0) — o Regulamento no repo

**Entregável:** `docs/GUTO-REGULAMENTO.md` (novo) + `_lib/guto-regulamento.mjs` (derivado).

| item | medido |
|---|---|
| fonte | `~/Desktop/Regulamento Oficial DesafioGUT.pdf` (156 810 B, 7 páginas) |
| extractor | **texto nativo do PDF** (`pymupdf 1.28.2`), não OCR |
| capítulos | **12** (`CAPÍTULO I`…`XII`) |
| artigos | **72**, `Art. 1º`…`Art. 72º`, **sem lacunas** e sem extras |
| chars (corpo) | **17 109** · com cabeçalho: **19 459** · bytes 20 427 |
| EOL | **LF**, 0 CRLF, 0 bytes de controlo |
| limite do enunciado | 30 000 chars ⇒ **cabe folgado, não é preciso resumir** |

### 1.a Normalizações declaradas E PROVADAS por asserção (a cada geração)
1. **Quebras de linha do PDF** reagrupadas em parágrafos + remoção do **espaço de largura zero**
   (U+200B) que o PDF cola aos marcadores — provado por
   `normalizado(transcrição) == normalizado(cru)`.
2. O glifo **`●`** do PDF passou a marcador de lista Markdown (`- `) — provado por
   `reverter(etapa) == cru sem ZWSP`.
   **As duas asserções ABORTAM a geração** se deixarem de valer.

### 1.b ⚠️ ERRATA DA FONTE — o PDF oficial está DEFEITUOSO (achado)
O documento oficial **imprime literalmente os escapes com que foi gerado**: `R\$ 2,00`,
`1\text{ ponto} = R\$ 0,01`, `1\text{ ECOQUILDO} = R\$ 1,00`, e as duas proporções do Art. 37º.
**São 9 escapes, sempre nos artigos dos VALORES** (Arts. 6, 18, 37, 47).

**Três instrumentos independentes concordam que é do documento, não do extractor:**
1. `pymupdf` (texto nativo) — 9 backslashes;
2. o conversor do `read_file` — os mesmos escapes;
3. **renderização da página a 150 dpi, lida a olho** — está **impresso**:
   «à razão de `1\text{ ponto} = R\$ 0,01` (um centavo)».

**O que se fez (fidelidade vs. utilidade):** a transcrição **NÃO corrige o escape** (é a fonte de
verdade, não se edita) e leva no topo uma secção **ERRATA DA FONTE** — anotação claramente marcada
como não sendo texto do Regulamento — com a tabela `impresso → valor pretendido → artigo`. O
gerador **falha** se a errata deixar de cobrir exactamente os escapes que existem.
**Pendência para o operador:** o documento registado no RTD não deve imprimir `\text{` nem `R\$`.

### 1.c Porque existe `_lib/guto-regulamento.mjs` (ficheiro derivado)
As Netlify Functions são empacotadas pelo **esbuild a partir de `netlify/functions/`**: nada fora
dessa pasta entra no bundle. Um `readFileSync("../../../../docs/…")` funcionaria **nos testes** e
daria **ENOENT em Lambda**. Logo o texto é **embutido** num módulo. O preço é haver duas cópias — e
o preço é pago: `_tests/mc963…` compara-as **byte a byte** (teste `(c)`).

---

## 2. FRENTE B (SEG1) — system prompt na Via B

Ficheiro: `netlify/functions/_lib/guto-perfis.mjs` (+150/−70 linhas).

| bloco | antes | depois |
|---|---|---|
| `REGRA_LINGUAGEM` | «Portaria SPA/MF 1.207/2024», «TORNEIO DE HABILIDADE», «torneio de habilidade», «senha» | «PROGRAMA DE FIDELIDADE GAMIFICADO», «competição de habilidade», «Oferta Relâmpago/Programada», «Passe Desafio», «pontos de fidelidade», «ECOQUILDO»; **proibição de enquadrar em autorização governamental** |
| `ARTIGOS_V4` | 10 artigos do **v4**, incluindo Art. 38 «torneio de habilidade … Portaria SPA/MF» | **15 âncoras** do Regulamento **5.0**, cada uma **excerto verbatim** do artigo |
| `REGRA_REGULAMENTO` | factos em prosa do v4: «Programado (consome SENHAS)», «Senha: R$ 2,00 cada» | **instruções de uso do documento integral** + âncoras; proibição de citar artigo ausente |
| `obterPromptSystem` | `base + REGRA_LINGUAGEM + REGRA_REGULAMENTO` | `+ "\n\n" + REGULAMENTO_TEXTO` — **o Regulamento inteiro** |
| `PROMPT_SYSTEMS.comum` | «Ajuda com lances, **senhas** e regras» | «lances, **passes**, **pontos de fidelidade** e regras» |
| `PROMPT_CONFORMIDADE` | «sobre o **torneio**, lances, carteira, saldo ou **senhas**» | «as Ofertas (Relâmpago ou Programada), lances, carteira, passes ou pontos de fidelidade» |
| intents `comprar_cotas`/`pacotes_cotas` | tabela de preços de lojista: Bronze R$ 2.640 … Diamante R$ 18.000 + «senhas de troco» | **patrocínio por contrato privado** (Arts. 12º/24º) — o Regulamento **não fixa valores**, logo o GUTO não os cita |
| comando ALFA `reindexar_rag` | apontava para `build-rag-index.mjs` | **removido** (não há índice) |

### 2.a A proibição NÃO nomeia o termo proibido
A primeira redacção dizia «NUNCA menciones "Portaria SPA/MF"…» — e o critério do enunciado é
«o system prompt **não contém** 'Portaria SPA/MF'». Reescrito para proibir o **enquadramento** sem
nomear a marca: evita falhar o critério **e** evita que o LLM ecoe o termo ao negá-lo.

### 2.b Medição do prompt final (Frente D)
| perfil | chars (normal) | chars (conformidade) |
|---|---|---|
| visitante | 24 110 | 24 149 |
| comum | 24 106 | 24 149 |
| corporativo | 23 662 | 24 149 |
| admin | 23 609 | 24 149 |

≈ **7 k tokens** de entrada — cabe folgado no contexto do DeepSeek. Os 4 perfis continuam distintos
(guardado por `mc8820`).

### 2.c O que NÃO se tocou (resíduo declarado, GATE 3)
O enunciado nomeia `pacotes_cotas`/`comprar_cotas`. **Não** nomeia, e por isso **ficaram**:
`meu_saldo` («senhas de troco»), `relatorio_compras` («vendas de senhas»), `_lib/troco-senhas.mjs`,
o texto do perfil `corporativo` («cotas comerciais … Painel Lojista», UI que saiu no UTAC108f), o
`dados_mercado` (regex «cotas comerciais») e as superfícies de UI (`artigosUI.test.mjs`,
`glossario.test.mjs` exigem «torneio de habilidade»/«senhas» no dicionário PT). **São modelo antigo
em zonas que o spec não autorizou** — escalado, não corrigido.

---

## 3. FRENTE C (SEG2) — RAG, HuggingFace e Blob removidos

| sítio | antes | agora |
|---|---|---|
| `chatbot.mjs` | `import { gerarEmbedding, buscarChunksRelevantes, buscarChunksTextual, montarContexto } from "./_lib/rag.mjs"` | **removido** |
| `chatbot.mjs` | `STORE_NAME = "rag"`, `TOP_K = 3`, `LIMITE_TRECHO_TEMPLATE = 400` | **removidos** |
| `chatbot.mjs` | `abrirStore()` → `getStore({name:"rag"})` | **removido** |
| `chatbot.mjs` | pipeline em 3 camadas (embedding HF → cosseno → textual TF-IDF → `montarContexto`) | **substituído** por `chamarLLM(pergunta, "", { systemPrompt: obterPromptSystem(...) })` |
| `chatbot.mjs` | `resposta = obterResposta("fallback_sem_llm", perfil, { trecho })` com excerto do RAG | `{ trecho: "" }` (o fallback é a frase de saída do perfil) |
| `chatbot.mjs` | `"Pergunta do usuário (sem contexto encontrado): …"` | `"Pergunta do usuário: …"` — **a mensagem era falsa**: o contexto existe e é o Regulamento, no system prompt |
| `chatbot.mjs` (resposta) | `fontes: chunks.map(...)`, `modoBusca: "semantica"\|"textual"` | `fontes: []`, `modoBusca: "regulamento"` |
| ficheiros | `_lib/rag.mjs`, `scripts/build-rag-index.mjs`, `scripts/mc964-gerar-chunks.mjs`, `frontend/scripts/test-mc9.1.mjs` | **APAGADOS** (`git rm`) |

**Prova de que o HF saiu de runtime:** varredura de todos os `.mjs` das functions (excepto
`node_modules`/`_tests`/`graphify-out`) por `HF_API_TOKEN`, `huggingface.co`, `HF_EMBED_URL`,
`HF_FORCE_REMOTE`, `gerarEmbeddingHF` → **0 ocorrências**, com **controlo positivo** de que o
matcher morde. Idem para o Blob: `getStore({…name:"rag"})`, `"rag:meta"`, `STORE_NAME = "rag"` → **0**.

### 3.a O contrato HTTP foi PRESERVADO (HI9 — não se parte o cliente)
`ChatbotWidget.jsx:410` faz `data.fontes || []` e `:728` só renderiza o bloco quando
`fontes.length > 0`. Retirar as chaves obrigaria a mexer no frontend — **fora do AUTORIZA**. A
lista vazia esconde a secção sem rebentar nada. **Declarado ao operador:** a funcionalidade
«fontes citadas» desaparece para o utilizador; o GUTO passa a citar **artigos** no texto.

### 3.b Órfão DECLARADO (não corrigido, GATE 3)
`_lib/admin-alertas.mjs:74-77` emite um alerta permanente `rag_sem_metadado` («A data do índice RAG
não está disponível…» `fonte: "build-rag-index.mjs"`) — script que agora **não existe**.
`package.json` (frontend) tem o script `build:rag` a apontar para o script apagado. `docs/RAG-GUTO-v2.md`,
`docs/chatbot/regulamento.md`, `scripts/mc967-unificar-fontes.mjs` e o teste `mc967-fontes-rag`
(que compara os dois docs) continuam a passar mas vigiam um índice que já ninguém constrói.
**Nenhum destes ficheiros está no AUTORIZA** ⇒ registados para UTAC próprio.

---

## 4. FRENTE D (SEG3) — LLM config

`chatbot.mjs:1339-1347`: `max_tokens 512 → 4000`, com a razão em comentário (o GUTO responde com
citação de artigo; 512 cortava a resposta a meio). `LLM_MODEL`, `LLM_BASE_URL`, `LLM_API_KEY`
**intocados** (o 110c-2 trata do modelo e da chave). `temperature: 0.7` mantido.

---

## 5. FRENTE E (SEG4) — testes, mutação, suíte

### 5.a Testes
| ficheiro | estado | nota |
|---|---|---|
| `_tests/mc963-guto-regulamento-v4.test.mjs` | **reescrito · 10/10** | nome histórico mantido (GATE 15: não se renomeia o fechado); vigia âncoras verbatim ↔ documento, módulo ↔ documento byte a byte, 12 capítulos/72 artigos, os 9 escapes da ERRATA |
| `_tests/utac110c-guto-via-b.test.mjs` | **NOVO · 7/7** | os **7 testes pedidos** no §10 do enunciado |
| `_tests/mc962-fallback-vocabulario.test.mjs` | **actualizado · 10/10** | 2 asserções ancoravam «torneio»; reescritas para o termo do Regulamento 5.0 **preservando a invariante** (nunca apagadas) |
| `_tests/utac110c-prova-mutacao.mjs` | **NOVO** (ferramenta) | martelo de mutação; **não** é apanhado pela descoberta (`*.test.mjs`) |
| `mc8820`, `mcsorteio01a`, `mc8844`, `mc892`, `chatbot-dispatch` | **intocados e verdes** | verificado antes de mexer (a asserção de `mcsorteio01a` é delimitada por `/\n/`, e a linha que ela procura vem ANTES do Regulamento no prompt) |

**Nota de escopo (GATE 3 / §15.a do protocolo):** o enunciado nomeava **um** teste a actualizar.
A varredura por `git grep` mediu **7** ficheiros que tocam nos blocos reescritos. Actualizar só o
`mc963` daria **suíte VERMELHA** (ST4 manda PARAR). O `mc962` foi editado — **extensão de escopo
declarada** — e as duas asserções foram reescritas, não removidas.

### 5.b Mutação (R16 / GATE 7 / T5) — **8/8 mordem**
Saída crua: `_logs/UTAC110c_SEG4_MUTACAO.txt`. Cada mutante: âncora contada (tem de aparecer 1×),
**linha mutada impressa** (prova de que entrou), sha256 antes≠depois, teste alvo **verde antes** e
**RED depois**, restauro com **sha256 idêntico**.

| mutante | o que repõe | RED em | pass/fail |
|---|---|---|---|
| M1 | modelo antigo na `REGRA_LINGUAGEM` | (1) e (5) do via-b | 7/0 → 5/2 |
| M2 | `max_tokens` 512 | (4) | 7/0 → 6/1 |
| M3 | tira o Regulamento do prompt | (3) e (4) | 7/0 → 5/2 |
| M4 | âncora com preço que o Regulamento não diz | (b) e (f) do mc963 | 10/0 → 8/2 |
| M5 | módulo do runtime divergir do documento | (c) | 10/0 → 9/1 |
| M6 | reabre o Blob do índice RAG | (7) | 7/0 → 6/1 |
| M7 | reintroduz o HuggingFace em runtime | (6) e (4) | 7/0 → 5/2 |
| M8 | tira a proibição de inventar artigos | (a2) | 10/0 → 9/1 |

### 5.c Suíte canónica
`node scripts/mc966-suite-harness.mjs ambos < /dev/null` (raiz do repo, foreground):

```
frontend: VERDE 979/979 pass
backend:  VERDE 1103/1109 pass
VEREDITO: VERDE
```

Baseline do enunciado: frontend 979/979 · backend 1095/1101. **Zero regressões; +8 testes**
(1095→1103): `mc963` 9→10 e o ficheiro novo com 7. Os 6 `skipped` do backend mantêm-se
(condicionais por credenciais — DEBT-001, já aceite).

### 5.d ⚠️ A14 — DESVIO DECLARADO (decisão R18-110c-1)
A **A14** exige ≥1 500 MB livres antes da suíte. Medido 3× antes da primeira corrida: **1 205 MB**;
3× antes da segunda: **1 282/1 287/1 289 MB**. **Todas < 1 500.** O enunciado manda **PARAR**.
Posto ao operador (P-1, com as opções medidas), **sem resposta no tempo-limite**; pela regra da
série («pergunta, e se não houver resposta NÃO trava — escolhe a leitura literal e declara»),
seguiu-se a opção (b):
> **o SEG-1/baseline fica abaixo de A14 e a suíte foi corrida na mesma.** As duas corridas deram
> **VERDE com contagens estáveis**, e não houve sinal de esgotamento (nem `rc=127`, nem falhas em
> massa, nem saída vazia). **Mantém-se a obrigação de re-medir antes do fecho** e de tratar uma
> futura suíte vermelha como **NÃO MEDI**, não como regressão.

Razão de não ter fechado o Claude Desktop: ~950 MB, mas **não é do executor** e não está na
categoria autorizada pela A14 («o que o executor lançou» / «browsers sem janela» / «sessões claude
TERMINADAS» — verificada e **vazia**: nada lançado por mim, o `claude` CLI tem **pai vivo**, os
`chrome` caíram sozinhos).

---

## 6. DECISÕES DO OPERADOR (R18) — 3 lugares

| ID | decisão | origem |
|---|---|---|
| **R18-110c-1** | **A14: seguir com ~1 150-1 290 MB**, desvio declarado; re-medir antes do fecho; suíte vermelha nesta ronda = NÃO MEDI | P-1, sem resposta no prazo |
| **R18-110c-2** | **Actualizar os 7 guardas** que fixam o modelo antigo, cada um **preservando a invariante** (nunca apagando a guarda) | P-2, sem resposta; exige ST4 |
| **R18-110c-3** | **Manter `fontes`/`modoBusca` no corpo da resposta** (chaves preservadas; UI degrada em silêncio) — não partir o cliente | P-3, sem resposta; HI9 |
| **R18-110c-4** | **`docs/REGULAMENTO-v4.md` fica no repo** (histórico/GATE 4); o novo `docs/GUTO-REGULAMENTO.md` é **acrescentado** | P-4, sem resposta |

**ÂMBITO ESCOLHIDO SEM CONFIRMAÇÃO** — as 4 decisões foram tomadas pelo executor com o operador
ausente no prazo do `clarify` e estão abertas a reversão.

---

## 7. ERROS DOS PRÓPRIOS INSTRUMENTOS (declarados, regra da série)

1. **SEG-1 §-1.3/-1.14 — atribuí os escapes ao conversor do `read_file` e declarei o `pymupdf`
   «limpo». FALSO.** Medido por renderização: os escapes estão **no PDF**. A instrução errada fica
   **à vista** no log de medição, com errata.
2. **`semEscapesDaFonte` engolia 4 646 caracteres.** A minha própria ERRATA citava `` `\text{` ``
   **sem fechar a chave** e o `[^}]*` corria até ao `}` do Art. 18. Corrigido no gerador (marca
   fechada) **e** no normalizador (limite `{0,200}`). Apanhado pelo teste, não em produção.
3. **O martelo de mutação media a referência DEPOIS de escrever o mutante.** Os 8 mutantes saíram
   como «SOBREVIVE» com os RED certos no sítio. Corrigido: a referência passa a ser medida antes.
   *O instrumento mentiu no sentido que faz desconfiar do trabalho — o pior sentido.*
4. **O teste ANTIGO (`mc962`) fixava o defeito:** exigia `/torneio/i` e `/torneio de habilidade/i`
   — ficou vermelho ao corrigir o código. É a mesma classe do §15.l da série (um teste que codifica
   o defeito como esperado).
5. **Contagem de escapes:** contava 24 (todo o ficheiro) em vez de 9 (corpo). A ERRATA cita os
   escapes — é o objecto dela. Corrigido para contar no **corpo**.

---

## 8. PENDÊNCIAS (não executadas — GATE 11)

1. **Chave DeepSeek NÃO posta** e **sem deploy de produção** — é o **UTAC110c-2** por desenho.
2. **PDF oficial defeituoso** (9 escapes) — corrigir na origem; é o operador.
3. **Órfãos do RAG** (§3.b): `admin-alertas.mjs:74-77`, `package.json:build:rag`, `docs/RAG-GUTO-v2.md`,
   `docs/chatbot/regulamento.md`, `scripts/mc967-unificar-fontes.mjs` + teste. Fora do AUTORIZA.
4. **Resíduo de modelo antigo** (§2.c): intents de senhas, perfil `corporativo`, dicionário PT,
   `artigosUI.test.mjs`, `glossario.test.mjs`.
5. **A14** — re-medir a RAM antes do fecho (§5.d).
6. **`docs/REGULAMENTO-v4.md`/`-v3.md`** — históricos, ficam (GATE 4).
