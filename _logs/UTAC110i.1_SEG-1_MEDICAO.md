# UTAC110i.1 — SEG-1 (RE-MEDIÇÃO) — GOOGLE PLAY BILLING (RETOMADA)

**Auto-contido.** O SEG-1 do UTAC110i foi executado por inteiro em 2026-10-15 (ver
`_logs/UTAC110i_SEG-1_MEDICAO.md` e `Desktop/RELATORIO-UTAC110i.txt`) e **não se repete**.
Este ficheiro **re-mede os deltas** entre o fim do 110i e o arranque do 110i.1, porque o
enunciado declara que «a situação mudou» (Pergunta 2 respondida; A1-A4 deixam de bloquear o
código). Nada é alterado neste segmento.

Executor: Hermes (deepseek-v4-flash) · Data: 2026-10-16 · Baseline do enunciado: `a8fe980`

---

## -1.1 Estado do repo (medido)

| item | enunciado 110i.1 | MEDIDO | veredicto |
|---|---|---|---|
| `git rev-parse HEAD` | `a8fe980` | `a8fe980040e4ffc59bc0cef0395c7d71b3e1b47a` | BATE |
| `git status --porcelain` | (não declarado) | SUJO — 6 modificados + `_logs/MC100_*`…`_logs/UTAC106x.2.spec.yml` untracked | DESVIO declarado (abaixo) |
| disco `df -h /c` | (> 5 GB) | `238G` total · `17G` livres (94%) | OK |
| RAM livre (A14) | ≥ 1 500 MB | **973 · 973 · 974 MB** (3×) | DESVIO (ver -1.4) |
| HEAD `origin/main` | `a8fe980` | `a8fe980` | BATE |

**A sujidade do `git status` é PRÉ-EXISTENTE e de OUTRO processo** (instalação do tool de terceiros
`aidesigner`: `.mcp.json`, `.agents/skills/aidesigner-frontend/*`, regra nova do `.gitignore`) mais
`desafio-gut/frontend/package-lock.json` (2026-10-13) e logs untracked de MC100/MC101/MC102.
**Não é deste UTAC.** Não se reverte (regra do operador: ficheiro mutado por OUTRO processo não leva
`git checkout --`) e não se toca. O commit deste UTAC fará `git add` **individual** (G1/G2).
→ Herdado tal-e-qual do 110i §3 (a lista é idêntica).

## -1.2 Existência dos caminhos nomeados (medido)

| caminho do enunciado | MEDIDO | acção |
|---|---|---|
| `capacitor-plugin-cdv-purchase` (npm) | `npm view` → **13.19.1**, peerDeps `@capacitor/core: ^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0` | existe e é compatível com o Capacitor **8.4.2** do repo → instalar |
| `src/lib/google-play-billing.js` | **NÃO EXISTE** | criar (SEG0) |
| `netlify/functions/_lib/google-play-billing.mjs` | **NÃO EXISTE** | criar (SEG1) |
| `netlify/functions/validar-compra-google.mjs` | **NÃO EXISTE** | criar (SEG1) |
| `supabase/migrations/*google_play_compras*` | **NÃO EXISTE** (última: `20261014_utac110e_eco_quildo.sql`) | criar (SEG1) |
| `capacitor.config.json` (nomeado no 110i) | o real é **`capacitor.config.ts`** (TS) | registo (não bloqueia) |
| `desafio-gut/frontend/android/` | **EXISTE** (app, build.gradle, capacitor.settings.gradle, capacitor-cordova-android-plugins) | `npx cap sync android` é viável |
| `src/hooks/useComprarPasse.js` | EXISTE (95 linhas) | adaptar (SEG2) |
| `src/hooks/useRecursosApp.js` | EXISTE (169 linhas) — já expõe `isPagamentoNativoAtivo` | adaptar (SEG2) |

Ferramentas: `supabase` CLI **2.107.0** (projecto **LINKED** a `vjslwowwrpcawijdiksm`) · `netlify`
CLI **26.1.0** · `node` v24.14.1 · `googleapis` 186.0.0 existe no npm (**não** usado — ver -1.5).

## -1.3 Fontes / inventário (medido)

- **Cliente (FRENTE B/D):** `src/hooks/useComprarPasse.js` (contrato `{ comprar, loading, erro, pontos }`,
  `comprar(tipo)` → `{ok,tipo,pontos,creditosLance,idempotent}`); `src/lib/passes.js` (`TIPOS_PASSE`,
  `passeDoTipo`); `src/hooks/useRecursosApp.js` (`isPagamentoNativoAtivo` por plataforma, hoje
  `false:false:false`, **sem nenhum consumidor de produção**); `src/context/AppContext.jsx` (`authToken`
  + `refetchSaldoRs`).
- **Backend (FRENTE C):** `netlify/functions/_lib/comprar-passe-tipado.mjs` (**239 linhas — o código
  REAL da compra**; os endpoints `comprar-passe-relampago.mjs` / `comprar-passe-programado.mjs` são
  wrappers de 9 linhas) · `_lib/passe-pontos.mjs` (10 pts) · `_lib/ledger-lance.mjs` (+1 crédito,
  Relâmpago) · `_lib/eco-quildo.mjs` (+1 ECOQUILDO + lastro) · `_lib/saldoRs.mjs` (débito CAS) ·
  `_lib/jwt.mjs` (`verificarUserSession`) · `_lib/rate-limiter.mjs` · `_lib/system-state.mjs` ·
  `_lib/cors.mjs`.
- **Testes que guardam o caminho Passe (rede de segurança da Frente C):**
  `netlify/functions/_tests/utac110d-dois-passes.test.mjs` (311 linhas) e
  `_tests/utac110e-eco-quildo.test.mjs` — ambos exercitam `_lib/comprar-passe-tipado.mjs` por dentro.
