# Manifesto de Aprovações do Operador — Série 107

> **UTAC108a.** Documento único de referência: **o que o operador APROVOU** na série 107,
> **o que está IMPLEMENTADO** hoje, **onde** está (ficheiro:linha) e **onde divergem**.
> É READ-ONLY: este UTAC não altera código, não corrige discrepâncias, não faz deploy.
> Base para a **auditoria (108b)** e para as **correcções cirúrgicas (108c+)**.

| Campo | Valor |
|---|---|
| Data | 2026-10-06 |
| Versão | 1.0 |
| Objectivo | Manifesto de aprovações da série 107 (11 UTACs) — aprovado vs implementado vs discrepante |
| Fonte primária | Lista `INPUT` do UTAC108a (extraída das conversas do chat) — é o ponto de partida, **verificada item a item no código** |
| Fonte secundária | `_logs/UTAC107*.md` (**13 logs** + 11 veredictos de validador) · `docs/mockups-107a/*` · bloco **R14** do `CLAUDE.md` · `_logs/DEBT.md` |
| Baseline do repo | `HEAD` = `origin/main` = **`86ffe2c`** (`docs(UTAC107g.4): numeros FINAIS medidos`) |
| Suíte canónica (medida neste UTAC) | **frontend VERDE 849/849 · backend VERDE 1095/1101** → `VEREDITO: VERDE` |
| Âmbito | 51 itens aprovados (série 107) + 1 decisão estrutural nova + 5 pendências declaradas |
| O que NÃO é | Não é a auditoria de produção (108b), nem a correcção (108c+), nem a remoção do lojista (108f) |

**Regras de honestidade aplicadas:** nada é marcado «implementado» sem verificação directa no código
com `ficheiro:linha`; nenhuma discrepância é escondida; o que não está no log é registado como
«não registado no log»; o que foi feito e **não** estava na lista de aprovações é registado como
«extra» (§15).

---

## 0. Baseline (SEG-1)

| Item | Medido | Comando |
|---|---|---|
| `HEAD` / `origin/main` | `86ffe2c` / `86ffe2c` (iguais) | `git log --oneline -1`, `git log origin/main --oneline -1` |
| Suíte canónica | frontend **VERDE 849/849** · backend **VERDE 1095/1101** | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| Sujidade (tracked) | **0 ficheiros** | `git diff --name-only` → vazio |
| `.bak-*` versionados | **5** (capacitor.config.ts, App.jsx, PrivyRoot.jsx ×3) | `git ls-files \| grep '.bak-'` |
| `CLAUDE.md` — bytes de controlo | **2×`0x00` · 2×`0x1F` · 2×`0x7F`** (tamanho 412 563 B) | `python` (bytes) |
| `EM_BREVE_MODE` | `true` (`src/lib/leilaoLock.js:10`) | `grep` |
| Logs da série 107 lidos | **13 logs** (`UTAC107a-back-mapeamento.md` … `UTAC107g.4-porta-rc1.md` **+ `UTAC107e.2_SEG-1_MEDICAO.md`**) + 11 `_SEG*_VALIDADOR.md` | `ls _logs/UTAC107*` |
| Mockups lidos | `docs/mockups-107a/` — `index.html`, `carteira.html`, `inicio.html`, `menor-lance-unico.html`, `ofertas-programadas.html` (+ `tokens.css`, `DESIGN.md`, `regra-1-glass.html`, `tabela-especial.html`, `tokens.html`) | `ls` |

> **Nota de medição (A4/lição da série):** o `mc966-suite-harness.mjs` **não corre em background**
> (exige TTY — devolve `stdin is not a tty` com exit 0 e **não mede nada**). Foi corrido em
> **foreground**. Declarado porque um «exit 0 sem números» é precisamente o falso-verde que a série
> já apanhou (UTAC107g.4, I-5).

**O `HEAD` confere com o declarado no enunciado (`86ffe2c` ou posterior) ⇒ ambiente não alterado.**

---

## 1. Sumário

| Métrica | Nº |
|---|---|
| Itens aprovados na série 107 (lista INPUT) | **51** |
| ✅ Implementados e verificados no código | **49** |
| ⚠️ Implementados **com resíduo/observação** | **2** (`107b#2`, `107g.3#2`) |
| ❌ Aprovados e **NÃO** implementados | **0** |
| Decisão estrutural nova (remover lojista) | **1 — ❌ NÃO implementada** (por desenho; é o 108f) |
| Pendências declaradas | **5** |
| Discrepâncias a levar à auditoria (108b) | **5** (§16) |

**Leitura curta:** a série 107 foi **implementada quase na totalidade**. Não há nenhum item
aprovado que tenha sido simplesmente ignorado. As duas observações (`107b#2`, `107g.3#2`) não são
incumprimentos: uma é um **resíduo de gate pré-existente** que explica a queixa do operador; a outra
é um item **superado por decisão posterior do próprio operador**.

---

## 2. Como ler cada secção

Cada UTAC tem: **Aprovado** (lista INPUT verbatim) · **Fonte** (conversa + mockup) · **Estado actual** ·
**Ficheiro:linha** · **Discrepância**. Legenda: ✅ implementado · ⚠️ implementado com resíduo · ❌ em falta.

---

## 3. UTAC107b — Carteira

**Fonte:** conversa do operador (2026-10-06) + mockup `docs/mockups-107a/carteira.html`
(variante **A · Fiel ao actual ★**, R18-D) · log `_logs/UTAC107b-carteira.md` · veredicto
`_logs/UTAC107b_SEG8_VALIDADOR.md` (**APROVADO**, 0 bloqueantes, 2 notas ℹ️).

