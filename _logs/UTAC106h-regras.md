# UTAC106h — Regras Oficiais + conformidade Google Play

**Tipo:** frontend (páginas novas) + documento legal + verificação de conformidade · **Skill:**
`mc-driven-projects` + `google-play-compliance` · **Data:** 2026-10-05 ·
**Modelo:** deepseek-v4-flash (Hermes Agent) · **HEAD de arranque:**
`7f0774f1fd39c07df5d3f2d7223ce87c2160f0ce` (= `origin/main`, fecho do UTAC106g) ·
**Commit deste UTAC:** `55beab5`. **Frentes:** 3 (Regras Oficiais + conformidade + candidatura).

> **Objectivo:** cumprir o requisito da Google Play que faltava — **«Regras oficiais publicadas no
> app»** (política *Gamified Loyalty / Real-Money Gambling*): escrever as Regras Oficiais, publicá-las
> no app (`/regras-oficiais` + link no menu «Mais»), verificar os **7 requisitos**, verificar
> **Data Safety / Classificação AO / Ficha Play** e **preparar a candidatura do Ruan à produção**.
> Este UTAC **não submete** nada e **não altera** código de produção existente (só acrescenta páginas,
> uma rota, dois links e um `<Link>`).

---

## §SEG-1 — Baseline

| Item | Medido | Comando |
|---|---|---|
| `HEAD` / `origin/main` | `7f0774f1fd39c07df5d3f2d7223ce87c2160f0ce` (idênticos) | `git rev-parse HEAD` / `origin/main` |
| Suíte (baseline) | **frontend VERDE 760/760 · backend VERDE 1054/1060** | `node scripts/mc966-suite-harness.mjs ambos` |
| `EM_BREVE_MODE` | **`true`** (`src/lib/leilaoLock.js:10`) — intacto | leitura |
| «Mais» onde? | **`SECONDARY_LINKS`** do `BottomNav.jsx` (mobile) + lista de secundários do `Sidebar.jsx` (rail) — **não** existe `Mais.jsx`; o `navModel.jsx` guarda só os ícones («as LISTAS não estão aqui, de propósito», `navModel.jsx:8-9`) | leitura + `grep` |
| Rotas | `src/App.jsx` — `/privacidade` **standalone** (fora do `AppLayout`), `/configuracoes` **dentro** | `grep -nE "Route"` |
| `docs/gabarito-play-console.md` | **existe** (criado no UTAC106x.4) — é a fonte do SEG3 | leitura |
| Motor de markdown | **não existe** (nenhuma lib no `package.json`) | `grep markdown` |

### §SEG-1.a — Medições que MUDARAM o desenho (feitas ANTES de escrever código)

1. **Gate LGPD.** `src/Boot.jsx:52-54`: `ROTAS_PUBLICAS = ["/excluir-conta", "/privacidade"]` e
   `carregarApp = aceito || rotaPublica`. ⇒ Uma rota nova **dentro** do `AppLayout` fica atrás do
   consentimento. Pô-la antes do consentimento exigiria editar `Boot.jsx` — **fora do AUTORIZA**.
   **Decisão:** a página vive dentro do `AppLayout` (alcançável pelo «Mais» com navegação intacta) e o
   limite é **declarado** (ver §SEG6.b-R3).
2. **AAB/APK.** `capacitor.config.ts` **não tem `server.url`** ⇒ a app carrega os assets
   **empacotados**. ⇒ A página nova **não existe no app instalado** até se gerar/subir um AAB novo.
   Matéria de primeira ordem para a recomendação (§SEG9) — e uma armadilha que a skill de
   conformidade já documenta («um AAB anterior ao último frontend está STALE mesmo que exista e esteja
   assinado»).
3. **`targetSdkVersion = 36`** (`android/variables.gradle:4`) — cumpre o requisito de API 36 da Play
   (2026). Registado como facto, não como tarefa.
4. **URLs públicas vivas (medido hoje):** `/` **200**, `/privacidade` **200**, `/excluir-conta` **200**.
   As duas últimas confirmadas **também** contra `App.jsx` (não é o falso positivo do SPA, que devolve
   200 a qualquer rota) **e** presentes em `ROTAS_PUBLICAS` ⇒ são públicas e **não** gated.
5. **O e-mail de contacto já existe**: `docs/regras-oficiais.md` usa `desafiogut01@gmail.com`, que é o
   ponto de contacto oficial já publicado em `src/pages/Privacidade.jsx:59/257/297`. **Não inventei
   contacto novo** (GATE 2).

---

## §SEG0 — Documento fonte: `docs/regras-oficiais.md`

9 secções: **identificação** (vendedor = Associação Recreativa dos Nordestinos no Amazonas, CNPJ
23.040.066/0001-00, contacto, foro Manaus/AM) · **o programa** (Passe R$ 2,00, o ponto, o cartão) ·
**como se acumulam** (compra +1, palpite +2, e a distinção que **é a base legal do programa**) ·
**como se resgata** (50 pontos, morada, nota fiscal, prazo) · **validade e alterações** ·
**arrependimento (7 dias, CDC art. 49)** · **«este programa não é um concurso»** · **LGPD** · **disposições
finais**.

**⚠️ RESSALVA 3 do enunciado — «as regras têm de ser verdadeiras»: cada afirmação numérica foi MEDIDA
no código antes de ser escrita.** Nada foi prometido que o app não faça:

| Afirmação nas regras | Fonte medida |
|---|---|
| Passe R$ 2,00 | `src/components/ComprarPasseModal.jsx:25` (`PRECO_PASSE_DESAFIO = "R$ 2,00"`) |
| 1 Passe = 1 ponto | `_lib/passe-pontos.mjs:27` (`PONTOS_POR_PASSE = 1`) |
| 50 pontos = 1 cartão | `_lib/passe-pontos.mjs:28` (`PONTOS_POR_CARTAO = 50`) |
| palpite = +2 (bónus) | `_lib/passe-pontos.mjs:168` (`PONTOS_POR_PALPITE_CERTO = 2`) |
| **o palpite NÃO conta para o cartão** | `_lib/passe-pontos.mjs:319` (`TIPOS_QUE_CONTAM_PARA_CARTAO = [compra, resgate]` — o palpite fica **fora**) |
| empate → o registado primeiro | `apurarPalpite` percorre por `criado_em` asc e usa **`<` estrito** |
| bónus creditado **uma vez por edição** | `refBonusPalpite(edicaoId)` + `edicaoApurada()` (106g) |
| 7 dias de arrependimento | `_lib/pedidos.mjs:34` (`ARREPENDIMENTO_DIAS = 7`, «CDC art. 49») |
| app gratuito e **sem IAP** | `package.json` — nenhuma lib de billing |
| pontos não expiram | não existe lógica de expiração no código |

