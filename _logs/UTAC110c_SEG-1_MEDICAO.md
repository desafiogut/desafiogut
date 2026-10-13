# UTAC110c-1 — SEG-1 · MEDIÇÃO

> **Arranque da ronda:** 2026-10-12 23:10 (carimbo da 1.ª chamada do SEG-1).
> **Baseline declarado no enunciado:** `c1a8aa9` (fecho do UTAC110b.1).
> **Ficheiro:** `_logs/UTAC110c_SEG-1_MEDICAO.md`. Segmento **só-leitura** — nada foi alterado.
> Método: skill `utac` (`protocol/hard-gates.md` 1-16, `segments/seg-1.md`), GATES 1, 2, 3, 12.

---

## -1.1 Estado do repo

| item | enunciado | medido | veredicto |
|---|---|---|---|
| `git rev-parse HEAD` | `c1a8aa9` | `c1a8aa9c8e0f5f6362f75a264521ebcb4ce0c389` | ✅ igual |
| branch | — | `main` | ✅ |
| `git status --porcelain` (tracked) | «limpo» | **0 modificados / 0 apagados** | ✅ igual |
| `git status --porcelain` (untracked) | «limpo» | **30 ficheiros untracked** | ⚠️ **DESVIO declarado** |
| último commit | — | `c1a8aa9` · `DESAFIOGUT <desafiogut@deploy.local>` · 2026-10-12 20:35:57 -0300 | ✅ |

### Desvio -1.1.a — os 30 untracked (não é trabalho desta ronda)
São **pré-existentes** e **alheios ao UTAC110c**: 12 ficheiros `_logs/MC100_*` + 6 `_logs/MC101_*` + 6
`_logs/MC102_*` + `_logs/UTAC106x.2.spec.yml`. Nenhum tem relação com o GUTO.
**Não se toca neles** (GATE 3 / GATE 15). Numeração da série: nunca foram commitados; são resíduo de
sessões anteriores. Declarado, não corrigido.

---

## -1.2 Existência dos caminhos nomeados

| caminho (enunciado) | existe | linhas | bytes |
|---|---|---|---|
| `desafio-gut/frontend/netlify/functions/chatbot.mjs` | ✅ | **1514** | 76 933 |
| `desafio-gut/frontend/netlify/functions/_lib/rag.mjs` | ✅ | **315** | 13 876 |
| `desafio-gut/frontend/netlify/functions/_lib/guto-perfis.mjs` | ✅ | **508** | 33 952 |
| `scripts/build-rag-index.mjs` | ✅ | — | 6 087 |
| `scripts/mc964-gerar-chunks.mjs` | ✅ | — | 3 263 |
| `_logs/DEBT.md` | ✅ | 105 | 62 501 |
| `~/Desktop/Regulamento Oficial DesafioGUT.pdf` | ✅ | — | 156 810 B, **7 páginas** |

**As 4 contagens de linhas do enunciado (`chatbot.mjs:1514`, `rag.mjs:315`, `guto-perfis.mjs:508`) batem
ao ficheiro.** Zero desvio.

---

## -1.3 Frente A — o Regulamento (fonte de verdade)

**Ficheiro:** `C:/Users/Moltbot/Desktop/Regulamento Oficial DesafioGUT.pdf` (PDF, 156 810 B, 7 páginas).

### Duas extrações independentes (GATE 2 — instrumento conferido por outro instrumento)

| instrumento | chars | capítulos | artigos | artefactos |
|---|---|---|---|---|
| conversor do `read_file` (anydoc) | ~19 k | 12 | 72 | ⚠️ `R\$ 2,00`, `\text{ ponto}`, `10\text{ (dez)}` |
| **pymupdf 1.28.2** (texto nativo do PDF) | **17 272** | **12** | **72** | ✅ limpo |

**Conclusão de instrumento:** o `read_file` **não mente sobre o conteúdo**, mas **introduz artefactos de
escape LaTeX** (`\$`, `\text{}`) que **não existem no PDF**. A transcrição de `docs/GUTO-REGULAMENTO.md`
tem de sair do **pymupdf** (texto nativo), não do `read_file` — copiar o output do `read_file` seria
publicar um regulamento com `\$` onde o oficial tem `R$`.

### Estrutura (medida, não declarada)

- **12 CAPÍTULOS** (`CAPÍTULO I` … `CAPÍTULO XII`) ✅ igual ao enunciado.
- **72 artigos**, exactamente `Art. 1º` … `Art. 72º` — **sem lacunas** (`range(1,73)` ⊂ conjunto) e
  **sem extras** (a 73.ª ocorrência de `Art. \d+` é a citação do **Art. 49 do CDC** dentro do Art. 59).
