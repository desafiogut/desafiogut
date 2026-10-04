# UTAC106x — SNAPSHOT da secção «NORTE DO PRODUTO» anterior (P2 · GATE 15)

> **Porque existe:** o UTAC106x substituiu o corpo da secção `## 🎯 NORTE DO PRODUTO` do `CLAUDE.md` pela
> consolidação **Via B** (programa de fidelidade), por decisão do operador **R18-C (2026-10-04)**.
> O texto anterior — que descrevia a Programada como **concurso de previsões com SPA/MF** — **não se apaga**
> (P2, GATE 15); fica aqui como **snapshot integral**, com as linhas 238–467 do `CLAUDE.md` no estado
> `483576f` (HEAD antes desta alteração).
>
> **Estado:** histórico. **NÃO é fonte de verdade.** Onde divergir, prevalece a secção `NORTE DO PRODUTO`
> do `CLAUDE.md` (Via B).

---

## 🎯 NORTE DO PRODUTO — Definição Consolidada (MC-NORTE-01, 2026-09-28)

> ⚠️ **SUPERADA ONDE DIVERGIR (MC100, 2026-09-28, R18).** O alvo passou a ser a secção «ESCOPO-ALVO v6.0» acima
> (os 2 PDFs). Esta secção continua válida como **descrição do estado actual do código e histórico das decisões**; a
> frase «esta secção prevalece» abaixo aplica-se ao resto do ficheiro, **não** à secção ESCOPO-ALVO.

> **Esta é a definição de referência do produto.** Em caso de divergência entre esta secção e
> qualquer outro trecho deste ficheiro, **esta secção prevalece** — e a divergência deve ser
> corrigida no trecho, não aqui. Fontes: `docs/REGULAMENTO-v4.md` (v4.0), `docs/GLOSSARIO-OFICIAL.md`,
> `docs/FICHA-PLAY-PT.md`, e os MCs de mapeamento (MAPA-01 dinheiro, MAPA-02 produto, MAPA-03 conformidade).

### O que o DesafioGUT É

**Um e-commerce por venda à ordem (dropshipping), operado como torneio de habilidade**, que usa as
modalidades **Oferta Relâmpago** e **Oferta Programada** como **mecanismo promocional de definição de
preço**. O vendedor é o **Grupo União e Trabalho — GUT, CNPJ 23.040.066/0001-00** (`REGULAMENTO-v4.md:5`).

### Os 7 pilares

| # | Pilar | O que significa | Onde está no repo (medido) |
|---|---|---|---|
| 1 | **E-commerce** | venda de produtos/serviços físicos, com preço definido pelo lance vencedor | `REGULAMENTO-v4.md:5,25`; `TermosConsentimento.jsx:82-84`; catálogo em `produtos.mjs:47-49` |
| 2 | **Dropshipping** | entrega pela Loja do patrocinador, conforme a edição | `REGULAMENTO-v4.md:5,41,75`; `GlassHeader.jsx:35`; `TermosConsentimento.jsx:82` |
| 3 | **Ofertas inteligentes** | Relâmpago (saldo) + Programada (senhas), cada edição indica a sua | `REGULAMENTO-v4.md:15,19,47`; `lance-relampago.mjs:187` (`ehProgramado`) |
| 4 | **Habilidade** | o resultado vem da estratégia do participante — não de aleatoriedade | `REGULAMENTO-v4.md:17,96` (Art. 7 e Art. 38) |
| 5 | **Transparência** | dados públicos em tempo real para permitir a estratégia | `REGULAMENTO-v4.md:110`; `_lib/pulso.mjs`, `lances-flash.mjs`, `/ranking` público |
| 6 | **GUTO** | assistente de IA que explica o produto, o regulamento e a estratégia | `chatbot.mjs`, `_lib/rag.mjs`, `_lib/guto-perfis.mjs`, `ChatbotWidget.jsx` |
| 7 | **Conformidade** | CDC + Decreto 7.962/2013 + LGPD + Lei 5.768/1971 (+ Portaria SPA/MF 1.207/2024) | `TermosConsentimento.jsx` (gate LGPD), `_lib/conta-delete.mjs`, `docs/FICHA-PLAY-PT.md` |

### O que o DesafioGUT NÃO É

