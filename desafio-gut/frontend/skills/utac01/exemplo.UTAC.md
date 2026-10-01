# UTAC999-demo — Medir a suíte e reportar o estado

> **Ficheiro de EXEMPLO.** Gerado pela Skill UTAC01 a partir de `exemplo.spec.yml`.
> Prova que a skill compõe um UTAC completo (HARD GATE 16 / P10). Este ficheiro não é
> um UTAC real — não foi executado, existe para mostrar a **estrutura** do resultado.
> ⚠️ Os números entre «…» são **placeholders**: um UTAC real só publica números medidos.

═══════════════════════════════════════════════════════════════════════════
CONTEXTO
═══════════════════════════════════════════════════════════════════════════

Você é o EXECUTOR. Execute, meça, documente e reporte. Se algo estiver ambíguo ou fora
do escopo, **PARE e reporte ao operador** (R20 / HARD GATE 12).

**Tipo:** `diagnostico` — UTAC que MEDE sem alterar (ver `types/diagnostico.md`).
**Baseline do spec:** `160bf09`. **HARD GATE 1:** confirmar com `git rev-parse HEAD` antes de tocar.

**O que este UTAC NÃO faz:** não altera código de produção; não altera `_logs/` existentes;
não toca no Supabase nem no Netlify; não inventa números.

**Projeto (DesafioGUT v6.0):** e-commerce por dropshipping; Relâmpago (menor lance único, saldo R$)
+ Programada (concurso de previsões, Passe Desafio R$ 2,00). Titular: associação
(CNPJ 23.040.066/0001-00). Não é leilão, aposta, sorteio nem jogo de azar.

═══════════════════════════════════════════════════════════════════════════
HARD GATES APLICÁVEIS (os 16 de protocol/hard-gates.md)
═══════════════════════════════════════════════════════════════════════════
1 MEDIR ANTES DE CRIAR · 2 NÃO INVENTAR · 3 ESCOPO CIRÚRGICO · 4 NÃO ALTERAR O QUE FUNCIONA ·
5 PONYTAIL · 6 UMA FRENTE DE CADA VEZ · 7 MUTAÇÃO · 8 BIDIRECIONAL · 9 VALIDADOR ADVERSARIAL ·
10 COMMIT FOREGROUND · 11 O UTAC TEM DE FECHAR · 12 O EXECUTOR NÃO CONCEBE · 13 AUTO-CONTIDO ·
14 VERSIONADO · 15 NÃO ALTERAR UTACs FECHADOS · 16 EXEMPLO FUNCIONAL.

Concretização para este tipo (`diagnostico`):
- **HG7 (mutação) → controlo do medidor:** provar que o medidor distingue uma contagem errada
  (isca com valor conhecido) de uma correcta.
- **HG2 (A/B) → A/B de ficheiros:** zero diff em `_logs/` existentes.

═══════════════════════════════════════════════════════════════════════════
REGRAS (R1-R20) + ARMADILHAS DE AMBIENTE
═══════════════════════════════════════════════════════════════════════════
R1 zero alteração desnecessária · R3 rastreável · R4 sem dados sensíveis · R5 credenciais intocadas ·
R8 veredito por segmento · R9 entregáveis definidos no arranque · R14 `CLAUDE.md` no fecho ·
R16 mutação · R18 decisões em 3 lugares · R19/20 autonomia sem conceber.

Ambiente: `node`/`python`/`curl` são binários Windows → caminhos `C:/...`; `.md`/`.mjs` = LF,
`.jsx` = CRLF; `grep -r` com `--exclude-dir=node_modules`; harness e deploy em **foreground**;
disco ≥ 5 GB.

═══════════════════════════════════════════════════════════════════════════
FRENTES (uma de cada vez — HARD GATE 6)
═══════════════════════════════════════════════════════════════════════════
**FRENTE A — Medir a suíte** → `_logs/UTAC999_SEG0.md`
  - `node scripts/mc966-suite-harness.mjs ambos` (foreground).
  - Registar: frontend «n/n» · backend «n/n». Se vermelho → declarar, não corrigir (não é o escopo).

**FRENTE B — Inventário** → `_logs/UTAC999_SEG1.md`
  - `ls _logs/ | grep -c RELATORIO` → UTACs fechados medidos.
  - `git rev-parse HEAD` → confirmar o baseline do spec (declarar desvio, se houver).

═══════════════════════════════════════════════════════════════════════════
SEG-1 — MEDIÇÃO   (protocol/segments/seg-1.md)
═══════════════════════════════════════════════════════════════════════════
-1.1 `git rev-parse HEAD` + `git status --short` — confirmar `160bf09` (declarar desvio).
-1.2 `ls scripts/mc966-suite-harness.mjs` — existe? (senão PARAR).
-1.3 `df -h /c` — **se < 5 GB, PARAR**.
-1.4 Log `_logs/UTAC999_SEG-1_MEDICAO.md`. Veredito **SEGUIR** / PARAR / AJUSTAR.
-1.5 Secção obrigatória de conflitos (R20) — escalar, não resolver.

═══════════════════════════════════════════════════════════════════════════
SEG0-SEG3 — FRENTES   (protocol/segments/seg0-3.md)
═══════════════════════════════════════════════════════════════════════════
Por frente: PoC (o medidor corre primeiro com uma isca de valor conhecido) → correcção (n/a aqui) →
bidirecional (a) contagem certa passa (b) contagem errada detectada (c) ficheiro ausente → erro
visível → A/B (zero diff em `_logs/` existentes) → controlo do medidor → regressões (n/a) → log.

═══════════════════════════════════════════════════════════════════════════
SEG4 — VALIDADOR ADVERSARIAL   (protocol/segments/seg4.md) — OBRIGATÓRIO
═══════════════════════════════════════════════════════════════════════════
Subagente independente, worktree próprio, instruído a **TENTAR REFUTAR**:
«A contagem da suíte está certa? O baseline declarado bate com o `git rev-parse HEAD`? Algum
número foi inventado? Tocou fora do autorizado (escopo)?»
→ `_logs/UTAC999_SEG4_VALIDADOR.md`.

═══════════════════════════════════════════════════════════════════════════
SEG5-SEG6 — VERIFICAÇÃO E FECHO   (protocol/segments/seg5-6.md)
═══════════════════════════════════════════════════════════════════════════
SEG5: consolidar logs · relatório `Desktop/UTAC999-RELATORIO.md` (tabela `gate | resultado` ·
R18 em 3 lugares · pendências declaradas) · R14 (`CLAUDE.md`) · commit/push foreground.
SEG6: script ad-hoc com nome único, correr 1×; verificações (entregáveis existem · `_logs/`
existentes sem diff · suíte verde · disco OK) · **controlo positivo** · `_SEG6_saida.txt` · fecho.

⚠️ RESSALVAS: nunca `git add -A`; commit/push em foreground; o executor não concebe;
se o disco < 5 GB, PARAR.

BOULDER LOOP: máx. 3 iterações por segmento. ARRANQUE: SEG-1 → SEG0 → SEG1 → SEG2 → SEG3 →
SEG4 → SEG5 → SEG6.

ENTREGA: `_logs/UTAC999_*.md` + `Desktop/UTAC999-RELATORIO.md` + veredito do validador +
suíte medida (só números medidos).
