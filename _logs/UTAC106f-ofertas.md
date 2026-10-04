# UTAC106f — Ofertas Programadas (ecrã real) + Palpite (+2 pontos, bónus)

**Tipo:** UI + extensão aditiva de backend + migração · **Skill:** `mc-driven-projects` ·
**Data:** 2026-10-04 · **Modelo:** deepseek-v4-flash (Hermes Agent) ·
**HEAD de arranque:** `b5686a6c3881e0a44196a5e395603ad88c070387` (= `origin/main`) ·
**Commit do código:** `e713c3e`. **Baseline:** `b5686a6` (fecho do UTAC106e).

> **Objectivo:** substituir o placeholder «EM BREVE» de `/ofertas-programadas` pelo ecrã real
> (pontos X/50 + barra, cartão da Família Quildo, histórico, botão de resgate desactivado) e
> acrescentar o **palpite** (+2 pontos ao mais próximo) como **BÓNUS** — nunca como decisor do cartão.
> **HI5 alargado a 2 h: DENTRO (≈1 h 11: 19:08 → 20:19).** ⚠️ *Erro do MEU instrumento, corrigido no
> fecho:* o log afirmou primeiro «HI5 EXCEDIDO (≈2 h 25)» — eu tinha atribuído ao 106f o carimbo de
> ARRANQUE do UTAC106e (18:22). Os carimbos medidos (`date` no início e no fim desta ronda e o saldo da
> API) dão **19:08 → 20:19**, dentro do limite. A afirmação errada fica à vista nesta nota (GATE 15).
> ⚠️ HI4/GATE 3/GATE 6 violados por decisão do operador (incorporado).

---

## §SEG-1 — Baseline

| Item | Medido | Comando |
|---|---|---|
| `HEAD` / `origin/main` | `b5686a6c3881e0a44196a5e395603ad88c070387` | `git rev-parse HEAD` |
| Suíte (baseline) | **frontend VERDE 739/739 · backend VERDE 1012/1018** | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| `EM_BREVE_MODE` | **`true`** (`src/lib/leilaoLock.js:10`) | leitura do ficheiro |
| `.bak-*` versionados | **5**, intactos | `git ls-files \| grep "\.bak-"` |
| Saldo da API — arranque | **US$ 5,97** | `curl https://api.deepseek.com/user/balance` |
| `public.pontos` | existe (UTAC106d-v2), RLS só `service_role` | migração `20261004_mc106dv2_pontos.sql:39-47` |

### §SEG0 — o placeholder que foi substituído

`src/pages/OfertasProgramadas.jsx` (60 linhas) — cabeçalho `{EM_BREVE_MODE ? EM_BREVE_LABEL : …}` com o
texto «Programa de fidelidade: … Esta área abre em breve.» (`:46,53-56`). Usava `useIsMobile` e
`GlassCard` (`@/components/ui`). **Não existia nenhum ficheiro de imagem do cartão** (medido:
`public/artes` só tem `edicao-especial-airfryer.jpg` e `email-banner.jpg`) ⇒ o cartão foi desenhado em
CSS (sem `<img>` quebrada).

### §SEG-1 — guardas que o 106f NECESSARIAMENTE parte (medido)

`utac106b-navegacao-frases.test.mjs:41-46` — «a página OfertasProgramadas é TRAVADA por EM_BREVE_MODE»
(exigia `/EM_BREVE_MODE\s*\?/` e `/EM_BREVE_LABEL/` no ficheiro). Medido: com o ecrã real a suíte dá
**1 falha** — exactamente esse guarda. Actualizado mantendo a invariante (§SEG1) e declarado (GATE 3).

---

## §SEG1 — UI do ecrã (substitui o placeholder)

`src/pages/OfertasProgramadas.jsx` reescrito: cabeçalho + subtítulo, **progresso «X / 50 pontos»** com
`role="progressbar"` (aria-valuenow/max), **cartão** da Família Quildo (CSS + descrição), **histórico**
de movimentos (data · tipo · ±pontos), **botão «Resgatar cartão»** (visível só a ≥50, **desactivado** —
a lógica é do UTAC106g) e o inverso («Chega a 50 pontos para resgatar»), **estado vazio** (0 pontos →
«Ainda não tens pontos. Compra o teu primeiro Passe na Carteira.» + «Ir para a Carteira»), e estados de
loading/erro. **O `EM_BREVE_MODE` global NÃO foi tocado** (continua `true`; trava os cronómetros — o
guarda seguinte do 106b, que o fixa, passou sem alterações).

