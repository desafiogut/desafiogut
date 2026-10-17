# UTAC110j — SEG4 · VALIDADOR ADVERSARIAL

Validador: Claude Code (Opus 5.5), subagente independente · 2026-10-16 · instruído a REFUTAR, não a aprovar.
Objecto: patch não commitado `utac110j.patch` (md5 `faa5b52f2eb9d1d354d3eee16103e2b9`) sobre `0c99cc9` (= origin/main).

## VEREDICTO: **PARCIAL — 1 bloqueante**

O núcleo do que o executor fez **confirma-se** (suíte, mutação 14/14, comportamento do depósito, DEBT-034, mapa
de artigos). Mas **uma alegação dele é refutada**: «decisão 3 — a UI já dizia "crédito de lance": nada a mudar».
Há uma promessa visível de «lance que debita saldo R$» **num ficheiro que o próprio executor editou**, e as guardas
novas deixam passar 7 de 9 reintroduções adversariais.

---

## ⛔ BLOQUEANTE B1 — «o lance debita do saldo» continua na edição especial (decisão 3 não cumprida)

- `desafio-gut/frontend/src/components/edicao-especial/CardEdicaoEspecial.jsx:193` (fallback) e
  `desafio-gut/frontend/src/i18n/pt.js:130` (`edicao.especial.regra`):
  **«Lance relâmpago · vence o menor lance único · a partir de R$ 0,01 (debita do saldo)»**.
- O backend (UTAC110d, R18-110d-2/110d-3) consome **1 crédito de lance** e **não** debita R$
  (`DEBITO_SALDO_LANCE_ATIVO = false`; o próprio `CardLance.jsx:122` diz «o lance Relâmpago já não debita»).
  A R18-110j-3 manda a UI alinhar ao backend («crédito de lance»).
- O executor editou este MESMO ficheiro (linhas 118/183, «Prêmio» → «Produto») e o mesmo bloco do `pt.js`, e
  declarou no log `UTAC110j-alinhamento-v5.md` §SEG0 linha «3 | — | … nada a mudar». **Refutado.**
- Alcance: latente hoje (a única especial, `ESPECIAL-AIRFRYER`, saiu da janela de retenção de 24 h), mas é o texto
  que qualquer edição especial futura mostra no Início. Nenhuma guarda o apanha (`PROMESSAS_V4` não tem «debita»).
- Correcção (trivial, só copy): mesma frase do CardLance — «Cada lance consome 1 crédito de lance (Passe
  Relâmpago)» — no fallback e no `pt.js` (o teste `especial-i18n` exige que batam) + entrada na varredura global.

---

## Tabela de alegações

| # | alegação do executor | resultado | evidência |
|---|---|---|---|
| A1 | suíte frontend 1159/1159 · backend 1311/1317 (6 skipped) VERDE | **confirmada** | harness `mc966` no worktree, foreground, RAM 1808 MB: `frontend: VERDE 1159/1159 · backend: VERDE 1311/1317` (3 min 56 s) |
| A2 | mutação 14/14 PROVADOS | **confirmada** | `node scripts/utac110j-prova-mutacao.mjs` no worktree: baseline fe 35/0, fn 8/0; 14/14 PROVADOS; md5 dos alvos restaurado |
| A3 | «decisão 3: a UI já dizia crédito de lance — nada a mudar» | **REFUTADA** | B1 acima (`CardEdicaoEspecial.jsx:193`, `pt.js:130`) |
| A4 | 1-E: depósito só copy, comportamento intacto | **confirmada (com ressalva R1)** | `PRESETS=[1,5,10]`, `MIN/MAX_QTD`, `valorBRL = qtd*2`, `body = {endereco, qtd}` inalterados; `setQtd(p)` igual. Diff só em texto/aria |
| A5 | 1-B: código do ramo Programado fica, só a copy sai | **confirmada** | `isProgramado`, gate on-chain, `trocarPorSenhas`, `desabilitado` intactos; só strings → `MSG_PROGRAMADO_LEGADO`; rótulo Programado cai em «Dar lance» (ramo inalcançável: `setModalidade` sem chamador) |
| A6 | Vitrine: só copy | **confirmada** | `cotaInfo` deixa de ser lido no `SlotCard`, mas o `apiGet("cotas")` e as props dos chamadores continuam (`Vitrine.jsx:418,465`) |
| A7 | DEBT-034: só o campo removido | **confirmada** | diff de `referral.mjs` = 1 linha removida + comentário. Nenhum outro endpoint devolve o endereço do indicante: `comprar-senhas.mjs:359` (log mascarado), `referral.mjs:151/190` (Blob de auditoria, por desenho), `GET /referral` devolve só estatísticas, `/notificacoes` devolve indução com 1.º nome (sem endereço). Consumidores de `.indicador` da resposta: **0** em `src/`, `_tests/`, `android/` |
| A8 | 1-D: lista de exclusão alinhada ao `conta-delete` | **confirmada só para o item das senhas** (ressalva R2) | `SUPA_DELETE_POR_CLIENTE = ["saldo_rs","troco_senhas","wallet"]` (`_lib/conta-delete.mjs:37`); o texto novo («registro off-chain de senhas»; on-chain retido) é **verdadeiro** |
| A9 | Art. 20→6º, 7/8→14º, 25/26 removidos | **confirmada** | v5 `docs/REGULAMENTO-v5.md:37` Art. 6º = Passe R$ 2,00; `:71` Art. 14º = menor lance único. Varredura de citações visíveis em `src/` (comentários fora): só `Art. 6º` e `Art. 14º` fora do gate |
| A10 | «Prêmio» → «Produto»; LeilaoGUT com nota; cotas fora da UI do comprador | **confirmada** | 0 «Prêmio/prémio» visível em `src/`; `Privacidade.jsx:125`; Chatbot/Vitrine sem cotas; `pages/admin/Cotas.jsx` intacto |
| A11 | testes de UTACs fechados actualizados preservando a invariante | **confirmada, 1 sobre-afirmação** | ver §Testes |
| A12 | 2 DEBT novas (042/043) + DEBT-034 fechada | **confirmada** | diff do `_logs/DEBT.md` |

