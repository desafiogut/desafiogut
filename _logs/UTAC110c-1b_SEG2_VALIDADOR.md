# UTAC110c-1b — VEREDICTO DO VALIDADOR ADVERSARIAL

Worktree: `C:/Users/Moltbot/tmp-utac110c-1b-val/wt` (detached, `0a6f527e03602ccc5e1b687bc56ab2de5b641a54`).
Nada foi escrito no repo/worktree (só este ficheiro + sondas fora dele). `git status --porcelain` limpo no fim.

## Veredicto: APROVADO COM RESSALVAS   ## Bloqueantes: 0

## Julgamento exigido: a alteração da ERRATA é legítima ou devia ter sido escalada?

**LEGÍTIMA — não é bloqueante.** Argumentei os dois lados; o lado que ganha tem uma medição decisiva:

**A favor (executor):**
1. **A ERRATA NÃO é documentação inerte: ela ENTRA no system prompt.** Medido por mim em todos os 5
   prompts: `inclui ERRATA? true` (comando: `node --input-type=module -e "obterPromptSystem(p,{})"`;
   `p.includes('ERRATA DA FONTE')` = **true** para visitante/comum/corporativo/admin/conformidade).
   ⇒ A opção «(A) limpar só o corpo e não tocar na ERRATA» deixa o prompt do GUTO a ler
   `1\text{ ponto} = R\$ 0,01` — exactamente o defeito que este UTAC existe para remover. «Não alterar
   a ERRATA» e «zerar as marcas» não são só formalmente incompatíveis: é o §7 (critério MEDÍVEL) que
   serve o objectivo declarado.
2. **O §11 derrota-se a si próprio:** «NÃO alterar a ERRATA DA FONTE (**só verificar que ela própria
   está limpa**)». O parêntesis *pressupõe uma ERRATA limpa*. A premissa era FALSA (a ERRATA tinha 15
   marcas). Descoberta a falsidade, realizar a INTENÇÃO do §11 exigia limpar a ERRATA. Ler «não
   alterar» à letra seria ler o parêntesis como decorativo.
3. **A função da ERRATA ficou 1:1** (li o ficheiro): cabeçalho + tabela `artigo → o PDF imprime →
   valor correcto` (Arts. 6º, 18º, 37º×2, 47º) + pendência RTD/Cartório + a instrução de uso («o valor
   é o da última coluna»). Contagem de marcas documentadas mantida: 1+2+2+2+2 = **9**. Continua a
   documentar o defeito do PDF, que é o que lhe dá valor.
4. **A frase que mudou tinha de mudar.** «A transcrição abaixo NÃO corrige o escape» passou a ser
   FALSA. Mantê-la seria um registo a mentir. O teste (e) passa a EXIGIR a sua ausência
   (`assert.doesNotMatch(errata, /NÃO corrige o escape/)`), fechando a porta a quem a reponha.
5. **Foi declarado ANTES, não decidido em silêncio**: `_logs/UTAC110c-1b_SEG-1_MEDICAO.md` §-1.e
   (§63-84) mede as 3 opções (A/B/C) e escolhe C; o operador escreveu «faça isso primeiro». É um
   desvio **declarado, visível e reversível** — o oposto de o esconder.

**Contra (devia ter parado) — e porque não vence:**
1. Os itens 211/230 dizem, à letra e duas vezes: «NÃO alterar a ERRATA DA FONTE». Um executor
   maximamente conservador teria PARADO e pedido autorização. **Reconheço que era o caminho mais
   defensável formalmente.**
2. **Mas** a alternativa medida (opção A) é *pior para o objectivo do UTAC*: mantém o prompt
   defeituoso. Parar-e-perguntar é mais seguro processualmente, mas o desvio (i) foi pré-declarado com
   as 3 opções medidas, (ii) preserva a função do artefacto, (iii) é reversível em 1 commit, e
   (iv) o operador respondeu «faça isso primeiro» à proposta declarada.
⇒ **Conclusão: legítima.** O que **falta** é o operador ratificar por escrito a mudança de notação no
registo do UTAC (fecha o hiato literal-vs-intenção). Isso é uma **ressalva**, não um bloqueante.

## Reproduzido por execução (pelo validador)

