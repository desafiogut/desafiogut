# UTAC110e — SEG-1 MEDIÇÃO (ECOQUILDO: moeda social com lastro em R$)

Skill: `desafio-gut/frontend/skills/utac/` (SKILL.md, protocol/hard-gates.md, segments/seg-1.md, types/produto.md).
Registo obrigatório lido antes de começar: `_logs/DEBT.md` (105 l., DEBT-001..DEBT-019; **nenhuma pendência
aberta deste UTAC**; a única aberta é a **DEBT-019** (`solc` no `package-lock.json`) — sem relação com o ECOQUILDO).
**Nada foi alterado neste segmento** (só leitura + este log).

## -1.1 Estado do repo
- Raiz git: `C:/Users/Moltbot/Desktop/DESAFIOGUT`
- `git rev-parse HEAD` → **bb513434047b53ee1639120e246b16879140cfdd** (= `bb51343`) — **bate certo com o baseline do enunciado** (desvio ZERO; o 110d fechou aqui).
- `git log --oneline -3`: `bb51343 docs(UTAC110d-push): migracao aplicada em producao + publicacao verificada` · `f147c3a fix(UTAC110d-front): ressalvas do validador…` · `275a43b feat(UTAC110d-front): dois Passes na UI + creditos de lance visiveis`.
- `git status --porcelain` → **NÃO limpo** (o enunciado diz «limpo»): **6 ` M`** + **30 `??`**.
  - ` M .agents/skills/aidesigner-frontend/SKILL.md`, ` M .agents/skills/aidesigner-frontend/references/api.md`,
    ` M .agents/skills/aidesigner-frontend/references/frontend-rubric.md`, ` M .gitignore` (acrescenta
    `.aidesigner/*` + `!.aidesigner/.gitkeep`), ` M .mcp.json` (acrescenta o servidor MCP `aidesigner`),
    ` M desafio-gut/frontend/package-lock.json` (31+/53−).
  - **Medido (`git diff`)**: nenhuma destas 6 alterações é deste UTAC nem escrita por mim — são pré-existentes
    (aidesigner/MCP do operador e a deriva do `package-lock` já declarada no 110d).
  - `??` (30): `_logs/MC100_*`, `_logs/MC101_*`, `_logs/MC102_*`… não versionados, pré-existentes.
  - **Consequência:** com G1 (ficheiros nomeados no `git add`) isto **não bloqueia**. Nenhum destes ficheiros será tocado.

## -1.2 Caminhos nomeados pelo enunciado (todos medidos, `netlify/functions/` relativo a `desafio-gut/frontend/`)
| caminho nomeado | medido | nota |
|---|---|---|
| `comprar-passe-relampago.mjs` | **8 linhas** | **wrapper fino** — só `respostaPreflight(req) ?? comprarPasseTipado(req,"relampago")` |
| `comprar-passe-programado.mjs` | **9 linhas** | idem, `"programado"` |
| `_lib/passe-pontos.mjs` | 470 linhas | padrão de fidelidade (CAS + `ref` + `reverterMovimento`) |
| `_lib/ledger-lance.mjs` | 169 linhas | padrão do ledger do 110d (CAS duplo + `atualizado_em`) |
| `src/pages/MinhaCarteira.jsx` | 495 linhas | 2 saldos (110d); 3.º a acrescentar |
| `src/hooks/usePontos.js` | 66 linhas | padrão de hook (`apiGet("ler-pontos", {token: authToken})`) |
| **`_lib/comprar-passe-tipado.mjs`** | **165 linhas** | **NÃO nomeado no enunciado — é o handler REAL dos dois Passes** (ver conflito 1) |
| `supabase/migrations/` | 19 ficheiros (último `20261013_utac110d_ledger_lance.sql`) | pasta existe em `desafio-gut/frontend/` |

## -1.3 Modelo de dados actual (medido)
- `public.pontos` (`20261004_mc106dv2_pontos.sql`) — `endereco text PRIMARY KEY, pontos integer, historico jsonb, atualizado_em` + CHECK `pontos >= 0`. **1 linha por ENDEREÇO**.
- `public.pontos` **+3 colunas do 110d** (`20261013_utac110d_ledger_lance.sql`): `creditos_lance int NOT NULL DEFAULT 0 CHECK ≥0`, `pontos_lance int NOT NULL DEFAULT 0 CHECK ≥0`, `historico_lance jsonb NOT NULL DEFAULT '[]' CHECK jsonb_typeof = 'array'`. **A migração FOI aplicada em produção** (`vjslwowwrpcawijdiksm`, registado no 110d §PUBLICAÇÃO).
- `public.palpites` (FK → `pontos`) · `public.resgates` · `public.passes` · `public.cupons`.
- **`public.eco_quildo` NÃO existe** — confirmado por `find … | xargs grep -l "eco_quildo|ECOQUILDO"` limitado a `_lib/*.mjs`, `*.jsx`, `*.sql`: **0 ficheiros** de código. (Os 4 ficheiros que contêm «ECOQUILDO» no repo são de **texto do GUTO/Regulamento** — `_lib/guto-perfis.mjs`, `_lib/guto-regulamento.mjs` e 2 testes deles; **não há tabela, endpoint, lib ou UI** de ECOQUILDO. ⇒ o enunciado confere: «ainda NÃO existe como moeda funcional».) **Nada a renomear, nada a migrar.**
- **Nomenclatura de id**: todas as chaves de titular no repo são endereços Ethereum (`/^0x[0-9a-f]{40}$/`, via `ENDERECO_RE`). O `endereco` do `eco_quildo` segue a mesma convenção (assumido — coerente com `pontos`).

