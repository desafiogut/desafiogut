# DOSSIÊ JURÍDICO — DesafioGUT
## Documento de factos e perguntas para parecer de advogado

> **UTAC110k (B-2)** · Preparado por: Hermes (executor técnico) · Data: 2026-10-17
> **O que este documento é:** um dossiê de **factos medidos** no sistema e de **perguntas concretas**,
> organizado em blocos para o advogado responder por partes.
> **O que este documento NÃO é:** não é parecer jurídico, não conclui Direito e não substitui o
> advogado. Onde há dúvida, está marcado **A CONFIRMAR** em vez de afirmado.
> **Regra de honestidade:** todos os números citados foram medidos no sistema e a data da medição está
> indicada. Nenhum número foi estimado. O que não foi medido diz «não medido».

> **ACTUALIZAÇÃO 2026-10-17 (UTAC110k.1):** quatro pontos deste dossier deixaram de ser perguntas em
> aberto e passaram a **estado de conformidade implementado** — o Art. 17º, o Data Safety, o DPO e o
> vocabulário de pseudonimização. Estão marcados **✅ FEITO (validar)** nos blocos respectivos. As
> perguntas mantêm-se, mas mudam de sentido: já não é «o que fazer?», é «concorda com o que foi feito?».
> O que continua **inteiramente em aberto** é o Bloco C (saldos presos) e a validação jurídica global.

---

## 0. Como usar

O documento tem 5 blocos (A–E). Cada bloco termina com perguntas numeradas e espaço de resposta.
Os blocos são independentes: pode responder a uns e deixar outros para uma segunda ronda — mas os
blocos **A** e **B** condicionam os restantes (se a natureza do jogo ou o vendedor mudarem, as
declarações de LGPD e da loja têm de ser revistas).

Prioridade, se o tempo for limitado: **A** (natureza do jogo) → **B** (quem vende) → **C** (saldos
presos) → **D** (LGPD) → **E** (loja).

---

## 1. Identificação

| Item | Valor | Fonte |
|---|---|---|
| Aplicação | **DesafioGUT Torneio Habilidade** (Android; também PWA/web) | `docs/FICHA-PLAY-PT.md` |
| Vendedor legal declarado na loja | **Associação Recreativa dos Nordestinos no Amazonas** — CNPJ **23.040.066/0001-00** | `docs/FICHA-PLAY-PT.md:40,81`; `docs/gabarito-play-console.md:27` |
| Grupo / marca | **Grupo União e Trabalho** | `docs/lgpd-politica-retencao.md` |
| Encarregado de Dados (DPO) | **Francisco Canindé Marinho** — `dpo@desafiogut.com.br` (alternativa: `contato@grupouniaoetrabalho.com.br`, assunto «DPO») · designado por **R18-110k.1-DPO** | `docs/lgpd-politica-retencao.md` §5; `Privacidade.jsx` §14; `ExcluirConta.jsx` |
| Documento que rege a relação com o utilizador | **Regulamento v5.0** (`docs/REGULAMENTO-v5.md`), aceite por gate próprio antes de usar a app | código (gate legal) |
| Mercado | Brasil (PT-BR) | `docs/FICHA-PLAY-PT.md` |

**Ponto de atenção (actualizado):** a LGPD (art. 41) exige encarregado **designado e divulgado** — está
feito em três lugares (política, app, página de exclusão). **Falta o aceite do próprio nomeado e a
existência da caixa de e-mail**, que o executor não tem como verificar. → pergunta **D.7**.

---

## 2. O que a plataforma faz (em linguagem simples, sem jargão)

1. O utilizador entra (login Google/e-mail) e aceita o Regulamento v5 e a Política de Privacidade.
2. Compra o **Passe Desafio** por **R$ 2,00** (Art. 6º), que lhe dá **1 crédito de lance** (na UI) —
   o Regulamento chama-lhe «ponto de lance». Ver a tensão no Bloco A.
