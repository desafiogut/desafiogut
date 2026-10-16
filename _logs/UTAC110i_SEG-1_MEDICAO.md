# UTAC110i — SEG-1 MEDIÇÃO (Google Play Billing no Passe Desafio)

Executor: Hermes (deepseek-v4-flash) · Data: 2026-10-15 · Baseline do enunciado: `a8fe980`
**Nada foi alterado neste segmento.** Só leitura + comandos de medição.

---

## -1.1 Estado do repo

| item | comando | medido | veredicto |
|---|---|---|---|
| HEAD | `git rev-parse HEAD` | `a8fe980040e4ffc59bc0cef0395c7d71b3e1b47a` | **= `a8fe980` do enunciado — BATE** |
| origin/main | `git rev-parse origin/main` | `a8fe980040e4ffc59bc0cef0395c7d71b3e1b47a` | **= HEAD — BATE** |
| branch | `git rev-parse --abbrev-ref HEAD` | `main` | OK |
| topo do log | `git log --oneline -5` | `a8fe980` (110h.4 fecho) · `ae6d0bc` · `57fe37d` · `244c18d` · `3d72419` | OK |

**`git status --porcelain` NÃO está limpo (o enunciado §7.c pede «limpo»). DESVIO DECLARADO.**

Modificados (todos com data **2026-10-13**, anteriores a este UTAC):

```
 M .agents/skills/aidesigner-frontend/SKILL.md
 M .agents/skills/aidesigner-frontend/references/api.md
 M .agents/skills/aidesigner-frontend/references/frontend-rubric.md
 M .gitignore                      (+ .aidesigner/* e !.aidesigner/.gitkeep)
 M .mcp.json                       (+ servidor MCP "aidesigner" em api.aidesigner.ai)
 M desafio-gut/frontend/package-lock.json  (02:48; remove @tanstack/query-core,
                                            @tanstack/react-query, @types/react, typescript)
```

Untracked: `_logs/MC100_*.md` (11), `_logs/MC101_*.md` (6), `_logs/MC102_*.md` (6),
`_logs/UTAC106x.2.spec.yml`.

**Origem medida:** a instalação do tool de terceiros **«aidesigner»** (`.mcp.json` + `.agents/skills/
aidesigner-frontend/` + regra no `.gitignore`) no dia **2026-10-13**. **NÃO é do UTAC110i e não é de
nenhum UTAC** — é sujidade pré-existente de outro processo.
**Acção: NÃO revertida, NÃO tocada** (regra do operador: ficheiro mutado por OUTRO processo não leva
`git checkout --`; aqui nem isso). Os untracked `MC100/101/102` são logs de sessões antigas, também
não deste UTAC. O commit do UTAC110i, quando houver, fará `git add` **individual** só dos ficheiros
nomeados (GATE 10 / G1).

---

## -1.2 Existência dos caminhos nomeados no enunciado

| caminho do enunciado | medido | nota |
|---|---|---|
| `src/hooks/useComprarPasse.js` | **OK** (95 linhas) | hook de compra actual (PIX) |
| `netlify/functions/comprar-passe-relampago.mjs` | **OK** (8 linhas) | **wrapper fino** |
| `netlify/functions/comprar-passe-programado.mjs` | **OK** (9 linhas) | **wrapper fino** |
| `src/pages/MinhaCarteira.jsx` | **OK** (660 linhas) | botão de compra em `:492`, hook em `:102` |
| `android/app/build.gradle` | **OK** | projecto Capacitor |
| `capacitor.config.json` | **FALTA** | o ficheiro real é **`capacitor.config.ts`** (TS). Desvio de nome, não bloqueia |
| `_logs/DEBT.md` | **FALTA em `frontend/_logs/`** | existe em **`_logs/DEBT.md` na RAIZ do repo** (`DESAFIOGUT\_logs\DEBT.md`, 117 linhas) |

O código real da compra **não** está nos dois endpoints: ambos são
`export default (req) => respostaPreflight(req) ?? comprarPasseTipado(req, "…")`, e o handler vive em
`netlify/functions/_lib/comprar-passe-tipado.mjs` (239 linhas). É o **mesmo conflito** que os UTAC110d
e UTAC110e já declararam. O enunciado do 110i nomeia «Editar comprar-passe-relampago.mjs e
-programado.mjs (deprecar para Android)» — a edição real tem de ser em `_lib/comprar-passe-tipado.mjs`.

