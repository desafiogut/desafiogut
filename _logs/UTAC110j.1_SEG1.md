# UTAC110j.1 — LGPD: exclusão de conta com hard delete + anonimização

> SEG-1 (medição) + SEG0 (Frente A — decisão) + SEG1 (Frente B — backend)
> Executor: Hermes · Data: 2026-10-16 · HEAD no arranque: `0c99cc9` (110i.1b) — as alterações do 110j
> estavam **não commitadas** na árvore de trabalho, como o enunciado declara.

---

## 1. SEG-1 — o que o `conta-delete` fazia ANTES (medido, não presumido)

Ficheiros lidos: `netlify/functions/delete-account.mjs` (117 linhas) e
`netlify/functions/_lib/conta-delete.mjs` (493 linhas, antes desta alteração).

| # | Alvo | Antes do 110j.1 | Lacuna |
|---|---|---|---|
| 1 | `saldo_rs`, `troco_senhas`, `wallet` (por `cliente_id`) | hard delete | — |
| 2 | `lances`, `lojistas`, `atividade_utilizadores` (por `endereco`) | hard delete | — |
| 3 | `cotas` (`cliente_id` OU `endereco`) | hard delete | — |
| 4 | `saldo_rs_creditos`, `saldo_rs_debitos` | anonimiza `payload` | — |
| 5 | `passes` | anonimiza `endereco` → `anon:<sha256>` | — |
| 6 | **`pontos`** | **NÃO TOCADO** | **LGPD** |
| 7 | **`palpites`** | **NÃO TOCADO** | **LGPD** |
| 8 | **`resgates`** (contém `morada` JSONB: nome/CPF/CEP) | **NÃO TOCADO** | **LGPD (dado pessoal!)** |
| 9 | **`eco_quildo`** | **NÃO TOCADO** | **LGPD** |
| 10 | **`google_play_compras`** | **NÃO TOCADO** | **LGPD** (a própria migração do 110i.1 a declarava como pendência) |
| 11 | **`pontuacoes`, `rankings_ciclo`** | **NÃO TOCADO** | LGPD (endereço + desempenho) |
| 12 | **indicações** (`referral-codes`, `-links`, `-bonus`, `-induzido`, `-log`, `-ip`) | **NÃO TOCADO** | **o ecrã DIZIA que os vínculos eram eliminados** |
| 13 | on-chain | declarado como retido | — |

**Esquema medido** (migrações em `supabase/migrations/`):

- `pontos`: PK `endereco`, `pontos`, `historico` JSONB. **GRANT só SELECT/INSERT/UPDATE** (sem DELETE).
- `palpites`: `endereco` **FK → `pontos(endereco) ON DELETE CASCADE`**, UNIQUE `(endereco, edicao_id)`.
- `resgates`: `endereco` FK → `pontos` CASCADE, **`morada` JSONB NOT NULL** (nome, CPF, CEP), `cartao_id`, `status`.
- `eco_quildo`: PK `endereco`, `saldo`, `historico`; o lastro global vive em `eco_quildo_lastro`
  (`total_emitido − total_usado` = reserva em centavos, 1 ECOQUILDO = R$ 1,00).
- `google_play_compras`: PK `purchase_token`, `endereco`, `estado`, `pontos/creditos_lance/eco_quildo`;
  **DELETE/TRUNCATE revogados de propósito** (prova contabilística, UTAC110i.1).
- `pontuacoes` / `rankings_ciclo`: `endereco` com CHECK `~ '^0x[0-9a-f]{40}$'` ⇒ **não são anonimizáveis**
  com um pseudónimo que não seja um endereço válido.
- `passes`: DELETE revogado (MC105a.1); UNIQUE **parcial** em `endereco` (já tratado no MC105a.1).

**Link web de exclusão:** JÁ EXISTE — rota pública `/excluir-conta` (`src/pages/ExcluirConta.jsx`,
renderizada fora do gate LGPD e da navegação em `App.jsx`). Não nomeava o developer nem os passos.

**RAM (A14, portão ≥ 1 500 MB):** arranque **456 · 443 · 435 MB**; depois de fechar a árvore `msedge`
sem janela (8 processos) **712 → 1 016 MB**; depois do trim de working sets (112 processos)
**pico 1 379 · mínimo 1 229 MB** — **abaixo do portão**. Sóbrio: `svchost` 816 MB (91 processos),
`claude` 517 MB (10, do operador), `python` 402 MB (a sessão), `MsMpEng` 374 MB, `Memory Compression`
162 MB. Ver §6 (desvio declarado).

---

## 2. SEG0 — a decisão, tabela a tabela (R18-110j.1-1)

**Registo R18 (decisões deste UTAC):**