| # | Foco | Comando | Resultado medido |
|---|---|---|---|
| (a) | conteúdo jurídico alterado? | `git show f665200:docs/GUTO-REGULAMENTO.md` + aplicar SÓ a transformação declarada (`\text{X}`→`X`, `\$`→`$`) ao CORPO e comparar | corpo f665200 = **17 937** chars → transformado = **17 892**; corpo actual = **17 892**; **IGUALDADE EXACTA = True**; 9 grupos (`6×\text{}` + `3×\$`), **0** backslashes residuais |
| (b) | marca por limpar? | `grep -nF '\text{'`, `grep -nF '\$'`, `grep -oF '\' \| wc -l` | **0** / **0** / **0** (nem UM byte de backslash no ficheiro) |
| (c) | artigo desapareceu? | regex `^Art\. (\d+)º` e `^CAP[IÍ]TULO` | arts distintos **1..72**, faltas `[]`; **12** capítulos `I..XII` |
| (d) | tamanho? | `len()` python (chars, não bytes) | 19 459 → **19 400** chars; delta **−59**; limite ±500 ✅ (bytes: 20 427→20 361) |
| (e) | ERRATA alterada? | `git diff 0504fc3..0a6f527 -- docs/GUTO-REGULAMENTO.md` | alterada; **julgada legítima** (acima) |
| (f) | cópia derivada dessincronizada? | `node -e` importar `REGULAMENTO_TEXTO` e comparar com o ficheiro | **byte-equal**; sha256 `b75a3a4b8eb81369db056522723212a3b22a04ec06ed3104e3f5acfd5315c7b5` em ambos; 19 400 chars / 20 361 bytes; sem CRLF |
| (g) | sync passa por acidente? | mutação doc-only / lib-only / marca reposta (cópia isolada) | doc-only → **RED (b,b2,c,f)**; lib-only → **RED**; marca reposta → **RED (c,e)** ⇒ não é acidental |
| (h) | código fora do escopo? | `git diff --name-only 0504fc3..0a6f527` | **só** `docs/GUTO-REGULAMENTO.md`, `_lib/guto-regulamento.mjs`, 3 testes, `_logs/*`. `CLAUDE.md` é do commit anterior `0504fc3`, **não do 1b**; `_lib/guto-perfis.mjs` **intocado**; PDF/prompt de sistema **intocados** |
| (i) | ponto cego fechou? | sonda `violacoesDeModeloAntigo` sobre os prompts REAIS + prompt só-corp + «Cotas» só + termo não declarado | reais: **só `corporativo` = ["Painel Lojista","cotas comerciais"]**, restantes `[]`; prompt só-corp → **morde os 2**; «Cotas» sozinho → **`[]`** (não é needle ✅); termo não declarado noutro perfil → **RED**; teste (1b) fixa `["corporativo"]` como ÚNICO com resíduo; martelo **M10 → RED (1)+(5)** |
| (j) | falhas novas? | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` + backend directo | **frontend VERDE 979/979**; **backend tests 1110 · pass 1104 · fail 0 · cancelled 0 · skipped 6** ⇒ **VEREDITO VERDE**; bate exactamente a referência |
| (k) | a mutação morde? | `node _tests/utac110c-prova-mutacao.mjs` | **10/10 MORDE, 0 anulados**; M9 → RED em **(c)+(e)**; M10 → RED em **(1)+(5)**; restauro sha256 idêntico |

## Achados ⚠️ grave / ℹ️ nota (com tratamento proposto)

- **ℹ️ 1 — LACUNA DE COBERTURA (pré-existente, por desenho): o conteúdo jurídico de um artigo NÃO
  ancorado é invisível à suíte.** Medi: alterar em SIMETRIA o ficheiro E o módulo, num artigo que não
  está em `ARTIGOS_V4` nem na lista do (b2), mantém o teste **10/10 VERDE**. Casos medidos (cópia
  isolada, `newline=""`, contagens 1:1 nas duas cópias): Art. 28º regra de desempate **invertida**
  («primeiro»→«por último») → 10/10; Art. 21º direito retirado → 10/10; Art. 72º lei citada
  `Lei nº 5.768/1971`→`9.999/1999` → 10/10; Art. 19º CNPJ trocado → 10/10. (Apagar o artigo INTEIRO
  é apanhado: remover o Art. 28º → **RED (d)**.) Isto NÃO é defeito introduzido pelo 1b — é o limite
  do desenho por âncoras — mas delimita a alegação «a suíte protege o Regulamento»: protege
  **16 artigos ancorados + 6 valores fixados + as 9 posições de marca + a sincronia byte-a-byte**;
  os outros ~50 artigos não têm guarda. **Tratamento:** no 110c-2, fixar um sha256 por artigo (ou
  alargar o (b2) a todos os artigos com valor) — é barato e fecha a lacuna.

- **ℹ️ 2 — A inversão do teste (e) PERDEU a fixação dos valores da ERRATA (achado do 1b, medido).**
  O (e) ANTIGO fixava 3 fragmentos da ERRATA (`R\$ 2,00`, `1\text{ ponto} = R\$ 0,01`,
  `1\text{ ECOQUILDO} = R\$ 1,00`). O (e) NOVO fixa apenas a existência + 3 needles («barra
  invertida», «Art. 6º», «Art. 47º»). **Medi:** corromper a coluna «valor correcto» da ERRATA
  (`**R$ 2,00**` → `**R$ 9,99**`) em SIMETRIA nas duas cópias → **10/10 VERDE**. Como a ERRATA **entra
  no prompt** (achado (e) acima), o valor errado seria lido pelo GUTO. Risco delimitado (o corpo, que
  é o que o GUTO deve citar, está fixado por (b2)+(c2)), mas é uma perda real de força de asserção
  causada pelo próprio 1b. **Tratamento:** re-fixar 3 células de valor da ERRATA no teste (e).

- **ℹ️ 3 — Comentário obsoleto em `_lib/guto-perfis.mjs` (fora do escopo do 1b, a corrigir no 110c-2).**
  O docstring de `semEscapesDaFonte` (≈ linhas 160-190) ainda afirma: «**O texto transcrito NÃO é
  alterado** — é com o escape que ele vai no prompt, tal como está impresso no documento oficial».
  Verdade até ao 1b; **FALSA** depois dele. Além disso, `semEscapesDaFonte` passou a ser um **no-op**
  no ficheiro actual (0 marcas). **Não era para o 1b tocar** (o AUTORIZA não incluía `guto-perfis.mjs`)
  — deixá-lo foi disciplina de escopo correcta — mas fica registado.

- **ℹ️ 4 — Nota de instrumento (meu, divulgada por honestidade).** Uma primeira passagem minha deu
  «1 falha» em mutantes que na verdade passam: o `open(...,'w')` em modo texto do Python traduz
  `\n`→`\r\n` no Windows, o que fez o doc e o módulo divergirem. Com `newline=''` o resultado real dos
  mesmos mutantes é **10/10 VERDE**. Toda a matriz acima foi re-corrida com o instrumento corrigido.
  (A régua é a mesma que o validador do 110c-1 encontrou no `grep` do `ℹ` multi-byte: instrumento
  silenciosamente errado transforma medição em opinião.)

## Alegações REFUTADAS

- **«a limpeza alterou conteúdo jurídico»** — REFUTADA: igualdade EXACTA do corpo após aplicar só a
  transformação declarada (17 892 = 17 892).
- **«ficou alguma marca por limpar»** — REFUTADA: 0 `\text{`, 0 `\$`, 0 bytes de backslash no ficheiro.
- **«algum artigo desapareceu»** — REFUTADA: arts 1..72 sem lacunas, 12 capítulos.
- **«o tamanho variou demais»** — REFUTADA: −59 chars (limite ±500).
- **«a cópia derivada dessincronizou»** — REFUTADA: sha256 idêntico (`b75a3a4b…c7b5`), byte-equal.
- **«o teste de sincronia passa por acidente»** — REFUTADA: morde em doc-only, lib-only e marca-reposta.
- **«foi tocado código fora do escopo»** — REFUTADA: 1b só tocou doc + módulo + 3 testes + logs.
- **«o ponto cego do needle-set continuou»** — REFUTADA: só `corporativo` tem resíduo; qualquer termo
  não declarado em qualquer perfil → RED (teste (1) por comparação EXACTA + (1b) + martelo M10).
- **«a suíte tem falhas novas»** — REFUTADA: fail=0, VERDE, 979/979 e 1104/1110 (6 skipped).
- **«a mutação não morde / o martelo é decorativo»** — REFUTADA para 10/10 (M1–M10 todos mordem);
  **PARCIALMENTE REFUTADA a alegação implícita de exaustividade**: o martelo NÃO cobre (i) mutação
  simétrica de artigo não ancorado (achado 1) nem (ii) mutação simétrica do valor da ERRATA (achado 2).

## O que NÃO consegui refutar

- A **invariância da limpeza**: o corpo pós-1b é, char a char, o corpo do `f665200` com os escapes
  removidos — nada mais mudou.
- A **identidade byte-a-byte** doc↔módulo (`sha256 b75a3a4b…`), medida por mim independentemente.
- A **estrutura**: 12 capítulos, 72 artigos sem lacuna, −59 chars.
- O **fecho do ponto cego**: o verificador morde os 2 termos do corporativo, «Cotas» sozinho não é
  needle, e a comparação EXACTA impede que um termo novo passe.
- O **verde da suíte** (frontend 979/979; backend 1104 pass / 0 fail / 6 skipped), reproduzido por mim.
- O **10/10 do martelo**, com prova de que o mutante entrou (sha) e restauro íntegro.
- O **escopo**: nenhum ficheiro proibido tocado pelo 1b.

## O que NÃO medi

- **Não extraí o PDF oficial do cliente** (`Regulamento Oficial DesafioGUT.pdf`, no Desktop). NÃO
  verifiquei que o PDF imprime mesmo as marcas: tomei a ERRATA/transcrição como registo INTERNO ao
  repo. A alegação «confirmado por renderização a 150 dpi e por dois extractores independentes» **não
  a reproduzi**.
- **Não verifiquei os COMANDOS git usados** (`git add` individual vs `-A`, push, deploy): verifiquei o
  RESULTADO (árvore do commit), não o processo.
- **Não medi a RAM** (o enunciado diz ~1 900 MB livres / A14 cumprida) — não a medi eu.
- **Não identifiquei os 6 testes backend «skipped»** — confirmei que são `skipped` e que `fail=0`, e que
  o total bate a referência (1110/1104), mas não auditei quais são nem porquê.
- **Não testei o LLM real** (sem chave DeepSeek; por desenho do UTAC).
- Não corri o harness em background (saída vazia = «NÃO MEDI», como o enunciado avisa): corri tudo em
  **primeiro plano** com `stdin=/dev/null`.

## Contra-prova por teste (o que teria de mudar para ficar vermelho)

| teste | fica vermelho se… | medido? |
|---|---|---|
| `mc963 (c)` | mudar 1 char no doc **só** de um lado, ou no módulo **só** | ✅ RED (doc-only e lib-only) |
| `mc963 (d)` | apagar um `Art. Nº` ou um `CAPÍTULO` | ✅ RED (Art. 28º removido) |
| `mc963 (e)` | repor `\text{` ou `\$` em qualquer parte do ficheiro | ✅ RED |
| `mc963 (c2)` | reintroduzir marca no REGULAMENTO_TEXTO, ou apagar um valor legível | ✅ RED (mutação lib-only) |
| `mc963 (b)/(b2)` | trocar um valor ancorado (ex.: Art. 6º `R$ 2,00`→`R$ 9,99`) | ✅ RED (4 testes caem) |
| `via-b (1)/(1b)` | meter termo antigo NÃO declarado em perfil sem resíduo; ou tirar um resíduo declarado | ✅ RED (martelo M10) |
| martelo M1–M10 | (cada um repõe o defeito que a guarda vigia) | ✅ 10/10 RED |
| **`mc963` (NÃO fica vermelho)** | **mudar em SIMETRIA o conteúdo de um artigo não ancorado** (Art. 19/21/28/72) | ❌ **10/10 VERDE — lacuna (achado 1)** |
| **`mc963` (NÃO fica vermelho)** | **corromper em SIMETRIA o valor da coluna da ERRATA** | ❌ **10/10 VERDE — lacuna (achado 2)** |

As duas últimas linhas são a contra-prova que **nomeia o que está decorativo**: aquilo que «fica verde
e não devia» é o conteúdo não fixado — não é decorativo por acidente, é ausência de asserção.

## Decisão

**APROVADO COM RESSALVAS — 0 bloqueantes.** Reproduzi por execução própria todos os 11 focos. As 10
alegações centrais do 1b resistiram à refutação: o corpo mudou **só** a remoção declarada (igualdade
exacta, 0 backslashes), a cópia derivada ficou byte-a-byte igual (sha256 coincidente), a estrutura
(12/72) e o tamanho (−59) mantêm-se, o escopo é cirúrgico (doc + módulo + 3 testes + logs), o ponto
cego do 110c-1 está fechado (verificado com sondas próprias, não pela alegação do log), a suíte está
VERDE (979/979 · 1104/1110 · 0 falhas) e o martelo morde 10/10.

A **alteração da ERRATA é legítima**: ela entra no prompt, logo «não a tocar» manteria o defeito que o
UTAC existe para remover; o §11 pressupõe uma ERRATA limpa e a premissa era falsa; a função
(tabela+pendência) ficou 1:1; a frase removida tinha-se tornado mentira; e o desvio foi pré-declarado
(`_logs/UTAC110c-1b_SEG-1_MEDICAO.md` §-1.e) e reversível. Não é bloqueante.

As **ressalvas** são de cobertura, não de correcção, e duas delas nascem da própria inversão do 1b:
(i) o (e) novo perdeu a fixação dos valores da ERRATA (medido: corromper a coluna → 10/10 verde);
(ii) a suíte não vigia o conteúdo dos ~50 artigos não ancorados (medido com 4 mutantes simétricos);
(iii) `guto-perfis.mjs:semEscapesDaFonte` ficou com um docstring falso e vestigial. Recomendo, no
**UTAC110c-2**: ratificar por escrito a notação da ERRATA, re-fixar 3 células de valor da ERRATA, e
fixar sha256 por artigo. **Sem reverter esta entrega.**