---

## -1.3 Fontes / inventário (o que existe hoje)

**Fluxo de compra actual (PIX) — medido por leitura:**

- `src/hooks/useComprarPasse.js` — `comprar(tipo)` com `tipo ∈ {relampago, programado}`; resolve o
  endpoint por `src/lib/passes.js` (`TIPOS_PASSE` congelado, `Object.hasOwn`); envia `Bearer`
  (user-session) + `{ idempotencyKey }`; guarda de corrida por `useRef` (`emCurso`); devolve
  `{ ok, tipo, pontos, creditosLance, idempotent }`; mensagens por HTTP 401/402/400/502/503.
- `netlify/functions/_lib/comprar-passe-tipado.mjs` — handler partilhado:
  1) idempotência por `ref = passe-<tipo>:<chave>`; 2) **débito atómico de R$ 2,00** (CAS em
  `saldoRs.mjs`); 3) **+10 pontos** de fidelidade; 4) só Relâmpago: **+1 crédito de lance**
  (`ledger-lance.mjs`); 5) **+1 ECOQUILDO** + lastro +R$ 1,00 (`eco-quildo.mjs`); 6) falha após
  débito ⇒ desfaz + reembolso; reembolso falhado ⇒ alerta Sentry.
- `src/pages/MinhaCarteira.jsx` — botão «Comprar Passe Desafio R$ 2,00» (`:492`), modal
  `src/components/ComprarPasseModal.jsx`; texto do fluxo em `:451`:
  «Depositar PIX → Comprar Passe Desafio → Menor Lance Único → Ofertas Programadas».
- `src/lib/passes.js` — `PRECO_PASSE = "R$ 2,00"`, `PONTOS_FIDELIDADE_POR_PASSE = 10`;
  Relâmpago = «10 pontos + 1 lance no Menor Lance Único»; Programado = «10 pontos + 1 palpite».

**Regulamento (fonte primária, `netlify/functions/_lib/guto-regulamento.mjs`):**
- `:289` **Art. 52º** — «A aquisição do Passe Desafio (produto digital) … será realizada
  **exclusivamente** por meio do sistema de faturamento do Google Play (Google Play Billing)».
  ⟹ confirma o motivo do UTAC; **o Regulamento NÃO precisa de alteração** (R18-110i-5).
- `:155` Art. 19º e `:293` — o pagamento de **bem físico** (cartão/entrega) fica **fora** do âmbito
  do Google Play Billing (PIX mantém-se legítimo aí).

**Saldo R$ (`blob saldo-rs:<address>`):** entra por **PIX** (Mercado Pago) e sai em
`/comprar-senhas`. É a via que o art. 52º proíbe para o Passe no Android. **Não removido** — serve
outras coisas (Frente D3).

**Migrations existentes (`supabase/migrations/`, 8 ficheiros):** a última é
`20261014_utac110e_eco_quildo.sql`. Não existe nenhuma tabela de compras Google ⟹ a `google_play_compras`
do §9.C3 seria **nova**.

---

## -1.4 Medições específicas

### Ambiente Android / Capacitor
| item | medido | fonte |
|---|---|---|
| Capacitor | **8.4.2** (`@capacitor/core`,`/android`,`/cli` = `^8.4.2`) | `package.json` |
| Plugin Capacitor já instalado | só `@capacitor/app ^8.1.1` | `package.json` |
| `appId` | `com.desafiogut.app` | `capacitor.config.ts` |
| compileSdk / minSdk / targetSdk | **36 / 24 / 36** | `android/variables.gradle` |
| AGP / google-services | 8.13.0 / 4.4.4 | `android/build.gradle` |
| Java | **21** (source/targetCompatibility) | `android/app/capacitor.build.gradle` |
| Camada Cordova | **presente** (`:capacitor-cordova-android-plugins`) | `android/app/build.gradle` |
| Plugins nativos existentes | `capacitor-android`, `capacitor-app` | `android/capacitor.settings.gradle` |
| Script de build APK | `npm run build:apk` = netlify build + validar dist + `npx cap sync android` | `package.json` |
| Suíte | `npm test` = `node scripts/mc966-suite-harness.mjs ambos` | `package.json` |

