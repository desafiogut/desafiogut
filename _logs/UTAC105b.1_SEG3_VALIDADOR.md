# UTAC105b.1 — SEG3 · VALIDADOR ADVERSARIAL (commit `828f719`)

> **NOTA DE TRANSCRIÇÃO (executor, R3/R8).** O validador adversarial independente correu,
> construiu o seu próprio ambiente **fora do repo** (`C:/Users/Moltbot/tmp-utac105b1v/`: sonda
> `val-probe.mjs` com 40 casos, mutador `mut-val.mjs` com 18 mutantes, `impacto.mjs`) e produziu o
> veredicto abaixo, mas **esgotou o orçamento de iterações antes de o gravar**. O texto é **dele,
> verbatim** — o executor limitou-se a transcrevê-lo para o ficheiro, sem alterar uma linha do
> corpo. As frases dirigidas «ao agente pai» foram mantidas (são parte do original).
> O executor **não** atribui a si este veredicto.

# UTAC105b.1 — SEG3 · VALIDADOR ADVERSARIAL (commit `828f719`)
**Mandato: TENTAR REFUTAR.** Alvo: autenticação em `cotas.mjs?action=update-corporativo` (MC89.38) + token no painel.

## 0. Identidade, escopo e erratas de premissa
- Commit `828f719` = **7 ficheiros**, não 3: `cotas.mjs`, `CorporativoDashboard.jsx`, `_tests/utac105b1-cotas.test.mjs` **+ 4 `_logs/`**. Errata benigna (autodocumentação, declarada na mensagem). Nenhum ficheiro fora do autorizado.
- `cotas.mjs`: **647 linhas = 607 do `5e7ed24` + 40**. Blocos antes/depois do ramo: byte-idênticos. **1 hunk, +42/−2**; o JSX **1 hunk, +5/−1**. Nenhuma migração, schema, `_lib/`, CLAUDE.md ou `git add -A`.
- ⚠️ **O `828f719` está PUBLICADO em `origin/main`** (`main...origin/main` limpo). O outro thread (UTAC000.2) empurrou-o no `fbec18b`. Nada disso tocou nos 3 ficheiros. O risco de auto-deploy foi real e já se realizou.
- **Errata de md5:** o `3965732626899a1bee96ffe7586d8ac3` é a renderização **CRLF** do blob; a árvore é **LF** = `4bfca3a8e7526a9794e3755ee7dee446` (= «depois» do SEG1). Medido: `tr -d '\r'` na árvore = blob. Não houve desvio no repo; foi a **minha régua** a mentir (`.gitattributes` diz `*.mjs text eol=lf` e o `git diff` mostra CRLF).
- Errata menor: o token no painel está na **l.103**, não ~100.

## 1. A autenticação é REAL (lida, não acreditada)
`resolverChamador` (l.165-181): admin por `autenticarAdmin` (Bearer admin-JWT + `getAdminAddresses`); senão o header tem de começar literalmente por `"Bearer "` (sensível a caixa e a espaço), senão **anon**. Guarda l.499-525: anon→**401**; `getCota` em try/catch→**502**; não-admin: `ehProprio` (normalizado) **ou** `vinculado` (`cota.endereco` normalizado) senão **403**; só depois 404/`tipo` e a escrita. **Confirmado: a guarda é código, não comentário.**

## 2. Bypasses tentados — todos medidos, ZERO encontrados
| vector | resultado medido |
|---|---|
| `bearer tok`, `Token tok`, `Bearer`, `Bearer `, `Bearer\t`, header vazio | **401** (todos) |
| **duas** headers `Authorization` | undici funde em `"Bearer a, Bearer b"` → JWT inválido → **401** |
| JWT `admin-access` **válido** de quem **não** está em `getAdminAddresses` | **403** (guard `admin_removido`); tratado como user. Infalsificável sem `JWT_SECRET`+lista |
| `cliente_id` + espaço / MAIÚSCULAS / `%20` literal / `\u0000` | 403 (espaço, `%20`, `\0`) · **404** (maiúsculas) |
| `cliente_id` number/array | **400** |
| `__proto__`/`constructor` em JSON cru | **200**, sem poluição; 5 campos protegidos preservados (whitelist por spread) |
| corpo com `endereco: OUTRO` | ignorado (não é campo do ramo) |
| ordem 401/403 vs 404 | 401/403 **antes**; sem oráculo de existência |
| `tipo != corporativo` | dono **404**, estranho **403** |
| token **expirado** | **401** |
| falha de leitura do store | **502**, gravou=0 — para **user E admin** (fail-closed real) |
| ramo `vinculado` forçado | só se o atacante tiver JWT do endereço de `cota.endereco` — é a regra MC89.38 |

Efeito de escrita sempre conferido: nos casos recusados **`gravacoes = 0`** e a cota fica `"Original"`.

## 3. Frontend — o dono não ficou bloqueado
`authToken`/`obterAuthToken` existem mesmo em `useAppContext()` (l.25); `apiPost` só põe Bearer no 3.º argumento; `CorporativoDashboard.jsx:103` usa o idioma já presente 3× no ficheiro (245/286/306). Único consumidor de `update-corporativo` = essa chamada. O formulário de edição é alcançável independentemente do `tipo`, logo o novo 403 não cria becos sem saída na UI.

## 4. Suíte e testes
- **Suíte (canónica, TTY): `frontend: VERDE 535/535` · `backend: VERDE 929/935` · VEREDITO: VERDE** (535 inalterado; 913+16=929 — aritmética fechada).
- **Ficheiro: 16/16 VERDE**, medido por mim (`node --test --experimental-test-module-mocks`).
- **Mutação minha, sobre a CÓPIA, snapshot binário + md5 restaurado idêntico:** os **8 mutantes do executor morrem todos**, e **VAL-M1 (remover o bloco inteiro da guarda) mata A3–A8/A10/A13** → **os testes NÃO são vacuosos: mordem a guarda verdadeira.** O executor **subdeclara** o M7 (mata A8, e não A4). Dois mutantes meus **sobreviveram** (V6, V7) — ver achados.