⛔ **Não é leilão.** ⛔ **Não é aposta de quota fixa.** ⛔ **Não é loteria.** ⛔ **Não é jogo de azar.**
⛔ **Não é sorteio.** ⛔ **Não é um jogo de aleatoriedade nem usa RNG.**

> Estas negações **não são retórica**: são o núcleo da tese jurídica do produto
> (`REGULAMENTO-v4.md:17` e `:96`) e o que sustenta a classificação «torneio de habilidade» perante
> Apple/Google (`GLOSSARIO-OFICIAL.md:4-5,11`). O app **não pode usar essas palavras** —
> `GLOSSARIO-OFICIAL.md:28` proíbe em PT «leilão/leilões, aposta(s), sorte(s), azar, loteria(s)», com
> guardas executáveis em `src/i18n/__tests__/glossario.test.mjs` e `pt-only.test.mjs`.

> ⚠️ **Vocabulário herdado a corrigir (C-N2, medido no MC-NORTE-01).** Este próprio ficheiro usa a
> palavra **proibida** «sorteio» **4 vezes** como nome da edição especial — secções **MC94.1**
> (linha 2227), **MC94.2** (2291), **MC94.3** (2349) e **MC94.3** (2391), todas de 2026-09-25:
> «sorteio com prémio físico e hora anunciada», «UI pública + sorteio com prémio físico», «impede que
> um sorteio de teste entre no ranking do torneio», «o Dashboard ficava preso ao sorteio de 04/10».
> **Contradizem o Art. 38 do Regulamento (`REGULAMENTO-v4.md:96`) e `GLOSSARIO-OFICIAL.md:28`.**
> **Não foram reescritas neste MC**: o texto histórico de um MC registado não se apaga sem decisão do
> operador. Fica a correcção de vocabulário escalada — ver §7 do relatório do MC-NORTE-01.
> ✅ **RESOLVIDO no MC-SORTEIO-01a (2026-09-28, decisão do operador R18):** as 4 ocorrências passaram
> a «edição especial». As citações acima ficam como registo do que estava escrito.

### As duas modalidades (definições do Regulamento — usar estas palavras)

| Modalidade | O que consome | Regra | Referência |
|---|---|---|---|
| **Oferta Relâmpago** | **saldo em R$**, a partir de R$ 0,01 por lance | o valor do lance é debitado directamente do saldo | `REGULAMENTO-v4.md:15,43,55` |
| **Oferta Programada** | **senhas** de R$ 2,00, obtidas por **conversão de saldo** | cada lance consome **1 senha**, independentemente do valor ofertado | `REGULAMENTO-v4.md:15,43,55` |

**Critério de vitória (idêntico nas duas): o MENOR LANCE ÚNICO da edição** — o valor que aparece
exactamente 1 vez (`REGULAMENTO-v4.md:17`; `CLAUDE.md:69`).

### O PRODUTO FINAL — resolvido com o que JÁ EXISTE (MC-PRODUTO-01)

> ⚠️ **CORRECÇÃO REGISTADA (MC-NORTE-01).** O briefing do MC-NORTE-01 descrevia a Oferta Programada
> como «**sorteio** por carteira». **Isso está errado e não foi escrito aqui.** O Regulamento define a
> Programada como a modalidade que usa **senhas**, com o **mesmo** critério de menor lance único
> (`REGULAMENTO-v4.md:15,43,55`), e o Art. 38 nega expressamente «mecanismos de aleatoriedade,
> geradores de números aleatórios (RNG) ou **sorteios**». «Sorte» é palavra **proibida** pelo
> glossário (`:28`). Ver `Desktop/MC-NORTE-01-RELATORIO.md` §7 (C-N1).

**DECISÃO DO OPERADOR (R18, 2026-09-28 — MC-PRODUTO-01):** o produto final **não introduz frontend
novo**. O que o briefing chamava «Passe de Desafio» é **o próprio produto que o R$ 2,00 já compra
hoje**, e o «Quiz de Previsão» **não entra** (seria frontend novo e reintroduziria o enquadramento de
«chance», que é exactamente o que se quer evitar).

#### O que o R$ 2,00 (a senha) já compra — tudo medido no código existente

