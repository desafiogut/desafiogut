# S — Segurança

Regras sobre credenciais, permissões, dados.

## S1 — Nunca tocar credenciais
Não ler tokens, não imprimir valores, não colocar em código.
Credenciais vivem em env vars.
Origem: disciplina base (R5).

## S2 — Custo financeiro exige autorização
Se um serviço cobra por chamada, PARAR e reportar. Não construir
sobre suposições.
Origem: disciplina base (R2).

## S3 — Tokens NUNCA em chat, logs ou código
Só em env var do Netlify. Se um token for exposto, rotacionar.
Origem: UTAC102.1b.

## S4 — `Object.hasOwn` para leitura estrita
Nunca confiar em `cfg[chave]` directo — o prototype pode estar
poluído. Usar `Object.hasOwn`.
Origem: UTAC103.

## S5 — `Number.isSafeInteger && >= 0` para números
Evitar overflow. Rejeitar `2**60`, `-1`, `1e300`.
Origem: UTAC103.

## S6 — Soberania de dados
Nada sai do ambiente sem autorização explícita. Não partilhar
dados entre projetos.
Origem: disciplina base (R10).