### Compatibilidade do plugin (o ponto que o enunciado manda verificar)

| pacote | `npm view` | veredicto |
|---|---|---|
| `@capacitor-community/in-app-purchases` (**nomeado no enunciado**) | **404 — NÃO EXISTE** | ⛔ **PREMISSA REFUTADA** |
| `capacitor-plugin-cdv-purchase` (**escolhido pelo operador, R18-110i-6**) | **13.19.1**, `peerDependencies @capacitor/core: ^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0` | ✅ **EXISTE e é COMPATÍVEL com o Capacitor 8.4.2 do repo** |
| `cordova-plugin-purchase` (fallback do operador) | 13.19.1 | ✅ existe (a camada Cordova já está montada) |
| `@ionic-native/in-app-purchase-2` | 5.36.0 | (não indicado) |
| `googleapis` (backend §9.C1) | 186.0.0 | ✅ disponível |

**⟹ O bloqueio do plugin FICA RESOLVIDO**: `capacitor-plugin-cdv-purchase@13.19.1` existe e declara
suporte a Capacitor ^8 (adaptador nativo, sem dependência Cordova).

### Pré-requisitos do operador (FRENTE A) — o que o executor consegue ver

| pré-requisito | como medi | estado |
|---|---|---|
| **A3** env var `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` no Netlify | `netlify env:list --json` → **35 keys**, nenhuma com `GOOGLE`/`PLAY` | ⛔ **AUSENTE** |
| A1 produto `passe_desafio_r2` no Play Console | não visível do repo | ❓ não verificável pelo executor |
| A2 service account | idem | ❓ não verificável |
| A4 license testing | idem | ❓ não verificável |

Site Netlify ligado: projecto `silly-stardust-ca71bc` (team `desafiodesafio…`/`desafiodesafio`).

---

## -1.5 Disco

`df -h /c` → `238G total, 223G usados, 15G livres (94%)`. **Acima do limiar de 5 GB ⟹ NÃO bloqueia**
(SEG-1 §-1.5).

---

## -1.6 RAM (portão A14 do enunciado) — DESVIO DECLARADO

Máquina pequena: **5 877 MB** no total.

**Arranque, 3× (métrica canónica `FreePhysicalMemory/1024`):** `1111` · `1110` · `1113` MB
⟹ **abaixo** do portão de 1 500 MB, já no arranque.

O operador fechou aplicações; nova ronda `4×`: `1524` · `1488` · `1499` · `1501` (a oscilar na linha).

Aplicada a escada da skill `windows-memory-pressure` (script `liberar-ram.ps1` reconstruído — ver
DEBT-035 — em pasta temporária **fora** do repo, ASCII puro):

```
antes (6×):   1062 1084 1077 1087 1084 1080        (pico 1087 · mín 1062)
msedge sem janela fechados: 0
processos trimmed (EmptyWorkingSet): 62
depois (6×):  1241 1482 1476 1467 1463 1451        (pico 1482 · mín 1241)
Memory Compression: 301 MB
```

**Tecto prático 1 482 MB — abaixo dos 1 500 MB** (confirmado o §3.1 da skill: o trim empurra páginas
para o *compressed store* e o `Memory Compression` cresce; os maiores restantes são `MsMpEng`
(Defender, intocável), a **própria sessão** (`python.exe`/`node.exe` do hermes) e apps do utilizador).

**Decisão (skill §3.2 — desvio declarado, NÃO portão cumprido):** a suíte correu **abaixo do
portão** — `RAM_ANTES=1242`, `RAM_DEPOIS=1160` — e o resultado foi **VERDE e estável**, sem falha
inexplicada. É este o teste que o portão existe para fazer; o desvio fica declarado como desvio.

---

## -1.7 Suíte baseline (§7.d do enunciado)

`node scripts/mc966-suite-harness.mjs ambos` (harness MC96.6, guarda «saída vazia = NÃO MEDI»):

```
frontend: VERDE 1111/1111 pass
backend:  VERDE 1276/1282 pass
VEREDITO: VERDE          (exit 0)
```

**Bate EXACTAMENTE com o declarado no enunciado (1111/1111 + 1276/1282).** Os ficheiros sujos do
§-1.1 (`.mcp.json`, `.gitignore`, `package-lock.json` do aidesigner) **não** afectam a suíte.