| Componente do produto | O que é | Onde já existe |
|---|---|---|
| **Crédito de lance** | 1 senha = 1 lance na Programada, qualquer que seja o valor ofertado | `REGULAMENTO-v4.md:43,55`; `senhas-programado.mjs:12`; `Leilao.sol:21,87-88` |
| **Dados estratégicos em tempo real** | as 6 mensagens do Art. 24 (menor e único · não é o menor mas é único · lance igual · valor inválido · lance mal escrito · olho no relógio) | `notificacoes-usuario.mjs:117` `detectarEventoUnicidade`, `:142` `registrarEventosDeLance`, `:153` `lance_unico`, `:158` `perdeu_exclusividade` |
| **Placar público** | ranking do ciclo e lista de lances da edição | `/ranking` (público), `lances-flash.mjs`, `/edicoes` |
| **Pulso da edição** | 4 métricas vitais em tempo real | `_lib/pulso.mjs:1` |
| **GUTO (IA estratégica)** | assistente que explica regra e estratégia, sobre o regulamento | `chatbot.mjs`, `_lib/rag.mjs`, `_lib/guto-perfis.mjs` |
| **Entrada no concurso de habilidade** | direito a concorrer ao menor lance único | `REGULAMENTO-v4.md:17`; apuração `consolidacao.mjs:40-49` |

⇒ **Nada disto é novo.** O «Passe» é a **denominação comercial** deste conjunto; a implementação é a
senha + as notificações + o GUTO + o racional público, que **já estão em produção**. O que falta é
**copy** (nomear o produto na UI, em `src/i18n/pt.js`) e **termos publicados** — não engenharia.

#### Porque isto é um produto real e não «dinheiro por uma chance»

1. **A senha é um crédito de participação com preço fixo** (R$ 2,00), consumido 1-por-lance
   (`REGULAMENTO-v4.md:43,55`) — não é uma aposta.
2. **O resultado depende de estratégia**, não de aleatoriedade (`REGULAMENTO-v4.md:17,96`) — e a
   estratégia é **informada** pelos dados que o próprio produto entrega (tabela acima).
3. **O vencedor PAGA o produto, não o recebe como prémio:** «O valor a ser pago pelo participante
   vencedor pelo produto ou serviço será o valor do lance ofertado e vitorioso»
   (`REGULAMENTO-v4.md:25`, Art. 11º). **É uma venda, com o preço definido pelo concurso.**

#### ⛔ ALERTA JURÍDICO — premissa REFUTADA pelas fontes primárias (não tratar como facto)

O briefing do MC-PRODUTO-01 afirmava que esta estrutura **dispensa autorização** da SPA/MF ao abrigo do
«**Art. 3º, II da Lei 5.768/1971**» e que o «concurso de previsões» do **Decreto 70.951/1972, art. 25**
a cobria. **Lido o texto legal, a afirmação não se sustenta** (fontes: planalto.gov.br, lidas em
2026-09-28 — `L5768.htm`, `D70951.htm`):

- **Lei 5.768/1971, art. 3º, II** isenta «a distribuição **gratuita** de prêmios … em razão do resultado
  de concurso **exclusivamente cultural, artístico, desportivo ou recreativo**, não subordinado a
  qualquer modalidade de álea **ou pagamento pelos concorrentes**, **nem vinculação dêstes ou dos
  contemplados à aquisição ou uso de qualquer bem, direito ou serviço**».
  → A Programada **é paga** (R$ 2,00) e **é vinculada à aquisição de um bem** (a senha). **Falha os dois
  requisitos cumulativos.** A isenção **não se aplica**.
- **Decreto 70.951/1972, art. 30** repete a isenção com as mesmas três condições cumulativas — e é para
  ele que o art. 25 remete.
- **Decreto 70.951/1972, art. 25** diz o **oposto** do que o briefing assumia: o concurso de
  **previsões**/cálculos/testes de inteligência «**está subordinado a este Regulamento**» — isto é,
  sujeito ao regime de autorização.
- **Decreto 70.951/1972, art. 13** — «É vedada a distribuição de prêmios mediante sorteio ou concurso,
  **subordinada à cobrança de ingresso**…»; **art. 14** — «A empresa autorizada **não poderá cobrar dos
  participantes** quaisquer taxas, emolumentos ou contribuições».
- **Lei 5.768/1971, art. 1º, § 3º** — «É proibida a distribuição ou conversão dos prêmios **em
  dinheiro**»; e o **art. 15 do Decreto** limita os prémios a mercadorias, títulos, imóveis, viagens e
  bolsas. → ⚠️ **O Art. 14º do Regulamento (prémio em dinheiro, 80 %/integral) conflita com isto.**