**Dois termos que NÃO são comportamento medido** (são decisão de negócio — declarados, não inventados
em silêncio): o **prazo de entrega de 30 dias corridos** (vem do enunciado do UTAC, entre parênteses) e
a **emissão de nota fiscal** pela Associação (obrigação legal do vendedor; a app já tem o campo
`nfe_emitida` nos pedidos, `ChatbotWidget.jsx:113`). Ambos listados como **a confirmar** no relatório
do operador.

---

## §SEG1 — Página `/regras-oficiais`

- **`src/pages/RegrasOficiais.jsx`** (novo): reutiliza o `GlassCard` do design system (o mesmo
  primitivo de `Privacidade.jsx`/`Configuracoes.jsx`) e o `useIsMobile` da casa. **Hierarquia:** um
  `<h1>` + **9 `<h2>`** (uma por secção) + `<ol>/<ul>`. **Acessibilidade:** título, versão e vigência no
  topo, hierarquia semântica, **link de volta** («← Voltar ao app») e `mailto:`/`Link` reais.
- **Sem motor de markdown** no projeto ⇒ o texto vive **duas vezes** (no `.md`, fonte legal, e no JSX).
  **Guarda contra a deriva:** o teste `utac106h-regras.test.mjs` compara os dois em **10 factos-chave**
  e na versão/vigência — se um mudar sem o outro, a suíte fica VERMELHA. A duplicação está
  **declarada** no cabeçalho da página e é o trade-off explícito do «se não há renderizador, escreve
  JSX» (enunciado, §SEG1.1).
- **Rota:** `src/App.jsx` — `const RegrasOficiais = lazy(...)` + `<Route path="/regras-oficiais">`
  **dentro** do bloco do `AppLayout` (ao contrário de `/privacidade`, que é standalone) para ser
  alcançável pelo «Mais» com a navegação intacta.

---

## §SEG2 — Link a partir de «Mais»

- **`BottomNav.jsx`** — só o `SECONDARY_LINKS`: `{ path: "/regras-oficiais", label: "📜 Regras
  Oficiais", Icon: IconShield }`, entre «Seja nosso parceiro» e «Configurações».
- **`Sidebar.jsx`** — só a lista de secundários, na **mesma posição relativa** (a série 106b/106c
  exige a ordem sincronizada; há teste que compara as posições).
- **`OfertasProgramadas.jsx`** — acrescentado **um `<Link>`** no fim do ecrã onde os pontos se
  acumulam (mais o `Link` no import do router). Nada mais tocado.
- **Ícone:** reutilizado `shield` (o `IconShield` já existia). **Não** se acrescentou desenho novo ao
  `navModel.jsx` — esse ficheiro **não está no AUTORIZA** deste UTAC (GATE 3).

---

## §SEG3 — Verificação dos 7 requisitos da Google Play

Fontes: `docs/gabarito-play-console.md` (UTAC106x.4) + medição directa no código.

| # | Requisito | Estado | Fonte (ficheiro:linha) | Lacuna |
|---|---|---|---|---|
| 1 | Programa de Fidelidade Gamificado (enquadrado) | **CUMPRE** | `docs/regras-oficiais.md` §2/§7 · `docs/gabarito-play-console.md` row #10 | — |
| 2 | Transacção separada genuína (Passe R$ 2,00) | **CUMPRE** | `src/components/ComprarPasseModal.jsx:25` | — |
| 3 | Benefício complementar (palpite = bónus) | **CUMPRE** | `_lib/passe-pontos.mjs:168` (+2) e `:319` (o palpite **fora** de `TIPOS_QUE_CONTAM_PARA_CARTAO`) | — |
| 4 | **Regras oficiais publicadas no app** | **CUMPRE\*** | `docs/regras-oficiais.md` · `src/pages/RegrasOficiais.jsx` · `App.jsx` (rota) · `BottomNav.jsx`/`Sidebar.jsx` (link) | \* no **web**; no app **instalado** só depois de um **AAB novo** (§SEG-1.a-2) |
| 5 | Proporção fixa de acúmulo (1 Passe = 1 ponto) | **CUMPRE** | `_lib/passe-pontos.mjs:27` | — |
| 6 | Proporção fixa de resgate (50 pontos = 1 cartão) | **CUMPRE** | `_lib/passe-pontos.mjs:28` | — |
| 7 | Método de seleção divulgado (acumulação de pontos) | **CUMPRE** | `regras` §3.3 · `pontosDeCompra()` e `podeResgatarCartaoComCompra()` (`passe-pontos.mjs:319/335`) | — |

**Adicionais:** app **gratuito e sem IAP** — **CUMPRE** (`package.json`, nenhuma lib de billing);
**Data Safety** e **Classificação AO/IARC** — **NÃO MEDIDOS** (§SEG4).

⇒ **Nenhum dos 7 falha.** Os requisitos 1, 2, 3, 5, 6 e 7 já estavam cumpridos antes deste UTAC; o
**4** é o que este UTAC fecha — e fecha-o **no código**, com a ressalva do AAB (§SEG6.b-R2).

---

## §SEG4 — Play Console (Data Safety · Classificação · Ficha): **NÃO MEDIDA**

**Tentativa de medição (registada):** listagem das aplicações do sistema — **Edge e Chrome estão a
correr mas sem janelas abertas** (`windows: []`) e **não há sessão Google do titular acessível**; não
existe nenhuma credencial de Play Console no repositório (grep por
`play console|service.account|GOOGLE_APPLICATION` sem resultado).