---

## Conflitos e ambiguidades (AU3 / GATE 12) — para o operador

> ⚠️ Conflitos entre o enunciado e o medido (R20 — não resolvidos pelo executor)

1. **[RESOLVIDO pelo operador — R18-110i-6] O pacote nomeado não existe.**
   `@capacitor-community/in-app-purchases` → **404 no npm**. O operador corrigiu por mensagem:
   avançar com **`capacitor-plugin-cdv-purchase`** (verificado: 13.19.1, compatível com Cap 8).
   **Registar como R18-110i-6 e como premissa refutada no R14.**

2. **[BLOQUEIO — PARAR] `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` AUSENTE no Netlify.** O enunciado §15 é
   explícito: «Se a env var não existir → PARAR e reportar». Ausência da env var prova que **A3 não foi
   feita**, e portanto muito provavelmente A1/A2/A4 também não. **Sem A1-A4 o backend não valida
   billing real** e a Frente C fica não-testável ponta-a-ponta.

3. **[registo] `capacitor.config.json`** do enunciado é na verdade **`capacitor.config.ts`**.

4. **[registo] `_logs/DEBT.md`** do enunciado fica na **raiz do repo**, não em `frontend/_logs/`.

5. **[registo, herdado do 110d/110e] o código da compra está em `_lib/comprar-passe-tipado.mjs`** —
   os dois endpoints nomeados são wrappers de 8/9 linhas. A Frente D3 («deprecar para Android») terá de
   tocar no handler partilhado, não nos wrappers.

6. **[RESOLVIDO — R18-110i-7] DOIS produtos, não um.** A pergunta era correcta: o sistema trata-os
   como **dois** produtos. Ver §«Decisões do operador (R18)» abaixo.
   ⚠️ A **R18-110i-3** do enunciado (produto único `passe_desafio_r2`) fica **SUPERSEDIDA por
   R18-110i-7** — mantida à vista, nunca apagada (P2 / GATE 15).

7. **[RESOLVIDO — R18-110i-7] «Consumível» = sim, nos dois.** Ambos os SKUs são **consumíveis**
   (compra repetida), como o enunciado já dizia.

8. **[RESOLVIDO — R18-110i-8] Saldo R$ / `/comprar-senhas` no Android: fica INTACTO.** Só a via
   «saldo → Passe» é desactivada no Android (substituída por Google Play Billing). Ver §«Decisões».
   ⚠️ **ERRO MEU, CORRIGIDO:** numa ronda anterior refutei a razão «o `EM_BREVE_MODE` já esconde o
   `/comprar-senhas`» — **estava ERRADO; o operador tem razão.** Ver §«CORRECÇÃO DA MINHA PRÓPRIA
   ANÁLISE (erro do executor)».

---

## Decisões do operador (R18) — recebidas nesta sessão

**R18-110i-6** (correcção ao pacote do plugin): `@capacitor-community/in-app-purchases` **não existe**
(404). Avançar com **`capacitor-plugin-cdv-purchase`** (13.19.1, compatível com Capacitor ^8; fallback
`cordova-plugin-purchase` 13.19.1). Registar a **premissa refutada** no R14.

**R18-110i-7** (DOIS produtos — corrige a R18-110i-3):

| onde | o quê |
|---|---|
| **Play Console (A1)** | criar **2** produtos, ambos **consumíveis**, R$ 2,00: `passe_relampago_r2` («1 lance no MLC») · `passe_programado_r2` («1 palpite na OP») |
| **Backend** | `comprar-passe-relampago.mjs` valida `passe_relampago_r2`; `comprar-passe-programado.mjs` valida `passe_programado_r2`; manter o `tipo` no payload, mas o **SKU tem de coincidir** (defesa em profundidade) |
| **PWA** | continua por PIX, **sem SKUs** |

**Razão declarada pelo operador, VERIFICADA no código (GATE 2):**
- Art. 13º (`_lib/guto-regulamento.mjs:117`) — Passe Relâmpago = 1 lance na Oferta Relâmpago;
- Art. 25º (`:189`) — Passe Programado = 1 palpite na Oferta Programada;
- Art. 52º (`:289`) — as **duas modalidades** via Google Play Billing;
- UI: `src/components/ComprarPasseModal.jsx:26` → `const ORDEM = [TIPOS_PASSE.relampago, TIPOS_PASSE.programado]` (2 botões);
- Backend: 2 endpoints (`comprar-passe-relampago` / `comprar-passe-programado`).

