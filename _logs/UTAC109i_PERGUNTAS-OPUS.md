# UTAC109i — PERGUNTAS PARA O OPUS (lista numerada)

**Contexto:** produzidas pela auditoria de fecho pre-AAB (UTAC109i, 2026-10-09).
**Regra:** cada pergunta e **factual e especifica**, cita a **origem** onde a duvida nasceu, e
**responde-se em <30 s** (sim/nao ou resposta curta). Nao se pede opiniao — pedem-se FACTOS que so o
Opus/operador tem em memoria. **Nenhuma pergunta foi inventada**: todas nasceram de uma LACUNA medida
no repositorio ou nos logs.

---

## A. LACUNAS do operador (nao existem no repo)

**1.** O senhor referiu «**a frent que nao terminamos**» (2026-10-09). Procurei em **todos** os
`_logs/UTAC109*` e `Desktop/RELATORIO-*109*`: **0 ocorrencias** da expressao. E uma frente de trabalho
especifica? Se sim, **qual** e **qual o estado**?
   - *Origem:* pedido do operador; grep §SEG-1 do `_logs/UTAC109i-auditoria.md` = 0 resultados.

**2.** A **imagem de referencia do ComfyUI** (`0539243f…915e.png`, a que ancorou as 8 imagens do 109a)
**nao existe no disco**. Foi movida/apagada de proposito, ou perdeu-se?
   - *Origem:* `_logs/UTAC109a-inventario.md:104` (LACUNA L-1).

**3.** O **Soul ID para cartoon** (treino de personagem) — foi **decidido** ou **abandonado**? Se
decidido, com que referencia (Soul ID vs `--image` vs prompt)?
   - *Origem:* `_logs/UTAC109a-inventario.md:231,253` (LACUNA L-3, transferida para o 109b).

**4.** O **simbolo do medalhao** do GUTO — qual e o simbolo oficial? O 109a nao o conseguiu ler com
ampliacao 5x e ficou LACUNA.
   - *Origem:* `_logs/UTAC109a-inventario.md:160` (LACUNA L-2).

---

## B. LACUNAS do RAG (medidas ao vivo neste UTAC)

**5.** No Netlify, a variavel **`HF_API_TOKEN`** esta **definida**? (O motor RAG precisa dela para
procurar por significado; sem ela cai no metodo simples de contar palavras — que foi exatamente o que a
producao devolveu hoje.)
   - *Origem:* §SEG6 R-1 do log; `_lib/rag.mjs:29-32`; `_logs/UTAC109i-auditoria.md` (L-3).

**6.** A chave do **LLM** (`LLM_API_KEY`, DeepSeek/OpenAI) esta **definida** no Netlify? Hoje o
assistente respondeu em modo `template` — sinal de que **nao chegou a falar com a IA**.
   - *Origem:* §SEG6 R-1; `chatbot.mjs:12`; (L-4).

**7.** O **indice RAG** que a producao serve foi **reconstruido depois** de o texto
`docs/RAG-GUTO-v2.md` ser unificado no MC96.7? (O excerto que o assistente colou comeca com `---` —
restos do cabecalho do documento — o que sugere que o indice em uso e **anterior**.)
   - *Origem:* §SEG6 R-1 e R-3; teste `_tests/mc967-fontes-rag.test.mjs` (L-5).

**8.** O **texto do RAG** (`docs/RAG-GUTO-v2.md`) sera **actualizado** para o modelo Via B (Passe →
pontos → cartao; SPA/MF nao se aplica) **antes** do AAB — ou o chat **sai** desta versao?
   - *Origem:* §SEG6 R-3; `RAG-GUTO-v2.md:26,44-54` vs `CLAUDE.md:4-11`.

---

## C. LACUNAS juridicas / de conformidade (resposta do Opus desbloqueia o OK)

**9.** O **Regulamento v4** (o que vai a cartorio) descreve a Programada no **modelo antigo**
(«1 senha por lance, menor lance unico») — o **app** publica o modelo novo (Passe → pontos → cartao).
**Qual dos dois e o vigente para o registo?** (Isto decide se se altera o Regulamento, o app, ou ambos.)
   - *Origem:* §SEG8 J-3.3; `REGULAMENTO-v4.md` Arts. 6/8/20/26/27 vs `RegrasOficiais.jsx`.

**10.** Os Artigos 14 e 18 do Regulamento **contradizem-se** (14: premio nao convertivel em dinheiro;
18: ganhador de fora de Manaus recebe o valor em dinheiro). Qual e a **intencao** correcta?
   - *Origem:* §SEG8 J-3.2; `REGULAMENTO-v4.md` Art. 14 vs Art. 18.

**11.** O Regulamento tem **duas contas** de recebimento (Art. 21: PIX do CNPJ + BB; Art. 27: **Bradesco
+ PIX `renascendoam@gmail.com`**, conta pessoal). A conta do Art. 27 e **a correcta**, e uma
**substituicao**, ou um **erro** a remover?
   - *Origem:* §SEG8 J-3.4; `REGULAMENTO-v4.md` Art. 21 vs Art. 27.

### (pergunta de apoio, se souber de memoria)

**12.** O CNPJ **23.040.066/0001-00** tem como razao social registada «**Associação Recreativa dos
Nordestinos no Amazonas**» (e «Grupo Uniao e Trabalho» e nome fantasia)? A resposta decide qual nome
tem de aparecer no Regulamento e na nota fiscal.
   - *Origem:* §SEG8 J-3.5; `REGULAMENTO-v4.md:3` e `RAG-GUTO-v2.md:21` vs `RegrasOficiais.jsx:56,64`.

---

## D. Nota de metodo

Estas 12 perguntas nascem de **lacunas declaradas** (§5 do relatorio do Desktop). Onde a resposta do
Opus existir, corrigem-se os documentos com a **versao errada mantida a vista marcada como REFUTADA**
(padrao da serie). Onde nao existir, mantem-se `LACUNA`, sem inventar.