- **17 272 caracteres** brutos / **17 008** normalizados.
- **Cabe folgadamente no limite do enunciado:** 17 272 ≪ 30 000 chars ⇒ **não é preciso resumir**.
- Versão **5.0**, vigência **02 de novembro de 2026** — coerente com o cabeçalho pedido no §6 do enunciado.

### Modelo Via B confirmado no texto oficial (para a Frente B)
`Art. 6º/8º` Passe R$ 2,00 → **10 pontos**; `Art. 9º` **50 pontos = 1 cartão**; `Art. 13º/25º` Passe
Relâmpago/Programado; `Art. 14º` **«competição de habilidade»**; `Art. 47º` **ECOQUILDO**;
`Art. 52º` **Google Play Billing**; `Art. 42º` **Nota Técnica**. **Nenhuma** ocorrência de «torneio de
habilidade», «Portaria SPA/MF» ou «senha» — o modelo Via B está, o antigo **não**.

---

## -1.4 Frente B — inventário do system prompt actual

`_lib/guto-perfis.mjs`, blocos que ensinam o modelo ANTIGO (bloqueante **F1** do validador do 110b.1):

| bloco | linhas | conteúdo antigo medido |
|---|---|---|
| `REGRA_LINGUAGEM` (export) | **100-109** | `Portaria SPA/MF 1.207/2024` (:102) · `TORNEIO DE HABILIDADE` (:103) · «torneio de habilidade» (:106,107) · lista de proibidas `leilão/leilões/jogo de azar/aposta/bet/sorte` (:104) |
| `ARTIGOS_V4` (export, 10 entradas) | **119-137** | Art. 8 «senhas / Programado» (:127) · Art. 20 «senhas … R$ 2,00» (:128) · Art. 38 «torneio de habilidade … Portaria SPA/MF nº 1.207/2024» (:135) · Art. 1 «torneio de habilidade» (:136) |
| `REGRA_REGULAMENTO` (export) | **139-157** | «REGULAMENTO (v4 — a versão que vai a cartório)» (:141) · «Portaria SPA/MF nº 1.207/2024» (:147) · «Programado (consome SENHAS)» (:149) · «Senha: R$ 2,00 cada» (:150) · «TORNEIO DE HABILIDADE» (:147) |
| `obterPromptSystem` | **159-162** | `base + REGRA_LINGUAGEM + REGRA_REGULAMENTO` — **sem o regulamento**; só 10 artigos resumidos |

**Intents ligados ao modelo antigo** (enunciado §7.6, linhas 321-332) — a medir na Frente B.

---

## -1.5 Frente C — inventário do HuggingFace e do Blob `rag`

### HF — **um único uso em runtime** (confirmado)
| onde | linha | nota |
|---|---|---|
| `_lib/rag.mjs` | **216** | `gerarEmbeddingHF(texto, opts.hfToken \|\| process.env.HF_API_TOKEN)` — **o único sítio de runtime** |
| `_lib/rag.mjs` | 28-32,176,206-209 | `HF_MODEL`, `HF_EMBED_URL`, `gerarEmbeddingHF`, `HF_FORCE_REMOTE` |
| `chatbot.mjs` | **21** | `import { gerarEmbedding, buscarChunksRelevantes, buscarChunksTextual, montarContexto } from "./_lib/rag.mjs"` |
| `scripts/build-rag-index.mjs` | todo | build do índice (OpenAI embeddings) |
| `scripts/mc964-gerar-chunks.mjs` | :18 | importa `splitIntoChunks`/`gerarEmbedding` de `rag.mjs` |

### Blob `rag` — quem lê
| onde | linha | nota |
|---|---|---|
| `chatbot.mjs` | **42** | `const STORE_NAME = "rag"` |
| `chatbot.mjs` | **1263** | `getStore({ name: STORE_NAME, consistency: "strong" })` (via `abrirStore()`) |
| `_lib/rag.mjs` | 92 | comentário da convenção `getStore({name:"rag"})` |
| `chatbot.mjs` | 1446-1471 | `abrirStore()` → `buscarChunksRelevantes` / `buscarChunksTextual` → `montarContexto` |

**Nenhum teste** referencia o Blob `rag` por nome (`git grep` sobre `_tests/` e `src/` devolve só duplos
genéricos de `@netlify/blobs` para **outros** stores: `pedidos`, `consent-log`). O único teste que fala
do RAG é `mc967-fontes-rag.test.mjs` (5× `RAG`, 1× `torneio de habilidade`).

