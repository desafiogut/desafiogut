# UTAC146 · SEG-1 — MEDIÇÃO

Executor: Claude Code (Opus 5.5) · 2026-11-20 · baseline `6886f48` (= origin/main), produção `6afff4cb`.

## Passo 0 respondido por auditoria (autorizada pelo operador)
- **(a) JWT com name: NÃO.** `assinarLanceAuth` assina `{ endereco, tipo: "lance-auth" }` (HS256, `JWT_SECRET`). O `auth-lance` e o
  `auth-user` autenticam por **assinatura EIP-191 da carteira**, não pelo Google.
- **(b) Acesso para verificar a identidade Google: NÃO existia.** Zero referências a `PRIVY_*` no backend e nenhum identity token no
  frontend. Medido agora: `https://auth.privy.io/api/v1/apps/cmo51f3v300l90clgzksivvad/jwks.json` → **200**, 2 chaves EC P-256 ES256.
  Documentação Privy (lida por subagente web-fetch): `iss = privy.io`, `aud` = app id, ES256, `linked_accounts` = **string** JSON
  (google: `type google_oauth`, `name` pode ser null; carteira: `type wallet`, `address`). A doc não confirma os nomes exactos dos
  campos no token (snake vs camel): o parser aceita os dois.
- **(c) Toast: SIM.** `src/widgets/toast/Toast.jsx` (`useToast`, `ToastContainer`), usado em `App.jsx`.
- O nome entra no lance por `body.nomeExibicao` → `formatarNome` (`lance-relampago.mjs:161`). **Forjável.**

## Decisões do operador (R18-146)
- **R18-146-A** implementar com o identity token do Privy. **O operador liga «Return user data in an identity token» no painel.**
  Sem isso, o resultado é lance sem nome (seguro, nunca forjado).
- **R18-146-B** divergência body × verificado: **ignorar o body** (o lance passa; o nome é o verificado, ou nenhum).
- **R18-146-C** AAB **«v12.1»**. Interpretado como versionCode 12 / versionName 1.2.1, pasta `DesafioGUT-v12.1` (declarado).
