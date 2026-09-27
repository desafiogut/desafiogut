# MC99 — RELATÓRIO DOS SEGMENTOS (SEG-1 a SEG5)

Consolidado num ficheiro (o MC pedia um por segmento; juntei-os porque partilham as mesmas
medições e a leitura corrida é mais útil). Base: `ce6fbd3` (pós-MC98, PT-BR only).

---

## SEG-1 — MEDIÇÃO (HARD GATE 1)

### Ficheiros localizados (todos medidos, nenhum suposto)

| alvo | ficheiro |
|---|---|
| Início / Outras Edições | `src/pages/Dashboard.jsx` (secção em ~L431) |
| Barra inferior | `src/widgets/layout/BottomNav.jsx` — **não** Sidebar; a ordem vive em `MAIN_TABS` |
| Carteira | `src/pages/MinhaCarteira.jsx` |
| Lances | `src/pages/MercadoLances.jsx` + `src/components/BannerCard.jsx` |
| Seja Nosso Parceiro | `src/pages/SejaNossoParceiro.jsx` |
| Vitrine | `src/pages/Vitrine.jsx` |
| Glass padrão | `src/globals.css:406` — `.gut-glass-standard`, `rgba(13,18,53,0.88)` (**HARD GATE 2 confirmado**) |

### Glasses da Carteira (8 blocos, ordem real)

