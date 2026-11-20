# UTAC140 — SEG-1 (medição) · Opus 5.5 · 2026-11-19

-1.1 **Repo:** HEAD `27724ed` (= baseline, fecho do UTAC139). `git status` tem ficheiros alheios (`.agents/`, `.gitignore`, `.mcp.json`, `package-lock.json`, `_logs/MC10x_*`), que não são deste UTAC e não entram em commits.
-1.2 **Caminhos:** `ContagemDecrescente.jsx` está por confirmar no SEG0. `MercadoLances.jsx`, `MeusAtivos.jsx`, `_lib/guto-perfis.mjs`, `resultado-edicao.mjs` e `_lib/apuracao-especial.mjs` existem.
-1.3 **Edição em produção** (`GET /edicoes`, `agora` 2026-11-19T23:03Z): `ESPECIAL-RELAMPAGO1` · status `agendado` · produto «Fritadeira Elétrica Sem Óleo Quad Fry 4,2 L Elgin» · `inicio_em` 2026-11-30T22:00Z · **`termino_em` 2026-11-30T23:00Z = 20:00 BRT**.
-1.4 **Medições:**
- **Lances:** `public.lances` tem 0 linhas. Os lances vivem no Key-Per-Bid (Blobs). Em mainnet, `lances-flash` já devolve os lances blindados (`valor:null`, `repetido:null`) até à consolidação. O MC28.1 R9 / G-2 (anti-bot) proíbe expor a unicidade durante a edição.
- **Apuração/Top 10 (UTAC138):** `_lib/apuracao-especial.mjs` grava vencedor + Top 10 no Blob `edicoes-resultados`. `GET /resultado-edicao` é **público** e o `ResultadosEdicao.jsx` mostra-o a todos durante 24 h.
- **Supabase no frontend:** só há cliente **anon** (`persistSession:false`). Não há sessão Supabase Auth: o login é Privy + JWT próprio (`user-session`). O papel `authenticated` nunca chega à BD. Hoje o Realtime só subscreve `config_remota`.
- **Passe:** `public.passes_inventario` (3 linhas, só service_role) com `passes_relampago` / `passes_programado`. Desde o UTAC129/136, nem o lance nem o palpite consomem Passe.
- **Regulamento v6.1:** não fixa horas para a especial (grep 19h/20h/30/11 dá 0).
- **«leilão» no frontend:** já existem 66 ocorrências em 19 ficheiros de `src/` (fora de testes). A guarda verifica o que este UTAC **introduz**.
- **Cron de anúncio** `scheduled-anuncio-especial`: está preso a `ESPECIAL-AIRFRYER` e não dispara com esta edição.
-1.5 **Disco:** 16 GB livres em C:.

## ⚠️ Conflitos entre o enunciado e o medido (R20, não resolvidos pelo executor)
1. **`termino_em`:** o enunciado diz «manter 19:00», mas o valor em produção é **20:00 BRT**. A apuração às 19:00 obriga a mudá-lo para 22:00Z.
2. **«posição» com valores ocultos:** uma posição por valor diz quem lidera e permite sondar (lance barato → ver em que lugar entra), o que anula o sigilo e o anti-bot MC28.1. A posição por ordem de chegada não revela nada.
3. **RLS «autenticado»:** os utilizadores não têm sessão Supabase, logo uma política para `authenticated` torna a tabela invisível e o Realtime fica mudo.
4. **Frente D:** o operador decidiu, durante o UTAC, assentar sobre a apuração que já existe (Blob `edicoes-resultados` / `resultado-edicao`). Isto implica tirar os valores do Top 10 do endpoint público.

**Veredito: AJUSTAR.** Os conflitos 1 a 3 vão ao operador antes do SEG0.

## Decisões do operador (R18-140, 2026-11-19)
- **R18-140-A:** manter `termino_em` = 30/11 **20:00 BRT** (23:00Z). O cronómetro e o GUTO dizem 20h (derivado da edição, não fixo).
- **R18-140-B:** a posição do ranking ao vivo é a **ordem de chegada**. O ranking por valor só existe na apuração (Top 10).
- **R18-140-C:** RLS com SELECT para **anon** só na `ESPECIAL-RELAMPAGO1`. A tabela não guarda valor antes da apuração (NULL), o payload do Realtime não leva valor e o endereço vai encurtado.
- **R18-140-D (mensagem do operador durante o SEG-1):** a Frente D assenta na tabela que já existe na app (apuração UTAC138, Blob `edicoes-resultados` / `resultado-edicao`), não numa RPC SQL nova.
- **R18-140-E:** push para main + deploy de produção (`--prod --build`) + abrir a especial logo a seguir. O validador adversarial corre em paralelo e as correcções dele ficam declaradas.
- **R18-140-F:** compilar com 1 360 MB livres (excepção à A14, como nos UTAC130/132/136/137).
- **R18-140-G (durante o SEG3):** «o top 10 precisa ser visível para usuários da v12». Medido: a v12 chama `resultado-edicao` sem token e o `ResultadosEdicao` dela descarta linhas sem valor. Decisão do operador: o **Top 10 público mantém os valores** (forma do UTAC138). A tabela de Meus Ativos continua só para quem tem Passe (`?acao=completo`), mas deixa de ser segredo: é conveniência, não restrição.
- **R18-140-H (depois do deploy, perante o ecrã):** «não, vc errou» → «o layout é o layout da edição» · «o layout das edições já possuía o dar lance, assim como o da programada da palpite; aqueles são os únicos dois layouts oficiais de edição» · «já tínhamos esse padrão com as edições que ainda não estavam ativas no frontend». A caixa própria `RankingEspecialOculto` **saiu**. Os lances ao vivo da especial passam a ser linhas **blindadas «🔒»** da `TabelaLances` padrão (o padrão das edições com valores ocultos), através do hook `useRankingEspecial`. A `TabelaLances` aceita o endereço já encurtado **só em linhas blindadas**.