- **Arnês de teste do frontend:** `src/hooks/__tests__/_hook-runner.mjs` (condutor de hooks sem DOM) e
  `_recursos-arnes.mjs` (carrega o hook REAL pelo Vite com só o `supabaseClient` em duplo).

## -1.4 Medições específicas

**(a) RAM — portão A14. DESVIO DECLARADO, medido 3×: `973 · 973 · 974 MB`.**
A máquina tem **5 877 MB** totais (medido no 110i). O tecto prático desta máquina com a escada segura
da skill `windows-memory-pressure` está **abaixo dos 1 500 MB** (`Memory Compression` come o ganho do
trim — 110i §6 e skill §3.1). Não é um portão cumprido; é o **mesmo desvio** já documentado no 110i.
A decisão do §3.2 da skill aplica-se: correr abaixo do limiar, **registando pico/mínimo**, e **PARAR**
se aparecer falha inexplicada. Medição de RAM antes/depois da suíte fica no `SEG3`.

**(b) Env var `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` — AUSENTE (re-medido).**
`netlify env:list --json` → **35 chaves, ZERO** com `GOOGLE`/`PLAY`/`SERVICE_ACCOUNT` no nome.
⇒ A3 do enunciado do 110i continua **não feita**.
**Muda o efeito, não a medição:** no 110i isto era gatilho de PARAR; o enunciado do 110i.1 diz
expressamente que **não é bloqueante para o código** ⇒ passa a **PENDÊNCIA DECLARADA** (o código lê a
env e falha **fechado** com um código próprio enquanto ela não existir).

**(c) Suite — baseline herdado do 110i, a re-medir no SEG3.**
Declarado no enunciado: 1111/1111 frontend · 1276/1282 backend · mutação 13/13. O SEG-1 do 110i mediu
exactamente isso. **Não se corre a suíte aqui** (a RAM está no desvio de (a)); a baseline é re-medida
no SEG3 **antes e depois** das alterações (E8 — A/B pareado).

**(d) Blob de produção `recursos_app`:** não medido neste segmento (leitura do Blob exige o adapter
`data-store` em runtime; o 110i já estabeleceu o mecanismo). O **default** do código é
`isPagamentoNativoAtivo = false` nas 3 plataformas — é o estado que o SEG2 preserva.

## -1.5 DECISÕES DE IMPLEMENTAÇÃO (declaradas; o operador pode vetar)

**D-1 · `isPagamentoNativoAtivo` é o gate (Pergunta 2 do enunciado, respondida pelo operador).**
A flag **continua a ser a flag por plataforma do config remoto** (`DEFAULT_RECURSOS_APP`,
`_lib/recursos-app-config.mjs:20`) e **não** se inventa detecção paralela. A via Billing só liga quando
**flag E** plugin disponíveis em runtime ⇒ **fail-closed, zero regressão** no PWA e no APK actual.
A leitura alternativa («plataforma == android ⇒ Billing», ignorando a flag) foi **rejeitada**: ligaria
o Billing em produção **antes** de A1 (produtos) e A4 (license testing), partindo o fluxo PIX que hoje
funciona no APK ⇒ violaria o GATE 4. A flag só passa a `true` quando o operador a ligar no Blob.

**D-2 · Sem `googleapis`.** A cadeia de validação usa **`jose`** (já é dependência de
`netlify/functions`) para assinar o JWT RS256 da service account + `fetch` para o endpoint OAuth2 e para
o `androidpublisher`. Razão: o `googleapis` (186.0.0) é um pacote pesado que entra no bundle da função
sem medição de tamanho; o `jose` já está instalado e já é usado no repo para os tokens de sessão
(GATE 5 — Ponytail). Declarado como decisão.

## -1.6 Conflitos e ambiguidades (AU3 / HARD GATE 12)

1. **[RESOLVIDO — R18-110i-6, herdado]** O pacote do 110i não existia (404). Avança-se com
   `capacitor-plugin-cdv-purchase` 13.19.1 (re-medido nesta sessão: existe, compatível com ^8).
2. **[RESOLVIDO neste segmento — R18-110i.1-1]** **Quem credita os benefícios no Billing.**
   Pergunta posta ao operador: o handler partilhado credita MAS debita R$ via `saldoRs`; no Billing o
   dinheiro vai para a Google, logo não há débito de saldo. **Resposta do operador: o próprio
   `validar-compra-google.mjs` credita, REUSANDO a cadeia de crédito do handler partilhado, SEM o
   débito de R$.** ⇒ a cadeia (pontos + crédito de lance + ECOQUILDO) é extraída para reuso e o
   caminho PIX fica intacto (GATE 4).
3. **[RESOLVIDO — R18-110i-8, herdado]** `/comprar-senhas` fica **intacto** no Android e no PWA.
4. **[registo]** O enunciado nomeia `capacitor.config.json`; o real é `capacitor.config.ts`.
5. **[registo]** `_logs/DEBT.md` está na RAIZ do repo, não em `frontend/_logs/`.
6. **[registo]** O código real da compra vive em `_lib/comprar-passe-tipado.mjs` (handler partilhado),
   não nos 2 wrappers de 9 linhas.
7. **[registo]** A migração do 110e (`20261014_utac110e_eco_quildo.sql`) **NÃO está aplicada em
   produção** (declarado no próprio ficheiro e medido pelo validador do 110e). Consequência para este
   UTAC: `google_play_compras` é criada da mesma forma — ficheiro versionado + declaração do estado.

## -1.7 Veredito

**SEGUIR** para o SEG0, com **2 desvios declarados** (RAM abaixo do portão A14; sujidade pré-existente
do `git status`) e **1 pendência declarada** (env `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` ausente — não
bloqueante por decisão do enunciado).