## -1.4 Medições específicas (contratos a seguir — «por leitura», nunca cópia cega)
- **`_lib/ledger-lance.mjs`** — o molde a seguir: `lerLedgerLance` (LANÇA em erro de leitura) · `aplicar()` com **CAS sobre TODOS os contadores + `atualizado_em`** (o 110d fechou um ABA aqui) · idempotência por `ref` no array do histórico · `23505` no INSERT da 1.ª linha → relê e repete · `MAX_TENTATIVAS = 5` · devolve `{ok:false, code}`.
- **`_lib/comprar-passe-tipado.mjs`** — pontos exactos de integração (FRENTE C):
  - `ref = refPasse(tipo, idempotencyKey)` = `passe-<tipo>:<chave>` (o `refPasse` vive em `passe-pontos.mjs`).
  - débito `debitarSaldoRs({endereco, valorCentavos: VALOR_PASSE_CENTAVOS, motivo: nome})` → **CAS**.
  - `creditarPontos(endereco, PONTOS_FIDELIDADE_POR_PASSE, TIPO_COMPRA, ref)` (**10**, não 1 — 110d).
  - **SÓ relâmpago:** `creditarCreditoLance(endereco, ref)`.
  - falhas: `reembolsarSaldoRs(...)` + `reverterMovimento(...)` + `captureSecurityAlert(...)`.
  - resposta 201 `{ok, idempotent:false, tipo, pontosFidelidade, creditosLance?, saldoRsAntesCentavos, saldoRsDepoisCentavos}`; 200 idempotente.
  - **O ponto de inserção do ECOQUILDO é depois do passo do crédito de lance** (relâmpago) / depois dos pontos (programado), com o MESMO `ref` (idempotência de graça) e a MESMA reversão em caso de falha.
- **`ler-pontos.mjs`** (80 l.) — molde do GET: `respostaPreflight` primeiro · 405 · `sistemaPausado` → 503 · `titular(req)` (Bearer → `endereco` do token, NUNCA do query) → 401 `token_ausente|token_invalido` · leitura em `try/catch` → 503 `store_indisponivel`.
- **`_lib/admin-auth.mjs`** — `guardAdmin(req)` (l.191) devolve **`null` se autenticado**, ou uma `Response` de erro já pronta (401 `admin_removido`→403). **É este** o guard dos endpoints de admin (B3/B4). `guardAdminNivel(req,"super-admin")` existe para dinheiro real; o `admin-user-ajuste.mjs` (que mexe em R$) usa-o **e** `adminPode`. ⇒ **decisão de nível para `creditar-eco-quildo` (mexe em lastro/reserva) — ver conflito 5.**
- **`_lib/cors.mjs`** — `CABECALHOS_CORS` com **origem ÚNICA e explícita** `https://localhost` (o APK). O comentário é explícito: «NUNCA `Access-Control-Allow-Origin: *`». ⇒ **o site oficial NÃO é origem autorizada** (ver conflito 4).
- Endpoint pattern de ficheiro: Netlify Functions **v2** (`export default async (req) => Response`). 86 ficheiros em `netlify/functions/`.
- Testes: `_tests/utac110d-dois-passes.test.mjs` (o molde mais próximo); o harness é `scripts/mc966-suite-harness.mjs` (memória: é a suíte **canónica**).

## -1.5 Disco
- `df -h /c` → **14 GB livres** (95% usado). **> 5 GB ⇒ não bloqueia.**
- `node_modules` intactos (não se cria worktree com delete recursivo — A13).

## -1.6 Recursos — A14 (a regra custou 1 hora de limpeza; registo honesto e completo)
Comando canónico: `[int]((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024)`.

