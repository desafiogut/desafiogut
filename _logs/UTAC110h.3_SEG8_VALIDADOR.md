# UTAC110h.3 — SEG-8 · VALIDADOR ADVERSARIAL (DesafioGUT)

> **Papel:** validador independente. Objectivo: **REFUTAR** cada alegação do UTAC110h.3. Tudo o que se segue
> foi medido dentro do worktree de validação; nada foi escrito em `C:/Users/Moltbot/Desktop/DESAFIOGUT`,
> nada foi deployado, nenhuma migração foi aplicada, **nenhuma transacção on-chain foi executada**.

## 0. Ambiente e método

| item | valor |
|---|---|
| Worktree | `C:/Users/Moltbot/tmp-utac110h3-val/wt` (Junctions de `node_modules` preservadas, regra A13) |
| HEAD validado | `3d72419d2b66b21c199a4673d7d313729f58fd46` (`3d72419`) — **detached HEAD** |
| Baseline | `9117402` |
| Suíte canónica | `cd .../wt && node scripts/mc966-suite-harness.mjs ambos` |
| Diff | 27 ficheiros, `+826 −32` (20 produção, 3 testes novos, 1 stub novo, 2 `_logs` novos) |

Prova de que o worktree ficou imaculado depois de todas as mutações:

```
$ git status --porcelain
(vazio)
```

---

## 1. VEREDICTO

# ✅ APROVADO COM RESSALVAS

**Nenhuma das 8 alegações foi refutada.** Todas as tentativas de refutação dirigidas falharam — as 8 frentes
sustentam-se no código entregue, na suíte canónica e nos 15 mutantes do autor (**15/15 PROVADOS**, reproduzidos
por mim). As ressalvas são de **teste/guarda e de risco financeiro declarado**, não de falsidade da alegação:

| # | ressalva | gravidade |
|---|---|---|
| ⚠️-1 | **P5 reactiva gas REAL em mainnet no caminho do REGISTO e altera o MOMENTO e a QUOTA do bónus** (não é só «o bónus volta a disparar»): 2 transacções por indicação confirmada **e** uma indicação feita quando o indicador já está no limite mensal passa a queimar o bónus on-chain daquele indicado **para sempre** (o marcador `referral-convertido` é gravado na mesma e o caminho do `comprar-senhas` fica no-op idempotente). A autorização do operador (`R18-110h.3-5`) só consta do documento **do próprio autor** — não há artefacto independente dela neste commit. | **grave** |
| ⚠️-2 | **A «fonte única» do contador (P1) é verdadeira no código, mas não está amarrada por teste nenhum**: o meu mutante de divergência (UI com derivação própria, servidor a recortar o mês) **sobrevive à suíte canónica completa** (1108/1108 + 1253/1259). Uma regressão futura que reintroduza a duplicação passa verde. | **média** |
| ℹ️ | A guarda do P3 tem dois pontos cegos medidos: (a) só varre os 14 ficheiros da lista — «torneio» visível introduzido **fora** da lista sobrevive à suíte completa; (b) o token regex é `[Tt]orneio`, logo `TORNEIO` maiúsculo sobrevive. | nota |
| ℹ️ | «Senhas creditadas» sobrevive em **2 documentos** (não em código): `CLAUDE_DEBUG.md:884` e `desafio-gut/docs/runbook-credito-pendente.md:42`. | nota |
| ℹ️ | Frente G: o comentário de expectativa da consulta 6 («service_role + **leitura do titular**») **não corresponde à migração** — a migração `20261014_utac110e_eco_quildo.sql` **não cria policy nenhuma para o titular** (só `service_role`, com `REVOKE` a `anon/authenticated`). O SQL não está errado; a expectativa escrita ao lado dele está. | nota |
| ℹ️ | As DEBT-025/028/029 estão fechadas **no working tree do repo principal, NÃO COMMITADAS**; o commit `3d72419` sozinho entrega-as ainda «aberta» no `_logs/DEBT.md`. | nota |
| ℹ️ | Fuga de grafo social **pré-existente** (não é deste commit): `referral.mjs:193` loga `indicado`/`indicador` **reais** no `console.log("[MC17.4.2] usar-codigo resultado")`. Medido idêntico no baseline `9117402`. | nota |

---

## 2. TABELA DAS 8 ALEGAÇÕES

