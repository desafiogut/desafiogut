# SKILLS INSTALADAS — referência permanente

Gerado pelo MC99.4 (2026-09-27). **As skills vivem em ~/.claude/skills/ (GLOBAL)**, não no
repositório — o repo do app ficou sem uma única skill nova (decisão deliberada, HARD GATE 4).

Medição do disco no fecho: **195 skills escritas nesta sessão**;
**524 pastas com SKILL.md** no total global; 2355 KB escritos.

| # | Skill | Categoria | Método | Estado | Skills | Caminho |
|---|---|---|---|---|---|---|
| 1 | Superpowers | Engenharia | (c) download pela API (tree) | INSTALADA | 15 | ~/.claude/skills/ |
| 2 | gstack | Engenharia | (c) download pela API (tree) | INSTALADA | 40 | ~/.claude/skills/ |
| 3 | GSD (Get Shit Done) | Engenharia | (a) npx get-shit-done-cc@latest --claude --global | INSTALADO (CLI) | — | %AppData%/npm/gsd-sdk.cmd |
| 4 | Vercel React Best Practices | Performance | (c) download pela API | INSTALADA | 1 | ~/.claude/skills/react-best-practices/ |
| 5 | Perf Analyzer | Performance | (c) download + REPARAÇÃO | INSTALADA | 1 | ~/.claude/skills/perf-analyzer/ |
| 6 | Addy Osmani Web Quality | Performance | (c) repo real via manifesto | INSTALADA | 6 | ~/.claude/skills/web-quality-* |
| 7 | Chrome DevTools MCP | Infra | (c) download + REPARAÇÃO | INSTALADA | 1 | ~/.claude/skills/chrome-devtools-mcp/ |
| 8 | Claude Security Skills | Segurança | (c) download pela API | INSTALADA | 8 | ~/.claude/skills/ |
| 9 | Snyk Skills | Segurança | (d) NENHUM | NÃO INSTALADA | 0 | — |
| 10 | V12X Skills | Segurança | (c) download pela API | INSTALADA | 5 | ~/.claude/skills/ |
| 11 | Frontend Design (Anthropic) | Design | (c) download pela API | INSTALADA | 1 | ~/.claude/skills/frontend-design/ |
| 12 | UI/UX Pro Max | Design | (c) download pela API | INSTALADA | 6 | ~/.claude/skills/ |
| 13 | Webapp Testing (Anthropic) | QA | (c) download pela API | INSTALADA | 1 | ~/.claude/skills/webapp-testing/ |
| 14 | Browser QA Plus | QA | (c) download pela API | INSTALADA | 1 | ~/.claude/skills/browser-qa/ |
| 15 | CometWeb Agent Skills | QA | (c) download pela API | INSTALADA | 32 | ~/.claude/skills/ |
| 16 | Accessibility (T-Mobile ARC) | A11y | (a) npm existe mas INTERACTIVO | NÃO INSTALADA | 0 | — |
| 17 | Claude SEO | SEO | (c) download pela API | INSTALADA | 8 | ~/.claude/skills/ |
| 18 | Roier SEO | SEO | (c) download + CORREÇÃO de pasta | INSTALADA | 1 | ~/.claude/skills/roier-seo/ |
| 19 | MCP Builder (Anthropic) | Meta | (c) download pela API | INSTALADA | 1 | ~/.claude/skills/mcp-builder/ |
| 20 | Skill Creator (Anthropic) | Meta | (c) download pela API | INSTALADA | 1 | ~/.claude/skills/skill-creator/ |

## As 2 que NÃO ficaram

**Snyk Skills for Developers** — o comando do enunciado (`snyk mcp configure`) exige o CLI Snyk
autenticado numa conta (`snyk auth`). Não é uma instalação de ficheiros: é uma ligação a uma
conta paga. **R5 — não se toca em credenciais.** Para instalar: o operador autentica-se e corre
`npx -y snyk@latest mcp configure --tool=claude-cli`.

**Accessibility (T-Mobile ARC)** — o repo `tmobile/arc-a11y-skills` **não existe** (404 medido).
O pacote npm `arc-skills-deploy` existe (v1.2.7) mas é **interactivo** (abre um menu que pede
para escolher o perfil com as setas: «Accessibility SME» / «Developer (Web)»), pelo que não é
automatizável a partir daqui. Para instalar: o operador corre `npx arc-skills-deploy` e escolhe.

## Notas de método (porque é que isto não foi só correr 20 comandos)

1. **`npx skills add` não existe** neste ambiente — todas as instalações foram por descoberta
   do repositório pela API do GitHub e download directo.
2. **O `perf-analyzer` e o `chrome-devtools` foram silenciosamente sobrescritos** na 1.ª
   passagem: em repos com o `SKILL.md` na raiz, o nome da pasta saía do caminho e ficava
   literalmente `SKILL.md` — três alvos escreveram para a MESMA pasta e só o último sobreviveu,
   enquanto a tabela dizia «INSTALADA | 1» para todos os três. **Falso verde do meu próprio
   relatório.** Apanhado pelo teste de fumo, não pela tabela.
3. **O `huashu-flash` (MC99.3) e o `web-quality-skills` (aqui) não estão no ramo `main`** ou não
   estão no repo que o enunciado indica: os caminhos do enunciado são hipóteses, e verificá-los
   é metade do trabalho.
4. **A API do GitHub esgotou (60/h sem autenticação: `remaining: 0`, medido).** O `web-quality`
   só entrou porque o `manifest.json` do marketplace foi lido por `raw.githubusercontent` (que
   não conta para o limite) e revelou o repo original `addyosmani/web-quality-skills`.
5. **A atestação não podia ser uma lista escrita à mão.** Atesta o que ficou no disco por
   `mtime` — foi isso que expôs as pastas erradas.

## Lição

**Vinte instalações, dezenove relatórios a dizer «instalado».** As duas que falharam falharam
por razões legítimas (conta, interacção) — mas as duas que eu tinha dado por boas não estavam lá.
*O que distingue um relatório honesto não é não falhar: é a falha aparecer nele.*
