# UTAC110j.1 — SEG4: validador adversarial (veredicto REPROVADO e o que mudou por causa dele)

> Validador: subagente independente, worktree próprio (`C:\Users\Moltbot\Desktop\VAL110j1`), mandatado a
> **REFUTAR** (não a confirmar). Data: 2026-10-16. Duração: 479 s.
> **VEREDICTO: REPROVADO** — 1 bloqueante, 3 altos, 3 médios, 3 baixos.

---

## 1. O que ele derrubou (fica à vista, não se apaga)

| # | O que eu afirmei | Como foi REFUTADO | Estado |
|---|---|---|---|
| 1 | «A parte Postgres passa a ser atómica (RPC)» | **B1 — BLOQUEANTE.** A FK `resgates.endereco → pontos.endereco` é verificada **em cada statement**: eu escrevia `resgates.endereco = anon` **antes** de existir uma linha de `pontos` com essa chave ⇒ **23503 e a transacção inteira revertia**. A RPC «atómica» **falhava sempre que o titular tinha um resgate** — exactamente o caso que o R18-110j.1-4b mandou tratar. Medido pelo validador contra um **Postgres real** (subiu um cluster em `_auditoria/pg`). | **CORRIGIDO** (`garantirAncoraPontos` antes dos resgates; teste novo com duplo que **faz cumprir a FK**) |
| 2 | «O fail-soft dos Blobs é fail-visível» | **B2 — ALTA.** `abrirStoreSeguro` devolvia `null` e cada chamador traduzia isso em `0` ⇒ `ok:true`, `erros: []`, **HTTP 200 sem ter apagado nada**. Medido: `getStore` a lançar para todos os stores ⇒ indicações, notificações, pedidos e `lance-idem` intactos, resposta de sucesso. Mais: `catch {}` vazios em `apagarBlobPorValor`, `consent-log` e nos `setJSON` de `pedidos-pagos`/`pedidos-meta`. | **CORRIGIDO** (store indisponível = erro; todas as falhas por chave contam e sobem) |
| 3 | «A lacuna LGPD está fechada» | **B3 — ALTA.** `cotas_pagas.payload` guarda `{cnpj, email, endereco}` e **não estava em lado nenhum** (nem política, nem migração, nem ecrã). Também `fila_tarefas.payload.endereco` (tarefa falhada fica com o endereço para sempre), `cota_fingerprints`, `wallet_idem`. | **PARCIALMENTE CORRIGIDO**: `cotas_pagas` e `fila_tarefas` entram na política (anonimizar). `cota_fingerprints` e `wallet_idem` ficam em **DEBT** (chaveados por `visitor_id`/sem call sites — não são alcançáveis pelo endereço). |
| 4 | «Logs de auditoria … sem o seu endereço» (texto do ecrã) | **B4 — MÉDIA.** O store Blob `auditoria` (`_lib/edicoes-core.mjs`) grava `{acao, edicaoId, endereco, …}` e o `conta-delete` nunca lhe tocou ⇒ **o texto mentia**. | **CORRIGIDO** (`anonimizarAuditoria`: o endereço sai, o evento fica) |
| 5 | «anonimizados (sem vínculo com você)» / «eliminados de imediato» | **B5 — MÉDIA.** `anon:<sha256>` é um hash **sem sal de um dado público** (a carteira): quem tem a carteira recalcula e religa. E «de imediato» é falso nos cenários B2/FK. | **CORRIGIDO no texto**: «identificador pseudónimo derivado da carteira»; «logo após a confirmação». A limitação do hash sem sal fica declarada (§3). |
| 6 | «As chaves de PII são as mesmas nos dois lados» (teste de deriva) | **B6 — MÉDIA.** A lista não tinha `payerName`/`nomeCompleto`/`payer` — medido: `mc72_anon_payload` devolvia-os intactos. E o teste de deriva **nunca** podia detectar uma chave em falta nos DOIS lados (ambos derivam do mesmo autor). | **CORRIGIDO** (chaves acrescentadas no JS e no SQL + asserção de comportamento). O limite do teste de deriva fica declarado. |
| 7 | «O teste de deriva SQL↔JS garante o alinhamento» | **B7 — BAIXA.** A verificação aceitava a tabela citada **só num comentário**; uma tabela removida do corpo mas mantida no cabeçalho ficava verde. E o mock Supabase **não tinha FKs nem CHECKs** — foi por isso que B1 passou. | **CORRIGIDO**: a deriva passa a ler o **corpo executável** (comentários `--` removidos) e há um duplo com FK. |
| 8 | «O manifesto é auditável» | **B8 — BAIXA.** O registo de auditoria era escrito **também quando a exclusão falhava**, e não dizia se fechou. | **CORRIGIDO** (`ok` no registo) |
| 9 | «A migração está pronta a aplicar» | **B9 — BAIXA.** `psql -f` num Postgres limpo falha: `role "anon" does not exist` — sinal de que **nunca foi executada em lado nenhum**, por mim incluído. | **CORRIGIDO** (grants guardados por `pg_roles`; passa a ser executável fora do Supabase) |

