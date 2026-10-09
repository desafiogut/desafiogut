# UTAC109f — SEG-1 · MEDIÇÃO (nada alterado)

**Data:** 2026-10-09 · **Executor:** Claude Code (Opus 5.5) · Spec: `_logs/UTAC109f.spec.yml`

## -1.1 Estado do repo
| Item | Medido | Comando |
|---|---|---|
| HEAD = origin/main | **`731ec28`** (= o esperado) | `git rev-parse --short HEAD` / `origin/main` após `git fetch` |
| Árvore | sem código modificado; só `??` de logs antigos (MC100-102 etc., 30 ficheiros, alheios) | `git status --porcelain` |
| Suíte | frontend **VERDE 935/935** · backend **VERDE 1095/1101** (= o esperado) | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` (foreground, 3 min 44 s) |
| Disco | 8,1 GB livres (> 5 GB) | `df -h /c` |

## -1.2 As 4 skills de design
Não estão em `~/.claude/skills/`: vivem no **Hermes** (`~/AppData/Local/hermes/skills/`) — `mobile-ux-design/SKILL.md`,
`creative/claude-design/SKILL.md`, `creative/popular-web-designs/SKILL.md`, `creative/design-md/SKILL.md`. **Lidas e acessíveis**
(o mesmo desvio do 107a-front). Não é motivo de paragem.

## -1.3 Inventário do Início (`src/pages/Dashboard.jsx`, 579 linhas)
| Bloco | Onde | Estado hoje |
|---|---|---|
| 1 Carrossel | `:282` `<CarrosselGUTO size={116|176}>` dentro do vidro de saudação `:262-330` (+ logo `:285`, h1/p `:299-329`) | 8 vídeos (`CarrosselGUTO.jsx` `SLIDES`) |
| 2 4 glass pequenos | array `stats` `:237-242`, render `:333-344` (`StatTile`) | Saldo (R$) · Passe Desafio · Lances Únicos · Total de Lances — **já entre o carrossel e o 1.º cartão** ⇒ nada a mover |
| 3 Glass MLC | `:382-418` `CartaoEdicao` titulo «⚡ Relâmpago», edição R-1, botão «⚡ Dar lance» → `/mercado` (`:400-417`); **sem `acao`** | com `EM_BREVE_MODE` mostra R-1 «Em breve» + 🎁; **a aba MLC mostra o cartão VAZIO** (GUTO 7 + lance desligado, `MercadoLances.jsx:369-370`) ⇒ divergem |
| 4 Glass OP | `:424-475` `CartaoEdicao` titulo «🎫 Programada», `mensagemVazio="Nenhuma edição Programada em andamento"` `:432`, `ajudaVazio="Próxima edição —"` `:433`; **sem `acao`** | palpite em `children` (`:436-474`) |
| 5 Acessos rápidos | `ATALHOS` `:61-66` (Vitrine 4 Slots · Meus Ativos · Configurações), render `:478-509` (`GlassCard`, h3 «🚀 Acesso Rápido») | os 3 destinos também vivem no menu «Mais» (`BottomNav.jsx` `SECONDARY_LINKS :37-46`) |
| 6 Glass final | **não existe** (depois dos atalhos vêm o overlay `:512`, o painel DEV `:525` e o rodapé CNPJ `:564-576`) | — |

**Cores (hex):** h1 da saudação `COR.text` **#e8f0fe** (`:303`); subtítulo `COR.muted` **#6b7db8** (`:317`); título de vidro
`cardTitulo` **#f5a623** Orbitron (`:250-257`); título do cartão `CartaoEdicao.jsx:90-93` **#f5a623**.

## -1.4 As pendências do 109e — onde nascem
- **P1 «Em andamento — lance já!»** nasce em **`src/utils/edicao.js:54`** (`PERFIL_ESTADO.ATIVA.rotuloLongo`, fonte única MC88.43
  «se um ecrã precisar de uma variante nova, ela nasce aqui»). Chega ao cartão como `tempo` em `Dashboard.jsx:430` (Programada do
  Início) e `OfertasProgramadas.jsx:132` (aba OP), e também em `EdicaoCard.jsx:120`. Só aparece com a edição **ativa** (com
  `EM_BREVE_MODE` o `timer` é «EM BREVE»). O `CartaoEdicao` recebe `tempo` como texto ⇒ **não pode distinguir a origem**.
  Os outros consumidores de `rotuloLongo` (`CardLance.jsx:502`, `AuctionStatusBar.jsx:28`) usam-no fora do estado ATIVA.
  ⇒ correcção na FONTE: `getEstadoEdicao` escolhe o `rotuloLongo` pela família da edição (`tipo === "programado"` ⇒ palpite).
  Resolve Início + aba OP **sem tocar em `OfertasProgramadas.jsx`**.
- **P2 «Sem edições programadas no momento. Volte quando houver.»** existia em `OfertasProgramadas.jsx:321` (em `6c0436c`) e saiu
  no `dcf8460` (109e). Hoje **0 ocorrências**. A aba OP monta `<CartaoEdicao vazio acao="palpite">` **sem** `mensagemVazio`
  (`OfertasProgramadas.jsx:338`) ⇒ cai no texto genérico do cartão. ⇒ correcção na FONTE: o `CartaoEdicao` passa a ter o vazio
  POR ACÇÃO (`palpite` ⇒ a frase da OP). Resolve a aba OP **sem tocar em `OfertasProgramadas.jsx`**; o Início passa a usar
  `acao="palpite"` e deixa de forçar a frase própria.

## -1.5 Fontes para os blocos novos
- **Histórico público de vencedores:** **NÃO existe fonte.** `GET /edicoes` (público, medido em produção): 5 edições, 3 encerradas
  (`RELAMP-1/2/3`), **`vencedor`/`resultado` ausentes em todas**; `produtos.mjs:495-501` fechou o `registrar-vencedor`; o resultado
  oficial só existe on-chain por edição (`useResultadoOficial`, 1 id). ⇒ **placeholder + LACUNA** (o enunciado prevê). Copy do
  placeholder = o padrão já usado no app (`MeusAtivos.jsx:280,286`: «Esta área ainda não está disponível… quando o recurso for
  lançado.»), sem link «ver todos» (não há destino).
- **Suporte:** não há rota `/suporte`. O canal oficial é o e-mail `desafiogut01@gmail.com` (`Layout.jsx:36` «Suporte», decisão
  MC88.44 `EMAIL_SUPORTE`). O GUTO (`ChatbotWidget.jsx:252`) só abre pelo próprio botão (estado interno, sem abridor externo).
- **Perfil:** não há rota `/perfil` nem `/mais` («Mais» é um botão que abre a folha do `BottomNav`). O ecrã com os dados da conta é
  `/configuracoes` (`Configuracoes.jsx:20`: `address`, `userLabel`, sair, excluir conta).
- **Regras:** `/regras-oficiais` (`App.jsx:390`). **Carteira:** `/carteira` (`App.jsx:367`).

## -1.6 Testes que fixam o Início actual (vão mudar de contrato)
`src/pages/__tests__/Dashboard.test.mjs:468-506` (UTAC107g: exactamente Vitrine/Meus Ativos/Configurações) e `:561`
(«Nenhuma edição Programada em andamento»). Ficam declarados como contrato alterado.

## ⚠️ Conflitos / ambiguidades (AU3 / GATE 12) — levados ao operador
1. **Glass MLC com `EM_BREVE_MODE`:** o BLOCO 3 pede «GUTO animado 7 no estado vazio» e «a mesma arte do 109e», mas o Início
   mostra a R-1 «Em breve» (nunca vazio) enquanto a aba MLC mostra o cartão vazio. Alinhar = o Início perde o botão que leva a
   `/mercado` (a aba continua na barra).
2. **Perfil:** não existe ecrã «Perfil» — `/configuracoes` ou `/ativos`?
3. **Suporte:** e-mail oficial (padrão do rodapé) ou abrir o GUTO (exige tocar no `ChatbotWidget`, fora do escopo)?
4. **P3 (browser):** o gate LGPD bloqueia tudo; passar o gate num browser de teste LOCAL (vite :3000, perfil descartável) é aceitar
   as 4 declarações em nome de ninguém — precisa do aval do operador.
5. Declarados sem pergunta: «Carteira» já é aba e já tem o KPI Saldo (contraria o espírito do R18-A do 107g, mas o enunciado
   pede-o explicitamente); P1/P2 corrigidas na fonte partilhada (`utils/edicao.js`, `CartaoEdicao.jsx`), a aba OP não é tocada;
   o glass final é placeholder (LACUNA).

## -1.7 Veredicto
**AJUSTAR** — perguntar 1-4 ao operador antes do SEG0.
