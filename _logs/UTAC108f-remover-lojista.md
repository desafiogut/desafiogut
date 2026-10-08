# UTAC108f — Remover o lojista do app (Claude Code, Opus 5.5)

## Baseline (SEG-1)
- HEAD = origin/main = **`c54ecff`** (o esperado).
- Suíte canónica: frontend **VERDE 909/909** · backend **VERDE 1095/1101**.
- Lidos: manifesto 108a (decisão estrutural), auditoria 108b §5 (os 23 sem chamador), log 108e.1 (órfãos `ModeSelector.jsx`, `SemEdicaoAviso.jsx`).

## SEG0 — Inventário (PARAGEM OBRIGATÓRIA)

| # | Elemento | Tipo | `ficheiro:linha` | Quem usa | Decisão proposta |
|---|---|---|---|---|---|
| 1 | `/corporativo` + 6 sub-rotas (cotas, banners, analytics, cupons, carteira, mercado) | rotas | `App.jsx:519-526` | só lojista | **remover** |
| 2 | `CorporativoRoute` (guarda) | guarda | `App.jsx:106-196` | rotas 1 **e `/seguranca`** (`App.jsx:488`) | remover (ver #12) |
| 3 | `CorporativoDashboard/Cotas/Banners/Analytics/Carteira/Cupons.jsx` | páginas | `pages/` (lazy em `App.jsx:74-79`) | só `App.jsx` (+ comentários) | **apagar** |
| 4 | `CotaInativa.jsx` | componente | `App.jsx` (gate de cota) | só lojista (navega p/ `/corporativo/*`) | apagar |
| 5 | `BannerUpload.jsx` → `BannerCard.jsx` | componentes | `CorporativoBanners`, comentário no `MercadoLances` | só lojista | apagar ambos |
| 6 | `CORP_TABS` + secundários corporativos | nav | `BottomNav.jsx:76-100` | `tipoUsuario==="corporativo"` | remover |
| 7 | `CORPORATIVO_ITEMS` | nav | `Sidebar.jsx:58-100` | idem | remover |
| 8 | Atalho «🤝 Seja Nosso Parceiro» | atalho | `Dashboard.jsx:64` | Início | remover |
| 9 | `/seja-nosso-parceiro` (`SejaNossoParceiro.jsx`) | rota pública | `App.jsx:514` | onboarding do lojista; ligada no Início, BottomNav «Mais», Sidebar | remover (página do lojista) |
| 10 | `DashboardOuCorporativo` + `lib/encaminhamento.js` (`DESTINO.CORPORATIVO`) | encaminhamento | `App.jsx:238-300` | manda o lojista para `/corporativo` | **ambíguo — Q2** |
| 11 | Isolamento `rotasProibidas` → `navigate("/corporativo")` | contexto | `AppContext.jsx:623-645` | só lojista | **ambíguo — Q2** |
| 12 | `/seguranca` (`Seguranca.jsx`) | página gated pela guarda corporativa | `App.jsx:488` | só lojista hoje | **ambíguo — Q3** |
| 13 | `pareceAutenticado` | estado do contexto | `App.jsx:121/148/250/295` | **também** `DashboardOuCorporativo` (comprador) | NÃO remover do contexto; sai só o uso na guarda |
| 14 | `acessoDiretoCadastro.js` | lib (devolve `false`) | `App.jsx:13/149` | só a guarda | apagar com a guarda |
| 15 | `tipoUsuario` / `tipoProvavel` / `cotaCorporativa` | contexto | `AppContext.jsx:562…655` | **também** `SemSaldoBanner` (108c, R18-B «nunca a corporativos»), BottomNav, Sidebar | **manter** o estado (108c depende) |
| 16 | `/cadastro`, `/login-email` | rotas | `App.jsx:452-453` | **comprador** (MC91.7) | **manter** (não são do lojista) |
| 17 | `lib/rotasTrabalho.js` (prefixo `/corporativo`) | lib | — | layout | tirar só o prefixo `/corporativo` |
| 18 | `ModeSelector.jsx`, `SemEdicaoAviso.jsx` | órfãos do 108e.1 | — | 0 imports | apagar |
| 19 | Os **23 «sem chamador»** do 108b | endpoints | `netlify/functions/` | ver tabela abaixo | **ambíguo — Q1** |
| 20 | Testes ligados ao lojista | testes | 14 ficheiros (`mc991-rotas`, `mc991-ui`, `utac105b-painel`, `utac106c-carteira`, `utac107g-navegacao`, `citacoesRegulamento`, `vocabularioUI`, `acessoDiretoCadastro`, `cotaAtiva`, `dicaLojista`, `dicaSessao`, `encaminhamento`, `mc99-limpeza-ui`, `utac108c-mlc-aviso`) | — | actualizar/remover conforme as decisões |

### Os 23 «sem chamador no frontend» — medidos um a um
`sched` = `export const config`/`schedule` no ficheiro · `outrasFn` = outras funções que o referem · `lojista` = menções a lojista/corporativo/cota.

| Endpoint | sched | testes | outrasFn | scripts | lojista | Leitura |
|---|---|---|---|---|---|---|
| webhook-mercadopago | 0 | 3 | 2 | 0 | 8 | **VIVO** — recebe o PIX do Mercado Pago |
| webhook-frenet | 0 | 1 | 0 | 1 | 1 | **VIVO** — rastreio Frenet |
| exportar-dados | 0 | 2 | 5 | 3 | 8 | **VIVO** — LGPD art. 18 |
| health | 0 | 1 | 5 | 3 | 0 | **VIVO** — operação |
| backup-blobs(+scheduled), purge-logs(+scheduled), fila-processor-scheduled, ia-preditiva-scheduled, monitor-onchain(+scheduled), scheduled-anuncio-especial, scheduled-encerrar-especial | ≥1 | — | ≥1 | — | 0 | **VIVOS** — cron |
| consolidar-lances | 1 | 8 | 6 | 0 | 0 | **VIVO** — apuração on-chain (admin/cron) |
| pontuacao | 0 | 11 | 8 | 2 | 0 | **VIVO** — torneio (recuperação manual) |
| renovacao-adesao | 0 | 1 | 5 | 0 | 0 | vivo (referido por 5 funções) |
| cron-reset-programado | 0 | 0 | 1 | 0 | 0 | referido por 1 função |
| mc302-aceitar / mc302-diagnostico | 0 | 0 | 1 | 2/0 | 0 | ferramentas MC30.2 |
| apurar-palpite | 0 | 0 | 0 | 0 | 0 | admin manual (bónus +2 do palpite) — **não morto** |
| debug-pedido | 0 | 1 | 0 | 0 | 0 | candidato real a morto (503 sem token) |
| info-pagamento | 0 | 0 | 0 | 0 | 0 | candidato real a morto |

⇒ **«Sem chamador no frontend» ≠ órfão.** 20 dos 23 estão vivos; **nenhum é do lojista**. Remover «os 23» desligaria pagamentos PIX, rastreio, LGPD, crons e apuração.

### ⚠️ Conflitos/ambiguidades escalados ao operador (GATE 12 / AU3)
- **Q1** — os 23 endpoints: o enunciado autoriza removê-los, a medição mostra que 20 estão vivos e nenhum é do lojista.
- **Q2** — conta de lojista que faz login depois da remoção (hoje é encaminhada/isolada para `/corporativo`).
- **Q3** — `/seguranca`, hoje só acessível ao lojista.

**Veredicto do SEG-1/SEG0: PARAR** até às respostas.

### Decisões do operador (R18, SEG0)
- **R18-A (Q1):** remover **nenhum** dos 23 endpoints (20 vivos, nenhum do lojista) → ficam para o 108h com medição própria. ⇒ backend **não é tocado**.
- **R18-B (Q2):** a conta de lojista passa a ver o **app do comprador**: sai o encaminhamento/isolamento para `/corporativo`; o tipo «corporativo» fica no contexto só para o 108c (R18-B do 108c).
- **R18-C (Q3):** `/seguranca` **apagada** com o lojista (cai no catch-all → Início).
- **R18-D (Vitrine):** autorizada a `Vitrine.jsx` neste UTAC para remover os 12 ramos só do lojista (cabeçalho «Painel do Parceiro» com link para `/corporativo/analytics`, banners corporativos, campos «Contrato»/«Mín. produto»); a vitrine fica igual para todos.

## SEG1-SEG3 — Rotas, componentes, navegação
- `App.jsx`: removidas as 7 rotas `/corporativo/*`, `/seguranca`, `/seja-nosso-parceiro`, a guarda `CorporativoRoute`
  (+ gate de cota `CotaInativa` + `?rc=1`); a raiz deixa de encaminhar o lojista (destino «corporativo» → Dashboard). Admin, `/redirect` e catch-all intactos.
- `AppContext.jsx`: removido o isolamento `rotasProibidas` → `/corporativo` (+ `navigate` morto). O tipo continua (108c).
- `BottomNav.jsx`/`Sidebar.jsx`: removidos `CORP_TABS`, `CORPORATIVO_ITEMS`, «Segurança», «Seja nosso parceiro»; todas as contas vêem o comprador.
- `Dashboard.jsx`: removido o atalho «🤝 Seja Nosso Parceiro». `Vitrine.jsx` (R18-D): removidos cabeçalho «Painel do Parceiro», banners corporativos, campos internos.
- **Apagados (15):** `CorporativoDashboard/Cotas/Banners/Analytics/Carteira/Cupons.jsx`, `SejaNossoParceiro.jsx`, `Seguranca.jsx`, `CotaInativa.jsx`, `BannerUpload.jsx`, `BannerCard.jsx`, `WalletCard.jsx` (ficou órfão), `acessoDiretoCadastro.js` (+teste), `ModeSelector.jsx`, `SemEdicaoAviso.jsx`.

## SEG4 — Órfãos: **nenhum removido** (R18-A). Backend intacto.

## SEG5/SEG6 — Limpeza + testes
Testes actualizados (contrato mudou, declarado): `mc991-ui`, `mc99-limpeza-ui`, `utac106c-carteira(+render)`, `utac106h-regras`, `utac107g-navegacao`, `Dashboard`, `cotaAtiva`, `vocabularioUI`, `citacoesRegulamento`; apagado `utac105b-painel`; novo `utac108f-sem-lojista` (5). **Mutação 8/8** (rota de volta, atalho de volta, CORP_TABS, isolamento, raiz → `DESTINO.CORPORATIVO`, raiz → `/corporativo`, `cotas.mjs` apagado, `admin/Cotas.jsx` apagado), restauro md5-idêntico.

## SEG7 — Verificação
Suíte **899/899 · 1095/1101 VERDE**; `vite build` OK; lint 0 erros. `/corporativo/*`, `/seguranca`, `/seja-nosso-parceiro` → catch-all provado com `matchRoutes` real (`utac107g`). Browser não aberto (declarado).

## SEG8 — Validador adversarial
Verbatim: `_logs/UTAC108f_SEG8_VALIDADOR.md`. **PARCIAL** — (a)-(m) **todos não refutados**; **F1** (o leitor de código do meu teste novo apagava 6664 caracteres do App.jsx por causa de um `/*` num comentário `//` que eu escrevi → mutantes M7/M7b sobreviviam) **corrigido** (ordem `//` antes de `/* */`, controlo positivo, guarda do encaminhamento; M7/M7b agora RED); **F2** (`navigate`/`useLocation` mortos) corrigido. Correcções não re-validadas em 2.ª ronda.
**Declarado para o 108g (F3 + meu):** restos textuais de `/corporativo`/lojista em `lib/encaminhamento.js` (`DESTINO.CORPORATIVO` ainda é devolvido, mas cai no Dashboard), `lib/rotasTrabalho.js`, `lib/dicaSessao.js`, `context/useAppContextEnvironment.jsx`, `widgets/layout/BackgroundCanvas.jsx:29-32`, badge «◈ Lojista» do `ChatbotWidget.jsx:207`, comentário `MercadoLances.jsx:372`; `corporativoWallet` (wallets[1]) continua no AppContext.

## SEG9 — Deploy + registo
Push `c54ecff..389a1d5` (`ed4bffe` feat + `389a1d5` fix). Entry `index-Dn0gx2pr.js` → **`index-BmsJdBht.js`**, site 200, crawl 124 chunks: 0 ocorrências de `CORP_TABS`, «Painel Lojista», `seja-nosso-parceiro`, `/corporativo/cotas`; chunk admin `Cotas-*.js` presente. `package-lock.json` limpo.

## Custo (¢/1M tokens; Opus 5.5: 400 in · 2000 out · 20 cache)
Validador 329 483 tokens = 6,6–659 ¢ (132 ¢ se tudo input). Sessão principal não medida (`/cost`). Duração ≈ 1 h 45 (dentro do HI5 de 3 h).
