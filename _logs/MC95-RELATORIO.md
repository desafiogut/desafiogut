# MC95 — RELATÓRIO — Regulamento DesafioGUT v4

**Data:** 2026-09-25 · **Agente:** HERMES · **Entrada:** `Desktop/regulation_v3.md` (17 223 chars)
**Saída:** `Desktop/regulamento_desafiogut_v4.md` (16 597 chars) + `..._v4_NOTAS.md`
**Veredito:** **MC FECHADO** — 9/9 correcções, 8 artigos alterados, 0 em aberto. Nada foi a cartório.
**⚠️ Uma decisão sua é necessária** (§6, dados de pagamento) — não é bloqueio do MC, é um dado que não me cabe adivinhar.

---

## 1. Sumário executivo

As 9 correcções foram aplicadas: **8 artigos alterados** de 40 (`2, 10, 13, 14, 22, 26, 27, 35`; o Art. 35 leva duas — alíneas (a) e (k)); os outros **32 estão byte a byte idênticos** à v3. A secção «Notas Internas» saiu do documento final (HARD GATE 6).

Mas o MC não era só o documento. O SEG3 mandava verificar o alinhamento in-app **condicionalmente** — e encontrou uma divergência séria: **o gate de consentimento que o utilizador aceita citava 8 dos 15 artigos com o número errado**, e dois deles diziam o contrário do Regulamento. Corrigido, com teste que trava a classe (4/4 + 5 mutações).

**HARD GATE 5 (ortografia pt-BR):** zero formas pt-PT no documento final; 6 URLs com 3 «w»; 21 valores R$ em formato pt-BR. **HARD GATE 2:** o ficheiro **não estava** em `regulamento_desafiogut_v3.md` — chama-se `regulation_v3.md` (o operador corrigiu-me a tempo, por mensagem).

---

## 2. Estado à entrada (v3)

`Desktop/regulation_v3.md` · 122 linhas · preâmbulo + **40 artigos** + «COMO FUNCIONA» (7 bullets) + «NOTAS INTERNAS» (linhas 117–122).
Cada um dos 9 alvos foi localizado **antes** de tocar (1 ocorrência exacta cada):

| # | correcção | linha |
|---|---|---|
| 1 | Art. 2 «Uniao» | 7 |
| 2 | Art. 27 «bancaria» | 57 |
| 3 | Art. 26 «directamente» | 55 |
| 4 | Art. 10 «legislação aplicável» | 23 |
| 5 | Art. 22 (fim) | 47 |
| 6 | Art. 35(k) «mídia… 1mil» | 84 |
| 7 | Art. 13 «passará a posse» | 29 |
| 8 | Art. 14 (bloco) | 31 |
| 9 | Art. 35(a) datas | 74 |

⚠️ **«mídia» aparecia em DOIS sítios** — linha 61 (Art. 29, «divulgação em qualquer mídia» — **correcta**) e linha 84 (Art. 35(k), a corrigir para «média»). Um replace cego de «mídia»→«média» teria corrompido o Art. 29. Refiz por âncora única.

---

## 3. As 9 correcções aplicadas

`docs/MC95-DIFF-v3-v4.md` traz o diff artigo a artigo. Resumo:

1. **Art. 2** — «Grupo Uniao e Trabalho» → «Grupo **União** e Trabalho»
2. **Art. 27** — «conta **bancária**»
3. **Art. 26** — «debitado **diretamente** do saldo» (pt-BR)
4. **Art. 10** — «em conformidade com a **Lei nº 13.709/2018 (LGPD)**»
5. **Art. 22** — acrescentado «**ou, no caso de edições Relâmpago, o saldo mínimo necessário para participação**»
6. **Art. 35(k)** — «**média** rotativa diária de **1 mil** usuários» (R18)
7. **Art. 13** — «passará **à** posse» (crase)
8. **Art. 14** — reescrito (R18): Manaus/AM que optar por dinheiro recebe **integral**; os demais **80%**; se o prêmio já for em dinheiro, **integral**; acima de R$ 10.000,00 segue o prazo de 24 h
9. **Art. 35(a)** — **removidas as datas** «(20/setembro/2026 a 05 de outubro/2026)» (R18)

**Fronteira (R1):** 32 artigos intocados + preâmbulo + «Como Funciona» idênticos. Provado por comparação do **bloco completo** de cada artigo.

---

## 4. Verificação (HARD GATE 5)

| verificação | resultado |
|---|---|
| Formas pt-PT residuais (`actual`, `acção`, `objectivo`, `facto`, `contacto`, `bancaria`, `Uniao`…) | **nenhuma** |
| URLs | 6, **todas com 3 «w»** |
| Valores R$ | 21, todos em formato pt-BR (sem ponto decimal) |
| Estrutura | preâmbulo + **40 artigos** (nenhum em falta) + «Como Funciona» |
| Notas internas no documento final | **ausentes** (`NOTAS INTERNAS`, «Lista de Testadores», «Período de Teste», `wwww`, nomes de testadores) |
| Espaços duplos / espaço antes de pontuação / 3+ linhas em branco | **limpo** |

