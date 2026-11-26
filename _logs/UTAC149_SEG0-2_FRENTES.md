# UTAC149 — SEG0..SEG2 FRENTES (2026-11-26, Opus 5.5)

## Frente A — arte + registo
- Arte `Desktop/EDICAO ESPECIAL PALPITE.jpeg` (401 306 B, sha256 `1b7c3984…9476`) → `artes-edicoes/especial-palpite-1.jpg`
  via `supabase storage cp --experimental --linked` (o CLI 2.107 recusa caminhos absolutos com «C:», «Unsupported operation»;
  funcionou com o caminho relativo a partir da raiz ligada). Download público: **200, image/jpeg, 401 306 B, sha256 idêntico**.
  O CSP `img-src` já tem o domínio do projecto (UTAC138).
- `scripts/utac149-seed-especial-palpite.mjs` (padrão UTAC138 + `--reverter`). Gravação **depois** do deploy (as guardas
  têm de estar no ar antes de a edição existir).

## Frente B/C — frontend (sem componente, sub-card nem estilo novo)
- `_estilo-especial.js`: `ehEspecialProgramada()`; `escolherEspecial` (slot ⚡ do Início e do MLC) ignora-a.
- `meus-ativos/_top10-passe.js`: o Top 10 (menor lance único) ignora-a.
- `lib/palpite.js`: `edicoesProgramadasDe` põe a especial ABERTA à frente; `estadoEdicaoProgramada()` = `getEstadoEdicao`
  numa Programada normal (teste de zero diff) e, na especial, o estado da EDIÇÃO (`estadoEspecial` + `SELO_ESPECIAL`), com
  a faixa «Palpites até 09/12 às 23:59» (data fixa: a OP não tem tick de 1 s). Mesma excepção declarada do MC94.2/UTAC141.
- `Dashboard.jsx`: saiu o `.filter(!ehEspecial)` do vidro 🎫 (só excluía especiais programadas, que não existiam);
  `estProgramada` via `estadoEdicaoProgramada`.
- `OfertasProgramadas.jsx`: cartão e `TabelaPalpites` via `estadoEdicaoProgramada` (selo da tabela = o do cartão).

## Backend — a palpite fora do circuito Relâmpago
- `scheduled-encerrar-especial`: programada → só `encerrarEdicao` (trava palpites), sem apuração Top 10 nem consolidação on-chain.
- `scheduled-lider-especial`: ignora-a. `_lib/especial-config.escolherEspecialAtual` (anúncio do GUTO): ignora-a.
- Não tocado: `lance-relampago` (um lance numa edição `programado` segue o caminho legado de qualquer PROG-N; a UI não o oferece).

## Testes
- Fixtures antigos `ESPECIAL-AIRFRYER tipo:"programado"` (resto do MC94.1; em produção é `relampago`) → `relampago` em 4
  ficheiros do frontend + 1 do backend, e 1 asserção literal (`useEdicoes-especial` l. 48).
- Novos: `src/lib/__tests__/utac149-especial-palpite.test.mjs` (11), P1-P3 em `utac142-inicio-especial.test.mjs`,
  2 em `mc943-scheduled-encerrar.test.mjs`, 1 caso no E10 de `utac142-lider-especial`, `_tests/utac149-especial-palpite.test.mjs` (2).
- Direccionados: frontend 322/322, backend 74/74.
- Mutação 3/3 RED, md5 idêntico: guarda do `escolherEspecial` → 3 RED; `estadoEdicaoProgramada` sem ramo especial → 4 RED;
  cron sem guarda → 2 RED.