| # | alegação | tentativa de refutação | resultado | veredicto |
|---|---|---|---|---|
| **P1** | contador de indicações do mês (DEBT-028), fonte única, aditivo+fail-soft, «Este mês: X / 10» | contar o crédito do indicado / meses anteriores / UI inventar número / remover campos antigos | todas falharam (mutantes P1a–P1e do autor **e** o meu M2 MORDEM) | **CONFIRMADA** (ressalva ⚠️-2) |
| **P2** | relatório admin deixou de dizer «Senhas creditadas», campo `senhasCreditadas` mantém-se | sobrar ocorrência em texto de produção / campo removido / e2e enfraquecido | falharam: 0 ocorrências em código; campo intacto; e2e **byte-idêntico** | **CONFIRMADA** |
| **P3** | 20 substituições em 14 ficheiros; chaves/histórico intactos | sobrar vocabulário visível (GUTO incluído) / ter mexido em chaves / anotações apagadas | falharam: só chaves/identificadores/comentários; anotações presentes | **CONFIRMADA** |
| **P4** | data → «15 de outubro de 2026»; a antiga desapareceu | — | `15 de agosto de 2026` só aparece em ficheiros de teste (como asserção/âncora de mutação) | **CONFIRMADA** |
| **P5** | endpoint deixou de mascarar ARGUMENTOS; bónus on-chain volta a disparar; máscara fica no log | bónus continuar morto / **alarme de gas** / máscara removida do log / `_lib/referral.mjs` mexido indevidamente / marcador e limite alterados | falharam: 2 créditos com endereços reais; **nenhum teste toca a rede** (provado); log continua a mascarar | **CONFIRMADA** (ressalva ⚠️-1) |
| **F** | `Boot.jsx` tem teste de comportamento (6 estados + controlo + import dinâmico) | teste vácuo / estados não correspondem / Boot com import estático | falharam: 2 mutantes meus (Boot sempre-gate e Privy estático) MORDEM | **CONFIRMADA** |
| **Escopo** | docs/contrato/env/`recursos-app-config.mjs` intocados | tocar fora do escopo | diff vazio + conteúdo idêntico (md5 sem CR) | **CONFIRMADA** |
| **Frente G** | SQL só-leitura e coerente com a migração | SQL de escrita / tabelas inexistentes / Hermes correu SQL | sem escrita; nomes/colunas/constraints conferem; sem indício de execução | **CONFIRMADA** (ℹ️ no comentário) |

---

## 3. PROVAS POR ALEGAÇÃO

### 3.1 Suíte canónica (ponto de partida)

```
$ cd C:/Users/Moltbot/tmp-utac110h3-val/wt && node scripts/mc966-suite-harness.mjs ambos
frontend: VERDE 1108/1108 pass
backend: VERDE 1253/1259 pass
VEREDITO: VERDE
```

Baseline `9117402` (mesmo comando, worktree checkado no baseline):

```
frontend: VERDE 1092/1092 pass
backend: VERDE 1247/1253 pass
VEREDITO: VERDE
```

Backend detalhado nos dois pontos — **skips idênticos**, logo nada foi desactivado:

```
HEAD 3d72419:  ℹ tests 1259  ℹ pass 1253  ℹ fail 0  ℹ skipped 6  ℹ todo 0
base 9117402:  ℹ tests 1253  ℹ pass 1247  ℹ fail 0  ℹ skipped 6  ℹ todo 0
```

Testes dirigidos (saída literal):

```
$ cd .../netlify/functions && node --test --experimental-test-module-mocks _tests/utac110h3-pendencias.test.mjs
ℹ tests 6   ℹ pass 6   ℹ fail 0   ℹ skipped 0

$ cd .../frontend && node --test --test-concurrency=1 \
    src/__tests__/utac110h3-pendencias-front.test.mjs src/__tests__/utac110h3-boot-comportamento.test.mjs
ℹ tests 16  ℹ pass 16  ℹ fail 0  ℹ skipped 0

$ cd .../netlify/functions && node _tests/utac110h3-prova-mutacao.mjs
✓ PROVADO P1a … P1b … (15 linhas) …
15/15 PROVADOS
```

(Reprodução **integral** dos 15: `✓ PROVADO` em todos, `restauro md5 idêntico` em todos, `15/15 PROVADOS`.)

### 3.2 P1 — contador do mês (DEBT-028)

**Fonte única — medida por grep, não por fé:**

```
$ grep -n "indicacoesDoMes" netlify/functions/_lib/fontes-lance.mjs netlify/functions/ler-pontos.mjs
_lib/fontes-lance.mjs:113:export function indicacoesDoMes(registo, agora = new Date()) {
_lib/fontes-lance.mjs:204:    const noMes = indicacoesDoMes({ historico_lance: historicoA }, agora).creditadas;
ler-pontos.mjs:23:import { missoesDoRegisto, indicacoesDoMes, … } from "./_lib/fontes-lance.mjs";
ler-pontos.mjs:44:    return indicacoesDoMes(registo);
```