**A tese que se sustenta melhor é outra — e também é a que menos mexe no produto:** a Lei 5.768/1971
regula a «distribuição **gratuita** de prêmios **a título de propaganda**» (`ementa` e `art. 1º`).
O DesafioGUT **não distribui prémios a título de propaganda: vende o produto** e o concurso **define o
preço** (Art. 11º). Sem gratuitidade e sem propaganda, a Lei **está fora do âmbito** — e então **não há
autorização a dispensar**, porque não há promoção de distribuição gratuita de prêmios.
⚠️ **Esta leitura é uma tese, não um facto medido** — foi construída por leitura das fontes primárias
por um agente de engenharia, **não por jurista**. **Requer validação jurídica antes de ser afirmada ao
utilizador ou à Google Play.**

#### Conformidade com a Google Play — a mesma dependência

Fonte: `Real-Money Gambling, Games, and Contests` (support.google.com, lida 2026-09-28):
- **Proíbe** «content or services that enable or facilitate users' ability to wager, stake, or
  participate **using real money** … **to obtain a prize of real world monetary value**», com exemplo
  expresso: «**Games that accept money in exchange for an opportunity to win a physical or monetary
  prize**».
- **Permite** «loyalty programs with **gamified outcomes**» e há a categoria **Gamified Loyalty
  Programs**, com dois requisitos que interessam directamente:
  1. «**Where permitted by law** and not subject to additional gambling or gaming licensing
     requirements» → **o requisito legal brasileiro entra pela porta da política da Play.** Se a
     estrutura licenciar, a Play deixa de a cobrir.
  2. «Loyalty program benefits, perks, or rewards must be clearly **supplementary and subordinate**» →
     o benefício tem de ser suplementar, não a razão da compra.
- Exige ainda: **número fixo de vencedores**, **prazo fixo de entrada** e **data de entrega do prémio**
  publicados nos termos oficiais; e **rácio fixo** de acumulação/resgate documentado.
  → ⚠️ **O DesafioGUT hoje não publica número fixo de vencedores nem data de entrega** — o número de
  vencedores é 1 por edição e a entrega é manual (ver camadas 3 e 4). **Isto é trabalho de termos.**

**Conclusão de conformidade:** as duas frentes **não são independentes** — a Play remete para a lei.
Por isso o desbloqueio é **jurídico, não de frontend**, e a estrutura acima (senha + dados + GUTO, com
o vencedor a **comprar** o produto) é a que **melhor** se apoia no que já existe.

#### O que falta (não é frontend)

| # | Item | Natureza |
|---|---|---|
| 1 | **Publicar as Regras Oficiais de cada edição** (modalidade, janela, número fixo de vencedores, data de entrega) | **termos** (Art. 22º já o exige) |
| 2 | **Nomear o produto na UI** («senha» + o que ela inclui) | **copy** em `src/i18n/pt.js` |
| 3 | **Direito de arrependimento — 7 dias** (CDC 49 + Dec. 7.962 art. 5º) | **termos** + ligar ao `reembolsarSaldoRs` que já existe |
| 4 | **Endereço físico** no rodapé legal | **dado** |
| 5 | **Campo para o nº da NF-e** | **campo** (emissão manual) |
| 6 | **Validar a tese jurídica** (âmbito da Lei 5.768/1971) com jurista | **decisão** |
| 7 | **Decidir sobre o Art. 14º do Regulamento** (prémio em dinheiro) | **decisão** |


### As categorias de cota (patrocinador) — distintas das modalidades

**Bronze · Prata · Ouro · Diamante.** São **níveis de patrocínio** e **não se confundem com as
modalidades de lance** (`REGULAMENTO-v4.md:19`). Definem visibilidade e valor mínimo do produto:

| Cota | Valor | Produto mínimo | Visibilidade no app |
|---|---|---|---|
| Bronze | R$ 2.640,00 | R$ 660,00 | 1 banner vitrine no site + 08 banners no app (semanal, horários alternados) |
| Prata | R$ 5.600,00 | R$ 1.350,00 | 1 banner fixo no site + 12 banners no app (semanal triplicada) |
| Ouro | R$ 11.000,00 | R$ 2.250,00 | 2 banners rotativos + 1 destaque no site + 1 banner nas redes + 20 no app (seg–sáb ×4) · **exclusividade** |
| Diamante | R$ 18.000,00 | R$ 4.500,00 | 2 banners rotativos + 1 destaque no site + 1 banner nas redes + 28 no app (seg–dom ×4) · **exclusividade** |