| ID | Decisão | Onde vive |
|---|---|---|
| **R18-110j.1-1** | Política tabela a tabela: o que é hard delete, o que é anonimizado, o que é retido e com que base legal (tabela abaixo). Sem base legal → apaga-se. | `POLITICA_EXCLUSAO` (`_lib/conta-delete.mjs`), tabela §2, migração SQL |
| **R18-110j.1-2** | Atomicidade: a parte Postgres passa a ser uma transacção (RPC `excluir_conta_titular`); a parte Blobs NÃO é atómica e isso é declarado no manifesto (`via`) e no relatório. Enquanto a migração não for aplicada, a via legado continua a correr e a ser identificada. | §3 «Atomicidade» |
| **R18-110j.1-3** | Indicações: apaga-se o que é do titular (código, vínculo, bónus, indução), anonimiza-se o `indicador` nos vínculos de TERCEIROS e anonimiza-se o log de auditoria; o texto do ecrã passa a dizer isto. | `tratarVinculosIndicacao`, `apagarCodigoIndicacao`, `anonimizarLogIndicacoes` |
| **R18-110j.1-5** | **Decisões do operador (2026-10-17), depois de duas rondas REPROVADAS:** (1) **3.º validador com mandato CIRÚRGICO** — só os 3 resíduos (B2 residual, B7, B3/B5), a atomicidade da RPC com FK real e a suíte completa; (2) **commit ADIADO** até esse parecer — aprovado ⇒ commit dos 20 caminhos um a um; reprovado ⇒ corrigir primeiro; (3) **migração mantém-se NÃO aplicada** (sem credenciais; `db push` levaria migrações antigas); (4) **DEBT-046 registada** e **UTAC110j.2 com execução ADIADA** — não se abre frente nova até este UTAC fechar; (5) **custo «não medido»** aceite. | `_logs/UTAC110j.1_SEG4_VALIDADOR.md` §3 · `_logs/UTAC110j.2.spec.yml` (execucao) · §8 do relatório |
| **R18-110j.1-4** | **Fechada pelo operador (2026-10-16)**: 4a `eco_quildo` mantém-se anonimizado com lastro; 4b `resgates` passa a ANONIMIZAR (morada → «[Conta Deletada]», registo da entrega fica, `pontos` como âncora da FK). | §2 fim · `anonimizarResgates`/`tratarPontos` · blocos (2b)/(2c) da migração |

Critério: **LGPD art. 18, VI** (eliminação) é a regra; **art. 16** só admite retenção com base legal;
**art. 12** + **art. 16, IV** tornam a anonimização equivalente, desde que o dado deixe de identificar.
**Não se inventou base legal:** onde não há obrigação legal, **apaga-se**.

| Alvo | Ação | Porquê (base) |
|---|---|---|
| `saldo_rs`, `troco_senhas`, `wallet`, `lances`, `lojistas`, `atividade_utilizadores`, `cotas` | **HARD DELETE** | sem obrigação de retenção (art. 15/16) — comportamento que já existia |
| **`pontos`** | **HARD DELETE do conteúdo** (linha vazia só como âncora da FK quando há resgate retido) | saldo/histórico são de fidelidade e nenhuma lei obriga a guardá-los (art. 18, VI). **R18-110j.1-4b** |
| **`palpites`** | **HARD DELETE** | idem; apagado ANTES do pai, para não depender do CASCADE |
| **`resgates`** | **ANONIMIZAR** (decisão do operador, **R18-110j.1-4b**) | prova de entrega / registo contabilístico (art. 16, I/IV): fica o registo (id, cartão, status, datas) e a **morada passa a «[Conta Deletada]»**; o `endereco` passa a `anon:<sha256>`. A linha de `pontos` fica como âncora da FK |
| **`pontuacoes`, `rankings_ciclo`** | **HARD DELETE** | desempenho ligado ao endereço; sem retenção. Não anonimizáveis (CHECK de formato) |
| `saldo_rs_creditos`, `saldo_rs_debitos` | **ANONIMIZAR** `payload` | comprovação fiscal de operações financeiras (art. 16, I/IV) |
| `passes` | **ANONIMIZAR** `endereco` | prova de compra; DELETE revogado |
| **`google_play_compras`** | **ANONIMIZAR** `endereco` | prova contabilística da compra na loja; DELETE revogado de propósito (art. 16, I/IV) |
| **`eco_quildo`** | **ANONIMIZAR** `endereco`, **manter saldo + histórico** | é um **passivo monetário com lastro em R$** (Regulamento 5.0, arts. 47º-51º): apagar a linha deixaria o `eco_quildo_lastro` a declarar uma reserva sem contraparte. O lastro fecha; a pessoa sai (art. 16, IV) |
| **indicações** (`referral-codes`, `-bonus`, `-induzido`, `-links` do titular) | **HARD DELETE** | vínculo pessoal; sem retenção |
| **indicações** (`referral-links` de TERCEIROS onde o titular é indicador) | **ANONIMIZAR** o campo `indicador` | o registo é de OUTRA pessoa: apagá-lo destruiria dados de terceiro |
| **`referral-log`** | **ANONIMIZAR** os endereços nos eventos | auditoria (Marco Civil art. 15; retenção de 13 meses já na política) |
| `referral-ip` | **NÃO TOCAR** | não tem endereço (só hash de IP) e expira em 24 h |
| on-chain | **RETER (declarado)** | imutável por natureza |
| `consent-log` | **APAGAR** | comportamento anterior mantido (decisão do operador no MC104.3) |

