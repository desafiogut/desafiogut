# UTAC110j — SEG-1 MEDIÇÃO (nada alterado)

Executor: Claude Code (Opus 5.5) · 2026-10-16 · skill `utac` (spec `_logs/UTAC110j.spec.yml`)

## -1.1 Estado do repo
- `git rev-parse HEAD` = `0c99cc9e55…` = `origin/main` ⇒ **baseline do enunciado confere, sem desvio**.
- Árvore suja só com ficheiros alheios ao UTAC (`.agents/skills/…`, `.mcp.json`, `_logs/MC100_*` untracked). Nada meu.

## -1.2 RAM (A14) e disco
- Arranque: **270 / 279 / 269 / 281 MB** livres (A14 exige ≥ 1 500) ⇒ SEG-1 inválido.
- O operador mandou «libere a ram». **Fechar processos foi RECUSADO pelo classificador de permissões**
  (MCP sem uso desta sessão + Edge sem janela) — não contornado. Feito só o **trim de working sets**
  (`EmptyWorkingSet`, 136 processos, **nada fechado**): **393 → 2 002 / 1 870 / 1 843 MB**.
- Suíte corrida a **1 755 MB** (no fim 1 471: o trim regride). Disco: 13 GB livres.

## -1.3 Suíte de baseline (harness `mc966`, foreground, `</dev/null`)
`frontend: VERDE 1148/1148` · `backend: VERDE 1310/1316` · **= ao declarado no enunciado**.

## -1.4 Inventário — Regulamento v5 (`docs/REGULAMENTO-v5.md`, 283 linhas)
Contagens no próprio v5: `senha` 0 · `pontos de lance` 4 · `Menor Lance Único` 3 · `leilão` 0 ·
`arremata` 0 · `aquisição` 14 · **`cota` 6** (Arts. 12, 18, 24, 30) · **`repasse` 1** (Art. 42) ·
**`sorteio` 2** (Arts. 15, 38 — em negação) · `Passe` 25.

## -1.5 Medição das FRENTES A/B/D em `src/` (produção; sem `__tests__`, `.test.`, `_stubs`, `.bak`)

Contagem bruta (grep do enunciado, inclui comentários e identificadores):

| termo | linhas | ficheiros |
|---|---|---|
| `senha` | 257 | 47 |
| `leilão/leilões` | 32 | 14 |
| `arremat` | **0** | 0 |
| `cota(s)` (palavra) | 82 | 19 |
| `repasse` | **0** | 0 |
| `sorteio` | 1 | 1 (comentário) |
| `prêmio` | 4 | 2 |
| `lance … R$` | 3 | 3 |
| `Art. N` | 52 | 17 |

**Texto VISÍVEL (fora de comentários e identificadores) — o que realmente conta:**

- **leilão:** 1 só — `Privacidade.jsx:125` «smart contract **LeilaoGUT**» (nome do contrato, preservado de
  propósito desde o MC96.3). O resto são identificadores (`isLeilaoAtivo`, `leilaoLock`, `tipoLeilao`).
- **arrematação / repasse:** **0** — já cumprido.
- **sorteio:** **0** visível.
- **prêmio:** `CardEdicaoEspecial.jsx:118,183` + `pt.js:118,124` — «Prêmio especial», «Prêmio em disputa»
  (não é prémio em dinheiro; o v5 diz «produto» / «adquire»).
- **senha (~60 linhas visíveis), em 6 famílias diferentes:**
  1. `CardLance.jsx` — o ramo **Programado** (Via A): «Lance programado consome 1 senha (Art. 20: R$ 2,00)»,
     «Converter R$ → senha», «−1 senha», «recarregue via PIX para converter R$ 2,00 → 1 senha».
  2. `ComprarFichasModal.jsx` — «Quantas senhas?», «troca por senhas», «converte R$ 2,00 em 1 senha».
  3. `MeusAtivos.jsx` «🎫 Senhas antigas» + `MinhaCarteira.jsx:590` «Você tem N senhas antigas» (UTAC107g —
     é o **saldo on-chain real da Via A**: 12 senhas em 1 conta, MC103).
  4. `EstadoBonus.jsx` + `pt.js:74-89` — «🎟️ Bônus de senhas» (torneio MC93/94).
  5. `ExcluirConta.jsx`, `ExcluirContaModal.jsx` — lista LGPD dos dados apagados/retidos («saldo de senhas»).
  6. `Configuracoes.jsx:173` «Art. 20 — Senha: R$ 2,00 por edição», `MinhaCarteira.jsx:566` «Custo de cada
     senha: R$ 2,00 por edição (Art. 20)», admin (`Operacoes`, `PerfilUsuario`, `VisaoGeral`).
- **cota (visível):** `ChatbotWidget.jsx:634` «Pergunte sobre regras, **cotas**…», `Vitrine.jsx:202,360`
  («Cotas» + aviso Diamante/Ouro/Prata/Bronze), `pt.js:18` `nav.cotas`, painel **admin** `/admin/cotas`.