O servidor (`creditarIndicacao`, que aplica `LIMITE_INDICACOES_MES`) e a UI (`ler-pontos`) chamam **a mesma
função** — a filtragem inline do limite foi substituída pela chamada (`git diff`, `-` as 3 linhas antigas,
`+` `indicacoesDoMes(...)`). **Mesma fonte de DADOS** também confirmada: `lerLedgerLance`
(`_lib/ledger-lance.mjs`) e `lerPontos` (`_lib/passe-pontos.mjs`) leem a **mesma linha** de `pontos`
(`select("*")` → `historico_lance`); o teste de endpoint prova-o empiricamente (`creditadas` 0 → 1 depois de
uma indicação real criada pelo endpoint).

**Refutações tentadas — todas falharam:**

| tentativa | prova de que falhou |
|---|---|
| contar o crédito do INDICADO (`indicacao-recebida`) | unitário do autor inclui essa entrada e exige **2**, não 3 → `assert.deepEqual(r, { mes: "2026-10", creditadas: 2, limite: 10 })`; mutante **P1b** (`"indicacao:"` → `"indicacao"`) → `fail=2` |
| contar meses anteriores | unitário tem entrada `2026-09-30` no mês anterior → excluída; mutante **P1a** (perde o recorte UTC) → `fail=1` |
| UI inventar número quando o endpoint falha | teste `P1 fail-soft` passa; **o meu mutante M2** (`?? { creditadas: 0, limite: 10 }`) → **MORDE** (`fail=1`) |
| campos antigos do `ler-pontos` removidos | diff só acrescenta (`+ indicacoesMes`); teste exige `ok, pontos, pontosCartao, fidelidade, lance, missoesHoje, palpites` presentes |
| contador sem recorte no painel | render real em 0/5/10 com os **hooks reais** (`_hook-runner`) + stub de `api.js` — e o stub está mesmo a ser usado (se o `api.js` real corresse, `ler-pontos` iria à rede e os 3 testes de contador falhavam) |

### 3.3 P2 — vocabulário do relatório admin

```
$ grep -rn "Senhas creditadas" --include=*.mjs --include=*.js --include=*.jsx .
(apenas: ficheiros de teste + 2 docs — nenhum texto de produção)

$ grep -rn "senhasCreditadas" --include=*.mjs .
notificacoes.mjs:163:  dados: { dia: rel.dia, totalConversoes: rel.totalConversoes, senhasCreditadas: rel.senhasCreditadas },
_lib/referral.mjs:272:  return { dia, totalConversoes, senhasCreditadas, … };
_tests/test-conversao-e2e-mc1581.mjs:102:  assert.equal(rel.senhasCreditadas, 4); // (indicado +1 + indicador +1) x2
```

- O texto passou a `` `Recompensas on-chain creditadas: ${senhasCreditadas}. ` `` (`_lib/referral.mjs:267`).
- **O teste antigo não foi enfraquecido**: `_tests/test-conversao-e2e-mc1581.mjs` **não aparece** em
  `git diff --name-status 9117402..3d72419` — está byte-idêntico, e a sua asserção (`=== 4`) continua a passar.
- Mutantes do autor **P2a/P2b** → `fail=1` cada.

### 3.4 P3 — «torneio»

Contagem: `git diff` mostra exactamente **20 substituições em 14 ficheiros de produção** — coincide com a
lista `FICHEIROS_P3` do teste novo. Ocorrências remanescentes, classificadas por grep:

```
$ grep -rn "torneio" -i netlify/functions/_lib/recursos-app-config.mjs \
    netlify/functions/_lib/worker-bonus.mjs netlify/functions/_lib/pontuacao-utils.mjs \
    src/components/meus-ativos/ProgressoBonus.jsx src/hooks/useRecursosApp.js src/pages/MeusAtivos.jsx
_lib/recursos-app-config.mjs:29:  isTorneioVisivel:         true,                       ← CHAVE (HI9)
_lib/worker-bonus.mjs:16:// … documentada em docs/TORNEIO-HABILIDADE.md §4c.        ← nome de DOCUMENTO
_lib/pontuacao-utils.mjs:27: * … Ver docs/TORNEIO-HABILIDADE.md §Lacunas:            ← nome de DOCUMENTO
src/components/meus-ativos/ProgressoBonus.jsx:15,93: `PainelTorneio.jsx` / `PainelTorneio`  ← IDENTIFICADOR
src/hooks/useRecursosApp.js:34:  isTorneioVisivel:         true,                      ← CHAVE (HI9)
src/pages/MeusAtivos.jsx:12,188: import/JSX <PainelTorneio>                          ← IDENTIFICADOR
```

