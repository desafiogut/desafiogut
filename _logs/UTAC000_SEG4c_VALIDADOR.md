# UTAC000 — SEG4c · Validador adversarial (3.ª e última ronda) — commit `5096c1b` (HEAD, 2026-09-30)

Subagente independente, instruído a **TENTAR REFUTAR** os 4 fechos da 2.ª ronda. **Nada foi alterado
no repo** (a única escrita é este ficheiro, autorizado); artefactos do validador fora do repo em
`C:/Users/Moltbot/tmp-utac000v3/`. Antecedentes: `_logs/UTAC000_SEG4_VALIDADOR.md` (`c1b2d94`),
`_logs/UTAC000_SEG4b_VALIDADOR.md` (`04ce7d6`).

**Veredicto: APROVADO COM RESSALVAS — 0 bloqueantes.**
(4/4 achados ⚠️ da 2.ª ronda **FECHADOS na substância** · 2 ressalvas novas, ambas de 1 linha, uma delas
introduzida pelo próprio fecho do ⚠️4' · 0 regressões funcionais · suíte VERDE medida por mim.)

---

## 1. Delta `04ce7d6..5096c1b` — escopo cirúrgico **não refutado**

```
$ git diff --name-status 04ce7d6 5096c1b        # 8 entradas: 2 A · 6 M
A  _logs/UTAC000_SEG4b_VALIDADOR.md
M  _logs/UTAC000_REGISTO-CLAUDE.md
M  desafio-gut/frontend/skills/utac01/{exemplo.UTAC.md, exemplo.spec.yml,
     protocol/hard-gates.md, protocol/regras-legado.md, spec-template.yml}
A  desafio-gut/frontend/skills/utac01/protocol/regras/README.md
$ git diff --name-only 04ce7d6 5096c1b | grep -vE '^(desafio-gut/frontend/skills/utac01/|_logs/UTAC000_)'  → NADA
$ git diff --name-only 04ce7d6 5096c1b -- CLAUDE.md 'desafio-gut/frontend/package-lock.json' '_logs/MC*' \
      desafio-gut/frontend/src                                                       → VAZIO
```
Só entram `utac01/**` (6 ficheiros) e `_logs/UTAC000_*.md` (2, um deles o log da 2.ª ronda).
`git status --porcelain` sobre o pacote e o `REGISTO-CLAUDE.md` → **vazio** (commit integralmente
aplicado). **Zero diff** em `CLAUDE.md`, `package-lock.json`, `_logs/MC*` e código de produção. ✔

---

## 2. Fecho dos 4 ⚠️ — tentativas de refutação

### ⚠️1' — caminho morto `protocol/regras.md` + composição da skill → **FECHADO (por execução)**
```
$ node tmp-utac000/utac000-valida-spec.mjs caso1-valido.yml  → OK  caso1-valido.yml -> VALIDO   (exit 0)
$ node … caso2/3/4-mutante-*.yml                             → INVALIDO (baseline/tipo/proibe)   (exit 0)
$ node … caso5-mutante-categoria-invalida.yml                → COMPOSICAO-INCOMPLETA regra_activa desconhecida: Z
$ git grep -n 'regras\.md' 5096c1b -- …/utac01/               → VAZIO
```
O `spec-template.yml:40-42` passou a `protocol/regras/ (9 ficheiros), protocol/regras-legado.md, …`
(parseado: `['protocol/hard-gates.md', 'protocol/regras/ (9 ficheiros)', 'protocol/regras-legado.md',
'protocol/licoes.md', 'protocol/ambiente.md', 'protocol/contexto.md']`). O script do composer tem agora
`protocol/regras/${CAT}` resolvido **por prefixo** (`readdirSync().startsWith(cat+"-")`) + validação
`regras_activas ⊂ {E,T,G,L,S,A,P,AU,ST}` — o mutante de categoria inválida é apanhado e o caso válido
compõe. As únicas ocorrências restantes de `protocol/regras.md` no repo estão em
`_logs/UTAC000_SEG0.md:26,68,84` e nos logs SEG4/SEG4b — **história declarada da remoção, não
referência enganosa**. **Não refutável. Fechado.**

### ⚠️2' — `_logs/UTAC000_REGISTO-CLAUDE.md` re-afirmava a lacuna falsa → **FECHADO (por leitura)**
Linhas 28-32 do ficheiro (HEAD) declaram agora o que foi medido: «**R12** («execução é do operador») e
**R13** («registo operacional») **EXISTEM** em `_logs/MC00.0-RELATORIO.md:173`,
`_logs/MC93B-RELATORIO.md:74,83`, `MC93-RELATORIO.md:93`, `MC93C-RELATORIO.md:75`; **R11** existe
noutra era de numeração (`MC37-plano.md:34`); **R17** não foi encontrada». A frase refutada
(«R11/R12/R13/R17 não existem») **desapareceu**. Referências verificadas por mim no disco:
`MC00.0-RELATORIO.md:173` = «| **R13 — registo** | Esta secção. |» ✔ · `MC93B:74` = «Execução é do
operador (R12/R5)» ✔ · `MC93B:83` / `MC93:93` / `MC93C:75` = «Registo operacional (R13)» ✔.
**Não refutável. Fechado** (ressalva ℹ️R1 abaixo).

### ⚠️3' — ID de regra irresolúvel `P10` → **FECHADO (por grep exaustivo)**
Medi **todos** os IDs citados no pacote: `grep -rhoE "\b(E|T|G|L|S|A|P|AU|ST)[0-9]+\b"` → 60 IDs
distintos, e **todos** resolvem para as 61 regras definidas nos 9 ficheiros de `protocol/regras/`
(contagem independente por regex `^## <CAT><n> — `: E9 · T5 · G6 · L6 · S6 · A8 · P7 · AU4 · ST10 = **61**,
cada uma com ID + texto + `Origem:` em número igual — 0 ficheiros com ID ≠ nº de `Origem:`).
O único ID que não é regra é **`P10`** (6 ocorrências), e **todas** as 3 localizações trazem agora a
declaração explícita: `exemplo.spec.yml:21` e `exemplo.UTAC.md:4-5` («premissa «P10 — TESTÁVEL» do
UTAC000; não confundir com a categoria de regras P/Processo, onde só existem P1-P7») e
`protocol/regras/README.md:23-24`. **0 IDs órfãos.** **Não refutável. Fechado** (ressalva ℹ️R2 abaixo).

### ⚠️4' — caracterização da evidência de R11 → **FECHADO na substância, mas o fecho introduziu um caminho morto novo**
```
$ sed -n 34p MC37-plano.md            → "## 5. Cutover anti-split-brain (R11)"                      ✔
$ sed -n 835p cloud.md                → "escrita exclusiva por backend (R11), lances feitos…"        ✔
$ git grep -cw R11 -- MC37-plano.md cloud.md docs/MC39.18-escalabilidade.md → 2 · 8 · 4             ✔
$ sed -n 192p docs/MC39.18-escalabilidade.md → "crit: … escrita só no primário (R11)"               ✔
$ sed -n 231p docs/MC39.18-escalabilidade.md → "coerente com R11 (anti-split-brain)"                ✔
$ ls desafio-gut/docs/MC39.18-escalabilidade.md → No such file or directory                          ✗
```
A frase «só como itens de recomendação/códigos de risco fora do namespace» **desapareceu** e o texto
novo («R11 existe noutra era de numeração … não no namespace R1..R20 dos MC93x/MC10x; R17 não foi
encontrada») é **factualmente correcto** e sustentado por 14 ocorrências nomeadas. **Mas** o caminho
citado é **`desafio-gut/docs/MC39.18-escalabilidade.md`** — inexistente; o ficheiro real está em
**`docs/MC39.18-escalabilidade.md`** (raiz do repo, `git ls-files` confirmado; `desafio-gut/docs/`
existe mas não contém este ficheiro). Os números de linha (192/231) e o conteúdo estão **certos** —
só o prefixo `desafio-gut/` é falso. (Nota: o prefixo falso vem já do relatório da 2.ª ronda, que o
executor copiou fielmente.) → **novo achado ⚠️N1 abaixo.**

---

## 3. Achados DESTA ronda (2 ⚠️ novos, ambos de 1 linha, nenhum bloqueante)

| # | achado | evidência medida | tratamento |
|---|---|---|---|
| ⚠️N1 | **Caminho morto NOVO introduzido pelo fecho do ⚠️4':** `protocol/regras-legado.md:13` cita `desafio-gut/docs/MC39.18-escalabilidade.md:192,231`, ficheiro que **não existe** nesse caminho (real: `docs/MC39.18-escalabilidade.md`). É a mesma classe do ⚠️1' do SEG4b — um caminho do pacote que o leitor não consegue abrir — e vive no ficheiro que a skill apresenta como prova do «medido, não inventado». | `ls desafio-gut/docs/MC39.18-escalabilidade.md` → não existe · `git ls-files \| grep MC39.18` → `docs/MC39.18-escalabilidade.md` (33434 B) · linhas 192/231 conferidas e correctas | Remover o prefixo `desafio-gut/` (1 linha). |
| ⚠️N2 | **Contagem de ficheiros desactualizada no texto destinado ao `CLAUDE.md`:** `_logs/UTAC000_REGISTO-CLAUDE.md:15` e `:21` declaram **29 ficheiros**; medido em `5096c1b` = **30** (`git ls-files …/utac01 \| wc -l`). A própria frase contradiz a sua aritmética: «20 da 1.ª entrega + 9 de `protocol/regras/` + `regras-legado.md` + `regras/README.md` − `regras.md`» = **30**. Ficou em 29 (valor de `04ce7d6`) porque o `README.md` foi acrescentado depois, neste commit. | `git ls-files … \| wc -l` → 30 @HEAD · 29 @04ce7d6 · 20 @c1b2d94 | Trocar «29» → «30» (2 sítios, 2 linhas). |

### Ressalvas ℹ️ (residuais, não exigidas para fecho)
| # | nota |
|---|---|
| ℹ️R1 | `_logs/UTAC000_SEG0.md:20` («declarei a lacuna (ex.: R11/R12/R13/R17 inexistentes)») e `:111` («R11 e R17 continuam lacuna») mantêm a formulação antiga. É um **log datado da ronda SEG0** (não tocado por este commit) e o `regras-legado.md` rotula a sua própria nota como «**Correcção ao adendo**», pelo que a cadeia está declarada; o `:26` qualifica correctamente («ausentes **na série**»). Fica como inconsistência histórica, não como contradição viva. |
| ℹ️R2 | O ⚠️3' fecha por **declaração**, não por resolução: continua a haver colisão de namespace entre as *premissas* P1-P10 do enunciado e a *categoria* P/Processo (P1-P7). A leitura passa a estar sempre ancorada (3/3 sítios), mas os IDs «P1»…«P7» continuam ambíguos fora desses 3 sítios. Aceitável como está; a alternativa era usar um ID real de regra. |
| ℹ️R3 | O `spec-template.yml:40` traz `protocol/regras/ (9 ficheiros)` — um *scalar descritivo*, não um caminho resolúvel. O composer **não lê** o campo `entrega` do template (tem lista própria), pelo que o campo é humano-only; não é erro, mas a «prova de composição» continua a assentar num script **não versionado** (`C:/Users/Moltbot/tmp-utac000/utac000-valida-spec.mjs`). Repetido do SEG4b, ainda verdadeiro. |
| ℹ️R4 | `_logs/UTAC000_SEG0.md:106,111` e o mapa R1-R20 só reconstroem R11-R13/R17; nada a fazer neste UTAC. |

---

## 4. Verificações de regressão (nenhuma funcional encontrada)

- **Caminhos quebrados:** varredura automática do pacote (todos os tokens `*.md|yml|mjs|json|py|ts|js|txt`
  resolvidos contra o directório do ficheiro e contra a raiz) → **72 resolvidos**; os não-resolvidos são
  nomes relativos legítimos (`A-ambiente.md` dentro de `protocol/regras/`, alvos de `_logs/UTAC999_*` do
  exemplo, `netlify/functions/*.mjs` sob `desafio-gut/frontend/`) excepto **⚠️N1**.
  `git grep "protocol/segments\|references/" 5096c1b -- …/utac01/` → **VAZIO** (os ℹ️4/ℹ️5 do SEG4
  continuam fechados; não houve reintrodução).
- **IDs/contagens de regras:** 61 defs, 61 `Origem:`, 0 órfãos (ver ⚠️3'). Nenhuma contagem de regras
  alterada por este commit (nenhum ficheiro de `protocol/regras/*.md` foi tocado no delta).
- **YAML:** `pyyaml 6.0.3` — `spec-template.yml` e `exemplo.spec.yml` **VÁLIDOS**; os **3 campos novos**
  presentes nos 2 ficheiros (`regras_activas` = `[E,T,G,L,S,A,P,AU,ST]`; `exemplo` traz
  `regras_extra=[E9,T2]` e `stop_conditions_extra=[ST2,ST4]`; template traz `[]`/`[]`); `frentes` = 2;
  a `entrega` da FRENTE A já não nomeia `regras.md`.
- **Suíte DA RAIZ do repo (GATE 4), medida por mim:**
  ```
  $ cd C:/Users/Moltbot/Desktop/DESAFIOGUT && node scripts/mc966-suite-harness.mjs ambos
  frontend: VERDE 530/530 pass
  backend:  VERDE 885/891 pass
  VEREDITO: VERDE
  ```
  Idêntica à medida nas rondas 1 e 2 ⇒ **0 regressão de suíte**. ⚠️ **Pitfall declarado:** o harness
  **exige TTY** — corrido sem `pty` (ex.: `background=true`) termina com `EXIT=1` e
  `stdin is not a tty` **sem correr os testes**; não confundir com falha de testes (a 1.ª tentativa
  deste validador deu esse falso vermelho; a 2.ª, com `pty=true`, deu VERDE).
- **Restantes ℹ️ da 2.ª ronda — todos fechados e verificados:**
  ℹ️1/ℹ️2 («~35 linhas» → «< 60») → **0 ocorrências** de `~35`/`35 linhas` no pacote; `SKILL.md:13,20`,
  `spec-template.yml:4`, `exemplo.spec.yml:18` e `REGISTO-CLAUDE.md:18` dizem «menos de 60 linhas» ✔ ·
  ℹ️4 (alias HG14) → `hard-gates.md:23` = ««sem apagar» (MC104.2) / «nunca negativo» (MC105a)», e
  `MC105a-RELATORIO.md:29` = «HG14 | nunca negativo: …» ✔ · ℹ️6 (auto-contidão do `Origem:`) →
  `protocol/regras/README.md` criado com a tabela das 9 categorias/**61**, o mapa «UTAC<n> ↔ `_logs/MC<n>*`»
  com exemplo e o aviso «P10 = premissa, não regra» ✔ · ℹ️8 (CWD) → as **5** menções do harness
  (`exemplo.spec.yml:29,52`, `exemplo.UTAC.md:73,84`, `protocol/contexto.md:51`) trazem «da raiz do repo» ✔.

## 5. Estrutura da skill (item 6)

```
$ git ls-files desafio-gut/frontend/skills/utac01 | wc -l   → 30
```
30 = **19** (20 da 1.ª entrega **− `protocol/regras.md`**) **+ 9** (`protocol/regras/*.md`) **+ 1**
(`regras-legado.md`) **+ 1** (`regras/README.md`). A aritmética enunciada na tarefa (20+9+1+1 = 31)
omite a remoção do `regras.md` (1 D no commit `04ce7d6`); com a remoção, **30 fecha exactamente**.
Estrutura verificada: 5 protocolo (`hard-gates`, `licoes`, `ambiente`, `contexto`, `regras-legado`)
+ `regras/` (9 categorias + README) + 6 tipos + 4 segmentos + 5 de topo (`SKILL.md`, `comandos.md`,
`exemplo.spec.yml`, `exemplo.UTAC.md`, `spec-template.yml`). **Coerente.** ✔

## 6. Pendência esperada do fecho (ℹ️3 da 2.ª ronda)

`C:/Users/Moltbot/Desktop/UTAC000-RELATORIO.md` **continua a não existir** (`ls` e `find` em
`Desktop/` → 0 resultados), e nenhum log declara a omissão. **Não é achado desta ronda** — é a
**pendência esperada do GATE 11** (o relatório é criado no fecho). Fica registada como tal.

---

## Decisão

**APROVADO COM RESSALVAS — 0 bloqueantes.** Os **4 achados ⚠️ da 2.ª ronda fecham na substância** e
resistiram às minhas tentativas de refutação: o ⚠️1' fecha **por execução** (`caso1 → VALIDO`,
`caso5 → COMPOSICAO-INCOMPLETA … desconhecida: Z`, mutantes 2-4 RED — a skill volta a compor), o ⚠️2'
fecha **por leitura** (a frase refutada desapareceu e as 6 citações de R12/R13 conferem no disco), o
⚠️3' fecha **por grep exaustivo** (0 IDs órfãos; `P10` declara-se premissa nos 3 sítios) e o ⚠️4'
fecha na **substância** (as 14 ocorrências nomeadas de R11 conferem). O escopo é cirúrgico (8 ficheiros,
nenhum de produção), o YAML é válido com os 3 campos novos e o `entrega` corrigido, e a suíte está
**VERDE (530/530 · 885/891)**, medida por mim. Restam **2 ressalvas de 1 linha**: o fecho do ⚠️4'
introduziu um **caminho morto novo** (⚠️N1: `desafio-gut/docs/…` → `docs/…`) e o texto destinado ao
`CLAUDE.md` declara **29 ficheiros quando são 30** (⚠️N2). Corrigidas essas duas linhas e criado o
`Desktop/UTAC000-RELATORIO.md` (GATE 11), este UTAC fecha **sem ressalvas**.

*⚠️ desta ronda: 2 (novos, não bloqueantes) · ⚠️ da 2.ª ronda fechados: **4/4** · regressões funcionais: **0** ·
notas ℹ️ residuais: 4 · ficheiros do pacote: **30** · suíte: **VERDE 530/530 · 885/891**.*
*Artefactos do validador (fora do repo): `C:/Users/Moltbot/tmp-utac000v3/` (`suite_saida.txt`) +
leitura directa do repo; o script do composer usado é `C:/Users/Moltbot/tmp-utac000/utac000-valida-spec.mjs`
(não versionado, declarado).*
