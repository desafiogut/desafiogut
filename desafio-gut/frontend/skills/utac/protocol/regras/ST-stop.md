# ST — Stop conditions

Parar imediatamente e reportar.

## ST1 — A/B pareado mostra diferença
Se o A/B pareado mostra diferença nas chaves antigas, PARAR.
Origem: UTAC103.

## ST2 — Disco < 5 GB livres
Se o disco tem menos de 5 GB livres, PARAR. Os testes podem
falhar por espaço.
Origem: UTAC102.0.

## ST3 — Migração SQL não autorizada
Se for preciso migração de produção, PARAR e pedir autorização.
Origem: UTAC105a.

## ST4 — Código de produção quebra
Se a suíte fica vermelha depois de uma alteração, PARAR.
Origem: disciplina base.

## ST5 — Idempotência quebrada
Se uma operação pode ser executada 2× e cobrar/gravar 2×, PARAR.
Origem: UTAC105a.

## ST6 — Saldo pode ficar negativo
Se o débito pode levar o saldo a < 0, PARAR.
Origem: UTAC105a.

## ST7 — Dado fiscal apagado
Se um dado fiscal (NF-e) for apagado, PARAR.
Origem: UTAC104.2.

## ST8 — Dado de terceiro anonimizado
Se um dado de terceiro for anonimizado por engano, PARAR.
Origem: UTAC104.3.

## ST9 — Token vaza para código/log
Se um token for colocado em código ou log, PARAR. Rotacionar.
Origem: UTAC102.1b.

## ST10 — Mock pode ir a produção
Se um mock pode ser incluído no bundle de produção, PARAR.
Origem: UTAC102.1a.