⚠️ O meu **próprio check** deu um falso positivo aqui: acusou «espaço duplo» porque eu substituía `\n` por espaço e as linhas em branco entre parágrafos viravam «  ». Medido com precisão: **0 espaços duplos**.

---

## 5. SEG3 — Alinhamento in-app: divergência REAL encontrada e corrigida

O gate de consentimento (`TermosConsentimento.jsx`) cita 15 artigos. **8 tinham o número errado:**

| no gate (antes) | devia ser | conteúdo |
|---|---|---|
| Art. 6 | **Art. 5** | cadastro gratuito |
| Art. 8 | **Art. 7** | «menor lance único ganha» |
| Art. 9 | **Art. 8** | modalidades de lance |
| Art. 16 | **Art. 13** | transferência de propriedade |
| Art. 26 | **Art. 25** | apuração automática |
| Art. 27 | **Art. 26** | lance mínimo R$ 0,01 |
| Art. 30 | **Art. 34** | proibição de funcionários |
| Art. 33 | **Art. 29** | cessão de imagem |
| Art. 35 | **Art. 37** | registo no RTD |

E **duas contradições materiais**, não só numeração:

- **Art. 20** dizia «Cada senha custa R$ 2,00 **para todas as edições, seja Relâmpago ou Programado**» — o Art. 20 diz **exactamente o contrário** («o Relâmpago não consome senhas»). Era o caso que o próprio MC nomeia em SEG3.2. *É a mesma tensão que registei no MC94.4.1 e que ali ficou «só registo»: aqui encontrei-a no sítio onde ela faz dano — o consentimento legal.*
- **Art. 14** citava a redacção **antiga** (a que o operador mandou clarificar) → passou a citar a nova.
- **Art. 9** dizia que se ofertam «lances através de senhas… Relâmpago ou Programado» → corrigido para saldo (Relâmpago) **ou** senhas (Programado).
- **Art. 4** dizia «implantado a partir de **1º de junho de 2026**»; o v4 diz **5 de outubro de 2026** → alinhado.
- **Art. 37 (RTD)** dizia «1º de maio de 2026» → **5 de outubro de 2026**.
- **Art. 24(d)** «A **senha** digitada não é válida» → «**O valor informado** não é válido» (o Regulamento diz isto, e «senha» não existe no Relâmpago).

**Total: 26 alterações em 8 ficheiros** (7 fontes + 1 teste). Também fora do gate: `CardLance.jsx` (3×), `TabelaLances.jsx`, `Configuracoes.jsx` (2×), `MeusAtivos.jsx`, `Seguranca.jsx`.

**Trava + mutação:** `src/components/__tests__/citacoesRegulamento.test.mjs` compara o texto de cada bloco com o artigo correspondente do v4 por palavras-chave (não só a presença do número). **4/4**, e **5 mutações todas RED → GREEN** com md5 restaurados.

⚠️ A mutação expôs **duas fraquezas minhas**, ambas corrigidas:
1. A 1.ª versão do teste verificava só a **presença** do número no ficheiro. O `CardLance` tem 3 ocorrências — mudar uma deixava as outras a satisfazer a asserção, e o mutante **sobrevivia**. Passou a exigir cada ocorrência.
2. A 1.ª ronda de mutação reportou 4 «RED ok» **falsos**: eu corria os testes com `--test-reporter=tap`, que **não emite** as linhas de resumo que o script lia → `fail` vinha `"?"` e `"?" != "0"` dava sempre «morreu». A medição media o formato do reporter, não os testes. Passou a **rebentar** se a leitura falhar.

---

## 6. ⚠️ DECISÃO SUA NECESSÁRIA — dados de pagamento divergentes

**Não alterei isto de propósito.** O gate in-app mostra dados de pagamento **diferentes** do Regulamento:

| | app (`TermosConsentimento.jsx`) | Regulamento v4 |
|---|---|---|
| PIX | `desafiogut01@gmail.com` | `23.040.066/0001-00` (CNPJ) |
| Agência (BB) | **181627** | **198627** |
| e-mail de contacto (Art. 1) | `grupouniaoetrabalhoam@gmail.com` | `contato@grupouniaoetrabalho.com.br` |

E o próprio Regulamento tem **dois destinos** distintos (Art. 21: Banco do Brasil ag. 198627 cc 847534, PIX CNPJ; Art. 27: Banco BRADESCO ag. 0320 cc 0812782-4, PIX `renascendoam@gmail.com`) — pode ser legítimo (contas diferentes para fins diferentes), mas **não é a mim que cabe decidir qual está correcto**.

Um número de agência trocado num PIX é dinheiro que vai para o lado errado. **Por isso não "alinhei"** — a regra do MC autoriza-me a alinhar *texto que cita o Regulamento*, não a escolher dados financeiros. Diga qual é o correcto e eu alinho os dois lados.

---

## 7. Ficheiros entregues