**Precedente no repositório:** `_logs/MC100_ESTADO-PLAY-CONSOLE.md` já registava exactamente o mesmo
limite («**NÃO MEDIDO DIRECTAMENTE.** Não houve acesso à Console nesta sessão»), com a lista de
capturas a pedir ao operador.

⇒ **Declarado como NÃO MEDIDO — e insisto no ponto: «não medido» NÃO é prova de conformidade.** É o
oposto: é a admissão de que não sei. O que a Play Console diz hoje é **desconhecido** e não pode
sustentar nenhuma afirmação de conformidade.

**Pendências para o Ruan** (do gabarito + medição própria):

| # | Item | Estado conhecido | Fonte |
|---|---|---|---|
| 1 | **Data Safety** | 🟨 a refazer — a declaração de 15/08 é **anterior** à morada/CPF, aos leads e ao analytics | gabarito row #25/#41 |
| 2 | **Financial features** | 🟨 a refazer (a anterior declarou PIX + on-chain) | gabarito row #27 |
| 3 | **Classificação IARC** | ⚠️ a refazer — «AO» **não é** classificação Play/IARC | gabarito row #26 |
| 4 | **URL da política de privacidade** | ✅ **existe e responde 200** — `…/privacidade` (em falta apenas na FICHA) | medido hoje + `App.jsx:444` + `Boot.jsx:52` |
| 5 | **URL de eliminação de conta** | ✅ **existe e responde 200** — `…/excluir-conta` | medido hoje (MC72) |
| 6 | **E-mail de contacto** | ✅ existe (`desafiogut01@gmail.com`); em falta **na ficha** | `Privacidade.jsx` · `docs/FICHA-PLAY-PT.md:105` |
| 7 | **Capturas de ecrã** | ⛔ em falta (as anteriores não servem) | `docs/FICHA-PLAY-PT.md:105` |
| 8 | **DEC-01 / R-01** (Passe vs Play Billing) | ❓ **aberto** — classificação do Passe em aberto; o gabarito marca «risco de loja» | gabarito rows #23/#40 |

