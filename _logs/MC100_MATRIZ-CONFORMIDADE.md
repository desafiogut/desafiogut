# MC100 — MATRIZ DE CONFORMIDADE (Frente C · SEG2 §2.1)

> Estados: ✅ cumprido e medido · 🟨 parcial · ⛔ não existe · ❓ não verificado.
> Responsável: **Cli** = cliente (titular: DEC-09) · **Jur** = jurista · **Cont** = contabilidade · **Nós** = operador + agente · **SPA** = SPA/MF.
> ⚠️ A coluna «Estado actual» é **medida no repo**. As exigências legais citam as leituras de fonte primária já registadas no CLAUDE.md (MC-PRODUTO-01, 28/09) ou os PDFs. Onde nenhuma das duas foi lida, está ❓.

| # | Norma | Artigo / regra | Exigência | Estado actual (evidência) | Acção | Camada | Dependência | Resp. |
|---|---|---|---|---|---|---|---|---|
| 1 | Lei 5.768/1971 | art. 1º | prévia autorização para distribuir prémios (a Programada, segundo o PDF) | ⛔ não submetida | Pedido SPA/MF (GRU + SCPC, PDF VG §14) | C5 | [MEI], DEC-09 | Cli + SPA |
| 2 | Lei 5.768/1971 | art. 1º, § 1º | titular = PJ do sector comercial | ❓ texto não relido neste MC (R-04) | confirmar a elegibilidade do MEI | C5 | [MEI] | Cont + Jur |
| 3 | Lei 5.768/1971 | art. 1º, § 3º | prémio não convertível em dinheiro | ✅ no repo **local**: o MC-SORTEIO-01a tirou o prémio em dinheiro do Art. 14 (`70a36eb`) · ⛔ **não publicado** | publicar (C0) | C0, C5 | — | Nós |
| 4 | Lei 5.768/1971 | art. 3º, II | isenção só para concurso gratuito e não vinculado a compra | n/a: o PDF pede autorização, não isenção. ✅ coerente | não invocar a isenção na Programada | C5 | — | Jur |
| 5 | Dec. 70.951/1972 | art. 13 | vedado concurso subordinado a ingresso | 🟨 depende do Passe ser um produto real (R-03) | Passe com cupons reais (DEC-02) | C1 | DEC-01/02 | Cli + Jur |
| 6 | Dec. 70.951/1972 | art. 14 | vedado cobrar taxas dos participantes | 🟨 idem | idem + o regulamento explicita o que o R$ 2 compra | C1, C5 | DEC-02 | Jur |
| 7 | Dec. 70.951/1972 | art. 25 | concurso de previsões subordinado ao regulamento aprovado | ⛔ o concurso não existe | C2 + aprovação | C2, C5 | [SPA] | SPA |
| 8 | Dec. 70.951/1972 | art. 30 | requisitos de gratuidade (isenção) | n/a (idem #4) | não invocar a isenção na Programada | — | — | Jur |
| 9 | Lei 14.790/2023 | apostas de quota fixa | não aplicável | ✅ não há odds nem quota fixa | manter o vocabulário (glossário) | C14 | — | Nós |
| 10 | DL 3.688/1941 | art. 50 (jogo de azar) | não aplicável | 🟨 **Relâmpago com lance pago = risco** (R-02) | parecer jurídico; a tese entra no Regulamento v5 | C5 | R-02 | Jur |
| 11 | CDC | art. 49 | arrependimento em 7 dias | ⛔ não existe (só o comentário `produtos.mjs:480`) | C3 + C13 | C3, C13 | DEC-05 | Nós + Cli |
| 12 | CDC | arts. 30/31 (oferta clara) | preço, características, riscos | 🟨 ficha do produto existe; regras do Passe inexistentes | ficha obrigatória + termos do Passe | C1, C6 | — | Nós |
| 13 | CDC | arts. 18/26 (vício/garantia) | garantia legal do produto físico | ❓ não mapeado no código nem nos PDFs | incluir a garantia do lojista no edital/termos | C5 | DEC-06 | Cli + Jur |
| 14 | Dec. 7.962/2013 | art. 2º | nome empresarial, CNPJ, endereço físico e electrónico, características, despesas (frete) | 🟨 CNPJ da **associação** em `TermosConsentimento.jsx:61,83,229`; endereço físico ⛔; frete ⛔ | dados do MEI + frete no checkout | C6 | [MEI], DEC-07/15 | Cli + Nós |
| 15 | Dec. 7.962/2013 | art. 4º | resumo do contrato, confirmação imediata, SAC, contrato disponível | 🟨 gate + e-mail de suporte; confirmação de pedido por e-mail ⛔ | e-mail transaccional + contrato acessível | C19, C5 | — | Nós |
| 16 | Dec. 7.962/2013 | art. 5º | arrependimento pelo **mesmo canal**; comunicar a instituição de pagamento para estornar | ⛔ | botão in-app + refund MP | C3 | DEC-05, R-05 | Nós |
| 17 | LGPD | art. 7º (bases) | base legal por tratamento | 🟨 gate de consentimento; bases por finalidade não documentadas; **leads para o lojista sem base** | política v2 + mapa de bases | C7 | DEC-08 | Jur + Nós |
| 18 | LGPD | art. 8º (consentimento) | livre, informado, destacado; prova do controlador | 🟨 gate com 4 declarações (`TermosConsentimento.jsx:199`); **prova no servidor não verificada** | medir e, se faltar, gravar o aceite (versão, data) | C7 | — | Nós |
| 19 | LGPD | art. 18 (direitos) | acesso, correcção, eliminação | ✅ `exportar-dados.mjs`, `delete-account.mjs`, `/excluir-conta` | manter; incluir os pedidos (morada/CPF) na exportação: **a verificar** | C7 | — | Nós |
| 20 | LGPD | art. 16 (retenção) | eliminar ao fim do tratamento, salvo obrigação legal | 🟨 prazos não escritos para morada/CPF/NF-e | política de retenção | C7 | Cont | Jur + Cont |
| 21 | LGPD | art. 9º / compartilhamento | informar partilha com terceiros (lojista) | ⛔ | DEC-08 + política | C7 | DEC-08 | Jur |
| 22 | Res. CMN 5.100/2026 | mercados preditivos | não aplicável (métrica interna, segundo o PDF) | ❓ texto não lido (R-18) | parecer | C5 | — | Jur |
| 23 | Google Play | Payments | Billing para bens digitais | ⛔ **conflito com o Passe digital** (R-01) | DEC-01 | C1, C9 | DEC-01 | Cli + Jur |
| 24 | Google Play | Real-Money Gambling → Gamified Loyalty | «where permitted by law **and not subject to additional gambling or gaming licensing requirements**» (⚠️ R-19: a Programada exige SPA/MF); benefício suplementar e subordinado; nº fixo de vencedores; prazo de entrada; data de entrega; rácio fixo | ⛔ nada publicado; ficha MC90.4 diz «Leilão» | C5 (edital) + C9 (ficha) | C5, C9 | [SPA], DEC-04 | Nós + Cli | **⛔ R-19 REVERTIDA pelo UTAC106x.1 (2026-10-04):** com a Via B (fidelidade, **sem concurso e sem SPA/MF**) a premissa «a Programada exige SPA/MF» **cai** — o requisito *«not subject to additional gambling or gaming licensing requirements»* passa a ser **satisfeito**; ver `CLAUDE.md` NORTE DO PRODUTO + bloco R14. O texto original fica acima, **não apagado**.
| 25 | Google Play | Data Safety | declarar dados financeiros, localização/morada, partilha | 🟨 declaração MC90.4 de 15/08 (anterior à morada/CPF e aos leads) | refazer | C9 | C7 | Nós |
| 26 | Google Play | classificação IARC / público 18+ | coerente com o conteúdo | 🟨 a ficha MC90.4 declara «sem jogos de azar» + 18+ no público; o PDF diz «AO», que não é uma classificação da Play/IARC (no Brasil é ClassInd 18, R-17) | refazer o questionário IARC com o modelo v6 | C9 | R-02 | Nós |
| 27 | Google Play | Financial features declaration | declarar pagamentos | 🟨 MC90.4 declarou PIX + on-chain | refazer | C9 | — | Nós |
| 28 | Google Play | Account deletion (URL) | URL pública | ✅ `/excluir-conta` (MC72) | manter | — | — | — |
| 29 | Apple | 3.1.1 | IAP para desbloquear conteúdo digital; vouchers digitais só por IAP | ⛔ conflito com o Passe (R-01) | DEC-01 | C1, C10 | DEC-01 | Cli |
| 30 | Apple | 3.1.3(e) (**não «3.1.5(a)»**: errata do PDF, R-17) | bens físicos consumidos fora do app: meio de pagamento que **não** seja IAP | ✅ a lógica bate para os produtos físicos | citar a diretriz certa na ficha | C10 | — | Nós |
| 31 | Apple | 5.3 / 5.3.3 / 5.3.4 | concursos: regras oficiais; **5.3.3: sem IAP para créditos de RMG**; 5.3.4: RMG exige licença; lotaria = consideração + chance + prémio | ❓ não avaliado para a Relâmpago | parecer junto com o R-02 | C10 | R-02 | Jur |
| 32 | Fiscal | NF-e (MEI) | NF-e para o trânsito da mercadoria (PDF MN §3.5) | 🟨 campo existe (não publicado); emissão ⛔ | C11 | C11 | [MEI], Cont | Cont |
| 33 | Fiscal | teto do MEI | faturação anual | ❓ (R-07) | parecer | — | — | Cont |
| 34 | Lei 14.790/2023 art. 29 / Portaria SPA 1.207/2024 | invocada no Regulamento v4 Art. 38 | — | 🟨 invocação não verificada (caveat MC-PRE-99.5.4); os PDFs não a usam | retirar do v5 (X9) | C5 | — | Jur |
| 35 | Lei 5.768 / PDF VG §4.3 *(validador)* | limite de prémios da licença | R$ 10.000 em prémios por 12 meses (valor do PDF) | ⛔ não há controlo da soma dos bens por licença | somatório no edital + alerta admin | C5 | [SPA], R-20 | Cont + Nós |
| 36 | Legislação do IR *(validador)* | IR sobre prémios de promoção comercial | retenção/recolha pelo promotor | ❓ não mapeado (R-20) | parecer contábil | — | Cont | Cont |
| 37 | Lei 15.211/2025 — ECA Digital *(validador; não lido pelo executor)* | verificação de idade | a confirmar | ❓ gate por autodeclaração (`TermosConsentimento.jsx:199`) | parecer (R-21) | C7 | Jur | Jur |
| 38 | Marco Civil (Lei 12.965/2014) *(validador)* | art. 15 | guarda dos registos de acesso a aplicação: 6 meses | ❓ prazo das purgas não verificado (`purge-logs-scheduled.mjs`) | medir e ajustar se < 6 meses (P11) | C7 | — | Nós + Jur |
| 39 | CDC *(validador)* | arts. 31 e 37 | publicidade das promoções: clara, não enganosa | 🟨 copy v4 com «senha»/«torneio» | copy v6 revista contra os arts. 31/37 | C14 | C5 | Jur + Nós |
| 40 | Google Play *(validador)* | alternative / user choice billing | elegibilidade no Brasil | ❓ não verificado | confirmar se existe no Brasil (afecta o DEC-01) | C9 | DEC-01 | Nós |
| 41 | Google Play *(validador)* | Data Safety: analytics | declarar a recolha de `analytics.mjs` | ⛔ não constava da declaração de 15/08 | incluir | C9 | C7 | Nós |

## Teste bidireccional (2.6)

- **Cada norma tem acção:** as linhas n/a (#4, #8, #9) têm uma acção de «manter/não invocar», e isso também é acção.
- **Cada acção tem camada:** sim (coluna Camada). As linhas #28, #33 e #36 não têm camada: #28 já está cumprida, #33 e #36 são pareceres externos. #35–#41 foram acrescentadas após o SEG3.
- **Nenhuma acção exige recriar (P1):** C3 usa o `mp-client`, C7 estende as páginas existentes, C9 reescreve documentos (não código).

---

---

> ⛔ **ERRATA do UTAC106x.2 (2026-10-04):** a premissa «a Programada exige SPA/MF» e o «Vendedor = MEI» foram
> **REVERTIDOS pelo UTAC106x.1** — a Via B é **programa de fidelidade**, sem concurso e **sem SPA/MF**; o
> vendedor legal é a **Associação Recreativa dos Nordestinos no Amazonas** (CNPJ 23.040.066/0001-00). Ver
> `CLAUDE.md` (NORTE DO PRODUTO + bloco R14). As linhas **#1, #2, #10, #24 e #32** ficam **anotadas, NÃO
> apagadas** — o histórico é o registo do MC100; lê-las **à luz desta errata**.
