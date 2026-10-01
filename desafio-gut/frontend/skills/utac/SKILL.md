---
name: utac
description: "Compor e executar UTACs (Unidade de Trabalho Auto Contido) do DesafioGUT a partir de um spec curto."
---

# Skill UTAC — gerar Unidades de Trabalho Auto Contidas (UTAC)

**UTAC = Unidade de Trabalho Auto Contido.** Uma unidade de trabalho com princípio e fim,
auto-contida: contexto + HARD GATES + regras + frentes + SEG-1..SEG6 + validador adversarial + fecho.

Esta skill existe para **eliminar a repetição**: as partes constantes de todos os UTACs vivem aqui
(HARD GATES, 75 regras em 10 categorias, lições, armadilhas de ambiente, contexto do projeto); o
co-construtor escreve só um **spec com menos de 60 linhas** e a skill compõe o UTAC completo
(~350 linhas), no mesmo formato da série.

> Substitui o nome «MC» (Mega Comando). A substância mantém-se; muda o nome — descreve melhor o que é.
> Numeração: `UTAC100`, `UTAC101`, …, `UTAC105a`, `UTAC105a.1`, `UTAC105b`, …

> ⚠️ **Todo o UTAC lê `_logs/DEBT.md` antes de começar.** É o registo único de dívida técnica
> (tabela ID · Descrição · Origem · Severidade · Estado · Responsável) e faz parte do contexto
> obrigatório do SEG-1: o que está lá não se redescobre, e cada pendência nova entra lá no fecho.
> Regras do departamento **HI** (`protocol/regras/HI-higiene.md`) governam a higiene de
> infraestrutura — detetar, provar que não é do UTAC, corrigir o mínimo e registar.

## Como se usa
1. Escrever o spec a partir de `spec-template.yml` (menos de 60 linhas) — ou `/utac-new <nome>`.
2. `/utac-run <spec.yml>` — a skill **compõe** o UTAC e o executor corre SEG-1 → SEG0 → SEG1 →
   SEG2 → SEG3 → SEG4 → SEG5 → SEG6.
3. `/utac-validate` — só o validador adversarial (SEG4).
4. `/utac-close` — só o fecho (SEG5-SEG6).
5. Ver `comandos.md` para todos os comandos.

## Estrutura das pastas
```
skills/utac/
├─ SKILL.md            ← este ficheiro (entry point)
├─ comandos.md         ← /utac-run, /utac-validate, /utac-close, /utac-new, /utac-types
├─ spec-template.yml   ← template do spec (obrigatórios + opcionais + regras por ID)
├─ exemplo.spec.yml    ← spec de teste (UTAC999-demo)
├─ exemplo.UTAC.md     ← UTAC completo gerado a partir do exemplo (prova de que a skill funciona)
├─ protocol/           ← CONSTANTES
│  ├─ hard-gates.md    ← os 16 HARD GATES (1-16, canónicos) + tabela de alias da série
│  ├─ regras/          ← 75 REGRAS em 10 categorias (cada regra: ID, texto, origem)
│  │  ├─ E-engenharia.md   ← E1-E9   ├─ S-seguranca.md    ← S1-S6
│  │  ├─ T-testes.md       ← T1-T5   ├─ A-ambiente.md     ← A1-A8
│  │  ├─ G-git-deploy.md   ← G1-G6   ├─ P-processo.md     ← P1-P7
│  │  ├─ L-lgpd.md         ← L1-L6   ├─ AU-autonomia.md   ← AU1-AU4
│  │  └─ ST-stop.md        ← ST1-ST10
│  ├─ regras-legado.md ← R1-R20 + mapa R→categoria (referência histórica)
│  ├─ licoes.md        ← lições da série (com o UTAC de origem)
│  ├─ ambiente.md      ← armadilhas Windows/MSYS/Netlify (prosa; as regras A1-A8 estão em regras/A)
│  └─ contexto.md      ← o que é o DesafioGUT v6.0
├─ types/              ← VARIAÇÕES (6 tipos de UTAC)
│  ├─ diagnostico.md · publicacao.md · produto.md
│  └─ infra.md · lgpd.md · saneamento.md
└─ segments/           ← ESTRUTURA dos segmentos
   ├─ seg-1.md · seg0-3.md · seg4.md · seg5-6.md
```

