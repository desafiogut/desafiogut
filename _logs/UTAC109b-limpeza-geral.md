# UTAC109b — Limpeza geral: fechar as 7 pendências do 108g

**Tipo:** saneamento (limpeza técnica, zero produto). **Owner:** Hermes (DeepSeek) · **Data:** 2026-10-09.
**HI5:** 1 h 30. **Frentes:** 1 (as 7 pendências do 108g, uma a uma).
**Depende de:** UTAC108h.2 (`8b3e4c4`) · **Origem:** `_logs/UTAC108g-limpar-referencias.md` §SEG8.

**O que NÃO faz:** lógica do comprador · backend fora dos 2 endpoints mortos · MLC/OP/Carteira/Início ·
`cotas.mjs`/`admin/Cotas.jsx` · CardLance/CartaoEdicao/EdicaoCard · aviso «Sem saldo» (108c) ·
`EM_BREVE_MODE` · os 5 `.bak-*` · os 4 bytes de controlo do `CLAUDE.md` · `package-lock`/`package.json` ·
vídeos/assets (109c/d).

---

## Baseline (SEG-1)

| Item | Medido | Comando |
|---|---|---|
| HEAD no arranque | **`aa1eba9`** (= `origin/main`) | `git rev-parse HEAD` / `origin/main` |
| Esperado no enunciado | `8b3e4c4` ou posterior | — |
| **DESVIO declarado** | **3 commits à frente**: `8b3e4c4` (108h.2) → `380d728`/`1e39a4a`/`aa1eba9` (108h.3) | `git log --oneline -5` |
| Árvore | **0 modificados**; 30 `??` antigos em `_logs/` (MC100_*, **não deste UTAC**) | `git status --short` |
| Suíte canónica | frontend **VERDE 904/904** · backend **VERDE 1095/1101** | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| Esperado no enunciado | 899/899 + 1095/1101 | — |
| **DESVIO declarado** | **+5 testes** no frontend (acrescentados pelo 108h.3; backend igual) | idem |
| Disco | **8,1 GB livres** (> 5 GB) | `df -h .` |
| Arranque | **2026-10-09 01:45** | `date` |
| `node_modules` (HI1/A13) | frontend **502** · `desafio-gut` **570** · raiz-git **383** entradas — **0 junctions/reparse points** | `os.listdir` + `st_file_attributes` |

### Medições das 7 pendências (estado ANTES de tocar em nada)

| # | Medição | Resultado |
|---|---|---|
| **P-1** | `git grep -n outrasEdicoes` | **1 em produção**: `src/i18n/pt.js:35`. Fora de produção: só **comentário** em `netlify/functions/_tests/mc8843-estado-edicao.test.mjs:194` + docs. **0 chamadas `t("dash.outrasEdicoes")`**. |
| **P-2** | `public/robots.txt` | `Disallow: /corporativo` presente (entre `Disallow: /admin` e `Disallow: /.netlify/`). |
| **P-3** | `node scripts/test-mc12.mjs` | **5/10 falham**; **0 chamadores**; fora da suíte. |
| **P-4a** | `info-pagamento.mjs` | **0 chamadores** em código. |
| **P-4b** | `debug-pedido.mjs` | **TEM chamador**: `_tests/mc87-seguranca.test.mjs:29` + 3 testes MC87 P1-3. |
| **P-5** | `Privacidade.jsx:91` | Secção 3.1: «…login com conta Google ou e-mail com código OTP **no fluxo corporativo**». **Texto legal visível**. |
| **P-6** | `_logs/DEBT.md` | 21 dívidas. **Stale medida:** DEBT-021 cita `src/pages/CorporativoDashboard.jsx:30-35` — **ficheiro apagado no 108f**. |
| **P-7** | varredura de resíduos | (a) 3 comentários de produção com «Outras Edições» (prateleira desfeita no 108h.2): `EdicaoBanner.jsx:5`, `Dashboard.jsx:349`, `AppLayout.jsx:37`. (b) 2 scripts irmãos partidos: `test-mc12-3.mjs` (6/10), `test-mc12.3.1.mjs` (3/6). |

