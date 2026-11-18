# UTAC138 — SEG0..SEG2: as frentes (executor)

Baseline `8d216d2`. Decisões R18-138-A..F no `_logs/UTAC138_SEG-1_MEDICAO.md`.
**R18-138-F** (operador, 2026-11-17): «vamos para a v12 posteriormente. foque nesse utac agora» ⇒ a **Frente F (AAB v12)**
e o **versionCode 12 / 1.2.0** ficam **fora** deste UTAC (o `build.gradle` não foi tocado).

## Frente A — 400 pontos de lance aos testadores (FEITA, em produção)
- Lista: os 28 endereços de `atividade_utilizadores` (R18-138-C), congelados em `scripts/utac138-recompensa-testadores.sql`.
- SQL idempotente pela ref `recompensa-teste-v1` (INSERT … ON CONFLICT … WHERE NOT EXISTS ref). Entrada com a forma exacta
  do `ledger-lance.mjs` `{data, campo:"pontos_lance", motivo:"recompensa-teste", delta:400, ref}`.
- Ensaio em transacção com ROLLBACK (aplicado 2×): Δ pontos_lance = +11 200 (28 × 400), 28 entradas da ref (a 2.ª corrida
  não creditou), invariante `pontos_lance = Σ delta` quebrada em 0 linhas, 0 saldos reduzidos, Δ fidelidade 0.
- Aplicado em produção: 28 linhas devolvidas (20 linhas novas + 8 existentes). Depois: 28 linhas, 28 entradas da ref,
  invariante 0, Σ pontos_lance 13 280 (2 075 antes + 11 200 + 5 de um login concorrente de `0x163b…b643`).
- `MOTIVOS_PONTOS_LANCE` ganhou `recompensa-teste` (e `bonus-passe-relampago`); rótulos no `pontosLance.js` do frontend.

## Frente B — Edição Especial (PREPARADA; o seed corre depois do deploy)
- Arte `Desktop/EDICAO ESPECIAL.jpeg` (478 740 B, SHA-256 `1a3c474a…9699`) → bucket público NOVO `artes-edicoes`
  (5 MB, só jpeg/png/webp) → `https://vjslwowwrpcawijdiksm.supabase.co/storage/v1/object/public/artes-edicoes/especial-relampago-1.jpg`
  (download público: 200, image/jpeg, SHA-256 idêntico).
- CSP: `img-src` não aceitava o Supabase ⇒ acrescentado `https://vjslwowwrpcawijdiksm.supabase.co` (só o projecto, não `*.supabase.co`).
- `scripts/utac138-seed-edicao-especial.mjs` (padrão MC94.1): id `ESPECIAL-RELAMPAGO1`, `tipo:"relampago"`,
  produto «Fritadeira Elétrica Sem Óleo Quad Fry 4,2 L Elgin», 2026-11-30T22:00Z–23:00Z (19h–20h BRT), status aberto.
  ⚠️ Desvios declarados: tabela `edicoes` não existe (Blob `edicoes-metadata`); o id do enunciado é recusado pelo regex.

## Frente C — +100 pontos de lance no Passe Relâmpago (FEITA)
- `ledger-lance.mjs`: `PONTOS_LANCE_BONUS_PASSE_RELAMPAGO = 100`, `MOTIVO_BONUS_PASSE_RELAMPAGO`.
- `comprar-passe-tipado.mjs`: o código que o UTAC136 tirou (`git show 9936e9e`) volta com 100 × N e motivo próprio. PIX e
  Google Play pela mesma cadeia. Falha do bónus ⇒ desfaz o ponto de fidelidade + reembolsa (502 `creditar_pontos_lance_falhou`).
  Falha do ECOQUILDO ⇒ desfaz também o bónus (`lanceDesfeito`). **Não retroactivo:** `completarPendentes` não credita o bónus
  (um retry/restauro de uma compra feita entre o UTAC136 e o UTAC138 não ganha +100). Resposta 201: `bonusPontosLance`, `pontosLance`.
- `validar-compra-google.mjs`: devolve `bonusPontosLance`/`pontosLance` na 1.ª creditação.
- 14 testes do UTAC136 que afirmavam «sem pontos de lance» foram reescritos para a regra nova (texto antigo citado em comentário).

