MC96 — SEG-1 — DIAGNÓSTICO (medido, não suposto)
Skills ECC: smart-explore, systematic-debugging

⚠️ REGRA DESTE DIAGNÓSTICO: o briefing listou 12 problemas **colhidos de conversas antigas**.
Neste projecto já se provou (MC94.4.1, MC95.2) que o enunciado fica atrás do código. Cada um dos
12 foi MEDIDO antes de ser aceite. Veredictos: CONFIRMADO · JÁ CORRIGIDO · FORA DO REPO.

═══ 1.1 ONDE VIVEM AS CONVERSAS ═══
  NÃO estão guardadas no repositório. Não há store de conversas em `chatbot.mjs` (o único
  `getStore` é `STORE_NAME = "rag"`, que é o ÍNDICE). Não há tabela de histórico no código do
  GUTO. O que existe é: `admin-notify`/`notificacoes` (notificações, não conversas) e o log
  operacional (decisões admin).
  => Não foi possível ler conversas reais dos testadores (R4/LGPD também o desaconselharia
     publicar). O diagnóstico usa o CÓDIGO como fonte — que é o que decide o comportamento.

═══ 1.2/1.3/1.4/1.5 OS 12 PROBLEMAS, MEDIDOS ═══

  #  | veredicto        | evidência medida
  ---|------------------|------------------------------------------------------------
  1  | CONFIRMADO       | `chatbot.mjs:1291` monta `messages: [{system},{user}]` — SÓ DUAS
     |                  | mensagens. Zero histórico. Cada pedido é amnésico: um «Sim» chega
     |                  | sem referente. É a causa raiz do problema #1.
  2  | FORA DO REPO     | «até R$ 9.999,99» / «até R$ 9.999» / «0,02»: ZERO ocorrências
     |                  | em chatbot.mjs e guto-perfis.mjs. Vem do CONTEÚDO do índice RAG,
     |                  | que não está no repositório (ver #3 do cabeçalho abaixo).
  3  | FORA DO REPO     | contradição «valor não sai do bolso» vs «cada lance gasta
     |                  | senha» é texto do índice RAG, não do prompt.
  4  | PARCIAL          | a confusão valor-do-lance vs custo-da-senha não está no prompt.
     |                  | O prompt não DISTINGUE explicitamente os dois — corrigível no RAG v2.
  5  | CONFIRMADO       | `guto-perfis.mjs:286-298` — `fallback_sem_llm` devolve
     |                  | «Olha o que encontrei no regulamento: ${trecho}» nos 4 perfis: é
     |                  | LITERALMENTE o chunk bruto despejado. (HARD GATE 3/SEG2.3)
  6  | FORA DO REPO     | «Bronze 27 vagas, Prata 81» são factos alucinados; não existem
     |                  | no repositório => vêm do índice (ou são alucinação do LLM). O
     |                  | prompt não contém números de vagas.
  7  | FORA DO REPO     | idem — «publicidade rotativa por cotas» não está no código.
  8  | PARCIAL          | a confusão cotas-patrocinador vs modalidades-de-lance exige
     |                  | texto explícito que o prompt não tem => entra no RAG v2.
  9  | CONFIRMADO       | o prompt não cita artigos do Regulamento. Nada em
     |                  | `guto-perfis.mjs`/`chatbot.mjs` liga o GUTO ao v4.
  10 | CONFIRMADO       | «leilão/leilões» 24 ocorrências em `guto-perfis.mjs` + 9 em
     |                  | `chatbot.mjs`. INCLUI O FALLBACK (linha 289: «Pergunta-me como
     |                  | funcionam os leilões») e o CTA (linha 310: «participar dos
     |                  | leilões»). Está na PERSONA, não só no prompt.
  11 | FORA DO REPO     | «0,02»: zero ocorrências no código do GUTO.
  12 | ⛔ JÁ CORRIGIDO   | `suporte@desafiogut.com.br` é um DOMÍNIO MORTO (NXDOMAIN).
     |                  | O MC88.44 já o removeu: hoje existe SÓ em comentários que
     |                  | explicam a decisão (linhas 17 e 408), e há um TESTE que
     |                  | impede o seu regresso (`_tests/mc8844-email-suporte.test.mjs`,
     |                  | `MORTO = "suporte@desafiogut.com.br"`). `EMAIL_SUPORTE =
     |                  | «desafiogut01@gmail.com»` é o oficial, com teste que exige
     |                  | que o Layout.jsx use o mailto. O briefing está DESACTUALIZADO.

  RESUMO: 4 CONFIRMADOS no código (#1, #5, #9, #10) · 3 PARCIAIS/estruturais (#4, #8, e o
  valor/custo) · 4 FORA DO REPOSITÓRIO (#2, #3, #6, #7, #11) · 1 JÁ CORRIGIDO (#12).

═══ DESCoberta ESTRUTURAL — o que limita este MC ═══
  `chatbot.mjs:534` diz, com todas as letras:
      «O índice RAG é construído FORA do repositório pelo operador.»
  => Os problemas #2, #3, #6, #7 e #11 (valores errados, contradições, alucinações, «0,02»)
     NÃO se corrigem no repositório: vivem no índice, que só o operador reconstrói.
     A entrega possível é o DOCUMENTO a ingerir — `docs/RAG-GUTO-v2.md` — e uma trava no
     repositório que impeça os valores errados de entrarem por outro caminho.
     Sem isto, «corrigir os 12» seria uma promessa que o código não pode cumprir.

═══ 1.6 VEREDITO DO SEG-1: AJUSTAR ═══
  SEGUIR para as correcções que o repositório PODE fazer: #1 (contexto conversacional),
  #5 (fallback), #10 (vocabulário/jurídico), #9 (citação do v4) — e entregar o RAG-GUTO-v2.md
  para o operador ingerir (#2,#3,#4,#6,#7,#8,#11). #12 não precisa de nada.
  PARAR e reportar: a reindexação (não é minha) e o teste de conversas reais (não existem
  guardadas, e o R4/LGPD desaconselharia publicá-las).
