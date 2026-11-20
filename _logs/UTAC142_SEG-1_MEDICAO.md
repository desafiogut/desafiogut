# UTAC142 · SEG-1 — MEDIÇÃO (nada alterado)

Executor: Claude Code (Opus 5.5) · 2026-11-20 00:52 BRT · spec `_logs/UTAC142.spec.yml`

## -1.1 Estado do repo
- `git rev-parse --short HEAD` → `3bbdebe` · `git log origin/main..HEAD` → vazio.
- `git status`: **21 ficheiros modificados por commitar = UTAC141 (executor Hermes)**:
  CardLance, CartaoEdicao, TabelaLances, CardEdicaoEspecial, `_estilo-especial.js`, AppContext,
  useRankingEspecial, MercadoLances, OfertasProgramadas e 9 testes. O `_formAcaoEdicao.jsx` é novo.
- O gateway Hermes está **activo** (`hermes_cli.main gateway run`, PIDs 11600/3916).
- **Produção já serve o UTAC141 por commitar**: `curl /` → `assets/index-BLrf2o6e.js` = `dist/assets/index-BLrf2o6e.js`
  (build local 00:14). Os achados ⚠️1-4 do validador-2 (ficheiros de 00:20) estão aplicados na árvore e,
  pela ordem temporal, **depois** do build. O SEG4 do UTAC141 não fechou.

## -1.4 Medições por frente
**A — débito 1/2.** O ledger (`_lib/ledger-lance.mjs:174`) só recusa `quantidade <= 0`. `lance-relampago.mjs`
não tem nenhum mínimo de 3. Na BD de produção (`pontos.historico_lance`, motivo `lance`) há deltas
**−1** (00:53:29Z), **−2** (03:25:29Z), −3, −5, −32, −100, todos gravados. ⇒ **O servidor debita 1 e 2.** O sintoma
coincide com o defeito de ecrã que o UTAC141 Frente B corrigiu (saldo global não relido, `refetchPontosAgora`
fora do `value`).

**B — Início.** `Dashboard.jsx:426`: a Especial usa `BotaoDarLance` → `navigate("/mercado")`. Foi uma escolha do
UTAC138 (`:36`: «o lance faz-se na aba Menor Lance Único»). A variante `embutida` do `CardLance` (UTAC141)
já existe por commitar.

**C — Passe.** **R18-129-3** (decisão do operador, UTAC129): «libertar só o LANCE Relâmpago; o palpite
continua a consumir Passe Programado». `lance-relampago.mjs:251-256` documenta isso. Hoje o Passe só dá
+100 pontos na compra e abre o Top 10 (`top10.exigePasse`). Consumir o Passe no lance **reverte uma decisão
do operador**. O UTAC136 libertou também o palpite: o Passe hoje não se consome em nenhum dos dois. O
Regulamento v6/v6.1 (Arts. 6º/7º) descreve o que o Passe dá, e este UTAC está proibido de o alterar. A razão dessa decisão foi o furo F1 do UTAC128: a missão +10 ficava atrás de uma compra.

**D — nome.** O `ranking_especial` guarda só `endereco` com `CHECK '^0x....…....$'` e não tem coluna de nome. Mudar
isso exige migração e alteração da RPC `get_ranking_especial` (ST3). O nome que existe vem do
`nomeExibicao` = `userLabel` (`AppContext.jsx:586`): `google.name || google.email || email.address || …`.
⇒ Sem nome Google, o «nome» é um **e-mail** (risco L/LGPD). O valor vem do **cliente** (`body.nomeExibicao`)
e não é verificado.

**E — avisos.** Já existem desde o MC15.7: `registrarEventosDeLance` com `lance_unico` / `perdeu_exclusividade`
(`_lib/notificacoes-usuario.mjs:146`). Só são chamados no **ramo LEGADO** (`lance-relampago.mjs:347`, Sepolia)
e nunca na mainnet. Não existe aviso «voltou a ser». Risco: um aviso «és o menor único» funciona como
**oráculo**. Com lances baratos (1 ponto), quem varre 1..N e lê os avisos fica a conhecer os valores alheios.
Isso anula o desenho do UTAC140 (valores ocultos + sal).

## -1.5 Ambiente
Disco: 17 GB livres (OK). RAM livre: **846 MB < 1500**, portão A14 **fechado** (a suíte não pode correr agora).

## ⚠️ Conflitos (R20 — não resolvidos pelo executor)
1. **Árvore partilhada:** as Frentes B e D tocam nos ficheiros do UTAC141, que estão por commitar,
   publicados e com o SEG4 aberto, numa sessão Hermes activa.
2. **A:** não há trava de 3 e o servidor debita 1 e 2. Fica só o teste de regressão?
3. **B:** reverte o «lance na aba MLC» do UTAC138.
4. **C:** contradiz a R18-129-3.
5. **D:** precisa de migração, e o fallback do nome pode ser um e-mail.
6. **E:** oráculo de valores ocultos. Falta definir «portador de Passe», porque o Passe já não se consome.

## -1.7 Veredito
**PARAR / AJUSTAR** — perguntar ao operador antes do SEG0.

## Decisões do operador (R18-142, 2026-11-20 ~01:00 BRT)
- **R18-142-A** árvore partilhada: **o executor do UTAC142 assume o UTAC141 e commita-o** como `tipo(UTAC141)`, e só depois segue o UTAC142.
- **R18-142-C** Passe: **1 Passe Relâmpago consumido POR LANCE na Especial**, além dos pontos. Sem Passe → recusa. Reverte a R18-129-3 **só para a Especial**.
- **R18-142-E** avisos: **ligar na mainnet com limite anti-oráculo**: só portadores de Passe, sem valor no texto, estado reavaliado por janela e não por lance.
- **R18-142-D** nome: **migração autorizada**; «PrimeiroNome I.» só de nome Google; o servidor recusa `@`; sem nome → endereço curto.
- A (débito 1/2) e B (layout do Início): sem pergunta. A = teste de regressão (o servidor já debita). B = FormularioAcao no Início.

## Publicação (2026-11-20, autorizada pelo operador: «pode aplicar a migração, fazer o deploy e o push»)
- Hermes (sessão 20261119_220414_a4e044) recebeu o pedido de parar e respondeu: «UTAC141 parado — sem alterações por gravar».
- Migração `utac142_ranking_nome` aplicada em produção. Verificado: coluna `nome_exibicao` presente; `registar_lance_especial(p_id, p_edicao_id, p_endereco, p_nome)`; o anon lê o nome mas não `valor_oculto` e não pode executar o registo; 6 linhas intactas.
- Rascunho `6affcaae…`: guarda de rede igual à da produção anterior (Sepolia só como constante da guarda, mainnet no chunk web3).
- Produção `6affcbf4…`: `CDN requesting 0 files` (o artefacto do rascunho), bundle `index-FfbOXuQZ.js`. RPC anon devolve `nome_exibicao` com `valor_oculto: null`; `SELECT *` anon → 401; `lance-relampago` 405 (GET); `scheduled-lider-especial` 403 (agendada).
- Pendente: o validador adversarial (SEG4) e a suíte completa (RAM < 1500 MB, A14).
