# UTAC107g — Navegação: duplicações + senhas + caminhos mortos

**Tipo:** produto (frontend + testes) · **Executor:** Claude Code (Opus 5.5) · **Skill:** `desafio-gut/frontend/skills/utac/`
**Data:** 2026-10-06 · **Arranque:** 16:05 · **HI5:** 2 h

---

## Baseline (SEG-1)

| Item | Medido | Comando |
|---|---|---|
| `HEAD` | `b88ca5c9cd39df5966d108c040cc9bc70a4db34b` | `git rev-parse HEAD` |
| `origin/main` | `b88ca5c…` (= HEAD, 0/0) | `git fetch && git rev-parse origin/main` |
| Sujidade (tracked) | **0** (só `??` antigos de outras sessões) | `git status --short \| grep -v '^??'` |
| Suíte | **frontend VERDE 818/818 · backend VERDE 1095/1101** | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| Produção | site **200**, entry `assets/index-DG9jDuOP.js` | `curl` |
| Disco | 12 G livres | `df -h /c` |
| `EM_BREVE_MODE` | `true` (`src/lib/leilaoLock.js:10`) | `grep` |
| `.bak-*` (5, md5) | `capacitor.config.ts.bak-…182152` 16b8f60f · `App.jsx.bak-…145416` 0b455e9c · `PrivyRoot.jsx.bak-…200959` 245f901e · `PrivyRoot.jsx.bak-custom-scheme-…` f6b2c718 · `PrivyRoot.jsx.bak-oauth` feb4e75c | `md5sum` |
| Bytes de controlo do `CLAUDE.md` | 0x00 ×2 · 0x1F ×2 · 0x7F ×2 | python (bytes) |
| Fins de linha | `App.jsx`, `BottomNav.jsx`, `Sidebar.jsx`, `navModel.jsx`, `Dashboard.jsx`, `MinhaCarteira.jsx` = **CRLF**; `MeusAtivos.jsx` e os testes = **LF** | python (bytes) |

**Logs lidos:** `_logs/UTAC107a-back-mapeamento.md` (mapa + 25 órfãos), `UTAC107b-carteira.md`, `UTAC107c-inicio.md`,
`UTAC107d-mlc.md`, `UTAC107e-op.md`, `UTAC107e.2-privacidade.md`, `_logs/DEBT.md`; skill UTAC (`SKILL.md`, `comandos.md`,
`hard-gates.md`, `segments/*`, `types/produto.md`).

### Desvios medidos face ao enunciado

1. **Contagens do 107a-back estão desactualizadas** (o mapa é de `f498fde`; depois vieram 107b-e.2). Re-medido em `b88ca5c`
   com o mesmo extractor (`navigate(`, `<Link/NavLink to>`, `<Navigate to>`, `<a href>`, `path:`/`to:`/`href:`), **sem**
   `admin/` e sem testes: `/` **13** (+1 comentário) · `/mercado` **12** · `/carteira` **9** · `/corporativo` **9** (3 são
   comentários) · `/vitrine` **7** · `/privacidade` **6** · `/excluir-conta` **5** · `/ativos` **4**.
2. **Não existe `src/pages/Mais.jsx`.** O «Mais» é o *sheet* dentro do `BottomNav.jsx` (`SECONDARY_LINKS`, l.36-49) — e já
   tem «Meus Ativos» (`/ativos`). O equivalente autorizado é o próprio `BottomNav.jsx`.
3. **`MeusAtivos.jsx` já existe** (445 linhas) → não se cria página nova.
4. **As senhas Via A NÃO estão sem casa em todo o lado:** o rail desktop (`Sidebar.jsx:186-193`) mostra `🔗 N`, e o
   `CardLance` no modo Programado também. **No telemóvel** é que não há nenhum sítio fora do formulário de lance — o achado
   E-3 do 107a-front. A Frente B resolve o telemóvel sem tocar no desktop.
5. **As senhas são uma contagem, não uma lista** (`saldoSenhas` = número; `AppContext.jsx:333`, via `GET /saldo-senhas`
   com fallback on-chain). «Lista de senhas» do enunciado → contagem.