- **HI9 intacto**: `isTorneioVisivel` (config + hook), `ativos.torneio.*` (**9 chaves** em `src/i18n/pt.js`, os
  **valores** dizem «Competição»), `data-secao="painel-torneio"` (**5 ocorrências**) — todos inalterados
  (o diff da `PainelTorneio.jsx` é **uma linha de comentário**).
- **Anotações históricas preservadas** (`guto-perfis.mjs`):
  ```
  $ sed -n '84p;109p;200p' netlify/functions/_lib/guto-perfis.mjs
  // ⭐ UTAC110c-1: o texto interior passou a Via B — saíram «torneio» e «senhas» (modelo antigo,
  // ANTIGO — «torneio de habilidade», «Portaria SPA/MF 1.207/2024» — que o NORTE DO PRODUTO
  // FACTOS: «base legal: torneio de habilidade nos termos da Portaria SPA/MF nº 1.207/2024»,
  ```
  e o ficheiro **não** está no diff (intocado).
- **GUTO não tem vocabulário visível com «torneio»**: `grep -rni torneio netlify/functions/_lib/guto*.mjs`
  devolve só as 3 anotações acima (comentários); `guto-regulamento.mjs` → zero.
- Consumidores das chaves intactos: `useRecursosApp.test.mjs` + `ativos-i18n.test.mjs` → **18/18 pass**.
- Mutantes do autor **P3a** (`fail=1`) e os meus **M3c** («Torneio de habilidade» visível num dos 14) e **M3d**
  (valor da i18n) → **MORDEM**.

### 3.5 P4 — data da Privacidade

```
$ grep -rn "15 de outubro de 2026" src/pages/Privacidade.jsx
src/pages/Privacidade.jsx:45:  Última atualização: 15 de outubro de 2026

$ grep -rn "15 de agosto de 2026" --include=*.jsx --include=*.js --include=*.mjs .   # (HEAD)
_tests/utac110h3-prova-mutacao.mjs:60  (âncora de mutação)
src/__tests__/utac110h3-pendencias-front.test.mjs:124  (asserção doesNotMatch)
```

Ou seja: **em código de produção a data antiga desapareceu**; sobrevive só onde é *prova* (âncora do mutante e
asserção negativa). Mutante do autor **P4a** → `fail=1`.

### 3.6 P5 — DEBT-025 (frente com risco de dinheiro)

**A refutação «o bónus continua morto» FALHOU.** Cadeia medida:

```
referral.mjs:163  conversao = await registrarConversao(
                    { codigo, indicador: r.indicador, indicado: endereco }, …)   ← endereços REAIS
_lib/referral.mjs:565  concederBonus(indicador)
_lib/referral.mjs:476  if (!/^0x[a-f0-9]{40}$/.test(enderecoLower)) → endereco_invalido
_lib/referral.mjs:487  creditarSenhas(enderecoLower, 1)  +  :592 creditarSenhas(indicado, 1)
```

Teste do autor (contrato **espiado**): `assert.deepEqual(creditos, [{ endereco: A, qtd: 1 }, { endereco: B, qtd: 1 }])`
— **2 créditos, endereços verdadeiros**. Prova bidirecional: com os endereços mascarados
(`{ indicador: "0xaaaa…aaaa", indicado: "0xbbbb…bbbb" }`) → `[conv.ok, conv.code] = [false, "endereco_invalido"]`
e `creditos = []`. Mutantes do autor **P5a/P5b/P5c** → `fail=1` cada.

**(b) ALARME DE GAS — nenhum teste toca a rede. Confirmado por 3 vias:**

1. `_lib/contract.mjs` é substituído por duplo nos **3** ficheiros de teste novos
   (`mock.module("../_lib/contract.mjs", …)`) e em `utac110f-referral`, `utac110h2-eco-indicacao`,
   `mc1741-referral-ip-throttle`.
2. **Experimental (a prova que vale):** com um `RPC_URL` a apontar para destino morto (o que faria
   `ensureEnv()` passar e forçaria qualquer chamada **não mockada** a ir à rede e falhar), os testes do
   caminho de referência continuam **verdes**:
   ```
   $ RPC_URL="http://127.0.0.1:9" COORDENACAO_PRIVATE_KEY="0x…" \
       node --test --experimental-test-module-mocks _tests/utac110h3-pendencias.test.mjs
   ℹ tests 6   ℹ pass 6   ℹ fail 0
   $ RPC_URL="http://127.0.0.1:9" node --test --experimental-test-module-mocks \
       _tests/utac110f-referral.test.mjs _tests/utac110h2-eco-indicacao.test.mjs _tests/mc1741-referral-ip-throttle.test.mjs
   ℹ tests 20  ℹ pass 20  ℹ fail 0
   ```