3. Com o crédito, dá **um lance** numa edição: um número inteiro (em «pontos de lance»).
4. **Vence quem escolher o menor valor que ninguém mais escolheu** — «menor lance único» (Art. 14º).
   O Regulamento qualifica isto como **«competição de habilidade»** (Art. 14º).
5. Há edições **Relâmpago** (janela curta) e **Programadas** (com hora marcada).
6. Existe um programa de fidelidade paralelo: **pontos** por compra (1 Passe = 1 ponto), **palpites**
   (bónus), **indicações** (bónus), e **ECOQUILDO** — uma moeda social interna com **lastro em reais
   à razão de 1 ECOQUILDO = R$ 1,00** (Arts. 47º e 50º), mantida numa reserva da Associação.
7. Aos **50 pontos**, o utilizador pode resgatar um **cartão colecionável físico**, fornecido a uma
   morada de entrega.
8. O prémio da edição é atribuído ao vencedor pela coordenação (contrato on-chain `LeilaoGUT` regista
   o histórico; a entrega é operacional).

### 2.1 O que existe em código, hoje

- Pagamento por **PIX** (Mercado Pago) e por **Google Play Billing** (Android).
- Registo de lances também **on-chain** (contrato `LeilaoGUT`, rede Ethereum; inclui «senhas» legadas).
- Programa de indicação com códigos, bónus e detecção anti-fraude (mesmo dispositivo, IP, etc.).
- **Exclusão de conta** com eliminação e anonimização por tabela (ver Bloco D).

---

## 3. Fluxos de dinheiro (o que entra, o que sai, para quem)

| Fluxo | Meio | Valor | Para quem | Observações |
|---|---|---|---|---|
| Compra do Passe Desafio | PIX (Mercado Pago) | **R$ 2,00** por Passe | Associação (vendedor legal declarado) | Art. 6º. Cada Passe = 1 crédito de lance |
| Compra do Passe Desafio | **Google Play Billing** | igual | Google retém a comissão e repassa | declarado no Data Safety |
| Prémio da edição | transferência/entrega | definido por edição | vencedor | registo on-chain do histórico |
| Cartão colecionável | 50 pontos → 1 cartão físico | sem pagamento | utilizador | há **morada de entrega** (dado pessoal) |
| ECOQUILDO | moeda interna | 1 ECOQUILDO = R$ 1,00 | detido pelo utilizador | **lastro em reserva** (Art. 50º) |
| Senhas on-chain (legado) | crédito on-chain | nominal R$ 2,00 cada | utilizador | 12 senhas em 1 conta (ver Bloco C) |

**Não há**, no código, venda directa de «pontos de lance» por dinheiro: o que se compra é o **Passe**
(R$ 2,00), que gera 1 crédito de lance. É esta distinção que o Bloco A põe ao advogado.

---

## BLOCO A — Natureza jurídica do jogo (D2 / D4 / G6)

### A.1 O que o Regulamento afirma

- **Art. 14º** — «A Oferta Relâmpago é uma **competição de habilidade**: vence o participante que
  apresentar o **menor valor em pontos de lance que ninguém mais escolheu** (menor lance único).»
- **Art. 16º** — «O lance é registado em **pontos de lance**, obtidos por **engajamento** no aplicativo.»
- **Art. 17º** — «Os pontos de lance **não são comprados com dinheiro real** — são ganhos por
  atividade no aplicativo.»
- **Art. 23º** — o sistema bloqueia lance com pontos repetidos, inexistentes ou não creditados.

### A.2 A tensão — **✅ FEITO (validar)** — resolvida por decisão do operador em 2026-10-17

O utilizador **paga R$ 2,00** e recebe **1 crédito de lance**, que é o que lhe permite dar um lance.
O Regulamento diz, no art. 17º, que os pontos de lance **não são comprados com dinheiro real**.

