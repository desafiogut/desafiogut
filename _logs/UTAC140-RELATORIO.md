# UTAC140 — Edição especial aberta, ranking oculto em tempo real, GUTO de boas-vindas, Top 10 com Passe

Executor: Opus 5.5 · 2026-11-19/20 · baseline `27724ed` → `5b4168d` (main, publicado) · deploy de produção `6aff97d9…`
Veredicto: **FECHADO, com pendências declaradas.** ⏱️ Excedeu as 2 h da HI5 (~4 h), por causa de 8 decisões do operador a meio do trabalho (R18-140-A..H) e de um achado de segurança grave.

## Checklist do enunciado
| | Entrega | Estado |
|---|---|---|
| A | Edição aberta já; cronómetro para a apuração | ✅ `ESPECIAL-RELAMPAGO1` aberta em produção desde 2026-11-20T00:22Z. `termino_em` mantido em **30/11 20:00 BRT** (R18-140-A: o valor gravado era 20h, não 19h). O cartão mostra «A apuração será em: 10d 22:10:59». Para desfazer: `scripts/utac140-abrir-especial.mjs --reverter` |
| B | `ranking_especial` com RLS e Realtime | ✅ em produção (migrações `20261119_utac140*`). Anon lê só ESPECIAL-*; `valor_oculto` sem privilégio de coluna e NULL até à apuração. Provado com a chave anon real: Realtime chega com `new: {}`, `SELECT *` é negado, e a RPC devolve o valor a null mesmo depois de revelado |
| B | `get_ranking_especial()` oculta até à apuração | ✅ o anon recebe sempre o valor a null; o service_role recebe-o, e ele só existe depois de fim + 65 s (`revelar_ranking_especial`, chamada pela apuração) |
| C | GUTO com boas-vindas + FAQ e o nome do produto | ✅ verificado em produção. O GUTO responde «Estamos na Edição Especial Relâmpago! … secreto até 30/11 às 20h … Fritadeira Elétrica Sem Óleo Quad Fry 4,2 L Elgin. Bons lances!». O produto vem da edição, e o padrão «Air Fryer» não foi preciso |
| D | Top 10 só com Passe, 24 h | ✅ `resultado-edicao?acao=completo` exige sessão + Passe (Relâmpago ou Programado) dentro da janela; está em Meus Ativos (`Top10EspecialPasse`). ⚠️ O Top 10 **público mantém os valores** (R18-140-G: a v12 só os desenha assim), por isso a restrição é uma conveniência, não um segredo |
| E | Tabela oculta em tempo real no Menor Lance Único | ✅ na **`TabelaLances` padrão**, com linhas blindadas «🔒» por ordem de chegada (R18-140-H) |
| — | Vocabulário | ✅ 0 linhas novas com «leilão» em `src/` e no GUTO (SEG6, diff baseline..HEAD, com controlo positivo) |

## Decisões do operador (R18-140)
- **A** — manter 20:00 BRT.
- **B** — posição = ordem de chegada. Por valor revelaria o líder e deixaria sondar.
- **C** — RLS para anon só na especial; nenhum valor na tabela antes da apuração.
- **D** — a Frente D assenta na apuração que já existe (UTAC138).
- **E** — push + deploy + abrir.
- **F** — compilar com RAM abaixo de 1 500 MB. A pedido do operador libertei RAM: Edge em segundo plano, Radeon e 10 MCP ociosos.
- **G** — o Top 10 público fica com valores, por causa da v12.
- **H** — «o layout é o layout da edição»: só há dois layouts oficiais (Relâmpago «Dar lance» e Programada «palpite»), e o padrão de valores ocultos já existia.
- **Dinâmico** — «mudar essas coisas assim como as edições, de forma dinâmica no banco de dados» deu o UTAC140b: as regras vivem na edição no Blob (`rankingAoVivo`, `top10.publico/janelaHoras/exigePasse`, `guto.boasVindas`), sem id fixo. Ver `docs/EDICAO-ESPECIAL-CONFIG.md`.
- **Sal** — «pôr sal já» (achado ⚠️1 do validador): o compromisso on-chain passa a `keccak256(valor, endereço, sal de 32 bytes)`. Antes, o valor de qualquer lance saía por força bruta em segundos.

## Erros meus (declarados)
1. **Criei uma caixa própria para o ranking** (`RankingEspecialOculto`), contra a regra dos layouts oficiais. Foi publicada e depois corrigida (`5b4168d`, deploy `6aff97d9…`).
2. **Instrumentos.**
   - O teste de `linhasDoRanking` passava sem afirmar nada (corrigido).
   - Dois mutantes (M6/M14) tinham âncoras partidas pela correcção do validador (corrigidos e re-corridos).
   - O controlo do teste da `TabelaLances` estava mal pensado (corrigido).
   - A 1.ª corrida do SEG6 deu VERMELHO por um erro de instrumento: excluía testes pelo conteúdo e não pelo caminho. As 4 linhas eram da própria guarda.
3. **Desvio de texto:** «Boa sorte!» passou a «Bons lances!», porque a regra de linguagem do GUTO proíbe «sorte».

## Provas
- Suíte canónica: **frontend 1362/1362 · backend 1519/1525 VERDE** (`_logs/UTAC140_SUITE.txt`).
- Mutação: **18/18** mortos, md5 restaurado (`_logs/UTAC140_SEG3_MUTACAO.txt`).
- Validador adversarial (SEG4): **APROVADO COM RESSALVAS** (`_logs/UTAC140_SEG4_VALIDADOR.md`). ⚠️2 e ⚠️3 foram corrigidos por ele (`dfc8c53`). ⚠️1 (sem sal) foi corrigido por decisão do operador (`64ab646`). ⚠️ **Não re-validados:** o sal, a configuração dinâmica (UTAC140b, parcialmente revista) e a correcção de layout.
- Produção: o SEG6 está VERDE (`_logs/UTAC140_SEG6_saida.txt`), e há capturas em `_logs/UTAC140_PROD_mercado*.png`.

## Pendências (não executadas)
- ⚠️ **O selo da `TabelaLances` diz «🕒 Em breve» enquanto o cartão diz «🟢 Aberta».** Segue o `EM_BREVE_MODE` global (pré-existente). Não lhe toquei: decide o operador.
- **DEBT-098:** os lances emitidos antes do sal continuam recuperáveis. Falta publicar valor + sal na apuração.
- **DEBT-099:** limites declarados (ℹ️ do validador).
- **DEBT-100:** o frontend do UTAC140 só chega ao Android com um AAB novo.
- Textos antigos do `CardLance` («Seu lance (em centavos) · R$ 0,05») contradizem os «pontos». Não foram tocados.
