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