## Frente G — apuração instantânea (FEITA)
- `_lib/apuracao-especial.mjs`: `calcularResultado` (puro: vencedor = menor único; Top 10 = 10 menores únicos crescentes;
  inválidos não contam; endereço encurtado) + `apurarEspecial` (fronteira `agora > termino_em` + margem de 3 s; grava 1× no
  Blob `edicoes-resultados`; idempotente).
- Caminho 1: o cron `scheduled-encerrar-especial.mjs` (a cada minuto, já existia e já consolida on-chain) apura ANTES de encerrar
  e consolidar; se cair na margem, espera por ela. Import preguiçoso (lição do UTAC136).
- Caminho 2: `GET /resultado-edicao?edicaoId=` (público, rate limit 30) apura no 1.º acesso depois do fim.
- O vencedor on-chain (consolidação) continua autoritativo; teste R6 prova que as duas apurações coincidem em 200 sorteios.

## Frente D — painel de resultados 24 h (FEITA, web; APK só com o v12)
- `ResultadosEdicao.jsx` (Top 10) dentro do `PainelVencedorEspecial`; `useResultadoEspecial` lê `resultado-edicao` ao lado do
  on-chain. Sem consolidação mas com apuração ⇒ vencedor + Top 10 logo. A janela de 24 h é a que já existia (`RETENCAO_APOS_FIM_MS`).
- Textos do Passe: «Bônus de 100 pontos de lance + …» (balão/Carteira), toast, Regras Oficiais (proporções), Meus Ativos.
- ⚠️ Limite: `useResultadoEspecial` não tem teste de hook (importa `utils/web3.js` com alias `@/`); a lógica está no painel (testado).

## Frente E — Regulamento v6.1 + gate 3.5 (FEITA)
- `docs/REGULAMENTO-v6.1.md`: só mudam o título (6.1) e os Arts. 6º e 7º. ⚠️ O Art. 6º do v6.0 dizia «o Passe não concede pontos
  de lance … 100% gratuitos … exclusivamente» — incompatível com o bónus; foi reescrito pelo executor com a alteração MÍNIMA
  («o Passe Programado não concede … gratuitos … e do bônus do Passe Relâmpago previsto no Art. 7º»). **Texto a rever pelo
  operador/jurídico antes do RTD.** O Art. 7º ganhou o bónus e a regra da apuração instantânea (Top 10, 24 h).
- Regras Oficiais importam o v6.1; gate: Arts. 6º/7º literais do v6.1, caixa «termos» com o bónus, `VERSAO_CONSENTIMENTO` e
  `VERSAO_GATE` = **3.5**. GUTO: `GUTO-REGULAMENTO.md` + `guto-regulamento.mjs` = v6.1 byte a byte (versão "6.1"); âncoras dos
  Arts. 6º/7º e a prosa «MODELO DE HOJE» passaram ao v6.1 (conteúdo, não lógica — declarado).
- PDF `Desktop/REGULAMENTO-DesafioGUT-v6.1.pdf` (4 págs, SHA-256 `fcd26c4e…983b`) + `Desktop/QRCODE-Regulamento-v6.1.png`
  (`0d08d6e0…eb24`, descodifica para /regras-oficiais). Verificador: 1135 = 1135 palavras, controlo positivo detectado, sem problemas.

## Provas
- Backend completo: **1496 testes · 1490 pass · 0 fail** (6 skipped, como no baseline 1472/1478).
- Frontend completo: 1341 testes; as 7 falhas da 1.ª corrida eram 5 testes presos ao v6.0/3.4 (corrigidos, 49/49) e 2 do
  `mc9952-seguranca-gate` (DNS real com timeout; repetido: 8/8 verde, sem relação com o UTAC).
- Mutação: **17/17 mortos**, md5 restaurado em todos (`_logs/UTAC138_SEG2_MUTACAO.txt`). O M3 sobreviveu à 1.ª corrida
  (alvo errado do mutante); o C4 do 110e foi reforçado (bónus desfeito + `lanceDesfeito`) e o M3 passou a morrer.