---

## SEG0 — Inventário (PARAGEM OBRIGATÓRIA)

Classes: **(a)** trivial · **(b)** exige decisão — PARAR · **(c)** fora do escopo — registar.

| # | Pendência | `ficheiro:linha` | Classe | Acção |
|---|---|---|---|---|
| P-1 | chave i18n órfã | `src/i18n/pt.js:35` | **a** | remover a linha |
| P-2 | `robots.txt` | `public/robots.txt:7` | **a** | remover a linha |
| P-3 | script MC12 partido | `scripts/test-mc12.mjs` | **b** | **PARAR** → D-2 |
| P-4a | endpoint morto | `netlify/functions/info-pagamento.mjs` | **b** | **PARAR** → D-1 |
| P-4b | endpoint com chamador | `netlify/functions/debug-pedido.mjs` | **b** | regra do enunciado → **NÃO remover** |
| P-5 | texto legal | `src/pages/Privacidade.jsx:91` | **b** | **PARAR** → D-3 |
| P-6 | dívida desactualizada | `_logs/DEBT.md` (DEBT-021) | **a** | actualizar |
| P-7a | comentários obsoletos | `EdicaoBanner.jsx:5` · `Dashboard.jsx:349` · `AppLayout.jsx:37` | **c** | **fora do escopo** → registar |
| P-7b | 2 scripts irmãos partidos | `scripts/test-mc12-3.mjs` · `test-mc12.3.1.mjs` | **b** | decide-se com o P-3 (D-2) |
| P-7c | DEBT-021 cita ficheiro apagado | `_logs/DEBT.md:56` | **a** | tratado no P-6 |

### PARAGEM OBRIGATÓRIA (GATE 12 / AU3 / HI8)

- **D-1 (`info-pagamento.mjs`).** O enunciado autoriza `git rm` e a medição dá **0 chamadores**, **mas**
  `docs/inventario-remocao.md:80` diz «(REQ-20, novo — sem consumidor frontend ainda; **preservar**)» e
  `docs/aprovações-operador.md` #4 mantém-no **aberto** («candidatos a desligar: … `info-pagamento`»).
  Removê-lo fecharia uma pendência aberta do operador sem decisão explícita.
- **D-2 (os 3 `scripts/test-mc12*`).** O enunciado dá as duas opções («corrigir» ou «remover se
  obsoleto»); medido: os 3 falham por testarem o **mundo do lojista apagado no 108f/108g**
  (`SejaNossoParceiro.jsx`, `corporativoWallet`, `.env.production`).
- **D-3 (`Privacidade.jsx:91`).** Texto legal; a decisão **D6 do 108g** foi «não tocar, registar no DEBT».

### Decisões do operador (R18, SEG0, 2026-10-09)

- **R18-D1 — MANTER `info-pagamento.mjs`** (e, pela regra do enunciado, também `debug-pedido.mjs`).
  **Nenhum** endpoint removido. Nada tocado em `netlify/`.
- **R18-D2 — REMOVER os 3 scripts `test-mc12*`** (o P-3 + os 2 irmãos do P-7b).
- **R18-D3 — MANTER o texto legal** `Privacidade.jsx:91` e **registar dívida nova** no `DEBT.md` (P-5).

---

## SEG1 — P-1 (`dash.outrasEdicoes`)

- `git grep -n "outrasEdicoes" src/` → **1 ocorrência** (`src/i18n/pt.js:35`); fora de `pt.js`, **0** em
  código de produção (só o comentário do teste `mc8843-estado-edicao.test.mjs:194`).
- **Linha removida** de `src/i18n/pt.js` (edição em modo binário, âncora única, `assert count == 1`).
  `pt.js` é **LF puro** (0 CRLF): `8493 → 8441` bytes, md5 `8cd9c4f…` → `7b3f708…`, **1 linha** removida.