**Consequência para a FRENTE A:** A1 passa a exigir **2 produtos** no Play Console (não 1). O operador
pediu confirmação explícita antes de aplicar — **CONFIRMADO**: a medição acima sustenta a decisão
(alinhamento Regulamento ↔ UI ↔ backend), sem conflito com nada que esteja no repo.

**R18-110i-8** (saldo R$ no Android — Frente D3):

```
NO ANDROID:  Compra de Passe   -> Google Play Billing
             /comprar-senhas   -> INTACTO (escondido na UI)
NO PWA:      Compra de Passe   -> PIX
             /comprar-senhas   -> INTACTO
```

Razões do operador (**versão FINAL**, na 2.ª correcção): (1) o `EM_BREVE_MODE` já esconde o
`/comprar-senhas` da UI; (2) está ligado ao contrato on-chain (`creditarSenhas`) — desactivar exigiria
coordenação com o contrato; (3) fora do escopo do 110i (que é sobre o Passe).
⚠️ **As razões anteriores (1) «R$ 23,75 em aberto em 7 contas» e (2) «dinheiro preso» CAÍRAM** — o
operador informou que esse R$ 23,75 **já foi absorvido/passado para contas de teste**. A decisão
mantém-se. **Só a via «saldo → Passe» é desactivada no Android** — `/comprar-senhas` NÃO mexido.

---

## CORRECÇÃO DA MINHA PRÓPRIA ANÁLISE (erro do executor) — razão 1 da R18-110i-8

⚠️⚠️ **NA RONDA ANTERIOR EU REFUTEI ESTA PREMISSA E ESTAVA ERRADO. O operador reafirmou-a e TEM
RAZÃO.** O texto errado mantém-se registado abaixo, marcado como **REFUTADO — REFUTAÇÃO INVÁLIDA**
(R20; nunca apagado). **O erro é meu e declaro-o.**

**Premissa (do operador):** «O `EM_BREVE_MODE` já esconde o `/comprar-senhas` da UI.»
**Veredicto corrigido: VERDADEIRA.**

**Medição definitiva (GATE 2):**
- `src/lib/leilaoLock.js:10` — `export const EM_BREVE_MODE = true;` (**ligado em produção**).
- **`src/pages/MercadoLances.jsx:369`** — o LOCAL DE MONTAGEM do `CardLance`:
  ```jsx
  {EM_BREVE_MODE ? (
      <CartaoEdicao vazio acao="lance" … estado={{ texto: "SEM EDIÇÃO" … }} />
  ) : (() => { … <CardLance … /> … })()}
  ```
  Com `EM_BREVE_MODE = true`, o **`CardLance` NÃO é montado** — e é o `CardLance` que chama
  `useTrocarPorSenhas` → `POST /comprar-senhas` (`CardLance.jsx:81`). ⟹ **a UI do `/comprar-senhas`
  fica escondida.** Confirmado também por `MercadoLances.jsx:363`
  (`{!EM_BREVE_MODE && <SemSaldoBanner/>}`) e `src/utils/edicao.js:106`
  (`if (EM_BREVE_MODE) return ESTADO_EDICAO.EM_BREVE;`).

**O MEU ERRO (declarado, instrumento):** verifiquei o **filho** (`CardLance.jsx`), não achei import do
`EM_BREVE_MODE`, e concluí «não esconde». **Erro de método: o gate não está no componente — está no
LOCAL DE MONTAGEM (o pai, `MercadoLances.jsx`).** Verifiquei o consumidor e não o sítio onde o
componente é consumido. **Lição: para provar que um gate esconde uma UI, procurar no PAI/montagem,
não só no filho.**

**Nuance que se mantém (não invalida a premissa):** há **DUAS** guardas independentes e no **Android**
a outra dispara PRIMEIRO —
- `isLeilaoAtivo = { ios:false, android:false, pwa:true }` (`_lib/recursos-app-config.mjs:20-22`) →
  `MercadoLances.jsx:302` faz `return <MercadoConformidade/>` **antes** de chegar ao `EM_BREVE_MODE`;
