# T — Testes

Regras sobre testes, mutação, duplos.

## T1 — Todo teste que nasce verde precisa de mutação
Um teste verde sem mutação não prova nada. Aplicar mutante que
repõe o defeito → confirmar RED → restaurar byte-idêntico.
Origem: UTAC100 (R16).

## T2 — Saída vazia ≠ "0 falhas"
Saída vazia do reporter é "não medi". Registar como "não medi",
nunca como sucesso.
Origem: UTAC100.

## T3 — Duplos de bibliotecas externas copiados do `dist/` real
O duplo tem de ser fiel ao que a biblioteca faz de facto. Se o
duplo é mais estrito que o real, esconde bugs.
Origem: UTAC102.0.

## T4 — Teste bidireccional
Para cada correcção:
  (a) comportamento corrigido → passa
  (b) comportamento oposto → falha
  (c) mutação que repõe o defeito → RED
Origem: disciplina base.

## T5 — Confirmar que cada mutante ENTROU
Sem confirmar que o mutante entrou (por assert do texto, por
verificação do ficheiro), o RED pode ser falso.
Origem: UTAC100.
