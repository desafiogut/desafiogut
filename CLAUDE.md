# DESAFIOGUT — Única Fonte de Verdade
> Atualizado em: 2026-10-04 (UTAC106x.1–x.4: **uma só fonte de verdade do produto — NORTE DO PRODUTO Via B (programa de fidelidade)**; a ESCOPO-ALVO v6.0 passou a **HISTÓRICA**; nova regra **A13** (junctions em worktree) + `scripts/worktree-helper.mjs`; pendências P1–P5 fechadas. **Anterior:** UTAC105b.3: **V-4 fechado - posse do `endereco` na CRIAÇÃO do `register-corporativo`**. O `endereco` do CORPO definia o `clienteId` (`endereco ?? "cnpj:…"`) sem prova de posse: um pedido **ANÓNIMO** com o `endereco` de outra pessoa pré-criava ali uma cota corporativa (com a `empresa`/CNPJ do atacante) e a fusão da activação (`_lib/cota-ativacao.mjs`, `{...existente}`) herdava esses dados - poluição de dados/aparência, não privilégio (medido: V1/V2 -> 201 e escreveu). Passa a exigir, **quando vem `endereco` no corpo**, Bearer do **MESMO** endereço - ou admin (regra MC89.38, a mesma do `update-corporativo`): **401** anónimo, **403** de outro, sem escrever; sem `endereco` no corpo (o **único** caminho do frontend, `SejaNossoParceiro.jsx:203-212`) nada muda. 11 testes novos, **5/5 mutantes + 2 equivalentes declarados**, A/B pareado (V1/V2 201->401, V5 201->403, V3/V4/V6 inalterados), prova bidirecional (4 dos 11 caem no código antigo); suíte backend **967/973 VERDE** (frontend 535/535 nas medições do dia; **re-medido no fecho: o frontend está VERMELHO — 68 falhas — por causa EXTERNA ao UTAC: o Vite serve ao componente o `react` pré-empacotado, instância diferente da do teste; reproduz-se no baseline `00610b0` sem nada meu — ver `_logs/UTAC105b.3_SEG6_VERIFICACAO.md` §6.9, escalado ao operador)**. **Decisão do operador R18-5 (OPÇÃO A):** o ficheiro pré-existente `_tests/cotas-anti-fraude.test.mjs` tinha 7 testes que registavam por «anónimo + `endereco` no corpo» - exactamente o contrato que o V-4 fecha; passou a prova de posse **só no helper `reqRegister`** (+12 `await` nos call sites), com **todas as asserções intactas**. Anterior: UTAC105b.2: **P0 do `register-corporativo`** — o `clienteId` vinha do CORPO (`endereco ?? "cnpj:…"`) sem prova NENHUMA e o `upsertCota` escrevia um registo completo com `categoria:null, vendida:false, valor:0`: um pedido ANÓNIMO com o `endereco`/CNPJ de outra pessoa devolvia 201 e DESTRUÍA a cota dela (`ouro/vendida:true/55000` → `null/false/0`, medido). Passa a exigir prova de posse (MC89.38) antes do upsert — 401 anónimo, 403 de outro, 502 fail-closed na falha de leitura — e o cadastro legítimo (só cria cotas NOVAS) fica intacto. Inclui a Frente C: o POST genérico de admin preserva a coluna `endereco` (apagava-a, e o ramo (b) do MC89.38 depende dela). Validador adversarial: (veredicto SEG3 ainda não disponível). Anterior: UTAC105b.1: **autenticação em `cotas?action=update-corporativo`** (P0) — a ação **não autenticava NADA** (o comentário dizia que verificava o email; era falso): qualquer pessoa com um `cliente_id` alterava a cota. Passa a aplicar a regra **MC89.38** (dono OU cota vinculada por `endereco` OU admin — 401 sem token, 403 de outro, fail-closed 502) e o painel `CorporativoDashboard` passou a enviar o `Bearer`. Consequência aceite (R18-2): cota `cnpj:` sem `endereco` dá 403 ao próprio dono. Anterior: UTAC000.2: **review automático da skill UTAC01** — `review/` + `_logs/REVIEWS/`, versão em `review/VERSAO.md` (1.0). Anterior: UTAC105b: **cupons do Passe Desafio** — tabela `cupons`, painel do lojista, `comprar-passe` grava os cupons activos; **skill UTAC01 obrigatória**. Anterior: MC105a.1: **saneamento de `passes`** — DELETE/TRUNCATE revogados do `service_role`, `passes` na exportação e na exclusão (`anon:<sha256>`), CHECK e UNIQUE ajustados ao pseudónimo, migrações em `supabase/migrations/`. Anterior: MC105a: **Passe Desafio — tabela `passes` + `comprar-passe`** (off-chain, idempotente, débito atómico com compensação). Anterior: MC104.3: **pendências LGPD fechadas no conta-delete** — índice/notificações/lances → `anon:<sha256>`, texto de retenção com NF-e, pedido por CAS; LGPD fechada. Anterior: MC104.2: **conta-delete anonimiza os pedidos** — procura também `comprador`, morada → `***`, NF-e intacta; A/B 0→1; fecha a Onda 1. Anterior: MC104.1: **as 5 flags de transição visíveis no cliente** — `useRecursosApp` com a regra estrita do backend nos 3 caminhos, estado inicial e tempo real; A/B 0/39; destranca o MC111. Anterior: MC104: **LGPD técnico** — aceite do gate registado no servidor (Blob `consent-log`, enviado pós-login, só para a 1.ª conta do aparelho) + `exportar-dados` completo e só do titular (pedidos por `comprador`, lances, pontos, tabelas Supabase). Anterior: MC103: **5 flags de TRANSIÇÃO** em `recursos-app-config.mjs`, criadas e NÃO ligadas (defaults = comportamento actual, A/B 0/30) + **legado medido**: R$ 23,75 em 7 contas · 12 senhas on-chain em 1 conta · 0 dívidas de bónus · Vale-Crédito 0 · ⚠️ R$ 10,25 consumidos sem destino conhecido. Anterior: 2026-09-29, MC102.1b: **Frenet real** — adaptador (só Correios, SEDEX 03220) + `webhook-frenet` idempotente e fail-closed (falta o operador definir `FRENET_WEBHOOK_TOKEN`) + eventos no pedido (só data+código, ISO UTC, via CAS) + 6 refinamentos da timeline (estado «Entregue»). Anterior: MC102.1a: **estrutura do rastreio** — contrato `consultarRastreio` + mock só em testes (injecção; grafo esbuild provado), mapa PT-BR de 5 passos + 3 alertas (DEC-102.1-H), `TimelineRastreio` no cartão só com `rastreio.eventos`; produção visualmente igual até ao MC102.1b. Anterior: MC102.0: **escrita condicional (CAS) no pedido** — `@netlify/blobs` 10.0.0, `set()` com If-Match (o `setJSON` não o envia), retry da operação 3×; ETag de produção por medir. Anterior: MC102: **«Recebi» pelo comprador + prazo de arrependimento de 7 dias** em produção (c408dd0); corrida sem CAS em gravar() pendente. Anterior: MC101: **c56f899 publicado** pelo auto-deploy (MC-SORTEIO-01a + MC-ECOMMERCE-01a em produção); deploys «error» = no content change; flags vivas no Supabase (APK lido como pwa); webhook MP nunca processado. Anterior: MC100: **escopo-alvo v6.0 = os 2 PDFs do Desktop, fonte de verdade (R18)** — e-commerce por dropshipping com Relâmpago (menor lance único, saldo R$) + Programada (concurso de previsões pago com o Passe Desafio de R$ 2,00, com cupons de lojistas), MEI como vendedor, SPA/MF para a Programada; diagnóstico + plano MC101+ em `_logs/MC100_*.md`. Anterior: MC-PRODUTO-01: **produto final fechado com o que JÁ existe** — a senha de R$ 2,00 como produto (crédito de lance + dados estratégicos do Art. 24 + GUTO + placar), sem frontend novo; + alerta jurídico com a premissa refutada. Anterior: MC-NORTE-01: **norte do produto definido** — e-commerce por dropshipping + 7 pilares + modalidades + cotas + leis; camadas e plano de migração. Anterior: 2026-09-27, MC99.5.3: performance — dedup de fontes + fundo mobile; Opção A do SSRF = 9 faixas reservadas; docs/METODOLOGIA-SEGURANCA.md; validador PARCIAL → qualificações corrigidas) | **Ethereum MAINNET ativa desde o MC60** | Pipeline de lance 100% on-chain | **App PT-BR only desde o MC98**
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
> ⏸️ **UTAC000.8 — 2.ª sessão (2026-10-01) — PARADO e ESCALADO (GATE 11); o parágrafo acima foi REFUTADO por medição da PRODUÇÃO** (fica à vista, não se apaga — P2/GATE 14). **Medido** (leitura pública, sem auth, em `https://silly-stardust-ca71bc.netlify.app`; prova de leitura viva: o `/edicoes` devolve `agora` com timestamp de geração): a produção corre em **`NETWORK_STAGE = mainnet`** — `/lances-flash?edicaoId=R-1` devolve `{"ocultoAteConsolidar":true,"lances":[]}`, campo que **só existe no ramo mainnet** do `lances-flash.mjs`. Em mainnet: (a) o **valor real nunca vai para a cadeia** — vai o `keccak256` do lance via `comprometerLance` → evento **`LanceComprometido`** (hash), **não** `LanceDado` (valor); o caminho `darLance` só corre fora de mainnet (`CardLance.jsx` l.172/246+); (b) tudo é persistido no **Key-Per-Bid** (`lance-relampago.mjs` l.247-270) e o Blob `lances-relampago` **nunca é escrito** ⇒ **as DUAS listas estão VAZIAS em produção** — o `lancesFlash` **também**: o código carrega o Blob inteiro (l.768-770), mas **o Blob está vazio**. A frase «o `lancesFlash` não tem o defeito» é **falsa quanto ao que a produção faz**. (c) O **vencedor oficial é apurado off-chain**, a partir do mesmo Key-Per-Bid: `apurarMenorUnico(await getLances(edicaoId))` (`_lib/consolidacao.mjs` l.82-83) — a única fonte com valores, e é **blindada de propósito durante o leilão** (valor `null`, unicidade → **403**; MC28.1 R9 / G-2 anti-bot). **Consequência:** a Frente A do spec (`getLanceDadoEvents` + `getBlocoAtual`) **não serve a produção** — não há valores na cadeia, **não existe** «bloco de arranque da edição» em nenhum ponto do repo (0 resultados no grep) e o `monitor-onchain.mjs` documenta um limite duro de **10 blocos por `getLogs`** (plano Free). Fazer o 🏆 honesto **durante o leilão** exigiria **revelar valores blindados** = **decisão de produto** (o spec diz «NÃO AUTORIZA tomar decisões de produto») + quebra do anti-bot ⇒ **GATE 11: escalado ao operador com opções medidas** em `_logs/UTAC000.8_SEG0_ESCALADA-OPCOES.md` (Op.1 ~2,5-3 h — histórico de participações **ofuscado** + resultado oficial só no fecho; Op.2 ~1 h — só o resultado oficial; Op.3 revelar valores, **não recomendada**; Op.4 não implementar). **Baseline reconfirmado nesta sessão:** `HEAD = origin/main = c64a5bb` (commit de **docs**; o **código** é o de `93c286d`), frontend **VERDE 547/547**, backend **VERDE 967/973** (0 fail, 6 skipped). **Zero código de produção alterado** (só `_logs/`, este ficheiro e o relatório do Desktop). Erros dos meus próprios instrumentos declarados em `_logs/UTAC000.8_SEG-1_MEDICAO.md` §-1.11 e no relatório §8.5 (o principal: a flag **frontend** `VITE_NETWORK_STAGE` **não foi medida**; não altera a conclusão sobre o relâmpago). Evidência bruta: `_logs/UTAC000.8_SEG-1_EVIDENCIA.txt`.
>
> ✅ **UTAC000.8 — DECISÃO DO OPERADOR R18-1 (2026-10-01) e IMPLEMENTAÇÃO — commit `eec94b8`: OPÇÃO 2 (mínimo). O 🏆 deixou de mentir.** Decidido pelo operador: «durante a edição o 🏆 não aparece (honesto); corrigir SÓ com o resultado oficial pós-consolidação». **Feito:** novo `src/hooks/useResultadoOficial.js` — lê `resultados(edicaoId)` **on-chain** (mapping escrito por `consolidarResultado`, a fonte que decide o vencedor) e **reutiliza** `lerResultadoOnchain` de `src/components/edicao-especial/useResultadoEspecial.js`, que **já corria em produção** (sem mecanismo de I/O novo: reutiliza o leitor que já existia); devolve `null` — nunca um objecto «vazio» — quando não há resultado **utilizável**: edição **por consolidar**, **endereço nulo** (`resultados()` devolve-o quando não houve lance único) ou valor ilegível; **fail-soft** (se a leitura falhar, a página não muda). Em `MeusAtivos.jsx`: o 🏆 e o cartão «Menor Lance» usam o resultado oficial **quando existe**; `ehLinhaVencedora` assinala a linha pelo **endereço + valor** do vencedor oficial e, se essa linha não estiver na lista visível, **NENHUMA** linha é assinalada (não se assinala ninguém por aproximação); **sem** resultado oficial mantém-se o apuramento local — o comportamento anterior, **zero regressões**. **Provas:** **24 testes novos** — 16 na página (`src/pages/__tests__/utac0008-resultado-oficial.test.mjs`; duplo do hook em `_stubs/`, que **regista a edição pedida** — a lição do `hooks.js`) + 8 no **efeito real** do hook (`src/hooks/__tests__/utac0008-resultado-oficial-hook.test.mjs`, com o condutor `_hook-runner.mjs`: para de reler ao consolidar, limpeza no desmonte, fail-soft, mudança de edição — lacuna declarada e fechada ANTES do validador, porque os testes da página injectam o resultado por duplo e não exercitavam o corpo do efeito); **4 mutantes que mordem** (M1 «a página ignora o resultado oficial» = repor a DEBT-007 → **5 RED**; M2 «aceitar edição não consolidada» → **1 RED**; M3 «nunca parar de reler após consolidar» → **1 RED**; M4 «sem limpeza do intervalo» → **1 RED**), todos restaurados com **md5 idêntico**; suíte **frontend 571/571 VERDE** (era 547/547), **backend 967/973 VERDE**. Evidência: `_logs/UTAC000.8_SEG-2_ANTES-DEPOIS.txt`. **DEBT-007 FECHADA** (`_logs/DEBT.md`). **DESVIOS DECLARADOS:** (a) o **endpoint de backend** e a **carga inicial no `AppContext`** que o ESCOPO do R18-1 listava **não** foram feitos — a medição mostrou que são **desnecessários** (o leitor do resultado oficial já existe e já corre em produção); aplicada a solução mínima (Ponytail, invocado pelo próprio operador na decisão). (b) Fica **aberta a DEBT-008**: o `vencedor` do **Dashboard** (`AppContext.jsx` l. 698) continua a ser «o menor único que este browser viu» — o R18-1 autorizou corrigir **só** o 🏆/«Menor Lance», e corrigir o Dashboard exige autorização nova. (c) O **validador adversarial** correu sobre o commit `eec94b8` em worktree próprio (veredicto em `_logs/UTAC000.8_SEG-3_VALIDADOR.md`). **Limite de tempo declarado:** o front de implementação passou o 1 h pedido (a soma do SEG-1 2.ª medição, escalada e implementação) — declarado no relatório, não escondido.
>
> 🔎 **UTAC000.8 — VALIDADOR ADVERSARIAL (SEG3, obrigatório) — APROVA com ressalvas, e as ressalvas foram fechadas.** Veredicto integral + resposta do executor: `_logs/UTAC000.8_SEG-3_VALIDADOR.md`. **O validador encontrou um defeito REAL que eu não tinha visto (R1):** o hook guardava o resultado **sem** a edição a que pertencia — ao **mudar de edição**, ou quando a leitura da edição nova **falha**, fica **pendente**, ou a edição passa a **vazio**, a página mantinha o **vencedor da edição ANTERIOR** (a mesma classe de mentira que o UTAC combate). Correcção: o estado passou a `{ edicaoId, resultado }` e só se serve o resultado da edição **pedida**. **R2** (latente): a comparação de endereço baixava a caixa de um só lado → perderia o 🏆 em silêncio com endereço **EIP-55**; agora baixa os **dois**. Os **3 testes vácuos** que ele apontou (passavam com o código antigo) foram **reforçados** com o auxiliar `enderecosVencedores()` (diz **a quem** foi dado o 🏆) + empate de valor + vista local parcial: o mutante M1 passou de **5 RED** para **8 RED**. A **fragilidade que PENDURAVA a suíte** (um `assert` que rebenta antes de `desmontar()` deixa o `setInterval` vivo → `node --test` nunca termina, `exit=124`) foi corrigida com **`t.after(() => c.desmontar())`** nos 12 testes do hook — e provada com o mutante aplicado (falha **e termina**). **6 mutantes mordem** (M1 8 RED · M2 1 · M3 1 · M4 1 · M5 3 · M6 2), todos restaurados com **md5 idêntico**. Suíte final: **frontend 579/579 VERDE · backend 967/973 VERDE**. Crédito e limites do validador estão no próprio veredicto (ele declarou 1 falso vermelho do seu arnês e 2 falsos negativos da sua 1.ª sonda, ambos desmontados).
>
> ⏱️ **REGRA ALTERADA PELO OPERADOR (R18-2, 2026-10-01, durante o UTAC000.8):** o padrão de **1 h por UTAC passa a 2 h**. Registado aqui (R18) e na memória do executor.
>
> 🏆 **UTAC000.9 (2026-10-01/02) — VENCEDOR DO DASHBOARD (DEBT-008): ENTREGUE, commit `e1aacda`.** Fecha o resíduo que o UTAC000.8 declarou. **Inventário medido (GATE 19): 4 sítios** onde o vencedor era derivado dos lances **locais** — `src/context/AppContext.jsx` l.697-700 (a derivação, exposta no contexto), `src/pages/Dashboard.jsx` l.391-405 + o prop do `FimEdicaoOverlay`, `src/components/TabelaLances.jsx` l.51/161/268 (o 🏆 da tabela de lances), `src/pages/MercadoLances.jsx` l.157/195 (o `OverlayVencedor` do fim da rodada). **Corrigidos no escopo:** o **Dashboard** (`vencedorExibido = resultadoOficial ?? vencedor` do contexto) e a **TabelaLances** (o 🏆 passa a casar **endereço + valor** do vencedor oficial; `-1` quando não está na lista = nenhum 🏆; linhas blindadas nunca casam ⇒ mainnet durante o leilão continua **sem** 🏆, como estava). **O `FimEdicaoOverlay` ficou corrigido sem ser tocado** — o Dashboard passa-lhe o oficial e a forma `{endereco, valor}` é a mesma que ele já esperava (Ponytail: zero refactor). Reutiliza o `useResultadoOficial.js` do UTAC000.8 → **sem mecanismo de I/O novo e sem dependências novas** (o hook acrescenta **1 leitura on-chain read-only por página**: mount + a cada 60 s até consolidar). **Provas:** +10 testes (4 no `Dashboard.test.mjs`, 6 no novo `components/__tests__/utac0009-tabela-vencedor.test.mjs`), com **caso discriminante** (local 100/OUTRO ≠ oficial 300/EU) e **2 mutantes que mordem** (M7 → 3 RED, M8 → 3 RED; md5 idêntico no restauro). Suíte **frontend 589/589 VERDE** (era 579/579), **backend 967/973 VERDE**. **DEBT-008 FECHADA** (no escopo); **DEBT-009 ABERTA** = os **dois sítios fora do escopo** (`src/context/**` e `src/pages/MercadoLances.jsx`, ambos por autorização nova — corrigi-los é análogo, ~45 min). **Declarado:** o duplo `_stubs/dompurify.js` existe porque `import DOMPurify from "dompurify"` **não** sobrevive ao interop do Vite SSR (medido: `default.sanitize is not a function`); o `sanitize.js` real corre. Validador adversarial (SEG3): `_logs/UTAC000.9_SEG-3_VALIDADOR.md`. Relatório: `_logs/UTAC000.9-RELATORIO.md` · `Desktop/UTAC000.9-RELATORIO.md`.
>
> 🔚 **UTAC000.10 (2026-10-01/02) — VENCEDOR NO APPCONTEXT + MERCADOLANCES (DEBT-009): ENTREGUE, commit `7c5ac6b`.** Fecha o resíduo que o UTAC000.9 declarou. **Correcção num só ponto (a fonte):** o **`AppContext`** passa a expor o vencedor **OFICIAL** quando existe (`const resultadoOficial = useResultadoOficial(EDICAO_ATIVA)`; `vencedor = resultadoOficial ? { endereco: resultadoOficial.vencedor, valor: resultadoOficial.menorUnicoCentavos } : vencedorLocal`) e o apurado dos lances locais quando **não** existe — a derivação antiga ficou **intacta** como reserva (comportamento anterior, zero regressões). **`MercadoLances.jsx` NÃO foi alterado**: o `OverlayVencedor` (l. 69) recebe o campo `vencedor` do contexto (l. 157/195) e ficou correcto **por arrasto**. **A interface pública não mudou (HI9)** — nome e forma iguais ⇒ nenhum dos consumidores precisou de ser tocado. Reutiliza o hook do UTAC000.8 (**sem mecanismo de I/O novo**; +1 leitura on-chain read-only por página). **Inventário medido (9 sítios):** 2 com o defeito, 4 já correctos, 1 código morto (`DetalheProduto.jsx` l. 39) e os **adjacentes que não são «vencedor»** (selos `ÚNICO`/`REPETIDO`, «menor único **seu**») declarados. **+9 testes:** 5 de **contrato** do `AppContext` — que **não pode ser renderizado** (importa o SDK do Privy) — por extracção de secção (a convenção do repo: `cotaAtiva`, `vocabularioUI`, `consentimento`, `dicaLojista`), com **controlo negativo em memória**, e 4 de **render** do `MercadoLances`. **2 mutantes mordem** (M10 → 2 RED; M11 «a página re-deriva dos lances locais» → 3 RED; md5 idêntico nos restauros). Suíte **frontend 600/600 VERDE** (era 591/591), **backend 967/973 VERDE**. **✅ Frente F (limpeza dos worktrees) — EXECUTADA NA PARTE SEGURA (não às cegas):** o spec dizia «7 worktrees órfãos»; medidos **11 em disco + 1 entrada de registo órfã** (não 7). Removidos **7** — 6 limpos + `zen-goldberg-ce8759` (cujo `node_modules` era **cópia real**, provado pelo recuo do `[System.IO.Directory]::Delete($false)` com «a pasta não está vazia»; `git worktree remove` falhava com `Filename too long`, resolvido com `rm -rf` **sem** risco para a árvore real) — sempre com `git worktree remove` **sem** `--force` (que **recusa** worktree sujo ou trancado: rede de segurança deliberada), mais `unlock`/`prune` da entrada órfã (lock de **pid morto**, dir já inexistente). **PRESERVADOS 3** com trabalho por commitar (1+3+3 ficheiros — e o `agent-a910933b732937233` continua em disco com os seus **31**) e o scratchpad do Claude em `Temp/` (fora do repo). Verificado: `node_modules` real **intacto (505 · 417)**, `git worktree list` de **12 → 4** entradas. **Observação declarada (não corrigida):** o hook faz `setEstado({edicaoId, resultado})` com **objecto novo a cada sondagem** ⇒ o Provider re-renderiza a cada 60 s enquanto a edição não está consolidada (o impacto cresceu: antes era uma página, agora a raiz). Opções medidas no relatório §7.1; alterar o hook está **fora do escopo autorizado**. **Erro de instrumento (meu, corrigido):** a 1.ª versão do caso discriminante media a página inteira e acusava o valor da **tabela de lances** — corrigido com `blocoDoOverlay()`. **⚠️ CORRECÇÃO DE CONCLUSÃO (trazida pelo validador adversarial do UTAC000.10):** a premissa do DEBT-009 — «o `OverlayVencedor` do fim da rodada mostra esse `vencedor`» — **NÃO confere**: `setShowOverlay(true)` existe **apenas comentado** (`AppContext.jsx` l. 1205, «animação de vencedor desabilitada»), o setter não é exposto e **os dois overlays nunca renderizam em produção** ⇒ **a correcção está CERTA mas tem hoje efeito VISÍVEL ZERO** (é ganho defensivo: quando/se o overlay for religado, já mostra o vencedor oficial). **O inventário classificou o sítio como «defeito» sem verificar se era ALCANÇÁVEL** — conclusão errada mantida à vista no `DEBT.md`. **Precisões de evidência (medidas por ele):** M10 (bloco de 4 linhas) → 2 RED; a forma **mínima** → 1 RED; **A/B contra o ancestral `a122b18` → 4 RED**. O «controlo negativo em memória» é **decorativo** (crítica aceite) e o mutante **M12** (de-wiring em runtime, texto intacto) passa **5/5** ⇒ **DEBT-010 ABERTA**: a travessia `AppContext → página` não tem prova de runtime (o Provider não é renderizável: importa o Privy).
>
> 🛡️ **UTAC000.11 (2026-10-02) — GUARDA DO VENCEDOR EM MERCADOLANCES (DEBT-011): ENTREGUE, commit `dec577d`.** Fecha o achado do validador do UTAC000.10. **Defeito reproduzido com stack trace real** (`_logs/UTAC000.11_SEG-1_EVIDENCIA.txt`): `OverlayVencedor` fazia `vencedor.endereco.slice(…)` **sem guarda** ⇒ `{}` e `{valor:300}` davam `Cannot read properties of undefined (reading 'slice')`; `{endereco:null,…}` dava `…of null (reading 'slice')`. **2.º defeito achado NESTE UTAC** (não estava no veredicto): com endereço presente e valor ausente mostrava **«R$ NaN»** — a linha do valor **também** estava sem guarda; corrigida no mesmo passo (mesmo defeito, expressão ao lado). **Correcção mínima (2 expressões)**, espelhando a guarda que o **cartão do Dashboard já tinha** (`Dashboard.jsx` l. 410): `vencedor?.endereco ? … : "—"` e `Number.isFinite(vencedor?.valor) ? … : "—"`. **Regra declarada:** malformado = AUSENTE **campo a campo** (não se inventa coerência global); **com `vencedor` válido nada muda** (GATE 18, com teste de controlo). **+8 testes** (7 casos em tabela + 1 controlo) → **12/12** no ficheiro; suíte **frontend 608/608 VERDE** (era 600/600), **backend 967/973 VERDE**. **2 mutantes mordem** (M13a endereço → 4 RED; M13b valor → 4 RED; md5 idêntico). **`showOverlay` NÃO foi religado** (decisão de produto, proibida ao executor) ⇒ a correcção é hoje **robustez defensiva**, visível no dia em que o overlay for religado. **⚠️ INCIDENTE do meu instrumento (declarado):** a 1.ª versão do script de evidência restaurava com **`git checkout --`** e, como a guarda **ainda não estava commitada**, **apagou a própria correcção** (md5 voltou ao pré-guarda, teste a 6/12) — detecção pelo próprio script («IDENTICO: NAO <-- PARAR»), recuperação do patch conhecido; **causa-raiz: restaurar do HEAD um ficheiro com trabalho NÃO commitado; o restauro correcto é de uma cópia de segurança** — o script passou a usar `.bak` fora do repo. Lição registada na memória do executor. **⚠️ 2.ª RONDA (fecho das ressalvas do validador, no mesmo UTAC):** ele refutou a **regra geral** que eu declarei — a guarda testava **truthiness, não TIPO** ⇒ `{endereco: 12345}`, `{endereco: true}`, `{endereco: {}}` **REBENTAVAM** (`vencedor.endereco.slice is not a function`), `{endereco: []}` mostrava «...» e `valor: -1` mostrava «R$ -0.01». **FECHADOS com medição:** guarda de **string não vazia** + **valor finito não negativo**, **+6 casos** ⇒ **18/18** no ficheiro, **mutante M13c** (truthiness) → **4 RED**, suíte **frontend 614/614 VERDE**. **Correcção do meu próprio comentário:** «espelha a guarda do Dashboard» era verdade **só para o endereço** — a linha do **valor** do Dashboard continua sem guarda = **DEBT-012**. **Precisão de evidência aceite:** o «antes» tinha **6 RED**, não os 5 que declarei (endureci um caso depois de o correr) — corrigido em `_logs/UTAC000.11_SEG-2_ANTES-DEPOIS.txt`. **Nota de processo:** empurrei o commit antes do veredicto (2.ª vez no ciclo, com o argumento do efeito nulo) — o validador mostrou que o argumento não substitui fechar o veredicto primeiro.
>
> 🧹 **UTAC000.12 (2026-10-02) — RESÍDUOS: DEBT-012 + HARNESS NO package.json + WORKTREES: ENTREGUE, commit `8e17e3a`.** Três frentes, cada uma com escopo próprio. **(A) DEBT-012** — o **irmão** da DEBT-011 no `Dashboard.jsx` l. 416: `R$ {(vencedorExibido.valor / 100).toFixed(2)}` sem guarda (o endereço, l. 410, já tinha). **Reprodução preservada:** `{}`, valor ausente, `NaN`, `"abc"`, `Infinity` → **«R$ NaN»**; `-1` → **«R$ -0.01»**. Guarda mínima (1 expressão, `Number.isFinite(...) && valor >= 0 ? … : "—"`), mesma regra do UTAC000.11 (malformado = AUSENTE; válido inalterado — o caso válido já passava antes). **+8 testes** → **22/22** no ficheiro; suíte **frontend 622/622 VERDE** (era 614); **mutante M14 → 6 RED dirigidos** (os 16 restantes, incl. todos os do UTAC000.9, passam). **(B) Harness exposto:** `"test": "node ../../scripts/mc966-suite-harness.mjs ambos"` — ⚠️ **o caminho do spec (`scripts/…`) NÃO existe nesse dir**; o harness vive em `<repo>/scripts/` e auto-localiza-se, e `../../scripts/` é o padrão já usado por `build:rag`. `npm test` → 622/622 + 967/973, **exit 0**. **(C) Os 3 worktrees preservados, limpos com o trabalho ARQUIVADO antes** em `_logs/UTAC000.12_worktrees-preservados.patch` (5 diffs): medido que **0** tinham commits fora do main; o **CSP que eles adicionavam já está no main**; o `Toast.jsx` é um **caminho que já não existe** (mudou para `src/widgets/toast/`); resta uma experiência de **paleta** de outra sessão + 1 linha de CORS. Removidos **pelo próprio git** (sem junctions, medido), `.claude/worktrees/` **3+1 → 0**, `node_modules` real **intacto 505 · 417**; ficam **13 refs** de branch (não autorizado apagar). **⚠️ 4 erros MEUS de instrumento, declarados:** (1) `\$` escapado pelo shell entrou no ficheiro → mutante inválido (16 RED por o módulo não carregar); (2) mutante substituiu só 1 das 3 linhas do ternário → linhas órfãs; (3) o recorte do bloco no teste ia até ao `<h3` seguinte e contava o travessão de «🔄 Liderando — pode ser superado»; (4) **correcção de registo anterior**: os «31 ficheiros» do `agent-a910933b732937233` (UTAC000.10) eram **status do repo-pai**, não trabalho dele. **Achado NOVO → DEBT-013**: `FimEdicaoOverlay.jsx` l. 16 tem o mesmo defeito (fora do escopo). **Método corrigido:** o commit **não** foi empurrado antes do veredicto (lição do UTAC000.11). **Veredicto: APROVA (com ressalvas)** — ele **refutou 3 afirmações minhas** e descobriu 2 dívidas novas. **(1)** O ganho é **maior** do que declarei: o código antigo também **lançava excepção** com `BigInt`/`Symbol` (página em branco) — a guarda mata 9 «R$ NaN», 3 negativos e **2 crashes**; válido byte-idêntico (GATE 18 confirmado); M14 reproduzido com md5 igual ao meu. **(2) Refutação aceite:** eu escrevi «todas as 13 refs com 0 commits fora do main» **sem nunca medir as 13** — `claude/zen-goldberg-ce8759` tem **4 commits** (trabalho real: integração Sepolia, Privy App ID, Netlify — 12 ficheiros, +603/−65, **não perdidos**, a branch continua lá) ⇒ **DEBT-015** (decisão do operador; nota: *worktree limpo ≠ branch limpa*, o que o UTAC000.10 não notou). **(3) Precisei um número:** o harness imprime `pass/tests`, logo «967/973» = 967 passaram de 973 (medido 2× em cru: `tests 973 · pass 967 · skipped 6`); a medição dele (959/966) é coerente com o **flake** que ele próprio apanhou. **(4) DEBT-014 — a suíte tem um teste FLAKY:** ele viu `VERMELHO 1 falha` uma vez e 14 corridas verdes depois (não capturou o nome) ⇒ o `npm test` que este UTAC expôs **não é determinístico** (não atribuível a este commit, mas é dívida). **(5)** Rótulo: «backend» = `netlify/functions`. **2.ª ronda:** tabela ampliada para **30 casos** (`0`/`-0`/`0.5`/`MAX_SAFE_INTEGER`/`1e21`/`BigInt`/`Symbol`/`"300"`) e a mudança de `valor:"300"` (era «R$ 3.00», agora «—») fica **declarada**.
>
> 🕵️ **UTAC000.13 (2026-10-02) — TESTE FLAKY (DEBT-014) + RELIGAR O SHOWOVERLAY: FRENTE B FECHADA na 2.ª ronda (teste corrigido; DEBT-014 fechada) · FRENTE D ESCALADA · commit inicial `cc072c6` (só `_logs/`).** **(A) A caça ao flaky deu um resultado NEGATIVO medido.** Método novo (o que faltava): correr N× guardando o output de **cada** corrida e isolar o **NOME** do teste. **30 corridas da suíte COMPLETA** (49 ficheiros, comando igual ao do harness) → **630/630 em todas, 0 falhas**; mais **30 corridas dirigidas** aos 5 ficheiros com **temporizadores reais** e **com carga de CPU deliberada** (4 workers × 100 s, a testar a hipótese — plausível e não refutada — de que o flaky do UTAC000.12 foi **induzido por carga**, já que ele corria em paralelo com as minhas suites) → **0 falhas**. **60 corridas, 0 falhas** (a taxa alegada ~1/15 teria dado ~4). Varredura medida: 0 testes usam `Math.random`; os 2 `createHash` são sobre **assets estáticos**; **6 ficheiros com temporizadores reais** e **zero `fakeTimers`**; o suspeito nº1 por leitura (`hooks-torneio` l. 82-91, `fetch`+`abort()` imediato) ficou **ilibado**. **⇒ Não se inventou correcção para um defeito não observado (GATE 17)** — a Frente B ficou sem objecto; **DEBT-014 fica ABERTA (parcial)**, escopo estreitado, scripts de caça preservados (`tmp-utac0013/`), e a evidência primária (a falha do validador do UTAC000.12, sem nome) mantida **sem explicação inventada**. **(B) O `showOverlay`: premissa do spec refutada por medição ⇒ PARAR E ESCALAR (GATE 10/HI8).** O `// setShowOverlay(true)` comentado está em **`src/context/AppContext.jsx` l. 1205** (dentro do `setTimeout` de 1200 ms do lightning), **não** no `MercadoLances.jsx` — que só **consome** a flag (l. 171 destructuring, l. 209 gate) e não tem o setter (o `value` expõe `showOverlay` na l. 1357, **não** `setShowOverlay`). Como este UTAC **proíbe** alterar o `AppContext.jsx`, religar é **impossível no escopo autorizado** — **não contornei**: escalei com **4 opções medidas** — autorizar só a l. 1205 neste UTAC; UTAC próprio; não religar; **e uma 4.ª IN-ESCOPO que o validador adversarial achou e que me refutou parcialmente**: mudar o **gate** na l. 209 do ficheiro AUTORIZADO (`{(showOverlay || (encerrado && vencedor)) && (…)}`, 1 linha), com os limites medidos declarados (muda o gatilho — não restaura os 1200 ms do lightning — e traz só **um** dos dois overlays; o do `Dashboard.jsx` l. 524 está fora do escopo). A minha conclusão «impossível no escopo autorizado» era **forte demais**; correcção aceite, e também corrigi a contagem (`setShowOverlay(false)` são **3** activos, não 4). **⚠️ MAS o próprio validador REVOGOU essa refutação** ao examinar os testes: a via do gate **colide com o teste-contrato deliberado** do UTAC000.10 (`utac0010-mercado-vencedor.test.mjs`: «sem `showOverlay` não há overlay nenhum — o gate do contexto manda»), ou seja **exigiria reescrever um contrato testado** ⇒ **não é refutação limpa**. Conclusão final dele: **§B APROVA** (a minha medição está correcta), **§C APROVA** (zero código alterado). ⚠️ O **§A dele ficou por preencher**: gravou o ficheiro cedo (a meu pedido, para não o perder como no UTAC000.12) e depois **ficou preso no hammer de background que ele próprio lançou** (`process(wait proc_a2ec8941535 180s)`; tive de matar os 2 processos dele — PID 8892/20708 — que estavam a queimar CPU; **e, no fecho, mais 5 pendurados das FASES C/D dele (as que nunca completou: `--test-concurrency=4` e `--test-reporter=tap`), a correr desde 01:05-01:06 ⇒ 7 no total, todos mortos e verificados (`node` de volta ao nível-base · 0 processos com `--test` · os 14 servidores MCP do operador intactos)**); **não inventei os números dele** — transcrevi do transcript o que mediu (6 corridas da suíte, 630/630; e a medição de tempo por ficheiro, que **corrigi depois** com o artefacto dele: max real **9 981 ms** em `MeusAtivos.test.mjs`, top-15 somam 83,8 s — os «5.8 s / 49,7 s» que ele declarou não reconciliam, mas a conclusão dele mantém-se: nenhuma espera longa escondida, 0 falhas) e declarei o limite. **TOTAL da caça ao flaky: 66+ corridas verdes, 0 falhas.** **⚠️ Aviso medido:** religar torna **alcançáveis** as DEBT-011/012/013 — as guardas do `OverlayVencedor`/card já lá estão, mas a do **`FimEdicaoOverlay` (DEBT-013) não** ⇒ religar sem a fechar expõe «R$ NaN»/crash. **Zero alterações de PRODUÇÃO neste UTAC** (verificado).
> ⚠️ **2.ª RONDA (mesmo UTAC, depois do veredicto): a minha conclusão «flaky não reproduzível» foi REFUTADA.** O validador adversarial **apanhou-o com nome**: `um pedido novo limpa o erro do anterior` (`src/hooks/__tests__/hooks-torneio.test.mjs` l. 231, assert l. 244 → `false !== true`), por a 2.ª resposta do duplo usar `demora: 20` = **temporizador REAL** (a suíte não tem `fakeTimers`) e resolver antes do assert sob jitter. **Mal de mim (declarado):** N insuficiente e no **alvo errado** (30 corridas da suíte completa não apanham ~1/120 **por ficheiro**; martelei o ficheiro só **6×**) e desmenti-me **sem medição** («ilibado pelo empírico»). **Reproduzi-o eu mesmo** (1/200 sob carga, com o nome) e **corrigi** (autorizado: ficheiro de teste): a 2.ª resposta fica presa numa promessa que o teste destrava ⇒ **zero dependência do relógio**; o teste passou a fechar o pedido e a verificar que o resultado assenta ⇒ **mais forte**. **A/B pareado (martelo paralelo 8 fluxos):** MUTANTE fiel ao original **4/400** (4× o mesmo teste, `false !== true`) → CORRIGIDO **0/400**; total **5/600 pré → 0/600 pós**; restauro md5 idêntico (`b57f7ea5…`, com `trap` para o repo nunca ficar mutado). **DEBT-014 FECHADA.** Também **corrigido**: «o harness exige TTY» é **falso** — corre com `</dev/null` (o que falha é stdin indisponível em background). **3 erros meus de instrumento** na construção dos mutantes (responder mutado com `destravar()` órfão → falhava em TODAS as corridas por outro motivo; âncoras em CRLF num `.mjs` LF; guardas mal formuladas). **Lição: um flaky mede-se no ALVO, com N compatível com a taxa alegada — nunca no agregado.**
>
> 🛡️ **UTAC000.14 (2026-10-02) — GUARDA DO `FimEdicaoOverlay` (DEBT-013) + `showOverlay` RELIGADO SÓ FORA DO EM BREVE: CONCLUÍDO, commits `f635b32` + `9b9556e` (+ fecho).** **SEG-1 = AJUSTAR (2 premissas do spec refutadas, decididas pelo operador — R18):** (1) a l. 14 (endereço) também rebentava (6 casos, incl. `vencedor: {}`) ⇒ **«guardar l. 14 + l. 16»**; (2) o `setShowOverlay(true)` comentado está no **`AppContext.jsx` l. 1205**, não no `MercadoLances.jsx` ⇒ **«autorizar o AppContext l. 1205»**. **DEBT-013 FECHADA:** guarda de tipo igual à do `OverlayVencedor` (string não vazia / finito ≥ 0); evidência ANTES preservada (17 RED: «R$ NaN», «R$ Infinity», «R$ -0.01», TypeError com BigInt/Symbol e no `.slice`); teste novo 24/24; mutantes M15a-d 10/8/1/4 RED. **⚠️ O VALIDADOR REFUTOU o religar simples (G1):** com `EM_BREVE_MODE = true` o prazo do relâmpago é um **cronómetro LOCAL de 30 min** (`prazoFlash = lerPrazoStorage(...) ?? now + 1800`; a R-1 on-chain tem `prazo = 0`) ⇒ o overlay «EDIÇÃO ENCERRADA» + confetti abria **sozinho** a cada 30 min sobre ecrãs «Em breve» — o motivo do MC63/64; o meu SEG-1 só provara «com prazo 0 abre», não «não abre quando não deve». **Decisão do operador (R18): `if (!EM_BREVE_MODE) setShowOverlay(true);`** (import da fonte única `lib/leilaoLock.js`) ⇒ **hoje não abre** (o minificador elimina a chamada); no dia em que a flag for `false` abre como antes do MC63/64 e religa **os dois** overlays. Teste `utac00014-show-overlay.test.mjs` executa a `tick` **REAL** extraída do AppContext com duplos (9 casos, incl. «EM BREVE ⇒ não abre» com prazo 0/vencido e com reabertura); **M17 (EM_BREVE_MODE ignorado) 3 RED** · M16 2 · M18 1 · M19 5 · R5/R7 do validador 2/1. Suíte **frontend 663/663 · backend 967/973**. Validador 2.ª ronda: **APROVADO COM RESSALVAS** (só ℹ️). **⛔ DEBT-016 (nova):** antes de desligar o `EM_BREVE_MODE`, ligar o relâmpago a um prazo **real** (servidor/on-chain) — senão volta o ciclo de 30 min locais (e o `FimEdicaoOverlay` não tem `onClose`). Relatório: `_logs/UTAC000.14-RELATORIO.md` · `Desktop/UTAC000.14-RELATORIO.md`.
>
> 🧹 **UTAC000.16 (2026-10-02) — HIGIENE: 3.ª VALIDAÇÃO + PACKAGE-LOCK + CUSTO + BRANCH (DEBT-015): CONCLUÍDO. Zero código de produção.** **(A)** 3.ª validação dos 2 testes novos do UTAC000.14: **APROVADO COM RESSALVAS** — mas **6 de 12 mutantes do validador sobreviviam** (prazos de brinquedo < 1e9; reset de `fimDisparadoRef` não observado; temporizadores não contados) ⇒ testes reforçados (epoch real, contagem de temporizadores, `fimDisparadoRef` `true→false`, + caso «EM BREVE + prazo futuro») e a bateria dele re-corrida: **14/14 morrem**. **(B)** `package-lock.json` **REVERTIDO**: não era ruído — **removia os 4 peers do MC93-G** e `npm ci --dry-run` dava **EUSAGE** (o do HEAD passa); cópia preservada fora do repo. ⚠️ Volta a acontecer enquanto houver dois modos de `npm install`. **(C)** Custo em USD **não medido** (Claude Code sem `state.db`; não foi sessão dedicada) — só tokens do validador (123 392). **(D/E) DEBT-015 FECHADA** (decisão do operador: arquivar e apagar): `_logs/DEBT-015_zen-goldberg.patch` (+ `.mbox`, que recria os **4 SHAs originais bit-a-bit**; comando na DEBT-015); árvore `adfc078` provada no merge-base; branch apagada local + remota. **`.gitattributes`: `*.patch`/`*.mbox`/`*.diff` `text eol=lf`** (o checkout fresco do patch saía CRLF e o `git apply --index` falhava — achado do validador). Suíte **664/664 · 967/973**. Relatório: `_logs/UTAC000.16-RELATORIO.md` · `Desktop/UTAC000.16-RELATORIO.md`.
>
> 🧪 **UTAC000.15 (2026-10-02) — ARNÊS DE RUNTIME DO PROVIDER (DEBT-010): CONCLUÍDO. Zero código de produção.** **Medido:** o M12 (texto da regra intacto, travessia desligada em runtime) passava a suíte frontend **INTEIRA** (664/664). O `AppContext.jsx` **importa-se** (41 s, Privy real); o que falhava era **executar** — `useLocation()` fora de `<Router>`, Privy sem Provider, RPC, e o **`@fingerprintjs` real, que sem DOM fica em ciclo e não deixa o processo de teste terminar**. **Arnês** `src/__tests__/_arnes-provider.mjs` (+ `_stubs-provider/`): o `AppProvider` **REAL** corre no `_hook-runner.mjs` (efeitos reais; `apiGet` real com `fetch` duplo; `useResultadoOficial` real com duplo só da leitura on-chain; router pelos `UNSAFE_*Context`), e a árvore devolvida renderiza-se com o `MercadoLances` real como filha. **Para testar o Provider a partir de agora, usar este arnês** (modo `leilaoAberto` para `EM_BREVE_MODE=false`; `emitirLanceDado` para o programado; `valorInicial()` para o 1.º render). Teste `utac0015-provider-cablagem.test.mjs` (6). **M12 → suíte VERMELHO 3**; mutação **8/8**; anti-flaky 30/30 + 20/20 sob carga. Validador: **APROVADO COM RESSALVAS** — refutou o duplo estático do oficial (V11 «congelar o 1.º render» passava) e a falta do programado: ambos corrigidos (não re-validados). Fora do provado: `Dashboard`/`MeusAtivos`, ramos com sessão. Suíte **670/670 · 967/973**. Relatório: `_logs/UTAC000.15-RELATORIO.md` · `Desktop/UTAC000.15-RELATORIO.md`.
>
> ⏸️ **UTAC000.17 (2026-10-02) — PRAZO REAL + OVERLAY AGREGADO (DEBT-016): PARADO NO SEG-1 e PARTIDO EM 3 (decisão do operador, R18). Zero código.** **Medido:** (1) **não existe prazo real da R-1** — o servidor SINTETIZA a R-1 a cada pedido (`termino_em` = agora+24 h rolante; `edicoes-core.mjs`) e on-chain é 0; e o `criarEdicao` só gera `RELAMP-N`/`PROG-N`, nunca a R-1 que o cliente fixa como activa ⇒ **DEBT-017**; (2) **«o utilizador deu lance» não é observável no cliente em mainnet** (`lances-flash` vazio; `feedback` só após consolidar) ⇒ endpoint novo; (3) o overlay agregado tem de ser montado num sítio único. **Specs:** `_logs/UTAC000.17a.spec.yml` (participações), `17b` (prazo do `termino_em` do servidor — fecha só a ORIGEM LOCAL), `17c` (agregado + onClose + visto). ⚠️ **Validador (APROVADO COM RESSALVAS): o 17b sozinho NÃO fecha a DEBT-016** — o «NOVA RODADA» reabre o overlay com o prazo do servidor, e o fallback do `useEdicoes` usa o próprio prazo local ⇒ **17b + 17c juntos antes de desligar o EM BREVE**. **DEBT-018** (candidata): Blob `bids` fora do `exportar-dados`. Pendente do operador: a edição activa e o seu prazo; «visto» local vs servidor; onde montar o agregado. Relatório: `_logs/UTAC000.17-RELATORIO.md` · `Desktop/UTAC000.17-RELATORIO.md`.

> 🔌 **UTAC000.17a (2026-10-02) — ENDPOINT «MINHAS PARTICIPAÇÕES POR EDIÇÃO» (backend): ENTREGUE, commit `12fd198`.** Pré-requisito do overlay agregado (17c). `GET /minhas-participacoes[?edicaoId=X]` — auth **obrigatória** com o **endereço vindo SEMPRE do token** (não existe parâmetro de utilizador ⇒ impossível pedir dados de terceiros) e resposta com **só edições + contagens** (`{participacoes:[{edicaoId,lances}],total,filtro}`), **zero valores** (GATE 22); rate limit 30 (par dos `*-get` de leitura leve). **Dados, sem migração nova:** a consulta entrou na **camada de abstracção existente** (`_lib/data-store.mjs` + as 2 implementações), porque um endpoint só-Blobs se partiria em silêncio no dia do flip `DATA_STORE_BACKEND=supabase` — em **blobs** lista as **CHAVES** `bid:*` (cursor) e filtra `:{endereco}:` ⇒ **lê zero valores**; em **supabase** faz `select("edicao_id").eq("endereco")` (coluna plana indexada) e **nunca pede `payload`**. **Escopo:** 4 ficheiros alterados (+85/−1) + 3 novos (endpoint + 2 testes); o `exportar-dados` **NÃO** foi tocado e **nenhuma migração** foi criada. **15 testes novos** (12 blobs + 3 supabase): 401 (sem token/inválido/sem endereço), só as edições do titular (com terceiro **e** endereço «parecido» semeados), nenhum valor no corpo, marcador `:consolidado` ignorado, filtro por edição, titular sem lances, 405, store em baixo→503, **EIP-55** a casar com a chave em minúsculas, paginação por cursor; suíte frontend **670/670** · backend **967/973 → 982/988** (+15 ✓ contagem confere). **3 mutantes MORDEM** (M16 = filtro do endereço neutralizado → 2 RED; M17 = valores na resposta → 1 RED; M18 = filtro ignorado → 1 RED) com restauro md5-idêntico. **DEBT-018 FECHADA POR MEDIÇÃO** (o passo prescrito na própria dívida era «contar chaves, sem ler valores»): `netlify blobs:list` → **0 chaves** no store `bids` e **0** no legado `lances-relampago` ⇒ **hoje não há** lacuna de direito de acesso; fica a **condição de vigilância** declarada (se o `bids` ganhar lances de titulares, o `exportar-dados` não os lê). **Erros MEUS declarados:** (1) patchei o `import` do `data-store-blobs.mjs` e **esqueci a função delegada** — foram os **testes** que o apanharam (503 + `listarEdicoesPorEndereco is not a function`); (2) o helper de semente dos testes gerava o **mesmo sufixo** para todos os lances (o `Map` deduplicava ⇒ contagem falhada) — bug do teste, corrigido com sufixo único; (3) o meu parser de mutações lia `# fail N` mas o reporter actual imprime `ℹ fail N` ⇒ classifiquei 3 mutantes **válidos** como inválidos. **Lição de ambiente (corrige uma regra minha):** o backend é **MISTO em fins de linha** (funções 62 CRLF/14 LF/1 misto; `_lib` 53/21/1) — **medir em bytes por ficheiro**, nunca assumir «`.mjs` = LF». **Veredicto adversarial: APROVA (com ressalvas)** (`_logs/UTAC000.17a_SEG2_VALIDADOR.md`) — ele confirmou as 4 alegações e trouxe 4 ressalvas, **todas fechadas na mesma ronda**: (1) **custo** — cada pedido listava a store inteira e o `?edicaoId=` não estreitava ⇒ **corrigido** (prefixo `bid:{edicaoId}:` em blobs + `.eq("edicao_id")` em supabase; **M19 → 2 RED**); (2) **instrumento** — o laço de cursor é código morto com a lib v10 (`list()` sem `paginate` devolve tudo e não dá cursor; o meu teste de paginação pinava o **duplo**) ⇒ teste **relabelado** com a citação da medição dele; (3) **2 SOBREVIVENTES** — o `.toLowerCase()` do alvo nas duas camadas não tinha teste (um consumidor directo da facade com endereço EIP-55 recebia `[]` em silêncio) ⇒ 1 teste **directo** por camada (**M20/M21 → 2 RED cada**: mortos); (4) **imprecisão minha**: a evidência dizia «CRLF» e o endpoint é **LF** (medido) ⇒ corrigida. Contagens reais: M16 **4** · M17 **2** · M18 **0 (EQUIVALENTE** — a correcção do custo tornou as duas defesas do filtro redundantes; o «1 RED» era da 1.ª ronda) · M19 **2** · M20 **2** · M21 **2**, tudo restaurado md5-idêntico. **Testes 15 → 17**; backend **967/973 → 984/990**. **Mais 3 erros meus declarados:** backup da 1.ª ronda reutilizado (a guarda de md5 abortou; re-aplicado), **1 linha CRLF inserida em ficheiro LF** (mesma classe da imprecisão que ele apanhou) e um f-string inválido (sem dano).

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
- **Um controlo positivo que não morre invalida a ronda de mutação.** O meu
  tinha-se tornado mutante equivalente por causa do compare-and-set; trocá-lo
  revelou que **nada testava concorrência**.
- **Uma mutação que "sobrevive" pode nunca ter sido aplicada.** Duas das minhas
  falharam em silêncio (delimitador `|` do `sed`; padrão com LF). Assertar
  sempre a substituição antes de declarar um sobrevivente.
- **Testes que fazem `db.push()` e depois só leem não ligam escrita a leitura** —
  foi o padrão por trás de 10 mutações sobreviventes.

### Não medido (L-4)

Nada foi corrido contra o **Supabase real** (migração por aplicar) nem contra
uma **rodada real** (leilão travado em `EM_BREVE_MODE`;
`consolidar-lances.mjs:51` só corre em mainnet). Cobertura não medida.
⚠️ **As correcções aos seis defeitos não passaram por uma segunda validação
independente** — foram verificadas por quem as escreveu.

---

## MC93-C — Handler do bónus + validação dupla independente (2026-09-24)

**Entregue:** `_lib/bonus-emissao.mjs`, `_lib/worker-bonus.mjs`, registo no mapa da
fila, 30 testes. **507/507 verdes.** **Logs:** `_logs/MC93C_*` · **Spec:** §4c.
⚠️ **Os DOIS validadores independentes deram REPROVADO.** Três P0 confirmados por
execução e corrigidos — ver `_logs/MC93C_SEG4_EXECUTOR.txt` §4.8.

### ⛔ O bónus pagava 11× o devido (regressão do MC93-B, agora corrigida)

`detectarConsecutivos().bonus` é **cumulativo sobre todo o histórico e nunca
decresce**; a guarda `bonus_emitido` é **por ciclo**. Uma bandeira por-ciclo não
pode limitar um contador que atravessa ciclos: cada ciclo novo nascia com a
bandeira a `false` e concedia outro bónus.

**Medido:** 5 vitórias + 10 derrotas = **11 bónus = 220 senhas = R$ 440** (devidos
R$ 40), com bónus concedido em edições de `acertos_totais = 0`. Nenhum teste
passava de 5 ciclos, por isso a suíte não via.

**Correcção:** `contarBonusConcedidos(endereco)` conta os bónus já dados em todos
os ciclos; concede-se só se `sequencia.bonus > jaConcedidos`.

### ⛔ `.eq(col, null)` NÃO é `IS NULL` — regra permanente do projeto

O postgrest-js traduz `.eq(col, null)` para `col=eq.null`, que o PostgREST
rejeita numa coluna TIMESTAMPTZ com **HTTP 400 (`22007`)**. Só `.is()` gera
`col=is.null`. Verificado por execução:

```
.eq("liquidado_em", null) → ?liquidado_em=eq.null   ❌ 400
.is("liquidado_em", null) → ?liquidado_em=is.null   ✅
.eq("bonus_emitido", false) → ?bonus_emitido=eq.false  ✅ (booleano, eq é válido)
```

O compare-and-set do handler usava `.eq()`: **não existia**. Com a flag ligada
teria falhado em 100% das execuções → DLQ. E a suíte **pinava o defeito** — o
teste assertava o valor do filtro `eq`, logo a correcção partia 6 testes.
Hoje: o duplo **lança** se alguém chamar `.eq(col, null)`, como o PostgREST faz.

### ⛔ O CAS do MC93-B era neutralizado pelo upsert acima

O `upsert` repunha `bonus_emitido: false` a partir de uma leitura anterior,
noutra transacção — com latência real, o pagamento duplo reaparecia.
**Correcção:** o upsert deixou de escrever `bonus_emitido`, `senhas_a_creditar` e
`liquidado_em`. Essas três colunas são **exclusivas** do compare-and-set e do
worker de liquidação. Os pontos passaram a duas UPDATEs condicionais.

> O teste que o guarda é **comportamental** (observa as colunas realmente
> escritas), porque o sintoma precisa de MVCC e um duplo in-memory não o
> reproduz. Guarda-se a causa, já que não se consegue guardar o sintoma.

### O cadeado de três condições (além do pedido)

O MC pedia uma flag. Uma flag sozinha é **fail-open por omissão de disciplina**.
A emissão exige, em simultâneo: (1) `BONUS_EMISSAO_ATIVA === "true"` (string
exacta); (2) dívida existente e `liquidado_em IS NULL` no **livro-razão** — a
idempotência ancora no registo, não na fila; (3) payload a coincidir com o
livro-razão **e com a regra** em ciclo, endereço e quantidade.

**Estado hoje: DRY-RUN**, confirmado por execução — com dívida perfeita em
aberto, a decisão é `{"emitir":false,"motivo":"flag_desligada"}`.

### ⛔ Pendência que bloqueia a activação: a dívida órfã

Em dry-run a tarefa é consumida sem liquidar, e `enfileirar` só corre quando a
dívida **nasce**. Toda a dívida criada com a flag desligada fica
**permanentemente fora do alcance da fila**. Antes de ligar, re-enfileirar o que
está em aberto — a consulta está em `docs/TORNEIO-HABILIDADE.md` §4c. **Não
implementado.**

### Lições de método (recorrência ALTA — 3.º MC seguido)

- **Um duplo que aceita o que o sistema real recusa dá verde a código partido.**
  Já aconteceu com um mock que ignorava o argumento (MC93-B) e agora com um que
  aceitava `eq(col, null)`. Regra: o duplo **recusa o que o original recusa**, e
  **aplica os DEFAULTs das colunas** como a tabela real.
- **Um teste pode PINAR o defeito.** Aqui a correcção certa partia 6 testes,
  porque eles assertavam o mecanismo errado. Quando uma correcção óbvia parte
  testes, suspeitar dos testes primeiro.
- **Ancorar mutações em sintaxe executável, nunca numa expressão citada.**
  Segunda vez que um comentário meu corrompe a minha própria prova de mutação.
- **Duas validações em paralelo sobre a mesma working tree contaminam-se.** O
  Validador B viu ficheiros a mudar debaixo dos pés (era o A a mutar) e declarou
  a conformidade não-mensurável. Em série, ou cada um no seu worktree.

### Não medido (L-4)

Nada correu contra Supabase real nem contra a mainnet; a migração continua por
aplicar e tem **cobertura de teste zero**. `txHash` não é persistido e `err.code`
é descartado. `GET /ranking` é público e enumera todas as carteiras que
licitaram — decisão de produto por tomar.
⚠️ **As correcções deste MC não passaram por uma terceira validação
independente.** Três MCs, três reprovações: a ressalva é material.

---

## MC93-D — Contrato medido + sweeper da dívida órfã (2026-09-24)

**Entregue:** `_lib/sweeper-divida-orfa.mjs`, 3 ficheiros de teste de contrato,
registo no processor. **543 testes · 535 verdes · 0 falhas · 8 saltados.**
**Logs:** `_logs/MC93D_*` · **Spec:** `docs/TORNEIO-HABILIDADE.md` §4d.
Validadores **em série, em worktrees separados** (regra nova, nascida do MC93-C).

### ✅ A migração deixou de ter cobertura zero

Aplicada a um PostgreSQL real (17.6) com PostgREST: aplica limpa, e os 8 CHECKs
recusam o que devem. Era a lacuna nº 1 herdada do MC93-B.

### ⚠️ Regra permanente: `.eq(col, null)` NÃO é `IS NULL` — agora provada no servidor

| medido contra PostgREST real | |
|---|---|
| `.eq(col, null)` numa TIMESTAMPTZ | **ERRO `22007`** |
| `.is(col, null)` | funciona |
| `.eq(col, false)` num booleano | funciona (o CAS do store estava certo) |
| upsert parcial | **preserva** as colunas não listadas |

Há um teste que varre **toda** a árvore de produção e falha se algum ficheiro
voltar a usar `.eq(col, null)`.

> ⚠️ **`.select()` no fim do compare-and-set não é decoração.** Sem ele o
> PostgREST devolve `204`/`null`, o código conclui que perdeu a corrida e **o
> bónus nunca é concedido**. Invisível aos duplos. Guarda acrescentado; mata nos
> dois sítios.

### ⛔ O sweeper que eu criei era um moto-contínuo

`enfileirar` é um INSERT puro sem dedup. Em dry-run o handler consome a tarefa
sem liquidar → a dívida continua órfã → nova varredura reenfileira →
**~51.840 linhas/dia** em `fila_tarefas`. Corrigido: **no-op enquanto a emissão
estiver desarmada**, dedup contra tarefas por concluir, e `order`+`limit` no
**servidor** (o cliente truncava em 1000 e `encontradas` mentia).

### ⚠️ Poluição de protótipo armava a emissão

`process.env.X` resolve pela **cadeia de protótipos**:
`Object.prototype.BONUS_EMISSAO_ATIVA = "true"` armava a emissão sem variável
nenhuma — a validação independente chegou a creditar por essa via. Corrigido
com `Object.hasOwn` antes de ler. **Regra:** toda a flag que decide dinheiro
lê-se com `Object.hasOwn`, nunca por acesso directo.

### ⚠️ `CONTRATO_ADDRESS` tem fallback para um endereço SEM bytecode

`_lib/contract.mjs:50` → `0x273Ef9…445e`, medido num fork: **zero bytes**. Uma
chamada a `adicionarSenhas` contra endereço sem código **não reverte** (status 1)
— o worker marcaria a dívida liquidada e ninguém receberia senhas. Só
`verificarCoordenacao()` impede. Agora coberto por teste; o fallback permanece
(`contract.mjs` não é alterável neste MC).

### ⛔ ERRATA: a minha refutação do fork on-chain era FALSA

O SEG-1 afirmou que o `hardhat` estava partido e que não havia como levantar uma
EVM sem instalar nada. **Errado**, reconfirmado por execução:

```
node_modules/hardhat                         → 2.28.0
node_modules/@nomicfoundation/hardhat-ethers → 4.0.9   (par CORRECTO)
./node_modules/.bin/hardhat --version        → 2.28.0, exit 0
@nomicfoundation/edr                         → INSTALADO (EVM em-processo)
```

**Causa:** o `package.json` PINA `^3.4.0` mas o INSTALADO é 2.28.0 — e o erro que
reportei vinha do hardhat v3.9.1 da cache do `npx`. Li o `package.json` e uma
mensagem de erro, **sem confirmar a versão instalada**.

A validação independente levantou um fork de mainnet sem instalar nada e correu
o cenário completo (`adicionarSenhas` → `darLance` → saldo decrementado, com
controlo negativo). ⇒ **A decisão de não instalar Foundry foi tomada sobre
informação errada minha.** Foundry continua a não ser preciso — mas o fork é
possível e **fica por fazer**.

### Lições de método (recorrência ALTA — 4.º MC seguido)

- **Confirmar a versão INSTALADA, não a que o `package.json` pina.** Um erro de
  `npx` pode vir de um binário que o projeto nem usa.
- **Assertar que o ficheiro MUDOU, não só que o padrão existia.** O HARD GATE 4
  (ignorar comentários) resolveu o falso sobrevivente por comentário; apareceu
  logo outro, por `replace` multilinha que não aplicou. Terceiro do projeto.
- **Um `skip` tem de dizer a verdade sobre porquê.** "Impossível" e "por fazer"
  não são a mesma coisa, e o primeiro dispensa-me de voltar lá.
- **Duplos: 8 de 16 métodos divergem do real, todos na direcção permissiva.**
  `update` sem `.select()`, tecto de 1000 linhas, `maybeSingle` com >1 linha,
  `select("a,b")` ignorado, upsert sem `onConflict`, upsert a omitir NOT NULL.

### Pendências

1. ✅ **RESOLVIDA no MC93-E** — ligar os testes de NÍVEL 2 em CI. O `ci.yml`
   passou a levantar Postgres + PostgREST reais; medido `# skipped 0`.
2. ✅ **RESOLVIDA no MC93-E** — o cenário on-chain existe e corre numa EVM
   local. ⚠️ NÃO é fork de mainnet: isso exige um RPC com credencial (R5).
3. Antes de activar a emissão: aplicar a migração em produção e reativar a R2.

---

## MC93-E — CI de contrato a correr + EVM local (2026-09-24)

**Entregue:** `ci.yml` com Postgres+PostgREST reais, `_tests/mc93e-ci-config.test.mjs`,
`_tests/mc93e-fork-onchain.test.mjs`, `_tests/_evm-local.mjs`, fixture do contrato,
3 scripts. **Fecha as DUAS pendências do MC93-D.**
**590 testes · 589 verdes · 0 falhas · 1 saltado** (condições do CI; base 543/535/8).
**Logs:** `_logs/MC93E_*` · **Spec:** `docs/TORNEIO-HABILIDADE.md` §4e.
**SEG-1: AJUSTAR.** Dois validadores independentes, em série: ambos
**APROVADO COM RESSALVAS**, com **4 achados ⛔** — todos corrigidos.

### ⚠️ A REGRA NOVA: a verdade que o CI corre é o `package-lock.json`

O MC93-D ensinou que `package.json` ≠ `node_modules`. Este mediu a terceira, e
depois levou com ela na cara uma segunda vez:

| fonte | hardhat | edr | solc |
|---|---|---|---|
| `node_modules` (esta árvore) | 2.28.0 | next.17 | 0.8.26 |
| `package.json` | `^3.4.0` | — | — |
| **`package-lock.json` — é ISTO que o CI corre** | **3.4.2** | **next.29** | **ausente** |

Reproduzido com `npm ci` numa pasta isolada. Por isso o arnês de EVM fala só com
a **API pública do `@nomicfoundation/edr`**, nunca com `hardhat/internal/...`.

> ⛔ **E a mesma armadilha apanhou-me outra vez, do lado do CI.** Dois testes do
> MC30.2.1 fazem `mock.module("@aws-sdk/client-kms")` — e `mock.module` **exige
> que o especificador resolva**. Esse pacote não está no lockfile das functions:
> resolve aqui por subir a árvore até `frontend/node_modules`. Em CI dava
> `ERR_MODULE_NOT_FOUND` e **o job nunca ficaria verde** — a correcção do nível 2
> estaria certa e seria invisível. A minha suíte local dava 0 falhas *por
> acidente de ambiente*.
>
> **Regra:** antes de um teste depender de um pacote, confirmar que ele está no
> lockfile que o job instala. Há agora uma guarda que varre `_tests/*.mjs` e
> exige exactamente isso — teria apanhado isto no dia em que nasceu.

### ✅ Os testes de contrato de nível 2 correm mesmo

`ci.yml` levanta **Postgres 17** (`service:` com health-check), cria os papéis
(`anon`/`authenticated`/`service_role`/`authenticator`), aplica a migração e corre
**PostgREST v12.2.3** com JWT de `service_role`.
Medido: sem servidor `# skipped 5` · com servidor `# skipped 0`.

> ⚠️ **O PostgREST NÃO pode ser um `service:`.** Os papéis e a migração têm de
> existir antes de ele ler o schema, e um `service:` arranca antes de qualquer
> passo. Fica em `docker run --network host`, depois da migração.

### ⚠️ Três formas de um gate de CI mentir — todas medidas neste MC

1. **Repórter errado.** `--test-reporter=tap` é obrigatório em qualquer guarda
   que conte saltos: o repórter por defeito escreve `ℹ skipped N`, e o parse de
   `# skipped N` devolve vazio. A guarda fica vermelha para sempre.
2. **Glob vazio.** `node --test` com um glob que não casa sai **0 com zero
   testes**. Apontar o passo ao directório errado deixa tudo verde a não testar
   nada. A guarda exige `# pass > 0`.
3. **`describe` saltado.** Os filhos **não contam** em `# skipped` e nem são
   emitidos — o gate via `skipped 0` com a EVM inteira por correr. E um `grep`
   por `adicionarSenhas` era satisfeito pelo teste de *selectores*, que nem toca
   na EVM. O gate exige agora o **nome do teste decisivo**.

### ✅ O cenário on-chain, que o MC93-D dizia impossível

`adicionarSenhas(20)` → `darLance` → saldo 19, com controlo **negativo** (razão do
revert em literal) e **positivo**, numa EVM em-processo. ~2 s, sem rede, sem
credencial, sem CLI do hardhat (que continua partido e não é preciso).

⚠️ **NÃO é fork de mainnet.** `ALCHEMY_URL` é credencial (R5) e os **três**
endpoints públicos que testei recusaram — três é amostra estreita, e a afirmação
honesta é essa. O salto passou a ter **alavanca**: `MAINNET_RPC_URL` no ambiente
faz o teste correr (só `eth_getCode`, nunca transacção).

### ⛔ `indexed` não entra no `topic0` — e a corrupção é SILENCIOSA

`topic0 = keccak(sighash)`, e o sighash **não inclui `indexed`, nem os nomes, nem
a mutabilidade**. Medido: tirar `indexed` de `LanceDado.lancador` mantém o mesmo
topic0, e `getLanceDadoEvents` — que lê `args[0..4]` **por posição** — passa a
devolver lançador errado, `valor: 0`, `repetido: true`, **sem excepção nenhuma**.
`monitor-onchain.mjs` detectaria "anomalias" sobre lixo.

**Regra:** comparar selectores fecha a cegueira a **aridade e tipos**; para
eventos é preciso comparar também `indexed`, e para funções a `stateMutability`.

### Lições de método (5.º MC seguido)

- **Terceira vez que um comentário meu satisfaz a minha própria asserção.** A
  guarda do `--test-reporter=tap` passava por causa do comentário que o
  explicava. Configuração executável lê-se sempre com os comentários fora.
- **Asserção sobre o agregado esconde o defeito no sítio exacto.** Procurar a
  variável no JOB inteiro sobrevivia a tirá-la do PASSO certo.
- **Mudar três coisas de uma vez impede saber qual corrigiu.** A bissecção
  mostrou que só `cacheTimeout: -1` faz diferença; `staticNetwork` e
  `batchMaxCount` não fazem nada.
- ⛔ **Declarar uma impossibilidade a partir de UMA tentativa falhada não é
  medir.** Escrevi no teste que o defeito da cache "não era prendível de forma
  fiável". Era: a cache do ethers é indexada pelos **argumentos**, e eu usava
  111 e depois 222 — nunca havia acerto. Com o mesmo argumento reproduz 5 em 5.
  É o mesmo erro do SEG-1 do MC93-D, em ponto pequeno.

### ⛔ Para o operador

**ROTAR a chave Alchemy de `desafio-gut/hardhat.config.cjs`.** Está em texto
simples e **commitada desde o MC89.14** (`a2c40ee`) — apagar o ficheiro agora não
a tira do histórico. Não foi tocada (R5). Mesma classe da chave DeepSeek do MC89
e da EOA do MC59.11.

### Pendências

1. ⛔ **O `ci.yml` nunca correu num runner do GitHub** (`act` não está instalado).
   Validado com `desafio-gut/scripts/ci-postgrest-local.sh`, mesmas imagens, e um
   teste que impede os dois de divergirem. Por provar: `${{ env.X }}` dentro de
   `run`, `$GITHUB_ENV` entre passos, `if: always()`, `--network host` a alcançar
   um `services:`.
2. ⛔ **Deriva entre `contracts/Leilao.sol` e o bytecode em mainnet.** Desbloqueia
   com `MAINNET_RPC_URL` autorizado pelo operador.
3. ⚠️ Adulterar os `settings` da fixture continua invisível em CI — fecha-se com
   `npm i -D solc@0.8.26` na raiz de `desafio-gut/`.
4. Antes de activar a emissão: migração em produção + R2 reativada.

---

## MC93-F — Preparação bloqueante do MC94: Supabase + Netlify (2026-09-25)

**Data:** 2026-09-25 · **Origem:** MC93-F, medição por MCP/CLI · **Recorrência:**
ALTA (drift de produção é o 3.º caso) · **Impacto:** ALTO (desbloqueia o MC94).
**SEG-1: AJUSTAR** · **R19 ativada** · **SEG4: APROVADO** · **Zero código novo.**
**Logs:** `_logs/MC93F_*` · **Relatório:** `_logs/MC93F-RELATORIO.md`

### ✅ O que mudou em produção

| | antes | depois |
|---|---|---|
| tabelas em `public` | 19 | **21** (`pontuacoes`, `rankings_ciclo`) |
| migrações | 9 (última 2026-08-03) | **10** (`20260925002324 mc93b_pontuacoes`) |
| produção servia | árvore de **2026-08-18**, sem `commit_ref` | **`c199591`, com `commit_ref`** |
| `origin/main` | **104 commits atrás** | convergido |
| `/ranking` | 200 · `text/html` (ausente) | **200 · JSON, a ler a tabela** |

Projeto Supabase de produção: **`vjslwowwrpcawijdiksm`** (staging é
`gjuelqjjhuuwnlsjyeai`). Confirmar SEMPRE antes de escrever.
Medido: `pontuacoes` 3 CHECKs · `rankings_ciclo` 6 CHECKs = **9** no total
(a documentação do MC93-B/D dizia 8 — o número certo é 9).

### ⚠️ HTTP 200 não prova que a função existe

`netlify.toml:34` reescreve `/*` → `/index.html` com **status 200**. Uma função
AUSENTE responde `200` com `text/html`, indistinguível de um OK.

> **Regra:** validar endpoints por **`content-type: application/json`**, nunca
> pelo código HTTP. E sempre com os dois controlos — um endpoint inventado (tem
> de dar HTML) e um que se sabe deployado (tem de dar JSON).

E `total: 0` também não prova que se está a ler a tabela: pode ser erro engolido.
A prova é inserir uma linha sintética, ver o endpoint devolvê-la, e apagá-la.

### ⚠️ `/feedback` não existe como função

É `GET /ranking?recurso=feedback&cicloId=…&endereco=…` (`ranking.mjs:46`), com
JWT de user-session obrigatório (anti-IDOR, validado a responder `401
sessao_invalida` em produção). E o endpoint de escrita é **`/pontuacao`**, não
`/pontuar`.

### ⛔ NÃO existe MCP do Netlify

Nunca foi instalado. Usar o **CLI 26.1.0**, já autenticado. O MCP do Supabase
existe e funciona.

### ⛔ TRÊS PENDÊNCIAS PARA O OPERADOR

1. **Rotar a chave Alchemy** de `desafio-gut/hardhat.config.cjs`. Introduzida em
   `a2c40ee` (MC89.14), que **já estava no GitHub antes deste MC**. Não tocada (R5).
2. **`desafio-gut/frontend/package-lock.json` está dessincronizado** do
   `package.json` (`typescript@5.9.3`, `@types/react@19.3.0`,
   `@tanstack/react-query@5.103.2`, `@tanstack/query-core@5.103.2` ausentes do
   lock). O job `install` da CI falha e **`build`/`lint`/`test-functions`/
   `test-onchain` saem `skipped`.
   ⇒ **É por isto que o `ci.yml` do MC93-E continua a nunca ter corrido.**
   Remédio: `cd desafio-gut/frontend && npm install --package-lock-only`.
   ⇒ E explica a divergência: o Netlify usa `npm install --legacy-peer-deps`
   (tolerante), a CI usa `npm ci` (estrito).
3. **`test_limiteMaxLancesUnicos()` do Foundry falha** — e **não é regressão**:
   `git log df691cf..c199591` nos caminhos do contrato e do teste vem vazio.
   Último verde **2026-08-10**, este **2026-09-25**, e o workflow usa
   `foundry-rs/foundry-toolchain@v1` **sem versão fixada**. O teste faz 10 000
   `darLance` em ciclo e estoura o tecto de gas (2³⁰). Remédio: fixar a versão.

### ⚠️ O push contornou a proteção de branch

```
remote: Bypassed rule violations for refs/heads/main:
remote: - Changes must be made through a pull request.
remote: - 2 of 2 required status checks are expected.
```
104 commits entraram em `main` sem PR e sem checks verdes, porque a conta tem
bypass. Não foi usada nenhuma flag de contorno. Se a proteção existe por desenho,
é decisão do operador.

### ⚠️ O auto-deploy continua LIGADO (`stop_builds: false`)

Hoje é inofensivo **porque `main` == local**. Volta a ser perigoso no dia em que
o local se adiantar sem push. Foi assim que nasceu o drift dos MC79 e MC89.49.

> **Regra que este MC confirma pela terceira vez:** com auto-deploy ligado, o
> `git push` É o deploy. Um `netlify deploy --prod` manual produz um deploy **sem
> `commit_ref`** — irrastreável — e é revertido pelo próximo merge.

### Decisões do operador (R18)

1. Aplicar a migração a produção **agora**.
2. **Push dos 104 commits primeiro**, depois o deploy.
3. **Não correr `--prod`** — o auto-deploy já publicara o mesmo commit, e um
   deploy manual por cima teria removido o `commit_ref`.

### Ressalvas (L-4)

Nenhuma rodada real processada (o leilão continua em `EM_BREVE_MODE`); as tabelas
estão vazias. Créditos do plano Netlify não medidos por API. As definições de
build ao nível do site divergem do `netlify.toml` (o toml ganha). A 3.ª validação
das correcções do MC93-E continua por fazer.

---

## MC93-G — Lockfile sincronizado e o CI a correr a sério (2026-09-25)

**Data:** 2026-09-25 · **Origem:** MC93-G, medição em runner GitHub real ·
**Recorrência:** ALTA · **Impacto:** ALTO (desbloqueou 5 jobs de CI).
**Modo LEVE** · **SEG-1: SEGUIR** · **Validador: APROVADO COM RESSALVAS**
**Zero código de aplicação.** Um só ficheiro: `desafio-gut/frontend/package-lock.json`.
**Logs:** `_logs/MC93G_*` · **Relatório:** `_logs/MC93G-RELATORIO.md`

### ✅ Estado dos lockfiles (medido com `npm ci --dry-run`)

| directório | estado |
|---|---|
| `<raiz>` | ✅ sincronizado |
| `desafio-gut` | ✅ sincronizado |
| `desafio-gut/frontend` | ✅ **corrigido neste MC** (era o único quebrado) |
| `desafio-gut/frontend/netlify/functions` | ✅ sincronizado |

### ⚠️ A causa: DOIS modos de instalação que não coexistem

As 4 entradas em falta (`typescript`, `@types/react`, `@tanstack/react-query`,
`@tanstack/query-core`) **não estavam declaradas** — são **peerDependencies** de
pacotes de produção (`abitype`, `viem`, `ox`, `@biconomy/account`, `wagmi`,
`valtio`, `zustand`). O npm 7+ auto-instala peers; `--legacy-peer-deps` salta-os.

```
npm ci --dry-run                     -> EUSAGE
npm ci --dry-run --legacy-peer-deps  -> passa
```

O lock era gerado no modo do `netlify.toml` e o `ci.yml` corre `npm ci` simples.

> ⛔ **ESTA CORRECÇÃO TEM PRAZO DE VALIDADE.** Medido: correr
> `npm install --legacy-peer-deps` (é o que `netlify.toml:3` e `npm run build:apk`
> fazem) **reverte o lockfile a byte-idêntico ao anterior** — 1067→1063 entradas,
> `sha 044780d8… -> d1f12aaf…` — e o npm diz só **"up to date"**. O `npm ci`
> volta a falhar nos mesmos 4 pacotes.
> **Antes de commitar um lockfile, correr `npm ci --dry-run` no directório.**
> Correcção de raiz (próximo MC): um modo só — `.npmrc` com
> `legacy-peer-deps=true`, ou `netlify.toml` a usar `npm ci`.

### ⭐ O CI correu num runner real pela primeira vez (run 36080693006)

| job | resultado |
|---|---|
| `install` · `lint` · `build` | ✅ **success** (1.ª vez; o `install` falhava em ~3 s) |
| `test-functions` | 583 testes · 580 ✔ · 1 ✖ · 2 ﹣ |
| `test-onchain` | 24 testes · 22 ✔ · 1 ✖ · 1 ﹣ |
| `audit` | ⛔ dívida pré-existente (10 high; idêntico nos dois lockfiles) |

**Os cinco testes `SERVIDOR:` do MC93-E passaram** — Postgres 17 + PostgREST
v12.2.3 + papéis + migração + JWT funcionam mesmo em CI.
**Os 7 testes do cenário EVM passaram**, com **hardhat 3.4.2 + edr next.29** —
versões que esta máquina não tem. A portabilidade contra a API pública do EDR
deixou de ser argumento e passou a medição.

### ⛔ REGRA NOVA: hash de ficheiro quebra entre sistemas operativos

`core.autocrlf=true` e **não existe `.gitattributes`** ⇒ o Windows tem CRLF no
disco, o runner Linux tem LF, e o **mesmo ficheiro em git tem sha256 diferente**:

```
Leilao.sol em disco (CRLF) : 3a3c6ed8e6f259cf…   <- gravado na fixture do MC93-E
normalizado a LF           : ee745ccbe27a73c9…   <- o que o runner calculou
```

⇒ O teste `"o sha256 da fixture corresponde ao Leilao.sol actual"` **nunca poderia
passar em CI**. Não "podia falhar": não podia passar. E os avisos
`LF will be replaced by CRLF` de cada commit eram a pista.

⚠️ **E afecta o BYTECODE também**: o solc embute um bloco CBOR com o **hash IPFS
da fonte**, logo CRLF e LF produzem bytecode diferente na cauda (divergência no
hex 10012 de 10098). O teste do solc — hoje saltado — **também falharia em Linux**,
com a mensagem errada. **A fixture do MC93-E não é reproduzível fora de Windows.**

> **Regra:** nunca hashear bytes crus de um ficheiro de texto versionado. Normalizar
> a LF antes, ou usar o hash do blob do git. E o repositório precisa de
> `.gitattributes` (`*.sol text eol=lf`) — regenerar a fixture sozinho não resolve.

### ⛔ Um guarda que não corre quando é preciso

| guarda no `ci.yml` | `if: always()` | no run real |
|---|---|---|
| `Prova de que o NIVEL 2 nao saltou` | ✅ tem | correu, `saltados=0` |
| `Prova de que a EVM nao saltou` | ⛔ **não tem** | **`skipped`** |

E `mc93e-ci-config.test.mjs` exige `if: always()` para o primeiro e **não** para o
segundo. A lição do MC93-E ("sem isto, se o passo falhar a prova nem corre") foi
aplicada a metade dos sítios, e o teste de configuração passou **verde** com a
assimetria dentro.

### Lições de método

- **Um teste que só correu na máquina de quem o escreveu mede também o sistema
  operativo dele.** Três dos quatro defeitos deste MC são do MC93-E e nenhum era
  visível sem runner real.
- **Auditar as remoções do diff, não só as adições.** As 31 remoções deste commit
  não eram pacotes: eram entradas que perderam `"dev": true`. Direcção medida:
  31 dev→prod, 0 prod→dev ⇒ instaladas em mais cenários, nunca menos.
- **Validar a correcção em cópia isolada antes de tocar no repositório.**

### Pendências

1. ⛔ **Um modo de instalação só** (A-1) — sem isto o lockfile volta a dessincronizar.
2. ⛔ **`.gitattributes` + regenerar a fixture** (A-3/A-4) — fecha as duas falhas CRLF.
3. ⛔ **`if: always()` no guarda da EVM** + a asserção que falta (A-2).
4. `npm audit`: 10 high pré-existentes. `test_limiteMaxLancesUnicos()` do Foundry
   (herdado do MC93-F). Chave Alchemy por rotacionar (operador, R5).
---

---

## MC96.1 — ADENDO: 3 refutações da auditoria adversarial (2026-09-25)

Veredicto do auditor `deleg_5fecd2ad`: **APROVADO COM RESSALVAS**, 3 refutações — todas corrigidas.

### 1. ⚠️ Um teste que aceita código COMENTADO não verifica cablagem nenhuma

A asserção `/historico:\s*historicoParaEnviar\(mensagens\)/` casava o texto-fonte **cru** e
passava com a chamada **comentada** (`// historico: …`). O auditor provou-o (M4a → GREEN).
**Eu tinha escrito a confissão do buraco no relatório e deixado um teste que não o tapava.**
→ Remover comentários (`/* … */`, `// …`) antes de comparar. Regra: **ao validar cablagem por
leitura de fonte, retirar comentários primeiro** — senão o teste mede a *menção*, não o *uso*.

### 2. «Payload exactamente como era» era falso

`INSTRUCAO_CONTEXTO` acrescenta-se **sempre** ao system ⇒ o system mudou **para todos**,
incluindo clientes antigos. O teste (c) só fixava `length`/roles e **nunca o conteúdo do system**,
deixando a alteração **global por declarar**. → Teste explícito + declarado no relatório.
*(Decisão consciente: mantém-se sempre; sem histórico a instrução é inerte.)*

### 3. ⚠️ O defeito que eu não vi era no PRODUTO, não no teste: closure obsoleta

`enviarMensagem` é `useCallback` e **faltava `mensagens` nas deps**. Em regime normal escapava
**por acidente** (o `carregando` alterna a cada turno e força recriação). Mas **após um reload**
— em que o efeito que carrega o histórico não muda nenhuma dessas deps — a **1.ª mensagem podia
enviar histórico vazio**. A funcionalidade deste MC falhava em silêncio **no caso mais provável**
(voltar à app e retomar a conversa). → `mensagens` nas deps + teste que lê o `useCallback`.

> **Testar o backend não é testar o produto.** A minha validação em produção passou ao lado
> porque fez POST directo ao endpoint, não passou pelo widget. O defeito vivia no widget.
> **Uma funcionalidade nova precisa de um teste que a exerça pelo caminho do utilizador.**

### Ressalva aberta (baixa severidade)

Um cliente pode injectar um turno `assistant` **fabricado** (ex. «Já confirmei o pagamento…») e o
modelo vê-o como fala sua. Nenhuma acção privilegiada deriva do histórico (admin exige JWT), mas
é um vector que não existia antes. Pendente para hardening (MC96.2 ou dedicado).

## MC96.2 — ADENDO: 3 refutações da auditoria + 3 armadilhas de teste (2026-09-25)

Validador `deleg_56475bcc`: **APROVADO COM RESSALVAS**, 3 refutações — todas corrigidas (testes 10/10).

### 1. Testar o enquadramento num só perfil não é testar o enquadramento

O mutante P9 (despejo CRU no **corporativo**, mantendo « » nos outros) **sobreviveu** — o teste
só media o perfil `comum`. **Sempre que um invariante vale por perfil, o teste tem de correr os
perfis.** Idem para o `admin`, que era o único fallback **sem saída**.

### 2. Um stripper de comentários que não sabe onde estão as strings apaga o que devia julgar

`/\/\*[\s\S]*?\*\//g` + `^[ \t]*\/\/.*$` tinha **2 pontos cegos medidos**: prosa com
`// leilões` **dentro de um template literal**, e `/* leilões */` **dentro de uma string** — ambos
passavam em VERDE. Agora só se removem comentários que **abrem a linha**.

### 3. ⚠️ Prova textual de código que não corre é falso-verde (classe do MC96.1, reproduzida)

`assert.match(CHAT, /novo leilao/)` casava o texto **COMENTADO**: comentar a linha inteira do
regex deixava o teste **VERDE** enquanto o módulo **rebentava no import**. **Um invariante sobre
comportamento exige uma asserção comportamental** — importar e chamar, não procurar a string.

### 4. «Leilão» em prosa existe FORA do GUTO (achado que transcende o MC)

`MercadoLances.jsx` (9), `AppContext.jsx` (6), `Vitrine.jsx` (6), `produtos.mjs`,
`ia-preditiva.mjs`, `ComingSoonHero.jsx`, `Sidebar.jsx`, `edicao.js`. Os MC96.x limpam a
**persona do GUTO**; o vocabulário da **interface** (o que o testador vê a navegar) não foi coberto.

### 5. Uma mensagem de erro também é uma medição

O push respondeu `Bypassed rule violations ... Cannot force-push`. Li como **bloqueio**; o código
de saída era **0** e «bypassed» = a conta **contornou** a regra. Quase registei que o remoto ficara
com a mensagem partida quando não ficou. **Medir o resultado da correcção**, não interpretá-lo.

### 6. Limpar worktrees com junctions: usar `os.lstat`, não `os.path.islink`/`os.stat`

`os.path.islink` dá **False** numa junction e `os.stat` **segue o link** (devolve os atributos do
alvo) — o detector correcto é `os.lstat(p).st_file_attributes & 0x400`. No `valida-962-wt` havia
**3 junctions** a apontar para o `node_modules` do principal: removidas com `os.rmdir` (numa
junction apaga só o link), com contagem antes/depois — **175807 ficheiros intactos**.

## MC96.3 — ADENDO: 4 refutações da auditoria (2026-09-25)

Validador `deleg_bfdf8ee9` (50 chamadas, 762 s): **nem APROVADO nem REPROVADO** — «duas das
alegações centrais (teste que trava / nenhuma string visível) são **falsas como garantia**».

### 1. ⚠️ UM VERIFICADOR CEGO É PIOR QUE NENHUM

`textoVisivel` usava `m[1]` em regexes **sem grupo de captura** → `undefined` → `""` em silêncio.
Só a regex `>…<` capturava, e excluía `\n` e `{` ⇒ **JSX multi-linha e texto interpolado eram
invisíveis**. B1 (um `<p>` multi-linha com «leilão») e B2 (`ariaLabel` alterado) → **GREEN**.
>> «O teste afirma X» só vale se o teste **consegue ver** X.

E a lição operacional: **corrigi este bug no script ad-hoc e esqueci-o no ficheiro de testes.**
Duas cópias da mesma lógica — corrigi uma. **Ao corrigir um bug, procurar as outras cópias.**

### 2. Sem o extractor corrigido, a limpeza estava incompleta — e eu não a via

+7 strings visíveis que ficaram, **em ficheiros que eu tinha declarado «cobertos»**:
`Privacidade.jsx` (2) · `Vitrine.jsx` (2) · `MercadoLances.jsx` (2) · `CorporativoCarteira.jsx` (1).

### 3. CÓDIGO MORTO QUE PASSA NOS TESTES DÁ SEGURANÇA FALSA

`ARTIGOS_V4` era objecto de 6 asserções verdes e **nunca chegava ao LLM** (o texto vivo é
`REGRA_REGULAMENTO`, escrito à mão, sem verificação numérica). **O teste media uma constante; o
produto usava outra.** → `ARTIGOS_V4` passa a alimentar o prompt (o LLM recebe o texto verbatim),
e o teste ganha (c0a) valores **amarrados ao seu artigo** + (c0b) ARTIGOS_V4 **tem de chegar ao
prompt**.

### 4. PRESENÇA ≠ CORRESPONDÊNCIA (2.ª vez nesta série)

O check «o número existe no documento» deixou sobreviver o mutante A1 («2 (duas) casas» →
«1 (uma) casas»): **«1 (uma)» existe no v4 — no Art. 33**, noutro contexto. **Num documento de 40
artigos, «o valor existe» não diz nada sobre o artigo certo.** Amarrar ao artigo mata o mutante.

### 5. Parafrasear o artigo que sustenta a tese

Eu escrevi «loteria ou qualquer modalidade **de sorte**»; o v4 diz «…**sujeita a autorização
específica**». No prompt, e por minha conta, no artigo juridicamente central. **Texto do
documento, verbatim — sempre.**

### 6. Contagens apresentadas como factos

Aleguei «33 ficheiros / 141 ocorrências»; o auditor mede **34 / ~155**. A conclusão qualitativa
mantém-se, o número **não era reprodutível**. **Medir não chega: é preciso dizer COMO, para ser
reproduzível.**

## MC96.6 — Refactor AST + fecho definitivo (2026-09-26)

**Fecho** `c34e4b5` · frontend **381/381** · backend **676/682** · validador da série: **pendente**.

- **`scripts/mc966-suite-harness.mjs`** — o verificador que faltava: **três** estados
  (VERDE / VERMELHO / **NAO_MEDI**) e não dois. **Saída vazia é NAO_MEDI, não «0 falhas»**, e
  NAO_MEDI pesa mais que VERMELHO.
- **Renames executados** (AST, um de cada vez, suíte entre cada): `tipoLeilao`→`modalidade` (65
  ids/12 ficheiros) · `setTipoLeilao`→`setModalidade` · `FimLeilaoOverlay`→`FimEdicaoOverlay`
  (+ `git mv` do ficheiro). `isLeilaoAtivo` fica (categoria c).
- ⚠️ **Dois defeitos do meu próprio renamer**, apanhados pelo harness à primeira: **`JSXIdentifier`
  é um tipo de nó diferente de `Identifier`** (os atributos JSX ficaram por renomear → componente
  lê `undefined` → quebrou o invariante do MC94.4.1); e **acessos a membro** (`slot.tipoLeilao`)
  ignorados enquanto as chaves do mesmo objecto eram renomeadas.
- ⚠️ **A minha lista de excepções mascarava o defeito**: excluía `tipoLeilao`, o identificador sob
  rename. **Uma lista de excepções pode ser um ponto cego com nome bonito.**
- ⚠️ **Corrigida uma atribuição FALSA minha** (ver acima): o vazio não era do `^.` vs `^ℹ`.

## MC96.5 — Fecho da série MC96 (2026-09-26)

**HEAD** fcee691 · Relatório consolidado: **Desktop/MC96-SERIE-RELATORIO.md** · Validador da série: deleg_af25f606 (pendente).

### Feito
- `docs/chatbot/regulamento.md` (fonte POR OMISSÃO de build-rag-index.mjs) tinha 7 «leilão», 2
  «9.999,99», 1 «0,02» → **0/0/0**, com o conteúdo do v2. Era a armadilha mais provável: quem
  corresse o script do Opus sem --fonte reconstruía o índice errado.
- `chunk_prod.js` (31 963 B de build stale) **apagado** — a única referência era uma linha de
  ignore no eslint.config.js, removida também. Zero referências provadas por grep global.
- `scripts/mc965-rename-ast.mjs`: rename **por AST** com `espree` (JÁ presente no projecto — não se
  instalou nada). 3 guardas: colisão, sombras, chaves não-shorthand. **Prova embutida: se os
  comentários mudarem, aborta.**

### ⚠️ NÃO feito: o refactor AST (P3)
O DRY RUN funcionou e ensinou: `tipoLeilao`→`tipoEdicao` **colide** (tipoEdicao já existe em
Vitrine.jsx — a guarda apanhou; um sed teria corrompido em silêncio); `→modalidade` dá 12
ficheiros/57 identificadores, incluindo 7 chaves de objecto que TÊM de ser renomeadas.

Parou porque **não consegui ler o resultado da suíte com segurança**: o meu grep usava `^.` (não
casa com o `ℹ` multi-byte do reporter). A reversão automática ficou parcial → 2 ficheiros com o
rename e o resto revertido = prop quebrado. **Revertido por completo**; confirmado por
`git diff --ignore-cr-at-eol` = vazio (o resto era normalização CRLF/LF).

> **Aplicar 5 renames sobre um verificador que mente é o trabalho não-verificado que esta série
> existe para impedir.** Prefiro um MC parcial e honesto a um MC «completo» que não sei provar.

### ⚠️ O grep do reporter: a lição que custou um MC inteiro
⚠️ **CORRECÇÃO do MC96.6 — a explicação acima estava ERRADA.** Eu atribuí o vazio ao `^.` não
casar com o `ℹ` multi-byte. Medi: **`grep -cE '^. (tests|pass|fail)'` devolve os MESMOS 3 matchs**
que o `^ℹ` — em MSYS o `.` casa o carácter inteiro. A causa real foi a suíte **não ter corrido**
(o `$(find src …)` não resolveu dentro de um `bash -c` chamado por python → `node --test` sem
ficheiros → zero output, o mesmo `stdin is not a tty`).

O que **continua** verdadeiro e é o que importa: **saída vazia do reporter não é «0 falhas»: é
«não medi»** — e a solução certa é o harness que separa os três estados
(`scripts/mc966-suite-harness.mjs`: VERDE / VERMELHO / NAO_MEDI, com NAO_MEDI tratado como mais
grave que VERMELHO). **Atribuir uma causa sem a medir é o mesmo defeito que não medir o
resultado** — e esta correcção só apareceu no MC seguinte. Uma guarda tem de distinguir
«medi e está verde» de «não consegui medir» — senão o silêncio passa por aprovação.

### ⚠️ Backticks em heredoc bash -c — 4.ª vez
Desta vez o shell **EXECUTOU** um script a partir do texto da mensagem de commit
(`build-rag-index.mjs` correu e falhou por falta de env vars). Saiu ileso **por sorte**, não por
desenho. **Nunca mais**: mensagens de commit vão por **ficheiro**, escritas em python puro.

## MC96.3 — GUTO ligado ao regulamento v4 + vocabulário visível da UI (2026-09-25)

**Fecho de código** `78be035` · frontend **381/381** · backend **679/673/0/6** · validador `deleg_bfdf8ee9`.

### ⚠️ O teste bidireccional apanhou um facto MEU errado — e o briefing estava incompleto

Eu afirmava que o **Art. 7º** diz «torneio de habilidade». **Não diz** — define a MECÂNICA
(«QUANTO VOCÊ OFERTA POR…», menor lance único, decidido pela **estratégia**, não por
aleatoriedade). A expressão está nos **Arts. 1º e 38º**, e o **Art. 38º** (Portaria SPA/MF
1.207/2024 + «não se trata de aposta de quota fixa, jogo de azar, loteria») é o artigo que
sustenta a tese jurídica inteira — **e o briefing do MC não o listava.** Acrescentado.

> **Um teste bidireccional não confirma o que escrevi: verifica se o que escrevi está no mundo.**
> Se ele só olhasse para o prompt, teria passado — e o GUTO citaria «torneio de habilidade» num
> artigo que diz outra coisa.

### «N ficheiros têm o termo» ≠ «N ficheiros precisam de correcção»

O briefing dizia 8 ficheiros; medido: **33 ficheiros / 141 ocorrências**. Mas o que é **vocabulário
visível** cabia em **16 strings de 10 ficheiros**. O resto divide-se em:

- **identificadores** (`tipoLeilao`, `isLeilaoAtivo`, `FimLeilaoOverlay`, `leilaoTimer.js`,
  `leilaoLock.js`) — **preservados**: renomear é um **refactor** (imports/contrato interno), não
  uma correcção de vocabulário;
- **nome do contrato on-chain** (`LeilaoGUT`) — **preservado**: é um **facto**;
- comentários históricos que documentam decisões (`MC29.1`, `MC88.20`) — preservados.

**Contar ocorrências não é medir o problema.**

### Formatos que enganam (dois medidos neste MC)

1. **O v4 escreve `Art. 20º -`** (com o ordinal). Um regex `Art\.\s*20\b` **não encontra nada** e
   devolveria `""` — e **um teste que compara com `""` passa sempre**. Tem de ser `Art\.\s*20\u00ba`.
2. **Um filtro de ruído pode comer o sinal.** A verificação de correspondência descartava palavras
   com ≤5 caracteres — e «R$ 0,01», «0,05», «um», «cinco» caíam **todos** lá: era **vacuosa
   exactamente nos valores em R$**, o cerne jurídico. A mutação M2 (R$ 0,01 → R$ 0,05) sobreviveu
   por isso. **Ao filtrar ruído para comparar textos, garantir que o filtro não come o que se quer
   comparar.**

### Ligação ao v4 (o que fica)

`REGRA_REGULAMENTO` + `ARTIGOS_V4` no prompt de todos os perfis (ponto único `obterPromptSystem`):
cita o artigo, fixa os factos (5º/6º/7º/8º/20º/26º/27º/36º/**38º**) e **proíbe inventar artigos**.

## MC96.2 — Fallback natural + vocabulário jurídico do GUTO (2026-09-25)

**Fecho de código** `7f06832` · frontend **378/378** · backend **670/664/0/6** · validador `deleg_56475bcc`.

### ⛔ «LEILÃO»: o briefing dizia «todas as 33 ocorrências têm de sair» — e isso PARTIRIA o produto

Medido: **32** ocorrências, das quais **5 não podem sair** porque não são vocabulário do GUTO:

| onde | o que é | porque fica |
|---|---|---|
| regexes do intent router (`novo leilao`, `se (o leilao )?terminasse`, `como esta (a edicao\|o leilao\|indo)`) | **palavras do UTILIZADOR** que o router reconhece | apagá-las faria o GUTO deixar de entender quem escreve «leilão» — e de criar edições por «novo leilão» |
| `isLeilaoAtivo` | chave de config de `_lib/recursos-app-config.mjs` | fora do escopo; renomear exige mexer em ficheiro não autorizado + nos dados do Blob |
| comentários `MC29.1` / `MC88.20` | documentam decisões | histórico, não persona |
| 1 `console.warn` | log interno | não é o GUTO a falar |

**O que sai é a PROSA DA PERSONA.** Cada excepção está justificada **dentro do teste**, com
asserção que impede «leilão» em prosa no `chatbot.mjs`. **Medir o enunciado antes de o cumprir**
— 4.ª vez nesta série (MC94.4.1, MC95, MC96) que o briefing estava desactualizado.

### O fallback (fallback_sem_llm, 4 perfis)

Antes: `Olha o que encontrei no regulamento: ${trecho}` — o **chunk cru**, com markdown de
documento. Agora: `Encontrei isto no regulamento: «${trecho}» …` — **enquadrado**, com a fonte
nomeada e uma **saída** (o contacto oficial). Sem correspondência: frase natural com saída,
mantendo o tom de cada perfil (visitante «! 😅», admin técnico sem emojis — MC15.5 §D3).

### Regra que sai daqui

**Uma asserção forte demais é um convite a estender o escopo.** O teste exigia «torneio de
habilidade» (o termo oficial, que vive no v4). A resposta certa **não** era ir reescrever as
saudações para o satisfazer (isso invadiria o MC96.3): era **baixar a asserção ao que a medição
sustenta** («torneio») e registar o resto como pendência. **Nunca alargar o trabalho para
satisfazer um teste** — corrigir o teste.

## MC96.1 — Contexto conversacional do GUTO (2026-09-25)

**Fecho de código** `418ace1` · frontend **376/376** · backend **663/657/0/6** · validador `deleg_5fecd2ad`.

`chatbot.mjs` montava `messages: [{system},{user}]` — **zero histórico**. Um «Sim» chegava sem
referente («Sim pra quê? Não peguei!»). Agora `montarHistorico()` (puro) normaliza o histórico
que o **cliente** envia e `chamarLLM` monta `[system, ...histórico, user]`, com
`INSTRUCAO_CONTEXTO` no system. Sem histórico, o payload fica **exactamente** como era.

### Regras que saem daqui

1. **O histórico vem do cliente, não de armazenamento novo.** O `ChatbotWidget` já tinha a
   conversa em `mensagens`; criar um store seria trabalho a mais e mais um sítio a falhar.
2. **`montarHistorico` descarta `role: "system"` vindo do cliente** — senão o cliente
   reescreve a persona pela API. Nunca aceitar `system` do exterior.
3. **O body do `/chatbot` não tem schema estrito** ⇒ campos novos são retrocompatíveis e um
   APK antigo que só mande `pergunta` não nota diferença. Medir isto ANTES evitou um «PARAR».
   ⚠️ **`setMensagens` corre ANTES do `apiPost` e o React não é síncrono** ⇒ o que o helper
   vê são os turnos ANTERIORES. É o correcto: a pergunta actual vai em `pergunta`. Montar o
   histórico depois do `setMensagens` duplicaria a pergunta no payload.
4. **Helpers testáveis vivem em `.js`, não dentro de `.jsx`** — o `node:test` não interpreta
   JSX, e um helper não testável foi o que falhou no MC95.2.
5. ⚠️ **A LIÇÃO DO MC95.2 APANHOU-ME A MIM, UM MC DEPOIS.** A mutação «o widget deixa de
   enviar o histórico» **SOBREVIVEU**: o teste media o **helper**, não a **cablagem**. O helper
   estar certo não prova que alguém o usa. Passou a haver asserção de cablagem (lê o
   `ChatbotWidget.jsx` e exige a chamada). **Ao testar uma peça nova, perguntar sempre: e quem
   a LIGA?** Uma lição não se herda — aplica-se a cada peça.

## MC95.2 — Auditoria adversarial: 4 refutações no gate (2026-09-25)

**Fecho** `d920b6d` · chunk `index-Ca2PLhI-.js` LIVE · suíte **371/371**.

O validador independente (`deleg_ba1c22bc`) **confirmou** o essencial (dados de pagamento
cirúrgicos, produção com sha256 == local, Art. 20 correto nos dois lados) e **refutou 4 coisas**:

1. **Cabeçalho do gate** — «Vigência: a partir de 1º de junho de 2026», com o v4 a ter **zero**
   «junho». O MC95 corrigiu os blocos dos Art. 4/37 e **não viu o cabeçalho** (estava em produção).
2. **Bloco «Art. 5» era FUSÃO** de Art. 5 + Art. 6 — a renomeação 6→5 corrigiu metade.
3. **Pergunta do Art. 7** — «PAGA POR ESSE BEM» vs v4 «OFERTA POR…».
4. ⚠️ **O teste `citacoesRegulamento` não travava o que o nome promete**: repor Art. 14 ou
   Art. 24(d) na redacção pré-MC95 dava **9/9 PASS** — nunca comparava o **texto do bloco**.

**REGRA QUE SAI DAQUI — UM TESTE COM O NOME CERTO PODE NÃO TESTAR NADA.** Se um teste diz
«trava que X corresponde a Y», tem de verificar **nos dois sentidos** (as chaves no lado A **e**
no lado B) e tem de ser demolido por uma mutação que **reponha o texto antigo**. Um teste que só
verifica PRESENÇA de chaves curadas passa por cima de qualquer regressão de conteúdo.

**E o validador vê o que o autor não vê — não se compensa com cuidado.** Corrigi 8 números
errados e deixei o cabeçalho, com a mesma data errada, a 5 linhas de distância.

## MC95.1 — Deploy do gate + alinhamento de dados de pagamento (2026-09-25)

**Base** `5d516a7` · **Fecho** `8d0a3ce` · **Deploy** `6ab720bf552deaee8b39a0a8` (0 functions).

### Dados de pagamento — o que o app dizia e o que o Regulamento regista

| | app (antes) | Regulamento v4 | estado |
|---|---|---|---|
| PIX (Art. 21) | `desafiogut01@gmail.com` | chave `23.040.066/0001-00` (CNPJ) | **alinhado** |
| Agência BB | `181627` | `198627` | **alinhado** |
| E-mail institucional (Art. 1) | `grupouniaoetrabalhoam@gmail.com` | `contato@grupouniaoetrabalho.com.br` | **alinhado** |
| E-mail de **suporte/DPO** | `desafiogut01@gmail.com` | — | **mantido** (decisão MC88.44) |
| Art. 27 (Bradesco ag 0320, PIX `renascendoam@gmail.com`) | não existe no app | pagamento de **prémio** | **mantido só no Regulamento** |

### ⛔ `desafiogut01@gmail.com` tem DOIS papéis — nunca fazer replace_all

É o **PIX do Art. 21 do gate** (divergia → alinhado) **e** o **e-mail de SUPORTE/DPO**
(`EMAIL_SUPORTE` em `_lib/guto-perfis.mjs`, decisão do operador no **MC88.44**, usado em
`ExcluirConta.jsx`, `Privacidade.jsx`, `Seguranca.jsx`, `Layout.jsx`). Substituir por padrão
arrastaria o suporte **sem dar erro nenhum**. O teste `src/components/__tests__/dadosPagamento.test.mjs`
trava as duas coisas ao mesmo tempo — inclusive um mutante que arrasta o `EMAIL_SUPORTE`.

### O PIX de compra é DINÂMICO — o texto legal é que era estático

`iniciar-pagamento.mjs:99` → `getPixProvider().gerarPedidoPix(...)` → `qrCodeText` (QR + copiar em
`ComprarFichasModal`). **Nada a mudar no fluxo.** O que divergia era a **referência estática** no
Art. 21 do gate, que passou a indicar a chave oficial e a geração dinâmica.

### Método: um crawl parcial dá um veredicto errado com toda a confiança

O `index.html` só referencia **5 chunks**; a app tem ~130 (lazy). O primeiro check, sobre 5,
concluía «o deploy do MC95 não está feito» — e teria levado a **redeployar por hábito**, que é o que
o HARD GATE 1 proíbe. O **crawl completo por BFS (49 chunks, 4,27 MB)** mostrou os 7 marcadores do
MC95 em produção e todos os antigos ausentes. **A pergunta «quantos chunks olhei?» tem de vir antes
da conclusão «não está lá».**

⚠️ Fica **não medido** *como* as alterações do MC95 chegaram a produção. A hipótese «auto-build no
push» foi testada e **refutada** (o push do MC95.1 não alterou produção). Registado como não-medido,
não como «provavelmente foi X».

### ⚠️ `netlify deploy --build` MEXE NO `package-lock.json` — e não só em CRLF

Medido no MC95.1: depois do deploy, `git diff --numstat --ignore-cr-at-eol -- desafio-gut/frontend/package-lock.json`
devolveu **31 / 53** — **não vazio**, logo há **alteração de conteúdo**, não apenas fim de linha.
(`--ignore-cr-at-eol` vazio = falso-modificado por CRLF; com números = conteúdo real.)

**Isto liga-se a uma pendência registada:** o `npm install` do build **poda** do `node_modules`
local os pacotes que não estão no lockfile — é a explicação provável do desaparecimento de
`@aws-sdk/client-kms` e `@biconomy/account` (importados **dinamicamente** por `_lib/kms/aws-kms.mjs`
e por dois testes), que fez 2 ficheiros de teste falharem com `ERR_MODULE_NOT_FOUND` no MC94.5.

**Procedimento:** depois de cada `netlify deploy --prod --build`, correr
`git restore --source=HEAD --worktree -- desafio-gut/frontend/package-lock.json` e, se o
`--ignore-cr-at-eol` **não** estiver vazio, **reportar** a alteração de conteúdo — é o build a
mexer no grafo de dependências, e o lockfile do repo é a fonte da verdade (o MC não autoriza
alterações de dependências).

### ⚠️ Ferramenta: NÃO passar markdown com backticks através do `bash -c`

A primeira versão desta secção foi escrita a partir de uma linha de bash e chegou ao ficheiro
**mutilada**: cada fragmento entre backticks foi interpretado pelo shell como substituição de
comandos e substituído por vazio (`**Base**  · **Fecho**` sem os hashes, células de tabela vazias).
Para escrever conteúdo com backticks, `$`, `<!` ou acentos, usar `write_file`/`patch`/python —
**nunca** interpolar num comando de shell.

---

## MC95 — Regulamento v4 + alinhamento do gate legal (2026-09-25)

**Entrada:** `Desktop/regulation_v3.md` (**nome em inglês** — o briefing dizia `regulamento_desafiogut_v3.md`, que não existe). **Saída:** `Desktop/regulamento_desafiogut_v4.md`. **8 artigos alterados de 40**; 32 idênticos.

### ⛔ O gate de consentimento citava 8 dos 15 artigos com o número ERRADO

`TermosConsentimento.jsx` (o gate LGPD) — corrigido em MC95, com o teste `src/components/__tests__/citacoesRegulamento.test.mjs`:

| dizia | é | conteúdo |
|---|---|---|
| Art. 6 | **5** | cadastro gratuito |
| Art. 8 | **7** | menor lance único |
| Art. 9 | **8** | modalidades de lance |
| Art. 16 | **13** | transferência de propriedade |
| Art. 26 | **25** | apuração automática |
| Art. 27 | **26** | lance mínimo R$ 0,01 |
| Art. 30 | **34** | proibição de funcionários |
| Art. 33 | **29** | cessão de imagem |
| Art. 35 | **37** | registo no RTD |

E duas **contradições materiais**: o gate dizia «cada senha custa R$ 2,00 **para todas as edições, seja Relâmpago ou Programado**» (o Art. 20 diz o contrário: o Relâmpago **não consome senhas**), e citava a redacção **antiga** do Art. 14. Também corrigidos: datas do Art. 4 (1º junho → 5 outubro) e do RTD.

**Regra:** o app NÃO pode dizer aos utilizadores algo diferente do Regulamento notariado. Ao mudar o Regulamento, verificar o que o app cita — e verificar por **conteúdo**, não por presença do número (um teste que só procura «Art. 26» no ficheiro deixa passar a ocorrência que mudou; foi uma mutação que o mostrou).

### ⚠️ Dados de pagamento divergem entre app e Regulamento — decisão do operador, NÃO alinhada

| | app | Regulamento v4 |
|---|---|---|
| PIX | `desafiogut01@gmail.com` | `23.040.066/0001-00` |
| Agência (BB) | 181627 | **198627** |
| e-mail (Art. 1) | `grupouniaoetrabalhoam@gmail.com` | `contato@grupouniaoetrabalho.com.br` |

O Regulamento tem ainda **dois destinos** (Art. 21: BB ag. 198627 cc 847534; Art. 27: Bradesco ag. 0320 cc 0812782-4, PIX `renascendoam@gmail.com`). **Não foi alinhado de propósito:** escolher um número de agência é decidir para onde vai dinheiro de terceiros. Pendente de decisão.

### Lição de método (custa a aprender, vale a pena repetir)

**Um diff é uma medição — e mede a coisa errada se o escopo for mau.** O diff v3→v4 errou **duas vezes** antes de acertar: (1) comparava só a linha do «Art. Nº» e dava o **Art. 35** por não alterado — que tem 16 linhas e leva **duas** das nove correcções; (2) deixava o bloco do último artigo engolir a secção «Notas Internas» removida e acusava o **Art. 40** de ter mudado. Confiar no primeiro teria produzido um relatório a dizer que as correcções 6 e 9 não foram aplicadas.

---

## MC94.5 — O GUTO anuncia a rodada especial (2026-09-25)

**Data:** 2026-09-25 · **Origem:** sequência operacional · **Base:** `2bd9b5e` · **Fecho:** `786dd07`
**Deploy:** `6ab7007d7c650014baaa889d` · **4 ficheiros novos, 0 modificados.**

### ⛔ Há DUAS coisas chamadas «notificações» — e um comentário que mente sobre a que importa

| | o que é | quem lê |
|---|---|---|
| `_lib/notificacoes-usuario.mjs` | Blob **por endereço** (`notificacoes`), FIFO 50, fail-soft. **É aqui que se escreve.** | `GET /notificacoes` no ramo do **PARTICIPANTE** (`getParticipante` → `lerNotificacoes`) → mostrado pelo **`ChatbotWidget.jsx`** como **card no chat do GUTO** + badge `🔔 N` |
| `GET /notificacoes` (ramo **admin**) | eventos **DERIVADOS on-read** (`tempo_limite_5min`, `sistema_pausado`, …), **sem store** | badge do admin |

⛔ **`AppContext.jsx:337` diz «notificacoes: … (admin-only)» — é FALSO.** O endpoint tem ramo
de participante. Quem ler só o comentário conclui que **não existe canal para o participante** —
e um MC de anúncio parece impossível. *(3.º caso desta série, depois dos «96 px» e do
`createOnLogin`: comentários que mentem custam MCs inteiros.)*

**Um `tipo` DESCONHECIDO aparece na mesma:** `ChatbotWidget` faz
`cardKind: NOTIF_CARD_KIND[n.tipo] || "notificacao"` — o fallback é o que permite anunciar sem
tocar no frontend.

### Push não existe

`admin-notify.mjs:34` → `canal: "push"` devolve **501** («após Firebase + APK novo»), `whatsapp`
também. **Anúncio ao participante = in-app apenas.**

### Estado dos destinatários (o que o código NÃO sabe)

`atividade_utilizadores` = `endereco, primeiro_acesso, ultimo_acesso, acessos` — **sem campo de
testador**; `registarAtividade` corre no login (logo: todos); **zero** marcadores de
testador/beta no projecto. **Os testadores vivem na Play Console.** Para anunciar por
aproximação: `primeiro_acesso <= corte` (R18: 02/10/2026 23:59 BRT).

### `scheduled-anuncio-especial.mjs` — e a idempotência INVERTIDA de propósito

Cron `*/5 * * * *`, alvo `2026-10-03T23:00:00Z` (03/10 20:00 BRT). Marcador no Blob
`anuncio-especial`/`ESPECIAL-AIRFRYER-24h`.

> ⚠️ **Marca DEPOIS, ao contrário do irmão `scheduled-encerrar-especial.mjs`.** O irmão marca
> **antes** porque a acção dele é uma transacção on-chain que **custa dinheiro** (duplicado
> caro; perda resolve-se à mão). Aqui o custo de um duplicado é um card repetido e o custo de
> uma perda é **um anúncio que nunca chegou**. Camada 2: `adicionarNotificacao` ignora
> duplicado **não-lido** com a mesma chave `tipo:edicaoId:valor` — se o lambda morrer a meio, o
> tick seguinte não duplica. **Não «corrigir» isto para o padrão do irmão.**

Regras do tick: marcador ilegível → **não envia**; público indisponível → aborta **sem marcar**;
falha por destinatário → contada, **não trava os outros**; `dryRun` → calcula e **não escreve**.

**Ensaio executável:** `_tests/mc945-dry-run.script.mjs` (não é teste: corre à mão e lê-se).
⚠️ A 1.ª versão deu **público vazio** (fake com strings em vez de linhas-objecto) e parecia
aprovada → passou a haver guarda que **exige público não-vazio**. *Um ensaio sem gente não prova nada.*

### Pendência NOVA (ALTA): dependências NÃO DECLARADAS em código de produção

`_lib/kms/aws-kms.mjs` faz `await import("@aws-sdk/client-kms")` — pacote que **não está no
`package.json`** (que declara o **v2** `aws-sdk`) **nem no lockfile**. O import é **dinâmico**,
logo o deploy empacota e a app funciona hoje; se o caminho **KMS** for usado sem o pacote,
falha nesse instante — **caminho de dinheiro**. É a mesma classe do `@nomicfoundation/edr`
(MC94.4): **dependências que existem só por acidente do ambiente local**; num CI limpo o verde
seria outro e ninguém saberia porquê. Sintoma visível: `biconomy-handshake` e
`mc302-integracao` falham com `ERR_MODULE_NOT_FOUND`.

### Lições

1. **Ler o CÓDIGO, não o comentário.** Um «admin-only» falso quase cancelou um MC possível.
2. **Duas coisas com o mesmo nome não são a mesma coisa** — distingui-las foi o que abriu o MC.
3. **Um verde que mede o vazio é pior que um vermelho** (o ensaio com público vazio).
4. **Provar a não-regressão por experimento**: esconder os ficheiros novos e ver as MESMAS
   falhas fechar a questão sem margem — e é reprodutível.


---

## MC94.4.1 — Lance da edição especial debita SALDO, não senha (2026-09-25)

**Data:** 2026-09-25 · **Origem:** desvio reportado pelo operador ·
**Recorrência:** ALTA (a classe «campo de dados decide o débito») · **Impacto:** ALTO (cobrança errada)
**Base:** `f4481d6` · **Fecho:** `299acc0`

### ⛔ A causa NÃO era código — era um campo de dados

O briefing previa um bug no backend. Medido: **o código estava certo.**
`lance-relampago.mjs:187` faz `ehProgramado = tipoEdicao === "programado"` e o comentário
da linha 189 diz, por escrito: *«programado = senha; flash = saldo R$»*. E
`LANCE_MIN_CENTAVOS = 1` — **não há trava de R$ 2** (o mínimo é R$ 0,01 desde sempre).

O que decidia a cobrança era o campo `tipo` da **metadata** da edição, e a especial tinha
`tipo: "programado"` — valor que nasce no seed:

```js
tipo: "programado",   // D1 do operador: cada lance gasta 1 senha
```

⇒ **Não era um defeito: era uma decisão anterior (D1 do MC94.1) que o operador reverteu
(R18).** A especial é uma edição **RELÂMPAGO** e o lance debita **saldo em dinheiro a
partir de R$ 0,01**. *(A minha interpretação do MC94.3.2 — «a especial é programada» —
era exactamente a que eu tinha marcado como a confirmar. Ficou confirmada ao contrário.)*

### A correcção (4 partes)

| # | onde | o que |
|---|---|---|
| C1 | `scripts/mc941-seed-edicao-especial.mjs` | `tipo: "relampago"` + comentário a registar a reversão da D1. Regravado com `--force` (o script relê e confirma; escreve por `netlify blobs:set`, **sem ler token — R5**) |
| C2 | `CardEdicaoEspecial.jsx` | `tipoLeilao: "flash"` (era `"programado"`). Em `CardLance` **é este campo que escolhe tudo**: `"programado"` liga o gate on-chain de senhas + a conversão R$→senha e posta em `auth-lance`; `"flash"` posta em `lance-relampago` e debita saldo |
| C3 | `i18n/{pt,en,es}.js` + fallback | «Lance relâmpago · vence o menor lance único · **a partir de R$ 0,01 (debita do saldo)**» |
| C4 | ver abaixo | os ficheiros invisíveis ao `grep` |

**Os dois lados têm de concordar:** a metadata e o `tipoLeilao` do cartão. Corrigir só um
deixa a UI a exigir senha (ou o backend a debitar senha) — é a coerência dos dois que muda
o comportamento.

### ⛔ C4 — dois ficheiros que o `grep` NÃO conseguia ler

`_lib/edicoes-core.mjs` (produção) tinha **3 bytes de controlo crus** dentro da classe de uma
regex — `/[ -]/` escrito com os bytes literais 0x00, 0x1F, 0x7F em vez dos escapes
` `, ``, ``. A regex funcionava (mesma semântica), e é por isso que ninguém notou.
O custo estava nas **ferramentas**:

```
file  -> "data"                    (binário)
grep  -> "Binary file ... matches"  e SALTava o ficheiro em silêncio
git   -> "Bin 13331 -> 13340 bytes" (diff ilegível)
```

> ⇒ **Um ficheiro invisível ao `grep` é um ficheiro invisível à auditoria.** Todas as
> varreduras dos MC94.3 e MC94.4 passaram por cima deste ficheiro — não por descuido, mas
> porque a ferramenta não o lia. Corrigido para os escapes; medido: `file` passa a
> «JavaScript source, UTF-8 text» e o `grep` conta linhas.

O mesmo problema existia em `_tests/mc93e-ci-config.test.mjs` (1 byte `0x01`), e o
comentário do próprio ficheiro admite-o: *«Ao escrever este MC injectei dois 0x01 por uma
retro-referência de `sed`»*. Ironia: é o ficheiro que **verifica** que o `ci.yml` não tem
caracteres de controlo.

**Invariante novo:** `_tests/mc9441-fonte-texto.test.mjs` varre **todos** os `.mjs` e falha
se algum tiver controlo cru. Um caso corrigido sem invariante é um caso que volta.

### ⚠️ Duas armadilhas de ambiente (achadas pela validação independente do MC94.4.1)

1. **Flaky pré-existente**: `src/hooks/__tests__/hooks-torneio.test.mjs:231` («um pedido novo
   limpa o erro do anterior») falha por corrida de `setTimeout` (~1 em N execuções). É
   **byte-idêntico a `f4481d6`** — não é regressão de nenhum MC recente. **Vale corrigir:**
   um flaky a viver num ficheiro de *guarda* mascara regressões reais (obriga a re-medir
   tudo, e a segunda medição pode esconder as que existem).
2. **`@nomicfoundation/edr` está FORA do `package-lock.json`** ⇒ os **6 skips** das suítes
   backend dependem de instalação manual/prévia. Num CI limpo, esses testes saltam — o CI
   «funciona por acidente». Documentar/achar o lock antes de confiar no verde do CI.

3. **Nunca `rm -rf` num directório com junctions.** Um worktree com `node_modules` por
   junction: `rm -rf` **segue o link e apaga o alvo** (o `node_modules` do repo principal,
   >20 000 ficheiros). Medir `st_file_attributes & REPARSE_POINT` antes; remover o link com
   `os.rmdir` / `RemoveDirectory` (que apaga **só** o link) e verificar a contagem do alvo
   antes e depois. `git worktree remove --force` falha com `Filename too long` nestes casos.

### Regra que sai daqui

> **Quando um comportamento é escolhido por um CAMPO DE DADOS, procure-se o campo antes de
> se procurar o bug.** E ao corrigir, verifique-se **todos** os lados que o consultam — no
> DesafioGUT, `tipo` decide o débito no backend **e** o formulário no frontend.

> **Ao medir, pergunte-se se a ferramenta consegue ver o que se procura.** O `grep` falha em
> silêncio em ficheiros «binários»: uma varredura que devolve zero resultados pode estar a
> dizer «não há» quando devia dizer «não consigo ler».

---

## MC94.4 — Inspecção geral e faxina (2026-09-25)

**Data:** 2026-09-25 · **Origem:** inspecção antes da sequência operacional ·
**Recorrência:** única (MC de casa-a-limpo) · **Impacto:** ALTO (achado P2 pode bloquear a Play Store)
**Fecho:** commit `3e39de0` · **Zero alteração a código de produção.**

### ⛔⛔ FALSO POSITIVO RETIRADO — NÃO HÁ PROBLEMA DE ASSINATURA

**Um achado meu (declarado "crítico") foi REFUTADO pelo Validador independente e retirado.**
Fica registado em vez de apagado, porque o erro é instrutivo.

**O que afirmei:** o `keystore.properties` não existiria, e o release assinaria com a chave de
debug. **FALSO.** O ficheiro existe:

```
desafio-gut/frontend/android/keystore.properties   (171 B, jul 19)
```

e `build.gradle:4` (`rootProject.file("keystore.properties")`) resolve para **`android/`** —
porque é aí que está o `settings.gradle`, logo é o *root project* do Gradle. O ternário da
linha 38 escolhe `signingConfigs.release`. **O release é assinado com a chave verdadeira.**

**Causa do erro (reutilizável):** a minha busca era `find . -maxdepth 3 -name "*keystore*"`,
e o ficheiro está à **profundidade 4**. Reportei uma AUSÊNCIA a partir de uma busca que não a
podia ver.

> **REGRA: uma afirmação de ausência («não existe», «nenhum») exige uma busca cuja
> profundidade/alcance cubra PROVADAMENTE o espaço. Com um limite, a afirmação correcta é
> «não encontrei dentro do limite X» — uma frase sobre a busca, não sobre o mundo.**

Corolário: **antes de propor uma correcção, localizar o artefacto real** (aqui:
`find` sem limite + `grep` do nome do ficheiro em TODO o repo, não só na raiz). E: um
veredito de terceiros apanha o que a auto-verificação não apanha, porque um agente verifica o
que julga saber.

### ⛔ P1 — Chave Alchemy em 11 ficheiros rastreados (ABERTO)

Uma chave Alchemy (21 chars) está replicada em **11 ficheiros rastreados**, incluindo
`frontend/src/utils/web3.js` — que é **empacotada pelo Vite e vai no bundle público**, e fica
no histórico do git para sempre. Os 3 `hardhat.config.*` estão **limpos** (usam
`process.env`) — o briefing apontava o ficheiro errado. `.env.example` tem um placeholder.
Retirar o hardcode exige variáveis de ambiente no Netlify (**não autorizado sem o operador**);
a rotação é do operador (R5).

### Método de auditoria de segredos (reutilizável)

1. Varrer por **classe**, não por padrão solto: PEM, `Bearer`, `sk-`, depois `0x`+64hex.
2. `0x`+64hex **classificar por CONTEXTO** — pode ser `SECP256K1_N` (constante pública),
   chave de teste documentada, ou **tx hash** (dado público). Encontrar ≠ expor.
3. Para saber se dois locais têm o **mesmo** segredo sem o ler: **SHA-256 truncado**.
   (Foi assim que se provou «mesma chave em 11 ficheiros, placeholder no `.env.example`».)
4. Nunca imprimir o valor: `grep -l` (só nomes), `cut -d: -f1` (só linhas), hash para comparar.

### Cofre de chaves

`DESAFIOGUT/secrets/` existe, ignorada pelo git (`secrets/*` + `!secrets/README.md`).
`secrets/README.md` é o **mapa** (ficheiro | propósito pelos NOMES das variáveis | origem)
— **nunca** valores. Foi movida para lá a única chave do DesafioGUT que estava solta
(`~/.mc33-staging.env`, com `SUPABASE_SERVICE_ROLE_KEY`). As que **não** foram movidas, e
porquê, estão tabeladas no README.

> **Regra:** o keystore (`DESAFIOGUT/keystore/`) **não se move** — o `storeFile` do
> `keystore.properties` aponta para lá. Já está no repo e gitignorado.

### `.gitattributes` (resolve a fragilidade CRLF)

Normaliza LF para `*.mjs/*.js/*.cjs/*.sh/*.py/*.json/*.yml` e mantém CRLF em `*.bat/*.ps1`.
Motivo: no MC94.3.1 o validador independente viu **1 falha falsa** por CRLF de um worktree novo
(o mesmo ficheiro passava 25/25 no repo principal).
⚠️ Ao adicionar/alterar `.gitattributes`, **medir sempre** `git status --porcelain | wc -l`:
a re-normalização em massa é o risco real dessa mudança (aqui não aconteceu: 7 entradas).

### `docs/`

`docs/README.md` é índice de **256 ficheiros**, gerado do conteúdo real. O `docs/` é
**arquivo**: a maioria dos ficheiros é de maio–julho e descreve estados que já não existem.
**A fonte da verdade é o código + este `CLAUDE.md`.** Verificar a data antes de confiar.

### Lições

1. **Antes de mover um ficheiro, perguntar quem o referencia.** Foi esse reflexo (ver quem usava
   o keystore) que revelou o achado P2 — que nenhum briefing mencionava.
2. **A R5 não impede a auditoria; obriga-a a ser melhor.** O hash truncado respondeu a
   «é a mesma chave nos 11 ficheiros?» sem o valor entrar no contexto.
3. **Uma regra cumpre-se quando custa.** P2 estava a um `cat` de distância e não foi feito.
4. **Não inflacionar.** O SEG3 pedia «centralizar todas as chaves»; mover **uma** e justificar
   as outras é o resultado honesto.


---

## MC94.3.2 — ADENDO — O retorno do OAuth não tinha rota (bug de login) (2026-09-25)

**Data:** 2026-09-25 · **Origem:** evidência reproduzida pelo operador · **Recorrência:**
ALTA (qualquer OAuth que volte a um caminho sem rota) · **Impacto:** ALTO (impede entrar na conta).

### ⛔ O defeito

`/redirect` é o `customOAuthRedirectUrl` do Privy. **Não tinha `<Route>` nenhum** em
`App.jsx` (nem catch-all): existia apenas para o deep link **nativo** (Capacitor), e em web
esse efeito é **no-op** (`if (!window.Capacitor) return`). O privy CONCLUÍA o login
(`[GUT] login completo`, `temAddress:true`, `temAuthToken:true` — medido na consola) e o
utilizador ficava numa **página vazia**, sem entrar na conta.

### ⛔ E a hipótese inicial estava errada — o que se mediu

O adendo apontava para a function `cotas.mjs` ausente/com 404. **Medido:**

- `cotas.mjs` existe, não foi tocada pelo MC94.3.1/94.3.2, e aparece empacotada no deploy;
- `GET /.netlify/functions/cotas` → **200** com dados reais;
- os 404 vistos são a resposta **certa** da própria function para um utilizador **sem cota
  atribuída** (`jsonError(404,"email_nao_encontrado")` :291, `"cota_nao_encontrada"` :316/579).

⇒ Os 404 são **ruído**, não causa. E `temCodigo` não é do login — é do
`ReferralRegistrar.jsx:51` (código de *referral*), outro assunto.

> **Lição:** a evidência já continha a resposta — `temAddress:true` + `temAuthToken:true`
> dizem que **o login funcionou**. Se o login funcionou, o defeito só pode estar DEPOIS dele.
> Ler a evidência até ao fim antes de ir atrás da hipótese mais chamativa.

### Correção

Rota **standalone** `/redirect` (fora do `<Route element={<AppLayout/>}>` — dentro, os gates
de cota/LGPD podiam bloquear a própria página que existe para completar a entrada) +
`EntradaOAuth`: com `ready && isConnected` → `navigate('/', {replace:true})`; sem sessão →
estado de entrada e, ao fim de **6 s**, saída **manual** em `<a href="/">` (carregamento novo,
que é onde o SDK restaura a sessão). Decisão em `src/lib/retornoOAuth.js`, pura e testável.

### O teste que faltava

`src/lib/retornoOAuth.test.mjs` — dois testes **leem a fonte**: o `App.jsx` tem de declarar
`<Route path="/redirect">`, e as duas pontas têm de coincidir (`ROTA_RETORNO_OAUTH` ↔ o path
do `customOAuthRedirectUrl` do `PrivyRoot`). **Este defeito viveu meses** e nenhum teste de
componente o podia apanhar (o `App.jsx` não é renderizável em teste — precisa do Privy).

### ⚠️ REGRA DE MÉTODO — um FAIL é um pedido de segunda medição

Neste par de MCs (94.3.1 + 94.3.2) uma asserção **minha** acusou um defeito inexistente
**quatro vezes**:

| acusou | era |
|---|---|
| "buraco de cobertura" no caminho `202` | `grep` a ler o ficheiro errado |
| mutante do CSS "sobreviveu" | a mutação não aplicou (CRLF) → **verde falso** |
| `COR.bg` ainda usado | o check apanhava o meu comentário **e** `COR.bgSoft` |
| "introduzi um `console.log`" / "a rota ficou no AppLayout" | o `console.log` já existia no HEAD; o caminho MSYS `/c/...` que o python do Windows lê como `C:\c\...` |

**Em todos, o código estava certo e a asserção errada.** Portanto:
1. **Nunca reportar um FAIL sem o re-medir** — o primeiro suspeito é a asserção.
2. **Confirmar que o mutante ENTROU** (contar substituições) antes de ler o resultado. Um
   mutante que não aplica dá um **verde falso**, que é pior que um vermelho.
3. **Não misturar dialectos de caminho** (MSYS `/c/...` vs Windows `C:/...`) em scripts que
   correm sob python no Windows.
4. Num teste que compara, **preferir asserção de IGUALDADE entre dois valores medidos** a um
   literal — foi assim que o teste da dimensão da especial passou a travar a divergência.

### Lição de design

Quando uma superfície tem de ser igual a outra, faça-se a igualdade **estrutural** (uma
constante partilhada), não uma coincidência entre dois literais. E quando um caminho é um
ponto de retorno externo (OAuth, pagamento, deep link), ele **tem de ter rota** — e um teste
que LÊ a fonte a exigir que ela exista.


---

## MC94.3.2 — Correções pontuais pós-MC94.3.1 (2026-09-25)

**Data:** 2026-09-25 · **Origem:** MC94.3.2 (4 problemas reportados pelo operador) ·
**Recorrência:** ALTA (a regra do vidro e a lição do tamanho servem todo o design system) ·
**Impacto:** MÉDIO-ALTO (superfície pública + uma sessão que não nascia).
**Logs:** `_logs/MC94.3.2_SEG*` · **Relatório:** `_logs/MC94.3.2-RELATORIO.md`

### 1. Dimensão: um valor só, não literais espalhados

A especial estava a **96 px** e o padrão medido é **52 px** (`EdicaoBanner` default e
`size` da R-1). Passou a existir `TAMANHO_BANNER_PADRAO` em `EdicaoBanner.jsx`, usada
pela R-1 **e** pela especial. "Igual ao padrão" deixou de ser coincidência entre dois
literais e passou a ser estrutural — não podem divergir outra vez. O teste exige
**igualdade**, não um número.

> Lição: quando duas superfícies têm de ser iguais, igualdade tem de ser uma
> consequência do código, não uma promessa. Três comentários diziam "96 px" e ficaram a
> mentir — um comentário falso é uma armadilha para o próximo agente.

### 2. Texto das senhas

`edicao.especial.regra` passou a "Rodada programada · vence o menor lance único · cada
lance usa 1 senha (R$ 2,00)" (pt/en/es). Suportado por duas fontes do próprio código:
Art. 20 do regulamento e a cópia do `CardLance` ("Lance programado consome 1 senha
(Art. 20: R$ 2,00)"). Se a intenção era o oposto (lance gratuito na especial), é uma
linha por idioma.

### 3. ⛔ A regra de hover que ficou obsoleta (bug do "Total de Lances" transparente)

**Causa raiz com história** — e é o achado de método deste MC:

| commit | o que fez |
|---|---|
| `07c4d88` (MC25.3) | criou `.gut-glass-standard` com base **0.25** e hover **0.35** (hover MAIS opaco → "lift") |
| `936b724` (MC82.1) | subiu a base para **0.88** (vidro sólido) e **não tocou no hover** |

Desde o MC82.1 o hover **inverteu o sentido**: passou a tornar a superfície ~2,5× **mais
transparente**. Num ecrã táctil o `:hover` fica *colado* depois de um toque → ao rolar, o
KPI aparece transparente. Correção em duas partes: o hover eleva em vez de esvaziar, e
passa a existir **só** dentro de `@media (hover: hover) and (pointer: fine)` — num ecrã
táctil não há hover, e não aplicar a regra elimina o *estado colado*, que é a causa.

> Lição: **ao subir a opacidade de uma base, procurem-se as regras que a comparavam com
> ela.** Um `-S` no git acha-as em segundos. O MC82.1 mudou a base e deixou o par dela
> para trás; o defeito só apareceu no aparelho, meses depois.

### 4. Navy glass onde havia vidro de segunda linguagem

`SejaNossoParceiro.jsx` tinha **zero** `gut-glass-standard` e usava
`COR.bg = rgba(13,18,53,0.25)` — a opacidade **antiga** do vidro — mais
`backdrop-filter: blur(16px)`, exactamente a combinação que o MC82.1 mediu como custo
dominante de render. As 3 secções passam a `.gut-glass-standard` (fonte única) e o
separador inactivo deixa de ser `variant="ghost"` (que o `Button.jsx` documenta como
*transparente*) para `variant="secondary"`. Bónus medido: sai o `backdrop-filter`.

### 5. Sessão que não nascia (bug de login) — parcialmente reproduzido

**Beco #1, provado e corrigido:** `obterAuthToken` era tentado **uma só vez** e o efeito
não voltava a correr numa falha (as dependências não mudavam). Uma falha transitória do
`/auth-user` (rede, 429, 500, CORS, cold start) deixava o utilizador **autenticado no
Privy e sem sessão, para sempre**. A política passou a `src/lib/retryAuth.js` (pura,
testável): 4 tentativas, recuo exponencial com tecto, aviso ao desistir.

**Beco #2, provado e NÃO alterado:** `AppContext` recusa abrir o modal com
`authenticated && !address` à espera de uma auto-criação de carteira que está
**desligada** (`createOnLogin: "off"` em `PrivyRoot.jsx`).

⛔ **O HARD GATE 9 (reproduzir primeiro) ficou PARCIALMENTE satisfeito** e diz-se assim:
completar um login exige credenciais de conta real (R5) e concluir o OAuth Google é acção
do operador. Mediu-se a **lógica**, não o fluxo vivo. Não se tocou no
`PrivyEventsBridge` — o próprio ficheiro avisa que o histórico de crashes do arranque do
Privy torna arriscado "melhorar" ali sem reprodução.

### Lições de método (recorrência ALTA)

- **Um mutante que não aplica dá um verde falso.** Na 1.ª tentativa da mutação do CSS a
  âncora falhou por CRLF: a substituição não aconteceu e o teste ficou **verde**. Verde
  que não provava nada. Detetei-o pelo próprio resultado e refiz a mutação. Confirmar
  sempre que o mutante ENTROU (contar as substituições) antes de ler o resultado.
- **Um teste pode apanhar código errado — e isso é o sistema a funcionar.** O teste do
  recuo mostrou que o tecto de 30 s era código morto (o expoente limitado a 5 dava no
  máximo 25 600 ms). Estava certo o teste, não o código.
- **Declarar o âmbito de um teste.** Os testes de `retryAuth` provam a **regra**, não o
  efeito de React (o `AppContext` não é testável por unidade: os testes do Dashboard
  substituem-no por um duplo). Dizê-lo é mais honesto do que apresentar aritmética de
  recuo como prova de ponta a ponta.
- **Testar CSS na folha, não no render.** O SSR não aplica a folha, logo nenhum teste de
  componente apanharia o defeito do hover. O invariante testa-se lendo `globals.css` —
  como o teste i18n lê os dicionários.

## MC94 — O torneio dentro de "Meus Ativos" (2026-09-25)

**Entregue:** 5 secções + 2 hooks + 2 arneses de teste, tudo **numa só tela**.
Zero rotas novas, zero páginas novas, navegação intacta.
****137 testes · 137 verdes · 0 saltados** · mutação **63/64** (1 equivalente, removido do código)** · build verde · `eslint` sem erros.
**Logs:** `_logs/MC94_*` · **Spec:** `docs/TORNEIO-HABILIDADE.md` §4f ·
**Relatório:** `_logs/MC94-RELATORIO.md`
⚠️ **DUAS validações independentes, ambas REPROVADO.** Os números e afirmações
válidos são os desta entrada.

### ⛔ Um ecrã que afirma factos sobre quem não identificou

Visível em **produção**, na captura de `e3d8791`: um utilizador **anónimo** lia
`0 / 5 acertos seguidos · Faltam 5 acertos` e `Nenhum bónus conquistado neste
ciclo`, enquanto o painel ao lado dizia correctamente "Entre na sua conta". Uma
falha de rede dava exactamente o mesmo texto.

**Causa:** escrevi os quatro estados (sem sessão · erro · a carregar · dados) no
`PainelTorneio` e **não os levei às outras duas secções**. Um zero inventado é pior
do que um aviso, porque o utilizador acredita nele.

**Regra:** toda a secção que mostra dados de uma pessoa tem de saber dizer *"não sei
quem és"*, *"não consegui ler"* e *"estou a ler"* — não só *"aqui está"*. O estado
marca-se no markup (`data-estado`), para a página poder provar que ele lá chega.

### ⛔ `Number(null) === 0` chegou ao ecrã (a armadilha do MC93-A, repetida por mim)

Um lance com `valor: null` aparecia como **`R$ 0,00 · menor único seu · vale 3
pontos`** — e há caminho real: `_lib/data-store-supabase.mjs` grava
`valor_centavos = null` **de propósito**. Do outro lado, `senhasACreditar: Infinity`
renderizava **"Infinity senhas"** (`Number(x) || 0` deixa passar).
`_estilo.js` tem agora `valorUtilizavel` / `reais` / `inteiroSeguro`, **sem coerção**.

### ⛔ O `index.html` com status 200 passava por resposta válida

`netlify.toml:34` reescreve `/*` → `/index.html` com **200**; o `apiGet` devolve
`{ok:true, data:null}` e os dois hooks mostravam "ainda não há pontuações" **com o
backend em baixo**. A regra já estava registada no MC93-F (validar o **corpo**, não
o código HTTP) — faltava aplicá-la aqui. Hoje: `!ok || !corpoEhJson(data)` → erro.

### ⚠️ Duas secções a contradizerem-se na mesma página

`ProgressoBonus` declarava "Bónus conquistado!" a partir de uma conta **local**
(`faltam === 0`) enquanto `EstadoBonus`, a ler `bonusEmitido` do livro-razão, dizia
"Nenhum bónus conquistado neste ciclo". Só o backend o pode afirmar — a concessão
tem o cadeado de três condições do MC93-C e custa senhas reais.

### ⚠️ Aplicar a correcção a metade dos sítios

`totalReal` (reconciliar `total` com o tamanho da lista) foi aplicado só ao ramo
"a mostrar os N primeiros de M". O ramo `else` — **o caso comum**, menos de 10
participantes — continuava a escrever `total` cru: **"0 participantes."** por baixo
de 4 linhas. Mesmo padrão do `if: always()` do MC93-E.

### Como se testa React neste projeto (não há runner, e não se instala um)

Medido: `jsdom` · `linkedom` · `happy-dom` · `react-test-renderer` ·
`@testing-library/react` → **todos ausentes**. E instalar um cai no ciclo do MC93-G
(`npm install --legacy-peer-deps` reverte o lockfile em silêncio).

| instrumento | o que faz | limite |
|---|---|---|
| `_render.mjs` | `vite` transpila o JSX + `react-dom/server` renderiza | `useEffect` **não corre** |
| `_hook-runner.mjs` | despachante próprio em `ReactCurrentDispatcher`; o hook corre a sério | a comparação de **deps** é minha, não do React |

> ⚠️ Por isso a suíte de hooks abre com **quatro controlos positivos** (deps `[]`,
> deps certas, efeito sem limpeza, `AbortSignal` honrado). Se um passar, o
> instrumento é cego. *Sonda precisa de controlo positivo.*

> ⚠️ **O duplo é de `fetch`, nunca de `apiGet`.** Deixar o `apiGet` real correr foi
> o que expôs o defeito do `index.html` com 200. Um duplo de `apiGet` tê-lo-ia
> escondido — a 4.ª vez que este projeto encontra a mesma família de defeito.

### ⚠️ Um duplo que ignora os argumentos torna a CABLAGEM invisível

O duplo dos hooks devolvia os dados combinados aconteça o que acontecesse. Uma
página que se esquecesse de ligar `address` ou `authToken` passava **todos** os
testes: o componente correcto, ligado a `undefined`, renderiza "sem dados" e fica
verde. Hoje o duplo **regista os argumentos**, e há testes que exigem que `erro`,
`carregando`, `semSessao` e `address` cheguem a cada secção.

### ⛔ ERRATA minha: a "colisão" entre servidores Vite em paralelo não existe

`_render.mjs` afirmava `# fail 2` por colisão. **Falso** — 91/91 verdes, 3 corridas
de 3, sem `--test-concurrency=1`. A causa real do `# fail 2` era a heap estourada
pelo `BotaoLoginPrincipal` (2,68 MB de Privy) sem duplo. Diagnosticado de **uma**
observação, como no MC93-E com a cache do ethers.

### ⛔ E repeti a lição do MC93-C sobre validações em paralelo

Lancei uma segunda ronda de mutação julgando a primeira morta — a saída estava
vazia por **tamponamento do Python**, não por fim de processo. As duas mutaram a
mesma árvore e o controlo negativo falhou com um mutante da outra aplicado.
**`wc -c` a zero não significa processo morto.** Confirmar com a lista de processos.

### ⛔ A 2.ª ronda: a mesma lição, nos sítios onde ela não tinha sido aplicada

| | defeito |
|---|---|
| ⛔ | `FeedbackLance` sem estado de sessão: dizia a um **anónimo** "Ainda não há lances seus", ao lado de três secções a convidar a entrar. **Estava na captura que eu tirei e olhei.** |
| ⛔ | A **janela do `authToken`** (~2 s): a página mandava entrar quem já tinha entrado **e** mostrava-lhe os lances dele ao mesmo tempo |
| ⛔ | "Sequência completa" era **código morto**: o backend nunca manda `faltam: 0` (domínio [1..5]), logo quem fechava 5 acertos lia "0 / 5 · Faltam 5 acertos" |
| ⚠️ | `inteiroSeguro` em 2 de 3 sítios; o 5.º estado em 1 de 2; `valorUtilizavel` mais frouxo que `inteiroSeguro` |
| ⚠️ | o condutor de hooks **engolia** escritas pós-desmonte → duas asserções minhas eram vácuas |
| ⚠️ | dicionário ≠ fallback, chave órfã com a frase proibida, e copy em **pt-PT** num app **pt-BR** |

**Regra nova:** "sem sessão" e "sessão sem token ainda" são estados **diferentes**.
Quem sabe se há sessão é o contexto (`isConnected` + `address`), não o hook que
precisa do token. A espera pelo token é **estar a carregar**.

**Regra nova:** o dicionário `pt` gera-se **a partir dos fallbacks**, e há uma
guarda (`src/i18n/__tests__/ativos-i18n.test.mjs`) que exige que continuem iguais —
porque os testes renderizam com o fallback, logo uma divergência faz a suíte medir
um texto e o utilizador ler outro.

⚠️ **Os testes do frontend NÃO são um portão de CI.** O `ci.yml` só corre os testes
das functions. "137 verdes" é medição, não protecção contínua.

### Não entregue, e porquê

`EvolucaoPontos`: medido via MCP — `pontuacoes` tem **0 linhas** e **0 ciclos
distintos** em produção. Não há série temporal para desenhar.

### Achado registado para o MC97 (copy)

A tela existente mostra **`R$ 1.00`** (`.toFixed(2)` sem troca de separador); as
secções novas mostram `R$ 1,00`. **Não corrigido** — HARD GATE 5 proíbe alterar o
existente neste MC.

### Pendências herdadas (nenhuma nasce aqui)

`.gitattributes`/CRLF · um modo de instalação só · `if: always()` no guarda da EVM ·
chave Alchemy por rotacionar (operador, R5) · versão do Foundry por fixar.

---

## MC94.1 — Dados da edição especial Air Fryer (2026-09-25)

**Data:** 2026-09-25 · **Origem:** MC94.1, medição por execução · **Recorrência:**
MÉDIA (próximas edições especiais usam o mesmo caminho) · **Impacto:** ALTO (edição especial
com prémio físico e hora anunciada).
**SEG-1: AJUSTAR** · **R19 exercida** · **Validador: APROVADO COM RESSALVAS**
**Logs:** `_logs/MC94.1_*` · **Relatório:** `_logs/MC94.1-RELATORIO.md` · **Spec:** `docs/TORNEIO-HABILIDADE.md` §4g

### O que existe agora

Blob `edicoes-metadata`, chave **`ESPECIAL-AIRFRYER`**: Air Fryer, `inicio_em
2026-10-04T23:00:00.000Z` (20:00 Brasília), `termino_em 2026-10-04T23:30:00.000Z`,
`tipo programado` (lance = 1 senha), `imagem_url /artes/edicao-especial-airfryer.jpg`.
Seed idempotente: `node scripts/mc941-seed-edicao-especial.mjs [--print|--force]`
(pelo login do CLI; nenhum token manuseado).

### ⛔ Premissas do enunciado que eram falsas

| enunciado | realidade medida |
|---|---|
| edição em Supabase ou mappings | vive em **Blobs** (`edicoes-metadata`); Supabase não tem tabela de edições |
| gravar `ESPECIAL-AIRFRYER` basta | o regex `^(PROG\|RELAMP)-\d+$` **descartava-a em silêncio** (listar, buscar, encerrar) |
| `/ranking` vazio antes da hora = gate | `/ranking` devolve `[]` para **qualquer** ciclo até à consolidação — é vacuidade, não gate |
| "a partir das 20:00 aparece no ranking" | aparece no **`/edicoes`**; no ranking só depois de `consolidar-lances` |
| `imagem_path` | o frontend já lê **`imagem_url`** (`useEdicoes.js:81`, MC45) |
| "Tipo: menor lance único" | `tipo` é o **meio de pagamento** (senha vs R$); a regra é a mesma para todas |

### ⛔ O servidor aceitava lances a qualquer hora, em qualquer edição

`lance-relampago.mjs` não verificava início, fim nem estado; o contrato também não.
Agora (`_lib/edicao-janela.mjs`, passo 5.6, decisão D2 do operador): **409** antes de
`inicio_em`, depois de `termino_em`, ou com `status` encerrado/apurado; **503
fail-closed** para `ESPECIAL-*` sem metadata (antes cairia em "relâmpago" e cobraria R$).

### Regra: estado derivado do relógio do servidor, não gravado

Uma edição com `inicio_em` no futuro sai de `edicoes` e vai para **`agendadas`**
(`GET /edicoes`), que o frontend actual não lê → invisível no ecrã sem tocar em `.jsx`.
Às 23:00Z passa sozinha. `GET /edicoes` devolve também **`agora`** (servidor) para o
cronómetro do MC94.3. Gravar "agendada" exigiria um cron — e um cron que falhe
fecha a edição no dia.

### ⚠️ Lição de método: teste com data fixa caduca

Dois testes meus comparavam com `Date.now()` real e a data do evento: ficariam
**vermelhos para sempre a partir de 04/10**. Apanhado pelo Validador (17/19 com o
relógio a 05/10). Regra: se o código lê o relógio real, o teste usa datas
**relativas**; datas literais só com o relógio injectado. Verificar correndo a
suíte com `Date.now` deslocado para depois da data.

### ⛔ Por decidir pelo operador ANTES de 04/10

1. A arte diz **"PERÍODO: 20/setembro a 04/outubro"** — contradiz 20:00–20:30.
2. `consolidar-lances` **pontua a especial no torneio** (sequências e bónus de 20 senhas).
3. A especial já é **pública pela API** (`agendadas`), embora não no ecrã.
4. Encerramento às 20:30 é **manual** (`POST /edicoes?acao=encerrar&id=ESPECIAL-AIRFRYER`).

### Decisões do operador (R18, 2026-09-25)

Data-alvo e fim (enunciado) · **D1** `tipo = programado` (1 senha por lance) ·
**D2** guarda de janela em `lance-relampago.mjs` autorizada neste MC.

---

## MC94.2 — Edição especial Air Fryer no Dashboard (2026-09-25)

**Data:** 2026-09-25 · **Origem:** MC94.2 · **Recorrência:** MÉDIA (próximas especiais
reutilizam o card) · **Impacto:** ALTO (UI pública + edição especial com prémio físico).
**SEG-1: SEGUIR** (R19: AppContext +2 linhas) · **Validador: APROVADO COM RESSALVAS**
**Logs:** `_logs/MC94.2_*` · **Relatório:** `_logs/MC94.2-RELATORIO.md` · **Spec:** §4h
**Capturas:** `_logs/MC94.2_captura-producao-{card,pagina}-{desktop,mobile}.png`

### O que existe

`src/components/edicao-especial/` — card com 4 estados (agendada · a_abrir · activa ·
encerrada), contagem na **hora do servidor** (`offset = agora − (t0+t1)/2`, por fetch),
painel do vencedor (on-chain `resultados(id)` + `lances-flash`). `consolidar-lances`
**não pontua** `ESPECIAL-*` (`pontua:false`).

### ⛔ "Dar lance" NÃO pode ir para o /mercado

O `/mercado` monta o `CardLance` com `EDICAO_ATIVA = "R-1"` **fixo** — um link levaria
o lance para a edição errada. O card monta o `CardLance` com o id da especial e
`tipoLeilao="programado"`, em `lazy` (o /mercado já é lazy; eager poria o form no
chunk do primeiro ecrã). Sem `handleLanceSucesso` (acrescentaria à tabela da R-1).

### ⚠️ Excepção declarada à fonte única do MC88.43

Com `EM_BREVE_MODE = true`, `getEstadoEdicao` diz "em breve" a tudo; a especial usa
`estadoEspecial()` própria. A R-1 ao lado continua "EM BREVE" — é o pedido.

### ⛔ Por decidir pelo operador

1. ~~**`POST /pontuacao` repontua a especial**~~ — ✅ **RESOLVIDO no MC94.3** (2026-09-25).
   A guarda passou para `registrarPontuacaoRodada` (`_lib/pontuacao-store.mjs`), o ponto
   único por onde passam os DOIS caminhos (`consolidar-lances` e `POST /pontuacao`).
   Ver a secção do MC94.3 abaixo.
2. A arte ("20/set a 04/out") agora é **pública** ao lado de "20:00–20:30".
3. Especial sem lance único → consolidar-lances dá 422 e o painel fica em
   "apuração em curso" para sempre.

### Lições de método (recorrência ALTA)

- **Um teste com ramo "ou isto ou aquilo" pode nunca executar a asserção que importa.**
  O teste do formulário aceitava "duplo OU fallback do Suspense" e, medido, corria
  SEMPRE o fallback. Correcção: re-renderizar depois de o `lazy` resolver e exigir.
- **Duplo de contexto com forma diferente do real parte em sítios longe do teste**
  (`useAppTimer` devolvia chaves que o real não tem → EdicaoCard partia).
- **Captura de ecrã depois de mexer no relógio mostra o offset velho** (≤ 60 s):
  recapturar num documento novo antes de concluir.
- **Um processo de mutação morto a meio deixa o mutante no disco.** Verificar os alvos
  com grep e `git diff --stat` antes de qualquer outra coisa.
- **Gate LGPD:** uma sessão de browser nova vê o regulamento, não o Dashboard —
  capturas automáticas têm de aceitar as 4 caixas + "Aceito o DesafioGUT".

### Decisões do operador (R18, 2026-09-25)
D1 arte mantém-se · D2 especial não pontua · D3 cronómetro usa `agendadas` ·
D4 encerrada = "Edição encerrada" + vencedor + métricas · D5 hora do servidor.

---

## MC94.3 / MC94.3.1 — Cronómetro, auto-fecho da especial e a guarda central (2026-09-25)

**Data:** 2026-09-25 · **Origem:** MC94.3 (backend, agente anterior) + MC94.3.1 (validação,
mutação, frontend e deploy, HERMES) · **Recorrência:** ALTA (a guarda e o cron servem
todas as especiais futuras) · **Impacto:** ALTO (impede que uma edição especial de teste entre no
ranking do torneio; move dinheiro on-chain sem clique humano).
**SEG-1: SEGUIR com escopo ajustado** · **Validador: ver `_logs/MC94.3.1_SEG6_*`**
**Logs:** `_logs/MC94.3.1_SEG*` · **Relatório:** `_logs/MC94.3.1-RELATORIO.md`
**Commit:** `47cdc65` (+ commit de fecho) · **Deploy:** `netlify deploy --prod --build`

### O que existe (backend)

1. **Guarda central — `_lib/pontuacao-store.mjs`.** `registrarPontuacaoRodada(cicloId, lances)`
   devolve `{ cicloId, pontua:false, participantes:0, bonusRegistados:0 }` **antes de
   qualquer ligação ao Supabase** quando o ciclo casa `^ESPECIAL-[A-Z0-9]+$`. Está aqui e
   não nos chamadores porque o `POST /pontuacao` — o caminho de recuperação que o próprio
   `consolidar-lances` manda usar — não tinha guarda nenhuma (era o defeito do MC94.2).
2. **Núcleo partilhado — `_lib/consolidacao.mjs`.** O que move dinheiro on-chain
   (apuração off-chain, EIP-712 com `edicaoNonce`, envio via Flashbots, recibo, marcação)
   extraído do handler para ter DOIS chamadores sem duas cópias. **Não lê nenhum `Request`**:
   a autorização fica em quem chama. Devolve `{ status, corpo }` / `{ status, erro }`.
3. **Handler fino — `consolidar-lances.mjs`.** Preflight CORS, método, rede, `guardAdmin`,
   corpo. Contratos HTTP preservados: 405/409/400/503/422/502/202/200. Reexporta
   `apurarMenorUnico` (compat de `mc28-seguranca` e `mc33-load`).
4. **Cron — `scheduled-encerrar-especial.mjs`.** `schedule("* * * * *")`; por especial
   vencida (`agora > termino_em`, estritamente maior — a mesma fronteira de
   `edicao-janela.mjs`, que aceita lances no último milissegundo): encerra
   (`encerrarEdicao({origem:"scheduled"})`) e consolida **UMA vez**.

### ⛔ O cron NUNCA reenvia uma transacção (ITEM 4.2)

Um cron que repetisse a cada falha reenviaria 60× por hora. Por isso:

- o marcador (Blob `consolidacao-automatica`) é gravado **ANTES** da consolidação: se o
  Netlify matar a função aos ~30 s, o tick seguinte não repete;
- `202` (pendente), `502` (envio falhou), `200` e excepção são **finais** — o caminho
  automático acaba, o que falte faz-se à mão (`POST /consolidar-lances`);
- só as falhas de **antes do envio** (`409/422/503/400`) se repetem, no máximo
  `MAX_TENTATIVAS_ANTES_DO_ENVIO = 5`;
- `timeoutMinerMs = 20_000` na scheduled (o `90_000` do handler morreria a meio, DEPOIS de
  a transacção ter saído).

### Frontend (MC94.3.1)

- **Retenção de 24 h — `_estilo-especial.js`.** `RETENCAO_APOS_FIM_MS` + `dentroDaRetencao()`;
  `escolherEspecial` passou a filtrar. Sem isto, terminava em `?? lista.at(-1)` e uma
  especial encerrada era devolvida **para sempre** — o Dashboard ficava preso à edição especial
  de 04/10 meses depois. A retenção é sobre o **fim**: antes de abrir também se mostra.
  Sem `termino_em` legível não se mostra (não se inventa janela).

### ✅ A especial preenche o SLOT (adendo do operador, reversão do MC94.2)

O MC94.3.1 parou no HARD GATE 8 porque a "absorção no slot" obrigava a reverter um teste
**commitado** do MC94.2 (`Dashboard.test.mjs:85` exigia a especial como secção própria) e a
decidir, sem as D originais, em que janela a especial substitui a R-1. Parou-se, mediu-se e
documentou-se — e o operador enviou o adendo com a autorização explícita ("esse teste foi um
erro do MC94.2"). Executado no mesmo MC (commit `0448216`):

- `Dashboard.jsx` — o slot "🎯 Edição Ativa" tem DOIS ramos: com especial é ela que o
  preenche; sem especial, o conteúdo da R-1 de sempre. A secção própria do MC94.2 saiu.
- `CardEdicaoEspecial.jsx` — deixou de ser `<section>` e passou a ser o CORPO do slot:
  caixa amarela com o `EdicaoBanner`, GUTO (o mesmo `GutoSpritePlayer`) com o cronómetro ao
  lado, e o formulário/painel por baixo.
- `EdicaoBanner.jsx` — prop `alt` OPCIONAL (aditiva). Evita que a chave
  `edicao.especial.altArte` ficasse órfã nos 3 dicionários: em vez de apagar uma tradução
  útil, o alt passa a dizer o que a imagem mostra.
- **96 px SÓ na especial** (R18); a R-1 fica a 52 px.
- `Dashboard.test.mjs` reescrito ao novo contrato (10 testes): inclui um que verifica que o
  antigo marcador `data-secao` **desapareceu** e outro que exige a especial **uma só vez**
  no ecrã. Mutação: o mutante "a especial não entra no slot" é morto por 7 de 10 testes.

⏳ Continua pendente apenas a **captura por CDP no dispositivo** (`webview-devtools.ps1`),
que exige um Android ligado.

### ⚠️ Achado prioritário para o MC94.4 — id com sufixo minúsculas escapa a TUDO

`EDICAO_ESPECIAL_RE` / `EDICAO_ID_RE` são `^ESPECIAL-[A-Z0-9]+$` (sensível à caixa).
Com um id como `ESPECIAL-airfryer`: a guarda central **não dispara** (a especial pontuaria
o torneio), o cron **nunca** a encerra nem consolida, a retenção de 24 h não se aplica, e
`listarEdicoes` **ignora a chave em silêncio** (`continue`) — a edição desaparece do
dashboard sem aviso. Fail-closed quanto a "não pontua", **fail-silent quanto ao auto-fecho**.
Hoje os ids nascem de `scripts/mc941-seed-edicao-especial.mjs` (constante em maiúsculas),
logo o risco é um id escrito à mão. **Correcção a fazer:** normalizar o id no ponto de
entrada (`.toUpperCase()`) **e** logar em vez de ignorar as chaves inválidas em
`listarEdicoes`, com um teste por efeito. Não se fez no MC94.3.1 porque o regex é
partilhado com a janela de lances e a mudança não era comprovadamente necessária (R1).

### Lições de método (recorrência ALTA)

- **A medição vem do resumo da ferramenta, não de uma linha filtrada.** O log do SEG6
  chegou a dizer "backend fail 0" a partir de um `grep` parcial; o número real era
  `606 pass / 1 fail` (um teste frágil a CRLF, provado não-regressão). Corrigido no mesmo
  log, à vista.
- **O briefing não é a fonte da verdade; o código é.** O MC94.3.1 pedia para subir
  `EdicaoBanner` para 96 px dentro do slot — mas o slot é um teste commitado que diz o
  contrário. Medir primeiro evitou reescrever um requisito sem saber porquê.
- **Contagens de teste do briefing ≠ contagens reais.** "34/34" saía 51 porque o glob
  `mc93b-*.test.mjs` apanha dois ficheiros que a suíte anterior já contava; `mc33-load.test.mjs`
  não existe (é `.mjs`). 0 falhas é o que importa; o número é cosmética.
- **Mutação antes de confiar num teste.** Os 4 mutantes foram mortos por testes nomeados —
  e o mutante do marcador matou exactamente o teste do marcador.
- **Duvidar de si mesmo antes de acusar o código.** Por pouco não se reportou um falso
  "buraco de cobertura" no caminho `202`: o grep inicial tinha lido o ficheiro errado.
  Voltar a medir custa um comando; um falso positivo custa credibilidade.
- **O working tree de outro agente é sagrado.** Nada de stash/reset/checkout; medir,
  validar, continuar.
- **Teste flaky sob paralelismo ≠ regressão.** `hooks-torneio.test.mjs` falha 1 em 28 sob
  carga (`demora: 20 ms` + asserção a `carregando`); isolado passa sempre. Fica registado
  para o MC94.4.

### Decisões do operador (R18, 2026-09-25 — as que fecharam o MC94.3)

E1 **"Encerrar e consolidar"** — a scheduled encerra E consolida (gasta gas da coordenação;
autorizado). · E2 **"Maior só na especial"** — o ícone de presente a ~96 px só na especial
(pendente em MC94.3.2). · E3 **"24 h após o fim"** — a especial fica no slot 24 h depois do
fim (implementado e testado neste MC).

---

## MC98 — DesafioGUT declarado PT-BR only (2026-09-27)

**Data:** 2026-09-27 · **Origem:** MC98, medição por execução · **Recorrência:** BAIXA
(é uma decisão de produto, não um defeito) · **Impacto:** MÉDIO (fecha uma contradição
entre a ficha da loja e o app; simplifica o i18n).
**Base:** commit 56f8305 (MC97 fechado). **Logs:** _logs/MC98_* ·
**Relatório:** _logs/MC98-RELATORIO.md.

### A decisão (operador, R18 — 2026-09-27)

**O DesafioGUT é PT-BR only.** O MC97 mediu que 59 de 62 ficheiros de UI escrevem
português hardcoded e que 35 das 129 chaves de i18n nunca eram usadas pela UI: o app
**dizia** ter 3 idiomas e falava 1. A ficha da Play prometia 3 idiomas; o app entregava
PT — e um revisor que mudasse o selector via a promessa não cumprida.

Não é bloqueante (a Google e a Apple não exigem múltiplos idiomas) e o mercado-alvo é o
Brasil. Declarar um idioma é mais honesto e mais simples do que manter três dicionários
que o produto não lê.

### O que foi medido antes de tocar (e as duas premissas erradas do enunciado)

| premissa do MC98 | medido | veredicto |
|---|---|---|
| «simplificar src/i18n/index.js» | **não existe**; o *entry* é src/context/IdiomaContext.jsx | ❌ falsa |
| «remover o selector de idioma (se existir)» | existe: Configuracoes.jsx:142-164 (<select> pt/en/es) | ✅ |

E **o âmbito do próprio extractor falhou**: o SEG-1 procurou dependências de en.js/es.js
só em src/ e scripts/ e declarou «UM único ficheiro». Havia **dois**: o segundo estava em
netlify/functions/_tests/mc8843-estado-edicao.test.mjs, e só apareceu quando a suíte do
backend ficou vermelha. *Um extractor com âmbito estreito «não encontra» exactamente como
um extractor cego.*

### O que mudou

| # | onde | o que |
|---|---|---|
| 1 | src/i18n/en.js, src/i18n/es.js | **removidos** (276 linhas). O único importador era o IdiomaContext |
| 2 | src/context/IdiomaContext.jsx | DICTS = { pt }, SUPPORTED = ["pt"], **sem navigator.language**, e <html lang> fixado a pt-BR (antes o runtime sobrescrevia o pt-BR do index.html com pt, genérico) |
| 3 | src/pages/Configuracoes.jsx | card **«Preferências» removido**: o seu único conteúdo era o selector de idioma. Um card com título e corpo vazio seria pior |
| 4 | src/i18n/pt.js | 2 chaves mortas (config.idioma, config.preferencias) removidas. 129 → **127** chaves |
| 5 | 4 testes | âmbito 3-idiomas reduzido a PT; 4 asserções que comparavam idiomas **removidas** |
| 6 | src/i18n/__tests__/pt-only.test.mjs | **novo**: 7 guardas da declaração PT-only (endurecidas após a refutação do validador — ver «O validador independente refutou-me em duas coisas») |
| 7 | docs/FICHA-PLAY-PT.md | **novo**; docs/FICHA-PLAY-3-IDIOMAS.md removido (9 → 3 blocos) |
| 8 | docs/GLOSSARIO-OFICIAL.md | só PT: as colunas EN/ES e as listas de proibidos em EN/ES saíram |
| 9 | scripts/mc97-medir-ficha.mjs | reapontado para a ficha PT (3 blocos), passou a exigir que a contagem **declarada** no texto seja igual à **medida**, e a tolerar CRLF |
| 11 | .gitattributes | **`*.md text eol=lf`** — torna a medição reprodutível num worktree limpo (ver «O validador independente refutou-me») |
| 10 | netlify/functions/_tests/mc8843-estado-edicao.test.mjs | 2 entradas i18n/es.js + i18n/en.js removidas da lista de proibidos (os ficheiros deixaram de existir) |

**Nenhuma string de UI em PT foi alterada** — este MC remove, não reescreve.

### ✅ Zero regressão, medido

| | antes | depois |
|---|---|---|
| frontend | 392/392 VERDE | **396/396 VERDE** |
| backend | 680/686 VERDE | **680/686 VERDE** |

A aritmética fecha: 392 − 4 (asserções removidas) + 8 (1 glossário + 7 pt-only) = 396.
O backend esteve **1 falha** a meio do MC — o teste mc8843-estado-edicao.test.mjs, que
também lia i18n/es.js pelo mesmo âmbito estreito do SEG-1. Corrigido no mesmo MC.

### Mutações (R16) — 7 mutantes, todos mortos e todos confirmados a ENTRAR

| mutação | teste que a matou |
|---|---|
| reintroduzir src/i18n/en.js | «a pasta i18n só pode conter pt.js» + «o dicionario PT e o UNICO» |
| reintroduzir o **import** de i18n/en.js | «nenhum ficheiro do produto importa um dicionário en/es removido» |
| **EVASÃO E2** — dicionário como src/i18n/en.mjs + import .mjs | as duas guardas acima (a pasta deixou de filtrar só `.js`) |
| reintroduzir o **selector** (forma original, aspas duplas + «English (US)») | «nenhum selector de idioma na UI do produto» |
| **EVASÃO E1** — selector com aspas SIMPLES + rótulos «English»/«Spanish» | idem (o detector passou a casar as 2 formas de aspas) |
| **EVASÃO E1b** — selector com rótulos «Inglés»/«Español» | idem (3 grafias de rótulo, com fronteiras de palavra) |
| remover o pt.js | 8 testes, incluindo todas as guardas de medição vazia |

**Instrumento (não é mutação):** o medidor da ficha passou a ser exercido com
`docs/FICHA-PLAY-PT.md` em **CRLF** — exit 0 e `3/3 dentro dos limites`, com restauração
byte a byte. Antes da correcção dava exit 2 num ficheiro correcto.

Restauração por **snapshot binário**, com md5 idêntico nos 3 ficheiros e suíte de volta a
VERDE. (A 1.ª versão do restaurador desfazia por .replace() inverso e deixava um \r\n
órfão — md5 diferente. Restaurar não é desfazer: é repor.)

### ⚠️ O validador independente refutou-me em duas coisas (e as duas estão corrigidas)

O validador do SEG3 (worktree próprio, instruído a **TENTAR REFUTAR**) confirmou A1, A2,
A3, A4 e A7 com medição própria — e **refutou parcialmente A5** e encontrou um defeito de
reprodutibilidade em A6. Os dois são reais e foram corrigidos no commit `80b5dbc`:

1. **As minhas guardas eram cegas a duas evasões realistas.** `MUT2` e o detector de
   selector usavam a MESMA forma uma da outra (`value="en"` + «English (US)») — era uma
   mutação **circular**, que media o autor e não o atacante. O validador provou-o com
   `<option value='en'>English</option>` (aspas simples, rótulo sem «(US)») e com um
   dicionário reintroduzido como `src/i18n/en.mjs` + respectivo import: **6/6 VERDE** nas
   duas. Corrigido (aspas duplas OU simples, 3 grafias de rótulo com fronteiras de palavra
   medidas, `src/i18n/` só pode conter `pt.js` seja qual for a extensão) e as duas evasões
   entraram na bateria como `MUT1c`/`MUT2b`/`MUT2c` — todas agora RED.
2. **O medidor da ficha não era reprodutível.** `node scripts/mc97-medir-ficha.mjs` num
   worktree limpo devolvia **exit 2** (`esperava 3 blocos, vi 0`) num ficheiro **correcto**:
   `core.autocrlf=true` + ausência de regra `*.md` no `.gitattributes` faz o
   `git worktree add` entregar CRLF, e a regex assumia LF. Corrigido no script (`\r?\n`) **e**
   na causa-raiz (`.gitattributes` ganhou `*.md text eol=lf`; medido: os `.md` já estavam LF
   no índice, logo não muda conteúdo nenhum).

> **A lição, que é a do MC96.3 outra vez com outro ângulo:** uma guarda tem de ser testada
> contra as variantes que o **atacante** escolheria, não contra a que o **autor** escreveu.
> E a régua também se mede: o validador registou que correr a suíte do backend sem
> `cwd=netlify/functions` **e** `--experimental-test-module-mocks` dá **61 falhas falsas**.

### Lições de método

- **O escape file-vs-value, outra vez — agora ao contrário.** O guarda do MC97 falhava
  porque media o FICHEIRO e o COMENTÁRIO mentia. Aqui o risco era o inverso: o código
  novo **fala** de en.js, es.js e navigator.language nos seus próprios comentários
  explicativos. Um grep cru ao ficheiro dava RED a um ficheiro **correcto** — uma guarda
  que grita no sítio errado. pt-only.test.mjs mede sempre sobre `semComentarios()`.
- **O âmbito do extractor é parte da medição.** «Procurei em src/ e não encontrei» não é
  «não existe». O 2.º importador apareceu no backend. Varredura final com âmbito
  repo-inteiro: **3434 ficheiros**, zero imports reais de i18n/en.js|es.js.
- **Um byte NUL num .md não é corrupção — pode ser o objecto do texto.** Este ficheiro
  tem 4 bytes de controlo crus na linha 1732 porque a secção C4 **ilustra** o defeito que
  descreve. Consequência real, medida: `grep` sem `-a` declara o CLAUDE.md **binário** e
  **salta as linhas** a partir do byte 94011 — as primeiras varreduras deste MC perderam
  CLAUDE.md:1652, :1905, :1968 e :2081 em silêncio. *Ao auditar este ficheiro, use
  `grep -a`, ou não verá metade dele.*
- **`grep` sem fronteira de palavra inventa dependências.** `grep "es\.js"` casa
  Lanc**es.js**x — dezenas de falsos positivos. A medição usa fronteira:
  `(^|[^A-Za-z])es\.js([^A-Za-z]|$)`.

### Pendências (nenhuma nasce deste MC)

- **8 worktrees antigos** em .claude/worktrees/ (validadores dos MC94–MC97) mais 2 fora do
  repo. Não removidos: fora do âmbito do MC98, e um deles pode ser preciso. **A revisitar.**
- As referências **históricas** a i18n/{pt,en,es}.js nas secções dos MC94.x ficam como
  registo do que se fez então (ex.: CLAUDE.md:1652). Não são instruções actuais.
- Herdadas: chave Alchemy por rotacionar (operador, R5) · auto-deploy do Netlify ligado
  (stop_builds: false) · testes do frontend fora do CI.

---

## MC99 — Limpeza de UX/UI + análise dos caminhos clicáveis (2026-09-27)

**Data:** 2026-09-27 · **Origem:** MC99 (MC de PRODUTO, não de infraestrutura) ·
**Recorrência:** MÉDIA (a série de limpezas de ecrã continua) · **Impacto:** MÉDIO
(ruído visual e coerência para o utilizador comum).
**Base:** ce6fbd3 (pós-MC98). **Logs:** _logs/MC99_* · **Relatório:** _logs/MC99-RELATORIO.md ·
**Análise de caminhos:** docs/MC99-CAMINHOS-CLICAVEIS.md.

### O que mudou (só UI/UX — nenhuma lógica de produto)

| # | onde | o que |
|---|---|---|
| 1 | pages/Dashboard.jsx | «Outras Edições»: `grid` empilhado → **scroll LATERAL** (flex + overflowX + scroll-snap, 1 edição visível de cada vez) |
| 2 | widgets/layout/BottomNav.jsx | barra inferior: Início · **Carteira** · **Lances** · Mais (era Início · Lances · Carteira) |
| 3 | pages/MinhaCarteira.jsx | **5 blocos removidos** (glass de cabeçalho, Saldo de Senhas, Dados para Pagamento, Meus Lances, Carteira Conectada); «Minha Carteira» incorporado no cartão de saldo, que perdeu o vidro próprio (gradiente) e usa `.gut-glass-standard`. 479 → ~290 linhas |
| 4 | components/PainelIndicacao.jsx | saiu o rótulo técnico «MC10 · Growth» |
| 5 | pages/MercadoLances.jsx | saiu o **banner do cliente** (2.º vidro) e o código que só o alimentava (`clienteAtivo`, efeito, `buscarClienteDoLeilaoAtivo`, `CATEGORIAS_POR_TIPO`, imports `BannerCard`/`apiGet`) |
| 6 | pages/SejaNossoParceiro.jsx | os **dois** heroes ganharam `.gut-glass-standard` (estavam soltos sobre a ilustração — defeito classe MC89.4) |
| 7 | pages/Vitrine.jsx | saiu o rodapé TÉCNICO («Pipeline de lance em /mercado (Edição R-1, validada em produção)») |

### ✅ HARD GATE 4 — nenhuma informação se perdeu (medido, um a um)

Antes de remover os 5 blocos da Carteira, verificou-se onde cada informação vive agora:
saldo de senhas → **Sidebar** (indicador 🔗, em todos os ecrãs) + KPI do Dashboard;
endereço → **Sidebar** (truncado) + Configurações (completo); lances do utilizador →
**/ativos** (que os classifica, melhor que a lista removida); custo da senha → botão de troca
+ Configurações «Art. 20»; dados bancários do Art. 21 → **regulamento**. Zero informação órfã.

### ✅ Zero regressão, medido

| | antes | depois |
|---|---|---|
| frontend | 396/396 VERDE | **407/407 VERDE** |
| backend | 680/686 VERDE | **680/686 VERDE** |
| ESLint (tocados) | — | 0 erros; 9 warnings **pré-existentes** (confirmadas no base) |

**8 mutações, 8 provadas** (`scripts/mc99-prova-mutacao.mjs`), restauração por snapshot
binário com md5 idêntico. `_logs/MC99_PROVA-MUTACAO.txt`.

### Lições de método (a que mais vale)

- **Um guarda que verifica «o primeiro» quando existem DOIS é meio guarda.** O hero de
  SejaNossoParceiro tem dois ramos de render (normal + «cadastro indisponível»). A minha
  1.ª correcção glazou um só, e foi o meu próprio teste — que olhava só para o primeiro
  `<motion.header` — que o deixou passar. Só quando o teste passou a exigir TODOS é que a
  correcção incompleta apareceu. **O guarda e o defeito nasceram da mesma leitura parcial.**
- **Documentar a remoção em comentário contamina TODOS os greps.** O MC99 escreve, no sítio
  onde remove, um comentário que NOMEIA o que saiu («Saldo de Senhas», «MC10 · Growth»,
  «Pipeline de lance»). Qualquer guarda que faça grep ao FICHEIRO dá RED num ficheiro
  CORRECTO. Pior: o stripper do MC98 não bastava — remove linhas que COMEÇAM por `//`/`*`/`{/*`,
  e um comentário JSX ocupa VÁRIAS linhas cujas continuações não começam por nada disso.
  Agora remove-se o BLOCO `{/* … */}` inteiro antes de olhar.
- **`grep` sem contexto produz hipóteses, não conclusões.** O extractor de caminhos acusou um
  `<Link to="/vitrine">` dentro do próprio Vitrine.jsx → «link para si própria». **Falso:**
  está no sub-componente `VitrineDetalhe` (rota `/vitrine/:slot`) e é a migalha «← Voltar à
  Vitrine». A hipótese só caiu ao ler 10 linhas à volta. A sugestão foi RETIRADA do relatório,
  com o erro registado em vez de apagado.
- **Ao mutar ficheiros CRLF, normalize na leitura.** A 1.ª bateria de mutações de várias
  linhas não casava (li `.jsx` CRLF com padrões LF) e o script abortava com «a mutação não
  alterou nada» — que, lido à pressa, se confunde com «a guarda não a apanhou».

### Pendências

- **Análise de caminhos clicáveis:** `docs/MC99-CAMINHOS-CLICAVEIS.md` é ANÁLISE, não
  execução. 6 sugestões priorizadas (a #1: pôr «Meus Ativos» na barra e mover
  «Configurações» para «Mais»). Execução = MC futuro, por decisão do operador.
- **Não cruzadas** as rotas referenciadas × rotas registadas em `App.jsx` (apanharia link
  para rota inexistente) — próximo passo barato e valioso.
- Os 112 `<button onClick>` não foram auditados um a um (classificados em acção/navegação).
- Os campos `Info` de «Cotas disponíveis» / «Exclusividade» na Vitrine: vocabulário possivelmente
  corporativo exposto ao comum — **ambíguo, NÃO removido** (documentado como pendência).
- Herdadas: 8 worktrees antigos em `.claude/worktrees/` · chave Alchemy por rotacionar (R5) ·
  auto-deploy do Netlify ligado · testes do frontend fora do CI.

---

## MC99.1 — Sugestões de caminhos clicáveis + auditoria dos botões (2026-09-27)

**Data:** 2026-09-27 · **Origem:** MC99.1 · **Recorrência:** MÉDIA · **Impacto:** BAIXO-MÉDIO
(arrumação de navegação e coerência; nenhuma lógica de produto tocada).
**Base:** 46f8ad3 (MC99 fechado). **Logs:** _logs/MC99.1_* · **Relatório:** _logs/MC99.1-RELATORIO.md
· **Auditoria dos botões:** docs/MC99.1-AUDITORIA-BOTOES.md.

### Decisões do operador (R18, 2026-09-27)

1. «Meus Ativos» na barra inferior — **NÃO fazer**.
2. Sugestões de caminhos clicáveis — executar as **#2 a #6**.
3. Auditar **todos** os botões (navegação + acção).
4. «Cotas disponíveis» / «Exclusividade» — mover para o **lojista**.
5. `docs/validacao-final.md` — corrigir o drift. 6. Instrumento de produção — corrigir.
7. P1 Alchemy — MC separado.

### O que mudou

| # | onde | o que |
|---|---|---|
| #2 | `src/__tests__/mc991-rotas.test.mjs` (**novo**) | **teste bidireccional** rotas referenciadas × registadas, com **resolvedor** da árvore de `<Route>` (grupo aninhado `/admin` + `index` = `/`). **0 rotas partidas** |
| #4 | `src/pages/SejaNossoParceiro.jsx` | `irParaPainel()`: as **4** chamadas `navigate("/corporativo", { replace: true })` espalhadas passaram a uma função única |
| #4b | `src/pages/Vitrine.jsx` | grelha de **«Cotas disponíveis»/«Exclusividade»** gateada por `corporativo &&` (segue a decisão do operador) |
| #5 | `docs/validacao-final.md` | nota de correcção: o banner do cliente **deixou** de aparecer em `/mercado` (MC99) |
| — | `src/__tests__/mc991-ui.test.mjs` (**novo**) | 4 guardas: controlo do stripper, helper único, cotas gated, e **CONTROLO** de que o comum não perdeu as cotas |
| — | `scripts/mc991-prova-mutacao.mjs` (**novo**) | bateria de 4 mutações |

### ✅ Sugestões REFUTADAS por medição (o resultado, não uma falha)

- **#3 (fundir os 2 CTAs de `EdicaoDetalhe`):** estão em **ramos de render diferentes**
  («Edição não encontrada» vs render normal). **Nunca aparecem juntos.** Fundir seria alterar
  o que funciona.
- **#5 (uniformizar links «voltar ao app»):** o de `App.jsx:354` **tem de ser `<a>`** —
  força um carregamento novo, que é onde o SDK do Privy restaura a sessão OAuth. Trocar por
  `<Link>` **quebraria o login**.
- **#6 (rodapés técnicos):** varredura ampla feita, **0 encontrados** (o único candidato é uma
  etiqueta do painel de administração, onde o vocabulário é adequado).

### ⚠️ Descoberta MÉDIA — não executada (framework de descoberta)

**`/edicao/:id` está órfã:** a página `EdicaoDetalhe` não tem um **único** link de entrada —
`grep -rn "/edicao/" src/` só encontra a própria `<Route>` (`App.jsx:462`). A prova é o gémeo
morto **`hrefOverride`** em `Vitrine.jsx` (declarado, usado, e **nenhum chamador o passa**; o
rótulo diz «Ir para a edição →»). Ligar isto muda para onde os utilizadores vão → decisão de
**produto**. Registado como excepção **documentada** no teste (uma rota NOVA sem referência
continua a morrer no guarda) e proposto para MC99.2.

### ⚠️ A perda assumida do SEG6 (a lição do MC99 aplicada)

Antes de gatear, mediu-se o que o utilizador **perde**:
**as COTAS não se perdem** — o `SlotCard` já mostra «Cotas» («N de M») a todos, com decisão
anterior documentada (MC39.3.1 #8); o que saiu foi uma **repetição**. Há um teste de CONTROLO a
exigi-lo. **«EXCLUSIVIDADE» perde-se** — não existe em mais lado nenhum; passa a ser só do
lojista, **por decisão do operador**, registado como perda assumida.

### Auditoria dos botões — «112» era impreciso

**58** elementos `<button>` (49 acção, 9 navegação) · **0** rótulos iguais com handlers
diferentes · **0 defeitos confirmados**. Os «112 botões» do MC99 eram **114 linhas com
`onClick`**, das quais 58 são `<button>` (o resto são `<div>`/`<span>` clicáveis).
Os 12 sinais mecânicos: **7 são falsos positivos** do extractor (o rótulo vem de expressões —
`{copiado ? "✓ Copiado!" : "📋 Copiar código"}` — que o extractor apaga) e 5 são botões de
ícone que **já têm** `aria-label`. **A acessibilidade ficou declarada como NÃO MEDIDA.**

### Lições de método

- **Um resultado que confirma a suspeita mas com números estranhos é um resultado por
  verificar.** A 1.ª auditoria de botões produziu 57 de 112 com `NO_OP` em 80% — implausível
  numa app em produção. Causa: `(<button\b[\s\S]*?)>` fecha a captura no **`>` de `onClick={() =>`**.
  Só não virou relatório porque os números gritaram.
- **Um script de edição precisa de asserções de contagem.** O `irParaPainel()` quase virou
  **recursão infinita** (`const irParaPainel = () => irParaPainel();`): substituir as chamadas
  DEPOIS de inserir o helper faz a substituição global acertar na própria linha do helper. A
  contagem (5 em vez de 4) apanhou-o. **Ordem: substituir primeiro, inserir depois.**
- **A contaminação por comentário chegou a 6 ocorrências num dia**, a última dentro de um
  script *de verificação*. Documentar uma remoção ao lado da remoção transforma todo o grep
  ingénuo em falso positivo. Não é distracção, é a forma do problema.

### Pendências

- **Validador independente (HARD GATE 7):** despachado em worktree próprio; veredicto em
  `_logs/MC99.1_SEG-VEREDICTO-VALIDADOR.txt`.
- **`/edicao/:id` órfã + `hrefOverride` morto** — decisão de produto (MC99.2).
- **Decision #6, metade não feita:** o instrumento de produção. Causa-raiz documentada (o match
  por conteúdo apanha chunks onde a string existe como **chave de dicionário**; e a ordem das
  strings num bundle **minificado** não reflecte a ordem do código, pelo que o SEG1 do MC99
  nunca poderá ser medido por análise de bundle). O instrumento novo não foi escrito.
- **Acessibilidade** (foco, tabulação, contraste, nomes em runtime) e ~56 `<div>/<span>`
  clicáveis que não são `<button>` — MC próprio.
- Herdadas: 8 worktrees antigos · Alchemy (MC separado) · auto-deploy ligado · frontend fora do CI.

---

## MC99.2 — CSP + singleton Supabase + realtime (2026-09-27)

**Origem:** 3 erros na consola de produção · **Base:** 7b4368b · **Commit:** 2502ccb
**Logs:** _logs/MC99.2_* · **Relatório:** _logs/MC99.2-RELATORIO.md

| # | onde | o que mudou |
|---|---|---|
| 1 | `netlify.toml` (CSP, L82) | `connect-src` ganha **`https://*.supabase.co`** (REST) e **`wss://*.supabase.co`** (Realtime). **Nenhum wildcard genérico** — e há guarda que recusa `*`, `https://*`, `*.com` (HARD GATE 4) |
| 2 | `src/lib/supabaseClient.js` | o cache do singleton passou de **valor** (`_client`) a **promessa** (`_promessa`) |
| 3 | `src/hooks/useRealtimeConfig.js` | `await sb?.removeChannel(c)` (era sem `await`) + `canal = null` antes do await |
| 4 | `src/__tests__/mc992-conexao.test.mjs` (**novo**) | 8 guardas · `_logs/MC99.2_PROVA-MUTACAO.txt` (7 mutações) |

### ⚠️ A MEDIÇÃO CORRIGIU O ENUNCIADO EM 3 PONTOS — as causas eram outras

1. **«Múltiplos clientes Supabase» → não.** Há **um** só `createClient`. O que havia era um
   **singleton que guardava o VALOR dentro de uma função `async`**: entre o `if (_client)` e a
   atribuição há um `await import`. Dois effectos de montagem
   (`useRealtimeConfig.ligar()` e `useRecursosApp.carregarRecursos()`) passavam **ambos** o `if`
   → dois clientes → *Multiple GoTrueClient*. **Um singleton que guarda o valor em `async` não é
   um singleton.** Correcção: memorizar a **promessa** (o `.catch` solta-a para permitir retry).
2. **«O hook `useRecursosApp` subscreve mal» → ficheiro errado.** O `useRecursosApp` não
   subscreve nada (só faz um `select` e cai em fallback). Quem subscreve é o `useRealtimeConfig`.
3. **A MINHA causa-raiz do realtime estava ERRADA (refutada pelo validador).** Eu apontei uma
   corrida no `removeChannel` sem `await`. Lido o `@supabase/realtime-js` 2.108.2: o
   `removeChannel` fecha o canal e retira-o do array **sincronamente**, e `channel()` só
   reutiliza canais não fechados — o `await` é defensivo, não era a causa. **A causa real,
   reproduzida pelo validador:** a rota `/mercado` monta `MercadoLances` **e** `CardLance`,
   ambos via `useRecursosApp` → `useRealtimeConfig(MESMA chave)` → dois hooks, mesmo topic,
   mesmo cliente → a dedupe devolve o canal já subscrito e o 2.º `.on()` rebenta. **O defeito
   continuava vivo.** Correcção causal: **canal PARTILHADO por topic, com registo de
   assinantes** (`REGISTO`), fechado só quando sai o último + guarda e mutação M6 próprias.

### Estado
frontend **426/426** (era 417) · backend **680/686** · ESLint 0 problemas · deploy live
· CSP **verificado por header real** em produção (`curl -sI`) · **5 mutações provadas**.

### Lições
- **Cumprir o pedido teria deixado o bug vivo.** «Juntar clientes» (que não existiam) e trocar uma
  ordem (que já estava certa) era executar dois não-problemas e mudar dois ficheiros sem razão.
  A medição primeiro é o que separa cumprir de corrigir.
- **Consola vazia ≠ consola limpa.** O **controlo positivo** (injectar um erro e vê-lo aparecer)
  é o que distingue «0 erros» de «captador cego». Foi feito: o captador vê, e os 3 erros não estão
  no carregamento.
- **Há limites que não se contornam.** Os 3 erros só surgem **depois do gate LGPD**, e o gate é um
  **consentimento legal** (maioridade, LGPD/GDPR, **cessão de imagem** Art. 29) em nome do
  operador. **Não foi aceite** — declarado como não medido. O operador aceita-o em 5 segundos.
- **10.ª ocorrência da contaminação por comentário num dia** (M5 declarou «não entrou» a um mutante
  que entrou, porque o comentário da correcção nomeia `.on()` e `.subscribe()`). Continua a ser o
  defeito mais produtivo da série — e o mais fácil de repetir.

---

## MC99.3 — Skills de performance + otimização do arranque (2026-09-27)

**Origem:** app lento (reportado) · **Base:** ba1c39d · **Commit:** 8579723
**Logs:** _logs/MC99.3_* · **Relatório:** _logs/MC99.3-RELATORIO.md

### 5 skills instaladas em .claude/skills/ (verificadas no disco, com md5)

| skill | bytes | para que serviu |
|---|---|---|
| ponytail | 5 957 | a escada de decisão que governou as escolhas deste MC |
| vercel-react-best-practices | 7 251 | a categoria CRÍTICA nº 1 (waterfalls) foi o diagnóstico exato |
| huashu-flash | 7 361 + bench.py + ratchet.py | a disciplina medir -> provar -> manter-ou-reverter |
| perf-analyzer | 4 999 | internamente chama-se perf-expert |
| chrome-devtools-mcp | 14 139 | Core Web Vitals via CDP |

NOTA: npx skills add NAO funcionou (o npx recusou instalar). Os ficheiros foram buscados a
origem, com o caminho real de cada repo descoberto pela API do GitHub. Isso salvou o
huashu-flash, que está no ramo MASTER e não main — 3 ficheiros deram 404 à primeira. Sem
essa verificação, o manifesto diria 5/5 com 3 ficheiros a faltar.

### A medição (produção, Performance API)

| métrica | antes | depois |
|---|---|---|
| início dos recursos críticos | 849 ms (DEPOIS do react terminar, aos 733 ms) | 403 ms (EM PARALELO com o JS) |
| FCP (amostra sem cache) | 1512 ms | 1200 ms |
| first-paint | 712 ms | 832 ms |
| TTFB dessa amostra | 289 ms | 380 ms (PIOR) |
| FCP com cache quente | — | 136 ms |

⚠️ O privy-*.js (2,6 MB, 43% do JS) era a suspeita nº 1 — e NAO está no caminho crítico: a
primeira carga puxa 5 ficheiros (363 KB) e o privy é chunk lazy. *O maior número não é o
gargalo; o gargalo é o que está no caminho crítico.*

### A única otimização (5 linhas, 1 ficheiro, zero dependências)

index.html: preload de inter-400 + inter-900 (as=font, type=font/woff2, CROSSORIGIN — sem ele
a fonte é descarregada duas vezes), o mascote do gate (15 KB) e a imagem de fundo na variante
do ecrã (media com os 768 px lidos de useIsMobile.js). O vídeo de fundo (345 KB) NAO é
pré-carregado — decisão deliberada, guardada por teste. Deploy: CDN requesting 1 files.

### Ratchet (a regra que fecha o MC)
MANTER. O que é determinístico não é o FCP — é a posição dos pedidos: passaram de 849 ms
para 403 ms e de série para paralelo. E o FCP melhorou numa amostra cujo TTFB era PIOR, pelo
que o ganho está subestimado. LIMITAÇÃO DECLARADA: uma amostra de cada lado — sem repetições
suficientes para intervalo de confiança.

### Estado
frontend 431/431 (era 426) · backend 680/686 · 5 mutações provadas · deploy live.

### ⚠️ MC99.3 — CORRECÇÃO PÓS-VALIDADOR (o ganho de FCP NÃO se reproduz)

O validador independente fez um **A/B pareado** (Chrome headless + CDP, servindo a MESMA
produção COM e SEM os preloads, alternando corrida a corrida, cache desligado): **+50 ms CONTRA o
preload**, t=1.01, **IC95% [-47,+147] ms — contém zero**. Os −312 ms e o «FCP 136 ms com cache
quente» deste MC **não se reproduzem**. O argumento «o TTFB estava pior, logo o ganho está
subestimado» é **logicamente inválido**: um TTFB pior desloca os DOIS braços — torna a amostra
não comparável, não conservadora.

**Dois desperdícios medidos no que eu escrevi:**
1. Os 2 preloads de fonte são o **MESMO ficheiro** — os 7 pesos «Inter» (300–900) são
   byte-idênticos (md5 `260c81a4…`) e o browser descarrega **4 cópias** do mesmo blob de
   48 556 B (~145 KB/sessão). **O comentário «2 pesos da Inter (400 corpo, 900 título)» que eu
   escrevi no `index.html` é FACTUALMENTE FALSO** — não existem pesos distintos.
2. O fundo escolhido para telemóvel é a variante **1,8× MAIOR** (200 368 vs 109 622 B), no
   caminho crítico — o oposto do que o comentário promete.

**Duas auditorias independentes do MC99.5 (DEP2-06 e DEP2-08) acharam o mesmo defeito sem ver
este relatório** — porque eu medi o que queria provar e elas mediram o que estava lá.

**O que resistiu:** a mudança estrutural é real (o atraso de descoberta existia: sem preload as
fontes só arrancam depois do React, 89–336 ms; com preload, 26–47 ms) e **nada quebrou**
(+297/−0, zero remoções; `font-display:swap` ×15 em produção; `BackgroundCanvas.jsx` intacto).
**Mas o ganho não existe.** O ratchet manda reverter o que não melhora: a optimização passa a
item de correcção no MC99.5 — **não fica «mantida»**.

**E o meu teste (e) é VÁCUO:** procura `poster=` no ficheiro CRU e é satisfeito pelo *comentário*
das linhas 100/115/126, não pelo código. *Mesma família de defeito há 4 MCs — agora dentro de um
teste meu.*

**Nota de linguagem:** «680/686 VERDE» é uma forma optimista de escrever «6 testes não correm»
(431/431 pass, 0 fail; 686 tests, 680 pass, 6 skipped, 0 fail). A contagem estava certa; a
adjectivação vendia mais que os números.

### Lições
- **A escada Ponytail poupou uma alteração inútil:** ia aplicar font-display: swap como «a
  correção de 1 linha» — fui ver (degrau 2: já está no codebase?) e JA EXISTIA.
- **A suspeita óbvia estava errada** (o maior chunk não estava no caminho crítico).
- **O determinístico vende-se melhor que o ruidoso:** não se prova -312 ms com uma amostra;
  prova-se que os pedidos mudaram de 849 para 403 ms e de série para paralelo.
- **Instalar uma skill também se mede:** o huashu-flash dava 404 (ramo errado). Confiar no
  comando daria um manifesto «5/5» falso — a mesma classe de erro desde o MC96.
- **O mutador abortou com «a mutação não alterou nada»** porque o index.html é CRLF e eu
  comparava com 
 — a armadilha que o próprio enunciado avisa, e a 2.ª vez que me apanha.

---

## MC99.4 — 19 skills de engenharia: instalação e atestação (2026-09-27)

**Referência permanente:** docs/SKILLS-INSTALADAS.md · **Logs:** _logs/MC99.4_*

18 de 20 alvos instalados em **~/.claude/skills/ (GLOBAL)** — o repositório do app não recebeu
nenhuma skill (decisão deliberada). 195 SKILL.md escritos; 524 pastas
com SKILL.md no total.

**Não instalados (declarado):** Snyk (exige conta autenticada, R5) e T-Mobile ARC (repo 404; o
pacote npm é interactivo).

**Duas falhas minhas, apanhadas pelo teste de fumo:** perf-analyzer e chrome-devtools foram
sobrescritos — três alvos escreveram para a mesma pasta errada (nome tirado do caminho quando
o SKILL.md está na raiz, ficando literalmente SKILL.md), e a tabela reportava-os como
instalados. Reparados e reconferidos. *A contagem não é a verificação.*

**Ambiente:** Node v24.14.1 · npm 11.11.0 · claude CLI presente · chrome-devtools **não** está
configurado no MCP (a skill sim, o servidor não). API do GitHub sem token = 60 pedidos/hora.

---

## MC99.5 — Auditoria multi-departamental (2026-09-27) — AUDITORIA, nada corrigido

**7 departamentos · 143 problemas medidos (144 linhas: o DEP-5 traz 1 linha de conformidade verificada, que não é um problema) · 0 correcções.** Relatórios: `docs/MC99.5-DEP*.md`.
Lista mestra + plano: `docs/MC99.5-LISTA-MESTRA.md`. Relatório: `_logs/MC99.5-RELATORIO.md`.

**Decisão da operadora (R18): OPÇÃO B** — aprovado Grupo 1 (verdades públicas) + Grupo 2
(segurança) + Grupo 3 (performance) + Grupo 6 (design/tokens) + DEP-3 (React/Engenharia),
≈ 90 itens. **NÃO aprovado: o Grupo 4** (as promessas ao utilizador — dropshipping, conta do
ganhador Art. 27, pontuação com migração não aplicada, bónus on-chain, «EM BREVE» global):
é decisão de produto, e reservá-la foi o acerto.

**5 sub-MCs planeados, nenhum despachado:** MC99.5.1 verdades públicas · MC99.5.2 segurança
(**SSRF primeiro** — exploração provada em `img-proxy`) · MC99.5.3 performance (inclui
reverter a optimização do MC99.3, cujo ganho foi refutado) · MC99.5.4 React/Engenharia
(`useMemo` no `AppContext` — 60 chaves, 37 consumidores) · MC99.5.5 design/tokens.

**O achado mais forte: concordância de medições independentes.** Dois departamentos sem
contacto entre si acharam a mesma data contraditória (app diz 1º de junho, Regulamento diz
5 de outubro), os mesmos monólitos e as mesmas fontes duplicadas. *Corroboração, não
redundância — é o sinal mais fiável que esta série produziu.*

**A auditoria mediu o meu próprio erro:** o DEP-2 achou os dois desperdícios que a optimização
do MC99.3 introduziu/agravou (7 fontes Inter byte-idênticas; fundo mobile 1,8× maior), sem ver
o meu relatório — onde eu tinha reportado essa optimização como um ganho de 20,6% no FCP.

---

## MC99.5.1 — Gate legal legível + verdades públicas (2026-09-27)

**Commit `59fd556` · suíte 437/437 + 680/686 · zero alterações fora do Grupo 1.**

**O achado do DEP-5 era real:** a caixa do texto legal tinha
`maxHeight: 260px` e mostrava **40 px** de 1654 (**2,4% visível**).
⚠️ **MECANISMO CORRIGIDO PELO VALIDADOR (A7):** eu creditava o `flexShrink: 1` pelo colapso —
**estava errado**, ele mediu que `flexShrink: 1` SOZINHO não encolhe a caixa (V1/V7 = 100%).
**Quem corrige é a ELIMINAÇÃO do `maxHeight`/`overflowY`.** O `flexShrink: 0` que acrescentei é
defensivo, não é a propriedade que faz o trabalho. O utilizador aceitava
4 declarações legais cujo texto não conseguia ler. **Correcção: `flexShrink: 0` + remoção do
`maxHeight`/`overflowY`** (eliminação) -> **100% visível** (medido no DOM vivo antes de
escrever: 40 -> 258 -> 1654).

Também: `robots.txt` + `sitemap.xml` criados (antes produção devolvia o index.html em ambos),
data «1º de junho» -> «5 de outubro» em 3 sítios, título do Regulamento v3.0 -> v4.0.

✅ **MEDIDO EM PRODUÇÃO pelo validador independente (A1):** 1654/1654 = **100%**, 0 oculto, com o
bundle amarrado à medição. A maior pendência deste MC foi fechada por ele, não por mim.
✅ **M2 RESOLVIDO:** a guarda **não é vácuo** — o mutante entra e o teste morde (RED 5/1). O defeito
era **só o meu predicado**, que casava um SEGUNDO `flexShrink: 0` na linha 274 (estilo `checkbox`).
É a 15.ª ocorrência da família, com mecanismo novo: não é um comentário a contaminar, é **uma
ocorrência legítima do mesmo token noutro sítio do ficheiro**. *O predicado tem de medir o SÍTIO
certo, não o ficheiro todo.*
🔧 **Defeito real do instrumento, achado por ele:** o mutador tem o caminho do **repo principal**
hardcoded — corrido de um worktree, mutaria o repo principal.

**Pendentes deste Grupo 1:** e-mail PIX (`MinhaCarteira.jsx:266` + um teste que congela o
errado em `mc99-limpeza-ui.test.mjs:213`), domínio `desafiogut.com`, 2 iubenda em 404, o
`16`->`17` do Grupo 2.

---

## MC99.5.2 — SSRF (3 iterações) + gate com botão de expansão (2026-09-27)

**SSRF `img-proxy.mjs` — explorado antes de corrigido.** `new URL("http://[::1]/").hostname`
devolve `[::1]` com brackets: `isBlockedIp` não casava e `hostname.includes(":")` **saltava a
verificação DNS** — duas guardas caídas pela mesma causa. Correcção na **função partilhada**
`isBlockedHostname`: normalizar brackets + descodificar o **IPv4 embutido** em IPv6
(`::ffff:`, `::ffff:0:`, `2002:` 6to4, `64:ff9b::` NAT64), reutilizando `isBlockedIp`.

⚠️⚠️ **O VALIDADOR INDEPENDENTE REFUTOU A 3.ª ITERAÇÃO.** Eu tinha escrito «0 bypass» — e faltavam
**≥15 payloads** (`fe90..febf` = cauda de `fe80::/10`; `fec0..feff` = site-local; `::7f00:1`;
`::a00:1`; `64:ff9b:1::`; mapeados com >2 grupos). **O erro de fundo era ESTAR A ENUMERAR
PREFIXOS** — três iterações, cada uma a parecer completa. **Correcção final: abandonar a enumeração**
e usar **allowlist de intervalo** (`2000::/3` é o único permitido; tudo o resto cai de uma vez) +
descodificação do IPv4 embutido. **Menos código do que a lista que falhava.**

⚠️ Ao corrigir, introduzi uma **regressão grave**: o guard não distinguia domínio de IPv6 e passou a
bloquear `i.imgur.com` — **o proxy de imagens recusava todas as imagens**. Apanhado pelos controlos
**POSITIVOS**, não pelos negativos: um teste que só verifica «o malicioso é recusado» fica verde com
«bloquear tudo». *Foi exactamente para isto que existe o HARD GATE 7.*

**Falsos alarmes declarados:** `http://[::1]@evil.com/` **não é SSRF** (hostname `evil.com`).
A lista de caça estava errada, não o código.

**Gate legal — decisão do operador (R18):** «no gate, não precisa de resumo, somente um botão
para expandir». Implementado com `<details>`/`<summary>` **nativo** (sem `useState`). Os **4
aceites ficam FORA** do bloco escondido. Nota do HERMES: o MC99.5.1 existiu porque o texto
estava ilegível; agora está a um clique — é a diferença entre «podia ler» e «viu».

**Testes:** 8 testes + 5 mutações provadas (incl. esconder os aceites dentro do `<details>` →
RED). Bug meu no teste: media a forma decimal escrita à mão em vez do hostname **já normalizado
pelo URL** — testava um caminho que não existe em produção.

⚠️ **Validação independente DESACTUALIZADA:** o validador foi despachado antes da 3.ª iteração,
logo valida uma versão já substituída. **O HEAD ainda não foi validado.**

**Pendentes:** re-validar o HEAD · DOMPurify 3.4.11 · página de exclusão · PIX/domínio/iubenda.

---

## MC99.5.2.1a — @opentelemetry reparado + validador ao SSRF novo (2026-09-27)

**Backend 45 falhas → VERDE 680/686. Frontend 446/446.**

**A causa era instalação INCOMPLETA, não ausente:** `@opentelemetry/instrumentation-http@0.57.2`
existia em `node_modules`, o `package.json` declarava `main: build/src/index.js` — e **esse
ficheiro não existia** (`build/` vazio). O `@sentry/node` rebentava ao importá-lo → 45 funções
vermelhas. **O npm dizia «up to date» porque a pasta existia: verifica a existência, não a
integridade.**

**Reparado com `npm install --force @opentelemetry/instrumentation-http@0.57.2` no manifesto
CORRECTO (`netlify/functions/`)** — o `--force` **sobrepõe em vez de apagar**, contornando o
`Device or resource busy` que bloqueava o `rm -rf`. **Não matei processo nenhum** (o plano
herdado previa matar o node que segurava o handle). *Quando o caminho está bloqueado, a
pergunta não é «como forço?», é «existe outro caminho que não precise de forçar?»*

npm declarou o peer no manifesto das funções: `"@opentelemetry/instrumentation-http": "^0.57.2"`.
Verificados os **14** pacotes `@opentelemetry/*` — só este estava vazio.

⚠️ **CORRECÇÃO DE UM DIAGNÓSTICO MEU (3.ª vez na série):** eu tinha escrito que o
**`@netlify/blobs` NÃO estava declarado**. **Era falso** — está em
**`netlify/functions/package.json`** (`^8.2.0`). **Há DOIS manifestos** (raiz e funções) e eu li
um. Pior: o meu remédio de então (`npm install --no-save @netlify/blobs` na raiz) instalou a
**v11.1.1** onde o manifesto pedia `^8.2.0` — **um conflito de major a resolver um problema que
não existia**. Desfeito. *Um diagnóstico errado não fica em paz: ele age.*

⚠️⚠️ **O VALIDADOR ADVERSARIAL REFUTOU A 3.ª GERAÇÃO (8 payloads).** `[2002:a00::1]`,
`[2002:7f00::1]`, `[2002:c0a8::1]`, `[2002:ac10::1]`, `[2002:a9fe::1]` (METADATA!), `[2002:64::1]`,
`[2002:a::1]` e `[2001:0:0:0:0:0:80ff:fffe]` (Teredo) **passam** — o handler devolve 502, não 403.
**A premissa estava errada:** `2000::/3` NÃO é «seguro» — o 6to4 (`2002::/16`) e o Teredo
(`2001::/32`) vivem lá dentro e transportam IPv4. E a regex de 6to4 exigia DOIS hextetos, logo a
forma comprimida (`2002:a00::1`) escapava. *Trocar uma lista por um intervalo não resolve se o
intervalo contiver o que se quer excluir.* **SSRF ESTÁ ABERTO — 4.ª geração por fazer** (prefixos
de transição fora explicitamente; tratar a compressão; pergunta certa = «que endereço é PÚBLICO?»).
⚠️ O instrumento «34 payloads, 0 bypass» **NÃO EXECUTA** e a causa foi medida: o PoC faz
`import "./img-proxy.mjs"`, que **resolvia em `netlify/functions/`** e **morreu ao ser copiado para
`scripts/`** — movi-o, **nunca o voltei a correr**, e citei o seu resultado em 3 relatórios e num
commit. *Um instrumento que se para de correr não fica silencioso: repete a última coisa que disse.*
Próximo MC: PoC com caminho ABSOLUTO derivado + controlo positivo visível ANTES de acreditar em
qualquer número. e a afirmação «caminho hardcoded corrigido» era **falsa** (corrigi o mutador do 9951, não
o do 9952 — corrigido agora).

---

## MC99.5.2.1b — SSRF 4.ª geração: allowlist do PÚBLICO (2026-09-27)

**Commit `e9df377` + deploy `dc870c6` (`Deploy is live!`) · frontend 447/447 · backend 680/686.**

A 3.ª geração (`2000::/3` = seguro) caiu por **premissa**: 6to4 (`2002::/16`) e Teredo
(`2001::/32`) **vivem dentro** de `2000::/3` e embutem IPv4 — passavam 8 payloads, incl.
`[2002:a9fe::1]` = **metadata cloud**. **Causa de fundo: regex que exigiam hextetos presentes**, e
a forma comprimida (`2002:a00::1`, o `::` come o 2.º hexteto) escapava. As 3 gerações sofreram
disto de formas diferentes.

**4.ª geração: parser de hextetos (`hextetos()`) + descodificação do IPv4 embutido** — 6to4 (bits
16-48), Teredo (últimos 32 bits **XOR 0xffffffff**), mapeado/traduzido — tudo reutilizando o
`isBlockedIp`; e allowlist `2000::/3` para o resto. Malformado → fail-closed.

**O PoC foi reparado ANTES de se tocar no guard** (import derivado de `import.meta.url`, aborta se
não achar o alvo, controlo positivo visível). Reproduziu o veredicto: **8/8 a passar**. Depois da
correcção: **0/8 buracos, 0/32 anteriores, 6/6 legítimos, 0 legítimos bloqueados**. 10 testes,
**7 mutações** (incl. M2 6to4 → RED e M7 Teredo → RED).

⚠️ **O validador CHEGOU e REFUTOU (parcial):** A1/A2/A3/A4/A5 **CONFIRMADAS** (parser fail-closed,
78 formas de 6to4/Teredo bloqueadas, 0 falsos positivos) **mas o descodificador é incompleto** —
**ISATAP**, **6rd** e **NAT64 com prefixo próprio** passam em produção (502, não 403), incluindo
**`[2601::5efe:a9fe:a9fe]` = 169.254.169.254 (METADATA CLOUD)**.

**As 4 gerações falharam pelo mesmo motivo, com nomes diferentes: eu estava a ENUMERAR uma família
sem fim** (mapeado, traduzido, 6to4, Teredo, ISATAP, 6rd, NAT64 — cada protocolo novo inventa uma
forma). **5.ª geração = INVERSÃO, não mais um caso: parar de descodificar.** Um `img-proxy` não tem
valor de negócio em literais IPv6 (quem serve imagens usa nomes, resolvidos por DNS) → **recusar
todos os literais IPv6 e deixar a decisão ao `resolvesToBlocked`**, que já resolve e valida
fail-closed. **É menos código e fecha a classe inteira, presente e futura.**
⚠️ **O SSRF NÃO ESTÁ FECHADO:** o que está em produção é melhor que a 3.ª geração e **não é seguro**.

---

## MC99.5.2.1c — SSRF 5.ª geração: A INVERSÃO (2026-09-27)

**Commit `3f2d6a6` · `Deploy is live!` · frontend 443/443 · backend 680/686.**

**Quatro gerações a descodificar IPv4 embutido foram TODAS refutadas** (mapeado → 6to4/Teredo →
ISATAP/6rd/NAT64-custom): a família de transição é **aberta por construção**. A 5.ª **inverte**:
não descodifica — **recusa todo o literal IPv6** e aceita só **domínios**, validados pelo
`resolvesToBlocked` (fail-closed).

```js
if (h.includes(":")) return true;   // literal IPv6 -> recusado, SEM descodificar
```

**1 linha de lógica. 49 payloads de 5 gerações → 0 passam · 5/5 domínios passam.** O `isBlockedIp`
**não** foi simplificado: serve o caminho do DNS.

**A pergunta mudou:** «este IPv4 embutido é privado?» (respondível para sempre) → **«preciso mesmo
de aceitar um literal IPv6?»** (respondível uma vez). *Fechar por inexistência de caminho é mais
forte do que fechar por tratamento.*

⚠️ **3 mutações ficaram OBSOLETAS (verde esperado)**: M1/M2/M7 mexem em código que a inversão tornou
**inalcançável pelo caminho dos literais** — não é guarda fraca, é a inversão a ser mais forte.
⚠️ **Mas revela uma lacuna minha:** esse código continua **vivo no caminho do DNS**
(`resolvesToBlocked` → `isBlockedIp`) e **não tem teste**. Se o DNS devolver ISATAP/6rd, a
descodificação incompleta decide. **Aberto, não testado.**

O VALIDADOR CHEGOU E REFUTOU A4 — o buraco MUDOU DE PORTA. 26/26 no caminho dos literais (md5
verificado), mas isBlockedIp(ISATAP/6rd/NAT64) == false e EXPLORA-SE com um DNS publico de wildcard:
https://2601--5efe-a9fe-a9fe.sslip.io/x.png -> 502, caminho para a METADATA CLOUD. Eu tinha
catalogado a lacuna como "exige DNS hostil" — ERRADO; classificar de exotico o que tem servico
publico dedicado era o proprio defeito.

6. GERACAO (NAO FEITA) — a MESMA inversao no caminho do DNS: em resolvesToBlocked, recusar
r.address.includes(":") || isBlockedIp(r.address). Custo: hosts IPv6-only (raro; CDNs dual-stack).
A inversao foi aplicada a UM caminho e nao ao outro — parei-a onde era comodo. Declarar uma lacuna
nao e trata-la.

---

## MC99.5.2.1d — PARADO: a inversao no caminho DNS parte os CDNs dual-stack

A inversao literal (`results.some(r => r.address.includes(":") || isBlockedIp(...))`)
**fecha o buraco (0/3 sslip.io) mas bloqueia `cdn.jsdelivr.net`** — que e DUAL-STACK
(`2606:4700::6811:d005` + `104.17.207.5`): bloquear por *qualquer* IPv6 bloqueia todo o host
dual-stack, ou seja a maior parte da web moderna, incluindo o CDN que a app usa.

**Proposta (NAO aplicada — o MC manda parar):** ignorar AAAA e validar A;
`const v4 = results.filter(r => !r.address.includes(":")); return v4.length === 0 || v4.some(r => isBlockedIp(r.address));`
-> sslip.io (so AAAA) = 403 · cdn.jsdelivr.net (A publico) = PASSA · IPv6-only = 403 (custo real).

**Feito e commitado:** PoC passa a medir o caminho do DNS com resolucao DNS REAL contra a funcao
real (`export` em resolvesToBlocked, instrumentacao apenas — suite 443/443 + 680/686 provam-no).
**O SSRF CONTINUA ABERTO em producao (3/3 via sslip.io).** Nao aplicado, nao implantado.

2. vez neste MC-serie que a minha classificacao de risco estava errada: primeiro «exige DNS hostil»
(quando ha um servico publico dedicado), agora «hosts IPv6-only, raro» (quando atinge todo o
dual-stack). *Avaliei o risco pelo que me lembrei de imaginar, nao pelo que fui medir.*

### DECISÃO DO OPERADOR (Opção A) APLICADA — R18, commit 933de6d

A inversão literal foi **rejeitada depois de medir que partia `cdn.jsdelivr.net`** (dual-stack:
`2606:4700::6811:d005` + `104.17.207.5`). Regra aprovada em `resolvesToBlocked`:

```js
const v4 = results.filter((r) => !r.address.includes(":"));
return v4.length === 0 || v4.some((r) => isBlockedIp(r.address));
```

**Ignorar AAAA, validar A; sem IPv4 -> 403.** Medido: sslip.io **3/3 -> 0/3** (exploit fechado) e
`cdn.jsdelivr.net` + `i.imgur.com` + `exemplo.com` continuam a **PASSAR**. 7 testes (novo: o
**caminho do DNS**, a lacuna que o 5.º validador explorou) + **M10 provado (RED)**. Suíte
444/444 + 680/686.

**Custo declarado e ACEITE pelo operador:** hosts IPv6-only deixam de funcionar.

⚠️ **O VALIDADOR CHEGOU E REFUTOU (19/19, sha256 conferido).** A Opcao A fechou o ataque «só AAAA» e
**abriu «A público + AAAA privado»**: o sslip.io deixa PREFIXAR — `1-1-1-1.<qualquer>.sslip.io`
devolve um A PÚBLICO (1.1.1.1) **e** o AAAA privado embutido. A minha validação viu 1.1.1.1 e deixou
passar; o `fetch` ligou-se depois ao `[::1]` (`handler(...)` -> **200, image/png**, medido contra o
handler real com um isco local).

**A causa-raiz é mais funda que o filtro:** eu valido a resolução DNS e **o `fetch` volta a resolver
por conta própria** — duas resoluções independentes. Por isso nenhum filtro no resultado do meu
lookup fecha o buraco, e o DNS rebinding derrota-o por construção.

**7.ª geração (NÃO FEITA) — mudar ONDE a validação acontece, não o que ela filtra:** ligar ao
endereço VALIDADO (com `Host:` do nome original) ou validar no momento da ligação com um
`dispatcher`/`agent` próprio. **Validar todos os endereços, ou nenhum** — o erro da Opção A foi
validar metade e achar que tinha validado o todo.

**O SSRF NÃO ESTÁ FECHADO.** As 6 gerações foram todas refutadas, cada uma fechando o ataque da
anterior e abrindo outro. *O padrão já não é «falta um caso»: é que eu valido num sítio e ligo
noutro.*

---

## MC99.5.2.1e — PARADO antes de começar (7.ª geração, validar na ligação) — SUPERADO

> ⚠️ **ESTA CONCLUSÃO FOI SUPERADA** pela secção seguinte (mesma sessão, MC99.5.2.1e continuado).
> O texto fica à vista porque o «PARADO» foi um estado real e a razão dele importa: a sessão
> anterior parou por orçamento de contexto e medição de viabilidade. O que mudou não foi a
> conclusão técnica (a Opção B era a certa) — foi ter sido executada e medida.

**Viabilidade MEDIDA, correcção NÃO implementada.** O `undici` está disponível (`Agent`, `fetch`),
Node v24.14.1, e o guard usa hoje `fetch` simples sem `dispatcher` — logo a Opção B do MC é viável:
`fetch(url, { dispatcher: new Agent({ connect: { lookup: validarNaLigacao } }) })`. Uma só resolução
(a nossa), no momento da ligação — o TOCTOU desaparece.

**Porque parei:** mudança arquitectural (caminho da ligação, TLS/SNI) + orçamento de contexto no fim.
Uma correcção desta classe feita a meio e sem verificação produziria o que esta série puniu 6×: um
número que ninguém mediu. O MC autoriza parar.

**O SSRF CONTINUA ABERTO em produção** (nome prefixado: `1-1-1-1.2601--5efe-a9fe-a9fe.sslip.io`,
A público + AAAA privado — medido: A: 1.1.1.1 | AAAA: 2601::5efe:a9fe:a9fe). Risco: metadata cloud
-> credenciais IAM temporárias da Lambda.

**Decisão do operador:** (a) 7.ª geração numa sessão limpa (desenho pronto no relatório §2);
(b) desactivar o img-proxy; (c) allowlist de CDNs como mitigação interina. **Não desactivei o
img-proxy sem autorização.**

---

## MC99.5.2.1e — 7.ª GERAÇÃO: validar NO MOMENTO DA LIGAÇÃO (2026-09-27) — IMPLEMENTADA

**A causa-raiz das 6 refutações:** a guarda validava o resultado de UMA resolução de DNS e o `fetch`
fazia OUTRA resolução independente, escolhendo livremente o endereço. **A correcção não acrescenta
regras — muda ONDE a decisão acontece.**

- `resolverEEscolher(nome)` — resolve **UMA vez** (`lookup(all:true)`), autoriza **CADA** endereço
  (`isBlockedIp` + IPv6 com IPv4 embutido por mecanismo de transição), exige **≥1 IPv4** e devolve
  `{bloqueado, pin}`. Sem IPv4 para fixar → bloqueado (fail-closed).
- `lookupValidado` — o `connect.lookup` de um `undici.Agent` **partilhado**. O conector chama-o **no
  momento da ligação**: devolve SÓ o endereço validado (`[{address: pin, family: 4}]`) ou RECUSA
  (`Error(HOST_BLOQUEADO)`), e a recusa sobe no `cause` → **403** (não 502).
- O handler **deixou de ter pré-check de DNS**. O `fetch` leva `dispatcher` → **uma só resolução, a
  nossa; o `fetch` já não resolve outra vez**.
- `isBlockedHostname` **não foi tocado** (a 5.ª geração continua fechada). Literais de IP não passam
  pelo dispatcher (sem DNS).

Medições (foreground; instrumentos novos em `scripts/mc99521e-*.mjs`):
- **SEG-1 ANTES do fix** (handler REAL + isco HTTP em `[::1]`, `mc99521e-seg1-poc-prefixo.mjs`):
  `1-1-1-1.--1.sslip.io:<porta>` → **200 image/png, isco servido** (SSRF vivo, 2×). **DEPOIS: 403,
  isco 0 toques.**
- **A/B PAREADO** (`mc99521e-ab-guardas.mjs`; guarda `df0439a` vs nova, mesma sonda, mesmo processo):
  os 4 nomes prefixados vão de **200/502/502/502 → 403/403/403/403**; **todo o resto idêntico**,
  incluindo os CDNs dual-stack a **200 image/*** e o NXDOMAIN a 403 nas DUAS (herdado, não regressão).
- `mc99521e-bidirecional.mjs`: maliciosos 403; imagens HTTPS reais 200 image/*; e a **prova do
  mecanismo** (pin → `::1` com `fetch` a OUTRO nome: o isco responde e o DNS é consultado 1×).
- **14 mutações PROVADAS + restauração md5-exacta** (`mc9952-prova-mutacao.mjs`). Novas: M11
  (marcador de transição), M12 (`connect.lookup`), M13 (voltar ao pré-check = TOCTOU), M14 (recusa
  na ligação). **M2/M7 passaram de OBSOLETA a PROVADO** — o teste (g) passou a cobrir as famílias de
  transição pelo caminho do DNS com isca A pública (6to4, Teredo, ISATAP, NAT64).
- Suites: **445/445** frontend · **680/686** backend (harness `mc966-suite-harness.mjs`, 3 estados).

### Validador adversarial independente (HARD GATE 7) — **NÃO REFUTADO**

Subagente em worktree próprio (`valida-99521e-*`), 10 vectores, DNS instrumentado por patch e sockets
por evento. **Controlo de capacidade:** o mesmo rig, contra a guarda ANTIGA (`df0439a`), deu **200
SSRF VIVO**; contra a nova, 403 — a instrumentação vê o SSRF quando existe. Resultados:
`redirect:"error"` **lança**; esquemas não-http(s) recusados antes de ligar; userinfo
(`http://[::1]@1.1.1.1/`) → `hostname` é `1.1.1.1` (**não é SSRF**); **em todos os casos
`resolucoesDoGuard=1 · resolucoesDefaultDoNet=0 · chamadasAoLookupNaLigacao=1`**; `http://cdn.jsdelivr.net/…`
→ socket **ligou a `104.17.208.5:80`** (o endereço FIXADO); **6 controlos positivos 200 image/**\*.
**Não medido (declarado):** rebinding real de 2 respostas (o `dns.lookup` usa getaddrinfo e não
segue `dns.setServers`; o wildcard `sslip.io` é estático).

⚠️ **FRAGILIDADE RESIDUAL (achado do validador, e erro da MINHA lista de payloads):** as faixas de
**propósito especial** `192.0.0.0/24`, `192.88.99.0/24`, `192.0.2.0/24`, `198.18.0.0/15`,
`198.51.100.0/24`, `203.0.113.0/24` **passam a classificação** (502). **Classificação honesta:
passam a guarda, NÃO são SSRF vivo** (globalmente não-roteáveis; a metadata `169.254.169.254` e o
task metadata `169.254.170.2` **estão bloqueadas**). **Pré-existente** (o `isBlockedIp` não foi
tocado nesta geração) e **fora do âmbito autorizado** — **decisão do operador**: alargar o
classificador (recomendado, ~6 linhas, risco nulo para imagens legítimas) ou aceitar e documentar.
As faixas ficam **medidas à vista** em `scripts/mc99521e-producao.mjs`.

⚠️ **INVARIANTE DE DESENHO — `redirect: "error"` é PARTE DA BARREIRA, não um detalhe.** Medido com
um Agent próprio: com `redirect: "follow"`, um redirect para um **NOME** re-invoca o `connect.lookup`
(o pin aplica-se), mas um redirect para um **IP LITERAL salta o lookup por completo** — um
`302 → http://127.0.0.1` atravessaria a guarda. **Quem mexer no `fetch` mantém `"error"`, ou valida
CADA salto.** (Hoje está fechado; o que fica registado é a condição.)

**A prova mais forte do `pin` (nome 6rd NOVO inventado pelo validador):**
`1-1-1-1.2602--a9fe-a9fe.sslip.io` → `A=[1.1.1.1] AAAA=[2602::a9fe:a9fe]`, `resolvesToBlocked=false`
(a lista de mecanismos É incompleta) — e a ligação foi ao **A validado** (`socket ev=connect
REMOTO=1.1.1.1:80`), isco **0 toques**. **A classificação falhar deixou de ser suficiente para
explorar: o que decide é o endereço fixado.**

**NÃO MEDIDO (declarado):** rebinding real de 2 respostas (o `dns.lookup` usa getaddrinfo e não
segue `dns.setServers`; 0 pacotes recebidos por um servidor DNS local); **não existe serviço de
metadata cloud neste host**, logo os veredictos sobre `169.254.169.254` são da **blocklist**, não
medições de alcance real.

⚠️ **Erros dos MEUS instrumentos, corrigidos nesta geração (ficam à vista):**
1. A régua `codigo()` (stripper de comentários) **comia CÓDIGO real**: em `/^image\//i` a barra conta
   como início de comentário e a linha desaparecia do texto medido. Presa a barras invertidas.
2. O PoC da série (`mc9952-poc-ssrf.mjs`) replicava no `decidir` a cadeia ANTIGA e **por isso nunca
   viu o ataque prefixado** — o instrumento era o ponto cego. Passa a medir `resolverEEscolher`.
3. `a.b.c.d.com.br` (NXDOMAIN) saiu da lista de «legítimos» do PoC: este acusava-o de regressão; o
   A/B provou 403 nas duas gerações (fail-closed herdado).
4. `undici` era **dependência-fantasma** (resolvia por hoisting, em manifesto nenhum) — declarado em
   `netlify/functions/package.json`.

**Base real vs. declarada:** o MC declara `df0439a`; o HEAD real era `719f45b` = `df0439a` + **só
documentação** (CLAUDE.md + `_logs/MC99.5.2.1e-RELATORIO.md`), zero código. Sem impacto na medição.

**Limites declarados (NÃO medidos / por desenho):** DNS rebinding **real** (exige DNS que responda
coisas diferentes em duas perguntas; o wildcard `sslip.io` é estático) — mas com o pin a 2.ª resolução
do `fetch` deixou de existir; 6rd e NAT64-custom **sem marcador** continuam a passar a classificação
(a ligação, essa, fica fixada ao IPv4 validado); nomes **IPv6-only** → 403 (fail-closed, custo já
aceite na 6.ª geração).

---

## MC99.5.3 — Performance + Opção A (faixas reservadas) + metodologia no repo (2026-09-27)

**Suíte:** frontend **453/453** · backend **686/692** (harness `mc966`, foreground). Commit do
trabalho `3fb6d1e`. **Nenhuma área fora do escopo tocada** (verificado por lista de permitidos sobre
o diff — `scripts/mc9953-verificacao-adhoc.mjs`).

**✅ Em produção (verificado no SEG5):** as 9 faixas devolvem `403/403/403` (3 sondas cada, com
cache-buster) e as fontes servidas são os 3 sobreviventes (`inter-400` 48 256 B, `jetbrains-400`
31 432 B, `orbitron-600` 11 800 B). A qualificação «não estava em produção» do validador está fechada.

### Frente B — Opção A: `isBlockedIp` passa a bloquear **9** faixas reservadas

As 6 do pedido (`192.0.0.0/24`, `192.88.99.0/24`, `192.0.2.0/24`, `198.18.0.0/15`,
`198.51.100.0/24`, `203.0.113.0/24`) **mais 3 que o validador adversarial mediu a passar** e que
foram aplicadas por **R15**: `192.31.196.0/24` (AS112-v4, RFC 7534), `192.175.48.0/24` (AS112
direct, RFC 7535) e `192.52.193.0/24` (AMT, RFC 7450). Medido antes: `isBlockedIp=false` e handler
`502`; depois: `true` e `403`. **Classificação honesta:** passavam a guarda, **não** eram SSRF vivo.

⚠️ **A classificação «não-roteável, risco nulo» é OTIMISTA — medido.** Em produção, as faixas
devolveram `200 image/png` **esporadicamente** (3 de 21 sondas; corpo PNG real de 503 B, 161×337):
o egress do Netlify **liga de facto** a alguma coisa nesses endereços. Não é SSRF a um serviço nosso,
mas **não é inalcançável**. Nota de instrumento: a 1.ª sonda deu `200` e a 2.ª `502` — **uma sonda em
produção não é uma medição** (cache de borda).

**Testes** (`_tests/img-proxy.test.mjs`, 10 asserções) com as **três** direcções: as 9 faixas
bloqueadas (incl. fronteiras), o **COMPLEMENTO** (16 vizinhos imediatos têm de continuar a PASSAR),
CDNs como controlo positivo, e — acrescentado na sequência do validador — **2 asserções de SÍTIO DE
CHAMADA** (handler → `403`; `resolverEEscolher("localhost")` → bloqueado). **Mutação:** 5/5 PROVADO
(`scripts/mc9953-prova-mutacao.mjs`, incl. «alargar demais» e «bloquear tudo») **+ 2/2** no sítio de
chamada (`scripts/mc9953-prova-callsite.mjs`).

⚠️ **Erro meu que o validador apanhou:** as asserções anteriores (4 minhas + 4 antigas) só exercitavam
`isBlockedIp`/`isBlockedHostname` **directamente** — 2 mutantes que abriam buracos **reais** no
handler e no `resolverEEscolher` deixavam a suíte **8/8 VERDE** (VÁCUO, código vivo; com C2 aplicado
`127.0.0.1.nip.io` chegou a `200` = SSRF vivo). **A suíte protegia a função, não o uso dela.** Fechado
pelas 2 asserções de sítio de chamada.

**PENDÊNCIA ESCALADA (decisão do operador):** 9 endereços **IPv6** de propósito especial dentro de
`2000::/3` (`2001:1::/32`, `2001:2::/48`, `2001:3::/32`, `2001:4:112::/48`, `2001:10::/28`,
`2001:20::/28`, `3fff::/20`, `2620:4f:8000::/48`) passam a **classificação** mas **não a guarda**, e
não são SSRF vivo (o pin fixa o A público). Fechar a família exigiria recusar **qualquer** IPv6 no
caminho do DNS — **parte os CDNs dual-stack**, o motivo da paragem do MC99.5.2.1d ⇒ **PARAR e
escalar**.

### Frente A — performance (A/B pareado obrigatório, cumprido)

- **Fontes (DEP2-06):** 15 ficheiros eram **3 conteúdos** (md5 `260c81a4`/`b636a65d`/`5d281085`);
  `src/fontes.css` aponta cada peso ao sobrevivente e os **12 duplicados foram removidos**
  (510 720 → 91 488 B). O `index.html` perdeu o preload do `inter-900` (era o mesmo conteúdo do 400).
  **Medido no browser, com o build real:** o gate usava os pesos 400/700/800/900 = **4 ficheiros do
  mesmo conteúdo (193 024 B) → 1 ficheiro (48 256 B)**.
- **A/B pareado:** braços alternados, mesmo build → **−144 859 B** exactos na 1.ª carga
  (1 098 439 → 953 580) e FCP **−32 / −12 ms**; contabilidade fecha (3×48 256 + 91 B de HTML).
- **Fundo mobile:** VP8 q75 — **200 068 → 106 942 B (−46,5 %)**, SSIM 0,9881, verificado a 1:1.
- **Preloads do MC99.3: MANTER.** 2 pares pareados (só os preloads mudam): bytes **idênticos**
  (953 580 nos dois) e **FCP melhor COM preload** (−24 e −12 ms). **Não** reproduz a refutação do
  MC99.3 (+50 ms contra) — amostra pequena e **local** (a de lá era em produção), declarado.
- **`ethers` no cold start: medido e NÃO TOCADO (HARD GATE 4).** 17 funções alcançam `ethers`, mas
  **zero endpoints do painel** (`admin-*`, `recursos-app`, `edicoes`, `produtos`, `cotas`, `health`,
  `banners`, `ranking`, `pontuacao`). A/B pareado (11 pares): `ethers` isolado **329 ms** vs builtin
  **5,4 ms**; grafo de `_lib/contract.mjs` **543 ms** vs `_lib/cors.mjs` **2,1 ms**. A cauda de cold
  start de 2,4–2,8 s (DEP2-13) é **idêntica em funções COM e SEM** `ethers` ⇒ **não é o ethers**.
  ⚠️ O «~2 s» que este ficheiro citava (MC88.31) **não se reproduziu**: 324 ms isolado / 541 ms grafo
  (máquina local, **não** Lambda — declarado). `lazy-load` em `auth-*` **não ganharia nada** (todo o
  pedido precisa de `verifyMessage`).
- ⚠️ **Erro do meu instrumento:** a 1.ª versão do servidor de A/B mandava `Cache-Control: no-store` —
  o browser voltava a pedir o mesmo ficheiro (preload **+** `url()` do CSS) e a contagem de bytes saía
  **dobrada**. Corrigido; a 1.ª medição foi **descartada**.
- Mutação Frente A: **5/5 PROVADO** (`scripts/mc9953-prova-mutacao-frente-a.mjs`).

### Frente C — `docs/METODOLOGIA-SEGURANCA.md`

Documento novo no repo (~18,5 kB, 12 secções): o método das 7 gerações, PoC antes de tocar, A/B
pareado, validador adversarial, controlos positivos, **pin no momento da ligação**, a lista como
cegueira, medir risco > estimar risco, **integridade do instrumento** (9 modos de mentir sem dar
erro), mutação de **3 estados**, e «passa a guarda» ≠ «SSRF vivo». **Complementa** as skills do
agente (que vivem em `~/.hermes/skills/`), não as substitui. Fecha com a tabela instrumento → produto
e a lista dos `scripts/mc9953-*.mjs` re-executáveis.

### Instrumentos novos (re-executáveis)

`scripts/mc9953-seg1-medir.mjs` · `mc9953-seg1-tempo.mjs` (A/B do ethers) ·
`mc9953-ab-performance.mjs` (A/B byte-level do build) · `mc9953-servir-dist.mjs` (servidor de A/B,
com o aviso do `no-store` no código) · `mc9953-prova-mutacao.mjs` · `mc9953-prova-mutacao-frente-a.mjs`
· `mc9953-prova-callsite.mjs` · `mc9953-verificacao-adhoc.mjs`.

⚠️ **Fica declarado, não corrigido:** `scripts/mc99521e-producao.mjs` imprime `VEREDITO PROD: FECHADO`
apesar de medir 6/6 faixas reservadas a passar (só conta a lista `MAL`) — **o rótulo é mais forte que
a medição que ele próprio imprime**; e `mc99521e-ab-guardas.mjs` **não inclui as faixas** na sua lista,
logo o «0 diffs» dele não é evidência sobre este commit.


---

## MC100 — Prontidão para o Dia D: diagnóstico + plano de transformação (2026-09-28)

**Natureza:** diagnóstico + plano. **Zero código alterado, zero commits, zero deploys.** Baseline `c56f899`
(local; `origin/main` = `40da2fe`; produção = MC99.5.3). **Artefactos:** `_logs/MC100_*.md` (cópias em
`Desktop/MC100_*.md`) · **Relatório:** `Desktop/MC100-RELATORIO.md`.

### Decisões do operador tomadas durante o MC (R18, em 3 lugares: aqui, `_logs/MC100_SEG-1_MEDICAO.md` §0, relatório)

1. **R18-1:** ler os 2 PDFs do Desktop («o objetivo final») e **actualizar este CLAUDE.md**. Revoga o «NÃO AUTORIZA
   alterar CLAUDE.md» do texto do MC100.
2. **R18-2:** relatório no Desktop ao final.
3. **R18-3:** **os PDFs são a fonte de verdade** do que o DesafioGUT vai ser → secção «ESCOPO-ALVO v6.0» no topo.

### Medido (SEG-1)

frontend **457/457** · backend **714/720** (6 saltados, 0 falhas; harness `mc966`, foreground) · `vite build` **exit 0**
(para o scratchpad, **não** para o `dist/`, que alimenta o APK) · **4 commits locais por publicar** (MC-SORTEIO-01a,
MC-ECOMMERCE-01a) · os 2 últimos deploys de produção em **`error`** (28/09 00:14Z) · Play Console **NÃO MEDIDA** (sem
sessão; os MCP de browser falharam a ligação); a evidência em disco é de 24/08 · **iOS inexistente**.

### Os achados que mais pesam

1. **R-01:** o Passe «produto digital» vendido por PIX esbarra no **Google Play Billing** e no **Apple 3.1.1**. O PDF
   afirma o contrário.
2. **R-02 + R-19:** a Relâmpago «dispensada» com **cada lance pago** (Regulamento v4 Art. 8º = PDF VG §8) choca com a
   política Real-Money Gambling. E a Gamified Loyalty exclui programas sujeitos a licença adicional, mas a Programada exige
   a SPA/MF. *A 1.ª versão lia uma divergência «só o vencedor paga»; foi refutada pelo validador (DEC-11 retirado).*
3. **DEC-09:** titular = **Ruan** (PDF) vs **Marinho** (texto do MC100).
4. **A ficha da Play preparada (MC90.4) diz «Leilão de menor lance único», categoria Finanças**
   (`ARTEFACTOS-RUAN/2-Documentos/MC90.4-FICHA-LOJA.txt:12,19,109-110`).
5. **Não existem:** Passe, cupons, palpite, estorno MP, repasse, «recebi» pelo comprador (hoje é o lojista/admin que
   marca «entregue», `produtos.mjs:476-492`), push, iOS.
6. **Base reutilizável (P1):** `voucher.mjs` → cupons · `recursos-app-config.mjs` → descontinuação · `mp-client.mjs` →
   estorno · `_lib/pedidos.mjs` → recebimento/repasse.

### Validador adversarial (SEG3): REFUTADO → corrigido

12 achados, todos aceites depois de verificados: DEC-11 inexistente (retirado; C18/MC105 sem objecto) · cláusula de
licenciamento da Play omitida (R-19) · contagem do checklist errada · IDs D-xx/DEC-xx desencontrados · dependências
circulares (C13↔C3) · `wallet.mjs` Vale-Crédito omitido (2.º saldo: preservação P10) · contradição interna do PDF sobre o
repasse · lacunas sem camada (C19 comunicações, C20 histórico, C21 saque) · errata 3.1.5(i)/AO/«Arremate» · normas
acrescentadas à matriz (#35–#41: limite de prémios, IR, ECA Digital, Marco Civil art. 15, CDC 31/37, billing alternativo,
Data Safety/analytics). Ver `_logs/MC100_SEG3_VALIDADOR.md`.

### Erros dos meus próprios instrumentos (declarados)

- A 1.ª versão do inventário tinha 3 contagens erradas (admin 21 → **22**, `_lib` 60 → **69**, páginas 22 → **31**),
  apanhadas por uma re-contagem antes de fechar o artefacto. Rotas: 35 `path=` / 37 com `index`.
- O verificador ad-hoc do SEG5 lia as colunas da matriz com o índice deslocado em 1. O controlo positivo expôs o
  defeito e corrigi-o antes da corrida real.
- As citações `REGULAMENTO-v4.md:15,43,55` que este ficheiro usa na secção NORTE estão **deslocadas**: `:15` é o Art. 6º
  (maioridade). As modalidades estão em **`:19` (Art. 8º)**, `:43` (Art. 20º) e `:25` (Art. 11º). Não reescrevi a NORTE
  (histórico); fica registado aqui.
- Um `grep -r` sem exclusões entrou nos `node_modules` e estourou os 120 s; refeito com `git grep`.

### Fecho

SEG3: validador adversarial em worktree próprio, 2 rondas (**REFUTADO** → corrigido → **APROVADO COM RESSALVAS** → ressalvas
corrigidas). SEG5: verificação ad-hoc **VERDE** (323 OK, 0 falhas; a 1.ª corrida foi um falso vermelho do instrumento, por
`.trim()` a comer o espaço de ` M` no `git status`, e está declarada). Git: só este ficheiro modificado + `_logs/MC100_*.md` novos.

### Não medido (L-4)

Play Console e App Store Connect (capturas pedidas em `_logs/MC100_ESTADO-PLAY-CONSOLE.md` §4) · o valor vivo do Blob
`config-experiencia:recursos_app` · se o webhook MP dispara hoje · o texto da Lei 5.768 art. 1º § 1º (planalto:
`ECONNRESET`) e da Res. CMN 5.100/2026 · o teto actual do MEI. **Nada jurídico ou fiscal aqui é parecer.**


---

## MC101 — Publicar o feito + medir o que estava por medir (2026-09-28/29)

**Natureza:** publicação + medição. **Zero código alterado.** Logs: `_logs/MC101_*.md` · Relatório: `Desktop/MC101-RELATORIO.md`.

### Decisão do operador (R18-4, 2026-09-28 ~23:53)

**«Só push»:** o `git push` dispara o auto-deploy (`stop_builds=false`) com `commit_ref`. **Não** se correu o `netlify deploy --prod
--build` manual que o texto do MC pedia. Razões medidas: o plano é **por créditos** (conta `credit-pro`; `getSite.plan` =
`nf_team_dev`), e um deploy manual por cima seria um 2.º deploy pago **sem `commit_ref`** (lição do MC93-F).

### Estado de produção (novo)

- `origin/main` = **`c56f899`** (push `40da2fe..c56f899`; o «Bypassed rule violations» é conhecido).
- Deploy automático **`6abb286376b6a700083eb5ce`**, ready em 136 s, **`commit_ref c56f899`**. É o `published_deploy`.
- `/.netlify/functions/pedidos`: **200 text/html (ausente) → 401 application/json `nao_autenticado`**. Funções 72 → 73.
- Bundle (BFS, 132 chunks): tem o novo Art. 14 (MC-SORTEIO-01a) e o `MeusPedidos` (MC-ECOMMERCE-01a); o Art. 14 antigo tem 0;
  o contrato mainnet está presente. Controlo: o URL permanente do deploy anterior dá o inverso. Sem regressão nos endpoints-chave.
- ⚠️ O endereço Sepolia **existe** no bundle em minúsculas, como **constante de guarda** `CONTRATO_ABANDONADO`
  (`src/components/AvisoRede.jsx:24`). É esperado. **Procurar endereços sempre sem distinguir maiúsculas.**

### Os deploys `error`: não é falha, é «no content change»

`6ab9b150…` (`59066bd`) e `6ab9b166…` (`40da2fe`), 2026-09-28T00:14Z: «Failed during stage 'checking build content for
changes': **Canceled build due to no content change**». Commits que não tocam em `desafio-gut/frontend` (só `_logs/`,
`scripts/` da raiz, docs). A hipótese do validador do MC100 («builds automáticos a falhar / Missing script: build») está
**refutada**: o `netlify.toml` tem `base = "desafio-gut/frontend"`, e os builds do git com código ficam `ready`.

### Flags: o valor vivo está no SUPABASE, não no Blob

Em produção `DATA_STORE_BACKEND=supabase` ⇒ a fonte é `public.config_remota` (`chave='recursos_app'`, 1 linha,
`atualizado_em 2026-06-21`). O Blob `config-experiencia` está **vazio**. Valor vivo = default do código
(`isLeilaoAtivo {ios:false, pwa:true, android:false}`, `isPagamentoNativoAtivo` false×3). O frontend lê em 3 camadas:
Supabase directo (chave anon) → função `/recursos-app` → `DEFAULT_RECURSOS` local.
⛔ **O APK é classificado como `pwa`:** `detectarPlataforma()` (`src/hooks/useRecursosApp.js:45-57`) só devolve `android` com
`window.GUT_NATIVE`/`__GUT_PLATAFORMA__`, e **nada os define** (o `MainActivity` é um `BridgeActivity` vazio). ⇒ o APK recebe
`isLeilaoAtivo:true`, e a chave `android:false` é **letra morta**. O `EM_BREVE_MODE` pode esconder o efeito visual. **Por decidir
pelo operador** (conformidade de loja); é código, candidato a MC futuro.

### Webhook MP: nunca foi processado com sucesso

| fonte de evidência | resultado |
|---|---|
| `saldo_rs_creditos` (Supabase) | 21 créditos, **21 `confirmar-pagamento` · 0 `webhook`** (06-21 → 09-23) |
| Blob `mp-aprovados` | **24/24 `confirmar-pagamento`** (05-03 → 09-23) |
| Blob `saldo-rs-creditos` (legado) | 8/8 `confirmar-pagamento` |

O webhook grava `mp-aprovados` **sem condição e antes de creditar** (`webhook-mercadopago.mjs:174-182`), e o
`confirmar-pagamento` nunca sobrescreve um `approved`. Logo **nenhum webhook passou da validação em 24 aprovações**. O
`POST /v1/payments` **não envia `notification_url`** (`_lib/pix-provider/mercadopago.mjs:61-72`): a entrega depende só do painel
do MP. Causas possíveis, **não distinguíveis sem o operador**: (a) não está registado no painel; (b) é rejeitado (por exemplo,
segredo diferente → 401, visível no Sentry como `webhook_mp_rejeitado`). O endpoint está vivo (GET → 200 JSON). Env:
`MP_WEBHOOK_SECRET` definida, `ALLOW_UNSIGNED` ausente.
⇒ O **estorno automático (C3/MC109) não pode assumir um ciclo de notificações do MP que funcione.**

### Validador (SEG3): APROVADO COM RESSALVAS → 2 ⛔ + 3 ⚠️ confirmados e corrigidos

Os dois ⛔ eram **meus**: (1) o efeito das flags no APK (li o valor e não o detector de plataforma); (2) «um webhook tardio não deixa
rasto» (li a idempotência do crédito e não a escrita incondicional no `mp-aprovados`). A correcção do (2) permitiu uma
**conclusão mais forte**.

### Para o operador

1. Ver o registo do webhook no **painel do Mercado Pago** e os alertas `webhook_mp_rejeitado` no **Sentry**.
2. Decidir sobre o **APK tratado como pwa** (`isLeilaoAtivo:true` no Android).
3. (opcional) Um `ignore` no `netlify.toml` para commits só de docs. Não executado.


---

## MC102 — «Recebi» pelo comprador (C13) + prazo de arrependimento de 7 dias (2026-09-29)

**Commits:** `814d3a3` (feat) + `c408dd0` (testes do validador) · **Produção:** deploy `6abb39cf…` (ready, `commit_ref c408dd0`).
Logs: `_logs/MC102_*.md` · Relatório: `Desktop/MC102-RELATORIO.md`.

### Decisões do operador (R18)
1. Autorizados, além da lista do MC: **`src/lib/pedidos.js`** e **1 linha em `src/pages/MeusAtivos.jsx`** (`endereco={address}`).
   Motivo: usar o contexto dentro do `MeusPedidos` quebraria o arnês do `MeusAtivos.test.mjs` (o alias só troca `../context/AppContext.jsx`).
2. O prazo de arrependimento fica **só na API** (nenhum texto novo no ecrã).

### O que existe agora
- **Botão «Recebi»** no cartão do pedido (`src/components/meus-ativos/MeusPedidos.jsx`). Aparece só se `podeMarcarRecebido(pedido, endereco)`:
  dono (sem distinguir maiúsculas) + há rastreio + ainda sem `recebido_em`. Estado novo **«Recebido»**.
- **`PUT /pedidos?acao=recebido&produtoId=`** → `marcarRecebido()` (`_lib/pedidos.mjs`):
  - sem sessão → 401;
  - **outro endereço → 404 `pedido_nao_encontrado`** (padrão do ficheiro: não confirma que o pedido existe; o MC pedia 403, desvio declarado e aceite pelo validador);
  - sem rastreio → 409 `pedido_nao_enviado`;
  - idempotente em série: nunca reescreve `recebido_em`.
  - O `marcar-entregue` do lojista/admin **coexiste, intocado**.
- **`prazoArrependimento()` + `anexarArrependimento()`:** o `GET /pedidos` (comprador e admin, lista e por id) traz `arrependimento {inicio, fim, fonte, dias:7}`.
  - Início = `recebido_em`; senão o **`entregue_em` do PRODUTO** (o pedido não tem esse campo); senão `null`.
  - Calculado na leitura, nunca gravado.
  - ⚠️ `fim` = +7×24 h. A contagem civil (CC art. 132) é decisão jurídica por tomar.

### Validação
- Suíte **469/469 · 730/736**.
- Mutação **26/26** (A 10 · B 8 · C 8), incluindo os **6 mutantes do validador** que antes sobreviviam.
- `validar:dist` corrido **no bundle servido** (o `dist/` local é o do APK), com controlo positivo e negativo.
- SEG5 VERDE.

### ⛔ Pendente (reportado, não corrigido)
- **Corrida sem CAS em `gravar()`:** «Recebi» e NF-e em paralelo → a NF-e perde-se com 200.
  - A causa é anterior ao MC102 (o escritor é partilhado).
  - O `@netlify/blobs` instalado é o **8.2.0, sem `onlyIfMatch`** ⇒ a correcção exige actualizar a dependência.
  - **Candidato a MC antes de haver volume real.**
- Um rastreio corrigido depois do «Recebi» deixa `recebido_em < enviado_em` (decisão de produto).
- Sem diálogo «tem a certeza?»: um toque acidental abre o prazo mais cedo (decisão de produto).

### Lição de instrumento
`grep -c $'
$'` no MSYS «contou» CRLF em ficheiros que são **LF** (medido em bytes com Python). **Medir os fins de linha em bytes, nunca com o grep do MSYS.**

---

## MC102.0 — Escrita condicional (CAS) no pedido (2026-09-29)

**Commits:** `d8a1547` (1.ª versão, REFUTADA) + `3730c6c` (correcção). Logs: `_logs/MC102.0_*.md` · Relatório: `Desktop/MC102.0-RELATORIO.md`.

### Decisões do operador (R18)
1. **Retry da operação inteira (opção C)**: o PoC do SEG-1 provou que «CAS só dentro do `gravar()`» **não fecha a corrida** (os 4 chamadores lêem antes; perdia-se o `recebido_em` com 200). Excepciona o HARD GATE 3 para os 4 chamadores, com as **assinaturas exportadas iguais**.
2. **`pedidos.mjs` (handler): só o mapeamento** `conflito_escrita` → **409** e `etag_indisponivel` → **503**.

### O que existe agora (`_lib/pedidos.mjs`)
- **`atualizarPedido(produtoId, mutar)`**: `getWithMetadata` (etag) → `mutar(pedido)` → `gravar`, **no máximo `MAX_TENTATIVAS_CAS = 3`**. O retry só acontece em `conflito_escrita`, e as guardas voltam a ser avaliadas em cada tentativa. Consequência: uma morada concorrente com o envio passa a dar `pedido_ja_enviado`. Os chamadores são `definirMorada`, `marcarRecebido`, `definirRastreio` e `definirNfe`. **Qualquer escritor novo do pedido (webhook Frenet MC102.1b, repasse MC110, estorno MC109) TEM de passar por `atualizarPedido`.**
- **`gravar(pedido, evento, etag)`** usa **`s.set(chave, JSON.stringify(pedido), { onlyIfMatch: etag })`**:
  - sem etag → `etag_indisponivel` (fail-closed);
  - `modified:false` → `conflito_escrita`;
  - `modified:true` **sem** `etag` → `etag_indisponivel` (é erro do servidor, não gravação).
- `definirRastreio` e `definirNfe` só notificam se a escrita teve sucesso.

### ⛔ Três armadilhas do `@netlify/blobs`, medidas no `dist/`, não no `.d.ts`
1. **O `setJSON` (10.0.0 até 10.4.x) NÃO envia `If-Match`**, porque espalha as condições com `...conditions`. **Usar `set()`.** Corrigido na 10.7.13.
2. Com condição, **qualquer estado ≠ 412 (403, 5xx) devolve `modified:true`**, em todas as versões até à 11.1.1. Só um `etag` na resposta confirma a escrita.
3. Um **`onlyIfMatch` falsy é ignorado em silêncio**, e a escrita sai incondicional.
- O `BlobsServer` oficial **não envia ETag no GET**. Na 10.0.0 no Windows, dá 500 em chaves com `:`. **Não serve para provar CAS.** Usar `scripts/mc1020-cliente-real.mjs`: cliente real + `_lib` real + servidor HTTP com If-Match; tem controlo positivo, e com `setJSON` dá VERMELHO.

### Validação
- Suíte: **469/469 · 745/751**.
- Mutação: **10/10** (`scripts/mc1020-prova-mutacao.mjs`, com M0 «voltar ao `setJSON`»).
- Validador: **REFUTADO** na 1.ª ronda, **APROVADO COM RESSALVAS** na 2.ª.
- O `npm audit` ficou igual (30 → 30).
- O `setJSON` do 1.º commit deu 7/7 na mutação **porque os duplos eram mais estritos que a biblioteca real**. Um duplo de biblioteca externa copia-se do `dist/` real.

### ⚠️ Riscos documentados (decisão do operador)
- **O ETag no GET em produção NÃO está medido.** Produção tem **0 pedidos**. Se a produção não o devolver, as 4 escritas dão 503 (falha visível, sem perda). **A 1.ª escrita real é a medição.**
- Falso sucesso residual: um erro que traga ETag. ETag fraco `W/` dá 409 sempre. Um 5xx leva 25 s de retries do cliente.
- Continuam sem CAS: `garantirPedido` (criação, `setJSON` incondicional). Os pedidos também não são anonimizados pelo `conta-delete` (usa `endereco`, e o pedido tem `comprador`). As duas coisas são anteriores a este MC.
- **O ESLint do projecto ignora `netlify/functions`**: não há lint efectivo no backend.
- Disco C: esteve a **0 bytes** (ENOSPC) durante o MC. Libertados ~9 GB (cache do npm + 7 worktrees de validador). Continua a haver um consumidor externo por identificar. Há um directório órfão de 1,6 GB em `.claude/worktrees/agent-a910933…`, cópia antiga com `secrets/`, **não apagado** (decisão do operador).

---

## MC102.1a — Estrutura do rastreio: contrato + mock, mapa PT-BR, timeline (2026-09-29)

**Commits:** `80c69fe` (feat) + `16095ba` (achados do validador). Logs: `_logs/MC102.1a_*.md` · Relatório: `Desktop/MC102.1a-RELATORIO.md`.
Não integra a Frenet (MC102.1b), não tem webhook, não tem `FRENET_TOKEN`. `_lib/pedidos.mjs`, `pedidos.mjs` e `src/lib/pedidos.js` **não foram tocados**.

### Decisões do operador (R18)
- DEC-102.1-C…G: vêm do enunciado (Meus Ativos · webhook · 5 passos + banners · fallback só com o código em bruto · Frente B do MC102.1 fechada).
- **DEC-102.1-H (tomada no SEG-1):** os rótulos. Passos: `0` Postado · `1` A caminho · `2` Na cidade de destino · `3` Saiu para entrega · `4` Entregue. Alertas: `A1` Tentativa de entrega sem sucesso · `A2` Aguardando retirada na agência · `A3` Devolvido ao remetente.

### O que existe agora
- **`netlify/functions/_lib/rastreio.mjs`**: `consultarRastreio(codigo, transportadora, { adaptador = ADAPTADOR_REAL })`.
  - Sucesso: `{ ok:true, eventos:[{data,codigo,local,descricao}] }`, só estas 4 chaves e só como texto (os objectos passam a `null`).
  - Falha: `{ ok:false, code, fallback:{codigo} }`, com `code` ∈ `adaptador_indisponivel` · `falha_adaptador` · `resposta_invalida`.
  - **`ADAPTADOR_REAL = null`**: em produção tudo cai no fallback até ao MC102.1b.
- **`_lib/rastreio-mock.mjs`: SÓ testes.** O mock **é injectado pelo chamador**; o módulo de produção não o importa. Um import condicionado a `NODE_ENV` meteria o mock no bundle, porque o esbuild segue imports estáticos.
- **`src/lib/rastreio.js`**:
  - `MAPA_EVENTOS` (frozen);
  - `traduzirEvento(codigo, descricao)`: código desconhecido devolve a descrição original; usa `Object.hasOwn`;
  - `construirTimeline(eventos)`: **sempre 5 passos**; um passo adiantado implica os anteriores; data mais antiga por `Date.parse`; alertas pela ordem de chegada; **`local`/`descricao` nunca saem**;
  - `timelineDoRastreio(rastreio)`: devolve `null` sem `rastreio.eventos`.
- **`TimelineRastreio.jsx`**: 5 passos ●/○ com data dd/mm em hora de Brasília; alertas como banners `role="status"`; `fallback` mostra só o `<code>`, sem `<a>`.
  - No cartão de `MeusPedidos.jsx` (+5 linhas) entra **depois** da linha `🚚 transportadora: código`, que continua lá. O «Recebi» não mudou.
- **Contrato proposto ao MC102.1b:** os eventos gravam-se em **`pedido.rastreio.eventos`**, com os códigos genéricos, **através de `atualizarPedido`** (regra MC102.0). Hoje nenhum pedido os tem ⇒ **o ecrã de produção fica igual**.

### ⛔ HARD GATE 13 — uma varredura textual NÃO prova que o mock fica fora do bundle
O 1.º teste procurava `rastreio-mock` no texto dos ficheiros. O validador mostrou que `export … from "./rastreio-mock.mjs"` (ou `\x2d`) deixava o teste **verde** e **o mock entrava no bundle esbuild**. Agora há um teste que segue o **grafo real**: `esbuild.build({bundle, write:false, metafile, packages:"external"})` sobre todas as functions + `_lib/rastreio.mjs`, e nenhum `inputs` pode ser o mock. Tem **controlo positivo pela forma escapada**. O `esbuild` 0.25.5 está no lockfile das functions (a guarda do MC93-E confirma-o com um teste próprio).
> **Regra:** para provar que um módulo fica fora de um bundle, pergunta-se ao bundler (metafile), não ao grep.

### Validação
- Suíte: **495/495 · 756/762**. O backend tem +4 e não +3: o 4.º é o teste que a guarda do MC93-E gera por o `_tests` importar `esbuild` (medido por diff dos nomes de teste).
- Mutação: ronda 1 **26/26** (A 7 · B 10 · C 9); ronda 2 **15/15** sobre os sobreviventes do validador.
- Validador: **APROVADO COM RESSALVAS**. Os 3 ⚠️ e os 4 ℹ️ técnicos foram corrigidos; o ⚠️ de R20 foi escalado.
- ⚠️ **Instrumento:** um escape `\\u002d` consumido ao escrever o spec fez um mutante entrar **sem o escape**. Deu RED pelo motivo errado. **Confirmar o CONTEÚDO do que entrou, não só que o ficheiro mudou.**

### ⛔ Pendentes (decisão do operador, para o MC102.1b; nada disto é visível em produção antes dele)
1. Os alertas continuam visíveis depois de «Entregue» (hoje A3 + 4 mostra «Devolvido ao remetente» ao lado de «● Entregue»).
2. Deduplicação ou limite de alertas (hoje N tentativas geram N banners).
3. A ordem dos alertas (hoje é a de chegada).
4. Formato e fuso da data (hoje dd/mm em Brasília).
5. Se `local`/`descricao` (texto livre, que pode trazer nome ou morada) se gravam no pedido; o validador recomenda gravar só `{data, codigo}`.
6. UX com «4 Entregue»: o estado «Enviado» e o «Recebi» aparecem ao lado da timeline «Entregue».
> ✅ As 6 foram decididas no MC102.1b (DEC-102.1b-1…6) e estão aplicadas: ver a secção seguinte.

---

## MC102.1b — Frenet real + refinamentos da timeline (2026-09-29)

**Commits:** `0c99674` (Frente 0) · `0f68158` (A+B+C) · `7476330` (E2E) · `de3ead6` (achados do validador) + docs. Todos publicados pelo auto-deploy.
Logs: `_logs/MC102.1b_*.md` · Relatório: `Desktop/MC102.1b-RELATORIO.md`.

### Decisões do operador (R18)
| # | Decisão |
|---|---|
| DEC-102.1b-1 | Alertas **escondidos** depois de «Entregue» |
| DEC-102.1b-2/-7 | Um banner por código. A1 repetido → «N tentativas de entrega»; A2/A3/… sem contagem. Data = a ocorrência **mais recente**; ordem pela **1.ª ocorrência** |
| DEC-102.1b-3 | Ordem cronológica |
| DEC-102.1b-4 | `dd/mm`, hora de Brasília (já era) |
| DEC-102.1b-5 | Grava-se no pedido **só `data` + `codigo`** (LGPD) |
| DEC-102.1b-6/-8 | Estado do cartão: `recebido` (comprador) > **`entregue`** (a timeline chega ao passo 4) > `enviado`. O «Recebi» continua a aparecer com «Entregue» |
| DEC-102.1b-9 | EventType Frenet → genérico: 0→`0` · 1→`1` · 5→`3` · 9→`4` · 18→`A2` · 3→`A3` · 2→**`A4` «Entrega atrasada»** · 4→**`A5` «Objeto extraviado»**. O passo `2` e o `A1` não têm equivalente Frenet |
| DEC-102.1b-10 | Consulta só Correios, com serviço fixo **SEDEX 03220**; o webhook casa pelo **`TrackingNumber`**. O operador confirma o custo e o alcance do webhook com a Frenet |
| DEC-102.1b-11 | Vários pedidos com o mesmo código (um pacote) → **todos** recebem o evento |
| — | `FRENET_TOKEN` actual mantém-se até ao MC102.1b fechar; é rotacionado com a migração para o titular do MEI (DEC-09) ou via suporte |

### O que existe agora
- **`_lib/rastreio-frenet.mjs`**: `POST https://api.frenet.com.br/tracking/trackinginfo`, header `token` (de `process.env.FRENET_TOKEN`), `AbortSignal.timeout(8000)`.
  - ⚠️ **A API responde HTTP 200 aos erros**, com a mensagem em `ErrorMessage`. Tem de ser lida (medido no PoC).
  - Um código sem eventos dá 200 vazio. Sem `ShippingServiceCode`, a API recusa.
  - `dataFrenetParaIso("dd/mm/aaaa hh:mm")` → ISO −03:00. ⚠️ **Assume Brasília** (a doc não diz o fuso). Valida o dia por ida e volta, porque o `Date.parse` do V8 aceita 31/02.
  - `_lib/rastreio.mjs`: `ADAPTADOR_REAL = adaptadorFrenet`. ℹ️ **Nenhum handler chama o `consultarRastreio` hoje.** O caminho vivo é o webhook.
- **`webhook-frenet.mjs`**, com esta ordem:
  1. POST;
  2. **fail-closed**: sem `FRENET_WEBHOOK_TOKEN` → **503**;
  3. header **`x-frenet-token`** comparado com `timingSafeEqual` → 401;
  4. `TrackingNumber` → `encontrarPedidosPorRastreio` (**estrita**: um store em falha dá 503; nunca é «não encontrado»);
  5. código desconhecido → 200 `ignorado`;
  6. `registrarEventosRastreio` em cada pedido que casa; **reenvio → 200 `duplicado`, sem escrita**; conflito CAS → 503.
- **`_lib/pedidos.mjs`**:
  - `registrarEventosRastreio` **via `atualizarPedido`** grava `rastreio.eventos[{data, codigo}]`:
    - data em **ISO UTC canónico** (dedup por instante);
    - só códigos `/^(?:[0-4]|A[1-5])$/`;
    - dedup `data|codigo`;
    - no máximo **50** (os mais recentes).
  - `atualizarPedido`/`gravar` **não mudaram**.
- **`src/lib/rastreio.js`** + **`src/lib/pedidos.js`**: as 6 decisões. `ROTULO_ESTADO.entregue = "Entregue"`.

> ⚠️ **Validação de 2026-09-30: PARADA no passo 1.** O operador reportou o segredo configurado, mas o `FRENET_WEBHOOK_TOKEN` **não existe no site** `silly-stardust-ca71bc`. Está ausente nos 4 contextos, e nenhuma variável com grafia parecida existe (controlo positivo: o `FRENET_TOKEN` é visto). A produção responde 503 `webhook_nao_configurado`. ⚠️ Um `netlify env:set … | Out-Null` também **esconde os erros** do CLI: confirmar pelo exit code ou pelo painel. Ver `_logs/MC102.1b_VALIDACAO-WEBHOOK.md`.

### ⛔ Para o webhook funcionar (operador; NÃO executado)
1. Definir **`FRENET_WEBHOOK_TOKEN`** no Netlify (production). É um segredo **novo**, diferente do `FRENET_TOKEN` da API.
2. Painel da Frenet → «Atualização de Tracking»:
   - URL `…/.netlify/functions/webhook-frenet`;
   - **TOKEN_NAME `x-frenet-token`**;
   - TOKEN_VALUE = o mesmo segredo.
3. Confirmar com o suporte: (a) o **custo por consulta** (a Frenet tem planos pagos; R2); (b) **se o webhook dispara para códigos não criados na Frenet**. Pela doc, o webhook envia `OrderId`/`ShipmentId` de envios da plataforma, e o nosso lojista escreve o código à mão.

### Validação
- Suíte **508/508 · 788/794**.
- Mutação: 14/14 (F0) · 15/15 (A) · 17/17 (B+C) · 8/8 (correcções).
- E2E contra a Frenet real e a produção: **VERDE 17/17** (`scripts/mc1021b-e2e-frenet.mjs`, v2). O token não está nos 1708 ficheiros versionados nem nos 131 chunks servidos.
- Validador: **APROVADO COM RESSALVAS**. Corrigidos:
  - o store em falha dava 200 e perdia o evento;
  - um pacote com vários pedidos só gravava no 1.º;
  - a dedup falhava entre fusos;
  - a data ilegível ficava como a mais recente;
  - a lib aceitava data ou código arbitrários;
  - o script carregava todos os segredos.

### ⚠️ Pendentes
- O **fluxo com um pedido real** (webhook → pedido → timeline em produção) não foi medido: a produção tem 0 pedidos e o webhook está fail-closed.
- `definirRastreio` (MC102) **apaga os eventos** se for chamado de novo com o mesmo código. Por decidir num MC próprio.
- Um evento expulso (acima de 50) volta a entrar se reenviado (raro). Cada POST lista todos os pedidos (O(N)): precisa de índice com volume.
- `src/pages/admin/Pedidos.jsx` mostra «Entregue» (e «Recebido») com a cor de aviso: só `enviado` é verde. Não autorizado neste MC.
- `desafio-gut/frontend/package-lock.json` já estava **modificado antes do MC** (84 linhas, padrão do `netlify deploy --build`). Não foi commitado.

---

## MC103 — Mecanismo de transição + medição do legado (2026-09-30)

**Natureza:** preparação + medição. Nada ligado, nada escondido, nada apagado. Logs: `_logs/MC103_*.md` · Relatório:
`Desktop/MC103-RELATORIO.md`. **Validador: APROVADO COM RESSALVAS** (0 bloqueantes; ressalvas técnicas corrigidas por R15).

### Frente A — flags de TRANSIÇÃO (para o MC111)
`_lib/recursos-app-config.mjs` → `DEFAULT_FLAGS_TRANSICAO`:
`isProgramadaSenhasAtiva:true` · `isTorneioVisivel:true` · `isSenhaBonusAtiva:true` · `isCampanhaIndicacaoAtiva:false` ·
`limitePassesIndicacao:5`. `resolverRecursos` devolve-as além das 2 antigas; `/recursos-app` expõe-nas sem alteração.
- **Escalares GLOBAIS**, não mapas por plataforma (interpretação D5 do executor, literal do enunciado; reversível).
  Um mapa `{ios,android,pwa}` gravado numa flag nova **cai no default** (testado).
- Leitura **estrita**: `Object.hasOwn` (protótipo poluído não conta — regra MC93-D) + boolean só `typeof boolean`,
  limite só `Number.isSafeInteger && >= 0`. Lixo → default, sem coerção.
- **Nenhum consumidor as lê hoje.** A/B pareado 0/30 (e 0/252 no validador) nas chaves antigas.
- Testes `_tests/mc103-flags-transicao.test.mjs` (12, incl. USO pelo handler real) · mutação **18/18**.
- ⛔ **Para o MC111 ler uma flag no cliente:** `src/hooks/useRecursosApp.js` lê o Supabase **directamente** com espelho
  próprio (`resolverParaPlataforma` + `fallbackLocal`) que devolve só as 2 chaves antigas → estender o espelho.
- ⚠️ As 2 flags antigas continuam a ler pela cadeia de protótipos (`cfg[chave]`) — não tocadas (HARD GATE 4).
- ⚠️ `src/lib/leilaoLock.js` **não lê flags** (é o `EM_BREVE_MODE`); o enunciado dizia o contrário.

### Frente B — legado medido (só SELECT / leituras públicas; só agregados)
| tipo | contas | valor |
|---|---|---|
| Saldo R$ (`saldo_rs`) | 7 de 8 | **R$ 23,75** (6 até R$ 10, 1 entre R$ 10–50) |
| Créditos PIX históricos | 21 registos / 8 contas | R$ 58,00 · débitos registados: **0** |
| Senhas on-chain | **1** | **12** (nominal R$ 24,00) — confirmado por logs completos desde o deploy |
| Dívidas de bónus (`rankings_ciclo`) | 0 | 0 (tabela vazia) |
| Vale-Crédito (`wallet` + Blob legado) | 0 | R$ 0,00 |

- ⛔ **R$ 10,25 sem destino:** R$ 58,00 − R$ 23,75 = R$ 34,25 consumidos, as 12 senhas explicam R$ 24,00. O MC111 tem de
  reconstituir antes de liquidar.
- O Blob legado `saldo-rs` (5 chaves) está **todo sombreado** pelo Supabase (comparação por md5) → o saldo vivo é o do Supabase.
- O Vale-Crédito vive no **Supabase `wallet`** (MC36.1); o Blob `wallet` é só fallback legado.

### ⚠️ Instrumento: RPC público que devolve VAZIO em silêncio
`rpc.flashbots.net` devolve **0 logs** para intervalos históricos (USDC em junho: 0; `rpc.mevblocker.io`: 8736).
publicnode e drpc **recusam** (archive/plano pago). **Toda a leitura de logs on-chain precisa de controlo positivo num
contrato movimentado no MESMO intervalo.** Sem ele, este MC teria reportado «0 senhas» com confiança.

---

## MC104 — LGPD técnico: prova do aceite + exportação completa (2026-09-30)

Logs: `_logs/MC104_*.md` · Relatório: `Desktop/MC104-RELATORIO.md`. **Validador: APROVADO COM RESSALVAS** (1 ALTA → decidida e corrigida).

### Decisões do operador (R18, durante o MC)
1. O aceite vai para o Blob **`consent-log`** existente (não para tabela nova): já é exportado, apagado, retido 5 anos e salvaguardado.
2. O aceite é enviado **depois do login**, a partir do `AppContext.jsx` (o gate corre ANTES do login: não há endereço no clique).
3. A exportação cobre os 5 tipos **e** as tabelas que migraram para o Supabase.
4. **O aceite do aparelho vale só para a 1.ª conta** que entra depois do clique. As seguintes ficam **sem** registo (não com um falso).

### Frente A — prova do aceite (LGPD art. 8º §2º)
- `POST /consentimento` (`consentimento.mjs` + `_lib/consentimento.mjs`): **só o próprio titular** (admin → 403). Grava em
  `consent-log` com a chave `${ts}:${endereco}` de sempre: `{endereco, aceiteEm (SERVIDOR), aceiteDeclaradoEm (cliente),
  termoVersao, aceitos:{lido,maiores,termos,privacidade}, ip, userAgent, contexto:"gate-legal"}`. `GET ?endereco=` = titular ou admin.
- Validação estrita: versão = `VERSAO_GATE` (teste exige = `VERSAO_CONSENTIMENTO` do gate); as 4 declarações exactamente
  `true`; data ISO **com ida e volta** (o V8 aceita `2026-02-31T…Z`!) e **não posterior à chegada** (+5 min).
  Idempotente por (versão, hora declarada).
- Cliente: o gate guarda `aceitos`; `src/lib/consentimento.js` fixa `titularLocal` **antes** do envio e marca `enviadoPara`
  só com resposta ok; `useEffect([address, authToken])` no AppContext.
- ⚠️ **Quem aceitou antes do MC104 não tem prova no servidor** (o aceite antigo não tem as declarações; P10). Forçar novo
  aceite = subir `VERSAO_CONSENTIMENTO` → decisão de produto (MC115).
- ⚠️ `comprar-senhas.mjs:41` continua com `termoVersao:"v2026-05"` fixo, dessincronizado do gate.
- ⚠️ Escrita concorrente no mesmo ms perde um registo (Blobs 8.2.0 sem escrita condicional).

### Frente B — exportação (LGPD art. 18) — `exportar-dados.mjs`
- **Os pedidos nunca eram exportados**: o dono está em `comprador` e só se procurava `endereco`/`address`. Corrigido.
- Novo: `lances_relampago` (só os lances DO titular dentro do Blob legado por edição) e `supabase` (`getSupabaseReadOnly`):
  `saldo_rs`, `troco_senhas`, `wallet`, `saldo_rs_creditos`/`debitos` (`payload->>endereco`), `lances`, `lojistas`,
  `atividade_utilizadores`, `pontuacoes`, `rankings_ciclo`, `cotas` (`cliente_id` OU `endereco`). Sem Supabase →
  `{disponivel:false}`; erro numa tabela → `null` + `erros` (nunca parece vazio). Chaves antigas mantidas. Logs mascarados.
- Palpites: **não existem** (nenhuma chave inventada).
- ⚠️ **Ainda fora** (candidatos ao MC115): Blobs `referral-*`, `fingerprint`, `notificacoes`, `pedidos-pagos`/`-meta`;
  tabelas `admin_logs`, `usuarios_bloqueio`, `notifications`.

### Testes
`_tests/mc104-consentimento.test.mjs` (9) · `_tests/mc104-exportar-dados.test.mjs` (8; Supabase em duplo com **esquema real**
— coluna inexistente → 42703 — e dados de terceiro em todas as fontes) · `src/lib/consentimento.test.mjs` (8, incl. cablagem).
Mutação **31/31** (`scripts/mc104-prova-mutacao.mjs todos`).

---

## MC104.1 — Flags de transição no cliente (2026-09-30)

Logs: `_logs/MC104.1_*.md` (+ `MC104.1_AB.json`) · Relatório: `Desktop/MC104.1-RELATORIO.md`. **Validador: APROVADO COM RESSALVAS** (0 bloqueantes).

- `src/hooks/useRecursosApp.js`: `DEFAULT_FLAGS_TRANSICAO` (igual ao backend — teste exige) + `lerFlagsTransicao` com a **mesma
  regra** (`Object.hasOwn`; boolean só `typeof boolean`; número só `Number.isSafeInteger && >= 0`). Entra nos **3 caminhos**
  (Supabase directo · função `/recursos-app` · fallback local), no **estado inicial** e no **tempo real**. Antes, até o caminho
  da função **deitava fora** as chaves que o servidor já mandava desde o MC103.
- Nenhum consumidor lê as flags (CardLance/MercadoLances só usam `isLeilaoAtivo`/`isLoading`). A/B pareado **0/39** nas chaves antigas.
- ⛔ **Para o MC111:** o cliente já vê as flags; falta **usá-las** (nenhum componente as consulta) e gravá-las em `config_remota`.
- **Instrumento novo:** `src/hooks/__tests__/_recursos-arnes.mjs` carrega o hook REAL pelo Vite (`ssrLoadModule`; os imports
  do hook **não têm extensão** e o node puro não o importa) com **alias** que troca só `../lib/supabaseClient` por
  `_supabase-duplo.mjs` (inclui canal de tempo real e `emitirRealtime`). Com o condutor `_hook-runner.mjs` (MC94) testa-se o
  hook montado. `scripts/mc1041-ab-recursos.mjs <ref>` = A/B pareado contra qualquer commit.
- Testes `src/hooks/useRecursosApp.test.mjs` (12; paridade com o backend input a input) · mutação **18/18**.

---

## MC104.2 — Anonimização completa no conta-delete (2026-09-30)

Logs: `_logs/MC104.2_*.md` · Relatório: `Desktop/MC104.2-RELATORIO.md`. **Validador: APROVADO COM RESSALVAS** (0 bloqueantes; lacunas de teste corrigidas).

- **O bug:** o store `pedidos` já estava em `BLOBS_ANON`, mas `chavesDoEndereco` só via `endereco`/`address` e o dono do
  pedido está em **`comprador`** ⇒ 0 pedidos anonimizados; morada/CPF/nome ficavam. E a morada é **aninhada**
  (`pedido.morada.{nome,cpf,…}`): a remoção de chaves de topo nunca lhe chegava.
- **A correcção (só `_lib/conta-delete.mjs`):** procura `endereco ?? address ?? comprador` (os campos da exportação do MC104;
  mantido o `??` do código existente); `comprador` → `ENDERECO_ANONIMO`; cada campo de `morada` → `"***"` (`null` fica `null`).
  **`nfe` intacta** (nº/série/chave — LGPD art. 16, I). Nada é apagado. `delete-account.mjs`/`pedidos.mjs` intactos.
- A/B pareado (`scripts/mc1042-poc-ab.mjs <copia-HEAD> <novo>`): HEAD 0 anonimizados → novo 1; terceiros e sem-comprador iguais.
- Testes `_tests/mc1042-conta-delete-pedidos.test.mjs` (9, incl. `deepEqual` «só comprador e morada mudam») · mutação **11/11**
  (`scripts/mc1042-prova-mutacao.mjs`). Suíte 528/528 · 826/832.
- ⛔ **Para o operador:** o índice `comprador:<endereço>` (valor `{ids}`) **fica** e religa o endereço aos pedidos anonimizados
  (e à chave da NF-e) — esvaziar `ids` é decisão (o MC proibia apagar). Também ficam `txHash` e `rastreio.codigo`.
- ⚠️ A escrita é `setJSON` incondicional (não passa por `atualizarPedido`, que não é exportado): uma escrita CAS concorrente pode
  perder um evento de rastreio; a privacidade fica segura (a CAS atrasada recebe 412 e relê o anonimizado).
- ⚠️ Anterior ao MC, fora do escopo: o Blob `notificacoes` (mensagens de rastreio/NF-e por endereço) não é apagado;
  `lances-relampago` é exportado mas não apagado; `DADOS_RETIDOS.fiscal` não menciona a NF-e dos pedidos.
- ℹ️ A procura é partilhada: o hard-delete de `lance-idem` também casa `comprador` quando falta `endereco` (sem escritor real hoje).

---

## MC104.3 — Pendências LGPD do MC104.2 fechadas no conta-delete (2026-09-30)

Logs: `_logs/MC104.3_*.md` · Relatório: `Desktop/MC104.3-RELATORIO.md`. **Validador: APROVADO COM RESSALVAS** (0 bloqueantes; 3 ⚠️ tratados).

- **A** índice `comprador:<endereço>` → `anon:<sha256(endereço normalizado)>` = `{ids:[]}`, a chave antiga sai. `chaveAnonima()` é
  determinística e **pseudónima** (sem sal: quem tem a carteira recalcula).
- **B** notificações (Blob `notificacoes`, chave = endereço; não têm nome/morada/CPF) → chave `anon:`, conteúdo igual, **juntam-se** às já
  retidas. Lances: Blob `bids` → `bid:{ed}:anon:<sha>:{suf}` **só em edições consolidadas** (numa aberta a consolidação elegeria `anon:` e
  lançaria sempre); Blob `lances-relampago` (legado) → `anon:`; `nomeExibicao` `***`; `commitmentHash` fica. **Supabase `lances` continua
  APAGADO** (MC72). Lances de edições abertas → `manifesto.blobs.pendente["lances-edicao-aberta"]`.
- **C** `ExcluirConta.jsx` + `ExcluirContaModal.jsx` + `DADOS_RETIDOS`: NF-e 5 anos, histórico anonimizado, auditoria on-chain; «pseudônimo»;
  **sem** «consentimento — 5 anos» (o conta-delete APAGA o `consent-log`).
- **D** `_lib/pedidos.mjs` passou a **exportar `atualizarPedido`** (1 linha). O conta-delete escreve `pedido:*` por CAS, reavalia o dono e
  sobe para `erros` qualquer falha (conflito, sem ETag, leitura/escrita a falhar — `pedido_ilegivel` ≠ «não é do titular»).
  ⚠️ O conta-delete já não é «puro»: o CAS usa o `@netlify/blobs` real → testes com `mock.module` + `_tests/_blobs-cas-duplo.mjs`
  (duplo com ETag real: `set` respeita `onlyIfMatch`, `setJSON` ignora-o; flags `semEtag`/`falharLeitura`/`falharEscrita`).
- Decisões do operador (R18): DEC-104.3-1…5 + **R18-A** apagar só a chave antiga do índice · **R18-B** notificações → `anon:` ·
  **R18-C** Supabase continua a apagar · **R18-D** sem a linha do consentimento · **R18-E** só edições consolidadas · **R18-F** «pseudônimo».
- Provas: A/B `_tests/mc1043-ab.script.mjs` (base perdia o evento concorrente) · mutação **27/27** (`scripts/mc1043-prova-mutacao.mjs`) +
  11/11 · suíte 530/530 · 842/848.
- ⛔ Pendentes: `Privacidade.jsx` sem NF-e · lances de edições abertas nunca são re-anonimizados · «CTN 173/174» a confirmar (art. 195).

---

## MC105a — Passe Desafio: tabela + repositório + compra (2026-09-30)

Logs: `_logs/MC105a_*.md` · Relatório: `Desktop/MC105a-RELATORIO.md` · SQL: `_logs/MC105a_MIGRACAO.sql`. **Validador: APROVADO COM RESSALVAS**.

- **Supabase `public.passes`** (produção, migração `mc105a_passes`, autorizada): UNIQUE `(endereco, edicao_id, produto_id)`, CHECKs
  (endereço `^0x[0-9a-f]{40}$`, `status` ∈ activo/expirado/usado, `cupons_ids` array), RLS, sem `anon`/`authenticated`.
  ⚠️ O `service_role` tem DELETE/TRUNCATE (default privileges do Supabase) — revogar é decisão do operador.
- **`_lib/passe.mjs`**: `criarPasse` (o 23505 devolve o existente; releitura que falha → `ok:false`, nunca excepção) · `lerPasse`
  (lança em erro) · `listarPassesDoComprador` · `marcarPalpiteUsado` (CAS `palpite_usado=false`; não mexe no `status`).
- **`comprar-passe.mjs`** (POST, user-session; o comprador é SEMPRE o do token): só `tipo==="programado"`, na janela, com
  `produtoId === meta.produtoId` e produto `ativo` · passe existente → 200 sem tocar no saldo · `debitarSaldoRs` (atómico) → 201 ·
  `saldo_insuficiente` → relê o passe (cliques concorrentes → 200) senão 402 · qualquer falha/excepção depois do débito → reembolso
  (alerta `comprar_passe_reembolso_falhou` sem endereço).
- ⛔ **`debitarSaldoRsIdempotente` NÃO existe**: o `debitarSaldoRs` é atómico mas sem chave. A idempotência do passe é o UNIQUE +
  compensação (R18-1); numa corrida o saldo desce 2× por instantes.
- ⚠️ `jsonError(status, code, msg, extra)` espalha `extra` POR CIMA de `{code, message}`: nunca pôr `code` nos extras.
- Decisões (R18): DEC-01…03 + **R18-1** compensação · **R18-2** só Programadas + produto vinculado · **R18-3** migração aplicada.
- Testes: `_tests/mc105a-passe.test.mjs` (10) + `_tests/mc105a-e2e.test.mjs` (22, handler real + `saldoRs.mjs` real) sobre
  `_tests/_supabase-duplo-mc105a.mjs` (fiel ao postgrest-js). Mutação **30/30** (`scripts/mc105a-prova-mutacao.mjs`). Suíte 530/530 · 874/880.
- ⛔ Pendente LGPD: `passes` fora do `exportar-dados` e do `conta-delete` — tem de entrar antes de haver passes reais.

---

## MC105a.1 — Saneamento da tabela `passes` (2026-09-30)

Logs: `_logs/MC105a.1_*.md` · Relatório: `Desktop/MC105a.1-RELATORIO.md`. **Validador: APROVADO COM RESSALVAS** (⚠️1 refutou-me; corrigido por decisão do operador).

- **Frente A** (produção, `mc105a1_passes_saneamento`): `REVOKE DELETE, TRUNCATE ON public.passes FROM service_role`. Medido como `service_role`:
  INSERT/SELECT/UPDATE ok, DELETE/TRUNCATE **42501**. Ficam REFERENCES/TRIGGER/MAINTAIN (sem CREATE em `public`, sem vector).
- **Frente B**: `exportar-dados` ganha `["passes","endereco"]`; `conta-delete` → `anonimizarPasses`: `endereco` → `chaveAnonima` (MC104.3), resto intacto,
  nunca apaga, dry-run conta, erro sobe para `erros`.
- ⛔ **Pré-requisitos estruturais (autorizados pelo operador durante o MC; o enunciado proibia tocar na estrutura):**
  1. o CHECK do MC105a só aceitava `^0x[0-9a-f]{40}$` → o UPDATE para `anon:` dava **23514**. Agora `… OR ^anon:[0-9a-f]{64}$`.
  2. o UNIQUE `(endereco, edicao_id, produto_id)` colidia (**23505**) se a mesma carteira voltasse, comprasse o mesmo passe e excluísse outra vez
     (achado do validador, reproduzido em produção). Agora é **índice parcial** `WHERE endereco LIKE '0x%'` com o MESMO nome
     (`mc105a1_passes_unique_parcial`): a compra continua idempotente (23505), pseudónimos podem repetir.
- **Frente C**: `supabase/migrations/20260930_mc105a_passes.sql` (= `_logs/MC105a_MIGRACAO.sql`) + `…_saneamento.sql` + `…_saneamento_unique.sql`.
  ℹ️ Os nomes de ficheiro não batem com as versões em `schema_migrations` (deriva pré-existente: `mc93b` também).
- **Sonda de produção sem deixar dados:** bloco `DO` com `SET LOCAL ROLE service_role`, cada operação no seu sub-bloco com `EXCEPTION`
  a guardar o SQLSTATE, e `RAISE EXCEPTION` no fim → tudo revertido (DDL incluído: o mutante «repor o GRANT» corre-se assim).
- Testes: `_tests/mc105a1-passes-lgpd.test.mjs` (11) + `mc104-exportar-dados` (passes). O duplo `_supabase-duplo-mc105a.mjs` passou a ter o CHECK
  de produção, `select(col,{count,head})`, UPDATE **atómico com UNIQUE** e UNIQUE **parcial** (`unicoSe`). Mutação 7/7 + 2/2 + 4/4; validador 16/17
  (o sobrevivente virou o teste B6). Suíte 530/530 · 885/891.
- ⚠️ **Instrumento:** `String.prototype.replace` com string de substituição interpreta `$'`/`` $` ``/`$&` — um texto com regex `…$'` despejou o
  CLAUDE.md dentro de si próprio (+8342 linhas; reposto do HEAD). **Inserir texto com `replace(alvo, () => texto)`.**
- ⚠️ Pendente (decisão de texto): `DADOS_RETIDOS`/ecrãs de exclusão não dizem que os passes ficam retidos pseudonimizados.

## UTAC105b — Passe Desafio: cupons (modelo + painel do lojista + ligação) (2026-09-30)

**Primeiro UTAC feito com a skill UTAC01** (`desafio-gut/frontend/skills/utac01/`; spec `_logs/UTAC105b.spec.yml`). ⛔ **Decisão do operador (R18-E):
TODO o trabalho começa pela skill UTAC01** (spec → `/utac-run` → SEG-1..SEG6). Logs `_logs/UTAC105b_*` · Relatório `Desktop/UTAC105b-RELATORIO.md`.

- **Tabela `public.cupons`** (produção, `utac105b_cupons`): `lojista_id` (= `cliente_id` da cota = `produto.lojista`: `0x…` ou `cnpj:<14>`), `valor_rs numeric(10,2)`,
  `validade_dias 30`, `ativo`; UNIQUE (lojista_id, valor_rs); sem DELETE/TRUNCATE; anon/authenticated sem acesso. **Sem CHECK de valor na BD.**
- **`_lib/cupom.mjs`**: `VALORES_CUPOM = [5,10,20]` (fonte única, também para o painel via API) · `VALIDADE_CUPOM_DIAS = 30` · `valorValido` sem coerção ·
  `criarCupom`/`actualizarCupom` idempotentes · `listarCuponsAtivosDoLojista` (activos E valor da plataforma).
- **`cupons.mjs`** GET/PUT `?cliente_id=` / `{cliente_id, cupons:[{valorRs, ativo}]}` — valida tudo antes de gravar. **Posse = regra MC89.38**: próprio →
  `autenticarAdmin(req)` → cota com `endereco` = JWT. ⛔ `verificarUserSession` ACEITA admin-access (`jwt.mjs:81`): o admin detecta-se com `autenticarAdmin`,
  nunca pela falha do user-session (era código morto — achado do validador; o teste usava um duplo permissivo de admin).
- **Painel**: `src/pages/CorporativoCupons.jsx` + rota `/corporativo/cupons` (`App.jsx`) + card «Meus cupons» no `CorporativoDashboard`.
- **`comprar-passe`**: lê os cupons activos de `produto.lojista` ANTES do débito; **0 → 409 `sem_cupons_ativos`** (R18-C); ids no INSERT via
  `criarPasse({…, cuponsIds})` (R18-D; omitido → `[]`). ⚠️ **Com 0 cupons em produção, toda a compra de Passe dá 409 até os lojistas configurarem.**
- `_lib/voucher.mjs` NÃO existe (o `voucher.mjs` é outro produto, intocado). Duplo `_supabase-duplo-mc105a.mjs` ganhou a tabela `cupons`.
- Testes `utac105b-cupom` (11) · `-cupons-endpoint` (9, admin-auth REAL) · `-ligacao` (8, handler real) · `src/__tests__/utac105b-painel` (5). Mutação 27/27
  (`scripts/utac105b-prova-mutacao.mjs`). Suíte 535/535 · 913/919.
- ⚠️ Pré-existente: `cotas.mjs` `POST ?action=update-corporativo` não autentica nada (o comentário diz que verifica o email).

## UTAC000.2 — Review automático da Skill UTAC01 (2026-09-30)

Infra (sem código de produção). Logs `_logs/UTAC000.2_*` · Relatório `Desktop/UTAC000.2-RELATORIO.md` · Validador APROVADO COM RESSALVAS (corrigidas).
- **`desafio-gut/frontend/skills/utac01/review/`**: `README.md` · `template.md` (7 secções) · `prompt.md` (`/utac-review <UTAC>`, **só leitura**, escreve só
  `_logs/REVIEWS/<UTAC>_REVIEW.md` + 1 linha no `_logs/REVIEWS/INDEX.md`) · `aplicador.md` (**MANUAL** — o operador decide) · `VERSAO.md`.
- ⛔ **Decisão do operador (R18-A):** a versão da skill vive em **`review/VERSAO.md`** (actual **1.0** + changelog); `SKILL.md` só aponta para lá.
- ⚠️ Commits de um UTAC: **âmbito exacto** `tipo(<UTAC>):` — `git log --grep=UTAC105b` apanha `UTAC105b.1` e quem só o menciona; e `git diff A..B` não se
  filtra (há commits de outras sessões intercalados). UTACs antigos = prefixo `MC` nos logs e commits.
- 1.º review: `_logs/REVIEWS/UTAC105b_REVIEW.md` (decisão `pendente`). Verificador `scripts/utac0002-verifica-review.mjs` (45) + mutação 43/43.

## UTAC105b.1 — Autenticação em `cotas?action=update-corporativo` (P0) (2026-09-30)

**Veredicto: FECHADO** — commit `828f719`. *(Validador adversarial: APROVADO COM RESSALVAS.)*

### O achado (do validador do UTAC105b, fora do âmbito)
`cotas.mjs` (`update-corporativo`) **não autenticava nada**. O comentário da l.484 dizia
«verifica se o email do body bate com o registro (simples, mas eficaz)» — **a verificação não existia**.
Qualquer pessoa que conhecesse um `cliente_id` de cota corporativa alterava empresa/segmento/site/logoUrl/email.
Metáfora: uma porta com o letreiro «só entra quem tem chave» mas sempre aberta.

### Provas
| gate | resultado |
|---|---|
| GATE 1 medir | SEG-1: baseline `5e7ed24` confere; suíte 535/535 · 913/919 = declarado; disco 13 G |
| PoC (frente A) | **sem token → 200 e escreveu**; **token de outro → 200 e escreveu** (vulnerabilidade reproduzida por execução, com controlos positivos de dono/admin) |
| GATE 8 bidireccional | `_tests/utac105b1-cotas.test.mjs` **16/16**: dono 200 · sem token 401 · token alheio 403 · admin 200 · **expirado 401** · `cnpj:` com `endereco` 200 · `cnpj:` sem `endereco` 403 (aceite) · falha de leitura **502 fail-closed** · 401/403 com prioridade sobre 404 |
| GATE 7 mutação | **8/8 mutantes RED**, md5 restaurado idêntico (`mut-utac105b1.mjs`) |
| GATE 4 regressão | suíte frontend **535/535** inalterada · backend **929/935** (= 913/919 **+16**, os testes novos) · `vite build` **✓ 9,24 s** |
| A/B pareado | antes/depois com os mesmos casos: sem token 200→**401**, token alheio 200→**403**, dono e admin **200→200** (zero regressão) |
| GATE 3 escopo | **só 3 ficheiros**: `cotas.mjs` (42+/2−), `CorporativoDashboard.jsx` (5+/1−), o teste novo. Em `cotas.mjs`, tudo antes e depois do bloco alterado é **byte-idêntico ao HEAD** |
| GATE 12/AU3 | 2 bloqueios **escalados** ao operador antes de tocar (frontend sem token; cotas `cnpj:` sem `endereco`) — decisão **R18-2** = opção 1 |

### Decisões do operador (P4/R18 — 3 lugares: `_logs/UTAC105b.1_SEG-1_MEDICAO.md`, `Desktop/UTAC105b.1-RELATORIO.md`, esta secção)
- **R18-1:** autorizada a alteração de 1 linha no frontend (`{ token: authToken }`) — sem ela a correcção quebrava o dono legítimo.
- **R18-2:** aceitar e documentar o **403 ao dono** de uma cota `cliente_id = cnpj:XXXX` sem campo `endereco` (é o mesmo trade-off que o `produtos.mjs:309-326` já assumiu).

### Erros dos meus instrumentos (declarados)
1. O script de mutação deixou o **M1 aplicado** (1.ª versão usava `execFileSync`, que lança no exit≠0 *esperado*): `cotas.mjs`
   ficou sem o 401 (md5 `b2a88129…`). Apanhado por conferência de md5 e **restaurado à mão** byte-a-byte. Corrigido com
   `try/catch` + restauro em `finally`.
2. Declarei o mutante **M4 equivalente** — **estava errado**: removê-lo mata o A2. A previsão errada ficou à vista no rodapé do teste.
3. O teste A2 esperava 200 com `cliente_id` em maiúsculas; medido, dá **404** e **já dava antes** (a leitura não normaliza — fora do escopo). Expectativa corrigida para a verdade.

### Pendências (declaradas)
1. **`cliente_id` em maiúsculas → 404** (a leitura não normaliza) — **pré-existente**, fora do escopo deste UTAC.
2. Cotas `cnpj:` sem `endereco` continuam sem prova de posse: resolver exige preencher `cota.endereco` no registo (UTAC futuro).
3. O endpoint **não tem teste de produção** (o PoC e os testes correm com duplos): a verificação em produção do painel real fica para o operador.

### Não medido
- Não se leu nem escreveu no Supabase (as cotas em produção não foram inspeccionadas).
- O painel real não foi exercitado num browser (a prova é: testes do handler + build do frontend + A/B do PoC).

## UTAC105b.2 — P0 do `register-corporativo` + POST genérico (2026-10-01)

**FECHADO** (P0 e integridade de dados). Corrige as **duas portas de escrita sem prova de posse** que o validador do UTAC105b.1
descobriu fora do escopo. Um único ficheiro de produção alterado (+46 linhas / −0).

### O defeito (medido por execução, não por leitura)
`cotas.mjs` decidia `const clienteId = endereco ?? "cnpj:" + cnpj` a partir do **CORPO** (l.396), sem
prova nenhuma — o `accessToken` é opcional e apenas se verifica que **começa por `"eyJ"`** (não é
verificado) — e escrevia sempre com `upsertCota` (l.442) um registo **completo** que fixava
`categoria:null, vendida:false, disponivel:false, valor:0`. PoC com o handler real:
`empresa="LOJA DA VITIMA" cat=ouro vendida=true valor=55000` → **`empresa="INVASOR" cat=null
vendida=false valor=0`**. O anti-duplicidade (409) não travava o ataque: usando o `endereco` **e** o CNPJ
da vítima, o `cliente_id` coincide e o 409 não dispara.

### A correcção
- **Frentes A/B** — guarda de posse **antes do upsert**, com a estrutura do `update-corporativo`
  (UTAC105b.1), reaproveitada e não reinventada: `resolverChamador` → `getCota(clienteId)` em `try/catch`
  (**502 `store_indisponivel`**, fail-closed) → se a cota **existe** e não é admin: `ehProprio`
  (cliente_id == JWT, normalizado) **ou** `vinculado` (cota.`endereco` == JWT) → senão **401** (anónimo) /
  **403** (utilizador), **sem escrever**. Cota **nova** → segue como antes.
- **Frente C** — `endereco: existente?.endereco ?? null,` no registo do POST genérico (1 linha). O
  `colunas()` grava `endereco: registro?.endereco ?? null`; como o ramo (b) do MC89.38 depende dessa
  coluna, apagá-la fazia o dono legítimo levar **403**.

### Porque é que isto NÃO quebra o cadastro legítimo (medido, P10)
`SejaNossoParceiro.jsx` (cadastro directo, sem login): a **FASE B** faz `GET ?cnpj&empresa` primeiro e,
se o CNPJ já existe, **não chega ao POST** (navega, avisa «já registrado», ou envia OTP). A **FASE C**
(POST) só corre quando o GET deu **404** — ou seja, **o fluxo legítimo só cria cotas NOVAS**, e não envia
`accessToken` nem `endereco`. O caminho «sobrescrever cota existente» **não tem consumidor legítimo**.

### Decisão declarada (idempotência)
O enunciado pedia «repetir o próprio registo → **200**». Implementado: **401 sem escrita**. Razão: sem
prova de posse não se distingue repetição de ataque, e devolver 200 exigiria ou **escrever** (destruir) ou
**devolver o registo existente a um anónimo** — o que o **MC87 (P0-1)** proíbe (confirmaria a associação
CNPJ ↔ carteira). Nenhum caso legítimo é partido (ver acima). Se o operador quiser o 200, é 1 linha.

### Validador adversarial (SEG3) e o que ele mudou
**APROVADO COM RESSALVAS** (`_logs/UTAC105b.2_SEG3_VALIDADOR.md`, 22.887 B, escrito por ele). **28/28
tentativas de bypass falharam**, por duas razões **estruturais**: (a) a chave do guard é a chave da
escrita (sem divergência de normalização); (b) a prova de posse é infalsificável (`user-session` só com
assinatura EIP-191; a coluna `endereco` nunca diverge da chave `cliente_id` ⇒ o ramo `vinculado` não é
forjável). Confirmou por leitura própria que o **cadastro legítimo não quebra**.

As duas ressalvas ⚠️ **foram corrigidas** por decisão do operador (**R18-3**, «resolva o que for preciso
pra concluir esse UTAC»), com os tratamentos propostos pelo próprio validador:
- **V-1** (GRAVE) — o **dono comprovado**, ao repetir o registo, **destruía a própria cota paga**
  (`ouro/vendida:true/55000` → `null/false/0`); e o meu teste **B4 aplaudia** a escrita destrutiva.
  ⇒ os campos de **PAGAMENTO** passam a ser preservados quando a cota já existe (`existenteReg?.X ?? default`)
  e só se inicializam na criação; `pedidoId` e campos desconhecidos sobrevivem pelo spread. Testes **B13**
  (agora exige a cota **intacta**) e **B14**.
- **V-2** (GRAVE-escopo) — a Frente C preservava `endereco` mas o POST genérico continuava a apagar
  `tipo` ⇒ o **dono levava 404** no `update-corporativo`. Eu tinha classificado isto como «achado fora do
  escopo»; o validador mostrou que **é o objectivo por cumprir da própria Frente C**. ⇒ o registo passa a
  `{ ...(existente ?? {}), <campos da operação> }`: o payload corporativo **inteiro** sobrevive (`tipo`,
  `empresa`, `segmento`, `site`, `logoUrl`, `origem`, `cadastradoEm`, `endereco`, `pedidoId`). Teste **C3**.

Achados ℹ️: **V-3** (oráculo 401-vs-201) **aceite** — equivalente ao 409 do MC12.3, sem PII, limitado por
rate-limit; **V-5** coberto (**F1–F8**: caixa, espaços, `%20`, tipos, esquemas de `Authorization`, sem
`X-Visitor-ID`, `__proto__`; **F8 mata o mutante MS2**); **V-6** corrigido com o V-1; **V-7** esta secção.
**⚠️ V-4 ESCALADO (não corrigido):** um anónimo pode pré-criar/poluir uma cota no `endereco` de outra
pessoa (herdada na fusão da activação). Corrigir altera o **contrato de API** do MC12.3.1 ⇒ candidato a
UTAC, decisão do operador. Exposição só por chamada directa à API (o frontend não envia `endereco`).

### Verificação
| gate | resultado |
|---|---|
| PoC A/B | anónimo `201+sobrescreve` → **401+intacto**; cadastro legítimo `201` → **201**; FC `endereco=null` → **preservado** |
| Testes | **25/25** (`_tests/utac105b2-register.test.mjs`: B1-B14, C1-C3, F1-F8) |
| Mutação | **9 RED + 3 equivalentes declarados** (MA1-MA5, MV1-MV3, MS2; MA6/MS1/MS3 confirmados no-op)
| Suíte | frontend **535/535** (inalterado) · backend **956/962** (= 931/937 **+25**) **VERDE** |
| Escopo | só `cotas.mjs` + o teste novo; prefixo/sufixo **byte-idênticos** ao `966a587` (as correcções V-1/V-2 só acrescentam) |
| Validador | **APROVADO COM RESSALVAS** — V-1/V-2 corrigidos (R18-3); V-4 escalado |

### Achado FORA do escopo, escalado (não corrigido — R20/AU3)
**F-1: o POST genérico continua a destruir o resto do payload corporativo.** Como `colunas()` grava
`payload: registro` (`cotas-store.mjs:34`) e o registo do POST genérico só tem campos de lance, o upsert
elimina `tipo`, `empresa`, `segmento`, `site`, `logoUrl`, `origem` e `cadastradoEm` dessa cota. Como o
`tipo` desaparece, o `update-corporativo` passa a responder **404** ao próprio dono. **Pré-existente**;
exige decisão de desenho (que campos o POST genérico pode substituir) → **candidato a UTAC**.

### Lição registada
O `register-corporativo` provou que **«autenticado» num comentário não é autenticação**: o `accessToken`
opcional só era testado por prefixo (`"eyJ"`) e servia de decoração. Corolário operacional: quando um
endpoint aceita a identidade **do corpo**, a posse tem de ser provada contra o JWT **antes** de qualquer
escrita — e o teste tem de provar que **NÃO escreveu**, não apenas o código de resposta.

---

## UTAC105c — UI do cliente: adaptar as telas do comprador (2026-10-01)

**FECHADO.** Logs `_logs/UTAC105c_*` · Relatório `_logs/UTAC105c-RELATORIO.md` + `Desktop/UTAC105c-RELATORIO.md`.
Validador adversarial: **APROVADO COM RESSALVAS** (a ressalva de teste foi corrigida; a de dados foi escalada → DEBT-007).

### Decisões do operador (R18)
- **R18-A — «Não cria nada novo, adapta ao que já existe no app.»** Sem páginas `/ofertas-*` nem componentes `Meus*.jsx`.
- **R18-B** Frente A (ofertas) não se toca: a Programada ainda gasta senhas, e falar do Passe ao lado do botão contradiz-o
  (DEC-01/02 pendentes). **R18-C** Frente C (pedidos) não se toca: o prazo de 7 dias fica só na API (MC102).
- **R18-D** cupons/palpites = placeholders inline no `MeusAtivos.jsx`. **R18-E** a Frente B avança (defeito real).

### O que mudou
- ⛔ **O 🏆 «Menor e Único» era falso.** `MeusAtivos.jsx` dava-o a `!repetido && i === 0` da lista exibida; com sessão a
  lista são os lances da pessoa, **sem ordenar** ⇒ o 1.º lance pela ordem de chegada levava o 🏆, mesmo com outra pessoa
  a ganhar. Agora `isVencedor = lance === menorUnico` (o `menorUnico` que a página já calculava sobre todos os lances).
- «🎟️ Meus cupons» e «🎯 Meus palpites» (`data-estado="placeholder"`): declaram que ainda não existem, sem números.
  O comprador não tem endpoint para cupons (`listarPassesDoComprador` não está exposto) nem para palpites (UTAC108).
- A guarda `src/i18n/__tests__/ativos-i18n.test.mjs` passou a ler também o `MeusAtivos.jsx`.

### Provas
Testes `src/pages/__tests__/utac105c-meus-ativos.test.mjs` (12, página inteira em SSR, desktop + mobile) · mutação
**13/13** (`scripts/utac105c-prova-mutacao.mjs`) · suíte **547/547 · 967/973** · build exit 0 · só frontend tocado.

### Lições
- **Um selo testado não é o ecrã testado.** O 🏆 é desenhado em DOIS sítios por linha (posição/avatar e selo). Os meus
  testes só liam o selo; o validador repôs o defeito só no avatar e a suíte ficou verde. Contar o símbolo na região
  inteira fecha a classe.
- **O `_render.mjs` não renderiza páginas** (não troca o `AppContext`); para uma página, o arnês é o do `MeusAtivos.test.mjs`.
- ⚠️ **DEBT-007:** o «menor único da edição» do frontend é o menor único **que este browser viu** — o contexto não carrega
  o histórico da edição. Pré-existente; afecta o 🏆, o cartão «Menor Lance» e o Dashboard.
- Árvore partilhada: à 1.ª leitura havia um **mutante de validador por restaurar** em `_render.mjs` (outra sessão). Medir
  o baseline num worktree limpo; nunca restaurar ficheiros alheios.

## ⚠️ Armadilhas de ambiente (registo contínuo)

Consultar antes de mexer em segredos ou no CLI da Netlify.

- **`netlify env:set` imprime o valor por defeito.** Usar `| Out-Null` e `--force` para o esconder. O `-AsSecureString` do PowerShell **não** cobre a saída do CLI da Netlify. *(Registo do operador, MC102.1b.)*
- **`netlify env:list --json` devolve um OBJECTO** (`{ CHAVE: valor }`), não uma lista. Filtrar com `.CHAVE` na raiz, não com `Where-Object`. *(Registo do operador; confirmado por medição no SEG-1 do MC102.1b.)* ⚠️ Carrega **todos** os segredos do contexto para memória: para saber se uma variável existe, usar `env:get` dessa variável.
- **`netlify env:get X` com X AUSENTE escreve «No value set in the <ctx> context for environment variable X» com exit 0.** Um teste de «saída não vazia» dá «definido» falso. *(Medido no MC102.1b.)*
- **Para usar um segredo num script sem o imprimir:** capturar a saída do CLI **dentro** de um processo node (`spawnSync`), validar a forma com uma regex, e imprimir só o tamanho ou booleanos. Mascarar qualquer eco na resposta de terceiros.
> ⏱️ **UTAC000.17bc (2026-10-02) — PRAZO REAL DO SERVIDOR + OVERLAY AGREGADO (DEBT-016 + DEBT-017): CÓDIGO ENTREGUE E VERDE; **registos por fechar** (sem veredicto).** O fim do leilão deixou de ser um cronómetro LOCAL de 30 min (`AppContext` l.193-197) e passou a ser o **`termino_em` REAL do servidor** (`edicoes[EDICAO_ATIVA]` do `useEdicoes`), lido no **relógio do servidor** (`+offsetRelogioMs`) ⇒ fecha a DEBT-016. Para isso as DUAS pontas passaram a **marcar o sintético** (`sintetizada: true` no `sintetizarR1()` do cliente E do servidor + passthrough no `normalizarMapa`) e o gate do overlay exige **prazo real E não-visto**: edição sintética ou ausente ⇒ **não encerra nem abre** (GATE 26 — o fallback não é prazo). A **DEBT-017** caiu por dois lados: `EDICAO_ID_RE` passou a aceitar `R-N` e `criarEdicao({id})` aceita id explícito (contador e caminho antigos intactos) ⇒ a R-1 deixou de ser só-sintética (**falta a criação REAL em produção**). **17c entregue:** `FimEdicaoOverlay` e o `OverlayVencedor` do MercadoLances ganharam o **agregado das participações do titular** (endpoint do 17a via novo `useMinhasParticipacoes`, com o `authToken` que o contexto já expõe), **destaque de vitória**, botão **FECHAR (`onClose`)** e **«visto» no aparelho** (`src/lib/overlayVisto.js`, por endereço E por edição) — «NOVA RODADA» também marca visto (senão o modal reabria 1,2 s depois). **Verificação:** frontend **681/681** · backend **990/996**; contrato do `tick` **12/12** (inclui sintética-não-abre, sem-prazo-não-abre, offset do servidor, já-visto-não-abre); **arnês de runtime 7/7** (GATE 23: servidor → AppContext → página, com o caso novo da edição sintética em runtime); R-1 real **6/6**; «visto» **8/8**. Testes de contrato ACTUALIZADOS porque o contrato mudou (`utac00014-show-overlay` — a fonte do prazo; `mc941-edicao-especial` — `R-1` saiu dos ids rejeitados), com a regra antiga documentada, não apagada. **⚠️ LIMITE DE TEMPO EXCEDIDO (~5 h / 3 h) e declarado** — a causa medida foi o arnês de runtime a pendurar 6m40s pelo fixture antigo (prazo local), cuja caça+adaptação consumiu o excedente. **FALTA (declarado, não maquilhado):** martelo de MUTAÇÃO (GATE 6), VALIDADOR adversarial (GATE 8), **criação da R-1 real em produção** (Blob `edicoes-metadata`; exige a duração decidida pelo operador — o `POST /edicoes` é admin-gated) e a verificação em produção (Frente E). **Commit local, NÃO empurrado** (protocolo: veredicto antes do push).
> 📌 **UTAC000.17bc — decisões do operador (R18, 2026-10-02).** **(a)** Duração da R-1 = **1800 s** confirmada, **mas a R-1 real NÃO se cria em produção agora**: é a edição activa em `EM_BREVE_MODE` e dar-lhe prazo de 30 min antes de desligar o modo seria contraditório ⇒ **a criação passa para o UTAC que desligar o `EM_BREVE_MODE`** (parâmetros fixados: id `R-1`, 1800 s, `criarEdicao({id:'R-1'})` — código já testado). **(b)** Validador adversarial **despachado sobre `1f446db`**; corrigir o que ele apanhar e só então fechar DEBT-016/017. **Protocolo: veredicto primeiro, push depois** (o commit fica LOCAL).
> ⚖️ **UTAC000.17bc — VEREDICTO ADVERSARIAL: APROVA (com ressalvas) e FECHO (2026-10-02).** O validador (`deleg_632f3f30`) confirmou (A)(B)(C)(E) e **refutou parcialmente a (D)**: o mutante dele M4 (remover `marcarVisto` dos DOIS handlers) **sobrevivia às 4 suítes** — a cablagem «FECHAR/NOVA RODADA marca visto» não tinha teste. Corrigido na mesma ronda: (1) NOVO `utac0017bc-handlers-visto.test.mjs` extrai e EXECUTA os dois handlers com duplos ⇒ **M29 (o M4 dele) → 8 RED**; (2) guarda contra **sobrescrita** com id explícito (`edicao_ja_existe`, falha-CLOSED) em `criarEdicao` ⇒ **M30 → 3 RED**; (3) o fim passou a **exigir o `agora` do servidor** (`offsetRelogioMs === null` ⇒ não decide — a minha alegação «o relógio local NUNCA decide» era imprecisa) ⇒ **M31 → 4 RED**; (4) guarda de tipo na contagem de lances + contrato do agregado nos DOIS overlays + caso no arnês (FECHAR renderizado; sem participações, secção ausente). **Martelo final: 10 mutantes, 10 mordem**; suíte canónica **frontend 694/694 · backend 992/998 (VERDE)**. **DEBT-016 FECHADA**; **DEBT-017: código fechado, criação da R-1 real TRANSFERIDA** para o UTAC que desligar o `EM_BREVE_MODE` (R18-a, duração 1800 s). Limites medidos e declarados: o CONTEÚDO da secção agregada não é renderizável no arnês (lá o `authToken` é null — visitante — e o `sessionStorage` nem existe no SSR; sonda própria, removida); `address === null` ⇒ «visto» não persiste (inalcançável sem R-1 real, registado); custo do `jaVisto` a 4 Hz por medir. Verdict verbatim em `_logs/UTAC000.17bc_SEG4_VALIDADOR.md`.

> 🎯 **UTAC106x.1 (2026-10-04) — NORTE VIA B + REVERSÕES FORMAIS (R-19, DEC-09).** A secção «NORTE DO PRODUTO» passou a **fonte de verdade** do produto e recebeu a definição **Via B — programa de fidelidade**: e-commerce por dropshipping; **Menor Lance Único** = jogo de habilidade com produto patrocinado, **sem SPA/MF**; **Ofertas Programadas** = programa de fidelidade gamificado (Passe R$ 2,00 → 1 ponto → **50 pontos = cartão colecionável físico da Família Quildo**); o palpite é **bónus** (+2 pontos), **não decide**; vendedor legal = **Associação Recreativa dos Nordestinos no Amazonas** (CNPJ 23.040.066/0001-00, União e Trabalho); NF-e CFOP **5.910** (patrocínio) + **5.102** (venda). **Nota de precedência** no cabeçalho: esta secção **prevalece sobre «ESCOPO-ALVO v6.0» (linha ~126)** e demais documentos. **Reversões formais registadas (R18 — operador via co-construtor, 2026-10-04):** **(1) R-19** (`_logs/MC100_MATRIZ-CONFORMIDADE.md` linha ~32 (row #24) — «Gamified Loyalty exige não estar sujeita a licenciamento de jogo; a Programada exigia SPA/MF ⇒ parecer obrigatório») → **REVERTIDA**: a Via B **elimina o concurso**, logo não há licenciamento de jogo a exigir. **(2) DEC-09** («titular Ruan/MEI») → **REVERTIDA**: o titular é a **Associação Recreativa dos Nordestinos no Amazonas (Marinho)**. ⚠️ O **parecer jurídico** (R-19/R-02) **continua pendente** — a reversão é documental, não jurídica. Baseline `483576f`; suíte **694/694 · 992/998**. Correcção das secções ESCOPO-ALVO / FICHA-PLAY-PT / MC100_MATRIZ = **UTAC106x.2** — e também para lá as refs a MEI/DEC-09 fora dessas secções (ex.: §MC102.1b). Histórico da NORTE anterior preservado em `_logs/UTAC106x_NORTE-ANTERIOR.md`. Log: `_logs/UTAC106x.1-norte-via-b.md`.

> 🎯 **UTAC106x.2 (2026-10-04) — REALINHAMENTO DOS DOCUMENTOS SECUNDÁRIOS.** A secção **ESCOPO-ALVO v6.0** deixou de se auto-declarar «FONTE DE VERDADE» (passa a **HISTÓRICA**, com o título antigo citado verbatim) e a precedência passa a ser a **NORTE DO PRODUTO**; a Programada deixou de ser «concurso de previsões» com SPA/MF obrigatória e passou a **programa de fidelidade** (Passe → pontos → cartão; o palpite é **bónus**); o vendedor **MEI** passou a **Associação Recreativa dos Nordestinos no Amazonas** (CNPJ 23.040.066/0001-00); **R-19** e **DEC-09** ficaram anotadas como **REVERTIDAS pelo UTAC106x.1**. Em `docs/FICHA-PLAY-PT.md` o produto passou a ser classificado como **programa de fidelidade** na Play (medidor `mc97` **3/3**) e a `_logs/MC100_MATRIZ-CONFORMIDADE.md` ganhou uma **errata** + a **row #24** anotada (R-19 revertida), entrando no git (era untracked). Texto antigo **anotado, nunca apagado** (P2 · GATE 15). Validador adversarial: ronda 1 **PARCIAL** (achado ⚠️ **A1**, meu: a errata no **cabeçalho** da MATRIZ deslocou a row #24 e partiu a referência «linha 32» da NORTE — **corrigido** movendo-a para o **fim**) → ronda 2 **APROVADO**. Log: `_logs/UTAC106x.2-realinhamento.md`.

> 🔧 **UTAC106x.3 (2026-10-04) — REGRA A13: JUNCTIONS EM WORKTREE.** Nova regra **A13** em `skills/utac/protocol/regras/A-ambiente.md` (+ 2 referências no `SKILL.md`, que passou a **A1-A13** e a **76 regras**): o delete recursivo (`git worktree remove` **e** `rm -rf`) **SEGUE as junctions** e apaga o `node_modules` REAL — medido: com caminhos curtos devolve **exit 0 e o alvo fica VAZIO** (perda **silenciosa**); com caminho > MAX_PATH, **exit 255 «Filename too long»** (foi o que, no UTAC106x.1, deixou `frontend/node_modules` 505→498 e `netlify/functions/node_modules` 417→0). Procedimento: `rmdir` das junctions **PRIMEIRO**, depois `git worktree remove` + `prune`. Novo **`scripts/worktree-helper.mjs`** (`criar|check|remover`) com a invariante *«uma recusa do git NÃO se contorna»* — `podeFallback(saida, statusLimpo)` só permite o `rm -rf` sem reparse points, sem recusa explícita (sujo/locked/inválido/**submódulos**) e com limpeza PROVADA (`status --porcelain --ignore-submodules=none` + `submodule status`). Testes `scripts/worktree-helper.test.mjs` (fora da suíte canónica) **12/12**, **mutação 6/6**; suíte **694/694 · 992/998**. Validador adversarial em **3 rondas** (F1 → G1 → H1, cada uma corrigida; veredicto final **PARCIAL** — o H1 é **latente**, o repo não usa submódulos; as correcções finais ficam **declaradas como não re-validadas**). Log: `_logs/UTAC106x.3-a13.md`. Próximo: **UTAC106x.2**.

> 🐞 **UTAC106x.5 (2026-10-04) — DEBT-006 FECHADA: O WORKTREE LIGA A RAIZ DO MONOREPO.** A suíte do backend num worktree isolado dava **991/984/7 skipped** em vez de **998/992/6** (7 testes não descobertos + 2 skips, todos no grupo **MC93-E** de `_tests/mc93e-fork-onchain.test.mjs`). **Causa raiz (medida):** os testes resolvem módulos com `createRequire(import.meta.url)` a partir de `_tests/`, **subindo a árvore** até `desafio-gut/node_modules` — onde vivem as dependências **dev-only** (`solc`, `hardhat`, `@nomicfoundation/edr`); o helper A9/A13 ligava só os **dois** `frontend/...` ⇒ `MODULE_NOT_FOUND` no worktree. **FIX:** a lista `JUNCTIONS` de `scripts/worktree-helper.mjs` passa a cobrir as **duas raízes** que faltavam — `desafio-gut/node_modules` (raiz do monorepo) e `node_modules` (raiz do git). **GATE 8 bidireccional:** 991/984/7 → **998/992/6** (= repo principal) → removida, volta a 991/984/7. Worktree completo **694/694 + 992/998**; repo principal **sem regressão**; teste do helper **12/12**. Sem tocar em testes, produção, nem na regra A13/A9. Commit `8499425`. Log: `_logs/UTAC106x.5-debt-006.md`. ⚠️ **Divergência declarada:** a regra **A13** documenta ainda **duas** junctions e o helper cria **quatro** — a arrumar em UTAC próprio (não autorizado aqui). Próximo: **UTAC106a**.

> 🧹 **UTAC106x.6 (2026-10-04) — PENDÊNCIAS DA SÉRIE X FECHADAS (pré-UTAC106a).** **(A)** regra **A13**
> corrigida: documentava **duas** junctions e o helper `scripts/worktree-helper.mjs` cria **quatro**
> (`node_modules`, `desafio-gut/node_modules`, `desafio-gut/frontend/node_modules`,
> `desafio-gut/frontend/netlify/functions/node_modules`) — a divergência **2 vs 4** (declarada no x.5) está
> fechada; provado por execução (o helper cria 4 e o `remover` faz `rmdir` das 4 antes do worktree; os
> `node_modules` reais ficam intactos: frontend **499** · functions **414**). **(B)** **DEBT-001 FECHADA
> (aceite com enumeração):** os **6 skipped** do backend são **1** em `_tests/mc93d-contrato-onchain.test.mjs`
> (fork mainnet — exige `MAINNET_RPC_URL`) + **5** em `_tests/mc93d-contrato-postgrest.test.mjs` (grupo
> «SERVIDOR», exige `SUPABASE_CONTRATO_URL/KEY`) — ambos **bloqueados por credenciais do operador (R5)**, não
> desbloqueáveis por código. **DEBT-005 FECHADA:** `protocol/regras-legado.md` dizia «61 regras em 9
> categorias (… A8 …)» → corrigido para **76 regras / 10 categorias / A13 / +HI10** (re-medido por ficheiro:
> E9·T5·G6·L6·S6·A13·P7·AU4·ST10·HI10 = 76). **(C)** NORTE verificada contra a consolidação (10 de 11 itens
> ✅; **1 lacuna anotada**: «limite 5%» ausente e sem referente medido) e o gabarito Play verificado (§1-§9,
> com lacunas anotadas). **(D)** `package-lock` **NÃO alterado**: medido que `solc`/`@nomicfoundation/edr`
> **estão** nos locks (raiz e `desafio-gut`); o CI tem job dedicado `test-onchain` (instala as deps e exige
> ≤1 skip) ⇒ **MC93-E não salta em CI**; no CI o **único** skip tolerado é o do teste de recompilação com `solc` (que **não** está no
> `desafio-gut/package-lock.json`; **localmente** o `solc` resolve-se, logo **não** há skip local) — **DEBT-019 aberta** (decisão do operador). Suíte **frontend
> 694/694 · backend 992/998**. Zero código de produção e zero testes alterados. Log:
> `_logs/UTAC106x.6-pendencias.md`.

> 🔎 **UTAC106x.6 — ERRATA (pós-veredicto do validador adversarial, 2026-10-04).** O validador deu
> **PARCIAL · 0 bloqueantes** e **refutou 1 afirmação minha** (frente C.2/gabarito): o gabarito **tem**
> «regras oficiais» (`docs/gabarito-play-console.md:92`, row #14) e o `ESCOPO-ALVO` histórico
> (`CLAUDE.md:204`) **já listava** «transação separada e genuína». A frente C.2 fica corrigida para
> **1 lacuna real** — item (2) «transacção separada genuína», ausente do §6 do gabarito — **+ 1 candidata**
> («Ads»/«App access» no §4). A afirmação errada fica **à vista, marcada REFUTADA** em `DEBT-020` (não
> apagada). Veredicto verbatim: `_logs/UTAC106x.6_SEG4_VALIDADOR.md`.

> 🗺️ **UTAC106a (2026-10-04) — MAPEAMENTO DO FLUXO ACTUAL (base do UTAC106b/106c).** Documento
> **`_logs/UTAC106a-mapeamento.md`** (só leitura — **zero código de produção alterado**). Medido no
> `884eed9`: a **navegação actual** (mobile) é **Início (`/`) → Carteira (`/carteira`) → Lances
> (`/mercado`) → botão «Mais»** (`src/widgets/layout/BottomNav.jsx:24-28` + `:132-143`), com o **desktop**
> a divergir nos rótulos (`Sidebar.jsx:25-39`: «Dashboard»/«Minha Carteira»/«Mercado de Lances»); as abas
> são **literais**, não chaves i18n. A **Carteira** (`src/pages/MinhaCarteira.jsx:31`) mostra «**Saldo
> Disponível**» (`:174`, cor `#6b7db8`) com o valor em `#f5a623` (`:175-189`) e 3 botões (💰 Depositar PIX
> `:203` · 🎫 Trocar R$ 2,00→1 Senha `:217` · ⚡ Lance Relâmpago `:238`→`/mercado`). Os **Lances**
> (`MercadoLances.jsx:212`) abrem com o herói «**EM BREVE**» (`ComingSoonHero.jsx:48`) e a regra «Menor
> lance único vence · Art. 8» (`:55`); ⚠️ a pergunta «QUANTO VOCÊ OFERTA POR…» **já não está** nessa tela
> (só no gate legal, `TermosConsentimento.jsx:109`). Mapeados ainda o **AppContext**
> (`AppContext.jsx:145/178/1454`) e o **i18n** (`src/i18n/pt.js` — **18 chaves `nav.*` + 10 `dash.*` SEM
> consumidor**, declarado como possível dívida e **NÃO** registada — RESSALVA 7). **Validador
> adversarial: PARCIAL · 0 bloqueantes · 0 alegações refutadas** — confirmou todos os `ficheiro:linha` e
> apontou 5 lacunas de cobertura + 1 imprecisão, **todas corrigidas** (§1.4/§1.7/§1.8/§2.4/§3.3). Suíte
> **694/694 · 992/998**. Log: `_logs/UTAC106a-mapeamento.md`; veredicto: `_logs/UTAC106a_SEG3_VALIDADOR.md`.

> 🧭 **UTAC106b (2026-10-04) — NAVEGAÇÃO REESTRUTURADA + FRASE DE EFEITO.** Nova ordem das abas
> (BottomNav **e** Sidebar, em sincronia): **Carteira → Menor Lance Único → Início → Ofertas
> Programadas → Mais** (`BottomNav.jsx:29` / `Sidebar.jsx:34`). `/mercado` continua a **rota canónica**
> («Menor Lance Único» é o rótulo da modalidade) e `/menor-lance-unico` é **alias por REDIRECT**
> (`App.jsx:467`) — decisão medida: manter a canónica preserva o `activeTab` derivado da rota
> (`useAppContextEnvironment.tabFromPath`) **e** o **isolamento corporativo** (`rotasProibidas` do
> `AppContext`), achado ⚠A1 do validador. Nova rota/página **`/ofertas-programadas`**
> (`OfertasProgramadas.jsx`), **travada por `EM_BREVE_MODE`** (a trava é do CONTEÚDO — a aba aparece; o
> `EM_BREVE_MODE` continua **`true`**). Novo ícone `ticket` no `navModel`. **Frase de efeito** em
> `MercadoLances.jsx:228` (render em `:301`): **«Quanto você paga por esse item? O menor lance único
> leva!»** — **Opção A** das 3 do enunciado (sem álea/aposta; mantém «jogo de habilidade»); um teste
> trava que a copy é **literalmente uma das 3 opções autorizadas**. Testes: `mc99-limpeza-ui` (SEG1
> reescrito: ordem + rótulos + cada destino com rota registada + Sidebar em sincronia), `mc991-rotas`
> (POR_CONFIG +2) e **novo** `utac106b-navegacao-frases.test.mjs` (7 testes). Suíte **frontend 705/705 ·
> backend 992/998**; `vite build` ✓; **mutação própria**: «aposte agora» → **4 FAIL**. **Validador
> adversarial: PARCIAL · 0 bloqueantes · 0 alegações refutadas** (9 mutações dele, todas mordem).
> **Resíduos escalados (fora do escopo autorizado):** `/ofertas-programadas` precisa de **1 linha** no
> `AppContext.rotasProibidas`; terminologia «paga» vs Art. 7 «OFERTA» (decisão de copy); guarda de álea
> do `glossario.test.mjs` (`apostas?` não apanha a forma verbal); ordem dos itens secundários (cosmético).
> Log: `_logs/UTAC106b-navegacao.md`; veredicto: `_logs/UTAC106b_SEG2_VALIDADOR.md`.

> 🧾 **UTAC106c (2026-10-04) — CARTEIRA REDESENHADA + AS 4 PENDÊNCIAS DO UTAC106b FECHADAS.**
> **SEG0** — `src/pages/MinhaCarteira.jsx`: o título do vidro de saldo passou de «💰 Minha Carteira» para
> **«Carteira»** (nome canónico da navegação) e a etiqueta **«Saldo Disponível»** passou de cinza
> (`COR.muted`) para **amarelo** (`COR.gold` = `#f5a623`) — título e subtítulo no mesmo par visual; o
> **valor** do saldo continua a renderizar (`R$ …` / `R$ —` preservados). ⚠️ Isto partiu **3 guardas** do
> `mc99-limpeza-ui.test.mjs` que fixavam o nome ANTIGO: foram actualizadas **mantendo a invariante**
> (nome antigo = **0** ocorrências · **1 só** título · nenhum `<h1>`), contando `>Carteira<` (texto JSX) e
> **não** `/Carteira/g` — o identificador `MinhaCarteira` inflacionaria a contagem. **SEG1** — o botão
> «⚡ Lance Relâmpago» passou a **«⚡ Menor Lance Único»** (destino `/mercado` e modalidade `flash`
> **inalterados** — GATE 4) e nasceu o botão **«Comprar Passe Desafio R$ 2,00»**, que abre um **balão de
> confirmação** (`<Modal>` de `@/components/ui`); **Cancelar** fecha, **Confirmar** encaminha para
> `/ofertas-programadas` (travada por `EM_BREVE_MODE`). ⚠️ **Zero lógica de compra no ecrã** (sem débito,
> API ou gravação) — a compra do Passe é do **UTAC106e**; fixado por teste que proíbe `fetch(`/`apiPost`/
> escrita no saldo nesse ficheiro. **SEG2 (pendência #1)** — `/ofertas-programadas` entrou no `Set
> rotasProibidas` (`AppContext.jsx:640`), fechando o resíduo ⚠A1 do validador do 106b: o **lojista**
> passa a ser expulso para `/corporativo`. **SEG3 (pendência #2)** — `FRASE_MENOR_LANCE_UNICO`
> (`MercadoLances.jsx:234`) passou de «Quanto você **paga** por esse item?» para «Quanto você **oferta**
> por esse item? O menor lance único leva!» — alinhamento com o **Art. 7** do Regulamento («QUANTO VOCÊ
> OFERTA POR…»); a lista `AUTORIZADAS` do teste do 106b passou de **3 para 4** opções. **SEG4 (pendência
> #3)** — `glossario.test.mjs`: `\bapostas?\b` → **`\bapost\w*\b`** e `\bsortes?\b` → **`\bsort\w*\b`**
> (fecha o buraco das formas VERBAIS — «aposte», «apostar», «sorteio»); **provado nas DUAS direcções**
> com o teste real (regex NOVO → RED; regex ANTIGO → GREEN, ou seja o buraco existia). **SEG5 (pendência
> #4)** — a ordem dos itens **secundários** da `Sidebar` foi alinhada com o `SECONDARY_LINKS` do
> `BottomNav` («Configurações» para o fim); **só a ordem**, estrutura do rail intacta. **Testes:** novo
> `src/__tests__/utac106c-carteira.test.mjs` (12 testes, estático) e novo
> `src/__tests__/utac106c-carteira-render.test.mjs` (**8 testes de RENDER + CLIQUE** com o
> `_hook-runner`+`_ponte-ssr` do repo e duplos em `src/__tests__/_stubs-106c/` — fecha o limite ℹN5 do
> 106b, «os testes são proxy de texto-fonte»); guardas do título no `mc99-limpeza-ui` e `AUTORIZADAS`
> actualizados. Suíte **frontend 725/725 · backend 992/998** (era 705/705); `vite build` ✓. **Mutação:**
> **6/6** do executor (1 por segmento) + **8/8** do validador adversarial. **Validador adversarial:
> APROVADO COM RESSALVAS · 0 bloqueantes** (as **10** alíneas (a)-(j) resistiram todas); **3 notas ℹ️**,
> duas **fechadas com teste/registo** (artefacto do render versionado; log commitado) e uma **escalada**
> (copy contraditória do parágrafo do saldo, que continua a dizer «Lance Relâmpago»/«Lance Programado»).
> **Resíduos declarados:** o parágrafo de apoio do saldo (P1) e o saldo em **outros** ecrãs (Dashboard,
> modal PIX, Corporativo) ficam para UTAC próprio — **não** autorizados aqui. ⚠️ `_logs/DEBT.md` **não**
> foi tocado (fora da lista AUTORIZA do enunciado — GATE 3): o registo da dívida de copy é decisão do
> operador. Log: `_logs/UTAC106c-carteira.md`; veredicto: `_logs/UTAC106c_SEG7_VALIDADOR.md`.

> 🚀 **UTAC106c — DEPLOY (2026-10-04, comando adicional do operador).** O push **não** disparou
> auto-deploy (produção continuou em `index-Dv6PWHYo.js`; medido 3×). Correu-se `netlify deploy --prod`
> em **foreground** a partir da raiz do repo → **`✔ Deploy is live!`** (build **3m49s**). Produção:
> `https://silly-stardust-ca71bc.netlify.app` · bundle **`index-Dv6PWHYo.js` → `index-DrXuiYji.js`** · home
> **200** e `/.netlify/functions/health` **200**. Verificado nos
> **chunks lazy** (a app é code-split; medir só a entrada daria falso negativo): o chunk da Carteira traz
> «Comprar Passe Desafio» + «Saldo Disponível» + `#f5a623` e **já não** traz «Minha Carteira»; o dos
> Lances traz «Quanto você oferta por esse item?». ⚠️ O build da Netlify corre `npm install` e
> **alterou `desafio-gut/frontend/package-lock.json`** (ficheiro do NÃO AUTORIZA): o mutado foi
> **arquivado fora do repo** e o ficheiro **restaurado ao HEAD** (sha256 `5b40f11c…`); a suíte foi
> **re-corrida DEPOIS do deploy** (**725/725 · 992/998 VERDE**). Custo: **≈ US$ 0,25** de saldo real
> (arranque **6,77** → fecho **6,52**); ≈ US$ 0,176 pela estimativa da base.

> 🎟️ **UTAC106d-v2 — MODELO DO PASSE VIA B (programa de fidelidade), ADITIVO (2026-10-04).** Cria o modelo Via B do Passe **sem tocar no Via A**: nova tabela **`public.pontos`** (Supabase, produção `vjslwowwrpcawijdiksm`, versão **20261004**; `endereco` PK, `pontos` int `CHECK >= 0`, `historico` jsonb; RLS + GRANT `service_role`), novo módulo **`_lib/passe-pontos.mjs`** (constantes `PONTOS_POR_PASSE = 1`, `PONTOS_POR_CARTAO = 50`, `VALOR_PASSE_RS = 2.00`; CAS `.eq("pontos", base)` + idempotência por `ref`; nunca `pontos < 0`) e novo endpoint **`comprar-passe-pontos.mjs`** (POST Bearer → débito atómico R$ 2,00 → crédito de 1 ponto; idempotência por `idempotencyKey`; auto-reembolso em falha). **20 testes** (backend 992→**1012/1018**; frontend 725/725), mutação **10/10**, `vite build` OK. **Não toca** em `_lib/passe.mjs`, `comprar-passe.mjs`, `public.passes`, nos **4 testes do Via A** (mc105a-passe 10 · mc105a-e2e 22 · mc105a1-passes-lgpd 11 · utac105b-ligacao 8 — todos verdes) nem nos 2 scripts de mutação do Via A. Validador adversarial: **APROVADO COM RESSALVAS · 0 bloqueadores** (10/11 alíneas resistiram) — ℹ️A (o CAS da concorrência não era exercitado; mutante sobrevivia) **fechado com o teste F9** (mutante do CAS passa a RED); ℹ️B fechado com `scripts/mc106dv2-prova-mutacao.mjs` (**extensão de escopo declarada**, GATE 3); ℹ️C/ℹ️D declarados. Deploy em foreground (`6ac2c008…`): home/health **200**; `comprar-passe-pontos` ao vivo → **401 `token_ausente`**; o bundle do frontend ficou **inalterado** (`index-DrXuiYji.js` — nenhum ficheiro de `src/**` mudou). Commits `8abf84a` (código, validado) → `9f7402a` (fecho dos ℹ️) → registo. Próximo: **UTAC106e** (ligar a Carteira ao endpoint), 106f (palpite +2), 106g (resgate do cartão).

> 🛒 **UTAC106e — UI DA COMPRA DO PASSE DESAFIO (2026-10-04).** Liga o botão «Comprar Passe Desafio R$ 2,00» da **Carteira** ao endpoint **`POST /comprar-passe-pontos`** (do UTAC106d-v2, live). **SÓ frontend** — o endpoint, `_lib/passe-pontos.mjs`, o modelo Via A (`_lib/passe.mjs`/`comprar-passe.mjs`) e `public.passes` **intocados**. Novos: `src/utils/idempotency.js` (UUID v4 por chamada), `src/hooks/useComprarPasse.js` (`apiPost` com `Bearer` + `idempotencyKey`; mapeia 401→«Sessão expirada», 402→«Saldo insuficiente», 400/5xx) e `src/components/ComprarPasseModal.jsx` (balão «Vais comprar 1 Passe por R$ 2,00. Ganhas 1 ponto. Continuar?», spinner no loading). `MinhaCarteira.jsx` alterado **só na zona do botão/balão do Passe** (o balão inline do 106c passou a componente; «Confirmar» passou de navegar para **comprar**; toast «1 ponto creditado»; 402 → toast vermelho + atalho «Carregar agora (PIX)»). **14 testes** (frontend 725→**739/739**; backend 1012/1018), mutação **9/9**, `vite build` OK. Guardas do 106c actualizados **mantendo a invariante** (**extensão de escopo declarada**) + `_stubs-106e/` + `scripts/mc106e-prova-mutacao.mjs`. Validador adversarial: **APROVADO COM RESSALVAS · 0 bloqueadores** (12/12 hipóteses refutadas) — as 3 ressalvas **fechadas na mesma ronda** (⚠️ R1: corrida de mesmo tick → guarda por `useRef` + teste/mutante MF9; ℹ️ R2: comentários invertidos, erro meu; ℹ️ R3: o atalho PIX passa a fechar o balão). Deploy em foreground: bundle **`index-CDCJz5rl.js` → `index-DB6OZpjL.js`**; home/health **200**; o chunk da Carteira ao vivo traz «Vais comprar»/«Continuar?»/`comprar-passe-pontos` (sha256 local == produção). Commits `044c26c` (validado) → `298ee65` (fecho dos achados) → registo. Próximo: **UTAC106f** (Ofertas Programadas + palpite +2), 106g (resgate do cartão).

> 🎟️ **UTAC106f — OFERTAS PROGRAMADAS (ecrã real) + PALPITE (+2 pontos, BÓNUS) (2026-10-04).** A aba `/ofertas-programadas` deixou de ser o placeholder «EM BREVE» e passou a **ecrã real**: **pontos «X / 50» + barra de progresso**, **cartão da Família Quildo** (desenhado em CSS — não existe ficheiro de imagem no repo), **histórico** de movimentos, **botão «Resgatar cartão»** (visível só a ≥50 pontos e **desactivado** — a lógica é do 106g) e estado vazio com caminho para a Carteira. **`EM_BREVE_MODE` continua `true`** (trava os cronómetros; só a PÁGINA saiu do gate). **Palpite como BÓNUS:** nova tabela **`public.palpites`** (migração `20261005`, **aplicada em produção**: `20261005 | 20261005`), `_lib/passe-pontos.mjs` **estendido só por adição** (`PONTOS_POR_PALPITE_CERTO=2`, `registarPalpite`/`lerPalpite`/`lerPalpites`/`apurarPalpite`) — as funções existentes ficaram **byte-intactas (`+115 / −0`)** —, endpoints **`registar-palpite`** (Bearer), **`apurar-palpite`** (ADMIN) e **`ler-pontos`** (Bearer; extensão declarada, porque a RLS de `pontos`/`palpites` só abre ao `service_role`), hooks `usePontos`/`usePalpite`. Regra: 1 palpite por edição; apura-se no fecho; **o mais próximo leva +2** (empate → o mais antigo); sem acertadores, ninguém recebe; crédito com ref idempotente ⇒ **re-apurar não paga 2×**. ⚠️ **O palpite NÃO decide o cartão** (Google Play) — há teste dedicado para essa invariante. **⚠️ REFUTADO EM PARTE pelo validador adversarial (R1, 2026-10-04) — UTAC106f NÃO FECHADO:** medido com duplo PostgREST, **48 pontos de COMPRA + 2 de palpite = 50 ⇒ `podeResgatarCartao=true`** — o bónus ENTRA na mesma soma que alimenta o cartão, ao contrário do que a copy do ecrã afirma («só com os pontos das tuas compras»). O meu próprio teste 11 codificou esse comportamento como esperado (erro do instrumento, declarado). **PARADO → CORRIGIDO (opção A, commit `1eb3ca1`):** o operador decidiu que **o cartão conta SÓ pontos de COMPRA** — `pontosDeCompra()`/`podeResgatarCartaoComCompra()` (adições) e `ler-pontos` devolvem `pontosCartao` (a barra usa-o); o bónus aparece à parte («não conta para o cartão»). O teste que codificava o defeito foi substituído por 4 testes R1 + 1 regressão de render; mutação **7/7** (novo MP7); frontend **753/753**, backend **1028/1034**; deploy refeito (`index-JXLwGXQc.js`). **Correcção NÃO re-validada** (sem 2.ª ronda). **Em aberto para o 106g:** R2 (idempotência da apuração por edição, não por endereço) e o `registar-palpite` não exigir edição Programada/aberta. Ver `_logs/UTAC106f_SEG8_VALIDADOR.md`. O texto acima mantém-se À VISTA (GATE 15). Testes: frontend 739→**752**, backend 1012→**1024**, mutação **6/6**, `vite build` OK. Deploy em foreground: bundle `index-DB6OZpjL.js` → **`index-BDo9ZgMU.js`**; home/health 200; `/registar-palpite`→**401**, `/ler-pontos` GET→**401** (POST→405), `/apurar-palpite`→**401** (admin); chunk ao vivo com o ecrã real (sha256 local == produção). **HI5: DENTRO (≈1 h 11, 19:08 → 20:19)** — ⚠️ *erro do meu instrumento, corrigido no fecho:* o log afirmou primeiro «HI5 EXCEDIDO (≈2 h 25)»; eu tinha atribuído a esta ronda o carimbo de arranque do UTAC106e (18:22). A afirmação errada fica à vista (GATE 15). Commits: `e713c3e` (código, o validado) + registo. Próximo: **UTAC106g** (resgate do cartão).

> 🔁 **UTAC106f-R1v — RE-VALIDAÇÃO DA R1 (2026-10-04).** Ronda curta de validador adversarial **focada só na R1** (a correcção `1eb3ca1` — o cartão conta SÓ pontos de COMPRA). Worktree próprio (`tmp-r1v-val/wt`, helper A13), A/B pareado contra `e713c3e`. **Veredicto: PARCIAL — 1 bloqueante** (na *garantia de teste*, não no comportamento). **Comportamento APROVADO:** o palpite NÃO decide o cartão — (a) 48 compra + 2 palpite ⇒ `pontosCartao=48`, `podeResgatarCartao=false`; (b) 50 compra ⇒ `true`; (c) só palpite (2 ou 60) ⇒ `false`; (d) o resgate subtrai. O A/B reproduz o defeito ANTES (`48+2→true`, e «só palpite 60→true») e o conserto DEPOIS; o endpoint real `ler-pontos.mjs` foi medido por HTTP (4/4). **Garantia REFUTADA:** `ler-pontos.mjs` — a única camada que a UI consome para decidir o cartão — **não tem teste**; 3 mutantes adversariais do validador (**R-C** `pontosCartao=pontos`, **R-D** `podeResgatarCartao: pontos>=50`, **R-F** `progresso`) **sobrevivem à suíte canónica inteira** e o gate `7/7` continua verde ⇒ *«mutação 7/7 mata a regressão R1»* é **falsa como garantia** (o MP7 versionado só muta o TEXTO da barra) — **erro do MEU instrumento, declarado**. ℹ️ não bloqueantes: a largura da barra e o rótulo «Teus pontos» do `ComprarPasseModal` (mostra o TOTAL, não os pontos de cartão). **PARADO** (o enunciado manda PARAR em PARCIAL; nada corrigido). **Remediação proposta (SÓ teste, UTAC próprio, ~30-45 min):** promover `evidencia-r1/ler-pontos.endpoint.test.mjs` para `netlify/functions/_tests/ler-pontos.test.mjs` + mutantes R-C/R-D em `scripts/mc106f-prova-mutacao.mjs`. Base legal da R1 **provada** ⇒ o UTAC106g não herda contradição. Ver `_logs/UTAC106f-R1v-revalidacao.md` e `Desktop/RELATORIO-UTAC106f-R1v-REVALIDACAO.txt`.

> 🧪 **UTAC106f-R1t — REPARAÇÃO DA GARANTIA DE REGRESSÃO DA R1 (2026-10-04).** Fecha o bloqueante 1 do R1v (a R1 estava CORRECTA mas FRÁGIL: 3 mutantes sobreviviam à suíte canónica inteira). **Só testes + mutação + copy — NÃO altera comportamento** (`_lib/passe-pontos.mjs` e `ler-pontos.mjs` intactos por diff). **NOVO** `_tests/ler-pontos.test.mjs` (9 testes): mede o **COMPORTAMENTO REAL** do endpoint que a UI consome (esta camada — a única que DECIDE o cartão — não tinha teste NENHUM). Controlo positivo: R-C → 4 falhas, R-D → 3 falhas. `scripts/mc106f-prova-mutacao.mjs`: **+R-C +R-D** (alvo `ler-pontos.mjs`), **+R-F** (a LARGURA da barra, que não estava coberta) e **+R-G** (rótulo do modal) ⇒ **7/7 → 11/11 PROVADOS**. Suíte: frontend 753→**754/754**, backend 1028→**1037/1043**, `vite build` OK. **PROVA:** os 3 mutantes do R1v agora dão **VERMELHO na suíte canónica** (antes: VERDE) — R-C (4 falhas), R-D (3), R-F (1). Validador adversarial: **APROVADO · 0 bloqueantes** (5×5 por mutante, entrada/saída por md5). ⚠️ **Escalado:** o rótulo do `ComprarPasseModal` **não** pôde passar a mostrar `pontosCartao` — esse valor NÃO existe em `MinhaCarteira.jsx`, `useComprarPasse.js`, `AppContext.jsx` nem `comprar-passe-pontos.mjs` (todos fora do AUTORIZA), logo o modal continua a mostrar o **TOTAL** com um disclaimer honesto («Teus pontos (total): X → X+1 — o cartão conta só os pontos das compras»); a incoerência número-a-número com a barra «48 / 50» **persiste** e a decisão volta ao operador. ℹ️ R-G é guarda de COPY (não de comportamento); a guarda da largura é regex sobre o HTML renderizado (morde, mas é proxy do DOM). Commit `79ce968`. Ver `_logs/UTAC106f-R1t-reparacao.md` e `Desktop/RELATORIO-UTAC106f-R1t-REPARACAO.txt`.

> 🎁 **UTAC106g — RESGATE DO CARTÃO (50 pontos) + R2 + VALIDAÇÃO DA EDIÇÃO (2026-10-04/05).** Fecha o ciclo do programa de fidelidade Via B: aos **50 pontos de CARTÃO** o titular troca-os pelo cartão colecionável físico. NOVA tabela **`public.resgates`** (migração `20261006`, **APLICADA** em produção; `idempotency_key` UNIQUE, status CHECK, RLS/GRANT `service_role`), NOVO **`_lib/resgates.mjs`** (store) e NOVO endpoint **`resgatar-cartao.mjs`** (POST Bearer: 201 criado · 200 idempotente · 400 morada/cartão · 401 · 402 pontos insuficientes · 502). **`registarResgate()`** em `_lib/passe-pontos.mjs` orquestra idempotência → gate do CARTÃO por **`podeResgatarCartaoComCompra()`** (a NOVA, nunca a antiga) → débito de 50 → registo do pedido → **ROLLBACK**. UI: `useResgatarCartao.js` + `ResgatarCartaoModal.jsx` (morada reutilizada de `src/lib/pedidos.js`) e o botão «Resgatar cartão» **ACTIVO** (era `disabled` «até o 106g»). **R2 CORRIGIDA:** a chave do bónus **JÁ** incluía `edicaoId` (a premissa do enunciado era NO-OP — refutada por medição); o defeito real (ref verificada no histórico DE CADA ENDEREÇO) fecha-se com **`edicaoApurada()`** — edição apurada **recusa palpites novos**; `registar-palpite` passa a exigir `tipo==="programado" && status==="aberto"` (409; os nomes do enunciado — `programada`/`estado` — foram **refutados** por medição em `edicoes-core.mjs`). Testes: frontend 754→**760/760**, backend 1037→**1054/1060**, `vite build` OK. **VALIDADOR ADVERSARIAL — 2 RONDAS.** 1.ª (PARCIAL): achou o **BLOQUEANTE B1** — o rollback **compensava** com outra `ref`, deixando o débito no histórico ⇒ no retry com a mesma `idempotencyKey` o débito era no-op mas o gate passava ⇒ **criava-se o pedido SEM cobrar** (medido: 502→201 com os 50 pontos intactos, cartão grátis); e a qualificação **Q1** (a alegação «1 EQUIVALENTE» era falsa: o mutante muda o retry a 50 pontos de 200 para 402). **Corrigidos** (`e392726`): **`reverterMovimento()`** — o rollback REMOVE a entrada e devolve o delta (CAS) — e o mutante do early-check reclassificado com teste do caso-limiar. 2.ª ronda: **0 bloqueantes** (B1 e Q1 aprovados) mas **refutou em parte o meu escopo**: achou um **facet de pagamento duplo** (crédito ANTES da marcação; se a marcação falhar, o guarda fica falso e uma 2.ª apuração paga +2 a outro endereço ⇒ edição paga **4**) com **fix IN-ESCOPO** ⇒ corrigido (`27c9583`): `apurarPalpite` desfaz o crédito recém-criado. Mutação **7/7 PROVADOS**. **DEPLOY** por integração Git (`8efa431..27c9583`): home 200 · `POST /resgatar-cartao` **401** sem Bearer · GET **405** · chunk `OfertasProgramadas-*.js` com «Resgatar cartão»/`rg-nome`; `package-lock.json` **não sujado**. ⚠️ **ESCALADO (aberto):** (1) **guarda principal do B2** — sinal persistente de «apurada» (caso dos 0 palpites) exige `apurar-palpite.mjs`/`edicoes-core.mjs`, **fora do AUTORIZA** (dano = +2 de prestígio, só se o admin apurar com a edição aberta); (2) **auto-recuperação** se a reversão do resgate falhar (502 `devolvido:false` — fail-closed, sem auto-recuperação); (3) **notificação à Associação** — sem canal no repo (GATE 2); (4) rótulo do modal da Carteira (herdado do R1t). Ver `_logs/UTAC106g-resgate.md` e `Desktop/RELATORIO-UTAC106g-RESGATE.txt`.

> 📜 **UTAC106h — REGRAS OFICIAIS + CONFORMIDADE GOOGLE PLAY (2026-10-05).** Último UTAC da série 106f/106g/106h. Cumpre o requisito que faltava da política Play *Gamified Loyalty / Real-Money Gambling*: **«Regras oficiais publicadas no app»**. Entregue: **`docs/regras-oficiais.md`** (documento FONTE, 9 secções: identificação e vendedor legal — Associação Recreativa dos Nordestinos no Amazonas, CNPJ 23.040.066/0001-00 —, o programa, acúmulo, resgate, validade, **arrependimento 7 dias CDC art. 49**, «**este programa NÃO é um concurso**», LGPD, foro Manaus/AM) + página **`/regras-oficiais`** (`src/pages/RegrasOficiais.jsx`, dentro do AppLayout, `GlassCard`, 1 `h1` + 9 `h2` + link de volta) + rota lazy em `App.jsx` + link **«📜 Regras Oficiais»** no menu **«Mais»** (`BottomNav.SECONDARY_LINKS` e `Sidebar`, mesma ordem) + um `<Link>` em `OfertasProgramadas.jsx`. **TODOS os números foram MEDIDOS antes de escritos** (RESSALVA 3 «as regras têm de ser verdadeiras»): 1 Passe = 1 ponto (`passe-pontos.mjs:27`), 50 pontos = 1 cartão (`:28`), +2 do palpite (`:168`), palpite **fora** de `TIPOS_QUE_CONTAM_PARA_CARTAO` (`:319`), R$ 2,00 (`ComprarPasseModal.jsx:25`), 7 dias (`pedidos.mjs:34`), empate → o palpite **registado primeiro** (`apurarPalpite`, `<` estrito), zero libs de billing. **OS 7 REQUISITOS DA PLAY VERIFICADOS** (tabela no log): 1 enquadramento, 2 transacção separada (R$ 2,00), 3 benefício complementar (palpite), **4 regras publicadas no app (este UTAC)**, 5 rácio 1:1, 6 rácio 50:1, 7 método de selecção divulgado — **nenhum falha**. **VALIDADOR ADVERSARIAL — 2 RONDAS.** 1.ª (PARCIAL, 1 BLOQUEANTE): a página **publicava MENOS** do que a fonte legal — faltavam os blocos LGPD «**Partilha**» (compartilhamento com terceiros) e «**Retenção**», a cláusula do §6 (devolução de produto com o cartão já enviado), «um por Oferta Programada» e «comércio electrónico por dropshipping» — **e a guarda de consistência, sendo uma amostra de 10 factos, não o apanhava**. Corrigido (`a573144`): blocos acrescentados à página + factos à guarda + **cobertura estrutural** (os 9 cabeçalhos do `.md` têm de ser os 9 `h2` da página) + comparação com espaço normalizado, com **prova por mutação** de que a guarda morde (retirar o bloco da PÁGINA ou do `.md` → 13/14 VERMELHO; md5 restaurados). 2.ª ronda: ver bloco seguinte. Suíte **774/774 + 1054/1060 VERDE**, `vite build` OK, `package-lock.json` não sujado. **DEPLOY** por integração Git (`7f0774f..a573144`) com verificação em produção. ⚠️ **LIMITES DECLARADOS (não são provas de conformidade):** (1) a página vive **dentro do AppLayout** ⇒ **atrás do gate LGPD** (`Boot.jsx:52`, `ROTAS_PUBLICAS` sem ela); torná-la pré-consentimento é **uma linha** em `Boot.jsx`, **fora do AUTORIZA** ⇒ escalado; (2) **o AAB instalado NÃO tem a página** — `capacitor.config.ts` sem `server.url` ⇒ assets empacotados ⇒ **é preciso gerar e subir um AAB novo** (Java 21) para o requisito 4 valer no app da loja (bloqueio OPERACIONAL, no topo da lista do Ruan); (3) **a Play Console NÃO foi medida** — sem sessão Google do titular; «não medido» **não é** prova de conformidade (precedente em `_logs/MC100_ESTADO-PLAY-CONSOLE.md`); (4) o **GUTO/RAG NÃO cobre** o programa — o índice vem de `docs/chatbot/regulamento.md`, que não menciona passe/pontos/fidelidade ⇒ **UTAC próprio**; (5) o **prazo de entrega (30 dias)** e a **nota fiscal** são decisões de negócio declaradas, não comportamento medido; (6) **DEC-01/R-01** (Passe vs Play Billing) continua **aberto** — não é deste escopo. Ver `_logs/UTAC106h-regras.md` e `Desktop/PREPARACAO-CANDIDATURA-PLAY.txt` (**recomendação: NÃO candidatar ainda** — gerar o AAB novo, refazer Data Safety / Financial features / IARC e completar a ficha, por esta ordem).

> 🔎 **UTAC106j — DIAGNÓSTICO DO 401 NA COMPRA DO PASSE (2026-10-05, `b7dad75`).** DIAGNÓSTICO PURO: **nada corrigido, nada deployado.** O operador testou a compra do Passe em produção (`/carteira`, saldo R$ 2,00) e recebeu «Sessão expirada» com `POST /comprar-passe-pontos → 401`. **CAUSA RAIZ MEDIDA (e confirmada pelo validador com tokens REAIS em produção):** os 4 hooks da **Via B** pedem o `Bearer` ao **`POST /auth-lance`** — que emite JWT `tipo:"lance-auth"` (`auth-lance.mjs:98` → `assinarLanceAuth`, `_lib/jwt.mjs:44`) — enquanto os 4 endpoints da Via B validam com **`verificarUserSession`**, que **rejeita por desenho** tudo o que não seja `tipo:"user-session"` ou `"admin-access"` (**`_lib/jwt.mjs:81`**) ⇒ **401 `token_invalido`**. O token é **válido mas de PROPÓSITO ERRADO**; o prefixo está correcto (`src/lib/api.js:28`). O frontend **tem** o provedor certo e usa-o noutro sítio: `AppContext.jsx:921` faz `POST /auth-user` (`assinarUserSession`, `_lib/jwt.mjs:69`, `tipo:"user-session"`) e guarda-o em `authToken` (`:432`), que alimenta o **`saldo-rs`** (`:1017`) — **por isso o utilizador VÊ o saldo** e a sessão parece boa. **ALCANCE REAL (maior que o relatado): os 4 fluxos Via B estão inoperáveis em produção** — `useComprarPasse.js:32` (compra), `usePontos.js:22` (`ler-pontos`), `usePalpite.js:15` (`registar-palpite`) e `useResgatarCartao.js:31` (**`resgatar-cartao`, escrito no UTAC106g**) — todos com `verificarUserSession`. **A Via A NÃO é afectada**: `comprar-senhas.mjs:135` usa `verificarLanceAuth` e **aceita** o mesmo token (por isso «Trocar R$ 2,00 → 1 Senha» funciona). **A premissa do enunciado «o utilizador consegue usar `ler-pontos`» é FALSA** (mesmo provedor; o saldo vem de outro caminho). **Padrão do repo:** 25 ficheiros com `verificarUserSession` (o dominante) vs 5 com `verificarLanceAuth`; `assinarUserSession` só em `auth-user.mjs`. **PORQUE NENHUM TESTE APANHOU (duas camadas de cegueira):** (1) `_stubs-106e/useTrocarPorSenhas.js` devolve token FIXO — substitui exactamente a peça avariada; (2) `_tests/ler-pontos.test.mjs:71` **mocka o próprio `verificarUserSession`** — nunca exercita a lógica de `tipo`. **VALIDADOR: APROVADO, 0 bloqueantes** — cunhou ambos os tokens ao vivo (carteira descartável) e mediu a **inversão perfeita**: com `lance-auth` os 4 Via B dão 401 e o `comprar-senhas` passa para dentro do handler; com `user-session` é o contrário. Hipóteses alternativas mortas: rate-limit dá **429**, `sistemaPausado` **503**, CORS não dá 401, o body é validado **depois** do auth. **RECOMENDAÇÃO (operador decide):** **Opção A** — trocar o provedor nos 4 hooks para o `authToken` do `AppContext` (o do `saldo-rs`); **Opção B** — aceitar `lance-auth` nos Via B (rebaixa a fronteira de auth). **Qualquer correção tem de trazer um teste com a assinatura REAL** (sem duplo de `getAuthToken` nem mock de `verificarUserSession`). **SEQUÊNCIA:** UTAC106j-fix → só depois **UTAC106i (AAB)** (senão o AAB submetido inclui os 4 fluxos quebrados) → UTAC próprio para o ruído `eth_getFilterChanges` (fora do escopo). Ver `_logs/UTAC106j-diagnostico-401.md` e `Desktop/RELATORIO-UTAC106j-DIAGNOSTICO-401.txt`.


---

## R14 (append) -- UTAC106j-fix -- 401 da Via B: os 4 hooks usam o `authToken` (user-session)

**Fecha o 401 medido no UTAC106j.** Os 4 hooks da Via B (`useComprarPasse`, `usePontos`, `usePalpite`,
`useResgatarCartao`) pediam o Bearer ao `POST /auth-lance` (JWT `tipo:"lance-auth"`) enquanto os 4
endpoints (`comprar-passe-pontos`, `ler-pontos`, `registar-palpite`, `resgatar-cartao`) validam com
`verificarUserSession` (`_lib/jwt.mjs:81` rejeita tudo o que nao seja `user-session`/`admin-access`) =>
`401 token_invalido` em producao. **Correccao (Opcao A, decisao do operador):** os 4 hooks passam a usar
o `authToken` (**user-session**) do `AppContext` -- o MESMO que o `saldo-rs` ja usa. Guarda nova
`sem_sessao` (o `authToken` e cunhado em `POST /auth-user` e chega depois do `address`); `usePontos`
depende de `[address, authToken]` e re-corre quando o token chega. **NAO alarga a superficie de auth**:
endpoints, `_lib/jwt.mjs`, `_lib/auth.mjs` e `AppContext.jsx` ficam intactos; a **Via A**
(`comprar-senhas`, «Trocar R$ 2,00 -> 1 Senha») continua com `lance-auth`/`verificarLanceAuth`.

**Cegueira dos testes fechada (a razao de o 401 ter passado):** (1) `_tests/ler-pontos.test.mjs`
mockava o PROPRIO `verificarUserSession` -- passava com qualquer token; passa a assinar tokens a serio
(`assinarUserSession`/`assinarLanceAuth`). (2) os testes de frontend davam ao contexto um `authToken`
com o MESMO valor do duplo de `getAuthToken` (asserção vacuosa) -- passam a usar valor DISTINTO. (3) novo
`_tests/auth-via-b-401.test.mjs`: fronteira de auth dos 4 endpoints com token real + inversao da Via A.

**Prova:** mutacao 5/5 RED (cada hook revertido -> o teste do Bearer cai; re-introduzir o mock do
verificador -> o teste negativo cai), restaurados byte-identicos. Suite **VERDE** (frontend 774/774 ·
backend 1061/1067). `vite build` OK. Validador adversarial: **APROVADO COM RESSALVAS · 0 bloqueantes**
(ressalva 1 fechada no commit `7dc291f`). **Deploy** (`netlify deploy --prod`, build 6m 3.7s): bundle
`index-BEKI8mOb.js` -> `index-B5dFqsDB.js`; prova de ponta a ponta em producao com token real
(user-session -> 402/200/404/400; lance-auth -> 401 `token_invalido` nos 4). Commits `4933629` (fix) ->
`7dc291f` (correccao pos-veredicto) -> registo. Registo: `_logs/UTAC106j-fix-401.md` e
`Desktop/RELATORIO-UTAC106j-fix-401.txt`.


## R14 (append) -- UTAC107a-back -- MAPEAMENTO de contratos + navegacao (hermes)

**Tipo:** mapeamento (ZERO alteracao de codigo). **HEAD:** `f498fde` (= origin/main). **Commits:**
`f498fde` (baseline) -> `6e06f0c` (mapa + veredicto) -> registo (R14). **Suite:** frontend VERDE
774/774 · backend VERDE 1061/1067. **Deploy:** live (site 200). Skill: `mc-driven-projects`.

**Frente A (contratos):** 83 endpoints em `desafio-gut/frontend/netlify/functions/` (o dir da RAIZ
esta vazio) -- Via A 15 · Via B 6 · Core 14 · Pagto 6 · Corp 5 · Admin 23 · Infra/Cron 14. **25 orfaos**
de frontend (0 sitio de chamada em `src/`); legado Via A orfao: `comprar-passe`, `voucher`,
`consolidar-lances`, `renovacao-adesao`, `pontuacao`. 4 contratos-chave detalhados (`ler-pontos`,
`comprar-passe-pontos`, `registar-palpite`, `resgatar-cartao`). 18 migracoes Supabase (1:1).

**Frente B (navegacao):** rotas `App.jsx:444-522`; BottomNav = 4 tabs (Carteira · Menor Lance Unico ·
Inicio · Ofertas Programadas) + Mais; Sidebar = 10 itens (4 em sincronia). Unico alias:
`/menor-lance-unico` -> redirect `/mercado`. **Caminhos mortos:** `/edicao/:id` (`EdicaoDetalhe` sem
caminho de UI -- o banner passou a modal; `EdicaoCard.jsx:8` contradiz o codigo), `/corp`, `/redirect`.
**Indicador «novo»:** NAO existe badge «NOVO»; o deposito de R$2 NAO cria notificacao; aparecem o
bloco «PIX aprovado» no modal, o saldo a dourado, os botoes `Trocar`/`MLU` a ativar e a barra de pontos.

**Validador adversarial (worktree f498fde, A13):** **PARCIAL · 4 bloqueantes**, TODOS corrigidos no
documento -- B1 contagem de orfaos (26->25, definicao por sitio de chamada), B2 `pontuacao` orfa,
B3 `comprar-passe` sem consumidor, B4 subcontagem de `/privacidade`/`/excluir-conta` (extractor
alargado a `<a href>`/`href:`); mais notas i-5..i-11. **Erros dos meus instrumentos:** contagem de
consumidores por substring crua (contava comentarios), extractor sem `<a href>`, strip de comentarios
que deslocava linhas, e o cabecalho «26» sem varredura. Correcções pos-veredicto NAO re-validadas.

**Registo:** `_logs/UTAC107a-back-mapeamento.md` · `_logs/UTAC107a-back_SEG3_VALIDADOR.md` ·
`Desktop/RELATORIO-UTAC107a-back-MAPEAMENTO.txt`. **Custo:** ~US$ 0,103 (executor ~0,071 + validador
~0,033); saldo API 3,22 -> 3,08 (delta ~0,14); duracao ~22 min. **Handoff:** o UTAC107a-front (Opus 5.5)
usa este mapa para os mockups HTML/CSS e so arranca apos confirmacao do ambiente.


## R14 (append) -- UTAC107a-front -- MOCKUPS HTML/CSS das 4 abas (Opus 5.5)

**Tipo:** mockups, ZERO codigo de producao (`git diff 536c9cb..HEAD` so toca `docs/mockups-107a/*` e `_logs/*`). Suite
de partida **774/774 + 1061/1067 VERDE**; `vite build` OK (para o scratchpad, nao para o `dist/` do APK). Entrega:
`docs/mockups-107a/` -- `index.html` + 7 pranchas (tokens, Regra 1, Carteira, Inicio, Menor Lance Unico, Ofertas
Programadas, Regra 2), `tokens.css`, `mockup.js` (auditores no browser: toque >= 48 px e Regra 1), `DESIGN.md` (lint
oficial design-md: 0 erros, 0 avisos). As 4 skills de design estao no **Hermes** (`~/AppData/Local/hermes/skills/`), nao
nos caminhos do enunciado -- lidas e aplicadas (desvio declarado).

**Medido no codigo (o que o 107a-back nao mediu):** botao «Comprar Passe Desafio» branco s/ `#f5a623` = **2,03:1** (falha
AA; proposta texto `#0a0f1a` = 9,45); `Button md` = 44 px; «↻» ≈ 20 px; MLC com 3 vidros diferentes (TabelaLances com
`blur(20px)` + r12, unico backdrop-filter do app; CardLance `p-6` = 24 px); dourado em deriva `#f5a623`/`#ff9500`; 4 violacoes
da Regra 1 (frase do MLC, header da OP, link das Regras, aviso 402).

**Decisoes do operador (R18):** A -- sai do Inicio o cartao 🏆 (os KPIs de lances voltaram com F); B -- «Passe Desafio» =
pontos de cartao X/50; C -- tabela da OP = edicao Programada do palpite; D -- Carteira fiel ao layout actual; E -- menos texto
tecnico no ecra; F -- Inicio fiel ao actual com os 4 tiles (Saldo, Passe Desafio, Lances Unicos, Total de Lances); G -- rolagem
lateral = Dashboard MC99 (100%, snap, sem peek); H -- MLC limpo com 3 vidros (o vidro edicao + lance foi aprovado).

**Validador adversarial:** 1.a ronda **PARCIAL · 1 bloqueante** (coluna Estado cortada a 320-375 px) + 9 ⚠️ -- todos tratados;
destaque E-2: a copy dizia «se acertares», o backend premeia o **mais proximo** (corrigido). 2.a ronda **APROVADO · 0
bloqueantes**; N-1/N-4 corrigidos (nao re-validados), N-2/N-3 para o 107b. Verbatim: `_logs/UTAC107a-front_SEG6_VALIDADOR.md`
e `_SEG6_VALIDADOR-R2.md`. Lacunas para o 107b: endpoint de lances de edicao Programada (E-1), senhas on-chain invisiveis no
mobile (E-3), Dashboard sem `usePontos`, `/mercado` fixo na R-1. Custo em USD nao medido (sem `state.db`); subagente ≈ 470 k
tokens. Log: `_logs/UTAC107a-front-mockups.md`; relatorio: `Desktop/RELATORIO-UTAC107a-front-MOCKUPS.txt`.


## R14 (append) -- UTAC107b -- CARTEIRA: botoes, ordem, contraste, Regra 1 (hermes)

**Tipo:** CODIGO (frontend + testes). **Baseline:** `3714bbe` (= origin/main). **Commits:**
`3714bbe` -> `f1dc10f` (codigo) -> `f0da383` (correccoes pos-veredicto) -> registo. **Suite:**
frontend VERDE **779/779** (+5) · backend VERDE 1061/1067. **Deploy:** live (entry
`index-BGDcUbTp.js` -> `index-C85vkUz0.js`; chunk da Carteira `MinhaCarteira-Dxs6j9bI.js` ->
`MinhaCarteira-jQnp-D7l.js`). Mockup aplicado: `docs/mockups-107a/carteira.html` (variante A).

**As 7 decisoes:** (1) removido o botao «Trocar R$ 2,00 -> 1 Senha» (+ orfaos `useTrocarPorSenhas`/
`CreditoStatus`/`creditoTxHash`/`trocaInfo`/`trocaErro`); (2) «⚡ Menor Lance Unico» -> `/mercado`;
(3) «🎫 Ofertas Programadas» -> `/ofertas-programadas` (NOVO); (4) ordem Depositar PIX -> Comprar
Passe -> MLC -> OP; (5) contraste do Passe: **dourado solido `#f5a623` + texto navy `#0a0f1a` =
9,45:1** (era branco = 2,03:1); (6) Regra 1: o aviso 402 passou para DENTRO do vidro (R18-E
removeu a pilula «R$ OFF-CHAIN» e a frase de apoio); (7) e-mail PIX MANTIDO -- SEG0 mediu que o
modal de deposito mostra o codigo PIX, **nao** o destinatario (unico sitio: `MinhaCarteira.jsx:304`).

**Testes/mutacao:** +5 testes (contraste WCAG, ordem, Regra 1, e-mail, clique das OP); **mutacao
5/5 RED**, restaurado byte-identico.

**Validador adversarial (worktree `f1dc10f`, A13):** **APROVADO · 0 bloqueantes (2 notas i)**,
por sonda de render propria + AST (acorn/acorn-jsx) + mutacoes fora do worktree. **Uma alegacao
minha REFUTADA (i-N1):** o guard `vocabularioUI` era satisfeito pelos `title=` -- apagar os rotulos
visiveis mantinha-o VERDE; **fechado com codigo** em `f0da383` (exige os nomes como **rotulo
VISIVEL**; a mutacao volta a dar RED). i-N2 (aliases mortos) fechado. **Erro do instrumento:** o
validador esgotou as iteracoes ANTES de gravar o veredicto -- transcrito do resumo, com nota.
Correccoes pos-veredicto NAO re-validadas.

**RESIDUO ESCALADO (nao corrigido):** `ComprarFichasModal.jsx:547` (sucesso do deposito) diz «use
Trocar R$ por Senhas na carteira» -- instrucao obsoleta desde a decisao 1; fora do escopo (RESSALVA 1).

**Registo:** `_logs/UTAC107b-carteira.md` · `_logs/UTAC107b_SEG8_VALIDADOR.md` ·
`Desktop/RELATORIO-UTAC107b-CARTEIRA.txt`. **Custo:** ~US$ 0,159 (executor ~0,126 + validador
~0,033); saldo API 2,10 -> 1,78 (delta ~0,32); duracao ~45 min. **Proximo:** UTAC107c (Inicio).

## R14 (append) -- UTAC107c -- INICIO: Passe Desafio + destino + pendencia 107b (Claude Code, Opus 5.5)

**Tipo:** CODIGO (frontend + testes). **Baseline:** `b4eb151`. **Commits:** `fc06e0a` (codigo) -> `5ce939b` (correccao
pos-veredicto) -> registo. **Suite:** frontend VERDE **783/783** · backend VERDE 1061/1067. **Deploy:** live (entry
`index-CTHlkxI4.js` -> `index-CTjgmNWO.js`; o Dashboard vive agora no chunk `PrivyRoot-DiNpEIuB.js`).

**SEG0 PAROU (R20):** o mockup aprovado (`inicio.html`, variante A / R18-F) divergia do enunciado. Decisoes do operador
(R18, 2026-10-06): **R18-A** os KPIs «Lances Unicos»/«Total de Lances» FICAM (a decisao 3 do enunciado foi revogada);
**R18-B** sem barra de progresso; **R18-C** divisao Relampago/Programadas e rotulo do botao da Edicao Ativa FORA do escopo;
**R18-D** o comentario `ComprarFichasModal.jsx:490` tambem actualizado.

**Feito:** tile «Senhas» (saldoSenhas, Via A) -> **«🎟️ Passe Desafio» X / 50** com `pontosCartao` do `usePontos`
(`/ler-pontos`), destino **`/ofertas-programadas`**; estados: sem conta «—», a carregar/token por cunhar = skeleton, erro «—»,
vazio «0 / 50 · comece ja»; card **🏆 Menor Lance Unico removido** (o vencedor continua no `FimEdicaoOverlay`); Regra 1:
«Outras Edicoes» dentro de `GlassCard`; contraste 9,07:1 / 4,60:1. `ComprarFichasModal.jsx:547` -> «Para o Lance Programado,
o app converte R$ 2,00 em 1 senha automaticamente» (coerente com `CardLance.jsx:416`). **Mutacao 10/10 RED.**

**Validador adversarial: APROVADO COM RESSALVAS** -- (a)-(l) resistiram; ⚠️ V1 «0 / 50» prematuro durante 1 commit na
transicao de sessao (login; refresh com token em cache) -- **corrigido** com `estadoPasse(memo, …)` puro no Dashboard (o hook
e partilhado com OP, fora do escopo) + 5 testes de sequencia; ℹ️ NaN -> «—», comentario do stub. Correccoes NAO re-validadas.
⚠️ Lição do instrumento: asset inexistente devolve 200 (rewrite SPA) -- medir pelo nome referenciado + content-type.
**Escopo:** backend, `_lib`, AppContext, App.jsx, Carteira/MLC/OP, package*, 5 `.bak-*` intactos; `EM_BREVE_MODE = true`.
**Registo:** `_logs/UTAC107c-inicio.md` · `_logs/UTAC107c_SEG7_VALIDADOR.md` · `Desktop/RELATORIO-UTAC107c-INICIO.txt`.
**Custo:** USD nao medido (sem `state.db`); validador ≈ 105 k tokens; duracao ≈ 1 h. **Proximo:** UTAC107d (MLC).

## R14 (append) -- UTAC107d -- MENOR LANCE UNICO: frase, envelope, rotulo, tabela (Claude Code, Opus 5.5)

**Tipo:** CODIGO (frontend + testes). **Baseline:** `cc77fd3`. **Commits:** `46e21b5` (codigo) -> `0f1b317` (ressalvas) -> registo.
**Suite:** frontend VERDE **792/792** · backend VERDE 1061/1067. **Deploy:** live (entry `index-0Ua5yTN9.js`; chunk `MercadoLances-DNDUvu_w.js`).

**SEG0 PAROU (Ressalva 3 + 3 conflitos):** o mockup mostra OUTRA frase; Carteira (2rem) e Inicio (1.25rem) divergem no desktop; o campo do lance esta em
CENTAVOS (o rotulo «(R$)» + «0,01» faria licitar 100x menos); a `TabelaLances` ja existia. Decisoes do operador (R18, 2026-10-06):
**R18-A** frase do mockup «Ganha o menor lance que ninguem repetir.» DENTRO do vidro; **R18-B** envelope = Carteira; **R18-C** campo continua em centavos,
rotulo «Seu lance (em centavos)» (pt-BR) ligado por htmlFor; **R18-D** tabela «mockup completo»: no fim, `.gut-glass-standard` sem blur, 3 colunas.

**Feito:** `GlassHeader.jsx` (so o MLC o usa) topo 2rem / interior 20 px + prop `frase`; MLC em coluna unica com a tabela como ultimo vidro; saem «Status
(Art. 24)», «ID do Lance», txHash e o rodape «Dados sanitizados · Art. 25» (o Art. 25 continua citado em Configuracoes/Meus Ativos). Mutacao **9/9 RED**.
**Validador: APROVADO COM RESSALVAS** -- ⚠️ V1 perda do estado «Repetido/Unico» por linha (decisao de produto R18-D); ⚠️ **V2 escalado**: o mockup diz
«🏆 so com o resultado oficial», o codigo mantem o 🏆 local sem oficial (UTAC000.9); ℹ️ CSS morto e `px-3` mobile corrigidos (nao re-validados).
**Residuo:** `LanceStatusBadge.jsx` com vidro proprio (blur) -- fora do AUTORIZA. O rotulo novo tambem aparece no slot da especial do Inicio (so o texto).
**Escopo:** backend, `_lib`, AppContext, App.jsx, Carteira, Inicio, OP, BottomNav/Sidebar, package*, 5 `.bak-*` intactos; `EM_BREVE_MODE = true`.
**Registo:** `_logs/UTAC107d-mlc.md` · `_logs/UTAC107d_SEG8_VALIDADOR.md` · `Desktop/RELATORIO-UTAC107d-MLC.txt`.
**Custo:** USD nao medido; validador ≈ 115 k tokens; duracao ≈ 40 min. **Proximo:** UTAC107e (Ofertas Programadas).

## R14 (append) -- UTAC107e.1 -- OFERTAS PROGRAMADAS + V2 (Claude Code, Opus 5.5)

**Tipo:** CODIGO (frontend + testes). **Baseline:** `eab760d`. **Commits:** `6c0436c` -> `23a4bae` (ressalvas) -> registo.
**Suite:** frontend VERDE **801/801** · backend VERDE 1061/1067. **Deploy:** live (entry `index-CFzvYOmT.js`; chunk `OfertasProgramadas-rXEPT1cw.js`).

**SEG0 PAROU:** a etiqueta «SEU LANCE E O MENOR LANCE UNICO» em tempo real colide com o anti-bot MC28.1 (mainnet blinda a unicidade; `lances-flash?acao=verificar`
-> 403); a producao JA esconde os valores durante a edicao (e tambem depois — falta a revelacao); nao ha endpoint de palpites/lances de uma edicao.
Decisoes do operador (R18, 2026-10-06): **R18-A** etiqueta so DEPOIS do fecho; **R18-B** dividir: **107e.1 = OP + V2** (este) / **107e.2 = revelacao apos o
fecho + etiqueta**; **R18-C** tabela da OP so estrutura; **R18-D** V2 nos 3 sitios (TabelaLances + MeusAtivos + AppContext, extensoes declaradas).

**Feito:** OP com titulo em vidro, carrossel lateral (estrutura do Inicio) com o palpite DENTRO de cada cartao (sem/com palpite, mais proximo, nao foi dessa
vez, encerrada, abre em breve — copy do mockup: «mais proximo», nunca «acertou»), seccao «Palpite» separada removida, Regras como botao 48 px em vidro, tabela
«Palpites — Edicao <id>» no fim (vazia). `usePalpite.registar(valor, edicaoId)`. **V2:** sem resultado oficial ninguem leva 🏆 (muda o contrato do UTAC000.8/9/
10/15 e 105c — testes actualizados). Mutacao **10/10 RED**. **Custo:** skill `mc-driven-projects` com a metrica ¢/1M (Opus 5.5: 400 in · 2000 out · 20 cache).
**Validador: APROVADO COM RESSALVAS** -- V1 (agendado dito «encerrada») e V3 (teste do erro por cartao) corrigidos, nao re-validados; ⚠️ V2 escalado ao 107e.2:
overlays dizem «Nenhum lance unico registrado.» antes do oficial (hoje fechados pelo EM_BREVE).
**Escopo:** backend, `_lib`, App.jsx, Carteira, Inicio, MLC, CardLance, BottomNav/Sidebar, package*, 5 `.bak-*` intactos; `EM_BREVE_MODE = true`.
**Registo:** `_logs/UTAC107e-op.md` · `_logs/UTAC107e_SEG8_VALIDADOR.md` · `Desktop/RELATORIO-UTAC107e-OP.txt`.
**Custo:** validador 113 338 tokens = 2,3–227 ¢ (45 ¢ se tudo input); sessao principal nao medida (`/cost`); duracao ≈ 52 min. **Proximo:** UTAC107e.2.

## R14 (append) -- UTAC107e.2 -- REVELACAO POS-FECHO + ETIQUETA + LER-PALPITES + LARANJA RECONSTRUIDO (Claude Code, Opus 5.5)

**Tipo:** CODIGO (backend + frontend + testes). **Baseline:** `5c1886a`. **Commits:** `1798893` -> `6a05324` (A1-A4) -> `e255003` (R1/V23) -> registo.
**Suite:** frontend VERDE **818/818** · backend VERDE **1095/1101**. **Mutacao 25/25 RED.** **Deploy: BLOQUEADO** (`netlify deploy --prod` -> `JSONHTTPError: Forbidden`
em `createSiteDeploy`, 3 tentativas; site/conta sem bloqueio visivel -> conta SEM CREDITOS: o deploy automatico do push `1674bd8` ficou «Skipped due to account credit usage exceeded»). **Push feito** (R18-E). **Depois da recarga de creditos (R18-F): `netlify deploy --prod` foreground -> `Deploy is live!` (entry `index-3xsil5SO.js`); ler-palpites 401 sem token, verificar 403, chunks MLC/Inicio com a etiqueta e OP com ler-palpites; package-lock restaurado.**

**SEG0 PAROU (AU3):** em mainnet o `lances-flash` lia o blob legado (vazio) e nunca revelava; os lances vivem no Key-Per-Bid; o unico «encerrado» do backend e o
marcador `bid:{id}:consolidado`; a lideranca nao era guardada. Decisoes do operador (R18, 2026-10-06): **R18-A** revelar apos consolidar; **R18-B** laranja
**reconstruido no fecho** (replay por `processadoEm`, sem migracao, sem tocar no `lance-relampago`); **R18-C** estado do titular por `lances-flash?acao=meu-estado`
(Bearer user-session, endereco so do token); **R18-D** sem etiqueta na OP (o cartao e de palpite).

**Feito:** `lances-flash` revela os valores do KPB so com **marcador E edicao fechada** pelo criterio do `lance-relampago` (`verificarJanelaLance` =
`edicao_encerrada`; sem metadata -> nunca, ex.: R-1 sintetizado), lista revelada em cache 60 s; `acao=verificar` (anti-bot MC28.1) **inalterado (403)**.
`ler-palpites` (novo, Bearer): sem valor enquanto o `registar-palpite` aceita palpites (status aberto/agendado e nao apurada; o `termino_em` NAO revela).
`passe-pontos`: +`listarPalpitesDaEdicao`. `EtiquetaEstadoLance.jsx`: «SEU LANCE» neutro + «(estado)» na cor (decisao 3 do operador; contraste >= 4,5:1 medido
sobre a pilula), no MLC e no Inicio (`estAtiva.encerrada`); OP com a tabela ligada (`usePalpitesDaEdicao`, extensao declarada). `TabelaLances` intocada (🔒 = mockup).
**Validador: 2 rondas PARCIAL** -- A1 (a minha revelacao abria uma fuga com edicao consolidada ainda aberta), A2 custo, A3/A4 testes, R1 LGPD (cache sem prazo
apos exclusao de conta): **todos corrigidos**; R1/V23 nao re-validados em 3.ª ronda. Registados: lances no mesmo ms; lance tardio se a leitura da edicao falhar.
**Registo:** `_logs/UTAC107e.2-privacidade.md` · `_logs/UTAC107e.2_SEG-1_MEDICAO.md` · `_logs/UTAC107e.2_SEG8_VALIDADOR.md` · `Desktop/RELATORIO-UTAC107e.2-PRIVACIDADE.txt`.
**Custo:** validador 399 690 tokens = 8,0-799 ¢ (160 ¢ se tudo input); sessao principal nao medida (`/cost`); duracao ≈ 1 h. **Proximo:** desbloquear o deploy -> 107g.


## R14 (append) -- UTAC107g -- NAVEGACAO: duplicacoes, casa das senhas antigas, caminhos mortos (Claude Code, Opus 5.5)

**Tipo:** CODIGO (frontend + testes). **Baseline:** `b88ca5c`. **Commits:** `996c4c3` -> `5086652` (achados do validador) -> registo.
**Suite:** frontend VERDE **838/838** (+20) · backend VERDE 1095/1101. **Mutacao 21/21 RED.** **Deploy:** push = auto-deploy; live
(entry `index-BYkHOleH.js`, rotas em `PrivyRoot-DFGj5s1z.js`). HI5: ~47 min.

**SEG-1 AJUSTAR -> decisoes do operador (R18, 2026-10-06):** **R18-A** sairam 3 atalhos do «Acesso Rapido» do Inicio
(«Depositar PIX», «Converter Ficha», «Dar Lance» — destino ja e aba da barra e ja ha no ecra outro caminho; «Converter Ficha»
prometia a troca que o 107b removeu e ainda existia, ao contrario do que o enunciado dizia); **R18-B** catch-all
`<Route path="*">` -> Inicio (antes: URL desconhecida = ecra em branco); **R18-C** `pages/EdicaoDetalhe.jsx` APAGADO com a rota
`/edicao/:id`; **R18-D** seccao de senhas em Meus Ativos so texto (sem botao «usar»).

**Feito:** Meus Ativos ganha «🎫 Senhas antigas» (`estadoSenhasAntigas`, 5 estados, sem coercao, contagem em roxo); Carteira ganha,
dentro do vidro do saldo, «Tens X senhas antigas -> ver em Meus Ativos» (muted, 44 px, so com contagem conhecida > 0 e status
!= error) -> `/ativos`. Sai `/corp` (painel do lojista SEM guarda; unico produtor substituido no MC99.1). `/redirect` mantida e
documentada (retorno OAuth Privy + App Link). 25 endpoints orfaos re-medidos e registados (nada removido; nenhum auth/admin
aberto). Contagens do 107a-back estavam desactualizadas (re-medidas). Teste novo `src/__tests__/utac107g-navegacao.test.mjs`
prova o router com o `matchRoutes` REAL sobre a arvore do App.jsx.

**Validador adversarial: PARCIAL** (0 defeitos de produto) -- ⚠️ o catch-all escondia rotas vivas perdidas (V1/V2/V4) e o teste
do vidro era vacuo (V7); ℹ️ cor roxa e «stale» sem teste -> **todos fechados** (todo o destino de menu/navegacao tem de ter rota
propria; profundidade corrida do vidro); correcoes NAO re-validadas em 2.ª ronda. Teste do backend `_tests/mc8843` actualizado
(listava o ficheiro apagado — o meu grep do SEG-1 so cobriu `src/`).
**Escopo:** backend de producao, anti-bot MC28.1, package*, BottomNav/Sidebar/navModel (nao foi preciso), 5 `.bak-*` intactos;
`EM_BREVE_MODE = true`. **Pendencias:** comentarios para `/edicao/:id` (EdicaoCard/EdicaoBanner), `?rc=1` sem produtor, orfaos
candidatos a desligar, APK sem estas mudancas (106i).
**Registo:** `_logs/UTAC107g-navegacao.md` · `_logs/UTAC107g_SEG7_VALIDADOR.md` · `Desktop/RELATORIO-UTAC107g-NAVEGACAO.txt`.
**Custo:** validador 142 205 tokens = 2,8–284 ¢ (56,9 ¢ se tudo input); sessao principal ≈ 525 600 tokens de contexto = 10,5–1051 ¢
(210 ¢ se tudo input), nao medida com precisao. **Proximo:** 106i (AAB novo).


## R14 (append) -- UTAC107g.1 -- PENDENCIAS PEQUENAS DO 107g (Claude Code, Opus 5.5)

**Tipo:** copy + comentarios + registo de divida. **Baseline:** `d1e150e`. **Commits:** `f7171f6` -> `0a9f425` -> registo.
**Suite:** frontend VERDE **840/840** (+2) · backend VERDE 1095/1101. **Deploy:** push = auto-deploy; live `index-DDV4eNIE.js`. ~26 min (HI5 30).

**A (copy pt-BR):** «Tens N senhas antigas…» -> **«Você tem N senhas antigas…»** (Meus Ativos e indicador da Carteira);
«Não tens senhas antigas.» -> **«Você não tem senhas antigas.»**. Guarda nova nos testes contra marcadores pt-PT
(tens/tu/teu/tua/usas/inicia/vê, «a verificar/carregar»). **B (comentarios):** `EdicaoCard.jsx`/`EdicaoBanner.jsx` ja nao dizem
que o banner navega para `/edicao/:id` — abre MODAL (MC47) e a rota foi removida no 107g (so comentarios no diff).
**C (divida):** **DEBT-021** — `?rc=1` lido em `App.jsx` (CorporativoRoute) e `CorporativoDashboard.jsx`, 0 produtores; abre 8 rotas
do lojista a um anonimo (so UI; substring: `?src=1` tambem abre). **Codigo NAO apagado** (decisao do operador).

**Validador adversarial: APROVADO** (0 graves); ℹ️1 alcance da DEBT-021 subestimado -> texto corrigido; ℹ️2 guarda de dialecto so
via «tens» (4 mutantes sobreviviam) -> reforcada, **11/11 mutantes mortos**; correcoes nao re-validadas em 2.ª ronda.
**Mutacao executor:** 4/4. **Escopo:** 8 ficheiros autorizados; backend, navegacao, package*, 5 `.bak-*` intactos; `EM_BREVE_MODE = true`.
**Pendencias:** pt-PT fora do escopo em `OfertasProgramadas.jsx:310` e `ComprarPasseModal` («Vais comprar») — fechar antes do 106i.
**Registo:** `_logs/UTAC107g.1-pendencias.md` · `Desktop/RELATORIO-UTAC107g.1-PENDENCIAS.txt`.
**Custo:** validador 119 031 tokens = 2,4–238 ¢ (47,6 ¢ se tudo input); sessao ≈ 45 000 tokens = 0,9–90 ¢ (18 ¢ se tudo input).
**Proximo:** 106i (AAB novo).


## R14 (append) -- UTAC107g.2 -- COPY pt-BR RESTANTE (Claude Code, Opus 5.5)

**Tipo:** so copy. **Baseline:** `7ab9bb6`. **Commits:** `c6652d2` -> `9b41ef9` (achados do validador) -> registo.
**Suite:** frontend VERDE **843/843** (+3) · backend VERDE 1095/1101. **Deploy:** live `index-4MPVXBeU.js`. ~28 min (HI5 30).

**Decisoes do operador (R18):** **R18-A** ambito = copy de consumo na 2.ª pessoa «tu» / «A + infinitivo» + admin («A carregar/ler/
enviar»); **R18-B** convite «no seu 1º lance» («Te convido» fica). **Corrigido (pt-PT -> pt-BR, so texto):** OP («Você ainda não tem
pontos. Compre o seu primeiro Passe…», «Carregando seus pontos…», «Você vai trocar…», «Chegue a…», «Acumule…»), balao do Passe
(«Você vai comprar…», «Você ganha 1 ponto», «Seus pontos (total)», «Processando…»), resgate («Confirme/Confira os dados»), hooks
(usePalpite/useResgatarCartao: «Você precisa…», «Escreva…», «Sem edição em andamento»), MLC («Abra … no seu navegador … você já usa»,
«continue explorando»), toast da Carteira, convite, chatbot («🏆 Você ganhou!», «⚠️ Você perdeu a exclusividade»), retorno do login
(«Está demorando…», «estamos restabelecendo…»), admin («Carregando/Lendo/Enviando…», «continua respondendo»).
**Guarda GLOBAL** `src/__tests__/utac107g2-pt-br.test.mjs`: todo o `src/` (sem testes/comentarios), removedor de comentarios ciente
de strings; paginas legais em excecao EXPLICITA (pendencia).

**Validador adversarial: PARCIAL** -- 4 frases pt-PT residuais (A1-A4) + zona cega real da guarda (um `/*` dentro de `//` em
`main.jsx` escondia 98 linhas) -> **tudo corrigido**; a re-varredura achou mais 3 (login, chatbot). **Mutacao 18/18** (inclui os 7
sobreviventes do validador). Correcoes NAO re-validadas em 2.ª ronda. **Escopo:** so texto; backend, navegacao, DEBT-021, package*,
5 `.bak-*` intactos; `EM_BREVE_MODE = true`.
**Pendencias:** paginas legais (Privacidade/RegrasOficiais + docs/regras-oficiais.md) e vocabulario pt-PT do admin; DEBT-021 (107g.3).
**Registo:** `_logs/UTAC107g.2-copy.md` · `Desktop/RELATORIO-UTAC107g.2-COPY.txt`.
**Custo:** validador 115 002 tokens = 2,3–230 ¢ (46 ¢ se tudo input); sessao ≈ 87 000 tokens = 1,7–174 ¢ (35 ¢ se tudo input).
**Proximo:** 107g.3 (DEBT-021) e/ou 106i (AAB).


## R14 (append) -- UTAC107g.3 -- ?rc=1 POR MATCH EXATO (DEBT-021) (Claude Code, Opus 5.5)

**Tipo:** segurança de interface (frontend). **Baseline:** `ceb5ab8`. **Commits:** `4ca743d` (código) -> registo.
**Suite:** frontend VERDE **849/849** (+6) · backend VERDE 1095/1101. **Deploy:** live (entry `index-Dns58GNo.js`; chunk `PrivyRoot-D1hDRK22.js`).

A `CorporativoRoute` (`App.jsx:148`) testava `window.location.search.includes("rc=1")` (substring): `?src=1`, `?arc=10`,
`?rc=10`, `?xrc=1` abriam a UI das 8 rotas do lojista a um anónimo. Passa a **`temAcessoDiretoCadastro(search)`**
(novo `src/lib/acessoDiretoCadastro.js`, puro: `URLSearchParams.get("rc") === "1"`; extensão de escopo declarada, para
ser testável — o App.jsx não se importa em teste). `?rc=1` continua a abrir (MC17, decisão 2 do operador). O
`CorporativoDashboard` já era exato (não tocado). Varredura: nenhum outro teste de query/URL por substring que controle
acesso (só `pathname.startsWith` de estilo no BottomNav). Testes `src/lib/acessoDiretoCadastro.test.mjs` (6, bidirecionais:
cada ataque ABRIA com o predicado antigo) · **mutação 6/6**.
**Validador adversarial: APROVADO** (0 ⛔/⚠️; 35 URLs de ataque, 4 mutações próprias). ℹ️ I-1: `?rc=1` exato continua a abrir
a UI a um anónimo e sem produtor — remover a porta é decisão do operador.
**DEBT-021 FECHADA** (substring → exato), resíduo I-1 anotado. **Escopo:** backend, navegação, copy, package*, 5 `.bak-*`
intactos; `EM_BREVE_MODE = true`. HI5: ~35 min (excedido ~5 min, declarado).
**Registo:** `_logs/UTAC107g.3-rc1.md` · `_logs/UTAC107g.3_SEG4_VALIDADOR.md` · `Desktop/RELATORIO-UTAC107g.3-RC1.txt`.
**Custo:** validador 96 984 tokens = 1,9–194 ¢ (38,8 ¢ se tudo input); sessão ≈ 120 k tokens = 2,4–240 ¢ (48 ¢ se tudo input), não medida.
**Próximo:** 106i (AAB novo).


## R14 (append) -- UTAC107g.4 -- FECHAR a porta do `?rc=1` (seguranca) (hermes)

**Tipo:** CODIGO (frontend + testes). **Baseline:** `2c51e5a`. **Commit do fix:** `7d4c5de` (push =
auto-deploy Git do Netlify). **Suite:** frontend VERDE **849/849** · backend VERDE 1095/1101.

**O que fecha:** o UTAC107g.3 passou o match de `?rc=1` de substring a EXATO, mas manteve o `?rc=1`
exato a abrir a UI do lojista a um ANONIMO (decisao do operador desse UTAC). O 107g.4 fecha-a:
`temAcessoDiretoCadastro()` (`src/lib/acessoDiretoCadastro.js`) devolve **`false` sempre** — assinatura
preservada (1 parametro) e `App.jsx` **NAO tocado** (fora do diff). As 8 rotas de `CorporativoRoute`
continuam guardadas; o `rc` so era consultado no ramo `!isConnected`, logo o lojista AUTENTICADO nao
passa pela funcao (`isConnected===true` salta `App.jsx:147-151`) — sem regressao. A funcao mantem-se
como **ponto unico de verdade**, com comentario de decisao (reabrir exige novo teste de seguranca).

**⚠️ Nota de nomes (medicao):** o enunciado chama-lhe `acessoDiretoCadastro()`; o nome REAL e
`temAcessoDiretoCadastro` (o FICHEIRO e que se chama `acessoDiretoCadastro.js`).

**Testes/mutacao:** teste reescrito — bisseccao bidirecional (o predicado do 107g.3 ABRIA com `?rc=1`)
+ «nenhum URL abre» (27 URLs: ataques por substring, `#rc=1`, `&rc=1`, `?RC=1`, `?rc=01`, `?rc=true`,
URL absoluto, sem parametro) + entrada nao-texto + aridade === 1 + cablagem. **Mutacao 2/2 RED**,
restaurado byte-identico. Verificador ad-hoc: **13 PASS / 0 FAIL** (32 inputs => `false`).

**Validador adversarial (worktree `7d4c5de`, A13):** **APROVADO · 0 bloqueantes (0 graves; 5 notas i)**.
Testou a funcao REAL sobre **49 URLs + 14 entradas nao-texto**: 0 abriram. Provou que os testes mordem
(M1/M2/M3 => RED), que o `App.jsx` esta fora do diff (md5 `93c092d4…`) e que o lojista autenticado nao
passa pela funcao. **Todas as 8 tentativas de refutacao falharam.** Notas i (todas de escopo): I-1
codigo morto no `CorporativoDashboard.jsx:30-36` (limpa `?rc=1`, agora inalcancavel); I-2
`pareceAutenticado` e gate PRE-EXISTENTE; I-3 «0 produtores» e por leitura, nao runtime. **Sem
correccoes pos-veredicto.**

**DEBT-021:** **FECHADA SEM RESIDUO** (linha 56 do `_logs/DEBT.md`, historico a vista, cita `7d4c5de`;
diff 1/1). Residuos fora de escopo declarados (I-1/I-2) -> candidatos a UTAC de limpeza.

**Registo:** `_logs/UTAC107g.4-porta-rc1.md` · `_logs/UTAC107g.4_SEG4_VALIDADOR.md` ·
`Desktop/RELATORIO-UTAC107g.4-PORTA-RC1.txt`. **Custo:** ~US$ 0,100 = **10 centavos** estimados (executor ~0,087 +
validador ~0,013); validador ~US$ 0,019/1M tokens (693 610 tokens); **saldo real medido: 1,12 -> 0,96 =
16 centavos**. **Duracao 19:20 -> 19:43 = 23 min — DENTRO do HI5 (30 min)**, incluindo a espera do
auto-deploy. **Deploy verificado:** entry `index-Dns58Gno.js` -> `index-Ci4XuUO-.js`; `get("rc")` -> 0 no
bundle servido.
**Proximo:** 106i (AAB novo) -> Play Console (Ruan).


## R14 (append) -- UTAC108a -- MANIFESTO de aprovacoes do operador (serie 107) (hermes)

**Tipo:** documento unico. **READ-ONLY** -- ZERO alteracao de codigo. **Baseline:** `86ffe2c` (= origin/main).
**Commits:** `86ffe2c` -> `e2e793a` (o manifesto; validado) -> registo (achados V1..V6 + log + R14 + Desktop).
**Suite:** frontend VERDE 849/849 - backend VERDE 1095/1101 (= baseline, read-only).

**Porque existe:** os logs registam o que foi FEITO, nao o que foi APROVADO (a aprovacao vive nas
conversas). O operador identificou que nem tudo o que aprovou foi implementado (ex.: o botao «Menor
Lance Unico» da Carteira) e ha uma decisao estrutural nova (o lojista sai do app). Este UTAC cria a
**fonte de verdade** da auditoria.

**Entregavel:** `docs/aprovacoes-operador.md` -- para cada item aprovado: aprovado + fonte + estado
actual verificado no codigo (`ficheiro:linha`) + discrepancia. Cobre 11 UTACs (107a-back, 107a-front,
107b-e.2, 107g-g.4).

**Contagens:** **52 itens** (51 aprovados + 1 decisao estrutural) -> **49 implementados** - **2 com
residuo** - **1 nao implementado**. Zero itens aprovados ignorados.

**Os 2 residuos:**
- **D-1** (`107b#2`): o botao «Menor Lance Unico» da Carteira existe e navega para `/mercado`
  (`MinhaCarteira.jsx:101-103`, `:242-259`), mas tem `disabled={!saldoReais}` (`:245`) -- com saldo
  R$ 0,00 (ou `null`, a carregar) o clique NAO faz nada. **Esta e a causa medida da queixa do
  operador**; e um gate PRE-EXISTENTE (UTAC106c/MC48) que nunca esteve nas aprovacoes do 107b.
  Decisao de produto em falta: navegar sempre (validar no destino) ou manter bloqueado.
- **D-2** (`107g.3#2`): `?rc=1` exacto continuava a abrir (aprovado como TEMPORARIO no 107g.3); hoje
  `temAcessoDiretoCadastro()` devolve `false` sempre -- **superado por decisao do proprio operador**
  no 107g.4. Nao e incumprimento.

**O nao implementado:** a decisao estrutural **remover o lojista do app** (Marinho trata
pessoalmente) -- primeira vez escrita num artefacto do repo; destino **UTAC108f**. Confirmado nao
implementado: `CorporativoDashboard.jsx`/`CorporativoCotas.jsx` existem; rotas `/corporativo/*` em
`App.jsx:519-526`; `CorporativoRoute:118`; `BottomNav.CORP_TABS`; `Sidebar.CORPORATIVO_ITEMS`.

**Outras discrepancias registadas:** D-3 (dois itens «adicionar» que ja existiam -- MLC da Carteira
desde o 106c; a grelha da Carteira ja era a mesma); D-4 (palavras da lista != mockup: «Palpites» vs
«Lances» na tabela da OP, R18-C; KPIs do Inicio mantidos por R18-A contra o enunciado; 21 frases
aprovadas vs 25 aplicadas no 107g.2, ultrapassagem declarada); **D-5** (achado do validador:
comentario obsoleto em `TabelaLances.jsx:52-58` -- «sem resultado oficial mantem-se o apuramento
local» -- contradito pelo codigo `:70-73 return -1` do UTAC107e.1 V2).

**5 pendencias declaradas:** vocabulario pt-PT nas paginas legais (excepcao explicita na guarda
`utac107g2-pt-br.test.mjs:61`); I-1 codigo morto em `CorporativoDashboard.jsx:30-36`; I-2
`pareceAutenticado` (`App.jsx:148`, gate pre-existente); 25 endpoints orfaos de frontend; `debug-pedido`
ligado em producao. Mais: `LanceStatusBadge` com vidro proprio (Regra 1), redundancias menores de
navegacao, `exportar-dados` sem botao (LGPD art. 18) e o APK sem as mudancas da serie (108i).

**Validador adversarial (worktree `tmp-108a-val/wt` @ `e2e793a`, A13; 225,9 s):** **PARCIAL**. O
**conteudo resistiu -- 51/51 itens verificados no codigo** (todos os `ficheiro:linha` abertos e
confirmados; (f) so o manifesto no commit; (g) 5 `.bak-*` intactos; (h) suite verde reproduzida). O
que caiu: **V1** o §18.5 declarava 4 entregaveis e so 1 existia (corrigido -- passam a ser produzidos
no fecho, e foram); **V2 PROVA INVALIDA POR EMOJI** -- `grep '🏆' Dashboard.jsx -> 0` nao prova nada
neste ambiente (controlo: `grep -c '🏆' GlassHeader.jsx` -> 0 mas o ficheiro tem 🏆; `python` conta 1);
provado de novo pelo array `stats` (`Dashboard.jsx:226-231`, 4 tiles) + contagem por `python`
(**erro do MEU instrumento, declarado no §18.6 do manifesto**); **V3** 13 logs e nao 12 (omitia o
`UTAC107e.2_SEG-1_MEDICAO.md`); **V4** `/redirect` e `App.jsx:460` (nao `:455`) e a etiqueta
`EtiquetaEstadoLance.jsx:19-21`; **V5** `e2e793a` por publicar; **V6** o comentario obsoleto (D-5).
Correccoes pos-veredicto NAO re-validadas (declarado).

**Erros dos meus instrumentos (declarados):** (1) o harness correu em background e devolveu `stdin is
not a tty` com **exit 0 e sem numeros** -- falso-verde; repetido em foreground; (2) a prova por
`grep` de emoji (V2).

**Escopo:** backend, `_lib`, `src/`, `netlify/`, `scripts/`, package*, `.bak-*` (5), NORTE/ESCOPO-ALVO/
FICHA-PLAY/MC100_MATRIZ, `EM_BREVE_MODE` -- tudo intacto. `git diff --name-only` vazio.

**Registo:** `docs/aprovacoes-operador.md` - `_logs/UTAC108a-manifesto.md` -
`Desktop/RELATORIO-UTAC108a-MANIFESTO.txt`. **Proximo:** 108b (auditoria de discrepancias contra
producao) -> 108c+ (correccoes cirurgicas) -> 108f (remover lojista).


## R14 (append) -- UTAC109a -- INVENTARIO da pasta-fonte GUTO + dataset (serie 109) (hermes)

**Tipo:** medicao/preparacao, READ-ONLY sobre a pasta-fonte. **Nao gera imagens, nao treina Soul ID,
nao cria `GUTO-ecommerce/`.** **Baseline:** `740eb7e` (= origin/main). **Commit:** `44b92cc` (log) ->
registo. **HI5:** 1 h.

**Serie 109 = consistencia visual do GUTO**: substituir a vibe de leilao (martelo) por vibe de
e-commerce (carrinho de supermercado), mantendo a identidade do personagem.

### PARAGEM + 4 DESVIOS (a regra do enunciado accionou-se)
O caminho do enunciado `GUTO/GUTO - eletrodomesticos/` **nao existe**. Medido e escalado ao operador,
que confirmou a fonte: `GUTO-Eletrodomesticos/GUTO estatico oficial/` (as 8 PNG 4K).
- **D-1** nome real: `GUTO-Eletrodomesticos` (unico directorio no Desktop; corroborado por atalho antigo
  em `MC-HISTORICO/MC39.7.1-shots/`); pasta mexida hoje 01:57-01:58.
- **D-2** as 8 imagens estao numa **SUBPASTA** (`GUTO estatico oficial/`).
- **D-3** a pasta tem **19 ficheiros** (8 PNG + 8 MP4 + 1 ZIP com as mesmas 8 em baixa resolucao +
  README.txt + 1 JPEG de proporcoes), `du -sh` 212 MB.
- **D-4** a premissa «8 imagens COM martelo de leiloeiro» e **imprecisa**: martelo **fisico em 4 de 8**
  (02, 05, 06, 07); em 01 e so **grafico no ecra da TV**; **ausente em 03, 04, 08**.

### AS 8 IMAGENS
`01-guto-tv` / `02-guto-geladeira` / `03-guto-maquina-lavar` / `04-guto-ar-condicionado` /
`05-guto-notebook` / `06-guto-smartphone` / `07-guto-fogao` / `08-guto-conjunto-eletrodomesticos`.
Todas **4096x4096, PNG, RGBA, 1:1**, 19,4-22,1 MB (total **168,3 MB**), mtime 2026-05-27. md5 das 8 no
log. Tag EXIF vazia — **mas nao estao limpas**: ver abaixo.

### ACHADO: METADADOS COMFYUI ESCONDIDOS EM TODOS OS PNG
Chunks de texto PNG `prompt` + `workflow` (JSON do grafo). Medido nas 8:
modelo **`gemini-3-pro-image-preview`** (= Nano Banana Pro), resolução `4K`, ratio `1:1`,
`response_modalities=IMAGE`; nos `LoadImage #11/#12` -> `BatchImagesNode #36` -> `GeminiImage2Node #35`
-> `SaveImage #30`; `system_prompt` identico nas 8. **8 seeds** e os **prompts exatos** por imagem
transcritos no log (§A.3) — **diferem do `README.txt`**, que tem versoes curtas; o que vale e o do PNG.
**As 8 usam a MESMA imagem de referencia de input** (`0539243f…915e.png`) — e essa referencia
**nao existe no disco** (varredura por sha256 de `Desktop/GUTO`): **LACUNA L-1**.

### O GUTO (por inspecao visual real, nao pelos prompts)
Homem **adulto estilizado** (nao animal, nao robo), **render 3D CGI** tipo Pixar/DreamWorks; cabelo
castanho-escuro curto repartido ao lado; olhos grandes castanhos; sorriso aberto; barba cuidada +
barba por fazer; **fato azul-marinho, camisa branca, laco azul-marinho, colete laranja-tijolo brocado,
lencinho de bolso, sapatos castanhos**; **medalhao dourado circular ao peito em corrente dourada**
(presente nas 8; **LACUNA L-2**: o simbolo nao ficou legivel — a confirmar contra
`Desktop/GUTO/LOGO DO MEDALHAO.jpeg`, fora do escopo). De pe nas 8.

### ENQUADRAMENTO
Estudio **branco/cinza-clarissimo** nas 8, mas **3 tem cena montada** (01: pulpito + corda de veludo +
mesa com TV + microfone; 04: pedestal com placa «**AUCTION ITEM #10: PREMIUM AC UNIT**»; 05: plataforma
dourada + 2 projetores + ecrãs «**BIDDING**»). Luz de estudio difusa, sombra de contacto. Angulo
frontal ao nivel dos olhos, corpo inteiro. O GUTO esta **ao lado** do eletrodomestico a apresenta-lo.

### CONSISTENCIA E DATASET
**O GUTO e o mesmo personagem nas 8** (coerente em rosto/cabelo/barba/fato/medalhao) — explicado por
mesmo modelo + **mesma imagem de referencia**. Muda: pose/gesto, expressao, eletrodomestico, aderecos
de cena, escala. **DATASET: 8 imagens (<20) -> ALERTA para o 109b**; 0 perfil, 0 costas, 0 close-up de
rosto, 0 ficha de expressoes: serve como **referencia estilistica**, **nao** como conjunto de treino
multi-angulo.

### LACUNA DO SOUL ID PARA CARTOON (registada, NAO resolvida — decisao do 109b)
Medido na doc das skills instaladas: `higgsfield-soul-id/SKILL.md:5-6` «personalized model on a
**person's face**»; `:44` «5-20 **face photos**»; `:79` «5+ unique faces»; `:13-14` «**NOT for: …
named-character / non-photo avatars (use `higgsfield-generate` with prompt)**» e «one-shot face swaps
(use `higgsfield-generate` with `--image`)». ⇒ **Soul ID e para ROSTOS de pessoas**; o GUTO e mascote
cartoon 3D e o conjunto nao cumpre «5-20 face photos». Alternativa que a propria skill aponta:
`higgsfield-generate` com **imagem de referencia** (`media-inputs.md:36` «1+ references, often up to
8»; `nano_banana_2_lite` ate **14**) — **exactamente o que a pipeline original ja fez**.

### COPY A TRATAR NO 109c (texto legivel medido)
01 ecra da TV «**Menor Lance Unico**» + martelo grafico · 03 letreiro «**LANCE**»/«**UNICO**» (com
acento agudo no U) — **grafia CORRECTA** · 04 «22°C» + placa «**AUCTION ITEM #10: PREMIUM AC UNIT**»
(ingles) · 05 «**DESAFIOGUT**» (marca, a preservar) + ecrãs «**BIDDING**» com montantes (ingles) ·
06 «**MENOR LANCE UNICO**» no telemovel · 07 «400»/«350» · 08 «**Arremate Ja!**» + grelha Smart TV com
**Netflix/Prime Video/YouTube/Google** (marcas de terceiros).
⇒ A serie 109 **nao e so trocar o martelo**: ha copy de leilao em 5 imagens e marcas de terceiros na 08.

**⛔ CONCLUSAO MINHA REFUTADA (fica a vista, nao apagada):** a 1.ª versao deste registo afirmou que o
letreiro da 03 dizia «**LANÇE**» com **cedilha indevida**. **É FALSO** — o **validador adversarial**
refutou-o («no cedilla under the C») e confirmei-o depois com a placa inteira num recorte 1:1: as letras
sao **A N C E** com o **C limpo**, e o sinal que eu li como cedilha e o **acento agudo do `Ú`** da linha
de baixo, que cai visualmente entre as duas linhas. **Erro do MEU instrumento** (ampliacao insuficiente
+ palavra cortada a meio). Regra reforcada: para ler texto em imagem, enquadrar a **palavra inteira** e
comparar os diacriticos das linhas entre si. Detalhe em `_logs/UTAC109a-inventario.md` §B.8.1.

### LGPD
**Nenhuma das 8 tem rosto de pessoa real** — as 8 mostram o mesmo personagem cartoon 3D. Nada a
mascarar. (Se o GUTO for caricatura de pessoa real identificavel, e questao de direitos de imagem,
fora do escopo.)

### VERIFICACAO
Pasta-fonte **intacta** (nenhum ficheiro movido/renomeado/editado); unico ficheiro criado:
`_contact-sheet.png` (autorizado). Contact sheet 2890x1546, grelha 4x2, as 8 presentes. Higgsfield
consultado **so** com `account status` (desafio-gut@gmail.com, plus, **1010 credits**) — **nenhuma
geracao, nenhum credito gasto**. `identify`/`montage`/`exiftool` **ausentes**; usados **PIL 12.3.0** e
`magick`. Zero alteracoes de codigo.

**Lacunas:** L-1 referencia ComfyUI ausente · L-2 simbolo do medalhao por confirmar · L-3 Soul ID para
cartoon (109b) · L-4 os 8 MP4 nao analisados ao detalhe · L-5 o JPEG de proporcoes nao lido.

**Registo:** `_logs/UTAC109a-inventario.md` · `GUTO-Eletrodomesticos/_contact-sheet.png` ·
`Desktop/RELATORIO-109a.txt`. **Proximo:** 109b (mecanismo de consistencia do GUTO) -> 109c (geracao).


## R14 (append) — UTAC108b — AUDITORIA LOCAL vs PRODUCAO (READ-ONLY)

**Fecho:** 2026-10-07 · **HEAD/origin/main:** `08f78b3` (o enunciado esperava `740eb7e`; desvio
declarado — o UTAC108a fechou em `740eb7e` e a serie **109a** correu depois; `git diff 86ffe2c..HEAD`
toca so `_logs/`, `CLAUDE.md` e `docs/` => **ZERO alteracoes em `src/`/`netlify/`**; ultimo commit que
tocou `src/` = `7d4c5de`). **Suite:** frontend **849/849** · backend **1095/1101** -> VERDE.
**Producao:** `https://silly-stardust-ca71bc.netlify.app/` **200**; bundle `assets/index-Ci4XuUO-.js`.

### Os 4 erros reportados pelo operador — diagnosticados
1-2. **Privy CORS + 422** em `api.privy.io/api/v1/analytics_events` -> **COSMETICO** (beacon do
proprio SDK; `grep -rn "privy\.io" src/` = 4 ocorrencias **documentais**, 0 chamadas nossas; o login
funciona). 3-4. **`/cotas` 404** -> **404 POR DESENHO**, nao codigo morto: `cotas.mjs` existe e
**responde** (`?cliente=` **200 JSON**, `?email=` **401 JSON**); os 404 nascem em
`cotas.mjs:291` (`email_nao_encontrado`), `:316` (`cota_nao_encontrada`) e `:241`
(`cnpj_nao_encontrado`) — utilizador **sem cota**; e o proprio repo ja o documenta
(`src/lib/retornoOAuth.js:12-15`). **A hipotese «endpoints Via A removidos» esta REFUTADA por medicao.**

### Achados novos
- **D-6 (ATENCAO, documental):** o manifesto (107b#1) afirma que 5 nomes foram removidos como orfaos;
  medido: so **3** (`creditoTxHash`, `trocaInfo`, `trocaErro`). **`useTrocarPorSenhas`** e
  **`CreditoStatus`** EXISTEM e tem **consumidores vivos** (`components/CardLance.jsx:25`,
  `pages/CorporativoBanners.jsx:12`, `components/CreditoStatus.jsx`, `hooks/useCreditoStatus.js`,
  `lib/creditoPolling.js`) — a remocao foi do **import na `MinhaCarteira`**, nao dos modulos.
  Producao e `dist` concordam => nao e producao velha. **Corrigir no 108h.**
- **D-7 (armadilha):** `/netlify/functions/<ep>` **sem o ponto** devolve **200 `text/html`** (o
  `index.html` do catch-all) — e nao 404; um nome de funcao **inexistente** tambem. **Um 200 nunca
  prova que a funcao existe: a prova e o `content-type`** (`application/json` vs `text/html`).
  O codigo usa a forma correcta (`src/lib/api.js:23` = `/.netlify/functions/`).
- **D-8 (regua):** o manifesto cita **25 orfaos**; medido **23** por sitio de chamada. Re-medir quando
  se tratar dos orfaos.

### Producao vs codigo — SINCRONIZADOS (prova por conteudo)
**137 chunks** de producao descarregados; **16 de 17 literais** da serie 107 com **resultado identico**
producao vs `dist` local (os nomes de chunk diferem por desenho — a Netlify emite nomes proprios).
**Inventario de endpoints:** **84 locais, 84 servidos em producao (0 em falta)**; **23** servidos **sem
chamador** no frontend (8 sao `*-scheduled`/`webhook-*` => **nao** apagar em bloco).

### Prioridades
**P0** D-1 -> **108c** (botao MLC `disabled={!saldoReais}`, `MinhaCarteira.jsx:245`: navegar sempre e
validar no destino). **P1** remover o lojista -> **108f** (nota: `cotas` tem **15 chamadores** e o painel
`src/pages/admin/Cotas.jsx:50` => nao pode ser «apagar o `cotas.mjs`»). **P2** decidir
`useTrocarPorSenhas`/`CreditoStatus`. **P4** desligar `debug-pedido` (**503** sem token, 0 chamadores).
**P5** Privy = ruido, nada a fazer.

### Erros dos meus instrumentos (declarados)
1. 1.a sonda com `curl -o /dev/null` + caminho MSYS -> **`bytes=0`** em **todos** os pedidos; aceitar
   isso teria produzido o achado inventado «producao nao serve nada». Corrigido com `urllib` + `C:/`.
2. 1.a corrida da suite em **background** -> `stdin is not a tty`, exit 1, **sem numeros** (falso-verde
   conhecido). Re-corrida em **foreground** com `< /dev/null`.

**Validador adversarial (SEG6):** *APROVADO COM RESSALVAS — 0 bloqueantes*; **0 das 10 alegacoes-nucleo**
refutadas; 4 imprecisoes (F-1..F-4) corrigidas por **errata** (`E-1..E-4`, §10 do log) — `origin/main`
re-medido `08f78b3` (pai de `644c6ce`); 84 endpoints = **76 `application/json` + 8 `text/plain`, 0
`text/html`**; chunks **137** (o validador reporta 187 num crawl mais largo — duas reguas declaradas);
`index.html` declara **4 `modulepreload` + 1 entry**. Veredicto verbatim em
`_logs/UTAC108b_SEG6_VALIDADOR.md`.

**Entregaveis:** `_logs/UTAC108b-auditoria-producao.md` · este bloco R14 ·
`Desktop/RELATORIO-UTAC108b-AUDITORIA.txt`. **Zero alteracoes de codigo.**


## R14 (append) -- UTAC108c -- D-1: botao «Menor Lance Unico» da Carteira navega sempre (Claude Code, Opus 5.5)

**Tipo:** CODIGO (frontend + testes). **Baseline:** `3e4febe`. **Commits:** `dcb4f43` (fix) -> `1e18792` (testes pos-veredicto)
-> registo. **Suite:** frontend VERDE **867/867** (+18) · backend VERDE 1095/1101. **Deploy:** auto-deploy Git; entry
`index-Ci4XuUO-.js` -> `index-CRWGSol9.js`; chunks `MinhaCarteira-C_FmRtxy.js` / `MercadoLances-BUfxxtJM.js` verificados.

**Feito:** `MinhaCarteira.jsx` perde `disabled={!saldoReais}` (+ cursor/opacidade/title condicionais; title = «Ir para o Menor
Lance Unico»). Novo `src/components/SemSaldoBanner.jsx` (`mostrarAvisoSemSaldo` pura + `GlassCard role="status"` com «⚠️ Sem
saldo. Carregar agora?» e «Carregar PIX →» -> `/carteira`), montado como 1.º filho do `<main>` do `MercadoLances.jsx`; informa,
nao esconde (o lance continua bloqueado no CardLance, intocado).

**Decisoes do operador (R18):** **R18-A** o aviso so aparece com saldo LIDO (`ok`/`stale`) = 0 e login feito (o enunciado dizia
«0 ou null»; null = «nao sei» => sem aviso). **R18-B** `CorporativoCarteira.jsx:214` («Ir dar lances», lojista) NAO tocado (sai
no 108f) e o aviso nunca aparece a `tipoProvavel === "corporativo"`.

**Testes:** `src/__tests__/utac108c-carteira-mlc.test.mjs` (6) + `src/pages/__tests__/utac108c-mlc-aviso.test.mjs` (12); mutacao
**12/12** (`scripts/utac108c-prova-mutacao.mjs`). Licao: o `clicar()` dos arneses chama `onClick` directamente — provar
«clicavel» mede as PROPS (`disabled`, `hidden`, `pointerEvents`, `display`), nao o clique.
**Validador: APROVADO COM RESSALVAS** (0 graves): N1/N2 (lacunas de teste, 7 mutantes sobreviventes) fechadas, nao re-validadas;
**N3 escalado**: em modalidade «Programado» o lance usa senhas — R$ 0 com senhas > 0 ve «Sem saldo» mas pode licitar (nao e
regressao). **Escopo:** backend, App.jsx, CardLance, package*, 5 `.bak-*` intactos; `EM_BREVE_MODE = true`.
**Registo:** `_logs/UTAC108c-d1-mlc.md` · `_logs/UTAC108c_SEG5_VALIDADOR.md` · `Desktop/RELATORIO-UTAC108c-D1-MLC.txt`.
**Custo:** validador 115 615 tokens = 2,3–231 ¢ (46 ¢ se tudo input); sessao principal nao medida; ≈ 35 min. **Proximo:** 108f.


## R14 (append) -- UTAC108c.1 -- N3: aviso «Sem saldo» escondido no modo Programado (Claude Code, Opus 5.5)

**Tipo:** CODIGO (frontend + testes). **Baseline:** `b8ee946`. **Commit:** `37d9420` -> registo. **Suite:** frontend VERDE
**871/871** (+4) · backend VERDE 1095/1101. **Deploy:** auto-deploy Git; entry `index-CRWGSol9.js` -> `index-BZluhY9V.js`;
chunk `MercadoLances-CdjCLUBx.js` com a guarda. `mostrarAvisoSemSaldo` (`SemSaldoBanner.jsx`) recebe `modalidade` e devolve
`false` em `"programado"`; o call site do `MercadoLances` passa a MESMA `modalidade` do contexto (`AppContext.jsx:180`,
`"flash" | "programado"`, escolhida no `ModeSelector`) que o CardLance usa para decidir o debito (`CardLance.jsx:91`).
Relampago, R18-A e R18-B inalterados; CardLance, backend, package*, `.bak-*` intactos; `EM_BREVE_MODE = true`.
Mutacao **14/14** (M13 guarda · M14 call site). **Validador: APROVADO COM RESSALVAS** (0 graves; I2 escalado: Programado com
R$ 0 e 0 senhas fica so com o aviso do CardLance, sem atalho «Carregar PIX»). **N3 FECHADA.**
**Registo:** `_logs/UTAC108c.1-n3-programado.md` · `_logs/UTAC108c.1_SEG5_VALIDADOR.md` · `Desktop/RELATORIO-UTAC108c.1-N3.txt`.
**Custo:** validador 96 765 tokens = 1,9–194 ¢ (39 ¢ se tudo input); ≈ 20 min. **Proximo:** 108f.


## R14 (append) — UTAC108e — MOCKUPS v2: MLC + OP COERENTES (design, sem codigo)

**Fecho:** 2026-10-07 · **HEAD/origin/main:** `a68ec46` (pos-108d) · **Suite:** frontend **885/885** ·
backend **1095/1101** -> VERDE. **Zero alteracoes de codigo** (`src/`, `netlify/`, `scripts/`,
`package*` intocados; 0 `.bak-*` tocados; `EM_BREVE_MODE = true`).

### Diagnostico
O **conteudo** das duas abas ja era o mesmo; a **roupa** e que diferia — a sensacao de «duas apps»
vinha daí. Divergencias medidas nos mockups aprovados: **componente de edicao** (`.edicao-unica` no
MLC vs `.edicao` na OP), raio/padding (24px e botao pilula 28px vs 14/12px), dourado (gradiente
`#f5a623→#e89400` vs `#f5a623`), **coluna** (sem limite vs 640px), cabeca (titulo solto vs
`titulo-aba`), **estados** (nenhum vs `.estado`). O proprio `tokens.css` **ja anunciava** estas
divergencias em comentario (`:40`, `:42`, `:44`, `:32`, `:37`, `:45-46`) — a familia visual unica ja
estava desenhada na serie 107a, **nunca aplicada as duas abas ao mesmo tempo**. Achado por leitura: a
tabela da OP dizia «Lances — Edicao PROG-1» quando a decisao **R18-C do 107e.1** escolheu «Palpites».

### Entrega
`docs/mockups-107a/mlc-op-v2/` — **`index.html`**, **`mlc.html`** (variantes A/B/C), **`op.html`**
(A/B/C), **`inicio.html`** (referencia, as duas familias juntas) e **`v2.css`** (camada v2; **nao
redefine nada do `tokens.css`**). **Um so componente de edicao, `.ed-card`, usado pelas DUAS abas** —
muda so o conteudo do slot de acao (lance em centavos no MLC, palpite na OP) e a pilula da familia
(`⚡ Relampago` / `🎫 Programada`). Ligacao directa a variante: `mlc.html#A|#B|#C` (`hashchange`
tratado; o `mockup.js` partilhado **nao foi tocado**). Superficie comprometida: **Operate** (acao
primeiro, placar no fim, sem heroi). Copia autonoma no Desktop: `MOCKUPS-108e-MLC-OP/` (com
`tokens.css`, `mockup.js` e as fontes dentro, com o caminho das fontes corrigido).

### Verificacao (browser real, nao por leitura) — 21 estados
`mlc` A/B/C × 375/768/1024, `op` A/B/C × 375/768/1024, `inicio` × 375/768/1024:
**0 alvos < 48px** e **0 blocos de texto fora de vidro** em TODOS; painel da variante **mesmo visivel**
(medido). **Contraste AA**: texto 16,05:1 · corpo 12,03:1 · rotulo 12px 7,17:1 · muted 4,60:1 ·
dourado 9,07:1 · laranja 6,49:1 · on-gold/gold 9,45:1 — **0 violacoes**. **Regra 2**: mesmo
`.tabela-especial` nas duas abas, sempre o ultimo vidro (56px/48px); muda so o substantivo. **0 links
quebrados**.

### Defeito REAL achado e corrigido antes de entregar
Variante **C do MLC a 768/1024px**: o campo do lance ficava com **28,5px de largura** (botao 168px
fixos numa coluna de 246px) — inutilizavel. Corrigido empilhando campo+botao na coluna estreita.

### Erros dos MEUS instrumentos (declarados, todos corrigidos)
1. **Ponto cego no `mockup.js` partilhado:** `mockup.js:19` audita a Regra 1 so no **primeiro**
   `.tela` => o «0 fora de vidro» das variantes **B e C nao tinha prova**. Corrigido com auditoria
   **painel a painel** (e foi ela que apanhou o defeito de 28,5px). NAO corrigi o `mockup.js`
   (partilhado, fora do AUTORIZA).
2. Leitura da largura no **mesmo tick** da mutacao => stale (375 em tudo).
3. O `.fone` tem `transition: width .25s` (`tokens.css:86`) => medi **a meio da animacao**
   (593/748/870). Passou a esperar 400ms.
4. Verificador de links **nao removia o `#fragmento`** => 6 falsos «quebrados».
5. **Navegacao no mesmo documento nao recarrega** => o 1.o teste do `#B` foi invalido; corrigido no
   codigo (`hashchange`) e re-testado.
6. **18 excepcoes de consola** com mensagem vazia: reproduzem-se em `about:blank` => sao do ambiente
   do browser, **nao** destes ficheiros. Nao posso afirmar «consola limpa», so que nada e atribuivel.

### Pendente
O **operador** escolhe uma variante de cada aba (A/B/C). A implementacao e um **UTAC proprio**
(fluxo aprovado: mockups -> operador aprova -> implementacao). O **Inicio nao se escolhe** (esta
aprovado no 107c; serve de prova de convivencia).

**Validador adversarial (SEG6):** *APROVADO COM RESSALVAS — **1 bloqueante** (conformidade, nao design)*.
0 bloqueantes de design: (a) Regra 1, (b) conversa entre abas, (c) Regra 2, (d) toque, (e) contraste,
(g) codigo, (h) `.bak-*` — nenhum derrubado. O bloqueante foi a **decisao 9 (pt-BR)**: 31 ocorrencias de
lexico pt-PT, **inclusive dentro dos ecras**. **Corrigido**: 32 substituicoes (0 pt-PT nos 5 ficheiros, recontado
por Python) — inclui 2 palavras que a minha lista nao tinha (`ficheiro`->`arquivo`, `carregue em`->`clique em`),
apanhadas pelo validador. Derrubou tambem **A7 2.a metade** (o `v2.css` **SOBREPOE** o `.ed-card` do
`tokens.css` em 5 seletores — o cabecalho do ficheiro mente e foi reescrito para declarar o override) e **A4**
(o «0 fora de vidro» das variantes B/C era **vacuamente verde**: o `mockup.js:19` le so o 1.o `.tela`, que ali
esta `hidden` — os 21 estados vieram do auditor **painel-a-painel**, ja declarado na §5.3 do log). **A6
defendido com prova** (`tokens.css:161-162`: e o APP que diz «apurada»; no MLC encerra-se, na OP apura-se).
**Erros meus que a ronda expos:** a substituicao mecanica de lexico introduziu **4 erros de concordancia**
(«no mesmo tela», «Este tela», «o tela real», «Ele existe») — corrigidos; e a minha lista de marcadores pt-PT
estava **incompleta**. **Correccoes pos-veredicto NAO re-validadas** (declarado). Veredicto verbatim em
`_logs/UTAC108e_SEG6_VALIDADOR.md`.

Alvo final **re-medido**: 21/21 estados (9 MLC + 9 OP + 3 Inicio) sem alvos < 48 px e sem texto fora de vidro.

**Entregaveis:** `docs/mockups-107a/mlc-op-v2/` · este bloco R14 ·
`Desktop/RELATORIO-UTAC108e-MOCKUPS.txt` · `Desktop/MOCKUPS-108e-MLC-OP/` (copia autonoma).


## R14 (append) -- UTAC108d -- MLC: herói «EM BREVE» substituído por estado vazio (Claude Code, Opus 5.5)

**Tipo:** CODIGO (frontend + testes). **Baseline:** `1f00b30`. **Commits:** `50a9223` -> `a68ec46`. **Suite:** frontend VERDE
**885/885** · backend VERDE 1095/1101. **Deploy:** `index-BZluhY9V.js` -> `index-BwrYbmL7.js`.
**Premissa do enunciado REFUTADA:** o early return `!isLeilaoAtivo` -> «Edições na versão Web» é a conformidade das LOJAS e na
web nao dispara (pwa=true); o «EM BREVE» vinha do heroi incondicional `GlassHeader` -> `ComingSoonHero` (MC65/66).
**R18-A** trocar o heroi, early return intacto. **R18-B** sinal «sem edicao» = `EM_BREVE_MODE` (so lido, continua `true`).
Feito: sai o `ComingSoonHero` do `GlassHeader`; novo `SemEdicaoAviso.jsx` («⏳ Nenhuma edicao em andamento. Volte quando houver.»,
pt-BR em vez do «a decorrer» do enunciado) no topo do `<main>`; `EM_BREVE_MODE ? estado vazio : «Sem saldo»` (nunca juntos).
Testes `utac108d-mlc-sempre` (13) + duplo `_stubs/leilaoLock.js`; mutacao **11/11** (108d) e 14/14 (108c).
**Validador: APROVADO COM RESSALVAS** (A1/A4 fechados; **A2 escalado**: CardLance activo sob o estado vazio; A3 pilula «🕒 Em breve»
da tabela; A5 «Art. 8» saiu). `/mercado` nao aberto em browser (gate legal). **⚠️ O operador classificou depois o aviso solto como
ERRO** (o mockup pede o CARD da edicao em estado vazio) -> redesenho no UTAC108e, implementacao no 108e.1.
**Registo:** `_logs/UTAC108d-mlc-sempre.md` · `_logs/UTAC108d_SEG5_VALIDADOR.md` · `Desktop/RELATORIO-UTAC108d-MLC-SEMPRE.txt`.


## R14 (append) -- UTAC108e -- Mockups v2 MLC + OP coerentes (2.ª tentativa, Claude Code, Opus 5.5)

**Tipo:** design (so `docs/mockups-107a/mlc-op-v2/`), zero codigo. **Commits:** `4f1050d` + fecho. A **1.ª tentativa (Hermes,
`bf0caf7`/`d8c3e67`, R14 acima) foi REJEITADA** pelo operador por parecer generica; ficheiros substituidos (recuperaveis no git).
**Diagnostico:** o Hermes usou o `tokens.css` — faltava a IDENTIDADE do app: arena de fundo (`public/assets/backgrounds/`), GUTO e
arte real das edicoes (emojis sobre gradiente liso). **Feito:** `v2.css` sem cores novas sobre `../tokens.css`; um so cartao de edicao
`.ed` no MLC, na OP e no Inicio (so a accao muda: lance / palpite); titulo igual com selo do tipo; mesma `TabelaEspecial` no fim;
**correcao do 108d:** sem edicao o CARTAO fica, vazio (nao um aviso solto). 3 variantes por aba (MLC A Familia ★ / B Produto /
C Horizontal; OP A Familia ★ / B Progresso / C Compacto) + Inicio de referencia; **14 capturas mobile 375 px** (`mobile/`, pedido do
operador «foque apenas em me mostrar a versao mobile»). Skill **impeccable** (pedido «use as melhores skill de design») como criterio.
Auditoria: 0 toque < 48 px, 0 texto fora de vidro, contraste min. 5,68:1. **Validador: APROVADO COM RESSALVAS** (0/12 refutados;
ressalvas corrigidas). **Operador: «ficaram boas».** Recomendacao: MLC A + OP A. Pendente: escolha da variante -> **108e.1**
(unificar o dourado #f5a623 vs #ff9500; MLC sem seletor fica fixo em "flash"; arte Air Fryer ainda diz «PAGA»).
**Registo:** `_logs/UTAC108e-mockups-v2.md` (2.a tentativa no fim) · `_logs/UTAC108e_SEG6_VALIDADOR-OPUS.md` ·
`Desktop/RELATORIO-UTAC108e-MOCKUPS.txt` · pasta `Desktop/MOCKUPS-APROVADOS-107a/mlc-op-v2/`.
**Custo:** validador 120 437 tokens = 2,4–241 ¢ (48 ¢ se tudo input); sessao nao medida.


## R14 (append) -- UTAC108e.1 -- MLC B + OP A com o mesmo cartao; correcao do 108d; 3 pendencias (Claude Code, Opus 5.5)

**Tipo:** CODIGO (frontend + testes + arte). **Baseline:** `abfb476`. **Commits:** `46e536a` (feat) -> `546f0c2` (achados do validador) -> registo.
**Suite:** frontend VERDE **909/909** · backend VERDE 1095/1101. **Deploy:** auto-deploy Git; entry `index-BwrYbmL7.js` -> `index-Dn0gx2pr.js`.

**Decisoes do operador (R18, SEG0):** MLC **B** (produto em destaque) · OP **A** (familia) · dourado unico **#f5a623** · seletor de modo **removido** (MLC fixo em Relampago/"flash") · arte da Air Fryer **«PAGA» -> «OFERTA»**.
**Feito:** novo `src/components/CartaoEdicao.jsx` (casco unico; so a accao muda: lance/palpite; `destaque` = MLC B com arte 1:1/16:9). MLC: GlassHeader com titulo + frase + selo «⚡ Relampago» (sai o `ModeSelector`); CardLance real dentro do cartao. **Correcao do 108d:** sem edicao o CARTAO fica vazio (GUTO + «Nenhuma edicao em andamento» + lance desligado; `SemEdicaoAviso` saiu); «Sem saldo» (108c) intacto. OP: mesmo cartao no carrossel, pontos+historico num vidro, resgate no vidro do cartao, cartao vazio com palpite desligado, tabela «Palpites» sempre no fim. Dourado: `glassTokens.js` + `globals.css` + `TabelaLances.jsx` (5x #fbbf24, so cor) + botao da conformidade. Arte: edicao PIL deterministica (so as componentes das letras «PAGA»).
**Testes:** +20 (`utac108e1-mlc-op`) +4 (106f); contratos 108d/108c/107d/106f actualizados (aviso solto -> cartao vazio). **Mutacao 13/13.** Browser local 375/1024: 2 defeitos meus corrigidos (overflow lateral 27 px na OP; frase vazia cortada).
**Validador: APROVADO (com ressalvas; 0 bloqueantes)** -- T1-T4 (4 mutantes sobreviventes) fechados; **declarados:** R1 com edicao a faixa diz «Ativa» em vez de contagem (MLC sem relogio vivo; tratar antes de desligar o EM_BREVE); R2 tabela sem edicao diz «Edicao R-1 · Em breve»; R3 CardLance = cartao dentro do cartao (proibido tocar); `#e89400` no CardLance e `#fbbf24` nos overlays; orfaos `ModeSelector.jsx`/`SemEdicaoAviso.jsx`.
**Escopo:** backend, CardLance, SemSaldoBanner, package*, 5 `.bak-*` intactos; `EM_BREVE_MODE = true`.
**Registo:** `_logs/UTAC108e.1-implementacao.md` · `_logs/UTAC108e.1_SEG7_VALIDADOR.md` · `Desktop/RELATORIO-UTAC108e.1-IMPLEMENTACAO.txt`.
**Custo:** validador 577 331 tokens = 11,5-1155 ¢ (231 ¢ se tudo input); sessao principal nao medida. **Proximo:** 108f (remover lojista).


## R14 (append) -- UTAC108f -- O LOJISTA SAI DO APP (Claude Code, Opus 5.5)

**Tipo:** CODIGO (frontend + testes). **Baseline:** `c54ecff`. **Commits:** `ed4bffe` (feat) -> `389a1d5` (achados do validador) -> registo.
**Suite:** frontend VERDE **899/899** · backend VERDE 1095/1101. **Deploy:** auto-deploy Git; entry `index-Dn0gx2pr.js` -> `index-BmsJdBht.js`.
**SEG0 PAROU (GATE 12):** os «23 orfaos sem chamador» do 108b estao VIVOS (webhook PIX Mercado Pago, webhook Frenet, exportar-dados LGPD, health, 11 crons, consolidar-lances, pontuacao) e nenhum e do lojista. **Decisoes do operador (R18):** **A** nenhum endpoint removido (backend intacto; para o 108h) · **B** conta corporativa ve o app do comprador · **C** `/seguranca` apagada · **D** `Vitrine.jsx` autorizada para tirar os ramos do lojista.
**Feito:** saem as 7 rotas `/corporativo/*`, `/seguranca`, `/seja-nosso-parceiro`, `CorporativoRoute` (+ gate de cota + `?rc=1`), o encaminhamento da raiz e o isolamento `rotasProibidas` do AppContext, `CORP_TABS`/`CORPORATIVO_ITEMS`/«Seguranca»/«Seja nosso parceiro» da navegacao, o atalho «Parceiro» do Inicio e os ramos do lojista da Vitrine. **15 ficheiros apagados** (6 `Corporativo*`, `SejaNossoParceiro`, `Seguranca`, `CotaInativa`, `BannerUpload`, `BannerCard`, `WalletCard`, `acessoDiretoCadastro`, `ModeSelector`, `SemEdicaoAviso`). Ficam: `/admin/*`, `cotas.mjs`, `admin/Cotas.jsx`, `/cadastro`+`/login-email` (sao do comprador, MC91.7), o tipo «corporativo» no contexto (108c).
**Testes:** guardas de remocao + `utac108f-sem-lojista` (5); `utac105b-painel` apagado. **Mutacao 8/8.**
**Validador: PARCIAL** -- (a)-(m) nao refutados; **F1** (o leitor de codigo do meu teste apagava 6664 caracteres do App.jsx por um `/*` dentro de um comentario `//`; M7/M7b sobreviviam) e **F2** (identificadores mortos) **corrigidos**, nao re-validados. **Para o 108g:** restos textuais de `/corporativo` em `encaminhamento.js`, `rotasTrabalho.js`, `dicaSessao.js`, `useAppContextEnvironment.jsx`, `BackgroundCanvas.jsx`, badge «◈ Lojista» do ChatbotWidget, `corporativoWallet`.
**Escopo:** backend, CardLance, SemSaldoBanner, MLC/OP/Carteira, package*, 5 `.bak-*` intactos; `EM_BREVE_MODE = true`.
**Registo:** `_logs/UTAC108f-remover-lojista.md` · `_logs/UTAC108f_SEG8_VALIDADOR.md` · `Desktop/RELATORIO-UTAC108f-REMOVER-LOJISTA.txt`.
**Custo:** validador 329 483 tokens = 6,6-659 ¢ (132 ¢ se tudo input); sessao principal nao medida. **Proximo:** 108g (limpar referencias).


## R14 (append) -- UTAC108g -- LIMPAR REFERENCIAS AO LOJISTA (Claude Code, Opus 5.5)

**Tipo:** CODIGO (frontend + testes). **Baseline:** `4d909a1`. **Commits:** `f398c0f` (refactor) -> `ceb9c67` (achados do validador) -> registo.
**Suite:** frontend VERDE **899/899** · backend VERDE 1095/1101. **Deploy:** auto-deploy Git; entry `index-BmsJdBht.js` -> `index-DnPRjG5D.js`; crawl 124 chunks sem referencias.
**SEG0 PAROU (6 ambiguidades). Decisoes do operador (R18):** **A** o degrau 2 do `encaminhamento.js` fica mas devolve DASHBOARD (`DESTINO.CORPORATIVO` apagado; comportamento igual — o validador enumerou 9216 inputs, 0 diferencas) · **B** meta = 0 `/corporativo` no codigo de PRODUCAO (comentarios incluidos; testes exceptuados) · **C** NENHUM endpoint removido (`debug-pedido`/`info-pagamento` -> 108h; backend intacto) · **D** saem `cotaAtiva`, `CATEGORIAS_COTA`, `atualizarTipoCorporativo` (0 consumidores). Mantidos `userLabelReal` e `Privacidade.jsx:91` (texto legal).
**Feito:** `/corporativo` em producao 17 -> 0 (`rotasTrabalho` so `/admin`; `tabFromPath`/`offsetFor` sem ramos do lojista e de `/seguranca`; comentarios em 12 ficheiros); selo «◈ Lojista» do chat removido (ex-lojista ve «●»); `corporativoWallet`/`addressCorporativo` fora do AppContext. Mantidos: `tipoProvavel === "corporativo"` (R18-B do 108c), `cotaCorporativa`, `cotas.mjs`, `admin/Cotas.jsx`, 5 `.bak-*`, `EM_BREVE_MODE = true`.
**Testes:** novo `utac108g-sem-referencias` (8, varredura com controlo positivo); `cotaAtiva.test` (-9 +1 guarda), `encaminhamento.test` (3 expectativas), extensao declarada `netlify/functions/_tests/mc894-rotas-trabalho.test.mjs`. **Mutacao 8/8** + 3/3 sobreviventes do validador.
**Validador: APROVADO** (0 ⛔; ⚠️ badge com outro texto e ramo `/seguranca` sem guarda -> fechados, nao re-validados; ℹ️ `robots.txt` e `scripts/test-mc12.mjs` -> 108h).
**Registo:** `_logs/UTAC108g-limpar-referencias.md` · `_logs/UTAC108g_SEG7_VALIDADOR.md` · `Desktop/RELATORIO-UTAC108g-LIMPAR-REFERENCIAS.txt`.
**Custo:** validador 133 551 tokens = 2,7–267 ¢ (53,4 ¢ se tudo input); sessao principal nao medida. **Proximo:** 108h (limpeza geral).

## R14 (append) — UTAC108h.1 — DIAGNOSTICO: prateleira de Programadas no Inicio (2026-10-08)

**Veredicto:** CAUSA RAIZ IDENTIFICADA — e **nao e um bug**: a divisao em duas prateleiras
(⚡ Relampago + 🎫 Programada) **nunca foi implementada**, porque o proprio operador a excluiu do
escopo em **R18-C do UTAC107c (2026-10-06)**: «a divisao Relampago/Programadas ... ficam fora do
escopo; a Regra 1 aplica-se pondo o titulo «Outras Edicoes» dentro de vidro». Registo:
`_logs/UTAC107c-inicio.md` (SEG0, tabela de conflitos + respostas R18).

**Codigo (`53d0d06`):** UMA so prateleira, «🗓️ Outras Edicoes» (`Dashboard.jsx:485`), alimentada
por `edicoesExtra` = `Object.values(edicoes).filter(e => e.id !== EDICAO_ATIVA && !ehEspecial(e.id))`
(`Dashboard.jsx:151-153`) — **sem filtro por `tipo`**. O filtro `tipo === "programado"` existe no
repo, mas **so** em `OfertasProgramadas.jsx:58`. O «⚡ Relampago» que o operador ve e o **rotulo do
card da Edicao Ativa** (`Dashboard.jsx:434`), nao o titulo de uma prateleira.

**Agravante (explica o «so vejo a Edicao Ativa»):** a prateleira so e desenhada com
`edicoesExtra.length > 0` (`Dashboard.jsx:477`) — com `edicoesExtra` vazio, o ecra fica so com o
card da Edicao Ativa. **Nao medi o Blob** (R5).

**Hipoteses descartadas:** (2) o 108e.1 mexeu no `CartaoEdicao` e o Inicio perdeu o carrossel —
**falso**: o log do 108e.1 tem 0 ocorrencias de «Dashboard»/«Inicio» e o Inicio usa `EdicaoCard`
(`Dashboard.jsx:18`), nao `CartaoEdicao`; (3) o `EM_BREVE_MODE` esconde a prateleira — **falso**:
nos dois ficheiros do Inicio aparece **so em comentario** (`Dashboard.jsx:23`, `EdicaoCard.jsx:20`),
sem um unico condicional. (4) edicoes Programada no Blob: **nao medido** (R5).

**Producao:** HTTP 200, 5 assets no `index.html`; varridos os 18 chunks citados — «Outras Edicoes»
×2, «⚡ Relampago» ×3 (rotulos), «🎫 Programada» **×0**, «Passe Desafio» ×2. **Producao = codigo.**

**Achado latente:** as pecas ja existem (`useEdicoes.js:83` normaliza `tipo`; `EdicaoCard.jsx:68`
rotula; `OfertasProgramadas.jsx:58` filtra) — falta so **agrupar** no Dashboard, o que rebaixa o
custo da P-1.

**Erro do meu instrumento (declarado):** a ultima linha do meu script de producao imprimiu
«existe prateleira titulada Relampago/Programada? SIM» somando um **rotulo** a um **titulo**. Errado:
nao existe titulo de prateleira nenhum em producao.

**Estado: PARADO.** READ-ONLY; nada alterado. Correccao = **P-1** (UTAC proprio), dependente da
decisao de produto **P-2** (duas prateleiras vs filtro na prateleira unica; e o que fazer quando uma
lista esta vazia). Suite VERDE 899/899 + 1095/1101. Duraçao 11:38→11:43.

## R14 (append) — UTAC108h.2 — DUAS PRATELEIRAS NO INICIO (2026-10-08)

**Veredicto:** implementado, verificado e EM PRODUCAO. Validador adversarial: **APROVADO, 0 bloqueantes**
(10/10 alvos (a)-(j) refutados). Commits `c929c6e -> e737930`.

**O que mudou:** o Inicio tinha UMA prateleira so («🗓️ Outras Edicoes») que misturava as duas familias —
a divisao tinha sido EXCLUIDA do escopo do UTAC107c (R18-C) e nunca foi implementada (diagnostico
UTAC108h.1). Agora sao DUAS («⚡ Relampago» + «🎫 Programada»), com o titulo SEMPRE visivel (decisao P-2b) e
o estado vazio DENTRO de vidro (Regra 1).

**Como:** `Dashboard.jsx` ganhou a funcao PURA exportada `prateleirasDeEdicoes(edicoes, ativa, ehEspecial)`
— separa por `tipo`, que o `useEdicoes.js:83` JA normaliza para `"programado" | "relampago"`; `tipo`
ausente/estranho cai em `relampago` (a MESMA regra do normalizador). Criterios de EXCLUSAO inalterados
(edicao ativa + especiais, do MC15.4/MC94.2). O render passou a um `map` sobre 2 familias: o markup do
carrossel do MC99 vive UMA so vez. O testid do carrossel passou de `outras-edicoes-scroll` a
`prateleira-scroll` — a guarda do MC99 e o mutador MUT1 de `scripts/mc99-prova-mutacao.mjs` foram
actualizados no mesmo movimento e a guarda CONTINUA a morder.

**NAO tocados:** `EdicaoCard.jsx`, `useEdicoes.js`, `OfertasProgramadas.jsx`, MinhaCarteira, MLC, backend
(`netlify/`), `package*.json`, os 5 `.bak-*`, `EM_BREVE_MODE`. Commit com 4 ficheiros, mais nenhum.

**P-3 MEDIDO (novo):** o `GET /.netlify/functions/edicoes` e PUBLICO ⇒ da para medir a producao sem
credenciais (sem violar R5). Em 2026-10-08: **5 edicoes, TODAS `relampago`, ZERO `programado`**. Consequencia:
a prateleira «🎫 Programada» nasce VAZIA em producao — o estado vazio da P-2b nao e laboratorio, e o ecra real.

**Desvio declarado:** o enunciado pedia o vazio «a decorrer»; o guard de pt-BR do repo PROIBE essa expressao
(`utac107g2-pt-br.test.mjs`, `PT_PT_I`). Usada a forma que o app ja usa — «em andamento» (`CartaoEdicao.jsx:36`).

**Achado latente:** `src/i18n/pt.js:35` — chave `dash.outrasEdicoes` ficou ORFA (o titulo passou a literal no
Dashboard). Vai para o UTAC108h (limpeza geral). NAO tocada aqui (i18n fora do ambito).

**Erros dos MEUS instrumentos (declarados):** (1) li o exit_code do fim do pipeline (`grep|tr`) em vez do
`node --test` — o `tr` devolve sempre 0 e a 1.a leitura concluiu «nao morde» nas 4 mutacoes, quando mordiam
(3/3/4/3 falhas); (2) a 1.a versao de um teste meu ancorava o controlo numa prateleira VAZIA (testid
inexistente) — apanhado pela propria assercao de controlo; (3) a 1.a mutacao nao casou nada (ficheiro CRLF,
padroes com `\n`) — apanhado pelo `assert count==1` da mutacao; (4) «Programada ×0» no build era o **grep de
EMOJI a falhar em silencio** (armadilha ja conhecida) — por Python o titulo esta la.

**Verificacao:** suite **VERDE 909/909** (frontend; +10 testes meus) + **1095/1101** (backend) · `vite build`
exit 0 · 4 mutacoes a MORDER, restauro byte-identico (`a9ca771cd9c6bb55ba4c83f6395c8a01`) · producao:
entry `index-TvfL10s1.js`, chunk `PrivyRoot-B4GSJVIh.js` com os 2 titulos/vazios, «Outras Edicoes» ×0.

## R14 (append) — UTAC108h.3 — INICIO SO COM OS DOIS VIDROS (2026-10-08)

**Pedido do operador** (depois de ver o 108h.2 no ar): o Inicio passa a ter **apenas duas edicoes** —
«⚡ Relampago» e «🎫 Programada» — no MESMO casco, a diferenca a ser o nome da familia e, na Programada, a
**zona de palpite em baixo, dentro do vidro**. Commits `8b3e4c4 -> 380d728`.

**Saiu:** o vidro separado «🎯 Edicao Ativa», os titulos soltos das prateleiras, o carrossel de «Outras
Edicoes» e o vidro de estado vazio. **Entrou:** DOIS vidros com o componente unico `CartaoEdicao` (o das
abas MLC/OP, UTAC108e.1), agora com um rotulo de familia opcional `titulo`.

**Decisao declarada:** o vidro Relampago mostra a edicao VIVA (a ativa). Mostrar as Relampago ENCERRADAS
(que eram o conteudo da antiga prateleira) tiraria do Inicio a porta de entrada do lance. A edicao
ESPECIAL (MC94.2/94.3.1) continua a ocupar esse lugar — e por isso e EXCLUIDA do vidro da Programada.

**Fonte unica:** as regras do palpite (`estaAberta`, `edicoesProgramadasDe`, `estadoPalpite`, `PILULA`)
saíram de `pages/OfertasProgramadas.jsx` para **`src/lib/palpite.js`**. A OP passou a importa-las de la. Sem
isto, o Inicio teria de as copiar — duas verdades sobre quando se pode palpitar.

**Guardas:** 7 testes novos do 108h.3; 3 assercoes antigas reapontadas; os testes do desenho anterior
(prateleiras + `prateleirasDeEdicoes`) SAIRAM (o objecto desapareceu). **A guarda do MC99 foi APOSENTADA**,
com o mutador `MUT1` retirado no mesmo movimento: media o scroll lateral das edicoes do Inicio, que deixou
de existir — deixada la, ficaria verde por vacuidade. A **etiqueta do meu lance** (guarda B11 do
UTAC107e.2) foi REPOSTA dentro do vidro Relampago: era funcionalidade do card que saiu.

**Verificacao:** suite **904/904** (frontend) + **1095/1101** (backend) · `vite build` exit 0 · producao
entry `index-Brxo6SkT.js`, chunk do Inicio com `palpite-zona`/os 2 titulos/«Dar lance»/o vazio dentro do
vidro e **zero** «🎯 Edicao Ativa», `prateleira-scroll`, «Outras Edicoes», «Smart TV» · `.bak-*` 0 tocados.

**Nao provado:** o ecra num browser com sessao (producao esta atras do gate LGPD e nao clico aceites por
ninguem) — a confirmacao visual e do operador. O palpite nao foi exercido ponta a ponta (exigiria sessao +
Passe); esta provada a ligacao ao MESMO hook e a MESMA regra da OP.


## R14 (append) -- UTAC109b -- LIMPEZA GERAL: 7 PENDENCIAS DO 108g (hermes / deepseek)

**Origem:** o UTAC108g (`ceb9c67`) deixou **7 pendencias** ao fechar. Este UTAC fecha-as, sem abrir frente
nova. Baseline `aa1eba9` -> commit `67b7e34`. **Nenhum ficheiro de produto de UI foi alterado** (2 linhas
removidas no total: 1 em `pt.js`, 1 em `robots.txt`).

**SEG0 PAROU (GATE 12/AU3):** 3 decisoes exigiam o operador (o enunciado autorizava `git rm`, mas
`docs/inventario-remocao.md:80` manda «preservar» o `info-pagamento`; o P-3 dava as duas opcoes; o
`Privacidade.jsx:91` e texto legal). **Decisoes R18 do operador (2026-10-09):**
- **R18-D1 — MANTER os 2 endpoints mortos.** `info-pagamento.mjs` fica porque um doc do operador diz
  «preservar» e `docs/aprovacoes-operador.md` #4 o mantem aberto; `debug-pedido.mjs` fica porque TEM
  chamador (`netlify/functions/_tests/mc87-seguranca.test.mjs:29`, o teste MC87 P1-3). **Nada** foi tocado
  em `netlify/` (0 ficheiros do backend alterados — verificado por diff).
- **R18-D2 — REMOVER os 3 scripts `test-mc12*`** (o P-3 + os 2 irmaos): testavam o mundo do lojista
  apagado no 108f/108g (`SejaNossoParceiro.jsx` inexistente, `corporativoWallet` removido, `.env.production`
  inexistente), davam 5/10, 6/10 e 3/6, e tinham **0 chamadores** (nem suite, nem CI, nem package.json).
- **R18-D3 — MANTER o texto legal** `src/pages/Privacidade.jsx:91` («OTP no fluxo corporativo») e
  registar divida nova.

**Fechado:** P-1 (chave i18n orfa `dash.outrasEdicoes` removida de `pt.js`) · P-2 (`Disallow: /corporativo`
removido do `robots.txt`) · P-3 (3 scripts `git rm`) · P-6 (`DEBT.md`: +**DEBT-022** texto legal,
+**DEBT-023** residuos fora do escopo, + nota de errata na DEBT-021 que citava um ficheiro apagado no 108f).
**P-4 e P-5 ficam EM ABERTO por decisao explicita** (R18-D1/D3) — «fechar nao apaga». P-7: 3 comentarios de
producao que ainda nomeiam a prateleira «Outras Edicoes» (`EdicaoBanner.jsx:5`, `Dashboard.jsx:349`,
`AppLayout.jsx:37`) ficam FORA DO ESCOPO (o Dashboard e o Inicio) — registados no DEBT-023.

**Guardas:** novo `src/__tests__/utac109b-limpeza.test.mjs` (6 testes, com controlo de vitalidade e os
irmaos `dash.edicaoAtiva`/`Disallow: /admin` como controlo positivo). **Mutacao 3/3 a MORDER**
(M1 reintroduzir a chave -> RED; M2 reintroduzir o `Disallow` -> RED; M3 apagar o irmao -> RED no controlo),
restauro byte-identico (`pt.js` `7b3f708c6f3003f3e0369325a39a20dc`, `robots.txt` `5e74ac1660d23615124612689244ddeb`).

**Verificacao:** suite **910/910** (frontend, era 904) + **1095/1101** (backend) · `vite build` exit 0 ·
**validador adversarial APROVADO — 0 bloqueantes** (5 notas, tratadas; `_logs/UTAC109b_SEG11_VALIDADOR.md`) ·
`EM_BREVE_MODE = true`, `cotas.mjs`, `admin/Cotas.jsx`, `CardLance.jsx`, `AppContext.jsx`, `package.json`,
`package-lock.json`, os 5 `.bak-*` e os 4 bytes de controlo do `CLAUDE.md` **intactos**.

**Input para 109c/d (registado, NAO executado):** (A) usar **IMAGEM DE REFERENCIA** (`--image`), NAO Soul ID
(a skill do Soul ID e «for a PERSON'S FACE», 5-20 FACE photos; o GUTO e mascote cartoon 3D com 8 imagens de
corpo inteiro e 0 close-ups — LACUNA L-3 do 109a); (B) verificar **primeiro** `Desktop\GUTO\GUTO original\`
(LACUNA L-1: a referencia original perdeu-se); se nao estiver la, usar 2-3 das 8 (`02`, `03`, `06`).


## R14 (append) -- UTAC109c -- DIAGNOSTICO: CARROSSEL DE VIDEOS + O DEFEITO DO BRANCO (hermes / deepseek)

**Tipo:** diagnostico PURO, READ-ONLY (zero alteracoes de codigo). Baseline `04a07e7`. Sem validador
(ressalva 5 do enunciado). **PARADO — a correccao e o UTAC109d.**

**O carrossel.** `src/components/CarrosselGUTO.jsx` (unico consumidor: `src/pages/Dashboard.jsx:282`,
`size` 116 mobile / 176 desktop). **8 slides** = 8 WebM (VP9 + tag `alpha_mode=1`, 512x512, 443 KB-1,66 MB)
+ 8 posters PNG, servidos de `public/assets/guto/carrossel/guto-{1..8}.{webm,png}` com `?v=mc58`.
Sem fetch/API/Blob. Crossfade de **1 s** a **50%** da duracao real, com no maximo 2 `<video>` montados.

**O defeito do branco — REPRODUZIDO, mas NAO no carrossel no ar.**
- O carrossel EM PRODUCAO esta LIMPO: varridos **todos** os frames (10 fps, RGBA) das 8 webm + 3 sprites
  = **0,0000 de branco na borda** em todos; alfa 45-59% (carrossel) e 72-74% (sprites). Os 16 ficheiros
  servidos sao **byte-identicos** ao disco (md5 16/16).
- O **material NOVO** tem fundo **BRANCO OPACO e SEM alfa**: `Desktop\NOVO GUTO animado oficial\*.mp4`
  (8 MP4 h264/yuv420p, 960x960, 10 s, 0,86-1,71 MB, sem audio, borda **80-99% branca opaca**) e as 16
  PNG novas (`NOVO GUTO estatico oficial[/CORRIGIDO]`, 4096x4096, **transp = 0,0**, borda 89-99,9% branca).
  MP4/H.264 **nao suporta alfa** ⇒ posto no carrossel como esta, da um **quadrado branco**.
- Hipoteses descartadas por medicao: aspect-ratio (tudo 1:1), background do contentor (nao existe),
  gap/padding (e entre o carrossel e o logo), frame branca (varredura completa), opacity (2 camadas
  transparentes). A hipotese «browser sem alfa VP9» daria **PRETO** (o plano de cor e (0,0,0)) - nao branco.
  O branco que EXISTE no carrossel e **conteudo** (eletrodomesticos brancos + placa «LANCE UNICO»).

**DRIFT MEDIDO (GATE 2 / licao «o artefacto move-se»).** A pasta-fonte passou de **20** ficheiros (109a)
para **36**: apareceram 2 subpastas novas (mtime 2026-10-07 06:51 e 20:07). E a pasta dos videos novos esta
**FORA** da pasta-fonte — `Desktop\NOVO GUTO animado oficial\` (8 MP4 + `LEIA-ME.txt`): correccao do
operador durante este UTAC. O `LEIA-ME` diz: Higgsfield CLI **Seedance 2.5** (image-to-video), 960x960,
30 fps, h264, sem audio, 10 s boomerang, enquadramento fixado (imagem como 1.o e ultimo frame), textos
corrigidos - e ainda «MENOR LANCE UNICO» (1), «O MENOR LANCE UNICO VENCE» (2), «PARTICIPE JA» (8):
o material novo esta **meio-des-leiloizado** (saiu martelo/pulpito/microfone; entrou carrinho/caixas/sacos).
⚠️ A pasta «NOVO» **nao e toda nova**: 2 de 8 sao copias das antigas (1.png = `03-guto-maquina-lavar`,
8.png = `08-guto-conjunto-eletrodomesticos`).

**LACUNA L-1 — VERIFICADA.** `Desktop\GUTO\GUTO original\` **existe** e tem **1** ficheiro:
`guto tradicional (1).png` (1024x1536, RGBA, **67,5% transparente** ⇒ fundo LIMPO). Nao e o `0539243f...915e.png`
do grafo ComfyUI (esse continua ausente): a L-1 estrita permanece, mas ha um GUTO original utilizavel.
Os **8 MP4 do 109a** (L-4) foram medidos pela 1.a vez: todos **sem alfa e com fundo branco opaco**.

**Para o 109d (bloqueador):** remover o fundo branco frame-a-frame + encode **WebM VP9 `alpha_mode=1`**
(`-pix_fmt yuva420p`), verificar o alfa por DESCODIFICACAO (o `ffprobe` reporta `yuv420p` e nao prova o alfa),
**subir a constante `V`** do cache-bust (os assets sao `immutable, max-age=1 ano`), e **decidir a fonte unica**
(o material novo esta espalhado em 2 sitios). Escaladas 4 perguntas ao operador (onde viu o branco, que
dispositivo, qual a fonte, e se ha de haver uma 3.a geracao sem «MENOR LANCE UNICO»).


## R14 (append) -- UTAC109d -- REMOVER O FUNDO BRANCO DOS 8 VIDEOS NOVOS (hermes / deepseek)

**Baseline** `3ba5d2e` -> commit **`dd01f50`** (troca) + registo. Testes: frontend **914/914**
(910 + 4 novos), backend **1095/1101** VERDE. **Validador adversarial: APROVADO, 0 bloqueantes**
(worktree A13, 687s, 0 ficheiros do repo tocados). Deploy verificado em producao.

**O que mudou:** os 8 WebM + 8 PNG posters de `desafio-gut/frontend/public/assets/guto/carrossel/`
sao AGORA o material NOVO (`Desktop\NOVO GUTO animado oficial\`, que o UTAC109c mediu com fundo
BRANCO OPACO e sem alfa) processado para **VP9 `alpha_mode=1` 512x512** (288-1308KB; total 4,5MB vs
8,3MB dos antigos). Unica alteracao de codigo: `CarrosselGUTO.jsx:27` `const V = "mc58"` -> **`"mc59"`**
(cache-bust). Novo guarda `src/__tests__/utac109d-carrossel.test.mjs` (4 testes).

**SEG0 -- a licao:** o pipeline que gerou os WebM actuais (MC58, Jul/2026) esta DOCUMENTADO em 5 sitios
(`cloud.md` MC58.1/MC58.3, `GUTO/GUTO-ANIMADO GLASS DASHBOARD/notas_mc58{1,2,3}.txt`,
`MC-HISTORICO/recuperados-lixeira/MC58.3-RELATORIO.md` e **`MC58.2-PLANO-MIGRACAO.md` §3.1**, a receita),
mas o CODIGO (`whitecut.py` v1, `finalize.py`, `process_all.py`, `finalize_universal.py`) era scratchpad
**nunca versionado e perdeu-se** (`GUTO-ANIMADO GLASS DASHBOARD/_mc58work/` esta VAZIO; 0 `.py` em
qualquer commit/branch; nada no disco). O operador pediu para NAO inventar -> pedi decisao (4 opcoes),
sem resposta no prazo -> re-implementei o ALGORITMO DOCUMENTADO e fiz PILOTO antes dos 8. **O pipeline
passou a estar versionado** no Apendice A de `_logs/UTAC109d-remover-fundo.md`.

**Receita reproduzida (MC58.2 §3.1):** (1) flood-fill de BORDAS (`whitecut` v1, `scipy.ndimage.label`)
remove so o branco conectado a moldura -- brancos internos (camisa/olhos) e eletrodomesticos ficam;
SEM o passo `whitecut2` do vidro fosco da img1; (2) downscale PREMULTIPLICADO 960->512 + RGB dos
transparentes->preto + **erode 2px** (mata o halo); (3) `ffmpeg -c:v libvpx-vp9 -pix_fmt yuva420p
-b:v 0 -crf 30` -> `alpha_mode=1`; (4) poster = 1.o frame com alfa. Deterministico cv2/scipy, 0 ML.

**DESVIO DECLARADO (atacado pelo validador e nao derrubado):** `white_thr` **232 (default documentado)
-> 185**. Com 232 o chao claro dos videos v2 fica como faixa clara opaca (o material do MC58 tinha
podios escuros e nunca viu este caso; o `whitecut2` que o resolvia e exclusivo do vidro da img1).
Calibracao MEDIDA (frame 150): residuo claro na metade inferior 22 879 px (232) -> **506 px (185)**,
com o **aco escuro dos eletrodomesticos IDENTICO** (54 851 px em todos os limiares) e gate visual a
confirmar a maquina intacta. Fica a consideracao do operador.

**Licoes operacionais (instrumentos):** (a) o decode de VP9-alfa **por omissao DESCARTA o alfa**
(da `yuv420p` e pixels pretos opacos) -- medir alfa exige `-c:v libvpx-vp9 -i f.webm -pix_fmt rgba`,
e o `ffprobe` sozinho reporta `yuv420p` mesmo quando o `alpha_mode=1` existe; (b) um extrator que
reutilize o ficheiro de saida devolve **frame STALE** e mente (deu valores identicos para 8 ficheiros
diferentes) -- nomes unicos por (ficheiro,t) e remover antes de extrair; (c) `cv2.cvtColor(dstack([bgr,a]),
COLOR_RGBA2BGRA)` troca R<->B no poster (o `webm` nunca teve o bug) -- para BGRA usar `imwrite(dstack([bgr,a]))`.

**Cache-bust (medido, nao suposto):** a query `?v=` **nao e chave de CDN** -- a Netlify devolve o
ficheiro NOVO no mesmo caminho mesmo com `?v=mc58`; o `?v=` invalida apenas a **cache do browser**
(os assets sao `immutable, max-age=1 ano`) -> sem subir a constante, um browser com cache continuaria
a mostrar os videos antigos durante 1 ano. Por isso a subida para `mc59` e obrigatoria.
**Deploy:** push = auto-deploy Git (NAO usar `netlify deploy --build`, que corre build local e ensuja
o `package-lock` do frontend). Verificado: entry `index-B2GWopzJ.js` -> `index-Dz3nLTfv.js` a t+142s;
`guto-1.webm?v=mc59` = 397 840 B md5 `11368a8b8220` = o novo; +9 assets sem divergencia.

## R14 (append) -- UTAC109d.1 -- CARROSSEL: play() no 1.o carregamento + bolsas brancas (Claude Code, Opus 5.5)

**Tipo:** diagnostico + correccao (frontend + assets). **Baseline:** `2c2b31d`. **Commit:** `ea857c6` (as 2 correccoes) -> registo.
**Suite:** frontend VERDE **917/917** (+3) · backend VERDE 1095/1101. **Deploy:** auto-deploy Git (t+160 s), entry `index-y2nUEYgn.js` -> `index-Bez_-42d.js`;
chunk do carrossel `PrivyRoot-BJZw88XW.js` com `mc60`; 16 assets `?v=mc60` md5 16/16 = repo.

**Hipotese do Hermes REFUTADA** (VP9 alfa nao suportado no telemovel): decoder OK (`readyState 4`, `canPlayType=probably`) e o **desktop tambem**
ficava parado. **Causa raiz:** o `useEffect` do `play()` (`CarrosselGUTO.jsx`) dependia de `[cur, reduce]`; os `<video>` so montam depois de `pronto`
(`useAposPrimeiraPintura`, **MC88.36 `0f07456`, 2026-07-28**) e sem `autoPlay` -> num carregamento novo ficavam `paused, t=0` para sempre. So animava
depois de sair do Inicio e voltar (`jaPintou` e de MODULO) — o caso que o 109d viu. **«So aparece 1 dos 8» = o mesmo defeito** (a troca de slide so
dispara a meio do video activo). Nao e regressao do 109d. **Correccao:** deps `[cur, reduce, pronto]` + guarda `!pronto`. Teste de RUNTIME novo
`src/__tests__/utac109d1-carrossel-play.test.mjs` (componente real no `_hook-runner`, refs ligados antes dos efeitos); mutacao (tirar `pronto`) -> RED.

**R18 — EXTENSAO DE ESCOPO autorizada pelo operador:** «ainda tem muitos videos com o fundo branco» -> bordas limpas (0,000), mas **bolsas de fundo
FECHADAS** (entre arames/rodas do carrinho, pernas, sacos) que o flood-fill de bordas do 109d nao alcanca. O enunciado proibia regerar os videos/alterar o
pipeline; o operador autorizou (10 condicoes). **Pipeline Apendice A v2** (`_logs/UTAC109d.1-mobile.md`): + componentes brancos nao ligados a borda com
lum >= 230, sat <= 10, area >= 150, **anel com < 45 % escuro** (letras/ecra excluidos) e **voto temporal +-3 frames (>= 4/7)**. A 1.a versao (lum >= 234,
sem anel, frame a frame) foi **REFUTADA pelo validador** (apagava letras do portatil do v4, deixava bolsas, piscava) e corrigida. **So os videos 2, 4 e 6
mudam** (branco inferior/frame 8124->1030, 9485->1263, 3370->645); 1/3/5/7/8 byte-identicos ao mc59. Cache-bust **mc59 -> mc60**. Backup:
`C:\Users\Moltbot\tmp-109d1\backup-mc59\`.

**Validador adversarial:** ronda 1 PARCIAL (C1 aprovada; C2 v1 refutada) -> ronda 2 **APROVADO COM RESSALVAS, 0 bloqueantes**. ⚠️ R2-1 faixa branca do
chao entre as rodas do v4 (blob 552 px); ⚠️ R2-2 piscar residual ligeiro (v4 media 100->126; uma mancha de 273 px alterna 8x em 10 s). Verificacao
funcional no build de producao do mesmo commit (vite preview): desktop e 375px Android animam no 1.o carregamento e avancam de slide. **Nao medido:**
telemovel/APK real (o APK so recebe com AAB novo — 109j). **Escopo:** backend, package*, 5 `.bak-*`, MLC/OP/Carteira intactos; `EM_BREVE_MODE = true`.
**Registo:** `_logs/UTAC109d.1-mobile.md` · `_logs/UTAC109d.1_SEG6_VALIDADOR.md` · `Desktop/RELATORIO-UTAC109d.1-MOBILE.txt`.
**Custo:** validador 758 075 tokens = 15–1516 ¢ (303 ¢ se tudo input); sessao principal nao medida (≈ 104 ¢ se tudo input). ≈ 1 h 15 (HI5 2 h).


## R14 (append) -- UTAC109e -- CARTAO DE EDICAO UNICO (formato Relampago) + GUTO ANIMADO 7 (Claude Code, Opus 5.5)

**Tipo:** CODIGO (frontend + testes). **Baseline:** `2e40488`. **Commits:** `dcf8460` (feat) -> `0daf3af` (achados do validador) -> registo.
**Suite:** frontend VERDE **935/935** (+18) · backend VERDE 1095/1101. **Deploy:** auto-deploy Git; entry `index-Bez_-42d.js` -> `index-DnndOoX6.js`.
**Decisoes do operador (R18, SEG0):** **A** GUTO animado 7 no CARTAO VAZIO (o topo do Inicio fica com os 8 videos) · **B** 1 linha do `CardLance`: «⚡ Lance Relampago» -> «Dar lance» · **C** Inicio tambem «Dar palpite». Decisao 1 do enunciado (Relampago = padrao) reverte a OP «A · Familia» do 108e.1.
**Feito:** `CartaoEdicao` com UM so formato (arte na largura toda; sai a variante compacta, `destaque`, `tempoRotulo`, `GUTO_URL`); prop `acao` + `ACOES` congelada (`lance`: «Dar lance»/«Seu lance (em centavos)»; `palpite`: «Dar palpite»/«Seu palpite (nº de lances)»), validada por `Object.hasOwn` (o teste de entrada invalida apanhou `ACOES["constructor"]`); o formulario DESLIGADO do vazio vive no cartao. MLC `acao="lance"`, OP `acao="palpite"`. GUTO 7 = `CarrosselGUTO` com `[SLIDES[6]]` (`SLIDES` exportado), so no vazio; com edicao a arte toma o lugar.
**Testes:** novo `utac109e-cartao-unico` (16), Inicio +2, contratos 108e1/106f actualizados. **Mutacao 13/13** (`scripts/utac109e-prova-mutacao.mjs`).
**Validador: APROVADO, 0 bloqueantes** -- V1/V2/V8 (aria-hidden, loop, topo 8 videos) fechados com teste; **declarados:** faixa da OP aberta a 375 px com «Em andamento — lance ja!» (copy de lance num cartao de palpite; nome espremido; estimado) -> **109g**; V5/V9/V11 sem teste; o vazio da OP perdeu «Sem edicoes programadas no momento…».
**Licao de instrumento:** `\b`/`\n` em Python via heredoc chegaram ao ficheiro como 0x08 / quebra real (3x) -- varrer bytes de controlo depois de cada edicao por script.
**Escopo:** backend, package*, 5 `.bak-*`, Carteira intactos; `EM_BREVE_MODE = true`. Browser nao aberto (gate LGPD).
**Registo:** `_logs/UTAC109e-padronizar-edicoes.md` · `_logs/UTAC109e_SEG6_VALIDADOR.md` · `Desktop/RELATORIO-UTAC109e-PADRONIZAR.txt`.
**Custo:** validador 123 038 tokens = 2,5–246 ¢ (49 ¢ se tudo input); sessao principal nao medida (`/cost`). ≈ 1 h 40 (HI5 2 h). **Proximo:** 109f (Inicio).


## R14 (append) -- UTAC109f -- INICIO: ORDEM FINAL + ACESSOS + GLASS FINAL + P1/P2/P4 NA FONTE (Claude Code, Opus 5.5)

**Tipo:** CODIGO (frontend + testes). **Baseline:** `731ec28`. **Commits:** `f8c622e` (feat) -> correccoes do validador -> registo.
**Suite:** frontend VERDE **947/947** (+12) · backend VERDE 1095/1101. **Mutacao 18/18** (`scripts/utac109f-prova-mutacao.mjs`).
**Ordem final do Inicio:** carrossel (8 videos, intacto) -> 4 glass pequenos (Saldo · Passe Desafio · Lances Unicos · Total de
Lances — **byte-iguais ao baseline**, agora com guarda sha256) -> glass MLC -> glass OP (o `CartaoEdicao` do 109e) -> acessos
rapidos -> glass final «🏅 Vencedores».
**Decisoes do operador (R18):** **A** glass MLC com EM BREVE = o cartao vazio da aba MLC (GUTO 7 + «Seu lance (em centavos)»
desligado; o Inicio perde o botao para /mercado) · **B** «Perfil» -> `/configuracoes` · **C** «Suporte» -> `mailto:desafiogut01@gmail.com`
· **D** P3 so em LOCAL (vite 127.0.0.1:3000), perfil de browser novo e descartavel (apagado no fim), sem dados pessoais; o gate
LGPD foi aceite **em ambiente de teste** so para desbloquear a renderizacao visual.
**Feito:** acessos Carteira/Regras/Suporte/Perfil (icone + rotulo + #f5a623, 48 px, 2x2 mobile / 4 desktop). Glass final =
placeholder no padrao do MeusAtivos (**LACUNA:** nao ha fonte publica de vencedores; sem 🏆, sem «ver todos»). **P1** na fonte
(`utils/edicao.js`: Programada ATIVA -> «Em andamento — palpite ja!»). **P2** na fonte (`CartaoEdicao` `VAZIO_POR_ACAO`: palpite ->
«Sem edicoes programadas no momento.»), Inicio e aba OP sem tocar em `OfertasProgramadas.jsx`. **P4** faixa do cartao com wrap
(A/B a 375 px: nome 15 -> 285 px). **P3** screenshots `_logs/utac109f-browser/inicio-{375,1280}.png` (0 px de overflow, 48 px).
⚠️ Ecras nao podem importar `EM_BREVE_MODE` (guarda MC88.43): usar `getEstadoEdicao(...).emBreve`.
**Validador: APROVADO COM RESSALVAS** (0 defeitos de comportamento); ⚠️ P1 sem teste na aba OP e tiles sem guarda -> fechados
(nao re-validados); declarados: faixa mais alta com tempo longo, fallback `tipo:"programado"` do `edicaoAtiva`.
**Escopo:** 4 glass pequenos, aba OP, Carteira, backend, gate legal, `EM_BREVE_MODE = true`, package*, 5 `.bak-*` intactos.
**Registo:** `_logs/UTAC109f-inicio.md` · `_logs/UTAC109f_SEG-1_MEDICAO.md` · `_logs/UTAC109f_SEG3_VALIDADOR.md` ·
`Desktop/RELATORIO-UTAC109f-INICIO.txt`.