Fonte: `REGULAMENTO-v4.md:86-90` (m-p) e `:81` (h). No código: `produtos.mjs:51` (`CATEGORIAS`),
`produtos.mjs:363-373` (o nível **restringe** o slot da vitrine — regra MC89.40 D3).

### O papel do GUTO

Assistente de IA do produto: explica o regulamento e o mecanismo, responde a dúvidas e acompanha o
participante. Prompt de conformidade em `_lib/guto-perfis.mjs`; base de conhecimento em `_lib/rag.mjs`.
⚠️ **`_lib/guto-perfis.mjs:83` promete «prazos de entrega, trocas e devoluções» que o sistema ainda
não tem** — corrigir quando as camadas de Entrega e Arrependimento existirem (ver §«O que falta»).

### Leis que o produto cumpre, e leis que evita

| | Diploma | Papel |
|---|---|---|
| ✅ cumpre | **CDC (Lei 8.078/1990)** | relação de consumo: arts. 30, 49, 18, 12, 14 |
| ✅ cumpre | **Decreto 7.962/2013** | informação obrigatória no comércio electrónico (art. 2 — nome, CNPJ, endereço físico e electrónico, características, despesas) |
| ✅ cumpre | **LGPD (Lei 13.709/2018)** | gate de consentimento, direitos do titular, retenção fiscal |
| ✅ cumpre | **Lei 5.768/1971** | distribuição de prémios — ⚠️ só se aplica enquanto o Art. 14 permitir prémio em dinheiro |
| ✅ invoca | **Portaria SPA/MF 1.207/2024** | enquadramento como torneio de habilidade (`REGULAMENTO-v4.md:96`; `GLOSSARIO-OFICIAL.md:4`) |
| ⛔ evita | **Lei 14.790/2023** | apostas de quota fixa («bets») — o produto **não** é aposta |
| ⛔ evita | **DL 3.688/1941** | contravenções: jogo de azar |

> ⚠️ **Caveat medido (MC-PRE-99.5.4, pesquisa de 2026-09-27).** Nos 7 diplomas descarregados do
> planalto.gov.br, a expressão «torneio de habilidade» tem **0 ocorrências**; a única menção a
> «habilidade» vive no *carve-out* de *fantasy sport* da Lei 14.790/2023. A classificação «torneio de
> habilidade» apoiada na Portaria SPA/MF 1.207/2024 (`REGULAMENTO-v4.md:96`) **não foi verificável**
> — o texto da Portaria não foi obtido. **Não tratar como facto verificado.**

### O que já existe vs o que falta (resumo — detalhe no relatório do MC-NORTE-01)

**Existe e funciona:** entrada de dinheiro por PIX/Mercado Pago com idempotência e reembolso
automático; saldo R$ em Supabase; senhas on-chain com contrato a exigir saldo; lances nas duas
modalidades com JWT de assinatura EIP-191; apuração on-chain (EIP-712 + Flashbots); notificação
in-app ao ganhador; gate LGPD com 4 declarações; CNPJ em destaque; catálogo com 4 slots e ciclo de
vida; edições em Blob com janela server-authoritative; GUTO com RAG.
**Não existe:** entrega (morada/rastreio/NF-e/prazo), direito de arrependimento (CDC 49), frete,
pagamento do prémio ao ganhador, saque do saldo, ponte apuração→catálogo, dados do destinatário,
catálogo com conteúdo (0 produtos), edições a decorrer.

### Índice de planos e fontes

- `Desktop/MC-MAPA-01-RELATORIO.md` — fluxo do dinheiro
- `Desktop/MC-MAPA-02-RELATORIO.md` — fluxo do produto
- `Desktop/MC-MAPA-03-RELATORIO.md` — exigências externas (lei + lojas)
- `Desktop/MC-NORTE-01-RELATORIO.md` — norte, camadas e plano de migração
- `Desktop/MC-PRODUTO-01-RELATORIO.md` — **produto final** + conformidade + o que falta implementar
- `docs/REGULAMENTO-v4.md` · `docs/GLOSSARIO-OFICIAL.md` · `docs/FICHA-PLAY-PT.md`