3. Segunda barreira no ambiente: **`RPC_URL` não existe** no harness (`echo "[$RPC_URL]"` → `[]`) e o único
   `.env` presente é `.env.example`, logo `ensureEnv()` (`_lib/contract.mjs:60`) lançaria
   `"RPC_URL não configurado"` **antes** de qualquer provider existir.

**(c) máscara no LOG — intacta:** `referral.mjs:158` continua `console.log("[MC17.5.1] T5 …", { codigo,
indicador: mascararEndereco(r.indicador), indicado: mascararEndereco(endereco) })` (linha **não** tocada —
o diff começa na linha 160) e `:110` mantém `mascararEndereco`. O commit **removeu os endereços mascarados dos
DADOS**, que era o bug; não removeu o mascaramento do log.

**(d) `_lib/referral.mjs` — tocado só onde devia:** o diff do ficheiro tem **7 linhas**, todas no bloco do P2
(docstring `:229-232` e as 3 linhas do texto `:241-244`, `:267`). Nenhuma alteração de lógica.
⚠️ Nota: a linha 6 do cabeçalho continua a dizer *«DEBT-025: morto no caminho do endpoint»* — **comentário
obsoleto** que o próprio P5 acabou de invalidar (é justamente no endpoint que ele passou a viver).

**(e) efeitos colaterais — medidos por leitura do código (não medidos on-chain):** ver ⚠️-1 na §4.

### 3.7 F — `Boot.jsx`

- `src/Boot.jsx` **não está no diff** — o que a frente F entregou é **um teste novo**, não uma alteração.
  O import continua dinâmico: `const PrivyRoot = lazy(() => import("./PrivyRoot.jsx"));` (`:19`).
- O teste **não é vácuo** (mutantes meus):
  - **M5** `carregarApp = true` (nunca mostra o gate) → **MORDE** (`fail=5`);
  - **M4** import **estático** do Privy → **MORDE** (`fail=1`) — o controlo do `import()` dinâmico funciona;
  - mutantes do autor **F1** (`fail=3`), **F2** (`fail=2`), **F3** (`fail=1`).
- O controlo positivo (`temGate`) é exigido nos dois sentidos (ESTADO 1 exige gate presente; ESTADO 2 exige
  ausente) → não pode passar com o gate sempre visível nem sempre escondido.

### 3.8 Escopo — docs / contrato / env / config

```
$ git diff --name-only 9117402..3d72419 -- docs/ 'desafio-gut/contracts' \
    'desafio-gut/frontend/netlify/functions/contract.mjs' 'desafio-gut/**/ignition' \
    desafio-gut/frontend/netlify/functions/_lib/recursos-app-config.mjs
(vazio)
```

Conteúdo comparado com o repo principal (`md5`, removendo `\r` — o worktree tem CRLF nalguns ficheiros e o
repo principal LF, o que produz **falso positivo** num md5 cru; medido e descartado):

| ficheiro | md5 cru | md5 sem CR |
|---|---|---|
| `docs/REGULAMENTO-v5.md` | igual | igual |
| `docs/GUTO-REGULAMENTO.md` | igual | igual |
| `docs/regras-oficiais.md` | igual | igual |
| `desafio-gut/contracts/Leilao.sol` | igual | igual |
| `…/_lib/contract.mjs` | **diferente** (CRLF) | **igual** |
| `…/_lib/signer.mjs`, `…/_lib/meta.mjs` | **diferente** (CRLF) | **igual** |
| `…/_lib/recursos-app-config.mjs` | **diferente** (CRLF) | **igual** |

Sem variáveis de ambiente novas em produção (as únicas `process.env` do diff são **do teste**:
`+process.env.JWT_SECRET = "segredo-de-teste-…"` e `+delete process.env.REFERRAL_ATIVO`). Nenhum ficheiro sob
`supabase/migrations/` tocado. `EM_BREVE_MODE` não aparece no diff.

### 3.9 Frente G — `_logs/UTAC110h.3_VERIFICACAO-P6.sql`

- **Só leitura.** `grep -inE "insert|update|delete|alter|drop|truncate|create|grant|revoke|exec|call |merge|copy "`:
  **1 única linha**, e é um COMENTÁRIO — `69: -- • (3) devolve linhas ⇒ os contadores divergiram: NÃO corrigir à
  mão com UPDATE.` As consultas são **7 `SELECT`**.