**Leitura dos dados:** `src/hooks/usePontos.js` → `GET /ler-pontos` com Bearer. **Porquê um endpoint e
não o SDK do frontend:** a RLS de `public.pontos`/`public.palpites` só abre a `service_role` (o cliente
usa a ANON_KEY) — medido na migração do 106d-v2. O `endereco` sai do token, nunca do cliente.
**Guarda de corrida/deps:** `getAuthToken` fica num `useRef` para o efeito de montagem depender SÓ de
`address` (um `getAuthToken` que mude de identidade a cada render re-dispararia o efeito em ciclo).

## §SEG2 — Extensão do modelo (SÓ adição)

Migração `desafio-gut/frontend/supabase/migrations/20261005_mc106f_palpites.sql` — **`public.palpites`**
(`endereco` FK→`public.pontos`, `edicao_id`, `valor` ≥0, `criado_em`, `apurado`, `resultado`,
**UNIQUE(endereco, edicao_id)**), índice por `edicao_id`, RLS+GRANT `service_role`.
⚠️ **O prefixo da migração teve de ser `20261005`, NÃO `20261004`**: o CLI do Supabase usa o prefixo
como VERSÃO e a migração do 106d-v2 já ocupa `20261004` ⇒ com a mesma data o `db push` considerava-a
aplicada (medido: `migration list` emparelhava as duas) e **nunca criaria a tabela**.

`_lib/passe-pontos.mjs` — **estendido só por adição** (nada acima da linha do UTAC106f foi alterado):
`PONTOS_POR_PALPITE_CERTO = 2`, `refBonusPalpite(edicaoId)`, `lerPalpite`, `lerPalpites`,
`registarPalpite` (idempotente por (endereco,edicao); 23505→existente; **23503→`SEM_PASSE`**), e
`apurarPalpite` (vence o **mais próximo**; empate → o mais antigo; crédito com ref
`palpite-certo:<edicaoId>` ⇒ **re-apurar é idempotente**; marca o vencedor `mais_proximo` e os outros
`perdeu`). A `EDICAO_ID_RE` é importada de `_lib/edicoes-core.mjs` (uma só fonte de verdade).

## §SEG3 — Endpoints

| Endpoint | Auth | Contrato |
|---|---|---|
| `registar-palpite.mjs` | **Bearer** | `{edicaoId, valor}` → 201 novo · 200 idempotente · 400 valor/edição · 401 · **404 edição** · **409 sem_passe** |
| `apurar-palpite.mjs` | **ADMIN** (`autenticarAdmin`) | `{edicaoId, valorReal}` → `{ok,total,vencedor,pontosCreditados}` · 401/403 |
| `ler-pontos.mjs` | **Bearer** | `GET` → `{pontos, pontosParaCartao, podeResgatarCartao, historico, palpites}` |

`ler-pontos.mjs` é **extensão declarada** (não estava na lista do AUTORIZA): sem ele o ecrã não tem como
ler os pontos (RLS fechada ao cliente anónimo). Leitura pura — não escreve nada.

## §SEG4 — UI do palpite

`src/hooks/usePalpite.js` (`{palpite, registar, loading, erro}`; o palpite existente chega pelo
`usePontos`, sem 2.º fetch; guarda de corrida por `useRef`). No ecrã: campo numérico + «Palpitar» quando
há **edição Programada aberta**; depois de palpitar → «Já palpitou: X lances» (o campo desaparece — não
se muda o palpite); apurado → «Acertou! +2 pontos» / «Não acertou»; sem edição → «Sem edição a decorrer.
Volta quando houver.»

---

## §SEG5 — Testes + mutação

| Suíte | Antes | Depois |
|---|---|---|
| Frontend | 739/739 | **752/752** (+13: `utac106f-ofertas.test.mjs`) |
| Backend | 1012/1018 | **1024/1030** (+12: `_tests/palpite.test.mjs`) |
| `vite build` | — | **OK** |

**Mutação (GATE 7/8)** — `scripts/mc106f-prova-mutacao.mjs` (versionado): **6/6 mortos**, RED dirigido,
restauro byte-idêntico (md5).