### `test-mc9.1.mjs`
**Não importa** `rag.mjs` — faz `readFileSync` do **texto do ficheiro** e regex sobre ele. Está em
`desafio-gut/frontend/scripts/`, **fora da suíte canónica**. (O validador do 110b.1 já tinha corrigido
esta frase no SEG-1 do 110b.1; confirmado de novo agora.)

---

## -1.6 Frente D — configuração do LLM

| item | medido | enunciado | veredicto |
|---|---|---|---|
| `max_tokens` | **512** (`chatbot.mjs:1339`) | 512 → 4000 | ✅ igual (a mudar na Frente D) |
| `DEFAULT_LLM_MODEL` | `deepseek-chat` (`:58`) | — | — |
| `DEFAULT_LLM_URL` | `https://api.deepseek.com/v1` (`:57`) | — | — |
| `LLM_API_KEY` | `process.env` (`:1311`) | inválida (401) | — |
| `temperature` | 0.7 (`:1338`) | — | — |
| `PERGUNTA_MAX` / `TOP_K` / `LIMITE_TRECHO_TEMPLATE` / `HISTORICO_MAX` | 500 / 3 / 400 / 8 | — | — |

**Cálculo do prompt final (Frente D):** regulamento **17 272 chars** (~4,3 k tokens PT) + instruções
(~2 k chars) ≈ **6 k tokens** — cabe no contexto DeepSeek (64 k) e em `max_tokens` 4000 de resposta.

---

## -1.7 ⚠️ ACHADO FORA DO ENUNCIADO — os guardas do modelo antigo são MAIS de um

O enunciado nomeia **um** teste a actualizar (`mc963-guto-regulamento-v4.test.mjs`). A varredura por
`git grep` de **todos** os ficheiros de teste do repo (medida, não inferida) mostra **7** ficheiros que
tocam nos símbolos/blocos que este UTAC vai reescrever:

| ficheiro de teste | ARTIGOS_V4 | REGRA_LINGUAGEM | REGRA_REGULAMENTO | obterPromptSystem | guto-perfis | «torneio de hab.» | «Portaria SPA/MF» | RAG |
|---|---|---|---|---|---|---|---|---|
| `_tests/mc963-guto-regulamento-v4.test.mjs` | **7** | 0 | **9** | 4 | 2 | 2 | 2 | 0 |
| `_tests/mc962-fallback-vocabulario.test.mjs` | 0 | **10** | 0 | 3 | 5 | 1 | 1 | 4 |
| `_tests/mc967-fontes-rag.test.mjs` | 0 | 0 | 0 | 0 | 0 | 1 | 0 | **5** |
| `_tests/mc8820-guto-personalidades.test.mjs` | 0 | 0 | 0 | 3 | 1 | 0 | 0 | 3 |
| `_tests/mcsorteio01a-guto-entregas.test.mjs` | 0 | 0 | 0 | 2 | 2 | 0 | 0 | 0 |
| `_tests/mc8844-email-suporte.test.mjs` | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 3 |
| `_tests/mc892-guto-metricas.test.mjs` | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| `_tests/chatbot-dispatch.test.mjs` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |

**Consequência (GATE 1/GATE 12):** actualizar **só** o `mc963` deixa a suíte **vermelha** por causa do
`mc962-fallback-vocabulario` (que tem **10** referências a `REGRA_LINGUAGEM` e ancora literalmente em
«torneio de habilidade» e «Portaria SPA/MF») e do `mc967-fontes-rag`. **Pergunta ao operador** — ver §-1.9.

---

## -1.8 ⚠️ ACHADO — o contrato HTTP do GUTO muda se o RAG sair

`chatbot.mjs:1504-1513` devolve `{ resposta, fontes, modoBusca, modoResposta, perfil }` e o **frontend
consome `fontes`**: `src/components/ChatbotWidget.jsx:410` (`fontes: data.fontes || []`) e `:728-730`
(mostra `m.fontes.map(f => f.id).join(", ")`).

Com o índice RAG removido, `fontes` fica vazio. **A UI esconde o bloco** (`m.fontes.length > 0`), logo
**não rebenta** — mas a funcionalidade «fontes citadas» desaparece para o utilizador.
**Proposta mínima (Ponytail):** manter as **quatro chaves** na resposta com `fontes: []` e
`modoBusca: "regulamento"` — **não** se toca no frontend (fora do AUTORIZA) e nenhum consumidor quebra.
**Registado para decisão do operador** — §-1.9.