## (c) Comportamento — nada alterado (verificado ficheiro a ficheiro)
`ComprarFichasModal` (constantes, cálculo e corpo iguais) · `CardLance` (ramos, `desabilitado`, gates iguais; só
strings) · `Vitrine` (dados/props iguais) · `referral.mjs` (só o campo). ⚠️ Perde-se a `conv.message` do servidor no
ramo legado (substituída pela mensagem única) — irrelevante (ramo inalcançável).

## (g) Testes modificados
- `mc991-ui` — contrato do MC99.1 **invertido**, autorizado pela R18-110j-2. OK.
- `utac107c-deposito` — a coerência «o CardLance converte» passou a «a Carteira tem a compra do Passe». Invariante
  («o texto do depósito tem de ser verdade») mantida. OK.
- `artigosUI` — passa ao mapa `EXIGIDO_V5` e **ganha** a verificação «o assunto está no próprio artigo do v5». Reforço.
- `citacoesRegulamento` — troca as âncoras v4 por v5 e acrescenta a guarda de órfãos. OK.
- `utac109e`, `utac106c-render`, `MeusAtivos`, `utac0008`, `utac105c` — textos/âncoras; a âncora de corte
  «Art. 14º» só existe no rodapé (verificado), logo `trofeusNaLista` não ficou vácuo.
- **Sobre-afirmação:** o teste novo «1-D · a lista de exclusão diz o que o conta-delete APAGA e RETÉM (cruzado com o
  backend real)» só cruza o item das senhas. A mesma lista diz «Perfil, preferências e **vínculos de indicação**»
  eliminados — e o `conta-delete` **não toca** em nenhum store `referral*` (grep = 0). O título vende mais do que mede.

## Mutantes do VALIDADOR (worktree, backup fora do repo, md5 restaurado e conferido)
Todos correram contra a **suíte frontend inteira** (TAP) e/ou o harness completo.

| id | mutante | resultado |
|---|---|---|
| V1 | Dashboard: tile «Cada senha custa R$ 2,00 (Art. 6º)» | morto — mas só pela guarda **alheia** do UTAC109f (tiles byte-iguais), não pelas do 110j |
| V1b | OP: «Cada senha custa R$ 2,00 (Art. 6º).» no estado vazio | **SOBREVIVEU** (1159/1159) — `PROMESSAS_V4` só conhece «Custo de cada senha»; `artigosUI` aceita porque «R$ 2,00» é uma das chaves do Art. 6º |
| V2 | OP: «prêmio em disputa · converter R$ 2,00 em senha» | **SOBREVIVEU** — `Pr[eê]mio` é sensível a maiúsculas; «converte R\$» não casa «converter R$» |
| V3 | Configurações: linha `["Artigo 25", "Apuração pelo painel interno."]` | **SOBREVIVEU** — todas as guardas exigem `Art.`; «Artigo N» é invisível |
| V4 | `referral.mjs`: `indicante: mascararEndereco(r.indicador)` na resposta | **SOBREVIVEU** (backend 1311/1317) — o teste só procura a chave `indicador` e o endereço COMPLETO |
| V5 | modal de exclusão: «As suas senhas on-chain também são apagadas.» | **SOBREVIVEU** — o teste do modal só exige presenças, não proíbe a afirmação falsa |
| V6 | Meus Ativos: «· conheça as cotas Diamante e Ouro» | **SOBREVIVEU** — a guarda de cotas só olha Chatbot e Vitrine |
| V7 | MercadoLances: `setModalidade: mudarModo` + `mudarModo("programado")` | morto — só pela guarda **alheia** do UTAC108e.1 (que lê o MLC) |
| V7b | o mesmo alias em `Configuracoes.jsx` | **SOBREVIVEU** — a guarda 1-B procura o NOME `setModalidade\s*\(`; um alias torna o ramo legado alcançável sem a guarda ver |