| # | bloco | destino |
|---|---|---|
| 1 | `GlassCard as="header"` — "💰 Minha Carteira" + texto de apoio | **removido** (nome incorporado no #3) |
| 2 | prompt de login (só quando `!isConnected`) | **mantido** |
| 3 | "💰 Saldo Disponível" — com `background: linear-gradient(...)` + `borderColor` inline | **padronizado** → `gut-glass-standard` |
| 4 | `PainelIndicacao` ("🎁 Indique e Ganhe" — é GlassCard) | mantido; saiu o rótulo "MC10 · Growth" |
| 5 | "🔗 Saldo de Senhas" (gradiente próprio) | **removido** |
| 6 | "🏦 Dados para Pagamento (Art. 21)" | **removido** |
| 7 | "📋 Meus Lances (N)" | **removido** |
| 8 | "Carteira Conectada" (endereço completo) | **removido** |

### ⚠️ HARD GATE 4 — a informação não se perdeu (medido, um a um)

| informação | onde continua (medido) |
|---|---|
| saldo de senhas | `Sidebar.jsx:176` → `🔗 {saldoSenhas}` com status, **em todos os ecrãs**; + KPI "Senhas" do Dashboard |
| endereço da carteira | `Sidebar.jsx:161-163` (truncado) + `userLabel` em `:155`; endereço completo em Configurações |
| lances do utilizador | `MeusAtivos.jsx:62-69` — filtra por endereço **e** classifica (único/repetido/pontos), melhor que a lista crua removida |
| custo da senha (R$ 2,00) | botão "🎫 Trocar R$ 2,00 → 1 Senha" no próprio cartão; `Configuracoes.jsx` "Art. 20 — Senha: R$ 2,00 por edição" |
| dados bancários do Art. 21 | regulamento (gate de consentimento, Art. 21: chave PIX, agência, conta) |

**Nenhuma das 5 remoções deixou informação sem substituto.** Foi isto que permitiu remover
em vez de documentar como pendência.

### Veredito SEG-1: **SEGUIR**

---

## SEG0 — OUTRAS EDIÇÕES EM SCROLL LATERAL

`Dashboard.jsx`: `grid` (`isMobile ? "1fr" : repeat(auto-fit, minmax(240px,1fr))` — no
telemóvel empilhava numa coluna) → contentor `data-testid="outras-edicoes-scroll"` com
`display: flex`, `overflowX: "auto"`, `scrollSnapType: "x mandatory"`, e cada edição em
`flex: "0 0 100%"` + `scrollSnapAlign: "start"` (uma visível de cada vez, as outras por swipe).

Toda a informação de cada edição é preservada — mudou o eixo, não o conteúdo.
Guardado por 1 teste + `MUT1` (voltar ao grid → RED).

## SEG1 — BARRA INFERIOR

`MAIN_TABS` reordenado: Início · **Carteira** · **Lances** ("Mais" continua a ser o último,
um `<button>` fora do `map` das tabs). Razão: a Carteira é a porta do dinheiro do utilizador
comum (depositar PIX, trocar por senhas) e estava atrás dos Lances.
Guardado por 1 teste + `MUT2`.

## SEG2 — LIMPEZA DA CARTEIRA

5 blocos removidos (tabela do SEG-1), 1 padronizado, 1 nome incorporado.
`MinhaCarteira.jsx`: 479 → ~290 linhas. Ficaram **2** `<GlassCard>` (login + saldo).

Limpeza do código que ficou sem consumidor (senão o lint acusa, com razão): `DADOS_PAGAMENTO`,
`meusLances`, `botaoSecundario`, `saldoStatusSuffix`, `saldoPendente`, `saldoNumero`,
`valorFinanceiro`, e as chaves `lances`/`userLabel`/`saldoSenhas`/`saldoSenhasStatus`.

**Uma excepção deliberada:** `refetchSaldo` **ficou** no destructure. O card que o usava saiu,
mas ele também é chamado no `onSucesso` da compra de fichas → e o saldo de senhas continua a
ser mostrado no **Sidebar**. Removê-lo deixaria o rail com um número antigo. (Apanhado pelo
lint: `'refetchSaldo' is not defined` — o lint fez o trabalho dele.)

Guardado por 4 testes + `MUT3`/`MUT4`/`MUT5`.

## SEG3 — LANCES SEM BANNER + PARCEIRO COM VIDRO

**3.1** `MercadoLances.jsx`: removido o bloco do banner do cliente (REQ-01). Com ele saiu o
código que **só existia para o alimentar**: o estado `clienteAtivo`, o efeito, a função
`buscarClienteDoLeilaoAtivo`, a const `CATEGORIAS_POR_TIPO` e os imports `BannerCard` e
`apiGet`. (Um `grep` confirmou que `apiGet` não era usado em mais nada — sem essa verificação
o import ficaria órfão.)

**A funcionalidade não desapareceu:** o banner continua a ser gerido e visto pelo lojista em
`/corporativo` (`BannerUpload.jsx:155`) e o endpoint `banners` está intacto.

**3.2** `SejaNossoParceiro.jsx`: os heroes estavam **soltos sobre a ilustração de fundo** —
o mesmo defeito que o MC89.4 mediu no `/admin` ("havia frases que não se liam").
Ganharam `className="gut-glass-standard"`.

⚠️ **São DOIS heroes** (a página tem dois ramos de render). A minha 1.ª passagem glazou só um,
e **foi o meu próprio guarda que apanhou a correcção incompleta** — ele verificava apenas o
primeiro `<motion.header`. Reforçado para verificar **todos**, e o segundo hero corrigido.
*Um guarda que verifica "o primeiro" quando existem dois é meio guarda.*

Guardado por 2 testes + `MUT6`/`MUT7`.

## SEG4 — COERÊNCIA PARA O UTILIZADOR COMUM

**Alvo encontrado (Vitrine):** rodapé "Vitrine em modo informativo · **Pipeline de lance** em
`/mercado` (Edição R-1, **validada em produção**)." — vocabulário de equipa de desenvolvimento
(nome de rota interna, "pipeline", referência a edição de teste) à vista do utilizador comum.
Removido, com registo do porquê.

**O que foi analisado e NÃO executado (documentado como pendência, não removido):**
- `Info label="Cotas disponíveis"` / `Exclusividade` na Vitrine — para o comum, "cotas" é
  vocabulário do lojista. Mas o campo pode ser informativo; **ambíguo → não removido**.
- Os `Info` de contrato (`valorContrato`, `valorMinProduto`) já estão gated por
  `corporativo &&` — correcto, nada a fazer.

Guardado por 1 teste + `MUT8`.

## SEG2-mutação (R16 / HARD GATE 5)

`scripts/mc99-prova-mutacao.mjs` (movido de `_tmp` na limpeza). **8 mutações, 8 confirmadas
a ENTRAR, 8 mortas**, restauração por snapshot binário com md5 idêntico nos 7 ficheiros e
suíte de volta a VERDE. Saída bruta: `_logs/MC99_PROVA-MUTACAO.txt`.

⚠️ **Um defeito no meu próprio mutador, encontrado ao correr:** as mutações de várias linhas
não casavam porque li os `.jsx` (CRLF) sem normalizar. O script abortava com «a mutação não
alterou nada» — o que, lido à pressa, passaria por «a guarda não a apanhou». Corrigido:
normalizar para LF ao ler, repor CRLF ao escrever.

---

## Resultado

| | antes | depois |
|---|---|---|
| frontend | 396/396 VERDE | **407/407 VERDE** (+11 testes do MC99) |
| backend | 680/686 VERDE | **680/686 VERDE** |
| ESLint (ficheiros tocados) | — | **0 erros**, 9 warnings **pré-existentes** (confirmadas em `ce6fbd3`) |
| `MinhaCarteira.jsx` | 479 linhas | ~290 linhas |
