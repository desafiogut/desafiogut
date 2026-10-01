# L — LGPD

Regras sobre protecção de dados.

## L1 — Dados sensíveis nunca expostos
Nunca imprimir endereço, CPF, morada, token, saldo individual em
logs ou relatórios. Só agregados.
Origem: disciplina base (R4).

## L2 — Anonimizar ≠ apagar
Substituir, não eliminar. O registo histórico fica.
Origem: UTAC104.2.

## L3 — Preservação fiscal (NF-e)
Nº/série/chave da NF-e mantêm-se (LGPD art. 16, I — obrigação
fiscal, CTN).
Origem: UTAC104.2.

## L4 — Exportação: só os dados do titular
Nunca devolver dados de terceiros. Nunca devolver mais do que o
próprio titular.
Origem: UTAC104.

## L5 — Hash determinístico
Mesmo input → mesmo output. Sem sal variável, sem timestamp no hash.
Origem: UTAC104.3.

## L6 — Pseudonimização ≠ anonimização
Declarar a diferença. O sha256 sem sal é pseudónimo. Escrever
"pseudónimo" no texto, nunca "anónimo".
Origem: UTAC104.3.