---

## -1.9 ⚠️ CONFLITOS E AMBIGUIDADES (AU3 / HARD GATE 12) — **o executor NÃO resolve isto sozinho**

> **C1 — A RAM não passa a A14 (BLOQUEANTE DE AMBIENTE).** Ver §-1.11. A A14 manda **PARAR**.
>
> **C2 — O escopo dos testes é maior que o enunciado nomeia.** O enunciado (§7.7/§10) manda actualizar
> **o** `mc963`. Medido: **7 ficheiros** de teste fixam os blocos/modelo antigo, e o `mc962` tem **10**
> âncoras em `REGRA_LINGUAGEM`. Actualizar só o `mc963` ⇒ **suíte VERMELHA** (viola ST4/HI4 se não se
> tocar). Opções medidas: **(a)** autorizar a actualização dos 7 ficheiros **preservando cada
> invariante** (é o que a skill `mc963`/§15.a do protocolo manda: nunca apagar a guarda); **(b)** só o
> `mc963` e a suíte fica vermelha (**inaceitável**); **(c)** parar e reabrir o spec com a lista completa.
>
> **C3 — O contrato `fontes`/`modoBusca` da resposta HTTP.** Manter chaves com valor degradado
> (`fontes: []`) vs. remover as chaves (parte o `ChatbotWidget`). **Recomendação: manter as chaves.**
>
> **C4 — `docs/REGULAMENTO-v4.md` (16 770 B) fica no repo.** É a fonte que o `mc963` lê. A Frente A
> **acrescenta** `docs/GUTO-REGULAMENTO.md` (GATE 4: o caminho antigo fica e é declarado). O `mc963`
> novo passa a ler o **novo**; o v4 mantém-se como histórico. **Confirmar que é essa a intenção.**
>
> **C5 — Sem suíte ⇒ sem SEG4 (validador adversarial).** A validação independente corre a suíte; a A14
> bloqueia a medição. **O UTAC não fecha** (GATE 11) enquanto isto não resolver.

---

## -1.10 Disco e infraestrutura (HI1)

| item | medido | limite | veredicto |
|---|---|---|---|
| disco `C:` | **21 GB livres** (218 GB usados de 238, 92%) | ST2: < 5 GB ⇒ PARAR | ✅ OK |
| `node_modules` — raiz | 505 dirs (referência da série) | — | não re-medido (sem junctions criadas) |
| junctions em worktrees | **nenhuma criada nesta ronda** | A9/A13 | ✅ nada a limpar |

---

## -1.11 ⛔ A14 — RAM: **BLOQUEANTE** (medida 3× e mais)

Instrumento: `Win32_PerfFormattedData_PerfOS_Memory.AvailableMBytes` **e** `Win32_OperatingSystem.
FreePhysicalMemory` (os dois instrumentos **concordam**, ±2 MB — não é erro de régua).
RAM total: **5 877 MB** (5,74 GB).

| # | horas | AvailableMBytes | FreePhysicalMB | veredicto A14 (< 1500 ⇒ PARAR) |
|---|---|---|---|---|
| 1 | 23:0x | 297 | 297 | ❌ |
| 2 | 23:0x | 293 | 293 | ❌ |
| 3 | 23:0x | 349 | 350 | ❌ |
| 4 | 23:1x | 350 | 350 | ❌ |
| 5 | 23:1x | 362 | 362 | ❌ |
| 6 | 23:2x | **726** | 727 | ❌ |
| 7 | 23:2x | **964** | — | ❌ |
| 8 | 23:4x | **1 197** | 1 185 | ❌ |
| 9 | 23:5x | 1 150 / 1 152 / 1 152 | 1 151 / 1 153 / 1 151 | ❌ |
| 10 | 23:0x (final) | 1 137 / 1 141 / 1 134 | — | ❌ |

**Leitura:** a RAM **subiu de ~300 MB para ~1 140 MB** ao longo da medição (o Chrome do utilizador fechou
a meio; o Windows devolveu as páginas com tempo — A14/HI2 e §18.4 da série) e **estabilizou** a
**~1 140 MB**. **TODAS as 10 leituras < 1 500 MB.** Enunciado §5.a: «Se todas < 1.500 MB → **PARAR**».

