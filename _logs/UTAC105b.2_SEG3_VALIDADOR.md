# UTAC105b.2 — SEG3 — VALIDADOR ADVERSARIAL (independente)

- **Commit a validar:** `1170b1f` (HEAD) — antecessor `966a587` — baseline da série `160bf09`
- **Âmbito:** (1) guarda de posse MC89.38 no `register-corporativo` de `cotas.mjs`; (2) preservação da coluna `endereco` no POST genérico de admin (Frente C)
- **Papel:** validador adversarial independente — objectivo: **REFUTAR** (procurar bypasses, caminhos não cobertos, regressões e testes vacuosos)
- **Datas/medições:** todas as medições deste documento são **minhas** (execução própria), salvo onde digo «declarado».
- **Integridade do repo:** md5 medido no INÍCIO e no FIM = `c5368150cc04b871f0f0e417d5a85de7` (esperado). Nenhuma alteração sobreviveu.

---

## 1. Escopo / ficheiros

`git show --stat 1170b1f` → 6 ficheiros, **+563 / −0**:

| ficheiro | tipo |
|---|---|
| `desafio-gut/frontend/netlify/functions/cotas.mjs` | **produção** (+46/−0) — **único** |
| `desafio-gut/frontend/netlify/functions/_tests/utac105b2-register.test.mjs` | teste novo (258 l., 14 testes) |
| `_logs/UTAC105b.2_SEG-1_MEDICAO.md` · `SEG0.md` · `SEG1.md` · `SEG2.md` | docs |

**Medido (não presumido):**
- `git diff --numstat 966a587 1170b1f -- …/cotas.mjs` → **`46  0`** e **2 hunks** (`@@ -422,0 +423,41 @@`, `@@ -568,0 +610,5 @@`): **46 linhas inseridas, ZERO apagadas/alteradas**. 647 → 693 linhas (693−647=46 ✓). Como o diff não tem uma única linha removida, **todos os bytes pré-existentes do `cotas.mjs` são preservados literalmente** — o prefixo (l.1-422) e o sufixo (l.610-693) são byte-idênticos ao `966a587`. ✅
- Nada em `_lib/`, `CLAUDE.md`, schema/migrações, `package.json` ou outro `*-corporativo`. ✅
- `netlify/functions/_lib/admin-auth.mjs`, `cotas-store.mjs`, `validate.mjs`, `jwt.mjs`, `cota-ativacao.mjs` — **não tocados** no commit. ✅

### 1.1 ⚠️ Estado do working tree (higiene — não é do commit)
`git status` mostra **dois ficheiros modificados NÃO commitados**, ambos **alheios a este commit** e **não** produzidos por mim (mtime 01:02/01:03, o meu primeiro write é posterior):
- `desafio-gut/frontend/package-lock.json` — pré-existente à sessão (já estava `M` no início);
- `CLAUDE.md` — **+62/−1**, mtime 01:03 (logo após o commit das 01:02), produto do script `C:/Users/Moltbot/tmp-utac105b2/claude-md-utac105b2.py` do executor: actualiza o cabeçalho para «UTAC105b.2 … **FECHADO**» e acrescenta uma secção. Diff lido: é documentação legítima do UTAC, coerente com o código.
- Nota de higiene: (a) o `CLAUDE.md` **não** faz parte do commit `1170b1f` (escopo do commit limpo ✅); (b) ficou **por commitar**; (c) declara **«FECHADO»** antes de existir veredicto do SEG3 — ver **V-7**.

## 2. Metodologia

- Sonda adversarial **própria**: `netlify/functions/_tests/_tmpv-utac105b2v.probe.mjs` (**temporária, APAGADA no fim**) — 28 observações. Duplos só nas fronteiras externas (`cotas-store`, `jwt`, `admin-auth`, `admin-helpers`, `rate-limiter`, `troco-senhas`, `@netlify/blobs`); o handler `cotas.mjs` corre a **sério**.
- **Mutadores próprios, fora do repo** (`C:/Users/Moltbot/tmp-utac105b2v/mutv.mjs` e `mutsurv.mjs`): escrevem no `cotas.mjs`, correm os 14 testes, **restauram sempre** (backup em memória + `finally` + handler de excepção). Restauro confirmado pelo md5 em cada execução.
- Leitura do código de produção: `cotas.mjs`, `_lib/cotas-store.mjs`, `_lib/validate.mjs`, `_lib/admin-auth.mjs`, `_lib/jwt.mjs`, `_lib/cota-ativacao.mjs`, `auth-user.mjs`, `src/pages/SejaNossoParceiro.jsx`.

