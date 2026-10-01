# UTAC105c — UI do cliente: adaptar as telas do comprador (2026-10-01)

**Veredicto: FECHADO** · commits `08dc863` + fecho · validador **APROVADO COM RESSALVAS** (ressalva de teste corrigida).
Spec `_logs/UTAC105c.spec.yml` · medição `_logs/UTAC105c_SEG-1_MEDICAO.md` · validador `_logs/UTAC105c_SEG4_VALIDADOR.md`.

## Decisões do operador (R18 — registadas aqui, no CLAUDE.md e no Desktop)
| ID | Decisão |
|---|---|
| R18-A | «Não cria nada novo, adapta ao que já existe no app.» Sem páginas `/ofertas-*`, sem `MeusCupons/MeusLances/MeusPalpites.jsx` |
| R18-B | Frente A (ofertas) **não se toca**: a Programada ainda gasta senhas; falar do Passe ao lado do botão contradiz o botão; o Passe depende das DEC-01/02 |
| R18-C | Frente C (pedidos) **não se toca**: o prazo de 7 dias fica só na API (decisão do MC102) |
| R18-D | Frentes D/E: placeholders escritos dentro do `MeusAtivos.jsx`, sem ficheiro novo |
| R18-E | Frente B avança: o 🏆 «Menor e Único» era uma promessa falsa ao utilizador |

## O que mudou
- **Frente B (defeito).** `MeusAtivos.jsx`: o 🏆 ia para `!lance.repetido && i === 0` da lista exibida. Com sessão,
  essa lista são os lances da pessoa, **sem ordenar** ⇒ o 🏆 ia para o 1.º lance pela ordem de chegada. Quem não
  estava a ganhar lia «🏆 Menor e Único». Agora `MobileList`/`DesktopTable` recebem o `menorUnico` que a página já
  calculava (sobre todos os lances, ordenados) e `isVencedor = lance === menorUnico`. +8/−6.
- **Frentes D/E.** Secções «🎟️ Meus cupons» e «🎯 Meus palpites» (`data-estado="placeholder"`): «Esta área ainda não
  está disponível…», sem números, sem afirmar nada sobre a pessoa. Não há endpoint que dê ao comprador os cupons
  (`listarPassesDoComprador` não está exposto; `cupons.mjs` é do lojista) nem palpites (UTAC108). 5 chaves em `pt.js`;
  a guarda `ativos-i18n` passou a ler também o `MeusAtivos.jsx` (dicionário = fallback).
- Frentes A e C: zero alterações (R18-B/C).

## Provas
| gate | resultado |
|---|---|
| HI10 evidência antes | `_logs/UTAC105c_SEG0_ANTES.txt`: 6 falhas da Frente B (desktop e mobile) — R$ 5,00 com 🏆 quando R$ 1,00 de outro ganha; R$ 3,00 com 🏆 em vez de R$ 1,00 |
| testes | `src/pages/__tests__/utac105c-meus-ativos.test.mjs` — 12, página inteira em SSR, desktop + mobile |
| mutação | **13/13** com md5 restaurado (`scripts/utac105c-prova-mutacao.mjs`, `_logs/UTAC105c_PROVA-MUTACAO.txt`); M7/M8 mutam jsx **e** pt, para não ser a guarda i18n a morder |
| bidireccional | com o fix 12/12; sem o fix (baseline) 3/12 |
| suíte | frontend **547/547** (535 + 12) · backend **967/973** (árvore partilhada) — harness mc966, foreground |
| lint / build | 0 erros (1 aviso pré-existente `cardPad`) · `vite build` exit 0 (para o scratchpad, não o `dist/` do APK) |
| escopo | `MeusAtivos.jsx`, `pt.js`, `ativos-i18n.test.mjs` + ficheiros novos de teste/script/logs. `netlify/functions/**`, `_ponte-ssr.mjs`, `_render.mjs`, `App.jsx`: intocados |
| capturas | `_logs/UTAC105c_captura-ativos-{desktop,mobile}.png` (vite local) |

## Validador adversarial (SEG4) — APROVADO COM RESSALVAS
Confirmou a correcção em todos os casos que construiu (identidade de objecto válida dentro de um render; endereço com
caixa mista; `repetido` ausente; vista anónima sem regressão), o escopo, o PT-BR e a legitimidade do desvio do arnês.
Os 12 mutantes dele: 8 mortos, 1 equivalente (comparar por valor), **3 sobreviventes**.
- ⚠️ **Corrigido:** os testes só olhavam para o selo de texto; o 🏆 também é desenhado no avatar (mobile) e na coluna #
  (desktop). Reposto o defeito só aí, a suíte ficava verde. ⇒ asserção nova que conta os 🏆 da lista (2 na linha
  vencedora, 0 sem vencedor) + mutantes M11–M13, todos mortos.
- ⚠️ **Escalado, não corrigido (DEBT-007):** o `lances` do `AppContext` só tem os eventos `LanceDado` vistos em tempo real
  e os lances do próprio utilizador — não o histórico da edição. «Menor único da edição» é, na prática, «menor único que
  este browser viu». **Pré-existente** (afecta igual o «Menor Lance» e o Dashboard); corrigir é no contexto/backend.
- ℹ️ O script de mutação ignora testes `cancelled` (erro conservador). A mensagem do 1.º commit tem «ofertas» no título
  (texto obrigatório do enunciado); o corpo explica.

## Desvios declarados
1. O operador pediu o teste «com `_render.mjs`». Usei o arnês do `MeusAtivos.test.mjs` (Vite SSR + duplos do contexto):
   o `_render.mjs` não troca o `AppContext` e a lista é uma função local da página. O validador considerou-o legítimo.
2. Backend: **959/966** num worktree limpo vs **967/973** na árvore partilhada (0 falhas nas duas). Não investigado
   (fora do escopo) → **DEBT-006**.
3. Árvore partilhada: um mutante de validador por restaurar em `_render.mjs` à 1.ª leitura (restaurado por outra sessão
   minutos depois; não lhe toquei); e um commit alheio (`4dd0403`, só docs, já no remoto) entrou entre o SEG-1 e o meu commit.

## Não medido
O 🏆 com dados reais num ecrã (exige sessão Privy; localhost não é origem permitida).

## SEG5 — produção
Push `4dd0403..3a7a29c` (auto-deploy). BFS do bundle servido (131 chunks), marcadores `meus-cupons`, `meus-palpites`,
«Esta área ainda não está disponível»: **0/3 antes do deploy → 3/3 às 16:48Z** (controlo positivo: o mesmo instrumento
viu a ausência e depois a presença). `package-lock.json` alheio não foi commitado.

## Custo (GATE 16)
Não tenho acesso ao medidor de custo da sessão; o operador lê-o em `/cost`. Subagente validador: ~136 k tokens, 34 chamadas, ~8,6 min.