| momento | leituras (MB) | veredicto |
|---|---|---|
| 1.ª medição (estado inicial) | **462 · 460 · 519 · 521 · 525** | **< 1.500 ⇒ PARAR pela letra** |
| Máquina medida | **5 877 MB total · 93-95% load · 212 processos**; `MsMpEng` 310 MB, `WhatsApp` 325 MB, Hermes 210 MB | teto estrutural baixo |
| Limpeza autorizada pelo operador («feche o que for necessário») — Edge **sem janela** (`--no-startup-window`, todos `hwnd=0`), webviews não-WhatsApp, SearchHost/StartMenu/OneDrive/RadeonSoftware/MoUsoCoreWorker, PowerShell órfãos | 1 346 → 1 410 → 1 452 → oscila 780-1 435 | **ainda < 1.500** |
| + autorização explícita para fechar **WhatsApp + os 2 MCP `@mcpware`** (escolha do operador na escalada) + **trim de working sets** (`EmptyWorkingSet`, **não fecha nada**) | 1 439 · 1 464 · 1 439 · 1 446 · 1 484 · 1 471 | **pico 1 484 — 16 MB abaixo do limiar** |
| Re-trim + medições concordantes | **1 676 · 1 678 · 1 664** | ✅ **≥ 1.500 (A14 satisfeita)** |
| Trim imediatamente antes da suíte | 2 281 · 2 272 · 2 240 · 2 219 | ✅ |
| **Depois da suíte** | **1 827 · 1 819 · 1 818** | ✅ |

- **Intactos durante toda a limpeza:** esta sessão (`python` 210 MB + `WindowsTerminal`), o agente Hermes, o
  `MsMpEng` (Defender) e o `explorer`. **Fechado só o que o operador autorizou, por escrito, duas vezes.**
- **Instrumento próprio declarado:** o `Get-Counter` (`\Memory\Available MBytes`) **não existe** nesta máquina
  (contadores de performance quebrados, `CounterApiError`) — a leitura foi feita pelo comando canónico da A14 e,
  em paralelo, por `GlobalMemoryStatusEx` (que deu `load` 93-95%, coerente). **A RAM desta máquina oscila
  591→256 MB em minutos** (lição já registada no fecho do 110d) — a A14 foi decidida com **3 leituras
  concordantes**, não com uma.
- **Veredicto A14: SATISFEITA** (3+3+4+3 leituras ≥ 1.500 MB, incluindo as imediatamente antes e depois da suíte).

## -1.7 Suíte baseline (o número do enunciado, medido)
`node scripts/mc966-suite-harness.mjs ambos` (foreground, a 2 219-2 281 MB livres):
```
frontend: VERDE 999/999 pass
backend:  VERDE 1128/1134 pass
VEREDITO: VERDE
```
⇒ **exactamente o baseline declarado** (999/999 · 1128/1134). **Zero deriva.** (Os 6 do backend são `skipped`,
não `failed` — DEBT-001.)

## -1.8 Regulamento 5.0 — CAPÍTULO VII (lido verbatim, `docs/GUTO-REGULAMENTO.md` l.238-252)
| artigo | texto | consequência para este UTAC |
|---|---|---|
| **47º** | moeda social interna, lastro em reais à razão de **1 ECOQUILDO = R$ 1,00** | `reserva_rs_centavos` += **100** por ECOQUILDO emitido |
| **48º** | concedido como benefício da aquisição do **Passe Desafio**; pode ser usado para **I** produtos/serviços no **site oficial** e **II — aquisição de novos Passes Desafio NO APLICATIVO** | **conflito 3** (com R18-110e-2) |
| **49º** | **não convertível em dinheiro, não transferível a terceiros**, circulação restrita | alinha com R18-110e-3 e com o §3 do enunciado ✅ |
| **50º** | a Associação **mantém reserva em reais correspondente ao total emitido** | `reserva_rs_centavos` = lastro integral |
| **51º** | **1 ECOQUILDO de boas-vindas**; cada indicação confirmada dá **2 ao indicante e 1 ao indicado** | os motivos `boas-vindas`/`indicacao` existem na lib; **o wiring não está no escopo** deste UTAC |
| 46º | fora de Manaus/AM pode optar por **receber o valor em ECOQUILDO** | **fora do escopo** (é da loja/entrega, externa) |

## -1.9 Instrumento para a prova da migração
- **Não existe servidor MCP `supabase` na sessão Hermes** (o `config.yaml` tem comfy-cloud/instagram/civitai/fanvue).
- **Existe e está `✔ Connected` na sessão Claude Code** (`claude mcp list`): `supabase` → `https://mcp.supabase.com/mcp?project_ref=vjslwowwrpcawijdiksm` — foi por aí que o 110d aplicou a migração em produção.
- `psql`/`supabase` CLI: **ausentes**. `docker`: presente mas **daemon não corre** ⇒ Postgres local indisponível sem o operador.
- ⇒ o teste da migração «em transacção revertida» (bloco `DO` + `RAISE EXCEPTION`, técnica do MC105a.1/110d) será feito **pelo MCP `supabase` via Claude Code**, com o SQL exacto fornecido por mim.

