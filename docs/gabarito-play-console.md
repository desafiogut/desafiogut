# GABARITO — PLAY CONSOLE (e App Store) · DesafioGUT

> **Documento DERIVADO.** Criado pelo **UTAC106x.4** (P4) para cobrir uma lacuna: a secção
> **NORTE DO PRODUTO** (`CLAUDE.md` §7.1) e a ficha mandavam «alinhar com o **gabarito Play Console**» e
> **o ficheiro não existia**.
>
> **Fonte única:** `_logs/MC100_MATRIZ-CONFORMIDADE.md` (rows citadas por número), `docs/FICHA-PLAY-PT.md`
> e a NORTE DO PRODUTO. **Não introduz requisito novo, nem parecer, nem afirmação legal própria.** Onde a
> MATRIZ diz **❓** (não verificado), aqui fica **❓** — não se herda confiança que não foi medida.
> ⚠️ **Isto não é parecer jurídico** (a MATRIZ é explícita: *«Nada jurídico ou fiscal aqui é parecer»*).

---

## 1. Definição vigente do produto (Via B)

**E-commerce por dropshipping** com um **programa de fidelidade**:

| Modalidade | Mecânica | Paga com |
|---|---|---|
| **Oferta Relâmpago** | menor lance único — **jogo de habilidade** | saldo em R$ (PIX), lance ≥ R$ 0,01 |
| **Oferta Programada** | **fidelidade**: Passe → 1 ponto; **50 pontos = cartão colecionável físico**; o palpite é **bónus (+2 pontos)** e **não decide** o prémio | Passe Desafio (R$ 2,00) |