- Não existem outros dicionários (`src/i18n/` só tem `pt.js` + `__tests__`) — a chave não ficou órfã
  noutra língua.

## SEG2 — P-2 (`robots.txt`)

- Linha `Disallow: /corporativo` removida (â, unica, `assert count == 1`); LF puro:
  `332 → 309` bytes, md5 `43473b5…` → `5e74ac1…`.
- **Mantido o resto** (verificado no teste): `User-agent: *`, `Allow: /`, `Disallow: /admin`,
  `Disallow: /.netlify/`, `Sitemap: …`.

## SEG3 — P-3 (+ P-7b) — os 3 scripts MC12

**Evidência do estado avariado, colhida ANTES da remoção** (HI10; artefacto fora do repo,
`%TEMP%/tmp-109b/evidencia-mc12.txt`):

```
===== scripts/test-mc12.mjs =====       5/10  (exit 1)
  ❌ 3. AppContext: expõe corporativoWallet e addressCorporativo
  ❌ 5. Sidebar: oculta /seja-nosso-parceiro para tipoUsuario === 'corporativo'
  ❌ 6/7. SejaNossoParceiro … ENOENT src/pages/SejaNossoParceiro.jsx
  ❌ 8. Vitrine: DOMPurify.sanitize com USE_PROFILES svg:true
===== scripts/test-mc12-3.mjs =====     6/10  (exit 1)
  ❌ 3/4. SejaNossoParceiro … ENOENT    ❌ 6. blob cotas-cnpj é gravado
  ❌ 10. .env / .env.production: VITE_CORPORATIVO_ATIVO=true … ENOENT
===== scripts/test-mc12.3.1.mjs =====   3/6   (exit 1)
  ❌ 3/4/6. SejaNossoParceiro … ENOENT src/pages/SejaNossoParceiro.jsx
```

- **Causa medida:** os 3 testam o **mundo do lojista** (separação Usuário Comum × Corporativo, MC12),
  apagado no **108f/108g** — `SejaNossoParceiro.jsx` (ficheiro **inexistente**), `corporativoWallet`
  (removido no 108g), `.env.production` (inexistente).
- **Chamadores: 0.** Não estão na suíte (`package.json` → `test` = `node ../../scripts/mc966-suite-harness.mjs ambos`);
  nada os invoca. As únicas referências são **docs** (`CLAUDE_DEBUG.md`, `docs/MC89.47-RELATORIO.txt`) —
  registadas como resíduo no **DEBT-023** (fora do AUTORIZA).
- **Acção (R18-D2): `git rm` dos 3** — `test-mc12.mjs`, `test-mc12-3.mjs`, `test-mc12.3.1.mjs`.
  Corrigi-los seria **reescrever testes de funcionalidade removida** (GATE 5 / «não abrir nova frente»).

## SEG4 — P-4 (endpoints mortos) — SEM REMOÇÃO

- **`info-pagamento.mjs`: 0 chamadores** (`git grep` em `.mjs/.js/.jsx` → só o comentário do próprio
  cabeçalho + `docs/` + `graphify-out/`), **mas PRESERVADO por R18-D1** (ver SEG0/D-1).
- **`debug-pedido.mjs`: TEM chamador** — `netlify/functions/_tests/mc87-seguranca.test.mjs:29`
  (`await import("../debug-pedido.mjs")`) + os 3 testes «MC87 P1-3» (`:138`…). **Preservado por decisão 5
  do enunciado** (chamador, mesmo em teste).
- `netlify.toml` **não** referencia nenhum dos dois. **Backend intacto**: 0 ficheiros alterados em
  `netlify/`. Nenhum teste MC87 tocado.

## SEG5 — P-5 (`Privacidade.jsx:91`) — MANTIDO

- É **texto legal visível** (secção 3.1, «Informações pessoais»). Aplicada a regra do SEG5 («se é texto
  legal → NÃO alterar») + a decisão **D6 do UTAC108g** («não tocar; registar no DEBT»). **Ficheiro não
  tocado** (`git diff` vazio).