### 2.1 Contratos medidos (base de toda a refutação)

| item | medido |
|---|---|
| `validarEndereco` (`validate.mjs:22`) | exige `typeof === "string"` e `/^0x[a-fA-F0-9]{40}$/`; devolve **`.toLowerCase()`**. Rejeita `0X…`, espaços, `%20`, arrays, objectos, números, booleanos |
| `resolverChamador` (`cotas.mjs:165`) | admin via `autenticarAdmin`; senão `Bearer ` (**case-sensitive**) → `verificarUserSession` → `{papel:"user", endereco: payload.endereco.toLowerCase()}`; senão `anon` |
| `verificarUserSession` (`jwt.mjs:78`) | HS256 com `JWT_SECRET` + claim `tipo`. **Único emissor** de `user-session`: `auth-user.mjs:94`, que exige **assinatura EIP-191** sobre `DESAFIOGUT-AUTH:<ts>:<endereco>` com `recovered === endereco` → **não é forjável** um JWT de utilizador para o endereço da vítima |
| `autenticarAdmin` (`admin-auth.mjs:162`) | só Bearer admin-JWT (HS256) + pertença à lista de admins → **não há caminho «ok sem endereço» forjável** |
| `getCota(id)` | `.eq("cliente_id", String(id))` — **match exacto** |
| `upsertCota(id, r)` | `colunas(id, r)` com `cliente_id: String(id)`; grava `endereco: r?.endereco ?? null`, `cnpj: r?.cnpj ?? null`, **`payload: r`** → **upsert substitui o registo inteiro** ⇒ confirma a premissa do defeito **e** a da Frente C |
| **quem escreve a coluna `endereco`** (grep de todos os `upsertCota` em `functions/`) | `cotas.mjs:483` (register), `:580` (update-corporativo), `:626` (POST genérico), `_lib/cota-ativacao.mjs:56` (activação, `k = endereco`). **Em nenhum caminho o valor de `endereco` pode divergir da chave `cliente_id`** ⇒ o ramo `vinculado` **não é forjável por escrita** |

## 3. Refutação — frente a frente (28/28 observações como esperado)

| # | tentativa de bypass | resultado medido | veredicto |
|---|---|---|---|
| A1 | `endereco` da vítima em **caixa mista** (anon) | **401**, sem escrita, cota intacta | neutralizado |
| A2 | `endereco` com **espaços** | **400 `endereco_invalido`**, sem escrita | neutralizado |
| A3 | `endereco` com **`%20`** | **400**, sem escrita | neutralizado |
| A4 | `endereco` como **array / objecto / número / booleano** | **400 `endereco_invalido`** nos 4, sem escrita | neutralizado |
| A5 | `Authorization` com esquema/caixa/espaço diferentes (`bearer`, `BEARER`, `Bearer  `, `Token`, sem esquema) | **401 nos 5** — a variante só **degrada para `anon`**, nunca promove | neutralizado |
| A6 | **sem `X-Visitor-ID`** | **400 `visitor_id_obrigatorio`**, sem escrita | neutralizado |
| A7 | **`__proto__` / `constructor`** no corpo (JSON) | vítima intacta; **`({}).endereco === undefined`** (sem poluição) | neutralizado |
| A8 | **utilizador autenticado alheio** a apontar para o `endereco` da vítima | **403**, sem escrita | neutralizado |
| A9 | utilizador alheio + **CNPJ da vítima** (chave `cnpj:`) | **409 `cnpj_duplicado`**, sem escrita | neutralizado |
| A10 | **admin** a apontar para a vítima | **201 e escreve** — excepção **(c)** declarada do MC89.38 | aceite (desenho) |
| A11 | **dono legítimo repete** o registo sobre a própria cota | **201 e DESTRÓI** (`categoria null`, `vendida false`, `valor 0`) | ⚠️ **V-1** |
| A12 | falha de leitura do store (fail-open?) | **502 `store_indisponivel`**, sem escrita | neutralizado (fail-closed) |
| A13 | anónimo a apontar para um endereço **sem cota** | **201 e CRIA** um registo nesse endereço | ℹ️ **V-3/V-4** |
| A13b | 2.º pedido idêntico | **401** → oráculo 201/401 confirmado | ℹ️ **V-3** |
| A14 | forçar o ramo **`vinculado`** com cota `cnpj:` sem `endereco` | **403 `endereco_nao_corresponde`**, sem escrita | neutralizado |
| A15 | Frente C sobre cota COM `endereco` | `endereco` **preservado** ✅ | corrigido |
| A15b/c | …mas `tipo`/`empresa`/`cnpj`/`email` **PERDIDOS** | `tipo=undefined` | **V-2** (F-1) |
| A16 | Frente C sobre cota **nova** | **201**, `endereco: null` — sem regressão | ok |
| A17 | após o POST genérico, o **dono** tenta `update-corporativo` | **404 `cota_nao_encontrada`** (tipo perdido) | **V-2** |
| B2/A8/A9 | matriz **409 vs guarda** (as 4 combinações de `endereco`/`cnpj` da vítima) | 409 quando o CNPJ está noutra chave; 401/403 quando a chave coincide — **nenhuma ordem permite escrita** | neutralizado |