| # | Mutante | Resultado |
|---|---|---|
| MP1 | `PONTOS_POR_PALPITE_CERTO` 2 → 3 | **RED** (fail 4) |
| MP2 | sem idempotência no registo | **RED** |
| MP3 | apuração não escolhe o mais próximo | **RED** |
| MP4 | vencedor marcado como «perdeu» | **RED** |
| MP5 | «Resgatar» visível a <50 | **RED** (fail 2) |
| MP6 | **cartão passa a depender do palpite** | **RED** |

---

## §SEG6 — Migração em produção

**Projeto:** `vjslwowwrpcawijdiksm`. Receita §15.g (tudo em `%TEMP%`, nada no repo):
`db push --linked --dry-run` → **«Would push these migrations: • 20261005_mc106f_palpites.sql»**;
`db push --linked` → **`Applying migration 20261005_mc106f_palpites.sql...`** + `Finished supabase db push`;
`migration list` → **`20261005 | 20261005`** (par registado). `public.passes` e `public.pontos` intactas.
**Limite declarado:** sem `psql`/credenciais directas não há segunda leitura do schema ⇒ a prova é o
`migration list` + o `NOTICE` da política.

## §SEG7 — Verificação ponta a ponta

1. **Suíte canónica** (pré e pós-deploy): **frontend 752/752 · backend 1024/1030 · VERDE**.
2. **`vite build`:** OK.
3. **Verificação ad-hoc** (`hermes-verify-utac106f.mjs` em `%TEMP%`, corrida e removida):
   **16 PASS / 0 FAIL** (teste do ecrã 13/13; backend 12/12; mutação 6/6; **`_lib/passe-pontos.mjs`
   `+115 / −0` ⇒ só adição, as funções antigas intactas**; `comprar-passe-pontos.mjs` (106e) e
   **`MinhaCarteira.jsx` sem alterações** vs base; Via A intocada; `apurar-palpite.mjs` exige
   `autenticarAdmin`; a migração **só CRIA** `public.palpites`; `.bak-*`/`package*.json` intactos;
   `EM_BREVE_MODE` true; o guarda do 106b actualizado).
4. **Deploy (foreground, GATE 10):** bundle **`index-DB6OZpjL.js` → `index-BDo9ZgMU.js`**; home **200** ·
   health **200**; `POST /registar-palpite` → **401**; `GET /ler-pontos` → **401** (`POST` → 405);
   `POST /apurar-palpite` → **401** (admin — **não** público); controlo negativo
   (`/nao-existe-xyz` → **400**, a armadilha §15.h). O chunk `assets/OfertasProgramadas-COwvcncg.js` ao
   vivo traz «Ofertas Programadas», «Cartão da Família Quildo», «Já palpitou», «Sem edição a decorrer» e
   `ler-pontos`; **sha256 local == produção** (`a2847b89df8016f2`).
5. **Efeito colateral reincidente (§15.i, 4.º UTAC):** o build sujou `package-lock.json`; arquivado fora
   do repo e restaurado ao HEAD (`5b40f11c…`); suíte re-corrida depois: VERDE.

## §SEG8 — Validador adversarial

**Veredicto: APROVADO COM RESSALVAS — mas com 2 REFUTAÇÕES FUNCIONAIS MINHAS.** Subagente independente em
worktree próprio (`scripts/worktree-helper.mjs criar … e713c3e`). Veredicto **verbatim** + resposta:
`_logs/UTAC106f_SEG8_VALIDADOR.md`.

### ⚠️ R1 (ALTA) — o bónus do palpite ENTRA na soma que desbloqueia o cartão · ACEITE · PAROU

Medido pelo validador: **48 pontos de COMPRA + 2 de palpite = 50 ⇒ `podeResgatarCartao = true`.**
O crédito do bónus usa a mesma coluna `pontos` que o contador do cartão. Contradiz a copy que EU escrevi
no ecrã («o cartão conquista-se só com os pontos das tuas compras») e o requisito que o meu commit marcou
como **crítico da Google Play** ⇒ é exactamente o caso que a RESSALVA do enunciado manda **PARAR e
reportar** («Palpite é bónus, não decisão. Se o executor fizer o cartão depender do palpite, PARAR»).
**Erro do MEU instrumento (declarado):** o teste 11 do `palpite.test.mjs` **codificou o defeito como
esperado** (`48 + 2 = 50` com a legenda «a regra do cartão é de COMPRA, o bónus soma») ⇒ deu-me
confiança falsa; o mutante MP6 não o apanha (testa o gate, não a soma).
**AGUARDA DECISÃO DO OPERADOR:** (A) contar só `tipo:"compra"` no cartão, ou (B) corrigir a copy para
«pontos totais».