**Causa medida (top consumidores, ×10 leituras):** `claude` (app de desktop do utilizador) ~950 MB ·
`MsMpEng` (Defender) 282 · `python` (esta sessão Hermes) ~214 · `claude` CLI (`claude-code`) 181 ·
`Memory Compression` 158 · `explorer` 142. **Não há processo órfão do executor anterior** a queimar RAM
(a categoria autorizada pela A14 — «o que o executor lançou» / «sessões claude TERMINADAS» / «browsers
sem janela» — está **vazia**: não lancei nada; o `claude` CLI `PID 5960` tem **pai vivo** (`powershell
5188`); os `chrome` caíram sozinhos).

**⇒ NÃO SE PODE FECHAR NADA LEGITIMAMENTE PARA CHEGAR AOS 1 500 MB.** O único caminho seria fechar o
**Claude Desktop do utilizador** (~950 MB) — **não é do executor** e não está autorizado.

---

## -1.12 Veredito do SEG-1

**⛔ PARAR — bloqueante de ambiente (A14) + 3 perguntas de escopo ao operador (C2/C3/C4).**

Tudo o resto está **medido e conforme**: identidade do repo ✅, caminhos ✅, regulamento ✅ (12/72,
17 272 chars, cabe), inventário do system prompt ✅, inventário HF/Blob ✅, `max_tokens` ✅, disco ✅.

**A suíte NÃO foi corrida** — a A14 proíbe a medição a esta RAM (e um número obtido assim seria
inválido, T2/§4). Os 979/979 · 1095/1101 do enunciado ficam **NÃO MEDIDOS** nesta ronda.

**Nada foi alterado. Nenhum ficheiro do repo foi tocado** (GATE 3/GATE 15 cumpridos no SEG-1).

---

## -1.13 Perguntas ao operador (R20 — não resolvidas pelo executor)

**P-1 (BLOQUEANTE) — RAM.** Está a **~1 140 MB** livres (A14 exige ≥1 500 MB; até o Claude Desktop
fechar não sobe). Opções medidas:
  **(a)** fechar o **Claude Desktop** (liberta ~950 MB ⇒ ~2,1 GB) e eu **re-meço 3×** e sigo;
  **(b)** **autorizar seguir a ~1 140 MB**, declarando no log que o SEG-1/baseline está abaixo de A14 e
  que uma suíte vermelha nesta ronda **não é conclusiva** (re-medir antes de fechar);
  **(c)** **parar** o UTAC110c-1 e retomá-lo quando a máquina estiver livre.

**P-2 — Guardas.** Autorizas a actualização dos **7** ficheiros de teste que fixam o modelo antigo
(`mc963`, `mc962`, `mc967-fontes-rag`, `mc8820`, `mcsorteio01a`, `mc8844`, `mc892`), cada um
**preservando a invariante** (nunca apagando a guarda)? Ou queres que pare para reabrir o spec?

**P-3 — Contrato HTTP.** Manter `{resposta, fontes:[], modoBusca:"regulamento", modoResposta, perfil}`
(chaves preservadas, UI degrada em silêncio) em vez de remover `fontes`/`modoBusca`?

**P-4 — `docs/REGULAMENTO-v4.md`.** Mantém-se no repo como histórico (o novo `docs/GUTO-REGULAMENTO.md`
é acrescentado), certo?

---

## -1.14 Erros dos PRÓPRIOS instrumentos (declarados, regra da série)

1. **O `read_file` mentiu sobre a forma do regulamento.** Extraiu o PDF com **artefactos de escape**
   (`R\$ 2,00`, `\text{ ponto}`, `10\text{ (dez)}`) que **não existem** no documento oficial. Só foi
   apanhado porque se correu um **segundo instrumento** (pymupdf) e se compararam as duas saídas.
   **Lição:** uma extracção de PDF não é transcrição até um 2.º extractor concordar.
2. **A 1.ª leitura de RAM (297-362 MB) parecia «a máquina está morta»** e ia produzir um PARAR
   imediato. Medida 10× ao longo de ~40 min, provou ser o **fundo da oscilação**, não o estado — a
   A14 já mandava «medir 3×» e mesmo 3 leituras seguidas no mesmo minuto **não** apanham a subida.
3. **Uma medição perdida:** o `sleep 180` do 4.º ciclo excedeu o `timeout` da ferramenta (180 s) e a
   amostragem das 23:4x **não foi registada na hora**; foi reconstituída pelas leituras vizinhas. A
   contagem de RAM entre 23:1x e 23:5x é uma **série, não um par A/B**.

---

*SEG-1 fecha aqui, sem SEG0. Aguarda decisão do operador (P-1 a P-4).*
