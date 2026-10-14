# UTAC110g — SEG-1 — MEDIÇÃO (antes de criar)

**Data:** 2026-10-13 · arranque `23:42:33` (carimbo da 1.ª chamada da ronda) · suíte `23:44:22` → `23:48:51`
**Repo:** `C:/Users/Moltbot/Desktop/DESAFIOGUT`
**Baseline declarado no enunciado:** `2579b51` (pós-110f-front)

---

## 1. Identidade e estado do repo

| Item | Medido | Esperado | Veredicto |
|---|---|---|---|
| `git rev-parse HEAD` | `2579b51eb1d1293fcc84068d51434ca917f190b1` | `2579b51` | ✅ confere |
| branch | `main` | — | — |
| último commit | `fix(UTAC110f-front): achados do validador SEG4 + fecho (logs, R14)` | — | — |

`git status --porcelain`: **NÃO limpo** — 6 ficheiros `M` + 30 `??`, **todos PRÉ-EXISTENTES** (nenhum tocado por esta ronda):

```
 M .agents/skills/aidesigner-frontend/SKILL.md
 M .agents/skills/aidesigner-frontend/references/api.md
 M .agents/skills/aidesigner-frontend/references/frontend-rubric.md
 M .gitignore
 M .mcp.json
 M desafio-gut/frontend/package-lock.json      ← o padrão conhecido do build da Netlify (15.j/15.i)
```

Os 30 `??` são `_logs/MC100_*.md` + artefactos de sessões anteriores. **Conduta:** não se toca em nenhum
deles (nunca `git checkout -- <f>` num ficheiro mutado que não é meu); o commit desta ronda é feito por
`git add` **individual** dos ficheiros que eu próprio crio/edito. O desvio é declarado à cabeça (o enunciado
previa «limpo (ou só package-lock pré-existente)» — há mais quatro, todos de outra sessão).

## 2. RAM (A14 — medir 3×)

| Leitura | MB livres |
|---|---|
| 1 | 1722 |
| 2 | 1726 |
| 3 | 1734 |

Todas **≥ 1 500 MB** ⇒ A14 **cumprida**, medição válida. (Métrica: `FreePhysicalMemory`/1024, a canónica da
skill `windows-memory-pressure`.)

## 3. Suíte baseline (harness canónico, foreground, `< /dev/null`)

```
node scripts/mc966-suite-harness.mjs ambos < /dev/null
→ frontend: VERDE 1033/1033 pass
→ backend:  VERDE 1194/1200 pass
→ VEREDITO: VERDE   (rc=0)
```

**Reproduz EXACTAMENTE** o baseline declarado (1033/1033 · 1194/1200). Sem regressão de partida.

## 4. Inventário (medido ficheiro a ficheiro)

| Ficheiro | Linhas | Papel |
|---|---|---|
| `netlify/functions/resgatar-cartao.mjs` | 124 | endpoint do resgate (UTAC106g) |
| `netlify/functions/_lib/resgates.mjs` | 85 | store de `public.resgates` |
| `netlify/functions/_lib/pedidos.mjs` | ~500 | `validarMorada`, `validarNfe`, CAS dos pedidos |
| `netlify/functions/_lib/passe-pontos.mjs` | 470 | `PONTOS_POR_CARTAO=50`, `pontosDeCompra` (pura), `registarResgate`, `reverterMovimento` |
| `netlify/functions/ler-pontos.mjs` | 97 | leitura do titular (Bearer `user-session`) |
| `netlify/functions/login-diario.mjs` | 53 | +5 pontos de lance, 1×/dia de Manaus |
| `netlify/functions/_lib/fontes-lance.mjs` | 109 | `diaManaus`, `estadoMissoesHoje` |
| `netlify/functions/_lib/ledger-lance.mjs` | 169 | ledger de lance (3 colunas da MESMA linha de `pontos`) |
| `src/context/AppContext.jsx` | — | efeito do login diário (l. ~916-926) |
| `src/hooks/usePontos.js` | 80 | hook dos pontos; `refetch` só em `[address, authToken]` |
| `src/components/ResgatarCartaoModal.jsx` | 148 | **já existe** (UTAC106g) |
| `src/hooks/useResgatarCartao.js` | 78 | **já existe** (UTAC106g) — com guarda de corrida `emCurso` (useRef) |
| `src/pages/OfertasProgramadas.jsx` | 495 | **botão «🎁 Resgatar cartão» já existe** (≥ 50 pontos de CARTÃO) |

### 4.a `public.resgates` — colunas necessárias

Migração `desafio-gut/frontend/supabase/migrations/20261006_mc106g_resgates.sql`:

```
id BIGSERIAL PK · endereco TEXT NOT NULL REFERENCES public.pontos(endereco) ON DELETE CASCADE
cartao_id TEXT NOT NULL · morada JSONB NOT NULL
status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviado','entregue','cancelado'))
idempotency_key TEXT NOT NULL UNIQUE · criado_em · atualizado_em
+ índices por endereco e por status · RLS só para service_role (GRANT SELECT/INSERT/UPDATE)
```