## 2. O que ele tentou e NÃO derrubou (controlos positivos dele)

Hard-deletes novos a funcionar (`palpites`, `pontuacoes`, `rankings_ciclo`, terceiro intacto) ·
atomicidade semântica real (a falha FK reverteu tudo) · dry-run conta e não muta · 2.ª exclusão do
mesmo endereço sem colisão de PK · merge do `eco_quildo` · UNIQUE parcial do `passes` · referral (6
stores, vínculo de terceiro preservado, log anonimizado) · **rota web `/excluir-conta`** (SPA + `Boot`
`ROTAS_PUBLICAS` + `netlify.toml` `/* → /index.html 200` + canal por e-mail + nomeia app/developer/
CNPJ/passos) — **passa**.

## 3. Limitações que ficam DECLARADAS (não são defeitos que se possam corrigir no código)

1. **`anon:<sha256>` é pseudonimização, não anonimização irreversível.** Sem sal, quem conhece a
   carteira (pública, on-chain) recalcula o hash. O ecrã passou a dizer «identificador pseudónimo
   derivado da carteira» em vez de «sem vínculo».
2. **Referências externas**: `purchase_token`/`order_id` (Google) e a chave da NF-e são a prova
   contabilística — a Google sabe a quem correspondem. Reter a prova e ao mesmo tempo tornar o
   registo impossível de religar **por terceiros** não é alcançável.
3. **`cota_fingerprints`** (chaveado por `visitor_id`, lista de CNPJs) e **`wallet_idem`** (sem call
   sites hoje) não são alcançáveis pelo endereço ⇒ **DEBT**, não correcção silenciosa.
4. **O teste de deriva JS↔SQL de PII não detecta uma chave em falta nos dois lados** (ambos derivam do
   mesmo autor). Fica declarado; a cobertura real é a asserção de comportamento por chave.
5. **O mock Supabase não é um Postgres**: a partir de agora há um duplo que faz cumprir a FK
   resgates→pontos, mas CHECKs e triggers continuam fora — só o validador com Postgres real os vê.

## 4. Instrumentos MEUS que estavam errados (declarado)

- O **duplo Supabase sem FKs** deu verde a uma ordem que o Postgres recusa — foi ele que escondeu o
  B1. Um teste que não modela a restrição que o código tem de respeitar **não prova nada** sobre ela.
- Eu escrevi «atomicidade: passa a ser atómica» **sem nunca ter executado a função**. A frase era
  sobre o desenho, não sobre um facto medido — e por isso foi derrubada à primeira medição real.
- A minha primeira contagem de mutantes (5/5, depois 8/8) media a **cobertura dos meus testes contra
  os meus mutantes**; não dizia nada sobre a correcção do código face à realidade. Passa a haver 12
  mutantes (D1-D12), agora incluindo o B1/B2/B3/B6.

## 5. Limpeza

O validador deixou um cluster PostgreSQL a correr (porta 55432) e `_auditoria/` no worktree; o worktree
foi removido pelo helper (rmdir das junctions primeiro — regra A13) e o cluster parado antes.
---

# 2.ª RONDA (re-verificação das correcções) — também REPROVADO, com menos achados