| # | Aprovado | Estado | Ficheiro:linha (verificação) | Discrepância |
|---|---|---|---|---|
| 1 | Remover botão «Trocar R$ 2,00 → 1 Senha» | ✅ **implementado** | `src/pages/MinhaCarteira.jsx:209-274` (grelha sem o botão). `grep -rn 'Trocar R\$' src/` → só comentários e testes; **0 no código** | Nenhuma. Os órfãos (`useTrocarPorSenhas`, `CreditoStatus`, `creditoTxHash`, `trocaInfo`, `trocaErro`) foram removidos também |
| 2 | Adicionar botão «Menor Lance Único» → `/mercado` | ⚠️ **implementado com resíduo** | Handler `MinhaCarteira.jsx:101-103` → `navigate("/mercado")`; botão `:242-259` | **⚠️ DISCREPÂNCIA D-1** (ver §16): o botão tem `disabled={!saldoReais}` (`:245`) — com saldo 0/`null` **não navega**. Além disso o botão **já existia** desde o UTAC106c (o «adicionar» foi cumprido por manutenção, não por criação) |
| 3 | Adicionar botão «Ofertas Programadas» → `/ofertas-programadas` | ✅ **implementado** | Handler `MinhaCarteira.jsx:106-108`; botão `:260-274` | Nenhuma |
| 4 | Ordem: Depositar PIX → Comprar Passe → MLC → OP | ✅ **implementado** | `MinhaCarteira.jsx:214` (PIX) → `:228` (Passe) → `:242` (MLC) → `:260` (OP); comentário `:205-208` | Nenhuma |
| 5 | Contraste do botão «Comprar Passe» ≥ 4,5:1 | ✅ **implementado** | `MinhaCarteira.jsx:233-237` (`background: COR.gold` sólido + `color: ON_GOLD`); `ON_GOLD = "#0a0f1a"` em `:28`; teste `src/__tests__/utac106c-carteira.test.mjs:128-146` calcula o rácio WCAG (**9,45**) e exige ≥ 4,5 | Nenhuma. (Era 2,03:1 com texto branco) |
| 6 | Regra 1 (glass em tudo) na Carteira | ✅ **implementado** | Aviso 402 dentro do vidro: `MinhaCarteira.jsx:279-296` (`<div role="status">` dentro do `GlassCard`); «Indique e Ganhe» em `PainelIndicacao.jsx` | Nenhuma. Excepções declaradas: botões, modais, BottomNav, rodapé legal |
| 7 | Email PIX: verificar antes de remover | ✅ **verificado e mantido** | `MinhaCarteira.jsx:312` (`desafiogut@gmail.com`); decisão registada em `:40`, `:304` | Nenhuma. O SEG0 do 107b mediu que o modal de depósito **não** mostra o destinatário → o e-mail **não podia** sair (é o único sítio do frontend) |

---

## 4. UTAC107c — Início

**Fonte:** conversa (R18-A..D, que **revogaram** duas decisões do enunciado) + mockup
`docs/mockups-107a/inicio.html` (variante **A · Fiel ao actual ★**, R18-F) · log
`_logs/UTAC107c-inicio.md` · veredicto `_logs/UTAC107c_SEG7_VALIDADOR.md` (**APROVADO COM RESSALVAS**).

| # | Aprovado | Estado | Ficheiro:linha (verificação) | Discrepância |
|---|---|---|---|---|
| 1 | Card «Senhas» → «Passe Desafio 12/50» (`pontosCartao`) | ✅ **implementado** | `src/pages/Dashboard.jsx:201-224` (rótulo «Passe Desafio», valor `` `${pontosCartao} / ${metaCartao}` ``); dados via `usePontos` → `GET /ler-pontos` (`:117-120`) | Nenhuma |
| 2 | Destino: Ofertas Programadas (não Carteira) | ✅ **implementado** | `Dashboard.jsx:223` (`to: "/ofertas-programadas"`) | Nenhuma (antes ia para `/carteira`) |
| 3 | **Manter** os KPIs «Lances Únicos» + «Total de Lances» | ✅ **implementado** | `Dashboard.jsx:229-230` | Nenhuma. Nota: o **enunciado** mandava remover; a decisão do operador (R18-A) **revogou-o** e manda manter |
| 4 | Remover card «🏆 Menor Lance Único» | ✅ **implementado** | Array `stats` de `Dashboard.jsx:226-231` tem **4 tiles** (Saldo, Passe Desafio, Lances Únicos, Total de Lances) — **sem** nenhum card de troféu; o 🏆 só sobrevive em **comentários** (`:136`, `:335`, ambos a descrever a remoção). **Contagem feita por `python`, não por `grep`** — ver §18.6 | Nenhuma. O vencedor continua no `FimEdicaoOverlay` |
| 5 | Regra 1 (glass em tudo) no Início | ✅ **implementado** | `Dashboard.jsx:487` («🗓️ Outras Edições» agora dentro de `GlassCard`) | Nenhuma |
| 6 | Corrigir texto obsoleto `ComprarFichasModal:547` | ✅ **implementado** | `src/components/ComprarFichasModal.jsx:547` → «Para o Lance Programado, o app converte R$ 2,00 em 1 senha automaticamente.»; comentário `:490` também actualizado (R18-D) | Nenhuma. Resolvido o resíduo escalado pelo 107b |

---

## 5. UTAC107d — Menor Lance Único