- **Artigos v4 citados na UI:**
  `CardLance.jsx:161,299,471` **Art. 26** (lance mínimo R$ 0,01) · `CardLance.jsx:180,445,552` e
  `MinhaCarteira.jsx:566` e `Configuracoes.jsx:173` **Art. 20** (senha R$ 2,00) · `Configuracoes.jsx:175` e
  `MeusAtivos.jsx:356` **Art. 25** (apuração automática) · `MeusAtivos.jsx:356` **Art. 7** e
  `ComingSoonHero.jsx:55` **Art. 8** (menor lance único). O gate (`TermosConsentimento.jsx`) já cita o v5.

**FRENTE D:** todas as ligações (`BottomNav`, `Sidebar`, Início, OP, gate) apontam para `/regras-oficiais`
(v5). Nenhuma ligação a v3/v4. ⇒ **coerente**; o desalinhamento está só nos artigos citados acima.

## -1.6 FRENTE C — DEBT-034 (medido no código, não presumido)
- **Onde:** `netlify/functions/referral.mjs:215-225` (backend — **não** em `src/lib/api.js`, como o
  enunciado supõe). A resposta de `POST /referral?acao=usar-codigo` inclui `indicador: r.indicador`.
- **O que contém:** o **endereço de carteira REAL e completo** de quem deu o código (o log da linha 203 já o
  mascara; a resposta não). Quem recebe: o **próprio indicado**, autenticado pelo seu JWT.
- **Classificação:** **dado pessoal de TERCEIRO** — identificador do utilizador (carteira) + aresta do grafo
  social. Não é agregado nem contador.
- **Consumidores:** **zero.** `ReferralRegistrar.jsx` só lê `data.idempotent` e `data.conversao.*`
  (`:75-107`); varredura `(corpo|body|data|json()).indicador` em `src/` e `_tests/` → **0**.
- **Opções:**
  | opção | efeito | risco |
  |---|---|---|
  | **Remover** o campo (recomendada) | a aresta deixa de sair; nada a declarar na Data Safety por isto | muda o contrato da resposta (HI9) — mas sem nenhum consumidor medido |
  | Mascarar (`mascararEndereco`) | sai `0x12…cdef` | continua a sair um identificador parcial sem utilidade |
  | Expor (manter) | — | exige declarar «User IDs» na Data Safety; dá a um utilizador o identificador de outro |
- **Paragem:** a remoção é uma mudança de contrato de API ⇒ **HI9 / RESSALVA do enunciado: PARAR e reportar**.
  Não alterado. (APK antigos também não leem o campo — o leitor é o mesmo `ReferralRegistrar`.)

## ⚠️ Conflitos entre o enunciado e o medido (R20 — NÃO resolvidos pelo executor)

1. **«senha → ponto de lance» é uma equivalência falsa.** Ponto de lance (UTAC110d/110f) é outro saldo,
   ganho por engajamento e **não consumido**. As «senhas» da UI são: (a) o saldo **on-chain** antigo da Via A
   (dinheiro real, MC103); (b) o fluxo Programado do `CardLance` que converte R$ 2,00 em senha; (c) o bónus
   do torneio; (d) dados LGPD. Trocar a palavra faria a UI afirmar o que não acontece. **Pergunta:** por
   família — (a) manter «senhas antigas»? (b) o ramo Programado do CardLance ainda é alcançável? remover a
   copy ou o ramo (isso já é funcionalidade)? (c) o bónus do torneio passa a chamar-se como? (d) LGPD fica
   factual?
2. **«cota → eliminado» contradiz o v5**, que tem Cotas Bronze/Prata/Ouro/Diamante (Arts. 12/18/24/30); o
   UTAC110h (R18-110h-B) tirou «cotas» da lista proibida. E há o painel **admin** `/admin/cotas`. **Pergunta:**
   eliminar só no Chatbot e na Vitrine (UI do comprador) e manter admin? Ou manter onde fala de patrocínio?
3. **«repasse» e «sorteio» — o v5 usa-os** (Art. 42 «repasse do Desafio ao vencedor»; Arts. 15/38 em
   negação). Na UI já são 0. A meta «zero» está cumprida; fica só a nota de que um guard global proibindo-os
   contrariaria o v5 (não vou criar esse guard sem decisão).
4. **«lance em R$ → lance em pontos»: conflito UI × v5 × backend.** O v5 (Arts. 16/18/23) diz que o lance é
   registado em **pontos de lance** (1 ponto = R$ 0,01) e que o sistema bloqueia pontos «não creditados». O
   backend (UTAC110d, R18-110d-2) consome **1 crédito de lance** e **não** consome pontos de lance; o campo da
   UI é «Seu lance (em centavos)» (R18-C do 107d). Mudar o rótulo para «pontos» promete um débito de pontos
   que o sistema não faz. **Pela RESSALVA do enunciado: PARAR.** Pergunta: rótulo «Seu lance (em pontos)»
   com 1 ponto = R$ 0,01 (só vocabulário), ou manter centavos até o backend/regulamento convergirem?