## ⚠️ Conflitos entre o enunciado e o medido (R20 — não resolvidos pelo executor)
1. **FRENTE C nomeia os 2 endpoints, mas o código real está num 3.º ficheiro.** `comprar-passe-relampago.mjs` (8 l.)
   e `comprar-passe-programado.mjs` (9 l.) são **wrappers finos** de `_lib/comprar-passe-tipado.mjs` (165 l.), que
   serve os dois pelo parâmetro `tipoPasse`. **Resolução (intenção do enunciado, declarada):** o crédito do ECOQUILDO
   entra **uma vez** em `_lib/comprar-passe-tipado.mjs` — os DOIS endpoints passam a creditar, sem duplicar lógica
   (e sem um 2.º caminho que diverge). Não bloqueia.
2. **`reserva_rs -= valor` (§8 B2) contradiz `reserva_rs += 100` (§9 C1) e o nome/dia da coluna.**
   O valor do `usar` é em **ECOQUILDO** (integer); a coluna é **`reserva_rs_centavos`** e o Art. 47º fixa
   1 ECOQUILDO = R$ 1,00 ⇒ **100 centavos**. **Resolução (intenção, declarada):** usar sempre **centavos**
   (`USO: reserva_rs_centavos -= valor*100`; `EMISSÃO: reserva_rs_centavos += valor*100`). Não bloqueia, mas é a
   diferença entre um lastro correcto e um lastro errado por 100× — fica declarado aqui.
3. **Art. 48º II (Regulamento) contradiz R18-110e-2 (operador).** O Regulamento diz que o ECOQUILDO serve para
   **«aquisição de novos Passes Desafio no aplicativo»**; a decisão do operador diz **«só no site oficial, não no app»**.
   ⇒ **escalado como pendência** (correcção do Regulamento é update futuro, como no Art. 16º VI do 110d). **Não bloqueia**
   este UTAC: não se implementa ECOQUILDO→Passe em lado nenhum (§3 do enunciado).
4. **Onde se usa (§R18-110e-2) não é uma origem autorizada no CORS do repo.** `_lib/cors.mjs` fixa
   `access-control-allow-origin: https://localhost` (**só o APK**) e o comentário proíbe `*`. O site oficial
   (`www.grupouniaoetrabalho.com.br`) é **terceira origem** ⇒ um browser **não lê** a resposta do `usar-eco-quildo` a
   partir do site. Opções medidas: (a) o site chama **server-to-server** (sem CORS; o token do titular segue no
   `Authorization`); (b) acrescentar o domínio ao allowlist (toca `cors.mjs` — **global, 86 functions** — **fora do
   AUTORIZA** deste UTAC); (c) o endpoint existe e a integração do site é externa (§3: «NÃO implementa a loja do site»).
   ⇒ **escalado como pendência**; implemento **exactamente** o contrato autorizado (Bearer user-session) e **não toco no `cors.mjs`.**
5. **Nível do `creditar-eco-quildo` não está fixado.** B3 diz «admin: guardAdmin». Mas o `creditar` **emite moeda com
   lastro em R$** (mexe na reserva) — no repo, o único endpoint que mexe em R$ (`admin-user-ajuste`) exige
   **`super-admin`**. ⇒ implemento `guardAdmin` (como o enunciado diz) **e registo** que o nível mínimo é uma decisão
   do operador (subir para `super-admin` = 1 linha).
6. **Esquema da `ref` de idempotência do `usar`** não é dado pelo enunciado (dá `idempotencyKey`, sem prefixo).
   O repo usa prefixos (`passe-<tipo>:<chave>`, `lance:<chave>`). ⇒ proponho **`eco-uso:<chave>`** (e, para o admin,
   `eco-credito:<chave>`), declarado — mantém `ref ≤ 200` e o namespace legível.

## -1.10 Veredito: **SEGUIR**
- RAM **A14 satisfeita** (≥ 1.500 MB em 13 leituras, incluindo antes/depois da suíte).
- Baseline **bate exacto**: 999/999 (frontend) · 1128/1134 (backend) — **zero deriva** desde o fecho do 110d.
- HEAD **bate exacto** com o baseline do enunciado (`bb51343`).
- Todos os caminhos nomeados existem (o desvio do 110d é que o handler real é um 3.º ficheiro — conflito 1).
- Tabela `eco_quildo` **não existe** ⇒ construção limpa, sem migração de dados.
- Os conflitos 1/2/6 são resolvidos pela **intenção medida** (declarados, não silenciados); os conflitos **3, 4 e 5
  são escalados ao operador como pendências** e **não bloqueiam** a implementação autorizada.
- **Próximo:** SEG0 — FRENTE A (migração + `_lib/eco-quildo.mjs`).