**R18-110j.1-4 — DECIDIDO PELO OPERADOR (2026-10-16), as duas dúvidas fechadas:**
- **4a — `eco_quildo`: MANTÉM-SE como está** (anonimizado, lastro preservado). Razão do operador: é
  passivo contabilístico da Associação, com lastro em R$; a LGPD admite retenção com base legal
  (obrigação contabilística) e anonimizar o titular é suficiente.
- **4b — `resgates`: ANONIMIZAR, não apagar.** Razão: preservar a prova de entrega (obrigação
  contabilística) removendo a morada (dado pessoal) — morada → «[Conta Deletada]», registo da
  transacção (data, produto) mantido, linha de `pontos` como âncora da FK.
  Implementado nesta ronda (o código e a migração foram alterados depois da primeira medição):
  `anonimizarResgates` + `tratarPontos` no JS, blocos (2b)/(2c) na função SQL. **Ordem obrigatória**:
  resgate antes de `pontos` — apagar `pontos` primeiro faria o `ON DELETE CASCADE` levar o registo
  retido. Se a anonimização do resgate falhar, `tratarPontos` **recusa** apagar `pontos` (fail-closed)
  e o erro sobe ao manifesto.

---

## 3. SEG1 — o que passou a correr (Frente B)

`_lib/conta-delete.mjs`:

1. **`POLITICA_EXCLUSAO`** — lista exportada, fonte única do que é apagado/anonimizado (alvo, ação,
   chave, base). O teste de deriva compara-a com a migração SQL e com o texto do ecrã.
2. **Supabase — via atómica primeiro.** `excluirSupabaseViaRpc` chama
   `public.excluir_conta_titular(p_endereco, p_anon, p_dry_run)` (migração nova). Se a função não
   existir (`42883`/`PGRST202`) → **via legado** (tabela a tabela) e o manifesto diz `via: "legado"`.
   Se existir e **falhar**, o erro sobe (`via: "rpc:falhou"`) e **não** se cai em silêncio para a via
   não atómica.
3. **`anonimizarEcoQuildo`** — saldo/histórico ficam; `endereco` → `anon:<sha256>`. Desenho para a
   **2.ª exclusão do mesmo endereço** (colisão na PK): funde saldo/histórico no pseudónimo e remove a
   linha com o endereço — nunca fica resíduo identificável.
4. **`anonimizarColunaEndereco`** — `google_play_compras` (mantém `purchase_token`, `order_id`, valores).
5. **Indicações** — 5 funções novas: `apagarCodigoIndicacao`, `apagarChavesDoTitular`,
   `tratarVinculosIndicacao` (apaga o vínculo do titular / anonimiza o `indicador` no vínculo de
   terceiro), `anonimizarLogIndicacoes`.
6. **Auditoria** — `registarAuditoriaExclusao` grava 1 registo em `audit-exclusao` com
   `{ em, anon, via, deletado{contagens}, anonimizado{contagens}, erros }`: **nunca o endereço, nunca o
   conteúdo apagado**. Falha ⇒ `auditoria: false` no manifesto (não se declara verde o que não correu).
7. **IDOR** — não mudou: o `endereco` vem do corpo mas é **validado contra o JWT**
   (`validarOwnerOuAdmin`, 403 se não for o dono nem admin). O `userId` **nunca** é fonte de verdade do corpo.
   (Nota: o sistema identifica o titular pelo endereço EVM, não por um `userId` numérico — não existe
   tabela `users`; o equivalente é o `endereco` do JWT.)

### Atomicidade — o que é e o que NÃO é