- `EM_BREVE_MODE = true` (global, todas as plataformas) → `MercadoLances.jsx:369` não monta o `CardLance`.

⟹ No Android as duas escondem; **a primeira a disparar é `isLeilaoAtivo`**. Globalmente (incl. PWA), o
`EM_BREVE_MODE` é suficiente, sozinho. **A premissa do operador está CORRECTA.**

## Razão 2 da R18-110i-8 — CONFIRMADA por leitura de código

`netlify/functions/comprar-senhas.mjs` (passo 7) chama de facto o contrato on-chain:
`creditarSenhas(endereco, qtd)` + `CONTRATO_ADDRESS` (`_lib/contract.mjs`), com reembolso do R$
debitado em falha. A razão do operador (coordenação com o contrato) **confirma-se**.

Nota medida: o **endpoint** `comprar-senhas.mjs` **não tem NENHUM gate de plataforma** (só CORS,
rate-limit, kill-switch, JWT `lance-auth`, MFA) — o que esconde no Android é **só a UI**. Coerente com
a decisão «`/comprar-senhas` fica intacto».

<!-- TEXTO ANTERIOR (ERRADO) — mantido à vista, REFUTADO:
A «correcção» anterior dizia que EM_BREVE_MODE «é só uma trava de APRESENTAÇÃO dos cronómetros e não
esconde páginas nem botões». REFUTADO pela medição acima (MercadoLances.jsx:369). O erro foi declarado
ao operador. -->


## Achado NOVO — a flag que a Frente D3 deve usar (não estava no enunciado)

A mesma estrutura já tem a flag certa para este UTAC:

```
DEFAULT_RECURSOS_APP (_lib/recursos-app-config.mjs:19-22)
  isLeilaoAtivo:          { ios: false, android: false, pwa: true  }
  isPagamentoNativoAtivo: { ios: false, android: false, pwa: false }   <-- AQUI
```

- **`isPagamentoNativoAtivo`** = «pagamento nativo (loja) activo», **por plataforma**, hoje `false` em
  todas, e **sem nenhum consumidor em produção** (só o próprio hook + testes) — é uma flag **latente**,
  criada no MC29.1 exactamente para o modelo híbrido.
- **Consequência para a Frente D3:** a forma natural de «desactivar a via saldo → Passe no Android» é
  **ligar `isPagamentoNativoAtivo.android`** e o hook `useComprarPasse` bifurcar por ela (Android →
  Billing; PWA → PIX) — em vez de detectar plataforma com `Capacitor.getPlatform()` inventado no
  enunciado. O repo já tem o mecanismo, a config remota (`Blob config-experiencia:recursos_app`) e o
  endpoint `/recursos-app` com `useRecursosApp`. **PARA DECISÃO DO OPERADOR** (não decidido aqui).
- Nota adicional medida: a página `MinhaCarteira` (`/carteira`, `App.jsx:367`) **NÃO tem gate de
  plataforma** — o botão «Comprar Passe Desafio» está hoje visível no Android e chama o fluxo PIX. É
  por isso que a D3 é realmente necessária.

---

## -1.7 Veredicto

# ⛔ PARAR

**Motivo (duro, do próprio enunciado §15):** `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` **não existe** no
Netlify ⟹ **A3 não feita** ⟹ os pré-requisitos A1-A4 da FRENTE A não estão cumpridos e o backend da
FRENTE C **não pode ser testado contra o Google**. O arranque do enunciado («SEG-1 → SEG0 → …») só
corre **depois** de A1-A4 estarem feitos — o próprio enunciado diz «Quando A1-A4 estiverem feitos,
avisa o executor».

**Não bloqueia (já resolvido / aceitável):**
- Plugin: ✅ resolvido pelo operador com `capacitor-plugin-cdv-purchase@13.19.1` (compatível).
- Suíte: ✅ VERDE 1111/1111 + 1276/1282 (= declarado), medida em desvio de RAM declarado.
- Disco: ✅ 15 GB (> 5 GB).
- Regulamento: ✅ já diz Play Billing — sem alteração (R18-110i-5).

**Para retomar:** o operador executa **A1-A4** (§4 do enunciado) e confirma. Aí segue-se
SEG0 → SEG1(C) → SEG2 → SEG3 → SEG4 → SEG5 sem refazer o SEG-1 (tudo acima fica registado).