### 3.1 Veredicto da frente 1 — **o P0 está fechado contra terceiros**

Não consegui fazer um pedido **anónimo** nem de **outro utilizador autenticado** sobrescrever, alterar ou destruir uma cota existente. As duas razões estruturais (não apenas empíricas):

1. **A chave do guard é a chave da escrita.** `getCota(clienteId)` e `upsertCota(clienteId, …)` usam a mesma `String(clienteId)` com match exacto ⇒ não há divergência de normalização que faça ler `null` e escrever numa linha existente.
2. **A prova de posse não é forjável.** O endereço do chamador vem do JWT (`user-session` só emitido com EIP-191 pelo `auth-user.mjs`; `admin-access` verificado contra a lista de admins). E a coluna `endereco` **nunca** pode ser escrita com valor diferente da chave em nenhum caminho ⇒ o ramo `vinculado` não é forjável.

### 3.2 Frente 4 — cadastro legítimo (confirmo o executor)

Leitura de `SejaNossoParceiro.jsx` (l.150-241): o submit faz **FASE B** `GET cotas?cnpj=…&empresa=…` **antes**; se `checkRes.ok` (CNPJ existe) o código **nunca chega** ao POST (vai para o painel, para «CNPJ já registrado em outra conta», ou para o OTP). O POST (FASE C) só corre quando o GET deu **404** e **não envia `accessToken` nem `endereco`** ⇒ `clienteId = "cnpj:…"`. Qualquer outro status do GET (429/500) lança e também não posta.
⇒ **O fluxo legítimo só cria cotas NOVAS; nunca faz POST sobre cota existente.** O executor está **certo**: a guarda não quebra o cadastro legítimo. Confirmado por leitura **e** pelos testes B3/B12.

## 4. Testes — vacuidade, mutantes e caminhos sem mutante

- **14/14 PASS** (medido por mim), `pass 14 / fail 0`, 175 ms, sem skip/todo.

### 4.1 Mutantes declarados pelo executor — **6/6 confirmados** (mutadores meus)

| mutação | pass/fail | vermelhos | declarado | confere |
|---|---|---|---|---|
| MA1 guarda neutrada (`if (false)`) | 9/5 | B1 B2 B7 B8 B10 | B1,B2,B7,B8,B10 | ✅ |
| MA2 `papel==="anon"` → `false` | 10/4 | B1 B2 B8 B10 | B1,B2,B8,B10 | ✅ |
| MA3 sem excepção de admin | 13/1 | B6 | B6 | ✅ |
| MA4 sem ramo (b) `vinculado` | 13/1 | B5 | B5 | ✅ |
| MA5 leitura do store fail-open | 13/1 | B9 | B9 | ✅ |
| MA6 Frente C não preserva `endereco` | 13/1 | C1 | C1 | ✅ |

### 4.2 Vacuidade — **não encontrei teste vazio no sentido estrito**

Todos os 8 testes que *alegam provar* a guarda/guarda-fail-closed/Frente C são **mortos** pela mutação correspondente (4.1). Os restantes (B3, B4, B6, B11, B12, C2) são **controlos** (o cadastro continua a funcionar, o 409 continua vivo) — legítimos.

**MAS há um teste que passa a *celebrar* o efeito errado:** **B4** («dono legítimo → 201») asserta `status 201` **e** `escreveu: true` e **não verifica o estado final da cota**. É exactamente o caminho do achado **V-1**: o dono destrói a própria cota paga e o teste aplaude a escrita. → **V-1/V-6**.

### 4.3 Caminhos SEM mutante (medido com mutadores meus — sobreviventes)