- **NÃO é** concurso de previsões, aposta ou sorteio (NORTE DO PRODUTO).
- **SPA/MF não se aplica** (não há concurso) — a premissa do achado **R-19** foi **REVERTIDA pelo
  UTAC106x.1** (ver `_logs/MC100_MATRIZ-CONFORMIDADE.md` row #24, anotada).
- **Vendedor legal:** Associação Recreativa dos Nordestinos no Amazonas — CNPJ **23.040.066/0001-00**
  (Grupo União e Trabalho). O «titular = Ruan / MEI» (DEC-09) foi **revertido** pelo UTAC106x.1.

---

## 2. Classificação na loja

| Campo | Valor |
|---|---|
| Categoria | **Programa de Fidelidade Gamificado** (*Gamified Loyalty Program*) — NORTE §7.1 |
| Classificação etária | **18+** (Público-alvo: Adultos) |
| Classificação IARC | ⚠️ **a refazer** — a ficha anterior declarava «AO», que **não é** classificação da Play/IARC (no Brasil é **ClassInd 18**, R-17) — MATRIZ row #26 |

---

## 3. Ficha da loja

Ver **`docs/FICHA-PLAY-PT.md`** — único idioma PT-BR (MC98).
As contagens são **medidas por código**: `node scripts/mc97-medir-ficha.mjs` (recusa aprovar se alguma
exceder o limite ou se a contagem declarada ≠ medida).
Estado medido: **título 29/30 · curta 74/80 · longa 1285/4000** (3/3 verde).

---

## 4. Declarações obrigatórias na Play Console

| # | Secção | Exigência | Estado medido (MATRIZ) |
|---|---|---|---|
| 1 | **Data Safety** | declarar dados financeiros, localização/morada e **partilha com terceiros** | 🟨 a declaração de 15/08 é **anterior** à morada/CPF e aos leads → **refazer** (row #25) |
| 2 | **Data Safety — analytics** | declarar a recolha de `analytics.mjs` | ⛔ **não constava** da declaração de 15/08 → incluir (row #41) |
| 3 | **Financial features** | declarar pagamentos | 🟨 a anterior declarou PIX + on-chain → **refazer** (row #27) |
| 4 | **Classificação de conteúdo (IARC)** | coerente com o conteúdo | ⚠️ refazer com o modelo Via B (row #26) |
| 5 | **Account deletion (URL)** | URL pública de exclusão | ✅ `/excluir-conta` (MC72) — manter (row #28) |
| 6 | **Política de privacidade (URL)** | URL pública | ⚠️ **em falta** — declarado na própria ficha (§ «Em falta para o MC101») |

---

## 5. Pagamentos (o ponto sensível — R-01)

| # | Norma | Exigência | Estado |
|---|---|---|---|
| 7 | Google Play **Payments** | **Billing** para bens digitais | ⛔ **conflito com o Passe «produto digital»** — R-01; **decisão pendente: DEC-01** (row #23) |
| 8 | Google Play **alternative / user choice billing** | elegibilidade no Brasil | ❓ **não verificado** — afecta o DEC-01 (row #40) |
| 9 | Política de Pagamentos (excepções) | bens **físicos**, *peer-to-peer*, **online auctions**, doações ficam fora do Billing | ✅ os prémios são **bens físicos** (NORTE); ⚠️ a classificação do **Passe** é que está em aberto |

⚠️ **A errata dos PDFs (item 2) continua válida:** um Passe «produto digital» vendido por PIX dentro do app
é um **risco de loja** — não um ✅.

---

## 6. Real-Money Gambling / Gamified Loyalty

| # | Regra | O que a Play exige | Estado |
|---|---|---|---|
| 10 | **Gamified Loyalty** | *«where permitted by law and **not subject to additional gambling or gaming licensing requirements**»*; benefício suplementar e subordinado; nº fixo de vencedores; prazo de entrada; data de entrega; **rácio fixo** | **Via B → requisito satisfeito**: não há concurso nem SPA/MF. A premissa contrária (**R-19**) foi **REVERTIDA pelo UTAC106x.1** (row #24) |
| 11 | **Real-Money Gambling** | licença quando aplicável | ❓ **Relâmpago** com lances pagos — **R-02: parecer jurídico obrigatório** (não é parecer meu) |

---

## 7. App Store (Apple) — para a fase iOS

| # | Diretriz | Exigência | Estado |
|---|---|---|---|
| 12 | **3.1.1** | IAP para conteúdo digital; vouchers digitais só por IAP | ⛔ conflito com o Passe — **R-01 / DEC-01** (row #29) |
| 13 | **3.1.3(e)** *(não «3.1.5(a)» — errata do PDF, R-17)* | bens físicos consumidos fora do app: meio de pagamento ≠ IAP | ✅ a lógica bate para os produtos físicos (row #30) |
| 14 | **5.3 / 5.3.3 / 5.3.4** | concursos: regras oficiais; **5.3.3** sem IAP para créditos de RMG; **5.3.4** RMG exige licença | ❓ **não avaliado** para a Relâmpago → junto ao R-02 (row #31) |

---

## 8. Checklist de submissão (o que falta ANTES de colar)

- [ ] Ficha colada na Play Console (**é o MC101**) — `docs/FICHA-PLAY-PT.md`, medidor `mc97` verde.
- [ ] **URL da política de privacidade** (em falta).
- [ ] **E-mail de contacto** (em falta na ficha).
- [ ] **Capturas de ecrã** em PT-BR (em falta).
- [ ] **Data Safety** refeito (morada/CPF, leads, analytics) — rows #25 e #41.
- [ ] **Financial features** refeito — row #27.
- [ ] **Questionário IARC** refeito, coerente com a Via B — row #26.
- [ ] **DEC-01** resolvido (como cobrar o Passe sem violar a Payments policy) — rows #23 e #40.
- [ ] **R-02** (parecer sobre a Relâmpago) — não é bloqueio da ficha, mas é dívida aberta.
- [ ] **AAB** e o restante do estado de publicação (a NORTE regista que o «feito» vive em grande parte
      **só no repo local**, não publicado).

---

## 9. Pendências e dependências (herdadas da MATRIZ — não resolvidas aqui)

| Ref | Assunto | Dono (MATRIZ) |
|---|---|---|
| **DEC-01** | faturação do Passe: PIX vs Play Billing / Apple IAP | Cli + Jur |
| **R-01** | Passe «produto digital» vs Billing → risco de loja | Cli + Jur |
| **R-02** | parecer sobre a Relâmpago (lances pagos) | Jur |
| **R-17** | classificação etária: «AO» não é IARC/Play (é ClassInd 18) | Nós |
| **DEC-04** | nº fixo de vencedores / desempate / que lances o palpite conta | Cli |
| **DEC-08** | base legal para os leads partilhados com o lojista | Jur |

---

**Origem:** UTAC106x.4 (pendência **P4** do relatório do UTAC106x.2) · **Cross-ref:** `CLAUDE.md` NORTE §7.1
e §11 · `_logs/MC100_MATRIZ-CONFORMIDADE.md` · `docs/FICHA-PLAY-PT.md`.
