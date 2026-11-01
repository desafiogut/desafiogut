# UTAC123 — SEG-1 (medição) · SEG0 (Frente A) · SEG1 (Frente B + R18)

Tipo `publicacao` · baseline `7f8200e` · Opus 5.5 · 2026-11-01.

## SEG-1 · Medição
- `git rev-parse --short HEAD` → `7f8200e` = baseline; `origin/main..HEAD` vazio, `HEAD..origin/main` vazio. Desvio 0.
- Fontes alvo limpas (`git status` em `src/`, `android/`, `scripts/`): só `scripts/utac112-prova-mutacao.mjs` não rastreado (alheio).
- Alterações pré-existentes alheias (não tocadas, HI2): `.agents/skills/aidesigner-frontend/*`, `.gitignore`, `.mcp.json`,
  `desafio-gut/frontend/package-lock.json`, `_logs/MC10*`, `closed-testing/*`.
- Ocorrências de chave Alchemy literal em `src/`: **1 ficheiro** (`src/utils/web3.js:122-124`).
- **RAM (A14):** 565 MB livres ao arranque. Trim: fechados só processos de fundo **sem janela** (Edge ×10, Teams,
  M365 Copilot, Outlook novo, Phone Link) + `EmptyWorkingSet` em todos os processos. Não fechados: sessões Claude,
  Hermes/WhatsApp bridge, MCPs, Chrome, WhatsApp, Defender. Medições: 384 → 1 196 (pico) → 829 estável; o operador
  fechou abas do Chrome; antes do build: 1 366 (pico) → 1 043. O restante é `Memory Compression` (~1 GB) e sistema.
  Pagefile 15,9 GB (2 GB usados). Ver SEG2 para o gate do Gradle.
- Disco: 9,6 GB livres.

## SEG0 · Frente A — chave Alchemy hardcoded
`src/utils/web3.js`: `ALCHEMY_RPC = String(import.meta.env.VITE_ALCHEMY_URL ?? "").trim()` — **sem fallback**.
`getProvider()` lança `Error("VITE_ALCHEMY_URL ausente: … Compilar com npm run build:apk …")` antes do
`new JsonRpcProvider`. **Decisão:** o erro é lançado no 1.º uso e não no import — `web3.js` é importado por meia app
e um `throw` no topo deixaria o ecrã em branco; os consumidores (`getEdicaoPrazo`, leituras de saldo) já tratam a falha.
`grep alchemy.com/v2/` em `src/` → 0. ⚠️ A chave continua no **histórico git** e nos bundles v3-v6 já distribuídos:
**rodar a chave na Alchemy é do operador** (DEBT-082).

## SEG1 · Frente B — trava no Gradle
- `android/app/build.gradle`: `versionCode 7`; tarefa `validarAmbienteProducao` (Exec: `node scripts/validar-dist-rede.mjs
  <app>/src/main/assets/public`, `workingDir` = frontend, nunca up-to-date) e `preReleaseBuild.dependsOn` dela ⇒
  **todo** o build release (`bundleRelease`, `assembleRelease`) passa pelo guarda; debug não é afectado.
- `scripts/validar-dist-rede.mjs` (**desvio declarado** — fora da lista, mas necessário para o enunciado «faltar
  Supabase aborta»): `VITE_ALCHEMY_URL` ausente ⇒ erro (o buraco do UTAC122); `VITE_SUPABASE_URL`/`ANON_KEY` ausentes
  ⇒ erro; a chave anon nunca é impressa (só «presente»). Contra o bundle v6: **4 erros** (contrato, chainId, RPC, Supabase).

## SEG1 · R18 (pedidos do operador durante o UTAC)
1. **Título «Carteira» maior** — `MinhaCarteira.jsx:301`: `fontSize` próprio `1.15rem` (móvel) / `1.25rem` (desktop),
   antes herdava `0.85/0.88rem` do `tituloStyle` das secções. Só este título; amarelo mantido (UTAC106c).
2. **Ícone do app preenchido, sem fundo branco** — medido: o AAB v6 **não tem** `mipmap-anydpi-v26` (só PNG legado) ⇒
   no Android 8+ o launcher encolhe o PNG dentro de uma forma branca. Criado `res/mipmap-anydpi-v26/ic_launcher.xml` e
   `ic_launcher_round.xml` (adaptive-icon: background `@color/ic_launcher_background`, foreground
   `@mipmap/ic_launcher_foreground` — a arte de 432 px = 108 dp — com `inset 8%`). Cor de fundo `#FFFFFF → #0C1A3D`
   (azul da própria arte, amostrado no canto do PNG). Pré-visualização do recorte (círculo e squircle) com 0% e 8%:
   0% cortava cabelo e martelo; 8% mostra o GUTO inteiro e continua a encher 100% da forma.
   ℹ️ O ícone de 512 px da ficha da Play é carregado no Play Console — não vive no AAB.

## Provas
- `src/__tests__/utac123-build-blindado.test.mjs` — **20 testes**: fonte do `web3.js`; guarda com **controlo positivo**
  (bundle de produção completo ⇒ exit 0) e 7 negativos (sem RPC, sem Supabase URL, sem anon, sem chainId, sem contrato,
  chainId Sepolia, contrato abandonado) correndo o script real sobre dist sintéticos; anon nunca impressa; Gradle
  (versionCode 7, tarefa, ligação ao `preReleaseBuild`); título; ícone adaptativo e fundo ≠ branco.
- Mutação `scripts/utac123-prova-mutacao.mjs`: **9/9 mortos** (M1 fallback 2 RED · M2 fail-fast 1 · M3 RPC 1 · M4
  Supabase 2 · M5 trava Gradle 1 · M6 versionCode 1 · M7 título 1 · M8 fundo branco 1 · M9 robô do Capacitor 1),
  restauro por cópia + md5 idêntico em todos.
- Suíte canónica (`npm test`): **frontend 1290/1290 · backend 1442/1448 · VERDE** (1290 = 1270 + 20).
- Paridade `recursos_app` (o v7 passa a ler do Supabase — DEBT-061): Blob × `config_remota` = **6 chaves, 0 divergências**;
  `isPagamentoNativoAtivo.android = true`, `isLeilaoAtivo.android = false` nas duas.