⇒ **Todas as colunas necessárias EXISTEM. Não é precisa migração nenhuma** (B3 não se aplica).

### 4.b `resgatar-cartao.mjs` — o que já valida/captura (por leitura + testes)

| Ponto do B2 | Medido | Onde |
|---|---|---|
| valida `pontosCartao ≥ 50` (não `pontos`) | ✅ | `registarResgate` → `podeResgatarCartaoComCompra` → `pontosDeCompra` (R1 do 106f) |
| captura a morada no body | ✅ | `validarMorada(body?.morada)` (`resgatar-cartao.mjs:84`) |
| regista em `public.resgates` com estado `pendente` | ✅ | `criarResgate` (`resgates.mjs:72`) |
| debita 50 pontos | ✅ | `debitarPontos(..., PONTOS_POR_CARTAO, TIPO_RESGATE, refResgate(key))` |
| idempotência | ✅ | chave UNIQUE + `lerResgatePorChave` + `ref` do débito |
| rollback se o registo falha | ✅ | `reverterMovimento` (integral, B1 do 106g) |
| devolve o ID do pedido | ✅ | `{ resgateId, status, pontos }` |
| notificação ao titular (in-app) | ✅ | `adicionarNotificacao` — mas o texto **não** menciona o prazo |
| e-mail de confirmação | ❌ | não existe |
| estado do pedido visível ao titular | ❌ | `lerResgates` **não tem consumidor** (`git grep` só devolve a definição) |
| «Nota Técnica» | ❌ | não existe |

Testes já existentes no baseline: `_tests/resgates.test.mjs` (13 testes, incl. toda a bateria do B4: 50→201,
48+2→402, idempotência→200, CEP inválido→400, rollback, retry, exactamente 50, sem Bearer→401) ·
`src/pages/__tests__/utac106g-resgate.test.mjs` (6: botão activo/inactivo, clique abre o balão, POST com
Bearer, 402, regra do formulário) · `_tests/ler-pontos.test.mjs` (12) · `src/__tests__/utac110f-login-diario.test.mjs` (5).

---

## 5. ⚠️ PREMISSAS DO ENUNCIADO REFUTADAS POR MEDIÇÃO (antes de escrever código)

O HARD GATE «medir antes de criar» exige confrontar o enunciado com o que o HEAD realmente tem. **Quatro**
premissas não descrevem o `2579b51`:

1. **«Falta a UI (botão «Resgatar cartão» quando ≥ 50 pontos)»** — **FALSO.** O botão «🎁 Resgatar cartão»
   existe em `src/pages/OfertasProgramadas.jsx:327-336`, gate `podeResgatarCartao`, e o balão
   `ResgatarCartaoModal.jsx` + o hook `useResgatarCartao.js` existem desde o **UTAC106g**. O ecrã não é a
   Carteira: é o ecrã «Ofertas Programadas». A FRENTE D não é trabalho novo — é trabalho **já feito**.
2. **«O endpoint `resgatar-cartao` … nunca foi testado com pontos reais»** — **FALSO.** Há 13 testes do
   resgate (`_tests/resgates.test.mjs`) desde o 106g, com a bateria completa do B4.
3. **«P-1: `ler-pontos` lê a mesma linha `pontos` 2× (uma para `pontos`, uma para `pontosCartao`)»** —
   **NÃO é o que o código faz.** `ler-pontos.mjs:63` chama `lerPontos` **UMA** vez e deriva
   `pontosCartao` de `pontosDeCompra(registo)`, que é **pura** (`passe-pontos.mjs:338-344`, só faz
   `reduce` sobre o histórico já lido). **A leitura dupla REAL é outra:** `missoesDeHoje()` →
   `estadoMissoesHoje()` → `lerLedgerLance()` faz um **2.º SELECT na mesma linha** (`fontes-lance.mjs:65`
   → `ledger-lance.mjs:56`, `.select(endereco,creditos_lance,pontos_lance,historico_lance,atualizado_em)`),
   e os dois SELECTs são **em série**. É exactamente o achado **F4** do validador do 110f-front. O alvo
   medido é esse; a descrição do enunciado (par `pontos`/`pontosCartao`) já não existe no HEAD.
4. **«A morada é capturada onde? (modal? perfil?)»** — respondido pelo código: **no modal do momento do
   resgate** (`ResgatarCartaoModal`), coerente com a decisão R18-110g-4. Não há morada em perfil.

As premissas 1 e 2 **reduzem** o trabalho (não o aumentam): a FRENTE B é **verificação** e a FRENTE D é
**declaração**. As premissas 3 e 4 **reorientam** o alvo da FRENTE A.