6. **`/redirect` não é morta:** é o `customOAuthRedirectUrl` do Privy (`PrivyRoot.jsx:217`), interceptado no Android
   (`AndroidManifest.xml:42`, App Link) e tem rota desde o MC94.3.2 (`lib/retornoOAuth.js:21`).
7. **`/corp` só teve um produtor**, `SejaNossoParceiro.jsx` (commit `5e86ba6`, maio), que o MC99.1 substituiu por
   `irParaPainel()` → `/corporativo`. Zero referências hoje em `src/`, `netlify/functions/` (e-mails incluídos) e no
   histórico depois disso. Também ninguém produz `?rc=1`. Além de morta, a rota era **sem guarda** para o
   `CorporativoDashboard` (nota do `docs/MC88.41-FLUXOS.txt:120`).

### Conflitos e ambiguidades — escalados ao operador (AU3 / GATE 12)

| # | Pergunta | Decisão do operador (R18, 2026-10-06) |
|---|---|---|
| R18-A | Que atalhos do «🚀 Acesso Rápido» do Início saem? | **Tirar 3:** «Depositar PIX», «Converter Ficha», «Dar Lance» (o destino já é uma aba da barra; «Converter Ficha» promete uma troca que o 107b removeu). Ficam Vitrine, Meus Ativos, Parceiro, Configurações (no telemóvel só existem no «Mais»). |
| R18-B | O que vê quem abre um URL removido? (hoje: rota desconhecida = ecrã em branco) | **Catch-all `*` → Início** (`<Navigate to="/" replace/>` dentro do AppLayout). |
| R18-C | Apagar `pages/EdicaoDetalhe.jsx` (fica sem importador; fora da lista AUTORIZA)? | **Apagar** (`git rm`) — extensão de escopo declarada. |
| R18-D | A secção de senhas em Meus Ativos leva link «usar» para `/mercado`? | **Só texto** (contagem + onde se usam). Não promove a Via A e não cria mais um caminho para `/mercado`. |

**Veredito do SEG-1: AJUSTAR** → respondido pelo operador → **SEGUIR**.

---

## SEG0 — Duplicações medidas (Frente A)

Classificação: **L** = legítimo (contexto diferente) · **T** = técnico (redirect/guarda, não é botão) · **R** = redundante
(mesmo contexto — o destino já está à vista no mesmo ecrã ou a 1 toque fixo).

