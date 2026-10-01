# UTAC000 — SEG0 · Frente A: Protocolo (constantes) (2026-09-30)

## 0.1 PoC — confirmar a estrutura real das secções e a redacção dos HARD GATES nos fontes
Medido nos UTACs-fonte (`_logs/MC105a-RELATORIO.md`, `MC104.2/104.3-RELATORIO.md`):
os gates aparecem como **HG1..HG16 em tabela**, com significado **posicional**:

| gate | significado medido |
|---|---|
| HG1 | medir antes (baseline real vs enunciado) |
| HG2 | A/B pareado |
| HG3 | escopo (ficheiros alterados vs autorizados) |
| HG4 | preservar o que funciona |
| HG7/HG8 | mutação + teste bidirecional |
| HG9 | validador adversarial |
| HG13..HG16 | **variam por UTAC** (HG13 = «fiscal» no MC104.x, «sem PII/concorrência» no MC105a; HG15 = «hash» no MC104.3, «migração» no MC105a) |

⇒ Conclusão: **a numeração 1-16 é fixa e os nomes canónicos vêm do enunciado do UTAC000**
(não estão escritos por extenso em nenhum ficheiro da série). Registei-os em `protocol/hard-gates.md`
com o critério concreto e o exemplo medido de cada um. **Não inventei**: onde a série era omissa,
declarei a lacuna (ex.: R11/R12/R13/R17 inexistentes).

## 0.2..0.6 Ficheiros criados (todos versionáveis, LF, auto-contidos)
| ficheiro | bytes | conteúdo |
|---|---|---|
| `protocol/hard-gates.md` | 5790 | 16 gates com critério concreto + como se verifica + exemplo medido |
| `protocol/regras.md` | 2767 | R1-R10, R14-R16, R18-R20 + **lacuna declarada** (R11-R13, R17 ausentes na série) |
| `protocol/licoes.md` | 3829 | 18 lições, cada uma com o UTAC de origem |
| `protocol/ambiente.md` | 2407 | armadilhas Windows/MSYS/Netlify/disco/RAM + Android/Capacitor |
| `protocol/contexto.md` | 3309 | DesafioGUT v6.0: modalidades, Passe, 4 pilares, estrutura legal, plataforma técnica |

## 0.7 Teste bidirecional
| verificação | resultado |
|---|---|
| (a) cada ficheiro existe | **OK** — 5/5 presentes, com tamanho > 0 |
| (b) ficheiro inexistente falha | **OK** — `protocol/nao-existe.md` ausente (esperado) |
| (c) auto-contido | **OK** — `grep "este MC\|neste MC\|MC anterior"` → 0 referências reais (única ocorrência é o critério de verificação do próprio GATE 13, que descreve a regra) |
| (d) fim de linha | **OK** — todos LF (`file` sem «CRLF») |
| (e) título próprio | **OK** — os 5 abrem com `# …` próprio |

## Erro do meu instrumento (declarado)
A 1.ª escrita de `hard-gates.md` continha o typo «executta». Apanhado na revisão do 0.7 e corrigido
para «executa» (R15). *(Declarado por R8/precedente da série: os erros dos próprios instrumentos
ficam à vista.)*

## ⚠️ Conflitos / ambiguidades para o operador (R20)
1. O enunciado diz «extrair os HARD GATES 1-16 **do UTAC105a**». Medido: o MC105a **não contém** a
   lista 1-16 por extenso — só os `HG1/HG2/HG7/HG8/HG9/HG13..HG16` usados no seu relatório, com
   significados que variam entre UTACs. Extraí o que existe e completei com os nomes canónicos do
   enunciado do UTAC000. **Se o operador quiser os nomes dos gates alinhados com outra fonte, é 1 linha a mudar.**

## 0.8 VEREDITO DO SEG0: **SEGUIR** — Frente A fechada.

---

# ADENDO AO UTAC000 — REESTRUTURAÇÃO DAS REGRAS (recebido durante o SEG4)

> Recebido do operador **a meio do UTAC** (antes de o SEG4 concluir). O adendo diz: «Aplicar durante o
> SEG0 do UTAC.000 (não é um UTAC novo — é uma extensão)» e «Registar este adendo no
> `_logs/UTAC000_SEG0.md`». É isso que esta secção faz.