| ficheiro | estado |
|---|---|
| `Desktop/regulamento_desafiogut_v4.md` | **16 597 chars, 113 linhas** — limpo, sem notas, pronto para cartório |
| `Desktop/regulamento_desafiogut_v4_NOTAS.md` | notas internas separadas (HARD GATE 6) |
| `docs/REGULAMENTO-v3.md` | **v3 preservada byte a byte** (HARD GATE 4) |
| `docs/REGULAMENTO-v4.md` | cópia no repo |
| `docs/MC95-DIFF-v3-v4.md` | diff artigo a artigo + fronteira fechada |
| `_logs/MC95-RELATORIO.md` + `Desktop/MC95-RELATORIO.md` | este relatório |
| `CLAUDE.md` | actualizado (R14) |

---

## 8. Recomendações para cartório

1. **Leve o `regulamento_desafiogut_v4.md`, não o `..._NOTAS.md`.** As notas existem só para a equipa — não devem ser impressas nem anexadas (§ do cabeçalho das próprias notas).
2. **Confirme as duas cláusulas que reescreveu** (Art. 14 e Art. 35(a)/(k)) — são as três em que o texto mudou de sentido, e não apenas de forma. As seis restantes são ortografia, citação legal ou crase.
3. **Feche os dados de pagamento antes de registar** (§6): o documento e o app têm de dizer o mesmo, e agora **não dizem**.
4. **O Art. 37 declara o registo no RTD em 5 de outubro de 2026** — a data é futura relativamente ao documento; o cartório deve confirmar a formulação.
5. As notas internas registam que **nada de testadores saiu do documento público por decisão de LGPD** — vale a pena arquivar o histórico em separado, fora do registo.

---

## 9. Lições aprendidas

1. **Medir onde a divergência faz dano, não só onde é fácil.** O alinhamento in-app era «condicional» — e era ali que estava o problema legal: 8 citações erradas no texto que o utilizador aceita. A tensão do Art. 20 que eu tinha deixado «só como registo» no MC94.4.1 **estava no gate de consentimento**.
2. **Um diff é uma medição, e também mede a coisa errada se o escopo for mau.** Este diff errou **duas vezes** antes de acertar: (a) comparava só a primeira linha e deu o Art. 35 por não alterado — e o Art. 35 tem 16 linhas e DUAS das nove correcções; (b) deixava o bloco do último artigo engolir a secção removida e acusava o Art. 40 de ter mudado sem uma letra sua ser tocada. Se eu tivesse confiado no primeiro, o relatório diria que as correcções 6 e 9 não foram aplicadas.
3. **Um teste que verifica presença não verifica correcção.** `Art. 26` presente no ficheiro não diz nada sobre a ocorrência que mudou — a mutação apanhou-o.
4. **Ler o valor antes de substituir.** «mídia» era erro num sítio e acerto noutro. O replace global teria corrompido o Art. 29.
5. **Não alinhar o que não me cabe decidir.** Os dados de pagamento divergem; escolher um seria adivinhar com o dinheiro de terceiros. Reportar §6 é a resposta correcta.

---

## 10. Pendências

- **§6 dados de pagamento (decisão sua)** — a única com impacto financeiro.
- **`git` e os 3 `??` pré-existentes em `docs/`** (herdado).
- **Herdadas do MC94.x:** P1 tokens no bundle · flaky `hooks-torneio` · `npm audit` 38 vulns · dependências não declaradas (`@aws-sdk/client-kms`) · Art. 9/20 do regulamento **agora resolvidos** (esta era a pendência P1-DOC).

═══ SEG4-ADENDO — VERIFICACAO AD-HOC (script proprio, MANTIDO em %TEMP%/hermes-verify-mc95.sh) ═══
  Cobre: os entregaveis, a preservacao byte-a-byte da v3 (HARD GATE 4), a separacao das notas
  (HARD GATE 6), as 9 correccoes com os alvos antigos a zero + 40 artigos + pt-BR limpo +
  URLs, a honestidade do proprio diff (8 artigos, Art. 40 provado intocado), o teste novo
  4/4, as 5 MUTACOES, a fronteira do commit (13 ficheiros, nenhuma area fechada) e o app sem
  os numeros errados.

  ⚠️ LIÇÃO DE METODO — UM MUTANTE TEM DE SER UMA REGRESSAO:
  A 1.ª versao do M3 trocava apenas a ABERTURA do Art. 20 no gate ("As senhas... custo
  unitario" -> "Cada senha custa o valor unico") e deixava a frase "Relampago nao consome
  senhas" no lugar. O resultado era uma redaccao SEM contradicao: o teste ficava verde — e
  estava CERTO, porque nao havia defeito a apanhar. Eu tinha-o contado como mutante
  sobrevivente, o que e' um erro de julgamento MEU, nao uma lacuna do teste.
  Separado em duas categorias: os mutantes que SAO regressao (5) tem de morrer; uma
  reescrita inofensiva nao. So' o mutante que reintroduz a CONTRADICAO inteira morre (fail=1).
  => Um numero de mutacoes so' vale o que valer a qualidade dos mutantes. "Todos morreram" e'
     uma afirmacao sobre a minha imaginacao de mutantes, nao (so') sobre a robustez do teste.