## As 10 categorias de regras (75 regras)
| cat. | tema | regras | cat. | tema | regras |
|---|---|---|---|---|---|
| **E** | Engenharia | E1-E9 | **A** | Ambiente | A1-A12 |
| **T** | Testes | T1-T5 | **P** | Processo | P1-P7 |
| **G** | Git e deploy | G1-G6 | **AU** | Autonomia | AU1-AU4 |
| **L** | LGPD | L1-L6 | **ST** | Stop conditions | ST1-ST10 |
| **S** | Segurança | S1-S6 | **HI** | Higiene de Infraestrutura | HI1-HI10 |

O spec cita regras **por ID**: `stop_conditions_extra: [ST3, ST5]`. A skill injecta automaticamente
as categorias activas (`regras_activas`) e as condições de paragem extra do tipo.

## Como compor um UTAC (o que a skill faz)
A partir do spec, monta-se:
1. **Cabeçalho** — nome, título, tipo, baseline, motivo, o que NÃO faz.
2. **Contexto** — de `protocol/contexto.md` (o que é o DesafioGUT v6.0).
3. **HARD GATES** — de `protocol/hard-gates.md` (os 16 canónicos), com os critérios concretos do `type`.
4. **Regras + armadilhas** — as categorias de `protocol/regras/` (`regras_activas`) + `regras_extra`
   do tipo + `stop_conditions_extra` + as lições relevantes de `protocol/licoes.md`.
5. **Autorizações** — da secção `autoriza`/`proibe` do spec.
6. **Frentes** — cada frente com o padrão de `segments/seg0-3.md`.
7. **Segmentos** — `seg-1.md`, `seg0-3.md`, `seg4.md`, `seg5-6.md`.
8. **Cabeçalhos de segmento** com os SKILLS ECC e o registo `_logs/UTAC<NNN>_*`.
9. **BOULDER LOOP** (máx. 3 iterações por segmento) + arranque + ressalvas + o que vem depois.

Ver `exemplo.UTAC.md` para o resultado desta composição.

## Como evoluir (cada UTAC novo pode enriquecer a skill)
> **Review automático:** `review/` (`/utac-review <UTAC>` em `review/prompt.md`; aplicação manual em `review/aplicador.md`) · **versão actual da skill em `review/VERSAO.md`**.
- **Nova regra** → acrescentar ao ficheiro da categoria certa em `protocol/regras/`, com **ID, texto
  e origem** (o UTAC que a aprendeu). Regra nova → ID novo no fim, nunca reutilizar.
- **Nova lição** → `protocol/licoes.md` **com o UTAC de origem**.
- **Nova armadilha de ambiente** → regra em `regras/A-ambiente.md` (e prosa em `protocol/ambiente.md`).
- **Novo gate concreto para um tipo** → `types/<tipo>.md`.
- **Novo tipo de UTAC** → novo ficheiro em `types/` com a mesma estrutura (6 secções).
- **Nunca** reescrever a série antiga (HARD GATE 15); só acrescentar.
- Toda alteração a esta skill é ela própria um UTAC (auto-referencial): versionada, com validador.

## Regras que a skill herda (não negociáveis)
- Medir antes de criar (GATE 1 / E9). Não inventar (GATE 2 / E9). Escopo cirúrgico (GATE 3 / E2).
- Preservar o que funciona (GATE 4 / E5). Ponytail (GATE 5 / E6). Uma frente de cada vez (GATE 6 / E3).
- Mutação (GATE 7 / T1). Bidirecional (GATE 8 / T4). Validador adversarial (GATE 9).
- Commit foreground (GATE 10 / G3), ficheiros individuais (G1/G2). Fechar (GATE 11).
- **O executor não concebe (GATE 12 / AU3).** Auto-contido (GATE 13). Versionado (GATE 14).
- Não alterar UTACs fechados (GATE 15). Exemplo funcional (GATE 16).
- **Nunca `git add -A`** (G1). Decisões do operador em 3 lugares (P4).
- **PARAR e reportar** nas 10 stop conditions (ST1-ST10).