| mutação | resultado |
|---|---|
| MS1 `const idNorm = String(clienteId).toLowerCase()` → sem `toLowerCase` | **14/14 verdes — SOBREVIVE** |
| MS2 `String(existenteReg.endereco).toLowerCase()` → sem `toLowerCase` | **14/14 verdes — SOBREVIVE** |
| MS3 `getCota(clienteId)` → `getCota(String(clienteId))` | **14/14 verdes — SOBREVIVE** |
| MS4 ordem: neutralizar o 409 (`existenteCnpj = null`) | 13/1, vermelho **B11** — MORTO (ordem está coberta) |

⇒ As duas normalizações de caixa e o `String()` da chave de leitura são **defesa-em-profundidade não coberta por teste** (hoje são no-ops porque `validarEndereco` e `resolverChamador` já normalizam). Não é um defeito — é **cobertura incompleta** declarada em **V-5**.

## 5. Suíte

`node scripts/mc966-suite-harness.mjs ambos` (raiz do repo, **com TTY** — sem pty o harness responde «stdout is not a tty» e dá falso vermelho; com `| tail` também quebra o TTY):

```
frontend: VERDE 535/535 pass
backend:  VERDE 945/951 pass
VEREDITO: VERDE
```

**Medido por mim.** Sem regressão: o baseline declarado pelo SEG-1 (no `966a587`) era `535/535` + `931/937`; o backend subiu **exactamente +14** (931→**945** pass, 937→**951** total) = os 14 testes novos a passar. As **6 falhas** do backend são **pré-existentes** do baseline (não introduzidas por este commit; o harness classifica o conjunto como VERDE).

## 6. Achados

### ⚠️ V-1 (GRAVE) — o dono legítimo DESTRÓI a própria cota ao repetir o registo; o teste B4 esconde-o
**Medido (A11):** `POST register-corporativo` com `endereco = 0xaabb…ccdd` (o próprio, com JWT válido do mesmo endereço) sobre uma cota existente `ouro / vendida:true / valor:55000` → **201** e a cota passa a `categoria:null, vendida:false, valor:0, empresa:"Empresa Nova"`. O `troco`/`categoria` paga desaparecem.
**Porque é um achado e não uma confirmação:** o executor decidiu «401 sem escrita» porque *«sem prova de posse não se distingue repetição de ataque»* (SEG-1 §-1.7). Isso é **verdadeiro para o anónimo** — mas o mesmo caminho serve o **dono comprovado** (`ehProprio`/`vinculado`/admin), onde a prova **existe** e o pedido é, pela letra do SEG0 §0.3, uma **repetição** → devia ser **idempotente (200/201 sem alterar o pagamento)**, não um *reset* à cota. A decisão declarada fica, assim, internamente inconsistente: recusa o 200 ao anónimo (bem) mas escreve-o para o dono (mal).
**Alcance:** o frontend actual **não** tem este caminho (FASE B trava antes — §3.2), portanto **não é regressão** e **não reabre o P0**. Mas o próprio ficheiro documenta o modo «cadastro autenticado (logado): `cliente_id = endereco`» (l.366-367) e qualquer cliente de API (ou uma futura alteração do frontend) entra nisto.
**Tratamento proposto:** quando `existenteReg` existe **e** o chamador é autorizado (não-`anon`), **(i)** devolver `200` com o registo existente **sem escrever**, ou **(ii)** fundir preservando `categoria, vendida, disponivel, valor, tipo, cnpj, email, pedidoId, cadastradoEm`. Não há risco de privacidade porque só o dono comprovado chega aqui (o anónimo já é recusado). Acrescentar o teste **B13** («dono repete → 200 e cota intacta»), que mata a mutação de reescrita.

### ⚠️ V-2 (GRAVE-escopo) — a Frente C preserva `endereco` mas **não** cumpre o objectivo declarado
**Medido (A15b/A17):** o POST genérico de admin sobre uma cota corporativa continua a **apagar `tipo`, `empresa`, `cnpj` e `email`** do payload (`tipo=undefined`); em consequência, o **dono legítimo leva 404 `cota_nao_encontrada`** no `update-corporativo` (que exige `existente.tipo === "corporativo"`).
O comentário da correcção justifica-se com *«como o ramo (b) do MC89.38 depende dela [da coluna `endereco`]»*: a premissa é correcta para o **guard do register** (que só lê `endereco`), mas o objectivo maior — **não partir o vínculo do dono** — **não é atingido**, porque perdeu-se o `tipo`.
**É pré-existente (F-1, declarado fora do escopo)?** Sim, a destruição do resto do payload é pré-existente. Mas o achado aqui é: **a Frente C, como está, não resolve o problema que declara resolver.**
**Tratamento proposto:** reescrever o registo como `{ ...existente, …camposEditados }` em vez de o reconstruir de zero (1 linha muda para ~1 linha bem posta); mínimamente `tipo: existente?.tipo ?? null,`. Junto com isso, o caso F-1 fecha-se de vez.