**Fonte:** conversa (R18-A..D, após um PARAR no SEG0) + mockup
`docs/mockups-107a/menor-lance-unico.html` (variante **A · Limpa**, R18-H) · log
`_logs/UTAC107d-mlc.md` · veredicto `_logs/UTAC107d_SEG8_VALIDADOR.md` (**APROVADO COM RESSALVAS**).

| # | Aprovado | Estado | Ficheiro:linha (verificação) | Discrepância |
|---|---|---|---|---|
| 1 | Alinhar glass superior com Carteira (2rem desktop, 1rem mobile) | ✅ **implementado** | `src/components/glass/GlassHeader.jsx:21` → `padding: isMobile ? "1rem 1rem 0" : "2rem 2rem 0"`; interior desktop `px-5` (20 px) em `:25` | Nenhuma. O `GlassHeader` **só é usado pelo MLC** (medido por grep no 107d) |
| 2 | Remover frase «Quanto você oferta por esse item…» | ✅ **implementado** | `grep 'Quanto você oferta' src/pages/MercadoLances.jsx` → **0** | Nenhuma |
| 3 | Adicionar frase nova «Ganha o menor lance que ninguém repetir.» dentro do glass | ✅ **implementado** | `src/pages/MercadoLances.jsx:241` (`FRASE_MENOR_LANCE_UNICO`), passada em `:323` (`frase={FRASE_MENOR_LANCE_UNICO}`) para o `GlassHeader` (dentro do vidro) | Nenhuma |
| 4 | Rótulo visível «Seu lance (em centavos)» no campo | ✅ **implementado** | `src/components/CardLance.jsx:427` (`<label htmlFor={idCampoLance}>Seu lance (em centavos)</label>`), ligado por `useId` (`:76`); `inputMode="numeric"` (`:431`) | Nenhuma. O campo **mantém** a unidade em **centavos** (R18-C): evita licitar 100× menos |
| 5 | Tabela no fim (padrão especial, 3 colunas: #, Participante, Valor) | ✅ **implementado** | `MercadoLances.jsx:366` (`<section data-testid="tabela-fim">`); `src/components/TabelaLances.jsx:22-23,246-247` (3 colunas, saíram «ID do Lance» / «Status (Art. 24)» / txHash / rodapé) | Nenhuma |
| 6 | Regra 1 (glass em tudo) no MLC | ✅ **implementado** | Corpo do MLC dentro de vidro (teste de render com detector de pilha de tags, log §SEG5) | **Resíduo declarado (não é discrepância nova):** `LanceStatusBadge.jsx` tem vidro próprio com `backdrop-blur-sm` — **fora do AUTORIZA** do 107d, registado |

---

## 6. UTAC107e.1 — Ofertas Programadas + V2

**Fonte:** conversa (R18-A..D) + mockup `docs/mockups-107a/ofertas-programadas.html`
(variante **A · Campo + botão**) · log `_logs/UTAC107e-op.md` · veredicto
`_logs/UTAC107e_SEG8_VALIDADOR.md` (**APROVADO COM RESSALVAS**).

| # | Aprovado | Estado | Ficheiro:linha (verificação) | Discrepância |
|---|---|---|---|---|
| 1 | Card de edições com rolagem lateral (copiado do Relâmpago) | ✅ **implementado** | `src/pages/OfertasProgramadas.jsx:337` (`data-testid="op-edicoes-scroll"`) | Nenhuma. Nota: o mockup diz «copiado do Relâmpago»; o que foi copiado foi a **estrutura de «Outras Edições» do Início** (MC99) — mesma técnica |
| 2 | Palpite dentro do card (6 estados) | ✅ **implementado** | `OfertasProgramadas.jsx:69,77,201` — estados `sem palpite`, `com palpite`, `mais próximo`, `não foi dessa vez`, `encerrada`, **`abre_em_breve`** (6.º estado, achado V1 do validador) | Nenhuma. O INPUT diz «6 estados»; o mockup mostrava 5 — o 6.º foi acrescentado pelo validador |
| 3 | Tabela «Palpites — Edição <id>» no fim (só estrutura) | ✅ **implementado** | `OfertasProgramadas.jsx:381-389` (`data-testid="op-tabela-fim"`, título `Palpites — Edição {edicao.id}`) | **Observação:** o mockup dizia «**Lances** — Edição PROG-1»; o enunciado dizia «**Palpites** — Edição». R18-C escolheu **Palpites** (na Via B a OP tem palpites). Registado |
| 4 | Remover secção «Palpite» separada | ✅ **implementado** | `grep 'Palpite — bónus' src/pages/OfertasProgramadas.jsx` → **0**; a palavra «Palpite» só aparece como coluna da tabela (`:397`) | Nenhuma |
| 5 | V2 — troféu 🏆 só com resultado oficial (3 sítios) | ✅ **implementado** | `TabelaLances.jsx:60` (`idxVencedor`; sem oficial → -1); `src/pages/MeusAtivos.jsx:119-127` (`menorUnicoLocal` só assinala com oficial); `src/context/AppContext.jsx:707-717` (a derivação `vencedorLocal` **saiu**) | Nenhuma. Mudou o contrato do UTAC000.8/9/10/15 e do UTAC105c (testes actualizados) |
| 6 | Texto «mais próximo» (não «acertou») | ✅ **implementado** | Copy do mockup (`MAIS PRÓXIMO`, `NÃO FOI DESSA VEZ`); decisão registada no log §SEG1 | Nenhuma. Correcção de E-2 do validador do 107a-front («acertou» seria falso: o backend premeia o **mais próximo**) |

---

## 7. UTAC107e.2 — Privacidade + Etiqueta

**Fonte:** conversa (R18-A..F) · log `_logs/UTAC107e.2-privacidade.md` + `_logs/UTAC107e.2_SEG-1_MEDICAO.md`
· veredicto `_logs/UTAC107e.2_SEG8_VALIDADOR.md` (**PARCIAL em 2 rondas** → todos os achados corrigidos).

| # | Aprovado | Estado | Ficheiro:linha (verificação) | Discrepância |
|---|---|---|---|---|
| 1 | Revelar valores pós-fecho (após consolidação) | ✅ **implementado** | `desafio-gut/frontend/netlify/functions/lances-flash.mjs` — revela do Key-Per-Bid só com marcador **E** janela fechada; cache `TTL_REVELADOS_MS = 60_000` (`:52`, `:196`) | Nenhuma. A 1.ª versão abria uma fuga (edição consolidada ainda aberta) — corrigida no 107e.2 (`6a05324`) |
| 2 | Etiqueta 3 estados (verde/vermelho/laranja) só pós-fecho | ✅ **implementado** | `src/components/EtiquetaEstadoLance.jsx:19-21` — `menor` 🟢 `#3ddc84` · `nao_menor` 🔴 `#ff8a8d` · `deixou_de_ser` 🟠 `#f5a623` | Nenhuma. Só depois do fecho (R18-A: mantém o anti-bot MC28.1) |
| 3 | Etiqueta estruturada em 2 partes: «SEU LANCE» (fixo) + «(estado)» (variável) | ✅ **implementado** | `EtiquetaEstadoLance.jsx:43` (`<span style={{color: COR_FIXA}}>SEU LANCE</span>` + estado na cor) | Nenhuma. Decisão 3 do operador (só o que muda tem cor) |
| 4 | Etiqueta em MLC + Início (não OP) | ✅ **implementado** | `MercadoLances.jsx:363` e `Dashboard.jsx:451` (`<EtiquetaMeuLance …/>`); `grep -rn 'EtiquetaMeuLance' src/pages/` → **só 2 ficheiros** ⇒ **OP sem etiqueta** (R18-D) | Nenhuma |
| 5 | Só o próprio vê a etiqueta | ✅ **implementado** | `lances-flash.mjs:165` (`?acao=meu-estado`, Bearer user-session; o `endereco` sai **do token**, nunca do query) | Nenhuma |
| 6 | Endpoint `ler-palpites` (valores ocultos durante a edição) | ✅ **implementado** | `netlify/functions/ler-palpites.mjs:63-67` (`revelado = apurada \|\| !STATUS_EM_CURSO.has(status)`) | Nenhuma. Critério: revela exactamente quando o `registar-palpite` passa a recusar |
| 7 | Registo silencioso do estado laranja | ✅ **implementado** | `lances-flash.mjs:64` (`export function reconstruirLideranca`), usado em `:101` (`foiLiderAlgumaVez = eLiderFinal \|\| reconstruirLideranca(lista).has(e)`) | Nenhuma. Reconstruído no fecho (R18-B): sem migração, sem tocar no `lance-relampago` |

---

## 8. UTAC107g — Navegação

**Fonte:** conversa (R18-A..D) + medições de `_logs/UTAC107g-navegacao.md` · veredicto
`_logs/UTAC107g_SEG7_VALIDADOR.md` (**PARCIAL** — 0 defeitos de produto; 4 lacunas de prova, todas fechadas).

| # | Aprovado | Estado | Ficheiro:linha (verificação) | Discrepância |
|---|---|---|---|---|
| 1 | Reduzir «Acesso Rápido» de 7 → 4 atalhos (saem: Depositar PIX, Converter Ficha, Dar Lance) | ✅ **implementado** | `Dashboard.jsx:59-66` — `ATALHOS` com **4** entradas (Vitrine 4 Slots, Meus Ativos, Seja Nosso Parceiro, Configurações) | Nenhuma. (O comentário `:62-63` refere uma remoção anterior, do MC39.3.1 — não confundir) |
| 2 | Senhas em «Meus Ativos» (só texto, sem link) | ✅ **implementado** | `src/pages/MeusAtivos.jsx:249-261` (secção «Senhas antigas», 5 estados, sem botão — R18-D) | Nenhuma |
| 3 | Indicador discreto na Carteira se senhas > 0 | ✅ **implementado** | `MinhaCarteira.jsx:337` («Você tem N senhas antigas → ver em Meus Ativos»), dentro do vidro do saldo | Nenhuma |
| 4 | Catch-all → Início (URLs desconhecidas) | ✅ **implementado** | `src/App.jsx:530` — `<Route path="*" element={<Navigate to="/" replace />} />` (último filho do AppLayout) | Nenhuma |
| 5 | Remover `/edicao/:id` + apagar `EdicaoDetalhe.jsx` | ✅ **implementado** | Rota removida do `App.jsx`; `ls src/pages/EdicaoDetalhe.jsx` → **APAGADO** (`git rm`, R18-C) | Nenhuma |
| 6 | Remover `/corp` | ✅ **implementado** | `grep '"/corp"' src/App.jsx` → **0** | Nenhuma. A rota era também um `CorporativoDashboard` **sem guarda** |
| 7 | Manter `/redirect` (OAuth) | ✅ **implementado** | `App.jsx:460` (rota mantida; é o `customOAuthRedirectUrl` do Privy + App Link Android) | Nenhuma. Documentado como técnica (não é caminho morto) |

---

## 9. UTAC107g.1 — Pendências pequenas

**Fonte:** conversa + log `_logs/UTAC107g.1-pendencias.md` · veredicto
`_logs/UTAC107g.1_SEG3b…` (log §SEG3b, **APROVADO**, 0 graves).

| # | Aprovado | Estado | Ficheiro:linha (verificação) | Discrepância |
|---|---|---|---|---|
| 1 | Copy pt-BR: «Tens…» → «Você tem…» | ✅ **implementado** | `MeusAtivos.jsx:258` («Você não tem senhas antigas.»), `:261` («Você tem N senhas antigas.»); `MinhaCarteira.jsx:337` | Nenhuma. Guarda nos testes contra marcadores pt-PT |
| 2 | Comentários actualizados (EdicaoCard, EdicaoBanner) | ✅ **implementado** | `src/components/EdicaoCard.jsx:8-9` («abre a imagem num MODAL… a antiga página /edicao/:id foi REMOVIDA»); `EdicaoBanner.jsx:3,8` | Nenhuma. Diff só de comentários (verificado) |
| 3 | DEBT-021 registada (não apagar `?rc=1`) | ✅ **implementado** | `_logs/DEBT.md` — linha de **DEBT-021** | Nenhuma. **Nota:** foi depois **FECHADA SEM RESÍDUO** no UTAC107g.4 (§12) — o registo dela mantém-se à vista (GATE 15) |

---

## 10. UTAC107g.2 — Copy pt-BR completa

**Fonte:** conversa (R18-A/B) + log `_logs/UTAC107g.2-copy.md` · veredicto §SEG4b (**PARCIAL** → corrigido).

| # | Aprovado | Estado | Ficheiro:linha (verificação) | Discrepância |
|---|---|---|---|---|
| 1 | 25 frases pt-PT → pt-BR | ✅ **implementado** | 25 substituições em 25 linhas (OP, Passe, resgate, hooks, MLC, Carteira, chatbot, login, admin) — tabela no log §SEG0/§SEG1 | **Observação:** o log declara uma **ultrapassagem**: o operador aprovou **21** frases e foram aplicadas **25** (mesma classe — 2.ª pessoa «tu» — e mesmos ficheiros já aprovados). Declarado pelo próprio executor |
| 2 | Guarda contra regressão pt-PT | ✅ **implementado** | `src/__tests__/utac107g2-pt-br.test.mjs` (varre todo o `src/`, sem testes/comentários; removedor de comentários ciente de strings) | Nenhuma |
| 3 | Excepção: páginas legais (Privacidade, Regras Oficiais) | ✅ **implementado** | `utac107g2-pt-br.test.mjs:61` — `EXCECOES_LEGAIS = new Set(["pages/Privacidade.jsx","pages/RegrasOficiais.jsx"])` | Nenhuma. Vira **pendência** (§14.1) |

---

## 11. UTAC107g.3 — Segurança `rc=1`

**Fonte:** conversa (decisões 1-3) + log `_logs/UTAC107g.3-rc1.md` · veredicto
`_logs/UTAC107g.3_SEG4_VALIDADOR.md` (**APROVADO**, 35 URLs de ataque).

| # | Aprovado | Estado | Ficheiro:linha (verificação) | Discrepância |
|---|---|---|---|---|
| 1 | Match exacto para `rc=1` (não substring) | ✅ **implementado** | `src/lib/acessoDiretoCadastro.js` (criado neste UTAC); `App.jsx:148-149` passou a usá-lo | Nenhuma. Extensão de escopo declarada (ficheiro novo em `src/lib/` para ser testável) |
| 2 | `?rc=1` exacto continua a abrir (decisão temporária) | ⚠️ **cumprido, depois SUPERADO** | Na altura: `URLSearchParams.get("rc") === "1"`. **Hoje:** `acessoDiretoCadastro.js` devolve **`false` sempre** | **⚠️ DISCREPÂNCIA D-2** (ver §16): não é incumprimento — foi **fechado por decisão do próprio operador** no UTAC107g.4 (§12). O manifesto registra o estado **actual** |
| 3 | `?src=1`, `?arc=10`, `?rc=10` → não abrem | ✅ **implementado** | `acessoDiretoCadastro.js` devolve `false` para qualquer entrada (`void search; return false;`) | Nenhuma. Reforçado pelo 107g.4 |

---

## 12. UTAC107g.4 — Fechar porta `rc=1`

**Fonte:** conversa + log `_logs/UTAC107g.4-porta-rc1.md` · veredicto
`_logs/UTAC107g.4_SEG4_VALIDADOR.md` (**APROVADO**, 0 bloqueantes, 5 ℹ️; 49 URLs + 14 não-texto).

| # | Aprovado | Estado | Ficheiro:linha (verificação) | Discrepância |
|---|---|---|---|---|
| 1 | `acessoDiretoCadastro()` devolve `false` sempre | ✅ **implementado** | `src/lib/acessoDiretoCadastro.js` — `export function temAcessoDiretoCadastro(search) { void search; return false; }` | **Observação de nome (medição):** a função real chama-se **`temAcessoDiretoCadastro`**; o **ficheiro** é que se chama `acessoDiretoCadastro.js`. Mesmo objecto |
| 2 | `App.jsx` não é alterado | ✅ **implementado** | `App.jsx:149` continua a chamar o helper **sem alteração**; `App.jsx` **fora do diff** (md5 `93c092d4…` medido pelo validador) | Nenhuma. A assinatura (1 parâmetro) foi preservada de propósito |
| 3 | DEBT-021 → fechada sem resíduo | ✅ **implementado** | `_logs/DEBT.md` — linha de DEBT-021 com «FECHADA SEM RESIDUO … UTAC107g.4, commit `7d4c5de`» | Nenhuma. Resíduos fora de escopo declarados: I-1 (código morto) e I-2 (`pareceAutenticado`) → pendências §14.2/§14.3 |

---

## 13. Decisão estrutural (nova — NÃO implementada)

| # | Aprovado | Estado | Verificação | Discrepância |
|---|---|---|---|---|
| 1 | **Remover o lojista do app** (o Marinho trata pessoalmente) | ❌ **NÃO implementado** | `src/pages/CorporativoDashboard.jsx` e `src/pages/CorporativoCotas.jsx` **existem**; rotas `/corporativo/*` **presentes** em `App.jsx:519-526`; `CorporativoRoute` intacta (`:118`); `BottomNav.CORP_TABS` e `Sidebar.CORPORATIVO_ITEMS` presentes | **Esperado.** É decisão **nova** (conversa 2026-10-06), posterior à série 107. Por desenho, **não** foi implementada neste UTAC (READ-ONLY) nem em nenhum da série 107. **Destino: UTAC108f** (`108f (remover lojista)` na ordem completa) |

**Fonte:** conversa do operador de 2026-10-06 (declarada no enunciado do UTAC108a). **Não há registo
desta decisão em nenhum log da série 107 nem no bloco R14** — é a primeira vez que é escrita num
artefacto do repo.

---

## 14. Pendências declaradas

Nenhuma destas foi executada (por decisão ou por escopo). São a matéria-prima do 108b/108c+.

| # | O que | Estado | Fonte | Verificação |
|---|---|---|---|---|
| 1 | Vocabulário pt-PT nas páginas legais (`Privacidade.jsx`, `RegrasOficiais.jsx` + `docs/regras-oficiais.md`) | **aberta** | 107g.2 §Pendências 1 | `utac107g2-pt-br.test.mjs:61` (`EXCECOES_LEGAIS`); a excepção é explícita, com razão |
| 2 | I-1 — Código morto em `CorporativoDashboard` (limpa `?rc=1`, agora inalcançável) | **aberta** | 107g.4 I-1 | `src/pages/CorporativoDashboard.jsx:30-36` (`if (params.get("rc") === "1")`) |
| 3 | I-2 — `pareceAutenticado` (gate pré-existente) | **aberta** | 107g.4 I-2 | `src/App.jsx:148` (`if (pareceAutenticado) return children;`) |
| 4 | Endpoints órfãos (25 de frontend) | **aberta** | 107a-back §A.3.1 · re-medidos no 107g §SEG4 | Lista completa em §16 do `_logs/UTAC107a-back-mapeamento.md`; candidatos a desligar: `comprar-passe`, `voucher`, `renovacao-adesao`, `info-pagamento` |
| 5 | `debug-pedido` ligado em produção | **aberta** | 107g §SEG4 #7 | `netlify/functions/debug-pedido.mjs` (público, protegido por token `x-debug-token` com `timingSafeEqual`) — **avaliar desligar** |

**Pendências adicionais registadas nos logs mas fora da lista INPUT** (para não se perderem):

| # | O que | Fonte |
|---|---|---|
| 6 | `LanceStatusBadge.jsx` com vidro próprio (`backdrop-blur-sm`) — única violação da Regra 1 remanescente no MLC, fora do AUTORIZA | 107d §SEG5 |
| 7 | `EdicaoCard.jsx:8` / `EdicaoBanner.jsx` — comentários corrigidos no 107g.1; `App.jsx:85` diz «modal desde o MC45» (é MC47) | 107g.1 §Pendências 3 |
| 8 | Redundâncias menores de navegação: `Seguranca.jsx:27-28`, `Privacidade.jsx:213/309`, `RegrasOficiais.jsx:318` | 107g §SEG1 |
| 9 | `exportar-dados` — direito LGPD (art. 18) **sem botão no app** | 107g §SEG4 #8 |
| 10 | APK instalado **não** tem nenhuma das mudanças da série 107 (frontend empacotado) → entram no 108i (AAB novo) | 107g §Pendências 7 |

---

## 15. Itens FEITOS que NÃO estavam na lista de aprovações (extras)

Registados para que a auditoria saiba distinguir «aprovado» de «feito». Todos estão **declarados nos
logs** e nenhum contradiz a lista INPUT.

| UTAC | Extra | Onde |
|---|---|---|
| 107a-front | Mockups HTML/CSS + `DESIGN.md` (lint 0/0) + auditores de toque e Regra 1 | `docs/mockups-107a/` |
| 107b | Remoção dos órfãos do botão removido (`useTrocarPorSenhas`, `CreditoStatus`, `creditoTxHash`, `trocaInfo`, `trocaErro`); remoção (R18-E) da pílula «R$ OFF-CHAIN» e da frase de apoio do saldo | `MinhaCarteira.jsx` |
| 107c | Estados do tile do Passe (`sem-sessao`/`carregando`/`erro`/`vazio`/`dados`) + `estadoPasse()` pura exportada | `Dashboard.jsx:69-92` |
| 107d | `GlassHeader` desktop `px-8`→`px-5`; remoção de «Status (Art. 24)», «ID do Lance», txHash e rodapé «Dados sanitizados · Art. 25» | `GlassHeader.jsx`, `TabelaLances.jsx` |
| 107e.1 | Regras Oficiais como botão de 48 px dentro de vidro; subtítulo do mockup; `usePalpite.registar(valor, edicaoId)` | `OfertasProgramadas.jsx`, `usePalpite.js` |
| 107e.2 | `?acao=meu-estado`; `reconstruirLideranca()`; cache com TTL 60 s (achado LGPD R1 do validador); `listarPalpitesDaEdicao` em `_lib/passe-pontos.mjs` | `lances-flash.mjs`, `ler-palpites.mjs`, `passe-pontos.mjs` |
| 107g | `/redirect` documentada como técnica; re-medição das contagens do 107a-back (estavam desactualizadas); teste do router com o `matchRoutes` **real** | `App.jsx`, `utac107g-navegacao.test.mjs` |
| 107g.1 | Reforço da guarda de dialecto (11/11 mutantes); correcção do texto da DEBT-021 | `utac105c-meus-ativos.test.mjs` |
| 107g.2 | Guarda **global** pt-BR; 3 frases extra achadas na re-varredura (login, chatbot) | `utac107g2-pt-br.test.mjs`, `App.jsx`, `ChatbotWidget.jsx` |
| 107g.3 | Ficheiro novo `src/lib/acessoDiretoCadastro.js` (extensão de escopo declarada, para ser testável) | `src/lib/` |
| 107g.4 | Comentário de decisão (8 linhas) no topo do helper; `void search;` para manter o lint limpo | `acessoDiretoCadastro.js` |

---

## 16. Discrepâncias (a levar à auditoria 108b)

> Nenhuma destas é um item aprovado e ignorado. São **divergências entre o aprovado e o estado
> actual**, registadas sem as esconder.

### D-1 ⚠️ O botão «Menor Lance Único» da Carteira fica `disabled` com saldo 0 — **explica a queixa do operador**

- **Aprovado (107b#2):** «Adicionar botão «Menor Lance Único» → `/mercado`».
- **Implementado:** existe e navega (`MinhaCarteira.jsx:101-103`, `:242-259`)…
- **…mas** `disabled={!saldoReais}` (`:245`), com `saldoReais = saldoRsCentavos == null ? null : saldoRsCentavos / 100` (`:95`) e `title={!saldoReais ? "Deposite PIX primeiro" : …}` (`:256`).
- **Consequência medida (leitura de código):** com **saldo R$ 0,00** (ou `null`, durante o carregamento),
  o `<button>` está `disabled` → **clicar não faz nada**. Um utilizador sem saldo percebe exactamente
  «o botão não navega correctamente».
- **Natureza:** é um **gate pré-existente** (`UTAC106c`/`MC48`), já registado como observação no
  `_logs/UTAC107a-back-mapeamento.md` §B.6(c) («⚡ Menor Lance Único» fica `disabled` com `saldoReais`
  falsy). **Não estava na lista de aprovações do 107b** — não foi aprovado nem removido.
- **Decisão de produto em falta:** o botão deve navegar sempre (e o saldo verificar-se no destino),
  ou manter-se bloqueado? **Não decidido pelo executor (GATE 12 / AU3).**

### D-2 ⚠️ `?rc=1` exacto — item aprovado como TEMPORÁRIO no 107g.3 e fechado no 107g.4

- **Aprovado (107g.3#2):** «`?rc=1` exacto continua a abrir (decisão temporária)».
- **Hoje:** `temAcessoDiretoCadastro()` devolve `false` **sempre** (`acessoDiretoCadastro.js`).
- **Natureza:** **superação legítima** — o próprio operador mandou fechar a porta no 107g.4. Não é
  incumprimento; é a evolução declarada. Registado para que a auditoria não leia o 107g.3 isolado.

### D-3 ℹ️ ITEM APROVADO QUE JÁ EXISTIA — «adicionar» vs «manter» (`107b#2`, `107c#?`)

- `107b#2` «Adicionar botão Menor Lance Único»: o botão **já existia desde o UTAC106c**. O log do 107b
  regista-o explicitamente («o enunciado pede para o «adicionar» — foi mantido»). Cumprido por manutenção.
- `107b` — a grelha da Carteira **já era** a mesma (`1fr` mobile / `1fr 1fr` desktop).
- Sem acção; registado para fidelidade do manifesto.

### D-4 ℹ️ Palavras da lista INPUT ≠ palavras do mockup/log (sem impacto de produto)

| Item | Lista INPUT | Mockup/log | Escolhido |
|---|---|---|---|
| 107d#3 | frase nova «Ganha o menor lance que ninguém repetir.» | mockup igual | igual ✔ |
| 107e.1#3 | «**Palpites** — Edição <id>» | mockup: «**Lances** — Edição PROG-1» | **Palpites** (R18-C, enunciado) |
| 107c#3 | **Manter** os KPIs | enunciado mandava **remover** | **Manter** (R18-A revogou o enunciado) |
| 107c#1 | «Passe Desafio 12/50» | mockup mostra «12 / 50» | igual ✔ |
| 107g.2#1 | «25 frases» | log: aprovadas 21, aplicadas 25 (ultrapassagem declarada) | 25 |
| 107d#1 | «2rem desktop, 1rem mobile» | R18-B: lado 2rem/1rem **+ padding interno 20 px** | igual ✔ |

### D-5 ℹ️ Comentário obsoleto em `TabelaLances.jsx` — o comentário contradiz o código

- **Achado do validador adversarial do UTAC108a** (não é divergência face à lista INPUT; é uma
  inconsistência interna pré-existente).
- `src/components/TabelaLances.jsx:52-58` ainda afirma, no comentário do UTAC000.9, «**Sem resultado
  oficial mantém-se o apuramento local: exactamente o comportamento anterior**».
- O código, logo abaixo (`:70-73`), faz `return -1;` — o comportamento que o **UTAC107e.1 (V2, decisão
  do operador)** introduziu: **sem oficial, ninguém leva 🏆**. O comentário do `107e.1` está em `:70-72`.
- ⇒ Dois comentários contraditórios no mesmo bloco; o do 000.9 nunca foi actualizado quando o
  comportamento mudou. Sem impacto em runtime; a **corrigir** no UTAC de limpeza (mesma família das
  pendências §14.6/§14.7).

---

## 17. Resumo executivo

| UTAC | Itens aprovados | ✅ | ⚠️ | ❌ | Estado do UTAC (log) | Validador adversarial |
|---|---|---|---|---|---|---|
| **107a-back** (mapeamento) | 0 (produziu o mapa) | — | — | — | FECHADO | PARCIAL · 4 bloqueantes → corrigidos |
| **107a-front** (mockups) | 0 (produziu os mockups) | — | — | — | FECHADO | PARCIAL → **APROVADO** (2.ª ronda) |
| **107b** — Carteira | 7 | 6 | **1** (D-1) | 0 | FECHADO | APROVADO (2 ℹ️) |
| **107c** — Início | 6 | 6 | 0 | 0 | FECHADO | APROVADO COM RESSALVAS (V1 corrigido) |
| **107d** — Menor Lance Único | 6 | 6 | 0 | 0 | FECHADO | APROVADO COM RESSALVAS (V2 escalado → 107e.2) |
| **107e.1** — Ofertas Programadas + V2 | 6 | 6 | 0 | 0 | FECHADO | APROVADO COM RESSALVAS (V2 escalado) |
| **107e.2** — Privacidade + Etiqueta | 7 | 7 | 0 | 0 | FECHADO (deploy após recarga de créditos) | PARCIAL ×2 → corrigido |
| **107g** — Navegação | 7 | 7 | 0 | 0 | FECHADO | PARCIAL (0 defeitos) → fechado |
| **107g.1** — Pendências pequenas | 3 | 3 | 0 | 0 | FECHADO | APROVADO |
| **107g.2** — Copy pt-BR | 3 | 3 | 0 | 0 | FECHADO | PARCIAL → corrigido |
| **107g.3** — Segurança `rc=1` | 3 | 2 | **1** (D-2) | 0 | FECHADO | APROVADO |
| **107g.4** — Fechar porta `rc=1` | 3 | 3 | 0 | 0 | FECHADO | APROVADO |
| **Decisão estrutural** — remover lojista | 1 | 0 | 0 | **1** | NÃO iniciado (é o 108f) | — |
| **TOTAL** | **52** | **49** | **2** | **1** | — | — |

**Selo do baseline:** `HEAD` = `origin/main` = `86ffe2c`; suíte **849/849 + 1095/1101 VERDE**; `git diff --name-only` **vazio**;
5 `.bak-*` intactos; `EM_BREVE_MODE = true`; `CLAUDE.md` com 2×`0x00` + 2×`0x1F` + 2×`0x7F`.

---

## 18. Notas de método (o que este manifesto NÃO garante)

1. **É um manifesto de código, não de produção.** Todas as verificações são por leitura de ficheiro
   (`ficheiro:linha`), não por execução em runtime nem contra o deploy. A comparação com **produção** é
   o objecto do **108b** (declarado na Ressalva 5 do enunciado).
2. **A fonte primária das aprovações é a lista INPUT do enunciado** (extraída das conversas). O executor
   **não** teve acesso às conversas do chat — cruzou a lista com os logs e o código. Onde um item da lista
   não aparecia em nenhum log, foi registado (não houve nenhum caso).
3. **Os mockups divergem do enunciado em pontos já resolvidos por R18** (ex.: 107c#3, 107e.1#3). As
   divergências estão em §16 (D-4) — nenhuma ficou por resolver.
4. **Item não verificado = item não marcado.** Nada foi marcado «implementado» sem `ficheiro:linha`.
5. **Este UTAC é READ-ONLY:** zero alterações em `src/`, `netlify/`, `scripts/`, `package*.json`,
   `.bak-*`, NORTE/ESCOPO-ALVO/FICHA-PLAY/MC100_MATRIZ. **Entregáveis do UTAC108a — este documento
   (`docs/aprovacoes-operador.md`) é o primeiro; os outros três são produzidos no fecho do UTAC
   (SEG6), pelo que podem ainda não existir quando este ficheiro é lido a meio do UTAC:**
   `docs/aprovacoes-operador.md` · `_logs/UTAC108a-manifesto.md` · bloco R14 do `CLAUDE.md` ·
   `Desktop/RELATORIO-UTAC108a-MANIFESTO.txt`.
6. **Erro do MEU instrumento, declarado (achado do validador):** a 1.ª versão deste manifesto provou a
   remoção do card 🏆 do Início com `grep '🏆' src/pages/Dashboard.jsx` → «0 ocorrências». **Essa prova
   é inválida:** neste ambiente o `grep` de emoji falha **em silêncio** (controlo: `grep -c '🏆'
   src/components/glass/GlassHeader.jsx` → **0**, apesar de o ficheiro conter 🏆; `python` conta **1**).
   A alegação era verdadeira (o card saiu), mas a evidência não provava nada — **corrigida** para o
   array `stats` (`Dashboard.jsx:226-231`, 4 tiles) + contagem por `python`. Regra reforçada: **padrões
   sem emoji, ou contagem por `python`, nunca `grep` de emoji como prova.**
7. **Estado de publicação:** o manifesto foi validado no commit `e2e793a`, que **não** está em nenhum
   ramo remoto (`git branch -r --contains e2e793a` → vazio) — é publicado no fecho do UTAC (SEG6).