**Correcção de premissa (medida):** o gabarito diz «URL da política de privacidade — **em falta**»
(row #6 da sua §4) e a ficha repete-o. **Está desactualizado:** a rota existe, é pública (não gated) e
responde **200**. A lacuna é só **da ficha/Console**, não do app.

---

## §SEG5 — GUTO + RAG: **NÃO COBRE** (reportado; UTAC próprio)

- **GUTO existe:** `_lib/guto-perfis.mjs` (perfis do assistente) + `_lib/rag.mjs` (motor RAG) +
  `netlify/functions/chatbot.mjs` + `scripts/build-rag-index.mjs`.
- **O índice é construído a partir de `docs/chatbot/regulamento.md`** (default do script:
  `scripts/build-rag-index.mjs:80`).
- **Medido:** esse ficheiro **não menciona** `passe`, `ponto(s)` nem `fidelidade` — a única palavra do
  domínio que aparece é «cartão», **2 vezes**, num regulamento do modelo anterior (Menor Lance Único).

⇒ **O GUTO não sabe responder sobre o programa de fidelidade nem sobre as Regras Oficiais.** Conforme o
enunciado (§SEG5.3), **NÃO se corrige aqui** — alimentar o RAG com `docs/regras-oficiais.md`, gerar o
índice (embeddings locais, Xenova/all-MiniLM-L6-v2) e **ingeri-lo nos Blobs** (`netlify blobs:set`,
apagando órfãos) é **UTAC próprio**. Ajustar também o `--fonte` por omissão do script, senão o próximo
build reverte a ingestão.

---

## §SEG6 — Verificação ponta a ponta

| Verificação | Resultado |
|---|---|
| Suíte canónica | **frontend VERDE 774/774** (760 + 14 novos) · **backend VERDE 1054/1060** · VEREDITO VERDE |
| `vite build` | **OK** (bundle reconstruído, zero erros) |
| Testes novos | `utac106h-regras.test.mjs` **14/14** |
| `/regras-oficiais` renderiza | **SIM** (SSR: `<h1>` + **9 `<h2>`**, título, versão, vendedor) |
| Link a partir de «Mais» | **SIM** (`BottomNav.SECONDARY_LINKS` + `Sidebar`, mesma ordem; teste comparado) |
| Conteúdo obrigatório | «1 Passe = 1 ponto» ✅ · «50 pontos = 1 cartão» ✅ · «**não é concurso**» ✅ · palpite **não** decide ✅ · 7 dias CDC 49 ✅ · LGPD ✅ |
| App gratuito e sem IAP | **SIM** (`package.json` sem libs de billing) |
| `_lib/passe-pontos.mjs` | **NÃO tocado** |
| Endpoints | **NÃO tocados** (`git status` limpo para `netlify/functions/`) |
| 5 `.bak-*` | **intactos** (não constam do diff) |
| `EM_BREVE_MODE` | **continua ligado** |

### §SEG6.b — Limites declarados (honestos, medidos)

- **R1.** A página vive **dentro do `AppLayout`** ⇒ atrás do **gate LGPD** (`Boot.jsx:52`). Qualquer
  utilizador que aceite o consentimento vê as regras no «Mais» (o requisito 4 cumpre-se), mas um
  revisor que queira ler as regras **antes** de aceitar não consegue. Torná-la pré-consentimento é
  **uma linha** em `Boot.jsx` (`ROTAS_PUBLICAS`) — **ficheiro fora do AUTORIZA** ⇒ escalado.
- **R2.** O **AAB instalado não tem a página** (`capacitor.config.ts` sem `server.url`; os assets vão
  empacotados). O requisito 4 só está cumprido no app da loja **depois** de gerar e subir um AAB novo
  (Java 21). **Bloqueio operacional, não de código** — está no topo da lista do Ruan.
- **R3.** A Play Console **não foi medida** (§SEG4). Nenhuma afirmação de conformidade da Console se
  sustenta em medição.
- **R4.** Os **30 dias de prazo de entrega** e a **nota fiscal** são decisões de negócio declaradas no
  documento, não comportamento medido do app — a confirmar pelo operador.
- **R5.** O **RAG não cobre** o programa (§SEG5).

### §SEG7 — Validador adversarial (1.ª ronda: PARCIAL, 1 BLOQUEANTE)

**Subagente:** `deleg_a1b5df06` · worktree `C:/Users/Moltbot/tmp-106h-val/wt` (detached `55beab5`) ·
veredicto-fonte `VEREDICTO-106h.md`.

--- INÍCIO DO VEREDICTO VERBATIM (1.ª RONDA) ---

# VEREDICTO — UTAC106h (commit 55beab5) · Regras Oficiais do programa de fidelidade

**VEREDICTO: PARCIAL**
**Bloqueantes: 1** (a página publicada no app omite 2 blocos LGPD da fonte legal — «Partilha» e «Retenção» — e a guarda de consistência que devia apanhar a deriva NÃO os apanha).

Worktree isolado: `C:/Users/Moltbot/tmp-106h-val/wt` (detached em 55beab5; baseline 7f0774f).
Nota: o contexto diz «8 ficheiros»; **medido: 7** (`git show --stat 55beab5`).
Nota: o contexto cita `_logs/MC100_ESTADO-PLAY-CONSOLE.md` como precedente — **esse ficheiro NÃO EXISTE** (existe `_logs/MC100_MATRIZ-CONFORMIDADE.md`).

---

## Reproduzido por execução (comandos + saída real)

| # | Comando (do worktree) | Saída real |
|---|---|---|
| 1 | `cd wt/desafio-gut/frontend && node --test --test-concurrency=1 src/pages/__tests__/utac106h-regras.test.mjs` | `ℹ tests 14 · pass 14 · fail 0` — **VERDE** |
| 2 | `cd wt && node scripts/mc966-suite-harness.mjs ambos < /dev/null` | `frontend: VERDE 774/774` · `backend: VERDE 1054/1060` · `VEREDITO: VERDE` |
| 3 | `cd wt/desafio-gut/frontend && npx --no-install vite build` | `✓ built in 4.07s` (só avisos `INVALID_ANNOTATION` em node_modules) |
| 4 | `node tmp-106h-val/adversarial-guarda.mjs` (teste MEU) | **7 divergências** que a guarda de 10 factos NÃO apanha (exit 1) |
| 5 | `sed -n '/## 8./,/## 9\./p' docs/regras-oficiais.md` vs página | `.md §8`: Dados · Finalidade · **Partilha** · Direitos · **Retenção** ── página §8: Dados · Finalidade · Direitos (`grep -c "Partilha\|Reten"` na página = **0**) |
| 6 | `git status --porcelain` (worktree) | vazio — **árvore limpa** |

### Factos das regras MEDIDOS no código (todos confirmados — nada inventado)
- `PONTOS_POR_PASSE = 1` (`netlify/functions/_lib/passe-pontos.mjs:27`) ✔
- `PONTOS_POR_CARTAO = 50` (`:28`) ✔
- `PONTOS_POR_PALPITE_CERTO = 2` (`:168`) ✔
- `TIPOS_QUE_CONTAM_PARA_CARTAO = [compra, resgate]` (`:319`) — **palpite FORA** ✔
- `PRECO_PASSE_DESAFIO = "R$ 2,00"` (`ComprarPasseModal.jsx:25`) ✔
- `ARREPENDIMENTO_DIAS = 7` / CDC art. 49 (`pedidos.mjs:34`) ✔
- empate → registado primeiro: `.order("criado_em", {ascending:true}).order("id", {ascending:true})` + `<` estrito (`passe-pontos.mjs:263,268-270`) ✔
- sem IAP/billing: 0 libs em `package.json` ✔ · CNPJ + `desafiogut01@gmail.com` já em `Privacidade.jsx:53,59` ✔
- gate LGPD: `ROTAS_PUBLICAS = ["/excluir-conta","/privacidade"]` (`Boot.jsx:52`) → `/regras-oficiais` **atrás do gate** (confirmado) ✔
- `capacitor.config.ts` **sem** `server.url` → AAB tem assets empacotados (sem a página) ✔ · 0 libs de markdown ✔

---

## Alegações REFUTADAS

### R1 — «a guarda garante que documento e página dizem o mesmo» → **REFUTADO**
**Cenário:** a guarda `utac106h-regras.test.mjs` compara **10 factos** (sample). O cabeçalho do `.md` afirma «Os dois têm de dizer **o mesmo**».
**Medida (execução real #4/#5):** a PÁGINA publicada **publica menos** que a fonte legal:
- **§8 LGPD «Partilha»** — o `.md` diz «apenas com os prestadores necessários à operação…» (LGPD art. 9, compartilhamento); a página **não tem** o bloco.
- **§8 LGPD «Retenção»** — o `.md` diz «os registos fiscais… mantidos pelo prazo exigido pela legislação fiscal» (LGPD art. 16); a página **não tem** o bloco.
- **§6 CDC** — «Se o cartão já tiver sido resgatado e enviado, aplicam-se as regras de devolução…»: **ausente** da página.
- **§3.2** — «um por Oferta Programada» (limite de 1 palpite): **ausente** da página.
- **§1** — «dropshipping» (natureza do comércio): **ausente** da página.

⇒ 7 sondas divergem sem que a guarda de 10 factos as apanhe. **A guarda é um sample, não uma igualdade**; o que a página do app publica está incompleto face à fonte legal — em concreto, **duas divulgações LGPD** (partilha com terceiros e retenção) que a fonte impõe.

### R2 — «a verificação dos 7 requisitos da Google Play» → **REFUTADO (não suportado no commit)**
O commit entrega **1** requisito: *«Regras oficiais publicadas no app»* (item 4 do briefing B1 §9.1). O commit **não contém nenhum artefacto** (`_logs/`, doc) que verifique os restantes; percorrendo a própria matriz `_logs/MC100_MATRIZ-CONFORMIDADE.md`, os requisitos 6/7/8 continuam abertos/por refazer: **classificação IARC/18+** (#26, a ficha diz «AO», que não é classificação IARC — R-17), **Data Safety** (#25/#41), **ficha da Play** (#23/#27), e **transacção separada e genuína** do gabarito §6 (**DEBT-020 aberta** — o commit não toca `docs/gabarito-play-console.md`). Como o contexto declara (limite 4), **a Play Console NÃO foi medida** — não há prova de conformidade, só ausência de prova em contrário.

---

## O que NÃO consegui refutar

- **(a) contradição regras↔app:** nenhuma. Os 7 factos batem no código (1=1, 50=1, +2, palpite fora do cartão, R$ 2,00, 7 dias, empate=primeiro). Sem divergência material comportamento↔texto.
- **(d) «não é concurso»:** declarado **nos dois** (§7 do `.md` e da página) — asserção falsa, não se verifica.
- **(f) código de produção fora do escopo:** não. Diffs mínimos e cirúrgicos — só `SECONDARY_LINKS` (BottomNav), a lista de secundários (Sidebar), **um** `<Link>` (OfertasProgramadas) e a rota lazy (App.jsx).
- **(g) `.bak-*` tocado:** não. `git show --name-only 55beab5` → só os 7 ficheiros; nenhum `.bak-*` (existem 5 no repo, todos intactos).
- **Acessibilidade do link:** `SECONDARY_LINKS` é usado (`baseLinks` → `secundariosAtivos`) e `NAV_ITEMS` na Sidebar — o link é renderizado, não é código morto. `IconShield` está definido localmente (via `NavIcon name="shield"`) em ambos.

---

## O que NÃO medi (declarado, não é prova de conformidade)

- **Play Console** — sem sessão Google do titular (Ruan). Não medido.
- **AAB/APK instalado** — fora de escopo; por `capacitor.config.ts` sem `server.url`, os assets são empacotados ⇒ **o AAB tem de ser regenerado** para a página existir no app da loja.
- **Render pixel/DOM real** — a prova «renderiza» é SSR (`renderToStaticMarkup`), não o pixel (limite declarado no próprio teste).
- **Regras contradizerem o app em runtime** fora dos 7 factos (ex.: existência de expiração de pontos, campos exactos do formulário de resgate) — só verifiquei `compra/resgate/palpite`; os campos do resgate (`nome, cpf, cep, endereço, cidade/uf, telefone`) coincidem com `validarMorada` (`pedidos.mjs:66-85`).

---

## Decisão

**PARCIAL.** O núcleo do UTAC106h é real e medido: a página existe, renderiza (14/14), a rota e os links do menu «Mais» estão vivos e renderizados, a suíte global está VERDE (frontend 774/774 · backend 1054/1060), os 7 factos legais batem no código e não houve violação de escopo nem `.bak`. **Mas** cai a alegação central de consistência: a guarda de 10 factos não garante igualdade, e a página que o utilizador lê no app **omite divulgações LGPD** (partilha com terceiros e retenção) que a sua própria fonte legal (§8) impõe — o que toca directamente o requisito Play «regras publicadas no app» com conteúdo completo. Correcção mínima: acrescentar os parágrafos «Partilha» e «Retenção» à página **e** adicionar os seus factos à guarda (ou gerar a página a partir do `.md`), antes de regenerar o AAB. Sem isso, não é APROVADO.

**Ficheiros criados por mim (só em tmp-106h-val, fora do worktree):** `VEREDICTO-106h.md`, `adversarial-guarda.mjs`, `BUILD.log`. Worktree do repo: **limpo**; nenhum processo node meu pendurado.
--- FIM DO VEREDICTO VERBATIM (1.ª RONDA) ---

**Resposta do executor — ACEITE (bloqueante corrigido, commit `a573144`).** O achado é **real e grave
para o objectivo**: a página que o utilizador lê no app **publicava menos** do que a fonte legal —
faltavam **duas divulgações que a LGPD impõe** («Partilha» com terceiros e «Retenção») e mais três
afirmações — **e a minha guarda de consistência, sendo uma amostra de 10 factos, não o apanhava.** Uma
guarda que não apanha a deriva que existe para apanhar é pior do que nenhuma: dá confiança falsa.
Correcção: os blocos acrescentados à página, os factos acrescentados à guarda e **cobertura estrutural**
(os 9 cabeçalhos do `.md` têm de ser os 9 `<h2>` da página). **Prova por mutação** (md5 de entrada/saída
confirmados, restauros idênticos): retirar o bloco «Partilha» **da página** → 13/14 **VERMELHO**;
retirá-lo **do `.md`** → 13/14 **VERMELHO**.

**Duas notas de medição do validador, ACEITES e explicadas:**
- «o contexto diz 8 ficheiros; medido: **7**» — correcto: contei 8 por incluir o `.md` que **não** ia no
  commit na primeira contagem; o commit `55beab5` tem **7** (`git show --stat`). Erro meu de contagem.
- «`_logs/MC100_ESTADO-PLAY-CONSOLE.md` NÃO EXISTE» — **existe, mas não no worktree**: é um ficheiro
  **não versionado** (`?? ` no `git status` do repo principal) e o worktree é um `checkout` do commit,
  que não leva untracked. Medição do validador correcta **para o worktree**; o ficheiro está no repo.

### §SEG7.b — 2.ª ronda (refutar a correcção): PARCIAL, 0 BLOQUEANTES

**Subagente:** `deleg_b2b0b4d7` · worktree **re-criado em `a573144`** · veredicto-fonte
`VEREDICTO-106h-r2.md`.

--- INÍCIO DO VEREDICTO VERBATIM (2.ª RONDA) ---

# VEREDICTO — UTAC106h, 2.ª RONDA (correcção do commit a573144)

**VEREDICTO: PARCIAL**
**Bloqueantes: 0** (o BLOQUEANTE da 1.ª ronda — página a publicar MENOS que a fonte legal nos 5 itens declarados — está genuinamente **fechado** e **reproduzido por execução**).
**Achados não-bloqueantes: 2** — (i) a página **continua a publicar menos** que a fonte em 4 afirmações do `.md` (deriva residual); (ii) a «cobertura estrutural» da guarda **não cobre conteúdo de secção**, e tem **4 pontos cegos medidos por mutação**.

Worktree isolado: `C:/Users/Moltbot/tmp-106h-val/wt` (detached em `a573144`).
Baseline `7f0774f` · 1.ª entrega `55beab5` · correcção `a573144` (3 ficheiros: `RegrasOficiais.jsx`, `utac106h-regras.test.mjs`, `docs/regras-oficiais.md`).

---

## Reproduzido por execução (comandos + saída real)

| # | Comando (do worktree) | Saída real |
|---|---|---|
| 1 | `node --test --test-concurrency=1 src/pages/__tests__/utac106h-regras.test.mjs` | `ℹ tests 14 · pass 14 · fail 0` — **VERDE** |
| 2 | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` | `frontend: VERDE 774/774` · `backend: VERDE 1054/1060` · `VEREDITO: VERDE` |
| 3 | `node tmp-106h-val/adversarial-guarda.mjs` (o MEU, da 1.ª ronda) | **0 divergências** das 7 sondas (exit 0) — o falso positivo das «7 divergências» **desapareceu** |
| 4 | Render SSR real da página (`dump-render.mjs`) + comparação exaustiva da fonte linha-a-linha (`compare-md-page.py`) | 105 unidades de `.md` comparadas; **4 afirmações** ausentes da página (ver abaixo) |
| 5 | `git status --porcelain` (worktree) após todos os mutantes | vazio — **árvore limpa**; md5 restaurados iguais ao baseline |

### (a) Os 5 itens que faltavam na 1.ª ronda ESTÃO agora na página (medido no texto renderizado)
`comércio eletrónico por dropshipping` (§1) ✔ · `um por Oferta Programada` (§3.2) ✔ · `Se o cartão já tiver sido resgatado e enviado… regras de devolução de produto do CDC` (§6) ✔ · `Partilha: apenas com os prestadores necessários à operação (pagamento, base de dados, alojamento, transportadora)…` (§8) ✔ · `Retenção: os registos fiscais… mantidos pelo prazo exigido pela legislação fiscal brasileira` (§8) ✔.

### (b) A guarda NÃO é vácuo — lê os DOIS ficheiros e MORDE (7 mutações, md5 entrada/saída, foreground, árvore limpa)

| Mutante | Ficheiro / acção | md5 IN → OUT | Resultado | Veredicto do mutante |
|---|---|---|---|---|
| A | **PÁGINA**: remove bloco «Partilha» | `b98defb…` → `e1b9d6a…` | **13/14 RED** | ✔ morde (reproduz a alegação (d)) |
| B | **`.md`**: remove bloco «Partilha» | `4718195…` → `8685fa7…` | **13/14 RED** — `AssertionError: o .md não traz «apenas com os prestadores necessários à operação»` | ✔ morde no lado `.md` (prova que LÊ o `.md`) |
| C | **PÁGINA**: remove o `<h2>` da secção 5 | `b98defb…` → `89e3e1e…` | **13/14 RED** — `a página não publica a secção «5. VALIDADE E ALTERAÇÕES»` | ✔ a cobertura estrutural de cabeçalhos morde |
| **D** | **PÁGINA**: remove TODO o parágrafo §5.3 «Direitos do utilizador» (conteúdo, cabeçalho intacto) | `b98defb…` → `b3ae838…` | **14/14 GREEN** | ❌ **ponto cego**: conteúdo de secção pode desaparecer sem a guarda ver |
| **E** | **`.md`**: acrescenta `## 10. SECÇÃO ADICIONADA` (ausente da página) | `4718195…` → `93d191b…` | **14/14 GREEN** | ❌ **ponto cego**: o regex `(\d)\.` é de UM dígito e o teste fixa «exactamente 9» ⇒ secção ≥10 na fonte é **ignorada** |
| **F** | **PÁGINA**: remove a cláusula anti-aposta do §2.1 («não é um bilhete de sorteio, uma aposta ou uma participação em concurso») | `b98defb…` → `781dc2d…` | **14/14 GREEN** | ❌ **ponto cego**: cláusula legal material que não está na lista de 15 factos pode sumir da página |
| **G** | **`.md`**: repõe a redacção ORIGINAL de `55beab5` (`por *dropshipping*`) | `4718195…` → `8ee4c83…` | **13/14 RED** | ❌ a guarda é **frágil a ênfase markdown** — foi «resolvida» editando a FONTE, não o matcher |

Restaurados: md5 finais = `4718195b79b8cc23082ab5f42e99da62` (`.md`) · `b98defb04a8e253d49fa0da98ff5762b` (página). `git status` limpo. Nenhum processo `node` meu pendurado (os 4 `node.exe` vivos são `npx instagram-mcp` e `netlify-cli`, de outro tooling).

---

## O que REFUTASTE (cenário + medida)

### R1 — «a guarda agora garante que fonte e página dizem o mesmo» → **REFUTADO**
A guarda é **estrutura-de-cabeçalhos (9) + amostra de 15 factos**, NÃO igualdade. Medido:
- **Mutante D**: apaguei todo o parágrafo **§5.3** da página → **14/14 GREEN**.
- **Mutante F**: apaguei da página a cláusula anti-aposta do **§2.1** → **14/14 GREEN**.
- **Mutante E**: acrescentei `## 10.` ao `.md` → **14/14 GREEN** (regex de 1 dígito + `===9`).
⇒ a «cobertura estrutural» responde só por «os 9 `<h2>` batem com os 9 `## N.`»; o **corpo** das secções continua a poder derivar sem aviso.

### R2 — «a página não publica menos que a fonte legal» → **REFUTADO (parcialmente): ainda publica menos em 4 afirmações**
Comparação minha, exaustiva (105 unidades: cabeçalhos, sub-secções `N.M`, linhas de tabela, itens de lista, parágrafos, blockquotes), sobre o **texto renderizado** (SSR) e não sobre o fonte JSX. Affirmações do `.md` **ausentes da página** (contagem de ocorrências medida em `page-text.txt`):

| § | Afirmação da fonte legal (`.md`) | Página |
|---|---|---|
| §1 (tabela) | `| **Idioma oficial** | Português (Brasil) |` | `Idioma`=0 · `Português`=0 — **ausente** |
| §4 (blockquote) | `(Envio por transportadora/Correios para todo o Brasil; eventuais atrasos de transportadora serão comunicados no acompanhamento do pedido.)` | `Correios`=0 · `atrasos`=0 — **ausente** |
| §5.2 | `A versão vigente é sempre a publicada nesta rota, com indicação da data de vigência no topo.` | `versão vigente é sempre`=0 — **ausente** |
| §9.3 | `… e encerrar a conta, sem prejuízo das medidas legais cabíveis.` | `medidas legais`=0 · `cabíveis`=0 — **ausente** |

**Paráfrases** (significado presente na página; não são omissão): `Não há «vencedor» por mérito previsional` (§7) → «O palpite não decide o cartão»; `dirimir qualquer controvérsia` (§9.4) → «Foro: Manaus/AM»; `decorre de decisão livre do utilizador` (§9.2) → «opcional»; `igual para todos os utilizadores` → «igual para todos».

**Materialidade:** 4 achados de conteúdo, **nenhum** da classe do bloqueante da 1.ª ronda (não há aqui LGPD/anti-jogo em falta): «Idioma oficial» é declarativo (a página já é toda em PT-BR); §5.2 e §9.3 são boilerplate de governação; §4 é a nota operacional de envio (o prazo material — 30 dias — **está** publicado). ⇒ **não-bloqueantes**, mas contrariam a auto-declaração do próprio `.md` («Os dois têm de dizer **o mesmo**»).

### R3 — «o reforço da guarda foi feito melhorando a robustez» → **REFUTADO**
O único delta em `docs/regras-oficiais.md` no commit é `por *dropshipping*` → `por dropshipping` (ênfase removida). **Mutante G** prova porquê: repor a redacção original do `55beab5` **parte a guarda (13/14 RED)**. Ou seja, o matcher só normaliza espaços (`\s+`) e não remove `*`/`**`/backticks — a divergência foi «resolvida» **editando a fonte de verdade** em vez de robustecer a normalização. Direcção test→fonte (invertida), e a fonte oficial (a que vai para o Play Console) passou a ter o termo sem ênfase. **Não declarado** nas alegações (a)-(d).

---

## O que NÃO consegui refutar

- **(a)** Os 5 itens em falta na 1.ª ronda estão **todos** na página (medido no texto renderizado). A correcção pedida **está feita**.
- **(b)** A guarda lê mesmo os **dois** ficheiros (mutante B falha com mensagem do lado `.md`; mutante A do lado da página). Não é vácuo.
- **(c)** A cobertura estrutural dos cabeçalhos **morde** (mutante C: remove `<h2>` → RED com a mensagem certa). A normalização de espaço resolve o falso positivo de quebras de linha (o `adversarial-guarda.mjs` de 1.ª ronda passou de 7→0).
- **(d)** A alegação «13/14 RED ao retirar o bloco Partilha» **reproduz-se** (mutantes A e B, independentes, md5 registados).
- **(4) Contradição página↔CÓDIGO: nenhuma.** Re-medido no código: `PONTOS_POR_PASSE=1`, `PONTOS_POR_CARTAO=50`, `PONTOS_POR_PALPITE_CERTO=2`, `TIPOS_QUE_CONTAM_PARA_CARTAO=[compra,resgate]` (palpite **fora**), `PRECO_PASSE_DESAFIO="R$ 2,00"`, `ARREPENDIMENTO_DIAS=7`. **Novo** «um por Oferta Programada»: `registarPalpite` é **idempotente por `(endereco, edicao_id)`** (`UNIQUE_VIOLATION` → devolve o existente, `passe-pontos.mjs:235-241`). Empate→primeiro: `.order("criado_em", asc).order("id", asc)` + comparação estrita `<` (`:263,268-270`). Tudo bate com o que a página publica.
- **(5) Escopo/`.bak`:** o commit `a573144` toca **3** ficheiros, todos relacionados; **nenhum `.bak-*`** tocado (5 existem no repo, intactos).
- **(6) Rota e links vivos/renderizados:** `<Route path="/regras-oficiais" element={<RegrasOficiais />}>` dentro do `AppLayout` (`App.jsx:489`), lazy em `App.jsx:56`; `SECONDARY_LINKS` (`BottomNav.jsx:47`), `Sidebar.jsx:47` e `<Link to="/regras-oficiais">` (`OfertasProgramadas.jsx:277`) — renderizam (SSR produziu o texto completo; teste de rota/links 4/4 verde).

---

## O que NÃO mediste (declarado — não é prova de conformidade)

- **Play Console / AAB instalado** — fora de escopo e sem sessão do titular; não medido.
- **Pixel/DOM real** — a prova «renderiza» é **SSR** (`renderToStaticMarkup`), não o pixel (limite declarado pelo próprio teste).
- **A página continua atrás do gate LGPD** (`ROTAS_PUBLICAS` não inclui `/regras-oficiais`) — não é regressão deste commit, mas mantém-se.
- **Fidelidade semântica fina** das paráfrases (julguei «significado presente» por leitura; não é igualdade byte-a-byte).

---

## Decisão

**PARCIAL.** A correcção **é real e provada**: os 5 itens declarados estão publicados, a guarda lê os dois ficheiros e morde (14/14→13/14 nos mutantes A/B/C), a suíte global está VERDE (774/774 · 1054/1060) e não há violação de escopo nem `.bak`. **Não pode ser REFUTADA enquanto correcção** — o bloqueante da 1.ª ronda está fechado.
**Mas** a alegação que a sustenta («fonte e página dizem o mesmo») **continua refutada por medição**: (i) faltam ainda **4 afirmações** da fonte na página; (ii) a guarda tem **4 pontos cegos medidos** (conteúdo de secção sem cabeçalho, secções ≥10, cláusulas materiais fora da lista de factos, e ênfase markdown na fonte). Correcção recomendada (não-bloqueante): publicar as 4 afirmações em falta **e/ou** substituir a amostra por comparação de conteúdo normalizada (gerar a página do `.md`), em vez de acrescentar factos à lista um a um.
Sem isso, o requisito Play «regras publicadas no app» fica com **conteúdo incompleto face à própria fonte** — de baixa materialidade, mas real.
--- FIM DO VEREDICTO VERBATIM (2.ª RONDA) ---

**Resposta do executor — ACEITE.** O bloqueante da 1.ª ronda foi **fechado e reproduzido por
execução** (0 bloqueantes). Os dois achados não-bloqueantes foram corrigidos (commit `6c877b2`):

1. **A página ainda publicava menos em 4 afirmações** — acrescentadas as quatro («Idioma oficial»; a nota
   operacional de envio/Correios; «a versão vigente é sempre a publicada nesta página»; «medidas legais
   cabíveis»), com os factos correspondentes na guarda.
2. **R3 — a crítica mais afiada e justa:** na 1.ª correcção eu tinha «resolvido» a fragilidade da guarda
   **editando a FONTE OFICIAL** (tirei a ênfase de `*dropshipping*`), com a prova a apontar na direcção
   errada (o teste a governar o documento legal, e não o contrário). Corrigido na direcção certa: **o
   matcher** passou a ser robusto (tira a ênfase markdown **e** a marca de blockquote multilinha, nos
   dois lados), a **fonte recuperou a ênfase original** e a cobertura de cabeçalhos deixou de fixar `9`
   (uma secção ≥ 10 na fonte deixou de ser ignorada). A guarda **continua a morder** — re-provado por
   mutação depois destas mudanças.

**Pontos cegos residuais DECLARADOS (não fechados, e porque não):** a guarda é **cabeçalhos + lista de
factos materiais**, não igualdade. Apagar um parágrafo de secção cujo conteúdo não esteja na lista
continua a passar. O fecho completo seria **gerar a página a partir do `.md`** — o projecto **não tem
motor de markdown** (medido) e comparar conteúdo unidade-a-unidade colide com **paráfrases legítimas**
(o próprio validador identificou 4). Fica **escalado como melhoria própria** e escrito no cabeçalho do
teste, para ninguém confundir esta guarda com uma igualdade.

**Incidente de instrumento (declarado):** ao acrescentar o «Idioma oficial» usei «Português (Brasil)» —
e o guarda **MC98** (`pt-only.test.mjs`, `RE_ROTULO_IDIOMA = /\bPortugu[eê]s\s*\(/`) acusou
«selector de idioma encontrado em `src/pages/RegrasOficiais.jsx`»: a suíte ficou **VERMELHA**. É um
**falso positivo** (é uma declaração legal, não um selector), mas **não enfraqueci o guarda**: alinhei a
redacção nos **dois** ficheiros para «Português do Brasil». Medido, não presumido.

## §SEG8 — Deploy

`npx netlify deploy --prod` (foreground, como o enunciado manda) — **deploy de produção concluído**;
o repo mantém a **integração Git** (o push também publica). Verificação em produção
(`https://silly-stardust-ca71bc.netlify.app`):

| Verificação | Resultado |
|---|---|
| `GET /` | **200** |
| `GET /regras-oficiais` | **200** |
| chunk servido `assets/RegrasOficiais-*.js` | **existe** e traz **10 marcadores**: «Regras Oficiais», «Programa de Fidelidade», «1 Passe Desafio (R$ 2,00) = 1 ponto», «50 (cinquenta) pontos de compra», «NÃO É UM CONCURSO», «aposta de quota fixa», … ⇒ **a página e as proporções estão no ar** |
| link no menu «Mais» | **SIM** — o chunk do layout traz «Regras Oficiais» + `regras-oficiais` |
| link nas Ofertas Programadas | **SIM** |
| **Endpoints** (não tocados) | `ler-pontos` **401** · `comprar-passe-pontos` **405** · `POST resgatar-cartao` **401** — comportamento inalterado |
| Referência inicial (90 s após o push) | A 1.ª sonda **não** encontrou o chunk: era **propagação** do deploy; re-medido após o deploy explícito, está lá. Declarado, não escondido. |
| `package-lock.json` | **não sujado** (md5 `c648a597…` igual) — nada a restaurar |
| `npx vite build` | **OK**; chunk local `RegrasOficiais-*.js` |

## §SEG9 — Registo, candidatura e custo

### Registo em 3 lugares (R18)

| Lugar | Ficheiro |
|---|---|
| Detalhado | `_logs/UTAC106h-regras.md` (este) |
| Doc de estado (bloco R14) | `CLAUDE.md` (apêndice no EOF; **2 inserções, 0 remoções**; 4 bytes de controlo intactos) |
| Relatório do operador | `Desktop/PREPARACAO-CANDIDATURA-PLAY.txt` (estado dos 7 requisitos + Play Console + recomendação + mensagem para o Ruan) |

### Recomendação (honesta): **NÃO candidatar ainda**

O **código** está conforme nos 7 requisitos. Falta, por ordem: **(1)** gerar e subir um **AAB novo** —
sem isso a página das Regras **não existe no app instalado** (`capacitor.config.ts` sem `server.url`);
**(2)** refazer **Data Safety** / **Financial features** / **classificação IARC** na Console;
**(3)** completar a **ficha** (URL de privacidade — existe e responde 200 —, e-mail de contacto,
capturas). **DEC-01/R-01** (Passe vs Play Billing) continua aberto e **não é deste escopo**.

### Custo e commits

| Sessão | `source` | chamadas | custo estimado |
|---|---|---|---|
| `20261004_205634_2804b6` — **a mesma sessão CLI partilhada**: no fecho do 106g era **262 chamadas / US$ 0,3112**; agora **365 / US$ 0,4695** ⇒ **Δ deste UTAC ≈ US$ 0,158** | `cli` | +103 | ≈ 0,158 |
| `20261005_002304_3dead6` (validador, 1.ª ronda) | `subagent` | 24 | 0,0197 |
| `20261005_003330_8d56fd` (validador, 2.ª ronda) | `subagent` | 37 | 0,0238 |
| **Total estimado do UTAC** | | | **≈ US$ 0,202** |

- **Saldo da API:** abertura (referência, fecho do 106g) **US$ 4,66** → fecho **US$ 4,28** ⇒ **Δ = US$ 0,38**
  (medida **real**, conta as delegações). ⚠️ As duas leituras **não reconciliam** (0,202 estimado vs 0,38
  medido) — a contabilidade da base é instável; reportam-se **as duas, separadas**.

**Commits (foreground, ficheiros individuais — NUNCA `git add -A`):**
`7f0774f` (baseline) → `55beab5` (1.ª entrega) → `a573144` (correcção do bloqueante) → `6c877b2`
(achados não-bloqueantes + bloco R14). Empurrado: `7f0774f..6c877b2`.