> **O que foi feito (R18-110k.1):** o Art. 17º passou a dizer — «O Passe Desafio (R$ 2,00) é a
> transação principal que dá acesso a métricas, GUTO, ECOQUILDO e 1 crédito de lance. O crédito de
> lance é um benefício suplementar e subordinado à compra do Passe, não uma taxa separada.»
> **Como foi feito (v5.1):** o texto novo entrou **nos dois ficheiros** — `GUTO-REGULAMENTO.md` (fonte de
> verdade) e `REGULAMENTO-v5.md` (transcrição) —, a versão subiu a **5.1** e os dois corpos ficaram
> **byte a byte iguais** outra vez (a invariante «app e GUTO dizem o mesmo» está testada e passa). O
> **gate de aceite subiu de 3.0 para 3.1**: quem aceitou a 5.0 volta a ver o ecrã de aceitação — é a
> consequência de mudar o Regulamento, não um efeito colateral.
> **Ressalva que continua aberta:** os Arts. 16º/18º/23º ainda dizem «pontos de lance», e o Art. 18º
> revela que é **conceito diferente** do «crédito de lance» (DEBT-052). Falta o **PDF oficial v5.1**.

Isto é relevante porque é exactamente o ponto onde a qualificação «habilidade» vs «sorte/azar» se
joga: se o lance é pago e o resultado depende de um **número escolhido** (não de uma destreza
verificável), o enquadramento como competição de habilidade precisa de sustentação própria.

### A.3 O que o sistema faz, concretamente (para o advogado decidir com factos)

- O resultado **não é aleatório gerado pela casa**: cada participante **escolhe** o seu número.
- Vence o **menor valor único** — há estratégia (escolher baixo, mas não igual aos outros).
- O sistema **bloqueia** lances com pontos não creditados (Art. 23º) — não há lance a descoberto.
- **Não existe** (medido no código) geração de números aleatórios, sorteio, nem prémio por sorteio.

### A.4 Perguntas — Bloco A

**A.1** O «menor lance único» com número escolhido pelo participante sustenta, no Brasil, a
qualificação como **competição de habilidade** (e não sorteio)? Que elementos de prova/documentação
reforçam essa qualificação?
`Resposta:`

**A.2** O Art. 17º da **v5.1** diz que o Passe é a transação principal e o crédito de lance um benefício
subordinado — e a versão nova obriga a **re-aceitar**. **A redacção resolve a objecção da política de
*Gamified Loyalty Programs* («taxa para participar»), ou é preciso ir mais longe — p. ex. retirar o lance
do Passe?** A qualificação como habilidade muda com o facto de o lance ser pago?
`Resposta:`

**A.3** A existência de **prémio em dinheiro/bem** e de **pagamento para participar** configura
sorteio, promoção comercial ou concurso? Que autorizações (se alguma) são exigidas?
`Resposta:`

**A.4** O **cartão colecionável físico** (50 pontos) e o **ECOQUILDO** (moeda interna com lastro)
alteram a qualificação — nomeadamente por poderem ser lidos como **contraprestação** ou como
**moeda eletrónica**?
`Resposta:`

**A.5** Que **documentos** o advogado precisa que a empresa produza para emitir o parecer (regulamento,
termos, contratos com o fornecedor do cartão, política de prémios, contabilidade do lastro)?
`Resposta:`

---

## BLOCO B — Quem vende e em nome de quem (D4)

- A loja (Google Play) declara como vendedor legal a **Associação Recreativa dos Nordestinos no
  Amazonas** (CNPJ 23.040.066/0001-00), sob a marca **Grupo União e Trabalho**.
- O dinheiro do PIX entra por conta da Associação; o ECOQUILDO tem **reserva em reais** mantida pela
  Associação (Art. 50º); o cartão físico é entregue ao utilizador.