### ℹ️ V-3 — oráculo de existência 401-vs-201 (**veredicto que o executor pediu: NÃO é motivo para REFUTAR**)
Medido (A13/A13b): cota inexistente → **201**; cota existente + anónimo → **401** ⇒ um anónimo distingue, e no ramo 201 **pré-cria** um registo no `endereco` indicado.
**Comparação com o `409 cnpj_duplicado` (MC12.3, pré-existente):**
- o 409 revela *«este CNPJ está registado»* — CNPJ é dado público; é o **gate de cadastro desenhado**;
- o novo 401 revela *«esta carteira tem cota corporativa»* — associação carteira↔qualidade de parceiro, **sem PII** (nem email nem empresa), limitada por rate-limit **5/min** (`cotas-register`) + **1 CNPJ/24h por visitorId**.
- A alternativa pedida pelo SEG0 («200 idempotente») seria **pior**: ou devolve o registo existente a um anónimo — violando o MC87 (P0-1) — ou destrói. O executor tem razão em recusá-la.
⇒ **É o mesmo trade-off já aceite** em `update-corporativo` (401/403) e em `?cnpj=` (409/404): não é novo, não é pior de forma material, e é o mínimo de informação compatível com o MC87. **Aceito; não refuta.** Tratamento: registar em `R18-x` e, se se quiser apertar, contar o rate-limit por `cliente_id`-alvo em vez de só por IP.

### ℹ️ V-4 — a pré-criação anónima pode poluir a cota futura da vítima
Medido (A13): um anónimo cria um registo COMPLETO (`empresa`, `email`, `cnpj`, …) no `endereco` de outra pessoa que ainda não tem cota. Se essa pessoa **activar** depois a cota paga no mesmo endereço, o `ativarCotaPaga` funde `...existente` e **herda** os campos do atacante (`empresa`/`email`/`cnpj`), e o `getCotaByCnpj` passa a devolver essa linha.
**Impacto:** poluição de dados/aparência (não é privilégio, não destrói nada). **Tratamento proposto:** no `register-corporativo`, se o chamador for **anónimo**, não aceitar `endereco` no corpo para **criação** (só permitir `cnpj:…`) — o fluxo legítimo nunca envia `endereco` (§3.2); ou, na fusão da activação, ignorar os campos de origem anónima.

### ℹ️ V-5 — cobertura de testes incompleta (mutantes sobreviventes + fronteiras sem teste)
- **MS1/MS2/MS3 sobrevivem** (§4.3): as normalizações de caixa e o `String()` da chave de leitura **não** são cobertas. Hoje são no-ops, mas são o cinto-e-suspensórios que impede a reabertura do P0 por caixa mista se `validarEndereco`/`resolverChamador` mudarem um dia.
- **A1-A7** (caixa, espaços, `%20`, tipos, esquema de `Authorization`, ausência de `X-Visitor-ID`, `__proto__`) são **fail-closed hoje mas não têm teste** — regressões baratas de introduzir.
**Tratamento proposto:** acrescentar os testes de fronteira A1-A7 e um teste que force o caminho da normalização (ex.: cota semeada com `cliente_id` em maiúsculas + JWT em minúsculas), matando MS1/MS2.

### ℹ️ V-6 — B4 é um teste que aplaude a escrita destructiva
Ver V-1. B4 não tem mutante que o mate e asserta `escreveu:true` sem olhar ao estado final. **Tratamento:** reformular B4 para (a) `200/201` **e** (b) `categoria/vendida/valor` intactos — o que, feito o tratamento de V-1, passa a ser um teste que **morde**.

### ℹ️ V-7 — o `CLAUDE.md` já declara «FECHADO» e está por commitar
O executor actualizou o `CLAUDE.md` (mtime 01:03, **depois** do commit) a declarar o UTAC105b.2 **«FECHADO»**, ainda sem o veredicto do SEG3 (este documento) — e deixou-o **fora do commit**. Não é um defeito de segurança; é higiene de registo: a alegação «FECHADO» passa a valer o que este validador diz (**APROVADO COM RESSALVAS**, com V-1/V-2 abertos).
**Tratamento proposto:** commitar o `CLAUDE.md` (ou removê-lo do working tree) e corrigir a palavra «FECHADO» para «fechado o P0 de terceiros; V-1/V-2 residuais» — ou fechar V-1/V-2 antes. O `package-lock.json` modificado deve ser decidido (commit ou `git checkout`).

