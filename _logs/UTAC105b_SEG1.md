# UTAC105b — SEG1 Frente B: painel do lojista (2026-09-30)

**Padrões medidos:** endpoints corporativos autenticam por user-session + regra de posse do `produtos.mjs:338-353` (MC89.38);
páginas corporativas = `CorporativoCotas.jsx` (GlassCard, `useAppContext`, `apiGet`). Rotas em `App.jsx:495-500`, `CorporativoRoute`.

## Backend — `cupons.mjs` (novo)
- `GET ?cliente_id=` → `{ lojistaId, validadeDias:30, cupons:[{valorRs, ativo}] }` com os **3 valores da plataforma** (inexistente = inactivo). GET não grava.
- `PUT { cliente_id, cupons:[{valorRs, ativo}] }` → valida TUDO antes de gravar (valor fora → 400 `valor_invalido`, nada gravado; repetido/>3/ativo
  não booleano → 400); grava com `actualizarCupom` (idempotente).
- Auth: user-session ou admin-JWT. **Posse (R18-B, regra MC89.38):** carteira do JWT = cliente_id · cota com `endereco` = JWT · admin; senão 403;
  leitura da cota falha → 403 (fail-closed). Erro de leitura → 503 (nunca «3 desactivados» falsos). Sem dados pessoais na resposta.

## Frontend
- `src/pages/CorporativoCupons.jsx` (novo, CRLF): valores vindos do servidor (fonte única), toggle por valor, «Guardar» → `PUT /cupons`; estados
  sem-cota / erro / carregando / dados. Helpers puros exportados (`cuponsDaResposta`, `pedidoGuardar`).
- `App.jsx` +2 linhas (lazy + `<Route path="/corporativo/cupons">` dentro de `CorporativoRoute`) — **R18-A**.
- `CorporativoDashboard.jsx` +1 linha: card «Meus cupons → Gerir» (padrão `to:` dos outros 4). ℹ️ No mobile (2 colunas) o 5.º card fica sozinho na última linha.

## Testes
`_tests/utac105b-cupons-endpoint.test.mjs` (8, handler real + JWT real + cupom real sobre o duplo): sem cupons → 3 desactivados · activar/desactivar/
idempotente · valor fora → 400 sem gravação parcial · corpo inválido · posse (6 casos) · 401/400/405 · erro → 503 · 10 PUTs paralelos → 1 linha.
`src/__tests__/utac105b-painel.test.mjs` (5, página real por Vite SSR + duplo do AppContext) + `mc991-rotas` (a rota nova está registada).
**Mutação** `scripts/utac105b-prova-mutacao.mjs B`: **9/9 mortos**. **A/B:** as outras páginas/rotas não mudam (diff = +3 linhas aditivas). Veredito: **SEGUIR**.
