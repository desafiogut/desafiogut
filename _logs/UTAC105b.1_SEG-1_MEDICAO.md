# UTAC105b.1 — SEG-1 · Medição (2026-09-30)

Baseline do enunciado: `5e7ed24`. **Medido: `5e7ed24` ✅ confere** (o UTAC105b fechou precisamente aqui;
`git log -1 5e7ed24` = «chore(UTAC105b): SEG5/SEG6 … + fecho»). Nada foi alterado neste segmento.

## -1.1 Suíte (harness, foreground, da raiz do repo)
`node scripts/mc966-suite-harness.mjs ambos` →
**frontend VERDE 535/535 · backend VERDE 913/919. VEREDITO: VERDE.**
Confere **exactamente** com o enunciado (535/535 · 913/919) — sem desvio de premissa neste ponto.

## -1.2 `cotas.mjs` (607 linhas) — a ação `update-corporativo` (**linhas 470-501**)
| # | medido |
|---|---|
| autenticação | **NENHUMA.** Não lê `Authorization`, não chama `resolverChamador`, não chama `guardAdmin`. Devolve **antes** do `guardAdmin(req)` da linha 503 |
| comentário (l.484) | `// auth: verifica se o email do body bate com o registro (simples, mas eficaz)` — **É FALSO**: nenhuma comparação de email existe. O código só faz `getCota(cliente_id)` e verifica `tipo === "corporativo"` |
| o que escreve | `empresa`, `segmento`, `site`, `logoUrl`, `email`, `updatedAt` (via `upsertCota`) |
| campos protegidos | `cnpj`, `tipo`, `categoria`, `vendida`, `valor` **não** vêm do body (preservados) — o dano é limitado à identidade/contacto da empresa |
| prova do defeito | `POST cotas?action=update-corporativo` com `{cliente_id}` de uma cota corporativa conhecida **sem qualquer token** → 200 e a cota é alterada. Vulnerabilidade confirmada por leitura (PoC real no SEG0) |

## -1.3 Consumidores de `update-corporativo` (**1 só**)
```
src/pages/CorporativoDashboard.jsx:100   await apiPost("cotas?action=update-corporativo", {…})   ← 2 argumentos
netlify/functions/cotas.mjs:471          (definição da ação)
```
(Lido com `--include=*.jsx/--include=*.js/--include=*.mjs` sobre `src/` e `netlify/`; os `dist/` e
`android/…/assets` só contêm o mesmo código já compilado — ruído, não consumidores.)

### ⛔ O painel **NÃO ENVIA TOKEN** — medido, não presumido
- `src/lib/api.js:60` — `apiPost(path, body, { token, signal, keepalive, headers } = {})` e
  `montarHeaders(token, …)` só acrescenta `Authorization: Bearer` **se `token` vier no 3.º argumento**.
  **Não há injecção automática** (não lê `localStorage`, não conhece o contexto).
- `CorporativoDashboard.jsx:100` chama `apiPost(...)` com **apenas 2 argumentos** → **sem header**.
- Comparação: no **mesmo ficheiro**, `CorporativoDashboard.jsx:189 e 210` usam
  `fetch(…, { headers: { Authorization: \`Bearer ${i}\` } })` para os produtos — o painel **sabe** enviar
  token; só não o faz no `update-corporativo`.
- O painel **tem** o token à mão no contexto (`AppContext` expõe `authToken`/`obterAuthToken`, usados na
  linha 107-108 do mesmo ficheiro para o analytics).

⇒ **P10 accionado: aplicar o 401 como está QUEBRA o dono legítimo.** O botão «Salvar» do painel
passaria a devolver 401 e a edição dos dados da empresa deixaria de funcionar.

## -1.4 `produtos.mjs` — referência MC89.38 (linhas 296-354)
Padrão: com `body.cliente_id` presente →
(a) `cliente_id` == endereço do JWT → passa; senão
(b) admin (`autenticarAdmin`) → passa; senão
(c) cota cujo campo `endereco` == endereço do JWT → passa; senão
→ **403 `endereco_nao_corresponde`**. Leitura de cota que falha → `null` (**fail-closed**).

## -1.4b ⚠️ Segundo defeito (medido): o MC89.38, aplicado tal e qual, também bloquearia o dono
- `cotas.mjs:396` — o `cliente_id` de uma cota pode ser **`cnpj:<números>`** (cadastro directo do
  MC12.3.1), não um endereço `0x…`.
- O próprio `produtos.mjs:309-326` declara a consequência: «hoje **NENHUMA** das 7 cotas tem o campo
  `endereco` preenchido (F0). Logo o ramo (b) não salva ninguém neste momento, e um lojista de cadastro
  directo que tente … leva 403».
- ⇒ Com o token (depois de corrigido o frontend), um dono cuja cota seja `cnpj:XXXX` continuaria a levar
  **403**, porque nem (a) nem (b) conseguem demonstrar posse.
- **Não medi as cotas em produção** (o UTAC não autoriza leitura do Supabase): cito a medição do
  MC89.38 como documento, não como medição minha.

## -1.4c 🟢 O padrão de guarda JÁ EXISTE no próprio `cotas.mjs`
A ação vizinha (`consultar` por `cliente_id`, linhas 294-313) já faz exactamente isto:
`resolverChamador(req)` → **401** `token_ausente` se `papel === "anon"` → `getAdminAddresses()` →
`validarOwnerOuAdmin({endereco}, endereco, admins)` → **403** se não for dono nem admin.
⇒ A correcção é **reutilização**, não invenção (GATE 5): `resolverChamador`, `validarOwnerOuAdmin`,
`getAdminAddresses` e `jsonError` já estão no ficheiro. `resolverChamador` **já aceita admin** (l.169).

## -1.5 Disco
`df -h /c` → **13 G livres** (≥ 5 GB). **SEGUE** neste ponto.

## -1.7 VEREDITO DO SEG-1: **PARAR** — reportar ao operador antes de tocar
Dois bloqueios, ambos fora do que o UTAC autoriza sozinho:

1. **P10 (bloqueio principal):** o painel corporativo **não envia token**. A correcção exige alterar
   `src/pages/CorporativoDashboard.jsx` (1 linha: `..., { token: authToken })`). O enunciado diz
   «NÃO AUTORIZA alterar o frontend (excepto se o painel não enviar token — **reportar antes de
   tocar**)». É este o caso. **Paro aqui.**
2. **Bloqueio secundário:** o MC89.38 (a)/(b) não demonstra posse de uma cota com `cliente_id`
   `cnpj:XXXX` sem `cota.endereco` preenchido → o dono legítimo levaria 403. Precisa de decisão do
   operador (preencher `endereco`, aceitar o 403 documentado, ou outra prova de posse).

**Não toquei em nenhum ficheiro.** Nenhum dado foi lido em produção. Nenhum commit feito.