**Ponto de atenção:** a app é **operada** pela Associação, mas o texto do Regulamento e os materiais
falam do «Grupo União e Trabalho». Se o Grupo não é pessoa jurídica distinta da Associação, há risco
de o consumidor não saber **com quem** contrata.

### Perguntas — Bloco B

**B.1** Quem é o **fornecedor** para efeitos do CDC: a Associação, o Grupo, ou ambos? Como deve ser
identificado na app e na loja?
`Resposta:`

**B.2** O cartão colecionável é **vendido** pela Associação ou é **brinde/contraprestação** de um
programa de fidelidade? Muda as obrigações (garantia, troca, defeito)?
`Resposta:`

**B.3** O **ECOQUILDO** com lastro de 1:1 em R$ na reserva da Associação exige algum enquadramento
próprio (moeda eletrónica, arranjo de pagamento, crédito ao consumidor)? Quem responde pela reserva?
`Resposta:`

**B.4** Contratar com **menores** exige algum tratamento específico neste modelo?
`Resposta:`

---

## BLOCO C — Saldos pagos e valores presos (D3)

Estes são **valores que clientes já pagaram** e que ainda não foram consumidos nem devolvidos.
Medição de **2026-09-30** (MC103), só agregados:

| Item | Contas | Valor | Fonte |
|---|---|---|---|
| Saldo em R$ | **7** | **R$ 23,75** (2 375 centavos) | `saldo_rs` |
| Créditos PIX históricos | 8 | R$ 58,00 | `saldo_rs_creditos` |
| Débitos registados | 0 | — | `saldo_rs_debitos` |
| **Senhas on-chain** | **1** | **12 senhas** (nominal R$ 24,00) | `saldoSenhas` @ bloco 26087953 |
| Dívidas de bónus | 0 | 0 | `rankings_ciclo` |
| Vale-Crédito | 0 | R$ 0,00 | `wallet` |
| Troco de senhas | 0 | — | `troco_senhas` |

**Divergência medida e ainda não explicada:** R$ **34,25** consumidos, dos quais só R$ 24,00 são
explicados pelas 12 senhas → **R$ 10,25 sem destino conhecido**. A reconstituição desse valor exige
livro-razão (tarefa técnica, MC111) e **não foi feita**.

> ⚠️ **Estes números têm de ser re-medidos** antes de qualquer decisão (são de 30/09/2026 e **não foram
> re-medidos neste UTAC** — a app esteve em uso depois disso). **É o bloco mais desactualizado do
> dossier e o único que continua inteiramente em aberto.**

### Perguntas — Bloco C

**C.1** Saldo em R$ e senhas on-chain **já pagos** e não usados: há obrigação de **restituir em
dinheiro**, de converter em Passe, ou de manter disponíveis? Qual o prazo e a base (CDC, enriquecimento
sem causa)?
`Resposta:`

**C.2** A **devolução em dinheiro** de saldos de conta exige algum procedimento formal (aviso,
prazo, prescrição)? Como deve ser registada?
`Resposta:`

**C.3** Os **R$ 10,25 sem destino** — enquanto não forem reconstituídos, há dever de informar os
titulares? Que risco existe em não o fazer?
`Resposta:`

**C.4** Quando um utilizador **pede a exclusão da conta**, o que acontece ao saldo dele? Hoje a
exclusão apaga o saldo (é dado sem obrigação de retenção) — o advogado valida que se possa apagar
**valor pago** em vez de o devolver?
`Resposta:`

---

## BLOCO D — LGPD

### D.1 O que a app faz hoje (implementado, com evidência no repo)

**Bases legais declaradas** (`docs/lgpd-politica-retencao.md`):