> Worktree novo, mesmo mandato (refutar), 490 s. **VEREDICTO: REPROVADO** — mas o alcance encolheu: os
> achados passaram de 1 bloqueante + 3 altos para **1 alto residual + 1 baixo a meio + 1 médio parcial**.

| Achado | Estado na 2.ª ronda | O que fiz |
|---|---|---|
| **B1** FK/ordem da âncora | **CONFIRMADO CORRIGIDO**, medido em Postgres 16.14 com o schema real das 21 migrações: exclusão completa OK, 2.ª exclusão idempotente (`ancoras=1`, `com_endereco=0`) e **controlo negativo** a devolver `23503` quando se força a ordem antiga. | nada a fazer |
| **B2** fail-soft | **AINDA PRESENTE** — na forma exacta do 1.º achado, mas num caminho que eu não tinha tocado: os `get()` **por chave** continuavam engolidos (`catch { existente = null }`). Medido end-to-end: `ok:true`, `erros: []`, HTTP 200, PII em disco, **e o registo de auditoria gravado como sucesso**. | **corrigido**: todos os `get` por chave sobem; `chavesDoEndereco` conta leituras falhadas e recusa afirmar «não tem dados aqui» |
| **B3** tabelas fora | **CONFIRMADO CORRIGIDO** (`cotas_pagas`/`fila_tarefas` medidas em Postgres real, cnpj/email fora) — com **duas ressalvas**: `DEBT.md` continuava a dizer que `cotas_pagas` ficava fora, e **`wallet_idem` não estava declarado em lado nenhum** — e é alcançável (`wallet.mjs:173` grava `{transacaoId, endereco, …}`). | `wallet_idem` **passou a ser anonimizado** (JS + SQL, com teste); DEBT-048 fechada e DEBT-050 corrigida |
| **B4** store `auditoria` | **CONFIRMADO CORRIGIDO** (`anonimizarAuditoria`, com falha de `list` a subir). | nada |
| **B5** texto | **PARCIAL**: «identificador pseudónimo» honesto, mas (i) a frase de sucesso continuava absoluta («Seus dados pessoais foram removidos») — e com o B2 residual era **falsa**; (ii) «pseudónimo» vs «pseudónimo» inconsistente. | sucesso passa a «Conta encerrada. Os seus dados pessoais foram eliminados ou anonimizados…»; grafia uniformizada |
| **B6** PII | **CONFIRMADO CORRIGIDO** e medido em Postgres real (`mc72_anon_payload` devolve só `{endereco, anonimizadoEm, anonimizadoPor}`). | nada |
| **B7** deriva | **PARCIAL, e ele tem razão**: eu criei `SQL_CORPO` mas **continuei a usar `SQL` (com comentários) na direcção directa**. Uma tabela citada só num comentário passava. | direcção directa passa a `SQL_CORPO` |
| **B8** auditoria | **CONFIRMADO CORRIGIDO** (`ok`), com nota de código morto (`if (!store) return false`) | nota aceite; é inofensiva |
| **B9** migração portável | **CORRIGIDO, não medido no cenário limpo** — ele correu a migração mas tinha criado previamente `anon`/`authenticated`/`service_role`. A guarda é leitura correcta, não medição. | fica **declarado como não medido** |

## O que continua por verificar (e por isso NÃO declaro «aprovado»)

1. As correcções do **B2 residual**, do **`wallet_idem`**, do **B5** e do **B7** foram feitas **depois** desta
   ronda — **não têm verificação independente**. Os meus testes cobrem-nas (falha de leitura por chave,
   `wallet_idem`, `SQL_CORPO`), mas foi precisamente um teste meu que deixou passar o B1 e o B2.
2. **B9** no cenário «Postgres limpo sem roles» não foi medido por ninguém.
3. O 3.º validador não foi despachado: duas rondas seguidas encontraram defeitos reais, e a leitura honesta
   é que **o trabalho ainda não tem um parecer favorável** — tem dois desfavoráveis e um conjunto de
   correcções verificadas por mim.

## Arrumação das duas rondas

