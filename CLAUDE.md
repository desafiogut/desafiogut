# DESAFIOGUT — Única Fonte de Verdade
> 🎯 **UTAC110j.5 (2026-10-18, Opus 5.5) — a UI passou a falar em PONTOS de lance + proporções fixas no app. COMMITADO e FECHADO: `77081f1` (UI) + `3baca90` (resíduo da DEBT-075); **DEBT-075 fechada no texto**. `CardLance` mostra saldo e CUSTO do lance em pontos, só deixa licitar até ao saldo (fail-closed), trata `saldo_pontos_insuficiente` (números do servidor + relê + atalho «Ver missões de hoje») e mostra `pontosLanceConsumidos/Restantes`; Carteira «⭐ Pontos de lance» (+ nota de conversão só a quem foi convertido); balão do Passe Relâmpago +200 pontos; **Regras Oficiais publicam as proporções fixas** (login +5, missão +10, indicação +50 até 10/mês, 5 acertos +50, ciclo 225/15 dias, 1 ponto = R$ 0,01, Passe +200 não é condição) ANTES do 1.º capítulo, com cada número amarrado às constantes do backend por teste; Meus Ativos com o bónus em +50 pontos. **Resíduo do modelo antigo fechado:** `CardEdicaoEspecial.jsx:193` e `i18n/pt.js:131` deixaram de dizer «1 crédito de lance» — passaram a «cada lance gasta o seu valor em pontos de lance · o Passe dá +200 pontos de lance» (o texto antigo fica em comentário), com asserção que proíbe o crédito de reaparecer e mutante **M23 → RED**. ⚠️ **Desvio declarado do enunciado:** o operador pediu «1 crédito → 200 pontos»; escrito à letra ficaria «cada lance consome 200 pontos», que é FALSO (200 é o que o Passe DÁ; o lance custa o seu próprio valor, Art. 18º). Suíte **1239/1239 frontend VERDE** e mutação **23/23**; backend 1392/1398. Validador adversarial: **APROVADO COM RESSALVAS, 0 bloqueantes** — refutou a frase «ficam garantidos pelo menos 210 pontos líquidos» (só vale com lances de 1 ponto; corrigida, com teste e mutante) e achou **6 mutantes que a suíte não apanhava**; por decisão do operador (R16) **VM1 e VM3 foram fechados antes do commit** com dois testes de FONTE e o limite declarado dentro deles (o harness não tem DOM nem gatilho de releitura isolado). Âmbito: **4 ficheiros fora da lista autorizada** — 3 justificados (`lib/... [truncated]
>
> Atualizado em: 2026-10-18 (UTAC110n.1: **as 8 decisões do operador sobre o UTAC110n** — **1) CICLO DE MISSÕES 15 dias × 15 = 225 brutos / 210 líquidos**: 14 dias davam **196 LÍQUIDOS**, abaixo dos 200 que o próprio ciclo promete, porque a missão de +10 exige dar um lance e o lance mínimo custa 1 ponto (achado ⚠️2 do validador SEG8, corrigido por decisão e não por comentário): `PONTOS_CICLO_MISSOES` 200→**225**, `DIAS_CICLO_MISSOES` 14→**15** (derivado por `ceil`), testes D1/D2/D3/D2b medem os dois lados. **2/3) MIGRAÇÕES autorizadas**: conversão de créditos (DEBT-071) e conversão das senhas antigas (DEBT-076) — ambas **provadas em PostgreSQL 16 real** e **APLICADAS em produção em 2026-10-18, com autorização explícita do operador**, pela ordem índice → créditos → senhas, verificadas uma a uma: índice `pontos_pontos_lance_idx` criado e confirmado em `pg_indexes`; as duas conversões deram **no-op** (0 créditos, 0 dívidas, soma de `pontos_lance` 25 antes e depois, 0 entradas novas no histórico) e a invariante do ledger fechou a 0. Commit **6f3a4d2** com push para `main` por **bypass declarado** do ruleset (DEBT-056). Medido em produção (vjslwowwrpcawijdiksm, leitura por `supabase db query --linked`): `public.pontos` tem **2 linhas, 0 com créditos, 2 com pontos de lance** e `rankings_ciclo` tem **0 dívidas abertas** ⇒ as duas conversões são hoje **no-op**; o que muda de facto é o **índice do ranking**, medido **AUSENTE** em produção (só `pontos_pkey` e `idx_pontos_atualizado`), enquanto `GET /ranking-pontos-lance` já está no ar. **4) DEBT-076**: senhas antigas convertem-se a **1 senha = 200 pontos** — migração nova `20261018_utac110n1_conversao_senhas_legadas.sql` (UPSERT em `public.pontos` porque a dívida vive em `rankings_ciclo` e há endereços sem linha de saldo; zera `senhas_a_creditar` na MESMA instrução; ref com instante; `liquidado_em` fica NULL de propósito porque significa «emitido on-chain» e o CHECK exige `bonus_emitido`). O worker e o sweeper **ficam no códi... [truncated]
> Anterior: 2026-10-18 (UTAC110m.2: **Regulamento corrigido para deixar de prometer o que o código não faz**. FRENTE B (Arts. 21º/32º): saiu «perde o acesso às métricas do Desafio e ao benefício de lance/palpite opcional da edição seguinte» — **não existe mecanismo de perda/degradação de métricas** (medido: a palavra «estratégic» só aparece dentro do próprio texto do Regulamento); passou a «mantém integralmente os pontos e o ECOQUILDO … e as métricas e dados estratégicos **a que o Passe adquirido dá acesso**». FRENTE C (Art. 48º): a alínea II («Aquisição de novos Passes Desafio no aplicativo») **saiu** e a restrição subiu ao **caput** — «é utilizado exclusivamente no site oficial … não sendo aceite como forma de pagamento dentro do aplicativo DesafioGUT» (R18-110e-2; medido: `lastro-eco-quildo.mjs` conta «usado no site oficial», `MinhaCarteira` é só leitura). **Porquê no caput e não num parágrafo único:** a 1.ª redacção usava um «Parágrafo único» e o validador da 2.ª ronda mediu que `RegrasOficiais.jsx:74-75` (ramo `else if (ultimo)`) cola qualquer parágrafo à última alínea — o parágrafo saía **dentro do `<li>`**, invertendo a hierarquia legal; o renderer está fora da autorização, logo contornou-se no texto e o defeito do renderer ficou na **DEBT-070**. FRENTE D (Arts. 57º/69º): **DPO** `dpo@grupouniaoetrabalho.com.br` (Francisco Canindé Marinho) passa a canal de LGPD **antes** do Gmail, e o «exclusivamente» do Art. 69º saiu. As três frentes entraram **nos três ficheiros da invariante** (v5, GUTO e `guto-regulamento.mjs`): `corpo(v5) == corpo(GUTO)` **OK byte-a-byte (17521 = 17521)**. ⛔ **FRENTE A (Arts. 9º/53º — o cartão é RESGATADO aos 50 pontos, não «adquirido» por PIX) NÃO FOI FEITA**: o gate legal cita o Art. 9º e `citacoesRegulamento` exige **trecho literal**, pelo que corrigir o artigo obriga a tocar em `TermosConsentimento.jsx` (UI) **e** em `_lib/guto-perfis.mjs` (âncora verbatim do GUTO em `mc963`) — os dois **fora da lista de autorizações**; medido, o m... [truncated]
> Anterior: 2026-10-18 (UTAC110i.2: **o APK passa a usar Google Play Billing** — o bloqueante do AAB corrigido. FRENTE A: o detetor de plataforma (`useRecursosApp.js:detectarPlataforma`) passou a reconhecer o wrapper nativo pelo **Capacitor** (`isNativePlatform()` + `getPlatform()`); antes só reconhecia `window.GUT_NATIVE`, que **nada no repositório escreve** (1 ocorrência, a própria leitura) ⇒ o APK classificava-se «pwa» e ia buscar a chave `pwa` da config. Zero alterações em Java (`MainActivity` intacto). FRENTE B: `isPagamentoNativoAtivo.android` ligada **em produção nas DUAS cópias** da config — Supabase `config_remota:recursos_app` e Blob `config-experiencia:recursos_app` (que estava **vazio** e respondia com os defaults) — verificado ao vivo: `android true` · `pwa false` · `ios false`, `isLeilaoAtivo` intacto. FRENTE C (opção «c» do enunciado, aplicada por **ausência de resposta do operador** dentro do tempo): no APK o Passe deixou de ter PIX — `androidNativo()` (só Android; **iOS mantém o PIX**, porque não há IAP implementado e bloqueá-lo partiria um fluxo que funciona) devolve `pix_indisponivel_no_apk` com mensagem a remeter para desafiogut.com; a condição é a **ponte nativa**, nunca `plataforma === "android"` (que é sobreponível por `?plataforma=`), e o mutante C3 prova o dano dessa versão (14 RED, o PWA perderia o PIX). ⚠️ **Consequência declarada e não pedida:** o mesmo detetor governa `isLeilaoAtivo`, logo o APK passa a mostrar a **vista de conformidade** do Mercado em vez do leilão (é o desenho do modelo por plataforma, mas é mudança visível). Suíte **1203/1203 frontend · 1351/1357 backend VERDE** (RAM 1849 MB); mutação **8/8** com md5 restaurado — o mutante **C4 nasceu do validador**; cadeia completa provada contra produção (APK real → `android` + flag `true`). Validador adversarial: **APROVADO COM RESSALVAS**, as duas accionáveis fechadas — ele **refutou um comentário meu** (`isNativePlatform()` **NÃO** é infalsificável: `window.androidBridge={}` forj... [truncated]
> Anterior: 2026-10-16 (UTAC110i/110i.1 + 110i.1b: **Google Play Billing como 2.º pagamento do Passe Desafio**. SEG0: plugin `capacitor-plugin-cdv-purchase` 13.19.1 + abstracção única `src/lib/google-play-billing.js` (`billingDisponivel()` = Android nativo + plugin, fail-closed). SEG1: backend `_lib/google-play-billing.mjs` + `validar-compra-google.mjs` (valida o recibo na Google, credita pontos/crédito/ECOQUILDO **sem** débito de saldo R$) + migração `20261016_utac110i1_google_play_compras.sql` (**NÃO aplicada em produção**). SEG2: o `useComprarPasse` bifurca por **`isPagamentoNativoAtivo === true && billingDisponivel()`** — PWA/iOS/loja indisponível ⇒ PIX **intacto** (o PWA continua 100% por PIX). **O 110i.1b isolou o HANG do teste (c)** que parou o 110i.1: causa MEDIDA (não presumida) = o gate do hook tinha perdido a **1.ª condição** (`if (billingDisponivel())` em vez das duas) ⇒ com a flag **desligada** e Android nativo o hook ia ao Billing e o teste (c) pendurava **300 s** (`TIMEOUT_COMPRA_MS`). O ficheiro estava, **byte a byte**, no estado em que o **mutante D3** do instrumento de mutação o deixa — uma **mutação não restaurada** (md5 `a2cd8446…` == o `md5 inicial` registado na corrida abortada `_logs/UTAC110i.1_SEG2_MUTACAO.txt`). Consequência declarada: a prova de mutação do SEG2 do 110i.1 **nunca correu** («prova FEITA»/«9/9 RED» eram **falsas como medição** — o instrumento abortou no baseline, `null/null`, por o ficheiro pendurar). Reposto o gate (1 linha); o instrumento passou a medir: **primeira corrida 8/9** — o mutante **D7** (silenciar o `setErro` do ramo nativo) **sobreviveu**; morto por **1 teste novo** que assere o **estado `erro`** do hook (é ele que o ecrã pinta), com prova dirigida (controlo 14/14 · D7 aplicado 13/14, morde em `utac110i1-front-billing.test.mjs:285`) ⇒ **9/9 RED**, ficheiro **14/14**, `106e` **19/19** e `110d+110e` **45/45** intactos. Pendências: migração não aplicada · env `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` ausente no Netlify · L... [truncated]
>
> ⛔ **ESTADO ACTUAL DO PRODUTO (nota do UTAC106x.4, 2026-10-04).** A definição vigente é a secção
> **«NORTE DO PRODUTO» (Via B — programa de fidelidade)**: e-commerce por dropshipping com **Menor Lance
> Único** (jogo de habilidade, sem SPA/MF) e **Ofertas Programadas** (Passe R$ 2,00 → 1 ponto; **50 pontos
> = cartão colecionável físico**; o palpite é **bónus**, não decide). NÃO é concurso de previsões. **SPA/MF
> não se aplica.** Vendedor legal: **Associação Recreativa dos Nordestinos no Amazonas** (CNPJ
> 23.040.066/0001-00). ⇒ As referências a **«concurso de previsões»**, **SPA/MF**, **vendedor = MEI** e
> **DEC-09 (titular = Ruan)** que aparecem em **secções históricas** deste ficheiro estão **SUPERADAS** — o
> texto antigo mantém-se à vista (P2 · GATE 15) e é para ler à luz desta nota e do bloco **R14**.
>
> ⚠️ Este ficheiro esteve desatualizado entre o MC60 e o MC89.50: descrevia a rede
> como Sepolia, o contrato como `0x59A73Acc…` e o deploy como automático. Estava
> errado nos três pontos. Corrigido aqui.
>
> 🔤 **Skill renomeada (2026-10-01):** `UTAC01` → **`UTAC`** — `desafio-gut/frontend/skills/utac/`
> (frontmatter `name: utac`). Pedido do operador, **fora do SPEC do UTAC105b.3** (declarado). As
> referências **históricas** em `_logs/UTAC000*`, `_logs/REVIEWS/` e `scripts/utac0002-*.mjs`
> **não foram reescritas** (GATE 15 — UTACs fechados não se alteram): são registos do que foi, não
> fonte de verdade; apontam para o caminho antigo de propósito.
>
> 📚 **Skill UTAC 1.1 (UTAC000.3, 2026-10-01):** novo departamento **HI — Higiene de Infraestrutura**
> (10 regras, HI1-HI10) + **A9-A11** + **registo único de dívida em `_logs/DEBT.md`**, que **todo o
> UTAC lê antes de começar**. **R18 (UTAC000.3):** actualização da skill autorizada pelo operador como
> **auto-referencial, sem UTAC próprio** — só a skill e os ficheiros de dívida/versão, zero código de
> produção. A dívida **DEBT-004** (suíte do frontend vermelha, 25 falhas: React em duplicado pelo
> Vite) fica registada e **exige UTAC próprio** (HI4/HI5).
>
> 🧪 **UTAC000.4 (2026-10-01) — PARADO por HI5:** a suíte do **frontend** passou de **68 → 25 falhas**
> (backend 967/973 intacto). Causa medida: o `@vitejs/plugin-react` da `vite.config.js` injecta
> `react` no `optimizeDeps.include` e o Vite entrega ao componente uma instância diferente da do
> ficheiro de teste (`ReactCurrentDispatcher` a `null`). Correcção **parcial** commitada: novo
> `src/__tests__/_servidor-teste.mjs` (transporte dos testes isolado da config de produção) + 5 arnês.
> **A `vite.config.js` NÃO foi alterada** — medido: `optimizeDeps.exclude` perde para o `include` do
> plugin e os arnês já não carregam a config (alterá-la seria mudança sem medição — E1/GATE 3).
> **R18 (UTAC000.4):** paragem accionada pelo **HI5/GATE 4** (excedeu 1 h); o progresso parcial foi
> commitado e a dívida **DEBT-004** mantida `aberta (parcial)` — retomar exige UTAC próprio.
>
> 🔬 **UTAC000.5 (2026-10-01) — PARADO no fim do SEG-1:** PoC do **`vite@7.3.6`** medido e
> **REFUTADO** (a suíte do frontend foi de **25 → 152 falhas** — o downgrade agrava). Nada
> aplicado (GATE 17); `vite@8.1.0` reposto. **Diagnóstico afiado:** o transporte dos testes está
> CERTO (réplicas do mesmo componente renderizam OK, como script e sob `node --test`); falha só o
> render que atravessa o ramo `MeusPedidos.jsx` → `TimelineRastreio.jsx` — logo **não é
> configuração, é o grafo que o runner SSR do Vite 8 avalia**. A fase arquitectural (3-4 h) **não
> foi iniciada por orçamento** (GATE 4/13). **R18:** operador decidiu não reverter o parcial
> (68→25) e abrir este UTAC; o PoC mandou parar. `DEBT-004` continua **aberta (parcial)**.
>
> ✅ **UTAC000.6 (2026-10-01) — suíte do frontend VERDE:** **535/535** (backend 967/973). A
> regressão do React está **fechada** e `DEBT-004` foi encerrada. **Causa final (medida):** o runner
> SSR do Vite 8 serve a um módulo carregado **mais tarde** uma instância de React **diferente** da do
> primeiro (`ReactCurrentDispatcher` a null); o 1.º `ssrLoadModule` de um processo/servidor acerta, os
> seguintes não. **Correcção:** `src/__tests__/_ponte-ssr.mjs` é o **PRIMEIRO** módulo que o servidor
> de testes carrega e importa `react`, `react-dom/server`, `react-router-dom` e `framer-motion` —
> assim todos os módulos seguintes partilham a mesma instância. **Mutação:** desligar esse load →
> **0/15**; ligá-lo → **15/15**. O PoC do `vite@7.3.6` do UTAC000.5 foi **refutado** (152 falhas).
> **Zero código de produção tocado** (só testes + helpers). **R18:** correcção mínima provada por
> mutação. Nota: a regra **A12** (`@vitejs/plugin-react`/instância do React) **não** foi escrita —
> a autorização deste UTAC não incluía a skill; fica pendente de autorização.
>
> ⚠️ **REFUTAÇÕES do validador adversarial (UTAC000.6/SEG-3) — mantidas à vista:** o validador deu
> **APROVADO COM RESSALVAS** e derrubou **3 sub-afirmações do executor**, todas sobre a *necessidade*
> (não sobre a correcção, que verificou): (R1) «os 5 arnês carregam a ponte» era falso para 3 —
> `MeusAtivos` e `utac105b-painel` não precisavam de nada; (R2) o alargamento do `ssr.external`/`dedupe`
> não era o que resolvia os 3 ficheiros; (R3) o `Dashboard` ficava verde com **qualquer uma** das duas
> vias → eram redundantes. **Correcção reduzida ao mínimo medido**: `_ponte-ssr.mjs` + load em
> `_render.mjs` + uma via no `Dashboard` (**3 ficheiros, +21/−3**). **Erro do meu instrumento
> declarado:** a cifra «0/15» dependia da cache estar apagada (com cache quente dá 6/15). Detalhe:
> `_logs/UTAC000.6_SEG-3_VALIDADOR.md`. Re-verificado depois da redução: **535/535 · 967/973**.
>
> 📘 **UTAC000.7 (2026-10-01) — skill 1.2:** escrita a regra **A12** em
> `skills/utac/protocol/regras/A-ambiente.md` — **instância do React no runner SSR do Vite 8**.
> É a lição que fechou a regressão do frontend (68 → 0): o runner SSR serve a um módulo carregado
> **mais tarde** uma instância de React **diferente** da do primeiro (`ReactCurrentDispatcher` a
> null); a solução é o **primeiro** módulo que o servidor de testes carrega importar os pacotes que
> trazem React (papel de `src/__tests__/_ponte-ssr.mjs`). Contagem **74 → 75** regras (A1-A12; **hoje 76 / A1-A13** desde o UTAC106x.3 — nota do UTAC106x.4);
> bump **minor** 1.1 → 1.2. Regra escrita **só com o que foi medido** (GATE 17), incluindo a
> armadilha da condição de cache (0/15 com `.vite` apagado vs 6/15 a quente). As 74 regras
> anteriores **intactas** (`+23/−0` em `A-ambiente.md`). **R18:** UTAC de skill próprio, autorizado
> pelo operador, que fecha a lacuna de escopo do UTAC000.6.
>
> ⚠️ **REFUTAÇÃO do validador (UTAC000.7/SEG-2) — mantida à vista:** veredicto **APROVADO COM
> RESSALVAS**. O **núcleo da A12 confirmou-se** (mutante → suíte 15 falhas, split 6+1+8; religar →
> 535/535; soma real das regras = 75). Mas **1 sub-afirmação minha foi REFUTADA**: a cláusula da
> cache («`.vite` apagado = 0/15 / cache quente = 6/15») é **FALSA** — mede **6/15 nas duas**
> condições, a cache é **inerte** aqui. **Raiz do erro:** comparei medições de **estados de código
> diferentes** (antes da redução, desligar a ponte também repunha o renderizador no React do Node =
> dupla mutação). **Lição de método agora escrita na regra:** comparar medições só entre o MESMO
> estado de código. A redacção errada ficou **dentro da A12 marcada REFUTADA** (não apagada). A A12
> passou também a dizer **onde se regista** o load (`_render.mjs`/`obterServidor()`/`ssrLoadModule`),
> e o `SKILL.md` foi corrigido (dizia `A1-A8`). Pendente: `regras-legado.md` (fora do escopo) =
> **DEBT-005**; e o estilo da A12 diverge de A9-A11 (conteúdo pedido pelo spec) — decisão do operador.
>
> ⏸️ **UTAC000.8 (2026-10-01) — PARADO no fim do SEG-1** (orçamento; HI5/GATE 4). Objectivo: fechar
> **DEBT-007** (histórico de lances completo / 🏆 «Menor e Único» honesto). **Investigação feita e
> abordagem decidida:** o defeito está **só no modo on-chain** — o `lances` do `AppContext` só tem
> eventos `LanceDado` em tempo real + os lances do próprio utilizador (sem carga inicial); o
> `lancesFlash` **já** carrega a lista completa do blob (l. 768-770). **Fix mínimo traçado:** endpoint
> com `getLanceDadoEvents` (já existe em `_lib/contract.mjs`; modelo de paginação em
> `monitor-onchain.mjs`) + carga inicial em `AppContext` espelhando o `lancesFlash`. **Nada
> implementado; DEBT-007 mantida aberta.** Divergências declaradas: base real é `93c286d` (não
> `f0f02a6`), suíte **547** (não 535) e a severidade registada é **média** (o spec dizia ALTA).
>
> ⏸️ **UTAC000.8 — 2.ª sessão (2026-10-01) — PARADO e ESCALADO (GATE 11); o parágrafo acima foi REFUTADO por medição da PRODUÇÃO** (fica à vista, não se apaga — P2/GATE 14). **Medido** (leitura pública, sem auth, em `https://silly-stardust-ca71bc.netlify.app`; prova de leitura viva: o `/edicoes` devolve `agora` com timestamp de geração): a produção corre em **`NETWORK_STAGE = mainnet`** — `/lances-flash?edicaoId=R-1` devolve `{"ocultoAteConsolidar":true,"lances":[]}`, campo que **só existe no ramo mainnet** do `lances-flash.mjs`. Em mainnet: (a) o **valor real nunca vai para a cadeia** — vai o `keccak256` do lance via `comprometerLance` → evento **`LanceComprometido`** (hash), **não** `LanceDado` (valor); o caminho `darLance` só corre fora de mainnet (`CardLance.jsx` l.172/246+); (b) tudo é persistido no **Key-Per-Bid** (`lance-relampago.mjs` l.247-270) e o Blob `lances-relampago` **nunca é escrito** ⇒ **as DUAS listas estão VAZIAS em produção** — o `lancesFlash` **também**: o código carrega o Blob inteiro (l.768-770), mas **o Blob está vazio**. A frase «o `lancesFlash` não tem o defeito» é **falsa quanto ao que a produção faz**. (c) O **vencedor oficial é apurado off-chain**, a partir do mesmo Key-Per-Bid: `apurarMenorUnico(await getLances(edicaoId))` (`_lib/consolidacao.mjs` l.82-83) — a única fonte com valores, e é **blindada de propósito durante o leilão** (valor `null`, unicidade → **403**; MC28.1 R9 / G-2 anti-bot). **Consequência:** a Frente A do spec (`getLanceDadoEvents` + `getBlocoAtual`) **não serve a produção** — não há valores na cadeia, **não existe** «bloco de arranque da edição» em nenhum ponto do repo (0 resultados no grep) e o `monitor-onchain.mjs` documenta um limite duro de **10 blocos por `getLogs`** (plano Free). Fazer o 🏆 honesto **durante o leilão** exigiria **revelar valores blindados** = **decisão de produto** (o spec diz «NÃO AUTORIZA tomar decisões de produto») + quebra do anti-bot ⇒ **GATE 11: escalado ao operador com opções medidas** em... [truncated]
>
> ✅ **UTAC000.8 — DECISÃO DO OPERADOR R18-1 (2026-10-01) e IMPLEMENTAÇÃO — commit `eec94b8`: OPÇÃO 2 (mínimo). O 🏆 deixou de mentir.** Decidido pelo operador: «durante a edição o 🏆 não aparece (honesto); corrigir SÓ com o resultado oficial pós-consolidação». **Feito:** novo `src/hooks/useResultadoOficial.js` — lê `resultados(edicaoId)` **on-chain** (mapping escrito por `consolidarResultado`, a fonte que decide o vencedor) e **reutiliza** `lerResultadoOnchain` de `src/components/edicao-especial/useResultadoEspecial.js`, que **já corria em produção** (sem mecanismo de I/O novo: reutiliza o leitor que já existia); devolve `null` — nunca um objecto «vazio» — quando não há resultado **utilizável**: edição **por consolidar**, **endereço nulo** (`resultados()` devolve-o quando não houve lance único) ou valor ilegível; **fail-soft** (se a leitura falhar, a página não muda). Em `MeusAtivos.jsx`: o 🏆 e o cartão «Menor Lance» usam o resultado oficial **quando existe**; `ehLinhaVencedora` assinala a linha pelo **endereço + valor** do vencedor oficial e, se essa linha não estiver na lista visível, **NENHUMA** linha é assinalada (não se assinala ninguém por aproximação); **sem** resultado oficial mantém-se o apuramento local — o comportamento anterior, **zero regressões**. **Provas:** **24 testes novos** — 16 na página (`src/pages/__tests__/utac0008-resultado-oficial.test.mjs`; duplo do hook em `_stubs/`, que **regista a edição pedida** — a lição do `hooks.js`) + 8 no **efeito real** do hook (`src/hooks/__tests__/utac0008-resultado-oficial-hook.test.mjs`, com o condutor `_hook-runner.mjs`: para de reler ao consolidar, limpeza no desmonte, fail-soft, mudança de edição — lacuna declarada e fechada ANTES do validador, porque os testes da página injectam o resultado por duplo e não exercitavam o corpo do efeito); **4 mutantes que mordem** (M1 «a página ignora o resultado oficial» = repor a DEBT-007 → **5 RED**; M2 «aceitar edição não consolidada» → **1 RED**; M3 «nunca parar de reler... [truncated]
>
> 🔎 **UTAC000.8 — VALIDADOR ADVERSARIAL (SEG3, obrigatório) — APROVA com ressalvas, e as ressalvas foram fechadas.** Veredicto integral + resposta do executor: `_logs/UTAC000.8_SEG-3_VALIDADOR.md`. **O validador encontrou um defeito REAL que eu não tinha visto (R1):** o hook guardava o resultado **sem** a edição a que pertencia — ao **mudar de edição**, ou quando a leitura da edição nova **falha**, fica **pendente**, ou a edição passa a **vazio**, a página mantinha o **vencedor da edição ANTERIOR** (a mesma classe de mentira que o UTAC combate). Correcção: o estado passou a `{ edicaoId, resultado }` e só se serve o resultado da edição **pedida**. **R2** (latente): a comparação de endereço baixava a caixa de um só lado → perderia o 🏆 em silêncio com endereço **EIP-55**; agora baixa os **dois**. Os **3 testes vácuos** que ele apontou (passavam com o código antigo) foram **reforçados** com o auxiliar `enderecosVencedores()` (diz **a quem** foi dado o 🏆) + empate de valor + vista local parcial: o mutante M1 passou de **5 RED** para **8 RED**. A **fragilidade que PENDURAVA a suíte** (um `assert` que rebenta antes de `desmontar()` deixa o `setInterval` vivo → `node --test` nunca termina, `exit=124`) foi corrigida com **`t.after(() => c.desmontar())`** nos 12 testes do hook — e provada com o mutante aplicado (falha **e termina**). **6 mutantes mordem** (M1 8 RED · M2 1 · M3 1 · M4 1 · M5 3 · M6 2), todos restaurados com **md5 idêntico**. Suíte final: **frontend 579/579 VERDE · backend 967/973 VERDE**. Crédito e limites do validador estão no próprio veredicto (ele declarou 1 falso vermelho do seu arnês e 2 falsos negativos da sua 1.ª sonda, ambos desmontados).
>
> ⏱️ **REGRA ALTERADA PELO OPERADOR (R18-2, 2026-10-01, durante o UTAC000.8):** o padrão de **1 h por UTAC passa a 2 h**. Registado aqui (R18) e na memória do executor.
>
> 🏆 **UTAC000.9 (2026-10-01/02) — VENCEDOR DO DASHBOARD (DEBT-008): ENTREGUE, commit `e1aacda`.** Fecha o resíduo que o UTAC000.8 declarou. **Inventário medido (GATE 19): 4 sítios** onde o vencedor era derivado dos lances **locais** — `src/context/AppContext.jsx` l.697-700 (a derivação, exposta no contexto), `src/pages/Dashboard.jsx` l.391-405 + o prop do `FimEdicaoOverlay`, `src/components/TabelaLances.jsx` l.51/161/268 (o 🏆 da tabela de lances), `src/pages/MercadoLances.jsx` l.157/195 (o `OverlayVencedor` do fim da rodada). **Corrigidos no escopo:** o **Dashboard** (`vencedorExibido = resultadoOficial ?? vencedor` do contexto) e a **TabelaLances** (o 🏆 passa a casar **endereço + valor** do vencedor oficial; `-1` quando não está na lista = nenhum 🏆; linhas blindadas nunca casam ⇒ mainnet durante o leilão continua **sem** 🏆, como estava). **O `FimEdicaoOverlay` ficou corrigido sem ser tocado** — o Dashboard passa-lhe o oficial e a forma `{endereco, valor}` é a mesma que ele já esperava (Ponytail: zero refactor). Reutiliza o `useResultadoOficial.js` do UTAC000.8 → **sem mecanismo de I/O novo e sem dependências novas** (o hook acrescenta **1 leitura on-chain read-only por página**: mount + a cada 60 s até consolidar). **Provas:** +10 testes (4 no `Dashboard.test.mjs`, 6 no novo `components/__tests__/utac0009-tabela-vencedor.test.mjs`), com **caso discriminante** (local 100/OUTRO ≠ oficial 300/EU) e **2 mutantes que mordem** (M7 → 3 RED, M8 → 3 RED; md5 idêntico no restauro). Suíte **frontend 589/589 VERDE** (era 579/579), **backend 967/973 VERDE**. **DEBT-008 FECHADA** (no escopo); **DEBT-009 ABERTA** = os **dois sítios fora do escopo** (`src/context/**` e `src/pages/MercadoLances.jsx`, ambos por autorização nova — corrigi-los é análogo, ~45 min). **Declarado:** o duplo `_stubs/dompurify.js` existe porque `import DOMPurify from "dompurify"` **não** sobrevive ao interop do Vite SSR (medido: `default.sanitize is not a function`); o `sanitize.js` real corre. Validador ad... [truncated]
>
> 🔚 **UTAC000.10 (2026-10-01/02) — VENCEDOR NO APPCONTEXT + MERCADOLANCES (DEBT-009): ENTREGUE, commit `7c5ac6b`.** Fecha o resíduo que o UTAC000.9 declarou. **Correcção num só ponto (a fonte):** o **`AppContext`** passa a expor o vencedor **OFICIAL** quando existe (`const resultadoOficial = useResultadoOficial(EDICAO_ATIVA)`; `vencedor = resultadoOficial ? { endereco: resultadoOficial.vencedor, valor: resultadoOficial.menorUnicoCentavos } : vencedorLocal`) e o apurado dos lances locais quando **não** existe — a derivação antiga ficou **intacta** como reserva (comportamento anterior, zero regressões). **`MercadoLances.jsx` NÃO foi alterado**: o `OverlayVencedor` (l. 69) recebe o campo `vencedor` do contexto (l. 157/195) e ficou correcto **por arrasto**. **A interface pública não mudou (HI9)** — nome e forma iguais ⇒ nenhum dos consumidores precisou de ser tocado. Reutiliza o hook do UTAC000.8 (**sem mecanismo de I/O novo**; +1 leitura on-chain read-only por página). **Inventário medido (9 sítios):** 2 com o defeito, 4 já correctos, 1 código morto (`DetalheProduto.jsx` l. 39) e os **adjacentes que não são «vencedor»** (selos `ÚNICO`/`REPETIDO`, «menor único **seu**») declarados. **+9 testes:** 5 de **contrato** do `AppContext` — que **não pode ser renderizado** (importa o SDK do Privy) — por extracção de secção (a convenção do repo: `cotaAtiva`, `vocabularioUI`, `consentimento`, `dicaLojista`), com **controlo negativo em memória**, e 4 de **render** do `MercadoLances`. **2 mutantes mordem** (M10 → 2 RED; M11 «a página re-deriva dos lances locais» → 3 RED; md5 idêntico nos restauros). Suíte **frontend 600/600 VERDE** (era 591/591), **backend 967/973 VERDE**. **✅ Frente F (limpeza dos worktrees) — EXECUTADA NA PARTE SEGURA (não às cegas):** o spec dizia «7 worktrees órfãos»; medidos **11 em disco + 1 entrada de registo órfã** (não 7). Removidos **7** — 6 limpos + `zen-goldberg-ce8759` (cujo `node_modules` era **cópia real**, provado pelo recuo do `[System.IO.Directory]... [truncated]
>
> 🛡️ **UTAC000.11 (2026-10-02) — GUARDA DO VENCEDOR EM MERCADOLANCES (DEBT-011): ENTREGUE, commit `dec577d`.** Fecha o achado do validador do UTAC000.10. **Defeito reproduzido com stack trace real** (`_logs/UTAC000.11_SEG-1_EVIDENCIA.txt`): `OverlayVencedor` fazia `vencedor.endereco.slice(…)` **sem guarda** ⇒ `{}` e `{valor:300}` davam `Cannot read properties of undefined (reading 'slice')`; `{endereco:null,…}` dava `…of null (reading 'slice')`. **2.º defeito achado NESTE UTAC** (não estava no veredicto): com endereço presente e valor ausente mostrava **«R$ NaN»** — a linha do valor **também** estava sem guarda; corrigida no mesmo passo (mesmo defeito, expressão ao lado). **Correcção mínima (2 expressões)**, espelhando a guarda que o **cartão do Dashboard já tinha** (`Dashboard.jsx` l. 410): `vencedor?.endereco ? … : "—"` e `Number.isFinite(vencedor?.valor) ? … : "—"`. **Regra declarada:** malformado = AUSENTE **campo a campo** (não se inventa coerência global); **com `vencedor` válido nada muda** (GATE 18, com teste de controlo). **+8 testes** (7 casos em tabela + 1 controlo) → **12/12** no ficheiro; suíte **frontend 608/608 VERDE** (era 600/600), **backend 967/973 VERDE**. **2 mutantes mordem** (M13a endereço → 4 RED; M13b valor → 4 RED; md5 idêntico). **`showOverlay` NÃO foi religado** (decisão de produto, proibida ao executor) ⇒ a correcção é hoje **robustez defensiva**, visível no dia em que o overlay for religado. **⚠️ INCIDENTE do meu instrumento (declarado):** a 1.ª versão do script de evidência restaurava com **`git checkout --`** e, como a guarda **ainda não estava commitada**, **apagou a própria correcção** (md5 voltou ao pré-guarda, teste a 6/12) — detecção pelo próprio script («IDENTICO: NAO <-- PARAR»), recuperação do patch conhecido; **causa-raiz: restaurar do HEAD um ficheiro com trabalho NÃO commitado; o restauro correcto é de uma cópia de segurança** — o script passou a usar `.bak` fora do repo. Lição registada na memória do executor. **⚠️ 2.ª ROND... [truncated]
>
> 🧹 **UTAC000.12 (2026-10-02) — RESÍDUOS: DEBT-012 + HARNESS NO package.json + WORKTREES: ENTREGUE, commit `8e17e3a`.** Três frentes, cada uma com escopo próprio. **(A) DEBT-012** — o **irmão** da DEBT-011 no `Dashboard.jsx` l. 416: `R$ {(vencedorExibido.valor / 100).toFixed(2)}` sem guarda (o endereço, l. 410, já tinha). **Reprodução preservada:** `{}`, valor ausente, `NaN`, `"abc"`, `Infinity` → **«R$ NaN»**; `-1` → **«R$ -0.01»**. Guarda mínima (1 expressão, `Number.isFinite(...) && valor >= 0 ? … : "—"`), mesma regra do UTAC000.11 (malformado = AUSENTE; válido inalterado — o caso válido já passava antes). **+8 testes** → **22/22** no ficheiro; suíte **frontend 622/622 VERDE** (era 614); **mutante M14 → 6 RED dirigidos** (os 16 restantes, incl. todos os do UTAC000.9, passam). **(B) Harness exposto:** `"test": "node ../../scripts/mc966-suite-harness.mjs ambos"` — ⚠️ **o caminho do spec (`scripts/…`) NÃO existe nesse dir**; o harness vive em `<repo>/scripts/` e auto-localiza-se, e `../../scripts/` é o padrão já usado por `build:rag`. `npm test` → 622/622 + 967/973, **exit 0**. **(C) Os 3 worktrees preservados, limpos com o trabalho ARQUIVADO antes** em `_logs/UTAC000.12_worktrees-preservados.patch` (5 diffs): medido que **0** tinham commits fora do main; o **CSP que eles adicionavam já está no main**; o `Toast.jsx` é um **caminho que já não existe** (mudou para `src/widgets/toast/`); resta uma experiência de **paleta** de outra sessão + 1 linha de CORS. Removidos **pelo próprio git** (sem junctions, medido), `.claude/worktrees/` **3+1 → 0**, `node_modules` real **intacto 505 · 417**; ficam **13 refs** de branch (não autorizado apagar). **⚠️ 4 erros MEUS de instrumento, declarados:** (1) `\$` escapado pelo shell entrou no ficheiro → mutante inválido (16 RED por o módulo não carregar); (2) mutante substituiu só 1 das 3 linhas do ternário → linhas órfãs; (3) o recorte do bloco no teste ia até ao `<h3` seguinte e contava o travessão de «🔄 Liderando — pode ser superado»... [truncated]
>
> 🕵️ **UTAC000.13 (2026-10-02) — TESTE FLAKY (DEBT-014) + RELIGAR O SHOWOVERLAY: FRENTE B FECHADA na 2.ª ronda (teste corrigido; DEBT-014 fechada) · FRENTE D ESCALADA · commit inicial `cc072c6` (só `_logs/`).** **(A) A caça ao flaky deu um resultado NEGATIVO medido.** Método novo (o que faltava): correr N× guardando o output de **cada** corrida e isolar o **NOME** do teste. **30 corridas da suíte COMPLETA** (49 ficheiros, comando igual ao do harness) → **630/630 em todas, 0 falhas**; mais **30 corridas dirigidas** aos 5 ficheiros com **temporizadores reais** e **com carga de CPU deliberada** (4 workers × 100 s, a testar a hipótese — plausível e não refutada — de que o flaky do UTAC000.12 foi **induzido por carga**, já que ele corria em paralelo com as minhas suites) → **0 falhas**. **60 corridas, 0 falhas** (a taxa alegada ~1/15 teria dado ~4). Varredura medida: 0 testes usam `Math.random`; os 2 `createHash` são sobre **assets estáticos**; **6 ficheiros com temporizadores reais** e **zero `fakeTimers`**; o suspeito nº1 por leitura (`hooks-torneio` l. 82-91, `fetch`+`abort()` imediato) ficou **ilibado**. **⇒ Não se inventou correcção para um defeito não observado (GATE 17)** — a Frente B ficou sem objecto; **DEBT-014 fica ABERTA (parcial)**, escopo estreitado, scripts de caça preservados (`tmp-utac0013/`), e a evidência primária (a falha do validador do UTAC000.12, sem nome) mantida **sem explicação inventada**. **(B) O `showOverlay`: premissa do spec refutada por medição ⇒ PARAR E ESCALAR (GATE 10/HI8).** O `// setShowOverlay(true)` comentado está em **`src/context/AppContext.jsx` l. 1205** (dentro do `setTimeout` de 1200 ms do lightning), **não** no `MercadoLances.jsx` — que só **consome** a flag (l. 171 destructuring, l. 209 gate) e não tem o setter (o `value` expõe `showOverlay` na l. 1357, **não** `setShowOverlay`). Como este UTAC **proíbe** alterar o `AppContext.jsx`, religar é **impossível no escopo autorizado** — **não contornei**: escalei com **4 opções medi... [truncated]
> ⚠️ **2.ª RONDA (mesmo UTAC, depois do veredicto): a minha conclusão «flaky não reproduzível» foi REFUTADA.** O validador adversarial **apanhou-o com nome**: `um pedido novo limpa o erro do anterior` (`src/hooks/__tests__/hooks-torneio.test.mjs` l. 231, assert l. 244 → `false !== true`), por a 2.ª resposta do duplo usar `demora: 20` = **temporizador REAL** (a suíte não tem `fakeTimers`) e resolver antes do assert sob jitter. **Mal de mim (declarado):** N insuficiente e no **alvo errado** (30 corridas da suíte completa não apanham ~1/120 **por ficheiro**; martelei o ficheiro só **6×**) e desmenti-me **sem medição** («ilibado pelo empírico»). **Reproduzi-o eu mesmo** (1/200 sob carga, com o nome) e **corrigi** (autorizado: ficheiro de teste): a 2.ª resposta fica presa numa promessa que o teste destrava ⇒ **zero dependência do relógio**; o teste passou a fechar o pedido e a verificar que o resultado assenta ⇒ **mais forte**. **A/B pareado (martelo paralelo 8 fluxos):** MUTANTE fiel ao original **4/400** (4× o mesmo teste, `false !== true`) → CORRIGIDO **0/400**; total **5/600 pré → 0/600 pós**; restauro md5 idêntico (`b57f7ea5…`, com `trap` para o repo nunca ficar mutado). **DEBT-014 FECHADA.** Também **corrigido**: «o harness exige TTY» é **falso** — corre com `</dev/null` (o que falha é stdin indisponível em background). **3 erros meus de instrumento** na construção dos mutantes (responder mutado com `destravar()` órfão → falhava em TODAS as corridas por outro motivo; âncoras em CRLF num `.mjs` LF; guardas mal formuladas). **Lição: um flaky mede-se no ALVO, com N compatível com a taxa alegada — nunca no agregado.**
>
> 🛡️ **UTAC000.14 (2026-10-02) — GUARDA DO `FimEdicaoOverlay` (DEBT-013) + `showOverlay` RELIGADO SÓ FORA DO EM BREVE: CONCLUÍDO, commits `f635b32` + `9b9556e` (+ fecho).** **SEG-1 = AJUSTAR (2 premissas do spec refutadas, decididas pelo operador — R18):** (1) a l. 14 (endereço) também rebentava (6 casos, incl. `vencedor: {}`) ⇒ **«guardar l. 14 + l. 16»**; (2) o `setShowOverlay(true)` comentado está no **`AppContext.jsx` l. 1205**, não no `MercadoLances.jsx` ⇒ **«autorizar o AppContext l. 1205»**. **DEBT-013 FECHADA:** guarda de tipo igual à do `OverlayVencedor` (string não vazia / finito ≥ 0); evidência ANTES preservada (17 RED: «R$ NaN», «R$ Infinity», «R$ -0.01», TypeError com BigInt/Symbol e no `.slice`); teste novo 24/24; mutantes M15a-d 10/8/1/4 RED. **⚠️ O VALIDADOR REFUTOU o religar simples (G1):** com `EM_BREVE_MODE = true` o prazo do relâmpago é um **cronómetro LOCAL de 30 min** (`prazoFlash = lerPrazoStorage(...) ?? now + 1800`; a R-1 on-chain tem `prazo = 0`) ⇒ o overlay «EDIÇÃO ENCERRADA» + confetti abria **sozinho** a cada 30 min sobre ecrãs «Em breve» — o motivo do MC63/64; o meu SEG-1 só provara «com prazo 0 abre», não «não abre quando não deve». **Decisão do operador (R18): `if (!EM_BREVE_MODE) setShowOverlay(true);`** (import da fonte única `lib/leilaoLock.js`) ⇒ **hoje não abre** (o minificador elimina a chamada); no dia em que a flag for `false` abre como antes do MC63/64 e religa **os dois** overlays. Teste `utac00014-show-overlay.test.mjs` executa a `tick` **REAL** extraída do AppContext com duplos (9 casos, incl. «EM BREVE ⇒ não abre» com prazo 0/vencido e com reabertura); **M17 (EM_BREVE_MODE ignorado) 3 RED** · M16 2 · M18 1 · M19 5 · R5/R7 do validador 2/1. Suíte **frontend 663/663 · backend 967/973**. Validador 2.ª ronda: **APROVADO COM RESSALVAS** (só ℹ️). **⛔ DEBT-016 (nova):** antes de desligar o `EM_BREVE_MODE`, ligar o relâmpago a um prazo **real** (servidor/on-chain) — senão volta o ciclo de 30 min locais (e o `FimEdicaoOverlay` não... [truncated]
>
> 🧹 **UTAC000.16 (2026-10-02) — HIGIENE: 3.ª VALIDAÇÃO + PACKAGE-LOCK + CUSTO + BRANCH (DEBT-015): CONCLUÍDO. Zero código de produção.** **(A)** 3.ª validação dos 2 testes novos do UTAC000.14: **APROVADO COM RESSALVAS** — mas **6 de 12 mutantes do validador sobreviviam** (prazos de brinquedo < 1e9; reset de `fimDisparadoRef` não observado; temporizadores não contados) ⇒ testes reforçados (epoch real, contagem de temporizadores, `fimDisparadoRef` `true→false`, + caso «EM BREVE + prazo futuro») e a bateria dele re-corrida: **14/14 morrem**. **(B)** `package-lock.json` **REVERTIDO**: não era ruído — **removia os 4 peers do MC93-G** e `npm ci --dry-run` dava **EUSAGE** (o do HEAD passa); cópia preservada fora do repo. ⚠️ Volta a acontecer enquanto houver dois modos de `npm install`. **(C)** Custo em USD **não medido** (Claude Code sem `state.db`; não foi sessão dedicada) — só tokens do validador (123 392). **(D/E) DEBT-015 FECHADA** (decisão do operador: arquivar e apagar): `_logs/DEBT-015_zen-goldberg.patch` (+ `.mbox`, que recria os **4 SHAs originais bit-a-bit**; comando na DEBT-015); árvore `adfc078` provada no merge-base; branch apagada local + remota. **`.gitattributes`: `*.patch`/`*.mbox`/`*.diff` `text eol=lf`** (o checkout fresco do patch saía CRLF e o `git apply --index` falhava — achado do validador). Suíte **664/664 · 967/973**. Relatório: `_logs/UTAC000.16-RELATORIO.md` · `Desktop/UTAC000.16-RELATORIO.md`.
>
> 🧪 **UTAC000.15 (2026-10-02) — ARNÊS DE RUNTIME DO PROVIDER (DEBT-010): CONCLUÍDO. Zero código de produção.** **Medido:** o M12 (texto da regra intacto, travessia desligada em runtime) passava a suíte frontend **INTEIRA** (664/664). O `AppContext.jsx` **importa-se** (41 s, Privy real); o que falhava era **executar** — `useLocation()` fora de `<Router>`, Privy sem Provider, RPC, e o **`@fingerprintjs` real, que sem DOM fica em ciclo e não deixa o processo de teste terminar**. **Arnês** `src/__tests__/_arnes-provider.mjs` (+ `_stubs-provider/`): o `AppProvider` **REAL** corre no `_hook-runner.mjs` (efeitos reais; `apiGet` real com `fetch` duplo; `useResultadoOficial` real com duplo só da leitura on-chain; router pelos `UNSAFE_*Context`), e a árvore devolvida renderiza-se com o `MercadoLances` real como filha. **Para testar o Provider a partir de agora, usar este arnês** (modo `leilaoAberto` para `EM_BREVE_MODE=false`; `emitirLanceDado` para o programado; `valorInicial()` para o 1.º render). Teste `utac0015-provider-cablagem.test.mjs` (6). **M12 → suíte VERMELHO 3**; mutação **8/8**; anti-flaky 30/30 + 20/20 sob carga. Validador: **APROVADO COM RESSALVAS** — refutou o duplo estático do oficial (V11 «congelar o 1.º render» passava) e a falta do programado: ambos corrigidos (não re-validados). Fora do provado: `Dashboard`/`MeusAtivos`, ramos com sessão. Suíte **670/670 · 967/973**. Relatório: `_logs/UTAC000.15-RELATORIO.md` · `Desktop/UTAC000.15-RELATORIO.md`.
>
> ⏸️ **UTAC000.17 (2026-10-02) — PRAZO REAL + OVERLAY AGREGADO (DEBT-016): PARADO NO SEG-1 e PARTIDO EM 3 (decisão do operador, R18). Zero código.** **Medido:** (1) **não existe prazo real da R-1** — o servidor SINTETIZA a R-1 a cada pedido (`termino_em` = agora+24 h rolante; `edicoes-core.mjs`) e on-chain é 0; e o `criarEdicao` só gera `RELAMP-N`/`PROG-N`, nunca a R-1 que o cliente fixa como activa ⇒ **DEBT-017**; (2) **«o utilizador deu lance» não é observável no cliente em mainnet** (`lances-flash` vazio; `feedback` só após consolidar) ⇒ endpoint novo; (3) o overlay agregado tem de ser montado num sítio único. **Specs:** `_logs/UTAC000.17a.spec.yml` (participações), `17b` (prazo do `termino_em` do servidor — fecha só a ORIGEM LOCAL), `17c` (agregado + onClose + visto). ⚠️ **Validador (APROVADO COM RESSALVAS): o 17b sozinho NÃO fecha a DEBT-016** — o «NOVA RODADA» reabre o overlay com o prazo do servidor, e o fallback do `useEdicoes` usa o próprio prazo local ⇒ **17b + 17c juntos antes de desligar o EM BREVE**. **DEBT-018** (candidata): Blob `bids` fora do `exportar-dados`. Pendente do operador: a edição activa e o seu prazo; «visto» local vs servidor; onde montar o agregado. Relatório: `_logs/UTAC000.17-RELATORIO.md` · `Desktop/UTAC000.17-RELATORIO.md`.

> 🔌 **UTAC000.17a (2026-10-02) — ENDPOINT «MINHAS PARTICIPAÇÕES POR EDIÇÃO» (backend): ENTREGUE, commit `12fd198`.** Pré-requisito do overlay agregado (17c). `GET /minhas-participacoes[?edicaoId=X]` — auth **obrigatória** com o **endereço vindo SEMPRE do token** (não existe parâmetro de utilizador ⇒ impossível pedir dados de terceiros) e resposta com **só edições + contagens** (`{participacoes:[{edicaoId,lances}],total,filtro}`), **zero valores** (GATE 22); rate limit 30 (par dos `*-get` de leitura leve). **Dados, sem migração nova:** a consulta entrou na **camada de abstracção existente** (`_lib/data-store.mjs` + as 2 implementações), porque um endpoint só-Blobs se partiria em silêncio no dia do flip `DATA_STORE_BACKEND=supabase` — em **blobs** lista as **CHAVES** `bid:*` (cursor) e filtra `:{endereco}:` ⇒ **lê zero valores**; em **supabase** faz `select("edicao_id").eq("endereco")` (coluna plana indexada) e **nunca pede `payload`**. **Escopo:** 4 ficheiros alterados (+85/−1) + 3 novos (endpoint + 2 testes); o `exportar-dados` **NÃO** foi tocado e **nenhuma migração** foi criada. **15 testes novos** (12 blobs + 3 supabase): 401 (sem token/inválido/sem endereço), só as edições do titular (com terceiro **e** endereço «parecido» semeados), nenhum valor no corpo, marcador `:consolidado` ignorado, filtro por edição, titular sem lances, 405, store em baixo→503, **EIP-55** a casar com a chave em minúsculas, paginação por cursor; suíte frontend **670/670** · backend **967/973 → 982/988** (+15 ✓ contagem confere). **3 mutantes MORDEM** (M16 = filtro do endereço neutralizado → 2 RED; M17 = valores na resposta → 1 RED; M18 = filtro ignorado → 1 RED) com restauro md5-idêntico. **DEBT-018 FECHADA POR MEDIÇÃO** (o passo prescrito na própria dívida era «contar chaves, sem ler valores»): `netlify blobs:list` → **0 chaves** no store `bids` e **0** no legado `lances-relampago` ⇒ **hoje não há** lacuna de direito de acesso; fica a **condição de vigilância** declarada (se o `bids` gan... [truncated]

---

## 🎯 ESCOPO-ALVO v6.0 — os 2 PDFs do Desktop (MC100, 2026-09-28) — **HISTÓRICA** (realinhada pelo UTAC106x.2)

> ⛔ **ESTA SECÇÃO JÁ NÃO É FONTE DE VERDADE.** A definição vigente do produto é a secção **«NORTE DO
> PRODUTO»** (Via B — programa de fidelidade, 2026-10-04): onde divergirem, **prevalece a NORTE**.
> **Actualizado pelo UTAC106x.2 (2026-10-04) — ver NORTE DO PRODUTO para a definição vigente.** Fica como
> **registo histórico** do alvo segundo os 2 PDFs de 2026-09-28; o texto antigo **mantém-se à vista**
> (P2 · GATE 15: não se apaga) e as linhas contraditórias ficam **anotadas como SUPERADAS**.
> ⛔ **Título anterior, verbatim (preservado):** «ESCOPO-ALVO v6.0 — FONTE DE VERDADE: os 2 PDFs do Desktop (MC100, 2026-09-28)». Substituído pelo cabeçalho acima (UTAC106x.2).
> **DECISÃO DO OPERADOR (R18, 2026-09-28, durante o MC100):** «os pdfs são a fonte de verdade, eles são a
> versão mais atualizada do que vamos ser ao final». As fontes são:
> - `Desktop/DesafioGUT - Visão Geral do Ecossistema Completo.pdf` (**VG**, 10 págs.)
> - `Desktop/DesafioGUT - Modelo de Negócio e Conformidade.pdf` (**MN**, v1.0, 10 págs.)
>
> ⛔ ~~**Precedência:** esta secção descreve **o que o DesafioGUT vai ser**. Onde divergir da secção «NORTE
> DO PRODUTO» (MC-NORTE-01/MC-PRODUTO-01, logo abaixo), **prevalece esta**.~~ **REVOGADO pelo UTAC106x.2
> (2026-10-04): removidas a auto-declaração de «fonte de verdade» e a precedência — prevalece a NORTE DO
> PRODUTO.** A NORTE continua a descrever **o estado actual do código e o histórico das decisões**, e não se
> apaga (P2). O estado medido e o plano de transformação estão em `_logs/MC100_*.md` e `Desktop/MC100-RELATORIO.md`.
> citações normativas neles não batem com o repo nem com as fontes primárias (ver «Errata dos PDFs»).

### O que o DesafioGUT vai ser

**Plataforma de e-commerce por dropshipping** que vende **produtos físicos** por duas modalidades:

| Modalidade | Mecânica | Paga com | Critério de vitória | Duração | ⛔ ~~Autorização SPA/MF (segundo o PDF)~~ **histórico** |
|---|---|---|---|---|---|
| **Oferta Relâmpago** («Estratégia») | menor lance único | **saldo em R$** (PIX), lance ≥ R$ 0,01 | **menor lance único** | curta (horas) | ❌ dispensada («jogo de habilidade / estratégia pura») |
| **Oferta Programada** (fidelidade) | **programa de fidelidade gamificado** (Passe → pontos) | **Passe Desafio (R$ 2,00)** | **50 pontos = cartão colecionável físico da Família Quildo**; o palpite é **bónus (+2 pontos)**, não decide o prémio | média/longa (dias ou semanas) | ❌ **não se aplica** (não é concurso) |

> ⛔ **SUPERADO (UTAC106x.2, 2026-10-04):** esta linha dizia «**concurso de previsões**», com critério
> «palpite mais próximo do nº real e exato de lances» e «✅ **requerida** (Lei 5.768/1971 + Dec. 70.951/1972)».
> A definição vigente é a da **NORTE** (Via B): fidelidade, **sem SPA/MF**; o palpite é **bónus**, não decide o prémio.

**Passe Desafio (R$ 2,00):** **produto digital real**, **não** taxa de participação. Inclui **cupons de desconto
de lojistas parceiros** + **dados analíticos** (participantes, faixas de lances, histórico) + **GUTO** + **direito
a 1 palpite** (benefício complementar e subordinado; rácio 1 Passe = 1 palpite).
**Prémio/produto:** sempre o **bem físico**, sem conversão em dinheiro. O vencedor **adquire o produto pelo valor
do lance/palpite vencedor** (VG §3.5).
**Posicionamento:** «Não é leilão, não é aposta e não é sorteio: é uma **compra inteligente com benefícios**.»
Nas lojas: **Programa de Fidelidade Gamificado** (Play), classificação **AO / 18+**.

### Os 4 pilares (VG §2)

1. **Comprador:** login Google (Privy) → gate legal (LGPD + Termos) → carteira embedded → **18+** → PIX → saldo R$ →
   Relâmpago (lance) ou Programada (Passe + palpite) → vitória → morada → **NF-e** → rastreio → **«recebi»** →
   **7 dias de arrependimento com estorno real via Mercado Pago**.
2. **Plataforma (**~~MEI~~ **Associação Recreativa dos Nordestinos no Amazonas — CNPJ 23.040.066/0001-00**):** vende o Passe; organiza as edições; apura (Relâmpago on-chain; Programada «palpite mais
   próximo»); notifica pelo GUTO; **emite a NF-e** (manual no início); gere a logística; **repassa ao lojista após a
   confirmação de entrega**; gere as cotas.
3. **Lojista:** onboarding com **CNPJ validado** → **cota de visibilidade** (Diamante/Ouro/Prata/Bronze = Nível 1..4)
   → produtos nos slots da cota → **emite cupons** para o Passe → despacha (dropshipping) → recebe o repasse →
   acede a leads.
4. **GUTO (IA):** análise de dados, suporte estratégico, educação de regras, **pós-compra** (NF-e, rastreio,
   devolução), triagem para suporte humano por e-mail; presente no chat, push/in-app, painel pós-compra e e-mail.

### Estrutura legal (VG §4.2–4.3)

| Item | PDF |
|---|---|
| ⛔ **SUPERADO** — ~~Vendedor legal e emissor de NF-e~~ | ~~**MEI do DesafioGUT**, CNAE comércio varejista, exibido no rodapé legal~~ → **Associação Recreativa dos Nordestinos no Amazonas** (CNPJ **23.040.066/0001-00**, Grupo União e Trabalho) — ver NORTE DO PRODUTO e o R14 do UTAC106x.1 |
| ⛔ **REVERTIDO (DEC-09)** — ~~Titular do MEI e da licença SPA/MF~~ | ~~**Ruan** (segundo o PDF)~~ → titular = **Associação** (Marinho, Grupo União e Trabalho), Ruan como funcionário — **UTAC106x.1** |
| ⛔ **NÃO SE APLICA** — ~~Licença SPA/MF~~ | ~~taxa de fiscalização **R$ 334,00** (limite de R$ 10.000,00 em prémios), validade 12 meses (valores do PDF, não verificados pelo executor)~~ → **sem concurso ⇒ SPA/MF não se aplica** (Via B; **R-19 revertida** pelo UTAC106x.1) |
| NF-e | emitida em **100 %** das vendas com entrega física (MN §3.5) |

### Leis e plataformas (MN §3–4) — o que o PDF declara

Lei 5.768/1971 (autorização prévia; prémio não convertível em dinheiro) · Dec. 70.951/1972 (arts. 13, 14, 25, 30)
· CDC art. 49 (7 dias, botão no app, estorno MP) · Dec. 7.962/2013 (arts. 2º e 5º) · LGPD (arts. 7º, 8º, 18) ·
**não aplicáveis:** Lei 14.790/2023 (bets), DL 3.688/1941 (jogo de azar), Res. CMN 5.100/2026 (mercados
preditivos: o palpite é sobre uma **métrica interna**) · Google Play: Gamified Loyalty (transação separada e
genuína, benefício complementar, regras publicadas, nº fixo de vencedores, prazos, rácio, AO) · Apple: bens
físicos fora do IAP.

### ⛔ O que o PDF muda em relação à NORTE (MC-NORTE-01 / MC-PRODUTO-01) — **fica SUPERADO**

| Tema | NORTE / estado actual do código | Alvo (PDF) |
|---|---|---|
| Programada | senha R$ 2 = 1 lance, **menor lance único** (`REGULAMENTO-v4.md:19,43`) | **Passe + palpite do nº de lances**, «mais próximo» |  ⛔ **SUPERADO pelo UTAC106x.2** — Via B: Passe → pontos → **cartão**; o palpite é **bónus** |
| Decisão MC-PRODUTO-01 «o Quiz de Previsão não entra; sem frontend novo» | registada como R18 a 28/09 | **revogada pelo PDF** (R18 do MC100): o concurso de previsões **entra** |  ⛔ **SUPERADO pelo UTAC106x.2** — a Via B **não tem concurso** |
| «Passe» = só a denominação comercial da senha | MC-PRODUTO-01 | Passe = **produto digital próprio, com cupons de lojistas** |
| Tese «torneio de habilidade» (Portaria SPA/MF 1.207/2024, Art. 38º v4) | Regulamento v4 | Relâmpago = habilidade (dispensada); **Programada = concurso autorizado pela SPA/MF** |  ⛔ **SUPERADO pelo UTAC106x.2** — Programada = fidelidade, **sem SPA/MF** |
| Vendedor | GUT, CNPJ 23.040.066/0001-00 (na verdade uma associação: ver memória do CNPJ) | **MEI** |  ⛔ **REVERTIDO pelo UTAC106x.1** — vendedor = **Associação** |
| Relâmpago: quem paga | cada lance é debitado do saldo (Art. 8º v4) e o vencedor paga o valor do seu lance pelo produto (Art. 11º) | **igual** no PDF VG §8 («lance debitado do saldo» + «vencedor paga o valor final do lance»). *Sem mudança: a divergência que o MC100 leu na 1.ª versão foi refutada pelo validador* |

### ⚠️ Errata dos PDFs (medida no MC100 contra fontes primárias e contra o repo)

1. **Apple «Diretriz 3.1.5(a)» para e-commerce (MN §4.2) está errada:** a 3.1.5 trata de *Cryptocurrencies* (o item de
   carteiras é o 3.1.5(i)), não de e-commerce. A regra
   de bens físicos é a **3.1.3(e)** (App Review Guidelines, lidas a 28/09).
2. **«Vouchers e cupons digitais sob a mesma isenção de IAP» (MN §4.2):** a Apple 3.1.1 diz o contrário para vouchers
   resgatáveis por bens/serviços **digitais**. E a Play Payments policy exige o **Billing** para «digital content or
   goods» (excepções: bens físicos, *peer-to-peer*, **online auctions**, doações). ⇒ **Um Passe «produto digital» vendido
   por PIX dentro do app é um risco de loja (R-01)**, não um ✓.
3. **§12 «implementado ✓»:** a ponte apuração→catálogo, a entrega e os campos de NF-e existem **só no repo local**
   (MC-ECOMMERCE-01a, `938173c`/`c56f899`, **não publicados**: produção serve o MC99.5.3). «Conversão de saldo em
   senhas» existe, mas é a mecânica da Programada **a descontinuar**.
4. **Relâmpago «dispensada»** com lances pagos contradiz a política Real-Money Gambling da Play já citada abaixo
   (MC-PRODUTO-01) → **R-02, parecer jurídico obrigatório.**
5. **A categoria Gamified Loyalty exige «not subject to additional gambling or gaming licensing requirements»**, e o
   próprio PDF diz que a Programada **exige** a SPA/MF → **R-19, parecer obrigatório** (achado do validador do MC100). **⛔ REVERTIDA pelo UTAC106x.1 (2026-10-04):** sem concurso e sem SPA/MF, a premissa cai — ver R14.
6. **O momento do repasse ao lojista contradiz-se:** antes do envio (VG §8, MN §6.1) vs depois da confirmação (VG §4.1/§5.3/§9,
   MN §6.2) → DEC-06. **«AO»** não é classificação da Play/IARC (no Brasil: ClassInd 18). O PDF usa «Arremate» (MN §5.1).

### ⛔ Decisões pendentes que bloqueiam execução (detalhe em `_logs/MC100_DECISOES-PENDENTES.md`)

- **DEC-09 — titular:** o PDF diz **Ruan** (MEI + SPA/MF); o texto do MC100 (P5/P6) diz **Marinho (União e Trabalho)**, com
  o Ruan como funcionário. O R18 manda seguir o PDF, **mas nada que dependa do titular avança sem confirmação**. **⛔ REVERTIDA pelo UTAC106x.1 (R14, 2026-10-04)** — o titular é a **Associação** (Marinho).
- ~~DEC-11~~ **retirado** (refutado pelo validador: PDF e código coincidem). A pergunta de fundo passa ao jurista (R-02, R-19).
- **DEC-01 — faturação do Passe:** PIX vs Google Play Billing / Apple IAP.
- **DEC-02/03/04 — cupons (quem emite, valor); que lances o palpite conta; desempate e nº fixo de vencedores.**
- **DEC-12 — Play Console:** o PDF manda **pausar o teste «imediato»**; o texto do MC100 manda **não sair do teste**.

### Plano (resumo — detalhe em `_logs/MC100_MAPA-CAMADAS.md` e `_logs/MC100_MAPA-MCS-101+.md`)

21 camadas activas (C0–C21; a C18 foi retirada após o validador), todas construídas sobre o que existe (P1) e sem apagar nada (P2). **Onda 1, autónoma:**
MC101 publicar o feito (MC-SORTEIO-01a + MC-ECOMMERCE-01a) + medir flags/webhook · MC102 «recebi» pelo comprador ·
MC103 mecanismo de descontinuação + medição do legado · MC104 LGPD técnico. **Onda 2** (decisões do cliente): Passe,
concurso, estorno, repasse, cupons. **Onda 3** (MEI/SPA): Regulamento v5, rodapé, NF-e, LGPD v2, GUTO/RAG, copy/marca.
**Onda 4:** ficha Play + AAB → iOS.

> ⛔ **histórico (UTAC106x.2, 2026-10-04):** o plano das Ondas 2/3 é de 2026-09-28. Com a Via B, a decisão
> «concurso» **caiu** (fidelidade), «MEI» caiu (vendedor = **Associação**) e «SPA» caiu (**não se aplica**).

---

## 🎯 NORTE DO PRODUTO — Definição Consolidada (Via B — programa de fidelidade, 2026-10-04)

> ✅ **ESTA SECÇÃO PREVALECE SOBRE «ESCOPO-ALVO v6.0» (linha ~126) E DEMAIS DOCUMENTOS REFERENCIADOS.**
> Decisão do operador **R18-C (2026-10-04)**, registada no UTAC106x (`_logs/UTAC106x-consolidacao.md` §6) e
> executada no **UTAC106x.1**. A definição anterior — *Oferta Programada = concurso de previsões, com
> autorização SPA/MF* — fica **SUPERADA**; o seu texto mantém-se **à vista** em §11 e no snapshot integral
> `_logs/UTAC106x_NORTE-ANTERIOR.md` (P2 · GATE 15: nada é apagado).
> ✅ *(A nota contrária da secção `ESCOPO-ALVO v6.0` — «prevalece esta» — foi **corrigida**: a secção
> passou a **HISTÓRICA** e a precedência é desta NORTE. Feito no **UTAC106x.2** (2026-10-04); nota
> actualizada pelo **UTAC106x.4**, que só corrigiu esta referência, sem tocar na definição.)*

> ⚠️ **FONTE E LACUNA (declarada — GATE 2).** A fonte desta consolidação é o **enunciado do UTAC106x/x.1
> (2026-10-04)**. **Não existe** no repositório artefacto-fonte anterior (o enunciado diz que «a consolidação
> já foi feita»): `find ~/Desktop ~/Downloads -newermt '2026-10-04'` → **0 ficheiros**; o `CLAUDE.md` tinha
> **0 ocorrências** de `5.910`, `5.102`, `9.532`, `Quildo`, `colecion` antes deste UTAC. ⇒ **Este UTAC cria
> o registo, não o copia.** ⚖️ O enquadramento jurídico/fiscal abaixo **não foi validado por jurista**; o
> próprio repositório já exigia parecer (achados **R-19** e **R-02** em `_logs/MC100_MATRIZ-CONFORMIDADE.md`).
> Tratar como **posição do operador**, não como facto verificado.

### 1. Produto

#### 1.1 Definição
**E-commerce por dropshipping** com **duas modalidades**:

| Modalidade | Mecânica | Pago com | Enquadramento |
|---|---|---|---|
| **Menor Lance Único** | menor lance **único** da edição | **saldo em R$** (PIX), a partir de R$ 0,01 | **jogo de habilidade**; produto **patrocinado**; **sem** SPA/MF |
| **Ofertas Programadas** | **programa de fidelidade gamificado** | **Passe Desafio (R$ 2,00)** | **sem** concurso ⇒ **SPA/MF não se aplica** |

#### 1.2 O que NÃO é
⛔ **Não é leilão.** ⛔ **Não é aposta** (nem de quota fixa). ⛔ **Não é sorteio.** ⛔ **Não é jogo de azar.**
⛔ **Não é mercado de previsão.** ⛔ **Não é concurso de previsões.**

> Estas negações são o **núcleo da tese jurídica** e o que sustenta o enquadramento **«programa de
> fidelidade gamificado»** perante a Google Play. Vocabulário **proibido** em PT («leilão/leilões,
> aposta(s), sorte(s), azar, loteria(s)») — `docs/GLOSSARIO-OFICIAL.md`, com guardas executáveis em
> `src/i18n/__tests__/glossario.test.mjs` e `pt-only.test.mjs`.

#### 1.3 O que É
Um **e-commerce por dropshipping** que é, ao mesmo tempo:
1. **jogo de habilidade** com produto **patrocinado** — modalidade **Menor Lance Único**;
2. **programa de fidelidade gamificado** — modalidade **Ofertas Programadas**.

### 2. Passe Desafio

| # | Item | Definição |
|---|---|---|
| **2.1** | Definição | **R$ 2,00 = 1 Ponto de Fidelidade.** É **produto real pago**, não taxa de participação nem aposta. |
| **2.2** | Componentes | (a) **ponto de fidelidade**; (b) **palpite bónus**; (c) **dados** da edição; (d) **GUTO** (assistente de IA). |
| **2.3** | Como se obtém o cartão | **50 pontos = 1 cartão colecionável físico** (da **Família Quildo**), entregue em casa. Acumulação por rácio **fixo** (1 Passe = 1 ponto). |
| **2.4** | Palpite é bónus | O palpite **não decide o prémio**: vale **+2 pontos** se acertar (benefício **complementar e subordinado**). |

### 3. Vendedor legal

| # | Item |
|---|---|
| **3.1** | **Associação Recreativa dos Nordestinos no Amazonas** |
| **3.2** | CNPJ **23.040.066/0001-00** |
| **3.3** | Natureza: **associação recreativa, sem fins lucrativos** (Grupo **União e Trabalho**). |
| **3.4** | **Isenção fiscal**: **IR**, **CSLL** e **Cofins** (entidade sem fins lucrativos). |

### 4. Modelo de negócio

| # | Frente | Descrição |
|---|---|---|
| **4.1** | Receitas da associação | **Passes** (R$ 2,00 cada) **+ valor do lance** pago pelo vencedor. |
| **4.2** | Custos | **Zero** — o produto é **patrocinado** (o lojista fornece). |
| **4.3** | Patrocínio | O **lojista fornece** o produto e recebe **visibilidade + leads**. **Não vende** e **não entra no app**. |

### 5. Estrutura fiscal (NF)

| # | Operação | Documento |
|---|---|---|
| **5.1** | **Lojista → Associação** | **NF-e, CFOP 5.910** (patrocínio). |
| **5.2** | **Associação → Cliente** | **NF-e, CFOP 5.102** (venda). |
| **5.3** | Emissão | **NF-e automática por e-mail** — **a implementar** (UTAC106g). |

### 6. Enquadramento legal

#### 6.1 Leis que cumpre
**Decreto 7.962/2013** (comércio electrónico) · **CDC** (Lei 8.078/1990) · **LGPD** (Lei 13.709/2018) ·
**Lei 9.532/1997** · **Lei 9.249/1995** (isenção da entidade sem fins lucrativos).

#### 6.2 Leis que evita
**Lei 5.768/1971** · **Decreto 70.951/1972** · **Lei 14.790/2023** (bets) · **DL 3.688/1941** (jogo de azar) ·
**Res. CMN 5.100/2026** (mercados preditivos).

#### 6.3 SPA/MF: NÃO se aplica
**Justificação:** o produto **não organiza concurso** de previsões nem distribui prémios por sorteio/concurso
pago. As **Ofertas Programadas** são um **programa de fidelidade gamificado** (compra de Passe → pontos →
cartão). A **Menor Lance Único** é **jogo de habilidade** com produto **patrocinado**. ⇒ **Fora do âmbito**
da Lei 5.768/1971 e do Dec. 70.951/1972; **não há autorização a requerer**.
> ⚖️ **Caveat:** esta é a **posição do operador** (fonte: enunciado UTAC106x §6.3). Reverte, ao nível
> documental, o achado **R-19** (`_logs/MC100_MATRIZ-CONFORMIDADE.md` linha 32 (row #24 da tabela): «a categoria Gamified
> Loyalty exige *not subject to additional gambling or gaming licensing requirements* e a Programada exigia
> SPA/MF ⇒ parecer obrigatório»). **O parecer jurídico continua pendente** — ver §11 e o gabarito.

### 7. Plataformas

| # | Loja | Enquadramento |
|---|---|---|
| **7.1** | **Google Play** | **Programa de Fidelidade Gamificado** (*Gamified Loyalty Program*) — requisitos mapeados no gabarito da Play Console. |
| **7.2** | **Apple** | **Bem físico** (consumido fora do app) ⇒ **sem IAP** (App Review 3.1.3(e)). |

### 8. Fluxos

#### 8.1 Financeiro
**PIX** → **Saldo** (R$) → **Passe** (R$ 2,00 = 1 ponto) **ou** **Lance** → **NF-e** → **Entrega**.

#### 8.2 Logístico
**Morada** → **NF-e** → **Rastreio** → **Entrega**.

### 9. Navegação alvo
**Carteira → Menor Lance Único → Início → Ofertas Programadas → Mais.**

### 10. UTAC106 (subdivisões 106a-h)

**Ordem definida pelo enunciado:** `UTAC106x` → `UTAC106x.1` (esta NORTE + reversões) → `UTAC106x.2`
(ESCOPO-ALVO / FICHA-PLAY / MC100_MATRIZ) → `106a` → `106b/106c/106d` (paralelo) → `106e` → `106f` →
`106g` → `106h`.

| UTAC | Escopo | Depende de | Estimativa |
|---|---|---|---|
| **106a** | mapeamento do fluxo actual (usa esta NORTE como referência) | 106x.2 | — |
| **106b/c/d** | (paralelo) | 106a | — |
| **106e / 106f / 106g** | sequenciais; 106g inclui a **NF-e automática** (§5.3) | 106b/c/d | — |
| **106h** | **Regras oficiais publicadas no app** | 106g | — |

> ⚠️ **LACUNA (GATE 2).** O enunciado **lista** as subdivisões 106a-h e a ordem, mas **não fornece** o
> escopo, as dependências nem as estimativas de cada uma. **Não se inventam** (E9/GATE 2). Só o que o
> enunciado fixa está acima; o resto fica **por especificar** (é trabalho do UTAC106a). O **UTAC119**
> (classificação de conteúdo + Data Safety + screenshots) também é nomeado pelo enunciado, mas não pertence
> a esta série.

### 11. Histórico — definição ANTERIOR (SUPERADA, mantida à vista — P2 · GATE 15)

> ⛔ **SUPERADO pela Via B (R18-C, 2026-10-04).** Registado, **não** seguido. Snapshot integral em
> `_logs/UTAC106x_NORTE-ANTERIOR.md`.

A versão anterior (MC-NORTE-01 / MC-PRODUTO-01, 2026-09-28) definia:
- a **Oferta Programada** como modalidade de **senhas de R$ 2,00**, com **critério de vitória = MENOR LANCE
  ÚNICO** (o mesmo da Relâmpago), e não como programa de fidelidade;
- o produto como **«torneio de habilidade»** com **7 pilares** (E-commerce · Dropshipping · Ofertas
  inteligentes · Habilidade · Transparência · GUTO · Conformidade);
- **cotas de patrocinador** Bronze/Prata/Ouro/Diamante (níveis de visibilidade do lojista);
- o vendedor como **Grupo União e Trabalho — GUT** (`REGULAMENTO-v4.md:5`);
- vantagem/comportamento de **isenção** discutidos à luz da **Lei 5.768/1971** (depois **superada** pela
  secção `ESCOPO-ALVO v6.0`, que passou a exigir **SPA/MF** para um «concurso de previsões» — agora
  **também superada** por esta NORTE Via B).

> O texto completo desta versão, com os 7 pilares, as tabelas de cotas e o alerta jurídico de 2026-09-28,
> está preservado **byte a byte** em `_logs/UTAC106x_NORTE-ANTERIOR.md`.

> 🔎 **VERIFICAÇÃO DA CONSOLIDAÇÃO — UTAC106x.6 (2026-10-04).** A checklist de consolidação do chat
> (Passe R$ 2,00 = 1 ponto · 50 pontos = 1 cartão · palpite = +2 pontos · lojistas = patrocinadores, não
> vendem nem entram no app · NF-e CFOP 5.910 + 5.102 · associação como vendedor legal · isenção IR/CSLL/
> Cofins · sem SPA/MF · Google Play = loyalty program · Apple = bem físico sem IAP) está **coberta** por
> esta secção. **Excepto um item: «limite 5% — NÃO se aplica»** — medido: `grep -in "5%"` no `CLAUDE.md`
> e nos logs da série x dá **0 ocorrências**; o referente do «limite 5%» **não está documentado em nenhuma
> fonte medida**, logo **não se inventa** (GATE 2). Fica **por esclarecer pelo operador**; **não bloqueia o
> UTAC106a** (mapeamento do fluxo do código). Ver `_logs/UTAC106x.6-pendencias.md` §Frente C.

---

## Active Premium Skills

Skills padronizadas em `~\.claude\skills\<nome>\SKILL.md` (formato SKILL.md, ativas no Claude Code):

- @design-engineering — spring physics, layout anti-CLS, optimistic updates no pipeline de lance.
- @impeccable-design — cores dessaturadas + acento cirúrgico, dark mode profundo, contraste WCAG AA, foco visível.
- @taste-engineering — minimalismo funcional, copy honesta, microcopy de confiança em fluxo cripto/financeiro.
- @graphify — knowledge graph do codebase (`graphify update .`); query/path/explain sobre `graphify-out/`.

> Skills de infraestrutura adicionais (não-DESAFIOGUT, mesmo local): `aidesigner-frontend`, `skillcam-distill`.

---

## Instruções para Claude

1. **Use `@file` para acesso focado** — leia arquivos individuais ao invés do projeto completo.
2. **Privy é o padrão oficial** — use `wallets[0].getEthereumProvider()` (EIP-1193) para toda autenticação, assinatura e gestão de wallet.
3. **Deploy é Netlify e é MANUAL** — **não há auto-deploy**. Publica-se com
   `netlify deploy --prod --build` a partir da branch em checkout.
   **Nunca usar `--dir=dist`**: assa o env local no bundle e pode regredir a rede.
   Fluxo seguro: `netlify deploy --build` (draft) → validar o bundle → `--prod --build`.
   Sinal de que produção recebeu o artefacto validado: o CLI dizer `CDN requesting 0 files`.
4. **Mantenha `MOCK_MODE`** — necessário para dev/test sem Privy.
5. **`VITE_PRIVY_APP_ID`** é obrigatório para o login funcionar em qualquer ambiente.

---

## Stack Oficial

| Camada | Tecnologia | Versão |
|---|---|---|
| Build | Vite | ^8.0.8 |
| UI | React | ^18.3.1 |
| Estilo | Tailwind CSS v4 + Shadcn UI (manual) | ^4.2.2 |
| Animações | Framer Motion | ^12.38.0 |
| Blockchain | Ethers.js v6 | ^6.16.0 |
| **Auth + Wallet** | **Privy** (Embedded Wallets — Google; E-mail OTP só no fluxo corporativo) | **latest** |
| Rede | Ethereum **MAINNET** (chainId `1` / `0x1`) — desde o MC60 | — |
| Hash off-chain | Argon2id via `hash-wasm` WASM | ^4.11.0 |
| Sanitização | DOMPurify + regex custom | ^3.1.6 |
| Deploy | Netlify (SPA rewrite) — https://silly-stardust-ca71bc.netlify.app | — |

> ✅ **Privy é o padrão oficial de autenticação e gerenciamento de carteira.**
> Objetivo: **zero barreira de entrada** — sem extensão de browser, sem QR Code, sem seed phrase.
> O login público é **Google** (`login({ loginMethods: ["google"] })` em `AppContext.jsx`).
> O **e-mail (OTP)** continua a ser usado no fluxo **corporativo**. **Apple está morto** —
> não está ativo no painel Privy nem no código. A carteira Ethereum (mainnet) é criada
> automaticamente.
>
> Hooks Privy disponíveis (importar de `@privy-io/react-auth`):
> - `usePrivy()` → `{ ready, authenticated, user, login, logout }`
> - `useWallets()` → `{ wallets }` — `wallets[0]` é a embedded wallet Privy
> - `wallet.getEthereumProvider()` → provider EIP-1193 para assinar via ethers.js
> - `wallet.switchChain(1)` → força rede mainnet antes de transações

---

## Regras de Negócio

- **Artigo VIII** — Vence o **menor lance único** (valor que aparece exatamente 1 vez).
- **Artigo XVII/XXI** — Senhas são liberadas pela coordenação após PIX ou Bônus.
- **Artigo XXIII** — Lance mínimo: R$ 0,01 (1 centavo).
- **Segurança** — Cada lance gera um hash Argon2id off-chain (prova de intenção imutável).
- **Assinatura** — EIP-191 via Privy embedded wallet antes de enviar a transação on-chain.
- **Rate Limit** — 5 lances/min, cooldown 3s por carteira (client-side, complementar ao contrato).
- **Compliance** — Gate de consentimento LGPD obrigatório antes de qualquer interação.

---

## Smart Contracts Ativos

### `LeilaoGUT` — Ethereum MAINNET (ativo)
```
Endereço : 0x0052477A8CA81BCAF4a60e21e635F9e00a5d16cd
Rede     : Ethereum mainnet (chainId 1)
Etherscan: https://etherscan.io/address/0x0052477A8CA81BCAF4a60e21e635F9e00a5d16cd
Arquivo  : desafio-gut/contracts/Leilao.sol
Marco    : MC60 — produção passou para mainnet. Coordenação = EOA 0xFea436…1E67.
```

> ⚠️ **`0x59A73Acc8E8B210C874B0E3A9eC9B8B64847F6D5` é o contrato Sepolia ABANDONADO.**
> Se aparecer num bundle de produção, é regressão — ver o portão de validação
> em `docs/MC89.49-DEPLOY-LOG.txt`.

**ABI mínimo utilizado pelo frontend:**
```solidity
function darLance(string idEdicao, uint256 valorEmCentavos) public
function apurarVencedor(string idEdicao) public view returns (uint256, address)
function saldoSenhas(address) public view returns (uint256)
function coordenacao() public view returns (address)
function abrirEdicao(string idEdicao, string nome, uint256 duracaoSegundos) public
function edicoes(string) view returns (string nome, bool ativa, uint256 prazo)
```

**Edição ativa no frontend:** `"R-1"`

---

## Variáveis de Ambiente

| Variável | Valor | Arquivo |
|---|---|---|
| `VITE_PRIVY_APP_ID` | `cmo51f3v300l90clgzksivvad` | `.env.local` + Netlify Dashboard |
| `VITE_CONTRATO_SEPOLIA` | `0x0052477A8CA81BCAF4a60e21e635F9e00a5d16cd` — **apesar do nome, é o contrato MAINNET**; é esta a var que o frontend lê (`src/lib/network.js:19`) | Netlify Dashboard |
| `VITE_ALCHEMY_URL` | endpoint **`eth-mainnet`** da Alchemy | Netlify Dashboard |
| `VITE_CHAIN_ID` | `1` | Netlify Dashboard |
| `VITE_NETWORK_STAGE` / `NETWORK_STAGE` | `mainnet` | Netlify Dashboard |
| `VITE_MOCK_MODE` | `false` em prod | `.env` |
| `VITE_WC_PROJECT_ID` | legado — não usado na lógica ativa | `.env.local` |
| `VITE_CONTRACT_ADDRESS` | ⚠️ **VAR MORTA** — está a `0x0000…0000` no Netlify e **ninguém a lê**. Não confundir com a de cima. | Netlify Dashboard |

> ⚠️ **`.env.production` já não existe** em `desafio-gut/frontend/`. Os valores de
> produção vivem no **dashboard do Netlify** e são injetados pelo `--build`.

> ⚠️ **`VITE_PRIVY_APP_ID` é obrigatório.** Sem ele, o login não inicializa.
> 1. Acesse https://privy.io → projeto já criado (App ID `cmo51f3v300l90clgzksivvad`)
> 2. Em Settings → Login Methods → Google + Email ativos (Apple ainda desabilitado no painel)
> 3. Em Settings → Embedded Wallets → "Create on login" ativo para "All users"
> 4. Em Allowed Origins: `https://silly-stardust-ca71bc.netlify.app`

---

## Arquitetura de Arquivos

```
desafio-gut/
├── contracts/
│   └── Leilao.sol                  ← Contrato auditável
└── frontend/
    ├── .env                        ← VITE_MOCK_MODE (dev)
    ├── .env.local                  ← VITE_PRIVY_APP_ID + VITE_CONTRATO_SEPOLIA (não commitar)
    │   (.env.production JÁ NÃO EXISTE — produção vem do dashboard do Netlify)
    └── (raiz do repo) netlify.toml ← base=desafio-gut/frontend + SPA rewrite + CSP
    ├── vite.config.js              ← Tailwind v4 plugin + alias @
    └── src/
        ├── main.jsx                ← Entry point: PrivyProvider (mainnet) + Google
        ├── lib/network.js          ← FONTE ÚNICA de rede/contrato/explorer (MC59.2)
        ├── globals.css             ← Design tokens @theme + keyframes
        ├── App.jsx                 ← Orquestrador: usePrivy + useWallets + timer + lances
        ├── lib/utils.js            ← cn() helper (clsx + tailwind-merge)
        ├── components/
        │   ├── CardLance.jsx       ← Formulário de lance + Privy wallet signing + Argon2id
        │   ├── TabelaLances.jsx    ← Tabela ordenada + Framer Motion + beam
        │   ├── TermosConsentimento.jsx  ← Gate LGPD
        │   └── ui/
        │       ├── card.jsx        ← Shadcn Card (glassmorphism)
        │       ├── badge.jsx       ← Shadcn Badge (success/warning)
        │       └── progress.jsx    ← Shadcn Progress
        └── utils/
            ├── appkit.js           ← ⚠️ ARQUIVADO — substituído por Privy
            ├── web3.js             ← OFICIAL: hashLance, assinarLance, enviarLance, getEdicaoPrazo
            ├── sanitize.js         ← DOMPurify + validação de endereços
            └── rateLimiter.js      ← Token bucket (5/min, cooldown 3s)
```

---

## Design Tokens (globals.css)

| Token | Valor | Uso |
|---|---|---|
| `--color-gut-bg` | `#04080f` | Fundo da aplicação |
| `--color-gut-primary` | `#00d4aa` | Acento teal-cripto + `accentColor` Privy |
| `--color-gut-gold` | `#f5a623` | CTAs, overlay vencedor |
| `--color-gut-danger` | `#ff3d71` | Timer urgente ≤5s |
| `--color-gut-success` | `#00c853` | Dot conectado, saldo |
| `--color-gut-warning` | `#f97316` | Timer 6–15s |

---

## Fluxo de um Lance (produção)

> **Pré-requisito (leilão programado):** o endereço do usuário precisa ter
> `saldoSenhas > 0` no contrato. O crédito é feito **on-chain pela coordenação**
> via `adicionarSenhas(usuario, n)` após confirmação do PIX (Art. XVII/XXI) —
> não há mais conversão local de saldo flash em ficha. O frontend lê o saldo
> via `getSaldoSenhasOnChain` e escuta `SenhasCreditadas` + `LanceDado` para
> manter a UI sincronizada (`AppContext.subscribeSaldoSenhas`).

```
1. Usuário clica "🎯 Entrar no Leilão"
   └─ login() Privy → modal com Google / E-mail / Apple
      ├─ Login Google: OAuth flow → carteira embedded criada automaticamente
      ├─ Login E-mail: código OTP → carteira embedded criada automaticamente
      └─ Login Apple: OAuth flow → carteira embedded criada automaticamente
      ✅ Sem extensão de browser. Sem QR Code. Sem seed phrase visível.

2. Privy confirma autenticação
   └─ usePrivy() → { authenticated: true, user: { google: { email, name } } }
   └─ useWallets() → { wallets: [{ address, walletClientType: 'privy' }] }

3. AppContext lê saldoSenhas(address) on-chain (gate de darLance)
   └─ getSaldoSenhasOnChain(address) → exposto como { saldoSenhas, saldoSenhasStatus }
   └─ Botão "Confirmar Lance" fica disabled enquanto saldoSenhas == null/0
      ou status ∈ { loading, error }.

4. Usuário digita valor (centavos) e clica "Confirmar Lance"
   ├─ sanitizeLance()              → valida range 1–999999
   ├─ verificarRateLimit()         → token bucket client-side
   ├─ hashLance()                  → Argon2id WASM (prova off-chain)
   ├─ wallet.switchChain(1)        → garante rede mainnet
   ├─ wallet.getEthereumProvider() → provider EIP-1193
   ├─ getSignerFromProvider()      → ethers.js BrowserProvider + Signer
   ├─ assinarLance()               → EIP-191 signMessage (popup Privy na tela)
   └─ enviarLance()                → darLance(idEdicao, valorEmCentavos) on-chain MAINNET
                                     ↳ contrato decrementa saldoSenhas[msg.sender]
                                       (não há gastarFicha localStorage no fluxo real)

5. Confirmação da tx → receipt.hash exibido + tabela atualizada
   └─ Listener LanceDado dispara refetchSaldo → badge 🔗 atualiza sozinho
```

---

## Próximos Passos

- [ ] Habilitar Apple OAuth no painel Privy
- [ ] Adicionar `apurarVencedor()` público para exibição do vencedor real on-chain
- [ ] Persistência multi-usuário dos lances (backend ou indexação de eventos)

---

## MC24 — Hotfix ReferenceError `card is not defined` (2026-06-14)

**PR:** [#55](https://github.com/desafiogut/desafiogut/pull/55) | **Branch:** `feat/mc24` → `main`

### Bugs Corrigidos

| # | Ficheiro | Erro | Causa |
|---|---|---|---|
| 1 | `Dashboard.jsx:302` | `...card` → undefined | Objeto `card` deletado no commit `b6ef24c` (MC23.3 GlassCard) |
| 2 | `CorporativoAnalytics.jsx:98,114` | `...cardStyle` → undefined | `cardStyle` nunca definido |
| 3 | `SejaNossoParceiro.jsx:584` | `...inputStyle` → undefined | `inputStyle` removido; `<select>` não usa `<Input>` |
| 4 | `CorporativoDashboard.jsx:426,503,507` | `inputStyle` → undefined | `inputStyle` removido; `<select>`/`<textarea>` não migrados |

### Lição Aprendida

**Ao substituir objetos de estilo inline por componentes primitivos, verificar TODOS os spreads residuais.**  
`grep -rn '\.\.\.varName' src/` deve retornar vazio ou ter definição correspondente.

### Regra Adicionada ao Pipeline

Antes de merge de migração de UI:
1. `rg '\.\.\.(card|cardStyle|inputStyle|buttonStyle|modalStyle|tableStyle|badgeStyle)[^a-zA-Z]' src/` → cada spread deve ter `const` correspondente no mesmo ficheiro
2. `npm run build` → verde obrigatório
3. Smoke test MCP em `/` (Dashboard) — página mais complexa

---

## MC00.0 — Análise de impacto: leilão → e-commerce por dropshipping (2026-09-23)

**Natureza:** diagnóstico puro, zero código. **SEG-1: SEGUIR** (R19 ativada).
**Validação independente: APROVADO COM RESSALVAS** (7 ressalvas, 3 bloqueantes).
**Relatório:** `_logs/MC00.0-RELATORIO.md`.
⚠️ Os números corrigidos vivem em `_logs/MC00.0_SEG4_ERRATA-EXECUTOR.txt`, que
**supersede** os SEG0–SEG3. Inventário bruto grep-ável:
`_logs/MC00.0_SEG4_INVENTARIO-V3-CORRIGIDO.tsv`.

### O leilão já está desligado — mas o alinhamento falha onde importa

Não é plano; é o estado do código em `main`:

| Onde | O quê |
|---|---|
| `src/lib/leilaoLock.js:10` | `EM_BREVE_MODE = true` — todos os cronómetros mostram "EM BREVE" |
| `netlify/functions/_lib/recursos-app-config.mjs:19` | `isLeilaoAtivo: { ios:false, android:false, pwa:true }` ⚠️ é o **default no código**; o valor vivo do Blob não foi lido |
| `src/pages/MercadoLances.jsx:338` | "Vista de conformidade (modo loja iOS/Android)" |
| `netlify/functions/_lib/guto-perfis.mjs:74` | `PROMPT_CONFORMIDADE`: *"…nesta versão do app (loja de e-commerce)"* |
| `src/components/ScheduleView.jsx` | lógica do calendário removida; só resta "EM BREVE" |

⚠️ **Mas:** `GlassHeader.jsx:35` ("E-commerce através de Dropshipping") está dentro
de `{!isMobile && …}` — **não aparece no telemóvel**, que é a superfície que a Play
distribui. E `index.html:8` diz, na mesma frase, *"E-commerce via Dropshipping. Dê
seu lance: o menor valor único vence."* O alinhamento é **parcial e inconsistente**.

### Os três níveis (decisão D1 — nenhum MC de execução abre sem esta resposta)

| Nível | O que é | Custo |
|---|---|---|
| **N1 terminológico** | trocar as palavras | 4 MCs · **⛔ PROIBIDO isolado** |
| **N2 declarativo** | alinhar loja + regulamento + identidade visual | 9 MCs (recomendado **já**) |
| **N3 funcional** | construir o e-commerce | 22 MCs (bloco C: 13–19) |

**Porque N1 isolado é proibido:** trocar a palavra mantendo o mecanismo de menor
lance único transforma uma declaração honesta ("isto é um leilão") numa declaração
falsa ("isto é uma loja"), perante o consumidor **e** perante a Play.

### Superfície medida (números v3 — com fronteira de palavra, PT+EN+ES)

| Área | Medida | Grau |
|---|---|---|
| Frontend | 128 strings de UI · 33 ficheiros · **0 rotas** com "leilao" | MÉDIO |
| Backend | 73 strings · **40 só em `_lib/guto-perfis.mjs`** · 5 nomes de função = URL pública | MÉDIO |
| Banco | tabela `lances` **0 linhas**; **0 matviews** no schema public | BAIXO |
| Docs | 1.121 em 154 ficheiros, mas **só ~6 normativos vivos** | BAIXO |
| Planos | ⛔ `plans/002:97` manda declarar "leilão pago (senhas R$2)" à Google; `:139` admite que leilão visível = **"real-money gaming"** | ALTO |
| CI | `contract-security.yml` + `security-scan.yml` apontam a `LeilaoGUT.sol` | MÉDIO |
| Lojas | 11 declarações, **incl. a CATEGORIA (Finanças)** | ALTO |
| Jurídico | regulamento **internamente contraditório**; 8 documentos inexistentes | CRÍTICO |
| Fiscal | zero infraestrutura (NF-e, NCM/CFOP, regime) | CRÍTICO |
| *[R19]* Contrato | `LeilaoGUT` em mainnet — **imutável**; `require("Lance minimo e R$ 0,01")` é permanente | IRREVERSÍVEL |
| *[R19]* Visual | **o ícone do app é o GUTO com um martelo de leiloeiro** (18 ficheiros) | ALTO |
| *[R19]* E-commerce | carrinho, frete, CEP, morada, NF-e, rastreio, devolução, stock, SKU, fornecedor = **0** | CRÍTICO |

> ⚠️ "dropshipping" aparece **2 vezes** no código, ambas cosméticas. **Zero** comportamento.
> ~~⚠️ A cópia de leilão **já está traduzida** em en.js/es.js ("Bids", "Pujas",
> "Lowest Unique Bid"). São **3 idiomas** a reescrever, não 1.~~
> ⚠️ **REVOGADO pelo MC98 (2026-09-27).** `en.js` e `es.js` foram **removidos** — o
> DesafioGUT é **PT-BR only** (decisão do operador, R18). Não há "3 idiomas a
> reescrever": há **um**. Ver a secção MC98 no fim deste ficheiro.
> ⚠️ Vocabulário adjacente (edição/senha/slot/vencedor) é **~1,7× o termo directo**
> no frontend (659 vs 376). Contar palavras dimensiona a copy, não o produto:
> `src/data/programacao-junho-2026.js` codifica 168 sessões de leilão por mês e tem
> **0 ocorrências** do termo.

### A contradição jurídica está dentro do regulamento, não na UI

`src/components/TermosConsentimento.jsx` declara no **Art. 1** que é *"atividade
comercial em formato de E-commerce através de Dropshipping"* e, 30 linhas abaixo,
no **Art. 8**, que *"O MENOR LANCE ÚNICO GANHA"*, e no **Art. 14** que o
contemplado recebe **prémio** em dinheiro (80% acima de R$ 10.000).

### Os três estrangulamentos (mandam na sequência)

1. **O índice RAG vive fora do repo.** Editar `docs/chatbot/regulamento.md` **não**
   muda o que o GUTO responde — é preciso `scripts/build-rag-index.mjs` (operador).
   Critério de aceitação = *perguntar ao GUTO em produção*, não ler o .md.
   ⚠️ Os pré-requisitos do rebuild (tokens HF/OpenAI/Netlify) **não estão
   documentados em lado nenhum**.
2. **O APK não se actualiza com deploy web.** Só mudam sem APK novo: respostas do
   backend/GUTO, o flag `recursos_app`, e conteúdo por API. ⇒ **agrupar tudo numa
   só submissão**; nunca "um MC por correção de texto".
3. **Há dinheiro real na economia de senhas.** Verificado por SQL:
   **R$ 23,75 em aberto, em 7 contas** + 21 registos de crédito + `saldoSenhas`
   on-chain. Nada se desmonta antes de decidir o que lhes acontece.

### ⛔ Dívida PRESENTE (não é risco futuro)

A ficha da Play descreve um leilão; o APK entregue tem `isLeilaoAtivo:{android:false}`
e mostra "EM BREVE". **Descrever funcionalidade que a app não entrega é motivo de
rejeição hoje.** E `plans/002` manda declarar "leilão pago" à Google.

### ✅ O teste fechado NÃO começou — a janela está aberta e é barata

`closed-testing/logs/coleta-2026-08-24_*.txt` → `closed_testing=nao_iniciado`, e não
existe `relatorios-diarios/`. Não há feedback a desperdiçar nem testadores a
confundir. **Adiar custa mais do que agir.** (Evidência de 2026-08-24 — confirmar
que nada mudou.)

### ⚠️ O catálogo vivo está em Netlify Blobs, NÃO no Supabase

`produtos.mjs:20,47` → `getStore` + `BLOB_PRODUTOS`. A tabela Supabase `produtos`
(0 linhas) é infraestrutura morta. O status de publicação **existe** no Blob
(`rascunho/ativo/vendido/entregue`). Qualquer plano de schema que ignore isto está
a desenhar migrações em tabelas mortas.

### Decisões pendentes (bloqueiam execução)

| # | Decisão | Quem decide |
|---|---|---|
| D1 ⛔ | Qual o nível (1, 2 ou 3)? | cliente |
| D2 ⛔ | O menor lance único continua a existir? Onde? | cliente + advogado |
| D3 ⛔ | Destino dos saldos já pagos (**R$ 23,75 em 7 contas** + on-chain) | cliente + advogado + contabilista |
| D4 ⚠️ | Quem vende: GUT em nome próprio ou intermediação? | advogado + contabilista |
| D11 ⚠️ | **Onde vive o catálogo: Blobs (hoje) ou Supabase?** | operador + agente |
| D6 ⚠️ | Categoria da Play passa de Finanças a Compras? | cliente |
| D7 ⚠️ | O martelo sai da marca? | cliente |
| D8 • | O contrato on-chain fica ligado ao app? | cliente |
| D9 • | "Vitrine (4 Slots)" e as cotas mantêm-se? | cliente |
| D10 • | Domínio definitivo (`MercadoLances.jsx:342` fixa `desafiogut.com`) | operador |
| ~~D5~~ | ~~O teste fechado já começou?~~ | **RESPONDIDA: não começou** |

### Sequência recomendada

```
A1 decisão+jurídico → A2 regulamento/políticas → B1 GUTO+RAG → B2+B3 copy em bloco
→ B4 identidade → B5 screenshots → B6 ficha+plans/002+003 → B7 APK (uma submissão)
```
e, só se D1 = Nível 3: `C1 liquidar senhas → … → C11 desmontar o leilão`
(**C1 sempre antes de C11**; C11 parte 2 workflows de CI e a suíte de testes).

> ⚠️ **B1 vem DEPOIS de A2, nunca antes.** A primeira versão deste plano invertia-os,
> e o Validador mostrou que isso era o "Nível 1 isolado" que a própria regra proíbe.
> O texto é a promessa; a promessa vem depois de se saber o que se pode prometer.

### Lição de método (vale para lá deste MC)

O scanner original usava `/lances?/` **sem fronteira de palavra** e contava "lance"
dentro de **"Balance"**. Só o **controlo negativo** o expôs — o controlo positivo
passava a 5/5. Varredura por palavra-chave precisa sempre dos dois controlos, e
fronteira de palavra em PT precisa da variante espelhada para camelCase
(`darLance`, `CardLance`: 557 ocorrências que a versão corrigida deixa de ver).

### Não medido (L-4)

Sem acesso à Play Console nem ao App Store Connect. Sem advogado nem contabilista —
as secções jurídica e fiscal são **levantamento de risco, não parecer**. MCPs
`chrome-devtools` e `claude-eyes` falharam a ligar: **nenhum ecrã foi observado a
correr**. O valor **vivo** do Blob `config-experiencia:recursos_app` não foi lido.

---

## MC93-A — Motor de pontuação do torneio de habilidade (2026-09-23)

**Entregue:** motor PURO. **Não entregue, por decisão do operador (R18):** tabelas,
endpoints, gancho de rodada e emissão de senhas → **MC93-B**.
**Código:** `netlify/functions/_lib/pontuacao-utils.mjs` ·
**Testes:** `_tests/mc93-pontuacao.test.mjs` (33) ·
**Spec:** `docs/TORNEIO-HABILIDADE.md` · **Logs:** `_logs/MC93_*`

### ⚠️ O enunciado do MC93 tinha 7 de 9 premissas erradas

Verificado no SEG-1 (`_logs/MC93_SEG-1_QUESTIONAMENTO.txt`). Guardar, porque
qualquer MC futuro que parta do mesmo enunciado repete os mesmos erros:

| Premissa do enunciado | Realidade |
|---|---|
| `lance-programado.mjs` | **não existe** |
| `admin-cotas.mjs` (padrão de referência) | **não existe** — o padrão é `guardAdmin` de `_lib/admin-auth.mjs` |
| tabela `edicoes` | **não existe** — é `mapping` dentro do contrato `LeilaoGUT` |
| tabela `usuarios` | **não existe** — a chave é o `endereco` da carteira (Privy) |
| tabela `senhas` | **não existe** |
| `lances` tem `usuario_id`/`criado_em`/`repetido` | tem `endereco`/`created_at`/`payload`; e **0 linhas** (os lances vivem em Blobs) |
| baseline 842 verdes | **403** (medido) |
| `pytest` / `ruff` | são de Python; aqui é `node --test` e `eslint` |
| gancho de fim de rodada em `lance-relampago.mjs` | é endpoint **por lance**; o fecho está em **`consolidar-lances.mjs`** |

### ⛔ O bónus de senhas NÃO é um UPDATE

`comprar-senhas.mjs:281` e `troco.mjs:89` → `creditarSenhas()` → `adicionarSenhas`
**on-chain, Ethereum mainnet** (`_lib/contract.mjs`). Creditar 20 senhas é uma
transação assinada pela coordenação: **gas real + R$ 40,00 de valor emitido** por
sequência, sem limite definido. O enunciado declarava "R2 SUSPENSA (custo zero)" —
premissa falsa. **R2 tem de ser reativada antes de qualquer emissão.**

Por isso o motor **calcula e não executa**: `detectarConsecutivos` devolve
`senhasBonus`/`pontosBonus` — o que *seria* devido. Não credita nada.

### Regras implementadas (fonte única em `REGRAS`, `Object.freeze`)

`VALOR_MINIMO_CENTAVOS 1` (Art. XXIII) · `PONTOS_ACERTO_UNICO 1` ·
`PONTOS_MENOR_UNICO 3` · `ACERTOS_PARA_BONUS 5` · `PONTOS_BONUS 5` ·
`SENHAS_BONUS 20`.
**Quando o MC95 fixar o regulamento, muda-se ali — num sítio só.** Há testes que
fixam os cinco números **em literal**: se mudarem, a suíte falha de propósito.

### ⚠️ Defeitos encontrados por validação independente (e o que os causou)

A minha própria prova de mutação deu **12/12 mortos** e eu dei o segmento por
fechado. O Validador encontrou **seis defeitos reais**. Todos confirmados por
execução antes de aceitar:

1. **`valorCentavos: null` ganhava a rodada.** `Number.isInteger(Number(null))` é
   `true` porque `Number(null) === 0` → lance único, o mais baixo, vencedor, 4
   pontos. ⚠️ **`Number.isInteger` NÃO coage** — o defeito era o `Number()` à
   volta dele. E há caminho real: `_lib/data-store-supabase.mjs:117` grava
   `valor_centavos = null` **de propósito** para marcar lance inválido. Duas
   convenções opostas.
2. **Zero e negativos pontuavam**, contra o Art. XXIII.
3. **Lance sem dono anulava o +3 para todos** — era eleito menor único e o bónus
   evaporava-se em vez de passar ao seguinte.
4. **`atualizarRanking` rebentava** com `Map` de chaves não-textuais: o caminho do
   Map não normalizava, o da lista sim — duas políticas na mesma função.
5. **`detectarConsecutivos` falhava ABERTO**: `Boolean("sim")` pagava 20 senhas.
6. **O teste de pureza é cego através do import** — `simulador.mjs` importa
   `@netlify/blobs`. E o teste "não duplicar" só via a *linha* de import: apagar
   a *chamada* e reimplementar localmente deixava tudo verde.

### Lições de método (recorrência alta, impacto alto)

- **Asserção que usa a mesma constante do código não testa a regra de negócio.**
  Na 1ª ronda, `PONTOS_MENOR_UNICO: 3 → 0` deixou a suíte toda verde, porque os
  testes comparavam contra `REGRAS.*`. Valores de negócio fixam-se **em literal**.
- **Uma prova de mutação só é tão boa quanto os mutantes que alguém se lembra de
  escrever.** Foi a independência que pagou, não o método.
- **Teste de estrutura por regex lê prosa.** O primeiro `R1: é PURO` falhou por
  causa do meu próprio comentário a nomear `process.env`. Usar `semComentarios()`
  (convenção já existente em `_tests/mc8843-estado-edicao.test.mjs:33`).

### Estado e pendências

**436/436 verdes** (baseline 403 + 33). **Zero ficheiros modificados** — o motor
não tem chamador, logo zero efeito em produção (R1 trivial).
⚠️ Validado só com **dados sintéticos**: o leilão está travado
(`EM_BREVE_MODE = true`; `isLeilaoAtivo:{ios:false,android:false}`), não há rodadas
reais. Cobertura **não medida** (o projeto não tem alvo configurado).

**A fechar antes do MC93-B:** definir "ciclo" (não existe em lado nenhum);
desempate e limite de bónus por participante (ambos com efeito financeiro);
reativar R2; decidir se se inverte a dependência do Blobs. Ver
`docs/TORNEIO-HABILIDADE.md` §6 e §7.

> ⚠️ **Conflito de sequência, registado:** este MC constrói o mecanismo do torneio
> enquanto o regulamento (`TermosConsentimento.jsx` Art. 8) continua a prometer
> "O MENOR LANCE ÚNICO GANHA" e prémio em dinheiro (Art. 14). É a inversão que o
> MC00.0 identificou (errata E6) — mecanismo antes da promessa. O motor foi mantido
> puro e sem chamador precisamente para que essa divergência não chegue a produção
> antes do MC95.

---

## MC93-B — Persistência, endpoints e integração do torneio (2026-09-24)

**Entregue:** `_lib/pontuacao-store.mjs`, `pontuacao.mjs`, `ranking.mjs`,
migração `20260923_mc93b_pontuacoes.sql`, gancho em `consolidar-lances.mjs`, 41 testes.
**477/477 verdes** (baseline 436 + 41). **Logs:** `_logs/MC93B_*` · **Spec:** `docs/TORNEIO-HABILIDADE.md` §4b.
⚠️ **Validação independente: REPROVADO à primeira.** Os números e as afirmações
válidas são os da errata `_logs/MC93B_SEG4_EXECUTOR.txt` §4.9.

### ⛔ PENDÊNCIAS QUE BLOQUEIAM O USO

1. **A migração NÃO foi aplicada.** `pontuacoes` e `rankings_ciclo` não existem
   em produção. O código que as usa falha hoje. Execução é do operador.
2. **Não há handler de fila para `creditar-senhas-bonus`.** Uma tarefa
   enfileirada esgota as 5 tentativas e cai na DLQ. Criar o handler é emissão
   on-chain — fora deste MC, precisa de R2 reativada.

### ⚠️ O bónus é um DIREITO, não um saldo — e porquê

O enunciado mandava "creditar em `saldo_senhas` (Supabase)". **Não é possível:**
`saldo_senhas` nessa base é coluna de **`lojistas`** (0 linhas), não do
participante; e `darLance` exige `saldoSenhas[msg.sender] > 0` **on-chain**
(`Leilao.sol:88`), decrementando-o em `:107`. Uma senha creditada fora da cadeia
**não habilita lance nenhum** — o utilizador veria "+20 senhas" e a transação
reverteria. Além disso `saldo-senhas.mjs` calcula
`saldoEfetivo = saldoOnChain − senhasConsumidas`: somar um termo off-chain
quebraria a invariante `saldoEfetivo ≤ saldoOnChain`.

Decisão do operador (Opção A): grava-se `senhas_a_creditar` com
`liquidado_em = NULL` e enfileira-se `creditar-senhas-bonus`. **A UI do MC94 tem
de dizer "20 senhas a creditar", não "+20 senhas".**

### Decisões do operador materializadas (R18, 2026-09-23)

`ciclo_id` é **TEXT** (ciclo = 1 edição; os ids são `"R-1"` e `lances.edicao_id`
é `VARCHAR(66)` — um UUID impediria o join) · desempate por **mais acertos** ·
**1 bónus por ciclo** · bónus como direito, sem gas.

> ⚠️ O desempate por acertos **não cabia no motor** do MC93-A (que desempata por
> endereço e este MC não podia alterar). Vive no store; há um teste que exige
> que as duas regras coincidam quando os acertos são iguais. Quando o MC95
> ratificar a regra, leva-se ao motor e o store delega.

### Os seis defeitos que a validação independente encontrou

A minha suíte tinha **466 verdes e 0 falhas** ao mesmo tempo que tudo isto era
verdade. **Verde não é prova.**

| | Defeito | Correcção |
|---|---|---|
| P0 | **`/feedback` avariado a 100%** — passei o `Request` onde `verificarUserSession` quer a **string do token** (`_lib/jwt.mjs:78`, como nos outros 18 chamadores). Lançava `JWSInvalid` → 500 fora do `jsonResponse` → **sem CORS** → "Failed to fetch" no APK | Bearer extraído + try/catch → 401. **O mock passou a exigir string** |
| P0 | **Bónus inalcançável em produção** — a integração nunca passava `historicos` → `detectarConsecutivos([])` → `bonus: 0` sempre | O store lê o histórico da **sua própria tabela** |
| P0 | **Concorrência pagava a dobrar** — read-then-write: duas consolidações paralelas gravavam 20 e enfileiravam 40 | **Compare-and-set** (`UPDATE … WHERE bonus_emitido = false`) |
| P1 | **`error` do Supabase ignorado em todas as chamadas** → escrita recusada respondia 200 OK, e tornava decorativo o fail-soft | helper `exigir()` |
| P1 | **Refechar apagava os pontos do bónus** (9 → 4) | preservados e testados |
| P2 | SQL sem `GRANT … TO service_role` (o `REVOKE … FROM PUBLIC` retira o herdado → 42501 **em silêncio**) e CHECK a bloquear a liquidação óbvia | ambos corrigidos |

### ⚠️ Consequência assumida da integração

O gancho é **fail-soft depois do recibo**. Como o `catch` engole,
`marcarConsolidado` **corre na mesma**: se a pontuação falhar, a edição fica
consolidada **sem pontos**, e a 2.ª chamada sai no `estaConsolidado` — o estado
parcial é **permanente** por esse caminho. A recuperação é manual:
`POST /pontuacao` com o mesmo `cicloId` repontua (idempotente, preserva bónus e
liquidação). A resposta devolve `pontuacao: null` para a coordenação ver.
*(Um comentário anterior afirmava que a edição ficava por marcar e a repetição
resolvia. Era falso — corrigido no código e na spec.)*

### Lições de método (recorrência alta, impacto alto)

- **Um duplo que aceita mais do que o original esconde o defeito que devia
  apanhar.** O mock de `verificarUserSession` ignorava o argumento e deu verde a
  um endpoint avariado a 100%. Mocks de funções de segurança têm de **rejeitar
  o que a real rejeita**.


## R14 (append) -- UTAC115 -- FECHO DA FASE DE ENGENHARIA (Hermes + Opus 5.5)

**Tipo:** AUDITORIA + correcao cirurgica + documentacao. **Baseline:** `739dc8f`. Nenhum ficheiro de produto foi alterado, excepto a correcao do ALTO-1 em `validar-compra-google.mjs`.

**Auditoria do Opus (read-only, Frente A) -- APROVADO COM RESSALVAS.** Os tres commits da fase (`142ffd1` UTAC111, `095afbe` UTAC112, `739dc8f` UTAC114) aguentaram a refutacao. Encontrou dois furos de Billing PRE-EXISTENTES (`49eca175`) que o UTAC114 tornou alcancaveis (credencial passou a existir e `isPagamentoNativoAtivo.android = true` em `config_remota`): **ALTO-1** corrida entre contas (o mesmo recibo creditado em varias carteiras) e **ALTO-2** compra nunca consumida no servidor (reembolso da Google ao fim de ~3 dias com os creditos retidos).

**ALTO-1 CORRIGIDO neste UTAC.** Em `validar-compra-google.mjs`, no ramo de colisao `23505`: registo relido de OUTRA carteira => **409 `compra_nao_encontrada`** + alerta de seguranca (mesmo tratamento da leitura inicial); colisao sem conseguir reler => **503 `registo_falhou`** (fail-closed; antes creditava as cegas). Teste novo *CORRIDA ENTRE CONTAS* (duas carteiras em paralelo, mesmo recibo) e prova de mutacao **1/1** (guarda removida => RED, md5 restaurado, `scripts/utac115-prova-mutacao.mjs`).

**ALTO-2 -> DEBT-078 (alta), UTAC116, OBRIGATORIA ANTES DE PRODUCAO.** Durante o teste fechado (License Testing, sem dinheiro real) o risco e aceite pelo operador.

**Infra (Frente B):** HEAD `739dc8f` = `origin/main` = deploy Netlify **ready** (publicado 16:08:29); `config_secrets` com RLS activo, politica unica SELECT->`service_role`, JSON presente (2 037 B) e **anon = 401** (medido, nao suposto). Suite canonica **frontend 1258/1258 · backend 1434/1440 VERDE**.

**Dividas registadas:** DEBT-078 (consumo/reembolso, alta) · DEBT-079 (site inteiro em Lambda compatibility mode; migracao v2 faseada -- 86 das 93 funcoes ja sao v2, faltam os **7 wrappers `schedule()`**; tentar o opt-in por ficheiro `export const config` NAO funciona, o modo e do site -- medido) · DEBT-080 (cache da credencial do Billing sem TTL/invalidacao).

**Artefactos:** `Desktop\DesafioGUT-v3\DesafioGUT-v3.aab` (32 419 569 B, versionCode 3, SHA-256 `460d13bb1edb423dcc24219f30996ee490e011c5d81eac910a29529e8688ef6d`, `jar verified`) + relatorios UTAC113/114/115 na mesma pasta.

**Registo:** `_logs/UTAC115_AUDITORIA.md` · `_logs/UTAC115_FECHO-ENGENHARIA.md` · `_logs/UTAC115_PLANO-MIGRACAO-V2.md` · `_logs/UTAC113_CHECKLIST-LOJA.md` · `Desktop/RELATORIO-UTAC115.txt`.

**Estado:** fase de engenharia encerrada. O proximo passo e operacional (Ruan): subir o AAB v3, testar o Billing em License Testing e so promover para Producao depois de a DEBT-078 estar fechada.