5. **Artigos v4 sem correspondente no v5.** Art. 26 (lance mínimo) e Art. 25 (apuração automática) **não
   existem** no v5; Art. 20 (senha R$ 2,00) só tem paralelo no Art. 6º (Passe R$ 2,00), com outro sentido;
   Art. 7/8 (menor lance único) → v5 Art. 14º. **Pergunta:** mapear 7/8 → 14º e **remover** as citações sem
   correspondente (26, 25, 20), mantendo a regra em texto sem número?
6. **«Prêmio especial / Prêmio em disputa»** (edição especial): não é prémio em dinheiro, mas o v5 fala de
   «produto». Trocar para «Produto em disputa»? (decisão de copy).
7. **«leilão» visível = só o nome do contrato `LeilaoGUT`** na Privacidade (facto técnico). Manter (como no
   MC96.3) ou reescrever para «smart contract do DesafioGUT»?
8. **DEBT-034:** recomendo **remover** o campo `indicador` da resposta (0 consumidores). É mudança de
   contrato (HI9) e é backend ⇒ precisa da tua decisão explícita (remover / mascarar / manter+declarar).

## Decisões do operador (R18-110j, 2026-10-16)
- **R18-110j-1 (senhas):** sem troca mecânica; família a família. On-chain antigo → «senha» + «(on-chain,
  legado)». Programado do CardLance → alinhar ao v5 / marcar legado / remover. Bónus do torneio → manter se
  for senha. LGPD → alinhar ao dado real. **Lista exacta antes do SEG0** (secção abaixo) — **aguarda confirmação**.
- **R18-110j-2 (cotas):** decisão adiada até ver o texto do v5 e o painel admin (secção abaixo) — **aguarda**.
- **R18-110j-3 (lance):** a UI alinha ao **backend**: «Crédito de lance». Divergência v5 ↔ backend a registar
  em DEBT.md (autorizado).
- **R18-110j-4 (artigos):** Art. 26 e Art. 25 → remover a citação (e o texto, se depender só dele);
  Art. 20 → Art. 6º; Art. 7/8 → Art. 14º.
- **R18-110j-5a:** «Prêmio especial / em disputa» → «Produto em disputa». **5b:** «LeilaoGUT» fica, com nota
  «nome do contrato on-chain (imutável)». **5c:** DEBT-034 → **remover** o campo `indicador` (excepção ao HI9
  registada); trivial → neste UTAC; se tocar vários endpoints → 110j.1.

### Confirmações do operador (2.ª ronda, 2026-10-16) — fecham a R18-110j-1 e a R18-110j-2
- **1-B:** remover só a COPY errada do ramo Programado do CardLance; o código fica, com comentário «legado /
  inalcançável»; DEBT nova «ramo CardLance/Programado inalcançável desde UTAC108e.1».
- **1-E:** autorizado mexer SÓ na copy do `ComprarFichasModal` («Quanto quer depositar (R$)?», unidade em R$);
  comportamento intacto.
- **1-A/C/D/F/G:** como proposto (A «senha (on-chain, legado)»; C manter; D «senhas on-chain (legado)»;
  F «Art. 6º — Passe Desafio: R$ 2,00»; G manter).
- **2:** cotas = pacotes de patrocínio do v5. Admin mantém tudo. Comprador: tirar «cotas» das sugestões do
  GUTO (`ChatbotWidget.jsx:634`); Vitrine 202/360 → remover se for para o comprador.

## -1.8 Achados novos ao preparar a lista (medidos)
- **O ramo Programado do `CardLance` está MORTO:** `modalidade` é `useState("flash")` (`AppContext.jsx:177`)
  e `setModalidade` **não tem chamador** desde o UTAC108e.1 (seletor removido, `GlassHeader.jsx:17`). Toda a
  copy «consome 1 senha / converter R$ → senha» é inalcançável na UI actual.
- **5.ª família (não estava na minha lista):** `ComprarFichasModal.jsx` — o depósito **PIX** (fluxo VIVO,
  credita saldo R$) pede a quantia em **senhas × R$ 2,00** («Quantas senhas?»). Não compra senhas on-chain:
  é a unidade da quantia.
- **Bónus do torneio** (`EstadoBonus.jsx`, MC93-B/C): são **senhas on-chain** (`senhas_a_creditar`, crédito
  via `adicionarSenhas` pela coordenação, `EstadoBonus.jsx:8`) ⇒ pela R18-110j-1, **mantém-se «senha»**.

## -1.7 Veredicto
*(Actualização após as R18-110j: continua **PARADO antes do SEG0**, à espera da confirmação do mapeamento
das senhas e da decisão sobre cotas — a lista e o texto foram mostrados ao operador.)*

**AJUSTAR → PARADO antes do SEG0.** A medição contradiz o enunciado em 8 pontos, dois deles com paragem
obrigatória pelo próprio enunciado (conflito UI × v5 no lance; DEBT-034 = mudança de contrato). Nada foi
alterado em `src/`, `netlify/` ou `docs/`. As respostas tornam-se **R18-110j-N**.