- **Coerência com `20261014_utac110e_eco_quildo.sql`** (migração **pré-existente**, de `193036c`, não tocada):
  tabelas `eco_quildo`/`eco_quildo_lastro` ✓; colunas `id, total_emitido, total_usado, reserva_rs_centavos` ✓;
  a identidade `reserva_rs_centavos = (total_emitido − total_usado) × 100` ✓ (é literalmente o texto da
  migração); `ENABLE ROW LEVEL SECURITY` ✓; policies `service_role total eco_quildo[_lastro]` ✓; CHECKs
  (`saldo >= 0`, `jsonb_typeof(historico) = 'array'`, `id = 1`, contadores `>= 0`) ✓.
- **Não corri SQL nenhum** e não há indício de execução: o ficheiro vive em `_logs/`, **não** em
  `supabase/migrations/`, e o commit não acrescenta migração nem toca em nenhuma.
- ℹ️ Defeito de *documentação*: a expectativa da consulta 6 diz «as da migração (service_role + leitura do
  titular)», mas a migração **não cria policy de leitura do titular** — diz explicitamente «Nenhuma policy para
  `anon`/`authenticated`» e faz `REVOKE ALL … FROM PUBLIC, anon, authenticated`. Quem ler o guião espera uma
  policy que não existe.

---

## 4. ACHADOS

### ⚠️-1 — P5 muda o MOMENTO e a QUOTA do bónus, além de reactivar o gas (grave)

Reprodução (leitura de código + o teste do autor com o contrato espiado):

```
referral.mjs:163        registrarConversao({ codigo, indicador: r.indicador, indicado: endereco })   ← registo
_lib/referral.mjs:565   concederBonus(indicador)                     → creditarSenhas(indicador, 1)   [TX 1]
_lib/referral.mjs:592   creditarSenhas(indicado, 1)                                                    [TX 2]
_lib/referral.mjs:570   chaveConv = `referral-convertido:${codigo}:${indicado}`  → setJSON(...)  (marcador GRAVADO)
_lib/referral.mjs:568   `if (ja) return { ok: true, idempotent: true }`
```

Consequências **não declaradas** no entregável:

1. **Custo**: cada indicação confirmada no registo passa a submeter **2 transacções reais** na rede
   configurada (mainnet desde o MC60), pagas pela coordenação. O autor **declara** o risco (CONFLITO 2 do
   SEG-1 e DEBT-025), mas a autorização «`R18-110h.3-5`» só aparece **no documento do próprio autor** — não há,
   neste commit, artefacto independente da decisão do operador. Como a §11-E4 mandava **PARAR e reportar** «se
   o custo for significativo», o mínimo é que o operador confirme por escrito.
2. **Momento**: antes do P5 o bónus disparava no **`comprar-senhas`** (`comprar-senhas.mjs:353`, que já usava o
   vínculo real). Com o P5 passa a disparar no **registo** e o marcador `referral-convertido` **fecha a porta** —
   a compra posterior vira no-op idempotente. O total de créditos por indicação não muda; **quem/quando paga o
   gas muda**.
3. **Quota (o efeito mais afiado)**: se o indicador **já estiver no limite mensal (10) no instante do registo**,
   `concederBonus` devolve `limite_mensal_excedido` → `registrarConversao` **marca convertido na mesma**
   (`semBonusIndicador: true`, `:583`) → e, como o marcador é **definitivo por `(codigo, indicado)`**, aquele
   indicado **nunca mais** gera a senha on-chain do indicador, nem depois de o mês virar. Com o bónus a
   disparar no registo (e não na compra), a probabilidade de cair nesta janela **aumenta**, porque o registo
   é o momento de maior volume.
   *Classificação honesta:* **derivado por leitura do código**, não medido on-chain (proibido aqui). Recomendo
   que o operador decida explicitamente entre (a) aceitar, (b) tecto/lote mensal, ou (c) manter o bónus só no
   `comprar-senhas` — que é exactamente a lista que o SEG-1 do autor pôs na mesa.

### ⚠️-2 — a «fonte única» do P1 não está amarrada por teste

Mutante meu **M1** (substitui a chamada à função partilhada por uma derivação própria **sem recorte de mês**,
criando a divergência exacta que a alegação diz ser impossível), correndo a **suíte canónica completa**:

```
BASELINE: frontend: VERDE 1108/1108 pass · backend: VERDE 1253/1259 pass · VEREDITO: VERDE
✗ SOBREVIVE À SUÍTE M1 divergência `ler-pontos` (derivação própria, sem recorte de mês)
   frontend: VERDE 1108/1108 pass · backend: VERDE 1253/1259 pass · VEREDITO: VERDE · restauro limpo
```

