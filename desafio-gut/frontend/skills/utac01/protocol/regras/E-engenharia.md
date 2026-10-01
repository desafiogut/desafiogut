# E — Engenharia

Regras sobre o modo de trabalhar. Aplicam-se a TODOS os UTACs.

## E1 — Zero alteração desnecessária
Cada linha de código alterada tem de ser justificada pela medição.
Se não há medição que a justifique, não se altera.
Origem: disciplina base.

## E2 — Escopo cirúrgico
NÃO refactorizar o que não foi pedido. NÃO "melhorar" o que
funciona. NÃO tocar em áreas adjacentes por "boa vontade".
Origem: UTAC100.

## E3 — Uma correcção de cada vez
Aplicar → medir → confirmar → seguir. Se há 3 correcções, fazer
1, medir, depois 2, medir, depois 3.
Origem: disciplina base.

## E4 — PoC antes de tocar
Testar numa maquete antes de mexer no código de produção.
Registar o resultado. Só depois tocar.
Origem: UTAC100.

## E5 — Não alterar nada que funciona
Regressão é o pior resultado. Se algo funciona hoje, tem de
continuar a funcionar depois do UTAC.
Origem: disciplina base.

## E6 — Ponytail é a regra
A solução mínima que funciona é a certa. Nada de frameworks,
abstracções ou features não pedidas.
Origem: UTAC100.

## E7 — Testar o USO, não só a FUNÇÃO
O teste tem de usar o código como o utilizador usa — handler real,
renderizado real, com duplos só nas fronteiras externas.
Origem: UTAC104.

## E8 — A/B pareado obrigatório
Antes/depois com os mesmos inputs. Sem isto, não há causalidade.
Uma medição isolada não é comparação.
Origem: UTAC102.0.

## E9 — Não inventar conteúdo
Se algo não existe nos UTACs/fonte, registar como lacuna. NÃO
preencher com suposições.
Origem: disciplina base.