| Categoria | Retenção | Base legal invocada |
|---|---|---|
| Logs de auditoria | 13 meses | Marco Civil, art. 15 |
| Dados contábeis (PIX) | 10 anos | Decreto 8.539/2015 + CC art. 1.183 |
| Dados de sessão / rate-limit | 30 dias | legítimo interesse |
| Consentimento LGPD | 5 anos | art. 7º, I + art. 8º §6º |
| Identificação (e-mail/Google) | enquanto durar a relação | execução de contrato |
| Endereço on-chain + lances | imutável | natureza da blockchain |
| Fingerprint anti-Sybil | 24 horas | legítimo interesse |

**Direitos do titular** (art. 18): acesso e portabilidade por exportação JSON; correção por e-mail;
eliminação por fluxo próprio na app **e** por página web pública.

**Eliminação de conta** (implementada em 2026-10, UTAC110j.1): política **tabela a tabela** —
apaga o que não tem obrigação de retenção, **anonimiza** o que tem (fiscal/contábil/auditoria) e
**retém** o que a lei obriga (on-chain, NF-e). O ecrã de exclusão lista **o que sai e o que fica**,
por item, com a base. O titular pode pedir por e-mail se não conseguir entrar.

### D.2 Limitações técnicas que o advogado deve conhecer (declaradas, não escondidas)

1. **A anonimização usada é pseudonimização**: o identificador é um `hash` do endereço da carteira.
   Como a carteira é **pública** (blockchain), quem a conhecer pode recalcular o hash. O ecrã passou a
   dizer «identificador pseudónimo derivado da carteira» — **não** «sem vínculo com você».
2. **Referências contabilísticas** (chave da NF-e, `order_id` do Google Play) são mantidas por
   obrigação fiscal — e a Google consegue mapeá-las. É inerente à retenção da prova.
3. **Lances de uma edição ainda aberta** não podem ser anonimizados sem quebrar a apuração: ficam com
   a carteira até a edição fechar. O ecrã de sucesso **diz quantos ficaram e porquê**.
4. Há **uma categoria fora do alcance** do fluxo por endereço: identificadores de dispositivo
   (`cota_fingerprints`). Está registada como pendência (DEBT-050), não silenciada.

### Perguntas — Bloco D

**D.1** *(o texto da app já não promete anonimato — diz «pseudonimizado» e que o registo continua a ser
dado pessoal, em três lugares)*. A **pseudonimização** com hash **sem sal** de um dado público satisfaz
o art. 12 para efeitos de eliminação, ou é exigível mais (sal secreto, destruição da chave)? Se for
exigível, altera-se o esquema — e isso é mudança de contrato de dados, não texto.
`Resposta:`

**D.2** A retenção de **10 anos** para dados de PIX e a de **13 meses** para logs estão bem
fundamentadas? Alguma deve ser encurtada ou alargada?
`Resposta:`

**D.3** O **consentimento** (art. 7º, I) é a base adequada para o quê, exactamente, neste produto? Há
tratamentos que devam passar a **execução de contrato** ou **legítimo interesse**?
`Resposta:`

**D.4** **Dados on-chain** (endereço, valores) são imutáveis: como deve a app **informar** o titular
antes da coleta, para que o consentimento seja válido para algo que não pode ser apagado?
`Resposta:`

**D.5** O fluxo de exclusão atual **apaga o saldo em R$** do titular. Isso é compatível com o direito
de eliminação, ou colide com o direito ao **saldo pago** (Bloco C)?
`Resposta:`

**D.6** **Transferência internacional**: alojamento/fornecedores (Netlify, Supabase, Google, Mercado
Pago) podem processar fora do Brasil. Que instrumento é exigido?
`Resposta:`

**D.7** **Encarregado (DPO)** — foi designado **Francisco Canindé Marinho** (`dpo@desafiogut.com.br`),
divulgado na política, na app e na página de exclusão. **A escolha é adequada (art. 41, §3º — formação
e conhecimento)? Que formação deve ser dada?** O nomeado tem de aceitar formalmente o cargo.
`Resposta:`