Isto **não refuta** a alegação — no código entregue a função é mesmo uma só (grep §3.2) e o teste de endpoint
prova que o painel e o servidor leem o mesmo ledger. O que falta é a **guarda**: o teste de endpoint só cria
uma indicação no mês corrente, logo não distingue «conta este mês» de «conta todos os meses». Um UTAC futuro
que volte a duplicar a conta — ou que extraia a função e esqueça um dos chamadores — passa verde.

### ℹ️ — notas

| nota | reprodução |
|---|---|
| «Senhas creditadas» em 2 docs | `grep -rn "Senhas creditadas" .` → `CLAUDE_DEBUG.md:884`, `desafio-gut/docs/runbook-credito-pendente.md:42` (nenhum é código) |
| Fuga de grafo social pré-existente | `sed -n '193,205p' referral.mjs` → `console.log("[MC17.4.2] usar-codigo resultado", { … indicado: endereco, indicador: r.indicador … })` — **idêntico** em `git show 9117402:…/referral.mjs` (linhas 193-205). Não é deste commit, mas contradiz o objectivo declarado do `0ec7d13` |
| Comentário obsoleto | `_lib/referral.mjs:6` — «DEBT-025: morto no caminho do endpoint» (o P5 acabou de o ressuscitar lá) |
| DEBT fechadas fora do commit | `git diff -- _logs/DEBT.md` (no repo principal, **não commitado**) fecha 025/028/029; o commit `3d72419` não toca em `_logs/DEBT.md` |
| Expectativa errada no SQL | `UTAC110h.3_VERIFICACAO-P6.sql:45` vs migração:59-68 («Nenhuma policy para anon/authenticated») |
| `md5` cru engana | `contract.mjs`/`signer.mjs`/`meta.mjs`/`recursos-app-config.mjs` dão md5 **diferente** entre worktree e repo principal **apenas por CRLF**; `tr -d '\r'` → idênticos. Um validador que comparasse md5 cru reportaria 4 falsas alterações |

---

## 5. OS MEUS MUTANTES (além dos 15 do autor)

Script: `C:/Users/Moltbot/tmp-utac110h3-val/meus-mutantes.mjs` (alvos dirigidos) e
`C:/Users/Moltbot/tmp-utac110h3-val/meus-mutantes-suite.mjs` (suíte canónica completa).

| # | mutante | alvo | resultado |
|---|---|---|---|
| **M1** | `ler-pontos` deriva o contador por conta própria, **sem** o recorte de mês UTC (divergência UI↔servidor) | `_lib`+endpoint | **✗ SOBREVIVE** — nos testes dirigidos (`fail=0 pass=6`) **e na suíte canónica completa** |
| **M2** | a UI inventa `Este mês: 0 / 10` quando o `ler-pontos` falha | `PainelIndicacao.jsx` | **✓ MORDE** (`fail=1`) |
| **M3a** | «torneio» (minúsculas) como **texto visível fora** dos 14 ficheiros (`MinhaCarteira.jsx`) | guardas de vocabulário | **✗ SOBREVIVE** à suíte completa |
| **M3b** | «**TORNEIO** DE HABILIDADE» maiúsculo **dentro** dos 14 ficheiros | P3 do teste novo | **✗ SOBREVIVE** (`fail=0 pass=16`) — o token regex é `[Tt]orneio` |
| **M3c** | «Torneio de habilidade» visível dentro dos 14 | P3 | **✓ MORDE** (`fail=1`) |
| **M3d** | valor da i18n volta a «Torneio de habilidade» (chave intacta) | guardas pré-existentes | **✓ MORDE** (`fail=4`) |
| **M4** | `Boot.jsx` passa a importar o Privy **estaticamente** | F | **✓ MORDE** (`fail=1`) |
| **M5** | `Boot` nunca mostra o gate (`carregarApp = true`) | F | **✓ MORDE** (`fail=5`) |

**5/8 mordem · 3 sobrevivem.** Todos restaurados com md5 idêntico e worktree limpo (`git status --porcelain` vazio).

---

## 6. REGRESSÕES EM TESTES PRÉ-EXISTENTES

- **Nenhum ficheiro de teste pré-existente foi alterado.** `git diff --name-status 9117402..3d72419` devolve
  **`A`** (adicionados) para `_tests/utac110h3-pendencias.test.mjs`, `_tests/utac110h3-prova-mutacao.mjs`,
  `src/__tests__/utac110h3-boot-comportamento.test.mjs`, `src/__tests__/utac110h3-pendencias-front.test.mjs`,
  `src/__tests__/_stubs-110h3/api.js` — e **`M`** apenas para **produção**. Zero `M`/`D` em testes antigos.