- **Dívida nova registada: DEBT-022** (revisão dos textos legais — «fluxo corporativo» descreve um fluxo
  que saiu do app no 108f; hoje o e-mail-OTP serve o `/login-email` do comprador).

## SEG6 — P-6 (`_logs/DEBT.md`)

- `DEBT.md` é **LF puro**; edição em modo binário (`59218 → 60986` bytes, **+3 linhas**:
  `101 → 104`; md5 `c512f35…` → `5da6dc0…`).
- **Acrescentadas 2 dívidas novas** (uma linha cada, no fim da tabela, logo após a DEBT-021):
  - **DEBT-022** — texto legal `Privacidade.jsx:91` (origem UTAC108g D6; registado no 109b; **aberta**).
  - **DEBT-023** — resíduos fora do escopo do 109b: (a) os 3 comentários de produção com «Outras Edições»;
    (b) os docs que citam os 3 scripts removidos (`CLAUDE_DEBUG.md:112,138,213,277,292`,
    `docs/MC89.47-RELATORIO.txt:38`). **aberta**.
- **Errata (fechar não apaga):** a **DEBT-021** fica **tal como estava** (GATE 15), com uma nota nova a
  declarar que a sua citação `src/pages/CorporativoDashboard.jsx:30-35` refere um ficheiro **apagado no
  UTAC108f** — a dívida está FECHADA e o texto serve de registo histórico.

## SEG7 — P-7 (outras pendências do SEG0)

| # | Achado | Classe | Acção |
|---|---|---|---|
| P-7a | 3 comentários de produção ainda nomeiam a prateleira única «Outras Edições» (desfeita em 2 no 108h.2): `src/components/EdicaoBanner.jsx:5`, `src/pages/Dashboard.jsx:349`, `src/widgets/layout/AppLayout.jsx:37` | **c** (fora do escopo) | **registado (DEBT-023)** — `Dashboard.jsx` é o **Início** (proibido); os outros 2 não estão no AUTORIZA |
| P-7b | `scripts/test-mc12-3.mjs` + `test-mc12.3.1.mjs` partidos | **b** | **resolvido no SEG3** (R18-D2, `git rm`) |
| P-7c | `DEBT-021` cita ficheiro apagado no 108f | **a** | **resolvido no SEG6** (errata) |

Nenhuma pendência extra ficou por classificar; o limite de 3 foi respeitado.

## SEG8 — Input para 109c/d (REGISTADO, não executado)

> **Nada foi tocado em vídeos nem assets** (é 109c/d). Duas decisões do UTAC109a registam-se aqui.

**A — Mecanismo de consistência do GUTO: usar IMAGEM DE REFERÊNCIA (`--image`), NÃO Soul ID.**
Razões medidas no UTAC109a (`Desktop/RELATORIO-109a.txt` §7, linhas 160-183):
- `higgsfield-soul-id/SKILL.md:5-6` — «a personalized model on a **PERSON'S FACE**»;
  `:44` — «Get photos. 5-20 **FACE PHOTOS**, varied angles and lighting»;
  `:13-14` — «**NOT** for: … named-character / non-photo avatars».
- O GUTO é um **mascote cartoon 3D** e o conjunto disponível são **8 imagens de corpo inteiro, 0
  close-ups** ⇒ **não cumpre** o requisito «5-20 face photos». O caminho do Soul ID está **fora do uso
  declarado**.
- Alternativa que a própria skill aponta (`higgsfield-generate` com **referência**: `image: 1+ references,
  often up to 8`) é **exactamente o que a pipeline original já fez** (1 referência + `gemini-3-pro-image`).

