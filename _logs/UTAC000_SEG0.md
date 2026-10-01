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