**7 de 9 sobrevivem às guardas do 110j** (2 só morreram por guardas de outros UTACs). Mesma família de defeito já
registada na série (UTAC110h.4 F2): guarda por **nome/forma** em vez de por **valor/comportamento**.

## Ressalvas (não bloqueantes)
- **R1 (média) — rótulo do depósito engana:** `ComprarFichasModal.jsx:326` pergunta «Quanto quer depositar (R$)?»
  mas o campo numérico logo abaixo (`:334-346`) é a **quantidade de unidades de R$ 2,00** (`value={qtd}`):
  escrever «10» deposita **R$ 20**. O «Total a pagar» mitiga, mas o rótulo diz o contrário do campo. Os botões
  ficaram «R$ 2 / R$ 10 / R$ 20» (sem «,00», diferente do resto do modal).
- **R2 (média, LGPD) — 1-D é parcial:** a lista continua a afirmar eliminados «vínculos de indicação» (não apagados)
  e omite `pontos`, `eco_quildo`, `palpites`, `resgates` (com **morada**) e `google_play_compras`, que o
  `conta-delete` não apaga nem a página declara como retidos; o modal diz «todos os dados pessoais serão
  permanentemente removidos». Pré-existente; o executor declarou só `pontos`/`eco_quildo`.
- **R3 — guardas contornáveis:** ver tabela de mutantes (V1b, V2, V3, V4, V5, V6, V7b).
- **R4 —** `SemSaldoBanner.jsx:36` «⚠️ Sem saldo. Carregar agora?» no MLC fala de R$ para o lance (declarado pelo
  executor; hoje escondido pelo `EM_BREVE_MODE`).
- **ℹ️ —** chaves órfãs `pt.js:18` `nav.cotas` e `pt.js:29` `dash.senhas`; `CreditoStatus.jsx:25` («Crédito de N
  senhas…») sem consumidor; `CardLance.jsx:354` «🔗 N senhas» só no ramo legado; `Sidebar.jsx:162` mostra a
  contagem on-chain sem o rótulo «legado» (não diz «senha», só o número). Bónus do torneio mantém «senha» (1-C,
  decidido).

## RAM
Trim (`EmptyWorkingSet`, nada fechado): **1426 → 1617 → 1808 MB** antes da 1.ª suíte. Harness corrido a ≥1500 MB.

## Worktree
Criado por `node scripts/worktree-helper.mjs criar C:/Users/Moltbot/tmp-utac110j-val/wt 0c99cc9` (4 junctions);
patch aplicado com `git apply --whitespace=nowarn` (exit 0, sem `--ignore-whitespace`). No fim: patch revertido
dentro do worktree (`git apply -R`, exit 0), removido pelo helper (4 `rmdir` das junctions → `git worktree remove`
exit 0, `ok: true`). `node_modules` reais depois: 380 / 568 / 500 / 414 (não medi antes — sem comparação).

## ⚠️ INCIDENTE DO MEU INSTRUMENTO (declarado — viola a regra 3)
Um comando encadeado meu falhou num `&&` (erro de sintaxe no meu script de mutantes) e o `node --test` seguinte
correu **com a lista de ficheiros vazia, no directório do repo PRINCIPAL** (descoberta automática do Node).
Efeitos medidos:
- correu scripts legados `test-*.mjs` (ex.: `scripts/test-mc11.12.mjs`) que fazem **`npm run build`** ⇒
  `desafio-gut/frontend/dist/` do repo principal foi **reconstruído às 21:03:02** (gitignored; é o `dist/` que
  alimenta o APK — não reutilizar sem `npm run build:apk`);
- vários desses scripts (`desafio-gut/frontend/scripts/test-mc11.*.mjs`, `test-mc9.*.mjs`, `scripts/test-mc11.*`)
  fazem **pedidos HTTP de leitura a produção** (`silly-stardust-ca71bc.netlify.app`) — não consegui listar quais
  responderam (o TAP dessa corrida foi sobrescrito pela corrida seguinte: 2.º erro meu);
- `desafio-gut/scripts/test-darLance.js` / `test-lance.js` **falharam antes de qualquer transacção**
  («invalid private key» no `new Wallet`) — nenhuma tx on-chain.
- **Ficheiros versionados intactos:** regenerei o diff dos 25 ficheiros + 2 novos no repo principal → md5
  `faa5b52f…` **= patch do executor**; nenhum ficheiro novo fora de `dist/`; `package-lock.json` sem alteração.
Lição: nunca encadear `cd` e `node --test $FILES` sem abortar quando `FILES` está vazio (`|| exit 1`).

## Limites (não medido)
- Não renderizei os ecrãs num browser (só fonte + SSR dos testes); B1 inferido por leitura do fallback e do `pt.js`.
- Não corri `vite build` deliberadamente no worktree (o build do repo principal aconteceu por acidente — acima).
- Não medi produção (excepto o acidente) nem o APK.
- Não verifiquei o conteúdo das 7 falhas «alheias» possíveis noutros UTACs para mutantes em mais ficheiros.