**D.8** **Incidentes** (art. 48): a política prevê comunicação à ANPD e aos titulares em 2 dias úteis.
O prazo e o critério estão corretos?
`Resposta:`

**D.9** **Menores**: a app declara restrição etária? Que deveres adicionais (art. 14) se aplicam?
`Resposta:`

---

## BLOCO E — Google Play / Data Safety

A app declara na loja, e tem de **sustentar**, o seguinte:

1. **Exclusão de conta**: existe via **in-app** e **link web público** (`/excluir-conta`), sem
   necessidade de reinstalar. O pedido é atendido em até 15 dias (com alternativa por e-mail).
2. **Dados recolhidos e finalidades**, conforme a política de privacidade e o formulário do Data
   Safety — que tem de ser **coerente** com o texto da app e com o que o backend faz.
3. **Pagamentos**: PIX e Google Play Billing (a app não processa cartões diretamente).

### Perguntas — Bloco E

**E.1** As declarações do Data Safety (recolha, partilha, retenção, exclusão) estão sustentadas pelo
que a app faz — ou há alguma declaração que o advogado considere **arriscada** e deva ser corrigida
antes do envio do AAB?
`Resposta:`

**E.2** A app **não** é um jogo a dinheiro? Se o advogado concluir que **é**, o enquadramento na Play
Store muda (política de jogos a dinheiro) — e a decisão tem de ser tomada **antes** do AAB.
`Resposta:`

**E.3** O **link web de exclusão** cumpre o requisito da Google (nomear app e developer, explicar
passos, dizer o que é apagado e retido, funcionar sem a app instalada)?
`Resposta:`

---

## 9. Perguntas bloqueantes para o AAB (resumo executivo)

Se o advogado só puder responder a cinco, que sejam estas:

1. **A.1/A.2** — o modelo é competição de habilidade **com** lance pago? (e o art. 17º muda ou o
   produto muda)
2. **A.3** — exige autorização de promoção/sorteio?
3. **B.1** — quem é o fornecedor perante o consumidor?
4. **C.1/C.4** — os R$ 23,75 + 12 senhas: devolver, converter ou manter? E o que acontece ao saldo
   quando o titular apaga a conta?
5. **D.1/D.7** — a pseudonimização por hash serve como eliminação? Quem é o DPO?

---

## 10. Anexos — onde está a evidência

| Assunto | Ficheiro no repositório |
|---|---|
| Regulamento que rege a relação | `docs/REGULAMENTO-v5.md` (Arts. 6º, 14º, 16º, 17º, 23º, 47º, 50º) |
| Política de retenção e bases legais | `docs/lgpd-politica-retencao.md` |
| Ficha da loja / vendedor legal | `docs/FICHA-PLAY-PT.md`, `docs/gabarito-play-console.md` |
| Medição dos saldos presos | `_logs/MC103_SEG1.md` (tabela consolidada) |
| Decisões em aberto (D2/D3/D4, G1–G6) | `_logs/MC00.0-RELATORIO.md`, `docs/TORNEIO-HABILIDADE.md` |
| Política de exclusão de conta (tabela a tabela) | `_logs/UTAC110j.1_SEG1.md` §2 |
| Texto que o utilizador lê na exclusão | `src/components/ExcluirContaModal.jsx`, `src/pages/ExcluirConta.jsx` |
| Programa de fidelidade / ECOQUILDO | `docs/REGULAMENTO-v5.md` Arts. 47º–51º; `supabase/migrations/20261014_utac110e_eco_quildo.sql` |

---

## 11. O que este dossiê NÃO cobre

- Contratos com fornecedores (Mercado Pago, Google, transportadora do cartão) — não estão no repo.
- Contabilidade do lastro do ECOQUILDO (a reserva é registada no sistema; a sua **existência real**
  em conta bancária não é verificável por código).
- Enquadramento fiscal/tributário dos prémios — não é matéria deste documento.
- As relações laborais e societárias do Grupo/Associação.
