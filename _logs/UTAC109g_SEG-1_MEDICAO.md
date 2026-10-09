# UTAC109g — SEG-1 · MEDIÇÃO (nada alterado)

**Data:** 2026-10-09 · **Executor:** Claude Code (Opus 5.5) · Spec: `_logs/UTAC109g.spec.yml`

## -1.1 Estado do repo
| Item | Medido | Comando |
|---|---|---|
| HEAD = origin/main | **`fee1609`** (= o esperado) | `git rev-parse HEAD origin/main` após `git fetch` |
| Árvore | sem código modificado; só 30 `??` de logs antigos (MC100-102, UTAC106x.2 — alheios, iguais ao 109f) | `git status --porcelain` |
| Suíte | frontend **VERDE 947/947** · backend **VERDE 1095/1101** (= o esperado) | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` (foreground) |
| Disco | 8,0 GB livres (> 5 GB) | `df -h /c` |
| Skills de design | as 4 no Hermes (`~/AppData/Local/hermes/skills/{mobile-ux-design, creative/claude-design, creative/popular-web-designs, creative/design-md}/SKILL.md`) — **acessíveis** (mesmo desvio do 109f) | `ls` |

## -1.2 Inventário da aba OP (`src/pages/OfertasProgramadas.jsx`, 416 linhas)
Envelope: `div` padding `1rem`/`2rem` (`:195`), coluna `maxWidth: 640px` centrada, `grid gap 1rem` (`:196`).
| # | Bloco | Onde |
|---|---|---|
| 1 | **1.º glass** — cabeçalho: título «Ofertas Programadas» (`COR.primary` **#ff6b35**, Orbitron) + frase «Junte 50 pontos…» (`COR.gold` **#f5a623**) + selo «🎫 Programadas» | `:200-212` |
| — | Carregando / Erro | `:214-224` |
| 2 | Pontos (X / 50 + barra + histórico) | `:228-275` |
| 3 | Cartão da Família Quildo + resgate | `:279-307` |
| 4 | Sem pontos (→ Carteira) | `:310-322` |
| 5 | **Edições**: vidro-título «🎫 Edições programadas» + texto do bónus (`:330-335`) e **o cartão da edição** (`CartaoEdicao`, vazio `:337` / carrossel `:339-348`) | `:328-351` |
| 6 | Regras Oficiais (link 48 px) | `:357-361` |
| 7 | Tabela «Palpites — Edição X» (último vidro) | `:368-398` |
⇒ **A edição está hoje no 6.º vidro** (5 vidros acima dela), não abaixo do 1.º.

## -1.3 Inventário da aba MLC (referência, só leitura)
- `src/pages/MercadoLances.jsx:329-340` — **1.º glass** = `GlassHeader` (`src/components/glass/GlassHeader.jsx`): 3 secções — identidade «🏆 DesafioGUT» + `AuthArea` (login) · título + frase + selo «⚡ Relâmpago» · rodapé legal `AuctionStatusBar` (CNPJ). Envelope do cabeçalho: padding `1rem 1rem 0` / `2rem 2rem 0`.
- `MercadoLances.jsx:350-356` — `<main>` padding `1rem` / `1.5rem 2rem`, gap `1rem` / `1.5rem`, **sem limite de largura**.
- `MercadoLances.jsx:369-394` — **2.º glass** = `CartaoEdicao` (vazio com EM BREVE).
- `TabelaLances.jsx:76-159` — «📋 Lances — Edição R-1» (padrão do B1).

## -1.4 Medições no browser (local, protocolo 109f: vite 127.0.0.1:3000, perfil `mkdtemp` apagado no fim)
| viewport | MLC 1.º glass (h) | MLC edição top | OP 1.º glass (h) | OP edição top | largura MLC / OP |
|---|---|---|---|---|---|
| **375** | 267 px | **299 px** (gap 16) | 147 px | **969 px** | 343 / 343 |
| **1280** | 255 px | **311 px** (gap 24) | 104 px | **898 px** | 964 / **640** |
Overflow lateral 0 nos 4. Script: scratchpad `109g/medir.mjs` (+ `COM_EDICAO=1` interceta `/edicoes` com uma Programada sintética).

**Nome do produto na OP a 375 px:** **151 px** (< 200 → B4 aplica). Causa: o mínimo do nome na faixa do `CartaoEdicao.jsx` é `flex: 1 1 9rem` (144 px); com o tempo «EM BREVE» os dois cabem na mesma linha e o nome fica com o resto (151). A 1280: 440 px.

## -1.5 P1 / P2
- **P2 ✅ medido no browser**: a OP vazia diz «Sem edições programadas no momento.» (`aria-label` do cartão), vindo de `CartaoEdicao.VAZIO_POR_ACAO.palpite` (109f) — a aba não foi tocada.
- **P1 — não observável no browser**: com `EM_BREVE_MODE = true` o `getEstadoEdicao` devolve sempre EM_BREVE (`utils/edicao.js:110`), nunca ATIVA ⇒ o cartão mostra «EM BREVE», não «palpite já!». A fonte (`utils/edicao.js:147-156`) dá «palpite já!» a Programada ATIVA e «lance já!» à Relâmpago; prova só por teste (duplo `definirEmBreve`). Declarado.

## -1.6 «Palpites» (OP) vs «Lances — Edição R-1» (MLC) — diferenças medidas
| | Lances (molde) | Palpites hoje |
|---|---|---|
| Título | Orbitron, «📋 Lances — Edição <id dourado>» | sem Orbitron, sem emoji, id sem destaque |
| Cabeçalho | badge de estado (`est.badge`) + «🔒 valores ocultos até o fim» | nada |
| Vazio | 📭 + «Nenhum lance registrado ainda.» + «Seja o primeiro a lançar.» (sem tabela) | tabela vazia + «Ainda não há palpites.» |
| Telemóvel | lista de cartões (círculo da posição, nome, valor à direita) | tabela |
| Desktop | tabela #/Participante/«Valor 🔒» | tabela #/Participante/Palpite |
| Campos | posição · participante · valor (**não há coluna «tempo»**; o enunciado pede-a — o molde não a tem) | idem |
| Ordem / refresh | únicos primeiro por valor · tempo real do contexto | ordem do servidor · 1 leitura (`usePalpitesDaEdicao`, sem polling) |

## ⚠️ Conflitos / ambiguidades (AU3 / GATE 12) — levados ao operador
1. **Altura igual = razão estrutural (ressalva «PARAR e reportar»).** O 1.º glass do MLC é o `GlassHeader` (identidade + login + título + rodapé CNPJ, 267/255 px); o da OP é só título (147/104 px). Mover a edição para baixo do 1.º glass dá ~179 px @375 e ~152 px @1280 — **longe dos 299/311 (±4)**. Igualar exige a OP usar **o mesmo `GlassHeader`** (passa a ter login + CNPJ no topo) e, no desktop, **a mesma largura** (a OP tem 640 px, o MLC 964).
2. **O vidro «🎫 Edições programadas»** (com o aviso Play «é bônus, não muda o cartão») fica entre o cabeçalho e o cartão: para a edição ser o 2.º glass ele tem de mudar de sítio.
3. **B4 na fonte:** subir o mínimo do nome no `CartaoEdicao` (9rem → 12,5rem = 200 px) também afecta o Início/MLC quando houver tempo (os ficheiros deles não mudam).
4. Declarados sem pergunta: a tabela «Palpites» é refeita pelo molde **dentro da OP** (a `TabelaLances` é do MLC e não se toca); sem coluna «tempo» (o molde não a tem); vazio só com 1 linha (não se inventa a 2.ª); ordem do servidor (ordenar palpites por valor não tem significado — vence o mais próximo).

## -1.7 Veredicto
**AJUSTAR** — perguntar 1-3 ao operador antes do SEG0.

## Decisões do operador (R18, 2026-10-09) — registadas em 3 lugares (este log, o relatório do Desktop, o R14)
| # | Decisão |
|---|---|
| **R18-A** | A OP usa o **MESMO `GlassHeader`** do MLC (identidade + login + título/frase/selo + rodapé CNPJ) e o **mesmo envelope** (`<main>` padding/gap do MLC; **sem o limite de 640 px** no desktop) ⇒ alinhamento exacto a 375 e 1280. |
| **R18-B** | O vidro «🎫 Edições programadas» (aviso do bónus, texto intacto) passa para **logo abaixo da edição**. |
| **R18-C** | **B4 na fonte**: no `CartaoEdicao`, mínimo do nome 9rem → **12,5rem (200 px)**; o tempo desce de linha. Vale também para Início/MLC (ficheiros deles intocados). |

**Veredicto após R18:** SEGUIR.
| **R18-D** | **Frase da OP a 375 px.** Com o mesmo `GlassHeader`, a 1280 a edição bateu ao píxel (311 = 311), mas a 375 ficou 21 px abaixo (320 vs 299): a frase «Junte 50 pontos e troque pelo cartão da Família Quildo» quebrava em 2 linhas. O operador propôs «Junte 50 pontos e troque pelo cartão Quildo» (mantém «Quildo»), com recurso à Opção 1 se ainda quebrasse. **Medido: «…cartão Quildo» ainda quebra (320 vs 299) ⇒ aplicada a Opção 1, «Junte 50 pontos e troque pelo cartão»** ⇒ **299 = 299 e 311 = 311 (0 px)**. ⚠️ «Quildo» saiu da frase (registado). Nota: no questionário, antes da mensagem do operador, tinha sido escolhida «50 pontos valem um cartão colecionável.»; prevaleceu a mensagem posterior do operador. |
