# UTAC138 — SEG4: VALIDADOR ADVERSARIAL (HARD GATE 9)

Validador independente (não escreveu o código). Worktree próprio `C:/Users/Moltbot/tmp-utac138-val/wt`, destacado em
`cf60b18` (código `adfeb14` + logs `cf60b18`; baseline `8d216d2`). Missão: tentar REFUTAR. Nada tocado no Supabase,
Netlify, Blobs, produção, deploy ou push; nada escrito na árvore principal. `node_modules` por 3 junções (raiz,
`desafio-gut/frontend`, `netlify/functions`). Medido em 2026-11-18.

## Veredicto: **APROVADO COM RESSALVAS**

O núcleo pedido está lá e aguentou a refutação: o bónus de +100 × N entra só no Passe Relâmpago (PIX e Google Play),
uma vez por `ref`, desfaz-se nas falhas, e o Passe Programado não o recebe. A apuração usa a mesma regra do menor lance
único. O painel mostra-se entre o fim e as 24 h seguintes. O Regulamento v6.1, o gate 3.5 e o GUTO batem byte a byte.
**Mas a entrega tinha 4 defeitos ⚠️ de código que eu corrigi** (o mais grave: a apuração «instantânea» podia gravar
para sempre um vencedor e um Top 10 errados) **e há 6 pontos ⚠️ ESCALAR** que são de produto, jurídicos ou anteriores
a este UTAC. As minhas correcções **não foram re-validadas** por um 2.º validador (precedente da série).

## Reprodução das provas do executor (no worktree, em primeiro plano, uma suíte de cada vez)

| prova | executor | validador (antes das correcções) | validador (depois) |
|---|---|---|---|
| backend `node --test --experimental-test-module-mocks --test-concurrency=2 _tests/*.test.mjs` | 1496 · 1490 pass · 0 fail · 6 skip | **1496 · 1490 · 0 · 6** | **1502 · 1496 · 0 · 6** |
| frontend `node --test --test-concurrency=1` (116 ficheiros) | 1341 (2 falhas DNS) | **1341 / 1341**, 0 falhas (o DNS não falhou nesta corrida) | **1342 / 1342** |
| `scripts/utac138-prova-mutacao.mjs` | 17/17 | **17/17**, md5 restaurado | **17/17** (M12 adaptado, ver ⚠️1) |

## Mutantes próprios do validador (`scripts/utac138-seg4-mutacao.mjs original`, contra o código entregue)

**10/17 mortos — 7 sobreviveram:**

| id | mutante | resultado |
|---|---|---|
| V1 | o Passe PROGRAMADO também recebe o bónus | morto (5) |
| V2 | bónus não multiplica por N | morto (2) |
| V3 | a resposta anuncia 100 em vez de 100 × N | morto (1) |
| V4 | Google: a 1.ª creditação não anuncia o bónus | morto (2) |
| V5 | `validar-compra-google` deixa cair os campos do bónus | morto (2) |
| V6 | `completarPendentes` credita o bónus (retroactivo) | morto (3) |
| V7 | falha do bónus não devolve os R$ | morto (1) |
| V8 | bónus gravado com o motivo antigo `passe-relampago` | morto (2) |
| V9 | lances com valor inválido entram na apuração | morto (1) |
| **V10** | `participantes` = nº de lances (não de endereços) | **VIVO** — ℹ️ métrica pública sem teste com 2 lances do mesmo endereço |
| **V11** | falha do `setJSON` do resultado engolida | **VIVO** — ℹ️ efeito benigno (o endpoint reapura no pedido seguinte) |
| **V12** | o cron deixa de apurar (`tick()` nunca chama a apuração) | **VIVO → corrigido** (teste V-C1) |
| V13 | erro on-chain esconde a apuração pronta | morto (1) |
| **V14** | o hook aceita qualquer objecto como apuração | **VIVO** — limite declarado pelo executor (sem teste do hook `useResultadoEspecial`) |
| **V15** | o polling pára sem esperar pela apuração | **VIVO** — idem |
| **V16** | texto visível do 400 `saldo_pontos_insuficiente` com o número errado | **VIVO → corrigido** (⚠️3) |
| **V17** | `MARGEM_FECHO_MS = 1` (margem de 1 ms) | **VIVO → corrigido** (⚠️1): os testes usavam `M.MARGEM_FECHO_MS` simbólico, logo nenhum valor de margem estava fixado |