A 1.ª deixou um cluster PG em 55432 e `_auditoria/` no worktree; a 2.ª deixou outro em 55434. **Os dois
clusters foram parados, as 5 junctions removidas com `rmdir` (A13) e os dois worktrees apagados** —
`node_modules` real conferido depois (383/570/504/416 entradas). Fica registado que **o validador não
conseguiu limpar sozinho** (cortado por limite de iterações nas duas rondas) e que a limpeza foi minha.
---

# 3.ª RONDA — cirúrgica (mandato do operador, R18-110j.1-5.1)

> Worktree novo, mandato **estreito**: só os 3 resíduos + atomicidade com FK real + suíte completa.
> 711 s. **VEREDICTO: APROVADO COM RESSALVAS.**

| Ponto | Resultado | Evidência |
|---|---|---|
| **B2 residual** (leituras por chave) | **CORRIGIDO** | 7/7 verdes no PoC dele; **e o instrumento morde**: repondo `catch { existente = null }` + `void falhasLeitura`, 5/7 e A/B vermelhos. `delete-account.mjs:109` ⇒ erro vira HTTP 500, não 200. |
| **B7** (deriva por comentários) | **CORRIGIDO** | Prova bidireccional: tabela fictícia **só em comentário** ⇒ verde (é ignorada); a mesma no **corpo** ⇒ vermelho; `palpites` comentado ⇒ vermelho. Mutações em cópias com `SQL_PATH`, ficheiro real intocado (md5). |
| **B3/B5** (`wallet_idem` + frase absoluta) | **PARCIAL** | `wallet_idem` corrigido e medido em Postgres real (`k1` → `anon:…`, 0 linhas com o endereço). **Mas** `ExcluirConta.jsx:116` mantinha «Os dados pessoais foram removidos», absoluto, num ramo que não lia a pendência — e **nenhuma guarda o apanhava** (as duas só procuravam a variante com «todos»). |
| **Atomicidade com FK real** | **CORRIGIDO e medido a sério** | Postgres 16.14, 17 migrações, FK `resgates_endereco_fkey … ON DELETE CASCADE` confirmada. RUN 1: `{deletado:{pontos:1}, anonimizado:{resgates:1, eco_quildo:1, wallet_idem:1}}`, âncora a 0 pontos, morada toda «[Conta Deletada]», endereço do titular em 0 linhas. RUN 2 idempotente. **Controlo negativo** (ordem antiga) ⇒ 23503. Dry-run não altera. |
| **Suíte completa** | **VERDE** | `backend VERDE 1340/1346` · `frontend VERDE 1164/1164`. |
| **Arrumação** | **CUMPRIDA** | Cluster parado (`pg_ctl status` = nenhum servidor; `netstat 55435` vazio), 0 junctions, `_auditoria` apagada, md5 dos ficheiros mutados restaurado (`996a8caa…`). |

## Ressalvas do 3.º validador — todas corrigidas DEPOIS do parecer

1. **[média-alta] `ExcluirConta.jsx:116`** — a página prometia remoção total e não lia a pendência.
   Corrigido: o modal passa `pendente` ao pai, a página diz «eliminados ou anonimizados» ou, quando há
   pendência, quantos lances ficaram e porquê. **Guarda nova**: `assert.doesNotMatch(PAGINA,
   /dados pessoais foram removidos/i)` — a variante sem «todos» que passava.
2. **[baixa-média] via legado não é atómica e o manifesto não o dizia** — acrescentado
   `atomico: via === "rpc"` ao manifesto, com teste que exige `false` no legado e `true` na RPC.
3. **[baixa] `throw new Error(msg, err?.message)`** num ramo — 2.º argumento de `Error` é ignorado;
   mensagem passou a ser interpolada.
4. **[baixa] `wallet_idem` sem índice em `payload->>endereco`** — só escala, sem impacto funcional:
   fica registado como observação (não é dívida de conformidade).

⚠️ **Âmbito do parecer:** cobre o código **antes** destas 4 correcções. As correcções 1–3 têm teste
próprio e a suíte foi re-corrida, mas **não têm verificação independente**. Fica dito, não escondido.
