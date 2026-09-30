# MC103 — SEG4 (verificação ad-hoc) + SEG5 (fecho)

## SEG4 — `scripts/mc103-verificacao-adhoc.mjs` (corrido uma vez + controlo positivo)
Produção: deploy **`6abc959b8fd71e00081b56b0`**, `commit_ref 9f3608f`, `ready`, é o `published_deploy` (auto-deploy do push).

| Verificação | Resultado |
|---|---|
| V1 as 5 flags com os defaults do enunciado | OK |
| V2 `/recursos-app` ios/android/pwa: 200 + `application/json`; chaves antigas = antes (A/B em produção) | OK ×6 |
| V3 as 5 flags presentes em produção e no default (nenhuma ligada) | OK ×3 |
| V4 relatórios sem endereços de utilizador nem e-mails | OK ×4 |
| V5 queries registadas só de leitura (bloco presente, 0 palavras de escrita) | OK ×2 |
| **Total** | **16/16 OK** |

**Controlo positivo (`--adulterar`):** defeito injectado em cada uma das 5 verificações → **5/5 detectadas**. Nenhuma sonda cega.
`config_remota.recursos_app`: `atualizado_em 2026-06-21`, só as 2 chaves antigas → **nenhuma flag gravada ou ligada**.
Suíte: 508/508 · 800/806.

⚠️ **Instrumento, registado:** o 1.º acompanhamento do deploy passava `site_id = "silly-stardust-ca71bc"` (nome, não o ID)
e ficou 9 min a responder «ainda não listado». Não era o deploy: era a sonda. Com o ID (`be1cc8bb-…`) o deploy aparecia `ready`.
⚠️ Há um deploy **`6abc745d…` sem `commit_ref`** (02:30Z, antes do MC103, não feito por este executor). Foi substituído
pelo `9f3608f`. Origem por confirmar pelo operador.

## SEG5 — fecho
- **R18 (decisões do operador durante o MC):** nenhuma. As interpretações do executor (D1–D5) ficam registadas para confirmação.
- **Áreas proibidas:** não tocadas (`git diff fd68c8a..HEAD --stat` = recursos-app-config.mjs, o teste, CLAUDE.md, `_logs/MC103_*`,
  este script). Nem `saldoRs.mjs`, nem `mp-client.mjs`, nem `_lib/pedidos.mjs`, nem Frenet/webhook, nem `leilaoLock.js`.
  O `package-lock.json` estava modificado **antes** do MC e **não** foi commitado.
- **Zero escritas** no Supabase e no Blob; zero dados apagados; zero dependências instaladas.
- **O MC111 pode arrancar**, com estas pré-condições:
  1. estender o espelho de `src/hooks/useRecursosApp.js` para o cliente ver as flags novas pelo caminho Supabase;
  2. reconstituir os **R$ 10,25** consumidos sem destino antes de liquidar;
  3. confirmar D5 (flags escalares globais) e, se preciso, o tecto de `limitePassesIndicacao`;
  4. decidir se as 2 flags antigas passam a `Object.hasOwn` (candidato a MC futuro).