Leitura: os testes do bónus (110d/110e/110i1/110n) **não ficaram fracos** na reescrita — os 9 mutantes do bónus morrem.
O ponto fraco era a apuração: margem não fixada e o `tick()` nunca exercitado.

## Achados

### ⚠️1 (GRAVE, corrigido) — a margem de fecho de 3 s deixava de fora um lance pago e aceite; o resultado gravado é definitivo
**Evidência.** Em mainnet, o `lance-relampago.mjs` passa a guarda da janela no início do pedido e só grava o Key-Per-Bid
depois de uma transacção on-chain com espera de confirmação:
```
lance-relampago.mjs:193  const foraDaJanela = verificarJanelaLance(meta);           ← aceita até termino_em inclusive
lance-relampago.mjs:304  await comprometerLanceOnchain(edicaoId, endereco, hashLance);
lance-relampago.mjs:309  registro.key = await addLance(edicaoId, registro);         ← só aqui o getLances o vê
_lib/contract.mjs:299-300  const tx = await contract.comprometerLance(...); const receipt = await tx.wait(1);
```
`tx.wait(1)` na mainnet leva em média ~12 s, e mais quando a rede está carregada. Com `MARGEM_FECHO_MS = 3_000`, um lance
aceite às 19:59:59.999 é gravado por volta das 20:00:12. A apuração das 20:00:03 já o deixou de fora e
`apurarEspecial` grava UMA vez («o resultado não muda depois de gravado»). Resultado: o vencedor e o Top 10 publicados
durante 24 h podem estar **errados para sempre**, e isso contradiz o Art. 7º («apura … o menor lance único»).
Agravante: o cron dormia até `fim + 3 s` no próprio tick para apurar logo. O mutante V17 (margem 1 ms) sobrevivia.
**Correcção (commit `41a38cf`):** `MARGEM_FECHO_MS = 65_000`, que cobre o limite de
execução de uma função síncrona da Netlify (≤ 60 s) mais 5 s de folga para desvio de relógio. O cron **deixou de dormir**,
porque 65 s não cabem nos ~30 s de uma scheduled. Dentro da margem o tick devolve `a_apurar` e o tick seguinte
(1 min depois) apura. O endpoint responde `a_apurar` até lá, e o frontend já relê de 60 em 60 s. Testes novos V-A1/V-A2/V-A3
(V-A3: lance gravado 20 s depois do fim entra no resultado definitivo). O C1 do executor foi reescrito (provava o sono de
3 s), e A4/A5/A6/E1 foram movidos para fora da nova margem. O M12 do executor foi adaptado («o cron apura dentro da
margem»). Mutantes W1 (volta a 3 s), W2 (o cron salta a margem) e W7 (30 s) → RED.
**Custo declarado:** a «apuração instantânea» passa a sair entre ~65 s e ~2 min depois das 20:00. O texto do Art. 7º diz
«no horário de encerramento … apura automaticamente». Fica para o operador decidir se o texto precisa de ajuste (ver E5).
⚠️ **Limite:** o valor de 60 s para o limite da Netlify vem do meu conhecimento da plataforma, não foi medido neste site.
O repositório cita «10 s» (`_logs/UTAC000.17a_SEG2_VALIDADOR.md:268`). Com 10 s ou 26 s, 65 s continua a ser seguro.

