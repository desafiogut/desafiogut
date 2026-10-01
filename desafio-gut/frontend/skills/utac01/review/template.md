# TEMPLATE — Review Report

**Auto-contido.** Copiar para `_logs/REVIEWS/<UTAC>_REVIEW.md` e preencher. As 7 secções são obrigatórias
(secção sem conteúdo → escrever «— nada»). Cada afirmação cita **ficheiro:linha**, **commit** ou **medição**.
Sem dados pessoais, tokens ou chaves (L1). IDs de regra novos são **provisórios** (`<CAT>-novo-<n>`): o número
definitivo só é dado pelo `aplicador.md`, se o operador aceitar.

---

# <UTAC> — Review Report (Opus)

> Revisor: <modelo> · Data: <AAAA-MM-DD> · Skill lida: versão <x.y> (`review/VERSAO.md`)
> Fontes lidas: `_logs/<UTAC>_*` (<n> ficheiros) · relatório `<caminho>` · diff `<baseline>..<último commit do UTAC>` (<n> ficheiros)

## 1. Veredicto
<1-3 linhas: o UTAC seguiu a skill? onde se desviou? o que mais vale aprender?>

## 2. Padrões bons (manter)
- <padrão> — evidência: <ficheiro:linha | commit | log>

## 3. Padrões maus (evitar)
- <padrão> — evidência: <…> — custo medido: <o que custou: iterações, falsos verdes, retrabalho>

## 4. Novas regras sugeridas
| ID provisório | categoria | texto (1-2 linhas, imperativo) | origem (evidência) | já coberta por? |
|---|---|---|---|---|
| <CAT>-novo-1 | <E/T/G/L/S/A/P/AU/ST> | <…> | <UTAC + ficheiro:linha> | <regra existente ou «não»> |

## 5. Novas lições sugeridas
| # provisório | secção de `licoes.md` | lição (1-2 linhas) | origem |
|---|---|---|---|
| L-novo-1 | <secção> | <…> | <UTAC + evidência> |

## 6. Para o próximo UTAC
- <aviso concreto e accionável>

## 7. Notas de contexto
- <limites do review: o que não foi lido/medido, ambiguidades, sugestões que o operador deve rejeitar se …>