- **Nenhum teste antigo enfraquecido por via indirecta:** `tests` 1253→1259 e `pass` 1247→1253 (+6 = os 6 testes
  novos), `fail 0` nos dois pontos, `skipped 6` **idêntico** nos dois pontos (não se desactivou nada).
- Os testes que amarram o que o P2/P5 tocam (`test-conversao-e2e-mc1581.mjs:102`, `scripts/test-referral-mc1581.mjs`)
  estão intactos e verdes; as guardas de vocabulário pré-existentes (`utac110h1-vocabulario.test.mjs`,
  `vocabularioUI.test.mjs`, `glossario.test.mjs`) → **14/14 pass**.

---

## 7. O QUE NÃO CONSEGUI TESTAR (e porquê)

| não testado | razão |
|---|---|
| Custo real de gas / nº de transacções em produção | **proibido** transaccionar; a reactivação foi medida só com o contrato **espiado** (duplo). Nenhuma estimativa de custo é possível sem ir à rede |
| Efeito no bónus do `comprar-senhas` **depois** de o registo gravar o marcador | exigiria exercer o fluxo de compra on-chain; derivado por leitura do código (⚠️-1.2/.3), não medido |
| Migração `20261014_utac110e_eco_quildo.sql` aplicada em produção | exigiria Supabase/SQL Editor (proibido). O guião P6 existe **para o operador** correr |
| Estado real das tabelas `eco_quildo` / `eco_quildo_lastro` | idem — sem acesso a BD |
| Deploy/efeito em produção do endpoint `referral` | fora de escopo (proibido) |
| Que o Hermes nunca correu SQL (prova negativa) | impossível provar um negativo; o que **é** verificável: o ficheiro **não** está em `supabase/migrations/`, o commit **não** acrescenta migração nenhuma, e eu não executei SQL |
| Vacuidade «profunda» do teste do `Boot` quanto ao `useEffect`/Sentry | o próprio teste o **declara**: em SSR o `useEffect` não corre, logo o `requestIdleCallback` do Sentry e a avaliação do chunk do Privy não são exercidos — o que se prova é a **decisão** do arranque |

---

## 8. CONFIRMAÇÃO DE INTEGRIDADE (docs / contrato / env)

```bash
git -C C:/Users/Moltbot/tmp-utac110h3-val/wt diff --name-only 9117402..3d72419 -- \
  docs/ 'desafio-gut/contracts' 'desafio-gut/**/ignition' \
  desafio-gut/frontend/netlify/functions/contract.mjs \
  desafio-gut/frontend/netlify/functions/_lib/recursos-app-config.mjs      # → vazio
git -C … diff 9117402..3d72419 | grep -E "^\+.*process\.env"               # → só o teste novo
git -C … diff --name-only 9117402..3d72419 | grep -E "supabase/migrations|\.sql$"
                                            # → só _logs/UTAC110h.3_VERIFICACAO-P6.sql
```

mais a comparação `md5` (com normalização de CR) contra `C:/Users/Moltbot/Desktop/DESAFIOGUT` da §3.8:
**`docs/REGULAMENTO-v5.md`, `docs/GUTO-REGULAMENTO.md`, `docs/regras-oficiais.md`,
`desafio-gut/contracts/Leilao.sol`, `_lib/contract.mjs`, `_lib/signer.mjs`, `_lib/meta.mjs`,
`_lib/recursos-app-config.mjs` — todos IDÊNTICOS.**

**Estado final do worktree de validação: limpo (`git status --porcelain` vazio), HEAD em `3d72419`.**

---

## 9. RESUMO PARA O OPERADOR

1. As **8 alegações do UTAC110h.3 sustentam-se**. Nada foi refutado. Suíte canónica **VERDE** dos dois lados
   (1108/1108 + 1253/1259), 15/15 mutantes do autor reproduzidos, 5/8 mutantes meus mordem.
2. **Antes de considerar o P5 fechado**, decidir explicitamente ⚠️-1: reactivar o bónus on-chain no **registo**
   custa **2 transacções mainnet por indicação** e **fecha o marcador** `referral-convertido` no registo — o que
   transfere o bónus da compra para o registo e pode **perder** a senha do indicador quando ele já está no
   limite mensal. A autorização `R18-110h.3-5` só consta do documento do próprio autor.
3. Aceitar a ressalva ⚠️-2 ou fechar a lacuna: **nenhum teste** protege hoje a «fonte única» do contador
   (o meu mutante de divergência sobrevive à suíte completa).
