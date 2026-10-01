---
name: utac01
description: "Compor e executar UTACs (Unidade de Trabalho Auto Contido) do DesafioGUT a partir de um spec curto."
---

# Skill UTAC01 — gerar Unidades de Trabalho Auto Contidas (UTAC)

**UTAC = Unidade de Trabalho Auto Contido.** Uma unidade de trabalho com princípio e fim,
auto-contida: contexto + HARD GATES + regras + frentes + SEG-1..SEG6 + validador adversarial + fecho.

Esta skill existe para **eliminar a repetição**: as partes constantes de todos os UTACs vivem aqui
(HARD GATES, regras, lições, armadilhas de ambiente, contexto do projeto); o co-construtor escreve
só um **spec de ~35 linhas** e a skill compõe o UTAC completo (~350 linhas), no mesmo formato da série.

> Substitui o nome «MC» (Mega Comando). A substância mantém-se; muda o nome — descreve melhor o que é.
> Numeração: `UTAC100`, `UTAC101`, …, `UTAC105a`, `UTAC105a.1`, `UTAC105b`, …

## Como se usa
1. Escrever o spec a partir de `spec-template.yml` (≈35 linhas) — ou `/utac-new <nome>`.
2. `/utac-run <spec.yml>` — a skill **compõe** o UTAC e o executor corre SEG-1 → SEG0 → SEG1 →
   SEG2 → SEG3 → SEG4 → SEG5 → SEG6.
3. `/utac-validate` — só o validador adversarial (SEG4).
4. `/utac-close` — só o fecho (SEG5-SEG6).
5. Ver `comandos.md` para todos os comandos.

## Estrutura das pastas
```
skills/utac01/
├─ SKILL.md            ← este ficheiro (entry point)
├─ comandos.md         ← /utac-run, /utac-validate, /utac-close, /utac-new, /utac-types
├─ spec-template.yml   ← template do spec (campos obrigatórios + opcionais)
├─ exemplo.spec.yml    ← spec de teste (UTAC999-demo)
├─ exemplo.UTAC.md     ← UTAC completo gerado a partir do exemplo (prova de que a skill funciona)
├─ protocol/           ← CONSTANTES (extraídas da série)
│  ├─ hard-gates.md    ← os 16 HARD GATES
│  ├─ regras.md        ← R1-R10, R14-R16, R18-R20
│  ├─ licoes.md        ← lições da série (com o UTAC de origem)
│  ├─ ambiente.md      ← armadilhas Windows/MSYS/Netlify
│  └─ contexto.md      ← o que é o DesafioGUT v6.0
├─ types/              ← VARIAÇÕES (6 tipos de UTAC)
│  ├─ diagnostico.md · publicacao.md · produto.md
│  └─ infra.md · lgpd.md · saneamento.md
└─ segments/           ← ESTRUTURA dos segmentos
   ├─ seg-1.md · seg0-3.md · seg4.md · seg5-6.md
```

## Como compor um UTAC (o que a skill faz)
A partir do spec, monta-se:
1. **Cabeçalho** — nome, título, tipo, baseline, motivo, o que NÃO faz.
2. **Contexto** — de `protocol/contexto.md` (o que é o DesafioGUT v6.0).
3. **HARD GATES** — de `protocol/hard-gates.md` (os 16), com os critérios concretos do `type`.
4. **Regras + armadilhas** — de `protocol/regras.md` + `protocol/ambiente.md` + as lições relevantes.
5. **Autorizações** — da secção `autoriza`/`proibe` do spec.
6. **Frentes** — cada frente com o padrão de `segments/seg0-3.md`.
7. **Segmentos** — `seg-1.md`, `seg0-3.md`, `seg4.md`, `seg5-6.md`.
8. **Cabeçalhos de segmento** com os SKILLS ECC e o registo `_logs/UTAC<NNN>_*`.
9. **BOULDER LOOP** (máx. 3 iterações por segmento) + arranque + ressalvas + o que vem depois.

Ver `exemplo.UTAC.md` para o resultado desta composição.

## Como evoluir (cada UTAC novo pode enriquecer a skill)
- **Nova lição** → acrescentar a `protocol/licoes.md` **com o UTAC de origem**.
- **Nova armadilha de ambiente** → `protocol/ambiente.md`.
- **Novo gate concreto para um tipo** → `types/<tipo>.md`.
- **Novo tipo de UTAC** → novo ficheiro em `types/` com a mesma estrutura (6 secções).
- **Nunca** reescrever a série antiga (HARD GATE 15); só acrescentar.
- Toda alteração a esta skill é ela própria um UTAC (auto-referencial): versionada, com validador.

## Regras que a skill herda (não negociáveis)
- Medir antes de criar (GATE 1). Não inventar (GATE 2). Escopo cirúrgico (GATE 3).
- Preservar o que funciona (GATE 4). Ponytail (GATE 5). Uma frente de cada vez (GATE 6).
- Mutação (GATE 7). Bidirecional (GATE 8). Validador adversarial (GATE 9). Commit foreground (GATE 10).
- Fechar (GATE 11). **O executor não concebe (GATE 12).** Auto-contido (GATE 13).
- Versionado (GATE 14). Não alterar UTACs fechados (GATE 15). Exemplo funcional (GATE 16).
- **Nunca `git add -A`.** Respostas do operador em 3 lugares (R18).
