# MC93-F — Preparação bloqueante do MC94: Supabase + Netlify

**Projeto:** DesafioGUT · **Data:** 2026-09-24/25 · **Commit base:** `c199591`
**Modo:** COMPLETO (SEG-1 → SEG5) · **Veredito do SEG-1:** **AJUSTAR** · **R19:** ativada
**Veredito do SEG4:** **APROVADO**
**Veredito final:** **CONCLUÍDO** — os dois bloqueantes do MC94 estão levantados

---

## Veredito em cinco linhas

1. **As tabelas `pontuacoes` e `rankings_ciclo` existem em produção.** Não
   existiam; a migração nunca tinha sido aplicada. Agora é a 10.ª do registo.
2. **A produção saiu de 18 de Agosto e passa a servir `c199591`** — com
   `commit_ref`, ou seja rastreável ao repositório pela primeira vez em meses.
3. **`/ranking` responde JSON a partir da tabela nova**, provado ponta a ponta com
   uma linha sintética inserida e apagada. `POST /pontuacao` devolve 401.
4. ⛔ **Três coisas vermelhas que o push revelou** e que este MC não podia
   corrigir: lockfile do frontend dessincronizado (bloqueia a CI inteira), um
   teste Foundry vencido por deriva de toolchain, e a chave Alchemy por rotar.
5. ⚠️ **O `ci.yml` do MC93-E continua a nunca ter corrido.** Agora sabe-se porquê.

---

## 1. EXECUTOR

### 1.1 O SEG-1 refutou duas premissas e encontrou um risco maior do que o declarado

| Premissa do enunciado | Medido |
|---|---|
| "MCPs Supabase e Netlify estão configurados" | ⛔ **Não existe MCP do Netlify.** O Supabase existe. Netlify foi pelo CLI 26.1.0 |
| "Migração não confirmada em produção" | ✅ confirmada ausente: 19 tabelas, 9 migrações, última de 2026-08-03 |
| "auto-deploy pode reconstruir versão antiga" | ✅ e **pior**: `stop_builds: false` + `main` **104 commits atrás** + 21 PRs dependabot |
| "Endpoints `/ranking` e `/feedback`" | ⚠️ `/feedback` **não existe** como função; é `GET /ranking?recurso=feedback`. E é `/pontuacao`, não `/pontuar` |

**O achado que mudou o critério de aceitação.** `netlify.toml:34` reescreve `/*`
para `/index.html` com **status 200**. Logo um endpoint ausente responde `200` com
HTML — indistinguível de um OK, se se julgar pelo código HTTP, que é exactamente
o que o SEG3.4 do enunciado mandava fazer. Provado com os dois controlos:

```
/isto-nao-existe-mc93f      -> 200 · text/html   (controlo negativo)
/saldo-senhas?endereco=0x0  -> 400 · application/json  (controlo positivo)
```

A validação passou a exigir `content-type: application/json`.

### 1.2 Migração

`apply_migration` no projeto `vjslwowwrpcawijdiksm` (produção, confirmado contra
`cloud.md:6891` **antes** de escrever — o staging é `gjuelqjjhuuwnlsjyeai`).

| | rls | políticas | checks | índices | service_role INSERT | anon SELECT |
|---|---|---|---|---|---|---|
| `pontuacoes` | ✅ | 1 | 3 | 4 | ✅ | ❌ |
| `rankings_ciclo` | ✅ | 1 | 6 | 4 | ✅ | ❌ |

⚠️ **Correcção de número:** a documentação do MC93-B/D dizia "8 CHECKs". O medido
é **9** (3 + 6). Corrige-se o número, não o schema.

### 1.3 Deploy — e a decisão que o tornou desnecessário

O push dos 104 commits disparou o auto-deploy, que publicou **o mesmo commit**:

```
deploy   6ab5bf47d5da6700082f1fe8
commit   c199591cfcc53e569ceaa69a432ea4b0d695367a
publicado 2026-09-25T00:27:25Z
funções  70  (ranking · pontuacao · fila-processor-scheduled · saldo-senhas)
```