- **Postgres: passa a ser ATÓMICO** na via RPC (uma função = uma transacção). Se uma tabela falhar,
  **nenhuma** fica a meio — e `SECURITY DEFINER` resolve de caminho o problema de GRANT (as tabelas
  criadas depois do MC105a só têm SELECT/INSERT/UPDATE para o `service_role`).
  > ⚠️ **ESTA FRASE FOI REFUTADA (SEG4/B1).** Era uma afirmação sobre o DESENHO, escrita sem nunca ter
  > executado a função. Medida contra um Postgres real, a RPC **falhava sempre que o titular tinha um
  > resgate**: a FK `resgates.endereco → pontos.endereco` é verificada em cada statement e eu escrevia
  > em `resgates` antes de a âncora de `pontos` existir (23503 ⇒ reversão total). Corrigido com
  > `garantirAncoraPontos` ANTES da escrita nos resgates + teste com duplo que faz cumprir a FK.
  > O texto acima mantém-se **à vista** como registo do erro. Detalhe: `_logs/UTAC110j.1_SEG4_VALIDADOR.md` §1.
- **Blobs: NÃO é atómico, e não pode ser.** Não existe transacção distribuída Netlify Blobs ↔ Postgres.
  O que existe: fail-soft por store, idempotência (re-executar completa o que faltou), erro visível
  (HTTP 500 + manifesto) e o `pendente` do MC104.3. **Isto fica declarado, não disfarçado.**
  > ⚠️ **«Erro visível» também foi REFUTADO (SEG4/B2).** Medido: com o `getStore` a lançar, o manifesto
  > saía `ok:true`/`erros: []` e o endpoint respondia **200 sem ter apagado nada** (`abrirStoreSeguro`
  > devolvia `null` e cada chamador lia isso como `0`). Corrigido: store indisponível é erro, e as
  > falhas por chave (deletes, `setJSON`, `list`) contam e sobem. Texto acima mantido como registo.
- Enquanto o operador não aplicar a migração, a produção corre a via **legado** (não atómica) — e o
  manifesto di-lo em `via`. O DELETE em `pontos`/`palpites`/`resgates` depende do *default privilege*
  do Supabase (o comentário do MC105a.1 diz que o `service_role` recebe DELETE por omissão e que foi
  preciso REVOGAR em `passes`) — **NÃO medido em produção** (ver DEBT-045).

---

## 4. Testes (SEG3)

`_tests/utac110j1-exclusao-lgpd.test.mjs` — **15/15**. Cobre, pelo uso:
hard delete das 5 tabelas novas (e terceiro intacto) · a morada não sobrevive · anonimização do
`google_play_compras` sem PII · `eco_quildo` com lastro e **2.ª exclusão sem resíduo** · payload fiscal
sem e-mail/CPF · indicações apagadas · **vínculo de terceiro preservado** · log anonimizado ·
auditoria sem endereço nem morada · dry-run não audita · via RPC preferida · RPC ausente → legado
declarado · RPC a falhar → erro visível e nada apagado · **deriva SQL↔JS** (tabelas e chaves de PII) ·
**deriva JS↔ecrã**.

`src/components/__tests__/utac110j1-texto-exclusao.test.mjs` — **3/3** (modal RENDERIZADO).

**Mutação (R16): 5/5 mutantes MORRERAM**, com restauro por `.bak` fora do repo e **md5 final == inicial**
(`749739a6…`): D1 tirar `pontos` da lista · D2 anonimização do ECOQUILDO como no-op · D3 apagar o
vínculo do terceiro em vez de o anonimizar · D4 gravar o endereço em vez do pseudónimo na auditoria ·
D5 não anonimizar o `referral-log`.

---

## 5. Frente C/D (resumo; detalhe no SEG2)

- O ecrã deixa de prometer «todos os dados pessoais removidos» e passa a listar **o que é eliminado** e
  **o que é retido** (com a base: fiscal, contabilística, auditoria, on-chain).
- A frase sobre os «vínculos de indicação» **deixou de ser falsa**: o backend passou a apagá-los.
- A página pública `/excluir-conta` passa a nomear a **app** (DesafioGUT Torneio Habilidade) e o
  **developer** (Associação Recreativa dos Nordestinos no Amazonas — Grupo União e Trabalho, CNPJ
  23.040.066/0001-00) e mostra os **passos**.

## 6. Desvio declarado do A14 (RAM)

Portão: ≥ 1 500 MB livres antes da suíte.

- **1.ª ronda (medição do SEG-1/SEG3): NÃO CUMPRIU.** 456/443/435 no arranque, pico 1 379 e **1 398 MB**
  imediatamente antes da corrida. Corrida feita **abaixo** do portão, em foreground, sem falha
  inexplicada — declarada como desvio (skill `windows-memory-pressure` §3.1/§3.2).
- **Ronda do fecho (após as correcções do R18-110j.1-4): CUMPRIU.** A mesma escada segura (msedge sem
  janela + `EmptyWorkingSet`) deu **1 880 · 1 928 · 1 963 MB** antes de arrancar a suíte canónica.
  ⚠️ O portão **não transita** entre rondas: foi medido de novo antes desta corrida, e é só desta
  corrida que se afirma o cumprimento. A 1.ª ronda continua registada como desvio — não se reescreve.