### ⚠️ R2 (MÉDIA) — a idempotência da apuração é por ENDEREÇO, não por EDIÇÃO · ACEITE

Medido: com a edição já apurada, um **palpite novo** (`C`) + nova apuração credita **outro** +2 na mesma
edição (`A=2, C=2`). A `ref` `palpite-certo:<edicaoId>` é verificada no histórico **de cada endereço**, não
globalmente ⇒ o meu comentário no código («UMA por edição») é falso nesse cenário e o teste 9 só cobria
re-apuração **sem palpites novos**. A corrigir no 106g (flag de edição apurada que bloqueia novos
palpites e nova apuração).

### ℹ️ Nota aceite — `registar-palpite` só verifica que a edição EXISTE

Não exige `tipo === "programado"` nem `status` aberto (o comentário do ficheiro dizia que sim). Pela API é
possível palpitar numa edição Relâmpago/encerrada. A corrigir no 106g.

## ⛔→✅ FECHO PÓS-VEREDICTO — R1 corrigido (decisão do operador: OPÇÃO A)

O VALIDADOR REFUTOU a minha alegação «o palpite não decide o cartão» (acima, mantida À VISTA). O
operador decidiu, na sequência, a **opção A**: **o cartão conta SÓ pontos de COMPRA.** Correcção
aplicada no commit `1eb3ca1`:

- `_lib/passe-pontos.mjs` — **adições**: `TIPOS_QUE_CONTAM_PARA_CARTAO` (compra/resgate), `pontosDeCompra(registo)`
  e `podeResgatarCartaoComCompra(endereco)`. A `podeResgatarCartao()` ANTIGA (que compara o TOTAL) fica
  **à vista marcada como NÃO usar para decidir o cartão** — nada apagado.
- `ler-pontos.mjs` — devolve `pontosCartao` (o que conta para o cartão) e `bonusPalpite`; o limiar e o
  `podeResgatarCartao` passam a usar `pontosCartao`.
- `usePontos.js` / `OfertasProgramadas.jsx` — a **barra** e o «X / 50 pontos» usam os pontos de CARTÃO;
  o bónus aparece em linha própria («🎯 Bónus de palpite: +N — não conta para o cartão»).
- **Testes:** o teste que CODIFICAVA o defeito (`48+2=50, o bónus soma`) foi substituído por **4 testes
  R1** no backend (incl. a regressão «48 de compra + 2 de bónus ⇒ NÃO desbloqueia») e **1 regressão de
  render** no ecrã; **mutação 7/7** (novo **MP7** mata a regressão R1).
- **Suíte:** frontend 752→**753/753** · backend 1024→**1028/1034** · `vite build` OK · deploy refeito
  (bundle `index-BDo9ZgMU.js` → **`index-JXLwGXQc.js`**; home/health 200; `/ler-pontos` 401; o chunk ao
  vivo traz «não conta para o cartão»; sha256 local == produção).

**⚠️ Declarado: a correcção NÃO foi re-validada** (sem 2.ª ronda do validador). O `package-lock` foi
sujado pelo build e restaurado (`5b40f11c…`); suíte re-corrida depois do deploy: VERDE.

**Ainda em aberto (passam para o UTAC106g):** ⚠️ **R2** (idempotência da apuração por endereço, não por
edição) e a **nota** de que `registar-palpite` não exige edição Programada/aberta.

## Estado final do UTAC106f

**Implementação e R1 fechados e verdes**; R2 + a nota da edição **passam para o 106g** (declarados, não
esquecidos). **HI5: DENTRO (≈1 h 11)** — o log afirmou primeiro «excedido»; era erro meu (tomei o arranque
do 106e, 18:22, como o desta ronda; os carimbos reais são 19:08 → 20:19). Corrigido no fecho.