⇒ `netlify deploy --prod --build` passou a ser um build redundante que produziria
um deploy **sem `commit_ref`** por cima de um que tem — o padrão que gerou o drift
dos MC79/MC89.49. O operador decidiu não o correr. Declarado: o SEG3.1 e o SEG3.3
foram cumpridos pelo auto-deploy, não pelo CLI.

### 1.4 Prova ponta a ponta

```
INSERT rankings_ciclo (MC93F-SONDA, 0xaaaa…aaaa, 7 pts, 2 acertos, pos 1)
GET /ranking?cicloId=MC93F-SONDA
  -> {"total":1,"ranking":[{"posicao":1,"pontosTotais":7,"acertosTotais":2,…}]}
GET /ranking?cicloId=MC93F-SONDA-NAO-EXISTE -> {"total":0,"ranking":[]}
DELETE da sonda · contagem final: pontuacoes 0 · rankings_ciclo 0
```

Sem isto, `total: 0` seria indistinguível de um erro engolido.

E o anti-IDOR do MC93-B está vivo em produção:
`GET /ranking?recurso=feedback` sem JWT → `401 sessao_invalida`.

---

## 2. VALIDADOR (consulta independente aos MCPs/CLI)

- `list_tables` → **21 tabelas**; as duas novas presentes, com RLS, 0 linhas.
- `list_migrations` → 10; a última `20260925002324 mc93b_pontuacoes`.
- Netlify → `published_deploy` ready, `commit_ref c199591…`.
- `git diff --stat c199591` → **vazio**. Zero código alterado.
- As 19 tabelas pré-existentes mantêm as contagens: `cotas` 7, `saldo_rs` 8,
  `saldo_rs_creditos` 21, `fila_tarefas` 5, `atividade_utilizadores` 18.
  **Nenhum dado existente foi tocado.**

---

## 3. DOCUMENTADOR

### 3.1 ⛔ Três coisas para o operador

**1. Rotar a chave Alchemy** de `desafio-gut/hardhat.config.cjs`. Texto simples,
introduzida em `a2c40ee` (MC89.14) — que **já estava no GitHub antes deste MC**.
O push de hoje não a expôs; ela já estava exposta. Não foi tocada (R5).

**2. O lockfile do frontend está dessincronizado, e bloqueia a CI inteira.**
```
npm error code EUSAGE — package.json and package-lock.json are not in sync
Missing: typescript@5.9.3 · @types/react@19.3.0
         @tanstack/react-query@5.103.2 · @tanstack/query-core@5.103.2
```
O job `install` falha, e `build`/`lint`/`test-functions`/`test-onchain` saem
**skipped**. Remédio de uma linha:
`cd desafio-gut/frontend && npm install --package-lock-only`.
⚠️ **Não o apliquei** — HARD GATE 3 deste MC proíbe alterar ficheiros.
E é isto que explica porque o Netlify constrói e a CI não: o `netlify.toml` usa
`npm install --legacy-peer-deps` (tolerante), a CI usa `npm ci` (estrito).

**3. `test_limiteMaxLancesUnicos()` do Foundry falha**, e **não é regressão
nossa**. `git log df691cf..c199591` nos caminhos do contrato e do teste vem
**vazio** — nada mudou. O último verde foi a **2026-08-10**, o nosso a
**2026-09-25**, e o workflow usa `foundry-rs/foundry-toolchain@v1` **sem versão
fixada**. O teste faz 10 000 `darLance` em ciclo e estoura o tecto de gas
(1 073 719 444 ≈ 2³⁰). Remédio: fixar a versão do Foundry, ou baixar o ciclo.

### 3.2 ⚠️ Facto operacional que não posso deixar passar