### ⚠️2 (GRAVE, corrigido) — o Top 10 público publicava o E-MAIL dos participantes
**Evidência.** O executor escreveu que o nome é «o nome de exibição que o próprio participante escreveu no lance»
(`_lib/apuracao-especial.mjs:18-19`). É falso. O `CardLance.jsx:267` envia `nomeExibicao: userLabel`, e
`AppContext.jsx:586` define `userLabelReal = user?.google?.name || user?.google?.email || user?.email?.address || user?.apple?.email || …`.
Quem entra por e-mail (o fluxo corporativo usa OTP de e-mail), ou tem conta Google sem nome, publica o **e-mail**. O
`GET /resultado-edicao` é público e sem auth, e grava o resultado num Blob definitivo (`edicoes-resultados`), que nem o
`conta-delete` (LGPD, MC104.3) apaga.
**Correcção:** `nomePublico()`: um nome com «@» não é publicado e cai para o endereço encurtado. O resto continua igual
(aparado, ≤ 80). Teste V-B1 (o Blob gravado não contém «@» nem o nome local do e-mail). Mutantes W3/W8 → RED.

### ⚠️3 (corrigido) — texto visível do servidor ainda dizia «o Passe Relâmpago dá +200»
**Evidência.** Varredura de `src/` e `netlify/functions/` por texto visível:
`lance-relampago.mjs:258` → 400 `saldo_pontos_insuficiente`: «Os pontos de lance são gratuitos (…) e o Passe Relâmpago
dá **+200**.» (era o valor do UTAC110n; o UTAC136/137 também o deixou assim). No v6.1 o valor é +100. Mutante V16 vivo.
**Correcção:** a mensagem lê `PONTOS_LANCE_BONUS_PASSE_RELAMPAGO` por import de namespace (5 suítes fazem `mock.module`
do `ledger-lance` só com funções, e um import nomeado partia-as no link — medido). `utac129` A3 passou a assertar
«dá +100.» e a recusar «+200». Mutante W5 → RED. O resto da varredura ficou limpo: só sobram comentários
(`PainelPontosLance.jsx:12`, `ledger-lance.mjs:34/154/163`, `lance-relampago.mjs:249`, `fontes-lance.mjs:57`) e o
código morto `creditarPontosLanceDoPasseRelampago` (+200, sem chamadores).