### `/` — 13 origens
| Origem | Texto | Classe |
|---|---|---|
| `BottomNav.jsx:32` · `Sidebar.jsx:37` | «Início» | L (navegação principal mobile/desktop) |
| `App.jsx:147,168,170` | `<Navigate>` da `CorporativoRoute` | T |
| `Cadastro.jsx:54` · `LoginEmail.jsx:47` · `Configuracoes.jsx:208` | redirect pós-login / pós-exclusão | T |
| `App.jsx:360` | «Ir para o DesafioGUT →» (`<a>` do retorno OAuth; tem de ser `<a>`, MC99.1 #5) | L |
| `ExcluirConta.jsx:136` · `Privacidade.jsx:314` | «← Voltar ao app» (páginas **fora** do AppLayout: única saída) | L |
| `RegrasOficiais.jsx:318` | «← Voltar ao app» (dentro do AppLayout) | L fraco — fora do AUTORIZA, registado |
| `EdicaoDetalhe.jsx:38` | «← Voltar» | sai com a página (Frente C) |

### `/mercado` — 12 origens
| Origem | Texto | Classe |
|---|---|---|
| `BottomNav.jsx:31` · `Sidebar.jsx:36` | «Menor Lance Único» | L |
| `App.jsx:470` | alias `/menor-lance-unico` | T |
| `Dashboard.jsx:454` | CTA da Edição Ativa | L (contextual: a edição que se está a ver) |
| `Dashboard.jsx:227` | KPI «Lances Únicos» | L (decisão R18-A do 107c: os KPIs ficam) |
| **`Dashboard.jsx:57`** | **atalho «🎯 Dar Lance»** | **R** — o CTA da Edição Ativa (mesmo ecrã) e a aba fixa fazem o mesmo |
| `MinhaCarteira.jsx:94` | «⚡ Menor Lance Único» (decisão 2 do 107b) | L |
| `EdicaoCard.jsx:124` · `Vitrine.jsx:445` | cartões de edição / vitrine | L (fora do AUTORIZA) |
| `EdicaoDetalhe.jsx:70,142` | — | saem com a página |

### `/carteira` — 9 origens (7 botões)
| Origem | Texto | Classe |
|---|---|---|
| `BottomNav.jsx:30` · `Sidebar.jsx:35` | «Carteira» | L |
| `Dashboard.jsx:225` | KPI «Saldo (R$)» | L (107c) |
| **`Dashboard.jsx:55`** | **atalho «💰 Depositar PIX»** | **R** — o KPI «Saldo» do mesmo ecrã e a aba fixa vão ao mesmo sítio; não abre o depósito, abre a Carteira |
| **`Dashboard.jsx:56`** | **atalho «🎫 Converter Ficha»** | **R + falso** — a troca R$→senha saiu da Carteira no 107b; o atalho leva a um ecrã onde a acção não existe |
| `OfertasProgramadas.jsx:313` | estado vazio → Carteira | L (fora do AUTORIZA) |
| `App.jsx:401` | fallback do deep link | T |

### `/vitrine` — 7 origens
`BottomNav` «Mais» · `Sidebar` · `Dashboard.jsx:58` atalho (L — no telemóvel a Vitrine só está no «Mais») ·
`DetalheProduto.jsx:118,136` e `Vitrine.jsx:371` «← Vitrine» (L, migalhas) · `Vitrine.jsx:562` (T).

### `/ativos` — 4 origens
`BottomNav` «Mais» · `Sidebar` · `Dashboard.jsx:59` atalho «Meus Ativos» (L — 1 toque em vez de 2) · `Dashboard.jsx:228`
KPI «Total de Lances» (L, 107c).

### `/privacidade` — 6 · `/excluir-conta` — 5 · `/corporativo` — 9
Todas **legítimas**: links legais em contextos diferentes (gate LGPD, rodapé, Regras, Privacidade, Exclusão — exigência
Google Play User Data) e redirects por perfil (`App.jsx:297`, `AppContext.jsx:643`, `CorporativoDashboard.jsx:34`).
Duas redundâncias menores **fora do AUTORIZA**, registadas e não tocadas: `Seguranca.jsx:27-28` («Política de Cookies»
aponta à mesma `/privacidade`) e `Privacidade.jsx:213`+`:309` (dois links para `/excluir-conta` na mesma página).

### Proposta (aprovada como R18-A)
Remover **3** atalhos do `Dashboard.jsx` (`ATALHOS`): «Depositar PIX», «Converter Ficha», «Dar Lance». Regra aplicada:
*um atalho é redundante se o seu destino já é uma aba da barra principal (1 toque fixo) **e** já há no mesmo ecrã um
elemento que leva lá.* Nenhum destino perde o último caminho (ver SEG1).

---

## SEG1 — Redução (Frente A)

**Alterado:** `src/pages/Dashboard.jsx` — **só** o array `ATALHOS` (botões de navegação, declarado): 7 → **4** entradas.

| Saiu | Destino | Porque | O destino continua alcançável por |
|---|---|---|---|
| 💰 Depositar PIX | `/carteira` | não abre o depósito, só a Carteira | aba «Carteira» (barra + rail) · KPI «Saldo (R$)» no mesmo ecrã |
| 🎫 Converter Ficha | `/carteira` | a troca R$→senha saiu da Carteira no 107b (promessa falsa) | idem |
| 🎯 Dar Lance | `/mercado` | duplica o CTA da Edição Ativa do mesmo ecrã | aba «Menor Lance Único» · CTA da Edição Ativa · KPI «Lances Únicos» |

**Ficam:** Vitrine 4 Slots · Meus Ativos · Seja Nosso Parceiro · Configurações — no telemóvel estes só existem no «Mais»
(2 toques); o atalho poupa um. **Nenhum destino perdeu o último caminho** (teste `utac107g-navegacao` «nenhum destino ficou
sem caminho»). **Cada botão → destino único:** `ATALHOS` sem destinos repetidos; `MAIN_TABS`+`SECONDARY_LINKS` (BottomNav)
e `NAV_ITEMS` (Sidebar) sem caminhos repetidos e com o **mesmo** conjunto de destinos (testado).

**Não alterados (fora do AUTORIZA, registados):** `Seguranca.jsx:27-28` (Cookies → `/privacidade`), `Privacidade.jsx:213/309`
(2× `/excluir-conta`), `RegrasOficiais.jsx:318` («← Voltar ao app» dentro do AppLayout), `EdicaoCard.jsx:8` (comentário diz
`/edicao/:id`, o código vai para `/mercado` — agora o comentário aponta a uma rota que já não existe).

---

## SEG2 — Senhas (Frente B)

- **`src/pages/MeusAtivos.jsx`** (já existia; **não** se criou página): nova secção `data-secao="senhas-antigas"` com
  `estadoSenhasAntigas()` (função pura exportada) — 5 estados `sem-sessao | carregando | erro | vazio | dados`, **sem
  coerção** (só `Number.isSafeInteger ≥ 0` é contagem). Texto: «Tens N senhas antigas. São usadas no Lance Programado do Menor
  Lance Único.» / «Não tens senhas antigas.» **Sem botão** (R18-D). Cor da contagem: roxo `#a78bfa` (`COR.senhas`, cor
  semântica de senhas em todo o app).
- **`src/pages/MinhaCarteira.jsx`** (só o indicador, declarado): `<button>` **dentro do vidro do saldo**, depois da nota do PIX,
  **cor muted `#6b7db8`, sem fundo**, alvo de toque 44 px: «Tens N senhas antigas → ver em Meus Ativos» → `navigate("/ativos")`.
  Só aparece com contagem **conhecida e > 0** e status ≠ `error` (0, `null`, 2.5, «7», erro → nada).
- «Mais» → «Meus Ativos» já existia (`BottomNav.SECONDARY_LINKS`, `Sidebar.NAV_ITEMS`) — não se tocou nos menus.
- ⚠️ **Dialecto:** as duas frases ditadas pelo enunciado («Tens…», «Não tens…») ficaram **literais** (pt-PT, como o
  «Vais comprar» do 107e); a copy que eu acrescentei é pt-BR neutra («Verificando as senhas…», «Entre na sua conta…»).

---

## SEG3 — Caminhos mortos (Frente C)

| Caminho | Medido | Decisão | Aplicado |
|---|---|---|---|
| `/edicao/:id` | 0 links em `src/` (o banner é modal desde o MC45, `EdicaoBanner.jsx:6-7`) | **Remover** | rota + import lazy saíram de `App.jsx`; **`pages/EdicaoDetalhe.jsx` apagado** (`git rm`, R18-C — extensão de escopo declarada) |
| `/corp` | 0 refs em `src/`, `netlify/functions/`, e-mails; único produtor (`5e86ba6`) substituído no MC99.1 | **Remover** | rota saiu de `App.jsx` (era também um `CorporativoDashboard` **sem guarda**) |
| `/redirect` | `customOAuthRedirectUrl` do Privy + App Link Android | **Documentar** (técnica) | rota mantida; comentário UTAC107g no `App.jsx` |
| URL desconhecida | ecrã em branco (nenhuma rota casa) | **Catch-all → Início** (R18-B) | `<Route path="*" element={<Navigate to="/" replace />} />`, último filho do AppLayout |

**Prova de comportamento** (`src/__tests__/utac107g-navegacao.test.mjs`): a árvore de `<Route>` do `App.jsx` é passada ao
`matchRoutes` **real** do react-router-dom → `/edicao/R-1`, `/corp`, `/nao-existe-xyz` resolvem para `*`; `/redirect`,
`/carteira`, `/corporativo/cotas`, `/admin/usuarios/:endereco`, `/produto/:id` continuam na rota própria (controlo positivo).
⚠️ No sentido literal «devolvem 404»: a Netlify serve `index.html` com **200** a qualquer caminho (`netlify.toml` SPA rewrite) —
o «404» é ao nível do router (nenhuma rota própria), e o que o utilizador vê é o Início.

Teste afectado: `src/__tests__/mc991-rotas.test.mjs` — `ORFAS_CONHECIDAS` fica **vazio** (a única excepção era `/edicao/:id`),
`corp` saiu de `POR_PROVIDER`, o catch-all `/*` justificado à parte.

---

## SEG4 — Endpoints órfãos (Frente D — só medir, NADA removido)

Re-medido em `b88ca5c` (84 funções; eram 83 — entrou `ler-palpites` no 107e.2): **os 25 continuam órfãos de frontend** (0
sítios de chamada em `src/`, literal de invocação, comentários excluídos). Controlo positivo do mesmo grep: `ler-pontos` → 5,
`saldo-rs` → 7. Auth medida no próprio ficheiro.

| # | Endpoint | Auth (medida) | Razão provável do órfão | Pendência |
|---|---|---|---|---|
| 1 | `apurar-palpite` | admin (`autenticarAdmin`) | operação de back-office (UTAC106f) | 🔐 **admin sem UI** — só por chamada directa |
| 2 | `backup-blobs` | admin (`guardAdmin`) | manual de infra | — |
| 3 | `backup-blobs-scheduled` | agendador | cron | — |
| 4 | `comprar-passe` | user-session | **Via A** substituída por `comprar-passe-pontos` (Via B) | candidato a desligar |
| 5 | `consolidar-lances` | admin | manual (admin); o cron `scheduled-encerrar-especial` usa o núcleo `_lib/consolidacao.mjs`, não o endpoint (MC94.3) | — |
| 6 | `cron-reset-programado` | admin | cron/manual | — |
| 7 | `debug-pedido` | token `x-debug-token` (`timingSafeEqual`) | diagnóstico | 🔐 **debug em produção** — avaliar desligar |
| 8 | `exportar-dados` | user-session | **LGPD art. 18 sem botão no app** (só via API) | ⚠️ falta UI ao titular |
| 9 | `fila-processor-scheduled` | agendador | cron | — |
| 10 | `health` | admin | sonda de infra | — |
| 11 | `ia-preditiva-scheduled` | agendador | cron | — |
| 12 | `info-pagamento` | **público** (só chaves PIX, «divulgáveis por natureza») | UI antiga de PIX manual | candidato a desligar |
| 13 | `mc302-aceitar` | público → responde **410 Gone** fixo | desactivado no MC87 | — (já morto por desenho) |
| 14 | `mc302-diagnostico` | público → **410 Gone** fixo | desactivado no MC87 | — |
| 15 | `monitor-onchain` | admin | manual de infra | — |
| 16 | `monitor-onchain-scheduled` | agendador | cron | — |
| 17 | `pontuacao` | admin | torneio MC93 (recuperação manual) | — |
| 18 | `purge-logs` | admin + `ADMIN_TOKEN` | manual de infra | — |
| 19 | `purge-logs-scheduled` | agendador | cron | — |
| 20 | `renovacao-adesao` | admin / user-session | Via A / cotas antigas | candidato a desligar |
| 21 | `scheduled-anuncio-especial` | agendador | cron (MC94.5) | — |
| 22 | `scheduled-encerrar-especial` | agendador | cron (MC94.3) | — |
| 23 | `voucher` | user-session + lance-auth + admin + MFA | **Via A** (só prosa a cita) | candidato a desligar |
| 24 | `webhook-frenet` | segredo `x-frenet-token` (fail-closed sem env) | terceiro (Frenet) | — |
| 25 | `webhook-mercadopago` | HMAC `x-signature` (`MP_WEBHOOK_SECRET`) | terceiro (MP) — **nunca disparou** (MC101) | — |

**Destaque de segurança:** nenhum dos 25 é um endpoint de auth/admin **aberto**. Os que exigem atenção são o `debug-pedido`
(diagnóstico em produção, protegido por token), os 2 `mc302-*` (já 410) e o `exportar-dados` (direito LGPD sem botão).
**Nada removido** (NÃO AUTORIZA) — registado como pendência para UTAC futuro.