## 5. Achados

**⚠️ F1 — O ramo irmão `register-corporativo` continua SEM autenticação e SOBRESCREVE a cota da vítima (GRAVE; fora do escopo do `828f719`, mas da mesma classe P0).**
Medido no código real: `POST cotas?action=register-corporativo` **anónimo** com `{endereco: <0x da vítima>, cnpj: <CNPJ novo válido>, empresa:"INVASOR2"}` → **201** e `upsertCota(clienteId, registro)` sobrescreve a cota da vítima: `empresa`, e via `colunas()` também `cnpj`, `email`, `categoria:null`, `vendida:false`, `payload` — **destrói `valor`/`categoria`/`vendida`** (o valor pago). Com o **próprio CNPJ da vítima** também dá **201** (mesmo `cliente_id`, o 409 de duplicidade não dispara) e troca a `empresa`. O `endereco` vem **do corpo**, sem prova de posse.
*Tratamento proposto:* UTAC novo (P0) — exigir `Bearer` user-session e `endereco == JWT.endereco` (ou admin) antes do ramo; nunca aceitar `endereco` do corpo como identidade. Enquanto isso, considerá-lo **P0 aberto**.

**⚠️ F2 — Lacuna de teste V6: `.toLowerCase()` do lado da COTA não é exercido.**
Removê-lo **não mata nenhum dos 16** (o store normaliza a coluna), mas é a rede de segurança para payloads legados com `endereco` em caixa mista → o **dono legítimo levaria 403**. Não é bypass (endurece), é **risco de regressão de dados**.
*Tratamento proposto:* teste A17 — `endereco` da cota em EIP-55 + `cliente_id` `cnpj:` → esperar **200**.

**⚠️ F3 — Lacuna de teste V7: mover o 401 para DEPOIS da leitura não mata nenhum teste, mas muda comportamento.**
Medi com sonda própria: anon + store em baixo → **502 em vez de 401** (oráculo de disponibilidade do store a anónimos). Os testes não fixam a ordem 401-antes-da-leitura.
*Tratamento proposto:* teste A18 — sem token **e** `getCota` a rebentar → esperar **401** (hoje dá 401; V7 dava 502).

**ℹ️ N1 — Ausência de `cliente_id` responde 400 antes da auth** (sem token → 400, não 401). Não revela nada (o `cliente_id` é do atacante); é só divergência de forma face ao irmão.
*Tratamento:* aceitar; ou mover para 401 por coerência. Nota escrita.

**ℹ️ N2 — Interacção latente que passa a ter dentes:** `colunas()` (cotas-store.mjs:28) grava **sempre** `endereco: registro?.endereco ?? null`. `update-corporativo` faz spread de `existenteUpdate`, logo **preserva** o `endereco` (medido: payload mantém-no). Mas o **POST genérico de admin** (`cotas.mjs:567-580`) constrói registo **sem `endereco`** e faz upsert → **apaga a coluna `endereco` dessa cota**; e agora que o ramo (b) depende dessa coluna, essa cota **perde o vínculo e o dono passa a levar 403**.
*Tratamento proposto:* no POST genérico, preservar `endereco` de `existente` (1 linha, `endereco: existente?.endereco ?? null`). Pré-existente, fora do escopo deste UTAC — registar.

**ℹ️ N3 — Cobertura do `autenticarAdmin` real:** os 16 testes mockam `autenticarAdmin`, logo não provam a integração «JWT de admin válido mas removido da lista → 403». **Cobri-a eu** (token `admin-access` de endereço não-admin → **403**). Vale como verificação do validador, não do UTAC.
*Tratamento:* nota no rodapé do teste ou caso extra com o guard real.

**ℹ️ N4 — Erros do executor, declarados e verificados:** o M1 deixado aplicado (md5 `b2a88129…`) — confirmo que o ficheiro **não** ficou contaminado; e a previsão errada do M4 (que agora o próprio rodapé regista). Conduta correta (R8); o restauro à mão foi eficaz.

## 6. Veredicto
A guarda é real, fail-closed, não tem bypass que eu tenha conseguido construir (30+ vectores), recusa **e não grava**, o dono e o admin continuam a funcionar, os testes são **não-vacuosos** (mordem a guarda), a suíte está **VERDE (535/535 · 929/935)**, e o escopo é cirúrgico. As ressalvas são: **o ramo irmão continua explorável (F1, fora do escopo deste commit mas P0 para o operador)**, duas lacunas de teste de consequência moderada (F2/F3) e notas de robustez.

**APROVADO COM RESSALVAS**

---

## Pendência para o agente pai
- **Não escrevi** `C:/Users/Moltbot/Desktop/DESAFIOGUT/_logs/UTAC105b.1_SEG3_VALIDADOR.md` (limite de iterações atingido antes do `write_file`). O conteúdo acima é o veredicto completo e pode ser gravado tal-e-qual.
- **Não alterei nada no repo** (só leituras; mutações e sondas correram sobre a cópia em `C:/Users/Moltbot/tmp-utac105b1v/`, md5 restaurado idêntico). Não toquei em Supabase/Netlify/produção.
- Artefactos meus (fora do repo): `tmp-utac105b1v/frontend/…/_tests/val-probe.mjs` (sonda, 40 casos), `tmp-utac105b1v/mut-val.mjs` (18 mutantes), `tmp-utac105b1v/impacto.mjs` (impacto de V6/V7).