### ⚠️4 (corrigido) — vencedor on-chain e Top 10 divergentes apareciam lado a lado (dois 🏆)
**Evidência.** O cron consolida on-chain no **1.º tick depois do fim** (comportamento do MC94.3, mantido). Pode portanto
consolidar sem um lance ainda no `tx.wait(1)` (ver E2), enquanto a apuração (agora) espera pela margem. Com
`resultado.consolidado`, o `PainelVencedorEspecial` mostrava o vencedor on-chain E o Top 10 da apuração, cuja linha 1
leva 🏆. Quando divergem, aparecem dois vencedores diferentes no mesmo painel. O teste do executor só cobria o caso
coincidente (on-chain 7 = Top 10 #1 7).
**Correcção:** `top10Coerente`. Com consolidação, o Top 10 só aparece se o seu 1.º lugar tiver o mesmo menor lance único.
Teste novo «on-chain DIVERGENTE» e mutante W6 → RED. A causa de fundo (consolidação cedo demais) fica escalada em E2.

### ⚠️ ESCALAR (não corrigido: produto, jurídico ou anterior ao UTAC)

**E1 — APK v11 instalado × gate 3.5.** O backend aceita só a versão exacta: `_lib/consentimento.mjs:32`
`if (c.versao !== VERSAO_GATE) → 400 versao_invalida`. O APK v11 grava e envia «3.4» (`src/lib/consentimento.js:48-49`:
`!resp?.ok → "falhou"`, sem marcar `enviadoPara`). Depois do deploy do UTAC138, **todo o aceite feito no APK v11 deixa de
ficar registado no servidor** (prova LGPD art. 8º §2º, MC104) até haver o v12. O login reenvia sempre e falha sempre.
Não bloqueia lances nem compras: o consentimento não é verificado noutro lado (grep: só `consentimento.mjs` usa
`VERSAO_GATE`). Esses utilizadores aceitaram o texto v6.0 (sem bónus) e o servidor passa a dar-lhes bónus pelo v6.1.
Decisão do operador: aceitar {3.4, 3.5} registando a versão, ou antecipar o v12.

**E2 — consolidação on-chain no 1.º tick (anterior, MC94.3).** `tick()` chama `consolidarUmaVez` no 1.º minuto depois
do fim, sem margem. Pela mesma razão do ⚠️1, pode publicar on-chain, de forma **irreversível e com gas**, um vencedor
que ignora um lance ainda no `tx.wait(1)`. Proposta: o mesmo `agora > fim + MARGEM_FECHO_MS` antes de `consolidarUmaVez`.
Não alterei, porque a ordem pedia que o cron continuasse a consolidar como antes e mexe em gas mainnet. O teste V-C2
fixa o comportamento actual.

**E3 — Regulamento v6.1, contradições internas (jurídico).** (a) Art. 6º: «Em estrita conformidade com … Google Play
(Gamified Loyalty), o **Passe Programado** não concede pontos de lance». A justificação de conformidade aplica-se igual
ao Relâmpago, que também é vendido por Google Play Billing e passa a conceder 100. A frase admite, por contraste, que o
Relâmpago não está nessa «estrita conformidade», que foi o motivo do UTAC136. (b) Art. 6º: «Os pontos … são
**gratuitos**, obtidos por meio de … **bônus do Passe Relâmpago**» chama gratuito a um ponto que resulta de uma compra
de R$ 2,00. (c) Art. 15: os pontos de lance são consumidos e «não sendo devolvidos em caso de derrota». Com pontos
obtidos por compra, isto é pagar por lance e perder, a estrutura que o UTAC126/127 já marcava como risco. (d) Art. 28
(arrependimento, 7 dias): o código não tem tratamento de compras canceladas ou reembolsadas pela Google (grep de
`voided|refund|rtdn` em `netlify/functions`: nada). Um reembolso deixa os +100 × N (e o ponto e o ECOQUILDO) com o
utilizador. Isto já valia antes para o ponto e o ECOQUILDO, mas o bónus agrava-o.

**E4 — compra a meio fica sem bónus para sempre (decisão «não retroactivo» do executor).** O `completarPendentes` não
credita o bónus (B9, V6). Se a função morrer entre `creditarPontos` e `creditarPontosLance` (timeout ou crash), o retry,
por PIX ou pelo restauro da Google, completa só o ECOQUILDO. Uma compra paga fica assim sem os +100, contra o Art. 7º
(«creditado no momento da compra»). Rara (duas chamadas seguidas). Proposta: creditar o bónus no `completarPendentes`
quando a entrada de fidelidade da `ref` for posterior a um corte (data do deploy do UTAC138). O corte é escolha do
operador.

**E5 — «publica no aplicativo» × APK v11.** O Art. 7º promete o vencedor e o Top 10 «no aplicativo». O painel existe só
na web até ao v12 (R18-138-F). A edição é a 30/11 e os testadores da Play não o vêem. Juntar a isto o atraso de 1-2 min
do ⚠️1 face a «no horário de encerramento».

**E6 — escritas em produção antes do HARD GATE 9 (processo).** O SEG0-2 declara a Frente A **aplicada em produção**
(28 × 400 pontos de lance, ref `recompensa-teste-v1`) e a criação do bucket público `artes-edicoes` com upload. A R18-138-E
autoriza push e deploy **depois do validador**. Não verifiquei a produção (proibido). O SQL é idempotente pela ref e não
interfere com as boas-vindas (`creditarBoasVindas` decide pela ref `boas-vindas`, não pela existência da linha).

### ℹ️ Notas

- ℹ️ **Corrida no bónus (concorrência, mesma chave).** Quando A credita a fidelidade e o bónus de A falha, A desfaz a
  fidelidade e reembolsa (502). Se entretanto um B concorrente viu `st.fid` e completou o ECOQUILDO, esse ECOQUILDO (com
  lastro) fica órfão, e B responde 200. O ramo «lance» não desfaz o ECOQUILDO. Este tipo de corrida já existia no ramo do
  ECOQUILDO, e exige cliques simultâneos com a mesma `idempotencyKey` e uma falha do ledger.
- ℹ️ **Paridade `calcularResultado` × `apurarMenorUnico`** só com lances válidos (o R6 só gera válidos). Medido:
  `apurarMenorUnico([{A, null}, {B, 7}])` → `{menorUnico:null, vencedor:A}`, enquanto `calcularResultado` → B com 7.
  Hoje é inalcançável, porque o lance é validado na escrita. Mas o `data-store-supabase` grava `valor_centavos = null`
  para lance inválido (lição do MC93-A), e no flip para Supabase a consolidação on-chain coroaria um `null`. Anterior,
  em `consolidacao.mjs`.
- ℹ️ **Exposição anterior (R4/LGPD) no `lances-flash`.** O ramo blindado de mainnet (`lances-flash.mjs:236-243`) devolve
  publicamente, **durante a edição**, o `endereco` inteiro e o `nomeExibicao` (o e-mail, pelo ⚠️2) de cada participante.
  Depois da consolidação devolve todos os valores. O encurtamento do `resultado-edicao` é cosmético enquanto isto existir.
  Fora do escopo; recomendo DEBT.
- ℹ️ **Endpoint público:** id validado por `EDICAO_ESPECIAL_RE`, sem valores antes de `fim + margem`, rate limit 30/min
  por IP. No 1.º acesso depois da margem, N pedidos simultâneos fazem cada um um `getLances` completo e um `setJSON` (o
  `setJSON` não envia If-Match; o conteúdo é igual, só muda o `apuradoEm`). Aceitável com o volume actual.
- ℹ️ **SPA fallback (200 com `index.html`):** o hook exige um objecto com `pronto` booleano, e um corpo texto não passa.
  Verificado por leitura. V14/V15 vivos = o hook não tem teste (limite declarado pelo executor).
- ℹ️ **Seed** (`scripts/utac138-seed-edicao-especial.mjs`): 22:00Z–23:00Z = 19:00–20:00 de Brasília (sem horário de
  verão desde 2019), correcto. Mas o `lerAtual()` trata qualquer erro do CLI como «não existe» e grava com `--force`. Uma
  leitura falhada (sem login, rede) sobrescreve uma edição já existente (`status`, `lances`). Correr com `--print` primeiro.
- ℹ️ **CSP** (`netlify.toml`): justificado e mínimo. O `CartaoEdicao.jsx:139` usa `src={arteUrl}` directo (sem
  `img-proxy`) e o Dashboard passa `imagem_url`. O acréscimo é só o host do projecto, não `*.supabase.co`. Escopo OK.
- ℹ️ **Escopo (GATE 3 / R20):** os 53 ficheiros batem com as frentes declaradas. O que foi concebido pelo executor está
  declarado: id `ESPECIAL-RELAMPAGO1`, Blob em vez da tabela `edicoes`, reescrita mínima do Art. 6º («texto a rever pelo
  jurídico») e a regra «não retroactivo». A Frente F (AAB v12) ficou fora por R18-138-F.
- ℹ️ **Textos:** gate (`TermosConsentimento.jsx`) Arts. 6º/7º = v6.1 literal; `GUTO-REGULAMENTO.md` ≡ `guto-regulamento.mjs`
  ≡ v6.1 (G2 byte a byte); prosa «MODELO DE HOJE» coerente; `RegrasOficiais.jsx` importa `REGULAMENTO-v6.1.md`.
  Nenhum «100% gratuitos», «sem pontos de lance» ou «não concede pontos de lance» visível fora do texto literal do
  Art. 6º (que diz «Passe Programado»).

## O que corrigi (commits no worktree, `git -c user.name=Validador`)

- `41a38cf` fix(UTAC138-SEG4): margem de fecho 3 s → 65 s e e-mail fora do Top 10 público (⚠️1, ⚠️2)
- `ea2d34c` fix(UTAC138-SEG4): mensagem do 400 `saldo_pontos_insuficiente` dizia +200 (⚠️3)
- `4fa5cd6` fix(UTAC138-SEG4): painel sem Top 10 contraditório quando o on-chain diverge (⚠️4)
- o commit deste log (mais `scripts/utac138-seg4-mutacao.mjs` e as saídas da mutação)

Ficheiros:
- `netlify/functions/_lib/apuracao-especial.mjs`: margem 65 s e `nomePublico` (⚠️1, ⚠️2)
- `netlify/functions/scheduled-encerrar-especial.mjs`: sem sono, apura no tick fora da margem (⚠️1)
- `netlify/functions/lance-relampago.mjs`: «+100» a partir da constante (⚠️3)
- `src/components/edicao-especial/PainelVencedorEspecial.jsx`: `top10Coerente` (⚠️4)
- testes: `_tests/utac138-seg4-validador.test.mjs` (novo, 6), `_tests/utac138-apuracao-especial.test.mjs` (C1 reescrito,
  tempos fora da margem), `_tests/utac129-lance-sem-passe.test.mjs` (A3), `__tests__/utac138-top10.test.mjs` (+1)
- mutação: `scripts/utac138-seg4-mutacao.mjs` (novo: fase `original` V1-V17, fase `correccoes` W1-W8);
  `scripts/utac138-prova-mutacao.mjs` (M12 adaptado)

**Mutação das correcções: 8/8 mortos** (W1-W8), md5 restaurado em todos.

## Erros do meu instrumento (declarados)
1. Na 1.ª corrida do `utac138-seg4-mutacao.mjs` dois nomes de ficheiro de teste estavam errados
   (`mc943-scheduled-encerrar-especial`, `edicaoEspecial.test.mjs`). Corrigi antes da corrida que conta. Os ficheiros que
   não existiam teriam dado «VIVO» falso (o `node --test` com ficheiro inexistente sai com erro mas `fail=NaN`).
2. A 1.ª versão da asserção do `utac129` A3 saiu com a regex sem a barra invertida (`/+200/`, SyntaxError) por causa
   do escape dentro de um template no heredoc. Detectada pela própria corrida (ficheiro inteiro vermelho) e corrigida.
3. A 1.ª tentativa de importar a constante por nome no `lance-relampago` teria partido 5 suítes que fazem mock do
   `ledger-lance`. Troquei por import de namespace antes de correr a suíte.
4. A afirmação «Netlify síncrona ≤ 60 s» não foi medida neste site (ver ⚠️1, Limite).

## Provas finais (depois das correcções)
- backend: **1502 testes · 1496 pass · 0 fail · 6 skipped** (+6 = o ficheiro novo do validador)
- frontend: **1342 testes · 1342 pass · 0 fail** (+1 = painel divergente)
- mutação: executor **17/17** · validador original **10/17** (7 vivos, 2 corrigidos por teste novo e 1 pela margem fixada,
  ver tabela) · validador correcções **8/8**

## Saídas brutas
- `_logs/UTAC138_SEG4_MUTACAO-ORIGINAL.txt` (V1-V17 contra `cf60b18`)
- `_logs/UTAC138_SEG4_MUTACAO-CORRECCOES.txt` (W1-W8)
- `_logs/UTAC138_SEG4_MUTACAO-EXECUTOR-POS.txt` (os 17 do executor depois das correcções)

## Para o operador (resumo)
1. Integrar `41a38cf`, `ea2d34c` e `4fa5cd6` antes do deploy (R18-138-E).
2. Decidir E1 (aceites 3.4 do APK v11), E2 (margem também na consolidação on-chain) e E4 (bónus de compra a meio).
3. Levar E3 (Arts. 6º/15/28 com o bónus pago) ao jurídico antes do RTD do v6.1.
4. A apuração passa a sair 1-2 min depois das 20:00 (⚠️1). Ver se o Art. 7º («no horário de encerramento») precisa de ajuste.