**RESSALVA do enunciado accionada?** «Se o `resgatar-cartao` existente estiver **muito diferente** → PARAR».
Medido: **não está muito diferente — está igual ao que o B2 pede** (tabela do §4.b). Entre «muito diferente»
e «igual» não há paragem; há verificação. O que **falta** (e-mail, Nota Técnica, estado do pedido visível)
é da FRENTE C e **exige decisões novas** do operador (§ abaixo) — isso escala-se, não se inventa.

## 6. Alvos da FRENTE A — confirmados por leitura

| | Defeito | Ficheiro/linha medida | Fix |
|---|---|---|---|
| **F2** | `login-diario` corre sem `await` e **nada relê os pontos** quando ele termina ⇒ numa carga directa de `/carteira` o `ler-pontos` pode ler ANTES do crédito do dia (aparece «⏳ Login diário» e «Você ganhou 0 pontos hoje») | `AppContext.jsx:917-925` (`.then` só faz `delete` da chave em caso de falha) | incrementar um `pontosNonce` no `.then` de sucesso; o `usePontos` passa a depender dele ⇒ refetch |
| **P-1 (real, = F4)** | 2.º SELECT da MESMA linha de `pontos` por pedido, em série | `ler-pontos.mjs:75` → `fontes-lance.mjs:65` → `ledger-lance.mjs:56` | derivar as missões do `registo` JÁ lido (`historico_lance` vem no `select("*")`) com uma função **pura** nova em `fontes-lance.mjs` |
| **P-2 (= F8)** | o dia de Manaus muda às 04:00 UTC e nada relê: `estadoMissoesHoje` calcula `diaManaus(new Date())` no momento da chamada; o `usePontos` só relê em `[address, authToken]` | `fontes-lance.mjs:63-68` · `usePontos.js:75-77` | tick horário que incrementa o mesmo nonce ⇒ releitura (recomendação do enunciado) |

## 7. Conclusão do SEG-1

- A14 ✅ (1722/1726/1734 MB) · baseline ✅ (1033/1033 · 1194/1200) · HEAD ✅ `2579b51`.
- **FRENTE B:** já cumprida no HEAD (endpoint + testes + migração existente) ⇒ passa a **verificação com
  prova bidireccional**, e fecha-se com o que faltar de cobertura (guarda de corrida do hook).
- **FRENTE D:** já cumprida no HEAD (noutro ecrã). **Não se duplica** (GATE 3/4).
- **FRENTE A:** 3 alvos reais, agora com o alvo do P-1 corrigido por medição.
- **FRENTE C:** in-app existe (texto a completar com o prazo de 30 dias, R18-110g-3); **e-mail** e
  **estado do pedido visível** estão em falta e **dependem da decisão em §8**.

## 8. Pendências de decisão escaladas AO OPERADOR (não se inventa — GATE 2)

**D-110g-1 — e-mail de confirmação (`C1-email`) e «Nota Técnica» (`C2`): não há DESTINO medido.**
O JWT do titular só traz `{ endereco, tipo }` (`_lib/jwt.mjs:67-80`); `validarMorada` (`pedidos.mjs:64-86`)
não tem campo de e-mail; `public.resgates` não tem coluna de e-mail. O **único** e-mail que o sistema
conhece é o **do login Privy**, que existe no **cliente** (`AppContext.jsx:482`, `MinhaCarteira.jsx:88`:
`user?.email?.address || user?.google?.email || user?.apple?.email`). Opções medidas:
 (a) o cliente envia `email` no corpo do `resgatar-cartao`, o servidor usa-o **só para enviar** (não o
     persiste — respeita o espírito da R18-110g-4, «evita armazenar dados sem uso»), valida-o e envia por
     `_lib/email.mjs` (SendGrid) em fail-soft;
 (b) migração aditiva + campo no modal + coluna em `resgates` (persiste o e-mail);
 (c) não enviar e-mail.
**Recomendada: (a).** Requer autorização do operador porque **acrescenta um campo ao contrato do corpo**.

**D-110g-2 — «estado do pedido visível» (`C3`): exige endpoint e ecrã NOVOS.** `lerResgates` existe mas
**não tem consumidor**; não há endpoint que exponha os resgates ao titular, nem ecrã «Meus Pedidos» (medido:
`git grep "Meus Pedidos" -- src` → vazio). O «NÃO AUTORIZA» proíbe backend fora da lista ⇒ **não se cria**.
Candidato a `110g-front`/UTAC próprio: 1 endpoint `ler-resgates.mjs` + secção na Carteira.

**D-110g-3 — «Emitir Nota Técnica»:** o enunciado diz «não NF-e — é o patrocinador que emite». O software
**não** emite NF-e no resgate (`public.resgates` não tem campos fiscais; `validarNfe`/`definirNfe` são dos
**pedidos do MLC**, não dos resgates). O que é software aqui é, no máximo, o **texto** da nota no e-mail de
confirmação. Precisa da decisão sobre o que é a «Nota Técnica» (conteúdo, quem assina, formato).