**B — Qual GUTO serve de referência: verificar `Desktop\GUTO\GUTO original\` PRIMEIRO (LACUNA L-1).**
Razões (UTAC109a §12 L-1, §8 avisos):
- **L-1**: a imagem de referência original do ComfyUI (`0539243f…915e.png`) **não está no disco**.
- **Se** a original aparecer em `Desktop\GUTO\GUTO original\` → **usá-la**;
  **senão** → usar **2-3 das 8** (`02-guto-geladeira.png`, `03-…`, `06-…`), que já partilham
  rosto/vestuário (o 109a mediu que servem de referência de rosto/vestuário, **não** como conjunto de
  treino multi-ângulo).
- Aviso a transportar para o 109c: **não é só o martelo** — há **texto no ecrã** a substituir (§9 do 109a).

## SEG9 — Testes + mutação

- **Guarda novo versionado:** `src/__tests__/utac109b-limpeza.test.mjs` (**6 testes**) — controlo de
  vitalidade (os ficheiros são lidos e um literal-irmão conhecido aparece ⇒ o «0» não é aritmética),
  P-1, P-2, P-3, R18-D1 (os 2 endpoints preservados) e R18-D3 (o texto legal intacto).
- **Suíte canónica: frontend `904 → 910/910`** (+6) · backend **1095/1101** (inalterado) · **VERDE**.
- **`npx vite build`: exit 0, 18,15 s** (3653 módulos). Os 197 avisos `INVALID_ANNOTATION` vêm de
  `node_modules/@privy-io/**` — **pré-existentes**, não deste UTAC.
- **Mutação (GATE 7/8) — 3 mutações, todas mordem** (script fora do repo, âncoras em bytes):

| # | Mutação | Veredicto |
|---|---|---|
| M1 | reintroduzir `"dash.outrasEdicoes": "🗓️ Outras Edições"` em `pt.js` | **RED** — cai o teste **P-1** |
| M2 | reintroduzir `Disallow: /corporativo` em `robots.txt` | **RED** — cai o teste **P-2** |
| M3 | **controlo de vitalidade:** apagar o irmão `dash.edicaoAtiva` de `pt.js` | **RED** — cai o **controlo positivo** (prova que a guarda não é vácuo) |

  **Restauro byte-idêntico confirmado** nos 3 casos: `pt.js` md5 `7b3f708c6f3003f3e0369325a39a20dc`,
  `robots.txt` md5 `5e74ac1660d23615124612689244ddeb` — iguais antes e depois.
  ⚠️ **Erro do MEU instrumento:** o contador de mutações somou a linha `✖ <teste>` **e** a linha do
  resumo `failing tests:`, inflacionando o número (3/3/2 em vez de **1** teste por mutação). O
  veredicto RED/GREEN não depende dele (o `exit code` e o **nome** do teste caído são a prova).

## SEG10 — Verificação ponta-a-ponta

| Verificação | Resultado |
|---|---|
| Suíte canónica | **frontend 910/910 · backend 1095/1101 VERDE** |
| `npx vite build` | **exit 0**, 18,15 s |
| `grep outrasEdicoes src/i18n/pt.js` | **0** |
| `grep corporativo public/robots.txt` | **0** |
| `scripts/test-mc12*` | **0 ficheiros** (a pasta `scripts/` continua com os outros) |
| `netlify/functions/{info-pagamento,debug-pedido}.mjs` | **os 2 presentes** (R18-D1) |
| `Privacidade.jsx` | **intacto** (texto legal — R18-D3) |
| `_logs/DEBT.md` | **actualizado** (DEBT-022/023 + errata da 021) |
| `EM_BREVE_MODE` | **`= true`** (intacto) |
| `cotas.mjs` · `admin/Cotas.jsx` · `CardLance.jsx` · `AppContext.jsx` | **intactos** (git diff vazio) |
| `package.json` · `package-lock.json` | **intactos** |
| 5 `.bak-*` | **0 alterados** |
| `CLAUDE.md` bytes de controlo | **4** (2×`0x00` + 2×`0x1F`) inalterados |

## SEG11 — Validador adversarial

_(preenchido no fecho)_

## SEG12 — Deploy + registo

_(preenchido no fecho)_