O push respondeu:
```
remote: Bypassed rule violations for refs/heads/main:
remote: - Changes must be made through a pull request.
remote: - 2 of 2 required status checks are expected.
```
104 commits entraram em `main` **sem PR e sem status checks verdes**, porque a
conta tem direito de bypass. Não usei `--force` nem nenhuma flag de contorno — o
git fez o push normal e o GitHub permitiu. Mas se aquela proteção existe por
desenho, isto é uma decisão a tomar.

### 3.3 Decisões do operador (R18)

| # | Decisão | Onde está registada |
|---|---|---|
| 1 | Aplicar a migração a produção **agora** | SEG1.1 · SEG2.1 · aqui |
| 2 | **Push dos 104 commits primeiro**, depois `--prod` | SEG1.2 · SEG3.0 · aqui |
| 3 | **Não correr `--prod`** — o auto-deploy já publicou o mesmo commit | SEG3.2 · aqui |

### 3.4 Declaração de R15

Uma só: o DDL foi passado ao `apply_migration` **sem o `BEGIN;`/`COMMIT;`** do
ficheiro (linhas 35 e 123), porque o MCP já envolve a query numa transacção e um
`COMMIT` aninhado fecharia a transacção da ferramenta a meio. **Zero linhas de
DDL alteradas** — não é reescrita de schema. O ficheiro `.sql` no repositório
ficou intacto.

### 3.5 Declaração de R19 (ativada)

O SEG-1 atestou que o MC **não era autossuficiente como escrito**: `--prod --build`
publicaria 104 commits de frontend e seria revertido pelo próximo merge. A
ampliação proposta foi **pôr o `origin/main` em dia antes do deploy**, e o
operador escolheu-a. Sem ela, o MC94 encontraria o backend desaparecido.
⇒ A ampliação evitou um `.1` — e provou-se certa: o auto-deploy disparou de
facto, e foi ele que publicou.

### 3.6 Métrica de eficiência do HARD GATE 2 (SEG5.6)

**O SEG-1 mediu o estado real sem supor?** Sim, e o valor é quantificável:
duas premissas do enunciado eram falsas (MCP do Netlify; nome dos endpoints), uma
estava subestimada (o auto-deploy, que era 104 commits de drift e não uma
possibilidade vaga), e o critério de aceitação do SEG3.4 era **satisfeito por
lixo**. Se este MC tivesse arrancado no SEG0 sem questionar, teria: procurado um
MCP que não existe, validado `/feedback` (que não existe) por código HTTP contra
um SPA fallback, e deixado a produção a ser revertida pelo primeiro dependabot.

---

## 4. Estado final

| | antes | depois |
|---|---|---|
| tabelas em `public` | 19 | **21** |
| migrações aplicadas | 9 (última 2026-08-03) | **10** (`20260925002324`) |
| produção serve | árvore de 2026-08-18, sem `commit_ref` | **`c199591`, com `commit_ref`** |
| `origin/main` | 104 commits atrás | **convergido** |
| `/ranking` | 200 · text/html (ausente) | **200 · JSON, a ler a tabela** |
| `BONUS_EMISSAO_ATIVA` | ausente | **ausente** (dry-run mantido) |

**O MC94 está desbloqueado.** A canalização funciona e a electricidade está
ligada — e ficou registado onde os fios estão à vista.

---

## 5. Adenda — o push de documentação e um falso alarme

O commit final (`6f3e519`, só `_logs/` + `CLAUDE.md`) foi empurrado, porque
deixá-lo local recriaria o drift descrito em N4. O push disparou um build que
ficou em **`state: error`** — e não é uma falha:

```
Failed during stage 'checking build content for changes':
Canceled build due to no content change
```

O Netlify viu que o output de build era idêntico e cancelou. **Cancelamentos são
registados como `error`**, o que se confunde facilmente com um build partido.

Verificado depois: `published_deploy` continua `6ab5bf47…` (`c199591`, ready) e
`GET /ranking?cicloId=teste` continua `200 · application/json`. Produção intacta.

> **Regra:** no Netlify, ler o `error_message` antes de tratar um `state: error`
> como falha. "No content change" é o Netlify a poupar um build, não um problema.