### Confirmações de achados alheios (para não os tratar como falhas do executor)
- **F-1 confirmado** (A15b/A17): o POST genérico destrói `tipo/empresa/segmento/site/logoUrl/origem/cadastradoEm`. **Pré-existente**, declarado fora do escopo — mas ver V-2 (a Frente C não fecha o seu próprio objectivo sem isto).
- **Erros já corrigidos e declarados pelo executor** (PoC pegajoso, 2 testes com setup inválido/409 a mascarar o ramo (b), status 200 inventado no C2, fronteira do troco em falta): **confirmei os estados finais** — C2 devolve mesmo **201** (medido, A16), o setup do B5 isola mesmo o ramo (b) (medido: com a cota da vítima também no mapa o resultado seria 409), e o duplo do troco está presente. Nada a reabrir.
- **Ordem 409 → guarda → upsert**: confirmada; MS4 mostra que a ordem está coberta (B11 morre).

## 7. Veredicto

**APROVADO COM RESSALVAS.**

O P0 (destruição de cota alheia por pedido anónimo) **está fechado**: 28/28 tentativas de bypass falharam, com duas razões **estruturais** (chave do guard == chave da escrita; prova de posse não forjável) e não apenas empíricas. O cadastro legítimo **não** quebra (§3.2) e a suíte está **verde sem regressão**. A decisão de devolver 401/403 em vez do 200 idempotente é **defensável** e o oráculo 401-vs-201 **não** é motivo para refutar (V-3).

**Ressalvas que impedem o «APROVADO» limpo:** V-1 (o dono comprovado continua a poder destruir a própria cota paga — e o teste B4 aplaude-o) e V-2 (a Frente C não cumpre o objectivo que declara, porque o POST genérico continua a apagar `tipo` e o dono leva 404 no `update-corporativo`). Ambas são **residuais/pré-existentes** e **não reabrem o P0**; nenhuma exige reverter o commit.

**Lista de achados:**
- ⚠️ **V-1** — dono legítimo que repete o registo → 201 e destrói a própria cota (`categoria/vendida/valor`); B4 não detecta. *Tratamento:* escrita idempotente/fusão preservando o pagamento quando há prova de posse + teste B13.
- ⚠️ **V-2** — a Frente C preserva `endereco` mas perde `tipo` → `update-corporativo` continua a dar **404 ao dono** (objectivo declarado não atingido). *Tratamento:* `{...existente, …camposEditados}` (ou, mínimamente, `tipo`).
- ℹ️ **V-3** — oráculo 401-vs-201; **aceito**, equivalente ao 409 pré-existente, sem PII. *Tratamento:* registar em `R18-x`; opcional rate-limit por alvo.
- ℹ️ **V-4** — anónimo pré-cria/polui uma cota futura no endereço da vítima. *Tratamento:* recusar `endereco` no corpo para anónimos, ou ignorar campos anónimos na fusão da activação.
- ℹ️ **V-5** — cobertura incompleta: MS1/MS2/MS3 sobrevivem (normalizações/`String()` sem mutante) e as fronteiras A1-A7 não têm teste. *Tratamento:* acrescentar testes de fronteira + teste de normalização.
- ℹ️ **V-6** — B4 aplaude a escrita destructiva (sem mutante que o mate). *Tratamento:* assertar o estado final.
- ℹ️ **V-7** — `CLAUDE.md` (fora do commit) já declara o UTAC «**FECHADO**» e ficou por commitar, antes deste veredicto. *Tratamento:* commitar/decidir e qualificar a palavra «FECHADO»; decidir o `package-lock.json` modificado.
- ℹ️ **F-1 confirmado** (pré-existente, declarado fora do escopo) — ver V-2.

---

### Anexo — artefactos

- Sonda: `desafio-gut/frontend/netlify/functions/_tests/_tmpv-utac105b2v.probe.mjs` (**APAGADA** no fim).
- Mutadores (fora do repo): `C:/Users/Moltbot/tmp-utac105b2v/mutv.mjs`, `mutsurv.mjs`, backup `cotas.mjs.bak`.
- md5 do `cotas.mjs` após todas as experiências: `c5368150cc04b871f0f0e417d5a85de7` (= esperado).