## A.1 O que mudou
A lista plana **R1-R20** (com 4 lacunas) foi substituída por **61 regras em 9 categorias temáticas**,
cada regra com **ID + texto + origem** (o UTAC que a aprendeu). O spec passa a citar regras **por ID**
(`stop_conditions_extra: [ST3, ST5]`).

| antes | depois |
|---|---|
| `protocol/regras.md` (R1-R20, plano) | **`protocol/regras/`** com 9 ficheiros: `E`(9) `T`(5) `G`(6) `L`(6) `S`(6) `A`(8) `P`(7) `AU`(4) `ST`(10) = **61** |
| — | **`protocol/regras-legado.md`** — R1-R20 + mapa R→categoria (referência histórica) |

## A.2 Ficheiros criados/alterados neste adendo
| ação | ficheiro | bytes | verificação |
|---|---|---|---|
| A (novo) | `protocol/regras/E-engenharia.md` | 1597 | E1-E9, cada um com `Origem:` ✅ |
| A | `protocol/regras/T-testes.md` | 984 | T1-T5 ✅ |
| A | `protocol/regras/G-git-deploy.md` | 897 | G1-G6 ✅ |
| A | `protocol/regras/L-lgpd.md` | 916 | L1-L6 ✅ |
| A | `protocol/regras/S-seguranca.md` | 959 | S1-S6 ✅ |
| A | `protocol/regras/A-ambiente.md` | 1279 | A1-A8 ✅ |
| A | `protocol/regras/P-processo.md` | 1025 | P1-P7 ✅ |
| A | `protocol/regras/AU-autonomia.md` | 840 | AU1-AU4 ✅ |
| A | `protocol/regras/ST-stop.md` | 1249 | ST1-ST10 ✅ |
| A | `protocol/regras-legado.md` | 1601 | mapa R1-R20 completo ✅ |
| D (removido) | `protocol/regras.md` | — | substituído; conteúdo preservado no git (commit `c1b2d94`) e no mapa do legado |
| M | `SKILL.md` | 6037 | nova árvore + tabela das 9 categorias ✅ |
| M | `spec-template.yml` | +`regras_activas`/`regras_extra`/`stop_conditions_extra` | YAML válido ✅ |
| M | `exemplo.spec.yml` | + nova nomenclatura (`regras_activas`, `ST2`/`ST4`) | YAML válido ✅ |
| M | `exemplo.UTAC.md` | secção «REGRAS (61 regras em 9 categorias)» | categorizada ✅ |

**Medição:** 9/9 ficheiros criados · **61 regras** com ID+texto+origem (9+5+6+6+6+8+7+4+10) · 0 ficheiros
com contagem ID ≠ contagem `Origem:` · 0 referências a «este MC».

## A.3 Verificações extra do adendo (as 8 caixas)
| # | verificação | resultado |
|---|---|---|
| 1 | Cada ficheiro existe | **✅ 9/9** |
| 2 | Cada regra tem ID, texto, origem | **✅ 61/61** (paridade ID ↔ `Origem:`) |
| 3 | Nenhum ficheiro tem referências a «este MC» | **✅ 0** |
| 4 | `regras-legado.md` tem o mapa completo | **✅** R1-R20 |
| 5 | `SKILL.md` referencia a nova estrutura | **✅** |
| 6 | `spec-template.yml` tem os campos novos | **✅** 3/3 |
| 7 | `exemplo.spec.yml` usa a nova nomenclatura | **✅** |
| 8 | `exemplo.UTAC.md` mostra as regras categorizadas | **✅** |

## A.4 ⚠️ DESVIO DO ADENDO (declarado — GATE 2 / AU3)
O texto do adendo afirmava, no mapa do legado, «R11-R13 não existiam — lacuna» e «R17 não existia».
O **validador adversarial (SEG4) refutou** essa afirmação para **R12 e R13**:
`_logs/MC00.0-RELATORIO.md:173` («R13 — registo»), `_logs/MC93B-RELATORIO.md:74` («execução é do
operador (R12/R5)»), `MC93-RELATORIO.md:93`, `MC93C-RELATORIO.md:75`. Em vez de publicar uma
afirmação refutada, o `regras-legado.md` foi escrito com o que foi **medido**: R12 = «execução é do
operador», R13 = «registo operacional»; **R11 e R17** continuam lacuna (não encontradas como regras).
Se o operador preferir o texto literal do adendo, é 1 linha a repor. **(R20: não decidi doutrina —
corrigi um facto medido e declarei-o.)**

